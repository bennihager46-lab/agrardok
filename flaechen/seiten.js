// Seiten „Flächen“ (Übersicht je Jahr, Karte), „Feldstück“ und „Schlag“.

import * as daten from "../core/daten.js";
import * as regeln from "../core/regeln.js";
import { gehe, parameter } from "../core/router.js";
import { h, karte as kartenKarte, meldung, bestaetige } from "../core/ui/dom.js";
import { textfeld, auswahl, formular, abschnitt, werte, zeigeFehler } from "../core/ui/formular.js";
import { zeigeKarte } from "../core/ui/karte.js";
import { aktiverBetrieb } from "../core/betrieb.js";
import { kulturen, stelleKatalogSicher, KATEGORIEN } from "./katalog.js";
import { napvPflicht } from "./napv.js";

export const NUTZUNGSARTEN = [
  { wert: "acker", text: "Acker" }, { wert: "gruenland", text: "Grünland" }, { wert: "dauerkultur", text: "Dauerkultur (Wein, Obst …)" },
  { wert: "alm", text: "Alm" }, { wert: "sonstige", text: "Sonstige" },
];
const BODENARTEN = [
  ["sand", "Sand"], ["lehmiger_sand", "Lehmiger Sand"], ["sandiger_lehm", "Sandiger Lehm"], ["lehm", "Lehm"],
  ["schluffiger_lehm", "Schluffiger Lehm"], ["schluff", "Schluff"], ["toniger_lehm", "Toniger Lehm"], ["lehmiger_ton", "Lehmiger Ton"],
  ["ton", "Ton"], ["moor", "Moor"],
].map(([wert, text]) => ({ wert, text }));
const BODENSCHWERE = [{ wert: "leicht", text: "Leicht" }, { wert: "mittel", text: "Mittel" }, { wert: "schwer", text: "Schwer" }];
const ERTRAGSLAGEN = [
  { wert: "niedrig", text: "Niedrig" }, { wert: "mittel", text: "Mittel" },
  { wert: "hoch_1", text: "Hoch 1" }, { wert: "hoch_2", text: "Hoch 2" }, { wert: "hoch_3", text: "Hoch 3" },
];
const text = (liste, w) => liste.find((e) => e.wert === w)?.text ?? "–";
const ha = (z) => `${Number(z ?? 0).toLocaleString("de-AT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ha`;
const zahl = (s) => (s === "" || s == null ? undefined : Number(String(s).replace(",", ".")));
export const aktuellesJahr = () => new Date().getFullYear();
/** „3 · Hausacker“ bzw. nur „Feldstück 3“, wenn es noch keinen eigenen Namen gibt (z. B. nach Import). */
export const fsBezeichnung = (fs) => (!fs.nummer || fs.name === `Feldstück ${fs.nummer}` ? fs.name : `${fs.nummer} · ${fs.name}`);

function ohneBetrieb(ziel) {
  ziel.append(kartenKarte("Zuerst den Betrieb einrichten",
    h("p", {}, "Flächen gehören zu einem Betrieb. Bitte legen Sie zuerst die Betriebsdaten an."),
    h("a", { class: "knopf", href: "#/betrieb-bearbeiten" }, "Betrieb einrichten")));
}

async function ladeBestand(betrieb) {
  const [feldstuecke, schlaege, kult] = await Promise.all([
    daten.liste("feldstueck", { index: "betrieb_id", wert: betrieb.id }),
    daten.liste("schlag", { index: "betrieb_id", wert: betrieb.id }),
    kulturen(betrieb.id),
  ]);
  feldstuecke.sort((a, b) => (a.nummer ?? 9999) - (b.nummer ?? 9999) || a.name.localeCompare(b.name, "de"));
  return { feldstuecke, schlaege, kulturen: kult };
}

// ---------- Übersicht ----------

