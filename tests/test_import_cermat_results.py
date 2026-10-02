"""Testy importu souhrnů CERMATu (scripts/import_cermat_results.py, refresh_cermat_data.py).

Psáno v unittestu, ne v pytestu: projekt jinde používá unittest a CI instaluje
jen openpyxl (.github/workflows/datova-linka.yml), takže pytestová verze tohoto
souboru se nikde nespouštěla a chyběla i v `python3 -m unittest discover -s tests`.
"""
from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path

import openpyxl

sys.path.insert(0, str(Path(__file__).parent.parent / 'scripts'))
from import_cermat_results import load_flat_xlsx, extract_current_year, compute_ranks, make_key, is_valid_flat
import json

import refresh_cermat_data
from refresh_cermat_data import build_applications, oznac_novinky, zaklady_z_druheho_kola, oprav_novinky


def record(**overrides):
    return {
        'ROK': 2026, 'KOLO': 1, 'REDIZO': 123, 'KKOV': '79-41-K/41', 'ID_SOF': '123-x',
        'FORMA VZDĚLÁVÁNÍ': 'denní', 'ZKRÁCENÉ STUDIUM': 'ne', 'POVINNOST JPZ': 1,
        'ZAMĚŘENÍ OBORU': 'Přírodovědné', 'ČJ+MA - % SKÓR - PRŮMĚR (PŘIJATI)': 120,
        'ČJ - % SKÓR - PRŮMĚR (PŘIJATI)': 70, 'MA - % SKÓR - PRŮMĚR (PŘIJATI)': 50,
        'KAPACITA': 10, 'PŘIHLÁŠKY CELKEM': 6, 'PŘIJATÍ': 4,
        'PŘIHLÁŠKY - PRIORITA 1': 3, 'PŘIHLÁŠKY - PRIORITA 2': 2, 'PŘIHLÁŠKY - PRIORITA 3': 1,
        'PŘIHLÁŠKY - PRIORITA 4': 0, 'PŘIHLÁŠKY - PRIORITA 5': 0,
        'NÁZEV ŠKOLY': 'Gymnázium', 'OBOR - NÁZEV': 'Gymnázium', 'TYP ŠKOLY': 'GY4',
        'OBEC': 'Praha', 'KRAJ': 'CZ010', 'KRAJ - NÁZEV': 'Praha', 'DÉLKA STUDIA': 4,
        **overrides,
    }


