#!/usr/bin/env python3
"""Registr zdrojů školních novinek: REDIZO → adresa feedu.

    python3 scripts/build-skoly-feedy.py

Vstup: ``data/sondy/rss-webu-skol-20260919.json`` (sonda feedů školních webů).
Výstup: ``public/skoly_feedy.json`` – auditní export registru do repozitáře.

Registr v repozitáři je **auditní export, ne podmínka provozu**
(``docs/skolske-novinky-rss-2027.md`` oddíl 3.1): aktivace zdroje je
automatická a provozní stav zdroje žije v tabulce ``skola_feed``. PR je
povinný pro změny pravidel klasifikace, ne pro nově nalezenou adresu.

Co se vyřazuje a proč:

* ``stav`` jiný než ``platny`` – sonda feed neotevřela;
* feedy komentářů (``comment`` v adrese) – nejsou to novinky školy;
* uhádnutá cesta se bere až tehdy, když web žádný feed nedeklaruje, a značí se
  ``zdroj: fallback`` – u deklarovaného feedu ručí škola, u uhádnutého nikdo;
* školy bez feedu – ty obslouží až pozdější zdroje v pořadí
  (sitemap, čtení výpisu aktualit).

Při více platných feedech se bere první nekomentářový: sonda je řadí v pořadí,
v jakém je web deklaruje, a hlavní kanál stránky bývá první.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

KOREN = Path(__file__).resolve().parent.parent
SONDA = KOREN / "data" / "sondy" / "rss-webu-skol-20260919.json"
VYSTUP = KOREN / "public" / "skoly_feedy.json"


def je_komentarovy(url: str) -> bool:
    return "comment" in url.lower()


def vyber_feed(skola: dict) -> dict | None:
    for f in skola.get("feedy") or []:
        if f.get("stav") != "platny":
            continue
        url = f.get("url") or ""
        if not url.startswith("http") or je_komentarovy(url):
            continue
        return {
            "feed_url": url,
            "typ": "atom" if "atom" in (f.get("typ") or "").lower() else "rss",
            "zdroj": "deklarovany",
        }
    # Web feed nedeklaruje, ale sonda ho našla na obvyklé cestě (/feed/, /rss.xml).
    # Zdroj se pozná podle původu, protože uhádnutá cesta se může časem rozejít
    # s tím, co škola opravdu publikuje.
    fallback = skola.get("fallback")
    if fallback and fallback.startswith("http") and not je_komentarovy(fallback):
        return {"feed_url": fallback, "typ": "rss", "zdroj": "fallback"}
    return None


def main() -> None:
    sonda = json.loads(SONDA.read_text())
    zaznamy: dict[str, dict] = {}
    for s in sonda["skoly"]:
        vybrany = vyber_feed(s)
        if vybrany:
            zaznamy[s["redizo"]] = {**vybrany, "web": s.get("finalni_url") or s.get("web")}

    vystup = {
        "meta": {
            "zdroj": str(SONDA.relative_to(KOREN)),
            "vygenerovano": datetime.now(timezone.utc).date().isoformat(),
            "skript": "scripts/build-skoly-feedy.py",
            "poznamka": "Auditní export registru; provozní stav zdrojů je v tabulce skola_feed.",
            "skol_se_zdrojem": len(zaznamy),
            "skol_v_sonde": len(sonda["skoly"]),
        },
        "skoly": dict(sorted(zaznamy.items())),
    }
    VYSTUP.write_text(json.dumps(vystup, ensure_ascii=False, indent=1) + "\n")
    print(f"Zapsáno {len(zaznamy)} zdrojů z {len(sonda['skoly'])} škol do {VYSTUP.relative_to(KOREN)}")


if __name__ == "__main__":
    main()
