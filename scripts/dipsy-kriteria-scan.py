#!/usr/bin/env python3
"""Ověří, zda DiPSy skutečně zveřejnilo nabídky dané školy a ročníku.

  python3 scripts/dipsy-kriteria-scan.py --rok 2027 --redizo 600171701

Dotaz na neexistující ročník může vrátit data minulého roku. Skript proto
kontroluje `skolniRok` každé karty i REDIZO školy a neukládá dočasné odkazy.
"""

import argparse
import json
import requests

URL = 'https://api.dipsy.gov.cz/v1/skol-oboro-forma/kolo/{kolo}/search/'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--rok', type=int, required=True)
    parser.add_argument('--redizo', required=True)
    parser.add_argument('--kolo', type=int, default=1)
    args = parser.parse_args()
    if args.rok < 2025 or args.rok > 2100 or not args.redizo.isdigit() or args.kolo not in (1, 2, 3):
        parser.error('Neplatný rok, REDIZO nebo kolo (1 až 3).')
    response = requests.get(URL.format(kolo=args.kolo), params={'skolniRok': args.rok, 'keywords': args.redizo}, timeout=25)
    response.raise_for_status()
    cards = response.json().get('data', [])
    if not isinstance(cards, list):
        raise ValueError('DiPSy vrátilo neočekávaný formát.')
    found = []
    for card in cards:
        if card.get('skolniRok') != args.rok or card.get('kolo') != args.kolo:
            continue
        if str((card.get('reditelstviSkoly') or {}).get('redizo')) != args.redizo:
            continue
        found.append({
            'id': card['id'],
            'rok': card['skolniRok'],
            'kolo': card['kolo'],
            'redizo': args.redizo,
            'kkov': (card.get('skolniObor') or {}).get('kod'),
            'zamereni': card.get('zamereni') or '',
        })
    print(json.dumps({'dotaz': {'rok': args.rok, 'kolo': args.kolo, 'redizo': args.redizo}, 'nabidky': found}, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
