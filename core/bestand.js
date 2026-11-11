// Gemeinsamer Lesezugriff auf Flächen und Kulturen für alle Aufzeichnungsmodule (Modulvertrag Regel 2:
// Module importieren nur aus core). Schreiben bleibt Sache der Module „flaechen“ bzw. „stammdaten“.

import * as daten from "./daten.js";
import * as regeln from "./regeln.js";

export const aktuellesJahr = () => new Date().getFullYear();

/** Lokales Datum JJJJ-MM-TT (nicht UTC – sonst ist es nach 22 Uhr schon „morgen“). */
export function heute(d = new Date()) {
  const zwei = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${zwei(d.getMonth() + 1)}-${zwei(d.getDate())}`;
}
export const datumText = (iso) => (iso ? iso.slice(0, 10).split("-").reverse().join(".") : "–");
export const haText = (z) => `${Number(z ?? 0).toLocaleString("de-AT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ha`;
export const zahlText = (z, stellen = 1) => (z == null || Number.isNaN(z) ? "–" : Number(z).toLocaleString("de-AT", { maximumFractionDigits: stellen }));
/** Tage von a nach b (JJJJ-MM-TT), b − a. */
export const tageZwischen = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
export const plusTage = (iso, n) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

/** Mitgelieferte Kulturen (rules/kulturen.json) und betriebseigene aus der Datenbank, nach Name sortiert. */
export async function kulturen(betriebId) {
  const [katalog, eigene] = await Promise.all([regeln.lade("kulturen"), daten.liste("kultur")]);
  const alle = new Map(katalog.werte.map((k) => [k.id, k]));
  for (const k of eigene) if (!k.betrieb_id || k.betrieb_id === betriebId) alle.set(k.id, k);
  return [...alle.values()].sort((a, b) => a.name.localeCompare(b.name, "de"));
}

/**
 * Schläge eines Jahres samt Kultur und Feldstück – Grundlage jeder Flächenaufzeichnung.
 * @returns {Promise<Array<{schlag, kultur, feldstueck, bezeichnung: string}>>} sortiert nach Feldstück- und Schlagnummer
 */
export async function schlaegeImJahr(betriebId, jahr) {
  const [schlaege, feldstuecke, kult] = await Promise.all([
    daten.liste("schlag", { index: "betrieb_id", wert: betriebId }),
    daten.liste("feldstueck", { index: "betrieb_id", wert: betriebId }),
    kulturen(betriebId),
  ]);
  const fsVon = new Map(feldstuecke.map((f) => [f.id, f]));
  const kVon = new Map(kult.map((k) => [k.id, k]));
  return schlaege.filter((s) => s.jahr === jahr).map((schlag) => {
    const feldstueck = fsVon.get(schlag.feldstueck_id) ?? null;
    const kultur = kVon.get(schlag.kultur_id) ?? null;
    return { schlag, kultur, feldstueck, bezeichnung: schlagBezeichnung(schlag, feldstueck) };
  }).sort((a, b) => (a.feldstueck?.nummer ?? 9999) - (b.feldstueck?.nummer ?? 9999) || (a.schlag.nummer ?? 0) - (b.schlag.nummer ?? 0));
}

/** „Hausacker 1“ bzw. „Feldstück 3 / Schlag 2“ */
export function schlagBezeichnung(schlag, feldstueck) {
  if (schlag?.name) return schlag.name;
  const fs = feldstueck ? (feldstueck.name || `Feldstück ${feldstueck.nummer}`) : "Feldstück ?";
  return `${fs} / Schlag ${schlag?.nummer ?? "?"}`;
}

/** Alle Maßnahmen des Betriebs, neueste zuerst. */
export async function massnahmen(betriebId, { art, schlagId } = {}) {
  const alle = schlagId
    ? (await daten.liste("massnahme", { index: "schlag_ids", wert: schlagId })).filter((m) => m.betrieb_id === betriebId)
    : await daten.liste("massnahme", { index: "betrieb_id", wert: betriebId });
  return alle.filter((m) => !art || (Array.isArray(art) ? art.includes(m.art) : m.art === art))
    .sort((a, b) => (b.datum + (b.uhrzeit_start ?? "")).localeCompare(a.datum + (a.uhrzeit_start ?? "")) || (b.erstellt_am ?? "").localeCompare(a.erstellt_am ?? ""));
}

/** Letzte Maßnahme dieser Art (für „wie letztes Mal“). */
export async function letzteMassnahme(betriebId, art, filter = () => true) {
  return (await massnahmen(betriebId, { art })).find(filter) ?? null;
}
