#!/usr/bin/env python3
"""
Generování dat přihlášek 2026 na základě existujících dat 2024/2025.

Výstup: public/applications_2026.json (SAMOSTATNÝ soubor, nemodifikuje schools_data.json)

Data jsou per obor/zaměření (plné ID), každý záznam obsahuje jen dynamická data:
- id, kapacita, prihlasky, prihlasky_priority, index_poptavky

Statická data (název, adresa, typ...) se spojují za běhu z schools_data.json.

Známé agregáty 2026:
- 156 409 uchazečů
- 425 279 přihlášek
- Průměrně 2.72 přihlášky na uchazeče
"""

import json
import random
from pathlib import Path

random.seed(2026)

TOTAL_APPLICATIONS_2026 = 425_279


def estimate_2026_applications(school_2025, school_2024=None):
    """Odhadne přihlášky 2026 na základě trendu 2024→2025."""
    prihlasky_2025 = school_2025.get('prihlasky', 0)
    if prihlasky_2025 == 0:
        return 0

    if school_2024:
        prihlasky_2024 = school_2024.get('prihlasky', 0)
        if prihlasky_2024 > 0:
            trend = prihlasky_2025 / prihlasky_2024
            factor = trend * random.uniform(0.92, 1.08)
        else:
            factor = random.uniform(1.00, 1.10)
    else:
        factor = random.uniform(1.00, 1.10)

    return max(1, int(round(prihlasky_2025 * factor)))


def estimate_priority_distribution(prihlasky, school_ref):
    """Odhadne rozložení přihlášek podle priority."""
    if prihlasky == 0:
        return [0, 0, 0, 0, 0]

    pp = school_ref.get('prihlasky_priority')
    if pp and sum(pp) > 0:
        total = sum(pp)
        ratios = [p / total for p in pp]
        adjusted = [max(0, r + random.uniform(-0.03, 0.03)) for r in ratios]
        total_adj = sum(adjusted)
        if total_adj > 0:
            adjusted = [a / total_adj for a in adjusted]
        else:
            adjusted = [0.35, 0.30, 0.25, 0.07, 0.03]
    else:
        adjusted = [0.35, 0.30, 0.25, 0.07, 0.03]

    distributed = [int(round(prihlasky * r)) for r in adjusted]
    diff = prihlasky - sum(distributed)
    if diff != 0:
        max_idx = distributed.index(max(distributed))
        distributed[max_idx] += diff
    return distributed


def main():
    base_dir = Path(__file__).parent.parent
    schools_path = base_dir / 'public' / 'schools_data.json'
    output_path = base_dir / 'public' / 'applications_2026.json'

    print(f"Načítám {schools_path}...")
    with open(schools_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    schools_2025 = data.get('2025', [])
    schools_2024 = data.get('2024', [])
    print(f"Nalezeno {len(schools_2025)} oborů v 2025, {len(schools_2024)} v 2024")

    # Index 2024 podle ID
    idx_2024 = {s['id']: s for s in schools_2024}

    # Generovat data 2026 – JEN dynamická pole per obor/zaměření
    records = []
    total_prihlasky = 0
    total_kapacita = 0

    for s25 in schools_2025:
        s24 = idx_2024.get(s25['id'])

        kapacita = max(1, int(round(s25.get('kapacita', 0) * random.uniform(0.97, 1.05))))
        prihlasky = estimate_2026_applications(s25, s24)
        pp = estimate_priority_distribution(prihlasky, s25)
        idx = round(prihlasky / kapacita, 2) if kapacita > 0 else 0

        records.append({
            'id': s25['id'],
            'kapacita': kapacita,
            'prihlasky': prihlasky,
            'pp': pp,  # prihlasky_priority (zkrácený klíč)
            'idx': idx,  # index_poptavky (zkrácený klíč)
        })
        total_prihlasky += prihlasky
        total_kapacita += kapacita

    print(f"\nVygenerováno {len(records)} oborů/zaměření")
    print(f"Celkem přihlášek: {total_prihlasky:,}")

    # Normalizace na známý agregát
    if total_prihlasky > 0:
        scale = TOTAL_APPLICATIONS_2026 / total_prihlasky
        print(f"Normalizace (faktor: {scale:.3f})")

        for rec in records:
            rec['prihlasky'] = max(1, int(round(rec['prihlasky'] * scale)))
            # Přerozdělit priority po škálování
            s_ref = idx_2024.get(rec['id']) or next((s for s in schools_2025 if s['id'] == rec['id']), rec)
            rec['pp'] = estimate_priority_distribution(rec['prihlasky'], s_ref)
            rec['idx'] = round(rec['prihlasky'] / rec['kapacita'], 2) if rec['kapacita'] > 0 else 0

        final_total = sum(r['prihlasky'] for r in records)
        print(f"Finální přihlášek: {final_total:,} (cíl: {TOTAL_APPLICATIONS_2026:,})")

    # Uložit do SAMOSTATNÉHO souboru
    output = {
        'meta': {
            'rok': 2026,
            'kolo': 1,
            'celkem_uchazecu': 156_409,
            'celkem_prihlasek': sum(r['prihlasky'] for r in records),
            'celkem_oboru': len(records),
            'zdroj': 'Odhad na základě dat 2024/2025 a známých agregátů CERMAT',
        },
        'data': records,
    }

    print(f"\nUkládám do {output_path}...")
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, separators=(',', ':'))

    size_kb = output_path.stat().st_size / 1024
    print(f"Hotovo! Velikost: {size_kb:.0f} KB")

    # Odebrat rok 2026 ze schools_data.json pokud tam je
    if '2026' in data:
        print(f"\nOdstraňuji rok 2026 ze schools_data.json...")
        del data['2026']
        with open(schools_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
        size_mb = schools_path.stat().st_size / 1024 / 1024
        print(f"schools_data.json: {size_mb:.1f} MB (bez 2026)")

    # Ukázka
    print("\n=== UKÁZKA: škola s více obory (600004856) ===")
    for r in records:
        if r['id'].startswith('600004856'):
            print(f"  {r['id']}: prih={r['prihlasky']}, kap={r['kapacita']}, idx={r['idx']}×, P1={r['pp'][0]}")


if __name__ == '__main__':
    main()
