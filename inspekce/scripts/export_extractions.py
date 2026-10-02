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
    parser.add_argument("--pro-web", action="store_true",
                        help="tvar data/inspection_extractions.json: bez model_self_check, run_finished_utc, "
                             "report_id v parsed_output, záznamů bez shrnutí a _meta, kompaktní JSON")
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
            if args.pro_web and not (parsed.get("for_parents") or {}).get("plain_czech_summary"):
                # Web shrnutí bez textu nezobrazí; zkusit výstup dalšího modelu, místo aby zpráva vypadla.
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

    if args.pro_web:
        # Stejný ořez jako commit 7091a5c (web čte data/inspection_extractions.json, limit velikosti nasazení).
        for redizo in list(by_redizo):
            zaznamy = []
            for z in by_redizo[redizo]:
                z.pop("run_finished_utc", None)
                po = {k: v for k, v in z["parsed_output"].items() if k not in ("model_self_check", "report_id")}
                if not (po.get("for_parents") or {}).get("plain_czech_summary"):
                    continue
                z["parsed_output"] = po
                zaznamy.append(z)
            if zaznamy:
                by_redizo[redizo] = zaznamy
            else:
                del by_redizo[redizo]
        output_path.write_text(json.dumps({"schools": by_redizo}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        print(f"Export pro web: {output_path} ({output_path.stat().st_size / 1024:.0f} KB), škol {len(by_redizo)}")
        return

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
