"""Obory, které se už nenabírají: python3 -m unittest tests/test_dobihajici_obory.py

Testuje se hlavně to, co se **nesmí** stát: příznak se nikdy nesmí objevit
u oboru, který škola v zobrazeném ročníku nabízí.
"""
from __future__ import annotations

import importlib.util
import json
import re
import unittest
from pathlib import Path

KOREN = Path(__file__).resolve().parents[1]
_spec = importlib.util.spec_from_file_location("build_dob", KOREN / "scripts" / "build-dobihajici-obory.py")
build_dob = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(build_dob)

VYSTUP = KOREN / "public" / "dobihajici_obory.json"
KATALOG = KOREN / "public" / "schools_data.json"
REGISTR = KOREN / "public" / "stav_datovych_sad.json"


def programy(rok: str) -> list[dict]:
    """Nabídky katalogu daného ročníku."""
    data = json.loads(KATALOG.read_text(encoding="utf-8"))[rok]
    nalezene: list[dict] = []

    def projdi(uzel) -> None:
        if isinstance(uzel, dict):
            if "id" in uzel and "delka_studia" in uzel and "redizo" in uzel:
                nalezene.append(uzel)
            else:
                for hodnota in uzel.values():
                    projdi(hodnota)
        elif isinstance(uzel, list):
            for hodnota in uzel:
                projdi(hodnota)

    projdi(data)
    return nalezene


def zobrazeny_rok() -> str:
    registr = json.loads(REGISTR.read_text(encoding="utf-8"))
    return registr["sady"]["cermat-vysledky"]["zobrazeno"]["obdobi"]


class TestCesty(unittest.TestCase):
    def test_cesta_mimo_repozitar_nespadne(self):
        # Volání z docstringu skriptu předává relativní i absolutní cesty.
        self.assertTrue(build_dob.pod_korenem(Path("data/msmt_rejstrik")).endswith("data/msmt_rejstrik"))
        mimo = build_dob.pod_korenem(Path("/tmp"))
        self.assertTrue(mimo.startswith("/"), mimo)


class TestVystup(unittest.TestCase):
    """Výstup se kontroluje proti skutečným identifikátorům katalogu."""

    @classmethod
    def setUpClass(cls) -> None:
        cls.klice = set(json.loads(VYSTUP.read_text(encoding="utf-8"))["obory"])
        cls.rok = zobrazeny_rok()
        cls.programy = programy(cls.rok)

    def klic(self, p: dict) -> str:
        return f"{p['redizo']}|{p['id'].split('_')[1]}|{p['delka_studia']}"

    def test_prizak_se_netyka_zadne_vypsane_nabidky(self):
        """Jádro celé funkce: mezi vypsanými nabídkami je dobíhajících nula.

        Vypsaná nabídka se pozná stejně jako v `skola-profil-data.ts`: má souhrn
        zobrazeného ročníku, nebo je mezi nabídkami 1. kola. Kdyby test padl,
        stránka by u oboru, na který se dá podat přihláška, tvrdila, že se už
        nenabírá.
        """
        souhrny = json.loads((KOREN / "public" / "souhrny_kolo1.json").read_text(encoding="utf-8"))["nabidky"]
        vypsane_klice = {k for k, v in souhrny.items() if self.rok in v.get("roky", {})}
        trefy = [p["id"] for p in self.programy
                 if p["id"] in vypsane_klice and self.klic(p) in self.klice]
        self.assertEqual(trefy, [], f"příznak se trefil do vypsané nabídky: {trefy[:5]}")

    def test_ucinnost_odpovida_dokumentaci(self):
        """Kolik nabídek zobrazeného ročníku příznak skutečně označí.

        Číslo je malé a je to tak správně: dobíhající obory se do katalogu
        z větší části nedostanou, protože ten nese jen nabídky, které se
        objevily v datech CERMATu. Test hlídá, aby dokumentace tvrdila totéž
        co data — dřívější tvrzení o dvanácti trefách sčítalo tři ročníky.
        """
        trefy = [p["id"] for p in self.programy if self.klic(p) in self.klice]
        self.assertEqual(len(trefy), 1, f"účinnost se změnila, oprav dokumentaci: {trefy[:10]}")

    def test_stare_trojmistne_kody_se_nenormalizuji(self):
        """Starý kód oboru (`82-44-M/001`) se nesmí párovat s novým (`82-44-M/01`).

        U 343 škol vede rejstřík starý kód jako dobíhající a nový jako aktivní.
        Kdyby se kódy normalizovaly, stránka by u aktivně vypisovaného oboru
        tvrdila, že se už nenabírá. Proto se staré kódy prostě nespárují.
        """
        stare = {k for k in self.klice if re.search(r"/\d{3}$", k.split("|")[1])}
        self.assertTrue(stare, "ve výstupu nejsou žádné staré kódy, test by nic nehlídal")
        kody_katalogu = {p["id"].split("_")[1] for p in self.programy}
        self.assertFalse(
            {k.split("|")[1] for k in stare} & kody_katalogu,
            "starý trojmístný kód se objevil i v katalogu; párování je potřeba přehodnotit",
        )

    def test_klic_ma_ocekavany_tvar(self):
        for k in list(self.klice)[:50]:
            redizo, kkov, delka = k.split("|")
            self.assertRegex(redizo, r"^\d{9}$")
            self.assertRegex(kkov, r"^\d{2}-\d{2}-[A-Z]/\d{2,3}$")
            self.assertRegex(delka, r"^\d$")


if __name__ == "__main__":
    unittest.main()
