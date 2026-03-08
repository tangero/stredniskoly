#!/usr/bin/env python3
"""Match obory between 2025 and 2026 data for year-over-year comparison.

Produces:
- data/obory_matching.json: Matched obory with confidence levels
- data/obory_manual_review.csv: Ambiguous cases for manual review

Usage:
    python scripts/match_obory_2025_2026.py
"""

import csv
import json
import re
import unicodedata
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Optional

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent
SCHOOLS_2025_PATH = BASE_DIR / "public" / "schools_data.json"
APPLICATIONS_2026_PATH = BASE_DIR / "public" / "applications_2026.json"
OUTPUT_MATCHING_PATH = BASE_DIR / "data" / "obory_matching.json"
OUTPUT_REVIEW_PATH = BASE_DIR / "data" / "obory_manual_review.csv"
MANUAL_OVERRIDES_PATH = BASE_DIR / "data" / "obory_manual_overrides.csv"

# Regex for parsing IDs: REDIZO_KKOV[_zaměření]
ID_PATTERN = re.compile(r"^(\d+)_(\d{2}-\d{2}-[A-Z]/\d{2})(?:_(.+))?$")

# Common prefixes to strip when comparing zaměření slugs
STRIP_PREFIXES = [
    "vseobecne_",
    "se_zamerenim_na_",
    "zamereni_",
    "zameren_na_",
    "obor_",
]


def normalize_slug(slug: Optional[str]) -> str:
    """Normalize zaměření slug for comparison.

    Lowercase, strip diacritics, remove punctuation, replace hyphens with underscores.
    """
    if not slug:
        return ""
    # NFD decomposition, remove combining characters
    normalized = unicodedata.normalize("NFD", slug)
    normalized = "".join(c for c in normalized if unicodedata.category(c) != "Mn")
    # Lowercase, replace hyphens, remove punctuation (commas, colons, parens, etc.)
    normalized = normalized.lower().replace("-", "_")
    normalized = re.sub(r"[,;:()\"'!?.]", "", normalized)
    # Collapse multiple underscores
    normalized = re.sub(r"_+", "_", normalized).strip("_")
    return normalized


def strip_common_prefixes(slug: str) -> str:
    """Strip common prefixes from a normalized slug."""
    for prefix in STRIP_PREFIXES:
        if slug.startswith(prefix):
            slug = slug[len(prefix):]
    return slug


def parse_id(record_id: str) -> tuple[str, str, str]:
    """Parse an ID into (base_key, redizo, kkov, zamereni_slug).

    Returns:
        Tuple of (base_key, zamereni_slug, redizo).
        base_key = "REDIZO_KKOV"
        zamereni_slug = rest after base_key, or ""
    """
    m = ID_PATTERN.match(record_id)
    if not m:
        raise ValueError(f"Cannot parse ID: {record_id}")
    redizo, kkov, zamereni = m.group(1), m.group(2), m.group(3) or ""
    base_key = f"{redizo}_{kkov}"
    return base_key, zamereni, redizo


def slug_similarity(slug_a: str, slug_b: str) -> tuple[str, float]:
    """Compare two normalized slugs and return (match_type, score).

    Returns:
        Tuple of (match_description, score 0-1).
    """
    if not slug_a and not slug_b:
        return "both_empty", 1.0
    if slug_a == slug_b:
        return "exact", 1.0

    # Strip common prefixes and compare
    stripped_a = strip_common_prefixes(slug_a)
    stripped_b = strip_common_prefixes(slug_b)
    if stripped_a and stripped_b and stripped_a == stripped_b:
        return "exact_after_strip", 0.9

    # One contains the other
    if slug_a and slug_b:
        if slug_a in slug_b or slug_b in slug_a:
            return "contains", 0.8
        if stripped_a and stripped_b:
            if stripped_a in stripped_b or stripped_b in stripped_a:
                return "contains_after_strip", 0.7

    # Word overlap scoring
    if slug_a and slug_b:
        words_a = set(slug_a.split("_")) - {"", "a", "na", "s", "se", "v", "ve", "ze", "do"}
        words_b = set(slug_b.split("_")) - {"", "a", "na", "s", "se", "v", "ve", "ze", "do"}
        if words_a and words_b:
            overlap = words_a & words_b
            jaccard = len(overlap) / len(words_a | words_b)
            if jaccard >= 0.5:
                return "word_overlap", round(jaccard * 0.8, 2)

    return "no_match", 0.0


