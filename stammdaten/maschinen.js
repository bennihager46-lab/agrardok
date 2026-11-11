// Seiten „Maschinen und Geräte“ (Liste) und „Maschine“ (anlegen/bearbeiten) – vor allem für die Geräteprüfung
// von Pflanzenschutzgeräten (Prüfplakette) und die Ausbringtechnik von Güllefässern.

import * as daten from "../core/daten.js";
import { aktiverBetrieb } from "../core/betrieb.js";
import { gehe, parameter } from "../core/router.js";
import { h, karte, meldung, bestaetige } from "../core/ui/dom.js";
import { textfeld, auswahl, datumsfeld, formular, abschnitt, werte, zeigeFehler, zahlAus } from "../core/ui/formular.js";
import { datumText, lokalesDatum } from "../core/person.js";

export const MASCHINEN_ARTEN = [
  ["traktor", "Traktor"], ["feldspritze", "Pflanzenschutzgerät (Feldspritze, Sprühgerät)"], ["duengerstreuer", "Düngerstreuer"], ["guellefass", "Güllefass"],
  ["saemaschine", "Sämaschine"], ["bodenbearbeitung", "Bodenbearbeitungsgerät"], ["erntemaschine", "Erntemaschine"], ["maehwerk", "Mähwerk"], ["sonstiges", "Sonstiges"],
].map(([wert, text]) => ({ wert, text }));
const TECHNIK = [["breitverteiler", "Breitverteiler"], ["schleppschlauch", "Schleppschlauch"], ["schleppschuh", "Schleppschuh"], ["injektor", "Injektor"], ["sonstige", "Sonstige"]].map(([wert, text]) => ({ wert, text }));
const text = (liste, w) => liste.find((x) => x.wert === w)?.text ?? w;

export async function renderMaschinen(ziel) {
  ziel.append(h("h1", {}, "Maschinen und Geräte"));
  const betrieb = await aktiverBetrieb();
  if (!betrieb) return ziel.append(karte("Zuerst den Betrieb einrichten", h("a", { class: "knopf", href: "#/betrieb-bearbeiten" }, "Betrieb einrichten")));
  const liste = (await daten.liste("maschine", { index: "betrieb_id", wert: betrieb.id })).sort((a, b) => a.name.localeCompare(b.name, "de"));
  const heute = lokalesDatum();
  ziel.append(h("a", { class: "knopf", href: "#/maschine?neu=1", "data-test": "maschine-neu" }, "Maschine hinzufügen"));
  if (!liste.length) ziel.append(h("p", {}, "Noch keine Maschinen eingetragen. Wichtig sind vor allem Pflanzenschutzgeräte (Prüfplakette) und Güllefässer (Ausbringtechnik)."));
  else ziel.append(h("ul", { class: "personenliste", "data-test": "maschinenliste" }, liste.map((m) => {
    const bis = m.geraetepruefung?.gueltig_bis;
    const status = bis ? (bis < heute ? ["status-fehler", `Geräteprüfung abgelaufen (${datumText(bis)})`] : ["status-ok", `Geräteprüfung bis ${datumText(bis)}`]) : m.art === "feldspritze" ? ["status-warnung", "Geräteprüfung nicht eingetragen"] : null;
    return h("li", {}, h("a", { class: "personenkarte", href: `#/maschine?id=${m.id}` },
      h("strong", {}, m.name), h("span", {}, text(MASCHINEN_ARTEN, m.art)),
      status ? h("span", { class: `status ${status[0]}` }, status[1]) : null));
  })));
  ziel.append(h("a", { class: "knopf knopf-zweit", href: "#/betrieb" }, "Zurück zum Betrieb"));
}

