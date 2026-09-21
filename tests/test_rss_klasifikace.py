"""Regresní testy klasifikace školních RSS novinek (scripts/rss-klasifikace-mereni.py).

Syntetické případy pocházejí z oponentur návrhu školních novinek
(docs/oponentura-skolske-novinky-rss-2027-v1.1.md, oddíl 2 a R2/R3) a hlídají,
že pravidla oddělují téma od významu sdělení:

* „Volná místa nemáme" nesmí tvrdit dostupnost (negace → žádná jistota),
* DOD cizího pořadatele nesmí na vysokou jistotu,
* „náhradní termín" bez přijímacího kontextu nesmí na vysokou jistotu,
* neexistující datum (31. 2.) se nesmí vydávat za platný termín,
* přijímačky na VŠ v narativním článku se vylučují,
* tolerantní parser zvládne whitespace před <?xml, &nbsp; i holé &.

Čtvrtá oponentura (F1–F3, F5) přidala případy pro celé publikační rozhodnutí:
stav sdělení po klauzulích (zrušení, jeho popření, zrušená registrace), role data
z kontextu před popiskem i za ním a vylučovače, které nesmí potlačit zprávu
s jednoznačným přijímacím kontextem.
"""

from __future__ import annotations

import importlib.util
import unittest
from datetime import date
from pathlib import Path

KOREN = Path(__file__).resolve().parent.parent
_spec = importlib.util.spec_from_file_location("mereni", KOREN / "scripts" / "rss-klasifikace-mereni.py")
m = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(m)


def polozka(titulek: str, popis: str = "", kategorie: list[str] | None = None) -> dict:
    return {"titulek": titulek, "popis": popis, "kategorie": kategorie or []}


class TestJistota(unittest.TestCase):
    def jistota(self, titulek: str, popis: str = "", trida: str | None = None) -> str | None:
        p = polozka(titulek, popis)
        tridy, _ = m.klasifikuj_temu(p)
        if trida is None:
            trida = tridy[0] if tridy else None
        return m.rozhodni_jistotu(p, trida) if trida else None

    def test_negace_volnych_mist_netvrdi_dostupnost(self):
        p = polozka("Volná místa pro žáky do 1. ročníků nemáme")
        tridy, _ = m.klasifikuj_temu(p)
        self.assertIn("volna_mista", tridy)  # téma poznáme
        self.assertEqual(m.rozhodni_jistotu(p, "volna_mista"), "zadna")  # ale netvrdíme dostupnost

    def test_dod_ciziho_pooradatele_neni_vysoka(self):
        self.assertEqual(self.jistota("Den otevřených dveří krajského úřadu"), "stredni")
        self.assertEqual(self.jistota("Společnost SSI Schäfer slaví 30 let",
                                      "Zveme na firemní den otevřených dveří"), "stredni")
        self.assertEqual(self.jistota("Den zemědělky 2025",
                                      "Školský statek pořádá den otevřených dveří"), "stredni")

    def test_dod_s_kontextem_uchazece_je_vysoka(self):
        self.assertEqual(self.jistota("Den otevřených dveří – 1. 10. 2026",
                                      "Zveme uchazeče a jejich rodiče na prohlídku školy"), "vysoka")

    def test_nahradni_termin_bez_kontextu_neni_vysoka(self):
        self.assertEqual(self.jistota("Náhradní termín fotografování"), "stredni")
        self.assertEqual(self.jistota("Náhradní termín jednotné přijímací zkoušky"), "vysoka")

    def test_vs_kontext_se_vylouci(self):
        self.assertEqual(self.jistota("Geologická olympiáda",
                                      "Vítězové mají odpustěny přijímací zkoušky na PřF MUNI"), "zadna")

    def test_vysledky_a_kola_jsou_vysoka(self):
        self.assertEqual(self.jistota("Výsledky 2. kola přijímacího řízení"), "vysoka")
        self.assertEqual(self.jistota("Vyhlašujeme 3. kolo přijímacího řízení"), "vysoka")

    def test_talentovky_zus_nejsou_vysoka(self):
        self.assertEqual(self.jistota("Talentové zkoušky na ZUŠ"), "stredni")
        self.assertEqual(self.jistota("Talentové zkoušky pro uchazeče o obor konzervatoře"), "vysoka")

    def test_vos_neni_obsah_pro_ss(self):
        # přijímání na vyšší odbornou školu nesmí na kartu/e-mail pro uchazeče o SŠ (N1)
        self.assertEqual(self.jistota("Vyhlášení výsledků 2. kola PŘ na VOŠ"), "zadna")
        self.assertEqual(self.jistota("Přijímací řízení VOŠ – Kritéria pro 3. kolo"), "zadna")
        self.assertEqual(self.jistota("Vyšší odborná škola zdravotnická – přijímací řízení"), "zadna")

    def test_zruseni_dod_nepozve(self):
        p = polozka("Den otevřených dveří pro uchazeče 9. 12. 2026 se ruší")
        tridy, _ = m.klasifikuj_temu(p)
        self.assertIn("dod", tridy)
        self.assertEqual(m.urci_stav(p), "zruseno")  # stav poznáme → karta nesmí pozvat

    def test_negace_volnych_mist_obracene(self):
        p = polozka("Volná místa pro uchazeče již nejsou")
        self.assertEqual(m.rozhodni_jistotu(p, "volna_mista"), "zadna")

    def test_vysledkova_listina_turnaje_neni_prijmacka(self):
        p = polozka("Výsledková listina školního turnaje")
        tridy, _ = m.klasifikuj_temu(p)
        self.assertNotIn("vysledky_prijm", tridy)

    def test_kategorie_nejsou_spoustec(self):
        # WP kategorie „Přijímací řízení" nalepená na harmonogram roku nesmí stačit k hitu
        p = polozka("Harmonogram školního roku 2026/2027", "", ["Přijímací řízení"])
        tridy, _ = m.klasifikuj_temu(p)
        self.assertEqual(tridy, [])


