#!/usr/bin/env python3
"""Vyrobí pro web seznam oborů, které škola podle rejstříku už nenabírá.

Příznak `dobihajiciObor` **není varování před podáním přihlášky**: proti 3 091
nabídkám 1. kola 2026 je dobíhajících nula (doklad `scripts/dobihajici-obory.py`).
Použitelná role je opačná — u nabídky, která v zobrazeném ročníku **chybí**,
odliší obor, který škola dokončuje se stávajícími žáky, od oboru, který škola
jen v tomto roce nevypsala a příští rok ho vypsat může (dvouletý cyklus nabídky).

Párovací pravidlo je závazné: **REDIZO + KKOV + denní forma + délka studia**.
Na hrubém klíči REDIZO + KKOV má join doloženou 100% chybovost, protože u téže
školy a téhož oboru typicky dobíhá jiná forma nebo délka, než jakou škola nabízí.

Pravidla čtení rejstříku (druhy škol, kód denní formy, převod délky) se sdílejí
s dokladem `scripts/dobihajici-obory.py`, aby se nemohla rozejít.

Použití:
    python3 scripts/build-dobihajici-obory.py
    python3 scripts/build-dobihajici-obory.py --snimek data/msmt_rejstrik/rssz-2026-06-30.jsonld
"""

from __future__ import annotations

import argparse
import importlib.util
import json
from datetime import date
from pathlib import Path
from typing import Any

KOREN = Path(__file__).resolve().parent.parent
VYSTUP = KOREN / "public/dobihajici_obory.json"

_spec = importlib.util.spec_from_file_location("dob", KOREN / "scripts/dobihajici-obory.py")
_dob = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_dob)

LETA_Z_DELKY = {kod: roky for roky, kod in _dob.DELKA_Z_LET.items()}


def pod_korenem(cesta: Path) -> str:
    """Cesta vůči kořeni repozitáře; mimo něj se vrátí, jak byla zadána."""
    cesta = cesta.resolve()
    try:
        return str(cesta.relative_to(KOREN))
    except ValueError:
        return str(cesta)


def nejnovejsi_snimek() -> Path:
    """Vrátí nejnovější stažený snímek rejstříku.

    Returns:
        Cesta ke snímku s nejvyšším datem v názvu.

    Raises:
        SystemExit: Když v repozitáři žádný snímek není.
    """
    snimky = sorted((KOREN / "data/msmt_rejstrik").glob("rssz-*.jsonld"))
    if not snimky:
        raise SystemExit("V data/msmt_rejstrik není žádný snímek rejstříku.")
    return snimky[-1]


def sestav(snimek: Path) -> dict[str, Any]:
    """Sestaví seznam dobíhajících denních oborů středních škol.

    Args:
        snimek: Snímek rejstříku škol MŠMT ve formátu JSON-LD.

    Returns:
        Výstup pro web: hlavička s původem dat a setříděné klíče oborů.
    """
    klice: set[str] = set()
    zaznamu = 0
    for z in _dob.obory_rejstriku(snimek):
        if not z["dobihajici"] or z["druh"] not in _dob.DRUHY_SS:
            continue
        zaznamu += 1
        # Web zobrazuje jen denní studium; u jiné formy by tvrzení neplatilo
        # pro nabídku, kterou rodina na stránce vidí.
        if z["forma"] != _dob.FORMA_DENNI:
            continue
        roky = LETA_Z_DELKY.get(z["delka"])
        if not z["redizo"] or not z["kod"] or roky is None:
            continue
        klice.add(f"{z['redizo']}|{z['kod']}|{roky}")

    return {
        "meta": {
            "popis": "Obory, které škola podle rejstříku dokončuje se stávajícími žáky a nenabírá do nich.",
            "snimek": pod_korenem(snimek),
            "obdobi": snimek.stem.replace("rssz-", ""),
            "vytvoreno": date.today().isoformat(),
            "parovani": "REDIZO + KKOV + denní forma + délka studia; hrubý klíč REDIZO + KKOV má 100% chybovost",
            "pouziti": "jen u nabídky, která v zobrazeném ročníku chybí",
            "dobihajicich_zaznamu": zaznamu,
            "z_toho_dennich": len(klice),
        },
        "obory": sorted(klice),
    }


def main() -> None:
    """Zpracuje argumenty a zapíše výstup do `public/`."""
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--snimek", type=Path, default=None, help="Snímek rejstříku; výchozí je nejnovější stažený.")
    ap.add_argument("--vystup", type=Path, default=VYSTUP)
    args = ap.parse_args()

    snimek = args.snimek or nejnovejsi_snimek()
    vystup = sestav(snimek)
    args.vystup.write_text(json.dumps(vystup, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    meta = vystup["meta"]
    print(f"{pod_korenem(args.vystup)}: {meta['z_toho_dennich']} denních oborů "
          f"z {meta['dobihajicich_zaznamu']} dobíhajících záznamů, snímek {meta['obdobi']}")


if __name__ == "__main__":
    main()
