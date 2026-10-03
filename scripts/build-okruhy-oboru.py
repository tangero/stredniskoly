#!/usr/bin/env python3
"""Okruhy oborů a souběžné přihlášky podle obce pro web (issue #277, etapa 2a).

Návrh: docs/navrh-shluky-oboru-2027.md (oddíly 6a, 7 a 9), výpočet sdílený s rozborem
v scripts/okruhy_oboru.py. Zdroj: data o jednotlivých uchazečích CERMATu za zobrazený rok
a až dva roky před ním (oblasti přihlášek se odhadují ze sloučených ročníků).

Výstup public/okruhy_oboru_{rok}.json:
  - `obory`: u každého oboru s aspoň 10 uchazeči souhrn po obcích (*Souběžné přihlášky podle obce*)
    pro stránku oboru, a okruh, do kterého obor patří;
  - `mesta`: okruhy, které obsahují obor města přehledu (src/lib/mesta.mjs), s ukotvením oborů
    z okolí, podílem prvních voleb a předností v okruhu, přesunem zájmu proti předchozímu roku
    se šumem a příznakem, zda město splní práh zobrazení.

Neobsahuje nic pod 10 uchazeči. Všechny zveřejněné počty a podíly se posuzují společně, i s počty,
které web už ukazuje jinde (kontext přihlášek na stránce oboru, souběžné přihlášky na stránce
školy): kombinace, ze které by vyšla skupina 1 až 9 uchazečů, se doplňkově potlačí.

    python3 scripts/build-okruhy-oboru.py
    python3 scripts/build-okruhy-oboru.py --rok 2026 --zdroj 2026=… --zdroj 2025=… --kontext … --soubeh … --vystup …
"""
from __future__ import annotations

import argparse
import collections
import json
import random
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from nazvy_oboru import nazvy_oboru  # noqa: E402
from okruhy_oboru import (  # noqa: E402
    GAMMA, MIN, VAHA, dopocitatelne, graf_oboru, nacti_volby, oblasti_prihlasek, okruhy_v_oblastech,
    podil_nad_mezi, prednost, prvni_ve_shluku, sum_zaklad, tv, unika, zaokrouhli,
)

KOREN = Path(__file__).resolve().parent.parent
POCET_ROCNIKU = 3          # oblasti ze zobrazeného roku a dvou let před ním (data uchazečů od 2024)
MIN_OBORU_OKRUHU = 3       # okruh má aspoň 3 obory
MIN_UCHAZECU_OKRUHU = 30   # menší okruh se na stránce města nezobrazuje (návrh, oddíl 7.5)
PRAH_OKRUHU_MESTA = 3      # město dostane okruhy, když má aspoň 3 okruhy ...
PRAH_UKOTVENYCH = 3        # ... s aspoň 3 ukotvenými obory (návrh, oddíl 9)


def zobrazeny_rok() -> int:
    """Rok dat uchazečů, který web zobrazuje (registr, sada cermat-uchazeci-kolo1)."""
    registr = json.loads((KOREN / "public" / "stav_datovych_sad.json").read_text(encoding="utf-8"))
    return int(registr["sady"]["cermat-uchazeci-kolo1"]["zobrazeno"]["obdobi"])


def mesta_prehledu() -> list[str]:
    """Názvy měst ze src/lib/mesta.mjs (generuje scripts/build-mesta.py)."""
    text = (KOREN / "src" / "lib" / "mesta.mjs").read_text(encoding="utf-8")
    return re.findall(r"nazev: '([^']+)'", text)


