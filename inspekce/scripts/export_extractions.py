#!/usr/bin/env python3
"""Exportuje extrakce do public/inspection_extractions.json pro frontend."""
import argparse
import json
import pathlib
from datetime import datetime, timezone


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", default="config/production_reports.json")
    parser.add_argument("--model-id", default="claude_haiku_4_5",
                        help="Comma-separated model IDs (first has priority)")
    parser.add_argument("--outputs-dir", default="data/outputs")
    parser.add_argument("--output", default="")
    args = parser.parse_args()

    root = pathlib.Path(__file__).resolve().parents[1]
    repo_root = root.parent

    manifest_path = root / args.manifest
    with manifest_path.open("r", encoding="utf-8") as f:
        reports = json.load(f)["reports"]

    model_ids = [m.strip() for m in args.model_id.split(",") if m.strip()]
    outputs_base = root / args.outputs_dir
    output_path = pathlib.Path(args.output) if args.output else repo_root / "public" / "inspection_extractions.json"

    by_redizo = {}
    success = 0
    errors = 0
    missing = 0

    for report in reports:
        # Try each model in priority order
        found = False
        for model_id in model_ids:
            json_path = outputs_base / model_id / f"{report['report_id']}.json"
            if not json_path.exists():
                continue
            data = json.loads(json_path.read_text(encoding="utf-8"))
            parsed = data.get("parsed_output")
            if parsed is None or data.get("parse_error") is not None:
                continue
            # Success - use this model's result
            redizo = report["redizo"]
            if redizo not in by_redizo:
                by_redizo[redizo] = []
            by_redizo[redizo].append({
                "report_id": report["report_id"],
                "inspection_from": report["inspection_from"],
                "inspection_to": report["inspection_to"],
                "run_finished_utc": data.get("run_finished_utc"),
                "model_id": model_id,
                "parsed_output": parsed,
            })
            success += 1
            found = True
            break
        if not found:
            # Check if any model had the file at all
            any_file = any(
                (outputs_base / m / f"{report['report_id']}.json").exists()
                for m in model_ids
            )
            if any_file:
                errors += 1
            else:
                missing += 1

    # Sort inspections within each school by date (newest first)
    for redizo in by_redizo:
        by_redizo[redizo].sort(key=lambda x: x["inspection_from"], reverse=True)

    result = {
        "_meta": {
            "model_ids": model_ids,
            "generated_utc": datetime.now(timezone.utc).isoformat(),
            "reports_success": success,
            "reports_error": errors,
            "reports_missing": missing,
            "schools_count": len(by_redizo),
        },
        "schools": by_redizo,
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(result, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    size_kb = output_path.stat().st_size / 1024
    print(f"Export: {output_path}")
    print(f"Velikost: {size_kb:.0f} KB")
    print(f"Škol: {len(by_redizo)} | Zpráv ok: {success} | Chyby: {errors} | Chybí: {missing}")


if __name__ == "__main__":
    main()
