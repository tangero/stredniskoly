#!/usr/bin/env python3
"""Obnovitelný místní sběr PDF kritérií pro všechny nabídky 1. kola 2026.

  python3 scripts/dipsy-kriteria-sber.py --limit 10
  python3 scripts/dipsy-kriteria-sber.py
  python3 scripts/dipsy-kriteria-sber.py --retry-errors

Každý pokus má samostatný řádek v gitignorovaném manifest.jsonl. Skript
nevyhodnocuje bodování a nic nezapisuje do veřejného katalogu ani databáze.
"""

import argparse
import hashlib
import json
import os
import re
import subprocess
import tempfile
import threading
import time
import unicodedata
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

import requests

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "public/applications_2026.json"
OUTPUT = ROOT / "data/dipsy-kriteria-2026"
PILOT_PDF = ROOT / "data/dipsy-kriteria-pilot/pdf"
API = "https://api.dipsy.gov.cz/v1"
UUID = re.compile(r"^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$")
MAX_PDF = 20_000_000
USER_AGENT = "PrijimackyNaSkolu-kriteria-sber/0.1 (+https://www.prijimackynaskolu.cz/)"
THREAD = threading.local()
FILE_CACHE = {}
FILE_LOCK = threading.Lock()


def now():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def norm(value):
    return " ".join(unicodedata.normalize("NFC", str(value or "")).split()).casefold()


def valid_card(card, offer):
    if not isinstance(card, dict):
        return "Karta není objekt."
    checks = {
        "ID nabídky": card.get("id") == offer["source_id"],
        "rok": card.get("skolniRok") == 2026,
        "kolo": card.get("kolo") == 1,
        "REDIZO": str((card.get("reditelstviSkoly") or {}).get("redizo")) == offer["redizo"],
        "KKOV": norm((card.get("skolniObor") or {}).get("kod")) == norm(offer["kkov"]),
        "zaměření": norm(card.get("zamereni")) == norm(offer.get("zamereni")),
        "IZO": re.sub(r"\D", "", str((card.get("skola") or {}).get("izo", ""))) == re.sub(r"\D", "", str(offer.get("izo", ""))),
    }
    failed = [name for name, ok in checks.items() if not ok]
    return "Nesouhlasí: " + ", ".join(failed) if failed else None


def latest_manifest(path):
    latest = {}
    if not path.exists():
        return latest
    with path.open(encoding="utf-8") as stream:
        for line in stream:
            try:
                row = json.loads(line)
                latest[row["source_id"]] = row
            except (ValueError, KeyError, TypeError):
                continue
    return latest


def request_json(session, method, url, delay, **kwargs):
    for attempt in range(3):
        try:
            response = session.request(method, url, timeout=30, **kwargs)
            if response.status_code in (429, 500, 502, 503, 504):
                response.raise_for_status()
            response.raise_for_status()
            body = response.json()
            if not isinstance(body, dict) or not isinstance(body.get("meta"), dict) or body["meta"].get("success") is False:
                raise ValueError("DiPSy vrátilo neúspěšnou nebo neznámou odpověď.")
            return body.get("data")
        except (requests.RequestException, ValueError):
            if attempt == 2:
                raise
            time.sleep(max(delay, 1 + 2 * attempt))
        finally:
            time.sleep(delay)


def download_pdf(session, url, delay):
    parsed = urlparse(url)
    if parsed.scheme != "https" or not parsed.hostname or not parsed.hostname.endswith(".blob.core.windows.net"):
        raise ValueError("Neočekávaná adresa PDF od DiPSy.")
    for attempt in range(3):
        try:
            with session.get(url, timeout=60, stream=True, allow_redirects=False) as response:
                response.raise_for_status()
                if response.is_redirect:
                    raise ValueError("Přesměrování PDF není povolené.")
                content = bytearray()
                for chunk in response.iter_content(128 * 1024):
                    content.extend(chunk)
                    if len(content) > MAX_PDF:
                        raise ValueError("PDF překročilo limit 20 MB.")
                if not content.startswith(b"%PDF-"):
                    raise ValueError("Soubor nezačíná hlavičkou PDF.")
                return bytes(content)
        except requests.RequestException:
            if attempt == 2:
                raise
            time.sleep(max(delay, 1 + 2 * attempt))
        finally:
            time.sleep(delay)
    raise RuntimeError("Stahování PDF selhalo.")


