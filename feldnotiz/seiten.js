// Seiten „Feldnotizen“ (Liste) und „Feldnotiz“ (anlegen/ansehen): GPS-Position → Schlag, in dem man steht;
// Fotos werden verkleinert (max. 1600 px, JPEG) und lokal gespeichert; Text per Tastatur oder Spracheingabe.
// Alles funktioniert offline – nur die Spracherkennung des Browsers braucht meist Internet (Rückfall: Tippen).

import * as daten from "../core/daten.js";
import { aktiverBetrieb } from "../core/betrieb.js";
import { schlaegeImJahr, aktuellesJahr, datumText, zahlText } from "../core/bestand.js";
import { punktInGeometrie, abstandM, mittelpunkt } from "../core/geo/punkt.js";
import { gehe, parameter } from "../core/router.js";
import { h, karte, meldung, bestaetige, datumZeit } from "../core/ui/dom.js";
import { auswahl, textbereich, knopfauswahl, formular, abschnitt, werte, zeigeFehler } from "../core/ui/formular.js";

export const KATEGORIEN = [
  ["beobachtung", "Beobachtung"], ["unkraut", "Unkraut"], ["krankheit", "Krankheit"], ["schaedling", "Schädling"],
  ["wild", "Wildschaden"], ["schaden", "Hagel/Sturm/Nässe"], ["bestand", "Bestandesentwicklung"], ["sonstiges", "Sonstiges"],
].map(([wert, text]) => ({ wert, text }));
const MAX_PIXEL = 1600;

/** Foto verkleinern und als JPEG-Data-URL zurückgeben (EXIF-Drehung übernimmt der Browser). */
export async function verkleinere(datei, maxPixel = MAX_PIXEL, qualitaet = 0.75) {
  const bild = await createImageBitmap(datei, { imageOrientation: "from-image" });
  const faktor = Math.min(1, maxPixel / Math.max(bild.width, bild.height));
  const breite = Math.round(bild.width * faktor);
  const hoehe = Math.round(bild.height * faktor);
  const leinwand = document.createElement("canvas");
  leinwand.width = breite;
  leinwand.height = hoehe;
  leinwand.getContext("2d").drawImage(bild, 0, 0, breite, hoehe);
  bild.close?.();
  const datenUrl = leinwand.toDataURL("image/jpeg", qualitaet);
  return { daten: datenUrl, breite, hoehe, bytes: Math.round((datenUrl.length - 23) * 0.75), mime_type: "image/jpeg", dateiname: datei.name };
}

/** In welchem Schlag liegt der Punkt? Sonst der nächstgelegene (mit Abstand). */
export function findeSchlag(punkt, eintraege) {
  const drin = eintraege.find((e) => punktInGeometrie(punkt, e.schlag.geometrie))
    ?? eintraege.find((e) => !e.schlag.geometrie && punktInGeometrie(punkt, e.feldstueck?.geometrie));
  if (drin) return { eintrag: drin, abstand: 0 };
  let best = null;
  for (const e of eintraege) {
    const m = mittelpunkt(e.schlag.geometrie ?? e.feldstueck?.geometrie);
    if (!m) continue;
    const d = abstandM(punkt, m);
    if (!best || d < best.abstand) best = { eintrag: e, abstand: d };
  }
  return best;
}

// ---------- Liste ----------

