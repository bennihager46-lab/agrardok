import * as daten from "../daten.js";
import * as sicherung from "../sicherung.js";
import { APP_VERSION } from "../version.js";
import { h, karte, meldung, zahl, datumZeit, bytes, bestaetige } from "../ui/dom.js";

const NAMEN = {
  betriebe: "Betriebe", personen: "Personen", feldstuecke: "Feldstücke", schlaege: "Schläge",
  kulturen: "Kulturen", tiere: "Tiere", betriebsmittel: "Betriebsmittel", maschinen: "Maschinen",
  massnahmen: "Aufzeichnungen",
};

export async function renderEinstellungen(ziel) {
  ziel.append(h("h1", {}, "Einstellungen"));
  ziel.append(exportKarte(), importKarte(), await speicherKarte(), infoKarte(), loeschKarte());
}

// ---------- Export ----------

function exportKarte() {
  const status = h("p", { class: "klein", "aria-live": "polite" });
  sicherung.letzteSicherung().then((t) => (status.textContent = t ? `Letzte Sicherung: ${datumZeit(t)}` : "Noch keine Sicherung erstellt."));

  async function exportieren(art) {
    try {
      const datei = sicherung.alsDatei(await sicherung.erstelleExport());
      if (art === "teilen" && sicherung.kannTeilen(datei)) {
        try {
          await sicherung.teilen(datei);
        } catch (e) {
          if (e.name === "AbortError") return; // Teilen abgebrochen
          throw e;
        }
      } else {
        sicherung.herunterladen(datei);
      }
      await sicherung.merkeSicherung();
      status.textContent = `Letzte Sicherung: ${datumZeit(new Date().toISOString())}`;
      meldung(`Sicherung „${datei.name}“ erstellt (${bytes(datei.size)}).`, "erfolg");
    } catch (e) {
      console.error(e);
      meldung(`Sicherung fehlgeschlagen: ${e.message}`, "fehler");
    }
  }

  const probe = new File(["{}"], "probe.json", { type: "application/json" });
  return karte(
    "Alle Daten sichern",
    h("p", {}, "Speichert alle Daten dieses Geräts in einer Datei (JSON). Bewahren Sie die Datei außerhalb des Handys auf, z. B. per E-Mail an sich selbst oder auf einem USB-Stick."),
    sicherung.kannTeilen(probe)
      ? h("button", { class: "knopf", type: "button", onclick: () => exportieren("teilen") }, "Sicherung teilen …")
      : null,
    h("button", { class: `knopf ${sicherung.kannTeilen(probe) ? "knopf-zweit" : ""}`, type: "button", "data-test": "export", onclick: () => exportieren("download") }, "Alle Daten exportieren (JSON)"),
    status,
  );
}

// ---------- Import ----------

function importKarte() {
  const ergebnis = h("div", { "aria-live": "polite" });
  const eingabe = h("input", {
    type: "file", accept: ".json,application/json", id: "import-datei", class: "versteckt", "data-test": "import-datei",
    onchange: async () => {
      const datei = eingabe.files?.[0];
      eingabe.value = "";
      if (datei) await zeigeVorschau(datei, ergebnis);
    },
  });
  return karte(
    "Daten importieren",
    h("p", {}, "Liest eine Sicherung von AGRARDOK+ ein. Vorhandene Daten werden nicht gelöscht; neuere Stände auf diesem Gerät bleiben erhalten."),
    eingabe,
    h("label", { for: "import-datei", class: "knopf knopf-zweit", role: "button", tabindex: "0",
      onkeydown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); eingabe.click(); } } }, "Datei auswählen …"),
    ergebnis,
  );
}

async function zeigeVorschau(datei, ziel) {
  ziel.replaceChildren(h("p", {}, "Datei wird geprüft …"));
  const { fehler, obj, vorschau } = await sicherung.pruefeImport(await datei.text());
  if (fehler.length) {
    ziel.replaceChildren(h("div", { class: "hinweis hinweis-fehler", role: "alert" }, h("p", {}, h("strong", {}, "Diese Datei kann nicht eingelesen werden:")), h("ul", {}, fehler.map((f) => h("li", {}, f)))));
    return;
  }
  const s = sicherung.summe(vorschau);
  const zeilen = Object.entries(vorschau.sammlungen).filter(([, z]) => Object.values(z).some((n) => n > 0));
  // Schmal gehalten (4 Spalten), damit die Tabelle auch auf kleinen Handys ohne Querscrollen passt
  const tabelle = h("div", { class: "tabelle-rahmen" }, h(
    "table", { class: "tabelle" },
    h("caption", {}, `Datei: ${datei.name}`),
    h("thead", {}, h("tr", {}, ["Bereich", "neu", "geändert", "gleich"].map((t) => h("th", { scope: "col" }, t)))),
    h("tbody", {}, zeilen.map(([sammlung, z]) =>
      h("tr", {}, h("th", { scope: "row" }, NAMEN[sammlung] ?? sammlung),
        [z.neu, z.aktualisiert, z.unveraendert + z.lokal_neuer + z.konflikt].map((n) => h("td", {}, zahl(n)))))),
  ));
  const uebernehmen = s.neu + s.aktualisiert;
  const elemente = [
    tabelle,
    s.lokal_neuer ? h("p", {}, `${zahl(s.lokal_neuer)} Datensätze sind auf diesem Gerät neuer und bleiben unverändert.`) : null,
    s.konflikt ? h("p", { class: "hinweis hinweis-warnung" }, `${zahl(s.konflikt)} Datensätze wurden auf beiden Seiten unterschiedlich geändert. Hier bleibt der Stand dieses Geräts erhalten.`) : null,
    h("p", { "data-test": "import-zusammenfassung" }, uebernehmen ? `${zahl(uebernehmen)} Datensätze werden übernommen.` : "Diese Datei enthält nichts Neues."),
    h("div", { class: "knopfreihe" },
      uebernehmen || vorschau.aenderungen_neu
        ? h("button", { class: "knopf", type: "button", "data-test": "import-uebernehmen", onclick: async (e) => {
            e.currentTarget.disabled = true;
            try {
              const r = sicherung.summe(await sicherung.importiere(obj));
              // Ergebnis steht direkt hier – keine zusätzliche Einblend-Meldung
              ziel.replaceChildren(h("p", { class: "hinweis hinweis-erfolg", "data-test": "import-fertig" }, `Import abgeschlossen: ${zahl(r.neu)} neu, ${zahl(r.aktualisiert)} aktualisiert.`));
            } catch (fehler) {
              console.error(fehler);
              ziel.replaceChildren(h("p", { class: "hinweis hinweis-fehler", role: "alert" }, `Import fehlgeschlagen, es wurde nichts geändert: ${fehler.message}`));
            }
          } }, "Übernehmen")
        : null,
      h("button", { class: "knopf knopf-zweit", type: "button", onclick: () => ziel.replaceChildren() }, "Abbrechen"),
    ),
  ];
  ziel.replaceChildren(...elemente.filter(Boolean)); // replaceChildren würde null als Text „null“ einfügen
}

