// Einstieg des Moduls „Bodenproben“: Proben je Feldstück, Gehaltsklassen, Karte, CSV-Import von Laborbefunden.
// Die Düngeplanung (Modul Düngung) nutzt die letzte Probe über core/boden.js.

import { renderBodenproben, renderBodenprobe, renderImport } from "./seiten.js";

export function registriere(route) {
  route("bodenproben", { titel: "Bodenproben", render: renderBodenproben });
  route("bodenprobe", { titel: "Bodenprobe", render: renderBodenprobe });
  route("bodenproben-import", { titel: "Laborbefund einlesen", render: renderImport });
}
