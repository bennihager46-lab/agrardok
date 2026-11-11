// Seiten „Aufzeichnen“ (Einstieg), „Schlagkartei“ (Zeitachse je Schlag) und „Jahresübersicht“ (je Kultur).

import * as daten from "../core/daten.js";
import { aktiverBetrieb } from "../core/betrieb.js";
import { schlaegeImJahr, massnahmen, aktuellesJahr, datumText, haText, zahlText } from "../core/bestand.js";
import { ARTEN, massnahmeText, bearbeitenHref } from "../core/massnahmen-text.js";
import { parameter } from "../core/router.js";
import { h, karte } from "../core/ui/dom.js";

const KACHELN = [
  ["#/massnahme-erfassen?art=bodenbearbeitung", "Bodenbearbeitung", "Pflug, Grubber, Umbruch"],
  ["#/massnahme-erfassen?art=aussaat", "Aussaat", "Hauptfrucht oder Begrünung"],
  ["#/duengung-erfassen", "Düngung", "mit NAPV-Prüfung"],
  ["#/pflanzenschutz-erfassen", "Pflanzenschutz", "mit Zulassungs- und Wartezeitprüfung"],
  ["#/massnahme-erfassen?art=pflege", "Pflege", "Striegeln, Mähen, Mulchen"],
  ["#/massnahme-erfassen?art=ernte", "Ernte", "Ertrag und Feuchte"],
  ["#/massnahme-erfassen?art=bewaesserung", "Bewässerung", "mm und Nitrat"],
  ["#/feldnotiz", "Feldnotiz", "Foto, GPS, Sprache"],
];

function ohneBetrieb(ziel) {
  ziel.append(karte("Zuerst den Betrieb einrichten",
    h("p", {}, "Aufzeichnungen gehören zu einem Betrieb und seinen Flächen."),
    h("a", { class: "knopf", href: "#/betrieb-bearbeiten" }, "Betrieb einrichten")));
}

function jahreswahl(route, jahr, extra = "") {
  return h("nav", { class: "jahreswahl", "aria-label": "Jahr" },
    h("a", { class: "knopf knopf-zweit knopf-klein", href: `#/${route}?jahr=${jahr - 1}${extra}`, "aria-label": `Jahr ${jahr - 1}` }, "◀"),
    h("strong", { "data-test": "jahr" }, `Jahr ${jahr}`),
    h("a", { class: "knopf knopf-zweit knopf-klein", href: `#/${route}?jahr=${jahr + 1}${extra}`, "aria-label": `Jahr ${jahr + 1}` }, "▶"));
}

function eintragZeile(m, schlagNamen) {
  const href = bearbeitenHref(m);
  const inhalt = [
    h("strong", {}, `${datumText(m.datum)} · ${ARTEN[m.art] ?? m.art}`),
    h("span", {}, massnahmeText(m) || "–"),
    schlagNamen ? h("small", {}, schlagNamen) : null,
  ];
  return h("li", {}, href ? h("a", { href }, ...inhalt) : h("div", { class: "eintrag" }, ...inhalt));
}

// ---------- Aufzeichnen ----------

export async function renderAufzeichnen(ziel) {
  ziel.append(h("h1", {}, "Aufzeichnen"));
  const betrieb = await aktiverBetrieb();
  if (!betrieb) return ohneBetrieb(ziel);
  ziel.append(
    h("ul", { class: "kachelwahl", "data-test": "aufzeichnen-kacheln" }, KACHELN.map(([href, titel, text]) => h("li", {}, h("a", { href }, titel, h("small", {}, text))))),
  );
  const jahr = aktuellesJahr();
  const [eintraege, liste] = await Promise.all([schlaegeImJahr(betrieb.id, jahr), massnahmen(betrieb.id)]);
  const name = new Map(eintraege.map((e) => [e.schlag.id, e.bezeichnung]));
  const letzte = liste.filter((m) => m.schlag_ids?.length).slice(0, 6);
  if (letzte.length) {
    ziel.append(karte("Zuletzt erfasst",
      h("ul", { class: "zeitachse", "data-test": "zuletzt-erfasst" }, letzte.map((m) => eintragZeile(m, m.schlag_ids.map((id) => name.get(id) ?? "Schlag aus anderem Jahr").join(", "))))));
  }
  ziel.append(karte("Übersichten und Berichte",
    h("ul", { class: "liste-schlicht" },
      h("li", {}, h("a", { href: "#/schlagkartei" }, "Schlagkartei – alles zu einem Schlag")),
      h("li", {}, h("a", { href: "#/jahresuebersicht" }, "Jahresübersicht je Kultur")),
      h("li", {}, h("a", { href: "#/duengeplanung" }, "Düngeplanung (NAPV)")),
      h("li", {}, h("a", { href: "#/duengebericht" }, "Düngebericht für die Kontrolle")),
      h("li", {}, h("a", { href: "#/psm-bericht" }, "Pflanzenschutz-Aufzeichnungen und Export")),
      h("li", {}, h("a", { href: "#/oepul" }, "ÖPUL-Aufzeichnungen und Fristen")),
      h("li", {}, h("a", { href: "#/bodenproben" }, "Bodenproben")),
      h("li", {}, h("a", { href: "#/feldnotizen" }, "Feldnotizen")))));
}

