#!/usr/bin/env python3
"""
Převodní tabulky výsledků cvičných testů CERMAT (TAU) na body zobrazeného roku.

Uchazeč si v aplikaci TAU udělá skutečný test z minulé jednotné zkoušky a zadá
body. Skript pro každý termín testu spočítá, na jakém místě mezi všemi
uchazeči, kteří ten test v ostrém termínu psali, by s tím výsledkem stál, a
najde body, které na stejném místě měl uchazeč v roce, za který web
zobrazuje pásma přijetí. Jde o ekvipercentilové převádění: předpokládá, že
pořadí se mezi ročníky zachovává, ne že jsou testy stejně těžké.

Zdroje:
  - položková data JPZ roku testu (data/JPZ{rok}_CJL4|MA4_polozkova_data.xlsx),
    jeden list na termín, řádek = uchazeč a test, `dt_body` 0–50,
  - data uchazečů cílového roku (data/PZ{cil}_kolo1_uchazeci_prihlasky_vysledky.xlsx),
    stejný soubor a stejná definice výsledku jako u pásem přijetí
    (`c_m_procentni_skor` / 2, lepší z pokusů).

Rok testu bere z registru (sada cermat-prevod-testu), cílový rok ze sady
cermat-uchazeci-kolo1. Výstup: public/prevod_testu_{rok}.json.

Definice a meze: slovník ukazatelů, *Převedený výsledek testu*.

    python3 scripts/build-prevod-testu.py
"""
from __future__ import annotations

import bisect
import json
import sys
from pathlib import Path

import openpyxl

KOREN = Path(__file__).resolve().parent.parent
REGISTR = KOREN / "public" / "stav_datovych_sad.json"

# Názvy testů se mezi ročníky mění: 2024 CJL4 a MA4, od 2025 C4 a M4.
NAZVY_TESTU = {2024: ("CJL4", "MA4")}
# Listy jdou v pořadí termínů; název listu nese písmeno a popis.
TERMINY = [
    ("1-radny", "1. řádný termín", True),
    ("2-radny", "2. řádný termín", True),
    ("1-nahradni", "1. náhradní termín", False),
    ("2-nahradni", "2. náhradní termín", False),
]
# Pod tímto počtem řešitelů termínu je pořadí nespolehlivé (náhradní termíny 2024: 486 a 794).
MIN_RESITELU_SPOLEHLIVE = 5000


def obdobi(sada: str) -> int:
    registr = json.loads(REGISTR.read_text(encoding="utf-8"))
    return int(registr["sady"][sada]["zobrazeno"]["obdobi"])


def nacti_terminy(soubor: Path, sloupec_id: str) -> list[dict[object, float]]:
    wb = openpyxl.load_workbook(soubor, read_only=True)
    listy = [ws for ws in wb.worksheets if "termín" in ws.title]
    if len(listy) != 4:
        sys.exit(f"{soubor.name}: čekám 4 listy s termíny, našel jsem {len(listy)}.")
    vysledky = []
    for ws in listy:
        it = ws.iter_rows(values_only=True)
        ix = {n: i for i, n in enumerate(next(it))}
        body = {}
        for r in it:
            if r[ix["dt_body"]] is not None:
                body[r[ix[sloupec_id]]] = float(r[ix["dt_body"]])
        vysledky.append(body)
    return vysledky


def nacti_cil(soubor: Path) -> tuple[list[float], list[float], list[float]]:
    wb = openpyxl.load_workbook(soubor, read_only=True)
    it = wb.worksheets[0].iter_rows(values_only=True)
    ix = {n: i for i, n in enumerate(next(it))}
    celkem, cj, ma = [], [], []
    for r in it:
        if r[ix["c_m_procentni_skor"]] is not None:
            celkem.append(float(r[ix["c_m_procentni_skor"]]) / 2)
        if r[ix["c_procentni_skor"]] is not None:
            cj.append(float(r[ix["c_procentni_skor"]]) / 2)
        if r[ix["m_procentni_skor"]] is not None:
            ma.append(float(r[ix["m_procentni_skor"]]) / 2)
    return sorted(celkem), sorted(cj), sorted(ma)


