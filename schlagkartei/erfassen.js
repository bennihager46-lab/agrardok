// Erfassung von Bodenbearbeitung, Aussaat, Pflege, Ernte und Bewässerung – für einen oder mehrere Schläge auf einmal,
// Datum = heute, Werte der letzten gleichartigen Maßnahme vorgeschlagen („wie letztes Mal“).

import * as daten from "../core/daten.js";
import * as regeln from "../core/regeln.js";
import { aktiverBetrieb } from "../core/betrieb.js";
import { schlaegeImJahr, kulturen, letzteMassnahme, aktuellesJahr, heute, datumText } from "../core/bestand.js";
import { begruenungAktiv } from "../core/oepul.js";
import { ARTEN } from "../core/massnahmen-text.js";
import { gehe, parameter } from "../core/router.js";
import { h, karte, meldung, bestaetige } from "../core/ui/dom.js";
import { textfeld, auswahl, knopfauswahl, formular, abschnitt, werte, zeigeFehler, zahlAus, jaNeinAus, jaNeinWert } from "../core/ui/formular.js";
import { schlagwahl, leseSchlagwahl } from "../core/ui/schlagwahl.js";
import { personenUndGeraete, wannWer, notizfeld, zeigeWarnungen, leseBestaetigungen, offeneBestaetigungen } from "../core/ui/aufzeichnung.js";

export const ERFASSBAR = ["bodenbearbeitung", "aussaat", "pflege", "ernte", "bewaesserung"];
const zw = (n) => (n == null ? "" : String(n).replace(".", ","));
const opt = (paare) => paare.map(([wert, text]) => ({ wert, text }));
const JA_NEIN = [{ wert: "ja", text: "Ja" }, { wert: "nein", text: "Nein" }];

const VERFAHREN_BODEN = opt([["pflug", "Pflug"], ["grubber", "Grubber"], ["scheibenegge", "Scheibenegge"], ["kreiselegge", "Kreiselegge"], ["fraese", "Fräse"], ["walze", "Walze"], ["mulchen", "Mulchen"], ["sonstiges", "Sonstiges"]]);
const ZWECK = opt([["grundbodenbearbeitung", "Grundbodenbearbeitung"], ["saatbettbereitung", "Saatbettbereitung"], ["umbruch_zwischenfrucht", "Umbruch der Zwischenfrucht"],
  ["umbruch_gruenland", "Grünlandumbruch"], ["vegetationserneuerung", "Erneuerung der Vegetation (NAPV § 5 Abs. 2)"], ["einarbeitung_duenger", "Einarbeitung von Dünger"], ["sonstiges", "Sonstiges"]]);
const VERFAHREN_PFLEGE = opt([["striegeln", "Striegeln"], ["hacken", "Hacken"], ["walzen", "Walzen"], ["mulchen", "Mulchen"], ["haeckseln", "Häckseln"], ["maehen", "Mähen"], ["nachsaat", "Nachsaat"], ["abschleppen", "Abschleppen (Grünland)"], ["sonstiges", "Sonstiges"]]);
const SAAT_EINHEIT = opt([["kg_je_ha", "kg/ha"], ["stk_je_ha", "Körner/ha"]]);
const ERTRAG_EINHEIT = opt([["t_je_ha", "t/ha"], ["dt_je_ha", "dt/ha"]]);
const BELEG = opt([["wiegeschein", "Wiegeschein"], ["silovolumen", "Silovolumen"], ["schaetzung", "Schätzung"], ["sonstiger", "Sonstiger Beleg"]]);
const ERTRAGSLAGE = opt([["niedrig", "Niedrig"], ["mittel", "Mittel"], ["hoch_1", "Hoch 1"], ["hoch_2", "Hoch 2"], ["hoch_3", "Hoch 3"]]);
const MASCHINEN = { bodenbearbeitung: ["traktor", "bodenbearbeitung"], aussaat: ["traktor", "saemaschine"], pflege: ["traktor", "bodenbearbeitung", "maehwerk", "sonstiges"], ernte: ["erntemaschine", "traktor", "maehwerk"], bewaesserung: ["sonstiges"] };

