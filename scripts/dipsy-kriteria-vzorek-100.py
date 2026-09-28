#!/usr/bin/env python3
"""Připraví opakovatelný slepý vzorek 100 nabídek pro extrakci kritérií 2026.

Výstup se ukládá do gitignorovaného korpusu, bez volání API a bez modelových nákladů.
"""

import json
import random
import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "data/dipsy-kriteria-2026"
OUTPUT = BASE / "vzorek-100.json"
SEED = 42


def main():
    catalog = {item["source_id"]: item for item in json.loads(
        (ROOT / "public/applications_2026.json").read_text(encoding="utf-8"))["data"]}
    excluded_ids = {item["source_id"] for item in json.loads(
        (ROOT / "src/data/kriteria-prijeti-2026-pilot.json").read_text(encoding="utf-8"))["zaznamy"]}
    latest = {}
    with (BASE / "manifest.jsonl").open(encoding="utf-8") as stream:
        for line in stream:
            item = json.loads(line)
            latest[item["source_id"]] = item
    excluded_hashes = {latest[source_id]["sha256"] for source_id in excluded_ids}
    grouped = defaultdict(list)
    for source_id, item in latest.items():
        if item.get("stav") in ("text", "ocr_text") and item["sha256"] not in excluded_hashes:
            grouped[item["sha256"]].append(item)
    candidates = []
    for sha, rows in grouped.items():
        row = rows[0]
        suffix = ".ocr.txt" if row["stav"] == "ocr_text" else ".txt"
        value = (BASE / "text" / f"{sha}{suffix}").read_text(encoding="utf-8")
        pct = [float(number.replace(",", ".")) for number in re.findall(
            r"\b(?:váh\w*|podíl\w*)\b.{0,80}(\d{1,3}(?:[,.]\d+)?)\s*%",
            value, re.IGNORECASE | re.DOTALL)]
        candidates.append({
            "sha256": sha, "rows": sorted(rows, key=lambda x: x["source_id"]),
            "ocr": row["stav"] == "ocr_text", "znaku": len(value),
            "vaha_signal": any(number not in (60, 40) for number in pct),
        })
    rng = random.Random(SEED)
    used_hashes = set()
    selection = []

    def choose(pool, count, stratum, two=False):
        pool = sorted((item for item in pool if item["sha256"] not in used_hashes),
                      key=lambda item: item["sha256"])
        rng.shuffle(pool)
        if len(pool) < count:
            raise RuntimeError(f"Ve vrstvě {stratum} je jen {len(pool)} PDF, požadováno {count}.")
        for item in pool[:count]:
            used_hashes.add(item["sha256"])
            rows = item["rows"]
            if two:
                first = rows[0]
                second = next((row for row in rows[1:] if
                               (catalog[row["source_id"]]["kkov"], catalog[row["source_id"]].get("zamereni")) !=
                               (catalog[first["source_id"]]["kkov"], catalog[first["source_id"]].get("zamereni"))), None)
                if second is None:
                    raise RuntimeError("Sdílené PDF nemá dvě odlišné nabídky.")
                rows = [first, second]
            else:
                rows = [rng.choice(rows)]
            for row in rows:
                offer = catalog[row["source_id"]]
                selection.append({
                    "vrstva": stratum, "source_id": row["source_id"], "sha256": item["sha256"],
                    "redizo": offer["redizo"], "kkov": offer["kkov"],
                    "zamereni": offer.get("zamereni") or "", "nazev": offer["nazev"],
                    "text_znaku": item["znaku"], "ocr": item["ocr"],
                    "nabidek_se_stejnym_pdf": len(item["rows"]),
                })

    def has_distinct_offers(item):
        identities = {(catalog[row["source_id"]]["kkov"],
                       catalog[row["source_id"]].get("zamereni") or "") for row in item["rows"]}
        return len(identities) > 1

    choose([item for item in candidates if has_distinct_offers(item)], 10, "sdilene_pdf", two=True)
    choose([item for item in candidates if item["ocr"]], 20, "ocr")
    long = sorted((item for item in candidates if item["sha256"] not in used_hashes),
                  key=lambda item: (-item["znaku"], item["sha256"]))[:10]
    if len(long) != 10:
        raise RuntimeError("Není dost dlouhých PDF.")
    for item in long:
        used_hashes.add(item["sha256"])
        row = rng.choice(item["rows"])
        offer = catalog[row["source_id"]]
        selection.append({
            "vrstva": "dlouhe_pdf", "source_id": row["source_id"], "sha256": item["sha256"],
            "redizo": offer["redizo"], "kkov": offer["kkov"],
            "zamereni": offer.get("zamereni") or "", "nazev": offer["nazev"],
            "text_znaku": item["znaku"], "ocr": item["ocr"],
            "nabidek_se_stejnym_pdf": len(item["rows"]),
        })
    choose([item for item in candidates if item["vaha_signal"]], 20, "signal_vahy")
    choose(candidates, 30, "nahodne")
    if len(selection) != 100 or len({item["source_id"] for item in selection}) != 100:
        raise RuntimeError("Vzorek nemá 100 různých nabídek.")
    OUTPUT.write_text(json.dumps({"rok": 2026, "kolo": 1, "seed": SEED,
                                  "pocet_nabidek": len(selection),
                                  "pocet_pdf": len(used_hashes), "nabidky": selection},
                                 ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{len(selection)} nabídek, {len(used_hashes)} různých PDF -> {OUTPUT}")
    for stratum in ("sdilene_pdf", "ocr", "dlouhe_pdf", "signal_vahy", "nahodne"):
        rows = [item for item in selection if item["vrstva"] == stratum]
        print(f"{stratum}: {len(rows)} nabídek")


if __name__ == "__main__":
    main()
