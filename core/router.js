// Hash-Router (#/start, #/einstellungen …) – funktioniert auf GitHub Pages ohne Server-Konfiguration.

const routen = new Map();
let ziel = null;

export function route(pfad, { titel, render }) {
  routen.set(pfad, { titel, render });
}

export function aktuellerPfad() {
  return location.hash.replace(/^#\/?/, "").split("?")[0] || "start";
}

/** Parameter nach dem „?“ im Hash, z. B. #/person?id=… */
export function parameter() {
  const teil = location.hash.split("?")[1] ?? "";
  return new URLSearchParams(teil);
}

export function gehe(pfad) {
  location.hash = `#/${pfad}`;
}

export function starte(container) {
  ziel = container;
  addEventListener("hashchange", zeige);
  return zeige();
}

export async function zeige() {
  const pfad = routen.has(aktuellerPfad()) ? aktuellerPfad() : "start";
  const r = routen.get(pfad);
  document.title = `${r.titel} – AGRARDOK+`;
  // Navigationspunkt markieren; data-routen nennt Unterseiten, die zum selben Punkt gehören
  for (const link of document.querySelectorAll("[data-route]")) {
    const zugehoerig = (link.dataset.routen ?? link.dataset.route).split(" ");
    if (zugehoerig.includes(pfad)) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  }
  ziel.replaceChildren();
  scrollTo(0, 0); // vor dem Zeichnen, damit die neue Seite nicht kurz an der alten Position erscheint
  ziel.dataset.seite = pfad;
  await r.render(ziel);
  // Fokus auf die Überschrift, damit Screenreader den Seitenwechsel ansagen
  const ueberschrift = ziel.querySelector("h1");
  if (ueberschrift) {
    ueberschrift.tabIndex = -1;
    ueberschrift.focus({ preventScroll: true });
  }
}