export async function renderErfassen(ziel) {
  const betrieb = await aktiverBetrieb();
  if (!betrieb) return ziel.append(h("h1", {}, "Aufzeichnen"), karte("Zuerst den Betrieb einrichten", h("a", { class: "knopf", href: "#/betrieb-bearbeiten" }, "Betrieb einrichten")));
  const p = parameter();
  const alt = p.get("id") ? await daten.hole("massnahme", p.get("id")) : null;
  const art = alt?.art ?? p.get("art");
  if (!ERFASSBAR.includes(art) || (p.get("id") && (!alt || alt.geloescht))) return gehe("aufzeichnen");
  const jahr = Number(alt?.datum?.slice(0, 4) ?? p.get("jahr")) || aktuellesJahr();

  const [eintraege, kult, { personen, maschinen }, letzte, bm, begruenung] = await Promise.all([
    schlaegeImJahr(betrieb.id, jahr), kulturen(betrieb.id), personenUndGeraete(betrieb.id),
    alt ? null : letzteMassnahme(betrieb.id, art), daten.liste("betriebsmittel", { index: "betrieb_id", wert: betrieb.id }),
    regeln.lade("oepul/begruenung"),
  ]);
  const vorlage = alt ?? (letzte ? { details: letzte.details, person_ids: letzte.person_ids, maschine_ids: letzte.maschine_ids } : {});
  const d = structuredClone(vorlage.details ?? {});
  const vorgewaehlt = alt?.schlag_ids ?? (p.get("schlag") ? [p.get("schlag")] : []);

  ziel.append(h("h1", {}, alt ? `${ARTEN[art]} bearbeiten` : ARTEN[art]));
  if (!alt && letzte) ziel.append(h("p", { class: "hinweis hinweis-info", "data-test": "wie-letztes-mal" }, `Vorgeschlagen wie bei der letzten ${ARTEN[art]} am ${datumText(letzte.datum)}. Bitte prüfen.`));

  const warnBereich = h("div", { "aria-live": "polite" });
  const artFelder = h("div");
  const zeichneArt = () => artFelder.replaceChildren(...felderFuer(art, d, { kult, bm, betrieb, bearbeiten: !!alt }));
  let form = null; // wird gleich erzeugt; die Schlagauswahl meldet ihre Startauswahl schon beim Aufbau
  form = formular(
    { abbrechen: () => history.back(), beimSpeichern: (f) => speichern(f, { alt, art, betrieb, eintraege, kult, warnBereich, begruenung }) },
    schlagwahl({ eintraege, gewaehlt: vorgewaehlt, label: "Auf welchen Schlägen?", hilfe: `Schläge ${jahr}. Mehrere auswählen, wenn dieselbe Arbeit auf mehreren Flächen gemacht wurde.`,
      beiAenderung: (ids) => vorschlagKultur(ids) }),
    artFelder,
    wannWer({ m: vorlage.datum ? vorlage : { ...vorlage, datum: alt?.datum ?? heute() }, personen, maschinen, maschinenArten: MASCHINEN[art] }),
    abschnitt("Notiz", notizfeld(alt ?? {})),
    h("div", { class: "nicht-drucken" }, h("h2", {}, "Prüfung"), warnBereich),
  );
  zeichneArt();
  ziel.append(form);
  if (alt) ziel.append(h("button", { class: "knopf knopf-gefahr", type: "button", onclick: async () => {
    if (!await bestaetige(`${ARTEN[art]} vom ${datumText(alt.datum)} löschen?`, { ja: "Löschen", gefahr: true })) return;
    await daten.loeschen("massnahme", alt.id);
    meldung("Aufzeichnung gelöscht.", "info");
    history.back();
  } }, "Löschen"));

  // Kultur aus dem ersten gewählten Schlag vorschlagen (Aussaat/Ernte), solange nichts eingetragen ist
  function vorschlagKultur(ids) {
    const sel = form?.querySelector('[name="details/kultur_id"]');
    if (!sel || sel.dataset.geaendert) return;
    const k = eintraege.find((e) => e.schlag.id === ids[0])?.kultur;
    if (k && art === "ernte") sel.value = k.id;
  }
  form?.querySelector('[name="details/kultur_id"]')?.addEventListener("change", (e) => { e.target.dataset.geaendert = "1"; });
  const pruefen = async () => {
    const g = lese(form, art, eintraege, kult);
    zeigeWarnungen(warnBereich, [...warnungen(g, { art, begruenung, betrieb }), ...await pruefeBegruenung({ art, ...g }, { betrieb, eintraege, begruenung })], alt?.bestaetigungen ?? []);
  };
  form.addEventListener("change", pruefen);
  vorschlagKultur(vorgewaehlt);
  pruefen();
}

