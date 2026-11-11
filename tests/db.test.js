import { gruppe, test, pruefe } from "./runner.js";
import { oeffne, anfrage, transaktion, loescheDatenbank } from "../core/db.js";
import { uuid } from "../core/ids.js";

const m1 = {
  version: 1,
  beschreibung: "Store tier",
  ausfuehren(db) {
    db.createObjectStore("tier", { keyPath: "id" });
  },
};
const m2 = {
  version: 2,
  beschreibung: "Index + Datenumbau: name → bezeichnung",
  ausfuehren(db, tx) {
    const store = tx.objectStore("tier");
    store.createIndex("bezeichnung", "bezeichnung");
    store.openCursor().onsuccess = (e) => {
      const cursor = e.target.result;
      if (!cursor) return;
      const { name, ...rest } = cursor.value;
      cursor.update({ ...rest, bezeichnung: name });
      cursor.continue();
    };
  },
};

gruppe("db", () => {
  test("Migrationen laufen nacheinander und bauen Daten um", async () => {
    const name = `test-db-${uuid()}`;
    let db = await oeffne(name, [m1]);
    pruefe.gleich(db.version, 1);
    await transaktion(db, "tier", "readwrite", (tx) => anfrage(tx.objectStore("tier").put({ id: "a", name: "Berta" })));
    db.close();

    db = await oeffne(name, [m1, m2]);
    pruefe.gleich(db.version, 2);
    const treffer = await transaktion(db, "tier", "readonly", (tx) => anfrage(tx.objectStore("tier").index("bezeichnung").get("Berta")));
    pruefe.tiefGleich(treffer, { id: "a", bezeichnung: "Berta" });
    db.close();
    await loescheDatenbank(name);
  });

  test("Falsch nummerierte Migration wird abgelehnt", async () => {
    await pruefe.wirft(() => oeffne(`test-db-${uuid()}`, [m2]), "erwartet 1");
  });

  test("Fehler in einer Transaktion schreibt nichts", async () => {
    const name = `test-db-${uuid()}`;
    const db = await oeffne(name, [m1]);
    await pruefe.wirft(() =>
      transaktion(db, "tier", "readwrite", async (tx) => {
        await anfrage(tx.objectStore("tier").put({ id: "x" }));
        throw new Error("absichtlich");
      }), "absichtlich");
    const anzahl = await transaktion(db, "tier", "readonly", (tx) => anfrage(tx.objectStore("tier").count()));
    pruefe.gleich(anzahl, 0);
    db.close();
    await loescheDatenbank(name);
  });
});
