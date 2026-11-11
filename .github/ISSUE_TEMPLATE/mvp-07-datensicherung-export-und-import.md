---
name: "MVP-07 · Datensicherung, Export und Import"
about: "Die Aufzeichnungen überstehen Handywechsel und Browser-Bereinigung (7 Jahre Aufbewahrung nach NAPV)."
title: "[MVP-07] Datensicherung, Export und Import"
labels: ["meilenstein: MVP", "bereich: core"]
assignees: ""
---
<!-- erzeugt von werkzeuge/erzeuge_roadmap.py – nicht von Hand bearbeiten -->

**Meilenstein:** MVP – Dünge- und Pflanzenschutzaufzeichnungen für Ackerbaubetriebe
**Bereich:** core
**Hängt ab von:** MVP-05

## Ziel
Die Aufzeichnungen überstehen Handywechsel und Browser-Bereinigung (7 Jahre Aufbewahrung nach NAPV).

## Akzeptanzkriterien
- [ ] navigator.storage.persist() wird angefragt; Speicherstatus sichtbar
- [ ] Vollsicherung als Datei nach schema/export.schema.json (Teilen-Menü bzw. Download)
- [ ] Import mit Vorschau (neu / geändert / gleich), Zusammenführung nach id und rev, nichts wird stillschweigend überschrieben
- [ ] Sicherungs-Erinnerung (z. B. alle 14 Tage oder nach 20 neuen Einträgen), abschaltbar
- [ ] Hinweis für iPhone: App auf den Home-Bildschirm legen, sonst kann Safari Daten nach 7 Tagen löschen
- [ ] Test: Export → Datenbank leeren → Import ergibt identische Daten

## Prompt für die Umsetzung
```text
Setze MVP-07 aus docs/roadmap.md um: Implementiere Vollsicherung (Export nach schema/export.schema.json über Teilen-Menü/Download), Import mit Vorschau und sicherer Zusammenführung, persistente Speicheranfrage, Sicherungs-Erinnerung und den iPhone-Hinweis. Mit Rundlauf-Test Export → Leeren → Import.
```

## Grundlagen
- [docs/architektur.md#41-anforderungen](../../docs/architektur.md#41-anforderungen)
- [schema/export.schema.json](../../schema/export.schema.json)

## Definition of Done
- [ ] Akzeptanzkriterien erfüllt
- [ ] Tests ergänzt und grün (tests/index.html bzw. werkzeuge/pruefe_daten.py)
- [ ] Testdaten des Musterbetriebs ergänzt, falls neue Daten entstehen
- [ ] README bzw. docs/ aktualisiert
