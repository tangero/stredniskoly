#!/usr/bin/env python3
"""OCR a dohledatelné textové signály z místně stažených PDF 2026.

  python3 scripts/dipsy-kriteria-extrakce.py --ocr
  python3 scripts/dipsy-kriteria-extrakce.py --ocr-short
  python3 scripts/dipsy-kriteria-extrakce.py --signaly

Výskyty slov jsou kandidáty ke kontrole v PDF, nikoli závěrem o bodování.
"""

import argparse
import json
import os
import re
import subprocess
import tempfile
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "data/dipsy-kriteria-2026"
MANIFEST = BASE / "manifest.jsonl"
VERSION = 1
PATTERNS = {
    "jpz": re.compile(r"\bJPZ\b|jednotn\w*\s+přijímac\w*\s+zkoušk", re.I),
    "vahy": re.compile(r"\bváh\w*\b|\bkoeficient\w*\b|\bnásob\w*\b|\bprocent\w*\b|\d\s*%|\d\s*[×x]\s*(?:ČJ|MAT|test)", re.I),
    "dalsi_body": re.compile(r"\bprospěch\w*\b|\bznámk\w*\b|\bškoln\w*\s+(?:přijímac\w*\s+)?(?:zkoušk\w*|test\w*)\b|\bpohovor\w*\b|\bsoutěž\w*\b|\bbonifikac\w*\b|\btalentov\w*\s+zkoušk\w*", re.I),
    "minima": re.compile(r"\bminim\w*\b|\bnejméně\b|\balespoň\b|\bhranici?\s+(?:úspěšnosti|bodů)|\bnespln\w*\s+kritéri", re.I),
    "rovnost": re.compile(r"\bshod\w*\s+(?:bod\w*|pořad\w*|výsledk\w*)|\brovnost\w*\b|\bpři\s+rovnosti\b|\blose[mnv]?\b", re.I),
    "podminky": re.compile(r"\blékařsk\w*\b|\bzdravotn\w*\s+způsobilost\w*|\bprominut\w*\b|\bcizinc\w*\b|\bpodmínk\w*\s+přijet", re.I),
}


def latest_manifest():
    result = {}
    with MANIFEST.open(encoding="utf-8") as stream:
        for line in stream:
            try:
                item = json.loads(line)
                result[item["source_id"]] = item
            except (ValueError, KeyError, TypeError):
                continue
    return result


def context_lines(page, pattern, page_number, limit=12):
    lines = [" ".join(line.split()) for line in page.splitlines()]
    found = []
    for index, line in enumerate(lines):
        if not pattern.search(line):
            continue
        start = max(0, index - 1)
        end = min(len(lines), index + 2)
        snippet = " ".join(lines[start:end]).strip()
        if snippet and not any(existing["text"] == snippet for existing in found):
            found.append({"strana": page_number, "text": snippet[:420]})
        if len(found) >= limit:
            break
    return found


def evidence(text):
    pages = text.split("\f")
    if pages and not pages[-1].strip():
        pages.pop()
    result = {kind: [] for kind in PATTERNS}
    for page_number, page in enumerate(pages, 1):
        for kind, pattern in PATTERNS.items():
            if len(result[kind]) < 24:
                result[kind].extend(context_lines(page, pattern, page_number, 24 - len(result[kind])))
    return {kind: items for kind, items in result.items() if items}


def ocr_pdf(digest):
    pdf = BASE / "pdf" / f"{digest}.pdf"
    path = BASE / "text" / f"{digest}.ocr.txt"
    if path.is_file():
        return len(path.read_text(encoding="utf-8").strip())
    with tempfile.TemporaryDirectory(prefix="dipsy-ocr-") as folder:
        folder = Path(folder)
        subprocess.run(["pdftoppm", "-r", "150", "-png", str(pdf), str(folder / "strana")],
                       check=True, timeout=600, capture_output=True)
        pages = []
        for image in sorted(folder.glob("strana-*.png")):
            result = subprocess.run(["tesseract", str(image), "stdout", "-l", "ces+eng"],
                                    check=True, timeout=90, capture_output=True, text=True)
            pages.append(result.stdout)
    text = "\f".join(pages).strip()
    with tempfile.NamedTemporaryFile(dir=path.parent, prefix=".tmp-", mode="w", encoding="utf-8", delete=False) as stream:
        temporary = Path(stream.name)
        stream.write(text + "\n")
        stream.flush()
        os.fsync(stream.fileno())
    temporary.replace(path)
    return len(text)


