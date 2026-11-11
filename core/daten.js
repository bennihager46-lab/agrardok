// Datenzugriff für alle Module (siehe docs/architektur.md, Abschnitt 3.3).
// Jede Speicherung ergänzt die Basisfelder (id, rev, hlc …) und schreibt in derselben
// Transaktion einen Eintrag ins Änderungsprotokoll (schema/aenderung.schema.json).
//
// Vor dem Schreiben wird jeder Datensatz gegen /schema geprüft (core/validierung.js);
// ungültige Daten werden mit einem ValidierungsFehler abgelehnt.

import { oeffne, anfrage, transaktion, loescheDatenbank } from "./db.js";
import { MIGRATIONEN, ENTITAETEN } from "./migrationen.js";
import { uuid, Uhr } from "./ids.js";
import * as validierung from "./validierung.js";

export { ValidierungsFehler } from "./validierung.js";

// 0.2: Betrieb mit Bewirtschafter, ÖPUL-Codes aus rules/oepul, Betriebsnummer 7-stellig
// 0.3: Feldstück (Boden, Hang, Gewässer, INVEKOS-Kennung), Schlag (Vorfrucht, Ertragslage), Kultur (Kategorien, amtlicher Name)
// 0.4: Betriebsmittel (PSM-Fristen, Indikationen, Auflagen; Wirtschaftsdünger-Übernahme)
// 0.5: Düngeplan, Bodenprobe, Feldnotiz, Anhang; Maßnahme „pflege“, Bestätigungen, Ernte mit Feuchte/Rohprotein
export const SCHEMA_VERSION = "0.5";
// Interner Name aus der Zeit vor der Umbenennung in AGRARDOK+ – bleibt, damit vorhandene Daten erhalten bleiben.
export const STANDARD_DB = "agraropen";
export { ENTITAETEN };

const META_FELDER = new Set([
  "id", "betrieb_id", "erstellt_am", "erstellt_von", "geaendert_am",
  "geaendert_von", "geraet_id", "hlc", "rev",
]);

let db = null;
let dbName = STANDARD_DB;
let geraetId = null;
let uhr = null;

/** Muss einmal beim Start aufgerufen werden. Optional eigener DB-Name (Tests, Demo). */
export async function init({ name = STANDARD_DB, migrationen = MIGRATIONEN } = {}) {
  if (db) db.close();
  dbName = name;
  await validierung.laden();
  db = await oeffne(name, migrationen);
  geraetId = (await metaLesen("geraet_id")) ?? null;
  if (!geraetId) {
    geraetId = uuid();
    await metaSchreiben("geraet_id", geraetId);
  }
  uhr = new Uhr(geraetId, await metaLesen("letzte_hlc"));
  return { geraetId, version: db.version };
}

export function schliessen() {
  db?.close();
  db = null;
}

export async function datenbankLoeschen() {
  schliessen();
  await loescheDatenbank(dbName);
}

export const info = () => ({ dbName, geraetId, dbVersion: db?.version, schemaVersion: SCHEMA_VERSION });
export const verbindung = () => pruefeOffen();
export const uhrInstanz = () => uhr;

function pruefeOffen() {
  if (!db) throw new Error("Datenbank nicht geöffnet – zuerst init() aufrufen");
  return db;
}

function pruefeEntitaet(entitaet) {
  if (!ENTITAETEN.includes(entitaet)) throw new Error(`Unbekannte Entität: ${entitaet}`);
}

// ---------- Meta-Daten (Geräte-ID, letzte Sicherung …) ----------

export async function metaLesen(schluessel) {
  const eintrag = await transaktion(pruefeOffen(), "meta", "readonly", (tx) =>
    anfrage(tx.objectStore("meta").get(schluessel)),
  );
  return eintrag?.wert;
}

export function metaSchreiben(schluessel, wert) {
  return transaktion(pruefeOffen(), "meta", "readwrite", (tx) =>
    anfrage(tx.objectStore("meta").put({ schluessel, wert })),
  );
}

// ---------- Lesen ----------

/**
 * @param {string} entitaet
 * @param {{index?: string, wert?: any, mitGeloeschten?: boolean}} filter
 */
