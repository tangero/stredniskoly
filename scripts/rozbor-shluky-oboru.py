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

        # popis vybraných shluků po ročnících
        for r in ROKY:
            g, n = grafy[(r, VYBRANA[0])]
            cast = vybrane[r]
            pred = prednost(volby[r], cast)
            prvni, unik, mimo_shluk = prvni_ve_shluku(volby[r], cast)
            mimo_mesto = collections.Counter()
            z_uchazecu = collections.defaultdict(lambda: {"prijati": 0, "nevesli": 0})
            for u in volby[r]:
                for v in u:
                    if v["obor"] in cast and v["stav"] in (PRIJAT, 1):
                        z_uchazecu[v["obor"]]["prijati" if v["stav"] == PRIJAT else "nevesli"] += 1
            for u in volby[r]:
                v_meste = [v["obor"] for v in u if v["obor"] in cast]
                if v_meste and any(v["obor"] not in uzly_mesta for v in u):
                    for k in set(v_meste):
                        mimo_mesto[k] += 1
            shluky = []
            for c in sorted(set(cast.values())):
                cl = [k for k in cast if cast[k] == c]
                if len(cl) < 3:
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
                        "klic": k, "skola": p.get("skola"), "obor": p.get("obor"), "jpz": not bez_jednotne_zkousky(k),
                        "uchazecu": n[k], "prvni_volby_v_okruhu": prvni[k] if prvni[k] >= MIN else None,
                        "prednost_v_okruhu": round(pr["vys"] / (pr["vys"] + pr["niz"]), 2) if pr["vys"] + pr["niz"] >= MIN else None,
                        "podil_i_mimo_mesto": podil_nad_mezi(mimo_mesto[k], n[k]),
                        "kapacita": s["kapacita"] if s else None,
                        "zarazeni_obtiznosti": zarazeni(s["prijati"], s["nevesli"]) if s else None,
                        "podil_prijatych_ze_soutezicich": round(s["prijati"] / (s["prijati"] + s["nevesli"]), 2)
                        if s and s["prijati"] + s["nevesli"] >= MIN else None,
                        "zdroj_obtiznosti": zdroj_obt if s else None,
                    })
                shluky.append({"id": c, "oboru": len(cl), "uchazecu": unik[c] - unik[c] % 10,
                               "podil_s_oborem_jinde_ve_meste": podil_nad_mezi(mimo_shluk[c], unik[c]), "obory": obory})
            mesto_uch = sum(1 for u in volby[r] if any(v["obor"] in uzly_mesta for v in u))
            vm["rocniky"][str(r)] = {"uchazecu_mesta": mesto_uch, "okruhy": sorted(shluky, key=lambda s: (-s["uchazecu"], s["id"]))}

        # přelévání: okruhy posledního ročníku přenesené na starší ročníky (stejné obory, jiní uchazeči)
        posledni = ROKY[-1]
        ref = vybrane[posledni]
        prel = []
        mesto_uch = {r: vm["rocniky"][str(r)]["uchazecu_mesta"] for r in ROKY}
        pocty = {r: prvni_ve_shluku(volby[r], ref) for r in ROKY}
        for c in sorted(set(ref.values())):
            cl = [k for k in ref if ref[k] == c]
            if len(cl) < 3:
                continue
            p_r = {r: {k: pocty[r][0][k] for k in cl} for r in ROKY}
            nr = {r: sum(p_r[r].values()) for r in ROKY}
            if min(nr.values()) < MIN:
                continue
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
                    "podil_prvnich_voleb_na_nove_obory": round(sum(p_r[rb][k] for k in nove) / nr[rb], 3),
                }
            predposledni = ROKY[-2]
            prel.append({
                "id": c, "oboru": len(cl),
                "uchazecu": {str(r): pocty[r][1][c] - pocty[r][1][c] % 10 for r in ROKY},
                "podil_okruhu_na_uchazecich_mesta": {str(r): round(pocty[r][1][c] / mesto_uch[r], 3) for r in ROKY},
                "kapacita": {str(r): v for r, v in kap.items()},
                "presun": presun,
                "prihlasky_katalog": {"oboru": len(v_katalogu), **prihl_kat},
                "nejvetsi_zmeny": sorted(
                    ({"klic": k, "skola": mapa.get(k, {}).get("skola"), "obor": mapa.get(k, {}).get("obor"),
                      "podil": {str(r): round(p_r[r][k] / nr[r], 3) for r in ROKY}}
                     for k in cl if all(p_r[r][k] == 0 or p_r[r][k] >= MIN for r in ROKY)),
                    key=lambda x: (-abs(x["podil"][str(posledni)] - x["podil"][str(predposledni)]), x["klic"]))[:5],
            })
        vm["prelevani"] = sorted(prel, key=lambda x: (-x["uchazecu"][str(ROKY[-1])], x["id"]))
        vystup["mesta"][mesto] = vm
        print(mesto, "hotovo", file=sys.stderr)

    VYSTUP.write_text(json.dumps(vystup, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"zapsáno {VYSTUP.relative_to(KOREN)}")


if __name__ == "__main__":
    main()
