#!/usr/bin/env python3
"""Web škol z rejstříku MŠMT: odkaz na stránky školy, kde jsou vyhlášená kritéria přijetí.

Zdroj: data/Rejstrik_skol/Adresar.csv, sloupce RED_IZO a WWW (soupis zdrojů, oddíl 2.4).
Výstup: public/skoly_web.json {REDIZO: URL}. Adresa bez schématu dostane http://.

    python3 scripts/build-skoly-web.py
"""
from __future__ import annotations

import csv
import json
from pathlib import Path

KOREN = Path(__file__).resolve().parent.parent
ZDROJ = KOREN / "data" / "Rejstrik_skol" / "Adresar.csv"
VYSTUP = KOREN / "public" / "skoly_web.json"


def main() -> None:
    with open(ZDROJ, encoding="utf-8-sig") as f:
        oddelovac = ";" if ";" in f.readline() else ","
    weby: dict[str, str] = {}
    with open(ZDROJ, encoding="utf-8-sig") as f:
        for radek in csv.DictReader(f, delimiter=oddelovac):
            redizo, www = (radek.get("RED_IZO") or "").strip(), (radek.get("WWW") or "").strip()
            if not redizo or not www or redizo in weby:
                continue
            www = www.split()[0].rstrip(",;")
            weby[redizo] = www if www.startswith(("http://", "https://")) else f"http://{www}"
    VYSTUP.write_text(json.dumps({"zdroj": ZDROJ.name, "weby": dict(sorted(weby.items()))}, ensure_ascii=False, indent=0) + "\n", encoding="utf-8")
    print(f"zapsáno {len(weby)} škol do {VYSTUP}")


if __name__ == "__main__":
    main()
