---
name: "MVP-13 · Modul Ackerbau: Aussaat, Ernte, Bodenbearbeitung, Bewässerung"
about: "Die Angaben, die NAPV neben der Düngung verlangt (Anbau- und Erntedatum, Erntemenge, Bodenbearbeitung, Bewässerung), sind schnell erfasst."
title: "[MVP-13] Modul Ackerbau: Aussaat, Ernte, Bodenbearbeitung, Bewässerung"
labels: ["meilenstein: MVP", "bereich: modul-ackerbau"]
assignees: ""
---
<!-- erzeugt von werkzeuge/erzeuge_roadmap.py – nicht von Hand bearbeiten -->

**Meilenstein:** MVP – Dünge- und Pflanzenschutzaufzeichnungen für Ackerbaubetriebe
**Bereich:** modul-ackerbau
**Hängt ab von:** MVP-09, MVP-10

## Ziel
Die Angaben, die NAPV neben der Düngung verlangt (Anbau- und Erntedatum, Erntemenge, Bodenbearbeitung, Bewässerung), sind schnell erfasst.

## Akzeptanzkriterien
- [ ] Erfassung für einen oder mehrere Schläge auf einmal
- [ ] Ernte mit Menge, Ertrag je ha, Beleg (Wiegeschein/Silovolumen/Schätzung) und Ertragslage
- [ ] Bodenbearbeitung mit Zweck (u. a. Vegetationserneuerung für § 8 Z 7)
- [ ] Bewässerung mit mm und N-Zufuhr (Berechnung über rules/napv, sofern erfasst)
- [ ] 'Wie letztes Mal' als Vorlage, Datum standardmäßig heute
- [ ] modul.json nach Modulvertrag

## Prompt für die Umsetzung
```text
Setze MVP-13 aus docs/roadmap.md um: Baue das Modul module/ackerbau mit Erfassung von Aussaat, Ernte (Menge, Beleg, Ertragslage), Bodenbearbeitung und Bewässerung für einen oder mehrere Schläge, nach dem Modulvertrag in docs/architektur.md und den Schemas unter schema/massnahmen/. Mit 'wie letztes Mal'-Vorlage.
```

## Grundlagen
- [schema/massnahmen/aussaat.schema.json](../../schema/massnahmen/aussaat.schema.json)
- [schema/massnahmen/ernte.schema.json](../../schema/massnahmen/ernte.schema.json)
- [schema/massnahmen/bodenbearbeitung.schema.json](../../schema/massnahmen/bodenbearbeitung.schema.json)
- [schema/massnahmen/bewaesserung.schema.json](../../schema/massnahmen/bewaesserung.schema.json)

## Definition of Done
- [ ] Akzeptanzkriterien erfüllt
- [ ] Tests ergänzt und grün (tests/index.html bzw. werkzeuge/pruefe_daten.py)
- [ ] Testdaten des Musterbetriebs ergänzt, falls neue Daten entstehen
- [ ] README bzw. docs/ aktualisiert
