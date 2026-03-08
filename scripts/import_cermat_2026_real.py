#!/usr/bin/env python3
"""
Import skutečných dat přihlášek 2026 z CERMAT XLSX.

Aktualizuje:
1. public/applications_2026.json - nahradí odhady skutečnými čísly
2. public/school_analysis.json - přidá pole *_2026 ke stávajícím záznamům + nové obory
3. public/schools_data.json - přidá nové obory do klíče '2025' (pro API JOIN)

Vstup: data/PZ2026_kolo1_skolobory_prihlasky.xlsx
"""

import json
import re
import unicodedata
from pathlib import Path
from collections import defaultdict

import openpyxl

BASE_DIR = Path(__file__).parent.parent
XLSX_PATH = BASE_DIR / 'data' / 'PZ2026_kolo1_skolobory_prihlasky.xlsx'
XLSX_KAP_PATH = BASE_DIR / 'data' / 'PZ2026_kolo1_skolobory_kapacity.xlsx'
APP_2026_PATH = BASE_DIR / 'public' / 'applications_2026.json'
SCHOOL_ANALYSIS_PATH = BASE_DIR / 'public' / 'school_analysis.json'
SCHOOLS_DATA_PATH = BASE_DIR / 'public' / 'schools_data.json'


def slugify(text: str) -> str:
    """Převede text na slug (pro ID zaměření)."""
    if not text:
        return ''
    # Normalize unicode
    text = unicodedata.normalize('NFKD', text)
    text = text.encode('ascii', 'ignore').decode('ascii')
    # Replace non-alphanumeric with underscore
    text = re.sub(r'[^a-zA-Z0-9]+', '_', text)
    text = text.strip('_')
    return text


def load_cermat_xlsx():
    """Načte CERMAT XLSX a vrátí filtrované záznamy (denní, nezkrácené)."""
    print(f"Načítám {XLSX_PATH}...")
    wb = openpyxl.load_workbook(XLSX_PATH, read_only=True)
    ws = wb[wb.sheetnames[0]]
    rows = list(ws.iter_rows(values_only=True))
    header = rows[0]
    print(f"  Celkem řádků: {len(rows) - 1}")

    # Filtr: denní forma, nezkrácené studium
    records = []
    for r in rows[1:]:
        forma = r[27]  # FORMA VZDĚLÁVÁNÍ
        zkracene = r[29]  # ZKRÁCENÉ STUDIUM
        if forma == 'den' and zkracene == 'ne':
            records.append({
                'redizo': str(r[5]),
                'nazev': str(r[6]) if r[6] else '',
                'ulice': str(r[7]) if r[7] else '',
                'obec': str(r[8]) if r[8] else '',
                'psc': str(r[9]) if r[9] else '',
                'kraj_kod': str(r[10]) if r[10] else '',
                'kraj': str(r[11]) if r[11] else '',
                'okres_kod': str(r[12]) if r[12] else '',
                'okres': str(r[13]) if r[13] else '',
                'orp_kod': str(r[14]) if r[14] else '',
                'orp': str(r[15]) if r[15] else '',
                'zrizovatel_kod': str(r[16]) if r[16] else '',
                'zrizovatel': str(r[17]) if r[17] else '',
                'typ': str(r[21]) if r[21] else '',
                'kkov': str(r[24]) if r[24] else '',
                'obor': str(r[25]) if r[25] else '',
                'zamereni': str(r[26]) if r[26] else '',
                'delka_studia': int(r[28]) if r[28] else 4,
                'kapacita': int(r[31]) if r[31] else 0,
                'index_poptavky': float(r[32]) if r[32] else 0,
                'prihlasky': int(r[33]) if r[33] else 0,
                'p1': int(r[34]) if r[34] else 0,
                'p2': int(r[35]) if r[35] else 0,
                'p3': int(r[36]) if r[36] else 0,
                'p4': int(r[37]) if r[37] else 0,
                'p5': int(r[38]) if r[38] else 0,
            })

    print(f"  Denní nezkrácené: {len(records)}")
    return records


