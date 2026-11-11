// Seiten „Bodenproben“ (Liste je Feldstück, Karte nach Gehaltsklassen), „Bodenprobe“ (Eingabe) und „Bodenproben importieren“ (CSV).

import * as daten from "../core/daten.js";
import * as regeln from "../core/regeln.js";
import { aktiverBetrieb } from "../core/betrieb.js";
import { datumText, heute, zahlText } from "../core/bestand.js";
import { gehaltsklassen, phReaktion, schwereAusTon } from "../core/boden.js";
import { gehe, parameter } from "../core/router.js";
import { h, karte, meldung, bestaetige } from "../core/ui/dom.js";
import { textfeld, auswahl, datumsfeld, knopfauswahl, formular, abschnitt, werte, zeigeFehler, zahlAus } from "../core/ui/formular.js";
import { zeigeKarte } from "../core/ui/karte.js";
import { parseCsv, automatischeZuordnung, vermuteOxid, erstelleVorschau, FELDER } from "./csv.js";

export const FARBEN = { A: "#b00020", B: "#ef6c00", C: "#2e7d32", D: "#1565c0", E: "#4a148c" };
const NAEHRSTOFFE = [["p", "Phosphor"], ["k", "Kalium"], ["mg", "Magnesium"], ["ph", "pH-Wert"]];
const zw = (n) => (n == null ? "" : String(n).replace(".", ","));
const fsName = (f) => (f.name && f.name !== `Feldstück ${f.nummer}` ? `${f.nummer ?? ""} · ${f.name}` : `Feldstück ${f.nummer ?? ""}`);

function ohneBetrieb(ziel) {
  ziel.append(karte("Zuerst den Betrieb einrichten", h("a", { class: "knopf", href: "#/betrieb-bearbeiten" }, "Betrieb einrichten")));
}

function klassenText(probe, regel) {
  const { klassen, schwere_angenommen: angenommen } = gehaltsklassen(probe, regel);
  const t = regel.werte.klassen_text;
  const teile = [];
  if (probe.ph != null) teile.push(`pH ${zahlText(probe.ph)} (${phReaktion(probe.ph, regel)})`);
  for (const [k, n] of [["p", "P"], ["k", "K"], ["mg", "Mg"]]) if (klassen[k]) teile.push(`${n} ${klassen[k]} (${t[klassen[k]]})`);
  if (probe.humus_prozent != null) teile.push(`Humus ${zahlText(probe.humus_prozent)} %`);
  return teile.join(" · ") + (angenommen ? " – Bodenschwere angenommen" : "");
}

// ---------- Liste und Karte ----------

