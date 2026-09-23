"""Párování ročníků a záznam souhrnu 1. kola: python3 -m unittest tests/test_souhrny_kolo1.py"""
from __future__ import annotations

import importlib.util
import unittest
from pathlib import Path

KOREN = Path(__file__).resolve().parents[1]
_spec = importlib.util.spec_from_file_location("souhrny", KOREN / "scripts" / "build-souhrny-kolo1.py")
souhrny = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(souhrny)


def nabidka(redizo: str, kkov: str, zamereni: str = "") -> dict:
    return {"redizo": redizo, "kkov": kkov, "zamereni": zamereni}


class TestParovani(unittest.TestCase):
    def test_shodny_klic(self):
        pary = souhrny.paruj({"1_A": nabidka("1", "A")}, {"1_A": nabidka("1", "A")})
        self.assertEqual(pary, {"1_A": ("1_A", "shoda_klice")})

    def test_jedina_nabidka_se_zmenenym_zamerenim(self):
        pary = souhrny.paruj({"1_A_stare": nabidka("1", "A", "staré")}, {"1_A_nove": nabidka("1", "A", "nové")})
        self.assertEqual(pary, {"1_A_nove": ("1_A_stare", "jedna_ku_jedne")})

    def test_vic_nabidek_se_neparuje(self):
        stary = {"1_A_x": nabidka("1", "A", "x"), "1_A_y": nabidka("1", "A", "y")}
        novy = {"1_A_z": nabidka("1", "A", "z"), "1_A_w": nabidka("1", "A", "w")}
        self.assertEqual(souhrny.paruj(stary, novy), {})

    def test_zbytek_po_shode_klice_se_neparuje_jako_jedina(self):
        # Škola má v obou letech dvě nabídky, jedna sedí klíčem; druhá není „jediná nabídka oboru“.
        stary = {"1_A_x": nabidka("1", "A", "x"), "1_A_y": nabidka("1", "A", "y")}
        novy = {"1_A_x": nabidka("1", "A", "x"), "1_A_z": nabidka("1", "A", "z")}
        self.assertEqual(souhrny.paruj(stary, novy), {"1_A_x": ("1_A_x", "shoda_klice")})

    def test_par_z_mapy_nabidek(self):
        # Víc nabídek na obou stranách: heuristika mlčí, mapa pár zná (klíče mapy s diakritikou).
        stary = {"1_A_nemecky_jazyk": nabidka("1", "A", "německý jazyk"), "1_A_francouzsky_jazyk": nabidka("1", "A", "francouzský jazyk")}
        novy = {"1_A_nemcina": nabidka("1", "A", "němčina"), "1_A_francouzstina": nabidka("1", "A", "francouzština")}
        mapa = {"1_A_němčina": {"katalog_id": "1_A_německý_jazyk", "zpusob": "overeno_rucne"}}
        self.assertEqual(souhrny.paruj(stary, novy, mapa), {"1_A_nemcina": ("1_A_nemecky_jazyk", "overeno_rucne")})

    def test_mapa_neprebije_shodu_klice_ani_nepouzije_starou_nabidku_dvakrat(self):
        stary = {"1_A_x": nabidka("1", "A", "x"), "1_A_y": nabidka("1", "A", "y")}
        novy = {"1_A_x": nabidka("1", "A", "x"), "1_A_z": nabidka("1", "A", "z")}
        mapa = {"1_A_x": {"katalog_id": "1_A_y", "zpusob": "text_zamereni"},
                "1_A_z": {"katalog_id": "1_A_x", "zpusob": "text_zamereni"}}
        self.assertEqual(souhrny.paruj(stary, novy, mapa), {"1_A_x": ("1_A_x", "shoda_klice")})

    def test_mapa_na_neexistujici_nabidku_se_ignoruje(self):
        mapa = {"1_A_z": {"katalog_id": "9_B_q", "zpusob": "jedna_ku_jedne"}}
        stary = {"1_A_x": nabidka("1", "A", "x"), "1_A_y": nabidka("1", "A", "y")}
        novy = {"1_A_z": nabidka("1", "A", "z"), "1_A_w": nabidka("1", "A", "w")}
        self.assertEqual(souhrny.paruj(stary, novy, mapa), {})


class TestZaznam(unittest.TestCase):
    def radek(self, **zmeny) -> dict:
        r = {
            "KAPACITA": 30, "PŘIHLÁŠKY CELKEM": 60, "PŘIJATÍ": 30,
            **{f"PŘIHLÁŠKY - PRIORITA {p}": v for p, v in zip(range(1, 6), (45, 10, 5, 0, 0))},
            **{f"PŘIJATÍ - PRIORITA {p}": v for p, v in zip(range(1, 6), (28, 2, 0, 0, 0))},
            "NEPŘIJATI - NEDOSTATEČNÁ KAPACITA": 15, "NEPŘIJATI - NESPLNĚNÍ PODMÍNEK": 5,
            "NEPŘIJATI - PŘIJAT NA VYŠŠÍ PRIORITU": 10, "NEPŘIJATI - VZDAL SE PŘIJETÍ": 0,
            "ČJ+MA - KONALI": 58, "ČJ+MA - KONALI (PŘIJATI)": 30,
            "ČJ+MA - % SKÓR - PRŮMĚR (PŘIJATI)": 150.0, "ČJ+MA - PERCENTIL - PRŮMĚR (PŘIJATI)": 88.44,
            "ČJ+MA - PERCENTIL - PRŮMĚR": 60.0, "ČJ+MA - PERCENTIL - MIN (PŘIJATI)": 70.0,
        }
        r.update(zmeny)
        return r

    def test_prevody_a_ukazatele(self):
        z = souhrny.zaznam(self.radek())
        self.assertEqual(z["tlak_prvnich_voleb"], 1.5)
        self.assertEqual(z["cj_ma_prijati"], 75.0)
        self.assertEqual(z["prumerne_umisteni_prijatych"], 88.4)
        self.assertEqual(z["min_prijaty_percentil_souhrn"], 70.0)

    def test_chybejici_udaj_neni_nula(self):
        z = souhrny.zaznam(self.radek(**{"ČJ+MA - PERCENTIL - PRŮMĚR (PŘIJATI)": None}))
        self.assertIsNone(z["prumerne_umisteni_prijatych"])

    def test_minimum_pod_deseti_prijatymi_se_neuvadi(self):
        z = souhrny.zaznam(self.radek(**{"ČJ+MA - KONALI (PŘIJATI)": 9}))
        self.assertIsNone(z["min_prijaty_percentil_souhrn"])

    def test_nesedici_priority_jsou_chyba(self):
        with self.assertRaises(ValueError):
            souhrny.zaznam(self.radek(**{"PŘIHLÁŠKY CELKEM": 61}))


