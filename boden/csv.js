// Laborbefund als CSV einlesen – ohne Oberfläche, mit Unit-Tests (tests/oepul.test.js, Gruppe „boden-import“).
// Erkennt Trennzeichen (; , Tab), Dezimalkomma und gängige Spaltennamen; die Zuordnung ist in der Vorschau änderbar.

export const FELDER = {
  feldstueck: { text: "Feldstück (Nummer oder Name)", namen: ["feldstueck", "feldstuck", "fs", "fs nr", "feldstuecknummer", "feldstueck nr", "schlag", "flaeche", "bezeichnung"] },
  datum: { text: "Datum der Probenahme", namen: ["datum", "probenahme", "probenahmedatum", "entnahme", "datum probenahme"] },
  probennummer: { text: "Probennummer", namen: ["probe", "probennummer", "proben nr", "probennr", "labornummer", "lab nr", "nr"] },
  ph: { text: "pH-Wert", namen: ["ph", "ph wert", "ph cacl2", "ph(cacl2)"] },
  p: { text: "Phosphor", namen: ["p", "p cal", "phosphor", "p mg 1000g", "p2o5", "p2o5 cal"] },
  k: { text: "Kalium", namen: ["k", "k cal", "kalium", "k mg 1000g", "k2o", "k2o cal"] },
  mg: { text: "Magnesium", namen: ["mg", "magnesium", "mg cacl2"] },
  humus: { text: "Humus in %", namen: ["humus", "humus %", "humusgehalt", "org substanz"] },
  ton: { text: "Ton in %", namen: ["ton", "ton %", "tongehalt"] },
  tiefe: { text: "Tiefe", namen: ["tiefe", "entnahmetiefe", "tiefe cm"] },
};

const norm = (t) => String(t ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9%()]+/g, " ").trim();

/** Zerlegt CSV-Text in Zeilen (mit Anführungszeichen). */
export function parseCsv(text) {
  const roh = text.replace(/^﻿/, "");
  const erste = roh.split(/\r?\n/)[0] ?? "";
  const trenner = [";", "\t", ","].map((t) => [t, erste.split(t).length]).sort((a, b) => b[1] - a[1])[0][0];
  const zeilen = [];
  let zeile = [];
  let feld = "";
  let inQuote = false;
  for (let i = 0; i < roh.length; i++) {
    const c = roh[i];
    if (inQuote) {
      if (c === '"' && roh[i + 1] === '"') { feld += '"'; i++; }
      else if (c === '"') inQuote = false;
      else feld += c;
    } else if (c === '"') inQuote = true;
    else if (c === trenner) { zeile.push(feld.trim()); feld = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && roh[i + 1] === "\n") i++;
      zeile.push(feld.trim()); feld = "";
      if (zeile.some((x) => x !== "")) zeilen.push(zeile);
      zeile = [];
    } else feld += c;
  }
  zeile.push(feld.trim());
  if (zeile.some((x) => x !== "")) zeilen.push(zeile);
  return { trenner, kopf: zeilen[0] ?? [], daten: zeilen.slice(1) };
}

export function automatischeZuordnung(kopf) {
  const z = {};
  for (const [feld, def] of Object.entries(FELDER)) {
    const i = kopf.findIndex((s) => def.namen.includes(norm(s).replace(/[()%]/g, "").trim()) || def.namen.includes(norm(s)));
    if (i >= 0) z[feld] = i;
  }
  return z;
}

/** „P2O5“/„K2O“ in der Spalte → wahrscheinlich mg/100 g Oxid. */
export function vermuteOxid(kopf, z) {
  const p = z.p != null ? norm(kopf[z.p]) : "";
  const k = z.k != null ? norm(kopf[z.k]) : "";
  return p.includes("p2o5") || k.includes("k2o");
}

export function zahl(t) {
  const s = String(t ?? "").trim().replace(/\s/g, "").replace(/^<|^>/, "");
  if (!s) return null;
  const n = Number(s.includes(",") && !s.includes(".") ? s.replace(",", ".") : s.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

/** 12.3.2026, 12.03.26, 2026-03-12 → JJJJ-MM-TT */
export function datum(t) {
  const s = String(t ?? "").trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
  if (m) return `${m[3].length === 2 ? `20${m[3]}` : m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return null;
}

// mg P2O5/100 g → mg P/1.000 g: × 10 × 0,4364;  mg K2O/100 g → mg K/1.000 g: × 10 × 0,8301
export const OXID_FAKTOR = { p: 4.364, k: 8.301 };

/**
 * Erstellt die Vorschau: je Zeile die erkannte Probe und das zugeordnete Feldstück.
 * @returns {Array<{zeile: number, probe: object|null, feldstueck: object|null, fehler: string[]}>}
 */
export function erstelleVorschau({ daten: zeilen }, zuordnung, { feldstuecke, oxid = false, standardDatum }) {
  const wert = (z, feld) => (zuordnung[feld] == null ? "" : z[zuordnung[feld]] ?? "");
  return zeilen.map((z, i) => {
    const fehler = [];
    const fsText = wert(z, "feldstueck");
    const n = norm(fsText);
    const fs = feldstuecke.find((f) => String(f.nummer) === fsText.trim() || norm(f.name) === n) ?? feldstuecke.find((f) => n && norm(f.name).includes(n)) ?? null;
    if (!fs) fehler.push(`Feldstück „${fsText || "–"}“ nicht gefunden`);
    const d = datum(wert(z, "datum")) ?? standardDatum ?? null;
    if (!d) fehler.push("Datum fehlt oder ist unlesbar");
    const p = zahl(wert(z, "p"));
    const k = zahl(wert(z, "k"));
    const probe = {
      datum: d, probennummer: wert(z, "probennummer") || undefined, tiefe_cm: wert(z, "tiefe") || undefined,
      ph: zahl(wert(z, "ph")) ?? undefined,
      p_mg_kg: p == null ? undefined : Math.round(oxid ? p * OXID_FAKTOR.p : p),
      k_mg_kg: k == null ? undefined : Math.round(oxid ? k * OXID_FAKTOR.k : k),
      mg_mg_kg: zahl(wert(z, "mg")) ?? undefined, humus_prozent: zahl(wert(z, "humus")) ?? undefined, ton_prozent: zahl(wert(z, "ton")) ?? undefined,
    };
    if ([probe.ph, probe.p_mg_kg, probe.k_mg_kg, probe.mg_mg_kg, probe.humus_prozent].every((x) => x === undefined)) fehler.push("Keine Messwerte erkannt");
    for (const k2 of Object.keys(probe)) if (probe[k2] === undefined) delete probe[k2];
    return { zeile: i + 2, probe, feldstueck: fs, fehler };
  });
}
