#!/usr/bin/env python3
"""Kontrola 1: slova ze sloupce „Nepoužívat“ slovníku pojmů (`docs/slovnik-pojmu.md`).

Bere jen položky **bez podmínky**. Položky s vysvětlením v závorce nebo s dovětkem
(„bez čísla“, „jako nadpis“, „mimo tento popisek“) se strojově posoudit nedají; zůstávají
na review a skript je všechny vypíše jako nekontrolované. Ostatní položky se hledají jako
celé fráze, ať mají kolik chtějí slov („obor bez přijímaček“).

Prohledává texty pro uživatele v `src/app/**` a `src/components/**` (řetězcové
literály a text JSX, bez komentářů a testů). Text JSX se kontroluje i jednoslovný
(`<h2>Žebříček</h2>`); jednoslovný řetězec jen tehdy, když nevypadá jako technický klíč
(má diakritiku nebo velké písmeno). Shoda je na celé slovo, bez ohledu na velikost písmen;
pádové tvary jsou ručně v `TVARY`, ne odhadem.

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

# Položka je podmíněná, když má vysvětlení nebo značku (závorka, středník, uvozovky, zvýraznění),
# začíná podmínkou („u čehokoli jiného…“, „mimo přehled“), nebo končí dovětkem („kritéria bez roku“).
# Samotná předložka uvnitř fráze („obor bez přijímaček“) podmínkou není.
ZNAKY_PODMINKY = "();*[]„“"
ZACATEK_PODMINKY = re.compile(r"^(?:u|mimo|jako|bez|jen|samotn[éáý])\s", re.IGNORECASE)
DOVETEK = re.compile(
    r"\s(?:bez\s+(?:čísla|roku|kola|určení|upřesnění|jmenovatele)|jako|mimo|jen\s+u)(?:\s|$)", re.IGNORECASE)

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


def _letopocty():
    """Načte modul `scripts/kontrola-letopoctu.py` (název souboru má pomlčku) kvůli vzorcům textu."""
    cesta = spolecne.KOREN / "scripts" / "kontrola-letopoctu.py"
    spec = importlib.util.spec_from_file_location("kontrola_letopoctu", cesta)
    modul = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(modul)
    return modul


_L = _letopocty()
KOMENTAR_NA_RADKU = re.compile(r"\{?/\*.*?\*/\}?")
DIAKRITIKA_NEBO_VELKE = re.compile(r"[A-ZÁ-Žá-ž]")


def je_podminena(polozka: str) -> bool:
    """Pozná položku slovníku, kterou nejde posoudit strojově (má podmínku nebo vysvětlení)."""
    return (any(z in polozka for z in ZNAKY_PODMINKY)
            or bool(ZACATEK_PODMINKY.search(polozka)) or bool(DOVETEK.search(polozka)))


def texty_souboru(obsah: str):
    """Vrátí dvojice (číslo řádku, text), které se mohou zobrazit uživateli.

    Na rozdíl od kontroly letopočtů nevyžaduje větu: zakázané slovo může stát samo jako nadpis
    nebo štítek. Komentáře (řádkové, blokové i JSX `{/* … */}`, i přes víc řádků) se vynechají.
    """
    v_komentari = False
    for cislo, radek in enumerate(obsah.splitlines(), 1):
        if v_komentari:
            if "*/" not in radek:
                continue
            radek = radek.split("*/", 1)[1]
            v_komentari = False
        radek = KOMENTAR_NA_RADKU.sub(" ", radek)
        holy = radek.strip()
        if holy.startswith(("/*", "{/*")):
            v_komentari = True
            continue
        if holy.startswith(("//", "*")):
            continue
        bez_komentare = radek.split("//")[0]
        for m in _L.RETEZEC.finditer(bez_komentare):
            text = next(c for c in m.groups() if c is not None)
            if _L.je_veta(text) or (text.strip() and DIAKRITIKA_NEBO_VELKE.search(text) and re.fullmatch(r"[^\W\d_]+", text.strip())):
                yield cislo, text
        for text in _L.JSX_TEXT.findall(_L.RETEZEC.sub(" ", bez_komentare)):
            if re.search(r"[^\W\d_]{3}", text):
                yield cislo, text


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
            if je_podminena(polozka):
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
    nalezy: list[Nalez] = []
    for slozka in SLOZKY:
        for soubor in sorted((KOREN / slozka).rglob("*")):
            if soubor.suffix not in PRIPONY or ".test." in soubor.name:
                continue
            cesta = soubor.relative_to(KOREN).as_posix()
            for cislo, text in texty_souboru(soubor.read_text(encoding="utf-8")):
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
    print(f"Nekontrolováno strojově ({len(nekontrolovane)} podmíněných položek, hlídá je review):")
    for polozka in nekontrolovane:
        print(f"  - {polozka}")
    return spolecne.spust(
        "kontrola slov ze slovníku pojmů", ZAKLAD, hledej,
        "Zmrazený stav nálezů zakázaných slov (otisky). Úklid postupně; obnova jen přes --obnov s odůvodněním v commitu.",
        argv,
    )


if __name__ == "__main__":
    sys.exit(main())
