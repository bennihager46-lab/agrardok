---
name: "MVP-09 · Feldstücke, Schläge und Kulturkatalog"
about: "Die Flächen des Betriebs sind je Jahr erfasst und dienen allen Modulen als Bezug."
title: "[MVP-09] Feldstücke, Schläge und Kulturkatalog"
labels: ["meilenstein: MVP", "bereich: stammdaten"]
assignees: ""
---
<!-- erzeugt von werkzeuge/erzeuge_roadmap.py – nicht von Hand bearbeiten -->

**Meilenstein:** MVP – Dünge- und Pflanzenschutzaufzeichnungen für Ackerbaubetriebe
**Bereich:** stammdaten
**Hängt ab von:** MVP-06, MVP-08

## Ziel
Die Flächen des Betriebs sind je Jahr erfasst und dienen allen Modulen als Bezug.

## Akzeptanzkriterien
- [ ] Feldstücke anlegen/bearbeiten (Nummer, Name, Nutzungsart, Fläche)
- [ ] Schläge je Jahr mit Kultur, Fläche, optional InVeKoS-Flächeneinheit; 'Schläge vom Vorjahr übernehmen' mit Kulturwechsel
- [ ] Plausibilität: Summe der Schläge ≤ Feldstücksfläche (Warnung, kein Verbot)
- [ ] Mitgelieferter Kulturkatalog (global, mit EPPO-Code, napv_kulturgruppe), eigene Kulturen ergänzbar
- [ ] Hinweis, ob der Betrieb nach NAPV § 8 aufzeichnungspflichtig ist (≤ 15 ha / > 90 % Grünland), berechnet über rules/napv
- [ ] Schnelle Auswahl von Schlägen (mehrere auf einmal) als UI-Baustein in core/ui für alle Module

## Prompt für die Umsetzung
```text
Setze MVP-09 aus docs/roadmap.md um: Baue die Verwaltung von Feldstücken und Schlägen je Jahr (inkl. 'vom Vorjahr übernehmen'), einen mitgelieferten Kulturkatalog mit EPPO-Codes und den wiederverwendbaren Schlag-Auswahl-Baustein in core/ui. Zeige an, ob der Betrieb nach § 8 NAPV aufzeichnungspflichtig ist.
```

## Grundlagen
- [schema/feldstueck.schema.json](../../schema/feldstueck.schema.json)
- [schema/schlag.schema.json](../../schema/schlag.schema.json)
- [schema/kultur.schema.json](../../schema/kultur.schema.json)
- [docs/rechtsgrundlagen.md#11-betriebsbezogene-aufzeichnungen---8-napv--r1](../../docs/rechtsgrundlagen.md#11-betriebsbezogene-aufzeichnungen---8-napv--r1)

## Definition of Done
- [ ] Akzeptanzkriterien erfüllt
- [ ] Tests ergänzt und grün (tests/index.html bzw. werkzeuge/pruefe_daten.py)
- [ ] Testdaten des Musterbetriebs ergänzt, falls neue Daten entstehen
- [ ] README bzw. docs/ aktualisiert
