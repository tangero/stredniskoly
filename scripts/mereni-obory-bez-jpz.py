#!/usr/bin/env python3
"""Měření pokrytí oborů bez jednotné zkoušky a nedenních forem (issue #209, #244).

Čte pouze místní soubory, na síť se nedotazuje. Výstupem je doklad
`docs/podklady/mereni-obory-bez-jpz-2026.json` a souhrn na stdout.

Použití:
    python3 scripts/mereni-obory-bez-jpz.py
"""

from __future__ import annotations

import contextlib
import importlib.util
import io
import json
import random
import re
from collections import Counter
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parent.parent
AGREGATY = ROOT / "data/PZ2026_kolo1_skolobory_vysledky.xlsx"
AGREGATY_2025 = ROOT / "data/PZ2025_kolo1_skolobory_vysledky.xlsx"
UCHAZECI = ROOT / "data/PZ2026_kolo1_uchazeci_prihlasky_vysledky.xlsx"
REJSTRIK = ROOT / "data/msmt_rejstrik/rssz-2026-06-30.jsonld"
KATALOG = ROOT / "public/schools_data.json"
KRITERIA = ROOT / "public/kriteria_prijeti_2026.json"
DOKLAD = ROOT / "docs/podklady/mereni-obory-bez-jpz-2026.json"

DRUHY_SS = {"C00", "D00"}
VZOREK_SEED = 209
VZOREK_N = 30
HLASENE_SKOLY = ("600006832", "600014231", "600170233")

KKOV_KAT = re.compile(r"^\d{2}-\d{2}-([A-Z])/\d{2}$")
NASTAVBA = re.compile(r"-L/5\d$")
# Číselník forem rejstříku, viz scripts/enrich-continuity-registry.py.
FORMA_REJST = {"10": "denní", "22": "dálková", "23": "večerní", "24": "kombinovaná",
               "30": "distanční"}


def kategorie(kkov: str) -> str:
    m = KKOV_KAT.match((kkov or "").strip())
    return m.group(1) if m else "?"


def nacti_agregaty(soubor: Path = AGREGATY) -> tuple[list[str], list[tuple]]:
    wb = openpyxl.load_workbook(soubor, read_only=True, data_only=True)
    ws = wb["PZ2025_kolo1"] if "PZ2025_kolo1" in wb.sheetnames else wb.active
    it = ws.iter_rows(values_only=True)
    hlavicky = [str(h) if h else "" for h in next(it)]
    radky = [r for r in it if r[0] is not None]
    wb.close()
    return hlavicky, radky


def mer_agregaty() -> dict:
    hlavicky, radky = nacti_agregaty()
    i = {h: n for n, h in enumerate(hlavicky)}
    assert len(hlavicky) == 91, f"cekano 91 sloupcu, je {len(hlavicky)}"

    jpz = Counter()
    kriz = Counter()  # (jpz, kategorie, forma, zkracene, maturitni)
    duvod_vyrazeni = Counter()
    proslo_filtrem = 0
    soucty: dict[str, dict[str, float]] = {"s_jpz": Counter(), "bez_jpz": Counter()}
    plneni: dict[str, dict[str, list]] = {"s_jpz": {}, "bez_jpz": {}}

    ikap = i["KAPACITA"]
    ipri = i["PŘIHLÁŠKY CELKEM"]
    ipjt = i["PŘIJATÍ"]

    for r in radky:
        ma_jpz = r[i["POVINNOST JPZ"]] == 1
        jpz["s_jpz" if ma_jpz else "bez_jpz"] += 1
        skupina = "s_jpz" if ma_jpz else "bez_jpz"
        forma = str(r[i["FORMA VZDĚLÁVÁNÍ"]] or "")
        zkr = str(r[i["ZKRÁCENÉ STUDIUM"]] or "")
        mat = str(r[i["MATURITNÍ STATUS"]] or "")
        kat = kategorie(str(r[i["KKOV"]] or ""))
        kriz[(skupina, kat, forma, zkr, mat)] += 1

        # Stejný filtr jako import_cermat_results.is_valid_flat.
        if "den" in forma.lower() and zkr.lower() == "ne" and ma_jpz:
            proslo_filtrem += 1
        else:
            duvody = []
            if "den" not in forma.lower():
                duvody.append("forma")
            if zkr.lower() != "ne":
                duvody.append("zkracene")
            if not ma_jpz:
                duvody.append("bez_jpz")
            duvod_vyrazeni["+".join(duvody)] += 1

        for klic, idx in (("kapacita", ikap), ("prihlasky", ipri), ("prijati", ipjt)):
            v = r[idx]
            if isinstance(v, (int, float)):
                soucty[skupina][klic] += v

    for n, h in enumerate(hlavicky):
        for skupina, chtena in (("s_jpz", 1), ("bez_jpz", 0)):
            plneni[skupina][h] = sum(
                1 for r in radky if (r[i["POVINNOST JPZ"]] == 1) == bool(chtena)
                and r[n] is not None
                and r[n] != ""
            )

    # Rozpad podle kategorie a formy.
    po_kategorii: dict[str, dict[str, int]] = {}
    po_forme: dict[str, dict[str, int]] = {}
    nastaveb = Counter()
    for (skupina, kat, forma, zkr, mat), n in kriz.items():
        po_kategorii.setdefault(kat, Counter())[skupina] += n
        po_forme.setdefault(forma, Counter())[skupina] += n
    for r in radky:
        if NASTAVBA.search(str(r[i["KKOV"]] or "")):
            nastaveb["s_jpz" if r[i["POVINNOST JPZ"]] == 1 else "bez_jpz"] += 1

    # Populace "chybějícího katalogu": denní, nezkrácené, bez JPZ.
    chybejici: dict[str, dict[str, float]] = {}
    for r in radky:
        forma = str(r[i["FORMA VZDĚLÁVÁNÍ"]] or "")
        zkr = str(r[i["ZKRÁCENÉ STUDIUM"]] or "")
        if r[i["POVINNOST JPZ"]] == 1 or "den" not in forma.lower() or zkr.lower() != "ne":
            continue
        kat = kategorie(str(r[i["KKOV"]] or ""))
        s = chybejici.setdefault(kat, Counter())
        s["radku"] += 1
        for klic, idx in (("kapacita", ikap), ("prihlasky", ipri), ("prijati", ipjt)):
            v = r[idx]
            if isinstance(v, (int, float)):
                s[klic] += v

    return {
        "soubor": AGREGATY.name,
        "sloupcu": len(hlavicky),
        "radku_celkem": len(radky),
        "podle_jpz": dict(jpz),
        "po_kategorii": {k: dict(v) for k, v in sorted(po_kategorii.items())},
        "po_forme": {k: dict(v) for k, v in sorted(po_forme.items())},
        "nastavby_L51": dict(nastaveb),
        "chybejici_katalog_denni_nezkr_bez_jpz": {k: dict(v) for k, v in sorted(chybejici.items())},
        "importnim_filtrem_proslo": proslo_filtrem,
        "vyrazeno_duvod": dict(duvod_vyrazeni),
        "soucty": {k: dict(v) for k, v in soucty.items()},
        "plneni_sloupcu": plneni,
    }


