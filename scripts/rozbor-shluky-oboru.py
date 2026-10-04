#!/usr/bin/env python3
"""Rozbor k docs/navrh-shluky-oboru-2027.md (issue #277, etapa 1): shluky oborů ve městě
podle souběžných přihlášek a přelévání zájmu mezi ročníky.

Zdroj: data o jednotlivých uchazečích CERMATu (PZ{rok}_kolo1_uchazeci_prihlasky_vysledky.xlsx,
jen místní soubory v data/), populace a slučování zaměření jako u souběžných přihlášek
(scripts/slouceni_prihlasek.py), názvy a obec oboru ze scripts/nazvy_oboru.py, kapacita
a výsledky přijímání ze souhrnů 1. kola (public/souhrny_kolo1.json).

Graf: uzel = obor školy (REDIZO_KKOV) v obci města s aspoň 10 uchazeči, hrana = počet
uchazečů, kteří měli na přihlášce oba obory, nejméně 10. Shluky hledá Louvain (vlastní
implementace, bez závislostí) s dodatečnou kontrolou souvislosti shluku (záruka Leidenu).
Porovnávají se dvě váhy hrany a tři hodnoty rozlišení, stabilita mezi běhy a mezi ročníky
proti náhodnému přeřazení.

Výstup: docs/podklady/shluky-oboru-2026-10-03.json. Neobsahuje řádky o jednotlivých
uchazečích ani počty pod 10.

    python3 scripts/rozbor-shluky-oboru.py --cache /tmp/volby.pkl
"""
from __future__ import annotations

import argparse
import collections
import itertools
import json
import pickle
import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from nazvy_oboru import bez_jednotne_zkousky, nazvy_oboru  # noqa: E402
import okruhy_oboru  # noqa: E402
from okruhy_oboru import (  # noqa: E402,F401  výpočet sdílený s generátorem webu (scripts/build-okruhy-oboru.py)
    BEHU, MIN, PERMUTACI, PRIJAT, ari, dopocitatelne, kam_dal, kontrola_kam_dal, louvain, modularita,
    nahodny_zaklad, nejlepsi_rozdeleni, nmi, okruhy_v_oblastech, podil_nad_mezi, prednost, prvni_ve_shluku,
    rozdel_nesouvisle, shoda, sum_zaklad, tv, unika, uzavrenost, zaokrouhli, zarazeni,
)
from okruhy_oboru import graf_oboru as graf_mesta  # noqa: E402

KOREN = Path(__file__).resolve().parent.parent


POCET_ROCNIKU = 3   # data o jednotlivých uchazečích CERMAT zveřejňuje od roku 2024


def rocniky() -> tuple[int, ...]:
    """Zobrazený ročník dat uchazečů podle registru a ročníky před ním; letopočet se nepíše napevno."""
    registr = json.loads((KOREN / "public" / "stav_datovych_sad.json").read_text(encoding="utf-8"))
    rok = int(registr["sady"]["cermat-uchazeci-kolo1"]["zobrazeno"]["obdobi"])
    return tuple(range(rok - POCET_ROCNIKU + 1, rok + 1))


ROKY = rocniky()
MESTA = ("Brno", "Praha")
VYSTUP = KOREN / "docs" / "podklady" / "shluky-oboru-2026-10-03.json"


# ---------------------------------------------------------------- data

def nacti_volby(rok: int) -> list[list[dict]]:
    """Seznam uchazečů, u každého obory denního nezkráceného studia v pořadí na přihlášce."""
    return okruhy_oboru.nacti_volby(KOREN / "data" / f"PZ{rok}_kolo1_uchazeci_prihlasky_vysledky.xlsx")


def souhrny_po_oborech() -> dict[int, dict[str, dict]]:
    """Kapacita, přijatí a nevešlí kvůli kapacitě za REDIZO_KKOV, sečtené přes zaměření."""
    nabidky = json.loads((KOREN / "public" / "souhrny_kolo1.json").read_text(encoding="utf-8"))["nabidky"]
    out: dict[int, dict[str, dict]] = {r: collections.defaultdict(lambda: {"kapacita": 0, "prijati": 0, "nevesli": 0}) for r in ROKY}
    for n in nabidky.values():
        klic = f"{n['redizo']}_{n['kkov']}"
        for r in ROKY:
            d = n["roky"].get(str(r))
            if not d:
                continue
            o = out[r][klic]
            o["kapacita"] += d.get("kapacita") or 0
            o["prijati"] += d.get("prijati") or 0
            o["nevesli"] += d.get("capacity_rejected") or 0
    return {r: d for r, d in out.items() if d}  # ročník, který souhrny nevedou, chybí