export async function renderBodenproben(ziel) {
  ziel.append(h("h1", {}, "Bodenproben"));
  const betrieb = await aktiverBetrieb();
  if (!betrieb) return ohneBetrieb(ziel);
  const naehrstoff = NAEHRSTOFFE.some(([k]) => k === parameter().get("zeige")) ? parameter().get("zeige") : "p";
  const [proben, feldstuecke, regel] = await Promise.all([
    daten.liste("bodenprobe", { index: "betrieb_id", wert: betrieb.id }), daten.liste("feldstueck", { index: "betrieb_id", wert: betrieb.id }), regeln.lade("boden/gehaltsklassen"),
  ]);
  feldstuecke.sort((a, b) => (a.nummer ?? 9999) - (b.nummer ?? 9999));
  ziel.append(h("div", { class: "knopfreihe" },
    h("a", { class: "knopf", href: "#/bodenprobe?neu=1", "data-test": "bodenprobe-neu" }, "Bodenprobe eintragen"),
    h("a", { class: "knopf knopf-zweit", href: "#/bodenproben-import", "data-test": "bodenproben-import" }, "Laborbefund (CSV) einlesen")));
  if (!feldstuecke.length) return ziel.append(h("p", {}, "Bitte zuerst Feldstücke anlegen (Betrieb → Flächen)."));
  const letzte = new Map();
  for (const p of proben.sort((a, b) => b.datum.localeCompare(a.datum))) if (!letzte.has(p.feldstueck_id)) letzte.set(p.feldstueck_id, p);
  const alt = [...letzte.values()].filter((p) => p.datum < `${Number(heute().slice(0, 4)) - 5}${heute().slice(4)}`);
  if (alt.length) ziel.append(h("p", { class: "hinweis hinweis-info" }, `${alt.length} Feldstück(e) mit Bodenprobe älter als 5 Jahre. Für GLÖZ 10 (mehr als 100 kg P₂O₅/ha mineralisch zusätzlich zu Wirtschaftsdünger) muss die Probe höchstens 5 Jahre alt sein.`));

  ziel.append(h("ul", { class: "personenliste", "data-test": "bodenprobenliste" }, feldstuecke.map((f) => {
    const p = letzte.get(f.id);
    return h("li", {}, h("a", { class: "personenkarte", href: p ? `#/bodenprobe?id=${p.id}` : `#/bodenprobe?feldstueck=${f.id}` },
      h("strong", {}, fsName(f)),
      h("span", {}, p ? `${datumText(p.datum)}: ${klassenText(p, regel)}` : "Keine Bodenprobe"),
      p ? null : h("span", { class: "status status-neutral" }, "Probe eintragen")));
  })));

  // Karte: Feldstücke nach Gehaltsklasse eingefärbt
  const legende = h("p", { class: "klein" }, "Farbe = Gehaltsklasse der letzten Probe: ", ...Object.keys(FARBEN).flatMap((k) => [h("span", { class: `klasse klasse-${k}` }, `■ ${k} (${regel.werte.klassen_text[k]})`), " "]), "grau = keine Probe.");
  const kartenBereich = h("div", { class: "karte-bereich" });
  const ebenen = feldstuecke.filter((f) => f.geometrie).map((f) => {
    const p = letzte.get(f.id);
    let klasse = null;
    if (p && naehrstoff === "ph") klasse = p.ph == null ? null : p.ph < 5.5 ? "A" : p.ph < 6 ? "B" : p.ph <= 7.2 ? "C" : "D";
    else if (p) klasse = gehaltsklassen(p, regel).klassen[naehrstoff] ?? null;
    return { geometrie: f.geometrie, art: "feldstueck", titel: `${fsName(f)}${klasse ? `: Klasse ${klasse}` : ""}`, stil: { fillColor: klasse ? FARBEN[klasse] : "#9e9e9e", fillOpacity: 0.55, color: "#000000", weight: 2 },
      beimTippen: () => gehe(p ? `bodenprobe?id=${p.id}` : `bodenprobe?feldstueck=${f.id}`) };
  });
  ziel.append(h("h2", {}, "Karte"),
    h("ul", { class: "gruppenwahl", "aria-label": "Nährstoff für die Karte" }, NAEHRSTOFFE.map(([k, t]) => h("li", {}, h("a", { href: `#/bodenproben?zeige=${k}`, "aria-current": k === naehrstoff ? "page" : null }, t)))),
    naehrstoff === "ph" ? h("p", { class: "klein" }, "pH: rot unter 5,5 · orange 5,5–6 · grün 6–7,2 · blau über 7,2 (vereinfachte Darstellung).") : legende,
    kartenBereich);
  if (ebenen.length) zeigeKarte(kartenBereich, { ebenen }).catch((e) => kartenBereich.append(h("p", { class: "hinweis hinweis-fehler" }, e.message)));
  else kartenBereich.append(h("p", { class: "hinweis" }, "Für die Feldstücke sind keine Umrisse gespeichert (kommen mit dem eAMA-Import)."));
  ziel.append(h("p", { class: "klein" }, "Einstufung nach den ", h("a", { href: regel.quelle, target: "_blank", rel: "noopener noreferrer" }, "Richtlinien für die sachgerechte Düngung, 8. Auflage"), " (Tabellen 7, 14, 16, 17)."));
}

// ---------- Eingabe ----------

