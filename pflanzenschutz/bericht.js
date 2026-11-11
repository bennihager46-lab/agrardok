// Seite „Pflanzenschutz-Aufzeichnungen“: alle Anwendungen eines Jahres, Export als CSV (maschinenlesbar, DVO (EU) 2023/564) und Druck.

import * as daten from "../core/daten.js";
import { aktiverBetrieb } from "../core/betrieb.js";
import { schlaegeImJahr, massnahmen, aktuellesJahr, datumText } from "../core/bestand.js";
import { massnahmeText } from "../core/massnahmen-text.js";
import { parameter } from "../core/router.js";
import { h, karte, meldung } from "../core/ui/dom.js";
import { exportZeilen, alsCsv } from "./pruefung.js";

export async function renderPsmBericht(ziel) {
  ziel.append(h("h1", {}, "Pflanzenschutz-Aufzeichnungen"));
  const betrieb = await aktiverBetrieb();
  if (!betrieb) return ziel.append(karte("Zuerst den Betrieb einrichten", h("a", { class: "knopf", href: "#/betrieb-bearbeiten" }, "Betrieb einrichten")));
  const jahr = Number(parameter().get("jahr")) || aktuellesJahr();
  const [eintraege, ms, personen, maschinen] = await Promise.all([
    schlaegeImJahr(betrieb.id, jahr), massnahmen(betrieb.id, { art: "pflanzenschutz" }),
    daten.liste("person", { index: "betrieb_id", wert: betrieb.id }), daten.liste("maschine", { index: "betrieb_id", wert: betrieb.id }),
  ]);
  const liste = ms.filter((m) => m.datum.startsWith(String(jahr))).sort((a, b) => a.datum.localeCompare(b.datum));
  const schlagVon = new Map(eintraege.map((e) => [e.schlag.id, e]));
  const zeilen = exportZeilen(liste, { schlagVon, personVon: new Map(personen.map((x) => [x.id, x])), maschineVon: new Map(maschinen.map((x) => [x.id, x])) });

  ziel.append(
    h("nav", { class: "jahreswahl nicht-drucken", "aria-label": "Jahr" },
      h("a", { class: "knopf knopf-zweit knopf-klein", href: `#/psm-bericht?jahr=${jahr - 1}`, "aria-label": `Jahr ${jahr - 1}` }, "◀"),
      h("strong", {}, `Jahr ${jahr}`),
      h("a", { class: "knopf knopf-zweit knopf-klein", href: `#/psm-bericht?jahr=${jahr + 1}`, "aria-label": `Jahr ${jahr + 1}` }, "▶")),
    h("div", { class: "knopfreihe nicht-drucken" },
      h("a", { class: "knopf", href: "#/pflanzenschutz-erfassen" }, "+ Anwendung"),
      h("button", { class: "knopf knopf-zweit", type: "button", "data-test": "psm-csv", disabled: !zeilen.length, onclick: () => {
        const blob = new Blob([alsCsv(zeilen)], { type: "text/csv;charset=utf-8" });
        const a = h("a", { href: URL.createObjectURL(blob), download: `pflanzenschutz-${jahr}-${(betrieb.betriebsnummer ?? "betrieb")}.csv` });
        document.body.append(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        meldung("CSV-Datei gespeichert (öffnet sich in Excel bzw. LibreOffice).", "erfolg");
      } }, "Als CSV exportieren"),
      h("button", { class: "knopf knopf-zweit", type: "button", onclick: () => print() }, "Drucken / PDF")),
    h("p", { class: "klein" }, "Inhalt nach Art. 67 VO (EG) 1107/2009 und Anhang DVO (EU) 2023/564: Art der Verwendung, Mittel und Zulassungsnummer, Datum und Uhrzeit, Menge, Fläche aus dem Mehrfachantrag, Kultur mit EPPO-Code und BBCH. Mindestens 3 Jahre aufbewahren."),
  );
  if (!liste.length) return ziel.append(h("p", {}, `Keine Anwendungen in ${jahr}.`));
  ziel.append(h("ol", { class: "zeitachse", "data-test": "psm-liste" }, liste.map((m) => h("li", {}, h("a", { href: `#/pflanzenschutz-erfassen?id=${m.id}` },
    h("strong", {}, `${datumText(m.datum)}${m.uhrzeit_start ? ` ${m.uhrzeit_start}` : ""} · ${m.details?.kultur_name ?? ""}`),
    h("span", {}, massnahmeText(m)),
    h("small", {}, m.schlag_ids?.map((id) => schlagVon.get(id)?.bezeichnung ?? "?").join(", ") ?? m.ort ?? ""))))),
  h("p", { class: "klein" }, `${zeilen.length} Exportzeilen (je Mittel und Schlag eine Zeile).`));
}
