#!/usr/bin/env python3
"""Dotaz na obchodní rejstřík přes otevřené REST rozhraní ARES.

Rešerše návazností opakovaně naráží na otázku, zda právnická osoba zanikla nebo
byla sloučena. Webové rozhraní or.justice.cz je javascriptové a agentům nevrací
obsah; ARES ale tytéž údaje publikuje jako JSON.

Použití:
    python3 scripts/lookup_ares.py 49244884            # podle IČO
    python3 scripts/lookup_ares.py --nazev FOSTRA      # podle obchodního jména
    python3 scripts/lookup_ares.py --redizo 691017344  # IČO dohledá v rejstříku MŠMT

Pozor na výklad: odpověď „není ve veřejném rejstříku" dokládá, že subjekt dnes
zapsán není. Sama o sobě neříká, zda šlo o sloučení, nebo o prostý zánik, ani
kdy k němu došlo; k tomu je potřeba sbírka listin.
"""
import argparse
import glob
import json
import sys
import urllib.error
import urllib.request

ZAKLAD = "https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty"
HLAVICKY = {"accept": "application/json", "Content-Type": "application/json",
            "User-Agent": "reserse-navaznosti/1.0 (stredniskoly)"}


def dotaz(url, telo=None):
    zadost = urllib.request.Request(
        url, data=json.dumps(telo).encode() if telo else None, headers=HLAVICKY,
        method="POST" if telo else "GET")
    try:
        with urllib.request.urlopen(zadost, timeout=30) as odpoved:
            return json.load(odpoved), None
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return None, "není ve veřejném rejstříku"
        return None, f"HTTP {e.code}"
    except Exception as e:
        return None, f"{type(e).__name__}: {e}"


def ico_podle_redizo(redizo):
    """IČO z nejstaršího snímku rejstříku MŠMT, kde je subjekt ještě veden."""
    for cesta in sorted(glob.glob("data/msmt_rejstrik/rssz-*.jsonld")):
        data = json.load(open(cesta))
        for subjekt in data["list"]:
            if subjekt.get("redIzo") == redizo:
                return subjekt.get("ico"), subjekt.get("uplnyNazev"), data.get("datumVystupu")
    return None, None, None


def vypis_subjekt(s):
    print(f"  IČO {s.get('ico')} | {s.get('obchodniJmeno')}")
    print(f"    vznik: {s.get('datumVzniku')} | zánik: {s.get('datumZaniku') or '—'}")
    sidlo = s.get("sidlo") or {}
    if sidlo.get("textovaAdresa"):
        print(f"    sídlo: {sidlo['textovaAdresa']}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("ico", nargs="?")
    parser.add_argument("--nazev")
    parser.add_argument("--redizo")
    parser.add_argument("--pocet", type=int, default=50)
    args = parser.parse_args()

    if args.nazev:
        data, chyba = dotaz(f"{ZAKLAD}/vyhledat", {"obchodniJmeno": args.nazev, "pocet": args.pocet})
        if chyba:
            sys.exit(f"Hledání „{args.nazev}“: {chyba}")
        print(f"Nalezeno {data.get('pocetCelkem')} subjektů:")
        for s in data.get("ekonomickeSubjekty", []):
            vypis_subjekt(s)
        return

    ico = args.ico
    if args.redizo:
        ico, nazev, snimek = ico_podle_redizo(args.redizo)
        if not ico:
            sys.exit(f"REDIZO {args.redizo} není v žádném snímku rejstříku MŠMT.")
        print(f"REDIZO {args.redizo} → IČO {ico} („{nazev}“, snímek {snimek})")
    if not ico:
        sys.exit(__doc__)

    data, chyba = dotaz(f"{ZAKLAD}/{ico}")
    if chyba:
        print(f"IČO {ico}: {chyba}")
        print("  Subjekt dnes ve veřejném rejstříku zapsán není. Mechanismus ani datum "
              "zániku z toho neplyne – doložte je sbírkou listin nebo zdrojem školy.")
        return
    vypis_subjekt(data)


if __name__ == "__main__":
    raise SystemExit(main())
