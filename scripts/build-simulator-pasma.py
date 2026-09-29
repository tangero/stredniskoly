#!/usr/bin/env python3
"""Kompaktní index pásem přijetí pro Simulátor přijímaček.

Návrh: docs/navrh-simulator-prijimacek-2027.md, oddíl 8. Simulátor počítá
skupiny (nad pásmem, v pásmu, pod pásmem, obory, kde nikoho neodmítli, bez
srovnání) v prohlížeči, aby body uchazeče neodcházely na server. Celá pásma
mají přes 1 MB, proto vzniká výtah jen s tím, co skupiny, řazení a filtry
potřebují.

Vstupy (rok vždy z registru public/stav_datovych_sad.json, nikdy napevno):
- public/pasma_prijeti_{rok}.json      sada cermat-uchazeci-kolo1
- public/kriteria_prijeti_{rok}.json   sada dipsy-kriteria (štítek extra body)
- public/schools_data.json, ročník     sada cermat-prihlasky (obec)

Výstup: public/simulator_pasma_{rok pásem}.json

    python3 scripts/build-simulator-pasma.py
    python3 scripts/build-simulator-pasma.py --zmer   # jen vypíše velikost
"""
from __future__ import annotations

import argparse
import gzip
import json
import re
import sys
from pathlib import Path

KOREN = Path(__file__).resolve().parents[1]
PUBLIC = KOREN / "public"
REGISTR = PUBLIC / "stav_datovych_sad.json"

# Pořadí polí v řádku indexu. Klient čte podle `sloupce`, ne podle pozice v kódu.
SLOUPCE = [
    "min_prijaty",      # Nejnižší výsledek JPZ mezi přijatými (hranice pro řazení)
    "dolni_mez",        # Pásmo nejistoty, dolní mez
    "horni_mez",        # Pásmo nejistoty, horní mez (nejvyšší nepřijatý kvůli kapacitě)
    "soutezicich",      # Soutěžící o obor
    "prijatych",        # Přijatí (ze soutěžících)
    "neveslo_se",       # Nepřijatí kvůli kapacitě
    "v_pasmu_soutezilo",  # přesné počty uvnitř pásma nejistoty (věta skupiny „V pásmu“)
    "v_pasmu_prijato",
    "nikdo_neodmitnut",  # 1 = v 1. kole nikoho neodmítli kvůli počtu míst
    "talentova",        # 1 = obor s talentovou zkouškou (skupina „Bez srovnání“)
    "druh",             # druh testu 4 / 6 / 8 (délka studia podle KKOV)
    "extra_body",       # 1 = podle kritérií rozhodují i extra body, 0 = ne, null = bez přepisu
    "obec",             # index do pole `obce`, null = obor není v katalogu
]


def registr() -> dict:
    return json.loads(REGISTR.read_text(encoding="utf-8"))


def obdobi(reg: dict, sada: str) -> str:
    return str(reg["sady"][sada]["zobrazeno"]["obdobi"])


def druh_testu(kkov: str) -> int:
    """Stejné pravidlo jako druhTestu v src/lib/prevod-testu-vypocet.ts."""
    if re.search(r"K/81$", kkov):
        return 8
    if re.search(r"K/61$", kkov):
        return 6
    return 4


# Stejná pravidla jako extraBody a srazka v src/components/obor/KdeStojim.tsx;
# shodu hlídá tests/simulator-pasma.test.mjs nad skutečným souborem kritérií.
RE_CHOVANI = re.compile(r"chování|chovani|kázeň|kazen|důtk|dutk", re.I)
RE_SNIZENI = re.compile(r"odeč|odpoč|sníž|sniz|penaliz|záporn|srážk|srazk|uspokoj", re.I)
RE_PROSPECH = re.compile(r"prospěch|prospech|průměr|prumer|vzdělávání|výsledk|bonus", re.I)


def srazka(slozka: dict) -> bool:
    n = slozka.get("nazev") or ""
    return bool(RE_CHOVANI.search(n) and RE_SNIZENI.search(n) and not RE_PROSPECH.search(n))


def extra_body_prepisu(p: dict) -> bool:
    return p.get("rezim") == "jine" and bool(
        p.get("chybi_slozky") or any(x.get("max") != 0 and not srazka(x) for x in p.get("slozky", []))
    )


def extra_body(zaznam: dict | None) -> int | None:
    """Kterékoli zaměření boduje i něco mimo JPZ → 1. Bez přepisu → None (chybějící není nula)."""
    prepisy = (zaznam or {}).get("prepisy") or []
    if not prepisy:
        return None
    return 1 if any(extra_body_prepisu(p) for p in prepisy) else 0


def obce_katalogu(katalog_rocnik: list[dict]) -> dict[str, str]:
    """Obec podle klíče REDIZO_KKOV; zaměření sdílí obec školy."""
    out: dict[str, str] = {}
    for r in katalog_rocnik:
        obec = (r.get("obec") or "").strip()
        if obec and r.get("redizo") and r.get("kkov"):
            out.setdefault(f"{r['redizo']}_{r['kkov']}", obec)
    return out


def cislo(x):
    """48.0 → 48: celé body bez desetinné části, index je o třetinu menší."""
    return int(x) if isinstance(x, float) and x.is_integer() else x


