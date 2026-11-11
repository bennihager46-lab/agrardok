---
name: "V1-13 · Pflegeprozess für Rechtsregeln"
about: "Rechtsänderungen werden zuverlässig erkannt und eingepflegt."
title: "[V1-13] Pflegeprozess für Rechtsregeln"
labels: ["meilenstein: V1", "bereich: rules"]
assignees: ""
---
<!-- erzeugt von werkzeuge/erzeuge_roadmap.py – nicht von Hand bearbeiten -->

**Meilenstein:** v1 – Tierhaltung, ÖPUL und mehrere Geräte
**Bereich:** rules
**Hängt ab von:** MVP-11, MVP-12

## Ziel
Rechtsänderungen werden zuverlässig erkannt und eingepflegt.

## Akzeptanzkriterien
- [ ] Jährliche Checkliste (NAPV, PSM je Land, RKZV, TKZVO, TAMG, ÖPUL, Konditionalität-Merkblatt)
- [ ] werkzeuge/: Prüfung, dass jede Regeldatei Quelle, Stand und lückenlose Gültigkeit hat
- [ ] Änderungsprotokoll der Regeln (CHANGELOG) und Anzeige 'Regeln geprüft am' in der App

## Prompt für die Umsetzung
```text
Setze V1-13 aus docs/roadmap.md um: Schreibe eine jährliche Prüf-Checkliste für alle Rechtsquellen, ein Werkzeug unter werkzeuge/, das alle Regeldateien auf Quelle, Stand und lückenlose Gültigkeit prüft, und ein CHANGELOG für Regeländerungen.
```

## Grundlagen
- [CLAUDE.md](../../CLAUDE.md)

## Definition of Done
- [ ] Akzeptanzkriterien erfüllt
- [ ] Tests ergänzt und grün (tests/index.html bzw. werkzeuge/pruefe_daten.py)
- [ ] Testdaten des Musterbetriebs ergänzt, falls neue Daten entstehen
- [ ] README bzw. docs/ aktualisiert
