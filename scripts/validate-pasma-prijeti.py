#!/usr/bin/env python3
"""Doklady k tezím 1 a 3 (docs/teze-vyuziti-dat-jpz-2027.md).

Každé číslo, které dokument uvádí jako doklad, vzniká tady, a to nad
commitnutými daty. Populace jsou pojmenované v klíčích výstupu, aby šlo
rozdíly mezi variantami dohledat.

    python3 scripts/validate-pasma-prijeti.py

Výstup: docs/podklady/overeni-pasem-prijeti-2024-2025.json
"""
from __future__ import annotations

import bisect
import collections
import csv
import importlib.util
import json
import statistics
from pathlib import Path

import openpyxl

KOREN = Path(__file__).resolve().parent.parent
VYSTUP = KOREN / "docs" / "podklady" / "overeni-pasem-prijeti-2024-2025.json"

# Sdílené funkce generátoru, aby doklad počítal totéž co data na webu.
_spec = importlib.util.spec_from_file_location("gen", KOREN / "scripts" / "build-pasma-prijeti.py")
gen = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(gen)


def korelace(x: list[float], y: list[float]) -> float:
    mx, my = statistics.mean(x), statistics.mean(y)
    cit = sum((a - mx) * (b - my) for a, b in zip(x, y))
    return cit / ((sum((a - mx) ** 2 for a in x) * sum((b - my) ** 2 for b in y)) ** 0.5)


def podil(n: int, z: int) -> float:
    return round(n / z * 100, 1) if z else 0.0


def stabilita(x: list[float], y: list[float]) -> dict:
    zmena = [abs(a - b) for a, b in zip(x, y)]
    return {
        "n": len(x),
        "korelace": round(korelace(x, y), 3),
        "median_abs_zmeny": round(statistics.median(zmena), 2),
        "podil_zmena_nad_10_pct": podil(sum(1 for z in zmena if z > 10), len(zmena)),
        "podil_zmena_nad_20_pct": podil(sum(1 for z in zmena if z > 20), len(zmena)),
    }


def mapa_izo_redizo() -> dict[str, str]:
    """IZO → REDIZO z exportu rejstříku škol; pokrývá i školy zaniklé do roku 2026."""
    soubor = KOREN / "data" / "Rejstrik_skol" / "SkolyAMista.csv"
    with open(soubor, encoding="utf-8-sig") as f:
        oddelovac = ";" if ";" in f.readline() else ","
    with open(soubor, encoding="utf-8-sig") as f:
        r = csv.reader(f, delimiter=oddelovac)
        h = next(r)
        i_izo, i_red = h.index("IZO"), h.index("RED_IZO")
        return {row[i_izo].lstrip("0"): row[i_red] for row in r if row[i_izo]}


def nacti_2024(mapa: dict[str, str]) -> tuple[dict, list[float], int, int]:
    """Soubor 2024 má jiné schéma: klíčem je IZO, přijetí je text True/False."""
    wb = openpyxl.load_workbook(KOREN / "data" / "PZ2024_kolo1_uchazeci_prihlasky_vysledky.xlsx", read_only=True)
    it = wb["fyzicke_osoby"].iter_rows(values_only=True)
    ix = {n: i for i, n in enumerate(next(it))}
    obory = collections.defaultdict(lambda: {"prijati": [], "nevesli_se": []})
    izo_vse, izo_chybi = set(), set()
    uchazeci: list[float] = []
    for r in it:
        v = r[ix["celkem_%"]]
        if not isinstance(v, (int, float)):
            continue
        body = float(v) / 2
        uchazeci.append(body)
        for k in range(1, 6):
            izo = r[ix[f"SŠ{k}_izo"]]
            if not izo:
                continue
            izo = str(izo).lstrip("0")
            izo_vse.add(izo)
            red = mapa.get(izo)
            if not red:
                izo_chybi.add(izo)
                continue
            o = obory[f"{red}_{r[ix[f'SŠ{k}_kód_oboru']]}"]
            if r[ix[f"SŠ{k}_přijat"]] == "True":
                o["prijati"].append(body)
            elif r[ix[f"SŠ{k}_důvod_nepřijetí"]] == "pro_nedostacujici_kapacitu":
                o["nevesli_se"].append(body)
    return dict(obory), sorted(uchazeci), len(izo_vse), len(izo_chybi)


