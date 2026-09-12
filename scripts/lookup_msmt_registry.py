#!/usr/bin/env python3
"""Vyhledání subjektu v lokálních snímcích rejstříku MŠMT (JSON-LD otevřená data).

Použití:
    python3 scripts/lookup_msmt_registry.py 600005542          # REDIZO
    python3 scripts/lookup_msmt_registry.py izo:061386855      # IZO školy/zařízení

Snímky v data/msmt_rejstrik/ pocházejí z oficiálních otevřených dat MŠMT
(lkod-ftp.msmt.gov.cz, datová sada 00022985 na data.gov.cz) a jsou datované,
takže dokládají stav rejstříku ke konkrétnímu dni.
"""
import glob
import json
import sys


def hledat(dotaz: str) -> None:
    soubory = sorted(glob.glob("data/msmt_rejstrik/rssz-*.jsonld"))
    if not soubory:
        sys.exit("Žádné snímky v data/msmt_rejstrik/ – stáhněte je podle README v tomto adresáři.")
    po_izo = dotaz.lower().startswith("izo:")
    hledane = dotaz[4:] if po_izo else dotaz
    for soubor in soubory:
        data = json.load(open(soubor))
        datum = data.get("datumVystupu", soubor)
        nalezeno = False
        for subjekt in data["list"]:
            if po_izo:
                zasah = [s for s in subjekt.get("skolyAZarizeni", []) if s.get("izo") == hledane]
                if not zasah:
                    continue
            elif subjekt.get("redIzo") != hledane:
                continue
            nalezeno = True
            a = subjekt.get("adresa", {})
            print(f"[{datum}] {subjekt['redIzo']} | {subjekt['uplnyNazev']} | IČ {subjekt.get('ico')}")
            print(f"  sídlo: {a.get('ulice') or ''} {a.get('cisloDomovni') or ''}/{a.get('cisloOrientacni') or ''}, "
                  f"{a.get('castObce') or a.get('obec')}, PSČ {a.get('psc')} (RÚIAN {a.get('kodRUIAN')})")
            for skola in subjekt.get("skolyAZarizeni", []):
                if po_izo and skola.get("izo") != hledane:
                    continue
                print(f"  IZO {skola['izo']} – {skola['uplnyNazev']}")
                for misto in skola.get("mistaVyuky", []):
                    ma = misto.get("adresa", {})
                    print(f"    místo výuky ({misto.get('typ')}): {ma.get('ulice') or ''} "
                          f"{ma.get('cisloDomovni') or ''}/{ma.get('cisloOrientacni') or ''}, "
                          f"{ma.get('castObce') or ma.get('obec')} (RÚIAN {ma.get('kodRUIAN')})")
        if not nalezeno:
            print(f"[{datum}] {dotaz}: NENÍ ve snímku rejstříku")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    hledat(sys.argv[1])
