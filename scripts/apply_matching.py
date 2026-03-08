#!/usr/bin/env python3
"""Apply obory matching results to update data files.

Reads data/obory_matching.json and updates:
- public/applications_2026.json (is_new flag)
- public/schools_data.json (remove fake 2025 entries)
- public/school_analysis.json (is_new_2026, matched_2025_id, prev_zamereni_name, etc.)

This script is idempotent - can be run multiple times safely.

Usage:
    python scripts/apply_matching.py
"""

import json
import re
from collections import defaultdict
from pathlib import Path

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent
MATCHING_PATH = BASE_DIR / "data" / "obory_matching.json"
APPLICATIONS_PATH = BASE_DIR / "public" / "applications_2026.json"
SCHOOLS_DATA_PATH = BASE_DIR / "public" / "schools_data.json"
SCHOOL_ANALYSIS_PATH = BASE_DIR / "public" / "school_analysis.json"

# Regex for parsing IDs: REDIZO_KKOV[_zaměření]
ID_PATTERN = re.compile(r"^(\d+)_(\d{2}-\d{2}-[A-Z]/\d{2})(?:_(.+))?$")


def parse_base_key(record_id: str) -> str:
    """Extract base key (REDIZO_KKOV) from a full ID."""
    m = ID_PATTERN.match(record_id)
    if not m:
        raise ValueError(f"Cannot parse ID: {record_id}")
    return f"{m.group(1)}_{m.group(2)}"


def load_matching() -> dict:
    """Load matching results."""
    with open(MATCHING_PATH, encoding="utf-8") as f:
        return json.load(f)


def update_applications(matching: dict) -> dict[str, int]:
    """Update is_new flag in applications_2026.json.

    If match has matched_2025_id -> remove is_new / set false
    If match has no matched_2025_id -> is_new: true
    """
    with open(APPLICATIONS_PATH, encoding="utf-8") as f:
        apps = json.load(f)

    matches = matching["matches"]
    stats = {"set_new": 0, "cleared_new": 0, "unchanged": 0}

    for record in apps["data"]:
        rid = record["id"]
        match_info = matches.get(rid)

        if match_info is None:
            continue

        has_match = match_info.get("matched_2025_id") is not None

        if has_match:
            # Has a 2025 match - not new
            if record.get("is_new"):
                del record["is_new"]
                stats["cleared_new"] += 1
            else:
                stats["unchanged"] += 1
        else:
            # No 2025 match - mark as new
            if not record.get("is_new"):
                record["is_new"] = True
                stats["set_new"] += 1
            else:
                stats["unchanged"] += 1

    with open(APPLICATIONS_PATH, "w", encoding="utf-8") as f:
        json.dump(apps, f, ensure_ascii=False, indent=2)

    return stats


def update_schools_data(matching: dict) -> dict[str, int]:
    """Update schools_data.json.

    Remove fake 2025 entries that have is_new_2026: true.
    """
    with open(SCHOOLS_DATA_PATH, encoding="utf-8") as f:
        sd = json.load(f)

    original_count = len(sd["2025"])

    # Remove fake entries injected by import (is_new_2026=True)
    sd["2025"] = [r for r in sd["2025"] if not r.get("is_new_2026")]

    removed = original_count - len(sd["2025"])

    with open(SCHOOLS_DATA_PATH, "w", encoding="utf-8") as f:
        json.dump(sd, f, ensure_ascii=False, separators=(",", ":"))

    return {"removed_fake": removed, "remaining": len(sd["2025"])}


