"""Reprodukovatelná matice pozorovaných rozdílů, nikoli automatická migrační mapa."""
import argparse
import hashlib
import itertools
import json
import re
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any, Callable

from import_cermat_results import is_valid_flat, load_flat_xlsx

ROOT = Path(__file__).resolve().parents[1]
FIELDS = ['REDIZO', 'IZO', 'NÁZEV ŠKOLY', 'ULICE', 'OBEC', 'PSČ', 'KKOV',
          'OBOR - NÁZEV', 'ZAMĚŘENÍ OBORU', 'DÉLKA STUDIA', 'FORMA VZDĚLÁVÁNÍ', 'JAZYK STUDIA', 'ID_SOF']
PROGRAM = ['KKOV', 'OBOR - NÁZEV', 'ZAMĚŘENÍ OBORU', 'DÉLKA STUDIA', 'FORMA VZDĚLÁVÁNÍ', 'JAZYK STUDIA']


def norm(value: Any) -> str:
    text = ''.join(c for c in unicodedata.normalize('NFD', str(value or '')).lower() if not unicodedata.combining(c))
    return re.sub(r'\s+', ' ', re.sub(r'[^a-z0-9/ ]', ' ', text)).strip()


def address(row: dict) -> str | None:
    street, city = norm(row['ULICE']), norm(row['OBEC'])
    return '|'.join([street, city, re.sub(r'\s', '', str(row['PSČ'] or ''))]) if city and re.search(r'\d', street) else None


def units(rows: list[dict]) -> tuple[list[dict], list[int]]:
    result, indexes, membership = [], {}, []
    for row in rows:
        values = (str(row['REDIZO']), str(row['IZO']), address(row), norm(row['NÁZEV ŠKOLY']))
        if values not in indexes:
            indexes[values] = len(result)
            result.append(dict(zip(['redizo', 'izo', 'address', 'name'], values)) | {'source': {k: row[k] for k in FIELDS[:6]}})
        membership.append(indexes[values])
    return result, membership


def unique_pairs(old: list[dict], new: list[dict], stages: list[tuple[str, Callable]]) -> tuple[list[dict], list[int], list[int]]:
    """Each stage only accepts a key occurring once on EACH still-unmatched side."""
    left, right, pairs = set(range(len(old))), set(range(len(new))), []
    for name, key in stages:
        a, b = defaultdict(list), defaultdict(list)
        for i in sorted(left):
            value = key(old[i])
            if value is not None:
                a[value].append(i)
        for j in sorted(right):
            value = key(new[j])
            if value is not None:
                b[value].append(j)
        for value in a.keys() & b.keys():
            if len(a[value]) == len(b[value]) == 1:
                i, j = a[value][0], b[value][0]
                pairs.append({'old': i, 'new': j, 'rule': name})
                left.remove(i)
                right.remove(j)
    return sorted(pairs, key=lambda p: p['new']), sorted(left), sorted(right)


def signature(old: dict, new: dict, keys: list[str]) -> str:
    return ''.join('?' if old[k] is None or new[k] is None else '=' if old[k] == new[k] else '≠' for k in keys)


