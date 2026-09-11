#!/usr/bin/env python3
"""Vytvoří celodenní ICS z téhož zdroje jako web. End v JSON je včetně dne."""
import json
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def escape(value: str) -> str:
    return value.replace('\\', '\\\\').replace('\n', '\\n').replace(';', '\\;').replace(',', '\\,')


def fold(line: str) -> str:
    parts, current = [], ''
    for char in line:
        if len((current + char).encode('utf-8')) > 75:
            trimmed = current.rstrip(' ')
            parts.append(trimmed)
            current = ' ' + current[len(trimmed):]
        current += char
    return '\r\n'.join(parts + [current])


def generate(calendar: dict) -> str:
    lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Prijimacky na skolu//Kalendar 2027//CS', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:Přijímačky 2027']
    for group in calendar['groups']:
        for event in group['events']:
            start = date.fromisoformat(event['start'])
            end = date.fromisoformat(event.get('end', event['start'])) + timedelta(days=1)
            assert start < end
            lines.extend(['BEGIN:VEVENT', f"UID:{event['id']}-2027@prijimackynaskolu.cz", f"DTSTAMP:{calendar['checkedAt'].replace('-', '')}T000000Z", f'DTSTART;VALUE=DATE:{start:%Y%m%d}', f'DTEND;VALUE=DATE:{end:%Y%m%d}', 'SUMMARY:' + escape(event['title']), 'DESCRIPTION:' + escape(group['title'] + '\n' + event['note'] + '\nZdroj: ' + calendar['source']), 'URL:https://www.prijimackynaskolu.cz/prijimacky-2027#' + group['id'], 'TRANSP:TRANSPARENT', 'END:VEVENT'])
    return '\r\n'.join(fold(line) for line in lines + ['END:VCALENDAR']) + '\r\n'


if __name__ == '__main__':
    calendar = json.loads((ROOT / 'src/data/admissions-2027.json').read_text())
    (ROOT / 'public/prijimacky-2027.ics').write_bytes(generate(calendar).encode('utf-8'))
