#!/usr/bin/env python3
"""Výběr 20 škol do pilotu účtů portálu (docs/ucty-portalu-skol-2027.md, oddíl 9).

Takhle vznikl data/portal/pilot.json 19. 9. 2026. Kritéria jsou zapsaná
i v poli `kriteria` v pilot.json; seed je pevný, takže při stejných datech
vyjde stejný výběr.

Použití (z kořene repozitáře):
    python3 scripts/portal-vyber-pilotu.py --adresar ../data/Rejstrik_skol/Adresar.csv \
        --out data/portal/pilot-vysledek.json

Rejstřík CSV je v .gitignore (data/*), leží v hlavním pracovním stromu. Výstup
obsahuje jméno ředitele a rejstříkový e-mail, tedy osobní údaje: zapisuje se
jen do gitignorovaného souboru nebo mimo repozitář, na stdout jde jen přehled.

Známá vada výběru: kritérium úplnosti vyžaduje min_body u každé nabídky. To je
historický údaj 2025 (build-catalogue-2026.py, HISTORICKE), web ho nezobrazuje
a chybí u 412 z 3 224 nabídek, hlavně u nástaveb. Kvůli tomu v Českých
Budějovicích vypadly všechny velké odborné školy. Ponecháno kvůli
reprodukovatelnosti; při dalším výběru kritérium vypustit.
"""
import argparse
import collections
import csv
import json
import math
import os
import random
import subprocess
import sys

SEED = 20260919

# Školy s testovacími kódy z 13. 9. 2026 (commit b95a97c, revokovány). Výběr je
# vyloučil podmínkou „škola nemá kód v kody.json“; dnešní kody.json už nese
# kódy pilotu, proto je seznam pevný.
MELY_KOD_PRED_VYBEREM = {'600171701', '600007774'}

MESTA = [
    ('Praha', 5), ('Brno', 3), ('Ostrava', 2), ('Plzeň', 1), ('Liberec', 1), ('Olomouc', 1),
    ('České Budějovice', 1), ('Hradec Králové', 1), ('Ústí nad Labem', 1), ('Pardubice', 1),
    ('Zlín', 1), ('Havířov', 1), ('Kladno', 1),
]


def zobrazene_obdobi(registr: dict, sada: str) -> str:
    sady = registr.get('sady', registr)
    polozky = sady if isinstance(sady, list) else [dict(id=k, **v) for k, v in sady.items()]
    for x in polozky:
        if x.get('id') == sada:
            return x['zobrazeno']['obdobi']
    raise SystemExit(f'Sada {sada} není v registru.')


def je_gitignorovany(cesta: str) -> bool:
    return subprocess.run(['git', 'check-ignore', '-q', cesta], capture_output=True).returncode == 0


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    parser.add_argument('--adresar', required=True, help='Adresar.csv z rejstříku škol')
    parser.add_argument('--out', required=True, help='výstupní JSON (gitignorovaný nebo mimo repozitář)')
    args = parser.parse_args()

    out = os.path.abspath(args.out)
    koren = os.path.abspath('.')
    if out.startswith(koren + os.sep) and not je_gitignorovany(out):
        sys.exit(f'{args.out} není v .gitignore; výstup nese osobní údaje.')

    registr = json.load(open('public/stav_datovych_sad.json', encoding='utf-8'))
    rok = zobrazene_obdobi(registr, 'cermat-vysledky')
    rok_maturity = zobrazene_obdobi(registr, 'cermat-maturita')
    katalog = json.load(open('public/schools_data.json', encoding='utf-8'))[rok]
    maturita = json.load(open('public/maturita_skoly.json', encoding='utf-8'))['skoly']
    emaily = json.load(open('data/portal/emaily.json', encoding='utf-8'))
    sdilene = collections.Counter(e for v in emaily.values() for e in v)
    adresar = {
        r['RED_IZO']: r
        for r in csv.DictReader(open(args.adresar, encoding='utf-8-sig'), delimiter=';')
    }

    skoly: dict[str, list] = collections.defaultdict(list)
    for r in katalog:
        skoly[r['redizo']].append(r)

    def typ(rows: list) -> str:
        gy = sum(1 for r in rows if r['typ'].startswith('GY'))
        return 'gymnázium' if gy * 2 >= len(rows) else 'odborná'

    def velikost(rows: list) -> int:
        return sum((r.get('prihlasky') or 0) for r in rows)

    def duvody(redizo: str, rows: list) -> list[str]:
        d = []
        if not all(
            (r.get('kapacita') or 0) > 0 and (r.get('prihlasky') or 0) > 0
            and r.get('prijati') is not None and r.get('min_body') is not None
            for r in rows
        ):
            d.append('neúplné výsledky PŘ u oboru')
        a = adresar.get(redizo)
        if not a:
            d.append('není v rejstříku CSV')
        else:
            for k in ('Email 1', 'Ředitel', 'WWW', 'ID dat. schránky subjektu'):
                if not a[k].strip():
                    d.append(f'rejstřík bez {k}')
            if a['Zřizovatel'] in ('5', '6'):
                d.append('soukromá/církevní')
        em = emaily.get(redizo, [])
        if not em:
            d.append('bez e-mailu v emaily.json')
        if any(sdilene[e] > 1 for e in em):
            d.append('sdílený e-mail')
        if redizo in MELY_KOD_PRED_VYBEREM:
            d.append('už má kód')
        if redizo not in maturita or rok_maturity not in maturita[redizo]['roky']:
            d.append(f'bez maturity {rok_maturity}')
        return d

    rnd = random.Random(SEED)
    # Typové sloty: víceslotová města 1 gymnázium, zbytek odborné; z jednoslotových 4 gymnázia losem.
    jednoslotova = [m for m, n in MESTA if n == 1]
    gymnazia_losem = set(rnd.sample(jednoslotova, 4))
    vyber: list[dict] = []
    for mesto, n in MESTA:
        rediza = [x for x, rows in skoly.items() if rows[0]['obec'] == mesto]
        kandidati = {}
        for t in ('gymnázium', 'odborná'):
            podle_velikosti = sorted([x for x in rediza if typ(skoly[x]) == t], key=lambda x: -velikost(skoly[x]))
            horni_tercil = podle_velikosti[: max(1, math.ceil(len(podle_velikosti) / 3))]
            kandidati[t] = [x for x in horni_tercil if not duvody(x, skoly[x])]
        sloty = (['gymnázium' if mesto in gymnazia_losem else 'odborná'] if n == 1
                 else ['gymnázium'] + ['odborná'] * (n - 1))
        for t in sloty:
            vybrane = {o['redizo'] for o in vyber}
            volne = [x for x in kandidati[t] if x not in vybrane]
            if not volne:
                t = 'odborná' if t == 'gymnázium' else 'gymnázium'
                volne = [x for x in kandidati[t] if x not in vybrane]
            x = rnd.choice(sorted(volne))
            a = adresar[x]
            vyber.append(dict(
                redizo=x, nazev=a['Plný název'].strip() or skoly[x][0]['nazev'], mesto=mesto, typ=t,
                velikost_ukazatel=velikost(skoly[x]), email_rejstrik=a['Email 1'].strip(),
                reditel=a['Ředitel'].strip(), www=a['WWW'].strip(),
            ))

    json.dump(dict(seed=SEED, rok=rok, rok_maturity=rok_maturity, skoly=vyber),
              open(out, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    for o in vyber:
        print(f"{o['redizo']}  {o['mesto']:<18} {o['typ']:<10} {o['nazev']}")
    print(f'\n{len(vyber)} škol, podrobnosti v {args.out}')


if __name__ == '__main__':
    main()