def radek(v: dict, kkov: str, extra: int | None, obec_idx: int | None) -> list:
    pasmo = v.get("pasmo_nejistoty")
    nikdo = bool(v.get("nikdo_neodmitnut_pro_kapacitu"))
    return [cislo(x) for x in [
        v.get("min_prijaty"),
        pasmo[0] if pasmo else None,
        # Horní mez jen z pásma nejistoty: kde pásmo není (málo dat), neukazuje se ani mez.
        pasmo[1] if pasmo else None,
        v.get("soutezicich"),
        v.get("prijatych"),
        v.get("neveslo_se"),
        v.get("pasmo_nejistoty_soutezilo") if pasmo else None,
        v.get("pasmo_nejistoty_prijato") if pasmo else None,
        1 if nikdo else 0,
        1 if v.get("talentova_zkouska") else 0,
        druh_testu(kkov),
        extra,
        obec_idx,
    ]]


def sestav(pasma: dict, kriteria: dict | None, obce_podle_klice: dict[str, str], meta: dict) -> dict:
    obce = sorted(set(obce_podle_klice.values()))
    idx = {o: i for i, o in enumerate(obce)}
    krit = (kriteria or {}).get("data", {})
    data: dict[str, list] = {}
    for klic in sorted(pasma["data"]):
        v = pasma["data"][klic]
        kkov = klic.split("_", 1)[1]
        obec = obce_podle_klice.get(klic)
        data[klic] = radek(v, kkov, extra_body(krit.get(klic)) if kriteria else None,
                           idx[obec] if obec else None)
    return {
        "rok": pasma["rok"],
        "kolo": pasma.get("kolo", 1),
        **meta,
        "min_prijatych_pro_hranici": pasma["prahy"]["min_prijatych_pro_hranici"],
        "sloupce": SLOUPCE,
        "obce": obce,
        "data": data,
    }


def serializuj(index: dict) -> str:
    return json.dumps(index, ensure_ascii=False, separators=(",", ":"))


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--zmer", action="store_true", help="nic nezapisovat, jen změřit velikost")
    ap.add_argument("--obdobi", help="ročník pásem (cermat-uchazeci-kolo1) k sestavení; výchozí je zobrazený "
                    "podle registru. Připravovaný ročník se sestavuje před přepnutím sady.")
    ap.add_argument("--obdobi-kriterii", help="ročník kritérií (dipsy-kriteria); výchozí podle registru")
    ap.add_argument("--obdobi-katalogu", help="ročník katalogu (cermat-prihlasky); výchozí podle registru")
    ap.add_argument("--pasma", help="soubor pásem k sestavení místo public/pasma_prijeti_{obdobi}.json "
                    "(datová linka ho sestavuje z pracovního adresáře úlohy)")
    ap.add_argument("--vystup", help="kam zapsat index; výchozí public/simulator_pasma_{obdobi}.json")
    args = ap.parse_args()

    reg = registr()
    rok_pasem = args.obdobi or obdobi(reg, "cermat-uchazeci-kolo1")
    rok_kriterii = args.obdobi_kriterii or obdobi(reg, "dipsy-kriteria")
    rok_katalogu = args.obdobi_katalogu or obdobi(reg, "cermat-prihlasky")
    soubor_pasem = Path(args.pasma) if args.pasma else PUBLIC / f"pasma_prijeti_{rok_pasem}.json"
    if not soubor_pasem.exists():
        sys.exit(f"Pásma pro ročník {rok_pasem} neexistují ({soubor_pasem}).")

    pasma = json.loads(soubor_pasem.read_text(encoding="utf-8"))
    if str(pasma["rok"]) != rok_pasem:
        sys.exit(f"Pásma mají rok {pasma['rok']}, požadovaný ročník {rok_pasem}.")
    soubor_krit = PUBLIC / f"kriteria_prijeti_{rok_kriterii}.json"
    kriteria = json.loads(soubor_krit.read_text(encoding="utf-8")) if soubor_krit.exists() else None
    katalog = json.loads((PUBLIC / "schools_data.json").read_text(encoding="utf-8"))
    if rok_katalogu not in katalog:
        sys.exit(f"Katalog nemá ročník {rok_katalogu} podle registru.")

    index = sestav(pasma, kriteria, obce_katalogu(katalog[rok_katalogu]), {
        "rok_kriterii": int(rok_kriterii) if kriteria else None,
        "rok_katalogu": int(rok_katalogu),
        "zdroj": f"public/pasma_prijeti_{rok_pasem}.json, public/kriteria_prijeti_{rok_kriterii}.json, "
                 f"public/schools_data.json ({rok_katalogu}); scripts/build-simulator-pasma.py",
    })
    text = serializuj(index)
    b = len(text.encode("utf-8"))
    gz = len(gzip.compress(text.encode("utf-8"), 9))
    print(f"{len(index['data'])} oborů, {len(index['obce'])} obcí, {b / 1000:.0f} kB, {gz / 1000:.0f} kB po gzip")
    if not args.zmer:
        cil = Path(args.vystup) if args.vystup else PUBLIC / f"simulator_pasma_{rok_pasem}.json"
        cil.write_text(text + "\n", encoding="utf-8")
        print(f"Zapsáno {cil}")


if __name__ == "__main__":
    main()
