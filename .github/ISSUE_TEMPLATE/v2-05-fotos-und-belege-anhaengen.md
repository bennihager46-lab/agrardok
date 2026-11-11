---
name: "V2-05 · Fotos und Belege anhängen"
about: "Lieferscheine, Wiegescheine und Abgabebelege liegen direkt bei der Maßnahme."
title: "[V2-05] Fotos und Belege anhängen"
labels: ["meilenstein: V2", "bereich: core"]
assignees: ""
---
<!-- erzeugt von werkzeuge/erzeuge_roadmap.py – nicht von Hand bearbeiten -->

**Meilenstein:** v2 – Komfort und Erweiterungen
**Bereich:** core
**Hängt ab von:** MVP-20

## Ziel
Lieferscheine, Wiegescheine und Abgabebelege liegen direkt bei der Maßnahme.

## Akzeptanzkriterien
- [ ] Foto aufnehmen/auswählen, verkleinern, in IndexedDB speichern
- [ ] Speicherplatzanzeige und Aufräumhilfe
- [ ] Export optional mit Belegen (Dateigröße beachten)

## Prompt für die Umsetzung
```text
Setze V2-05 aus docs/roadmap.md um: Ermögliche das Anhängen von Fotos und Belegen an Maßnahmen (Aufnahme, Verkleinerung, Speicherung in IndexedDB, Speicherplatzanzeige) und einen optionalen Export mit Belegen.
```

## Grundlagen
- [docs/architektur.md#5-offene-entscheidungen](../../docs/architektur.md#5-offene-entscheidungen)

## Definition of Done
- [ ] Akzeptanzkriterien erfüllt
- [ ] Tests ergänzt und grün (tests/index.html bzw. werkzeuge/pruefe_daten.py)
- [ ] Testdaten des Musterbetriebs ergänzt, falls neue Daten entstehen
- [ ] README bzw. docs/ aktualisiert
