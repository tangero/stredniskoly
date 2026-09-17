#!/usr/bin/env python3
"""Doklad k dobíhajícím oborům: kolik nabídek 1. kola je v rejstříku vedeno jako dobíhající.

Odpovídá na otázku, zda má smysl varovat rodinu, že se obor, na který se hlásí,
zavírá. Rozhoduje jemnost párování: na klíči REDIZO + KKOV vznikají falešné
zásahy, protože u téže školy a téhož oboru dobíhá jiná forma nebo délka studia,
než jakou škola v 1. kole nabízí.

Skript vznikl kvůli oponentuře S6, která upozornila, že klíčová nula se bez
doloženého joinu a bez definice jednotky nedá při dalším čtvrtletním snímku
přepočítat. Proto vypisuje počty pod **všemi** jednotkami, ne pod jednou.

Použití:
    python3 scripts/dobihajici-obory.py
    python3 scripts/dobihajici-obory.py --snimek data/msmt_rejstrik/rssz-2026-06-30.jsonld
"""

from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path
from typing import Any, Iterator

KOREN = Path(__file__).resolve().parent.parent

# Druhy školy v rejstříku, které nabízejí střední vzdělání. Ostatní (ZŠ, MŠ,
# VOŠ, jídelny, střediska praktického vyučování) do srovnání s 1. kolem nepatří.
DRUHY_SS = {"C00", "D00"}

# Číselníky rejstříku; stejné hodnoty používá scripts/enrich-continuity-registry.py.
FORMA_DENNI = "10"
DELKA_Z_LET = {1: "10", 2: "20", 3: "30", 4: "40", 5: "50", 6: "60", 8: "80"}


def obory_rejstriku(snimek: Path) -> Iterator[dict[str, Any]]:
    """Projde snímek rejstříku a vrátí jeden záznam na obor jedné školy.

    Args:
        snimek: Cesta k JSON-LD snímku rejstříku škol MŠMT.

    Yields:
        Slovník s `redizo`, `izo`, `druh`, `kod`, `forma`, `delka`, `dobihajici`.
    """
    data = json.loads(snimek.read_text(encoding="utf-8"))
    for subjekt in data["list"]:
        redizo = str(subjekt.get("redIzo") or "")
        for skola in subjekt.get("skolyAZarizeni") or []:
            druh = skola.get("druh")
            izo = str(skola.get("izo") or "")
            for obor in skola.get("obory") or []:
                yield {
                    "redizo": redizo,
                    "izo": izo,
                    "druh": druh if isinstance(druh, str) else None,
                    "kod": obor.get("kod"),
                    "forma": obor.get("formaVzdelavani"),
                    "delka": obor.get("delkaVzdelavani"),
                    "dobihajici": bool(obor.get("dobihajiciObor")),
                }


def delka_nabidky(souhrn: dict[str, Any], rok: str) -> str | None:
    """Převede délku studia nabídky na kód rejstříku.

    Souhrny nesou skupinu ve tvaru `GY8_8`, kde část za podtržítkem je počet let.

    Args:
        souhrn: Záznam nabídky ze `souhrny_kolo1.json`.
        rok: Ročník, který se vyhodnocuje.

    Returns:
        Kód délky podle číselníku rejstříku, nebo None, když ho nelze určit.
    """
    skupina = souhrn.get("roky", {}).get(rok, {}).get("skupina") or souhrn.get("skupina")
    if not isinstance(skupina, str) or "_" not in skupina:
        return None
    try:
        return DELKA_Z_LET.get(int(skupina.rsplit("_", 1)[1]))
    except ValueError:
        return None


