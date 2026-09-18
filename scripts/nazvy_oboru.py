"""Názvy oborů škol pro klíč REDIZO_KKOV, i pro obory, které přehled nezahrnuje.

Hlavní zdroj je katalog JPZ (public/schools_data.json), doplňkový rejstřík škol MŠMT:
uchazeči se hlásí i na obory bez jednotné zkoušky, například učební obory kategorie H,
a ty v katalogu nejsou. Používají generátory souběžných přihlášek a kontextu přihlášek.
"""
from __future__ import annotations

import json
import os
from pathlib import Path

KOREN = Path(__file__).resolve().parent.parent
REJSTRIK = KOREN / "data" / "msmt_rejstrik" / "rssz-2026-06-30.jsonld"


def vychozi_rejstrik() -> Path:
    """Snímek rejstříku, který se použije, když volající neurčí jiný.

    Cestu smí přebít proměnná `MSMT_REJSTRIK`. Slouží prostředím, kde velký
    snímek není a ani být nemůže: integrační testy datové linky používají
    zkrácený snímek `tests/fixtures/rssz-test.jsonld`, aby se dalo ověřit
    zpracování, a ne dostupnost třicetimegabajtového souboru.
    """
    z_prostredi = os.environ.get("MSMT_REJSTRIK")
    return Path(z_prostredi) if z_prostredi else REJSTRIK

# Kategorie oborů, u kterých se jednotná zkouška nekoná (docs/teze-vyuziti-dat-jpz-2027.md, R10)
KATEGORIE_BEZ_JPZ = frozenset("CEHJP")


def bez_jednotne_zkousky(klic: str) -> bool:
    """Obor kategorie C, E, H, J nebo P podle písmene v kódu oboru, např. 65-51-H/01."""
    kkov = klic.split("_")[1] if "_" in klic else klic
    return len(kkov) > 6 and kkov[6] in KATEGORIE_BEZ_JPZ


