"""Datum vydání položky: co se s ním smí a nesmí stát.

Sklízeč se jmenuje `sklizec-novinek.py`, tedy se spojovníkem, a nejde
importovat jménem; načítá se proto přes `importlib`.
"""
import importlib.util
import unittest
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

KOREN = Path(__file__).resolve().parent.parent
_spec = importlib.util.spec_from_file_location("sklizec", KOREN / "scripts" / "sklizec-novinek.py")
sklizec = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(sklizec)

DNES = date(2026, 9, 20)


class KonecPlatnosti(unittest.TestCase):
    def test_termin_urcuje_platnost(self):
        """Termínová karta žije podle termínu, ne podle data vydání."""
        polozka = {"tridy": ["dod"], "publikace": {"terminy": ["2026-10-01"]}}
        self.assertEqual(
            sklizec.konec_platnosti(polozka, datetime(2026, 8, 28, tzinfo=timezone.utc), DNES),
            "2026-10-04",
        )

    def test_bez_data_se_pocita_ode_dne_sklizne(self):
        """Nesmrtelná zpráva je horší než zpráva, která po dvou měsících zmizí."""
        self.assertEqual(
            sklizec.konec_platnosti({"tridy": [], "publikace": {}}, None, DNES),
            (DNES + timedelta(days=sklizec.PLATNOST_VYCHOZI)).isoformat(),
        )

    def test_volna_mista_maji_kratsi_platnost_nez_ostatni(self):
        polozka = {"tridy": ["volna_mista"], "publikace": {}}
        self.assertEqual(
            sklizec.konec_platnosti(polozka, datetime(2026, 9, 1, tzinfo=timezone.utc), DNES),
            "2026-09-08",
        )


class BudouciDatumVydani(unittest.TestCase):
    """Reprodukce nálezu z provozu 20. 9. 2026: článek s datem 11. 11. 2031."""

    def test_tolerance_kryje_casove_zony(self):
        """Dnešní článek vydaný „zítra" kvůli zóně se nesmí ztratit."""
        self.assertEqual(sklizec.TOLERANCE_BUDOUCIHO_DATA_DNU, 1)

    def test_nesmyslne_datum_je_za_tolerianci(self):
        nesmysl = datetime(2031, 11, 11, tzinfo=timezone.utc)
        self.assertGreater(
            nesmysl.date(),
            DNES + timedelta(days=sklizec.TOLERANCE_BUDOUCIHO_DATA_DNU),
        )

    def test_polozka_bez_duveryhodneho_data_stejne_vyprsi(self):
        """Zahození data nesmí položku udělat nesmrtelnou."""
        konec = sklizec.konec_platnosti({"tridy": [], "publikace": {}}, None, DNES)
        self.assertLess(date.fromisoformat(konec), DNES + timedelta(days=365))


if __name__ == "__main__":
    unittest.main()
