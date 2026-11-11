// Einstufung von Bodenuntersuchungen (rules/boden/gehaltsklassen.json) – gebraucht von Bodenproben und Düngeplanung.

const KLASSEN = ["A", "B", "C", "D", "E"];

/** Klasse aus Untergrenzen [B, C, D, E]: Wert unter der ersten Grenze → A. */
export function klasseAus(wert, grenzen) {
  if (wert == null || Number.isNaN(wert) || !grenzen) return null;
  let i = 0;
  while (i < grenzen.length && wert >= grenzen[i]) i++;
  return KLASSEN[i];
}

export const schwereAusTon = (ton) => (ton == null ? null : ton < 15 ? "leicht" : ton <= 25 ? "mittel" : "schwer");

/** Gehaltsklassen P, K, Mg einer Bodenprobe. Fehlt die Bodenschwere, wird für K und Mg „mittel“ angenommen (im Ergebnis markiert). */
export function gehaltsklassen(probe, regel) {
  const w = regel.werte;
  const nutzung = probe.nutzung === "gruenland" ? "gruenland" : "acker";
  const schwere = probe.bodenschwere ?? schwereAusTon(probe.ton_prozent);
  const s = schwere ?? "mittel";
  const k = {
    p: klasseAus(probe.p_mg_kg, w.phosphor[nutzung]),
    k: klasseAus(probe.k_mg_kg, nutzung === "gruenland" ? w.kalium.gruenland : w.kalium.acker[s]),
    mg: klasseAus(probe.mg_mg_kg, w.magnesium[s]),
  };
  return { klassen: Object.fromEntries(Object.entries(k).filter(([, v]) => v)), schwere_angenommen: !schwere && (probe.k_mg_kg != null || probe.mg_mg_kg != null) };
}

export function phReaktion(ph, regel) {
  if (ph == null) return null;
  return regel.werte.ph_reaktion.find((s) => ph <= s.bis)?.text ?? null;
}

/** Anzustrebender pH-Wert (Tabelle 8). */
export function phZiel({ nutzung, schwere = "mittel", napvZeile }, regel) {
  const z = regel.werte.ph_ziel;
  if (nutzung === "gruenland") return z.gruenland[schwere];
  return ["hafer", "roggen", "kartoffel", "fruehkartoffel"].includes(napvZeile) ? z.acker_hafer_roggen_kartoffel[schwere] : z.acker_uebrige[schwere];
}

/** P2O5- und K2O-Empfehlung in kg/ha (Tabelle 42 × Faktor Tabelle 43); null, wenn für die Kultur kein Richtwert vorliegt. */
export function pkEmpfehlung(napvZeileId, klassen, regel) {
  const rw = regel.werte.richtwerte_klasse_c[napvZeileId];
  if (!rw) return null;
  const f = regel.werte.korrekturfaktor;
  const fp = klassen?.p ? f[klassen.p] : 1;
  const fk = klassen?.k ? f[klassen.k] : 1;
  return { p2o5: Math.round(rw[0] * fp), k2o: Math.round(rw[1] * fk), ohne_probe: !klassen?.p || !klassen?.k };
}
