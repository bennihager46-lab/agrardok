// Flächenimport aus dem eAMA-GIS-Export (Shapefile, auch als ZIP) oder GeoJSON.
// Ablauf: leseDateien → erstellePlan (Vorschau, beliebig oft mit geänderter Zuordnung) → wendeAn.

import * as daten from "../core/daten.js";
import * as validierung from "../core/validierung.js";
import { uuid } from "../core/ids.js";
import { entpacke } from "../core/geo/zip.js";
import { leseShp, leseDbf, kodierungAusCpg } from "../core/geo/shapefile.js";
import { erkenneKoordinatensystem, nachWgs84, transformiereGeometrie, flaecheHa, vereinige, EPSG_31287, WGS84 } from "../core/geo/projektion.js";
import { findeKultur } from "./katalog.js";

// ---------- 1. Dateien lesen ----------

const endung = (name) => name.toLowerCase().split(".").pop();
const basis = (name) => name.split("/").pop().replace(/\.[^.]+$/, "");

/**
 * @param {File[]} dateien  ZIP, einzelne Shapefile-Teile (.shp .dbf .prj .cpg) oder GeoJSON
 * @returns {{ebenen: Array, fehler: string[]}}
 */
export async function leseDateien(dateien) {
  const inhalte = new Map(); // Dateiname → Uint8Array
  const fehler = [];
  for (const datei of dateien) {
    const bytes = new Uint8Array(await datei.arrayBuffer());
    if (endung(datei.name) === "zip") {
      try {
        for (const [name, inhalt] of await entpacke(bytes.buffer)) {
          if (!name.startsWith("__MACOSX/")) inhalte.set(name.split("/").pop(), inhalt);
        }
      } catch (e) {
        fehler.push(`${datei.name}: ${e.message}`);
      }
    } else inhalte.set(datei.name, bytes);
  }

  const ebenen = [];
  const gruppen = new Map();
  for (const [name, inhalt] of inhalte) {
    const e = endung(name);
    if (e === "geojson" || e === "json") {
      try { ebenen.push(leseGeoJson(name, new TextDecoder().decode(inhalt))); } catch (err) { fehler.push(`${name}: ${err.message}`); }
    } else if (["shp", "dbf", "prj", "cpg", "shx"].includes(e)) {
      const b = basis(name).toLowerCase();
      if (!gruppen.has(b)) gruppen.set(b, { name: basis(name) });
      gruppen.get(b)[e] = inhalt;
    }
  }
  for (const g of gruppen.values()) {
    if (!g.shp || !g.dbf) {
      fehler.push(`Shapefile „${g.name}“ unvollständig: ${!g.shp ? ".shp" : ".dbf"} fehlt.`);
      continue;
    }
    try { ebenen.push(leseShapefile(g)); } catch (err) { fehler.push(`${g.name}: ${err.message}`); }
  }
  if (!ebenen.length && !fehler.length) fehler.push("Keine Flächendaten gefunden. Erwartet: ZIP aus eAMA, Shapefile (.shp + .dbf + .prj) oder GeoJSON.");
  return { ebenen, fehler };
}

function leseShapefile(g) {
  const { geometrien } = leseShp(g.shp.buffer.slice(g.shp.byteOffset, g.shp.byteOffset + g.shp.byteLength));
  const kodierung = g.cpg ? kodierungAusCpg(new TextDecoder().decode(g.cpg)) : null;
  const dbf = leseDbf(g.dbf, kodierung);
  const prj = g.prj ? new TextDecoder().decode(g.prj) : "";
  const hinweise = [];
  let { crs, name: crsName, fehler: crsFehler } = erkenneKoordinatensystem(prj);
  if (!crs) {
    const geraten = rateKoordinatensystem(geometrien);
    if (geraten) {
      hinweise.push(`${crsFehler} Aus den Koordinaten geschlossen: ${geraten.name}. Bitte die Lage auf der Karte prüfen.`);
      crs = geraten;
      crsName = geraten.name;
      crsFehler = null;
    }
  }
  if (!crs) throw new Error(crsFehler);
  const umrechnen = nachWgs84(crs);
  const datensaetze = [];
  geometrien.forEach((geo, i) => {
    const eig = dbf.datensaetze[i];
    if (!eig) return; // gelöschter Datensatz
    datensaetze.push({ eigenschaften: eig, geometrie: geo ? transformiereGeometrie(geo, umrechnen) : null });
  });
  return { name: g.name, quelle: "Shapefile", koordinatensystem: crsName, kodierung: dbf.kodierung, hinweise,
    spalten: dbf.felder.map((f) => f.name), datensaetze };
}

