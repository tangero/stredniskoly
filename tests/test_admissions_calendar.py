import importlib.util
import json
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('calendar_export', ROOT / 'scripts/generate-admissions-calendar.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
DATA = json.loads((ROOT / 'src/data/admissions-2027.json').read_text())
EVENTS = {e['id']: e for g in DATA['groups'] for e in g['events']}


def test_deadlines_and_exam_dates():
    assert EVENTS['ss-prihlasky']['end'] == '2027-02-22'
    assert EVENTS['kon-prihlasky']['end'] == '2026-11-30'
    assert [EVENTS[e]['start'] for e in ('jpz-4-1', 'jpz-4-2', 'jpz-vice-1', 'jpz-vice-2')] == ['2027-04-12', '2027-04-13', '2027-04-14', '2027-04-15']
    assert EVENTS['ss-vysledky']['start'] == '2027-05-14'
    assert EVENTS['k2-vysledky']['start'] == '2027-06-22'
    assert date.fromisoformat(EVENTS['ss-prihlasky']['end']).weekday() == 0


def test_export_is_current_and_rfc5545_dates_are_exclusive():
    exported = module.generate(DATA)
    assert (ROOT / 'public/prijimacky-2027.ics').read_bytes() == exported.encode()
    assert exported.count('BEGIN:VEVENT') == len(EVENTS) == 20
    blocks = exported.split('BEGIN:VEVENT')
    deadline = next(b for b in blocks if 'UID:ss-prihlasky-' in b)
    assert 'DTSTART;VALUE=DATE:20270201\r\n' in deadline
    assert 'DTEND;VALUE=DATE:20270223\r\n' in deadline
    exam = next(b for b in blocks if 'UID:jpz-4-1-' in b)
    assert 'DTEND;VALUE=DATE:20270413\r\n' in exam
    assert all(len(line.encode()) <= 75 for line in exported.split('\r\n'))
    assert len({b.split('UID:')[1].split('\r\n')[0] for b in blocks[1:]}) == len(EVENTS)
