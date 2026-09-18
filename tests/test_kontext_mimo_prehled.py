"""Testy popisu oborů mimo přehled v kontextu přihlášek.

    python3 -m unittest tests/test_kontext_mimo_prehled.py -v
"""
from __future__ import annotations

import importlib.util
import json
import os
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


class ZakladKatalogu(unittest.TestCase):
    """Společná obsluha: katalog v dočasném adresáři, mapa názvů nad ním."""

    FIXTURE = Path(__file__).resolve().parent / "fixtures" / "rssz-test.jsonld"

    def mapa(self, katalog, rejstrik=None, povinny=False):
        with tempfile.TemporaryDirectory() as docasny:
            koren = Path(docasny)
            (koren / "public").mkdir()
            (koren / "public" / "schools_data.json").write_text(
                json.dumps(katalog, ensure_ascii=False), encoding="utf-8")
            with unittest.mock.patch.object(nazvy_oboru, "KOREN", koren):
                return nazvy_oboru.nazvy_oboru(
                    rejstrik=rejstrik if rejstrik is not None else koren / "chybi.jsonld",
                    povinny_rejstrik=povinny,
                )

    @staticmethod
    def nabidka(rok_popisu, obec="Praha", kkov="79-41-K/41", id_suffix=""):
        return {"redizo": "1", "kkov": kkov, "id": f"1_{kkov}{id_suffix}",
                "nazev_display": f"Škola {rok_popisu}", "obec": obec,
                "obor": f"Obor {rok_popisu}"}


class TestPrecedenceRocniku(ZakladKatalogu):
    """Vyhrává nejnovější ročník katalogu, stejně jako `nazvyOboru()` na webu.

    Dokud se ročníky procházely v pevném pořadí `("2025", "2026")` se
    `setdefault`, vyhrával starší a souběh přihlášek ukazoval jiný popis školy
    než stránka oboru.
    """

    def test_vyhrava_nejnovejsi_rocnik(self):
        mapa = self.mapa({"2025": [self.nabidka("2025")], "2026": [self.nabidka("2026")]})
        # Celý popis, ne jen název: mutace, která by brala z novějšího ročníku
        # jen jedno pole, musí spadnout.
        self.assertEqual(
            {k: v for k, v in mapa["1_79-41-K/41"].items() if k != "jpz"},
            {"skola": "Škola 2026", "obec": "Praha", "obor": "Obor 2026", "id": "1_79-41-K/41"},
        )

    def test_rocniky_mimo_dvojici_2025_2026(self):
        # Pevná dvojice ročníků by tenhle případ minula: klíč je jen v 2024.
        mapa = self.mapa({"2024": [self.nabidka("2024", kkov="63-41-M/01")]})
        self.assertEqual(mapa["1_63-41-M/01"]["skola"], "Škola 2024")

    def test_budouci_rocnik_vyhrava(self):
        # Ročník, který v pevném seznamu nebyl a přijde příště.
        mapa = self.mapa({"2026": [self.nabidka("2026")], "2027": [self.nabidka("2027")]})
        self.assertEqual(mapa["1_79-41-K/41"]["skola"], "Škola 2027")

    def test_poradi_rocniku_v_souboru_nerozhoduje(self):
        vzestupne = self.mapa({"2025": [self.nabidka("2025")], "2026": [self.nabidka("2026")]})
        sestupne = self.mapa({"2026": [self.nabidka("2026")], "2025": [self.nabidka("2025")]})
        self.assertEqual(vzestupne, sestupne)
        self.assertEqual(vzestupne["1_79-41-K/41"]["skola"], "Škola 2026")


