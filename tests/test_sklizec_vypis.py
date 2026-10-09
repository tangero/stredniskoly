"""Výpis aktualit jako zdroj sklizně u škol bez kanálu novinek.

Žádné síťové volání: přímé stažení (`stahni_feed`) i TinyFish (`stahni_tinyfish`)
se nahrazují. Weby a data jsou smyšlené (`skola.example.cz`).
"""
import importlib.util
import io
import json
import sys
import tempfile
import unittest
from contextlib import redirect_stderr
from datetime import date
from pathlib import Path
from unittest import mock

KOREN = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(KOREN / "scripts"))
import novinky_vypis as nv  # noqa: E402

_spec = importlib.util.spec_from_file_location("sklizec", KOREN / "scripts" / "sklizec-novinek.py")
sklizec = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(sklizec)

DNES = date(2026, 10, 1)
STRANKA = "https://skola.example.cz/aktuality/"

VYPIS = """<html><body>
<nav><a href="/aktuality/">Aktuality</a><a href="/kontakt/">Kontakt</a></nav>
<div class="clanky">
  <div class="clanek"><h3><a href="/aktuality/den-otevrenych-dveri/">Den otevřených dveří</a></h3>
    <span class="datum">25. 9. 2026</span></div>
  <div class="clanek"><h3><a href="/aktuality/okresni-kolo-ve-florbale/">Okresní kolo ve florbale</a></h3>
    <span class="datum">18. 9. 2026</span></div>
  <div class="clanek"><h3><a href="/aktuality/zahajeni-skolniho-roku/">Zahájení školního roku</a></h3>
    <span class="datum">1. 9. 2026</span></div>
  <div class="clanek"><h3><a href="/aktuality/den-otevrenych-dveri/">Den otevřených dveří</a></h3>
    <span class="datum">20. 9. 2026</span></div>
</div></body></html>"""

# Výpis bez odkazů na články: celý text zprávy stojí pod nadpisem.
VYPIS_BEZ_ODKAZU = """<html><body><div class="obsah">
  <div class="zprava"><h3>Exkurze do elektrárny</h3><p>24. 9. 2026</p><p>Text zprávy.</p></div>
  <div class="zprava"><h3>Sportovní den</h3><p>17. 9. 2026</p><p>Text zprávy.</p></div>
  <div class="zprava"><h3>Adaptační kurz prvních ročníků</h3><p>3. 9. 2026</p><p>Text zprávy.</p></div>
</div></body></html>"""


# Karta s odkazem na rubriku vedle odkazu na článek: rubrika má kratší text.
VYPIS_S_RUBRIKOU = """<html><body><div class="clanky">
  <div class="clanek"><a href="/rubrika/skola/">Škola</a><h3><a href="/aktuality/exkurze-do-elektrarny/">Exkurze do elektrárny</a></h3>
    <span class="datum">24. 9. 2026</span></div>
  <div class="clanek"><a href="/rubrika/skola/">Škola</a><h3><a href="/aktuality/sportovni-den/">Sportovní den školy</a></h3>
    <span class="datum">17. 9. 2026</span></div>
  <div class="clanek"><a href="/rubrika/skola/">Škola</a><h3><a href="/aktuality/adaptacni-kurz/">Adaptační kurz prvních ročníků</a></h3>
    <span class="datum">3. 9. 2026</span></div>
</div></body></html>"""


def ok(text, url=STRANKA):
    return {"text": text, "url": url, "etag": None, "modified": None}


