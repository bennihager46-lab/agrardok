#!/usr/bin/env python3
"""Prüft, ob der Service Worker zur App passt:
  - jede App-Datei (index.html, manifest.json, css/, core/, icons/) steht in APP_DATEIEN in sw.js
  - jeder Eintrag in APP_DATEIEN existiert
  - VERSION in sw.js == APP_VERSION in core/version.js
  - alle relativen JS-Importe in core/ zeigen auf existierende Dateien

Aufruf: python3 werkzeuge/pruefe_app.py     (nur Standardbibliothek)
"""
import re
import sys
from pathlib import Path

WURZEL = Path(__file__).resolve().parent.parent
APP_ORDNER = ["css", "core", "icons", "stammdaten", "flaechen", "betriebsmittel", "schlagkartei", "duengung",
              "pflanzenschutz", "oepul", "boden", "feldnotiz", "schema", "rules", "vendor"]
APP_EINZELN = ["index.html", "manifest.json"]


def main():
    fehler = []
    sw = (WURZEL / "sw.js").read_text(encoding="utf-8")
    liste_text = re.search(r"APP_DATEIEN\s*=\s*\[(.*?)\];", sw, re.S).group(1)
    eintraege = re.findall(r'"\./([^"]*)"', liste_text)
    im_sw = {e for e in eintraege if e}  # "./" selbst ist der Startpfad

    vorhanden = set(APP_EINZELN)
    for ordner in APP_ORDNER:
        if not (WURZEL / ordner).is_dir():
            continue
        for p in (WURZEL / ordner).rglob("*"):
            if p.is_file() and not p.name.startswith("."):
                vorhanden.add(p.relative_to(WURZEL).as_posix())

    if "--schreiben" in sys.argv:  # APP_DATEIEN aus den vorhandenen Dateien neu erzeugen
        neu = "\n".join(['  "./",'] + [f'  "./{f}",' for f in sorted(vorhanden)])
        sw = re.sub(r"(APP_DATEIEN\s*=\s*\[)(.*?)(\];)", lambda m: f"{m.group(1)}\n{neu}\n{m.group(3)}", sw, count=1, flags=re.S)
        (WURZEL / "sw.js").write_text(sw, encoding="utf-8")
        im_sw = set(vorhanden)

    for f in sorted(vorhanden - im_sw):
        fehler.append(f"Fehlt in APP_DATEIEN (offline nicht verfügbar): ./{f}")
    for f in sorted(im_sw - vorhanden):
        fehler.append(f"APP_DATEIEN enthält nicht vorhandene Datei: ./{f}")

    sw_version = re.search(r'const VERSION = "([^"]+)"', sw).group(1)
    app_version = re.search(r'APP_VERSION = "([^"]+)"', (WURZEL / "core/version.js").read_text(encoding="utf-8")).group(1)
    if sw_version != app_version:
        fehler.append(f"Version passt nicht: sw.js {sw_version} ≠ core/version.js {app_version}")

    # Schemas: jede Datei muss in core/validierung.js stehen und nur unterstützte Schlüsselwörter nutzen
    import json
    val = (WURZEL / "core/validierung.js").read_text(encoding="utf-8")
    gelistet = set(re.findall(r'"([a-z/]+\.schema\.json)"', re.search(r"SCHEMA_DATEIEN = \[(.*?)\];", val, re.S).group(1)))
    unterstuetzt = set(re.findall(r'"([$\w]+)"', re.search(r"UNTERSTUETZT = new Set\(\[(.*?)\]\)", val, re.S).group(1)))
    for schema_datei in (WURZEL / "schema").rglob("*.schema.json"):
        rel = schema_datei.relative_to(WURZEL / "schema").as_posix()
        if rel not in gelistet:
            fehler.append(f"schema/{rel} fehlt in SCHEMA_DATEIEN (core/validierung.js)")
        unbekannt = set()

        def besuche(knoten, ist_schema=True):
            if isinstance(knoten, dict):
                for k, v in knoten.items():
                    if ist_schema and k not in unterstuetzt:
                        unbekannt.add(k)
                    if k in ("properties", "$defs"):
                        for unter in v.values():
                            besuche(unter)
                    elif k in ("allOf", "anyOf", "oneOf"):
                        for unter in v:
                            besuche(unter)
                    elif k in ("items", "additionalProperties", "unevaluatedProperties", "not", "if", "then", "else"):
                        besuche(v)
        besuche(json.loads(schema_datei.read_text(encoding="utf-8")))
        if unbekannt:
            fehler.append(f"schema/{rel}: vom Browser-Validator nicht unterstützte Schlüsselwörter {sorted(unbekannt)}")

    for js in [p for o in ("core", "stammdaten", "flaechen") for p in (WURZEL / o).rglob("*.js")]:
        for ziel in re.findall(r'(?:import|from)\s*\(?\s*"(\.{1,2}/[^"]+)"', js.read_text(encoding="utf-8")):
            if not (js.parent / ziel).resolve().exists():
                fehler.append(f"{js.relative_to(WURZEL)}: Import nicht gefunden: {ziel}")

    if fehler:
        print("✗ App-Prüfung fehlgeschlagen:")
        print("\n".join("  - " + f for f in fehler))
        return 1
    print(f"✓ Service Worker deckt alle {len(vorhanden)} App-Dateien ab, Version {sw_version}, alle Importe gefunden")
    return 0


if __name__ == "__main__":
    sys.exit(main())
