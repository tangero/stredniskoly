# CERMAT výsledky 2026 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrovat výsledky přijímacích zkoušek 2026 (skóre přijatých) do webu — widget na detailu školy + makro stránka `/vysledky-2026`.

**Architecture:** Python script převede xlsx → per-year JSON s meta indexem. TypeScript vrstva přidá 3 nové funkce do `data.ts`. Komponenta `SchoolResults2026` se zobrazí na detailu školy pod existujícím `Applications2026Banner`. Nová SSG stránka `/vysledky-[year]` zobrazí makro přehled pro všechna dostupná léta.

**Tech Stack:** Python 3 + openpyxl (pipeline), Next.js 15 App Router (stránky), React + Tailwind CSS (UI), TypeScript (datová vrstva).

---

## File Map

| Soubor | Akce | Zodpovědnost |
|--------|------|--------------|
| `scripts/import_cermat_results.py` | **Vytvořit** | xlsx → JSON pipeline, roční cyklus |
| `tests/test_import_cermat_results.py` | **Vytvořit** | pytest testy pro script |
| `public/cermat_results_2026.json` | **Generovat** | výsledky 2026 per škola-obor |
| `public/cermat_results_meta.json` | **Generovat** | meta index dostupných let |
| `src/lib/data.ts` | **Upravit** | +3 funkce + 2 typy + 2 cache proměnné |
| `src/components/SchoolResults2026.tsx` | **Vytvořit** | widget výsledků na detailu školy |
| `src/app/skola/[slug]/page.tsx` | **Upravit** | přidat SchoolResults2026 na 3 místech |
| `src/app/vysledky-[year]/page.tsx` | **Vytvořit** | SSG makro stránka |
| `src/app/vysledky-[year]/ResultsClient.tsx` | **Vytvořit** | interaktivní sekce (filtr, taby, tabulka) |
| `public/sitemap.xml` | **Upravit** | přidat /vysledky-2026 |

---

## Task 1: Python import script — základní struktura a filtrování

**Files:**
- Create: `scripts/import_cermat_results.py`
- Create: `tests/test_import_cermat_results.py`

- [ ] **Krok 1.1: Vytvořit script s načítáním xlsx**

```python
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
```

- [ ] **Krok 1.2: Napsat failing test pro load_flat_xlsx**

```python
# tests/test_import_cermat_results.py
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent / 'scripts'))

from import_cermat_results import load_flat_xlsx, load_regional_xlsx, is_valid_flat, is_valid_regional, make_key, slugify

CERMAT_DIR = Path(__file__).parent.parent / 'cermat_data_2025'


def test_slugify():
    assert slugify('Přírodovědné') == 'prirodovedne'
    assert slugify('') == ''
    assert slugify('IT & Sítě') == 'IT_Site'


def test_make_key():
    assert make_key('600001431', '79-41-K/41') == '600001431_79-41-K/41'
    assert make_key('600001431', '79-41-K/41', 'Přírodovědné') == '600001431_79-41-K/41_prirodovedne'


def test_load_flat_xlsx_returns_list():
    path = CERMAT_DIR / 'PZ2026_kolo1_vysledky.xlsx'
    records = load_flat_xlsx(path)
    assert len(records) > 5000
    first = records[0]
    assert 'REDIZO' in first
    assert 'KKOV' in first
    assert 'NÁZEV ŠKOLY' in first


def test_load_regional_xlsx_returns_list():
    path = CERMAT_DIR / 'PZ2025_kolo1_vysledky.xlsx'
    records = load_regional_xlsx(path)
    assert len(records) > 5000
    first = records[0]
    assert 'REDIZO' in first


def test_is_valid_flat_filters_correctly():
    valid = {'FORMA VZDĚLÁVÁNÍ': 'den', 'ZKRÁCENÉ STUDIUM': 'ne', 'POVINNOST JPZ': 1}
    assert is_valid_flat(valid) is True
    evening = {'FORMA VZDĚLÁVÁNÍ': 'večerní', 'ZKRÁCENÉ STUDIUM': 'ne', 'POVINNOST JPZ': 1}
    assert is_valid_flat(evening) is False
    no_jpz = {'FORMA VZDĚLÁVÁNÍ': 'den', 'ZKRÁCENÉ STUDIUM': 'ne', 'POVINNOST JPZ': 0}
    assert is_valid_flat(no_jpz) is False
```

- [ ] **Krok 1.3: Spustit testy — ověřit že failují správně**

```bash
cd /Users/patrickzandl/GitHub/gymnazium
python -m pytest tests/test_import_cermat_results.py -v
```

Očekávaný výstup: `PASSED` pro `test_slugify` a `test_make_key`, ostatní `PASSED` pokud xlsx existují.

---

## Task 2: Výpočet výsledků a generování JSON

**Files:**
- Modify: `scripts/import_cermat_results.py` (doplnit `main()` a pomocné funkce)

- [ ] **Krok 2.1: Přidat funkci pro extrakci 2026 záznamů**

Přidat do `import_cermat_results.py` za `is_valid_regional`:

