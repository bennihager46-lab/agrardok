// Seiten „ÖPUL“ (nur die Maßnahmen, an denen der Betrieb teilnimmt) und „Fristen“ (Kalender aus allen Modulen, Erinnerungen).

import * as regeln from "../core/regeln.js";
import { aktiverBetrieb } from "../core/betrieb.js";
import { schlaegeImJahr, massnahmen, aktuellesJahr, datumText, haText } from "../core/bestand.js";
import { fristen, erinnerungenAktiv, erinnerungenEinschalten, erinnerungenAus, ERINNERN_TAGE } from "../core/fristen.js";
import { parameter } from "../core/router.js";
import { h, karte, meldung } from "../core/ui/dom.js";
import { zwischenfruechte, immergruenLuecken, bodennaheAusbringung } from "./auswertung.js";

const GEBAUT = new Set(["begruenung_zwischenfruchtanbau", "begruenung_system_immergruen", "bodennahe_ausbringung", "grundwasserschutz_acker"]);
const VORLAGEN = "https://www.ama.at/fachliche-informationen/oepul/merkblaetter";

function ohneBetrieb(ziel) {
  ziel.append(karte("Zuerst den Betrieb einrichten", h("a", { class: "knopf", href: "#/betrieb-bearbeiten" }, "Betrieb einrichten")));
}

