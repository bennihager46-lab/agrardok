#!/usr/bin/env python3
"""Automatischer Ende-zu-Ende-Test im echten Browser (Chromium über Playwright).

  1. Führt die Browser-Tests unter tests/index.html aus.
  2. Lädt die App einmal online, wartet auf den Service Worker.
  3. BEENDET den Webserver und schaltet den Browser offline.
  4. Prüft offline: App startet, Navigation, Import der Testdaten, Export, Daten bleiben nach Neustart.
  5. Gegenprobe: ein Browser ohne Service Worker kann die App offline NICHT öffnen.

Geprüft werden beide Service-Worker-Modi:
  - Produktion (cache first) unter http://agrardok.localhost:<port>/
  - Entwicklung (Netz zuerst, Cache als Rückfall) unter http://127.0.0.1:<port>/

Voraussetzung (nur für Entwickler):
  pip install playwright "jsonschema>=4.18" && python3 -m playwright install chromium
Aufruf:
  python3 werkzeuge/teste_offline.py
"""
import functools
import http.server
import json
import re
import sys
import tempfile
import threading
from pathlib import Path

from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import sync_playwright

WURZEL = Path(__file__).resolve().parent.parent
TESTDATEN = WURZEL / "testdaten" / "musterbetrieb.json"
sys.path.insert(0, str(WURZEL / "werkzeuge"))

ergebnisse = []
_muster = json.loads(TESTDATEN.read_text(encoding="utf-8"))["daten"]
ANZAHL = sum(len(v) for v in _muster.values())          # Datensätze im Musterbetrieb
ANZAHL_MASSNAHMEN = len(_muster["massnahmen"])


def pruefe(bedingung, text):
    ergebnisse.append((bool(bedingung), text))
    print(("  ✓ " if bedingung else "  ✗ ") + text)
    return bedingung


class StillerHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def starte_server():
    handler = functools.partial(StillerHandler, directory=str(WURZEL))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server


def warte_auf_app(seite):
    seite.wait_for_selector("html[data-bereit='ja']", timeout=15000)


def warte_auf_service_worker(seite):
    seite.wait_for_function("navigator.serviceWorker && navigator.serviceWorker.controller !== null", timeout=15000)


def konsolenfehler_sammeln(seite, liste, name):
    seite.on("console", lambda m: liste.append(f"{name}: {m.text}") if m.type == "error" else None)
    seite.on("pageerror", lambda e: liste.append(f"{name}: {e}"))


def offline_pruefungen(kontext, basis, name, fehlerliste, export_ziel):
    print(f"\n[{name}] Offline-Prüfung unter {basis}")
    seite = kontext.new_page()
    konsolenfehler_sammeln(seite, fehlerliste, name)

    seite.goto(basis + "#/start")
    warte_auf_app(seite)
    pruefe(seite.locator("h1").inner_text() == "AGRARDOK+", "App startet ohne Server und ohne Netz")
    pruefe(seite.locator("#verbindung").is_visible(), "Hinweis „Offline“ wird angezeigt")

    seite.locator("nav a[data-route='einstellungen']").click()
    seite.wait_for_selector("[data-test='sw-status']")
    seite.wait_for_function("document.querySelector(\"[data-test='sw-status']\").textContent.includes('aktiv')")
    pruefe(True, "Navigation unten funktioniert, Service Worker meldet „aktiv“")

    seite.set_input_files("[data-test='import-datei']", str(TESTDATEN))
    seite.wait_for_selector("[data-test='import-zusammenfassung']")
    pruefe(f"{ANZAHL} Datensätze werden übernommen" in seite.inner_text("[data-test='import-zusammenfassung']"), f"Import-Vorschau zeigt {ANZAHL} neue Datensätze")
    seite.click("[data-test='import-uebernehmen']")
    seite.wait_for_selector("[data-test='import-fertig']")
    pruefe(f"{ANZAHL} neu" in seite.inner_text("[data-test='import-fertig']"), "Import der Testdaten offline erfolgreich")

    with seite.expect_download() as download_info:
        seite.click("[data-test='export']")
    pfad = export_ziel / f"{name}-export.json"
    download_info.value.save_as(pfad)
    export = json.loads(pfad.read_text(encoding="utf-8"))
    anzahl = sum(len(v) for v in export["daten"].values())
    pruefe(anzahl == ANZAHL, f"Export offline erstellt ({anzahl} Datensätze, {download_info.value.suggested_filename})")
    try:
        import pruefe_daten

        registry = pruefe_daten.lade_registry()
        schemafehler = pruefe_daten.pruefe_schema(export, registry) + pruefe_daten.pruefe_verweise(export)
        pruefe(not schemafehler, "Exportdatei entspricht schema/export.schema.json" + (f": {schemafehler[:3]}" if schemafehler else ""))
    except SystemExit:
        print("  – Schema-Prüfung übersprungen (jsonschema nicht installiert)")

    seite.close()
    seite2 = kontext.new_page()
    konsolenfehler_sammeln(seite2, fehlerliste, name)
    seite2.goto(basis)
    warte_auf_app(seite2)
    text = seite2.inner_text("main")
    pruefe("Aufzeichnungen" in text and str(ANZAHL_MASSNAHMEN) in text, f"Neuer Tab offline: Daten sind noch da ({ANZAHL_MASSNAHMEN} Aufzeichnungen)")
    seite2.close()


