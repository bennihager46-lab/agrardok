#!/usr/bin/env python3
"""Erzeugt die fiktiven Testdaten unter testdaten/ (nur Standardbibliothek).

  testdaten/musterbetrieb.json – „Musterhof Lindenau“: konventionell, NÖ, 18,2 ha, Rinder und
                                  Mastschweine, 12 Maßnahmen; ein Sachkundeausweis läuft bald ab.
  testdaten/biohof.json        – „Biohof Sonnleiten“: Bio, Tirol, nur Betrieb und Personen;
                                  ein abgelaufener Sachkundeausweis, eine ehemalige Person.
  testdaten/eama-export-beispiel.zip   – nachgebauter eAMA-GIS-Export (Shapefile, EPSG:31287,
                                  Windows-1252, Spaltennamen wie INVEKOS, auf 10 Zeichen gekürzt).
  testdaten/flaechen-beispiel.geojson  – dieselben Schläge als GeoJSON (WGS84).

Alle Namen, Nummern, Mittel und Koordinaten sind erfunden. Lesbare IDs: Präfix je Entität.
Aufruf: python3 werkzeuge/erzeuge_testdaten.py
Danach prüfen: python3 werkzeuge/pruefe_daten.py testdaten/*.json
"""
import io
import json
import math
import struct
import zipfile
from pathlib import Path

ZIEL = Path(__file__).resolve().parent.parent / "testdaten"
SCHEMA_VERSION = "0.5"


def i(p, n): return f"{p:02d}000000-0000-4000-8000-{n:012d}"
B=i(1,1); G="0a000000-0000-4000-8000-000000000001"; ANNA=i(2,1); JOSEF=i(2,2); TA=i(2,3)
def meta(id_, ts="2026-01-05T08:00:00+01:00", rev=1, betrieb=True, hlc=None, von=ANNA):
    m={"id":id_}
    if betrieb: m["betrieb_id"]=B
    m.update({"erstellt_am":ts,"erstellt_von":von,"geaendert_am":ts,"geaendert_von":von,"geraet_id":G,"rev":rev})
    if hlc: m["hlc"]=hlc
    return m
def rect(lon,lat,dlon,dlat): return {"type":"Polygon","coordinates":[[[lon,lat],[round(lon+dlon,5),lat],[round(lon+dlon,5),round(lat+dlat,5)],[lon,round(lat+dlat,5)],[lon,lat]]]}

betrieb={**meta(B),"name":"Musterhof Lindenau (fiktiv)","betriebsnummer":"9999999","vis_registriernummer":"AT-FIKTIV-0001",
 "adresse":{"strasse":"Lindenweg 1","plz":"9999","ort":"Musterdorf","land":"AT"},"bundesland":"NOE",
 "bewirtschafter":{"name":"Anna und Josef Muster","rechtsform":"ehegemeinschaft","person_id":ANNA},
 "bewirtschaftung":"konventionell",
 "napv_gebiet_anlage5":False,"oepul_massnahmen":["ubb","begruenung_system_immergruen","bodennahe_ausbringung","tierwohl_weide"],
 "notiz":"Fiktiver Testbetrieb: 18,2 ha LN, davon 37 % Grünland/Ackerfutter → NAPV-aufzeichnungspflichtig (> 15 ha, < 90 %)."}
personen=[
 {**meta(ANNA),"name":"Anna Muster","rolle":"betriebsleitung","telefon":"+43 000 0000000","email":"anna@musterhof.example",
  "psm_ausbildungsbescheinigung":{"nummer":"NOE-FIKTIV-123","bundesland":"NOE","gueltig_bis":"2029-12-31"},"aktiv":True},
 {**meta(JOSEF),"name":"Josef Muster","rolle":"familie","aktiv":True,
  "psm_ausbildungsbescheinigung":{"nummer":"NOE-FIKTIV-456","bundesland":"NOE","gueltig_bis":"2026-12-15"},
  "notiz":"Sachkundeausweis läuft bald ab (Testfall Warnung; Stand Nov. 2026)."},
 {**meta(TA),"name":"Dr. Eva Beispiel (Tierärztin, fiktiv)","rolle":"tierarzt","telefon":"+43 000 0000001","aktiv":True}]
BODEN = {
 "Hausacker": {"bodenart": "lehm", "bodenschwere": "mittel", "hangneigung_prozent": 3, "grenzt_an_gewaesser": False, "gewaesser_abstand_m": 250},
 "Leiten": {"bodenart": "sandiger_lehm", "bodenschwere": "leicht", "hangneigung_prozent": 12, "grenzt_an_gewaesser": False, "gewaesser_abstand_m": 80},
 "Großfeld": {"bodenart": "toniger_lehm", "bodenschwere": "schwer", "hangneigung_prozent": 2},
 "Bachwiese": {"bodenart": "schluffiger_lehm", "bodenschwere": "mittel", "hangneigung_prozent": 1, "grenzt_an_gewaesser": True, "gewaesser_abstand_m": 0},
}
fs=[("Hausacker",1,"acker",4.20,rect(15.1,48.1,0.00283,0.0018)),("Leiten",2,"acker",3.10,None),("Großfeld",3,"acker",8.40,rect(15.105,48.1,0.00377,0.0027)),("Bachwiese",4,"gruenland",2.50,None)]
feldstuecke=[]
for n,(name,nr,art,ha,geo) in enumerate(fs,1):
    d={**meta(i(3,n)),"nummer":nr,"name":name,"nutzungsart":art,"flaeche_ha":ha,"katastralgemeinde":"Musterdorf","gueltig_ab_jahr":2020, **BODEN[name]}
    if geo: d["geometrie"]=geo
    feldstuecke.append(d)