export async function renderFlaechen(ziel) {
  ziel.append(h("h1", {}, "Flächen"));
  const betrieb = await aktiverBetrieb();
  if (!betrieb) return ohneBetrieb(ziel);
  await stelleKatalogSicher();
  const jahr = Number(parameter().get("jahr")) || aktuellesJahr();
  const { feldstuecke, schlaege, kulturen: kult } = await ladeBestand(betrieb);
  const kulturVon = new Map(kult.map((k) => [k.id, k]));
  const imJahr = schlaege.filter((s) => s.jahr === jahr);

  ziel.append(
    h("nav", { class: "jahreswahl", "aria-label": "Antragsjahr" },
      h("a", { class: "knopf knopf-zweit knopf-klein", href: `#/flaechen?jahr=${jahr - 1}`, "aria-label": `Jahr ${jahr - 1}` }, "◀"),
      h("strong", { "data-test": "jahr" }, `Jahr ${jahr}`),
      h("a", { class: "knopf knopf-zweit knopf-klein", href: `#/flaechen?jahr=${jahr + 1}`, "aria-label": `Jahr ${jahr + 1}` }, "▶")),
    h("div", { class: "knopfreihe" },
      h("a", { class: "knopf", href: `#/flaechen-import?jahr=${jahr}`, "data-test": "import-start" }, "Aus eAMA importieren"),
      h("a", { class: "knopf knopf-zweit", href: "#/feldstueck?neu=1" }, "Feldstück anlegen")),
  );

  if (!feldstuecke.length) {
    ziel.append(kartenKarte("Noch keine Flächen",
      h("p", {}, "Am schnellsten geht es mit dem Import aus eAMA: Dort unter „Extras → GIS Datenexport“ die Feldstücke bzw. Schläge als Shapefile herunterladen und hier einlesen."),
      h("p", {}, "Alternativ legen Sie Feldstücke und Schläge von Hand an.")));
    return;
  }

  // NAPV-Hinweis
  if (imJahr.length) {
    const regel = await regeln.lade("napv/aufzeichnungspflicht");
    const fsVon = new Map(feldstuecke.map((f) => [f.id, f]));
    const n = napvPflicht({
      regel, anlage5: betrieb.napv_gebiet_anlage5,
      schlaege: imJahr.map((s) => ({ flaeche_ha: s.flaeche_ha, kategorie: kulturVon.get(s.kultur_id)?.kategorie, alm: fsVon.get(s.feldstueck_id)?.nutzungsart === "alm" })),
    });
    ziel.append(h("p", { class: `hinweis ${n.pflicht ? "hinweis-warnung" : "hinweis-info"}`, "data-test": "napv-hinweis" },
      h("strong", {}, n.pflicht ? "Düngeaufzeichnungen nach NAPV sind Pflicht. " : "Voraussichtlich keine Pflicht zu NAPV-Düngeaufzeichnungen. "),
      n.begruendung, " (Hinweis, keine Rechtsauskunft.)"));
  }

  // Vorjahr übernehmen
  const ohneSchlag = feldstuecke.filter((f) => !imJahr.some((s) => s.feldstueck_id === f.id));
  const vorjahr = schlaege.filter((s) => s.jahr === jahr - 1 && ohneSchlag.some((f) => f.id === s.feldstueck_id));
  if (vorjahr.length) {
    ziel.append(h("button", { class: "knopf knopf-zweit", type: "button", "data-test": "vorjahr-uebernehmen", onclick: async (e) => {
      e.currentTarget.disabled = true;
      for (const s of vorjahr) {
        const k = kulturVon.get(s.kultur_id);
        const { id, erstellt_am, erstellt_von, geaendert_am, geaendert_von, geraet_id, hlc, rev, invekos, vorfrucht_kultur_id, vorfrucht_name, ertragslage, ...rest } = s;
        await daten.speichern("schlag", { ...rest, jahr, vorfrucht_kultur_id: s.kultur_id, ...(k ? { vorfrucht_name: k.name } : {}) });
      }
      meldung(`${vorjahr.length} Schläge aus ${jahr - 1} übernommen – bitte die Kulturen für ${jahr} anpassen.`, "erfolg", 9000);
      gehe(`flaechen?jahr=${jahr}`);
    } }, `Schläge aus ${jahr - 1} übernehmen (${vorjahr.length})`));
  }

  // Liste
  const liste = h("ul", { class: "flaechenliste", "data-test": "flaechenliste" });
  for (const fs of feldstuecke) {
    const sl = imJahr.filter((s) => s.feldstueck_id === fs.id).sort((a, b) => (a.nummer ?? 0) - (b.nummer ?? 0));
    const summe = sl.reduce((s, x) => s + x.flaeche_ha, 0);
    liste.append(h("li", { class: "feldstueck-eintrag" },
      h("a", { href: `#/feldstueck?id=${fs.id}`, class: "feldstueck-kopf" },
        h("strong", {}, fsBezeichnung(fs)),
        h("span", {}, `${text(NUTZUNGSARTEN, fs.nutzungsart)} · ${ha(fs.flaeche_ha)}`)),
      sl.length ? h("ul", { class: "schlagliste" }, sl.map((s) => h("li", {},
        h("a", { href: `#/schlag?id=${s.id}` },
          h("span", {}, `Schlag ${s.nummer ?? "–"}: ${kulturVon.get(s.kultur_id)?.name ?? "?"}`),
          h("span", {}, ha(s.flaeche_ha)),
          s.vorfrucht_name ? h("small", {}, `Vorfrucht: ${s.vorfrucht_name}`) : null)))) : h("p", { class: "klein" }, `Keine Schläge für ${jahr}.`),
      summe > fs.flaeche_ha * 1.001 ? h("p", { class: "hinweis hinweis-warnung" }, `Die Schläge (${ha(summe)}) sind größer als das Feldstück (${ha(fs.flaeche_ha)}).`) : null,
      h("a", { class: "knopf knopf-zweit knopf-klein", href: `#/schlag?feldstueck=${fs.id}&jahr=${jahr}` }, "+ Schlag")));
  }
  const summeFs = feldstuecke.reduce((s, f) => s + f.flaeche_ha, 0);
  ziel.append(h("p", { class: "summe-zeile" }, `${feldstuecke.length} Feldstücke · ${ha(summeFs)} · ${imJahr.length} Schläge in ${jahr}`), liste);

  // Karte (nur auf Wunsch, spart Datenvolumen)
  const kartenBereich = h("div", { class: "karte-bereich" });
  ziel.append(h("button", { class: "knopf knopf-zweit", type: "button", "data-test": "karte-zeigen", onclick: async (e) => {
    e.currentTarget.remove();
    const ebenen = [
      ...feldstuecke.map((f) => ({ geometrie: f.geometrie, art: "feldstueck", titel: fsBezeichnung(f), beimTippen: () => gehe(`feldstueck?id=${f.id}`) })),
      ...imJahr.map((s) => ({ geometrie: s.geometrie, art: "schlag", titel: `Schlag ${s.nummer}: ${kulturVon.get(s.kultur_id)?.name ?? ""}`, beimTippen: () => gehe(`schlag?id=${s.id}`) })),
    ];
    if (!ebenen.some((x) => x.geometrie)) {
      kartenBereich.append(h("p", { class: "hinweis" }, "Für diese Flächen sind keine Umrisse gespeichert. Umrisse kommen mit dem Import aus eAMA."));
      return;
    }
    try { await zeigeKarte(kartenBereich, { ebenen }); } catch (err) { kartenBereich.append(h("p", { class: "hinweis hinweis-fehler" }, err.message)); }
  } }, "Karte anzeigen"), kartenBereich);
}

