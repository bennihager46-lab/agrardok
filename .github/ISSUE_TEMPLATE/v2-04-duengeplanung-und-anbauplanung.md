---
name: "V2-04 · Düngeplanung und Anbauplanung"
about: "Planung vor der Saison, u. a. für ÖPUL Grundwasserschutz (Düngeplanung bis 28. Februar)."
title: "[V2-04] Düngeplanung und Anbauplanung"
labels: ["meilenstein: V2", "bereich: modul-duengung"]
assignees: ""
---
<!-- erzeugt von werkzeuge/erzeuge_roadmap.py – nicht von Hand bearbeiten -->

**Meilenstein:** v2 – Komfort und Erweiterungen
**Bereich:** modul-duengung
**Hängt ab von:** MVP-15

## Ziel
Planung vor der Saison, u. a. für ÖPUL Grundwasserschutz (Düngeplanung bis 28. Februar).

## Akzeptanzkriterien
- [ ] Geplante Maßnahmen (status 'geplant') je Schlag; Übernahme als erledigt mit einem Tipp
- [ ] Düngebedarf je Schlag aus rules/napv
- [ ] Fruchtfolgeübersicht je Feldstück über mehrere Jahre

## Prompt für die Umsetzung
```text
Setze V2-04 aus docs/roadmap.md um: Baue die Düngeplanung (geplante Maßnahmen je Schlag, Bedarf aus rules/napv, Übernahme als erledigt) und eine mehrjährige Fruchtfolgeübersicht je Feldstück.
```

## Grundlagen
- [docs/rechtsgrundlagen.md#3-öpul-2023-maßnahmenspezifische-aufzeichnungen](../../docs/rechtsgrundlagen.md#3-öpul-2023-maßnahmenspezifische-aufzeichnungen)

## Definition of Done
- [ ] Akzeptanzkriterien erfüllt
- [ ] Tests ergänzt und grün (tests/index.html bzw. werkzeuge/pruefe_daten.py)
- [ ] Testdaten des Musterbetriebs ergänzt, falls neue Daten entstehen
- [ ] README bzw. docs/ aktualisiert