# Kulturen aus dem mitgelieferten Katalog (feste IDs, siehe rules/kulturen.json)
KATALOG = {k.get("mfa_code", k["id"]): k for k in json.loads((ZIEL.parent / "rules" / "kulturen.json").read_text(encoding="utf-8"))["werte"]}
def katalog(schluessel): return {**meta(KATALOG[schluessel]["id"], betrieb=False), **KATALOG[schluessel]}
_ww, _mais, _kg, _dw, _zf = (katalog(s) for s in ("138", "105", "634", "716", "05000000-0000-4000-8000-100000000001"))
kulturen = [_ww, _mais, _kg, _dw, _zf]
WW, MAIS, KG, DW, ZF = (k["id"] for k in kulturen)
sk=[(1,KG,"Hausacker 1",4.20,None,"mittel"),(2,MAIS,"Leiten 1",3.10,WW,"hoch_1"),(3,WW,"Großfeld 1",8.40,MAIS,"mittel"),(4,DW,"Bachwiese 1",2.50,None,None)]
_kname = {k["id"]: k["name"] for k in kulturen}
schlaege=[{**meta(i(4,n)),"feldstueck_id":i(3,n),"jahr":2026,"nummer":1,"name":name,"flaeche_ha":ha,"kultur_id":k,"invekos_flaeche_id":f"FIKTIV-2026-{n:04d}",
           **({"vorfrucht_kultur_id":vf,"vorfrucht_name":_kname[vf]} if vf else {}), **({"ertragslage":el} if el else {})} for n,k,name,ha,vf,el in sk]
BERTA,LIESL,KALB,SCHW=(i(6,k) for k in range(1,5))
tiere=[
 {**meta(BERTA,rev=2,ts="2026-01-05T08:00:00+01:00",hlc="2026-02-01T06:30:00.000Z-0000-0a000000"),"erfassung":"einzeltier","tierart":"rind","nutzung":"milch","ohrmarke":"AT999990001","name":"Berta","geburtsdatum":"2019-03-14","geschlecht":"weiblich","rasse":"Fleckvieh","stall":"Laufstall"},
 {**meta(LIESL),"erfassung":"einzeltier","tierart":"rind","nutzung":"milch","ohrmarke":"AT999990002","name":"Liesl","geburtsdatum":"2020-05-02","geschlecht":"weiblich","rasse":"Fleckvieh"},
 {**meta(KALB,ts="2026-03-02T07:10:00+01:00"),"erfassung":"einzeltier","tierart":"rind","nutzung":"aufzucht","ohrmarke":"AT999990003","geburtsdatum":"2026-03-02","geschlecht":"maennlich","rasse":"Fleckvieh","mutter_id":BERTA,"mutter_ohrmarke":"AT999990001"},
 {**meta(SCHW),"erfassung":"gruppe","tierart":"schwein","nutzung":"mast","name":"Mastschweine Abteil 1","stall":"Maststall Abteil 1"}]
