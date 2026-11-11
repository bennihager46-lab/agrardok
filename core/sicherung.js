// Vollsicherung: Export nach schema/export.schema.json und Import mit Vorschau.
//
// Import-Regel je Datensatz (nach id):
//   nicht vorhanden            → neu, wird übernommen
//   Datei hat höhere rev       → aktualisiert, wird übernommen
//   Datei hat niedrigere rev   → lokal neuer, bleibt wie es ist
//   gleiche rev, gleicher Inhalt → unverändert
//   gleiche rev, anderer Inhalt  → Konflikt: lokaler Stand bleibt, Konflikt wird gemeldet
//                                  (feldweises Zusammenführen folgt mit dem Sync, V1-01)
// Nichts wird gelöscht. Änderungsprotokoll-Einträge werden ergänzt, wenn ihre id unbekannt ist.

import * as daten from "./daten.js";
import { anfrage, transaktion } from "./db.js";
import * as validierung from "./validierung.js";

export const SAMMLUNG = {
  betrieb: "betriebe", person: "personen", feldstueck: "feldstuecke", schlag: "schlaege",
  kultur: "kulturen", tier: "tiere", betriebsmittel: "betriebsmittel", maschine: "maschinen",
  massnahme: "massnahmen", duengeplan: "duengeplaene", bodenprobe: "bodenproben", feldnotiz: "feldnotizen", anhang: "anhaenge",
};
const ENTITAET_VON = Object.fromEntries(Object.entries(SAMMLUNG).map(([e, s]) => [s, e]));
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// ---------- Export ----------

export async function erstelleExport() {
  const inhalt = {};
  let aenderungen = [];
  await transaktion(daten.verbindung(), [...daten.ENTITAETEN, "aenderungen"], "readonly", async (tx) => {
    for (const e of daten.ENTITAETEN) inhalt[SAMMLUNG[e]] = await anfrage(tx.objectStore(e).getAll());
    aenderungen = await anfrage(tx.objectStore("aenderungen").index("hlc").getAll());
  });
  const exp = {
    format: "agrardok-export",
    schema_version: daten.SCHEMA_VERSION,
    erstellt_am: new Date().toISOString(),
    geraet_id: daten.info().geraetId,
  };
  const betriebe = inhalt.betriebe.filter((b) => !b.geloescht);
  if (betriebe.length === 1) exp.betrieb_id = betriebe[0].id;
  exp.daten = inhalt;
  if (aenderungen.length) exp.aenderungen = aenderungen;
  return exp;
}

export function dateiname(d = new Date()) {
  const zwei = (n) => String(n).padStart(2, "0");
  return `agrardok-sicherung-${d.getFullYear()}-${zwei(d.getMonth() + 1)}-${zwei(d.getDate())}-${zwei(d.getHours())}${zwei(d.getMinutes())}.json`;
}

export function alsDatei(exp) {
  return new File([JSON.stringify(exp, null, 2)], dateiname(), { type: "application/json" });
}

export function kannTeilen(datei) {
  try {
    return !!navigator.canShare?.({ files: [datei] });
  } catch {
    return false;
  }
}

