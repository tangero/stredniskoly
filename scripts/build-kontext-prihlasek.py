#!/usr/bin/env python3
"""Kontext přihlášek po oborech: kam se uchazeči o obor dostali, obory výš a níž na přihlášce
a odvozená hranice úspěšnosti. Podklad pro otázku „Co vám pomůže“ na stránce oboru.

Zdroj: PZ{rok}_kolo1_uchazeci_prihlasky_vysledky.xlsx (údaje o jednotlivých uchazečích).
Klíč: REDIZO_KKOV (zdroj nenese zaměření, údaje platí za obor školy jako celek).
Výstup: public/kontext_prihlasek_{rok}.json; rok bez --rok bere registr stavu datových sad.

Obory výš a níž na přihlášce, které přehled nezahrnuje (například učební obory bez jednotné
zkoušky), nesou v poli `mimo_prehled` název školy, obce a oboru z rejstříku škol MŠMT
(scripts/nazvy_oboru.py), aby je stránka nemusela ukazovat jen kódem.

Meze (slovník ukazatelů):
  - obor s méně než 10 uchazeči se nezapisuje,
  - obory výš a níž na přihlášce jen s aspoň 10 společnými uchazeči,
  - odvozená hranice jen při aspoň 5 nesplněných s výsledkem jednotné zkoušky a 5 soutěžících uchazečích.

    python3 scripts/build-kontext-prihlasek.py --rok 2025 --zdroj data/PZ2025_kolo1_uchazeci_prihlasky_vysledky.xlsx
"""
from __future__ import annotations

import argparse
import collections
import json
import sys
from pathlib import Path

import openpyxl

sys.path.insert(0, str(Path(__file__).resolve().parent))
from nazvy_oboru import bez_jednotne_zkousky, nazvy_oboru  # noqa: E402
from slouceni_prihlasek import PRIJAT, volby_uchazece, vysledek_uchazece  # noqa: E402

KOREN = Path(__file__).resolve().parent.parent
MIN_UCHAZECU = 10
MIN_SPOLECNYCH = 10
MIN_PRO_HRANICI = 5
MAX_OBORU = 6



def zobrazeny_rok() -> int:
    registr = json.loads((KOREN / "public" / "stav_datovych_sad.json").read_text(encoding="utf-8"))
    return int(registr["sady"]["cermat-uchazeci-kolo1"]["zobrazeno"]["obdobi"])


def body(v):
    return None if v is None else float(v) / 2


def odvozena_hranice(soutezici: list[tuple], nesplnili: list[tuple]) -> dict | None:
    """Hranice, pod kterou leží všichni nesplnění a nad kterou všichni soutěžící uchazeči; součet nebo slabší test."""
    if len(soutezici) < MIN_PRO_HRANICI or len(nesplnili) < MIN_PRO_HRANICI:
        return None
    for typ, fn in (("soucet", lambda x: x[0]), ("slabsi_test", lambda x: min(x[1], x[2]))):
        nejvyse, nejnize = max(fn(x) for x in nesplnili), min(fn(x) for x in soutezici)
        if nejvyse < nejnize:
            return {"typ": typ, "nejvyse_nesplneny": nejvyse, "nejnize_soutezici": nejnize}
    return {"typ": "nevysvetleno_vysledkem_jpz"}


def mimo_prehled(data: dict[str, dict], nazvy: dict[str, dict]) -> dict[str, dict]:
    """Popis oborů výš a níž na přihlášce, které katalog JPZ nevede (název z rejstříku, nebo žádný)."""
    klice = {k for z in data.values() for k, _ in z["obory_vys"] + z["obory_niz"]}
    vystup = {}
    for k in sorted(klice):
        popis = nazvy.get(k)
        if popis and popis["jpz"]:
            continue  # stránku oboru web najde sám
        popis = popis or {}
        vystup[k] = {"skola": popis.get("skola"), "obec": popis.get("obec"), "obor": popis.get("obor"),
                     "bez_jednotne_zkousky": bez_jednotne_zkousky(k)}
    return vystup


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--rok", type=int)
    ap.add_argument("--zdroj", type=Path)
    ap.add_argument("--vystup", type=Path)
    a = ap.parse_args()
    rok = a.rok or zobrazeny_rok()
    zdroj = a.zdroj or KOREN / "data" / f"PZ{rok}_kolo1_uchazeci_prihlasky_vysledky.xlsx"
    vystup = a.vystup or KOREN / "public" / f"kontext_prihlasek_{rok}.json"

    wb = openpyxl.load_workbook(zdroj, read_only=True)
    radky = wb.worksheets[0].iter_rows(values_only=True)
    ix = {n: i for i, n in enumerate(next(radky))}
    obory = collections.defaultdict(lambda: {
        "uchazecu": 0, "vysledek": collections.Counter(), "vys": collections.Counter(), "niz": collections.Counter(),
        "soutezici": [], "nesplnili": [], "nesplnili_bez_jpz": 0,
    })

    for r in radky:
        jpz = (body(r[ix["c_m_procentni_skor"]]), body(r[ix["c_procentni_skor"]]), body(r[ix["m_procentni_skor"]]))
        ma_jpz = None not in jpz
        # Klíč oboru nenese zaměření: přihlášky jednoho uchazeče do více
        # zaměření téhož oboru se sloučí (issue #183, scripts/slouceni_prihlasek.py).
        # Obory výš a níž se řadí podle první přihlášky na obor, výsledek
        # uchazeče podle přihlášky, na kterou byl skutečně přijat.
        volby = volby_uchazece(r, ix)
        for v in volby:
            o = obory[v["obor"]]
            o["uchazecu"] += 1
            o["vysledek"][vysledek_uchazece(volby, v)] += 1
            for w in volby:
                if w is not v:
                    (o["vys"] if w["pozice"] < v["pozice"] else o["niz"])[w["obor"]] += 1
            # Vzdání se přijetí a neznámý důvod nejsou soutěžící ani nesplnění.
            if v["stav"] in (PRIJAT, 1):
                if ma_jpz:
                    o["soutezici"].append(jpz)
            elif v["stav"] == 3:
                if ma_jpz:
                    o["nesplnili"].append(jpz)
                else:
                    o["nesplnili_bez_jpz"] += 1

    data = {}
    for obor, o in sorted(obory.items()):
        if o["uchazecu"] < MIN_UCHAZECU:
            continue
        zaznam = {
            "uchazecu": o["uchazecu"],
            "vysledek_uchazecu": {k: o["vysledek"].get(k, 0) for k in ("sem", "vys", "niz", "nikam")},
            "obory_vys": [[k, n] for k, n in o["vys"].most_common(MAX_OBORU) if n >= MIN_SPOLECNYCH],
            "obory_niz": [[k, n] for k, n in o["niz"].most_common(MAX_OBORU) if n >= MIN_SPOLECNYCH],
        }
        hranice = odvozena_hranice(o["soutezici"], o["nesplnili"])
        if hranice:
            zaznam["odvozena_hranice"] = hranice
        data[obor] = zaznam

    vystup.write_text(json.dumps({
        "rok": rok, "kolo": 1, "zdroj": zdroj.name, "generator": "scripts/build-kontext-prihlasek.py",
        "meze": {"min_uchazecu": MIN_UCHAZECU, "min_spolecnych": MIN_SPOLECNYCH, "min_pro_hranici": MIN_PRO_HRANICI},
        "data": data,
        "mimo_prehled": mimo_prehled(data, nazvy_oboru()),
    }, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"zapsáno {len(data)} oborů do {vystup}")


if __name__ == "__main__":
    main()
