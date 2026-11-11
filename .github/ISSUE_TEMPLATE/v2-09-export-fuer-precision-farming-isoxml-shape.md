---
name: "V2-09 · Export für Precision Farming (ISOXML/Shape)"
about: "Schlaggrenzen und Aufträge können an Traktorterminals übergeben werden."
title: "[V2-09] Export für Precision Farming (ISOXML/Shape)"
labels: ["meilenstein: V2", "bereich: export"]
assignees: ""
---
<!-- erzeugt von werkzeuge/erzeuge_roadmap.py – nicht von Hand bearbeiten -->

**Meilenstein:** v2 – Komfort und Erweiterungen
**Bereich:** export
**Hängt ab von:** V1-02

## Ziel
Schlaggrenzen und Aufträge können an Traktorterminals übergeben werden.

## Akzeptanzkriterien
- [ ] Recherche: offene Spezifikation/Lizenz von ISOXML (ISO 11783-10), Mindestumfang
- [ ] Export der Schlaggrenzen; optional Auftrag mit Aufwandmenge

## Prompt für die Umsetzung
```text
Setze V2-09 aus docs/roadmap.md um: Recherchiere, welcher Mindestumfang von ISOXML (ISO 11783-10) bzw. Shapefile für den Export von Schlaggrenzen nötig und lizenzrechtlich unproblematisch ist, und baue den Export der Schlaggrenzen.
```

## Grundlagen
- [docs/funktionsumfang.md](../../docs/funktionsumfang.md)

## Definition of Done
- [ ] Akzeptanzkriterien erfüllt
- [ ] Tests ergänzt und grün (tests/index.html bzw. werkzeuge/pruefe_daten.py)
- [ ] Testdaten des Musterbetriebs ergänzt, falls neue Daten entstehen
- [ ] README bzw. docs/ aktualisiert
