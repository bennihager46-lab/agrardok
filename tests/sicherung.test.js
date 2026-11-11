import { gruppe, test, pruefe } from "./runner.js";
import * as daten from "../core/daten.js";
import * as sicherung from "../core/sicherung.js";
import { uuid } from "../core/ids.js";

const frischeDb = () => daten.init({ name: `test-sicherung-${uuid()}` });
const text = (obj) => JSON.stringify(obj);

async function musterbetrieb() {
  const antwort = await fetch("../testdaten/musterbetrieb.json");
  return antwort.text();
}

async function beispieldaten() {
  const b = await daten.speichern("betrieb", { name: "Testhof", bundesland: "ST" });
  const fs = await daten.speichern("feldstueck", { betrieb_id: b.id, name: "Hausacker", nutzungsart: "acker", flaeche_ha: 2.5 });
  await daten.speichern("feldstueck", { ...fs, flaeche_ha: 2.6 });
  return { b, fs };
}

gruppe("sicherung", () => {
  test("Export hat das Austauschformat", async () => {
    await frischeDb();
    const { b } = await beispieldaten();
    const exp = await sicherung.erstelleExport();
    pruefe.gleich(exp.format, "agrardok-export");
    pruefe.gleich(exp.schema_version, daten.SCHEMA_VERSION);
    pruefe.gleich(exp.betrieb_id, b.id);
    pruefe.gleich(exp.daten.feldstuecke.length, 1);
    pruefe.gleich(exp.aenderungen.length, 3);
    pruefe.wahr(sicherung.dateiname().startsWith("agrardok-sicherung-"));
    await daten.datenbankLoeschen();
  });

  test("Rundlauf: Export → Datenbank löschen → Import ergibt dieselben Daten", async () => {
    await frischeDb();
    await beispieldaten();
    const exp = await sicherung.erstelleExport();
    await daten.datenbankLoeschen();
    await frischeDb();
    const { fehler, obj, vorschau } = await sicherung.pruefeImport(text(exp));
    pruefe.tiefGleich(fehler, []);
    pruefe.gleich(sicherung.summe(vorschau).neu, 2);
    await sicherung.importiere(obj);
    const nachher = await sicherung.erstelleExport();
    pruefe.tiefGleich(nachher.daten, exp.daten);
    pruefe.tiefGleich(nachher.aenderungen, exp.aenderungen);
    await daten.datenbankLoeschen();
  });

  test("Testdaten des Musterbetriebs lassen sich importieren, zweiter Import ändert nichts", async () => {
    await frischeDb();
    const datei = await musterbetrieb();
    const erst = await sicherung.pruefeImport(datei);
    pruefe.tiefGleich(erst.fehler, []);
    pruefe.gleich(sicherung.summe(erst.vorschau).neu, 51);
    await sicherung.importiere(erst.obj);
    const zweit = await sicherung.pruefeImport(datei);
    const s = sicherung.summe(zweit.vorschau);
    pruefe.gleich(s.neu, 0);
    pruefe.gleich(s.unveraendert, 51);
    pruefe.gleich((await daten.liste("massnahme")).length, 14);
    await daten.datenbankLoeschen();
  });

  test("Ältere Sicherungen (vor der Umbenennung in AGRARDOK+) lassen sich importieren", async () => {
    await frischeDb();
    const alt = JSON.parse(await musterbetrieb());
    alt.format = "agraropen-export";
    const { fehler, vorschau } = await sicherung.pruefeImport(text(alt));
    pruefe.tiefGleich(fehler, []);
    pruefe.gleich(sicherung.summe(vorschau).neu, 51);
    await daten.datenbankLoeschen();
  });

  test("Nach dem Import liegen neue Zeitstempel hinter den importierten", async () => {
    await frischeDb();
    const exp = JSON.parse(await musterbetrieb());
    const hoechste = [...Object.values(exp.daten).flat(), ...exp.aenderungen].map((d) => d.hlc).filter(Boolean).sort().at(-1);
    exp.daten.betriebe[0].hlc = "2099-01-01T00:00:00.000Z-0000-0a000000"; // Gerät mit vorgehender Uhr
    const { obj } = await sicherung.pruefeImport(text(exp));
    await sicherung.importiere(obj);
    const neu = await daten.speichern("person", { betrieb_id: exp.betrieb_id, name: "Neu", rolle: "familie" });
    pruefe.wahr(neu.hlc > "2099-01-01T00:00:00.000Z-0000-0a000000", `HLC ${neu.hlc}`);
    pruefe.wahr(!!hoechste);
    await daten.datenbankLoeschen();
  });

  test("Höhere rev aktualisiert, niedrigere bleibt, gleiche rev mit anderem Inhalt ist Konflikt", async () => {
    await frischeDb();
    const { fs } = await beispieldaten(); // fs ist rev 1, lokal rev 2
    const lokal = await daten.hole("feldstueck", fs.id);
    const exp = await sicherung.erstelleExport();
    const basis = exp.daten.feldstuecke[0];

    const hoeher = { ...exp, daten: { feldstuecke: [{ ...basis, rev: 3, name: "Hausacker groß" }] }, aenderungen: undefined };
    const niedriger = { ...exp, daten: { feldstuecke: [{ ...basis, rev: 1, name: "Uralt" }] }, aenderungen: undefined };
    const konflikt = { ...exp, daten: { feldstuecke: [{ ...basis, name: "Anderswo geändert" }] }, aenderungen: undefined };

    let r = await sicherung.pruefeImport(text(niedriger));
    pruefe.gleich(r.vorschau.sammlungen.feldstuecke.lokal_neuer, 1);
    r = await sicherung.pruefeImport(text(konflikt));
    pruefe.gleich(r.vorschau.sammlungen.feldstuecke.konflikt, 1);
    await sicherung.importiere(r.obj);
    pruefe.gleich((await daten.hole("feldstueck", fs.id)).name, lokal.name, "Konflikt: lokaler Stand bleibt");
    r = await sicherung.pruefeImport(text(hoeher));
    pruefe.gleich(r.vorschau.sammlungen.feldstuecke.aktualisiert, 1);
    await sicherung.importiere(r.obj);
    pruefe.gleich((await daten.hole("feldstueck", fs.id)).name, "Hausacker groß");
    await daten.datenbankLoeschen();
  });

  test("Ungültige Dateien werden mit verständlicher Meldung abgelehnt", async () => {
    await frischeDb();
    pruefe.wahr((await sicherung.pruefeImport("kein json")).fehler[0].includes("keine gültige JSON"));
    pruefe.wahr((await sicherung.pruefeImport(text({ format: "anders" }))).fehler[0].includes("keine Sicherungsdatei von AGRARDOK+"));
    const neuer = { format: "agrardok-export", schema_version: "0.99", daten: {} };
    pruefe.wahr((await sicherung.pruefeImport(text(neuer))).fehler[0].includes("neueren App-Version"));
    const kaputt = { format: "agrardok-export", schema_version: "0.1", daten: { schlaege: [{ id: "123", rev: 1 }] } };
    pruefe.wahr((await sicherung.pruefeImport(text(kaputt))).fehler[0].includes("ungültige oder fehlende id"));
    await daten.datenbankLoeschen();
  });
});