export async function renderBodenprobe(ziel) {
  const betrieb = await aktiverBetrieb();
  if (!betrieb) return ohneBetrieb(ziel);
  const p = parameter();
  const alt = p.get("id") ? await daten.hole("bodenprobe", p.get("id")) : null;
  const [feldstuecke, regel] = await Promise.all([daten.liste("feldstueck", { index: "betrieb_id", wert: betrieb.id }), regeln.lade("boden/gehaltsklassen")]);
  feldstuecke.sort((a, b) => (a.nummer ?? 9999) - (b.nummer ?? 9999));
  const fsStart = feldstuecke.find((f) => f.id === (alt?.feldstueck_id ?? p.get("feldstueck")));
  ziel.append(h("h1", {}, alt ? `Bodenprobe ${datumText(alt.datum)}` : "Bodenprobe eintragen"));
  const ergebnis = h("div", { "aria-live": "polite", "data-test": "gehaltsklassen" });
  const form = formular(
    { abbrechen: () => gehe("bodenproben"), beimSpeichern: (f) => speichern(f) },
    abschnitt("Probe",
      auswahl({ pfad: "feldstueck_id", label: "Feldstück", wert: fsStart?.id, optionen: feldstuecke.map((f) => ({ wert: f.id, text: fsName(f) })), pflicht: true }),
      datumsfeld({ pfad: "datum", label: "Datum der Probenahme", wert: alt?.datum ?? heute(), pflicht: true }),
      textfeld({ pfad: "labor", label: "Labor", wert: alt?.labor, maxlength: 80 }),
      h("div", { class: "feldraster" },
        textfeld({ pfad: "probennummer", label: "Probennummer", wert: alt?.probennummer, maxlength: 40 }),
        textfeld({ pfad: "tiefe_cm", label: "Tiefe in cm", wert: alt?.tiefe_cm ?? (fsStart?.nutzungsart === "gruenland" ? "0–10" : "0–30"), maxlength: 10 })),
      knopfauswahl({ pfad: "nutzung", label: "Nutzung", wert: alt?.nutzung ?? (fsStart?.nutzungsart === "gruenland" ? "gruenland" : "acker"), optionen: [{ wert: "acker", text: "Acker" }, { wert: "gruenland", text: "Grünland" }] }),
      auswahl({ pfad: "bodenschwere", label: "Bodenschwere", wert: alt?.bodenschwere ?? fsStart?.bodenschwere, leer: "Aus Tongehalt bzw. unbekannt",
        optionen: [{ wert: "leicht", text: "Leicht (Ton unter 15 %)" }, { wert: "mittel", text: "Mittel (Ton 15–25 %)" }, { wert: "schwer", text: "Schwer (Ton über 25 %)" }], hilfe: "Wichtig für die Einstufung von Kalium und Magnesium" })),
    abschnitt("Messwerte",
      h("p", { class: "feld-hilfe" }, "Wie im Befund: mg Reinnährstoff je 1.000 g Feinboden (P und K im CAL-Extrakt). Steht im Befund mg P₂O₅ bzw. K₂O je 100 g, bitte den CSV-Import mit Umrechnung verwenden."),
      h("div", { class: "feldraster" },
        textfeld({ pfad: "ph", label: "pH (CaCl₂)", wert: zw(alt?.ph), inputmode: "decimal", maxlength: 5 }),
        textfeld({ pfad: "p_mg_kg", label: "P mg/1.000 g", wert: zw(alt?.p_mg_kg), inputmode: "decimal", maxlength: 6 }),
        textfeld({ pfad: "k_mg_kg", label: "K mg/1.000 g", wert: zw(alt?.k_mg_kg), inputmode: "decimal", maxlength: 6 }),
        textfeld({ pfad: "mg_mg_kg", label: "Mg mg/1.000 g", wert: zw(alt?.mg_mg_kg), inputmode: "decimal", maxlength: 6 }),
        textfeld({ pfad: "humus_prozent", label: "Humus %", wert: zw(alt?.humus_prozent), inputmode: "decimal", maxlength: 5 }),
        textfeld({ pfad: "ton_prozent", label: "Ton %", wert: zw(alt?.ton_prozent), inputmode: "decimal", maxlength: 5 }),
        textfeld({ pfad: "nmin_kg_ha", label: "Nmin kg/ha", wert: zw(alt?.nmin_kg_ha), inputmode: "decimal", maxlength: 6 }))),
    h("h2", {}, "Einstufung"), ergebnis,
  );
  ziel.append(form);
  if (alt) ziel.append(h("button", { class: "knopf knopf-gefahr", type: "button", onclick: async () => {
    if (!await bestaetige(`Bodenprobe vom ${datumText(alt.datum)} löschen?`, { ja: "Löschen", gefahr: true })) return;
    await daten.loeschen("bodenprobe", alt.id);
    meldung("Bodenprobe gelöscht.", "info");
    gehe("bodenproben");
  } }, "Löschen"));

  const lese = () => {
    const w = werte(form);
    const probe = { ...(alt ?? {}), betrieb_id: betrieb.id, feldstueck_id: w.feldstueck_id || undefined, datum: w.datum || undefined, nutzung: w.nutzung || undefined };
    for (const k of ["labor", "probennummer", "tiefe_cm", "bodenschwere"]) { if (w[k]) probe[k] = w[k]; else delete probe[k]; }
    for (const k of ["ph", "p_mg_kg", "k_mg_kg", "mg_mg_kg", "humus_prozent", "ton_prozent", "nmin_kg_ha"]) { const z = zahlAus(w[k]); if (z !== undefined) probe[k] = z; else delete probe[k]; }
    if (!probe.bodenschwere && typeof probe.ton_prozent === "number") probe.bodenschwere = schwereAusTon(probe.ton_prozent);
    return probe;
  };
  const zeige = () => {
    const probe = lese();
    ergebnis.replaceChildren(h("p", { class: "hinweis hinweis-info" }, klassenText(probe, regel) || "Messwerte eintragen – die Gehaltsklassen erscheinen hier."));
  };
  form.addEventListener("input", zeige);
  form.addEventListener("change", zeige);
  zeige();

  async function speichern(f) {
    const probe = lese();
    const { klassen } = gehaltsklassen(probe, regel);
    if (Object.keys(klassen).length) probe.gehaltsklassen = klassen; else delete probe.gehaltsklassen;
    try {
      await daten.speichern("bodenprobe", probe);
      meldung("Bodenprobe gespeichert.", "erfolg");
      gehe("bodenproben");
    } catch (e) {
      if (e.name !== "ValidierungsFehler") throw e;
      zeigeFehler(f, e.fehler, { feldstueck_id: { required: "Bitte das Feldstück wählen." }, datum: { required: "Bitte das Datum der Probenahme eintragen." } });
    }
  }
}

