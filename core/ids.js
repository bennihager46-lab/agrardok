// IDs und Hybrid Logical Clock (HLC).
// Format der HLC laut schema/common.schema.json:  2026-04-20T05:30:00.000Z-0003-0a1b2c3d
//   UTC-Zeit (ms) – Zähler (4-stellig) – erste 8 Zeichen der Geräte-ID.
// HLC-Werte sind als Text sortierbar und steigen auf einem Gerät immer an,
// auch wenn die Uhr des Handys kurz zurückspringt.

export function uuid() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  // Fallback für ältere Browser bzw. unsichere Kontexte
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40; // Version 4
  b[8] = (b[8] & 0x3f) | 0x80; // Variante RFC 4122
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

const MAX_ZAEHLER = 9999;

export function hlcZerlegen(text) {
  const m = /^(.+Z)-(\d{4})-([0-9a-f]{8})$/.exec(text ?? "");
  if (!m) throw new Error(`Ungültiger HLC-Wert: ${text}`);
  return { ms: Date.parse(m[1]), zaehler: Number(m[2]), knoten: m[3] };
}

export function hlcFormat({ ms, zaehler, knoten }) {
  return `${new Date(ms).toISOString()}-${String(zaehler).padStart(4, "0")}-${knoten}`;
}

export function hlcVergleiche(a, b) {
  return a < b ? -1 : a > b ? 1 : 0; // Textvergleich genügt dank festem Format
}

export class Uhr {
  /**
   * @param {string} geraetId  UUID des Geräts
   * @param {string|null} letzte  zuletzt vergebener HLC-Wert (aus der Datenbank), damit auch nach
   *                              Neustart mit zurückgestellter Uhr nichts doppelt vergeben wird
   * @param {() => number} jetzt  Zeitquelle (für Tests austauschbar)
   */
  constructor(geraetId, letzte = null, jetzt = () => Date.now()) {
    this.knoten = geraetId.replace(/-/g, "").slice(0, 8);
    this.jetztFn = jetzt;
    const alt = letzte ? hlcZerlegen(letzte) : { ms: 0, zaehler: 0 };
    this.ms = alt.ms;
    this.zaehler = alt.zaehler;
  }

  /** Neuer Zeitstempel für eine lokale Änderung. */
  tick() {
    const physisch = this.jetztFn();
    if (physisch > this.ms) {
      this.ms = physisch;
      this.zaehler = 0;
    } else {
      this.zaehler += 1;
      if (this.zaehler > MAX_ZAEHLER) {
        this.ms += 1;
        this.zaehler = 0;
      }
    }
    return hlcFormat(this);
  }

  /** Zeitstempel eines anderen Geräts berücksichtigen (beim Import/Sync). */
  empfangen(fremd) {
    const f = hlcZerlegen(fremd);
    const physisch = this.jetztFn();
    const neu = Math.max(this.ms, f.ms, physisch);
    if (neu === this.ms && neu === f.ms) this.zaehler = Math.max(this.zaehler, f.zaehler) + 1;
    else if (neu === this.ms) this.zaehler += 1;
    else if (neu === f.ms) this.zaehler = f.zaehler + 1;
    else this.zaehler = 0;
    this.ms = neu;
    if (this.zaehler > MAX_ZAEHLER) {
      this.ms += 1;
      this.zaehler = 0;
    }
    return hlcFormat(this);
  }
}
