Projekt: "AGRARDOK+" – ein kostenloses Open-Source-Ökosystem für landwirtschaftliche
Aufzeichnungen in Österreich.

Zielgruppe: kleine bis mittlere Familienbetriebe (Ackerbau, Grünland, Rinder/Schweine),
oft wenig IT-Erfahrung, Nutzung hauptsächlich am Handy, teils ohne Internet.

Technische Leitplanken:
- Progressive Web App, Mobile First, offline-fähig (Service Worker + IndexedDB)
- Zuerst ohne Build-Tooling lauffähig (HTML/CSS/JS), hostbar auf GitHub Pages
- Daten lokal; Export/Import als JSON und CSV; Flächen als GeoJSON
- Gemeinsames Datenmodell für alle Module (Betrieb, Feldstück, Schlag, Kultur, Tier,
  Betriebsmittel, Maschine, Person, Maßnahme)
- Rechtsregeln (Grenzwerte, Sperrfristen, Wartezeiten) in versionierten JSON-Dateien
  unter /rules mit Feldern "quelle", "gueltig_ab", "gueltig_bis"
- Sprache der Oberfläche: Deutsch (österreichische Begriffe: Feldstück, Schlag,
  Mehrfachantrag, eAMA, ÖPUL)
- Barrierearm: große Buttons, hoher Kontrast (Sonnenlicht!), wenig Tipparbeit

Arbeitsweise: Erkläre kurz, was du vorhast, baue in kleinen Schritten, schreibe
Testdaten für einen fiktiven Musterbetrieb mit, und halte die README aktuell.
Keine Texte, Logos oder Oberflächen kommerzieller Produkte kopieren.