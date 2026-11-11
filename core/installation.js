// Installation als App (Android: Installations-Dialog; iOS: Anleitung „Zum Home-Bildschirm“).

let ereignis = null;
const hoerer = new Set();
const melde = () => hoerer.forEach((f) => f());

export function initInstallation() {
  addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    ereignis = e;
    melde();
  });
  addEventListener("appinstalled", () => {
    ereignis = null;
    melde();
  });
}

export const istInstalliert = () =>
  matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;

export const istIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

export const kannInstallieren = () => ereignis !== null;

export async function installieren() {
  if (!ereignis) return false;
  ereignis.prompt();
  const { outcome } = await ereignis.userChoice;
  ereignis = null;
  melde();
  return outcome === "accepted";
}

export function beiAenderung(f) {
  hoerer.add(f);
  return () => hoerer.delete(f);
}
