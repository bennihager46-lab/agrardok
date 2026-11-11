---
name: "V1-08 · ÖPUL: Immergrün, bodennahe Ausbringung, Nutzungstermine"
about: "Die ÖPUL-Aufzeichnungen entstehen weitgehend aus bereits erfassten Maßnahmen."
title: "[V1-08] ÖPUL: Immergrün, bodennahe Ausbringung, Nutzungstermine"
labels: ["meilenstein: V1", "bereich: modul-oepul"]
assignees: ""
---
<!-- erzeugt von werkzeuge/erzeuge_roadmap.py – nicht von Hand bearbeiten -->

**Meilenstein:** v1 – Tierhaltung, ÖPUL und mehrere Geräte
**Bereich:** modul-oepul
**Hängt ab von:** V1-07, MVP-14

## Ziel
Die ÖPUL-Aufzeichnungen entstehen weitgehend aus bereits erfassten Maßnahmen.

## Akzeptanzkriterien
- [ ] System Immergrün: Prüfansicht über alle Ackerschläge (Ernte Hauptfrucht, Anlage/Umbruch Zwischenfrucht, Anlage Folgekultur) mit Lücken
- [ ] Bodennahe Ausbringung: Auswertung aus Düngungen mit Ausbringtechnik; Gülleseparation
- [ ] Biodiversitätsflächen: 1./2. Nutzung
- [ ] Aktualität der Vorgaben geprüft

## Prompt für die Umsetzung
```text
Setze V1-08 aus docs/roadmap.md um: Baue in module/oepul Prüfansichten für System Immergrün, bodennahe Ausbringung/Gülleseparation und Nutzungstermine auf Biodiversitätsflächen, die aus den bereits erfassten Maßnahmen entstehen und Lücken anzeigen. Prüfe vorher die Aktualität der Vorgaben.
```

## Grundlagen
- [docs/rechtsgrundlagen.md#3-öpul-2023-maßnahmenspezifische-aufzeichnungen](../../docs/rechtsgrundlagen.md#3-öpul-2023-maßnahmenspezifische-aufzeichnungen)

## Definition of Done
- [ ] Akzeptanzkriterien erfüllt
- [ ] Tests ergänzt und grün (tests/index.html bzw. werkzeuge/pruefe_daten.py)
- [ ] Testdaten des Musterbetriebs ergänzt, falls neue Daten entstehen
- [ ] README bzw. docs/ aktualisiert
