"""Názvy oborů škol pro klíč REDIZO_KKOV, i pro obory, které přehled nezahrnuje.

Hlavní zdroj je katalog JPZ (public/schools_data.json), doplňkový index rejstříku škol MŠMT
(data/msmt_rejstrik/nazvy-oboru.json ze scripts/build-nazvy-oboru-rejstrik.py): uchazeči se
hlásí i na obory bez jednotné zkoušky, například učební obory kategorie H, a ty v katalogu
nejsou. Používají generátory souběžných přihlášek a kontextu přihlášek.

Index je v gitu, takže ho má i datová linka v CI. Chybějící nebo zastaralý index je chyba:
generátor by jinak přepsal známé názvy prázdnými hodnotami.
"""
from __future__ import annotations

import json
from pathlib import Path

KOREN = Path(__file__).resolve().parent.parent
REGISTR = KOREN / "public" / "stav_datovych_sad.json"
INDEX = KOREN / "data" / "msmt_rejstrik" / "nazvy-oboru.json"

# Kategorie oborů, u kterých se jednotná zkouška nekoná (docs/teze-vyuziti-dat-jpz-2027.md, R10)
KATEGORIE_BEZ_JPZ = frozenset("CEHJP")


def bez_jednotne_zkousky(klic: str) -> bool:
    """Obor kategorie C, E, H, J nebo P podle písmene v kódu oboru, např. 65-51-H/01."""
    kkov = klic.split("_")[1] if "_" in klic else klic
    return len(kkov) > 6 and kkov[6] in KATEGORIE_BEZ_JPZ


def poradi_rocniku(rocniky, zobrazeny: str) -> list[str]:
    """Předchozí a zobrazený ročník katalogu (registr, sada cermat-vysledky), v tomto pořadí.

    Předchozí ročník nese identifikátory stránek, které mapa nabídek zachovává; zobrazený
    doplní nabídky, které jsou nové. Starší ročníky se nečtou, jejich identifikátory
    už stránky nemusí mít.
    """
    return [r for r in (str(int(zobrazeny) - 1), str(zobrazeny)) if r in rocniky]


def nacti_index(cesta: Path = INDEX, registr: Path = REGISTR) -> dict:
    if not cesta.exists():
        raise SystemExit(f"{cesta.name} chybí; vytvořte ho scripts/build-nazvy-oboru-rejstrik.py")
    index = json.loads(cesta.read_text(encoding="utf-8"))
    zobrazeno = json.loads(registr.read_text(encoding="utf-8"))["sady"]["msmt-rejstrik-snimky"]["zobrazeno"]
    # Celý záznam, ne jen období: revize téhož čtvrtletí přepíše zobrazeno příkazem prepni.
    if index["meta"].get("registr") != zobrazeno:
        raise SystemExit(f"{cesta.name} vznikl ze snímku {index['meta'].get('registr')}, registr zobrazuje "
                         f"{zobrazeno}; přegenerujte ho scripts/build-nazvy-oboru-rejstrik.py")
    return index


def nazvy_oboru(index: dict | None = None, katalog: dict | None = None, zobrazeny: str | None = None) -> dict[str, dict]:
    """Mapa REDIZO_KKOV → škola, obec, obor, id stránky a příznak `jpz` (obor je v katalogu JPZ)."""
    if katalog is None:
        katalog = json.loads((KOREN / "public" / "schools_data.json").read_text(encoding="utf-8"))
    if zobrazeny is None:
        zobrazeny = json.loads(REGISTR.read_text(encoding="utf-8"))["sady"]["cermat-vysledky"]["zobrazeno"]["obdobi"]
    if index is None:
        index = nacti_index()

    mapa: dict[str, dict] = {}
    for rok in poradi_rocniku(katalog, str(zobrazeny)):
        for z in katalog[rok]:
            klic = f"{z['redizo']}_{z.get('kkov') or z['id'].split('_')[1]}"
            mapa.setdefault(klic, {"skola": z.get("nazev_display") or z.get("nazev"), "obec": z.get("obec"),
                                   "obor": z.get("obor"), "id": z["id"], "jpz": True})
    for redizo, kody in index["nabidky"].items():
        nazev, obec = index["skoly"][redizo]
        for kod in kody:
            mapa.setdefault(f"{redizo}_{kod}", {"skola": nazev, "obec": obec, "obor": index["obory"][kod],
                                                "id": None, "jpz": False})
    return mapa
