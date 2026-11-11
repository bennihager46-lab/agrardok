---
name: "MVP-05 · Validierung im Browser (core/validierung.js)"
about: "Kein Datensatz wird gespeichert, der den Schemas unter /schema widerspricht – mit verständlichen deutschen Fehlermeldungen."
title: "[MVP-05] Validierung im Browser (core/validierung.js)"
labels: ["meilenstein: MVP", "bereich: core"]
assignees: ""
---
<!-- erzeugt von werkzeuge/erzeuge_roadmap.py – nicht von Hand bearbeiten -->

**Meilenstein:** MVP – Dünge- und Pflanzenschutzaufzeichnungen für Ackerbaubetriebe
**Bereich:** core
**Hängt ab von:** MVP-04

## Ziel
Kein Datensatz wird gespeichert, der den Schemas unter /schema widerspricht – mit verständlichen deutschen Fehlermeldungen.

## Akzeptanzkriterien
- [ ] Entscheidung dokumentiert: eingecheckter Validator unter vendor/ (Größe, Lizenz, Offline) oder eigene schlanke Prüfung – mit Begründung in docs/architektur.md
- [ ] Prüft alle Schemas inkl. if/then und unevaluatedProperties so, wie werkzeuge/pruefe_daten.py es tut
- [ ] Fehler werden je Feld in Alltagssprache ausgegeben (z. B. 'Bitte die Zulassungsnummer eintragen')
- [ ] daten.speichern ruft die Validierung auf
- [ ] Tests mit den Negativfällen aus der Architektur-Prüfung (fehlende Zulassungsnummer, Düngung ohne Schlag …)

## Prompt für die Umsetzung
```text
Setze MVP-05 aus docs/roadmap.md um: Bewerte kurz, ob wir einen JSON-Schema-Validator (Draft 2020-12) eingecheckt unter vendor/ nutzen oder selbst prüfen, triff eine Empfehlung und implementiere core/validierung.js. Fehlermeldungen je Feld auf Deutsch in Alltagssprache; daten.speichern muss validieren. Mit Tests.
```

## Grundlagen
- [docs/architektur.md#5-offene-entscheidungen](../../docs/architektur.md#5-offene-entscheidungen)
- [werkzeuge/pruefe_daten.py](../../werkzeuge/pruefe_daten.py)

## Definition of Done
- [ ] Akzeptanzkriterien erfüllt
- [ ] Tests ergänzt und grün (tests/index.html bzw. werkzeuge/pruefe_daten.py)
- [ ] Testdaten des Musterbetriebs ergänzt, falls neue Daten entstehen
- [ ] README bzw. docs/ aktualisiert
