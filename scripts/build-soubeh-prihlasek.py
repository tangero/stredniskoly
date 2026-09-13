#!/usr/bin/env python3
"""Souběžné přihlášky: na jaké jiné obory se hlásili uchazeči téhož oboru.

Zdroj: PZ2025_kolo1_uchazeci_prihlasky_vysledky.xlsx (údaje o jednotlivých
uchazečích, až tři školy na přihlášce). Data jsou na úrovni REDIZO + KKOV,
bez zaměření — souběh se proto počítá za celý obor školy, ne za jeho zaměření.

Výstup: public/soubeh_prihlasek_2025.json
"""
from __future__ import annotations

import collections
import json
from pathlib import Path

import openpyxl

KOREN = Path(__file__).resolve().parent.parent
ZDROJ = KOREN / "data" / "PZ2025_kolo1_uchazeci_prihlasky_vysledky.xlsx"
REJSTRIK = KOREN / "data" / "msmt_rejstrik" / "rssz-2026-06-30.jsonld"
VYSTUP = KOREN / "public" / "soubeh_prihlasek_2025.json"
ROK = 2025
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


def nazvy_oboru() -> dict[str, dict]:
    """Mapa REDIZO_KKOV → název školy a oboru.

    Hlavní zdroj je katalog JPZ, doplňkový rejstřík škol MŠMT: uchazeči se hlásí
    i na učební obory kategorie H, které jednotnou zkoušku nemají, a v katalogu
    tedy nejsou.
    """
    mapa: dict[str, dict] = {}

    data = json.load(open(KOREN / "public" / "schools_data.json", encoding="utf-8"))
    for rok in ("2025", "2026"):
        for z in data.get(rok, []):
            klic = f"{z['redizo']}_{z.get('kkov') or z['id'].split('_')[1]}"
            mapa.setdefault(
                klic,
                {
                    "skola": z.get("nazev_display") or z.get("nazev"),
                    "obec": z.get("obec"),
                    "obor": z.get("obor"),
                    "id": z["id"],
                    "jpz": True,
                },
            )

    if not REJSTRIK.exists():
        # Snímky rejstříku se do gitu neukládají; bez nich zůstanou učební obory bez názvu.
        print(f"varování: {REJSTRIK.name} chybí, obory bez JPZ zůstanou bez názvu")
        return mapa
    rejstrik = json.load(open(REJSTRIK, encoding="utf-8"))["list"]
    for zaznam in rejstrik:
        redizo = str(zaznam.get("redIzo") or "")
        if not redizo:
            continue
        nazev = zaznam.get("zkracenyNazev") or zaznam.get("uplnyNazev")
        obec = (zaznam.get("adresa") or {}).get("obec")
        for skola in zaznam.get("skolyAZarizeni", []):
            for obor in skola.get("obory", []):
                kod = obor.get("kod")
                if not kod:
                    continue
                mapa.setdefault(
                    f"{redizo}_{kod}",
                    {
                        "skola": nazev,
                        "obec": obec,
                        "obor": obor.get("nazev"),
                        "id": None,
                        "jpz": False,
                    },
                )
    return mapa


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
    ap.add_argument("--zdroj", type=Path, default=ZDROJ)
    ap.add_argument("--vystup", type=Path, default=VYSTUP)
    ap.add_argument("--rok", type=int, default=ROK)
    a = ap.parse_args()
    ZDROJ, VYSTUP, ROK = a.zdroj, a.vystup, a.rok


if __name__ == "__main__":
    argumenty()
    main()
