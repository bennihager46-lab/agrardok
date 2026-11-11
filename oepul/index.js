// Einstieg des Moduls „ÖPUL“: Aufzeichnungen und Prüfungen je gewählter Maßnahme, Fristenkalender mit Erinnerungen.

import * as daten from "../core/daten.js";
import * as regeln from "../core/regeln.js";
import { registriereFristen, naechstes } from "../core/fristen.js";
import { begruenungEnde } from "../core/oepul.js";
import { renderOepul, renderFristen } from "./seiten.js";

export function registriere(route) {
  route("oepul", { titel: "ÖPUL", render: renderOepul });
  route("fristen", { titel: "Fristen", render: renderFristen });
  registriereFristen(oepulFristen);
}

async function oepulFristen(betrieb, { von }) {
  const teil = new Set(betrieb.oepul_massnahmen ?? []);
  if (!teil.size) return [];
  const b = await regeln.lade("oepul/begruenung");
  const q = { text: "AMA – ÖPUL Zwischenfruchtanbau", url: b.quelle };
  const f = [];
  if (teil.has("begruenung_zwischenfruchtanbau")) {
    for (const a of b.werte.antragsfristen) f.push({ datum: naechstes(a.bis, von), titel: `Begrünungsvarianten ${a.varianten.join(", ")} im Mehrfachantrag beantragen`, text: "Danach nur noch Abmeldung oder Verringerung möglich.", quelle: q });
    for (const v of b.werte.varianten) f.push({ datum: naechstes(v.anlage_bis, von), titel: `Spätester Anlagetermin Begrünung Variante ${v.nr}`, text: "Nicht angelegte Varianten vorher im Mehrfachantrag korrigieren.", quelle: q });
    // Ende des Begrünungszeitraums je angelegter Zwischenfrucht = frühester Umbruch
    const ms = (await daten.liste("massnahme", { index: "betrieb_id", wert: betrieb.id })).filter((m) => !m.geloescht && m.art === "aussaat" && m.details?.zwischenfrucht && m.details?.begruenung_variante);
    for (const m of ms) {
      const ende = begruenungEnde(m.datum, m.details.begruenung_variante, b);
      if (ende) f.push({ datum: ende, titel: `Begrünung Variante ${m.details.begruenung_variante} endet`, text: `Angelegt am ${m.datum.split("-").reverse().join(".")} – Umbruch ab dem Folgetag erlaubt.`, quelle: q, href: "#/oepul" });
    }
  }
  if (teil.has("grundwasserschutz_acker")) {
    const quelle = { text: "AMA – Vorbeugender Grundwasserschutz Acker", url: "https://www.ama.at/media/cdyhus10/o6_16_vorbeugender_grundwasserschutz_acker_2026_04.pdf" };
    f.push({ datum: naechstes("02-28", von), titel: "Düngeplanung fertigstellen (Grundwasserschutz)", quelle, href: "#/duengeplanung" });
    f.push({ datum: naechstes("01-31", von), titel: "N-Bilanz je Schlag fertigstellen (Grundwasserschutz)", quelle, href: "#/duengebericht" });
  }
  return f.map((x) => ({ ...x, modul: "oepul", schluessel: `oepul|${x.titel}|${x.datum}` }));
}
