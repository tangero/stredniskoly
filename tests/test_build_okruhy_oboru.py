import importlib.util
import random
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / "scripts/build-okruhy-oboru.py"
MA_OPENPYXL = importlib.util.find_spec("openpyxl") is not None
if MA_OPENPYXL:
    spec = importlib.util.spec_from_file_location("build_okruhy_oboru", SCRIPT)
    gen = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(gen)

# Smyšlené obory a obce; klíče nejsou skutečné školy.
MAPA = {"A_1": {"obec": "Alfa"}, "B_1": {"obec": "Beta"}, "B_2": {"obec": "Beta"}, "C_1": {"obec": "Gama"}}


def uchazec(*obory):
    return [{"obor": o, "pozice": i, "stav": None} for i, o in enumerate(obory)]


@unittest.skipUnless(MA_OPENPYXL, "chybí knihovna openpyxl")
class BuildOkruhyOboruTest(unittest.TestCase):
    def test_zname_podmnoziny_berou_kontext_i_soubeh(self):
        kontext = {"A_1": {"obory_vys": [["B_1", 12]], "obory_niz": [["B_1", 11], ["C_1", 20]]}}
        soubeh = {"A_1": {"soubeh": [{"klic": "B_2", "uchazecu": 15}]}}
        zname = gen.zname_podmnoziny("A_1", MAPA, kontext, soubeh)
        # B_1 výš a níž zvlášť i sečtené za týž obor, B_2 ze souběhu
        self.assertEqual(sorted(zname["Beta"]), [11, 12, 15, 23])
        self.assertEqual(zname["Gama"], [20])

    def test_obec_se_potlaci_kdyz_ji_zverejneny_pocet_oboru_doplni_na_malou_skupinu(self):
        # 100 uchazečů A_1: 30 má obor v Betě (z toho 21 přesně B_1, ten počet web už ukazuje), 30 obor v Gamě
        volby = [uchazec("A_1", "B_1") for _ in range(21)] + [uchazec("A_1", "B_2") for _ in range(9)]
        volby += [uchazec("A_1", "C_1") for _ in range(30)] + [uchazec("A_1") for _ in range(40)]
        kontext = {"A_1": {"obory_vys": [], "obory_niz": [["B_1", 21], ["C_1", 30]]}}
        vysledek = gen.obce_oboru(volby, {"A_1": 100}, MAPA, kontext, {})
        obce = {o["obec"]: o["podil"] for o in vysledek["A_1"]["obce"]}
        self.assertNotIn("Beta", obce)          # 30 − 21 = 9 by prozradilo skupinu pod 10
        self.assertEqual(obce["Gama"], 0.3)     # 30 − 30 = 0, nic neprozradí
        self.assertEqual(vysledek["A_1"]["potlacene_obce"], 1)

    def test_obor_z_okoli_je_ukotveny_jen_s_hranou_na_obor_mesta(self):
        cast = {"A_1": 1, "B_1": 1, "C_1": 1}
        n = {"A_1": 40, "B_1": 30, "C_1": 20}
        hrany = {"B_1": {"A_1": 12}, "A_1": {"B_1": 12}, "C_1": {"B_1": 10}}
        volby = [uchazec("A_1", "B_1") for _ in range(12)] + [uchazec("B_1", "C_1") for _ in range(10)]
        volby += [uchazec("A_1") for _ in range(28)] + [uchazec("B_1") for _ in range(8)] + [uchazec("C_1") for _ in range(10)]
        m = gen.popis_mesta("Alfa", {2026: volby}, 2026, None, cast, n, MAPA, hrany, random.Random(1))
        ukotven = {x["klic"]: x["ukotven"] for x in m["okruhy"][0]["obory"]}
        self.assertEqual(ukotven, {"A_1": True, "B_1": True, "C_1": False})
        self.assertEqual(m["okruhy"][0]["uchazecu"] % 10, 0)

    def test_do_verejneho_souboru_jen_zobrazitelne_okruhy(self):
        popis = {"zobrazit": True, "okruhu": 3, "okruhy": [
            {"id": 1, "zobrazit": True, "jedne_skoly": False, "uchazecu": 50, "obory": []},
            {"id": 2, "zobrazit": False, "jedne_skoly": True, "uchazecu": 40, "obory": []},
            {"id": 3, "zobrazit": False, "jedne_skoly": False, "uchazecu": 20, "obory": []}]}
        verejne = gen.zverejnit(popis)
        self.assertEqual([o["id"] for o in verejne["okruhy"]], [1])
        self.assertNotIn("jedne_skoly", verejne["okruhy"][0])
        self.assertEqual(gen.zverejnit({**popis, "zobrazit": False}), {"zobrazit": False, "okruhy": []})

    def test_obor_neprozradi_prislusnost_ke_skrytemu_okruhu(self):
        vystup = {"obory": {"A_1": {"okruh": 1}, "B_1": {"okruh": 2}}, "mesta": {"Alfa": {"okruhy": [
            {"id": 1, "uchazecu": 50, "obory": [{"podil_prvnich_voleb_v_okruhu": 0.5, "uchazecu": 50}]}]}}}
        self.assertEqual(len(gen.kontrola(vystup, opravit=True)), 1)
        self.assertNotIn("okruh", vystup["obory"]["B_1"])
        self.assertEqual(vystup["obory"]["A_1"]["okruh"], 1)

    def test_kontrola_potlaci_dopocitatelne_prvni_volby(self):
        # smyšlené: 20 + 21 + skrytý 9 = 50
        vystup = {"mesta": {"Alfa": {"okruhy": [{"id": 1, "uchazecu": 50, "obory": [
            {"podil_prvnich_voleb_v_okruhu": 0.4, "uchazecu": 100},
            {"podil_prvnich_voleb_v_okruhu": 0.42, "uchazecu": 100},
            {"podil_prvnich_voleb_v_okruhu": None, "uchazecu": 100}]}]}}}
        self.assertEqual(len(gen.kontrola(vystup, opravit=True)), 1)
        self.assertEqual(gen.kontrola(vystup), [])
        self.assertTrue(vystup["mesta"]["Alfa"]["okruhy"][0]["podily_potlaceny"])


if __name__ == "__main__":
    unittest.main()
