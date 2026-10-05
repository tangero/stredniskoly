#!/usr/bin/env python3
"""Nabídky bez jednotné zkoušky (JPZ) pro web: fáze 2 / etapa 1 issue #244.

Z agregátů CERMATu 2026 a 2025, 2. kola 2026 a rejstříku MŠMT vyrobí jediný soubor
`src/data/obory-bez-jpz-2026.json`, který zatím nic na webu nečte (zobrazení je etapa 3).
Stávající výstupy webu (`applications_2026.json`, `cermat_results_*.json`, `schools_data.json`,
`druhe_kolo.json`) se nemění; filtr `is_valid_flat` v `import_cermat_results.py` zůstává.

Rozsah (návrh `docs/navrh-obory-bez-jpz-2027.md`, oddíl 1 a 10.6):
- denní nezkrácené nabídky bez JPZ (POVINNOST JPZ není 1),
- nedenní nezkrácené nástavby L/5x (68× L/51 a 4× L/52; konají JPZ, bez výsledků bodů) s příznakem `pokracovani` (jen „kam dál po výučním listu“),
- protějšek z roku 2025 (stejné párování jako u oborů se zkouškou, `match_obory_2025_2026.py`),
- 2. kolo 2026 (klíč `build-druhe-kolo.py`),
- domovy mládeže a internáty (druh H22, H21) podle REDIZO; bez osobních údajů.

Čte jen místní soubory, na síť se nedotazuje.

Použití:
    python3 scripts/build-obory-bez-jpz.py [--vystup cesta.json]
"""

from __future__ import annotations

import argparse
import contextlib
import hashlib
import importlib.util
import io
import json
import re
from collections import Counter
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parent.parent
KOLO1_2026 = ROOT / "data/PZ2026_kolo1_skolobory_vysledky.xlsx"
KOLO1_2025 = ROOT / "data/PZ2025_kolo1_skolobory_vysledky.xlsx"
KOLO2_2026 = ROOT / "data/PZ2026_kolo2_skolobory_vysledky.xlsx"
REJSTRIK = ROOT / "data/msmt_rejstrik/rssz-2026-06-30.jsonld"
VYSTUP = ROOT / "src/data/obory-bez-jpz-2026.json"

KKOV_KAT = re.compile(r"^\d{2}-\d{2}-([A-Z])/\d{2}$")
NASTAVBA = re.compile(r"-L/5\d$")
DOMOVY = {"H21": "internát", "H22": "domov mládeže"}


def _modul(soubor: str, jmeno: str):
    spec = importlib.util.spec_from_file_location(jmeno, ROOT / "scripts" / soubor)
    modul = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(modul)
    return modul


def kategorie(kkov: str) -> str:
    m = KKOV_KAT.match((kkov or "").strip())
    return m.group(1) if m else "?"


def cislo(v) -> int | None:
    """Počet jako celé číslo; chybějící hodnota zůstává None (nikdy se nenahrazuje nulou)."""
    if isinstance(v, bool) or not isinstance(v, (int, float)):
        return None
    return int(v)


def nacti(soubor: Path) -> list[dict]:
    wb = openpyxl.load_workbook(soubor, read_only=True, data_only=True)
    ws = wb[wb.sheetnames[0]]
    it = ws.iter_rows(values_only=True)
    hlavicky = [str(h) if h else "" for h in next(it)]
    radky = [dict(zip(hlavicky, r)) for r in it if r[0] is not None]
    wb.close()
    return radky


def je_denni(r: dict) -> bool:
    return "den" in str(r["FORMA VZDĚLÁVÁNÍ"] or "").lower()


def je_nezkracene(r: dict) -> bool:
    return str(r["ZKRÁCENÉ STUDIUM"] or "").lower() == "ne"


def vybrat_nabidky(radky: list[dict]) -> tuple[list[dict], list[dict]]:
    """(denní nezkrácené bez JPZ, nedenní nezkrácené nástavby L/5x: 68× L/51 a 4× L/52).

    Nástavby se JPZ konají (POVINNOST JPZ je 1), do rozsahu patří jako „kam dál po výučním listu“.
    """
    denni, nastavby = [], []
    for r in radky:
        if not je_nezkracene(r):
            continue
        if je_denni(r):
            if r["POVINNOST JPZ"] != 1:
                denni.append(r)
        elif NASTAVBA.search(str(r["KKOV"] or "")):
            nastavby.append(r)
    return denni, nastavby


def priority(r: dict, predpona: str) -> list[int | None]:
    return [cislo(r[f"{predpona} - PRIORITA {n}"]) for n in range(1, 6)]