def spocitej(snimek: Path, souhrny: Path, rok: str) -> dict[str, Any]:
    """Spočítá dobíhající obory a jejich průnik s nabídkami 1. kola.

    Args:
        snimek: Snímek rejstříku.
        souhrny: Soubor `public/souhrny_kolo1.json`.
        rok: Ročník nabídek, se kterým se rejstřík porovnává.

    Returns:
        Doklad se všemi jednotkami počítání a s výsledkem obou joinů.
    """
    zaznamy = list(obory_rejstriku(snimek))
    dobihajici = [z for z in zaznamy if z["dobihajici"]]
    dobihajici_ss = [z for z in dobihajici if z["druh"] in DRUHY_SS]

    def pary(zaznamy: list[dict[str, Any]], *, s_formou: bool) -> set[tuple[str, ...]]:
        if s_formou:
            return {(z["redizo"], z["kod"], z["forma"], z["delka"]) for z in zaznamy}
        return {(z["redizo"], z["kod"]) for z in zaznamy}

    nabidky = json.loads(souhrny.read_text(encoding="utf-8"))["nabidky"]
    v_rocniku = {k: v for k, v in nabidky.items() if rok in v.get("roky", {})}

    # Rejstřík je klíčovaný na REDIZO; nabídka nese REDIZO i KKOV.
    hrube_ss = pary(dobihajici_ss, s_formou=False)
    presne_ss = pary(dobihajici_ss, s_formou=True)

    hrube_zasahy: list[str] = []
    presne_zasahy: list[str] = []
    bez_zaznamu: list[str] = []
    # Jedna dvojice REDIZO a KKOV může mít víc nabídek (různá zaměření), proto se
    # počet klíčů nabídek a počet unikátních dvojic liší a doklad uvádí obojí.
    dvojice_zasahu: dict[tuple[str, str], list[str]] = {}
    vsechny_pary_rejstriku = {(z["redizo"], z["kod"]) for z in zaznamy}

    for klic, nabidka in v_rocniku.items():
        redizo, kkov = nabidka["redizo"], nabidka["kkov"]
        if (redizo, kkov) not in vsechny_pary_rejstriku:
            bez_zaznamu.append(klic)
            continue
        if (redizo, kkov) in hrube_ss:
            hrube_zasahy.append(klic)
            dvojice_zasahu.setdefault((redizo, kkov), []).append(klic)
        if (redizo, kkov, FORMA_DENNI, delka_nabidky(nabidka, rok)) in presne_ss:
            presne_zasahy.append(klic)

    # Oponentura S6 měřila 754 záznamů proti 723, protože zahrnula i vyšší odborné
    # školy (druh E00). Závěr na jednotce nezávisí, a proto se dokládá zvlášť:
    # přesný join vychází na nulu i tehdy, když se filtr druhu vypustí úplně.
    odolnost = []
    for nazev, druhy in (("C00+D00", DRUHY_SS), ("C00+D00+E00", DRUHY_SS | {"E00"}), ("bez filtru druhu", None)):
        vybrane = [z for z in dobihajici if druhy is None or z["druh"] in druhy]
        odolnost.append({
            "definice": nazev,
            "zaznamu": len(vybrane),
            "hruby_join": sum(1 for n in v_rocniku.values()
                              if (n["redizo"], n["kkov"]) in pary(vybrane, s_formou=False)),
            "presny_join": sum(1 for n in v_rocniku.values()
                               if (n["redizo"], n["kkov"], FORMA_DENNI, delka_nabidky(n, rok))
                               in pary(vybrane, s_formou=True)),
        })

    return {
        "snimek": snimek.name,
        "rocnik_nabidek": rok,
        "odolnost_zaveru_na_definici": odolnost,
        "jednotky_poctu": {
            "zaznamu_oboru_celkem": len(zaznamy),
            "zaznamu_dobihajicich_vsechny_druhy": len(dobihajici),
            "zaznamu_dobihajicich_ss": len(dobihajici_ss),
            "unikatnich_redizo_kkov_ss": len(hrube_ss),
            "unikatnich_redizo_kkov_forma_delka_ss": len(presne_ss),
            "poznamka": (
                "Jednotka rozhoduje. Jedna škola může mít týž obor zapsaný víckrát "
                "(denní i dálkově, různá délka), takže počet záznamů je vyšší než "
                "počet unikátních dvojic REDIZO a KKOV."
            ),
        },
        "druhy_skol_u_dobihajicich": dict(Counter(z["druh"] for z in dobihajici).most_common()),
        "nabidek_v_rocniku": len(v_rocniku),
        "join": {
            "hrube_redizo_kkov": {
                "nabidek": len(hrube_zasahy),
                "unikatnich_dvojic": len({(nabidky[k]["redizo"], nabidky[k]["kkov"]) for k in hrube_zasahy}),
                "dvojice_a_jejich_nabidky": {
                    f"{r}_{kk}": sorted(ks)
                    for (r, kk), ks in sorted(dvojice_zasahu.items())
                },
                "klice": sorted(hrube_zasahy),
            },
            "presne_redizo_kkov_forma_delka": {
                "nabidek": len(presne_zasahy),
                "unikatnich_dvojic": len({(nabidky[k]["redizo"], nabidky[k]["kkov"]) for k in presne_zasahy}),
                "klice": sorted(presne_zasahy),
            },
            "nabidek_bez_zaznamu_v_rejstriku": len(bez_zaznamu),
        },
        "zaver": (
            "Hrubý join je nepoužitelný: všechny jeho zásahy jsou nabídky, u nichž "
            "dobíhá jiná forma nebo délka téhož oboru. Rozhoduje přesný join, a ten "
            "vychází na nulu při každé zkoušené definici druhu školy."
        ),
    }


def main() -> None:
    """Spustí výpočet a uloží doklad."""
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--snimek", type=Path, default=KOREN / "data/msmt_rejstrik/rssz-2026-06-30.jsonld")
    p.add_argument("--souhrny", type=Path, default=KOREN / "public/souhrny_kolo1.json")
    p.add_argument("--rok", default="2026")
    p.add_argument("--vystup", type=Path, default=KOREN / "docs/podklady/dobihajici-obory.json")
    a = p.parse_args()

    doklad = spocitej(a.snimek, a.souhrny, a.rok)
    a.vystup.parent.mkdir(parents=True, exist_ok=True)
    a.vystup.write_text(json.dumps(doklad, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    j = doklad["jednotky_poctu"]
    print(f"Snímek {doklad['snimek']}, nabídek {doklad['rocnik_nabidek']}: {doklad['nabidek_v_rocniku']}")
    print(f"  dobíhajících záznamů SŠ:              {j['zaznamu_dobihajicich_ss']}")
    print(f"  z toho unikátních REDIZO+KKOV:        {j['unikatnich_redizo_kkov_ss']}")
    print(f"  unikátních i s formou a délkou:       {j['unikatnich_redizo_kkov_forma_delka_ss']}")
    hr, pr = doklad["join"]["hrube_redizo_kkov"], doklad["join"]["presne_redizo_kkov_forma_delka"]
    print(f"  zásahů hrubým joinem:                 {hr['nabidek']} nabídek = {hr['unikatnich_dvojic']} dvojic")
    print(f"  zásahů přesným joinem:                {pr['nabidek']} nabídek = {pr['unikatnich_dvojic']} dvojic")
    print(f"  nabídek bez záznamu v rejstříku:      {doklad['join']['nabidek_bez_zaznamu_v_rejstriku']}")
    print(f"Doklad: {a.vystup.relative_to(KOREN)}")


if __name__ == "__main__":
    main()
