#!/usr/bin/env python3
"""Srovnávací malý vzorek DeepSeek Flash nad stejným zadáním jako Haiku.

Použití: python3 scripts/dipsy-kriteria-deepseek-vzorek.py --limit 5
Vyžaduje OPENROUTER_API_KEY v prostředí nebo v .env.local. Výstupy jsou pouze
pracovní návrhy v gitignorovaném data/dipsy-kriteria-2026/llm-pilot/.
"""

import argparse
import hashlib
import importlib.util
import json
import os
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("kriteria_haiku", Path(__file__).with_name("dipsy-kriteria-llm-vzorek.py"))
pilot = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pilot)

MODEL = "deepseek/deepseek-v4.1-flash"
VERSION = 3
MAX_ITEMS = 5
MAX_TOTAL_USD = 0.05
OUTPUT = pilot.OUTPUT / "deepseek"


def api_key():
    if os.getenv("OPENROUTER_API_KEY"):
        return os.environ["OPENROUTER_API_KEY"]
    path = ROOT / ".env.local"
    if path.exists():
        for line in path.read_text(encoding="utf-8").splitlines():
            if line.startswith("OPENROUTER_API_KEY="):
                return line.split("=", 1)[1].strip().strip("\"'")
    raise SystemExit("Chybí OPENROUTER_API_KEY.")


def strict_schema(value):
    if isinstance(value, dict):
        result = {key: strict_schema(item) for key, item in value.items()}
        if result.get("type") == "object":
            result["additionalProperties"] = False
        return result
    if isinstance(value, list):
        return [strict_schema(item) for item in value]
    return value


def run_one(source_id, offer, row, key):
    prompt = pilot.prompt_for(offer, row)
    if len(prompt.encode("utf-8")) > 50_000:
        raise RuntimeError("Příloha je pro tento cenově omezený vzorek příliš dlouhá.")
    body = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": "Jsi extraktor českých kritérií přijetí. Nepoužívej nástroje."},
            {"role": "user", "content": prompt},
        ],
        "response_format": {"type": "json_schema", "json_schema": {
            "name": "kriteria_prijeti", "strict": True, "schema": strict_schema(pilot.SCHEMA),
        }},
        "provider": {"only": ["DeepInfra"], "allow_fallbacks": False, "require_parameters": True},
        "reasoning": {"effort": "none"},
        "max_tokens": 10000,
        "temperature": 0,
        "stream": False,
    }
    request = urllib.request.Request(
        "https://openrouter.ai/api/v1/chat/completions",
        data=json.dumps(body, ensure_ascii=False).encode("utf-8"),
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(request, timeout=180) as response:
            answer = json.load(response)
    except urllib.error.HTTPError as error:
        raise RuntimeError(f"OpenRouter HTTP {error.code}: {error.read(1000).decode('utf-8', 'replace')}") from error
    choice = answer["choices"][0]
    content = choice["message"]["content"]
    if choice.get("finish_reason") != "stop" or not content:
        raise RuntimeError(f"Neúplná odpověď: {choice.get('finish_reason')}")
    draft = json.loads(content)
    if set(draft) != set(pilot.SCHEMA["required"]):
        raise RuntimeError("Odpověď nemá požadovaná pole.")
    usage = answer.get("usage") or {}
    record = {
        "source_id": source_id, "sha256": row["sha256"], "file_id": row["file_id"],
        "rok": 2026, "kolo": 1, "metoda_textu": row["stav"],
        "model": answer.get("model", MODEL), "verze_zadani": pilot.PROMPT_VERSION,
        "verze_behu": VERSION, "prompt_sha256": hashlib.sha256(prompt.encode()).hexdigest(),
        "zpracovano_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "provider": "DeepInfra přes OpenRouter", "spotreba": usage,
        "cena_usd": usage.get("cost"), "navrh": draft,
    }
    OUTPUT.mkdir(parents=True, exist_ok=True)
    (OUTPUT / f"{source_id}-v{VERSION}.json").write_text(
        json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    with (OUTPUT / "vysledky.jsonl").open("a", encoding="utf-8") as stream:
        stream.write(json.dumps(record, ensure_ascii=False) + "\n")
    return record


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--limit", type=int, default=5)
    parser.add_argument("--source-id", action="append")
    args = parser.parse_args()
    if not 1 <= args.limit <= MAX_ITEMS:
        parser.error("--limit musí být 1 až 5")
    ids = args.source_id or [row["source_id"] for row in json.loads(
        pilot.REFERENCE.read_text(encoding="utf-8"))["zaznamy"]][:args.limit]
    if len(ids) > MAX_ITEMS or len(set(ids)) != len(ids):
        parser.error("Vyberte nejvýše pět různých ID.")
    offers = {row["source_id"]: row for row in json.loads(
        pilot.CATALOG.read_text(encoding="utf-8"))["data"]}
    manifest = pilot.latest_manifest()
    spent = 0.0
    key = api_key()
    for index, source_id in enumerate(ids, 1):
        if source_id not in offers or source_id not in manifest:
            parser.error(f"Neznámá nabídka: {source_id}")
        row = manifest[source_id]
        if row["stav"] not in ("text", "ocr_text"):
            parser.error(f"Není čitelný text: {source_id}")
        saved = OUTPUT / f"{source_id}-v{VERSION}.json"
        digest = hashlib.sha256(pilot.prompt_for(offers[source_id], row).encode()).hexdigest()
        if saved.exists():
            record = json.loads(saved.read_text(encoding="utf-8"))
            if record["sha256"] != row["sha256"] or record["prompt_sha256"] != digest:
                raise SystemExit(f"Podklad nebo zadání se změnilo: {source_id}")
        else:
            if spent + 0.01 > MAX_TOTAL_USD + 1e-9:
                raise SystemExit("Dosažen limit ceny vzorku.")
            record = run_one(source_id, offers[source_id], row, key)
            spent += float(record.get("cena_usd") or 0)
        print(f"{index}/{len(ids)} {source_id} {record['navrh']['rezim']} "
              f"${record.get('cena_usd')}", flush=True)
    print(f"Nově vykázaná cena: ${spent:.4f}", flush=True)


if __name__ == "__main__":
    main()
