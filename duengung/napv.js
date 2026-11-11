// Berechnungen und Prüfungen nach der Nitrat-Aktionsprogramm-Verordnung (NAPV) – ohne Oberfläche, mit Unit-Tests
// (tests/duengung.test.js). Alle Werte kommen aus rules/napv/duengung.json; jede Warnung nennt ihre Rechtsquelle.
// Hinweis, keine Rechtsauskunft.

import { begruenungAktiv, begruenungEnde } from "../core/oepul.js";

export { begruenungAktiv, begruenungEnde };
const r1 = (x) => Math.round(x * 10) / 10;
const md = (iso) => iso.slice(5, 10); // "MM-TT"

/** Liegt das Datum (JJJJ-MM-TT) im Zeitraum von–bis (MM-TT, einschließlich)? Zeiträume über den Jahreswechsel erlaubt. */
export function imZeitraum(datum, von, bis) {
  const t = md(datum);
  return von <= bis ? t >= von && t <= bis : t >= von || t <= bis;
}

const ACKERFUTTER_KATEGORIEN = new Set(["feldfutter", "gruenland"]);
/** „acker“ (ohne Ackerfutter), „gruenland“ (Dauergrünland und Ackerfutter) oder „sonstige“ (Wein, Obst …) – § 2 Abs. 1–3. */
export function nutzungsklasse({ kultur, feldstueck }) {
  if (feldstueck?.nutzungsart === "gruenland" || feldstueck?.nutzungsart === "alm" || ACKERFUTTER_KATEGORIEN.has(kultur?.kategorie)) return "gruenland";
  if (feldstueck?.nutzungsart === "dauerkultur" || kultur?.kategorie === "dauerkultur") return "sonstige";
  return "acker";
}

/** NAPV-Zeile (Anlage 3) zu einer Kultur über den INVEKOS-Code; null, wenn keine eindeutige Zuordnung. */
export function napvZeile(kultur, regel) {
  const code = kultur?.mfa_code;
  if (!code) return null;
  const alle = [...regel.werte.obergrenzen_acker, ...regel.werte.obergrenzen_gruenland];
  return alle.find((z) => z.mfa_codes?.includes(code)) ?? null;
}
export const zeileNachId = (id, regel) => [...regel.werte.obergrenzen_acker, ...regel.werte.obergrenzen_gruenland].find((z) => z.id === id) ?? null;
export const istGruenlandZeile = (id, regel) => regel.werte.obergrenzen_gruenland.some((z) => z.id === id);

/** Menge der Ausbringung je ha in der Einheit, auf die sich die Gehalte beziehen. Fehler als Text. */
export function mengeJeHa(aufwand, duenger) {
  const { wert, einheit } = aufwand ?? {};
  if (!(wert >= 0)) return { fehler: "Aufwandmenge fehlt." };
  const kg = { kg_je_ha: 1, dt_je_ha: 100, t_je_ha: 1000 }[einheit];
  const m3 = { m3_je_ha: 1, l_je_ha: 0.001 }[einheit];
  switch (duenger?.bezug) {
    case "prozent":
      if (kg) return { kg: wert * kg };
      if (einheit === "l_je_ha" && duenger.dichte_kg_je_l) return { kg: wert * duenger.dichte_kg_je_l };
      if (einheit === "m3_je_ha" && duenger.dichte_kg_je_l) return { kg: wert * 1000 * duenger.dichte_kg_je_l };
      return { fehler: "Gehalte in % passen nur zu kg, dt oder t je ha (bei Litern bitte die Dichte beim Dünger eintragen)." };
    case "kg_je_m3":
      if (m3) return { m3: wert * m3 };
      return { fehler: "Gehalte je m³ passen nur zu m³ oder Liter je ha." };
    case "kg_je_t":
      if (kg) return { t: (wert * kg) / 1000 };
      return { fehler: "Gehalte je t passen nur zu kg, dt oder t je ha." };
    default:
      return { fehler: "Beim Dünger fehlt, worauf sich die Gehalte beziehen." };
  }
}

