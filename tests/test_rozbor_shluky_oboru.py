import importlib.util
import itertools
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

    def test_zarazeni_obtiznosti_podle_slovniku(self):
        self.assertIsNone(rozbor.zarazeni(5, 4))
        self.assertEqual(rozbor.zarazeni(30, 0), "kapacita_nerozhodovala")
        self.assertEqual(rozbor.zarazeni(30, 82), "velmi_tezke")
        self.assertEqual(rozbor.zarazeni(20, 10), "vetsina_uspela")


if __name__ == "__main__":
    unittest.main()
