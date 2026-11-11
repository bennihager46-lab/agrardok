# Funktionsumfang – Aufzeichnungsbereiche für AGRARDOK+

Stand der Recherche: 11.11.2026 · Status: **Entwurf, keine Rechtsberatung**

Dieses Dokument hält fest:

1. welche Funktionsbereiche kommerzielle österreichische Agrarsoftware abdeckt (nur als neutrale Stichwortliste, ohne übernommene Texte),
2. welche dieser Bereiche gesetzlich vorgeschrieben sind, mit Rechtsgrundlage, Pflichtfeldern und Aufbewahrungsfrist,
3. welche Priorität jeder Bereich für AGRARDOK+ hat.

Jede Angabe ist mit einer Quellenmarke wie **[Q4]** belegt. Das Quellenverzeichnis steht am Ende.
Angaben mit ⚠️ sind **nicht am Primärtext geprüft** und müssen vor der Umsetzung in `/rules` verifiziert werden.

---

## 1. Was kommerzielle Programme abdecken (Marktüberblick)

Als Referenz dienten AgrarCommander und Farmdok. Beide sind im App-Katalog der LK Niederösterreich gelistet.

| Funktionsbereich | AgrarCommander | Farmdok |
|---|---|---|
| Aufzeichnungen Pflanzenschutz, Düngung, Konditionalität, ÖPUL, Nitrat | ✔ [Q1][Q2] | Maßnahmen-/Feldarbeitsdoku ✔ [Q3] |
| Prüfung von Auflagen während der Erfassung | ✔ [Q1] | – |
| Tierhaltung und Nährstoffanfall | ✔ [Q1] | – |
| Lagerverwaltung | ✔ [Q1] | ✔ [Q3] |
| Dokumentenablage, Stammdaten (inkl. Bio-Zulassungen) | ✔ [Q1] | Notizen/Fotos ✔ [Q3] |
| Anbau-, Zwischenfrucht- und Düngeplanung | ✔ [Q1] | Fruchtfolge, Düngeplanung ✔ [Q3] |
| Arbeitsplanung, Mitarbeiter, Arbeitszeit | ✔ [Q1] | Arbeitsplanung ✔ [Q3] |
| Kostenrechnung, Auswertungen, Deckungsbeitrag | ✔ [Q1] | Kostenrechnung ✔ [Q3] |
| AMA-Antragstellung, Prämienkalkulation | ✔ [Q1] | – |
| Grundstücks- und Pachtverwaltung | ✔ [Q1] | – |
| GIS-Flächenverwaltung / Karte | ✔ [Q1] | ✔ [Q3] |
| Bodenproben | ✔ [Q1] | ✔ [Q3] |
| Precision Farming: Terminal-Datenaustausch, Applikationskarten, Spurlinien | ✔ [Q1] | Applikationskarten, ISOXML/Shape-Export ✔ [Q3] |
| Satelliten-Vegetationsmonitoring | ✔ [Q1] | ✔ [Q3] |
| Automatische Erfassung von Feldarbeiten per GPS | – | ✔ [Q3] |
| Kundenverwaltung (Lohnunternehmer) | überbetriebliche Erfassung [Q1] | ✔ [Q3] |

Beide Programme sind kostenpflichtig, mit Paketen bzw. In-App-Käufen [Q2][Q3].

---

## 2. Übersichtstabelle: Aufzeichnungsbereiche

**Legende Typ:** 🟥 **PFLICHT** = gesetzliche Aufzeichnungspflicht · 🟧 **PFLICHT (bedingt)** = nur bei Teilnahme an einer Förderung, in bestimmten Gebieten oder über einer Schwelle · 🟩 **Nice to have** = keine Rechtspflicht

