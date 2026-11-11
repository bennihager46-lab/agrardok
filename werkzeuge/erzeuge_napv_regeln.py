#!/usr/bin/env python3
"""Erzeugt rules/napv/duengung.json aus den Tabellen der NAPV (RIS, BGBl. II Nr. 495/2022 idF BGBl. II Nr. 198/2024).

Die Werte sind von Hand aus der amtlichen RIS-Fassung (OGD-Schnittstelle, abgerufen 11.11.2026) übertragen:
  § 1 Z 8, 9, 14   NOR40263399 (in Kraft seit 11.07.2024)
  § 2              NOR40265802 (in Kraft seit 01.01.2025)
  §§ 3, 4, 5       NOR40249605–07 (seit 01.01.2023)
  § 7              NOR40263401 (seit 11.07.2024)
  Anlage 2         NOR40249616 (seit 01.01.2023)
  Anlage 3         NOR40263402 (seit 11.07.2024)
  Anlage 4         NOR40249618 (seit 01.01.2023)
Aufruf: python3 werkzeuge/erzeuge_napv_regeln.py
"""
import json
from pathlib import Path

RIS = "https://www.ris.bka.gv.at/Dokumente/Bundesnormen/{}/{}.html"
def q(nr, text): return {"text": text, "url": RIS.format(nr, nr)}

STUFEN = ["niedrig", "mittel", "hoch_1", "hoch_2", "hoch_3"]
def zeile(id_, name, gruppe, ertraege, n1, n2, einheit="t/ha", hinweis=None, kategorien=None, mfa=None):
    """ertraege: Text der Ertragsspalten; n1 = Tabelle 1, n2 = Tabelle 2 (Anlage-5-Gebiete). None = Stufe gibt es nicht."""
    z = {"id": id_, "name": name, "gruppe": gruppe, "ertrag_einheit": einheit, "stufen": {}}
    for s, e, a, b in zip(STUFEN, ertraege, n1, n2):
        if a is None: continue
        z["stufen"][s] = {"ertrag": e, "n": a, "n_anlage5": b}
    if hinweis: z["hinweis"] = hinweis
    if mfa: z["mfa_codes"] = mfa
    return z

