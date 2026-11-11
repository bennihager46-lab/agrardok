---
name: "MVP-11 · Regeldateien NAPV recherchieren und erfassen"
about: "Alle Werte, die die Düngeaufzeichnung braucht, liegen geprüft und mit Quelle unter rules/napv vor."
title: "[MVP-11] Regeldateien NAPV recherchieren und erfassen"
labels: ["meilenstein: MVP", "bereich: rules"]
assignees: ""
---
<!-- erzeugt von werkzeuge/erzeuge_roadmap.py – nicht von Hand bearbeiten -->

**Meilenstein:** MVP – Dünge- und Pflanzenschutzaufzeichnungen für Ackerbaubetriebe
**Bereich:** rules
**Hängt ab von:** MVP-06

## Ziel
Alle Werte, die die Düngeaufzeichnung braucht, liegen geprüft und mit Quelle unter rules/napv vor.

## Akzeptanzkriterien
- [ ] Schwellenwerte § 8 Abs. 2 und § 9 Abs. 5–6, Fristen (31. Jänner, 14 Tage), Aufbewahrung 7 Jahre
- [ ] Anlage 3: N-Bedarf je Kultur und Ertragslage, Vorfruchtwirkung, Berechnung N-Entzug
- [ ] Anlage 4: Anfall und Stall-/Lagerverluste von Wirtschaftsdünger (Grundlage für jahreswirksames N)
- [ ] Faktoren für die jahreswirksame N-Menge je Düngerart
- [ ] Anlage 5: Gebietskulisse (mindestens als nachschlagbare Liste)
- [ ] Jeder Wert mit Fundstelle im RIS und status; Unsicherheiten markiert statt geraten
- [ ] Prüfung, ob seit 2023 eine NAPV-Novelle in Kraft getreten ist

## Prompt für die Umsetzung
```text
Setze MVP-11 aus docs/roadmap.md um: Recherchiere im RIS die aktuelle NAPV inkl. Anlagen 3, 4 und 5 und erfasse Schwellenwerte, Fristen, N-Bedarf, Anfallswerte und Faktoren für jahreswirksames N als Regeldateien unter rules/napv nach schema/regel.schema.json. Jeder Wert mit Quelle und Status; markiere Unsicherheiten, statt zu raten.
```

## Grundlagen
- [docs/rechtsgrundlagen.md#1-nitrat-aktionsprogramm-verordnung-napv](../../docs/rechtsgrundlagen.md#1-nitrat-aktionsprogramm-verordnung-napv)

## Definition of Done
- [ ] Akzeptanzkriterien erfüllt
- [ ] Tests ergänzt und grün (tests/index.html bzw. werkzeuge/pruefe_daten.py)
- [ ] Testdaten des Musterbetriebs ergänzt, falls neue Daten entstehen
- [ ] README bzw. docs/ aktualisiert