| # | Bereich | Typ | Gesetzliche Grundlage | Wer muss aufzeichnen | Pflichtfelder (Kurzform, Details in Abschnitt 3) | Aufbewahrungsfrist | Priorität |
|---|---|---|---|---|---|---|---|
| 1 | **Düngung – betriebsbezogen (N-Bilanz)** | 🟥 PFLICHT | § 8 NAPV [Q4] | Alle Betriebe **außer** ≤ 15 ha LN (mit < 2 ha Gemüse) oder > 90 % Dauergrünland/Ackerfutter. Almen und Gemeinschaftsweiden ausgenommen [Q4] | LN gesamt und LN mit N-Düngung; N aus Wirtschaftsdünger (Anfall, Abgabe/Übernahme, Ausbringung); jahreswirksames N aus allen Düngern; Bewässerung; N-Bedarf je Kultur/Ertragslage; Erntemengen bei hoher Ertragslage; Bodenbearbeitung zur Erneuerung [Q4] | **7 Jahre** ab Ende des Kalenderjahres, fertig **bis 31. Jänner** für das Vorjahr [Q4] | **hoch** |
| 2 | **Düngung – schlagbezogen (Gebiete Anlage 5)** | 🟧 PFLICHT (Gebiet) | § 9 Abs. 5–6 NAPV [Q5] | Betriebe in Gebieten nach Anlage 5 mit > 2 ha Gemüse oder > 5 ha Acker; gilt für jede Kultur > 0,3 ha [Q5] | Schlag/Feldstück (Bezeichnung, Größe), Kultur; Düngerart, Menge, jahreswirksames N, Datum; Bewässerung; Anbau-/Erntedatum, Ertragslage; Erntemenge und N-Entzug; Schlagbilanz [Q5] | **7 Jahre**, Eintrag **binnen 14 Tagen** [Q5] | **hoch** |
| 3 | Feldmiete (Mistlagerung am Feld) | 🟧 PFLICHT (Gebiet) | § 9 Abs. 7 NAPV [Q5] | Betriebe in Anlage-5-Gebieten mit Feldmieten [Q5] | Datum der Anlage, Feldstück/Schlag, Datum der Räumung [Q5] | **7 Jahre**, Eintrag **binnen 14 Tagen** [Q5] | mittel |
| 4 | Wirtschaftsdünger-Abgabe/Übernahme (Nachweise) | 🟧 PFLICHT (Gebiet) | § 9 Abs. 3 NAPV [Q5] | Betriebe in Anlage-5-Gebieten mit Abgabe/Übernahme [Q5] | Vereinbarung/Nachweis über die Übergabe [Q5] | **7 Jahre** [Q5] | mittel |
| 5 | **Pflanzenschutzmittel-Anwendung** | 🟥 PFLICHT | Art. 67 Abs. 1 VO (EG) 1107/2009 [Q6]; DVO (EU) 2023/564 [Q7], geändert durch DVO (EU) 2025/2203 [Q9]; Landes-Pflanzenschutzmittelgesetze, z. B. § 3a Sbg. PMG 2014 [Q8] | Berufliche Verwender [Q6]; auch Grundbesitzer, die PSM von Dritten (z. B. Lohnunternehmer) ausbringen lassen [Q8] | Bezeichnung des Mittels, Zeitpunkt, verwendete Menge, behandelte Fläche, Kultur [Q6]. Lage über die InVeKoS-Flächeneinheit; EPPO-Code und BBCH-Stadium „gegebenenfalls“ [Q7]. ⚠️ Vollständige Feldliste des Anhangs 2023/564 nicht geprüft | **mind. 3 Jahre** [Q6]; OÖ ebenfalls 3 Jahre (§ 18a Oö. BSG, siehe [rechtsgrundlagen.md](rechtsgrundlagen.md)). Die Angabe „4 Jahre“ in [Q10] ist überholt. Eintrag **unverzüglich**; **ab 1.1.2027 elektronisch und maschinenlesbar**, Papiernotizen binnen 30 Tagen umwandeln [Q8][Q9] | **hoch** |
| 6 | ÖPUL: Begrünung „System Immergrün“ | 🟧 PFLICHT (bei Teilnahme) | ÖPUL 2023, Förderverpflichtung [Q11] | Teilnehmer der Maßnahme, für **alle** Ackerschläge [Q11] | Je Schlag: Ernte Hauptfrucht, Anlage und Umbruch Zwischenfrucht, Anlage Folgekultur (1.1.–31.12.) [Q11] | ⚠️ nicht angegeben [Q11] | **hoch** |
| 7 | ÖPUL: Bodennahe Ausbringung / Gülleseparation | 🟧 PFLICHT (bei Teilnahme) | ÖPUL 2023 [Q11] | Teilnehmer [Q11] | Je Schlag: Menge und Art der Gülle, Datum, Ausbringungstechnik; Separation: Datum und Menge [Q11] | ⚠️ nicht angegeben [Q11] | **hoch** |
| 8 | ÖPUL: Vorbeugender Grundwasserschutz Acker | 🟧 PFLICHT (bei Teilnahme) | ÖPUL 2023, verweist auf NAPV [Q11] | Teilnehmer [Q11] | Düngeplanung **bis 28. Feb.**, Bilanz **bis 31. Jän.** des Folgejahres; schlagbezogene N-Bilanz, Anbau-/Erntedaten; **elektronisch**, binnen 14 Tagen [Q11] | ⚠️ nicht angegeben [Q11] (NAPV: 7 J. [Q5]) | mittel |
| 9 | ÖPUL: Weidetagebuch (Tierwohl Weide, Naturschutz mit Weideauflage) | 🟧 PFLICHT (bei Teilnahme) | ÖPUL 2023 [Q11] | Teilnehmer [Q11] | Tierkategorie/Gruppe, Weidefläche, Beginn/Ende je Weideperiode, Gründe für Unterbrechungen; Naturschutz: **tagaktuell** [Q11] | ⚠️ nicht angegeben [Q11] | **hoch** |
| 10 | ÖPUL: weitere (Nutzungstermine UBB/Bio, Nützlinge, Erosionsschutz Dauerkulturen, Festmistkompostierung, Freilandhaltung Schwein, Indikatorarten) | 🟧 PFLICHT (bei Teilnahme) | ÖPUL 2023 [Q11] | Teilnehmer der jeweiligen Maßnahme [Q11] | z. B. Datum 1./2. Nutzung; Organismen (Art, Menge, Zweck, Datum, Belege); Rodung, Auspflanzung, Begrünung [Q11] | ⚠️ nicht angegeben [Q11] | mittel (UBB-Nutzungstermine), sonst niedrig |
| 11 | **Rinder: Bestandsverzeichnis + Meldung an die AMA-Rinderdatenbank** | 🟥 PFLICHT | § 5 und § 7 Rinderkennzeichnungs-Verordnung (2021) [Q12][Q13][Q14] | Jede rinderhaltende Person [Q12] | Ohrmarke, Geburtsdatum, Geschlecht, Rasse, Zu-/Abgangsdatum, Schlacht-/Verendungsdatum, Vorbesitzer, Abnehmer, Ursprungs-Ohrmarke (Drittland), Almaufenthalt, Ohrmarke Mutter, Kontrollvermerke [Q12] | Eintrag und Meldung **binnen 7 Tagen** [Q12][Q13]; **4 Jahre** ab Ende des Kalenderjahres (§ 5 Abs. 4 RKZV 2021, siehe [rechtsgrundlagen.md](rechtsgrundlagen.md)) | **hoch** (Bestandsverzeichnis; die Meldung selbst läuft über eAMA) |
| 12 | **Schweine, Schafe, Ziegen: Bestandsregister** | 🟥 PFLICHT | VO (EU) 2016/429, Tiergesundheitsgesetz, TKZVO [Q15] | Halter von Schweinen, Schafen, Ziegen; auch Equiden > 30 Tage [Q15] | ⚠️ Feldliste auf der Quelle nicht angegeben (TKZVO prüfen) | Einträge **binnen 7 Tagen**; Schweine **mind. 3 J.**, Schafe/Ziegen **mind. 7 J.** [Q15] | **hoch** |
| 13 | **Tierarzneimittel: Behandlungen und Wartezeiten** | 🟥 PFLICHT | LMSVG, Tierarzneimittelgesetz (TAMG), § 12 Rückstandskontrollverordnung [Q16] | Tierhalter, wenn nicht der Tierarzt einträgt [Q16] | Zeitpunkt und Art der Behandlung im Bestandsregister [Q16]; Tierarzt-Doku enthält Tier, Diagnose, Mittel, Anwendungsart, Dosis, Dauer, Wartezeit [Q17] | Eintrag **am Tag der Behandlung** [Q16]; Tierhalter **5 J.** (AMA-Merkblatt Konditionalität, siehe [rechtsgrundlagen.md](rechtsgrundlagen.md)); ⚠️ Arzneifuttermittel 7 J. [Q18] | **hoch** |
| 14 | Lebensmittelsicherheit Primärproduktion (Eigenkontrolle, Rückverfolgbarkeit) | 🟥 PFLICHT | LMSVG, Rückstandskontrollverordnung [Q19]; ⚠️ VO (EG) 852/2004 und 183/2005 nicht geprüft | Tierhaltende Betriebe; Abgabe von Milch, Eiern, Honig [Q19] | ⚠️ keine Feldliste gefunden; Kernfunktion: Lieferanten und Abnehmer nachvollziehbar halten [Q19] | ⚠️ nicht gefunden | mittel |
| 15 | Biologische Landwirtschaft | 🟧 PFLICHT (Bio) | Art. 34 Abs. 5 VO (EU) 2018/848; EU-QuaDG [Q20] | Biobetriebe [Q20] | ⚠️ u. a. Zukaufsbelege für Betriebsmittel und Tiere, Nachweis der Biotauglichkeit; Genehmigung für Zukauf konventioneller Zuchttiere [Q20] | ⚠️ nicht gefunden (Kontrollstelle fragen) | mittel |
| 16 | Steuerliche Aufzeichnungen (Teilpauschalierung) | 🟧 PFLICHT (Schwelle) | § 132 BAO; LuF-PauschVO 2015 [Q21] | Teilpauschalierte Betriebe; die Pflicht gilt ohne Aufforderung durch das Finanzamt [Q21] | Einnahmen mit Belegen [Q21] | **7 Jahre** [Q21] | niedrig (außerhalb des Kernumfangs) |
| 17 | Stammdaten: Betrieb, Feldstücke, Schläge, Kulturen (Import aus dem Mehrfachantrag) | 🟩 Grundlage | keine eigene Pflicht, alle Pflichten oben bauen darauf auf | – | – | – | **hoch** (technisch Voraussetzung) |
| 18 | Lager (Dünger, PSM, Futter) | 🟩 Nice to have | – | – | – | – | mittel |
| 19 | Düngeplanung / Anbauplanung | 🟩 Nice to have (Pflicht nur bei Nr. 8) | – | – | – | – | mittel |
| 20 | Bodenproben | 🟩 Nice to have | – | – | – | – | niedrig |
| 21 | Arbeitszeit, Mitarbeiter, Maschinen | 🟩 Nice to have | – | – | – | – | niedrig |
| 22 | Kostenrechnung, Deckungsbeitrag, Prämienkalkulation | 🟩 Nice to have | – | – | – | – | niedrig |
| 23 | Pacht- und Grundstücksverwaltung | 🟩 Nice to have | – | – | – | – | niedrig |
| 24 | Precision Farming (ISOXML, Applikationskarten, Spurlinien, Satellit) | 🟩 Nice to have | – | – | – | – | niedrig |
| 25 | AMA-Antragstellung | 🟩 Nice to have | – | – | – | – | niedrig (nicht machbar ohne AMA-Schnittstelle; Export von GeoJSON reicht) |

