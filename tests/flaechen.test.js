import { gruppe, test, pruefe } from "./runner.js";
import * as daten from "../core/daten.js";
import * as regeln from "../core/regeln.js";
import { uuid } from "../core/ids.js";
import { leseDateien, erkenneEbene, automatischeZuordnung, erstellePlan, wendeAn } from "../flaechen/import.js";
import { kulturen } from "../flaechen/katalog.js";
import { napvPflicht } from "../flaechen/napv.js";

async function datei(pfad, name, typ) {
  return new File([await (await fetch(pfad)).arrayBuffer()], name, { type: typ });
}

async function vorbereiten() {
  await daten.init({ name: `test-flaechen-${uuid()}` });
  const betrieb = await daten.speichern("betrieb", { name: "Testhof", bundesland: "NOE" });
  return { betrieb, regel: await regeln.lade("import/eama-gis") };
}

async function plan(dateien, betrieb, regel, jahr = 2026) {
  const { ebenen, fehler } = await leseDateien(dateien);
  const einstellungen = ebenen.map((e) => ({ art: erkenneEbene(e.spalten, regel) === "unbekannt" ? "schlaege" : erkenneEbene(e.spalten, regel), zuordnung: automatischeZuordnung(e.spalten, regel) }));
  const bestand = {
    feldstuecke: await daten.liste("feldstueck", { index: "betrieb_id", wert: betrieb.id }),
    schlaege: await daten.liste("schlag", { index: "betrieb_id", wert: betrieb.id }),
    kulturen: await kulturen(betrieb.id),
  };
  return { ebenen, fehler, einstellungen, p: erstellePlan({ ebenen, einstellungen, jahr, bestand, regel }) };
}

