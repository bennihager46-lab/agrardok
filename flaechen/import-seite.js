// Seite „Flächen aus eAMA importieren“: Datei wählen → Vorschau (Zuordnung, Karte, Liste) → übernehmen.

import * as daten from "../core/daten.js";
import * as regeln from "../core/regeln.js";
import { gehe, parameter } from "../core/router.js";
import { h, karte, meldung } from "../core/ui/dom.js";
import { zeigeKarte } from "../core/ui/karte.js";
import { aktiverBetrieb } from "../core/betrieb.js";
import { kulturen } from "./katalog.js";
import { leseDateien, erkenneEbene, automatischeZuordnung, erstellePlan, wendeAn } from "./import.js";
import { NUTZUNGSARTEN, aktuellesJahr, fsBezeichnung } from "./seiten.js";

const EBENEN_ARTEN = [
  { wert: "schlaege", text: "Schläge" }, { wert: "feldstuecke", text: "Feldstücke" }, { wert: "ignorieren", text: "Nicht importieren" },
];
const ha = (z) => `${Number(z ?? 0).toLocaleString("de-AT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ha`;

export async function renderImport(ziel) {
  ziel.append(h("h1", {}, "Flächen importieren"));
  const betrieb = await aktiverBetrieb();
  if (!betrieb) {
    ziel.append(karte("Zuerst den Betrieb einrichten", h("a", { class: "knopf", href: "#/betrieb-bearbeiten" }, "Betrieb einrichten")));
    return;
  }
  const regel = await regeln.lade("import/eama-gis");
  const vorschau = h("div", { "aria-live": "polite", "data-test": "import-vorschau" });
  const eingabe = h("input", { type: "file", id: "flaechen-datei", class: "versteckt", multiple: true, "data-test": "flaechen-datei",
    accept: ".zip,.shp,.dbf,.prj,.cpg,.shx,.geojson,.json,application/zip,application/geo+json",
    onchange: async () => {
      const dateien = [...eingabe.files];
      eingabe.value = "";
      if (dateien.length) await lese(dateien, { vorschau, betrieb, regel });
    } });

  ziel.append(
    karte("So kommen Ihre Flächen aus eAMA",
      h("ol", {},
        h("li", {}, "In eAMA den Mehrfachantrag bzw. INVEKOS-GIS öffnen."),
        h("li", {}, "Oben „Extras“ → „GIS Datenexport“ wählen."),
        h("li", {}, "Als Dateiformat „Shapefile“ wählen und die beantragten Schläge (oder Feldstücke) anfordern."),
        h("li", {}, "Wenn der Export fertig ist, die ZIP-Datei herunterladen und hier auswählen – sie muss nicht entpackt werden.")),
      h("p", { class: "klein" }, "Auch möglich: Shapefile-Teile (.shp, .dbf, .prj) einzeln oder GeoJSON. Sie sehen vor dem Speichern eine Vorschau; vorhandene Flächen werden wiedererkannt und nicht doppelt angelegt.")),
    eingabe,
    h("label", { for: "flaechen-datei", class: "knopf", role: "button", tabindex: "0",
      onkeydown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); eingabe.click(); } } }, "Datei auswählen …"),
    vorschau,
  );
}

async function lese(dateien, kontext) {
  const { vorschau } = kontext;
  vorschau.replaceChildren(h("p", {}, "Datei wird gelesen …"));
  let ergebnis;
  try {
    ergebnis = await leseDateien(dateien);
  } catch (e) {
    vorschau.replaceChildren(h("p", { class: "hinweis hinweis-fehler", role: "alert" }, `Die Datei konnte nicht gelesen werden: ${e.message}`));
    return;
  }
  if (!ergebnis.ebenen.length) {
    vorschau.replaceChildren(h("div", { class: "hinweis hinweis-fehler", role: "alert" }, h("ul", {}, ergebnis.fehler.map((f) => h("li", {}, f)))));
    return;
  }
  const zustand = {
    ...kontext, dateiname: dateien.map((d) => d.name).join(", "), ebenen: ergebnis.ebenen, lesefehler: ergebnis.fehler,
    jahr: Number(parameter().get("jahr")) || aktuellesJahr(),
    einstellungen: ergebnis.ebenen.map((e) => {
      const art = erkenneEbene(e.spalten, kontext.regel);
      return { art: art === "unbekannt" ? "schlaege" : art, erkannt: art, zuordnung: automatischeZuordnung(e.spalten, kontext.regel) };
    }),
  };
  await zeigeVorschau(zustand);
}

