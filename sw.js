// Service Worker – macht AGRARDOK+ offline nutzbar.
//
// Strategie:
//  - Beim Installieren werden ALLE App-Dateien (APP_DATEIEN) in einen versionierten Cache geladen.
//  - Danach kommen App-Dateien zuerst aus dem Cache („cache first“): die App startet sofort,
//    auch bei schlechtem Empfang am Feld.
//  - Entwicklungsmodus (localhost/127.0.0.1): zuerst Netz, Cache nur als Rückfall – damit
//    geänderter Code sofort sichtbar ist. Offline funktioniert trotzdem.
//  - Neue Version: VERSION erhöhen. Der neue Service Worker wartet, bis die Nutzerin in der
//    App auf „Jetzt laden“ tippt (keine Unterbrechung mitten in einer Eingabe).
//
// VERSION muss mit core/version.js übereinstimmen; APP_DATEIEN muss alle App-Dateien enthalten.
// Beides prüft: python3 werkzeuge/pruefe_app.py

const VERSION = "0.5.1";
const CACHE = `agrardok-${VERSION}`;
const ENTWICKLUNG = ["localhost", "127.0.0.1", "[::1]"].includes(self.location.hostname);

const APP_DATEIEN = [
  "./",
  "./betriebsmittel/eintrag.js",
  "./betriebsmittel/index.js",
  "./betriebsmittel/kontext.js",
  "./betriebsmittel/modul.json",
  "./betriebsmittel/seiten.js",
  "./boden/csv.js",
  "./boden/index.js",
  "./boden/modul.json",
  "./boden/seiten.js",
  "./core/app.js",
  "./core/bestand.js",
  "./core/betrieb.js",
  "./core/boden.js",
  "./core/daten.js",
  "./core/db.js",
  "./core/fristen.js",
  "./core/geo/projektion.js",
  "./core/geo/punkt.js",
  "./core/geo/shapefile.js",
  "./core/geo/zip.js",
  "./core/ids.js",
  "./core/installation.js",
  "./core/massnahmen-text.js",
  "./core/migrationen.js",
  "./core/oepul.js",
  "./core/person.js",
  "./core/psm.js",
  "./core/regeln.js",
  "./core/router.js",
  "./core/seiten/einstellungen.js",
  "./core/seiten/start.js",
  "./core/sicherung.js",
  "./core/startkarten.js",
  "./core/ui/aufzeichnung.js",
  "./core/ui/dom.js",
  "./core/ui/formular.js",
  "./core/ui/karte.js",
  "./core/ui/schlagwahl.js",
  "./core/validierung.js",
  "./core/version.js",
  "./css/app.css",
  "./duengung/bericht.js",
  "./duengung/erfassen.js",
  "./duengung/index.js",
  "./duengung/modul.json",
  "./duengung/napv.js",
  "./duengung/planung.js",
  "./feldnotiz/index.js",
  "./feldnotiz/modul.json",
  "./feldnotiz/seiten.js",
  "./flaechen/import-seite.js",
  "./flaechen/import.js",
  "./flaechen/index.js",
  "./flaechen/katalog.js",
  "./flaechen/modul.json",
  "./flaechen/napv.js",
  "./flaechen/seiten.js",
  "./icons/apple-touch-icon.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/icon.svg",
  "./index.html",
  "./manifest.json",
  "./oepul/auswertung.js",
  "./oepul/index.js",
  "./oepul/modul.json",
  "./oepul/seiten.js",
  "./pflanzenschutz/bericht.js",
  "./pflanzenschutz/erfassen.js",
  "./pflanzenschutz/index.js",
  "./pflanzenschutz/modul.json",
  "./pflanzenschutz/pruefung.js",
  "./rules/betriebsmittel/duenger-vorlagen.json",
  "./rules/bio/kontrollstellen.json",
  "./rules/boden/gehaltsklassen.json",
  "./rules/import/eama-gis.json",
  "./rules/kulturen.json",
  "./rules/napv/aufzeichnungspflicht.json",
  "./rules/napv/duengung.json",
  "./rules/oepul/begruenung.json",
  "./rules/oepul/massnahmen.json",
  "./schema/aenderung.schema.json",
  "./schema/anhang.schema.json",
  "./schema/betrieb.schema.json",
  "./schema/betriebsmittel.schema.json",
  "./schema/bodenprobe.schema.json",
  "./schema/common.schema.json",
  "./schema/duengeplan.schema.json",
  "./schema/export.schema.json",
  "./schema/feldnotiz.schema.json",
  "./schema/feldstueck.schema.json",
  "./schema/kultur.schema.json",
  "./schema/maschine.schema.json",
  "./schema/massnahme.schema.json",
  "./schema/massnahmen/aussaat.schema.json",
  "./schema/massnahmen/bewaesserung.schema.json",
  "./schema/massnahmen/biozid.schema.json",
  "./schema/massnahmen/bodenbearbeitung.schema.json",
  "./schema/massnahmen/duengung.schema.json",
  "./schema/massnahmen/ernte.schema.json",
  "./schema/massnahmen/feldmiete.schema.json",
  "./schema/massnahmen/pflanzenschutz.schema.json",
  "./schema/massnahmen/pflege.schema.json",
  "./schema/massnahmen/tierbehandlung.schema.json",
  "./schema/massnahmen/tierbewegung.schema.json",
  "./schema/massnahmen/weide.schema.json",
  "./schema/person.schema.json",
  "./schema/schlag.schema.json",
  "./schema/tier.schema.json",
  "./schlagkartei/erfassen.js",
  "./schlagkartei/index.js",
  "./schlagkartei/kartei.js",
  "./schlagkartei/modul.json",
  "./stammdaten/betrieb.js",
  "./stammdaten/index.js",
  "./stammdaten/kontext.js",
  "./stammdaten/maschinen.js",
  "./stammdaten/modul.json",
  "./stammdaten/personen.js",
  "./vendor/README.md",
  "./vendor/leaflet/LICENSE",
  "./vendor/leaflet/images/layers-2x.png",
  "./vendor/leaflet/images/layers.png",
  "./vendor/leaflet/images/marker-icon-2x.png",
  "./vendor/leaflet/images/marker-icon.png",
  "./vendor/leaflet/images/marker-shadow.png",
  "./vendor/leaflet/leaflet.css",
  "./vendor/leaflet/leaflet.js",
];

