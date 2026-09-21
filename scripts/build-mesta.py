#!/usr/bin/env python3
"""Vygeneruje `src/lib/mesta.mjs` ze zobrazeného ročníku katalogu.

Seznam měst se neudržuje ručně. Do seznamu jde obec, která má aspoň
`PRAH_SKOL` škol v zobrazeném ročníku, plus všechna města, která stránku
už mají — aby se zveřejněný odkaz nikdy nerozbil, i když obec pod práh
spadne (Teplice mají 5 škol, ale stránku měly dřív, než práh vznikl).

Ročník se bere z registru stavu datových sad, nikdy z letopočtu v kódu
(CLAUDE.md, oddíl Stav datových sad, pravidlo 1).

Spuštění: python3 scripts/build-mesta.py [--kontrola]
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import unicodedata
from pathlib import Path

KOREN = Path(__file__).resolve().parent.parent
KATALOG = KOREN / 'public' / 'schools_data.json'
REGISTR = KOREN / 'public' / 'stav_datovych_sad.json'
VYSTUP = KOREN / 'src' / 'lib' / 'mesta.mjs'

#: Obec s méně školami dostane stránku, na které by rozložení obtížnosti
#: přijetí nic neukázalo. Rozhodnutí zadavatele z 21. 9. 2026.
PRAH_SKOL = 3

#: Města zveřejněná před zavedením prahu. Zůstávají v seznamu bez ohledu na
#: počet škol, aby se nerozbily odkazy a vyhledávače nenašly 404.
PUVODNI_MESTA = (
    'Praha', 'Brno', 'Ostrava', 'Plzeň', 'Liberec', 'Olomouc',
    'Ústí nad Labem', 'České Budějovice', 'Hradec Králové', 'Pardubice',
    'Havířov', 'Zlín', 'Kladno', 'Most', 'Opava', 'Frýdek-Místek',
    'Karviná', 'Jihlava', 'Děčín', 'Teplice',
)

#: Kraj v katalogu nese krátký název, stránka a sitemapa celý.
CELY_NAZEV_KRAJE = {
    'Hlavní město Praha': 'Hlavní město Praha',
    'Praha': 'Hlavní město Praha',
    'Vysočina': 'Kraj Vysočina',
    'Kraj Vysočina': 'Kraj Vysočina',
}


def slug(text: str) -> str:
    """Bezdiakritický slug pro adresu stránky."""
    zaklad = unicodedata.normalize('NFD', text)
    zaklad = ''.join(z for z in zaklad if unicodedata.category(z) != 'Mn')
    zaklad = zaklad.lower().replace('ł', 'l').replace('đ', 'd')
    zaklad = re.sub(r'[^a-z0-9]+', '-', zaklad)
    return zaklad.strip('-')


def nazev_kraje(kraj: str) -> str:
    if kraj in CELY_NAZEV_KRAJE:
        return CELY_NAZEV_KRAJE[kraj]
    return kraj if kraj.endswith('kraj') else f'{kraj} kraj'


def zobrazene_obdobi() -> str:
    """Ročník katalogu podle registru, ne podle letopočtu v kódu."""
    registr = json.loads(REGISTR.read_text(encoding='utf-8'))
    return str(registr['sady']['cermat-prihlasky']['zobrazeno']['obdobi'])


def sesbirej_mesta() -> list[dict[str, str]]:
    katalog = json.loads(KATALOG.read_text(encoding='utf-8'))
    obdobi = zobrazene_obdobi()
    rocnik = katalog.get(obdobi)
    if not rocnik:
        dostupne = ', '.join(sorted(k for k in katalog if k.isdigit()))
        sys.exit(
            f'Katalog nemá ročník {obdobi} podle registru. Dostupné: {dostupne}.'
        )

    skoly: dict[str, set[str]] = {}
    kraje: dict[str, str] = {}
    for radek in rocnik:
        obec = (radek.get('obec') or '').strip()
        if not obec:
            continue
        skoly.setdefault(obec, set()).add(str(radek.get('redizo')))
        if radek.get('kraj'):
            kraje.setdefault(obec, radek['kraj'])

    vybrane = {
        obec for obec, redizo in skoly.items()
        if len(redizo) >= PRAH_SKOL or obec in PUVODNI_MESTA
    }

    chybejici = [m for m in PUVODNI_MESTA if m not in skoly]
    if chybejici:
        sys.exit(
            'Tato zveřejněná města nejsou v katalogu ročníku '
            f'{obdobi}: {", ".join(chybejici)}. Odkaz by vrátil 404, '
            'takže seznam nevznikl.'
        )

    # Největší nabídka první; při shodě podle názvu bez diakritiky, aby
    # Říčany neskončily za Zábřehem (Python řadí podle kódu znaku).
    return [
        {
            'nazev': obec,
            'slug': slug(obec),
            'kraj': nazev_kraje(kraje.get(obec, '')),
            'skol': len(skoly[obec]),
        }
        for obec in sorted(vybrane, key=lambda o: (-len(skoly[o]), slug(o)))
    ]


def vykresli(mesta: list[dict[str, str]], obdobi: str) -> str:
    def apostrofovy(text: str) -> str:
        """Do JS literálu v apostrofech; dnes žádná obec apostrof nemá,
        nový ročník ho ale přinést může."""
        return "'" + text.replace('\\', '\\\\').replace("'", "\\'") + "'"

    radky = '\n'.join(
        f"  {{ nazev: {apostrofovy(m['nazev'])}, slug: '{m['slug']}', "
        f"kraj: {apostrofovy(m['kraj'])} }},"
        for m in mesta
    )
    return (
        '// Sdílený seznam měst pro stránky i sitemapu.\n'
        '//\n'
        '// NEUPRAVOVAT RUČNĚ. Generuje `scripts/build-mesta.py` z katalogu\n'
        f'// za ročník {obdobi} podle registru stavu datových sad. Do seznamu jde\n'
        f'// obec s aspoň {PRAH_SKOL} školami a všechna města zveřejněná dřív,\n'
        '// aby se nerozbily odkazy. Řazeno podle počtu škol.\n'
        f'export const MESTA = /** @type {{const}} */ ([\n{radky}\n]);\n'
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        '--kontrola', action='store_true',
        help='jen ověří, že soubor odpovídá datům; nic nezapisuje',
    )
    args = parser.parse_args()

    obdobi = zobrazene_obdobi()
    mesta = sesbirej_mesta()
    obsah = vykresli(mesta, obdobi)

    if args.kontrola:
        stary = VYSTUP.read_text(encoding='utf-8') if VYSTUP.exists() else ''
        if stary != obsah:
            sys.exit(
                'src/lib/mesta.mjs neodpovídá datům. '
                'Spusť python3 scripts/build-mesta.py'
            )
        print(f'Seznam měst odpovídá datům: {len(mesta)} měst, ročník {obdobi}.')
        return

    VYSTUP.write_text(obsah, encoding='utf-8')
    print(f'Zapsáno {len(mesta)} měst do {VYSTUP.relative_to(KOREN)} (ročník {obdobi}).')
    pod_prahem = [m['nazev'] for m in mesta if m['skol'] < PRAH_SKOL]
    if pod_prahem:
        print(f'Pod prahem, drženo kvůli odkazům: {", ".join(pod_prahem)}.')


if __name__ == '__main__':
    main()
