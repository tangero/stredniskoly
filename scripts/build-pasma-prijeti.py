#!/usr/bin/env python3
"""Pásma přijetí: jaký podíl uchazečů se s daným výsledkem na obor dostal.

Zdroj: PZ{rok}_kolo1_uchazeci_prihlasky_vysledky.xlsx (údaje o jednotlivých
uchazečích). Pro každý obor se uchazeči rozdělí podle výsledku jednotné zkoušky
do pásem po pěti bodech a spočítá se, kolik z nich bylo přijato.

Počítá se jen mezi **soutěžícími**, tedy mezi přijatými a těmi, kdo se nevešli
kvůli kapacitě. Uchazeči přijatí na obor s vyšší prioritou o toto místo už
nesoutěžili; uchazeči, kteří nesplnili podmínky, neprošli přes jiné kritérium
než výsledek testu.

Výstup: public/pasma_prijeti_{rok}.json; rok bez --rok bere registr stavu datových sad.
"""
from __future__ import annotations

import collections
import json
from pathlib import Path

import openpyxl

KOREN = Path(__file__).resolve().parent.parent
def zobrazeny_rok() -> int:
    """Rok dat uchazečů, který web zobrazuje. Letopočet se nepíše napevno, určuje ho registr (docs/zdroje-dat.md, oddíl 5)."""
    registr = json.loads((KOREN / "public" / "stav_datovych_sad.json").read_text(encoding="utf-8"))
    return int(registr["sady"]["cermat-uchazeci-kolo1"]["zobrazeno"]["obdobi"])


ROK = zobrazeny_rok()
ZDROJ = KOREN / "data" / f"PZ{ROK}_kolo1_uchazeci_prihlasky_vysledky.xlsx"
KATALOG = KOREN / "public" / "schools_data.json"
NABIDKY_2026 = KOREN / "public" / "applications_2026.json"
VYSTUP = KOREN / "public" / f"pasma_prijeti_{ROK}.json"
PRIHLASKY_S_POVINNOSTI = KOREN / "data" / "PZ2026_kolo1_skolobory_prihlasky.xlsx"

SIRKA_PASMA = 5
MIN_SOUTEZICICH = 30     # pod tímto počtem se pásma nezveřejňují
MIN_V_PASMU = 5          # pásmo s méně uchazeči se slučuje do sousedního
MIN_PRIJATYCH = 10       # pod tímto počtem nemá hranice smysl
MIN_ODMITNUTYCH = 5      # bez odmítnutých není co ohraničovat
OKOLI_HRANICE = 5        # body, ve kterých se měří hustota u hranice

# Skupiny oborů, kde o přijetí rozhoduje talentová zkouška: umělecké obory
# skupiny 82 a gymnázia se sportovní přípravou 79-42. Míra "rozhodl test" je
# u nich mediánově 0,66 a 0,78 proti 0,97 u ostatních.
TALENTOVE_SKUPINY = ("82-", "79-42")
# Kategorie oborů, u kterých je jednotná zkouška povinná; slouží jen jako
# záloha, když nabídka chybí v souboru přihlášek 2026 se sloupcem POVINNOST JPZ.
KATEGORIE_S_JPZ = ("K", "L", "M")


def prijat(hodnota) -> bool:
    """Příznak přijetí: 1 = přijat a zařazen. CERMAT ho zapisuje jako číslo i jako text, v roce 2024 jako True."""
    return str(hodnota).strip() in ("1", "True", "true")