def betrieb_szenario(kontext, basis, fehlerliste):
    """Betrieb und Personen offline über die Formulare einrichten – wie eine Nutzerin es täte."""
    print(f"\n[betrieb] Betrieb offline einrichten unter {basis}")
    seite = kontext.new_page()
    konsolenfehler_sammeln(seite, fehlerliste, "betrieb")
    seite.goto(basis)
    warte_auf_app(seite)
    seite.click("[data-test='start-einrichten']")
    seite.wait_for_selector("form.formular")

    # 1. Absichtlich fehlerhaft: Name leer, Betriebsnummer zu kurz, Bio ohne Kontrollstelle, PLZ zu kurz
    #    (eine 5. PLZ-Ziffer verhindert das Feld selbst über maxlength)
    seite.fill("[name='betriebsnummer']", "12345")
    seite.fill("[name='adresse/plz']", "12")
    seite.check("input[name='bewirtschaftung'][value='bio']")
    pruefe(seite.is_visible("[name='bio_kontrollstelle']"), "Feld „Kontrollstelle“ erscheint erst bei Bio")
    seite.click("[data-test='speichern']")
    seite.wait_for_selector(".fehler-uebersicht:not([hidden])")
    fehlertexte = seite.inner_text(".fehler-uebersicht")
    erwartet = ["Namen des Betriebs", "genau 7 Ziffern", "Postleitzahl hat 4 Ziffern", "Kontrollstelle angeben", "Bundesland wählen", "wer den Betrieb bewirtschaftet"]
    fehlend = [t for t in erwartet if t not in fehlertexte]
    pruefe(not fehlend, "Fehlerhafte Eingaben werden mit verständlichen Meldungen abgelehnt" + (f" – fehlt: {fehlend}" if fehlend else ""))
    pruefe(seite.evaluate("document.activeElement.name") == "name", "Fokus springt auf das erste fehlerhafte Feld")
    reihe = seite.eval_on_selector_all(".fehler-uebersicht li", "els => els.map(e => e.textContent.split(':')[0])")
    pruefe(reihe[:3] == ["Name des Betriebs", "Betriebsnummer (LFBIS)", "Bundesland"], f"Fehlerübersicht in Formularreihenfolge ({reihe[:3]})")
    pruefe(seite.locator("[aria-invalid='true']").count() >= 5, "Fehlerhafte Felder sind für Screenreader markiert (aria-invalid)")
    seite.fill("[name='adresse/plz']", "123456")
    pruefe(seite.input_value("[name='adresse/plz']") == "1234", "PLZ-Feld nimmt höchstens 4 Ziffern an")

    # 2. Korrigieren und speichern
    seite.fill("[name='name']", "Testhof Offline")
    seite.fill("[name='betriebsnummer']", "123 4567")  # Leerzeichen werden entfernt
    seite.fill("[name='adresse/plz']", "3100")
    seite.select_option("[name='bundesland']", "ST")
    seite.fill("[name='bewirtschafter/name']", "Eva Test")
    seite.fill("[name='bio_kontrollstelle']", "AT-BIO-401 BIOS")
    seite.check("input[name='oepul_massnahmen'][value='bio']")
    seite.check("input[name='oepul_massnahmen'][value='tierwohl_weide']")
    seite.click("[data-test='speichern']")
    seite.wait_for_selector("[data-test='person-neu']")
    pruefe(True, "Betrieb gespeichert, weiter zu den Personen")

    # 3. Personen: eine mit bald ablaufendem, eine mit unvollständigem Sachkundeausweis
    from datetime import date, timedelta
    bald = (date.today() + timedelta(days=30)).isoformat()
    seite.click("[data-test='person-neu']")
    seite.wait_for_selector("form.formular")
    seite.fill("[name='name']", "Eva Test")
    seite.select_option("[name='rolle']", "betriebsleitung")
    seite.fill("[name='psm_ausbildungsbescheinigung/nummer']", "ST-TEST-1")
    seite.click("[data-test='speichern']")
    seite.wait_for_selector(".fehler-uebersicht:not([hidden])")
    pruefe("fehlt das Ablaufdatum" in seite.inner_text(".fehler-uebersicht"), "Nummer ohne Ablaufdatum wird abgelehnt")
    seite.fill("[name='psm_ausbildungsbescheinigung/gueltig_bis']", bald)
    seite.click("[data-test='speichern']")
    seite.wait_for_selector("[data-test='personenliste']")
    status = seite.get_attribute("[data-test='personenliste'] .status", "data-stufe")
    pruefe(status == "bald", f"Personenliste zeigt Warnung „läuft bald ab“ (Status: {status})")

    # 4. Übersicht und Startseite
    seite.locator("nav a[data-route='betrieb']").click()
    seite.wait_for_selector("[data-test='betriebsdaten']")
    uebersicht = seite.inner_text("[data-test='betriebsdaten']")
    pruefe("1234567" in uebersicht and "Steiermark" in uebersicht and "AT-BIO-401" in uebersicht,
           "Übersicht zeigt die gespeicherten Betriebsdaten (Betriebsnummer ohne Leerzeichen)")
    pruefe(seite.get_attribute("nav a[data-route='betrieb']", "aria-current") == "page", "Navigationspunkt „Betrieb“ ist markiert")
    seite.locator("nav a[data-route='start']").click()
    seite.wait_for_selector("[data-test='start-sachkunde']")
    pruefe("Eva Test" in seite.inner_text("[data-test='start-sachkunde']"), "Startseite warnt vor ablaufendem Sachkundeausweis")

    # 5. Flächen offline aus dem eAMA-ZIP importieren und auf der Karte zeigen
    seite.goto(basis + "#/flaechen")
    seite.wait_for_selector("[data-test='import-start']")
    seite.click("[data-test='import-start']")
    seite.wait_for_selector("[data-test='flaechen-datei']", state="attached")
    seite.set_input_files("[data-test='flaechen-datei']", str(EAMA_ZIP))
    seite.wait_for_selector("[data-test='import-summe']")
    seite.click("[data-test='import-uebernehmen']")
    seite.wait_for_selector("[data-test='flaechenliste']")
    pruefe("Körnermais" in seite.inner_text("[data-test='flaechenliste']"), "Offline: eAMA-Flächen importiert")
    seite.click("[data-test='karte-zeigen']")
    seite.wait_for_selector(".karte-bereich path.leaflet-interactive", state="attached")
    pruefe(seite.is_visible(".karte-hinweis"), "Offline: Karte zeichnet die Flächen und erklärt die fehlende Hintergrundkarte")

    # 6. Neu laden (offline): alles noch da
    seite.reload()
    warte_auf_app(seite)
    seite.goto(basis + "#/betrieb")
    seite.wait_for_selector("[data-test='betriebsdaten']")
    pruefe("Testhof Offline" in seite.inner_text("main"), "Nach Neuladen offline: Betrieb ist gespeichert")
    seite.close()