function leseGeoJson(name, text) {
  const obj = JSON.parse(text);
  const features = obj.type === "FeatureCollection" ? obj.features : obj.type === "Feature" ? [obj] : null;
  if (!features) throw new Error("Keine GeoJSON-FeatureCollection.");
  const crsAngabe = String(obj.crs?.properties?.name ?? "");
  const hinweise = [];
  let crs = /31287/.test(crsAngabe) ? EPSG_31287 : WGS84;
  if (crs === WGS84 && features.length && !imGradBereich(features.find((f) => f.geometry)?.geometry)) {
    const geraten = rateKoordinatensystem(features.map((f) => f.geometry));
    if (geraten) { crs = geraten; hinweise.push(`Koordinaten sind keine Längen-/Breitengrade – angenommen: ${geraten.name}.`); }
  }
  const umrechnen = nachWgs84(crs);
  const spalten = [...new Set(features.flatMap((f) => Object.keys(f.properties ?? {})))];
  return {
    name: basis(name), quelle: "GeoJSON", koordinatensystem: crs.name, hinweise, spalten,
    datensaetze: features.map((f) => ({
      eigenschaften: f.properties ?? {},
      geometrie: f.geometry && ["Polygon", "MultiPolygon"].includes(f.geometry.type) ? transformiereGeometrie(f.geometry, umrechnen) : null,
    })),
  };
}

function ersterPunkt(g) {
  let k = g?.coordinates;
  while (Array.isArray(k) && Array.isArray(k[0])) k = k[0];
  return Array.isArray(k) ? k : null;
}
const imGradBereich = (g) => { const p = ersterPunkt(g); return p && Math.abs(p[0]) <= 180 && Math.abs(p[1]) <= 90; };

/** Ohne .prj: Koordinatenbereich prüfen (Österreich in EPSG:31287 ≈ x 100–700 km, y 250–600 km). */
function rateKoordinatensystem(geometrien) {
  const p = ersterPunkt(geometrien.find(Boolean));
  if (!p) return null;
  if (Math.abs(p[0]) <= 180 && Math.abs(p[1]) <= 90) return { ...WGS84, name: "WGS84 (geografisch, angenommen)" };
  if (p[0] > 50_000 && p[0] < 750_000 && p[1] > 200_000 && p[1] < 650_000) return { ...EPSG_31287, name: `${EPSG_31287.name}, angenommen` };
  return null;
}

// ---------- 2. Zuordnung und Plan ----------

/** Welche Art Ebene? „schlaege“, „feldstuecke“ oder „unbekannt“. */
export function erkenneEbene(spalten, regel) {
  const klein = new Set(spalten.map((s) => s.toLowerCase()));
  const passt = (art) => regel.werte.ebenen[art].erkennen_an.some((s) => klein.has(s));
  if (passt("schlaege")) return "schlaege";
  if (passt("feldstuecke")) return "feldstuecke";
  return "unbekannt";
}

/** Ordnet Zielfelder automatisch Spalten zu (Groß-/Kleinschreibung egal). */
export function automatischeZuordnung(spalten, regel) {
  const nachKlein = new Map(spalten.map((s) => [s.toLowerCase(), s]));
  const zuordnung = {};
  for (const [feld, def] of Object.entries(regel.werte.felder)) {
    zuordnung[feld] = def.kandidaten.map((k) => nachKlein.get(k)).find(Boolean) ?? null;
  }
  return zuordnung;
}