acker = [
 zeile("weizen_rp_ab14", "Weizen ≥ 14 % Rohprotein (Qualitätsweizen)", "Getreide", ["bis 4", "4–5,5", "5,5–6,75", "6,75–8", "über 8"], [105,145,170,180,195], [95,130,150,160,175]),
 zeile("weizen_rp_unter14", "Weizen < 14 % Rohprotein", "Getreide", ["bis 5", "5–6", "6–7,5", "7,5–9", "über 9"], [105,145,170,180,195], [95,130,150,160,175], mfa=["138"]),
 zeile("durum", "Durum-Weizen", "Getreide", ["bis 4", "4–5,25", "5,25–6,5", "6,5–7,75", "über 7,75"], [105,145,170,180,195], [95,130,150,160,175], mfa=["165","166"]),
 zeile("roggen", "Roggen", "Getreide", ["bis 4", "4–5,5", "5,5–7", "7–8,5", "über 8,5"], [80,110,130,140,150], [70,95,110,120,130], mfa=["142"]),
 zeile("dinkel", "Dinkel (mit Spelzen)", "Getreide", ["bis 3,5", "3,5–5,5", "5,5–6,5", "6,5–7,5", "über 7,5"], [80,110,130,140,150], [70,95,110,120,130], mfa=["145"]),
 zeile("winterfuttergerste", "Winterfuttergerste", "Getreide", ["bis 5", "5–6", "6–7,5", "7,5–9", "über 9"], [95,130,155,170,180], [80,110,135,145,155], mfa=["110"]),
 zeile("winterbraugerste", "Winterbraugerste", "Getreide", ["bis 4,5", "4,5–5,5", "5,5–7", "7–8,5", "über 8,5"], [70,100,115,125,135], [60,85,100,105,115]),
 zeile("triticale", "Triticale", "Getreide", ["bis 5", "5–6", "6–7,5", "7,5–9", "über 9"], [90,120,145,155,165], [80,105,125,135,140], mfa=["116","157"]),
 zeile("sommerfuttergerste", "Sommerfuttergerste", "Getreide", ["bis 4", "4–5,5", "5,5–7", "7–8,5", "über 8,5"], [80,110,130,140,150], [70,95,110,120,130], mfa=["111","181"]),
 zeile("sommerbraugerste", "Sommerbraugerste", "Getreide", ["bis 3,5", "3,5–5", "5–6,5", "6,5–8", "über 8"], [65,80,95,105,110], [55,70,80,90,95]),
 zeile("hafer", "Hafer", "Getreide", ["bis 3,5", "3,5–5", "5–6,5", "6,5–8", "über 8"], [70,100,115,125,135], [60,85,100,105,115], mfa=["112","155"]),
 zeile("koernermais", "Körnermais (inkl. CCM)", "Hackfrüchte", ["bis 8,5", "8,5–10,5", "10,5–12", "12–13,5", "über 13,5"], [110,155,180,195,210], [100,140,160,175,190], mfa=["105","106","173"]),
 zeile("silomais", "Silomais (Frischmasse)", "Hackfrüchte", ["bis 40", "40–50", "50–57,5", "57,5–65", "über 65"], [130,175,210,225,240], [120,160,190,205,220], mfa=["109"]),
 zeile("zuckerruebe", "Zuckerrübe", "Hackfrüchte", ["bis 55", "55–75", "75–85", "85–95", "über 95"], [110,155,180,195,210], [95,130,155,165,180], mfa=["651"]),
 zeile("futterruebe", "Futterrübe", "Hackfrüchte", ["bis 60", "60–100", "über 100", None, None], [110,155,180,None,None], [95,130,155,None,None]),
 zeile("kartoffel", "Speise-/Industriekartoffel", "Hackfrüchte", ["bis 33", "33–45", "45–55", "55–65", "über 65"], [120,165,195,210,225], [105,140,165,180,190], mfa=["524","525","526"]),
 zeile("fruehkartoffel", "Früh-, Pflanzkartoffel", "Hackfrüchte", ["bis 15", "15–20", "über 20", None, None], [90,120,145,None,None], [75,100,125,None,None], mfa=["513","520","527"]),
 zeile("koernerhirse", "Körnerhirse/-sorghum", "Hackfrüchte", ["bis 6,5", "6,5–8", "8–9,5", "9,5–10,5", "über 10,5"], [110,155,180,195,210], [95,130,155,165,180], mfa=["118"]),
 zeile("silohirse", "Silohirse/-sorghum (Frischmasse)", "Hackfrüchte", ["bis 55", "55–68", "68–77", "77–86", "über 86"], [130,175,210,225,240], [110,150,180,190,205]),
 {"id": "leguminosen", "name": "Soja, Erbse, Bohne", "gruppe": "Öl- und Eiweißpflanzen", "ertrag_einheit": "t/ha",
  "stufen": {"mittel": {"ertrag": "–", "n": 0, "n_anlage5": 0}},
  "ausnahme": {"n": 60, "n_anlage5": 50, "text": "bei nicht beimpftem Saatgut, mangelhaftem Knöllchenbesatz oder erstmaligem Anbau"},
  "mfa_codes": ["211","213","214","308"]},
 zeile("raps", "Körnerraps", "Öl- und Eiweißpflanzen", ["bis 3", "3–3,5", "3,5–4,25", "4,25–5", "über 5"], [110,155,180,195,210], [100,140,160,175,190], mfa=["301"]),
 zeile("sonnenblume", "Sonnenblume", "Öl- und Eiweißpflanzen", ["bis 2", "2–3", "3–4", "4–5", "über 5"], [50,65,80,85,90], [40,55,70,75,80], mfa=["307"]),
 zeile("oelkuerbis", "Ölkürbis", "Öl- und Eiweißpflanzen", ["bis 0,6", "0,6–0,8", "über 0,8", None, None], [65,90,105,None,None], [55,75,90,None,None], mfa=["751"]),
 {"id": "zwischenfrucht_mit_leguminosen", "name": "Zwischenfrucht(futter)bau mit Leguminosen", "gruppe": "Zwischenfruchtanbau", "ertrag_einheit": "–",
  "stufen": {"mittel": {"ertrag": "–", "n": 40, "n_anlage5": 30}}, "hinweis": "Stickstoffgaben auf nicht genutzte Zwischenfrüchte sind in voller Höhe der Folgekultur anzurechnen."},
 {"id": "zwischenfrucht_ohne_leguminosen", "name": "Zwischenfrucht(futter)bau ohne Leguminosen", "gruppe": "Zwischenfruchtanbau", "ertrag_einheit": "–",
  "stufen": {"mittel": {"ertrag": "–", "n": 80, "n_anlage5": 70}}, "hinweis": "Stickstoffgaben auf nicht genutzte Zwischenfrüchte sind in voller Höhe der Folgekultur anzurechnen."},
 {"id": "stilllegung", "name": "Stilllegungen/Grünbrachen", "gruppe": "Sonstige", "ertrag_einheit": "–", "stufen": {"mittel": {"ertrag": "–", "n": 0, "n_anlage5": 0}}},
]

