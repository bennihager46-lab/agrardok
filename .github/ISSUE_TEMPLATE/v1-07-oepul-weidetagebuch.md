---
name: "V1-07 · ÖPUL: Weidetagebuch"
about: "Weidetage sind tagaktuell mit einem Tipp erfasst (Tierwohl Weide, Naturschutz mit Weideauflage)."
title: "[V1-07] ÖPUL: Weidetagebuch"
labels: ["meilenstein: V1", "bereich: modul-oepul"]
assignees: ""
---
<!-- erzeugt von werkzeuge/erzeuge_roadmap.py – nicht von Hand bearbeiten -->

**Meilenstein:** v1 – Tierhaltung, ÖPUL und mehrere Geräte
**Bereich:** modul-oepul
**Hängt ab von:** V1-03

## Ziel
Weidetage sind tagaktuell mit einem Tipp erfasst (Tierwohl Weide, Naturschutz mit Weideauflage).

## Akzeptanzkriterien
- [ ] Aktuelle ÖPUL-Vorgaben recherchiert (Quelle von 2023 prüfen), Ergebnis in docs/rechtsgrundlagen.md
- [ ] 'Heute auf Weide' mit Vorbelegung vom Vortag; Unterbrechung mit Grund
- [ ] Ansicht je Fläche und Tiergruppe, Druck/Export
- [ ] Modul nur aktiv, wenn die Maßnahme beim Betrieb gewählt ist

## Prompt für die Umsetzung
```text
Setze V1-07 aus docs/roadmap.md um: Prüfe die aktuellen ÖPUL-Vorgaben zum Weidetagebuch (unsere Quelle ist von 2023), aktualisiere docs/rechtsgrundlagen.md und baue module/oepul mit einem tagaktuellen Weidetagebuch, das mit einem Tipp vom Vortag fortgeschrieben werden kann.
```

## Grundlagen
- [docs/rechtsgrundlagen.md#3-öpul-2023-maßnahmenspezifische-aufzeichnungen](../../docs/rechtsgrundlagen.md#3-öpul-2023-maßnahmenspezifische-aufzeichnungen)
- [schema/massnahmen/weide.schema.json](../../schema/massnahmen/weide.schema.json)

## Definition of Done
- [ ] Akzeptanzkriterien erfüllt
- [ ] Tests ergänzt und grün (tests/index.html bzw. werkzeuge/pruefe_daten.py)
- [ ] Testdaten des Musterbetriebs ergänzt, falls neue Daten entstehen
- [ ] README bzw. docs/ aktualisiert
