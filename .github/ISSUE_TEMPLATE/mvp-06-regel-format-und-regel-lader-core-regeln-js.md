---
name: "MVP-06 · Regel-Format und Regel-Lader (core/regeln.js)"
about: "Rechtsregeln als versionierte JSON-Dateien, die nach Stichtag ausgewählt werden."
title: "[MVP-06] Regel-Format und Regel-Lader (core/regeln.js)"
labels: ["meilenstein: MVP", "bereich: rules"]
assignees: ""
---
<!-- erzeugt von werkzeuge/erzeuge_roadmap.py – nicht von Hand bearbeiten -->

**Meilenstein:** MVP – Dünge- und Pflanzenschutzaufzeichnungen für Ackerbaubetriebe
**Bereich:** rules
**Hängt ab von:** MVP-05

## Ziel
Rechtsregeln als versionierte JSON-Dateien, die nach Stichtag ausgewählt werden.

## Akzeptanzkriterien
- [ ] schema/regel.schema.json: Pflichtfelder quelle (Link), gueltig_ab, gueltig_bis, stand, status (geprueft / amtliche_erlaeuterung / unsicher) und werte
- [ ] rules/README.md erklärt Aufbau, Benennung und Pflegeprozess
- [ ] regeln.fuer(name, datum, bundesland?) liefert die am Stichtag gültige Regel; Fehler bei Lücken oder Überschneidungen
- [ ] Regeln werden vom Service Worker offline bereitgestellt
- [ ] Tests: Wechsel einer Regel zum Stichtag, Bundesland-Auswahl

## Prompt für die Umsetzung
```text
Setze MVP-06 aus docs/roadmap.md um: Definiere schema/regel.schema.json (quelle, gueltig_ab, gueltig_bis, stand, status, werte), schreibe rules/README.md und implementiere core/regeln.js, das die am Stichtag gültige Regel (optional je Bundesland) liefert. Mit Tests.
```

## Grundlagen
- [CLAUDE.md](../../CLAUDE.md)
- [docs/rechtsgrundlagen.md#8-folgerungen-für-rules-und-das-datenmodell](../../docs/rechtsgrundlagen.md#8-folgerungen-für-rules-und-das-datenmodell)

## Definition of Done
- [ ] Akzeptanzkriterien erfüllt
- [ ] Tests ergänzt und grün (tests/index.html bzw. werkzeuge/pruefe_daten.py)
- [ ] Testdaten des Musterbetriebs ergänzt, falls neue Daten entstehen
- [ ] README bzw. docs/ aktualisiert
