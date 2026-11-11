// Koordinatenumrechnung nach WGS84 (GeoJSON, Karte) – ohne Fremdbibliothek.
//
// Unterstützt:
//   - Lambert Conformal Conic 2SP (z. B. EPSG:31287 „MGI / Austria Lambert“, Format der INVEKOS-Daten)
//   - Transverse Mercator (z. B. MGI / Austria GK M28/M31/M34, EPSG:31254–31259, 31284–31286)
//   - Web Mercator (EPSG:3857) und geografische Koordinaten (WGS84/ETRS89)
// Datumsübergang MGI → WGS84 mit 7-Parameter-Helmert (Position-Vector-Konvention, Parameter
// wie +towgs84 in PROJ für EPSG:31287). Geprüft gegen den INVEKOS-Dienst der AMA: 0,00 m
// Abweichung an 6 Punkten in ganz Österreich (tests/geo.test.js).

const ELLIPSOIDE = {
  bessel: { a: 6377397.155, f: 1 / 299.1528128 },
  wgs84: { a: 6378137, f: 1 / 298.257223563 },
  grs80: { a: 6378137, f: 1 / 298.257222101 },
};
export const MGI_ZU_WGS84 = [577.326, 90.129, 463.919, 5.137, 1.474, 5.297, 2.4232];

export const EPSG_31287 = {
  name: "MGI / Austria Lambert (EPSG:31287)", art: "lcc", ellipsoid: ELLIPSOIDE.bessel, towgs84: MGI_ZU_WGS84,
  lat0: 47.5, lon0: 13 + 1 / 3, lat1: 49, lat2: 46, x0: 400000, y0: 400000,
};
export const WGS84 = { name: "WGS84 (geografisch)", art: "geo" };

const rad = (g) => (g * Math.PI) / 180;
const grad = (r) => (r * 180) / Math.PI;

// ---------- WKT (.prj) lesen ----------

/** Zerlegt WKT1 in verschachtelte Knoten {name, werte[]}. */
export function parseWkt(text) {
  let i = 0;
  const leer = () => { while (/\s/.test(text[i])) i++; };
  const knoten = () => {
    leer();
    const m = /^[A-Za-z_0-9]+/.exec(text.slice(i));
    if (!m) throw new Error("WKT ungültig");
    i += m[0].length;
    leer();
    const auf = text[i];
    if (auf !== "[" && auf !== "(") return { name: m[0].toUpperCase(), werte: [] };
    const zu = auf === "[" ? "]" : ")";
    i++;
    const werte = [];
    for (;;) {
      leer();
      if (text[i] === zu) { i++; break; }
      if (text[i] === '"') {
        const ende = text.indexOf('"', i + 1);
        werte.push(text.slice(i + 1, ende));
        i = ende + 1;
      } else if (/[-+.\d]/.test(text[i])) {
        const z = /^[-+]?[\d.]+(?:[eE][-+]?\d+)?/.exec(text.slice(i))[0];
        werte.push(Number(z));
        i += z.length;
      } else werte.push(knoten());
      leer();
      if (text[i] === ",") i++;
    }
    return { name: m[0].toUpperCase(), werte };
  };
  return knoten();
}

const kinder = (k, name) => k.werte.filter((w) => typeof w === "object" && w.name === name);
const kind = (k, name) => kinder(k, name)[0];
function suche(k, name) {
  if (!k || typeof k !== "object") return null;
  if (k.name === name) return k;
  for (const w of k.werte) { const t = suche(w, name); if (t) return t; }
  return null;
}

/**
 * Erkennt das Koordinatensystem aus einer .prj-Datei.
 * @returns {{crs: object|null, name: string, fehler?: string}}
 */
