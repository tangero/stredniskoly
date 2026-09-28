import importlib.util
import hashlib
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch


SCRIPT = Path(__file__).resolve().parents[1] / "scripts/dipsy-kriteria-sber.py"
spec = importlib.util.spec_from_file_location("dipsy_kriteria_sber", SCRIPT)
sber = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sber)


class DipsyKriteriaSberTest(unittest.TestCase):
    def test_karta_musi_sedet_na_konkretni_nabidku(self):
        offer = {"source_id": "abc", "redizo": "600171701", "kkov": "79-41-K/41", "zamereni": "všeobecné", "izo": "izo_061385476"}
        card = {"id": "abc", "skolniRok": 2026, "kolo": 1,
                "reditelstviSkoly": {"redizo": "600171701"}, "skola": {"izo": "061385476"},
                "skolniObor": {"kod": "79-41-K/41"}, "zamereni": " všeobecné "}
        self.assertIsNone(sber.valid_card(card, offer))
        self.assertIn("kolo", sber.valid_card({**card, "kolo": 2}, offer))
        self.assertIn("REDIZO", sber.valid_card({**card, "reditelstviSkoly": {"redizo": "jina"}}, offer))
        self.assertIn("zaměření", sber.valid_card({**card, "zamereni": "jiné"}, offer))

    def test_manifest_vraci_posledni_pokus_pro_kazde_id(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "manifest.jsonl"
            path.write_text("\n".join([
                json.dumps({"source_id": "a", "stav": "chyba"}),
                json.dumps({"source_id": "b", "stav": "text"}),
                json.dumps({"source_id": "a", "stav": "text"}),
                "{neúplný řádek",
            ]), encoding="utf-8")
            self.assertEqual(sber.latest_manifest(path)["a"]["stav"], "text")
            self.assertEqual(len(sber.latest_manifest(path)), 2)

    def test_sdilene_pdf_se_pouzije_jen_po_kontrole_identity_karty(self):
        offer = {"source_id": "abc", "redizo": "600171701", "kkov": "79-41-K/41", "zamereni": "", "izo": "izo_061385476"}
        card = {"id": "abc", "skolniRok": 2026, "kolo": 1,
                "reditelstviSkoly": {"redizo": "600171701"}, "skola": {"izo": "061385476"},
                "skolniObor": {"kod": "79-41-K/41"}, "zamereni": "",
                "podminkyProPrijeti": {"fileId": "ff36758a-a5e1-4dae-9a7e-de0cf8400fbd"}}
        pdf = b"%PDF-data"
        digest = hashlib.sha256(pdf).hexdigest()
        cached = {"source_id": "jina-nabidka", "sha256": digest, "pdf_bajtu": len(pdf),
                  "text_znaku": 200, "stav": "text", "ziskano_at": "2026-09-24T10:00:00+00:00"}
        with tempfile.TemporaryDirectory() as folder, patch.object(sber, "OUTPUT", Path(folder)), \
             patch.object(sber, "FILE_CACHE", {card["podminkyProPrijeti"]["fileId"]: cached}), \
             patch.object(sber, "request_json", return_value=card) as request:
            (Path(folder) / "pdf").mkdir()
            (Path(folder) / "text").mkdir()
            (Path(folder) / "pdf" / f"{digest}.pdf").write_bytes(pdf)
            (Path(folder) / "text" / f"{digest}.txt").write_text("text")
            result = sber.one(None, offer, 0.2)
            self.assertEqual(result["stav"], "text")
            self.assertEqual(result["pdf_sdileno_z"], "jina-nabidka")
            request.assert_called_once()
            result = sber.one(None, {**offer, "redizo": "jina"}, 0.2)
            self.assertEqual(result["stav"], "chyba")
            self.assertIn("REDIZO", result["chyba"])

    def test_uspesny_manifest_bez_souboru_neni_hotovy(self):
        row = {"stav": "text", "sha256": "a" * 64}
        with tempfile.TemporaryDirectory() as folder, patch.object(sber, "OUTPUT", Path(folder)):
            self.assertFalse(sber.stored_complete(row))
            (Path(folder) / "pdf").mkdir()
            (Path(folder) / "text").mkdir()
            (Path(folder) / "pdf" / f"{'a' * 64}.pdf").write_bytes(b"%PDF-data")
            (Path(folder) / "text" / f"{'a' * 64}.txt").write_text("text")
            self.assertTrue(sber.stored_complete(row))


if __name__ == "__main__":
    unittest.main()
