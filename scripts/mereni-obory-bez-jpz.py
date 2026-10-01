#!/usr/bin/env python3
"""Měření pokrytí oborů bez jednotné zkoušky a nedenních forem (issue #209).

Čte pouze místní soubory, na síť se nedotazuje. Výstupem je doklad
`docs/podklady/mereni-obory-bez-jpz-2026.json` a souhrn na stdout.

Použití:
    python3 scripts/mereni-obory-bez-jpz.py
"""

from __future__ import annotations

import json
import random
import re
from collections import Counter
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parent.parent
AGREGATY = ROOT / "data/PZ2026_kolo1_skolobory_vysledky.xlsx"
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


def nacti_agregaty() -> tuple[list[str], list[tuple]]:
    wb = openpyxl.load_workbook(AGREGATY, read_only=True, data_only=True)
    ws = wb.active
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
    print(f"Doklad: {DOKLAD}")


if __name__ == "__main__":
    main()