class CteckaVypisu(unittest.TestCase):
    def test_precte_titulek_odkaz_a_datum_mimo_navigaci(self):
        p = nv.precti_vypis(VYPIS, STRANKA, DNES)
        self.assertEqual(p[0], {"titulek": "Den otevřených dveří", "datum": "2026-09-25", "druh": "odkaz",
                                "url": "https://skola.example.cz/aktuality/den-otevrenych-dveri/"})
        self.assertNotIn("https://skola.example.cz/kontakt/", [x["url"] for x in p])

    def test_adresa_je_z_nadpisu_ne_z_odkazu_na_rubriku(self):
        p = nv.precti_vypis(VYPIS_S_RUBRIKOU, STRANKA, DNES)
        self.assertEqual([x["url"] for x in p], [
            "https://skola.example.cz/aktuality/exkurze-do-elektrarny/",
            "https://skola.example.cz/aktuality/sportovni-den/",
            "https://skola.example.cz/aktuality/adaptacni-kurz/",
        ])

    def test_kotva_nadpisu_nahradi_kotvu_stranky_vypisu(self):
        p = nv.precti_vypis(VYPIS_BEZ_ODKAZU.replace("<h3>", '<h3 id="z">', 1), STRANKA + "#aktuality", DNES)
        self.assertEqual(p[0]["url"], STRANKA + "#z")
        self.assertTrue(all(x["url"].count("#") <= 1 for x in p))

    def test_datum_bez_roku_dostane_nejblizsi_minuly_rok(self):
        self.assertEqual(nv.najdi_datum("25. září", DNES), date(2026, 9, 25))
        self.assertEqual(nv.najdi_datum("25. prosince", DNES), date(2025, 12, 25))

    def test_29_unor_bez_roku(self):
        # V lednu přestupného roku: letos je v budoucnu, loni neexistuje.
        self.assertIsNone(nv.najdi_datum("29. února", date(2028, 1, 15)))
        # Rok po přestupném: letos neexistuje, loni ano.
        self.assertEqual(nv.najdi_datum("29. února", date(2029, 1, 15)), date(2028, 2, 29))
        self.assertEqual(nv.najdi_datum("29. února", date(2028, 3, 1)), date(2028, 2, 29))

    def test_datum_v_budoucnu_se_nebere(self):
        self.assertIsNone(nv.najdi_datum("9. 12. 2026", DNES))


