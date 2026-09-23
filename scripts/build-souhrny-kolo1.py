#!/usr/bin/env python3
"""Souhrny 1. kola za obory po ročnících: podklad pro grafy vývoje v čase.

Zdroj: oficiální souhrny CERMATu PZ{rok}_kolo1_skolobory_vysledky.xlsx (91 sloupců),
jeden soubor za ročník. Populace stejná jako applications_2026.json: denní,
nezkrácené studium s povinnou jednotnou zkouškou.

Výstupy:
  public/souhrny_kolo1.json                         nabídky po ročnících a rozdělení ve srovnatelných skupinách
  docs/podklady/overeni-srovnani-rocniku.json       doklady ke slovníku (párování, stabilita mezi ročníky)

Párování ročníků (docs/grafy-skoly-a-oboru-2027.md, pravidlo 7):
  1. shodný klíč nabídky REDIZO_KKOV_zaměření,
  2. jinak pár z mapy nabídek public/offer_mapping_{rok}.json, pokud pro ročník existuje
     (jediná nabídka oboru, jednoznačná shoda textu zaměření, ručně ověřený pár);
     stránky nabídek stojí na téže mapě, takže souhrn a stránka párují stejně,
  3. jinak jediná nabídka téže školy a oboru v obou ročnících,
  4. jinak se nabídka nepáruje a předchozí rok se u ní nezobrazí.

    python3 scripts/build-souhrny-kolo1.py                  # všechny ročníky, jejichž soubor leží v data/
    python3 scripts/build-souhrny-kolo1.py --zdroj-dir /cesta --rok 2025 --rok 2026
"""
from __future__ import annotations

import argparse
import bisect
import hashlib
import json
import math
import re
import statistics
import sys
from collections import Counter, defaultdict
from pathlib import Path

KOREN = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(KOREN / "scripts"))

from import_cermat_results import is_valid_flat, load_flat_xlsx, make_key  # noqa: E402

VYSTUP = KOREN / "public" / "souhrny_kolo1.json"
DOKLAD = KOREN / "docs" / "podklady" / "overeni-srovnani-rocniku.json"
ZDROJ_URL = "https://data.cermat.cz/files/files/JPZ/agregovana_data_skoly/"
MIN_PRIJATYCH_PRO_MINIMUM = 10  # slovník: pod deseti přijatými je minimum údaj o jednotlivci


def cislo(r: dict, sloupec: str, pocet: bool = False, maximum: float = math.inf):
    """Chybějící údaj zůstane None, nikdy se nemění na nulu."""
    v = r.get(sloupec)
    if v is None or isinstance(v, str) or isinstance(v, bool):
        return None
    if not math.isfinite(v) or not 0 <= v <= maximum:
        raise ValueError(f"neplatný údaj {sloupec}: {v}")
    if pocet:
        if int(v) != v:
            raise ValueError(f"neceločíselný počet {sloupec}: {v}")
        return int(v)
    return v


def zaokrouhli(v, mist: int = 1):
    return None if v is None else round(v, mist)


