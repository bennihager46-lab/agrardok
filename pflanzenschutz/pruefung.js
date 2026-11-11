// Prüfungen einer Pflanzenschutz-Anwendung – ohne Oberfläche, mit Unit-Tests (tests/pflanzenschutz.test.js).
// Grundlage sind die Angaben, die der Betrieb beim Mittel aus dem Pflanzenschutzmittelregister übernommen hat.
// Hinweis, keine Rechtsauskunft: Maßgeblich sind Register und Gebrauchsanleitung.

import { psmStatus } from "../core/psm.js";
import { sachkundeStatus } from "../core/person.js";
import { begruenungAktiv } from "../core/oepul.js";

const REGISTER = { text: "Pflanzenschutzmittelregister (BAES)", url: "https://psmregister.baes.gv.at/" };
const EU_ART67 = { text: "Art. 67 VO (EG) 1107/2009, DVO (EU) 2023/564", url: "https://eur-lex.europa.eu/eli/reg_impl/2023/564/oj" };
const datumText = (iso) => iso.split("-").reverse().join(".");
const plusTage = (iso, n) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
const norm = (t) => String(t ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const alsDatum = (iso) => new Date(`${iso}T12:00:00`);

/** Passt eine Indikation zur Kultur? Über den EPPO-Code oder den Kulturnamen im Registertext. */
export function passtZurKultur(ind, kultur) {
  if (!kultur) return false;
  if (kultur.eppo_code && ind.eppo_codes?.includes(kultur.eppo_code)) return true;
  const text = norm(ind.kulturen);
  return [kultur.name, kultur.amtlicher_name].filter(Boolean).some((n) => norm(n) && text.includes(norm(n)));
}

/** Passende Indikationen eines Mittels für eine Kultur. */
export const indikationenFuer = (bm, kultur) => (bm.psm?.indikationen ?? []).filter((i) => passtZurKultur(i, kultur));

/**
 * @param {object} p
 * @param {string} p.datum
 * @param {Array<{bm, aufwand, indikation?}>} p.mittel  indikation = gewählte Indikation (sonst die erste passende)
 * @param {{schlag, kultur, feldstueck, bezeichnung, massnahmen}} p.ziel
 * @returns {{warnungen: Array, wartezeitEnde: string|null}}
 */
export function pruefeAnwendung({ datum, mittel, ziel, person, maschine, betrieb, begruenung, bbch, uhrzeitStart, grund, neu = true, heute }) {
  const w = [];
  const ms = (ziel?.massnahmen ?? []).filter((m) => !m.geloescht);
  let wartezeitEnde = null;
  const kulturName = ziel?.kultur?.name ?? "diese Kultur";

  for (const { bm, aufwand, indikation } of mittel) {
    if (!bm) continue;
    const name = bm.name;
    const s = psmStatus(bm, alsDatum(datum));
    if (s.stufe === "abgelaufen") w.push({ code: `psm_zulassung_${bm.id}`, stufe: "fehler", bestaetigen: true, quelle: REGISTER, text: `${name}: ${s.text}.` });
    else if (s.stufe === "aufbrauchen") w.push({ code: `psm_aufbrauch_${bm.id}`, stufe: "info", quelle: REGISTER, text: `${name}: ${s.text}.` });
    else if (s.stufe === "unbekannt") w.push({ code: `psm_zulassung_unbekannt_${bm.id}`, stufe: "info", quelle: REGISTER, text: `${name}: Zulassungsende ist nicht eingetragen – bitte im Register prüfen.` });

    const inds = bm.psm?.indikationen ?? [];
    const passend = inds.filter((i) => passtZurKultur(i, ziel?.kultur));
    const ind = indikation ?? passend[0] ?? null;
    if (!inds.length) {
      w.push({ code: `psm_indikation_fehlt_${bm.id}`, stufe: "info", quelle: REGISTER, text: `${name}: Keine Indikationen eingetragen – ob das Mittel für ${kulturName} zugelassen ist, bitte im Register prüfen.` });
    } else if (!ind) {
      w.push({ code: `psm_nicht_zugelassen_${bm.id}`, stufe: "fehler", bestaetigen: true, quelle: REGISTER,
        text: `${name}: Für ${kulturName} ist keine zugelassene Anwendung eingetragen. Bitte im Register prüfen (Kulturgruppen wie „Getreide“ sind eventuell nicht erkannt).` });
    }
    if (ind) {
      if (ind.aufwand && aufwand?.einheit === ind.aufwand.einheit && aufwand.wert > ind.aufwand.wert) {
        w.push({ code: `psm_aufwand_${bm.id}`, stufe: "fehler", bestaetigen: true, quelle: REGISTER, text: `${name}: ${String(aufwand.wert).replace(".", ",")} je ha – zugelassen sind höchstens ${String(ind.aufwand.wert).replace(".", ",")} (Indikation ${ind.nr ?? ""}).` });
      }
      if (bbch != null && ((ind.bbch_von != null && bbch < ind.bbch_von) || (ind.bbch_bis != null && bbch > ind.bbch_bis))) {
        w.push({ code: `psm_bbch_${bm.id}`, stufe: "warnung", bestaetigen: true, quelle: REGISTER, text: `${name}: BBCH ${bbch} liegt außerhalb des zugelassenen Bereichs ${ind.bbch_von ?? "?"}–${ind.bbch_bis ?? "?"}.` });
      }
      if (ind.max_anwendungen) {
        const bisher = ms.filter((m) => m.art === "pflanzenschutz" && m.datum.slice(0, 4) === datum.slice(0, 4) && m.details?.mittel?.some((x) => x.betriebsmittel_id === bm.id)).length;
        if (bisher + 1 > ind.max_anwendungen) w.push({ code: `psm_max_${bm.id}`, stufe: "fehler", bestaetigen: true, quelle: REGISTER, text: `${name}: Das wäre die ${bisher + 1}. Anwendung in diesem Jahr – zugelassen sind höchstens ${ind.max_anwendungen}.` });
      }
      if (ind.wartezeit_tage != null) {
        const ende = plusTage(datum, ind.wartezeit_tage);
        if (!wartezeitEnde || ende > wartezeitEnde) wartezeitEnde = ende;
        const ernte = ms.find((m) => m.art === "ernte" && m.datum >= datum && m.datum < ende);
        if (ernte) w.push({ code: `psm_wartezeit_${bm.id}`, stufe: "fehler", bestaetigen: true, quelle: REGISTER, text: `${name}: Wartezeit ${ind.wartezeit_tage} Tage – die eingetragene Ernte am ${datumText(ernte.datum)} liegt davor.` });
      } else if (ind.wartezeit_hinweis) {
        w.push({ code: `psm_wartezeit_info_${bm.id}`, stufe: "info", quelle: REGISTER, text: `${name}: Wartezeit – ${ind.wartezeit_hinweis}.` });
      }
    }

    for (const a of bm.psm?.auflagen ?? []) {
      const fs = ziel?.feldstueck ?? {};
      if (a.art === "gewaesser" && (fs.grenzt_an_gewaesser === true || (fs.gewaesser_abstand_m != null && a.abstand_m != null && fs.gewaesser_abstand_m < a.abstand_m))) {
        w.push({ code: `psm_abstand_${bm.id}`, stufe: "warnung", bestaetigen: true, quelle: REGISTER,
          text: `${name}: Die Fläche grenzt an ein Gewässer. Auflage ${a.code ?? ""}: ${a.text}${a.abstand_m != null ? ` (${a.abstand_m} m${a.abdriftminderung_prozent ? ` bei ${a.abdriftminderung_prozent} % Abdriftminderung` : ""})` : ""}.` });
      } else if (a.art === "nichtzielflaeche" && a.abstand_m != null) {
        w.push({ code: `psm_saum_${bm.id}`, stufe: "info", quelle: REGISTER, text: `${name}: Abstand zu Nachbarflächen/Saumbiotopen ${a.abstand_m} m${a.code ? ` (${a.code})` : ""}.` });
      }
    }
    if (bm.psm?.bienengefaehrlich) {
      w.push({ code: `psm_biene_${bm.id}`, stufe: uhrzeitStart ? "info" : "warnung", bestaetigen: !uhrzeitStart, quelle: REGISTER,
        text: `${name} ist bienengefährlich: nicht auf blühende bzw. von Bienen beflogene Pflanzen ausbringen, Bienenschutzvorschriften des Landes beachten${uhrzeitStart ? "" : " – bitte die Uhrzeit (Beginn) eintragen"}.` });
    }
  }

  if (!person) w.push({ code: "psm_anwender", stufe: "info", quelle: EU_ART67, text: "Tipp: Anwender:in angeben – für die Kontrolle des Sachkundeausweises." });
  else {
    const s = sachkundeStatus(person, alsDatum(datum));
    if (s.stufe === "abgelaufen") w.push({ code: "psm_sachkunde", stufe: "fehler", bestaetigen: true, quelle: EU_ART67, text: `${person.name}: ${s.text}. Berufliche Verwender:innen brauchen einen gültigen Sachkundeausweis.` });
    else if (s.stufe === "fehlt") w.push({ code: "psm_sachkunde_fehlt", stufe: "warnung", bestaetigen: true, quelle: EU_ART67, text: `${person.name}: Kein Sachkundeausweis eingetragen.` });
  }
  if (maschine) {
    const gp = maschine.geraetepruefung;
    if (gp?.gueltig_bis && gp.gueltig_bis < datum) w.push({ code: "psm_geraet", stufe: "fehler", bestaetigen: true, text: `${maschine.name}: Geräteprüfung (Prüfplakette) am ${datumText(gp.gueltig_bis)} abgelaufen.` });
    else if (!gp?.gueltig_bis && maschine.art === "feldspritze") w.push({ code: "psm_geraet_unbekannt", stufe: "warnung", bestaetigen: true, text: `${maschine.name}: Keine Geräteprüfung eingetragen.` });
  }
  if (begruenung && (betrieb?.oepul_massnahmen ?? []).includes("begruenung_zwischenfruchtanbau")) {
    const z = begruenungAktiv(ms, datum, begruenung);
    if (z && z.variante !== 7) w.push({ code: "oepul_begruenung_psm", stufe: "fehler", bestaetigen: true, quelle: { text: "ÖPUL Zwischenfruchtanbau (AMA)", url: begruenung.quelle },
      text: `Begrünung Variante ${z.variante} läuft bis ${datumText(z.ende)}. ${begruenung.werte.verbote_im_begruenungszeitraum.psm}` });
  }
  if (betrieb?.bundesland === "T" && !grund) w.push({ code: "psm_grund_tirol", stufe: "warnung", bestaetigen: true, quelle: { text: "§ 5 Tiroler Pflanzenschutzmittelgesetz 2012" }, text: "In Tirol ist der Grund der Behandlung (Schaderreger) aufzuzeichnen." });
  if (neu && heute && datum < plusTage(heute, -2)) w.push({ code: "psm_nachtrag", stufe: "info", quelle: EU_ART67, text: "Die Anwendung liegt mehr als 2 Tage zurück. Aufzeichnungen sind unverzüglich zu führen (Steiermark: binnen 2 Tagen, LK: spätestens 3 Tage)." });
  return { warnungen: w, wartezeitEnde };
}

/** Zeilen für den Export nach DVO (EU) 2023/564: je Mittel und Schlag eine Zeile. */
export function exportZeilen(liste, { schlagVon, personVon, maschineVon }) {
  const zeilen = [];
  for (const m of liste) {
    const d = m.details ?? {};
    const orte = m.schlag_ids?.length ? m.schlag_ids.map((id) => schlagVon.get(id) ?? { bezeichnung: "?" }) : [{ bezeichnung: m.ort ?? "" }];
    for (const mi of d.mittel ?? []) {
      for (const o of orte) {
        zeilen.push({
          Datum: m.datum, Beginn: m.uhrzeit_start ?? "", Ende: m.uhrzeit_ende ?? d.uhrzeit_ende ?? "",
          Verwendungsart: { flaeche: "Fläche", geschlossener_raum: "Geschlossener Raum", saatgut: "Saatgut" }[d.verwendungsart] ?? "",
          Mittel: mi.name, Zulassungsnummer: mi.zulassungsnummer, Aufwand: mi.aufwand?.wert ?? "", Einheit: mi.aufwand?.einheit?.replace("_je_", "/") ?? "",
          "Wasser l/ha": d.wasser_l_je_ha ?? "", Schlag: o.bezeichnung, "INVEKOS-Fläche": o.schlag?.invekos_flaeche_id ?? "",
          "Fläche ha": o.schlag?.flaeche_ha ?? (d.behandelte_flaeche_ha ?? ""), Kultur: d.kultur_name ?? "", EPPO: d.eppo_code ?? "", BBCH: d.bbch ?? "",
          Grund: d.grund ?? "", Charge: mi.charge ?? "", Anwender: (m.person_ids ?? []).map((id) => personVon.get(id)?.name ?? "").join(", "),
          Gerät: (m.maschine_ids ?? []).map((id) => maschineVon.get(id)?.name ?? "").join(", "), "Wartezeit bis": d.wartezeit_ende ?? "",
        });
      }
    }
  }
  return zeilen;
}

/** CSV für Excel (Semikolon, Dezimalkomma, UTF-8 mit BOM). */
export function alsCsv(zeilen) {
  if (!zeilen.length) return "﻿";
  const spalten = Object.keys(zeilen[0]);
  const zelle = (v) => {
    const t = typeof v === "number" ? String(v).replace(".", ",") : String(v ?? "");
    return /[";\n]/.test(t) ? `"${t.replaceAll('"', '""')}"` : t;
  };
  return `﻿${[spalten.join(";"), ...zeilen.map((z) => spalten.map((s) => zelle(z[s])).join(";"))].join("\r\n")}\r\n`;
}