class TestKonfliktniKlice(ZakladKatalogu):
    """Klíč s víc nabídkami: vyhrává první v pořadí souboru a funkce to hlásí.

    Klíč je REDIZO + kód oboru bez zaměření, takže ho nese například PORG pro
    osmileté gymnázium v Praze, Brně i Ostravě. Vybírat abecedně podle `id` jsem
    zkusil a zavrhl — u PORG by vyhrálo Brno jen kvůli diakritice v `id` a obec
    by se proti dnešnímu stavu změnila bez dokladu.
    """

    def dve_nabidky(self, poradi):
        return {"2026": [self.nabidka("A", obec=poradi[0], id_suffix=f"_{poradi[0]}"),
                         self.nabidka("B", obec=poradi[1], id_suffix=f"_{poradi[1]}")]}

    def test_vyhrava_prvni_v_souboru(self):
        self.assertEqual(self.mapa(self.dve_nabidky(["Brno", "Praha"]))["1_79-41-K/41"]["obec"], "Brno")
        self.assertEqual(self.mapa(self.dve_nabidky(["Praha", "Brno"]))["1_79-41-K/41"]["obec"], "Praha")

    def test_nabidky_se_neradi_podle_id(self):
        # Kdyby se řadilo podle `id`, vyhrála by abecedně první „Adamov“
        # bez ohledu na pořadí. Pravidlo je jiné: pořadí souboru.
        self.assertEqual(self.mapa(self.dve_nabidky(["Zlín", "Adamov"]))["1_79-41-K/41"]["obec"], "Zlín")

    def test_konflikt_jen_v_obci_se_hlasi(self):
        """Stejný název, rozdílná obec. Mutace, která z porovnání vypustí obec,
        musí spadnout — pozitivní test se shodným názvem ji jinak přežije."""
        katalog = {"2026": [
            {"redizo": "1", "kkov": "79-41-K/41", "id": "1_79-41-K/41_a",
             "nazev_display": "Táž škola", "obec": "Brno", "obor": "Gymnázium"},
            {"redizo": "1", "kkov": "79-41-K/41", "id": "1_79-41-K/41_b",
             "nazev_display": "Táž škola", "obec": "Praha", "obor": "Gymnázium"},
        ]}
        with unittest.mock.patch("builtins.print") as vypis:
            self.mapa(katalog)
        hlaseni = " ".join(str(a) for volani in vypis.call_args_list for a in volani.args)
        self.assertIn("víc nabídek s rozdílným popisem", hlaseni)

    def test_konflikt_jen_v_oboru_se_hlasi(self):
        """Stejný název i obec, rozdílný obor."""
        katalog = {"2026": [
            {"redizo": "1", "kkov": "79-41-K/41", "id": "1_79-41-K/41_a",
             "nazev_display": "Táž škola", "obec": "Brno", "obor": "Gymnázium"},
            {"redizo": "1", "kkov": "79-41-K/41", "id": "1_79-41-K/41_b",
             "nazev_display": "Táž škola", "obec": "Brno", "obor": "Gymnázium se sportovní přípravou"},
        ]}
        with unittest.mock.patch("builtins.print") as vypis:
            self.mapa(katalog)
        hlaseni = " ".join(str(a) for volani in vypis.call_args_list for a in volani.args)
        self.assertIn("víc nabídek s rozdílným popisem", hlaseni)

    def test_konflikt_se_hlasi(self):
        with unittest.mock.patch("builtins.print") as vypis:
            self.mapa(self.dve_nabidky(["Brno", "Praha"]))
        hlaseni = " ".join(str(a) for volani in vypis.call_args_list for a in volani.args)
        self.assertIn("víc nabídek s rozdílným popisem", hlaseni)

    def test_shodny_popis_se_nehlasi(self):
        katalog = {"2026": [self.nabidka("A", id_suffix="_x"), self.nabidka("A", id_suffix="_y")]}
        with unittest.mock.patch("builtins.print") as vypis:
            self.mapa(katalog)
        hlaseni = " ".join(str(a) for volani in vypis.call_args_list for a in volani.args)
        self.assertNotIn("víc nabídek", hlaseni)


