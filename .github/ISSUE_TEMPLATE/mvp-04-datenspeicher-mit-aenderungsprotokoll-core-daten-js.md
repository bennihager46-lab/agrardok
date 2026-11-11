---
name: "MVP-04 · Datenspeicher mit Änderungsprotokoll (core/daten.js)"
about: "Einheitlicher Zugriff aller Module auf IndexedDB, der jede Änderung protokolliert."
title: "[MVP-04] Datenspeicher mit Änderungsprotokoll (core/daten.js)"
labels: ["meilenstein: MVP", "bereich: core"]
assignees: ""
---
<!-- erzeugt von werkzeuge/erzeuge_roadmap.py – nicht von Hand bearbeiten -->

**Meilenstein:** MVP – Dünge- und Pflanzenschutzaufzeichnungen für Ackerbaubetriebe
**Bereich:** core
**Hängt ab von:** MVP-03

## Ziel
Einheitlicher Zugriff aller Module auf IndexedDB, der jede Änderung protokolliert.

## Akzeptanzkriterien
- [ ] Ein Object Store je Entität plus Store 'aenderungen'; Indizes für betrieb_id, jahr, art, datum, schlag_ids (multiEntry)
- [ ] API: liste(entitaet, filter), hole(entitaet, id), speichern(entitaet, obj), loeschen(entitaet, id)
- [ ] speichern ergänzt id, betrieb_id, erstellt_*/geaendert_*, geraet_id, hlc, rev+1 und schreibt einen Eintrag nach aenderung.schema.json (bei Änderung nur geänderte Felder)
- [ ] loeschen setzt nur geloescht = true; liste blendet Gelöschtes standardmäßig aus
- [ ] Datensatz und Protokolleintrag werden in einer Transaktion geschrieben
- [ ] schema_version gespeichert, Gerüst für Migrationen
- [ ] Tests für alle Funktionen inkl. Transaktionsabbruch

## Prompt für die Umsetzung
```text
Setze MVP-04 aus docs/roadmap.md um: Implementiere core/daten.js (IndexedDB) mit liste/hole/speichern/loeschen nach der Kern-API-Skizze in docs/architektur.md. Jede Speicherung schreibt in derselben Transaktion einen Eintrag ins Änderungsprotokoll (schema/aenderung.schema.json); Löschen nur als Löschmarke. Mit Tests.
```

## Grundlagen
- [docs/architektur.md#33-kern-api-skizze](../../docs/architektur.md#33-kern-api-skizze)
- [schema/aenderung.schema.json](../../schema/aenderung.schema.json)

## Definition of Done
- [ ] Akzeptanzkriterien erfüllt
- [ ] Tests ergänzt und grün (tests/index.html bzw. werkzeuge/pruefe_daten.py)
- [ ] Testdaten des Musterbetriebs ergänzt, falls neue Daten entstehen
- [ ] README bzw. docs/ aktualisiert
