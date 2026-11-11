// Seite „Betriebsmittel“ anlegen/bearbeiten – ein Formular, dessen Teile sich nach der Art richten.
// Pflanzenschutzmittel werden von Hand aus dem Register bzw. vom Etikett übernommen: Das
// Pflanzenschutzmittelregister des BAES ist keine offene Datenquelle (docs/rechtsgrundlagen.md 2.5).

import * as daten from "../core/daten.js";
import * as regeln from "../core/regeln.js";
import { aktiverBetrieb } from "../core/betrieb.js";
import { gehe, parameter } from "../core/router.js";
import { h, meldung, bestaetige } from "../core/ui/dom.js";
import {
  textfeld, auswahl, datumsfeld, knopfauswahl, mehrfachauswahl, textbereich, formular, abschnitt, werte, zeigeFehler,
  wiederholung, leseWiederholung, zahlAus, jaNeinAus, jaNeinWert, ohneLeere,
} from "../core/ui/formular.js";
import {
  ARTEN, DUENGER_ARTEN, EINHEITEN, AUFWAND_EINHEITEN, BEZUG, GEHALTE_QUELLEN, HERKUNFT, AUFLAGEN_ARTEN, SAATGUT_KATEGORIEN, PRODUKTE,
  QUELLEN, artText, gruppeVon, psmStatus, eppoCodes, ausVorlage, pruefeFachlich,
} from "./kontext.js";
import { ohneBetrieb, ladeMitVerwendung } from "./seiten.js";

const zw = (n) => (n == null ? "" : String(n).replace(".", ","));
const JA_NEIN = [{ wert: "ja", text: "Ja" }, { wert: "nein", text: "Nein" }];
const PSM_FUNKTIONEN = ["Herbizid", "Fungizid", "Insektizid", "Akarizid", "Molluskizid", "Wachstumsregler", "Saatgutbehandlung", "Sonstiges"];
const TIERARTEN = ["Rind", "Kalb", "Schwein", "Schaf", "Ziege", "Pferd", "Huhn", "Pute", "Biene"];
const GEHALT_EINHEITEN = ["g/l", "g/kg", "%", "KBE/l", "KBE/kg"];
const NAPV_TYPEN = [
  ["rinderguelle", "Rindergülle"], ["schweineguelle", "Schweinegülle"], ["huehnerguelle", "Hühnergülle"], ["jauche", "Jauche"],
  ["biogasguelle_rind", "Biogasgülle/Gärrest – überwiegend Rind"], ["biogasguelle_schwein", "Biogasgülle/Gärrest – überwiegend Schwein"],
  ["stallmist", "Stallmist"], ["rottemist", "Rottemist"], ["kompost", "Kompost"], ["huehnertrockenkot", "Hühnertrockenkot, Putenmist"],
].map(([wert, text]) => ({ wert, text }));

const FEHLERTEXTE = {
  name: { required: "Bitte eine Bezeichnung eintragen.", minLength: "Bitte eine Bezeichnung eintragen." },
  "psm/zulassungsnummer": {
    required: "Bitte die Zulassungsnummer eintragen – sie gehört in jede Pflanzenschutz-Aufzeichnung.",
    minLength: "Bitte die Zulassungsnummer eintragen – sie gehört in jede Pflanzenschutz-Aufzeichnung.",
  },
  "duenger/bezug": { required: "Bitte wählen, worauf sich die Gehalte beziehen.", enum: "Bitte wählen, worauf sich die Gehalte beziehen." },
  "duenger/n_gesamt": { required: "Bitte den Stickstoffgehalt eintragen (0, wenn der Dünger keinen Stickstoff enthält)." },
  "duenger/uebernahme": { required: "Bitte den abgebenden Betrieb eintragen." },
  "duenger/uebernahme/partner_name": { required: "Bitte den abgebenden Betrieb eintragen.", minLength: "Bitte den abgebenden Betrieb eintragen." },
  "duenger/uebernahme/partner_betriebsnummer": { pattern: "Die Betriebsnummer (LFBIS) besteht aus genau 7 Ziffern." },
};

/** Nur übernehmen, wenn das Feld im Formular vorkommt – sonst bleibt der gespeicherte Wert erhalten. */
function uebernimm(ziel, schluessel, w, pfad, umwandeln = (x) => x) {
  if (!(pfad in w)) return;
  const v = umwandeln(w[pfad]);
  if (v === undefined || v === "" || (Array.isArray(v) && !v.length)) delete ziel[schluessel];
  else ziel[schluessel] = v;
}
const liste = (t) => String(t ?? "").split(/[,;]/).map((x) => x.trim()).filter(Boolean);
const zahlenfeld = (pfad, label, wert, hilfe) => textfeld({ pfad, label, wert: zw(wert), inputmode: "decimal", hilfe, maxlength: 12 });
const ganzzahlfeld = (pfad, label, wert, hilfe) => textfeld({ pfad, label, wert: zw(wert), inputmode: "numeric", hilfe, maxlength: 6 });
const mehr = (titel, ...inhalt) => h("details", { class: "mehr" }, h("summary", {}, titel), ...inhalt);