// ---------- Feldstück ----------

const FS_TEXTE = {
  name: { required: "Bitte einen Namen eintragen.", minLength: "Bitte einen Namen eintragen." },
  nutzungsart: { required: "Bitte die Nutzungsart wählen.", enum: "Bitte die Nutzungsart wählen." },
  flaeche_ha: { required: "Bitte die Fläche in Hektar eintragen.", type: "Bitte eine Zahl eintragen, z. B. 2,35." },
  nummer: { type: "Bitte eine ganze Zahl eintragen.", minimum: "Die Nummer muss mindestens 1 sein." },
  hangneigung_prozent: { type: "Bitte eine Zahl eintragen.", maximum: "Höchstens 100 %." },
  gewaesser_abstand_m: { type: "Bitte eine Zahl in Metern eintragen." },
};

export async function renderFeldstueck(ziel) {
  const betrieb = await aktiverBetrieb();
  if (!betrieb) return ohneBetrieb(ziel);
  const id = parameter().get("id");
  const alt = id ? await daten.hole("feldstueck", id) : null;
  ziel.append(h("h1", {}, alt ? fsBezeichnung(alt) : "Feldstück anlegen"));
  const ja = (w) => (w === true ? "ja" : w === false ? "nein" : "");

  const form = formular(
    { abbrechen: () => gehe("flaechen"), beimSpeichern: (f) => speichereFeldstueck(f, alt, betrieb) },
    abschnitt("Feldstück",
      h("div", { class: "feldreihe" },
        textfeld({ pfad: "nummer", label: "Nr.", wert: alt?.nummer, inputmode: "numeric", maxlength: 5 }),
        textfeld({ pfad: "name", label: "Name", wert: alt?.name, pflicht: true, maxlength: 80, hilfe: null })),
      auswahl({ pfad: "nutzungsart", label: "Nutzungsart", wert: alt?.nutzungsart, optionen: NUTZUNGSARTEN, pflicht: true }),
      textfeld({ pfad: "flaeche_ha", label: "Fläche (ha)", wert: alt?.flaeche_ha?.toLocaleString("de-AT", { maximumFractionDigits: 4 }), pflicht: true, inputmode: "decimal" }),
      textfeld({ pfad: "katastralgemeinde", label: "Katastralgemeinde", wert: alt?.katastralgemeinde })),
    abschnitt("Boden und Lage",
      auswahl({ pfad: "bodenart", label: "Bodenart", wert: alt?.bodenart, optionen: BODENARTEN, leer: "Nicht angegeben",
        hilfe: "Aus Bodenuntersuchung oder der digitalen Bodenkarte (eBOD)." }),
      auswahl({ pfad: "bodenschwere", label: "Bodenschwere", wert: alt?.bodenschwere, optionen: BODENSCHWERE, leer: "Nicht angegeben" }),
      textfeld({ pfad: "hangneigung_prozent", label: "Hangneigung (%)", wert: alt?.hangneigung_prozent?.toLocaleString("de-AT"), inputmode: "decimal",
        hilfe: "Durchschnittliche Neigung; wichtig u. a. für Abstandsauflagen bei der Düngung." }),
      auswahl({ pfad: "grenzt_an_gewaesser", label: "Grenzt an ein Gewässer (Bach, Graben, Teich)?", wert: ja(alt?.grenzt_an_gewaesser),
        optionen: [{ wert: "ja", text: "Ja" }, { wert: "nein", text: "Nein" }], leer: "Nicht angegeben" }),
      textfeld({ pfad: "gewaesser_abstand_m", label: "Abstand zum nächsten Gewässer (m)", wert: alt?.gewaesser_abstand_m?.toLocaleString("de-AT"), inputmode: "decimal",
        hilfe: "Kleinster Abstand; 0, wenn das Feldstück angrenzt." })),
  );
  ziel.append(form);
  if (alt?.invekos?.fs_kennung) ziel.append(h("p", { class: "klein" }, `Aus eAMA importiert (Kennung ${alt.invekos.fs_kennung}). Beim nächsten Import wird dieses Feldstück wiedererkannt; Name, Boden und Lage bleiben erhalten.`));
  if (alt) {
    ziel.append(h("button", { class: "knopf knopf-gefahr", type: "button", onclick: async () => {
      const schlaege = (await daten.liste("schlag", { index: "feldstueck_id", wert: alt.id }));
      const frage = schlaege.length
        ? `Feldstück „${alt.name}“ mit ${schlaege.length} Schlägen entfernen? Bestehende Aufzeichnungen bleiben erhalten.`
        : `Feldstück „${alt.name}“ entfernen?`;
      if (!await bestaetige(frage, { ja: "Entfernen", gefahr: true })) return;
      for (const s of schlaege) await daten.loeschen("schlag", s.id);
      await daten.loeschen("feldstueck", alt.id);
      meldung(`Feldstück „${alt.name}“ entfernt.`, "info");
      gehe("flaechen");
    } }, "Feldstück entfernen"));
  }
}