self.addEventListener("install", (ereignis) => {
  ereignis.waitUntil(
    caches.open(CACHE).then((cache) =>
      // cache: "reload" umgeht den HTTP-Cache, damit wirklich die neue Version geladen wird
      cache.addAll(APP_DATEIEN.map((url) => new Request(url, { cache: "reload" }))),
    ),
  );
  // Erstinstallation: sofort aktiv werden. Updates warten auf „Jetzt laden“ (siehe message).
  if (!self.registration.active) self.skipWaiting();
});

self.addEventListener("activate", (ereignis) => {
  ereignis.waitUntil(
    (async () => {
      for (const name of await caches.keys()) {
        if ((name.startsWith("agrardok-") || name.startsWith("agraropen-")) && name !== CACHE) await caches.delete(name);
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (ereignis) => {
  if (ereignis.data?.typ === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (ereignis) => {
  const anfrage = ereignis.request;
  if (anfrage.method !== "GET") return;
  const url = new URL(anfrage.url);
  if (url.origin !== self.location.origin) return; // fremde Adressen nicht anfassen

  const scope = new URL(self.registration.scope);
  const istAppStart = anfrage.mode === "navigate" && (url.pathname === scope.pathname || url.pathname === `${scope.pathname}index.html`);

  if (istAppStart) {
    ereignis.respondWith(ENTWICKLUNG ? netzZuerst(anfrage, "./index.html") : cacheZuerst(new Request("./index.html")));
  } else if (anfrage.mode === "navigate") {
    // Andere Seiten (z. B. tests/, docs/) nicht aus dem Cache bedienen
    ereignis.respondWith(fetch(anfrage).catch(() => caches.match("./index.html")));
  } else {
    ereignis.respondWith(ENTWICKLUNG ? netzZuerst(anfrage) : cacheZuerst(anfrage));
  }
});

async function cacheZuerst(anfrage) {
  const treffer = await caches.match(anfrage, { cacheName: CACHE });
  return treffer ?? fetch(anfrage);
}

async function netzZuerst(anfrage, rueckfall) {
  try {
    const antwort = await fetch(anfrage, { cache: "no-store" });
    if (antwort.ok && APP_DATEIEN.some((p) => new URL(p, self.registration.scope).href === anfrage.url)) {
      const kopie = antwort.clone();
      caches.open(CACHE).then((c) => c.put(anfrage, kopie));
    }
    return antwort;
  } catch (fehler) {
    const treffer = await caches.match(rueckfall ?? anfrage, { cacheName: CACHE });
    if (treffer) return treffer;
    throw fehler;
  }
}

// Tippen auf eine Erinnerung (core/fristen.js): App öffnen bzw. nach vorne holen und zur Frist springen
self.addEventListener("notificationclick", (ereignis) => {
  ereignis.notification.close();
  const ziel = new URL(`./${ereignis.notification.data?.href ?? "#/fristen"}`, self.registration.scope).href;
  ereignis.waitUntil((async () => {
    const fenster = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const f of fenster) {
      if ("focus" in f) {
        await f.focus();
        return f.navigate ? f.navigate(ziel) : undefined;
      }
    }
    return self.clients.openWindow(ziel);
  })());
});