/**
 * Nährstoffe je ha aus Aufwand und Düngergehalten (§ 1 Z 14, Anlage 2).
 * Die Gehalte von Wirtschaftsdünger gelten als „ab Lager“, also nach Abzug der Stall- und Lagerverluste.
 * @returns {{n_gesamt, n_nach_stall_lager, n_leichtloeslich, n_jahreswirksam: number|null, p2o5, k2o, loeslich, typ, fehler?: string, hinweise: string[]}}
 */
export function naehrstoffe(duenger, aufwand, regel) {
  const hinweise = [];
  const m = mengeJeHa(aufwand, duenger);
  if (m.fehler) return { fehler: m.fehler, hinweise };
  const faktor = m.kg != null ? m.kg / 100 : m.m3 ?? m.t; // Gehalt × faktor = kg je ha
  const typ = regel.werte.duengerarten[duenger.napv_typ] ?? null;
  const gehalt = (x) => (x == null ? 0 : x * faktor);
  const n = gehalt(duenger.n_gesamt);
  let jahreswirksam = null;
  if (!typ) hinweise.push("Beim Dünger ist die Düngerart laut NAPV nicht angegeben – jahreswirksamer Stickstoff kann nicht berechnet werden.");
  else if (typ.jahreswirksamkeit == null) hinweise.push(typ.hinweis ?? "Für diese Düngerart nennt die NAPV keinen Faktor der Jahreswirksamkeit.");
  else jahreswirksam = n * (1 - typ.ausbringungsverlust) * typ.jahreswirksamkeit;
  const leicht = duenger.nh4_n != null && typ?.loeslich !== "langsamloeslich" && duenger.napv_typ !== "mineralisch"
    ? gehalt(duenger.nh4_n)
    : typ ? n * typ.nh4_anteil : null;
  return {
    n_gesamt: r1(n), n_nach_stall_lager: r1(n), n_leichtloeslich: leicht == null ? null : r1(leicht),
    n_jahreswirksam: jahreswirksam == null ? null : r1(jahreswirksam),
    p2o5: r1(gehalt(duenger.p2o5)), k2o: r1(gehalt(duenger.k2o)),
    loeslich: typ?.loeslich ?? null, typ: duenger.napv_typ ?? null, fluessig_wd: !!typ?.fluessig_wd, hinweise,
  };
}

/** N aus Bewässerungswasser (Anlage 3 Abschnitt IV): NO3 [mg/l] / 4,43 × Menge [mm] / 100. */
export const bewaesserungN = (nitratMgL, mengeMm) => r1((nitratMgL / 4.43) * (mengeMm / 100));

/** Obergrenze jahreswirksamer N je ha (Anlage 3 Abschnitt I bzw. VI). */
export function obergrenze(zeile, { stufe, anlage5 = false, leguminosenAusnahme = false, gunstlage = false } = {}) {
  if (!zeile) return null;
  if (zeile.ausnahme && leguminosenAusnahme) return anlage5 ? zeile.ausnahme.n_anlage5 : zeile.ausnahme.n;
  const s = zeile.stufen[stufe] ?? (Object.keys(zeile.stufen).length === 1 ? Object.values(zeile.stufen)[0] : null);
  if (!s) return null;
  if (gunstlage && zeile.gunstlage_n && stufe === "hoch") return zeile.gunstlage_n;
  return anlage5 && s.n_anlage5 != null ? s.n_anlage5 : s.n;
}

/**
 * Düngeplan: zulässige jahreswirksame N-Menge = Obergrenze − Vorfruchtwirkung − Bewässerungs-N (ab 10 kg) − Nmin (Gemüse).
 * @returns {{obergrenze, abzug_vorfrucht, abzug_bewaesserung, abzug_nmin, n_bedarf, rechenweg: string[]}}
 */
