"""Testy importu 2. kola a jeho zpracovatele v datové lince, bez sítě mimo lokální server.

    python3 -m unittest tests/test_druhe_kolo.py -v
"""
from __future__ import annotations

import importlib.util
import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

import openpyxl

KOREN = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(KOREN / "scripts"))
sys.path.insert(0, str(KOREN / "tests"))

_spec = importlib.util.spec_from_file_location("dk", KOREN / "scripts" / "build-druhe-kolo.py")
dk = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(dk)

HLAVICKA = list(dict.fromkeys(("ID_SOF",) + dk.POVINNE))


def radek(redizo, kkov, zamereni="", kapacita=30, prijati=30, prihlasky=40, neveslo=0, konali=0, minimum=None, delka=4, jpz=1, zkraceno="ne"):
    return {
        "ID_SOF": f"{redizo}-{kkov}-{zamereni}-{delka}", "REDIZO": redizo, "KKOV": kkov, "ZAMĚŘENÍ OBORU": zamereni,
        "FORMA VZDĚLÁVÁNÍ": "den", "DÉLKA STUDIA": delka, "ZKRÁCENÉ STUDIUM": zkraceno, "JAZYK STUDIA": "Český",
        "POVINNOST JPZ": jpz, "KAPACITA": kapacita, "PŘIHLÁŠKY CELKEM": prihlasky, "PŘIJATÍ": prijati,
        "NEPŘIJATI - NEDOSTATEČNÁ KAPACITA": neveslo, "NEPŘIJATI - NESPLNĚNÍ PODMÍNEK": 1,
        "NEPŘIJATI - PŘIJAT NA VYŠŠÍ PRIORITU": 2, "ČJ+MA - KONALI (PŘIJATI)": konali, "ČJ+MA - % SKÓR - MIN (PŘIJATI)": minimum,
    }


def uloz(cesta: Path, radky: list[dict]) -> None:
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "PZ-vysledky"
    ws.append(HLAVICKA)
    for r in radky:
        ws.append([r.get(s) for s in HLAVICKA])
    wb.save(cesta)


def vytvor_soubory(tmp: Path) -> None:
    """Syntetické výsledky 1. a 2. kola pokrývající všechny stavy nabídky."""
    uloz(tmp / "k1.xlsx", [
        radek("1", "79-41-K/41", "Všeobecné", kapacita=30, prijati=20),   # nenaplněno, 2. kolo vypsáno
            radek("2", "63-41-M/01", kapacita=30, prijati=18),                 # nenaplněno, bez 2. kola
            radek("3", "78-42-M/01", kapacita=30, prijati=30),                 # naplněno, bez 2. kola
            radek("4", "18-20-M/01", delka=4), radek("4", "18-20-M/01", delka=5),  # kolize klíče webu
            radek("5", "23-45-L/01", prijati=10, jpz=2),                       # bez povinné zkoušky, mimo výběr
    ])
    uloz(tmp / "k2.xlsx", [
        radek("1", "79-41-K/41", "Všeobecné", kapacita=12, prihlasky=20, prijati=11, neveslo=3, konali=11, minimum=96),
        radek("9", "79-41-K/41", kapacita=5, prijati=0, prihlasky=0),     # jen ve 2. kole
    ])


class TestBuildDruheKolo(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp(prefix="druhe-kolo-"))
        vytvor_soubory(self.tmp)

    def spust(self, *argumenty):
        vystup = self.tmp / "out.json"
        r = subprocess.run([sys.executable, str(KOREN / "scripts/build-druhe-kolo.py"), "--rok", "2026",
                            "--kolo1", str(self.tmp / "k1.xlsx"), "--kolo2", str(self.tmp / "k2.xlsx"),
                            "--vystup", str(vystup), *argumenty], capture_output=True, text=True)
        self.assertEqual(r.returncode, 0, r.stderr)
        return json.loads(vystup.read_text())

    def test_stavy_nabidek(self):
        d = self.spust()["roky"]["2026"]
        self.assertEqual(d["1_79-41-K/41_vseobecne"]["stav"], "vypsano")
        self.assertEqual(d["1_79-41-K/41_vseobecne"]["kapacita"], 12)
        self.assertEqual(d["1_79-41-K/41_vseobecne"]["neveslo_se"], 3)
        self.assertEqual(d["2_63-41-M/01"], {"stav": "nenaplneno_bez_2_kola", "kolo1_kapacita": 30, "kolo1_prijati": 18})
        self.assertEqual(d["3_78-42-M/01"]["stav"], "bez_2_kola")
        self.assertNotIn("4_18-20-M/01", d, "kolize klíče se nehádá")
        self.assertNotIn("5_23-45-L/01", d, "obor bez povinné zkoušky není ve výběru")

    def test_minimum_jen_pri_aspon_deseti_prijatych(self):
        d = self.spust()["roky"]["2026"]
        self.assertEqual(d["1_79-41-K/41_vseobecne"]["min_prijaty"], 48.0)
        uloz(self.tmp / "k2.xlsx", [radek("1", "79-41-K/41", "Všeobecné", kapacita=12, prijati=9, konali=9, minimum=96)])
        d = self.spust()["roky"]["2026"]
        self.assertNotIn("min_prijaty", d["1_79-41-K/41_vseobecne"])

    def test_meta_a_zachovani_starsich_roku(self):
        zaklad = self.tmp / "zaklad.json"
        zaklad.write_text(json.dumps({"meta": {"rocniky": {"2025": {"stavy": {"vypsano": 1}}}}, "roky": {"2025": {"x": {"stav": "bez_2_kola"}}}}))
        v = self.spust("--zaklad", str(zaklad))
        self.assertEqual(sorted(v["roky"]), ["2025", "2026"])
        self.assertEqual(v["meta"]["nejnovejsi_rok"], 2026)
        self.assertEqual(v["meta"]["rocniky"]["2026"]["jen_ve_2_kole"], 1)
        self.assertEqual(v["meta"]["rocniky"]["2026"]["stavy"]["kolize_klice"], 1)

    def test_klic_odpovida_webu(self):
        self.assertEqual(dk.klic_webu("600001661", "79-41-K/41", "Gymnázium"), "600001661_79-41-K/41_gymnazium")
        self.assertEqual(dk.klic_webu("1", "2", "  "), "1_2")