def nacti_uchazece() -> tuple[dict[str, dict[str, list[float]]], list[float]]:
    """Výsledky uchazečů u každého oboru rozdělené podle toho, jak dopadli.

    Vrací i seřazené výsledky jednotlivých uchazečů; řádek souboru je jeden
    uchazeč, takže každý se v rozdělení objeví jednou bez ohledu na počet přihlášek.
    """
    wb = openpyxl.load_workbook(ZDROJ, read_only=True)
    # První list: CERMAT ho přejmenovává mezi revizemi („data“ → „Sheet 1“, „fyzicke_osoby“).
    it = wb.worksheets[0].iter_rows(values_only=True)
    ix = {n: i for i, n in enumerate(next(it))}

    obory: dict[str, dict[str, list[float]]] = collections.defaultdict(
        lambda: {"prijati": [], "nevesli_se": [], "nesplnili": [], "vyssi_priorita": []}
    )
    uchazeci: list[float] = []
    for radek in it:
        skor = radek[ix["c_m_procentni_skor"]]
        if skor is None:
            continue
        body = float(skor) / 2  # procentní skór 0–200 na škálu 0–100
        uchazeci.append(body)
        for k in range(1, 6):
            redizo = radek[ix[f"ss{k}_redizo"]]
            kkov = radek[ix[f"ss{k}_kkov"]]
            if not redizo or not kkov:
                continue
            o = obory[f"{redizo}_{kkov}"]
            duvod = radek[ix[f"ss{k}_duvod_neprijeti"]]
            if prijat(radek[ix[f"ss{k}_prijat"]]):
                o["prijati"].append(body)
            elif duvod == "pro_nedostacujici_kapacitu":
                o["nevesli_se"].append(body)
            elif duvod == "pro_nesplneni_podminek":
                o["nesplnili"].append(body)
            elif duvod == "prijat_na_vyssi_prioritu":
                o["vyssi_priorita"].append(body)
    return obory, sorted(uchazeci)


def percentil(rozdeleni: list[float], body: float) -> float:
    """Kolik procent uchazečů v celé zemi mělo stejný nebo horší výsledek."""
    import bisect
    return bisect.bisect_right(rozdeleni, body) / len(rozdeleni) * 100


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


def rozhodl_test(prijati: list[float], nevesli: list[float]) -> float:
    """Pravděpodobnost, že náhodný přijatý měl lepší výsledek než náhodný odmítnutý.

    Plocha pod ROC křivkou. Hodnota 1,0 znamená, že o přijetí rozhodl výhradně
    výsledek testu, 0,5 že výsledek nerozhodoval vůbec. Na rozdíl od rozdílu
    krajních hodnot ji neurčuje jediný uchazeč.
    """
    vse = sorted([(b, 1) for b in prijati] + [(b, 0) for b in nevesli])
    poradi: dict[int, float] = {}
    i = 0
    while i < len(vse):  # shodné výsledky dostanou průměrné pořadí
        j = i
        while j < len(vse) and vse[j][0] == vse[i][0]:
            j += 1
        prumer = (i + j + 1) / 2
        for k in range(i, j):
            poradi[k] = prumer
        i = j
    soucet = sum(poradi[k] for k, (_, prijat) in enumerate(vse) if prijat)
    n1, n0 = len(prijati), len(nevesli)
    return (soucet - n1 * (n1 + 1) / 2) / (n1 * n0)


def povinna_jpz() -> dict[str, bool]:
    """REDIZO_KKOV → zda se na obor koná jednotná zkouška, podle přihlášek 2026.

    U oborů bez povinné zkoušky mají výsledek jen uchazeči, kteří ji psali kvůli
    jiné přihlášce. Pásma by pak popisovala nahodilou podmnožinu a obor, který
    podle testu vůbec nepřijímá.
    """
    if not PRIHLASKY_S_POVINNOSTI.exists():
        # Bez souboru přihlášek rozhodne kategorie oboru; v CI se soubor nestahuje.
        print(f"varování: {PRIHLASKY_S_POVINNOSTI.name} chybí, povinnost JPZ podle kategorie oboru")
        return {}
    wb = openpyxl.load_workbook(PRIHLASKY_S_POVINNOSTI, read_only=True)
    it = wb[wb.sheetnames[0]].iter_rows(values_only=True)
    ix = {n: i for i, n in enumerate(next(it))}
    mapa: dict[str, bool] = {}
    for r in it:
        klic = f"{r[ix['REDIZO']]}_{r[ix['KKOV']]}"
        mapa[klic] = mapa.get(klic, False) or str(r[ix["POVINNOST JPZ"]]).strip() == "1"
    return mapa