LEERES_PNG = bytes.fromhex("89504e470d0a1a0a0000000d4948445200000001000000010806000000"
                           "1f15c4890000000d4944415478da63f8ffff3f0005fe02fea7d6a4c90000000049454e44ae426082")
EAMA_ZIP = WURZEL / "testdaten" / "eama-export-beispiel.zip"


def _testbild(breite=2400, hoehe=1800):
    """Echtes PNG (Farbverlauf) – prüft das Verkleinern auf 1600 px."""
    import struct
    import zlib
    roh = b"".join(b"\x00" + bytes(v for x in range(breite) for v in ((x * 13) % 256, (y * 7) % 256, 90)) for y in range(hoehe))
    def chunk(t, d):
        return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xFFFFFFFF)
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", breite, hoehe, 8, 2, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(roh)) + chunk(b"IEND", b"")


LIES_STORE = """(store) => new Promise(r => { const q = indexedDB.open('agraropen'); q.onsuccess = () => { const db = q.result;
  const t = db.transaction(store).objectStore(store).getAll(); t.onsuccess = () => { r(t.result.filter(x => !x.geloescht)); db.close(); }; }; })"""


def aufzeichnung_szenario(kontext, basis, fehlerliste):
    """Kapitel 3 offline: Düngung mit NAPV-Prüfung, Düngeplan, Pflanzenschutz mit CSV, Ernte, Bodenproben-CSV, Feldnotiz mit GPS und Foto."""
    print(f"\n[aufzeichnung] Feld-Aufzeichnungen offline unter {basis}")
    s = kontext.new_page()
    konsolenfehler_sammeln(s, fehlerliste, "aufzeichnung")
    s.goto(basis)
    warte_auf_app(s)
    s.evaluate("location.hash = '#/einstellungen'")
    s.wait_for_selector("input[type=file]", state="attached")
    s.set_input_files("input[type=file]", str(TESTDATEN))
    s.wait_for_selector("[data-test='import-zusammenfassung']")
    s.locator("button:has-text('übernehmen'), button:has-text('Importieren')").first.click()
    s.wait_for_selector("[data-test='import-fertig']")
    gross, haus = "04000000-0000-4000-8000-000000000003", "04000000-0000-4000-8000-000000000001"
    vorher = len(s.evaluate(LIES_STORE, "massnahme"))

    s.evaluate("location.hash = '#/duengung-erfassen'")
    s.wait_for_selector("[data-test='duengung-rechnung']")
    s.select_option("[name='details/betriebsmittel_id']", label="Kalkammonsalpeter 27 % N")
    s.fill("[name='details/aufwand/wert']", "150")
    s.check(f"input[name=schlag_ids][value='{gross}']", force=True)
    s.fill("[name=datum]", "2026-11-20")
    s.wait_for_selector("[data-test='warnungen']")
    codes = s.eval_on_selector_all("[data-test='warnungen'] li", "l => l.map(x => x.dataset.code)")
    pruefe("napv_sperrfrist" in codes and "napv_bodenzustand" in codes, f"Düngung im November: Sperrfrist und Bodenzustand werden gewarnt ({', '.join(codes)})")
    s.click("[data-test='speichern']")
    s.wait_for_timeout(400)
    pruefe(len(s.evaluate(LIES_STORE, "massnahme")) == vorher, "Ohne Bestätigung der Warnungen wird nicht gespeichert")
    s.fill("[name=datum]", "2026-03-20")
    s.wait_for_timeout(300)
    pruefe("40,5" in s.inner_text("[data-test='duengung-rechnung']"), "150 kg Kalkammonsalpeter ergeben 40,5 kg N/ha")
    for b in s.locator("[data-bestaetigung]").all():
        b.check()
    s.click("[data-test='speichern']")
    s.wait_for_selector("[data-test='aufzeichnen-kacheln']")
    neu = [m for m in s.evaluate(LIES_STORE, "massnahme") if m["art"] == "duengung" and m["datum"] == "2026-03-20"]
    pruefe(neu and neu[0]["details"]["naehrstoffe_kg_je_ha"]["n_jahreswirksam"] == 40.5 and neu[0]["regeln"] == ["napv/duengung@2025-01-01"],
           "Düngung gespeichert: jahreswirksamer N und Regelversion")

    s.evaluate(f"location.hash = '#/duengeplan?schlag={gross}&jahr=2026'")
    s.wait_for_selector("[data-test='n-bedarf']")
    pruefe("145" in s.inner_text("[data-test='n-bedarf']"), f"Düngeplan Weizen mittlere Ertragslage: {s.inner_text('[data-test=n-bedarf]')}")

    s.evaluate("location.hash = '#/pflanzenschutz-erfassen'")
    s.wait_for_selector("[name='details/mittel/0/betriebsmittel_id']")
    s.select_option("[name='details/mittel/0/betriebsmittel_id']", label="Beispiel-Herbizid A (fiktiv) (9999-901)")
    s.check(f"input[name=schlag_ids][value='{gross}']", force=True)
    s.fill("[name=datum]", "2026-04-22")
    s.fill("[name='details/bbch']", "40")
    s.wait_for_timeout(300)
    codes = s.eval_on_selector_all("[data-test='warnungen'] li", "l => l.map(x => x.dataset.code)")
    pruefe(s.input_value("[name='details/mittel/0/aufwand/wert']") == "1" and any(c.startswith("psm_bbch") for c in codes),
           "Pflanzenschutz: Aufwandmenge aus der Indikation vorgeschlagen, BBCH außerhalb gewarnt")
    pruefe(s.input_value("[name='details/kultur_name']") == "Winterweichweizen" and s.input_value("[name='details/eppo_code']") == "TRZAW", "Kultur und EPPO-Code aus dem Schlag übernommen")
    s.fill("[name='details/bbch']", "30")
    for b in s.locator("[data-bestaetigung]").all():
        b.check()
    s.click("[data-test='speichern']")
    s.wait_for_selector("[data-test='aufzeichnen-kacheln']")
    s.evaluate("location.hash = '#/psm-bericht?jahr=2026'")
    s.wait_for_selector("[data-test='psm-csv']")
    with s.expect_download() as dl:
        s.click("[data-test='psm-csv']")
    csv = Path(dl.value.path()).read_text(encoding="utf-8-sig")
    pruefe(csv.startswith("Datum;") and csv.count("9999-901") >= 2, "Pflanzenschutz-Export als CSV (DVO 2023/564)")

    s.evaluate("location.hash = '#/massnahme-erfassen?art=ernte'")
    s.wait_for_selector("input[name=schlag_ids]", state="attached")
    s.check(f"input[name=schlag_ids][value='{haus}']", force=True)
    s.fill("[name='details/ertrag/wert']", "9,5")
    s.click("[data-test='speichern']")
    s.wait_for_selector("[data-test='aufzeichnen-kacheln']")
    e = [m for m in s.evaluate(LIES_STORE, "massnahme") if m["art"] == "ernte" and m.get("modul") == "schlagkartei"]
    pruefe(e and e[0]["details"]["menge"]["wert"] == 39.9, "Ernte: Ertrag je ha und Gesamtmenge (4,2 ha × 9,5 t)")

    s.evaluate("location.hash = '#/bodenproben-import'")
    s.wait_for_selector("[data-test='boden-datei']", state="attached")
    s.set_input_files("[data-test='boden-datei']", str(WURZEL / "testdaten" / "bodenproben-beispiel.csv"))
    s.wait_for_selector("[data-test='boden-uebernehmen']")
    s.click("[data-test='boden-uebernehmen']")
    s.wait_for_selector("[data-test='bodenprobenliste']")
    pruefe(len(s.evaluate(LIES_STORE, "bodenprobe")) == 6, "Laborbefund (CSV) eingelesen: 4 Proben zu den 2 vorhandenen")

    s.evaluate("location.hash = '#/feldnotiz'")
    s.wait_for_function("document.querySelector('[data-test=position]')?.textContent.includes('Hausacker')", timeout=10000)
    pruefe(True, "Feldnotiz: GPS-Position ordnet den Schlag zu, in dem man steht")
    s.set_input_files("[data-test='foto-eingabe']", files=[{"name": "blatt.png", "mimeType": "image/png", "buffer": _testbild()}])
    s.wait_for_selector("[data-test='fotos'] img")
    s.fill("[name=text]", "Wühlmäuse am Rand")
    s.click("[data-test='speichern']")
    s.wait_for_selector("[data-test='feldnotizliste']")
    anh = s.evaluate(LIES_STORE, "anhang")
    pruefe(len(anh) == 1 and anh[0]["breite"] == 1600 and anh[0]["daten"].startswith("data:image/jpeg"), "Foto offline verkleinert (1600 px, JPEG) gespeichert")

    s.evaluate("location.hash = '#/fristen'")
    s.wait_for_selector("[data-test='fristen']")
    s.evaluate("location.hash = '#/duengebericht?jahr=2026'")
    s.wait_for_selector("[data-test='bericht-schlaege']")
    pruefe(s.locator("[data-test='bericht-schlaege'] tbody tr").count() == 4, "Düngebericht 2026 mit 4 Schlägen, Fristenkalender erreichbar")
    s.close()


