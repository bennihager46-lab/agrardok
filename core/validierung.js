// Prüfung gegen die JSON-Schemas unter /schema – im Browser, offline, ohne Fremdbibliothek.
//
// Warum selbst gebaut? Gängige Validatoren (z. B. Ajv) erzeugen Prüfcode zur Laufzeit mit
// new Function/eval. Das verbietet unsere Content Security Policy (script-src 'self').
// Unterstützt wird der Teil von JSON Schema 2020-12, den unsere Schemas nutzen:
//   $ref (auch dateiübergreifend), type, enum, const, pattern, format (date, date-time),
//   minLength/maxLength, minimum/maximum, required, properties, additionalProperties,
//   unevaluatedProperties, items, minItems/maxItems, uniqueItems, allOf, anyOf, oneOf, not,
//   if/then/else.
// Unbekannte Schlüsselwörter werden ignoriert. Neue Schlüsselwörter in /schema → hier ergänzen
// (werkzeuge/pruefe_app.py warnt).

export const SCHEMA_BASIS = "https://agrardok.invalid/schema/";

export const SCHEMA_DATEIEN = [
  "common.schema.json", "betrieb.schema.json", "person.schema.json", "feldstueck.schema.json",
  "schlag.schema.json", "kultur.schema.json", "tier.schema.json", "betriebsmittel.schema.json",
  "maschine.schema.json", "massnahme.schema.json", "aenderung.schema.json", "export.schema.json",
  "duengeplan.schema.json", "bodenprobe.schema.json", "feldnotiz.schema.json", "anhang.schema.json",
  "massnahmen/aussaat.schema.json", "massnahmen/bewaesserung.schema.json", "massnahmen/biozid.schema.json",
  "massnahmen/bodenbearbeitung.schema.json", "massnahmen/duengung.schema.json", "massnahmen/ernte.schema.json",
  "massnahmen/feldmiete.schema.json", "massnahmen/pflanzenschutz.schema.json", "massnahmen/pflege.schema.json", "massnahmen/tierbehandlung.schema.json",
  "massnahmen/tierbewegung.schema.json", "massnahmen/weide.schema.json",
];

export const UNTERSTUETZT = new Set([
  "$schema", "$id", "$ref", "$defs", "$comment", "title", "description", "default",
  "type", "enum", "const", "pattern", "format", "minLength", "maxLength", "minimum", "maximum",
  "exclusiveMinimum", "exclusiveMaximum", "required", "properties", "additionalProperties",
  "unevaluatedProperties", "items", "minItems", "maxItems", "uniqueItems",
  "allOf", "anyOf", "oneOf", "not", "if", "then", "else",
]);

const schemas = new Map();
let ladevorgang = null;

/** Lädt alle Schemas (einmalig; über den Service Worker auch offline). */
export function laden(basis = new URL("../schema/", import.meta.url)) {
  ladevorgang ??= Promise.all(
    SCHEMA_DATEIEN.map(async (datei) => {
      const antwort = await fetch(new URL(datei, basis));
      if (!antwort.ok) throw new Error(`Schema ${datei} konnte nicht geladen werden (${antwort.status})`);
      registriere(await antwort.json());
    }),
  ).catch((e) => {
    ladevorgang = null;
    throw e;
  });
  return ladevorgang;
}

export function registriere(schema) {
  schemas.set(schema.$id, schema);
}

export class ValidierungsFehler extends Error {
  constructor(entitaet, fehler) {
    super(`${entitaet}: ${fehler.map((f) => `${f.pfad || "(gesamt)"} – ${f.meldung}`).join("; ")}`);
    this.name = "ValidierungsFehler";
    this.entitaet = entitaet;
    this.fehler = fehler;
  }
}

/** Prüft einen Datensatz einer Entität. Liefert eine Liste von Fehlern (leer = gültig). */
export function pruefe(entitaet, wert) {
  return pruefeGegen(`${SCHEMA_BASIS}${entitaet}.schema.json`, wert);
}

export function pruefeGegen(schemaId, wert) {
  const schema = schemas.get(schemaId);
  if (!schema) throw new Error(`Schema nicht geladen: ${schemaId} – zuerst laden() aufrufen`);
  const fehler = [];
  validiere(schema, wert, "", schemaId, fehler);
  return fehler;
}

// ---------------------------------------------------------------------------

const TYPEN = {
  string: (v) => typeof v === "string",
  number: (v) => typeof v === "number" && Number.isFinite(v),
  integer: (v) => Number.isInteger(v),
  boolean: (v) => typeof v === "boolean",
  object: (v) => v !== null && typeof v === "object" && !Array.isArray(v),
  array: (v) => Array.isArray(v),
  null: (v) => v === null,
};

const TYPNAMEN = { string: "Text", number: "Zahl", integer: "ganze Zahl", boolean: "Ja/Nein", object: "Gruppe von Angaben", array: "Liste", null: "leer" };

