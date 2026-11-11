// ÖPUL-Begrünung (rules/oepul/begruenung.json): wann eine Zwischenfrucht-Begrünung läuft. Gebraucht von Düngung,
// Pflanzenschutz, Schlagkartei und ÖPUL – deshalb in core (Modulvertrag Regel 2).

const md = (iso) => iso.slice(5, 10);

/** Ende des Begrünungszeitraums einer ÖPUL-Variante (JJJJ-MM-TT) ab dem Anlagedatum. */
export function begruenungEnde(anlage, variante, begruenung) {
  const v = begruenung.werte.varianten.find((x) => x.nr === variante);
  if (!v) return null;
  if (v.ende.datum) {
    const jahr = Number(anlage.slice(0, 4)) + (v.ende.datum < md(anlage) ? 1 : 0);
    return `${jahr}-${v.ende.datum}`;
  }
  const nachTagen = new Date(Date.parse(`${anlage}T00:00:00Z`) + v.ende.tage_nach_anlage * 86_400_000).toISOString().slice(0, 10);
  const nichtVor = `${anlage.slice(0, 4)}-${v.ende.nicht_vor}`;
  return nachTagen > nichtVor ? nachTagen : nichtVor;
}

/** Läuft am Datum eine ÖPUL-Begrünung auf dem Schlag? → {variante, anlage, ende} oder null */
export function begruenungAktiv(massnahmenDesSchlags, datum, begruenung) {
  for (const m of massnahmenDesSchlags) {
    if (m.art !== "aussaat" || !m.details?.zwischenfrucht || !m.details?.begruenung_variante) continue;
    const ende = begruenungEnde(m.datum, m.details.begruenung_variante, begruenung);
    if (ende && m.datum <= datum && datum <= ende) return { variante: m.details.begruenung_variante, anlage: m.datum, ende };
  }
  return null;
}

