// Kleine DOM-Helfer. Inhalte immer als Text einfügen (kein innerHTML mit Daten).

export function h(tag, attrs = {}, ...kinder) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs ?? {})) {
    if (v == null || v === false) continue;
    if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
    else if (k === "class") el.className = v;
    else if (k === "text") el.textContent = v;
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const kind of kinder.flat()) {
    if (kind == null || kind === false) continue;
    el.append(kind instanceof Node ? kind : String(kind));
  }
  return el;
}

/**
 * Kurze Meldung unten über der Navigation, wird auch vom Screenreader vorgelesen.
 * Es ist immer nur EINE Meldung sichtbar (neue ersetzt alte), damit nichts den Inhalt verdeckt.
 */
let meldungZeit = null;
export function meldung(text, art = "info", dauer = 6000) {
  const bereich = document.getElementById("meldungen");
  if (!bereich) return;
  clearTimeout(meldungZeit);
  const el = h("div", { class: `meldung meldung-${art}`, role: art === "fehler" ? "alert" : "status" }, text);
  bereich.replaceChildren(el);
  meldungZeit = setTimeout(() => el.remove(), dauer);
}

export const zahl = (n) => Number(n).toLocaleString("de-AT");

export function datumZeit(iso) {
  if (!iso) return "–";
  return new Date(iso).toLocaleString("de-AT", { dateStyle: "medium", timeStyle: "short" });
}

export function bytes(n) {
  if (n == null) return "unbekannt";
  const e = ["B", "KB", "MB", "GB"];
  let i = 0;
  while (n >= 1024 && i < e.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toLocaleString("de-AT", { maximumFractionDigits: 1 })} ${e[i]}`;
}

export function karte(titel, ...inhalt) {
  return h("section", { class: "karte" }, h("h2", {}, titel), ...inhalt);
}

/**
 * Rückfrage direkt in der Seite (statt confirm()/prompt(): die fehlen in manchen eingebetteten
 * Browsern, z. B. in Editor-Vorschauen, und lassen sich vom Nutzer dauerhaft unterdrücken).
 * @returns {Promise<boolean>} true bei „ja“, false bei „nein“, Escape oder Tippen daneben
 */
export function bestaetige(frage, { ja = "Ja", nein = "Abbrechen", gefahr = false, details } = {}) {
  return new Promise((resolve) => {
    const zurueck = document.activeElement;
    const dialog = h("dialog", { class: "rueckfrage", "aria-labelledby": "rueckfrage-text", "data-test": "rueckfrage" });
    const schliesse = (antwort) => {
      if (!dialog.isConnected) return;
      dialog.close();
      dialog.remove();
      zurueck?.focus?.();
      resolve(antwort);
    };
    const neinKnopf = h("button", { class: "knopf knopf-zweit", type: "button", "data-test": "rueckfrage-nein", onclick: () => schliesse(false) }, nein);
    dialog.append(
      h("p", { id: "rueckfrage-text", class: "rueckfrage-frage" }, frage),
      details ? h("p", { class: "klein" }, details) : null,
      h("div", { class: "knopfreihe" },
        h("button", { class: `knopf ${gefahr ? "knopf-gefahr-voll" : ""}`, type: "button", "data-test": "rueckfrage-ja", onclick: () => schliesse(true) }, ja),
        neinKnopf));
    dialog.addEventListener("cancel", (e) => { e.preventDefault(); schliesse(false); });
    dialog.addEventListener("click", (e) => { if (e.target === dialog) schliesse(false); });
    document.body.append(dialog);
    dialog.showModal();
    neinKnopf.focus(); // sichere Wahl vorbelegt
  });
}