// ---------- Seite ----------

export async function renderEintrag(ziel) {
  const betrieb = await aktiverBetrieb();
  if (!betrieb) { ziel.append(h("h1", {}, "Betriebsmittel")); return ohneBetrieb(ziel); }
  const p = parameter();
  const alt = p.get("id") ? await daten.hole("betriebsmittel", p.get("id")) : null;
  if (p.get("id") && (!alt || alt.geloescht)) {
    ziel.append(h("h1", {}, "Betriebsmittel nicht gefunden"), h("a", { class: "knopf", href: "#/betriebsmittel" }, "Zur Liste"));
    return;
  }
  let ausgang = alt;
  if (!ausgang && p.get("vorlage")) {
    const vorlage = (await regeln.lade("betriebsmittel/duenger-vorlagen")).werte.find((v) => v.id === p.get("vorlage"));
    if (vorlage) ausgang = ausVorlage(vorlage, betrieb.id);
  }
  if (!ausgang && ARTEN.some((a) => a.wert === p.get("art"))) ausgang = { art: p.get("art"), betrieb_id: betrieb.id, aktiv: true };
  if (!ausgang) return gehe("betriebsmittel-neu");
  const art = ausgang.art;

  ziel.append(h("h1", {}, alt ? alt.name : `${artText(art)} anlegen`));
  if (!alt && ausgang.vorlage) {
    ziel.append(h("p", { class: "hinweis hinweis-info", "data-test": "vorlage-hinweis" }, "Aus Vorlage ausgefüllt. Bitte die Gehalte mit dem Sackaufdruck bzw. Lieferschein vergleichen und bei Bedarf anpassen."));
  }
  if (art === "psm" && alt) {
    const s = psmStatus(alt);
    if (s.stufe !== "gueltig") ziel.append(h("p", { class: `hinweis ${s.stufe === "abgelaufen" ? "hinweis-fehler" : s.stufe === "unbekannt" ? "hinweis-info" : "hinweis-warnung"}`, "data-test": "psm-status" }, `${s.text}.`));
  }

  const teile = [];
  if (DUENGER_ARTEN.includes(art)) teile.push(...duengerTeil(ausgang));
  if (art === "psm") teile.push(...psmTeil(ausgang.psm ?? {}));
  if (art === "saatgut") teile.push(...saatgutTeil(ausgang.saatgut ?? {}, await kulturen(betrieb.id)));
  if (art === "tierarzneimittel") teile.push(...tamTeil(ausgang.tierarzneimittel ?? {}));
  if (art === "biozid") {
    teile.push(abschnitt("Biozid",
      textfeld({ pfad: "biozid/produktart", label: "Produktart", wert: ausgang.biozid?.produktart, vorschlaege: ["Rodentizid", "Desinfektionsmittel", "Insektizid (Stall)"] }),
      textfeld({ pfad: "biozid/registriernummer", label: "Registrier- bzw. Zulassungsnummer", wert: ausgang.biozid?.registriernummer })));
  }
  if (art === "futtermittel") {
    teile.push(abschnitt("Futtermittel",
      knopfauswahl({ pfad: "futtermittel/enthaelt_tierische_proteine", label: "Enthält verarbeitetes tierisches Protein?", wert: jaNeinWert(ausgang.futtermittel?.enthaelt_tierische_proteine), optionen: JA_NEIN })));
  }

  const form = formular(
    { abbrechen: () => gehe(`betriebsmittel?gruppe=${gruppeVon(art)}`), beimSpeichern: (f) => speichern(f, { alt, ausgang, betrieb }) },
    allgemeinTeil(ausgang, betrieb),
    ...teile,
    abschnitt("Notiz und Status",
      textbereich({ pfad: "notiz", label: "Notiz", wert: ausgang.notiz, maxlength: 2000 }),
      alt ? knopfauswahl({ pfad: "aktiv", label: "Wird das Mittel noch verwendet?", wert: alt.aktiv === false ? "nein" : "ja",
        optionen: [{ wert: "ja", text: "Ja" }, { wert: "nein", text: "Nein, nicht mehr", hilfe: "Bleibt für frühere Aufzeichnungen erhalten und steht unten in der Liste" }] }) : null),
  );
  ziel.append(form);
  verbindeRegisterLink(form);

  if (alt) {
    ziel.append(h("button", { class: "knopf knopf-gefahr", type: "button", onclick: async () => {
      if (!await bestaetige(`„${alt.name}“ wirklich löschen?`, { ja: "Löschen", gefahr: true, details: "Frühere Aufzeichnungen behalten Name und Zulassungsnummer." })) return;
      await daten.loeschen("betriebsmittel", alt.id);
      meldung(`„${alt.name}“ wurde gelöscht.`, "info");
      gehe(`betriebsmittel?gruppe=${gruppeVon(art)}`);
    } }, "Löschen"));
  }
}

