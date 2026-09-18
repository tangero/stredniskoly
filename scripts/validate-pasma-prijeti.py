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
import importlib.util
import json
import statistics
from pathlib import Path

import openpyxl

KOREN = Path(__file__).resolve().parent.parent
VYSTUP = KOREN / "docs" / "podklady" / "overeni-pasem-prijeti-2024-2025.json"
# Doklad srovnává pevně roky 2024 a 2025, proto roky nebere z registru. Po přepnutí webu na 2026
# zůstává soubor 2025 pro tuto validaci a srovnání 2025–2026 vyžaduje vlastní doklad.
UCHAZECI_2025 = KOREN / "data" / "PZ2025_kolo1_uchazeci_prihlasky_vysledky.xlsx"
PASMA_2025 = KOREN / "public" / "pasma_prijeti_2025.json"

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


def soubor_uchazecu(rok: int) -> Path:
    """Cesta k datům uchazečů daného ročníku v `data/`."""
    return KOREN / "data" / f"PZ{rok}_kolo1_uchazeci_prihlasky_vysledky.xlsx"


def nacti_rocnik(rok: int, zdroj: Path | None = None) -> tuple[dict, list[float]]:
    """Načte data uchazečů jednoho ročníku funkcí generátoru.

    Soubory 2024 až 2026 mají od revize z 20. 5. 2026 shodné schéma (klíč REDIZO,
    list „Sheet 1“), čte je tedy tatáž funkce. Do předchozí revize (klíč IZO,
    přijetí textem True/False) sahal převod přes data/Rejstrik_skol/SkolyAMista.csv;
    upstream soubor přepsal, takže převod odpadá.

    Args:
        rok: Ročník 1. kola.
        zdroj: Nepovinná cesta k souboru; výchozí je `data/PZ{rok}_kolo1_…xlsx`.

    Returns:
        Dvojice (obory, rozdělení výsledků všech uchazečů).
    """
    gen.ZDROJ = zdroj or soubor_uchazecu(rok)
    return gen.nacti_uchazece()