def prihlasky_katalogu() -> dict[str, dict[str, int]]:
    """Přihlášky celkem za REDIZO_KKOV v každém ročníku katalogu (2024–2026), sečtené přes zaměření.

    Katalog vede jen obory s jednotnou zkouškou a v ročnících 2024 a 2025 bez nástaveb; slouží jen
    k tomu, aby šla řada přihlášek shluku natáhnout o rok, který data uchazečů v repozitáři nemají.
    """
    kat = json.loads((KOREN / "public" / "schools_data.json").read_text(encoding="utf-8"))
    out: dict[str, dict[str, int]] = {}
    for rok, zaznamy in kat.items():
        d: dict[str, int] = collections.Counter()
        for z in zaznamy:
            kkov = z.get("kkov") or (str(z.get("id") or "").split("_") + ["", ""])[1]
            if kkov and z.get("prihlasky") is not None:
                d[f"{z['redizo']}_{kkov}"] += int(z["prihlasky"])
        out[rok] = dict(d)
    return out


# ---------------------------------------------------------------- graf


# ---------------------------------------------------------------- shoda rozdělení


# ---------------------------------------------------------------- směr a přelévání


def kontrola_zverejneni(vystup: dict, opravit: bool = False) -> list[str]:
    """Najde okruhy, u kterých by šel ze zveřejněných údajů jednoznačně dopočítat skrytý obor.

    S `opravit=True` u takového okruhu potlačí všechny podíly prvních voleb (doplňkové potlačení),
    resp. výpis oborů v přelévání, a vrátí, co potlačil.
    """
    chyby = []
    kontejnery = list(vystup["mesta"].items()) + list(vystup.get("bez_hranic", {}).get("mista", {}).items())
    for mesto, vm in kontejnery:
        for rok, rr in vm["rocniky"].items():
            for o in rr["okruhy"]:
                if o["uchazecu"] % 10:
                    chyby.append(f"{mesto} {rok} okruh {o['id']}: počet uchazečů není zaokrouhlený")
                obory = [(x["podil_prvnich_voleb_v_okruhu"], x["uchazecu"]) for x in o["obory"]]
                if unika(dopocitatelne(o["uchazecu"], obory)):
                    chyby.append(f"{mesto} {rok} okruh {o['id']}: skryté první volby jdou dopočítat")
                    if opravit:
                        for x in o["obory"]:
                            x["podil_prvnich_voleb_v_okruhu"] = None
                        o["podily_potlaceny"] = True
        for p in vm["prelevani"]:
            for rok, u in p["uchazecu"].items():
                vypsane = [(z["podil"][rok], u + 9) for z in p["nejvetsi_zmeny"]]
                # nejvýš pět oborů: když jich je méně, výpis je úplný a zbytek jsou obory pod mezí
                if len(vypsane) < 5 and len(vypsane) < p["oboru"]:
                    zbytek = [(None, MIN - 1)] * (p["oboru"] - len(vypsane))
                    if unika(dopocitatelne(u, vypsane + zbytek)):
                        chyby.append(f"{mesto} přelévání okruh {p['id']} {rok}: zbytek jde dopočítat")
                        if opravit:
                            p["nejvetsi_zmeny"] = []
                            p["vypis_potlacen"] = True
    for kd in vystup.get("bez_hranic", {}).get("kam_dal", {}).values():
        chyby += kontrola_kam_dal(kd, opravit)
    return chyby