const kennungText = (w) => (w == null || w === "" ? null : typeof w === "number" && Number.isInteger(w) ? String(w) : String(w).replace(/\.0+$/, "").trim());
const zahlWert = (w) => (w == null || w === "" ? null : Number(String(w).replace(",", ".")));
const ganzzahl = (w) => { const z = zahlWert(w); return Number.isInteger(z) && z > 0 ? z : null; };
const janein = (w) => (w == null || w === "" ? null : /^(j|ja|y|yes|t|true|1)$/i.test(String(w).trim()));
const ha = (z) => Math.round(z * 10000) / 10000;

/**
 * Erstellt den Importplan (ohne zu speichern).
 * @param {{ebenen, einstellungen: Array<{art, zuordnung}>, jahr, bestand: {feldstuecke, schlaege, kulturen}, regel}} p
 */
export function erstellePlan({ ebenen, einstellungen, jahr, bestand, regel }) {
  const warnungen = [];
  const toleranz = regel.werte.flaechen_toleranz_prozent / 100;
  const fsMap = new Map();
  const reihe = { fs: 0 };
  const holeFs = (schluessel) => {
    if (!fsMap.has(schluessel)) fsMap.set(schluessel, { schluessel, reihenfolge: reihe.fs++, geometrien: [], schlaege: [] });
    return fsMap.get(schluessel);
  };
  const wert = (eig, z, feld) => (z[feld] ? eig[z[feld]] : null);

  // Jahr aus Datei, falls vorhanden
  for (const [i, e] of ebenen.entries()) {
    const z = einstellungen[i].zuordnung;
    const j = z.jahr && ganzzahl(e.datensaetze[0]?.eigenschaften[z.jahr]);
    if (j && j !== jahr) warnungen.push(`Die Datei enthält das Antragsjahr ${j}, gewählt ist ${jahr}.`);
  }

  ebenen.forEach((ebene, i) => {
    const { art, zuordnung: z } = einstellungen[i];
    if (art === "ignorieren") return;
    ebene.datensaetze.forEach((d, nr) => {
      const eig = d.eigenschaften;
      const kennung = kennungText(wert(eig, z, "fs_kennung"));
      const fsNummer = ganzzahl(wert(eig, z, "fs_nummer"));
      const schluessel = kennung ? `k:${kennung}` : fsNummer ? `n:${fsNummer}` : `e:${i}:${nr}`;
      const fs = holeFs(schluessel);
      fs.kennung ??= kennung;
      fs.nummer_datei ??= fsNummer;
      fs.name_datei ??= wert(eig, z, "fs_name") ? String(wert(eig, z, "fs_name")) : null;
      if (art === "feldstuecke") {
        fs.fnar_code = wert(eig, z, "fnar_code") != null ? String(wert(eig, z, "fnar_code")) : fs.fnar_code;
        fs.fnar_bezeichnung = wert(eig, z, "fnar_bezeichnung") ?? fs.fnar_bezeichnung;
        fs.flaeche_datei = zahlWert(wert(eig, z, "fs_flaeche_ha"));
        if (d.geometrie) fs.geometrie_fs = d.geometrie;
        if (!d.geometrie) warnungen.push(`Feldstück ${kennung ?? nr + 1}: keine Geometrie.`);
      } else {
        fs.schlaege.push({
          nummer_datei: ganzzahl(wert(eig, z, "sl_nummer")),
          snar_code: wert(eig, z, "snar_code") != null ? String(wert(eig, z, "snar_code")).trim() : null,
          snar_bezeichnung: wert(eig, z, "snar_bezeichnung") != null ? String(wert(eig, z, "snar_bezeichnung")).trim() : null,
          flaeche_datei: zahlWert(wert(eig, z, "sl_flaeche_ha")),
          bio: janein(wert(eig, z, "bio")),
          geometrie: d.geometrie,
        });
        if (d.geometrie) fs.geometrien.push(d.geometrie);
      }
    });
  });

  if ([...fsMap.keys()].some((k) => k.startsWith("e:"))) {
    warnungen.push("Für manche Flächen fehlt eine Feldstück-Kennung oder -Nummer – sie werden als eigene Feldstücke angelegt. Bitte die Zuordnung prüfen.");
  }

  // Abgleich mit Bestand, Nummern, Kulturen
  const vorhandeneFs = bestand.feldstuecke;
  let naechsteNummer = Math.max(0, ...vorhandeneFs.map((f) => f.nummer ?? 0));
  const neueKulturen = new Map();
  let nummernVergeben = false;
  const feldstuecke = [...fsMap.values()].sort((a, b) => (a.nummer_datei ?? Infinity) - (b.nummer_datei ?? Infinity) || a.reihenfolge - b.reihenfolge);

  for (const fs of feldstuecke) {
    fs.vorhanden = (fs.kennung && vorhandeneFs.find((v) => v.invekos?.fs_kennung === fs.kennung))
      || (fs.nummer_datei && vorhandeneFs.find((v) => v.nummer === fs.nummer_datei)) || null;
    fs.nummer = fs.nummer_datei ?? fs.vorhanden?.nummer ?? null;
    if (!fs.nummer) { fs.nummer = ++naechsteNummer; nummernVergeben = true; }
    fs.name = fs.name_datei ?? fs.vorhanden?.name ?? `Feldstück ${fs.nummer}`;

    // Schläge
    let slNummer = 0;
    for (const sl of fs.schlaege) {
      sl.nummer = sl.nummer_datei ?? ++slNummer;
      sl.flaeche_berechnet = sl.geometrie ? ha(flaecheHa(sl.geometrie)) : null;
      sl.flaeche_ha = ha(sl.flaeche_datei ?? sl.flaeche_berechnet ?? 0);
      pruefeFlaeche(`Feldstück ${fs.nummer}, Schlag ${sl.nummer}`, sl.flaeche_datei, sl.flaeche_berechnet, toleranz, warnungen);
      const k = findeKultur(bestand.kulturen, { code: sl.snar_code, bezeichnung: sl.snar_bezeichnung });
      if (k) sl.kultur = { id: k.id, name: k.name, kategorie: k.kategorie };
      else {
        const schl = sl.snar_code ?? sl.snar_bezeichnung ?? "unbekannt";
        if (!neueKulturen.has(schl)) {
          neueKulturen.set(schl, { id: null, name: lesbar(sl.snar_bezeichnung) || `Nutzungsart ${sl.snar_code ?? "unbekannt"}`, kategorie: "sonstige",
            ...(sl.snar_code ? { mfa_code: sl.snar_code } : {}), ...(sl.snar_bezeichnung ? { amtlicher_name: sl.snar_bezeichnung } : {}) });
        }
        sl.kultur = { neu: neueKulturen.get(schl), name: neueKulturen.get(schl).name, kategorie: "sonstige" };
      }
      sl.vorhanden = fs.vorhanden ? bestand.schlaege.find((s) => s.feldstueck_id === fs.vorhanden.id && s.jahr === jahr && s.nummer === sl.nummer) ?? null : null;
      // Vorfrucht: eindeutig nur, wenn das Feldstück im Vorjahr genau einen Schlag hatte
      const vorjahr = fs.vorhanden ? bestand.schlaege.filter((s) => s.feldstueck_id === fs.vorhanden.id && s.jahr === jahr - 1) : [];
      if (vorjahr.length === 1) {
        const vk = bestand.kulturen.find((x) => x.id === vorjahr[0].kultur_id);
        sl.vorfrucht = vk ? { id: vk.id, name: vk.name } : null;
      }
    }

    fs.geometrie = fs.geometrie_fs ?? vereinige(fs.geometrien);
    fs.flaeche_berechnet = fs.geometrie ? ha(flaecheHa(fs.geometrie)) : null;
    const summeSchlaege = ha(fs.schlaege.reduce((s, x) => s + x.flaeche_ha, 0));
    fs.flaeche_ha = ha(fs.flaeche_datei ?? (fs.schlaege.length ? summeSchlaege : fs.flaeche_berechnet ?? 0));
    if (fs.flaeche_datei != null) pruefeFlaeche(`Feldstück ${fs.nummer}`, fs.flaeche_datei, fs.flaeche_berechnet, toleranz, warnungen);
    fs.nutzungsart = nutzungsart(fs, regel);
  }
  if (nummernVergeben) warnungen.push("Die Datei enthält keine Feldstücknummern – sie wurden fortlaufend vergeben. Bitte mit dem Mehrfachantrag abgleichen.");
  if (neueKulturen.size) warnungen.push(`${neueKulturen.size} Nutzungsart(en) sind nicht im Kulturkatalog und werden als eigene Kultur angelegt: ${[...neueKulturen.values()].map((k) => k.name).join(", ")}.`);

  const schlaege = feldstuecke.flatMap((f) => f.schlaege);
  return {
    jahr, feldstuecke, warnungen,
    kulturen_neu: [...neueKulturen.values()],
    summe: {
      feldstuecke: feldstuecke.length, feldstuecke_neu: feldstuecke.filter((f) => !f.vorhanden).length,
      schlaege: schlaege.length, schlaege_neu: schlaege.filter((s) => !s.vorhanden).length,
      flaeche_ha: ha(feldstuecke.reduce((s, f) => s + f.flaeche_ha, 0)),
    },
  };
}

