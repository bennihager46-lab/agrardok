import { gruppe, test, pruefe } from "./runner.js";
import * as regeln from "../core/regeln.js";
import { pruefeAnwendung, passtZurKultur, exportZeilen, alsCsv } from "../pflanzenschutz/pruefung.js";
import { gehaltsklassen, klasseAus, pkEmpfehlung, phReaktion } from "../core/boden.js";
import { punktInGeometrie } from "../core/geo/punkt.js";

const WEIZEN = { name: "Winterweichweizen", eppo_code: "TRZAW" };
const MITTEL = {
  id: "m1", name: "Herbizid X", art: "psm",
  psm: { zulassungsnummer: "1234-0", zulassung_gueltig_bis: "2028-06-30",
    indikationen: [{ nr: "1", kulturen: "Winterweichweizen (TRZAW), Wintergerste (HORVW)", eppo_codes: ["TRZAW", "HORVW"], aufwand: { wert: 0.9, einheit: "l_je_ha" }, max_anwendungen: 1, wartezeit_tage: 42, bbch_von: 13, bbch_bis: 29 }],
    auflagen: [{ art: "gewaesser", code: "SPe 3", text: "Abstand zu Oberflächengewässern", abstand_m: 10 }] },
};
const ziel = (extra = {}) => ({ schlag: { id: "s1" }, kultur: WEIZEN, feldstueck: { nutzungsart: "acker" }, bezeichnung: "Großfeld", massnahmen: [], ...extra });
const anna = { name: "Anna", psm_ausbildungsbescheinigung: { nummer: "X", gueltig_bis: "2029-12-31" } };
const codes = (r) => r.warnungen.map((w) => w.code);
const pr = (o) => pruefeAnwendung({ datum: "2026-04-10", mittel: [{ bm: MITTEL, aufwand: { wert: 0.9, einheit: "l_je_ha" } }], ziel: ziel(), person: anna, bbch: 20, ...o });

gruppe("pflanzenschutz", () => {
  test("Zulassung für die Kultur über EPPO-Code oder Name", () => {
    pruefe.wahr(passtZurKultur(MITTEL.psm.indikationen[0], WEIZEN));
    pruefe.wahr(passtZurKultur({ kulturen: "Winterweichweizen" }, { name: "Winterweichweizen" }));
    pruefe.wahr(!passtZurKultur(MITTEL.psm.indikationen[0], { name: "Mais", eppo_code: "ZEAMX" }));
  });

  test("Saubere Anwendung: Wartezeit-Ende, keine Fehler", () => {
    const r = pr({});
    pruefe.gleich(r.wartezeitEnde, "2026-05-22", "10.4. + 42 Tage:");
    pruefe.wahr(!r.warnungen.some((w) => w.stufe === "fehler"), codes(r).join(","));
  });

  test("Fehler: nicht zugelassene Kultur, zu viel Aufwand, BBCH, zu viele Anwendungen, Ernte in der Wartezeit", () => {
    pruefe.wahr(codes(pr({ ziel: ziel({ kultur: { name: "Mais", eppo_code: "ZEAMX" } }) })).includes("psm_nicht_zugelassen_m1"));
    pruefe.wahr(codes(pr({ mittel: [{ bm: MITTEL, aufwand: { wert: 1.2, einheit: "l_je_ha" } }] })).includes("psm_aufwand_m1"));
    pruefe.wahr(codes(pr({ bbch: 32 })).includes("psm_bbch_m1"));
    const vorher = [{ art: "pflanzenschutz", datum: "2026-03-20", details: { mittel: [{ betriebsmittel_id: "m1" }] } }];
    pruefe.wahr(codes(pr({ ziel: ziel({ massnahmen: vorher }) })).includes("psm_max_m1"));
    pruefe.wahr(codes(pr({ ziel: ziel({ massnahmen: [{ art: "ernte", datum: "2026-05-01" }] }) })).includes("psm_wartezeit_m1"));
  });

  test("Zulassung abgelaufen, Gewässerauflage, Sachkunde, Geräteprüfung, Tirol", () => {
    const alt = { ...MITTEL, psm: { ...MITTEL.psm, zulassung_gueltig_bis: "2025-01-31" } };
    pruefe.wahr(codes(pr({ mittel: [{ bm: alt, aufwand: { wert: 0.5, einheit: "l_je_ha" } }] })).includes("psm_zulassung_m1"));
    pruefe.wahr(codes(pr({ ziel: ziel({ feldstueck: { grenzt_an_gewaesser: true } }) })).includes("psm_abstand_m1"));
    pruefe.wahr(codes(pr({ person: { name: "Maria", psm_ausbildungsbescheinigung: { nummer: "Y", gueltig_bis: "2025-06-30" } } })).includes("psm_sachkunde"));
    pruefe.wahr(codes(pr({ maschine: { name: "Spritze", art: "feldspritze", geraetepruefung: { gueltig_bis: "2026-01-01" } } })).includes("psm_geraet"));
    pruefe.wahr(codes(pr({ betrieb: { bundesland: "T" } })).includes("psm_grund_tirol"));
    pruefe.wahr(!codes(pr({ betrieb: { bundesland: "T" }, grund: "Windhalm" })).includes("psm_grund_tirol"));
  });

  test("ÖPUL: kein PSM auf laufender Begrünung (außer Variante 7)", async () => {
    const b = await regeln.lade("oepul/begruenung");
    const zf = (v) => ziel({ massnahmen: [{ art: "aussaat", datum: "2026-08-20", details: { zwischenfrucht: true, begruenung_variante: v } }] });
    const betrieb = { oepul_massnahmen: ["begruenung_zwischenfruchtanbau"] };
    pruefe.wahr(codes(pr({ datum: "2026-10-01", ziel: zf(4), begruenung: b, betrieb })).includes("oepul_begruenung_psm"));
    pruefe.wahr(!codes(pr({ datum: "2026-10-01", ziel: zf(7), begruenung: b, betrieb })).includes("oepul_begruenung_psm"));
  });

  test("CSV-Export: Semikolon, Dezimalkomma, je Schlag eine Zeile", () => {
    const m = { datum: "2026-04-10", uhrzeit_start: "07:30", schlag_ids: ["a", "b"], person_ids: ["p"], details: { verwendungsart: "flaeche", kultur_name: "Weizen; Winter", mittel: [{ name: "X", zulassungsnummer: "1-0", aufwand: { wert: 0.9, einheit: "l_je_ha" } }] } };
    const z = exportZeilen([m], { schlagVon: new Map([["a", { bezeichnung: "A", schlag: { flaeche_ha: 1.5 } }], ["b", { bezeichnung: "B", schlag: { flaeche_ha: 2 } }]]), personVon: new Map([["p", { name: "Anna" }]]), maschineVon: new Map() });
    pruefe.gleich(z.length, 2);
    const csv = alsCsv(z);
    pruefe.wahr(csv.startsWith("﻿Datum;"), "BOM und Kopfzeile");
    pruefe.wahr(csv.includes(";0,9;l/ha;"), "Dezimalkomma");
    pruefe.wahr(csv.includes('"Weizen; Winter"'), "Semikolon im Text wird in Anführungszeichen gesetzt");
  });
});

