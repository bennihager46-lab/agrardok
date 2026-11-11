---
name: "V1-03 · Modul Tiere: Rinder-Bestandsverzeichnis"
about: "Das Bestandsverzeichnis nach § 5 RKZV 2021 wird aus den Tierbewegungen geführt; die 7-Tage-Meldefrist wird überwacht."
title: "[V1-03] Modul Tiere: Rinder-Bestandsverzeichnis"
labels: ["meilenstein: V1", "bereich: modul-tiere"]
assignees: ""
---
<!-- erzeugt von werkzeuge/erzeuge_roadmap.py – nicht von Hand bearbeiten -->

**Meilenstein:** v1 – Tierhaltung, ÖPUL und mehrere Geräte
**Bereich:** modul-tiere
**Hängt ab von:** MVP-20

## Ziel
Das Bestandsverzeichnis nach § 5 RKZV 2021 wird aus den Tierbewegungen geführt; die 7-Tage-Meldefrist wird überwacht.

## Akzeptanzkriterien
- [ ] Rinder anlegen (Ohrmarke, Geburt, Geschlecht, Rasse, Mutter), Geburt eines Kalbs in wenigen Schritten
- [ ] Zu-/Abgänge, Schlachtung, Verendung, Alm als tierbewegung
- [ ] Bestandsverzeichnis als Ansicht/Druck mit allen Feldern aus § 5 Abs. 2
- [ ] Hinweis 'noch nicht an AMA gemeldet' bis zur Bestätigung, Frist 7 Tage
- [ ] Aufbewahrung 4 Jahre in rules/rkzv

## Prompt für die Umsetzung
```text
Setze V1-03 aus docs/roadmap.md um: Baue module/tiere mit Rinder-Stammdaten, Tierbewegungen und dem Bestandsverzeichnis nach § 5 RKZV 2021 (Felder laut docs/rechtsgrundlagen.md 5.1), inkl. 7-Tage-Meldehinweis. Regelwerte in rules/rkzv.
```

## Grundlagen
- [docs/rechtsgrundlagen.md#51-rinder--rinderkennzeichnungs-verordnung-2021-rkzv-2021--r16](../../docs/rechtsgrundlagen.md#51-rinder--rinderkennzeichnungs-verordnung-2021-rkzv-2021--r16)
- [schema/tier.schema.json](../../schema/tier.schema.json)
- [schema/massnahmen/tierbewegung.schema.json](../../schema/massnahmen/tierbewegung.schema.json)

## Definition of Done
- [ ] Akzeptanzkriterien erfüllt
- [ ] Tests ergänzt und grün (tests/index.html bzw. werkzeuge/pruefe_daten.py)
- [ ] Testdaten des Musterbetriebs ergänzt, falls neue Daten entstehen
- [ ] README bzw. docs/ aktualisiert