class TestDatumAkce(unittest.TestCase):
    def test_neexistujici_datum_se_zahodi(self):
        out = m.extrahuj_data_akce("Den otevřených dveří 31. 2. 2027")
        self.assertNotIn("2027-02-31", out["s_rokem"])
        self.assertEqual(out["s_rokem"], [])

    def test_platna_data_s_rokem_i_bez(self):
        out = m.extrahuj_data_akce("DOD 9. 12. 2026, další termíny 7. 1. a 9. 2. 2027")
        self.assertIn("2026-12-09", out["s_rokem"])
        self.assertIn("2027-02-09", out["s_rokem"])
        self.assertIn("01-07", out["bez_roku"])

    def test_mesic_slovy_s_rokem(self):
        out = m.extrahuj_data_akce("Den otevřených dveří 9. prosince 2026")
        self.assertEqual(out["s_rokem"], ["2026-12-09"])
        self.assertEqual(out["bez_roku"], [])  # s rokem se v bez_roku neopakuje

    def test_registrace_neni_akce(self):
        out = m.extrahuj_data_akce("Registrace do 1. 12. 2026. Den otevřených dveří 9. 12. 2026.")
        self.assertEqual(out["registrace"], ["2026-12-01"])
        self.assertEqual(out["s_rokem"], ["2026-12-09"])


class TestParseDatum(unittest.TestCase):
    def test_iso_zachova_cas_i_pasmo(self):
        d = m.parse_datum("2026-09-19T18:45:00+02:00")
        self.assertEqual(d.hour, 18)
        self.assertEqual(d.utcoffset().total_seconds(), 7200)

    def test_neplatne_iso_vrati_none(self):
        self.assertIsNone(m.parse_datum("2026-02-31"))  # výjimka izolovaná na položku


class TestTolerantniParser(unittest.TestCase):
    RSS = '<?xml version="1.0"?><rss version="2.0"><channel><title>S</title>' \
          '<item><title>Novinka</title><link>http://x.cz/1</link><pubDate>Thu, 17 Sep 2026 07:30:21 +0000</pubDate></item>' \
          '</channel></rss>'

    def test_platny_feed(self):
        self.assertEqual(len(m.parse_feed(self.RSS)), 1)

    def test_whitespace_pred_xml(self):
        self.assertEqual(len(m.parse_feed(" \n\n" + self.RSS)), 1)

    def test_html_entity(self):
        feed = self.RSS.replace("Novinka", "A&nbsp;B&nbsp;C")
        self.assertEqual(len(m.parse_feed(feed)), 1)

    def test_holy_ampersand(self):
        feed = self.RSS.replace("Novinka", "Halada Trio & Selina")
        self.assertEqual(len(m.parse_feed(feed)), 1)

    def test_escapovany_ampersand_zustane(self):
        # korektní &amp; parser správně dekóduje na &, hlavně nesmí spadnout parsování
        feed = self.RSS.replace("Novinka", "A &amp; B")
        items = m.parse_feed(feed)
        self.assertEqual(items[0]["titulek"], "A & B")

    def test_opravna_vetev_nechá_xml_entity(self):
        # N5: feed s &lt; i &nbsp; – opravná větev nesmí dekódovat platné XML entity
        feed = " \n" + self.RSS.replace("Novinka", "A &lt; B &nbsp; C")
        items = m.parse_feed(feed)
        self.assertIsNotNone(items)
        self.assertEqual(items[0]["titulek"], "A < B   C")

    def test_html_stranka_neni_prazdny_feed(self):
        # N5: dobře formovaná HTML přihlašovací stránka ≠ úspěšně načtený prázdný feed
        self.assertIsNone(m.parse_feed("<html><body>Přihlaste se</body></html>"))