def aggregate_by_base_key(records):
    """Agreguje záznamy podle REDIZO_KKOV (sčítá zaměření dohromady)."""
    groups = defaultdict(list)
    for r in records:
        base_key = f"{r['redizo']}_{r['kkov']}"
        groups[base_key].append(r)

    aggregated = {}
    for key, group in groups.items():
        first = group[0]
        agg = {
            'id': key,
            'redizo': first['redizo'],
            'nazev': first['nazev'],
            'ulice': first['ulice'],
            'obec': first['obec'],
            'psc': first['psc'],
            'kraj_kod': first['kraj_kod'],
            'kraj': first['kraj'],
            'okres': first['okres'],
            'orp': first['orp'],
            'zrizovatel': first['zrizovatel'],
            'typ': first['typ'],
            'kkov': first['kkov'],
            'obor': first['obor'],
            'zamereni': first['zamereni'] if len(group) == 1 else '',
            'delka_studia': first['delka_studia'],
            'kapacita': sum(r['kapacita'] for r in group),
            'prihlasky': sum(r['prihlasky'] for r in group),
            'p1': sum(r['p1'] for r in group),
            'p2': sum(r['p2'] for r in group),
            'p3': sum(r['p3'] for r in group),
            'p4': sum(r['p4'] for r in group),
            'p5': sum(r['p5'] for r in group),
        }
        agg['index_poptavky'] = round(agg['prihlasky'] / agg['kapacita'], 2) if agg['kapacita'] > 0 else 0
        agg['pp'] = [agg['p1'], agg['p2'], agg['p3'], agg['p4'], agg['p5']]
        aggregated[key] = agg

    print(f"  Agregováno na {len(aggregated)} unikátních REDIZO_KKOV")
    return aggregated


def build_detailed_records(records):
    """Vytvoří záznamy per zaměření (pro applications_2026.json a schools_data.json)."""
    detailed = {}
    for r in records:
        base_key = f"{r['redizo']}_{r['kkov']}"
        zam_slug = slugify(r['zamereni'])
        full_id = f"{base_key}_{zam_slug}" if zam_slug else base_key

        if full_id in detailed:
            # Sečíst duplicity se stejným ID
            d = detailed[full_id]
            d['kapacita'] += r['kapacita']
            d['prihlasky'] += r['prihlasky']
            d['p1'] += r['p1']
            d['p2'] += r['p2']
            d['p3'] += r['p3']
            d['p4'] += r['p4']
            d['p5'] += r['p5']
        else:
            detailed[full_id] = {
                'id': full_id,
                'redizo': r['redizo'],
                'nazev': r['nazev'],
                'ulice': r['ulice'],
                'obec': r['obec'],
                'psc': r['psc'],
                'kraj_kod': r['kraj_kod'],
                'kraj': r['kraj'],
                'okres': r['okres'],
                'orp': r['orp'],
                'zrizovatel': r['zrizovatel'],
                'typ': r['typ'],
                'kkov': r['kkov'],
                'obor': r['obor'],
                'zamereni': r['zamereni'],
                'delka_studia': r['delka_studia'],
                'kapacita': r['kapacita'],
                'prihlasky': r['prihlasky'],
                'p1': r['p1'],
                'p2': r['p2'],
                'p3': r['p3'],
                'p4': r['p4'],
                'p5': r['p5'],
            }

    # Dopočítat index a pp
    for d in detailed.values():
        d['index_poptavky'] = round(d['prihlasky'] / d['kapacita'], 2) if d['kapacita'] > 0 else 0
        d['pp'] = [d['p1'], d['p2'], d['p3'], d['p4'], d['p5']]

    print(f"  Detailní záznamy (per zaměření): {len(detailed)}")
    return detailed


def update_applications_2026(detailed):
    """Aktualizuje applications_2026.json se skutečnými daty."""
    print(f"\nAktualizuji {APP_2026_PATH}...")

    # Načíst stávající pro porovnání
    with open(APP_2026_PATH, 'r', encoding='utf-8') as f:
        old = json.load(f)
    old_ids = {r['id'] for r in old['data']}

    # Nové záznamy
    records = []
    for d in detailed.values():
        records.append({
            'id': d['id'],
            'kapacita': d['kapacita'],
            'prihlasky': d['prihlasky'],
            'pp': d['pp'],
            'idx': d['index_poptavky'],
        })

    total_prihl = sum(r['prihlasky'] for r in records)
    total_kap = sum(r['kapacita'] for r in records)
    new_ids = {r['id'] for r in records}

    output = {
        'meta': {
            'rok': 2026,
            'kolo': 1,
            'celkem_prihlasek': total_prihl,
            'celkem_oboru': len(records),
            'zdroj': 'CERMAT data.cermat.cz, aktualizace 2026-03-08',
        },
        'data': records,
    }

    with open(APP_2026_PATH, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, separators=(',', ':'))

    size_kb = APP_2026_PATH.stat().st_size / 1024
    print(f"  Zapsáno {len(records)} záznamů ({size_kb:.0f} KB)")
    print(f"  Celkem přihlášek: {total_prihl:,}, kapacita: {total_kap:,}")
    print(f"  Staré záznamy: {len(old_ids)}, nové: {len(new_ids)}")
    print(f"  Přidáno: {len(new_ids - old_ids)}, odebráno: {len(old_ids - new_ids)}")


