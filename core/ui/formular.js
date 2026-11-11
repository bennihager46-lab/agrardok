// Formular-Bausteine: große Felder, sichtbare Beschriftung, Hilfetext, Fehler direkt am Feld.
// Jedes Feld trägt data-pfad = Pfad im Datensatz (z. B. "adresse/plz"), damit Fehler aus der
// Schema-Prüfung automatisch beim richtigen Feld landen.

import { h } from "./dom.js";

let zaehler = 0;
const neueId = (name) => `f-${name.replace(/[^a-z0-9]/gi, "-")}-${++zaehler}`;

function rahmen({ pfad, label, hilfe, pflicht, eingabe, id }) {
  const hilfeId = hilfe ? `${id}-hilfe` : null;
  const fehlerId = `${id}-fehler`;
  eingabe.setAttribute("aria-describedby", [hilfeId, fehlerId].filter(Boolean).join(" "));
  return h(
    "div", { class: "feld", "data-pfad": pfad },
    h("label", { for: id }, label, pflicht ? h("span", { class: "pflicht", "aria-hidden": "true" }, " *") : null),
    hilfe ? h("p", { class: "feld-hilfe", id: hilfeId }, hilfe) : null,
    eingabe,
    h("p", { class: "feld-fehler", id: fehlerId, hidden: true }),
  );
}

/** Textfeld. vorschlaege: Liste von Texten für eine Auswahlliste (datalist), freie Eingabe bleibt möglich. */
export function textfeld({ pfad, label, wert = "", hilfe, pflicht, typ = "text", inputmode, autocomplete, maxlength, vorschlaege }) {
  const id = neueId(pfad);
  const listeId = vorschlaege ? `${id}-liste` : null;
  const eingabe = h("input", {
    id, name: pfad, type: typ, value: wert ?? "", inputmode, autocomplete: autocomplete ?? "off",
    maxlength, required: pflicht, "aria-required": pflicht ? "true" : null, list: listeId,
    autocapitalize: typ === "email" ? "off" : "sentences",
  });
  const r = rahmen({ pfad, label, hilfe, pflicht, eingabe, id });
  if (vorschlaege) r.append(h("datalist", { id: listeId }, vorschlaege.map((v) => h("option", { value: v }))));
  return r;
}

export function datumsfeld({ pfad, label, wert = "", hilfe, pflicht }) {
  const id = neueId(pfad);
  const eingabe = h("input", { id, name: pfad, type: "date", value: wert ?? "", required: pflicht });
  return rahmen({ pfad, label, hilfe, pflicht, eingabe, id });
}

/**
 * Auswahlliste (natives select – am Handy die bequemste Variante).
 * optionen: [{wert, text, gruppe?}] – mit „gruppe“ entstehen Zwischenüberschriften (optgroup).
 */
export function auswahl({ pfad, label, wert = "", optionen, hilfe, pflicht, leer = "Bitte wählen …", gruppen = {} }) {
  const id = neueId(pfad);
  const option = (o) => h("option", { value: o.wert, selected: o.wert === wert }, o.text);
  let inhalt = optionen.map(option);
  if (optionen.some((o) => o.gruppe)) {
    const nach = new Map();
    for (const o of optionen) {
      if (!nach.has(o.gruppe)) nach.set(o.gruppe, []);
      nach.get(o.gruppe).push(o);
    }
    inhalt = [...nach].map(([g, liste]) => h("optgroup", { label: gruppen[g] ?? g }, liste.map(option)));
  }
  const eingabe = h(
    "select", { id, name: pfad, required: pflicht },
    leer !== null ? h("option", { value: "" }, leer) : null,
    inhalt,
  );
  return rahmen({ pfad, label, hilfe, pflicht, eingabe, id });
}