class TestLinkaDruheKolo(unittest.TestCase):
    """Zpracovatel 2. kola v datové lince proti falešnému zdroji."""

    @classmethod
    def setUpClass(cls):
        from test_datova_linka import FalesnyServer
        cls.server = FalesnyServer()

    @classmethod
    def tearDownClass(cls):
        cls.server.zastav()

    def setUp(self):
        from linka import jadro
        self.jadro = jadro
        self.tmp = Path(tempfile.mkdtemp(prefix="linka-k2-"))
        self.env = dict(os.environ)
        os.environ.update({"LINKA_FRONTA": str(self.tmp / "f.json"), "LINKA_PRACE": str(self.tmp / "prace"),
                           "LINKA_OZNAMENI": str(self.tmp / "o"), "LINKA_DNES": "2027-09-20", "LINKA_MIN_PODIL_OBORU": "0"})
        vytvor_soubory(self.tmp)
        a = self.server.adresa
        self.server.soubory.clear()
        self.server.soubory["/J/PZ2027_kolo2_skolobory_vysledky.xlsx"] = (200, (self.tmp / "k2.xlsx").read_bytes(), "Thu, 02 Sep 2027 08:00:00 GMT")
        self.server.soubory["/J/PZ2027_kolo1_skolobory_vysledky.xlsx"] = (200, (self.tmp / "k1.xlsx").read_bytes(), "Tue, 17 Aug 2027 08:00:00 GMT")
        registr = json.loads((KOREN / "public/stav_datovych_sad.json").read_text())
        sada = registr["sady"]["cermat-kolo2-agregaty"]
        sada["aktualizace"]["sledovat"] = [a + "/J/PZ{rok}_kolo2_skolobory_vysledky.xlsx"]
        self.registr = {"sady": {"cermat-kolo2-agregaty": sada}}

    def tearDown(self):
        os.environ.clear()
        os.environ.update(self.env)

    def test_nove_obdobi_se_pripravi_a_doplni_rok(self):
        from linka import zpracovani, komunikace
        fronta = self.jadro.nacti_frontu()
        beh = self.jadro.zjisti(self.registr, fronta)
        self.assertEqual(len(beh["nove_ulohy"]), 1)
        u = fronta["ulohy"][beh["nove_ulohy"][0]]
        self.assertEqual((u["druh"], u["obdobi"]), ("nove_obdobi", "2027"))
        zpracovani.priprav(u, self.registr)
        self.assertEqual(u["stav"], "pripraveno", u["priprava"].get("chyba"))
        vystup = json.loads(Path(next(iter(u["priprava"]["zpracovani"]["predani"]))).read_text())
        self.assertIn("2027", vystup["roky"])
        self.assertIn("2026", vystup["roky"], "stávající roky z public/druhe_kolo.json se zachovají")
        self.assertEqual(vystup["meta"]["nejnovejsi_rok"], 2027)
        text = komunikace.text_ulohy(u)
        self.assertIn("nabídek s 2. kolem 1", text)

    def test_zadne_2_kolo_je_selhani(self):
        from linka import zpracovani
        uloz(self.tmp / "k2.xlsx", [radek("9", "79-41-K/41", kapacita=5)])
        self.server.soubory["/J/PZ2027_kolo2_skolobory_vysledky.xlsx"] = (200, (self.tmp / "k2.xlsx").read_bytes(), "Thu, 02 Sep 2027 08:00:00 GMT")
        fronta = self.jadro.nacti_frontu()
        beh = self.jadro.zjisti(self.registr, fronta)
        u = fronta["ulohy"][beh["nove_ulohy"][0]]
        zpracovani.priprav(u, self.registr)
        self.assertEqual(u["stav"], "selhalo")
        self.assertIn("žádnou nabídku s 2. kolem", u["priprava"]["chyba"])


if __name__ == "__main__":
    unittest.main()
