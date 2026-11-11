// Welcher Betrieb gerade bearbeitet wird – brauchen alle Module, deshalb in core (Modulvertrag Regel 2).

import * as daten from "./daten.js";

/** Der Betrieb, mit dem die App arbeitet: gemerkter aktiver Betrieb, sonst der älteste. */
export async function aktiverBetrieb() {
  const betriebe = await daten.liste("betrieb");
  if (!betriebe.length) return null;
  const gemerkt = await daten.metaLesen("aktiver_betrieb");
  // erstellt_am kann bei schnell hintereinander angelegten Datensätzen gleich sein → HLC (streng steigend) und id entscheiden
  const aelter = (a, b) =>
    a.erstellt_am.localeCompare(b.erstellt_am) || (a.hlc ?? "").localeCompare(b.hlc ?? "") || a.id.localeCompare(b.id);
  return betriebe.find((b) => b.id === gemerkt) ?? betriebe.sort(aelter)[0];
}

export const merkeAktivenBetrieb = (id) => daten.metaSchreiben("aktiver_betrieb", id);
