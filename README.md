# AGRARDOK+

Kostenloses Open-Source-Ökosystem für landwirtschaftliche Aufzeichnungen in Österreich.
Es richtet sich an kleine und mittlere Familienbetriebe (Ackerbau, Grünland, Rinder, Schweine) und ist für das Handy gebaut, auch ohne Internet nutzbar.

## Stand

Version 0.5.1 (umbenannt von „AgrarOpen“ in **AGRARDOK+**; ältere Sicherungsdateien lassen sich weiter importieren):
- **Grundgerüst:** installierbar, offline-fähig, Navigation unten, Datenbank mit Migrationen und Änderungsprotokoll, Export und Import aller Daten (JSON).
- **Modul Betrieb** (`stammdaten/`): Betriebsdaten (Name, LFBIS-Betriebsnummer, Adresse, Bewirtschafter:in, Bio und Kontrollstelle, Nitrat-Gebiet, ÖPUL-Maßnahmen) sowie Personen am Betrieb mit Sachkundeausweis Pflanzenschutz. Warnt, wenn ein Ausweis abgelaufen ist oder in 90 Tagen abläuft.
- **Validierung:** Jeder Datensatz wird vor dem Speichern und beim Import gegen die JSON-Schemas geprüft (`core/validierung.js`, offline, ohne Fremdbibliothek). Fehler erscheinen in Alltagssprache direkt am Feld.

- **Modul Flächen** (`flaechen/`): Feldstücke (Nutzungsart, Fläche, Bodenart/-schwere, Hangneigung, Gewässernähe) und Schläge je Antragsjahr (Kultur, Vorfrucht, Ertragslage); „Schläge vom Vorjahr übernehmen“; Hinweis zur NAPV-Aufzeichnungspflicht; Karte (Leaflet) mit OpenStreetMap, basemap.at-Grundkarte und -Luftbild.
- **Import aus eAMA:** GIS-Export als Shapefile (ZIP muss nicht entpackt werden) oder GeoJSON. Umrechnung aus EPSG:31287 (MGI/Austria Lambert) ohne Fremdbibliothek, geprüft gegen den INVEKOS-Dienst der AMA (0,00 m Abweichung). Automatische Spaltenzuordnung mit Vorschau (Karte, Liste, Warnungen), Wiedererkennen beim nächsten Import, mitgelieferter Kulturkatalog (84 Schlagnutzungsarten).

