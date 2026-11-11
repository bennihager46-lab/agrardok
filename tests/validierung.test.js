import { gruppe, test, pruefe } from "./runner.js";
import * as validierung from "../core/validierung.js";
import { SAMMLUNG } from "../core/sicherung.js";

const ENTITAET_VON = Object.fromEntries(Object.entries(SAMMLUNG).map(([e, s]) => [s, e]));
const lade = async (datei) => (await fetch(`../testdaten/${datei}`)).json();
const kopie = (o) => JSON.parse(JSON.stringify(o));

/** Liefert die Fehler einer Entität als „pfad:art“-Liste – kompakt für Vergleiche. */
const kurz = (entitaet, wert) => validierung.pruefe(entitaet, wert).map((f) => `${f.pfad}:${f.art}`);

gruppe("validierung", () => {
  test("Schemas laden", async () => {
    await validierung.laden();
  });

  test("Alle Testdaten sind gültig (wie mit werkzeuge/pruefe_daten.py)", async () => {
    for (const datei of ["musterbetrieb.json", "biohof.json"]) {
      const exp = await lade(datei);
      pruefe.tiefGleich(validierung.pruefe("export", exp), [], `${datei} (Export als Ganzes):`);
      for (const [sammlung, liste] of Object.entries(exp.daten)) {
        for (const d of liste) pruefe.tiefGleich(kurz(ENTITAET_VON[sammlung], d), [], `${datei} ${sammlung} ${d.id}:`);
      }
    }
  });

  test("Dieselben 12 Fehlerfälle wie die Python-Prüfung werden erkannt", async () => {
    const exp = await lade("musterbetrieb.json");
    const M = (n) => kopie(exp.daten.massnahmen[n]);
    const faelle = [
      ["PSM ohne Zulassungsnummer", "massnahme", (() => { const m = M(4); delete m.details.mittel[0].zulassungsnummer; return m; })(), "details/mittel/0/zulassungsnummer:required"],
      ["Unbekanntes Feld in Maßnahme", "massnahme", { ...M(0), farbe: "rot" }, "farbe:unbekannt"],
      ["Unbekanntes Feld in Details", "massnahme", (() => { const m = M(1); m.details.xyz = 1; return m; })(), "details/xyz:unbekannt"],
      ["Düngung ohne Schlag", "massnahme", (() => { const m = M(1); delete m.schlag_ids; return m; })(), "schlag_ids:required"],
      ["PSM ohne Schlag und Ort", "massnahme", (() => { const m = M(4); delete m.schlag_ids; return m; })(), ":varianten"],
      ["Rind ohne Ohrmarke", "tier", (() => { const t = kopie(exp.daten.tiere[0]); delete t.ohrmarke; return t; })(), "ohrmarke:required"],
      ["PSM-Betriebsmittel ohne psm-Block", "betriebsmittel", (() => { const b = kopie(exp.daten.betriebsmittel[2]); delete b.psm; return b; })(), "psm:required"],
      ["Falsches Datum", "massnahme", { ...M(1), datum: "12.03.2026" }, "datum:format"],
      ["Ernte ohne kultur_name", "massnahme", (() => { const m = M(10); delete m.details.kultur_name; return m; })(), "details/kultur_name:required"],
      ["Bundesland ungültig", "betrieb", { ...kopie(exp.daten.betriebe[0]), bundesland: "Bayern" }, "bundesland:enum"],
      ["PSM Fläche ohne behandelte Fläche", "massnahme", (() => { const m = M(4); delete m.details.behandelte_flaeche_ha; return m; })(), "details/behandelte_flaeche_ha:required"],
    ];
    for (const [name, entitaet, wert, erwartet] of faelle) {
      const fehler = kurz(entitaet, wert);
      pruefe.wahr(fehler.includes(erwartet), `${name}: erwartet ${erwartet}, erhalten ${JSON.stringify(fehler)}`);
    }
    // Fall 12 (unbekannter Schlag) ist eine Verweisprüfung, keine Schema-Regel – siehe pruefe_daten.py
  });

  test("Betrieb: Bio braucht Kontrollstelle, konventionell nicht", async () => {
    const b = kopie((await lade("biohof.json")).daten.betriebe[0]);
    delete b.bio_kontrollstelle;
    pruefe.tiefGleich(kurz("betrieb", b), ["bio_kontrollstelle:required"]);
    pruefe.tiefGleich(kurz("betrieb", { ...b, bewirtschaftung: "umstellung" }), ["bio_kontrollstelle:required"]);
    pruefe.tiefGleich(kurz("betrieb", { ...b, bewirtschaftung: "konventionell" }), []);
  });

  test("Betrieb: Betriebsnummer genau 7 Ziffern, Bewirtschafter braucht Namen", async () => {
    const b = kopie((await lade("musterbetrieb.json")).daten.betriebe[0]);
    pruefe.tiefGleich(kurz("betrieb", { ...b, betriebsnummer: "123" }), ["betriebsnummer:pattern"]);
    pruefe.tiefGleich(kurz("betrieb", { ...b, betriebsnummer: "12345678" }), ["betriebsnummer:pattern"]);
    pruefe.tiefGleich(kurz("betrieb", { ...b, betriebsnummer: "123 4567" }), ["betriebsnummer:pattern"]);
    pruefe.tiefGleich(kurz("betrieb", { ...b, bewirtschafter: {} }), ["bewirtschafter/name:required"]);
    pruefe.tiefGleich(kurz("betrieb", { ...b, adresse: { plz: "12345" } }), ["adresse/plz:pattern"]);
    pruefe.tiefGleich(kurz("betrieb", { ...b, oepul_massnahmen: ["UBB"] }), ["oepul_massnahmen/0:pattern"]);
  });

  test("Person: Sachkundeausweis braucht Nummer und gültiges Datum", async () => {
    const p = kopie((await lade("musterbetrieb.json")).daten.personen[0]);
    pruefe.tiefGleich(kurz("person", { ...p, psm_ausbildungsbescheinigung: { nummer: "X1" } }), ["psm_ausbildungsbescheinigung/gueltig_bis:required"]);
    pruefe.tiefGleich(kurz("person", { ...p, psm_ausbildungsbescheinigung: { gueltig_bis: "2030-01-01" } }), ["psm_ausbildungsbescheinigung/nummer:required"]);
    // Schema „datum“ hat pattern UND format – beide schlagen an (wie bei Python-jsonschema); das Formular zeigt nur die erste Meldung
    pruefe.tiefGleich(kurz("person", { ...p, psm_ausbildungsbescheinigung: { nummer: "X1", gueltig_bis: "31.12.2029" } }),
      ["psm_ausbildungsbescheinigung/gueltig_bis:pattern", "psm_ausbildungsbescheinigung/gueltig_bis:format"]);
    pruefe.tiefGleich(kurz("person", { ...p, psm_ausbildungsbescheinigung: { nummer: "X1", gueltig_bis: "2026-02-30" } }), ["psm_ausbildungsbescheinigung/gueltig_bis:format"], "30. Februar:");
    pruefe.tiefGleich(kurz("person", { ...p, email: "kein-at-zeichen" }), ["email:pattern"]);
    pruefe.tiefGleich(kurz("person", { ...p, rolle: "chef" }), ["rolle:enum"]);
  });

  test("Fehler haben deutsche Meldungen", async () => {
    const [f] = validierung.pruefe("person", { id: "02000000-0000-4000-8000-000000000001", erstellt_am: "2026-01-01T00:00:00Z", geaendert_am: "2026-01-01T00:00:00Z", rev: 1, betrieb_id: "01000000-0000-4000-8000-000000000001", rolle: "familie" });
    pruefe.gleich(f.pfad, "name");
    pruefe.gleich(f.meldung, "Pflichtfeld – bitte ausfüllen.");
  });
});
