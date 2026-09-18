#!/usr/bin/env python3
"""Ověření mapy sloupců maturitních souborů proti listu „vysvetlivky“.

Přejímací podmínka 2 maturitního návrhu (docs/maturitni-vysledky-a-kvalita-skoly-2027.md, §8)
žádá, aby ETL zachovalo původní jednotky, populaci a vysvětlivky. §9.1 navíc popisuje past:
v souborech JPZ nese sloupec směrodatné odchylky v názvu slovo „percentil“, takže naivní
hledání podle názvu uloží do percentilu odchylku. Chyba se neprojeví jako výpadek, ale jako
falešně vysoká korelace, tedy jako výsledek, který by vedl k publikaci.

Shoda názvu sloupce ale nedokazuje, že v něm je to, co vysvětlivky slibují. Skript proto dělá
obojí: porovná názvy s mapou z build-maturita-skoly.py **a dopočítá podíly z počtů**. Když
`PODÍL ÚSPĚŠNÝCH (%)` nevychází jako USPĚLI / PŘIHLÁŠENI, je sloupec jiný, než si myslíme,
bez ohledu na to, jak se jmenuje.

    python3 scripts/overeni-sloupcu-maturity.py \
        --soubor 2021=/cesta/MZ2021j_SC_skolobory.xlsx ... \
        --vystup docs/podklady/overeni-sloupcu-maturity.json

Skončí nenulově, když kterákoli kontrola selže.
"""
from __future__ import annotations

import argparse
import datetime as dt
import importlib.util
import json
import statistics
import sys
from pathlib import Path

import openpyxl

KOREN = Path(__file__).resolve().parent.parent


def _build_modul():
    """build-maturita-skoly.py má v názvu pomlčky, proto import přes cestu."""
    cesta = KOREN / "scripts" / "build-maturita-skoly.py"
    spec = importlib.util.spec_from_file_location("build_maturita_skoly", cesta)
    modul = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(modul)
    return modul


B = _build_modul()

# Podíly, které jde dopočítat z počtů téhož bloku. Definice jsou opsané z listu „vysvetlivky“:
# čistá neúspěšnost z konajících, hrubá neúspěšnost a podíl úspěšných z přihlášených.
DOPOCTY = {
    "PODIL USPESNYCH (%)": ("USPELI", ("PRIHLASENI",)),
    "CISTA NEUSPESNOST (%)": ("NEUSPELI", ("KONALI",)),
    "HRUBA NEUSPESNOST (%)": (("NEUSPELI", "NEKONALI"), ("PRIHLASENI",)),
    "NEUCAST (%)": ("NEKONALI", ("PRIHLASENI",)),
}
TOLERANCE = 0.05  # procentní body; zdroj zaokrouhluje na dvě desetinná místa


def hlavicka(ws) -> tuple[dict, dict, list]:
    """Vrátí (mapa (blok, sloupec) -> index, ident sloupec -> index, druhý řádek hlavičky)."""
    radky = ws.iter_rows(values_only=True)
    predchozi = None
    for radek in radky:
        if any(B.bez_diakritiky(v) == "TRIDENI" for v in radek):
            hlavicka2, hlavicka1 = radek, predchozi or [None] * len(radek)
            break
        predchozi = radek
    else:
        raise ValueError("nenalezena hlavička se sloupcem TŘÍDĚNÍ")

    blok, mapa, ident = None, {}, {}
    for i, (h1, h2) in enumerate(zip(hlavicka1, hlavicka2)):
        n1, n2 = B.bez_diakritiky(h1), B.bez_diakritiky(h2)
        if n1 and "VYSLEDKY" not in n1 and not n1.isdigit():
            blok = n1
        if blok is None:
            ident[n2] = i
        else:
            mapa[(blok, n2)] = i
    return mapa, ident, list(radky)


