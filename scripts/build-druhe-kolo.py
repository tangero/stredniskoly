#!/usr/bin/env python3
"""Druhé kolo přijímacího řízení po nabídkách: public/druhe_kolo.json.

Návrh a výklad: docs/druhe-kolo.md. Ukazatele: docs/slovnik-ukazatelu.md, oddíl 2.

Pro každou nabídku 1. kola uloží, zda škola vypsala 2. kolo, a pokud ano, jeho
kapacitu, přihlášky, přijaté a důvody nepřijetí. Nabídky se mezi koly párují podle
školy, oboru, zaměření, formy, délky, zkráceného studia a jazyka, protože
identifikátor ID_SOF se mezi koly liší.

Výstup nese ročníky jako klíče; název souboru rok neobsahuje. Který rok web
zobrazí, určuje registr public/stav_datovych_sad.json.

    python3 scripts/build-druhe-kolo.py                      # všechny roky, které jsou v data/
    python3 scripts/build-druhe-kolo.py --rok 2027 --kolo1 A.xlsx --kolo2 B.xlsx \\
        --zaklad public/druhe_kolo.json --vystup /tmp/druhe_kolo.json
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import unicodedata
from collections import Counter
from pathlib import Path

import openpyxl

KOREN = Path(__file__).resolve().parent.parent
VYSTUP = KOREN / "public" / "druhe_kolo.json"
MIN_PRIJATYCH_S_VYSLEDKEM = 10  # pod touto hranicí se nejnižší výsledek nezobrazuje

PAROVACI_SLOUPCE = ("REDIZO", "KKOV", "ZAMĚŘENÍ OBORU", "FORMA VZDĚLÁVÁNÍ", "DÉLKA STUDIA", "ZKRÁCENÉ STUDIUM", "JAZYK STUDIA")
POVINNE = PAROVACI_SLOUPCE + (
    "POVINNOST JPZ", "KAPACITA", "PŘIHLÁŠKY CELKEM", "PŘIJATÍ", "NEPŘIJATI - NEDOSTATEČNÁ KAPACITA",
    "NEPŘIJATI - NESPLNĚNÍ PODMÍNEK", "NEPŘIJATI - PŘIJAT NA VYŠŠÍ PRIORITU",
    "ČJ+MA - KONALI (PŘIJATI)", "ČJ+MA - % SKÓR - MIN (PŘIJATI)",
)


def normalizuj_zamereni(text: str) -> str:
    """Stejně jako normalizeSchoolKey v src/lib/school-key.ts."""
    bez = unicodedata.normalize("NFKD", text or "").encode("ascii", "ignore").decode()
    return re.sub(r"[^a-zA-Z0-9]+", "_", bez).strip("_").lower()


def klic_webu(redizo: str, kkov: str, zamereni: str) -> str:
    z = normalizuj_zamereni(zamereni)
    return f"{redizo}_{kkov}_{z}" if z else f"{redizo}_{kkov}"


def cislo(v) -> float | None:
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def nacti(soubor: Path) -> list[dict]:
    wb = openpyxl.load_workbook(soubor, read_only=True)
    it = wb.worksheets[0].iter_rows(values_only=True)
    hlavicka = [str(h).strip() if h is not None else "" for h in next(it)]
    chybi = [s for s in POVINNE if s not in hlavicka]
    if chybi:
        raise SystemExit(f"{soubor.name}: chybí sloupce {chybi}")
    radky = []
    for r in it:
        radek = dict(zip(hlavicka, r))
        # Stejný výběr jako nabídka na webu: denní nezkrácené obory s povinnou zkouškou.
        # Denní forma má v souborech i variantu „den2“, kterou web také zobrazuje.
        if str(radek["POVINNOST JPZ"]).strip() != "1" or not str(radek["FORMA VZDĚLÁVÁNÍ"]).startswith("den") or radek["ZKRÁCENÉ STUDIUM"] != "ne":
            continue
        radky.append(radek)
    return radky


def parovaci_klic(r: dict) -> tuple:
    return tuple(str(r[s] or "").strip() for s in PAROVACI_SLOUPCE)


def otisk(soubor: Path) -> str:
    return hashlib.sha256(soubor.read_bytes()).hexdigest()


def rocnik(kolo1: Path, kolo2: Path) -> tuple[dict, dict]:
    r1, r2 = nacti(kolo1), nacti(kolo2)
    m2 = {parovaci_klic(r): r for r in r2}

    # Klíč webu nezná délku, formu ani jazyk. Kolize se vyřadí, nehádá se.
    podle_webu: dict[str, list[dict]] = {}
    for r in r1:
        podle_webu.setdefault(klic_webu(str(r["REDIZO"]), str(r["KKOV"]), r["ZAMĚŘENÍ OBORU"]), []).append(r)

    data: dict[str, dict] = {}
    stavy: Counter = Counter()
    for k, seznam in podle_webu.items():
        if len(seznam) > 1:
            stavy["kolize_klice"] += 1
            continue
        r = seznam[0]
        druhe = m2.get(parovaci_klic(r))
        if druhe:
            zaznam = {
                "stav": "vypsano",
                "kapacita": int(cislo(druhe["KAPACITA"]) or 0),
                "prihlasky": int(cislo(druhe["PŘIHLÁŠKY CELKEM"]) or 0),
                "prijati": int(cislo(druhe["PŘIJATÍ"]) or 0),
                "neveslo_se": int(cislo(druhe["NEPŘIJATI - NEDOSTATEČNÁ KAPACITA"]) or 0),
                "nesplnilo_podminky": int(cislo(druhe["NEPŘIJATI - NESPLNĚNÍ PODMÍNEK"]) or 0),
                "prijato_na_vyssi_prioritu": int(cislo(druhe["NEPŘIJATI - PŘIJAT NA VYŠŠÍ PRIORITU"]) or 0),
                "prijatych_s_vysledkem": int(cislo(druhe["ČJ+MA - KONALI (PŘIJATI)"]) or 0),
            }
            minimum = cislo(druhe["ČJ+MA - % SKÓR - MIN (PŘIJATI)"])
            if minimum is not None and zaznam["prijatych_s_vysledkem"] >= MIN_PRIJATYCH_S_VYSLEDKEM:
                zaznam["min_prijaty"] = round(minimum / 2, 1)  # procentní skór 0–200 na body 0–100
        elif (cislo(r["PŘIJATÍ"]) or 0) < (cislo(r["KAPACITA"]) or 0):
            zaznam = {"stav": "nenaplneno_bez_2_kola",
                      "kolo1_kapacita": int(cislo(r["KAPACITA"]) or 0), "kolo1_prijati": int(cislo(r["PŘIJATÍ"]) or 0)}
        else:
            zaznam = {"stav": "bez_2_kola"}
        stavy[zaznam["stav"]] += 1
        data[k] = zaznam

    sparovane = {parovaci_klic(r) for r in r1}
    meta = {
        "kolo1": kolo1.name, "kolo2": kolo2.name,
        "kolo1_sha256": otisk(kolo1), "kolo2_sha256": otisk(kolo2),
        "nabidek_kolo1": len(r1), "nabidek_kolo2": len(r2),
        "jen_ve_2_kole": sum(1 for k in m2 if k not in sparovane),
        "stavy": dict(stavy),
    }
    return data, meta


def main() -> None:
    ap = argparse.ArgumentParser(description="Druhé kolo po nabídkách.")
    ap.add_argument("--rok", type=int)
    ap.add_argument("--kolo1", type=Path)
    ap.add_argument("--kolo2", type=Path)
    ap.add_argument("--zaklad", type=Path, help="existující výstup, jehož ostatní roky se zachovají")
    ap.add_argument("--vystup", type=Path, default=VYSTUP)
    a = ap.parse_args()

    vysledek = {"meta": {}, "roky": {}}
    if a.zaklad and a.zaklad.exists():
        vysledek = json.loads(a.zaklad.read_text(encoding="utf-8"))

    if a.rok:
        if not (a.kolo1 and a.kolo2):
            raise SystemExit("--rok vyžaduje --kolo1 a --kolo2")
        ulohy = [(a.rok, a.kolo1, a.kolo2)]
    else:
        ulohy = []
        for kolo2 in sorted((KOREN / "data").glob("PZ*_kolo2_skolobory_vysledky.xlsx")):
            rok = int(kolo2.name[2:6])
            kolo1 = kolo2.with_name(kolo2.name.replace("_kolo2_", "_kolo1_"))
            if kolo1.exists():
                ulohy.append((rok, kolo1, kolo2))
        if not ulohy:
            raise SystemExit("v data/ nejsou dvojice souborů výsledků 1. a 2. kola")

    vysledek["meta"].setdefault("rocniky", {})
    for rok, kolo1, kolo2 in ulohy:
        data, meta = rocnik(kolo1, kolo2)
        vysledek["roky"][str(rok)] = data
        vysledek["meta"]["rocniky"][str(rok)] = meta
        print(f"{rok}: {len(data)} nabídek, stavy {meta['stavy']}, jen ve 2. kole {meta['jen_ve_2_kole']}")

    roky = sorted(int(r) for r in vysledek["roky"])
    vysledek["meta"].update({
        "popis": "Druhé kolo po nabídkách 1. kola. Generuje scripts/build-druhe-kolo.py, výklad docs/druhe-kolo.md.",
        "vyber": "denní nezkrácené obory s povinnou jednotnou zkouškou",
        "klic": "REDIZO_KKOV nebo REDIZO_KKOV_zamereni, normalizace jako normalizeSchoolKey",
        "min_prijatych_s_vysledkem": MIN_PRIJATYCH_S_VYSLEDKEM,
        "nejnovejsi_rok": roky[-1],
    })
    a.vystup.parent.mkdir(parents=True, exist_ok=True)
    a.vystup.write_text(json.dumps(vysledek, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"zapsáno {a.vystup}")


if __name__ == "__main__":
    main()
