#!/usr/bin/env python3
"""Obnovitelný modelový běh nad zmrazeným vzorkem 100 nabídek 2026.

Spouští pouze místní pracovní extrakci. Nezapisuje do veřejných dat ani databáze.
"""

import argparse
import hashlib
import importlib.util
import json
import os
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "data/dipsy-kriteria-2026"
SAMPLE = BASE / "vzorek-100.json"
SAMPLE_SHA256 = "df53e401bba3eab6bfb23dbbaffa3508580e58b6138c66f62c89856877db0b7f"
OUTPUT = BASE / "llm-pilot/vzorek-100"
spec = importlib.util.spec_from_file_location("kriteria_prompt", ROOT / "scripts/dipsy-kriteria-llm-vzorek.py")
pilot = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pilot)
deepseek_spec = importlib.util.spec_from_file_location("kriteria_deepseek", ROOT / "scripts/dipsy-kriteria-deepseek-vzorek.py")
deepseek = importlib.util.module_from_spec(deepseek_spec)
deepseek_spec.loader.exec_module(deepseek)

MODELS = {
    "deepseek": "deepseek/deepseek-v4.1-flash",
    "luna": "openai/gpt-6-luna",
    "opus": "anthropic/claude-opus-5.5",
}
MAX_COST_USD = {"deepseek": 4.0, "luna": 4.0, "opus": 10.0}
VERSION = 1


def load_sample():
    raw = SAMPLE.read_bytes()
    if hashlib.sha256(raw).hexdigest() != SAMPLE_SHA256:
        raise RuntimeError("Zmrazený výběr 100 nabídek se změnil.")
    data = json.loads(raw)
    if data.get("pocet_nabidek") != 100 or len(data.get("nabidky", [])) != 100:
        raise RuntimeError("Výběr nemá 100 nabídek.")
    return data["nabidky"]


def openrouter_call(kind, prompt, key):
    body = {
        "model": MODELS[kind],
        "messages": [
            {"role": "system", "content": "Jsi nezávislý extraktor kritérií přijetí. Pracuj jen s dodaným textem PDF a nepoužívej nástroje."},
            {"role": "user", "content": prompt},
        ],
        "response_format": {"type": "json_schema", "json_schema": {
            "name": "kriteria_prijeti_2026", "strict": True,
            "schema": deepseek.strict_schema(pilot.SCHEMA),
        }},
        "provider": {"require_parameters": True},
        "max_tokens": 16000,
        "stream": False,
    }
    if kind == "deepseek":
        body["provider"].update({"only": ["DeepInfra"], "allow_fallbacks": False})
        body["reasoning"] = {"effort": "none"}
        body["temperature"] = 0
    elif kind == "luna":
        body["reasoning"] = {"effort": "medium"}
    request = urllib.request.Request(
        "https://openrouter.ai/api/v1/chat/completions",
        data=json.dumps(body, ensure_ascii=False).encode("utf-8"),
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=300) as response:
        answer = json.load(response)
    if answer.get("error"):
        raise RuntimeError(f"Odpověď služby obsahuje chybu: {str(answer['error'])[:400]}")
    choice = answer["choices"][0]
    usage = answer.get("usage") or {}
    if choice.get("finish_reason") != "stop" or not choice["message"].get("content"):
        raise RuntimeError(f"Neúplná odpověď: {choice.get('finish_reason')}; vykázaná cena {usage.get('cost')}")
    draft = json.loads(choice["message"]["content"])
    if set(draft) != set(pilot.SCHEMA["required"]):
        raise RuntimeError("Odpověď nemá požadovaná pole.")
    if usage.get("cost") is None:
        raise RuntimeError("Služba nevrátila cenu; běh je nutné zastavit.")
    return answer.get("model", MODELS[kind]), usage, draft


def one(kind, item, offer, row, key):
    source_id = item["source_id"]
    if row["sha256"] != item["sha256"] or row["stav"] not in ("text", "ocr_text"):
        raise RuntimeError("Místní zdroj se změnil nebo nemá text.")
    prompt = pilot.prompt_for(offer, row)  # Celý text včetně všech značek stran; žádné krácení.
    model_name, usage, draft = openrouter_call(kind, prompt, key)
    return {
        "source_id": source_id, "sha256": row["sha256"], "file_id": row["file_id"],
        "rok": 2026, "kolo": 1, "vrstva": item["vrstva"], "metoda_textu": row["stav"],
        "model": model_name, "verze_zadani": pilot.PROMPT_VERSION, "verze_behu": VERSION,
        "prompt_sha256": hashlib.sha256(prompt.encode()).hexdigest(),
        "zpracovano_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "spotreba": usage, "cena_usd": usage["cost"], "navrh": draft,
    }