/** Mitgelieferte Kulturen (rules/kulturen.json) und betriebseigene aus der Datenbank. */
async function kulturen(betriebId) {
  const [katalog, eigene] = await Promise.all([regeln.lade("kulturen"), daten.liste("kultur")]);
  const alle = new Map(katalog.werte.map((k) => [k.id, k]));
  for (const k of eigene) if (!k.betrieb_id || k.betrieb_id === betriebId) alle.set(k.id, k);
  return [...alle.values()].sort((a, b) => a.name.localeCompare(b.name, "de"));
}

// ---------- Formularteile ----------

function allgemeinTeil(b, betrieb) {
  const bio = ["bio", "umstellung"].includes(betrieb.bewirtschaftung);
  return abschnitt("Allgemein",
    textfeld({ pfad: "name", label: "Bezeichnung", wert: b.name, pflicht: true, maxlength: 120,
      hilfe: b.art === "psm" ? "Handelsname wie auf dem Etikett" : b.art === "saatgut" ? "z. B. „Winterweizen Sorte X, Z-Saatgut“" : null }),
    textfeld({ pfad: "hersteller", label: b.art === "psm" ? "Zulassungsinhaber bzw. Hersteller" : "Hersteller", wert: b.hersteller, maxlength: 120 }),
    textfeld({ pfad: "lieferant", label: "Bezugsquelle", wert: b.lieferant, maxlength: 120, hilfe: "Händler, Lagerhaus, Tierarzt oder Nachbarbetrieb" }),
    auswahl({ pfad: "grundeinheit", label: "Mengeneinheit", wert: b.grundeinheit, optionen: EINHEITEN, leer: "Nicht angegeben",
      hilfe: "In welcher Einheit Sie das Mittel einkaufen bzw. ausbringen" }),
    bio || b.bio_tauglich != null
      ? knopfauswahl({ pfad: "bio_tauglich", label: "Für die biologische Landwirtschaft zulässig?", wert: jaNeinWert(b.bio_tauglich), optionen: JA_NEIN,
        hilfe: "Laut Betriebsmittelkatalog für die biologische Landwirtschaft bzw. Bestätigung der Kontrollstelle" })
      : null);
}

function duengerTeil(b) {
  const d = b.duenger ?? {};
  const mineral = b.art === "mineralduenger";
  const bezug = d.bezug ?? (mineral ? "prozent" : b.grundeinheit === "t" ? "kg_je_t" : "kg_je_m3");
  const teile = [abschnitt("Nährstoffgehalte",
    auswahl({ pfad: "duenger/bezug", label: "Gehalte angegeben in", wert: bezug, optionen: BEZUG, pflicht: true, leer: null,
      hilfe: mineral ? "Mineraldünger: Prozent laut Sack" : "Gülle meist kg je m³, Mist meist kg je t" }),
    h("div", { class: "feldraster" },
      textfeld({ pfad: "duenger/n_gesamt", label: "N gesamt", wert: zw(d.n_gesamt), inputmode: "decimal", pflicht: true, maxlength: 12 }),
      mineral ? null : zahlenfeld("duenger/nh4_n", "davon NH₄-N", d.nh4_n),
      zahlenfeld("duenger/p2o5", "P₂O₅", d.p2o5),
      zahlenfeld("duenger/k2o", "K₂O", d.k2o),
      zahlenfeld("duenger/s", "Schwefel (S)", d.s),
      zahlenfeld("duenger/mgo", "MgO", d.mgo)),
    auswahl({ pfad: "duenger/gehalte_quelle", label: "Woher stammen die Werte?", wert: d.gehalte_quelle ?? (mineral ? "deklaration" : ""), optionen: GEHALTE_QUELLEN, leer: "Nicht angegeben" }),
    datumsfeld({ pfad: "duenger/analyse_datum", label: "Datum der Analyse", wert: d.analyse_datum, hilfe: "Nur bei Laboranalyse" }),
    mehr("Weitere Angaben",
      h("div", { class: "feldraster" },
        zahlenfeld("duenger/cao", "CaO", d.cao),
        zahlenfeld("duenger/trockenmasse_prozent", "Trockenmasse in %", d.trockenmasse_prozent),
        zahlenfeld("duenger/dichte_kg_je_l", "Dichte in kg/l", d.dichte_kg_je_l, "Für Flüssigdünger in Litern"))))];

  if (!mineral) {
    teile[0].append(auswahl({ pfad: "duenger/napv_typ", label: "Düngerart laut NAPV", wert: d.napv_typ, optionen: NAPV_TYPEN, leer: "Bitte wählen …",
      hilfe: "Bestimmt Löslichkeit, Ausbringungsverluste und jahreswirksamen Stickstoff (§ 1 Z 8, 9 und 14 NAPV)." }));
    const uebernahme = uebernahmeTeil(d.uebernahme ?? {});
    uebernahme.hidden = d.herkunft !== "uebernahme";
    teile.push(abschnitt("Herkunft",
      knopfauswahl({ pfad: "duenger/herkunft", label: "Woher kommt der Dünger?", wert: d.herkunft ?? "", optionen: HERKUNFT,
        hilfe: "Für die NAPV-Aufzeichnung: am Betrieb angefallen, übernommen oder abgegeben",
        beiAenderung: (e) => { uebernahme.hidden = e.target.value !== "uebernahme"; } }),
      textfeld({ pfad: "duenger/tierart_quelle", label: "Von welchen Tieren?", wert: d.tierart_quelle, vorschlaege: ["Rind", "Schwein", "Geflügel", "Schaf", "Ziege", "Pferd"] })),
    uebernahme);
  }
  return teile;
}

