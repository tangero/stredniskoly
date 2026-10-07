"""Testy týdenního souhrnu signálů (#326): Matomo se nevolá, odpovědi dodává mock.

    python3 -m unittest tests/test_signaly_tyden.py -v
"""
from __future__ import annotations

import os
import sys
import unittest
from datetime import date
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import signaly_tyden as s  # noqa: E402

KONEC = date(2026, 10, 4)


def falesny_matomo(params: dict[str, str]):
    m = params["method"]
    if m == "Actions.getPageUrls" and params["date"] == "2026-10-04":
        return [
            {"label": "/mesto/brno", "nb_hits": 120, "nb_visits": 90, "bounce_rate": "40%"},
            {"label": "/simulator", "nb_hits": 60, "nb_visits": 50, "bounce_rate": "80%"},
            {"label": "/skola/x", "nb_hits": 12, "nb_visits": 5, "bounce_rate": "90%"},
        ]
    if m == "Actions.getPageUrls":
        return [{"label": "/mesto/brno", "nb_hits": 100}, {"label": "/simulator", "nb_hits": 10}]
    if m == "Actions.getSiteSearchKeywords":
        return [{"label": "gymnázium brno", "nb_visits": 9}, {"label": "jan novák", "nb_visits": 4}]
    if m == "Actions.getSiteSearchNoResultKeyword":
        return [{"label": "xyz", "nb_visits": 5}, {"label": "vzácný", "nb_visits": 1}]
    if m.startswith("Events."):
        return [{"label": "simulator", "nb_events": 33}]
    return {"nb_visits": 200, "nb_actions": 500}


class SignalyTest(unittest.TestCase):
    def test_nejvys_10_dotazu_s_prodlevou_2_s(self) -> None:
        volani: list[dict[str, str]] = []
        spanek = mock.Mock()
        s.stahni(lambda p: volani.append(p) or falesny_matomo(p), KONEC, spanek)
        self.assertLessEqual(len(volani), 10)
        self.assertEqual(spanek.call_count, len(volani) - 1)
        spanek.assert_called_with(2)

    def test_hledani_jen_s_aspon_5_vyskyty(self) -> None:
        text = s.souhrn(s.stahni(falesny_matomo, KONEC, mock.Mock()), KONEC)
        self.assertIn("gymnázium brno", text)
        self.assertIn("xyz", text)
        self.assertNotIn("jan novák", text)
        self.assertNotIn("vzácný", text)

    def test_odchody_rust_a_udalosti(self) -> None:
        text = s.souhrn(s.stahni(falesny_matomo, KONEC, mock.Mock()), KONEC)
        odchody = text.split("## Stránky s vysokým podílem odchodů")[1].split("## Hledání na webu")[0]
        self.assertIn("/simulator", odchody)
        self.assertNotIn("/skola/x", odchody)  # pod 20 návštěv
        rust = text.split("## Nejrychleji rostoucí")[1].split("## Stránky s vysokým")[0]
        self.assertLess(rust.index("/simulator"), rust.index("/mesto/brno"))
        self.assertIn("| simulator | 33 |", text)

    def test_hlaseni_podle_oblasti(self) -> None:
        issues = [
            {"labels": [{"name": "bug-report"}, {"name": "oblast:detail"}]},
            {"labels": [{"name": "portal-skoly"}]},
            {"labels": [{"name": "interni"}, {"name": "oblast:detail"}]},
        ]
        self.assertEqual(s.hlaseni_z_issues(issues), {"oblast:detail": 1, "oblast:bez-oblasti": 1})

    def test_chyba_matomo_neprozradi_odpoved(self) -> None:
        with self.assertRaises(RuntimeError):
            s.stahni(lambda p: {"result": "error", "message": "tajne"}, KONEC, mock.Mock())

    def test_bez_tokenu_konci_chybou(self) -> None:
        with mock.patch.dict(os.environ, {"MATOMO_TOKEN": ""}):
            self.assertEqual(s.main(["--datum", "2026-10-04"]), 2)


if __name__ == "__main__":
    unittest.main()