function felderFuer(art, d, { kult, bm, betrieb, bearbeiten }) {
  const nur = (v) => (bearbeiten ? zw(v) : ""); // Ernte: Werte nur beim Bearbeiten vorbelegen, nicht vom letzten Mal
  const kulturOpt = kult.map((k) => ({ wert: k.id, text: k.name }));
  switch (art) {
    case "bodenbearbeitung": return [abschnitt("Bodenbearbeitung",
      auswahl({ pfad: "details/verfahren", label: "Gerät bzw. Verfahren", wert: d.verfahren, optionen: VERFAHREN_BODEN, pflicht: true }),
      auswahl({ pfad: "details/zweck", label: "Zweck", wert: d.zweck, optionen: ZWECK, pflicht: true }),
      textfeld({ pfad: "details/tiefe_cm", label: "Tiefe in cm", wert: zw(d.tiefe_cm), inputmode: "decimal", maxlength: 5 }))];
    case "pflege": return [abschnitt("Pflege",
      auswahl({ pfad: "details/verfahren", label: "Was wurde gemacht?", wert: d.verfahren, optionen: VERFAHREN_PFLEGE, pflicht: true }),
      textfeld({ pfad: "details/beschreibung", label: "Beschreibung", wert: d.beschreibung, maxlength: 200 }))];
    case "aussaat": {
      const zf = d.zwischenfrucht === true;
      const oepulZf = (betrieb.oepul_massnahmen ?? []).includes("begruenung_zwischenfruchtanbau");
      const saatgut = bm.filter((b) => b.art === "saatgut" && b.aktiv !== false);
      return [abschnitt("Aussaat",
        auswahl({ pfad: "details/kultur_id", label: "Kultur", wert: d.kultur_id, optionen: kulturOpt, pflicht: true }),
        knopfauswahl({ pfad: "details/zwischenfrucht", label: "Zwischenfrucht bzw. Begrünung?", wert: jaNeinWert(d.zwischenfrucht ?? false), optionen: JA_NEIN }),
        oepulZf ? auswahl({ pfad: "details/begruenung_variante", label: "ÖPUL-Begrünungsvariante (laut Mehrfachantrag)", wert: zf ? String(d.begruenung_variante ?? "") : "",
          optionen: [1, 2, 3, 4, 5, 6, 7].map((n) => ({ wert: String(n), text: `Variante ${n}` })), leer: "Keine / nicht beantragt", hilfe: "Nur bei Zwischenfrüchten. Damit berechnet die App das Ende des Begrünungszeitraums." }) : null,
        oepulZf ? textfeld({ pfad: "details/mischungspartner", label: "Anzahl Mischungspartner", wert: zw(d.mischungspartner), inputmode: "numeric", maxlength: 2 }) : null,
        saatgut.length ? auswahl({ pfad: "details/saatgut_betriebsmittel_id", label: "Saatgut", wert: d.saatgut_betriebsmittel_id, optionen: saatgut.map((s) => ({ wert: s.id, text: s.name })), leer: "Nicht angegeben" }) : null,
        textfeld({ pfad: "details/sorte", label: "Sorte", wert: d.sorte, maxlength: 80 }),
        h("div", { class: "feldraster" },
          textfeld({ pfad: "details/saatmenge/wert", label: "Saatmenge", wert: zw(d.saatmenge?.wert), inputmode: "decimal", maxlength: 10 }),
          auswahl({ pfad: "details/saatmenge/einheit", label: "Einheit", wert: d.saatmenge?.einheit ?? "kg_je_ha", optionen: SAAT_EINHEIT, leer: null })))];
    }
    case "ernte": return [abschnitt("Ernte",
      auswahl({ pfad: "details/kultur_id", label: "Kultur", wert: d.kultur_id, optionen: kulturOpt, leer: "Wie am Schlag eingetragen" }),
      knopfauswahl({ pfad: "details/hauptfrucht", label: "Hauptfrucht?", wert: jaNeinWert(d.hauptfrucht ?? true), optionen: JA_NEIN, hilfe: "Nein bei Zwischenfrucht-Nutzung oder Zweitkultur" }),
      h("div", { class: "feldraster" },
        textfeld({ pfad: "details/ertrag/wert", label: "Ertrag", wert: nur(d.ertrag?.wert), inputmode: "decimal", maxlength: 10, hilfe: "je ha" }),
        auswahl({ pfad: "details/ertrag/einheit", label: "Einheit", wert: d.ertrag?.einheit ?? "t_je_ha", optionen: ERTRAG_EINHEIT, leer: null })),
      h("div", { class: "feldraster" },
        textfeld({ pfad: "details/feuchte_prozent", label: "Feuchte in %", wert: nur(d.feuchte_prozent), inputmode: "decimal", maxlength: 5 }),
        textfeld({ pfad: "details/rohprotein_prozent", label: "Rohprotein in % TM", wert: nur(d.rohprotein_prozent), inputmode: "decimal", maxlength: 5, hilfe: "Für den N-Entzug bei Weizen und Braugerste" })),
      auswahl({ pfad: "details/beleg", label: "Beleg für die Menge", wert: d.beleg, optionen: BELEG, leer: "Nicht angegeben", hilfe: "NAPV: Wiegeschein oder Silovolumen, wenn über der mittleren Ertragslage gedüngt wurde" }),
      auswahl({ pfad: "details/ertragslage", label: "Erreichte Ertragslage", wert: bearbeiten ? d.ertragslage : "", optionen: ERTRAGSLAGE, leer: "Nicht angegeben" }),
      textfeld({ pfad: "details/schnitt_nr", label: "Schnitt Nr. (Grünland)", wert: nur(d.schnitt_nr), inputmode: "numeric", maxlength: 2 }))];
    case "bewaesserung": return [abschnitt("Bewässerung",
      textfeld({ pfad: "details/menge_mm", label: "Menge in mm", wert: zw(d.menge_mm), inputmode: "decimal", pflicht: true, maxlength: 6, hilfe: "1 mm = 10 m³ je ha" }),
      textfeld({ pfad: "details/nitrat_mg_je_l", label: "Nitratgehalt des Wassers in mg/l", wert: zw(d.nitrat_mg_je_l), inputmode: "decimal", maxlength: 6, hilfe: "Teststreifen, mindestens einmal im Jahr messen (NAPV Anlage 3 Abschnitt IV)" }),
      textfeld({ pfad: "details/wasserentnahme_m3", label: "Entnommene Wassermenge in m³", wert: zw(d.wasserentnahme_m3), inputmode: "decimal", maxlength: 8 }))];
    default: return [];
  }
}

