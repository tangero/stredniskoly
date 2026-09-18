#!/usr/bin/env python3
"""Kolika stránek oborů se týkají obory, které přehled nezahrnuje.

    python3 scripts/dopad-mimo-prehled.py

Proč to je skript a ne číslo v textu: code review PR #99 upozornilo, že tvrzení
„týká se to 308 z 2 792 stránek oborů“ nejde nijak přepočítat. Číslo se navíc
mění s každým ročníkem dat, takže napsané v dokumentaci zastará. Tady se spočítá
z týchž tří vstupů, ze kterých ho bere web, a proto je kdykoli přezkoumatelné.

Počítá se **tak, jak stránka skutečně vypadá**:

* období bere z registru stavu datových sad, nikdy z letopočtu v kódu,
* stránka oboru existuje jen pro obor z katalogu (`schools_data.json`),
* soused se v tabulce zobrazí od deseti společných uchazečů,
* název a zařazení se dohledávají v katalogu **přes všechny ročníky**, takže
  soused, který v katalogu je jen v jednom roce, značku nedostane.

Kdo tyhle čtyři podmínky nedodrží, dostane jiné číslo.
"""
from __future__ import annotations

import json
from pathlib import Path

KOREN = Path(__file__).resolve().parent.parent

# Od kolika společných uchazečů tabulka souseda zobrazí (src/lib/obor-profil.ts).
MEZ_UCHAZECU = 10
SADA = "cermat-uchazeci-kolo1"


def zobrazene_obdobi(sada: str = SADA) -> str:
    """Období sady z registru; jediné místo, které určuje zobrazený ročník."""
    registr = json.loads((KOREN / "public" / "stav_datovych_sad.json").read_text(encoding="utf-8"))
    return registr["sady"][sada]["zobrazeno"]["obdobi"]


def klice_katalogu() -> set[str]:
    """Obory, které katalog vede, přes všechny ročníky — stejně jako `nazvyOboru()` na webu."""
    data = json.loads((KOREN / "public" / "schools_data.json").read_text(encoding="utf-8"))
    return {
        f"{z['redizo']}_{z.get('kkov') or z['id'].split('_')[1]}"
        for rok in data
        for z in data.get(rok) or []
    }


def dopad(rok: str) -> dict[str, int]:
    """Počty stránek a výskytů, kterých se obory mimo přehled týkají."""
    kontext = json.loads((KOREN / "public" / f"kontext_prihlasek_{rok}.json").read_text(encoding="utf-8"))
    data, mimo = kontext["data"], kontext.get("mimo_prehled", {})
    katalog = klice_katalogu()

    stranky = [klic for klic in data if klic in katalog]
    dotcene: set[str] = set()
    vyskyty = bez_zkousky = 0
    for klic in stranky:
        zaznam = data[klic]
        for soused, pocet in zaznam.get("obory_vys", []) + zaznam.get("obory_niz", []):
            if pocet < MEZ_UCHAZECU or soused in katalog or soused not in mimo:
                continue
            dotcene.add(klic)
            vyskyty += 1
            if mimo[soused].get("bez_jednotne_zkousky"):
                bez_zkousky += 1
    return {
        "stranek_oboru": len(stranky),
        "dotcenych_stranek": len(dotcene),
        "vyskytu": vyskyty,
        "z_toho_bez_jednotne_zkousky": bez_zkousky,
        "oboru_v_mimo_prehled": len(mimo),
    }


def main() -> None:
    rok = zobrazene_obdobi()
    v = dopad(rok)
    print(f"Ročník {rok} (ze registru stavu datových sad, sada {SADA})")
    print(f"  stránek oborů s kontextem přihlášek: {v['stranek_oboru']}")
    print(f"  soupis oborů mimo přehled obsahuje:  {v['oboru_v_mimo_prehled']}")
    print(f"  dotčených stránek:                   {v['dotcenych_stranek']}")
    print(f"  výskytů v jejich tabulkách:          {v['vyskytu']}")
    print(f"  z toho bez jednotné zkoušky:         {v['z_toho_bez_jednotne_zkousky']}")


if __name__ == "__main__":
    main()