def main() -> None:
    # Populace všech dokladů: obory s povinnou jednotnou zkouškou, stejně jako data na webu.
    jpz = gen.povinna_jpz()
    _o25, u25 = gen.nacti_uchazece()
    o25 = {k: v for k, v in _o25.items() if gen.ma_jpz(k, jpz)}
    pasma = json.load(open(KOREN / "public" / "pasma_prijeti_2025.json", encoding="utf-8"))["data"]
    nabidky = json.load(open(KOREN / "public" / "applications_2026.json", encoding="utf-8"))["data"]
    katalog = json.load(open(KOREN / "public" / "schools_data.json", encoding="utf-8"))
    mapa = mapa_izo_redizo()
    o24, u24, izo_vse, izo_chybi = nacti_2024(mapa)
    o24 = {k: v for k, v in o24.items() if gen.ma_jpz(k, jpz)}
    doklad: dict = {
        "zdroj_skriptu": "scripts/validate-pasma-prijeti.py",
        "populace": "obory s povinnou jednotnou zkouškou podle PZ2026_kolo1_skolobory_prihlasky.xlsx, záloha kategorie K, L, M",
    }

    # --- pásmo nejistoty, populace: obory s hranicí v JSON
    s_hranici = [v for v in pasma.values() if "pasmo_nejistoty" in v]
    doklad["pasmo_nejistoty_populace_obory_s_hranici"] = {
        "n": len(s_hranici),
        "shodne_meze_pct": podil(sum(1 for v in s_hranici if v["pasmo_nejistoty"][0] == v["pasmo_nejistoty"][1]), len(s_hranici)),
        "horni_nad_dolni_pct": podil(sum(1 for v in s_hranici if v["pasmo_nejistoty"][1] > v["pasmo_nejistoty"][0]), len(s_hranici)),
        "mezera_pct": podil(sum(1 for v in s_hranici if v["pasmo_nejistoty"][1] < v["pasmo_nejistoty"][0]), len(s_hranici)),
        "median_v_pasmu_pct": round(statistics.median(v["v_pasmu_nejistoty"] for v in s_hranici) * 100, 1),
        "median_hustota_u_hranice_pct": round(statistics.median(v["hustota_u_hranice"] for v in s_hranici) * 100, 1),
    }

    # --- rozhodl test, hodnoty zaokrouhlené na tři desetiny jako v JSON
    rt = [v["rozhodl_test"] for v in s_hranici]
    skup = collections.defaultdict(list)
    for v in s_hranici:
        klic = "talentova" if v["talentova_zkouska"] else "vice_zamereni" if v["vice_zamereni"] else "ostatni"
        skup[klic].append(v["rozhodl_test"])
    doklad["rozhodl_test_populace_obory_s_hranici"] = {
        "n": len(rt),
        "median": round(statistics.median(rt), 3),
        "rovno_1_pct": podil(sum(1 for x in rt if x >= 1.0), len(rt)),
        "aspon_0_95_pct": podil(sum(1 for x in rt if x >= 0.95), len(rt)),
        "aspon_0_85_pct": podil(sum(1 for x in rt if x >= 0.85), len(rt)),
        "pod_0_70_pct": podil(sum(1 for x in rt if x < 0.70), len(rt)),
        "median_podle_skupiny": {k: {"n": len(v), "median": round(statistics.median(v), 3)} for k, v in skup.items()},
    }

    # --- rozhodl test podle skupiny oborů (prvních pět znaků KKOV), kandidáti na talentový příznak
    podle_kkov = collections.defaultdict(list)
    for klic, v in pasma.items():
        if "rozhodl_test" in v:
            podle_kkov[klic.split("_")[1][:5]].append(v["rozhodl_test"])
    doklad["rozhodl_test_nejnizsi_skupiny_kkov"] = sorted(
        ({"kkov": k, "n": len(v), "median": round(statistics.median(v), 3)} for k, v in podle_kkov.items() if len(v) >= 5),
        key=lambda x: x["median"])[:8]

    # --- stabilita mezi ročníky
    doklad["prevod_izo_2024"] = {"izo_celkem": izo_vse, "neprevedeno": izo_chybi, "zdroj": "data/Rejstrik_skol/SkolyAMista.csv"}
    par10 = [k for k in o24 if k in o25 and len(o24[k]["prijati"]) >= 10 and len(o25[k]["prijati"]) >= 10]
    lo24 = [min(o24[k]["prijati"]) for k in par10]
    lo25 = [min(o25[k]["prijati"]) for k in par10]
    posun = [b - a for a, b in zip(lo24, lo25)]
    doklad["dolni_mez_populace_aspon_10_prijatych_v_obou_letech"] = {
        **stabilita(lo24, lo25),
        "prumer_posunu": round(statistics.mean(posun), 2),
        "median_posunu": round(statistics.median(posun), 2),
        "posun_dolu_pct": podil(sum(1 for x in posun if x < 0), len(posun)),
        "posun_nahoru_pct": podil(sum(1 for x in posun if x > 0), len(posun)),
    }
    # Rozdělení jednotlivých uchazečů, každý jednou, stejně jako v generátoru.
    r24, r25 = u24, u25
    pct = lambda r, x: bisect.bisect_right(r, x) / len(r) * 100
    p24 = [pct(r24, x) for x in lo24]
    p25 = [pct(r25, x) for x in lo25]
    doklad["dolni_mez_jako_percentil"] = {
        **stabilita(p24, p25),
        "median_posunu_pb": round(statistics.median(b - a for a, b in zip(p24, p25)), 2),
    }
    doklad["celostatni_median_uchazecu"] = {"2024": statistics.median(r24), "2025": statistics.median(r25)}

    par_hr = [k for k in par10 if len(o24[k]["nevesli_se"]) >= 5 and len(o25[k]["nevesli_se"]) >= 5]
    f_lo = lambda o: min(o["prijati"])
    f_hi = lambda o: max(o["nevesli_se"])
    f_sir = lambda o: max(o["nevesli_se"]) - min(o["prijati"])
    doklad["meze_populace_aspon_10_prijatych_a_5_odmitnutych_v_obou_letech"] = {
        "dolni_mez": stabilita([f_lo(o24[k]) for k in par_hr], [f_lo(o25[k]) for k in par_hr]),
        "horni_mez": stabilita([f_hi(o24[k]) for k in par_hr], [f_hi(o25[k]) for k in par_hr]),
        "sirka_pasma": stabilita([f_sir(o24[k]) for k in par_hr], [f_sir(o25[k]) for k in par_hr]),
        "median_sirky_2025": statistics.median(f_sir(o25[k]) for k in par_hr),
        "rozhodl_test": stabilita(
            [gen.rozhodl_test(o24[k]["prijati"], o24[k]["nevesli_se"]) for k in par_hr],
            [gen.rozhodl_test(o25[k]["prijati"], o25[k]["nevesli_se"]) for k in par_hr]),
    }

    # --- O4: skupina, která nastoupila jinam
    s_jinam = [k for k, o in o25.items() if len(o["prijati"]) >= 10 and len(o["jinam"]) >= 10]
    rozdil = [statistics.mean(o25[k]["jinam"]) - statistics.mean(o25[k]["prijati"] + o25[k]["nevesli_se"]) for k in s_jinam]
    doklad["nastoupili_jinam_populace_aspon_10_prijatych_a_10_jinam"] = {
        "n": len(rozdil),
        "median_rozdilu_prumeru": round(statistics.median(rozdil), 2),
        "kladny_rozdil_pct": podil(sum(1 for x in rozdil if x > 0), len(rozdil)),
    }

    # --- pokrytí, populace: nabídky v public/applications_2026.json
    stavy = collections.Counter()
    for z in nabidky:
        v = pasma.get(f"{z['redizo']}_{z['kkov']}")
        if not v:
            stavy["bez_dat_2025"] += 1
        elif "pasma" in v and "rozhodl_test" in v:
            stavy["pasma_i_veta"] += 1
        elif "pasma" in v:
            stavy["jen_pasma"] += 1
        elif "rozhodl_test" in v:
            stavy["jen_veta"] += 1
        elif v.get("nikdo_neodmitnut_pro_kapacitu"):
            stavy["nikdo_neodmitnut_pro_kapacitu"] += 1
        else:
            stavy["jen_dilci_udaje"] += 1
    klice = collections.Counter(f"{z['redizo']}_{z['kkov']}" for z in nabidky)
    doklad["pokryti_populace_nabidky_applications_2026"] = {
        "n": len(nabidky),
        "stavy": dict(stavy),
        "sdili_klic_s_jinou_nabidkou": sum(v for v in klice.values() if v > 1),
        "klicu_s_vice_nabidkami": sum(1 for v in klice.values() if v > 1),
        "is_new_s_pasmy": sum(1 for z in nabidky if z.get("is_new") and "pasma" in pasma.get(f"{z['redizo']}_{z['kkov']}", {})),
        "is_new": sum(1 for z in nabidky if z.get("is_new")),
    }

    # --- P3: obory, kde by tabulka vyšla celá na 100 %
    bez_odm = [o for o in o25.values() if len(o["prijati"]) + len(o["nevesli_se"]) >= gen.MIN_SOUTEZICICH and not o["nevesli_se"]]
    doklad["tabulka_by_byla_cela_100_pct"] = {
        "n": len(bez_odm),
        "z_toho_nekdo_nesplnil_podminky": sum(1 for o in bez_odm if o["nesplnili"]),
    }

    # --- P8: cena vyššího prahu
    def pokryti_prahu(prah: int) -> dict:
        ok = [z for z in nabidky if (v := pasma.get(f"{z['redizo']}_{z['kkov']}")) and "pasma" in v and v["soutezicich"] >= prah]
        sirky = [max(p["do"] - p["od"] for p in v["pasma"]) for v in pasma.values() if "pasma" in v and v["soutezicich"] >= prah]
        return {"nabidek_2026": len(ok), "median_nejsirsiho_pasma": statistics.median(sirky)}
    doklad["prah_soutezicich"] = {"30": pokryti_prahu(30), "50": pokryti_prahu(50)}

    # --- P7: kohorty přijatých, populace: jedinečné id v katalogu 2025
    unik = {z["id"]: z for z in katalog["2025"] if z.get("cohorts")}
    mat = [(c[0] + c[3] + c[6]) / sum(c) for z in unik.values() if sum(c := z["cohorts"]) >= 20]
    doklad["kohorty_prijatych_populace_id_katalog_2025"] = {
        "oboru_s_kohortami": len(unik),
        "s_aspon_20_prijatymi": len(mat),
        "median_podilu_matematickych_pct": round(statistics.median(mat) * 100, 1),
        "rozsah_pct": [round(min(mat) * 100, 1), round(max(mat) * 100, 1)],
    }

    # --- teze 4: srovnání řádných termínů na týchž uchazečích, matematika pro šestiletá gymnázia 2025
    wb = openpyxl.load_workbook(KOREN / "data" / "JPZ2025_M6_polozkova_data.xlsx", read_only=True)
    termin: dict[str, dict] = {}
    for list_ in ("M6-A", "M6-B"):
        it = wb[list_].iter_rows(values_only=True)
        ix = {n: i for i, n in enumerate(next(it))}
        body: dict = {}
        for r in it:
            try:
                body[r[ix["id_ss"]]] = float(r[ix["dt_body"]])
            except (TypeError, ValueError):
                pass
        termin[list_] = body
    spolecni = set(termin["M6-A"]) & set(termin["M6-B"])
    roz = [termin["M6-B"][i] - termin["M6-A"][i] for i in spolecni]
    doklad["teze4_terminy_M6_2025_populace_psali_oba_radne_terminy"] = {
        "psali_A": len(termin["M6-A"]),
        "psali_oba_pct_z_A": podil(len(spolecni), len(termin["M6-A"])),
        "n_paru": len(roz),
        "prumer_B_minus_A": round(statistics.mean(roz), 2),
        "median_B_minus_A": statistics.median(roz),
        "lepsi_v_A_pct": podil(sum(1 for x in roz if x < 0), len(roz)),
        "lepsi_v_B_pct": podil(sum(1 for x in roz if x > 0), len(roz)),
    }

    VYSTUP.write_text(json.dumps(doklad, ensure_ascii=False, indent=1), encoding="utf-8")
    print(json.dumps(doklad, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
