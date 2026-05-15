#!/usr/bin/env python3
"""
Import výsledků přijímacích zkoušek z CERMAT XLSX.

Použití:
    python scripts/import_cermat_results.py --year 2026

Vstup:  cermat_data_2025/PZ{YEAR}_kolo1_vysledky.xlsx
        cermat_data_2025/PZ{YEAR-1}_kolo1_vysledky.xlsx  (pro Δ hodnoty)
Výstup: public/cermat_results_{YEAR}.json
        public/cermat_results_meta.json
"""
import argparse
import json
import re
import unicodedata
from pathlib import Path
from collections import defaultdict

import openpyxl

BASE_DIR = Path(__file__).parent.parent
CERMAT_DIR = BASE_DIR / 'cermat_data_2025'
PUBLIC_DIR = BASE_DIR / 'public'
META_PATH = PUBLIC_DIR / 'cermat_results_meta.json'


def slugify(text: str) -> str:
    if not text:
        return ''
    text = unicodedata.normalize('NFKD', str(text))
    text = text.encode('ascii', 'ignore').decode('ascii')
    text = re.sub(r'[^a-zA-Z0-9]+', '_', text)
    return text.strip('_').lower()


def make_key(redizo, kkov, zamereni=''):
    base = f"{redizo}_{kkov}"
    z = slugify(zamereni)
    return f"{base}_{z}" if z else base


def load_flat_xlsx(path: Path) -> list[dict]:
    """Načte flat xlsx (2026 formát) — 1 list, hlavičky na řádku 1."""
    print(f"Načítám {path.name}...")
    wb = openpyxl.load_workbook(path, read_only=True)
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    headers = [str(h) if h else '' for h in rows[0]]
    records = []
    for row in rows[1:]:
        if row[0] is None:
            continue
        records.append(dict(zip(headers, row)))
    print(f"  Načteno {len(records)} řádků")
    return records


def load_regional_xlsx(path: Path) -> list[dict]:
    """Načte xlsx s regionálními listy (2025 formát) — hlavičky na řádku 2."""
    SHEETS = [
        'CZ010-PHA', 'CZ020-SCK', 'CZ031-JCK', 'CZ032-PLK', 'CZ041-KVK',
        'CZ042-USK', 'CZ051-LBK', 'CZ052-KHK', 'CZ053-PAK', 'CZ063-VYS',
        'CZ064-JMK', 'CZ071-OLK', 'CZ072-ZLK', 'CZ080-MSK'
    ]
    print(f"Načítám {path.name} (regionální listy)...")
    wb = openpyxl.load_workbook(path, read_only=True)
    records = []
    for sn in SHEETS:
        if sn not in wb.sheetnames:
            continue
        ws = wb[sn]
        headers = None
        for i, row in enumerate(ws.iter_rows(values_only=True)):
            if i == 1:
                headers = [str(h) if h else '' for h in row]
            elif i >= 2 and headers and row[0] is not None:
                records.append(dict(zip(headers, row)))
    print(f"  Načteno {len(records)} řádků ze {len(SHEETS)} listů")
    return records


def is_valid_flat(r: dict) -> bool:
    """Filtr pro 2026 (flat) záznamy: denní, nezkrácené, s JPZ."""
    forma = str(r.get('FORMA VZDĚLÁVÁNÍ') or '').lower()
    zkracene = str(r.get('ZKRÁCENÉ STUDIUM') or '').lower()
    jpz = r.get('POVINNOST JPZ')
    return 'den' in forma and zkracene == 'ne' and jpz == 1


def is_valid_regional(r: dict) -> bool:
    """Filtr pro 2025 (regional) záznamy: denní, nezkrácené."""
    forma = str(r.get('FORMA') or '').lower()
    zkracene = str(r.get('ZKRÁCENÉ STUDIUM') or '').lower()
    return 'den' in forma and zkracene in ('', 'ne', 'false', '0')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--year', type=int, required=True)
    args = parser.parse_args()
    print(f"Rok: {args.year}")