class TestImportCermatResults(unittest.TestCase):
    """Čtení souhrnového souboru, párování zaměření a kontroly rozsahů."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.dir = Path(self.tmp.name)

    def tearDown(self):
        self.tmp.cleanup()

    def test_workbook_with_explanations_and_reordered_columns(self):
        row = record()
        headers = list(reversed(row))
        wb = openpyxl.Workbook()
        wb.active.append(headers)
        wb.active.append([row[h] for h in headers])
        wb.create_sheet('vysvetlivky')
        file = self.dir / 'data.xlsx'
        wb.save(file)
        data = extract_current_year(load_flat_xlsx(file))
        result = data['123_79-41-K/41_prirodovedne']
        self.assertEqual((result['cj_ma_prijati'], result['cj_prijati'], result['ma_prijati']), (60, 35, 25))
        self.assertEqual(result['prijati'], 4)

    def test_wrong_headers_stop_import(self):
        wb = openpyxl.Workbook()
        wb.active.append(['REDIZO', 'neznámý sloupec'])
        file = self.dir / 'bad.xlsx'
        wb.save(file)
        with self.assertRaisesRegex(ValueError, 'hlavičky'):
            load_flat_xlsx(file)

    def test_duplicate_focus_stops_import(self):
        with self.assertRaisesRegex(ValueError, 'Duplicitní'):
            extract_current_year([record(), record()])

    def test_missing_score_retained_in_applications_only(self):
        row = record(**{'ČJ+MA - % SKÓR - PRŮMĚR (PŘIJATI)': None})
        self.assertEqual(extract_current_year([row]), {})
        self.assertEqual(len(build_applications([row], [], [])), 1)

    def test_priorities_not_shifted_by_results_column(self):
        result = build_applications([record()], [], [dict(id='123_79-41-K/41_Přírodovědné')])[0]
        self.assertEqual(result['pp'], [3, 2, 1, 0, 0])
        self.assertEqual(result['prihlasky'], 6)
        self.assertEqual(result['id'], '123_79-41-K/41_Přírodovědné')
        self.assertFalse(result.get('is_new'))
        with self.assertRaisesRegex(ValueError, 'priority'):
            build_applications([record(**{'PŘIHLÁŠKY CELKEM': 99})], [], [])

    def test_different_focus_is_not_matched_to_history(self):
        result = build_applications([record()], [], [dict(id='123_79-41-K/41_jazykove')])[0]
        self.assertTrue(result['is_new'])
        self.assertTrue(result['id'].endswith('_prirodovedne'))

    def test_ambiguous_history_is_not_used(self):
        old = dict(id='123_79-41-K/41_prirodovedne')
        self.assertTrue(build_applications([record()], [], [old, old])[0]['is_new'])

    def test_filter_and_range(self):
        self.assertFalse(is_valid_flat(record(**{'POVINNOST JPZ': 0})))
        self.assertFalse(is_valid_flat(record(**{'FORMA VZDĚLÁVÁNÍ': 'večerní'})))
        with self.assertRaisesRegex(ValueError, 'rozsah'):
            extract_current_year([record(**{'ČJ+MA - % SKÓR - PRŮMĚR (PŘIJATI)': 201})])

    def test_ranks_within_type(self):
        data = {key: {'school_type': typ, 'cj_ma_prijati': score}
                for key, typ, score in [('a', 'GY4', 90), ('b', 'GY4', 80), ('c', 'SOS', 70)]}
        compute_ranks(data)
        self.assertEqual(data['a']['rank_in_type'], 1)
        self.assertEqual(data['c']['rank_in_type'], 1)
        self.assertEqual(data['b']['rank_in_type'], 2)
        self.assertEqual(data['c']['type_total'], 1)

    def test_key_normalization(self):
        self.assertEqual(make_key('123', '79-41-K/41', 'IT & Sítě'), '123_79-41-K/41_it_site')

    def test_admission_context_preserves_missing_and_valid_zero(self):
        from refresh_cermat_data import admission_context
        row = record(**{'ČJ+MA - KONALI': 6, 'ČJ+MA - KONALI (PŘIJATI)': 4,
                        'ČJ+MA - % SKÓR - PRŮMĚR': 140,
                        'NEPŘIJATI - PŘIJAT NA VYŠŠÍ PRIORITU': 2,
                        'NEPŘIJATI - NEDOSTATEČNÁ KAPACITA': 0,
                        'NEPŘIJATI - NESPLNĚNÍ PODMÍNEK': 0, 'NEPŘIJATI - VZDAL SE PŘIJETÍ': 0})
        ctx = admission_context(row)
        self.assertEqual(ctx['average_all'], 70)
        self.assertEqual(ctx['average_accepted'], 60)
        self.assertEqual(ctx['capacity_rejected'], 0)
        self.assertTrue(ctx['outcomes_complete'])

        # Chybějící údaj není nula: zůstane None a rozpad se označí za neúplný.
        row['NEPŘIJATI - NEDOSTATEČNÁ KAPACITA'] = None
        self.assertIsNone(admission_context(row)['capacity_rejected'])
        self.assertFalse(admission_context(row)['outcomes_complete'])

        row['ČJ+MA - KONALI (PŘIJATI)'] = 5
        self.assertIsNone(admission_context(row)['average_accepted'])
        row['ČJ+MA - KONALI'] = 0
        self.assertIsNone(admission_context(row)['average_all'])
        row['ČJ+MA - % SKÓR - PRŮMĚR'] = 201
        with self.assertRaises(ValueError):
            admission_context(row)



class NovinkyTest(unittest.TestCase):
    """Příznak nové nabídky podle loňského 1. kola, ne podle schools_data.json (issue #257)."""

    def test_nastavba_z_lonskeho_1_kola_neni_nova(self):
        # Nástavba chybí v schools_data.json 2025, ale v 1. kole 2025 byla (druhe_kolo.json).
        druhe_kolo = {'roky': {'2025': {'123_64-41-L/51': {'stav': 'nenaplneno_bez_2_kola'},
                                        '123_79-41-K/41_prirodovedne': {'stav': 'bez_2_kola'}}}}
        predchozi = zaklady_z_druheho_kola(druhe_kolo, 2025)
        self.assertEqual(predchozi, {'123_64-41-L/51', '123_79-41-K/41'})
        apps = [
            {'redizo': '123', 'kkov': '64-41-L/51', 'is_new': True},
            # Jiné zaměření téhož oboru než loni: obor nový není.
            {'redizo': '123', 'kkov': '79-41-K/41', 'is_new': True},
            {'redizo': '123', 'kkov': '18-20-M/01'},
        ]
        analysis = {'123_64-41-L/51': {'is_new_2026': True}, '123_18-20-M/01': {},
                    '123_23-41-M/01': {'is_new_2026': True}}
        oznac_novinky(apps, analysis, predchozi)
        self.assertEqual([a.get('is_new') for a in apps], [None, None, True])
        self.assertNotIn('is_new_2026', analysis['123_64-41-L/51'])
        self.assertTrue(analysis['123_18-20-M/01']['is_new_2026'])
        # Obor, který letos vypsaný není, novinkou být nemůže.
        self.assertNotIn('is_new_2026', analysis['123_23-41-M/01'])

    def test_chybejici_rocnik_je_chyba(self):
        with self.assertRaises(ValueError):
            zaklady_z_druheho_kola({'roky': {'2026': {}}}, 2025)


    def test_neuplny_nebo_cizi_doklad_se_odmitne(self):
        druhe_kolo = {'meta': {'rocniky': {'2025': {'kolo1_sha256': 'abc', 'stavy': {'kolize_klice': 1}}}},
                      'roky': {'2025': {'123_64-41-L/51': {'stav': 'bez_2_kola'}}}}
        with self.assertRaisesRegex(ValueError, 'kolize'):
            zaklady_z_druheho_kola(druhe_kolo, 2025)
        druhe_kolo['meta']['rocniky']['2025']['stavy'] = {}
        with self.assertRaisesRegex(ValueError, 'sha256'):
            zaklady_z_druheho_kola(druhe_kolo, 2025, 'jiny')
        self.assertEqual(zaklady_z_druheho_kola(druhe_kolo, 2025, 'abc'), {'123_64-41-L/51'})


NASTAVBA = {'KKOV': '64-41-L/51', 'ZAMĚŘENÍ OBORU': '', 'OBOR - NÁZEV': 'Podnikání', 'TYP ŠKOLY': 'NAS', 'DÉLKA STUDIA': 2}


class NovinkyIntegraceTest(unittest.TestCase):
    """Stará nástavba přes obě cesty: plný import z XLSX i --oprav-novinky (#257)."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.public = self.root / 'public'
        self.public.mkdir()

    def tearDown(self):
        self.tmp.cleanup()

    def zapis(self, nazev, data):
        (self.public / nazev).write_text(json.dumps(data, ensure_ascii=False))

    def test_plny_import_nastavbu_z_lonskeho_1_kola_neoznaci(self):
        for rok in (2025, 2026):
            row = record(ROK=rok, **NASTAVBA)
            wb = openpyxl.Workbook()
            wb.active.append(list(row))
            wb.active.append(list(row.values()))
            wb.save(self.root / f'PZ{rok}_kolo1_skolobory_vysledky.xlsx')
        # Historie 2025 (schools_data.json) nástavbu nemá, school_analysis nese starý příznak.
        self.zapis('cermat_results_2026.json', {})
        self.zapis('schools_data.json', {'2025': []})
        self.zapis('applications_2026.json', {'meta': {}, 'data': []})
        self.zapis('school_analysis.json', {'123_64-41-L/51': {'is_new_2026': True, 'obor': 'Podnikání'}})
        puvodni = refresh_cermat_data.ROOT
        refresh_cermat_data.ROOT = self.root
        try:
            refresh_cermat_data.main(self.root)
        finally:
            refresh_cermat_data.ROOT = puvodni
        apps = json.loads((self.public / 'applications_2026.json').read_text())['data']
        self.assertEqual(len(apps), 1)
        self.assertNotIn('is_new', apps[0])
        analysis = json.loads((self.public / 'school_analysis.json').read_text())
        self.assertNotIn('is_new_2026', analysis['123_64-41-L/51'])
        self.assertEqual(analysis['123_64-41-L/51']['obor'], 'Podnikání')

    def test_oprava_meni_jen_priznaky_a_podruhe_nic_nezapise(self):
        self.zapis('cermat_results_meta.json', {'comparison_source': {'sha256': 'abc'}})
        self.zapis('druhe_kolo.json', {'meta': {'rocniky': {'2025': {'kolo1_sha256': 'abc', 'stavy': {}}}},
                                       'roky': {'2025': {'123_64-41-L/51_podnikani_denni': {'stav': 'bez_2_kola'}}}})
        apps = {'meta': {'rok': 2026}, 'data': [
            {'id': '123_64-41-L/51_Podnikani_denni', 'redizo': '123', 'kkov': '64-41-L/51', 'kapacita': 60, 'is_new': True},
            {'id': '123_18-20-M/01', 'redizo': '123', 'kkov': '18-20-M/01', 'kapacita': 30}]}
        self.zapis('applications_2026.json', apps)
        self.zapis('school_analysis.json', {'123_64-41-L/51': {'is_new_2026': True, 'kapacita_2026': 60}, '123_18-20-M/01': {}})
        self.assertTrue(oprav_novinky(self.public))
        po = json.loads((self.public / 'applications_2026.json').read_text())
        self.assertEqual(po['meta'], apps['meta'])
        self.assertEqual(po['data'][0], {k: v for k, v in apps['data'][0].items() if k != 'is_new'})
        self.assertTrue(po['data'][1]['is_new'])
        analysis = json.loads((self.public / 'school_analysis.json').read_text())
        self.assertEqual(analysis['123_64-41-L/51'], {'kapacita_2026': 60})
        self.assertTrue(analysis['123_18-20-M/01']['is_new_2026'])
        self.assertFalse(oprav_novinky(self.public))

if __name__ == '__main__':
    unittest.main()
