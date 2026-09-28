#!/usr/bin/env python3
"""Dávkově doplní modelové přepisy zmrazeného vzorku; nikdy je nepřepíše."""

import argparse
import hashlib
import importlib.util
import json
import os
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone

spec = importlib.util.spec_from_file_location("beh", __file__.replace("-batch.py", "-beh.py"))
beh = importlib.util.module_from_spec(spec)
spec.loader.exec_module(beh)

ENDPOINT = "https://openrouter.ai/api/v1/batches"
TERMINAL = {"completed", "failed", "expired", "cancelled"}


def request(url, key, body=None):
    data = None if body is None else json.dumps(body, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers={
        "Authorization": f"Bearer {key}", "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=120) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        raise RuntimeError(f"Batch API HTTP {error.code}: {error.read(1200).decode('utf-8', 'replace')}") from error


def save_json(path, data):
    temp = path.with_suffix(".tmp")
    temp.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    os.replace(temp, path)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--model", required=True, choices=beh.MODELS)
    parser.add_argument("--opus-queue", action="store_true")
    parser.add_argument("--poll", action="store_true", help="získat výsledek již odeslané dávky")
    parser.add_argument("--wait", action="store_true", help="čekat na dokončení v intervalu 60 sekund")
    parser.add_argument("--archiv", action="store_true",
                        help="výslovně spustit archivní pilot (placená volání bez plné pojistky rozpočtu)")
    args = parser.parse_args()
    if not args.archiv:
        # Archivní pilot vzorku 100 (24. 9. 2026). Pro nové přepisy slouží
        # scripts/dipsy-kriteria-hromadny-prepis.py, který má pojistku rozpočtu
        # i při neznámém účtování; tento skript ji nemá (code review PR #182).
        raise SystemExit("Archivní pilot. Použijte dipsy-kriteria-hromadny-prepis.py, nebo --archiv.")
    if args.opus_queue and args.model != "opus":
        parser.error("--opus-queue patří jen k modelu opus")
    sample = beh.load_sample()
    if args.opus_queue:
        comparison = json.loads((beh.OUTPUT / "srovnani.json").read_text(encoding="utf-8"))
        selected = set(comparison["pro_opus"])
        sample = [item for item in sample if item["source_id"] in selected]
        if len(sample) != len(selected):
            raise RuntimeError("Výběr pro Opus obsahuje neznámou nabídku.")
    offers = {x["source_id"]: x for x in json.loads(beh.pilot.CATALOG.read_text(encoding="utf-8"))["data"]}
    manifest = beh.pilot.latest_manifest()
    target = beh.OUTPUT / args.model
    target.mkdir(parents=True, exist_ok=True)
    state_path = target / "batch-state.json"
    key = beh.deepseek.api_key()

    if not state_path.exists():
        if args.poll:
            raise RuntimeError("Pro model není uložené ID dávky.")
        pending = []
        for item in sample:
            sid = item["source_id"]
            if beh.existing_valid(target / f"{sid}-v{beh.VERSION}.json", item, offers[sid], manifest[sid]):
                continue
            row = manifest[sid]
            if row["sha256"] != item["sha256"] or row["stav"] not in ("text", "ocr_text"):
                raise RuntimeError(f"Zdroj se změnil: {sid}")
            prompt = beh.pilot.prompt_for(offers[sid], row)
            body = {
                "messages": [
                    {"role": "system", "content": "Jsi nezávislý extraktor kritérií přijetí. Pracuj jen s dodaným textem PDF a nepoužívej nástroje."},
                    {"role": "user", "content": prompt},
                ],
                "response_format": {"type": "json_schema", "json_schema": {
                    "name": "kriteria_prijeti_2026", "strict": True,
                    "schema": beh.deepseek.strict_schema(beh.pilot.SCHEMA),
                }},
                "max_tokens": 5000 if args.model == "opus" else 16000,
            }
            if args.model == "deepseek":
                body["reasoning"] = {"effort": "none"}
                body["temperature"] = 0
            elif args.model == "luna":
                body["reasoning"] = {"effort": "medium"}
            pending.append({"custom_id": sid, "body": body,
                            # Otisky toho, co model skutečně dostal; při převzetí se porovnají.
                            "_odeslano": {"prompt_sha256": hashlib.sha256(prompt.encode()).hexdigest(),
                                          "sha256": row["sha256"], "verze_zadani": beh.pilot.PROMPT_VERSION}})
        if not pending:
            print(f"{args.model}: všechny vybrané záznamy již existují.", flush=True)
            return
        payload = {"endpoint": "/v1/chat/completions", "model": beh.MODELS[args.model]}
        if args.model == "deepseek":
            payload["provider"] = {"only": ["deepinfra"]}
        payload["requests"] = [{"custom_id": x["custom_id"], "body": x["body"]} for x in pending]
        answer = request(ENDPOINT, key, payload)
        if not answer.get("id") or answer.get("request_counts", {}).get("total") != len(pending):
            raise RuntimeError(f"Dávka nebyla jednoznačně přijata: {str(answer)[:800]}")
        state = {"batch_id": answer["id"], "model": args.model,
                 "sample_sha256": beh.SAMPLE_SHA256,
                 "source_ids": [x["custom_id"] for x in pending],
                 "odeslano": {x["custom_id"]: x["_odeslano"] for x in pending},
                 "vytvoreno_at": datetime.now(timezone.utc).isoformat(timespec="seconds")}
        save_json(state_path, state)
        print(f"{args.model}: odesláno {len(pending)} nabídek, dávka {answer['id']}, stav {answer['status']}", flush=True)
    else:
        state = json.loads(state_path.read_text(encoding="utf-8"))
        if state["model"] != args.model or state["sample_sha256"] != beh.SAMPLE_SHA256:
            raise RuntimeError("Uložená dávka patří jinému modelu nebo vzorku.")
        if not args.poll and not args.wait:
            print(f"Existuje dávka {state['batch_id']}; použijte --poll nebo --wait.", flush=True)
            return

    first_poll = True
    while True:
        try:
            answer = request(f"{ENDPOINT}/{state['batch_id']}", key)
        except RuntimeError as error:
            # Po 202 Accepted může krátce trvat, než GET vidí nově založenou dávku.
            if first_poll and "HTTP 404" in str(error):
                time.sleep(3)
                answer = request(f"{ENDPOINT}/{state['batch_id']}", key)
            else:
                raise
        first_poll = False
        status = answer.get("status")
        counts = answer.get("request_counts") or {}
        print(f"{args.model}: {status}, hotovo {counts.get('completed', 0)}/{counts.get('total', '?')}, "
              f"selhalo {counts.get('failed', 0)}", flush=True)
        if status in TERMINAL:
            break
        if not args.wait:
            return
        time.sleep(60)

    if status != "completed":
        raise RuntimeError(f"Dávka skončila stavem {status}: {str(answer.get('error'))[:500]}")
    results = answer.get("results") or []
    if len(results) != len(state["source_ids"]) or {x.get("custom_id") for x in results} != set(state["source_ids"]):
        raise RuntimeError("Výsledek dávky nemá jednu odpověď pro každou nabídku.")
    by_id = {x["source_id"]: x for x in beh.load_sample()}
    completed = 0
    errors = []
    for entry in results:
        sid = entry["custom_id"]
        item = by_id[sid]
        row = manifest[sid]
        path = target / f"{sid}-v{beh.VERSION}.json"
        if path.exists():
            beh.existing_valid(path, item, offers[sid], row)
            continue
        try:
            response = entry.get("response") or {}
            if response.get("status_code") != 200:
                raise RuntimeError(str(entry.get("error") or response)[:400])
            content = response["body"]["choices"][0]
            if content.get("finish_reason") != "stop":
                raise RuntimeError(f"Neúplná odpověď: {content.get('finish_reason')}")
            draft = json.loads(content["message"]["content"])
            if set(draft) != set(beh.pilot.SCHEMA["required"]):
                raise RuntimeError("Odpověď nemá požadovaná pole.")
            usage = response["body"].get("usage") or {}
            prompt = beh.pilot.prompt_for(offers[sid], row)
            odeslano = (state.get("odeslano") or {}).get(sid)
            aktualni = {"prompt_sha256": hashlib.sha256(prompt.encode()).hexdigest(),
                        "sha256": row["sha256"], "verze_zadani": beh.pilot.PROMPT_VERSION}
            if odeslano is None or odeslano != aktualni:
                # Model četl jiné podklady, než jsou dnes; výsledek by nesl cizí otisky.
                raise RuntimeError("Podklady se od odeslání dávky změnily (nebo dávka nemá otisky); výsledek je zastaralý.")
            record = {
                "source_id": sid, "sha256": row["sha256"], "file_id": row["file_id"],
                "rok": 2026, "kolo": 1, "vrstva": item["vrstva"], "metoda_textu": row["stav"],
                "model": response["body"].get("model", beh.MODELS[args.model]),
                "verze_zadani": beh.pilot.PROMPT_VERSION, "verze_behu": beh.VERSION,
                "prompt_sha256": hashlib.sha256(prompt.encode()).hexdigest(),
                "zpracovano_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                "spotreba": usage, "cena_usd": usage.get("cost"),
                "batch_id": state["batch_id"], "navrh": draft,
            }
            save_json(path, record)
            completed += 1
        except (KeyError, ValueError, TypeError, RuntimeError) as error:
            errors.append({"source_id": sid, "chyba": str(error)[:500]})
    save_json(target / "batch-summary.json", {
        "batch_id": state["batch_id"], "status": status, "request_counts": counts,
        "usage": answer.get("usage"), "ulozeno": completed, "chyby": errors,
    })
    print(f"{args.model}: uloženo {completed}, chyb {len(errors)}, cena dávky "
          f"${(answer.get('usage') or {}).get('cost', 0):.4f}", flush=True)
    if errors:
        raise RuntimeError(f"Chyby jednotlivých nabídek: {len(errors)}")


if __name__ == "__main__":
    main()