export function herunterladen(datei) {
  const url = URL.createObjectURL(datei);
  const a = Object.assign(document.createElement("a"), { href: url, download: datei.name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export async function teilen(datei) {
  await navigator.share({ files: [datei], title: "Sicherung von AGRARDOK+" });
}

export const merkeSicherung = () => daten.metaSchreiben("letzte_sicherung", new Date().toISOString());
export const letzteSicherung = () => daten.metaLesen("letzte_sicherung");

// ---------- Import ----------

/** Liest Text, prüft Format und vergleicht mit dem lokalen Bestand. Schreibt nichts. */
export async function pruefeImport(text) {
  let obj;
  try {
    obj = JSON.parse(text);
  } catch {
    return { fehler: ["Die Datei ist keine gültige JSON-Datei."], obj: null };
  }
  const fehler = pruefeFormat(obj);
  if (fehler.length) return { fehler, obj: null };
  return { fehler: [], obj, vorschau: await vergleiche(obj) };
}

// „agraropen-export“: Sicherungen aus der Zeit vor der Umbenennung in AGRARDOK+
const FORMATE = ["agrardok-export", "agraropen-export"];

function pruefeFormat(obj) {
  const fehler = [];
  if (!obj || typeof obj !== "object" || !FORMATE.includes(obj.format)) {
    return ["Das ist keine Sicherungsdatei von AGRARDOK+."];
  }
  const [dateiHaupt, dateiNeben] = String(obj.schema_version ?? "").split(".").map(Number);
  const [appHaupt, appNeben] = daten.SCHEMA_VERSION.split(".").map(Number);
  if (Number.isNaN(dateiHaupt) || Number.isNaN(dateiNeben)) fehler.push("Die Datei hat keine gültige Schema-Version.");
  else if (dateiHaupt !== appHaupt || dateiNeben > appNeben) {
    fehler.push(`Die Datei stammt aus einer neueren App-Version (${obj.schema_version}). Bitte zuerst die App aktualisieren.`);
  }
  if (!obj.daten && !obj.aenderungen) fehler.push("Die Datei enthält keine Daten.");
  for (const [sammlung, liste] of Object.entries(obj.daten ?? {})) {
    if (!ENTITAET_VON[sammlung]) {
      fehler.push(`Unbekannter Bereich „${sammlung}“.`);
      continue;
    }
    if (!Array.isArray(liste)) {
      fehler.push(`„${sammlung}“ ist keine Liste.`);
      continue;
    }
    liste.forEach((d, i) => {
      if (!d || !UUID.test(d.id ?? "")) fehler.push(`${sammlung} Nr. ${i + 1}: ungültige oder fehlende id.`);
      else if (!Number.isInteger(d.rev) || d.rev < 1) fehler.push(`${sammlung} Nr. ${i + 1}: ungültige rev.`);
    });
  }
  if (obj.aenderungen && !Array.isArray(obj.aenderungen)) fehler.push("„aenderungen“ ist keine Liste.");
  if (fehler.length) return fehler.slice(0, 20);

  // Inhalt gegen die Schemas prüfen – nur vollständig gültige Dateien werden übernommen
  for (const [sammlung, liste] of Object.entries(obj.daten ?? {})) {
    liste.forEach((d, i) => {
      for (const f of validierung.pruefe(ENTITAET_VON[sammlung], d)) {
        const bezeichnung = d.name ?? d.art ?? d.id;
        fehler.push(`${sammlung} Nr. ${i + 1} (${bezeichnung}), Feld „${f.pfad || "–"}“: ${f.meldung}`);
      }
    });
  }
  (obj.aenderungen ?? []).forEach((a, i) => {
    for (const f of validierung.pruefe("aenderung", a)) fehler.push(`Änderungsprotokoll Nr. ${i + 1}, Feld „${f.pfad || "–"}“: ${f.meldung}`);
  });
  if (fehler.length > 20) return [...fehler.slice(0, 20), `… und ${fehler.length - 20} weitere Fehler.`];
  return fehler;
}

function stabil(wert) {
  if (Array.isArray(wert)) return `[${wert.map(stabil).join(",")}]`;
  if (wert && typeof wert === "object") {
    return `{${Object.keys(wert).sort().map((k) => `${JSON.stringify(k)}:${stabil(wert[k])}`).join(",")}}`;
  }
  return JSON.stringify(wert);
}

function bewerte(eingehend, lokal, entitaet) {
  if (!lokal) return "neu";
  // Mitgelieferte Katalogkulturen (ohne betrieb_id) verwaltet die App selbst – nie als Konflikt melden
  if (entitaet === "kultur" && !eingehend.betrieb_id && !lokal.betrieb_id) return "unveraendert";
  if (eingehend.rev > lokal.rev) return "aktualisiert";
  if (eingehend.rev < lokal.rev) return "lokal_neuer";
  return stabil(eingehend) === stabil(lokal) ? "unveraendert" : "konflikt";
}

const leereZaehlung = () => ({ neu: 0, aktualisiert: 0, unveraendert: 0, lokal_neuer: 0, konflikt: 0 });

async function vergleiche(obj, tx = null) {
  const ergebnis = { sammlungen: {}, aenderungen_neu: 0, konflikte: [] };
  const lauf = async (t) => {
    for (const [sammlung, liste] of Object.entries(obj.daten ?? {})) {
      const store = t.objectStore(ENTITAET_VON[sammlung]);
      const z = (ergebnis.sammlungen[sammlung] = leereZaehlung());
      for (const d of liste) {
        const urteil = bewerte(d, await anfrage(store.get(d.id)), ENTITAET_VON[sammlung]);
        z[urteil] += 1;
        if (urteil === "konflikt") ergebnis.konflikte.push({ sammlung, id: d.id, name: d.name ?? d.art ?? "" });
      }
    }
    const protokoll = t.objectStore("aenderungen");
    for (const a of obj.aenderungen ?? []) {
      if (!(await anfrage(protokoll.getKey(a.id)))) ergebnis.aenderungen_neu += 1;
    }
  };
  if (tx) await lauf(tx);
  else await transaktion(daten.verbindung(), [...daten.ENTITAETEN, "aenderungen"], "readonly", lauf);
  return ergebnis;
}

/** Übernimmt eine mit pruefeImport geprüfte Datei. Gibt die tatsächliche Zählung zurück. */
export async function importiere(obj) {
  let ergebnis;
  let hoechsteHlc = null;
  await transaktion(daten.verbindung(), [...daten.ENTITAETEN, "aenderungen"], "readwrite", async (tx) => {
    ergebnis = await vergleiche(obj, tx); // im selben Schreibvorgang neu bewerten
    for (const [sammlung, liste] of Object.entries(obj.daten ?? {})) {
      const store = tx.objectStore(ENTITAET_VON[sammlung]);
      for (const d of liste) {
        const urteil = bewerte(d, await anfrage(store.get(d.id)), ENTITAET_VON[sammlung]);
        if (urteil === "neu" || urteil === "aktualisiert") await anfrage(store.put(d));
        if (d.hlc && (!hoechsteHlc || d.hlc > hoechsteHlc)) hoechsteHlc = d.hlc;
      }
    }
    const protokoll = tx.objectStore("aenderungen");
    for (const a of obj.aenderungen ?? []) {
      if (!(await anfrage(protokoll.getKey(a.id)))) await anfrage(protokoll.put(a));
      if (a.hlc && (!hoechsteHlc || a.hlc > hoechsteHlc)) hoechsteHlc = a.hlc;
    }
  });
  // Eigene Uhr hinter den fremden Stand stellen, damit neue Änderungen danach einsortiert werden
  if (hoechsteHlc) {
    const hlc = daten.uhrInstanz().empfangen(hoechsteHlc);
    await daten.metaSchreiben("letzte_hlc", hlc);
  }
  return ergebnis;
}

export function summe(vorschau) {
  const s = leereZaehlung();
  for (const z of Object.values(vorschau.sammlungen)) for (const k in s) s[k] += z[k];
  return s;
}