export async function renderOepul(ziel) {
  ziel.append(h("h1", {}, "ÖPUL"));
  const betrieb = await aktiverBetrieb();
  if (!betrieb) return ohneBetrieb(ziel);
  const jahr = Number(parameter().get("jahr")) || aktuellesJahr();
  const [katalog, begruenung, eintraege, ms] = await Promise.all([regeln.lade("oepul/massnahmen"), regeln.lade("oepul/begruenung"), schlaegeImJahr(betrieb.id, jahr), massnahmen(betrieb.id)]);
  const gewaehlt = (betrieb.oepul_massnahmen ?? []).map((c) => katalog.werte.find((m) => m.code === c) ?? { code: c, name: c });
  ziel.append(
    h("nav", { class: "jahreswahl", "aria-label": "Jahr" },
      h("a", { class: "knopf knopf-zweit knopf-klein", href: `#/oepul?jahr=${jahr - 1}`, "aria-label": `Jahr ${jahr - 1}` }, "◀"),
      h("strong", {}, `Jahr ${jahr}`),
      h("a", { class: "knopf knopf-zweit knopf-klein", href: `#/oepul?jahr=${jahr + 1}`, "aria-label": `Jahr ${jahr + 1}` }, "▶")),
    h("p", { class: "einleitung" }, "Hier steht nur, was zu den ÖPUL-Maßnahmen Ihres Betriebs gehört. Die Maßnahmen wählen Sie unter Betrieb → Betriebsdaten."),
    h("a", { class: "knopf knopf-zweit", href: "#/fristen", "data-test": "zu-fristen" }, "Fristenkalender und Erinnerungen"));
  if (!gewaehlt.length) {
    ziel.append(karte("Keine ÖPUL-Maßnahmen gewählt", h("a", { class: "knopf", href: "#/betrieb-bearbeiten" }, "ÖPUL-Maßnahmen wählen")));
    return;
  }
  const msVon = (id) => ms.filter((m) => m.schlag_ids?.includes(id));
  const quelle = (text, url) => h("p", { class: "klein" }, "Quelle: ", h("a", { href: url, target: "_blank", rel: "noopener noreferrer" }, text));

  for (const m of gewaehlt) {
    const k = karte(m.name);
    k.dataset.massnahme = m.code;
    if (m.code === "begruenung_zwischenfruchtanbau") {
      const zeilen = eintraege.flatMap((e) => zwischenfruechte(msVon(e.schlag.id), jahr, begruenung).map((z) => ({ e, z })));
      k.append(
        h("p", {}, "Aufzeichnungen: Anlage der Zwischenfrucht mit Variante und Mischung, Umbruch nach dem Ende des Begrünungszeitraums. Im Begrünungszeitraum keine mineralischen N-Dünger, kein Pflanzenschutz (außer Variante 7), keine Bodenbearbeitung – das prüft die App bei der Erfassung."),
        zeilen.length ? h("ul", { class: "personenliste", "data-test": "zwischenfruechte" }, zeilen.map(({ e, z }) => h("li", {}, h("div", { class: "personenkarte" },
          h("strong", {}, `${e.bezeichnung} · ${z.variante ? `Variante ${z.variante}` : "ohne Variante"}`),
          h("span", {}, `Angelegt ${datumText(z.aussaat.datum)}${z.ende ? ` · Begrünung bis ${datumText(z.ende)}` : ""}${z.umbruch ? ` · Umbruch ${datumText(z.umbruch.datum)}` : ""}`),
          z.bedingung ? h("small", {}, z.bedingung) : null,
          ...z.probleme.map((p) => h("span", { class: "status status-fehler" }, p))))))
          : h("p", {}, `Für ${jahr} ist keine Zwischenfrucht eingetragen.`),
        h("a", { class: "knopf knopf-zweit", href: "#/massnahme-erfassen?art=aussaat" }, "Zwischenfrucht eintragen"),
        h("details", { class: "mehr" }, h("summary", {}, "Varianten im Überblick"),
          h("ul", {}, begruenung.werte.varianten.map((v) => h("li", {}, `Variante ${v.nr}: Anlage bis ${v.anlage_bis.split("-").reverse().join(".")}., ${v.ende.datum ? `Begrünung bis ${v.ende.datum.split("-").reverse().join(".")}.` : `frühestens ${v.ende.tage_nach_anlage} Tage nach Anlage, nicht vor ${v.ende.nicht_vor.split("-").reverse().join(".")}.`} – ${v.bedingung}`)))),
        quelle("AMA-Terminüberblick Zwischenfruchtanbau (22.07.2026)", begruenung.quelle));
    } else if (m.code === "begruenung_system_immergruen") {
      const acker = eintraege.filter((e) => e.feldstueck?.nutzungsart === "acker");
      const luecken = acker.flatMap((e) => immergruenLuecken(msVon(e.schlag.id).filter((x) => x.datum.slice(0, 4) >= String(jahr - 1) && x.datum.slice(0, 4) <= String(jahr)), begruenung).map((l) => ({ e, l })));
      k.append(
        h("p", {}, begruenung.werte.immergruen.text),
        h("p", {}, `Geprüft aus Ernte, Aussaat und Umbruch von ${acker.length} Ackerschlägen.`),
        luecken.length ? h("ul", { class: "warnliste", "data-test": "immergruen-luecken" }, luecken.map(({ e, l }) => h("li", { class: "stufe-warnung" },
          `${e.bezeichnung}: ${l.text} ${l.tage} Tage (${datumText(l.von)}–${datumText(l.bis)}) – höchstens ${l.grenze}.`)))
          : h("p", { class: "hinweis hinweis-erfolg" }, "Keine zu langen Lücken gefunden (soweit Ernte, Aussaat und Umbruch eingetragen sind)."),
        quelle("LK OÖ: Begrünung von Ackerflächen im ÖPUL (09.06.2026)", begruenung.quelle_weitere[1]));
    } else if (m.code === "bodennahe_ausbringung") {
      const b = bodennaheAusbringung(ms, jahr);
      k.append(
        h("p", {}, "Aufzeichnungen je Schlag: Menge und Art des flüssigen Wirtschaftsdüngers (inkl. Biogasgülle), Datum, Ausbringungsverfahren. Das steht in jeder Düngung, wenn die Ausbringtechnik gewählt ist."),
        h("p", { "data-test": "bodennah" }, `${b.gesamt.length} Ausbringungen flüssiger Wirtschaftsdünger ${jahr}, davon ${b.bodennah.length} bodennah.`),
        b.ohneTechnik.length ? h("p", { class: "hinweis hinweis-warnung" }, `${b.ohneTechnik.length} Ausbringung(en) ohne angegebene Technik – bitte nachtragen.`) : null,
        b.breit.length ? h("p", { class: "hinweis hinweis-info" }, `${b.breit.length} Ausbringung(en) mit Breitverteiler bzw. sonstiger Technik.`) : null,
        quelle("LK NÖ: ÖPUL 2023 – Maßnahmen mit Aufzeichnungspflichten (2023, Stand nicht geprüft)", "https://noe.lko.at/öpul-2023-maßnahmen-mit-aufzeichnungspflichten+2400+3778095"));
    } else if (m.code === "grundwasserschutz_acker") {
      k.append(
        h("p", {}, "Düngeplanung bis 28. Februar, N-Bilanz je Schlag bis 31. Jänner des Folgejahres, elektronisch; Einträge binnen 14 Tagen. N-Überschuss über 10 kg ist bei der Folgekultur anzurechnen."),
        h("div", { class: "knopfreihe" }, h("a", { class: "knopf knopf-zweit", href: `#/duengeplanung?jahr=${jahr}` }, "Düngeplanung"), h("a", { class: "knopf knopf-zweit", href: `#/duengebericht?jahr=${jahr}` }, "N-Bilanz (Düngebericht)")),
        quelle("AMA-Merkblatt Vorbeugender Grundwasserschutz Acker", "https://www.ama.at/media/cdyhus10/o6_16_vorbeugender_grundwasserschutz_acker_2026_04.pdf"));
    } else {
      k.append(m.aufzeichnungen
        ? h("p", {}, "Für diese Maßnahme gibt es laut LK NÖ (2023) eigene Aufzeichnungen, die AGRARDOK+ noch nicht unterstützt. Bitte die Aufzeichnungsvorlage der AMA verwenden. ", m.code.startsWith("tierwohl") ? "Ein Weidetagebuch folgt mit dem Tiermodul (Roadmap V1-07)." : "")
        : h("p", {}, "Keine maßnahmenspezifischen Aufzeichnungen bekannt."),
        h("p", { class: "klein" }, h("a", { href: VORLAGEN, target: "_blank", rel: "noopener noreferrer" }, "AMA-Merkblätter und Vorlagen ↗")));
    }
    if (!GEBAUT.has(m.code)) k.classList.add("karte-leise");
    ziel.append(k);
  }
  ziel.append(h("p", { class: "klein" }, `ÖPUL ist eine freiwillige Förderverpflichtung; maßgeblich sind Sonderrichtlinie und AMA-Merkblätter. Hinweis, keine Förderberatung. Schläge ${jahr}: ${eintraege.length} (${haText(eintraege.reduce((s, e) => s + (e.schlag.flaeche_ha ?? 0), 0))}).`));
}