def zaznam(r: dict) -> dict:
    kapacita = cislo(r, "KAPACITA", pocet=True)
    prihlasky = cislo(r, "PŘIHLÁŠKY CELKEM", pocet=True)
    priority = [cislo(r, f"PŘIHLÁŠKY - PRIORITA {p}", pocet=True) for p in range(1, 6)]
    prijati = cislo(r, "PŘIJATÍ", pocet=True)
    prijati_priority = [cislo(r, f"PŘIJATÍ - PRIORITA {p}", pocet=True) for p in range(1, 6)]
    if None not in priority and prihlasky is not None and sum(priority) != prihlasky:
        raise ValueError("součet priorit nesedí s přihláškami")
    konali_prijati = cislo(r, "ČJ+MA - KONALI (PŘIJATI)", pocet=True)
    konali = cislo(r, "ČJ+MA - KONALI", pocet=True)
    s_vysledkem_prijatych = konali_prijati is not None and konali_prijati > 0
    prumer_prijatych = cislo(r, "ČJ+MA - % SKÓR - PRŮMĚR (PŘIJATI)", maximum=200)
    out = {
        "kapacita": kapacita,
        "prihlasky": prihlasky,
        "prihlasky_priority": priority,
        "prijati": prijati,
        "prijati_priority": prijati_priority,
        "capacity_rejected": cislo(r, "NEPŘIJATI - NEDOSTATEČNÁ KAPACITA", pocet=True),
        "conditions_not_met": cislo(r, "NEPŘIJATI - NESPLNĚNÍ PODMÍNEK", pocet=True),
        "higher_priority": cislo(r, "NEPŘIJATI - PŘIJAT NA VYŠŠÍ PRIORITU", pocet=True),
        "withdrawn": cislo(r, "NEPŘIJATI - VZDAL SE PŘIJETÍ", pocet=True),
        "tlak_prvnich_voleb": round(priority[0] / kapacita, 3) if kapacita and priority[0] is not None else None,
        # Podíl prvních voleb (slovník ukazatelů): dělí se přihláškami, ne kapacitou; měří pozici na přihlášce.
        "podil_prvnich_voleb": round(priority[0] / prihlasky, 3) if prihlasky and priority[0] is not None else None,
        "index_poptavky": round(prihlasky / kapacita, 3) if kapacita and prihlasky is not None else None,
        "konali": konali,
        "prijatych_s_vysledkem": konali_prijati,
        # Škála 0–100 jako cj_ma_prijati v cermat_results_2026.json.
        "cj_ma_prijati": zaokrouhli(prumer_prijatych / 2, 2) if s_vysledkem_prijatych and prumer_prijatych is not None else None,
        # Předměty na škále 0–50 (procentní skór předmětu / 2), jako cj_prijati a ma_prijati v cermat_results_2026.json.
        "cj_prijati": zaokrouhli(cislo(r, "ČJ - % SKÓR - PRŮMĚR (PŘIJATI)", maximum=100) / 2, 2)
        if s_vysledkem_prijatych and cislo(r, "ČJ - % SKÓR - PRŮMĚR (PŘIJATI)", maximum=100) is not None else None,
        "ma_prijati": zaokrouhli(cislo(r, "MA - % SKÓR - PRŮMĚR (PŘIJATI)", maximum=100) / 2, 2)
        if s_vysledkem_prijatych and cislo(r, "MA - % SKÓR - PRŮMĚR (PŘIJATI)", maximum=100) is not None else None,
        "prumerne_umisteni_prijatych": zaokrouhli(cislo(r, "ČJ+MA - PERCENTIL - PRŮMĚR (PŘIJATI)", maximum=100)) if s_vysledkem_prijatych else None,
        "prumerne_umisteni_uchazecu": zaokrouhli(cislo(r, "ČJ+MA - PERCENTIL - PRŮMĚR", maximum=100)) if konali else None,
        "min_prijaty_percentil_souhrn": zaokrouhli(cislo(r, "ČJ+MA - PERCENTIL - MIN (PŘIJATI)", maximum=100))
        if konali_prijati is not None and konali_prijati >= MIN_PRIJATYCH_PRO_MINIMUM else None,
    }
    return out


def nacti_rocnik(soubor: Path, rok: int) -> dict[str, dict]:
    zaznamy = load_flat_xlsx(soubor)
    if not zaznamy or any(r.get("ROK") != rok or r.get("KOLO") != 1 for r in zaznamy):
        raise ValueError(f"{soubor.name}: nesprávný rok nebo kolo")
    nabidky: dict[str, dict] = {}
    for r in zaznamy:
        if not is_valid_flat(r) or not r.get("KAPACITA"):
            continue
        klic = make_key(str(r["REDIZO"]), r["KKOV"], r.get("ZAMĚŘENÍ OBORU") or "")
        if klic in nabidky:
            raise ValueError(f"{soubor.name}: duplicitní nabídka {klic}")
        z = zaznam(r)
        nabidky[klic] = {
            "redizo": str(r["REDIZO"]), "kkov": r["KKOV"], "zamereni": r.get("ZAMĚŘENÍ OBORU") or "",
            "skupina": f"{r['TYP ŠKOLY']}_{r['DÉLKA STUDIA']}",
            # Skupina maturitních oborů (SMO16) přímo ze zdroje. Je to týž kód, jakým jsou
            # klíčovaná maturitní data (docs/zdroje-dat.md, 2.11), takže obor lze napojit na
            # maturitu bez jakékoli mapy KKOV → SMO16; ta se dosud vedla jako chybějící zdroj.
            "smo16": (r.get("SKUPINA OBORŮ (16)") or "").strip() or None,
            "kraj": r["KRAJ"], "kraj_nazev": r["KRAJ - NÁZEV"], **z,
            "podil_prijatych_ze_soutezicich": round(z["prijati"] / (z["prijati"] + z["capacity_rejected"]), 3)
            if z["prijati"] is not None and z["capacity_rejected"] is not None and z["prijati"] + z["capacity_rejected"] > 0 else None,
            "zarazeni_obtiznosti": zarazeni_obtiznosti(z),
        }
    return nabidky