def ma_jpz(klic: str, mapa: dict[str, bool]) -> bool:
    if klic in mapa:
        return mapa[klic]
    kkov = klic.split("_")[1]
    return kkov.split("/")[0][-1:] in KATEGORIE_S_JPZ


def kontext_katalogu() -> tuple[collections.Counter, dict[str, str]]:
    """Počet nabídek na kombinaci REDIZO a KKOV a typ školy.

    Počítá se zvlášť za katalog 2025 a za nabídku 1. kola 2026 a bere se vyšší
    z obou čísel: pokud škola v roce 2026 vypsala dvě zaměření jednoho oboru,
    zobrazí se na obou stránkách stejný záznam, i když v roce 2025 bylo jen jedno.
    """
    data = json.load(open(KATALOG, encoding="utf-8"))
    typy: dict[str, str] = {}
    za_2025: collections.Counter = collections.Counter()
    for z in {z["id"]: z for z in data.get("2025", [])}.values():
        klic = f"{z['redizo']}_{z['kkov']}"
        za_2025[klic] += 1
        typy.setdefault(klic, z.get("typ"))
    for z in data.get("2026", []):
        typy.setdefault(f"{z['redizo']}_{z['kkov']}", z.get("typ"))

    nabidky = json.load(open(NABIDKY_2026, encoding="utf-8"))["data"]
    za_2026 = collections.Counter(f"{z['redizo']}_{z['kkov']}" for z in nabidky)

    poc: collections.Counter = collections.Counter()
    for klic in set(za_2025) | set(za_2026):
        poc[klic] = max(za_2025[klic], za_2026[klic])
    return poc, typy