class TestZarazeniObtiznosti(unittest.TestCase):
    """Prahy slovního zařazení podle slovníku ukazatelů: třetina, polovina, dvě třetiny.

    Od dávky D2 (17. 9. 2026) počítá zařazení jen tenhle generátor a TypeScript
    nad ním uplatňuje pouze práh zobrazení. Prahy proto testuje Python, ne
    `tests/obor-profil.test.mjs`, kde do té doby byla druhá implementace.
    """

    def zarazeni(self, prijati: int, nevesli: int) -> str | None:
        return souhrny.zarazeni_obtiznosti({"prijati": prijati, "capacity_rejected": nevesli})

    def test_prahy(self):
        # podíl přijatých ze soutěžících: 30/112 = 0,268 < 1/3
        self.assertEqual(self.zarazeni(30, 82), "velmi_tezke")
        # 29/67 = 0,433, tedy mezi třetinou a polovinou
        self.assertEqual(self.zarazeni(29, 38), "tezke")
        # 30/54 = 0,556, mezi polovinou a dvěma třetinami
        self.assertEqual(self.zarazeni(30, 24), "stredne_tezke")
        # 30/44 = 0,682, nad dvěma třetinami
        self.assertEqual(self.zarazeni(30, 14), "vetsina_uspela")

    def test_hranice_jsou_ostre_zdola(self):
        # přesně třetina a přesně polovina patří do mírnějšího stupně
        self.assertEqual(self.zarazeni(10, 20), "tezke")
        self.assertEqual(self.zarazeni(10, 10), "stredne_tezke")
        self.assertEqual(self.zarazeni(20, 10), "vetsina_uspela")

    def test_bez_odmitnutych_kapacita_nerozhodovala(self):
        self.assertEqual(self.zarazeni(23, 0), "kapacita_nerozhodovala")

    def test_chybejici_udaj_neni_nula(self):
        self.assertIsNone(souhrny.zarazeni_obtiznosti({"prijati": 30}))
        self.assertIsNone(souhrny.zarazeni_obtiznosti({"capacity_rejected": 5}))

    def test_prah_deseti_soutezicich_generator_neuplatnuje(self):
        # Práh je pravidlo zobrazení, ne součást definice (slovník ukazatelů),
        # takže pole v datech hodnotu nese i u nabídky se sedmi soutěžícími.
        self.assertEqual(self.zarazeni(3, 4), "tezke")


if __name__ == "__main__":
    unittest.main()


class TestKohortaPozice(unittest.TestCase):
    def test_prahy_jsou_ostre(self):
        self.assertEqual(souhrny.kohorta_pozice(67.1), "skola_prvni_volby")
        self.assertEqual(souhrny.kohorta_pozice(67.0), "smisena_pozice")
        self.assertEqual(souhrny.kohorta_pozice(33.0), "smisena_pozice")
        self.assertEqual(souhrny.kohorta_pozice(32.9), "zalozni_volba")
        self.assertIsNone(souhrny.kohorta_pozice(None))

    def test_percentil_se_pocita_jen_uvnitr_skupiny(self):
        # Nástavba s 60 % prvních voleb je ve své skupině dole, lyceum s 30 % nahoře.
        nabidky = {
            **{f"n{i}": {"skupina": "NAS_2", "podil_prvnich_voleb": x} for i, x in enumerate([0.6, 0.7, 0.8])},
            **{f"l{i}": {"skupina": "LYC_4", "podil_prvnich_voleb": x} for i, x in enumerate([0.1, 0.2, 0.3])},
        }
        souhrny.doplnit_kohorty(nabidky)
        self.assertEqual(nabidky["n0"]["kohorta_pozice"], "smisena_pozice")  # 1 ze 3 → 33,3
        self.assertEqual(nabidky["n2"]["kohorta_pozice"], "skola_prvni_volby")
        self.assertEqual(nabidky["l2"]["kohorta_pozice"], "skola_prvni_volby")

    def test_chybejici_podil_nedostane_kohortu(self):
        nabidky = {"a": {"skupina": "GY4_4", "podil_prvnich_voleb": None},
                   "b": {"skupina": "GY4_4", "podil_prvnich_voleb": 0.4}}
        souhrny.doplnit_kohorty(nabidky)
        self.assertIsNone(nabidky["a"]["kohorta_pozice"])
        self.assertIsNone(nabidky["a"]["percentil_podilu_prvnich_voleb"])
