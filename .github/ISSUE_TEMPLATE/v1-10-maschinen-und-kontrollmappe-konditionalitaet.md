---
name: "V1-10 · Maschinen und Kontrollmappe Konditionalität"
about: "Bei einer Vor-Ort-Kontrolle sind alle Unterlagen mit einem Tipp beisammen."
title: "[V1-10] Maschinen und Kontrollmappe Konditionalität"
labels: ["meilenstein: V1", "bereich: stammdaten"]
assignees: ""
---
<!-- erzeugt von werkzeuge/erzeuge_roadmap.py – nicht von Hand bearbeiten -->

**Meilenstein:** v1 – Tierhaltung, ÖPUL und mehrere Geräte
**Bereich:** stammdaten
**Hängt ab von:** V1-05, MVP-17

## Ziel
Bei einer Vor-Ort-Kontrolle sind alle Unterlagen mit einem Tipp beisammen.

## Akzeptanzkriterien
- [ ] Maschinen mit Ausbringtechnik und PSM-Geräteprüfung (gültig bis)
- [ ] Checkliste 'Kontrolle vorbereiten' nach den Unterlagen im AMA-Merkblatt (eigene Formulierung)
- [ ] Export 'Kontrollmappe' (Druck/ZIP) mit Spritztagebuch, Düngeaufzeichnung, Bestandsverzeichnis, Behandlungen

## Prompt für die Umsetzung
```text
Setze V1-10 aus docs/roadmap.md um: Ergänze die Maschinenverwaltung (Ausbringtechnik, Geräteprüfung) und baue eine Checkliste 'Kontrolle vorbereiten' sowie einen Export 'Kontrollmappe' mit allen Aufzeichnungen. Formuliere die Checkliste selbst, angelehnt an die Unterlagenliste in docs/rechtsgrundlagen.md 7.2.
```

## Grundlagen
- [docs/rechtsgrundlagen.md#72-unterlagen-die-bei-einer-konditionalitätskontrolle-vorliegen-sollen--r5-s-8-f](../../docs/rechtsgrundlagen.md#72-unterlagen-die-bei-einer-konditionalitätskontrolle-vorliegen-sollen--r5-s-8-f)

## Definition of Done
- [ ] Akzeptanzkriterien erfüllt
- [ ] Tests ergänzt und grün (tests/index.html bzw. werkzeuge/pruefe_daten.py)
- [ ] Testdaten des Musterbetriebs ergänzt, falls neue Daten entstehen
- [ ] README bzw. docs/ aktualisiert