def normalizuj(klic: str) -> str:
    """Klíč REDIZO_KKOV_zaměření v podobě, jakou souhrny používají (make_key)."""
    redizo, kkov, *zamereni = klic.split("_", 2)
    return make_key(redizo, kkov, zamereni[0] if zamereni else "")


def jednoznacny_index(klice) -> dict[str, str]:
    """Normalizovaný klíč → klíč souhrnu; klíče, které se po normalizaci srazí, v indexu nejsou."""
    index: dict[str, str] = {}
    kolize = set()
    for k in klice:
        n = normalizuj(k)
        if n in index:
            kolize.add(n)
        index[n] = k
    return {n: k for n, k in index.items() if n not in kolize}


def nacti_mapu(rok: int, adresar: Path) -> dict[str, dict]:
    """Mapa nabídek ročníku na předchozí katalog (scripts/build-offer-mapping-{rok}.py); prázdná, když chybí."""
    soubor = adresar / f"offer_mapping_{rok}.json"
    return json.loads(soubor.read_text())["mapping"] if soubor.exists() else {}


def paruj(stary: dict[str, dict], novy: dict[str, dict],
          mapa: dict[str, dict] | None = None) -> dict[str, tuple[str, str]]:
    """Nový klíč → (starý klíč, způsob). Nejednoznačné páry se vynechají."""
    pary: dict[str, tuple[str, str]] = {}
    for k in novy:
        if k in stary:
            pary[k] = (k, "shoda_klice")
    if mapa:
        idx_novy, idx_stary = jednoznacny_index(novy), jednoznacny_index(stary)
        pouzite = {s for s, _ in pary.values()}
        for ident, info in sorted(mapa.items()):
            n = idx_novy.get(normalizuj(ident))
            s = idx_stary.get(normalizuj(info["katalog_id"]))
            if n and s and n not in pary and s not in pouzite:
                pary[n] = (s, info["zpusob"])
                pouzite.add(s)
    zbyle_nove = defaultdict(list)
    zbyle_stare = defaultdict(list)
    pouzite = {s for s, _ in pary.values()}
    for k, v in novy.items():
        if k not in pary:
            zbyle_nove[f"{v['redizo']}_{v['kkov']}"].append(k)
    for k, v in stary.items():
        if k not in pouzite:
            zbyle_stare[f"{v['redizo']}_{v['kkov']}"].append(k)
    for obor, nove in zbyle_nove.items():
        stare = zbyle_stare.get(obor, [])
        vsechny_nove = [k for k in novy if f"{novy[k]['redizo']}_{novy[k]['kkov']}" == obor]
        vsechny_stare = [k for k in stary if f"{stary[k]['redizo']}_{stary[k]['kkov']}" == obor]
        if len(nove) == 1 and len(stare) == 1 and len(vsechny_nove) == 1 and len(vsechny_stare) == 1:
            pary[nove[0]] = (stare[0], "jedna_ku_jedne")
    return pary


def ctvrtiny(hodnoty: list[float]) -> list[float]:
    if len(hodnoty) < 4:
        return []
    q = statistics.quantiles(hodnoty, n=4)
    return [round(q[0], 2), round(statistics.median(hodnoty), 2), round(q[2], 2)]


