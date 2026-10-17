"""Testy třídění rozdílů názvů škol (scripts/report-nazvy-skol-rejstrik.py, #478).

Čisté funkce normalizuj() a porovnej(); žádná síť, žádná data z repozitáře.
"""
from __future__ import annotations

import importlib.util
import unittest
from pathlib import Path

SKRIPT = Path(__file__).parent.parent / 'scripts' / 'report-nazvy-skol-rejstrik.py'
spec = importlib.util.spec_from_file_location('report_nazvy_skol_rejstrik', SKRIPT)
modul = importlib.util.module_from_spec(spec)
spec.loader.exec_module(modul)


class PorovnejTest(unittest.TestCase):
    def test_shoda(self):
        self.assertEqual(modul.porovnej('Gymnázium Brno', ' Gymnázium Brno ', 'Brno'), 'shoda')

    def test_velikost_pismen(self):
        self.assertEqual(modul.porovnej('Gymnázium Brno', 'GYMNÁZIUM BRNO', ''), 'format')

    def test_pravni_forma(self):
        self.assertEqual(
            modul.porovnej('Obchodní akademie Plzeň, příspěvková organizace', 'Obchodní akademie Plzeň', ''), 'format')
        self.assertEqual(modul.porovnej('Soukromá škola s.r.o.', 'Soukromá škola', ''), 'format')

    def test_adresa_za_carkou(self):
        self.assertEqual(
            modul.porovnej('Gymnázium, Komenského 41', 'Gymnázium', ''), 'format')

    def test_obec_sidla(self):
        self.assertEqual(modul.porovnej('Gymnázium Tábor', 'Gymnázium', 'Tábor'), 'format')

    def test_interpunkce_a_mezery(self):
        self.assertEqual(modul.porovnej('Střední škola - Praha', 'Střední   škola Praha', ''), 'format')

    def test_skutecne_prejmenovani(self):
        self.assertEqual(
            modul.porovnej('Gymnázium Jana Nerudy', 'Gymnázium Karla Čapka', ''), 'vecna')
        self.assertEqual(
            modul.porovnej('Střední průmyslová škola', 'Střední odborná škola', ''), 'vecna')

    def test_chybejici_nazvy(self):
        self.assertEqual(modul.porovnej(None, None, ''), 'nema_ani_jeden')
        self.assertEqual(modul.porovnej(None, 'X', ''), 'jen_novy')
        self.assertEqual(modul.porovnej('X', None, ''), 'jen_stary')


class NormalizujTest(unittest.TestCase):
    def test_normalizace(self):
        self.assertEqual(
            modul.normalizuj('Gymnázium, Čsl. mládeže 5/9, příspěvková organizace'), 'gymnázium')

    def test_bez_obce_se_nic_nemaze(self):
        self.assertEqual(modul.normalizuj('Gymnázium Tábor'), 'gymnázium tábor')


if __name__ == '__main__':
    unittest.main()