def mer_uchazeci() -> dict:
    wb = openpyxl.load_workbook(UCHAZECI, read_only=True, data_only=True)
    ws = wb[wb.sheetnames[0]]
    it = ws.iter_rows(values_only=True)
    hlavicky = [str(h) if h else "" for h in next(it)]
    idx = {h: n for n, h in enumerate(hlavicky)}
    assert len(hlavicky) == 40, f"cekano 40 sloupcu, je {len(hlavicky)}"

    radku = 0
    forma_voleb = Counter()
    voleb = 0
    uchazecu_s_H = 0
    uchazecu_s_nedenni = 0
    uchazecu_bez_vysledku = 0
    for r in it:
        if r[0] is None:
            continue
        radku += 1
        ma_H = False
        ma_nedenni = False
        for s in range(1, 6):
            kkov = r[idx[f"ss{s}_kkov"]]
            if kkov is None or kkov == "":
                continue
            voleb += 1
            forma = str(r[idx[f"ss{s}_forma"]] or "")
            forma_voleb[forma or "(prazdne)"] += 1
            if kategorie(str(kkov)) == "H":
                ma_H = True
            if forma not in ("den", "den2"):
                ma_nedenni = True
        if ma_H:
            uchazecu_s_H += 1
        if ma_nedenni:
            uchazecu_s_nedenni += 1
        if r[idx["c_m_procentni_skor"]] is None:
            uchazecu_bez_vysledku += 1
    wb.close()
    return {
        "soubor": UCHAZECI.name,
        "uchazecu_radku": radku,
        "voleb_celkem": voleb,
        "forma_voleb": dict(forma_voleb),
        "uchazecu_s_oborem_H": uchazecu_s_H,
        "uchazecu_s_nedenni_volbou": uchazecu_s_nedenni,
        "uchazecu_bez_vysledku_JPZ": uchazecu_bez_vysledku,
    }


def nacti_rejstrik() -> dict[str, list[dict]]:
    """Obory středních škol a konzervatoří podle REDIZO. Bez osobních údajů."""
    data = json.loads(REJSTRIK.read_text(encoding="utf-8"))
    skoly: dict[str, list[dict]] = {}
    for zaznam in data["list"]:
        redizo = zaznam.get("redIzo")
        for skola in zaznam.get("skolyAZarizeni") or []:
            if skola.get("druh") not in DRUHY_SS:
                continue
            for obor in skola.get("obory") or []:
                skoly.setdefault(redizo, []).append({
                    "kod": obor.get("kod"),
                    "forma": obor.get("formaVzdelavani"),
                    "delka": obor.get("delkaVzdelavani"),
                    "dobihajici": bool(obor.get("dobihajiciObor")),
                })
    return skoly


def mer_rejstrik(skoly: dict[str, list[dict]]) -> dict:
    kat_forma = Counter()
    formy = Counter()
    dobihajicich = 0
    zaznamu = 0
    for obory in skoly.values():
        for o in obory:
            zaznamu += 1
            kat_forma[(kategorie(o["kod"] or ""), o["forma"])] += 1
            formy[o["forma"]] += 1
            if o["dobihajici"]:
                dobihajicich += 1
    return {
        "snimek": REJSTRIK.name,
        "skol_C00_D00_s_obory": len(skoly),
        "zaznamu_oboru": zaznamu,
        "z_toho_dobihajicich": dobihajicich,
        "hodnoty_formy": dict(formy),
        "po_kategorii_a_forme": [
            {"kategorie": k, "forma": f, "zaznamu": n}
            for (k, f), n in sorted(kat_forma.items(), key=lambda x: (-x[1], str(x[0])))
        ],
    }


