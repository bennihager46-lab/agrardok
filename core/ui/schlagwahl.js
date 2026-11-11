// Schnelle Auswahl mehrerer Schläge (Roadmap MVP-09: UI-Baustein für alle Module).
// Große Zeilen zum Antippen, gruppiert nach Kultur; „alle mit dieser Kultur“ mit einem Tipp.

import { h } from "./dom.js";
import { haText } from "../bestand.js";

/**
 * @param {{pfad?: string, eintraege: Array<{schlag, kultur, feldstueck, bezeichnung}>, gewaehlt?: string[], label?: string, hilfe?: string, beiAenderung?: Function}} o
 * @returns {HTMLElement} fieldset; gewählte IDs über leseSchlagwahl(element)
 */
export function schlagwahl({ pfad = "schlag_ids", eintraege, gewaehlt = [], label = "Schläge", hilfe, beiAenderung }) {
  const auswahl = new Set(gewaehlt);
  const summe = h("p", { class: "schlagwahl-summe", "aria-live": "polite" });
  const aktualisiere = () => {
    const ha = eintraege.filter((e) => auswahl.has(e.schlag.id)).reduce((s, e) => s + (e.schlag.flaeche_ha ?? 0), 0);
    summe.textContent = auswahl.size ? `${auswahl.size} ${auswahl.size === 1 ? "Schlag" : "Schläge"} gewählt · ${haText(ha)}` : "Noch kein Schlag gewählt";
    beiAenderung?.([...auswahl]);
  };
  const gruppen = new Map();
  for (const e of eintraege) {
    const k = e.kultur?.name ?? "Ohne Kultur";
    if (!gruppen.has(k)) gruppen.set(k, []);
    gruppen.get(k).push(e);
  }
  const boxen = [];
  const inhalt = [...gruppen].map(([kultur, liste]) => {
    const gruppenBoxen = [];
    const zeilen = liste.map((e) => {
      const box = h("input", { type: "checkbox", name: pfad, value: e.schlag.id, checked: auswahl.has(e.schlag.id), onchange: () => {
        if (box.checked) auswahl.add(e.schlag.id); else auswahl.delete(e.schlag.id);
        aktualisiere();
      } });
      boxen.push(box);
      gruppenBoxen.push(box);
      return h("label", { class: "option" }, box, h("span", {}, h("strong", {}, e.bezeichnung), h("small", {}, haText(e.schlag.flaeche_ha))));
    });
    const alle = liste.length > 1 ? h("button", { type: "button", class: "knopf knopf-zweit knopf-klein", onclick: () => {
      const an = gruppenBoxen.some((b) => !b.checked);
      for (const b of gruppenBoxen) { b.checked = an; if (an) auswahl.add(b.value); else auswahl.delete(b.value); }
      aktualisiere();
    } }, `Alle ${kultur}`) : null;
    return h("div", { class: "auswahlgruppe" }, h("div", { class: "schlagwahl-kopf" }, h("h3", {}, kultur), alle), zeilen);
  });
  const feld = h("fieldset", { class: "feld mehrfachauswahl schlagwahl", "data-pfad": pfad },
    h("legend", {}, label, h("span", { class: "pflicht", "aria-hidden": "true" }, " *")),
    hilfe ? h("p", { class: "feld-hilfe" }, hilfe) : null,
    eintraege.length ? inhalt : h("p", { class: "hinweis hinweis-info" }, "Für dieses Jahr sind keine Schläge angelegt. Bitte zuerst unter Betrieb → Flächen die Schläge eintragen."),
    summe,
    h("p", { class: "feld-fehler", hidden: true }));
  aktualisiere();
  return feld;
}

export const leseSchlagwahl = (form, pfad = "schlag_ids") => [...form.querySelectorAll(`input[type=checkbox][name="${CSS.escape(pfad)}"]:checked`)].map((b) => b.value);
