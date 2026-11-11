// Fachlogik des Moduls „Betriebsmittel“ ohne Oberfläche (testbar): Arten, Status von PSM-Zulassungen,
// „zuletzt verwendet“, Kurztexte und fachliche Prüfungen über das Schema hinaus.

export const ARTEN = [
  { wert: "mineralduenger", text: "Mineraldünger", gruppe: "duenger" },
  { wert: "wirtschaftsduenger", text: "Wirtschaftsdünger", gruppe: "duenger", hilfe: "Gülle, Mist, Jauche – eigen oder übernommen" },
  { wert: "organischer_duenger", text: "Organischer Dünger", gruppe: "duenger", hilfe: "Kompost, Gärrest, Handelsdünger organisch" },
  { wert: "psm", text: "Pflanzenschutzmittel", gruppe: "psm" },
  { wert: "saatgut", text: "Saatgut", gruppe: "saatgut" },
  { wert: "tierarzneimittel", text: "Tierarzneimittel", gruppe: "tierarzneimittel" },
  { wert: "biozid", text: "Biozid", gruppe: "sonstige", hilfe: "Rattengift, Desinfektion …" },
  { wert: "futtermittel", text: "Futtermittel", gruppe: "sonstige" },
  { wert: "sonstiges", text: "Sonstiges", gruppe: "sonstige" },
];

export const GRUPPEN = [
  { wert: "duenger", text: "Dünger" },
  { wert: "psm", text: "Pflanzenschutz" },
  { wert: "saatgut", text: "Saatgut" },
  { wert: "tierarzneimittel", text: "Tierarznei" },
  { wert: "sonstige", text: "Sonstige" },
];

export const DUENGER_ARTEN = ["mineralduenger", "wirtschaftsduenger", "organischer_duenger"];
export const gruppeVon = (art) => ARTEN.find((a) => a.wert === art)?.gruppe ?? "sonstige";
export const artText = (art) => ARTEN.find((a) => a.wert === art)?.text ?? art;

export const EINHEITEN = [
  { wert: "kg", text: "kg" }, { wert: "t", text: "t" }, { wert: "dt", text: "dt" }, { wert: "g", text: "g" },
  { wert: "l", text: "Liter" }, { wert: "ml", text: "ml" }, { wert: "m3", text: "m³" }, { wert: "stk", text: "Stück" },
];
export const AUFWAND_EINHEITEN = [
  { wert: "l_je_ha", text: "l/ha" }, { wert: "kg_je_ha", text: "kg/ha" }, { wert: "stk_je_ha", text: "Stück/ha" },
  { wert: "l_je_m2", text: "l/m²" }, { wert: "kg_je_m2", text: "kg/m²" }, { wert: "l_je_m3", text: "l/m³ (Raum)" },
  { wert: "l_je_t_saatgut", text: "l/t Saatgut" }, { wert: "kg_je_t_saatgut", text: "kg/t Saatgut" },
];
export const BEZUG = [
  { wert: "prozent", text: "% (Masse-%)", kurz: "%" },
  { wert: "kg_je_m3", text: "kg je m³", kurz: "kg/m³" },
  { wert: "kg_je_t", text: "kg je t", kurz: "kg/t" },
];
export const GEHALTE_QUELLEN = [
  { wert: "deklaration", text: "Sackaufdruck / Lieferschein" },
  { wert: "analyse", text: "Laboranalyse" },
  { wert: "richtwert", text: "Richtwert (z. B. Richtlinien für die sachgerechte Düngung)" },
  { wert: "schaetzung", text: "Schätzung" },
];
export const HERKUNFT = [
  { wert: "eigen", text: "Am Betrieb angefallen" },
  { wert: "zukauf", text: "Zugekauft" },
  { wert: "uebernahme", text: "Von anderem Betrieb übernommen", hilfe: "Angaben aus dem Düngerabgabevertrag" },
];
export const AUFLAGEN_ARTEN = [
  { wert: "gewaesser", text: "Gewässerabstand" }, { wert: "nichtzielflaeche", text: "Abstand zu Nachbarflächen / Saumbiotopen" },
  { wert: "bienen", text: "Bienenschutz" }, { wert: "grundwasser", text: "Grundwasser" },
  { wert: "anwenderschutz", text: "Anwenderschutz" }, { wert: "sonstige", text: "Sonstige Auflage" },
];
export const SAATGUT_KATEGORIEN = [
  { wert: "zertifiziert", text: "Z-Saatgut (zertifiziert)" }, { wert: "basis", text: "Basissaatgut" },
  { wert: "nachbau", text: "Nachbau (eigenes Erntegut)" }, { wert: "standard", text: "Standardsaatgut (Gemüse)" },
  { wert: "sonstige", text: "Sonstiges" },
];
export const PRODUKTE = [
  { wert: "milch", text: "Milch" }, { wert: "fleisch", text: "Fleisch (essbare Gewebe)" },
  { wert: "eier", text: "Eier" }, { wert: "honig", text: "Honig" },
];

