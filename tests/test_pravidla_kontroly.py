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
import sit  # noqa: E402
import slova  # noqa: E402
import spolecne  # noqa: E402
import ukazatele  # noqa: E402


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

    def test_ukazatele_projdou_na_dnesnim_stavu(self):
        self.assertEqual(spust(ukazatele)[0], 0)

    def test_sit_projde_na_dnesnim_stavu(self):
        self.assertEqual(spust(sit)[0], 0)

    def test_slova_vypisou_podminene_polozky_jako_nekontrolovane(self):
        kod, vystup = spust(slova)
        self.assertIn("Nekontrolováno strojově", vystup)
        kontrolovana, nekontrolovane = slova.nacti_slovnik()
        self.assertIn("zájemci", kontrolovana)
        self.assertNotIn("žáci", kontrolovana)  # „žáci (před přijetím)“ je podmíněné
        self.assertTrue(any(p.startswith("žáci") for p in nekontrolovane))
        for polozka in nekontrolovane:  # K3: vypsaná je každá, ne jen prvních pár
            self.assertIn(f"  - {polozka}\n", vystup)

    def test_podminka_je_dovetek_ne_predlozka_uvnitr_fraze(self):
        kontrolovana, nekontrolovane = slova.nacti_slovnik()
        self.assertIn("obor bez přijímaček", kontrolovana)
        self.assertIn("kritéria bez roku", nekontrolovane)
        self.assertTrue(slova.je_podminena("hranice přijetí mimo tento popisek"))
        self.assertTrue(slova.je_podminena("u čehokoli jiného než u potvrzeného údaje"))
        self.assertFalse(slova.je_podminena("dali přednost jiné škole"))


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

    def _hledej(self, obsah: str):
        with tempfile.TemporaryDirectory() as tmp:
            kor = Path(tmp)
            (kor / "src" / "app").mkdir(parents=True)
            (kor / "src" / "app" / "x.tsx").write_text(obsah, encoding="utf-8")
            puvodni = slova.KOREN
            slova.KOREN = kor
            try:
                return [n.radek for n in slova.hledej()]
            finally:
                slova.KOREN = puvodni

    def test_samotne_slovo_v_nadpisu_a_viceslovna_fraze_jsou_nalez(self):
        radky = self._hledej(
            "<h2>Žebříček</h2>\n"
            "const stitek = 'Žebříček';\n"
            "const t = 'Obor bez přijímaček v nabídce';\n"
            "const klic = 'export';\n"
            "<div className=\"top\">text</div>\n")
        self.assertEqual(radky, [1, 2, 3])

    def test_komentare_nejsou_text_stranky(self):
        radky = self._hledej(
            "{/* 'konkurence škol' */}\n"
            "/* 'Žebříček škol v kraji'\n"
            "   'Žebříček škol v kraji' */\n"
            "{/*\n"
            "  <p>Žebříček</p>\n"
            "*/}\n"
            "// 'Žebříček škol v kraji'\n"
            "const a = 1; /* 'Žebříček škol v kraji' */ const b = 'Žebříček škol v kraji';\n")
        self.assertEqual(radky, [8])

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
        self.assertEqual(self._hledej(f"rodic{A}example.test a{A}skola.test b{A}neco.invalid c{A}skola.example", "{}"), [])

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


class NovyUkazatel(unittest.TestCase):
    SLOVNIK = (
        "# Slovník\n## 1. Poptávka\n### Kapacita míst\ntext\n## 6a. Veletrhy\ntext\n"
        "## 7. Ukazatele bez doloženého výpočtu\n### Index obtížnosti (`obtiznost`)\n"
        "Pole `jine_pole` v textu identifikátorem ukazatele není.\n## 8. Jak zavést nový ukazatel\n")

    def _hledej(self, registr: str, kod: str):
        with tempfile.TemporaryDirectory() as tmp:
            kor = Path(tmp)
            for slozka in ("docs", "public", "src/lib"):
                (kor / slozka).mkdir(parents=True)
            (kor / "docs" / "slovnik-ukazatelu.md").write_text(self.SLOVNIK, encoding="utf-8")
            (kor / "public" / "stav_datovych_sad.json").write_text(registr, encoding="utf-8")
            (kor / "src" / "lib" / "x.ts").write_text(kod, encoding="utf-8")
            (kor / "src" / "lib" / "x.test.ts").write_text("const a = o.obtiznost;\n", encoding="utf-8")
            puvodni = ukazatele.KOREN
            ukazatele.KOREN = kor
            try:
                return ukazatele.hledej()
            finally:
                ukazatele.KOREN = puvodni

    def test_ukazatel_registru_bez_zapisu_ve_slovniku_je_nalez_s_radkem(self):
        registr = (
            '{\n "sady": {\n  "a": {"ukazatele": ["Kapacita míst",\n   "Vymyšlený ukazatel"]}\n },\n'
            ' "ukazatele_z_vice_sad": {"Veletrhy": ["a"]}\n}\n')
        nalezy = self._hledej(registr, "export const a = 1;\n")
        self.assertEqual([(n.cesta, n.radek) for n in nalezy], [("public/stav_datovych_sad.json", 4)])
        self.assertIn("Vymyšlený ukazatel", nalezy[0].popis)
        self.assertIn("docs/slovnik-ukazatelu.md", nalezy[0].oprava)

    def test_ukazatel_bez_vypoctu_v_kodu_je_nalez_mimo_komentare_a_testy(self):
        kod = (
            "// o.obtiznost v komentáři\n"
            "/* obtiznost\n   obtiznost */\n"
            "const a = o.obtiznost + o.jine_pole;\n"
            "const b = o.obtiznost_prijeti; // obtiznost\n"
            "const url = 'https://example.cz/x'; const c = radek['obtiznost'];\n")
        nalezy = self._hledej('{"sady": {}}', kod)
        self.assertEqual([(n.cesta, n.radek) for n in nalezy], [("src/lib/x.ts", 4), ("src/lib/x.ts", 6)])
        self.assertIn("Oprava", f"{nalezy[0].popis}. Oprava: {nalezy[0].oprava}")

    def test_slovnik_v_repozitari_vede_ukazatele_bez_vypoctu(self):
        self.assertIn("obtiznost", ukazatele.nacti_slovnik()[1])


