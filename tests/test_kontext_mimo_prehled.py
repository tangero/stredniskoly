"""Testy popisu oborů mimo přehled v kontextu přihlášek.

    python3 -m unittest tests/test_kontext_mimo_prehled.py -v
"""
from __future__ import annotations

import importlib.util
import sys
import unittest
from pathlib import Path

KOREN = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(KOREN / "scripts"))
import nazvy_oboru  # noqa: E402

_spec = importlib.util.spec_from_file_location("kontext", KOREN / "scripts" / "build-kontext-prihlasek.py")
kontext = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(kontext)


def zaznam(vys=(), niz=()):
    return {"obory_vys": [[k, 10] for k in vys], "obory_niz": [[k, 10] for k in niz]}


class TestKategorie(unittest.TestCase):
    def test_kategorie_bez_jednotne_zkousky(self):
        for klic in ("1_65-51-H/01", "1_29-51-E/01", "1_82-51-C/01", "1_82-44-P/01", "1_33-56-J/01"):
            with self.subTest(klic=klic):
                self.assertTrue(nazvy_oboru.bez_jednotne_zkousky(klic))
        for klic in ("1_65-42-M/01", "1_64-41-L/51", "1_79-41-K/41"):
            with self.subTest(klic=klic):
                self.assertFalse(nazvy_oboru.bez_jednotne_zkousky(klic))


class TestMimoPrehled(unittest.TestCase):
    NAZVY = {
        "1_65-42-M/01": {"skola": "Hotelová škola", "obec": "Praha", "obor": "Hotelnictví", "jpz": True},
        "1_65-51-H/01": {"skola": "Hotelová škola", "obec": "Praha", "obor": "Kuchař - číšník", "jpz": False},
    }

    def test_obor_v_katalogu_se_nevypisuje(self):
        self.assertEqual(kontext.mimo_prehled({"x": zaznam(vys=["1_65-42-M/01"])}, self.NAZVY), {})

    def test_obor_z_rejstriku_nese_nazev_a_kategorii(self):
        vystup = kontext.mimo_prehled({"x": zaznam(niz=["1_65-51-H/01"])}, self.NAZVY)
        self.assertEqual(vystup, {"1_65-51-H/01": {"skola": "Hotelová škola", "obec": "Praha",
                                                   "obor": "Kuchař - číšník", "bez_jednotne_zkousky": True}})

    def test_nedohledany_obor_zustane_bez_nazvu(self):
        vystup = kontext.mimo_prehled({"x": zaznam(vys=["2_82-41-M/01"])}, self.NAZVY)
        self.assertEqual(vystup["2_82-41-M/01"],
                         {"skola": None, "obec": None, "obor": None, "bez_jednotne_zkousky": False})


if __name__ == "__main__":
    unittest.main()
