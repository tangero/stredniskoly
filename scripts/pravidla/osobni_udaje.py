#!/usr/bin/env python3
"""Kontrola 3: osobní údaje v repozitáři (pravidlo 4 v `CLAUDE.md`).

Hledá e-maily mimo `example.cz` a `example.com` a čísla ve tvaru českého telefonu
v `tests/`, `src/`, `scripts/`, `data/` a `docs/`. Výjimky jsou jen v
`scripts/pravidla/povolene-kontakty.json`:

- `adresy`: veřejná adresa projektu nebo úřadu, každá s důvodem;
- `soubory`: soubor (nebo předpona cesty) s kontakty z oficiálních zdrojů dat; výjimka
  podle souboru, ne podle adresy.

Do výpisu ani do základu se nález neopisuje, jen cesta, řádek a otisk.

    python3 scripts/pravidla/osobni_udaje.py           # kontrola, nenulový návrat při novém nálezu
    python3 scripts/pravidla/osobni_udaje.py --obnov   # vědomé přepsání základu
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import spolecne  # noqa: E402
from spolecne import KOREN, Nalez  # noqa: E402

ZAKLAD = spolecne.SLOZKA / "osobni-udaje-zaklad.json"
VYJIMKY = spolecne.SLOZKA / "povolene-kontakty.json"
SLOZKY = ("tests", "src", "scripts", "data", "docs")
PRIPONY = {".ts", ".tsx", ".mjs", ".js", ".py", ".md", ".json", ".csv", ".sql", ".txt", ".yml", ".yaml"}
PRESKOCIT = {"node_modules", ".next", "__pycache__"}

EMAIL = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}")
# Telefon: s předvolbou +420, nebo ve třech trojicích oddělených mezerou. Holých devět číslic
# (identifikátory, časová razítka) se nehlásí.
TELEFON = re.compile(r"(?<![\w.])(?:\+420[  ]?\d{3}[  ]?\d{3}[  ]?\d{3}|[1-9]\d{2}[  ]\d{3}[  ]\d{3})(?!\w)")
# Název „souboru“ v e-mailu (obrazek@2x.png) není adresa.
PRIPONA_SOUBORU = re.compile(r"\.(png|jpe?g|svg|webp|gif|js|mjs|css|ts|avif)$", re.IGNORECASE)
SMYSLENE_DOMENY = ("@example.cz", "@example.com")


def nacti_vyjimky() -> tuple[set[str], list[str]]:
    """Načte povolené adresy (malými písmeny) a předpony cest souborů."""
    if not VYJIMKY.exists():
        return set(), []
    data = json.loads(VYJIMKY.read_text(encoding="utf-8"))
    adresy = {a["adresa"].lower() for a in data.get("adresy", [])}
    soubory = [s["cesta"] for s in data.get("soubory", [])]
    return adresy, soubory


def soubory_ke_kontrole():
    """Vypíše soubory podle přípon a složek, bez cizího kódu a artefaktů."""
    for slozka in SLOZKY:
        for soubor in sorted((KOREN / slozka).rglob("*")):
            if soubor.suffix in PRIPONY and soubor.is_file() and not PRESKOCIT & set(soubor.parts):
                yield soubor


def hledej() -> list[Nalez]:
    """Vrátí nálezy e-mailů a telefonů mimo výjimky."""
    adresy, predpony = nacti_vyjimky()
    nalezy: list[Nalez] = []
    for soubor in soubory_ke_kontrole():
        cesta = soubor.relative_to(KOREN).as_posix()
        if any(cesta == p or cesta.startswith(p) for p in predpony):
            continue
        try:
            radky = soubor.read_text(encoding="utf-8").splitlines()
        except UnicodeDecodeError:
            continue
        for cislo, radek in enumerate(radky, 1):
            for m in EMAIL.finditer(radek):
                e = m.group(0).lower()
                if e.endswith(SMYSLENE_DOMENY) or e in adresy or PRIPONA_SOUBORU.search(e):
                    continue
                nalezy.append(Nalez(
                    cesta, cislo, "e-mail mimo example.cz a example.com",
                    "nahraď smyšlenou adresou (skola@example.cz) nebo rolí; veřejnou adresu projektu či úřadu zapiš s důvodem "
                    "do scripts/pravidla/povolene-kontakty.json",
                    spolecne.otisk("email", e),
                ))
            for m in TELEFON.finditer(radek):
                nalezy.append(Nalez(
                    cesta, cislo, "číslo ve tvaru českého telefonu",
                    "nahraď smyšleným číslem nebo rolí; číslo z oficiálního zdroje dat patří do souboru uvedeného v "
                    "povolene-kontakty.json",
                    spolecne.otisk("tel", re.sub(r"\D", "", m.group(0))[-9:]),
                ))
    return nalezy


def main(argv: list[str] | None = None) -> int:
    return spolecne.spust(
        "kontrola osobních údajů", ZAKLAD, hledej,
        "Zmrazený stav nálezů (jen cesty a otisky, žádné adresy ani čísla). Úklid postupně; obnova jen přes --obnov "
        "s odůvodněním v commitu.",
        argv,
    )


if __name__ == "__main__":
    sys.exit(main())
