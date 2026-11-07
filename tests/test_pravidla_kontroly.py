"""Testy kontrol pravidel v `scripts/pravidla/` (issue #559).

Každá kontrola musí na dnešním stavu projít (díky zmrazenému základu) a na vstupu
s novým porušením selhat řádkem `soubor:řádek` a návodem k opravě.
"""

from __future__ import annotations

import contextlib
import io
import sys
import tempfile
import unittest
from pathlib import Path

KOREN = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(KOREN / "scripts" / "pravidla"))

import osobni_udaje  # noqa: E402
import slova  # noqa: E402
import spolecne  # noqa: E402


A = "@"  # složeno, aby test sám nebyl nálezem kontroly osobních údajů
T = "123 " + "456 789"


def spust(modul, argv=None):
    """Spustí `modul.main` a vrátí (návratový kód, standardní výstup)."""
    ven = io.StringIO()
    with contextlib.redirect_stdout(ven), contextlib.redirect_stderr(io.StringIO()):
        kod = modul.main(argv or [])
    return kod, ven.getvalue()


class DnesniStav(unittest.TestCase):
    def test_slova_projdou_na_dnesnim_stavu(self):
        self.assertEqual(spust(slova)[0], 0)

    def test_osobni_udaje_projdou_na_dnesnim_stavu(self):
        self.assertEqual(spust(osobni_udaje)[0], 0)

    def test_slova_vypisou_podminene_polozky_jako_nekontrolovane(self):
        kod, vystup = spust(slova)
        self.assertIn("Nekontrolováno strojově", vystup)
        kontrolovana, nekontrolovane = slova.nacti_slovnik()
        self.assertIn("zájemci", kontrolovana)
        self.assertNotIn("žáci", kontrolovana)  # „žáci (před přijetím)“ je podmíněné
        self.assertTrue(any(p.startswith("žáci") for p in nekontrolovane))


class NoveSlovo(unittest.TestCase):
    def test_zakazane_slovo_i_s_padovym_tvarem_je_nalez_s_radkem_a_navodem(self):
        with tempfile.TemporaryDirectory() as tmp:
            kor = Path(tmp)
            (kor / "src" / "app").mkdir(parents=True)
            (kor / "src" / "app" / "x.tsx").write_text(
                "export const a = 'Nabídka pro zájemce o obor';\nexport const b = 'Bez problému';\n", encoding="utf-8")
            (kor / "src" / "app" / "x.test.tsx").write_text("const c = 'zájemci o obor';\n", encoding="utf-8")
            puvodni = slova.KOREN
            slova.KOREN = kor
            try:
                nalezy = slova.hledej()
            finally:
                slova.KOREN = puvodni
        self.assertEqual([(n.cesta, n.radek) for n in nalezy], [("src/app/x.tsx", 1)])
        self.assertIn("Oprava", f"{nalezy[0].popis}. Oprava: {nalezy[0].oprava}")

    def test_css_trida_top_neni_nalez(self):
        vz = dict(slova.vzorce(["top"]))
        self.assertIsNone(vz["top"].search("absolute top-0 left-0"))
        self.assertIsNotNone(vz["top"].search("Žebříček top škol"))


class NovyOsobniUdaj(unittest.TestCase):
    def _hledej(self, obsah: str, vyjimky: str | None = None):
        with tempfile.TemporaryDirectory() as tmp:
            kor = Path(tmp)
            (kor / "docs").mkdir()
            (kor / "docs" / "a.md").write_text(obsah, encoding="utf-8")
            povodni = (osobni_udaje.KOREN, osobni_udaje.VYJIMKY)
            osobni_udaje.KOREN = kor
            if vyjimky is not None:
                v = kor / "v.json"
                v.write_text(vyjimky, encoding="utf-8")
                osobni_udaje.VYJIMKY = v
            try:
                return osobni_udaje.hledej()
            finally:
                osobni_udaje.KOREN, osobni_udaje.VYJIMKY = povodni

    def test_cizi_email_a_telefon_jsou_nalez_bez_opsani_hodnoty(self):
        nalezy = self._hledej(f"a\nKontakt: jana{A}cizi-skola.cz, tel. +420 {T}\nskola{A}example.cz\n", "{}")
        self.assertEqual([n.radek for n in nalezy], [2, 2])
        for n in nalezy:
            self.assertNotIn("cizi-skola", n.popis + n.oprava + n.otisk)
            self.assertNotIn("456", n.popis + n.oprava + n.otisk)

    def test_smyslene_domeny_soubor_obrazku_a_holych_devet_cislic_nejsou_nalez(self):
        self.assertEqual(self._hledej(f"skola{A}example.cz a{A}example.com logo{A}2x.png id 123456789", "{}"), [])

    def test_povolena_adresa_a_soubor_jsou_vyjimka(self):
        v = '{"adresy":[{"adresa":"Info' + A + 'Projekt.cz","duvod":"x"}],"soubory":[]}'
        self.assertEqual(self._hledej("info" + A + "projekt.cz", v), [])
        v2 = '{"adresy":[],"soubory":[{"cesta":"docs/a.md","duvod":"x"}]}'
        self.assertEqual(self._hledej("jana" + A + "cizi-skola.cz", v2), [])

    def test_vyjimky_v_repozitari_maji_duvod(self):
        import json
        data = json.loads(osobni_udaje.VYJIMKY.read_text(encoding="utf-8"))
        for polozka in data["adresy"] + data["soubory"]:
            self.assertTrue(polozka.get("duvod"), polozka)


class Zaklad(unittest.TestCase):
    def test_novy_nalez_shodi_kontrolu_a_obnova_ho_prijme(self):
        n = spolecne.Nalez("a.ts", 3, "popis", "oprava", spolecne.otisk("x"))
        with tempfile.TemporaryDirectory() as tmp:
            zaklad = Path(tmp) / "z.json"
            ven = io.StringIO()
            with contextlib.redirect_stdout(ven), contextlib.redirect_stderr(io.StringIO()):
                self.assertEqual(spolecne.spust("t", zaklad, lambda: [n], "p", []), 1)
                self.assertEqual(spolecne.spust("t", zaklad, lambda: [n], "p", ["--obnov"]), 0)
                self.assertEqual(spolecne.spust("t", zaklad, lambda: [n], "p", []), 0)
            self.assertIn("a.ts:3: popis. Oprava: oprava", ven.getvalue())

    def test_zaklad_neobsahuje_text_nalezu(self):
        for soubor in ("slova-zaklad.json", "osobni-udaje-zaklad.json"):
            text = (KOREN / "scripts" / "pravidla" / soubor).read_text(encoding="utf-8")
            self.assertNotIn(A, text)


if __name__ == "__main__":
    unittest.main()
