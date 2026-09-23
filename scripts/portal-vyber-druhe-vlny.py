#!/usr/bin/env python3
"""Vybere 100 dalších veřejných středních škol pro pozvánky do portálu.

Výběr je deterministický: počty v krajích odpovídají počtu způsobilých škol,
v každém kraji drží přibližně třetinu gymnázií a přednost dostávají školy
s více přihláškami v roce 2026. Původních 20 škol ani školy s aktivním kódem
se znovu nevybírají. Výstupní kontakty zůstávají v gitignorovaném souboru.

Použití: python3 scripts/portal-vyber-druhe-vlny.py
"""
import collections
import csv
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PILOT = ROOT / 'data/portal/pilot.json'
KONTAKTY = ROOT / 'data/portal/pilot-kontakty.json'
KODY = ROOT / 'data/portal/kody.json'
ADRESAR = ROOT / 'data/Rejstrik_skol/Adresar.csv'
KATALOG = ROOT / 'public/schools_data.json'
POCET = 100


def nacti(cesta):
    return json.loads(cesta.read_text(encoding='utf-8'))


def rozdel_sloty(pocty, celkem):
    zaklad = {k: celkem * n // sum(pocty.values()) for k, n in pocty.items()}
    zbyva = celkem - sum(zaklad.values())
    poradi = sorted(pocty, key=lambda k: (-(celkem * pocty[k] % sum(pocty.values())), k))
    for k in poradi[:zbyva]:
        zaklad[k] += 1
    return zaklad


def main():
    if subprocess.run(['git', 'check-ignore', '-q', str(KONTAKTY)], cwd=ROOT).returncode:
        raise SystemExit('Soubor kontaktů musí být gitignorovaný.')
    pilot, kontakty, kody = nacti(PILOT), nacti(KONTAKTY), nacti(KODY)
    if len(pilot['skoly']) != 20 or len(kontakty['skoly']) != 20:
        raise SystemExit('Výběr druhé vlny se smí spustit jen nad původními 20 školami.')

    adresar_radky = list(csv.DictReader(ADRESAR.open(encoding='utf-8-sig'), delimiter=';'))
    adresar = {r['RED_IZO']: r for r in adresar_radky}
    pocty_emailu = collections.Counter(r['Email 1'].strip().casefold() for r in adresar_radky if r['Email 1'].strip())
    katalog = collections.defaultdict(list)
    for radek in nacti(KATALOG)['2026']:
        katalog[str(radek['redizo'])].append(radek)

    puvodni = {s['redizo'] for s in pilot['skoly']}
    aktivni_kod = {s['redizo'] for s in kody['kody'] if not s.get('revokovano')}
    puvodni_email = {s['email_rejstrik'].strip().casefold() for s in kontakty['skoly']}
    kandidati = collections.defaultdict(lambda: collections.defaultdict(list))
    for redizo, obory in katalog.items():
        r = adresar.get(redizo)
        if redizo in puvodni or redizo in aktivni_kod or not r or r['Zřizovatel'] in ('5', '6'):
            continue
        if not all(r[p].strip() for p in ('Email 1', 'Ředitel', 'WWW', 'ID dat. schránky subjektu')):
            continue
        email = r['Email 1'].strip().casefold()
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
    sloty = rozdel_sloty(pocty, POCET)
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
                    'pozvanka_odeslana': None, 'vlna': 2,
                })
                nove_kontakty.append({
                    'redizo': redizo, 'email_rejstrik': r['Email 1'].strip(),
                    'reditel': r['Ředitel'].strip(), 'www': r['WWW'].strip(),
                })

    if len(nove) != POCET or len({s['redizo'] for s in nove}) != POCET:
        raise SystemExit(f'Výběr není přesně {POCET} unikátních škol: {len(nove)}.')
    pilot['skoly'].extend(nove)
    pilot['druha_vlna'] = {'vybrano': '2026-09-23', 'pocet': POCET,
        'kriteria': 'Veřejné školy (zřizovatel mimo 5 a 6), úplné výsledky PŘ 2026 bez min_body; rejstříkový e-mail, ředitel, web a datová schránka; e-mail jedinečný v rejstříku; bez předchozí pozvánky a aktivního kódu. Počty podle krajů úměrně počtu způsobilých škol, asi třetina gymnázií, v každé skupině přednost podle počtu přihlášek.'}
    kontakty['skoly'].extend(nove_kontakty)
    PILOT.write_text(json.dumps(pilot, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    KONTAKTY.write_text(json.dumps(kontakty, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print(f'Vybráno {len(nove)} škol; podle krajů: {dict(sorted(collections.Counter(k for k, n in sloty.items() for _ in range(n)).items()))}')
    print(f'Typy: {dict(collections.Counter(s["typ"] for s in nove))}')
    print('Přidány do data/portal/pilot.json a gitignorovaných pilot-kontakty.json.')


if __name__ == '__main__':
    main()
