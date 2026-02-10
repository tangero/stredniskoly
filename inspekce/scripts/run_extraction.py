#!/usr/bin/env python3
import argparse
import json
import pathlib
import sys
import time
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone

from llm_client import call_model, extract_json_object, load_models_config


def load_reports(manifest_path: pathlib.Path):
    with manifest_path.open("r", encoding="utf-8") as handle:
        return json.load(handle)["reports"]


def read_text(path: pathlib.Path) -> str:
    return path.read_text(encoding="utf-8", errors="ignore")


def build_user_prompt(report: dict, source_text: str) -> str:
    schema_hint = {
        "report_id": report["report_id"],
        "school_profile": {
            "school_type": "string",
            "inspection_period": "string",
            "school_change_summary": "string"
        },
        "for_parents": {
            "strengths": [{"tag": "string", "detail": "string", "evidence": "string"}],
            "risks": [{"tag": "string", "detail": "string", "evidence": "string"}],
            "questions_for_open_day": ["string"],
            "who_school_fits": ["string"],
            "who_should_be_cautious": ["string"],
            "plain_czech_summary": "string"
        },
        "hard_facts": {
            "maturita": {"trend": "string", "key_numbers": ["string"], "evidence": "string"},
            "absence": {"trend": "string", "key_numbers": ["string"], "evidence": "string"},
            "support_services": ["string"],
            "safety_climate": ["string"],
            "partnerships_practice": ["string"]
        },
        "model_self_check": {
            "czech_clarity_score_1_5": "integer 1-5",
            "czech_clarity_reason": "string",
            "uncertainty_notes": ["string"]
        }
    }
    return (
        "Metadata zprávy:\n"
        f"- report_id: {report['report_id']}\n"
        f"- redizo: {report['redizo']}\n"
        f"- typ: {report['school_type']}\n"
        f"- škola: {report['school_name']}\n"
        f"- město: {report['city']}\n"
        f"- období inspekce: {report['inspection_from']} až {report['inspection_to']}\n\n"
        "Vrať JSON přesně v tomto tvaru:\n"
        f"{json.dumps(schema_hint, ensure_ascii=False, indent=2)}\n\n"
        "DŮLEŽITÉ LIMITY PRO STRUČNOST (dodrž přesně):\n"
        "- strengths: max 3 položky\n"
        "- risks: max 3 položky\n"
        "- questions_for_open_day: max 3 položky\n"
        "- who_school_fits: max 3 položky\n"
        "- who_should_be_cautious: max 3 položky\n"
        "- key_numbers: max 3 položky\n"
        "- detail: max 1 věta\n"
        "- evidence: max 25 slov\n"
        "- plain_czech_summary: max 110 slov\n"
        "- uncertainty_notes: max 3 položky\n"
        "- Nepřidávej žádné další klíče mimo schéma.\n\n"
        "Zdrojový text zprávy:\n"
        f"{source_text}\n"
    )


