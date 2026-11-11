---
name: "V2-07 · Bodenproben und Phosphat-Hinweis (GLÖZ 10)"
about: "Bodenuntersuchungen sind gespeichert; die App warnt, wenn ein P-Nachweis nötig wird."
title: "[V2-07] Bodenproben und Phosphat-Hinweis (GLÖZ 10)"
labels: ["meilenstein: V2", "bereich: modul-ackerbau"]
assignees: ""
---
<!-- erzeugt von werkzeuge/erzeuge_roadmap.py – nicht von Hand bearbeiten -->

**Meilenstein:** v2 – Komfort und Erweiterungen
**Bereich:** modul-ackerbau
**Hängt ab von:** MVP-14

## Ziel
Bodenuntersuchungen sind gespeichert; die App warnt, wenn ein P-Nachweis nötig wird.

## Akzeptanzkriterien
- [ ] Bodenprobe je Schlag/Feldstück mit Datum und Werten
- [ ] Hinweis, wenn zusätzlich zu Wirtschaftsdünger mehr als 100 kg P₂O₅/ha mineralisch gedüngt wird und keine Probe jünger als 5 Jahre vorliegt

## Prompt für die Umsetzung
```text
Setze V2-07 aus docs/roadmap.md um: Ergänze Bodenproben im Datenmodell (Schema-Änderung) und baue Erfassung sowie den GLÖZ-10-Hinweis (mehr als 100 kg P₂O₅/ha mineralisch zusätzlich zu Wirtschaftsdünger ohne Bodenprobe jünger als 5 Jahre).
```

## Grundlagen
- [docs/rechtsgrundlagen.md#71-eigene-aufzeichnungspflichten-aus-glöz](../../docs/rechtsgrundlagen.md#71-eigene-aufzeichnungspflichten-aus-glöz)

## Definition of Done
- [ ] Akzeptanzkriterien erfüllt
- [ ] Tests ergänzt und grün (tests/index.html bzw. werkzeuge/pruefe_daten.py)
- [ ] Testdaten des Musterbetriebs ergänzt, falls neue Daten entstehen
- [ ] README bzw. docs/ aktualisiert
