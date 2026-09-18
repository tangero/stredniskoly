#!/usr/bin/env python3
"""Souběžné přihlášky: na jaké jiné obory se hlásili uchazeči téhož oboru.

Zdroj: PZ{rok}_kolo1_uchazeci_prihlasky_vysledky.xlsx (údaje o jednotlivých
uchazečích, až tři školy na přihlášce). Data jsou na úrovni REDIZO + KKOV,
bez zaměření — souběh se proto počítá za celý obor školy, ne za jeho zaměření.

Výstup: public/soubeh_prihlasek_{rok}.json; rok bez --rok bere registr stavu datových sad.
"""
from __future__ import annotations

import collections
import json
import sys
from pathlib import Path

import openpyxl

sys.path.insert(0, str(Path(__file__).resolve().parent))
from nazvy_oboru import nazvy_oboru  # noqa: E402

KOREN = Path(__file__).resolve().parent.parent
def zobrazeny_rok() -> int:
    """Rok dat uchazečů, který web zobrazuje. Letopočet se nepíše napevno, určuje ho registr (docs/zdroje-dat.md, oddíl 5)."""
    registr = json.loads((KOREN / "public" / "stav_datovych_sad.json").read_text(encoding="utf-8"))
    return int(registr["sady"]["cermat-uchazeci-kolo1"]["zobrazeno"]["obdobi"])


ROK = zobrazeny_rok()
ZDROJ = KOREN / "data" / f"PZ{ROK}_kolo1_uchazeci_prihlasky_vysledky.xlsx"
VYSTUP = KOREN / "public" / f"soubeh_prihlasek_{ROK}.json"
MAX_VOLEB = 5
POCET_SOUBEHU = 6
MIN_UCHAZECU = 10


def nacti_volby() -> tuple[collections.Counter, collections.Counter, dict]:
    """Vrátí počty uchazečů, počty podle pořadí a matici souběhů."""
    wb = openpyxl.load_workbook(ZDROJ, read_only=True)
    # První list: CERMAT ho přejmenovává mezi revizemi („data“ → „Sheet 1“, „fyzicke_osoby“).
    it = wb.worksheets[0].iter_rows(values_only=True)
    hlavicka = list(next(it))
    ix = {n: i for i, n in enumerate(hlavicka)}

    uchazecu: collections.Counter = collections.Counter()
    poradi: dict[str, list[int]] = collections.defaultdict(lambda: [0] * MAX_VOLEB)
    soubeh: dict[str, collections.Counter] = collections.defaultdict(collections.Counter)

    for radek in it:
        volby = []
        for k in range(1, MAX_VOLEB + 1):
            redizo = radek[ix[f"ss{k}_redizo"]]
            kkov = radek[ix[f"ss{k}_kkov"]]
            if redizo and kkov:
                volby.append(f"{redizo}_{kkov}")
        for poz, klic in enumerate(volby):
            uchazecu[klic] += 1
            poradi[klic][poz] += 1
            for jiny in volby:
                if jiny != klic:
                    soubeh[klic][jiny] += 1
    return uchazecu, poradi, soubeh


def main() -> None:
    uchazecu, poradi, soubeh = nacti_volby()
    mapa = nazvy_oboru()

    vystup: dict[str, dict] = {}
    for klic, pocet in uchazecu.items():
        if pocet < MIN_UCHAZECU:
            continue
        nej = []
        for jiny, spolu in soubeh[klic].most_common(POCET_SOUBEHU):
            popis = mapa.get(jiny, {})
            nej.append(
                {
                    "id": popis.get("id"),
                    "klic": jiny,
                    "skola": popis.get("skola"),
                    "obec": popis.get("obec"),
                    "obor": popis.get("obor"),
                    "jpz": popis.get("jpz", False),
                    "uchazecu": spolu,
                    "podil": round(spolu / pocet, 4),
                }
            )
        vystup[klic] = {
            "uchazecu": pocet,
            "poradi": poradi[klic][:3],
            "podil_prvni_volby": round(poradi[klic][0] / pocet, 4),
            "soubeh": nej,
        }

    VYSTUP.parent.mkdir(parents=True, exist_ok=True)
    VYSTUP.write_text(
        json.dumps(
            {
                "rok": ROK,
                "zdroj": ZDROJ.name,
                "uroven": "REDIZO_KKOV (bez zaměření)",
                "min_uchazecu": MIN_UCHAZECU,
                "data": vystup,
            },
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )
    print(f"zapsáno {len(vystup)} oborů do {VYSTUP}")


def argumenty() -> None:
    """Vstup, výstup a rok lze přepsat; datová linka tak zpracuje nový soubor mimo public/."""
    import argparse
    global ZDROJ, VYSTUP, ROK
    ap = argparse.ArgumentParser(description="Souběžné přihlášky z dat uchazečů CERMAT.")
    ap.add_argument("--zdroj", type=Path)
    ap.add_argument("--vystup", type=Path)
    ap.add_argument("--rok", type=int, default=ROK)
    a = ap.parse_args()
    # Bez výslovné cesty se vstup i výstup odvodí z roku, aby --rok 2026 nečetl soubor roku 2025.
    ROK = a.rok
    ZDROJ = a.zdroj or KOREN / "data" / f"PZ{ROK}_kolo1_uchazeci_prihlasky_vysledky.xlsx"
    VYSTUP = a.vystup or KOREN / "public" / f"soubeh_prihlasek_{ROK}.json"


if __name__ == "__main__":
    argumenty()
    main()