def update_school_analysis(matching: dict) -> dict[str, int]:
    """Update school_analysis.json based on matching results.

    For each base key:
    - Aggregate all 2026 entries that map to this base key
    - Use matching info to determine if the obor is new or matched
    - Set is_new_2026 only if ALL 2026 entries for this base key are new
    - Add matched_2025_id, match_type, prev_zamereni_name where applicable
    - Re-populate 2026 data fields from applications_2026
    """
    with open(SCHOOL_ANALYSIS_PATH, encoding="utf-8") as f:
        sa = json.load(f)

    with open(APPLICATIONS_PATH, encoding="utf-8") as f:
        apps = json.load(f)

    with open(SCHOOLS_DATA_PATH, encoding="utf-8") as f:
        sd = json.load(f)

    matches = matching["matches"]

    # Build lookup: 2026 app records by ID
    apps_by_id: dict[str, dict] = {}
    for rec in apps["data"]:
        apps_by_id[rec["id"]] = rec

    # Build lookup: 2025 school records by ID
    schools_2025_by_id: dict[str, dict] = {}
    for rec in sd["2025"]:
        schools_2025_by_id[rec["id"]] = rec

    # Group matching entries by base key
    base_to_matches: dict[str, list[tuple[str, dict]]] = defaultdict(list)
    for mid, minfo in matches.items():
        try:
            base = parse_base_key(mid)
        except ValueError:
            continue
        base_to_matches[base].append((mid, minfo))

    stats = {
        "updated_matched": 0,
        "updated_new": 0,
        "cleared_is_new": 0,
        "no_change": 0,
        "added_prev_zamereni": 0,
    }

    for base, match_entries in base_to_matches.items():
        if base not in sa:
            continue

        entry = sa[base]

        # Aggregate 2026 data from all matching entries for this base key
        total_prihlasky_2026 = 0
        total_kapacita_2026 = 0
        total_pp_2026 = [0, 0, 0, 0, 0]
        all_new = True
        any_matched = False
        best_match_2025_id = None
        best_match_type = None
        best_match_prihlasky = -1
        prev_zamereni_name = None

        for mid, minfo in match_entries:
            app_rec = apps_by_id.get(mid)
            if app_rec:
                total_prihlasky_2026 += app_rec.get("prihlasky", 0)
                total_kapacita_2026 += app_rec.get("kapacita", 0)
                pp = app_rec.get("pp", [0, 0, 0, 0, 0])
                for i in range(min(5, len(pp))):
                    total_pp_2026[i] += pp[i]

            matched_2025 = minfo.get("matched_2025_id")
            if matched_2025:
                all_new = False
                any_matched = True
                # Pick the match with highest 2026 prihlasky as the "primary"
                app_prihlasky = app_rec.get("prihlasky", 0) if app_rec else 0
                if app_prihlasky > best_match_prihlasky:
                    best_match_prihlasky = app_prihlasky
                    best_match_2025_id = matched_2025
                    best_match_type = minfo.get("match_type")

                    # Check if zaměření name differs between 2025 and 2026
                    rec_2025 = schools_2025_by_id.get(matched_2025)
                    if rec_2025 and rec_2025.get("zamereni"):
                        # Extract 2026 zaměření from the 2026 ID
                        m26 = ID_PATTERN.match(mid)
                        zam_2026_slug = m26.group(3) if m26 and m26.group(3) else ""
                        zam_2025_name = rec_2025.get("zamereni", "")

                        # Compare: if they differ, store prev name
                        if zam_2025_name and zam_2026_slug:
                            # Normalize for comparison
                            import unicodedata

                            def _norm(s: str) -> str:
                                s = unicodedata.normalize("NFD", s)
                                s = "".join(
                                    c
                                    for c in s
                                    if unicodedata.category(c) != "Mn"
                                )
                                return (
                                    s.lower()
                                    .replace("-", "_")
                                    .replace(" ", "_")
                                    .strip("_")
                                )

                            if _norm(zam_2025_name) != _norm(zam_2026_slug):
                                prev_zamereni_name = zam_2025_name
            else:
                # This particular 2026 entry is new (no match)
                pass

        # Update entry
        idx_2026 = (
            round(total_prihlasky_2026 / total_kapacita_2026, 2)
            if total_kapacita_2026 > 0
            else 0
        )

        entry["prihlasky_2026"] = total_prihlasky_2026
        entry["kapacita_2026"] = total_kapacita_2026
        entry["index_poptavky_2026"] = idx_2026
        entry["prihlasky_priority_2026"] = total_pp_2026

        if any_matched:
            # At least one 2026 entry matched a 2025 record
            if entry.get("is_new_2026"):
                del entry["is_new_2026"]
                stats["cleared_is_new"] += 1

            entry["matched_2025_id"] = best_match_2025_id
            entry["match_type"] = best_match_type

            if prev_zamereni_name:
                entry["prev_zamereni_name"] = prev_zamereni_name
                stats["added_prev_zamereni"] += 1
            else:
                entry.pop("prev_zamereni_name", None)

            stats["updated_matched"] += 1
        else:
            # All 2026 entries are new
            entry["is_new_2026"] = True
            entry.pop("matched_2025_id", None)
            entry.pop("match_type", None)
            entry.pop("prev_zamereni_name", None)
            stats["updated_new"] += 1

    with open(SCHOOL_ANALYSIS_PATH, "w", encoding="utf-8") as f:
        json.dump(sa, f, ensure_ascii=False, separators=(",", ":"))

    return stats


def main() -> None:
    """Run the apply matching pipeline."""
    print("Loading matching data...")
    matching = load_matching()
    meta = matching["meta"]
    print(f"  Total matches: {meta['total_2026_obory']}")
    print(f"  By type: {meta['stats_by_type']}")

    print("\n1. Updating applications_2026.json (is_new flags)...")
    app_stats = update_applications(matching)
    print(f"  Set is_new=true: {app_stats['set_new']}")
    print(f"  Cleared is_new: {app_stats['cleared_new']}")
    print(f"  Unchanged: {app_stats['unchanged']}")

    print("\n2. Updating schools_data.json (removing fake 2025 entries)...")
    sd_stats = update_schools_data(matching)
    print(f"  Removed fake entries: {sd_stats['removed_fake']}")
    print(f"  Remaining 2025 records: {sd_stats['remaining']}")

    print("\n3. Updating school_analysis.json (matching + 2026 data)...")
    sa_stats = update_school_analysis(matching)
    print(f"  Updated (matched): {sa_stats['updated_matched']}")
    print(f"  Updated (new): {sa_stats['updated_new']}")
    print(f"  Cleared is_new_2026: {sa_stats['cleared_is_new']}")
    print(f"  Added prev_zamereni_name: {sa_stats['added_prev_zamereni']}")

    print("\nDone! All data files updated.")


if __name__ == "__main__":
    main()
