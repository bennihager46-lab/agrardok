---
name: "MVP-20 · Veröffentlichung auf GitHub Pages"
about: "Die App ist öffentlich nutzbar, mit klaren Hinweisen zu Haftung, Datenschutz und Lizenz."
title: "[MVP-20] Veröffentlichung auf GitHub Pages"
labels: ["meilenstein: MVP", "bereich: release"]
assignees: ""
---
<!-- erzeugt von werkzeuge/erzeuge_roadmap.py – nicht von Hand bearbeiten -->

**Meilenstein:** MVP – Dünge- und Pflanzenschutzaufzeichnungen für Ackerbaubetriebe
**Bereich:** release
**Hängt ab von:** MVP-18, MVP-19

## Ziel
Die App ist öffentlich nutzbar, mit klaren Hinweisen zu Haftung, Datenschutz und Lizenz.

## Akzeptanzkriterien
- [ ] Lizenzvorschlag mit Vor- und Nachteilen (z. B. EUPL-1.2, AGPL-3.0, MIT) – Entscheidung trifft der Projektinhaber
- [ ] Seiten 'Über', 'Haftungsausschluss (keine Rechtsberatung)' und 'Datenschutz (Daten bleiben am Gerät)'
- [ ] Anleitung zum Veröffentlichen auf GitHub Pages; Service-Worker-Update funktioniert nach neuem Release
- [ ] CONTRIBUTING.md (wie man mitarbeitet, Regeln pflegt, Testdaten nutzt)
- [ ] Versionsnummer und 'Regeln geprüft am' in der App sichtbar

## Prompt für die Umsetzung
```text
Setze MVP-20 aus docs/roadmap.md um: Bereite die Veröffentlichung auf GitHub Pages vor: Lizenzvorschlag mit Abwägung (Entscheidung treffe ich), Seiten zu Haftungsausschluss und Datenschutz, CONTRIBUTING.md, sichtbare Versions- und Regelstand-Anzeige und eine Anleitung, wie Updates zuverlässig beim Service Worker ankommen.
```

## Grundlagen
- [CLAUDE.md](../../CLAUDE.md)

## Definition of Done
- [ ] Akzeptanzkriterien erfüllt
- [ ] Tests ergänzt und grün (tests/index.html bzw. werkzeuge/pruefe_daten.py)
- [ ] Testdaten des Musterbetriebs ergänzt, falls neue Daten entstehen
- [ ] README bzw. docs/ aktualisiert
