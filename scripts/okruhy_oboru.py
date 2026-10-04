"""Okruhy oborů: graf oborů podle společných uchazečů, Louvain, oblasti přihlášek a ochrana zveřejnění.

Sdílí rozbor `scripts/rozbor-shluky-oboru.py` (návrh `docs/navrh-shluky-oboru-2027.md`) a generátor
webu `scripts/build-okruhy-oboru.py`, aby obě strany počítaly stejně (issue #277).

Uzel grafu je obor školy (REDIZO_KKOV) s aspoň MIN uchazeči, hrana dvojice oborů s aspoň MIN
společnými uchazeči. Volby uchazečů jsou seznamy slovníků `obor`, `pozice`, `stav` ze
`slouceni_prihlasek.volby_uchazece` (denní nezkrácené studium, zaměření sloučená).
"""
from __future__ import annotations

import collections
import itertools
import math
import random
import sys
from pathlib import Path

import openpyxl

sys.path.insert(0, str(Path(__file__).resolve().parent))
from slouceni_prihlasek import PRIJAT, volby_uchazece  # noqa: E402

MIN = 10            # meze zveřejnění: uzel i hrana aspoň 10 uchazečů (slovník, souběžné přihlášky)
BEHU = 30           # počet běhů Louvainu s různým pořadím uzlů
PERMUTACI = 300     # náhodná přeřazení a losování šumu
VAHA = "normovana"  # schválená varianta (návrh, oddíl 3.3): normovaná váha hrany ...
GAMMA = 1.0         # ... a rozlišení 1,0


def nacti_volby(soubor: Path) -> list[list[dict]]:
    """Seznam uchazečů, u každého obory denního nezkráceného studia v pořadí na přihlášce."""
    wb = openpyxl.load_workbook(soubor, read_only=True)
    it = wb.worksheets[0].iter_rows(values_only=True)
    ix = {n: i for i, n in enumerate(next(it))}
    vysledek = []
    for radek in it:
        volby = volby_uchazece(radek, ix)
        if volby:
            vysledek.append([{"obor": v["obor"], "pozice": v["pozice"], "stav": v["stav"]} for v in volby])
    return vysledek


def oblasti_prihlasek(vsechny_volby: list[list[dict]], vsechny: set[str], vaha: str = VAHA) -> tuple[dict[str, int], dict]:
    """Oblasti přihlášek: Louvain nad grafem sloučených přihlášek všech dostupných ročníků.

    Oblast je zeměpisná a mezi ročníky se skoro nemění; odhad z jednoho ročníku by její hranice
    posouval a s nimi i okruhy (ARI okruhů 0,51–0,56 proti 0,58 při sloučených ročnících).
    Odhaduje se znovu s každým novým ročníkem dat.
    """
    g, _, _ = graf_oboru(vsechny_volby, vsechny, vaha)
    return nejlepsi_rozdeleni(g, 1.0)


def zarazeni(prijati: int, nevesli: int) -> str | None:
    """Obtížnost přijetí slovy (slovník ukazatelů), s prahem 10 soutěžících uchazečů."""
    sout = prijati + nevesli
    if sout < MIN:
        return None
    if nevesli == 0:
        return "kapacita_nerozhodovala"
    p = prijati / sout
    return "vetsina_uspela" if p >= 2 / 3 else "stredne_tezke" if p >= 1 / 2 else "tezke" if p >= 1 / 3 else "velmi_tezke"

def graf_oboru(volby: list[list[dict]], uzly_mesta: set[str], vaha: str):
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

def nejlepsi_rozdeleni(g, gamma):
    behy = [louvain(g, gamma, s) for s in range(BEHU)]
    q = [modularita(g, c, gamma) for c in behy]
    i = max(range(BEHU), key=lambda k: q[k])
    shody = [ari([behy[x][u] for u in sorted(g)], [behy[y][u] for u in sorted(g)]) for x, y in itertools.combinations(range(BEHU), 2)]
    return behy[i], {"modularita": round(modularita(g, behy[i], 1.0), 3), "ari_mezi_behy": round(sum(shody) / len(shody), 3)}

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

def okruhy_v_oblastech(volby_r, vsechny: set[str], oblast: dict[str, int]):
    """Okruhy jednoho ročníku: Louvain (normovaná váha, γ = 1) uvnitř každé oblasti zvlášť."""
    g, n, _ = graf_oboru(volby_r, vsechny, VAHA)
    cast: dict[str, int] = {}
    for o in sorted(set(oblast.values())):
        sub = {u: {v: w for v, w in g[u].items() if oblast.get(v) == o} for u in g if oblast.get(u) == o}
        if not sub:
            continue
        c2, _ = nejlepsi_rozdeleni(sub, GAMMA)
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
