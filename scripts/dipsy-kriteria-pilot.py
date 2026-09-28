#!/usr/bin/env python3
"""Reprodukovatelný vzorek kritérií DiPSy 2026; bez automatického hodnocení PDF.

  python3 scripts/dipsy-kriteria-pilot.py --vyber
  python3 scripts/dipsy-kriteria-pilot.py --stahnout

Výstup je lokální v data/dipsy-kriteria-pilot/ (mimo git). Jeden řádek
hodnoceni.csv = jedna nabídka, i když více nabídek sdílí shodné PDF.
"""

import argparse
import csv
import hashlib
import json
import random
import shutil
import subprocess
import tempfile
import time
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

import requests

ROOT = Path(__file__).resolve().parents[1]
INPUT = ROOT / "public/applications_2026.json"
OUTPUT = ROOT / "data/dipsy-kriteria-pilot"
API = "https://api.dipsy.gov.cz/v1"
SEED = 20260924
SIZE = 100


def vyber():
    data = json.loads(INPUT.read_text(encoding="utf-8"))
    assert data["meta"]["rok"] == 2026 and data["meta"]["kolo"] == 1
    groups = defaultdict(list)
    for row in data["data"]:
        if row.get("source_id"):
            groups[(row.get("typ") or "?", row.get("kraj_kod") or "?")].append(row)
    rng = random.Random(SEED)
    for group in groups.values():
        rng.shuffle(group)
    # Rozložení po typu a kraji, nikoli reprezentativní výběr pro odhad podílu.
    selected = []
    while len(selected) < SIZE and any(groups.values()):
        for key in sorted(groups):
            if groups[key] and len(selected) < SIZE:
                selected.append(groups[key].pop())
    return [{
        "source_id": row["source_id"],
        "redizo": row["redizo"],
        "id": row["id"],
        "kkov": row["kkov"],
        "zamereni": row.get("zamereni") or "",
        "nazev": row["nazev"],
        "typ": row.get("typ"),
        "kraj_kod": row.get("kraj_kod"),
        "rok": 2026,
        "kolo": 1,
    } for row in selected]


def json_request(session, method, url, **kwargs):
    for attempt in range(3):
        try:
            response = session.request(method, url, timeout=25, **kwargs)
            response.raise_for_status()
            payload = response.json()
            if isinstance(payload, dict) and payload.get("meta", {}).get("success") is False:
                raise ValueError("DiPSy vrátilo neúspěšnou odpověď")
            return payload.get("data")
        except (requests.RequestException, ValueError):
            if attempt == 2:
                raise
            time.sleep(1 + attempt)


