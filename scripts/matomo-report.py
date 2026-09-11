"""Matomo pro prijimackynaskolu.cz: pouze čtení agregovaných statistik."""
import argparse
import calendar
import getpass
import hashlib
import json
import os
import stat
import sys
import tempfile
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import HTTPRedirectHandler, Request, build_opener
from zoneinfo import ZoneInfo

ENDPOINT = 'https://ma.hlidacstatu.cz/index.php'
SITE_ID = 7
TOKEN_PATH = Path.home() / '.config/stredniskoly/matomo-token'
CACHE_ROOT = Path.home() / '.local/share/stredniskoly/matomo'
METHODS = frozenset({
    'SitesManager.getSiteFromId', 'VisitsSummary.get', 'Actions.get',
    'Actions.getPageUrls', 'Actions.getEntryPageUrls', 'Actions.getSiteSearchKeywords',
    'DevicesDetection.getType', 'Referrers.getReferrerType', 'Referrers.getSocials',
    'Referrers.getWebsites', 'VisitFrequency.get', 'Events.getCategory',
    'Goals.get', 'API.getReportMetadata',
})
PARAMETERS = frozenset({'period', 'date', 'flat', 'filter_limit', 'filter_offset',
                        'filter_sort_column', 'filter_sort_order', 'segment'})


class ReportError(Exception):
    """Chyba bez obsahu autentizace či vzdálené odpovědi."""


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, *args: Any, **kwargs: Any) -> None:
        return None


def read_token() -> str:
    token = os.environ.get('MATOMO_TOKEN')
    if token is None:
        try:
            info = TOKEN_PATH.lstat()
            if not stat.S_ISREG(info.st_mode) or info.st_mode & 0o077:
                raise ReportError('Soubor tokenu musí být běžný soubor s oprávněním 0600.')
            token = TOKEN_PATH.read_text().strip()
        except OSError:
            raise ReportError('Token chybí nebo není čitelný. Spusťte příkaz setup.') from None
    if not token or any(c.isspace() for c in token):
        raise ReportError('Token není platně zadaný.')
    return token