function uebernahmeTeil(u) {
  return abschnitt("Übernahme laut Düngerabgabevertrag",
    h("p", { class: "feld-hilfe" }, "Angaben aus Vertrag bzw. Lieferschein des abgebenden Betriebs. Den Nachweis aufbewahren – in Gebieten nach Anlage 5 NAPV 7 Jahre (§ 9 Abs. 3)."),
    textfeld({ pfad: "duenger/uebernahme/partner_name", label: "Abgebender Betrieb", wert: u.partner_name, pflicht: true, maxlength: 120 }),
    textfeld({ pfad: "duenger/uebernahme/partner_betriebsnummer", label: "Betriebsnummer (LFBIS)", wert: u.partner_betriebsnummer, inputmode: "numeric", maxlength: 7 }),
    textfeld({ pfad: "duenger/uebernahme/partner_adresse", label: "Adresse", wert: u.partner_adresse, maxlength: 200 }),
    datumsfeld({ pfad: "duenger/uebernahme/vertrag_datum", label: "Vertrag vom", wert: u.vertrag_datum }),
    h("div", { class: "feldraster" },
      datumsfeld({ pfad: "duenger/uebernahme/zeitraum_von", label: "Übernahme von", wert: u.zeitraum_von }),
      datumsfeld({ pfad: "duenger/uebernahme/zeitraum_bis", label: "bis", wert: u.zeitraum_bis })),
    h("div", { class: "feldraster" },
      zahlenfeld("duenger/uebernahme/menge/wert", "Menge", u.menge?.wert),
      auswahl({ pfad: "duenger/uebernahme/menge/einheit", label: "Einheit", wert: u.menge?.einheit ?? "m3", optionen: EINHEITEN.filter((e) => ["m3", "t", "kg", "l"].includes(e.wert)), leer: null })),
    h("div", { class: "feldraster" },
      zahlenfeld("duenger/uebernahme/n_kg", "Stickstoff gesamt (kg N)", u.n_kg),
      zahlenfeld("duenger/uebernahme/p2o5_kg", "Phosphor (kg P₂O₅)", u.p2o5_kg)),
    textfeld({ pfad: "duenger/uebernahme/beleg", label: "Vertrags- oder Lieferscheinnummer", wert: u.beleg, maxlength: 60 }));
}

