// Sachkundeausweis Pflanzenschutz – gebraucht von Stammdaten (Personen) und Pflanzenschutz (Anwenderprüfung).


/** Ab so vielen Tagen vor Ablauf wird gewarnt (Fortbildung/Verlängerung braucht Vorlauf). */
export const SACHKUNDE_WARNUNG_TAGE = 90;

export function lokalesDatum(d = new Date()) {
  const zwei = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${zwei(d.getMonth() + 1)}-${zwei(d.getDate())}`;
}

export function datumText(iso) {
  if (!iso) return "–";
  const [j, m, t] = iso.split("-");
  return `${t}.${m}.${j}`;
}

/**
 * @returns {{stufe: "fehlt"|"gueltig"|"bald"|"abgelaufen", tage?: number, text: string}}
 * Der Ausweis gilt bis einschließlich gueltig_bis.
 */
export function sachkundeStatus(person, heute = new Date()) {
  const ausweis = person.psm_ausbildungsbescheinigung;
  if (!ausweis?.gueltig_bis) return { stufe: "fehlt", text: "Kein Sachkundeausweis eingetragen" };
  const tage = Math.round((Date.parse(`${ausweis.gueltig_bis}T00:00:00Z`) - Date.parse(`${lokalesDatum(heute)}T00:00:00Z`)) / 86_400_000);
  const bis = datumText(ausweis.gueltig_bis);
  if (tage < 0) return { stufe: "abgelaufen", tage, text: `Sachkundeausweis abgelaufen am ${bis}` };
  if (tage === 0) return { stufe: "bald", tage, text: `Sachkundeausweis läuft heute ab` };
  if (tage <= SACHKUNDE_WARNUNG_TAGE) return { stufe: "bald", tage, text: `Sachkundeausweis läuft in ${tage} ${tage === 1 ? "Tag" : "Tagen"} ab (${bis})` };
  return { stufe: "gueltig", tage, text: `Sachkundeausweis gültig bis ${bis}` };
}