def srovnej_skoly(rediza: list[str], skoly_rejstrik: dict, cermat: dict, katalog: dict,
                  podrobne: bool = False) -> dict:
    vysledek = {}
    for redizo in rediza:
        obory_rejstrik = skoly_rejstrik.get(redizo, [])
        radky_cermat = cermat.get(redizo, [])
        nabidky_katalog = katalog.get(redizo, [])
        kody_rejstrik = {o["kod"] for o in obory_rejstrik}
        kody_cermat = {r["kkov"] for r in radky_cermat}
        zaznam: dict = {
            "rejstrik_oboru": len(obory_rejstrik),
            "rejstrik_bez_cermatu": sorted(kody_rejstrik - kody_cermat),
            "cermat_radku": len(radky_cermat),
            "cermat_bez_jpz": sum(1 for r in radky_cermat if not r["jpz"]),
            "cermat_bez_rejstriku": sorted(kody_cermat - kody_rejstrik),
            "katalog_nabidek_2026": len(nabidky_katalog),
        }
        if podrobne:
            zaznam["detail_rejstrik"] = sorted(
                ({"kod": o["kod"],
                  "forma": FORMA_REJST.get(o["forma"], o["forma"]),
                  "delka": o["delka"],
                  "dobihajici": o["dobihajici"]} for o in obory_rejstrik),
                key=lambda o: str(o["kod"]),
            )
            zaznam["detail_cermat"] = sorted(radky_cermat, key=lambda r: r["kkov"])
            zaznam["katalog_id_2026"] = sorted(nabidky_katalog)
        vysledek[redizo] = zaznam
    return vysledek


def mer_srovnani(skoly_rejstrik: dict[str, list[dict]]) -> dict:
    hlavicky, radky = nacti_agregaty()
    i = {h: n for n, h in enumerate(hlavicky)}
    cermat: dict[str, list[dict]] = {}
    for r in radky:
        cermat.setdefault(str(r[i["REDIZO"]]), []).append({
            "kkov": str(r[i["KKOV"]] or ""),
            "nazev": str(r[i["OBOR - NÁZEV"]] or ""),
            "forma": str(r[i["FORMA VZDĚLÁVÁNÍ"]] or ""),
            "jpz": r[i["POVINNOST JPZ"]] == 1,
            "kapacita": r[i["KAPACITA"]],
            "prihlasky": r[i["PŘIHLÁŠKY CELKEM"]],
            "prijati": r[i["PŘIJATÍ"]],
        })
    katalog_raw = json.loads(KATALOG.read_text(encoding="utf-8"))
    katalog: dict[str, list[str]] = {}
    for nabidka in katalog_raw.get("2026", []):
        katalog.setdefault(str(nabidka.get("redizo")), []).append(nabidka.get("id"))

    hlasene = srovnej_skoly(list(HLASENE_SKOLY), skoly_rejstrik, cermat, katalog, podrobne=True)

    kandidati = sorted(set(cermat) & set(skoly_rejstrik))
    random.seed(VZOREK_SEED)
    vzorek = sorted(random.sample(kandidati, min(VZOREK_N, len(kandidati))))
    srovnani_vzorku = srovnej_skoly(vzorek, skoly_rejstrik, cermat, katalog)
    souhrn = Counter()
    for s in srovnani_vzorku.values():
        souhrn["rejstrik_oboru"] += s["rejstrik_oboru"]
        souhrn["rejstrik_bez_cermatu"] += len(s["rejstrik_bez_cermatu"])
        souhrn["cermat_radku"] += s["cermat_radku"]
        souhrn["cermat_bez_jpz"] += s["cermat_bez_jpz"]
        souhrn["cermat_bez_rejstriku"] += len(s["cermat_bez_rejstriku"])
        souhrn["katalog_nabidek_2026"] += s["katalog_nabidek_2026"]

    return {
        "hlasene_skoly": hlasene,
        "vzorek": {
            "seed": VZOREK_SEED,
            "rediza": vzorek,
            "souhrn": dict(souhrn),
            "skoly": srovnani_vzorku,
        },
    }


def mer_dipsy() -> dict:
    """Co o pokrytí DiPSy říkají místní soubory. Karty se nestahují."""
    kriteria = json.loads(KRITERIA.read_text(encoding="utf-8"))
    klice = [k for k in kriteria if k not in ("rok", "kolo")]
    # Nabídky jsou pod klíčem dat (slovník source_id -> přepis), metadata ostatní.
    datove = {k: v for k, v in kriteria.items() if isinstance(v, dict)}
    hlavicky, radky = nacti_agregaty()
    i = {h: n for n, h in enumerate(hlavicky)}
    id_bez_jpz = {str(r[i["ID_SOF"]]) for r in radky if r[i["POVINNOST JPZ"]] != 1}
    pokryte = {sid for sid in id_bez_jpz if any(sid in d for d in datove.values())}
    return {
        "soubor": KRITERIA.name,
        "klice_souboru": sorted(kriteria)[:20],
        "datovych_odilu": len(datove),
        "nabidek_bez_jpz_v_cermatu": len(id_bez_jpz),
        "z_nich_v_prepisu_kriterii": len(pokryte),
        "poznamka": (
            "Místní sběr karet DiPSy (data/dipsy-kriteria-2026/) v tomto "
            "checkoutu není; pokrytí karet u nabídek bez JPZ by vyžadovalo "
            "dotaz na api.dipsy.gov.cz, který je mimo povolený rozsah."
        ),
    }


