#!/usr/bin/env python3
"""Doklad ke dvěma rozhodnutím o stránce oboru: jemnost škály a rozbor předmětů.

Odpovídá na dvě otázky, na kterých stojí text ve slovníku ukazatelů a v návrhu
vrstev stránky oboru:

1. **Snesla by škála obtížnosti sedm stupňů místo pěti?** Měří se tím, jak často
   nabídka zůstane mezi dvěma ročníky ve stejném stupni. Jemnější škála
   rozlišuje víc, ale přehazuje nálepku častěji.
2. **Dá se slabší předmět dohnat tím druhým?** Měří se podlaha slabšího předmětu
   mezi přijatými a podíl přijatých s nevyrovnaným výsledkem, po skupinách
   obtížnosti přijetí a typů studia.

Obojí bylo dřív spočítané jednorázově mimo repozitář, takže tvrzení nešlo
ověřit ani přepočítat po změně párování ročníků. Tenhle skript je doklad.

Použití:
    python3 scripts/rozbor-skaly-a-predmetu.py
    python3 scripts/rozbor-skaly-a-predmetu.py --bez-predmetu   # jen škála, bez čtení XLSX
"""

from __future__ import annotations

import argparse
import collections
import json
import statistics
from pathlib import Path
from typing import Any

KOREN = Path(__file__).resolve().parent.parent
VYSTUP = KOREN / "docs" / "podklady" / "rozbor-skaly-a-predmetu.json"
MIN_SOUTEZICICH = 10   # pod tímto počtem se zařazení nezobrazuje (slovník ukazatelů)
MIN_PRIJATYCH = 10     # pod tímto počtem je rozbor předmětů údaj o jednotlivci
NEVYROVNANY_ROZDIL = 10


def zobrazene_obdobi(sada: str) -> str:
    registr = json.loads((KOREN / "public" / "stav_datovych_sad.json").read_text(encoding="utf-8"))
    return registr["sady"][sada]["zobrazeno"]["obdobi"]


def podil(r: dict) -> float | None:
    """Podíl přijatých ze soutěžících; None, když kapacita nerozhodovala."""
    prijati, nevesli = r.get("prijati"), r.get("capacity_rejected")
    if prijati is None or nevesli is None or nevesli == 0:
        return None
    return prijati / (prijati + nevesli)


def stupen(q: float, stupnu: int) -> str:
    """Zařazení do škály o daném počtu stupňů; pět stupňů odpovídá slovníku."""
    if stupnu == 5:
        return "velmi_tezke" if q < 1 / 3 else "tezke" if q < 1 / 2 else "stredne_tezke" if q < 2 / 3 else "vetsina_uspela"
    for i in range(1, stupnu):
        if q < i / stupnu:
            return f"s{i}"
    return f"s{stupnu}"


def stabilita_skaly(novy: str, stary: str) -> dict[str, Any]:
    """Jak často zůstane nabídka mezi ročníky ve stejném stupni."""
    nabidky = json.loads((KOREN / "public" / "souhrny_kolo1.json").read_text(encoding="utf-8"))["nabidky"]
    par = f"{stary}-{novy}"
    shody = collections.Counter()
    pocet = 0
    for v in nabidky.values():
        a, b = v.get("roky", {}).get(stary), v.get("roky", {}).get(novy)
        if not a or not b or par not in v.get("parovani", {}):
            continue
        qa, qb = podil(a), podil(b)
        if qa is None or qb is None:
            continue
        if a["prijati"] + a["capacity_rejected"] < MIN_SOUTEZICICH:
            continue
        if b["prijati"] + b["capacity_rejected"] < MIN_SOUTEZICICH:
            continue
        pocet += 1
        for stupnu in (5, 7):
            shody[stupnu] += stupen(qa, stupnu) == stupen(qb, stupnu)
    return {
        "rocniky": [stary, novy],
        "nabidek": pocet,
        "podminka": f"spárováno a aspoň {MIN_SOUTEZICICH} soutěžících v obou letech",
        "stejne_zarazeni_pct": {str(s): round(shody[s] / pocet * 100, 1) for s in (5, 7)} if pocet else {},
        "zaver": "jemnější škála přehazuje nálepku podstatně častěji; pět stupňů zůstává",
    }