async function zeigeVorschau(z) {
  const { vorschau, betrieb, regel } = z;
  const [feldstuecke, schlaege, kult] = await Promise.all([
    daten.liste("feldstueck", { index: "betrieb_id", wert: betrieb.id }),
    daten.liste("schlag", { index: "betrieb_id", wert: betrieb.id }),
    kulturen(betrieb.id),
  ]);
  const plan = erstellePlan({ ebenen: z.ebenen, einstellungen: z.einstellungen, jahr: z.jahr, bestand: { feldstuecke, schlaege, kulturen: kult }, regel });
  const neuZeichnen = () => zeigeVorschau(z);

  // Kopf: Datei, Koordinatensystem, Jahr
  const kopf = karte("Vorschau",
    h("dl", { class: "angaben" },
      h("dt", {}, "Datei"), h("dd", {}, z.dateiname),
      ...z.ebenen.flatMap((e) => [h("dt", {}, `Ebene „${e.name}“`),
        h("dd", {}, `${e.datensaetze.length} Flächen · ${e.quelle} · ${e.koordinatensystem}${e.kodierung ? ` · Zeichensatz ${e.kodierung}` : ""}`)])),
    h("div", { class: "feld" },
      h("label", { for: "import-jahr" }, "Antragsjahr der Schläge"),
      h("select", { id: "import-jahr", "data-test": "import-jahr", onchange: (e) => { z.jahr = Number(e.target.value); neuZeichnen(); } },
        [aktuellesJahr() + 1, aktuellesJahr(), aktuellesJahr() - 1, aktuellesJahr() - 2].map((j) => h("option", { value: j, selected: j === z.jahr }, String(j))))),
  );

  // Zuordnung der Spalten
  const zuordnung = karte("Zuordnung der Spalten",
    h("p", { class: "klein" }, "Automatisch erkannt. Nur ändern, wenn etwas nicht passt."),
    ...z.ebenen.map((e, i) => {
      const einst = z.einstellungen[i];
      const felder = Object.entries(regel.werte.felder).filter(([feld]) =>
        einst.art === "feldstuecke" ? !["sl_nummer", "snar_code", "snar_bezeichnung", "sl_flaeche_ha", "bio"].includes(feld)
          : !["fnar_code", "fnar_bezeichnung", "fs_flaeche_ha"].includes(feld));
      return h("div", { class: "zuordnung" },
        h("div", { class: "feld" },
          h("label", { for: `ebene-${i}` }, `Ebene „${e.name}“ enthält`),
          h("select", { id: `ebene-${i}`, "data-test": `ebene-art-${i}`, onchange: (ev) => { einst.art = ev.target.value; neuZeichnen(); } },
            EBENEN_ARTEN.map((o) => h("option", { value: o.wert, selected: o.wert === einst.art }, o.text)))),
        einst.art === "ignorieren" ? null : h("div", { class: "zuordnungsliste" }, felder.map(([feld, def]) => {
          const id = `zuordnung-${i}-${feld}`;
          return h("div", { class: "zuordnungszeile" },
            h("label", { for: id }, def.text),
            h("select", { id, "data-feld": feld, onchange: (ev) => { einst.zuordnung[feld] = ev.target.value || null; neuZeichnen(); } },
              h("option", { value: "" }, "– keine –"),
              e.spalten.map((s) => h("option", { value: s, selected: s === einst.zuordnung[feld] }, s))));
        })));
    }),
  );

  // Ergebnis
  const s = plan.summe;
  const ergebnis = karte("Das wird importiert",
    h("p", { "data-test": "import-summe" },
      `${s.feldstuecke} Feldstücke (${s.feldstuecke_neu} neu, ${s.feldstuecke - s.feldstuecke_neu} vorhanden) · `,
      `${s.schlaege} Schläge für ${plan.jahr} (${s.schlaege_neu} neu, ${s.schlaege - s.schlaege_neu} aktualisiert) · ${ha(s.flaeche_ha)}`),
    [...z.lesefehler, ...z.ebenen.flatMap((e) => e.hinweise), ...plan.warnungen].length
      ? h("ul", { class: "hinweis hinweis-warnung liste-schlicht", "data-test": "import-warnungen" },
        [...z.lesefehler, ...z.ebenen.flatMap((e) => e.hinweise), ...plan.warnungen].map((w) => h("li", {}, w)))
      : null,
    h("ul", { class: "flaechenliste" }, plan.feldstuecke.map((fs) => h("li", { class: "feldstueck-eintrag" },
      h("div", { class: "feldstueck-kopf" },
        h("strong", {}, fsBezeichnung(fs)),
        h("span", {}, `${NUTZUNGSARTEN.find((n) => n.wert === fs.nutzungsart)?.text ?? fs.nutzungsart} · ${ha(fs.flaeche_ha)} `,
          h("span", { class: `status ${fs.vorhanden ? "status-neutral" : "status-ok"}` }, fs.vorhanden ? "vorhanden – wird aktualisiert" : "neu"))),
      fs.schlaege.length ? h("ul", { class: "schlagliste" }, fs.schlaege.map((sl) => h("li", {}, h("div", {},
        h("span", {}, `Schlag ${sl.nummer}: ${sl.kultur.name}`, sl.kultur.neu ? h("span", { class: "status status-warnung" }, "neue Kultur") : null),
        h("span", {}, ha(sl.flaeche_ha)),
        sl.vorfrucht ? h("small", {}, `Vorfrucht: ${sl.vorfrucht.name}`) : null)))) : null))),
  );

  const kartenBereich = h("div", { class: "karte-bereich", "data-test": "import-karte" });
  const knoepfe = h("div", { class: "knopfreihe" },
    h("button", { class: "knopf", type: "button", "data-test": "import-uebernehmen", disabled: !s.feldstuecke, onclick: async (e) => {
      e.currentTarget.disabled = true;
      try {
        const r = await wendeAn(plan, betrieb);
        meldung(`Import fertig: ${r.feldstuecke} Feldstücke, ${r.schlaege} Schläge.`, "erfolg", 8000);
        gehe(`flaechen?jahr=${plan.jahr}`);
      } catch (fehler) {
        console.error(fehler);
        e.currentTarget.disabled = false;
        vorschau.prepend(h("div", { class: "hinweis hinweis-fehler", role: "alert" }, h("p", {}, "Import abgebrochen – es wurde nichts gespeichert."),
          h("ul", {}, (fehler.fehler ?? [fehler.message]).slice(0, 10).map((f) => h("li", {}, f)))));
      }
    } }, "Importieren"),
    h("button", { class: "knopf knopf-zweit", type: "button", onclick: () => gehe("flaechen") }, "Abbrechen"));

  vorschau.replaceChildren(kopf, ergebnis, kartenBereich, knoepfe, zuordnung);
  const ebenen = plan.feldstuecke.flatMap((fs) => [
    { geometrie: fs.geometrie, art: "feldstueck", titel: fsBezeichnung(fs) },
    ...fs.schlaege.map((sl) => ({ geometrie: sl.geometrie, art: "schlag", titel: `Schlag ${sl.nummer}: ${sl.kultur.name} (${ha(sl.flaeche_ha)})` })),
  ]);
  if (ebenen.some((x) => x.geometrie)) {
    zeigeKarte(kartenBereich, { ebenen }).catch((e) => kartenBereich.append(h("p", { class: "hinweis hinweis-fehler" }, e.message)));
  }
}
