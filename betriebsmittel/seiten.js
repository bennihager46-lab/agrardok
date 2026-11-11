// Seiten „Betriebsmittel“ (Liste mit Gruppen, Suche, zuletzt verwendet oben) und „Betriebsmittel anlegen“ (Art/Vorlage wählen).

import * as daten from "../core/daten.js";
import * as regeln from "../core/regeln.js";
import { aktiverBetrieb } from "../core/betrieb.js";
import { parameter } from "../core/router.js";
import { h, karte } from "../core/ui/dom.js";
import { ARTEN, GRUPPEN, gruppeVon, artText, kurzinfo, psmStatus, zuletztVerwendet, sortiere, datumText, naehrstoffText, wirkstoffName } from "./kontext.js";

export const STATUS_KLASSE = { gueltig: "status-ok", bald: "status-warnung", aufbrauchen: "status-warnung", abgelaufen: "status-fehler", unbekannt: "status-neutral" };

export function ohneBetrieb(ziel) {
  ziel.append(karte("Zuerst den Betrieb einrichten",
    h("p", {}, "Betriebsmittel gehören zu einem Betrieb. Bitte legen Sie zuerst die Betriebsdaten an."),
    h("a", { class: "knopf", href: "#/betrieb-bearbeiten" }, "Betrieb einrichten")));
}

/** Alle Betriebsmittel des Betriebs und wann sie zuletzt verwendet wurden. */
export async function ladeMitVerwendung(betriebId) {
  const [mittel, massnahmen] = await Promise.all([
    daten.liste("betriebsmittel", { index: "betrieb_id", wert: betriebId }),
    daten.liste("massnahme", { index: "betrieb_id", wert: betriebId }),
  ]);
  const zuletzt = zuletztVerwendet(massnahmen);
  return { mittel: sortiere(mittel, zuletzt), zuletzt };
}

// ---------- Liste ----------

export async function renderBetriebsmittel(ziel) {
  ziel.append(h("h1", {}, "Betriebsmittel"));
  const betrieb = await aktiverBetrieb();
  if (!betrieb) return ohneBetrieb(ziel);
  const gruppe = GRUPPEN.some((g) => g.wert === parameter().get("gruppe")) ? parameter().get("gruppe") : "";
  const { mittel, zuletzt } = await ladeMitVerwendung(betrieb.id);
  const anzahl = (g) => mittel.filter((m) => m.aktiv !== false && (!g || gruppeVon(m.art) === g)).length;

  ziel.append(
    h("p", { class: "einleitung" }, "Einmal anlegen, dann bei jeder Aufzeichnung mit einem Tipp auswählen. Zuletzt verwendete Mittel stehen oben."),
    h("ul", { class: "gruppenwahl", "aria-label": "Art der Betriebsmittel" },
      [{ wert: "", text: "Alle" }, ...GRUPPEN].map((g) => h("li", {},
        h("a", { href: `#/betriebsmittel${g.wert ? `?gruppe=${g.wert}` : ""}`, "aria-current": g.wert === gruppe ? "page" : null, "data-gruppe": g.wert || "alle" },
          `${g.text} (${anzahl(g.wert)})`)))),
    h("a", { class: "knopf", href: `#/betriebsmittel-neu${gruppe ? `?gruppe=${gruppe}` : ""}`, "data-test": "betriebsmittel-neu" }, "Betriebsmittel anlegen"),
  );

  const sichtbar = mittel.filter((m) => !gruppe || gruppeVon(m.art) === gruppe);
  if (!sichtbar.length) {
    ziel.append(karte(mittel.length ? "In dieser Gruppe noch nichts angelegt" : "Noch keine Betriebsmittel",
      h("p", {}, "Tipp: Für gängige Mineraldünger gibt es Vorlagen – ein Tipp, Gehalte prüfen, fertig."),
      h("p", {}, "Pflanzenschutzmittel brauchen die Zulassungsnummer aus dem Pflanzenschutzmittelregister bzw. vom Etikett.")));
  } else {
    const aktiv = sichtbar.filter((m) => m.aktiv !== false);
    const ehemalig = sichtbar.filter((m) => m.aktiv === false);
    const listen = [];
    const liste = (eintraege, test) => {
      const ul = h("ul", { class: "personenliste", "data-test": test }, eintraege.map((m) => eintrag(m, zuletzt.get(m.id))));
      listen.push(ul);
      return ul;
    };
    if (aktiv.length > 6) ziel.append(suchfeld(listen));
    if (aktiv.length) ziel.append(liste(aktiv, "betriebsmittelliste"));
    if (ehemalig.length) ziel.append(h("h2", {}, "Nicht mehr in Verwendung"), liste(ehemalig, "betriebsmittel-ehemalig"));
  }
  ziel.append(h("a", { class: "knopf knopf-zweit", href: "#/betrieb" }, "Zurück zum Betrieb"));
}

