#!/usr/bin/env python3
"""Kontrola 2: ukazatele proti slovníku ukazatelů (`docs/slovnik-ukazatelu.md`).

1. Každý ukazatel uvedený v registru sad (`public/stav_datovych_sad.json`, pole `ukazatele`
   a `ukazatele_z_vice_sad`) má zápis ve slovníku. Registr vede ukazatele názvem, proto se
   porovnává s nadpisy slovníku stejně jako ve `scripts/stav-datovych-sad.py`.
2. Identifikátory z oddílu „Ukazatele bez doloženého výpočtu“ (v obrácených apostrofech
   v nadpisu ukazatele, například `obtiznost`) se nevyskytují v kódu `src/` mimo komentáře.
   Dnešní výskyty jsou ve zmrazeném základu; nový výskyt je nález.

    python3 scripts/pravidla/ukazatele.py           # kontrola, nenulový návrat při novém nálezu
    python3 scripts/pravidla/ukazatele.py --obnov   # vědomé přepsání základu
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import spolecne  # noqa: E402
from spolecne import KOREN, Nalez  # noqa: E402

REGISTR = "public/stav_datovych_sad.json"
SLOVNIK = "docs/slovnik-ukazatelu.md"
ZAKLAD = spolecne.SLOZKA / "ukazatele-zaklad.json"
PRIPONY = {".ts", ".tsx"}
ODDIL_BEZ_VYPOCTU = re.compile(r"^## .*bez doloženého výpočtu", re.IGNORECASE)
IDENTIFIKATOR = re.compile(r"`([A-Za-z_][A-Za-z0-9_]*)`")


def nacti_slovnik() -> tuple[set[str], list[str]]:
    """Přečte slovník ukazatelů.

    Returns:
        Dvojice (názvy ukazatelů, identifikátory ukazatelů bez doloženého výpočtu). Názvem je
        každý nadpis třetí úrovně a nadpis druhé úrovně bez podnadpisů (bez pořadového čísla).
    """
    nazvy: set[str] = set()
    bez_vypoctu: list[str] = []
    oddil: str | None = None
    ma_podnadpis = False
    v_oddilu_bez_vypoctu = False
    for radek in (KOREN / SLOVNIK).read_text(encoding="utf-8").splitlines():
        if radek.startswith("## "):
            if oddil and not ma_podnadpis:
                nazvy.add(oddil)
            oddil = re.sub(r"^\d+[a-z]?\.\s*", "", radek[3:].strip())
            ma_podnadpis = False
            v_oddilu_bez_vypoctu = bool(ODDIL_BEZ_VYPOCTU.search(radek))
        elif radek.startswith("### "):
            ma_podnadpis = True
            nazvy.add(radek[4:].strip())
            if v_oddilu_bez_vypoctu:
                bez_vypoctu.extend(IDENTIFIKATOR.findall(radek))
    if oddil and not ma_podnadpis:
        nazvy.add(oddil)
    return nazvy, sorted(set(bez_vypoctu))


def hledej() -> list[Nalez]:
    """Vrátí ukazatele registru bez zápisu ve slovníku a výskyty ukazatelů bez výpočtu v `src/`."""
    nazvy, bez_vypoctu = nacti_slovnik()
    nalezy: list[Nalez] = []

    text_registru = (KOREN / REGISTR).read_text(encoding="utf-8")
    registr = json.loads(text_registru)
    sady = registr.get("sady", {})
    v_registru = {u for s in (sady.values() if isinstance(sady, dict) else sady) for u in s.get("ukazatele", [])}
    v_registru |= set(registr.get("ukazatele_z_vice_sad", {}))
    radky_registru = text_registru.splitlines()
    for ukazatel in sorted(v_registru - nazvy):
        hledany = json.dumps(ukazatel, ensure_ascii=False)
        radek = next((i for i, r in enumerate(radky_registru, 1) if hledany in r), 1)
        nalezy.append(Nalez(
            REGISTR, radek, f"ukazatel „{ukazatel}“ je v registru sad, ale slovník ukazatelů ho nezná",
            f"zapiš ho do {SLOVNIK} (název, definice, vzorec, zdroj, jednotka, co neříká), nebo oprav název v registru",
            spolecne.otisk("registr", ukazatel),
        ))

    vzory = [(i, re.compile(r"(?<![\w$])" + re.escape(i) + r"(?![\w$])")) for i in bez_vypoctu]
    for soubor in sorted((KOREN / "src").rglob("*")):
        if soubor.suffix not in PRIPONY or ".test." in soubor.name or not soubor.is_file():
            continue
        cesta = soubor.relative_to(KOREN).as_posix()
        for cislo, radek in spolecne.kod_bez_komentaru(soubor.read_text(encoding="utf-8")):
            for ident, vzor in vzory:
                for _ in vzor.finditer(radek):
                    nalezy.append(Nalez(
                        cesta, cislo, f"kód používá `{ident}`, ukazatel bez doloženého výpočtu",
                        f"nepoužívej ho k řazení, průměrování ani zobrazení; nahraď ukazatelem se zápisem ve slovníku ({SLOVNIK}, oddíl 7)",
                        spolecne.otisk("bez-vypoctu", ident),
                    ))
    return nalezy


def main(argv: list[str] | None = None) -> int:
    return spolecne.spust(
        "kontrola ukazatelů proti slovníku", ZAKLAD, hledej,
        "Zmrazený stav: výskyty ukazatelů bez doloženého výpočtu v src/ (cesty a otisky). Úklid postupně; obnova jen "
        "přes --obnov s odůvodněním v commitu.",
        argv,
    )


if __name__ == "__main__":
    sys.exit(main())