def update_school_analysis(aggregated):
    """Přidá pole *_2026 do school_analysis.json."""
    print(f"\nAktualizuji {SCHOOL_ANALYSIS_PATH}...")

    with open(SCHOOL_ANALYSIS_PATH, 'r', encoding='utf-8') as f:
        sa = json.load(f)

    matched = 0
    new_count = 0

    # Aktualizovat existující záznamy
    for key in list(sa.keys()):
        if key in aggregated:
            agg = aggregated[key]
            sa[key]['prihlasky_2026'] = agg['prihlasky']
            sa[key]['kapacita_2026'] = agg['kapacita']
            sa[key]['index_poptavky_2026'] = agg['index_poptavky']
            sa[key]['prihlasky_priority_2026'] = agg['pp']
            matched += 1

    # Přidat nové obory
    for key, agg in aggregated.items():
        if key not in sa:
            # Zřizovatel mapping
            zriz = agg['zrizovatel']
            if zriz in ('2', 'krajské'):
                zriz_label = 'veřejné / státní'
            elif zriz in ('5', 'soukromé'):
                zriz_label = 'soukromé'
            elif zriz in ('6', 'církevní'):
                zriz_label = 'církevní'
            elif zriz in ('1', 'MŠMT'):
                zriz_label = 'veřejné / státní'
            else:
                zriz_label = zriz

            sa[key] = {
                'id': key,
                'nazev': agg['nazev'],
                'obor': agg['obor'],
                'obec': agg['obec'],
                'okres': agg['okres'],
                'orp': agg['orp'],
                'kraj': agg['kraj'],
                'kraj_kod': agg['kraj_kod'],
                'adresa': f"{agg['ulice']}, {agg['obec']}, {agg['psc']}",
                'adresa_plna': f"{agg['ulice']}, {agg['obec']}, {agg['psc']}",
                'zrizovatel': zriz_label,
                'typ': agg['typ'],
                'delka_studia': agg['delka_studia'],
                # 2025 data - nemáme, dáme 0
                'min_body': 0,
                'prumer_body': 0,
                'kapacita': 0,
                'prihlasky': 0,
                'prijati': 0,
                'index_poptavky': 0,
                'obtiznost': 0,
                'total_applicants': 0,
                'priority_counts': [0, 0, 0, 0, 0],
                'priority_pcts': [0, 0, 0, 0, 0],
                'category_code': 'balanced',
                'category_name': 'Nový obor',
                # 2026 data
                'prihlasky_2026': agg['prihlasky'],
                'kapacita_2026': agg['kapacita'],
                'index_poptavky_2026': agg['index_poptavky'],
                'prihlasky_priority_2026': agg['pp'],
            }
            new_count += 1

    with open(SCHOOL_ANALYSIS_PATH, 'w', encoding='utf-8') as f:
        json.dump(sa, f, ensure_ascii=False, separators=(',', ':'))

    size_mb = SCHOOL_ANALYSIS_PATH.stat().st_size / 1024 / 1024
    print(f"  Aktualizováno: {matched}, nových oborů: {new_count}")
    print(f"  Celkem záznamů: {len(sa)} ({size_mb:.1f} MB)")


