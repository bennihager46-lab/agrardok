---
name: "MVP-03 · IDs und Hybrid Logical Clock (core/ids.js)"
about: "Offline erzeugte, eindeutige IDs und sortierbare Zeitstempel für Synchronisation."
title: "[MVP-03] IDs und Hybrid Logical Clock (core/ids.js)"
labels: ["meilenstein: MVP", "bereich: core"]
assignees: ""
---
<!-- erzeugt von werkzeuge/erzeuge_roadmap.py – nicht von Hand bearbeiten -->

**Meilenstein:** MVP – Dünge- und Pflanzenschutzaufzeichnungen für Ackerbaubetriebe
**Bereich:** core
**Hängt ab von:** MVP-02

## Ziel
Offline erzeugte, eindeutige IDs und sortierbare Zeitstempel für Synchronisation.

## Akzeptanzkriterien
- [ ] uuid(): crypto.randomUUID mit Fallback; Format laut common.schema.json
- [ ] hlc.jetzt(), hlc.empfangen(fremd), hlc.vergleiche(a, b) im Format von common.schema.json#/$defs/hlc
- [ ] Geräte-ID wird einmalig erzeugt und dauerhaft gespeichert
- [ ] Tests: Monotonie bei gleicher Millisekunde, Uhr geht zurück, Empfang einer HLC aus der Zukunft

## Prompt für die Umsetzung
```text
Setze MVP-03 aus docs/roadmap.md um: Implementiere core/ids.js mit UUID-Erzeugung, dauerhafter Geräte-ID und einer Hybrid Logical Clock im Format aus schema/common.schema.json. Schreibe Tests für Monotonie, zurückgestellte Uhren und fremde Zeitstempel aus der Zukunft.
```

## Grundlagen
- [docs/architektur.md#46-empfehlung-variante-a-in-stufen-ausbaubar](../../docs/architektur.md#46-empfehlung-variante-a-in-stufen-ausbaubar)
- [schema/common.schema.json](../../schema/common.schema.json)

## Definition of Done
- [ ] Akzeptanzkriterien erfüllt
- [ ] Tests ergänzt und grün (tests/index.html bzw. werkzeuge/pruefe_daten.py)
- [ ] Testdaten des Musterbetriebs ergänzt, falls neue Daten entstehen
- [ ] README bzw. docs/ aktualisiert
