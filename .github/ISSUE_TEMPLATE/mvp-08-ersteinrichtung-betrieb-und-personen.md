---
name: "MVP-08 · Ersteinrichtung: Betrieb und Personen"
about: "In wenigen Minuten ist der Betrieb eingerichtet – mit allem, was die Aufzeichnungspflichten steuert."
title: "[MVP-08] Ersteinrichtung: Betrieb und Personen"
labels: ["meilenstein: MVP", "bereich: stammdaten"]
assignees: ""
---
<!-- erzeugt von werkzeuge/erzeuge_roadmap.py – nicht von Hand bearbeiten -->

**Meilenstein:** MVP – Dünge- und Pflanzenschutzaufzeichnungen für Ackerbaubetriebe
**Bereich:** stammdaten
**Hängt ab von:** MVP-04, MVP-05

## Ziel
In wenigen Minuten ist der Betrieb eingerichtet – mit allem, was die Aufzeichnungspflichten steuert.

## Akzeptanzkriterien
- [ ] Assistent in maximal 4 Schritten: Betrieb (Name, Bundesland, Betriebsnummer optional), Bewirtschaftung, Anlage-5-Frage mit verständlicher Erklärung, Personen
- [ ] Personen mit Rolle und PSM-Ausbildungsbescheinigung (Nummer, gültig bis)
- [ ] Bundesland bestimmt die Landes-Pflanzenschutzregeln (Anzeige, welche gelten)
- [ ] Alles später unter Stammdaten änderbar
- [ ] Validierung über betrieb.schema.json / person.schema.json

## Prompt für die Umsetzung
```text
Setze MVP-08 aus docs/roadmap.md um: Baue den Ersteinrichtungs-Assistenten (Betrieb, Bewirtschaftung, Anlage-5-Frage mit Erklärung, Personen inkl. PSM-Ausbildungsbescheinigung) im Modul stammdaten/ auf Basis von core/daten.js. Wenig Tipparbeit, große Buttons, alles später änderbar.
```

## Grundlagen
- [schema/betrieb.schema.json](../../schema/betrieb.schema.json)
- [schema/person.schema.json](../../schema/person.schema.json)
- [docs/rechtsgrundlagen.md#12-verstärkte-aktionen-in-gebieten-nach-anlage-5---9-napv--r2](../../docs/rechtsgrundlagen.md#12-verstärkte-aktionen-in-gebieten-nach-anlage-5---9-napv--r2)

## Definition of Done
- [ ] Akzeptanzkriterien erfüllt
- [ ] Tests ergänzt und grün (tests/index.html bzw. werkzeuge/pruefe_daten.py)
- [ ] Testdaten des Musterbetriebs ergänzt, falls neue Daten entstehen
- [ ] README bzw. docs/ aktualisiert
