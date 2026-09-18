#!/usr/bin/env python3
"""Mapa nabídek 1. kola 2026 na stabilní identifikátory katalogu.

Identifikátor nabídky se skládá z REDIZO, kódu oboru a textu zaměření. Text
zaměření ale školy mezi ročníky přepisují („zaměření na NJ“ → „Německý jazyk“),
takže nabídka 2026 často nesedne na stávající položku katalogu a stránka pak
ukazuje jen loňská čísla. Z adres stránek se navíc identifikátor odvozuje, takže
nové klíče by znamenaly nové URL a duplicitní stránky téže nabídky.

Mapa se staví ve třech krocích, od nejjistějšího:

1. Shoda normalizovaného klíče — nabídka i katalog mluví stejně.
2. Škola má u daného oboru v katalogu i v roce 2026 právě jednu nabídku;
   pak k sobě patří, ať se text zaměření liší jakkoli.
3. Víc nabídek na obou stranách: rozhoduje podobnost textu zaměření po
   normalizaci (scripts/match-zamereni.py) a jen tehdy, když je shoda
   dost vysoká a zřetelně lepší než druhá v pořadí.

Nabídky, u nichž má katalog víc položek než rok 2026, se záměrně nemapují:
jedna letošní nabídka by se přiřadila dvěma stránkám a obě by ukázaly táž čísla.

Před kroky 2 a 3 platí ručně ověřené páry z docs/podklady/overene-pary-nabidek-2026.csv.
Jsou to nabídky, které heuristika nechá nespárované nebo spáruje špatně, ale
návaznost je doložená (rešerše, kontrola člověkem). Ověřený pár má přednost
před heuristikou; když odkazuje na neexistující nabídku nebo se srazí s jiným
párem, skript skončí chybou místo tichého zahození.

Použití:
    python3 scripts/build-offer-mapping-2026.py [--out CESTA]
"""
import argparse
import csv
import importlib.util
import json
import re
import unicodedata
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
KATALOG = ROOT / "public/schools_data.json"
VYSLEDKY = ROOT / "public/cermat_results_2026.json"
PRIHLASKY = ROOT / "public/applications_2026.json"
OVERENE = ROOT / "docs/podklady/overene-pary-nabidek-2026.csv"

MIN_SHODA = 0.6      # pod tím už jde spíš o jiné zaměření
MIN_ODSTUP = 0.15    # rozdíl proti druhé nejlepší, aby šlo o jednoznačnou volbu

_spec = importlib.util.spec_from_file_location("mz", ROOT / "scripts/match-zamereni.py")
_mz = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_mz)


def normalizuj_klic(ident: str) -> str:
    """Klíč bez diakritiky a interpunkce, jak jej porovnává web (school-key.ts)."""
    casti = ident.split("_")
    redizo = casti[0]
    kkov = casti[1] if len(casti) > 1 else ""
    zamereni = "_".join(casti[2:])
    z = unicodedata.normalize("NFKD", zamereni)
    z = "".join(c for c in z if not unicodedata.combining(c))
    z = re.sub(r"[^a-zA-Z0-9]+", "_", z).strip("_").lower()
    return f"{redizo}_{kkov}" + (f"_{z}" if z else "")


def zaklad(ident: str) -> str:
    return "_".join(normalizuj_klic(ident).split("_")[:2])


def nacti_overene(cesta: Path, nabidky: dict, katalog_ids: set) -> dict:
    """Ručně ověřené páry id_2026 -> katalog_id; neplatný řádek je chyba vstupu."""
    if not cesta.exists():
        return {}
    overene = {}
    with cesta.open(newline="", encoding="utf-8-sig") as f:
        cteni = csv.DictReader(f)
        if not {"id_2026", "katalog_id"} <= set(cteni.fieldnames or []):
            raise SystemExit(f"{cesta.name}: chybí sloupec id_2026 nebo katalog_id")
        for cislo, radek in enumerate(cteni, start=2):
            ident, katalog_id = (radek.get("id_2026") or "").strip(), (radek.get("katalog_id") or "").strip()
            if not ident or not katalog_id:
                raise SystemExit(f"{cesta.name}, řádek {cislo}: prázdné id_2026 nebo katalog_id")
            if ident not in nabidky:
                raise SystemExit(f"{cesta.name}: nabídka 2026 {ident!r} v přihláškách není")
            if katalog_id not in katalog_ids:
                raise SystemExit(f"{cesta.name}: záznam katalogu {katalog_id!r} v roce 2025 není")
            if ident in overene:
                raise SystemExit(f"{cesta.name}: nabídka {ident!r} je uvedena dvakrát")
            overene[ident] = katalog_id
    return overene


