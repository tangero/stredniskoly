#!/usr/bin/env python3
"""Kontrola 4: nová síťová volání (pravidlo 7 v `CLAUDE.md`).

V souborech `src/` a `scripts/`, které volají síť (`fetch`, klienti HTTP), najde domény
v adresách `http(s)://…` mimo komentáře a porovná je se seznamem
`scripts/pravidla/povolene-servery.json`. Každá doména v seznamu má účel a odkaz na dokumentaci.
Doména mimo seznam je nález: nový zdroj patří do `docs/zdroje-dat.md` a nové volání se přidává
jen podle zadání.

Adresu složenou za běhu (proměnná prostředí, hodnota z dat) kontrola nevidí; tu hlídá review.

    python3 scripts/pravidla/sit.py           # kontrola, nenulový návrat při novém nálezu
    python3 scripts/pravidla/sit.py --obnov   # vědomé přepsání základu
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import spolecne  # noqa: E402
from spolecne import KOREN, Nalez  # noqa: E402

ZAKLAD = spolecne.SLOZKA / "sit-zaklad.json"
POVOLENE = spolecne.SLOZKA / "povolene-servery.json"
SLOZKY = ("src", "scripts")
PRIPONY = {".ts", ".tsx", ".mjs", ".js", ".py"}
PRESKOCIT = {"node_modules", ".next", "__pycache__"}

ADRESA = re.compile(r"https?://([A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,})")
VOLANI = re.compile(
    r"\bfetch\s*\(|\baxios\b|\bundici\b|\bhttps?\.request\b"
    r"|\brequests\.(?:get|post|put|head|request|Session)\b|\burllib\.request\b|\burlopen\s*\(|\bhttpx\.|\baiohttp\b")
# Smyšlené domény (RFC 2606) nikam nevolají.
SMYSLENE = ("example.cz", "example.com", "example.org", ".test", ".invalid", ".example")


def nacti_povolene() -> set[str]:
    """Načte povolené domény (malými písmeny)."""
    if not POVOLENE.exists():
        return set()
    data = json.loads(POVOLENE.read_text(encoding="utf-8"))
    return {s["domena"].lower() for s in data.get("servery", [])}


def hledej() -> list[Nalez]:
    """Vrátí domény mimo seznam v souborech, které volají síť."""
    povolene = nacti_povolene()
    nalezy: list[Nalez] = []
    for slozka in SLOZKY:
        for soubor in sorted((KOREN / slozka).rglob("*")):
            if (soubor.suffix not in PRIPONY or not soubor.is_file() or ".test." in soubor.name
                    or PRESKOCIT & set(soubor.parts)):
                continue
            obsah = soubor.read_text(encoding="utf-8", errors="ignore")
            if not VOLANI.search(obsah):
                continue
            cesta = soubor.relative_to(KOREN).as_posix()
            for cislo, radek in spolecne.kod_bez_komentaru(obsah, python=soubor.suffix == ".py"):
                for domena in {d.lower() for d in ADRESA.findall(radek)}:
                    if domena in povolene or domena.endswith(SMYSLENE):
                        continue
                    nalezy.append(Nalez(
                        cesta, cislo, f"nové síťové volání: doména {domena} není v seznamu povolených serverů",
                        "zapiš zdroj do docs/zdroje-dat.md a doménu do scripts/pravidla/povolene-servery.json; "
                        "nové volání jen podle zadání",
                        spolecne.otisk("sit", domena),
                    ))
    return nalezy


def main(argv: list[str] | None = None) -> int:
    return spolecne.spust(
        "kontrola nových síťových volání", ZAKLAD, hledej,
        "Zmrazený stav nálezů síťových volání (cesty a otisky domén). Dnešní domény jsou v povolene-servery.json, "
        "základ je proto prázdný; obnova jen přes --obnov s odůvodněním v commitu.",
        argv,
    )


if __name__ == "__main__":
    sys.exit(main())
