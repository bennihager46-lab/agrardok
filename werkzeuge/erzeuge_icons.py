#!/usr/bin/env python3
"""Erzeugt die App-Icons (eigenes Motiv: Feld mit Furchen in Perspektive und Sonne).

Aufruf: python3 werkzeuge/erzeuge_icons.py    (nur Standardbibliothek)
Ausgabe: icons/icon.svg, icon-192.png, icon-512.png, icon-maskable-512.png, apple-touch-icon.png
"""
import struct
import zlib
from pathlib import Path

ZIEL = Path(__file__).resolve().parent.parent / "icons"

GRUEN = (0x1B, 0x5E, 0x20)
WEISS = (0xFF, 0xFF, 0xFF)
HELLGRUEN = (0xA5, 0xD6, 0xA7)
SONNE = (0xFF, 0xD6, 0x0A)

# Motiv in Einheitskoordinaten (0..1). Fluchtpunkt der Furchen und Feldgrenzen.
FLUCHT = (0.5, 0.30)
OBEN, UNTEN = 0.50, 0.82
LINKS, RECHTS = 0.18, 0.82
STREIFEN = 6
SONNE_M, SONNE_R = (0.72, 0.30), 0.085


def feld_streifen(x, y):
    """Nummer des Furchenstreifens oder None, wenn außerhalb des Feldes."""
    if not (OBEN <= y <= UNTEN):
        return None
    u = 0.5 + (x - FLUCHT[0]) * (UNTEN - FLUCHT[1]) / (y - FLUCHT[1])  # auf Unterkante projiziert
    if not (LINKS <= u <= RECHTS):
        return None
    return min(int((u - LINKS) / ((RECHTS - LINKS) / STREIFEN)), STREIFEN - 1)


def farbe(x, y, skala):
    # Für „maskable“ wird das Motiv in die sichere Mitte (80 %) verkleinert
    x = 0.5 + (x - 0.5) / skala
    y = 0.5 + (y - 0.5) / skala
    if (x - SONNE_M[0]) ** 2 + (y - SONNE_M[1]) ** 2 <= SONNE_R ** 2:
        return SONNE
    s = feld_streifen(x, y)
    if s is not None:
        return WEISS if s % 2 == 0 else HELLGRUEN
    return GRUEN


def png(groesse, skala=1.0, abtastung=3):
    zeilen = bytearray()
    for py in range(groesse):
        zeilen.append(0)  # Filtertyp „None“
        for px in range(groesse):
            r = g = b = 0
            for sy in range(abtastung):
                for sx in range(abtastung):
                    c = farbe((px + (sx + 0.5) / abtastung) / groesse, (py + (sy + 0.5) / abtastung) / groesse, skala)
                    r, g, b = r + c[0], g + c[1], b + c[2]
            n = abtastung * abtastung
            zeilen += bytes((round(r / n), round(g / n), round(b / n)))

    def block(typ, daten):
        return struct.pack(">I", len(daten)) + typ + daten + struct.pack(">I", zlib.crc32(typ + daten) & 0xFFFFFFFF)

    kopf = struct.pack(">IIBBBBB", groesse, groesse, 8, 2, 0, 0, 0)  # 8 Bit, RGB
    return b"\x89PNG\r\n\x1a\n" + block(b"IHDR", kopf) + block(b"IDAT", zlib.compress(bytes(zeilen), 9)) + block(b"IEND", b"")


def svg():
    def p(x, y):
        return f"{x * 100:.2f},{y * 100:.2f}"

    breite = (RECHTS - LINKS) / STREIFEN
    faktor = (OBEN - FLUCHT[1]) / (UNTEN - FLUCHT[1])
    polys = []
    for i in range(STREIFEN):
        u0, u1 = LINKS + i * breite, LINKS + (i + 1) * breite
        o0, o1 = 0.5 + (u0 - 0.5) * faktor, 0.5 + (u1 - 0.5) * faktor
        fuell = "#ffffff" if i % 2 == 0 else "#a5d6a7"
        polys.append(f'<polygon fill="{fuell}" points="{p(o0, OBEN)} {p(o1, OBEN)} {p(u1, UNTEN)} {p(u0, UNTEN)}"/>')
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">'
        '<rect width="100" height="100" rx="18" fill="#1b5e20"/>'
        f'<circle cx="{SONNE_M[0] * 100:.1f}" cy="{SONNE_M[1] * 100:.1f}" r="{SONNE_R * 100:.1f}" fill="#ffd60a"/>'
        + "".join(polys)
        + "</svg>\n"
    )


def main():
    ZIEL.mkdir(exist_ok=True)
    (ZIEL / "icon.svg").write_text(svg(), encoding="utf-8")
    for name, groesse, skala in [
        ("icon-192.png", 192, 1.0),
        ("icon-512.png", 512, 1.0),
        ("icon-maskable-512.png", 512, 0.8),
        ("apple-touch-icon.png", 180, 1.0),
    ]:
        (ZIEL / name).write_bytes(png(groesse, skala))
        print("✓", name)
    print("✓ icon.svg")


if __name__ == "__main__":
    main()
