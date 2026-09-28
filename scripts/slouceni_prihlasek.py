"""Přihlášky jednoho uchazeče sloučené po oborech (issue #183).

Klíč oboru ve výstupech je REDIZO_KKOV bez zaměření. Uchazeč s přihláškami
do dvou zaměření téhož oboru se proto musí u oboru počítat jednou. Sdílí to
build-pasma-prijeti.py, build-kontext-prihlasek.py, build-soubeh-prihlasek.py,
rozbor-podminek-a-poradi.py a predmetovy-sklon.py, aby všechny slučovaly stejně.

Výsledek oboru po sloučení:
  - PRIJAT, když byl přijat do kteréhokoli zaměření,
    (vzdání se přijetí je přijetí, viz níže),
  - jinak nejlepší známý důvod nepřijetí (kapacita < vyšší priorita < podmínky),
  - None, když důvod není známý.

Vzdání se přijetí (`vzdal_se_prijeti`, `vzdal_se_prijeti_po_terminu`, jen data
2025) se počítá jako přijetí, včetně pořadí přijaté přihlášky. Data 2026 vzdání
se nerozlišují a uchazeč, který se vzdal, v nich je přijatý; bez sjednocení by
počty přijatých mezi ročníky nebyly srovnatelné (rozhodnutí zadavatele
28. 9. 2026, slovník ukazatelů, *Soutěžící o obor*).

Populace je stejná jako u souhrnů 1. kola (scripts/import_cermat_results.py,
is_valid_flat): jen přihlášky do denní formy (den, den2) a nezkráceného
studia. Dálkové, večerní, distanční, kombinované a zkrácené studium sdílí
s denním oborem REDIZO_KKOV, a bez filtru by jejich uchazeči padli pod
klíč denního oboru. Pořadí přihlášek i přijetí se ale počítá ze všech
přihlášek: uchazeč přijatý výš na dálkové studium je u denního oboru „výš“.
"""
from __future__ import annotations

PRIJAT = 0
# Pořadí důvodů nepřijetí u jednoho oboru, menší je lepší.
PORADI_DUVODU = {"pro_nedostacujici_kapacitu": 1, "prijat_na_vyssi_prioritu": 2, "pro_nesplneni_podminek": 3}
DUVODY_VZDANI = ("vzdal_se_prijeti", "vzdal_se_prijeti_po_terminu")
MAX_VOLEB = 5


def prijat(hodnota) -> bool:
    """Příznak přijetí: 1 = přijat a zařazen. CERMAT ho zapisuje jako číslo i jako text, v roce 2024 jako True."""
    return str(hodnota).strip() in ("1", "True", "true")


def denni_nezkracene(forma, zkraceno) -> bool:
    """Přihláška patří do populace webu: denní forma a nezkrácené studium (zkraceno 2 = ne)."""
    return "den" in str(forma or "").lower() and str(zkraceno).strip() == "2"


def byl_prijat(hodnota, duvod) -> bool:
    """Přijetí včetně vzdání se přijetí, které data 2026 nerozlišují (viz docstring modulu)."""
    return prijat(hodnota) or str(duvod or "").strip() in DUVODY_VZDANI


def _stav(byl: bool, duvod) -> int | None:
    return PRIJAT if byl else PORADI_DUVODU.get(duvod)


def _lepsi(a, b):
    """Lepší ze dvou výsledků téhož oboru: přijat > důvody podle pořadí > neznámý."""
    if PRIJAT in (a, b):
        return PRIJAT
    znamé = [s for s in (a, b) if s is not None]
    return min(znamé) if znamé else None


def volby_uchazece(radek, ix: dict[str, int]) -> list[dict]:
    """Obory z přihlášek jednoho uchazeče v pořadí jejich první přihlášky.

    Každý obor jednou: `obor` (REDIZO_KKOV), `pozice` (pořadí první přihlášky
    na obor mezi vyplněnými přihláškami, od 0), `pozice_prijeti` (pořadí
    přihlášky, na kterou byl přijat, nebo None) a `stav` (viz docstring modulu).
    Vrací jen přihlášky do denního nezkráceného studia; `prijat_na` u každé
    volby je pořadí přijaté přihlášky uchazeče mezi všemi jeho přihláškami.
    """
    volby: dict[str, dict] = {}
    poz = 0
    prijat_na = None
    for k in range(1, MAX_VOLEB + 1):
        red, kkov = radek[ix[f"ss{k}_redizo"]], radek[ix[f"ss{k}_kkov"]]
        if not red or not kkov:
            continue
        obor = f"{red}_{kkov}"
        duvod = radek[ix[f"ss{k}_duvod_neprijeti"]]
        byl = byl_prijat(radek[ix[f"ss{k}_prijat"]], duvod)
        if byl and prijat_na is None:
            prijat_na = poz
        if not denni_nezkracene(radek[ix[f"ss{k}_forma"]], radek[ix[f"ss{k}_zkraceno"]]):
            poz += 1
            continue
        stav = _stav(byl, duvod)
        v = volby.get(obor)
        if v is None:
            volby[obor] = {"obor": obor, "pozice": poz, "pozice_prijeti": poz if byl else None, "stav": stav}
        else:
            v["stav"] = _lepsi(v["stav"], stav)
            if byl and v["pozice_prijeti"] is None:
                v["pozice_prijeti"] = poz
        poz += 1
    for v in volby.values():
        v["prijat_na"] = prijat_na
    return list(volby.values())


def vysledek_uchazece(volby: list[dict], obor: dict) -> str:
    """Kam se uchazeč dostal z pohledu oboru: sem, vys, niz, nikam.

    Porovnává se pořadí přijaté přihlášky s první přihláškou na obor, takže
    přijetí na pozdější zaměření téhož oboru je „sem“ a uchazeč odmítnutý
    na obor A, pak na B a přijatý na A z třetí přihlášky je u B „níž“.
    """
    if obor["pozice_prijeti"] is not None:
        return "sem"
    prijat_na = obor.get("prijat_na", min((v["pozice_prijeti"] for v in volby if v["pozice_prijeti"] is not None), default=None))
    if prijat_na is None:
        return "nikam"
    return "vys" if prijat_na < obor["pozice"] else "niz"
