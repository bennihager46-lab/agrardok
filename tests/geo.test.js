import { gruppe, test, pruefe } from "./runner.js";
import { nachWgs84, EPSG_31287, erkenneKoordinatensystem, flaecheHa, transformiereGeometrie } from "../core/geo/projektion.js";
import { entpacke } from "../core/geo/zip.js";
import { leseShp, leseDbf } from "../core/geo/shapefile.js";

// Referenzpunkte: dieselben Eckpunkte von INVEKOS-Schlägen, vom AMA/LFRZ-Dienst (OGC API Features,
// invekos_schlaege_2026_1_polygon) einmal in EPSG:31287 und einmal in WGS84 abgerufen am 11.11.2026.
// Lungau, Marchfeld, Vorarlberg – deckt Österreich von West nach Ost ab.
const REFERENZ = [
  { wgs84: [13.6015459, 47.05342057], epsg31287: [420426.44, 350459.14] },
  { wgs84: [13.60442034, 47.05308774], epsg31287: [420644.9, 350422.9] },
  { wgs84: [16.74307281, 48.31771792], epsg31287: [652804.95, 496487.87] },
  { wgs84: [16.74160655, 48.31383819], epsg31287: [652715.23, 496052.21] },
  { wgs84: [9.73816984, 47.1972793], epsg31287: [127813.91, 372721.93] },
  { wgs84: [9.73599382, 47.19808536], epsg31287: [127653.4, 372819.05] },
];

const PRJ_ESRI_31287 = 'PROJCS["MGI_Austria_Lambert",GEOGCS["GCS_MGI",DATUM["D_MGI",SPHEROID["Bessel_1841",6377397.155,299.1528128]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]],PROJECTION["Lambert_Conformal_Conic"],PARAMETER["False_Easting",400000.0],PARAMETER["False_Northing",400000.0],PARAMETER["Central_Meridian",13.33333333333333],PARAMETER["Standard_Parallel_1",49.0],PARAMETER["Standard_Parallel_2",46.0],PARAMETER["Latitude_Of_Origin",47.5],UNIT["Meter",1.0]]';

/** Abstand zweier WGS84-Punkte in Metern (für kleine Abstände ausreichend genau). */
function meter([l1, p1], [l2, p2]) {
  const dx = (l2 - l1) * 111320 * Math.cos((p1 * Math.PI) / 180);
  const dy = (p2 - p1) * 110540;
  return Math.hypot(dx, dy);
}

const ladeBytes = async (pfad) => (await fetch(pfad)).arrayBuffer();