def main() -> None:
    # Obtížnost zkoušky se mezi ročníky mění, percentil mezi uchazeči tenhle vliv odstraňuje.
    obory, rozdeleni = nacti_uchazece()
    zamereni, typy = kontext_katalogu()
    jpz = povinna_jpz()
    vynechano_bez_jpz = 0

    vystup: dict[str, dict] = {}
    for klic, o in obory.items():
        prijati, nevesli = o["prijati"], o["nevesli_se"]
        soutezicich = len(prijati) + len(nevesli)
        if not prijati:
            continue
        if not ma_jpz(klic, jpz):
            vynechano_bez_jpz += 1
            continue

        zaznam: dict = {
            "soutezicich": soutezicich,
            "prijatych": len(prijati),
            "neveslo_se": len(nevesli),
            # Nepřijati sem, protože byli přijati na obor uvedený na přihlášce výš.
            "prijato_na_vyssi_prioritu": len(o["vyssi_priorita"]),
            "nesplnilo_podminky": len(o["nesplnili"]),
            "min_prijaty": round(min(prijati), 1),
            "min_prijaty_percentil": round(percentil(rozdeleni, min(prijati)), 1),
            # obor s víc zaměřeními sdílí jeden klíč, hranice je pak rozmazaná
            "vice_zamereni": zamereni.get(klic, 1) > 1,
            "talentova_zkouska": klic.split("_")[1].startswith(TALENTOVE_SKUPINY),
            "typ": typy.get(klic),
        }

        if nevesli:
            zaznam["max_neprijaty"] = round(max(nevesli), 1)
            if len(prijati) >= MIN_PRIJATYCH and len(nevesli) >= MIN_ODMITNUTYCH:
                zaznam["rozhodl_test"] = round(rozhodl_test(prijati, nevesli), 3)
                # pásmo nejistoty: mezi nejnižším přijatým a nejvyšším nepřijatým
                # se o přijetí rozhodovalo i podle jiných kritérií než testu
                zaznam["pasmo_nejistoty"] = [round(min(prijati), 1), round(max(nevesli), 1)]
                lo, hi = min(prijati), max(nevesli)
                v_pasmu = sum(1 for b in prijati + nevesli if lo <= b <= hi)
                zaznam["v_pasmu_nejistoty"] = round(v_pasmu / soutezicich, 3)
                # Přesné počty pro větu „z N uchazečů v tomto rozmezí se dostalo M“;
                # součet pětibodových pásem by započítal i uchazeče mimo rozmezí.
                zaznam["pasmo_nejistoty_soutezilo"] = v_pasmu
                zaznam["pasmo_nejistoty_prijato"] = sum(1 for b in prijati if lo <= b <= hi)
                u_hranice = sum(1 for b in prijati + nevesli
                                if abs(b - min(prijati)) <= OKOLI_HRANICE)
                zaznam["hustota_u_hranice"] = round(u_hranice / soutezicich, 3)
        else:
            # Nikdo neodmítnut pro kapacitu. Neříká, že se dostali všichni:
            # uchazeči, kteří nesplnili podmínky, se do soutěžících nepočítají.
            zaznam["nikdo_neodmitnut_pro_kapacitu"] = True

        # Bez jediného odmítnutého vychází každé pásmo na 100 % a tabulka
        # nic nerozlišuje; místo ní se zobrazuje věta o tom, že se nikdo
        # nevešel kvůli kapacitě.
        if soutezicich >= MIN_SOUTEZICICH and nevesli:
            zaznam["pasma"] = pasma(prijati, nevesli)

        vystup[klic] = zaznam

    VYSTUP.parent.mkdir(parents=True, exist_ok=True)
    VYSTUP.write_text(json.dumps({
        "rok": ROK,
        "kolo": 1,
        "zdroj": ZDROJ.name,
        "uroven": "REDIZO_KKOV (bez zaměření), jen obory s povinnou jednotnou zkouškou",
        "skala": "body 0–100, procentní skór CERMAT dělený dvěma",
        "sirka_pasma": SIRKA_PASMA,
        "prahy": {
            "min_soutezicich_pro_pasma": MIN_SOUTEZICICH,
            "min_v_pasmu": MIN_V_PASMU,
            "min_prijatych_pro_hranici": MIN_PRIJATYCH,
            "min_odmitnutych_pro_hranici": MIN_ODMITNUTYCH,
        },
        "data": vystup,
    }, ensure_ascii=False), encoding="utf-8")
    s_pasmy = sum(1 for z in vystup.values() if "pasma" in z)
    s_hranici = sum(1 for z in vystup.values() if "rozhodl_test" in z)
    print(f"zapsáno {len(vystup)} oborů, z toho {s_pasmy} s pásmy a {s_hranici} s hranicí; "
          f"vynecháno {vynechano_bez_jpz} oborů bez povinné jednotné zkoušky")


def argumenty() -> None:
    """Vstup, výstup a rok lze přepsat; datová linka tak zpracuje nový soubor mimo public/."""
    import argparse
    global ZDROJ, VYSTUP, ROK
    ap = argparse.ArgumentParser(description="Pásma přijetí z dat uchazečů CERMAT.")
    ap.add_argument("--zdroj", type=Path)
    ap.add_argument("--vystup", type=Path)
    ap.add_argument("--rok", type=int, default=ROK)
    a = ap.parse_args()
    # Bez výslovné cesty se vstup i výstup odvodí z roku, aby --rok 2026 nečetl soubor roku 2025.
    ROK = a.rok
    ZDROJ = a.zdroj or KOREN / "data" / f"PZ{ROK}_kolo1_uchazeci_prihlasky_vysledky.xlsx"
    VYSTUP = a.vystup or KOREN / "public" / f"pasma_prijeti_{ROK}.json"


if __name__ == "__main__":
    argumenty()
    main()
