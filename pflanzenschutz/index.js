// Einstieg des Moduls „Pflanzenschutz“: Erfassung mit Prüfungen, Aufzeichnungsliste mit CSV-Export, Fristen.

import * as daten from "../core/daten.js";
import { registriereFristen } from "../core/fristen.js";
import { renderPsmErfassen } from "./erfassen.js";
import { renderPsmBericht } from "./bericht.js";

export function registriere(route) {
  route("pflanzenschutz-erfassen", { titel: "Pflanzenschutz", render: renderPsmErfassen });
  route("psm-bericht", { titel: "Pflanzenschutz-Aufzeichnungen", render: renderPsmBericht });
  registriereFristen(psmFristen);
}

/** Ende von Zulassung/Aufbrauchfrist, Sachkundeausweis und Geräteprüfung. */
async function psmFristen(betrieb) {
  const [bm, personen, maschinen] = await Promise.all([
    daten.liste("betriebsmittel", { index: "betrieb_id", wert: betrieb.id }),
    daten.liste("person", { index: "betrieb_id", wert: betrieb.id }),
    daten.liste("maschine", { index: "betrieb_id", wert: betrieb.id }),
  ]);
  const f = [];
  for (const b of bm.filter((x) => x.art === "psm" && x.aktiv !== false)) {
    if (b.psm?.zulassung_gueltig_bis) f.push({ datum: b.psm.zulassung_gueltig_bis, titel: `Zulassung endet: ${b.name}`, text: "Aufbrauchfrist im Register prüfen.", href: `#/betriebsmittel-eintrag?id=${b.id}` });
    if (b.psm?.aufbrauch_bis) f.push({ datum: b.psm.aufbrauch_bis, titel: `Aufbrauchfrist endet: ${b.name}`, text: "Danach darf das Mittel nicht mehr verwendet werden.", href: `#/betriebsmittel-eintrag?id=${b.id}` });
  }
  for (const p of personen.filter((x) => x.aktiv !== false && x.psm_ausbildungsbescheinigung?.gueltig_bis)) {
    f.push({ datum: p.psm_ausbildungsbescheinigung.gueltig_bis, titel: `Sachkundeausweis läuft ab: ${p.name}`, text: "Rechtzeitig Fortbildung bzw. Verlängerung planen.", href: `#/person?id=${p.id}` });
  }
  for (const m of maschinen.filter((x) => x.geraetepruefung?.gueltig_bis)) {
    f.push({ datum: m.geraetepruefung.gueltig_bis, titel: `Geräteprüfung fällig: ${m.name}`, text: "Prüfplakette läuft ab.", href: `#/maschine?id=${m.id}` });
  }
  return f.map((x) => ({ ...x, modul: "pflanzenschutz", schluessel: `psm|${x.titel}|${x.datum}` }));
}