def write_atomic(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(dir=path.parent, prefix=".tmp-", delete=False) as stream:
        temp = Path(stream.name)
        stream.write(data)
        stream.flush()
        os.fsync(stream.fileno())
    try:
        temp.replace(path)
    finally:
        temp.unlink(missing_ok=True)


def hash_file(path):
    value = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            value.update(chunk)
    return value.hexdigest()


def extract_text(pdf_path, text_path):
    if not text_path.exists():
        with tempfile.NamedTemporaryFile(dir=text_path.parent, prefix=".tmp-", delete=False) as stream:
            temp = Path(stream.name)
        try:
            subprocess.run(["pdftotext", "-layout", str(pdf_path), str(temp)], check=True, timeout=45, capture_output=True)
            temp.replace(text_path)
        finally:
            temp.unlink(missing_ok=True)
    text = text_path.read_text(encoding="utf-8", errors="replace")
    return len(text.strip())


def one(session, offer, delay):
    source_id = offer["source_id"]
    record = {
        "source_id": source_id,
        "redizo": offer["redizo"],
        "kkov": offer["kkov"],
        "zamereni": offer.get("zamereni") or "",
        "rok": 2026,
        "kolo": 1,
        "karta_url": f"{API}/skol-oboro-forma/{source_id}",
        "pokus_at": now(),
        "stav": "chyba",
    }
    try:
        card = request_json(session, "GET", record["karta_url"], delay)
        issue = valid_card(card, offer)
        if issue:
            raise ValueError(issue)
        criteria = card.get("podminkyProPrijeti") or {}
        file_id = criteria.get("fileId")
        if not isinstance(file_id, str) or not UUID.fullmatch(file_id):
            raise ValueError("Karta nemá platné ID PDF kritérií.")
        record["file_id"] = file_id
        record["kona_jpz"] = card.get("konaJPZ") if isinstance(card.get("konaJPZ"), bool) else None
        with FILE_LOCK:
            cached = FILE_CACHE.get(file_id)
        cached_pdf = OUTPUT / "pdf" / f"{cached['sha256']}.pdf" if cached else None
        if cached and cached_pdf.is_file() and hash_file(cached_pdf) == cached["sha256"] and (OUTPUT / "text" / f"{cached['sha256']}.txt").is_file():
            record.update({key: cached[key] for key in ("sha256", "pdf_bajtu", "text_znaku", "stav")})
            record["ziskano_at"] = cached["ziskano_at"]
            record["zkontrolovano_at"] = now()
            record["pdf_sdileno_z"] = cached["source_id"]
            return record
        response = request_json(session, "POST", f"{API}/soubor/{file_id}", delay, params={"skolniRok": 2026}, json={})
        download_url = (response or {}).get("file", {}).get("downloadUrl")
        if not isinstance(download_url, str):
            raise ValueError("DiPSy nevrátilo odkaz na PDF.")
        content = download_pdf(session, download_url, delay)
        digest = hashlib.sha256(content).hexdigest()
        record["sha256"] = digest
        record["pdf_bajtu"] = len(content)
        pdf_path = OUTPUT / "pdf" / f"{digest}.pdf"
        if not pdf_path.exists() or hash_file(pdf_path) != digest:
            pilot_path = PILOT_PDF / f"{digest}.pdf"
            if pilot_path.exists() and hash_file(pilot_path) == digest and not pdf_path.exists():
                try:
                    os.link(pilot_path, pdf_path)
                except OSError:
                    write_atomic(pdf_path, content)
            else:
                write_atomic(pdf_path, content)
        text_path = OUTPUT / "text" / f"{digest}.txt"
        text_path.parent.mkdir(parents=True, exist_ok=True)
        text_size = extract_text(pdf_path, text_path)
        record["text_znaku"] = text_size
        record["stav"] = "text" if text_size >= 100 else "nutne_ocr"
        record["ziskano_at"] = now()
        record["zkontrolovano_at"] = record["ziskano_at"]
        with FILE_LOCK:
            FILE_CACHE[file_id] = record
    except (requests.RequestException, ValueError, KeyError, TypeError, OSError, subprocess.SubprocessError) as error:
        record["chyba"] = str(error)[:240]
    return record


def worker(offer, delay):
    if not hasattr(THREAD, "session"):
        THREAD.session = requests.Session()
        THREAD.session.headers["User-Agent"] = USER_AGENT
    return one(THREAD.session, offer, delay)


def stored_complete(row):
    if row.get("stav") not in ("text", "ocr_text", "nutne_ocr"):
        return False
    digest = row.get("sha256", "")
    if not re.fullmatch(r"[0-9a-f]{64}", digest):
        return False
    if not (OUTPUT / "pdf" / f"{digest}.pdf").is_file():
        return False
    suffix = ".ocr.txt" if row["stav"] == "ocr_text" else ".txt"
    return (OUTPUT / "text" / f"{digest}{suffix}").is_file()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--limit", type=int, help="nejvýše tolik nových nabídek zpracovat v tomto běhu")
    parser.add_argument("--sleep", type=float, default=0.3, help="prodleva po každém HTTP požadavku v sekundách")
    parser.add_argument("--workers", type=int, default=3, help="počet souběžných nabídek, nejvýše 3")
    parser.add_argument("--retry-errors", action="store_true", help="zopakovat i dřívější chybové řádky")
    args = parser.parse_args()
    if (args.limit is not None and args.limit < 1) or args.sleep < 0.2 or args.workers not in (1, 2, 3):
        parser.error("--limit musí být kladný, --sleep alespoň 0,2 s a --workers v rozsahu 1–3.")
    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    if catalog.get("meta", {}).get("rok") != 2026 or catalog["meta"].get("kolo") != 1:
        parser.error("Katalog není 1. kolo 2026.")
    offers = catalog["data"]
    if len({row.get("source_id") for row in offers}) != len(offers):
        parser.error("Katalog obsahuje opakované source_id.")
    OUTPUT.mkdir(parents=True, exist_ok=True)
    manifest = OUTPUT / "manifest.jsonl"
    existing = latest_manifest(manifest)
    today = datetime.now(timezone.utc).date().isoformat()
    with FILE_LOCK:
        FILE_CACHE.clear()
        FILE_CACHE.update({row["file_id"]: row for row in existing.values()
                           if row.get("stav") in ("text", "nutne_ocr") and row.get("file_id")
                           and str(row.get("ziskano_at", "")).startswith(today)
                           and all(key in row for key in ("sha256", "pdf_bajtu", "text_znaku"))})
    pending = [row for row in offers if row["source_id"] not in existing
               or (not stored_complete(existing[row["source_id"]]) and
                   (args.retry_errors or existing[row["source_id"]].get("stav") in ("text", "ocr_text", "nutne_ocr")))]
    if args.limit:
        pending = pending[:args.limit]
    if not pending:
        print("Žádné nabídky k tomuto běhu.")
        return
    if not shutil_which("pdftotext"):
        parser.error("Chybí pdftotext (Poppler).")
    stats = Counter()
    print(f"Ke zpracování: {len(pending)} z {len(offers)} nabídek; výstup {manifest}", flush=True)
    pool = ThreadPoolExecutor(max_workers=args.workers)
    try:
        with manifest.open("a", encoding="utf-8") as stream:
            futures = [pool.submit(worker, offer, args.sleep) for offer in pending]
            for index, future in enumerate(as_completed(futures), 1):
                record = future.result()
                stream.write(json.dumps(record, ensure_ascii=False) + "\n")
                stream.flush()
                os.fsync(stream.fileno())
                stats[record["stav"]] += 1
                if index % 25 == 0 or record["stav"] == "chyba" or index == len(pending):
                    print(f"{index}/{len(pending)} {record['source_id']} {record['stav']} {dict(stats)}", flush=True)
    except KeyboardInterrupt:
        print("Přerušeno; hotové řádky jsou v manifestu.", flush=True)
    finally:
        pool.shutdown(wait=False, cancel_futures=True)


def shutil_which(name):
    from shutil import which
    return which(name)


if __name__ == "__main__":
    main()