function lese(form, art, eintraege, kult) {
  const w = werte(form);
  const det = {};
  const setze = (k, v) => { if (v !== undefined && v !== "" && v !== null) det[k] = v; };
  const kultur = (id) => kult.find((k) => k.id === id);
  const schlagIds = leseSchlagwahl(form);
  const flaeche = eintraege.filter((e) => schlagIds.includes(e.schlag.id)).reduce((s, e) => s + (e.schlag.flaeche_ha ?? 0), 0);
  if (art === "bodenbearbeitung") { setze("verfahren", w["details/verfahren"]); setze("zweck", w["details/zweck"]); setze("tiefe_cm", zahlAus(w["details/tiefe_cm"])); }
  if (art === "pflege") { setze("verfahren", w["details/verfahren"]); setze("beschreibung", w["details/beschreibung"]); setze("behandelte_flaeche_ha", flaeche || undefined); }
  if (art === "aussaat") {
    const k = kultur(w["details/kultur_id"]);
    setze("kultur_id", k?.id); setze("kultur_name", k?.name);
    setze("zwischenfrucht", jaNeinAus(w["details/zwischenfrucht"]));
    if (det.zwischenfrucht) { setze("begruenung_variante", zahlAus(w["details/begruenung_variante"])); setze("mischungspartner", zahlAus(w["details/mischungspartner"])); }
    setze("saatgut_betriebsmittel_id", w["details/saatgut_betriebsmittel_id"]); setze("sorte", w["details/sorte"]);
    const menge = zahlAus(w["details/saatmenge/wert"]);
    if (menge !== undefined) det.saatmenge = { wert: menge, einheit: w["details/saatmenge/einheit"] };
  }
  if (art === "ernte") {
    const k = kultur(w["details/kultur_id"]) ?? eintraege.find((e) => e.schlag.id === schlagIds[0])?.kultur;
    setze("kultur_id", k?.id); setze("kultur_name", k?.name);
    setze("hauptfrucht", jaNeinAus(w["details/hauptfrucht"]));
    const ertrag = zahlAus(w["details/ertrag/wert"]);
    if (ertrag !== undefined) {
      det.ertrag = { wert: ertrag, einheit: w["details/ertrag/einheit"] };
      if (typeof ertrag === "number" && flaeche) det.menge = { wert: Math.round(ertrag * flaeche * (det.ertrag.einheit === "dt_je_ha" ? 10 : 100)) / 100, einheit: det.ertrag.einheit === "dt_je_ha" ? "dt" : "t" };
    }
    for (const k2 of ["feuchte_prozent", "rohprotein_prozent", "schnitt_nr"]) setze(k2, zahlAus(w[`details/${k2}`]));
    setze("beleg", w["details/beleg"]); setze("ertragslage", w["details/ertragslage"]);
  }
  if (art === "bewaesserung") {
    for (const k2 of ["menge_mm", "nitrat_mg_je_l", "wasserentnahme_m3"]) setze(k2, zahlAus(w[`details/${k2}`]));
    // NAPV Anlage 3 Abschnitt IV: N [kg/ha] = NO3 [mg/l] / 4,43 × Menge [mm] / 100
    if (typeof det.menge_mm === "number" && typeof det.nitrat_mg_je_l === "number") det.n_kg_je_ha = Math.round((det.nitrat_mg_je_l / 4.43) * (det.menge_mm / 100) * 10) / 10;
  }
  return { w, details: det, schlag_ids: schlagIds, datum: w.datum };
}