class ZdrojVypisu(unittest.TestCase):
    def zpracuj(self, zaznam, primo=None, tinyfish=None, klic="klic"):
        with mock.patch.object(sklizec, "stahni_feed", return_value=primo) as sf, \
                mock.patch.object(sklizec.vypis, "stahni_tinyfish", return_value=tinyfish) as st, \
                mock.patch.object(sklizec.vypis, "tinyfish_klic", return_value=klic):
            v = sklizec.zpracuj_skolu("600000001", {"feed_url": STRANKA, "zdroj": "vypis", **zaznam}, {}, DNES)
        return v, sf, st

    def test_vypis_html_projde_klasifikaci_a_nese_typ(self):
        v, _, st = self.zpracuj({"typ": "html"}, primo=ok(VYPIS))
        self.assertEqual((v["stav"], v["typ"], v["cesta"]), ("ok", "html", "primo"))
        st.assert_not_called()
        dod = v["polozky"][0]
        self.assertEqual(dod["titulek"], "Den otevřených dveří")
        self.assertIn("dod", dod["tridy"])
        self.assertTrue(dod["publikovano"].startswith("2026-09-25"))

    def test_tyz_clanek_dvakrat_ve_vypisu_je_jedna_polozka(self):
        v, _, _ = self.zpracuj({"typ": "html"}, primo=ok(VYPIS))
        identity = [p["identita"] for p in v["polozky"]]
        self.assertEqual(len(identity), len(set(identity)))
        self.assertEqual(len(identity), 3)

    def test_rozbor_jen_u_polozek_s_vlastnim_clankem(self):
        # Bez článku vede položka na výpis: rozbor by četl celou stránku a kartě
        # přisoudil termín jiné akce.
        for html, ceka in ((VYPIS_BEZ_ODKAZU, False), (VYPIS, True)):
            with mock.patch.object(sklizec, "stahni_feed", return_value=ok(html)), \
                    mock.patch.object(sklizec.jev, "je_kandidat_na_rozbor", return_value=True), \
                    mock.patch.object(sklizec, "rozeber", return_value=None) as rz:
                sklizec.zpracuj_skolu("600000001", {"feed_url": STRANKA, "zdroj": "vypis", "typ": "html"},
                                      {}, DNES, rozebirat=True)
            self.assertEqual(rz.called, ceka)

    def test_polozky_bez_odkazu_na_clanek_maji_ruzne_identity(self):
        v, _, _ = self.zpracuj({"typ": "html"}, primo=ok(VYPIS_BEZ_ODKAZU))
        self.assertEqual(v["stav"], "ok")
        self.assertEqual(len({p["identita"] for p in v["polozky"]}), 3)
        self.assertTrue(all(p["url"].startswith(STRANKA) for p in v["polozky"]))

    def test_uprava_titulku_clanku_nezmeni_identitu(self):
        # Článek s vlastní adresou: škola opraví titulek, zpráva se nezdvojí.
        pred, _, _ = self.zpracuj({"typ": "html"}, primo=ok(VYPIS))
        upraveny = VYPIS.replace("Okresní kolo ve florbale", "Okresní kolo ve florbale: postup do kraje")
        po, _, _ = self.zpracuj({"typ": "html"}, primo=ok(upraveny))
        self.assertEqual({p["identita"] for p in pred["polozky"]}, {p["identita"] for p in po["polozky"]})

    def test_identita_polozky_bez_clanku_nezavisi_na_sousedech(self):
        # Výpis bez odkazů: když starší zprávy z výpisu odejdou, zbylá má
        # tutéž identitu jako dřív, jinak by ji zapisovač uložil podruhé.
        cely, _, _ = self.zpracuj({"typ": "html"}, primo=ok(VYPIS_BEZ_ODKAZU))
        zkraceny = VYPIS_BEZ_ODKAZU.replace(
            '<div class="zprava"><h3>Adaptační kurz prvních ročníků</h3><p>3. 9. 2026</p><p>Text zprávy.</p></div>',
            '<div class="zprava"><h3>Burza učebnic pro první ročníky</h3><p>1. 9. 2026</p><p>Text zprávy.</p></div>')
        po, _, _ = self.zpracuj({"typ": "html"}, primo=ok(zkraceny))
        spolecne = lambda v: {p["titulek"]: p["identita"] for p in v["polozky"]}
        a, b = spolecne(cely), spolecne(po)
        for t in set(a) & set(b):
            self.assertEqual(a[t], b[t])
        self.assertEqual(len(set(a) & set(b)), 2)

    def test_poradova_kotva_neni_v_identite(self):
        # Nová zpráva nahoře posune pořadové kotvy; ostatní nesmí dostat novou identitu.
        def polozky(titulky):
            return [{"titulek": t, "url": f"{STRANKA}#item-{i}", "datum": "2026-09-20", "druh": "nadpis"}
                    for i, t in enumerate(titulky, 1)]
        with mock.patch.object(sklizec.vypis, "precti_vypis", return_value=polozky(["Sportovní den", "Exkurze do elektrárny"])):
            pred, _, _ = self.zpracuj({"typ": "html"}, primo=ok(VYPIS))
        with mock.patch.object(sklizec.vypis, "precti_vypis",
                               return_value=polozky(["Burza učebnic", "Sportovní den", "Exkurze do elektrárny"])):
            po, _, _ = self.zpracuj({"typ": "html"}, primo=ok(VYPIS))
        ident = lambda v: {p["titulek"]: p["identita"] for p in v["polozky"]}
        self.assertEqual(ident(pred)["Sportovní den"], ident(po)["Sportovní den"])
        self.assertEqual(len(set(ident(po).values())), 3)

    def test_odmitnuti_ochranou_hostingu_zkusi_tinyfish(self):
        v, _, st = self.zpracuj({"typ": "html"}, primo={"chyba": "HTTP 401"}, tinyfish={"text": VYPIS, "url": STRANKA})
        st.assert_called_once()
        self.assertEqual((v["stav"], v["cesta"]), ("ok", "tinyfish"))

    def test_404_se_tinyfish_neposila(self):
        v, _, st = self.zpracuj({"typ": "html"}, primo={"chyba": "HTTP 404"})
        st.assert_not_called()
        self.assertEqual((v["stav"], v["chyba"]), ("chyba", "HTTP 404"))

    def test_bez_klice_zustane_chyba_primeho_stazeni(self):
        v, _, st = self.zpracuj({"typ": "html"}, primo={"chyba": "HTTP 401"}, klic=None)
        st.assert_not_called()
        self.assertEqual(v["chyba"], "HTTP 401")

    def test_zdroj_tinyfish_se_primo_nestahuje(self):
        v, sf, st = self.zpracuj({"typ": "tinyfish"}, tinyfish={"text": VYPIS, "url": STRANKA})
        sf.assert_not_called()
        st.assert_called_once()
        self.assertEqual((v["stav"], v["typ"]), ("ok", "tinyfish"))

    def test_nerozpoznany_vypis_je_chyba_ne_klidna_skola(self):
        v, _, _ = self.zpracuj({"typ": "html"}, primo=ok("<html><body><p>Nic tu není.</p></body></html>"))
        self.assertEqual((v["stav"], v["chyba"]), ("chyba", "výpis nerozpoznán"))

    def test_vyjimka_ctecky_je_chyba_zdroje(self):
        with mock.patch.object(sklizec.vypis, "precti_vypis", side_effect=ValueError("rozbité HTML")):
            v, _, _ = self.zpracuj({"typ": "html"}, primo=ok(VYPIS))
        self.assertEqual((v["stav"], v["chyba"]), ("chyba", "čtečka výpisu: ValueError"))

    def test_validatory_stare_adresy_se_neposilaji(self):
        stav = {"feed_url": "https://skola.example.cz/feed/", "etag": '"stary"', "modified_since": "Tue, 01 Sep 2026 00:00:00 GMT"}
        with mock.patch.object(sklizec, "stahni_feed", return_value=ok(VYPIS)) as sf, \
                mock.patch.object(sklizec.vypis, "tinyfish_klic", return_value=None):
            sklizec.zpracuj_skolu("600000001", {"feed_url": STRANKA, "typ": "html"}, stav, DNES)
        self.assertEqual(sf.call_args.args[1:3], (None, None))
        with mock.patch.object(sklizec, "stahni_feed", return_value=ok(VYPIS)) as sf, \
                mock.patch.object(sklizec.vypis, "tinyfish_klic", return_value=None):
            sklizec.zpracuj_skolu("600000001", {"feed_url": STRANKA, "typ": "html"}, {**stav, "feed_url": STRANKA}, DNES)
        self.assertEqual(sf.call_args.args[1], '"stary"')

    def test_beze_zmeny_podle_etag(self):
        v, _, st = self.zpracuj({"typ": "html"}, primo={"beze_zmeny": True})
        self.assertEqual(v["stav"], "beze_zmeny")
        st.assert_not_called()

    def test_rss_zdroj_zustava_beze_zmeny(self):
        feed = """<?xml version="1.0"?><rss><channel><item><title>Den otevřených dveří</title>
        <link>https://skola.example.cz/dod</link><pubDate>Thu, 24 Sep 2026 08:00:00 GMT</pubDate></item></channel></rss>"""
        v, _, st = self.zpracuj({"typ": "rss"}, primo=ok(feed))
        st.assert_not_called()
        self.assertEqual((v["stav"], v["typ"], len(v["polozky"])), ("ok", "rss", 1))
        self.assertNotIn("cesta", v)


