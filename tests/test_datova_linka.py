"""Testy datové linky nanečisto: falešný zdroj a falešný Telegram na lokálním serveru.

    python3 -m unittest tests/test_datova_linka.py -v

Nic se neposílá ven, nic se nepushuje. Zpracovatelské skripty ale běží doopravdy
nad syntetickým souborem uchazečů, aby test pokryl i zpracování.
"""
from __future__ import annotations

import datetime as dt
import http.server
import json
import os
import shutil
import subprocess
import sys
import tempfile
import threading
import unittest
from pathlib import Path
from types import SimpleNamespace

KOREN = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(KOREN / "scripts"))

import openpyxl  # noqa: E402

from linka import jadro, komunikace, predani, zpracovani  # noqa: E402

HLAVICKA_UCHAZECI = (
    ["rok", "kolo"]
    + [f"ss{k}_{pole}" for pole in ("redizo", "zrizovatel", "kkov", "forma", "zkraceno", "prijat", "duvod_neprijeti") for k in range(1, 6)]
    + ["c_m_procentni_skor", "c_procentni_skor", "m_procentni_skor"]
)
OBOR_A = ("999000001", "79-41-K/41")
OBOR_B = ("999000002", "78-42-M/01")


def syntetika_uchazecu(cesta: Path, list_: str = "Sheet 1", bez_sloupce: str | None = None, prijat_jako=int) -> None:
    """40 uchazečů o obor A: 20 přijatých, 15 odmítnutých pro kapacitu, 5 přijatých na vyšší prioritu."""
    hlavicka = [s for s in HLAVICKA_UCHAZECI if s != bez_sloupce]
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = list_
    ws.append(hlavicka)
    for i in range(40):
        radek = dict.fromkeys(hlavicka)
        radek.update(rok=2026, kolo=1, ss1_redizo=OBOR_A[0], ss1_kkov=OBOR_A[1], ss2_redizo=OBOR_B[0], ss2_kkov=OBOR_B[1])
        if i < 20:
            radek.update(ss1_prijat=prijat_jako(1), c_m_procentni_skor=200 - i * 3)
        elif i < 35:
            radek.update(ss1_prijat=prijat_jako(2), ss1_duvod_neprijeti="pro_nedostacujici_kapacitu", c_m_procentni_skor=150 - i * 2)
        else:
            radek.update(ss1_prijat=prijat_jako(2), ss1_duvod_neprijeti="prijat_na_vyssi_prioritu", c_m_procentni_skor=180)
        ws.append([radek.get(s) for s in hlavicka])
    wb.save(cesta)


class FalesnyServer:
    """Zdroj dat a Telegram API na jednom portu."""

    def __init__(self):
        self.soubory: dict[str, tuple[int, bytes, str]] = {}
        self.telegram_odeslano: list[dict] = []
        self.telegram_aktualizace: list[dict] = []
        server = self

        class Obsluha(http.server.BaseHTTPRequestHandler):
            def log_message(self, *a):
                pass

            def _soubor(self, telo: bool):
                stav, data, zmena = server.soubory.get(self.path, (404, b"", ""))
                self.send_response(stav)
                if zmena:
                    self.send_header("Last-Modified", zmena)
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                if telo:
                    self.wfile.write(data)

            def do_HEAD(self):
                self._soubor(False)

            def do_GET(self):
                self._soubor(True)

            def do_POST(self):
                delka = int(self.headers.get("Content-Length", 0))
                parametry = dict(x.split("=", 1) for x in self.rfile.read(delka).decode().split("&") if x)
                from urllib.parse import unquote_plus
                parametry = {k: unquote_plus(v) for k, v in parametry.items()}
                if self.path.endswith("/sendMessage"):
                    server.telegram_odeslano.append(parametry)
                    odpoved = {"ok": True, "result": {"message_id": 1000 + len(server.telegram_odeslano)}}
                elif self.path.endswith("/getUpdates"):
                    odpoved = {"ok": True, "result": server.telegram_aktualizace}
                else:
                    odpoved = {"ok": False, "description": "neznámá metoda"}
                data = json.dumps(odpoved).encode()
                self.send_response(200)
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                self.wfile.write(data)

        self.httpd = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Obsluha)
        self.adresa = f"http://127.0.0.1:{self.httpd.server_address[1]}"
        threading.Thread(target=self.httpd.serve_forever, daemon=True).start()

    def zastav(self):
        self.httpd.shutdown()


