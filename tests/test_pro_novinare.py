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
    """Řádek dat uchazečů: prihlasky = (redizo, kkov, prijat, duvod[, forma, zkraceno])."""
    r = {"c_m_procentni_skor": skor}
    for k in range(1, 6):
        p = prihlasky[k - 1] if k <= len(prihlasky) else (None, None, None, None, None, None)
        red, kkov, prijat, duvod, forma, zkraceno = (*p, "den", "2")[:6] if len(p) == 4 else p
        r.update({f"ss{k}_redizo": red, f"ss{k}_kkov": kkov, f"ss{k}_prijat": prijat, f"ss{k}_duvod_neprijeti": duvod,
                  f"ss{k}_forma": forma, f"ss{k}_zkraceno": zkraceno})
    return r


KOLO1 = [
    {"REDIZO": "1", "KKOV": "79-41-K/41", "ROČNÍK": "9", "KRAJ - NÁZEV": "Hlavní město Praha"},
    {"REDIZO": "1", "KKOV": "79-41-K/81", "ROČNÍK": "5", "KRAJ - NÁZEV": "Hlavní město Praha"},
    {"REDIZO": "2", "KKOV": "23-68-H/01", "ROČNÍK": "9", "KRAJ - NÁZEV": "Jihočeský"},
    {"REDIZO": "2", "KKOV": "64-41-L/51", "ROČNÍK": "9", "KRAJ - NÁZEV": "Jihočeský"},
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
            uchazec(("2", "23-68-H/01", "1", None, "dal", "2")),                                 # jen dálkové: mimo
            uchazec(("2", "23-68-H/01", "1", None, "den", "1")),                                 # jen zkrácené: mimo
            uchazec(("2", "64-41-L/51", "2", "pro_nedostacujici_kapacitu")),                     # jen nástavba: mimo
            # Denní obor v populaci, přijat až na dálkové studium: počítá se jako přijatý na 2. volbu.
            uchazec(("1", "79-41-K/41", "2", "pro_nedostacujici_kapacitu"), ("2", "23-68-H/01", "1", None, "dal", "2")),
        ]
        self.balicek, self.souhrn = pn.balicek_uchazeci("2026", self.data, KOLO1)

    def test_mimo_zakladni_skolu_se_nepocita(self):
        self.assertEqual(self.souhrn["vyrazeno"], {"jen_nedenni_nebo_zkracene": 2, "jen_nastavby": 1})

    def test_prijeti_na_nedenni_studium_je_prijeti(self):
        self.assertEqual(self.souhrn["rocniky"]["9"]["volba2"], 2)

    def test_rocniky_se_nemichaji(self):
        r = self.souhrn["rocniky"]
        self.assertEqual(r["9"]["uchazecu"], 4)
        self.assertEqual(r["5"]["uchazecu"], 1)
        self.assertEqual(r["9"]["nikam"], 1)
        self.assertEqual(r["5"]["nikam"], 1)

    def test_volba_a_duvod(self):
        r = self.souhrn["rocniky"]["9"]
        self.assertEqual((r["volba1"], r["volba2"]), (1, 2))
        self.assertEqual(r["nikam_jen_kapacita"], 1)
        self.assertEqual(self.souhrn["rocniky"]["5"]["nikam_jen_pozadavek"], 1)

    def test_kraj_prvni_volby(self):
        self.assertEqual(self.souhrn["kraje_9"]["Hlavní město Praha"]["uchazecu"], 4)
        self.assertNotIn("Jihočeský kraj", self.souhrn["kraje_9"])


class VygenerovaneBalicky(unittest.TestCase):
    """Kontroly nad commitnutými balíčky v public/pro-novinare/."""

    def test_okres_patri_k_nabidce_ne_ke_skole(self):
        # PORG má pod jedním REDIZO a KKOV osmiletá gymnázia v Praze, Brně a Ostravě;
        # okres se dřív bral z první nabídky školy (Praha dostala Brno-město).
        import csv
        cesta = KOREN / "public" / "pro-novinare" / "obory-1-kolo-2026.csv"
        if not cesta.exists():
            self.skipTest("balíček není vygenerovaný")
        radky = list(csv.DictReader(cesta.open(encoding="utf-8-sig")))
        praha = [r for r in radky if r["obec"] == "Praha"]
        self.assertTrue(praha)
        self.assertEqual({r["okres"] for r in praha}, {"Praha"})
        self.assertFalse([r for r in radky if not r["okres"]])


class Nadpisy(unittest.TestCase):
    def test_nadpis_kraje(self):
        self.assertEqual(pn.nadpis_kraje("Jihočeský"), "Jihočeský kraj")
        self.assertEqual(pn.nadpis_kraje("Hlavní město Praha"), "Hlavní město Praha")
        self.assertEqual(pn.nadpis_kraje("Kraj Vysočina"), "Kraj Vysočina")


if __name__ == "__main__":
    unittest.main()
