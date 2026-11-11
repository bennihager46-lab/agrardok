// Gemeinsame Bausteine der Aufzeichnungsformulare (Schlagkartei, Düngung, Pflanzenschutz):
// Datum (heute), Anwender:in, Geräte und eine Warnliste, deren wichtige Punkte ausdrücklich bestätigt werden müssen.

import * as daten from "../daten.js";
import { h } from "./dom.js";
import { datumsfeld, auswahl, textfeld, textbereich, abschnitt } from "./formular.js";
import { heute } from "../bestand.js";

export async function personenUndGeraete(betriebId) {
  const [personen, maschinen] = await Promise.all([
    daten.liste("person", { index: "betrieb_id", wert: betriebId }),
    daten.liste("maschine", { index: "betrieb_id", wert: betriebId }),
  ]);
  return {
    personen: personen.filter((p) => p.aktiv !== false).sort((a, b) => a.name.localeCompare(b.name, "de")),
    maschinen: maschinen.sort((a, b) => a.name.localeCompare(b.name, "de")),
  };
}

/** Datum, ggf. Uhrzeit, Person und Gerät. */
export function wannWer({ m = {}, personen, maschinen, maschinenArten, mitUhrzeit = false, uhrzeitPflicht = false, personLabel = "Durchgeführt von" }) {
  const geraete = maschinenArten ? maschinen.filter((x) => maschinenArten.includes(x.art)) : maschinen;
  return abschnitt("Wann und wer",
    datumsfeld({ pfad: "datum", label: "Datum", wert: m.datum ?? heute(), pflicht: true }),
    mitUhrzeit ? h("div", { class: "feldraster" },
      textfeld({ pfad: "uhrzeit_start", label: `Beginn (Uhrzeit)${uhrzeitPflicht ? "" : " – optional"}`, wert: m.uhrzeit_start, typ: "time", pflicht: uhrzeitPflicht }),
      textfeld({ pfad: "uhrzeit_ende", label: "Ende (Uhrzeit)", wert: m.uhrzeit_ende ?? m.details?.uhrzeit_ende, typ: "time" })) : null,
    personen.length ? auswahl({ pfad: "person_id", label: personLabel, wert: m.person_ids?.[0] ?? (personen.length === 1 ? personen[0].id : ""), optionen: personen.map((p) => ({ wert: p.id, text: p.name })), leer: "Nicht angegeben" }) : null,
    geraete.length ? auswahl({ pfad: "maschine_id", label: "Gerät", wert: m.maschine_ids?.find((id) => geraete.some((g) => g.id === id)) ?? "", optionen: geraete.map((g) => ({ wert: g.id, text: g.name })), leer: "Nicht angegeben" }) : null,
  );
}

export const notizfeld = (m = {}) => textbereich({ pfad: "notiz", label: "Notiz", wert: m.notiz, maxlength: 2000 });

/**
 * Zeigt Warnungen. Punkte mit bestaetigen: true bekommen ein Kästchen „Gelesen und geprüft“.
 * @param {HTMLElement} ziel  Container, wird ersetzt
 * @param {Array<{code, stufe, text, quelle?, bestaetigen?, bezug?: string}>} warnungen
 * @param {string[]} bestaetigt  bereits bestätigte Codes (beim Bearbeiten)
 */
export function zeigeWarnungen(ziel, warnungen, bestaetigt = []) {
  const vorher = new Set([...bestaetigt, ...leseBestaetigungen(ziel)]);
  if (!warnungen.length) {
    ziel.replaceChildren(h("p", { class: "hinweis hinweis-erfolg", "data-test": "keine-warnungen" }, "Keine Auffälligkeiten gefunden."));
    return;
  }
  const reihenfolge = { fehler: 0, warnung: 1, info: 2 };
  ziel.replaceChildren(h("ul", { class: "warnliste", "data-test": "warnungen" }, [...warnungen].sort((a, b) => reihenfolge[a.stufe] - reihenfolge[b.stufe]).map((w) =>
    h("li", { class: `stufe-${w.stufe}`, "data-code": w.code },
      h("strong", {}, w.stufe === "fehler" ? "Achtung: " : w.stufe === "warnung" ? "Bitte prüfen: " : "Hinweis: "),
      w.bezug ? `${w.bezug} – ` : "", w.text,
      w.quelle ? h("span", { class: "quelle" }, "Quelle: ", w.quelle.url ? h("a", { href: w.quelle.url, target: "_blank", rel: "noopener noreferrer" }, w.quelle.text) : w.quelle.text) : null,
      w.bestaetigen ? h("label", {}, h("input", { type: "checkbox", "data-bestaetigung": w.code, checked: vorher.has(w.code) }), "Gelesen und geprüft") : null))));
}

export const leseBestaetigungen = (ziel) => [...ziel.querySelectorAll("[data-bestaetigung]:checked")].map((b) => b.dataset.bestaetigung);
export const offeneBestaetigungen = (ziel) => [...ziel.querySelectorAll("[data-bestaetigung]:not(:checked)")].map((b) => b.dataset.bestaetigung);
