// Seiten „Düngeplanung“ (Übersicht je Jahr) und „Düngeplan“ (je Schlag): zulässige jahreswirksame N-Menge nach
// NAPV Anlage 3 und P/K-Empfehlung nach den Richtlinien für die sachgerechte Düngung (aus der letzten Bodenprobe).

import * as daten from "../core/daten.js";
import * as regeln from "../core/regeln.js";
import { aktiverBetrieb } from "../core/betrieb.js";
import { schlaegeImJahr, massnahmen, aktuellesJahr, datumText, haText, zahlText } from "../core/bestand.js";
import { gehaltsklassen, pkEmpfehlung } from "../core/boden.js";
import { gehe, parameter } from "../core/router.js";
import { h, karte, meldung } from "../core/ui/dom.js";
import { textfeld, auswahl, knopfauswahl, formular, abschnitt, werte, zeigeFehler, zahlAus, jaNeinAus, jaNeinWert } from "../core/ui/formular.js";
import { napvZeile, zeileNachId, istGruenlandZeile, duengeplan } from "./napv.js";
import { regelVersion } from "./erfassen.js";

const STUFE_TEXT = { niedrig: "Niedrig", mittel: "Mittel", hoch: "Hoch", hoch_1: "Hoch 1", hoch_2: "Hoch 2", hoch_3: "Hoch 3" };
const zw = (n) => (n == null ? "" : String(n).replace(".", ","));

/** Letzte Bodenprobe des Feldstücks (oder des Schlags). */
async function letzteProbe(eintrag) {
  if (!eintrag.feldstueck) return null;
  const proben = (await daten.liste("bodenprobe", { index: "feldstueck_id", wert: eintrag.feldstueck.id })).filter((p) => !p.schlag_id || p.schlag_id === eintrag.schlag.id);
  return proben.sort((a, b) => b.datum.localeCompare(a.datum))[0] ?? null;
}

export async function renderPlanung(ziel) {
  ziel.append(h("h1", {}, "Düngeplanung"));
  const betrieb = await aktiverBetrieb();
  if (!betrieb) return ziel.append(karte("Zuerst den Betrieb einrichten", h("a", { class: "knopf", href: "#/betrieb-bearbeiten" }, "Betrieb einrichten")));
  const jahr = Number(parameter().get("jahr")) || aktuellesJahr();
  const [eintraege, plaene, ms, regel] = await Promise.all([schlaegeImJahr(betrieb.id, jahr), daten.liste("duengeplan", { index: "betrieb_id", wert: betrieb.id }), massnahmen(betrieb.id, { art: "duengung" }), regeln.lade("napv/duengung")]);
  ziel.append(
    h("nav", { class: "jahreswahl", "aria-label": "Jahr" },
      h("a", { class: "knopf knopf-zweit knopf-klein", href: `#/duengeplanung?jahr=${jahr - 1}`, "aria-label": `Jahr ${jahr - 1}` }, "◀"),
      h("strong", {}, `Jahr ${jahr}`),
      h("a", { class: "knopf knopf-zweit knopf-klein", href: `#/duengeplanung?jahr=${jahr + 1}`, "aria-label": `Jahr ${jahr + 1}` }, "▶")),
    h("p", { class: "einleitung" }, `Wie viel jahreswirksamer Stickstoff ist je Schlag zulässig? Grundlage: Anlage 3 NAPV${betrieb.napv_gebiet_anlage5 ? " (Tabelle 2 für Gebiete nach Anlage 5)" : ""}. Ohne Plan prüft die App mit der Obergrenze der eingetragenen Ertragslage.`));
  if (!eintraege.length) return ziel.append(h("p", {}, `Für ${jahr} sind keine Schläge angelegt.`));
  const planVon = new Map(plaene.filter((p) => p.jahr === jahr && !p.geloescht).map((p) => [p.schlag_id, p]));
  ziel.append(h("ul", { class: "personenliste", "data-test": "planliste" }, eintraege.map((e) => {
    const plan = planVon.get(e.schlag.id);
    const gedüngt = ms.filter((m) => m.schlag_ids.includes(e.schlag.id) && m.datum.startsWith(String(jahr))).reduce((s, m) => s + (m.details?.naehrstoffe_kg_je_ha?.n_jahreswirksam ?? 0), 0);
    const zeile = plan?.napv_kultur ? zeileNachId(plan.napv_kultur, regel) : napvZeile(e.kultur, regel);
    const status = !plan ? { k: "status-neutral", t: "Noch kein Plan" } : gedüngt > plan.n_bedarf_kg_ha ? { k: "status-fehler", t: "Über dem Plan" } : { k: "status-ok", t: `Rest ${zahlText(plan.n_bedarf_kg_ha - gedüngt)} kg N/ha` };
    return h("li", {}, h("a", { class: "personenkarte", href: `#/duengeplan?schlag=${e.schlag.id}&jahr=${jahr}` },
      h("strong", {}, e.bezeichnung),
      h("span", {}, `${e.kultur?.name ?? "ohne Kultur"} · ${haText(e.schlag.flaeche_ha)}${zeile ? ` · NAPV: ${zeile.name}` : ""}`),
      h("small", {}, plan ? `Plan: ${zahlText(plan.n_bedarf_kg_ha)} kg N/ha · gedüngt: ${zahlText(gedüngt)} kg N/ha` : `Gedüngt: ${zahlText(gedüngt)} kg N/ha jahreswirksam`),
      h("span", { class: `status ${status.k}` }, status.t)));
  })));
}