/** Amtliche Quellen zum Nachschlagen. Die Daten werden NICHT automatisch übernommen (siehe docs/rechtsgrundlagen.md 2.5). */
export const QUELLEN = {
  psm_register: "https://psmregister.baes.gv.at/",
  psm_eintrag: (nr) => `https://psmregister.baes.gv.at/de/details?regNr=${encodeURIComponent(String(nr).trim())}`,
  tam_register: "https://medikamente.basg.gv.at/de/medicinal-products/",
  sortenliste: "https://www.baes.gv.at/zulassung/pflanzensorten/oesterreichische-sortenliste/",
};

export const text = (liste, w) => liste.find((e) => e.wert === w)?.text ?? w ?? "–";
const zahlText = (z, stellen = 2) => Number(z).toLocaleString("de-AT", { maximumFractionDigits: stellen });
export const datumText = (iso) => (iso ? iso.split("-").reverse().join(".") : "–");

export { psmStatus, ZULASSUNG_WARNUNG_TAGE } from "../core/psm.js";

/**
 * Letztes Verwendungsdatum je Betriebsmittel aus den Maßnahmen. Erkennt alle Felder namens
 * „betriebsmittel_id“ bzw. „…_betriebsmittel_id“ in den Details (auch in Listen wie bei Tankmischungen).
 * @returns {Map<string, string>} id → Datum (JJJJ-MM-TT)
 */
export function zuletztVerwendet(massnahmen) {
  const ergebnis = new Map();
  const merke = (id, datum) => {
    if (typeof id === "string" && datum && !(ergebnis.get(id) >= datum)) ergebnis.set(id, datum);
  };
  const durchsuche = (wert, datum) => {
    if (Array.isArray(wert)) wert.forEach((w) => durchsuche(w, datum));
    else if (wert && typeof wert === "object") {
      for (const [k, v] of Object.entries(wert)) {
        if (k === "betriebsmittel_id" || k.endsWith("_betriebsmittel_id")) merke(v, datum);
        else durchsuche(v, datum);
      }
    }
  };
  for (const m of massnahmen) if (!m.geloescht) durchsuche(m.details, m.datum_ende ?? m.datum);
  return ergebnis;
}

/** Zuletzt verwendete zuerst, dann alphabetisch. */
export function sortiere(liste, zuletzt = new Map()) {
  return [...liste].sort((a, b) => {
    const da = zuletzt.get(a.id) ?? "";
    const db = zuletzt.get(b.id) ?? "";
    return db.localeCompare(da) || a.name.localeCompare(b.name, "de");
  });
}

/** EPPO-Codes aus einem Registertext wie „Wintergerste (HORVW), Winterroggen (SECCW)“. */
export function eppoCodes(textMitCodes) {
  const codes = [...String(textMitCodes ?? "").matchAll(/\(([0-9A-Z]{5})[,)]/g)].map((m) => m[1]);
  return [...new Set(codes)];
}

export const wirkstoffName = (w) => (typeof w === "string" ? w : w?.name ?? "");
export function wirkstoffText(w) {
  if (typeof w === "string") return w;
  return w.gehalt != null ? `${w.name} ${zahlText(w.gehalt, 3)} ${w.einheit ?? ""}`.trim() : w.name;
}