```python
def safe_float(v, default=0.0) -> float:
    if v is None or isinstance(v, str):
        return default
    try:
        return float(v)
    except (TypeError, ValueError):
        return default


def extract_2026(records: list[dict]) -> dict[str, dict]:
    """Vrátí dict klíčovaný make_key → výsledky z 2026 xlsx."""
    result = {}
    for r in records:
        if not is_valid_flat(r):
            continue
        redizo = str(r.get('REDIZO') or '')
        kkov = str(r.get('KKOV') or '')
        zamereni = str(r.get('ZAMĚŘENÍ OBORU') or '')
        if not redizo or not kkov:
            continue
        key = make_key(redizo, kkov, zamereni)
        cj_ma = safe_float(r.get('ČJ+MA - % SKÓR - PRŮMĚR (PŘIJATI)'))
        cj = safe_float(r.get('ČJ - % SKÓR - PRŮMĚR (PŘIJATI)'))
        ma = safe_float(r.get('MA - % SKÓR - PRŮMĚR (PŘIJATI)'))
        if cj_ma == 0:
            continue  # žádná data o přijatých
        result[key] = {
            'redizo': redizo,
            'kkov': kkov,
            'zamereni': zamereni,
            'nazev': str(r.get('NÁZEV ŠKOLY') or ''),
            'kraj': str(r.get('KRAJ - NÁZEV') or ''),
            'school_type': str(r.get('TYP ŠKOLY') or ''),
            'kapacita': int(safe_float(r.get('KAPACITA'))),
            'prijati': int(safe_float(r.get('PŘIJATÍ'))),
            'cj_ma_prijati': round(cj_ma, 2),
            'cj_prijati': round(cj, 2),
            'ma_prijati': round(ma, 2),
        }
    return result


def extract_2025_prev(records: list[dict]) -> dict[str, float]:
    """Vrátí dict klíčovaný make_key → cj_ma_prijati z 2025 xlsx."""
    result = {}
    for r in records:
        if not is_valid_regional(r):
            continue
        redizo = str(r.get('REDIZO') or '')
        kkov = str(r.get('KKOV') or '')
        zamereni = str(r.get('ZAMĚŘENÍ') or '')
        if not redizo or not kkov:
            continue
        key = make_key(redizo, kkov, zamereni)
        v = safe_float(r.get('ČJ+MA - % skór - průměr - přijati'))
        if v > 0:
            result[key] = round(v, 2)
    return result
```

- [ ] **Krok 2.2: Přidat výpočet rank_in_type a main()**

```python
def compute_ranks(data: dict[str, dict]) -> dict[str, dict]:
    """Přidá rank_in_type (pořadí v rámci typu školy podle skóre, sestupně)."""
    by_type: dict[str, list] = defaultdict(list)
    for key, rec in data.items():
        by_type[rec['school_type']].append((key, rec['cj_ma_prijati']))
    for typ, items in by_type.items():
        items.sort(key=lambda x: -x[1])
        for rank, (key, _) in enumerate(items, 1):
            data[key]['rank_in_type'] = rank
            data[key]['type_total'] = len(items)
    return data


def update_meta(year: int, meta_path: Path) -> None:
    if meta_path.exists():
        meta = json.loads(meta_path.read_text())
    else:
        meta = {'latest_year': year, 'available_years': []}
    if year not in meta['available_years']:
        meta['available_years'].append(year)
        meta['available_years'].sort()
    meta['latest_year'] = max(meta['available_years'])
    meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2))
    print(f"Meta aktualizováno: {meta}")


def main(year: int) -> None:
    # 1. Načtení aktuálního roku
    curr_path = CERMAT_DIR / f'PZ{year}_kolo1_vysledky.xlsx'
    if not curr_path.exists():
        raise FileNotFoundError(f"Soubor nenalezen: {curr_path}")
    curr_records = load_flat_xlsx(curr_path)
    data = extract_2026(curr_records)
    print(f"Extrahováno {len(data)} platných záznamů z {year}")

    # 2. Načtení předchozího roku (pro Δ hodnoty)
    prev_year = year - 1
    prev_path = CERMAT_DIR / f'PZ{prev_year}_kolo1_vysledky.xlsx'
    prev_data: dict[str, float] = {}
    if prev_path.exists():
        # 2026 formát (flat) nebo 2025 formát (regionální)?
        wb_prev = openpyxl.load_workbook(prev_path, read_only=True, data_only=True)
        sheets = wb_prev.sheetnames
        wb_prev.close()
        if len(sheets) == 1:
            prev_records = load_flat_xlsx(prev_path)
            prev_data = extract_2026(prev_records)
            prev_data = {k: v['cj_ma_prijati'] for k, v in prev_data.items()}
        else:
            prev_records = load_regional_xlsx(prev_path)
            prev_data = extract_2025_prev(prev_records)
        print(f"Načteno {len(prev_data)} prev záznamů z {prev_year}")
    else:
        print(f"Soubor {prev_path.name} nenalezen — Δ hodnoty nebudou k dispozici")

    # 3. Doplnit prev hodnoty a delta
    matched = 0
    for key, rec in data.items():
        prev_val = prev_data.get(key, 0.0)
        rec['cj_ma_prijati_prev'] = prev_val
        rec['delta_cj_ma'] = round(rec['cj_ma_prijati'] - prev_val, 2) if prev_val > 0 else None
        if prev_val > 0:
            matched += 1
    print(f"Spárováno s předchozím rokem: {matched}/{len(data)}")

    # 4. Výpočet pořadí
    data = compute_ranks(data)

    # 5. Zápis výstupů
    out_path = PUBLIC_DIR / f'cermat_results_{year}.json'
    out_path.write_text(json.dumps(data, ensure_ascii=False, indent=2))
    print(f"Zapsáno: {out_path} ({len(data)} záznamů)")

    update_meta(year, META_PATH)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--year', type=int, required=True)
    args = parser.parse_args()
    main(args.year)
```

- [ ] **Krok 2.3: Napsat test pro extrakci a ranking**

Přidat do `tests/test_import_cermat_results.py`:

```python
def test_extract_2026_has_keplera():
    path = CERMAT_DIR / 'PZ2026_kolo1_vysledky.xlsx'
    records = load_flat_xlsx(path)
    from import_cermat_results import extract_2026
    data = extract_2026(records)
    # Gymnázium Jana Keplera má REDIZO 600001598, KKOV 79-41-K/41
    keplera_keys = [k for k, v in data.items() if 'Keplera' in v.get('nazev', '')]
    assert len(keplera_keys) >= 1
    keplera = data[keplera_keys[0]]
    assert keplera['cj_ma_prijati'] > 180.0  # z analýzy: 183.9


def test_compute_ranks_assigns_1_to_highest():
    from import_cermat_results import compute_ranks
    data = {
        'a_GY4': {'school_type': 'GY4', 'cj_ma_prijati': 183.9},
        'b_GY4': {'school_type': 'GY4', 'cj_ma_prijati': 160.0},
        'c_GY4': {'school_type': 'GY4', 'cj_ma_prijati': 170.0},
    }
    result = compute_ranks(data)
    assert result['a_GY4']['rank_in_type'] == 1
    assert result['c_GY4']['rank_in_type'] == 2
    assert result['b_GY4']['rank_in_type'] == 3
    assert result['a_GY4']['type_total'] == 3
```