const FORMATE = {
  date: (v) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
    if (!m) return false;
    const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
  },
  "date-time": (v) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/i.test(v) && !Number.isNaN(Date.parse(v)),
};

const regexCache = new Map();
const regex = (muster) => {
  if (!regexCache.has(muster)) regexCache.set(muster, new RegExp(muster, "u"));
  return regexCache.get(muster);
};

function meldungFuer(art, p) {
  switch (art) {
    case "required": return "Pflichtfeld – bitte ausfüllen.";
    case "type": return `Ungültige Eingabe (erwartet: ${p.erwartet.map((t) => TYPNAMEN[t] ?? t).join(" oder ")}).`;
    case "enum": case "const": return "Bitte einen der vorgegebenen Werte wählen.";
    case "pattern": return "Die Eingabe hat nicht das richtige Format.";
    case "format": return p.format === "date" ? "Bitte ein gültiges Datum eingeben." : "Ungültiges Format.";
    case "minLength": return p.grenze === 1 ? "Darf nicht leer sein." : `Mindestens ${p.grenze} Zeichen.`;
    case "maxLength": return `Höchstens ${p.grenze} Zeichen.`;
    case "minimum": return `Muss mindestens ${p.grenze} sein.`;
    case "maximum": return `Darf höchstens ${p.grenze} sein.`;
    case "exclusiveMinimum": return `Muss größer als ${p.grenze} sein.`;
    case "exclusiveMaximum": return `Muss kleiner als ${p.grenze} sein.`;
    case "minItems": return p.grenze === 1 ? "Bitte mindestens einen Eintrag wählen." : `Mindestens ${p.grenze} Einträge.`;
    case "maxItems": return `Höchstens ${p.grenze} Einträge.`;
    case "uniqueItems": return "Einträge kommen doppelt vor.";
    case "unbekannt": return `Unbekanntes Feld „${p.feld}“.`;
    case "varianten": return "Die Angaben passen zu keiner erlaubten Variante.";
    case "not": return "Diese Angabe ist hier nicht erlaubt.";
    default: return "Ungültige Angabe.";
  }
}

function melde(fehler, pfad, art, parameter = {}) {
  fehler.push({ pfad, art, parameter, meldung: meldungFuer(art, parameter) });
}

const verbinde = (pfad, teil) => (pfad ? `${pfad}/${teil}` : String(teil));

function gleich(a, b) {
  return JSON.stringify(stabil(a)) === JSON.stringify(stabil(b));
}
function stabil(v) {
  if (Array.isArray(v)) return v.map(stabil);
  if (v && typeof v === "object") return Object.fromEntries(Object.keys(v).sort().map((k) => [k, stabil(v[k])]));
  return v;
}

function aufloesen(ref, basisId) {
  const url = new URL(ref, basisId);
  const [dokument, fragment = ""] = url.href.split("#");
  let ziel = schemas.get(dokument);
  if (!ziel) throw new Error(`Schema für $ref nicht geladen: ${dokument}`);
  for (const teil of fragment.split("/").filter(Boolean)) {
    ziel = ziel[decodeURIComponent(teil).replace(/~1/g, "/").replace(/~0/g, "~")];
    if (ziel === undefined) throw new Error(`$ref nicht auflösbar: ${ref}`);
  }
  return { schema: ziel, basisId: dokument };
}

/**
 * Prüft wert gegen schema, schreibt Fehler in fehler und liefert die Menge der
 * „ausgewerteten“ Eigenschaften (für unevaluatedProperties).
 */
