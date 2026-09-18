#!/usr/bin/env python3
"""Kolik let maturitní řady má smysl brát do „počtu let nad středem podobných škol“.

Maturitní návrh (docs/maturitni-vysledky-a-kvalita-skoly-2027.md, §10) vedl mezi nedodělky
položku „ročníky 2015–2022“: výstup nese jen jaro 2023–2026, takže ukazatel stojí na krátké
historii. Skript tu domněnku měří, místo aby se přijala.

Zdrojová řada může být delší: soubory MZ{rok}j_SC_skolobory.xlsx jdou zpět k roku 2015, ale
společná část před rokem 2021 je na jiné škále (návrh §2.1), takže použitelné navíc jsou jen
ročníky 2021 a 2022. Doklad se počítá nad výstupem sestaveným ze všech šesti:

    python3 scripts/build-maturita-skoly.py --soubor 2021=… … --soubor 2026=… --vystup /tmp/mat6.json
    python3 scripts/delka-rady-maturity.py --maturita /tmp/mat6.json \
        --vystup docs/podklady/delka-rady-maturity.json

Měří se dvě věci:

1. **Předpovědní schopnost okna.** Z let před posledním ročníkem se vezme většinové zařazení
   a porovná se se skutečným zařazením posledního ročníku. Když delší okno netrefí lépe,
   prodlužovat řadu ukazateli nepomůže. Počítá se zvlášť pro malé školy (pod 30 konajícími
   češtinu), protože právě u nich má být jeden rok šum.
2. **Dopad na znění.** Kolik školám ve skupině oborů by se změnila věta o frekvenci
   a kolik by jich z ukazatele vypadlo, protože starší zařazení nemají.

Podmínky, bez kterých čísla nevyjdou: zařazení je stav `cj.groupComparison.state`, tedy jen
čeština a jen školy s aspoň deseti konajícími; páry bez zařazení ve **všech** letech okna se
nepočítají, proto se s délkou okna zmenšuje i počet porovnaných párů.
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
from collections import Counter
from pathlib import Path

MALA_SKOLA_POD = 30


def zaznam(skola: dict, rok: int, smo16: str) -> dict:
    return skola["roky"].get(str(rok), {}).get(smo16, {})


def stav(skola: dict, rok: int, smo16: str) -> str | None:
    return (zaznam(skola, rok, smo16).get("cj", {}).get("groupComparison") or {}).get("state")


def vetsinovy_stav(rada: list[str | None]) -> str | None:
    """Většinové zařazení okna. Při rovnosti vyhrává střední stav, jinak se pár nepočítá."""
    pocty = Counter(s for s in rada if s)
    if not pocty:
        return None
    nejvic = max(pocty.values())
    vitezove = [s for s, n in pocty.items() if n == nejvic]
    if len(vitezove) == 1:
        return vitezove[0]
    return "indistinguishable" if "indistinguishable" in vitezove else None


def dvojice(data: dict) -> list[tuple[dict, str]]:
    vystup = []
    for skola in data["skoly"].values():
        skupiny = {s for rok in skola["roky"].values() for s in rok if s != "CELKEM"}
        vystup.extend((skola, s) for s in skupiny)
    return vystup


def frekvence(rada: list[str | None]) -> str | None:
    """Znění podle slovníku, heslo Frekvence let nad středem podobných škol."""
    se_zarazenim = [s for s in rada if s]
    if not se_zarazenim:
        return None
    podil = sum(1 for s in se_zarazenim if s == "above") / len(se_zarazenim)
    if podil == 1:
        return "každý rok"
    if podil >= 0.75:
        return "téměř každý rok"
    if podil > 0.5:
        return "ve většině let"
    if podil == 0.5:
        return "zhruba v polovině let"
    return "jen v některých letech" if podil > 0 else "v žádném ze sledovaných let"


def predpoved(pary, posledni: int, delka: int, filtr) -> dict:
    roky = list(range(posledni - delka, posledni))
    sedi = celkem = 0
    for skola, smo16 in pary:
        skutecnost = stav(skola, posledni, smo16)
        konalo = zaznam(skola, posledni, smo16).get("cj", {}).get("took")
        if not skutecnost or not konalo or not filtr(konalo):
            continue
        rada = [stav(skola, r, smo16) for r in roky]
        if not all(rada):
            continue
        odhad = vetsinovy_stav(rada)
        if odhad is None:
            continue
        celkem += 1
        sedi += odhad == skutecnost
    return {"okno_let": delka, "roky_okna": roky, "paru": celkem,
            "sedi": sedi, "podil_%": round(100 * sedi / celkem, 1) if celkem else None}


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--maturita", required=True, help="výstup build-maturita-skoly.py s delší řadou")
    ap.add_argument("--kratke-okno", type=int, default=4, help="okno, které web používá dnes")
    ap.add_argument("--vystup", default="docs/podklady/delka-rady-maturity.json")
    args = ap.parse_args()

    data = json.loads(Path(args.maturita).read_text(encoding="utf-8"))
    roky = sorted(data["meta"]["roky"])
    posledni = roky[-1]
    pary = dvojice(data)

    skupiny_filtru = {
        "vsechny": lambda n: True,
        f"male_pod_{MALA_SKOLA_POD}_konajicich": lambda n: n < MALA_SKOLA_POD,
        f"velke_od_{MALA_SKOLA_POD}_konajicich": lambda n: n >= MALA_SKOLA_POD,
    }
    maximalni_okno = len(roky) - 1
    predpovedi = {nazev: [predpoved(pary, posledni, d, filtr) for d in range(1, maximalni_okno + 1)]
                  for nazev, filtr in skupiny_filtru.items()}

    # Dopad na znění: krátké okno, které web používá, proti nejdelšímu možnému.
    kratke = roky[-args.kratke_okno:]
    dlouhe = roky
    uplne_kratke = [(s, m) for s, m in pary if all(stav(s, r, m) for r in kratke)]
    uplne_dlouhe = [(s, m) for s, m in pary if all(stav(s, r, m) for r in dlouhe)]
    zmeny = Counter()
    for skola, smo16 in uplne_dlouhe:
        k = frekvence([stav(skola, r, smo16) for r in kratke])
        d = frekvence([stav(skola, r, smo16) for r in dlouhe])
        if k != d:
            zmeny[f"{k} → {d}"] += 1

    vystup = {
        "popis": "Má smysl prodlužovat maturitní řadu kvůli ukazateli „počet let nad středem podobných škol“? "
                 "Předpovědní schopnost okna a dopad na znění. Podmínky výpočtu jsou v hlavičce skriptu.",
        "spocteno": dt.date.today().isoformat(),
        "zdroj": {"soubor": args.maturita, "roky": roky, "skol": len(data["skoly"]),
                  "skol_ve_skupine_oboru": len(pary)},
        "predpoved_posledniho_rocniku": {"rocnik": posledni, "podle_skupin": predpovedi},
        "dopad_na_zneni": {
            "kratke_okno": kratke,
            "dlouhe_okno": dlouhe,
            "se_zarazenim_ve_vsech_letech_kratkeho_okna": len(uplne_kratke),
            "se_zarazenim_ve_vsech_letech_dlouheho_okna": len(uplne_dlouhe),
            "zneni_se_lisi": sum(zmeny.values()),
            "zmeny": dict(zmeny.most_common()),
        },
    }
    cesta = Path(args.vystup)
    cesta.parent.mkdir(parents=True, exist_ok=True)
    cesta.write_text(json.dumps(vystup, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    for nazev, rada in predpovedi.items():
        print(nazev + ":")
        for r in rada:
            print(f"  okno {r['okno_let']} let ({r['roky_okna'][0]}–{r['roky_okna'][-1]}): "
                  f"{r['paru']} párů, sedí {r['podil_%']} %")
    d = vystup["dopad_na_zneni"]
    print(f"zařazení ve všech letech: krátké okno {d['se_zarazenim_ve_vsech_letech_kratkeho_okna']}, "
          f"dlouhé {d['se_zarazenim_ve_vsech_letech_dlouheho_okna']}")
    print(f"znění by se lišilo u {d['zneni_se_lisi']} škol ve skupině oborů")
    print(f"doklad: {cesta}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