def je_cislo(v) -> bool:
    return isinstance(v, (int, float))


def mer_obsazenost() -> dict:
    """Obsazenost po 1. kole 2026: součet PŘIJATÍ / součet KAPACITA.

    Jen denní nezkrácené nabídky s číselnou kapacitou, přihláškami a přijatými.
    Metoda oponentury (námitka 2).
    """
    hlavicky, radky = nacti_agregaty()
    i = {h: n for n, h in enumerate(hlavicky)}
    skupiny: dict[str, dict[str, float]] = {}
    for r in radky:
        forma = str(r[i["FORMA VZDĚLÁVÁNÍ"]] or "")
        zkr = str(r[i["ZKRÁCENÉ STUDIUM"]] or "")
        if "den" not in forma.lower() or zkr.lower() != "ne":
            continue
        kap, pri, pjt = r[i["KAPACITA"]], r[i["PŘIHLÁŠKY CELKEM"]], r[i["PŘIJATÍ"]]
        if not (je_cislo(kap) and je_cislo(pri) and je_cislo(pjt)):
            continue
        kat = kategorie(str(r[i["KKOV"]] or ""))
        klic = "se_zkouskou" if r[i["POVINNOST JPZ"]] == 1 else kat
        s = skupiny.setdefault(klic, Counter())
        s["nabidek"] += 1
        s["kapacita"] += kap
        s["prijati"] += pjt
        if pjt < kap:
            s["s_volnymi_misty"] += 1
    return {
        skupina: {
            "nabidek": v["nabidek"],
            "obsazenost": round(v["prijati"] / v["kapacita"], 4) if v["kapacita"] else None,
            "s_volnymi_misty": v["s_volnymi_misty"],
        }
        for skupina, v in sorted(skupiny.items())
    }


def mer_soutezici_prahy() -> dict:
    """Kolik nabídek bez zkoušky je pod prahem 10 soutěžících a v pásmech obtížnosti.

    Soutěžící = PŘIJATÍ + NEPŘIJATI - NEDOSTATEČNÁ KAPACITA (slovník ukazatelů).
    Pásma podle podílu přijatých ze soutěžících: 2/3, 1/2, 1/3.
    Metoda oponentury (námitka 3).
    """
    hlavicky, radky = nacti_agregaty()
    i = {h: n for n, h in enumerate(hlavicky)}
    ined = i["NEPŘIJATI - NEDOSTATEČNÁ KAPACITA"]
    pod_prahem: dict[str, Counter] = {}
    pasma_H = Counter()
    pasma_E = Counter()  # etapa 5 (#244): počet učebních pojistek E do dokladu
    for r in radky:
        forma = str(r[i["FORMA VZDĚLÁVÁNÍ"]] or "")
        zkr = str(r[i["ZKRÁCENÉ STUDIUM"]] or "")
        if "den" not in forma.lower() or zkr.lower() != "ne":
            continue
        if r[i["POVINNOST JPZ"]] == 1:
            continue
        kat = kategorie(str(r[i["KKOV"]] or ""))
        pjt, ned = r[i["PŘIJATÍ"]], r[ined]
        if not (je_cislo(pjt) and je_cislo(ned)):
            continue
        c = pod_prahem.setdefault(kat, Counter())
        c["nabidek"] += 1
        soutezici = pjt + ned
        if soutezici < 10:
            c["pod_prahem_10"] += 1
        if kat in ("H", "E") and soutezici >= 10:
            pasma = pasma_H if kat == "H" else pasma_E
            podil = pjt / soutezici
            if ned == 0:
                pasma["kapacita_nerozhodovala"] += 1
            elif podil >= 2 / 3:
                pasma["vetsina_uspela"] += 1
            elif podil >= 1 / 2:
                pasma["stredne_tezke"] += 1
            elif podil >= 1 / 3:
                pasma["tezke"] += 1
            else:
                pasma["velmi_tezke"] += 1
    return {
        "pod_prahem_10_soutezicich": {
            kat: {"nabidek": v["nabidek"], "pod_prahem": v["pod_prahem_10"],
                    "podil": round(v["pod_prahem_10"] / v["nabidek"], 4)}
            for kat, v in sorted(pod_prahem.items())
        },
        "pasma_H_nad_prahem": dict(pasma_H),
        "pasma_E_nad_prahem": dict(pasma_E),
    }


