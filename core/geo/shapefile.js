// Shapefile-Leser (ESRI-Spezifikation 1998) – nur was für Flächen gebraucht wird:
// Polygone (Typ 5, 15, 25) aus .shp, Attribute aus .dbf (dBase III/IV), Zeichensatz aus .cpg.

const POLYGON_TYPEN = new Set([5, 15, 25]);
const TYP_NAMEN = { 0: "leer", 1: "Punkte", 3: "Linien", 5: "Polygone", 8: "Multipunkte", 11: "Punkte (Z)", 13: "Linien (Z)", 15: "Polygone (Z)", 21: "Punkte (M)", 23: "Linien (M)", 25: "Polygone (M)" };

/** Liest eine .shp-Datei. Liefert {typ, geometrien} – Geometrien als GeoJSON (Koordinaten im Quellsystem). */
export function leseShp(puffer) {
  const d = new DataView(puffer instanceof ArrayBuffer ? puffer : puffer.buffer.slice(puffer.byteOffset, puffer.byteOffset + puffer.byteLength));
  if (d.byteLength < 100 || d.getInt32(0, false) !== 9994) throw new Error("Die .shp-Datei ist ungültig.");
  const typ = d.getInt32(32, true);
  if (!POLYGON_TYPEN.has(typ) && typ !== 0) {
    throw new Error(`Die Datei enthält ${TYP_NAMEN[typ] ?? `Typ ${typ}`}, erwartet werden Flächen (Polygone).`);
  }
  const geometrien = [];
  let pos = 100;
  while (pos + 8 <= d.byteLength) {
    const inhaltLaenge = d.getInt32(pos + 4, false) * 2; // in 16-Bit-Wörtern
    const start = pos + 8;
    const satzTyp = d.getInt32(start, true);
    geometrien.push(satzTyp === 0 ? null : lesePolygon(d, start));
    pos = start + inhaltLaenge;
  }
  return { typ, geometrien };
}

function lesePolygon(d, start) {
  const teile = d.getInt32(start + 36, true);
  const punkte = d.getInt32(start + 40, true);
  const teilStart = [];
  for (let i = 0; i < teile; i++) teilStart.push(d.getInt32(start + 44 + i * 4, true));
  const pBasis = start + 44 + teile * 4;
  const ringe = teilStart.map((von, i) => {
    const bis = i + 1 < teile ? teilStart[i + 1] : punkte;
    const ring = [];
    for (let k = von; k < bis; k++) ring.push([d.getFloat64(pBasis + k * 16, true), d.getFloat64(pBasis + k * 16 + 8, true)]);
    return ring;
  });
  return ringeZuGeoJson(ringe);
}

/** Vorzeichenbehaftete Fläche (Shoelace): negativ = im Uhrzeigersinn (bei Y nach oben). */
export function ringFlaeche(ring) {
  let s = 0;
  for (let i = 0, n = ring.length; i < n; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % n];
    s += x1 * y2 - x2 * y1;
  }
  return s / 2;
}

function punktImRing([x, y], ring) {
  let innen = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) innen = !innen;
  }
  return innen;
}

/**
 * Shapefile: Außenringe im Uhrzeigersinn, Löcher gegen den Uhrzeigersinn.
 * GeoJSON (RFC 7946): Außenringe gegen, Löcher im Uhrzeigersinn → Ringe werden umgedreht.
 */
function ringeZuGeoJson(ringe) {
  const aussen = [];
  const loecher = [];
  for (const r of ringe) {
    if (r.length < 4) continue;
    (ringFlaeche(r) < 0 ? aussen : loecher).push(r);
  }
  if (!aussen.length && loecher.length) aussen.push(...loecher.splice(0)); // falsch orientierte Dateien tolerieren
  const polygone = aussen.map((r) => [r]);
  for (const loch of loecher) {
    const ziel = polygone.find((p) => punktImRing(loch[0], p[0])) ?? polygone[0];
    ziel?.push(loch);
  }
  for (const p of polygone) {
    p[0] = ringFlaeche(p[0]) < 0 ? p[0].slice().reverse() : p[0];
    for (let i = 1; i < p.length; i++) p[i] = ringFlaeche(p[i]) > 0 ? p[i].slice().reverse() : p[i];
  }
  if (!polygone.length) return null;
  return polygone.length === 1 ? { type: "Polygon", coordinates: polygone[0] } : { type: "MultiPolygon", coordinates: polygone };
}

