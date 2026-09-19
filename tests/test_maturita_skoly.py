"""Testy zpracování maturitních výsledků (scripts/build-maturita-skoly.py) na syntetickém souboru."""
from __future__ import annotations

import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

import openpyxl

KOREN = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("build_maturita", KOREN / "scripts" / "build-maturita-skoly.py")
bm = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bm)

IDENT = ["entita_id_row", "id_row", "TŘÍDĚNÍ", "ROK", "REDIZO", "NÁZEV ŠKOLY", "ADRESA ŠKOLY", "TYP ŠKOLY",
         "TYP ŠKOLY - NÁZEV", "SMO16", "SMO16 - NÁZEV", "KRAJ", "KRAJ - NÁZEV"]
CELKEM = ["PŘIHLÁŠENI", "KONALI", "USPĚLI", "NEUSPĚLI", "NEKONALI", "PODÍL ÚSPĚŠNÝCH (%)", "ČISTÁ NEÚSPĚŠNOST (%)",
          "HRUBÁ NEÚSPĚŠNOST (%)", "NEÚČAST (%)"]
# Směrodatná odchylka stojí před percentilem jako ve skutečném souboru: past z §9.1 návrhu.
PREDMET = ["PŘIHLÁŠENI", "KONALI", "USPĚLI", "NEUSPĚLI", "NEKONALI", "PRŮMĚRNÝ % SKÓR", "SMĚRODATNÁ ODCHYLKA % SKÓRU",
           "PRŮMĚRNÉ PERCENTILOVÉ UMÍSTĚNÍ", "PODÍL ÚSPĚŠNÝCH (%)", "ČISTÁ NEÚSPĚŠNOST (%)"]


