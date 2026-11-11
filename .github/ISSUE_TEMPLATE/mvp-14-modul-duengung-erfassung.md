---
name: "MVP-14 · Modul Düngung: Erfassung"
about: "Jede Düngung ist in unter 30 Sekunden erfasst, inklusive berechneter Nährstoffmengen."
title: "[MVP-14] Modul Düngung: Erfassung"
labels: ["meilenstein: MVP", "bereich: modul-duengung"]
assignees: ""
---
<!-- erzeugt von werkzeuge/erzeuge_roadmap.py – nicht von Hand bearbeiten -->

**Meilenstein:** MVP – Dünge- und Pflanzenschutzaufzeichnungen für Ackerbaubetriebe
**Bereich:** modul-duengung
**Hängt ab von:** MVP-11, MVP-13

## Ziel
Jede Düngung ist in unter 30 Sekunden erfasst, inklusive berechneter Nährstoffmengen.

## Akzeptanzkriterien
- [ ] Dünger wählen, Aufwand je ha, Schläge wählen, Datum – fertig
- [ ] Automatische Berechnung von N gesamt, jahreswirksamem N, P₂O₅, K₂O je ha und gesamt (Regelversion wird in 'regeln' gespeichert)
- [ ] Ausbringtechnik bei Wirtschaftsdünger
- [ ] Feldmiete (Anlage-5-Betriebe): Anlage und Räumung
- [ ] Warnung bei Eintrag später als 14 Tage nach Ausbringung (Anlage-5-Betriebe)
- [ ] Fehlen Regelwerte, wird das klar angezeigt statt falsch gerechnet

## Prompt für die Umsetzung
```text
Setze MVP-14 aus docs/roadmap.md um: Baue module/duengung für die Erfassung von Düngungen und Feldmieten mit automatischer Nährstoffberechnung über rules/napv (Regelversion in 'regeln' speichern) und der 14-Tage-Warnung für Anlage-5-Betriebe. Ziel: eine Düngung in unter 30 Sekunden.
```

## Grundlagen
- [schema/massnahmen/duengung.schema.json](../../schema/massnahmen/duengung.schema.json)
- [schema/massnahmen/feldmiete.schema.json](../../schema/massnahmen/feldmiete.schema.json)
- [docs/rechtsgrundlagen.md#1-nitrat-aktionsprogramm-verordnung-napv](../../docs/rechtsgrundlagen.md#1-nitrat-aktionsprogramm-verordnung-napv)

## Definition of Done
- [ ] Akzeptanzkriterien erfüllt
- [ ] Tests ergänzt und grün (tests/index.html bzw. werkzeuge/pruefe_daten.py)
- [ ] Testdaten des Musterbetriebs ergänzt, falls neue Daten entstehen
- [ ] README bzw. docs/ aktualisiert