def zaznam(r: dict, imp, pokracovani: bool) -> dict:
    kapacita, prijati = cislo(r["KAPACITA"]), cislo(r["PŘIJATÍ"])
    zbyla = kapacita - prijati if kapacita is not None and prijati is not None else None
    id_nabidky = imp.make_full_id(str(r["REDIZO"]), str(r["KKOV"]), str(r["ZAMĚŘENÍ OBORU"] or ""))
    if pokracovani:
        # nástavby se stejnou školou a KKOV se liší jen formou (dálková, kombinovaná, distanční)
        id_nabidky += "_" + str(r["FORMA VZDĚLÁVÁNÍ"] or "")
    return {
        "id": id_nabidky,
        "id_sof": str(r["ID_SOF"]),
        "redizo": str(r["REDIZO"]),
        "kkov": str(r["KKOV"]),
        "kategorie": kategorie(str(r["KKOV"] or "")),
        "obor": str(r["OBOR - NÁZEV"] or ""),
        "zamereni": str(r["ZAMĚŘENÍ OBORU"] or ""),
        "forma": str(r["FORMA VZDĚLÁVÁNÍ"] or ""),
        "delka": cislo(r["DÉLKA STUDIA"]),
        "jazyk": str(r["JAZYK STUDIA"] or ""),
        "maturitni_status": str(r["MATURITNÍ STATUS"] or ""),
        "typ_skoly": str(r["TYP ŠKOLY"] or ""),
        "kraj": str(r["KRAJ - NÁZEV"] or ""),
        "obec": str(r["OBEC"] or ""),
        "pokracovani": pokracovani,
        "kapacita": kapacita,
        "prihlasky": cislo(r["PŘIHLÁŠKY CELKEM"]),
        "prijati": prijati,
        "zbyla_mista": zbyla,
        "prihlasky_priorita": priority(r, "PŘIHLÁŠKY"),
        "prijati_priorita": priority(r, "PŘIJATÍ"),
        "nepr_vyssi_priorita": cislo(r["NEPŘIJATI - PŘIJAT NA VYŠŠÍ PRIORITU"]),
        "nepr_kapacita": cislo(r["NEPŘIJATI - NEDOSTATEČNÁ KAPACITA"]),
        "nepr_podminky": cislo(r["NEPŘIJATI - NESPLNĚNÍ PODMÍNEK"]),
        "nepr_vzdal_se": cislo(r["NEPŘIJATI - VZDAL SE PŘIJETÍ"]),
    }


def minule_cisla(r: dict) -> dict:
    return {
        "kapacita": cislo(r["KAPACITA"]),
        "prihlasky": cislo(r["PŘIHLÁŠKY CELKEM"]),
        "prijati": cislo(r["PŘIJATÍ"]),
        "prihlasky_priorita": priority(r, "PŘIHLÁŠKY"),
    }


def spojit_s_rokem_2025(nabidky: list[dict], r25: list[dict], imp, par) -> Counter:
    """Doplní `rok_2025` stejným párováním jako u oborů se zkouškou. Vrací počty podle jistoty."""
    def pro_parovani(zaz: dict, prihlasky) -> dict:
        return {"id": zaz["id"], "prihlasky": prihlasky if prihlasky is not None else 0}

    z25 = {}
    zaznamy25 = []
    for r in r25:
        i = imp.make_full_id(str(r["REDIZO"]), str(r["KKOV"]), str(r["ZAMĚŘENÍ OBORU"] or ""))
        z25.setdefault(i, r)
        zaznamy25.append({"id": i, "prihlasky": cislo(r["PŘIHLÁŠKY CELKEM"]) or 0})
    z26 = [pro_parovani(n, n["prihlasky"]) for n in nabidky]
    with contextlib.redirect_stdout(io.StringIO()):
        shody, _revize = par.match_obory(par.build_index(zaznamy25), par.build_index(z26))
    pocty: Counter = Counter()
    for n in nabidky:
        s = shody.get(n["id"])
        n["rok_2025"] = None
        if not s or s.get("match_type") == "new" or not s.get("matched_2025_id"):
            pocty["nove"] += 1
            continue
        r = z25.get(s["matched_2025_id"])
        if r is None:
            pocty["nove"] += 1
            continue
        n["rok_2025"] = {**minule_cisla(r), "shoda": s["match_type"], "jistota": s["confidence"]}
        pocty[s["confidence"]] += 1
    return pocty


