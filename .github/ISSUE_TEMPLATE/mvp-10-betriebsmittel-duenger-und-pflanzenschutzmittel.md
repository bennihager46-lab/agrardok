---
name: "MVP-10 · Betriebsmittel: Dünger und Pflanzenschutzmittel"
about: "Dünger und PSM sind einmal angelegt und bei jeder Maßnahme mit einem Tipp auswählbar."
title: "[MVP-10] Betriebsmittel: Dünger und Pflanzenschutzmittel"
labels: ["meilenstein: MVP", "bereich: stammdaten"]
assignees: ""
---
<!-- erzeugt von werkzeuge/erzeuge_roadmap.py – nicht von Hand bearbeiten -->

**Meilenstein:** MVP – Dünge- und Pflanzenschutzaufzeichnungen für Ackerbaubetriebe
**Bereich:** stammdaten
**Hängt ab von:** MVP-08

## Ziel
Dünger und PSM sind einmal angelegt und bei jeder Maßnahme mit einem Tipp auswählbar.

## Akzeptanzkriterien
- [ ] Dünger mit Nährstoffgehalten (Bezug %, kg/m³, kg/t) und Herkunft (eigen / Zukauf / Übernahme)
- [ ] Mitgelieferte Vorlagen für gängige Mineraldüngertypen (generische Bezeichnungen, keine Markennamen) als Regel-/Katalogdatei
- [ ] Wirtschaftsdünger-Übernahme mit den Angaben eines Düngerabgabevertrags (Partner, Betriebsnummer, Menge, N/P, Zeitraum)
- [ ] PSM mit Bezeichnung, Zulassungsnummer, bienengefährlich
- [ ] Zuletzt verwendete Mittel stehen oben

## Prompt für die Umsetzung
```text
Setze MVP-10 aus docs/roadmap.md um: Baue die Verwaltung der Betriebsmittel Dünger (inkl. Nährstoffgehalte und Wirtschaftsdünger-Übernahme mit Düngerabgabevertrag-Angaben) und Pflanzenschutzmittel (Bezeichnung, Zulassungsnummer) nach schema/betriebsmittel.schema.json, mit generischen Mineraldünger-Vorlagen und 'zuletzt verwendet' oben.
```

## Grundlagen
- [schema/betriebsmittel.schema.json](../../schema/betriebsmittel.schema.json)
- [docs/rechtsgrundlagen.md#12-verstärkte-aktionen-in-gebieten-nach-anlage-5---9-napv--r2](../../docs/rechtsgrundlagen.md#12-verstärkte-aktionen-in-gebieten-nach-anlage-5---9-napv--r2)

## Definition of Done
- [ ] Akzeptanzkriterien erfüllt
- [ ] Tests ergänzt und grün (tests/index.html bzw. werkzeuge/pruefe_daten.py)
- [ ] Testdaten des Musterbetriebs ergänzt, falls neue Daten entstehen
- [ ] README bzw. docs/ aktualisiert
