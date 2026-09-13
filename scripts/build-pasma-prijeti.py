#!/usr/bin/env python3
"""Pásma přijetí: jaký podíl uchazečů se s daným výsledkem na obor dostal.

Zdroj: PZ2025_kolo1_uchazeci_prihlasky_vysledky.xlsx (údaje o jednotlivých
uchazečích). Pro každý obor se uchazeči rozdělí podle výsledku jednotné zkoušky
do pásem po pěti bodech a spočítá se, kolik z nich bylo přijato.

Počítá se jen mezi **soutěžícími**, tedy mezi přijatými a těmi, kdo se nevešli
kvůli kapacitě. Uchazeči, kteří nastoupili na obor s vyšší prioritou, o místo
nakonec nesoutěžili; uchazeči, kteří nesplnili podmínky, neprošli přes jiné
kritérium než výsledek testu.

Výstup: public/pasma_prijeti_2025.json
"""
from __future__ import annotations

import collections
import json
from pathlib import Path

import openpyxl

KOREN = Path(__file__).resolve().parent.parent
ZDROJ = KOREN / "data" / "PZ2025_kolo1_uchazeci_prihlasky_vysledky.xlsx"
KATALOG = KOREN / "public" / "schools_data.json"
VYSTUP = KOREN / "public" / "pasma_prijeti_2025.json"

SIRKA_PASMA = 5
MIN_SOUTEZICICH = 30     # pod tímto počtem se pásma nezveřejňují
MIN_V_PASMU = 5          # pásmo s méně uchazeči se slučuje do sousedního
MIN_PRIJATYCH = 10       # pod tímto počtem nemá hranice smysl
MIN_ODMITNUTYCH = 5      # bez odmítnutých není co ohraničovat
OKOLI_HRANICE = 5        # body, ve kterých se měří hustota u hranice


def nacti_uchazece() -> dict[str, dict[str, list[float]]]:
    """Výsledky uchazečů u každého oboru rozdělené podle toho, jak dopadli."""
    wb = openpyxl.load_workbook(ZDROJ, read_only=True)
    it = wb["data"].iter_rows(values_only=True)
    ix = {n: i for i, n in enumerate(next(it))}

    obory: dict[str, dict[str, list[float]]] = collections.defaultdict(
        lambda: {"prijati": [], "nevesli_se": [], "nesplnili": [], "jinam": []}
    )
    for radek in it:
        skor = radek[ix["c_m_procentni_skor"]]
        if skor is None:
            continue
        body = float(skor) / 2  # procentní skór 0–200 na škálu 0–100
        for k in range(1, 6):
            redizo = radek[ix[f"ss{k}_redizo"]]
            kkov = radek[ix[f"ss{k}_kkov"]]
            if not redizo or not kkov:
                continue
            o = obory[f"{redizo}_{kkov}"]
            duvod = radek[ix[f"ss{k}_duvod_neprijeti"]]
            if radek[ix[f"ss{k}_prijat"]] == 1:
                o["prijati"].append(body)
            elif duvod == "pro_nedostacujici_kapacitu":
                o["nevesli_se"].append(body)
            elif duvod == "pro_nesplneni_podminek":
                o["nesplnili"].append(body)
            elif duvod == "prijat_na_vyssi_prioritu":
                o["jinam"].append(body)
    return obory


