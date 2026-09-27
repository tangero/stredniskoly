#!/usr/bin/env python3
"""Srovná dvojí čtení vzorku 100 a vybere podklady pro Opus."""

import importlib.util
import json
import random
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "data/dipsy-kriteria-2026"
OUTPUT = BASE / "llm-pilot/vzorek-100"
spec = importlib.util.spec_from_file_location("kriteria_kontrola", ROOT / "scripts/dipsy-kriteria-kontrola-v4.py")
validator = importlib.util.module_from_spec(spec)
spec.loader.exec_module(validator)
sample_spec = importlib.util.spec_from_file_location("kriteria_vzorek", ROOT / "scripts/dipsy-kriteria-vzorek-100-beh.py")
batch = importlib.util.module_from_spec(sample_spec)
sample_spec.loader.exec_module(batch)


def normalized_summary(draft):
    fields = ("rezim", "jpz_prepocet", "jpz_vaha_pct", "jpz_cjl_max", "jpz_mat_max",
              "jpz_max_po_prepoctu", "max_bodu_celkem")
    parts = sorted(((item.get("max_bodu_pred_prepocet"), item.get("vaha_pct"),
                     item.get("max_bodu_po_prepoctu"))
                    for item in draft.get("dalsi_bodovane_slozky") or []), key=str)
    minima = tuple(sorted(set(re.findall(r"\d+(?:[,.]\d+)?", " ".join(draft.get("minima") or [])))))
    return {"zaklad": [draft.get(field) for field in fields], "slozky": parts,
            "minima_cisla": minima, "pocet_rovnosti": len(draft.get("rovnost") or []),
            "odvozene_maximum": str(validator.vypoctene_maximum(draft))
            if validator.vypoctene_maximum(draft) is not None else None}


def normalized_rules(draft):
    """Přísná textová kontrola: rozdíl vět je důvod pro další čtení, ne pro verdikt."""
    def clean(value):
        return re.sub(r"\s+", " ", value.casefold()).strip()
    return {field: sorted(clean(str(value)) for value in draft.get(field) or [])
            for field in ("minima", "rovnost", "dalsi_podminky")}


def read_record(kind, item, manifest):
    source_id = item["source_id"]
    path = OUTPUT / kind / f"{source_id}-v1.json"
    if not path.is_file():
        return None
    record = json.loads(path.read_text(encoding="utf-8"))
    if (record.get("sha256") != item["sha256"] or record.get("rok") != 2026
            or record.get("kolo") != 1 or record.get("verze_zadani") != 4
            or record.get("source_id") != source_id):
        raise RuntimeError(f"Nesprávná identita modelového výstupu: {kind} {source_id}")
    row = manifest[source_id]
    suffix = ".ocr.txt" if row["stav"] == "ocr_text" else ".txt"
    text = (BASE / "text" / f"{row['sha256']}{suffix}").read_text(encoding="utf-8")
    return {"record": record, "summary": normalized_summary(record["navrh"]),
            "pravidla": normalized_rules(record["navrh"]),
            "nalezy": validator.prover(record["navrh"], text)}


def main():
    sample = batch.load_sample()
    manifest = validator.pilot.latest_manifest()
    rows = []
    for item in sample:
        deepseek = read_record("deepseek", item, manifest)
        luna = read_record("luna", item, manifest)
        opus = read_record("opus", item, manifest)
        reasons = []
        if deepseek is None or luna is None:
            reasons.append("chybi_dvojice")
        else:
            if deepseek["record"]["prompt_sha256"] != luna["record"]["prompt_sha256"]:
                raise RuntimeError(f"Modely četly různá zadání: {item['source_id']}")
            if deepseek["summary"] != luna["summary"]:
                reasons.append("neshoda_struktury")
            if deepseek["pravidla"] != luna["pravidla"]:
                reasons.append("neshoda_textu_pravidel")
            if deepseek["nalezy"] or luna["nalezy"]:
                reasons.append("mechanicky_nalez")
            if (deepseek["record"]["navrh"].get("nejasnosti")
                    or luna["record"]["navrh"].get("nejasnosti")):
                reasons.append("modelova_nejasnost")
            if deepseek["summary"]["odvozene_maximum"] is None:
                reasons.append("neurcene_maximum")
        if item["ocr"]:
            reasons.append("ocr")
        if item["vrstva"] == "sdilene_pdf":
            reasons.append("sdilene_pdf")
        if item["vrstva"] == "dlouhe_pdf":
            reasons.append("dlouhe_pdf")
        rows.append({"source_id": item["source_id"], "sha256": item["sha256"],
                     "vrstva": item["vrstva"], "ocr": item["ocr"], "duvody_opus": reasons,
                     "deepseek": deepseek, "luna": luna, "opus": opus})
    clean = [row for row in rows if not row["duvody_opus"]]
    rng = random.Random(42)
    for row in rng.sample(clean, min(10, len(clean))):
        row["duvody_opus"].append("nahodny_souhlas")
    selected = [row["source_id"] for row in rows if row["duvody_opus"]]
    counts = Counter(reason for row in rows for reason in row["duvody_opus"])
    payload = {"rok": 2026, "kolo": 1, "celkem": len(rows), "pro_opus": selected,
               "duvody": dict(counts), "zaznamy": rows}
    path = OUTPUT / "srovnani.json"
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Dvojice: {sum(row['deepseek'] is not None and row['luna'] is not None for row in rows)}/100")
    print(f"Opus podle pravidel: {len(selected)}/100; hotovo: {sum(row['opus'] is not None for row in rows)}")
    print("Důvody:", dict(counts))
    print("Výstup:", path)


if __name__ == "__main__":
    main()
