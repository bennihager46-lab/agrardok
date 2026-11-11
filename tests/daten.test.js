import { gruppe, test, pruefe } from "./runner.js";
import * as daten from "../core/daten.js";
import { uuid } from "../core/ids.js";

async function frischeDb() {
  await daten.init({ name: `test-daten-${uuid()}` });
}

async function protokoll(datensatzId) {
  const { anfrage, transaktion } = await import("../core/db.js");
  return transaktion(daten.verbindung(), "aenderungen", "readonly", (tx) =>
    anfrage(tx.objectStore("aenderungen").index("datensatz_id").getAll(datensatzId)));
}

gruppe("daten", () => {
  test("init erzeugt dauerhafte Geräte-ID", async () => {
    const name = `test-daten-${uuid()}`;
    const { geraetId } = await daten.init({ name });
    const zweites = await daten.init({ name });
    pruefe.gleich(zweites.geraetId, geraetId);
    await daten.datenbankLoeschen();
  });

  test("Anlegen ergänzt Basisfelder und protokolliert", async () => {
    await frischeDb();
    const b = await daten.speichern("betrieb", { name: "Testhof", bundesland: "NOE" });
    pruefe.gleich(b.rev, 1);
    pruefe.gleich(b.betrieb_id, b.id, "Betrieb verweist auf sich selbst:");
    pruefe.wahr(b.hlc && b.geraet_id && b.erstellt_am && b.geaendert_am);
    const p = await protokoll(b.id);
    pruefe.gleich(p.length, 1);
    pruefe.gleich(p[0].operation, "anlegen");
    pruefe.gleich(p[0].felder.name, "Testhof");
    await daten.datenbankLoeschen();
  });

  test("Ändern erhöht rev und protokolliert nur geänderte Felder", async () => {
    await frischeDb();
    const b = await daten.speichern("betrieb", { name: "Testhof", bundesland: "NOE" });
    const b2 = await daten.speichern("betrieb", { ...b, name: "Testhof Neu" });
    pruefe.gleich(b2.rev, 2);
    pruefe.gleich(b2.erstellt_am, b.erstellt_am);
    pruefe.wahr(b2.hlc > b.hlc);
    const p = await protokoll(b.id);
    pruefe.gleich(p.length, 2);
    const aenderung = p.find((e) => e.operation === "aendern");
    pruefe.tiefGleich(aenderung.felder, { name: "Testhof Neu" });
    await daten.datenbankLoeschen();
  });

  test("Speichern ohne Änderung erzeugt keinen neuen Eintrag", async () => {
    await frischeDb();
    const b = await daten.speichern("betrieb", { name: "Testhof", bundesland: "NOE" });
    const gleich = await daten.speichern("betrieb", { ...b });
    pruefe.gleich(gleich.rev, 1);
    pruefe.gleich((await protokoll(b.id)).length, 1);
    await daten.datenbankLoeschen();
  });

  test("Löschen setzt nur die Löschmarke", async () => {
    await frischeDb();
    const b = await daten.speichern("betrieb", { name: "Testhof", bundesland: "NOE" });
    await daten.loeschen("betrieb", b.id);
    pruefe.gleich((await daten.liste("betrieb")).length, 0);
    const alle = await daten.liste("betrieb", { mitGeloeschten: true });
    pruefe.gleich(alle.length, 1);
    pruefe.gleich(alle[0].geloescht, true);
    pruefe.wahr((await protokoll(b.id)).some((e) => e.operation === "loeschen"));
    await daten.datenbankLoeschen();
  });

  test("Index-Abfrage über mehrere Schläge (multiEntry)", async () => {
    await frischeDb();
    const b = await daten.speichern("betrieb", { name: "Testhof", bundesland: "NOE" });
    const s1 = uuid();
    const s2 = uuid();
    await daten.speichern("massnahme", { betrieb_id: b.id, art: "sonstiges", datum: "2026-03-01", schlag_ids: [s1, s2], details: {} });
    await daten.speichern("massnahme", { betrieb_id: b.id, art: "sonstiges", datum: "2026-07-01", schlag_ids: [s2], details: {} });
    pruefe.gleich((await daten.liste("massnahme", { index: "schlag_ids", wert: s1 })).length, 1);
    pruefe.gleich((await daten.liste("massnahme", { index: "schlag_ids", wert: s2 })).length, 2);
    await daten.datenbankLoeschen();
  });

  test("Unbekannte Entität wird abgelehnt", async () => {
    await frischeDb();
    await pruefe.wirft(() => daten.speichern("traktorfarbe", {}), "Unbekannte Entität");
    await daten.datenbankLoeschen();
  });
});