def radek(trideni, redizo, smo, n, skor, sd, percentil, uspesnost=100, ma_volba=50, nazev=None, adresa="adresa"):
    ident = [f"{trideni}_{redizo}_{smo}", f"{redizo}_{smo}", trideni, 2026, redizo, nazev or f"Škola {redizo}", adresa,
             "GYM", "GYMNÁZIUM", smo, f"SKUPINA {smo}", "CZ010", "Praha"]
    celkem = [n, n, n, 0, 0, uspesnost, 0, 0, 0]
    cj = [n, n, n, 0, 0, skor, sd, percentil, 100, 0]
    ma = [n // 2, n // 2, n // 2, 0, 0, 60, 15, 55, 100, 0, ma_volba]
    return ident + celkem + cj + ma


def zapis_soubor(cesta: Path, radky: list[list], vynech_percentil=False):
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "2026"
    predmet = [s for s in PREDMET if not (vynech_percentil and s.startswith("PRŮMĚRNÉ PERCENTILOVÉ"))]
    h1 = [None] * len(IDENT)
    h1[2] = "MATURITNÍ ZKOUŠKA - SPOLEČNÁ ČÁST - VÝSLEDKY V JARNÍM ZKUŠEBNÍM OBDOBÍ"
    h1[12] = 2026
    h1 += ["SPOLEČNÁ ČÁST MZ CELKEM"] + [None] * (len(CELKEM) - 1)
    h1 += ["ČESKÝ JAZYK"] + [None] * (len(predmet) - 1)
    h1 += ["MATEMATIKA"] + [None] * len(PREDMET)
    h2 = IDENT + CELKEM + predmet + PREDMET + ["PODÍL VOLBY PŘEDMĚTU (%)"]
    ws.append(h1)
    ws.append(h2)
    for r in radky:
        if vynech_percentil:
            r = r[:len(IDENT) + len(CELKEM) + 7] + r[len(IDENT) + len(CELKEM) + 8:]
        ws.append(r)
    wb.save(cesta)


def skupina_gy8():
    radky = [radek("redizo_smo16", f"6000000{i:02d}", "GY8", 40, 70 + i, 10, 60 + i) for i in range(11)]
    radky.append(radek("redizo_smo16", "600000100", "GY8", 60, 95, 5, 95))       # nad skupinou
    radky.append(radek("redizo_smo16", "600000101", "GY8", 60, 50, 5, 30))       # pod skupinou
    radky.append(radek("redizo_smo16", "600000102", "GY8", 12, 76, 20, 70))      # nerozlišitelné, malý vzorek
    radky.append(radek("redizo_smo16", "600000103", "GY8", 6, 99, 1, 99, ma_volba=33))  # jen počty
    radky.append(radek("redizo", "600000100", "CELKEM", 60, 95, 5, 95))
    return radky


class TestMaturitaSkoly(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.dir = Path(self.tmp.name)

    def tearDown(self):
        self.tmp.cleanup()

    def sestav(self, radky, **kw):
        soubor = self.dir / "MZ2026j_SC_skolobory.xlsx"
        zapis_soubor(soubor, radky, **kw)
        return bm.sestav({2026: soubor}, None)

    def test_zarazeni_proti_skupine(self):
        vystup = self.sestav(skupina_gy8())
        skoly = vystup["skoly"]
        self.assertEqual(skoly["600000100"]["roky"]["2026"]["GY8"]["cj"]["groupComparison"]["state"], "above")
        self.assertEqual(skoly["600000101"]["roky"]["2026"]["GY8"]["cj"]["groupComparison"]["state"], "below")
        self.assertEqual(skoly["600000102"]["roky"]["2026"]["GY8"]["cj"]["groupComparison"]["state"], "indistinguishable")
        # Reference jen ze škol s aspoň 10 konajícími: škola se šesti maturanty do mediánu nevstupuje.
        self.assertEqual(vystup["skupiny"]["2026"]["GY8"]["schools"], 14)
        self.assertNotIn("groupComparison", skoly["600000100"]["roky"]["2026"]["CELKEM"]["cj"])

    def test_percentil_se_necte_ze_smerodatne_odchylky(self):
        cj = self.sestav(skupina_gy8())["skoly"]["600000100"]["roky"]["2026"]["GY8"]["cj"]
        self.assertEqual(cj["averagePercentile"], 95)
        self.assertEqual(cj["standardDeviation"], 5)

    def test_meze_zverejneni(self):
        skoly = self.sestav(skupina_gy8())["skoly"]
        male = skoly["600000103"]["roky"]["2026"]["GY8"]
        self.assertEqual(male["cj"]["quality"], "counts_only")
        self.assertNotIn("averagePercentile", male["cj"])
        self.assertNotIn("passRate", male["spolecna_cast"])
        self.assertEqual(male["cj"]["took"], 6)
        self.assertNotIn("groupComparison", male["cj"])
        self.assertEqual(skoly["600000102"]["roky"]["2026"]["GY8"]["cj"]["quality"], "small_sample")
        self.assertEqual(skoly["600000100"]["roky"]["2026"]["GY8"]["cj"]["quality"], "complete")

    def test_podil_volby_zustava_i_u_malych_skupin(self):
        ma = self.sestav(skupina_gy8())["skoly"]["600000103"]["roky"]["2026"]["GY8"]["ma"]
        self.assertEqual(ma["quality"], "counts_only")
        self.assertEqual(ma["subjectChoiceShare"], 33)
        self.assertNotIn("averagePercentile", ma)

    def test_nezverejnena_hodnota_neni_nula(self):
        radky = skupina_gy8()
        radky[0][len(IDENT) + len(CELKEM) + 7] = "-"
        cj = self.sestav(radky)["skoly"]["600000000"]["roky"]["2026"]["GY8"]["cj"]
        self.assertNotIn("averagePercentile", cj)

    def test_chybejici_sloupec_zastavi_zpracovani(self):
        with self.assertRaisesRegex(ValueError, "PRUMERNE PERCENTILOVE UMISTENI"):
            self.sestav(skupina_gy8(), vynech_percentil=True)

    def test_rok_pred_zlomem_metodiky(self):
        soubor = self.dir / "MZ2019j_SC_skolobory.xlsx"
        zapis_soubor(soubor, skupina_gy8())
        with self.assertRaisesRegex(ValueError, "jiné škále"):
            bm.sestav({2019: soubor}, None)

    def test_zaklad_ponecha_jine_roky(self):
        vystup = self.sestav(skupina_gy8())
        vystup["skupiny"]["2025"] = {"GY8": {"schools": 1, "medianPercentScore": 70}}
        vystup["skoly"]["600000100"]["roky"]["2025"] = {"GY8": {"cj": {"took": 50}}}
        soubor = self.dir / "MZ2026j_SC_skolobory.xlsx"
        dalsi = bm.sestav({2026: soubor}, vystup)
        self.assertEqual(dalsi["meta"]["roky"], [2025, 2026])
        self.assertIn("2025", dalsi["skoly"]["600000100"]["roky"])
        self.assertEqual(dalsi["meta"]["nejnovejsi_rok"], 2026)


def clenove_skupiny(smo, prvni_redizo, pocet=11):
    """Skupina oborů s dost školami, aby měla referenční medián."""
    return [radek("redizo_smo16", str(prvni_redizo + i), smo, 40, 70 + i, 10, 60 + i) for i in range(pocet)]


class TestOrganizacniZmeny(unittest.TestCase):
    """Přejímací podmínka 7 (návrh §8): více SMO16 u jedné školy, změna REDIZO, sloučení, více pracovišť.

    Společné pravidlo, které tyhle testy hlídají: školní agregát se nesmí rozkopírovat na skupiny
    oborů a starší hodnoty se nesmí připojit k nástupci bez doložené návaznosti (návrh §7).
    """

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.dir = Path(self.tmp.name)

    def tearDown(self):
        self.tmp.cleanup()

    def soubor(self, rok, radky):
        cesta = self.dir / f"MZ{rok}j_SC_skolobory.xlsx"
        zapis_soubor(cesta, radky)
        return cesta

    def test_skola_s_vice_skupinami_oboru(self):
        """Tři skupiny oborů zůstanou oddělené a školní agregát se na ně nepřepíše."""
        radky = clenove_skupiny("GY8", 600000000) + clenove_skupiny("GY4", 600000200) + clenove_skupiny("LYC", 600000400)
        # Jedna škola nabízí všechny tři skupiny; v každé má jiný výsledek.
        radky += [
            radek("redizo_smo16", "600000900", "GY8", 60, 95, 5, 95),
            radek("redizo_smo16", "600000900", "GY4", 60, 50, 5, 30),
            radek("redizo_smo16", "600000900", "LYC", 12, 76, 20, 70),
            radek("redizo", "600000900", "CELKEM", 132, 80, 10, 70),
        ]
        vystup = bm.sestav({2026: self.soubor(2026, radky)}, None)
        skola = vystup["skoly"]["600000900"]["roky"]["2026"]
        self.assertEqual(sorted(skola), ["CELKEM", "GY4", "GY8", "LYC"])
        self.assertEqual(skola["GY8"]["cj"]["groupComparison"]["state"], "above")
        self.assertEqual(skola["GY4"]["cj"]["groupComparison"]["state"], "below")
        self.assertEqual(skola["LYC"]["cj"]["groupComparison"]["state"], "indistinguishable")
        # Školní agregát nesmí nést zařazení: není z něj poznat, ke které skupině patří.
        self.assertNotIn("groupComparison", skola["CELKEM"]["cj"])
        # Do reference každé skupiny vstoupí škola právě jednou, ne třikrát. V lyceu má jen
        # dvanáct maturantů, což na vstup do reference stačí (práh je deset konajících).
        for smo in ("GY8", "GY4", "LYC"):
            self.assertEqual(vystup["skupiny"]["2026"][smo]["schools"], 12)

    def test_zmena_redizo_nespoji_radu(self):
        """Škola s novým REDIZO je nová škola; loňské hodnoty se k ní nepřipojí."""
        loni = clenove_skupiny("GY8", 600000000) + [
            radek("redizo_smo16", "600000900", "GY8", 60, 95, 5, 95, nazev="Gymnázium"),
            radek("redizo", "600000900", "CELKEM", 60, 95, 5, 95, nazev="Gymnázium"),
        ]
        letos = clenove_skupiny("GY8", 600000000) + [
            radek("redizo_smo16", "600000901", "GY8", 60, 95, 5, 95, nazev="Gymnázium"),
            radek("redizo", "600000901", "CELKEM", 60, 95, 5, 95, nazev="Gymnázium"),
        ]
        vystup = bm.sestav({2025: self.soubor(2025, loni), 2026: self.soubor(2026, letos)}, None)
        self.assertEqual(sorted(vystup["skoly"]["600000900"]["roky"]), ["2025"])
        self.assertEqual(sorted(vystup["skoly"]["600000901"]["roky"]), ["2026"])
        self.assertEqual(vystup["meta"]["roky"], [2025, 2026])

    def test_slouceni_skoly_neprevezme_historii(self):
        """Ze dvou škol zbude jedna: nástupce má jen svůj rok, zaniklá škola zůstane s loňským."""
        loni = clenove_skupiny("GY8", 600000000) + [
            radek("redizo_smo16", "600000900", "GY8", 40, 90, 5, 90),
            radek("redizo_smo16", "600000901", "GY8", 30, 60, 5, 35),
            radek("redizo", "600000900", "CELKEM", 40, 90, 5, 90),
            radek("redizo", "600000901", "CELKEM", 30, 60, 5, 35),
        ]
        letos = clenove_skupiny("GY8", 600000000) + [
            radek("redizo_smo16", "600000900", "GY8", 70, 80, 5, 75),
            radek("redizo", "600000900", "CELKEM", 70, 80, 5, 75),
        ]
        vystup = bm.sestav({2025: self.soubor(2025, loni), 2026: self.soubor(2026, letos)}, None)
        self.assertEqual(sorted(vystup["skoly"]["600000900"]["roky"]), ["2025", "2026"])
        self.assertEqual(sorted(vystup["skoly"]["600000901"]["roky"]), ["2025"])
        # Zaniklá škola do reference letošního roku nevstupuje.
        self.assertEqual(vystup["skupiny"]["2025"]["GY8"]["schools"], 13)
        self.assertEqual(vystup["skupiny"]["2026"]["GY8"]["schools"], 12)

    def test_vice_pracovist_jako_duplicitni_radek_zastavi_zpracovani(self):
        """Dva řádky téže školy a skupiny oborů by se tiše přepsaly; zpracování musí spadnout."""
        radky = clenove_skupiny("GY8", 600000000) + [
            radek("redizo_smo16", "600000900", "GY8", 40, 90, 5, 90, adresa="Nad Štolou 1510"),
            radek("redizo_smo16", "600000900", "GY8", 20, 50, 5, 20, adresa="odloučené pracoviště"),
        ]
        with self.assertRaisesRegex(ValueError, "duplicitní řádek redizo_smo16 600000900 GY8"):
            bm.sestav({2026: self.soubor(2026, radky)}, None)

    def test_zanikla_skupina_oboru_nezustane_v_novem_roce(self):
        """Škola přestala nabízet jednu skupinu oborů: v novém roce tam nesmí zůstat loňská hodnota."""
        loni = clenove_skupiny("GY8", 600000000) + clenove_skupiny("GY4", 600000200) + [
            radek("redizo_smo16", "600000900", "GY8", 40, 90, 5, 90),
            radek("redizo_smo16", "600000900", "GY4", 40, 70, 5, 60),
            radek("redizo", "600000900", "CELKEM", 80, 80, 5, 75),
        ]
        letos = clenove_skupiny("GY8", 600000000) + clenove_skupiny("GY4", 600000200) + [
            radek("redizo_smo16", "600000900", "GY8", 40, 90, 5, 90),
            radek("redizo", "600000900", "CELKEM", 40, 90, 5, 90),
        ]
        vystup = bm.sestav({2025: self.soubor(2025, loni), 2026: self.soubor(2026, letos)}, None)
        roky = vystup["skoly"]["600000900"]["roky"]
        self.assertEqual(sorted(roky["2025"]), ["CELKEM", "GY4", "GY8"])
        self.assertEqual(sorted(roky["2026"]), ["CELKEM", "GY8"])


class TestLinkaMaturita(unittest.TestCase):
    """Zpracovatel datové linky pro sadu cermat-maturita."""

    def setUp(self):
        import sys
        sys.path.insert(0, str(KOREN / "scripts"))
        from linka import zpracovani
        self.zpracovani = zpracovani
        self.tmp = tempfile.TemporaryDirectory()
        self.dir = Path(self.tmp.name)

    def tearDown(self):
        self.tmp.cleanup()

    def uloha(self, url):
        return {"kod": "TEST1", "sada": "cermat-maturita", "druh": "nove_obdobi", "obdobi": "2026", "url": url}

    def test_jaro_se_zpracuje_a_starsi_rocnik_muze_chybet(self):
        soubor = self.dir / "MZ2026j_SC_skolobory.xlsx"
        zapis_soubor(soubor, skupina_gy8())
        stazene = []

        def stahni(url, cil):
            stazene.append(url)
            raise OSError("404")

        # Stávající výstup ukazuje na neexistující soubor v dočasném adresáři, aby se
        # pojistka neporovnávala s ostrým public/maturita_skoly.json.
        vysledek = self.zpracovani.zpracuj_maturitu(
            self.uloha("https://example.test/MZ2026j_SC_skolobory.xlsx"), soubor, self.dir, {}, stahni_fn=stahni,
            stavajici=self.dir / "neexistuje.json")
        self.assertEqual(len(stazene), 3)
        self.assertIn("MZ2023j_", stazene[0])
        self.assertEqual(list(vysledek["predani"].values()), ["public/maturita_skoly.json"])
        self.assertIn("v roce 2026 škol", vysledek["srovnani"]["popis"])
        self.assertIn("na webu zatím nic", vysledek["srovnani"]["popis"])

    def test_pojistka_zastavi_podezrele_maly_vystup(self):
        """Když nový soubor nese zlomek škol proti webu, úloha musí selhat, ne tiše předat."""
        soubor = self.dir / "MZ2026j_SC_skolobory.xlsx"
        zapis_soubor(soubor, skupina_gy8())
        # Základ tváříci se jako web s mnoha školami; nový soubor jich má patnáct.
        zaklad = self.dir / "zaklad.json"
        zaklad.write_text(json.dumps({
            "meta": {"nejnovejsi_rok": 2026, "roky": [2026]},
            "skupiny": {},
            "skoly": {f"6000{i:05d}": {"roky": {"2026": {"GY8": {"cj": {"took": 40}}}}} for i in range(200)},
        }, ensure_ascii=False), encoding="utf-8")

        with self.assertRaisesRegex(ValueError, "podezřele málo škol"):
            self.zpracovani.zpracuj_maturitu(
                self.uloha("https://example.test/MZ2026j_SC_skolobory.xlsx"), soubor, self.dir, {},
                stahni_fn=lambda url, cil: (_ for _ in ()).throw(OSError("404")), stavajici=zaklad)

    def test_stav_po_podzimu_se_nepreda(self):
        vysledek = self.zpracovani.zpracuj_maturitu(
            self.uloha("https://example.test/MZ2025jap_SC_skolobory.xlsx"), self.dir / "x.xlsx", self.dir, {})
        self.assertEqual(vysledek["predani"], {})


if __name__ == "__main__":
    unittest.main()