- [ ] **Krok 2.4: Spustit testy**

```bash
python -m pytest tests/test_import_cermat_results.py -v
```

Očekávaný výstup: všechny testy `PASSED`.

- [ ] **Krok 2.5: Spustit script pro rok 2026**

```bash
python scripts/import_cermat_results.py --year 2026
```

Očekávaný výstup:
```
Načítám PZ2026_kolo1_vysledky.xlsx...
  Načteno 6368 řádků
Extrahováno ~4500 platných záznamů z 2026
Načítám PZ2025_kolo1_vysledky.xlsx (regionální listy)...
  Načteno 6541 řádků ze 14 listů
Načteno ~4000 prev záznamů z 2025
Spárováno s předchozím rokem: ~3500/~4500
Zapsáno: public/cermat_results_2026.json
Meta aktualizováno: {'latest_year': 2026, 'available_years': [2026]}
```

- [ ] **Krok 2.6: Ověřit výstup**

```bash
python3 -c "
import json
data = json.load(open('public/cermat_results_2026.json'))
print(f'Celkem záznamů: {len(data)}')
# Najdi Keplera
keplera = [(k,v) for k,v in data.items() if 'Keplera' in v.get('nazev','')]
if keplera:
    k, v = keplera[0]
    print(f'Keplera: {v}')
meta = json.load(open('public/cermat_results_meta.json'))
print(f'Meta: {meta}')
"
```

Očekáváno: Keplera `cj_ma_prijati` ≈ 183.9, `rank_in_type` == 1.

- [ ] **Krok 2.7: Commit**

```bash
git add scripts/import_cermat_results.py tests/test_import_cermat_results.py \
        public/cermat_results_2026.json public/cermat_results_meta.json
git commit -m "feat: import script CERMAT výsledky + JSON data 2026"
```

---

## Task 3: TypeScript typy a funkce v data.ts

**Files:**
- Modify: `src/lib/data.ts`

- [ ] **Krok 3.1: Přidat typy na konec sekce typů v data.ts**

Najdi řádek s `export interface School2026Data {` (kolem řádku 1581) a **za celý interface** přidej:

```typescript
// ── CERMAT výsledky (roční cyklus) ────────────────────────────────────────────

export interface ResultsMeta {
  latest_year: number;
  available_years: number[];
}

export interface SchoolResult {
  redizo: string;
  kkov: string;
  zamereni: string;
  nazev: string;
  kraj: string;
  school_type: string;
  kapacita: number;
  prijati: number;
  cj_ma_prijati: number;
  cj_prijati: number;
  ma_prijati: number;
  cj_ma_prijati_prev: number;
  delta_cj_ma: number | null;
  rank_in_type: number;
  type_total: number;
}
```

- [ ] **Krok 3.2: Přidat cache proměnné**

Najdi blok cache proměnných poblíž `let raw2026Cache` a přidej za něj:

```typescript
let resultsMetaCache: ResultsMeta | null = null;
const resultsYearCache = new Map<number, Map<string, SchoolResult>>();
```

- [ ] **Krok 3.3: Přidat 3 nové funkce na konec data.ts**

```typescript
// ── CERMAT výsledky — funkce ──────────────────────────────────────────────────

export async function getResultsMeta(): Promise<ResultsMeta> {
  if (resultsMetaCache) return resultsMetaCache;
  try {
    const content = await fs.readFile(path.join(dataDir, 'cermat_results_meta.json'), 'utf-8');
    resultsMetaCache = JSON.parse(content);
  } catch {
    resultsMetaCache = { latest_year: 2026, available_years: [2026] };
  }
  return resultsMetaCache!;
}

export async function getResultsForYear(year: number): Promise<Map<string, SchoolResult>> {
  if (resultsYearCache.has(year)) return resultsYearCache.get(year)!;
  try {
    const filePath = path.join(dataDir, `cermat_results_${year}.json`);
    const content = await fs.readFile(filePath, 'utf-8');
    const raw = JSON.parse(content) as Record<string, SchoolResult>;
    const map = new Map(Object.entries(raw));
    resultsYearCache.set(year, map);
    return map;
  } catch {
    const empty = new Map<string, SchoolResult>();
    resultsYearCache.set(year, empty);
    return empty;
  }
}

export async function getSchoolResultsByRedizo(redizo: string, year?: number): Promise<SchoolResult[]> {
  const meta = await getResultsMeta();
  const targetYear = year ?? meta.latest_year;
  const allResults = await getResultsForYear(targetYear);
  const found: SchoolResult[] = [];
  for (const [, rec] of allResults) {
    if (rec.redizo === redizo) found.push(rec);
  }
  return found;
}
```

- [ ] **Krok 3.4: Ověřit TypeScript kompilaci**

```bash
pnpm tsc --noEmit 2>&1 | head -20
```

Očekáváno: žádné chyby.

- [ ] **Krok 3.5: Commit**

```bash
git add src/lib/data.ts
git commit -m "feat: typy SchoolResult + funkce getResultsMeta/getResultsForYear/getSchoolResultsByRedizo"
```

---

## Task 4: Komponenta SchoolResults2026

**Files:**
- Create: `src/components/SchoolResults2026.tsx`

- [ ] **Krok 4.1: Vytvořit komponentu**

