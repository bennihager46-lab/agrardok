// Seite „Düngung erfassen“: Dünger wählen, Menge je ha, Schläge, Datum – Nährstoffe und NAPV-Prüfungen laufen live mit.

import * as daten from "../core/daten.js";
import * as regeln from "../core/regeln.js";
import { aktiverBetrieb } from "../core/betrieb.js";
import { schlaegeImJahr, massnahmen, aktuellesJahr, heute, datumText, haText, zahlText } from "../core/bestand.js";
import { gehe, parameter } from "../core/router.js";
import { h, karte, meldung, bestaetige } from "../core/ui/dom.js";
import { textfeld, auswahl, knopfauswahl, formular, abschnitt, werte, zeigeFehler, zahlAus, jaNeinAus } from "../core/ui/formular.js";
import { schlagwahl, leseSchlagwahl } from "../core/ui/schlagwahl.js";
import { personenUndGeraete, wannWer, notizfeld, zeigeWarnungen, leseBestaetigungen, offeneBestaetigungen } from "../core/ui/aufzeichnung.js";
import { naehrstoffe, pruefeAusbringung } from "./napv.js";

export const DUENGER = ["mineralduenger", "wirtschaftsduenger", "organischer_duenger"];
const ART_TEXT = { mineralduenger: "Mineraldünger", wirtschaftsduenger: "Wirtschaftsdünger", organischer_duenger: "Organische Dünger" };
const EINHEITEN = [["kg_je_ha", "kg/ha"], ["dt_je_ha", "dt/ha"], ["t_je_ha", "t/ha"], ["m3_je_ha", "m³/ha"], ["l_je_ha", "l/ha"]].map(([wert, text]) => ({ wert, text }));
const TECHNIK = [["breitverteiler", "Breitverteiler (Prallteller)"], ["schleppschlauch", "Schleppschlauch"], ["schleppschuh", "Schleppschuh"], ["injektor", "Injektor/Schlitzgerät"], ["streuer", "Streuer"], ["sonstige", "Sonstige"]].map(([wert, text]) => ({ wert, text }));
const MENGE_EINHEIT = { kg_je_ha: "kg", dt_je_ha: "dt", t_je_ha: "t", m3_je_ha: "m3", l_je_ha: "l" };
const zw = (n) => (n == null ? "" : String(n).replace(".", ","));
export const regelVersion = (r) => `${r.name}@${r.gueltig_ab}`;

/** Passende Einheit für den Aufwand je nach Gehaltsangabe des Düngers. */
export function standardEinheit(d, grundeinheit) {
  if (d?.bezug === "kg_je_m3") return "m3_je_ha";
  if (d?.bezug === "kg_je_t") return "t_je_ha";
  return grundeinheit === "l" ? "l_je_ha" : "kg_je_ha";
}

