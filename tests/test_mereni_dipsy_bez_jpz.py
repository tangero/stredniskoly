import importlib.util
import io
import json
import tempfile
import unittest
import urllib.error
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / "scripts/mereni-dipsy-bez-jpz.py"
spec = importlib.util.spec_from_file_location("mereni_dipsy_bez_jpz", SCRIPT)
modul = importlib.util.module_from_spec(spec)
spec.loader.exec_module(modul)

FILE_ID = "11111111-2222-3333-4444-555555555555"


def nabidka(i, kat="H"):
    return {"id_sof": f"sof-{i}", "redizo": "600000001", "kkov": "23-51-H/01", "kategorie": kat}


def karta(i, file_id=FILE_ID, **navic):
    return {"id": f"sof-{i}", "skolniRok": 2026, "kolo": 1, "konaJPZ": False,
            "reditelstviSkoly": {"redizo": "600000001", "nazev": "Škola", "email": "skola@example.cz"},
            "skolniObor": {"kod": "23-51-H/01"}, "podminkyProPrijeti": {"fileId": file_id}, **navic}


class Odpoved(io.BytesIO):
    def __init__(self, data, status=200):
        super().__init__(json.dumps({"meta": {"success": True}, "data": data}).encode())
        self.status = status


def server(mapa):
    """Mock urlopen: id karty -> data karty nebo HTTP kód chyby. Počítá volání."""
    volani = []

    def otevri(pozadavek, timeout):
        sof = pozadavek.full_url.rsplit("/", 1)[1]
        volani.append(sof)
        v = mapa[sof]
        if isinstance(v, int):
            raise urllib.error.HTTPError(pozadavek.full_url, v, "chyba", {}, None)
        return Odpoved(v)
    otevri.volani = volani
    return otevri


class MereniDipsyTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.manifest = Path(self.tmp.name) / "manifest.jsonl"

    def tearDown(self):
        self.tmp.cleanup()

    def test_uklada_jen_ohlasena_pole_bez_kontaktu(self):
        otevri = server({"sof-1": karta(1)})
        modul.sber([nabidka(1)], self.manifest, otevri, spanek=lambda s: None)
        radek = json.loads(self.manifest.read_text())
        self.assertNotIn("skola@example.cz", self.manifest.read_text())
        self.assertEqual(set(radek), {"id_sof", "kategorie", "http", "id", "skolniRok", "kolo", "redizo",
                                      "kkov", "konaJPZ", "ma_pdf_podminek", "file_id", "shoda"})
        self.assertTrue(radek["shoda"] and radek["ma_pdf_podminek"])

    def test_souhrn_rozlisi_nalezene_chybejici_a_nesouhlasici(self):
        seznam = [nabidka(1), nabidka(2, "E"), nabidka(3), nabidka(4)]
        otevri = server({"sof-1": karta(1), "sof-2": karta(2, file_id=None), "sof-3": 404,
                         "sof-4": karta(4, skolniRok=2025)})
        modul.sber(seznam, self.manifest, otevri, spanek=lambda s: None)
        s = modul.souhrn(seznam, modul.nacti_manifest(self.manifest))
        self.assertEqual(s["po_kategorii"]["H"], {"nabidek": 3, "karta_nalezena": 1, "s_pdf_podminek": 1,
                                                 "karta_nenalezena": 1, "karta_nesouhlasi": 1})
        self.assertEqual(s["po_kategorii"]["E"], {"nabidek": 1, "karta_nalezena": 1, "bez_pdf_podminek": 1})

    def test_429_zastavi_beh_a_opakuje_se_jen_neuspesne(self):
        seznam = [nabidka(1), nabidka(2), nabidka(3)]
        with self.assertRaises(modul.Zastavit):
            modul.sber(seznam, self.manifest, server({"sof-1": karta(1), "sof-2": 429}), spanek=lambda s: None)
        otevri = server({"sof-2": karta(2), "sof-3": karta(3)})
        modul.sber(seznam, self.manifest, otevri, spanek=lambda s: None)
        self.assertEqual(otevri.volani, ["sof-2", "sof-3"])

    def test_pet_chyb_serveru_za_sebou_zastavi(self):
        seznam = [nabidka(i) for i in range(7)]
        otevri = server({f"sof-{i}": 503 for i in range(7)})
        with self.assertRaises(modul.Zastavit):
            modul.sber(seznam, self.manifest, otevri, spanek=lambda s: None)
        self.assertEqual(len(otevri.volani), 5)

    def test_prodleva_po_kazdem_dotazu(self):
        spanky = []
        modul.sber([nabidka(1), nabidka(2)], self.manifest, server({"sof-1": karta(1), "sof-2": karta(2)}), spanek=spanky.append)
        self.assertEqual(spanky, [0.5, 0.5])


if __name__ == "__main__":
    unittest.main()
