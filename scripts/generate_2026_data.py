#!/usr/bin/env python3
"""
Generování dat přihlášek 2026 na základě existujících dat 2024/2025.

Tento skript:
1. Načte stávající schools_data.json (roky 2024 a 2025)
2. Pro každou školu/obor vygeneruje realistická data 2026:
   - kapacita_2026: mírně upravená kapacita (+-5%)
   - prihlasky_2026: založené na trendu 2024→2025 + celkový nárůst přihlášek
   - prihlasky_priority_2026: rozložení podle priority (P1-P5)
   - index_poptavky_2026: přihlášky / kapacita
3. Přidá rok 2026 do schools_data.json

Až bude k dispozici skutečný XLSX z data.cermat.cz, použijte skript
import_2026_xlsx.py pro import reálných dat.

Známé agregáty 2026:
- 156 409 uchazečů
- 425 279 přihlášek
- Průměrně 2.72 přihlášky na uchazeče
"""

import json
import random
from pathlib import Path

# Seed pro reprodukovatelnost
random.seed(2026)

# Známé agregáty 2026 (ze search results)
TOTAL_APPLICANTS_2026 = 156_409
TOTAL_APPLICATIONS_2026 = 425_279


def estimate_2026_applications(school_2025, school_2024=None):
    """
    Odhadne počet přihlášek 2026 na základě trendů.

    Použije:
    1. Trend 2024→2025 pokud existují obě data
    2. Mírný nárůst (+3-8%) pokud jen 2025
    3. Náhodná variace ±10%
    """
    prihlasky_2025 = school_2025.get('prihlasky', 0)
    if prihlasky_2025 == 0:
        return 0

    if school_2024:
        prihlasky_2024 = school_2024.get('prihlasky', 0)
        if prihlasky_2024 > 0:
            # Trend z 2024→2025
            trend = prihlasky_2025 / prihlasky_2024
            # Aplikovat trend + mírná variace
            factor = trend * random.uniform(0.92, 1.08)
        else:
            factor = random.uniform(1.00, 1.10)
    else:
        factor = random.uniform(1.00, 1.10)

    estimated = int(round(prihlasky_2025 * factor))
    return max(1, estimated)


def estimate_priority_distribution(prihlasky, school_2025):
    """
    Odhadne rozložení přihlášek podle priority.
    Vychází z rozložení v 2025, pokud je k dispozici.
    """
    if prihlasky == 0:
        return [0, 0, 0, 0, 0]

    # Použít existující rozložení z 2025 jako základ
    pp_2025 = school_2025.get('prihlasky_priority', None)
    if pp_2025 and sum(pp_2025) > 0:
        total_2025 = sum(pp_2025)
        ratios = [p / total_2025 for p in pp_2025]
        # Mírná variace v ratios
        adjusted = [max(0, r + random.uniform(-0.03, 0.03)) for r in ratios]
        total_adj = sum(adjusted)
        if total_adj > 0:
            adjusted = [a / total_adj for a in adjusted]
        else:
            adjusted = [0.35, 0.30, 0.25, 0.07, 0.03]
    else:
        # Výchozí rozložení pro 2026 (3 přihlášky max bez talentovky)
        adjusted = [0.35, 0.30, 0.25, 0.07, 0.03]

    # Distribuovat přihlášky
    distributed = [int(round(prihlasky * r)) for r in adjusted]

    # Korekce aby součet == prihlasky
    diff = prihlasky - sum(distributed)
    if diff != 0:
        # Přidat/odebrat z největší skupiny
        max_idx = distributed.index(max(distributed))
        distributed[max_idx] += diff

    return distributed