// ---------- CSV-Import ----------

export async function renderImport(ziel) {
  ziel.append(h("h1", {}, "Laborbefund einlesen"));
  const betrieb = await aktiverBetrieb();
  if (!betrieb) return ohneBetrieb(ziel);
  const [feldstuecke, regel] = await Promise.all([daten.liste("feldstueck", { index: "betrieb_id", wert: betrieb.id }), regeln.lade("boden/gehaltsklassen")]);
  const vorschau = h("div", { "aria-live": "polite", "data-test": "boden-vorschau" });
  const eingabe = h("input", { type: "file", id: "boden-datei", class: "versteckt", accept: ".csv,.txt,text/csv", "data-test": "boden-datei", onchange: async () => {
    const datei = eingabe.files[0];
    eingabe.value = "";
    if (datei) zeigeVorschau(parseCsv(await datei.text()), datei.name);
  } });
  ziel.append(karte("So geht’s",
    h("p", {}, "Viele Labore liefern den Befund auch als Excel- bzw. CSV-Datei. In Excel „Speichern unter → CSV“ wählen. Die Datei braucht eine Kopfzeile, eine Zeile je Probe und eine Spalte mit der Feldstücknummer oder dem Feldstücknamen."),
    h("p", { class: "klein" }, "Erkannt werden u. a. die Spalten Feldstück, Datum, Probe, pH, P, K, Mg, Humus, Ton. Vor dem Speichern sehen Sie eine Vorschau.")),
  eingabe, h("label", { for: "boden-datei", class: "knopf", role: "button", tabindex: "0", onkeydown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); eingabe.click(); } } }, "CSV-Datei auswählen …"),
  vorschau);

  function zeigeVorschau(csv, name) {
    if (!csv.daten.length) return vorschau.replaceChildren(h("p", { class: "hinweis hinweis-fehler" }, "Die Datei enthält keine Datenzeilen."));
    const z = automatischeZuordnung(csv.kopf);
    const zustand = { z, oxid: vermuteOxid(csv.kopf, z), nutzung: "acker", datum: heute() };
    const zeichne = () => {
      const zeilen = erstelleVorschau(csv, zustand.z, { feldstuecke, oxid: zustand.oxid, standardDatum: zustand.z.datum == null ? zustand.datum : null });
      const ok = zeilen.filter((r) => !r.fehler.length);
      vorschau.replaceChildren(
        karte(`Vorschau: ${name}`,
          h("p", { "data-test": "boden-summe" }, `${zeilen.length} Zeilen, ${ok.length} lesbar${zeilen.length > ok.length ? `, ${zeilen.length - ok.length} mit Problemen` : ""}.`),
          knopfauswahl({ pfad: "oxid", label: "Einheit von P und K im Befund", wert: zustand.oxid ? "oxid" : "rein",
            optionen: [{ wert: "rein", text: "mg P bzw. K je 1.000 g (österreichische Labore)" }, { wert: "oxid", text: "mg P₂O₅ bzw. K₂O je 100 g", hilfe: "wird umgerechnet" }],
            beiAenderung: (e) => { zustand.oxid = e.target.value === "oxid"; zeichne(); } }),
          knopfauswahl({ pfad: "nutzung", label: "Nutzung der Flächen", wert: zustand.nutzung, optionen: [{ wert: "acker", text: "Acker" }, { wert: "gruenland", text: "Grünland" }], beiAenderung: (e) => { zustand.nutzung = e.target.value; zeichne(); } }),
          zustand.z.datum == null ? h("div", { class: "feld" }, h("label", { for: "boden-standarddatum" }, "Datum der Probenahme (fehlt in der Datei)"),
            h("input", { type: "date", id: "boden-standarddatum", value: zustand.datum, onchange: (e) => { zustand.datum = e.target.value; zeichne(); } })) : null,
          h("ul", { class: "personenliste" }, zeilen.map((r) => h("li", {}, h("div", { class: "personenkarte" },
            h("strong", {}, `Zeile ${r.zeile}: ${r.feldstueck ? fsName(r.feldstueck) : "?"}`),
            h("span", {}, r.probe.datum ? `${datumText(r.probe.datum)} · ${klassenText({ ...r.probe, nutzung: zustand.nutzung, bodenschwere: r.feldstueck?.bodenschwere }, regel) || "–"}` : "–"),
            ...r.fehler.map((f) => h("span", { class: "status status-fehler" }, f)))))),
          h("button", { class: "knopf", type: "button", disabled: !ok.length, "data-test": "boden-uebernehmen", onclick: async (e) => {
            e.currentTarget.disabled = true;
            let n = 0;
            for (const r of ok) {
              const probe = { betrieb_id: betrieb.id, feldstueck_id: r.feldstueck.id, nutzung: zustand.nutzung, ...r.probe };
              if (r.feldstueck.bodenschwere && !probe.bodenschwere) probe.bodenschwere = r.feldstueck.bodenschwere;
              if (!probe.bodenschwere && typeof probe.ton_prozent === "number") probe.bodenschwere = schwereAusTon(probe.ton_prozent);
              const { klassen } = gehaltsklassen(probe, regel);
              if (Object.keys(klassen).length) probe.gehaltsklassen = klassen;
              await daten.speichern("bodenprobe", probe);
              n++;
            }
            meldung(`${n} Bodenproben übernommen.`, "erfolg");
            gehe("bodenproben");
          } }, `${ok.length} Proben übernehmen`)),
        karte("Zuordnung der Spalten", h("div", { class: "zuordnungsliste" }, Object.entries(FELDER).map(([feld, def]) => h("div", { class: "zuordnungszeile" },
          h("label", { for: `boden-${feld}` }, def.text),
          h("select", { id: `boden-${feld}`, onchange: (e) => { if (e.target.value === "") delete zustand.z[feld]; else zustand.z[feld] = Number(e.target.value); zeichne(); } },
            h("option", { value: "" }, "– keine –"), csv.kopf.map((s, i) => h("option", { value: i, selected: zustand.z[feld] === i }, s))))))));
    };
    zeichne();
  }
}
