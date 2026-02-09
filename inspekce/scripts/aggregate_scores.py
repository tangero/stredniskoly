#!/usr/bin/env python3
import argparse
import csv
import json
import pathlib
import re
from datetime import datetime, timezone
from statistics import mean


JARGON_WORDS = {
    "implementace",
    "synergie",
    "intervence",
    "optimalizace",
    "evaluace",
    "edukační",
    "pedagogický",
    "vzdělávací",
    "kompetence",
    "systémově"
}


def load_reports(manifest_path: pathlib.Path):
    with manifest_path.open("r", encoding="utf-8") as handle:
        return json.load(handle)["reports"]


def load_models(models_path: pathlib.Path):
    with models_path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def split_sentences(text: str):
    chunks = re.split(r"[.!?]+", text)
    return [sentence.strip() for sentence in chunks if sentence.strip()]


def tokenize_words(text: str):
    return re.findall(r"[A-Za-zÁ-ž0-9]+", text.lower())


def readability_heuristics(text: str):
    words = tokenize_words(text)
    sentences = split_sentences(text)
    if not words or not sentences:
        return {
            "avg_sentence_words": 0.0,
            "avg_word_length": 0.0,
            "long_sentence_ratio": 0.0,
            "jargon_ratio": 0.0,
            "heuristic_clarity_1_5": 1.0
        }
    sentence_lengths = [len(tokenize_words(sentence)) for sentence in sentences]
    avg_sentence_words = mean(sentence_lengths)
    avg_word_length = mean([len(word) for word in words])
    long_sentence_ratio = sum(1 for item in sentence_lengths if item > 24) / len(sentence_lengths)
    jargon_count = sum(1 for word in words if word in JARGON_WORDS)
    jargon_ratio = jargon_count / len(words)

    score = 5.0
    if avg_sentence_words > 22:
        score -= 1
    if avg_sentence_words > 28:
        score -= 1
    if avg_word_length > 6.2:
        score -= 1
    if long_sentence_ratio > 0.35:
        score -= 1
    if jargon_ratio > 0.03:
        score -= 1
    if score < 1:
        score = 1.0

    return {
        "avg_sentence_words": round(avg_sentence_words, 3),
        "avg_word_length": round(avg_word_length, 3),
        "long_sentence_ratio": round(long_sentence_ratio, 3),
        "jargon_ratio": round(jargon_ratio, 3),
        "heuristic_clarity_1_5": round(score, 3)
    }


def get_path(root: pathlib.Path, base: str, *parts: str):
    return root / base / pathlib.Path(*parts)


def maybe_number(value):
    if isinstance(value, (int, float)):
        return float(value)
    return None