- **Modul Betriebsmittel** (`betriebsmittel/`, 0.4): Dünger mit N/P/K-Gehalten (Vorlagen für gängige Mineraldünger, Wirtschaftsdünger-Übernahme laut Abgabevertrag, NAPV-Düngerart), Pflanzenschutzmittel (Zulassungsnummer, Wirkstoffe, Fristen, Indikationen mit Aufwand und Wartezeit, Auflagen), Saatgut, Tierarzneimittel mit Wartezeiten. Das Pflanzenschutzmittelregister ist **keine offene Datenquelle** (siehe [Rechtsgrundlagen 2.5](docs/rechtsgrundlagen.md#25-datenzugang-pflanzenschutzmittelregister-geprüft-11112026)) – deshalb manuelle Eingabe mit Direktlink zum Registereintrag.
- **Feld-Aufzeichnungen** (0.5), Einstieg über **Aufzeichnen**:
  - **Schlagkartei** (`schlagkartei/`): Bodenbearbeitung, Aussaat, Pflege, Ernte (Ertrag, Feuchte, Rohprotein), Bewässerung – für mehrere Schläge auf einmal, Datum heute, „wie letztes Mal“; Zeitachse je Schlag, Jahresübersicht je Kultur.
  - **Düngung nach NAPV** (`duengung/`): Berechnung von N gesamt, jahreswirksamem N, P₂O₅, K₂O; Prüfung von Sperrfristen, Bodenzustand, Gabenteilung, 60- und 170-kg-Grenze, Gewässerabständen, Hanglagen, Obergrenze laut Düngeplan und ÖPUL-Begrünung – jede Warnung mit Rechtsquelle, wichtige Punkte müssen bestätigt werden. Düngeplanung je Schlag (Anlage 3, P/K aus der Bodenprobe), druckfertiger Jahresbericht. Werte aus der amtlichen RIS-Fassung in `rules/napv/duengung.json`.
  - **Pflanzenschutz** (`pflanzenschutz/`): Felder nach DVO (EU) 2023/564, Tankmischung; prüft Zulassung/Aufbrauchfrist, Indikation für die Kultur, Aufwand, BBCH, Anzahl Anwendungen, Wartezeit bis zur Ernte, Gewässerauflagen, Bienenschutz, Sachkundeausweis, Geräteprüfung. CSV-Export.
  - **ÖPUL** (`oepul/`): nur die gewählten Maßnahmen – Zwischenfruchtanbau (Variante, Begrünungszeitraum), System Immergrün (Lücken), bodennahe Ausbringung, Grundwasserschutz. **Fristenkalender** aus allen Modulen mit Erinnerungen (Benachrichtigung beim Öffnen der App – ohne Server keine Erinnerung bei geschlossener App).
  - **Bodenproben** (`boden/`): pH, P, K, Mg, Humus mit Gehaltsklassen nach den Richtlinien für die sachgerechte Düngung, farbige Karte, CSV-Import von Laborbefunden.
  - **Feldnotiz** (`feldnotiz/`): GPS-Position → Schlag, in dem man steht; Fotos (verkleinert, lokal gespeichert); Text oder Spracheingabe (braucht im Browser meist Internet, sonst Tippen).
- **Maschinen** (im Modul Betrieb): Geräteprüfung (Prüfplakette) für den Pflanzenschutz.

Hinweis, keine Rechtsauskunft: Die App nennt bei jeder Prüfung die Quelle; verbindlich sind die Rechtstexte und die Merkblätter der AMA.

## App starten

Service Worker brauchen einen Webserver (nicht `file://`). Lokal genügt Python:

```sh
python3 -m http.server 8000
```

Dann **http://localhost:8000** öffnen. Auf `localhost` arbeitet der Service Worker im Entwicklungsmodus: Er lädt zuerst aus dem Netz, damit Code-Änderungen sofort sichtbar sind, und fällt offline auf den Cache zurück. Überall sonst (z. B. GitHub Pages) lädt er zuerst aus dem Cache.

**Neue Version veröffentlichen:** `VERSION` in `sw.js` und `APP_VERSION` in `core/version.js` erhöhen. Installierte Apps zeigen dann „Eine neue Version ist bereit – Jetzt laden“. Die Liste der Offline-Dateien (`APP_DATEIEN` in `sw.js`) erzeugt `python3 werkzeuge/pruefe_app.py --schreiben` neu.

## Testen

| Was | Wie |
|---|---|
| Browser-Tests (74 Tests: Datenbank, Migrationen, Export/Import, NAPV-Berechnungen, Pflanzenschutz-Prüfungen, ÖPUL, Bodenklassen, CSV) | Server starten, **http://localhost:8000/tests/** öffnen |
| Service Worker vollständig? Versionen gleich? Schemas für den Browser-Validator verständlich? | `python3 werkzeuge/pruefe_app.py` |
| Daten gegen die Schemas prüfen | `python3 werkzeuge/pruefe_daten.py testdaten/*.json` (braucht `pip install "jsonschema>=4.18"`) |
| Alles automatisch im echten Browser inkl. Offline-Betrieb, Feld-Aufzeichnungen und Layout auf 320 px (71 Prüfungen) | `python3 werkzeuge/teste_offline.py` (braucht `pip install playwright "jsonschema>=4.18"` und `python3 -m playwright install chromium`) |

### Offline-Betrieb selbst prüfen

**Am Computer (Chrome oder Edge):**
1. `python3 -m http.server 8000` starten, http://localhost:8000 öffnen.
2. Entwicklertools öffnen (F12 bzw. ⌥⌘I) → Reiter **Application** → **Service workers**: Status „activated and is running“.
3. Unter **Application → Cache storage → agrardok-0.5.1** stehen alle App-Dateien.
4. Den Server im Terminal mit **Strg+C beenden** (der härteste Test) oder im Reiter **Network** „Offline“ wählen.
5. Seite neu laden: Die App startet, oben erscheint „Offline – alles funktioniert weiter“. Unter Einstellungen `testdaten/musterbetrieb.json` importieren, exportieren, die Seite neu laden: Die Daten bleiben.

**Am Handy** (Service Worker brauchen HTTPS; `http://192.168.…` aus dem Heimnetz funktioniert **nicht**):
1. Die App über GitHub Pages (HTTPS) öffnen, alternativ Android per USB mit Port-Weiterleitung unter `chrome://inspect`.
2. Einmal vollständig laden, auf dem iPhone über Teilen → „Zum Home-Bildschirm“ installieren, auf Android über „App installieren“.
3. **Flugmodus** einschalten, die App über das Symbol öffnen: Sie startet ohne Netz.

## Dokumentation

- [docs/funktionsumfang.md](docs/funktionsumfang.md): Welche Aufzeichnungen gesetzlich vorgeschrieben sind, mit Priorität für das Projekt.
- [docs/rechtsgrundlagen.md](docs/rechtsgrundlagen.md): Geltende Aufzeichnungspflichten (NAPV, ÖPUL, Pflanzenschutz je Bundesland, TAMG, Tierkennzeichnung, Bio, GLÖZ/Konditionalität) mit Pflichtfeldern, Fristen, Quellen und Stand-Datum.
- [docs/architektur.md](docs/architektur.md): Datenmodell (Mermaid), Ordnerstruktur und Modulvertrag, Bewertung der Sync-Varianten mit Empfehlung.
- [docs/roadmap.md](docs/roadmap.md): Meilensteine MVP → v1 → v2 mit 43 Aufgaben, je mit Akzeptanzkriterien und fertigem Umsetzungs-Prompt.

## Projektstruktur

| Ordner | Inhalt |
|---|---|
| `index.html`, `manifest.json`, `sw.js` | App-Hülle, PWA-Manifest, Service Worker (Offline) |
| [core/](core/) | Kern: `db.js` (IndexedDB + Migrationen), `daten.js` (Zugriff + Änderungsprotokoll), `validierung.js`, `sicherung.js` (Export/Import), `ids.js` (UUID, HLC), `geo/` (ZIP, Shapefile, Koordinatenumrechnung), `ui/` (DOM, Formulare, Karte), Router, Seiten |
| [stammdaten/](stammdaten/) | Modul „Betrieb“: Betriebsdaten, Personen, Sachkundeausweis-Status, Maschinen |
| [flaechen/](flaechen/) | Modul „Flächen“: Feldstücke, Schläge, Karte, eAMA-Import |
| [betriebsmittel/](betriebsmittel/) | Modul „Betriebsmittel“: Dünger, Pflanzenschutzmittel, Saatgut, Tierarzneimittel |
| [schlagkartei/](schlagkartei/), [duengung/](duengung/), [pflanzenschutz/](pflanzenschutz/), [oepul/](oepul/), [boden/](boden/), [feldnotiz/](feldnotiz/) | Feld-Aufzeichnungen (Kapitel 3 der Projektidee) |
| [rules/](rules/) | Kataloge und Regeln als JSON mit `quelle`, `gueltig_ab`, `gueltig_bis` (ÖPUL-Maßnahmen und -Begrünung, Bio-Kontrollstellen, Kulturen, eAMA-Spalten, NAPV-Schwellen und -Düngeregeln, Düngervorlagen, Gehaltsklassen) |
| [vendor/](vendor/) | Eingecheckte Fremdbibliotheken (Leaflet 1.9.4, BSD-2) – siehe [vendor/README.md](vendor/README.md) |
| [css/](css/) | Gestaltung: hoher Kontrast, große Touch-Ziele, Navigation unten |
| [icons/](icons/) | App-Icons (eigenes Motiv, erzeugt mit `werkzeuge/erzeuge_icons.py`) |
| [tests/](tests/) | Browser-Tests ohne Build (`tests/index.html`) |
| [schema/](schema/) | JSON-Schemas (Draft 2020-12) für alle Entitäten, Maßnahmenarten, Änderungsprotokoll und Exportformat |
| [testdaten/](testdaten/) | Fiktive Testbetriebe „Musterhof Lindenau“ und „Biohof Sonnleiten“ mit eingebauten Testfällen (siehe [testdaten/README.md](testdaten/README.md)); erzeugt mit `werkzeuge/erzeuge_testdaten.py` |
| [werkzeuge/](werkzeuge/) | Entwicklerwerkzeuge (nicht Teil der App): Prüfungen, Offline-Test, Generatoren für Roadmap, Icons, Testdaten und NAPV-Regeln (`erzeuge_napv_regeln.py`) |
| [.github/ISSUE_TEMPLATE/](.github/ISSUE_TEMPLATE/) | Ein Issue-Template je Roadmap-Aufgabe (erzeugt) |
| [docs/](docs/) | Recherche, Architektur, Roadmap |

## Roadmap pflegen

Aufgaben werden nur in `werkzeuge/roadmap_aufgaben.json` geändert. Danach erzeugt dieser Befehl die Issue-Templates und den Aufgabenteil von `docs/roadmap.md` neu. Er prüft dabei auch, ob alle Links auf vorhandene Überschriften zeigen:

```sh
python3 werkzeuge/erzeuge_roadmap.py
```

## Daten prüfen

```sh
pip install "jsonschema>=4.18"     # einmalig, nur für Entwickler
python3 werkzeuge/pruefe_daten.py testdaten/musterbetrieb.json
```

Das Werkzeug prüft jede Exportdatei gegen die Schemas und kontrolliert, ob alle Verweise (Schläge, Tiere, Kulturen …) existieren.

## Technische Leitplanken

- Progressive Web App, Mobile First, offline-fähig (Service Worker + IndexedDB)
- Ohne Build-Tooling lauffähig (HTML/CSS/JS), hostbar auf GitHub Pages
- Daten bleiben lokal; Export/Import als JSON und CSV, Flächen als GeoJSON
- Gemeinsames Datenmodell; jedes Modul (Düngung, Pflanzenschutz, Tiere …) legt nur eigene Maßnahmen an
- Synchronisation zunächst über Sync-Dateien (kein Server nötig), siehe [Architektur](docs/architektur.md#4-synchronisation-zwischen-geräten-und-personen)
- Rechtsregeln versioniert als JSON unter `/rules` (`quelle`, `gueltig_ab`, `gueltig_bis`)