PEREX = ("Ve čtvrtek se v aule konal další ročník setkání, na kterém studenti představili svým spolužákům "
         "kroužky a volnočasové aktivity, kterým se během roku věnují, a pozvali je mezi sebe")


def karty(sablona, polozky):
    return "<html><body><div class='obsah'>" + "".join(sablona.format(*p) for p in polozky) + "</div></body></html>"


# Struktury výpisů čtyř škol, u kterých se titulek slil s úvodem článku (#450). Stránky z 9. 10. 2026
# posloužily jako předloha; texty, adresy a jména jsou smyšlené.
CLANKY = [("veletrh", "Veletrh volnočasových aktivit", "30. 9. 2026"),
          ("kurz", "Kurz němčiny pro veřejnost", "29. 9. 2026"),
          ("beh", "Běžecký klub gymnázia Jana Nováka", "22. 9. 2026")]

# Obrázek s alt a „Více informací“, titulek mimo odkaz v <p>.
VYPIS_OBRAZEK_ALT = karty(
    "<div class='blokAktuality'><a href='aktuality/{0}'><img src='a.webp' alt='{1}'></a>"
    "<div><p> {1}</p></div><p>{2}</p><div><p>" + PEREX + " …</p></div>"
    "<a href='aktuality/{0}'>Více informací <img src='sipka.svg' alt='Více informací'></a></div>", CLANKY)
