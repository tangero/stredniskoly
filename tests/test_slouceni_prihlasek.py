"""Sloučení přihlášek do více zaměření téhož oboru (scripts/slouceni_prihlasek.py, issue #183)."""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))
from slouceni_prihlasek import PRIJAT, VZDAL_SE, volby_uchazece, vysledek_uchazece  # noqa: E402

POLE = ("redizo", "kkov", "prijat", "duvod_neprijeti", "forma", "zkraceno")
IX = {f"ss{k}_{p}": (k - 1) * len(POLE) + i for k in range(1, 6) for i, p in enumerate(POLE)}


def radek(*prihlasky):
    """Přihlášky jako (obor, prijat, duvod[, forma]); obor „A“ = REDIZO 1, KKOV A, výchozí forma denní."""
    r = [None] * len(IX)
    for k, (obor, byl, duvod, *forma) in enumerate(prihlasky, 1):
        r[IX[f"ss{k}_redizo"]], r[IX[f"ss{k}_kkov"]] = "1", obor
        r[IX[f"ss{k}_prijat"]], r[IX[f"ss{k}_duvod_neprijeti"]] = (1 if byl else 2), duvod
        r[IX[f"ss{k}_forma"]], r[IX[f"ss{k}_zkraceno"]] = (forma[0] if forma else "den"), 2
    return r


class SlouceniTest(unittest.TestCase):
    def volby(self, *p):
        v = volby_uchazece(radek(*p), IX)
        return v, {x["obor"].split("_")[1]: x for x in v}

    def test_obor_jednou_s_prvni_pozici(self):
        v, o = self.volby(("A", False, "prijat_na_vyssi_prioritu"), ("B", True, None), ("A", False, "pro_nedostacujici_kapacitu"))
        self.assertEqual([x["obor"] for x in v], ["1_A", "1_B"])
        self.assertEqual(o["A"]["pozice"], 0)
        self.assertEqual(o["A"]["stav"], 1)

    def test_prijeti_na_pozdejsi_zamereni_neni_prijeti_vys(self):
        # A odmítnut, B odmítnut, přijat na A ze třetí přihlášky (nález Codexu, PR #184).
        v, o = self.volby(("A", False, "pro_nedostacujici_kapacitu"), ("B", False, "pro_nedostacujici_kapacitu"), ("A", True, None))
        self.assertEqual(vysledek_uchazece(v, o["A"]), "sem")
        self.assertEqual(vysledek_uchazece(v, o["B"]), "niz")
        self.assertEqual(o["A"]["stav"], PRIJAT)

    def test_vzdani_se_neprepise_vedlejsi_zamereni(self):
        v, o = self.volby(("A", False, "vzdal_se_prijeti"), ("A", False, "pro_nesplneni_podminek"))
        self.assertEqual(o["A"]["stav"], VZDAL_SE)
        v, o = self.volby(("A", False, "prijat_na_vyssi_prioritu"), ("A", False, "vzdal_se_prijeti_po_terminu"))
        self.assertEqual(o["A"]["stav"], VZDAL_SE)

    def test_prijeti_prebije_vzdani_i_neznamy_duvod(self):
        _, o = self.volby(("A", False, "vzdal_se_prijeti"), ("A", True, "NULL"))
        self.assertEqual(o["A"]["stav"], PRIJAT)
        _, o = self.volby(("A", False, "NULL"), ("A", False, "pro_nesplneni_podminek"))
        self.assertEqual(o["A"]["stav"], 3)
        _, o = self.volby(("A", False, "NULL"))
        self.assertIsNone(o["A"]["stav"])

    def test_nikam(self):
        v, o = self.volby(("A", False, "pro_nedostacujici_kapacitu"))
        self.assertEqual(vysledek_uchazece(v, o["A"]), "nikam")


    def test_nedenni_forma_mimo_populaci(self):
        # Dálkové studium téhož KKOV nepadá pod klíč denního oboru.
        v, o = self.volby(("A", False, "pro_nedostacujici_kapacitu", "dal"), ("B", False, "pro_nedostacujici_kapacitu"))
        self.assertEqual([x["obor"] for x in v], ["1_B"])
        self.assertEqual(o["B"]["pozice"], 1)

    def test_prijeti_na_nedenni_je_vys(self):
        # Přijetí výš na kombinované studium: u denního oboru níž na přihlášce je „vys“.
        v, o = self.volby(("A", True, None, "komb"), ("B", False, "prijat_na_vyssi_prioritu"))
        self.assertEqual(vysledek_uchazece(v, o["B"]), "vys")


if __name__ == "__main__":
    unittest.main()