function psmTeil(p) {
  const wirkstoffe = (p.wirkstoffe ?? []).map((w) => (typeof w === "string" ? { name: w } : w));
  return [
    h("div", { class: "hinweis hinweis-info quellenhinweis", "data-test": "psm-quelle" },
      h("p", {}, h("strong", {}, "Quelle: "), "Die Angaben stehen im Pflanzenschutzmittelregister des Bundesamts für Ernährungssicherheit (BAES) und auf dem Etikett. Bitte von dort übernehmen."),
      h("p", {}, h("a", { href: QUELLEN.psm_register, target: "_blank", rel: "noopener noreferrer" }, "Pflanzenschutzmittelregister öffnen ↗"),
        h("span", { class: "register-eintrag" })),
      h("p", { class: "klein" }, "Warum nicht automatisch? Das Register ist nicht als offene Daten freigegeben; laut Nutzungsbedingungen des BAES/der AGES ist das Speichern in anderen Datenbanken nur mit schriftlicher Zustimmung erlaubt (geprüft am 11.11.2026).")),
    abschnitt("Zulassung",
      textfeld({ pfad: "psm/zulassungsnummer", label: "Zulassungsnummer (Pfl. Reg. Nr.)", wert: p.zulassungsnummer, pflicht: true, maxlength: 30,
        hilfe: "Steht auf dem Etikett, z. B. „3067-0“. Parallelimporte haben eine eigene Nummer." }),
      mehrfachauswahl({ pfad: "psm/funktion", label: "Wirkungsbereich", werte: p.funktion ?? [], optionen: PSM_FUNKTIONEN.map((f) => ({ wert: f, text: f })) }),
      datumsfeld({ pfad: "psm/zulassung_gueltig_bis", label: "Zulassung gültig bis", wert: p.zulassung_gueltig_bis, hilfe: "Im Register „Ende der Zulassung“. Die App warnt 90 Tage vorher." }),
      datumsfeld({ pfad: "psm/aufbrauch_bis", label: "Aufbrauchfrist bis", wert: p.aufbrauch_bis, hilfe: "Nur ausfüllen, wenn die Zulassung endet und das Register eine Aufbrauchfrist nennt." }),
      datumsfeld({ pfad: "psm/register_stand", label: "Im Register nachgesehen am", wert: p.register_stand, hilfe: "Damit Sie wissen, wie aktuell die Angaben sind." })),
    wiederholung({ pfad: "psm/wirkstoffe", titel: "Wirkstoffe", eintraege: wirkstoffe.length ? wirkstoffe : [{}], zeilenName: "Wirkstoff", neuText: "Wirkstoff hinzufügen",
      felder: (w, pr) => [
        textfeld({ pfad: `${pr}/name`, label: "Wirkstoff", wert: w.name, maxlength: 120 }),
        h("div", { class: "feldraster" },
          zahlenfeld(`${pr}/gehalt`, "Gehalt", w.gehalt),
          textfeld({ pfad: `${pr}/einheit`, label: "Einheit", wert: w.einheit, vorschlaege: GEHALT_EINHEITEN, maxlength: 20 }))] }),
    abschnitt("Auflagen",
      knopfauswahl({ pfad: "psm/bienengefaehrlich", label: "Bienengefährlich?", wert: jaNeinWert(p.bienengefaehrlich), optionen: JA_NEIN,
        hilfe: "Auflage „SPe 8“ bzw. Hinweis „bienengefährlich“. Dann bei der Anwendung die Uhrzeit aufzeichnen und die Bienenschutzvorschriften des Landes beachten." }),
      wiederholung({ pfad: "psm/auflagen", titel: "Abstands- und andere Auflagen", eintraege: p.auflagen ?? [], zeilenName: "Auflage", neuText: "Auflage hinzufügen",
        hilfe: "Vor allem Abstände zu Gewässern und Nachbarflächen – die App kann später bei Schlägen am Gewässer warnen.",
        felder: (a, pr) => [
          auswahl({ pfad: `${pr}/art`, label: "Art", wert: a.art, optionen: AUFLAGEN_ARTEN, leer: "Bitte wählen …" }),
          textfeld({ pfad: `${pr}/code`, label: "Kürzel", wert: a.code, maxlength: 20, hilfe: "z. B. SPe 3" }),
          textbereich({ pfad: `${pr}/text`, label: "Wortlaut", wert: a.text, zeilen: 2, maxlength: 1000 }),
          h("div", { class: "feldraster" },
            zahlenfeld(`${pr}/abstand_m`, "Abstand in m", a.abstand_m),
            ganzzahlfeld(`${pr}/abdriftminderung_prozent`, "bei Abdriftminderung %", a.abdriftminderung_prozent, "leer = ohne"))] })),
    mehr("Zugelassene Anwendungen (Indikationen) – optional",
      h("p", { class: "feld-hilfe" }, "Nur die Anwendungen, die Sie brauchen – vor allem Aufwandmenge und Wartezeit. EPPO-Codes in Klammern, z. B. „Winterweichweizen (TRZAW)“, werden für die Aufzeichnung übernommen."),
      wiederholung({ pfad: "psm/indikationen", titel: "Indikationen", eintraege: p.indikationen ?? [], zeilenName: "Indikation", neuText: "Indikation hinzufügen", felder: indikationsFelder })),
    mehr("Weitere Angaben",
      textfeld({ pfad: "psm/formulierung", label: "Formulierung", wert: p.formulierung, maxlength: 80, vorschlaege: ["EC", "SC", "WG", "SL", "OD", "SE", "WP", "GR", "FS"] }),
      datumsfeld({ pfad: "psm/abverkauf_bis", label: "Abverkaufsfrist bis", wert: p.abverkauf_bis, hilfe: "Gilt für den Handel" }),
      knopfauswahl({ pfad: "psm/geringes_risiko", label: "Mittel mit geringem Risiko?", wert: jaNeinWert(p.geringes_risiko), optionen: JA_NEIN }),
      textfeld({ pfad: "psm/gefahrenhinweise", label: "Gefahrenhinweise (H-Sätze)", wert: (p.gefahrenhinweise ?? []).join(", "), maxlength: 300, hilfe: "Mit Komma getrennt, z. B. „H317, H411“" })),
  ];
}

