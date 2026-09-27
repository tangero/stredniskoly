#!/usr/bin/env python3
"""Nezávislý přepis pěti PDF modelem Opus 5.5 nebo GPT-6 Luna.

Výstupy jsou gitignorované pracovní návrhy; skript nemění veřejná data.
"""

import argparse
import hashlib
import importlib.util
import json
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("kriteria_prompt", ROOT / "scripts/dipsy-kriteria-llm-vzorek.py")
pilot = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pilot)
deepseek_spec = importlib.util.spec_from_file_location("kriteria_deepseek", ROOT / "scripts/dipsy-kriteria-deepseek-vzorek.py")
deepseek = importlib.util.module_from_spec(deepseek_spec)
deepseek_spec.loader.exec_module(deepseek)

MODELS = {"opus": "anthropic/claude-opus-5.5", "luna": "openai/gpt-6-luna"}
CAP_ITEM_USD = {"opus": 0.15, "luna": 0.02}
CAP_TOTAL_USD = {"opus": 0.65, "luna": 0.08}
OUTPUT = pilot.OUTPUT / "nezavisly-vzorek"
VERSION = 1


def run_one(kind, source_id, offer, row, key):
    prompt = pilot.prompt_for(offer, row)
    if len(prompt.encode("utf-8")) > 50_000:
        raise RuntimeError("PDF je pro tento pilot příliš dlouhé.")
    body = {
        "model": MODELS[kind],
        "messages": [
            {"role": "system", "content": "Jsi nezávislý extraktor kritérií přijetí. Pracuj jen s dodaným textem PDF a nepoužívej nástroje."},
            {"role": "user", "content": prompt},
        ],
        "response_format": {"type": "json_schema", "json_schema": {
            "name": "nezavisly_prepis_kriterii", "strict": True,
            "schema": deepseek.strict_schema(pilot.SCHEMA),
        }},
        "provider": {"require_parameters": True},
        "max_tokens": 16000,
        "stream": False,
    }
    if kind == "luna":
        body["reasoning"] = {"effort": "medium"}
    request = urllib.request.Request(
        "https://openrouter.ai/api/v1/chat/completions",
        data=json.dumps(body, ensure_ascii=False).encode("utf-8"),
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(request, timeout=240) as response:
            answer = json.load(response)
    except urllib.error.HTTPError as error:
        raise RuntimeError(f"OpenRouter HTTP {error.code}: {error.read(800).decode('utf-8', 'replace')}") from error
    choice = answer["choices"][0]
    if choice.get("finish_reason") != "stop" or not choice["message"].get("content"):
        raise RuntimeError(f"Neúplná odpověď modelu: {choice.get('finish_reason')}")
    draft = json.loads(choice["message"]["content"])
    if set(draft) != set(pilot.SCHEMA["required"]):
        raise RuntimeError("Model nevrátil požadovaná pole.")
    usage = answer.get("usage") or {}
    record = {
        "source_id": source_id, "sha256": row["sha256"], "file_id": row["file_id"],
        "rok": 2026, "kolo": 1, "metoda_textu": row["stav"],
        "model": answer.get("model", MODELS[kind]), "verze_zadani": pilot.PROMPT_VERSION,
        "verze_behu": VERSION, "prompt_sha256": hashlib.sha256(prompt.encode()).hexdigest(),
        "zpracovano_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "spotreba": usage, "cena_usd": usage.get("cost"), "navrh": draft,
    }
    target = OUTPUT / kind
    target.mkdir(parents=True, exist_ok=True)
    (target / f"{source_id}-v{VERSION}.json").write_text(
        json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return record


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--model", choices=MODELS, required=True)
    parser.add_argument("--limit", type=int, default=5)
    parser.add_argument("--source-id", action="append")
    args = parser.parse_args()
    if not 1 <= args.limit <= 5:
        parser.error("--limit musí být 1 až 5")
    ids = args.source_id or [row["source_id"] for row in json.loads(
        pilot.REFERENCE.read_text(encoding="utf-8"))["zaznamy"]][:args.limit]
    if len(ids) > 5 or len(set(ids)) != len(ids):
        parser.error("Vyberte nejvýše pět různých ID.")
    offers = {item["source_id"]: item for item in json.loads(pilot.CATALOG.read_text(encoding="utf-8"))["data"]}
    manifest = pilot.latest_manifest()
    spent = 0.0
    key = deepseek.api_key()
    for index, source_id in enumerate(ids, 1):
        if source_id not in offers or source_id not in manifest:
            parser.error(f"Neznámá nabídka: {source_id}")
        row = manifest[source_id]
        if row["stav"] not in ("text", "ocr_text"):
            parser.error(f"Není čitelný text: {source_id}")
        path = OUTPUT / args.model / f"{source_id}-v{VERSION}.json"
        digest = hashlib.sha256(pilot.prompt_for(offers[source_id], row).encode()).hexdigest()
        if path.exists():
            record = json.loads(path.read_text(encoding="utf-8"))
            if record["sha256"] != row["sha256"] or record["prompt_sha256"] != digest:
                raise SystemExit(f"Změněný podklad nebo zadání: {source_id}")
        else:
            if spent + CAP_ITEM_USD[args.model] > CAP_TOTAL_USD[args.model]:
                raise SystemExit("Dosažen limit pilotu.")
            record = run_one(args.model, source_id, offers[source_id], row, key)
            spent += float(record.get("cena_usd") or 0)
            if record.get("cena_usd") is not None and record["cena_usd"] > CAP_ITEM_USD[args.model]:
                raise SystemExit("Jedno volání překročilo očekávanou cenu; další zastavená.")
        print(f"{index}/{len(ids)} {source_id} {record['navrh']['rezim']} ${record.get('cena_usd')}", flush=True)
    print(f"Nově vykázaná cena ${spent:.6f}", flush=True)


if __name__ == "__main__":
    main()
