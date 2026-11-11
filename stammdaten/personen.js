// Seiten „Personen“ (Liste) und „Person“ (anlegen/bearbeiten).

import * as daten from "../core/daten.js";
import { gehe, parameter } from "../core/router.js";
import { h, karte, meldung, bestaetige } from "../core/ui/dom.js";
import { textfeld, auswahl, datumsfeld, knopfauswahl, formular, abschnitt, werte, zeigeFehler } from "../core/ui/formular.js";
import { aktiverBetrieb, sachkundeStatus, ROLLEN, BUNDESLAENDER, text } from "./kontext.js";

const FEHLERTEXTE = {
  name: { required: "Bitte den Namen eintragen.", minLength: "Bitte den Namen eintragen." },
  rolle: { required: "Bitte die Rolle am Betrieb wählen.", enum: "Bitte die Rolle am Betrieb wählen." },
  email: { pattern: "Bitte eine gültige E-Mail-Adresse eingeben (oder leer lassen)." },
  "psm_ausbildungsbescheinigung/nummer": { required: "Zum Ablaufdatum fehlt die Nummer des Sachkundeausweises." },
  "psm_ausbildungsbescheinigung/gueltig_bis": { required: "Zur Nummer fehlt das Ablaufdatum („gültig bis“) des Sachkundeausweises." },
};

const STATUS_KLASSE = { gueltig: "status-ok", bald: "status-warnung", abgelaufen: "status-fehler", fehlt: "status-neutral" };

// ---------- Liste ----------

export async function renderPersonen(ziel) {
  ziel.append(h("h1", {}, "Personen am Betrieb"));
  const betrieb = await aktiverBetrieb();
  if (!betrieb) return ziel.append(ohneBetrieb());

  if (parameter().get("erste")) {
    ziel.append(h("p", { class: "hinweis hinweis-erfolg" }, "Der Betrieb ist angelegt. Tragen Sie jetzt die Personen ein, die am Betrieb arbeiten – besonders alle, die Pflanzenschutzmittel ausbringen."));
  }
  const personen = (await daten.liste("person", { index: "betrieb_id", wert: betrieb.id }))
    .sort((a, b) => a.name.localeCompare(b.name, "de"));
  const aktiv = personen.filter((p) => p.aktiv !== false);
  const ehemalig = personen.filter((p) => p.aktiv === false);

  ziel.append(h("a", { class: "knopf", href: "#/person?neu=1", "data-test": "person-neu" }, "Person hinzufügen"));
  if (!personen.length) ziel.append(h("p", {}, "Noch keine Personen eingetragen."));
  if (aktiv.length) ziel.append(h("ul", { class: "personenliste", "data-test": "personenliste" }, aktiv.map(eintrag)));
  if (ehemalig.length) {
    ziel.append(h("h2", {}, "Nicht mehr am Betrieb"), h("ul", { class: "personenliste" }, ehemalig.map(eintrag)));
  }
  ziel.append(h("a", { class: "knopf knopf-zweit", href: "#/betrieb" }, "Zurück zum Betrieb"));
}

function eintrag(p) {
  const s = sachkundeStatus(p);
  const zeigeStatus = s.stufe !== "fehlt" || ["betriebsleitung", "familie", "mitarbeit"].includes(p.rolle);
  return h("li", {}, h("a", { href: `#/person?id=${p.id}`, class: "personenkarte" },
    h("strong", {}, p.name),
    h("span", {}, text(ROLLEN, p.rolle)),
    zeigeStatus ? h("span", { class: `status ${STATUS_KLASSE[s.stufe]}`, "data-stufe": s.stufe }, s.text) : null));
}

function ohneBetrieb() {
  return karte("Zuerst den Betrieb einrichten",
    h("p", {}, "Personen gehören zu einem Betrieb. Bitte legen Sie zuerst die Betriebsdaten an."),
    h("a", { class: "knopf", href: "#/betrieb-bearbeiten" }, "Betrieb einrichten"));
}

// ---------- Anlegen / Bearbeiten ----------

