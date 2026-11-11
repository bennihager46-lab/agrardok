// Minimaler ZIP-Leser (ohne Fremdbibliothek). Unterstützt „gespeichert“ (0) und „deflate“ (8)
// über die eingebaute DecompressionStream-API. Kein ZIP64, keine Verschlüsselung.

const MAX_GESAMT = 300 * 1024 * 1024; // Schutz vor „ZIP-Bomben“

export async function entpacke(puffer) {
  const daten = new DataView(puffer);
  const bytes = new Uint8Array(puffer);
  const ende = findeEndeVerzeichnis(daten);
  if (ende < 0) throw new Error("Die Datei ist kein gültiges ZIP-Archiv.");
  const anzahl = daten.getUint16(ende + 10, true);
  let pos = daten.getUint32(ende + 16, true);
  if (pos === 0xffffffff) throw new Error("ZIP64-Archive werden nicht unterstützt.");

  const dateien = new Map();
  let gesamt = 0;
  for (let i = 0; i < anzahl; i++) {
    if (daten.getUint32(pos, true) !== 0x02014b50) throw new Error("ZIP-Inhaltsverzeichnis ist beschädigt.");
    const flags = daten.getUint16(pos + 8, true);
    const methode = daten.getUint16(pos + 10, true);
    const gepackt = daten.getUint32(pos + 20, true);
    const entpackt = daten.getUint32(pos + 24, true);
    const nameLaenge = daten.getUint16(pos + 28, true);
    const extraLaenge = daten.getUint16(pos + 30, true);
    const kommentarLaenge = daten.getUint16(pos + 32, true);
    const lokal = daten.getUint32(pos + 42, true);
    const nameBytes = bytes.subarray(pos + 46, pos + 46 + nameLaenge);
    const name = new TextDecoder(flags & 0x800 ? "utf-8" : "windows-1252").decode(nameBytes);
    pos += 46 + nameLaenge + extraLaenge + kommentarLaenge;

    if (name.endsWith("/")) continue; // Ordner
    if (flags & 0x1) throw new Error(`„${name}“ ist verschlüsselt.`);
    gesamt += entpackt;
    if (gesamt > MAX_GESAMT) throw new Error("Das ZIP-Archiv ist zu groß.");

    if (daten.getUint32(lokal, true) !== 0x04034b50) throw new Error(`Eintrag „${name}“ ist beschädigt.`);
    const start = lokal + 30 + daten.getUint16(lokal + 26, true) + daten.getUint16(lokal + 28, true);
    const roh = bytes.subarray(start, start + gepackt);
    if (methode === 0) dateien.set(name, roh.slice());
    else if (methode === 8) dateien.set(name, await inflate(roh));
    else throw new Error(`„${name}“: Kompressionsart ${methode} wird nicht unterstützt.`);
  }
  return dateien;
}

function findeEndeVerzeichnis(daten) {
  // Signatur 0x06054b50, steht in den letzten 22 + max. 65535 Bytes (Kommentar)
  const min = Math.max(0, daten.byteLength - 22 - 0xffff);
  for (let i = daten.byteLength - 22; i >= min; i--) {
    if (daten.getUint32(i, true) === 0x06054b50) return i;
  }
  return -1;
}

async function inflate(bytes) {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("Dieser Browser kann ZIP-Dateien nicht entpacken. Bitte die Dateien vorher entpacken und einzeln auswählen.");
  }
  const strom = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(strom).arrayBuffer());
}
