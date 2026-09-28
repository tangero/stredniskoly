#!/usr/bin/env python3
"""Mechanická kontrola úsporného přepisu proti stránkám zdrojového PDF."""

import argparse
import importlib.util
import json
import re
from decimal import Decimal
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "data/dipsy-kriteria-2026"
spec = importlib.util.spec_from_file_location("kontrola_v4", ROOT / "scripts/dipsy-kriteria-kontrola-v4.py")
old = importlib.util.module_from_spec(spec)
spec.loader.exec_module(old)
spec = importlib.util.spec_from_file_location("pilot", ROOT / "scripts/dipsy-kriteria-llm-vzorek.py")
pilot = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pilot)


def prover(navrh, text_pdf):
    """Shoda citace a aritmetiky nedokazuje, že se výklad vztahuje k oboru."""
    flags = []
    pages = text_pdf.split("\f")
    evidence = set()

    def doklad(value, name):
        page = value.get("strana") if isinstance(value, dict) else None
        quote = old.normalizuj(value.get("citace") or "") if isinstance(value, dict) else ""
        if not isinstance(page, int) or not 1 <= page <= len(pages) or len(quote) < 8:
            flags.append(f"neplatna_citace:{name}")
        elif quote not in old.normalizuj(pages[page - 1]):
            flags.append(f"citace_neni_na_strane:{name}")
        else:
            evidence.add(name)

    for entry in navrh.get("doklady_jpz_a_celku") or []:
        field = entry.get("pole")
        if field not in ("cjl_max", "mat_max", "prepoctovy_koeficient_pct", "deklarovany_podil_pct",
                         "max_po_prepoctu", "vyslovne_max_celkem"):
            flags.append("neznama_polozka_dokladu")
        else:
            doklad(entry.get("doklad"), field)
    jpz = navrh.get("jpz") or {}
    for field in ("cjl_max", "mat_max", "prepoctovy_koeficient_pct", "deklarovany_podil_pct"):
        if jpz.get(field) is not None and field not in evidence:
            flags.append(f"chybi_doklad:{field}")
    if navrh.get("vyslovne_max_celkem") is not None and "vyslovne_max_celkem" not in evidence:
        flags.append("chybi_doklad:vyslovne_max_celkem")
    for index, part in enumerate(navrh.get("slozky") or []):
        doklad(part.get("doklad"), f"slozka:{index}")
        if part.get("surove_max") is None or part.get("max_po_prepoctu") is None:
            flags.append(f"neurcene_maximum_slozky:{index}")
        elif old.cislo(part["surove_max"]) * (old.cislo(part.get("koeficient_pct")) or Decimal(100)) / 100 != old.cislo(part["max_po_prepoctu"]):
            flags.append(f"nesedi_prepocet_slozky:{index}")
    for index, item in enumerate(navrh.get("minima") or []):
        doklad(item.get("doklad"), f"minimum:{index}")
        if re.search(r"není stanoven|nestanoven|bez minima", item.get("popis") or "", re.I):
            flags.append(f"nestanovene_minimum:{index}")
    cjl, mat = old.cislo(jpz.get("cjl_max")), old.cislo(jpz.get("mat_max"))
    weight, after = old.cislo(jpz.get("prepoctovy_koeficient_pct")), old.cislo(jpz.get("max_po_prepoctu"))
    if cjl is not None and mat is not None and after is not None:
        if (cjl + mat) * (weight if weight is not None else Decimal(100)) / 100 != after:
            flags.append("nesedi_prepocet_jpz")
    parts = navrh.get("slozky") or []
    if navrh.get("rezim") == "pouze_jpz" and (parts or weight not in (None, Decimal(100))):
        flags.append("rezim_odporuje_slozkam")
    if navrh.get("rezim") == "jine" and not parts and weight in (None, Decimal(100)):
        flags.append("rezim_bez_zmeny_bodu")
    total = old.cislo(navrh.get("vyslovne_max_celkem"))
    maxima = [old.cislo(part.get("max_po_prepoctu")) for part in parts]
    if total is not None and after is not None and all(value is not None for value in maxima):
        if after + sum(maxima, Decimal(0)) != total:
            flags.append("nesedi_celkove_maximum")
    if navrh.get("vazba_oboru") != "jasna":
        flags.append("nejasna_vazba_oboru")
    return sorted(set(flags))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--verze", type=int, default=7)
    args = parser.parse_args()
    manifest = pilot.latest_manifest()
    files = sorted((BASE / "llm-pilot/usporny-v5").glob(f"*-v{args.verze}.json"))
    if not files:
        raise SystemExit("Žádné výstupy k ověření.")
    for path in files:
        record = json.loads(path.read_text(encoding="utf-8"))
        row = manifest[record["source_id"]]
        if record["sha256"] != row["sha256"] or record["rok"] != 2026 or record["kolo"] != 1:
            raise SystemExit(f"Jiný zdroj nebo rozsah: {path.name}")
        suffix = ".ocr.txt" if row["stav"] == "ocr_text" else ".txt"
        text = (BASE / "text" / f"{row['sha256']}{suffix}").read_text(encoding="utf-8")
        flags = prover(record["navrh"], text)
        print(record["source_id"], ", ".join(flags) or "bez mechanického nálezu")


if __name__ == "__main__":
    main()
