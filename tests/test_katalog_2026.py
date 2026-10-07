"""Katalog ročníku 2026: python3 -m unittest tests/test_katalog_2026.py"""
from __future__ import annotations

import json
import unittest
from collections import Counter
from pathlib import Path

KOREN = Path(__file__).resolve().parents[1]


class TestKatalog2026(unittest.TestCase):
    def setUp(self):
        self.rok = json.loads((KOREN / "public" / "schools_data.json").read_text())["2026"]

    def test_id_je_jedinecne(self):
        # Ročník 2025 nesl u některých nabídek i nedenní formu se stejným id; generátor
        # ročníku 2026 přenášel obě (issue #365, SŠ KNIH v Brně).
        zdvojena = [i for i, n in Counter(z["id"] for z in self.rok).items() if n > 1]
        self.assertEqual(zdvojena, [])

    def test_ss_knih_nese_jen_denni_nabidky(self):
        knih = {z["id"]: z for z in self.rok if z["redizo"] == "600013511"}
        self.assertEqual(knih["600013511_66-43-M/01_Poznávat,_obdivovat_a_šířit_knihu"]["kapacita"], 18)
        self.assertEqual(knih["600013511_66-43-M/01"]["kapacita"], 23)


if __name__ == "__main__":
    unittest.main()
