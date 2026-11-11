# Testdaten

Alle Betriebe, Personen, Nummern, Mittel und Koordinaten sind **erfunden**. Erzeugt werden die Dateien mit `python3 werkzeuge/erzeuge_testdaten.py`; bitte nicht von Hand bearbeiten. Prüfen lassen sie sich mit `python3 werkzeuge/pruefe_daten.py testdaten/*.json`.

Die JSON-Dateien liest die App unter **Einstellungen → Daten importieren** ein, die Flächendateien (ZIP, GeoJSON) unter **Betrieb → Flächen → Aus eAMA importieren**.

| Datei | Betrieb | Wofür |
|---|---|---|
| `musterbetrieb.json` | Musterhof Lindenau, NÖ, konventionell, 18,2 ha, Rinder und Mastschweine | Vollständiges Beispiel aller Entitäten und Maßnahmenarten (51 Datensätze, Schema 0.5), inkl. Düngeplan, Bodenproben, Feldnotiz. ÖPUL: UBB, Immergrün, bodennahe Ausbringung, Tierwohl Weide. |
| `biohof.json` | Biohof Sonnleiten, Tirol, Bio | Stammdaten-Fälle: Bio mit Kontrollstelle, Tiroler Landesrecht, Einzelperson als Bewirtschafterin (4 Datensätze). |
| `eama-export-beispiel.zip` | 3 fiktive Feldstücke, 6 Schläge im Marchfeld | Nachgebauter eAMA-GIS-Export: Shapefiles `SCHLAEGE_2026` und `FELDSTUECKE_2026`, EPSG:31287, Windows-1252 ohne .cpg, Spaltennamen wie INVEKOS auf 10 Zeichen gekürzt. Enthält: Schlag mit Loch (Feldgehölz), Landschaftselement, Bio-Kennzeichen, unbekannte Nutzungsart „999“, keine Feldstücknummern. In der App: **Betrieb → Flächen → Aus eAMA importieren**. |
| `flaechen-beispiel.geojson` | dieselben 6 Schläge | GeoJSON in WGS84, mit unabhängig (Python) umgerechneten Koordinaten – die Browser-Tests vergleichen beide Umrechnungen. |
| `bodenproben-beispiel.csv` | Musterhof, 4 Feldstücke | Laborbefund als CSV (Semikolon, Dezimalkomma) für **Bodenproben → Laborbefund (CSV) einlesen**; Feldstück einmal per Name statt Nummer. |

## Absichtlich eingebaute Testfälle

| Fall | Wo | Erwartung in der App |
|---|---|---|
| Sachkundeausweis gültig | Anna Muster (bis 31.12.2029) | grüner Status |
| Sachkundeausweis läuft bald ab | Josef Muster (bis 15.12.2026) | Warnung in Personenliste, Betriebsübersicht und Startseite (bis 90 Tage vorher) |
| Sachkundeausweis abgelaufen | Maria Beispiel (bis 30.06.2025) | rote Warnung |
| Kein Ausweis, kein Bedarf | Tierärztin | kein Status angezeigt |
| Ehemalige Person | Franz Beispiel (`aktiv: false`) | Abschnitt „Nicht mehr am Betrieb“, keine Warnungen |
| Bio + Kontrollstelle | Biohof | Kontrollstelle in der Übersicht |
| Unbekannte Nutzungsart | eAMA-Beispiel, Code 999 | Vorschau markiert „neue Kultur“, Import legt sie als betriebseigene Kultur an |
| Fehlende Feldstücknummern | eAMA-Beispiel | Warnung, Nummern werden fortlaufend vergeben |
| Erneuter Import | eAMA-Beispiel zweimal | alles „vorhanden“, keine Dubletten, eigene Namen/Bodenangaben bleiben |
| PSM-Zulassung endet bald | Beispiel-Fungizid B (bis 31.12.2026) | Warnung in Liste, Startseite und Fristenkalender |
| PSM-Aufbrauchfrist abgelaufen | Beispiel-Insektizid C (bis 30.06.2026) | rote Warnung; bei Verwendung Fehler „darf nicht mehr verwendet werden“ |
| PSM mit Indikation und Gewässerauflage | Beispiel-Herbizid A | Aufwand 1 l/ha wird vorgeschlagen, BBCH außerhalb 13–32 und Bachwiese (am Gewässer) werden gewarnt |
| Wirtschaftsdünger-Übernahme | Schweinegülle Nachbarhof | Angaben laut Abgabevertrag, erscheint im Düngebericht |
| Düngeplan | Großfeld 2026, Weizen < 14 % RP, mittel | 145 kg N/ha zulässig; Bericht zeigt Rest und N-Saldo (Ernte mit 12,5 % Rohprotein) |
| Düngung in der Sperrfrist | jede N-Düngung zwischen 16.10. und 15.02. auf Acker | Fehler mit Quelle § 2 NAPV, Speichern erst nach Bestätigung |
| Bodenprobe älter als 5 Jahre | Bachwiese (2021) | Hinweis GLÖZ 10 |
| Feldnotiz mit Position | Hausacker | Zeitachse des Schlags; neue Notiz an derselben Stelle wird Hausacker zugeordnet (GPS 48,1009 / 15,1012) |

**Hinweis zum eAMA-Beispiel:** Ob der betriebsbezogene eAMA-Export genau diese Spaltennamen hat, ist nicht geprüft. Belegt sind die Namen der öffentlichen INVEKOS-Daten (siehe `rules/import/eama-gis.json`). Bitte einen echten Export testen und Abweichungen in den `kandidaten` ergänzen.

**Hinweis:** Die Warnungen hängen vom heutigen Datum ab. Die Daten wurden im November 2026 angelegt. Ab dem 16.12.2026 gilt Josefs Ausweis als „abgelaufen“ statt „läuft bald ab“, ab 01.01.2027 ist die Zulassung von Fungizid B abgelaufen; die Browser-Tests rechnen deshalb mit einem festen Datum.