/** „27 % N“ bzw. „N 3 · P₂O₅ 1,4 · K₂O 4,6 kg/m³“ */
export function naehrstoffText(d) {
  if (!d) return "";
  const teile = [["N", d.n_gesamt], ["P₂O₅", d.p2o5], ["K₂O", d.k2o], ["S", d.s], ["MgO", d.mgo]].filter(([, w]) => w > 0);
  if (!teile.length) return d.n_gesamt === 0 ? "keine N/P/K-Gehalte" : "Gehalte fehlen";
  const kurz = BEZUG.find((b) => b.wert === d.bezug)?.kurz ?? "";
  if (d.bezug === "prozent") return teile.map(([n, w]) => `${zahlText(w)} % ${n}`).join(" · ");
  return `${teile.map(([n, w]) => `${n} ${zahlText(w)}`).join(" · ")} ${kurz}`;
}

/** „Milch 5 T. · Fleisch 7 T.“ */
export function wartezeitText(tam) {
  const w = tam?.wartezeiten ?? [];
  if (!w.length) return "";
  return w.map((x) => `${text(PRODUKTE, x.produkt).replace(/ \(.*\)/, "")}${x.tierart ? ` (${x.tierart})` : ""} ${x.tage} ${x.tage === 1 ? "Tag" : "Tage"}`).join(" · ");
}

/** Kurze Zusammenfassung für Listen. */
export function kurzinfo(bm) {
  switch (gruppeVon(bm.art)) {
    case "duenger": return naehrstoffText(bm.duenger);
    case "psm": return [`Reg.-Nr. ${bm.psm?.zulassungsnummer ?? "–"}`, (bm.psm?.wirkstoffe ?? []).map(wirkstoffName).join(", ")].filter(Boolean).join(" · ");
    case "saatgut": return [bm.saatgut?.sorte, bm.saatgut?.gebeizt ? "gebeizt" : null].filter(Boolean).join(" · ");
    case "tierarzneimittel": return wartezeitText(bm.tierarzneimittel) || "Keine Wartezeit eingetragen";
    default: return bm.biozid?.produktart ?? "";
  }
}

/** Neuen Datensatz aus einer Vorlage (rules/betriebsmittel/duenger-vorlagen.json). */
export function ausVorlage(vorlage, betriebId) {
  const { id, ...rest } = structuredClone(vorlage);
  return { ...rest, betrieb_id: betriebId, vorlage: id, aktiv: true };
}

// ---------- Fachliche Prüfungen (gleiche Form wie Fehler aus core/validierung.js) ----------

export function pruefeFachlich(bm) {
  const fehler = [];
  const melde = (pfad, meldung) => fehler.push({ pfad, art: "fachlich", meldung });
  const d = bm.duenger;
  if (d) {
    if (d.nh4_n != null && d.n_gesamt != null && d.nh4_n > d.n_gesamt) melde("duenger/nh4_n", "Ammonium-N kann nicht größer sein als N gesamt.");
    if (d.bezug === "prozent") {
      for (const f of ["n_gesamt", "p2o5", "k2o", "s", "mgo", "cao"]) if (d[f] > 100) melde(`duenger/${f}`, "Ein Gehalt in Prozent kann höchstens 100 sein.");
    }
    const u = d.uebernahme;
    if (u?.zeitraum_von && u?.zeitraum_bis && u.zeitraum_bis < u.zeitraum_von) melde("duenger/uebernahme/zeitraum_bis", "Das Ende liegt vor dem Beginn.");
  }
  (bm.psm?.indikationen ?? []).forEach((ind, i) => {
    if (ind.bbch_von != null && ind.bbch_bis != null && ind.bbch_von > ind.bbch_bis) melde(`psm/indikationen/${i}/bbch_bis`, "BBCH „bis“ liegt vor „von“.");
    if (ind.wasser_l_je_ha_von != null && ind.wasser_l_je_ha_bis != null && ind.wasser_l_je_ha_von > ind.wasser_l_je_ha_bis) melde(`psm/indikationen/${i}/wasser_l_je_ha_bis`, "Die Wassermenge „bis“ ist kleiner als „von“.");
  });
  return fehler;
}