def save_private(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    if path.is_symlink():
        raise ReportError('Výstup nesmí být symbolický odkaz.')
    fd, temporary = tempfile.mkstemp(dir=path.parent, prefix='.matomo-')
    try:
        with os.fdopen(fd, 'w') as stream:
            stream.write(content)
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def api(method: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
    if method not in METHODS:
        raise ReportError('Metoda není povolená pro čtení statistik tohoto projektu.')
    params = params or {}
    if set(params) - PARAMETERS:
        raise ReportError('Nepovolený parametr API.')
    public_params = {'module': 'API', 'method': method, 'idSite': SITE_ID,
                     'format': 'JSON', 'language': 'en', 'format_metrics': 0,
                     'filter_limit': -1, **params}
    body = urlencode({**public_params, 'token_auth': read_token()}).encode()
    request = Request(ENDPOINT, data=body, method='POST',
                      headers={'Content-Type': 'application/x-www-form-urlencoded',
                               'User-Agent': 'stredniskoly-matomo-reports/1.0'})
    try:
        with build_opener(NoRedirect).open(request, timeout=45) as response:
            raw = response.read(25_000_001)
    except HTTPError as exc:
        raise ReportError(f'Matomo HTTP {exc.code}; token ani odpověď se nevypisují.') from None
    except (URLError, TimeoutError, OSError):
        raise ReportError('Matomo není dostupné nebo vypršel čas požadavku.') from None
    if len(raw) > 25_000_000:
        raise ReportError('Report je příliš velký; zkraťte období.')
    try:
        data = json.loads(raw)
    except (ValueError, UnicodeDecodeError):
        raise ReportError('Matomo nevrátilo JSON.') from None
    if isinstance(data, dict) and data.get('result') == 'error':
        raise ReportError('API odmítlo požadavek; ověřte metodu a přístup příkazem doctor.')
    return {'fetched_at': datetime.now(ZoneInfo('UTC')).isoformat(),
            'endpoint': ENDPOINT, 'params': public_params,
            'response_sha256': hashlib.sha256(raw).hexdigest(), 'data': data}


def month_ranges(start: date, end: date) -> list[tuple[date, date]]:
    parts = []
    cursor = start
    while cursor <= end:
        stop = min(end, date(cursor.year, cursor.month, calendar.monthrange(cursor.year, cursor.month)[1]))
        parts.append((cursor, stop))
        cursor = stop + timedelta(days=1)
    return parts


def one(data: Any) -> dict[str, Any]:
    if isinstance(data, dict):
        return data
    if isinstance(data, list) and len(data) == 1 and isinstance(data[0], dict):
        return data[0]
    if data == []:
        return {}
    raise ReportError('Neočekávaný tvar souhrnného reportu.')


def summarize(source: Path) -> dict[str, Any]:
    """Exportuje jen souhrny; žádné volné dotazy, celé URL ani návštěvnické záznamy."""
    raw = source.read_bytes()
    data = json.loads(raw)
    reports = data['reports']
    visits = one(reports['visits']['data'])
    actions = one(reports['actions']['data'])
    returning = one(reports['returning']['data'])
    page_fields = ['nb_hits', 'nb_visits', 'entry_nb_visits']
    named_paths = ['/', '/simulator', '/simulator?srovnani=1', '/moje-sance',
                   '/skoly', '/dostupnost', '/vysledky/2026']
    named = {}
    groups: dict[str, dict[str, int]] = {}
    for row in reports['pages']['data']:
        label = row['label']
        if label in named_paths:
            named[label] = {k: row.get(k, 0) for k in page_fields}
        group = ('home_exact' if label == '/' else 'school_profiles_prefix'
                 if label.startswith('/skola/') else 'simulator_two_urls'
                 if label in ['/simulator', '/simulator?srovnani=1'] else 'other_pages')
        totals = groups.setdefault(group, {'pageviews': 0, 'entries': 0, 'page_visit_sum_not_unique': 0})
        for target, field in [('pageviews', 'nb_hits'), ('entries', 'entry_nb_visits'),
                              ('page_visit_sum_not_unique', 'nb_visits')]:
            totals[target] += row.get(field, 0)
    devices = {r['label']: r.get('nb_visits', 0) for r in reports['devices']['data']}
    referrers = {r['label']: r.get('nb_visits', 0) for r in reports['referrers']['data']}
    monthly = []
    for month in data['monthly']:
        v, a = one(month['visits']['data']), one(month['actions']['data'])
        monthly.append({'start': month['start'], 'end': month['end'],
                        'visits': v.get('nb_visits', 0), 'actions': v.get('nb_actions', 0),
                        'pageviews': a.get('nb_pageviews', 0),
                        'avg_time_seconds': v.get('avg_time_on_site'), 'bounce_rate': v.get('bounce_rate'),
                        'simulator_exact_page_visits': sum(r.get('nb_visits', 0) for r in month['pages']['data'] if r['label'] == '/simulator'),
                        'moje_sance_exact_page_visits': sum(r.get('nb_visits', 0) for r in month['pages']['data'] if r['label'] == '/moje-sance')})
    count = visits.get('nb_visits', 0)
    entry_count = sum(g['entries'] for g in groups.values())
    return {
        'schema_version': 1, 'source': {'endpoint': ENDPOINT, 'idSite': SITE_ID,
            'snapshot_sha256': hashlib.sha256(raw).hexdigest(),
            'start': data['start'], 'end_inclusive': data['end_inclusive'],
            'timezone': data['timezone'], 'partial_current_day': data['partial_current_day'],
            'queries': {key: {'params': report['params'], 'fetched_at': report['fetched_at'],
                              'response_sha256': report['response_sha256']} for key, report in reports.items()}},
        'visits': count, 'actions': visits.get('nb_actions', 0), 'pageviews': actions.get('nb_pageviews', 0),
        'avg_time_seconds': visits.get('avg_time_on_site'),
        'returning': {key: returning.get(key) for key in ['nb_visits_new', 'nb_visits_returning',
                                                       'avg_time_on_site_new', 'avg_time_on_site_returning']},
        'devices_visits': devices, 'referrers_visits': referrers,
        'phone_share': (devices.get('Smartphone', 0) + devices.get('Phablet', 0)) / count if count else None,
        'monthly': monthly, 'named_pages': named, 'page_groups': groups,
        'events_report_rows': len(reports['events']['data']),
        'checks': {
            'monthly_visits_match': sum(m['visits'] for m in monthly) == count,
            'device_visits_match': sum(devices.values()) == count,
            'referrer_visits_match': sum(referrers.values()) == count,
            'pageviews_match': sum(g['pageviews'] for g in groups.values()) == actions.get('nb_pageviews', 0),
            'entry_visits_unreconciled': count - entry_count,
            'new_plus_returning_minus_total': returning.get('nb_visits_new', 0) + returning.get('nb_visits_returning', 0) - count,
        },
        'limits': ['Návštěvy nejsou lidé ani rodiny; skupinové návštěvy stránek nelze sčítat jako jedinečné návštěvy.',
                   'Skupina school_profiles_prefix zahrnuje podstránky i agregát Others.',
                   'simulator_two_urls zahrnuje jen /simulator a /simulator?srovnani=1.',
                   'Neuzavřené rozdíly kontrol se nesmějí automaticky přerozdělit mezi kategorie.'],
    }


def snapshot(start: date, end: date) -> dict[str, Any]:
    if start > end:
        raise ReportError('Začátek období je po konci.')
    reports = {}
    for key, method in {
        'visits': 'VisitsSummary.get', 'actions': 'Actions.get',
        'pages': 'Actions.getPageUrls', 'entries': 'Actions.getEntryPageUrls',
        'devices': 'DevicesDetection.getType', 'referrers': 'Referrers.getReferrerType',
        'socials': 'Referrers.getSocials', 'returning': 'VisitFrequency.get',
        'search': 'Actions.getSiteSearchKeywords', 'events': 'Events.getCategory',
    }.items():
        reports[key] = api(method, {'period': 'range', 'date': f'{start},{end}', 'flat': 1})
    monthly = []
    for first, last in month_ranges(start, end):
        params = {'period': 'range', 'date': f'{first},{last}'}
        monthly.append({'start': str(first), 'end': str(last),
                        'visits': api('VisitsSummary.get', params),
                        'actions': api('Actions.get', params),
                        'pages': api('Actions.getPageUrls', {**params, 'flat': 1})})
    return {'schema_version': 1, 'site_id': SITE_ID, 'timezone': 'Europe/Prague',
            'start': str(start), 'end_inclusive': str(end),
            'partial_current_day': end >= datetime.now(ZoneInfo('Europe/Prague')).date(),
            'site': api('SitesManager.getSiteFromId'), 'reports': reports, 'monthly': monthly}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest='command', required=True)
    commands.add_parser('setup', help='Zadá token skrytě a uloží jej mimo repozitář.')
    commands.add_parser('doctor', help='Ověří přístup a totožnost webu, nevypisuje token.')
    summary = commands.add_parser('summarize', help='Z lokálního snímku vytvoří souhrn bez dotazů vyhledávání a osobních URL.')
    summary.add_argument('source', type=Path)
    summary.add_argument('--output', type=Path)
    report = commands.add_parser('report', help='Jednotlivý agregovaný report.')
    report.add_argument('--method', choices=sorted(METHODS), required=True)
    report.add_argument('--period', choices=['day', 'week', 'month', 'year', 'range'], default='range')
    report.add_argument('--date', required=True)
    report.add_argument('--segment')
    report.add_argument('--flat', action='store_true')
    report.add_argument('--output', type=Path)
    snap = commands.add_parser('snapshot', help='Přehled se shodnými hranicemi a měsíčními řezy.')
    yesterday = datetime.now(ZoneInfo('Europe/Prague')).date() - timedelta(days=1)
    snap.add_argument('--start', type=date.fromisoformat, default=yesterday-timedelta(days=27))
    snap.add_argument('--end', type=date.fromisoformat, default=yesterday)
    snap.add_argument('--output', type=Path)
    args = parser.parse_args()
    if args.command == 'setup':
        if not sys.stdin.isatty():
            raise ReportError('Setup vyžaduje interaktivní terminál; pro automatizaci použijte MATOMO_TOKEN.')
        value = getpass.getpass('Matomo token (nebude zobrazen): ').strip()
        if not value or any(c.isspace() for c in value):
            raise ReportError('Token je prázdný nebo obsahuje bílé znaky.')
        save_private(TOKEN_PATH, value)
        print('Token uložen mimo repozitář s oprávněním 0600.')
        return
    if args.command == 'doctor':
        data = api('SitesManager.getSiteFromId')['data']
        row = data[0] if isinstance(data, list) else data
        if str(row.get('idsite')) != str(SITE_ID) or row.get('main_url') != 'https://www.prijimackynaskolu.cz':
            raise ReportError('Matomo vrátilo jiný web než očekávaný projekt.')
        print(json.dumps({k: row.get(k) for k in ['idsite', 'name', 'main_url', 'timezone', 'ts_created']}, ensure_ascii=False, indent=2))
        return
    if args.command == 'summarize':
        result = summarize(args.source)
        stem = 'summary'
    elif args.command == 'snapshot':
        result = snapshot(args.start, args.end)
        stem = f'snapshot-{args.start}-{args.end}'
    else:
        params = {'period': args.period, 'date': args.date, 'flat': int(args.flat)}
        if args.segment:
            params['segment'] = args.segment
        result = api(args.method, params)
        stem = args.method.replace('.', '-')
    timestamp = datetime.now(ZoneInfo('UTC')).strftime('%Y%m%dT%H%M%S%fZ')
    path = args.output or CACHE_ROOT / f'{stem}-{timestamp}.json'
    save_private(path, json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(f'Report uložen: {path.resolve()}')


if __name__ == '__main__':
    try:
        main()
    except ReportError as error:
        print(f'Chyba: {error}', file=sys.stderr)
        sys.exit(1)