def spojit_s_druhym_kolem(nabidky: list[dict], r1: list[dict], r2: list[dict], dk) -> Counter:
    """Doplní `kolo_2` klíčem 2. kola; kolize klíče webu se nehádají (kolo_2 zůstane None)."""
    m2 = {dk.parovaci_klic(r): r for r in r2}
    podle_webu: Counter = Counter()
    klice = {}
    for r in r1:
        k = dk.klic_webu(str(r["REDIZO"]), str(r["KKOV"]), r["ZAMĚŘENÍ OBORU"])
        podle_webu[k] += 1
        klice[r["ID_SOF"]] = (k, dk.parovaci_klic(r))
    pocty: Counter = Counter()
    for n in nabidky:
        n["kolo_2"] = None
        k, pk = klice[n["id_sof"]]
        if podle_webu[k] > 1:
            pocty["kolize_klice"] += 1
            continue
        d = m2.get(pk)
        if not d:
            pocty["bez_2_kola"] += 1
            continue
        pocty["vypsano"] += 1
        n["kolo_2"] = {
            "id_sof": str(d["ID_SOF"]),
            "kapacita": cislo(d["KAPACITA"]),
            "prihlasky": cislo(d["PŘIHLÁŠKY CELKEM"]),
            "prijati": cislo(d["PŘIJATÍ"]),
            "zbyla_mista": (cislo(d["KAPACITA"]) - cislo(d["PŘIJATÍ"]))
            if cislo(d["KAPACITA"]) is not None and cislo(d["PŘIJATÍ"]) is not None else None,
        }
    return pocty


def domovy_mladeze(cesta: Path) -> dict[str, list[dict]]:
    """Domovy mládeže (H22) a internáty (H21) podle REDIZO. Jen název, druh, kapacita a obec."""
    data = json.loads(cesta.read_text(encoding="utf-8"))
    vystup: dict[str, list[dict]] = {}
    for z in data["list"]:
        redizo = z.get("redIzo")
        for s in z.get("skolyAZarizeni") or []:
            druh = s.get("druh")
            if druh not in DOMOVY or not redizo:
                continue
            lozka = sum(cislo(k.get("nejvyssiPovolenyPocet")) or 0 for k in s.get("kapacity") or [])
            mista = s.get("mistaVyuky") or []
            adresa = (mista[0].get("adresa") or {}) if mista else {}
            vystup.setdefault(str(redizo), []).append({
                "izo": str(s.get("izo") or ""),
                "druh": druh,
                "nazev": str(s.get("uplnyNazev") or DOMOVY[druh]),
                "kapacita": lozka or None,
                "obec": adresa.get("obec"),
            })
    for seznam in vystup.values():
        seznam.sort(key=lambda d: (d["druh"], d["izo"]))
    return dict(sorted(vystup.items()))


def otisk(soubor: Path) -> str:
    return hashlib.sha256(soubor.read_bytes()).hexdigest()


def sestavit() -> dict:
    imp = _modul("import_cermat_2026_real.py", "import_cermat_2026_real")
    par = _modul("match_obory_2025_2026.py", "match_obory_2025_2026")
    dk = _modul("build-druhe-kolo.py", "build_druhe_kolo")

    kolo1 = nacti(KOLO1_2026)
    denni, nastavby = vybrat_nabidky(kolo1)
    nabidky = [zaznam(r, imp, False) for r in denni]
    nabidky_nastavby = [zaznam(r, imp, True) for r in nastavby]

    r25_denni, _ = vybrat_nabidky(nacti(KOLO1_2025))
    parovani = spojit_s_rokem_2025(nabidky, r25_denni, imp, par)
    for n in nabidky_nastavby:
        n["rok_2025"] = None
    kolo2 = spojit_s_druhym_kolem(nabidky, denni, nacti(KOLO2_2026), dk)
    for n in nabidky_nastavby:
        n["kolo_2"] = None

    domovy = domovy_mladeze(REJSTRIK)
    return {
        "popis": "Nabídky bez jednotné přijímací zkoušky pro etapu 3 fáze 2 (issue #244). Web je zatím nečte.",
        "zdroje": {p.name: otisk(p) for p in (KOLO1_2026, KOLO1_2025, KOLO2_2026, REJSTRIK)},
        "souhrn": {
            "denni_nezkracene": len(nabidky),
            "nastavby_nedenni": len(nabidky_nastavby),
            "denni_podle_kategorie": dict(sorted(Counter(n["kategorie"] for n in nabidky).items())),
            "parovani_2025": dict(sorted(parovani.items())),
            "druhe_kolo": dict(sorted(kolo2.items())),
            "skol_s_domovem_nebo_internatem": len(domovy),
        },
        "nabidky": nabidky,
        "nastavby": nabidky_nastavby,
        "domovy": domovy,
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--vystup", type=Path, default=VYSTUP)
    args = ap.parse_args()
    data = sestavit()
    args.vystup.parent.mkdir(parents=True, exist_ok=True)
    args.vystup.write_text(json.dumps(data, ensure_ascii=False, indent=1, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps(data["souhrn"], ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
