#!/usr/bin/env python3
"""Erzeugt aus werkzeuge/roadmap_aufgaben.json
   1. je Aufgabe ein GitHub-Issue-Template unter .github/ISSUE_TEMPLATE/
   2. den Aufgabenteil in docs/roadmap.md (zwischen den Markierungen AUFGABEN:START/ENDE)
und prüft, ob alle Quellenlinks (inkl. #Sprungmarken) auf existierende Überschriften zeigen.

Aufruf: python3 werkzeuge/erzeuge_roadmap.py      (keine Fremdbibliotheken nötig)
"""
import json
import re
import sys
import unicodedata
from pathlib import Path

WURZEL = Path(__file__).resolve().parent.parent
QUELLE = WURZEL / "werkzeuge" / "roadmap_aufgaben.json"
TEMPLATE_DIR = WURZEL / ".github" / "ISSUE_TEMPLATE"
ROADMAP = WURZEL / "docs" / "roadmap.md"
MARKE = "<!-- erzeugt von werkzeuge/erzeuge_roadmap.py – nicht von Hand bearbeiten -->"
START, ENDE = "<!-- AUFGABEN:START -->", "<!-- AUFGABEN:ENDE -->"


def github_slug(text):
    """Nachbildung der GitHub-Sprungmarken: klein, Satzzeichen weg, jedes Leerzeichen -> '-'."""
    text = text.strip().lower()
    text = "".join(z for z in text if z.isalnum() or z in " -_" or unicodedata.category(z) == "Mn")
    return text.replace(" ", "-")


def ueberschriften(pfad):
    slugs, gezaehlt = set(), {}
    im_code = False
    for zeile in pfad.read_text(encoding="utf-8").splitlines():
        if zeile.startswith("```"):
            im_code = not im_code
        if im_code or not re.match(r"^#{1,6} ", zeile):
            continue
        slug = github_slug(re.sub(r"^#{1,6} ", "", zeile))
        n = gezaehlt.get(slug, 0)
        slugs.add(slug if n == 0 else f"{slug}-{n}")
        gezaehlt[slug] = n + 1
    return slugs


def pruefe_quellen(aufgaben):
    fehler = []
    cache = {}
    for a in aufgaben:
        for q in a["quellen"]:
            datei, _, anker = q.partition("#")
            pfad = WURZEL / datei
            if not pfad.exists():
                fehler.append(f"{a['id']}: Datei fehlt: {datei}")
                continue
            if anker:
                slugs = cache.setdefault(datei, ueberschriften(pfad))
                if anker not in slugs:
                    kandidaten = [s for s in slugs if s.split("-")[0] == anker.split("-")[0]]
                    fehler.append(f"{a['id']}: Sprungmarke '#{anker}' fehlt in {datei}. Ähnlich: {kandidaten[:3]}")
    return fehler


def slug_datei(text):
    t = text.lower()
    for a, b in (("ä", "ae"), ("ö", "oe"), ("ü", "ue"), ("ß", "ss")):
        t = t.replace(a, b)
    t = re.sub(r"[^a-z0-9]+", "-", t).strip("-")
    return t[:60].rstrip("-")


def labels(a):
    return [f"meilenstein: {a['meilenstein']}", f"bereich: {a['bereich']}"]


def link(q, von_docs):
    datei, _, anker = q.partition("#")
    ziel = ("../" if von_docs else "../../") + datei + (f"#{anker}" if anker else "")
    return f"[{q}]({ziel})"


def template(a, ms):
    abh = ", ".join(a["abhaengig"]) or "keine"
    kriterien = "\n".join(f"- [ ] {k}" for k in a["kriterien"])
    quellen = "\n".join(f"- {link(q, von_docs=False)}" for q in a["quellen"])
    name = f"{a['id']} · {a['titel']}"
    about = a["ziel"].replace('"', "'")
    return f"""---
name: "{name}"
about: "{about}"
title: "[{a['id']}] {a['titel']}"
labels: {json.dumps(labels(a), ensure_ascii=False)}
assignees: ""
---
{MARKE}

**Meilenstein:** {ms['titel']}
**Bereich:** {a['bereich']}
**Hängt ab von:** {abh}

## Ziel
{a['ziel']}

## Akzeptanzkriterien
{kriterien}

## Prompt für die Umsetzung
```text
{a['prompt']}
```

## Grundlagen
{quellen}

## Definition of Done
- [ ] Akzeptanzkriterien erfüllt
- [ ] Tests ergänzt und grün (tests/index.html bzw. werkzeuge/pruefe_daten.py)
- [ ] Testdaten des Musterbetriebs ergänzt, falls neue Daten entstehen
- [ ] README bzw. docs/ aktualisiert
"""


def kurz(titel, laenge=42):
    """Kürzt an einer Wortgrenze für die Diagrammknoten."""
    if len(titel) <= laenge:
        return titel
    return titel[:laenge].rsplit(" ", 1)[0].rstrip(":,(") + " …"


