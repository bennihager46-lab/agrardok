---
name: "V2-02 · Automatischer Abgleich über WebDAV (Stufe 3)"
about: "Wer eine Nextcloud oder ähnlichen Speicher hat, gleicht automatisch ab – ohne eigenen Server-Code."
title: "[V2-02] Automatischer Abgleich über WebDAV (Stufe 3)"
labels: ["meilenstein: V2", "bereich: sync"]
assignees: ""
---
<!-- erzeugt von werkzeuge/erzeuge_roadmap.py – nicht von Hand bearbeiten -->

**Meilenstein:** v2 – Komfort und Erweiterungen
**Bereich:** sync
**Hängt ab von:** V1-01

## Ziel
Wer eine Nextcloud oder ähnlichen Speicher hat, gleicht automatisch ab – ohne eigenen Server-Code.

## Akzeptanzkriterien
- [ ] Recherche: CORS-Verhalten gängiger WebDAV-Anbieter, Anmeldung ohne Passwort im Klartext
- [ ] Transport-Adapter core/sync/webdav.js nutzt dieselben Sync-Pakete wie V1-01
- [ ] Abgleich beim Öffnen und manuell; offline wird gepuffert
- [ ] Optional: Bewertung CouchDB-Adapter als Prototyp

## Prompt für die Umsetzung
```text
Setze V2-02 aus docs/roadmap.md um: Prüfe, ob WebDAV-Speicher wie Nextcloud aus dem Browser (CORS, Anmeldung) nutzbar sind, und baue bei positivem Ergebnis den Transport-Adapter core/sync/webdav.js, der dieselben Sync-Pakete wie der Dateiabgleich verwendet.
```

## Grundlagen
- [docs/architektur.md#46-empfehlung-variante-a-in-stufen-ausbaubar](../../docs/architektur.md#46-empfehlung-variante-a-in-stufen-ausbaubar)

## Definition of Done
- [ ] Akzeptanzkriterien erfüllt
- [ ] Tests ergänzt und grün (tests/index.html bzw. werkzeuge/pruefe_daten.py)
- [ ] Testdaten des Musterbetriebs ergänzt, falls neue Daten entstehen
- [ ] README bzw. docs/ aktualisiert
