"""Ověřovací studie: kde uchazeči ztrácejí body v testu z matematiky podle dovedností GPF.

Vstupy:
  - data/JPZ2024_MA4_polozkova_data.xlsx (položková data CERMAT, listy M4A a M4B = řádné termíny),
  - docs/podklady/gpf-cermat-2024/mapovani.json (ruční přiřazení bodovaných pozic k dovednostem GPF).

Výstup: docs/podklady/gpf-cermat-2024/vysledky.json, jen souhrny (žádné řádky uchazečů).

Ukazatel: podíl získaných bodů = součet získaných bodů / součet maximálních bodů (váženo body),
nikoli „podíl uchazečů, kteří úlohu vyřešili“. Vedle něj podíl vynechání (kód 9 v odpovědi).

Spuštění: python3 scripts/studie-gpf-cermat-2024.py [--cache cesta.pkl]
"""

from __future__ import annotations

import argparse
import json
import statistics
import sys
from pathlib import Path

import openpyxl
import pandas as pd

KOREN = Path(__file__).resolve().parent.parent
DATA = KOREN / "data" / "JPZ2024_MA4_polozkova_data.xlsx"
MAPA = KOREN / "docs" / "podklady" / "gpf-cermat-2024" / "mapovani.json"
VYSTUP = KOREN / "docs" / "podklady" / "gpf-cermat-2024" / "vysledky.json"
LISTY = {"M4-A": "M4A", "M4-B": "M4B"}  # jen řádné termíny; náhradní mají stovky řešitelů


def nacti(cache: Path | None) -> dict[str, pd.DataFrame]:
    if cache and cache.exists():
        return pd.read_pickle(cache)
    wb = openpyxl.load_workbook(DATA, read_only=True)
    vysledek = {}
    for termin, prefix in LISTY.items():
        ws = next(w for w in wb.worksheets if w.title.startswith(prefix))
        it = ws.iter_rows(values_only=True)
        hlavicka = next(it)
        chci = [i for i, n in enumerate(hlavicka)
                if n and (str(n).startswith(("k", "b")) or n in ("dt_body", "ss1_smo16", "zkouska"))]
        jmena = [hlavicka[i] for i in chci]
        radky = [[r[i] for i in chci] for r in it if r[hlavicka.index("dt_body")] is not None]
        df = pd.DataFrame(radky, columns=jmena)
        for c in jmena:
            if c.startswith(("k", "b")) or c == "dt_body":
                df[c] = pd.to_numeric(df[c], errors="coerce")
        vysledek[termin] = df
    if cache:
        pd.to_pickle(vysledek, cache)
    return vysledek


def kontroly(termin: str, df: pd.DataFrame, mapa: dict) -> dict:
    b = list(mapa)
    vysl = {"uchazecu": int(len(df))}
    assert sum(v["max"] for v in mapa.values()) == 50, termin
    soucet = df[b].sum(axis=1)
    vysl["neshoda_souctu_b_a_dt_body"] = int((soucet != df["dt_body"]).sum())
    prekroceni = {c: int(df[c].max()) for c in b if df[c].max() > mapa[c]["max"]}
    vysl["pozice_nad_maximem"] = prekroceni
    # U otevřených úloh nese k body nebo 9; 9 musí dávat 0 bodů.
    rozpor = {}
    for c in b:
        k = "k" + c[1:]
        casti = [k] if k in df.columns else [x for x in df.columns if x.startswith(k + ".")]
        if not casti:
            continue
        # Body jsou jen za celou úlohu, proto je rozpor jen tehdy, když jsou 9 všechny podúlohy.
        n = int(((df[casti] == 9).all(axis=1) & (df[c] > 0)).sum())
        if n:
            rozpor[k] = n
    vysl["k9_s_nenulovymi_body"] = rozpor
    return vysl


def vynechani(df: pd.DataFrame, pozice: str) -> float:
    """Podíl uchazečů s kódem 9. CERMAT ho dává za celou úlohu (6.1 a 6.2 mají 9 vždy spolu),
    takže jde o úplně prázdnou úlohu; nevyplněná jedna podúloha je 0 bodů, ne 9."""
    k = "k" + pozice[1:]
    if k in df.columns:
        return float((df[k] == 9).mean())
    casti = [c for c in df.columns if c.startswith(k + ".")]  # b15, b16: celá úloha vynechaná
    return float((df[casti] == 9).all(axis=1).mean())


def dovednost(m: dict, varianta: str) -> str:
    """Hlavní dovednost, nebo ve variantě „vedlejsi“ vedlejší u přiřazení se střední jistotou."""
    if varianta == "vedlejsi" and m["jistota"] == "stredni" and m.get("gpf2"):
        return m["gpf2"]
    return m["gpf"]


