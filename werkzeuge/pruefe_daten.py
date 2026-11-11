#!/usr/bin/env python3
"""Prüft Exportdateien von AGRARDOK+ gegen /schema und auf gültige Verweise.

Aufruf:  python3 werkzeuge/pruefe_daten.py testdaten/musterbetrieb.json
Benötigt: pip install "jsonschema>=4.18"   (nur für Entwickler, die App selbst braucht das nicht)
"""
import json
import sys
from pathlib import Path

try:
    from jsonschema import Draft202012Validator, FormatChecker
    from referencing import Registry, Resource
except ImportError:
    sys.exit('Bitte zuerst installieren: pip install "jsonschema>=4.18"')

SCHEMA_DIR = Path(__file__).resolve().parent.parent / "schema"

# Welche Felder auf welche Sammlung verweisen (Feldname -> Sammlung im Export)
VERWEISE = {
    "betrieb_id": "betriebe", "feldstueck_id": "feldstuecke", "kultur_id": "kulturen",
    "mutter_id": "tiere", "betriebsmittel_id": "betriebsmittel", "saatgut_betriebsmittel_id": "betriebsmittel",
    "tierarzt_person_id": "personen", "lohnunternehmer_person_id": "personen",
    "erstellt_von": "personen", "geaendert_von": "personen",
    "schlag_ids": "schlaege", "tier_ids": "tiere", "person_ids": "personen", "maschine_ids": "maschinen",
}


def lade_registry():
    resources = []
    for pfad in SCHEMA_DIR.rglob("*.schema.json"):
        schema = json.loads(pfad.read_text(encoding="utf-8"))
        resources.append((schema["$id"], Resource.from_contents(schema)))
    return Registry().with_resources(resources)


def pruefe_schema(daten, registry):
    export_schema = registry.contents("https://agrardok.invalid/schema/export.schema.json")
    validator = Draft202012Validator(export_schema, registry=registry, format_checker=FormatChecker())
    fehler = sorted(validator.iter_errors(daten), key=lambda e: list(e.absolute_path))
    def text(f):
        if f.validator in ("anyOf", "oneOf"):
            return f"keine der erlaubten Varianten passt ({f.validator}) – siehe $comment im Schema"
        return f.message if len(f.message) <= 200 else f.message[:200] + " …"
    return [f"{'/'.join(map(str, f.absolute_path)) or '(Wurzel)'}: {text(f)}" for f in fehler]


def pruefe_verweise(daten):
    sammlungen = daten.get("daten", {})
    ids = {name: {d["id"] for d in liste} for name, liste in sammlungen.items()}
    alle_ids = set().union(*ids.values()) if ids else set()
    fehler = []

    def besuche(obj, pfad):
        if isinstance(obj, dict):
            for k, v in obj.items():
                ziel = VERWEISE.get(k)
                werte = v if isinstance(v, list) else [v]
                if ziel and all(isinstance(w, str) for w in werte):
                    for w in werte:
                        if w not in ids.get(ziel, set()):
                            fehler.append(f"{pfad}/{k}: '{w}' nicht in '{ziel}' gefunden")
                else:
                    besuche(v, f"{pfad}/{k}")
        elif isinstance(obj, list):
            for n, v in enumerate(obj):
                besuche(v, f"{pfad}/{n}")

    besuche(sammlungen, "daten")
    for n, a in enumerate(daten.get("aenderungen", [])):
        if a["datensatz_id"] not in alle_ids:
            fehler.append(f"aenderungen/{n}: datensatz_id '{a['datensatz_id']}' unbekannt")
    doppelt = [i for name in ids for i in ids[name] if sum(i in s for s in ids.values()) > 1]
    fehler += [f"ID mehrfach vergeben: {i}" for i in sorted(set(doppelt))]
    return fehler


def main(pfade):
    registry = lade_registry()
    ok = True
    for pfad in pfade:
        daten = json.loads(Path(pfad).read_text(encoding="utf-8"))
        fehler = pruefe_schema(daten, registry) + pruefe_verweise(daten)
        anzahl = sum(len(v) for v in daten.get("daten", {}).values())
        if fehler:
            ok = False
            print(f"✗ {pfad}: {len(fehler)} Fehler")
            for f in fehler:
                print("   -", f)
        else:
            print(f"✓ {pfad}: {anzahl} Datensätze gültig")
    return 0 if ok else 1


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    sys.exit(main(sys.argv[1:]))