def load_data() -> tuple[list[dict], list[dict]]:
    """Load 2025 and 2026 data.

    Filters out fake 2025 records created by 2026 import (is_new_2026=True with zero data).
    """
    with open(SCHOOLS_2025_PATH, encoding="utf-8") as f:
        schools = json.load(f)
    # Exclude records injected by 2026 import - they have is_new_2026=True and no real 2025 data
    records_2025 = [
        s for s in schools["2025"]
        if not s.get("is_new_2026")
    ]

    with open(APPLICATIONS_2026_PATH, encoding="utf-8") as f:
        apps = json.load(f)
    records_2026 = apps["data"]

    return records_2025, records_2026


def build_index(
    records: list[dict],
) -> dict[str, list[dict]]:
    """Group records by base_key, enriching each with parsed fields.

    Deduplicates by ID, keeping record with highest prihlasky.
    """
    index: dict[str, list[dict]] = defaultdict(list)
    seen_ids: dict[str, dict] = {}
    for rec in records:
        base_key, zamereni, redizo = parse_id(rec["id"])
        rec["_base_key"] = base_key
        rec["_zamereni"] = zamereni
        rec["_zamereni_norm"] = normalize_slug(zamereni)
        rec["_redizo"] = redizo

        rid = rec["id"]
        if rid in seen_ids:
            # Keep the one with more data
            if rec.get("prihlasky", 0) > seen_ids[rid].get("prihlasky", 0):
                # Replace in the index list
                idx_list = index[base_key]
                for i, existing in enumerate(idx_list):
                    if existing["id"] == rid:
                        idx_list[i] = rec
                        break
                seen_ids[rid] = rec
        else:
            seen_ids[rid] = rec
            index[base_key].append(rec)
    return dict(index)


def match_obory(
    index_2025: dict[str, list[dict]],
    index_2026: dict[str, list[dict]],
) -> tuple[dict, list[dict]]:
    """Match 2026 obory to 2025 obory.

    Returns:
        Tuple of (matches dict, manual_review list).
    """
    matches: dict[str, dict] = {}
    manual_review: list[dict] = []

    all_base_keys = set(index_2025.keys()) | set(index_2026.keys())

    for base_key in sorted(all_base_keys):
        list_2025 = index_2025.get(base_key, [])
        list_2026 = index_2026.get(base_key, [])

        n25 = len(list_2025)
        n26 = len(list_2026)

        # No 2026 records for this base_key - skip (2025-only, discontinued)
        if n26 == 0:
            continue

        # New in 2026 - no 2025 records
        if n25 == 0:
            for rec26 in list_2026:
                matches[rec26["id"]] = {
                    "match_type": "new",
                    "matched_2025_id": None,
                    "all_2025_ids": [],
                    "confidence": "high",
                    "note": "No 2025 records for this base key",
                }
            continue

        # Category A: 1:1
        if n25 == 1 and n26 == 1:
            rec25 = list_2025[0]
            rec26 = list_2026[0]
            slug_match, _ = slug_similarity(
                rec25["_zamereni_norm"], rec26["_zamereni_norm"]
            )
            matches[rec26["id"]] = {
                "match_type": "auto_1to1",
                "matched_2025_id": rec25["id"],
                "all_2025_ids": [rec25["id"]],
                "confidence": "high",
                "note": f"1:1 match, slug: {slug_match}",
                "prev_prihlasky": rec25.get("prihlasky"),
                "prev_kapacita": rec25.get("kapacita"),
                "prev_min_body": rec25.get("min_body"),
            }
            continue

        # Category B: N:1 (multiple 2025, single 2026)
        if n26 == 1:
            rec26 = list_2026[0]
            norm26 = rec26["_zamereni_norm"]
            all_ids_25 = [r["id"] for r in list_2025]

            # Try exact slug match first, but prefer records with actual data
            best_match = None
            best_score = 0.0
            for rec25 in list_2025:
                _, score = slug_similarity(rec25["_zamereni_norm"], norm26)
                # Boost score for records with real data (prihlasky > 0)
                has_data = rec25.get("prihlasky", 0) > 0
                effective_score = score + (0.01 if has_data else 0)
                if effective_score > best_score:
                    best_score = score  # keep original score for reporting
                    best_match = rec25

            # If no slug match, pick by highest přihlášky
            if best_score == 0.0:
                best_match = max(list_2025, key=lambda r: r.get("prihlasky", 0))
                confidence = "medium"
                note = f"N:1 ({n25}->1), no slug match, picked by highest prihlasky"
            else:
                confidence = "high" if best_score >= 0.8 else "medium"
                note = f"N:1 ({n25}->1), slug score={best_score:.1f}"

            matches[rec26["id"]] = {
                "match_type": "auto_n1",
                "matched_2025_id": best_match["id"],
                "all_2025_ids": all_ids_25,
                "confidence": confidence,
                "note": note,
                "prev_prihlasky": best_match.get("prihlasky"),
                "prev_kapacita": best_match.get("kapacita"),
                "prev_min_body": best_match.get("min_body"),
            }
            continue

        # Category B inverse: 1:N (1 in 2025, multiple in 2026)
        if n25 == 1:
            rec25 = list_2025[0]
            norm25 = rec25["_zamereni_norm"]

            best_match_26 = None
            best_score = 0.0
            for rec26 in list_2026:
                _, score = slug_similarity(norm25, rec26["_zamereni_norm"])
                if score > best_score:
                    best_score = score
                    best_match_26 = rec26

            for rec26 in list_2026:
                _, score = slug_similarity(norm25, rec26["_zamereni_norm"])
                if rec26 is best_match_26 and best_score > 0:
                    matches[rec26["id"]] = {
                        "match_type": "auto_1n",
                        "matched_2025_id": rec25["id"],
                        "all_2025_ids": [rec25["id"]],
                        "confidence": "high" if best_score >= 0.8 else "medium",
                        "note": f"1:N (1->{n26}), best slug match score={best_score:.1f}",
                        "prev_prihlasky": rec25.get("prihlasky"),
                        "prev_kapacita": rec25.get("kapacita"),
                        "prev_min_body": rec25.get("min_body"),
                    }
                elif score > 0:
                    matches[rec26["id"]] = {
                        "match_type": "auto_1n",
                        "matched_2025_id": rec25["id"],
                        "all_2025_ids": [rec25["id"]],
                        "confidence": "low",
                        "note": f"1:N (1->{n26}), secondary match score={score:.1f}",
                        "prev_prihlasky": rec25.get("prihlasky"),
                        "prev_kapacita": rec25.get("kapacita"),
                        "prev_min_body": rec25.get("min_body"),
                    }
                else:
                    # Likely a new zaměření split from the original
                    matches[rec26["id"]] = {
                        "match_type": "new",
                        "matched_2025_id": None,
                        "all_2025_ids": [rec25["id"]],
                        "confidence": "low",
                        "note": f"1:N (1->{n26}), no slug match to single 2025 record",
                    }
            continue

        # Category C: N:N (multiple in both years)
        _match_nn(
            base_key, list_2025, list_2026, matches, manual_review
        )

    return matches, manual_review