/** Große Auswahlknöpfe (Radio) – für wenige, wichtige Optionen. optionen: [{wert, text, hilfe}] */
export function knopfauswahl({ pfad, label, wert = "", optionen, hilfe, pflicht, beiAenderung }) {
  const gruppe = neueId(pfad);
  return h(
    "fieldset", { class: "feld knopfauswahl", "data-pfad": pfad },
    h("legend", {}, label, pflicht ? h("span", { class: "pflicht", "aria-hidden": "true" }, " *") : null),
    hilfe ? h("p", { class: "feld-hilfe" }, hilfe) : null,
    h("div", { class: "knopfauswahl-optionen" },
      optionen.map((o) => {
        const id = `${gruppe}-${o.wert}`;
        return h("label", { class: "option", for: id },
          h("input", { type: "radio", id, name: pfad, value: o.wert, checked: o.wert === wert, onchange: beiAenderung }),
          h("span", {}, h("strong", {}, o.text), o.hilfe ? h("small", {}, o.hilfe) : null));
      })),
    h("p", { class: "feld-fehler", hidden: true }),
  );
}

/** Mehrfachauswahl (Checkboxen), optional gruppiert. optionen: [{wert, text, gruppe, hinweis}] */
export function mehrfachauswahl({ pfad, label, werte = [], optionen, gruppen = {}, hilfe }) {
  const gewaehlt = new Set(werte);
  const nachGruppe = new Map();
  for (const o of optionen) {
    const g = o.gruppe ?? "";
    if (!nachGruppe.has(g)) nachGruppe.set(g, []);
    nachGruppe.get(g).push(o);
  }
  const basis = neueId(pfad);
  return h(
    "fieldset", { class: "feld mehrfachauswahl", "data-pfad": pfad },
    h("legend", {}, label),
    hilfe ? h("p", { class: "feld-hilfe" }, hilfe) : null,
    [...nachGruppe].map(([g, liste]) => h("div", { class: "auswahlgruppe" },
      g ? h("h3", {}, gruppen[g] ?? g) : null,
      liste.map((o, i) => {
        const id = `${basis}-${g}-${i}`;
        return h("label", { class: "option", for: id },
          h("input", { type: "checkbox", id, name: pfad, value: o.wert, checked: gewaehlt.has(o.wert) }),
          h("span", {}, o.text, o.hinweis ? h("small", {}, o.hinweis) : null));
      }))),
    h("p", { class: "feld-fehler", hidden: true }),
  );
}

/** Liest die Werte eines Formulars: Text → getrimmter String, Checkboxen → Array, Radio → Wert. */
export function werte(formular) {
  const ergebnis = {};
  for (const el of formular.elements) {
    if (!el.name) continue;
    if (el.type === "checkbox") {
      (ergebnis[el.name] ??= []);
      if (el.checked) ergebnis[el.name].push(el.value);
    } else if (el.type === "radio") {
      if (el.checked) ergebnis[el.name] = el.value;
      else ergebnis[el.name] ??= "";
    } else {
      ergebnis[el.name] = el.value.trim();
    }
  }
  return ergebnis;
}

/** Entfernt leere Texte und leere Objekte (damit z. B. eine leere Adresse gar nicht gespeichert wird). */
export function ohneLeere(obj) {
  const aus = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === "" || v === undefined || v === null) continue;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const innen = ohneLeere(v);
      if (Object.keys(innen).length) aus[k] = innen;
    } else aus[k] = v;
  }
  return aus;
}

/**
 * Zeigt Fehler an den Feldern an und oben als Liste. texte: { "pfad": { art: "Meldung" } }
 * zum Überschreiben der allgemeinen Meldungen (z. B. Betriebsnummer-Format).
 */
