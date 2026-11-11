// Einstieg des Moduls „Betriebsmittel“: Dünger, Pflanzenschutzmittel, Saatgut, Tierarzneimittel u. a.

import * as daten from "../core/daten.js";
import { aktiverBetrieb } from "../core/betrieb.js";
import { registriereStartkarte } from "../core/startkarten.js";
import { h, karte } from "../core/ui/dom.js";
import { renderBetriebsmittel, renderNeu } from "./seiten.js";
import { renderEintrag } from "./eintrag.js";
import { psmStatus } from "./kontext.js";

export function registriere(route) {
  route("betriebsmittel", { titel: "Betriebsmittel", render: renderBetriebsmittel });
  route("betriebsmittel-neu", { titel: "Betriebsmittel anlegen", render: renderNeu });
  route("betriebsmittel-eintrag", { titel: "Betriebsmittel", render: renderEintrag });
  registriereStartkarte(zulassungKarte);
}

/** Warnt auf der Startseite vor Pflanzenschutzmitteln, deren Zulassung bzw. Aufbrauchfrist endet. */
async function zulassungKarte() {
  const betrieb = await aktiverBetrieb();
  if (!betrieb) return null;
  const warnungen = (await daten.liste("betriebsmittel", { index: "betrieb_id", wert: betrieb.id }))
    .filter((m) => m.art === "psm" && m.aktiv !== false)
    .map((m) => ({ m, s: psmStatus(m) }))
    .filter(({ s }) => ["abgelaufen", "aufbrauchen", "bald"].includes(s.stufe));
  if (!warnungen.length) return null;
  return karte("Pflanzenschutzmittel prüfen",
    h("ul", { class: "hinweis hinweis-warnung liste-schlicht", "data-test": "start-psm" },
      warnungen.map(({ m, s }) => h("li", {}, `${m.name}: ${s.text}`))),
    h("a", { class: "knopf knopf-zweit", href: "#/betriebsmittel?gruppe=psm" }, "Zu den Pflanzenschutzmitteln"));
}
