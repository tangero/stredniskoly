"""Testy popisu oborů mimo přehled v kontextu přihlášek.

    python3 -m unittest tests/test_kontext_mimo_prehled.py -v
"""
from __future__ import annotations

import importlib.util
import json
import unittest.mock
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
        self.assertEqual(nazvy_oboru.poradi_rocniku({"2024": [], "2025": [], "2026": []}, "2026"), ["2026", "2025", "2024"])
        self.assertEqual(nazvy_oboru.poradi_rocniku({"2026": [], "2027": []}, "2027"), ["2027", "2026"])
        # Ročník naimportovaný před přepnutím v registru se nečte.
        self.assertEqual(nazvy_oboru.poradi_rocniku({"2026": [], "2027": []}, "2026"), ["2026"])

    def test_chybejici_nebo_zastaraly_index_je_chyba(self):
        import json
        import tempfile
        with tempfile.TemporaryDirectory() as d:
            registr = Path(d) / "registr.json"
            index = Path(d) / "index.json"

            def zapis(zobrazeno_registr, zobrazeno_index):
                registr.write_text(json.dumps({"sady": {"msmt-rejstrik-snimky": {"zobrazeno": zobrazeno_registr}}}))
                index.write_text(json.dumps({"meta": {"registr": zobrazeno_index}, "nabidky": {"1": ["X"]}}))

            puvodni = {"obdobi": "2026-06-30", "soubor": "data/msmt_rejstrik/rssz-2026-06-30.jsonld", "sha256": "aaa"}
            zapis(puvodni, puvodni)
            self.assertEqual(nazvy_oboru.nacti_index(index, registr)["nabidky"], {"1": ["X"]})
            with self.assertRaises(SystemExit):
                nazvy_oboru.nacti_index(Path(d) / "neni.json", registr)
            # Nové období
            zapis({**puvodni, "obdobi": "2026-09-30"}, puvodni)
            with self.assertRaises(SystemExit):
                nazvy_oboru.nacti_index(index, registr)
            # Revize téhož období převzatá týž den: liší se jen otisk
            zapis({**puvodni, "sha256": "bbb"}, puvodni)
            with self.assertRaises(SystemExit):
                nazvy_oboru.nacti_index(index, registr)
            # Registr bez otisku nestačí na ověření indexu
            bez_otisku = {k: v for k, v in puvodni.items() if k != "sha256"}
            zapis(bez_otisku, bez_otisku)
            with self.assertRaises(SystemExit):
                nazvy_oboru.nacti_index(index, registr)

    def test_index_v_repozitari_odpovida_registru(self):
        self.assertTrue(nazvy_oboru.nacti_index()["nabidky"])


INDEX_TEST = {"skoly": {"600000001": ["Zkušební hotelová škola", "Zkušebnice"],
                        "600000002": ["Zkušební učiliště", "Zkušebnice"]},
              "obory": {"65-51-H/01": "Kuchař - číšník", "65-42-M/01": "Hotelnictví", "41-51-E/01": "Zemědělec"},
              "nabidky": {"600000001": ["65-42-M/01", "65-51-H/01"], "600000002": ["41-51-E/01"]}}


class ZakladKatalogu(unittest.TestCase):
    """Mapa názvů nad vstrčeným katalogem a indexem, zobrazený ročník jako v registru."""

    def mapa(self, katalog, zobrazeny=None, index=INDEX_TEST):
        zobrazeny = zobrazeny or max(katalog, key=int)
        return nazvy_oboru.nazvy_oboru(index=index, katalog=katalog, zobrazeny=zobrazeny)

    @staticmethod
    def nabidka(rok_popisu, obec="Praha", kkov="79-41-K/41", id_suffix=""):
        return {"redizo": "1", "kkov": kkov, "id": f"1_{kkov}{id_suffix}",
                "nazev_display": f"Škola {rok_popisu}", "obec": obec, "obor": f"Obor {rok_popisu}"}


class TestPrecedenceRocniku(ZakladKatalogu):
    """Vyhrává nejnovější zobrazený ročník katalogu, stejně jako `nazvyOboru()` na webu."""

    def test_vyhrava_nejnovejsi_rocnik(self):
        mapa = self.mapa({"2025": [self.nabidka("2025")], "2026": [self.nabidka("2026")]})
        # Celý popis, ne jen název: mutace, která by brala z novějšího ročníku jen jedno pole, musí spadnout.
        self.assertEqual({k: v for k, v in mapa["1_79-41-K/41"].items() if k != "jpz"},
                         {"skola": "Škola 2026", "obec": "Praha", "obor": "Obor 2026", "id": "1_79-41-K/41"})

    def test_rocniky_mimo_dvojici_2025_2026(self):
        # Pevná dvojice ročníků by tenhle případ minula: klíč je jen v 2024.
        mapa = self.mapa({"2024": [self.nabidka("2024", kkov="63-41-M/01")], "2026": []}, zobrazeny="2026")
        self.assertEqual(mapa["1_63-41-M/01"]["skola"], "Škola 2024")

    def test_budouci_rocnik_vyhrava_az_po_prepnuti(self):
        katalog = {"2026": [self.nabidka("2026")], "2027": [self.nabidka("2027")]}
        # Import předchází přepnutí: dokud registr zobrazuje 2026, ročník 2027 se nečte.
        self.assertEqual(self.mapa(katalog, zobrazeny="2026")["1_79-41-K/41"]["skola"], "Škola 2026")
        self.assertEqual(self.mapa(katalog, zobrazeny="2027")["1_79-41-K/41"]["skola"], "Škola 2027")

    def test_poradi_rocniku_v_souboru_nerozhoduje(self):
        vzestupne = self.mapa({"2025": [self.nabidka("2025")], "2026": [self.nabidka("2026")]})
        sestupne = self.mapa({"2026": [self.nabidka("2026")], "2025": [self.nabidka("2025")]})
        self.assertEqual(vzestupne, sestupne)
        self.assertEqual(vzestupne["1_79-41-K/41"]["skola"], "Škola 2026")