// ---------- Speicher ----------

async function speicherKarte() {
  const k = karte("Speicher auf diesem Gerät");
  if (!navigator.storage?.estimate) {
    k.append(h("p", {}, "Dieser Browser gibt keine Auskunft über den Speicher."));
    return k;
  }
  const [{ usage, quota }, dauerhaft] = await Promise.all([navigator.storage.estimate(), navigator.storage.persisted?.() ?? false]);
  const status = h("p", { "data-test": "speicher-status" },
    dauerhaft
      ? "✔ Daten sind dauerhaft gespeichert – der Browser löscht sie nicht von sich aus."
      : "Der Browser darf die Daten bei Speichermangel löschen. Bitte dauerhaftes Speichern anfordern und regelmäßig sichern.");
  k.append(h("p", {}, `Belegt: ${bytes(usage)} von verfügbar ${bytes(quota)}.`), status);
  if (!dauerhaft && navigator.storage.persist) {
    k.append(h("button", { class: "knopf knopf-zweit", type: "button", onclick: async (e) => {
      const ok = await navigator.storage.persist();
      if (ok) {
        status.textContent = "✔ Daten sind dauerhaft gespeichert – der Browser löscht sie nicht von sich aus.";
        e.currentTarget.remove();
      } else {
        meldung("Der Browser hat abgelehnt. Installieren Sie AGRARDOK+ als App und versuchen Sie es erneut.", "warnung", 9000);
      }
    } }, "Dauerhaft speichern anfordern"));
  }
  return k;
}

// ---------- Info ----------

function infoKarte() {
  const sw = h("dd", { "data-test": "sw-status" }, "wird geprüft …");
  navigator.serviceWorker?.getRegistration().then((reg) => {
    sw.textContent = navigator.serviceWorker.controller ? "aktiv – App funktioniert offline" : reg ? "wird eingerichtet" : "nicht aktiv";
  });
  if (!("serviceWorker" in navigator)) sw.textContent = "nicht unterstützt";
  const i = daten.info();
  return karte(
    "Über diese App",
    h("dl", { class: "zahlenliste" },
      h("dt", {}, "Version"), h("dd", {}, APP_VERSION),
      h("dt", {}, "Datenformat"), h("dd", {}, i.schemaVersion),
      h("dt", {}, "Datenbank-Version"), h("dd", {}, String(i.dbVersion)),
      h("dt", {}, "Offline-Betrieb"), sw,
      h("dt", {}, "Geräte-Kennung"), h("dd", { class: "klein kennung" }, i.geraetId)),
  );
}

// ---------- Löschen ----------

function loeschKarte() {
  return karte(
    "Alle Daten löschen",
    h("p", {}, "Entfernt alle Daten von diesem Gerät. Das lässt sich nicht rückgängig machen – erstellen Sie vorher eine Sicherung."),
    h("button", { class: "knopf knopf-gefahr", type: "button", "data-test": "alles-loeschen", onclick: async (e) => {
      const knopf = e.currentTarget;
      const ok = await bestaetige("Wirklich ALLE Daten auf diesem Gerät löschen?", {
        ja: "Ja, alles endgültig löschen", gefahr: true,
        details: "Betriebe, Personen, Flächen, Betriebsmittel und Aufzeichnungen werden entfernt. Das lässt sich nicht rückgängig machen.",
      });
      if (!ok) return;
      knopf.disabled = true;
      const blockiert = () => meldung("Bitte alle anderen Fenster bzw. Tabs mit AGRARDOK+ schließen – dann wird gelöscht.", "warnung", 15000);
      addEventListener("agrardok:loeschen-blockiert", blockiert, { once: true });
      try {
        await daten.datenbankLoeschen();
        await daten.init();
        meldung("Alle Daten wurden gelöscht.", "info");
        location.hash = "#/start";
      } catch (fehler) {
        console.error(fehler);
        knopf.disabled = false;
        meldung(`Löschen hat nicht geklappt: ${fehler.message}`, "fehler", 15000);
      } finally {
        removeEventListener("agrardok:loeschen-blockiert", blockiert);
      }
    } }, "Alle Daten löschen …"),
  );
}