def stabilita_rocniku(stary: int, novy: int, jpz, zdroj_stary: Path | None = None,
                      zdroj_novy: Path | None = None) -> dict:
    """Srovnání dvou ročníků: dolní mez, její percentil, šířka pásma a *rozhodl test*.

    Tohle je jediné místo, kde se stabilita mezi ročníky počítá. Doklad
    2024–2025 i doklad k přepnutí na nový ročník ji berou odtud, aby nevznikly
    dvě definice téhož, jako se to stalo u obtížnosti přijetí.

    Args:
        stary: Starší ročník.
        novy: Novější ročník.
        jpz: Množina oborů s povinnou jednotnou zkouškou z generátoru.
        zdroj_stary: Nepovinná cesta k souboru staršího ročníku.
        zdroj_novy: Nepovinná cesta k souboru novějšího ročníku.

    Returns:
        Doklad se čtyřmi bloky a s pojmenovanými populacemi.
    """
    o_s, u_s = nacti_rocnik(stary, zdroj_stary)
    o_n, u_n = nacti_rocnik(novy, zdroj_novy)
    o_s = {k: v for k, v in o_s.items() if gen.ma_jpz(k, jpz)}
    o_n = {k: v for k, v in o_n.items() if gen.ma_jpz(k, jpz)}

    par10 = [k for k in o_s if k in o_n and len(o_s[k]["prijati"]) >= 10 and len(o_n[k]["prijati"]) >= 10]
    lo_s = [min(o_s[k]["prijati"]) for k in par10]
    lo_n = [min(o_n[k]["prijati"]) for k in par10]
    posun = [b - a for a, b in zip(lo_s, lo_n)]

    pct = lambda r, x: bisect.bisect_right(r, x) / len(r) * 100
    p_s = [pct(u_s, x) for x in lo_s]
    p_n = [pct(u_n, x) for x in lo_n]

    par_hr = [k for k in par10 if len(o_s[k]["nevesli_se"]) >= 5 and len(o_n[k]["nevesli_se"]) >= 5]
    f_lo = lambda o: min(o["prijati"])
    f_hi = lambda o: max(o["nevesli_se"])
    f_sir = lambda o: max(o["nevesli_se"]) - min(o["prijati"])

    return {
        "dolni_mez_populace_aspon_10_prijatych_v_obou_letech": {
            **stabilita(lo_s, lo_n),
            "prumer_posunu": round(statistics.mean(posun), 2),
            "median_posunu": round(statistics.median(posun), 2),
            "posun_dolu_pct": podil(sum(1 for x in posun if x < 0), len(posun)),
            "posun_nahoru_pct": podil(sum(1 for x in posun if x > 0), len(posun)),
        },
        "dolni_mez_jako_percentil": {
            **stabilita(p_s, p_n),
            "median_posunu_pb": round(statistics.median(b - a for a, b in zip(p_s, p_n)), 2),
        },
        "celostatni_median_uchazecu": {str(stary): statistics.median(u_s), str(novy): statistics.median(u_n)},
        "meze_populace_aspon_10_prijatych_a_5_odmitnutych_v_obou_letech": {
            "dolni_mez": stabilita([f_lo(o_s[k]) for k in par_hr], [f_lo(o_n[k]) for k in par_hr]),
            "horni_mez": stabilita([f_hi(o_s[k]) for k in par_hr], [f_hi(o_n[k]) for k in par_hr]),
            "sirka_pasma": stabilita([f_sir(o_s[k]) for k in par_hr], [f_sir(o_n[k]) for k in par_hr]),
            f"median_sirky_{novy}": statistics.median(f_sir(o_n[k]) for k in par_hr),
            "rozhodl_test": stabilita(
                [gen.rozhodl_test(o_s[k]["prijati"], o_s[k]["nevesli_se"]) for k in par_hr],
                [gen.rozhodl_test(o_n[k]["prijati"], o_n[k]["nevesli_se"]) for k in par_hr]),
        },
    }


def over_shodu_verzi(o25: dict, pasma: dict) -> None:
    """Pásma v public/ a data uchazečů musí pocházet z téže verze zdroje.

    Jinak doklad potichu smíchá revize: v září 2026 četla validace předběžná
    data uchazečů 2025 k pásmům z finální revize a stabilita vyšla 0,673 místo 0,725.
    """
    def pocty(k: str) -> tuple[int, int]:
        o = o25.get(k, {"prijati": [], "nevesli_se": []})
        return len(o["prijati"]), len(o["prijati"]) + len(o["nevesli_se"])
    rozdil = [k for k, v in pasma.items() if pocty(k) != (v["prijatych"], v["soutezicich"])]
    if rozdil:
        k = rozdil[0]
        raise SystemExit(
            f"Data uchazečů ({UCHAZECI_2025}) a {PASMA_2025.name} jsou z různých verzí zdroje: "
            f"počty přijatých nebo soutěžících nesedí u {len(rozdil)} z {len(pasma)} oborů, "
            f"např. {k}: soubor uchazečů {pocty(k)}, pásma {(pasma[k]['prijatych'], pasma[k]['soutezicich'])}. "
            "Předej správný soubor přes --uchazeci-2025."
        )