def csp_und_karte(browser, basis, fehlerliste):
    """Mit AKTIVER Content Security Policy: Flächenimport und Karte (Leaflet) dürfen keine CSP-Verstöße auslösen."""
    print(f"\n[CSP] Flächenimport und Karte mit aktiver Sicherheitsrichtlinie unter {basis}")
    k = browser.new_context(service_workers="block")  # bewusst OHNE bypass_csp
    # Kachelserver nicht belasten: Anfragen lokal mit leerem Bild beantworten, aber zählen
    kacheln = []
    def kachel(route):
        kacheln.append(route.request.url)
        route.fulfill(status=200, content_type="image/png", body=LEERES_PNG)
    k.route("https://tile.openstreetmap.org/**", kachel)
    k.route("https://*.wien.gv.at/**", kachel)
    seite = k.new_page()
    csp = []
    seite.on("console", lambda m: csp.append(m.text) if "Content Security Policy" in m.text or "Content-Security-Policy" in m.text else None)
    konsolenfehler_sammeln(seite, fehlerliste, "csp")
    seite.goto(basis + "#/einstellungen")
    seite.wait_for_selector("[data-test='import-datei']")
    seite.set_input_files("[data-test='import-datei']", str(TESTDATEN))
    seite.click("[data-test='import-uebernehmen']")
    seite.wait_for_selector("[data-test='import-fertig']")

    seite.goto(basis + "#/flaechen-import")
    seite.wait_for_selector("[data-test='flaechen-datei']", state="attached")
    seite.set_input_files("[data-test='flaechen-datei']", str(EAMA_ZIP))
    seite.wait_for_selector("[data-test='import-summe']")
    summe = seite.inner_text("[data-test='import-summe']")
    pruefe("3 Feldstücke (3 neu" in summe and "6 Schläge" in summe, f"Vorschau: {summe}")
    seite.wait_for_selector("[data-test='import-karte'] path.leaflet-interactive")
    pfade = seite.locator("[data-test='import-karte'] path.leaflet-interactive").count()
    pruefe(pfade >= 9, f"Vorschaukarte zeigt Feldstücke und Schläge ({pfade} Flächen)")
    pruefe("neue Kultur" in seite.inner_text("[data-test='import-vorschau']"), "Unbekannte Nutzungsart als „neue Kultur“ markiert")
    seite.click("[data-test='import-uebernehmen']")
    seite.wait_for_selector("[data-test='flaechenliste']")
    liste = seite.inner_text("[data-test='flaechenliste']")
    pruefe(liste.count("Feldstück") >= 3 and "Winterweichweizen" in liste and "Körnermais" in liste, "Flächenliste zeigt importierte Feldstücke und Kulturen")
    pruefe(seite.is_visible("[data-test='napv-hinweis']"), "NAPV-Hinweis wird angezeigt")
    seite.click("[data-test='karte-zeigen']")
    # Musterbetrieb und Beispielexport liegen ~90 km auseinander → stark herausgezoomt, Felder nur Pixel groß:
    # daher auf „im Dokument“ statt „sichtbar“ warten
    seite.wait_for_selector(".karte-bereich path.leaflet-interactive", state="attached")
    pruefe(seite.locator(".karte-bereich path.leaflet-interactive").count() >= 9, "Flächenkarte zeichnet alle Feldstücke und Schläge")
    pruefe(len(kacheln) > 0, f"Hintergrundkarte angefragt ({len(kacheln)} Kacheln, im Test lokal beantwortet)")
    # Die Karte darf die feste Navigation nicht überdecken (Leaflet nutzt z-Index bis 1000)
    seite.evaluate("document.querySelector('.karte-bereich').scrollIntoView({block: 'center'})")
    seite.evaluate("window.scrollBy(0, document.querySelector('.karte-bereich').getBoundingClientRect().bottom - innerHeight + 30)")
    oben = seite.evaluate("""(() => { const n = document.querySelector('nav.navigation').getBoundingClientRect();
        return [0.15, 0.5, 0.85].map(x => document.elementFromPoint(n.left + n.width * x, n.top + n.height / 2)?.closest('nav') !== null); })()""")
    pruefe(all(oben), f"Navigation liegt über der Karte (Treffer {oben})")
    attribution = seite.inner_text(".karte-bereich .leaflet-control-attribution")
    pruefe("OpenStreetMap" in attribution, f"Namensnennung sichtbar: {attribution}")
    pruefe(not csp, "Keine Verstöße gegen die Content Security Policy" + (f": {csp[:2]}" if csp else ""))
    k.close()