export function erkenneKoordinatensystem(prjText) {
  if (!prjText?.trim()) return { crs: null, name: "unbekannt (keine .prj-Datei)", fehler: "Die .prj-Datei fehlt – das Koordinatensystem ist unbekannt." };
  let wkt;
  try { wkt = parseWkt(prjText.trim()); } catch { return { crs: null, name: "unlesbar", fehler: "Die .prj-Datei ist nicht lesbar." }; }
  const name = wkt.werte[0] ?? wkt.name;
  const datumName = String(suche(wkt, "DATUM")?.werte[0] ?? "").toLowerCase();
  const sph = suche(wkt, "SPHEROID") ?? suche(wkt, "ELLIPSOID");
  const ellipsoid = sph ? { a: sph.werte[1], f: sph.werte[2] ? 1 / sph.werte[2] : 0 } : ELLIPSOIDE.wgs84;
  const toWgs = suche(wkt, "TOWGS84")?.werte.map(Number);
  const istMgi = /mgi|militar|hermannskogel/.test(datumName);
  // Fehlt TOWGS84 bei MGI (typisch für ESRI-.prj), gelten die Standard-Parameter wie in PROJ
  const towgs84 = toWgs?.length >= 3 ? [...toWgs, 0, 0, 0, 0].slice(0, 7) : istMgi ? MGI_ZU_WGS84 : null;
  if (!istMgi && !towgs84 && !/wgs|etrs|d_wgs_1984|d_etrs_1989|grs/.test(datumName)) {
    return { crs: null, name, fehler: `Das Datum „${datumName || "?"}“ wird nicht unterstützt.` };
  }

  if (wkt.name === "GEOGCS" || wkt.name === "GEOGCRS") return { crs: { ...WGS84, name }, name };
  if (wkt.name !== "PROJCS" && wkt.name !== "PROJCRS") return { crs: null, name, fehler: "Unbekannter Aufbau der .prj-Datei." };

  const projektion = String(kind(wkt, "PROJECTION")?.werte[0] ?? "").toLowerCase();
  const p = {};
  for (const par of kinder(wkt, "PARAMETER")) p[String(par.werte[0]).toLowerCase()] = par.werte[1];
  const einheit = kind(wkt, "UNIT")?.werte[1] ?? 1;
  if (einheit !== 1) return { crs: null, name, fehler: "Nur Koordinaten in Metern werden unterstützt." };
  const basis = { name, ellipsoid, towgs84 };

  if (projektion.includes("lambert_conformal_conic")) {
    return { name, crs: { ...basis, art: "lcc",
      lat0: p.latitude_of_origin ?? 0, lon0: p.central_meridian ?? 0,
      lat1: p.standard_parallel_1, lat2: p.standard_parallel_2 ?? p.standard_parallel_1,
      x0: p.false_easting ?? 0, y0: p.false_northing ?? 0 } };
  }
  if (projektion.includes("transverse_mercator")) {
    return { name, crs: { ...basis, art: "tmerc", lat0: p.latitude_of_origin ?? 0, lon0: p.central_meridian ?? 0,
      k0: p.scale_factor ?? 1, x0: p.false_easting ?? 0, y0: p.false_northing ?? 0 } };
  }
  if (projektion.includes("mercator") && (/pseudo|auxiliary|web/i.test(name) || projektion.includes("popular"))) {
    return { name, crs: { name, art: "webmercator" } };
  }
  return { crs: null, name, fehler: `Die Projektion „${projektion}“ wird nicht unterstützt.` };
}

// ---------- Umrechnung ----------

/** Liefert eine Funktion [x, y] → [lon, lat] (WGS84, Grad, 7 Nachkommastellen ≈ 1 cm). */
export function nachWgs84(crs) {
  if (crs.art === "geo") return ([x, y]) => [runde(x), runde(y)];
  if (crs.art === "webmercator") {
    const R = 6378137;
    return ([x, y]) => [runde(grad(x / R)), runde(grad(2 * Math.atan(Math.exp(y / R)) - Math.PI / 2))];
  }
  const inv = crs.art === "lcc" ? lccInvers(crs) : tmercInvers(crs);
  const e2q = crs.ellipsoid.f * (2 - crs.ellipsoid.f);
  const wgs = ELLIPSOIDE.wgs84;
  const e2w = wgs.f * (2 - wgs.f);
  return (xy) => {
    let [phi, lam] = inv(xy);
    if (crs.towgs84) {
      const [X, Y, Z] = helmert(geoZuKartesisch(phi, lam, crs.ellipsoid.a, e2q), crs.towgs84);
      [phi, lam] = kartesischZuGeo(X, Y, Z, wgs.a, e2w);
    }
    return [runde(grad(lam)), runde(grad(phi))];
  };
}