// ---------- Schlagkartei ----------

export async function renderSchlagkartei(ziel) {
  ziel.append(h("h1", {}, "Schlagkartei"));
  const betrieb = await aktiverBetrieb();
  if (!betrieb) return ohneBetrieb(ziel);
  const p = parameter();
  const jahr = Number(p.get("jahr")) || aktuellesJahr();
  const eintraege = await schlaegeImJahr(betrieb.id, jahr);
  const gewaehlt = eintraege.find((e) => e.schlag.id === p.get("schlag"));
  ziel.append(jahreswahl("schlagkartei", jahr, gewaehlt ? `&schlag=${gewaehlt.schlag.id}` : ""));
  if (!eintraege.length) {
    ziel.append(karte(`Keine Schläge für ${jahr}`, h("p", {}, "Schläge legen Sie unter Betrieb → Flächen an oder übernehmen sie aus eAMA."), h("a", { class: "knopf knopf-zweit", href: `#/flaechen?jahr=${jahr}` }, "Zu den Flächen")));
    return;
  }
  if (!gewaehlt) {
    ziel.append(h("p", {}, "Schlag wählen:"),
      h("ul", { class: "personenliste", "data-test": "schlag-wahl" }, eintraege.map((e) => h("li", {},
        h("a", { class: "personenkarte", href: `#/schlagkartei?jahr=${jahr}&schlag=${e.schlag.id}` },
          h("strong", {}, e.bezeichnung), h("span", {}, `${e.kultur?.name ?? "ohne Kultur"} · ${haText(e.schlag.flaeche_ha)}`))))));
    return;
  }
  const { schlag, kultur, feldstueck } = gewaehlt;
  const [ms, notizen, proben] = await Promise.all([
    massnahmen(betrieb.id, { schlagId: schlag.id }),
    daten.liste("feldnotiz", { index: "schlag_id", wert: schlag.id }),
    feldstueck ? daten.liste("bodenprobe", { index: "feldstueck_id", wert: feldstueck.id }) : [],
  ]);
  const imJahr = ms.filter((m) => m.datum.startsWith(String(jahr)));
  ziel.append(karte(gewaehlt.bezeichnung,
    h("dl", { class: "angaben", "data-test": "schlag-kopf" },
      h("dt", {}, "Kultur"), h("dd", {}, kultur?.name ?? "–"),
      h("dt", {}, "Fläche"), h("dd", {}, haText(schlag.flaeche_ha)),
      h("dt", {}, "Vorfrucht"), h("dd", {}, schlag.vorfrucht_name ?? "–"),
      h("dt", {}, "Letzte Bodenprobe"), h("dd", {}, proben.length ? datumText(proben.sort((a, b) => b.datum.localeCompare(a.datum))[0].datum) : "–")),
    h("div", { class: "knopfreihe" },
      h("a", { class: "knopf", href: `#/massnahme-erfassen?art=bodenbearbeitung&schlag=${schlag.id}&jahr=${jahr}` }, "+ Maßnahme"),
      h("a", { class: "knopf knopf-zweit", href: `#/schlag?id=${schlag.id}` }, "Schlag bearbeiten"))));

  const zeit = [
    ...imJahr.map((m) => ({ datum: m.datum, el: eintragZeile(m) })),
    ...notizen.filter((n) => !n.geloescht && n.zeitpunkt.startsWith(String(jahr))).map((n) => ({ datum: n.zeitpunkt.slice(0, 10),
      el: h("li", {}, h("a", { href: `#/feldnotiz?id=${n.id}` }, h("strong", {}, `${datumText(n.zeitpunkt)} · Feldnotiz`), h("span", {}, n.text || "(Foto)"))) })),
  ].sort((a, b) => a.datum.localeCompare(b.datum));
  ziel.append(h("h2", {}, `Zeitachse ${jahr}`),
    zeit.length ? h("ol", { class: "zeitachse", "data-test": "zeitachse" }, zeit.map((z) => z.el)) : h("p", {}, "Für dieses Jahr ist noch nichts aufgezeichnet."),
    h("a", { class: "knopf knopf-zweit", href: `#/schlagkartei?jahr=${jahr}` }, "Anderen Schlag wählen"));
}

