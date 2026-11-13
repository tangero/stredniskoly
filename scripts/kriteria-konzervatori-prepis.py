#!/usr/bin/env python3
"""Strojový přepis kritérií přijetí konzervatoří do zjednodušeného schématu (zkušební běh #504).

Konzervatoře mají jen talentovou zkoušku, proto schéma z `dipsy-kriteria-hromadny-prepis.py`
(podíl jednotné přijímací zkoušky) nepoužíváme: přepisují se části talentové zkoušky, body,
podmínka úspěchu, další kritéria a způsob pořadí. Vstupem je textová podoba stažených stránek
a PDF školy (stahuje se ručně podle ohlášení v issue, skript nic nestahuje), výstupem jeden
JSON na školu. Výstup je podklad pro ruční kontrolu proti zdroji; do dat webu jde až
zkontrolovaný zápis v `src/data/kriteria-konzervatori-2027.json`.

    python3 scripts/kriteria-konzervatori-prepis.py --manifest <manifest.json> --vystup <složka>

Manifest: {"skoly": [{"redizo": "…", "nazev": "…", "obory": ["Hudba", …],
           "soubory": ["cesta/k/textu.txt", …], "klic": "volitelný název výstupu"}]}

Text se ořízne na MAX_ZNAKU; školu s dlouhými dokumenty rozděl na víc položek po oborech
(stejné redizo, jiný `klic`), jinak se pozdější dokumenty do přepisu nedostanou.

Pojistky rozpočtu: strop běhu (--strop, výchozí 2 USD podle mandátu #504) se kontroluje před
každým voláním s rezervou; chybí-li v odpovědi účtovaná cena, běh se zastaví. Hotové školy
se přeskočí, takže běh jde přerušit a spustit znovu.
"""
from __future__ import annotations

import argparse
import json
import os
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

MODEL = "deepseek/deepseek-v4.1-flash"  # stejný model jako přepis kritérií 2026
REZERVA_NA_VOLANI = 0.01
MAX_ZNAKU = 120_000

INSTRUKCE = """Jsi pečlivý přepisovač. Z dodaného textu kritérií přijímacího řízení konzervatoře \
(školní rok 2027/2028) vypiš pro každý uvedený obor vzdělání, jak škola hodnotí talentovou zkoušku \
a jak řadí uchazeče. Piš česky, stručně a jen to, co v textu výslovně stojí; nic nedopočítávej ani \
nedomýšlej. Když údaj v textu není, dej null nebo prázdný seznam.

- casti: části talentové zkoušky v pořadí z textu; max_body jen když text uvádí maximum bodů části; \
minimum je slovní podmínka postupu nebo úspěchu v části (např. „nejméně 48 bodů“), jinak null.
- celkem_max_body: maximum bodů celé talentové zkoušky, jen když ho text uvádí jako číslo.
- podminka_uspechu: kdy uchazeč talentovou zkoušku splnil (hranice bodů, známka), jednou větou.
- dalsi_kriteria: další kritéria mimo talentovou zkoušku (prospěch ze ZŠ, zdravotní způsobilost…), \
každé jednou krátkou větou.
- poradi: jak škola sestaví pořadí a jak rozhoduje při shodě bodů, jednou až dvěma větami.
- termin_zkousky: termíny talentové zkoušky 1. kola, jak je uvádí text.
- obor_v_textu_chybi: true, když text pro obor kritéria vůbec neobsahuje."""

CAST = {"type": "object", "additionalProperties": False, "required": ["nazev", "max_body", "minimum"],
        "properties": {"nazev": {"type": "string"}, "max_body": {"type": ["number", "null"]},
                       "minimum": {"type": ["string", "null"]}}}
