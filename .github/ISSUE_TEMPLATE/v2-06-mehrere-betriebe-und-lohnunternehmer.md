---
name: "V2-06 · Mehrere Betriebe und Lohnunternehmer"
about: "Lohnunternehmer erfassen Maßnahmen für Kundenbetriebe und übergeben sie per Sync-Paket."
title: "[V2-06] Mehrere Betriebe und Lohnunternehmer"
labels: ["meilenstein: V2", "bereich: core"]
assignees: ""
---
<!-- erzeugt von werkzeuge/erzeuge_roadmap.py – nicht von Hand bearbeiten -->

**Meilenstein:** v2 – Komfort und Erweiterungen
**Bereich:** core
**Hängt ab von:** V1-01

## Ziel
Lohnunternehmer erfassen Maßnahmen für Kundenbetriebe und übergeben sie per Sync-Paket.

## Akzeptanzkriterien
- [ ] Betriebswechsel in der App
- [ ] Export nur der Maßnahmen für einen Kundenbetrieb; Import beim Kunden ordnet Schläge zu
- [ ] Rollen: wer darf was sehen/ändern (lokal)

## Prompt für die Umsetzung
```text
Setze V2-06 aus docs/roadmap.md um: Ermögliche mehrere Betriebe in einer Installation und baue den Ablauf für Lohnunternehmer: Maßnahmen für einen Kundenbetrieb erfassen, als Sync-Paket übergeben und beim Kunden den eigenen Schlägen zuordnen.
```

## Grundlagen
- [docs/architektur.md#23-bewusste-modellentscheidungen](../../docs/architektur.md#23-bewusste-modellentscheidungen)

## Definition of Done
- [ ] Akzeptanzkriterien erfüllt
- [ ] Tests ergänzt und grün (tests/index.html bzw. werkzeuge/pruefe_daten.py)
- [ ] Testdaten des Musterbetriebs ergänzt, falls neue Daten entstehen
- [ ] README bzw. docs/ aktualisiert
