// Einstieg des Moduls „Schlagkartei“: Maßnahmen je Schlag (Bodenbearbeitung, Aussaat, Pflege, Ernte, Bewässerung),
// Zeitachse je Schlag, Jahresübersicht je Kultur und der Einstieg „Aufzeichnen“.

import { renderErfassen } from "./erfassen.js";
import { renderAufzeichnen, renderSchlagkartei, renderJahresuebersicht } from "./kartei.js";

export function registriere(route) {
  route("aufzeichnen", { titel: "Aufzeichnen", render: renderAufzeichnen });
  route("massnahme-erfassen", { titel: "Maßnahme erfassen", render: renderErfassen });
  route("schlagkartei", { titel: "Schlagkartei", render: renderSchlagkartei });
  route("jahresuebersicht", { titel: "Jahresübersicht", render: renderJahresuebersicht });
}