class NoveSitoveVolani(unittest.TestCase):
    def _hledej(self, soubory: dict[str, str], povolene: str = '{"servery":[{"domena":"Data.Cermat.cz","ucel":"x","dokumentace":"y"}]}'):
        with tempfile.TemporaryDirectory() as tmp:
            kor = Path(tmp)
            (kor / "src").mkdir()
            (kor / "scripts").mkdir()
            for cesta, obsah in soubory.items():
                (kor / cesta).write_text(obsah, encoding="utf-8")
            (kor / "p.json").write_text(povolene, encoding="utf-8")
            puvodni = (sit.KOREN, sit.POVOLENE)
            sit.KOREN, sit.POVOLENE = kor, kor / "p.json"
            try:
                return sit.hledej()
            finally:
                sit.KOREN, sit.POVOLENE = puvodni

    def test_nova_domena_ve_volajicim_kodu_je_nalez_s_radkem_a_navodem(self):
        nalezy = self._hledej({
            "src/a.ts": "const a = 1;\nconst r = await fetch('https://api.nova-sluzba.cz/v1');\n"
                        "await fetch('https://data.cermat.cz/x'); // https://komentar.cz\n",
            "scripts/b.py": "import requests\n# https://komentar.cz/x\nr = requests.get('https://jiny-server.cz/a')\n",
        })
        self.assertEqual([(n.cesta, n.radek) for n in nalezy], [("src/a.ts", 2), ("scripts/b.py", 3)])
        self.assertIn("nové síťové volání", nalezy[0].popis)
        self.assertIn("docs/zdroje-dat.md", nalezy[0].oprava)
        self.assertIn("povolene-servery.json", nalezy[0].oprava)

    def test_odkaz_v_souboru_bez_volani_a_smyslena_domena_nejsou_nalez(self):
        self.assertEqual(self._hledej({
            "src/odkaz.tsx": "<a href=\"https://www.skola-kdekoli.cz\">web školy</a>\n",
            "src/volani.ts": "await fetch('https://skola.example.cz/a'); await fetch('http://localhost:3000/x');\n",
            "src/volani.test.ts": "await fetch('https://neznamy-server.cz/a');\n",
        }), [])

    def test_povolene_servery_v_repozitari_maji_ucel_a_dokumentaci(self):
        import json
        data = json.loads(sit.POVOLENE.read_text(encoding="utf-8"))
        self.assertTrue(data["servery"])
        for polozka in data["servery"]:
            self.assertTrue(polozka.get("ucel"), polozka)
            self.assertTrue((KOREN / polozka["dokumentace"]).exists(), polozka)


class KodBezKomentaru(unittest.TestCase):
    def test_komentare_zmizi_adresa_a_vzor_cesty_v_retezci_zustanou(self):
        kod = (
            "a /* x */ b\n"
            "c /* začátek\n uvnitř\n konec */ d\n"
            "const u = 'https://server.cz/a'; // poznámka\n"
            "const vzor = 'src/*.ts';\n"
            "const dalsi = 1;\n")
        radky = dict(spolecne.kod_bez_komentaru(kod))
        self.assertEqual(sorted(radky), [1, 2, 4, 5, 6, 7])
        self.assertNotIn("x", radky[1])
        self.assertIn("https://server.cz/a", radky[5])
        self.assertNotIn("poznámka", radky[5])
        self.assertIn("dalsi", radky[7])

    def test_python_vynecha_jen_cele_radky_komentare(self):
        radky = dict(spolecne.kod_bez_komentaru("# komentář\nx = 'a#b'\n", python=True))
        self.assertEqual(radky, {2: "x = 'a#b'"})


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

    def test_dalsi_vyskyt_tehoz_nalezu_v_souboru_je_novy_nalez(self):
        o = spolecne.otisk("x")
        prvni = spolecne.Nalez("a.md", 3, "popis", "oprava", o)
        druhy = spolecne.Nalez("a.md", 9, "popis", "oprava", o)
        with tempfile.TemporaryDirectory() as tmp:
            zaklad = Path(tmp) / "z.json"
            ven = io.StringIO()
            with contextlib.redirect_stdout(ven), contextlib.redirect_stderr(io.StringIO()):
                self.assertEqual(spolecne.spust("t", zaklad, lambda: [prvni], "p", ["--obnov"]), 0)
                self.assertEqual(spolecne.spust("t", zaklad, lambda: [prvni, druhy], "p", []), 1)
                self.assertIn("a.md:9: popis", ven.getvalue())
                self.assertNotIn("a.md:3: popis", ven.getvalue())
                self.assertEqual(spolecne.spust("t", zaklad, lambda: [prvni, druhy], "p", ["--obnov"]), 0)
                self.assertEqual(spolecne.spust("t", zaklad, lambda: [prvni, druhy], "p", []), 0)

    def test_zaklad_neobsahuje_text_nalezu(self):
        for soubor in ("slova-zaklad.json", "osobni-udaje-zaklad.json", "ukazatele-zaklad.json", "sit-zaklad.json"):
            text = (KOREN / "scripts" / "pravidla" / soubor).read_text(encoding="utf-8")
            self.assertNotIn(A, text)


if __name__ == "__main__":
    unittest.main()
