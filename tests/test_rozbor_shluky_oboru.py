import importlib.util
import itertools
import json
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / "scripts/rozbor-shluky-oboru.py"
MA_OPENPYXL = importlib.util.find_spec("openpyxl") is not None
if MA_OPENPYXL:
    spec = importlib.util.spec_from_file_location("rozbor_shluky_oboru", SCRIPT)
    rozbor = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(rozbor)


def kliky(pocet: int, velikost: int, mosty: list[tuple[str, str]]) -> dict:
    g: dict[str, dict[str, float]] = {}
    for c in range(pocet):
        for a, b in itertools.combinations([f"{c}_{i}" for i in range(velikost)], 2):
            g.setdefault(a, {})[b] = 1.0
            g.setdefault(b, {})[a] = 1.0
    for a, b in mosty:
        g[a][b] = g[b][a] = 0.2
    return g


@unittest.skipUnless(MA_OPENPYXL, "chybí knihovna openpyxl")
class RozborShlukyOboruTest(unittest.TestCase):
    def test_louvain_najde_kliky_spojene_slabymi_mosty(self):
        g = kliky(5, 6, [("0_0", "1_0"), ("2_0", "3_0")])
        g["samostatny"] = {}
        for seed in range(5):
            cast = rozbor.louvain(g, 1.0, seed)
            self.assertEqual(len(set(cast.values())), 6)
            for c in range(5):
                self.assertEqual(len({cast[f"{c}_{i}"] for i in range(6)}), 1)

    def test_nesouvisly_shluk_se_rozdeli(self):
        g = kliky(2, 3, [])
        cast = rozbor.rozdel_nesouvisle(g, {u: 0 for u in g})
        self.assertEqual(len(set(cast.values())), 2)

    def test_shoda_rozdeleni(self):
        self.assertAlmostEqual(rozbor.ari([0, 0, 1, 1], [1, 1, 0, 0]), 1.0)
        self.assertAlmostEqual(rozbor.nmi([0, 0, 1, 1], [1, 1, 0, 0]), 1.0)
        self.assertLess(rozbor.ari([0, 0, 1, 1], [0, 1, 0, 1]), 0)

    def test_podil_neprozradi_skupinu_pod_deset(self):
        self.assertIsNone(rozbor.podil_nad_mezi(3, 50))
        self.assertIsNone(rozbor.podil_nad_mezi(45, 50))
        self.assertEqual(rozbor.podil_nad_mezi(0, 50), 0.0)
        self.assertEqual(rozbor.podil_nad_mezi(20, 50), 0.4)

    def test_jednoznacne_dopocitatelny_skryty_obor_se_pozna(self):
        # celé číslo, ne interval: review PR #284, Praha 2026, okruhy 137 a 30, skryto přesně 9
        self.assertEqual(rozbor.dopocitatelne(30, [(0.37, 100), (0.39, 100), (None, 100)]), {9})
        self.assertEqual(rozbor.dopocitatelne(70, [(0.6, 100), (0.28, 100), (None, 100)]), {9})
        self.assertTrue(rozbor.unika({9}))
        self.assertFalse(rozbor.unika({0}))
        self.assertFalse(rozbor.unika({7, 8, 9}))
        # velký okruh: skrytý obor nejde určit
        self.assertGreater(len(rozbor.dopocitatelne(2220, [(0.5, 2000), (0.5, 2000), (None, 50)])), 1)
        self.assertEqual(rozbor.dopocitatelne(2220, [(0.5, 2000), (0.5, 2000)]), set())

    def test_unik_se_potlaci(self):
        vystup = {"mesta": {"X": {"rocniky": {"2026": {"okruhy": [{"id": 1, "uchazecu": 30, "obory": [
            {"podil_prvnich_voleb_v_okruhu": 0.37, "uchazecu": 40},
            {"podil_prvnich_voleb_v_okruhu": 0.39, "uchazecu": 40},
            {"podil_prvnich_voleb_v_okruhu": None, "uchazecu": 40}]}]}}, "prelevani": []}}}
        self.assertEqual(len(rozbor.kontrola_zverejneni(vystup, opravit=True)), 1)
        self.assertEqual(rozbor.kontrola_zverejneni(vystup), [])
        self.assertTrue(vystup["mesta"]["X"]["rocniky"]["2026"]["okruhy"][0]["podily_potlaceny"])

    def test_podklad_neprozradi_skupinu_pod_deset(self):
        # review PR #284: přesné počty prvních voleb se sčítaly a z celku okruhu vyšel skrytý obor s 9 uchazeči
        podklad = SCRIPT.parents[1] / "docs/podklady/shluky-oboru-2026-10-03.json"
        text = podklad.read_text(encoding="utf-8")
        self.assertNotIn('"prvni_volby_v_okruhu"', text)
        self.assertEqual(rozbor.kontrola_zverejneni(json.loads(text)), [])

    def test_kam_dal_souhrn_po_obcich_neprozradi_malou_skupinu(self):
        mapa = {"A": {"obec": "Brandýs"}, **{f"P{i}": {"obec": "Praha"} for i in range(40)}, "C": {"obec": "Čelákovice"}}
        volby = []
        for i in range(40):  # 40 uchazečů A, každý jinam do Prahy, 12 z nich i do Čelákovic
            u = [{"obor": "A", "pozice": 0}, {"obor": f"P{i}", "pozice": 1}]
            if i < 12:
                u.append({"obor": "C", "pozice": 2})
            volby.append(u)
        for i in range(5):  # pět uchazečů jen na A
            volby.append([{"obor": "A", "pozice": 0}])
        vysledek = rozbor.kam_dal(volby, "A", mapa)
        self.assertEqual(vysledek["uchazecu"], 45)
        # žádný pražský obor nemá 10 společných, Praha jako obec ano; zbytek (5) je pod mezí, proto bez podílu
        self.assertEqual([o["klic"] for o in vysledek["obory"]], ["C"])
        self.assertNotIn("Praha", [o["obec"] for o in vysledek["obce"]])
        self.assertEqual([o["obec"] for o in vysledek["obce"]], ["Čelákovice"])

    def test_zarazeni_obtiznosti_podle_slovniku(self):
        self.assertIsNone(rozbor.zarazeni(5, 4))
        self.assertEqual(rozbor.zarazeni(30, 0), "kapacita_nerozhodovala")
        self.assertEqual(rozbor.zarazeni(30, 82), "velmi_tezke")
        self.assertEqual(rozbor.zarazeni(20, 10), "vetsina_uspela")


if __name__ == "__main__":
    unittest.main()
