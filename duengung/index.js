// Einstieg des Moduls „Düngung“ (NAPV): Erfassung mit Prüfung, Düngeplanung, Jahresbericht, Fristen.

import * as regeln from "../core/regeln.js";
import { registriereFristen, naechstes } from "../core/fristen.js";
import { renderDuengungErfassen } from "./erfassen.js";
import { renderPlanung, renderPlan } from "./planung.js";
import { renderBericht } from "./bericht.js";

export function registriere(route) {
  route("duengung-erfassen", { titel: "Düngung", render: renderDuengungErfassen });
  route("duengeplanung", { titel: "Düngeplanung", render: renderPlanung });
  route("duengeplan", { titel: "Düngeplan", render: renderPlan });
  route("duengebericht", { titel: "Düngebericht", render: renderBericht });
  registriereFristen(napvFristen);
}

/** Jährliche NAPV-Termine. */
async function napvFristen(betrieb, { von }) {
  const r = await regeln.lade("napv/duengung");
  const q = r.werte.quellen;
  const sf = r.werte.sperrfristen;
  const jahrVon = (d) => Number(d.slice(0, 4));
  const abschluss = naechstes("01-31", von);
  const liste = [
    { datum: abschluss, titel: "Düngeaufzeichnungen abschließen", text: `Aufzeichnungen für ${jahrVon(abschluss) - 1} fertigstellen (§ 8 Abs. 3 NAPV).`, quelle: q.s8, href: `#/duengebericht?jahr=${jahrVon(abschluss) - 1}` },
    { datum: naechstes(sf.acker_leichtloeslich.von, von), titel: "Sperrfrist Acker beginnt", text: "Ab heute keine leichtlöslichen N-Dünger auf Acker (Ausnahmen bis 31. Oktober).", quelle: q.s2 },
    { datum: naechstes(sf.gruenland_alle.von, von), titel: "Sperrfrist Grünland und Festmist beginnt", text: "Ab heute keine N-Dünger auf Grünland/Ackerfutter und keine langsam löslichen N-Dünger auf Acker.", quelle: q.s2 },
    { datum: naechstes(sf.fruehe_kulturen_ab, von), titel: "Ende der Sperrfrist für frühe Kulturen", text: "Ab heute N-Düngung auf Durum, Raps, Gerste sowie unter Vlies/Folie wieder erlaubt.", quelle: q.s2 },
    { datum: naechstes("02-16", von), titel: "Sperrfrist endet", text: "Ab heute N-Düngung wieder erlaubt – Boden darf nicht gefroren, wassergesättigt oder schneebedeckt sein.", quelle: q.s4 },
  ];
  return liste.map((f) => ({ ...f, modul: "duengung", schluessel: `napv|${f.titel}|${f.datum}|${betrieb.id}` }));
}
