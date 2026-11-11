// Einstieg des Moduls „Flächen“: Feldstücke, Schläge je Jahr, Karte, Import aus eAMA.

import { renderFlaechen, renderFeldstueck, renderSchlag } from "./seiten.js";
import { renderImport } from "./import-seite.js";

export function registriere(route) {
  route("flaechen", { titel: "Flächen", render: renderFlaechen });
  route("feldstueck", { titel: "Feldstück", render: renderFeldstueck });
  route("schlag", { titel: "Schlag", render: renderSchlag });
  route("flaechen-import", { titel: "Flächen importieren", render: renderImport });
}
