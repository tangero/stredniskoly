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
import math
import pickle
import random
import sys
from pathlib import Path

import openpyxl

sys.path.insert(0, str(Path(__file__).resolve().parent))
from nazvy_oboru import bez_jednotne_zkousky, nazvy_oboru  # noqa: E402
from slouceni_prihlasek import PRIJAT, volby_uchazece  # noqa: E402

KOREN = Path(__file__).resolve().parent.parent


POCET_ROCNIKU = 3   # data o jednotlivých uchazečích CERMAT zveřejňuje od roku 2024


def rocniky() -> tuple[int, ...]:
    """Zobrazený ročník dat uchazečů podle registru a ročníky před ním; letopočet se nepíše napevno."""
    registr = json.loads((KOREN / "public" / "stav_datovych_sad.json").read_text(encoding="utf-8"))
    rok = int(registr["sady"]["cermat-uchazeci-kolo1"]["zobrazeno"]["obdobi"])
    return tuple(range(rok - POCET_ROCNIKU + 1, rok + 1))


ROKY = rocniky()
MESTA = ("Brno", "Praha")
MIN = 10            # meze zveřejnění: uzel i hrana aspoň 10 uchazečů (slovník, souběžné přihlášky)
BEHU = 30           # počet běhů Louvainu s různým pořadím uzlů
PERMUTACI = 300     # náhodná přeřazení pro srovnání ročníků
VYSTUP = KOREN / "docs" / "podklady" / "shluky-oboru-2026-10-03.json"


# ---------------------------------------------------------------- data

def nacti_volby(rok: int) -> list[list[dict]]:
    """Seznam uchazečů, u každého obory denního nezkráceného studia v pořadí na přihlášce."""
    wb = openpyxl.load_workbook(KOREN / "data" / f"PZ{rok}_kolo1_uchazeci_prihlasky_vysledky.xlsx", read_only=True)
    it = wb.worksheets[0].iter_rows(values_only=True)
    ix = {n: i for i, n in enumerate(next(it))}
    vysledek = []
    for radek in it:
        volby = volby_uchazece(radek, ix)
        if volby:
            vysledek.append([{"obor": v["obor"], "pozice": v["pozice"], "stav": v["stav"]} for v in volby])
    return vysledek


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


def zarazeni(prijati: int, nevesli: int) -> str | None:
    """Obtížnost přijetí slovy (slovník ukazatelů), s prahem 10 soutěžících uchazečů."""
    sout = prijati + nevesli
    if sout < MIN:
        return None
    if nevesli == 0:
        return "kapacita_nerozhodovala"
    p = prijati / sout
    return "vetsina_uspela" if p >= 2 / 3 else "stredne_tezke" if p >= 1 / 2 else "tezke" if p >= 1 / 3 else "velmi_tezke"


# ---------------------------------------------------------------- graf

def graf_mesta(volby: list[list[dict]], uzly_mesta: set[str], vaha: str):
    """Uzly s aspoň MIN uchazeči, hrany s aspoň MIN společnými uchazeči."""
    n = collections.Counter()
    spolu = collections.Counter()
    for u in volby:
        obory = sorted({v["obor"] for v in u if v["obor"] in uzly_mesta})
        n.update(obory)
        for a, b in itertools.combinations(obory, 2):
            spolu[(a, b)] += 1
    uzly = {k for k, c in n.items() if c >= MIN}
    g: dict[str, dict[str, float]] = {k: {} for k in sorted(uzly)}
    for (a, b), c in sorted(spolu.items()):
        if c < MIN or a not in uzly or b not in uzly:
            continue
        w = c if vaha == "pocet" else c / math.sqrt(n[a] * n[b])
        g[a][b] = g[b][a] = w
    return g, n, spolu


def modularita(g, cast: dict[str, int], gamma: float = 1.0) -> float:
    m2 = sum(sum(s.values()) for s in g.values())
    if m2 == 0:
        return 0.0
    vnitrni = collections.Counter()
    stupen = collections.Counter()
    for u, s in g.items():
        stupen[cast[u]] += sum(s.values())
        for v, w in s.items():
            if cast[u] == cast[v]:
                vnitrni[cast[u]] += w
    return sum(vnitrni[c] / m2 - gamma * (stupen[c] / m2) ** 2 for c in stupen)