def poradi(serazene: list[float], body: float) -> float:
    """Percentil se středním pořadím: polovina shodných se počítá pod."""
    pod = bisect.bisect_left(serazene, body)
    shodnych = bisect.bisect_right(serazene, body) - pod
    return (pod + shodnych / 2) / len(serazene)


def kvantil(serazene: list[float], p: float) -> float:
    """Hodnota na daném podílu pořadí, s lineární interpolací."""
    poloha = min(max(p, 0.0), 1.0) * (len(serazene) - 1)
    dole = int(poloha)
    nahore = min(dole + 1, len(serazene) - 1)
    return serazene[dole] + (serazene[nahore] - serazene[dole]) * (poloha - dole)


def tabulka(zdroj: list[float], cil: list[float], maximum: int) -> dict:
    zdroj = sorted(zdroj)
    percentily, body = [], []
    for b in range(maximum + 1):
        p = poradi(zdroj, b)
        percentily.append(round(p * 100, 1))
        body.append(round(kvantil(cil, p), 1))
    return {"percentil": percentily, "body_cil": body}


def main() -> None:
    rok = obdobi("cermat-prevod-testu")
    cil_rok = obdobi("cermat-uchazeci-kolo1")
    if rok not in NAZVY_TESTU:
        sys.exit(f"Pro rok {rok} neznám názvy testů; doplňte NAZVY_TESTU.")
    cj_nazev, ma_nazev = NAZVY_TESTU[rok]
    cj_terminy = nacti_terminy(KOREN / "data" / f"JPZ{rok}_{cj_nazev}_polozkova_data.xlsx", "id_ss")
    ma_terminy = nacti_terminy(KOREN / "data" / f"JPZ{rok}_{ma_nazev}_polozkova_data.xlsx", "id")
    cil_celkem, cil_cj, cil_ma = nacti_cil(KOREN / "data" / f"PZ{cil_rok}_kolo1_uchazeci_prihlasky_vysledky.xlsx")

    terminy = []
    for (klic, nazev, radny), cj, ma in zip(TERMINY, cj_terminy, ma_terminy):
        # Součet jen u těch, kdo v tomtéž termínu psali oba testy.
        spolecni = cj.keys() & ma.keys()
        soucty = [cj[i] + ma[i] for i in spolecni]
        terminy.append({
            "klic": klic,
            "nazev": nazev,
            "radny": radny,
            "resitelu": len(spolecni),
            "spolehlive": len(spolecni) >= MIN_RESITELU_SPOLEHLIVE,
            "celkem": tabulka(soucty, cil_celkem, 100),
            "cj": tabulka(list(cj.values()), cil_cj, 50),
            "ma": tabulka(list(ma.values()), cil_ma, 50),
        })
        print(f"{nazev}: {len(spolecni)} řešitelů obou testů; 50 bodů celkem → "
              f"{terminy[-1]['celkem']['body_cil'][50]} bodů roku {cil_rok}")

    vystup = {
        "rok_testu": rok,
        "rok_cile": cil_rok,
        "zdroj_testu": f"JPZ{rok}_{cj_nazev}_polozkova_data.xlsx, JPZ{rok}_{ma_nazev}_polozkova_data.xlsx",
        "zdroj_cile": f"PZ{cil_rok}_kolo1_uchazeci_prihlasky_vysledky.xlsx",
        "metoda": "ekvipercentilové převádění: pořadí mezi řešiteli testu (střední pořadí) → body se stejným pořadím v cílovém roce",
        "cil_uchazecu": len(cil_celkem),
        "terminy": terminy,
    }
    cesta = KOREN / "public" / f"prevod_testu_{rok}.json"
    cesta.write_text(json.dumps(vystup, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"Zapsáno {cesta.relative_to(KOREN)} ({cesta.stat().st_size // 1024} kB)")


if __name__ == "__main__":
    main()