export async function liste(entitaet, { index, wert, mitGeloeschten = false } = {}) {
  pruefeEntitaet(entitaet);
  const alle = await transaktion(pruefeOffen(), entitaet, "readonly", (tx) => {
    const store = tx.objectStore(entitaet);
    return anfrage(index ? store.index(index).getAll(wert) : store.getAll());
  });
  return mitGeloeschten ? alle : alle.filter((d) => !d.geloescht);
}

export function hole(entitaet, id) {
  pruefeEntitaet(entitaet);
  return transaktion(pruefeOffen(), entitaet, "readonly", (tx) => anfrage(tx.objectStore(entitaet).get(id)));
}

export async function zaehle() {
  const ergebnis = {};
  await transaktion(pruefeOffen(), [...ENTITAETEN, "aenderungen"], "readonly", async (tx) => {
    for (const name of [...ENTITAETEN, "aenderungen"]) {
      ergebnis[name] = await anfrage(tx.objectStore(name).count());
    }
  });
  return ergebnis;
}

// ---------- Schreiben ----------

/**
 * Legt einen Datensatz an oder ändert ihn. Gibt den gespeicherten Datensatz zurück.
 * @param {string} entitaet
 * @param {object} eingabe  fachliche Felder; bei Änderung inkl. id
 * @param {{personId?: string}} optionen
 */
export async function speichern(entitaet, eingabe, { personId } = {}) {
  pruefeEntitaet(entitaet);
  const jetzt = new Date().toISOString();
  const hlc = uhr.tick();
  const datensatz = await transaktion(pruefeOffen(), [entitaet, "aenderungen", "meta"], "readwrite", async (tx) => {
    const store = tx.objectStore(entitaet);
    const alt = eingabe.id ? await anfrage(store.get(eingabe.id)) : undefined;

    const neu = {
      ...eingabe,
      id: eingabe.id ?? uuid(),
      erstellt_am: alt?.erstellt_am ?? jetzt,
      geaendert_am: jetzt,
      geraet_id: geraetId,
      hlc,
      rev: (alt?.rev ?? 0) + 1,
    };
    if (alt?.erstellt_von) neu.erstellt_von = alt.erstellt_von;
    else if (personId) neu.erstellt_von = personId;
    if (personId) neu.geaendert_von = personId;
    // Ein Betrieb ist sein eigener Bezugspunkt
    if (entitaet === "betrieb") neu.betrieb_id = neu.id;

    const felder = alt ? unterschiede(alt, neu) : fachfelder(neu);
    if (alt && Object.keys(felder).length === 0) return alt; // nichts geändert → kein neuer Eintrag

    const fehler = validierung.pruefe(entitaet, neu);
    if (fehler.length) throw new validierung.ValidierungsFehler(entitaet, fehler);

    await anfrage(store.put(neu));
    await anfrage(
      tx.objectStore("aenderungen").put({
        id: uuid(),
        hlc,
        geraet_id: geraetId,
        ...(personId ? { person_id: personId } : {}),
        ...(neu.betrieb_id ? { betrieb_id: neu.betrieb_id } : {}),
        entitaet,
        datensatz_id: neu.id,
        operation: !alt ? "anlegen" : neu.geloescht && !alt.geloescht ? "loeschen" : "aendern",
        felder,
        schema_version: SCHEMA_VERSION,
      }),
    );
    await anfrage(tx.objectStore("meta").put({ schluessel: "letzte_hlc", wert: hlc }));
    return neu;
  });
  return datensatz;
}

/** Löschen = Löschmarke setzen. Der Datensatz bleibt für Synchronisation und Nachweis erhalten. */
export async function loeschen(entitaet, id, optionen) {
  const alt = await hole(entitaet, id);
  if (!alt) throw new Error(`${entitaet} ${id} nicht gefunden`);
  return speichern(entitaet, { ...alt, geloescht: true }, optionen);
}

function fachfelder(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([k]) => !META_FELDER.has(k) || k === "betrieb_id"));
}

function unterschiede(alt, neu) {
  const felder = {};
  const schluessel = new Set([...Object.keys(alt), ...Object.keys(neu)]);
  for (const k of schluessel) {
    if (META_FELDER.has(k) && k !== "betrieb_id") continue;
    if (JSON.stringify(alt[k]) !== JSON.stringify(neu[k])) felder[k] = k in neu ? neu[k] : null;
  }
  return felder;
}