def main() -> None:
    # Populace všech dokladů: obory s povinnou jednotnou zkouškou, stejně jako data na webu.
    jpz = gen.povinna_jpz()
    gen.ZDROJ = UCHAZECI_2025
    _o25, u25 = gen.nacti_uchazece()
    o25 = {k: v for k, v in _o25.items() if gen.ma_jpz(k, jpz)}
    pasma = json.load(open(PASMA_2025, encoding="utf-8"))["data"]
    over_shodu_verzi(_o25, pasma)
    nabidky = json.load(open(KOREN / "public" / "applications_2026.json", encoding="utf-8"))["data"]
    katalog = json.load(open(KOREN / "public" / "schools_data.json", encoding="utf-8"))
    doklad: dict = {
        "zdroj_skriptu": "scripts/validate-pasma-prijeti.py",
        "populace": ("obory s povinnou jednotnou zkouškou podle PZ2026_kolo1_skolobory_prihlasky.xlsx"
                     if jpz else
                     "obory s povinnou jednotnou zkouškou, záložní určení podle kategorie K, L, M "
                     "(chybí PZ2026_kolo1_skolobory_prihlasky.xlsx)"),
        "schema_2024": "od revize z 20. 5. 2026 má soubor 2024 schéma roku 2025 (REDIZO), převod IZO odpadá",
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

    # --- stabilita mezi ročníky; tentýž výpočet použije i doklad k přepnutí ročníku
    doklad.update(stabilita_rocniku(2024, 2025, jpz, zdroj_novy=UCHAZECI_2025))

    # --- O4: skupina přijatá na vyšší prioritu
    s_vp = [k for k, o in o25.items() if len(o["prijati"]) >= 10 and len(o["vyssi_priorita"]) >= 10]
    rozdil = [statistics.mean(o25[k]["vyssi_priorita"]) - statistics.mean(o25[k]["prijati"] + o25[k]["nevesli_se"]) for k in s_vp]
    doklad["prijati_na_vyssi_prioritu_populace_aspon_10_prijatych_a_10_takovych"] = {
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
    # Věta „nikdo se nevešel kvůli kapacitě" v tezi 1, populace: obory s aspoň jedním přijatým
    nikdo = [o for o in o25.values() if o["prijati"] and not o["nevesli_se"]]
    doklad["nikdo_neodmitnut_pro_kapacitu_populace_obory_s_prijatymi"] = {
        "n": len(nikdo),
        "z_toho_nekdo_nesplnil_podminky": sum(1 for o in nikdo if o["nesplnili"]),
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


def doklad_prepnuti(stary: int, novy: int) -> None:
    """Doklad stability pro přepnutí sady na nový ročník.

    Počítá jen srovnání dvou ročníků, ne doklady tezí navázané na rok 2025.
    Výstup: `docs/podklady/overeni-pasem-prijeti-{stary}-{novy}.json`.
    """
    vystup = KOREN / "docs" / "podklady" / f"overeni-pasem-prijeti-{stary}-{novy}.json"
    doklad = {
        "zdroj_skriptu": "scripts/validate-pasma-prijeti.py --rocniky",
        "populace": "obory s povinnou jednotnou zkouškou, stejně jako data na webu",
        "rocniky": [stary, novy],
        "soubory": {str(r): soubor_uchazecu(r).name for r in (stary, novy)},
        **stabilita_rocniku(stary, novy, gen.povinna_jpz()),
    }
    vystup.write_text(json.dumps(doklad, ensure_ascii=False, indent=1), encoding="utf-8")
    print(json.dumps(doklad, ensure_ascii=False, indent=1))
    print(f"\nDoklad: {vystup.relative_to(KOREN)}")


if __name__ == "__main__":
    import argparse
    ap = argparse.ArgumentParser(description="Doklady pásem přijetí; výchozí srovnání let 2024 a 2025.")
    ap.add_argument("--uchazeci-2025", type=Path, default=UCHAZECI_2025,
                    help="data uchazečů 2025; po revizi CERMATu soubor z data/linka/prace/<KÓD>/, jinak doklad smíchá verze")
    ap.add_argument("--rocniky", metavar="STARY-NOVY",
                    help="spočítá jen stabilitu mezi dvěma ročníky, například 2025-2026; "
                         "slouží jako doklad k přepnutí období sady cermat-uchazeci-kolo1")
    a = ap.parse_args()
    if a.rocniky:
        doklad_prepnuti(*(int(x) for x in a.rocniky.split("-", 1)))
    else:
        UCHAZECI_2025 = a.uchazeci_2025
        main()
