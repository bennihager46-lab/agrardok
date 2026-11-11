---
name: "V1-01 · Abgleich per Sync-Paket (Stufe 2)"
about: "Zwei oder mehr Handys eines Hofes gleichen ihre Daten über eine Datei ab."
title: "[V1-01] Abgleich per Sync-Paket (Stufe 2)"
labels: ["meilenstein: V1", "bereich: sync"]
assignees: ""
---
<!-- erzeugt von werkzeuge/erzeuge_roadmap.py – nicht von Hand bearbeiten -->

**Meilenstein:** v1 – Tierhaltung, ÖPUL und mehrere Geräte
**Bereich:** sync
**Hängt ab von:** MVP-20

## Ziel
Zwei oder mehr Handys eines Hofes gleichen ihre Daten über eine Datei ab.

## Akzeptanzkriterien
- [ ] Sync-Paket nach export.schema.json (aenderungen, seit_hlc) über das Teilen-Menü
- [ ] Einlesen: bekannte Änderungen überspringen, Anwendung in HLC-Reihenfolge, feldweise 'spätere Änderung gewinnt'
- [ ] Konfliktliste 'Bitte prüfen' für gleichzeitige Änderungen desselben Felds und für Änderung gegen Löschung
- [ ] Je Partnergerät gemerkter Stand, damit Pakete klein bleiben
- [ ] Tests mit simulierten Geräten (inkl. doppeltem Einlesen)

## Prompt für die Umsetzung
```text
Setze V1-01 aus docs/roadmap.md um: Implementiere in core/sync den Abgleich per Sync-Paket wie in docs/architektur.md Abschnitt 4.6 beschrieben (feldweise Zusammenführung nach HLC, Konfliktliste, Stand je Partnergerät) mit Tests für mehrere simulierte Geräte.
```

## Grundlagen
- [docs/architektur.md#46-empfehlung-variante-a-in-stufen-ausbaubar](../../docs/architektur.md#46-empfehlung-variante-a-in-stufen-ausbaubar)

## Definition of Done
- [ ] Akzeptanzkriterien erfüllt
- [ ] Tests ergänzt und grün (tests/index.html bzw. werkzeuge/pruefe_daten.py)
- [ ] Testdaten des Musterbetriebs ergänzt, falls neue Daten entstehen
- [ ] README bzw. docs/ aktualisiert
