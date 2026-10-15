"""Přepočet nejbližší zastávky škol po obnově grafu spojení (#426)."""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

from prepocet_zastavek_skol import prepocitej  # noqa: E402


def graf(zastavky):
    return {"metadata": {"reference_date": "2026-10-19"}, "stops": zastavky, "edges": {}, "headways": {}}


class PrepocetZastavekSkolTest(unittest.TestCase):
    def test_stare_id_nahradi_nejblizsi_zastavka_noveho_grafu(self):
        skoly = {"metadata": {}, "schools": {
            "600000001": {"stop_id": "CISJR:1|CRZ:2", "stop_name": "Město, Náměstí", "lat": 50.0, "lon": 14.0,
                          "distance_km": 0.1, "method": "address"},
        }}
        g = graf({
            "S1": ["Město, Náměstí", 50.001, 14.0],
            "S2": ["Město, Nádraží", 50.02, 14.0],
        })
        self.assertEqual(prepocitej(skoly, g), 1)
        zaznam = skoly["schools"]["600000001"]
        self.assertEqual((zaznam["stop_id"], zaznam["stop_name"]), ("S1", "Město, Náměstí"))
        self.assertAlmostEqual(zaznam["distance_km"], 0.111, places=2)
        self.assertEqual(zaznam["method"], "address")
        self.assertEqual(skoly["metadata"]["graph_reference_date"], "2026-10-19")

    def test_vzdalena_zastavka_se_najde_i_mimo_okoli(self):
        skoly = {"metadata": {}, "schools": {
            "600000002": {"stop_id": "S9", "stop_name": "x", "lat": 49.0, "lon": 16.0, "distance_km": 0.0},
        }}
        g = graf({"S9": ["Daleko", 49.5, 16.0]})
        self.assertEqual(prepocitej(skoly, g), 0)
        self.assertEqual(skoly["schools"]["600000002"]["stop_name"], "Daleko")
        self.assertGreater(skoly["schools"]["600000002"]["distance_km"], 50)


if __name__ == "__main__":
    unittest.main()