class TestStavSdeleni(unittest.TestCase):
    """F1: stav se rozhoduje po klauzulích, ne přítomností jednoho slova v textu."""

    def stav(self, titulek: str, popis: str = "") -> str:
        return m.urci_stav(polozka(titulek, popis))

    def test_nekona_se_je_zruseni(self):
        self.assertEqual(self.stav("DOD pro uchazeče 9. 12. 2026 se nekoná"), "zruseno")
        self.assertEqual(self.stav("Den otevřených dveří pro uchazeče 9. 12. 2026 se ruší"), "zruseno")

    def test_popreni_zruseni_neni_zruseni(self):
        # „není zrušen" je popření zrušení – ani zrušení, ani potvrzená pozvánka
        self.assertEqual(self.stav("Den otevřených dveří pro uchazeče 9. 12. 2026 není zrušen"),
                         "nejiste")

    def test_zrusena_registrace_nerusi_akci(self):
        self.assertEqual(self.stav("DOD pro uchazeče: registrace zrušena, akce 9. 12. 2026 proběhne"),
                         "nejiste")
        self.assertEqual(self.stav("Registrace na DOD zrušena"), "nejiste")

    def test_pouceni_o_odvolani_neni_zruseni(self):
        # skutečná položka vzorku (600024016): výsledky PŘ s poučením o odvolání
        self.assertEqual(self.stav("Výsledky přijímacího řízení do maturitních oborů",
                                   "Podnikání (výsledky 2. kola) Poučení o odvolání"), "oznameno")

    def test_pozvanka_s_konanim_je_oznameno(self):
        self.assertEqual(self.stav("Zveme uchazeče na den otevřených dveří 9. 12. 2026"), "oznameno")


class TestRoleData(unittest.TestCase):
    """F2: roli data určuje jeho vlastní klauzule, tedy i popisek za datem."""

    def test_datum_pred_popiskem_se_neprohodi(self):
        out = m.extrahuj_data_akce("9. 12. 2026 – konec registrace; 12. 12. 2026 – den otevřených dveří")
        self.assertEqual(out["registrace"], ["2026-12-09"])
        self.assertEqual(out["s_rokem"], ["2026-12-12"])

    def test_registrace_se_nededi_na_dalsi_datum(self):
        out = m.extrahuj_data_akce("Registrace spuštěny. Termín 1. 3. 2027.")
        self.assertNotIn("2027-03-01", out["registrace"])

    def test_nejednoznacna_role_nejde_na_kartu(self):
        out = m.extrahuj_data_akce("Registrace na den otevřených dveří do 1. 12. 2026")
        self.assertEqual(out["s_rokem"], [])
        self.assertIn("2026-12-01", out["neurcena"])

    def test_totez_datum_dvakrat_ziska_silnejsi_roli(self):
        # titulek datum jen jmenuje, věta v popisu doloží konání
        out = m.extrahuj_data_akce("Den otevřených dveří – 1. 10. 2026 registrace spuštěny. "
                                   "Přijďte na termín, který proběhne ve čtvrtek 1. 10. 2026.")
        self.assertEqual(out["s_rokem"], ["2026-10-01"])


class TestVylucovace(unittest.TestCase):
    """F3: vylučovač nesmí potlačit zprávu s jednoznačným přijímacím kontextem."""

    def test_sportovni_gymnazium_zustava_prijimackou(self):
        p = polozka("Výsledky přijímacího řízení na sportovní gymnázium")
        tridy, _ = m.klasifikuj_temu(p)
        self.assertIn("vysledky_prijm", tridy)
        self.assertEqual(m.rozhodni_jistotu(p, "vysledky_prijm"), "vysoka")

    def test_turnaj_bez_prijimaciho_kontextu_se_vylouci(self):
        tridy, vylouceno = m.klasifikuj_temu(polozka("Výsledková listina školního turnaje"))
        self.assertNotIn("vysledky_prijm", tridy)
        self.assertIn("vysledky_prijm", vylouceno)

    def test_smisena_ss_a_vos_zprava_nezmizi(self):
        # společná zpráva SŠ i VOŠ: na kartu ne, ale ani mimo neutrální seznam
        p = polozka("Den otevřených dveří pro uchazeče SŠ a VOŠ 9. 12. 2026")
        tridy, _ = m.klasifikuj_temu(p)
        self.assertIn("dod", tridy)
        self.assertEqual(m.rozhodni_jistotu(p, "dod"), "stredni")

    def test_samotna_vos_na_kartu_nesmi(self):
        self.assertEqual(m.rozhodni_jistotu(polozka("Přijímací řízení VOŠ – kritéria"),
                                            "prijimaci_rizeni"), "zadna")


