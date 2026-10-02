"""Týdenní shrnutí inspekčních zpráv (#266): výběr chybějících, index textů, tělo PR, kontrola v lince.

Jen dočasné soubory a falešný gh; žádná síť, žádné binárky (pdftotext, ocrmypdf).
"""
from __future__ import annotations

import datetime as dt
import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace

KOREN = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(KOREN / "inspekce" / "scripts"))
sys.path.insert(0, str(KOREN / "scripts"))

from extract_texts import sluc_index  # noqa: E402
from telo_pr import telo  # noqa: E402
from vyber_chybejici import vyber  # noqa: E402

from linka import inspekce  # noqa: E402


def zprava(rid: str, od: str, url: str = "https://example.cz/zprava.pdf") -> dict:
    return {"report_id": rid, "redizo": rid.split("_")[1], "school_name": "Škola", "city": "Město",
            "inspection_from": od, "inspection_to": od, "source_url": url,
            "pdf_file": f"{rid}.pdf", "text_file": f"{rid}.txt"}


def vystup(souhrn: str | None = "Shrnutí.", chyba: str | None = None) -> dict:
    fp = {"strengths": [{"tag": "Výuka", "detail": "Dobrá výuka", "evidence": "citace se jménem"}],
          "risks": [{"tag": "Budova", "detail": "Stará budova", "evidence": "citace"}]}
    if souhrn is not None:
        fp["plain_czech_summary"] = souhrn
    return {"parse_error": chyba, "parsed_output": None if chyba else {"for_parents": fp}}


