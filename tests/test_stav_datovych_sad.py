"""Přepnutí období v registru stavu datových sad: python3 -m unittest tests/test_stav_datovych_sad.py"""
from __future__ import annotations

import importlib.util
import unittest
from pathlib import Path

KOREN = Path(__file__).resolve().parents[1]
_spec = importlib.util.spec_from_file_location("stav", KOREN / "scripts" / "stav-datovych-sad.py")
stav = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(stav)


def registr() -> dict:
    return {
        "historie_prepnuti": [],
        "sady": {"uchazeci": {
            "zobrazeno": {"obdobi": "2025", "verze": "předběžná"},
            "ocekavano": {"obdobi": "2027", "kdy": "2027-05", "jistota": "odhad", "zduvodneni": "ročně"},
            "dostupne": [{"obdobi": "2025", "verze": "finální"}, {"obdobi": "2026", "verze": "předběžná"}],
        }},
    }


class TestPrepnuti(unittest.TestCase):
    def test_prevzate_obdobi_zmizi_z_dostupnych(self):
        r = registr()
        stav.prepni(r, "uchazeci", "2026", "2027-05", "odhad", "ročně", "PR", None, None)
        s = r["sady"]["uchazeci"]
        self.assertEqual([d["obdobi"] for d in s["dostupne"]], ["2025"])
        self.assertEqual(s["zobrazeno"]["verze"], "předběžná")

    def test_revize_tehoz_obdobi_zachova_ocekavani(self):
        r = registr()
        stav.prepni(r, "uchazeci", "2025", None, "neznamo", "", "PR #84", None, None)
        s = r["sady"]["uchazeci"]
        self.assertEqual(s["zobrazeno"]["verze"], "finální")
        self.assertEqual(s["ocekavano"]["obdobi"], "2027")
        self.assertEqual([d["obdobi"] for d in s["dostupne"]], ["2026"])

    def test_nove_obdobi_bez_kdy_ponecha_pozdejsi_ocekavani(self):
        r = registr()
        stav.prepni(r, "uchazeci", "2026", None, "neznamo", "", "PR", None, None)
        self.assertEqual(r["sady"]["uchazeci"]["ocekavano"]["obdobi"], "2027")

    def test_nove_obdobi_s_kdy_prepise_ocekavani(self):
        r = registr()
        stav.prepni(r, "uchazeci", "2026", "2027-06", "odhad", "ročně", "PR", None, None)
        self.assertEqual(r["sady"]["uchazeci"]["ocekavano"]["kdy"], "2027-06")

    def test_vraceni_obnovi_dostupne(self):
        r = registr()
        stav.prepni(r, "uchazeci", "2026", None, "neznamo", "", "PR", None, None)
        stav.vrat(r, "uchazeci", "chyba")
        s = r["sady"]["uchazeci"]
        self.assertEqual(s["zobrazeno"]["obdobi"], "2025")
        self.assertEqual(sorted(d["obdobi"] for d in s["dostupne"]), ["2025", "2026"])


if __name__ == "__main__":
    unittest.main()
