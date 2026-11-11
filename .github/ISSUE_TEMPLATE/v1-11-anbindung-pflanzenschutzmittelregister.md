---
name: "V1-11 · Anbindung Pflanzenschutzmittelregister"
about: "PSM werden aus dem amtlichen Register ausgewählt statt abgetippt; abgelaufene Zulassungen fallen auf."
title: "[V1-11] Anbindung Pflanzenschutzmittelregister"
labels: ["meilenstein: V1", "bereich: rules"]
assignees: ""
---
<!-- erzeugt von werkzeuge/erzeuge_roadmap.py – nicht von Hand bearbeiten -->

**Meilenstein:** v1 – Tierhaltung, ÖPUL und mehrere Geräte
**Bereich:** rules
**Hängt ab von:** MVP-16

## Ziel
PSM werden aus dem amtlichen Register ausgewählt statt abgetippt; abgelaufene Zulassungen fallen auf.

## Akzeptanzkriterien
- [ ] Recherche: Datenzugang zum österreichischen PSM-Register, Format, Nutzungsbedingungen/Lizenz
- [ ] Nur bei zulässiger Nutzung: Offline-Kopie als Katalog mit Stand-Datum, Suche nach Name/Zulassungsnummer
- [ ] Warnung bei abgelaufener Zulassung
- [ ] Ohne zulässige Datenquelle: Ergebnis dokumentieren, manuelle Eingabe bleibt

## Prompt für die Umsetzung
```text
Setze V1-11 aus docs/roadmap.md um: Recherchiere, ob und unter welchen Bedingungen die Daten des österreichischen Pflanzenschutzmittelregisters maschinell genutzt werden dürfen. Nur wenn das zulässig ist, baue einen Offline-Katalog mit Suche und Zulassungswarnung; sonst dokumentiere das Ergebnis.
```

## Grundlagen
- [docs/funktionsumfang.md](../../docs/funktionsumfang.md)

## Definition of Done
- [ ] Akzeptanzkriterien erfüllt
- [ ] Tests ergänzt und grün (tests/index.html bzw. werkzeuge/pruefe_daten.py)
- [ ] Testdaten des Musterbetriebs ergänzt, falls neue Daten entstehen
- [ ] README bzw. docs/ aktualisiert