OBOR = {"type": "object", "additionalProperties": False,
        "required": ["obor", "obor_v_textu_chybi", "casti", "celkem_max_body", "podminka_uspechu",
                     "dalsi_kriteria", "poradi", "termin_zkousky"],
        "properties": {"obor": {"type": "string"}, "obor_v_textu_chybi": {"type": "boolean"},
                       "casti": {"type": "array", "items": CAST},
                       "celkem_max_body": {"type": ["number", "null"]},
                       "podminka_uspechu": {"type": ["string", "null"]},
                       "dalsi_kriteria": {"type": "array", "items": {"type": "string"}},
                       "poradi": {"type": ["string", "null"]},
                       "termin_zkousky": {"type": ["string", "null"]}}}
SCHEMA = {"type": "object", "additionalProperties": False, "required": ["obory"],
          "properties": {"obory": {"type": "array", "items": OBOR}}}


def prompt(skola: dict) -> str:
    casti = []
    for cesta in skola["soubory"]:
        casti.append(f"=== DOKUMENT {Path(cesta).name} ===\n{Path(cesta).read_text(encoding='utf-8')}")
    text = "\n\n".join(casti)[:MAX_ZNAKU]
    return (f"{INSTRUKCE}\n\nŠkola: {skola['nazev']} (RED IZO {skola['redizo']}). "
            f"Obory: {', '.join(skola['obory'])}.\n\n{text}")


def zavolej(skola: dict, klic: str) -> dict:
    telo = {
        "model": MODEL,
        "messages": [{"role": "system", "content": "Pracuj jen s dodaným textem; nepoužívej nástroje."},
                     {"role": "user", "content": prompt(skola)}],
        "response_format": {"type": "json_schema", "json_schema": {
            "name": "kriteria_konzervatore_v1", "strict": True, "schema": SCHEMA}},
        "provider": {"only": ["DeepInfra"], "allow_fallbacks": False, "require_parameters": True},
        "reasoning": {"effort": "none"}, "temperature": 0, "max_tokens": 6000, "stream": False,
    }
    req = urllib.request.Request(
        "https://openrouter.ai/api/v1/chat/completions",
        data=json.dumps(telo, ensure_ascii=False).encode("utf-8"),
        headers={"Authorization": f"Bearer {klic}", "Content-Type": "application/json"},
    )
    for pokus in range(3):
        try:
            with urllib.request.urlopen(req, timeout=300) as odpoved:
                return json.load(odpoved)
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 502, 503) and pokus < 2:
                time.sleep(10 * (pokus + 1))
                continue
            raise
    raise RuntimeError("nedosažitelné")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--manifest", required=True, type=Path)
    parser.add_argument("--vystup", required=True, type=Path)
    parser.add_argument("--strop", type=float, default=2.0, help="strop výdajů běhu v USD")
    args = parser.parse_args()
    klic = os.environ.get("OPENROUTER_API_KEY")
    if not klic:
        raise SystemExit("chybí OPENROUTER_API_KEY")
    args.vystup.mkdir(parents=True, exist_ok=True)
    utraceno = 0.0
    for skola in json.loads(args.manifest.read_text(encoding="utf-8"))["skoly"]:
        cil = args.vystup / f"{skola.get('klic', skola['redizo'])}.json"
        if cil.exists():
            continue
        if utraceno + REZERVA_NA_VOLANI > args.strop:
            print(f"strop {args.strop} USD, zastaveno před {skola['redizo']}")
            break
        odpoved = zavolej(skola, klic)
        cena = (odpoved.get("usage") or {}).get("cost")
        if cena is None:
            raise SystemExit(f"{skola['redizo']}: chybí účtovaná cena, běh zastaven")
        utraceno += float(cena)
        volba = odpoved["choices"][0]
        zaznam = {"redizo": skola["redizo"], "soubory": [Path(c).name for c in skola["soubory"]], "model": odpoved.get("model", MODEL), "cena_usd": cena,
                  "dokoncen": volba.get("finish_reason") == "stop",
                  "zpracovano_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                  "prepis": json.loads(volba["message"]["content"]) if volba.get("finish_reason") == "stop" else None}
        cil.write_text(json.dumps(zaznam, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"{cil.stem}: {cena:.4f} USD, celkem {utraceno:.4f} USD")
    print(f"utraceno v běhu: {utraceno:.4f} USD")


if __name__ == "__main__":
    main()