def all_cells(pairs: list[dict], width: int) -> list[dict]:
    counts = Counter(p['signature'] for p in pairs)
    codes = [''.join(v) for v in itertools.product('=≠', repeat=width)]
    codes += sorted(set(counts) - set(codes))
    return [{'signature': code, 'count': counts[code]} for code in codes]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--input-dir', type=Path, required=True)
    args = parser.parse_args()
    paths = {y: args.input_dir / f'PZ{y}_kolo1_skolobory_vysledky.xlsx' for y in (2025, 2026)}
    expected_hashes = {2025: 'b4016252e34db63aeac538f9983bada503fb79770ac565c63f4a5a230b96bdaf', 2026: 'a003441f4beed6fb9c181aa00f9d1a59a9c206ff10f113ad807740e68d5511d5'}
    # Interpretation and examples below describe this frozen source snapshot.
    for year, path in paths.items():
        if hashlib.sha256(path.read_bytes()).hexdigest() != expected_hashes[year]:
            raise ValueError(f'Jiná verze vstupu {year}: před generováním aktualizujte interpretaci reportu.')
    data = {y: [{k: r.get(k) for k in FIELDS} for r in load_flat_xlsx(path) if is_valid_flat(r)] for y, path in paths.items()}
    old, new = data[2025], data[2026]
    ou, om = units(old)
    nu, nm = units(new)
    stages = [
        ('stejné IZO, adresa, REDIZO a název', lambda r: (r['izo'], r['address'], r['redizo'], r['name']) if r['address'] else None),
        ('stejné IZO a adresa', lambda r: (r['izo'], r['address']) if r['address'] else None),
        ('stejné IZO', lambda r: r['izo'] or None),
        ('návrh: stejné REDIZO a adresa', lambda r: (r['redizo'], r['address']) if r['address'] else None),
        ('návrh: stejné REDIZO', lambda r: r['redizo'] or None),
        ('návrh: pouze stejná adresa', lambda r: r['address']),
    ]
    school_pairs, school_left, school_right = unique_pairs(ou, nu, stages)
    for p in school_pairs:
        p['signature'] = signature(ou[p['old']], nu[p['new']], ['address', 'redizo', 'izo', 'name'])
        p['provisional'] = p['rule'].startswith('návrh:')
    # Only stable IZO school pairs anchor program comparisons. No inferred organizational succession.
    stable = [p for p in school_pairs if not p['provisional']]
    old_unit_to_pair = {p['old']: n for n, p in enumerate(stable)}
    new_unit_to_pair = {p['new']: n for n, p in enumerate(stable)}
    po = [{k: norm(r[k]) for k in PROGRAM} | {'unit': old_unit_to_pair.get(om[i])} for i, r in enumerate(old)]
    pn = [{k: norm(r[k]) for k in PROGRAM} | {'unit': new_unit_to_pair.get(nm[i])} for i, r in enumerate(new)]
    def program_key(keys: list[str]) -> Callable:
        return lambda r: (r['unit'], *(r[k] for k in keys)) if r['unit'] is not None else None
    program_stages = [
        ('shoda všech šesti vlastností', program_key(PROGRAM)),
        ('stejný kód, zaměření, délka, forma a jazyk', program_key([k for k in PROGRAM if k != 'OBOR - NÁZEV'])),
        ('stejný kód, délka, forma a jazyk', program_key(['KKOV', 'DÉLKA STUDIA', 'FORMA VZDĚLÁVÁNÍ', 'JAZYK STUDIA'])),
        ('stejný kód a zaměření', program_key(['KKOV', 'ZAMĚŘENÍ OBORU'])),
        ('stejný kód', program_key(['KKOV'])),
        # A changed code is only suggested with a matching NONEMPTY program title and study attributes.
        ('návrh: stejný název, délka, forma a jazyk; jiný kód', program_key(['OBOR - NÁZEV', 'DÉLKA STUDIA', 'FORMA VZDĚLÁVÁNÍ', 'JAZYK STUDIA'])),
    ]
    program_pairs, program_left, program_right = unique_pairs(po, pn, program_stages)
    for p in program_pairs:
        p['signature'] = signature(po[p['old']], pn[p['new']], PROGRAM)
        p['provisional'] = p['signature'] != '======'
    assert len({p['old'] for p in school_pairs}) == len(school_pairs)
    assert len({p['new'] for p in school_pairs}) == len(school_pairs)
    assert len({p['old'] for p in program_pairs}) == len(program_pairs)
    assert len({p['new'] for p in program_pairs}) == len(program_pairs)
    assert len(program_pairs) + len(program_left) == len(old)
    assert len(program_pairs) + len(program_right) == len(new)
    report = {
        'version': 1, 'years': [2025, 2026],
        'scope': '1. kolo; denní nezkrácené studium s povinnou JPZ; nikoli celý rejstřík škol',
        'source_hashes': {str(y): hashlib.sha256(p.read_bytes()).hexdigest() for y, p in paths.items()},
        'school_dimensions': ['adresa', 'REDIZO', 'IZO', 'název školy'],
        'program_dimensions': PROGRAM,
        'summary': {'offers_2025': len(old), 'offers_2026': len(new), 'units_2025': len(ou), 'units_2026': len(nu),
                    'school_pairs': len(school_pairs), 'school_proposals': sum(p['provisional'] for p in school_pairs),
                    'school_unpaired_2025': len(school_left), 'school_unpaired_2026': len(school_right),
                    'program_pairs': len(program_pairs), 'program_unpaired_2025': len(program_left), 'program_unpaired_2026': len(program_right)},
        'school_matrix': all_cells(school_pairs, 4), 'program_matrix': all_cells(program_pairs, 6),
        'school_pairs': school_pairs, 'program_pairs': program_pairs,
        'school_unpaired_2025': school_left, 'school_unpaired_2026': school_right,
        'program_unpaired_2025': program_left, 'program_unpaired_2026': program_right,
        'schools_2025': ou, 'schools_2026': nu, 'offers_2025': old, 'offers_2026': new,
        'offer_unit_2025': om, 'offer_unit_2026': nm,
    }
    target = ROOT / 'docs/podklady/matice-zmen-2025-2026.json'
    target.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    write_report(report)
    print(json.dumps(report['summary'], ensure_ascii=False, indent=2))
    for kind in ['school', 'program']:
        print(kind, [c for c in report[f'{kind}_matrix'] if c['count']])
        print('rules', dict(Counter(p['rule'] for p in report[f'{kind}_pairs'])))


