#!/usr/bin/env python3
"""Vybere další vlnu veřejných středních škol pro pozvánky do portálu.

Výběr je deterministický: počty v krajích odpovídají počtu způsobilých škol,
v každém kraji drží přibližně třetinu gymnázií a přednost dostávají školy
s více přihláškami v roce 2026. Školy z předchozích vln ani školy s aktivním
kódem se znovu nevybírají. Výstupní kontakty zůstávají v gitignorovaném souboru.

Použití:
  python3 scripts/portal-vyber-vlny.py --vlna 3 --pocet vse --nanecisto
  python3 scripts/portal-vyber-vlny.py --vlna 3 --pocet vse

  --vlna <číslo>   číslo nové vlny; musí navazovat na poslední vlnu v pilot.json
  --pocet <n|vse>  kolik škol vybrat; „vse“ vezme všechny způsobilé
  --nanecisto      jen vypíše počty, nic nezapíše
"""
import argparse
import collections
import datetime
import csv
import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PILOT = ROOT / 'data/portal/pilot.json'
KONTAKTY = ROOT / 'data/portal/pilot-kontakty.json'
KODY = ROOT / 'data/portal/kody.json'
ADRESAR = ROOT / 'data/Rejstrik_skol/Adresar.csv'
KATALOG = ROOT / 'public/schools_data.json'
KRITERIA = ('Veřejné školy (zřizovatel mimo 5 a 6), úplné výsledky PŘ 2026 bez min_body; rejstříkový e-mail, ředitel, web a datová schránka; e-mail jedinečný v rejstříku; bez předchozí pozvánky a aktivního kódu. Počty podle krajů úměrně počtu způsobilých škol, asi třetina gymnázií, v každé skupině přednost podle počtu přihlášek.')


def hlavni_email(hodnota):
    """Rejstřík někdy ukládá dvě adresy do Email 1 oddělené středníkem."""
    email = hodnota.split(';', 1)[0].strip()
    return email if re.fullmatch(r'[^\s@;]+@[^\s@;]+\.[^\s@;]+', email) else ''


def nacti(cesta):
    return json.loads(cesta.read_text(encoding='utf-8'))


