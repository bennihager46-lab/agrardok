// Migrationsliste der Datenbank von AGRARDOK+.
// Regeln:
//  - Neue Migrationen nur HINTEN anhängen, bestehende nie ändern (sie sind auf Geräten schon gelaufen).
//  - version = Position + 1.
//  - Ändert sich die Form der Datensätze, auch SCHEMA_VERSION in core/daten.js und /schema anpassen.
//  - Datenumbau: per Cursor in tx.objectStore(...), nur synchron (siehe core/db.js).

export const ENTITAETEN = [
  "betrieb", "person", "feldstueck", "schlag", "kultur",
  "tier", "betriebsmittel", "maschine", "massnahme",
  "duengeplan", "bodenprobe", "feldnotiz", "anhang",
];

export const MIGRATIONEN = [
  {
    version: 1,
    beschreibung: "Grundstruktur: ein Store je Entität mit Indizes, Änderungsprotokoll, Meta-Daten",
    ausfuehren(db) {
      const stores = {};
      // Feste Liste von Version 1 – nicht ENTITAETEN verwenden, die wächst mit späteren Migrationen.
      for (const name of ["betrieb", "person", "feldstueck", "schlag", "kultur", "tier", "betriebsmittel", "maschine", "massnahme"]) {
        stores[name] = db.createObjectStore(name, { keyPath: "id" });
        stores[name].createIndex("betrieb_id", "betrieb_id");
      }
      stores.schlag.createIndex("jahr", "jahr");
      stores.schlag.createIndex("feldstueck_id", "feldstueck_id");
      stores.massnahme.createIndex("art", "art");
      stores.massnahme.createIndex("datum", "datum");
      stores.massnahme.createIndex("schlag_ids", "schlag_ids", { multiEntry: true });
      stores.massnahme.createIndex("tier_ids", "tier_ids", { multiEntry: true });

      const aenderungen = db.createObjectStore("aenderungen", { keyPath: "id" });
      aenderungen.createIndex("hlc", "hlc");
      aenderungen.createIndex("datensatz_id", "datensatz_id");

      db.createObjectStore("meta", { keyPath: "schluessel" });
    },
  },
  {
    version: 2,
    beschreibung: "Düngeplan, Bodenprobe, Feldnotiz und Anhang (Fotos) als eigene Stores",
    ausfuehren(db) {
      for (const name of ["duengeplan", "bodenprobe", "feldnotiz", "anhang"]) {
        const store = db.createObjectStore(name, { keyPath: "id" });
        store.createIndex("betrieb_id", "betrieb_id");
        if (name === "duengeplan") {
          store.createIndex("schlag_id", "schlag_id");
          store.createIndex("jahr", "jahr");
        }
        if (name === "bodenprobe") store.createIndex("feldstueck_id", "feldstueck_id");
        if (name === "feldnotiz") store.createIndex("schlag_id", "schlag_id");
      }
    },
  },
];