def sestav_mapu(nabidky: dict[str, dict], katalog: list[dict],
                overene: dict[str, str]) -> tuple[dict[str, dict], dict[str, int], int]:
    """Mapa nabídka 2026 → záznam katalogu, počty podle způsobu a počet odstraněných kolizí.

    Ověřený pár, který by se srazil s jinou nabídkou (přes mapu i přes přímou shodu
    klíče), nebo který přímá shoda klíče přebije jiným cílem, je chyba vstupu.
    """
    podle_klice = {normalizuj_klic(z["id"]): z for z in katalog}
    katalog_zaklad = defaultdict(list)
    nabidky_zaklad = defaultdict(list)
    for z in katalog:
        katalog_zaklad[zaklad(z["id"])].append(z)
    for ident in nabidky:
        nabidky_zaklad[zaklad(ident)].append(ident)

    # Záznamy katalogu, které si nabídka 2026 najde sama přímou shodou klíče
    primo = {podle_klice[normalizuj_klic(i)]["id"]: i for i in nabidky if normalizuj_klic(i) in podle_klice}
    for ident, katalog_id in overene.items():
        cil = podle_klice.get(normalizuj_klic(ident))
        if cil and cil["id"] != katalog_id:
            raise SystemExit(f"Ověřený pár {ident} -> {katalog_id}: nabídka sedí přímou shodou klíče na {cil['id']}")
        if primo.get(katalog_id, ident) != ident:
            raise SystemExit(f"Ověřený pár {ident} -> {katalog_id}: záznam katalogu už přímou shodou klíče "
                             f"patří nabídce {primo[katalog_id]}")

    mapa = {}
    duvody = defaultdict(int)
    for ident, data in sorted(nabidky.items()):
        klic = normalizuj_klic(ident)
        if klic in podle_klice:
            duvody["shoda_klice"] += 1
            continue  # stránka si nabídku najde sama, mapa ji nepotřebuje

        if ident in overene:
            mapa[ident] = {"katalog_id": overene[ident], "zpusob": "overeno_rucne"}
            duvody["overeno_rucne"] += 1
            continue

        z = zaklad(ident)
        v_katalogu = katalog_zaklad.get(z, [])
        v_2026 = nabidky_zaklad[z]
        if not v_katalogu:
            duvody["nova_nabidka"] += 1
            continue
        if len(v_katalogu) == 1 and len(v_2026) == 1:
            mapa[ident] = {"katalog_id": v_katalogu[0]["id"], "zpusob": "jedna_ku_jedne"}
            duvody["jedna_ku_jedne"] += 1
            continue
        if len(v_katalogu) > len(v_2026):
            # Jedna letošní nabídka na víc stránek – přiřazení by čísla zdvojilo.
            duvody["nejednoznacne_vic_v_katalogu"] += 1
            continue

        skore = sorted(
            ((_mz.podobnost(data.get("zamereni", ""), k.get("zamereni") or ""), k["id"])
             for k in v_katalogu), reverse=True)
        if skore and skore[0][0] >= MIN_SHODA and (
                len(skore) == 1 or skore[0][0] - skore[1][0] >= MIN_ODSTUP):
            mapa[ident] = {"katalog_id": skore[0][1], "zpusob": "text_zamereni",
                           "shoda": round(skore[0][0], 3)}
            duvody["text_zamereni"] += 1
        else:
            duvody["nejednoznacny_text"] += 1

    # Jeden katalogový identifikátor smí mít nejvýš jednu nabídku 2026
    obsazeno = defaultdict(list)
    for ident, info in mapa.items():
        obsazeno[info["katalog_id"]].append(ident)
    kolize = {k: v for k, v in obsazeno.items() if len(v) > 1}
    sporne = {k: v for k, v in kolize.items() if any(i in overene for i in v)}
    if sporne:
        raise SystemExit("Ověřený pár se srazil s jiným párem na témže záznamu katalogu: "
                         + "; ".join(f"{k} <- {v}" for k, v in sporne.items()))
    for katalog_id, identy in kolize.items():
        for ident in identy:
            mapa.pop(ident, None)
        duvody["kolize_odstraneno"] += len(identy)
    return mapa, duvody, len(kolize)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default=str(ROOT / "public/offer_mapping_2026.json"))
    parser.add_argument("--overene", default=str(OVERENE))
    args = parser.parse_args()

    katalog = json.loads(KATALOG.read_text())["2025"]
    vysledky = json.loads(VYSLEDKY.read_text())
    prihlasky = {z["id"]: z for z in json.loads(PRIHLASKY.read_text())["data"]}

    # Kanonickým seznamem nabídek 2026 jsou přihlášky: obsahují všechny nabídky
    # včetně těch bez zveřejněných výsledků a nesou úplné údaje o škole.
    # Soubor výsledků používá tytéž nabídky, jen s identifikátorem psaným malými
    # písmeny; párují se proto přes source_id, ne přes identifikátor.
    nabidky = {ident: {"zamereni": z.get("zamereni") or "", "source_id": z.get("source_id")}
               for ident, z in prihlasky.items()}
    podle_source = {z.get("source_id"): ident for ident, z in vysledky.items()
                    if z.get("source_id")}
    for ident, data in nabidky.items():
        data["vysledky_id"] = podle_source.get(data.get("source_id"))

    overene = nacti_overene(Path(args.overene), nabidky, {z["id"] for z in katalog})
    mapa, duvody, kolize = sestav_mapu(nabidky, katalog, overene)

    # Klíč souboru výsledků se liší velikostí písmen; mapa ho uvádí zvlášť,
    # aby si stránka našla výsledky i bez opakované normalizace.
    for ident, info in mapa.items():
        vid = nabidky[ident].get("vysledky_id")
        if vid and vid != ident:
            info["vysledky_id"] = vid

    Path(args.out).write_text(json.dumps({
        "meta": {
            "description": "Nabídka 1. kola 2026 → stabilní identifikátor katalogu. "
                           "Chybí-li nabídka v mapě, buď na katalog sedne přímo, "
                           "nebo je nová, nebo ji nelze jednoznačně přiřadit.",
            "generator": "scripts/build-offer-mapping-2026.py",
            "counts": dict(duvody),
            "mapped": len(mapa),
        },
        "mapping": {k: v for k, v in sorted(mapa.items())},
    }, ensure_ascii=False, indent=1))

    print(f"Nabídek 2026: {len(nabidky)}")
    for k, v in sorted(duvody.items(), key=lambda x: -x[1]):
        print(f"  {v:5}  {k}")
    print(f"\nV mapě: {len(mapa)}; kolizí odstraněno: {kolize}")
    print(f"Zapsáno do {args.out}")


if __name__ == "__main__":
    raise SystemExit(main())