def pasma(prijati: list[float], nevesli: list[float]) -> list[dict]:
    """Pásma po pěti bodech; krajní pásma s málo uchazeči se slučují dovnitř."""
    hrubá: dict[int, list[int]] = collections.defaultdict(lambda: [0, 0])
    for body, prijat in [(b, 1) for b in prijati] + [(b, 0) for b in nevesli]:
        klic = int(body // SIRKA_PASMA) * SIRKA_PASMA
        hrubá[klic][0] += prijat
        hrubá[klic][1] += 1

    radky = [{"od": k, "do": k + SIRKA_PASMA, "prijato": v[0], "soutezilo": v[1]}
             for k, v in sorted(hrubá.items())]

    # Pásmo s málo uchazeči se slučuje se sousedem; jinak by "1 z 1 = 100 %"
    # vypadalo jako spolehlivý údaj. Slučuje se se slabším sousedem, aby
    # sloučené pásmo zůstalo co nejužší.
    while len(radky) > 1:
        i = min(range(len(radky)), key=lambda j: radky[j]["soutezilo"])
        if radky[i]["soutezilo"] >= MIN_V_PASMU:
            break
        if i == 0:
            j = 1
        elif i == len(radky) - 1:
            j = i - 1
        else:
            j = i - 1 if radky[i - 1]["soutezilo"] <= radky[i + 1]["soutezilo"] else i + 1
        a, b = sorted((radky[i], radky[j]), key=lambda x: x["od"])
        radky[min(i, j)] = {"od": a["od"], "do": b["do"],
                            "prijato": a["prijato"] + b["prijato"],
                            "soutezilo": a["soutezilo"] + b["soutezilo"]}
        radky.pop(max(i, j))
    return radky


def kontext_katalogu() -> tuple[collections.Counter, dict[str, str]]:
    """Počet zaměření na kombinaci REDIZO a KKOV a typ školy."""
    data = json.load(open(KATALOG, encoding="utf-8"))
    poc: collections.Counter = collections.Counter()
    typy: dict[str, str] = {}
    for rok in ("2025", "2026"):
        videno = set()
        for z in data.get(rok, []):
            klic = f"{z['redizo']}_{z['kkov']}"
            typy.setdefault(klic, z.get("typ"))
            if z["id"] not in videno:
                videno.add(z["id"])
                if rok == "2025":
                    poc[klic] += 1
    return poc, typy


def main() -> None:
    obory = nacti_uchazece()
    zamereni, typy = kontext_katalogu()

    vystup: dict[str, dict] = {}
    for klic, o in obory.items():
        prijati, nevesli = o["prijati"], o["nevesli_se"]
        soutezicich = len(prijati) + len(nevesli)
        if not prijati:
            continue

        zaznam: dict = {
            "soutezicich": soutezicich,
            "prijatych": len(prijati),
            "neveslo_se": len(nevesli),
            "nastoupilo_jinam": len(o["jinam"]),
            "nesplnilo_podminky": len(o["nesplnili"]),
            "min_prijaty": round(min(prijati), 1),
            # obor s víc zaměřeními sdílí jeden klíč, hranice je pak rozmazaná
            "vice_zamereni": zamereni.get(klic, 1) > 1,
            "talentova_zkouska": klic.split("_")[1].startswith("82"),
            "typ": typy.get(klic),
        }

        if nevesli:
            zaznam["max_neprijaty"] = round(max(nevesli), 1)
            if len(prijati) >= MIN_PRIJATYCH and len(nevesli) >= MIN_ODMITNUTYCH:
                zaznam["prekryv"] = round(max(nevesli) - min(prijati), 1)
                u_hranice = sum(1 for b in prijati + nevesli
                                if abs(b - min(prijati)) <= OKOLI_HRANICE)
                zaznam["hustota_u_hranice"] = round(u_hranice / soutezicich, 3)
        else:
            zaznam["vsichni_soutezici_prijati"] = True

        if soutezicich >= MIN_SOUTEZICICH:
            zaznam["pasma"] = pasma(prijati, nevesli)

        vystup[klic] = zaznam

    VYSTUP.write_text(json.dumps({
        "rok": 2025,
        "kolo": 1,
        "zdroj": ZDROJ.name,
        "uroven": "REDIZO_KKOV (bez zaměření)",
        "skala": "body 0–100, procentní skór CERMAT dělený dvěma",
        "prahy": {
            "min_soutezicich_pro_pasma": MIN_SOUTEZICICH,
            "min_v_pasmu": MIN_V_PASMU,
            "min_prijatych_pro_hranici": MIN_PRIJATYCH,
            "min_odmitnutych_pro_hranici": MIN_ODMITNUTYCH,
        },
        "data": vystup,
    }, ensure_ascii=False), encoding="utf-8")
    s_pasmy = sum(1 for z in vystup.values() if "pasma" in z)
    s_hranici = sum(1 for z in vystup.values() if "prekryv" in z)
    print(f"zapsáno {len(vystup)} oborů, z toho {s_pasmy} s pásmy a {s_hranici} s hranicí")


if __name__ == "__main__":
    main()
