// Karten-Baustein auf Basis von Leaflet (vendor/leaflet, BSD-2-Clause), wird erst bei Bedarf geladen.
//
// Hintergrundkarten (nur online; die Flächen selbst werden auch offline gezeichnet):
//  - OpenStreetMap: Tile Usage Policy – nur interaktive Nutzung, kein Vorabladen/Offline,
//    Namensnennung sichtbar. Der Service Worker speichert fremde Kacheln bewusst NICHT.
//  - basemap.at Grundkarte und Orthofoto: Open Government Data, CC BY 4.0, Namensnennung „Datenquelle: basemap.at“.
//    Nur maps.wien.gv.at verwenden: maps1–maps4 stehen zwar im WMTS-Capabilities-Dokument,
//    waren am 11.11.2026 aber im DNS nicht auflösbar (geprüft mit curl).

const LEAFLET_JS = new URL("../../vendor/leaflet/leaflet.js", import.meta.url).href;
const LEAFLET_CSS = new URL("../../vendor/leaflet/leaflet.css", import.meta.url).href;

export const HINTERGRUENDE = {
  osm: {
    name: "Karte (OpenStreetMap)",
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    optionen: { maxZoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-Mitwirkende' },
  },
  basemap: {
    name: "Grundkarte (basemap.at)",
    url: "https://maps.wien.gv.at/basemap/geolandbasemap/normal/google3857/{z}/{y}/{x}.png",
    optionen: { maxZoom: 19, attribution: 'Datenquelle: <a href="https://basemap.at">basemap.at</a>' },
  },
  orthofoto: {
    name: "Luftbild (basemap.at)",
    url: "https://maps.wien.gv.at/basemap/bmaporthofoto30cm/normal/google3857/{z}/{y}/{x}.jpeg",
    optionen: { maxZoom: 19, attribution: 'Datenquelle: <a href="https://basemap.at">basemap.at</a>' },
  },
};

let ladevorgang = null;

export function ladeLeaflet() {
  ladevorgang ??= new Promise((resolve, reject) => {
    if (globalThis.L) return resolve(globalThis.L);
    const css = Object.assign(document.createElement("link"), { rel: "stylesheet", href: LEAFLET_CSS });
    const js = Object.assign(document.createElement("script"), { src: LEAFLET_JS, async: true });
    js.onload = () => resolve(globalThis.L);
    js.onerror = () => {
      ladevorgang = null;
      reject(new Error("Die Kartenbibliothek konnte nicht geladen werden."));
    };
    document.head.append(css, js);
  });
  return ladevorgang;
}

const STIL = {
  feldstueck: { color: "#0f3d13", weight: 3, fillColor: "#ffd60a", fillOpacity: 0.15 },
  schlag: { color: "#ffffff", weight: 2, dashArray: "6 4", fillColor: "#1b5e20", fillOpacity: 0.35 },
  markiert: { color: "#b00020", weight: 4, fillColor: "#ff6b6b", fillOpacity: 0.45 },
};

/**
 * Zeichnet Flächen auf eine Karte.
 * @param {HTMLElement} ziel
 * @param {{ebenen: Array<{geometrie, art: "feldstueck"|"schlag", titel: string, beimTippen?: Function, stil?: object}>, hintergrund?: string}} optionen
 *   stil: eigene Leaflet-Stilangaben (z. B. Farbe nach Gehaltsklasse), überschreibt den Stil der Art
 */
export async function zeigeKarte(ziel, { ebenen, hintergrund = "osm" }) {
  const L = await ladeLeaflet();
  ziel.classList.add("karte-rahmen");
  const karte = L.map(ziel, { zoomControl: true, attributionControl: true, tap: true });
  karte.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');

  const hintergruende = Object.fromEntries(Object.entries(HINTERGRUENDE).map(([k, h]) => [h.name, L.tileLayer(h.url, h.optionen)]));
  const start = hintergruende[HINTERGRUENDE[hintergrund]?.name] ?? Object.values(hintergruende)[0];
  start.addTo(karte);
  L.control.layers(hintergruende, null, { position: "topright", collapsed: true }).addTo(karte);

  const gruppe = L.featureGroup().addTo(karte);
  for (const e of ebenen) {
    if (!e.geometrie) continue;
    const ebene = L.geoJSON({ type: "Feature", geometry: e.geometrie, properties: {} }, { style: { ...(STIL[e.art] ?? STIL.schlag), ...(e.stil ?? {}) } });
    if (e.titel) {
      // Als Element mit textContent übergeben – ein String würde von Leaflet als HTML eingesetzt (Namen kommen von Nutzern/Importen)
      const text = document.createElement("span");
      text.textContent = e.titel;
      ebene.bindTooltip(text, { sticky: true });
    }
    if (e.beimTippen) ebene.on("click", e.beimTippen);
    ebene.addTo(gruppe);
  }
  const grenzen = gruppe.getBounds();
  if (grenzen.isValid()) karte.fitBounds(grenzen, { padding: [16, 16], maxZoom: 17 });
  else karte.setView([47.6, 13.8], 7); // Österreich

  if (!navigator.onLine) {
    const hinweis = document.createElement("p");
    hinweis.className = "karte-hinweis";
    hinweis.textContent = "Offline: Hintergrundkarte nicht verfügbar – die Flächen werden trotzdem angezeigt.";
    ziel.append(hinweis);
  }
  return karte;
}