def layout_pruefungen(browser, basis, fehlerliste):
    """Kleinstes übliches Handy (320 px): keine Seite darf breiter werden (sonst zoomt das Handy heraus)."""
    print("\n[Layout] 320 px breites Handy")
    k = browser.new_context(viewport={"width": 320, "height": 640}, is_mobile=True, has_touch=True, bypass_csp=True,
                            service_workers="block")
    seite = k.new_page()
    konsolenfehler_sammeln(seite, fehlerliste, "layout")
    seite.goto(basis)
    warte_auf_app(seite)

    def passt(was):
        breite = seite.evaluate("[document.documentElement.scrollWidth, document.documentElement.clientWidth]")
        null_text = seite.evaluate("document.querySelector('main').innerText.includes('null')")
        pruefe(breite[0] <= breite[1] and not null_text,
               f"{was}: keine Überbreite ({breite[0]} ≤ {breite[1]} px), kein „null“-Text")

    for route in ("start", "betrieb", "aufzeichnen", "einstellungen"):
        seite.locator(f"nav a[data-route='{route}']").click()
        seite.wait_for_function(f"document.querySelector('main').dataset.seite === '{route}'")
        passt(f"Seite {route}")
    for route, warte in (("betrieb-bearbeiten", "form.formular"), ("flaechen", "h1"), ("person?neu=1", "main h1"), ("flaechen-import", "main h1")):
        seite.goto(basis + f"#/{route}")
        seite.wait_for_selector(warte)
        passt(f"Seite {route}")
    seite.goto(basis + "#/betrieb-bearbeiten")
    seite.wait_for_selector("form.formular")
    seite.click("[data-test='speichern']")
    seite.wait_for_selector(".fehler-uebersicht:not([hidden])")
    passt("Formular mit Fehlermeldungen")
    seite.goto(basis + "#/einstellungen")
    seite.wait_for_selector("[data-test='import-datei']")
    seite.set_input_files("[data-test='import-datei']", str(TESTDATEN))
    seite.wait_for_selector("[data-test='import-zusammenfassung']")
    passt("Import-Vorschau")
    k.close()


