#!/usr/bin/env python3
"""Kontrola 1: slova ze sloupce „Nepoužívat“ slovníku pojmů (`docs/slovnik-pojmu.md`).

Bere jen položky **bez podmínky**. Položky s vysvětlením v závorce nebo s doplňkem
(„bez čísla“, „jen u 2. kola“) se strojově posoudit nedají; zůstávají na review
a skript je vypíše jako nekontrolované.

Prohledává texty pro uživatele v `src/app/**` a `src/components/**` (řetězcové
literály a text JSX, bez komentářů a testů). Shoda je na celé slovo, bez ohledu
na velikost písmen; pádové tvary jsou ručně v `TVARY`, ne odhadem.

    python3 scripts/pravidla/slova.py           # kontrola, nenulový návrat při novém nálezu
    python3 scripts/pravidla/slova.py --obnov   # vědomé přepsání základu
"""

from __future__ import annotations

import importlib.util
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import spolecne  # noqa: E402
from spolecne import KOREN, Nalez  # noqa: E402

SLOVNIK = KOREN / "docs" / "slovnik-pojmu.md"
ZAKLAD = spolecne.SLOZKA / "slova-zaklad.json"
SLOZKY = ("src/app", "src/components")
PRIPONY = {".ts", ".tsx"}

# Slova, kvůli kterým je položka podmíněná („bez čísla“, „jen u 2. kola“).
PODMINKY = {"bez", "u", "jen", "pro", "jako", "když", "mimo", "před", "nad", "vedle", "ne", "to", "samotné", "vyjma", "jen", "v"}

# Pádové tvary položek, které se v textu běžně skloňují. Rozšiřuj podle nálezů, ne odhadem.
TVARY: dict[str, list[str]] = {
    "zájemci": ["zájemce", "zájemců", "zájemcům", "zájemcích", "zájemci"],
    "přihlášení": ["přihlášených", "přihlášeným", "přihlášenými"],
    "propadlíci": ["propadlík", "propadlíka", "propadlíků", "propadlíkům"],
    "neúspěšní": ["neúspěšných", "neúspěšným", "neúspěšnými"],
    "úspěšní": ["úspěšných", "úspěšným", "úspěšnými"],
    "žáci": ["žáků", "žákům", "žácích", "žáky", "žák"],
    "odmítnutí": ["odmítnutých", "odmítnutým"],
    "konkurence": ["konkurenci", "konkurencí"],
    "podmínky": ["podmínek", "podmínkám", "podmínkách", "podmínkami"],
}


def _texty_radku():
    """Načte `texty_radku` z `scripts/kontrola-letopoctu.py` (název souboru má pomlčku)."""
    cesta = spolecne.KOREN / "scripts" / "kontrola-letopoctu.py"
    spec = importlib.util.spec_from_file_location("kontrola_letopoctu", cesta)
    modul = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(modul)
    return modul.texty_radku


def nacti_slovnik() -> tuple[list[str], list[str]]:
    """Přečte sloupec „Nepoužívat“.

    Returns:
        Dvojice (kontrolovaná slova bez podmínky, nekontrolované položky).
    """
    kontrolovana: list[str] = []
    nekontrolovane: list[str] = []
    for radek in SLOVNIK.read_text(encoding="utf-8").splitlines():
        if not radek.startswith("|") or radek.startswith("|---"):
            continue
        sloupce = [s.strip() for s in radek.strip().strip("|").split("|")]
        if len(sloupce) != 4 or sloupce[0] == "Pojem na stránce":
            continue
        for polozka in re.split(r",\s*(?![^()]*\))", sloupce[3]):
            polozka = polozka.strip()
            if not polozka:
                continue
            slova = polozka.split()
            if any(z in polozka for z in "();*[]") or len(slova) > 3 or PODMINKY & {s.lower() for s in slova}:
                nekontrolovane.append(polozka)
            else:
                kontrolovana.append(polozka.lower())
    return sorted(set(kontrolovana)), sorted(set(nekontrolovane))


def vzorce(slova: list[str]) -> list[tuple[str, re.Pattern]]:
    """Sestaví vzorce celých slov včetně ručně zapsaných pádových tvarů."""
    out = []
    for slovo in slova:
        tvary = [slovo, *TVARY.get(slovo, [])]
        out.append((slovo, re.compile(r"(?<![\w-])(?:" + "|".join(re.escape(t) for t in tvary) + r")(?![\w-])", re.IGNORECASE)))
    return out


def hledej() -> list[Nalez]:
    """Projde texty stránek a vrátí nálezy zakázaných slov."""
    slova, _ = nacti_slovnik()
    vz = vzorce(slova)
    texty_radku = _texty_radku()
    nalezy: list[Nalez] = []
    for slozka in SLOZKY:
        for soubor in sorted((KOREN / slozka).rglob("*")):
            if soubor.suffix not in PRIPONY or ".test." in soubor.name:
                continue
            cesta = soubor.relative_to(KOREN).as_posix()
            for cislo, radek in enumerate(soubor.read_text(encoding="utf-8").splitlines(), 1):
                for text in texty_radku(radek):
                    for slovo, vzor in vz:
                        if vzor.search(text):
                            nalezy.append(Nalez(
                                cesta, cislo,
                                f"text stránky obsahuje „{slovo}“, které slovník pojmů zakazuje",
                                f"použij pojem z prvního sloupce slovníku (docs/slovnik-pojmu.md) místo „{slovo}“",
                                spolecne.otisk(slovo, text.strip()),
                            ))
    return nalezy


def main(argv: list[str] | None = None) -> int:
    _, nekontrolovane = nacti_slovnik()
    print(f"Nekontrolováno strojově ({len(nekontrolovane)} podmíněných položek, hlídá je review): "
          + "; ".join(nekontrolovane[:8]) + (" …" if len(nekontrolovane) > 8 else ""))
    return spolecne.spust(
        "kontrola slov ze slovníku pojmů", ZAKLAD, hledej,
        "Zmrazený stav nálezů zakázaných slov (otisky). Úklid postupně; obnova jen přes --obnov s odůvodněním v commitu.",
        argv,
    )


if __name__ == "__main__":
    sys.exit(main())