gruppe("geo", () => {
  test("EPSG:31287 → WGS84 stimmt mit dem amtlichen INVEKOS-Dienst überein (< 5 cm)", () => {
    const f = nachWgs84(EPSG_31287);
    for (const r of REFERENZ) {
      const d = meter(f(r.epsg31287), r.wgs84);
      pruefe.wahr(d < 0.05, `Abweichung ${d.toFixed(3)} m bei ${r.epsg31287}`);
    }
  });

  test("ESRI-.prj von EPSG:31287 wird erkannt und rechnet gleich", () => {
    const { crs, fehler } = erkenneKoordinatensystem(PRJ_ESRI_31287);
    pruefe.wahr(!fehler, fehler);
    pruefe.gleich(crs.art, "lcc");
    pruefe.gleich(crs.lat1, 49);
    pruefe.wahr(crs.towgs84, "MGI ohne TOWGS84 → Standardparameter");
    const f = nachWgs84(crs);
    for (const r of REFERENZ) pruefe.wahr(meter(f(r.epsg31287), r.wgs84) < 0.05);
  });

  test("Unbekannte oder fehlende .prj wird ehrlich gemeldet", () => {
    pruefe.wahr(erkenneKoordinatensystem("").fehler.includes("fehlt"));
    pruefe.wahr(erkenneKoordinatensystem('PROJCS["X",GEOGCS["G",DATUM["D_Tokyo",SPHEROID["Bessel",6377397.155,299.15]]],PROJECTION["Lambert_Conformal_Conic"],UNIT["Meter",1]]').fehler.includes("nicht unterstützt"));
    pruefe.wahr(erkenneKoordinatensystem('PROJCS["Y",GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137,298.257223563]]],PROJECTION["Polyconic"],UNIT["Meter",1]]').fehler.includes("Projektion"));
    pruefe.gleich(erkenneKoordinatensystem('GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137,298.257223563]]]').crs.art, "geo");
  });

  test("ZIP aus eAMA-Beispiel wird entpackt (deflate)", async () => {
    const dateien = await entpacke(await ladeBytes("../testdaten/eama-export-beispiel.zip"));
    pruefe.tiefGleich([...dateien.keys()].sort(), ["FELDSTUECKE_2026.dbf", "FELDSTUECKE_2026.prj", "FELDSTUECKE_2026.shp", "FELDSTUECKE_2026.shx",
      "SCHLAEGE_2026.dbf", "SCHLAEGE_2026.prj", "SCHLAEGE_2026.shp", "SCHLAEGE_2026.shx"]);
  });

  test("Shapefile: Polygone mit Loch, Attribute mit Umlauten (Windows-1252 ohne .cpg)", async () => {
    const d = await entpacke(await ladeBytes("../testdaten/eama-export-beispiel.zip"));
    const shp = d.get("SCHLAEGE_2026.shp");
    const { typ, geometrien } = leseShp(shp.buffer.slice(shp.byteOffset, shp.byteOffset + shp.byteLength));
    const dbf = leseDbf(d.get("SCHLAEGE_2026.dbf"));
    pruefe.gleich(typ, 5);
    pruefe.gleich(geometrien.length, 6);
    pruefe.gleich(dbf.kodierung, "windows-1252");
    pruefe.tiefGleich(dbf.felder.map((f) => f.name), ["FS_KENNUNG", "SNAR_CODE", "SNAR_BEZEI", "SL_FLAECHE", "KZ_BIO_OEP"]);
    const mais = dbf.datensaetze.findIndex((s) => s.SNAR_BEZEI === "KÖRNERMAIS");
    pruefe.wahr(mais >= 0, "Umlaut in KÖRNERMAIS korrekt gelesen");
    pruefe.gleich(geometrien[mais].coordinates.length, 2, "Außenring + Loch");
    pruefe.gleich(dbf.datensaetze[mais].FS_KENNUNG, 900000002);
    // Fläche aus Geometrie (nach Umrechnung) ≈ Fläche laut Attribut
    const wgs = transformiereGeometrie(geometrien[mais], nachWgs84(EPSG_31287));
    const abw = Math.abs(flaecheHa(wgs) - dbf.datensaetze[mais].SL_FLAECHE) / dbf.datensaetze[mais].SL_FLAECHE;
    pruefe.wahr(abw < 0.005, `Flächenabweichung ${(abw * 100).toFixed(2)} %`);
  });

  test("JS-Umrechnung des Shapefiles = Python-Umrechnung im GeoJSON (unabhängig programmiert, < 1 cm)", async () => {
    const d = await entpacke(await ladeBytes("../testdaten/eama-export-beispiel.zip"));
    const shp = d.get("SCHLAEGE_2026.shp");
    const { geometrien } = leseShp(shp.buffer.slice(shp.byteOffset, shp.byteOffset + shp.byteLength));
    const geojson = await (await fetch("../testdaten/flaechen-beispiel.geojson")).json();
    const f = nachWgs84(EPSG_31287);
    geometrien.forEach((g, i) => {
      const js = transformiereGeometrie(g, f).coordinates[0];
      const py = geojson.features[i].geometry.coordinates[0];
      js.forEach((p) => pruefe.wahr(py.some((q) => meter(p, q) < 0.01), `Punkt ${p} von Feature ${i} nicht gefunden`));
    });
  });
});