// ---------- Jahresübersicht je Kultur ----------

export async function renderJahresuebersicht(ziel) {
  ziel.append(h("h1", {}, "Jahresübersicht"));
  const betrieb = await aktiverBetrieb();
  if (!betrieb) return ohneBetrieb(ziel);
  const jahr = Number(parameter().get("jahr")) || aktuellesJahr();
  const [eintraege, ms] = await Promise.all([schlaegeImJahr(betrieb.id, jahr), massnahmen(betrieb.id)]);
  ziel.append(jahreswahl("jahresuebersicht", jahr));
  const imJahr = ms.filter((m) => m.datum.startsWith(String(jahr)));
  const gruppen = new Map();
  for (const e of eintraege) {
    const k = e.kultur?.name ?? "Ohne Kultur";
    if (!gruppen.has(k)) gruppen.set(k, []);
    gruppen.get(k).push(e);
  }
  if (!gruppen.size) return ziel.append(h("p", {}, `Für ${jahr} sind keine Schläge angelegt.`));
  for (const [kultur, liste] of [...gruppen].sort((a, b) => a[0].localeCompare(b[0], "de"))) {
    const ids = new Set(liste.map((e) => e.schlag.id));
    const ha = liste.reduce((s, e) => s + (e.schlag.flaeche_ha ?? 0), 0);
    const betroffen = imJahr.filter((m) => m.schlag_ids?.some((id) => ids.has(id)));
    const zaehle = (art) => betroffen.filter((m) => m.art === art).length;
    // Fläche gewichteter Mittelwert: Ertrag und N je ha über die Schläge dieser Kultur
    const jeSchlag = (fn) => {
      let summe = 0;
      let flaeche = 0;
      for (const e of liste) {
        const wert = fn(betroffen.filter((m) => m.schlag_ids.includes(e.schlag.id)));
        if (wert == null) continue;
        summe += wert * e.schlag.flaeche_ha;
        flaeche += e.schlag.flaeche_ha;
      }
      return flaeche ? summe / flaeche : null;
    };
    const ertrag = jeSchlag((m) => {
      const e = m.filter((x) => x.art === "ernte" && x.details?.ertrag && x.details.hauptfrucht !== false);
      if (!e.length) return null;
      return e.reduce((s, x) => s + (x.details.ertrag.einheit === "dt_je_ha" ? x.details.ertrag.wert / 10 : x.details.ertrag.wert), 0);
    });
    const nJw = jeSchlag((m) => m.filter((x) => x.art === "duengung").reduce((s, x) => s + (x.details?.naehrstoffe_kg_je_ha?.n_jahreswirksam ?? 0), 0));
    const daten_ = (art) => [...new Set(betroffen.filter((m) => m.art === art).map((m) => datumText(m.datum)))].join(", ") || "–";
    ziel.append(karte(`${kultur} · ${haText(ha)}`,
      h("dl", { class: "angaben", "data-test": "kultur-uebersicht" },
        h("dt", {}, "Schläge"), h("dd", {}, liste.map((e) => e.bezeichnung).join(", ")),
        h("dt", {}, "Aussaat"), h("dd", {}, daten_("aussaat")),
        h("dt", {}, "Ernte"), h("dd", {}, daten_("ernte")),
        h("dt", {}, "Ertrag Ø"), h("dd", {}, ertrag == null ? "–" : `${zahlText(ertrag, 2)} t/ha`),
        h("dt", {}, "N jahreswirksam Ø"), h("dd", {}, nJw == null ? "–" : `${zahlText(nJw)} kg/ha`),
        h("dt", {}, "Maßnahmen"), h("dd", {}, Object.keys(ARTEN).map((a) => [a, zaehle(a)]).filter(([, n]) => n).map(([a, n]) => `${ARTEN[a]} ${n}×`).join(" · ") || "–"))));
  }
}
