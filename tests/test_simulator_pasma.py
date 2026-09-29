"""Index pásem pro Simulátor přijímaček: python3 -m unittest tests/test_simulator_pasma.py"""
from __future__ import annotations

import importlib.util
import unittest
from pathlib import Path

KOREN = Path(__file__).resolve().parents[1]
_spec = importlib.util.spec_from_file_location("sim", KOREN / "scripts" / "build-simulator-pasma.py")
sim = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(sim)

S = {n: i for i, n in enumerate(sim.SLOUPCE)}


def pasma(data: dict) -> dict:
    return {"rok": 2026, "kolo": 1, "prahy": {"min_prijatych_pro_hranici": 10}, "data": data}


class TestIndex(unittest.TestCase):
    def test_obor_s_pasmem(self):
        v = {"soutezicich": 51, "prijatych": 30, "neveslo_se": 21, "min_prijaty": 48.0,
             "pasmo_nejistoty": [48.0, 57.5], "pasmo_nejistoty_soutezilo": 18, "pasmo_nejistoty_prijato": 7}
        r = sim.sestav(pasma({"1_79-41-K/81": v}), None, {"1_79-41-K/81": "Brno"}, {})["data"]["1_79-41-K/81"]
        self.assertEqual(r[S["min_prijaty"]], 48)
        self.assertIsInstance(r[S["min_prijaty"]], int)
        self.assertEqual(r[S["horni_mez"]], 57.5)
        self.assertEqual(r[S["v_pasmu_prijato"]], 7)
        self.assertEqual(r[S["druh"]], 8)
        self.assertIsNone(r[S["extra_body"]])  # bez kritérií chybí, není nula
        self.assertEqual(r[S["obec"]], 0)

    def test_nikdo_neodmitnut_nema_horni_mez(self):
        v = {"soutezicich": 29, "prijatych": 29, "neveslo_se": 0, "min_prijaty": 31.0,
             "nikdo_neodmitnut_pro_kapacitu": True, "talentova_zkouska": True}
        r = sim.sestav(pasma({"1_82-41-M/01": v}), {"data": {}}, {}, {})["data"]["1_82-41-M/01"]
        self.assertEqual(r[S["nikdo_neodmitnut"]], 1)
        self.assertEqual(r[S["talentova"]], 1)
        self.assertIsNone(r[S["horni_mez"]])
        self.assertIsNone(r[S["obec"]])
        self.assertEqual(r[S["druh"]], 4)

    def test_extra_body(self):
        jen_jpz = {"rezim": "pouze_jpz", "slozky": []}
        prospech = {"rezim": "jine", "slozky": [{"nazev": "Prospěch 8. třídy", "max": 20}]}
        chovani = {"rezim": "jine", "slozky": [{"nazev": "snížený stupeň z chování", "max": -5}]}
        self.assertIsNone(sim.extra_body(None))
        self.assertEqual(sim.extra_body({"prepisy": [jen_jpz]}), 0)
        self.assertEqual(sim.extra_body({"prepisy": [chovani]}), 0)
        # Stačí jedno zaměření s extra body.
        self.assertEqual(sim.extra_body({"prepisy": [jen_jpz, prospech]}), 1)
        self.assertEqual(sim.extra_body({"prepisy": [{"rezim": "jine", "slozky": [], "chybi_slozky": True}]}), 1)

    def test_obce_podle_klice(self):
        o = sim.obce_katalogu([{"redizo": "1", "kkov": "A", "obec": "Brno "}, {"redizo": "1", "kkov": "A", "obec": "Jinde"}])
        self.assertEqual(o, {"1_A": "Brno"})


class TestPripravovanyRocnik(unittest.TestCase):
    """Index nového ročníku musí jít sestavit před přepnutím sady (Codex review, kolo 1, nález 2)."""

    def _spust(self, *argy: str):
        import subprocess, sys as _sys
        return subprocess.run([_sys.executable, str(KOREN / "scripts" / "build-simulator-pasma.py"), "--zmer", *argy],
                              capture_output=True, text=True, cwd=KOREN)

    def test_jiny_nez_zobrazeny_rocnik(self):
        import json
        reg = json.loads((KOREN / "public" / "stav_datovych_sad.json").read_text(encoding="utf-8"))
        zobrazeno = reg["sady"]["cermat-uchazeci-kolo1"]["zobrazeno"]["obdobi"]
        jiny = next(r for r in ("2025", "2026") if r != str(zobrazeno)
                    and (KOREN / "public" / f"pasma_prijeti_{r}.json").exists())
        r = self._spust("--obdobi", jiny)
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertIn("oborů", r.stdout)

    def test_chybejici_rocnik_hlasi_chybu(self):
        r = self._spust("--obdobi", "1999")
        self.assertNotEqual(r.returncode, 0)
        self.assertIn("1999", r.stderr)


if __name__ == "__main__":
    unittest.main()