export function duengeplan({ zeile, stufe, anlage5, leguminosenAusnahme, gunstlage, vorfruchtKg = 0, bewaesserungKg = 0, nminKg = 0 }, regel) {
  const og = obergrenze(zeile, { stufe, anlage5, leguminosenAusnahme, gunstlage });
  if (og == null) return null;
  const abBew = bewaesserungKg >= regel.werte.bewaesserung.abzug_ab_kg_n_ha ? bewaesserungKg : 0;
  const bedarf = Math.max(0, og - (vorfruchtKg || 0) - abBew - (nminKg || 0));
  const rechenweg = [`Obergrenze ${zeile.name}${anlage5 ? " (Anlage-5-Gebiet)" : ""}: ${og} kg N/ha`];
  if (vorfruchtKg) rechenweg.push(`− Vorfruchtwirkung: ${vorfruchtKg} kg N/ha`);
  if (abBew) rechenweg.push(`− Stickstoff aus Bewässerung: ${abBew} kg N/ha`);
  else if (bewaesserungKg) rechenweg.push(`Bewässerungs-N ${bewaesserungKg} kg/ha unter 10 kg – kein Abzug`);
  if (nminKg) rechenweg.push(`− Nmin: ${nminKg} kg N/ha`);
  return { obergrenze: og, abzug_vorfrucht: vorfruchtKg || 0, abzug_bewaesserung: abBew, abzug_nmin: nminKg || 0, n_bedarf: r1(bedarf), rechenweg };
}

/** N-Entzug durch die Ernte (Anlage 3 Abschnitt V) in kg N/ha; null, wenn für die Kultur kein Faktor vorliegt. */
export function entzug({ zeileId, ertragTHa, ertragslage, rohprotein, feuchte }, regel) {
  const e = regel.werte.entzug_kg_n_je_t;
  if (!(ertragTHa > 0)) return null;
  let faktor = null;
  if (zeileId?.startsWith("weizen") || zeileId === "winterbraugerste" || zeileId === "sommerbraugerste") {
    const t = regel.werte.entzug_weizen_braugerste;
    const tabelle = zeileId.startsWith("weizen") ? t.weizen : t.braugerste;
    if (rohprotein == null) return null;
    const rp = Object.keys(tabelle).map(Number).reduce((a, b) => (Math.abs(b - rohprotein) < Math.abs(a - rohprotein) ? b : a));
    const f = t.feuchte.reduce((a, b) => (Math.abs(b - (feuchte ?? 14)) < Math.abs(a - (feuchte ?? 14)) ? b : a));
    faktor = tabelle[rp.toFixed(1)][t.feuchte.indexOf(f)];
  } else if (zeileId === "koernermais") {
    faktor = ertragslage === "hoch_3" && ertragTHa > 15 ? e.koernermais.hoch_3_ueber_15t : e.koernermais[ertragslage ?? "mittel"];
  } else if (zeileId === "winterfuttergerste" || zeileId === "sommerfuttergerste") faktor = e[zeileId];
  else faktor = typeof e[zeileId] === "number" ? e[zeileId] : null;
  return faktor == null ? null : r1(faktor * ertragTHa);
}

// ---------- Prüfungen bei einer Ausbringung ----------

/**
 * @param {object} p
 * @param {string} p.datum
 * @param {object} p.duenger  Betriebsmittel.duenger
 * @param {object} p.n        Ergebnis von naehrstoffe()
 * @param {object} p.ziel     {schlag, kultur, feldstueck, massnahmen (dieses Schlags), plan?}
 * @param {object} p.betrieb
 * @param {object} p.regel    rules/napv/duengung.json
 * @param {object} [p.begruenung] rules/oepul/begruenung.json (nur wenn der Betrieb am Zwischenfruchtanbau teilnimmt)
 * @param {number} [p.bisherJahreswirksam] jahreswirksamer N, der im Jahr auf diesem Schlag schon ausgebracht wurde (kg/ha)
 * @param {boolean} [p.vliesFolie]
 * @returns {Array<{code, stufe: "fehler"|"warnung"|"info", text, quelle, bestaetigen?: boolean}>}
 */