export async function renderFeldnotizen(ziel) {
  ziel.append(h("h1", {}, "Feldnotizen"));
  const betrieb = await aktiverBetrieb();
  if (!betrieb) return ziel.append(karte("Zuerst den Betrieb einrichten", h("a", { class: "knopf", href: "#/betrieb-bearbeiten" }, "Betrieb einrichten")));
  const offen = parameter().get("alle") !== "1";
  const [notizen, eintraege] = await Promise.all([daten.liste("feldnotiz", { index: "betrieb_id", wert: betrieb.id }), schlaegeImJahr(betrieb.id, aktuellesJahr())]);
  const name = new Map(eintraege.map((e) => [e.schlag.id, e.bezeichnung]));
  const liste = notizen.filter((n) => !offen || !n.erledigt).sort((a, b) => b.zeitpunkt.localeCompare(a.zeitpunkt));
  ziel.append(
    h("a", { class: "knopf", href: "#/feldnotiz", "data-test": "feldnotiz-neu" }, "Neue Feldnotiz"),
    h("ul", { class: "gruppenwahl" },
      h("li", {}, h("a", { href: "#/feldnotizen", "aria-current": offen ? "page" : null }, "Offen")),
      h("li", {}, h("a", { href: "#/feldnotizen?alle=1", "aria-current": offen ? null : "page" }, "Alle"))));
  if (!liste.length) return ziel.append(h("p", {}, offen ? "Keine offenen Feldnotizen." : "Noch keine Feldnotizen."));
  const ul = h("ul", { class: "personenliste", "data-test": "feldnotizliste" });
  for (const n of liste) {
    const vorschau = n.anhang_ids?.length ? await daten.hole("anhang", n.anhang_ids[0]) : null;
    ul.append(h("li", {}, h("a", { class: "personenkarte notiz-eintrag", href: `#/feldnotiz?id=${n.id}` },
      vorschau ? h("img", { src: vorschau.daten, alt: "", class: "notiz-bild-klein", loading: "lazy" }) : null,
      h("strong", {}, `${datumZeit(n.zeitpunkt)} · ${KATEGORIEN.find((k) => k.wert === n.kategorie)?.text ?? "Notiz"}`),
      h("span", {}, n.text || (n.anhang_ids?.length ? `${n.anhang_ids.length} Foto(s)` : "–")),
      h("small", {}, n.schlag_id ? name.get(n.schlag_id) ?? "Schlag aus anderem Jahr" : "Ohne Schlag"),
      n.erledigt ? h("span", { class: "status status-neutral" }, "Erledigt") : null)));
  }
  ziel.append(ul);
}

// ---------- Anlegen / Ansehen ----------