export async function renderPerson(ziel) {
  const betrieb = await aktiverBetrieb();
  if (!betrieb) return ziel.append(h("h1", {}, "Person"), ohneBetrieb());
  const id = parameter().get("id");
  const alt = id ? await daten.hole("person", id) : null;
  if (id && !alt) {
    ziel.append(h("h1", {}, "Person nicht gefunden"), h("a", { class: "knopf", href: "#/personen" }, "Zur Personenliste"));
    return;
  }
  ziel.append(h("h1", {}, alt ? alt.name : "Person hinzufügen"));
  const ausweis = alt?.psm_ausbildungsbescheinigung;

  const form = formular(
    { abbrechen: () => gehe("personen"), beimSpeichern: (f) => speichern(f, alt, betrieb) },
    abschnitt("Person",
      textfeld({ pfad: "name", label: "Vor- und Nachname", wert: alt?.name, pflicht: true, maxlength: 120, autocomplete: "name" }),
      auswahl({ pfad: "rolle", label: "Rolle am Betrieb", wert: alt?.rolle, optionen: ROLLEN, pflicht: true }),
      textfeld({ pfad: "telefon", label: "Telefon", wert: alt?.telefon, typ: "tel", inputmode: "tel", autocomplete: "tel" }),
      textfeld({ pfad: "email", label: "E-Mail", wert: alt?.email, typ: "email", inputmode: "email", autocomplete: "email" })),
    abschnitt("Sachkundeausweis Pflanzenschutz",
      h("p", { class: "feld-hilfe" }, "Pflicht für alle, die beruflich Pflanzenschutzmittel ausbringen (Ausbildungsbescheinigung). Nummer und Ablaufdatum stehen auf dem Ausweis. Leer lassen, wenn die Person keinen hat."),
      textfeld({ pfad: "psm_ausbildungsbescheinigung/nummer", label: "Ausweisnummer", wert: ausweis?.nummer, maxlength: 60 }),
      datumsfeld({ pfad: "psm_ausbildungsbescheinigung/gueltig_bis", label: "Gültig bis", wert: ausweis?.gueltig_bis }),
      auswahl({ pfad: "psm_ausbildungsbescheinigung/bundesland", label: "Ausgestellt in", wert: ausweis?.bundesland, optionen: BUNDESLAENDER, leer: "Nicht angegeben" })),
    abschnitt("Status",
      knopfauswahl({ pfad: "aktiv", label: "Ist die Person derzeit am Betrieb tätig?", wert: alt?.aktiv === false ? "nein" : "ja",
        optionen: [{ wert: "ja", text: "Ja" }, { wert: "nein", text: "Nein, nicht mehr", hilfe: "Bleibt für frühere Aufzeichnungen erhalten" }] })),
  );
  ziel.append(form);

  if (alt) {
    const s = sachkundeStatus(alt);
    if (s.stufe === "abgelaufen" || s.stufe === "bald") {
      form.before(h("p", { class: `hinweis ${s.stufe === "abgelaufen" ? "hinweis-fehler" : "hinweis-warnung"}`, "data-test": "sachkunde-hinweis" }, `${s.text}.`));
    }
    ziel.append(h("button", { class: "knopf knopf-gefahr", type: "button", onclick: async () => {
      if (!await bestaetige(`${alt.name} wirklich entfernen?`, { ja: "Entfernen", gefahr: true, details: "Frühere Aufzeichnungen behalten ihren Eintrag." })) return;
      await daten.loeschen("person", alt.id);
      meldung(`${alt.name} wurde entfernt.`, "info");
      gehe("personen");
    } }, "Person entfernen"));
  }
}

async function speichern(form, alt, betrieb) {
  const w = werte(form);
  const person = { ...(alt ?? {}), betrieb_id: alt?.betrieb_id ?? betrieb.id };
  const setze = (feld, wert) => { if (wert === "" || wert === undefined) delete person[feld]; else person[feld] = wert; };
  setze("name", w.name);
  setze("rolle", w.rolle);
  setze("telefon", w.telefon);
  setze("email", w.email);
  const ausweis = {
    nummer: w["psm_ausbildungsbescheinigung/nummer"],
    gueltig_bis: w["psm_ausbildungsbescheinigung/gueltig_bis"],
    bundesland: w["psm_ausbildungsbescheinigung/bundesland"],
  };
  Object.keys(ausweis).forEach((k) => ausweis[k] || delete ausweis[k]);
  // Nur Bundesland ohne Nummer/Datum zählt als „kein Ausweis“
  setze("psm_ausbildungsbescheinigung", ausweis.nummer || ausweis.gueltig_bis ? ausweis : "");
  person.aktiv = w.aktiv !== "nein";

  try {
    const gespeichert = await daten.speichern("person", person);
    const s = sachkundeStatus(gespeichert);
    if (s.stufe === "abgelaufen" || s.stufe === "bald") meldung(`Gespeichert. Achtung: ${s.text}.`, "warnung", 9000);
    else meldung(`${gespeichert.name} gespeichert.`, "erfolg");
    gehe("personen");
  } catch (e) {
    if (e.name !== "ValidierungsFehler") throw e;
    zeigeFehler(form, e.fehler, FEHLERTEXTE);
  }
}
