#!/usr/bin/env python3
"""Obstará snímek rejstříku škol MŠMT, který potřebuje zpracování uchazečů.

    python3 scripts/stahni-rejstrik.py            # stáhne, když chybí
    python3 scripts/stahni-rejstrik.py --kontrola  # jen ověří, nestahuje

Snímky mají třicet megabajtů a do gitu se neukládají, takže na čerstvém stroji
ani na runneru CI nejsou. Bez nich se zpracování uchazečů zastaví, protože názvy
oborů, které katalog nevede, se berou právě odtud — a výstup bez nich by z webu
odebral víc než tisíc názvů.

Otisk je součástí zápisu, ne volitelná kontrola: zabraňuje tomu, aby se do
zpracování dostal jiný snímek, než se kterým jsou porovnaná data. Když se otisk
neshodne, skript **soubor nepřepíše** a skončí chybou — rozhodnout, že se mění
zdroj dat, musí člověk.
"""
from __future__ import annotations

import argparse
import hashlib
import sys
import urllib.request
from pathlib import Path

KOREN = Path(__file__).resolve().parent.parent
ADRESAR = KOREN / "data" / "msmt_rejstrik"

# Snímek, se kterým jsou porovnaná data v public/. Seznam všech stažených snímků
# a jejich zdrojů je v data/msmt_rejstrik/README.md; tady je ten jediný, na
# kterém stojí zpracování, aby se zdroj nedal zaměnit omylem.
SNIMEK = {
    "soubor": "rssz-2026-06-30.jsonld",
    "url": "https://lkod-ftp.msmt.gov.cz/00022985/250d6b3f-71a2-4441-b8a0-4df141071f13/"
           "rssz-cela-cr-2026-06-30.jsonld",
    "sha256": "e75386ea526241d5d2e5f75131b87ea72fd491514d7bdc5c10830c18ef60c136",
    "stav_k": "2026-06-30",
}


def otisk(cesta: Path) -> str:
    """sha256 souboru po blocích; snímek se do paměti celý nenačítá."""
    h = hashlib.sha256()
    with open(cesta, "rb") as f:
        for blok in iter(lambda: f.read(1024 * 1024), b""):
            h.update(blok)
    return h.hexdigest()


def stav() -> tuple[Path, str | None]:
    """Cesta ke snímku a jeho otisk, nebo `None`, když soubor není."""
    cesta = ADRESAR / SNIMEK["soubor"]
    return cesta, otisk(cesta) if cesta.exists() else None


def stahni() -> Path:
    """Stáhne snímek do dočasného souboru, ověří otisk a teprve pak ho přesune."""
    cesta, mam = stav()
    if mam == SNIMEK["sha256"]:
        print(f"snímek {SNIMEK['soubor']} už je na místě a otisk souhlasí")
        return cesta
    if mam is not None:
        raise SystemExit(
            f"{cesta} existuje, ale má jiný otisk ({mam[:12]}… místo "
            f"{SNIMEK['sha256'][:12]}…). Skript ho nepřepíše: rozhodnout o změně "
            f"zdroje dat musí člověk. Smaž soubor, nebo uprav SNIMEK v tomto skriptu."
        )

    ADRESAR.mkdir(parents=True, exist_ok=True)
    rozpracovany = cesta.with_suffix(cesta.suffix + ".rozpracovany")
    print(f"stahuji {SNIMEK['url']}")
    urllib.request.urlretrieve(SNIMEK["url"], rozpracovany)  # noqa: S310 (adresa je v kódu)
    mam = otisk(rozpracovany)
    if mam != SNIMEK["sha256"]:
        rozpracovany.unlink(missing_ok=True)
        raise SystemExit(
            f"stažený snímek má otisk {mam[:12]}…, čekal se {SNIMEK['sha256'][:12]}…. "
            f"Zdroj se změnil, nebo se přenos poškodil; soubor jsem zahodil."
        )
    rozpracovany.replace(cesta)
    velikost = cesta.stat().st_size / 1048576
    print(f"snímek {SNIMEK['soubor']} stažen, {velikost:.1f} MB, otisk souhlasí")
    return cesta


def kontrola() -> int:
    cesta, mam = stav()
    if mam is None:
        print(f"snímek chybí: {cesta}")
        print("doplň ho příkazem: python3 scripts/stahni-rejstrik.py")
        return 1
    if mam != SNIMEK["sha256"]:
        print(f"snímek má jiný otisk než očekávaný: {mam[:12]}… / {SNIMEK['sha256'][:12]}…")
        return 1
    print(f"snímek {SNIMEK['soubor']} je na místě, stav rejstříku k {SNIMEK['stav_k']}")
    return 0


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--kontrola", action="store_true", help="jen ověří, nestahuje")
    a = p.parse_args()
    sys.exit(kontrola() if a.kontrola else (stahni() and 0))


if __name__ == "__main__":
    main()
