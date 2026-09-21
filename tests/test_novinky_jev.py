"""Rozhodovací model nad školními novinkami: co smí ovlivnit a co ne.

Testy **nesahají na síť**. Odpovědi modelu se podstrkují do mezipaměti, takže se
tu měří naše pravidla kolem modelu, ne model sám. Přesnost modelu měří
``scripts/rss-klasifikace-mereni.py`` proti ruční referenci.
"""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

import novinky_jev as jev  # noqa: E402
from novinky_klasifikace import (formatuj_datum, najdi_cas, pozice_dat,  # noqa: E402
                                 slozeni_souhrnu, text_k_rozboru)


def odpoved(**volby):
    """Odpověď modelu v tom tvaru, v jakém ji API vrací."""
    out = {}
    for k, v in volby.items():
        if isinstance(v, tuple):
            out[k] = {"type": "choice", "choice": v[0], "confidence": v[1]}
        else:
            out[k] = {"type": "noul", "noul": v}
    return out


class SkladaniVety(unittest.TestCase):
    def test_vetu_sklada_kod_ze_sablony(self):
        veta = slozeni_souhrnu("dod", [{"datum": "2026-10-23", "cas": "17:00"},
                                       {"datum": "2027-01-13", "cas": "17:00"}])
        self.assertEqual(veta, "Škola pořádá dny otevřených dveří "
                               "23. 10. 2026 a 13. 1. 2027 od 17:00.")

    def test_jeden_termin_ma_jednotne_cislo(self):
        self.assertEqual(slozeni_souhrnu("dod", [{"datum": "2026-10-23", "cas": None}]),
                         "Škola pořádá den otevřených dveří 23. 10. 2026.")

    def test_ruzne_casy_se_nevytykaji_pred_zavorku(self):
        # „5. 1. a 6. 1. od 8:00" by tvrdilo společný začátek, který škola neuvedla.
        veta = slozeni_souhrnu("talentove_zkousky", [{"datum": "2027-01-05", "cas": "8:00"},
                                                     {"datum": "2027-01-06", "cas": "9:30"}])
        self.assertEqual(veta, "Talentové zkoušky se konají 5. 1. 2027 od 8:00 "
                               "a 6. 1. 2027 od 9:30.")

    def test_bez_terminu_neni_co_slozit(self):
        self.assertIsNone(slozeni_souhrnu("dod", []))

    def test_trida_bez_sablony_vetu_nedostane(self):
        # Kritéria přijetí nejsou akce; věta „Škola pořádá kritéria" nedává smysl.
        self.assertIsNone(slozeni_souhrnu("kriteria", [{"datum": "2027-01-05", "cas": None}]))

    def test_datum_se_pise_cesky_bez_nul(self):
        self.assertEqual(formatuj_datum("2027-01-05"), "5. 1. 2027")


class CasVKlauzuli(unittest.TestCase):
    def test_cas_se_najde(self):
        self.assertEqual(najdi_cas("zveme vas 23. 10. 2026 od 17:00 do 20:00"), "17:00")

    def test_datum_neni_cas(self):
        # „9. 12." má tečku jako „17.00", ale měsíc není dvouciferné minuty.
        self.assertIsNone(najdi_cas("den otevrenych dveri 9. 12. 2026"))

    def test_bez_casu_se_nic_nevymysli(self):
        self.assertIsNone(najdi_cas("den otevrenych dveri v prosinci"))


class SestaveniOtazek(unittest.TestCase):
    def test_kazde_datum_dostane_vlastni_otazku_se_jmenem_data(self):
        # Jedna věta nese i několik dat; bez jmenovitého určení by model dostal
        # dvě stejné otázky a nešlo by poznat, ke kterému datu odpověděl.
        pol = {"titulek": "Dny otevřených dveří",
               "popis": "Zveme vás 9. 12. 2026 od 17:00 a 7. 1. 2027."}
        text = text_k_rozboru(pol)
        otazky = jev.postav_otazky(text, ["dod"], pozice_dat(text))
        self.assertIn("9. 12. 2026", otazky["datum_1"]["instructions"])
        self.assertIn("7. 1. 2027", otazky["datum_2"]["instructions"])

    def test_titulek_se_neslepi_s_popisem(self):
        # Titulek bez interpunkce by se slil s první větou a otázka na roli data
        # by se ptala nad odstavcem místo nad větou.
        self.assertEqual(text_k_rozboru({"titulek": "Dny otevřených dveří 26-27",
                                         "popis": "Zveme vás."}),
                         "Dny otevřených dveří 26-27. Zveme vás.")

    def test_datum_bez_roku_se_modelu_nepredklada(self):
        # Rok se nedohaduje: „7. ledna" může být letos i napřesrok.
        self.assertEqual(pozice_dat("Den otevřených dveří 7. ledna."), [])


