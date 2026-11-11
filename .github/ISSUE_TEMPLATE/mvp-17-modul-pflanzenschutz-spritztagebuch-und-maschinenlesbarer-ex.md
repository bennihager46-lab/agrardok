---
name: "MVP-17 · Modul Pflanzenschutz: Spritztagebuch und maschinenlesbarer Export"
about: "Bei einer Kontrolle lassen sich die Aufzeichnungen sofort zeigen und elektronisch, maschinenlesbar übergeben (Pflicht für Anwendungen ab 1.1.2027)."
title: "[MVP-17] Modul Pflanzenschutz: Spritztagebuch und maschinenlesbarer Export"
labels: ["meilenstein: MVP", "bereich: modul-pflanzenschutz"]
assignees: ""
---
<!-- erzeugt von werkzeuge/erzeuge_roadmap.py – nicht von Hand bearbeiten -->

**Meilenstein:** MVP – Dünge- und Pflanzenschutzaufzeichnungen für Ackerbaubetriebe
**Bereich:** modul-pflanzenschutz
**Hängt ab von:** MVP-16, MVP-07

## Ziel
Bei einer Kontrolle lassen sich die Aufzeichnungen sofort zeigen und elektronisch, maschinenlesbar übergeben (Pflicht für Anwendungen ab 1.1.2027).

## Akzeptanzkriterien
- [ ] Liste je Jahr, filterbar nach Schlag, Mittel, Person
- [ ] CSV-Export mit dokumentierten Spalten (eine Zeile je Mittel und Schlag), UTF-8, Semikolon, ISO-Datum
- [ ] JSON-Export nach export.schema.json
- [ ] Druckansicht für die Kontrolle
- [ ] Spaltenbeschreibung in docs/ (Datenformat ist Teil der Rechtskonformität)
- [ ] Test: Export der Testdaten enthält alle Pflichtfelder

## Prompt für die Umsetzung
```text
Setze MVP-17 aus docs/roadmap.md um: Baue das Spritztagebuch (Liste mit Filtern, Druckansicht) und den maschinenlesbaren Export als CSV (dokumentierte Spalten, UTF-8, ISO-Datum) und JSON. Dokumentiere das CSV-Format in docs/ und teste, dass alle Pflichtfelder aus Anhang DVO 2023/564 enthalten sind.
```

## Grundlagen
- [docs/rechtsgrundlagen.md#22-eu-rahmen](../../docs/rechtsgrundlagen.md#22-eu-rahmen)

## Definition of Done
- [ ] Akzeptanzkriterien erfüllt
- [ ] Tests ergänzt und grün (tests/index.html bzw. werkzeuge/pruefe_daten.py)
- [ ] Testdaten des Musterbetriebs ergänzt, falls neue Daten entstehen
- [ ] README bzw. docs/ aktualisiert