export async function renderDuengungErfassen(ziel) {
  ziel.append(h("h1", {}, "Düngung"));
  const betrieb = await aktiverBetrieb();
  if (!betrieb) return ziel.append(karte("Zuerst den Betrieb einrichten", h("a", { class: "knopf", href: "#/betrieb-bearbeiten" }, "Betrieb einrichten")));
  const p = parameter();
  const alt = p.get("id") ? await daten.hole("massnahme", p.get("id")) : null;
  if (p.get("id") && (!alt || alt.geloescht || alt.art !== "duengung")) return gehe("aufzeichnen");
  const jahr = Number(alt?.datum?.slice(0, 4) ?? p.get("jahr")) || aktuellesJahr();

  const [eintraege, alleMs, bm, regel, begruenung, plaene, { personen, maschinen }] = await Promise.all([
    schlaegeImJahr(betrieb.id, jahr), massnahmen(betrieb.id), daten.liste("betriebsmittel", { index: "betrieb_id", wert: betrieb.id }),
    regeln.lade("napv/duengung"), regeln.lade("oepul/begruenung"), daten.liste("duengeplan", { index: "betrieb_id", wert: betrieb.id }), personenUndGeraete(betrieb.id),
  ]);
  const zuletzt = new Map();
  for (const m of alleMs) if (m.art === "duengung" && m.details?.betriebsmittel_id && !zuletzt.has(m.details.betriebsmittel_id)) zuletzt.set(m.details.betriebsmittel_id, m.datum);
  const duenger = bm.filter((b) => DUENGER.includes(b.art) && (b.aktiv !== false || b.id === alt?.details?.betriebsmittel_id))
    .sort((a, b) => (zuletzt.get(b.id) ?? "").localeCompare(zuletzt.get(a.id) ?? "") || a.name.localeCompare(b.name, "de"));
  if (!duenger.length) {
    ziel.append(karte("Zuerst einen Dünger anlegen",
      h("p", {}, "Dünger werden einmal mit ihren Nährstoffgehalten angelegt und dann hier mit einem Tipp gewählt."),
      h("a", { class: "knopf", href: "#/betriebsmittel-neu?gruppe=duenger" }, "Dünger anlegen")));
    return;
  }
  const letzte = alt ?? alleMs.find((m) => m.art === "duengung");
  const start = alt?.details ?? (letzte ? { betriebsmittel_id: letzte.details.betriebsmittel_id, aufwand: letzte.details.aufwand, ausbringtechnik: letzte.details.ausbringtechnik } : { betriebsmittel_id: duenger[0].id });
  const oepulZf = (betrieb.oepul_massnahmen ?? []).includes("begruenung_zwischenfruchtanbau");
  const planVon = new Map(plaene.filter((x) => x.jahr === jahr && !x.geloescht).map((x) => [x.schlag_id, x]));

  const rechnung = h("div", { "aria-live": "polite", "data-test": "duengung-rechnung" });
  const warnBereich = h("div", { "aria-live": "polite" });
  const technikFeld = h("div");
  const form = formular(
    { abbrechen: () => history.back(), beimSpeichern: (f) => speichern(f) },
    abschnitt("Dünger und Menge",
      auswahl({ pfad: "details/betriebsmittel_id", label: "Dünger", wert: start.betriebsmittel_id, pflicht: true, leer: null,
        optionen: duenger.map((d) => ({ wert: d.id, text: d.name, gruppe: d.art })), gruppen: ART_TEXT }),
      h("p", { class: "klein" }, h("a", { href: "#/betriebsmittel-neu?gruppe=duenger" }, "Neuen Dünger anlegen")),
      h("div", { class: "feldraster" },
        textfeld({ pfad: "details/aufwand/wert", label: "Menge je ha", wert: zw(start.aufwand?.wert), inputmode: "decimal", pflicht: true, maxlength: 10 }),
        auswahl({ pfad: "details/aufwand/einheit", label: "Einheit", wert: start.aufwand?.einheit, optionen: EINHEITEN, leer: null })),
      technikFeld),
    schlagwahl({ eintraege, gewaehlt: alt?.schlag_ids ?? (p.get("schlag") ? [p.get("schlag")] : []), label: "Auf welchen Schlägen?", hilfe: `Schläge ${jahr}` }),
    wannWer({ m: alt ?? { datum: heute(), person_ids: letzte?.person_ids, maschine_ids: letzte?.maschine_ids }, personen, maschinen, maschinenArten: ["traktor", "duengerstreuer", "guellefass"] }),
    h("details", { class: "mehr" }, h("summary", {}, "Weitere Angaben"),
      knopfauswahl({ pfad: "vlies_folie", label: "Kultur unter Vlies oder Folie?", wert: "nein", optionen: [{ wert: "ja", text: "Ja" }, { wert: "nein", text: "Nein" }],
        hilfe: "Dann endet die Sperrfrist schon am 31. Jänner (§ 2 Abs. 1 Z 3 NAPV)." }),
      notizfeld(alt ?? {})),
    h("h2", {}, "Berechnung"), rechnung,
    h("h2", {}, "Prüfung nach NAPV"), warnBereich,
  );
  ziel.append(form);
  if (alt) ziel.append(h("button", { class: "knopf knopf-gefahr", type: "button", onclick: async () => {
    if (!await bestaetige(`Düngung vom ${datumText(alt.datum)} löschen?`, { ja: "Löschen", gefahr: true })) return;
    await daten.loeschen("massnahme", alt.id);
    meldung("Düngung gelöscht.", "info");
    history.back();
  } }, "Löschen"));

  const auswahlDuenger = () => duenger.find((d) => d.id === form.querySelector('[name="details/betriebsmittel_id"]').value);
  const einheitFeld = form.querySelector('[name="details/aufwand/einheit"]');
  const zeichneTechnik = () => {
    const d = auswahlDuenger();
    const fluessig = d && ["kg_je_m3"].includes(d.duenger?.bezug);
    technikFeld.replaceChildren(d && d.art !== "mineralduenger"
      ? auswahl({ pfad: "details/ausbringtechnik", label: "Ausbringtechnik", wert: start.ausbringtechnik ?? (fluessig ? "" : "streuer"), optionen: TECHNIK, leer: "Nicht angegeben",
        hilfe: fluessig ? "Für ÖPUL „Bodennahe Ausbringung“: Schleppschlauch, Schleppschuh oder Injektor" : null })
      : null);
  };
  form.querySelector('[name="details/betriebsmittel_id"]').addEventListener("change", () => {
    const d = auswahlDuenger();
    einheitFeld.value = standardEinheit(d?.duenger, d?.grundeinheit);
    zeichneTechnik();
  });
  if (!start.aufwand?.einheit) { const d = auswahlDuenger(); einheitFeld.value = standardEinheit(d?.duenger, d?.grundeinheit); }
  zeichneTechnik();

  function berechne() {
    const w = werte(form);
    const d = auswahlDuenger();
    const aufwand = { wert: zahlAus(w["details/aufwand/wert"]), einheit: w["details/aufwand/einheit"] };
    const ids = leseSchlagwahl(form);
    const gewaehlt = eintraege.filter((e) => ids.includes(e.schlag.id));
    const flaeche = gewaehlt.reduce((s, e) => s + (e.schlag.flaeche_ha ?? 0), 0);
    // Mineraldünger sind immer „mineralisch“ (100 % jahreswirksam), auch wenn die Düngerart beim Betriebsmittel fehlt (Daten vor 0.5)
    const gehalte = d?.duenger && !d.duenger.napv_typ && d.art === "mineralduenger" ? { ...d.duenger, napv_typ: "mineralisch" } : d?.duenger;
    const n = typeof aufwand.wert === "number" && gehalte ? naehrstoffe(gehalte, aufwand, regel) : null;
    return { w, d, aufwand, ids, gewaehlt, flaeche, n };
  }

  function pruefe() {
    const { w, d, gewaehlt, n, flaeche } = berechne();
    if (!n || n.fehler) {
      rechnung.replaceChildren(h("p", { class: n?.fehler ? "hinweis hinweis-warnung" : "klein" }, n?.fehler ?? "Menge eintragen – dann rechnet die App die Nährstoffe aus."));
      zeigeWarnungen(warnBereich, [], alt?.bestaetigungen);
      return [];
    }
    const zeile = (titel, je, gesamt) => h("tr", {}, h("td", {}, titel), h("td", { class: "zahl" }, je == null ? "–" : `${zahlText(je)} kg`), h("td", { class: "zahl" }, je == null || !flaeche ? "–" : `${zahlText(je * flaeche, 0)} kg`));
    rechnung.replaceChildren(
      h("div", { class: "tabelle-rahmen" }, h("table", { class: "rechnung" },
        h("thead", {}, h("tr", {}, h("th", {}, ""), h("th", { class: "zahl" }, "je ha"), h("th", { class: "zahl" }, flaeche ? `gesamt (${haText(flaeche)})` : "gesamt"))),
        h("tbody", {},
          zeile("N gesamt", n.n_gesamt), zeile("N jahreswirksam", n.n_jahreswirksam), zeile("davon leichtlöslich (NH₄/NO₃/Harnstoff)", n.n_leichtloeslich),
          zeile("P₂O₅", n.p2o5), zeile("K₂O", n.k2o)))),
      ...n.hinweise.map((t) => h("p", { class: "hinweis hinweis-warnung" }, t)),
      d.art !== "mineralduenger" && n.n_jahreswirksam != null && d.duenger.napv_typ ? h("p", { class: "klein" },
        `Jahreswirksam = N × (1 − ${zahlText(regel.werte.duengerarten[d.duenger.napv_typ].ausbringungsverlust * 100)} % Ausbringungsverlust) × ${zahlText(regel.werte.duengerarten[d.duenger.napv_typ].jahreswirksamkeit * 100)} % Jahreswirksamkeit (§ 1 Z 14 NAPV).`) : null);
    const gesammelt = new Map();
    for (const e of gewaehlt) {
      const ms = alleMs.filter((m) => m.id !== alt?.id && m.schlag_ids?.includes(e.schlag.id));
      const bisher = ms.filter((m) => m.art === "duengung" && m.datum.slice(0, 4) === (w.datum || heute()).slice(0, 4)).reduce((s, m) => s + (m.details?.naehrstoffe_kg_je_ha?.n_jahreswirksam ?? 0), 0);
      const liste = pruefeAusbringung({ datum: w.datum || heute(), duenger: d.duenger, n, ziel: { ...e, massnahmen: ms, plan: planVon.get(e.schlag.id) }, betrieb, regel,
        begruenung: oepulZf ? begruenung : null, bisherJahreswirksam: bisher, vliesFolie: jaNeinAus(w.vlies_folie) === true });
      for (const x of liste) {
        const k = `${x.code}|${x.text}`;
        if (!gesammelt.has(k)) gesammelt.set(k, { ...x, namen: [] });
        gesammelt.get(k).namen.push(e.bezeichnung);
      }
    }
    const warnungen = [...gesammelt.values()].map(({ namen, ...x }) => ({ ...x, bezug: gewaehlt.length > 1 ? namen.join(", ") : undefined }));
    // § 7 Abs. 1: höchstens 170 kg N aus Wirtschaftsdünger je ha LN im Betriebsdurchschnitt
    if (d.art === "wirtschaftsduenger" && flaeche) {
      const lnHa = eintraege.filter((e) => e.feldstueck?.nutzungsart !== "alm").reduce((s, e) => s + (e.schlag.flaeche_ha ?? 0), 0);
      const flaecheVon = new Map(eintraege.map((e) => [e.schlag.id, e.schlag.flaeche_ha ?? 0]));
      const bisherKg = alleMs.filter((m) => m.id !== alt?.id && m.art === "duengung" && m.details?.duenger_art === "wirtschaftsduenger" && m.datum.startsWith(String(jahr)))
        .reduce((s, m) => s + (m.details.naehrstoffe_kg_je_ha?.n_nach_stall_lager ?? m.details.naehrstoffe_kg_je_ha?.n_gesamt ?? 0) * m.schlag_ids.reduce((a, id) => a + (flaecheVon.get(id) ?? 0), 0), 0);
      const jeHa = lnHa ? (bisherKg + n.n_nach_stall_lager * flaeche) / lnHa : 0;
      const grenze = regel.werte.wirtschaftsduenger_obergrenze_kg_n_ha;
      if (jeHa > grenze) warnungen.push({ code: "napv_170", stufe: "fehler", bestaetigen: true, quelle: regel.werte.quellen.s7,
        text: `Mit dieser Gabe kommen ${zahlText(jeHa)} kg N aus Wirtschaftsdünger je ha LN zusammen – höchstens ${grenze} kg sind im Betriebsdurchschnitt erlaubt (Weide-Ausscheidungen sind noch nicht eingerechnet).` });
    }
    zeigeWarnungen(warnBereich, warnungen, alt?.bestaetigungen);
    return warnungen;
  }
  form.addEventListener("input", pruefe);
  form.addEventListener("change", pruefe);
  pruefe();

  async function speichern(f) {
    pruefe();
    const { w, d, aufwand, ids, flaeche, n } = berechne();
    if (!ids.length) return zeigeFehler(f, [{ pfad: "schlag_ids", art: "minItems", meldung: "Bitte mindestens einen Schlag wählen." }]);
    if (!n || n.fehler) return zeigeFehler(f, [{ pfad: "details/aufwand/wert", art: "fachlich", meldung: n?.fehler ?? "Bitte die Menge je ha eintragen." }]);
    if (offeneBestaetigungen(warnBereich).length) {
      meldung("Bitte die markierten Punkte bei „Prüfung nach NAPV“ lesen und bestätigen.", "warnung", 8000);
      warnBereich.querySelector("[data-bestaetigung]:not(:checked)")?.focus();
      return;
    }
    const nae = Object.fromEntries(["n_gesamt", "n_jahreswirksam", "p2o5", "k2o", "n_nach_stall_lager", "n_leichtloeslich"].filter((k) => n[k] != null).map((k) => [k, n[k]]));
    const details = {
      betriebsmittel_id: d.id, duenger_name: d.name, duenger_art: d.art, aufwand, behandelte_flaeche_ha: Math.round(flaeche * 100) / 100,
      naehrstoffe_kg_je_ha: nae, ...(n.loeslich ? { n_loeslichkeit: n.loeslich } : {}),
      menge_gesamt: { wert: Math.round(aufwand.wert * flaeche * 100) / 100, einheit: MENGE_EINHEIT[aufwand.einheit] },
      ...(w["details/ausbringtechnik"] ? { ausbringtechnik: w["details/ausbringtechnik"] } : d.art === "mineralduenger" ? { ausbringtechnik: "streuer" } : {}),
    };
    const m = { ...(alt ?? {}), betrieb_id: betrieb.id, art: "duengung", modul: "duengung", status: "erledigt", datum: w.datum || undefined, schlag_ids: ids, details, regeln: [regelVersion(regel)] };
    if (w.person_id) m.person_ids = [w.person_id]; else delete m.person_ids;
    if (w.maschine_id) m.maschine_ids = [w.maschine_id]; else delete m.maschine_ids;
    if (w.notiz) m.notiz = w.notiz; else delete m.notiz;
    const best = leseBestaetigungen(warnBereich);
    if (best.length) m.bestaetigungen = best; else delete m.bestaetigungen;
    try {
      await daten.speichern("massnahme", m);
      meldung(`Düngung gespeichert: ${d.name}, ${haText(flaeche)}${n.n_jahreswirksam != null ? `, ${zahlText(n.n_jahreswirksam)} kg N jahreswirksam/ha` : ""}.`, "erfolg", 8000);
      gehe("aufzeichnen");
    } catch (e) {
      if (e.name !== "ValidierungsFehler") throw e;
      zeigeFehler(f, e.fehler, { datum: { required: "Bitte das Datum eintragen." } });
    }
  }
}
