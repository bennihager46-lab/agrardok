// Einstieg der App: Datenbank öffnen, Seiten registrieren, Service Worker anmelden.

import * as daten from "./daten.js";
import { route, starte } from "./router.js";
import { initInstallation } from "./installation.js";
import { h, meldung } from "./ui/dom.js";
import { renderStart } from "./seiten/start.js";
import { renderEinstellungen } from "./seiten/einstellungen.js";
import * as stammdaten from "../stammdaten/index.js";
import * as flaechen from "../flaechen/index.js";
import * as betriebsmittel from "../betriebsmittel/index.js";
import * as schlagkartei from "../schlagkartei/index.js";
import * as duengung from "../duengung/index.js";
import * as pflanzenschutz from "../pflanzenschutz/index.js";
import * as oepul from "../oepul/index.js";
import * as boden from "../boden/index.js";
import * as feldnotiz from "../feldnotiz/index.js";
import { erinnere } from "./fristen.js";
import { aktiverBetrieb } from "./betrieb.js";

async function start() {
  const inhalt = document.getElementById("inhalt");
  initInstallation();
  zeigeVerbindung();

  try {
    await daten.init();
  } catch (e) {
    console.error(e);
    inhalt.replaceChildren(
      h("h1", {}, "Speicher nicht verfügbar"),
      h("p", {}, "AGRARDOK+ kann auf diesem Gerät keine Daten speichern. Häufige Ursache: privates bzw. Inkognito-Fenster. Bitte in einem normalen Browserfenster öffnen."),
      h("p", { class: "klein" }, `Technische Meldung: ${e.message}`),
    );
    return;
  }

  route("start", { titel: "Start", render: renderStart });
  stammdaten.registriere(route);
  flaechen.registriere(route);
  betriebsmittel.registriere(route);
  for (const modul of [schlagkartei, duengung, pflanzenschutz, oepul, boden, feldnotiz]) modul.registriere(route);
  route("einstellungen", { titel: "Einstellungen", render: renderEinstellungen });
  await starte(inhalt);

  addEventListener("agrardok:db-veraltet", () =>
    meldung("Die App wurde in einem anderen Fenster aktualisiert. Bitte diese Seite neu laden.", "warnung", 15000));

  registriereServiceWorker();
  document.documentElement.dataset.bereit = "ja"; // für automatische Tests

  // Erinnerungen an Fristen beim Öffnen und wenn die App wieder in den Vordergrund kommt
  const erinnern = () => aktiverBetrieb().then(erinnere).catch((e) => console.warn("Erinnerungen:", e));
  erinnern();
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") erinnern(); });
}

function zeigeVerbindung() {
  const anzeige = document.getElementById("verbindung");
  const aktualisiere = () => {
    anzeige.hidden = navigator.onLine;
  };
  addEventListener("online", aktualisiere);
  addEventListener("offline", aktualisiere);
  aktualisiere();
}

async function registriereServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  let updateAngefordert = false;
  try {
    const reg = await navigator.serviceWorker.register("./sw.js");
    if (!reg) return; // z. B. wenn der Browser Service Worker blockiert
    const biete = (wartend) => {
      const leiste = document.getElementById("update");
      leiste.replaceChildren(
        h("span", {}, "Eine neue Version ist bereit."),
        h("button", { class: "knopf knopf-klein", type: "button", onclick: () => {
          updateAngefordert = true;
          wartend.postMessage({ typ: "SKIP_WAITING" });
        } }, "Jetzt laden"),
      );
      leiste.hidden = false;
    };
    if (reg.waiting && navigator.serviceWorker.controller) biete(reg.waiting);
    reg.addEventListener("updatefound", () => {
      const neu = reg.installing;
      neu?.addEventListener("statechange", () => {
        if (neu.state === "installed" && navigator.serviceWorker.controller) biete(neu);
      });
    });
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (updateAngefordert) location.reload();
    });
  } catch (e) {
    console.warn("Service Worker konnte nicht registriert werden:", e);
  }
}

start();
