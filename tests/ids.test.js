import { gruppe, test, pruefe } from "./runner.js";
import { uuid, Uhr, hlcZerlegen } from "../core/ids.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const HLC = /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z-[0-9]{4}-[0-9a-f]{8}$/; // wie common.schema.json
const GERAET = "0a1b2c3d-0000-4000-8000-000000000001";

gruppe("ids", () => {
  test("uuid hat das Schema-Format und ist eindeutig", () => {
    const menge = new Set(Array.from({ length: 1000 }, uuid));
    pruefe.gleich(menge.size, 1000);
    for (const u of menge) pruefe.wahr(UUID.test(u), `Ungültige UUID ${u}`);
  });

  test("HLC hat das Schema-Format", () => {
    const uhr = new Uhr(GERAET);
    pruefe.wahr(HLC.test(uhr.tick()));
  });

  test("HLC steigt bei gleicher Millisekunde streng an", () => {
    const uhr = new Uhr(GERAET, null, () => 1_700_000_000_000);
    const werte = Array.from({ length: 50 }, () => uhr.tick());
    for (let i = 1; i < werte.length; i++) pruefe.wahr(werte[i] > werte[i - 1], `${werte[i]} nicht größer als ${werte[i - 1]}`);
  });

  test("HLC steigt weiter, wenn die Uhr zurückspringt", () => {
    let zeit = 1_700_000_000_000;
    const uhr = new Uhr(GERAET, null, () => zeit);
    const a = uhr.tick();
    zeit -= 60_000; // Handy-Uhr eine Minute zurück
    const b = uhr.tick();
    pruefe.wahr(b > a);
  });

  test("HLC übernimmt gespeicherten Stand nach Neustart", () => {
    const uhr1 = new Uhr(GERAET, null, () => 1_700_000_000_000);
    const letzte = uhr1.tick();
    const uhr2 = new Uhr(GERAET, letzte, () => 1_600_000_000_000); // Uhr steht nach Neustart falsch
    pruefe.wahr(uhr2.tick() > letzte);
  });

  test("Empfang eines Zeitstempels aus der Zukunft", () => {
    const uhr = new Uhr(GERAET, null, () => 1_700_000_000_000);
    const fremd = new Uhr("ffffffff-0000-4000-8000-000000000001", null, () => 1_700_000_500_000).tick();
    const nachher = uhr.empfangen(fremd);
    pruefe.wahr(nachher > fremd, "eigene Uhr muss hinter dem fremden Stand liegen");
    pruefe.wahr(uhr.tick() > nachher);
    pruefe.gleich(hlcZerlegen(nachher).knoten, "0a1b2c3d");
  });
});