def _match_nn(
    base_key: str,
    list_2025: list[dict],
    list_2026: list[dict],
    matches: dict[str, dict],
    manual_review: list[dict],
) -> None:
    """Handle N:N matching (multiple records in both years)."""
    n25 = len(list_2025)
    n26 = len(list_2026)

    # Build similarity matrix
    remaining_25 = list(list_2025)
    remaining_26 = list(list_2026)

    # Pass 1: exact and high-confidence matches
    matched_pairs: list[tuple[dict, dict, float]] = []

    for rec26 in list(remaining_26):
        best_match = None
        best_score = 0.0
        best_desc = ""
        for rec25 in remaining_25:
            desc, score = slug_similarity(
                rec25["_zamereni_norm"], rec26["_zamereni_norm"]
            )
            if score > best_score:
                best_score = score
                best_match = rec25
                best_desc = desc

        if best_score >= 0.7 and best_match is not None:
            # Check this 2025 record isn't a better match for another 2026 record
            # (greedy approach - take best available)
            matched_pairs.append((best_match, rec26, best_score))
            remaining_25.remove(best_match)
            remaining_26.remove(rec26)

    # Record matched pairs
    all_ids_25 = [r["id"] for r in list_2025]
    for rec25, rec26, score in matched_pairs:
        confidence = "high" if score >= 0.9 else "medium"
        matches[rec26["id"]] = {
            "match_type": "auto_fuzzy",
            "matched_2025_id": rec25["id"],
            "all_2025_ids": all_ids_25,
            "confidence": confidence,
            "note": f"N:N ({n25}->{n26}), slug score={score:.1f}",
            "prev_prihlasky": rec25.get("prihlasky"),
            "prev_kapacita": rec25.get("kapacita"),
            "prev_min_body": rec25.get("min_body"),
        }

    # Remaining 2026 records that couldn't be matched
    for rec26 in remaining_26:
        # Try a softer match with remaining 2025
        best_match = None
        best_score = 0.0
        if remaining_25:
            for rec25 in remaining_25:
                _, score = slug_similarity(
                    rec25["_zamereni_norm"], rec26["_zamereni_norm"]
                )
                if score > best_score:
                    best_score = score
                    best_match = rec25

        candidates_25 = remaining_25 if remaining_25 else list_2025
        candidate_ids = [r["id"] for r in candidates_25]
        candidate_zams = [r.get("_zamereni", "") for r in candidates_25]

        if best_score >= 0.5 and best_match is not None:
            # Weak but plausible match
            matches[rec26["id"]] = {
                "match_type": "auto_fuzzy",
                "matched_2025_id": best_match["id"],
                "all_2025_ids": all_ids_25,
                "confidence": "low",
                "note": f"N:N ({n25}->{n26}), weak slug score={best_score:.1f}",
                "prev_prihlasky": best_match.get("prihlasky"),
                "prev_kapacita": best_match.get("kapacita"),
                "prev_min_body": best_match.get("min_body"),
            }
        else:
            # Needs manual review
            suggested = best_match["id"] if best_match else ""
            manual_review.append({
                "base_key": base_key,
                "id_2026": rec26["id"],
                "zamereni_2026": rec26.get("_zamereni", ""),
                "prihlasky_2026": rec26.get("prihlasky", ""),
                "kapacita_2026": rec26.get("kapacita", ""),
                "candidates_2025": ";".join(candidate_ids),
                "candidates_zamereni_2025": ";".join(candidate_zams),
                "suggested_match": suggested,
                "action": "",
            })
            matches[rec26["id"]] = {
                "match_type": "manual_needed",
                "matched_2025_id": None,
                "all_2025_ids": all_ids_25,
                "confidence": "low",
                "note": f"N:N ({n25}->{n26}), needs manual review",
            }