---

## 3. Details zu den Pflichtbereichen

### 3.1 Düngung (Nitrat-Aktionsprogramm-Verordnung, NAPV)

- **Betriebsbezogen, § 8 Abs. 1 Z 1–7** [Q4]:
  1. Größe der LN und der LN mit N-Düngung
  2. N aus Wirtschaftsdünger nach Stall- und Lagerverlusten (Anlage 4): a) am Betrieb angefallen, b) abgegeben/übernommen, c) auf eigener LN ausgebracht
  3. Ausgebrachtes N aus Wirtschafts-, organischem und mineralischem Dünger als jahreswirksame Menge
  4. Bewässerungsmenge und das damit zugeführte N
  5. N-Bedarf je Kultur und Ertragslage (Anlage 3), inkl. Vorfruchtwirkung, und Fläche je Kultur
  6. Erntemengen von Ackerflächen mit Wiegebeleg oder Silovolumen, wenn über der mittleren Ertragslage gedüngt wurde (ohne Ackerfutter)
  7. Ob und wann zur Erneuerung der Vegetation bodenbearbeitet wurde (§ 5 Abs. 2), mit Schlag und Zeitpunkt
- **Ausnahmen, § 8 Abs. 2** [Q4]: höchstens 15 ha LN (mit < 2 ha Gemüse) oder mehr als 90 % Dauergrünland/Ackerfutter. In Anlage-5-Gebieten gilt die Pflicht schon ab 5 ha LN oder 2 ha Gemüse, wenn der Grünlandanteil unter 90 % liegt (§ 9 Abs. 5) [Q5].
- **Schlagbezogen, § 9 Abs. 6 Z 1–6** [Q5]: Siehe Tabelle Nr. 2. Vergleichbare Schläge dürfen zusammengefasst werden.
- **Fristen**: Betriebsaufzeichnung bis 31. Jänner des Folgejahres [Q4]; schlagbezogene Einträge binnen 14 Tagen nach Ausbringung, Anbau, Bewässerung oder Ernte [Q5]. Aufbewahrung 7 Jahre, Vorlage auf Verlangen der Behörde [Q4].
- **Für `/rules`**: Anlagen 3, 4 und 5 (N-Bedarf, Anfallswerte, Gebietskulisse) und die Sperrfristen sind **noch nicht ausgewertet**.

