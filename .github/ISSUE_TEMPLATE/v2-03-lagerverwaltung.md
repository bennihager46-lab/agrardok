---
name: "V2-03 · Lagerverwaltung"
about: "Bestände an Dünger, PSM, Saatgut und Futter ergeben sich aus Zukauf und Maßnahmen."
title: "[V2-03] Lagerverwaltung"
labels: ["meilenstein: V2", "bereich: modul-lager"]
assignees: ""
---
<!-- erzeugt von werkzeuge/erzeuge_roadmap.py – nicht von Hand bearbeiten -->

**Meilenstein:** v2 – Komfort und Erweiterungen
**Bereich:** modul-lager
**Hängt ab von:** MVP-20

## Ziel
Bestände an Dünger, PSM, Saatgut und Futter ergeben sich aus Zukauf und Maßnahmen.

## Akzeptanzkriterien
- [ ] Zugang (Lieferschein) und automatischer Abgang aus Maßnahmen
- [ ] Bestandsliste mit Warnung bei negativem Bestand
- [ ] Inventur mit Korrekturbuchung

## Prompt für die Umsetzung
```text
Setze V2-03 aus docs/roadmap.md um: Ergänze das Datenmodell um Lagerzugänge (Schema-Änderung mit Versionserhöhung) und baue eine Lagerverwaltung, deren Abgänge automatisch aus den erfassten Maßnahmen entstehen, inklusive Inventurkorrektur.
```

## Grundlagen
- [docs/funktionsumfang.md](../../docs/funktionsumfang.md)

## Definition of Done
- [ ] Akzeptanzkriterien erfüllt
- [ ] Tests ergänzt und grün (tests/index.html bzw. werkzeuge/pruefe_daten.py)
- [ ] Testdaten des Musterbetriebs ergänzt, falls neue Daten entstehen
- [ ] README bzw. docs/ aktualisiert