gruppe("boden", () => {
  test("Gehaltsklassen P, K, Mg nach den Richtlinien für die sachgerechte Düngung", async () => {
    const r = await regeln.lade("boden/gehaltsklassen");
    pruefe.gleich(klasseAus(25, [26, 47, 112, 175]), "A");
    pruefe.gleich(klasseAus(26, [26, 47, 112, 175]), "B");
    pruefe.gleich(klasseAus(111, [26, 47, 112, 175]), "C");
    pruefe.gleich(klasseAus(175, [26, 47, 112, 175]), "E");
    pruefe.tiefGleich(gehaltsklassen({ nutzung: "acker", bodenschwere: "mittel", p_mg_kg: 80, k_mg_kg: 220, mg_mg_kg: 120 }, r).klassen, { p: "C", k: "D", mg: "D" });
    pruefe.gleich(gehaltsklassen({ nutzung: "gruenland", p_mg_kg: 80 }, r).klassen.p, "D", "Grünland: Klasse C endet bei 68");
    pruefe.gleich(gehaltsklassen({ nutzung: "acker", ton_prozent: 30, k_mg_kg: 240 }, r).klassen.k, "C", "schwerer Boden aus Tongehalt");
    pruefe.wahr(gehaltsklassen({ nutzung: "acker", k_mg_kg: 200 }, r).schwere_angenommen);
    pruefe.gleich(phReaktion(6.8, r), "neutral");
    pruefe.gleich(phReaktion(5.0, r), "sauer");
  });

  test("P/K-Empfehlung mit Korrekturfaktor", async () => {
    const r = await regeln.lade("boden/gehaltsklassen");
    pruefe.tiefGleich(pkEmpfehlung("koernermais", { p: "C", k: "C" }, r), { p2o5: 85, k2o: 200, ohne_probe: false });
    pruefe.tiefGleich(pkEmpfehlung("koernermais", { p: "A", k: "E" }, r), { p2o5: 128, k2o: 0, ohne_probe: false });
    pruefe.gleich(pkEmpfehlung("weizen_rp_unter14", null, r).ohne_probe, true);
    pruefe.gleich(pkEmpfehlung("wiese_3_klee", { p: "C" }, r), null);
  });

  test("Punkt in Fläche (mit Loch)", () => {
    const g = { type: "Polygon", coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]], [[4, 4], [6, 4], [6, 6], [4, 6], [4, 4]]] };
    pruefe.wahr(punktInGeometrie([1, 1], g));
    pruefe.wahr(!punktInGeometrie([5, 5], g), "im Loch");
    pruefe.wahr(!punktInGeometrie([11, 5], g));
    pruefe.wahr(punktInGeometrie([1, 1], { type: "MultiPolygon", coordinates: [g.coordinates] }));
  });
});
