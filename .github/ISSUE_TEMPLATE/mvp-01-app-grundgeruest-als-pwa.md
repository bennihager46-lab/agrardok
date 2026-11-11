---
name: "MVP-01 · App-Grundgerüst als PWA"
about: "Eine installierbare, offline startende App-Hülle ohne Build-Schritt, die auf GitHub Pages läuft."
title: "[MVP-01] App-Grundgerüst als PWA"
labels: ["meilenstein: MVP", "bereich: core"]
assignees: ""
---
<!-- erzeugt von werkzeuge/erzeuge_roadmap.py – nicht von Hand bearbeiten -->

**Meilenstein:** MVP – Dünge- und Pflanzenschutzaufzeichnungen für Ackerbaubetriebe
**Bereich:** core
**Hängt ab von:** keine

## Ziel
Eine installierbare, offline startende App-Hülle ohne Build-Schritt, die auf GitHub Pages läuft.

## Akzeptanzkriterien
- [ ] index.html, manifest.webmanifest, sw.js und Basis-CSS gemäß Ordnerstruktur in docs/architektur.md
- [ ] Nach dem ersten Laden startet die App ohne Netz (Service Worker cached alle App-Dateien, Versionierung des Caches)
- [ ] Installierbar auf Android (Chrome) und iOS (Safari, Home-Bildschirm); Installationshinweis in der App
- [ ] Gestaltung: Touch-Ziele mindestens 48 × 48 px, Grundschrift mindestens 18 px, hoher Kontrast (helles Design als Standard für Sonnenlicht)
- [ ] Nur relative Pfade, damit die App in einem Unterordner von GitHub Pages läuft
- [ ] Startseite mit Navigation zu Stammdaten und Modulen (zunächst Platzhalter)

## Prompt für die Umsetzung
```text
Setze MVP-01 aus docs/roadmap.md um: Lege das PWA-Grundgerüst (index.html, manifest.webmanifest, sw.js, Basis-CSS, Startseite mit Navigation) nach der Ordnerstruktur in docs/architektur.md an – ohne Build-Tooling, nur relative Pfade, offline-fähig, große Touch-Ziele und hoher Kontrast. Erkläre kurz die Cache-Strategie des Service Workers und aktualisiere die README.
```

## Grundlagen
- [docs/architektur.md#3-ordnerstruktur-und-module](../../docs/architektur.md#3-ordnerstruktur-und-module)
- [CLAUDE.md](../../CLAUDE.md)

## Definition of Done
- [ ] Akzeptanzkriterien erfüllt
- [ ] Tests ergänzt und grün (tests/index.html bzw. werkzeuge/pruefe_daten.py)
- [ ] Testdaten des Musterbetriebs ergänzt, falls neue Daten entstehen
- [ ] README bzw. docs/ aktualisiert
