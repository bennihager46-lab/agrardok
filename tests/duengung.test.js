import { gruppe, test, pruefe } from "./runner.js";
import * as regeln from "../core/regeln.js";
import {
  imZeitraum, nutzungsklasse, naehrstoffe, bewaesserungN, obergrenze, duengeplan, entzug, pruefeAusbringung,
  begruenungEnde, begruenungAktiv, zeileNachId, napvZeile, jahresauswertung,
} from "../duengung/napv.js";

const KAS = { bezug: "prozent", n_gesamt: 27, napv_typ: "mineralisch" };
const GUELLE = { bezug: "kg_je_m3", n_gesamt: 3, p2o5: 1.4, k2o: 4.6, napv_typ: "rinderguelle" };
const MIST = { bezug: "kg_je_t", n_gesamt: 5, napv_typ: "stallmist" };
const acker = (kultur = { mfa_code: "138", kategorie: "getreide" }, fs = { nutzungsart: "acker" }) => ({ schlag: { flaeche_ha: 2 }, kultur, feldstueck: fs, massnahmen: [] });
const codes = (w) => w.map((x) => x.code);

gruppe("duengung", () => {
  test("Regeldatei: alle Obergrenzen vollständig, jede Quelle mit Link", async () => {
    const r = await regeln.lade("napv/duengung");
    for (const z of [...r.werte.obergrenzen_acker, ...r.werte.obergrenzen_gruenland]) {
      pruefe.wahr(Object.keys(z.stufen).length > 0, `${z.id} ohne Stufen`);
      for (const s of Object.values(z.stufen)) pruefe.wahr(typeof s.n === "number", `${z.id}: n fehlt`);
    }
    for (const q of Object.values(r.werte.quellen)) pruefe.wahr(q.url.startsWith("https://www.ris.bka.gv.at/"), q.text);
    pruefe.gleich(r.werte.wirtschaftsduenger_obergrenze_kg_n_ha, 170);
  });

  test("Zeitraum über den Jahreswechsel", () => {
    pruefe.wahr(imZeitraum("2026-01-10", "10-16", "02-15"));
    pruefe.wahr(imZeitraum("2026-10-16", "10-16", "02-15"));
    pruefe.wahr(imZeitraum("2026-02-15", "10-16", "02-15"), "15.2. noch gesperrt");
    pruefe.wahr(!imZeitraum("2026-02-16", "10-16", "02-15"));
    pruefe.wahr(imZeitraum("2026-10-05", "10-01", "11-29"));
  });

  test("Nutzungsklasse nach § 2", () => {
    pruefe.gleich(nutzungsklasse({ kultur: { kategorie: "getreide" }, feldstueck: { nutzungsart: "acker" } }), "acker");
    pruefe.gleich(nutzungsklasse({ kultur: { kategorie: "feldfutter" }, feldstueck: { nutzungsart: "acker" } }), "gruenland", "Ackerfutter wie Grünland:");
    pruefe.gleich(nutzungsklasse({ kultur: { kategorie: "dauerkultur" }, feldstueck: { nutzungsart: "dauerkultur" } }), "sonstige");
  });

  test("Nährstoffe: Mineraldünger, Gülle, Mist (§ 1 Z 14, Anlage 2)", async () => {
    const r = await regeln.lade("napv/duengung");
    const kas = naehrstoffe(KAS, { wert: 150, einheit: "kg_je_ha" }, r);
    pruefe.tiefGleich([kas.n_gesamt, kas.n_jahreswirksam, kas.n_leichtloeslich, kas.loeslich], [40.5, 40.5, 40.5, "leichtloeslich"]);
    const g = naehrstoffe(GUELLE, { wert: 20, einheit: "m3_je_ha" }, r);
    pruefe.gleich(g.n_gesamt, 60);
    pruefe.gleich(g.n_jahreswirksam, 36.5, "60 × (1 − 0,13) × 0,70 =");
    pruefe.gleich(g.n_leichtloeslich, 30, "Ammoniumanteil Rindergülle 50 %:");
    pruefe.tiefGleich([g.p2o5, g.k2o], [28, 92]);
    pruefe.gleich(naehrstoffe({ ...GUELLE, nh4_n: 1.6 }, { wert: 20, einheit: "m3_je_ha" }, r).n_leichtloeslich, 32, "gemessenes NH4-N geht vor:");
    const m = naehrstoffe(MIST, { wert: 30, einheit: "t_je_ha" }, r);
    pruefe.tiefGleich([m.n_gesamt, m.n_jahreswirksam, m.loeslich], [150, 68.3, "langsamloeslich"]);
    pruefe.gleich(naehrstoffe({ ...KAS, napv_typ: undefined }, { wert: 100, einheit: "kg_je_ha" }, r).n_jahreswirksam, null, "ohne Düngerart kein jahreswirksamer N:");
    pruefe.wahr(naehrstoffe(GUELLE, { wert: 100, einheit: "kg_je_ha" }, r).fehler.includes("m³"), "unpassende Einheit wird gemeldet");
    const ahl = naehrstoffe({ bezug: "prozent", n_gesamt: 28, dichte_kg_je_l: 1.28, napv_typ: "mineralisch" }, { wert: 100, einheit: "l_je_ha" }, r);
    pruefe.gleich(ahl.n_gesamt, 35.8, "100 l AHL × 1,28 kg/l × 28 % =");
  });

  test("Bewässerung, Obergrenze, Düngeplan, Entzug (Anlage 3)", async () => {
    const r = await regeln.lade("napv/duengung");
    pruefe.gleich(bewaesserungN(50, 30), 3.4);
    const weizen = zeileNachId("weizen_rp_unter14", r);
    pruefe.gleich(obergrenze(weizen, { stufe: "mittel" }), 145);
    pruefe.gleich(obergrenze(weizen, { stufe: "mittel", anlage5: true }), 130);
    pruefe.gleich(obergrenze(zeileNachId("leguminosen", r), { stufe: "mittel", leguminosenAusnahme: true }), 60);
    pruefe.gleich(obergrenze(zeileNachId("wiese_5_gras", r), { stufe: "hoch", gunstlage: true }), 240);
    pruefe.gleich(duengeplan({ zeile: weizen, stufe: "mittel", vorfruchtKg: 20, bewaesserungKg: 12 }, r).n_bedarf, 113);
    pruefe.gleich(duengeplan({ zeile: weizen, stufe: "mittel", vorfruchtKg: 20, bewaesserungKg: 5 }, r).n_bedarf, 125, "unter 10 kg kein Abzug:");
    pruefe.gleich(entzug({ zeileId: "weizen_rp_unter14", ertragTHa: 7, rohprotein: 13, feuchte: 14 }, r), 137.2, "19,6 kg/t × 7 t =");
    pruefe.gleich(entzug({ zeileId: "koernermais", ertragTHa: 10, ertragslage: "mittel" }, r), 125);
    pruefe.gleich(entzug({ zeileId: "weizen_rp_unter14", ertragTHa: 7 }, r), null, "ohne Rohprotein kein Weizen-Entzug:");
    pruefe.gleich(napvZeile({ mfa_code: "138" }, r).id, "weizen_rp_unter14");
  });

  test("Sperrfristen (§ 2) und Ausnahmen", async () => {
    const r = await regeln.lade("napv/duengung");
    const n = (d, a) => naehrstoffe(d, a, r);
    const kas = n(KAS, { wert: 150, einheit: "kg_je_ha" });
    const p = (datum, ziel, duenger = KAS, nn = kas) => pruefeAusbringung({ datum, duenger, n: nn, ziel, betrieb: {}, regel: r });
    pruefe.wahr(codes(p("2026-11-05", acker())).includes("napv_sperrfrist"), "Mineraldünger im November");
    pruefe.wahr(codes(p("2026-10-20", acker())).includes("napv_sperrfrist_ausnahme"), "16.–31. Oktober nur Ausnahme");
    pruefe.wahr(!codes(p("2026-03-10", acker())).includes("napv_sperrfrist"), "März erlaubt");
    pruefe.wahr(codes(p("2026-02-05", acker())).includes("napv_sperrfrist"), "Weizen am 5. Februar gesperrt");
    pruefe.wahr(!codes(p("2026-02-05", acker({ mfa_code: "165", kategorie: "getreide" }))).includes("napv_sperrfrist"), "Durum ab 1. Februar");
    const mist = n(MIST, { wert: 20, einheit: "t_je_ha" });
    pruefe.wahr(!codes(p("2026-11-15", acker(), MIST, mist)).includes("napv_sperrfrist"), "Stallmist bis 29. November");
    pruefe.wahr(codes(p("2026-12-01", acker(), MIST, mist)).includes("napv_sperrfrist"), "Stallmist ab 30. November");
    const gr = acker({ kategorie: "gruenland" }, { nutzungsart: "gruenland" });
    const guelle = n(GUELLE, { wert: 25, einheit: "m3_je_ha" });
    pruefe.wahr(codes(p("2026-12-01", gr, GUELLE, guelle)).includes("napv_sperrfrist"), "Grünland ab 30. November");
    pruefe.wahr(codes(p("2026-10-10", gr, GUELLE, guelle)).includes("napv_60kg"), "Grünland im Oktober höchstens 60 kg (75 kg)");
    pruefe.wahr(!codes(p("2026-10-10", gr, GUELLE, n(GUELLE, { wert: 15, einheit: "m3_je_ha" }))).includes("napv_60kg"), "45 kg erlaubt");
    pruefe.wahr(codes(p("2026-12-10", acker(), MIST, mist)).includes("napv_bodenzustand"), "Winter: Bodenzustand bestätigen");
    pruefe.wahr(!codes(p("2026-05-10", acker())).includes("napv_bodenzustand"));
    for (const w of p("2026-11-05", acker())) pruefe.wahr(w.quelle?.url && w.quelle?.text, `${w.code} ohne Rechtsquelle`);
  });

  test("Nach der Ernte, Gabenteilung, Gewässer/Hang, Obergrenze", async () => {
    const r = await regeln.lade("napv/duengung");
    const kas = (kg) => naehrstoffe(KAS, { wert: kg, einheit: "kg_je_ha" }, r);
    const z = acker();
    z.massnahmen = [{ art: "ernte", datum: "2026-07-20", details: { hauptfrucht: true } }];
    const p = (datum, ziel, nn, extra = {}) => pruefeAusbringung({ datum, duenger: KAS, n: nn, ziel, betrieb: {}, regel: r, ...extra });
    pruefe.wahr(codes(p("2026-08-10", z, kas(150))).includes("napv_nach_ernte"));
    pruefe.wahr(codes(p("2026-08-10", z, kas(300))).includes("napv_60kg"), "nach der Ernte höchstens 60 kg");
    pruefe.wahr(codes(p("2026-04-01", acker(), kas(400))).includes("napv_gabenteilung"), "108 kg leichtlöslich → teilen");
    pruefe.wahr(!codes(p("2026-04-01", acker(), kas(300))).includes("napv_gabenteilung"), "81 kg ohne Teilung");
    const hang = acker(undefined, { nutzungsart: "acker", grenzt_an_gewaesser: true, hangneigung_prozent: 12 });
    const wh = codes(p("2026-04-01", hang, kas(400)));
    pruefe.wahr(wh.includes("napv_gewaesser") && wh.includes("napv_hang"), wh.join(","));
    const mitPlan = { ...acker(), plan: { napv_kultur: "weizen_rp_unter14", n_bedarf_kg_ha: 113 } };
    pruefe.wahr(codes(p("2026-04-01", mitPlan, kas(150), { bisherJahreswirksam: 80 })).includes("napv_obergrenze"), "80 + 40,5 > 113");
    pruefe.wahr(!codes(p("2026-04-01", mitPlan, kas(150), { bisherJahreswirksam: 60 })).includes("napv_obergrenze"));
  });

  test("ÖPUL-Begrünung: Ende des Zeitraums und kein mineralischer N", async () => {
    const [r, b] = await Promise.all([regeln.lade("napv/duengung"), regeln.lade("oepul/begruenung")]);
    pruefe.gleich(begruenungEnde("2026-08-20", 4, b), "2027-02-15");
    pruefe.gleich(begruenungEnde("2026-08-15", 3, b), "2026-11-15");
    pruefe.gleich(begruenungEnde("2026-07-01", 1, b), "2026-09-15", "70 Tage, aber nicht vor 15.9.:");
    pruefe.gleich(begruenungEnde("2026-08-10", 1, b), "2026-10-19");
    const ms = [{ art: "aussaat", datum: "2026-08-20", details: { zwischenfrucht: true, begruenung_variante: 4 } }];
    pruefe.gleich(begruenungAktiv(ms, "2026-12-01", b).ende, "2027-02-15");
    pruefe.gleich(begruenungAktiv(ms, "2027-02-16", b), null);
    const z = { ...acker(), massnahmen: ms };
    const n = naehrstoffe(KAS, { wert: 100, einheit: "kg_je_ha" }, r);
    pruefe.wahr(codes(pruefeAusbringung({ datum: "2026-09-10", duenger: KAS, n, ziel: z, betrieb: {}, regel: r, begruenung: b })).includes("oepul_begruenung_n"));
    pruefe.wahr(!codes(pruefeAusbringung({ datum: "2026-09-10", duenger: KAS, n, ziel: z, betrieb: {}, regel: r })).includes("oepul_begruenung_n"), "ohne ÖPUL-Teilnahme keine Meldung");
  });

  test("Jahresauswertung: Summen, 170-kg-Grenze, Saldo", async () => {
    const r = await regeln.lade("napv/duengung");
    const s1 = { schlag: { id: "a", flaeche_ha: 2 }, kultur: {}, feldstueck: { nutzungsart: "acker" } };
    const s2 = { schlag: { id: "b", flaeche_ha: 3 }, kultur: {}, feldstueck: { nutzungsart: "acker" } };
    const massnahmen = [
      { art: "duengung", datum: "2026-04-01", schlag_ids: ["a"], details: { duenger_art: "wirtschaftsduenger", naehrstoffe_kg_je_ha: { n_gesamt: 60, n_nach_stall_lager: 60, n_jahreswirksam: 36.5 } } },
      { art: "duengung", datum: "2026-04-10", schlag_ids: ["a", "b"], details: { duenger_art: "mineralduenger", naehrstoffe_kg_je_ha: { n_gesamt: 40.5, n_jahreswirksam: 40.5 } } },
      { art: "ernte", datum: "2026-07-20", schlag_ids: ["a"], details: { hauptfrucht: true, ertrag: { wert: 7, einheit: "t_je_ha" }, rohprotein_prozent: 13, feuchte_prozent: 14 } },
      { art: "duengung", datum: "2025-04-10", schlag_ids: ["a"], details: { naehrstoffe_kg_je_ha: { n_gesamt: 999 } } },
    ];
    const plaene = [{ schlag_id: "a", jahr: 2026, napv_kultur: "weizen_rp_unter14", n_bedarf_kg_ha: 113, vorfrucht_kg_n_ha: 20 }];
    const a = jahresauswertung({ jahr: 2026, schlaege: [s1, s2], massnahmen, betriebsmittel: [], plaene, betrieb: {}, regel: r });
    const sa = a.proSchlag[0];
    pruefe.tiefGleich([sa.n_gesamt, sa.n_jahreswirksam, sa.n_wd], [100.5, 77, 60]);
    pruefe.gleich(sa.entzug, 137.2);
    pruefe.gleich(sa.saldo, -40.2, "77 + 20 − 137,2 =");
    pruefe.gleich(a.ln_ha, 5);
    pruefe.gleich(a.wd_n_je_ha, 24, "120 kg WD-N / 5 ha =");
    pruefe.gleich(a.proSchlag[1].n_jahreswirksam, 40.5);
  });
});
