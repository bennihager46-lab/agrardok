// Gemeinsame Hilfen des Stammdaten-Moduls (auch von anderen Seiten nutzbar).

export const BUNDESLAENDER = [
  { wert: "B", text: "Burgenland" }, { wert: "K", text: "Kärnten" }, { wert: "NOE", text: "Niederösterreich" },
  { wert: "OOE", text: "Oberösterreich" }, { wert: "S", text: "Salzburg" }, { wert: "ST", text: "Steiermark" },
  { wert: "T", text: "Tirol" }, { wert: "V", text: "Vorarlberg" }, { wert: "W", text: "Wien" },
];

export const ROLLEN = [
  { wert: "betriebsleitung", text: "Betriebsleitung" },
  { wert: "familie", text: "Familienmitglied" },
  { wert: "mitarbeit", text: "Mitarbeiter:in" },
  { wert: "lohnunternehmer", text: "Lohnunternehmen / Maschinenring" },
  { wert: "tierarzt", text: "Tierärztin / Tierarzt" },
  { wert: "sonstige", text: "Sonstige" },
];

export const RECHTSFORMEN = [
  { wert: "einzelperson", text: "Einzelperson" },
  { wert: "ehegemeinschaft", text: "Ehegemeinschaft" },
  { wert: "personengemeinschaft", text: "Personengemeinschaft" },
  { wert: "juristische_person", text: "Juristische Person (z. B. GmbH)" },
];

export const BEWIRTSCHAFTUNG = [
  { wert: "konventionell", text: "Konventionell" },
  { wert: "bio", text: "Bio" },
  { wert: "umstellung", text: "Bio in Umstellung" },
];

export const text = (liste, wert) => liste.find((e) => e.wert === wert)?.text ?? wert ?? "–";

// In core/betrieb.js, weil alle Module den aktiven Betrieb brauchen; hier weiter exportiert.
export { aktiverBetrieb, merkeAktivenBetrieb } from "../core/betrieb.js";

// Sachkundeausweis: in core/person.js, weil auch der Pflanzenschutz ihn prüft.
export { sachkundeStatus, SACHKUNDE_WARNUNG_TAGE, lokalesDatum, datumText } from "../core/person.js";

// ---------- Fachliche Prüfungen über das Schema hinaus ----------
// Gleiche Form wie die Fehler aus core/validierung.js, damit das Formular sie gleich anzeigt.

export function pruefeBetriebFachlich(betrieb) {
  const fehler = [];
  const bioMassnahme = (betrieb.oepul_massnahmen ?? []).includes("bio");
  if (bioMassnahme && !["bio", "umstellung"].includes(betrieb.bewirtschaftung)) {
    fehler.push({
      pfad: "bewirtschaftung", art: "fachlich",
      meldung: "Die ÖPUL-Maßnahme „Biologische Wirtschaftsweise“ ist gewählt – bitte Bio oder Bio in Umstellung angeben.",
    });
  }
  return fehler;
}
