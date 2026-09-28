import importlib.util
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch


SCRIPT = Path(__file__).resolve().parents[1] / "scripts/kriteria-review-local.py"
spec = importlib.util.spec_from_file_location("kriteria_review_local", SCRIPT)
app = importlib.util.module_from_spec(spec)
spec.loader.exec_module(app)


# Nástroj čte místní, gitignorovaná data pilotu (PDF a hodnocení). V CI ani
# v čistém checkoutu nejsou, test se pak přeskočí místo pádu.
MISTNI_DATA = Path(__file__).resolve().parents[1] / "data/dipsy-kriteria-pilot/hodnoceni.csv"


@unittest.skipUnless(MISTNI_DATA.exists(), "chybí místní data pilotu kritérií (gitignorovaná)")
class KriteriaReviewLocalTest(unittest.TestCase):
    def test_podklady_a_vazba_peti_prepisu(self):
        records = app.summary()
        self.assertEqual(len(records), 100)
        drafts = [item for item in records if item["ma_navrh"]]
        self.assertEqual(len(drafts), 5)
        for item in drafts:
            detail = app.entry(item["source_id"], include_text=True)
            self.assertTrue(detail["pdf_ok"])
            self.assertTrue(detail["identita_ok"])
            self.assertTrue(detail["navrh_ok"])
            self.assertTrue(detail["text_pdf"])

    def test_rozhodnuti_je_v_mistnim_zurnalu_a_vazano_na_verzi(self):
        source_id = next(item["source_id"] for item in app.summary() if item["ma_navrh"])
        detail = app.entry(source_id)
        payload = {
            "source_id": source_id,
            "pdf_sha256": detail["pilot"]["sha256"],
            "draft_sha256": detail["navrh_sha256"],
            "verdikt": "schvaleno",
            "strany": "1–2",
            "poznamka": "Závěr odpovídá uvedeným stranám PDF.",
        }
        with tempfile.TemporaryDirectory() as folder, patch.object(app, "DECISIONS", Path(folder) / "decisions.jsonl"):
            saved = app.save_decision(payload)
            self.assertEqual(saved["verdikt"], "schvaleno")
            self.assertEqual(app.entry(source_id)["rozhodnuti"], saved)
            with self.assertRaisesRegex(ValueError, "Podklad se změnil"):
                app.save_decision({**payload, "pdf_sha256": "0" * 64})
            with self.assertRaisesRegex(ValueError, "zdůvodnění"):
                app.save_decision({**payload, "poznamka": ""})

    def test_bez_strukturovaneho_prepisu_nelze_schvalit(self):
        source_id = next(item["source_id"] for item in app.summary() if not item["ma_navrh"])
        detail = app.entry(source_id)
        with tempfile.TemporaryDirectory() as folder, patch.object(app, "DECISIONS", Path(folder) / "decisions.jsonl"):
            with self.assertRaisesRegex(ValueError, "není co schválit"):
                app.save_decision({
                    "source_id": source_id,
                    "pdf_sha256": detail["pilot"]["sha256"],
                    "draft_sha256": None,
                    "verdikt": "schvaleno",
                    "strany": "1",
                    "poznamka": "Ověřeno.",
                })

    def test_cela_davka_zobrazi_stazene_nabidky_s_dalsimi_daty(self):
        with patch.object(app, "DATASET", "vse"):
            records = app.summary()
            self.assertGreater(len(records), 0)
            detail = app.entry(records[0]["source_id"], include_text=True)
            self.assertTrue(detail["pdf_ok"])
            self.assertTrue(detail["identita_ok"])
            self.assertTrue(detail["text_pdf"])
            self.assertIn("web_skoly", detail["dalsi_zdroje"])

    def test_modelovy_navrh_je_oddeleny_od_schvalovaneho_prepisu(self):
        with patch.object(app, "DATASET", "vse"):
            record = next(item for item in app.summary() if item["ma_modelovy_navrh"])
            detail = app.entry(record["source_id"])
            self.assertEqual(detail["modelovy_navrh"]["sha256"], detail["pilot"]["sha256"])
            self.assertIn("rezim", detail["modelovy_navrh"]["navrh"])
            self.assertNotEqual(detail["navrh_sha256"], detail["modelovy_navrh"]["prompt_sha256"])

    def test_pet_automatickych_prikladu_ma_pdf_navrh_a_jev_kontrolu(self):
        with patch.object(app, "DATASET", "pet"):
            records = app.summary()
            self.assertEqual(len(records), 5)
            for record in records:
                detail = app.entry(record["source_id"], include_text=True)
                self.assertTrue(detail["automaticky_pilot"])
                self.assertTrue(detail["pdf_ok"])
                self.assertTrue(detail["identita_ok"])
                self.assertEqual(detail["modelovy_navrh"]["sha256"], detail["pilot"]["sha256"])
                self.assertEqual(detail["jev_kontrola"]["sha256"], detail["pilot"]["sha256"])
                self.assertEqual(detail["jev_kontrola"]["deepseek_prompt_sha256"],
                                 detail["modelovy_navrh"]["prompt_sha256"])
                self.assertTrue(detail["text_pdf"])

    def test_pet_ped_a_barrandovo_maximum(self):
        with patch.object(app, "DATASET", "pet"):
            ped = app.entry("aa2287b2-20f0-4017-a7aa-235223292753")
            barrandov = app.entry("99b859a5-9713-45a8-8de7-5562c4a8ab11")
        self.assertEqual(ped["kontrola_maxim"]["jpz_po_vaze"], "60")
        self.assertEqual(ped["kontrola_maxim"]["dalsi_max"], "40")
        self.assertEqual(ped["kontrola_maxim"]["spocitane_maximum"], "100")
        self.assertTrue(ped["kontrola_maxim"]["desetinna_skore_mozna"])
        self.assertEqual(barrandov["kontrola_maxim"]["spocitane_maximum"], "111")
        self.assertEqual(barrandov["kontrola_maxim"]["podil_jpz_pct"], "90.09")
        self.assertTrue(barrandov["kontrola_maxim"]["rozpor_lepsi_predmet"])
        self.assertFalse(barrandov["kontrola_maxim"]["desetinna_skore_mozna"])
        self.assertIn("reduk", " ".join(barrandov["upresneny_vyklad"]))

    def test_nove_zadani_oddeluje_surove_body_vahu_a_maximum(self):
        with patch.object(app, "DATASET", "pet"):
            ped = app.entry("aa2287b2-20f0-4017-a7aa-235223292753")
            caslav = app.entry("76db8f98-a31f-4383-b320-845dabb153e0")
        self.assertEqual(ped["novy_modelovy_navrh"]["navrh"]["jpz_max_po_prepoctu"], 60)
        self.assertEqual(ped["kontrola_noveho_navrhu"]["odvozene_maximum"], "100")
        self.assertEqual(caslav["novy_modelovy_navrh"]["navrh"]["max_bodu_celkem"], None)
        self.assertEqual(caslav["kontrola_noveho_navrhu"]["odvozene_maximum"], "85")
        self.assertIn("prepocteni_jpz_odporuje_vaze", caslav["kontrola_noveho_navrhu"]["nalezy"])

    def test_nezavisle_modely_jsou_vazany_na_stejne_pdf_a_zadani(self):
        with patch.object(app, "DATASET", "pet"):
            detail = app.entry("76db8f98-a31f-4383-b320-845dabb153e0")
        deepseek = detail["novy_modelovy_navrh"]
        for kind in ("opus", "luna"):
            peer = detail["nezavisle_navrhy"][kind]
            self.assertEqual(peer["model"]["sha256"], deepseek["sha256"])
            self.assertEqual(peer["model"]["prompt_sha256"], deepseek["prompt_sha256"])
            self.assertEqual(peer["kontrola"]["odvozene_maximum"], "85")

    def test_neuplna_maxima_nejsou_dopocitana(self):
        proposal = {"navrh": {"jpz_vaha_pct": 60, "max_bodu_celkem": 100,
                              "dalsi_bodovane_slozky": [{"max_bodu": None}]}}
        self.assertEqual(app.spocitej_maxima(proposal)["stav"], "nelze_spocitat")

    def test_vazena_maxima_se_nesmi_zamenit_za_soucet_procent(self):
        navrh = {
            "rezim": "jine", "jpz_prepocet": "ano", "jpz_cjl_max": 50,
            "jpz_mat_max": 50, "jpz_vaha_pct": 75, "jpz_max_po_prepoctu": 75,
            "max_bodu_celkem": None, "vzorec": "JPZ × 0,75 + prospěch × 0,25",
            "dalsi_bodovane_slozky": [{"max_bodu_pred_prepocet": 40,
                                         "vaha_pct": 25, "max_bodu_po_prepoctu": 10}],
            "minima": [], "rovnost": [], "doklady": [],
        }
        self.assertEqual(app.kontrola_v4.vypoctene_maximum(navrh), 85)
        navrh["dalsi_bodovane_slozky"][0]["max_bodu_po_prepoctu"] = 25
        self.assertIn("nesedi_prepocet_slozky:0", app.kontrola_v4.prover(navrh, "PDF"))

    def test_nahled_vraci_stranu_puvodniho_pdf(self):
        with patch.object(app, "DATASET", "pet"):
            source_id = app.summary()[0]["source_id"]
            detail = app.entry(source_id)
            self.assertGreaterEqual(detail["pdf_pages"], 1)
            self.assertTrue(app.pdf_page_png(detail["pilot"]["sha256"], 1).startswith(b"\x89PNG\r\n\x1a\n"))
            with self.assertRaisesRegex(ValueError, "Stránka není"):
                app.pdf_page_png(detail["pilot"]["sha256"], detail["pdf_pages"] + 1)


if __name__ == "__main__":
    unittest.main()