export function zeigeFehler(formular, fehler, texte = {}) {
  setzeFehlerZurueck(formular);
  if (!fehler.length) return;
  const uebersicht = formular.querySelector(".fehler-uebersicht");
  const liste = [];
  const gemeldet = new Set();
  // In der Reihenfolge der Felder im Formular melden, nicht in der Reihenfolge der Prüfung
  const reihenfolge = [...formular.querySelectorAll("[data-pfad]")].map((f) => f.dataset.pfad);
  const position = (pfad) => {
    const i = reihenfolge.findIndex((p) => pfad === p || pfad.startsWith(`${p}/`));
    return i === -1 ? Infinity : i;
  };
  fehler = [...fehler].sort((a, b) => position(a.pfad) - position(b.pfad));
  for (const f of fehler) {
    // Pro Feld nur die erste Meldung (z. B. Datum verletzt sowohl Muster als auch Format)
    if (gemeldet.has(f.pfad)) continue;
    gemeldet.add(f.pfad);
    const meldung = texte[f.pfad]?.[f.art] ?? f.meldung;
    const feld = findeFeld(formular, f.pfad);
    if (feld) {
      const ausgabe = feld.querySelector(".feld-fehler");
      if (ausgabe.hidden) {
        ausgabe.textContent = meldung;
        ausgabe.hidden = false;
        feld.classList.add("hat-fehler");
        feld.querySelectorAll("input, select").forEach((e) => e.setAttribute("aria-invalid", "true"));
      }
    }
    const beschriftung = feld?.querySelector("label, legend")?.firstChild?.textContent?.trim();
    liste.push(h("li", {}, beschriftung ? `${beschriftung}: ${meldung}` : meldung));
  }
  uebersicht.replaceChildren(h("p", {}, h("strong", {}, "Bitte prüfen Sie folgende Angaben:")), h("ul", {}, liste));
  uebersicht.hidden = false;
  const erstes = formular.querySelector(".hat-fehler input, .hat-fehler select");
  (erstes ?? uebersicht).focus();
}

export function setzeFehlerZurueck(formular) {
  formular.querySelectorAll(".hat-fehler").forEach((f) => f.classList.remove("hat-fehler"));
  formular.querySelectorAll(".feld-fehler").forEach((f) => { f.hidden = true; f.textContent = ""; });
  formular.querySelectorAll("[aria-invalid]").forEach((e) => e.removeAttribute("aria-invalid"));
  const uebersicht = formular.querySelector(".fehler-uebersicht");
  if (uebersicht) uebersicht.hidden = true;
}

/** Sucht das Feld zum Pfad; bei tieferen Pfaden das nächste übergeordnete Feld. */
function findeFeld(formular, pfad) {
  let p = pfad;
  while (p) {
    const feld = formular.querySelector(`[data-pfad="${CSS.escape(p)}"]`);
    if (feld) return feld;
    p = p.includes("/") ? p.slice(0, p.lastIndexOf("/")) : "";
  }
  return null;
}

/** Formular-Hülle mit Fehlerübersicht oben und Knopfreihe unten. */
export function formular({ beimSpeichern, abbrechen, speichernText = "Speichern" }, ...inhalt) {
  const form = h("form", { novalidate: true, class: "formular" },
    h("div", { class: "fehler-uebersicht hinweis hinweis-fehler", role: "alert", tabindex: "-1", hidden: true }),
    ...inhalt,
    h("div", { class: "knopfreihe formular-knoepfe" },
      h("button", { class: "knopf", type: "submit", "data-test": "speichern" }, speichernText),
      abbrechen ? h("button", { class: "knopf knopf-zweit", type: "button", onclick: abbrechen }, "Abbrechen") : null));
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const knopf = form.querySelector("[type=submit]");
    knopf.disabled = true;
    try {
      await beimSpeichern(form);
    } finally {
      knopf.disabled = false;
    }
  });
  return form;
}

export function abschnitt(titel, ...inhalt) {
  return h("fieldset", { class: "abschnitt" }, h("legend", {}, titel), ...inhalt);
}

/** Zahl aus einem Eingabefeld (Komma oder Punkt). Leer → undefined; Unlesbares bleibt Text, damit die Schema-Prüfung es meldet. */
export function zahlAus(text) {
  const t = String(text ?? "").trim().replace(/\s/g, "");
  if (!t) return undefined;
  const n = Number(t.replace(",", "."));
  return Number.isFinite(n) ? n : t;
}

/** Ja/Nein aus einer knopfauswahl mit den Werten „ja“/„nein“; nichts gewählt → undefined. */
export const jaNeinAus = (w) => (w === "ja" ? true : w === "nein" ? false : undefined);
export const jaNeinWert = (b) => (b === true ? "ja" : b === false ? "nein" : "");

/**
 * Wiederholbare Gruppe (z. B. Wirkstoffe, Indikationen, Wartezeiten).
 * felder(eintrag, praefix) liefert die Felder einer Zeile; deren pfad muss mit `${praefix}/` beginnen.
 * Beim Entfernen werden die Zeilen neu nummeriert, damit Fehlerpfade aus der Schema-Prüfung
 * (z. B. „psm/indikationen/1/kulturen“) beim richtigen Feld landen. Auslesen mit leseWiederholung().
 */