tiere[0]["geaendert_am"]="2026-02-01T07:30:00+01:00"
GUELLE,NAC,HERB,SAAT,TAM,RODENT,FUNG,INSE,UEB=(i(7,k) for k in range(1,10))
betriebsmittel=[
 {**meta(GUELLE),"art":"wirtschaftsduenger","name":"Rindergülle (eigen)","grundeinheit":"m3","duenger":{"bezug":"kg_je_m3","n_gesamt":3.0,"nh4_n":1.5,"p2o5":1.4,"k2o":4.6,"herkunft":"eigen","tierart_quelle":"Rind","napv_typ":"rinderguelle","gehalte_quelle":"analyse","analyse_datum":"2025-11-20"},"notiz":"Beispielwerte für Tests, keine Richtwerte."},
 {**meta(NAC),"art":"mineralduenger","name":"Kalkammonsalpeter 27 % N","grundeinheit":"kg","vorlage":"kas27","aktiv":True,"duenger":{"bezug":"prozent","n_gesamt":27,"napv_typ":"mineralisch","gehalte_quelle":"deklaration"}},
 {**meta(HERB),"art":"psm","name":"Beispiel-Herbizid A (fiktiv)","grundeinheit":"l","hersteller":"Beispiel Agrar GmbH (fiktiv)","psm":{"zulassungsnummer":"9999-901","funktion":["Herbizid"],"formulierung":"EC",
   "wirkstoffe":[{"name":"Wirkstoff X (fiktiv)","gehalt":50,"einheit":"g/l"}],"bienengefaehrlich":False,"zulassung_gueltig_bis":"2028-06-30","register_stand":"2026-03-01",
   "auflagen":[{"art":"gewaesser","code":"SPe 3","text":"Zum Schutz von Gewässerorganismen Abstand zu Oberflächengewässern einhalten (fiktiver Wortlaut).","abstand_m":10},
               {"art":"gewaesser","code":"SPe 3","text":"Mit abdriftminderndem Gerät (fiktiver Wortlaut).","abstand_m":5,"abdriftminderung_prozent":75}],
   "indikationen":[{"nr":"1","kulturen":"Winterweichweizen (TRZAW), Wintergerste (HORVW)","eppo_codes":["TRZAW","HORVW"],"schaderreger":"Klettenlabkraut (GALAP)",
     "aufwand":{"wert":1.0,"einheit":"l_je_ha"},"wasser_l_je_ha_von":200,"wasser_l_je_ha_bis":400,"max_anwendungen":1,"bbch_von":13,"bbch_bis":32,"wartezeit_hinweis":"F – durch Anwendungszeitpunkt abgedeckt"}]}},
 {**meta(FUNG),"art":"psm","name":"Beispiel-Fungizid B (fiktiv)","grundeinheit":"l","psm":{"zulassungsnummer":"9998-0","funktion":["Fungizid"],"wirkstoffe":[{"name":"Wirkstoff Y (fiktiv)","gehalt":125,"einheit":"g/l"}],
   "zulassung_gueltig_bis":"2026-12-31","indikationen":[{"nr":"2","kulturen":"Winterweichweizen (TRZAW)","eppo_codes":["TRZAW"],"schaderreger":"Gelbrost","aufwand":{"wert":1.0,"einheit":"l_je_ha"},"max_anwendungen":2,"abstand_tage":14,"wartezeit_tage":35}]},
  "notiz":"Testfall: Zulassung endet bald (Stand Nov. 2026)."},
 {**meta(INSE),"art":"psm","name":"Beispiel-Insektizid C (fiktiv)","grundeinheit":"l","psm":{"zulassungsnummer":"9997-0","funktion":["Insektizid"],"bienengefaehrlich":True,
   "zulassung_gueltig_bis":"2025-12-31","abverkauf_bis":"2026-03-31","aufbrauch_bis":"2026-06-30"},"notiz":"Testfall: Aufbrauchfrist abgelaufen – darf nicht mehr verwendet werden."},
 {**meta(UEB),"art":"wirtschaftsduenger","name":"Schweinegülle Nachbarhof (übernommen)","grundeinheit":"m3",
  "duenger":{"bezug":"kg_je_m3","n_gesamt":4.2,"p2o5":2.0,"k2o":2.6,"herkunft":"uebernahme","tierart_quelle":"Schwein","napv_typ":"schweineguelle","gehalte_quelle":"richtwert",
   "uebernahme":{"partner_name":"Schweinehof Beispiel (fiktiv)","partner_betriebsnummer":"9999996","vertrag_datum":"2026-01-15","zeitraum_von":"2026-01-01","zeitraum_bis":"2026-12-31",
     "menge":{"wert":120,"einheit":"m3"},"n_kg":504,"p2o5_kg":240,"beleg":"DAV-2026-01"}},"notiz":"Testfall: Übernahme laut Düngerabgabevertrag."},
 {**meta(SAAT),"art":"saatgut","name":"Winterweizen Z-Saatgut Mustersorte","grundeinheit":"kg","saatgut":{"kultur_id":WW,"sorte":"Mustersorte (fiktiv)","gebeizt":True}},
 {**meta(TAM),"art":"tierarzneimittel","name":"Beispiel-Eutertube B (fiktiv)","grundeinheit":"stk","tierarzneimittel":{"zulassungsnummer":"8-99999","wartezeiten":[{"tierart":"rind","produkt":"fleisch","tage":7},{"tierart":"rind","produkt":"milch","tage":5}]}},
 {**meta(RODENT),"art":"biozid","name":"Beispiel-Rodentizid C (fiktiv)","grundeinheit":"kg","biozid":{"registriernummer":"FIKTIV-BIO-1","produktart":"Rodentizid"}}]
TRAK,SPR,FASS=(i(8,k) for k in range(1,4))
maschinen=[
 {**meta(TRAK),"name":"Traktor 1","art":"traktor","baujahr":2015},
 {**meta(SPR),"name":"Anbauspritze 15 m","art":"feldspritze","arbeitsbreite_m":15,"geraetepruefung":{"datum":"2025-04-10","gueltig_bis":"2028-04-10","pruefnummer":"FIKTIV-PR-77"}},
 {**meta(FASS),"name":"Güllefass 10 m³","art":"guellefass","ausbringtechnik":"schleppschlauch","arbeitsbreite_m":12}]