class SlouceniSPravidly(unittest.TestCase):
    def test_vypadek_modelu_nechava_pravidla_beze_zmeny(self):
        # None = „model neodpověděl", ne „model nic nenašel".
        pol = {"tridy": ["dod"], "jistota": {"dod": "vysoka"}, "stav": "oznameno"}
        self.assertEqual(jev.slouc_s_pravidly(pol, None), {})

    def test_model_smi_tridu_pridat(self):
        # Mlčení pravidel je mezera v klíčových slovech, ne zjištění.
        pol = {"tridy": [], "jistota": {}, "stav": "oznameno"}
        v = jev.slouc_s_pravidly(pol, {"tema": "setkani_uchazecu", "pro_uchazece": True,
                                       "stav": "oznameno", "terminy": [], "lhuty": []})
        self.assertEqual(v["tridy"], ["setkani_uchazecu"])
        self.assertEqual(v["jistota"]["setkani_uchazecu"], "stredni")

    def test_mlceni_modelu_tridu_pravidel_nesmaze(self):
        # Podmínka 2 z P6: záporná odpověď modelu nic nepotlačuje.
        pol = {"tridy": ["dod"], "jistota": {"dod": "vysoka"}, "stav": "oznameno"}
        v = jev.slouc_s_pravidly(pol, {"tema": None, "pro_uchazece": None,
                                       "stav": None, "terminy": [], "lhuty": []})
        self.assertEqual(v["tridy"], ["dod"])
        self.assertEqual(v["jistota"]["dod"], "vysoka")

    def test_cizi_cilova_skupina_snizi_kartu_ale_zpravu_neskryje(self):
        pol = {"tridy": ["dod"], "jistota": {"dod": "vysoka"}, "stav": "oznameno"}
        v = jev.slouc_s_pravidly(pol, {"tema": "dod", "pro_uchazece": False,
                                       "stav": "oznameno", "terminy": [], "lhuty": []})
        self.assertEqual(v["tridy"], ["dod"])
        self.assertEqual(v["jistota"]["dod"], "stredni")

    def test_zruseni_nalezene_modelem_se_projevi(self):
        pol = {"tridy": ["dod"], "jistota": {"dod": "vysoka"}, "stav": "oznameno"}
        v = jev.slouc_s_pravidly(pol, {"tema": "dod", "pro_uchazece": True,
                                       "stav": "zruseno", "terminy": [], "lhuty": []})
        self.assertEqual(v["stav"], "zruseno")

    def test_model_nesmi_prebit_zruseni_nalezene_pravidly(self):
        pol = {"tridy": ["dod"], "jistota": {"dod": "vysoka"}, "stav": "zruseno"}
        v = jev.slouc_s_pravidly(pol, {"tema": "dod", "pro_uchazece": True,
                                       "stav": "oznameno", "terminy": [], "lhuty": []})
        self.assertNotIn("stav", v)


class PrahyOdpovedi(unittest.TestCase):
    def test_volba_pod_prahem_se_chova_jako_mlceni(self):
        self.assertIsNone(jev._vybrana({"choice": "dod", "confidence": 0.3}, 0.5))
        self.assertEqual(jev._vybrana({"choice": "dod", "confidence": 0.9}, 0.5), "dod")

    def test_noul_nema_confidence_a_prah_je_na_vzdalenosti_od_poloviny(self):
        # Noul vrací jedno číslo P(ano); práh z `choice` se na něj přenést nesmí.
        self.assertIs(jev._ano({"noul": 0.91}), True)
        self.assertIs(jev._ano({"noul": 0.09}), False)
        self.assertIsNone(jev._ano({"noul": 0.55}))


class MezipametAOffline(unittest.TestCase):
    def test_offline_nesaha_na_sit_a_vrati_odpoved_z_mezipameti(self):
        stav, otazky = {"a": 1}, {"tema": jev.OTAZKA_TEMA}
        ulozene = odpoved(tema=("dod", 1.0))
        mezipamet = {jev._klic(stav, otazky): ulozene}
        self.assertEqual(jev.zeptej_se(stav, otazky, mezipamet, offline=True), ulozene)

    def test_offline_bez_zaznamu_neodpovida_misto_hadani(self):
        self.assertIsNone(jev.zeptej_se({"a": 1}, {"tema": jev.OTAZKA_TEMA}, {}, offline=True))

    def test_zmena_otazky_zneplatni_mezipamet(self):
        # Jinak by se vracela odpověď na jinou otázku, než jaká se ptá teď.
        stav = {"a": 1}
        prvni = jev._klic(stav, {"tema": jev.OTAZKA_TEMA})
        jina = dict(jev.OTAZKA_TEMA, instructions="jiná otázka")
        self.assertNotEqual(prvni, jev._klic(stav, {"tema": jina}))

    def test_model_je_pinovany(self):
        # `~typesafe/jev-latest` by měnil výsledky bez změny našeho kódu; verze
        # modelu je součástí verze pravidel a spouštěčem přepočtu (podmínka 5).
        self.assertEqual(jev.MODEL, "typesafe/jev-1.13")
        self.assertNotIn("latest", jev.MODEL)


if __name__ == "__main__":
    unittest.main()