function pruefeFlaeche(was, datei, berechnet, toleranz, warnungen) {
  if (datei == null || berechnet == null || datei === 0) return;
  const abw = Math.abs(berechnet - datei) / datei;
  if (abw > toleranz) {
    warnungen.push(`${was}: Fläche laut Datei ${datei.toLocaleString("de-AT")} ha, aus der Geometrie berechnet ${berechnet.toLocaleString("de-AT")} ha (${Math.round(abw * 100)} % Abweichung). Ist das Koordinatensystem richtig?`);
  }
}

function nutzungsart(fs, regel) {
  const ausCode = regel.werte.fnar_nutzungsart[fs.fnar_code];
  if (ausCode) return ausCode;
  const t = String(fs.fnar_bezeichnung ?? "").toUpperCase();
  if (t.includes("ACKER")) return "acker";
  if (t.includes("GRÜNLAND") || t.includes("GRUENLAND")) return "gruenland";
  if (t.includes("ALM")) return "alm";
  if (t.includes("WEIN") || t.includes("OBST") || t.includes("SPEZIAL")) return "dauerkultur";
  // Ohne Feldstück-Ebene: nach der größten Schlagfläche
  const nachKategorie = new Map();
  for (const s of fs.schlaege) nachKategorie.set(s.kultur.kategorie, (nachKategorie.get(s.kultur.kategorie) ?? 0) + s.flaeche_ha);
  const [haupt] = [...nachKategorie].sort((a, b) => b[1] - a[1])[0] ?? [];
  if (haupt === "gruenland") return "gruenland";
  if (haupt === "dauerkultur") return "dauerkultur";
  return "acker";
}

