"""Přihlášky jednoho uchazeče sloučené po oborech (issue #183).

Klíč oboru ve výstupech je REDIZO_KKOV bez zaměření. Uchazeč s přihláškami
do dvou zaměření téhož oboru se proto musí u oboru počítat jednou. Sdílí to
build-pasma-prijeti.py, build-kontext-prihlasek.py, build-soubeh-prihlasek.py,
rozbor-podminek-a-poradi.py a predmetovy-sklon.py, aby všechny slučovaly stejně.

Výsledek oboru po sloučení:
  - PRIJAT, když byl přijat do kteréhokoli zaměření,
  - VZDAL_SE, když se přijetí vzdal (jen data 2025); vedlejší zaměření ho
    nepřepíše na horší důvod, protože uchazeč na obor ve skutečnosti přijat byl,
  - jinak nejlepší známý důvod nepřijetí (kapacita < vyšší priorita < podmínky),
  - None, když důvod není známý.
"""
from __future__ import annotations

PRIJAT = 0
VZDAL_SE = "vzdal_se"
# Pořadí důvodů nepřijetí u jednoho oboru, menší je lepší.
PORADI_DUVODU = {"pro_nedostacujici_kapacitu": 1, "prijat_na_vyssi_prioritu": 2, "pro_nesplneni_podminek": 3}
DUVODY_VZDANI = ("vzdal_se_prijeti", "vzdal_se_prijeti_po_terminu")
MAX_VOLEB = 5


def prijat(hodnota) -> bool:
    """Příznak přijetí: 1 = přijat a zařazen. CERMAT ho zapisuje jako číslo i jako text, v roce 2024 jako True."""
    return str(hodnota).strip() in ("1", "True", "true")


def _stav(byl_prijat: bool, duvod) -> int | str | None:
    if byl_prijat:
        return PRIJAT
    if duvod in DUVODY_VZDANI:
        return VZDAL_SE
    return PORADI_DUVODU.get(duvod)


def _lepsi(a, b):
    """Lepší ze dvou výsledků téhož oboru: přijat > vzdal se > důvody podle pořadí > neznámý."""
    for s in (PRIJAT, VZDAL_SE):
        if s in (a, b):
            return s
    znamé = [s for s in (a, b) if s is not None]
    return min(znamé) if znamé else None


def volby_uchazece(radek, ix: dict[str, int]) -> list[dict]:
    """Obory z přihlášek jednoho uchazeče v pořadí jejich první přihlášky.

    Každý obor jednou: `obor` (REDIZO_KKOV), `pozice` (pořadí první přihlášky
    na obor mezi vyplněnými přihláškami, od 0), `pozice_prijeti` (pořadí
    přihlášky, na kterou byl přijat, nebo None) a `stav` (viz docstring modulu).
    """
    volby: dict[str, dict] = {}
    poz = 0
    for k in range(1, MAX_VOLEB + 1):
        red, kkov = radek[ix[f"ss{k}_redizo"]], radek[ix[f"ss{k}_kkov"]]
        if not red or not kkov:
            continue
        obor = f"{red}_{kkov}"
        byl = prijat(radek[ix[f"ss{k}_prijat"]])
        stav = _stav(byl, radek[ix[f"ss{k}_duvod_neprijeti"]])
        v = volby.get(obor)
        if v is None:
            volby[obor] = {"obor": obor, "pozice": poz, "pozice_prijeti": poz if byl else None, "stav": stav}
        else:
            v["stav"] = _lepsi(v["stav"], stav)
            if byl and v["pozice_prijeti"] is None:
                v["pozice_prijeti"] = poz
        poz += 1
    return list(volby.values())


def vysledek_uchazece(volby: list[dict], obor: dict) -> str:
    """Kam se uchazeč dostal z pohledu oboru: sem, vys, niz, nikam.

    Porovnává se pořadí přijaté přihlášky s první přihláškou na obor, takže
    přijetí na pozdější zaměření téhož oboru je „sem“ a uchazeč odmítnutý
    na obor A, pak na B a přijatý na A z třetí přihlášky je u B „níž“.
    """
    if obor["pozice_prijeti"] is not None:
        return "sem"
    prijat_na = min((v["pozice_prijeti"] for v in volby if v["pozice_prijeti"] is not None), default=None)
    if prijat_na is None:
        return "nikam"
    return "vys" if prijat_na < obor["pozice"] else "niz"
