// Fristen-Registry für den Fristenkalender und Erinnerungen (Roadmap V1-09). Module melden Anbieter an;
// die Abhängigkeit bleibt einseitig (Module → core).
//
// Eine Frist: { datum: "JJJJ-MM-TT", titel, text?, quelle?: {text, url}, modul, schluessel (eindeutig, für „schon erinnert“), href? }

import * as daten from "./daten.js";
import { heute } from "./bestand.js";

const anbieter = [];

/** fn: async (betrieb, {von, bis}) => Frist[] */
export function registriereFristen(fn) {
  anbieter.push(fn);
}

export async function fristen(betrieb, { von = heute(), tage = 120 } = {}) {
  const bis = new Date(Date.parse(`${von}T00:00:00Z`) + tage * 86_400_000).toISOString().slice(0, 10);
  const listen = await Promise.all(anbieter.map((fn) => fn(betrieb, { von, bis }).catch((e) => {
    console.error("Fristen-Anbieter fehlgeschlagen:", e);
    return [];
  })));
  return listen.flat().filter((f) => f.datum >= von && f.datum <= bis).sort((a, b) => a.datum.localeCompare(b.datum) || a.titel.localeCompare(b.titel, "de"));
}

/** Nächstes Auftreten eines jährlichen Termins (MM-TT) ab „von“. */
export function naechstes(mmtt, von = heute()) {
  const jahr = Number(von.slice(0, 4));
  const d = `${jahr}-${mmtt}`;
  return d >= von ? d : `${jahr + 1}-${mmtt}`;
}

// ---------- Erinnerungen (lokale Benachrichtigungen) ----------
// Ohne Server gibt es keine echten Push-Nachrichten: Die App prüft beim Öffnen (und wenn sie wieder in den
// Vordergrund kommt), ob eine Frist in den nächsten Tagen fällig ist, und zeigt dann eine Benachrichtigung.

export const ERINNERN_TAGE = 7;

export async function erinnerungenAktiv() {
  return (await daten.metaLesen("erinnerungen")) === true && typeof Notification !== "undefined" && Notification.permission === "granted";
}

export async function erinnerungenEinschalten() {
  if (typeof Notification === "undefined") throw new Error("Dieser Browser kann keine Benachrichtigungen anzeigen.");
  const erlaubt = await Notification.requestPermission();
  if (erlaubt !== "granted") throw new Error("Benachrichtigungen wurden nicht erlaubt. Das lässt sich in den Browser-Einstellungen ändern.");
  await daten.metaSchreiben("erinnerungen", true);
}

export const erinnerungenAus = () => daten.metaSchreiben("erinnerungen", false);

/** Zeigt für bald fällige Fristen je eine Benachrichtigung (jede nur einmal). */
export async function erinnere(betrieb) {
  if (!betrieb || !(await erinnerungenAktiv())) return 0;
  const gezeigt = new Set((await daten.metaLesen("erinnert")) ?? []);
  const faellig = (await fristen(betrieb, { tage: ERINNERN_TAGE })).filter((f) => !gezeigt.has(f.schluessel));
  const reg = await navigator.serviceWorker?.getRegistration?.();
  for (const f of faellig) {
    const text = `${f.datum.split("-").reverse().join(".")}: ${f.text ?? f.titel}`;
    if (reg?.showNotification) await reg.showNotification(f.titel, { body: text, tag: f.schluessel, icon: "icons/icon-192.png", data: { href: f.href ?? "#/fristen" } });
    else new Notification(f.titel, { body: text, tag: f.schluessel });
    gezeigt.add(f.schluessel);
  }
  await daten.metaSchreiben("erinnert", [...gezeigt].slice(-500));
  return faellig.length;
}