### 3.2 Pflanzenschutz

- Art. 67 Abs. 1 VO 1107/2009 verlangt fünf Angaben: Bezeichnung des Mittels, Zeitpunkt der Verwendung, verwendete Menge, behandelte Fläche, Kulturpflanze. Aufbewahrung **mindestens drei Jahre**, Vorlage auf Anfrage der Behörde [Q6].
- DVO 2023/564 regelt Inhalt und Format. Laut Erwägungsgründen soll die Fläche über die InVeKoS-Flächeneinheit aus dem Mehrfachantrag angegeben werden, EPPO-Codes und BBCH „gegebenenfalls“; Mitgliedstaaten dürfen weitere Angaben verlangen [Q7].
- DVO 2025/2203 verschiebt die Pflicht zum **elektronischen, maschinenlesbaren** Format auf den **1.1.2027** [Q9]. Salzburg hat das umgesetzt: Eintrag unverzüglich; was nicht direkt elektronisch erfasst wird, muss binnen 30 Tagen nach der Anwendung umgewandelt werden [Q8].
- **Pflanzenschutz ist Landesrecht.** Jedes Bundesland hat ein eigenes Pflanzenschutzmittelgesetz. Fristen und Zusatzfelder können abweichen, z. B. laut LK OÖ 4 Jahre Aufbewahrung in Oberösterreich ⚠️ [Q10]. Das gehört in `/rules` mit einem Feld je Bundesland.
- **Bedeutung für AGRARDOK+:** Ein CSV/JSON-Export ist ein maschinenlesbares Format und erfüllt damit voraussichtlich die Pflicht ab 2027. Das ist ein starkes Argument für das Projekt. ⚠️ Die genaue Feldliste und das Format laut Anhang 2023/564 müssen noch am EUR-Lex-Text geprüft werden.