def m(n,ts,**kw): return {**meta(i(9,n),ts=ts),**kw}
massnahmen=[
 m(1,"2025-10-08T18:00:00+02:00",art="aussaat",modul="ackerbau",datum="2025-10-08",schlag_ids=[i(4,3)],person_ids=[JOSEF],maschine_ids=[TRAK],
   details={"kultur_id":WW,"kultur_name":"Winterweichweizen","sorte":"Mustersorte (fiktiv)","saatgut_betriebsmittel_id":SAAT,"saatmenge":{"wert":180,"einheit":"kg_je_ha"}}),
 m(2,"2026-03-12T17:00:00+01:00",art="duengung",modul="duengung",datum="2026-03-12",schlag_ids=[i(4,3)],person_ids=[JOSEF],maschine_ids=[TRAK],
   details={"betriebsmittel_id":NAC,"duenger_name":"Kalkammonsalpeter 27 % N","duenger_art":"mineralduenger","aufwand":{"wert":150,"einheit":"kg_je_ha"},"ausbringtechnik":"streuer","naehrstoffe_kg_je_ha":{"n_gesamt":40.5,"n_nach_stall_lager":40.5,"n_leichtloeslich":40.5,"n_jahreswirksam":40.5},"n_loeslichkeit":"leichtloeslich"},regeln=["napv/duengung@2025-01-01"]),
 m(3,"2026-04-10T19:00:00+02:00",art="bodenbearbeitung",modul="ackerbau",datum="2026-04-10",schlag_ids=[i(4,2)],person_ids=[JOSEF],
   details={"verfahren":"grubber","zweck":"umbruch_zwischenfrucht","tiefe_cm":10}),
 m(4,"2026-04-15T18:30:00+02:00",art="duengung",modul="duengung",datum="2026-04-15",schlag_ids=[i(4,2)],person_ids=[JOSEF],maschine_ids=[TRAK,FASS],
   details={"betriebsmittel_id":GUELLE,"duenger_name":"Rindergülle (eigen)","duenger_art":"wirtschaftsduenger","aufwand":{"wert":20,"einheit":"m3_je_ha"},"ausbringtechnik":"schleppschlauch","naehrstoffe_kg_je_ha":{"n_gesamt":60.0,"n_nach_stall_lager":60.0,"n_leichtloeslich":22.5,"n_jahreswirksam":36.5,"p2o5":28.0,"k2o":92.0},"n_loeslichkeit":"leichtloeslich"},
   regeln=["napv/duengung@2025-01-01"], notiz="Jahreswirksam: 60 × (1 − 13 %) × 70 % = 36,5 kg N/ha (§ 1 Z 14 NAPV)."),
 m(5,"2026-04-20T09:00:00+02:00",art="pflanzenschutz",modul="pflanzenschutz",datum="2026-04-20",uhrzeit_start="07:30",schlag_ids=[i(4,3)],person_ids=[ANNA],maschine_ids=[TRAK,SPR],
   details={"verwendungsart":"flaeche","mittel":[{"betriebsmittel_id":HERB,"name":"Beispiel-Herbizid A (fiktiv)","zulassungsnummer":"9999-901","aufwand":{"wert":1.0,"einheit":"l_je_ha"}}],
            "behandelte_flaeche_ha":8.40,"invekos_flaeche_ids":["FIKTIV-2026-0003"],"kultur_name":"Winterweichweizen","eppo_code":"TRZAW","bbch":30,"grund":"Unkräuter (Klettenlabkraut)"}),
 m(6,"2026-04-25T20:00:00+02:00",art="aussaat",modul="ackerbau",datum="2026-04-25",schlag_ids=[i(4,2)],person_ids=[JOSEF],
   details={"kultur_id":MAIS,"kultur_name":"Mais","saatmenge":{"wert":90000,"einheit":"stk_je_ha"}}),
 m(7,"2026-05-20T19:00:00+02:00",art="weide",modul="tiere",datum="2026-05-01",datum_ende="2026-05-20",schlag_ids=[i(4,4)],tier_ids=[BERTA,LIESL],person_ids=[ANNA],
   details={"tierkategorie":"Milchkühe","anzahl_tiere":2,"unterbrechungen":[{"datum":"2026-05-12","grund":"extremwetter","notiz":"Hagel, Tiere im Stall"}]}),
 m(8,"2026-03-02T07:15:00+01:00",art="tierbewegung",modul="tiere",datum="2026-03-02",tier_ids=[KALB],person_ids=[ANNA],
   details={"bewegungsart":"geburt","ama_gemeldet_am":"2026-03-05"}),
 m(9,"2026-02-10T11:00:00+01:00",art="tierbewegung",modul="tiere",datum="2026-02-10",tier_ids=[SCHW],person_ids=[ANNA],
   details={"bewegungsart":"zugang","anzahl":40,"partner":{"name":"Ferkelhof Beispiel (fiktiv)","betriebsnummer":"9999998"},"transport":{"transporteur":"Eigentransport","kennzeichen":"XX-000AA"}}),
 m(10,"2026-06-03T08:00:00+02:00",art="tierbehandlung",modul="tiere",datum="2026-06-03",tier_ids=[BERTA],person_ids=[TA],
   details={"betriebsmittel_id":TAM,"mittel_name":"Beispiel-Eutertube B (fiktiv)","zulassungsnummer":"8-99999","menge":{"wert":1,"einheit":"stk"},"anwendungsart":"intramammaer","diagnose":"Mastitis (Viertel hinten links)","behandlungsdauer_tage":1,"durch_tierarzt":True,"tierarzt_person_id":TA,"abgabebeleg_nr":"AB-2026-0042","wartezeit_ende":{"fleisch":"2026-06-10","milch":"2026-06-08"}}),
 m(11,"2026-07-20T21:00:00+02:00",art="ernte",modul="ackerbau",datum="2026-07-20",schlag_ids=[i(4,3)],person_ids=[JOSEF],
   details={"kultur_id":WW,"kultur_name":"Winterweichweizen","hauptfrucht":True,"menge":{"wert":60.48,"einheit":"t"},"ertrag":{"wert":7.2,"einheit":"t_je_ha"},"beleg":"wiegeschein","feuchte_prozent":14,"rohprotein_prozent":12.5}),
 m(12,"2026-08-01T10:00:00+02:00",art="biozid",modul="lager",datum="2026-08-01",ort="Getreidelager",person_ids=[ANNA],
   details={"betriebsmittel_id":RODENT,"produkt_name":"Beispiel-Rodentizid C (fiktiv)","anwendungsbereich":"Getreidelager, 4 Köderstationen","haeufigkeit":"wöchentliche Kontrolle"}),
 m(13,"2026-08-10T19:00:00+02:00",art="aussaat",modul="schlagkartei",datum="2026-08-10",schlag_ids=[i(4,3)],person_ids=[JOSEF],maschine_ids=[TRAK],
   details={"kultur_id":ZF,"kultur_name":"Begrünung / Zwischenfrucht (Mischung)","zwischenfrucht":True,"mischungspartner":4,"saatmenge":{"wert":30,"einheit":"kg_je_ha"}},
   notiz="System Immergrün: 21 Tage nach der Ernte angelegt."),
 m(14,"2026-04-12T20:00:00+02:00",art="pflege",modul="schlagkartei",datum="2026-04-12",schlag_ids=[i(4,4)],person_ids=[JOSEF],maschine_ids=[TRAK],
   details={"verfahren":"abschleppen","behandelte_flaeche_ha":2.5})]