class VyberChybejicich(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.out = Path(self.tmp.name)

    def tearDown(self):
        self.tmp.cleanup()

    def zapis(self, model: str, rid: str, data: dict) -> None:
        (self.out / model).mkdir(parents=True, exist_ok=True)
        (self.out / model / f"{rid}.json").write_text(json.dumps(data), encoding="utf-8")

    def test_hotove_v_jinem_modelu_se_nevybere(self):
        self.zapis("openrouter_pony_alpha", "GY4_1_2025-01-01", vystup())
        self.zapis("stealth_space_bunny_alpha", "GY4_2_2025-01-02", vystup())
        v = vyber([zprava("GY4_1_2025-01-01", "2025-01-01"), zprava("GY4_2_2025-01-02", "2025-01-02")], self.out, {}, 60)
        self.assertEqual(v["vybrane"], [])

    def test_vystup_s_chybou_nebo_bez_shrnuti_se_vybere(self):
        self.zapis("claude_haiku_4_5", "GY4_1_2025-01-01", vystup(chyba="HTTP 402"))
        self.zapis("claude_haiku_4_5", "GY4_2_2025-01-02", vystup(souhrn=None))
        v = vyber([zprava("GY4_1_2025-01-01", "2025-01-01"), zprava("GY4_2_2025-01-02", "2025-01-02")], self.out, {}, 60)
        self.assertEqual([r["report_id"] for r in v["vybrane"]], ["GY4_2_2025-01-02", "GY4_1_2025-01-01"])

    def test_necitelny_text_a_chybejici_odkaz_jsou_vyjimky(self):
        v = vyber([zprava("GY4_1_2025-01-01", "2025-01-01"), zprava("GY4_2_2025-01-02", "2025-01-02", url=""),
                   zprava("GY4_3_2025-01-03", "2025-01-03")],
                  self.out, {"GY4_1_2025-01-01": 40, "GY4_3_2025-01-03": 2000}, 60)
        self.assertEqual([r["report_id"] for r in v["vybrane"]], ["GY4_3_2025-01-03"])
        self.assertEqual({r["report_id"] for r in v["vyjimky"]}, {"GY4_1_2025-01-01", "GY4_2_2025-01-02"})

    def test_stazena_odpoved_bez_pdf_je_vyjimka(self):
        # Portál ČŠI u chybějící zprávy vrací text „FILE NOT FOUND“ (#271); nestažená zpráva zůstává k výběru.
        pdf = Path(self.tmp.name) / "reports"
        pdf.mkdir()
        (pdf / "SOS_1_2021-11-09.pdf").write_bytes(b"FILE NOT FOUND")
        (pdf / "SOS_2_2025-01-02.pdf").write_bytes(b"%PDF-1.7 ...")
        zpravy = [zprava("SOS_1_2021-11-09", "2021-11-09"), zprava("SOS_2_2025-01-02", "2025-01-02"),
                  zprava("SOS_3_2026-09-01", "2026-09-01")]
        v = vyber(zpravy, self.out, {"SOS_2_2025-01-02": 3000}, 60, pdf)
        self.assertEqual([r["report_id"] for r in v["vybrane"]], ["SOS_3_2026-09-01", "SOS_2_2025-01-02"])
        self.assertEqual([r["report_id"] for r in v["vyjimky"]], ["SOS_1_2021-11-09"])
        self.assertIn("místo PDF", v["vyjimky"][0]["duvod"])

    def test_strop_bere_nejnovejsi_a_zbytek_hlasi(self):
        zpravy = [zprava(f"GY4_{i}_2025-01-{i:02d}", f"2025-01-{i:02d}") for i in range(1, 6)]
        v = vyber(zpravy, self.out, {}, 2)
        self.assertEqual([r["inspection_from"] for r in v["vybrane"]], ["2025-01-05", "2025-01-04"])
        self.assertEqual([r["inspection_from"] for r in v["nad_strop"]], ["2025-01-03", "2025-01-02", "2025-01-01"])
        self.assertEqual(v["pocet_chybejicich"], 5)

    def test_cli_zapise_dilci_manifest(self):
        cesta = self.out / "tydenni.json"
        r = subprocess.run([sys.executable, str(KOREN / "inspekce/scripts/vyber_chybejici.py"), "--vystup", str(cesta),
                            "--outputs-dir", str(self.out / "zadne"), "--strop", "1"], capture_output=True, text=True)
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertEqual(len(json.loads(cesta.read_text(encoding="utf-8"))["reports"]), 1)


class IndexTextu(unittest.TestCase):
    def test_doplneni_zachova_ostatni_radky(self):
        stavajici = [{"report_id": "A", "word_count": 1}, {"report_id": "B", "word_count": 2}]
        nove = [{"report_id": "B", "word_count": 20}, {"report_id": "C", "word_count": 30}]
        self.assertEqual(sluc_index(stavajici, nove),
                         [{"report_id": "A", "word_count": 1}, {"report_id": "B", "word_count": 20}, {"report_id": "C", "word_count": 30}])


class TeloPr(unittest.TestCase):
    def test_tabulka_bez_citaci_a_s_chybami(self):
        with tempfile.TemporaryDirectory() as d:
            out = Path(d)
            (out / "GY4_600000001_2026-01-19.json").write_text(json.dumps(vystup()), encoding="utf-8")
            (out / "GY4_600000002_2026-01-12.json").write_text(json.dumps(vystup(chyba="HTTP 500")), encoding="utf-8")
            manifest = {z["report_id"]: z for z in (zprava("GY4_600000001_2026-01-19", "2026-01-19"),
                                                    zprava("GY4_600000002_2026-01-12", "2026-01-12"))}
            souhrn = {"strop": 60, "nad_strop": [zprava("GY4_600000003_2025-01-01", "2025-01-01")], "vyjimky": []}
            text = telo(["GY4_600000001_2026-01-19", "GY4_600000002_2026-01-12"], souhrn, manifest, out, ["poznámka"])
        self.assertIn("| 600000001 | Škola, Město | 2026-01-19 | Výuka: Dobrá výuka | Budova: Stará budova |", text)
        self.assertIn("`GY4_600000002_2026-01-12`: HTTP 500", text)
        self.assertIn("GY4_600000003_2025-01-01", text)
        self.assertIn("- poznámka", text)
        self.assertNotIn("citace", text)


class KontrolaLinky(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        d = Path(self.tmp.name)
        self.puvodni = dict(os.environ)
        seznam = {"600000001": {"inspections": [{"dateFrom": "2026-01-19T00:00:00"}, {"dateFrom": "2021-03-01T00:00:00"}]},
                  "600000002": {"inspections": [{"dateFrom": "2025-05-05T00:00:00"}]}}
        extrakce = {"schools": {"600000001": [{"inspection_from": "2021-03-01"}],
                                "600000002": [{"inspection_from": "2025-05-05"}]}}
        (d / "seznam.json").write_text(json.dumps(seznam), encoding="utf-8")
        (d / "extrakce.json").write_text(json.dumps(extrakce), encoding="utf-8")
        os.environ.update({"LINKA_CSI_SEZNAM": str(d / "seznam.json"), "LINKA_CSI_EXTRAKCE": str(d / "extrakce.json")})

    def tearDown(self):
        os.environ.clear()
        os.environ.update(self.puvodni)
        self.tmp.cleanup()

    @staticmethod
    def runner(pr: list):
        volani = []

        def r(argv, **_):
            volani.append(argv)
            return SimpleNamespace(returncode=0, stdout=json.dumps(pr), stderr="")
        return r, volani

    def test_skola_s_novejsi_inspekci_a_stare_pr(self):
        runner, volani = self.runner([{"number": 7, "createdAt": "2026-09-01T05:20:00Z", "url": "https://example.cz/pr/7"}])
        v = inspekce.kontrola(dt.date(2026, 10, 5), nanecisto=False, runner=runner)
        self.assertEqual(v["skol_s_novejsi_inspekci"], 1)
        self.assertEqual(v["priklady"][0], {"redizo": "600000001", "shrnuti": "2021-03-01", "novejsi": "2026-01-19"})
        self.assertEqual(v["pr"]["dni"], 34)
        self.assertEqual(len(v["problemy"]), 2)
        self.assertIn("--head", volani[0])

    def test_cerstve_pr_neni_problem_a_nanecisto_se_gh_nevola(self):
        runner, _ = self.runner([{"number": 7, "createdAt": "2026-10-01T05:20:00Z", "url": "https://example.cz/pr/7"}])
        v = inspekce.kontrola(dt.date(2026, 10, 5), nanecisto=False, runner=runner)
        self.assertEqual(len(v["problemy"]), 1)
        runner, volani = self.runner([])
        inspekce.kontrola(dt.date(2026, 10, 5), nanecisto=True, runner=runner)
        self.assertEqual(volani, [])


if __name__ == "__main__":
    unittest.main()