### 3.3 ÖPUL 2023 (nur bei Teilnahme)

Laut LK NÖ haben diese Maßnahmen Aufzeichnungspflichten als Förderauflage [Q11]: Begrünung System Immergrün, Bodennahe Ausbringung und Gülleseparation, Erosionsschutz Wein/Obst/Hopfen, Nützlinge im geschützten Anbau, Vorbeugender Grundwasserschutz Acker, Naturschutzmaßnahme mit Weideauflage, Tierwohl Weide. Dazu kommen Nutzungstermine auf Biodiversitätsflächen (UBB/Bio), Festmistkompostierung, Freilandhaltung Schwein und die Dokumentation von Indikatorarten.
Die AMA stellt Aufzeichnungsvorlagen bereit, außer für den Grundwasserschutz [Q11]. Diese Vorlagen sind eine gute Referenz für unsere Feldauswahl (ohne Layout zu kopieren).

### 3.4 Tierhaltung

- **Rinder** [Q12][Q13][Q14]: Bestandsverzeichnis nach AMA-Vorlage, auf Papier oder elektronisch. Änderungen binnen 7 Tagen eintragen **und** an die AMA-Rinderdatenbank melden. Alm-/Weidemeldungen binnen 14 Tagen [Q14].
- **Schweine, Schafe, Ziegen** [Q15]: Bestandsregister, Einträge binnen 7 Tagen, Aufbewahrung Schweine mind. 3 Jahre, Schafe/Ziegen mind. 7 Jahre.
- **Tierarzneimittel** [Q16][Q17][Q18]: Der Tierhalter trägt Zeitpunkt und Art jeder Behandlung noch am selben Tag ins Bestandsregister ein, sofern es nicht der Tierarzt tut. Die Wartezeit legt der Tierarzt fest; der Tag der letzten Behandlung zählt nicht mit [Q18]. Für AGRARDOK+ ist das eine wichtige Hilfsfunktion: „Wartezeit endet am …“ und eine Sperre bei Milch- oder Schlachtabgabe.

