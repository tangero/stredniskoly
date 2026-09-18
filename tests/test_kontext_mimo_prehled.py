"""Testy popisu oborů mimo přehled v kontextu přihlášek.

    python3 -m unittest tests/test_kontext_mimo_prehled.py -v
"""
from __future__ import annotations

import importlib.util
import sys
import unittest
from pathlib import Path

KOREN = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(KOREN / "scripts"))
import nazvy_oboru  # noqa: E402

_spec_i = importlib.util.spec_from_file_location("index", KOREN / "scripts" / "build-nazvy-oboru-rejstrik.py")
index_mod = importlib.util.module_from_spec(_spec_i)
_spec_i.loader.exec_module(index_mod)

_spec = importlib.util.spec_from_file_location("kontext", KOREN / "scripts" / "build-kontext-prihlasek.py")
kontext = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(kontext)


def zaznam(vys=(), niz=()):
    return {"obory_vys": [[k, 10] for k in vys], "obory_niz": [[k, 10] for k in niz]}


class TestKategorie(unittest.TestCase):
    def test_kategorie_bez_jednotne_zkousky(self):
        for klic in ("1_65-51-H/01", "1_29-51-E/01", "1_82-51-C/01", "1_82-44-P/01", "1_33-56-J/01"):
            with self.subTest(klic=klic):
                self.assertTrue(nazvy_oboru.bez_jednotne_zkousky(klic))
        for klic in ("1_65-42-M/01", "1_64-41-L/51", "1_79-41-K/41"):
            with self.subTest(klic=klic):
                self.assertFalse(nazvy_oboru.bez_jednotne_zkousky(klic))


class TestMimoPrehled(unittest.TestCase):
    NAZVY = {
        "1_65-42-M/01": {"skola": "Hotelová škola", "obec": "Praha", "obor": "Hotelnictví", "jpz": True},
        "1_65-51-H/01": {"skola": "Hotelová škola", "obec": "Praha", "obor": "Kuchař - číšník", "jpz": False},
    }

    def test_obor_v_katalogu_se_nevypisuje(self):
        self.assertEqual(kontext.mimo_prehled({"x": zaznam(vys=["1_65-42-M/01"])}, self.NAZVY), {})

    def test_obor_z_rejstriku_nese_nazev_a_kategorii(self):
        vystup = kontext.mimo_prehled({"x": zaznam(niz=["1_65-51-H/01"])}, self.NAZVY)
        self.assertEqual(vystup, {"1_65-51-H/01": {"skola": "Hotelová škola", "obec": "Praha",
                                                   "obor": "Kuchař - číšník", "bez_jednotne_zkousky": True}})

    def test_nedohledany_obor_zustane_bez_nazvu(self):
        vystup = kontext.mimo_prehled({"x": zaznam(vys=["2_82-41-M/01"])}, self.NAZVY)
        self.assertEqual(vystup["2_82-41-M/01"],
                         {"skola": None, "obec": None, "obor": None, "bez_jednotne_zkousky": False})


REJSTRIK = [{"redIzo": 1, "zkracenyNazev": "SŠ gastronomie", "adresa": {"obec": "Praha"},
             "skolyAZarizeni": [{"obory": [{"kod": "65-51-H/01", "nazev": "Kuchař - číšník"},
                                           {"kod": "65-42-M/01", "nazev": "Hotelnictví"}]}]},
            {"redIzo": 2, "zkracenyNazev": "ZŠ", "skolyAZarizeni": [{"obory": []}]}]


class TestIndex(unittest.TestCase):
    def test_index_nese_jen_skoly_s_obory(self):
        index = index_mod.sestav_index(REJSTRIK)
        self.assertEqual(index["skoly"], {"1": ["SŠ gastronomie", "Praha"]})
        self.assertEqual(index["nabidky"], {"1": ["65-42-M/01", "65-51-H/01"]})

    def test_dva_nazvy_jednoho_kodu_jsou_chyba(self):
        vadny = [{"redIzo": 1, "skolyAZarizeni": [{"obory": [{"kod": "X", "nazev": "a"}, {"kod": "X", "nazev": "b"}]}]}]
        with self.assertRaises(SystemExit):
            index_mod.sestav_index(vadny)

    def test_nazvy_z_indexu_a_katalog_ma_prednost(self):
        index = index_mod.sestav_index(REJSTRIK)
        katalog = {"2025": [{"id": "1_65-42-M/01", "redizo": "1", "kkov": "65-42-M/01", "nazev": "Hotelovka",
                             "obec": "Praha", "obor": "Hotelnictví"}], "2026": []}
        mapa = nazvy_oboru.nazvy_oboru(index=index, katalog=katalog, zobrazeny="2026")
        self.assertTrue(mapa["1_65-42-M/01"]["jpz"])
        self.assertEqual(mapa["1_65-51-H/01"], {"skola": "SŠ gastronomie", "obec": "Praha", "obor": "Kuchař - číšník",
                                                "id": None, "jpz": False})

    def test_poradi_rocniku_z_registru(self):
        self.assertEqual(nazvy_oboru.poradi_rocniku({"2024": [], "2025": [], "2026": []}, "2026"), ["2025", "2026"])
        self.assertEqual(nazvy_oboru.poradi_rocniku({"2026": [], "2027": []}, "2027"), ["2026", "2027"])

    def test_chybejici_nebo_zastaraly_index_je_chyba(self):
        import json
        import tempfile
        with tempfile.TemporaryDirectory() as d:
            registr = Path(d) / "registr.json"
            index = Path(d) / "index.json"

            def zapis(zobrazeno_registr, zobrazeno_index):
                registr.write_text(json.dumps({"sady": {"msmt-rejstrik-snimky": {"zobrazeno": zobrazeno_registr}}}))
                index.write_text(json.dumps({"meta": {"registr": zobrazeno_index}, "nabidky": {}}))

            puvodni = {"obdobi": "2026-06-30", "soubor": "data/msmt_rejstrik/rssz-2026-06-30.jsonld", "stazeno": "2026-09-12"}
            zapis(puvodni, puvodni)
            self.assertEqual(nazvy_oboru.nacti_index(index, registr)["nabidky"], {})
            with self.assertRaises(SystemExit):
                nazvy_oboru.nacti_index(Path(d) / "neni.json", registr)
            # Nové období
            zapis({**puvodni, "obdobi": "2026-09-30"}, puvodni)
            with self.assertRaises(SystemExit):
                nazvy_oboru.nacti_index(index, registr)
            # Revize téhož období převzatá příkazem prepni: záznam zobrazeno se přepíše
            zapis({"obdobi": "2026-06-30", "soubor": puvodni["soubor"], "prepnuto": "2026-10-02"}, puvodni)
            with self.assertRaises(SystemExit):
                nazvy_oboru.nacti_index(index, registr)

    def test_index_v_repozitari_odpovida_registru(self):
        self.assertTrue(nazvy_oboru.nacti_index()["nabidky"])


if __name__ == "__main__":
    unittest.main()