export function wiederholung({ pfad, titel, hilfe, eintraege = [], felder, neuText = "Hinzufügen", zeilenName = "Eintrag", minimum = 0 }) {
  const liste = h("div", { class: "wiederholung-liste" });
  const nummeriere = () => [...liste.children].forEach((zeile, i) => {
    const alt = zeile.dataset.pfad;
    const neu = `${pfad}/${i}`;
    zeile.dataset.pfad = neu;
    zeile.querySelectorAll("[name]").forEach((el) => { if (el.name.startsWith(`${alt}/`)) el.name = neu + el.name.slice(alt.length); });
    zeile.querySelectorAll("[data-pfad]").forEach((el) => { if (el.dataset.pfad.startsWith(`${alt}/`)) el.dataset.pfad = neu + el.dataset.pfad.slice(alt.length); });
    zeile.querySelector(".wiederholung-titel").textContent = `${zeilenName} ${i + 1}`;
    const weg = zeile.querySelector(".wiederholung-entfernen");
    weg.setAttribute("aria-label", `${zeilenName} ${i + 1} entfernen`);
    weg.hidden = liste.children.length <= minimum;
  });
  const knopf = h("button", { class: "knopf knopf-zweit", type: "button", "data-test": `${pfad}-neu`, onclick: () => neueZeile({}, true) }, neuText);
  function neueZeile(eintrag, fokus) {
    const praefix = `${pfad}/${liste.children.length}`;
    const zeile = h("div", { class: "wiederholung-zeile", "data-pfad": praefix },
      h("div", { class: "wiederholung-kopf" },
        h("strong", { class: "wiederholung-titel" }),
        h("button", { class: "knopf knopf-zweit knopf-klein wiederholung-entfernen", type: "button", onclick: () => {
          zeile.remove();
          nummeriere();
          knopf.focus();
        } }, "Entfernen")),
      felder(eintrag ?? {}, praefix));
    liste.append(zeile);
    nummeriere();
    if (fokus) zeile.querySelector("input, select, textarea")?.focus();
  }
  for (const e of eintraege) neueZeile(e, false);
  while (liste.children.length < minimum) neueZeile({}, false);
  return h("fieldset", { class: "feld wiederholung", "data-pfad": pfad, "data-wiederholung": pfad },
    h("legend", {}, titel),
    hilfe ? h("p", { class: "feld-hilfe" }, hilfe) : null,
    liste, knopf,
    h("p", { class: "feld-fehler", hidden: true }));
}

/**
 * Liest eine wiederholung() aus: Liste von Objekten { teilpfad: Text | boolean (Einzel-Checkbox) }.
 * Ganz leere Zeilen werden übersprungen.
 */
export function leseWiederholung(formular, pfad) {
  const gruppe = formular.querySelector(`[data-wiederholung="${CSS.escape(pfad)}"]`);
  if (!gruppe) return [];
  return [...gruppe.querySelector(".wiederholung-liste").children].map((zeile) => {
    const praefix = `${zeile.dataset.pfad}/`;
    const eintrag = {};
    for (const el of zeile.querySelectorAll("[name]")) {
      if (!el.name.startsWith(praefix)) continue;
      const k = el.name.slice(praefix.length);
      if (el.type === "radio") { if (el.checked) eintrag[k] = el.value; else eintrag[k] ??= ""; }
      else if (el.type === "checkbox") eintrag[k] = el.checked;
      else eintrag[k] = el.value.trim();
    }
    return eintrag;
  }).filter((e) => Object.values(e).some((v) => v !== "" && v !== false));
}

/** Mehrzeiliges Textfeld. */
export function textbereich({ pfad, label, wert = "", hilfe, zeilen = 3, maxlength }) {
  const id = neueId(pfad);
  const eingabe = h("textarea", { id, name: pfad, rows: zeilen, maxlength });
  eingabe.value = wert ?? "";
  return rahmen({ pfad, label, hilfe, eingabe, id });
}
