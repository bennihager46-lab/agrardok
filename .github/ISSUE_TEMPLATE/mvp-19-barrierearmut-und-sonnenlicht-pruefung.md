---
name: "MVP-19 · Barrierearmut- und Sonnenlicht-Prüfung"
about: "Die App ist mit Handschuhen, im Sonnenlicht und mit wenig IT-Erfahrung bedienbar."
title: "[MVP-19] Barrierearmut- und Sonnenlicht-Prüfung"
labels: ["meilenstein: MVP", "bereich: qualitaet"]
assignees: ""
---
<!-- erzeugt von werkzeuge/erzeuge_roadmap.py – nicht von Hand bearbeiten -->

**Meilenstein:** MVP – Dünge- und Pflanzenschutzaufzeichnungen für Ackerbaubetriebe
**Bereich:** qualitaet
**Hängt ab von:** MVP-16, MVP-15

## Ziel
Die App ist mit Handschuhen, im Sonnenlicht und mit wenig IT-Erfahrung bedienbar.

## Akzeptanzkriterien
- [ ] Kontrast mindestens WCAG 2.2 AA, für Text möglichst AAA (7:1)
- [ ] Alle Bedienelemente ≥ 48 px, ausreichend Abstand
- [ ] Schrift lässt sich auf 200 % vergrößern ohne Funktionsverlust
- [ ] Formulare mit Beschriftungen, Fehlermeldungen am Feld, Screenreader-tauglich
- [ ] Prüfprotokoll unter docs/ mit gefundenen und behobenen Punkten

## Prompt für die Umsetzung
```text
Setze MVP-19 aus docs/roadmap.md um: Prüfe die gesamte App auf Barrierearmut und Sonnenlicht-Tauglichkeit (Kontrast, Touch-Ziele, Vergrößerung, Beschriftungen, Screenreader), behebe die gefundenen Punkte und lege ein Prüfprotokoll unter docs/ an.
```

## Grundlagen
- [CLAUDE.md](../../CLAUDE.md)

## Definition of Done
- [ ] Akzeptanzkriterien erfüllt
- [ ] Tests ergänzt und grün (tests/index.html bzw. werkzeuge/pruefe_daten.py)
- [ ] Testdaten des Musterbetriebs ergänzt, falls neue Daten entstehen
- [ ] README bzw. docs/ aktualisiert