def popis_okruhu(volby, vybrane, n_r, vymezeni: dict[str, object], mapa, souhrny, katalog, rng,
                 vyber: set[str] | None = None) -> dict:
    """Okruhy po ročnících a přelévání mezi ročníky.

    `vymezeni` přiřazuje obor k území, ve kterém se okruhy hledaly: u městské varianty je to
    město, u varianty bez hranic měst spádová oblast z přihlášek. Podle něj se počítá podíl
    uchazečů, kteří měli obor i mimo vymezení, a jmenovatel podílu okruhu na uchazečích oblasti.
    `vyber` omezí výstup na okruhy, které obsahují aspoň jeden z vybraných oborů.
    """
    vystup: dict = {"rocniky": {}}
    uchazecu_oblasti = {}
    for r in ROKY:
        u_obl = collections.Counter()
        for u in volby[r]:
            for o in {vymezeni[v["obor"]] for v in u if v["obor"] in vymezeni}:
                u_obl[o] += 1
        uchazecu_oblasti[r] = u_obl

    def oblast_okruhu(cl):
        return collections.Counter(vymezeni[k] for k in cl).most_common(1)[0][0]

    for r in ROKY:
        n = n_r[r]
        cast = vybrane[r]
        pred = prednost(volby[r], cast)
        prvni, unik, mimo_shluk = prvni_ve_shluku(volby[r], cast)
        mimo_vymezeni = collections.Counter()
        z_uchazecu = collections.defaultdict(lambda: {"prijati": 0, "nevesli": 0})
        for u in volby[r]:
            for v in u:
                if v["obor"] in cast and v["stav"] in (PRIJAT, 1):
                    z_uchazecu[v["obor"]]["prijati" if v["stav"] == PRIJAT else "nevesli"] += 1
        for u in volby[r]:
            uvnitr = [v["obor"] for v in u if v["obor"] in cast]
            for k in set(uvnitr):
                if any(vymezeni.get(v["obor"]) != vymezeni[k] for v in u):
                    mimo_vymezeni[k] += 1
        shluky = []
        for c in sorted(set(cast.values())):
            cl = [k for k in cast if cast[k] == c]
            if len(cl) < 3 or (vyber is not None and not vyber & set(cl)):
                continue
            obory = []
            for k in sorted(cl, key=lambda k: (-n[k], k)):
                p, s = mapa.get(k, {}), souhrny.get(r, {}).get(k)
                zdroj_obt = "souhrny_kolo1"
                if s is None and r not in souhrny and k in z_uchazecu:
                    # ročník bez souhrnů 1. kola v repozitáři: soutěžící z dat uchazečů (slovník, Soutěžící o obor)
                    s, zdroj_obt = {"kapacita": None, **z_uchazecu[k]}, "data_uchazecu"
                pr = pred[k]
                obory.append({
                    "klic": k, "skola": p.get("skola"), "obec": p.get("obec"), "obor": p.get("obor"),
                    "jpz": not bez_jednotne_zkousky(k), "uchazecu": n[k],
                    # jen podíl na dvě místa: přesné počty by se sečetly a z celku okruhu by vyšel skrytý obor (review #284)
                    "podil_prvnich_voleb_v_okruhu": round(prvni[k] / unik[c], 2) if prvni[k] >= MIN else None,
                    "prednost_v_okruhu": round(pr["vys"] / (pr["vys"] + pr["niz"]), 2) if pr["vys"] + pr["niz"] >= MIN else None,
                    "podil_i_mimo_vymezeni": podil_nad_mezi(mimo_vymezeni[k], n[k]),
                    "kapacita": s["kapacita"] if s else None,
                    "zarazeni_obtiznosti": zarazeni(s["prijati"], s["nevesli"]) if s else None,
                    "podil_prijatych_ze_soutezicich": round(s["prijati"] / (s["prijati"] + s["nevesli"]), 2)
                    if s and s["prijati"] + s["nevesli"] >= MIN else None,
                    "zdroj_obtiznosti": zdroj_obt if s else None,
                })
            shluky.append({"id": c, "oboru": len(cl), "uchazecu": zaokrouhli(unik[c]),
                           "podil_s_oborem_jinde_ve_meste": podil_nad_mezi(mimo_shluk[c], unik[c]), "obory": obory})
        vystup["rocniky"][str(r)] = {"uchazecu_vymezeni": next(iter(uchazecu_oblasti[r].values()))
                                     if len(uchazecu_oblasti[r]) == 1 else None,
                                     "okruhy": sorted(shluky, key=lambda s: (-s["uchazecu"], s["id"]))}

    # přelévání: okruhy posledního ročníku přenesené na starší ročníky (stejné obory, jiní uchazeči)
    posledni = ROKY[-1]
    ref = vybrane[posledni]
    prel = []
    pocty = {r: prvni_ve_shluku(volby[r], ref) for r in ROKY}
    for c in sorted(set(ref.values())):
        cl = [k for k in ref if ref[k] == c]
        if len(cl) < 3 or (vyber is not None and not vyber & set(cl)):
            continue
        p_r = {r: {k: pocty[r][0][k] for k in cl} for r in ROKY}
        nr = {r: sum(p_r[r].values()) for r in ROKY}
        if min(nr.values()) < MIN:
            continue
        obl = oblast_okruhu(cl)
        kap = {r: sum((souhrny.get(r, {}).get(k) or {}).get("kapacita", 0) for k in cl) for r in ROKY if r in souhrny}
        # přihlášky z katalogu (jen obory s jednotnou zkouškou vedené ve všech ročnících katalogu)
        v_katalogu = [k for k in cl if all(k in katalog[r] for r in katalog)]
        prihl_kat = {r: sum(katalog[r][k] for k in v_katalogu) for r in katalog}
        presun = {}
        for ra, rb in zip(ROKY, ROKY[1:]):
            nove = [k for k in cl if p_r[ra][k] == 0]
            presun[f"{ra}-{rb}"] = {
                "presun_zajmu_v_okruhu": round(tv({k: v / nr[ra] for k, v in p_r[ra].items()}, {k: v / nr[rb] for k, v in p_r[rb].items()}), 3),
                "sum": sum_zaklad(p_r[ra], p_r[rb], rng),
                "nove_obory": len(nove),
                "podil_prvnich_voleb_na_nove_obory": podil_nad_mezi(sum(p_r[rb][k] for k in nove), nr[rb]),
            }
        predposledni = ROKY[-2]
        prel.append({
            "id": c, "oboru": len(cl),
            "uchazecu": {str(r): zaokrouhli(pocty[r][1][c]) for r in ROKY},
            "podil_okruhu_na_uchazecich_oblasti": {str(r): round(zaokrouhli(pocty[r][1][c]) / uchazecu_oblasti[r][obl], 3) for r in ROKY},
            "kapacita": {str(r): v for r, v in kap.items()},
            "presun": presun,
            "prihlasky_katalog": {"oboru": len(v_katalogu), **prihl_kat},
            "nejvetsi_zmeny": sorted(
                ({"klic": k, "skola": mapa.get(k, {}).get("skola"), "obor": mapa.get(k, {}).get("obor"),
                  "podil": {str(r): round(p_r[r][k] / nr[r], 2) for r in ROKY}}
                 for k in cl if all(p_r[r][k] == 0 or p_r[r][k] >= MIN for r in ROKY)),
                key=lambda x: (-abs(x["podil"][str(posledni)] - x["podil"][str(predposledni)]), x["klic"]))[:5],
        })
    vystup["prelevani"] = sorted(prel, key=lambda x: (-x["uchazecu"][str(ROKY[-1])], x["id"]))
    return vystup