def louvain(g, gamma: float, seed: int) -> dict[str, int]:
    """Louvain (Blondel a kol. 2008) nad váženým neorientovaným grafem bez smyček."""
    rng = random.Random(seed)
    # pracovní graf se smyčkami pro agregované uzly
    pg = {u: dict(s) for u, s in g.items()}
    smycka = {u: 0.0 for u in g}
    clenove = {u: [u] for u in g}
    m2 = sum(sum(s.values()) for s in g.values())
    if m2 == 0:
        return {u: i for i, u in enumerate(sorted(g))}
    while True:
        stupen = {u: sum(s.values()) + smycka[u] for u, s in pg.items()}
        kom = {u: u for u in pg}
        tot = dict(stupen)
        poradi = sorted(pg)
        rng.shuffle(poradi)
        zmena = True
        presunuto = False
        while zmena:
            zmena = False
            for u in poradi:
                ku = stupen[u]
                k_do = collections.Counter()
                for v, w in pg[u].items():
                    k_do[kom[v]] += w
                stara = kom[u]
                tot[stara] -= ku
                nejlepsi, zisk = stara, k_do[stara] - gamma * tot[stara] * ku / m2
                for c, kin in k_do.items():
                    z = kin - gamma * tot[c] * ku / m2
                    if z > zisk + 1e-12:
                        nejlepsi, zisk = c, z
                kom[u] = nejlepsi
                tot[nejlepsi] += ku
                if nejlepsi != stara:
                    zmena = presunuto = True
        if not presunuto:
            break
        # agregace
        novy: dict[str, dict[str, float]] = collections.defaultdict(dict)
        nova_smycka: dict[str, float] = collections.defaultdict(float)
        novi_clenove: dict[str, list[str]] = collections.defaultdict(list)
        for u in pg:
            c = kom[u]
            novi_clenove[c].extend(clenove[u])
            nova_smycka[c] += smycka[u]
            novy.setdefault(c, {})
            for v, w in pg[u].items():
                d = kom[v]
                if c == d:
                    nova_smycka[c] += w
                else:
                    novy[c][d] = novy[c].get(d, 0.0) + w
        pg, smycka, clenove = dict(novy), dict(nova_smycka), dict(novi_clenove)
    cast = {}
    for i, c in enumerate(sorted(clenove, key=lambda c: sorted(clenove[c])[0])):
        for u in clenove[c]:
            cast[u] = i
    return rozdel_nesouvisle(g, cast)


def rozdel_nesouvisle(g, cast: dict[str, int]) -> dict[str, int]:
    """Nesouvislý shluk rozdělí na komponenty: to Louvain nezaručuje, Leiden ano."""
    vysledek: dict[str, int] = {}
    dalsi = 0
    for c in sorted(set(cast.values())):
        zbyva = {u for u, k in cast.items() if k == c}
        while zbyva:
            start = min(zbyva)
            fronta, komp = [start], {start}
            while fronta:
                u = fronta.pop()
                for v in g[u]:
                    if v in zbyva and v not in komp:
                        komp.add(v)
                        fronta.append(v)
            for u in komp:
                vysledek[u] = dalsi
            dalsi += 1
            zbyva -= komp
    return vysledek


# ---------------------------------------------------------------- shoda rozdělení

def ari(a: list[int], b: list[int]) -> float:
    n = len(a)
    if n < 2:
        return 1.0
    c2 = lambda x: x * (x - 1) / 2  # noqa: E731
    tab = collections.Counter(zip(a, b))
    sa = sum(c2(v) for v in collections.Counter(a).values())
    sb = sum(c2(v) for v in collections.Counter(b).values())
    sij = sum(c2(v) for v in tab.values())
    ocek = sa * sb / c2(n)
    maxi = (sa + sb) / 2
    return 1.0 if maxi == ocek else (sij - ocek) / (maxi - ocek)


def nmi(a: list[int], b: list[int]) -> float:
    n = len(a)
    pa, pb, pab = collections.Counter(a), collections.Counter(b), collections.Counter(zip(a, b))
    h = lambda p: -sum(v / n * math.log(v / n) for v in p.values())  # noqa: E731
    ha, hb = h(pa), h(pb)
    if ha == 0 or hb == 0:
        return 1.0 if ha == hb else 0.0
    mi = sum(v / n * math.log(v * n / (pa[x] * pb[y])) for (x, y), v in pab.items())
    return 2 * mi / (ha + hb)