/** Filtert die Listen während der Eingabe (Name, Zulassungsnummer, Wirkstoff, Sorte). */
function suchfeld(listen) {
  const eingabe = h("input", { type: "search", id: "bm-suche", placeholder: "z. B. Name, Zulassungsnummer, Wirkstoff", autocomplete: "off", "data-test": "betriebsmittel-suche",
    oninput: () => {
      const begriff = eingabe.value.trim().toLowerCase();
      for (const ul of listen) for (const li of ul.children) li.hidden = !!begriff && !li.dataset.suche.includes(begriff);
    } });
  return h("div", { class: "feld suchfeld" }, h("label", { for: "bm-suche" }, "Suchen"), eingabe);
}

function eintrag(m, verwendet) {
  const psm = m.art === "psm" ? psmStatus(m) : null;
  const suche = [m.name, m.psm?.zulassungsnummer, m.tierarzneimittel?.zulassungsnummer, m.saatgut?.sorte, ...(m.psm?.wirkstoffe ?? []).map(wirkstoffName)]
    .filter(Boolean).join(" ").toLowerCase();
  return h("li", { "data-suche": suche }, h("a", { href: `#/betriebsmittel-eintrag?id=${m.id}`, class: "personenkarte", "data-art": m.art },
    h("strong", {}, m.name),
    h("span", {}, [artText(m.art), kurzinfo(m)].filter(Boolean).join(" · ")),
    verwendet ? h("small", {}, `Zuletzt verwendet: ${datumText(verwendet)}`) : null,
    psm && psm.stufe !== "gueltig" ? h("span", { class: `status ${STATUS_KLASSE[psm.stufe]}`, "data-stufe": psm.stufe }, psm.text) : null));
}

// ---------- Anlegen: Art oder Vorlage wählen ----------

export async function renderNeu(ziel) {
  ziel.append(h("h1", {}, "Betriebsmittel anlegen"));
  const betrieb = await aktiverBetrieb();
  if (!betrieb) return ohneBetrieb(ziel);
  const gruppe = parameter().get("gruppe");
  const vorlagen = await regeln.lade("betriebsmittel/duenger-vorlagen");
  const arten = ARTEN.filter((a) => !gruppe || a.gruppe === gruppe);

  ziel.append(karte("Was möchten Sie anlegen?",
    h("ul", { class: "personenliste", "data-test": "art-wahl" }, arten.map((a) => h("li", {},
      h("a", { class: "personenkarte", href: `#/betriebsmittel-eintrag?art=${a.wert}`, "data-art": a.wert },
        h("strong", {}, a.text), a.hilfe ? h("small", {}, a.hilfe) : null))))));

  if (!gruppe || gruppe === "duenger") {
    const mineral = vorlagen.werte.filter((v) => v.art === "mineralduenger");
    const organisch = vorlagen.werte.filter((v) => v.art !== "mineralduenger");
    const vorlagenListe = (liste) => h("ul", { class: "personenliste" }, liste.map((v) => h("li", {},
      h("a", { class: "personenkarte", href: `#/betriebsmittel-eintrag?vorlage=${encodeURIComponent(v.id)}`, "data-vorlage": v.id },
        h("strong", {}, v.name), h("small", {}, v.duenger.n_gesamt != null ? naehrstoffText(v.duenger) : `${artText(v.art)} – Gehalte selbst eintragen`)))));
    ziel.append(karte("Schneller: Dünger aus Vorlage",
      h("p", { class: "klein" }, "Typische Nenngehalte, keine Markennamen. Bitte mit Sackaufdruck bzw. Lieferschein vergleichen – die Deklaration geht vor."),
      h("h3", {}, "Mineraldünger"), vorlagenListe(mineral),
      h("h3", {}, "Wirtschafts- und organische Dünger"),
      h("p", { class: "klein" }, "Ohne Gehalte, weil die Werte von Betrieb zu Betrieb stark schwanken: Laborwerte oder Richtwerte (Richtlinien für die sachgerechte Düngung) eintragen."),
      vorlagenListe(organisch)));
  }
  ziel.append(h("a", { class: "knopf knopf-zweit", href: "#/betriebsmittel" }, "Abbrechen"));
}
