import * as daten from "../daten.js";
import { letzteSicherung } from "../sicherung.js";
import { h, karte, zahl, datumZeit } from "../ui/dom.js";
import * as inst from "../installation.js";
import { startkarten } from "../startkarten.js";
import { fristen } from "../fristen.js";
import { aktiverBetrieb } from "../betrieb.js";

const SICHERUNG_ALT_TAGE = 14;

export async function renderStart(ziel) {
  const [anzahl, gesichert] = await Promise.all([daten.zaehle(), letzteSicherung()]);
  const leer = daten.ENTITAETEN.every((e) => anzahl[e] === 0);

  ziel.append(
    h("h1", {}, "AGRARDOK+"),
    h("p", { class: "einleitung" }, "Aufzeichnungen für Ihren Betrieb – direkt am Handy, auch ohne Internet."),
  );

  if (anzahl.betrieb === 0) {
    ziel.append(
      karte(
        "Erste Schritte",
        h("p", {}, "Richten Sie zuerst Ihren Betrieb ein: Name, Adresse, Bewirtschaftung, ÖPUL-Maßnahmen und die Personen am Betrieb."),
        h("a", { class: "knopf", href: "#/betrieb-bearbeiten", "data-test": "start-einrichten" }, "Betrieb einrichten"),
        h("p", { class: "klein" }, "Zum Ausprobieren können Sie stattdessen unter Einstellungen die Testdaten des Musterbetriebs einlesen."),
      ),
    );
  }
  ziel.append(...(await startkarten()));
  const fristKarte = await naechsteFristen();
  if (fristKarte) ziel.append(fristKarte);
  if (!leer) {
    const zeilen = [
      ["Betriebe", anzahl.betrieb], ["Feldstücke", anzahl.feldstueck], ["Schläge", anzahl.schlag],
      ["Aufzeichnungen", anzahl.massnahme], ["Tiere/Tiergruppen", anzahl.tier], ["Betriebsmittel", anzahl.betriebsmittel],
    ];
    ziel.append(
      karte(
        "Daten auf diesem Gerät",
        h("dl", { class: "zahlenliste" }, zeilen.flatMap(([titel, n]) => [h("dt", {}, titel), h("dd", {}, zahl(n))])),
      ),
    );
  }

  ziel.append(sicherungsKarte(gesichert, leer));
  const installKarte = installationsKarte();
  if (installKarte) ziel.append(installKarte);
}

function sicherungsKarte(gesichert, leer) {
  const tage = gesichert ? (Date.now() - Date.parse(gesichert)) / 86_400_000 : Infinity;
  const veraltet = !leer && tage > SICHERUNG_ALT_TAGE;
  return karte(
    "Datensicherung",
    h(
      "p",
      { class: veraltet ? "hinweis hinweis-warnung" : "" },
      gesichert
        ? `Letzte Sicherung: ${datumZeit(gesichert)}.`
        : "Es gibt noch keine Sicherung.",
      veraltet ? " Bitte sichern Sie Ihre Daten – Aufzeichnungen müssen bis zu 7 Jahre aufbewahrt werden." : "",
    ),
    h("a", { class: "knopf knopf-zweit", href: "#/einstellungen" }, "Jetzt sichern"),
  );
}

function installationsKarte() {
  if (inst.istInstalliert()) return null;
  const k = karte("Als App installieren");
  if (inst.istIOS()) {
    k.append(
      h("p", {}, "Wichtig auf dem iPhone: Nur als App auf dem Home-Bildschirm bleiben Ihre Daten sicher gespeichert."),
      h("ol", {}, h("li", {}, "Unten auf „Teilen“ tippen (Quadrat mit Pfeil)."), h("li", {}, "„Zum Home-Bildschirm“ wählen."), h("li", {}, "AGRARDOK+ ab jetzt über das neue Symbol öffnen.")),
    );
  } else if (inst.kannInstallieren()) {
    k.append(
      h("p", {}, "Installiert startet AGRARDOK+ wie eine normale App und funktioniert ohne Internet."),
      h("button", { class: "knopf", type: "button", onclick: async () => { if (await inst.installieren()) k.remove(); } }, "App installieren"),
    );
  } else {
    k.append(h("p", {}, "Tipp: Im Browser-Menü „App installieren“ bzw. „Zum Startbildschirm hinzufügen“ wählen."));
  }
  return k;
}

/** Fristen der nächsten 30 Tage aus allen Modulen (core/fristen.js). */
async function naechsteFristen() {
  const betrieb = await aktiverBetrieb();
  if (!betrieb) return null;
  const liste = (await fristen(betrieb, { tage: 30 })).slice(0, 5);
  if (!liste.length) return null;
  return karte("Nächste Fristen",
    h("ul", { class: "liste-schlicht", "data-test": "start-fristen" }, liste.map((f) => h("li", {}, h("strong", {}, `${f.datum.split("-").reverse().join(".")}: `), f.titel))),
    h("a", { class: "knopf knopf-zweit", href: "#/fristen" }, "Alle Fristen"));
}