def shoda_s_jinymi_zdroji(rocniky: dict[int, dict]) -> dict:
    """Doklady ke slovníku: historický průměr v katalogu a percentil nejnižšího přijatého z dat uchazečů."""
    out = {}
    katalog_soubor = KOREN / "public" / "schools_data.json"
    if 2025 in rocniky and katalog_soubor.exists():
        katalog = json.loads(katalog_soubor.read_text(encoding="utf-8")).get("2025", [])
        rozdily = []
        for z in katalog:
            casti = z["id"].split("_")
            klic = make_key(casti[0], casti[1], z.get("zamereni") or "")
            s = rocniky[2025].get(klic)
            if s and s["cj_ma_prijati"] is not None and z.get("prumer_body"):
                rozdily.append(abs(z["prumer_body"] / 2 - s["cj_ma_prijati"]))
        out["historicky_prumer_2025_proti_prumeru_prijatych"] = {
            "n": len(rozdily), "do_0_5_bodu": sum(1 for d in rozdily if d <= 0.5),
            "median_rozdilu": round(statistics.median(rozdily), 3) if rozdily else None,
        }
    for rok in rocniky:
        pasma_soubor = KOREN / "public" / f"pasma_prijeti_{rok}.json"
        if not pasma_soubor.exists():
            continue
        pasma = json.loads(pasma_soubor.read_text(encoding="utf-8"))["data"]
        podle_oboru = defaultdict(list)
        for v in rocniky[rok].values():
            podle_oboru[f"{v['redizo']}_{v['kkov']}"].append(v)
        rozdily = []
        for obor, p in pasma.items():
            nabidky = podle_oboru.get(obor, [])
            if len(nabidky) == 1 and p.get("prijatych", 0) >= MIN_PRIJATYCH_PRO_MINIMUM and nabidky[0]["min_prijaty_percentil_souhrn"] is not None:
                rozdily.append(abs(nabidky[0]["min_prijaty_percentil_souhrn"] - p["min_prijaty_percentil"]))
        out[f"min_prijaty_percentil_{rok}_souhrn_proti_datum_uchazecu"] = {
            "n": len(rozdily), "do_2_bodu": sum(1 for d in rozdily if d <= 2),
            "median_rozdilu": round(statistics.median(rozdily), 2) if rozdily else None,
        }
    return out


def zarazeni_obtiznosti(r: dict) -> str | None:
    """Slovní zařazení obtížnosti přijetí (slovník ukazatelů): podle podílu přijatých ze soutěžících."""
    prijati, nevesli = r.get("prijati"), r.get("capacity_rejected")
    if prijati is None or nevesli is None:
        return None
    if nevesli == 0:
        return "kapacita_nerozhodovala"
    podil = prijati / (prijati + nevesli)
    return "velmi_tezke" if podil < 1 / 3 else "tezke" if podil < 1 / 2 else "stredne_tezke" if podil < 2 / 3 else "vetsina_uspela"


KOHORTA_HORNI = 67  # percentil ve skupině, nad kterým je nabídka školou první volby (slovník ukazatelů)
KOHORTA_DOLNI = 33  # percentil ve skupině, pod kterým je nabídka záložní volbou


def percentil_ve_skupine(hodnota: float, serazene: list[float]) -> float:
    """Podíl nabídek skupiny s hodnotou menší nebo rovnou (slovník ukazatelů, oddíl 4), v procentech."""
    return 100 * bisect.bisect_right(serazene, hodnota) / len(serazene)


def kohorta_pozice(percentil: float | None) -> str | None:
    """Kohorta podle pozice na přihlášce ze slovníku ukazatelů, oddíl 1."""
    if percentil is None:
        return None
    if percentil > KOHORTA_HORNI:
        return "skola_prvni_volby"
    if percentil < KOHORTA_DOLNI:
        return "zalozni_volba"
    return "smisena_pozice"


def doplnit_kohorty(nabidky_rocniku: dict[str, dict]) -> dict[str, list[float]]:
    """Doplní percentil podílu prvních voleb ve skupině a kohortu; vrátí rozdělení skupin.

    Počítá se pro každou skupinu bez ohledu na její velikost. Práh zobrazení (30 nabídek
    ve skupině, slovník oddíl 4) uplatňuje až knihovna, stejně jako u obtížnosti přijetí.
    """
    podle = defaultdict(list)
    for v in nabidky_rocniku.values():
        if v["podil_prvnich_voleb"] is not None:
            podle[v["skupina"]].append(v["podil_prvnich_voleb"])
    for h in podle.values():
        h.sort()
    for v in nabidky_rocniku.values():
        x = v["podil_prvnich_voleb"]
        pct = None if x is None else round(percentil_ve_skupine(x, podle[v["skupina"]]), 1)
        v["percentil_podilu_prvnich_voleb"] = pct
        v["kohorta_pozice"] = kohorta_pozice(pct)
    return podle