duengeplaene=[{**meta(i(13,1),ts="2026-02-20T19:00:00+01:00"),"schlag_id":i(4,3),"jahr":2026,"napv_kultur":"weizen_rp_unter14","ertragslage":"mittel","anlage5":False,
  "erwarteter_ertrag_t_ha":7.0,"obergrenze_kg_n_ha":145,"vorfrucht_wirkung":"keine","vorfrucht_kg_n_ha":0,"n_bedarf_kg_ha":145,"p2o5_empfehlung_kg_ha":55,"k2o_empfehlung_kg_ha":80,
  "regeln":["napv/duengung@2025-01-01","boden/gehaltsklassen@2025-02-18"]}]
bodenproben=[
 {**meta(i(14,1),ts="2024-04-02T18:00:00+02:00"),"feldstueck_id":i(3,1),"datum":"2024-03-12","labor":"Beispiel-Labor (fiktiv)","probennummer":"FIKTIV-24-001","tiefe_cm":"0–30","nutzung":"acker",
  "bodenschwere":"mittel","ton_prozent":22,"ph":6.4,"p_mg_kg":95,"k_mg_kg":180,"mg_mg_kg":110,"humus_prozent":2.8,"gehaltsklassen":{"p":"C","k":"C","mg":"D"}},
 {**meta(i(14,2),ts="2021-05-02T18:00:00+02:00"),"feldstueck_id":i(3,4),"datum":"2021-04-15","probennummer":"FIKTIV-21-004","tiefe_cm":"0–10","nutzung":"gruenland",
  "bodenschwere":"mittel","ph":5.8,"p_mg_kg":60,"k_mg_kg":150,"humus_prozent":5.5,"gehaltsklassen":{"p":"C","k":"C"},"notiz":"Testfall: älter als 5 Jahre (GLÖZ 10)."}]
feldnotizen=[{**meta(i(15,1),ts="2026-05-18T10:15:00+02:00"),"zeitpunkt":"2026-05-18T10:15:00+02:00","kategorie":"schaedling","text":"Wühlmaus-Hügel im Kleegras am Feldrand, ca. 20 m² (fiktiv).",
  "position":{"breite":48.1009,"laenge":15.1012,"genauigkeit_m":6},"schlag_id":i(4,1),"feldstueck_id":i(3,1)}]
aenderungen=[{"id":"0c000000-0000-4000-8000-000000000001","hlc":"2026-02-01T06:30:00.000Z-0000-0a000000","geraet_id":G,"person_id":ANNA,"betrieb_id":B,
 "entitaet":"tier","datensatz_id":BERTA,"operation":"aendern","felder":{"stall":"Laufstall"},"schema_version":SCHEMA_VERSION}]
