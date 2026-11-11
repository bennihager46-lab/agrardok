// Hinweis, ob der Betrieb nach NAPV § 8 (bzw. § 9 Abs. 5 in Anlage-5-Gebieten) aufzeichnungspflichtig ist.
// Schwellen aus rules/napv/aufzeichnungspflicht.json. Ergebnis ist ein HINWEIS, keine Rechtsauskunft.

/**
 * @param {{schlaege: Array<{flaeche_ha:number, kategorie:string, alm:boolean}>, anlage5: boolean|undefined, regel}} p
 * @returns {{pflicht: boolean, ln_ha, gemuese_ha, anteil_gruenland_futter, begruendung: string}}
 */
export function napvPflicht({ schlaege, anlage5, regel }) {
  const r = regel.werte;
  const ln = schlaege.filter((s) => !s.alm);
  const summe = (f) => ln.filter(f).reduce((s, x) => s + x.flaeche_ha, 0);
  const lnHa = summe(() => true);
  const gemueseHa = summe((s) => s.kategorie === "gemuese");
  const gruenFutterHa = summe((s) => s.kategorie === "gruenland" || s.kategorie === "feldfutter");
  const anteil = lnHa > 0 ? gruenFutterHa / lnHa : 0;
  const zahl = (z, d = 1) => z.toLocaleString("de-AT", { maximumFractionDigits: d });
  const basis = { ln_ha: lnHa, gemuese_ha: gemueseHa, anteil_gruenland_futter: anteil };

  if (anlage5) {
    const a = r.anlage5;
    const pflicht = (gemueseHa >= a.pflicht_ab_gemuese_ha || lnHa >= a.pflicht_ab_ln_ha) && anteil < a.nur_wenn_gruenland_ackerfutter_anteil_unter;
    return { ...basis, pflicht, begruendung: pflicht
      ? `Anlage-5-Gebiet: ${zahl(lnHa)} ha LN (ab ${a.pflicht_ab_ln_ha} ha) und ${zahl(anteil * 100, 0)} % Grünland/Ackerfutter (unter ${a.nur_wenn_gruenland_ackerfutter_anteil_unter * 100} %).`
      : `Anlage-5-Gebiet, aber unter den Schwellen (${zahl(lnHa)} ha LN, ${zahl(anteil * 100, 0)} % Grünland/Ackerfutter).` };
  }
  const g = r.allgemein;
  const kleinbetrieb = lnHa <= g.ausnahme_ln_bis_ha && gemueseHa < g.ausnahme_nur_wenn_gemuese_unter_ha;
  const gruenland = anteil > g.ausnahme_gruenland_ackerfutter_anteil_ueber;
  if (kleinbetrieb) return { ...basis, pflicht: false, begruendung: `Ausnahme: höchstens ${g.ausnahme_ln_bis_ha} ha LN (${zahl(lnHa)} ha) und unter ${g.ausnahme_nur_wenn_gemuese_unter_ha} ha Gemüse.` };
  if (gruenland) return { ...basis, pflicht: false, begruendung: `Ausnahme: mehr als ${g.ausnahme_gruenland_ackerfutter_anteil_ueber * 100} % Grünland/Ackerfutter (${zahl(anteil * 100, 0)} %).` };
  const grund = lnHa > g.ausnahme_ln_bis_ha
    ? `${zahl(lnHa)} ha LN (mehr als ${g.ausnahme_ln_bis_ha} ha)`
    : `${zahl(gemueseHa)} ha Gemüse (ab ${g.ausnahme_nur_wenn_gemuese_unter_ha} ha gilt die Ausnahme für kleine Betriebe nicht)`;
  return { ...basis, pflicht: true, begruendung: `${grund} und ${zahl(anteil * 100, 0)} % Grünland/Ackerfutter (nicht mehr als ${g.ausnahme_gruenland_ackerfutter_anteil_ueber * 100} %).` };
}
