// Seiten „Betrieb“ (Übersicht) und „Betrieb bearbeiten“.

import * as daten from "../core/daten.js";
import * as regeln from "../core/regeln.js";
import { gehe } from "../core/router.js";
import { h, karte, meldung } from "../core/ui/dom.js";
import { textfeld, auswahl, knopfauswahl, mehrfachauswahl, formular, abschnitt, werte, zeigeFehler } from "../core/ui/formular.js";
import {
  aktiverBetrieb, merkeAktivenBetrieb, pruefeBetriebFachlich, sachkundeStatus,
  BUNDESLAENDER, RECHTSFORMEN, BEWIRTSCHAFTUNG, text,
} from "./kontext.js";

const FEHLERTEXTE = {
  name: { required: "Bitte den Namen des Betriebs eintragen.", minLength: "Bitte den Namen des Betriebs eintragen." },
  betriebsnummer: { pattern: "Die Betriebsnummer (LFBIS) besteht aus genau 7 Ziffern." },
  bundesland: { required: "Bitte das Bundesland wählen.", enum: "Bitte das Bundesland wählen." },
  "adresse/plz": { pattern: "Die Postleitzahl hat 4 Ziffern." },
  "bewirtschafter/name": { required: "Bitte angeben, wer den Betrieb bewirtschaftet.", minLength: "Bitte angeben, wer den Betrieb bewirtschaftet." },
  bio_kontrollstelle: { required: "Für Bio-Betriebe bitte die Kontrollstelle angeben." },
};

// ---------- Übersicht ----------

