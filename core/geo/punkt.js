// Liegt ein Punkt in einer Fläche? (für die Feldnotiz: „in welchem Schlag stehe ich gerade?“)
// Koordinaten wie GeoJSON: [Länge, Breite]. Strahl-Methode, Löcher werden berücksichtigt.

function imRing(punkt, ring) {
  const [x, y] = punkt;
  let drin = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) drin = !drin;
  }
  return drin;
}

function imPolygon(punkt, ringe) {
  if (!ringe?.length || !imRing(punkt, ringe[0])) return false;
  return !ringe.slice(1).some((loch) => imRing(punkt, loch));
}

export function punktInGeometrie(punkt, geometrie) {
  if (!geometrie) return false;
  if (geometrie.type === "Polygon") return imPolygon(punkt, geometrie.coordinates);
  if (geometrie.type === "MultiPolygon") return geometrie.coordinates.some((p) => imPolygon(punkt, p));
  return false;
}

/** Ungefährer Abstand in Metern zwischen zwei [Länge, Breite]-Punkten (für Hinweise, nicht zum Vermessen). */
export function abstandM([l1, b1], [l2, b2]) {
  const r = 6371000;
  const rad = Math.PI / 180;
  const db = (b2 - b1) * rad;
  const dl = (l2 - l1) * rad;
  const a = Math.sin(db / 2) ** 2 + Math.cos(b1 * rad) * Math.cos(b2 * rad) * Math.sin(dl / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(a));
}

/** Mittelpunkt (Schwerpunkt der Eckpunkte des äußeren Rings) – reicht für „nächster Schlag“. */
export function mittelpunkt(geometrie) {
  const ring = geometrie?.type === "Polygon" ? geometrie.coordinates[0] : geometrie?.type === "MultiPolygon" ? geometrie.coordinates[0][0] : null;
  if (!ring?.length) return null;
  const n = ring.length - 1 || 1;
  const s = ring.slice(0, n).reduce((a, [x, y]) => [a[0] + x, a[1] + y], [0, 0]);
  return [s[0] / n, s[1] / n];
}