const runde = (z) => Math.round(z * 1e7) / 1e7;

function lccInvers({ ellipsoid: { a, f }, lat0, lon0, lat1, lat2, x0, y0 }) {
  const e2 = f * (2 - f);
  const e = Math.sqrt(e2);
  const m = (p) => Math.cos(p) / Math.sqrt(1 - e2 * Math.sin(p) ** 2);
  const t = (p) => Math.tan(Math.PI / 4 - p / 2) / ((1 - e * Math.sin(p)) / (1 + e * Math.sin(p))) ** (e / 2);
  const [p0, p1, p2] = [rad(lat0), rad(lat1), rad(lat2)];
  const n = lat1 === lat2 ? Math.sin(p1) : (Math.log(m(p1)) - Math.log(m(p2))) / (Math.log(t(p1)) - Math.log(t(p2)));
  const F = m(p1) / (n * t(p1) ** n);
  const r0 = a * F * t(p0) ** n;
  const l0 = rad(lon0);
  return ([x, y]) => {
    const dx = x - x0;
    const dy = r0 - (y - y0);
    const r = Math.sign(n) * Math.hypot(dx, dy);
    const theta = Math.atan2(Math.sign(n) * dx, Math.sign(n) * dy);
    const tt = (r / (a * F)) ** (1 / n);
    let phi = Math.PI / 2 - 2 * Math.atan(tt);
    for (let i = 0; i < 15; i++) {
      const neu = Math.PI / 2 - 2 * Math.atan(tt * ((1 - e * Math.sin(phi)) / (1 + e * Math.sin(phi))) ** (e / 2));
      if (Math.abs(neu - phi) < 1e-14) { phi = neu; break; }
      phi = neu;
    }
    return [phi, theta / n + l0];
  };
}

function tmercInvers({ ellipsoid: { a, f }, lat0, lon0, k0, x0, y0 }) {
  // Snyder, Map Projections – A Working Manual, Gl. 8-12 ff.
  const e2 = f * (2 - f);
  const ep2 = e2 / (1 - e2);
  const M = (p) => a * ((1 - e2 / 4 - (3 * e2 ** 2) / 64 - (5 * e2 ** 3) / 256) * p
    - ((3 * e2) / 8 + (3 * e2 ** 2) / 32 + (45 * e2 ** 3) / 1024) * Math.sin(2 * p)
    + ((15 * e2 ** 2) / 256 + (45 * e2 ** 3) / 1024) * Math.sin(4 * p) - ((35 * e2 ** 3) / 3072) * Math.sin(6 * p));
  const M0 = M(rad(lat0));
  const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
  return ([x, y]) => {
    const mu = (M0 + (y - y0) / k0) / (a * (1 - e2 / 4 - (3 * e2 ** 2) / 64 - (5 * e2 ** 3) / 256));
    const p1 = mu + ((3 * e1) / 2 - (27 * e1 ** 3) / 32) * Math.sin(2 * mu) + ((21 * e1 ** 2) / 16 - (55 * e1 ** 4) / 32) * Math.sin(4 * mu)
      + ((151 * e1 ** 3) / 96) * Math.sin(6 * mu) + ((1097 * e1 ** 4) / 512) * Math.sin(8 * mu);
    const C1 = ep2 * Math.cos(p1) ** 2;
    const T1 = Math.tan(p1) ** 2;
    const N1 = a / Math.sqrt(1 - e2 * Math.sin(p1) ** 2);
    const R1 = (a * (1 - e2)) / (1 - e2 * Math.sin(p1) ** 2) ** 1.5;
    const D = (x - x0) / (N1 * k0);
    const phi = p1 - ((N1 * Math.tan(p1)) / R1) * (D ** 2 / 2 - ((5 + 3 * T1 + 10 * C1 - 4 * C1 ** 2 - 9 * ep2) * D ** 4) / 24
      + ((61 + 90 * T1 + 298 * C1 + 45 * T1 ** 2 - 252 * ep2 - 3 * C1 ** 2) * D ** 6) / 720);
    const lam = rad(lon0) + (D - ((1 + 2 * T1 + C1) * D ** 3) / 6 + ((5 - 2 * C1 + 28 * T1 - 3 * C1 ** 2 + 8 * ep2 + 24 * T1 ** 2) * D ** 5) / 120) / Math.cos(p1);
    return [phi, lam];
  };
}