function warnungen({ details, datum }, { art, begruenung, betrieb }) {
  const w = [];
  if (!datum) return w;
  const quelle = { text: "ÖPUL Zwischenfruchtanbau (AMA)", url: begruenung.quelle };
  if (datum > heute()) w.push({ code: "datum_zukunft", stufe: "info", text: "Das Datum liegt in der Zukunft – gespeichert wird es trotzdem als erledigte Maßnahme." });
  if ((betrieb.oepul_massnahmen ?? []).includes("begruenung_zwischenfruchtanbau")) {
    const v = begruenung.werte;
    if (art === "aussaat" && details.zwischenfrucht && details.begruenung_variante) {
      const vari = v.varianten.find((x) => x.nr === details.begruenung_variante);
      if (vari && datum.slice(5) > vari.anlage_bis) w.push({ code: "oepul_anlage_spaet", stufe: "fehler", bestaetigen: true, quelle, text: `Variante ${vari.nr} muss bis spätestens ${vari.anlage_bis.split("-").reverse().join(".")}. angelegt sein. Bitte die Variante im Mehrfachantrag korrigieren.` });
      if (vari?.mischungspartner_min && details.mischungspartner != null && details.mischungspartner < vari.mischungspartner_min) {
        w.push({ code: "oepul_mischung", stufe: "warnung", bestaetigen: true, quelle, text: `Variante ${vari.nr}: ${vari.bedingung}.` });
      }
    }
  }
  if (art === "ernte" && details.ertrag?.wert > 0 && !details.beleg) w.push({ code: "ernte_beleg", stufe: "info", text: "Tipp: Beleg für die Erntemenge angeben (Wiegeschein oder Silovolumen) – die NAPV verlangt ihn, wenn über der mittleren Ertragslage gedüngt wurde." });
  return w;
}

