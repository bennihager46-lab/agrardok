---
name: "MVP-16 · Modul Pflanzenschutz: Erfassung"
about: "Jede Anwendung ist unverzüglich und vollständig nach Anhang DVO 2023/564 und Landesrecht erfasst."
title: "[MVP-16] Modul Pflanzenschutz: Erfassung"
labels: ["meilenstein: MVP", "bereich: modul-pflanzenschutz"]
assignees: ""
---
<!-- erzeugt von werkzeuge/erzeuge_roadmap.py – nicht von Hand bearbeiten -->

**Meilenstein:** MVP – Dünge- und Pflanzenschutzaufzeichnungen für Ackerbaubetriebe
**Bereich:** modul-pflanzenschutz
**Hängt ab von:** MVP-10, MVP-12, MVP-13

## Ziel
Jede Anwendung ist unverzüglich und vollständig nach Anhang DVO 2023/564 und Landesrecht erfasst.

## Akzeptanzkriterien
- [ ] Alle Pflichtfelder laut schema/massnahmen/pflanzenschutz.schema.json; Momentaufnahme von Name, Zulassungsnummer, Kultur, EPPO, Flächeneinheit
- [ ] Tankmischung (mehrere Mittel)
- [ ] BBCH-Auswahlhilfe mit Bildern/Beschreibung je Kulturgruppe (eigene Texte)
- [ ] Uhrzeit wird abgefragt, wenn ein Mittel als bienengefährlich markiert ist
- [ ] Zusatzfelder je Bundesland aus rules/psm (z. B. Tirol: Grund)
- [ ] Verwendungsart Fläche / geschlossener Raum / Saatgut
- [ ] Hinweis auf offene Einträge gemäß strengster Landesfrist (2 Tage)
- [ ] Prüfung der Ausbildungsbescheinigung der Anwender:in (abgelaufen → Hinweis)

## Prompt für die Umsetzung
```text
Setze MVP-16 aus docs/roadmap.md um: Baue module/pflanzenschutz für die Erfassung von PSM-Anwendungen mit allen Feldern aus Anhang DVO 2023/564 (inkl. Tankmischung, Momentaufnahme, BBCH-Hilfe, Uhrzeit bei bienengefährlichen Mitteln) und den Zusatzfeldern je Bundesland aus rules/psm. Texte selbst formulieren, nichts aus kommerziellen Produkten übernehmen.
```

## Grundlagen
- [schema/massnahmen/pflanzenschutz.schema.json](../../schema/massnahmen/pflanzenschutz.schema.json)
- [docs/rechtsgrundlagen.md#2-pflanzenschutzmittel-bundes-pmg-eu-recht-landesgesetze](../../docs/rechtsgrundlagen.md#2-pflanzenschutzmittel-bundes-pmg-eu-recht-landesgesetze)

## Definition of Done
- [ ] Akzeptanzkriterien erfüllt
- [ ] Tests ergänzt und grün (tests/index.html bzw. werkzeuge/pruefe_daten.py)
- [ ] Testdaten des Musterbetriebs ergänzt, falls neue Daten entstehen
- [ ] README bzw. docs/ aktualisiert