def mer_pojistky() -> dict:
    """Učební obory jako pojistka na přihláškách 2026. Metoda oponentury (námitka 4).

    Pojistka = první volba M, K nebo L a některá další volba H nebo E.
    """
    wb = openpyxl.load_workbook(UCHAZECI, read_only=True, data_only=True)
    ws = wb[wb.sheetnames[0]]
    it = ws.iter_rows(values_only=True)
    hlavicky = [str(h) if h else "" for h in next(it)]
    idx = {h: n for n, h in enumerate(hlavicky)}
    s_H_E = 0
    s_H_E_a_maturitnim = 0
    pojistka = 0
    pojistka_prvni_neprazdna = 0
    for r in it:
        if r[0] is None:
            continue
        kkovy = [r[idx[f"ss{s}_kkov"]] for s in range(1, 6)]
        katy = [kategorie(str(k)) for k in kkovy if k not in (None, "")]
        ma_uebni = any(k in ("H", "E") for k in katy)
        if not ma_uebni:
            continue
        s_H_E += 1
        if any(k in ("M", "K", "L") for k in katy):
            s_H_E_a_maturitnim += 1
        prvni = kategorie(str(r[idx["ss1_kkov"]] or ""))
        dalsi = [kategorie(str(r[idx[f"ss{s}_kkov"]] or "")) for s in range(2, 6)]
        if prvni in ("M", "K", "L") and any(k in ("H", "E") for k in dalsi):
            pojistka += 1
        neprazdne = [kategorie(str(k)) for k in kkovy if k not in (None, "")]
        if (neprazdne and neprazdne[0] in ("M", "K", "L")
                and any(k in ("H", "E") for k in neprazdne[1:])):
            pojistka_prvni_neprazdna += 1
    wb.close()
    return {
        "deti_s_H_nebo_E": s_H_E,
        "z_nich_kombinuje_s_M_K_L": s_H_E_a_maturitnim,
        "maturitni_prvni_a_H_E_pojistka": pojistka,
        "maturitni_prvni_a_H_E_pojistka_prvni_neprazdna": pojistka_prvni_neprazdna,
    }


def mer_agregaty_2025() -> dict:
    """Základní počty nabídek bez zkoušky v agregátech 2025. Námitka 8."""
    hlavicky, radky = nacti_agregaty(AGREGATY_2025)
    assert len(hlavicky) == 91, f"cekano 91 sloupcu, je {len(hlavicky)}"
    i = {h: n for n, h in enumerate(hlavicky)}
    bez_jpz = Counter()
    n = 0
    for r in radky:
        n += 1
        if r[i["POVINNOST JPZ"]] == 2:
            kat = kategorie(str(r[i["KKOV"]] or ""))
            forma = str(r[i["FORMA VZDĚLÁVÁNÍ"]] or "")
            zkr = str(r[i["ZKRÁCENÉ STUDIUM"]] or "")
            denni_nezkr = "den" in forma.lower() and zkr.lower() == "ne"
            bez_jpz[(kat, denni_nezkr)] += 1
    return {
        "soubor": AGREGATY_2025.name,
        "radku_celkem": n,
        "bez_jpz_celkem": sum(bez_jpz.values()),
        "bez_jpz_denni_nezkr_celkem": sum(v for (k, d), v in bez_jpz.items() if d),
        "bez_jpz_po_kategorii": [
            {"kategorie": k, "denni_nezkr": d, "nabidek": v}
            for (k, d), v in sorted(bez_jpz.items(), key=lambda x: (-x[1], str(x[0])))
        ],
    }


def mer_nastavby() -> dict:
    """Rozpad nástaveb L/51 podle formy, zkrácení a JPZ. Námitka 7."""
    hlavicky, radky = nacti_agregaty()
    i = {h: n for n, h in enumerate(hlavicky)}
    rozpad = Counter()
    for r in radky:
        if not NASTAVBA.search(str(r[i["KKOV"]] or "")):
            continue
        forma = str(r[i["FORMA VZDĚLÁVÁNÍ"]] or "")
        rozpad[(
            "denni" if "den" in forma.lower() else forma,
            str(r[i["ZKRÁCENÉ STUDIUM"]] or ""),
            "s_jpz" if r[i["POVINNOST JPZ"]] == 1 else "bez_jpz",
        )] += 1
    return {"celkem": sum(rozpad.values()), "rozpad": [
        {"forma": f, "zkracene": z, "jpz": j, "nabidek": n}
        for (f, z, j), n in sorted(rozpad.items(), key=lambda x: (-x[1], str(x[0])))
    ]}


def mer_druhe_kolo() -> dict:
    """Nabídky bez zkoušky v agregátech 2. kola 2026. Námitka 2.

    Jen úrovně za 2. kolo; párování s 1. kolem zůstává práci fáze 2.
    """
    hlavicky, radky = nacti_agregaty(ROOT / "data/PZ2026_kolo2_skolobory_vysledky.xlsx")
    assert len(hlavicky) == 91, f"cekano 91 sloupcu, je {len(hlavicky)}"
    i = {h: n for n, h in enumerate(hlavicky)}
    po_kategorii: dict[str, Counter] = {}
    n = 0
    for r in radky:
        n += 1
        if r[i["POVINNOST JPZ"]] == 1:
            continue
        kat = kategorie(str(r[i["KKOV"]] or ""))
        s = po_kategorii.setdefault(kat, Counter())
        s["nabidek"] += 1
        for klic, idx in (("kapacita", i["KAPACITA"]),
                          ("prihlasky", i["PŘIHLÁŠKY CELKEM"]),
                          ("prijati", i["PŘIJATÍ"])):
            v = r[idx]
            if je_cislo(v):
                s[klic] += v
    return {
        "radku_celkem": n,
        "bez_jpz_celkem": sum(v["nabidek"] for v in po_kategorii.values()),
        "po_kategorii": {k: dict(v) for k, v in sorted(po_kategorii.items())},
    }


