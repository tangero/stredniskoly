"""Testy ručně ověřených párů v mapě nabídek.

    python3 -m unittest tests/test_offer_mapping.py -v
"""
from __future__ import annotations

import importlib.util
import tempfile
import unittest
from pathlib import Path

KOREN = Path(__file__).resolve().parents[1]
_spec = importlib.util.spec_from_file_location("mapa", KOREN / "scripts" / "build-offer-mapping-2026.py")
mapa = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(mapa)

NABIDKY = {"1_A_Kuchar": {}, "1_A_Cisnik": {}}
KATALOG = {"1_A_Gastronomie___kuchař", "1_A_Gastronomie___číšník"}


def csv_soubor(radky: list[str]) -> Path:
    f = tempfile.NamedTemporaryFile("w", suffix=".csv", delete=False)
    f.write("id_2026,katalog_id,doklad\n" + "".join(r + "\n" for r in radky))
    f.close()
    return Path(f.name)


class TestOverenePary(unittest.TestCase):
    def test_nacte_platne_pary(self):
        cesta = csv_soubor(["1_A_Kuchar,1_A_Gastronomie___kuchař,ručně"])
        self.assertEqual(mapa.nacti_overene(cesta, NABIDKY, KATALOG), {"1_A_Kuchar": "1_A_Gastronomie___kuchař"})

    def test_chybejici_soubor_je_prazdna_mapa(self):
        self.assertEqual(mapa.nacti_overene(Path("/neexistuje.csv"), NABIDKY, KATALOG), {})

    def test_neznama_nabidka_nebo_zaznam_katalogu_je_chyba(self):
        for radek in ("1_A_Barman,1_A_Gastronomie___kuchař,x", "1_A_Kuchar,1_A_Neexistuje,x"):
            with self.subTest(radek=radek), self.assertRaises(SystemExit):
                mapa.nacti_overene(csv_soubor([radek]), NABIDKY, KATALOG)

    def test_dvakrat_uvedena_nabidka_je_chyba(self):
        cesta = csv_soubor(["1_A_Kuchar,1_A_Gastronomie___kuchař,x", "1_A_Kuchar,1_A_Gastronomie___číšník,x"])
        with self.assertRaises(SystemExit):
            mapa.nacti_overene(cesta, NABIDKY, KATALOG)

    def test_soubor_v_repozitari_je_platny(self):
        import json
        prihlasky = {z["id"]: z for z in json.loads((KOREN / "public/applications_2026.json").read_text())["data"]}
        katalog = {z["id"] for z in json.loads((KOREN / "public/schools_data.json").read_text())["2025"]}
        self.assertTrue(mapa.nacti_overene(mapa.OVERENE, prihlasky, katalog))


if __name__ == "__main__":
    unittest.main()