export async function renderMaschine(ziel) {
  const betrieb = await aktiverBetrieb();
  if (!betrieb) return gehe("betrieb");
  const id = parameter().get("id");
  const alt = id ? await daten.hole("maschine", id) : null;
  ziel.append(h("h1", {}, alt ? alt.name : "Maschine hinzufügen"));
  const form = formular(
    { abbrechen: () => gehe("maschinen"), beimSpeichern: (f) => speichern(f) },
    abschnitt("Maschine",
      textfeld({ pfad: "name", label: "Bezeichnung", wert: alt?.name, pflicht: true, maxlength: 80, hilfe: "z. B. „Anbauspritze 15 m“" }),
      auswahl({ pfad: "art", label: "Art", wert: alt?.art, optionen: MASCHINEN_ARTEN, pflicht: true }),
      textfeld({ pfad: "kennzeichen", label: "Kennzeichen", wert: alt?.kennzeichen, maxlength: 20 }),
      h("div", { class: "feldraster" },
        textfeld({ pfad: "baujahr", label: "Baujahr", wert: alt?.baujahr ? String(alt.baujahr) : "", inputmode: "numeric", maxlength: 4 }),
        textfeld({ pfad: "arbeitsbreite_m", label: "Arbeitsbreite in m", wert: alt?.arbeitsbreite_m != null ? String(alt.arbeitsbreite_m).replace(".", ",") : "", inputmode: "decimal", maxlength: 6 })),
      auswahl({ pfad: "ausbringtechnik", label: "Ausbringtechnik (Güllefass)", wert: alt?.ausbringtechnik, optionen: TECHNIK, leer: "Nicht zutreffend" })),
    abschnitt("Geräteprüfung (Pflanzenschutzgeräte)",
      h("p", { class: "feld-hilfe" }, "Pflanzenschutzgeräte müssen regelmäßig überprüft werden; das Datum steht auf der Prüfplakette bzw. im Prüfbericht."),
      datumsfeld({ pfad: "geraetepruefung/datum", label: "Geprüft am", wert: alt?.geraetepruefung?.datum }),
      datumsfeld({ pfad: "geraetepruefung/gueltig_bis", label: "Gültig bis", wert: alt?.geraetepruefung?.gueltig_bis }),
      textfeld({ pfad: "geraetepruefung/pruefnummer", label: "Prüfnummer", wert: alt?.geraetepruefung?.pruefnummer, maxlength: 40 })),
  );
  ziel.append(form);
  if (alt) ziel.append(h("button", { class: "knopf knopf-gefahr", type: "button", onclick: async () => {
    if (!await bestaetige(`„${alt.name}“ entfernen?`, { ja: "Entfernen", gefahr: true, details: "Frühere Aufzeichnungen behalten den Verweis." })) return;
    await daten.loeschen("maschine", alt.id);
    meldung("Maschine entfernt.", "info");
    gehe("maschinen");
  } }, "Entfernen"));

  async function speichern(f) {
    const w = werte(f);
    const m = { ...(alt ?? {}), betrieb_id: betrieb.id, name: w.name || undefined, art: w.art || undefined };
    const setze = (k, v) => { if (v === undefined || v === "") delete m[k]; else m[k] = v; };
    setze("kennzeichen", w.kennzeichen);
    setze("baujahr", zahlAus(w.baujahr));
    setze("arbeitsbreite_m", zahlAus(w.arbeitsbreite_m));
    setze("ausbringtechnik", w.ausbringtechnik);
    const gp = Object.fromEntries(["datum", "gueltig_bis", "pruefnummer"].map((k) => [k, w[`geraetepruefung/${k}`]]).filter(([, v]) => v));
    setze("geraetepruefung", Object.keys(gp).length ? gp : undefined);
    try {
      await daten.speichern("maschine", m);
      meldung(`„${m.name}“ gespeichert.`, "erfolg");
      gehe("maschinen");
    } catch (e) {
      if (e.name !== "ValidierungsFehler") throw e;
      zeigeFehler(f, e.fehler, { name: { required: "Bitte eine Bezeichnung eintragen.", minLength: "Bitte eine Bezeichnung eintragen." }, art: { required: "Bitte die Art wählen.", enum: "Bitte die Art wählen." } });
    }
  }
}
