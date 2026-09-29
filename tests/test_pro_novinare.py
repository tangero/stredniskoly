"""Generátor balíčků pro novináře (scripts/build-pro-novinare.py)."""
from __future__ import annotations

import importlib.util
import unittest
from pathlib import Path

KOREN = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("pro_novinare", KOREN / "scripts" / "build-pro-novinare.py")
pn = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pn)


def uchazec(*prihlasky, skor="80"):
    """Řádek dat uchazečů: prihlasky = (redizo, kkov, prijat, duvod)."""
    r = {"c_m_procentni_skor": skor}
    for k in range(1, 6):
        red, kkov, prijat, duvod = prihlasky[k - 1] if k <= len(prihlasky) else (None, None, None, None)
        r.update({f"ss{k}_redizo": red, f"ss{k}_kkov": kkov, f"ss{k}_prijat": prijat, f"ss{k}_duvod_neprijeti": duvod})
    return r


KOLO1 = [
    {"REDIZO": "1", "KKOV": "79-41-K/41", "ROČNÍK": "9", "KRAJ - NÁZEV": "Hlavní město Praha"},
    {"REDIZO": "1", "KKOV": "79-41-K/81", "ROČNÍK": "5", "KRAJ - NÁZEV": "Hlavní město Praha"},
    {"REDIZO": "2", "KKOV": "23-68-H/01", "ROČNÍK": "9", "KRAJ - NÁZEV": "Jihočeský"},
]


class SkupinySlozek(unittest.TestCase):
    def test_bezne_nazvy(self):
        self.assertEqual(pn.skupiny_slozky("Hodnocení na vysvědčeních z předchozího vzdělávání"), {"prospech"})
        self.assertEqual(pn.skupiny_slozky("školní přijímací zkouška – test OSP"), {"skolni_zkouska"})
        self.assertEqual(pn.skupiny_slozky("Talentová zkouška"), {"talentova_prakticka"})
        self.assertIn("pohovor", pn.skupiny_slozky("Pohovor nad odevzdaným portfoliem"))
        self.assertIn("talentova_prakticka", pn.skupiny_slozky("Pohovor nad odevzdaným portfoliem"))
        self.assertEqual(pn.skupiny_slozky("Hodnocení dalších skutečností"), {"souteze_aktivity"})

    def test_motivacni_dopis_neni_pohovor(self):
        self.assertNotIn("pohovor", pn.skupiny_slozky("motivační dopis"))

    def test_jednotna_zkouska_a_chovani_nejsou_extra_body(self):
        for nazev in ("Státní přijímací zkouška – matematika", "JPZ", "Celkem", "hodnocení chování ve sledovaném období"):
            self.assertTrue(pn.NEJSOU_EXTRA_BODY.search(nazev), nazev)
        self.assertFalse(pn.NEJSOU_EXTRA_BODY.search("prospěch ze ZŠ"))


class Uchazeci(unittest.TestCase):
    def setUp(self):
        self.data = [
            uchazec(("1", "79-41-K/41", "1", None)),                                            # 9., 1. volba
            uchazec(("1", "79-41-K/41", "2", "pro_nedostacujici_kapacitu"), ("2", "23-68-H/01", "1", None)),  # 9., 2. volba
            uchazec(("1", "79-41-K/41", "2", "pro_nedostacujici_kapacitu")),                    # 9., nikam, kapacita
            uchazec(("1", "79-41-K/81", "2", "pro_nesplneni_podminek")),                        # 5., nikam, požadavek
        ]
        self.balicek, self.souhrn = pn.balicek_uchazeci("2026", self.data, KOLO1)

    def test_rocniky_se_nemichaji(self):
        r = self.souhrn["rocniky"]
        self.assertEqual(r["9"]["uchazecu"], 3)
        self.assertEqual(r["5"]["uchazecu"], 1)
        self.assertEqual(r["9"]["nikam"], 1)
        self.assertEqual(r["5"]["nikam"], 1)

    def test_volba_a_duvod(self):
        r = self.souhrn["rocniky"]["9"]
        self.assertEqual((r["volba1"], r["volba2"]), (1, 1))
        self.assertEqual(r["nikam_jen_kapacita"], 1)
        self.assertEqual(self.souhrn["rocniky"]["5"]["nikam_jen_pozadavek"], 1)

    def test_kraj_prvni_volby(self):
        self.assertEqual(self.souhrn["kraje_9"]["Hlavní město Praha"]["uchazecu"], 3)
        self.assertNotIn("Jihočeský kraj", self.souhrn["kraje_9"])


class Nadpisy(unittest.TestCase):
    def test_nadpis_kraje(self):
        self.assertEqual(pn.nadpis_kraje("Jihočeský"), "Jihočeský kraj")
        self.assertEqual(pn.nadpis_kraje("Hlavní město Praha"), "Hlavní město Praha")
        self.assertEqual(pn.nadpis_kraje("Kraj Vysočina"), "Kraj Vysočina")


if __name__ == "__main__":
    unittest.main()
