// Kulturkatalog: mitgelieferte Kulturen (rules/kulturen.json) liegen mit festen IDs in der Datenbank,
// damit Schläge darauf verweisen können – auch offline und über Export/Import hinweg.

import * as daten from "../core/daten.js";
import * as regeln from "../core/regeln.js";

// Merkt sich, für welche Datenbank der Katalog schon geprüft ist. Schlüssel = Geräte-ID, weil eine
// neue Datenbank (z. B. nach „Alle Daten löschen“) immer eine neue Geräte-ID bekommt.
let geprueftFuer = null;

/** Legt fehlende Katalogkulturen an. Bestehende (evtl. vom Nutzer geänderte) bleiben unverändert. */
export async function stelleKatalogSicher() {
  const schluessel = `${daten.info().dbName}|${daten.info().geraetId}`;
  if (geprueftFuer === schluessel) return;
  const [katalog, vorhanden] = await Promise.all([regeln.lade("kulturen"), daten.liste("kultur", { mitGeloeschten: true })]);
  const ids = new Set(vorhanden.map((k) => k.id));
  for (const k of katalog.werte) {
    if (!ids.has(k.id)) await daten.speichern("kultur", k);
  }
  geprueftFuer = schluessel;
}

/** Alle sichtbaren Kulturen: Katalog + eigene des Betriebs, nach Name sortiert. */
export async function kulturen(betriebId) {
  await stelleKatalogSicher();
  return (await daten.liste("kultur"))
    .filter((k) => !k.betrieb_id || k.betrieb_id === betriebId)
    .sort((a, b) => a.name.localeCompare(b.name, "de"));
}

export const normalisiere = (t) => String(t ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

/** Sucht eine Kultur über INVEKOS-Code, sonst über den (amtlichen) Namen. */
export function findeKultur(liste, { code, bezeichnung }) {
  if (code != null && code !== "") {
    const k = liste.find((x) => x.mfa_code === String(code));
    if (k) return k;
  }
  const n = normalisiere(bezeichnung);
  if (!n) return null;
  return liste.find((x) => normalisiere(x.amtlicher_name) === n || normalisiere(x.name) === n) ?? null;
}

export const KATEGORIEN = {
  getreide: "Getreide", mais: "Mais", oelfrucht: "Ölfrucht", leguminose: "Leguminose", hackfrucht: "Hackfrucht",
  gemuese: "Gemüse", feldfutter: "Feldfutter", gruenland: "Grünland", zwischenfrucht: "Zwischenfrucht",
  dauerkultur: "Dauerkultur", brache: "Brache", landschaftselement: "Landschaftselement", sonstige: "Sonstige",
};