# ---------------------------------------------------------------- vymezení bez hranic měst

MISTA_BEZ_HRANIC = ("Brno", "Praha", "Brandýs nad Labem-Stará Boleslav")
UKAZKY_KAM_DAL = ("600007774_79-41-K/41", "600013928_79-41-K/41")  # gymnázium Brandýs, gymnázium Vranovská


def oblasti_prihlasek(volby, vsechny: set[str], vaha: str) -> tuple[dict[str, int], dict]:
    """Oblasti přihlášek ze sloučených ročníků rozboru (okruhy_oboru.oblasti_prihlasek)."""
    return okruhy_oboru.oblasti_prihlasek([u for r in ROKY for u in volby[r]], vsechny, vaha)


def shoda_ve_shlucich(a: dict, b: dict, uzly: set[str], rng) -> dict:
    ca, cb = collections.Counter(a.values()), collections.Counter(b.values())
    vybrane = {k for k in set(a) & set(b) & uzly if ca[a[k]] >= 3 or cb[b[k]] >= 3}
    return {"uzlu": len(vybrane), **shoda(a, b, vybrane), "nahodne": nahodny_zaklad(a, b, vybrane, rng)}


def bez_hranic(volby, mapa, souhrny, katalog, rng) -> dict:
    vsechny = set(mapa)
    out: dict = {"varianty_oblasti": [], "mista": {}, "kam_dal": {}}
    vysledky = {}
    for vaha in ("pocet", "normovana"):
        oblast, st = oblasti_prihlasek(volby, vsechny, vaha)
        casti = {r: okruhy_v_oblastech(volby[r], vsechny, oblast) for r in ROKY}
        vel = sorted(collections.Counter(oblast.values()).values(), reverse=True)
        rad = {"vaha_oblasti": vaha, "oblasti_aspon_10_oboru": sum(1 for v in vel if v >= 10),
               "velikosti": vel[:8], "modularita": st["modularita"],
               "uzavrenost": {str(r): uzavrenost(volby[r], oblast) for r in ROKY}, "shoda_okruhu": {}}
        for nazev, uzly in (("celkem", vsechny), ("Brno", {k for k, p in mapa.items() if p.get("obec") == "Brno"}),
                            ("Praha", {k for k, p in mapa.items() if p.get("obec") == "Praha"}),
                            ("mimo Brno a Prahu", {k for k, p in mapa.items() if p.get("obec") not in ("Brno", "Praha")})):
            rad["shoda_okruhu"][nazev] = {f"{ra}-{rb}": shoda_ve_shlucich(casti[ra][0], casti[rb][0], uzly, rng)
                                          for ra, rb in itertools.combinations(ROKY, 2)}
        out["varianty_oblasti"].append(rad)
        vysledky[vaha] = (oblast, casti)
    oblast, casti = vysledky[VYBRANA[0]]
    # srovnání s okruhy počítanými jen ve městě
    for mesto in MESTA:
        um = {k for k, p in mapa.items() if p.get("obec") == mesto}
        gm, _, _ = graf_mesta(volby[ROKY[-1]], um, VYBRANA[0])
        cm, _ = nejlepsi_rozdeleni(gm, VYBRANA[1])
        cc = collections.Counter(cm.values())
        spol = {k for k in cm if k in casti[ROKY[-1]][0] and cc[cm[k]] >= 3}
        out.setdefault("shoda_s_mestskymi_okruhy", {})[mesto] = {"uzlu": len(spol), **shoda(cm, casti[ROKY[-1]][0], spol)}
    hrany = {r: graf_mesta(volby[r], vsechny, "pocet")[0] for r in ROKY}  # hrany = aspoň 10 společných uchazečů
    for misto in MISTA_BEZ_HRANIC:
        vyber = {k for k, p in mapa.items() if p.get("obec") == misto}
        popis = popis_okruhu(volby, {r: casti[r][0] for r in ROKY}, {r: casti[r][1] for r in ROKY},
                             oblast, mapa, souhrny, katalog, rng, vyber=vyber)
        # obor z okolí je v okruhu města „ukotvený“, má-li s některým oborem okruhu v místě aspoň 10 společných
        # uchazečů; jinak ho do okruhu přivedl jen řetěz slabších vazeb (gymnázium v Brandýse u pražských
        # bezpečnostních oborů) a na stránce místa se neukáže
        for rok, rr in popis["rocniky"].items():
            for o in rr["okruhy"]:
                mistni = {x["klic"] for x in o["obory"] if x["klic"] in vyber}
                for x in o["obory"]:
                    x["ukotven_k_mistu"] = x["klic"] in vyber or any(m in hrany[int(rok)].get(x["klic"], {}) for m in mistni)
        out["mista"][misto] = popis
    for klic in UKAZKY_KAM_DAL:
        out["kam_dal"][klic] = kam_dal(volby[ROKY[-1]], klic, mapa)
    return out