def mer_skupiny_oboru() -> dict:
    """Denní nezkrácené nabídky H podle prvních dvou číslic KKOV. Námitka 6."""
    hlavicky, radky = nacti_agregaty()
    i = {h: n for n, h in enumerate(hlavicky)}
    skupiny = Counter()
    for r in radky:
        if r[i["POVINNOST JPZ"]] == 1:
            continue
        forma = str(r[i["FORMA VZDĚLÁVÁNÍ"]] or "")
        zkr = str(r[i["ZKRÁCENÉ STUDIUM"]] or "")
        if "den" not in forma.lower() or zkr.lower() != "ne":
            continue
        m = re.match(r"^(\d{2})-\d{2}-([A-Z])/", str(r[i["KKOV"]] or ""))
        if m and m.group(2) == "H":
            skupiny[m.group(1)] += 1
    return {
        "skupin": len(skupiny),
        "nad_prahem_30": sum(1 for v in skupiny.values() if v >= 30),
        "po_skupinach": dict(sorted(skupiny.items())),
    }


def mer_domovy() -> dict:
    """Domovy mládeže a internáty v rejstříku. Námitka 10. Jen počty."""
    data = json.loads(REJSTRIK.read_text(encoding="utf-8"))
    druhy = Counter()
    ss = set()
    dm = set()
    for zaznam in data["list"]:
        redizo = zaznam.get("redIzo")
        for skola in zaznam.get("skolyAZarizeni") or []:
            druh = skola.get("druh")
            druhy[druh] += 1
            if druh in ("C00", "D00"):
                ss.add(redizo)
            if druh in ("H21", "H22"):
                dm.add(redizo)
    return {
        "domovu_mladeze_H22": druhy.get("H22", 0),
        "internatu_H21": druhy.get("H21", 0),
        "redizo_se_ss": len(ss),
        "redizo_s_domovem_nebo_internatem": len(dm),
        "ss_s_domovem_nebo_internatem": len(ss & dm),
        "pole_zaznamu": ["izo", "uplnyNazev", "druh", "kapacity[].nejvyssiPovolenyPocet",
                         "mistaVyuky[].adresa"],
    }


def mer_nove_skoly() -> dict:
    """Pokrytí škol jen s nabídkami bez zkoušky daty pro stránku školy. Námitka 12."""
    hlavicky, radky = nacti_agregaty()
    i = {h: n for n, h in enumerate(hlavicky)}
    s_jpz = set()
    s_bez = set()
    for r in radky:
        red = str(r[i["REDIZO"]])
        (s_jpz if r[i["POVINNOST JPZ"]] == 1 else s_bez).add(red)
    jen_bez = s_bez - s_jpz
    inspis = set(json.loads((ROOT / "data/inspis_school_profiles.json").read_text(
        encoding="utf-8"))["schools"])
    csi = set(json.loads((ROOT / "public/csi_inspections.json").read_text(encoding="utf-8")))
    extrakce = set(json.loads((ROOT / "data/inspection_extractions.json").read_text(
        encoding="utf-8"))["schools"])
    return {
        "skol_jen_bez_jpz": len(jen_bez),
        "z_nich_s_inspis_profilem": len(jen_bez & inspis),
        "z_nich_se_seznamem_inspekci": len(jen_bez & csi),
        "z_nich_s_extrakci_zpravy": len(jen_bez & extrakce),
    }


def _modul(soubor: str, jmeno: str):
    """Načte skript projektu jako modul, aby měření počítalo stejným kódem jako import."""
    spec = importlib.util.spec_from_file_location(jmeno, ROOT / "scripts" / soubor)
    modul = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(modul)
    return modul


def _denni_bez_jpz(soubor: Path) -> list[dict]:
    """Denní nezkrácené nabídky bez JPZ jako slovníky sloupců (rozsah oddílu 1 návrhu)."""
    hlavicky, radky = nacti_agregaty(soubor)
    vystup = []
    for r in radky:
        x = dict(zip(hlavicky, r))
        if (x["POVINNOST JPZ"] != 1 and "den" in str(x["FORMA VZDĚLÁVÁNÍ"] or "").lower()
                and str(x["ZKRÁCENÉ STUDIUM"] or "").lower() == "ne"):
            vystup.append(x)
    return vystup