muster = {"format": "agrardok-export", "schema_version": SCHEMA_VERSION, "erstellt_am": "2026-11-11T12:00:00+01:00", "geraet_id": G, "betrieb_id": B,
 "daten": {"betriebe": [betrieb], "personen": personen, "feldstuecke": feldstuecke, "schlaege": schlaege, "kulturen": kulturen, "tiere": tiere,
           "betriebsmittel": betriebsmittel, "maschinen": maschinen, "massnahmen": massnahmen,
           "duengeplaene": duengeplaene, "bodenproben": bodenproben, "feldnotizen": feldnotizen},
 "aenderungen": aenderungen}

# ---------------------------------------------------------------------------
# Biohof Sonnleiten (Tirol, Bio) – nur Betrieb und Personen, für Stammdaten-Tests
BB = "11000000-0000-4000-8000-000000000001"
G2 = "0a000000-0000-4000-8000-000000000002"
MARIA, LUKAS, FRANZ = (f"12000000-0000-4000-8000-{n:012d}" for n in (1, 2, 3))


def meta2(id_, ts="2026-02-10T09:00:00+01:00"):
    return {"id": id_, "betrieb_id": BB, "erstellt_am": ts, "erstellt_von": MARIA, "geaendert_am": ts,
            "geaendert_von": MARIA, "geraet_id": G2, "rev": 1}


biohof = {"format": "agrardok-export", "schema_version": SCHEMA_VERSION, "erstellt_am": "2026-11-11T12:00:00+01:00", "geraet_id": G2, "betrieb_id": BB,
 "daten": {
  "betriebe": [{**meta2(BB), "name": "Biohof Sonnleiten (fiktiv)", "betriebsnummer": "9999997",
    "adresse": {"strasse": "Sonnleiten 5", "plz": "9998", "ort": "Bergdorf", "land": "AT"}, "bundesland": "T",
    "bewirtschafter": {"name": "Maria Beispiel", "rechtsform": "einzelperson", "person_id": MARIA},
    "bewirtschaftung": "bio", "bio_kontrollstelle": "AT-BIO-999 Beispiel-Kontrollstelle (fiktiv)",
    "napv_gebiet_anlage5": False, "oepul_massnahmen": ["bio", "heuwirtschaft", "tierwohl_weide", "almbewirtschaftung"],
    "notiz": "Fiktiver Bio-Grünlandbetrieb in Tirol. Testfälle: Bio + Kontrollstelle, Tiroler PSM-Recht, abgelaufener Sachkundeausweis."}],
  "personen": [
    {**meta2(MARIA), "name": "Maria Beispiel", "rolle": "betriebsleitung", "telefon": "+43 000 0000002", "aktiv": True,
     "psm_ausbildungsbescheinigung": {"nummer": "T-FIKTIV-789", "bundesland": "T", "gueltig_bis": "2025-06-30"},
     "notiz": "Sachkundeausweis abgelaufen (Testfall)."},
    {**meta2(LUKAS), "name": "Lukas Beispiel", "rolle": "mitarbeit", "aktiv": True},
    {**meta2(FRANZ), "name": "Franz Beispiel", "rolle": "familie", "aktiv": False, "notiz": "Altbauer, nicht mehr am Betrieb (Testfall ehemalig)."}],
 }}


# ---------------------------------------------------------------------------
# Nachgebauter eAMA-GIS-Export (fiktive Flächen, im Koordinatensystem EPSG:31287 entworfen)
# Spaltennamen wie in den öffentlichen INVEKOS-Daten (OGC API, 2026-1), auf 10 Zeichen gekürzt,
# wie es das Shapefile-Format verlangt. Ob der betriebsbezogene eAMA-Export genau so aussieht,
# ist nicht geprüft (siehe rules/import/eama-gis.json).

BESSEL = (6377397.155, 1 / 299.1528128)
WGS = (6378137.0, 1 / 298.257223563)
MGI_TOWGS84 = (577.326, 90.129, 463.919, 5.137, 1.474, 5.297, 2.4232)
LCC = dict(lat0=47.5, lon0=13 + 1 / 3, lat1=49.0, lat2=46.0, x0=400000.0, y0=400000.0)
PRJ_31287 = ('PROJCS["MGI_Austria_Lambert",GEOGCS["GCS_MGI",DATUM["D_MGI",SPHEROID["Bessel_1841",6377397.155,299.1528128]],'
             'PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]],PROJECTION["Lambert_Conformal_Conic"],'
             'PARAMETER["False_Easting",400000.0],PARAMETER["False_Northing",400000.0],PARAMETER["Central_Meridian",13.33333333333333],'
             'PARAMETER["Standard_Parallel_1",49.0],PARAMETER["Standard_Parallel_2",46.0],PARAMETER["Latitude_Of_Origin",47.5],UNIT["Meter",1.0]]')


def _lcc_konstanten():
    a, f = BESSEL; e2 = f * (2 - f); e = math.sqrt(e2)
    m = lambda p: math.cos(p) / math.sqrt(1 - e2 * math.sin(p) ** 2)
    tf = lambda p: math.tan(math.pi / 4 - p / 2) / ((1 - e * math.sin(p)) / (1 + e * math.sin(p))) ** (e / 2)
    p0, p1, p2 = (math.radians(LCC[k]) for k in ("lat0", "lat1", "lat2"))
    n = (math.log(m(p1)) - math.log(m(p2))) / (math.log(tf(p1)) - math.log(tf(p2)))
    F = m(p1) / (n * tf(p1) ** n)
    return a, e, n, F, a * F * tf(p0) ** n, tf


