"""Testy popisu oborů mimo přehled v kontextu přihlášek.

    python3 -m unittest tests/test_kontext_mimo_prehled.py -v
"""
from __future__ import annotations

import importlib.util
import json
import sys
import tempfile
import unittest
import unittest.mock
from pathlib import Path

KOREN = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(KOREN / "scripts"))
import nazvy_oboru  # noqa: E402

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


class TestPrecedenceRocniku(unittest.TestCase):
    """Ročníky katalogu se procházejí od nejnovějšího, stejně jako na webu.

    Dokud se procházely v pevném pořadí `("2025", "2026")` se `setdefault`,
    vyhrával starší ročník: souběh přihlášek pak u sedmi škol ukazoval zkrácený
    název, zatímco stránka oboru úplný.
    """

    KATALOG = {
        "2024": [{"redizo": "1", "kkov": "79-41-K/41", "id": "1_79-41-K/41",
                  "nazev_display": "Gymnázium (2024)", "obec": "Praha", "obor": "Gymnázium"}],
        "2025": [{"redizo": "1", "kkov": "79-41-K/41", "id": "1_79-41-K/41",
                  "nazev_display": "Gymnázium, Laudova", "obec": "Praha", "obor": "Gymnázium"}],
        "2026": [{"redizo": "1", "kkov": "79-41-K/41", "id": "1_79-41-K/41",
                  "nazev_display": "Gymnázium, SOŠ a Pr. taneční konzervatoř, Laudova 1024",
                  "obec": "Praha", "obor": "Gymnázium"}],
    }

    def test_vyhrava_nejnovejsi_rocnik(self):
        with tempfile.TemporaryDirectory() as docasny:
            koren = Path(docasny)
            (koren / "public").mkdir()
            (koren / "public" / "schools_data.json").write_text(
                json.dumps(self.KATALOG, ensure_ascii=False), encoding="utf-8")
            with unittest.mock.patch.object(nazvy_oboru, "KOREN", koren):
                mapa = nazvy_oboru.nazvy_oboru(rejstrik=koren / "chybi.jsonld",
                                               povinny_rejstrik=False)
        self.assertEqual(mapa["1_79-41-K/41"]["skola"],
                         "Gymnázium, SOŠ a Pr. taneční konzervatoř, Laudova 1024")


class TestDeterminismus(unittest.TestCase):
    """Mezi záznamy téhož klíče rozhoduje `id`, ne pořadí v souboru.

    Klíč je REDIZO + kód oboru bez zaměření, takže ho nese několik nabídek téže
    školy; v katalogu 2026 je takových klíčů s rozdílným popisem 43. Bez pevného
    kritéria by přegenerování týchž dat mohlo dát jiný výsledek.
    """

    @staticmethod
    def katalog(poradi):
        return {"2026": [
            {"redizo": "1", "kkov": "79-41-K/41", "id": f"1_79-41-K/41_{z}",
             "nazev_display": f"Škola {z}", "obec": z, "obor": "Gymnázium"}
            for z in poradi
        ]}

    def vyber(self, poradi):
        with tempfile.TemporaryDirectory() as docasny:
            koren = Path(docasny)
            (koren / "public").mkdir()
            (koren / "public" / "schools_data.json").write_text(
                json.dumps(self.katalog(poradi), ensure_ascii=False), encoding="utf-8")
            with unittest.mock.patch.object(nazvy_oboru, "KOREN", koren):
                mapa = nazvy_oboru.nazvy_oboru(rejstrik=koren / "chybi.jsonld",
                                               povinny_rejstrik=False)
        return mapa["1_79-41-K/41"]["obec"]

    def test_poradi_zaznamu_vysledek_nemeni(self):
        self.assertEqual(self.vyber(["Trboušany", "Šlapanice"]), self.vyber(["Šlapanice", "Trboušany"]))

    def test_vybira_abecedne_prvni_id(self):
        # „Šlapanice“ má v id vyšší kód než „Trboušany“ podle bajtového řazení,
        # takže vítěz se pozná z id, ne z pořadí zápisu.
        vitez = self.vyber(["Trboušany", "Šlapanice"])
        self.assertEqual(vitez, min(["Trboušany", "Šlapanice"], key=lambda z: f"1_79-41-K/41_{z}"))


class TestPojistkaRejstriku(unittest.TestCase):
    """Bez snímku rejstříku se generátor musí zastavit, ne zapsat ochuzený výstup.

    Snímky se do gitu neukládají (30 MB), takže na cizím stroji chybí. Kdyby
    generátor v takovém případě jen varoval, přišel by web o víc než tisíc názvů
    oborů mimo katalog, aniž by si toho kdokoli všiml.
    """

    def test_chybejici_rejstrik_je_chyba(self):
        with self.assertRaises(FileNotFoundError) as chyba:
            nazvy_oboru.nazvy_oboru(rejstrik=Path("/neexistuje/rssz.jsonld"))
        self.assertIn("rssz.jsonld", str(chyba.exception))

    def test_volajici_si_smi_rejstrik_odpustit_vyslovne(self):
        mapa = nazvy_oboru.nazvy_oboru(rejstrik=Path("/neexistuje/rssz.jsonld"),
                                       povinny_rejstrik=False)
        # Katalog se načte, obory mimo katalog chybí — a volající o tom ví.
        self.assertTrue(mapa)
        self.assertTrue(all(v["jpz"] for v in mapa.values()))


if __name__ == "__main__":
    unittest.main()