async function speichereFeldstueck(form, alt, betrieb) {
  const w = werte(form);
  const fs = { ...(alt ?? {}), betrieb_id: alt?.betrieb_id ?? betrieb.id };
  const setze = (feld, wert) => { if (wert === "" || wert === undefined || Number.isNaN(wert)) delete fs[feld]; else fs[feld] = wert; };
  const zahlOderText = (s) => { const z = zahl(s); return z === undefined ? "" : Number.isNaN(z) ? s : z; }; // Text → Typfehler aus dem Schema
  setze("nummer", zahlOderText(w.nummer));
  setze("name", w.name);
  setze("nutzungsart", w.nutzungsart);
  setze("flaeche_ha", zahlOderText(w.flaeche_ha));
  setze("katastralgemeinde", w.katastralgemeinde);
  setze("bodenart", w.bodenart);
  setze("bodenschwere", w.bodenschwere);
  setze("hangneigung_prozent", zahlOderText(w.hangneigung_prozent));
  setze("grenzt_an_gewaesser", w.grenzt_an_gewaesser === "ja" ? true : w.grenzt_an_gewaesser === "nein" ? false : "");
  setze("gewaesser_abstand_m", zahlOderText(w.gewaesser_abstand_m));
  try {
    const g = await daten.speichern("feldstueck", fs);
    meldung(`Feldstück „${g.name}“ gespeichert.`, "erfolg");
    gehe("flaechen");
  } catch (e) {
    if (e.name !== "ValidierungsFehler") throw e;
    zeigeFehler(form, e.fehler, FS_TEXTE);
  }
}

