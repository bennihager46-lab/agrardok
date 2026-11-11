---
name: "MVP-15 · Modul Düngung: Jahresaufzeichnung § 8 und Schlagbilanz § 9"
about: "Bis 31. Jänner liegt die vollständige betriebsbezogene Aufzeichnung vor; Anlage-5-Betriebe haben zusätzlich ihre Schlagbilanzen."
title: "[MVP-15] Modul Düngung: Jahresaufzeichnung § 8 und Schlagbilanz § 9"
labels: ["meilenstein: MVP", "bereich: modul-duengung"]
assignees: ""
---
<!-- erzeugt von werkzeuge/erzeuge_roadmap.py – nicht von Hand bearbeiten -->

**Meilenstein:** MVP – Dünge- und Pflanzenschutzaufzeichnungen für Ackerbaubetriebe
**Bereich:** modul-duengung
**Hängt ab von:** MVP-14

## Ziel
Bis 31. Jänner liegt die vollständige betriebsbezogene Aufzeichnung vor; Anlage-5-Betriebe haben zusätzlich ihre Schlagbilanzen.

## Akzeptanzkriterien
- [ ] Auswertung aller Punkte § 8 Abs. 1 Z 1–7 aus den erfassten Maßnahmen und Stammdaten
- [ ] Schlagbezogene Aufzeichnung und N-Bilanz je Schlag nach § 9 Abs. 6 (Kulturen > 0,3 ha)
- [ ] Fehlende Angaben werden als Aufgabenliste angezeigt (z. B. 'Erntemenge Großfeld fehlt')
- [ ] 'Jahr abschließen': Druckansicht und CSV/JSON-Export
- [ ] Erinnerung ab Jänner an die Frist 31. Jänner
- [ ] Testfall mit dem Musterbetrieb und einem Anlage-5-Betrieb

## Prompt für die Umsetzung
```text
Setze MVP-15 aus docs/roadmap.md um: Baue die Jahresaufzeichnung nach § 8 Abs. 1 Z 1–7 NAPV und die Schlagbilanz nach § 9 Abs. 6 als Auswertung über die erfassten Maßnahmen, mit Liste fehlender Angaben, 'Jahr abschließen' (Druck, CSV, JSON) und Erinnerung an den 31. Jänner. Teste mit dem Musterbetrieb und einem Anlage-5-Fall.
```

## Grundlagen
- [docs/rechtsgrundlagen.md#11-betriebsbezogene-aufzeichnungen---8-napv--r1](../../docs/rechtsgrundlagen.md#11-betriebsbezogene-aufzeichnungen---8-napv--r1)
- [docs/rechtsgrundlagen.md#12-verstärkte-aktionen-in-gebieten-nach-anlage-5---9-napv--r2](../../docs/rechtsgrundlagen.md#12-verstärkte-aktionen-in-gebieten-nach-anlage-5---9-napv--r2)

## Definition of Done
- [ ] Akzeptanzkriterien erfüllt
- [ ] Tests ergänzt und grün (tests/index.html bzw. werkzeuge/pruefe_daten.py)
- [ ] Testdaten des Musterbetriebs ergänzt, falls neue Daten entstehen
- [ ] README bzw. docs/ aktualisiert