class TestRejstrik(ZakladKatalogu):
    """Snímek rejstříku: bez něj se generátor zastaví, s ním doplní názvy.

    Snímky mají desítky megabajtů a do gitu se neukládají, takže na cizím stroji
    chybí. Kdyby generátor jen varoval, přišel by web o víc než tisíc názvů
    oborů mimo katalog, aniž by si toho kdokoli všiml.
    """

    KATALOG = {"2026": [{"redizo": "600000001", "kkov": "65-42-M/01",
                         "id": "600000001_65-42-M/01", "nazev_display": "Z katalogu",
                         "obec": "Zkušebnice", "obor": "Hotelnictví"}]}

    def test_rejstrik_je_povinny_ve_vychozim_stavu(self):
        """Bez parametrů je rejstřík povinný — tak ho volají oba generátory.

        Mutační test odhalil, že tohle nekryl žádný test: `povinny_rejstrik` se
        všude předával výslovně, takže změna výchozí hodnoty na `False` prošla.
        Generátory přitom volají `nazvy_oboru()` bez parametrů, takže na výchozí
        hodnotě stojí celá pojistka.
        """
        with tempfile.TemporaryDirectory() as docasny:
            koren = Path(docasny)
            (koren / "public").mkdir()
            (koren / "public" / "schools_data.json").write_text(
                json.dumps(self.KATALOG, ensure_ascii=False), encoding="utf-8")
            with unittest.mock.patch.object(nazvy_oboru, "KOREN", koren), \
                 unittest.mock.patch.object(nazvy_oboru, "REJSTRIK", koren / "chybi.jsonld"), \
                 unittest.mock.patch.dict(os.environ, {}, clear=False):
                os.environ.pop("MSMT_REJSTRIK", None)
                with self.assertRaises(FileNotFoundError):
                    nazvy_oboru.nazvy_oboru()

    def test_chybejici_rejstrik_je_chyba(self):
        with self.assertRaises(FileNotFoundError) as chyba:
            self.mapa(self.KATALOG, rejstrik=Path("/neexistuje/rssz.jsonld"), povinny=True)
        self.assertIn("rssz.jsonld", str(chyba.exception))

    def test_se_snimkem_se_nazvy_doplni(self):
        # Mutace „rejstřík vždy chybí“ tenhle test shodí: obor mimo katalog
        # musí dostat název z fixture, ne zůstat nedohledaný.
        mapa = self.mapa(self.KATALOG, rejstrik=self.FIXTURE, povinny=True)
        self.assertEqual(mapa["600000001_65-51-H/01"],
                         {"skola": "Zkušební hotelová škola", "obec": "Zkušebnice",
                          "obor": "Kuchař - číšník", "id": None, "jpz": False})
        # Katalog má přednost: týž klíč z katalogu si popis z rejstříku nepřepíše.
        self.assertEqual(mapa["600000001_65-42-M/01"]["skola"], "Z katalogu")
        self.assertTrue(mapa["600000001_65-42-M/01"]["jpz"])

    def test_skola_bez_zkraceneho_nazvu_pouzije_uplny(self):
        mapa = self.mapa(self.KATALOG, rejstrik=self.FIXTURE, povinny=True)
        self.assertEqual(mapa["600000002_41-51-E/01"]["skola"],
                         "Zkušební učiliště bez zkráceného názvu")

    def test_prazdny_snimek_je_chyba(self):
        """Existence souboru je slabší podmínka než jeho použitelnost.

        `{"list": []}` je platný JSON se správnou strukturou, projde `exists()`
        a nedodá ani jeden název — tedy přesně ten výsledek, kterému má pojistka
        zabránit. Totéž pro záznam bez `redIzo`.
        """
        for obsah in ({"list": []}, {"list": [{}]}, {"list": [{"redIzo": "9", "skolyAZarizeni": []}]}):
            with self.subTest(obsah=obsah), tempfile.TemporaryDirectory() as docasny:
                snimek = Path(docasny) / "prazdny.jsonld"
                snimek.write_text(json.dumps(obsah), encoding="utf-8")
                with self.assertRaises(ValueError) as chyba:
                    self.mapa(self.KATALOG, rejstrik=snimek, povinny=True)
                self.assertIn("nedodal ani jeden obor", str(chyba.exception))

    def test_poskozeny_snimek_ma_srozumitelnou_chybu(self):
        for obsah in ("{tohle není json", json.dumps({"bez_klice_list": 1})):
            with self.subTest(obsah=obsah[:20]), tempfile.TemporaryDirectory() as docasny:
                snimek = Path(docasny) / "spatny.jsonld"
                snimek.write_text(obsah, encoding="utf-8")
                with self.assertRaises(ValueError) as chyba:
                    self.mapa(self.KATALOG, rejstrik=snimek, povinny=True)
                # Zpráva musí nést cestu a odkaz na postup, ne jen typ výjimky.
                self.assertIn("nejde přečíst", str(chyba.exception))
                self.assertIn("README", str(chyba.exception))

    def test_volajici_si_smi_rejstrik_odpustit_vyslovne(self):
        mapa = self.mapa(self.KATALOG, rejstrik=Path("/neexistuje/rssz.jsonld"), povinny=False)
        # Přesná očekávaná mapa, ne jen neprázdnost: mutace, která by vrátila
        # jedinou položku nebo mapu z rejstříku, musí spadnout.
        self.assertEqual(mapa, {"600000001_65-42-M/01": {
            "skola": "Z katalogu", "obec": "Zkušebnice", "obor": "Hotelnictví",
            "id": "600000001_65-42-M/01", "jpz": True}})


if __name__ == "__main__":
    unittest.main()