def existing_valid(path, item, offer, row):
    if not path.is_file():
        return None
    saved = json.loads(path.read_text(encoding="utf-8"))
    prompt_sha = hashlib.sha256(pilot.prompt_for(offer, row).encode()).hexdigest()
    if (saved.get("source_id") != item["source_id"] or saved.get("sha256") != row["sha256"]
            or saved.get("prompt_sha256") != prompt_sha or saved.get("verze_zadani") != pilot.PROMPT_VERSION
            or saved.get("rok") != 2026 or saved.get("kolo") != 1):
        raise RuntimeError(f"Existující výstup má jinou verzi: {item['source_id']}")
    return saved


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--model", required=True, choices=MODELS)
    parser.add_argument("--limit", type=int, default=100)
    parser.add_argument("--source-id", action="append", help="jedna či více nabídek ze zmrazeného vzorku")
    parser.add_argument("--opus-queue", action="store_true", help="jen výběr pro Opus ze srovnání dvojice")
    parser.add_argument("--workers", type=int, default=3)
    args = parser.parse_args()
    if not 1 <= args.limit <= 100 or not 1 <= args.workers <= 4:
        parser.error("--limit musí být 1–100 a --workers 1–4")
    all_sample = load_sample()
    if args.opus_queue:
        if args.model != "opus" or args.source_id:
            parser.error("--opus-queue lze použít jen pro model opus bez --source-id")
        queue = json.loads((OUTPUT / "srovnani.json").read_text(encoding="utf-8"))
        wanted = set(queue["pro_opus"])
        sample = [item for item in all_sample if item["source_id"] in wanted]
        if len(sample) != len(wanted):
            parser.error("Výběr pro Opus obsahuje ID mimo zmrazený vzorek.")
    elif args.source_id:
        wanted = set(args.source_id)
        sample = [item for item in all_sample if item["source_id"] in wanted]
        if len(sample) != len(wanted):
            parser.error("Některé ID nejsou ve zmrazeném vzorku.")
    else:
        sample = all_sample[:args.limit]
    offers = {item["source_id"]: item for item in json.loads(pilot.CATALOG.read_text(encoding="utf-8"))["data"]}
    manifest = pilot.latest_manifest()
    target = OUTPUT / args.model
    target.mkdir(parents=True, exist_ok=True)
    pending = []
    spent = 0.0
    new_spent = 0.0
    for item in sample:
        source_id = item["source_id"]
        saved = existing_valid(target / f"{source_id}-v{VERSION}.json", item,
                               offers[source_id], manifest[source_id])
        if saved is None:
            pending.append(item)
        else:
            spent += float(saved.get("cena_usd") or 0)
    print(f"Model {args.model}: {len(sample)-len(pending)} hotových, {len(pending)} k volání", flush=True)
    key = deepseek.api_key()
    errors = 0
    completed = 0
    with ThreadPoolExecutor(max_workers=args.workers) as executor:
        for offset in range(0, len(pending), args.workers):
            if spent >= MAX_COST_USD[args.model]:
                print("Dosažen cenový strop, zbývající nabídky se nespustily.", flush=True)
                break
            batch = pending[offset:offset + args.workers]
            jobs = {executor.submit(one, args.model, item, offers[item["source_id"]],
                                    manifest[item["source_id"]], key): item for item in batch}
            for future in as_completed(jobs):
                item = jobs[future]
                try:
                    record = future.result()
                    path = target / f"{item['source_id']}-v{VERSION}.json"
                    temp = path.with_suffix(".tmp")
                    temp.write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
                    os.replace(temp, path)
                    completed += 1
                    spent += float(record["cena_usd"])
                    new_spent += float(record["cena_usd"])
                except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, ValueError,
                        KeyError, RuntimeError) as error:
                    errors += 1
                    journal = target / "chyby.jsonl"
                    with journal.open("a", encoding="utf-8") as stream:
                        stream.write(json.dumps({"source_id": item["source_id"], "sha256": item["sha256"],
                                                 "at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                                                 "chyba": str(error)[:500]}, ensure_ascii=False) + "\n")
            if (completed + errors) % 10 < args.workers or offset + args.workers >= len(pending):
                print(f"{completed + errors}/{len(pending)} nově zpracováno, úspěch {completed}, "
                      f"chyba {errors}, vykázáno ${spent:.4f}", flush=True)
            if errors >= 10:
                print("Deset chyb v běhu; další volání zastavena.", flush=True)
                break
            time.sleep(0.2)
    print(f"Běh: úspěch {completed}, chyba {errors}, nová cena ${new_spent:.6f}, "
          f"celkem za vybrané soubory ${spent:.6f}", flush=True)


if __name__ == "__main__":
    main()