---

## 4. Empfehlung für die Umsetzungsreihenfolge

1. **Stammdaten** (Betrieb, Feldstück, Schlag, Kultur; GeoJSON-Import aus dem Mehrfachantrag), Grundlage für alles andere
2. **Pflanzenschutz-Aufzeichnung** mit maschinenlesbarem Export (Pflicht ab 1.1.2027, betrifft fast alle Ackerbaubetriebe)
3. **Düngung**: Maßnahmen je Schlag und Jahresbilanz nach § 8 NAPV mit Erinnerung „bis 31. Jänner“
4. **Tierbestand und Tierarzneimittel** (Rinder-Bestandsverzeichnis, Schweine-Register, Behandlungen mit Wartezeit)
5. **ÖPUL-Bausteine**: Immergrün-Termine, Weidetagebuch, bodennahe Ausbringung
6. Danach die Nice-to-have-Funktionen (Lager, Planung, Bodenproben …)

---

## 5. Offene Punkte (vor Umsetzung prüfen)

> Stand 11.11.2026: Einige Punkte sind in [rechtsgrundlagen.md](rechtsgrundlagen.md) geklärt, nämlich die Feldliste von Anhang 2023/564, die Rinder-Aufbewahrung, die TKZVO-Felder für Schafe und Ziegen und sechs der neun Landesgesetze. Den aktuellen Stand der offenen Punkte führt das neue Dokument.