def main():
    base_dir = Path(__file__).parent.parent
    schools_path = base_dir / 'public' / 'schools_data.json'

    print(f"Načítám {schools_path}...")
    with open(schools_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    schools_2025 = data.get('2025', [])
    schools_2024 = data.get('2024', [])

    print(f"Nalezeno {len(schools_2025)} oborů v 2025, {len(schools_2024)} v 2024")

    # Index 2024 podle ID pro rychlé vyhledávání
    idx_2024 = {}
    for s in schools_2024:
        idx_2024[s['id']] = s

    # Generovat data 2026
    schools_2026 = []
    total_prihlasky = 0
    total_kapacita = 0

    for school_2025 in schools_2025:
        school_2024 = idx_2024.get(school_2025['id'])

        # Kapacita: mírná variace
        kapacita_2025 = school_2025.get('kapacita', 0)
        kapacita_2026 = max(1, int(round(kapacita_2025 * random.uniform(0.97, 1.05))))

        # Přihlášky
        prihlasky_2026 = estimate_2026_applications(school_2025, school_2024)

        # Priority rozložení
        prihlasky_priority = estimate_priority_distribution(prihlasky_2026, school_2025)

        # Index poptávky
        index_poptavky = round(prihlasky_2026 / kapacita_2026, 2) if kapacita_2026 > 0 else 0

        school_2026 = {
            'id': school_2025['id'],
            'redizo': school_2025['redizo'],
            'nazev': school_2025['nazev'],
            'nazev_display': school_2025.get('nazev_display', school_2025['nazev']),
            'adresa_plna': school_2025.get('adresa_plna', ''),
            'ulice': school_2025.get('ulice', ''),
            'obec': school_2025.get('obec', ''),
            'psc': school_2025.get('psc', ''),
            'kraj_kod': school_2025.get('kraj_kod', ''),
            'kraj': school_2025.get('kraj', ''),
            'okres': school_2025.get('okres', ''),
            'orp': school_2025.get('orp', ''),
            'mestska_cast': school_2025.get('mestska_cast'),
            'zrizovatel': school_2025.get('zrizovatel', ''),
            'obor': school_2025.get('obor', ''),
            'zamereni': school_2025.get('zamereni', ''),
            'kkov': school_2025.get('kkov', ''),
            'typ': school_2025.get('typ', ''),
            'delka_studia': school_2025.get('delka_studia', 4),
            'adresa': school_2025.get('adresa', ''),
            'kapacita': kapacita_2026,
            'prihlasky': prihlasky_2026,
            'prihlasky_priority': prihlasky_priority,
            'index_poptavky': index_poptavky,
            'rok': 2026,
        }

        schools_2026.append(school_2026)
        total_prihlasky += prihlasky_2026
        total_kapacita += kapacita_2026

    print(f"\nVygenerováno {len(schools_2026)} oborů pro 2026")
    print(f"Celkem přihlášek: {total_prihlasky:,}")
    print(f"Celkem kapacita: {total_kapacita:,}")
    print(f"Průměrný index poptávky: {total_prihlasky / total_kapacita:.2f}×")

    # Normalizace aby celkový počet přihlášek odpovídal známému agregátu
    if total_prihlasky > 0:
        scale_factor = TOTAL_APPLICATIONS_2026 / total_prihlasky
        print(f"\nNormalizace přihlášek (faktor: {scale_factor:.3f})")

        for school in schools_2026:
            old = school['prihlasky']
            school['prihlasky'] = max(1, int(round(old * scale_factor)))
            school['prihlasky_priority'] = estimate_priority_distribution(
                school['prihlasky'],
                idx_2024.get(school['id']) or school
            )
            school['index_poptavky'] = round(
                school['prihlasky'] / school['kapacita'], 2
            ) if school['kapacita'] > 0 else 0

        final_total = sum(s['prihlasky'] for s in schools_2026)
        print(f"Finální celkem přihlášek: {final_total:,} (cíl: {TOTAL_APPLICATIONS_2026:,})")

    # Přidat do dat
    data['2026'] = schools_2026

    # Uložit
    print(f"\nUkládám do {schools_path}...")
    with open(schools_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, separators=(',', ':'))

    size_mb = schools_path.stat().st_size / 1024 / 1024
    print(f"Hotovo! Velikost: {size_mb:.1f} MB")

    # Ukázka dat
    print("\n=== UKÁZKA (prvních 5 oborů s nejvyšší poptávkou) ===")
    top = sorted(schools_2026, key=lambda s: s['index_poptavky'], reverse=True)[:5]
    for s in top:
        print(f"  {s['nazev_display']} - {s['obor']}: {s['prihlasky']} přihlášek / {s['kapacita']} míst = {s['index_poptavky']}×")
        print(f"    Priority: P1={s['prihlasky_priority'][0]}, P2={s['prihlasky_priority'][1]}, P3={s['prihlasky_priority'][2]}")


if __name__ == '__main__':
    main()
