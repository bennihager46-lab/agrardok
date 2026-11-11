# Fremdbibliotheken (eingecheckt)

Eingecheckt statt per CDN geladen, damit die App offline funktioniert und die Content Security Policy (`script-src 'self'`) eingehalten wird.

| Bibliothek | Version | Lizenz | Herkunft | Prüfsumme (npm shasum des Pakets) |
|---|---|---|---|---|
| [Leaflet](https://leafletjs.com) | 1.9.4 | BSD-2-Clause (`leaflet/LICENSE`) | npm-Paket `leaflet@1.9.4`, Dateien aus `dist/` unverändert | `23fae724e282fa25745aff82ca4d394748db7d8d` |

Aktualisieren: Paket von npm laden, shasum gegen `https://registry.npmjs.org/<paket>/<version>` prüfen, Dateien ersetzen, diese Tabelle und `APP_DATEIEN` in `sw.js` anpassen.
