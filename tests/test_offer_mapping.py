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


def csv_soubor(radky: list[str], hlavicka: str = "id_2026,katalog_id,doklad", bom: bool = False) -> Path:
    f = tempfile.NamedTemporaryFile("w", suffix=".csv", delete=False, encoding="utf-8")
    f.write(("\ufeff" if bom else "") + hlavicka + "\n" + "".join(r + "\n" for r in radky))
    f.close()
    return Path(f.name)


def katalog(*idy: str) -> list[dict]:
    return [{"id": i, "zamereni": i.split("_", 2)[2] if i.count("_") >= 2 else ""} for i in idy]


def nabidky(*idy: str) -> dict[str, dict]:
    return {i: {"zamereni": i.split("_", 2)[2] if i.count("_") >= 2 else ""} for i in idy}


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

    def test_bom_a_vadny_soubor(self):
        cesta = csv_soubor(["1_A_Kuchar,1_A_Gastronomie___kuchař,x"], bom=True)
        self.assertEqual(mapa.nacti_overene(cesta, NABIDKY, KATALOG), {"1_A_Kuchar": "1_A_Gastronomie___kuchař"})
        for cesta in (csv_soubor(["1_A_Kuchar"], hlavicka="id_2026,doklad"), csv_soubor(["1_A_Kuchar"])):
            with self.subTest(cesta=cesta), self.assertRaises(SystemExit):
                mapa.nacti_overene(cesta, NABIDKY, KATALOG)

    def test_soubor_v_repozitari_je_platny(self):
        import json
        prihlasky = {z["id"]: z for z in json.loads((KOREN / "public/applications_2026.json").read_text())["data"]}
        katalog = {z["id"] for z in json.loads((KOREN / "public/schools_data.json").read_text())["2025"]}
        self.assertTrue(mapa.nacti_overene(mapa.OVERENE, prihlasky, katalog))


class TestSestavMapu(unittest.TestCase):
    def test_overeny_par_prebije_nejednoznacnost(self):
        # Katalog má u oboru dvě nabídky, rok 2026 jednu: heuristika by nemapovala.
        kat = katalog("1_A_nemecky_jazyk", "1_A_francouzsky_jazyk")
        m, duvody, _ = mapa.sestav_mapu(nabidky("1_A_nemcina"), kat, {"1_A_nemcina": "1_A_nemecky_jazyk"})
        self.assertEqual(m, {"1_A_nemcina": {"katalog_id": "1_A_nemecky_jazyk", "zpusob": "overeno_rucne"}})
        self.assertEqual(duvody["overeno_rucne"], 1)

    def test_bez_overeni_zustane_nesparovano(self):
        kat = katalog("1_A_nemecky_jazyk", "1_A_francouzsky_jazyk")
        m, duvody, _ = mapa.sestav_mapu(nabidky("1_A_nemcina"), kat, {})
        self.assertEqual(m, {})
        self.assertEqual(duvody["nejednoznacne_vic_v_katalogu"], 1)

    def test_dva_overene_pary_na_tentyz_zaznam_jsou_chyba(self):
        # Rozdělení jednoho loňského řádku na dva letošní: loňská čísla by dostaly obě stránky.
        kat = katalog("1_A_robotika", "1_A_grafika")
        nab = nabidky("1_A_robotika_a_programovani", "1_A_robotika_2")
        with self.assertRaises(SystemExit):
            mapa.sestav_mapu(nab, kat, {"1_A_robotika_a_programovani": "1_A_robotika",
                                        "1_A_robotika_2": "1_A_robotika"})

    def test_overeny_par_na_zaznam_s_primou_shodou_jine_nabidky_je_chyba(self):
        kat = katalog("1_A_kuchar", "1_A_cisnik")
        with self.assertRaises(SystemExit):
            mapa.sestav_mapu(nabidky("1_A_kuchar", "1_A_barman"), kat, {"1_A_barman": "1_A_kuchar"})

    def test_overeny_par_proti_prime_shode_klice(self):
        kat = katalog("1_A_kuchar", "1_A_cisnik")
        with self.assertRaises(SystemExit):
            mapa.sestav_mapu(nabidky("1_A_kuchar"), kat, {"1_A_kuchar": "1_A_cisnik"})
        m, duvody, _ = mapa.sestav_mapu(nabidky("1_A_kuchar"), kat, {"1_A_kuchar": "1_A_kuchar"})
        self.assertEqual((m, duvody["shoda_klice"]), ({}, 1))


if __name__ == "__main__":
    unittest.main()