def mer_parovani_roku() -> dict:
    """Párování nabídek bez JPZ 2025 ↔ 2026 mechanismem webu (#244, otázka 4).

    ID_SOF ani ID_SO mezi roky stabilní nejsou; páruje se klíčem REDIZO_KKOV
    a podobností zaměření ze scripts/match_obory_2025_2026.py.
    """
    imp = _modul("import_cermat_2026_real.py", "import_cermat_2026_real")
    par = _modul("match_obory_2025_2026.py", "match_obory_2025_2026")
    r25 = _denni_bez_jpz(ROOT / "data/PZ2025_kolo1_skolobory_vysledky.xlsx")
    r26 = _denni_bez_jpz(AGREGATY)

    def zaznam(x: dict) -> dict:
        prihlasky = x["PŘIHLÁŠKY CELKEM"]
        return {"id": imp.make_full_id(str(x["REDIZO"]), x["KKOV"], str(x["ZAMĚŘENÍ OBORU"] or "")),
                "prihlasky": prihlasky if je_cislo(prihlasky) else 0}

    z26 = [zaznam(x) for x in r26]
    kat = {z["id"]: kategorie(str(x["KKOV"] or "")) for z, x in zip(z26, r26)}
    with contextlib.redirect_stdout(io.StringIO()):
        shody, k_revizi = par.match_obory(par.build_index([zaznam(x) for x in r25]), par.build_index(z26))
    stabilni_id = {
        sloupec: len({str(x[sloupec]) for x in r26} & {str(x[sloupec]) for x in r25})
        for sloupec in ("ID_SOF", "ID_SO")
    }
    po_kategorii: dict[str, Counter] = {}
    for klic, v in shody.items():
        po_kategorii.setdefault(kat.get(klic, "?"), Counter())[f"{v['match_type']}/{v['confidence']}"] += 1
    return {
        "nabidek_2026": len(r26),
        "nabidek_2025": len(r25),
        "unikatnich_id_2026": len(kat),
        "id_shodnych_mezi_roky": stabilni_id,
        "podle_typu": dict(Counter(v["match_type"] for v in shody.values())),
        "podle_jistoty": dict(Counter(v["confidence"] for v in shody.values())),
        "k_rucni_revizi": len(k_revizi),
        "po_kategorii": {k: dict(v) for k, v in sorted(po_kategorii.items())},
    }


def mer_parovani_kol() -> dict:
    """Párování nabídek bez JPZ 1. ↔ 2. kolo 2026 klíčem scripts/build-druhe-kolo.py (#244, otázka 4)."""
    dk = _modul("build-druhe-kolo.py", "build_druhe_kolo")
    k1 = _denni_bez_jpz(AGREGATY)
    k2 = _denni_bez_jpz(ROOT / "data/PZ2026_kolo2_skolobory_vysledky.xlsx")
    m2 = {dk.parovaci_klic(r): r for r in k2}
    podle_webu: dict[str, list[dict]] = {}
    for r in k1:
        podle_webu.setdefault(dk.klic_webu(str(r["REDIZO"]), str(r["KKOV"]), r["ZAMĚŘENÍ OBORU"]), []).append(r)
    stavy = Counter()
    sparovane = set()
    for seznam in podle_webu.values():
        if len(seznam) > 1:
            stavy["kolize_klice"] += 1
            continue
        druhe = m2.get(dk.parovaci_klic(seznam[0]))
        if druhe:
            stavy["vypsano"] += 1
            sparovane.add(dk.parovaci_klic(druhe))
        else:
            stavy["bez_2_kola"] += 1
    # Nabídky 2. kola, které klíč nenašel; ID_SO (stejné v obou kolech) by spárovalo část z nich.
    id_so_1 = Counter(str(r["ID_SO"]) for r in k1)
    nenalezene = [r for r in k2 if dk.parovaci_klic(r) not in sparovane]
    return {
        "nabidek_kolo1": len(k1),
        "nabidek_kolo2": len(k2),
        "stavy_z_kola1": dict(stavy),
        "kolo2_nesparovanych": len(nenalezene),
        "z_nich_jednoznacne_pres_id_so": sum(id_so_1[str(r["ID_SO"])] == 1 for r in nenalezene),
        "kolo2_po_kategorii": dict(Counter(kategorie(str(r["KKOV"] or "")) for r in k2)),
    }


def mer_konzervatore_a_j() -> dict:
    """Úplnost čísel u konzervatoří (P) a kategorie J (#244, otázky 2 a 3)."""
    hlavicky, radky = nacti_agregaty()
    vsechny = [dict(zip(hlavicky, r)) for r in radky]
    denni = _denni_bez_jpz(AGREGATY)
    vystup = {}
    for kat in ("P", "J"):
        vse = [x for x in vsechny if kategorie(str(x["KKOV"] or "")) == kat]
        d = [x for x in denni if kategorie(str(x["KKOV"] or "")) == kat]
        bez_prihlasek = [x for x in d if not je_cislo(x["PŘIHLÁŠKY CELKEM"])]
        vystup[kat] = {
            "nabidek_vsech_forem": len(vse),
            "vsech_forem_bez_prihlasek": sum(not je_cislo(x["PŘIHLÁŠKY CELKEM"]) for x in vse),
            "denni_nezkr": len(d),
            "denni_skol": len({x["REDIZO"] for x in d}),
            "denni_bez_prihlasek": len(bez_prihlasek),
            "denni_bez_prihlasek_skol": len({x["REDIZO"] for x in bez_prihlasek}),
            "denni_bez_kapacity": sum(not je_cislo(x["KAPACITA"]) for x in d),
            "denni_po_rocniku": {str(k): v for k, v in sorted(Counter(x["ROČNÍK"] for x in d).items())},
            "denni_po_delce": {str(k): v for k, v in sorted(Counter(x["DÉLKA STUDIA"] for x in d).items())},
            "denni_obory": dict(Counter(f"{x['KKOV']} {x['OBOR - NÁZEV']}" for x in d)),
            "denni_soucty": {
                "kapacita": sum(x["KAPACITA"] for x in d if je_cislo(x["KAPACITA"])),
                "prihlasky": sum(x["PŘIHLÁŠKY CELKEM"] for x in d if je_cislo(x["PŘIHLÁŠKY CELKEM"])),
                "prijati": sum(x["PŘIJATÍ"] for x in d if je_cislo(x["PŘIJATÍ"])),
            },
        }
    return vystup