export async function renderFristen(ziel) {
  ziel.append(h("h1", {}, "Fristen"));
  const betrieb = await aktiverBetrieb();
  if (!betrieb) return ohneBetrieb(ziel);
  const liste = await fristen(betrieb, { tage: 365 });
  const aktiv = await erinnerungenAktiv();
  const unterstuetzt = typeof Notification !== "undefined";
  ziel.append(karte("Erinnerungen",
    h("p", {}, unterstuetzt
      ? `Die App erinnert ${ERINNERN_TAGE} Tage vor einer Frist mit einer Benachrichtigung – jedes Mal, wenn Sie AGRARDOK+ öffnen. Ohne Server sind keine Erinnerungen bei geschlossener App möglich.`
      : "Dieser Browser kann keine Benachrichtigungen anzeigen. Die Fristen stehen trotzdem hier und auf der Startseite."),
    unterstuetzt ? h("button", { class: aktiv ? "knopf knopf-zweit" : "knopf", type: "button", "data-test": "erinnerungen", onclick: async () => {
      try {
        if (aktiv) { await erinnerungenAus(); meldung("Erinnerungen ausgeschaltet.", "info"); }
        else { await erinnerungenEinschalten(); meldung("Erinnerungen eingeschaltet.", "erfolg"); }
        location.reload();
      } catch (e) { meldung(e.message, "fehler", 10000); }
    } }, aktiv ? "Erinnerungen ausschalten" : "Erinnerungen einschalten") : null));
  if (!liste.length) return ziel.append(h("p", {}, "In den nächsten 12 Monaten sind keine Fristen bekannt."));
  const monate = new Map();
  for (const f of liste) {
    const m = f.datum.slice(0, 7);
    if (!monate.has(m)) monate.set(m, []);
    monate.get(m).push(f);
  }
  for (const [monat, fs] of monate) {
    const titel = new Date(`${monat}-01T12:00:00`).toLocaleDateString("de-AT", { month: "long", year: "numeric" });
    ziel.append(h("h2", {}, titel), h("ul", { class: "zeitachse", "data-test": "fristen" }, fs.map((f) => h("li", {}, (f.href ? (x) => h("a", { href: f.href }, ...x) : (x) => h("div", { class: "eintrag" }, ...x))([
      h("strong", {}, `${datumText(f.datum)} · ${f.titel}`),
      f.text ? h("span", {}, f.text) : null,
      f.quelle ? h("small", {}, f.quelle.text) : null,
    ])))));
  }
}
