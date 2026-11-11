---
name: "MVP-18 · Demo-Modus mit Musterbetrieb"
about: "Interessierte und Testbetriebe können die App ohne eigene Daten ausprobieren."
title: "[MVP-18] Demo-Modus mit Musterbetrieb"
labels: ["meilenstein: MVP", "bereich: testdaten"]
assignees: ""
---
<!-- erzeugt von werkzeuge/erzeuge_roadmap.py – nicht von Hand bearbeiten -->

**Meilenstein:** MVP – Dünge- und Pflanzenschutzaufzeichnungen für Ackerbaubetriebe
**Bereich:** testdaten
**Hängt ab von:** MVP-07, MVP-15, MVP-17

## Ziel
Interessierte und Testbetriebe können die App ohne eigene Daten ausprobieren.

## Akzeptanzkriterien
- [ ] 'Demo starten' lädt testdaten/musterbetrieb.json in eine getrennte Demo-Datenbank
- [ ] Deutlich sichtbarer Demo-Hinweis; Demo jederzeit beenden ohne Einfluss auf echte Daten
- [ ] Testdaten um einen Anlage-5-Fall (schlagbezogene Aufzeichnung) erweitert
- [ ] werkzeuge/pruefe_daten.py prüft alle Testdaten fehlerfrei

## Prompt für die Umsetzung
```text
Setze MVP-18 aus docs/roadmap.md um: Baue einen Demo-Modus, der testdaten/musterbetrieb.json in eine getrennte Demo-Datenbank lädt, und erweitere die Testdaten um einen fiktiven Anlage-5-Betrieb mit schlagbezogenen Aufzeichnungen. Alle Testdaten müssen werkzeuge/pruefe_daten.py bestehen.
```

## Grundlagen
- [testdaten/musterbetrieb.json](../../testdaten/musterbetrieb.json)

## Definition of Done
- [ ] Akzeptanzkriterien erfüllt
- [ ] Tests ergänzt und grün (tests/index.html bzw. werkzeuge/pruefe_daten.py)
- [ ] Testdaten des Musterbetriebs ergänzt, falls neue Daten entstehen
- [ ] README bzw. docs/ aktualisiert
