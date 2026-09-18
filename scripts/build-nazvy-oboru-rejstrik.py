#!/usr/bin/env python3
"""Index názvů škol a oborů z rejstříku škol MŠMT pro generátory mimo katalog JPZ.

Snímek rejstříku má kolem 30 MB a do gitu se neukládá, takže ho datová linka v CI nemá.
Generátory souběžných přihlášek a kontextu přihlášek potřebují jen názvy, proto z něj
vzniká malý index v gitu. Snímek určuje registr (sada `msmt-rejstrik-snimky`, pole
`zobrazeno.soubor`). Index nese celý záznam `zobrazeno` z registru a otisk snímku. Revize
téhož období se přebírá příkazem `stav-datovych-sad.py prepni`, který záznam `zobrazeno`
vždy přepíše, takže zastaralý index se pozná i v CI, kde snímek není.

Výstup: data/msmt_rejstrik/nazvy-oboru.json
  skoly:   REDIZO → [název školy, obec]   (jen školy s aspoň jedním oborem)
  obory:   kód oboru → název               (v rejstříku má každý kód jediný název)
  nabidky: REDIZO → [kódy oborů]

    python3 scripts/build-nazvy-oboru-rejstrik.py
    python3 scripts/build-nazvy-oboru-rejstrik.py --snimek /jinde/rssz-RRRR-MM-DD.jsonld
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

KOREN = Path(__file__).resolve().parent.parent
REGISTR = KOREN / "public" / "stav_datovych_sad.json"
SADA = "msmt-rejstrik-snimky"
VYSTUP = KOREN / "data" / "msmt_rejstrik" / "nazvy-oboru.json"


def zobrazeno_v_registru() -> dict:
    return json.loads(REGISTR.read_text(encoding="utf-8"))["sady"][SADA]["zobrazeno"]


def sestav_index(rejstrik: list[dict]) -> dict:
    skoly: dict[str, list] = {}
    obory: dict[str, str] = {}
    nabidky: dict[str, set] = {}
    for zaznam in rejstrik:
        redizo = str(zaznam.get("redIzo") or "")
        if not redizo:
            continue
        for skola in zaznam.get("skolyAZarizeni", []):
            for obor in skola.get("obory", []):
                kod = obor.get("kod")
                if not kod:
                    continue
                if obory.setdefault(kod, obor.get("nazev")) != obor.get("nazev"):
                    raise SystemExit(f"kód oboru {kod} má v rejstříku víc názvů")
                nabidky.setdefault(redizo, set()).add(kod)
                skoly[redizo] = [zaznam.get("zkracenyNazev") or zaznam.get("uplnyNazev"),
                                 (zaznam.get("adresa") or {}).get("obec")]
    return {"skoly": dict(sorted(skoly.items())), "obory": dict(sorted(obory.items())),
            "nabidky": {r: sorted(k) for r, k in sorted(nabidky.items())}}


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--snimek", type=Path, help="jiné umístění souboru snímku, který registr zobrazuje")
    ap.add_argument("--vystup", type=Path, default=VYSTUP)
    a = ap.parse_args()
    zobrazeno = zobrazeno_v_registru()
    snimek = a.snimek or KOREN / zobrazeno["soubor"]
    if not snimek.exists():
        raise SystemExit(f"snímek {snimek} chybí; stáhněte ho podle docs/zdroje-dat.md, oddíl 2.4")
    obsah = snimek.read_bytes()
    index = sestav_index(json.loads(obsah)["list"])
    a.vystup.write_text(json.dumps({
        "meta": {"obdobi": str(zobrazeno["obdobi"]), "registr": zobrazeno, "snimek": snimek.name,
                 "sha256": hashlib.sha256(obsah).hexdigest(), "generator": "scripts/build-nazvy-oboru-rejstrik.py"},
        **index,
    }, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"zapsáno {len(index['skoly'])} škol, {len(index['obory'])} oborů do {a.vystup}")


if __name__ == "__main__":
    main()