def zname_podmnoziny(klic: str, mapa: dict, kontext: dict, soubeh: dict) -> dict[str, list[int]]:
    """Přesné počty uchazečů oboru, které web už zveřejňuje, podle obce druhého oboru.

    Každý takový počet je podmnožinou uchazečů s oborem v té obci: obory výš a níž na přihlášce
    (stránka oboru, zvlášť i sečtené za týž obor) a souběžné přihlášky (stránka školy).
    """
    podle_obce: dict[str, list[int]] = collections.defaultdict(list)
    k = kontext.get(klic) or {}
    vys = dict(k.get("obory_vys") or [])
    niz = dict(k.get("obory_niz") or [])
    for jiny in set(vys) | set(niz):
        obec = mapa.get(jiny, {}).get("obec")
        for c in (vys.get(jiny), niz.get(jiny)):
            if c:
                podle_obce[obec].append(c)
        if jiny in vys and jiny in niz:
            podle_obce[obec].append(vys[jiny] + niz[jiny])
    for r in (soubeh.get(klic) or {}).get("soubeh", []):
        podle_obce[mapa.get(r["klic"], {}).get("obec")].append(r["uchazecu"])
    return podle_obce


def obce_oboru(volby_r, uchazecu: dict[str, int], mapa: dict, kontext: dict, soubeh: dict) -> dict[str, dict]:
    """Souběžné přihlášky podle obce pro všechny obory s aspoň MIN uchazeči."""
    pocty: dict[str, collections.Counter] = collections.defaultdict(collections.Counter)
    for u in volby_r:
        obory = {v["obor"] for v in u}
        for k in obory:
            if uchazecu.get(k, 0) < MIN:
                continue
            for obec in {mapa.get(j, {}).get("obec") or "neznámá obec" for j in obory if j != k}:
                pocty[k][obec] += 1
    vysledek = {}
    for k, n in sorted(uchazecu.items()):  # pevné pořadí klíčů, výstup nezávisí na PYTHONHASHSEED
        if n < MIN:
            continue
        zname = zname_podmnoziny(k, mapa, kontext, soubeh)
        obce, potlaceno = [], 0
        for obec, c in sorted(pocty[k].items(), key=lambda x: (-x[1], x[0])):
            podil = podil_nad_mezi(c, n)
            if podil is None or obec == "neznámá obec":
                continue
            mozne = [x for x in range(0, n + 1) if round(x / n, 2) == podil]
            # obec bez známé podmnožiny: rozdíl vždy 1 až 9 by prozradil malou skupinu (review PR #284)
            if any(mozne and all(0 < x - z < MIN for x in mozne) for z in zname.get(obec, [])):
                potlaceno += 1
                continue
            obce.append({"obec": obec, "podil": podil})
        vysledek[k] = {"uchazecu": n, "obce": obce, **({"potlacene_obce": potlaceno} if potlaceno else {})}
    return vysledek


def popis_mesta(mesto: str, volby, rok: int, predchozi: int | None, cast: dict, n: dict, mapa: dict,
                hrany: dict, rng) -> dict:
    vyber = {k for k in cast if mapa.get(k, {}).get("obec") == mesto}
    pred = prednost(volby[rok], cast)
    pred_minule = prednost(volby[predchozi], cast) if predchozi else {}
    prvni, unik, _ = prvni_ve_shluku(volby[rok], cast)
    prvni_minule = prvni_ve_shluku(volby[predchozi], cast)[0] if predchozi else None
    okruhy = []
    for c in sorted({cast[k] for k in vyber}):
        cl = sorted((k for k in cast if cast[k] == c), key=lambda k: (-n[k], k))
        if len(cl) < MIN_OBORU_OKRUHU:
            continue
        mistni = [k for k in cl if k in vyber]
        obory = []
        for k in cl:
            ukotven = k in vyber or any(m in hrany.get(k, {}) for m in mistni)
            pr, prm = pred[k], pred_minule.get(k, {"vys": 0, "niz": 0})
            obory.append({
                "klic": k, "obec": mapa.get(k, {}).get("obec"), "uchazecu": n[k], "ukotven": ukotven,
                "podil_prvnich_voleb_v_okruhu": round(prvni[k] / unik[c], 2) if prvni[k] >= MIN else None,
                "prednost_v_okruhu": round(pr["vys"] / (pr["vys"] + pr["niz"]), 2) if pr["vys"] + pr["niz"] >= MIN else None,
                "prednost_predchozi": round(prm["vys"] / (prm["vys"] + prm["niz"]), 2) if prm["vys"] + prm["niz"] >= MIN else None,
            })
        okruh = {"id": c, "oboru": len(cl), "uchazecu": zaokrouhli(unik[c]), "obory": obory,
                 "jedne_skoly": len({k.split("_")[0] for k in cl}) == 1,
                 "zobrazit": unik[c] >= MIN_UCHAZECU_OKRUHU and len({k.split("_")[0] for k in cl}) > 1}
        if prvni_minule is not None:
            a = {k: prvni_minule[k] for k in cl}
            b = {k: prvni[k] for k in cl}
            na, nb = sum(a.values()), sum(b.values())
            if na >= MIN and nb >= MIN:
                presun = tv({k: v / na for k, v in a.items()}, {k: v / nb for k, v in b.items()})
                sum_ = sum_zaklad(a, b, rng)
                okruh["presun_zajmu_v_okruhu"] = {"roky": [predchozi, rok], "hodnota": round(presun, 3),
                                                   "sum_p95": sum_["p95"], "nad_sumem": presun > sum_["p95"]}
        okruhy.append(okruh)
    ukotvene_okruhy = sum(1 for o in okruhy if o["zobrazit"] and sum(x["ukotven"] for x in o["obory"]) >= PRAH_UKOTVENYCH)
    return {"zobrazit": ukotvene_okruhy >= PRAH_OKRUHU_MESTA, "okruhu": len(okruhy),
            "okruhy": sorted(okruhy, key=lambda o: (-o["uchazecu"], o["id"]))}


