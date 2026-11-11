import { gruppe, test, pruefe } from "./runner.js";
import * as regeln from "../core/regeln.js";
import { zwischenfruechte, immergruenLuecken, bodennaheAusbringung } from "../oepul/auswertung.js";
import { parseCsv, automatischeZuordnung, vermuteOxid, erstelleVorschau, datum, zahl } from "../boden/csv.js";
import { psmStatus, zuletztVerwendet, sortiere, eppoCodes, naehrstoffText, pruefeFachlich, ausVorlage } from "../betriebsmittel/kontext.js";
import { findeSchlag } from "../feldnotiz/seiten.js";

const a = (art, d, details = {}) => ({ art, datum: d, details });

gruppe("oepul", () => {
  test("Zwischenfrucht: Ende, zu späte Anlage, zu früher Umbruch, Mischungspartner", async () => {
    const b = await regeln.lade("oepul/begruenung");
    const ms = [a("aussaat", "2026-08-25", { zwischenfrucht: true, begruenung_variante: 3, mischungspartner: 2 }), a("bodenbearbeitung", "2026-11-10", { zweck: "umbruch_zwischenfrucht" })];
    const [z] = zwischenfruechte(ms, 2026, b);
    pruefe.gleich(z.ende, "2026-11-15");
    pruefe.gleich(z.probleme.length, 3, z.probleme.join(" | "));
    const [ok] = zwischenfruechte([a("aussaat", "2026-08-10", { zwischenfrucht: true, begruenung_variante: 4, mischungspartner: 4 }), a("bodenbearbeitung", "2027-02-20", { zweck: "umbruch_zwischenfrucht" })], 2026, b);
    pruefe.tiefGleich(ok.probleme, []);
  });

  test("System Immergrün: Lücken über 30 bzw. 50 Tage", async () => {
    const b = await regeln.lade("oepul/begruenung");
    const luecke = immergruenLuecken([a("ernte", "2026-07-10", { hauptfrucht: true }), a("aussaat", "2026-08-20", { zwischenfrucht: true })], b);
    pruefe.gleich(luecke.length, 1);
    pruefe.gleich(luecke[0].tage, 41);
    pruefe.tiefGleich(immergruenLuecken([a("ernte", "2026-07-10", { hauptfrucht: true }), a("aussaat", "2026-08-05", { zwischenfrucht: true })], b), []);
    const hf = immergruenLuecken([a("ernte", "2026-07-10", { hauptfrucht: true }), a("aussaat", "2026-09-15", { kultur_name: "Raps" })], b);
    pruefe.gleich(hf[0]?.grenze, 50, "Ernte → nächste Hauptfrucht 67 Tage");
  });

  test("Bodennahe Ausbringung: nur flüssiger Wirtschaftsdünger in m³", () => {
    const ms = [
      a("duengung", "2026-04-15", { duenger_art: "wirtschaftsduenger", aufwand: { einheit: "m3_je_ha" }, ausbringtechnik: "schleppschlauch" }),
      a("duengung", "2026-05-15", { duenger_art: "wirtschaftsduenger", aufwand: { einheit: "m3_je_ha" }, ausbringtechnik: "breitverteiler" }),
      a("duengung", "2026-06-15", { duenger_art: "wirtschaftsduenger", aufwand: { einheit: "m3_je_ha" } }),
      a("duengung", "2026-03-12", { duenger_art: "mineralduenger", aufwand: { einheit: "kg_je_ha" } }),
    ];
    const b = bodennaheAusbringung(ms, 2026);
    pruefe.tiefGleich([b.gesamt.length, b.bodennah.length, b.breit.length, b.ohneTechnik.length], [3, 1, 1, 1]);
  });
});

gruppe("boden-import", () => {
  test("CSV: Trennzeichen, Dezimalkomma, Spalten, Feldstück nach Nummer oder Name", async () => {
    const csv = parseCsv(await (await fetch("../testdaten/bodenproben-beispiel.csv")).text());
    pruefe.gleich(csv.trenner, ";");
    const z = automatischeZuordnung(csv.kopf);
    pruefe.tiefGleich(Object.keys(z).sort(), ["datum", "feldstueck", "humus", "k", "mg", "p", "ph", "probennummer", "ton"]);
    pruefe.gleich(vermuteOxid(csv.kopf, z), false);
    const fs = [{ id: "a", nummer: 1, name: "Hausacker" }, { id: "b", nummer: 2, name: "Leiten" }, { id: "c", nummer: 3, name: "Großfeld" }, { id: "d", nummer: 4, name: "Bachwiese" }];
    const v = erstelleVorschau(csv, z, { feldstuecke: fs });
    pruefe.tiefGleich(v.map((r) => r.feldstueck?.id), ["a", "b", "c", "d"]);
    pruefe.tiefGleich(v[0].probe, { datum: "2024-03-12", probennummer: "FIKTIV-24-001", ph: 6.4, p_mg_kg: 95, k_mg_kg: 180, mg_mg_kg: 110, humus_prozent: 2.8, ton_prozent: 22 });
    pruefe.gleich(erstelleVorschau(csv, z, { feldstuecke: fs, oxid: true })[0].probe.p_mg_kg, 415, "95 mg P2O5/100 g × 4,364");
  });

  test("Datum und Zahl lesen; Anführungszeichen", () => {
    pruefe.tiefGleich([datum("12.3.2026"), datum("12.03.26"), datum("2026-03-12"), datum("März")], ["2026-03-12", "2026-03-12", "2026-03-12", null]);
    pruefe.tiefGleich([zahl("6,4"), zahl("< 5"), zahl(""), zahl("abc")], [6.4, 5, null, null]);
    const c = parseCsv('A,B\n"x, y",2\n');
    pruefe.tiefGleich(c.daten, [["x, y", "2"]]);
  });
});

