"""Testy týdenního souhrnu signálů (#326): Matomo se nevolá, odpovědi dodává mock.

    python3 -m unittest tests/test_signaly_tyden.py -v
"""
from __future__ import annotations

import io
import os
import sys
import unittest
from contextlib import redirect_stderr
from datetime import date
from pathlib import Path
from unittest import mock
from urllib.error import HTTPError

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
    if m == "Actions.getSiteSearchNoResultKeywords":
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

    def test_verze_pro_artefakt_bez_hledani(self) -> None:
        data = s.stahni(falesny_matomo, KONEC, mock.Mock())
        verejny = s.souhrn(data, KONEC, s_hledanim=False)
        self.assertNotIn("Hledání na webu", verejny)
        self.assertNotIn("Hledání bez výsledku", verejny)
        self.assertNotIn("gymnázium brno", verejny)
        self.assertNotIn("xyz", verejny)
        self.assertIn("/mesto/brno", verejny)
        self.assertIn("gymnázium brno", s.souhrn(data, KONEC))

    def test_zprava_telegram_po_znacich(self) -> None:
        odkaz = "https://github.com/tangero/stredniskoly/actions/runs/1"
        dlouhy = "\n".join(f"| řádek č. {i} | žluťoučký kůň |" for i in range(400))
        zprava = s.zprava_telegram(dlouhy, odkaz)
        zprava.encode("utf-8").decode("utf-8")
        self.assertLessEqual(len(zprava), 4096)
        self.assertTrue(zprava.endswith(f"artefakt běhu {odkaz}\n"))
        telo = zprava.split("\n\nCelý souhrn")[0]
        self.assertIn(telo.split("\n")[-1], dlouhy.split("\n"))  # ořez na hranici celého řádku
        self.assertEqual(s.zprava_telegram("krátký text", odkaz), f"krátký text\n\nCelý souhrn: artefakt běhu {odkaz}\n")

    def test_hlaseni_podle_oblasti(self) -> None:
        issues = [
            {"labels": [{"name": "bug-report"}, {"name": "oblast:detail"}]},
            {"labels": [{"name": "portal-skoly"}]},
            {"labels": [{"name": "interni"}, {"name": "oblast:detail"}]},
        ]
        self.assertEqual(s.hlaseni_z_issues(issues), {"oblast:detail": 1, "oblast:bez-oblasti": 1})

    def test_chyba_matomo_neprozradi_odpoved(self) -> None:
        with redirect_stderr(io.StringIO()), self.assertRaises(RuntimeError):
            s.stahni(lambda p: {"result": "error", "message": "tajne"}, KONEC, mock.Mock())

    def test_nazvy_metod_matomo(self) -> None:
        # Matomo 5 na neexistující metodu odpoví HTTP 400 (getSiteSearchNoResultKeyword bez „s“ shodil běhy workflow)
        metody = {p["method"] for p in s.dotazy(KONEC).values()}
        self.assertEqual(metody, {
            "Actions.getPageUrls", "Actions.getSiteSearchKeywords", "Actions.getSiteSearchNoResultKeywords",
            "Events.getCategory", "Events.getAction", "VisitsSummary.get",
        })

    def test_http_400_ukaze_hlasku_matomo_bez_tokenu(self) -> None:
        telo = b'{"result":"error","message":"Requested report with secondaryDimension\\n not found. token TAJNY"}'
        chyba = HTTPError("https://ma.example/index.php", 400, "Bad Request", {}, io.BytesIO(telo))  # type: ignore[arg-type]
        with mock.patch.object(s, "urlopen", side_effect=chyba):
            with self.assertRaises(s.ChybaMatomo) as ctx:
                s.fetch_matomo("TAJNY")({"method": "Events.getCategory"})
        self.assertIn("HTTP 400", str(ctx.exception))
        self.assertIn("secondaryDimension not found", str(ctx.exception))
        self.assertNotIn("TAJNY", str(ctx.exception))

    def test_jeden_odmitnuty_dotaz_neshodi_souhrn(self) -> None:
        def matomo(p: dict[str, str]):
            if p["method"] == "Events.getCategory":
                raise s.ChybaMatomo("HTTP 400: nepodporovaný parametr")
            return falesny_matomo(p)

        log = io.StringIO()
        with redirect_stderr(log):
            data = s.stahni(matomo, KONEC, mock.Mock())
        self.assertIn("udalosti_kategorie (Events.getCategory): HTTP 400: nepodporovaný parametr", log.getvalue())
        text = s.souhrn(data, KONEC)
        kategorie = text.split("## Události (kategorie)")[1].split("## Události (akce)")[0]
        self.assertIn("Oddíl vynechán: Matomo odmítlo dotaz udalosti_kategorie", kategorie)
        self.assertIn("| simulator | 33 |", text.split("## Události (akce)")[1])
        self.assertIn("/mesto/brno", text)
        self.assertIn("Návštěvy: 200", text)

    def test_chyba_json_pri_http_200_vynecha_oddil(self) -> None:
        def matomo(p: dict[str, str]):
            if p["method"] == "Actions.getSiteSearchNoResultKeywords":
                return {"result": "error", "message": "Site search is not enabled"}
            return falesny_matomo(p)

        with redirect_stderr(io.StringIO()):
            data = s.stahni(matomo, KONEC, mock.Mock())
        text = s.souhrn(data, KONEC)
        self.assertIn("Matomo odmítlo dotaz hledani_bez_vysledku (Site search is not enabled)", text)
        self.assertIn("gymnázium brno", text)
        self.assertNotIn("Oddíl vynechán", s.souhrn(data, KONEC, s_hledanim=False))

    def test_vsechny_dotazy_odmitnute_konci_chybou_s_klici(self) -> None:
        with redirect_stderr(io.StringIO()), self.assertRaises(RuntimeError) as ctx:
            s.stahni(lambda p: {"result": "error", "message": "token_auth is not valid"}, KONEC, mock.Mock())
        self.assertIn("stranky: token_auth is not valid", str(ctx.exception))
        self.assertIn("navstevy:", str(ctx.exception))

    def test_souhrn_json_bez_hledanych_vyrazu(self) -> None:
        """#528, P1: souhrn.json do artefaktu nese z hledání bez výsledku jen součet, žádné výrazy."""
        import json

        data = s.stahni(falesny_matomo, KONEC, mock.Mock())
        j = s.souhrn_json(data, KONEC, {"oblast:data": 2}, {"vynechano": "chybí secret CRUX_API_KEY"})
        text = json.dumps(j, ensure_ascii=False)
        for vyraz in ("gymnázium brno", "jan novák", "xyz", "vzácný"):
            self.assertNotIn(vyraz, text)
        self.assertEqual(j["verze"], 1)
        self.assertEqual((j["od"], j["do"]), ("2026-09-28", "2026-10-04"))
        self.assertEqual(j["navstevy"], {"navstevy": 200, "zobrazeni": 500})
        self.assertEqual(j["stranky"][0], {"stranka": "/mesto/brno", "zobrazeni": 120})
        self.assertEqual(j["rust"][0]["stranka"], "/simulator")
        self.assertEqual(j["odchody"], [{"stranka": "/simulator", "navstevy": 50, "podil_odchodu": 0.8}])
        self.assertEqual(j["udalosti_akce"], [{"nazev": "simulator", "pocet": 33}])
        self.assertEqual(j["hledani_bez_vysledku"], {"navstevy": 6, "vyrazu": 2})
        self.assertEqual(j["hlaseni"], [{"oblast": "oblast:data", "pocet": 2}])
        self.assertEqual(j["rychlost"], {"vynechano": "chybí secret CRUX_API_KEY"})
        self.assertEqual(j["vynechano"], {})

    def test_souhrn_json_odmitnuty_dotaz_je_none_s_duvodem(self) -> None:
        def matomo(p: dict[str, str]):
            if p["method"] == "Actions.getSiteSearchNoResultKeywords":
                return {"result": "error", "message": "Site search is not enabled"}
            return falesny_matomo(p)

        with redirect_stderr(io.StringIO()):
            j = s.souhrn_json(s.stahni(matomo, KONEC, mock.Mock()), KONEC)
        self.assertIsNone(j["hledani_bez_vysledku"])
        self.assertIn("hledani_bez_vysledku", j["vynechano"])
        self.assertIsNone(j["hlaseni"])
        self.assertEqual(j["navstevy"]["navstevy"], 200)

    def test_main_zapise_json_do_artefaktu(self) -> None:
        import json
        import tempfile

        data = s.stahni(falesny_matomo, KONEC, mock.Mock())
        with tempfile.TemporaryDirectory() as d, \
                mock.patch.dict(os.environ, {"MATOMO_TOKEN": "t", "CRUX_API_KEY": ""}), \
                mock.patch.object(s, "stahni", return_value=data), redirect_stderr(io.StringIO()), \
                mock.patch("sys.stdout", new_callable=io.StringIO):
            cil = Path(d) / "souhrn.json"
            self.assertEqual(s.main(["--datum", "2026-10-04", "--json", str(cil)]), 0)
            j = json.loads(cil.read_text(encoding="utf-8"))
        self.assertEqual(j["do"], "2026-10-04")
        self.assertEqual(j["rychlost"], {"vynechano": "chybí secret CRUX_API_KEY"})
        self.assertNotIn("gymnázium brno", json.dumps(j, ensure_ascii=False))

    def test_bez_tokenu_konci_chybou(self) -> None:
        with mock.patch.dict(os.environ, {"MATOMO_TOKEN": ""}):
            self.assertEqual(s.main(["--datum", "2026-10-04"]), 2)


if __name__ == "__main__":
    unittest.main()