def doklad_kohort(rocniky: dict[int, dict], nabidky: dict[str, dict], roky: list[int]) -> dict:
    """Rozdělení kohort v ročníku a podíl spárovaných nabídek, které zůstaly ve stejné kohortě."""
    out = {}
    for rok in roky:
        out[str(rok)] = dict(Counter(v["kohorta_pozice"] for v in rocniky[rok].values()))
    for i, rok in enumerate(roky[1:], start=1):
        pred = str(roky[i - 1]); klic = f"{pred}-{rok}"
        pary = [(v[pred]["kohorta_pozice"], v[str(rok)]["kohorta_pozice"]) for v in nabidky.values()
                if v.get(pred) and v.get(str(rok)) and klic in v.get("parovani", {})
                and v[pred]["kohorta_pozice"] and v[str(rok)]["kohorta_pozice"]]
        if pary:
            out[klic] = {"n": len(pary), "stejna_kohorta_pct": round(100 * sum(1 for a, b in pary if a == b) / len(pary), 1)}
    return out


def doklad_podilu(rocniky: dict[int, dict], nabidky: dict[str, dict], roky: list[int]) -> dict:
    """Rozdělení a stabilita podílu přijatých ze soutěžících a jeho slovního zařazení."""
    out = {}
    for rok in roky:
        kat = Counter(zarazeni_obtiznosti(v) for v in rocniky[rok].values())
        podily = [v["prijati"] / (v["prijati"] + v["capacity_rejected"]) for v in rocniky[rok].values()
                  if v.get("capacity_rejected") and v.get("prijati") is not None]
        out[str(rok)] = {"zarazeni": dict(kat), "ctvrtiny_podilu_u_nabidek_s_odmitnutymi": ctvrtiny(podily)}
    poradi = ["kapacita_nerozhodovala", "vetsina_uspela", "stredne_tezke", "tezke", "velmi_tezke"]
    for i, rok in enumerate(roky[1:], start=1):
        pred = str(roky[i - 1]); klic = f"{pred}-{rok}"
        pary = []
        for v in nabidky.values():
            a_, b_ = v.get(pred), v.get(str(rok))
            if not a_ or not b_ or klic not in v.get("parovani", {}):
                continue
            if None in (a_["prijati"], a_["capacity_rejected"], b_["prijati"], b_["capacity_rejected"]):
                continue
            sa, sb = a_["prijati"] + a_["capacity_rejected"], b_["prijati"] + b_["capacity_rejected"]
            if sa >= 20 and sb >= 20:
                pary.append((a_["prijati"] / sa, b_["prijati"] / sb, zarazeni_obtiznosti(a_), zarazeni_obtiznosti(b_)))
        if len(pary) >= 3:
            xa, xb = [x[0] for x in pary], [x[1] for x in pary]
            out[klic] = {
                "n_aspon_20_soutezicich_v_obou_letech": len(pary),
                "korelace": round(statistics.correlation(xa, xb), 3),
                "median_abs_zmeny_pb": round(100 * statistics.median(abs(a - b) for a, b in zip(xa, xb)), 1),
                "stejne_zarazeni_pct": round(100 * sum(1 for x in pary if x[2] == x[3]) / len(pary), 1),
                "nejvys_o_stupen_pct": round(100 * sum(1 for x in pary if abs(poradi.index(x[2]) - poradi.index(x[3])) <= 1) / len(pary), 1),
            }
    return out


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--zdroj-dir", type=Path, default=KOREN / "data")
    ap.add_argument("--rok", type=int, action="append", help="ročník; bez uvedení všechny nalezené soubory")
    ap.add_argument("--vystup", type=Path, default=VYSTUP)
    ap.add_argument("--doklad", type=Path, default=DOKLAD)
    ap.add_argument("--mapy-dir", type=Path, default=KOREN / "public",
                    help="adresář s offer_mapping_{rok}.json")
    a = ap.parse_args()

    roky = sorted(a.rok) if a.rok else sorted(
        int(m.group(1)) for p in a.zdroj_dir.glob("PZ*_kolo1_skolobory_vysledky.xlsx")
        if (m := re.fullmatch(r"PZ(\d{4})_kolo1_skolobory_vysledky\.xlsx", p.name))
    )
    if len(roky) < 1:
        raise SystemExit("nenalezen žádný souhrn 1. kola")

    rocniky, zdroje, rozdeleni_podilu = {}, {}, {}
    for rok in roky:
        soubor = a.zdroj_dir / f"PZ{rok}_kolo1_skolobory_vysledky.xlsx"
        rocniky[rok] = nacti_rocnik(soubor, rok)
        rozdeleni_podilu[rok] = doplnit_kohorty(rocniky[rok])
        # Pojistka proti tichému výpadku: sloupec se čte přes .get(), takže jeho přejmenování
        # v dalším ročníku by nespadlo — jen by všechny nabídky dostaly smo16 = None a maturitní
        # karta na stránce oboru by zmizela beze stopy.
        bez_smo16 = [k for k, v in rocniky[rok].items() if not v.get("smo16")]
        if bez_smo16:
            raise ValueError(
                f"{soubor.name}: {len(bez_smo16)} nabídek nemá skupinu oborů (SMO16); "
                f"zkontroluj sloupec „SKUPINA OBORŮ (16)“, například {bez_smo16[0]}")
        zdroje[str(rok)] = {
            "soubor": soubor.name, "url": ZDROJ_URL + soubor.name,
            "sha256": hashlib.sha256(soubor.read_bytes()).hexdigest(), "nabidek": len(rocniky[rok]),
        }

    # Klíčem výstupu je nejnovější výskyt nabídky; starší ročníky se k němu připojí párováním.
    nabidky: dict[str, dict] = {}
    doklad_parovani = {}
    for i, rok in enumerate(roky):
        for k, v in rocniky[rok].items():
            nabidky.setdefault(k, {})[str(rok)] = v
        if i == 0:
            continue
        predchozi = roky[i - 1]
        pary = paruj(rocniky[predchozi], rocniky[rok], nacti_mapu(rok, a.mapy_dir))
        zpusoby = Counter(z for _, z in pary.values())
        doklad_parovani[f"{predchozi}-{rok}"] = {
            "nabidek_novy_rocnik": len(rocniky[rok]),
            "sparovano": len(pary), **dict(zpusoby),
            "bez_predchoziho_rocniku": len(rocniky[rok]) - len(pary),
        }
        for novy_klic, (stary_klic, zpusob) in pary.items():
            if stary_klic != novy_klic and stary_klic in nabidky:
                # Starý klíč v novém ročníku není, celá jeho historie se přesune pod klíč novější nabídky.
                stary = nabidky.pop(stary_klic)
                parovani = {**stary.pop("parovani", {}), **nabidky[novy_klic].get("parovani", {})}
                nabidky[novy_klic].update({r: z for r, z in stary.items() if r not in nabidky[novy_klic]})
                if parovani:
                    nabidky[novy_klic]["parovani"] = parovani
            nabidky[novy_klic].setdefault("parovani", {})[f"{predchozi}-{rok}"] = zpusob

    # Srovnatelná skupina = typ školy a délka studia (slovník, oddíl 4); rozdělení se počítá z každého ročníku zvlášť.
    skupiny: dict[str, dict] = {}
    for rok in roky:
        podle = defaultdict(list)
        for v in rocniky[rok].values():
            if v["tlak_prvnich_voleb"] is not None:
                podle[v["skupina"]].append(v["tlak_prvnich_voleb"])
        skupiny[str(rok)] = {s: {"n": len(h), "tlak_prvnich_voleb": sorted(h),
                                 "podil_prvnich_voleb": rozdeleni_podilu[rok].get(s, [])}
                             for s, h in sorted(podle.items())}

    # Doklady ke slovníku: jak se ukazatele mění mezi ročníky u spárovaných nabídek.
    stabilita = {}
    for i, rok in enumerate(roky[1:], start=1):
        predchozi = str(roky[i - 1])
        klic = f"{predchozi}-{rok}"
        zmeny = defaultdict(list)
        for v in nabidky.values():
            a_, b_ = v.get(predchozi), v.get(str(rok))
            if not a_ or not b_ or klic not in v.get("parovani", {}):
                continue
            for pole in ("kapacita", "index_poptavky", "tlak_prvnich_voleb", "cj_ma_prijati", "prumerne_umisteni_prijatych"):
                if a_[pole] is not None and b_[pole] is not None:
                    zmeny[pole].append(b_[pole] - a_[pole])
            if a_["prihlasky"] and b_["prihlasky"]:
                zmeny["podil_prvnich_voleb_pb"].append(
                    100 * (b_["prihlasky_priority"][0] / b_["prihlasky"] - a_["prihlasky_priority"][0] / a_["prihlasky"]))
        stabilita[klic] = {p: {"n": len(h), "ctvrtiny_zmeny": ctvrtiny(h)} for p, h in zmeny.items()}

    # Identifikace nabídky je u každé nabídky jednou, ne v každém ročníku.
    kompaktni = {}
    for k, v in sorted(nabidky.items()):
        roky_nabidky = sorted(r for r in v if r != "parovani")
        posledni = v[roky_nabidky[-1]]
        kompaktni[k] = {
            "redizo": posledni["redizo"], "kkov": posledni["kkov"], "zamereni": posledni["zamereni"],
            "skupina": posledni["skupina"], "smo16": posledni.get("smo16"),
            "kraj": posledni["kraj"], "kraj_nazev": posledni["kraj_nazev"],
            **({"parovani": v["parovani"]} if "parovani" in v else {}),
            # smo16 je vlastnost nabídky, ne ročníku; drží se nahoře jako skupina.
            "roky": {r: {x: y for x, y in v[r].items() if x not in ("redizo", "kkov", "zamereni", "kraj", "kraj_nazev", "smo16") and y is not None}
                     | ({"skupina": v[r]["skupina"]} if v[r]["skupina"] != posledni["skupina"] else {})
                     for r in roky_nabidky},
        }
        for r in roky_nabidky:
            if kompaktni[k]["roky"][r].get("skupina") == posledni["skupina"]:
                kompaktni[k]["roky"][r].pop("skupina")

    vystup = {
        "meta": {
            "popis": "Souhrny 1. kola za obory po ročnících. Klíč nabídky REDIZO_KKOV_zaměření podle nejnovějšího ročníku. Chybějící pole v ročníku znamená, že údaj zdroj nenese, ne nulu.",
            "generator": "scripts/build-souhrny-kolo1.py",
            "populace": "denní nezkrácené studium s povinnou jednotnou zkouškou a kladnou kapacitou",
            "skupina": "typ školy a délka studia, slovník ukazatelů oddíl 4",
            "skala": "cj_ma_prijati: procentní skór CERMAT / 2, 0–100; umístění v percentilech celé země 0–100",
            "rocniky": zdroje,
            "parovani": doklad_parovani,
        },
        "skupiny": skupiny,
        "nabidky": kompaktni,
    }
    doklad = {"zdroj_skriptu": "scripts/build-souhrny-kolo1.py", "rocniky": zdroje, "parovani": doklad_parovani,
              "stabilita": stabilita, "shoda_s_jinymi_zdroji": shoda_s_jinymi_zdroji(rocniky),
              "podil_prijatych_ze_soutezicich": doklad_podilu(rocniky, nabidky, roky),
              "kohorta_pozice": doklad_kohort(rocniky, nabidky, roky)}

    text = json.dumps(vystup, ensure_ascii=False, separators=(",", ":"), allow_nan=False) + "\n"
    a.vystup.write_text(text, encoding="utf-8")
    a.doklad.parent.mkdir(parents=True, exist_ok=True)
    a.doklad.write_text(json.dumps(doklad, ensure_ascii=False, indent=1, allow_nan=False) + "\n", encoding="utf-8")
    print(json.dumps({"roky": roky, "nabidek": len(nabidky), "parovani": doklad_parovani}, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