STAND = {"erledigt": "✅ erledigt", "teilweise": "🟡 teilweise", "geprueft": "🔎 geprüft"}


def stand_kurz(a):
    st = a.get("stand")
    return f"{STAND[st['status']]} ({st['version']})" if st else "–"


def roadmap_block(daten):
    aufg = daten["aufgaben"]
    teile = []
    for ms in daten["meilensteine"]:
        liste = [a for a in aufg if a["meilenstein"] == ms["id"]]
        ids = {a["id"] for a in liste}
        teile.append(f"## {ms['titel']}\n\n**Ziel:** {ms['ziel']}\n")
        teile.append("| ID | Aufgabe | Bereich | Hängt ab von | Stand |\n|---|---|---|---|---|")
        for a in liste:
            anker = github_slug(f"{a['id']} – {a['titel']}")
            teile.append(f"| [{a['id']}](#{anker}) | {a['titel']} | {a['bereich']} | {', '.join(a['abhaengig']) or '–'} | {stand_kurz(a)} |")
        kanten = []
        for a in liste:
            for d in a["abhaengig"]:
                quelle = d.replace("-", "_") if d in ids else d.split("-")[0] + "_fertig"
                kante = f"    {quelle} --> {a['id'].replace('-', '_')}"
                if kante not in kanten:
                    kanten.append(kante)
        knoten = [f"    {a['id'].replace('-', '_')}[\"{a['id']}<br/>{kurz(a['titel'])}\"]" for a in liste]
        extern = sorted({d.split("-")[0] for a in liste for d in a["abhaengig"] if d not in ids})
        knoten += [f"    {e}_fertig([{e} fertig])" for e in extern]
        teile.append("\n```mermaid\nflowchart LR\n" + "\n".join(knoten + kanten) + "\n```\n")
        for a in liste:
            kriterien = "\n".join(f"- {k}" for k in a["kriterien"])
            quellen = ", ".join(link(q, von_docs=True) for q in a["quellen"])
            teile.append(f"""### {a['id']} – {a['titel']}

**Ziel:** {a['ziel']}
**Hängt ab von:** {', '.join(a['abhaengig']) or 'keine'} · **Bereich:** `{a['bereich']}` · **Grundlagen:** {quellen}
{f"**Stand:** {stand_kurz(a)}{' – ' + a['stand']['text'] if a['stand'].get('text') else ''}" + chr(10) if a.get('stand') else ''}
Akzeptanzkriterien:
{kriterien}

Prompt:
```text
{a['prompt']}
```
""")
    alle_labels = sorted({l for a in aufg for l in labels(a)})
    befehle = "\n".join(f'gh label create "{l}" --force' for l in alle_labels)
    teile.append(f"## Labels anlegen\n\nDie Templates setzen Labels. Damit sie sicher gesetzt werden, legst du sie einmalig an:\n\n```sh\n{befehle}\n```\n")
    return "\n".join(teile)


def main():
    daten = json.loads(QUELLE.read_text(encoding="utf-8"))
    aufg = daten["aufgaben"]
    ids = [a["id"] for a in aufg]
    fehler = [f"ID doppelt: {i}" for i in sorted({i for i in ids if ids.count(i) > 1})]
    fehler += [f"{a['id']}: unbekannte Abhängigkeit {d}" for a in aufg for d in a["abhaengig"] if d not in ids]
    fehler += pruefe_quellen(aufg)
    if fehler:
        print("Abbruch – bitte roadmap_aufgaben.json korrigieren:")
        print("\n".join(" - " + f for f in fehler))
        return 1

    TEMPLATE_DIR.mkdir(parents=True, exist_ok=True)
    for alt in TEMPLATE_DIR.glob("*.md"):
        if MARKE in alt.read_text(encoding="utf-8"):
            alt.unlink()
    ms_index = {m["id"]: m for m in daten["meilensteine"]}
    for a in aufg:
        datei = TEMPLATE_DIR / f"{a['id'].lower()}-{slug_datei(a['titel'])}.md"
        datei.write_text(template(a, ms_index[a["meilenstein"]]), encoding="utf-8")

    text = ROADMAP.read_text(encoding="utf-8")
    if START not in text or ENDE not in text:
        print(f"Markierungen {START} / {ENDE} fehlen in docs/roadmap.md")
        return 1
    kopf, rest = text.split(START, 1)
    _, fuss = rest.split(ENDE, 1)
    ROADMAP.write_text(f"{kopf}{START}\n{MARKE}\n\n{roadmap_block(daten)}\n{ENDE}{fuss}", encoding="utf-8")
    print(f"✓ {len(aufg)} Issue-Templates erzeugt, docs/roadmap.md aktualisiert")
    return 0


if __name__ == "__main__":
    sys.exit(main())