def gl(id_, name, gruppe, stufen, mfa=None, gunst=None):
    z = {"id": id_, "name": name, "gruppe": gruppe, "ertrag_einheit": "t TM/ha", "stufen": {k: {"ertrag": e, "n": n} for k, (e, n) in stufen.items()}}
    if gunst: z["gunstlage_n"] = gunst
    if mfa: z["mfa_codes"] = mfa
    return z

gruenland = [
 gl("wiese_1", "Dauer-/Wechselwiese, 1 Schnitt", "Dauer- und Wechselwiesen", {"niedrig": ("bis 2,5", 20), "mittel": ("ab 2,5", 30)}),
 gl("wiese_2", "Dauer-/Wechselwiese, 2 Schnitte", "Dauer- und Wechselwiesen", {"niedrig": ("bis 4", 60), "mittel": ("ab 4", 90)}),
 gl("wiese_3_klee", "3 Schnitte, kleereich", "Dauer- und Wechselwiesen", {"niedrig": ("bis 6", 80), "mittel": ("6–8", 100), "hoch": ("ab 8", 120)}),
 gl("wiese_3_gras", "3 Schnitte, gräserbetont", "Dauer- und Wechselwiesen", {"mittel": ("6–8", 120), "hoch": ("ab 8", 150)}),
 gl("wiese_4_klee", "4 Schnitte, kleereich", "Dauer- und Wechselwiesen", {"mittel": ("bis 9,5", 120), "hoch": ("ab 9,5", 150)}),
 gl("wiese_4_gras", "4 Schnitte, gräserbetont", "Dauer- und Wechselwiesen", {"mittel": ("bis 9,5", 160), "hoch": ("ab 9,5", 200)}),
 gl("wiese_5_gras", "5 Schnitte, gräserbetont", "Dauer- und Wechselwiesen", {"mittel": ("bis 11", 200), "hoch": ("ab 11", 210)}, gunst=240),
 gl("wiese_6_gras", "6 Schnitte, gräserbetont", "Dauer- und Wechselwiesen", {"hoch": ("ab 12,5", 210)}, gunst=270),
 gl("maehweide_1", "Mähweide: 1 Schnitt + 1–2 Weidegänge", "Mähweiden", {"niedrig": ("bis 5,5", 60), "mittel": ("ab 5,5", 90)}),
 gl("maehweide_2_1", "Mähweide: 2 Schnitte + 1 Weidegang", "Mähweiden", {"mittel": ("bis 8", 110), "hoch": ("ab 8", 140)}),
 gl("maehweide_2_2", "Mähweide: 2 Schnitte + 2 oder mehr Weidegänge", "Mähweiden", {"mittel": ("bis 9", 120), "hoch": ("ab 9", 170)}),
 gl("dauerweide", "Dauerweide, Kulturweide", "Weiden", {"niedrig": ("bis 6,5", 80), "mittel": ("6,5–9,5", 130), "hoch": ("über 9,5", 180)}),
 gl("hutweide", "Hutweide/Almfutterfläche (zusätzlich zur Weide)", "Weiden", {"niedrig": ("bis 2", 20), "mittel": ("ab 2", 30)}),
 gl("ackerfutter_klee", "Ackerfutter kleebetont (> 40 Flächen-%)", "Ackerfutter", {"mittel": ("–", 40)}, mfa=["633","635"]),
 gl("ackerfutter_gras", "Ackerfutter gräserbetont", "Ackerfutter", {"niedrig": ("bis 7", 100), "mittel": ("7–10,5", 180), "hoch": ("über 10,5", 210)}, mfa=["634","636","679"], gunst=250),
 gl("ackerfutter_graeserrein", "Gräserreinbestände", "Ackerfutter", {"mittel": ("8–12", 200), "hoch": ("über 12", 210)}, mfa=["637"], gunst=280),
]

