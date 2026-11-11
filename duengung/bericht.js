// Seite „Düngebericht“: Jahresaufzeichnung nach § 8 Abs. 1 NAPV (und schlagbezogen nach § 9 Abs. 6), druckfreundlich.
// Als PDF: im Druckdialog „Als PDF speichern“ wählen.

import * as daten from "../core/daten.js";
import * as regeln from "../core/regeln.js";
import { aktiverBetrieb } from "../core/betrieb.js";
import { schlaegeImJahr, massnahmen, aktuellesJahr, datumText, haText, zahlText } from "../core/bestand.js";
import { massnahmeText } from "../core/massnahmen-text.js";
import { parameter } from "../core/router.js";
import { h, karte } from "../core/ui/dom.js";
import { jahresauswertung, zeileNachId } from "./napv.js";

const kg = (x) => (x == null ? "–" : `${zahlText(x)}`);

export async function renderBericht(ziel) {
  const betrieb = await aktiverBetrieb();
  if (!betrieb) return ziel.append(h("h1", {}, "Düngebericht"), karte("Zuerst den Betrieb einrichten", h("a", { class: "knopf", href: "#/betrieb-bearbeiten" }, "Betrieb einrichten")));
  const jahr = Number(parameter().get("jahr")) || aktuellesJahr() - (new Date().getMonth() === 0 ? 1 : 0);
  const [schlaege, ms, bm, plaene, regel] = await Promise.all([
    schlaegeImJahr(betrieb.id, jahr), massnahmen(betrieb.id), daten.liste("betriebsmittel", { index: "betrieb_id", wert: betrieb.id }),
    daten.liste("duengeplan", { index: "betrieb_id", wert: betrieb.id }), regeln.lade("napv/duengung"),
  ]);
  const a = jahresauswertung({ jahr, schlaege, massnahmen: ms, betriebsmittel: bm, plaene: plaene.filter((p) => !p.geloescht), betrieb, regel });

  ziel.append(
    h("h1", {}, `Düngeaufzeichnungen ${jahr}`),
    h("nav", { class: "jahreswahl nicht-drucken", "aria-label": "Jahr" },
      h("a", { class: "knopf knopf-zweit knopf-klein", href: `#/duengebericht?jahr=${jahr - 1}`, "aria-label": `Jahr ${jahr - 1}` }, "◀"),
      h("strong", {}, `Jahr ${jahr}`),
      h("a", { class: "knopf knopf-zweit knopf-klein", href: `#/duengebericht?jahr=${jahr + 1}`, "aria-label": `Jahr ${jahr + 1}` }, "▶")),
    h("div", { class: "knopfreihe nicht-drucken" }, h("button", { class: "knopf", type: "button", onclick: () => print(), "data-test": "drucken" }, "Drucken / als PDF speichern")),
    h("p", { class: "hinweis hinweis-info nicht-drucken" }, `Nach § 8 Abs. 3 NAPV bis 31. Jänner ${jahr + 1} abschließen und 7 Jahre aufbewahren.`),
    karte("Betrieb",
      h("dl", { class: "angaben" },
        h("dt", {}, "Betrieb"), h("dd", {}, betrieb.name),
        h("dt", {}, "Betriebsnummer"), h("dd", {}, betrieb.betriebsnummer ?? "–"),
        h("dt", {}, "Bewirtschafter"), h("dd", {}, betrieb.bewirtschafter?.name ?? "–"),
        h("dt", {}, "Gebiet nach Anlage 5"), h("dd", {}, a.anlage5 ? "Ja" : "Nein"),
        h("dt", {}, "LN laut Schlägen (ohne Alm)"), h("dd", { "data-test": "ln" }, haText(a.ln_ha)),
        h("dt", {}, "davon mit N-Düngung"), h("dd", {}, haText(a.ln_mit_n_ha)))),
    karte("Stickstoff aus Wirtschaftsdünger (§ 7 Abs. 1, § 8 Abs. 1 Z 2)",
      h("dl", { class: "angaben" },
        h("dt", {}, "Ausgebracht auf eigener LN"), h("dd", {}, `${zahlText(a.wd_n_kg, 0)} kg N (nach Stall- und Lagerverlusten)`),
        h("dt", {}, "je ha LN"), h("dd", { "data-test": "wd-je-ha" }, `${zahlText(a.wd_n_je_ha)} kg N/ha – Grenze ${a.wd_grenze} kg`),
        h("dt", {}, "Übernommen"), h("dd", {}, a.uebernahme.length ? a.uebernahme.map((u) => `${u.name} von ${u.partner}${u.n_kg != null ? ` (${zahlText(u.n_kg)} kg N)` : ""}`).join("; ") : "–"),
        h("dt", {}, "Am Betrieb angefallen"), h("dd", {}, "Berechnung aus dem Tierbestand nach Anlage 4 folgt mit dem Tiermodul (Roadmap V1-06).")),
      a.wd_n_je_ha > a.wd_grenze ? h("p", { class: "hinweis hinweis-fehler" }, `Die Grenze von ${a.wd_grenze} kg N/ha aus Wirtschaftsdünger ist überschritten.`) : null),
    karte("Jahreswirksamer Stickstoff (§ 8 Abs. 1 Z 3)", h("p", {}, `${zahlText(a.jahreswirksam_n_kg, 0)} kg N jahreswirksam auf ${haText(a.ln_mit_n_ha)} (Wirtschaftsdünger, organische und mineralische Dünger).`)),
  );

  const tabelle = h("table", { class: "rechnung", "data-test": "bericht-schlaege" },
    h("thead", {}, h("tr", {}, ...["Schlag", "Kultur, ha", "N-Bedarf", "N gesamt", "N jahresw.", "P₂O₅", "K₂O", "Bewässerung N", "Ernte", "Entzug", "Saldo"].map((t, i) => h("th", { class: i > 1 ? "zahl" : "" }, t)))),
    h("tbody", {}, a.proSchlag.map((s) => h("tr", {},
      h("td", {}, s.bezeichnung),
      h("td", {}, `${s.kultur?.name ?? "–"}, ${zahlText(s.schlag.flaeche_ha, 2)}`),
      h("td", { class: "zahl" }, s.plan ? kg(s.plan.n_bedarf_kg_ha) : "–"),
      h("td", { class: "zahl" }, kg(s.n_gesamt)),
      h("td", { class: "zahl" }, `${kg(s.n_jahreswirksam)}${s.unvollstaendig ? "*" : ""}${s.ueber_obergrenze ? " ⚠" : ""}`),
      h("td", { class: "zahl" }, kg(s.p2o5)), h("td", { class: "zahl" }, kg(s.k2o)),
      h("td", { class: "zahl" }, s.bewaesserung_n ? kg(s.bewaesserung_n) : "–"),
      h("td", { class: "zahl" }, s.ernte?.details?.ertrag ? `${zahlText(s.ernte.details.ertrag.wert)} ${s.ernte.details.ertrag.einheit === "dt_je_ha" ? "dt" : "t"}/ha` : "–"),
      h("td", { class: "zahl" }, kg(s.entzug)), h("td", { class: "zahl" }, kg(s.saldo))))));
  ziel.append(karte("Je Schlag (kg je ha)", h("div", { class: "tabelle-rahmen" }, tabelle),
    h("p", { class: "klein" }, "N-Bedarf aus dem Düngeplan (Anlage 3). * Bei mindestens einer Gabe fehlt die Düngerart laut NAPV – jahreswirksamer N unvollständig. ⚠ über dem Düngeplan. Entzug und Saldo (Anlage 3 Abschnitt V) nur, wenn Ertrag und – bei Weizen/Braugerste – Rohprotein eingetragen sind.")));

  const verzeichnis = a.proSchlag.filter((s) => s.ms.some((m) => ["duengung", "aussaat", "ernte", "bewaesserung"].includes(m.art)));
  ziel.append(karte("Ausbringungen, Anbau, Ernte und Bewässerung je Schlag (§ 9 Abs. 6)",
    verzeichnis.length ? verzeichnis.map((s) => h("div", {},
      h("h3", {}, `${s.bezeichnung} – ${s.kultur?.name ?? ""}${s.plan?.napv_kultur ? ` (NAPV: ${zeileNachId(s.plan.napv_kultur, regel)?.name ?? ""}, Ertragslage ${s.plan.ertragslage})` : ""}`),
      h("ul", { class: "liste-schlicht" }, s.ms.filter((m) => ["duengung", "aussaat", "ernte", "bewaesserung", "bodenbearbeitung"].includes(m.art)).sort((x, y) => x.datum.localeCompare(y.datum))
        .map((m) => h("li", {}, `${datumText(m.datum)}: ${massnahmeText(m)}`))),
      s.vegetationserneuerung.length ? h("p", { class: "klein" }, `Bodenbearbeitung zur Erneuerung der Vegetation (§ 8 Abs. 1 Z 7): ${s.vegetationserneuerung.map(datumText).join(", ")}`) : null))
      : h("p", {}, "Keine Aufzeichnungen in diesem Jahr.")));
  ziel.append(h("p", { class: "klein" }, `Erstellt mit AGRARDOK+ am ${datumText(new Date().toISOString())}. Regeln: ${regel.titel}, Stand ${datumText(regel.stand)} (${regel.quelle}). Hinweis, keine Rechtsauskunft.`));
}
