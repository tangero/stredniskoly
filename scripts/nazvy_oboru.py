"""Názvy oborů škol pro klíč REDIZO_KKOV, i pro obory, které přehled nezahrnuje.

Hlavní zdroj je katalog JPZ (public/schools_data.json), doplňkový rejstřík škol MŠMT:
uchazeči se hlásí i na obory bez jednotné zkoušky, například učební obory kategorie H,
a ty v katalogu nejsou. Používají generátory souběžných přihlášek a kontextu přihlášek.
"""
from __future__ import annotations

import json
from pathlib import Path

KOREN = Path(__file__).resolve().parent.parent
REJSTRIK = KOREN / "data" / "msmt_rejstrik" / "rssz-2026-06-30.jsonld"

# Kategorie oborů, u kterých se jednotná zkouška nekoná (docs/teze-vyuziti-dat-jpz-2027.md, R10)
KATEGORIE_BEZ_JPZ = frozenset("CEHJP")


def bez_jednotne_zkousky(klic: str) -> bool:
    """Obor kategorie C, E, H, J nebo P podle písmene v kódu oboru, např. 65-51-H/01."""
    kkov = klic.split("_")[1] if "_" in klic else klic
    return len(kkov) > 6 and kkov[6] in KATEGORIE_BEZ_JPZ


def nazvy_oboru(rejstrik: Path = REJSTRIK, povinny_rejstrik: bool = True) -> dict[str, dict]:
    """Mapa REDIZO_KKOV → škola, obec, obor, id stránky a příznak `jpz` (obor je v katalogu JPZ).

    Ročníky katalogu se procházejí **od nejnovějšího**, takže u školy vedené ve
    více ročnících vyhrává novější zápis — stejně jako `nazvyOboru()` na webu.
    Dokud se procházely ve pevném pořadí `("2025", "2026")` se `setdefault`,
    vyhrával starší ročník a souběh přihlášek ukazoval zkrácený název, zatímco
    stránka oboru úplný. Pevné letopočty navíc mlčky vynechávaly ročník 2024,
    který katalog taky vede.

    Uvnitř ročníku se mezi **záznamy téhož klíče** vybírá podle `id`, abecedně.
    Klíč je REDIZO + kód oboru bez zaměření, takže ho může nést několik nabídek
    téže školy — v katalogu 2026 je takových klíčů s rozdílným názvem, obcí nebo
    oborem 43. Bez pevného kritéria by vítěz záležel na pořadí záznamů v souboru
    a přegenerování týchž dat by mohlo dát jiný výsledek. Řazení podle `id`
    **netvrdí, že vybraná nabídka je ta správná**; zajišťuje jen, že je vždy
    stejná.

    `povinny_rejstrik` je pojistka proti tichému zahození názvů: bez snímku
    rejstříku zůstanou obory mimo katalog bez názvu, a kdyby generátor takový
    výstup zapsal, přišel by web o víc než tisíc názvů, aniž by to někdo poznal.
    Volající, který snímek nemá a nepotřebuje, si ho vypne výslovně.
    """
    mapa: dict[str, dict] = {}

    data = json.load(open(KOREN / "public" / "schools_data.json", encoding="utf-8"))
    for rok in sorted(data, reverse=True):
        for z in sorted(data.get(rok, []), key=lambda z: str(z.get("id") or "")):
            klic = f"{z['redizo']}_{z.get('kkov') or z['id'].split('_')[1]}"
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
    for zaznam in json.load(open(rejstrik, encoding="utf-8"))["list"]:
        redizo = str(zaznam.get("redIzo") or "")
        if not redizo:
            continue
        nazev = zaznam.get("zkracenyNazev") or zaznam.get("uplnyNazev")
        obec = (zaznam.get("adresa") or {}).get("obec")
        for skola in zaznam.get("skolyAZarizeni", []):
            for obor in skola.get("obory", []):
                kod = obor.get("kod")
                if not kod:
                    continue
                mapa.setdefault(
                    f"{redizo}_{kod}",
                    {"skola": nazev, "obec": obec, "obor": obor.get("nazev"), "id": None, "jpz": False},
                )
    return mapa