export async function renderFeldnotiz(ziel) {
  const betrieb = await aktiverBetrieb();
  if (!betrieb) return gehe("feldnotizen");
  const id = parameter().get("id");
  const alt = id ? await daten.hole("feldnotiz", id) : null;
  const eintraege = await schlaegeImJahr(betrieb.id, alt ? Number(alt.zeitpunkt.slice(0, 4)) : aktuellesJahr());
  const fotos = alt?.anhang_ids?.length ? (await Promise.all(alt.anhang_ids.map((a) => daten.hole("anhang", a)))).filter((a) => a && !a.geloescht) : [];
  const neueFotos = [];
  let position = alt?.position ?? null;

  ziel.append(h("h1", {}, alt ? `Feldnotiz ${datumText(alt.zeitpunkt)}` : "Feldnotiz"));
  const posAnzeige = h("p", { class: "hinweis hinweis-info", "aria-live": "polite", "data-test": "position" });
  const fotoListe = h("div", { class: "fotoliste", "data-test": "fotos" });
  const schlagFeld = h("div");
  const sprachKnopf = h("div");
  const zeichneSchlag = (vorschlag) => schlagFeld.replaceChildren(auswahl({ pfad: "schlag_id", label: "Schlag", wert: vorschlag ?? alt?.schlag_id ?? "",
    optionen: eintraege.map((e) => ({ wert: e.schlag.id, text: `${e.bezeichnung} (${e.kultur?.name ?? "–"})` })), leer: "Ohne Schlag",
    hilfe: "Wird aus der GPS-Position bestimmt; bei Bedarf ändern." }));
  zeichneSchlag();

  const zeichneFotos = () => fotoListe.replaceChildren(...[...fotos, ...neueFotos].map((f) => h("figure", { class: "foto" },
    h("img", { src: f.daten, alt: "Foto zur Feldnotiz" }),
    h("button", { class: "knopf knopf-zweit knopf-klein", type: "button", onclick: () => {
      const i = neueFotos.indexOf(f);
      if (i >= 0) neueFotos.splice(i, 1); else fotos.splice(fotos.indexOf(f), 1);
      zeichneFotos();
    } }, "Entfernen"))));
  zeichneFotos();
  const fotoEingabe = h("input", { type: "file", id: "notiz-foto", class: "versteckt", accept: "image/*", capture: "environment", multiple: true, "data-test": "foto-eingabe", onchange: async () => {
    const dateien = [...fotoEingabe.files];
    fotoEingabe.value = "";
    for (const d of dateien) {
      try { neueFotos.push(await verkleinere(d)); } catch (e) { meldung(`Foto konnte nicht gelesen werden: ${e.message}`, "fehler"); }
    }
    zeichneFotos();
  } });

  const form = formular(
    { abbrechen: () => gehe("feldnotizen"), beimSpeichern: (f) => speichern(f) },
    abschnitt("Wo?", posAnzeige,
      h("button", { class: "knopf knopf-zweit", type: "button", onclick: () => bestimmePosition(), "data-test": "position-bestimmen" }, "Position bestimmen"),
      schlagFeld),
    abschnitt("Was?",
      auswahl({ pfad: "kategorie", label: "Art", wert: alt?.kategorie ?? "beobachtung", optionen: KATEGORIEN, leer: null }),
      textbereich({ pfad: "text", label: "Notiz", wert: alt?.text, zeilen: 4, maxlength: 4000 }),
      sprachKnopf,
      fotoEingabe, h("label", { for: "notiz-foto", class: "knopf knopf-zweit", role: "button", tabindex: "0",
        onkeydown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fotoEingabe.click(); } } }, "Foto aufnehmen …"),
      fotoListe),
    alt ? knopfauswahl({ pfad: "erledigt", label: "Erledigt?", wert: alt.erledigt ? "ja" : "nein", optionen: [{ wert: "nein", text: "Noch offen" }, { wert: "ja", text: "Erledigt" }] }) : null,
  );
  ziel.append(form);
  if (alt) ziel.append(h("button", { class: "knopf knopf-gefahr", type: "button", onclick: async () => {
    if (!await bestaetige("Feldnotiz samt Fotos löschen?", { ja: "Löschen", gefahr: true })) return;
    for (const a of alt.anhang_ids ?? []) await daten.loeschen("anhang", a).catch(() => {});
    await daten.loeschen("feldnotiz", alt.id);
    meldung("Feldnotiz gelöscht.", "info");
    gehe("feldnotizen");
  } }, "Löschen"));

  // Spracheingabe (Web Speech API) – nur anbieten, wenn der Browser sie kann
  const Erkennung = globalThis.SpeechRecognition ?? globalThis.webkitSpeechRecognition;
  if (Erkennung) {
    let laeuft = null;
    const knopf = h("button", { class: "knopf knopf-zweit", type: "button", "data-test": "sprechen", onclick: () => {
      if (laeuft) { laeuft.stop(); return; }
      const r = new Erkennung();
      r.lang = "de-AT";
      r.interimResults = false;
      r.onresult = (e) => {
        const feld = form.querySelector('[name="text"]');
        const satz = [...e.results].map((x) => x[0].transcript).join(" ").trim();
        feld.value = [feld.value.trim(), satz].filter(Boolean).join(" ");
      };
      r.onerror = (e) => meldung(e.error === "network" ? "Spracheingabe braucht Internet – bitte tippen oder das Mikrofon der Tastatur verwenden." : `Spracheingabe nicht möglich (${e.error}).`, "warnung", 8000);
      r.onend = () => { laeuft = null; knopf.textContent = "Sprechen"; };
      r.start();
      laeuft = r;
      knopf.textContent = "Aufnahme beenden";
    } }, "Sprechen");
    sprachKnopf.replaceChildren(knopf);
  } else {
    sprachKnopf.replaceChildren(h("p", { class: "klein" }, "Tipp: Zum Diktieren das Mikrofon der Handy-Tastatur verwenden."));
  }

  function zeigePosition() {
    if (!position) { posAnzeige.textContent = "Keine Position."; return; }
    posAnzeige.textContent = `Position ${zahlText(position.breite, 5)}, ${zahlText(position.laenge, 5)}${position.genauigkeit_m != null ? ` (± ${Math.round(position.genauigkeit_m)} m)` : ""}`;
  }
  function bestimmePosition() {
    if (!navigator.geolocation) { posAnzeige.textContent = "Dieses Gerät kann die Position nicht bestimmen – bitte den Schlag wählen."; return; }
    posAnzeige.textContent = "Position wird bestimmt …";
    navigator.geolocation.getCurrentPosition((p) => {
      position = { breite: p.coords.latitude, laenge: p.coords.longitude, genauigkeit_m: p.coords.accuracy };
      zeigePosition();
      const treffer = findeSchlag([position.laenge, position.breite], eintraege);
      if (treffer?.abstand === 0) {
        zeichneSchlag(treffer.eintrag.schlag.id);
        posAnzeige.append(` – Sie stehen in ${treffer.eintrag.bezeichnung}.`);
      } else if (treffer) {
        posAnzeige.append(` – kein Schlag an dieser Stelle; nächster: ${treffer.eintrag.bezeichnung} (${zahlText(treffer.abstand / 1000, 1)} km).`);
      } else posAnzeige.append(" – für die Schläge sind keine Umrisse gespeichert, bitte den Schlag wählen.");
    }, (fehler) => {
      posAnzeige.textContent = fehler.code === 1 ? "Standortzugriff nicht erlaubt – bitte den Schlag wählen (oder in den Browser-Einstellungen erlauben)." : "Position konnte nicht bestimmt werden – bitte den Schlag wählen.";
    }, { enableHighAccuracy: true, timeout: 20000, maximumAge: 60000 });
  }
  if (alt) zeigePosition(); else bestimmePosition();

  async function speichern(f) {
    const w = werte(f);
    if (!w.text && !fotos.length && !neueFotos.length) return zeigeFehler(f, [{ pfad: "text", art: "fachlich", meldung: "Bitte etwas notieren oder ein Foto aufnehmen." }]);
    const ids = fotos.map((x) => x.id);
    for (const foto of neueFotos) {
      const a = await daten.speichern("anhang", { betrieb_id: betrieb.id, typ: "foto", mime_type: foto.mime_type, daten: foto.daten, breite: foto.breite, hoehe: foto.hoehe, bytes: foto.bytes, ...(foto.dateiname ? { dateiname: foto.dateiname } : {}) });
      ids.push(a.id);
    }
    for (const weg of (alt?.anhang_ids ?? []).filter((a) => !ids.includes(a))) await daten.loeschen("anhang", weg).catch(() => {});
    const e = eintraege.find((x) => x.schlag.id === w.schlag_id);
    const n = { ...(alt ?? {}), betrieb_id: betrieb.id, zeitpunkt: alt?.zeitpunkt ?? new Date().toISOString(), kategorie: w.kategorie };
    const setze = (k, v) => { if (v === undefined || v === "" || (Array.isArray(v) && !v.length)) delete n[k]; else n[k] = v; };
    setze("text", w.text);
    setze("position", position ?? undefined);
    setze("schlag_id", e?.schlag.id);
    setze("feldstueck_id", e?.feldstueck?.id);
    setze("anhang_ids", ids);
    if ("erledigt" in w) n.erledigt = w.erledigt === "ja";
    try {
      await daten.speichern("feldnotiz", n);
      meldung("Feldnotiz gespeichert.", "erfolg");
      gehe("feldnotizen");
    } catch (err) {
      if (err.name !== "ValidierungsFehler") throw err;
      zeigeFehler(f, err.fehler);
    }
  }
}
