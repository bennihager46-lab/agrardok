// Lädt Regel- und Katalogdateien aus /rules (offline über den Service Worker).
// Vorerst nur Laden mit Zwischenspeicher; die Auswahl nach Stichtag (gueltig_ab/gueltig_bis)
// und das Regel-Schema folgen mit MVP-06.

const cache = new Map();

export function lade(name, basis = new URL("../rules/", import.meta.url)) {
  if (!cache.has(name)) {
    cache.set(name, fetch(new URL(`${name}.json`, basis)).then((a) => {
      if (!a.ok) throw new Error(`Regeldatei ${name} nicht gefunden (${a.status})`);
      return a.json();
    }).catch((e) => {
      cache.delete(name);
      throw e;
    }));
  }
  return cache.get(name);
}