def rozdel_sloty(pocty, celkem):
    zaklad = {k: celkem * n // sum(pocty.values()) for k, n in pocty.items()}
    zbyva = celkem - sum(zaklad.values())
    poradi = sorted(pocty, key=lambda k: (-(celkem * pocty[k] % sum(pocty.values())), k))
    for k in poradi[:zbyva]:
        zaklad[k] += 1
    return zaklad


def argumenty():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument('--vlna', type=int, required=True)
    parser.add_argument('--pocet', required=True, help='počet škol nebo „vse“')
    parser.add_argument('--nanecisto', action='store_true')
    args = parser.parse_args()
    if args.pocet != 'vse' and not (args.pocet.isdigit() and int(args.pocet) > 0):
        parser.error('--pocet musí být kladné celé číslo nebo „vse“')
    return args


def main():
    args = argumenty()
    if subprocess.run(['git', 'check-ignore', '-q', str(KONTAKTY)], cwd=ROOT).returncode:
        raise SystemExit('Soubor kontaktů musí být gitignorovaný.')
    pilot, kontakty, kody = nacti(PILOT), nacti(KONTAKTY), nacti(KODY)
    posledni = max(s.get('vlna', 1) for s in pilot['skoly'])
    if args.vlna != posledni + 1:
        raise SystemExit(f'Poslední vlna v pilot.json je {posledni}, nová musí mít číslo {posledni + 1}.')
    if {s['redizo'] for s in pilot['skoly']} != {s['redizo'] for s in kontakty['skoly']}:
        raise SystemExit('pilot.json a pilot-kontakty.json neobsahují tytéž školy.')

    adresar_radky = list(csv.DictReader(ADRESAR.open(encoding='utf-8-sig'), delimiter=';'))
    adresar = {r['RED_IZO']: r for r in adresar_radky}
    pocty_emailu = collections.Counter(hlavni_email(r['Email 1']).casefold() for r in adresar_radky if hlavni_email(r['Email 1']))
    katalog = collections.defaultdict(list)
    for radek in nacti(KATALOG)['2026']:
        katalog[str(radek['redizo'])].append(radek)

    puvodni = {s['redizo'] for s in pilot['skoly']}
    aktivni_kod = {s['redizo'] for s in kody['kody'] if not s.get('revokovano')}
    puvodni_email = {hlavni_email(s['email_rejstrik']).strip().casefold() for s in kontakty['skoly']}
    kandidati = collections.defaultdict(lambda: collections.defaultdict(list))
    for redizo, obory in katalog.items():
        r = adresar.get(redizo)
        if redizo in puvodni or redizo in aktivni_kod or not r or r['Zřizovatel'] in ('5', '6'):
            continue
        if not all(r[p].strip() for p in ('Email 1', 'Ředitel', 'WWW', 'ID dat. schránky subjektu')):
            continue
        email = hlavni_email(r['Email 1']).casefold()
        if email in puvodni_email or pocty_emailu[email] != 1:
            continue
        # min_body je historický údaj 2025, který web nezobrazuje; pro výběr
        # druhé vlny ho nevyžadujeme (viz vada v portal-vyber-pilotu.py).
        if not all((o.get('kapacita') or 0) > 0 and (o.get('prihlasky') or 0) > 0
                   and o.get('prijati') is not None for o in obory):
            continue
        gym = 2 * sum(o['typ'].startswith('GY') for o in obory) >= len(obory)
        typ = 'gymnázium' if gym else 'odborná'
        velikost = sum(o['prihlasky'] for o in obory)
        kandidati[obory[0]['kraj_kod']][typ].append((velikost, redizo, r, obory))

    pocty = {k: sum(map(len, typy.values())) for k, typy in kandidati.items()}
    zpusobile = sum(pocty.values())
    celkem = zpusobile if args.pocet == 'vse' else int(args.pocet)
    if celkem == 0:
        raise SystemExit('Žádná způsobilá škola nezbývá, vlna by byla prázdná.')
    if celkem > zpusobile:
        raise SystemExit(f'Způsobilých škol je jen {zpusobile}, požadováno {celkem}.')
    sloty = rozdel_sloty(pocty, celkem)
    nove = []
    nove_kontakty = []
    for kraj in sorted(sloty):
        limit = sloty[kraj]
        gym = min(round(limit / 3), len(kandidati[kraj]['gymnázium']))
        odborne = limit - gym
        if odborne > len(kandidati[kraj]['odborná']):
            gym += odborne - len(kandidati[kraj]['odborná'])
            odborne = limit - gym
        for typ, pocet in (('gymnázium', gym), ('odborná', odborne)):
            for velikost, redizo, r, obory in sorted(kandidati[kraj][typ], key=lambda x: (-x[0], x[1]))[:pocet]:
                nove.append({
                    'redizo': redizo, 'nazev': r['Plný název'].strip() or obory[0]['nazev'],
                    'mesto': r['Místo'].strip(), 'typ': typ, 'velikost_ukazatel': velikost,
                    'pozvanka_odeslana': None, 'vlna': args.vlna,
                })
                nove_kontakty.append({
                    'redizo': redizo, 'email_rejstrik': hlavni_email(r['Email 1']),
                    'reditel': r['Ředitel'].strip(), 'www': r['WWW'].strip(),
                })

    if len(nove) != celkem or len({s['redizo'] for s in nove}) != celkem:
        raise SystemExit(f'Výběr není přesně {celkem} unikátních škol: {len(nove)}.')
    print(f'Způsobilých {zpusobile}, vybráno {len(nove)} škol; podle krajů: {dict(sorted(sloty.items()))}')
    print(f'Typy: {dict(collections.Counter(s["typ"] for s in nove))}')
    if args.nanecisto:
        print('Nanečisto, nic se nezapsalo.')
        return
    pilot['skoly'].extend(nove)
    pilot.setdefault('vlny', {})[str(args.vlna)] = {
        'vybrano': datetime.date.today().isoformat(), 'pocet': celkem, 'kriteria': KRITERIA}
    kontakty['skoly'].extend(nove_kontakty)
    PILOT.write_text(json.dumps(pilot, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    KONTAKTY.write_text(json.dumps(kontakty, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print('Přidány do data/portal/pilot.json a gitignorovaných pilot-kontakty.json.')


if __name__ == '__main__':
    main()
