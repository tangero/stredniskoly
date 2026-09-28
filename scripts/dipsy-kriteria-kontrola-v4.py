#!/usr/bin/env python3
"""Mechanické kontroly pracovního přepisu v4 proti místnímu textu PDF."""

import argparse
import importlib.util
import json
import re
import unicodedata
from decimal import Decimal, InvalidOperation
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "data/dipsy-kriteria-2026"
spec = importlib.util.spec_from_file_location("kriteria_prompt", ROOT / "scripts/dipsy-kriteria-llm-vzorek.py")
pilot = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pilot)


def normalizuj(value):
    value = unicodedata.normalize("NFKC", value).casefold().replace("\u00ad", "")
    return re.sub(r"\s+", " ", value).strip()


def cislo(value):
    try:
        return None if value is None else Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        return None


def vypoctene_maximum(navrh):
    jpz = cislo(navrh.get("jpz_max_po_prepoctu"))
    maxima = [cislo(part.get("max_bodu_po_prepoctu"))
              for part in navrh.get("dalsi_bodovane_slozky") or []]
    if jpz is None or any(value is None for value in maxima):
        return None
    return jpz + sum(maxima, Decimal(0))


def prover(navrh, text_pdf):
    """Vrací kódy závad; shoda citace je důkaz přítomnosti, nikoli správného výkladu."""
    flags = []
    pages = text_pdf.split("\f")
    evidence = {}
    parts = navrh.get("dalsi_bodovane_slozky") or []
    for item in navrh.get("doklady", []):
        page = item.get("strana")
        quote = normalizuj(item.get("citace") or "")
        key = (item.get("pole"), item.get("index_slozky"))
        if item.get("pole") == "dalsi_slozka" and (not isinstance(item.get("index_slozky"), int)
                                                  or not 0 <= item["index_slozky"] < len(parts)):
            flags.append("neplatny_index_dokladu")
        if not isinstance(page, int) or not 1 <= page <= len(pages) or len(quote) < 8:
            flags.append("neplatna_citace")
        elif quote not in normalizuj(pages[page - 1]):
            flags.append("citace_neni_na_strane")
        else:
            evidence[key] = True

    for field in ("jpz_cjl_max", "jpz_mat_max", "jpz_vaha_pct", "max_bodu_celkem"):
        if navrh.get(field) is not None and not evidence.get((field, None)):
            flags.append(f"chybi_doklad:{field}")
    for index, part in enumerate(parts):
        if part.get("max_bodu_pred_prepocet") is not None and not evidence.get(("dalsi_slozka", index)):
            flags.append(f"chybi_doklad:dalsi_slozka:{index}")
        if part.get("max_bodu_po_prepoctu") is None:
            flags.append(f"neurcene_maximum_slozky:{index}")
    if navrh.get("minima") and not evidence.get(("minimum", None)):
        flags.append("chybi_doklad:minimum")
    if navrh.get("rovnost") and not evidence.get(("rovnost", None)):
        flags.append("chybi_doklad:rovnost")

    cjl, mat = cislo(navrh.get("jpz_cjl_max")), cislo(navrh.get("jpz_mat_max"))
    weight = cislo(navrh.get("jpz_vaha_pct"))
    jpz = cislo(navrh.get("jpz_max_po_prepoctu"))
    total = cislo(navrh.get("max_bodu_celkem"))
    if navrh.get("jpz_prepocet") == "ne" and weight is not None and weight != 100:
        flags.append("prepocteni_jpz_odporuje_vaze")
    if navrh.get("jpz_prepocet") == "ano" and weight is None:
        flags.append("prepocteni_jpz_bez_vahy")
    if cjl is not None and mat is not None and jpz is not None:
        expected = (cjl + mat) * (weight if weight is not None else Decimal(100)) / 100
        if expected != jpz:
            flags.append("nesedi_prepocet_jpz")
    maxima = []
    for index, part in enumerate(parts):
        raw = cislo(part.get("max_bodu_pred_prepocet"))
        factor_weight = cislo(part.get("vaha_pct"))
        after = cislo(part.get("max_bodu_po_prepoctu"))
        maxima.append(after)
        if raw is not None and after is not None:
            expected = raw * (factor_weight if factor_weight is not None else Decimal(100)) / 100
            if expected != after:
                flags.append(f"nesedi_prepocet_slozky:{index}")
    if jpz is not None and total is not None and all(number is not None for number in maxima):
        if jpz + sum(maxima, Decimal(0)) != total:
            flags.append("nesedi_celkove_maximum")
    if navrh.get("rezim") == "pouze_jpz" and (parts or weight not in (None, Decimal(100))):
        flags.append("rezim_odporuje_slozkam")
    formula = navrh.get("vzorec") or ""
    if re.search(r"\bJPZ\s*[:=][^;]{0,120}[×*]\s*0[,.]\d+\s*;[^;]{0,100}\bJPZ\s*[×*]\s*0[,.]\d+", formula, re.I):
        flags.append("dvojite_prepoceni_ve_vzorci")
    if re.search(r"lepší\s+(?:výsledek\s+)?(?:z\s+)?(?:ČJL|češtiny).{0,40}\bnebo\b.{0,30}(?:MAT|matematiky)", formula, re.I):
        flags.append("vyber_jednoho_predmetu")
    if any(re.search(r"\bmax(?:imum|imálně)?\b|nejvýše", str(item), re.I)
           for item in navrh.get("minima", [])):
        flags.append("maximum_mezi_minimy")
    return sorted(set(flags))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-id", action="append")
    args = parser.parse_args()
    refs = json.loads(pilot.REFERENCE.read_text(encoding="utf-8"))["zaznamy"]
    ids = args.source_id or [row["source_id"] for row in refs]
    manifest = pilot.latest_manifest()
    for source_id in ids:
        row = manifest[source_id]
        path = BASE / "llm-pilot/deepseek" / f"{source_id}-v3.json"
        record = json.loads(path.read_text(encoding="utf-8"))
        if record["sha256"] != row["sha256"] or record["rok"] != 2026 or record["kolo"] != 1:
            raise SystemExit(f"Jiný PDF nebo rozsah: {source_id}")
        suffix = ".ocr.txt" if row["stav"] == "ocr_text" else ".txt"
        text = (BASE / "text" / f"{row['sha256']}{suffix}").read_text(encoding="utf-8")
        flags = prover(record["navrh"], text)
        total = vypoctene_maximum(record["navrh"])
        print(source_id, f"odvozene_maximum={total if total is not None else 'nezjisteno'}",
              ", ".join(flags) or "bez mechanického nálezu")


if __name__ == "__main__":
    main()
