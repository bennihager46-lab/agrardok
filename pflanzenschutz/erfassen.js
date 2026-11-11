// Seite „Pflanzenschutz erfassen“: Felder nach Anhang DVO (EU) 2023/564 (Art der Verwendung, Mittel und Zulassungsnummer,
// Datum/Uhrzeit, Menge, Fläche laut Mehrfachantrag, Kultur mit EPPO-Code und BBCH) plus Anwender:in und Gerät.

import * as daten from "../core/daten.js";
import * as regeln from "../core/regeln.js";
import { aktiverBetrieb } from "../core/betrieb.js";
import { schlaegeImJahr, massnahmen, aktuellesJahr, heute, datumText, haText } from "../core/bestand.js";
import { gehe, parameter } from "../core/router.js";
import { h, karte, meldung, bestaetige } from "../core/ui/dom.js";
import { textfeld, auswahl, knopfauswahl, formular, abschnitt, werte, zeigeFehler, zahlAus, wiederholung, leseWiederholung } from "../core/ui/formular.js";
import { schlagwahl, leseSchlagwahl } from "../core/ui/schlagwahl.js";
import { personenUndGeraete, wannWer, notizfeld, zeigeWarnungen, leseBestaetigungen, offeneBestaetigungen } from "../core/ui/aufzeichnung.js";
import { pruefeAnwendung, indikationenFuer } from "./pruefung.js";

const AUFWAND = [["l_je_ha", "l/ha"], ["kg_je_ha", "kg/ha"], ["l_je_m2", "l/m²"], ["kg_je_m2", "kg/m²"], ["l_je_m3", "l/m³ (Raum)"], ["l_je_t_saatgut", "l/t Saatgut"], ["kg_je_t_saatgut", "kg/t Saatgut"]].map(([wert, text]) => ({ wert, text }));
const VERWENDUNG = [{ wert: "flaeche", text: "Fläche (Acker, Grünland …)" }, { wert: "geschlossener_raum", text: "Geschlossener Raum (Lager, Gewächshaus)" }, { wert: "saatgut", text: "Saatgut bzw. Pflanzgut" }];
const zw = (n) => (n == null ? "" : String(n).replace(".", ","));

