"""Párování ročníků a záznam souhrnu 1. kola: python3 -m unittest tests/test_souhrny_kolo1.py"""
from __future__ import annotations

import importlib.util
import unittest
from pathlib import Path

KOREN = Path(__file__).resolve().parents[1]
_spec = importlib.util.spec_from_file_location("souhrny", KOREN / "scripts" / "build-souhrny-kolo1.py")
souhrny = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(souhrny)


def nabidka(redizo: str, kkov: str, zamereni: str = "") -> dict:
    return {"redizo": redizo, "kkov": kkov, "zamereni": zamereni}


class TestParovani(unittest.TestCase):
    def test_shodny_klic(self):
        pary = souhrny.paruj({"1_A": nabidka("1", "A")}, {"1_A": nabidka("1", "A")})
        self.assertEqual(pary, {"1_A": ("1_A", "shoda_klice")})

    def test_jedina_nabidka_se_zmenenym_zamerenim(self):
        pary = souhrny.paruj({"1_A_stare": nabidka("1", "A", "staré")}, {"1_A_nove": nabidka("1", "A", "nové")})
        self.assertEqual(pary, {"1_A_nove": ("1_A_stare", "jedna_ku_jedne")})

    def test_vic_nabidek_se_neparuje(self):
        stary = {"1_A_x": nabidka("1", "A", "x"), "1_A_y": nabidka("1", "A", "y")}
        novy = {"1_A_z": nabidka("1", "A", "z"), "1_A_w": nabidka("1", "A", "w")}
        self.assertEqual(souhrny.paruj(stary, novy), {})

    def test_zbytek_po_shode_klice_se_neparuje_jako_jedina(self):
        # Škola má v obou letech dvě nabídky, jedna sedí klíčem; druhá není „jediná nabídka oboru“.
        stary = {"1_A_x": nabidka("1", "A", "x"), "1_A_y": nabidka("1", "A", "y")}
        novy = {"1_A_x": nabidka("1", "A", "x"), "1_A_z": nabidka("1", "A", "z")}
        self.assertEqual(souhrny.paruj(stary, novy), {"1_A_x": ("1_A_x", "shoda_klice")})


class TestZaznam(unittest.TestCase):
    def radek(self, **zmeny) -> dict:
        r = {
            "KAPACITA": 30, "PŘIHLÁŠKY CELKEM": 60, "PŘIJATÍ": 30,
            **{f"PŘIHLÁŠKY - PRIORITA {p}": v for p, v in zip(range(1, 6), (45, 10, 5, 0, 0))},
            **{f"PŘIJATÍ - PRIORITA {p}": v for p, v in zip(range(1, 6), (28, 2, 0, 0, 0))},
            "NEPŘIJATI - NEDOSTATEČNÁ KAPACITA": 15, "NEPŘIJATI - NESPLNĚNÍ PODMÍNEK": 5,
            "NEPŘIJATI - PŘIJAT NA VYŠŠÍ PRIORITU": 10, "NEPŘIJATI - VZDAL SE PŘIJETÍ": 0,
            "ČJ+MA - KONALI": 58, "ČJ+MA - KONALI (PŘIJATI)": 30,
            "ČJ+MA - % SKÓR - PRŮMĚR (PŘIJATI)": 150.0, "ČJ+MA - PERCENTIL - PRŮMĚR (PŘIJATI)": 88.44,
            "ČJ+MA - PERCENTIL - PRŮMĚR": 60.0, "ČJ+MA - PERCENTIL - MIN (PŘIJATI)": 70.0,
        }
        r.update(zmeny)
        return r

    def test_prevody_a_ukazatele(self):
        z = souhrny.zaznam(self.radek())
        self.assertEqual(z["tlak_prvnich_voleb"], 1.5)
        self.assertEqual(z["cj_ma_prijati"], 75.0)
        self.assertEqual(z["prumerne_umisteni_prijatych"], 88.4)
        self.assertEqual(z["min_prijaty_percentil_souhrn"], 70.0)

    def test_chybejici_udaj_neni_nula(self):
        z = souhrny.zaznam(self.radek(**{"ČJ+MA - PERCENTIL - PRŮMĚR (PŘIJATI)": None}))
        self.assertIsNone(z["prumerne_umisteni_prijatych"])

    def test_minimum_pod_deseti_prijatymi_se_neuvadi(self):
        z = souhrny.zaznam(self.radek(**{"ČJ+MA - KONALI (PŘIJATI)": 9}))
        self.assertIsNone(z["min_prijaty_percentil_souhrn"])

    def test_nesedici_priority_jsou_chyba(self):
        with self.assertRaises(ValueError):
            souhrny.zaznam(self.radek(**{"PŘIHLÁŠKY CELKEM": 61}))


if __name__ == "__main__":
    unittest.main()
