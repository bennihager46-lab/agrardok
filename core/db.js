// Schlanker IndexedDB-Wrapper mit Versionierung über eine Migrationsliste.
//
// Eine Migration ist ein Objekt { version, beschreibung, ausfuehren(db, tx) }.
// Die Datenbank-Version ist immer migrationen.length. Beim Öffnen werden alle
// fehlenden Migrationen der Reihe nach in der Upgrade-Transaktion ausgeführt.
//
// WICHTIG für ausfuehren(): Nur synchron mit db/tx arbeiten (createObjectStore,
// tx.objectStore(...).openCursor() mit onsuccess-Callbacks). Kein await auf
// fremde Promises – sonst schließt der Browser die Upgrade-Transaktion vorzeitig.

export function anfrage(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function oeffne(name, migrationen) {
  pruefeMigrationen(migrationen);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(name, migrationen.length);

    req.onupgradeneeded = (ereignis) => {
      const db = req.result;
      const tx = req.transaction;
      for (let v = ereignis.oldVersion; v < ereignis.newVersion; v++) {
        migrationen[v].ausfuehren(db, tx);
      }
    };

    req.onblocked = () => {
      // Ein anderer Tab hält noch die alte Version offen.
      globalThis.dispatchEvent?.(new CustomEvent("agrardok:db-blockiert"));
    };

    req.onsuccess = () => {
      const db = req.result;
      // Öffnet ein anderer Tab eine neuere Version, geben wir die Verbindung frei.
      db.onversionchange = () => {
        db.close();
        globalThis.dispatchEvent?.(new CustomEvent("agrardok:db-veraltet"));
      };
      resolve(db);
    };
    req.onerror = () => reject(req.error);
  });
}

function pruefeMigrationen(migrationen) {
  migrationen.forEach((m, i) => {
    if (m.version !== i + 1) {
      throw new Error(`Migration an Position ${i} hat version ${m.version}, erwartet ${i + 1}`);
    }
    if (typeof m.ausfuehren !== "function") throw new Error(`Migration ${m.version} ohne ausfuehren()`);
  });
}

/**
 * Führt fn(tx) in einer Transaktion aus und liefert dessen Ergebnis,
 * sobald die Transaktion erfolgreich abgeschlossen ist (oder den Fehler).
 * In fn nur IndexedDB-Anfragen awaiten, nichts anderes.
 */
export function transaktion(db, stores, modus, fn) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(stores, modus);
    let ergebnis;
    let fehler = null;
    tx.oncomplete = () => resolve(ergebnis);
    tx.onabort = () => reject(fehler ?? tx.error ?? new Error("Transaktion abgebrochen"));
    tx.onerror = () => {
      fehler = fehler ?? tx.error;
    };
    Promise.resolve()
      .then(() => fn(tx))
      .then((r) => {
        ergebnis = r;
      })
      .catch((e) => {
        fehler = e;
        try {
          tx.abort();
        } catch {
          /* bereits beendet */
        }
      });
  });
}

export function loescheDatenbank(name) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(name);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    // Blockiert = ein anderer Tab hält die Datenbank noch offen. Weiter warten (sonst würde ein
    // sofortiges Neu-Öffnen hinter dem Löschauftrag hängen) und der Seite Bescheid geben.
    req.onblocked = () => globalThis.dispatchEvent?.(new CustomEvent("agrardok:loeschen-blockiert"));
  });
}
