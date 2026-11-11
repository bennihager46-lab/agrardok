---
name: "MVP-12 · Regeldateien Pflanzenschutz je Bundesland"
about: "Für jedes Bundesland ist bekannt, welche Frist, Aufbewahrung und Zusatzfelder gelten."
title: "[MVP-12] Regeldateien Pflanzenschutz je Bundesland"
labels: ["meilenstein: MVP", "bereich: rules"]
assignees: ""
---
<!-- erzeugt von werkzeuge/erzeuge_roadmap.py – nicht von Hand bearbeiten -->

**Meilenstein:** MVP – Dünge- und Pflanzenschutzaufzeichnungen für Ackerbaubetriebe
**Bereich:** rules
**Hängt ab von:** MVP-06

## Ziel
Für jedes Bundesland ist bekannt, welche Frist, Aufbewahrung und Zusatzfelder gelten.

## Akzeptanzkriterien
- [ ] Offene Länder recherchiert: Burgenland, Vorarlberg, Wien vollständig; Niederösterreich und Kärnten ergänzt
- [ ] rules/psm/<bundesland>.json mit Eintragsfrist, Aufbewahrung, Zusatzfeldern (z. B. Tirol: Grund, Anwender-Anschrift) und Übergangsregeln für das elektronische Format
- [ ] Gemeinsame Basis rules/psm/eu.json (Anhang DVO 2023/564)
- [ ] docs/rechtsgrundlagen.md Abschnitt 2.3 aktualisiert

## Prompt für die Umsetzung
```text
Setze MVP-12 aus docs/roadmap.md um: Schließe die Lücken in docs/rechtsgrundlagen.md Abschnitt 2.3 (Burgenland, Vorarlberg, Wien, Rest NÖ/Kärnten) und erfasse die Pflanzenschutz-Aufzeichnungsregeln je Bundesland als rules/psm/*.json mit Quelle und Status. Markiere Unsicherheiten, statt zu raten.
```

## Grundlagen
- [docs/rechtsgrundlagen.md#23-landesgesetze-im-vergleich](../../docs/rechtsgrundlagen.md#23-landesgesetze-im-vergleich)

## Definition of Done
- [ ] Akzeptanzkriterien erfüllt
- [ ] Tests ergänzt und grün (tests/index.html bzw. werkzeuge/pruefe_daten.py)
- [ ] Testdaten des Musterbetriebs ergänzt, falls neue Daten entstehen
- [ ] README bzw. docs/ aktualisiert
