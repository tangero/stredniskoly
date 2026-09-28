#!/usr/bin/env python3
"""Rozklad rozdílu soutěžících v pásmech proti souhrnům 1. kola (slovník ukazatelů, *Soutěžící o obor*).

Soutěžící v pásmech (`soutezicich`) jsou osoby z dat uchazečů, souhrn CERMAT
počítá přihlášky za nabídku (přijatí + nepřijatí kvůli kapacitě). Skript
rozdíl u každého oboru rozloží na čtyři příčiny:
  B  soutěžící přihlášky uchazeče bez výsledku jednotné zkoušky (pásma ho nepočítají),
  A  vzdání se přijetí: pásma ho v obou ročnících počítají jako přijetí, souhrn zvlášť,
  C  víc přihlášek téhož uchazeče na obor (pásma počítají osobu jednou),
  D  zbytek, nesoulad dvou souborů CERMAT.

    python3 scripts/shoda-soutezicich-se-souhrny.py 2026
"""
from __future__ import annotations

import collections
import json
import sys
from pathlib import Path

import openpyxl

KOREN = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(KOREN / "scripts"))
from slouceni_prihlasek import byl_prijat, denni_nezkracene  # noqa: E402


def z_dat_uchazecu(rok: str) -> tuple[dict, dict]:
    wb = openpyxl.load_workbook(KOREN / "data" / f"PZ{rok}_kolo1_uchazeci_prihlasky_vysledky.xlsx", read_only=True)
    it = wb.worksheets[0].iter_rows(values_only=True)
    ix = {n: i for i, n in enumerate(next(it))}
    bez: dict[str, int] = collections.Counter()
    navic: dict[str, int] = collections.Counter()
    for r in it:
        # Souhrn počítá přihlášky, pásma osoby s výsledkem. Soutěžící přihlášky
        # uchazeče bez výsledku jdou celé do B, u uchazeče s výsledkem se
        # přihlášky nad první na tentýž obor počítají do C.
        bez_skore = r[ix["c_m_procentni_skor"]] is None
        prihlasky = collections.Counter()
        for k in range(1, 6):
            red, kkov = r[ix[f"ss{k}_redizo"]], r[ix[f"ss{k}_kkov"]]
            if not red or not denni_nezkracene(r[ix[f"ss{k}_forma"]], r[ix[f"ss{k}_zkraceno"]]):
                continue
            if byl_prijat(r[ix[f"ss{k}_prijat"]], r[ix[f"ss{k}_duvod_neprijeti"]]) or r[ix[f"ss{k}_duvod_neprijeti"]] == "pro_nedostacujici_kapacitu":
                prihlasky[f"{red}_{kkov}"] += 1
        for obor, n in prihlasky.items():
            if bez_skore:
                bez[obor] += n
            elif n > 1:
                navic[obor] += n - 1
    return bez, navic


def main(rok: str) -> None:
    souhrny = json.loads((KOREN / "public/souhrny_kolo1.json").read_text(encoding="utf-8"))["nabidky"]
    pasma = json.loads((KOREN / f"public/pasma_prijeti_{rok}.json").read_text(encoding="utf-8"))
    pasma = pasma.get("data", pasma)
    agg: dict[str, collections.Counter] = collections.defaultdict(collections.Counter)
    for klic, v in souhrny.items():
        r = v["roky"].get(rok)
        if r:
            for f in ("prijati", "capacity_rejected", "withdrawn"):
                agg["_".join(klic.split("_")[:2])][f] += r.get(f) or 0
    bez, navic = z_dat_uchazecu(rok)
    osob: collections.Counter = collections.Counter()
    oboru: collections.Counter = collections.Counter()
    zbytek = []
    for obor, o in pasma.items():
        a = agg.get(obor)
        if a is None:
            oboru["bez souhrnu"] += 1
            continue
        rozdil = o["soutezicich"] - (a["prijati"] + a["capacity_rejected"])
        osob["|rozdíl|"] += abs(rozdil)
        if rozdil == 0:
            oboru["shoda"] += 1
        # Složky i u shodných oborů: příčiny se mohou vzájemně rušit.
        # Vzdání se je v pásmech obou ročníků přijetím (slouceni_prihlasek), souhrn ho vede zvlášť.
        casti = {"A": a["withdrawn"], "B": bez.get(obor, 0), "C": navic.get(obor, 0)}
        casti["D"] = rozdil - casti["A"] + casti["B"] + casti["C"]
        for k, n in casti.items():
            if n:
                osob[k] += abs(n)
                oboru[k] += 1
        if casti["D"]:
            zbytek.append((obor, rozdil, casti["D"]))
    print(json.dumps({"rok": rok, "oboru": len(pasma), "osob": osob, "oboru_podle_pricin": oboru,
                      "zbytek_priklady": zbytek[:10]}, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "2026")