def lcc_invers_wgs84(x, y):
    """EPSG:31287 → WGS84 (Lambert invers + Helmert, Position-Vector-Konvention)."""
    a, e, n, F, r0, _ = _lcc_konstanten()
    dx, dy = x - LCC["x0"], r0 - (y - LCC["y0"])
    r = math.copysign(math.hypot(dx, dy), n); th = math.atan2(dx, dy)
    tt = (r / (a * F)) ** (1 / n); phi = math.pi / 2 - 2 * math.atan(tt)
    for _ in range(15):
        phi = math.pi / 2 - 2 * math.atan(tt * ((1 - e * math.sin(phi)) / (1 + e * math.sin(phi))) ** (e / 2))
    lam = th / n + math.radians(LCC["lon0"])
    X, Y, Z = _helmert(_geo_xyz(phi, lam, BESSEL), MGI_TOWGS84)
    phi, lam = _xyz_geo(X, Y, Z, WGS)
    return round(math.degrees(lam), 7), round(math.degrees(phi), 7)


def _geo_xyz(phi, lam, ell):
    a, f = ell; e2 = f * (2 - f); N = a / math.sqrt(1 - e2 * math.sin(phi) ** 2)
    return N * math.cos(phi) * math.cos(lam), N * math.cos(phi) * math.sin(lam), N * (1 - e2) * math.sin(phi)


def _xyz_geo(X, Y, Z, ell):
    a, f = ell; e2 = f * (2 - f); lam = math.atan2(Y, X); p = math.hypot(X, Y); phi = math.atan2(Z, p * (1 - e2))
    for _ in range(10):
        N = a / math.sqrt(1 - e2 * math.sin(phi) ** 2); phi = math.atan2(Z + e2 * N * math.sin(phi), p)
    return phi, lam


def _helmert(xyz, par):
    X, Y, Z = xyz; tx, ty, tz, rx, ry, rz, s = par; k = math.radians(1 / 3600)
    rx, ry, rz = rx * k, ry * k, rz * k; m = 1 + s * 1e-6
    return tx + m * (X - rz * Y + ry * Z), ty + m * (rz * X + Y - rx * Z), tz + m * (-ry * X + rx * Y + Z)


def _flaeche(ring):
    return sum(ring[i][0] * ring[(i + 1) % len(ring)][1] - ring[(i + 1) % len(ring)][0] * ring[i][1] for i in range(len(ring))) / 2


def _rechteck(x, y, b, h):
    """Ring im Uhrzeigersinn (Shapefile-Außenring), geschlossen."""
    return [(x, y), (x, y + h), (x + b, y + h), (x + b, y), (x, y)]


