---
name: "MVP-21 · Praxistest mit Testbetrieben"
about: "Zwei bis drei echte Ackerbaubetriebe haben das MVP genutzt; die wichtigsten Rückmeldungen sind eingearbeitet oder als Issues erfasst."
title: "[MVP-21] Praxistest mit Testbetrieben"
labels: ["meilenstein: MVP", "bereich: qualitaet"]
assignees: ""
---
<!-- erzeugt von werkzeuge/erzeuge_roadmap.py – nicht von Hand bearbeiten -->

**Meilenstein:** MVP – Dünge- und Pflanzenschutzaufzeichnungen für Ackerbaubetriebe
**Bereich:** qualitaet
**Hängt ab von:** MVP-20

## Ziel
Zwei bis drei echte Ackerbaubetriebe haben das MVP genutzt; die wichtigsten Rückmeldungen sind eingearbeitet oder als Issues erfasst.

## Akzeptanzkriterien
- [ ] Testplan mit Aufgaben (Ersteinrichtung, 5 Düngungen, 3 Spritzungen, Ernte, Jahresabschluss, Export, Sicherung)
- [ ] Kurzer Feedbackbogen (Papier und digital), Beobachtungsnotizen
- [ ] Auswertung unter docs/praxistest-mvp.md
- [ ] Mindestens die gravierendsten Bedienprobleme behoben; der Rest als Issues

## Prompt für die Umsetzung
```text
Setze MVP-21 aus docs/roadmap.md um: Erstelle einen Testplan mit konkreten Aufgaben und einen kurzen Feedbackbogen für 2–3 Testbetriebe, sowie eine Vorlage docs/praxistest-mvp.md für die Auswertung. Nach dem Test gebe ich dir die Rückmeldungen zur Auswertung.
```

## Grundlagen
- [docs/funktionsumfang.md](../../docs/funktionsumfang.md)

## Definition of Done
- [ ] Akzeptanzkriterien erfüllt
- [ ] Tests ergänzt und grün (tests/index.html bzw. werkzeuge/pruefe_daten.py)
- [ ] Testdaten des Musterbetriebs ergänzt, falls neue Daten entstehen
- [ ] README bzw. docs/ aktualisiert
