"""Vyřazené výpisy aktualit (#557): sklízeč je nesmí dostat do registru."""
import importlib.util
import json
import re
import tempfile
import unittest
from pathlib import Path

KOREN = Path(__file__).resolve().parent.parent


def nacti_skript():
    spec = importlib.util.spec_from_file_location("build_skoly_vypisy", KOREN / "scripts" / "build-skoly-vypisy.py")
    modul = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(modul)
    return modul


class VyrazeneVypisy(unittest.TestCase):
    def test_vyrazene_nejsou_v_registru(self):
        skript = nacti_skript()
        registr = json.loads((KOREN / "public" / "skoly_vypisy.json").read_text())
        self.assertIn("600013260", skript.VYRAZENE)
        for redizo in skript.VYRAZENE:
            self.assertNotIn(redizo, registr["skoly"])
        self.assertEqual(registr["meta"]["vyrazeno"]["rucne"], len(skript.VYRAZENE))

    def test_build_vynecha_vyrazene(self):
        """Skript spustíme nad skutečnými vstupy s pozměněným VYRAZENE a ověříme výstup."""
        skript = nacti_skript()
        with tempfile.TemporaryDirectory() as tmp:
            skript.VYSTUP = Path(tmp) / "vypisy.json"

            def spust(vyrazene):
                skript.VYRAZENE = vyrazene
                skript.main()
                return json.loads(skript.VYSTUP.read_text())

            zaklad = spust({})
            kandidat = next(iter(zaklad["skoly"]))
            s_vyrazenim = spust({kandidat: "test"})
        self.assertIn(kandidat, zaklad["skoly"])
        self.assertNotIn(kandidat, s_vyrazenim["skoly"])
        self.assertEqual(s_vyrazenim["meta"]["vyrazeno"]["rucne"], 1)

    def test_migrace_meni_jen_vyrazene(self):
        skript = nacti_skript()
        sql = (KOREN / "db" / "migrace" / "011-vyrazene-vypisy.sql").read_text()
        prikazy = [r for r in sql.splitlines() if not r.strip().startswith("--")]
        redizo = set(re.findall(r"'(\d{9})'", "\n".join(prikazy)))
        self.assertEqual(redizo, set(skript.VYRAZENE))


if __name__ == "__main__":
    unittest.main()
