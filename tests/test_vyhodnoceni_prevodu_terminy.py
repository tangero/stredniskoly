"""Část 2 vyhodnocení převodu výsledku testu (#328): rozdělení na poloviny a chyba odhadu."""
import importlib.util
import random
import unittest
from pathlib import Path

KOREN = Path(__file__).resolve().parent.parent
try:
    _spec = importlib.util.spec_from_file_location("vyhodnoceni", KOREN / "scripts" / "vyhodnoceni-prevodu-testu-terminy.py")
    v = importlib.util.module_from_spec(_spec)
    _spec.loader.exec_module(v)
except ModuleNotFoundError:  # openpyxl chybí jen mimo CI
    v = None


@unittest.skipIf(v is None, "chybí openpyxl")
class TestVyhodnoceniTerminu(unittest.TestCase):
    def test_prevod_odstrani_soustavny_posun(self):
        nahoda = random.Random(1)
        par = {}
        for i in range(4000):
            schopnost = nahoda.uniform(10, 80)
            par[i] = (schopnost + nahoda.gauss(0, 3), schopnost + 6 + nahoda.gauss(0, 3))
        r = v.vyhodnot_smer(par)
        self.assertGreater(r["bez_prevodu"]["prumerna_chyba"], 5)
        self.assertLess(abs(r["s_prevodem"]["prumerna_chyba"]), 0.7)
        self.assertLess(r["s_prevodem"]["prumerna_abs_chyba"], r["bez_prevodu"]["prumerna_abs_chyba"])

    def test_trenink_a_test_jsou_oddelene(self):
        # Testovací polovina (liché id) má jiný posun než trénovací: převod ho nepozná.
        par = {i: (50.0, 50.0 if i % 2 == 0 else 60.0) for i in range(1000)}
        r = v.vyhodnot_smer(par)
        self.assertAlmostEqual(r["s_prevodem"]["prumerna_chyba"], 10.0, places=1)

    def test_souhrn_chyb(self):
        s = v.souhrn_chyb([3, -3, 6, -6])
        self.assertEqual(s["prumerna_chyba"], 0)
        self.assertEqual(s["prumerna_abs_chyba"], 4.5)
        self.assertEqual(s["podil_chyba_nad_5"], 0.5)


if __name__ == "__main__":
    unittest.main()