function indikationsFelder(i, pr) {
  return [
    h("div", { class: "feldraster" }, textfeld({ pfad: `${pr}/nr`, label: "Nr. im Register", wert: i.nr, maxlength: 10, inputmode: "numeric" })),
    textbereich({ pfad: `${pr}/kulturen`, label: "Kulturen", wert: i.kulturen, zeilen: 2, maxlength: 1000 }),
    textbereich({ pfad: `${pr}/schaderreger`, label: "Schaderreger", wert: i.schaderreger, zeilen: 2, maxlength: 1000 }),
    h("div", { class: "feldraster" },
      zahlenfeld(`${pr}/aufwand/wert`, "Aufwandmenge (höchstens)", i.aufwand?.wert),
      auswahl({ pfad: `${pr}/aufwand/einheit`, label: "Einheit", wert: i.aufwand?.einheit, optionen: AUFWAND_EINHEITEN, leer: "–" })),
    h("div", { class: "feldraster" },
      zahlenfeld(`${pr}/wasser_l_je_ha_von`, "Wasser l/ha von", i.wasser_l_je_ha_von),
      zahlenfeld(`${pr}/wasser_l_je_ha_bis`, "bis", i.wasser_l_je_ha_bis)),
    h("div", { class: "feldraster" },
      ganzzahlfeld(`${pr}/bbch_von`, "BBCH von", i.bbch_von),
      ganzzahlfeld(`${pr}/bbch_bis`, "BBCH bis", i.bbch_bis)),
    h("div", { class: "feldraster" },
      ganzzahlfeld(`${pr}/max_anwendungen`, "Anwendungen höchstens", i.max_anwendungen),
      ganzzahlfeld(`${pr}/abstand_tage`, "Abstand in Tagen", i.abstand_tage)),
    h("div", { class: "feldraster" },
      ganzzahlfeld(`${pr}/wartezeit_tage`, "Wartezeit in Tagen", i.wartezeit_tage, "Bis zur Ernte"),
      textfeld({ pfad: `${pr}/wartezeit_hinweis`, label: "oder Hinweis", wert: i.wartezeit_hinweis, maxlength: 120, vorschlaege: ["F – durch Anwendungszeitpunkt abgedeckt", "Keine Wartezeit erforderlich"] })),
  ];
}

function saatgutTeil(s, kult) {
  return [
    abschnitt("Saatgut",
      h("p", { class: "klein" }, "Zugelassene Sorten: ", h("a", { href: QUELLEN.sortenliste, target: "_blank", rel: "noopener noreferrer" }, "Österreichische Sortenliste (BAES) ↗")),
      auswahl({ pfad: "saatgut/kultur_id", label: "Kultur", wert: s.kultur_id, optionen: kult.map((k) => ({ wert: k.id, text: k.name })), leer: "Nicht angegeben" }),
      textfeld({ pfad: "saatgut/sorte", label: "Sorte", wert: s.sorte, maxlength: 80 }),
      auswahl({ pfad: "saatgut/kategorie", label: "Kategorie", wert: s.kategorie, optionen: SAATGUT_KATEGORIEN, leer: "Nicht angegeben" }),
      knopfauswahl({ pfad: "saatgut/bio", label: "Bio-Saatgut?", wert: jaNeinWert(s.bio), optionen: JA_NEIN }),
      knopfauswahl({ pfad: "saatgut/gebeizt", label: "Gebeizt?", wert: jaNeinWert(s.gebeizt), optionen: JA_NEIN }),
      textfeld({ pfad: "saatgut/beizmittel", label: "Beizmittel", wert: s.beizmittel, maxlength: 120, hilfe: "Name und Zulassungsnummer, wenn bekannt" })),
    mehr("Weitere Angaben",
      h("div", { class: "feldraster" },
        zahlenfeld("saatgut/tkg_g", "TKG in g", s.tkg_g),
        zahlenfeld("saatgut/keimfaehigkeit_prozent", "Keimfähigkeit %", s.keimfaehigkeit_prozent)),
      textfeld({ pfad: "saatgut/partie", label: "Partie- bzw. Etikettennummer", wert: s.partie, maxlength: 60 })),
  ];
}

function tamTeil(t) {
  return [
    h("div", { class: "hinweis hinweis-info quellenhinweis" },
      h("p", {}, "Zulassungsnummer und Wartezeiten stehen auf der Packung, in der Fachinformation und auf dem Abgabebeleg des Tierarztes."),
      h("p", {}, h("a", { href: QUELLEN.tam_register, target: "_blank", rel: "noopener noreferrer" }, "Arzneispezialitätenregister (BASG) öffnen ↗")),
      h("p", { class: "klein" }, "Legt der Tierarzt bei einer Behandlung eine andere Wartezeit fest (z. B. bei Umwidmung), gilt diese – sie wird bei der Behandlung eingetragen.")),
    abschnitt("Tierarzneimittel",
      textfeld({ pfad: "tierarzneimittel/zulassungsnummer", label: "Zulassungsnummer", wert: t.zulassungsnummer, maxlength: 40 }),
      textfeld({ pfad: "tierarzneimittel/wirkstoffe", label: "Wirkstoffe", wert: (t.wirkstoffe ?? []).join(", "), maxlength: 300, hilfe: "Mit Komma getrennt" }),
      textfeld({ pfad: "tierarzneimittel/darreichungsform", label: "Darreichungsform", wert: t.darreichungsform, maxlength: 80, vorschlaege: ["Injektionslösung", "Euterinjektor", "Trockensteller", "Bolus", "Pulver zum Eingeben", "Salbe", "Aufgusslösung (Pour-on)"] }),
      textfeld({ pfad: "tierarzneimittel/anwendungsart", label: "Anwendungsart", wert: t.anwendungsart, maxlength: 80, vorschlaege: ["intramuskulär", "intravenös", "subkutan", "intramammär", "oral", "äußerlich"] }),
      knopfauswahl({ pfad: "tierarzneimittel/verschreibungspflichtig", label: "Rezept- bzw. tierarztpflichtig?", wert: jaNeinWert(t.verschreibungspflichtig), optionen: JA_NEIN })),
    wiederholung({ pfad: "tierarzneimittel/wartezeiten", titel: "Wartezeiten", eintraege: t.wartezeiten ?? [], zeilenName: "Wartezeit", neuText: "Wartezeit hinzufügen",
      hilfe: "Je Tierart und Lebensmittel. 0 Tage eintragen, wenn keine Wartezeit gilt.",
      felder: (w, pr) => [
        textfeld({ pfad: `${pr}/tierart`, label: "Tierart", wert: w.tierart, vorschlaege: TIERARTEN, maxlength: 40 }),
        h("div", { class: "feldraster" },
          auswahl({ pfad: `${pr}/produkt`, label: "Lebensmittel", wert: w.produkt, optionen: PRODUKTE, leer: "Bitte wählen …" }),
          ganzzahlfeld(`${pr}/tage`, "Tage", w.tage))] }),
  ];
}