const KLEIN = new Set(["und", "im", "ohne", "nicht", "zur", "von", "mit", "zwei", "drei", "mehr"]);
function lesbar(t) {
  if (!t) return "";
  return String(t).toLowerCase().split(/(\s+)/).map((w, i) => (KLEIN.has(w) && i > 0 ? w : w.charAt(0).toUpperCase() + w.slice(1))).join("");
}

// ---------- 3. Anwenden ----------

/** Speichert den Plan. Prüft vorher ALLE Datensätze gegen die Schemas – bei Fehlern wird nichts gespeichert. */
export async function wendeAn(plan, betrieb) {
  const jetzt = new Date().toISOString();
  const kulturIds = new Map(plan.kulturen_neu.map((k) => [k, uuid()]));
  const fsIds = new Map(plan.feldstuecke.map((f) => [f, f.vorhanden?.id ?? uuid()]));

  const kulturen = plan.kulturen_neu.map((k) => ({ ...k, id: kulturIds.get(k), betrieb_id: betrieb.id }));
  const feldstuecke = plan.feldstuecke.map((fs) => {
    const alt = fs.vorhanden ?? {};
    const neu = {
      ...alt, id: fsIds.get(fs), betrieb_id: betrieb.id, nummer: fs.nummer, name: alt.name ?? fs.name,
      nutzungsart: fs.nutzungsart, flaeche_ha: fs.flaeche_ha,
      invekos: { ...(alt.invekos ?? {}), importiert_am: jetzt,
        ...(fs.kennung ? { fs_kennung: fs.kennung } : {}),
        ...(fs.fnar_code ? { fnar_code: fs.fnar_code } : {}),
        ...(fs.fnar_bezeichnung ? { fnar_bezeichnung: String(fs.fnar_bezeichnung) } : {}) },
    };
    if (!alt.id) neu.gueltig_ab_jahr = plan.jahr;
    if (fs.geometrie) neu.geometrie = fs.geometrie;
    return neu;
  });
  const schlaege = plan.feldstuecke.flatMap((fs) => fs.schlaege.map((sl) => {
    const alt = sl.vorhanden ?? {};
    const neu = {
      ...alt, id: alt.id ?? uuid(), betrieb_id: betrieb.id, feldstueck_id: fsIds.get(fs), jahr: plan.jahr, nummer: sl.nummer,
      flaeche_ha: sl.flaeche_ha, kultur_id: sl.kultur.id ?? kulturIds.get(sl.kultur.neu),
      invekos: { ...(alt.invekos ?? {}), importiert_am: jetzt,
        ...(sl.snar_code ? { snar_code: sl.snar_code } : {}), ...(sl.snar_bezeichnung ? { snar_bezeichnung: sl.snar_bezeichnung } : {}) },
    };
    if (sl.geometrie) neu.geometrie = sl.geometrie;
    if (sl.bio != null) neu.bio = sl.bio;
    if (sl.vorfrucht && !alt.vorfrucht_kultur_id) { neu.vorfrucht_kultur_id = sl.vorfrucht.id; neu.vorfrucht_name = sl.vorfrucht.name; }
    return neu;
  }));

  // Vorabprüfung mit Platzhalter-Metadaten (speichern() ergänzt die echten)
  const meta = { erstellt_am: jetzt, geaendert_am: jetzt, rev: 1 };
  const fehler = [
    ...kulturen.flatMap((k) => validierung.pruefe("kultur", { ...meta, ...k }).map((f) => `Kultur ${k.name}: ${f.pfad} – ${f.meldung}`)),
    ...feldstuecke.flatMap((f) => validierung.pruefe("feldstueck", { ...meta, ...f }).map((e) => `Feldstück ${f.nummer}: ${e.pfad} – ${e.meldung}`)),
    ...schlaege.flatMap((s) => validierung.pruefe("schlag", { ...meta, ...s }).map((e) => `Schlag ${s.nummer}: ${e.pfad} – ${e.meldung}`)),
  ];
  if (fehler.length) {
    const e = new Error(`Import abgebrochen, nichts wurde gespeichert:\n${fehler.slice(0, 10).join("\n")}`);
    e.fehler = fehler;
    throw e;
  }

  for (const k of kulturen) await daten.speichern("kultur", k);
  for (const f of feldstuecke) await daten.speichern("feldstueck", f);
  for (const s of schlaege) await daten.speichern("schlag", s);
  return { kulturen: kulturen.length, feldstuecke: feldstuecke.length, schlaege: schlaege.length };
}
