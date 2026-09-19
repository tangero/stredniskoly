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
    """Ročníky katalogu od zobrazeného (registr, sada cermat-vysledky) ke starším.

    Novější zápis vyhrává, stejně jako `nazvyOboru()` na stránce oboru: souběh přihlášek
    a kontext pak mluví o škole stejně jako stránka. Ročník, který je v katalogu, ale
    registr ho ještě nepřepnul (import předchází `prepni`), se nečte.
    """
    return sorted((r for r in rocniky if int(r) <= int(zobrazeny)), key=int, reverse=True)


def nacti_index(cesta: Path | None = None, registr: Path | None = None) -> dict:
    cesta, registr = cesta or INDEX, registr or REGISTR
    if not cesta.exists():
        raise SystemExit(f"{cesta.name} chybí; vytvořte ho scripts/build-nazvy-oboru-rejstrik.py")
    index = json.loads(cesta.read_text(encoding="utf-8"))
    zobrazeno = json.loads(registr.read_text(encoding="utf-8"))["sady"]["msmt-rejstrik-snimky"]["zobrazeno"]
    # Celý záznam včetně otisku snímku, ne jen období: revize téhož čtvrtletí přepíše zobrazeno
    # příkazem prepni a otisk ji odliší, i když proběhne týž den.
    if not zobrazeno.get("sha256") or index["meta"].get("registr") != zobrazeno:
        raise SystemExit(f"{cesta.name} vznikl ze snímku {index['meta'].get('registr')}, registr zobrazuje "
                         f"{zobrazeno}; přegenerujte ho scripts/build-nazvy-oboru-rejstrik.py")
    # Použitelnost, ne jen existence: prázdný index by z webu tiše odebral názvy oborů mimo katalog.
    if not index.get("nabidky"):
        raise SystemExit(f"{cesta.name} neobsahuje žádný obor; přegenerujte ho scripts/build-nazvy-oboru-rejstrik.py")
    return index


def nazvy_oboru(index: dict | None = None, katalog: dict | None = None, zobrazeny: str | None = None) -> dict[str, dict]:
    """Mapa REDIZO_KKOV → škola, obec, obor, id stránky a příznak `jpz` (obor je v katalogu JPZ)."""
    if katalog is None:
        katalog = json.loads((KOREN / "public" / "schools_data.json").read_text(encoding="utf-8"))
    if zobrazeny is None:
        zobrazeny = json.loads(REGISTR.read_text(encoding="utf-8"))["sady"]["cermat-vysledky"]["zobrazeno"]["obdobi"]
    if index is None:
        index = nacti_index()

    # Uvnitř ročníku vyhrává první záznam v pořadí souboru, stejně jako na webu. Klíč REDIZO_KKOV
    # nenese zaměření, takže ho může mít víc nabídek téže školy (PORG: Praha, Brno, Ostrava).
    # Řazení podle `id` bylo zavrženo: u PORG by vybralo Brno jen kvůli diakritice v `id`
    # a změnilo obec bez dokladu (docs/podklady/dopad-precedence-nazvu-2026-09-18.md).
    mapa: dict[str, dict] = {}
    varianty: dict[str, set[tuple]] = {}
    for rok in poradi_rocniku(katalog, str(zobrazeny)):
        for z in katalog[rok]:
            kkov = z.get("kkov") or (str(z.get("id") or "").split("_") + ["", ""])[1]
            if not kkov:
                print(f"varování: záznam bez kkov i použitelného id: {z.get('redizo')}")
                continue
            klic = f"{z['redizo']}_{kkov}"
            popis = (z.get("nazev_display") or z.get("nazev"), z.get("obec"), z.get("obor"))
            varianty.setdefault(f"{rok}|{klic}", set()).add(popis)
            mapa.setdefault(klic, {"skola": popis[0], "obec": popis[1], "obor": popis[2], "id": z["id"], "jpz": True})
    sporne = sum(1 for v in varianty.values() if len(v) > 1)
    if sporne:
        # Tichý arbitrární výběr je horší než viditelná nejednoznačnost; z dat ji rozhodnout nejde.
        print(f"poznámka: {sporne} klíčů má v jednom ročníku víc nabídek s rozdílným popisem; "
              f"vyhrává první v pořadí souboru, stejně jako na webu")

    for redizo, kody in index["nabidky"].items():
        nazev, obec = index["skoly"][redizo]
        for kod in kody:
            mapa.setdefault(f"{redizo}_{kod}", {"skola": nazev, "obec": obec, "obor": index["obory"][kod],
                                                "id": None, "jpz": False})
    return mapa
