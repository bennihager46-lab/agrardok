// Kurzbeschreibung einer Maßnahme für Listen und Zeitachsen (alle Module).

import { zahlText } from "./bestand.js";

export const ARTEN = {
  bodenbearbeitung: "Bodenbearbeitung", aussaat: "Aussaat", duengung: "Düngung", pflanzenschutz: "Pflanzenschutz",
  pflege: "Pflege", ernte: "Ernte", bewaesserung: "Bewässerung", weide: "Weide", feldmiete: "Feldmiete",
  tierbehandlung: "Tierbehandlung", tierbewegung: "Tierbewegung", biozid: "Biozid", sonstiges: "Sonstiges",
};

const EINHEIT = { kg_je_ha: "kg/ha", dt_je_ha: "dt/ha", t_je_ha: "t/ha", l_je_ha: "l/ha", m3_je_ha: "m³/ha", stk_je_ha: "Stk./ha", kg_je_m2: "kg/m²", l_je_m2: "l/m²", l_je_m3: "l/m³", kg_je_t_saatgut: "kg/t", l_je_t_saatgut: "l/t" };
export const aufwandText = (a) => (a ? `${zahlText(a.wert, 2)} ${EINHEIT[a.einheit] ?? a.einheit}` : "");
const VERFAHREN = {
  pflug: "Pflug", grubber: "Grubber", scheibenegge: "Scheibenegge", kreiselegge: "Kreiselegge", fraese: "Fräse", walze: "Walze", mulchen: "Mulchen",
  striegeln: "Striegeln", hacken: "Hacken", walzen: "Walzen", haeckseln: "Häckseln", maehen: "Mähen", nachsaat: "Nachsaat", abschleppen: "Abschleppen", sonstiges: "Sonstiges",
};

/** Zuständige Seite zum Bearbeiten. */
export function bearbeitenHref(m) {
  if (m.art === "duengung") return `#/duengung-erfassen?id=${m.id}`;
  if (m.art === "pflanzenschutz") return `#/pflanzenschutz-erfassen?id=${m.id}`;
  if (["bodenbearbeitung", "aussaat", "pflege", "ernte", "bewaesserung"].includes(m.art)) return `#/massnahme-erfassen?id=${m.id}`;
  return null;
}

export function massnahmeText(m) {
  const d = m.details ?? {};
  switch (m.art) {
    case "duengung": return [d.duenger_name, aufwandText(d.aufwand), d.naehrstoffe_kg_je_ha?.n_jahreswirksam != null ? `${zahlText(d.naehrstoffe_kg_je_ha.n_jahreswirksam)} kg N jahreswirksam/ha` : null].filter(Boolean).join(" · ");
    case "pflanzenschutz": return [(d.mittel ?? []).map((x) => `${x.name} ${aufwandText(x.aufwand)}`).join(" + "), d.grund].filter(Boolean).join(" · ");
    case "aussaat": return [d.kultur_name, d.sorte, d.zwischenfrucht ? `Zwischenfrucht${d.begruenung_variante ? ` (Var. ${d.begruenung_variante})` : ""}` : null, aufwandText(d.saatmenge)].filter(Boolean).join(" · ");
    case "ernte": return [d.kultur_name, d.ertrag ? aufwandText(d.ertrag) : null, d.feuchte_prozent != null ? `${zahlText(d.feuchte_prozent)} % Feuchte` : null].filter(Boolean).join(" · ");
    case "bodenbearbeitung": return [VERFAHREN[d.verfahren] ?? d.verfahren, d.tiefe_cm ? `${d.tiefe_cm} cm` : null].filter(Boolean).join(" · ");
    case "pflege": return [VERFAHREN[d.verfahren] ?? d.verfahren, d.beschreibung].filter(Boolean).join(" · ");
    case "bewaesserung": return [`${zahlText(d.menge_mm)} mm`, d.n_kg_je_ha ? `${zahlText(d.n_kg_je_ha)} kg N/ha` : null].filter(Boolean).join(" · ");
    default: return m.notiz ?? "";
  }
}
