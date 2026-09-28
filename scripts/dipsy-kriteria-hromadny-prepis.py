#!/usr/bin/env python3
"""Hromadný přepis kritérií 2026 úsporným schématem (verze zadání 8).

Používá přesně totéž zadání, schéma, model a výběr sekce oboru jako
scripts/dipsy-kriteria-usporny-pilot.py, jen nad všemi nabídkami 1. kola
2026 s jednotnou přijímací zkouškou, které mají PDF s textem. Výsledky jdou
do stejné složky, takže hotové nabídky se přeskočí a běh jde přerušit a
spustit znovu.

Pojistky rozpočtu (limit 10 USD na celé kritérie 2026, rozhodnutí zadavatele):
  - strop nových výdajů tohoto běhu (--strop, výchozí 3,50 USD) se kontroluje
    před každým voláním včetně rezervy na volání, která právě běží,
  - chybí-li v odpovědi účtovaná cena, běh se zastaví,
  - nedokončené volání se uloží jako .error.json s cenou a znovu se nezkouší.

    python3 scripts/dipsy-kriteria-hromadny-prepis.py --limit 10
    python3 scripts/dipsy-kriteria-hromadny-prepis.py
    python3 scripts/dipsy-kriteria-hromadny-prepis.py --source-id … --source-id …
    python3 scripts/dipsy-kriteria-hromadny-prepis.py --sekce          # stará verze 8

Výchozí je celý text PDF, výsledek se ukládá jako verze 9 (výběr sekce minul
kritéria na pozdějších stranách, kontrola Jevem 28. 9. 2026). Sestavení dat
dá verzi 9 přednost před 8. Po přepisu pustit kontrolu Jevem:
scripts/dipsy-kriteria-jev-kontrola.py --jen-jpz.
"""
from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import threading
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("usporny", ROOT / "scripts/dipsy-kriteria-usporny-pilot.py")
up = importlib.util.module_from_spec(spec)
spec.loader.exec_module(up)

# Horní odhad ceny jednoho volání pro rezervu (pilot: medián ~0,001 USD, max pod 0,004).
REZERVA_NA_VOLANI = 0.006
VERZE_PLNY = 9
MAX_ZNAKU_PLNY = 80_000
plny_text = False


def verze() -> int:
    return VERZE_PLNY if plny_text else up.VERSION


def prompt_plny(offer: dict, row: dict) -> str:
    """Totéž zadání jako úsporný pilot, ale s celým textem PDF."""
    suffix = ".ocr.txt" if row["stav"] == "ocr_text" else ".txt"
    pages = (up.BASE / "text" / f"{row['sha256']}{suffix}").read_text(encoding="utf-8").split("\f")
    text = "\n\n".join(f"=== STRANA {i} ===\n{p}" for i, p in enumerate(pages, 1) if p.strip())[:MAX_ZNAKU_PLNY]
    return (f"{up.INSTRUCTIONS}\n\nNabídka {offer['source_id']}; REDIZO {offer['redizo']}; "
            f"KKOV {offer['kkov']}; zaměření {offer.get('zamereni') or '(bez zaměření)'}; "
            f"otisk PDF {row['sha256']}\n\n{text}")

zamek = threading.Lock()
utraceno = 0.0
rozpracovano = 0
zastavit = threading.Event()


def vyber(limit: int | None, ids: list[str] | None = None) -> list[tuple[dict, dict]]:
    offers = {o["source_id"]: o for o in json.loads(up.pilot.CATALOG.read_text(encoding="utf-8"))["data"]}
    manifest = up.pilot.latest_manifest()
    fronta = []
    for sid, row in manifest.items():
        if sid not in offers or row.get("rok") != 2026 or row.get("kolo") != 1:
            continue
        if row.get("stav") not in ("text", "ocr_text") or not row.get("kona_jpz"):
            continue
        if ids is not None and sid not in ids:
            continue
        cil = up.OUTPUT / f"{sid}-v{verze()}.json"
        chyba = up.OUTPUT / f"{sid}-v{verze()}.error.json"
        if cil.exists() or chyba.exists():
            continue
        fronta.append((offers[sid], row))
    fronta.sort(key=lambda x: x[0]["source_id"])
    return fronta[:limit] if limit else fronta


