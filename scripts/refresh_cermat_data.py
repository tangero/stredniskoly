#!/usr/bin/env python3
"""Obnova 1. kola 2026 ze dvou ověřených XLSX, bez přepisování historie 2024/2025.

python scripts/refresh_cermat_data.py --input-dir /cesta/k/xlsx
Stáhněte PZ2026_kolo1_skolobory_vysledky.xlsx a PZ2025_kolo1_skolobory_vysledky.xlsx
z katalogu CERMAT. Při novější revizi změňte SOURCE_DATES podle katalogu.
"""
import argparse
import hashlib
import json
import math
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

from import_cermat_results import load_flat_xlsx, extract_current_year, compute_ranks, is_valid_flat, make_key, safe_float

ROOT = Path(__file__).resolve().parent.parent
SOURCE_DATES = {2026: '2026-08-17', 2025: '2026-01-23'}
SOURCE_BASE = 'https://data.cermat.cz/files/files/JPZ/agregovana_data_skoly/'


def normalize_id(value: str) -> str:
    parts = value.split('_')
    return make_key(parts[0], parts[1], '_'.join(parts[2:]))


def admission_context(r: dict) -> dict:
    """Agregáty i pro nabídky bez publikovaného skóru. Chybějící údaj není nula."""
    def number(column: str, maximum: float = math.inf, count: bool = False):
        v = r.get(column)
        if v is None or isinstance(v, str):
            return None
        if isinstance(v, bool) or not math.isfinite(v) or not 0 <= v <= maximum or (count and int(v) != v):
            raise ValueError(f'Neplatný údaj {column}: {v}')
        return int(v) if count else v

    def score(suffix: str, count):
        v = number('ČJ+MA - % SKÓR - PRŮMĚR' + suffix, 200)
        return round(v / 2, 2) if v is not None and count is not None and count > 0 else None

    all_count = number('ČJ+MA - KONALI', count=True)
    accepted_count = number('ČJ+MA - KONALI (PŘIJATI)', count=True)
    result = {
        'tested_all': all_count,
        'tested_accepted': accepted_count,
        'average_all': score('', all_count),
        'average_accepted': score(' (PŘIJATI)', accepted_count),
        'accepted': number('PŘIJATÍ', count=True),
        'higher_priority': number('NEPŘIJATI - PŘIJAT NA VYŠŠÍ PRIORITU', count=True),
        'capacity_rejected': number('NEPŘIJATI - NEDOSTATEČNÁ KAPACITA', count=True),
        'conditions_not_met': number('NEPŘIJATI - NESPLNĚNÍ PODMÍNEK', count=True),
        'withdrawn': number('NEPŘIJATI - VZDAL SE PŘIJETÍ', count=True),
    }
    applications = number('PŘIHLÁŠKY CELKEM', count=True)
    outcomes = [result[k] for k in ('accepted', 'higher_priority', 'capacity_rejected', 'conditions_not_met', 'withdrawn')]
    result['outcomes_complete'] = applications is not None and all(v is not None for v in outcomes) and sum(outcomes) == applications
    if all_count is not None and applications is not None and all_count > applications:
        raise ValueError('Více konajících než přihlášek')
    if accepted_count is not None and result['accepted'] is not None and accepted_count > result['accepted']:
        result['tested_accepted'] = None
        result['average_accepted'] = None
    return result


def zaklad(redizo, kkov) -> str:
    """Obor školy bez zaměření: REDIZO_KKOV. Na tomto klíči se rozhoduje, zda je nabídka nová."""
    return f'{redizo}_{kkov}'


def zaklady_z_druheho_kola(druhe_kolo: dict, rok: int) -> set[str]:
    """Obory nabídnuté v 1. kole roku `rok` podle public/druhe_kolo.json (klíč REDIZO_KKOV[_zaměření]).

    Soubor staví scripts/build-druhe-kolo.py z úplného souhrnu PZ{rok}_kolo1_skolobory_vysledky.xlsx
    se stejným výběrem jako tento import (denní nezkrácené obory s povinnou JPZ), včetně nástaveb.
    """
    nabidky = druhe_kolo['roky'].get(str(rok))
    if not nabidky:
        raise ValueError(f'V druhe_kolo.json chybí ročník {rok}')
    return {'_'.join(k.split('_')[:2]) for k in nabidky}