def main() -> None:
    skoly_rejstrik = nacti_rejstrik()
    doklad = {
        "vystup_pro": "docs/navrh-obory-bez-jpz-2027.md (issue #209)",
        "reprodukce": "python3 scripts/mereni-obory-bez-jpz.py",
        "agregaty": mer_agregaty(),
        "uchazeci": mer_uchazeci(),
        "rejstrik": mer_rejstrik(skoly_rejstrik),
        "srovnani_skol": mer_srovnani(skoly_rejstrik),
        "dipsy": mer_dipsy(),
        "obsazenost": mer_obsazenost(),
        "soutezici_prahy": mer_soutezici_prahy(),
        "pojistky": mer_pojistky(),
        "agregaty_2025": mer_agregaty_2025(),
        "nastavby": mer_nastavby(),
        "druhe_kolo": mer_druhe_kolo(),
        "skupiny_oboru": mer_skupiny_oboru(),
        "domovy": mer_domovy(),
        "nove_skoly": mer_nove_skoly(),
        "parovani_roku": mer_parovani_roku(),
        "parovani_kol": mer_parovani_kol(),
        "konzervatore_a_j": mer_konzervatore_a_j(),
    }
    DOKLAD.write_text(json.dumps(doklad, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    a = doklad["agregaty"]
    print(f"Agregáty 2026: {a['radku_celkem']} řádků, s JPZ {a['podle_jpz']['s_jpz']}, "
          f"bez JPZ {a['podle_jpz']['bez_jpz']}")
    print(f"Importním filtrem projde {a['importnim_filtrem_proslo']} řádků.")
    print("Vyřazeno:", a["vyrazeno_duvod"])
    print("Kategorie (s JPZ / bez JPZ):")
    for kat, pocty in a["po_kategorii"].items():
        print(f"  {kat}: {pocty}")
    print("Součty:", json.dumps(a["soucty"], ensure_ascii=False))
    u = doklad["uchazeci"]
    print(f"Uchazeči 2026: {u['uchazecu_radku']} řádků, voleb {u['voleb_celkem']}")
    print("Forma voleb:", u["forma_voleb"])
    print(f"s oborem H: {u['uchazecu_s_oborem_H']}, s nedenní volbou: "
          f"{u['uchazecu_s_nedenni_volbou']}, bez výsledku JPZ: {u['uchazecu_bez_vysledku_JPZ']}")
    r = doklad["rejstrik"]
    print(f"Rejstřík {r['snimek']}: {r['skol_C00_D00_s_obory']} škol, "
          f"{r['zaznamu_oboru']} záznamů oborů, dobíhajících {r['z_toho_dobihajicich']}")
    s = doklad["srovnani_skol"]
    print("Hlášené školy:", json.dumps(s["hlasene_skoly"], ensure_ascii=False)[:600])
    print("Vzorek 30:", s["vzorek"]["souhrn"])
    print("DiPSy:", json.dumps(doklad["dipsy"], ensure_ascii=False)[:400])
    print("Obsazenost:", json.dumps(doklad["obsazenost"], ensure_ascii=False)[:500])
    print("Prahy:", json.dumps(doklad["soutezici_prahy"], ensure_ascii=False)[:600])
    print("Pojistky:", json.dumps(doklad["pojistky"], ensure_ascii=False))
    a25 = doklad["agregaty_2025"]
    print(f"2025: {a25['radku_celkem']} řádků, bez JPZ {a25['bez_jpz_celkem']}, "
          f"z toho denních nezkrácených {a25['bez_jpz_denni_nezkr_celkem']}")
    print("Nástavby:", json.dumps(doklad["nastavby"], ensure_ascii=False)[:400])
    dk = doklad["druhe_kolo"]
    print(f"2. kolo: {dk['radku_celkem']} řádků, bez JPZ {dk['bez_jpz_celkem']}")
    print("2. kolo H/E:", {k: v for k, v in dk["po_kategorii"].items() if k in ("H", "E")})
    print("Skupiny H:", json.dumps(doklad["skupiny_oboru"], ensure_ascii=False)[:300])
    print("Domovy:", json.dumps(doklad["domovy"], ensure_ascii=False)[:300])
    print("Nové školy:", json.dumps(doklad["nove_skoly"], ensure_ascii=False))
    print("Párování 2025 ↔ 2026:", json.dumps(doklad["parovani_roku"]["podle_jistoty"], ensure_ascii=False))
    print("Párování 1. ↔ 2. kolo:", json.dumps(doklad["parovani_kol"]["stavy_z_kola1"], ensure_ascii=False))
    print("P a J:", json.dumps({k: v["denni_bez_prihlasek"] for k, v in doklad["konzervatore_a_j"].items()}))
    print(f"Doklad: {DOKLAD}")


if __name__ == "__main__":
    main()