export function pruefeAusbringung({ datum, duenger, n, ziel, betrieb, regel, begruenung, bisherJahreswirksam = 0, vliesFolie = false }) {
  const w = [];
  const Q = regel.werte.quellen;
  const sf = regel.werte.sperrfristen;
  const klasse = nutzungsklasse(ziel);
  const leicht = n.loeslich !== "langsamloeslich"; // unbekannt → streng
  const zeile = ziel.plan?.napv_kultur ? zeileNachId(ziel.plan.napv_kultur, regel) : napvZeile(ziel.kultur, regel);
  const ms = (ziel.massnahmen ?? []).filter((m) => m.datum <= datum && m.datum.slice(0, 4) === datum.slice(0, 4));
  const ernte = ms.filter((m) => m.art === "ernte" && m.details?.hauptfrucht !== false).sort((a, b) => b.datum.localeCompare(a.datum))[0];
  const saatNachErnte = ernte && ms.some((m) => m.art === "aussaat" && m.datum >= ernte.datum);
  const nKg = n.n_nach_stall_lager ?? 0;

  // § 2 Sperrfristen
  const fruehAb = (zeile && sf.fruehe_kulturen_napv.includes(zeile.id)) || vliesFolie;
  const inSperre = (z) => imZeitraum(datum, z.von, z.bis) && !(fruehAb && imZeitraum(datum, sf.fruehe_kulturen_ab, z.bis));
  if (klasse === "acker") {
    if (leicht && inSperre(sf.acker_leichtloeslich)) {
      if (imZeitraum(datum, sf.acker_leichtloeslich.von, sf.acker_leichtloeslich.ausnahme_bis)) {
        w.push({ code: "napv_sperrfrist_ausnahme", stufe: "warnung", bestaetigen: true, quelle: Q.s2,
          text: `Ab 16. Oktober sind leichtlösliche N-Dünger auf Acker verboten. ${sf.acker_leichtloeslich.ausnahme_text}` });
      } else {
        w.push({ code: "napv_sperrfrist", stufe: "fehler", bestaetigen: true, quelle: Q.s2,
          text: `Sperrfrist: Leichtlösliche N-Dünger (z. B. Mineraldünger, Gülle, Jauche) dürfen auf Ackerflächen von 16. Oktober bis 15. Februar nicht ausgebracht werden${fruehAb ? "" : " (Durum, Raps, Gerste, Vlies/Folie: ab 1. Februar)"}.` });
      }
    } else if (!leicht && inSperre(sf.acker_langsamloeslich)) {
      w.push({ code: "napv_sperrfrist", stufe: "fehler", bestaetigen: true, quelle: Q.s2, text: "Sperrfrist: Langsam lösliche N-Dünger (z. B. Stallmist, Kompost) dürfen von 30. November bis 15. Februar nicht ausgebracht werden." });
    } else if (leicht && ernte && md(datum) < sf.acker_leichtloeslich.von) {
      w.push({ code: "napv_nach_ernte", stufe: "warnung", bestaetigen: true, quelle: Q.s2,
        text: `Am ${ernte.datum.split("-").reverse().join(".")} wurde die Hauptfrucht geerntet. Nach der Ernte der letzten Hauptfrucht sind leichtlösliche N-Dünger nur auf einer Folgekultur bzw. Zwischenfrucht zulässig – höchstens ${regel.werte.begrenzung_60.kg_n_ha} kg N/ha${saatNachErnte ? "" : " (bisher ist keine Folgekultur bzw. Zwischenfrucht eingetragen)"}.` });
    }
  } else if (klasse === "gruenland" && inSperre(sf.gruenland_alle)) {
    w.push({ code: "napv_sperrfrist", stufe: "fehler", bestaetigen: true, quelle: Q.s2, text: "Sperrfrist: Auf Grünland und Ackerfutterflächen dürfen von 30. November bis 15. Februar keine N-Dünger ausgebracht werden." });
  } else if (klasse === "sonstige") {
    const z = leicht ? sf.sonstige_leichtloeslich : sf.sonstige_langsamloeslich;
    if (inSperre(z)) w.push({ code: "napv_sperrfrist", stufe: "fehler", bestaetigen: true, quelle: Q.s2, text: `Sperrfrist für diese Fläche: ${leicht ? "15. Oktober" : "30. November"} bis 15. Februar.` });
  }

  // § 7 Abs. 3: 60 kg
  const b60 = regel.werte.begrenzung_60;
  const in60 = leicht && ((klasse === "gruenland" && imZeitraum(datum, b60.gruenland_von, b60.gruenland_bis))
    || (klasse === "acker" && ernte && md(datum) <= b60.acker_bis && md(datum) > "06-01"));
  if (in60 && nKg > b60.kg_n_ha) {
    w.push({ code: "napv_60kg", stufe: "fehler", bestaetigen: true, quelle: Q.s7, text: `Zu dieser Zeit sind höchstens ${b60.kg_n_ha} kg N/ha erlaubt – geplant sind ${nKg} kg N/ha (nach Stall- und Lagerverlusten).` });
  }

  // § 4 Bodenzustand
  const bz = regel.werte.bodenzustand_abfrage;
  if (imZeitraum(datum, bz.von, bz.bis)) {
    w.push({ code: "napv_bodenzustand", stufe: "warnung", bestaetigen: true, quelle: Q.s4,
      text: "Bitte bestätigen: Der Boden ist nicht gefroren, nicht wassergesättigt oder überschwemmt und nicht schneebedeckt (mindestens die Hälfte des Schlags schneefrei)." });
  }

  // § 3 Abs. 1 Gabenteilung
  const grenze = regel.werte.gabenteilung_ab_kg_leichtloeslich;
  if (leicht && n.n_leichtloeslich > grenze) {
    w.push({ code: "napv_gabenteilung", stufe: "warnung", bestaetigen: true, quelle: Q.s3,
      text: `Diese Gabe enthält ${n.n_leichtloeslich} kg leichtlöslichen N/ha – mehr als ${grenze} kg sind zu teilen (ausgenommen stabilisierte Dünger sowie Hackfrüchte/Gemüse auf Böden mit mehr als 15 % Ton).` });
  }

  // § 5 Gewässer, § 3 Abs. 4–6 Hang
  const fs = ziel.feldstueck ?? {};
  const amGewaesser = fs.grenzt_an_gewaesser === true || (fs.gewaesser_abstand_m != null && fs.gewaesser_abstand_m < regel.werte.hang.bereich_m);
  if (amGewaesser) {
    const g = regel.werte.gewaesser;
    const steil = (fs.hangneigung_prozent ?? 0) > g.neigung_grenze_prozent;
    w.push({ code: "napv_gewaesser", stufe: "warnung", bestaetigen: true, quelle: Q.s5,
      text: `Fläche an einem Gewässer: Düngefreier Abstand zur Böschungsoberkante bei Fließgewässern mindestens ${g.fliessend_m} m (bei ${steil ? `über ${g.neigung_grenze_prozent} % Neigung ${g.fliessend_steil_m}` : `unter ${g.neigung_grenze_prozent} % Neigung ${g.fliessend_flach_m}`} m, wenn der Streifen ganzjährig bewachsen ist), bei stehenden Gewässern ${g.stehend_m} m (${g.stehend_reduziert_m} m bei unter ${g.neigung_grenze_prozent} % Neigung und bewachsenem Streifen). Die ersten ${g.streifen_bewachsen_m} m müssen ganzjährig bewachsen sein.` });
    if (steil && leicht) {
      const h = regel.werte.hang;
      if (nKg > h.teilgaben_ab_kg_n) {
        w.push({ code: "napv_hang", stufe: "fehler", bestaetigen: true, quelle: Q.s3, text: `Hanglage über ${h.neigung_prozent} % am Gewässer: Gaben über ${h.teilgaben_ab_kg_n} kg N/ha sind zu teilen; unmittelbar vor dem Anbau höchstens ${h.max_vor_anbau_kg_n} kg N/ha. ${h.ausnahme}` });
      } else {
        w.push({ code: "napv_hang_info", stufe: "info", quelle: Q.s3, text: `Hanglage über ${h.neigung_prozent} % am Gewässer: Bei ${h.erosion_kulturen.join(", ")} sind zusätzlich Querstreifen, ein 20 m breiter bewachsener Streifen oder ein abschwemmungshemmender Anbau nötig. ${h.ausnahme}` });
      }
    }
  }

  // § 3 Abs. 3 Einarbeitung
  if (n.fluessig_wd) {
    const e = regel.werte.einarbeitung_stunden;
    w.push({ code: "napv_einarbeitung", stufe: "info", quelle: Q.s3, text: `Auf Flächen ohne Bewuchs: Gülle, Jauche und Gärreste möglichst binnen ${e.moeglichst} Stunden, spätestens nach ${e.spaetestens} Stunden einarbeiten.` });
  }

  // Anlage 3: Obergrenze am Schlag
  if (n.n_jahreswirksam != null) {
    const plan = ziel.plan?.n_bedarf_kg_ha;
    const og = plan ?? obergrenze(zeile, { stufe: ziel.schlag?.ertragslage ?? "mittel", anlage5: betrieb?.napv_gebiet_anlage5 === true });
    const summe = r1(bisherJahreswirksam + n.n_jahreswirksam);
    if (og == null) {
      w.push({ code: "napv_obergrenze_unbekannt", stufe: "info", quelle: Q.anl3, text: "Für diesen Schlag gibt es keinen Düngeplan und die Kultur ist keiner NAPV-Zeile zugeordnet – die Obergrenze wird nicht geprüft. Tipp: unter Düngung → Düngeplanung anlegen." });
    } else if (summe > og) {
      w.push({ code: "napv_obergrenze", stufe: "fehler", bestaetigen: true, quelle: Q.anl3,
        text: `Mit dieser Gabe kommen ${summe} kg jahreswirksamer N/ha zusammen – ${plan != null ? "laut Düngeplan" : "laut Obergrenze"} sind höchstens ${og} kg N/ha zulässig.` });
    }
  }

  // ÖPUL Zwischenfruchtanbau: kein mineralischer N im Begrünungszeitraum
  if (begruenung && n.typ === "mineralisch") {
    const z = begruenungAktiv(ziel.massnahmen ?? [], datum, begruenung);
    if (z) w.push({ code: "oepul_begruenung_n", stufe: "fehler", bestaetigen: true, quelle: { text: "ÖPUL Zwischenfruchtanbau (AMA)", url: begruenung.quelle },
      text: `Auf diesem Schlag läuft die Begrünung (Variante ${z.variante}, bis ${z.ende.split("-").reverse().join(".")}). ${begruenung.werte.verbote_im_begruenungszeitraum.mineralischer_n}` });
  }
  return w;
}

