#!/usr/bin/env python3
import argparse
import json
import pathlib
from datetime import datetime, timezone

from llm_client import call_model, extract_json_object, load_models_config


def load_reports(manifest_path: pathlib.Path):
    with manifest_path.open("r", encoding="utf-8") as handle:
        return json.load(handle)["reports"]


def build_user_prompt(report: dict, source_text: str, candidate_output: dict) -> str:
    judge_schema = {
        "report_id": report["report_id"],
        "faithfulness_score_1_5": "integer 1-5",
        "completeness_score_1_5": "integer 1-5",
        "parent_usefulness_score_1_5": "integer 1-5",
        "czech_clarity_score_1_5": "integer 1-5",
        "unsupported_claims_count": "integer >= 0",
        "critical_issues": ["string"],
        "best_points": ["string"],
        "one_line_verdict": "string"
    }
    return (
        "Posuď kandidátní výstup proti zdrojové inspekční zprávě.\n"
        "Vracej jen JSON dle níže uvedeného schématu.\n"
        "Skóre 1 znamená velmi špatné, 5 znamená výborné.\n\n"
        f"Schéma:\n{json.dumps(judge_schema, ensure_ascii=False, indent=2)}\n\n"
        f"Metadata: report_id={report['report_id']}, škola={report['school_name']}\n\n"
        "Kandidátní výstup:\n"
        f"{json.dumps(candidate_output, ensure_ascii=False, indent=2)}\n\n"
        "Zdrojový text:\n"
        f"{source_text}\n"
    )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", default="config/pilot_10_reports.json")
    parser.add_argument("--models", default="config/models.json")
    parser.add_argument("--judge-model-id", default="")
    parser.add_argument("--judge-prompt", default="prompts/judge_system.txt")
    parser.add_argument("--texts-dir", default="data/texts")
    parser.add_argument("--outputs-dir", default="data/outputs")
    parser.add_argument("--judge-dir", default="data/judge")
    parser.add_argument("--candidate-model-ids", default="")
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()

    root = pathlib.Path(__file__).resolve().parents[1]
    reports = load_reports(root / args.manifest)
    model_cfg = load_models_config(str(root / args.models))
    model_index = model_cfg["model_index"]
    judge_model_id = args.judge_model_id.strip() or model_cfg.get("judge_model_id")
    if not judge_model_id:
        raise RuntimeError("Není nastavený judge model id.")
    judge_model = model_index[judge_model_id]
    judge_system_prompt = (root / args.judge_prompt).read_text(encoding="utf-8")
    texts_dir = root / args.texts_dir
    outputs_dir = root / args.outputs_dir
    judge_dir = root / args.judge_dir / judge_model_id
    judge_dir.mkdir(parents=True, exist_ok=True)

    if args.candidate_model_ids.strip():
        candidate_model_ids = [item.strip() for item in args.candidate_model_ids.split(",") if item.strip()]
    else:
        candidate_model_ids = [model["id"] for model in model_cfg["models"] if model["id"] != judge_model_id]

    if args.limit > 0:
        reports = reports[:args.limit]

    for candidate_id in candidate_model_ids:
        candidate_dir = outputs_dir / candidate_id
        candidate_judge_dir = judge_dir / candidate_id
        candidate_judge_dir.mkdir(parents=True, exist_ok=True)
        print(f"Judge {judge_model_id} vs {candidate_id}")

        for report in reports:
            output_file = candidate_judge_dir / f"{report['report_id']}.json"
            if output_file.exists() and not args.force:
                try:
                    existing = json.loads(output_file.read_text(encoding="utf-8"))
                except Exception:
                    existing = None
                if existing and existing.get("parse_error") is None and existing.get("judge_output") is not None:
                    print(f"  -> {report['report_id']} skip(existing_success)")
                    continue

            candidate_file = candidate_dir / f"{report['report_id']}.json"
            if not candidate_file.exists():
                print(f"  -> skip {report['report_id']} (missing candidate output)")
                continue

            candidate_payload = json.loads(candidate_file.read_text(encoding="utf-8"))
            parsed_output = candidate_payload.get("parsed_output")
            if parsed_output is None:
                print(f"  -> skip {report['report_id']} (candidate parse error)")
                continue

            source_text = (texts_dir / report["text_file"]).read_text(encoding="utf-8", errors="ignore")
            user_prompt = build_user_prompt(report, source_text, parsed_output)
            run_started = datetime.now(timezone.utc).isoformat()
            call_error = None
            raw_response = ""
            try:
                raw_response = call_model(judge_model, judge_system_prompt, user_prompt)
            except Exception as error:
                call_error = str(error)
            run_finished = datetime.now(timezone.utc).isoformat()

            parsed = None
            parse_error = None
            if call_error is None:
                try:
                    parsed = extract_json_object(raw_response)
                except Exception as error:
                    parse_error = str(error)
            else:
                parse_error = call_error

            payload = {
                "report_id": report["report_id"],
                "judge_model_id": judge_model_id,
                "candidate_model_id": candidate_id,
                "run_started_utc": run_started,
                "run_finished_utc": run_finished,
                "call_error": call_error,
                "parse_error": parse_error,
                "raw_response": raw_response,
                "judge_output": parsed
            }
            output_file.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
            print(f"  -> {report['report_id']} call_error={bool(call_error)} parse_error={bool(parse_error)}")


if __name__ == "__main__":
    main()
