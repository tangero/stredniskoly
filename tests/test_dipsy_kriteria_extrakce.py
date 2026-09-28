import importlib.util
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch


SCRIPT = Path(__file__).resolve().parents[1] / "scripts/dipsy-kriteria-extrakce.py"
spec = importlib.util.spec_from_file_location("dipsy_kriteria_extrakce", SCRIPT)
extrakce = importlib.util.module_from_spec(spec)
spec.loader.exec_module(extrakce)


class DipsyKriteriaExtrakceTest(unittest.TestCase):
    def test_vyskyty_maji_stranku_a_netvrdi_zaver(self):
        text = "Jednotná přijímací zkouška JPZ.\nMatematika se počítá s váhou 60 %.\f" \
               "Za prospěch přidělíme 10 bodů.\nPři shodě bodů rozhodne vyšší MAT.\nMinimum 11 bodů.\f"
        found = extrakce.evidence(text)
        self.assertEqual(found["vahy"][0]["strana"], 1)
        self.assertEqual(found["dalsi_body"][0]["strana"], 2)
        self.assertEqual(found["rovnost"][0]["strana"], 2)
        self.assertEqual(found["minima"][0]["strana"], 2)
        self.assertNotIn("rezim", found)

    def test_shodne_pdf_se_ocr_zpracuje_jednou_a_vazby_zustanou(self):
        with tempfile.TemporaryDirectory() as folder:
            base = Path(folder)
            manifest = base / "manifest.jsonl"
            rows = [
                {"source_id": "prvni", "sha256": "a" * 64, "stav": "nutne_ocr"},
                {"source_id": "druhy", "sha256": "a" * 64, "stav": "nutne_ocr"},
            ]
            manifest.write_text("".join(json.dumps(row) + "\n" for row in rows), encoding="utf-8")
            with patch.object(extrakce, "BASE", base), patch.object(extrakce, "MANIFEST", manifest), patch.object(extrakce, "ocr_pdf", return_value=120) as ocr:
                extrakce.run_ocr()
            self.assertEqual(ocr.call_count, 1)
            updates = [json.loads(line) for line in manifest.read_text(encoding="utf-8").splitlines()][2:]
            self.assertEqual({row["source_id"] for row in updates}, {"prvni", "druhy"})
            self.assertTrue(all(row["stav"] == "ocr_text" for row in updates))

    def test_kratky_puvodni_text_zustane_kdyz_ocr_nepomuze(self):
        with tempfile.TemporaryDirectory() as folder:
            base = Path(folder)
            manifest = base / "manifest.jsonl"
            manifest.write_text(json.dumps({"source_id": "kratky", "sha256": "b" * 64,
                                            "stav": "text", "text_znaku": 150}) + "\n", encoding="utf-8")
            with patch.object(extrakce, "BASE", base), patch.object(extrakce, "MANIFEST", manifest), patch.object(extrakce, "ocr_pdf", return_value=120):
                extrakce.run_ocr(include_short=True)
            update = json.loads(manifest.read_text(encoding="utf-8").splitlines()[-1])
            self.assertEqual(update["stav"], "text")
            self.assertEqual(update["text_znaku"], 150)
            self.assertEqual(update["ocr_text_znaku"], 120)


if __name__ == "__main__":
    unittest.main()