function validiere(schema, wert, pfad, basisId, fehler) {
  const ausgewertet = new Set();
  if (schema === true) return ausgewertet;
  if (schema === false) {
    melde(fehler, pfad, "not");
    return ausgewertet;
  }
  if (schema.$id) basisId = new URL(schema.$id, basisId).href;
  const vereinige = (menge) => menge.forEach((k) => ausgewertet.add(k));

  if (schema.$ref) {
    const r = aufloesen(schema.$ref, basisId);
    vereinige(validiere(r.schema, wert, pfad, r.basisId, fehler));
  }

  if (schema.type) {
    const erlaubt = [].concat(schema.type);
    if (!erlaubt.some((t) => TYPEN[t]?.(wert))) {
      melde(fehler, pfad, "type", { erwartet: erlaubt });
      return ausgewertet; // weitere Prüfungen wären bei falschem Typ nur Folgefehler
    }
  }
  if ("const" in schema && !gleich(wert, schema.const)) melde(fehler, pfad, "const", { erlaubt: [schema.const] });
  if (schema.enum && !schema.enum.some((e) => gleich(e, wert))) melde(fehler, pfad, "enum", { erlaubt: schema.enum });

  if (typeof wert === "string") {
    const laenge = [...wert].length;
    if (schema.minLength != null && laenge < schema.minLength) melde(fehler, pfad, "minLength", { grenze: schema.minLength });
    if (schema.maxLength != null && laenge > schema.maxLength) melde(fehler, pfad, "maxLength", { grenze: schema.maxLength });
    if (schema.pattern && !regex(schema.pattern).test(wert)) melde(fehler, pfad, "pattern", { muster: schema.pattern });
    if (schema.format && FORMATE[schema.format] && !FORMATE[schema.format](wert)) melde(fehler, pfad, "format", { format: schema.format });
  }

  if (typeof wert === "number") {
    if (schema.minimum != null && wert < schema.minimum) melde(fehler, pfad, "minimum", { grenze: schema.minimum });
    if (schema.maximum != null && wert > schema.maximum) melde(fehler, pfad, "maximum", { grenze: schema.maximum });
    if (schema.exclusiveMinimum != null && wert <= schema.exclusiveMinimum) melde(fehler, pfad, "exclusiveMinimum", { grenze: schema.exclusiveMinimum });
    if (schema.exclusiveMaximum != null && wert >= schema.exclusiveMaximum) melde(fehler, pfad, "exclusiveMaximum", { grenze: schema.exclusiveMaximum });
  }

  if (Array.isArray(wert)) {
    if (schema.minItems != null && wert.length < schema.minItems) melde(fehler, pfad, "minItems", { grenze: schema.minItems });
    if (schema.maxItems != null && wert.length > schema.maxItems) melde(fehler, pfad, "maxItems", { grenze: schema.maxItems });
    if (schema.uniqueItems && new Set(wert.map((w) => JSON.stringify(stabil(w)))).size !== wert.length) melde(fehler, pfad, "uniqueItems");
    if (schema.items) wert.forEach((w, i) => validiere(schema.items, w, verbinde(pfad, i), basisId, fehler));
  }

  if (TYPEN.object(wert)) {
    for (const feld of schema.required ?? []) {
      if (!(feld in wert) || wert[feld] === undefined) melde(fehler, verbinde(pfad, feld), "required");
    }
    for (const [feld, teil] of Object.entries(schema.properties ?? {})) {
      if (feld in wert) {
        validiere(teil, wert[feld], verbinde(pfad, feld), basisId, fehler);
        ausgewertet.add(feld);
      }
    }
    if ("additionalProperties" in schema) {
      for (const feld of Object.keys(wert)) {
        if (schema.properties && feld in schema.properties) continue;
        if (schema.additionalProperties === false) melde(fehler, verbinde(pfad, feld), "unbekannt", { feld });
        else validiere(schema.additionalProperties, wert[feld], verbinde(pfad, feld), basisId, fehler);
        ausgewertet.add(feld);
      }
    }
  }

  for (const teil of schema.allOf ?? []) vereinige(validiere(teil, wert, pfad, basisId, fehler));

  if (schema.anyOf) {
    let passend = 0;
    for (const teil of schema.anyOf) {
      const probe = [];
      const menge = validiere(teil, wert, pfad, basisId, probe);
      if (!probe.length) {
        passend++;
        vereinige(menge);
      }
    }
    if (!passend) melde(fehler, pfad, "varianten");
  }

  if (schema.oneOf) {
    const treffer = schema.oneOf.map((teil) => {
      const probe = [];
      return { menge: validiere(teil, wert, pfad, basisId, probe), ok: !probe.length };
    }).filter((t) => t.ok);
    if (treffer.length === 1) vereinige(treffer[0].menge);
    else melde(fehler, pfad, "varianten");
  }

  if (schema.not) {
    const probe = [];
    validiere(schema.not, wert, pfad, basisId, probe);
    if (!probe.length) melde(fehler, pfad, "not");
  }

  if (schema.if !== undefined) {
    const probe = [];
    const menge = validiere(schema.if, wert, pfad, basisId, probe);
    if (!probe.length) {
      vereinige(menge);
      if (schema.then !== undefined) vereinige(validiere(schema.then, wert, pfad, basisId, fehler));
    } else if (schema.else !== undefined) {
      vereinige(validiere(schema.else, wert, pfad, basisId, fehler));
    }
  }

  if (schema.unevaluatedProperties === false && TYPEN.object(wert)) {
    for (const feld of Object.keys(wert)) {
      if (!ausgewertet.has(feld)) melde(fehler, verbinde(pfad, feld), "unbekannt", { feld });
    }
  } else if (schema.unevaluatedProperties !== undefined && TYPEN.object(wert)) {
    for (const feld of Object.keys(wert)) {
      if (!ausgewertet.has(feld)) validiere(schema.unevaluatedProperties, wert[feld], verbinde(pfad, feld), basisId, fehler);
    }
  }
  if (TYPEN.object(wert) && schema.unevaluatedProperties !== undefined) Object.keys(wert).forEach((k) => ausgewertet.add(k));

  return ausgewertet;
}
