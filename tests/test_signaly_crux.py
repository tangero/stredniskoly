"""Testy oddílu Rychlost z CrUX (#326, etapa 2): CrUX se nevolá, odpovědi dodává mock.

    python3 -m unittest tests/test_signaly_crux.py -v
"""
from __future__ import annotations

import io
import json
import os
import sys
import unittest
from contextlib import redirect_stderr
from pathlib import Path
from unittest import mock
from urllib.error import HTTPError

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import signaly_crux as c  # noqa: E402


def zaznam(lcp: float, inp: float, cls: str) -> dict:
    return {"record": {
        "metrics": {
            "largest_contentful_paint": {"percentiles": {"p75": lcp}},
            "interaction_to_next_paint": {"percentiles": {"p75": inp}},
            "cumulative_layout_shift": {"percentiles": {"p75": cls}},
        },
        "collectionPeriod": {"firstDate": {"year": 2026, "month": 9, "day": 20},
                             "lastDate": {"year": 2026, "month": 10, "day": 17}},
    }}


def falesny_crux(telo: dict):
    if "origin" in telo and telo["formFactor"] == "PHONE":
        return zaznam(2100, 180, "0.05")
    if telo.get("url", "").endswith("/simulator") and telo["formFactor"] == "PHONE":
        return zaznam(4500, 350, "0.12")
    return None  # 404: málo dat


class CruxTest(unittest.TestCase):
    def test_nejvys_50_dotazu_s_prodlevou_1_s_a_hlavni_typy(self) -> None:
        volani: list[dict] = []
        spanek = mock.Mock()
        c.stahni(lambda t: volani.append(t) or falesny_crux(t), spanek)
        self.assertEqual(len(volani), 12)
        self.assertLessEqual(len(volani), c.MAX_DOTAZU)
        self.assertEqual(spanek.call_count, len(volani) - 1)
        spanek.assert_called_with(1)
        typy = {typ for typ, _ in c.ADRESY}
        self.assertTrue({"titulka", "škola", "obor", "město", "simulátor"} <= typy)
        self.assertEqual({t["formFactor"] for t in volani}, {"PHONE", "DESKTOP"})
        self.assertTrue(all(set(t["metrics"]) == set(c.METRIKY) for t in volani))

    def test_oddil_s_hodnocenim_a_bez_dat(self) -> None:
        text = c.oddil(c.stahni(falesny_crux, mock.Mock()))
        self.assertIn("2026-09-20 až 2026-10-17", text)
        self.assertIn("| celý web | telefon | 2100 ms (dobrá) | 180 ms (dobrá) | 0.05 (dobrá) |", text)
        self.assertIn("| simulátor | telefon | 4500 ms (špatná) | 350 ms (ke zlepšení) | 0.12 (ke zlepšení) |", text)
        self.assertIn("| škola | počítač | bez dat |", text)

    def test_hodnoceni_na_prazich(self) -> None:
        self.assertEqual(c.hodnoceni("largest_contentful_paint", 2500), "dobrá")
        self.assertEqual(c.hodnoceni("largest_contentful_paint", 4000), "ke zlepšení")
        self.assertEqual(c.hodnoceni("cumulative_layout_shift", 0.26), "špatná")

    def test_bez_klice_poznamka(self) -> None:
        with mock.patch.dict(os.environ, {"CRUX_API_KEY": ""}):
            text = c.oddil_rychlost()
        self.assertIn("Oddíl vynechán: chybí secret CRUX_API_KEY", text)

    def test_404_je_bez_dat_ostatni_chyba_vynecha_oddil_bez_klice(self) -> None:
        nenalezeno = HTTPError(c.ENDPOINT, 404, "Not Found", {},  # type: ignore[arg-type]
                               io.BytesIO(b'{"error":{"code":404,"message":"chrome ux report data not found"}}'))
        with mock.patch.object(c, "urlopen", side_effect=nenalezeno):
            self.assertIsNone(c.fetch_crux("KLIC")({"origin": c.ORIGIN}))

        telo = json.dumps({"error": {"code": 403, "message": "API key KLIC123 not valid"}}).encode()
        odmitnuto = HTTPError(c.ENDPOINT, 403, "Forbidden", {}, io.BytesIO(telo))  # type: ignore[arg-type]
        log = io.StringIO()
        with mock.patch.object(c, "urlopen", side_effect=odmitnuto), redirect_stderr(log):
            text = c.oddil_rychlost("KLIC123", spanek=mock.Mock())
        self.assertIn("Oddíl vynechán: CrUX odmítlo dotaz (HTTP 403: API key *** not valid)", text)
        self.assertNotIn("KLIC123", text + log.getvalue())

    def test_klic_v_hlavicce_ne_v_adrese(self) -> None:
        pozadavky = []

        def urlopen(req, timeout=0):
            pozadavky.append(req)
            raise HTTPError(req.full_url, 404, "Not Found", {}, io.BytesIO(b"{}"))  # type: ignore[arg-type]

        with mock.patch.object(c, "urlopen", side_effect=urlopen):
            c.fetch_crux("KLIC")({"origin": c.ORIGIN, "formFactor": "PHONE"})
        self.assertEqual(pozadavky[0].full_url, c.ENDPOINT)
        self.assertEqual(pozadavky[0].get_header("X-goog-api-key"), "KLIC")

    def test_vlozeni_pred_prvni_oddil(self) -> None:
        souhrn = "# Signály\n\nNávštěvy: 5.\n\n## Nejnavštěvovanější stránky\n\n| a |\n"
        vysledek = c.vloz_oddil(souhrn, c.vynechano("test"))
        self.assertLess(vysledek.index("## Rychlost"), vysledek.index("## Nejnavštěvovanější"))
        self.assertLess(vysledek.index("Návštěvy: 5."), vysledek.index("## Rychlost"))

    def test_souhrn_bez_klice_crux_probehne_s_poznamkou(self) -> None:
        import tempfile

        import signaly_tyden as s

        data = {"stranky": [{"label": "/", "nb_hits": 50}], "navstevy": {"nb_visits": 9, "nb_actions": 20}}
        with tempfile.TemporaryDirectory() as d, \
                mock.patch.dict(os.environ, {"MATOMO_TOKEN": "t", "CRUX_API_KEY": ""}), \
                mock.patch.object(s, "stahni", return_value=data), redirect_stderr(io.StringIO()), \
                mock.patch("sys.stdout", new_callable=io.StringIO) as vystup:
            verejny = Path(d) / "bez.md"
            self.assertEqual(s.main(["--datum", "2026-10-18", "--bez-hledani", str(verejny)]), 0)
            for text in (vystup.getvalue(), verejny.read_text(encoding="utf-8")):
                self.assertIn("Oddíl vynechán: chybí secret CRUX_API_KEY", text)
                self.assertLess(text.index("## Rychlost"), text.index("## Nejnavštěvovanější"))


if __name__ == "__main__":
    unittest.main()
