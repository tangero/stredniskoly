#!/usr/bin/env python3
"""Datová linka: zjištění, příprava, oznámení, schválení a předání nových dat.

Plán, stavy úloh a bezpečnostní hranice: docs/datova-linka.md.

    python3 scripts/datova-linka.py beh --kanal telegram       # zjisti + priprav + oznam
    python3 scripts/datova-linka.py stav
    python3 scripts/datova-linka.py schvaleni                  # přečte odpovědi z Telegramu
    python3 scripts/datova-linka.py schvaleni --kod K7Q2 --rozhodnuti schvaleno
    python3 scripts/datova-linka.py predej --vse-schvalene --kanal telegram
    python3 scripts/datova-linka.py znovu GQ99C --duvod "sada dostala zpracovatele"

Každý krok přijímá --nanecisto: nic nepošle, nic nepushne a vypíše, co by udělal.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from linka import jadro, komunikace, predani, zpracovani  # noqa: E402


def krok_zjisti(fronta: dict, registr: dict) -> None:
    beh = jadro.zjisti(registr, fronta)
    print(f"zjištění: {len(beh['nove_ulohy'])} nových úloh, {len(beh['informace'])} informací, "
          f"{len(beh['nedostupne'])} nedostupných adres")
    for k in beh["nove_ulohy"]:
        u = fronta["ulohy"][k]
        print(f"  úloha {k}: {u['sada']} {u['obdobi']} {u['druh']}")
    for i in beh["informace"]:
        print(f"  informace: {i['sada']} {i['obdobi']} {i['druh']}")
    for n in beh["nedostupne"]:
        print(f"  nedostupné: {n['sada']} {n['url']} ({n['stav']} {n['chyba']})")


def krok_priprav(fronta: dict, registr: dict) -> None:
    for u in fronta["ulohy"].values():
        if u["stav"] == "zjisteno":
            print(f"příprava {u['kod']} {u['sada']} {u['obdobi']} …", flush=True)
            zpracovani.priprav(u, registr)
            print(f"  → {u['stav']}" + (f": {u['priprava'].get('chyba')}" if u["stav"] == "selhalo" else ""))


def krok_oznam(fronta: dict, kanaly: list[str], nanecisto: bool) -> None:
    kody = komunikace.oznam(fronta, kanaly, nanecisto)
    print(f"oznámení: {', '.join(kody) if kody else 'nic nového'} přes {['soubor', *kanaly]}")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--nanecisto", action="store_true", help="nic neposílat ven, jen vypsat")
    sub = ap.add_subparsers(dest="prikaz", required=True)
    for nazev in ("zjisti", "priprav", "stav"):
        sub.add_parser(nazev)
    for nazev in ("oznam", "beh"):
        s = sub.add_parser(nazev)
        s.add_argument("--kanal", action="append", choices=["telegram", "github"], default=[])
    s = sub.add_parser("schvaleni")
    s.add_argument("--kanal", action="append", choices=["telegram", "github"], default=[])
    s.add_argument("--kod")
    s.add_argument("--rozhodnuti", choices=["schvaleno", "zamitnuto"])
    s = sub.add_parser("znovu")
    s.add_argument("kod")
    s.add_argument("--duvod", required=True)
    s = sub.add_parser("predej")
    s.add_argument("--kanal", action="append", choices=["telegram", "github"], default=[])
    s.add_argument("kod", nargs="?")
    s.add_argument("--vse-schvalene", action="store_true")
    a = ap.parse_args()

    registr = jadro.nacti_registr()
    fronta = jadro.nacti_frontu()
    chyby: list[str] = []

    if a.prikaz == "stav":
        for u in sorted(fronta["ulohy"].values(), key=lambda x: x["vytvoreno"]):
            print(f"{u['kod']}  {u['stav']:11} {u['sada']:24} {str(u['obdobi']):10} {u['druh']}")
        return

    if a.prikaz == "znovu":
        jadro.znovu_otevri(fronta["ulohy"][a.kod], a.duvod)
        print(f"{a.kod}: znovu otevřeno, další běh ji připraví a oznámí")

    if a.prikaz in ("zjisti", "beh"):
        krok_zjisti(fronta, registr)
    if a.prikaz in ("priprav", "beh"):
        krok_priprav(fronta, registr)
    if a.prikaz in ("oznam", "beh"):
        krok_oznam(fronta, a.kanal, a.nanecisto)

    if a.prikaz == "schvaleni":
        if a.kod:
            if not a.rozhodnuti:
                sys.exit("--kod vyžaduje --rozhodnuti")
            zpravy = [{"od": "příkazová řádka", "povoleny": True, "cas": jadro.ted(), "text": f"{'schvaluji' if a.rozhodnuti == 'schvaleno' else 'zamitam'} {a.kod}"}]
            udalosti = komunikace.zpracuj_zpravy(fronta, zpravy, "příkazová řádka")
            kanaly = a.kanal
        else:
            udalosti = []
            kanaly = a.kanal or ["telegram"]
            if "telegram" in kanaly:
                udalosti += komunikace.zpracuj_zpravy(fronta, komunikace.zpravy_telegramu(), "telegram")
            if "github" in kanaly:
                udalosti += komunikace.zpracuj_zpravy(fronta, komunikace.zpravy_githubu(fronta), "github")
        popisy = [komunikace.popis_udalosti(e, fronta) for e in udalosti]
        print("schválení: " + ("; ".join(popisy) if popisy else "žádné nové rozhodnutí"))
        chyby += komunikace.potvrd(fronta, udalosti, kanaly, a.nanecisto, registr)

    if a.prikaz == "predej":
        kody = [u["kod"] for u in fronta["ulohy"].values() if u["stav"] == "schvaleno"] if a.vse_schvalene else [a.kod]
        telegram, komentare, zavrit = [], {}, []
        for k in filter(None, kody):
            u = fronta["ulohy"][k]
            try:
                vysledek = predani.predej(u, registr, a.nanecisto)
            except Exception as e:  # jedna úloha nesmí zastavit ostatní ani uložení fronty
                chyba = str(e)
                print(f"předání {k} selhalo: {chyba}", file=sys.stderr)
                chyby.append(f"předání {k}: {chyba}")
                if not a.nanecisto and u.get("predani_chyba", {}).get("chyba") != chyba:
                    u["predani_chyba"] = {"cas": jadro.ted(), "chyba": chyba}
                    telegram.append(komunikace.text_predani(u, chyba=chyba))
                    if u.get("issue"):
                        komentare.setdefault(komunikace.cislo_issue(u["issue"]), []).append(telegram[-1])
                continue
            if a.nanecisto:
                print(f"[nanečisto] předání {k}: větev {vysledek['plan']['vetev']}")
                for prikaz in vysledek.get("prikazy", []):
                    print("   " + " ".join(prikaz))
                if vysledek.get("poznamka"):
                    print("   " + vysledek["poznamka"])
                continue
            u.pop("predani_chyba", None)
            print(f"předání {k}: {vysledek.get('pull_request') or vysledek.get('poznamka')}")
            telegram.append(komunikace.text_predani(u, vysledek))
            if u.get("issue"):
                cislo = komunikace.cislo_issue(u["issue"])
                komentare.setdefault(cislo, []).append(telegram[-1])
                zavrit.append(cislo)
        if telegram:
            chyby += komunikace.rozesli(fronta, telegram, komentare, a.kanal, a.nanecisto, tuple(zavrit))

    if not a.nanecisto or a.prikaz in ("zjisti", "priprav"):
        jadro.uloz_frontu(fronta)
    else:
        print("[nanečisto] fronta neuložena")
    if chyby:
        sys.exit(f"{len(chyby)} chyb, fronta je uložena: " + "; ".join(chyby))


if __name__ == "__main__":
    main()