class TestKonfliktniKlice(ZakladKatalogu):
    """Klíč s víc nabídkami: vyhrává první v pořadí souboru a funkce to hlásí.

    Klíč je REDIZO + kód oboru bez zaměření (PORG: osmileté gymnázium v Praze, Brně i Ostravě).
    Řazení podle `id` bylo zavrženo: u PORG by vyhrálo Brno jen kvůli diakritice v `id`.
    """

    def dve_nabidky(self, poradi):
        return {"2026": [self.nabidka("A", obec=poradi[0], id_suffix=f"_{poradi[0]}"),
                         self.nabidka("B", obec=poradi[1], id_suffix=f"_{poradi[1]}")]}

    def hlaseni(self, katalog):
        with unittest.mock.patch("builtins.print") as vypis:
            self.mapa(katalog)
        return " ".join(str(a) for volani in vypis.call_args_list for a in volani.args)

    def test_vyhrava_prvni_v_souboru(self):
        self.assertEqual(self.mapa(self.dve_nabidky(["Brno", "Praha"]))["1_79-41-K/41"]["obec"], "Brno")
        self.assertEqual(self.mapa(self.dve_nabidky(["Praha", "Brno"]))["1_79-41-K/41"]["obec"], "Praha")

    def test_nabidky_se_neradi_podle_id(self):
        self.assertEqual(self.mapa(self.dve_nabidky(["Zlín", "Adamov"]))["1_79-41-K/41"]["obec"], "Zlín")

    def test_konflikt_jen_v_obci_se_hlasi(self):
        katalog = {"2026": [
            {"redizo": "1", "kkov": "79-41-K/41", "id": "1_79-41-K/41_a", "nazev_display": "Táž škola", "obec": "Brno", "obor": "Gymnázium"},
            {"redizo": "1", "kkov": "79-41-K/41", "id": "1_79-41-K/41_b", "nazev_display": "Táž škola", "obec": "Praha", "obor": "Gymnázium"}]}
        self.assertIn("víc nabídek s rozdílným popisem", self.hlaseni(katalog))

    def test_konflikt_jen_v_oboru_se_hlasi(self):
        katalog = {"2026": [
            {"redizo": "1", "kkov": "79-41-K/41", "id": "1_79-41-K/41_a", "nazev_display": "Táž škola", "obec": "Brno", "obor": "Gymnázium"},
            {"redizo": "1", "kkov": "79-41-K/41", "id": "1_79-41-K/41_b", "nazev_display": "Táž škola", "obec": "Brno",
             "obor": "Gymnázium se sportovní přípravou"}]}
        self.assertIn("víc nabídek s rozdílným popisem", self.hlaseni(katalog))

    def test_shodny_popis_se_nehlasi(self):
        katalog = {"2026": [self.nabidka("A", id_suffix="_x"), self.nabidka("A", id_suffix="_y")]}
        self.assertNotIn("víc nabídek", self.hlaseni(katalog))


class TestIndexVMape(ZakladKatalogu):
    """Názvy oborů mimo katalog z indexu; bez použitelného indexu se generátor zastaví."""

    KATALOG = {"2026": [{"redizo": "600000001", "kkov": "65-42-M/01", "id": "600000001_65-42-M/01",
                         "nazev_display": "Z katalogu", "obec": "Zkušebnice", "obor": "Hotelnictví"}]}

    def test_z_indexu_se_nazvy_doplni_a_katalog_ma_prednost(self):
        mapa = self.mapa(self.KATALOG)
        self.assertEqual(mapa["600000001_65-51-H/01"], {"skola": "Zkušební hotelová škola", "obec": "Zkušebnice",
                                                        "obor": "Kuchař - číšník", "id": None, "jpz": False})
        self.assertEqual(mapa["600000001_65-42-M/01"]["skola"], "Z katalogu")
        self.assertTrue(mapa["600000001_65-42-M/01"]["jpz"])

    def test_vychozi_volani_bez_indexu_je_chyba(self):
        # Generátory volají nazvy_oboru() bez parametrů; na výchozím chování stojí celá pojistka.
        with unittest.mock.patch.object(nazvy_oboru, "INDEX", Path("/neexistuje/nazvy-oboru.json")):
            with self.assertRaises(SystemExit):
                nazvy_oboru.nazvy_oboru(katalog=self.KATALOG, zobrazeny="2026")

    def test_prazdny_index_je_chyba(self):
        import tempfile
        with tempfile.TemporaryDirectory() as d:
            registr = Path(d) / "registr.json"
            zobrazeno = {"obdobi": "2026-06-30", "soubor": "x.jsonld", "sha256": "aaa"}
            registr.write_text(json.dumps({"sady": {"msmt-rejstrik-snimky": {"zobrazeno": zobrazeno}}}))
            index = Path(d) / "index.json"
            index.write_text(json.dumps({"meta": {"registr": zobrazeno}, "skoly": {}, "obory": {}, "nabidky": {}}))
            with self.assertRaises(SystemExit):
                nazvy_oboru.nacti_index(index, registr)


if __name__ == "__main__":
    unittest.main()
