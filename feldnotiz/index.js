// Einstieg des Moduls „Feldnotiz“: Beobachtungen bei der Feldbegehung mit GPS, Foto und Spracheingabe.

import { renderFeldnotizen, renderFeldnotiz } from "./seiten.js";

export function registriere(route) {
  route("feldnotizen", { titel: "Feldnotizen", render: renderFeldnotizen });
  route("feldnotiz", { titel: "Feldnotiz", render: renderFeldnotiz });
}
