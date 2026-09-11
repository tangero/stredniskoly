"""Reprodukce O-15/O-16: zmrazený snímek a nové čtecí dotazy Matomo."""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path

spec = importlib.util.spec_from_file_location('matomo_report', Path(__file__).with_name('matomo-report.py'))
matomo = importlib.util.module_from_spec(spec)
spec.loader.exec_module(matomo)


def summarize(reports: dict) -> dict:
    pages = reports['pages']['data']
    visits = matomo.one(reports['visits']['data'])
    actions = matomo.one(reports['actions']['data'])
    returning = matomo.one(reports['returning']['data'])
    return {
        'queries': {key: {k: r[k] for k in ('params', 'fetched_at', 'response_sha256')} for key, r in reports.items()},
        'visits': visits['nb_visits'], 'pageviews': actions['nb_pageviews'],
        'page_rows_sum': sum(r.get('nb_hits', 0) for r in pages),
        'entries_sum': sum(r.get('entry_nb_visits', 0) for r in pages),
        'school_prefix_pageviews': sum(r.get('nb_hits', 0) for r in pages if r['label'].startswith('/skola/')),
        'school_others': [{k: r.get(k) for k in ('label', 'nb_hits', 'nb_visits', 'entry_nb_visits')} for r in pages if r['label'] == '/skola/ - Others'],
        'entry_residual': visits['nb_visits'] - sum(r.get('entry_nb_visits', 0) for r in pages),
        'new_plus_returning_residual': returning['nb_visits_new'] + returning['nb_visits_returning'] - visits['nb_visits'],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    raw = args.source.read_bytes()
    original = json.loads(raw)
    keys = {'visits': 'VisitsSummary.get', 'actions': 'Actions.get',
            'pages': 'Actions.getPageUrls', 'returning': 'VisitFrequency.get'}
    result = {'schema_version': 1, 'frozen_snapshot_sha256': hashlib.sha256(raw).hexdigest(),
              'frozen_A1': summarize({k: original['reports'][k] for k in keys}), 'fresh': []}
    for label, end in [('closed_first', '2026-09-10'), ('open_day', '2026-09-11'), ('closed_repeat', '2026-09-10')]:
        reports = {k: matomo.api(method, {'period': 'range', 'date': f'2026-02-11,{end}', 'flat': 1}) for k, method in keys.items()}
        result['fresh'].append({'label': label, 'summary': summarize(reports)})
    result['limits'] = [
        'Nové dotazy nejsou transakčně shodným snímkem a nezpětně nereprodukují čas oponentova měření.',
        'Period=month zahrnuje celé kalendářní měsíce, proto není náhradou oříznutého range.',
        'Rozdíl součtů zůstává otevřený, dokud jeho příčina není doložena.',
    ]
    matomo.save_private(args.output, json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'frozen': result['frozen_A1']['school_others'], 'fresh': [
        {'label': x['label'], **{k: x['summary'][k] for k in ('visits', 'pageviews', 'page_rows_sum', 'entries_sum', 'school_prefix_pageviews', 'school_others', 'entry_residual', 'new_plus_returning_residual')}}
        for x in result['fresh']]}, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