def nazvy_oboru(rejstrik: Path | None = None, povinny_rejstrik: bool = True) -> dict[str, dict]:
    """Mapa REDIZO_KKOV → škola, obec, obor, id stránky a příznak `jpz` (obor je v katalogu JPZ).

    Ročníky katalogu se procházejí **od nejnovějšího**, takže u školy vedené ve
    více ročnících vyhrává novější zápis — stejně jako `nazvyOboru()` na webu.
    Dokud se procházely ve pevném pořadí `("2025", "2026")` se `setdefault`,
    vyhrával starší ročník a souběh přihlášek ukazoval zkrácený název, zatímco
    stránka oboru úplný. Pevné letopočty navíc mlčky vynechávaly ročník 2024,
    který katalog taky vede.

    Uvnitř ročníku vyhrává **první záznam v pořadí, jak je v souboru** — opět
    stejně jako web. Klíč je REDIZO + kód oboru bez zaměření, takže ho může nést
    několik nabídek téže školy: PORG má pod jedním klíčem osmileté gymnázium
    v Praze, Brně i Ostravě. V katalogu 2026 je takových klíčů s rozdílným
    názvem, obcí nebo oborem 43.

    Vybírat mezi nimi abecedně podle `id` jsem zkusil a zavrhl: u PORG by vyhrálo
    Brno jen proto, že jeho `id` je bez diakritiky, a proti dnešnímu stavu by to
    **změnilo obec bez jakéhokoli dokladu**, že je nová správnější. Pořadí
    v souboru je aspoň shodné s tím, co ukazuje stránka oboru, takže se popis
    školy neliší podle toho, kde se člověk dívá.

    Kolik klíčů je konfliktních, funkce **vypíše**; tichý arbitrární výběr je
    horší než viditelná nejednoznačnost. Rozhodnout ji z dat nejde — musela by
    odpovědět škola nebo rejstřík, která nabídka klíč zastupuje.

    `povinny_rejstrik` je pojistka proti tichému zahození názvů: bez snímku
    rejstříku zůstanou obory mimo katalog bez názvu, a kdyby generátor takový
    výstup zapsal, přišel by web o víc než tisíc názvů, aniž by to někdo poznal.
    Volající, který snímek nemá a nepotřebuje, si ho vypne výslovně.
    """
    rejstrik = rejstrik if rejstrik is not None else vychozi_rejstrik()
    mapa: dict[str, dict] = {}

    data = json.load(open(KOREN / "public" / "schools_data.json", encoding="utf-8"))
    konflikty: dict[str, set[tuple]] = {}
    for rok in sorted(data, reverse=True):
        for z in data.get(rok, []):
            kkov = z.get("kkov") or (str(z.get("id") or "").split("_") + ["", ""])[1]
            if not kkov:
                # Bez kódu oboru klíč nesestavíme; záznam nemá jak být nalezen.
                print(f"varování: záznam bez kkov i použitelného id: {z.get('redizo')}")
                continue
            klic = f"{z['redizo']}_{kkov}"
            popis = (
                z.get("nazev_display") or z.get("nazev"),
                z.get("obec"),
                z.get("obor"),
            )
            konflikty.setdefault(f"{rok}|{klic}", set()).add(popis)
            mapa.setdefault(
                klic,
                {
                    "skola": z.get("nazev_display") or z.get("nazev"),
                    "obec": z.get("obec"),
                    "obor": z.get("obor"),
                    "id": z["id"],
                    "jpz": True,
                },
            )

    sporne = sum(1 for varianty in konflikty.values() if len(varianty) > 1)
    if sporne:
        print(f"poznámka: {sporne} klíčů má v jednom ročníku víc nabídek s rozdílným popisem; "
              f"vyhrává první v pořadí souboru, stejně jako na webu")

    if not rejstrik.exists():
        # Snímky rejstříku se do gitu neukládají (30 MB), takže na cizím stroji chybí.
        if povinny_rejstrik:
            raise FileNotFoundError(
                f"{rejstrik} chybí. Bez snímku rejstříku by obory mimo katalog zůstaly bez názvu "
                f"a generátor by jich z webu odstranil víc než tisíc. Doplň snímek podle "
                f"data/msmt_rejstrik/README.md, nebo si vyžádej mapu bez rejstříku výslovně "
                f"(povinny_rejstrik=False)."
            )
        print(f"varování: {rejstrik.name} chybí, obory bez JPZ zůstanou bez názvu")
        return mapa

    # Chyby čtení dostanou cestu a návod. Bez toho by `IsADirectoryError` nebo
    # `KeyError: 'list'` posílaly člověka hledat příčinu do kódu.
    try:
        zaznamy = json.load(open(rejstrik, encoding="utf-8"))["list"]
    except (OSError, ValueError, KeyError, TypeError) as chyba:
        raise ValueError(
            f"{rejstrik} nejde přečíst jako snímek rejstříku ({type(chyba).__name__}: {chyba}). "
            f"Čekám JSON s polem `list`; postup stažení je v data/msmt_rejstrik/README.md "
            f"a ověřit snímek umí `python3 scripts/stahni-rejstrik.py --kontrola`."
        ) from chyba

    pred = len(mapa)
    for zaznam in zaznamy:
        redizo = str(zaznam.get("redIzo") or "")
        if not redizo:
            continue
        nazev = zaznam.get("zkracenyNazev") or zaznam.get("uplnyNazev")
        obec = (zaznam.get("adresa") or {}).get("obec")
        for skola in zaznam.get("skolyAZarizeni") or []:
            for obor in skola.get("obory") or []:
                kod = obor.get("kod")
                if not kod:
                    continue
                mapa.setdefault(
                    f"{redizo}_{kod}",
                    {"skola": nazev, "obec": obec, "obor": obor.get("nazev"), "id": None, "jpz": False},
                )

    # Existence souboru je slabší podmínka než jeho použitelnost: `{"list": []}`
    # je platný JSON se správnou strukturou a projde, jen z něj nevznikne ani
    # jeden název. Přesně to je výsledek, kterému má pojistka zabránit, takže se
    # kontroluje, co rejstřík skutečně dodal, ne že soubor existuje.
    dodano = len(mapa) - pred
    if dodano == 0:
        if povinny_rejstrik:
            raise ValueError(
                f"{rejstrik} nedodal ani jeden obor mimo katalog (záznamů v `list`: "
                f"{len(zaznamy)}). Takový snímek je nepoužitelný a výstup by z webu "
                f"odebral víc než tisíc názvů; ověř ho příkazem "
                f"`python3 scripts/stahni-rejstrik.py --kontrola`."
            )
        print(f"varování: {rejstrik.name} nedodal žádný obor mimo katalog")
    return mapa
