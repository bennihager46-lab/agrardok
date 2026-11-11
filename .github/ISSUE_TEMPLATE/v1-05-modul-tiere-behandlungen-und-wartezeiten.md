---
name: "V1-05 · Modul Tiere: Behandlungen und Wartezeiten"
about: "Jede Behandlung ist am selben Tag eingetragen; Tiere in Wartezeit sind auf einen Blick erkennbar."
title: "[V1-05] Modul Tiere: Behandlungen und Wartezeiten"
labels: ["meilenstein: V1", "bereich: modul-tiere"]
assignees: ""
---
<!-- erzeugt von werkzeuge/erzeuge_roadmap.py – nicht von Hand bearbeiten -->

**Meilenstein:** v1 – Tierhaltung, ÖPUL und mehrere Geräte
**Bereich:** modul-tiere
**Hängt ab von:** V1-03

## Ziel
Jede Behandlung ist am selben Tag eingetragen; Tiere in Wartezeit sind auf einen Blick erkennbar.

## Akzeptanzkriterien
- [ ] Behandlung mit Mittel, Menge, Anwendungsart, Diagnose, Tierarzt, Abgabebeleg-Nr.
- [ ] Wartezeit-Ende automatisch je Produkt (Fleisch, Milch, Eier) aus den Betriebsmittel-Wartezeiten
- [ ] Übersicht 'in Wartezeit' (Ampel) auf der Startseite
- [ ] Restrecherche Art. 108 VO (EU) 2019/6 und § 12 Rückstandskontrollverordnung; Felder ggf. ergänzen
- [ ] Aufbewahrung 5 Jahre

## Prompt für die Umsetzung
```text
Setze V1-05 aus docs/roadmap.md um: Recherchiere die offenen Punkte zu Art. 108 VO (EU) 2019/6 und § 12 Rückstandskontrollverordnung, dann baue die Erfassung von Tierbehandlungen mit automatischer Wartezeitberechnung und einer Wartezeit-Übersicht auf der Startseite.
```

## Grundlagen
- [docs/rechtsgrundlagen.md#4-tierarzneimittel-tamg-rückstandskontrolle](../../docs/rechtsgrundlagen.md#4-tierarzneimittel-tamg-rückstandskontrolle)
- [schema/massnahmen/tierbehandlung.schema.json](../../schema/massnahmen/tierbehandlung.schema.json)

## Definition of Done
- [ ] Akzeptanzkriterien erfüllt
- [ ] Tests ergänzt und grün (tests/index.html bzw. werkzeuge/pruefe_daten.py)
- [ ] Testdaten des Musterbetriebs ergänzt, falls neue Daten entstehen
- [ ] README bzw. docs/ aktualisiert