def souhrn(df: pd.DataFrame, mapa: dict, varianta: str = "hlavni") -> dict:
    polozky = {}
    for c, m in mapa.items():
        polozky[c] = {
            "podil_bodu": round(float(df[c].mean() / m["max"]), 4),
            "vynechani": round(vynechani(df, c), 4),
        }
    dovednosti: dict[str, dict] = {}
    celkem_ztraceno = sum((m["max"] - df[c].mean()) for c, m in mapa.items())
    for c, m in mapa.items():
        d = dovednosti.setdefault(dovednost(m, varianta), {"pozice": [], "max": 0, "ziskano": 0.0})
        d["pozice"].append(c)
        d["max"] += m["max"]
        d["ziskano"] += float(df[c].mean())
    for g, d in dovednosti.items():
        d["podil_bodu"] = round(d["ziskano"] / d["max"], 4)
        d["podil_ztracenych_bodu"] = round((d["max"] - d["ziskano"]) / celkem_ztraceno, 4)
        d["ziskano"] = round(d["ziskano"], 3)
    return {"polozky": polozky, "dovednosti": dovednosti,
            "prumer_bodu": round(float(df["dt_body"].mean()), 2)}


def rozptyl(mapa: dict, polozky: dict) -> dict:
    """Liší se položky téže dovednosti mezi sebou víc než dovednosti navzájem?
    Průměr dovednosti je vážený maximálními body, stejně jako `podil_bodu` ve `souhrn`."""
    skupiny: dict[str, list[float]] = {}
    vahy: dict[str, list[int]] = {}
    for c, m in mapa.items():
        skupiny.setdefault(m["gpf"], []).append(polozky[c]["podil_bodu"])
        vahy.setdefault(m["gpf"], []).append(m["max"])
    uvnitr = [statistics.pstdev(v) for v in skupiny.values() if len(v) >= 2]
    prumery = [sum(p * w for p, w in zip(v, vahy[g])) / sum(vahy[g]) for g, v in skupiny.items()]
    return {
        "sd_uvnitr_dovednosti_prumer": round(statistics.mean(uvnitr), 4) if uvnitr else None,
        "sd_mezi_dovednostmi": round(statistics.pstdev(prumery), 4),
        "dovednosti_s_2_a_vice_polozkami": sum(len(v) >= 2 for v in skupiny.values()),
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--cache", type=Path)
    a = ap.parse_args()
    mapa = json.loads(MAPA.read_text())["terminy"]
    data = nacti(a.cache)
    vystup: dict = {"zdroj": DATA.name, "mapovani": str(MAPA.relative_to(KOREN)),
                    "ukazatel": "podíl získaných bodů (váženo body) a podíl vynechání", "terminy": {}}
    for termin, df in data.items():
        m = mapa[termin]
        k = kontroly(termin, df, m)
        if k["neshoda_souctu_b_a_dt_body"] or k["pozice_nad_maximem"]:
            print(f"{termin}: kontrola dat neprošla: {k}", file=sys.stderr)
        t = {"kontroly": k, "vsichni": souhrn(df, m)}
        t["rozptyl"] = rozptyl(m, t["vsichni"]["polozky"])
        t["varianta_vedlejsi"] = souhrn(df, m, "vedlejsi")["dovednosti"]
        # Pásma podle celkového výsledku v daném termínu (třetiny řešitelů).
        pasmo = pd.qcut(df["dt_body"].rank(method="first"), 3, labels=["dolni", "stredni", "horni"])
        t["pasma"] = {}
        for p in ("dolni", "stredni", "horni"):
            sub = df[pasmo == p]
            t["pasma"][p] = {"uchazecu": int(len(sub)),
                             "body_od_do": [int(sub["dt_body"].min()), int(sub["dt_body"].max())],
                             **souhrn(sub, m)}
        gy = df["ss1_smo16"] == "GY4"
        t["skupiny"] = {
            "gy4_na_1_miste": {"uchazecu": int(gy.sum()), **souhrn(df[gy], m)},
            "ostatni": {"uchazecu": int((~gy).sum()), **souhrn(df[~gy], m)},
        }
        vystup["terminy"][termin] = t
    # Srovnání termínů očištěné o celkovou obtížnost: podíl bodů dovednosti minus podíl bodů celého testu.
    srovnani = {}
    for varianta in ("hlavni", "vedlejsi"):
        radky = {}
        for termin, t in vystup["terminy"].items():
            celek = t["vsichni"]["prumer_bodu"] / 50
            dov = t["vsichni"]["dovednosti"] if varianta == "hlavni" else t["varianta_vedlejsi"]
            for g, x in dov.items():
                radky.setdefault(g, {})[termin] = round(x["podil_bodu"] - celek, 4)
        srovnani[varianta] = {
            g: {**v, "rozdil_B_minus_A": round(v["M4-B"] - v["M4-A"], 4) if len(v) == 2 else None}
            for g, v in sorted(radky.items())
        }
    vystup["srovnani_terminu_ocistene"] = srovnani
    vystup["prah_stability"] = 0.07
    VYSTUP.write_text(json.dumps(vystup, ensure_ascii=False, indent=1) + "\n")
    print(f"Zapsáno {VYSTUP.relative_to(KOREN)}")


if __name__ == "__main__":
    main()