class TestPublikacniRozhodnuti(unittest.TestCase):
    """F5: testuje se celé rozhodnutí až po to, co uvidí čtenář, ne mezikrok."""

    def zobrazeni(self, titulek: str, popis: str = "") -> dict:
        return m.rozhodni_publikaci(polozka(titulek, popis))

    def test_pozvanka_je_karta_ale_datum_netvrdi(self):
        v = self.zobrazeni("Zveme uchazeče na den otevřených dveří 9. 12. 2026")
        self.assertEqual(v["zobrazeni"], "karta")
        # Termín se dál čte, ale jen pro platnost a řazení – ven nejde.
        self.assertEqual(v["terminy"], ["2026-12-09"])

    def test_pozvanka_bez_citelneho_terminu_zustane_kartou(self):
        # Datum v článku být může; že ho neumíme přečíst, není důvod zprávu
        # schovat mezi ostatní – čtenář si ho přečte u školy.
        v = self.zobrazeni("Zveme uchazeče na den otevřených dveří",
                           "Termín najdete v pozvánce na našem webu.")
        self.assertEqual(v["zobrazeni"], "karta")
        self.assertEqual(v["terminy"], [])

    def test_zrusena_akce_nevytvori_pozvanku(self):
        v = self.zobrazeni("DOD pro uchazeče 9. 12. 2026 se nekoná")
        self.assertEqual(v["zobrazeni"], "odkaz")
        self.assertFalse(v["email"])

    def test_popreno_zruseni_nevytvori_pozvanku(self):
        v = self.zobrazeni("Den otevřených dveří pro uchazeče 9. 12. 2026 není zrušen")
        self.assertEqual(v["zobrazeni"], "odkaz")

    def test_zrusena_registrace_nevytvori_pozvanku(self):
        v = self.zobrazeni("DOD pro uchazeče: registrace zrušena, akce 9. 12. 2026 proběhne")
        self.assertEqual(v["zobrazeni"], "odkaz")

    def test_datum_registrace_se_nestane_terminem_akce(self):
        v = self.zobrazeni("Den otevřených dveří pro uchazeče",
                           "9. 12. 2026 – konec registrace; 12. 12. 2026 – den otevřených dveří")
        self.assertEqual(v["terminy"], ["2026-12-12"])

    def test_zruseni_jednoho_terminu_nezrusi_ostatni(self):
        # celkový stav článku nesmí zrušit termíny, které text neruší
        out = m.extrahuj_data_akce("Den otevřených dveří 9. 12. 2026 se nekoná. "
                                   "Náhradní prohlídka proběhne 13. 1. 2027.")
        self.assertEqual(out["podrobne"]["2026-12-09"]["stav_klauzule"], "zruseno")
        self.assertEqual(out["podrobne"]["2027-01-13"]["stav_klauzule"], "kona")

    def test_vysledky_jsou_karta_bez_odvozeneho_terminu(self):
        v = self.zobrazeni("Výsledky 2. kola přijímacího řízení")
        self.assertEqual(v["zobrazeni"], "karta")
        self.assertEqual(v["terminy"], [])

    def test_stredni_jistota_konci_u_odkazu(self):
        v = self.zobrazeni("Přihlášky ke stažení")
        self.assertEqual(v["zobrazeni"], "odkaz")
        self.assertFalse(v["email"])

    def test_prijimacky_nanecisto_jsou_karta(self):
        v = self.zobrazeni("Přijímačky nanečisto pro uchazeče 5. 11. 2026")
        self.assertIn("prijimacky_nanecisto", v["tridy"])
        self.assertEqual(v["zobrazeni"], "karta")

    def test_maturita_nanecisto_neni_akce_pro_uchazece(self):
        # Generálka pro vlastní čtvrťáky, ne pozvánka pro uchazeče.
        v = self.zobrazeni("Maturita nanečisto pro čtvrťáky")
        self.assertNotIn("prijimacky_nanecisto", v["tridy"])

    def test_cvicny_jazykovy_certifikat_neni_prijimacky_nanecisto(self):
        # Gymnázium Příbram: „Cvičné testy B2 First a C1 Advanced" jsou
        # jazykový certifikát pro vlastní žáky, ne zkoušky nanečisto.
        v = self.zobrazeni("Certifikáty ANJ (cvičný test): termín & přihlašování",
                           "Cvičné testy B2 First a C1 Advanced se konají 2. 10.")
        self.assertNotIn("prijimacky_nanecisto", v["tridy"])

    def test_pripravny_kurz_je_vlastni_trida(self):
        v = self.zobrazeni("Přípravné kurzy na SŠ",
                           "Škola pořádá přípravné kurzy k přijímacím zkouškám na SŠ.")
        self.assertIn("pripravny_kurz", v["tridy"])
        self.assertNotIn("setkani_uchazecu", v["tridy"])
        self.assertEqual(v["zobrazeni"], "karta")

    def test_lyzarsky_kurz_neni_pripravny_kurz(self):
        v = self.zobrazeni("Lyžařský kurz pro sekundu")
        self.assertNotIn("pripravny_kurz", v["tridy"])

    def test_setkani_s_uchazeci_je_karta(self):
        v = self.zobrazeni("Setkání s uchazeči o studium 10. 12. 2026")
        self.assertIn("setkani_uchazecu", v["tridy"])
        self.assertEqual(v["zobrazeni"], "karta")

    def test_tridni_schuzky_nejsou_setkani_s_uchazeci(self):
        v = self.zobrazeni("Třídní schůzky 12. 11. 2026")
        self.assertEqual(v["zobrazeni"], "seznam")

    def test_talentove_zkousky_zatim_nejdou_emailem(self):
        v = self.zobrazeni("Talentové zkoušky pro uchazeče o obor konzervatoře 15. 1. 2027",
                           "Zveme uchazeče, zkoušky se konají 15. 1. 2027.")
        self.assertEqual(v["zobrazeni"], "karta")
        self.assertFalse(v["email"])  # třída bez přejímacího benchmarku


