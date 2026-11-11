---
name: "V1-02 · Flächenimport (GeoJSON/Mehrfachantrag) und Kartenansicht"
about: "Feldstücke und Schläge müssen nicht abgetippt werden."
title: "[V1-02] Flächenimport (GeoJSON/Mehrfachantrag) und Kartenansicht"
labels: ["meilenstein: V1", "bereich: stammdaten"]
assignees: ""
---
<!-- erzeugt von werkzeuge/erzeuge_roadmap.py – nicht von Hand bearbeiten -->

**Meilenstein:** v1 – Tierhaltung, ÖPUL und mehrere Geräte
**Bereich:** stammdaten
**Hängt ab von:** MVP-09

## Ziel
Feldstücke und Schläge müssen nicht abgetippt werden.

## Akzeptanzkriterien
- [ ] Recherche: welche Exportformate eAMA für Flächen anbietet (Format, Felder, Nutzungsbedingungen)
- [ ] Import von GeoJSON (und ggf. weiterem Format) mit Zuordnung zu Feldstück/Schlag und Vorschau
- [ ] Export der Flächen als GeoJSON
- [ ] Kartenansicht (Bibliothek eingecheckt unter vendor/); Hintergrundkarte nur online, App bleibt offline nutzbar

## Prompt für die Umsetzung
```text
Setze V1-02 aus docs/roadmap.md um: Recherchiere zuerst, in welchen Formaten eAMA Flächendaten exportiert, dann baue den Import (mindestens GeoJSON) für Feldstücke und Schläge mit Vorschau, den GeoJSON-Export und eine einfache Kartenansicht.
```

## Grundlagen
- [CLAUDE.md](../../CLAUDE.md)
- [schema/feldstueck.schema.json](../../schema/feldstueck.schema.json)

## Definition of Done
- [ ] Akzeptanzkriterien erfüllt
- [ ] Tests ergänzt und grün (tests/index.html bzw. werkzeuge/pruefe_daten.py)
- [ ] Testdaten des Musterbetriebs ergänzt, falls neue Daten entstehen
- [ ] README bzw. docs/ aktualisiert