def _shapefile(polygone):
    """polygone: Liste von Ringlisten (Außenring im, Löcher gegen den Uhrzeigersinn) → (shp, shx)."""
    saetze, index, pos = [], [], 50
    alle = [pt for ringe in polygone for r in ringe for pt in r]
    bbox = (min(p[0] for p in alle), min(p[1] for p in alle), max(p[0] for p in alle), max(p[1] for p in alle))
    for nr, ringe in enumerate(polygone, 1):
        punkte = [pt for r in ringe for pt in r]
        teile, start = [], 0
        for r in ringe:
            teile.append(start); start += len(r)
        rb = (min(p[0] for p in punkte), min(p[1] for p in punkte), max(p[0] for p in punkte), max(p[1] for p in punkte))
        inhalt = struct.pack("<i4d2i", 5, *rb, len(ringe), len(punkte)) + struct.pack(f"<{len(teile)}i", *teile) \
            + b"".join(struct.pack("<2d", *pt) for pt in punkte)
        saetze.append(struct.pack(">2i", nr, len(inhalt) // 2) + inhalt)
        index.append(struct.pack(">2i", pos, len(inhalt) // 2)); pos += 4 + len(inhalt) // 2
    def kopf(laenge_woerter):
        return struct.pack(">7i", 9994, 0, 0, 0, 0, 0, laenge_woerter) + struct.pack("<2i4d4d", 1000, 5, *bbox, 0, 0, 0, 0)
    shp_inhalt = b"".join(saetze); shx_inhalt = b"".join(index)
    return kopf(50 + len(shp_inhalt) // 2) + shp_inhalt, kopf(50 + len(shx_inhalt) // 2) + shx_inhalt


def _dbf(felder, saetze, kodierung="cp1252", ldid=0x57):
    """felder: [(name, typ, laenge, dezimal)]; saetze: Listen von Werten."""
    satzlaenge = 1 + sum(f[2] for f in felder); kopflaenge = 32 + 32 * len(felder) + 1
    kopf = struct.pack("<B3BIHH20x", 3, 126, 11, 11, len(saetze), kopflaenge, satzlaenge)
    kopf = kopf[:29] + bytes([ldid]) + kopf[30:]
    for name, typ, laenge, dez in felder:
        kopf += struct.pack("<11sc4xBB14x", name.encode("ascii"), typ.encode("ascii"), laenge, dez)
    kopf += b"\x0d"
    daten = b""
    for s in saetze:
        daten += b" "
        for (name, typ, laenge, dez), w in zip(felder, s):
            if w is None: text = ""
            elif typ == "N": text = f"{w:.{dez}f}" if dez else str(int(w))
            else: text = str(w)
            roh = text.encode(kodierung)[:laenge]
            daten += roh.rjust(laenge) if typ == "N" else roh.ljust(laenge)
    return kopf + daten + b"\x1a"


def eama_beispiel():
    X, Y = 651500.0, 494000.0  # fiktive Felder auf Ackerland im Marchfeld (EPSG:31287)
    gehoelz = [(X + 150, Y - 220), (X + 180, Y - 220), (X + 180, Y - 190), (X + 150, Y - 190), (X + 150, Y - 220)]  # gegen Uhrzeigersinn = Loch
    schlaege = [  # (FS_KENNUNG, SNAR_CODE, SNAR_BEZEI, KZ_BIO, Ringe)
        (900000001, "138", "WINTERWEICHWEIZEN", "N", [_rechteck(X, Y, 350, 100)]),
        (900000001, "308", "SOJABOHNEN", "N", [_rechteck(X, Y + 100, 250, 100)]),
        (900000002, "105", "KÖRNERMAIS", "N", [_rechteck(X, Y - 300, 300, 133.3333), gehoelz]),
        (900000002, "359", "GLÖZ FELDGEHÖLZ / BAUM- / GEBÜSCHGRUPPE", "N", [list(reversed(gehoelz))]),
        (900000003, "716", "MÄHWIESE/-WEIDE ZWEI NUTZUNGEN", "J", [_rechteck(X + 500, Y, 200, 110)]),
        (900000003, "999", "VERSUCHSFLÄCHE (FIKTIV)", "J", [_rechteck(X + 500, Y + 110, 200, 20)]),
    ]
    def ha_von(ringe):
        return abs(_flaeche(ringe[0])) / 1e4 - sum(abs(_flaeche(r)) for r in ringe[1:]) / 1e4
    sl_felder = [("FS_KENNUNG", "N", 15, 1), ("SNAR_CODE", "C", 10, 0), ("SNAR_BEZEI", "C", 80, 0), ("SL_FLAECHE", "N", 16, 8), ("KZ_BIO_OEP", "C", 1, 0)]
    sl_saetze = [[k, c, b, ha_von(r), bio] for k, c, b, bio, r in schlaege]
    fs_def = {900000001: ("A", "ACKERLAND"), 900000002: ("A", "ACKERLAND"), 900000003: ("G", "GRÜNLAND")}
    fs_ringe = {900000001: [_rechteck(X, Y, 350, 200)], 900000002: [_rechteck(X, Y - 300, 300, 133.3333)], 900000003: [_rechteck(X + 500, Y, 200, 130)]}
    fs_felder = [("FS_KENNUNG", "N", 15, 1), ("FNAR_CODE", "C", 4, 0), ("FNAR_BEZEI", "C", 80, 0), ("FS_FLAECHE", "N", 16, 8)]
    fs_saetze = [[k, *fs_def[k], ha_von(fs_ringe[k])] for k in fs_def]

    puffer = io.BytesIO()
    with zipfile.ZipFile(puffer, "w", zipfile.ZIP_DEFLATED) as z:
        for name, ringe_liste, felder, saetze in (("SCHLAEGE_2026", [s[4] for s in schlaege], sl_felder, sl_saetze),
                                                  ("FELDSTUECKE_2026", list(fs_ringe.values()), fs_felder, fs_saetze)):
            shp, shx = _shapefile(ringe_liste)
            z.writestr(f"{name}.shp", shp); z.writestr(f"{name}.shx", shx)
            z.writestr(f"{name}.dbf", _dbf(felder, saetze)); z.writestr(f"{name}.prj", PRJ_31287)

    geojson = {"type": "FeatureCollection", "features": [
        {"type": "Feature", "properties": {"fs_kennung": k, "snar_code": c, "snar_bezeichnung": b, "sl_flaeche_brutto_ha": round(ha_von(r), 8), "kz_bio_oepul_jn": bio},
         "geometry": {"type": "Polygon", "coordinates": [[list(lcc_invers_wgs84(*pt)) for pt in reversed(ring)] for ring in r]}}
        for k, c, b, bio, r in schlaege]}
    return puffer.getvalue(), geojson


if __name__ == "__main__":
    ZIEL.mkdir(exist_ok=True)
    for name, inhalt in (("musterbetrieb.json", muster), ("biohof.json", biohof)):
        (ZIEL / name).write_text(json.dumps(inhalt, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print("✓", ZIEL.name + "/" + name)
    zip_bytes, geojson = eama_beispiel()
    (ZIEL / "eama-export-beispiel.zip").write_bytes(zip_bytes)
    (ZIEL / "flaechen-beispiel.geojson").write_text(json.dumps(geojson, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print("✓ testdaten/eama-export-beispiel.zip, testdaten/flaechen-beispiel.geojson")