def shoda(c1: dict[str, int], c2: dict[str, int], uzly) -> dict:
    uzly = sorted(uzly)
    a, b = [c1[u] for u in uzly], [c2[u] for u in uzly]
    return {"ari": round(ari(a, b), 3), "nmi": round(nmi(a, b), 3)}


def nahodny_zaklad(c1, c2, uzly, rng) -> dict:
    """Shoda s náhodně přeřazenými štítky téhož rozdělení (velikosti shluků zachované)."""
    uzly = sorted(uzly)
    a = [c1[u] for u in uzly]
    b = [c2[u] for u in uzly]
    hodnoty = []
    for _ in range(PERMUTACI):
        bb = b[:]
        rng.shuffle(bb)
        hodnoty.append(ari(a, bb))
    hodnoty.sort()
    return {"ari_median": round(hodnoty[len(hodnoty) // 2], 3), "ari_p95": round(hodnoty[int(len(hodnoty) * 0.95)], 3)}


def nejlepsi_rozdeleni(g, gamma):
    behy = [louvain(g, gamma, s) for s in range(BEHU)]
    q = [modularita(g, c, gamma) for c in behy]
    i = max(range(BEHU), key=lambda k: q[k])
    shody = [ari([behy[x][u] for u in sorted(g)], [behy[y][u] for u in sorted(g)]) for x, y in itertools.combinations(range(BEHU), 2)]
    return behy[i], {"modularita": round(modularita(g, behy[i], 1.0), 3), "ari_mezi_behy": round(sum(shody) / len(shody), 3)}


# ---------------------------------------------------------------- směr a přelévání

def prednost(volby, cast: dict[str, int]) -> dict[str, dict]:
    """U kolika dvojic oborů téhož shluku na jedné přihlášce měl uchazeč tento obor výš."""
    vys, niz = collections.Counter(), collections.Counter()
    for u in volby:
        obory = sorted((v for v in u if v["obor"] in cast), key=lambda v: v["pozice"])
        for i, a in enumerate(obory):
            for b in obory[i + 1:]:
                if cast[a["obor"]] == cast[b["obor"]]:
                    vys[a["obor"]] += 1
                    niz[b["obor"]] += 1
    return {k: {"vys": vys[k], "niz": niz[k]} for k in cast}


def prvni_ve_shluku(volby, cast: dict[str, int]):
    """Pro každého uchazeče a shluk obor, který měl ze shluku na přihlášce nejvýš."""
    prvni = collections.Counter()
    unik = collections.Counter()
    mimo_shluk = collections.Counter()   # uchazeči shluku, kteří měli i obor mimo shluk ve městě
    mimo_mesto = collections.Counter()   # uchazeči shluku, kteří měli i obor mimo město
    for u in volby:
        poshl = collections.defaultdict(list)
        for v in u:
            if v["obor"] in cast:
                poshl[cast[v["obor"]]].append(v)
        for c, obs in poshl.items():
            unik[c] += 1
            prvni[min(obs, key=lambda v: v["pozice"])["obor"]] += 1
            if any(v["obor"] in cast and cast[v["obor"]] != c for v in u):
                mimo_shluk[c] += 1
    return prvni, unik, mimo_shluk


def podil_nad_mezi(citatel: int, jmenovatel: int) -> float | None:
    """Podíl, ze kterého nejde dopočítat skupinu 1 až 9 uchazečů; jinak None."""
    if 0 < citatel < MIN or 0 < jmenovatel - citatel < MIN:
        return None
    return round(citatel / jmenovatel, 2)


def zaokrouhli(pocet: int) -> int:
    """Počet uchazečů okruhu dolů na desítky; přesný celek by s podíly oborů prozradil skrytý obor."""
    return pocet - pocet % 10


def dopocitatelne(celek: int, obory: list[tuple[float | None, int]]) -> set[int]:
    """Které součty skrytých oborů jsou slučitelné se zveřejněnými údaji, počítáno přesně v celých číslech.

    `celek` je počet zaokrouhlený dolů na desítky, takže přesný celek je celek až celek + 9.
    `obory` jsou dvojice (zveřejněný podíl na dvě místa, nebo None = skrytý obor pod 10;
    horní mez počtu, typicky zveřejněný počet uchazečů oboru). Každý uchazeč okruhu patří právě
    jednomu oboru, takže počty oborů dávají celek. Vrací množinu možných součtů skrytých oborů;
    jediná kladná hodnota znamená, že skrytou skupinu jde dopočítat (review PR #284).
    """
    skryte_meze = [min(MIN - 1, mez) for p, mez in obory if p is None]
    if not skryte_meze:
        return set()
    ukazane = [(p, mez) for p, mez in obory if p is not None]
    moznosti: set[int] = set()
    for n in range(celek, celek + 10):
        # součty zobrazených oborů jako bitová maska: bit k = součet k je možný
        maska = 1
        for p, mez in ukazane:
            hodnoty = [a for a in range(MIN, min(mez, n) + 1) if round(a / n, 2) == p]
            if not hodnoty:
                maska = 0
                break
            nova = 0
            for a in hodnoty:
                nova |= maska << a
            maska = nova & ((1 << (n + 1)) - 1)
        for t in range(0, sum(skryte_meze) + 1):
            if n - t >= 0 and maska >> (n - t) & 1:
                moznosti.add(t)
    return moznosti


def unika(moznosti: set[int]) -> bool:
    """Skrytá skupina jde určit: jediná možná hodnota a ta je kladná (nula skupinu neprozradí)."""
    return len(moznosti) == 1 and next(iter(moznosti)) > 0


def kontrola_kam_dal(kd: dict, opravit: bool = False) -> list[str]:
    """Souhrn po obcích a přesné počty oborů téže obce se posuzují společně (review PR #284, návrh 1.2).

    Podíl obce určuje možné celé počty uchazečů s oborem v obci; obor v obci je jejich podmnožina.
    Leží-li rozdíl (uchazeči s jiným oborem obce, ale ne s tímto oborem) vždy mezi 1 a 9, prozradil
    by malou skupinu: řádek obce se pak nezveřejní. Totéž pro obor, jehož doplněk do všech
    uchazečů výchozího oboru je 1 až 9.
    """
    chyby = []
    n = kd["uchazecu"]
    for o in list(kd["obory"]):
        if 0 < n - o["uchazecu"] < MIN:
            chyby.append(f"kam dál {kd['klic']}: doplněk oboru {o['klic']} je pod mezí")
            if opravit:
                kd["obory"].remove(o)
    for ob in list(kd["obce"]):
        mozne = [k for k in range(0, n + 1) if round(k / n, 2) == ob["podil"]]
        for o in kd["obory"]:
            if o["obec"] == ob["obec"] and mozne and all(0 < k - o["uchazecu"] < MIN for k in mozne):
                chyby.append(f"kam dál {kd['klic']}: obec {ob['obec']} bez oboru {o['klic']} prozradí malou skupinu")
                if opravit and ob in kd["obce"]:
                    kd["obce"].remove(ob)
                    kd.setdefault("potlacene_obce", 0)
                    kd["potlacene_obce"] += 1
                break
    return chyby


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


def tv(p: dict, q: dict) -> float:
    return 0.5 * sum(abs(p.get(k, 0) - q.get(k, 0)) for k in sorted(set(p) | set(q)))


def sum_zaklad(pocty_a: dict, pocty_b: dict, rng) -> dict:
    """Jak velký posun dá samotný šum: oba roky losované ze společného rozdělení se stejným počtem uchazečů."""
    klice = sorted(set(pocty_a) | set(pocty_b))
    na, nb = sum(pocty_a.values()), sum(pocty_b.values())
    spol = [pocty_a.get(k, 0) + pocty_b.get(k, 0) for k in klice]
    hodnoty = []
    for _ in range(PERMUTACI):
        xa = collections.Counter(rng.choices(klice, weights=spol, k=na))
        xb = collections.Counter(rng.choices(klice, weights=spol, k=nb))
        hodnoty.append(tv({k: v / na for k, v in xa.items()}, {k: v / nb for k, v in xb.items()}))
    hodnoty.sort()
    return {"median": round(hodnoty[len(hodnoty) // 2], 3), "p95": round(hodnoty[int(len(hodnoty) * 0.95)], 3)}


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
    """Spádové oblasti: Louvain nad grafem sloučených přihlášek všech ročníků.

    Oblast je zeměpisná a mezi ročníky se skoro nemění; odhad z jednoho ročníku by její hranice
    posouval a s nimi i okruhy (ARI okruhů 0,51–0,56 proti 0,58 při sloučených ročnících).
    Odhaduje se znovu s každým novým ročníkem dat.
    """
    vse = [u for r in ROKY for u in volby[r]]
    g, _, _ = graf_mesta(vse, vsechny, vaha)
    return nejlepsi_rozdeleni(g, 1.0)


def okruhy_v_oblastech(volby_r, vsechny: set[str], oblast: dict[str, int]):
    """Okruhy jednoho ročníku: Louvain (normovaná váha, γ = 1) uvnitř každé oblasti zvlášť."""
    g, n, _ = graf_mesta(volby_r, vsechny, VYBRANA[0])
    cast: dict[str, int] = {}
    for o in sorted(set(oblast.values())):
        sub = {u: {v: w for v, w in g[u].items() if oblast.get(v) == o} for u in g if oblast.get(u) == o}
        if not sub:
            continue
        c2, _ = nejlepsi_rozdeleni(sub, VYBRANA[1])
        for u, x in c2.items():
            cast[u] = o * 10000 + x
    # obor, který v ročníku sloučeném grafu nebyl, stojí samostatně
    for u in g:
        cast.setdefault(u, -1 - len(cast))
    return cast, n


def uzavrenost(volby_r, oblast) -> float:
    """Podíl dvojic oborů na jedné přihlášce, které leží v téže oblasti."""
    v = t = 0
    for u in volby_r:
        ob = [x["obor"] for x in u if x["obor"] in oblast]
        for a, b in itertools.combinations(ob, 2):
            t += 1
            v += oblast[a] == oblast[b]
    return round(v / t, 3) if t else 0.0


def shoda_ve_shlucich(a: dict, b: dict, uzly: set[str], rng) -> dict:
    ca, cb = collections.Counter(a.values()), collections.Counter(b.values())
    vybrane = {k for k in set(a) & set(b) & uzly if ca[a[k]] >= 3 or cb[b[k]] >= 3}
    return {"uzlu": len(vybrane), **shoda(a, b, vybrane), "nahodne": nahodny_zaklad(a, b, vybrane, rng)}


def kam_dal(volby_r, klic: str, mapa) -> dict:
    """Stránka oboru bez hranic měst: kam další se hlásili uchazeči oboru, po oborech a po obcích."""
    uch = [u for u in volby_r if any(v["obor"] == klic for v in u)]
    n = len(uch)
    obory, vys, obce = collections.Counter(), collections.Counter(), collections.Counter()
    for u in uch:
        moje = next(v["pozice"] for v in u if v["obor"] == klic)
        dalsi = [v for v in u if v["obor"] != klic]
        for v in dalsi:
            obory[v["obor"]] += 1
            if moje < v["pozice"]:
                vys[v["obor"]] += 1
        for ob in {mapa.get(v["obor"], {}).get("obec") or "neznámá obec" for v in dalsi}:
            obce[ob] += 1
    return {
        "klic": klic, "skola": mapa.get(klic, {}).get("skola"), "obec": mapa.get(klic, {}).get("obec"), "uchazecu": n,
        "obory": [{"klic": k, "skola": mapa.get(k, {}).get("skola"), "obec": mapa.get(k, {}).get("obec"),
                   "obor": mapa.get(k, {}).get("obor"), "uchazecu": c, "podil": round(c / n, 2),
                   "tento_obor_vys": podil_nad_mezi(vys[k], c)}
                  for k, c in sorted(obory.items(), key=lambda x: (-x[1], x[0])) if c >= MIN],
        "obce": [{"obec": o, "podil": podil_nad_mezi(c, n)}
                 for o, c in sorted(obce.items(), key=lambda x: (-x[1], x[0])) if podil_nad_mezi(c, n) is not None],
    }


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