/** Zeigt neben dem Register-Link einen Direktlink auf den Eintrag zur eingegebenen Nummer. */
function verbindeRegisterLink(form) {
  const feld = form.querySelector('[name="psm/zulassungsnummer"]');
  const ziel = form.querySelector(".register-eintrag");
  if (!feld || !ziel) return;
  const aktualisiere = () => {
    const nr = feld.value.trim();
    ziel.replaceChildren(...(nr ? [" · ", h("a", { href: QUELLEN.psm_eintrag(nr), target: "_blank", rel: "noopener noreferrer", "data-test": "register-eintrag" }, `Eintrag ${nr} ansehen ↗`)] : []));
  };
  feld.addEventListener("input", aktualisiere);
  aktualisiere();
}

// ---------- Speichern ----------

function lese(form, ausgang) {
  const w = werte(form);
  const bm = structuredClone(ausgang);
  uebernimm(bm, "name", w, "name");
  uebernimm(bm, "hersteller", w, "hersteller");
  uebernimm(bm, "lieferant", w, "lieferant");
  uebernimm(bm, "grundeinheit", w, "grundeinheit");
  uebernimm(bm, "bio_tauglich", w, "bio_tauglich", jaNeinAus);
  uebernimm(bm, "notiz", w, "notiz");
  if ("aktiv" in w) bm.aktiv = w.aktiv !== "nein";

  if (DUENGER_ARTEN.includes(bm.art)) {
    const d = { ...(bm.duenger ?? {}) };
    for (const k of ["bezug", "gehalte_quelle", "analyse_datum", "herkunft", "tierart_quelle", "napv_typ"]) uebernimm(d, k, w, `duenger/${k}`);
    if (bm.art === "mineralduenger") d.napv_typ = "mineralisch";
    for (const k of ["n_gesamt", "nh4_n", "p2o5", "k2o", "s", "mgo", "cao", "trockenmasse_prozent", "dichte_kg_je_l"]) uebernimm(d, k, w, `duenger/${k}`, zahlAus);
    if (d.herkunft === "uebernahme") {
      const u = {};
      for (const k of ["partner_name", "partner_betriebsnummer", "partner_adresse", "vertrag_datum", "zeitraum_von", "zeitraum_bis", "beleg"]) uebernimm(u, k, w, `duenger/uebernahme/${k}`);
      for (const k of ["n_kg", "p2o5_kg"]) uebernimm(u, k, w, `duenger/uebernahme/${k}`, zahlAus);
      const menge = zahlAus(w["duenger/uebernahme/menge/wert"]);
      if (menge !== undefined) u.menge = { wert: menge, einheit: w["duenger/uebernahme/menge/einheit"] || "m3" };
      if (Object.keys(u).length) d.uebernahme = u;
      else delete d.uebernahme;
    } else delete d.uebernahme;
    bm.duenger = d;
  }

  if (bm.art === "psm") {
    const p = { ...(bm.psm ?? {}) };
    for (const k of ["zulassungsnummer", "formulierung", "zulassung_gueltig_bis", "abverkauf_bis", "aufbrauch_bis", "register_stand"]) uebernimm(p, k, w, `psm/${k}`);
    uebernimm(p, "funktion", w, "psm/funktion");
    uebernimm(p, "bienengefaehrlich", w, "psm/bienengefaehrlich", jaNeinAus);
    uebernimm(p, "geringes_risiko", w, "psm/geringes_risiko", jaNeinAus);
    uebernimm(p, "gefahrenhinweise", w, "psm/gefahrenhinweise", liste);
    p.wirkstoffe = leseWiederholung(form, "psm/wirkstoffe").map((x) => ohneLeere({ name: x.name, gehalt: zahlAus(x.gehalt), einheit: x.einheit }));
    p.auflagen = leseWiederholung(form, "psm/auflagen").map((x) => ohneLeere({
      art: x.art, code: x.code, text: x.text, abstand_m: zahlAus(x.abstand_m), abdriftminderung_prozent: zahlAus(x.abdriftminderung_prozent),
    }));
    p.indikationen = leseWiederholung(form, "psm/indikationen").map((x) => {
      const ind = ohneLeere({
        nr: x.nr, kulturen: x.kulturen, schaderreger: x.schaderreger,
        wasser_l_je_ha_von: zahlAus(x.wasser_l_je_ha_von), wasser_l_je_ha_bis: zahlAus(x.wasser_l_je_ha_bis),
        max_anwendungen: zahlAus(x.max_anwendungen), abstand_tage: zahlAus(x.abstand_tage),
        bbch_von: zahlAus(x.bbch_von), bbch_bis: zahlAus(x.bbch_bis),
        wartezeit_tage: zahlAus(x.wartezeit_tage), wartezeit_hinweis: x.wartezeit_hinweis,
      });
      const aufwand = zahlAus(x["aufwand/wert"]);
      if (aufwand !== undefined || x["aufwand/einheit"]) ind.aufwand = ohneLeere({ wert: aufwand, einheit: x["aufwand/einheit"] });
      const codes = eppoCodes(x.kulturen);
      if (codes.length) ind.eppo_codes = codes;
      return ind;
    });
    for (const k of ["wirkstoffe", "auflagen", "indikationen"]) if (!p[k].length) delete p[k];
    bm.psm = p;
  }

  const unterobjekt = (schluessel, bauen) => {
    const o = { ...(bm[schluessel] ?? {}) };
    bauen(o);
    if (Object.keys(o).length) bm[schluessel] = o;
    else delete bm[schluessel];
  };
  if (bm.art === "saatgut") unterobjekt("saatgut", (s) => {
    for (const k of ["kultur_id", "sorte", "kategorie", "beizmittel", "partie"]) uebernimm(s, k, w, `saatgut/${k}`);
    for (const k of ["bio", "gebeizt"]) uebernimm(s, k, w, `saatgut/${k}`, jaNeinAus);
    for (const k of ["tkg_g", "keimfaehigkeit_prozent"]) uebernimm(s, k, w, `saatgut/${k}`, zahlAus);
  });
  if (bm.art === "tierarzneimittel") unterobjekt("tierarzneimittel", (t) => {
    for (const k of ["zulassungsnummer", "darreichungsform", "anwendungsart"]) uebernimm(t, k, w, `tierarzneimittel/${k}`);
    uebernimm(t, "wirkstoffe", w, "tierarzneimittel/wirkstoffe", liste);
    uebernimm(t, "verschreibungspflichtig", w, "tierarzneimittel/verschreibungspflichtig", jaNeinAus);
    const wz = leseWiederholung(form, "tierarzneimittel/wartezeiten").map((x) => ohneLeere({ tierart: x.tierart, produkt: x.produkt, tage: zahlAus(x.tage) }));
    if (wz.length) t.wartezeiten = wz;
    else delete t.wartezeiten;
  });
  if (bm.art === "biozid") unterobjekt("biozid", (b) => {
    for (const k of ["registriernummer", "produktart"]) uebernimm(b, k, w, `biozid/${k}`);
  });
  if (bm.art === "futtermittel") unterobjekt("futtermittel", (f) => uebernimm(f, "enthaelt_tierische_proteine", w, "futtermittel/enthaelt_tierische_proteine", jaNeinAus));
  return bm;
}