def run_ocr(limit=None, include_short=False):
    if not MANIFEST.exists():
        raise SystemExit("Chybí manifest sběru.")
    latest = latest_manifest()
    waiting = [row for row in latest.values() if row.get("stav") == "nutne_ocr" or
               (include_short and row.get("stav") == "text" and row.get("text_znaku", 0) < 500
                and "ocr_at" not in row)]
    if limit:
        waiting = waiting[:limit]
    groups = {}
    for row in waiting:
        groups.setdefault(row["sha256"], []).append(row)
    stats = Counter()
    processed = 0
    with ThreadPoolExecutor(max_workers=2) as pool:
        futures = {pool.submit(ocr_pdf, digest): digest for digest in groups}
        for future in as_completed(futures):
            digest = futures[future]
            try:
                size = future.result()
                status = "ocr_text" if size >= 100 else "necitelný_text"
                error = None
            except (OSError, subprocess.SubprocessError, ValueError) as problem:
                size = 0
                status = "chyba_ocr"
                error = str(problem)[:240]
            with MANIFEST.open("a", encoding="utf-8") as stream:
                for row in groups[digest]:
                    row_status = status
                    if row["stav"] == "text" and (error or size <= row["text_znaku"]):
                        row_status = "text"
                    update = {**row, "stav": row_status, "ocr_at": datetime.now(timezone.utc).isoformat(timespec="seconds")}
                    if error:
                        update["chyba_ocr"] = error
                    else:
                        update["ocr_text_znaku"] = size
                        if row_status == "ocr_text":
                            update["text_znaku"] = size
                    stream.write(json.dumps(update, ensure_ascii=False) + "\n")
                    processed += 1
                    stats[row_status] += 1
                stream.flush()
                os.fsync(stream.fileno())
            if processed % 10 == 0 or status != "ocr_text" or processed == len(waiting):
                print(f"{processed}/{len(waiting)} {digest} {status} {dict(stats)}", flush=True)
    print(f"OCR celkem: {dict(stats)}", flush=True)


def run_signals():
    if not MANIFEST.exists():
        raise SystemExit("Chybí manifest sběru.")
    latest = latest_manifest()
    destination = BASE / "evidence.jsonl"
    with tempfile.NamedTemporaryFile(dir=BASE, prefix=".tmp-evidence-", mode="w", encoding="utf-8", delete=False) as stream:
        temporary = Path(stream.name)
        stats = Counter()
        for row in latest.values():
            if row.get("stav") not in ("text", "ocr_text"):
                continue
            digest = row["sha256"]
            suffix = ".ocr.txt" if row["stav"] == "ocr_text" else ".txt"
            path = BASE / "text" / f"{digest}{suffix}"
            if not path.exists():
                stats["chybi_text"] += 1
                continue
            text = path.read_text(encoding="utf-8", errors="replace")
            item = {
                "source_id": row["source_id"],
                "sha256": digest,
                "verze_extrakce": VERSION,
                "metoda_textu": row["stav"],
                "text_znaku": len(text.strip()),
                "vyskyty": evidence(text),
                "stav": "k_lidskemu_posouzeni",
            }
            stream.write(json.dumps(item, ensure_ascii=False) + "\n")
            stats["zpracovano"] += 1
        stream.flush()
        os.fsync(stream.fileno())
    temporary.replace(destination)
    print(f"Textové signály: {dict(stats)}; {destination}", flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    action = parser.add_mutually_exclusive_group(required=True)
    action.add_argument("--ocr", action="store_true")
    action.add_argument("--ocr-short", action="store_true")
    action.add_argument("--signaly", action="store_true")
    parser.add_argument("--limit", type=int)
    args = parser.parse_args()
    if args.limit is not None and args.limit < 1:
        parser.error("--limit musí být kladný.")
    if args.ocr or args.ocr_short:
        run_ocr(args.limit, include_short=args.ocr_short)
    else:
        run_signals()


if __name__ == "__main__":
    main()