def oznac_novinky(applications: list[dict], analysis: dict, predchozi: set[str]) -> None:
    """Nová je jen nabídka, jejíž obor (REDIZO_KKOV) v předchozím roce v 1. kole nebyl.

    Doklad je úplný seznam nabídek předchozího 1. kola, ne schools_data.json: ten za roky 2024
    a 2025 nástavby neobsahuje, a ty pak vycházely jako nové (issue #257). Změna zaměření
    nabídku novou nedělá. V school_analysis.json se příznak počítá jen u vypsaného oboru.
    """
    vypsane = set()
    for a in applications:
        z = zaklad(a['redizo'], a['kkov'])
        vypsane.add(z)
        if z in predchozi:
            a.pop('is_new', None)
        else:
            a['is_new'] = True
    for key, r in analysis.items():
        if key in vypsane and key not in predchozi:
            r['is_new_2026'] = True
        else:
            r.pop('is_new_2026', None)


def build_applications(records: list[dict], legacy: list[dict], history: list[dict]) -> list[dict]:
    ids = defaultdict(set)
    for row in legacy + history:
        ids[normalize_id(row['id'])].add(row['id'])
    # Preferovat historickou URL, pouze při jednoznačném úplném klíči.
    historic_counts = Counter(normalize_id(r['id']) for r in history)
    historic = {key for key, count in historic_counts.items() if count == 1}
    output = []
    seen = set()
    for r in records:
        if not is_valid_flat(r):
            continue
        key = make_key(str(r['REDIZO']), r['KKOV'], r.get('ZAMĚŘENÍ OBORU') or '')
        if key in seen:
            raise ValueError(f'Duplicitní nabídka: {key}')
        seen.add(key)
        candidates = ids.get(key, set())
        id_ = next(iter(candidates)) if len(candidates) == 1 else key
        capacity = int(safe_float(r['KAPACITA']))
        applications = int(safe_float(r['PŘIHLÁŠKY CELKEM']))
        priorities = [int(safe_float(r[f'PŘIHLÁŠKY - PRIORITA {p}'])) for p in range(1, 6)]
        if sum(priorities) != applications or capacity < 0 or applications < 0:
            raise ValueError(f'Nesouhlasí přihlášky / priority: {key}')
        output.append({
            'id': id_, 'source_id': str(r['ID_SOF']), 'redizo': str(r['REDIZO']),
            'kkov': r['KKOV'], 'zamereni': r.get('ZAMĚŘENÍ OBORU') or '',
            'nazev': r['NÁZEV ŠKOLY'], 'obor': r['OBOR - NÁZEV'], 'typ': r['TYP ŠKOLY'],
            'ulice': r.get('ULICE') or '', 'psc': str(r.get('PSČ') or ''),
            'izo': str(r.get('IZO') or ''), 'forma': r['FORMA VZDĚLÁVÁNÍ'],
            'jazyk': r.get('JAZYK STUDIA') or '',
            'obec': r['OBEC'], 'kraj': r['KRAJ - NÁZEV'], 'kraj_kod': r['KRAJ'],
            'delka_studia': r['DÉLKA STUDIA'], 'kapacita': capacity, 'prihlasky': applications,
            'admission_context': admission_context(r),
            'pp': priorities, 'idx': round(applications / capacity, 2) if capacity else 0,
            **({'is_new': True} if key not in historic else {}),
        })
    return sorted(output, key=lambda r: normalize_id(r['id']))