class TestVadyPateOponentury(unittest.TestCase):
    """H1: tři případy, kdy karta tvrdila rodičům něco, co v textu nestojí."""

    def rozhodnuti(self, titulek: str, popis: str = "", dnes: str = "2026-09-20") -> dict:
        return m.rozhodni_publikaci(polozka(titulek, popis),
                                    m.parse_datum("Mon, 01 Sep 2025 00:00:00 +0000"),
                                    date.fromisoformat(dnes))

    def test_nepotvrzeny_termin_nevytvori_kartu(self):
        v = self.rozhodnuti("Termín DOD pro uchazeče 9. 12. 2026 zatím není potvrzen")
        self.assertEqual(v["zobrazeni"], "odkaz")
        self.assertFalse(v["email"])

    def test_datum_ciziho_deje_se_neprevezme(self):
        v = self.rozhodnuti("Zveme uchazeče na den otevřených dveří 9. 12. 2026.",
                            "Zveme uchazeče na den otevřených dveří 9. 12. 2026."
                            " Soutěž začne 12. 12. 2026.")
        self.assertEqual(v["terminy"], ["2026-12-09"])

    def test_probehly_termin_neni_pozvanka(self):
        v = self.rozhodnuti("Zveme uchazeče na den otevřených dveří 9. 12. 2025.")
        self.assertEqual(v["zobrazeni"], "odkaz")
        self.assertFalse(v["email"])

    def test_dalsi_terminy_teze_akce_zustavaji(self):
        v = self.rozhodnuti("Pozvánka na Dny otevřených dveří pro uchazeče",
                            "Navštivte nás v sobotu 7. listopadu 2026 od 8:00,"
                            " ve středu 9. prosince 2026 od 14:00"
                            " a ve středu 13. ledna 2027 od 14:00.")
        self.assertEqual(v["terminy"], ["2026-11-07", "2026-12-09", "2027-01-13"])

    def test_smisena_zprava_konci_konzervativnim_odkazem(self):
        """P2: zrušený i náhradní termín v jednom článku → odkaz, ne karta.

        Zvolené chování, ne opomenutí: u smíšené zprávy se raději nezobrazí
        žádný odvozený termín, než aby karta tvrdila jeden ze dvou protichůdných.
        Testuje se konečná funkce, ne pomocný extraktor."""
        v = self.rozhodnuti("DOD pro uchazeče",
                            "Den otevřených dveří 9. 12. 2026 se nekoná."
                            " Náhradní prohlídka proběhne 13. 1. 2027.")
        self.assertEqual(v["zobrazeni"], "odkaz")
        self.assertEqual(v["terminy"], [])
        self.assertFalse(v["email"])


if __name__ == "__main__":
    unittest.main()
