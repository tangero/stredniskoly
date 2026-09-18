#!/usr/bin/env python3
"""Kolika oborů se týkají obory výš a níž, které přehled nezahrnuje.

    python3 scripts/dopad-mimo-prehled.py

Proč to je skript a ne číslo v textu: code review PR #99 upozornilo, že tvrzení
„týká se to 308 z 2 792 stránek oborů“ nejde nijak přepočítat. Číslo se navíc
mění s každým ročníkem dat, takže napsané v dokumentaci zastará. Tady se spočítá
z týchž vstupů, ze kterých ho bere web, a proto je kdykoli přezkoumatelné.

**Počítá se v klíčích `REDIZO_KKOV`, ne ve stránkách.** Kontext přihlášek je
klíčovaný oborem bez zaměření, zatímco web má vlastní stránku pro každé zaměření
(`id` v katalogu), takže jednomu klíči odpovídá jedna i několik adres. Výpis
proto uvádí obojí; „308 stránek“ z popisu PR #99 byl ve skutečnosti počet klíčů.

Podmínky, za kterých čísla vyjdou:

* období se bere z registru stavu datových sad, nikdy z letopočtu v kódu,
* obor má stránku jen tehdy, když ho vede katalog (`schools_data.json`),
* katalog se prohledává **přes všechny ročníky**, takže soused vedený jen v
  jednom roce se považuje za známý a značku nedostane,
* mez deseti společných uchazečů **neuplatňuje tenhle skript**: obory výš a níž
  filtruje už generátor kontextu (`MIN_SPOLECNYCH` v `build-kontext-prihlasek.py`),
  takže v datech slabší vazby nejsou. Web nad nimi žádnou další mez nemá.

Kdo tyhle podmínky nedodrží, dostane jiné číslo.
"""
from __future__ import annotations

import json
from pathlib import Path

KOREN = Path(__file__).resolve().parent.parent

SADA = "cermat-uchazeci-kolo1"


def zobrazene_obdobi(sada: str = SADA) -> str:
    """Období sady z registru; jediné místo, které určuje zobrazený ročník."""
    registr = json.loads((KOREN / "public" / "stav_datovych_sad.json").read_text(encoding="utf-8"))
    return registr["sady"][sada]["zobrazeno"]["obdobi"]


def klic_nabidky(zaznam: dict) -> str:
    """Klíč `REDIZO_KKOV` **stejnou konstrukcí jako web** (`nazvyOboru()` v obor-profil-data.ts).

    Záměrně se nepoužívá náhradní odvození z `id`: kdyby katalog přestal vést
    `kkov`, mají obě strany selhat, ne se tiše rozejít v tom, co je týž obor.
    """
    return f"{zaznam['redizo']}_{zaznam['kkov']}"


def nabidky_katalogu() -> dict[str, set[str]]:
    """Klíč oboru → jeho `id` v katalogu, přes všechny ročníky. Jedno `id` = jedna adresa."""
    data = json.loads((KOREN / "public" / "schools_data.json").read_text(encoding="utf-8"))
    podle_klice: dict[str, set[str]] = {}
    for rok in data:
        for z in data.get(rok) or []:
            podle_klice.setdefault(klic_nabidky(z), set()).add(z["id"])
    return podle_klice


def dopad(rok: str) -> dict[str, int]:
    """Počty klíčů, adres a výskytů, kterých se obory mimo přehled týkají."""
    kontext = json.loads((KOREN / "public" / f"kontext_prihlasek_{rok}.json").read_text(encoding="utf-8"))
    data, mimo = kontext["data"], kontext.get("mimo_prehled", {})
    katalog = nabidky_katalogu()

    s_kontextem = [klic for klic in data if klic in katalog]
    dotcene: set[str] = set()
    vyskyty = bez_zkousky = 0
    for klic in s_kontextem:
        zaznam = data[klic]
        for soused, _pocet in zaznam.get("obory_vys", []) + zaznam.get("obory_niz", []):
            if soused in katalog or soused not in mimo:
                continue
            dotcene.add(klic)
            vyskyty += 1
            if mimo[soused].get("bez_jednotne_zkousky"):
                bez_zkousky += 1

    def adres(klice) -> int:
        """Kolik adres (id katalogu) těmto klíčům odpovídá."""
        return sum(len(katalog[k]) for k in klice)

    return {
        "klicu_s_kontextem": len(s_kontextem),
        "adres_s_kontextem": adres(s_kontextem),
        "dotcenych_klicu": len(dotcene),
        "dotcenych_adres": adres(dotcene),
        "vyskytu": vyskyty,
        "z_toho_bez_jednotne_zkousky": bez_zkousky,
        "oboru_v_mimo_prehled": len(mimo),
    }


def main() -> None:
    rok = zobrazene_obdobi()
    v = dopad(rok)
    print(f"Ročník {rok} (z registru stavu datových sad, sada {SADA})")
    print(f"  oborů s kontextem přihlášek:        {v['klicu_s_kontextem']} klíčů, {v['adres_s_kontextem']} adres")
    print(f"  soupis oborů mimo přehled obsahuje: {v['oboru_v_mimo_prehled']}")
    print(f"  dotčených:                          {v['dotcenych_klicu']} klíčů, {v['dotcenych_adres']} adres")
    print(f"  výskytů v jejich tabulkách:         {v['vyskytu']}")
    print(f"  z toho bez jednotné zkoušky:        {v['z_toho_bez_jednotne_zkousky']}")


if __name__ == "__main__":
    main()
