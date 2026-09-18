"""Rozbor výsledků přijatých po předmětech: python3 -m unittest tests/test_pasma_prijeti.py"""
from __future__ import annotations

import importlib.util
import unittest
from pathlib import Path

KOREN = Path(__file__).resolve().parents[1]
_spec = importlib.util.spec_from_file_location("pasma", KOREN / "scripts" / "build-pasma-prijeti.py")
pasma = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(pasma)


class TestRozborPredmetu(unittest.TestCase):
    """Odpovídá na otázku, jestli jde slabší předmět dohnat tím druhým."""

    def dvojice(self, *pary: tuple[float, float]) -> list[tuple[float, float]]:
        """Doplní na práh deseti přijatých vyrovnanými výsledky, které rozbor neovlivní."""
        return list(pary) + [(40.0, 40.0)] * (pasma.MIN_PRIJATYCH - len(pary))

    def test_dva_skutecni_lide_s_obema_vysledky(self):
        r = pasma.rozbor_predmetu(self.dvojice((20.0, 45.0), (48.0, 25.0)))
        # Nejslabší v češtině je jiný člověk než nejslabší v matematice a u obou
        # se uvádí i druhý předmět, takže dvojice popisuje výsledek, který nastal.
        self.assertEqual(r["nejslabsi_cj"], {"cj": 20.0, "ma": 45.0})
        self.assertEqual(r["nejslabsi_ma"], {"cj": 48.0, "ma": 25.0})

    def test_tyz_clovek_muze_byt_nejslabsi_v_obou(self):
        r = pasma.rozbor_predmetu(self.dvojice((15.0, 12.0)))
        self.assertEqual(r["nejslabsi_cj"], {"cj": 15.0, "ma": 12.0})
        self.assertEqual(r["nejslabsi_ma"], {"cj": 15.0, "ma": 12.0})

    def test_podlaha_slabsiho_predmetu(self):
        # Nejnižší hodnota slabšího z obou předmětů přes všechny přijaté.
        r = pasma.rozbor_predmetu(self.dvojice((20.0, 45.0), (48.0, 25.0)))
        self.assertEqual(r["podlaha_slabsiho"], 20.0)

    def test_nevyrovnani_maji_jmenovatel(self):
        r = pasma.rozbor_predmetu(self.dvojice((20.0, 45.0), (48.0, 25.0), (41.0, 35.0)))
        # rozdíl 25 a 23 bodů ano, rozdíl 6 bodů ne, zbytek dvojic je vyrovnaný
        self.assertEqual(r["nevyrovnanych"], 2)
        self.assertEqual(r["nevyrovnanych_z"], pasma.MIN_PRIJATYCH)

    def test_hranicni_rozdil_se_pocita(self):
        r = pasma.rozbor_predmetu(self.dvojice((30.0, 40.0)))
        self.assertEqual(r["nevyrovnanych"], 1)

    def test_pod_prahem_se_nepocita_nic(self):
        # Pod deseti přijatými by každý údaj popisoval jednotlivce (slovník ukazatelů).
        self.assertEqual(pasma.rozbor_predmetu([(20.0, 45.0)] * (pasma.MIN_PRIJATYCH - 1)), {})


if __name__ == "__main__":
    unittest.main()