# ---------------------------------------------------------------- hlavní běh

VARIANTY = [("pocet", 1.0), ("normovana", 0.7), ("normovana", 1.0), ("normovana", 1.5), ("pocet", 1.5)]
VYBRANA = ("normovana", 1.0)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--cache", type=Path, help="pickle s načtenými přihláškami (mimo repozitář)")
    a = ap.parse_args()

    volby = pickle.loads(a.cache.read_bytes()) if a.cache and a.cache.exists() else {}
    chybi = [r for r in ROKY if r not in volby]
    for r in chybi:
        volby[r] = nacti_volby(r)
    if a.cache and chybi:
        a.cache.write_bytes(pickle.dumps(volby))
    mapa = nazvy_oboru()
    souhrny = souhrny_po_oborech()
    katalog = prihlasky_katalogu()
    rng = random.Random(277)
    vystup: dict = {"zdroj": [f"PZ{r}_kolo1_uchazeci_prihlasky_vysledky.xlsx" for r in ROKY],
                    "populace": "denní nezkrácené studium, zaměření sloučená (scripts/slouceni_prihlasek.py)",
                    "min_uchazecu": MIN, "behu": BEHU, "vybrana_varianta": list(VYBRANA), "mesta": {}}

    for mesto in MESTA:
        uzly_mesta = {k for k, p in mapa.items() if p.get("obec") == mesto}
        # obory na přihláškách, které mapa nezná, nemají obec: do města se nepočítají
        vm: dict = {"varianty": [], "rocniky": {}}
        vybrane: dict[int, dict] = {}
        grafy = {}
        for vaha, gamma in VARIANTY:
            rad = {"vaha": vaha, "gamma": gamma}
            casti = {}
            for r in ROKY:
                g, n, _ = graf_mesta(volby[r], uzly_mesta, vaha)
                grafy[(r, vaha)] = (g, n)
                cast, st = nejlepsi_rozdeleni(g, gamma)
                casti[r] = cast
                velikosti = sorted(collections.Counter(cast.values()).values(), reverse=True)
                rad[str(r)] = {**st, "uzlu": len(g), "shluku_aspon_3": sum(1 for v in velikosti if v >= 3),
                               "samostatnych": sum(1 for v in velikosti if v == 1), "velikosti": velikosti[:12],
                               "hran": sum(len(s) for s in g.values()) // 2}
            # samostatné uzly (bez hrany) jsou samostatné v obou letech a shodu by nafoukly; počítá se i bez nich
            velke = {r: {u for u, c in casti[r].items() if list(casti[r].values()).count(c) >= 3} for r in ROKY}
            rad["mezi_rocniky"] = {}
            for ra, rb in itertools.combinations(ROKY, 2):
                spolecne = set(casti[ra]) & set(casti[rb])
                ve_shlucich = spolecne & (velke[ra] | velke[rb])
                rad["mezi_rocniky"][f"{ra}-{rb}"] = {
                    "spolecnych_uzlu": len(spolecne), **shoda(casti[ra], casti[rb], spolecne),
                    "nahodne": nahodny_zaklad(casti[ra], casti[rb], spolecne, rng),
                    "jen_uzly_ve_shlucich": {"uzlu": len(ve_shlucich), **shoda(casti[ra], casti[rb], ve_shlucich),
                                             "nahodne": nahodny_zaklad(casti[ra], casti[rb], ve_shlucich, rng)}}
            vm["varianty"].append(rad)
            if (vaha, gamma) == VYBRANA:
                vybrane = casti

        vymezeni = {k: mesto for k in uzly_mesta}
        vm.update(popis_okruhu(volby, vybrane, {r: grafy[(r, VYBRANA[0])][1] for r in ROKY}, vymezeni,
                               mapa, souhrny, katalog, rng))
        vystup["mesta"][mesto] = vm
        print(mesto, "hotovo", file=sys.stderr)

    vystup["bez_hranic"] = bez_hranic(volby, mapa, souhrny, katalog, rng)
    print("bez hranic hotovo", file=sys.stderr)
    for c in kontrola_zverejneni(vystup, opravit=True):
        print(f"doplňkové potlačení: {c}", file=sys.stderr)
    chyby = kontrola_zverejneni(vystup)
    if chyby:
        raise SystemExit("podklad by prozradil skupinu pod 10 uchazečů:\n" + "\n".join(chyby))
    VYSTUP.write_text(json.dumps(vystup, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"zapsáno {VYSTUP.relative_to(KOREN)}")


if __name__ == "__main__":
    main()
