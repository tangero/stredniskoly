#!/usr/bin/env python3
"""Generuje produkční manifest inspekčních zpráv SŠ mladších N let."""
import argparse
import json
import pathlib
import re
from datetime import datetime


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-age-years", type=int, default=5)
    parser.add_argument("--output", default="config/production_reports.json")
    args = parser.parse_args()

    root = pathlib.Path(__file__).resolve().parents[1]
    repo_root = root.parent

    # Load secondary school REDIZOs with metadata
    schools_path = repo_root / "public" / "schools_data.json"
    with schools_path.open("r", encoding="utf-8") as f:
        schools_data = json.load(f)

    redizo_info = {}
    for year in schools_data:
        for s in schools_data[year]:
            r = str(s["redizo"])
            if r not in redizo_info:
                redizo_info[r] = {
                    "nazev": s.get("nazev", ""),
                    "nazev_display": s.get("nazev_display", ""),
                    "obec": s.get("obec", ""),
                    "typ": s.get("typ", "SOS"),
                }
            if s.get("typ"):
                redizo_info[r]["typ"] = s["typ"]

    # Load CSI inspections
    csi_path = repo_root / "public" / "csi_inspections.json"
    with csi_path.open("r", encoding="utf-8") as f:
        csi_data = json.load(f)

    cutoff = datetime(datetime.now().year - args.max_age_years, datetime.now().month, datetime.now().day)
    reports = []

    for redizo, info in redizo_info.items():
        if redizo not in csi_data:
            continue
        school = csi_data[redizo]
        for insp in school["inspections"]:
            date_str = insp["dateFrom"]
            try:
                d = datetime.fromisoformat(date_str.split(".")[0])
            except (ValueError, IndexError):
                continue
            if d < cutoff:
                continue

            date_from = d.strftime("%Y-%m-%d")
            date_to_str = insp.get("dateTo", "")
            try:
                date_to = datetime.fromisoformat(date_to_str.split(".")[0]).strftime("%Y-%m-%d")
            except (ValueError, IndexError):
                date_to = date_from

            school_type = info["typ"]
            name = info.get("nazev_display") or info.get("nazev") or school.get("jmeno", "")
            city = info.get("obec", "")
            report_id = f"{school_type}_{redizo}_{date_from}"

            reports.append({
                "report_id": report_id,
                "redizo": redizo,
                "school_type": school_type,
                "school_name": name,
                "city": city,
                "inspection_from": date_from,
                "inspection_to": date_to,
                "source_url": insp.get("reportUrl", ""),
                "pdf_file": f"{report_id}.pdf",
                "text_file": f"{report_id}.txt",
            })

    reports.sort(key=lambda r: r["inspection_from"], reverse=True)

    output_path = root / args.output
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps({"reports": reports}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    # Stats
    from collections import Counter
    type_counts = Counter(r["school_type"] for r in reports)
    year_counts = Counter(r["inspection_from"][:4] for r in reports)

    print(f"Manifest: {output_path}")
    print(f"Celkem zpráv: {len(reports)}")
    print(f"Cutoff: {cutoff.strftime('%Y-%m-%d')}")
    print(f"Typy: {dict(type_counts.most_common())}")
    print(f"Roky: {dict(sorted(year_counts.items()))}")


if __name__ == "__main__":
    main()