// ---------------------------------------------------------------------------

const CPG_ZU_KODIERUNG = { "utf-8": "utf-8", utf8: "utf-8", "1252": "windows-1252", cp1252: "windows-1252", "windows-1252": "windows-1252",
  "iso-8859-1": "iso-8859-1", "8859_1": "iso-8859-1", latin1: "iso-8859-1", "iso-8859-15": "iso-8859-15", "850": "ibm850" };
// dBase „Language Driver“-Byte (Offset 29) → Zeichensatz
const LDID = { 0x03: "windows-1252", 0x57: "windows-1252", 0x58: "windows-1252", 0x02: "ibm850", 0x01: "ibm437", 0x26: "ibm866" };

export function kodierungAusCpg(text) {
  return CPG_ZU_KODIERUNG[String(text ?? "").trim().toLowerCase()] ?? null;
}

/** Liest eine .dbf-Datei. kodierung: aus .cpg; sonst Language-Driver-Byte, sonst UTF-8 mit Rückfall Windows-1252. */
export function leseDbf(puffer, kodierung = null) {
  const bytes = puffer instanceof Uint8Array ? puffer : new Uint8Array(puffer);
  const d = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const anzahl = d.getUint32(4, true);
  const kopfLaenge = d.getUint16(8, true);
  const satzLaenge = d.getUint16(10, true);
  const felder = [];
  for (let pos = 32; pos + 32 <= kopfLaenge && bytes[pos] !== 0x0d; pos += 32) {
    const name = new TextDecoder("ascii").decode(bytes.subarray(pos, pos + 11)).replace(/\0.*$/s, "").trim();
    felder.push({ name, typ: String.fromCharCode(bytes[pos + 11]), laenge: bytes[pos + 16], dezimal: bytes[pos + 17] });
  }
  const dekodierer = waehleDekodierer(bytes, kopfLaenge, satzLaenge, anzahl, kodierung ?? LDID[bytes[29]] ?? null);
  const datensaetze = [];
  for (let i = 0; i < anzahl; i++) {
    const start = kopfLaenge + i * satzLaenge;
    if (start + satzLaenge > bytes.length) break;
    if (bytes[start] === 0x2a) { datensaetze.push(null); continue; } // gelöscht – Position für .shp-Zuordnung behalten
    const satz = {};
    let pos = start + 1;
    for (const f of felder) {
      satz[f.name] = wert(f, dekodierer.decode(bytes.subarray(pos, pos + f.laenge)).trim());
      pos += f.laenge;
    }
    datensaetze.push(satz);
  }
  return { felder, datensaetze, kodierung: dekodierer.encoding };
}

function waehleDekodierer(bytes, kopf, satzLaenge, anzahl, kodierung) {
  if (kodierung) return new TextDecoder(kodierung);
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(kopf, kopf + satzLaenge * anzahl));
    return new TextDecoder("utf-8");
  } catch {
    return new TextDecoder("windows-1252");
  }
}

function wert(feld, text) {
  if (text === "") return null;
  switch (feld.typ) {
    case "N": case "F": { const z = Number(text.replace(",", ".")); return Number.isFinite(z) ? z : null; }
    case "L": return /^[TtYyJj]$/.test(text) ? true : /^[FfNn]$/.test(text) ? false : null;
    case "D": return /^\d{8}$/.test(text) ? `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}` : text;
    default: return text;
  }
}