def process_report(report, model_cfg, model_id, system_prompt, texts_dir, model_out_dir, force):
    json_path = model_out_dir / f"{report['report_id']}.json"
    if json_path.exists() and not force:
        try:
            existing = json.loads(json_path.read_text(encoding="utf-8"))
        except Exception:
            existing = None
        if existing and existing.get("parse_error") is None and existing.get("parsed_output") is not None:
            return report["report_id"], "skip", 0.0

    text_path = texts_dir / report["text_file"]
    if not text_path.exists():
        return report["report_id"], "missing_text", 0.0

    source_text = read_text(text_path)
    user_prompt = build_user_prompt(report, source_text)
    t0 = time.monotonic()
    run_started = datetime.now(timezone.utc).isoformat()
    call_error = None
    raw_response = ""
    try:
        raw_response = call_model(model_cfg, system_prompt, user_prompt)
    except Exception as error:
        call_error = str(error)
    run_finished = datetime.now(timezone.utc).isoformat()
    elapsed = time.monotonic() - t0

    raw_path = model_out_dir / f"{report['report_id']}.raw.txt"
    try:
        raw_path.write_text(raw_response, encoding="utf-8")
    except OSError:
        pass

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
        "model_id": model_id,
        "run_started_utc": run_started,
        "run_finished_utc": run_finished,
        "raw_file": raw_path.name,
        "call_error": call_error,
        "parse_error": parse_error,
        "parsed_output": parsed
    }
    try:
        json_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    except OSError as error:
        return report["report_id"], "error", elapsed

    status = "error" if (call_error or parse_error) else "ok"
    return report["report_id"], status, elapsed


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", default="config/pilot_10_reports.json")
    parser.add_argument("--models", default="config/models.json")
    parser.add_argument("--prompt", default="prompts/extraction_system.txt")
    parser.add_argument("--texts-dir", default="data/texts")
    parser.add_argument("--outputs-dir", default="data/outputs")
    parser.add_argument("--model-ids", default="")
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--workers", type=int, default=1)
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()

    root = pathlib.Path(__file__).resolve().parents[1]
    reports = load_reports(root / args.manifest)
    models_config = load_models_config(str(root / args.models))
    model_index = models_config["model_index"]
    system_prompt = (root / args.prompt).read_text(encoding="utf-8")
    texts_dir = root / args.texts_dir
    outputs_dir = root / args.outputs_dir
    outputs_dir.mkdir(parents=True, exist_ok=True)

    if args.model_ids.strip():
        selected_ids = [item.strip() for item in args.model_ids.split(",") if item.strip()]
    else:
        selected_ids = [model["id"] for model in models_config["models"]]

    if args.limit > 0:
        reports = reports[:args.limit]

    workers = max(1, args.workers)

    for model_id in selected_ids:
        model_cfg = model_index[model_id]
        model_out_dir = outputs_dir / model_id
        model_out_dir.mkdir(parents=True, exist_ok=True)

        total = len(reports)
        print(f"Model: {model_id} | Zpráv: {total} | Workers: {workers}")

        if workers == 1:
            done = 0
            ok_count = 0
            err_count = 0
            skip_count = 0
            for report in reports:
                rid, status, elapsed = process_report(
                    report, model_cfg, model_id, system_prompt, texts_dir, model_out_dir, args.force
                )
                done += 1
                if status == "skip":
                    skip_count += 1
                elif status == "ok":
                    ok_count += 1
                    print(f"  [{done}/{total}] {rid} OK ({elapsed:.1f}s)")
                elif status == "missing_text":
                    err_count += 1
                    print(f"  [{done}/{total}] {rid} MISSING TEXT")
                else:
                    err_count += 1
                    print(f"  [{done}/{total}] {rid} ERROR ({elapsed:.1f}s)")
            if skip_count:
                print(f"  Přeskočeno (hotové): {skip_count}")
            print(f"  Hotovo: ok={ok_count} err={err_count} skip={skip_count}")
        else:
            counter = {"done": 0, "ok": 0, "err": 0, "skip": 0}
            lock = threading.Lock()

            def on_done(future):
                rid, status, elapsed = future.result()
                with lock:
                    counter["done"] += 1
                    n = counter["done"]
                    if status == "skip":
                        counter["skip"] += 1
                    elif status == "ok":
                        counter["ok"] += 1
                        print(f"  [{n}/{total}] {rid} OK ({elapsed:.1f}s)")
                    elif status == "missing_text":
                        counter["err"] += 1
                        print(f"  [{n}/{total}] {rid} MISSING TEXT")
                    else:
                        counter["err"] += 1
                        print(f"  [{n}/{total}] {rid} ERROR ({elapsed:.1f}s)")
                    sys.stdout.flush()

            with ThreadPoolExecutor(max_workers=workers) as pool:
                futures = []
                for report in reports:
                    f = pool.submit(
                        process_report,
                        report, model_cfg, model_id, system_prompt, texts_dir, model_out_dir, args.force
                    )
                    f.add_done_callback(on_done)
                    futures.append(f)
                for f in futures:
                    f.result()

            if counter["skip"]:
                print(f"  Přeskočeno (hotové): {counter['skip']}")
            print(f"  Hotovo: ok={counter['ok']} err={counter['err']} skip={counter['skip']}")


if __name__ == "__main__":
    main()
