"""Testy generátoru zpráv odběru (scripts/novinky.py).

Ověřují to, co v návrhu (docs/novinky-k-prijimackam-2027.md, oddíly 3 a 7)
stojí jako pravidlo, ne jen že skript proběhne:

* ročník se bere z registru, ne z letopočtu v kódu,
* redakční spouštěč má povinný posun roku (prosinec před ročníkem přijímaček),
* datum v textu vždy nese rok,
* letopočet napsaný v šabloně a zakázaná slova generování zastaví,
* konec užitečnosti se dá navázat na jinou událost kalendáře.
"""

from __future__ import annotations

import json
import os
import sys
import tempfile
import unittest
from pathlib import Path

KOREN = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(KOREN / "scripts"))

KALENDAR = {
    "groups": [
        {
            "id": "stredni-skoly",
            "events": [
                {"id": "ss-kriteria", "start": "2027-01-15", "end": "2027-01-31", "date": "15.–31. ledna"},
                {"id": "ss-prihlasky", "start": "2027-02-01", "end": "2027-02-22", "date": "1.–22. února"},
                {"id": "ss-vysledky", "start": "2027-05-14", "date": "14. května · pátek"},
                {"id": "k2-prihlasky", "start": "2027-05-19", "end": "2027-05-24", "date": "19.–24. května"},
            ],
        }
    ]
}

REGISTR = {"sady": {"msmt-harmonogram": {"zobrazeno": {"obdobi": "2027"}}}}


