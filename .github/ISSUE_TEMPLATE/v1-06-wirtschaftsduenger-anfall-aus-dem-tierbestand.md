---
name: "V1-06 · Wirtschaftsdünger-Anfall aus dem Tierbestand"
about: "Tierhaltende Betriebe erhalten § 8 Abs. 1 Z 2 NAPV (Anfall, Abgabe, Ausbringung) automatisch."
title: "[V1-06] Wirtschaftsdünger-Anfall aus dem Tierbestand"
labels: ["meilenstein: V1", "bereich: modul-duengung"]
assignees: ""
---
<!-- erzeugt von werkzeuge/erzeuge_roadmap.py – nicht von Hand bearbeiten -->

**Meilenstein:** v1 – Tierhaltung, ÖPUL und mehrere Geräte
**Bereich:** modul-duengung
**Hängt ab von:** V1-04, MVP-15

## Ziel
Tierhaltende Betriebe erhalten § 8 Abs. 1 Z 2 NAPV (Anfall, Abgabe, Ausbringung) automatisch.

## Akzeptanzkriterien
- [ ] Durchschnittlicher Tierbestand aus Bestandsverzeichnis/-register
- [ ] N-Anfall nach Anlage 4 aus rules/napv
- [ ] Abgleich Anfall − Abgabe + Übernahme − Ausbringung, Hinweis bei großen Differenzen
- [ ] Einbindung in die Jahresaufzeichnung (MVP-15)

## Prompt für die Umsetzung
```text
Setze V1-06 aus docs/roadmap.md um: Berechne den Wirtschaftsdünger-Anfall aus dem durchschnittlichen Tierbestand nach NAPV Anlage 4 (rules/napv) und binde Anfall, Abgabe, Übernahme und Ausbringung in die Jahresaufzeichnung nach § 8 Abs. 1 Z 2 ein.
```

## Grundlagen
- [docs/rechtsgrundlagen.md#11-betriebsbezogene-aufzeichnungen---8-napv--r1](../../docs/rechtsgrundlagen.md#11-betriebsbezogene-aufzeichnungen---8-napv--r1)

## Definition of Done
- [ ] Akzeptanzkriterien erfüllt
- [ ] Tests ergänzt und grün (tests/index.html bzw. werkzeuge/pruefe_daten.py)
- [ ] Testdaten des Musterbetriebs ergänzt, falls neue Daten entstehen
- [ ] README bzw. docs/ aktualisiert
