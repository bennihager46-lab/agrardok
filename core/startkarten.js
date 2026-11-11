// Module melden hier Karten für die Startseite an (z. B. Warnungen zu Fristen).
// So bleibt die Abhängigkeit einseitig: Module → core, nie core → Module.
// Grundstein für die Fristenzentrale (Roadmap V1-09).

const anbieter = [];

/** fn: async () => HTMLElement | null */
export function registriereStartkarte(fn) {
  anbieter.push(fn);
}

export async function startkarten() {
  const karten = await Promise.all(anbieter.map((fn) => fn().catch((e) => {
    console.error("Startkarte fehlgeschlagen:", e);
    return null;
  })));
  return karten.filter(Boolean);
}