class TestDatovaLinka(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = FalesnyServer()

    @classmethod
    def tearDownClass(cls):
        cls.server.zastav()

    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp(prefix="linka-test-"))
        self.server.soubory.clear()
        self.server.telegram_odeslano.clear()
        self.server.telegram_aktualizace.clear()
        self.puvodni_env = dict(os.environ)
        os.environ.update({
            "LINKA_REGISTR": str(self.tmp / "registr.json"),
            "LINKA_FRONTA": str(self.tmp / "fronta.json"),
            "LINKA_PRACE": str(self.tmp / "prace"),
            "LINKA_OZNAMENI": str(self.tmp / "oznameni"),
            "LINKA_DNES": "2026-09-13",
            "LINKA_TELEGRAM_API": self.server.adresa + "/tg",
            "TELEGRAM_BOT_TOKEN": "test",
            "TELEGRAM_CHAT_ID": "42",
            # Syntetický soubor má jeden obor; pojistku proti málo oborům ověřuje samostatný test.
            "LINKA_MIN_PODIL_OBORU": "0",
            # Zpracování uchazečů potřebuje snímek rejstříku škol, ten má desítky
            # megabajtů a do gitu se neukládá. Test běží nad zkráceným snímkem,
            # protože ověřuje zpracování, ne dostupnost velkého souboru.
            "MSMT_REJSTRIK": str(Path(__file__).resolve().parent / "fixtures" / "rssz-test.jsonld"),
        })
        a = self.server.adresa
        # Zdroj: nové období uchazečů, revize výsledků, starý soubor, zmizelý zdroj, nepoužívaná sada.
        syntetika_uchazecu(self.tmp / "uchazeci.xlsx")
        self.server.soubory["/U/PZ2026_uchazeci.xlsx"] = (200, (self.tmp / "uchazeci.xlsx").read_bytes(), "Wed, 20 May 2026 13:10:56 GMT")
        self.server.soubory["/U/PZ2025_uchazeci.xlsx"] = (200, b"stary", "Wed, 20 May 2025 13:10:56 GMT")
        self.revize_xlsx = self.tmp / "revize.xlsx"
        wb = openpyxl.Workbook()
        wb.active.append(["REDIZO", "KKOV", "KAPACITA", "PŘIJATÍ"])
        wb.active.append(["999000001", "79-41-K/41", 30, 28])
        wb.save(self.revize_xlsx)
        self.server.soubory["/V/PZ2026_vysledky.xlsx"] = (200, self.revize_xlsx.read_bytes(), "Sun, 20 Sep 2026 08:00:00 GMT")
        self.server.soubory["/S/PZ2026_stary.xlsx"] = (200, b"stary", "Tue, 18 Aug 2026 20:28:32 GMT")
        self.server.soubory["/I/PZ2027_info.xlsx"] = (200, b"info", "Tue, 18 Aug 2026 20:28:32 GMT")

        def sada(pouziti, obdobi, vzor, **zobrazeno):
            return {
                "nazev": "test", "dokumentace": "docs/zdroje-dat.md", "cyklus": "rocni", "pouziti": pouziti,
                "zobrazeno": {"obdobi": obdobi, **zobrazeno}, "ocekavano": {"obdobi": None, "kdy": None, "jistota": "neznamo"},
                "po_prepnuti": "", "vystupy": [], "ukazatele": [],
                "aktualizace": {"automatizace": "priprava", "lidsky_krok": "Ručně ověřit.", "sledovat": [vzor]},
            }
        self.registr = {"sady": {
            "cermat-uchazeci-kolo1": sada("web", "2025", a + "/U/PZ{rok}_uchazeci.xlsx", stazeno="2026-06-01"),
            "sada-revize": sada("web", "2026", a + "/V/PZ{rok}_vysledky.xlsx", zkontrolovano="2026-09-12"),
            "sada-stara": sada("web", "2026", a + "/S/PZ{rok}_stary.xlsx", zkontrolovano="2026-09-12"),
            "sada-zmizela": sada("web", "2026-02-11", a + "/Z/detail"),
            "sada-info": sada("nepouzito", "2026", a + "/I/PZ{rok}_info.xlsx"),
        }}
        Path(os.environ["LINKA_REGISTR"]).write_text(json.dumps(self.registr), encoding="utf-8")

    def tearDown(self):
        os.environ.clear()
        os.environ.update(self.puvodni_env)
        shutil.rmtree(self.tmp, ignore_errors=True)

    # ------------------------------------------------------------ zjištění

    def zjisti(self):
        fronta = jadro.nacti_frontu()
        beh = jadro.zjisti(self.registr, fronta)
        return fronta, beh

    def ulohy_podle_sady(self, fronta):
        return {u["sada"]: u for u in fronta["ulohy"].values()}

    def test_zjisteni_rozlisi_druhy_zmen(self):
        fronta, beh = self.zjisti()
        u = self.ulohy_podle_sady(fronta)
        self.assertEqual(u["cermat-uchazeci-kolo1"]["druh"], "nove_obdobi")
        self.assertEqual(u["cermat-uchazeci-kolo1"]["obdobi"], "2026")
        self.assertEqual(u["sada-revize"]["druh"], "revize")
        self.assertEqual(u["sada-zmizela"]["druh"], "zmizelo")
        self.assertNotIn("sada-stara", u, "soubor starší než převzetí nemá založit úlohu")
        self.assertNotIn("sada-info", u, "nepoužívaná sada nemá zakládat úlohu")
        self.assertEqual([i["sada"] for i in beh["informace"]], ["sada-info"])

    def test_opakovany_beh_nezaklada_duplicity(self):
        fronta, _ = self.zjisti()
        jadro.uloz_frontu(fronta)
        fronta2, beh2 = self.zjisti()
        self.assertEqual(beh2["nove_ulohy"], [])
        self.assertEqual(len(fronta2["ulohy"]), len(fronta["ulohy"]))

    def test_nova_revize_znameho_souboru_zalozi_novou_ulohu(self):
        fronta, _ = self.zjisti()
        jadro.uloz_frontu(fronta)
        stav, data, _ = self.server.soubory["/S/PZ2026_stary.xlsx"]
        self.server.soubory["/S/PZ2026_stary.xlsx"] = (stav, b"nove", "Mon, 21 Sep 2026 08:00:00 GMT")
        fronta2, beh2 = self.zjisti()
        self.assertEqual([fronta2["ulohy"][k]["sada"] for k in beh2["nove_ulohy"]], ["sada-stara"])
        self.assertEqual(fronta2["ulohy"][beh2["nove_ulohy"][0]]["druh"], "revize")

    def test_kod_je_stabilni_a_citelny(self):
        k = jadro.kod("a", "b")
        self.assertEqual(k, jadro.kod("a", "b"))
        self.assertEqual(len(k), 5)
        self.assertTrue(all(z in jadro.ABECEDA for z in k))

    # ------------------------------------------------------------ příprava

    def test_priprava_uchazecu_spusti_zpracovatele(self):
        fronta, _ = self.zjisti()
        u = self.ulohy_podle_sady(fronta)["cermat-uchazeci-kolo1"]
        zpracovani.priprav(u, self.registr)
        self.assertEqual(u["stav"], "pripraveno", u.get("priprava"))
        p = u["priprava"]
        self.assertEqual(p["struktura"]["radku"], 40)
        pasma = json.loads(Path(next(k for k in p["zpracovani"]["predani"] if "pasma" in k)).read_text())
        obor = pasma["data"]["_".join(OBOR_A)]
        self.assertEqual(pasma["rok"], 2026)
        self.assertEqual(obor["prijatych"], 20)
        self.assertEqual(obor["neveslo_se"], 15)
        self.assertEqual(obor["prijato_na_vyssi_prioritu"], 5)
        self.assertIn("pasma", obor)
        self.assertEqual(set(p["zpracovani"]["predani"].values()), {"public/pasma_prijeti_2026.json", "public/soubeh_prihlasek_2026.json", "public/kontext_prihlasek_2026.json"})

    def test_dopad_rozlisi_soubory_ktere_web_cte(self):
        revize = zpracovani.dopad_uchazeci(2025, "2025")
        self.assertIn("Přepíše public/pasma_prijeti_2025.json", revize)
        self.assertIn("public/soubeh_prihlasek_2025.json web nezobrazuje", revize)
        nove = zpracovani.dopad_uchazeci(2026, "2025")
        self.assertIn("web je nečte", nove)
        self.assertNotIn("Přepíše", nove)

    def test_prijat_zapsany_jako_text_se_zpracuje(self):
        syntetika_uchazecu(self.tmp / "text.xlsx", prijat_jako=str)
        self.server.soubory["/U/PZ2026_uchazeci.xlsx"] = (200, (self.tmp / "text.xlsx").read_bytes(), "Wed, 20 May 2026 13:10:56 GMT")
        fronta, _ = self.zjisti()
        u = self.ulohy_podle_sady(fronta)["cermat-uchazeci-kolo1"]
        zpracovani.priprav(u, self.registr)
        self.assertEqual(u["stav"], "pripraveno", u["priprava"].get("chyba"))
        self.assertEqual(u["priprava"]["zpracovani"]["srovnani"]["oboru_nove"], 1)

    def test_prazdny_vysledek_zpracovani_je_selhani(self):
        syntetika_uchazecu(self.tmp / "nikdo.xlsx", prijat_jako=lambda v: "ne")
        self.server.soubory["/U/PZ2026_uchazeci.xlsx"] = (200, (self.tmp / "nikdo.xlsx").read_bytes(), "Wed, 20 May 2026 13:10:56 GMT")
        fronta, _ = self.zjisti()
        u = self.ulohy_podle_sady(fronta)["cermat-uchazeci-kolo1"]
        zpracovani.priprav(u, self.registr)
        self.assertEqual(u["stav"], "selhalo")
        self.assertIn("žádný obor", u["priprava"]["chyba"])

    def test_malo_oboru_proti_webu_je_selhani(self):
        os.environ["LINKA_MIN_PODIL_OBORU"] = "0.5"
        fronta, _ = self.zjisti()
        u = self.ulohy_podle_sady(fronta)["cermat-uchazeci-kolo1"]
        zpracovani.priprav(u, self.registr)
        self.assertEqual(u["stav"], "selhalo")
        self.assertIn("podezřele málo oborů", u["priprava"]["chyba"])

    def test_chybejici_povinny_sloupec_zastavi_zpracovani(self):
        syntetika_uchazecu(self.tmp / "vadny.xlsx", bez_sloupce="c_m_procentni_skor")
        self.server.soubory["/U/PZ2026_uchazeci.xlsx"] = (200, (self.tmp / "vadny.xlsx").read_bytes(), "Wed, 20 May 2026 13:10:56 GMT")
        fronta, _ = self.zjisti()
        u = self.ulohy_podle_sady(fronta)["cermat-uchazeci-kolo1"]
        zpracovani.priprav(u, self.registr)
        self.assertEqual(u["stav"], "selhalo")
        self.assertIn("c_m_procentni_skor", u["priprava"]["chyba"])

    def test_prejmenovany_list_se_ohlasi(self):
        syntetika_uchazecu(self.tmp / "predchozi.xlsx", list_="data")
        self.registr["sady"]["cermat-uchazeci-kolo1"]["zobrazeno"]["soubor"] = str(self.tmp / "predchozi.xlsx")
        fronta, _ = self.zjisti()
        u = self.ulohy_podle_sady(fronta)["cermat-uchazeci-kolo1"]
        zpracovani.priprav(u, self.registr)
        self.assertTrue(any("listy se změnily" in z for z in u["priprava"]["zmeny_struktury"]))

    def test_zmena_poradi_sloupcu_se_ohlasi(self):
        from linka.zpracovani import rozdil_struktury
        stary = {"listy": ["data"], "hlavicka": ["a", "b", "c"]}
        novy = {"listy": ["data"], "hlavicka": ["c", "a", "b"]}
        self.assertTrue(any("pořadí sloupců" in z for z in rozdil_struktury(novy, stary)))

    def test_revize_se_shodnym_otiskem_se_neoznamuje(self):
        import hashlib
        self.registr["sady"]["sada-revize"]["zobrazeno"]["sha256"] = hashlib.sha256(self.revize_xlsx.read_bytes()).hexdigest()
        fronta, _ = self.zjisti()
        u = self.ulohy_podle_sady(fronta)["sada-revize"]
        zpracovani.priprav(u, self.registr)
        self.assertEqual(u["stav"], "bez_zmeny")
        self.assertEqual(komunikace.oznam(fronta, [], nanecisto=True), [])

    def test_poskozeny_soubor_skonci_selhanim_a_oznami_se(self):
        self.server.soubory["/V/PZ2026_vysledky.xlsx"] = (200, b"neni to xlsx", "Sun, 20 Sep 2026 08:00:00 GMT")
        fronta, _ = self.zjisti()
        u = self.ulohy_podle_sady(fronta)["sada-revize"]
        zpracovani.priprav(u, self.registr)
        self.assertEqual(u["stav"], "selhalo")
        kody = komunikace.oznam(fronta, ["telegram"], nanecisto=False)
        self.assertIn(u["kod"], kody)
        self.assertIn("SELHALO", self.server.telegram_odeslano[0]["text"])
        text = self.server.telegram_odeslano[0]["text"]
        self.assertNotIn("Kódy k rozhodnutí", text, "selhanou úlohu nejde schválit")
        self.assertIn("Nic k rozhodnutí", text)

    # ------------------------------------------------------------ oznámení a schválení

    def pripravena_fronta(self):
        fronta, _ = self.zjisti()
        for u in fronta["ulohy"].values():
            zpracovani.priprav(u, self.registr)
        return fronta

    def test_oznameni_dorazi_do_telegramu_s_kody(self):
        fronta = self.pripravena_fronta()
        kody = komunikace.oznam(fronta, ["telegram"], nanecisto=False)
        self.assertEqual(len(kody), 3)
        text = "\n".join(z["text"] for z in self.server.telegram_odeslano)
        self.assertEqual(self.server.telegram_odeslano[0]["chat_id"], "42")
        for k in kody:
            self.assertIn(k, text)
        self.assertIn(f"schvaluji {kody[0]}", text, "návod ukazuje skutečný kód, ne zástupné KÓD")
        self.assertNotIn("KÓD“", text)
        self.assertIn("Zpracování:", text)
        self.assertTrue(all(fronta["ulohy"][k]["stav"] == "oznameno" for k in kody))
        self.assertTrue(list(Path(os.environ["LINKA_OZNAMENI"]).glob("*.txt")))
        self.assertEqual(komunikace.oznam(fronta, ["telegram"], nanecisto=False), [], "znovu se neoznamuje")

    def test_oznameni_nanecisto_neposila_nic(self):
        fronta = self.pripravena_fronta()
        komunikace.oznam(fronta, ["telegram"], nanecisto=True)
        self.assertEqual(self.server.telegram_odeslano, [])

    def zprava(self, chat, text, posun_s, odpoved_na=None):
        cas = int(dt.datetime.now(dt.timezone.utc).timestamp()) + posun_s
        self.posledni_update = getattr(self, "posledni_update", 0) + 1
        zprava = {"chat": {"id": chat}, "date": cas, "text": text}
        if odpoved_na is not None:
            zprava["reply_to_message"] = {"message_id": odpoved_na}
        return {"update_id": self.posledni_update, "message": zprava}

    def test_schvaleni_a_zamitnuti_z_telegramu(self):
        fronta = self.pripravena_fronta()
        komunikace.oznam(fronta, ["telegram"], nanecisto=False)
        u = self.ulohy_podle_sady(fronta)
        uchazeci, revize, zmizela = u["cermat-uchazeci-kolo1"]["kod"], u["sada-revize"]["kod"], u["sada-zmizela"]["kod"]
        self.server.telegram_aktualizace.extend([
            self.zprava(99, f"schvaluji {revize}", 5),                   # cizí odesílatel
            self.zprava(42, f"schvaluji {zmizela}", -3600),              # starší než oznámení
            self.zprava(42, f"Schvaluji {uchazeci.lower()}", 5),         # malá písmena
            self.zprava(42, f"Zamítám {revize}", 6),                     # diakritika
        ])
        zaznam = komunikace.uplatni_rozhodnuti(fronta, komunikace.zpravy_telegramu(), "telegram")
        self.assertEqual(fronta["ulohy"][uchazeci]["stav"], "schvaleno")
        self.assertEqual(fronta["ulohy"][revize]["stav"], "zamitnuto")
        self.assertEqual(fronta["ulohy"][zmizela]["stav"], "oznameno")
        self.assertTrue(any("nemá oprávnění" in z for z in zaznam))
        self.assertTrue(any("starší než oznámení" in z for z in zaznam))

    def test_rozhodnuti_se_potvrdi_do_telegramu_i_do_issue(self):
        fronta = self.pripravena_fronta()
        komunikace.oznam(fronta, ["telegram"], nanecisto=False)
        u = self.ulohy_podle_sady(fronta)["cermat-uchazeci-kolo1"]
        u["issue"] = "https://github.com/test/repo/issues/89"
        self.server.telegram_odeslano.clear()
        self.server.telegram_aktualizace.append(self.zprava(42, f"schvaluji {u['kod']}", 5))
        udalosti = komunikace.zpracuj_zpravy(fronta, komunikace.zpravy_telegramu(), "telegram")
        volani = []
        runner = lambda prikaz, **kw: volani.append(prikaz) or SimpleNamespace(returncode=0, stdout="", stderr="")  # noqa: E731
        chyby = komunikace.potvrd(fronta, udalosti, ["telegram", "github"], nanecisto=False, registr=self.registr, runner=runner)
        self.assertEqual(chyby, [])
        self.assertEqual(len(self.server.telegram_odeslano), 1)
        self.assertIn(f"{u['kod']} schváleno", self.server.telegram_odeslano[0]["text"])
        self.assertIn("pull request", self.server.telegram_odeslano[0]["text"])
        self.assertEqual(volani[0][:4], ["gh", "issue", "comment", "89"])

    def test_zprava_se_zpracuje_jen_jednou(self):
        fronta = self.pripravena_fronta()
        komunikace.oznam(fronta, ["telegram"], nanecisto=False)
        self.server.telegram_aktualizace.append(self.zprava(42, "schvaluji ABCDE", 5))
        prvni = komunikace.zpracuj_zpravy(fronta, komunikace.zpravy_telegramu(), "telegram")
        druhy = komunikace.zpracuj_zpravy(fronta, komunikace.zpravy_telegramu(), "telegram")
        self.assertEqual([e["druh"] for e in prvni], ["neznamy_kod"])
        self.assertEqual(druhy, [], "na tutéž zprávu se neodpovídá při každém běhu")

    def test_stejne_rozhodnuti_ve_druhem_kanalu_je_tiche(self):
        fronta = self.pripravena_fronta()
        komunikace.oznam(fronta, [], nanecisto=False)
        k = self.ulohy_podle_sady(fronta)["cermat-uchazeci-kolo1"]["kod"]
        zprava = lambda i: {"id": f"t:{i}", "od": "1", "povoleny": True, "cas": jadro.ted(), "text": f"schvaluji {k}"}  # noqa: E731
        komunikace.zpracuj_zpravy(fronta, [zprava(1)], "telegram")
        udalosti = komunikace.zpracuj_zpravy(fronta, [zprava(2)], "github")
        self.assertEqual([e["druh"] for e in udalosti], ["uz_rozhodnuto"])
        self.assertEqual(komunikace.potvrd(fronta, udalosti, ["telegram"], nanecisto=False), [])
        self.assertEqual(self.server.telegram_odeslano, [])

    def test_schvaleni_bez_kodu(self):
        fronta = self.pripravena_fronta()
        kody = komunikace.oznam(fronta, ["telegram"], nanecisto=False)
        id_oznameni = fronta["ulohy"][kody[0]]["oznameni"]["telegram_zpravy"][0]
        self.server.telegram_aktualizace.extend([
            self.zprava(42, "Schvaluji kód", 5),                        # tři čekající úlohy: nejasné
            self.zprava(42, "schválil jsem to včera", 6),               # nerozpoznáno
            self.zprava(42, "schvaluji", 7, odpoved_na=id_oznameni),    # odpověď na oznámení
        ])
        udalosti = komunikace.zpracuj_zpravy(fronta, komunikace.zpravy_telegramu(), "telegram")
        druhy = [e["druh"] for e in udalosti]
        self.assertEqual(druhy[:2], ["nejasne", "nerozpoznano"])
        self.assertEqual(sorted(druhy[2:]), ["schvaleno"] * 3)
        komunikace.potvrd(fronta, udalosti, ["telegram"], nanecisto=False)
        text = self.server.telegram_odeslano[-1]["text"]
        self.assertIn("čeká víc úloh", text)
        self.assertIn("nerozuměl", text)

    def test_jedina_cekajici_uloha_se_schvali_bez_kodu_i_komentarem(self):
        fronta = self.pripravena_fronta()
        komunikace.oznam(fronta, [], nanecisto=False)
        u = self.ulohy_podle_sady(fronta)
        uchazeci, revize = u["cermat-uchazeci-kolo1"], u["sada-revize"]
        zprava = {"id": "g:1", "od": "tangero", "povoleny": True, "cas": jadro.ted(), "text": "Schvaluji.", "uloha": revize["kod"], "issue": "7"}
        self.assertEqual([e["druh"] for e in komunikace.zpracuj_zpravy(fronta, [zprava], "github")], ["schvaleno"])
        self.assertEqual(uchazeci["stav"], "oznameno", "komentář v issue platí jen pro jeho úlohu")
        u["sada-zmizela"]["stav"] = "zamitnuto"
        zprava = {"id": "t:1", "od": "42", "povoleny": True, "cas": jadro.ted(), "text": "zamítám"}
        self.assertEqual([e["druh"] for e in komunikace.zpracuj_zpravy(fronta, [zprava], "telegram")], ["zamitnuto"])
        self.assertEqual(uchazeci["stav"], "zamitnuto")

    # ------------------------------------------------------------ předání

    def schvalena_uloha_uchazecu(self):
        fronta = self.pripravena_fronta()
        komunikace.oznam(fronta, [], nanecisto=False)
        u = self.ulohy_podle_sady(fronta)["cermat-uchazeci-kolo1"]
        komunikace.uplatni_rozhodnuti(fronta, [{"od": "test", "povoleny": True, "cas": jadro.ted(), "text": f"schvaluji {u['kod']}"}], "test")
        return fronta, u

    def test_znovu_otevrena_uloha_ceka_na_nove_schvaleni(self):
        fronta, _ = self.zjisti()
        u = self.ulohy_podle_sady(fronta)["cermat-uchazeci-kolo1"]
        u["priprava"] = {"souhrn": "staré"}
        u["oznameni"] = {"cas": "2026-09-13T09:00:00+00:00", "kanaly": ["soubor"]}
        u["rozhodnuti"] = {"cas": "2026-09-13T10:00:00+00:00", "rozhodnuti": "schvaleno"}
        jadro.zmen_stav(u, "predano")
        with self.assertRaises(ValueError):
            jadro.znovu_otevri(u, " ")
        jadro.znovu_otevri(u, "sada dostala zpracovatele")
        self.assertEqual(u["stav"], "zjisteno")
        self.assertNotIn("priprava", u)
        self.assertEqual(u["predchozi_kola"][0]["stav"], "predano")
        # Staré schválení nové oznámení nepotvrdí.
        u["oznameni"] = {"cas": "2026-09-14T08:00:00+00:00", "kanaly": ["soubor"]}
        jadro.zmen_stav(u, "oznameno")
        zprava = {"od": "1", "povoleny": True, "cas": "2026-09-13T10:00:00+00:00", "text": f"schvaluji {u['kod']}"}
        komunikace.uplatni_rozhodnuti(fronta, [zprava], "telegram")
        self.assertEqual(u["stav"], "oznameno")
        with self.assertRaises(ValueError):
            jadro.znovu_otevri(u, "nelze, čeká na rozhodnutí")

    def test_predani_vyzaduje_schvaleni(self):
        fronta = self.pripravena_fronta()
        u = self.ulohy_podle_sady(fronta)["cermat-uchazeci-kolo1"]
        with self.assertRaises(RuntimeError):
            predani.predej(u, self.registr, nanecisto=True)

    def test_predani_nanecisto_nevola_git(self):
        _, u = self.schvalena_uloha_uchazecu()

        def zakazany_runner(*a, **kw):
            raise AssertionError("nanečisto se nesmí nic spouštět")

        vysledek = predani.predej(u, self.registr, nanecisto=True, runner=zakazany_runner)
        self.assertEqual(u["stav"], "schvaleno")
        self.assertTrue(vysledek["plan"]["vetev"].startswith("data/cermat-uchazeci-kolo1-2026-"))
        self.assertIn(["gh", "pr", "create", "--base", "main", "--head", vysledek["plan"]["vetev"], "--title", vysledek["plan"]["nadpis"], "--body", "…"], vysledek["prikazy"])

    def test_predani_s_falesnym_gitem(self):
        _, u = self.schvalena_uloha_uchazecu()
        volani = []

        def runner(prikaz, **kw):
            volani.append(prikaz)
            vystup = "https://github.com/test/pr/1" if prikaz[:3] == ["gh", "pr", "create"] else ""
            return SimpleNamespace(returncode=0, stdout=vystup, stderr="")

        vysledek = predani.predej(u, self.registr, nanecisto=False, runner=runner)
        self.assertEqual(u["stav"], "predano")
        self.assertEqual(vysledek["pull_request"], "https://github.com/test/pr/1")
        self.assertEqual([v[:2] for v in volani][:2], [["git", "fetch"], ["git", "worktree"]])
        self.assertIn("push", volani[4])

    def test_predani_odmitne_zmeneny_zdroj(self):
        _, u = self.schvalena_uloha_uchazecu()
        for zdroj in u["priprava"]["zpracovani"]["predani"]:
            Path(zdroj).unlink()
        syntetika_uchazecu(self.tmp / "jiny.xlsx", list_="jiny")
        self.server.soubory["/U/PZ2026_uchazeci.xlsx"] = (200, (self.tmp / "jiny.xlsx").read_bytes(), "Thu, 21 May 2026 10:00:00 GMT")
        runner = lambda *a, **kw: SimpleNamespace(returncode=0, stdout="", stderr="")  # noqa: E731
        with self.assertRaisesRegex(RuntimeError, "zdroj se od schválení změnil"):
            predani.predej(u, self.registr, nanecisto=False, runner=runner)
        self.assertEqual(u["stav"], "schvaleno")

    def test_nepodporovana_sada_se_preda_bez_souboru(self):
        fronta = self.pripravena_fronta()
        komunikace.oznam(fronta, [], nanecisto=False)
        u = self.ulohy_podle_sady(fronta)["sada-zmizela"]
        komunikace.uplatni_rozhodnuti(fronta, [{"od": "t", "povoleny": True, "cas": jadro.ted(), "text": f"schvaluji {u['kod']}"}], "test")
        vysledek = predani.predej(u, self.registr, nanecisto=False, runner=lambda *a, **kw: self.fail("bez gitu"))
        self.assertEqual(u["stav"], "predano")
        self.assertIn("Ručně ověřit", vysledek["poznamka"])

    def test_prikazova_radka_predani_hlasi_vysledek_i_chybu_jednou(self):
        fronta, u = self.schvalena_uloha_uchazecu()
        u["issue"] = "https://github.com/test/repo/issues/89"
        jadro.uloz_frontu(fronta)
        prikaz = [sys.executable, str(KOREN / "scripts/datova-linka.py"), "predej", "--vse-schvalene", "--kanal", "telegram"]
        # Git v testu neexistuje jako repozitář s origin: předání selže, fronta se přesto uloží.
        env = {**os.environ, "LINKA_KOREN": str(self.tmp)}
        for _ in range(2):
            r = subprocess.run(prikaz, capture_output=True, text=True, env=env)
            self.assertNotEqual(r.returncode, 0)
        ulozena = jadro.nacti_frontu()["ulohy"][u["kod"]]
        self.assertEqual(ulozena["stav"], "schvaleno")
        self.assertIn("predani_chyba", ulozena)
        hlaseni = [z["text"] for z in self.server.telegram_odeslano if "předání selhalo" in z["text"]]
        self.assertEqual(len(hlaseni), 1, "stejná chyba se hlásí jen jednou")

    # ------------------------------------------------------------ příkazová řádka

    def test_prikazova_radka_cely_beh_nanecisto(self):
        r = subprocess.run([sys.executable, str(KOREN / "scripts/datova-linka.py"), "--nanecisto", "beh", "--kanal", "telegram"],
                           capture_output=True, text=True, env=os.environ)
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertIn("zjištění: 3 nových úloh", r.stdout)
        self.assertIn("[nanečisto] Telegram by dostal", r.stdout)
        self.assertEqual(self.server.telegram_odeslano, [])
        self.assertFalse(Path(os.environ["LINKA_FRONTA"]).exists(), "nanečisto se fronta neukládá")


if __name__ == "__main__":
    unittest.main()