def apply_manual_overrides(
    matches: dict[str, dict],
    records_2025: list[dict],
) -> int:
    """Apply manual review CSV overrides to matches.

    Reads data/obory_manual_review.csv and updates matches for rows
    where action is 'match' or 'new'. Skips rows with empty action.

    Returns:
        Number of overrides applied.
    """
    if not MANUAL_OVERRIDES_PATH.exists():
        print("  No manual review CSV found, skipping overrides.")
        return 0

    # Build lookup for 2025 records by ID
    records_2025_by_id: dict[str, dict] = {}
    for rec in records_2025:
        records_2025_by_id[rec["id"]] = rec

    overrides_applied = 0
    seen_2026_ids: dict[str, str] = {}  # track which action was applied per 2026 id

    with open(MANUAL_OVERRIDES_PATH, encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            action = row.get("action", "").strip()
            if not action:
                continue

            id_2026 = row["id_2026"]
            candidate_2025_id = row.get("candidate_2025_id", "")

            # Skip if we already processed this 2026 ID with an action
            if id_2026 in seen_2026_ids:
                continue

            if action == "match":
                if id_2026 not in matches:
                    print(f"  WARNING: Manual match for unknown 2026 ID: {id_2026}")
                    continue

                # Look up 2025 record data
                rec_2025 = records_2025_by_id.get(candidate_2025_id)
                prev_prihlasky = rec_2025.get("prihlasky") if rec_2025 else None
                prev_kapacita = rec_2025.get("kapacita") if rec_2025 else None
                prev_min_body = rec_2025.get("min_body") if rec_2025 else None

                existing = matches[id_2026]
                existing["match_type"] = "manual"
                existing["matched_2025_id"] = candidate_2025_id
                existing["confidence"] = "high"
                existing["note"] = f"Manual override: matched to {candidate_2025_id}"
                existing["prev_prihlasky"] = prev_prihlasky
                existing["prev_kapacita"] = prev_kapacita
                existing["prev_min_body"] = prev_min_body

                seen_2026_ids[id_2026] = "match"
                overrides_applied += 1

            elif action == "new":
                if id_2026 not in matches:
                    print(f"  WARNING: Manual 'new' for unknown 2026 ID: {id_2026}")
                    continue

                existing = matches[id_2026]
                existing["match_type"] = "new"
                existing["matched_2025_id"] = None
                existing["confidence"] = "high"
                existing["note"] = "Manual override: marked as new"
                # Remove prev_ fields since there's no match
                existing.pop("prev_prihlasky", None)
                existing.pop("prev_kapacita", None)
                existing.pop("prev_min_body", None)

                seen_2026_ids[id_2026] = "new"
                overrides_applied += 1

    return overrides_applied


def save_matching(matches: dict, manual_review: list[dict]) -> None:
    """Save matching results to JSON and CSV."""
    # Ensure output directory exists
    OUTPUT_MATCHING_PATH.parent.mkdir(parents=True, exist_ok=True)

    # Compute stats
    type_counts: dict[str, int] = defaultdict(int)
    confidence_counts: dict[str, int] = defaultdict(int)
    for m in matches.values():
        type_counts[m["match_type"]] += 1
        confidence_counts[m["confidence"]] += 1

    output = {
        "meta": {
            "generated": datetime.now().isoformat(),
            "total_2026_obory": len(matches),
            "manual_review_count": len(manual_review),
            "stats_by_type": dict(type_counts),
            "stats_by_confidence": dict(confidence_counts),
        },
        "matches": matches,
    }

    with open(OUTPUT_MATCHING_PATH, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    # CSV for manual review - one row per candidate pair for easy editing
    review_path_pairs = OUTPUT_REVIEW_PATH
    fieldnames = [
        "review_id",
        "base_key",
        "id_2026",
        "zamereni_2026",
        "prihlasky_2026",
        "kapacita_2026",
        "candidate_2025_id",
        "candidate_2025_zamereni",
        "candidate_2025_prihlasky",
        "action",
    ]
    with open(review_path_pairs, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        review_id = 0
        if manual_review:
            for row in manual_review:
                candidate_ids = row["candidates_2025"].split(";") if row["candidates_2025"] else []
                candidate_zams = row["candidates_zamereni_2025"].split(";") if row["candidates_zamereni_2025"] else []
                # Find prihlasky for each candidate from 2025 data
                seen_candidates = set()
                for ci, cid in enumerate(candidate_ids):
                    if cid in seen_candidates:
                        continue
                    seen_candidates.add(cid)
                    review_id += 1
                    czam = candidate_zams[ci] if ci < len(candidate_zams) else ""
                    writer.writerow({
                        "review_id": review_id,
                        "base_key": row["base_key"],
                        "id_2026": row["id_2026"],
                        "zamereni_2026": row["zamereni_2026"],
                        "prihlasky_2026": row["prihlasky_2026"],
                        "kapacita_2026": row["kapacita_2026"],
                        "candidate_2025_id": cid,
                        "candidate_2025_zamereni": czam,
                        "candidate_2025_prihlasky": "",
                        "action": "",
                    })


def print_summary(matches: dict, manual_review: list[dict]) -> None:
    """Print summary statistics."""
    type_counts: dict[str, int] = defaultdict(int)
    confidence_counts: dict[str, int] = defaultdict(int)
    for m in matches.values():
        type_counts[m["match_type"]] += 1
        confidence_counts[m["confidence"]] += 1

    print("=" * 60)
    print("OBORY MATCHING 2025 -> 2026 SUMMARY")
    print("=" * 60)
    print(f"\nTotal 2026 obory: {len(matches)}")
    print(f"\nBy match type:")
    for mt in sorted(type_counts.keys()):
        print(f"  {mt:20s}: {type_counts[mt]:5d}")
    print(f"\nBy confidence:")
    for c in ["high", "medium", "low"]:
        print(f"  {c:20s}: {confidence_counts.get(c, 0):5d}")
    print(f"\nManual review needed: {len(manual_review)}")
    print(f"\nOutput files:")
    print(f"  {OUTPUT_MATCHING_PATH}")
    print(f"  {OUTPUT_REVIEW_PATH}")
    print("=" * 60)


def main() -> None:
    """Run the matching pipeline."""
    print("Loading data...")
    records_2025, records_2026 = load_data()
    print(f"  2025 records: {len(records_2025)}")
    print(f"  2026 records: {len(records_2026)}")

    print("Building indexes...")
    index_2025 = build_index(records_2025)
    index_2026 = build_index(records_2026)
    print(f"  2025 base keys: {len(index_2025)}")
    print(f"  2026 base keys: {len(index_2026)}")

    # Check overlap
    common_keys = set(index_2025.keys()) & set(index_2026.keys())
    only_2025 = set(index_2025.keys()) - set(index_2026.keys())
    only_2026 = set(index_2026.keys()) - set(index_2025.keys())
    print(f"  Common base keys: {len(common_keys)}")
    print(f"  Only in 2025 (discontinued): {len(only_2025)}")
    print(f"  Only in 2026 (new base keys): {len(only_2026)}")

    print("Matching obory...")
    matches, manual_review = match_obory(index_2025, index_2026)

    print("Applying manual overrides from CSV...")
    overrides = apply_manual_overrides(matches, records_2025)
    print(f"  Applied {overrides} manual overrides")

    print("Saving results...")
    save_matching(matches, manual_review)

    print_summary(matches, manual_review)


if __name__ == "__main__":
    main()