def vysvetlivky(wb) -> dict:
    """Definice ukazatelů z listu „vysvetlivky“: {název ukazatele: celá věta}.

    Bere se jen část za nadpisem „Použité ukazatele“. Nad ním je číselník tříd a skupin oborů,
    jehož řádky mají stejný tvar „něco - něco“ a do soupisu ukazatelů nepatří.
    """
    listy = [s for s in wb.sheetnames if B.bez_diakritiky(s).startswith("VYSVETLIVKY")]
    if not listy:
        return {}
    ws = wb[listy[0]]
    definice, za_nadpisem = {}, False
    for radek in ws.iter_rows(values_only=True):
        for bunka in radek:
            text = str(bunka or "").strip()
            if B.bez_diakritiky(text) == "POUZITE UKAZATELE":
                za_nadpisem = True
            elif za_nadpisem and " - " in text:
                nazev, _, popis = text.partition(" - ")
                definice[B.bez_diakritiky(nazev)] = {"nazev": nazev.strip(), "popis": popis.strip()}
    return definice


def overeni_roku(cesta: Path, rok: int) -> dict:
    wb = openpyxl.load_workbook(cesta, read_only=True)
    ws = wb[str(rok)] if str(rok) in wb.sheetnames else wb.worksheets[0]
    mapa, ident, _ = hlavicka(ws)
    nase_bloky = set(B.BLOKY.values())

    nalezy: list[str] = []
    chybi_povinne = sorted(f"{b} / {s}" for b, s in B.POVINNE - set(mapa))
    if chybi_povinne:
        nalezy.append(f"chybí povinné sloupce: {', '.join(chybi_povinne)}")
    chybi_ident = [s for s in ("TRIDENI", "REDIZO", "NAZEV SKOLY", "SMO16") if s not in ident]
    if chybi_ident:
        nalezy.append(f"chybí identifikační sloupce: {', '.join(chybi_ident)}")

    # Sloupce, které v našich blocích jsou, ale mapa je nebere. Zamlčený sloupec je rozhodnutí,
    # ne náhoda, proto se vypisuje; nový sloupec v novém ročníku se tu objeví jako první.
    nemapovane = sorted(f"{b} / {s}" for b, s in mapa if b in nase_bloky and s not in B.SLOUPCE)

    # Dopočet podílů z počtů: důkaz, že sloupec nese to, co vysvětlivky slibují.
    kontroly: dict[str, dict] = {}
    rozsahy: dict[str, dict] = {}
    sloupce_rozsahu = ("PRUMERNY % SKOR", "SMERODATNA ODCHYLKA % SKORU", "PRUMERNE PERCENTILOVE UMISTENI")
    hodnoty_rozsahu: dict[tuple[str, str], list[float]] = {}
    radky = ws.iter_rows(values_only=True)
    pocty = {"redizo": 0, "redizo_smo16": 0}
    for radek in radky:
        trideni = str(radek[ident["TRIDENI"]] or "").strip()
        if trideni not in pocty:
            continue
        pocty[trideni] += 1
        for blok in nase_bloky:
            for sloupec, (citatel, jmenovatel) in DOPOCTY.items():
                idx = mapa.get((blok, sloupec))
                if idx is None:
                    continue
                uvedeno = B.cislo(radek[idx])
                casti = (citatel,) if isinstance(citatel, str) else citatel
                slozky = [B.cislo(radek[mapa[(blok, c)]]) if (blok, c) in mapa else None for c in casti]
                delitele = [B.cislo(radek[mapa[(blok, j)]]) if (blok, j) in mapa else None for j in jmenovatel]
                if uvedeno is None or None in slozky or None in delitele or not delitele[0]:
                    continue
                k = kontroly.setdefault(f"{blok} / {sloupec}", {
                    "vzorec": f"({' + '.join(casti)}) / {jmenovatel[0]}", "radku": 0, "neshod": 0, "nejvetsi_rozdil": 0.0})
                rozdil = abs(uvedeno - 100 * sum(slozky) / delitele[0])
                k["radku"] += 1
                k["nejvetsi_rozdil"] = round(max(k["nejvetsi_rozdil"], rozdil), 4)
                if rozdil > TOLERANCE:
                    k["neshod"] += 1
            for sloupec in sloupce_rozsahu:
                idx = mapa.get((blok, sloupec))
                hodnota = B.cislo(radek[idx]) if idx is not None else None
                if hodnota is not None:
                    hodnoty_rozsahu.setdefault((blok, sloupec), []).append(hodnota)

    for (blok, sloupec), hodnoty in sorted(hodnoty_rozsahu.items()):
        rozsahy[f"{blok} / {sloupec}"] = {
            "hodnot": len(hodnoty), "min": round(min(hodnoty), 2), "median": round(statistics.median(hodnoty), 2),
            "max": round(max(hodnoty), 2),
        }

    for klic, k in kontroly.items():
        if k["neshod"]:
            nalezy.append(f"{klic}: {k['neshod']} z {k['radku']} řádků neodpovídá vzorci {k['vzorec']}")

    # Záměna odchylky za percentil (past §9.1): percentil má medián kolem 50 a sahá k 100,
    # odchylka se drží nízko. Kdyby se sloupce prohodily, mediány si vymění řád.
    for blok in sorted(nase_bloky):
        odchylka = rozsahy.get(f"{blok} / SMERODATNA ODCHYLKA % SKORU")
        percentil = rozsahy.get(f"{blok} / PRUMERNE PERCENTILOVE UMISTENI")
        if odchylka and percentil and odchylka["median"] >= percentil["median"]:
            nalezy.append(f"{blok}: medián směrodatné odchylky ({odchylka['median']}) není nižší než medián "
                          f"percentilu ({percentil['median']}); sloupce mohou být prohozené")

    definice = vysvetlivky(wb)
    if not definice:
        nalezy.append("list „vysvetlivky“ chybí nebo neobsahuje definice ukazatelů")

    return {
        "rok": rok,
        "soubor": cesta.name,
        "sha256": B.sha256(cesta),
        "url": B.URL.format(rok=rok),
        "listy": wb.sheetnames,
        "sloupcu": len(mapa) + len(ident),
        "bloky": sorted({b for b, _ in mapa}),
        "radku": pocty,
        "vysvetlivky": definice,
        "nemapovane_sloupce_v_nasich_blocich": nemapovane,
        "dopocty": kontroly,
        "rozsahy": rozsahy,
        "nalezy": nalezy,
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--soubor", action="append", required=True, help="ROK=cesta k MZ{rok}j_SC_skolobory.xlsx")
    ap.add_argument("--vystup", default="docs/podklady/overeni-sloupcu-maturity.json")
    args = ap.parse_args()

    soubory = {}
    for s in args.soubor:
        rok, _, cesta = s.partition("=")
        soubory[int(rok)] = Path(cesta)

    roky = [overeni_roku(cesta, rok) for rok, cesta in sorted(soubory.items())]

    # Shoda schématu mezi ročníky: jediný důvod, proč lze starší ročník přebrat stejným skriptem.
    schemata = {r["rok"]: (tuple(r["bloky"]), r["sloupcu"]) for r in roky}
    jedno_schema = len(set(schemata.values())) == 1

    vystup = {
        "popis": "Ověření mapy sloupců build-maturita-skoly.py proti hlavičce a listu „vysvetlivky“ "
                 "souborů MZ{rok}j_SC_skolobory.xlsx. Přejímací podmínka 2 maturitního návrhu, §8.",
        "overeno": dt.date.today().isoformat(),
        "mapa_skriptu": {"bloky": B.BLOKY, "sloupce": B.SLOUPCE,
                         "povinne": sorted(f"{b} / {s}" for b, s in B.POVINNE)},
        "tolerance_dopoctu_p_b": TOLERANCE,
        "schema_shodne_mezi_rocniky": jedno_schema,
        "roky": roky,
    }
    cesta = Path(args.vystup)
    cesta.parent.mkdir(parents=True, exist_ok=True)
    cesta.write_text(json.dumps(vystup, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    nalezy = [(r["rok"], n) for r in roky for n in r["nalezy"]]
    for r in roky:
        print(f"{r['rok']}: {r['radku']['redizo']} škol, {r['radku']['redizo_smo16']} škol ve skupině oborů, "
              f"{len(r['bloky'])} bloků, dopočtů {len(r['dopocty'])}, nálezů {len(r['nalezy'])}")
    print(f"schéma shodné mezi ročníky: {'ano' if jedno_schema else 'NE'}")
    if not jedno_schema:
        nalezy.append(("—", "schéma se mezi ročníky liší; mapa sloupců platí jen pro část z nich"))
    for rok, n in nalezy:
        print(f"  NÁLEZ {rok}: {n}", file=sys.stderr)
    print(f"doklad: {cesta}")
    return 1 if nalezy else 0


if __name__ == "__main__":
    sys.exit(main())