# Obrázek bez textu, titulek v odkazu s title „Zjistit více“, perex s odkazem „více“.
VYPIS_TITULEK_V_ODKAZU = karty(
    "<div class='new'><a href='/aktuality/{0}' class='new_image' style='background:url(a.png)'></a>"
    "<div class='new_content'><div class='new_title'><a href='/aktuality/{0}' title='Zjistit více'>{1}</a></div>"
    "<div class='new_date'><p>{2}</p></div><div class='new_text'><p>" + PEREX + "<a href='/aktuality/{0}' title='Číst více'>více</a></p></div></div></div>",
    CLANKY)
# Obrázek s aria-label, titulek v odkazu, datum v závorce a perex mimo odkaz.
VYPIS_ARIA_LABEL = karty(
    "<div class='vitem'><div class='vmini'><a href='fr.asp?id={0}' aria-label=\"{1}\"><img src='a.jpg' alt=''></a></div>"
    "<div class='vtitle'><div class='vdate'>({2})</div><div class='vsubj'><a href='fr.asp?id={0}'>{1}</a></div></div>"
    "<div class='vabst'>" + PEREX + "</div></div>", CLANKY)
# Tři odkazy na týž článek: titulek pro mobil, titulek pro počítač a odkaz na celou kartu s perexem.
VYPIS_ODKAZ_NA_KARTU = karty(
    "<div class='clanek'><div class='datum'>{2}</div><div class='d-md-none'><a href='/clanek-cist/{0}'>"
    "<div class='h5'>{1}</div></a></div><div class='small'>Autorka Jana Nováková</div>"
    "<a href='/clanek-cist/{0}' class='clanky-odkaz'>{1}</a>"
    "<a href='/clanek-cist/{0}' class='clanky-odkaz'><img src='f.jpg'><p>" + PEREX + "...</p></a></div>", CLANKY)


class SliteTitulky(unittest.TestCase):
    def test_titulek_konci_na_hranici_odkazu_ne_v_perexu(self):
        for nazev, html in (("obrázek s alt", VYPIS_OBRAZEK_ALT), ("titulek v odkazu", VYPIS_TITULEK_V_ODKAZU),
                            ("aria-label", VYPIS_ARIA_LABEL), ("odkaz na kartu", VYPIS_ODKAZ_NA_KARTU)):
            with self.subTest(nazev):
                p = nv.precti_vypis(html, STRANKA, DNES)
                self.assertEqual([x["titulek"] for x in p], [c[1] for c in CLANKY])
                self.assertTrue(all(x["url"].rstrip("/").endswith(c[0]) for x, c in zip(p, CLANKY)))

    def test_pojistka_zkrati_dlouhy_titulek_na_prvni_vetu(self):
        self.assertEqual(nv.zkrat_titulek("Veletrh volnočasových aktivit. " + PEREX), "Veletrh volnočasových aktivit")

    def test_pojistka_bez_vety_zkrati_na_cele_slovo(self):
        t = nv.zkrat_titulek(PEREX)
        self.assertLessEqual(len(t), nv.MAX_TITULEK)
        self.assertTrue(t.endswith("…"))
        self.assertTrue(PEREX.startswith(t[:-1]))

    def test_titulek_do_meze_zustane_beze_zmeny(self):
        t = "Říjnová akce 1. D - celoškolní sbírka starých a nepotřebných mobilů, tabletů a příslušenství"
        self.assertEqual(nv.zkrat_titulek(t), t)

    def test_rss_titulek_se_nezkracuje(self):
        titulek = "Slavnostní předávání maturitních vysvědčení. " + PEREX
        feed = (f"<?xml version=\"1.0\"?><rss><channel><item><title>{titulek}</title>"
                "<link>https://skola.example.cz/predavani</link><pubDate>Thu, 24 Sep 2026 08:00:00 GMT</pubDate></item></channel></rss>")
        v, _, _ = ZdrojVypisu.zpracuj(self, {"typ": "rss"}, primo=ok(feed))
        self.assertEqual(v["polozky"][0]["titulek"], titulek)