// ---------- Auswertungen ----------

/**
 * Jahresauswertung je Schlag und Betrieb (§ 8 Abs. 1, § 9 Abs. 6 NAPV).
 * @param {{jahr, schlaege: Array<{schlag, kultur, feldstueck, bezeichnung}>, massnahmen, betriebsmittel, plaene, betrieb, regel}} p
 */
export function jahresauswertung({ jahr, schlaege, massnahmen, betriebsmittel, plaene, betrieb, regel }) {
  const planVon = new Map(plaene.filter((p) => p.jahr === jahr).map((p) => [p.schlag_id, p]));
  const imJahr = massnahmen.filter((m) => !m.geloescht && m.datum.slice(0, 4) === String(jahr));
  const proSchlag = schlaege.map((e) => {
    const ms = imJahr.filter((m) => m.schlag_ids?.includes(e.schlag.id));
    const dueng = ms.filter((m) => m.art === "duengung");
    const summe = { n_gesamt: 0, n_jahreswirksam: 0, n_wd: 0, p2o5: 0, k2o: 0, unvollstaendig: false };
    for (const m of dueng) {
      const x = m.details?.naehrstoffe_kg_je_ha ?? {};
      summe.n_gesamt += x.n_gesamt ?? 0;
      if (x.n_jahreswirksam == null) summe.unvollstaendig = true;
      summe.n_jahreswirksam += x.n_jahreswirksam ?? 0;
      if (m.details?.duenger_art !== "mineralduenger") summe.n_wd += x.n_nach_stall_lager ?? x.n_gesamt ?? 0;
      summe.p2o5 += x.p2o5 ?? 0;
      summe.k2o += x.k2o ?? 0;
    }
    const bew = ms.filter((m) => m.art === "bewaesserung").reduce((s, m) => s + (m.details?.n_kg_je_ha ?? 0), 0);
    const ernte = ms.filter((m) => m.art === "ernte" && m.details?.hauptfrucht !== false).sort((a, b) => b.datum.localeCompare(a.datum))[0];
    const plan = planVon.get(e.schlag.id) ?? null;
    const ertragT = ernte?.details?.ertrag?.einheit === "t_je_ha" ? ernte.details.ertrag.wert : ernte?.details?.ertrag?.einheit === "dt_je_ha" ? ernte.details.ertrag.wert / 10 : null;
    const ent = plan?.napv_kultur && ertragT ? entzug({ zeileId: plan.napv_kultur, ertragTHa: ertragT, ertragslage: ernte.details.ertragslage ?? plan.ertragslage, rohprotein: ernte.details.rohprotein_prozent, feuchte: ernte.details.feuchte_prozent }, regel) : null;
    const zufuhr = summe.n_jahreswirksam + (plan?.vorfrucht_kg_n_ha ?? 0) + bew;
    return {
      ...e, plan, ms, ernte, bewaesserung_n: r1(bew),
      n_gesamt: r1(summe.n_gesamt), n_jahreswirksam: r1(summe.n_jahreswirksam), n_wd: r1(summe.n_wd), p2o5: r1(summe.p2o5), k2o: r1(summe.k2o),
      unvollstaendig: summe.unvollstaendig,
      ueber_obergrenze: plan?.n_bedarf_kg_ha != null && summe.n_jahreswirksam > plan.n_bedarf_kg_ha,
      entzug: ent, saldo: ent == null ? null : r1(zufuhr - ent),
      vegetationserneuerung: ms.filter((m) => m.art === "bodenbearbeitung" && m.details?.zweck === "vegetationserneuerung").map((m) => m.datum),
    };
  });
  const ln = schlaege.filter((e) => e.feldstueck?.nutzungsart !== "alm").reduce((s, e) => s + (e.schlag.flaeche_ha ?? 0), 0);
  const lnMitN = proSchlag.filter((s) => s.n_gesamt > 0).reduce((s, x) => s + (x.schlag.flaeche_ha ?? 0), 0);
  const wdN = proSchlag.reduce((s, x) => s + x.n_wd * (x.schlag.flaeche_ha ?? 0), 0);
  const jwN = proSchlag.reduce((s, x) => s + x.n_jahreswirksam * (x.schlag.flaeche_ha ?? 0), 0);
  const uebernahme = betriebsmittel.filter((b) => b.duenger?.herkunft === "uebernahme" && b.duenger.uebernahme)
    .filter((b) => !b.duenger.uebernahme.zeitraum_von || b.duenger.uebernahme.zeitraum_von.slice(0, 4) <= String(jahr))
    .map((b) => ({ name: b.name, partner: b.duenger.uebernahme.partner_name, n_kg: b.duenger.uebernahme.n_kg ?? null }));
  return {
    jahr, proSchlag, ln_ha: r1(ln * 100) / 100, ln_mit_n_ha: r1(lnMitN * 100) / 100,
    wd_n_kg: r1(wdN), wd_n_je_ha: ln ? r1(wdN / ln) : 0, wd_grenze: regel.werte.wirtschaftsduenger_obergrenze_kg_n_ha,
    jahreswirksam_n_kg: r1(jwN), uebernahme,
    anlage5: betrieb?.napv_gebiet_anlage5 === true,
  };
}
