"""Kontroly seznamu měst (scripts/build-mesta.py).

Seznam se generuje z katalogu, ne ručně. Testy hlídají to, co by se rozbilo
nenápadně: zveřejněná adresa města, jednoznačnost slugů a čtení ročníku
z registru místo letopočtu v kódu.
"""

from __future__ import annotations

import importlib.util
import json
import re
import unittest
from pathlib import Path

KOREN = Path(__file__).resolve().parent.parent


def nacti_modul():
    cesta = KOREN / 'scripts' / 'build-mesta.py'
    spec = importlib.util.spec_from_file_location('build_mesta', cesta)
    modul = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(modul)
    return modul


class TestSeznamMest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.modul = nacti_modul()
        cls.mesta = cls.modul.sesbirej_mesta()
        cls.zapsane = (KOREN / 'src' / 'lib' / 'mesta.mjs').read_text(encoding='utf-8')

    def test_soubor_odpovida_datum(self):
        """Zapsaný seznam musí odpovídat katalogu; jinak stránky a sitemapa lžou."""
        obdobi = self.modul.zobrazene_obdobi()
        self.assertEqual(
            self.zapsane,
            self.modul.vykresli(self.mesta, obdobi),
            'src/lib/mesta.mjs neodpovídá datům, spusť python3 scripts/build-mesta.py',
        )

    def test_puvodni_mesta_zustavaji(self):
        """Zveřejněná adresa se nesmí rozbít, i když obec spadne pod práh."""
        nazvy = {m['nazev'] for m in self.mesta}
        for mesto in self.modul.PUVODNI_MESTA:
            self.assertIn(mesto, nazvy, f'{mesto} zmizelo ze seznamu, odkaz by vracel 404')

    def test_slugy_jsou_jednoznacne(self):
        """Dvě města se stejným slugem by přepsala jednu stránku."""
        slugy = [m['slug'] for m in self.mesta]
        duplicity = {s for s in slugy if slugy.count(s) > 1}
        self.assertFalse(duplicity, f'kolize slugů: {duplicity}')

    def test_slug_je_bezpecny_pro_adresu(self):
        for m in self.mesta:
            self.assertRegex(
                m['slug'], r'^[a-z0-9]+(-[a-z0-9]+)*$',
                f"slug {m['slug']!r} u města {m['nazev']!r} není bezpečný pro adresu",
            )

    def test_kazde_mesto_ma_kraj(self):
        for m in self.mesta:
            self.assertTrue(m['kraj'], f"město {m['nazev']!r} nemá kraj")

    def test_prah_plati_pro_nova_mesta(self):
        """Nad práh jde jen obec s dost školami; výjimkou jsou zveřejněná města."""
        for m in self.mesta:
            if m['nazev'] in self.modul.PUVODNI_MESTA:
                continue
            self.assertGreaterEqual(
                m['skol'], self.modul.PRAH_SKOL,
                f"{m['nazev']} má {m['skol']} škol, což je pod prahem",
            )

    def test_obdobi_z_registru(self):
        """Ročník určuje registr, ne letopočet v kódu."""
        registr = json.loads(
            (KOREN / 'public' / 'stav_datovych_sad.json').read_text(encoding='utf-8'),
        )
        self.assertEqual(
            self.modul.zobrazene_obdobi(),
            str(registr['sady']['cermat-prihlasky']['zobrazeno']['obdobi']),
        )

    def test_v_souboru_neni_letopocet(self):
        """Vygenerovaný seznam nesmí nést letopočet dat mimo hlavičku komentáře."""
        bez_komentaru = '\n'.join(
            r for r in self.zapsane.splitlines() if not r.lstrip().startswith('//')
        )
        self.assertNotRegex(bez_komentaru, r'\b20\d\d\b')

    def test_apostrof_v_nazvu_nerozbije_soubor(self):
        """Nový ročník může přinést obec s apostrofem; literál musí přežít."""
        vystup = self.modul.vykresli(
            [{'nazev': "Ob'ec", 'slug': 'obec', 'kraj': "Kraj'X", 'skol': 9}], '2026',
        )
        self.assertIn(r"nazev: 'Ob\'ec'", vystup)
        self.assertIn(r"kraj: 'Kraj\'X'", vystup)


if __name__ == '__main__':
    unittest.main()