def main(input_dir: Path) -> None:
    checked = datetime.now(timezone.utc).date().isoformat()
    sources, datasets = {}, {}
    for year in (2025, 2026):
        filename = f'PZ{year}_kolo1_skolobory_vysledky.xlsx'
        file = input_dir / filename
        records = load_flat_xlsx(file)
        if not records or any(r['ROK'] != year or r['KOLO'] != 1 for r in records):
            raise ValueError(f'Nesprávný rok/kolo: {filename}')
        datasets[year] = records
        sources[str(year)] = {
            'url': SOURCE_BASE + filename, 'valid_at': SOURCE_DATES[year], 'checked_at': checked,
            'sha256': hashlib.sha256(file.read_bytes()).hexdigest(), 'rows': len(records),
        }
    public = ROOT / 'public'
    old_results = json.loads((public / 'cermat_results_2026.json').read_text())
    data = extract_current_year(datasets[2026])
    previous = extract_current_year(datasets[2025])
    for key, r in data.items():
        prev = previous.get(key)
        r['cj_ma_prijati_prev'] = prev['cj_ma_prijati'] if prev else 0
        r['delta_cj_ma'] = round(r['cj_ma_prijati'] - prev['cj_ma_prijati'], 2) if prev else None
        r['source_valid_at'] = SOURCE_DATES[2026]
        if old_results.get(key, {}).get('nazev_display'):
            r['nazev_display'] = old_results[key]['nazev_display']
    compute_ranks(data)
    data = dict(sorted(data.items()))
    history = json.loads((public / 'schools_data.json').read_text())['2025']
    legacy = json.loads((public / 'applications_2026.json').read_text())['data']
    applications = build_applications(datasets[2026], legacy, history)
    predchozi = {zaklad(r['REDIZO'], r['KKOV']) for r in datasets[2025] if is_valid_flat(r)}
    groups = defaultdict(list)
    for app in applications:
        groups[app['redizo'] + '_' + app['kkov']].append(app)
    analysis = json.loads((public / 'school_analysis.json').read_text())
    for key, r in analysis.items():
        for field in ('prihlasky_2026', 'kapacita_2026', 'index_poptavky_2026', 'prihlasky_priority_2026', 'matched_2025_id', 'match_type', 'prev_zamereni_name'):
            r.pop(field, None)
        offers = groups.get(key, [])
        if offers:
            capacity = sum(x['kapacita'] for x in offers)
            count = sum(x['prihlasky'] for x in offers)
            r.update(prihlasky_2026=count, kapacita_2026=capacity,
                     index_poptavky_2026=round(count / capacity, 2) if capacity else 0,
                     prihlasky_priority_2026=[sum(x['pp'][i] for x in offers) for i in range(5)])
    oznac_novinky(applications, analysis, predchozi)
    meta = {
        'latest_year': 2026, 'available_years': [2026], 'round': 1,
        'source': sources['2026'], 'comparison_source': sources['2025'],
        'scope': 'Denní nezkrácené obory s povinnou JPZ a zveřejněným kladným průměrem ČJ+MA přijatých.',
        'score_scale': 'Procentní skór CERMAT / 2: ČJ+MA 0–100, jednotlivé předměty 0–50. U upravených testů nejde o původní body.',
        'offers': len(data), 'schools': len({r['redizo'] for r in data.values()}),
        'eligible_offers': len(applications), 'without_positive_score': len(applications) - len(data),
        'matched_previous_year': sum(r['delta_cj_ma'] is not None for r in data.values()),
    }
    outputs = {
        'cermat_results_2026.json': data,
        'cermat_results_meta.json': meta,
        'applications_2026.json': {'meta': {
            'rok': 2026, 'kolo': 1, 'celkem_prihlasek': sum(r['prihlasky'] for r in applications),
            'celkem_oboru': len(applications), 'zdroj': f'CERMAT, platnost {SOURCE_DATES[2026]}',
            'source': sources['2026'], 'scope': 'Denní nezkrácené obory s povinnou JPZ; včetně oborů bez zveřejněného skóru.',
        }, 'data': applications},
        'school_analysis.json': analysis,
    }
    # Všechny kontroly a serializace musí projít před prvním zápisem.
    serialized = {name: json.dumps(value, ensure_ascii=False, indent=None if name == 'school_analysis.json' else 2, separators=(',', ':') if name == 'school_analysis.json' else None, allow_nan=False) + '\n' for name, value in outputs.items()}
    for name, value in serialized.items():
        (public / name).write_text(value)
    print(json.dumps(meta, ensure_ascii=False, indent=2))


def oprav_novinky() -> None:
    """Přepočítá jen příznaky novinek v uložených datech, bez XLSX (doklad z public/druhe_kolo.json).

    Ostatní pole i formát souborů zůstávají; zapisuje se jen, když se něco změnilo.
    """
    public = ROOT / 'public'
    predchozi = zaklady_z_druheho_kola(json.loads((public / 'druhe_kolo.json').read_text()), 2025)
    apps_file, analysis_file = public / 'applications_2026.json', public / 'school_analysis.json'
    apps = json.loads(apps_file.read_text())
    analysis = json.loads(analysis_file.read_text())
    pred = (sum(bool(a.get('is_new')) for a in apps['data']), sum(bool(r.get('is_new_2026')) for r in analysis.values()))
    oznac_novinky(apps['data'], analysis, predchozi)
    po = (sum(bool(a.get('is_new')) for a in apps['data']), sum(bool(r.get('is_new_2026')) for r in analysis.values()))
    apps_file.write_text(json.dumps(apps, ensure_ascii=False, indent=2, allow_nan=False) + '\n')
    analysis_file.write_text(json.dumps(analysis, ensure_ascii=False, separators=(',', ':'), allow_nan=False) + '\n')
    print(f'applications_2026.json is_new: {pred[0]} -> {po[0]}; school_analysis.json is_new_2026: {pred[1]} -> {po[1]}')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--input-dir', type=Path)
    parser.add_argument('--oprav-novinky', action='store_true',
                        help='jen přepočítat příznaky novinek z public/druhe_kolo.json, bez XLSX')
    args = parser.parse_args()
    if args.oprav_novinky:
        oprav_novinky()
    elif args.input_dir:
        main(args.input_dir)
    else:
        parser.error('zadejte --input-dir, nebo --oprav-novinky')