vorfrucht = [
 ("keine", "Keine Vorfruchtwirkung (z. B. Getreide, Mais)", 0),
 ("ruebenblatt", "Ernterückstände: Rübenblatt", 0), ("rapsstroh", "Ernterückstände: Rapsstroh", 0), ("oelkuerbis", "Ernterückstände: Ölkürbis", 10),
 ("ackerbohne", "Vorfrucht Ackerbohne", 20), ("koernererbse", "Vorfrucht Körnererbse", 20), ("sojabohne", "Vorfrucht Sojabohne", 0),
 ("zf_genutzt_leg60", "Genutzte Zwischenfrucht > 60 % Leguminosen", 10),
 ("fl1_leg10_60", "Futterleguminosen einjährig, 10–60 % Leguminosen (Wechselwiese)", 0),
 ("fl1_leg60", "Futterleguminosen einjährig, > 60 % Leguminosen (Klee/Kleegras)", 20),
 ("flm_leg10_60", "Futterleguminosen mehrjährig, 10–60 % Leguminosen (Wechselwiese)", 30),
 ("flm_leg60", "Futterleguminosen mehrjährig, > 60 % Leguminosen (Klee/Kleegras)", 40),
 ("luzerne_futter_unter6", "Luzerne (Futternutzung), < 6 t TM/ha", 20), ("luzerne_futter_ueber6", "Luzerne (Futternutzung), > 6 t TM/ha", 40),
 ("zf_ungenutzt_leg60", "Ungenutzte Zwischenfrucht > 60 % Leguminosen", 20),
 ("gb1_leg10", "Ungenutzte Grünbrache einjährig, < 10 % Leguminosen", 0), ("gb1_leg10_60", "Ungenutzte Grünbrache einjährig, 10–60 % Leguminosen", 20),
 ("gb1_leg60", "Ungenutzte Grünbrache einjährig, > 60 % Leguminosen", 40),
 ("gbm_leg10", "Ungenutzte Grünbrache mehrjährig, < 10 % Leguminosen", 0), ("gbm_leg10_60", "Ungenutzte Grünbrache mehrjährig, 10–60 % Leguminosen", 30),
 ("gbm_leg60", "Ungenutzte Grünbrache mehrjährig, > 60 % Leguminosen", 60),
 ("luzerne_brache_unter6", "Luzerne als Grünbrache, < 6 t TM/ha", 60), ("luzerne_brache_ueber6", "Luzerne als Grünbrache, > 6 t TM/ha", 110),
]

weizen_rp = {"11.0":[17.0,16.8,16.6,16.4,16.2],"11.5":[17.8,17.6,17.4,17.1,16.9],"12.0":[18.5,18.3,18.1,17.9,17.7],"12.5":[19.3,19.1,18.9,18.6,18.4],
 "13.0":[20.1,19.8,19.6,19.4,19.2],"13.5":[20.8,20.6,20.4,20.1,19.9],"14.0":[21.6,21.4,21.1,20.9,20.6],"14.5":[22.4,22.1,21.9,21.6,21.4],
 "15.0":[23.2,22.9,22.6,22.4,22.1],"15.5":[23.9,23.7,23.4,23.1,22.8],"16.0":[24.7,24.4,24.1,23.9,23.6],"16.5":[25.5,25.2,24.9,24.6,24.3],
 "17.0":[26.2,25.9,25.6,25.4,25.1],"17.5":[27.0,26.7,26.4,26.1,25.8],"18.0":[27.8,27.5,27.2,26.8,26.5],"18.5":[28.6,28.2,27.9,27.6,27.3],
 "19.0":[29.3,29.0,28.7,28.3,28.0],"19.5":[30.1,29.8,29.4,29.1,28.7],"20.0":[30.9,30.5,30.2,29.8,29.5],"20.5":[31.6,31.3,30.9,30.6,30.2],
 "21.0":[32.4,32.1,31.7,31.3,30.9],"21.5":[33.2,32.8,32.4,32.1,31.7],"22.0":[34.0,33.6,33.2,32.8,32.4]}