- [ ] Anhang der DVO (EU) 2023/564 im EUR-Lex-Volltext: vollständige Feldliste und Formatvorgaben [Q7]
- [ ] Pflanzenschutzmittelgesetze aller 9 Bundesländer: Aufbewahrungsfrist und Zusatzfelder (OÖ: 4 Jahre? [Q10])
- [ ] Aufbewahrungsfrist des Rinder-Bestandsverzeichnisses (Rinderkennzeichnungs-Verordnung 2021 im RIS)
- [ ] Pflichtfelder des Bestandsregisters für Schweine/Schafe/Ziegen (TKZVO im RIS)
- [ ] Aufbewahrungsfrist für Tierhalter nach TAMG (aktuelle Fassung) [Q18]
- [ ] Aufbewahrungsfristen der ÖPUL-Aufzeichnungen (AMA-Merkblätter / Sonderrichtlinie ÖPUL)
- [ ] Bio: Dokumentenliste und Fristen (DVO 2021/2119, Kontrollstellen)
- [ ] Lebensmittel- und Futtermittelhygiene Primärproduktion (VO 852/2004 Anhang I, VO 183/2005 Anhang I)
- [ ] NAPV Anlagen 3–5 und Sperrfristen als JSON nach `/rules`

---

## 6. Quellenverzeichnis

Alle Quellen wurden am 11.11.2026 abgerufen. ⚠️ = Inhalt nur aus Suchergebnis-Auszug oder Sekundärquelle, Volltext nicht gelesen.