export async function renderPlan(ziel) {
  const betrieb = await aktiverBetrieb();
  if (!betrieb) return gehe("duengeplanung");
  const p = parameter();
  const jahr = Number(p.get("jahr")) || aktuellesJahr();
  const [eintraege, plaene, regel, boden, ms] = await Promise.all([
    schlaegeImJahr(betrieb.id, jahr), daten.liste("duengeplan", { index: "schlag_id", wert: p.get("schlag") }),
    regeln.lade("napv/duengung"), regeln.lade("boden/gehaltsklassen"), massnahmen(betrieb.id, { schlagId: p.get("schlag") }),
  ]);
  const e = eintraege.find((x) => x.schlag.id === p.get("schlag"));
  if (!e) return gehe(`duengeplanung?jahr=${jahr}`);
  const alt = plaene.find((x) => x.jahr === jahr && !x.geloescht) ?? null;
  const probe = await letzteProbe(e);
  ziel.append(h("h1", {}, `Düngeplan ${e.bezeichnung}`), h("p", { class: "einleitung" }, `${e.kultur?.name ?? "ohne Kultur"} · ${haText(e.schlag.flaeche_ha)} · ${jahr}`));

  const alleZeilen = [...regel.werte.obergrenzen_acker, ...regel.werte.obergrenzen_gruenland];
  const vorschlag = alt?.napv_kultur ?? napvZeile(e.kultur, regel)?.id ?? "";
  // Bewässerungs-N des Jahres aus den Aufzeichnungen
  const bewN = ms.filter((m) => m.art === "bewaesserung" && m.datum.startsWith(String(jahr))).reduce((s, m) => s + (m.details?.n_kg_je_ha ?? 0), 0);
  const ergebnis = h("div", { "aria-live": "polite", "data-test": "plan-ergebnis" });
  const stufeFeld = h("div");
  const form = formular(
    { abbrechen: () => gehe(`duengeplanung?jahr=${jahr}`), beimSpeichern: (f) => speichern(f) },
    abschnitt("Kultur und Ertragslage",
      auswahl({ pfad: "napv_kultur", label: "Kultur laut NAPV Anlage 3", wert: vorschlag, pflicht: true, leer: "Bitte wählen …",
        optionen: alleZeilen.map((z) => ({ wert: z.id, text: z.name, gruppe: z.gruppe })), hilfe: vorschlag && !alt ? "Aus der Kultur des Schlags vorgeschlagen – bitte prüfen (z. B. Qualitätsweizen ≥ 14 % Rohprotein)." : "Nicht aufgelistete Kulturen: Werte aus der Fachliteratur (siehe Hinweis unten)." }),
      stufeFeld,
      textfeld({ pfad: "erwarteter_ertrag_t_ha", label: "Erwarteter Ertrag", wert: zw(alt?.erwarteter_ertrag_t_ha), inputmode: "decimal", maxlength: 8, hilfe: "Durchschnitt der letzten Jahre (Anlage 3 Abschnitt I)" }),
      knopfauswahl({ pfad: "anlage5", label: "Gebiet nach Anlage 5 NAPV?", wert: jaNeinWert(alt?.anlage5 ?? betrieb.napv_gebiet_anlage5 ?? false), optionen: [{ wert: "ja", text: "Ja" }, { wert: "nein", text: "Nein" }], hilfe: "Aus den Betriebsdaten übernommen" }),
      h("div", { "data-zusatz": "" })),
    abschnitt("Abzüge",
      auswahl({ pfad: "vorfrucht_wirkung", label: "Vorfrucht bzw. Ernterückstände", wert: alt?.vorfrucht_wirkung ?? "keine", leer: null,
        optionen: regel.werte.vorfruchtwirkung.map((v) => ({ wert: v.id, text: `${v.name} (${v.kg_n_ha} kg N)` })), hilfe: e.schlag.vorfrucht_name ? `Am Schlag eingetragene Vorfrucht: ${e.schlag.vorfrucht_name}` : "Anlage 3 Abschnitt III" }),
      textfeld({ pfad: "bewaesserung_kg_n_ha", label: "Stickstoff aus Bewässerung (kg N/ha)", wert: zw(alt?.bewaesserung_kg_n_ha ?? (bewN || "")), inputmode: "decimal", maxlength: 6,
        hilfe: bewN ? `Aus den Bewässerungen ${jahr} berechnet: ${zahlText(bewN)} kg. Abgezogen wird ab 10 kg.` : "Erst ab 10 kg N/ha abzuziehen (Anlage 3 Abschnitt IV)" }),
      textfeld({ pfad: "nmin_kg_n_ha", label: "Nmin laut Bodenprobe (kg N/ha)", wert: zw(alt?.nmin_kg_n_ha), inputmode: "decimal", maxlength: 6, hilfe: "Nur bei Gemüse vorgeschrieben (Anlage 3 Abschnitt II)" })),
    h("h2", {}, "Ergebnis"), ergebnis,
  );
  ziel.append(form, h("p", { class: "klein" }, regel.werte.obergrenzen_hinweis, " Hinweis, keine Rechtsauskunft. Quelle: ",
    h("a", { href: regel.werte.quellen.anl3.url, target: "_blank", rel: "noopener noreferrer" }, "Anlage 3 NAPV (RIS)")));

  const zeichneStufen = () => {
    const zeile = zeileNachId(form.querySelector('[name="napv_kultur"]').value, regel);
    const gl = zeile && istGruenlandZeile(zeile.id, regel);
    const stufen = zeile ? Object.entries(zeile.stufen) : [];
    const wert = alt?.ertragslage ?? (gl ? (e.schlag.ertragslage === "niedrig" ? "niedrig" : e.schlag.ertragslage?.startsWith("hoch") ? "hoch" : "mittel") : e.schlag.ertragslage ?? "mittel");
    stufeFeld.replaceChildren(stufen.length > 1
      ? auswahl({ pfad: "ertragslage", label: "Ertragslage", wert: stufen.some(([s]) => s === wert) ? wert : "mittel", leer: null,
        optionen: stufen.map(([s, x]) => ({ wert: s, text: `${STUFE_TEXT[s]} (${x.ertrag} ${zeile.ertrag_einheit}) – ${betrieb.napv_gebiet_anlage5 && x.n_anlage5 != null ? x.n_anlage5 : x.n} kg N` })),
        hilfe: "Ertragslage „hoch“ ist bei einer Ackerzahl unter 30 nicht zulässig." })
      : null);
    const zusatz = form.querySelector("[data-zusatz]");
    zusatz.replaceChildren(
      zeile?.ausnahme ? knopfauswahl({ pfad: "leguminosen_ausnahme", label: `Ausnahme: ${zeile.ausnahme.text}?`, wert: jaNeinWert(alt?.leguminosen_ausnahme ?? false), optionen: [{ wert: "ja", text: "Ja" }, { wert: "nein", text: "Nein" }] }) : "",
      zeile?.gunstlage_n ? knopfauswahl({ pfad: "gunstlage", label: "Intensiv genutzte Gunstlage (gräserbetont)?", wert: jaNeinWert(alt?.gunstlage ?? false), optionen: [{ wert: "ja", text: "Ja" }, { wert: "nein", text: "Nein" }] }) : "",
      zeile?.hinweis ? h("p", { class: "hinweis hinweis-info" }, zeile.hinweis) : "");
  };
  form.querySelector('[name="napv_kultur"]').addEventListener("change", () => { zeichneStufen(); rechne(); });
  zeichneStufen();

  function rechne() {
    const w = werte(form);
    const zeile = zeileNachId(w.napv_kultur, regel);
    const eingabe = {
      zeile, stufe: w.ertragslage ?? "mittel", anlage5: jaNeinAus(w.anlage5) === true, leguminosenAusnahme: jaNeinAus(w.leguminosen_ausnahme) === true, gunstlage: jaNeinAus(w.gunstlage) === true,
      vorfruchtKg: regel.werte.vorfruchtwirkung.find((v) => v.id === w.vorfrucht_wirkung)?.kg_n_ha ?? 0,
      bewaesserungKg: Number(zahlAus(w.bewaesserung_kg_n_ha)) || 0, nminKg: Number(zahlAus(w.nmin_kg_n_ha)) || 0,
    };
    const plan = zeile ? duengeplan(eingabe, regel) : null;
    const gk = probe ? gehaltsklassen(probe, boden) : null;
    const pk = zeile ? pkEmpfehlung(zeile.id, gk?.klassen, boden) : null;
    ergebnis.replaceChildren(
      plan ? h("div", { class: "hinweis hinweis-erfolg" },
        h("p", {}, h("strong", { "data-test": "n-bedarf" }, `Zulässig: ${zahlText(plan.n_bedarf)} kg jahreswirksamer N/ha`), ` · ${zahlText(plan.n_bedarf * e.schlag.flaeche_ha, 0)} kg am Schlag`),
        h("ul", {}, plan.rechenweg.map((r) => h("li", {}, r))))
        : h("p", { class: "hinweis hinweis-warnung" }, "Bitte Kultur und Ertragslage wählen."),
      h("h3", {}, "Phosphor und Kalium"),
      probe ? h("p", {}, `Bodenprobe vom ${datumText(probe.datum)}: P Klasse ${gk.klassen.p ?? "–"}, K Klasse ${gk.klassen.k ?? "–"}${gk.schwere_angenommen ? " (Bodenschwere „mittel“ angenommen)" : ""}.`)
        : h("p", {}, "Keine Bodenprobe für dieses Feldstück – Empfehlung für Gehaltsklasse C. ", h("a", { href: `#/bodenprobe?feldstueck=${e.feldstueck?.id ?? ""}` }, "Bodenprobe eintragen")),
      pk ? h("p", { "data-test": "pk-empfehlung" }, `Empfehlung: ${pk.p2o5} kg P₂O₅/ha und ${pk.k2o} kg K₂O/ha (Richtlinien für die sachgerechte Düngung, Tabellen 42 und 43, vereinfacht).`) : h("p", { class: "klein" }, "Für diese Kultur gibt es keinen P/K-Richtwert in der App."),
      gk && ["D", "E"].includes(gk.klassen.p) ? h("p", { class: "klein" }, "Bei Klasse D kann für Hackfrüchte eine halbe Gabe sinnvoll sein, wenn der wasserlösliche Phosphor unter dem Mindestgehalt liegt. Hofeigener Wirtschaftsdünger in Höhe des Entzugs ist tolerierbar.") : null);
    return { w, plan, pk, eingabe };
  }
  form.addEventListener("change", rechne);
  form.addEventListener("input", rechne);
  rechne();

  async function speichern(f) {
    const { w, plan, pk, eingabe } = rechne();
    if (!plan) return zeigeFehler(f, [{ pfad: "napv_kultur", art: "fachlich", meldung: "Bitte die Kultur laut NAPV wählen." }]);
    const neu = {
      ...(alt ?? {}), betrieb_id: betrieb.id, schlag_id: e.schlag.id, jahr, napv_kultur: w.napv_kultur, ertragslage: eingabe.stufe,
      anlage5: eingabe.anlage5, obergrenze_kg_n_ha: plan.obergrenze, vorfrucht_wirkung: w.vorfrucht_wirkung, vorfrucht_kg_n_ha: plan.abzug_vorfrucht,
      bewaesserung_kg_n_ha: eingabe.bewaesserungKg || undefined, nmin_kg_n_ha: eingabe.nminKg || undefined, n_bedarf_kg_ha: plan.n_bedarf,
      regeln: [regelVersion(regel), `${boden.name}@${boden.gueltig_ab}`],
    };
    const ertrag = zahlAus(w.erwarteter_ertrag_t_ha);
    if (ertrag !== undefined) neu.erwarteter_ertrag_t_ha = ertrag; else delete neu.erwarteter_ertrag_t_ha;
    for (const k of ["leguminosen_ausnahme", "gunstlage"]) { if (k in w) neu[k] = jaNeinAus(w[k]) === true; }
    if (pk) { neu.p2o5_empfehlung_kg_ha = pk.p2o5; neu.k2o_empfehlung_kg_ha = pk.k2o; }
    if (probe) neu.bodenprobe_id = probe.id;
    for (const k of Object.keys(neu)) if (neu[k] === undefined) delete neu[k];
    try {
      await daten.speichern("duengeplan", neu);
      meldung(`Düngeplan gespeichert: ${zahlText(plan.n_bedarf)} kg N/ha zulässig.`, "erfolg");
      gehe(`duengeplanung?jahr=${jahr}`);
    } catch (err) {
      if (err.name !== "ValidierungsFehler") throw err;
      zeigeFehler(f, err.fehler);
    }
  }
}
