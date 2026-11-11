---
name: "V1-09 · Fristen- und Erinnerungszentrale"
about: "Alle offenen Pflichten an einem Ort, ohne Server."
title: "[V1-09] Fristen- und Erinnerungszentrale"
labels: ["meilenstein: V1", "bereich: core"]
assignees: ""
---
<!-- erzeugt von werkzeuge/erzeuge_roadmap.py – nicht von Hand bearbeiten -->

**Meilenstein:** v1 – Tierhaltung, ÖPUL und mehrere Geräte
**Bereich:** core
**Hängt ab von:** V1-03, MVP-16

## Ziel
Alle offenen Pflichten an einem Ort, ohne Server.

## Akzeptanzkriterien
- [ ] Sammelt Fristen aus allen Modulen über eine Kern-Schnittstelle (PSM 2 Tage, NAPV 14 Tage und 31. Jänner, Rinder 7 Tage, Geräteprüfung, Ausbildungsbescheinigung, Sicherung)
- [ ] Anzeige auf der Startseite mit Zähler
- [ ] Klärung, was ohne Server an Benachrichtigungen möglich ist (Notification API, Badging) – ehrlich dokumentiert
- [ ] Fristen kommen aus /rules, nicht aus dem Code

## Prompt für die Umsetzung
```text
Setze V1-09 aus docs/roadmap.md um: Baue eine Fristenzentrale im Kern, bei der Module ihre offenen Pflichten melden (Fristen aus /rules), mit Anzeige auf der Startseite. Prüfe und dokumentiere ehrlich, welche Benachrichtigungen ohne Server auf Android und iOS möglich sind.
```

## Grundlagen
- [docs/rechtsgrundlagen.md#0-kurzüberblick](../../docs/rechtsgrundlagen.md#0-kurzüberblick)

## Definition of Done
- [ ] Akzeptanzkriterien erfüllt
- [ ] Tests ergänzt und grün (tests/index.html bzw. werkzeuge/pruefe_daten.py)
- [ ] Testdaten des Musterbetriebs ergänzt, falls neue Daten entstehen
- [ ] README bzw. docs/ aktualisiert