def prepis(offer: dict, row: dict, key: str, strop: float) -> str:
    global utraceno, rozpracovano
    sid = offer["source_id"]
    with zamek:
        if zastavit.is_set():
            return "preskoceno"
        if utraceno + (rozpracovano + 1) * REZERVA_NA_VOLANI > strop:
            zastavit.set()
            return "strop"
        rozpracovano += 1
    try:
        prompt = prompt_plny(offer, row) if plny_text else up.prompt_for(offer, row)
        digest = hashlib.sha256(prompt.encode("utf-8")).hexdigest()
        body = {
            "model": up.MODEL,
            "messages": [{"role": "system", "content": "Pracuj jen s dodaným PDF; nepoužívej nástroje."},
                         {"role": "user", "content": prompt}],
            "response_format": {"type": "json_schema", "json_schema": {
                "name": "kriteria_usporny_v5", "strict": True, "schema": up.ds.strict_schema(up.SCHEMA)}},
            "provider": {"only": ["DeepInfra"], "allow_fallbacks": False, "require_parameters": True},
            "reasoning": {"effort": "none"}, "temperature": 0, "max_tokens": 3200, "stream": False,
        }
        req = urllib.request.Request(
            "https://openrouter.ai/api/v1/chat/completions",
            data=json.dumps(body, ensure_ascii=False).encode("utf-8"),
            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        )
        for pokus in range(3):
            try:
                with urllib.request.urlopen(req, timeout=300) as response:
                    answer = json.load(response)
                break
            except urllib.error.HTTPError as e:
                # 429 a 5xx se účtují nulou; zkusit znovu s odstupem.
                if e.code in (429, 500, 502, 503) and pokus < 2:
                    time.sleep(10 * (pokus + 1))
                    continue
                raise
        choice = answer["choices"][0]
        usage = answer.get("usage") or {}
        cena = usage.get("cost")
        now = datetime.now(timezone.utc).isoformat(timespec="seconds")
        if cena is None:
            zastavit.set()
            raise RuntimeError(f"{sid}: chybí účtovaná cena, běh zastaven")
        with zamek:
            utraceno += float(cena)
        if choice.get("finish_reason") != "stop" or not choice["message"].get("content"):
            chyba = {"source_id": sid, "sha256": row["sha256"], "rok": 2026, "kolo": 1,
                     "prompt_sha256": digest, "duvod": choice.get("finish_reason"),
                     "zpracovano_at": now, "spotreba": usage, "cena_usd": cena}
            (up.OUTPUT / f"{sid}-v{verze()}.error.json").write_text(
                json.dumps(chyba, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            return "nedokonceno"
        record = {"source_id": sid, "sha256": row["sha256"], "rok": 2026, "kolo": 1,
                  "model": answer.get("model", up.MODEL), "verze_zadani": up.VERSION, "plny_text": plny_text,
                  "prompt_sha256": digest, "zpracovano_at": now, "prompt_znaku": len(prompt),
                  "spotreba": usage, "cena_usd": cena,
                  "navrh": json.loads(choice["message"]["content"])}
        cil = up.OUTPUT / f"{sid}-v{verze()}.json"
        tmp = cil.with_suffix(".tmp")
        tmp.write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        tmp.replace(cil)
        return "hotovo"
    finally:
        with zamek:
            rozpracovano -= 1


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--limit", type=int)
    parser.add_argument("--strop", type=float, default=3.50, help="strop nových výdajů tohoto běhu v USD")
    parser.add_argument("--vlaken", type=int, default=6)
    # Výchozí je celé PDF (rozhodnutí 28. 9. 2026): výběr sekce oboru minul
    # kritéria na pozdějších stranách. --sekce jen pro opakování starých běhů v8.
    parser.add_argument("--sekce", action="store_true", help="posílat jen sekci oboru (verze 8)")
    parser.add_argument("--plny-text", action="store_true", help="zastaralé, celé PDF je výchozí")
    parser.add_argument("--source-id", action="append")
    args = parser.parse_args()
    global plny_text
    plny_text = not args.sekce
    fronta = vyber(args.limit, set(args.source_id) if args.source_id else None)
    print(f"Ve frontě {len(fronta)} nabídek, strop {args.strop} USD.", flush=True)
    up.OUTPUT.mkdir(parents=True, exist_ok=True)
    key = up.ds.api_key()
    vysledky: dict[str, int] = {}
    with ThreadPoolExecutor(max_workers=args.vlaken) as pool:
        budouci = [pool.submit(prepis, o, r, key, args.strop) for o, r in fronta]
        for i, f in enumerate(as_completed(budouci), 1):
            try:
                stav = f.result()
            except Exception as e:  # noqa: BLE001 – vypsat a pokračovat, cena se hlídá zvlášť
                stav = "chyba"
                print("CHYBA", e, flush=True)
            vysledky[stav] = vysledky.get(stav, 0) + 1
            if i % 50 == 0 or i == len(budouci):
                print(f"{i}/{len(budouci)} {vysledky} utraceno {utraceno:.4f} USD", flush=True)
    print(f"Hotovo: {vysledky}, utraceno {utraceno:.4f} USD", flush=True)


if __name__ == "__main__":
    main()