def stahni(session, url):
    parsed = urlparse(url)
    if parsed.scheme != "https" or not parsed.hostname or not parsed.hostname.endswith(".blob.core.windows.net"):
        raise ValueError("Neočekávaná adresa souboru od DiPSy")
    response = session.get(url, timeout=45)
    response.raise_for_status()
    if not response.content.startswith(b"%PDF-") or len(response.content) > 20_000_000:
        raise ValueError("Soubor není PDF nebo překračuje limit 20 MB")
    return response.content


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    action = parser.add_mutually_exclusive_group(required=True)
    action.add_argument("--vyber", action="store_true", help="jen sestavit vzorek bez sítě")
    action.add_argument("--stahnout", action="store_true", help="stáhnout PDF a připravit kontrolní list")
    action.add_argument("--ocr", action="store_true", help="zkusit OCR u PDF bez čitelného textu")
    args = parser.parse_args()
    OUTPUT.mkdir(parents=True, exist_ok=True)
    if args.ocr:
        target = OUTPUT / 'hodnoceni.csv'
        with target.open(newline='', encoding='utf-8') as source:
            reader = csv.DictReader(source, delimiter=';')
            rows = list(reader)
            fields = reader.fieldnames
        if not shutil.which('pdftoppm') or not shutil.which('tesseract'):
            parser.error('OCR vyžaduje pdftoppm a tesseract s češtinou.')
        for row in rows:
            if row['stav_stazeni'] != 'nutne_ocr':
                continue
            digest = row['sha256']
            pdf_path = OUTPUT / 'pdf' / f'{digest}.pdf'
            with tempfile.TemporaryDirectory() as temp:
                prefix = str(Path(temp) / 'strana')
                subprocess.run(['pdftoppm', '-f', '1', '-l', '30', '-r', '150', '-png', str(pdf_path), prefix], check=True, timeout=120, stdout=subprocess.DEVNULL)
                pages = []
                for image in sorted(Path(temp).glob('strana-*.png')):
                    output = subprocess.run(['tesseract', str(image), 'stdout', '-l', 'ces+eng'], capture_output=True, text=True, check=True, timeout=60)
                    pages.append(output.stdout)
            text = '\n\n'.join(pages).strip()
            (OUTPUT / 'pdf' / f'{digest}.ocr.txt').write_text(text + '\n', encoding='utf-8')
            row['text_znaku'] = str(len(text))
            row['stav_stazeni'] = 'ocr_text' if len(text) >= 100 else 'nutne_rucne'
            print(row['source_id'], row['stav_stazeni'], len(text), flush=True)
        with target.open('w', newline='', encoding='utf-8') as output:
            writer = csv.DictWriter(output, fieldnames=fields, delimiter=';')
            writer.writeheader()
            writer.writerows(rows)
        return

    selection_file = OUTPUT / 'vyber.json'
    if args.stahnout and selection_file.exists():
        sample = json.loads(selection_file.read_text(encoding='utf-8'))
    else:
        sample = vyber()
        selection_file.write_text(json.dumps(sample, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if args.vyber:
        print(f"Vybráno {len(sample)} nabídek do {OUTPUT / 'vyber.json'}")
        return

    documents = OUTPUT / "pdf"
    documents.mkdir(exist_ok=True)
    if not shutil.which('pdftotext'):
        parser.error('Chybí pdftotext (balíček Poppler).')
    session = requests.Session()
    session.headers["User-Agent"] = "PrijimackyNaSkolu-kriteria-pilot/0.1 (+https://www.prijimackynaskolu.cz/)"
    old_target = OUTPUT / 'hodnoceni.csv'
    previous = {}
    if old_target.exists():
        with old_target.open(newline='', encoding='utf-8') as source:
            previous = {r['source_id']: r for r in csv.DictReader(source, delimiter=';')}
    rows = []
    beh_at = datetime.now(timezone.utc).isoformat(timespec='seconds')
    for i, item in enumerate(sample, 1):
        row = dict(item)
        row.update({"stav_stazeni": "", "file_id": "", "sha256": "", "text_znaku": 0,
                    "zdroj_url": f"{API}/skol-oboro-forma/{item['source_id']}",
                    "ziskano_at": "", "zkontrolovano_at": "", "publikovano_at": "", "overeno_at": "",
                    "zaver": "", "vahy_jpz": "", "dalsi_body": "", "minima": "",
                    "rovnost": "", "poznamka": ""})
        try:
            card = json_request(session, "GET", f"{API}/skol-oboro-forma/{item['source_id']}")
            if card["id"] != item["source_id"] or card["skolniRok"] != 2026 or card["kolo"] != 1:
                raise ValueError("Identita, ročník nebo kolo karty nesouhlasí")
            criteria = card.get("podminkyProPrijeti") or {}
            file_id = criteria.get("fileId")
            if not file_id:
                raise ValueError("Karta nemá PDF kritérií")
            row["file_id"] = file_id
            download = json_request(session, "POST", f"{API}/soubor/{file_id}", params={"skolniRok": 2026}, json={})
            pdf = stahni(session, download["file"]["downloadUrl"])
            digest = hashlib.sha256(pdf).hexdigest()
            row["sha256"] = digest
            before = previous.get(item['source_id'])
            if before and before.get('sha256') == digest:
                for field in ('ziskano_at', 'publikovano_at', 'overeno_at',
                              'zaver', 'vahy_jpz', 'dalsi_body', 'minima', 'rovnost', 'poznamka'):
                    row[field] = before.get(field, '')
            row['zkontrolovano_at'] = datetime.now(timezone.utc).isoformat(timespec='seconds')
            if not row['ziskano_at']:
                row['ziskano_at'] = row['zkontrolovano_at']
            pdf_path = documents / f"{digest}.pdf"
            if not pdf_path.exists():
                pdf_path.write_bytes(pdf)
            text_path = documents / f"{digest}.txt"
            if not text_path.exists():
                subprocess.run(["pdftotext", "-layout", str(pdf_path), str(text_path)], check=True, timeout=30)
            text = text_path.read_text(encoding="utf-8", errors="replace")
            row["text_znaku"] = len(text.strip())
            row["stav_stazeni"] = "text" if len(text.strip()) >= 100 else "nutne_ocr"
        except (requests.RequestException, ValueError, KeyError, subprocess.SubprocessError) as exc:
            row["stav_stazeni"] = f"chyba: {str(exc)[:160]}"
        rows.append(row)
        print(f"{i}/{len(sample)} {item['source_id']} {row['stav_stazeni']}", flush=True)
        # Veřejné rozhraní nemá ověřený limit; pilot jej záměrně nezatěžuje souběžně.
        time.sleep(0.25)

    target = OUTPUT / "hodnoceni.csv"
    with target.open("w", newline="", encoding="utf-8") as output:
        writer = csv.DictWriter(output, fieldnames=list(rows[0]), delimiter=";")
        writer.writeheader()
        writer.writerows(rows)
    with (OUTPUT / 'pozorovani.jsonl').open('a', encoding='utf-8') as journal:
        for row in rows:
            journal.write(json.dumps({k: row[k] for k in (
                'source_id', 'redizo', 'rok', 'kolo', 'zdroj_url', 'file_id', 'sha256',
                'stav_stazeni', 'ziskano_at', 'zkontrolovano_at',
            )} | {'beh_at': beh_at}, ensure_ascii=False) + '\n')
    print(f"Kontrolní list: {target}; závěry se vyplňují až po kontrole PDF.")


if __name__ == "__main__":
    main()