function geoZuKartesisch(phi, lam, a, e2) {
  const N = a / Math.sqrt(1 - e2 * Math.sin(phi) ** 2);
  return [N * Math.cos(phi) * Math.cos(lam), N * Math.cos(phi) * Math.sin(lam), N * (1 - e2) * Math.sin(phi)];
}

function kartesischZuGeo(X, Y, Z, a, e2) {
  const lam = Math.atan2(Y, X);
  const p = Math.hypot(X, Y);
  let phi = Math.atan2(Z, p * (1 - e2));
  for (let i = 0; i < 10; i++) {
    const N = a / Math.sqrt(1 - e2 * Math.sin(phi) ** 2);
    phi = Math.atan2(Z + e2 * N * Math.sin(phi), p);
  }
  return [phi, lam];
}

/** 7-Parameter-Helmert, Position-Vector-Konvention (wie +towgs84 in PROJ). */
function helmert([X, Y, Z], [tx, ty, tz, rx = 0, ry = 0, rz = 0, s = 0]) {
  const k = Math.PI / (180 * 3600);
  const [wx, wy, wz] = [rx * k, ry * k, rz * k];
  const m = 1 + s * 1e-6;
  return [tx + m * (X - wz * Y + wy * Z), ty + m * (wz * X + Y - wx * Z), tz + m * (-wy * X + wx * Y + Z)];
}

// ---------- Geometrie-Hilfen ----------

export function transformiereGeometrie(geometrie, fn) {
  if (!geometrie) return null;
  if (geometrie.type === "Polygon") return { type: "Polygon", coordinates: geometrie.coordinates.map((r) => r.map(fn)) };
  if (geometrie.type === "MultiPolygon") return { type: "MultiPolygon", coordinates: geometrie.coordinates.map((p) => p.map((r) => r.map(fn))) };
  throw new Error(`Geometrietyp ${geometrie.type} wird nicht unterstützt (nur Flächen).`);
}

/** Fläche einer WGS84-Geometrie in Hektar (sphärische Näherung wie @turf/area, Genauigkeit ~0,5 %). */
export function flaecheHa(geometrie) {
  if (!geometrie) return 0;
  const R = 6378137;
  const ring = (r) => {
    let s = 0;
    for (let i = 0; i < r.length - 1; i++) {
      const [l1, p1] = r[i];
      const [l2, p2] = r[i + 1];
      s += rad(l2 - l1) * (2 + Math.sin(rad(p1)) + Math.sin(rad(p2)));
    }
    return Math.abs((s * R * R) / 2);
  };
  const polygon = (p) => ring(p[0]) - p.slice(1).reduce((s, r) => s + ring(r), 0);
  const m2 = geometrie.type === "Polygon" ? polygon(geometrie.coordinates) : geometrie.coordinates.reduce((s, p) => s + polygon(p), 0);
  return m2 / 10000;
}

/** Fasst mehrere (Multi-)Polygone zu einem MultiPolygon zusammen (ohne Verschmelzen). */
export function vereinige(geometrien) {
  const teile = [];
  for (const g of geometrien) {
    if (!g) continue;
    if (g.type === "Polygon") teile.push(g.coordinates);
    else teile.push(...g.coordinates);
  }
  if (!teile.length) return null;
  return teile.length === 1 ? { type: "Polygon", coordinates: teile[0] } : { type: "MultiPolygon", coordinates: teile };
}

export function begrenzung(geometrien) {
  let [w, s, o, n] = [Infinity, Infinity, -Infinity, -Infinity];
  const besuche = (k) => {
    if (typeof k[0] === "number") { w = Math.min(w, k[0]); o = Math.max(o, k[0]); s = Math.min(s, k[1]); n = Math.max(n, k[1]); }
    else k.forEach(besuche);
  };
  geometrien.filter(Boolean).forEach((g) => besuche(g.coordinates));
  return Number.isFinite(w) ? [[s, w], [n, o]] : null;
}