export async function renderPsmErfassen(ziel) {
  ziel.append(h("h1", {}, "Pflanzenschutz"));
  const betrieb = await aktiverBetrieb();
  if (!betrieb) return ziel.append(karte("Zuerst den Betrieb einrichten", h("a", { class: "knopf", href: "#/betrieb-bearbeiten" }, "Betrieb einrichten")));
  const p = parameter();
  const alt = p.get("id") ? await daten.hole("massnahme", p.get("id")) : null;
  if (p.get("id") && (!alt || alt.geloescht || alt.art !== "pflanzenschutz")) return gehe("aufzeichnen");
  const jahr = Number(alt?.datum?.slice(0, 4) ?? p.get("jahr")) || aktuellesJahr();
  const [eintraege, alleMs, bm, begruenung, { personen, maschinen }] = await Promise.all([
    schlaegeImJahr(betrieb.id, jahr), massnahmen(betrieb.id), daten.liste("betriebsmittel", { index: "betrieb_id", wert: betrieb.id }),
    regeln.lade("oepul/begruenung"), personenUndGeraete(betrieb.id),
  ]);
  const zuletzt = new Map();
  for (const m of alleMs) if (m.art === "pflanzenschutz") for (const x of m.details?.mittel ?? []) if (x.betriebsmittel_id && !zuletzt.has(x.betriebsmittel_id)) zuletzt.set(x.betriebsmittel_id, m.datum);
  const mittelListe = bm.filter((b) => b.art === "psm" && (b.aktiv !== false || alt?.details?.mittel?.some((x) => x.betriebsmittel_id === b.id)))
    .sort((a, b) => (zuletzt.get(b.id) ?? "").localeCompare(zuletzt.get(a.id) ?? "") || a.name.localeCompare(b.name, "de"));
  if (!mittelListe.length) {
    ziel.append(karte("Zuerst ein Pflanzenschutzmittel anlegen",
      h("p", {}, "Mittel werden einmal mit Zulassungsnummer, Fristen und Auflagen angelegt und dann hier gewählt."),
      h("a", { class: "knopf", href: "#/betriebsmittel-eintrag?art=psm" }, "Pflanzenschutzmittel anlegen")));
    return;
  }
  const bmVon = new Map(bm.map((b) => [b.id, b]));
  const letzte = alleMs.find((m) => m.art === "pflanzenschutz");
  const start = alt ?? (letzte ? { details: { verwendungsart: letzte.details.verwendungsart, wasser_l_je_ha: letzte.details.wasser_l_je_ha }, person_ids: letzte.person_ids, maschine_ids: letzte.maschine_ids } : { details: {} });
  const d = start.details ?? {};
  const mittelStart = alt?.details?.mittel ?? [{ betriebsmittel_id: mittelListe[0].id }];

  const warnBereich = h("div", { "aria-live": "polite" });
  const indBereich = h("div", { "aria-live": "polite" });
  const ortBereich = h("div");
  const form = formular(
    { abbrechen: () => history.back(), beimSpeichern: (f) => speichern(f) },
    abschnitt("Art der Verwendung",
      knopfauswahl({ pfad: "details/verwendungsart", label: "Wo wurde behandelt?", wert: d.verwendungsart ?? "flaeche", optionen: VERWENDUNG, beiAenderung: () => zeichneOrt() })),
    wiederholung({ pfad: "details/mittel", titel: "Mittel", eintraege: mittelStart, zeilenName: "Mittel", neuText: "Weiteres Mittel (Tankmischung)", minimum: 1,
      felder: (x, pr) => [
        auswahl({ pfad: `${pr}/betriebsmittel_id`, label: "Pflanzenschutzmittel", wert: x.betriebsmittel_id, optionen: mittelListe.map((b) => ({ wert: b.id, text: `${b.name} (${b.psm?.zulassungsnummer ?? "?"})` })), leer: "Bitte wählen …" }),
        h("div", { class: "feldraster" },
          textfeld({ pfad: `${pr}/aufwand/wert`, label: "Aufwandmenge", wert: zw(x.aufwand?.wert), inputmode: "decimal", maxlength: 10 }),
          auswahl({ pfad: `${pr}/aufwand/einheit`, label: "Einheit", wert: x.aufwand?.einheit ?? "l_je_ha", optionen: AUFWAND, leer: null })),
        textfeld({ pfad: `${pr}/charge`, label: "Chargennummer (sofern erforderlich)", wert: x.charge, maxlength: 40 })] }),
    textfeld({ pfad: "details/wasser_l_je_ha", label: "Wassermenge in l/ha", wert: zw(d.wasser_l_je_ha), inputmode: "decimal", maxlength: 6 }),
    ortBereich,
    abschnitt("Kultur und Grund",
      textfeld({ pfad: "details/kultur_name", label: "Kultur bzw. Einsatzort", wert: d.kultur_name, pflicht: true, maxlength: 120, hilfe: "Wird aus dem Schlag übernommen" }),
      h("div", { class: "feldraster" },
        textfeld({ pfad: "details/eppo_code", label: "EPPO-Code", wert: d.eppo_code, maxlength: 6, hilfe: "sofern zutreffend" }),
        textfeld({ pfad: "details/bbch", label: "BBCH-Stadium", wert: zw(d.bbch), inputmode: "numeric", maxlength: 2, hilfe: "sofern relevant" })),
      textfeld({ pfad: "details/grund", label: "Grund (Schaderreger, Unkraut, Krankheit)", wert: d.grund, maxlength: 200, pflicht: betrieb.bundesland === "T" }),
      indBereich),
    wannWer({ m: alt ?? { datum: heute(), person_ids: start.person_ids, maschine_ids: start.maschine_ids }, personen, maschinen, maschinenArten: ["feldspritze", "traktor", "sonstiges"],
      mitUhrzeit: true, personLabel: "Anwender:in" }),
    abschnitt("Notiz", notizfeld(alt ?? {})),
    h("h2", {}, "Prüfung"), warnBereich,
  );
  ziel.append(form);
  if (alt) ziel.append(h("button", { class: "knopf knopf-gefahr", type: "button", onclick: async () => {
    if (!await bestaetige(`Pflanzenschutz-Anwendung vom ${datumText(alt.datum)} löschen?`, { ja: "Löschen", gefahr: true })) return;
    await daten.loeschen("massnahme", alt.id);
    meldung("Anwendung gelöscht.", "info");
    history.back();
  } }, "Löschen"));

  function zeichneOrt() {
    const art = werte(form)["details/verwendungsart"];
    ortBereich.replaceChildren(art === "flaeche"
      ? schlagwahl({ eintraege, gewaehlt: alt?.schlag_ids ?? (p.get("schlag") ? [p.get("schlag")] : []), label: "Behandelte Schläge", hilfe: `Schläge ${jahr} – die Flächen aus dem Mehrfachantrag werden mitgespeichert.`, beiAenderung: () => kulturVorschlag() })
      : abschnitt("Ort und Menge",
        textfeld({ pfad: "ort", label: art === "saatgut" ? "Saatgut (Kultur/Partie)" : "Lager- bzw. Gewächshaus", wert: alt?.ort, pflicht: true, maxlength: 120 }),
        h("div", { class: "feldraster" },
          textfeld({ pfad: "details/behandelte_menge/wert", label: "Behandelte Menge", wert: zw(d.behandelte_menge?.wert), inputmode: "decimal", maxlength: 10 }),
          auswahl({ pfad: "details/behandelte_menge/einheit", label: "Einheit", wert: d.behandelte_menge?.einheit ?? (art === "saatgut" ? "t" : "m3"), optionen: [["t", "t"], ["kg", "kg"], ["m3", "m³"], ["stk", "Stück"]].map(([wert, text]) => ({ wert, text })), leer: null }))));
  }
  zeichneOrt();

  function kulturVorschlag() {
    const ids = leseSchlagwahl(form);
    const k = eintraege.find((e) => ids.includes(e.schlag.id))?.kultur;
    const name = form.querySelector('[name="details/kultur_name"]');
    const eppo = form.querySelector('[name="details/eppo_code"]');
    if (k && !name.dataset.geaendert) name.value = k.name;
    if (k?.eppo_code && !eppo.dataset.geaendert) eppo.value = k.eppo_code;
  }
  for (const n of ["details/kultur_name", "details/eppo_code"]) form.querySelector(`[name="${n}"]`).addEventListener("input", (e) => { e.target.dataset.geaendert = "1"; });
  if (!alt) kulturVorschlag();

  function lese() {
    const w = werte(form);
    const mittel = leseWiederholung(form, "details/mittel").map((x) => ({ bm: bmVon.get(x.betriebsmittel_id), aufwand: { wert: zahlAus(x["aufwand/wert"]), einheit: x["aufwand/einheit"] }, charge: x.charge }))
      .filter((x) => x.bm);
    const ids = w["details/verwendungsart"] === "flaeche" ? leseSchlagwahl(form) : [];
    return { w, mittel, ids, gewaehlt: eintraege.filter((e) => ids.includes(e.schlag.id)) };
  }

  function pruefe() {
    const { w, mittel, gewaehlt } = lese();
    const datum = w.datum || heute();
    const person = personen.find((x) => x.id === w.person_id);
    const maschine = maschinen.find((x) => x.id === w.maschine_id);
    const gemeinsam = { datum, person, maschine, betrieb, begruenung, bbch: zahlAus(w["details/bbch"]), uhrzeitStart: w.uhrzeit_start, grund: w["details/grund"], neu: !alt, heute: heute() };
    const gesammelt = new Map();
    let wartezeitEnde = null;
    const ziele = gewaehlt.length ? gewaehlt : [null];
    for (const e of ziele) {
      const ziel = e ? { ...e, massnahmen: alleMs.filter((m) => m.id !== alt?.id && m.schlag_ids?.includes(e.schlag.id)) } : null;
      const r = pruefeAnwendung({ ...gemeinsam, mittel, ziel });
      if (r.wartezeitEnde && (!wartezeitEnde || r.wartezeitEnde > wartezeitEnde)) wartezeitEnde = r.wartezeitEnde;
      for (const x of r.warnungen) {
        const k = `${x.code}|${x.text}`;
        if (!gesammelt.has(k)) gesammelt.set(k, { ...x, namen: [] });
        if (e) gesammelt.get(k).namen.push(e.bezeichnung);
      }
    }
    const warnungen = [...gesammelt.values()].map(({ namen, ...x }) => ({ ...x, bezug: gewaehlt.length > 1 && namen.length < gewaehlt.length + 1 && namen.length ? namen.join(", ") : undefined }));
    if (wartezeitEnde) warnungen.push({ code: "psm_wartezeit_ende", stufe: "info", text: `Wartezeit: Ernte frühestens am ${datumText(wartezeitEnde)}.` });
    zeigeWarnungen(warnBereich, warnungen, alt?.bestaetigungen);
    // Passende Indikationen anzeigen und leere Aufwandmenge mit der zugelassenen Höchstmenge vorbelegen
    const kultur = gewaehlt[0]?.kultur;
    const infos = [];
    leseWiederholung(form, "details/mittel").forEach((x, i) => {
      const b = bmVon.get(x.betriebsmittel_id);
      const ind = b && kultur ? indikationenFuer(b, kultur)[0] : null;
      if (!ind) return;
      const feld = form.querySelector(`[name="details/mittel/${i}/aufwand/wert"]`);
      if (feld && !feld.value && ind.aufwand) {
        feld.value = zw(ind.aufwand.wert);
        form.querySelector(`[name="details/mittel/${i}/aufwand/einheit"]`).value = ind.aufwand.einheit;
      }
      infos.push(h("li", {}, `${b.name}, Indikation ${ind.nr ?? ""}: ${ind.kulturen}${ind.aufwand ? ` · höchstens ${zw(ind.aufwand.wert)} ${ind.aufwand.einheit.replace("_je_", "/")}` : ""}${ind.wartezeit_tage != null ? ` · Wartezeit ${ind.wartezeit_tage} Tage` : ""}${ind.bbch_von != null ? ` · BBCH ${ind.bbch_von}–${ind.bbch_bis ?? ""}` : ""}`));
    });
    indBereich.replaceChildren(infos.length ? h("div", { class: "hinweis hinweis-info", "data-test": "indikation" }, h("strong", {}, "Eingetragene Zulassung:"), h("ul", {}, infos)) : "");
    return { warnungen, wartezeitEnde };
  }
  form.addEventListener("change", pruefe);
  form.addEventListener("input", pruefe);
  pruefe();

  async function speichern(f) {
    const { wartezeitEnde } = pruefe();
    const { w, mittel, ids, gewaehlt } = lese();
    const fehler = [];
    if (!mittel.length) fehler.push({ pfad: "details/mittel", art: "fachlich", meldung: "Bitte ein Mittel wählen." });
    mittel.forEach((x, i) => { if (typeof x.aufwand.wert !== "number") fehler.push({ pfad: `details/mittel/${i}/aufwand/wert`, art: "fachlich", meldung: "Bitte die Aufwandmenge eintragen." }); });
    if (w["details/verwendungsart"] === "flaeche" && !ids.length) fehler.push({ pfad: "schlag_ids", art: "fachlich", meldung: "Bitte mindestens einen Schlag wählen." });
    if (fehler.length) return zeigeFehler(f, fehler);
    if (offeneBestaetigungen(warnBereich).length) {
      meldung("Bitte die markierten Punkte bei „Prüfung“ lesen und bestätigen.", "warnung", 8000);
      warnBereich.querySelector("[data-bestaetigung]:not(:checked)")?.focus();
      return;
    }
    const flaeche = gewaehlt.reduce((s, e) => s + (e.schlag.flaeche_ha ?? 0), 0);
    const kultur = gewaehlt[0]?.kultur;
    const details = {
      verwendungsart: w["details/verwendungsart"],
      mittel: mittel.map((x) => {
        const ind = kultur ? indikationenFuer(x.bm, kultur)[0] : null;
        return { betriebsmittel_id: x.bm.id, name: x.bm.name, zulassungsnummer: x.bm.psm?.zulassungsnummer ?? "?", aufwand: x.aufwand,
          ...(x.charge ? { charge: x.charge } : {}), ...(ind?.wartezeit_tage != null ? { wartezeit_tage: ind.wartezeit_tage } : {}) };
      }),
      kultur_name: w["details/kultur_name"] || undefined,
    };
    const zahl = zahlAus(w["details/wasser_l_je_ha"]);
    if (zahl !== undefined) details.wasser_l_je_ha = zahl;
    if (details.verwendungsart === "flaeche") {
      details.behandelte_flaeche_ha = Math.round(flaeche * 100) / 100;
      const inv = gewaehlt.map((e) => e.schlag.invekos_flaeche_id).filter(Boolean);
      if (inv.length) details.invekos_flaeche_ids = inv;
    } else {
      const menge = zahlAus(w["details/behandelte_menge/wert"]);
      if (menge !== undefined) details.behandelte_menge = { wert: menge, einheit: w["details/behandelte_menge/einheit"] };
    }
    if (w["details/eppo_code"]) details.eppo_code = w["details/eppo_code"].toUpperCase();
    const bbch = zahlAus(w["details/bbch"]);
    if (bbch !== undefined) details.bbch = bbch;
    if (w["details/grund"]) details.grund = w["details/grund"];
    if (wartezeitEnde) details.wartezeit_ende = wartezeitEnde;
    const ind = kultur && mittel[0] ? indikationenFuer(mittel[0].bm, kultur)[0] : null;
    if (ind?.nr) details.indikation_nr = ind.nr;
    if (!details.kultur_name) delete details.kultur_name;

    const m = { ...(alt ?? {}), betrieb_id: betrieb.id, art: "pflanzenschutz", modul: "pflanzenschutz", status: "erledigt", datum: w.datum || undefined, details };
    if (ids.length) m.schlag_ids = ids; else delete m.schlag_ids;
    if (w.ort) m.ort = w.ort; else delete m.ort;
    for (const [k, v] of [["uhrzeit_start", w.uhrzeit_start], ["uhrzeit_ende", w.uhrzeit_ende], ["notiz", w.notiz]]) { if (v) m[k] = v; else delete m[k]; }
    if (w.person_id) m.person_ids = [w.person_id]; else delete m.person_ids;
    if (w.maschine_id) m.maschine_ids = [w.maschine_id]; else delete m.maschine_ids;
    const best = leseBestaetigungen(warnBereich);
    if (best.length) m.bestaetigungen = best; else delete m.bestaetigungen;
    try {
      await daten.speichern("massnahme", m);
      meldung(`Pflanzenschutz gespeichert${ids.length ? ` (${haText(flaeche)})` : ""}${wartezeitEnde ? ` – Ernte frühestens am ${datumText(wartezeitEnde)}` : ""}.`, "erfolg", 9000);
      gehe("aufzeichnen");
    } catch (e) {
      if (e.name !== "ValidierungsFehler") throw e;
      zeigeFehler(f, e.fehler, { "details/kultur_name": { required: "Bitte Kultur bzw. Einsatzort eintragen." }, ort: { required: "Bitte den Ort eintragen." } });
    }
  }
}
