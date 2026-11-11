---
name: "V1-12 · Biozide und Rückverfolgbarkeit (Lebensmittelsicherheit)"
about: "Biozid-Anwendungen und Lieferungen sind dokumentiert, wie es die Konditionalität (GAB 5) erwartet."
title: "[V1-12] Biozide und Rückverfolgbarkeit (Lebensmittelsicherheit)"
labels: ["meilenstein: V1", "bereich: modul-lager"]
assignees: ""
---
<!-- erzeugt von werkzeuge/erzeuge_roadmap.py – nicht von Hand bearbeiten -->

**Meilenstein:** v1 – Tierhaltung, ÖPUL und mehrere Geräte
**Bereich:** modul-lager
**Hängt ab von:** MVP-20

## Ziel
Biozid-Anwendungen und Lieferungen sind dokumentiert, wie es die Konditionalität (GAB 5) erwartet.

## Akzeptanzkriterien
- [ ] Biozid-Maßnahme (Bezeichnung, Anwendungsbereich, Datum/Häufigkeit), auch als wiederkehrende Kontrolle
- [ ] Eigenbeleg für Bezug und Abgabe (Datum, Produkt, Menge, Abnehmer/Lieferant)
- [ ] Offene Recherche VO 852/2004 und 183/2005 Anhang I abgeschlossen

## Prompt für die Umsetzung
```text
Setze V1-12 aus docs/roadmap.md um: Recherchiere die offenen Punkte zu VO 852/2004 und 183/2005 (Anhang I), dann baue die Erfassung von Biozid-Anwendungen (auch wiederkehrend) und Eigenbelege für Bezug und Abgabe zur Rückverfolgbarkeit.
```

## Grundlagen
- [docs/rechtsgrundlagen.md#72-unterlagen-die-bei-einer-konditionalitätskontrolle-vorliegen-sollen--r5-s-8-f](../../docs/rechtsgrundlagen.md#72-unterlagen-die-bei-einer-konditionalitätskontrolle-vorliegen-sollen--r5-s-8-f)
- [schema/massnahmen/biozid.schema.json](../../schema/massnahmen/biozid.schema.json)

## Definition of Done
- [ ] Akzeptanzkriterien erfüllt
- [ ] Tests ergänzt und grün (tests/index.html bzw. werkzeuge/pruefe_daten.py)
- [ ] Testdaten des Musterbetriebs ergänzt, falls neue Daten entstehen
- [ ] README bzw. docs/ aktualisiert
