// Status einer PSM-Zulassung (Zulassungsende, Aufbrauchfrist) – gebraucht von Betriebsmitteln, Pflanzenschutz und Fristenkalender.

const datumText = (iso) => (iso ? iso.split("-").reverse().join(".") : "–");
function lokalesDatum(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
const tageBis = (iso, heute) => Math.round((Date.parse(`${iso}T00:00:00Z`) - Date.parse(`${lokalesDatum(heute)}T00:00:00Z`)) / 86_400_000);
const inTagen = (t) => (t === 0 ? "heute" : `in ${t} ${t === 1 ? "Tag" : "Tagen"}`);

export const ZULASSUNG_WARNUNG_TAGE = 90;

/**
 * Darf das Pflanzenschutzmittel (laut eingetragenen Fristen) noch verwendet werden?
 * Fristen gelten bis einschließlich des eingetragenen Tages.
 * @returns {{stufe: "unbekannt"|"gueltig"|"bald"|"aufbrauchen"|"abgelaufen", tage?: number, text: string}}
 */
export function psmStatus(bm, heute = new Date()) {
  const p = bm.psm ?? {};
  if (p.aufbrauch_bis && tageBis(p.aufbrauch_bis, heute) < 0) {
    return { stufe: "abgelaufen", tage: tageBis(p.aufbrauch_bis, heute), text: `Aufbrauchfrist am ${datumText(p.aufbrauch_bis)} abgelaufen – darf nicht mehr verwendet werden` };
  }
  if (!p.zulassung_gueltig_bis) {
    return p.aufbrauch_bis
      ? { stufe: "aufbrauchen", tage: tageBis(p.aufbrauch_bis, heute), text: `Aufbrauchen bis ${datumText(p.aufbrauch_bis)} (${inTagen(tageBis(p.aufbrauch_bis, heute))})` }
      : { stufe: "unbekannt", text: "Zulassungsende nicht eingetragen" };
  }
  const tage = tageBis(p.zulassung_gueltig_bis, heute);
  const bis = datumText(p.zulassung_gueltig_bis);
  if (tage < 0) {
    if (p.aufbrauch_bis) {
      const t = tageBis(p.aufbrauch_bis, heute);
      return { stufe: "aufbrauchen", tage: t, text: `Zulassung beendet – aufbrauchen bis ${datumText(p.aufbrauch_bis)} (${inTagen(t)})` };
    }
    return { stufe: "abgelaufen", tage, text: `Zulassung am ${bis} abgelaufen – ohne Aufbrauchfrist nicht mehr verwenden (im Register prüfen)` };
  }
  if (tage <= ZULASSUNG_WARNUNG_TAGE) return { stufe: "bald", tage, text: `Zulassung endet ${inTagen(tage)} (${bis})` };
  return { stufe: "gueltig", tage, text: `Zugelassen bis ${bis}` };
}