braugerste_rp = {"9.0":[12.7,12.5,12.4,12.2,12.1],"9.5":[13.4,13.2,13.3,13.3,13.4],"10.0":[14.1,13.9,13.9,13.9,13.9],"10.5":[14.8,14.6,14.5,14.5,14.5],
 "11.0":[15.5,15.3,15.1,15.1,15.1],"11.5":[16.2,16.0,15.6,15.6,15.6],"12.0":[16.9,16.7,16.2,16.2,16.2],"12.5":[17.6,17.4,16.8,16.8,16.8],
 "13.0":[18.3,18.1,17.3,17.3,17.3],"13.5":[19.0,18.8,17.9,17.9,17.9],"14.0":[19.7,19.5,18.4,18.4,18.4],"14.5":[20.4,20.2,18.9,18.9,18.9],
 "15.0":[21.1,20.9,19.5,19.5,19.5],"15.5":[21.8,21.6,20.0,20.0,20.0],"16.0":[22.5,22.3,20.5,20.5,20.5]}

regel = {
 "name": "napv/duengung",
 "titel": "NAPV – Sperrfristen, Ausbringung, Obergrenzen, jahreswirksamer Stickstoff, Entzug",
 "quelle": "https://www.ris.bka.gv.at/GeltendeFassung.wxe?Abfrage=Bundesnormen&Gesetzesnummer=20012132",
 "quelle_weitere": ["https://data.bka.gv.at/ris/api/v2.6/Bundesrecht?Applikation=BrKons&Titel=Nitrat-Aktionsprogramm", "docs/rechtsgrundlagen.md#1-nitrat-aktionsprogramm-verordnung-napv"],
 "gueltig_ab": "2025-01-01",
 "gueltig_bis": None,
 "stand": "2026-11-11",
 "status": "geprueft",
 "hinweise": [
  "Aus der amtlichen RIS-Fassung (BGBl. II Nr. 495/2022 idF BGBl. II Nr. 198/2024, zuletzt aktualisiert 16.10.2024) von Hand übertragen; Erzeuger: werkzeuge/erzeuge_napv_regeln.py.",
  "gueltig_ab = Inkrafttreten der jüngsten berücksichtigten Fassung (§ 2 seit 01.01.2025). Die Tabellen der Anlage 3 gelten seit 11.07.2024.",
  "Nicht übernommen: Wein (Anlage 3 Tabelle 1 Zeilen „Triebwachstum“), Gemüse (Tabelle 3, Abschnitt II), Sämereienvermehrung; Anlage 5 (Gemeindeliste) – der Betrieb gibt selbst an, ob er im Gebiet liegt.",
  "Die Bestätigung des Bodenzustands (§ 4) fragt die App von 1. November bis 31. März ab – das ist eine Vereinfachung der App; das Verbot gilt ganzjährig.",
  "Hinweis, keine Rechtsauskunft. Strengere Vorgaben in Schutz- und Schongebieten (§§ 34, 35 WRG) und im ÖPUL bleiben unberührt."
 ],
 "werte": {
  "quellen": {
   "s1_z8": q("NOR40263399", "§ 1 Z 8 NAPV"), "s1_z14": q("NOR40263399", "§ 1 Z 14 NAPV"),
   "s2": q("NOR40265802", "§ 2 NAPV"), "s3": q("NOR40249605", "§ 3 NAPV"), "s4": q("NOR40249606", "§ 4 NAPV"),
   "s5": q("NOR40249607", "§ 5 NAPV"), "s7": q("NOR40263401", "§ 7 NAPV"), "s8": q("NOR40249610", "§ 8 NAPV"), "s9": q("NOR40249611", "§ 9 NAPV"),
   "anl2": q("NOR40249616", "Anlage 2 NAPV"), "anl3": q("NOR40263402", "Anlage 3 NAPV"), "anl4": q("NOR40249618", "Anlage 4 NAPV")
  },
  "duengerarten": {
   "$comment": "§ 1 Z 8/9 (Löslichkeit), § 1 Z 14 (Ausbringungsverlust, Faktor der Jahreswirksamkeit), Anlage 2 (Ammoniumanteil in % des N)",
   "mineralisch": {"name": "Mineralischer N-Dünger", "loeslich": "leichtloeslich", "ausbringungsverlust": 0, "jahreswirksamkeit": 1.0, "nh4_anteil": 1.0, "fluessig_wd": False},
   "rinderguelle": {"name": "Rindergülle", "loeslich": "leichtloeslich", "ausbringungsverlust": 0.13, "jahreswirksamkeit": 0.70, "nh4_anteil": 0.50, "fluessig_wd": True},
   "schweineguelle": {"name": "Schweinegülle", "loeslich": "leichtloeslich", "ausbringungsverlust": 0.13, "jahreswirksamkeit": 0.80, "nh4_anteil": 0.65, "fluessig_wd": True},
   "huehnerguelle": {"name": "Hühnergülle (Legehühnergülle)", "loeslich": "leichtloeslich", "ausbringungsverlust": 0.13, "jahreswirksamkeit": 0.85, "nh4_anteil": 0.60, "fluessig_wd": True},
   "jauche": {"name": "Jauche (Rinderjauche)", "loeslich": "leichtloeslich", "ausbringungsverlust": 0.13, "jahreswirksamkeit": 1.0, "nh4_anteil": 0.90, "fluessig_wd": True},
   "biogasguelle_rind": {"name": "Biogasgülle/Gärrest, überwiegend Rind", "loeslich": "leichtloeslich", "ausbringungsverlust": 0.13, "jahreswirksamkeit": 0.70, "nh4_anteil": 0.50, "fluessig_wd": True},
   "biogasguelle_schwein": {"name": "Biogasgülle/Gärrest, überwiegend Schwein", "loeslich": "leichtloeslich", "ausbringungsverlust": 0.13, "jahreswirksamkeit": 0.80, "nh4_anteil": 0.65, "fluessig_wd": True},
   "stallmist": {"name": "Stallmist", "loeslich": "langsamloeslich", "ausbringungsverlust": 0.09, "jahreswirksamkeit": 0.50, "nh4_anteil": 0.15, "fluessig_wd": False},
   "rottemist": {"name": "Rottemist", "loeslich": "langsamloeslich", "ausbringungsverlust": 0.09, "jahreswirksamkeit": 0.30, "nh4_anteil": 0.05, "fluessig_wd": False},
   "kompost": {"name": "Kompost / Stallmistkompost", "loeslich": "langsamloeslich", "ausbringungsverlust": 0.09, "jahreswirksamkeit": 0.10, "nh4_anteil": 0.01, "fluessig_wd": False},
   "huehnertrockenkot": {"name": "Legehühnertrockenkot, Putenmist", "loeslich": "langsamloeslich", "ausbringungsverlust": 0.09, "jahreswirksamkeit": None, "nh4_anteil": 0.15, "fluessig_wd": False,
     "hinweis": "Für Trockenkot nennt § 1 Z 14 keinen Faktor der Jahreswirksamkeit – Wert aus der Fachliteratur selbst eintragen."}
  },
  "sperrfristen": {
   "$comment": "§ 2. Monat-Tag, jeweils einschließlich. „bis“ liegt im Folgejahr.",
   "acker_leichtloeslich": {"von": "10-16", "bis": "02-15", "ausnahme_bis": "10-31", "ab_ernte_letzte_hauptfrucht": True,
     "ausnahme_text": "Bis 31. Oktober zulässig auf Raps, Gerste oder Zwischenfrüchten (Anbau bis 15. Oktober) sowie auf Gemüse, Blühkulturen und Erdbeeren mit Anbau bis 31. August – höchstens 60 kg N/ha (§ 7 Abs. 3 Z 1)."},
   "acker_langsamloeslich": {"von": "11-30", "bis": "02-15"},
   "fruehe_kulturen_ab": "02-01",
   "fruehe_kulturen_text": "Durum-Weizen, Raps, Gerste sowie Kulturen unter Vlies oder Folie: ab 1. Februar wieder zulässig.",
   "fruehe_kulturen_napv": ["durum", "raps", "winterfuttergerste", "winterbraugerste", "sommerfuttergerste", "sommerbraugerste"],
   "gruenland_alle": {"von": "11-30", "bis": "02-15"},
   "sonstige_leichtloeslich": {"von": "10-15", "bis": "02-15"},
   "sonstige_langsamloeslich": {"von": "11-30", "bis": "02-15"}
  },
  "begrenzung_60": {"kg_n_ha": 60, "gruenland_von": "10-01", "gruenland_bis": "11-29", "acker_bis": "10-31",
    "text": "Leichtlösliche N-Dünger höchstens 60 kg N/ha (nach Stall- und Lagerverlusten): auf Acker nach der Ernte der letzten Hauptfrucht bis 31. Oktober, auf Grünland/Ackerfutter vom 1. Oktober bis 29. November, nach der Sperrfrist auf aufgetauten Böden."},
  "gabenteilung_ab_kg_leichtloeslich": 100,
  "hang": {"neigung_prozent": 10, "bereich_m": 20, "max_vor_anbau_kg_n": 100, "teilgaben_ab_kg_n": 100,
    "erosion_kulturen": ["Ackerbohne", "Kartoffel", "Mais", "Kürbis", "Rübe", "Sojabohne", "Sonnenblume", "Sorghum"],
    "ausnahme": "Gilt nicht für Schläge unter 1 ha in Berggebieten im alpinen Raum (§ 3 Abs. 7)."},
  "gewaesser": {"streifen_bewachsen_m": 3, "stehend_m": 20, "stehend_reduziert_m": 10, "fliessend_m": 10, "fliessend_flach_m": 3, "fliessend_steil_m": 5, "neigung_grenze_prozent": 10},
  "einarbeitung_stunden": {"moeglichst": 4, "spaetestens": 12},
  "wirtschaftsduenger_obergrenze_kg_n_ha": 170,
  "bodenzustand_abfrage": {"von": "11-01", "bis": "03-31"},
  "obergrenzen_acker": acker,
  "obergrenzen_gruenland": gruenland,
  "obergrenzen_hinweis": "Für nicht aufgelistete Kulturen sind die Werte aus der Fachliteratur abzuleiten; in Gebieten nach Anlage 5 um 10 % (Weizen, Mais, Raps) bzw. 15 % (andere) zu verringern. Ertragslage „hoch“ ist bei einer Ackerzahl unter 30 nicht zulässig.",
  "vorfruchtwirkung": [{"id": i, "name": n, "kg_n_ha": v} for i, n, v in vorfrucht],
  "bewaesserung": {"formel": "N [kg/ha] = NO3 [mg/l] / 4,43 × Menge [mm] / 100", "abzug_ab_kg_n_ha": 10},
  "entzug_kg_n_je_t": {
   "durum": 23, "dinkel": 24, "roggen": 16, "winterfuttergerste": 18, "triticale": 18, "sommerfuttergerste": 18, "hafer": 16,
   "koernermais": {"niedrig": 13, "mittel": 12.5, "hoch_1": 12.5, "hoch_2": 12, "hoch_3": 11.5, "hoch_3_ueber_15t": 11},
   "silomais": 4, "silomais_tm": 10, "zuckerruebe": 1.8, "futterruebe": 1.4, "kartoffel": 3.5, "fruehkartoffel": 5,
   "raps": 33, "sonnenblume": 26, "koernererbse": 32, "ackerbohne": 42, "sojabohne": 55, "mohn": 100, "kuemmel": 53
  },
  "entzug_weizen_braugerste": {"$comment": "Anlage 3 Abschnitt V Tabelle 2: kg N je t bei Rohprotein (% TM) und Kornfeuchte 12/13/14/15/16 %",
   "feuchte": [12, 13, 14, 15, 16], "weizen": weizen_rp, "braugerste": braugerste_rp},
  "anfall_kg_n_je_platz": {"$comment": "Anlage 4 (Auszug): N-Anfall nach Abzug der Stall- und Lagerverluste in kg je Platz und Jahr, Spalten Gülle / Mist / Jauche / Tiefstallmist",
   "milchkuh_6000": [82.8, 45.1, 22.5, 67.6], "milchkuh_7000": [89.7, 49.3, 24.6, 73.9], "milchkuh_8000": [97.3, 53.5, 26.7, 80.2],
   "kalbin": [58.9, 24.3, 24.2, 48.5], "jungvieh_0_5": [12.7, 5.2, 5.2, 10.4], "jungvieh_05_1": [34.4, 14.2, 14.2, 28.4], "jungvieh_1_2": [45.6, 18.8, 18.7, 37.5],
   "mastschwein": [7.5, 4.6, 2.3, 7.0], "zuchtschwein": [14.4, 8.9, 4.5, 13.4], "legehenne": [0.51, None, None, 0.43]}
 }
}
ziel = Path(__file__).resolve().parent.parent / "rules" / "napv" / "duengung.json"
ziel.write_text(json.dumps(regel, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
print(f"geschrieben: {ziel} ({len(acker)} Acker-, {len(gruenland)} Grünlandzeilen)")