def update_schools_data(detailed):
    """Přidá nové obory do schools_data.json 2025 (pro API JOIN)."""
    print(f"\nAktualizuji {SCHOOLS_DATA_PATH}...")

    with open(SCHOOLS_DATA_PATH, 'r', encoding='utf-8') as f:
        sd = json.load(f)

    existing_ids = {r['id'] for r in sd['2025']}
    new_count = 0

    for full_id, d in detailed.items():
        if full_id not in existing_ids:
            # Zřizovatel mapping
            zriz = d['zrizovatel']
            if zriz in ('2', 'krajské'):
                zriz_label = 'veřejné / státní'
            elif zriz in ('5', 'soukromé'):
                zriz_label = 'soukromé'
            elif zriz in ('6', 'církevní'):
                zriz_label = 'církevní'
            elif zriz in ('1', 'MŠMT'):
                zriz_label = 'veřejné / státní'
            else:
                zriz_label = zriz

            new_record = {
                'id': full_id,
                'redizo': d['redizo'],
                'nazev': d['nazev'],
                'nazev_display': f"{d['nazev']}, {d['ulice']}" if d['ulice'] else d['nazev'],
                'adresa_plna': f"{d['ulice']}, {d['obec']}, {d['psc']}",
                'ulice': d['ulice'],
                'obec': d['obec'],
                'psc': d['psc'],
                'kraj_kod': d['kraj_kod'],
                'kraj': d['kraj'],
                'okres': d['okres'],
                'orp': d['orp'],
                'zrizovatel': zriz_label,
                'obor': d['obor'],
                'zamereni': d['zamereni'],
                'kkov': d['kkov'],
                'typ': d['typ'],
                'delka_studia': d['delka_studia'],
                'adresa': f"{d['ulice']}, {d['obec']}, {d['psc']}",
                'kapacita': 0,
                'prihlasky': 0,
                'prijati': 0,
                'index_poptavky': 0,
                'min_body': 0,
                'prumer_body': 0,
                'rok': 2025,
            }
            sd['2025'].append(new_record)
            new_count += 1

    with open(SCHOOLS_DATA_PATH, 'w', encoding='utf-8') as f:
        json.dump(sd, f, ensure_ascii=False, separators=(',', ':'))

    size_mb = SCHOOLS_DATA_PATH.stat().st_size / 1024 / 1024
    print(f"  Nových oborů přidáno do 2025: {new_count}")
    print(f"  Celkem 2025 záznamů: {len(sd['2025'])} ({size_mb:.1f} MB)")


def verify_issues(aggregated):
    """Ověří data pro nahlášené issues."""
    print("\n=== OVĚŘENÍ ISSUES ===")

    # #43: Gymnázium Milady Horákové (691000468)
    key43 = '691000468_79-41-K/41'
    if key43 in aggregated:
        d = aggregated[key43]
        print(f"#43 Gymnázium M. Horákové: prihl={d['prihlasky']}, kap={d['kapacita']}, idx={d['index_poptavky']} (uživatel hlásil 188)")

    # #44: Drtinova SOŠ (600005674) - veřejnosprávní
    for key, d in aggregated.items():
        if key.startswith('600005674'):
            print(f"#44 Drtinova: {key} | {d['obor']} | prihl={d['prihlasky']}, kap={d['kapacita']}, idx={d['index_poptavky']}")

    # #45: Gymnázium U libeňského zámku (600005933)
    key45 = '600005933_79-41-K/41'
    if key45 in aggregated:
        d = aggregated[key45]
        print(f"#45 Gymnázium U lib. zámku: prihl={d['prihlasky']}, kap={d['kapacita']}, idx={d['index_poptavky']} (uživatel hlásil 427)")


def main():
    print("=" * 60)
    print("Import skutečných dat CERMAT 2026")
    print("=" * 60)

    # 1. Načíst XLSX
    records = load_cermat_xlsx()

    # 2. Agregovat podle REDIZO_KKOV (pro school_analysis.json)
    print("\nAgregace podle REDIZO_KKOV...")
    aggregated = aggregate_by_base_key(records)

    # 3. Detailní záznamy per zaměření (pro applications_2026.json)
    print("\nDetailní záznamy per zaměření...")
    detailed = build_detailed_records(records)

    # 4. Ověřit issues
    verify_issues(aggregated)

    # 5. Aktualizovat soubory
    update_applications_2026(detailed)
    update_school_analysis(aggregated)
    update_schools_data(detailed)

    print("\n" + "=" * 60)
    print("HOTOVO!")
    print("=" * 60)


if __name__ == '__main__':
    main()