class Registr(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        d = Path(self.tmp.name)
        self.feedy, self.vypisy = d / "feedy.json", d / "vypisy.json"
        self.feedy.write_text(json.dumps({"skoly": {"1": {"feed_url": "https://a.example.cz/feed", "typ": "rss"}}}))
        self.vypisy.write_text(json.dumps({"skoly": {
            "1": {"feed_url": "https://a.example.cz/aktuality", "typ": "html"},
            "2": {"feed_url": "https://b.example.cz/aktuality", "typ": "html"},
            "3": {"feed_url": "https://c.example.cz/aktuality", "typ": "tinyfish"},
        }}))

    def tearDown(self):
        self.tmp.cleanup()

    def test_kanal_novinek_ma_prednost_pred_vypisem(self):
        r = sklizec.nacti_registr(self.feedy, self.vypisy, "klic")
        self.assertEqual(r["1"]["typ"], "rss")
        self.assertEqual(set(r), {"1", "2", "3"})

    def test_bez_klice_se_vypisy_pres_tinyfish_preskoci(self):
        with redirect_stderr(io.StringIO()) as err:
            r = sklizec.nacti_registr(self.feedy, self.vypisy, None)
        self.assertEqual(set(r), {"1", "2"})
        self.assertIn("TINYFISH_API_KEY", err.getvalue())

    def test_bez_registru_vypisu_jen_kanaly(self):
        r = sklizec.nacti_registr(self.feedy, Path(self.tmp.name) / "neni.json", "klic")
        self.assertEqual(set(r), {"1"})


class StazeniTinyfish(unittest.TestCase):
    """`requests` se načítá až ve funkci a v CI nainstalovaný není: podstrčí se celý modul."""

    def post(self, odpoved):
        falesny = mock.Mock()
        falesny.post.return_value = odpoved
        return mock.patch.dict(sys.modules, {"requests": falesny}), falesny.post

    def test_zada_vykreslene_body_a_vraci_konecnou_adresu(self):
        odpoved = mock.Mock(status_code=200)
        odpoved.json.return_value = {"results": [{"url": STRANKA, "final_url": STRANKA + "?p=1", "text": "<body/>"}]}
        zamena, post = self.post(odpoved)
        with zamena:
            v = nv.stahni_tinyfish(STRANKA, "klic")
        self.assertEqual(v, {"text": "<body/>", "url": STRANKA + "?p=1"})
        self.assertEqual(post.call_args.kwargs["json"]["include_selectors"], ["body"])
        self.assertEqual(post.call_args.kwargs["headers"]["X-API-Key"], "klic")

    def test_chyba_sluzby_je_stav_zdroje(self):
        odpoved = mock.Mock(status_code=200)
        odpoved.json.return_value = {"results": [], "errors": [{"url": STRANKA, "error": "target_http_error"}]}
        zamena, _ = self.post(odpoved)
        with zamena:
            self.assertEqual(nv.stahni_tinyfish(STRANKA, "klic"), {"chyba": "TinyFish target_http_error"})


if __name__ == "__main__":
    unittest.main()
