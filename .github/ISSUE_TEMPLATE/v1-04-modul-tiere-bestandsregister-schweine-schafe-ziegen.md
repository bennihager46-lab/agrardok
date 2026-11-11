---
name: "V1-04 · Modul Tiere: Bestandsregister Schweine, Schafe, Ziegen"
about: "Das Bestandsregister nach § 19 TKZVO 2009 entsteht aus den Tierbewegungen."
title: "[V1-04] Modul Tiere: Bestandsregister Schweine, Schafe, Ziegen"
labels: ["meilenstein: V1", "bereich: modul-tiere"]
assignees: ""
---
<!-- erzeugt von werkzeuge/erzeuge_roadmap.py – nicht von Hand bearbeiten -->

**Meilenstein:** v1 – Tierhaltung, ÖPUL und mehrere Geräte
**Bereich:** modul-tiere
**Hängt ab von:** V1-03

## Ziel
Das Bestandsregister nach § 19 TKZVO 2009 entsteht aus den Tierbewegungen.

## Akzeptanzkriterien
- [ ] Recherche § 6 TKZVO (Pflichtdaten Schweine ohne VIS-Zugang), Ergebnis in docs/rechtsgrundlagen.md
- [ ] Tiergruppen mit Stückzahl; Zu- und Abgänge mit Partner, Transport, Begleitdokument
- [ ] Schafe/Ziegen: Stichtagszählung 1. April
- [ ] Register als Ansicht/Druck; Aufbewahrung 3 bzw. 7 Jahre in rules/tkzvo

## Prompt für die Umsetzung
```text
Setze V1-04 aus docs/roadmap.md um: Recherchiere § 6 TKZVO 2009, ergänze docs/rechtsgrundlagen.md und baue das Bestandsregister für Schweine, Schafe und Ziegen (Gruppen, Zu-/Abgänge, Stichtag 1. April) mit Regelwerten in rules/tkzvo.
```

## Grundlagen
- [docs/rechtsgrundlagen.md#52-schweine-schafe-ziegen--tkzvo-2009--19--r17](../../docs/rechtsgrundlagen.md#52-schweine-schafe-ziegen--tkzvo-2009--19--r17)

## Definition of Done
- [ ] Akzeptanzkriterien erfüllt
- [ ] Tests ergänzt und grün (tests/index.html bzw. werkzeuge/pruefe_daten.py)
- [ ] Testdaten des Musterbetriebs ergänzt, falls neue Daten entstehen
- [ ] README bzw. docs/ aktualisiert