def write_report(report: dict) -> None:
    meanings = {
        '====': 'Beze změny sledovaných vlastností; neprokazuje stejnou nabídku ani podmínky přijetí.',
        '===≠': 'Změna názvu při zachované identitě; přejmenování, úprava zápisu nebo i důsledek sloučení.',
        '==≠=': 'Jiné zařízení pod stejnou právnickou osobou; ověřit rejstřík a souběh obou IZO.',
        '==≠≠': 'Jiné zařízení a název pod stejnou právnickou osobou; vznik, náhrada či reorganizace.',
        '=≠==': 'Zachované IZO, jiná právnická osoba; kandidát převodu činnosti, ověřit registr.',
        '=≠=≠': 'Zachované IZO, změna právnické osoby i názvu; kandidát reorganizace.',
        '=≠≠=': 'Shoda adresy a názvu nestačí k doložení právního nástupnictví.',
        '=≠≠≠': 'Pouze shodná adresa; kandidát nástupnictví nebo nesouvisející výměna uživatele budovy.',
        '≠===': 'Změna adresního údaje; stěhování, jiné pracoviště, korespondenční adresa nebo oprava zápisu.',
        '≠==≠': 'Změna adresy i názvu při stejných identifikátorech; ověřit obě změny odděleně.',
        '≠=≠=': 'Jiné zařízení i místo ve stejné právnické osobě; nelze ztotožnit školy podle názvu.',
        '≠=≠≠': 'Stejná právnická osoba, ostatní jiné; možná nová či nahrazená součást.',
        '≠≠==': 'Stejné IZO, jiná adresa i právnická osoba; kandidát převodu činnosti a změny místa.',
        '≠≠=≠': 'Pouze stejné IZO; ověřit změnu provozovatele, adresy i názvu.',
        '≠≠≠=': 'Pouze stejný název není dostatečná kotva; tato metoda takto nepáruje.',
        '≠≠≠≠': 'Bez identity i adresní kotvy nelze návaznost touto metodou zjistit.',
        '?===': 'Stejné identifikátory a název; úplnou adresu nemáme alespoň na jedné straně.',
    }
    lines = [
        '# Matice změn škol a oborů 2025–2026', '',
        'Verze 1.1 · 12. 9. 2026 · analytický podklad, nikoli schválená migrační mapa.', '',
        '## Rozsah a metoda', '',
        'Porovnáno 3 059 nabídek roku 2025 a 3 091 nabídek roku 2026 z původních XLSX CERMAT. '
        'Jde o první kolo, denní nezkrácené studium s povinnou JPZ. Nejde o celý rejstřík škol, '
        'mateřské školy ani nabídku 2027. Rok 2024 zde neporovnáváme. Používáme oficiální XLSX 2025, '
        'nikoli neúplný historický katalog aplikace s 2 837 řádky.', '',
        '[Zdroj CERMAT](https://data.cermat.cz/data-a-analyticke-vystupy-jednotna-prijimaci-zkouska/agregovana-data-jpz.html). '
        'Kontrolní součty vstupů jsou v doprovodném JSON.', '',
        'REDIZO identifikuje právnickou osobu, IZO školu nebo zařízení; ani jedno není identifikátor budovy. '
        '[Definice MŠMT](https://rejstriky.msmt.cz/rejskol/VREJVerejne/VerejneRozhrani.aspx). '
        'Nové IZO proto samo nedokazuje vznik nové školy a z tohoto výřezu nelze zjistit přidání MŠ.', '',
        'Jednotka školní matice je jedinečná kombinace REDIZO, IZO, adresy a názvu v daném roce: '
        '1 107 jednotek v každém roce. Není to počet budov ani právnických osob. '
        'Adresa se porovnává jako ulice s číslem + obec + PSČ; chybějící číslo znamená neznámou adresu. '
        'Normalizace ignoruje diakritiku, velikost písmen, interpunkci a nadbytečné mezery; '
        'nesjednocuje pouliční zkratky, č.p./č.o. ani adresní místa RÚIAN. „Stejné“ tedy znamená stejné po této normalizaci.', '',
        'Párování je 1:1. Postupně se hledá jediná dosud volná položka na obou stranách podle '
        '(1) všech čtyř vlastností, (2) IZO a adresy, (3) IZO, (4) REDIZO a adresy, '
        '(5) REDIZO, (6) adresy. Poslední tři pravidla dávají pouze návrhy. '
        'Počet ve sloupci je počet takto nalezených dvojic, nikoli všech možných křížových kombinací. '
        'Výsledek závisí na uvedené metodě: nula neprokazuje, že daný jev neexistuje. '
        'Rozdělení a sloučení 1:N/N:1 zůstávají mimo automatické párování.', '',
        '## Školy: všech 16 kombinací a neznámá adresa', '',
        'Pořadí znaků: **adresa / REDIZO / IZO / název**. `=` stejné, `≠` jiné, `?` nelze určit.', '',
        '| Kombinace | Dvojic | Možný význam a omezení |', '|---|---:|---|',
    ]
    for cell in report['school_matrix']:
        lines.append(f"| `{cell['signature']}` | {cell['count']} | {meanings[cell['signature']]} |")
    lines += [
        '', 'Součet: 1 092 dvojic se stejným IZO + 1 adresní návrh (PORG Brno → PORG). '
        'Bez dvojice zbývá 14 jednotek roku 2025 a 14 roku 2026. Nejde automaticky o zaniklé a nové školy.', '',
        '### Proč kombinace není verdikt', '',
        '- Ze 40 změn adresy při stejném IZO a REDIZO je jedna pouze změnou PSČ: '
        'Bezpečnostně právní akademie Plzeň, Tylova 988, 30100 → 31800. To není důkaz změny budovy.',
        '- U zbývajících 39 se mění ulice nebo číslo; ani zde bez historie míst výuky nelze potvrdit stěhování.',
        '- Mezi 25 změnami názvu při stejné adrese a identifikátorech je Masarykova akademie v Rakovníku. '
        '[Škola potvrzuje sloučení s SZeŠ od 1. 9. 2025](https://mozarako.cz/7-historie-skoly). '
        'Taková kombinace tedy nevylučuje širší organizační změnu.',
        '- Předchozí adresní rozbor nalezl 67 křížových dvojic různých REDIZO na 35 adresách. '
        'U 54 dvojic oba subjekty na adrese působily v obou letech; dalších 13 dvojic na 10 adresách '
        'má změnu přítomnosti. Nejsou to další položky této matice, ale překrývající se kandidátní vztahy. '
        'Například převzetí další školy existujícím subjektem nelze vměstnat do párování 1:1.', '',
        '## Obory', '',
        'Porovnáváme pouze nabídky uvnitř školních dvojic se stejným IZO. '
        'V tomto souboru mají tyto dvojice zároveň stejné REDIZO. '
        'Adresa se může změnit; změnu školy proto evidujeme odděleně od změny nabídky. '
        'Párování opět vyžaduje jediný zbylý protějšek na každé straně. '
        'Postupně: všech šest vlastností; kód + zaměření + délka + forma + jazyk; '
        'kód + délka + forma + jazyk; kód + zaměření; kód; název + délka + forma + jazyk. '
        'Jakákoli rozdílnost znamená návrh návaznosti k posouzení, nikoli převod historie bez kontroly.', '',
        '| Pozorování | Dvojic | Význam |', '|---|---:|---|',
        '| Všech šest vlastností shodných | 2 311 | Shoda popisu nabídky; neznamená stejné výsledky nebo přijímací podmínky. |',
        '| Změnilo se pouze zaměření | 559 | Může jít o změnu zápisu, ŠVP nebo obsahu nabídky. |',
        '| Změnil se pouze jazyk | 2 | Ověřit deklarovaný režim výuky. |',
        '| Změnila se forma i jazyk | 1 | SPŠ, KKOV 23-41-M/01: den → den2, Polský → Český; ověřit význam zdrojového kódu den2. |',
        '', 'Z 559 změn zaměření: **206 vyplněné → prázdné, 182 prázdné → vyplněné, '
        '171 změna vyplněného textu**. Údaj proto nelze používat jako jedinou stabilní identitu oboru. '
        'Například prázdné zaměření → „všeobecné“ samo o sobě není důkaz otevření nového gymnaziálního oboru.', '',
        'Celkem 2 873 dvojic. Zbývá 186 nabídek 2025 a 218 nabídek 2026:', '',
        '| Zbývající nabídky podle výskytu v druhém roce | 2025 | 2026 |', '|---|---:|---:|',
        '| IZO není v druhém roce vůbec | 22 | 16 |',
        '| IZO existuje, stejný KKOV pod ním nikoli | 53 | 86 |',
        '| Existuje IZO i KKOV, ale párování zůstalo nevyřešené | 111 | 116 |',
        '', 'Tyto tři skupiny jsou disjunktní. U 86 nabídek 2026 může jít o přidání oboru, '
        'změnu kódu, návrat nabídky nebo odlišné pokrytí; absence v jednom roce nedokazuje novost. '
        'U 116 je potřeba kontrolovat zejména více zaměření, rozdělení/sloučení nabídek a duplicity. '
        'Ve spárovaných dvojicích se nenašla změna KKOV ani délky; není to důkaz jejich neexistence mezi nespárovanými nabídkami.', '',
        '### Úplná matice oborů (64 kombinací)', '',
        'Pořadí: **KKOV / název oboru / zaměření / délka / forma / jazyk**. '
        'Interpretace označuje změněná pole; změna kódu potřebuje doloženou návaznost, '
        'změna délky či formy zvláštní posouzení srovnatelnosti statistik. '
        'Změny mimo denní studium jsou z rozsahu vyloučeny.', '',
        '| Kombinace | Dvojic | Změněná pole |', '|---|---:|---|',
    ]
    for cell in report['program_matrix']:
        changed = ', '.join(k for k, flag in zip(PROGRAM, cell['signature']) if flag == '≠') or 'žádná'
        lines.append(f"| `{cell['signature']}` | {cell['count']} | {changed} |")
    lines += ['', '## Doporučení pro prohlížeč a migrační mapu', '',
        'U každého případu uchovat zvlášť: pozorované rozdíly, kandidátní vazbu 1:1/1:N/N:1, '
        'vysvětlení, důkaz a schválený dopad na historii. Nezaměňovat změnu názvu školy za změnu oboru. '
        'Adresu dále rozdělit na změnu PSČ, ulice/čísla a neznámou adresu; '
        'identitu budovy doplnit přes RÚIAN a rozlišit sídlo od místa výuky. '
        'Sloučení a změny IZO/REDIZO ověřovat v rejstříku a u školy. '
        'Ani potvrzená kontinuita školy automaticky neznamená srovnatelnost historických statistik oboru.', '',
        'Tato dodávka nemění katalog, produkci ani uložená rozhodnutí v prohlížeči 1 004 případů.', '',
        '## Reprodukce a evidence', '',
        '```sh', 'python3 scripts/analyze-year-change-matrix.py --input-dir /tmp/gymnazium-rozvoj-2027', '```', '',
        'Strojová data: [matice-zmen-2025-2026.json](podklady/matice-zmen-2025-2026.json). '
        'Obsahují všechny dvojice, pravidla, nezpárované položky a zdrojové atributy. '
        'Indexy old/new jsou od nuly v odpovídajících polích schools nebo offers. '
        'Kontroly ověřují jedinečné použití položek a úplné rozdělení obou ročníků.', '',
        'Navazuje na [adresní rozbor](adresni-parovani-skol-2025-2026.md).', '',
        '### Konkrétní pozorované změny škol', '',
        'Verze 1.1 opravuje zařazení 16 dvojic `?===`: neúplná adresa není pozorovaná změna. '
        'Tyto dvojice zůstávají v úplné matici, ale nejsou v následujícím seznamu změn. '
        'U REDIZO 600170535 (Tachov) jsou v obou letech shodné identifikátory, název, obec i PSČ a ulice chybí. '
        'Žádná změna sledovaných údajů zde doložena není.', '',
        'Samotné změny názvu či adresního údaje jen evidujeme, bez rešerše příčiny. '
        'U oborů evidujeme změnu názvu/zaměření jen při jednoznačné návaznosti; doplnění nebo vymazání textu není přejmenování. '
        'Organizační vazby 1:N/N:1 a nejasné identity zůstávají k posouzení. '
        'Pravidla a fronta: [zadání dohledávání](zadani-dohledavani-navaznosti-2025-2026.md).', '',
        '| REDIZO 2025 → 2026 | Název 2025 → 2026 | Adresa 2025 → 2026 | Kombinace |', '|---|---|---|---|',
    ]
    for p in report['school_pairs']:
        if p['signature'] in ('====', '?==='):
            continue
        a, b = report['schools_2025'][p['old']]['source'], report['schools_2026'][p['new']]['source']
        def loc(x: dict) -> str:
            return f"{x['ULICE'] or 'ulice neuvedena'}, {x['OBEC']}, {x['PSČ']}"
        line = f"| {a['REDIZO']} → {b['REDIZO']} | {a['NÁZEV ŠKOLY']} → {b['NÁZEV ŠKOLY']} | {loc(a)} → {loc(b)} | `{p['signature']}` |"
        lines.append(line)
    (ROOT / 'docs/matice-zmen-skol-a-oboru-2025-2026.md').write_text('\n'.join(lines) + '\n')


if __name__ == '__main__':
    main()