def main():
    export_ziel = Path(tempfile.mkdtemp(prefix="agrardok-test-"))
    server = starte_server()
    port = server.server_address[1]
    produktion = f"http://agrardok.localhost:{port}/"
    entwicklung = f"http://127.0.0.1:{port}/"
    konsolenfehler = []

    with sync_playwright() as pw:
        browser = pw.chromium.launch(args=["--host-resolver-rules=MAP agrardok.localhost 127.0.0.1"])

        print("[Browser-Tests] tests/index.html")
        k = browser.new_context()
        seite = k.new_page()
        seite.goto(entwicklung + "tests/index.html")
        seite.wait_for_function("window.__testErgebnis && window.__testErgebnis.fertig", timeout=30000)
        r = seite.evaluate("window.__testErgebnis")
        for f in r["fehler"]:
            print(f"  ✗ {f['test']}: {f['meldung']}")
        pruefe(r["fehlgeschlagen"] == 0, f"{r['bestanden']} Browser-Tests bestanden, {r['fehlgeschlagen']} fehlgeschlagen")
        k.close()

        layout_pruefungen(browser, entwicklung, konsolenfehler)
        csp_und_karte(browser, entwicklung, konsolenfehler)

        print("\n[Einrichtung] App online laden, bis der Service Worker aktiv ist")
        kontexte = {}
        erwartet = len(re.findall(r'"\./[^"]*"', re.search(r"APP_DATEIEN = \[(.*?)\];", (WURZEL / "sw.js").read_text(encoding="utf-8"), re.S).group(1)))
        for name, basis in (("produktion", produktion), ("entwicklung", entwicklung), ("betrieb", produktion), ("aufzeichnung", entwicklung)):
            kontext = browser.new_context(accept_downloads=True, bypass_csp=True,  # CSP der App verbietet eval, Playwright braucht es
                                          geolocation={"latitude": 48.1009, "longitude": 15.1012}, permissions=["geolocation"])
            seite = kontext.new_page()
            konsolenfehler_sammeln(seite, konsolenfehler, name)
            seite.goto(basis)
            warte_auf_app(seite)
            warte_auf_service_worker(seite)
            anzahl = seite.evaluate("caches.keys().then(n => caches.open(n[0])).then(c => c.keys()).then(k => k.length)")
            pruefe(anzahl == erwartet, f"[{name}] Service Worker aktiv, {anzahl} von {erwartet} Dateien im Offline-Cache")
            seite.close()
            kontexte[name] = (kontext, basis)

        print("\n[Netz aus] Webserver wird beendet, Browser offline geschaltet")
        server.shutdown()
        server.server_close()
        for kontext, _ in kontexte.values():
            kontext.set_offline(True)

        for name in ("produktion", "entwicklung"):
            kontext, basis = kontexte[name]
            offline_pruefungen(kontext, basis, name, konsolenfehler, export_ziel)
        betrieb_szenario(*kontexte["betrieb"], konsolenfehler)
        aufzeichnung_szenario(*kontexte["aufzeichnung"], konsolenfehler)

        print("\n[Gegenprobe] Browser ohne Service Worker, offline")
        k = browser.new_context(service_workers="block", bypass_csp=True)
        k.set_offline(True)
        try:
            k.new_page().goto(produktion, timeout=5000)
            pruefe(False, "Ohne Service Worker hätte das Laden scheitern müssen")
        except PlaywrightError:
            pruefe(True, "Ohne Service Worker scheitert das Laden – der Offline-Betrieb kommt also wirklich vom Service Worker")
        browser.close()

    # Fehlgeschlagene Netzanfragen offline sind erwartbar; echte Skriptfehler nicht
    echte = [f for f in konsolenfehler if "net::ERR" not in f and "Failed to fetch" not in f]
    pruefe(not echte, "Keine JavaScript-Fehler in der Konsole" + (f": {echte[:3]}" if echte else ""))

    ok = all(e for e, _ in ergebnisse)
    print(f"\n{'✓ ALLES GRÜN' if ok else '✗ FEHLER'} – {sum(e for e, _ in ergebnisse)}/{len(ergebnisse)} Prüfungen bestanden")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
