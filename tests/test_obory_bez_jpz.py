"""Testy výstupu pro obory bez JPZ (fáze 2 / etapa 1, issue #244). Bez sítě, bez zdrojových xlsx.

    python3 -m unittest tests/test_obory_bez_jpz.py -v
"""
from __future__ import annotations

import importlib.util
import json
import sys
import tempfile
import unittest
from pathlib import Path

KOREN = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(KOREN / "scripts"))

_spec = importlib.util.spec_from_file_location("bez_jpz", KOREN / "scripts" / "build-obory-bez-jpz.py")
bj = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(bj)

from import_cermat_results import is_valid_flat  # noqa: E402

VYSTUP = KOREN / "src/data/obory-bez-jpz-2026.json"


def radek(kkov="29-54-H/01", forma="den", zkracene="ne", jpz=2, **dalsi):
    r = {"KKOV": kkov, "FORMA VZDĚLÁVÁNÍ": forma, "ZKRÁCENÉ STUDIUM": zkracene, "POVINNOST JPZ": jpz}
    r.update(dalsi)
    return r


class VyberNabidek(unittest.TestCase):
    def test_denni_bez_jpz_a_nastavby(self):
        radky = [
            radek(),                                         # denní H bez JPZ: ano
            radek(jpz=1),                                    # denní se zkouškou: ne (už je na webu)
            radek(zkracene="ano"),                           # zkrácené: ne
            radek(forma="dal"),                              # nedenní H: ne
            radek("64-41-L/51", forma="den", jpz=1),         # denní nástavba se zkouškou: ne (už je v katalogu)
            radek("64-41-L/51", forma="dal", jpz=1),         # nedenní nástavba: ano jako pokračování
            radek("64-41-L/51", forma="komb", jpz=1, zkracene="ano"),  # zkrácená nástavba: ne
        ]
        denni, nastavby = bj.vybrat_nabidky(radky)
        self.assertEqual(len(denni), 1)
        self.assertEqual(len(nastavby), 1)

    def test_stavajici_filtr_importu_obory_bez_jpz_dal_vyhazuje(self):
        self.assertFalse(is_valid_flat({"FORMA VZDĚLÁVÁNÍ": "den", "ZKRÁCENÉ STUDIUM": "ne", "POVINNOST JPZ": 2}))

    def test_chybejici_cislo_neni_nula(self):
        self.assertIsNone(bj.cislo(None))
        self.assertIsNone(bj.cislo(""))
        self.assertEqual(bj.cislo(0), 0)
        self.assertEqual(bj.cislo(3.0), 3)

    def test_kategorie(self):
        self.assertEqual(bj.kategorie("29-54-H/01"), "H")
        self.assertEqual(bj.kategorie("neco"), "?")


class Domovy(unittest.TestCase):
    def test_jen_nazev_druh_kapacita_a_obec(self):
        data = {"list": [{"redIzo": "600000001", "skolyAZarizeni": [
            {"druh": "H22", "izo": "1", "uplnyNazev": "Domov mládeže", "reditel": "Jméno",
             "kapacity": [{"nejvyssiPovolenyPocet": 40}, {"nejvyssiPovolenyPocet": 10}],
             "mistaVyuky": [{"adresa": {"obec": "Praha", "ulice": "X"}}]},
            {"druh": "C00", "izo": "2"},
            {"druh": "H21", "izo": "3", "uplnyNazev": "Internát", "kapacity": [], "mistaVyuky": []},
        ]}]}
        with tempfile.TemporaryDirectory() as t:
            cesta = Path(t) / "r.jsonld"
            cesta.write_text(json.dumps(data), encoding="utf-8")
            v = bj.domovy_mladeze(cesta)
        self.assertEqual(list(v), ["600000001"])
        self.assertEqual(v["600000001"][1], {"izo": "1", "druh": "H22", "nazev": "Domov mládeže",
                                              "kapacita": 50, "obec": "Praha"})
        self.assertIsNone(v["600000001"][0]["kapacita"])
        self.assertNotIn("reditel", json.dumps(v))


@unittest.skipUnless(VYSTUP.exists(), "chybí src/data/obory-bez-jpz-2026.json")
class Vystup(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.d = json.loads(VYSTUP.read_text(encoding="utf-8"))

    def test_pocty_z_navrhu(self):
        self.assertEqual(len(self.d["nabidky"]), 2902)
        self.assertEqual(self.d["souhrn"]["denni_podle_kategorie"],
                         {"C": 200, "E": 524, "H": 1777, "J": 8, "L": 31, "M": 216, "P": 146})
        self.assertEqual(len(self.d["nastavby"]), 72)
        self.assertTrue(all(n["pokracovani"] and n["forma"] != "den" for n in self.d["nastavby"]))
        self.assertFalse(any(n["pokracovani"] for n in self.d["nabidky"]))

    def test_parovani_a_druhe_kolo_z_mereni(self):
        s = self.d["souhrn"]
        self.assertEqual(sum(v for k, v in s["parovani_2025"].items() if k != "nove"), 2800)
        self.assertEqual(s["druhe_kolo"]["vypsano"], 1261)
        self.assertEqual(sum(1 for n in self.d["nabidky"] if n["kolo_2"]), 1261)

    def test_zbyla_mista_jen_kdyz_jsou_oba_sloupce(self):
        bez = 0
        for n in self.d["nabidky"] + self.d["nastavby"]:
            if n["kapacita"] is None or n["prijati"] is None:
                self.assertIsNone(n["zbyla_mista"])
                bez += 1
            else:
                self.assertEqual(n["zbyla_mista"], n["kapacita"] - n["prijati"])
        self.assertGreater(bez, 0)

    def test_id_sof_jedinecne_a_zadne_body(self):
        ids = [n["id_sof"] for n in self.d["nabidky"] + self.d["nastavby"]]
        self.assertEqual(len(ids), len(set(ids)))
        ids_web = [n["id"] for n in self.d["nastavby"]]
        self.assertEqual(len(ids_web), len(set(ids_web)))
        text = json.dumps(self.d, ensure_ascii=False)
        for zakazano in ("percentil", "skor", "reditel", "email"):
            self.assertNotIn(zakazano, text.lower())


if __name__ == "__main__":
    unittest.main()
