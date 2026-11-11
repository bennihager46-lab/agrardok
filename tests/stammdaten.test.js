import { gruppe, test, pruefe } from "./runner.js";
import * as daten from "../core/daten.js";
import { uuid } from "../core/ids.js";
import { sachkundeStatus, pruefeBetriebFachlich, aktiverBetrieb, merkeAktivenBetrieb, SACHKUNDE_WARNUNG_TAGE } from "../stammdaten/kontext.js";

const heute = new Date(2026, 10, 11); // 11.11.2026, lokale Zeit
const mitAusweis = (gueltig_bis) => ({ psm_ausbildungsbescheinigung: { nummer: "X", gueltig_bis } });

gruppe("stammdaten", () => {
  test("Sachkundeausweis: Status an den Grenzen", () => {
    pruefe.gleich(sachkundeStatus({}, heute).stufe, "fehlt");
    pruefe.gleich(sachkundeStatus(mitAusweis("2026-11-10"), heute).stufe, "abgelaufen", "gestern abgelaufen:");
    const heuteAb = sachkundeStatus(mitAusweis("2026-11-11"), heute);
    pruefe.gleich(heuteAb.stufe, "bald", "gilt bis einschließlich heute:");
    pruefe.wahr(heuteAb.text.includes("heute"));
    pruefe.gleich(sachkundeStatus(mitAusweis("2026-11-12"), heute).text, "Sachkundeausweis läuft in 1 Tag ab (12.11.2026)");
    pruefe.gleich(SACHKUNDE_WARNUNG_TAGE, 90);
    pruefe.gleich(sachkundeStatus(mitAusweis("2027-02-09"), heute).stufe, "bald", "genau 90 Tage:");
    pruefe.gleich(sachkundeStatus(mitAusweis("2027-02-10"), heute).stufe, "gueltig", "91 Tage:");
  });

  test("Sachkundeausweis: Testdaten ergeben die vorgesehenen Fälle", async () => {
    const muster = await (await fetch("../testdaten/musterbetrieb.json")).json();
    const bio = await (await fetch("../testdaten/biohof.json")).json();
    const stufe = (p) => sachkundeStatus(p, heute).stufe;
    pruefe.tiefGleich(muster.daten.personen.map(stufe), ["gueltig", "bald", "fehlt"]);
    pruefe.tiefGleich(bio.daten.personen.map(stufe), ["abgelaufen", "fehlt", "fehlt"]);
  });

  test("Fachliche Prüfung: ÖPUL Bio nur mit Bio-Bewirtschaftung", () => {
    pruefe.gleich(pruefeBetriebFachlich({ bewirtschaftung: "konventionell", oepul_massnahmen: ["bio"] })[0].pfad, "bewirtschaftung");
    pruefe.tiefGleich(pruefeBetriebFachlich({ bewirtschaftung: "umstellung", oepul_massnahmen: ["bio"] }), []);
    pruefe.tiefGleich(pruefeBetriebFachlich({ bewirtschaftung: "konventionell", oepul_massnahmen: ["ubb"] }), []);
  });

  test("Speichern lehnt ungültigen Betrieb ab und nennt die Felder", async () => {
    await daten.init({ name: `test-stammdaten-${uuid()}` });
    try {
      await daten.speichern("betrieb", { name: "Testhof", bundesland: "NOE", betriebsnummer: "12", bewirtschaftung: "bio" });
      pruefe.wahr(false, "hätte abgelehnt werden müssen");
    } catch (e) {
      pruefe.gleich(e.name, "ValidierungsFehler");
      pruefe.tiefGleich(e.fehler.map((f) => f.pfad).sort(), ["betriebsnummer", "bio_kontrollstelle"]);
    }
    pruefe.gleich((await daten.liste("betrieb")).length, 0, "nichts gespeichert:");
    await daten.datenbankLoeschen();
  });

  test("Aktiver Betrieb: gemerkter, sonst ältester", async () => {
    await daten.init({ name: `test-stammdaten-${uuid()}` });
    pruefe.gleich(await aktiverBetrieb(), null);
    const a = await daten.speichern("betrieb", { name: "Erster", bundesland: "NOE" });
    const b = await daten.speichern("betrieb", { name: "Zweiter", bundesland: "T" });
    pruefe.gleich((await aktiverBetrieb()).id, a.id);
    await merkeAktivenBetrieb(b.id);
    pruefe.gleich((await aktiverBetrieb()).id, b.id);
    await daten.datenbankLoeschen();
  });
});