// ---------- Schlag ----------

const SL_TEXTE = {
  flaeche_ha: { required: "Bitte die Fläche in Hektar eintragen.", type: "Bitte eine Zahl eintragen, z. B. 2,35." },
  kultur_id: { required: "Bitte die Kultur wählen.", pattern: "Bitte die Kultur wählen." },
  nummer: { type: "Bitte eine ganze Zahl eintragen.", minimum: "Die Nummer muss mindestens 1 sein." },
};

export async function renderSchlag(ziel) {
  const betrieb = await aktiverBetrieb();
  if (!betrieb) return ohneBetrieb(ziel);
  const p = parameter();
  const alt = p.get("id") ? await daten.hole("schlag", p.get("id")) : null;
  const fsId = alt?.feldstueck_id ?? p.get("feldstueck");
  const jahr = alt?.jahr ?? (Number(p.get("jahr")) || aktuellesJahr());
  const [fs, kult, alleSchlaege] = await Promise.all([daten.hole("feldstueck", fsId), kulturen(betrieb.id), daten.liste("schlag", { index: "feldstueck_id", wert: fsId })]);
  if (!fs) {
    ziel.append(h("h1", {}, "Feldstück nicht gefunden"), h("a", { class: "knopf", href: "#/flaechen" }, "Zu den Flächen"));
    return;
  }
  const geschwister = alleSchlaege.filter((s) => s.jahr === jahr && s.id !== alt?.id);
  const vorjahr = alleSchlaege.filter((s) => s.jahr === jahr - 1);
  const vorschlagVorfrucht = !alt && vorjahr.length === 1 ? vorjahr[0].kultur_id : null;
  const naechsteNummer = Math.max(0, ...geschwister.map((s) => s.nummer ?? 0)) + 1;
  const restflaeche = Math.max(0, fs.flaeche_ha - geschwister.reduce((s, x) => s + x.flaeche_ha, 0));

  ziel.append(h("h1", {}, alt ? `Schlag ${alt.nummer ?? ""} (${jahr})` : `Schlag anlegen (${jahr})`),
    h("p", { class: "einleitung" }, `${fsBezeichnung(fs)} · ${ha(fs.flaeche_ha)}`));
  const kulturOptionen = kult.filter((k) => k.kategorie !== "zwischenfrucht")
    .map((k) => ({ wert: k.id, text: k.name, gruppe: k.kategorie }));
  const kulturGruppen = KATEGORIEN;

  const form = formular(
    { abbrechen: () => gehe(`flaechen?jahr=${jahr}`), beimSpeichern: (f) => speichereSchlag(f, alt, { betrieb, fs, jahr, kult, geschwister }) },
    abschnitt("Schlag",
      h("div", { class: "feldreihe" },
        textfeld({ pfad: "nummer", label: "Nr.", wert: alt?.nummer ?? naechsteNummer, inputmode: "numeric", maxlength: 4 }),
        textfeld({ pfad: "flaeche_ha", label: "Fläche (ha)", wert: (alt?.flaeche_ha ?? (geschwister.length ? "" : restflaeche || ""))?.toLocaleString?.("de-AT", { maximumFractionDigits: 4 }) ?? "", pflicht: true, inputmode: "decimal" })),
      auswahl({ pfad: "kultur_id", label: `Kultur ${jahr}`, wert: alt?.kultur_id, optionen: kulturOptionen, gruppen: kulturGruppen, pflicht: true }),
      auswahl({ pfad: "vorfrucht_kultur_id", label: "Vorfrucht (Kultur im Vorjahr)", wert: alt?.vorfrucht_kultur_id ?? vorschlagVorfrucht ?? "",
        optionen: kulturOptionen, gruppen: kulturGruppen, leer: "Nicht angegeben",
        hilfe: vorschlagVorfrucht ? "Aus dem Schlag des Vorjahres übernommen." : null }),
      auswahl({ pfad: "ertragslage", label: "Erwartete Ertragslage", wert: alt?.ertragslage, optionen: ERTRAGSLAGEN, leer: "Nicht angegeben",
        hilfe: "Für die Düngebedarfsermittlung nach NAPV. Die genauen Stufen folgen mit den NAPV-Regeln." }),
      textfeld({ pfad: "name", label: "Bezeichnung (optional)", wert: alt?.name, maxlength: 80 })),
  );
  ziel.append(form);
  if (alt) {
    ziel.append(h("button", { class: "knopf knopf-gefahr", type: "button", onclick: async () => {
      if (!await bestaetige("Diesen Schlag entfernen?", { ja: "Entfernen", gefahr: true, details: "Bestehende Aufzeichnungen bleiben erhalten." })) return;
      await daten.loeschen("schlag", alt.id);
      meldung("Schlag entfernt.", "info");
      gehe(`flaechen?jahr=${jahr}`);
    } }, "Schlag entfernen"));
  }
}

