---
name: "MVP-02 · Testumgebung ohne Build"
about: "Automatische Tests für den Kern, die direkt im Browser laufen."
title: "[MVP-02] Testumgebung ohne Build"
labels: ["meilenstein: MVP", "bereich: core"]
assignees: ""
---
<!-- erzeugt von werkzeuge/erzeuge_roadmap.py – nicht von Hand bearbeiten -->

**Meilenstein:** MVP – Dünge- und Pflanzenschutzaufzeichnungen für Ackerbaubetriebe
**Bereich:** core
**Hängt ab von:** MVP-01

## Ziel
Automatische Tests für den Kern, die direkt im Browser laufen.

## Akzeptanzkriterien
- [ ] tests/index.html mit einem minimalen Testrunner (describe/it/assert, async-fähig), Ergebnis grün/rot auf einen Blick
- [ ] Tests laufen gegen eine eigene, temporäre IndexedDB und räumen danach auf
- [ ] Beispieltest und Anleitung in der README (lokalen Server starten, Testseite öffnen)
- [ ] Kein npm, kein Build; optional: Fremdbibliothek nur eingecheckt unter vendor/

## Prompt für die Umsetzung
```text
Setze MVP-02 aus docs/roadmap.md um: Baue eine Testumgebung unter tests/, die ohne Build direkt im Browser läuft (kleiner Testrunner mit describe/it/assert, async, isolierte IndexedDB). Lege einen Beispieltest an und beschreibe in der README, wie man die Tests startet.
```

## Grundlagen
- [docs/architektur.md](../../docs/architektur.md)

## Definition of Done
- [ ] Akzeptanzkriterien erfüllt
- [ ] Tests ergänzt und grün (tests/index.html bzw. werkzeuge/pruefe_daten.py)
- [ ] Testdaten des Musterbetriebs ergänzt, falls neue Daten entstehen
- [ ] README bzw. docs/ aktualisiert