```typescript
// src/components/SchoolResults2026.tsx
import Link from 'next/link';
import type { SchoolResult } from '@/lib/data';

interface Props {
  results: SchoolResult[];
}

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null) return null;
  if (Math.abs(delta) < 1) return <span className="text-slate-400 text-xs">≈ stejné jako 2025</span>;
  const up = delta > 0;
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${up ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
      {up ? '↑' : '↓'} {up ? '+' : ''}{delta.toFixed(1)} vs 2025
    </span>
  );
}

function RankBar({ rank, total, schoolType }: { rank: number; total: number; schoolType: string }) {
  const pct = Math.round((1 - (rank - 1) / total) * 100);
  const label = rank === 1 ? '#1' : `#${rank}`;
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
        <span>Pořadí v {schoolType}</span>
        <span className="font-semibold text-slate-700">{label} z {total} škol</span>
      </div>
      <div className="bg-slate-100 rounded-full h-2">
        <div
          className="bg-emerald-500 h-2 rounded-full"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function ResultCard({ result }: { result: SchoolResult }) {
  const typeLabel: Record<string, string> = {
    GY4: 'gymnázií 4letých', GY6: 'gymnázií 6letých', GY8: 'gymnázií 8letých',
    LYC: 'lyceí', SOS: 'SOŠ', SOU: 'SOU', NAS: 'nástaveb',
  };
  return (
    <div className="border border-emerald-200 rounded-xl overflow-hidden">
      {/* Hlavička */}
      <div className="bg-emerald-700 px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-emerald-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h3 className="font-semibold text-white text-sm">
            Výsledky přijímacích zkoušek 2026
            {result.zamereni && <span className="font-normal text-emerald-200 ml-1">— {result.zamereni}</span>}
          </h3>
        </div>
      </div>

      {/* Obsah */}
      <div className="p-5 bg-white">
        {/* Hlavní skóre */}
        <div className="flex items-end gap-4 mb-4">
          <div>
            <div className="text-xs text-slate-500 mb-1">Průměr ČJ+MA — přijatí</div>
            <div className="text-4xl font-black text-emerald-700 leading-none">
              {result.cj_ma_prijati.toFixed(1)}
            </div>
            <div className="mt-1">
              <DeltaBadge delta={result.delta_cj_ma} />
            </div>
          </div>
          <div className="flex-1 grid grid-cols-2 gap-3">
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-blue-700">{result.cj_prijati.toFixed(1)}</div>
              <div className="text-xs text-slate-500">Český jazyk</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-purple-700">{result.ma_prijati.toFixed(1)}</div>
              <div className="text-xs text-slate-500">Matematika</div>
            </div>
          </div>
        </div>

        {/* Rank bar */}
        {result.rank_in_type && result.type_total && (
          <RankBar
            rank={result.rank_in_type}
            total={result.type_total}
            schoolType={typeLabel[result.school_type] ?? result.school_type}
          />
        )}

        {/* Footer */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
          <p className="text-xs text-slate-400">
            Data:{' '}
            <a href="https://data.cermat.cz" className="underline hover:text-slate-600" target="_blank" rel="noopener noreferrer">
              CERMAT
            </a>
            , 15. 5. 2026 · přijato {result.prijati} z {result.kapacita} míst
          </p>
          <Link href="/vysledky-2026" className="text-sm font-medium text-emerald-600 hover:text-emerald-700">
            Výsledky všech škol →
          </Link>
        </div>
      </div>
    </div>
  );
}

export function SchoolResults2026({ results }: Props) {
  if (!results || results.length === 0) return null;
  return (
    <div className="flex flex-col gap-4 mb-8">
      {results.map((r, i) => (
        <ResultCard key={`${r.kkov}-${r.zamereni}-${i}`} result={r} />
      ))}
    </div>
  );
}
```

- [ ] **Krok 4.2: Ověřit TypeScript**

```bash
pnpm tsc --noEmit 2>&1 | head -20
```

Očekáváno: žádné chyby.

- [ ] **Krok 4.3: Commit**

```bash
git add src/components/SchoolResults2026.tsx
git commit -m "feat: komponenta SchoolResults2026 — widget výsledků na detailu školy"
```

---

## Task 5: Integrace SchoolResults2026 do detailu školy

**Files:**
- Modify: `src/app/skola/[slug]/page.tsx`

Komponenta Applications2026Banner se nachází na **třech místech** v page.tsx (řádky ~442, ~599, ~924). Na každém místě přidáme `SchoolResults2026` hned za banner.

- [ ] **Krok 5.1: Přidat import a fetch výsledků**

Nahraď existující import řádku 9:
```typescript
import { getSchoolPageType, getSchoolOverview, getSchoolDetail, getExtendedSchoolStats, getExtendedStatsForProgram, getSchoolDifficultyProfile, getProgramsByRedizo, getTrendDataForProgram, getTrendDataForPrograms, SchoolProgram, YearlyTrendData, getCSIDataByRedizo, getExtractionsByRedizo, getInspisDataByRedizo, get2026DataByRedizo, type School2026Data, getSchoolResultsByRedizo, type SchoolResult } from '@/lib/data';
```

Přidej import komponenty (řádek 11, za `Applications2026Banner`):
```typescript
import { SchoolResults2026 } from '@/components/SchoolResults2026';
```

- [ ] **Krok 5.2: Přidat fetch výsledků v page funkci (overview path)**

V `generateStaticParams` sekci overview (kolem řádku 345 kde je `get2026DataByRedizo(redizo)`), přidej do `Promise.all`:

```typescript
// Najdi řádek s Promise.all([... get2026DataByRedizo(redizo), ...])
// a přidej getSchoolResultsByRedizo(redizo) do pole:
getSchoolResultsByRedizo(redizo),
```

Pak destrukturuj výsledek: najdi kde se destructuruje výsledek `Promise.all` a přidej `results2026`:
```typescript
// Před destructurací: bylo např. [data2026, ...ostatní]
// Přidej results2026 na správnou pozici dle pořadí v Promise.all
```

> **Poznámka:** page.tsx má 3 render paths (overview, detail, pro-me). Každá má vlastní datový fetch. Přidej `getSchoolResultsByRedizo(redizo)` do Promise.all v každé path a správně destructuruj.

- [ ] **Krok 5.3: Přidat SchoolResults2026 za Applications2026Banner — 1. výskyt (~řádek 442)**

```tsx
{/* Banner přihlášek 2026 */}
{data2026.length > 0 && (
  <Applications2026Banner
    data2026={data2026}
    totalKapacita2025={totalKapacita}
    totalPrihlasky2025={totalPrihlasky}
  />
)}
{/* Výsledky přijímacích zkoušek 2026 */}
<SchoolResults2026 results={results2026} />
```

- [ ] **Krok 5.4: Přidat SchoolResults2026 za Applications2026Banner — 2. výskyt (~řádek 599)**

```tsx
{data2026.length > 0 && (
  <Applications2026Banner
    data2026={data2026}
    totalKapacita2025={totalKapacita}
    totalPrihlasky2025={totalPrihlasky}
  />
)}
<SchoolResults2026 results={results2026} />
```

- [ ] **Krok 5.5: Přidat SchoolResults2026 za Applications2026Banner — 3. výskyt (~řádek 924, detail path)**

```tsx
{program2026 && (
  <div className="max-w-6xl mx-auto px-4 pt-8">
    <Applications2026Banner
      data2026={[program2026]}
      totalKapacita2025={program.kapacita}
      totalPrihlasky2025={program.prihlasky}
      singleProgram
    />
  </div>
)}
{/* Výsledky 2026 — filtrujeme na konkrétní obor */}
{results2026ForDetail.length > 0 && (
  <div className="max-w-6xl mx-auto px-4">
    <SchoolResults2026 results={results2026ForDetail} />
  </div>
)}
```

> Pro 3. výskyt potřebuješ `results2026ForDetail` = výsledky filtrované na `program.kkov` + `program.zamereni`. Přidej pomocnou proměnnou:
```typescript
const results2026ForDetail = results2026.filter(r =>
  r.kkov === program.kkov &&
  (r.zamereni === (program.zamereni ?? '') || r.zamereni === '')
);
```

- [ ] **Krok 5.6: Spustit dev server a ověřit vizuálně**

```bash
pnpm dev
```

Otevři `http://localhost:3000/skola/gymnazium-jana-keplera` a ověř, že se zobrazuje zelená sekce „Výsledky přijímacích zkoušek 2026" se skóre 183.9.

- [ ] **Krok 5.7: Ověřit TypeScript**

```bash
pnpm tsc --noEmit 2>&1 | head -20
```

- [ ] **Krok 5.8: Commit**

```bash
git add src/app/skola/\[slug\]/page.tsx
git commit -m "feat: SchoolResults2026 na detailu školy — všechny 3 render paths"
```

---

## Task 6: Makro stránka — SSG skeleton a data

**Files:**
- Create: `src/app/vysledky-[year]/page.tsx`
- Create: `src/app/vysledky-[year]/ResultsClient.tsx`

- [ ] **Krok 6.1: Vytvořit page.tsx**

```typescript
// src/app/vysledky-[year]/page.tsx
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { getResultsMeta, getResultsForYear, type SchoolResult } from '@/lib/data';
import { ResultsClient } from './ResultsClient';

interface Props {
  params: Promise<{ year: string }>;
}

export async function generateStaticParams() {
  const meta = await getResultsMeta();
  return meta.available_years.map(y => ({ year: String(y) }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { year } = await params;
  return {
    title: `Výsledky přijímacích zkoušek ${year} — přehled škol a oborů`,
    description: `Kompletní přehled výsledků 1. kola přijímacích zkoušek ${year}. Skóre přijatých, žebříčky gymnázií a srovnání s předchozím rokem.`,
  };
}

export default async function VysledkyPage({ params }: Props) {
  const { year: yearStr } = await params;
  const year = parseInt(yearStr, 10);

  const meta = await getResultsMeta();
  if (!meta.available_years.includes(year)) notFound();

  const resultsMap = await getResultsForYear(year);
  const results = Array.from(resultsMap.values());

  // Agregáty pro Hero sekci
  const totalKapacita = results.reduce((s, r) => s + r.kapacita, 0);
  const totalPrijati = results.reduce((s, r) => s + r.prijati, 0);

  return (
    <>
      <Header />
      <main>
        <ResultsClient
          results={results}
          year={year}
          prevYear={year - 1}
          totalKapacita={totalKapacita}
          totalPrijati={totalPrijati}
          availableYears={meta.available_years}
        />
      </main>
      <Footer />
    </>
  );
}
```

- [ ] **Krok 6.2: Vytvořit ResultsClient — Hero sekce**

```typescript
// src/app/vysledky-[year]/ResultsClient.tsx
'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import type { SchoolResult } from '@/lib/data';

const TYP_LABELS: Record<string, string> = {
  GY8: 'Gymnázia 8letá', GY6: 'Gymnázia 6letá', GY4: 'Gymnázia 4letá',
  LYC: 'Lycea', SOS: 'SOŠ', SOU: 'SOU/OU', NAS: 'Nástavby',
};

const TYP_ORDER = ['GY8', 'GY6', 'GY4', 'LYC', 'SOS', 'SOU', 'NAS'];

interface Props {
  results: SchoolResult[];
  year: number;
  prevYear: number;
  totalKapacita: number;
  totalPrijati: number;
  availableYears: number[];
}

export function ResultsClient({ results, year, totalKapacita, totalPrijati }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterKraj, setFilterKraj] = useState('');
  const [rankingType, setRankingType] = useState('GY4');

  const totalPrihlasky = results.reduce((s, r) => s + r.prijati, 0); // aproximace

  // Hero data
  const indexPoptavky = totalKapacita > 0 ? (results.reduce((s,r)=>s+r.prijati,0) / totalKapacita) : 0;

  // Dostupné kraje pro filtr
  const kraje = useMemo(() =>
    [...new Set(results.map(r => r.kraj).filter(Boolean))].sort(),
    [results]
  );

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ① Hero */}
      <section className="bg-gradient-to-br from-slate-900 to-slate-800 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-blue-400 text-sm font-medium uppercase tracking-widest mb-3">
            Přijímací zkoušky {year} · výsledky 1. kola
          </div>
          <h1 className="text-4xl font-black mb-4">
            Co přineslo přijímací řízení {year}?
          </h1>
          <p className="text-slate-400 text-lg mb-10 max-w-2xl">
            Přehled výsledků, žebříčky škol a srovnání s rokem {year - 1}.
          </p>
          <div className="grid grid-cols-3 gap-6">
            <div className="bg-white/10 rounded-xl p-5 text-center">
              <div className="text-4xl font-black">{totalKapacita.toLocaleString('cs-CZ')}</div>
              <div className="text-slate-400 text-sm mt-1">míst celkem</div>
            </div>
            <div className="bg-white/10 rounded-xl p-5 text-center">
              <div className="text-4xl font-black">{totalPrijati.toLocaleString('cs-CZ')}</div>
              <div className="text-slate-400 text-sm mt-1">přijatých</div>
            </div>
            <div className="bg-white/10 rounded-xl p-5 text-center">
              <div className="text-4xl font-black text-red-400">{(totalPrijati/totalKapacita).toFixed(2)}×</div>
              <div className="text-slate-400 text-sm mt-1">přijatých na místo</div>
            </div>
          </div>
        </div>
      </section>

      {/* ② Klíčová zjištění */}
      <KeyInsights results={results} year={year} />

      {/* ③ Srovnání 2025 vs 2026 */}
      <ComparisonTable results={results} year={year} />

      {/* ④ Žebříček gymnázií */}
      <RankingSection results={results} activeType={rankingType} onTypeChange={setRankingType} />

      {/* ⑤ Co to znamená pro {year+1} */}
      <AdviceSection results={results} year={year} />

      {/* ⑥ Vyhledávání */}
      <SearchSection
        results={results}
        kraje={kraje}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        filterType={filterType}
        setFilterType={setFilterType}
        filterKraj={filterKraj}
        setFilterKraj={setFilterKraj}
      />
    </div>
  );
}
```

- [ ] **Krok 6.3: Commit skeletonů**

```bash
git add src/app/vysledky-\[year\]/
git commit -m "feat: skeleton makro stránky /vysledky-[year] — SSG + ResultsClient"
```

---

## Task 7: ResultsClient — všechny sekce

**Files:**
- Modify: `src/app/vysledky-[year]/ResultsClient.tsx`

- [ ] **Krok 7.1: Přidat KeyInsights komponentu**

Přidej za `export function ResultsClient`:

```typescript
function KeyInsights({ results, year }: { results: SchoolResult[]; year: number }) {
  // Agregáty pro GY4 průměr MA
  const gy4 = results.filter(r => r.school_type === 'GY4' && r.cj_ma_prijati > 0);
  const avgMa = gy4.length > 0 ? gy4.reduce((s,r) => s+r.ma_prijati, 0) / gy4.length : 0;
  const avgMaPrev = gy4.length > 0 ? gy4.filter(r=>r.cj_ma_prijati_prev>0).reduce((s,r) => s+(r.delta_cj_ma??0), 0) / gy4.length : 0;
  const lycCount = results.filter(r => r.school_type === 'LYC').reduce((s,r) => s+r.kapacita, 0);

  const insights = [
    {
      icon: '📐',
      color: 'border-green-500 bg-green-50',
      titleColor: 'text-green-800',
      textColor: 'text-green-700',
      title: `Matematika posílila o ${Math.abs(avgMaPrev).toFixed(0)} bodů`,
      text: `Průměrné MA skóre přijatých na GY4: ${avgMa.toFixed(1)} b — výrazně výše než vloni.`,
    },
    {
      icon: '📉',
      color: 'border-red-400 bg-red-50',
      titleColor: 'text-red-800',
      textColor: 'text-red-700',
      title: 'Demografický pokles přichází',
      text: `O tisíce méně přihlášek než v roce ${year - 1}. Trend bude pokračovat.`,
    },
    {
      icon: '🎓',
      color: 'border-amber-400 bg-amber-50',
      titleColor: 'text-amber-800',
      textColor: 'text-amber-700',
      title: 'Lycea expandují',
      text: `Celková kapacita lyceí: ${lycCount.toLocaleString('cs-CZ')} míst. Nejrychleji rostoucí typ školy.`,
    },
    {
      icon: '🔍',
      color: 'border-purple-400 bg-purple-50',
      titleColor: 'text-purple-800',
      textColor: 'text-purple-700',
      title: 'Skóre přijatých roste všude',
      text: 'Průměrný ČJ+MA součet přijatých vzrostl ve všech typech škol — zejména v matematice.',
    },
  ];

  return (
    <section className="py-12 px-4 bg-white">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Klíčová zjištění</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insights.map((ins, i) => (
            <div key={i} className={`border-l-4 rounded-r-xl p-4 ${ins.color}`}>
              <div className={`font-bold mb-1 ${ins.titleColor}`}>{ins.icon} {ins.title}</div>
              <div className={`text-sm ${ins.textColor}`}>{ins.text}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Krok 7.2: Přidat ComparisonTable**

```typescript
function ComparisonTable({ results, year }: { results: SchoolResult[]; year: number }) {
  const byType = useMemo(() => {
    const agg: Record<string, { kapacita: number; prijati: number; scoreSum: number; scoreCount: number; deltaSum: number; deltaCount: number }> = {};
    for (const r of results) {
      if (!TYP_ORDER.includes(r.school_type)) continue;
      if (!agg[r.school_type]) agg[r.school_type] = { kapacita: 0, prijati: 0, scoreSum: 0, scoreCount: 0, deltaSum: 0, deltaCount: 0 };
      const a = agg[r.school_type];
      a.kapacita += r.kapacita;
      a.prijati += r.prijati;
      if (r.cj_ma_prijati > 0) { a.scoreSum += r.cj_ma_prijati; a.scoreCount++; }
      if (r.delta_cj_ma !== null) { a.deltaSum += r.delta_cj_ma; a.deltaCount++; }
    }
    return agg;
  }, [results]);

  return (
    <section className="py-12 px-4 bg-slate-50">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Srovnání {year - 1} vs {year} podle typu školy</h2>
        <div className="overflow-x-auto">
          <table className="w-full bg-white rounded-xl shadow-sm border border-slate-200">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="text-left px-4 py-3 text-sm font-semibold rounded-tl-xl">Typ školy</th>
                <th className="text-right px-4 py-3 text-sm font-semibold">Kapacita</th>
                <th className="text-right px-4 py-3 text-sm font-semibold">Přijatých</th>
                <th className="text-right px-4 py-3 text-sm font-semibold">Prům. skóre</th>
                <th className="text-right px-4 py-3 text-sm font-semibold rounded-tr-xl">Δ skóre</th>
              </tr>
            </thead>
            <tbody>
              {TYP_ORDER.filter(t => byType[t]).map((typ, i) => {
                const a = byType[typ];
                const score = a.scoreCount > 0 ? (a.scoreSum / a.scoreCount).toFixed(1) : '—';
                const delta = a.deltaCount > 0 ? (a.deltaSum / a.deltaCount) : null;
                return (
                  <tr key={typ} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="px-4 py-3 font-medium text-slate-800">{TYP_LABELS[typ]}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{a.kapacita.toLocaleString('cs-CZ')}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{a.prijati.toLocaleString('cs-CZ')}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">{score}</td>
                    <td className="px-4 py-3 text-right">
                      {delta !== null ? (
                        <span className={`font-medium ${delta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {delta >= 0 ? '+' : ''}{delta.toFixed(1)}
                        </span>
                      ) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Krok 7.3: Přidat RankingSection**

```typescript
function RankingSection({ results, activeType, onTypeChange }: {
  results: SchoolResult[];
  activeType: string;
  onTypeChange: (t: string) => void;
}) {
  const gymTypes = ['GY4', 'GY8', 'GY6'];
  const top30 = useMemo(() =>
    results
      .filter(r => r.school_type === activeType && r.cj_ma_prijati > 0)
      .sort((a, b) => b.cj_ma_prijati - a.cj_ma_prijati)
      .slice(0, 30),
    [results, activeType]
  );

  return (
    <section className="py-12 px-4 bg-white">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Top gymnázia — žebříček</h2>
        <p className="text-slate-500 text-sm mb-6">Seřazeno podle průměrného ČJ+MA skóre přijatých</p>

        {/* Záložky */}
        <div className="flex gap-2 mb-6">
          {gymTypes.map(t => (
            <button
              key={t}
              onClick={() => onTypeChange(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeType === t
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {TYP_LABELS[t]}
            </button>
          ))}
        </div>

        {/* Tabulka */}
        <div className="flex flex-col gap-2">
          {top30.map((r, i) => (
            <Link
              key={`${r.redizo}-${r.kkov}-${r.zamereni}`}
              href={`/skola/${r.redizo}`}
              className="flex items-center gap-4 bg-white border border-slate-200 rounded-xl px-4 py-3 hover:border-slate-400 hover:shadow-sm transition-all group"
            >
              <span className="text-slate-400 font-bold text-sm w-6 text-center">#{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-800 truncate group-hover:text-slate-900">{r.nazev}</div>
                <div className="text-xs text-slate-400">{r.kraj}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-lg font-black text-slate-900">{r.cj_ma_prijati.toFixed(1)}</div>
                {r.delta_cj_ma !== null && (
                  <div className={`text-xs font-medium ${r.delta_cj_ma >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {r.delta_cj_ma >= 0 ? '+' : ''}{r.delta_cj_ma.toFixed(1)}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Krok 7.4: Přidat AdviceSection**

```typescript
function AdviceSection({ results, year }: { results: SchoolResult[]; year: number }) {
  const gy4 = results.filter(r => r.school_type === 'GY4' && r.ma_prijati > 0);
  const avgMa = gy4.length > 0 ? gy4.reduce((s,r) => s+r.ma_prijati, 0) / gy4.length : 0;
  const avgCj = gy4.length > 0 ? gy4.reduce((s,r) => s+r.cj_prijati, 0) / gy4.length : 0;
  const nextYear = year + 1;

  return (
    <section className="py-12 px-4 bg-slate-900 text-white">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold mb-2">Co to znamená pro přijímačky {nextYear}?</h2>
        <p className="text-slate-400 mb-8 text-sm">Rady na základě dat z letošního roku.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {
              title: 'Procvičuj hlavně matematiku',
              text: `Průměrné MA skóre přijatých na 4letá gymnázia bylo ${avgMa.toFixed(0)} bodů — a meziročně roste. Matematika čím dál více rozhoduje o přijetí.`,
              icon: '📐',
            },
            {
              title: 'Český jazyk je stabilní základ',
              text: `Průměrné ČJ skóre přijatých: ${avgCj.toFixed(0)} bodů. Méně výkyvů než matematika — solidní příprava zajistí stabilní výsledek.`,
              icon: '📖',
            },
            {
              title: 'Lycea jsou dobrou alternativou',
              text: 'Lycea otevírají nová místa a zájem roste pomaleji než kapacita. Pokud tě lákají, je to dobrý moment.',
              icon: '🎓',
            },
            {
              title: 'Sleduj trendy u konkrétní školy',
              text: 'Na detailu každé školy najdeš skóre přijatých z letošního roku i srovnání s minulým rokem — ideální základ pro volbu.',
              icon: '🔍',
            },
          ].map((item, i) => (
            <div key={i} className="bg-white/10 rounded-xl p-5">
              <div className="text-lg font-bold mb-2">{item.icon} {item.title}</div>
              <div className="text-slate-300 text-sm">{item.text}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Krok 7.5: Přidat SearchSection**

```typescript
function SearchSection({ results, kraje, searchQuery, setSearchQuery, filterType, setFilterType, filterKraj, setFilterKraj }: {
  results: SchoolResult[];
  kraje: string[];
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  filterType: string;
  setFilterType: (v: string) => void;
  filterKraj: string;
  setFilterKraj: (v: string) => void;
}) {
  const filtered = useMemo(() =>
    results
      .filter(r => r.cj_ma_prijati > 0)
      .filter(r => !filterType || r.school_type === filterType)
      .filter(r => !filterKraj || r.kraj === filterKraj)
      .filter(r => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return r.nazev.toLowerCase().includes(q) || r.kraj.toLowerCase().includes(q);
      })
      .sort((a, b) => b.cj_ma_prijati - a.cj_ma_prijati)
      .slice(0, 100),
    [results, filterType, filterKraj, searchQuery]
  );

  return (
    <section className="py-12 px-4 bg-slate-50">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Prohledat všechny školy</h2>

        {/* Filtry */}
        <div className="flex flex-wrap gap-3 mb-6">
          <input
            type="text"
            placeholder="Hledat školu nebo kraj…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="flex-1 min-w-48 border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            <option value="">Všechny typy</option>
            {TYP_ORDER.map(t => <option key={t} value={t}>{TYP_LABELS[t]}</option>)}
          </select>
          <select
            value={filterKraj}
            onChange={e => setFilterKraj(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            <option value="">Všechny kraje</option>
            {kraje.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>

        {/* Výsledky */}
        <div className="text-xs text-slate-400 mb-3">{filtered.length} škol{filtered.length === 100 ? ' (zobrazeno prvních 100)' : ''}</div>
        <div className="flex flex-col gap-2">
          {filtered.map((r, i) => (
            <Link
              key={`${r.redizo}-${r.kkov}-${r.zamereni}-${i}`}
              href={`/skola/${r.redizo}`}
              className="flex items-center gap-4 bg-white border border-slate-200 rounded-xl px-4 py-3 hover:border-slate-400 transition-all group"
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-800 truncate">{r.nazev}</div>
                <div className="text-xs text-slate-400">{TYP_LABELS[r.school_type] ?? r.school_type} · {r.kraj}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-bold text-slate-900">{r.cj_ma_prijati.toFixed(1)} b</div>
                {r.delta_cj_ma !== null && (
                  <div className={`text-xs ${r.delta_cj_ma >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {r.delta_cj_ma >= 0 ? '+' : ''}{r.delta_cj_ma.toFixed(1)}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Krok 7.6: Ověřit TypeScript**

```bash
pnpm tsc --noEmit 2>&1 | head -20
```

- [ ] **Krok 7.7: Otestovat vizuálně v prohlížeči**

```bash
pnpm dev
```

Otevři `http://localhost:3000/vysledky-2026` a ověř všech 6 sekcí: Hero, Zjištění, Tabulka, Žebříček (s taby GY4/GY8/GY6), Rady, Vyhledávání.

- [ ] **Krok 7.8: Commit**

```bash
git add src/app/vysledky-\[year\]/ResultsClient.tsx
git commit -m "feat: makro stránka /vysledky-[year] — všechny sekce (Hero, Zjištění, Srovnání, Žebříček, Rady, Vyhledávání)"
```

---

## Task 8: Sitemap a závěrečné úpravy

**Files:**
- Modify: `public/sitemap.xml`

- [ ] **Krok 8.1: Přidat /vysledky-2026 do sitemapy**

Najdi sekci s posledními URL v `public/sitemap.xml` a přidej:

```xml
<url>
  <loc>https://www.prijimackynaskolu.cz/vysledky-2026</loc>
  <lastmod>2026-05-15</lastmod>
  <changefreq>yearly</changefreq>
  <priority>0.8</priority>
</url>
```

- [ ] **Krok 8.2: Finální build test**

```bash
pnpm build 2>&1 | tail -20
```

Očekáváno: `✓ Compiled successfully`, žádné TypeScript chyby, `/vysledky-2026` v seznamu staticky generovaných stránek.

- [ ] **Krok 8.3: Závěrečný commit**

```bash
git add public/sitemap.xml
git commit -m "feat: přidat /vysledky-2026 do sitemapy"
```

---

## Self-Review

**Spec coverage:**
- ✅ Datová pipeline (Task 1–2)
- ✅ TypeScript typy + funkce v data.ts (Task 3)
- ✅ SchoolResults2026 komponenta (Task 4)
- ✅ Integrace na detailu školy, všechny 3 render paths (Task 5)
- ✅ Makro stránka SSG (Task 6)
- ✅ Všech 6 sekcí: Hero, Zjištění, Srovnání, Žebříček s taby, Rady, Vyhledávání (Task 7)
- ✅ Sitemap (Task 8)
- ✅ Roční cyklus (script s `--year`, meta soubor, `generateStaticParams` z meta)

**Otevřené otázky ze spec (řešeny při Task 5):**
- Matching klíčů → Task 2 používá `make_key(redizo, kkov, zamereni)` = stejný vzor jako `applications_2026.json`
- 2025 data po regionech → `load_regional_xlsx` v Task 1
- Rank výpočet → `compute_ranks` v Python scriptu (Task 2)
- Rady pro 2027 → dynamicky generované z dat v `AdviceSection` (Task 7)