gruppe("flaechen", () => {
  test("eAMA-ZIP: Ebenen erkannt, Spalten automatisch zugeordnet (auch gekürzte Namen)", async () => {
    const { betrieb, regel } = await vorbereiten();
    const { ebenen, fehler, einstellungen } = await plan([await datei("../testdaten/eama-export-beispiel.zip", "export.zip", "application/zip")], betrieb, regel);
    pruefe.tiefGleich(fehler, []);
    pruefe.tiefGleich(ebenen.map((e) => e.name).sort(), ["FELDSTUECKE_2026", "SCHLAEGE_2026"]);
    const sl = einstellungen[ebenen.findIndex((e) => e.name === "SCHLAEGE_2026")];
    const fs = einstellungen[ebenen.findIndex((e) => e.name === "FELDSTUECKE_2026")];
    pruefe.gleich(sl.art, "schlaege");
    pruefe.gleich(fs.art, "feldstuecke");
    pruefe.gleich(sl.zuordnung.snar_bezeichnung, "SNAR_BEZEI");
    pruefe.gleich(sl.zuordnung.sl_flaeche_ha, "SL_FLAECHE");
    pruefe.gleich(sl.zuordnung.bio, "KZ_BIO_OEP");
    pruefe.gleich(fs.zuordnung.fnar_code, "FNAR_CODE");
    pruefe.wahr(ebenen.every((e) => e.koordinatensystem.includes("Lambert")), "Koordinatensystem aus .prj erkannt");
    await daten.datenbankLoeschen();
  });

  test("Plan: 3 Feldstücke, 6 Schläge, Kulturen aus Katalog, 1 neue Kultur, Nummern vergeben", async () => {
    const { betrieb, regel } = await vorbereiten();
    const { p } = await plan([await datei("../testdaten/eama-export-beispiel.zip", "export.zip")], betrieb, regel);
    pruefe.gleich(p.summe.feldstuecke, 3);
    pruefe.gleich(p.summe.schlaege, 6);
    pruefe.gleich(p.summe.feldstuecke_neu, 3);
    pruefe.tiefGleich(p.feldstuecke.map((f) => f.nutzungsart), ["acker", "acker", "gruenland"]);
    pruefe.tiefGleich(p.feldstuecke.map((f) => f.nummer), [1, 2, 3]);
    const weizen = p.feldstuecke[0].schlaege.find((s) => s.snar_code === "138");
    pruefe.gleich(weizen.kultur.id, "05000000-0000-4000-8000-000000000138");
    pruefe.gleich(p.kulturen_neu.length, 1);
    pruefe.gleich(p.kulturen_neu[0].mfa_code, "999");
    pruefe.wahr(p.warnungen.some((w) => w.includes("fortlaufend vergeben")), "Warnung zu fehlenden Feldstücknummern");
    pruefe.wahr(!p.warnungen.some((w) => w.includes("Abweichung")), `Flächen passen zur Geometrie: ${p.warnungen.join(" | ")}`);
    pruefe.gleich(p.feldstuecke[2].schlaege[0].bio, true);
    pruefe.gleich(p.feldstuecke[0].flaeche_ha, 7, "Feldstückfläche aus der Feldstück-Ebene:");
    await daten.datenbankLoeschen();
  });

  test("Anwenden speichert alles; erneuter Import erkennt alles wieder (keine Dubletten)", async () => {
    const { betrieb, regel } = await vorbereiten();
    const zip = await datei("../testdaten/eama-export-beispiel.zip", "export.zip");
    const r = await wendeAn((await plan([zip], betrieb, regel)).p, betrieb);
    pruefe.tiefGleich(r, { kulturen: 1, feldstuecke: 3, schlaege: 6 });
    const fs = await daten.liste("feldstueck");
    pruefe.gleich(fs.length, 3);
    pruefe.wahr(fs.every((f) => f.geometrie && f.invekos.fs_kennung), "Geometrie und Kennung gespeichert");
    // Name ändern, dann erneut importieren: Name bleibt, nichts doppelt
    await daten.speichern("feldstueck", { ...fs[0], name: "Hausacker", bodenart: "lehm" });
    const zweiter = (await plan([zip], betrieb, regel)).p;
    pruefe.gleich(zweiter.summe.feldstuecke_neu, 0);
    pruefe.gleich(zweiter.summe.schlaege_neu, 0);
    pruefe.gleich(zweiter.kulturen_neu.length, 0, "Die beim ersten Import angelegte Kultur wird wiedererkannt:");
    await wendeAn(zweiter, betrieb);
    pruefe.gleich((await daten.liste("feldstueck")).length, 3);
    pruefe.gleich((await daten.liste("schlag")).length, 6);
    const nachher = await daten.hole("feldstueck", fs[0].id);
    pruefe.gleich(nachher.name, "Hausacker");
    pruefe.gleich(nachher.bodenart, "lehm");
    await daten.datenbankLoeschen();
  });

  test("Vorfrucht wird beim Import des Folgejahres übernommen", async () => {
    const { betrieb, regel } = await vorbereiten();
    const zip = await datei("../testdaten/eama-export-beispiel.zip", "export.zip");
    await wendeAn((await plan([zip], betrieb, regel, 2026)).p, betrieb);
    const p2027 = (await plan([zip], betrieb, regel, 2027)).p;
    const gruen = p2027.feldstuecke.find((f) => f.kennung === "900000003");
    pruefe.gleich(gruen.schlaege[0].vorfrucht, undefined, "2 Schläge im Vorjahr → keine eindeutige Vorfrucht");
    const weizenFs = p2027.feldstuecke.find((f) => f.kennung === "900000001");
    pruefe.gleich(weizenFs.schlaege[0].vorfrucht, undefined, "2 Schläge im Vorjahr → keine eindeutige Vorfrucht");
    pruefe.gleich(p2027.summe.schlaege_neu, 6, "2027 sind alle Schläge neu:");
    // Positivfall: Feldstück mit genau einem Schlag im Vorjahr (Feldgehölz-Schlag 2026 entfernen)
    const gehoelz = (await daten.liste("schlag")).find((s) => s.invekos?.snar_code === "359");
    await daten.loeschen("schlag", gehoelz.id);
    const neu = (await plan([zip], betrieb, regel, 2027)).p;
    const mais = neu.feldstuecke.find((f) => f.kennung === "900000002");
    pruefe.gleich(mais.schlaege[0].vorfrucht?.name, "Körnermais");
    await wendeAn(neu, betrieb);
    const gespeichert = (await daten.liste("schlag")).find((s) => s.jahr === 2027 && s.invekos?.snar_code === "105");
    pruefe.gleich(gespeichert.vorfrucht_name, "Körnermais");
    await daten.datenbankLoeschen();
  });

  test("GeoJSON ohne Feldstück-Ebene: Feldstücke aus Kennung, Nutzungsart aus Kulturen", async () => {
    const { betrieb, regel } = await vorbereiten();
    const { p, ebenen } = await plan([await datei("../testdaten/flaechen-beispiel.geojson", "flaechen.geojson", "application/geo+json")], betrieb, regel);
    pruefe.gleich(ebenen[0].quelle, "GeoJSON");
    pruefe.gleich(p.summe.feldstuecke, 3);
    pruefe.gleich(p.feldstuecke.find((f) => f.kennung === "900000003").nutzungsart, "gruenland");
    pruefe.gleich(p.feldstuecke.find((f) => f.kennung === "900000001").flaeche_ha, 6, "ohne Feldstück-Ebene = Summe der Schläge:");
    await daten.datenbankLoeschen();
  });

  test("Unbrauchbare Dateien werden verständlich abgelehnt", async () => {
    const r1 = await leseDateien([new File(["kein zip"], "kaputt.zip")]);
    pruefe.wahr(r1.fehler[0].includes("kein gültiges ZIP"), r1.fehler[0]);
    const r2 = await leseDateien([new File([new Uint8Array(200)], "nur.shp")]);
    pruefe.wahr(r2.fehler[0].includes(".dbf fehlt"), r2.fehler[0]);
    const r3 = await leseDateien([new File(["hallo"], "notiz.txt")]);
    pruefe.wahr(r3.fehler[0].includes("Keine Flächendaten"), r3.fehler[0]);
  });

  test("NAPV-Hinweis: Schwellen nach § 8 Abs. 2 und § 9 Abs. 5", async () => {
    const regel = await regeln.lade("napv/aufzeichnungspflicht");
    const s = (ha, kategorie = "getreide", alm = false) => ({ flaeche_ha: ha, kategorie, alm });
    // Musterbetrieb: 18,2 ha, 6,7 ha Kleegras + Wiese (37 %) → Pflicht
    pruefe.gleich(napvPflicht({ regel, schlaege: [s(8.4), s(3.1, "mais"), s(4.2, "feldfutter"), s(2.5, "gruenland")] }).pflicht, true);
    pruefe.gleich(napvPflicht({ regel, schlaege: [s(15)] }).pflicht, false, "genau 15 ha:");
    pruefe.gleich(napvPflicht({ regel, schlaege: [s(13), s(2, "gemuese")] }).pflicht, true, "≤ 15 ha, aber 2 ha Gemüse:");
    pruefe.wahr(napvPflicht({ regel, schlaege: [s(13), s(2, "gemuese")] }).begruendung.includes("Gemüse"));
    pruefe.gleich(napvPflicht({ regel, schlaege: [s(1), s(19, "gruenland")] }).pflicht, false, "95 % Grünland:");
    pruefe.gleich(napvPflicht({ regel, schlaege: [s(10), s(30, "gruenland", true)] }).pflicht, false, "Alm zählt nicht zur LN:");
    pruefe.gleich(napvPflicht({ regel, anlage5: true, schlaege: [s(6)] }).pflicht, true, "Anlage 5, 6 ha Acker:");
    pruefe.gleich(napvPflicht({ regel, anlage5: true, schlaege: [s(4)] }).pflicht, false, "Anlage 5, 4 ha:");
  });
});