gruppe("betriebsmittel", () => {
  const heute = new Date(2026, 10, 11);
  const psm = (p) => ({ art: "psm", name: "X", psm: { zulassungsnummer: "1", ...p } });
  test("PSM-Status: Zulassungsende, Aufbrauchfrist", () => {
    pruefe.gleich(psmStatus(psm({}), heute).stufe, "unbekannt");
    pruefe.gleich(psmStatus(psm({ zulassung_gueltig_bis: "2028-01-01" }), heute).stufe, "gueltig");
    pruefe.gleich(psmStatus(psm({ zulassung_gueltig_bis: "2027-02-09" }), heute).stufe, "bald", "90 Tage:");
    pruefe.gleich(psmStatus(psm({ zulassung_gueltig_bis: "2026-06-30" }), heute).stufe, "abgelaufen", "ohne Aufbrauchfrist:");
    pruefe.gleich(psmStatus(psm({ zulassung_gueltig_bis: "2026-06-30", aufbrauch_bis: "2027-06-30" }), heute).stufe, "aufbrauchen");
    pruefe.gleich(psmStatus(psm({ zulassung_gueltig_bis: "2025-06-30", aufbrauch_bis: "2026-11-10" }), heute).stufe, "abgelaufen", "Aufbrauchfrist gestern:");
    pruefe.gleich(psmStatus(psm({ zulassung_gueltig_bis: "2025-06-30", aufbrauch_bis: "2026-11-11" }), heute).stufe, "aufbrauchen", "bis einschließlich heute:");
  });

  test("Zuletzt verwendet oben, EPPO-Codes, Nährstofftext, fachliche Prüfung, Vorlage", () => {
    const ms = [
      { datum: "2026-04-01", details: { betriebsmittel_id: "a" } },
      { datum: "2026-05-01", details: { mittel: [{ betriebsmittel_id: "b" }, { betriebsmittel_id: "c" }] } },
      { datum: "2026-03-01", details: { saatgut_betriebsmittel_id: "a" } },
      { datum: "2026-09-01", geloescht: true, details: { betriebsmittel_id: "d" } },
    ];
    const z = zuletztVerwendet(ms);
    pruefe.tiefGleich([z.get("a"), z.get("b"), z.get("c"), z.has("d")], ["2026-04-01", "2026-05-01", "2026-05-01", false]);
    pruefe.tiefGleich(sortiere([{ id: "x", name: "Alpha" }, { id: "a", name: "Zeta" }, { id: "b", name: "Mitte" }], z).map((m) => m.id), ["b", "a", "x"]);
    pruefe.tiefGleich(eppoCodes("Wintergerste (HORVW), Winterroggen (SECCW), Moos-Arten (1BRYP, Bryophyta)"), ["HORVW", "SECCW", "1BRYP"]);
    pruefe.gleich(naehrstoffText({ bezug: "prozent", n_gesamt: 18, p2o5: 46 }), "18 % N · 46 % P₂O₅");
    pruefe.gleich(naehrstoffText({ bezug: "kg_je_m3", n_gesamt: 3, p2o5: 1.4 }), "N 3 · P₂O₅ 1,4 kg/m³");
    pruefe.gleich(pruefeFachlich({ duenger: { bezug: "kg_je_m3", n_gesamt: 3, nh4_n: 4 } })[0].pfad, "duenger/nh4_n");
    const v = ausVorlage({ id: "kas27", art: "mineralduenger", name: "KAS", duenger: { bezug: "prozent", n_gesamt: 27 } }, "B");
    pruefe.tiefGleich([v.vorlage, v.betrieb_id, "id" in v], ["kas27", "B", false]);
  });

  test("Vorlagen und Musterbetrieb sind schemagültig", async () => {
    const { pruefe: schema, laden } = await import("../core/validierung.js");
    await laden();
    const vorlagen = await regeln.lade("betriebsmittel/duenger-vorlagen");
    const basis = { id: "00000000-0000-4000-8000-000000000001", erstellt_am: "2026-01-01T00:00:00Z", geaendert_am: "2026-01-01T00:00:00Z", rev: 1 };
    for (const v of vorlagen.werte.filter((x) => x.duenger.n_gesamt != null)) {
      pruefe.tiefGleich(schema("betriebsmittel", { ...basis, ...ausVorlage(v, basis.id) }), [], v.id);
    }
  });
});

gruppe("feldnotiz", () => {
  test("Schlag aus GPS-Position: drin, sonst nächster", () => {
    const quadrat = (x, y) => ({ type: "Polygon", coordinates: [[[x, y], [x + 0.01, y], [x + 0.01, y + 0.01], [x, y + 0.01], [x, y]]] });
    const e = [
      { schlag: { id: "a", geometrie: quadrat(15, 48) }, bezeichnung: "A" },
      { schlag: { id: "b" }, feldstueck: { geometrie: quadrat(15.1, 48) }, bezeichnung: "B" },
    ];
    pruefe.gleich(findeSchlag([15.005, 48.005], e).eintrag.schlag.id, "a");
    pruefe.gleich(findeSchlag([15.105, 48.005], e).eintrag.schlag.id, "b", "Umriss des Feldstücks, wenn der Schlag keinen hat");
    const n = findeSchlag([15.2, 48.005], e);
    pruefe.wahr(n.eintrag.schlag.id === "b" && n.abstand > 5000, `nächster ${n.eintrag.schlag.id} ${Math.round(n.abstand)} m`);
  });
});