class GeneratorTest(unittest.TestCase):
    def setUp(self) -> None:
        self.docasny = tempfile.TemporaryDirectory()
        koren = Path(self.docasny.name)
        (koren / "sablony").mkdir()
        (koren / "data").mkdir()
        (koren / "vystup").mkdir()
        (koren / "data" / "admissions-2027.json").write_text(
            json.dumps(KALENDAR, ensure_ascii=False), encoding="utf-8"
        )
        (koren / "registr.json").write_text(json.dumps(REGISTR, ensure_ascii=False), encoding="utf-8")

        os.environ["NOVINKY_SABLONY"] = str(koren / "sablony")
        os.environ["NOVINKY_REGISTR"] = str(koren / "registr.json")
        os.environ["NOVINKY_VYSTUP"] = str(koren / "vystup")
        os.environ["NOVINKY_KALENDARE"] = str(koren / "data")

        for modul in [m for m in list(sys.modules) if m == "novinky"]:
            del sys.modules[modul]
        import novinky  # noqa: PLC0415  (import až po nastavení prostředí)

        self.novinky = novinky
        self.koren = koren

    def tearDown(self) -> None:
        for klic in ["NOVINKY_SABLONY", "NOVINKY_REGISTR", "NOVINKY_VYSTUP", "NOVINKY_KALENDARE"]:
            os.environ.pop(klic, None)
        self.docasny.cleanup()

    def sablona(self, nazev: str, hlavicka: str, telo: str) -> None:
        (self.koren / "sablony" / f"{nazev}.md").write_text(
            f"---\n{hlavicka.strip()}\n---\n{telo.strip()}\n", encoding="utf-8"
        )

    def vystup(self, nazev: str) -> dict:
        with (self.koren / "vystup" / "2027" / f"{nazev}.json").open(encoding="utf-8") as f:
            return json.load(f)

    def test_rocnik_se_bere_z_registru(self) -> None:
        self.assertEqual(self.novinky.rocnik_z_registru(REGISTR), "2027")
        with self.assertRaises(SystemExit):
            self.novinky.rocnik_z_registru({"sady": {}})

    def test_kalendarni_spoustec_spocita_predstih_i_konec(self) -> None:
        self.sablona(
            "kriteria",
            "spoustec: kalendar\nudalost: ss-kriteria\npredstih_dni: 3\nkonec_uzitecnosti: konec_udalosti",
            "# Kritéria\n\nŠkoly je zveřejní {{datum:ss-kriteria}}.",
        )
        self.assertEqual(self.novinky.priprav(None), 0)
        z = self.vystup("kriteria")
        self.assertEqual(z["splatnost"], "2027-01-12")
        self.assertEqual(z["konec_uzitecnosti"], "2027-01-31")

    def test_konec_uzitecnosti_lze_navazat_na_jinou_udalost(self) -> None:
        self.sablona(
            "vysledky",
            "spoustec: kalendar\nudalost: ss-vysledky\npredstih_dni: 0\n"
            "konec_uzitecnosti: udalost:k2-prihlasky",
            "# Výsledky\n\nPřihlášky do 2. kola se podávají {{datum:k2-prihlasky}}.",
        )
        self.assertEqual(self.novinky.priprav(None), 0)
        z = self.vystup("vysledky")
        self.assertEqual(z["splatnost"], "2027-05-14")
        # Zpráva musí být užitečná až do konce podávání přihlášek do 2. kola.
        self.assertEqual(z["konec_uzitecnosti"], "2027-05-24")

    def test_redakcni_spoustec_posune_rok(self) -> None:
        self.sablona(
            "vyber-skoly",
            "spoustec: redakcni\ndatum: 12-07\nrok_posun: -1\nuzitecnost_dni: 30",
            "# Výběr školy\n\nKritéria vyjdou {{datum:ss-kriteria}}.",
        )
        self.assertEqual(self.novinky.priprav(None), 0)
        # Ročník přijímaček je rok nástupu, takže prosinec před ním je o rok dřív.
        self.assertEqual(self.vystup("vyber-skoly")["splatnost"], "2026-12-07")

    def test_datum_vzdy_nese_rok(self) -> None:
        self.sablona(
            "kriteria",
            "spoustec: kalendar\nudalost: ss-kriteria\npredstih_dni: 3",
            "# Kritéria\n\nŠkoly je zveřejní {{datum:ss-kriteria}}.",
        )
        self.assertEqual(self.novinky.priprav(None), 0)
        self.assertIn("15.–31. ledna 2027", self.vystup("kriteria")["text"])

    def test_letopocet_v_sablone_zastavi_generovani(self) -> None:
        self.sablona(
            "spatna",
            "spoustec: kalendar\nudalost: ss-kriteria\npredstih_dni: 0",
            "# Kritéria 2027\n\nText s napsaným rokem.",
        )
        self.assertEqual(self.novinky.priprav(None), 1)

    def test_zakazane_slovo_zastavi_generovani(self) -> None:
        self.sablona(
            "spatna",
            "spoustec: kalendar\nudalost: ss-kriteria\npredstih_dni: 0",
            "# Kritéria\n\nLetos to bude jiné.",
        )
        self.assertEqual(self.novinky.priprav(None), 1)

    def test_neznama_udalost_je_chyba(self) -> None:
        self.sablona(
            "spatna",
            "spoustec: kalendar\nudalost: neexistuje\npredstih_dni: 0",
            "# Nadpis\n\nText.",
        )
        with self.assertRaises(SystemExit):
            self.novinky.priprav(None)

    def test_manifest_nese_vsechny_zpravy_a_otisk_kalendare(self) -> None:
        self.sablona(
            "kriteria",
            "spoustec: kalendar\nudalost: ss-kriteria\npredstih_dni: 3",
            "# Kritéria\n\nŠkoly je zveřejní {{datum:ss-kriteria}}.",
        )
        self.sablona(
            "prihlasky",
            "spoustec: kalendar\nudalost: ss-prihlasky\npredstih_dni: 5\nsegment: ss",
            "# Přihlášky\n\nPodávají se {{datum:ss-prihlasky}}.",
        )
        self.assertEqual(self.novinky.priprav(None), 0)
        with (self.koren / "vystup" / "2027" / "manifest.json").open(encoding="utf-8") as f:
            manifest = json.load(f)
        self.assertEqual(manifest["rocnik"], "2027")
        self.assertEqual(len(manifest["zpravy"]), 2)
        self.assertEqual(manifest["otisk_kalendare"], self.novinky.otisk_kalendare(KALENDAR))
        # Identifikátor zprávy nese ročník, aby nekolidoval mezi roky.
        self.assertTrue(all(z["zprava"].startswith("novinky/2027/") for z in manifest["zpravy"]))
        self.assertEqual(self.vystup("prihlasky")["segment"], ["ss"])

    def test_potvrzeni_a_publikace_se_negeneruji(self) -> None:
        self.sablona("uvitani", "spoustec: potvrzeni", "# Uvítání\n\nText.")
        self.sablona("nova-data", "spoustec: publikace\nsady: cermat-prihlasky", "# Nová data\n\nText.")
        self.assertEqual(self.novinky.priprav(None), 0)
        self.assertFalse((self.koren / "vystup" / "2027" / "uvitani.json").exists())


if __name__ == "__main__":
    unittest.main()