export async function renderBetrieb(ziel) {
  const betrieb = await aktiverBetrieb();
  ziel.append(h("h1", {}, "Betrieb"));
  if (!betrieb) {
    ziel.append(karte(
      "Noch kein Betrieb eingerichtet",
      h("p", {}, "Tragen Sie zuerst die Grunddaten Ihres Betriebs ein. Das dauert etwa zwei Minuten und lässt sich jederzeit ändern."),
      h("a", { class: "knopf", href: "#/betrieb-bearbeiten", "data-test": "betrieb-einrichten" }, "Betrieb einrichten"),
    ));
    return;
  }

  const [katalog, personen] = await Promise.all([regeln.lade("oepul/massnahmen"), daten.liste("person", { index: "betrieb_id", wert: betrieb.id })]);
  const oepulNamen = (betrieb.oepul_massnahmen ?? []).map((c) => katalog.werte.find((m) => m.code === c)?.name ?? c);
  const adresse = [betrieb.adresse?.strasse, [betrieb.adresse?.plz, betrieb.adresse?.ort].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  const bewirtschaftung = text(BEWIRTSCHAFTUNG, betrieb.bewirtschaftung) + (betrieb.bio_kontrollstelle ? ` – Kontrollstelle ${betrieb.bio_kontrollstelle}` : "");
  const anlage5 = betrieb.napv_gebiet_anlage5 === true ? "Ja" : betrieb.napv_gebiet_anlage5 === false ? "Nein" : "Noch nicht angegeben";

  const zeilen = [
    ["Betrieb", betrieb.name],
    ["Betriebsnummer", betrieb.betriebsnummer ?? "–"],
    ["Bundesland", text(BUNDESLAENDER, betrieb.bundesland)],
    ["Adresse", adresse || "–"],
    ["Bewirtschafter", betrieb.bewirtschafter ? `${betrieb.bewirtschafter.name}${betrieb.bewirtschafter.rechtsform ? ` (${text(RECHTSFORMEN, betrieb.bewirtschafter.rechtsform)})` : ""}` : "–"],
    ["Bewirtschaftung", betrieb.bewirtschaftung ? bewirtschaftung : "–"],
    ["Nitrat-Gebiet (Anlage 5)", anlage5],
  ];
  ziel.append(karte(
    "Betriebsdaten",
    h("dl", { class: "angaben", "data-test": "betriebsdaten" }, zeilen.flatMap(([t, w]) => [h("dt", {}, t), h("dd", {}, w)])),
    h("h3", {}, "ÖPUL-Maßnahmen"),
    oepulNamen.length ? h("ul", { class: "liste-schlicht" }, oepulNamen.map((n) => h("li", {}, n))) : h("p", {}, "Keine ausgewählt."),
    h("a", { class: "knopf knopf-zweit", href: "#/betrieb-bearbeiten" }, "Betriebsdaten bearbeiten"),
  ));

  const aktiv = personen.filter((p) => p.aktiv !== false);
  const warnungen = aktiv.map((p) => ({ p, s: sachkundeStatus(p) })).filter(({ s }) => s.stufe === "abgelaufen" || s.stufe === "bald");
  ziel.append(karte(
    "Personen am Betrieb",
    h("p", {}, aktiv.length ? `${aktiv.length} ${aktiv.length === 1 ? "Person" : "Personen"} eingetragen.` : "Noch keine Personen eingetragen."),
    warnungen.length
      ? h("ul", { class: "hinweis hinweis-warnung liste-schlicht" }, warnungen.map(({ p, s }) => h("li", {}, `${p.name}: ${s.text}`)))
      : null,
    h("a", { class: "knopf knopf-zweit", href: "#/personen" }, "Personen verwalten"),
  ));

  ziel.append(karte(
    "Weitere Stammdaten",
    h("ul", { class: "liste-schlicht" },
      h("li", {}, h("a", { href: "#/flaechen", "data-test": "zu-flaechen" }, "Flächen (Feldstücke und Schläge)")),
      h("li", {}, h("a", { href: "#/betriebsmittel", "data-test": "zu-betriebsmittel" }, "Betriebsmittel (Dünger, Pflanzenschutz, Saatgut, Tierarznei)")),
      h("li", {}, h("a", { href: "#/maschinen", "data-test": "zu-maschinen" }, "Maschinen und Geräte (Prüfplakette)")),
      h("li", {}, h("a", { href: "#/bodenproben" }, "Bodenproben"))),
  ));
}

// ---------- Bearbeiten ----------

export async function renderBetriebBearbeiten(ziel) {
  const [alt, katalog, kontrollstellen] = await Promise.all([
    aktiverBetrieb(), regeln.lade("oepul/massnahmen"), regeln.lade("bio/kontrollstellen"),
  ]);
  ziel.append(h("h1", {}, alt ? "Betriebsdaten bearbeiten" : "Betrieb einrichten"));

  const kontrollstelleFeld = textfeld({
    pfad: "bio_kontrollstelle", label: "Bio-Kontrollstelle", wert: alt?.bio_kontrollstelle, pflicht: true,
    hilfe: "Code und Name, wie auf Ihrem Bio-Zertifikat, z. B. „AT-BIO-401 BIOS“.",
    vorschlaege: kontrollstellen.werte.map((k) => `${k.code} ${k.name}`), maxlength: 160,
  });
  const zeigeKontrollstelle = () => {
    const wert = form.querySelector("[name=bewirtschaftung]:checked")?.value;
    kontrollstelleFeld.hidden = !["bio", "umstellung"].includes(wert);
  };

  const form = formular(
    {
      speichernText: alt ? "Speichern" : "Betrieb anlegen",
      abbrechen: alt ? () => gehe("betrieb") : null,
      beimSpeichern: (f) => speichern(f, alt),
    },
    abschnitt("Betrieb",
      textfeld({ pfad: "name", label: "Name des Betriebs", wert: alt?.name, pflicht: true, maxlength: 120, autocomplete: "organization" }),
      textfeld({ pfad: "betriebsnummer", label: "Betriebsnummer (LFBIS)", wert: alt?.betriebsnummer, inputmode: "numeric", maxlength: 9,
        hilfe: "7 Ziffern, z. B. aus dem Mehrfachantrag oder eAMA. Kann auch später ergänzt werden." }),
      auswahl({ pfad: "bundesland", label: "Bundesland", wert: alt?.bundesland, optionen: BUNDESLAENDER, pflicht: true,
        hilfe: "Bestimmt u. a., welches Landes-Pflanzenschutzrecht gilt." })),
    abschnitt("Adresse",
      textfeld({ pfad: "adresse/strasse", label: "Straße und Hausnummer", wert: alt?.adresse?.strasse, autocomplete: "street-address" }),
      h("div", { class: "feldreihe" },
        textfeld({ pfad: "adresse/plz", label: "PLZ", wert: alt?.adresse?.plz, inputmode: "numeric", maxlength: 4, autocomplete: "postal-code" }),
        textfeld({ pfad: "adresse/ort", label: "Ort", wert: alt?.adresse?.ort, autocomplete: "address-level2" }))),
    abschnitt("Bewirtschafter:in",
      textfeld({ pfad: "bewirtschafter/name", label: "Name der Bewirtschafter:in", wert: alt?.bewirtschafter?.name, pflicht: true,
        hilfe: "Wer den Betrieb führt – so wie im Mehrfachantrag, z. B. „Anna und Josef Muster“." }),
      auswahl({ pfad: "bewirtschafter/rechtsform", label: "Rechtsform", wert: alt?.bewirtschafter?.rechtsform, optionen: RECHTSFORMEN })),
    abschnitt("Bewirtschaftung",
      knopfauswahl({ pfad: "bewirtschaftung", label: "Wirtschaftsweise", wert: alt?.bewirtschaftung ?? "konventionell",
        optionen: BEWIRTSCHAFTUNG, beiAenderung: () => zeigeKontrollstelle() }),
      kontrollstelleFeld,
      auswahl({ pfad: "napv_gebiet_anlage5", label: "Liegt der Betrieb in einem Nitrat-Gebiet nach Anlage 5 NAPV?",
        wert: alt?.napv_gebiet_anlage5 === true ? "ja" : alt?.napv_gebiet_anlage5 === false ? "nein" : "",
        optionen: [{ wert: "ja", text: "Ja" }, { wert: "nein", text: "Nein" }], leer: "Weiß ich nicht",
        hilfe: "In diesen Gebieten gelten strengere Düngeaufzeichnungen (je Schlag, binnen 14 Tagen). Im Zweifel bei der Landwirtschaftskammer nachfragen." })),
    abschnitt("ÖPUL",
      mehrfachauswahl({
        pfad: "oepul_massnahmen", label: "An welchen ÖPUL-Maßnahmen nimmt Ihr Betrieb teil?", werte: alt?.oepul_massnahmen ?? [],
        hilfe: "Steht im Mehrfachantrag. Danach richtet sich später, welche Aufzeichnungen die App anbietet.",
        gruppen: katalog.gruppen,
        optionen: katalog.werte.map((m) => ({ wert: m.code, text: m.name, gruppe: m.gruppe, hinweis: m.aufzeichnungen ? "mit Aufzeichnungspflichten" : null })),
      })),
  );
  ziel.append(form);
  zeigeKontrollstelle();
}

async function speichern(form, alt) {
  const w = werte(form);
  const betrieb = { ...(alt ?? {}) };
  const setze = (feld, wert) => {
    if (wert === "" || wert === undefined || (Array.isArray(wert) && !wert.length)) delete betrieb[feld];
    else betrieb[feld] = wert;
  };
  setze("name", w.name);
  setze("betriebsnummer", w.betriebsnummer.replace(/\s/g, ""));
  setze("bundesland", w.bundesland);
  const adresse = { strasse: w["adresse/strasse"], plz: w["adresse/plz"], ort: w["adresse/ort"] };
  Object.keys(adresse).forEach((k) => adresse[k] || delete adresse[k]);
  setze("adresse", Object.keys(adresse).length ? { ...adresse, land: "AT" } : "");
  const bewirtschafter = { ...(alt?.bewirtschafter ?? {}), name: w["bewirtschafter/name"], rechtsform: w["bewirtschafter/rechtsform"] };
  Object.keys(bewirtschafter).forEach((k) => bewirtschafter[k] || delete bewirtschafter[k]);
  // Ganz leerer Bewirtschafter → Feld als leer übergeben, damit die Pflicht-Meldung am Namen erscheint
  betrieb.bewirtschafter = bewirtschafter;
  setze("bewirtschaftung", w.bewirtschaftung);
  setze("bio_kontrollstelle", ["bio", "umstellung"].includes(w.bewirtschaftung) ? w.bio_kontrollstelle : "");
  setze("napv_gebiet_anlage5", w.napv_gebiet_anlage5 === "ja" ? true : w.napv_gebiet_anlage5 === "nein" ? false : "");
  setze("oepul_massnahmen", w.oepul_massnahmen);

  const fachlich = pruefeBetriebFachlich(betrieb);
  if (fachlich.length) return zeigeFehler(form, fachlich, FEHLERTEXTE);
  try {
    const gespeichert = await daten.speichern("betrieb", betrieb);
    if (!alt) await merkeAktivenBetrieb(gespeichert.id);
    meldung(alt ? "Betriebsdaten gespeichert." : "Betrieb angelegt.", "erfolg");
    gehe(alt ? "betrieb" : "personen?erste=1");
  } catch (e) {
    if (e.name !== "ValidierungsFehler") throw e;
    zeigeFehler(form, e.fehler, FEHLERTEXTE);
  }
}