def rozbor_predmetu(rok: str) -> dict[str, Any]:
    """Podlaha slabšího předmětu a podíl nevyrovnaných po skupinách."""
    import openpyxl

    zdroj = KOREN / "data" / f"PZ{rok}_kolo1_uchazeci_prihlasky_vysledky.xlsx"
    if not zdroj.exists():
        return {"chyba": f"zdroj {zdroj.name} není v data/; rozbor předmětů se nepočítal"}

    wb = openpyxl.load_workbook(zdroj, read_only=True)
    it = wb.worksheets[0].iter_rows(values_only=True)
    ix = {n: i for i, n in enumerate(next(it))}
    prijati: dict[str, list[tuple[float, float]]] = collections.defaultdict(list)
    for radek in it:
        cj, ma = radek[ix["c_procentni_skor"]], radek[ix["m_procentni_skor"]]
        if cj is None or ma is None:
            continue
        dvojice = (float(cj) / 2, float(ma) / 2)
        for k in range(1, 6):
            redizo, kkov = radek[ix[f"ss{k}_redizo"]], radek[ix[f"ss{k}_kkov"]]
            if redizo and kkov and str(radek[ix[f"ss{k}_prijat"]]).strip() == "1":
                prijati[f"{redizo}_{kkov}"].append(dvojice)

    nabidky = json.loads((KOREN / "public" / "souhrny_kolo1.json").read_text(encoding="utf-8"))["nabidky"]
    zarazeni, skupiny = {}, {}
    for v in nabidky.values():
        r = v.get("roky", {}).get(rok)
        if r:
            klic = f"{v['redizo']}_{v['kkov']}"
            zarazeni[klic] = r.get("zarazeni_obtiznosti")
            skupiny[klic] = v["skupina"].split("_")[0]

    radky = []
    for klic, dvojice in prijati.items():
        if len(dvojice) < MIN_PRIJATYCH:
            continue
        radky.append({
            "zarazeni": zarazeni.get(klic),
            "typ": skupiny.get(klic),
            "podlaha": min(min(c, m) for c, m in dvojice),
            "nevyrovnanych_podil": sum(1 for c, m in dvojice if abs(c - m) >= NEVYROVNANY_ROZDIL) / len(dvojice),
        })

    def souhrn(vyber: list[dict]) -> dict[str, Any]:
        return {
            "oboru": len(vyber),
            "median_podlahy": round(statistics.median(r["podlaha"] for r in vyber), 1),
            "median_podilu_nevyrovnanych_pct": round(statistics.median(r["nevyrovnanych_podil"] for r in vyber) * 100),
        }

    poradi = ["velmi_tezke", "tezke", "stredne_tezke", "vetsina_uspela", "kapacita_nerozhodovala"]
    return {
        "rok": rok,
        "oboru_s_rozborem": len(radky),
        "podminka": f"aspoň {MIN_PRIJATYCH} přijatých s výsledkem obou testů",
        "podle_obtiznosti": {z: souhrn([r for r in radky if r["zarazeni"] == z])
                             for z in poradi if any(r["zarazeni"] == z for r in radky)},
        "podle_typu": {t: souhrn([r for r in radky if r["typ"] == t])
                       for t in sorted({r["typ"] for r in radky if r["typ"]})},
        "zaver": "podlaha slabšího předmětu roste s obtížností plynule, ale nevyrovnanost sama překážkou není",
    }


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--bez-predmetu", action="store_true", help="Spočítá jen škálu, bez čtení zdrojového XLSX.")
    ap.add_argument("--vystup", type=Path, default=VYSTUP)
    args = ap.parse_args()

    rok = zobrazene_obdobi("cermat-vysledky")
    predchozi = str(int(rok) - 1)
    doklad: dict[str, Any] = {
        "popis": "Doklad k jemnosti škály obtížnosti a k rozboru výsledků přijatých po předmětech.",
        "generator": "scripts/rozbor-skaly-a-predmetu.py",
        "skala_obtiznosti": stabilita_skaly(rok, predchozi),
    }
    if not args.bez_predmetu:
        doklad["rozbor_predmetu"] = rozbor_predmetu(zobrazene_obdobi("cermat-uchazeci-kolo1"))

    args.vystup.write_text(json.dumps(doklad, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    s = doklad["skala_obtiznosti"]
    print(f"škála: {s['nabidek']} nabídek, stejné zařazení {s['stejne_zarazeni_pct']}")
    if "rozbor_predmetu" in doklad and "chyba" not in doklad["rozbor_predmetu"]:
        p = doklad["rozbor_predmetu"]
        print(f"předměty: {p['oboru_s_rozborem']} oborů; "
              + ", ".join(f"{k} {v['median_podlahy']}" for k, v in p["podle_obtiznosti"].items()))


if __name__ == "__main__":
    main()
