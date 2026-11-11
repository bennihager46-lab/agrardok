// Minimaler Testrunner ohne Abhängigkeiten. Ergebnis landet im DOM und in window.__testErgebnis
// (damit automatische Tests es auslesen können).

const tests = [];
let gruppeName = "";

export function gruppe(name, fn) {
  gruppeName = name;
  fn();
  gruppeName = "";
}

export function test(name, fn) {
  tests.push({ name: gruppeName ? `${gruppeName} › ${name}` : name, fn });
}

const text = (v) => (typeof v === "string" ? JSON.stringify(v) : JSON.stringify(v, null, 0));

export const pruefe = {
  wahr(wert, nachricht = "Wert ist nicht wahr") {
    if (!wert) throw new Error(nachricht);
  },
  gleich(ist, soll, nachricht = "") {
    if (ist !== soll) throw new Error(`${nachricht} erwartet ${text(soll)}, erhalten ${text(ist)}`.trim());
  },
  tiefGleich(ist, soll, nachricht = "") {
    if (JSON.stringify(sortiert(ist)) !== JSON.stringify(sortiert(soll))) {
      throw new Error(`${nachricht}\n erwartet ${text(sortiert(soll))}\n erhalten ${text(sortiert(ist))}`.trim());
    }
  },
  async wirft(fn, enthaelt = "") {
    try {
      await fn();
    } catch (e) {
      if (enthaelt && !String(e.message).includes(enthaelt)) throw new Error(`Fehlertext „${e.message}“ enthält nicht „${enthaelt}“`);
      return;
    }
    throw new Error("Es wurde kein Fehler geworfen");
  },
};

function sortiert(v) {
  if (Array.isArray(v)) return v.map(sortiert);
  if (v && typeof v === "object") return Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortiert(v[k])]));
  return v;
}

export async function ausfuehren(ausgabe) {
  const ergebnis = { bestanden: 0, fehlgeschlagen: 0, fehler: [], fertig: false };
  const liste = document.createElement("ol");
  ausgabe.append(liste);
  for (const t of tests) {
    const zeile = document.createElement("li");
    try {
      await t.fn();
      ergebnis.bestanden++;
      zeile.className = "ok";
      zeile.textContent = `✔ ${t.name}`;
    } catch (e) {
      ergebnis.fehlgeschlagen++;
      ergebnis.fehler.push({ test: t.name, meldung: e.message });
      zeile.className = "fehler";
      zeile.textContent = `✘ ${t.name}\n   ${e.message}`;
      console.error(t.name, e);
    }
    liste.append(zeile);
  }
  const summe = document.createElement("p");
  summe.className = ergebnis.fehlgeschlagen ? "summe fehler" : "summe ok";
  summe.textContent = `${ergebnis.bestanden} bestanden, ${ergebnis.fehlgeschlagen} fehlgeschlagen`;
  ausgabe.prepend(summe);
  ergebnis.fertig = true;
  window.__testErgebnis = ergebnis;
  return ergebnis;
}
