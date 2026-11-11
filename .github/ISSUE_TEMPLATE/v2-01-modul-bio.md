---
name: "V2-01 · Modul Bio"
about: "Biobetriebe führen die für die Bio-Kontrolle nötigen Aufzeichnungen."
title: "[V2-01] Modul Bio"
labels: ["meilenstein: V2", "bereich: modul-bio"]
assignees: ""
---
<!-- erzeugt von werkzeuge/erzeuge_roadmap.py – nicht von Hand bearbeiten -->

**Meilenstein:** v2 – Komfort und Erweiterungen
**Bereich:** modul-bio
**Hängt ab von:** V1-10

## Ziel
Biobetriebe führen die für die Bio-Kontrolle nötigen Aufzeichnungen.

## Akzeptanzkriterien
- [ ] Vorab geklärt mit Kontrollstelle/Bio Austria: Dokumentenliste und Aufbewahrungsfristen (DVO 2021/2119)
- [ ] Zukauf von Betriebsmitteln mit Nachweis der Biotauglichkeit, Tierzukauf inkl. Genehmigung
- [ ] Teil-Bio: Kennzeichnung der Schläge
- [ ] Unterlagen für die Bio-Kontrolle als Export

## Prompt für die Umsetzung
```text
Setze V2-01 aus docs/roadmap.md um: Fasse zuerst zusammen, welche Bio-Aufzeichnungen und Fristen noch ungeklärt sind (docs/rechtsgrundlagen.md Abschnitt 6) und formuliere Fragen an eine Kontrollstelle. Wenn ich die Antworten liefere, baue darauf das Modul module/bio.
```

## Grundlagen
- [docs/rechtsgrundlagen.md#6-bio-verordnung-eu-2018848](../../docs/rechtsgrundlagen.md#6-bio-verordnung-eu-2018848)

## Definition of Done
- [ ] Akzeptanzkriterien erfüllt
- [ ] Tests ergänzt und grün (tests/index.html bzw. werkzeuge/pruefe_daten.py)
- [ ] Testdaten des Musterbetriebs ergänzt, falls neue Daten entstehen
- [ ] README bzw. docs/ aktualisiert