def average(values):
    filtered = [value for value in values if value is not None]
    if not filtered:
        return None
    return round(mean(filtered), 4)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", default="config/pilot_10_reports.json")
    parser.add_argument("--models", default="config/models.json")
    parser.add_argument("--outputs-dir", default="data/outputs")
    parser.add_argument("--judge-dir", default="data/judge")
    parser.add_argument("--judge-model-id", default="")
    args = parser.parse_args()

    root = pathlib.Path(__file__).resolve().parents[1]
    reports = load_reports(root / args.manifest)
    model_cfg = load_models(root / args.models)
    judge_model_id = args.judge_model_id.strip() or model_cfg.get("judge_model_id")
    candidate_model_ids = [model["id"] for model in model_cfg["models"] if model["id"] != judge_model_id]

    rows = []
    for model_id in candidate_model_ids:
        for report in reports:
            extraction_path = get_path(root, args.outputs_dir, model_id, f"{report['report_id']}.json")
            if not extraction_path.exists():
                continue
            extraction_payload = json.loads(extraction_path.read_text(encoding="utf-8"))
            parsed_output = extraction_payload.get("parsed_output")
            parse_error = extraction_payload.get("parse_error")
            valid_json = parsed_output is not None and parse_error is None
            summary_text = ""
            if valid_json:
                summary_text = (
                    parsed_output.get("for_parents", {})
                    .get("plain_czech_summary", "")
                    .strip()
                )
            heuristic = readability_heuristics(summary_text)

            judge_path = get_path(
                root,
                args.judge_dir,
                judge_model_id,
                model_id,
                f"{report['report_id']}.json"
            )
            judge_payload = None
            judge_output = None
            if judge_path.exists():
                judge_payload = json.loads(judge_path.read_text(encoding="utf-8"))
                if judge_payload.get("parse_error") is None:
                    judge_output = judge_payload.get("judge_output")

            faithfulness = maybe_number((judge_output or {}).get("faithfulness_score_1_5"))
            completeness = maybe_number((judge_output or {}).get("completeness_score_1_5"))
            parent_usefulness = maybe_number((judge_output or {}).get("parent_usefulness_score_1_5"))
            judge_czech_clarity = maybe_number((judge_output or {}).get("czech_clarity_score_1_5"))
            unsupported_claims = maybe_number((judge_output or {}).get("unsupported_claims_count"))
            if unsupported_claims is None:
                unsupported_claims = 0.0

            blended_czech = None
            overall_score = None
            if judge_czech_clarity is not None:
                blended_czech = round(0.7 * judge_czech_clarity + 0.3 * heuristic["heuristic_clarity_1_5"], 4)
            if all(score is not None for score in [faithfulness, completeness, parent_usefulness, blended_czech]):
                penalty = min(1.0, unsupported_claims * 0.2)
                overall_score = round(
                    0.35 * faithfulness
                    + 0.25 * completeness
                    + 0.20 * parent_usefulness
                    + 0.20 * blended_czech
                    - penalty,
                    4
                )

            rows.append(
                {
                    "model_id": model_id,
                    "report_id": report["report_id"],
                    "valid_json": int(valid_json),
                    "faithfulness_score_1_5": faithfulness,
                    "completeness_score_1_5": completeness,
                    "parent_usefulness_score_1_5": parent_usefulness,
                    "judge_czech_clarity_score_1_5": judge_czech_clarity,
                    "heuristic_czech_clarity_score_1_5": heuristic["heuristic_clarity_1_5"],
                    "blended_czech_clarity_score_1_5": blended_czech,
                    "unsupported_claims_count": unsupported_claims,
                    "overall_score": overall_score,
                    "avg_sentence_words": heuristic["avg_sentence_words"],
                    "avg_word_length": heuristic["avg_word_length"],
                    "long_sentence_ratio": heuristic["long_sentence_ratio"],
                    "jargon_ratio": heuristic["jargon_ratio"]
                }
            )

    judge_root = root / args.judge_dir
    judge_root.mkdir(parents=True, exist_ok=True)
    rows_csv = judge_root / "scoreboard_rows.csv"
    with rows_csv.open("w", encoding="utf-8", newline="") as handle:
        if rows:
            writer = csv.DictWriter(handle, fieldnames=list(rows[0].keys()))
            writer.writeheader()
            writer.writerows(rows)

    by_model = {}
    for row in rows:
        by_model.setdefault(row["model_id"], []).append(row)

    summary = []
    for model_id, model_rows in by_model.items():
        summary.append(
            {
                "model_id": model_id,
                "reports_count": len(model_rows),
                "valid_json_rate": round(mean([item["valid_json"] for item in model_rows]), 4),
                "avg_faithfulness": average([item["faithfulness_score_1_5"] for item in model_rows]),
                "avg_completeness": average([item["completeness_score_1_5"] for item in model_rows]),
                "avg_parent_usefulness": average([item["parent_usefulness_score_1_5"] for item in model_rows]),
                "avg_judge_czech_clarity": average([item["judge_czech_clarity_score_1_5"] for item in model_rows]),
                "avg_heuristic_czech_clarity": average([item["heuristic_czech_clarity_score_1_5"] for item in model_rows]),
                "avg_blended_czech_clarity": average([item["blended_czech_clarity_score_1_5"] for item in model_rows]),
                "avg_unsupported_claims": average([item["unsupported_claims_count"] for item in model_rows]),
                "avg_overall_score": average([item["overall_score"] for item in model_rows])
            }
        )

    summary.sort(key=lambda item: (item["avg_overall_score"] is not None, item["avg_overall_score"]), reverse=True)
    summary_path = judge_root / "scoreboard_summary.json"
    summary_path.write_text(
        json.dumps(
            {
                "judge_model_id": judge_model_id,
                "generated_utc": datetime.now(timezone.utc).isoformat(),
                "models": summary
            },
            ensure_ascii=False,
            indent=2
        ),
        encoding="utf-8"
    )

    print(f"Rows: {rows_csv}")
    print(f"Summary: {summary_path}")


if __name__ == "__main__":
    main()