async function speichereSchlag(form, alt, { betrieb, fs, jahr, kult, geschwister }) {
  const w = werte(form);
  const sl = { ...(alt ?? {}), betrieb_id: alt?.betrieb_id ?? betrieb.id, feldstueck_id: fs.id, jahr };
  const setze = (feld, wert) => { if (wert === "" || wert === undefined) delete sl[feld]; else sl[feld] = wert; };
  const zahlOderText = (s) => { const z = zahl(s); return z === undefined ? "" : Number.isNaN(z) ? s : z; };
  setze("nummer", zahlOderText(w.nummer));
  setze("flaeche_ha", zahlOderText(w.flaeche_ha));
  setze("kultur_id", w.kultur_id);
  setze("vorfrucht_kultur_id", w.vorfrucht_kultur_id);
  setze("vorfrucht_name", kult.find((k) => k.id === w.vorfrucht_kultur_id)?.name ?? "");
  setze("ertragslage", w.ertragslage);
  setze("name", w.name);

  const doppelt = geschwister.find((s) => s.nummer === sl.nummer);
  if (doppelt) return zeigeFehler(form, [{ pfad: "nummer", art: "fachlich", meldung: `Schlag ${sl.nummer} gibt es in diesem Feldstück für ${jahr} schon.` }]);
  try {
    await daten.speichern("schlag", sl);
    const summe = geschwister.reduce((s, x) => s + x.flaeche_ha, 0) + (sl.flaeche_ha ?? 0);
    if (summe > fs.flaeche_ha * 1.001) meldung(`Gespeichert. Achtung: Die Schläge sind zusammen größer als das Feldstück (${ha(summe)} > ${ha(fs.flaeche_ha)}).`, "warnung", 9000);
    else meldung("Schlag gespeichert.", "erfolg");
    gehe(`flaechen?jahr=${jahr}`);
  } catch (e) {
    if (e.name !== "ValidierungsFehler") throw e;
    zeigeFehler(form, e.fehler, SL_TEXTE);
  }
}