def zverejnit(popis: dict) -> dict:
    """Do veřejného souboru jen okruhy, které se smějí zobrazit (review PR #294).

    Okruh jedné školy, okruh pod MIN_UCHAZECU_OKRUHU a okruhy města, které nesplní práh, se do
    public/ nepíšou vůbec: příznak `zobrazit` u zveřejněných dat by je před čtenářem souboru neskryl.
    """
    if not popis["zobrazit"]:
        return {"zobrazit": False, "okruhy": []}
    okruhy = [{k: v for k, v in o.items() if k not in ("zobrazit", "jedne_skoly")} for o in popis["okruhy"] if o["zobrazit"]]
    return {"zobrazit": True, "okruhy": okruhy}


def kontrola(vystup: dict, opravit: bool = False) -> list[str]:
    """Skryté první volby okruhu nesmí jít dopočítat ze zaokrouhleného celku a podílů (review PR #284)."""
    chyby = []
    for mesto, m in vystup["mesta"].items():
        for o in m["okruhy"]:
            if o.get("zobrazit") is False or o.get("jedne_skoly"):
                chyby.append(f"{mesto} okruh {o['id']}: okruh, který se nezobrazuje, je ve výstupu")
            if o["uchazecu"] % 10:
                chyby.append(f"{mesto} okruh {o['id']}: počet uchazečů není zaokrouhlený")
            podily = [(x["podil_prvnich_voleb_v_okruhu"], x["uchazecu"]) for x in o["obory"]]
            if unika(dopocitatelne(o["uchazecu"], podily)):
                chyby.append(f"{mesto} okruh {o['id']}: skryté první volby jdou dopočítat")
                if opravit:
                    for x in o["obory"]:
                        x["podil_prvnich_voleb_v_okruhu"] = None
                    o["podily_potlaceny"] = True
    return chyby


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--rok", type=int, default=None)
    ap.add_argument("--zdroj", action="append", default=[], metavar="ROK=CESTA",
                    help="soubor dat uchazečů 1. kola za ročník; bez něj data/PZ{rok}_kolo1_uchazeci_prihlasky_vysledky.xlsx")
    ap.add_argument("--jen-zdroje", action="store_true",
                    help="jen soubory z --zdroj, bez dohledání v data/ (datová linka: nemíchat s místními soubory)")
    ap.add_argument("--kontext", type=Path, help="kontext přihlášek téhož roku (bez něj public/kontext_prihlasek_{rok}.json)")
    ap.add_argument("--soubeh", type=Path, help="souběžné přihlášky téhož roku (bez něj public/soubeh_prihlasek_{rok}.json)")
    ap.add_argument("--vystup", type=Path)
    a = ap.parse_args()

    rok = a.rok or zobrazeny_rok()
    zdroje = {int(r): Path(c) for r, c in (z.split("=", 1) for z in a.zdroj)}
    roky = []
    for r in range(rok - POCET_ROCNIKU + 1, rok + 1):
        soubor = zdroje.get(r) or (None if a.jen_zdroje else KOREN / "data" / f"PZ{r}_kolo1_uchazeci_prihlasky_vysledky.xlsx")
        if soubor is not None and soubor.exists():
            roky.append((r, soubor))
        elif r == rok:
            raise SystemExit(f"chybí data uchazečů zobrazeného roku: {soubor}")
        else:
            print(f"varování: chybí data uchazečů {r} ({soubor}), oblasti se odhadnou bez nich", file=sys.stderr)
    volby = {}
    for r, s in roky:
        try:
            volby[r] = nacti_volby(s)
        except Exception as e:  # noqa: BLE001  poškozený starší ročník jen zúží odhad oblastí
            if r == rok:
                raise
            print(f"varování: data uchazečů {r} nejdou přečíst ({e}), oblasti se odhadnou bez nich", file=sys.stderr)
    roky = [(r, s) for r, s in roky if r in volby]
    predchozi = rok - 1 if rok - 1 in volby else None

    mapa = nazvy_oboru()
    vsechny = set(mapa)
    kontext = json.loads((a.kontext or KOREN / "public" / f"kontext_prihlasek_{rok}.json").read_text(encoding="utf-8"))["data"]
    soubeh = json.loads((a.soubeh or KOREN / "public" / f"soubeh_prihlasek_{rok}.json").read_text(encoding="utf-8"))["data"]

    oblast, st = oblasti_prihlasek([u for r in volby for u in volby[r]], vsechny)
    cast, n = okruhy_v_oblastech(volby[rok], vsechny, oblast)
    hrany = graf_oboru(volby[rok], vsechny, "pocet")[0]  # hrana = aspoň 10 společných uchazečů
    rng = random.Random(277)

    vystup = {
        "rok": rok,
        "generator": "scripts/build-okruhy-oboru.py",
        "zdroj": [s.name for _, s in roky],
        "popis": "Okruhy oborů a souběžné přihlášky podle obce (docs/navrh-shluky-oboru-2027.md, slovník ukazatelů).",
        "varianta": {"vaha": VAHA, "gamma": GAMMA, "oblasti_z_roku": [r for r, _ in roky],
                     "oblasti_modularita": st["modularita"]},
        "meze": {"min_uchazecu": MIN, "min_oboru_okruhu": MIN_OBORU_OKRUHU, "min_uchazecu_okruhu": MIN_UCHAZECU_OKRUHU,
                 "prah_okruhu_mesta": PRAH_OKRUHU_MESTA, "prah_ukotvenych": PRAH_UKOTVENYCH},
        # souhrn po obcích u všech oborů s aspoň 10 uchazeči, i těch, které index názvů nezná (okruhy jen nad ním)
        "obory": obce_oboru(volby[rok], collections.Counter(o for u in volby[rok] for o in {v["obor"] for v in u}),
                            mapa, kontext, soubeh),
        "mesta": {},
    }
    for k, v in vystup["obory"].items():
        if k in cast:
            v["okruh"] = cast[k]
    for mesto in mesta_prehledu():
        vystup["mesta"][mesto] = zverejnit(popis_mesta(mesto, volby, rok, predchozi, cast, n, mapa, hrany, rng))

    for c in kontrola(vystup, opravit=True):
        print(f"doplňkové potlačení: {c}", file=sys.stderr)
    chyby = kontrola(vystup)
    if chyby:
        raise SystemExit("výstup by prozradil skupinu pod 10 uchazečů:\n" + "\n".join(chyby))

    cil = a.vystup or KOREN / "public" / f"okruhy_oboru_{rok}.json"
    cil.write_text(json.dumps(vystup, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    zobrazena = [m for m, v in vystup["mesta"].items() if v["zobrazit"]]
    print(f"zapsáno {cil}: {len(vystup['obory'])} oborů, {len(zobrazena)} měst s okruhy: {', '.join(zobrazena)}")


if __name__ == "__main__":
    main()