/** ÖPUL-Prüfungen, die die Maßnahmen des Schlags brauchen (Bodenbearbeitung/Pflege während der Begrünung). */
async function pruefeBegruenung({ art, details, schlag_ids, datum }, { betrieb, eintraege, begruenung }) {
  if (!(betrieb.oepul_massnahmen ?? []).includes("begruenung_zwischenfruchtanbau") || !["bodenbearbeitung", "pflege"].includes(art)) return [];
  const w = [];
  const quelle = { text: "ÖPUL Zwischenfruchtanbau (AMA)", url: begruenung.quelle };
  for (const id of schlag_ids) {
    const ms = await daten.liste("massnahme", { index: "schlag_ids", wert: id });
    const z = begruenungAktiv(ms.filter((m) => !m.geloescht), datum, begruenung);
    if (!z) continue;
    const name = eintraege.find((e) => e.schlag.id === id)?.bezeichnung ?? "";
    if (art === "bodenbearbeitung") w.push({ code: "oepul_bodenbearbeitung", stufe: "fehler", bestaetigen: true, quelle, bezug: name, text: `Begrünung Variante ${z.variante} läuft bis ${datumText(z.ende)}. ${begruenung.werte.verbote_im_begruenungszeitraum.bodenbearbeitung}` });
    const ab = begruenung.werte.pflege_erlaubt_ab[String(z.variante)];
    if (art === "pflege" && ["mulchen", "haeckseln", "maehen"].includes(details.verfahren) && ab && datum.slice(5) < ab && datum.slice(5) > "06-01") {
      w.push({ code: "oepul_pflege", stufe: "warnung", bestaetigen: true, quelle, bezug: name, text: begruenung.werte.verbote_im_begruenungszeitraum.pflege });
    }
  }
  return w;
}

const FEHLERTEXTE = {
  schlag_ids: { required: "Bitte mindestens einen Schlag wählen.", minItems: "Bitte mindestens einen Schlag wählen." },
  datum: { required: "Bitte das Datum eintragen." },
  "details/kultur_id": { required: "Bitte die Kultur wählen." },
  "details/kultur_name": { required: "Bitte die Kultur wählen." },
  "details/verfahren": { required: "Bitte wählen, was gemacht wurde.", enum: "Bitte wählen, was gemacht wurde." },
  "details/zweck": { required: "Bitte den Zweck wählen.", enum: "Bitte den Zweck wählen." },
  "details/menge_mm": { required: "Bitte die Wassermenge in mm eintragen." },
};

async function speichern(form, { alt, art, betrieb, eintraege, kult, warnBereich, begruenung }) {
  const gelesen = lese(form, art, eintraege, kult);
  const alle = [...warnungen(gelesen, { art, begruenung, betrieb }), ...await pruefeBegruenung({ art, ...gelesen }, { betrieb, eintraege, begruenung })];
  zeigeWarnungen(warnBereich, alle, alt?.bestaetigungen ?? []);
  const offen = offeneBestaetigungen(warnBereich);
  if (offen.length) {
    meldung("Bitte die markierten Hinweise unten lesen und bestätigen.", "warnung", 8000);
    warnBereich.querySelector("[data-bestaetigung]:not(:checked)")?.focus();
    return;
  }
  const { w } = gelesen;
  const m = {
    ...(alt ?? {}), betrieb_id: betrieb.id, art, modul: "schlagkartei", status: "erledigt",
    datum: w.datum || undefined, schlag_ids: gelesen.schlag_ids, details: gelesen.details,
  };
  if (w.person_id) m.person_ids = [w.person_id]; else delete m.person_ids;
  if (w.maschine_id) m.maschine_ids = [w.maschine_id]; else delete m.maschine_ids;
  if (w.notiz) m.notiz = w.notiz; else delete m.notiz;
  const best = leseBestaetigungen(warnBereich);
  if (best.length) m.bestaetigungen = best; else delete m.bestaetigungen;
  if (!m.schlag_ids.length) return zeigeFehler(form, [{ pfad: "schlag_ids", art: "minItems", meldung: "" }], FEHLERTEXTE);
  try {
    const g = await daten.speichern("massnahme", m);
    meldung(`${ARTEN[art]} gespeichert (${g.schlag_ids.length} ${g.schlag_ids.length === 1 ? "Schlag" : "Schläge"}).`, "erfolg");
    gehe("aufzeichnen");
  } catch (e) {
    if (e.name !== "ValidierungsFehler") throw e;
    zeigeFehler(form, e.fehler, FEHLERTEXTE);
  }
}