| Marke | Quelle |
|---|---|
| Q1 | AgrarCommander, Funktionsübersicht: <https://www.agrarcommander.at/funktionen/> |
| Q2 | LK Niederösterreich, App-Katalog „AgrarCommander“: <https://noe.lko.at/agrarcommander-dokumentation+2400+4234554> |
| Q3 | LK Niederösterreich, App-Katalog „Farmdok“: <https://noe.lko.at/farmdok-aufzeichnungen-feldarbeiten-landwirtschaftskammer-niederösterreich+2400+3262954> |
| Q4 | § 8 Nitrat-Aktionsprogramm-Verordnung (NAPV), Fassung ab 01.01.2023, via JUSLINE: <https://www.jusline.at/gesetz/napv/paragraf/8> (Primärquelle: RIS) |
| Q5 | § 9 NAPV, via JUSLINE: <https://www.jusline.at/gesetz/napv/paragraf/9> |
| Q6 | Art. 67 VO (EG) Nr. 1107/2009: <https://gesetze.legal/eu/vo_eg_2009_1107/67> (Amtlich: EUR-Lex) |
| Q7 | DVO (EU) 2023/564, amtlich: <https://eur-lex.europa.eu/eli/reg_impl/2023/564/oj?locale=de>. Gelesen wurden nur die Erwägungsgründe über <https://umwelt-online.de/recht/eu/23a/23a_0564.htm>; der Anhang ist ⚠️ ungeprüft |
| Q8 | § 3a Salzburger Pflanzenschutzmittelgesetz 2014, in Kraft seit 01.07.2026, via JUSLINE: <https://www.jusline.at/gesetz/sbg__pmg_2014/paragraf/3a> |
| Q9 | DVO (EU) 2025/2203 (Verschiebung auf 1.1.2027): <https://umwelt-online.de/recht/eu/25d/25d_2203.htm>; Behördeninfo Hamburg: <https://www.hamburg.de/politik-und-verwaltung/behoerden/bwai/themen/pflanzenschutz/die-eu-durchfuehrungsverordnung-zur-digitalen-maschinenlesbaren-dokumentation-von-pflanzenschutzmittel-anwendungen-1124050>; Begutachtungsentwurf Wien: <https://www.wien.gv.at/recht/landesrecht-wien/begutachtung/pdf/2026003-05052026.pdf> ⚠️ |
| Q10 | LK Oberösterreich, „Pflanzenschutzmittel- und Biozideinsatz aufzeichnen“: <https://ooe.lko.at/pflanzenschutzmittel-und-biozideinsatz-aufzeichnen+2400+2411799> ⚠️ (nur Auszug, Alter des Artikels unbekannt) |
| Q11 | LK Niederösterreich, „ÖPUL 2023: Maßnahmen mit Aufzeichnungspflichten“ (17.02.2023): <https://noe.lko.at/öpul-2023-maßnahmen-mit-aufzeichnungspflichten+2400+3778095> |
| Q12 | USP, „Rinder – Führung des Registers“ (Stand 01.01.2026): <https://www.usp.gv.at/themen/brancheninformationen/landwirtschaft/rinder/rinder-fuehrung-des-registers.html> |
| Q13 | USP, „Rinder – Meldung an die elektronische Datenbank“: <https://www.usp.gv.at/themen/brancheninformationen/landwirtschaft/rinder/rinder-meldung-an-die-elektronische-datenbank.html> ⚠️ (nur Auszug) |
| Q14 | § 7 Rinderkennzeichnungs-Verordnung 2021: <https://gesetzefinden.at/bundesrecht/verordnungen/20011525/para-7> ⚠️ (nur Auszug) |
| Q15 | USP, „Tierseuchen – Aufzeichnungspflichten“ (Stand 13.08.2026): <https://www.usp.gv.at/themen/brancheninformationen/landwirtschaft/tierseuchen/tierseuchen-aufzeichnungspflichten.html> |
| Q16 | USP, „Lebensmittelsicherheit – Arzneimittel“ (Stand 13.08.2026): <https://www.usp.gv.at/themen/brancheninformationen/landwirtschaft/lebensmittelsicherheit/lebensmittelsicherheit-arzneimittel.html> |
| Q17 | USP, „Tierarzneimittel – Dokumentation“: <https://www.usp.gv.at/themen/brancheninformationen/tieraerzte/tierarzneimittel/tierarzneimittel-dokumentation.html> |
| Q18 | Land Oberösterreich, TGD-Arzneimittel-Dokumentation: <https://land-oberoesterreich.gv.at/Mediendateien/Formulare/Dokumente_BH_RO/tgd_arzneimittel.pdf> ⚠️ (nur Auszug, Rechtsstand unklar) |
| Q19 | USP, „Lebensmittelsicherheit – Eigenkontrollpflichten“: <https://www.usp.gv.at/themen/brancheninformationen/landwirtschaft/lebensmittelsicherheit/lebensmittelsicherheit-eigenkontrollpflichten.html> |
| Q20 | Bio: Art. 34 Abs. 5 VO (EU) 2018/848 (laut Schulungsunterlage <https://www.oekolandbau.de/fileadmin/redaktion/dokumente/Zertifizierung/Lehrgang_OEko-Kontrolle/13_Betriebsuebliche_Dokumentation.pdf>); Bio Austria Beratungsblatt Tierzukauf: <https://www.bio-austria.at/app/uploads/2026/07/beratungsblatt-tierzukauf20260701.pdf>; Checkliste Vorsorgemaßnahmen: <https://cdn.bio-austria.at/app/uploads/2022/01/checklist-vorsorgemassnahmen-formular-2023-03.pdf> ⚠️ |
| Q21 | § 132 BAO (Auszug): <https://www.gemeindebund.steiermark.at/fileadmin/user_upload/Service-Vorlagen/BAO_Registrierkassenpflicht/04_BAO-Auszug_-______131_bis_132_-_a-___163__325_-_45-__per_2015___2016___2017.pdf>; LK OÖ „Aufzeichnungspflichten in der Teilpauschalierung“: <https://ooe.lko.at/rechtstipp-aufzeichnungspflichten-in-der-teilpauschalierung+2400+2433255> ⚠️ |

> **Hinweis:** Dieses Dokument ersetzt keine Rechtsberatung. Verbindlich ist der Rechtstext im RIS (<https://www.ris.bka.gv.at>) bzw. im EUR-Lex. Auskunft geben die Landwirtschaftskammer und die AMA.
