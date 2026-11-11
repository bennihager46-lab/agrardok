// ÖPUL-Auswertungen aus den Maßnahmen – ohne Oberfläche, mit Unit-Tests (tests/oepul.test.js).

import { begruenungEnde } from "../core/oepul.js";

const tage = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
const datumText = (iso) => iso.split("-").reverse().join(".");

/** Zwischenfrüchte eines Jahres je Schlag mit Variante, Anlage, Ende und Prüfungen. */
export function zwischenfruechte(massnahmenDesSchlags, jahr, begruenung) {
  const v = begruenung.werte;
  return massnahmenDesSchlags
    .filter((m) => m.art === "aussaat" && m.details?.zwischenfrucht && m.datum.startsWith(String(jahr)))
    .map((m) => {
      const variante = m.details.begruenung_variante ?? null;
      const vari = v.varianten.find((x) => x.nr === variante);
      const ende = variante ? begruenungEnde(m.datum, variante, begruenung) : null;
      const umbruch = massnahmenDesSchlags.filter((x) => x.art === "bodenbearbeitung" && x.datum > m.datum && (x.details?.zweck === "umbruch_zwischenfrucht" || x.details?.verfahren === "pflug"))
        .sort((a, b) => a.datum.localeCompare(b.datum))[0] ?? null;
      const probleme = [];
      if (vari && m.datum.slice(5) > vari.anlage_bis) probleme.push(`Angelegt am ${datumText(m.datum)} – Variante ${variante} spätestens am ${datumText(`2000-${vari.anlage_bis}`).slice(0, 6)}`);
      if (umbruch && ende && umbruch.datum <= ende) probleme.push(`Umbruch am ${datumText(umbruch.datum)} vor dem Ende des Begrünungszeitraums (${datumText(ende)})`);
      if (vari?.mischungspartner_min && m.details.mischungspartner != null && m.details.mischungspartner < vari.mischungspartner_min) probleme.push(`Nur ${m.details.mischungspartner} Mischungspartner – mindestens ${vari.mischungspartner_min}`);
      return { aussaat: m, variante, ende, umbruch, probleme, bedingung: vari?.bedingung ?? null };
    });
}

/**
 * System Immergrün: Lücken ohne Begrünung je Schlag (Ernte → Anlage Zwischenfrucht ≤ 30 Tage, Umbruch → Hauptfrucht ≤ 30,
 * Ernte → nächste Hauptfrucht ≤ 50). Die Ernte- bzw. Umbruchtag zählen nicht als Begrünungstag.
 */
export function immergruenLuecken(massnahmenDesSchlags, begruenung) {
  const g = begruenung.werte.immergruen;
  const ms = [...massnahmenDesSchlags].sort((a, b) => a.datum.localeCompare(b.datum));
  const luecken = [];
  for (const ernte of ms.filter((m) => m.art === "ernte" && m.details?.hauptfrucht !== false)) {
    const danach = ms.filter((m) => m.datum > ernte.datum);
    const zf = danach.find((m) => m.art === "aussaat" && m.details?.zwischenfrucht);
    const hf = danach.find((m) => m.art === "aussaat" && !m.details?.zwischenfrucht);
    if (zf && (!hf || zf.datum < hf.datum)) {
      const t = tage(ernte.datum, zf.datum);
      if (t > g.max_tage_ernte_bis_zwischenfrucht) luecken.push({ von: ernte.datum, bis: zf.datum, tage: t, grenze: g.max_tage_ernte_bis_zwischenfrucht, text: "Ernte → Zwischenfrucht" });
      const umbruch = danach.find((m) => m.art === "bodenbearbeitung" && m.datum > zf.datum && m.details?.zweck === "umbruch_zwischenfrucht");
      if (umbruch && hf && hf.datum > umbruch.datum) {
        const t2 = tage(umbruch.datum, hf.datum);
        if (t2 > g.max_tage_umbruch_bis_hauptfrucht) luecken.push({ von: umbruch.datum, bis: hf.datum, tage: t2, grenze: g.max_tage_umbruch_bis_hauptfrucht, text: "Umbruch → Hauptfrucht" });
      }
    } else if (hf) {
      const t = tage(ernte.datum, hf.datum);
      if (t > g.max_tage_ernte_bis_hauptfrucht) luecken.push({ von: ernte.datum, bis: hf.datum, tage: t, grenze: g.max_tage_ernte_bis_hauptfrucht, text: "Ernte → nächste Hauptfrucht" });
    }
  }
  return luecken;
}

/** Wirtschaftsdünger-Ausbringungen ohne bodennahe Technik (für „Bodennahe Ausbringung flüssiger Wirtschaftsdünger“). */
export const BODENNAH = ["schleppschlauch", "schleppschuh", "injektor"];
export function bodennaheAusbringung(massnahmen, jahr) {
  const fluessig = massnahmen.filter((m) => m.art === "duengung" && m.datum.startsWith(String(jahr)) && m.details?.duenger_art !== "mineralduenger" && m.details?.aufwand?.einheit === "m3_je_ha");
  return {
    gesamt: fluessig,
    bodennah: fluessig.filter((m) => BODENNAH.includes(m.details?.ausbringtechnik)),
    ohneTechnik: fluessig.filter((m) => !m.details?.ausbringtechnik),
    breit: fluessig.filter((m) => m.details?.ausbringtechnik && !BODENNAH.includes(m.details.ausbringtechnik)),
  };
}
