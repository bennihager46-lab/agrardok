// Einstieg des Moduls „Betrieb“ (Stammdaten): registriert Seiten und Startseiten-Karte.

import * as daten from "../core/daten.js";
import { registriereStartkarte } from "../core/startkarten.js";
import { h, karte } from "../core/ui/dom.js";
import { renderBetrieb, renderBetriebBearbeiten } from "./betrieb.js";
import { renderPersonen, renderPerson } from "./personen.js";
import { renderMaschinen, renderMaschine } from "./maschinen.js";
import { aktiverBetrieb, sachkundeStatus } from "./kontext.js";

export function registriere(route) {
  route("betrieb", { titel: "Betrieb", render: renderBetrieb });
  route("betrieb-bearbeiten", { titel: "Betrieb bearbeiten", render: renderBetriebBearbeiten });
  route("personen", { titel: "Personen", render: renderPersonen });
  route("person", { titel: "Person", render: renderPerson });
  route("maschinen", { titel: "Maschinen", render: renderMaschinen });
  route("maschine", { titel: "Maschine", render: renderMaschine });
  registriereStartkarte(sachkundeKarte);
}

/** Warnt auf der Startseite vor abgelaufenen oder bald ablaufenden Sachkundeausweisen. */
async function sachkundeKarte() {
  const betrieb = await aktiverBetrieb();
  if (!betrieb) return null;
  const warnungen = (await daten.liste("person", { index: "betrieb_id", wert: betrieb.id }))
    .filter((p) => p.aktiv !== false)
    .map((p) => ({ p, s: sachkundeStatus(p) }))
    .filter(({ s }) => s.stufe === "abgelaufen" || s.stufe === "bald");
  if (!warnungen.length) return null;
  return karte("Sachkundeausweise prüfen",
    h("ul", { class: "hinweis hinweis-warnung liste-schlicht", "data-test": "start-sachkunde" },
      warnungen.map(({ p, s }) => h("li", {}, `${p.name}: ${s.text}`))),
    h("a", { class: "knopf knopf-zweit", href: "#/personen" }, "Zu den Personen"));
}
