#!/usr/bin/env python3
"""Registr výpisů aktualit: REDIZO → stránka aktualit školy bez kanálu novinek.

    python3 scripts/build-skoly-vypisy.py

Vstupy (sondy z 1. 10. 2026, ``docs/sonda-mimo-rss-2026.md``):

* ``data/sondy/mimo-rss-20261001.json`` – přímé stažení a čtení výpisu,
  ze kterého vznikají zdroje ``typ: html``;
* ``data/sondy/mimo-rss-tinyfish-20261001.json`` – weby, které přímo stáhnout
  nejde, přečtené přes TinyFish Fetch; z nich zdroje ``typ: tinyfish``.

Výstup: ``public/skoly_vypisy.json``. Stejně jako ``skoly_feedy.json`` je to
auditní export: provozní stav zdroje žije v tabulce ``skola_feed``.

Co se vyřazuje a proč:

* školy, které mají kanál novinek v ``skoly_feedy.json`` – RSS má přednost,
  ručí za něj škola;
* výpisy, ze kterých čtečka nevzala ani tři položky – sonda je nepřečetla;
* výpisy, jejichž nejnovější položka je starší než rok – mrtvý archiv nebo
  špatně vybraná stránka (výroční zprávy, inspekční zprávy).
"""
from __future__ import annotations

import datetime as dt
import json
from pathlib import Path

KOREN = Path(__file__).resolve().parent.parent
PRIMO = KOREN / "data" / "sondy" / "mimo-rss-20261001.json"
TINYFISH = KOREN / "data" / "sondy" / "mimo-rss-tinyfish-20261001.json"
FEEDY = KOREN / "public" / "skoly_feedy.json"
VYSTUP = KOREN / "public" / "skoly_vypisy.json"
DEN_SONDY = dt.date(2026, 10, 1)
MAX_STARI_DNU = 365


def ziva(nejnovejsi: str | None) -> bool:
    return bool(nejnovejsi) and (DEN_SONDY - dt.date.fromisoformat(nejnovejsi)).days <= MAX_STARI_DNU


def main() -> None:
    feedy = json.loads(FEEDY.read_text())["skoly"]
    skoly: dict[str, dict] = {}
    vyrazeno = {"ma_feed": 0, "stary_vypis": 0}

    for v in json.loads(PRIMO.read_text())["skoly"]:
        vy = v["vypis"]
        if vy["polozek"] < 3:
            continue
        if v["redizo"] in feedy:
            vyrazeno["ma_feed"] += 1
            continue
        if not ziva(vy["nejnovejsi"]):
            vyrazeno["stary_vypis"] += 1
            continue
        # „z_titulky“: výpis stojí přímo na titulní stránce.
        url = v["stranka_aktualit"] if vy["stav"] == "precteno" else v["web"]
        skoly[v["redizo"]] = {"feed_url": url, "typ": "html", "zdroj": "vypis", "web": v["web"]}

    for v in json.loads(TINYFISH.read_text())["skoly"]:
        if v["polozek"] < 3 or v["redizo"] in skoly:
            continue
        if v["redizo"] in feedy:
            vyrazeno["ma_feed"] += 1
            continue
        if not ziva(v["nejnovejsi"]):
            vyrazeno["stary_vypis"] += 1
            continue
        skoly[v["redizo"]] = {"feed_url": v["stranka_aktualit"], "typ": "tinyfish", "zdroj": "vypis", "web": v["web"]}

    vystup = {
        "meta": {
            "zdroj": [str(PRIMO.relative_to(KOREN)), str(TINYFISH.relative_to(KOREN))],
            "vygenerovano": dt.datetime.now(dt.timezone.utc).date().isoformat(),
            "skript": "scripts/build-skoly-vypisy.py",
            "poznamka": "Auditní export registru výpisů aktualit; provozní stav zdrojů je v tabulce skola_feed.",
            "skol_html": sum(1 for s in skoly.values() if s["typ"] == "html"),
            "skol_tinyfish": sum(1 for s in skoly.values() if s["typ"] == "tinyfish"),
            "vyrazeno": vyrazeno,
        },
        "skoly": dict(sorted(skoly.items())),
    }
    VYSTUP.write_text(json.dumps(vystup, ensure_ascii=False, indent=1) + "\n")
    m = vystup["meta"]
    print(f"Výpisů: {m['skol_html']} přímo, {m['skol_tinyfish']} přes TinyFish; vyřazeno {vyrazeno} → {VYSTUP.relative_to(KOREN)}")


if __name__ == "__main__":
    main()
