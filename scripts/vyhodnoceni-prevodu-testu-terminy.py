#!/usr/bin/env python3
"""
Vyhodnocení přínosu převodu výsledku testu (zadání #328, část 2): pomáhá převod přes pořadí
odhadnout výsledek téhož uchazeče v jinak těžkém testu líp než prosté porovnání bodů?

Data: položková data JPZ 2024 čtyřletých oborů, oba řádné termíny. Identifikátor uchazeče je
v obou termínech stejný (korelace součtů 0,93), takže jde o uchazeče, kteří psali oba testy.

Postup (rozdělení na poloviny, aby převod nebyl hodnocen na datech, ze kterých vznikl):
  1. Uchazeči se sudým identifikátorem: převodní tabulka 1. termín → 2. termín týmž
     ekvipercentilovým postupem jako scripts/build-prevod-testu.py (funkce poradi, kvantil).
  2. Uchazeči s lichým identifikátorem: odhad výsledku 2. termínu z výsledku 1. termínu
     a) bez převodu (stejné body), b) s převodem; chyba = skutečnost − odhad.
  3. Totéž obráceně (2. termín → 1. termín).

Omezení: rozdíl termínů obsahuje kromě obtížnosti i vliv pořadí (druhý pokus, jiná škola).
Převod ho připíše obtížnosti; u cvičného testu v TAU pořadí nehraje roli.

    python3 scripts/vyhodnoceni-prevodu-testu-terminy.py

Potřebuje data/JPZ2024_CJL4_polozkova_data.xlsx a data/JPZ2024_MA4_polozkova_data.xlsx
(data.cermat.cz, necommitují se). Výstup: docs/podklady/vyhodnoceni-prevodu-testu-terminy.json
"""
from __future__ import annotations

import importlib.util
import json
import math
from pathlib import Path

KOREN = Path(__file__).resolve().parent.parent
_spec = importlib.util.spec_from_file_location("build_prevod", KOREN / "scripts" / "build-prevod-testu.py")
build = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(build)

PASMA = [(0, 30), (30, 50), (50, 70), (70, 101)]


def tabulka_prevodu(zdroj: list[float], cil: list[float]) -> list[float]:
    """Body cíle pro výsledek 0–100 zdroje, stejně jako build-prevod-testu.py."""
    zdroj, cil = sorted(zdroj), sorted(cil)
    return [build.kvantil(cil, build.poradi(zdroj, b)) for b in range(101)]


def preved(tabulka: list[float], body: float) -> float:
    dole = int(math.floor(body))
    nahore = min(dole + 1, len(tabulka) - 1)
    return tabulka[dole] + (tabulka[nahore] - tabulka[dole]) * (body - dole)


def souhrn_chyb(chyby: list[float]) -> dict:
    n = len(chyby)
    return {
        "pocet": n,
        "prumerna_chyba": round(sum(chyby) / n, 2),
        "prumerna_abs_chyba": round(sum(abs(c) for c in chyby) / n, 2),
        "rmse": round(math.sqrt(sum(c * c for c in chyby) / n), 2),
        "podil_chyba_nad_5": round(sum(1 for c in chyby if abs(c) > 5) / n, 3),
    }


def vyhodnot_smer(par: dict[int, tuple[float, float]]) -> dict:
    """par: id → (výsledek ve zdrojovém testu, výsledek v cílovém testu)."""
    trenink = [v for i, v in par.items() if i % 2 == 0]
    test = [v for i, v in par.items() if i % 2 == 1]
    tab = tabulka_prevodu([z for z, _ in trenink], [c for _, c in trenink])
    vysledek = {
        "bez_prevodu": souhrn_chyb([c - z for z, c in test]),
        "s_prevodem": souhrn_chyb([c - preved(tab, z) for z, c in test]),
        "podle_vysledku": {},
    }
    for od, do in PASMA:
        cast = [(z, c) for z, c in test if od <= z < do]
        if len(cast) < 100:
            continue
        vysledek["podle_vysledku"][f"{od}-{min(do, 100)}"] = {
            "bez_prevodu": souhrn_chyb([c - z for z, c in cast]),
            "s_prevodem": souhrn_chyb([c - preved(tab, z) for z, c in cast]),
        }
    return vysledek


def main() -> None:
    cj = build.nacti_terminy(KOREN / "data" / "JPZ2024_CJL4_polozkova_data.xlsx")
    ma = build.nacti_terminy(KOREN / "data" / "JPZ2024_MA4_polozkova_data.xlsx")
    soucty = [{i: cj[t][i] + ma[t][i] for i in cj[t].keys() & ma[t].keys()} for t in (0, 1)]
    oba = soucty[0].keys() & soucty[1].keys()
    vystup = {
        "zdroj": "JPZ2024_CJL4_polozkova_data.xlsx, JPZ2024_MA4_polozkova_data.xlsx, řádné termíny",
        "uchazecu_oba_terminy": len(oba),
        "korelace_terminu": round(_korelace([soucty[0][i] for i in oba], [soucty[1][i] for i in oba]), 3),
        "z_1_do_2_terminu": vyhodnot_smer({i: (soucty[0][i], soucty[1][i]) for i in oba}),
        "z_2_do_1_terminu": vyhodnot_smer({i: (soucty[1][i], soucty[0][i]) for i in oba}),
    }
    cesta = KOREN / "docs" / "podklady" / "vyhodnoceni-prevodu-testu-terminy.json"
    cesta.write_text(json.dumps(vystup, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    for smer in ("z_1_do_2_terminu", "z_2_do_1_terminu"):
        print(smer, "bez:", vystup[smer]["bez_prevodu"], "s:", vystup[smer]["s_prevodem"])


def _korelace(x: list[float], y: list[float]) -> float:
    mx, my = sum(x) / len(x), sum(y) / len(y)
    sxy = sum((a - mx) * (b - my) for a, b in zip(x, y))
    return sxy / math.sqrt(sum((a - mx) ** 2 for a in x) * sum((b - my) ** 2 for b in y))


if __name__ == "__main__":
    main()
