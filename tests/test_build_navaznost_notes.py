import importlib.util
import json
import unittest
from pathlib import Path

KOREN = Path(__file__).resolve().parents[1]
SCRIPT = KOREN / "scripts/build-navaznost-notes.py"
spec = importlib.util.spec_from_file_location("build_navaznost_notes", SCRIPT)
gen = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gen)

UZAVRENO = {"relationship": {"type": "closed"}}


class VetaUzavreniTest(unittest.TestCase):
    def test_uzavreny_obor_bez_nabidky_2026(self):
        text = gen.veta(UZAVRENO, "Obor (11-11-M/01)", "", "")
        self.assertIn("Obor Obor (11-11-M/01) škola pro přijímací řízení 2026 nevypsala.", text)

    def test_uzavrene_zamereni_trvajiciho_oboru_neni_konec_oboru(self):
        # #538: poznámka se klíčuje oborem bez zaměření, takže dopadne i na stránku
        # zaměření, které škola dál vypisuje
        text = gen.veta(UZAVRENO, "Gymnázium (79-41-K/41)", "matematické", "", obor_trva=True)
        self.assertNotIn("Obor Gymnázium (79-41-K/41) škola", text)
        self.assertIn("nevypsala zaměření „matematické“ oboru Gymnázium (79-41-K/41)", text)
        self.assertIn("Obor sám v nabídce zůstává.", text)

    def test_trvajici_obor_bez_textu_zamereni(self):
        text = gen.veta(UZAVRENO, "Gymnázium (79-41-K/41)", "", "", obor_trva=True)
        self.assertIn("nevypsala jednu z loňských nabídek oboru", text)


class PoznamkyProtiNabidce2026Test(unittest.TestCase):
    def test_zadna_poznamka_netvrdi_konec_oboru_vypsaneho_2026(self):
        nabidka = {f"{r['redizo']}_{r['kkov']}"
                   for r in json.loads((KOREN / "public/applications_2026.json").read_text())["data"]}
        poznamky = json.loads((KOREN / "public/navaznost_notes.json").read_text())["notes"]
        chybne = [k for k, p in poznamky.items()
                  if k in nabidka and "škola pro přijímací řízení 2026 nevypsala." in p["message"]]
        self.assertEqual(chybne, [])


if __name__ == "__main__":
    unittest.main()