/** Gibt es schon ein (aktives) Betriebsmittel mit gleichem Namen bzw. gleicher Zulassungsnummer? */
async function dublette(bm) {
  const { mittel } = await ladeMitVerwendung(bm.betrieb_id);
  const n = (t) => String(t ?? "").trim().toLowerCase();
  return mittel.find((m) => m.id !== bm.id && m.aktiv !== false && m.art === bm.art &&
    (n(m.name) === n(bm.name) || (bm.psm?.zulassungsnummer && n(m.psm?.zulassungsnummer) === n(bm.psm.zulassungsnummer))));
}

async function speichern(form, { alt, ausgang }) {
  const bm = lese(form, ausgang);
  const fachlich = pruefeFachlich(bm);
  if (fachlich.length) return zeigeFehler(form, fachlich, FEHLERTEXTE);
  if (!alt) {
    const gleich = await dublette(bm);
    if (gleich && !await bestaetige(`„${gleich.name}“${gleich.psm ? ` (Reg.-Nr. ${gleich.psm.zulassungsnummer})` : ""} gibt es schon. Trotzdem neu anlegen?`, { ja: "Trotzdem anlegen" })) return;
  }
  try {
    const gespeichert = await daten.speichern("betriebsmittel", bm);
    const s = gespeichert.art === "psm" ? psmStatus(gespeichert) : null;
    if (s && ["abgelaufen", "aufbrauchen", "bald"].includes(s.stufe)) meldung(`Gespeichert. Achtung: ${s.text}.`, "warnung", 9000);
    else meldung(`„${gespeichert.name}“ gespeichert.`, "erfolg");
    gehe(`betriebsmittel?gruppe=${gruppeVon(gespeichert.art)}`);
  } catch (e) {
    if (e.name !== "ValidierungsFehler") throw e;
    zeigeFehler(form, e.fehler, FEHLERTEXTE);
  }
}

