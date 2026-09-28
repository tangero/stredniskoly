#!/usr/bin/env python3
"""Pětice pro změření kratšího výstupu DeepSeek; nic nezveřejňuje."""

import argparse
import hashlib
import importlib.util
import json
import os
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "data/dipsy-kriteria-2026"
OUTPUT = BASE / "llm-pilot/usporny-v5"
MODEL = "deepseek/deepseek-v4.1-flash"
VERSION = 8
MAX_NEW_USD = 0.16
IDS = [
    "6162591f-c2b2-4f1b-aaae-7c76d897f32e",  # deklarovaný podíl není přepočet
    "71f50b5f-092f-4d40-b722-185229a39a47",  # mnoho oborů v jednom PDF
    "a7b38b25-138c-4532-92c7-d3f7a316a85b",  # OCR, známky až při rovnosti
    "b94edc27-31e2-4c92-851c-aaac15dde71b",  # dlouhé PDF
    "aa2287b2-20f0-4017-a7aa-235223292753",  # školní test a pohovor
]

spec = importlib.util.spec_from_file_location("pilot", ROOT / "scripts/dipsy-kriteria-llm-vzorek.py")
pilot = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pilot)
ds_spec = importlib.util.spec_from_file_location("ds", ROOT / "scripts/dipsy-kriteria-deepseek-vzorek.py")
ds = importlib.util.module_from_spec(ds_spec)
ds_spec.loader.exec_module(ds)
section_spec = importlib.util.spec_from_file_location("section", ROOT / "scripts/dipsy-kriteria-sekce.py")
section = importlib.util.module_from_spec(section_spec)
section_spec.loader.exec_module(section)


def obj(properties):
    return {"type": "object", "properties": properties, "required": list(properties)}


number = {"type": ["number", "null"]}
string = {"type": "string"}
proof = obj({"strana": {"type": "integer"}, "citace": string})
SCHEMA = obj({
    "rezim": {"type": "string", "enum": ["pouze_jpz", "jine", "nezjisteno"]},
    "vazba_oboru": {"type": "string", "enum": ["jasna", "nejasna", "jiny_obor"]},
    "jpz": obj({
        "cjl_max": number, "mat_max": number,
        "prepoctovy_koeficient_pct": number,
        "deklarovany_podil_pct": number,
        "max_po_prepoctu": number,
    }),
    "slozky": {"type": "array", "items": obj({
        "nazev": string, "surove_max": number, "koeficient_pct": number,
        "max_po_prepoctu": number, "doklad": proof,
    })},
    "vyslovne_max_celkem": number,
    "minima": {"type": "array", "items": obj({"popis": string, "doklad": proof})},
    "rovnost": {"type": "array", "items": string},
    "doklady_jpz_a_celku": {"type": "array", "items": obj({
        "pole": {"type": "string", "enum": ["cjl_max", "mat_max", "prepoctovy_koeficient_pct",
                                           "deklarovany_podil_pct", "max_po_prepoctu", "vyslovne_max_celkem"]},
        "doklad": proof,
    })},
    "nejasnosti": {"type": "array", "items": string},
})

INSTRUCTIONS = """Z textu PDF přepiš bodování JEDNOHO uvedeného oboru pro rok 2026, 1. kolo.
Najdi sekci jeho KKOV a zaměření; body sousedních oborů nepřebírej. Pokud vazba
není jasná, nastav vazba_oboru=nejasna, nedoplňuj odhadnutá čísla a řekni proč.
`pouze_jpz` znamená bodové pořadí jen ČJL+MAT bez přepočtu a dalších bodů;
minima a pravidla při rovnosti se nepočítají jako další body.
Do slozky patří jen další BODY měnící součet, ne administrativní podmínky,
minima nebo pravidla při rovnosti. Při `jine` musí být skutečná změna bodů.
`prepoctovy_koeficient_pct` vyplň jen při výslovném NÁSOBENÍ bodů JPZ.
Samotná věta „JPZ tvoří 60 % hodnocení“ může být deklarovaný podíl: je-li
maximum JPZ 100 a celek 166 (=100+56+10), zapiš koeficient=null,
deklarovany_podil_pct=60 a max_po_prepoctu=100. Naopak při JPZ 60 % ze
100 bodů se JPZ přepočte na maximum 60. Surové a přepočtené maximum odděl.
`vyslovne_max_celkem` uveď jen když ho PDF výslovně píše, jinak null.
Do `minima` dávej jen skutečně stanovené hranice; výrok „minimum není
stanoveno“ patří do `nejasnosti` pouze tehdy, je-li jeho výklad sporný.
Přepočet (ČJL+MAT)×koeficient/100 a součet maxim složek ověř před odpovědí;
rozpor napiš stručně do nejasnosti. Lepší termín JPZ není lepší předmět.
Každé číslo dolož krátkou DOSLOVNOU citací a číslem strany; citace musí být
na této stránce. Minima jsou jen skutečné hranice, ne maxima. Rovnost napiš
heslovitě. Nejasnosti piš jen pro skutečné problémy, nejvýše jednou větou.
Do `nejasnosti` nepiš kontrolní součet, který sedí, ani jiné potvrzení.
Před odevzdáním proveď tyto kontroly a oprav odpověď, pokud nesedí:
1. Neprázdné `slozky` vždy znamenají `rezim=jine`, nikdy `pouze_jpz`.
2. Věta „získané body JPZ se do celkového výsledku započítávají váhou 60 %;
   při zisku 100 bodů získá uchazeč 60 bodů“ znamená
   `prepoctovy_koeficient_pct=60`, `max_po_prepoctu=60`.
3. Věta „JPZ se podílí na celkovém hodnocení 60 %“ při maximech
   JPZ 100 + jiné složky 56 + 10 = celkem 166 znamená informativní podíl,
   tedy `prepoctovy_koeficient_pct=null`, `max_po_prepoctu=100`.
4. Je-li výslovné celkové maximum, sečti JPZ PO přepočtu a maxima složek.
   Neshoduje-li se součet, znovu zkontroluj váhu, překryv složek a jejich
   příslušnost k oboru. Když rozpor zůstane, popiš jej v `nejasnosti`.
Odpověz úsporně podle schématu, bez volné prózy mimo pole JSON."""


def prompt_for(offer, row):
    suffix = ".ocr.txt" if row["stav"] == "ocr_text" else ".txt"
    pages = (BASE / "text" / f"{row['sha256']}{suffix}").read_text(encoding="utf-8").split("\f")
    chosen, _ = section.select(offer["kkov"], pages)
    text = "\n\n".join(f"=== STRANA {index} ===\n{page}"
                        for index, page in chosen if page.strip())
    return (f"{INSTRUCTIONS}\n\nNabídka {offer['source_id']}; REDIZO {offer['redizo']}; "
            f"KKOV {offer['kkov']}; zaměření {offer.get('zamereni') or '(bez zaměření)'}; "
            f"otisk PDF {row['sha256']}\n\n{text}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--limit", type=int, default=5)
    parser.add_argument("--source-id", action="append")
    parser.add_argument("--vzorek-po-vrstve", type=int, default=0,
                        help="tolik nabídek z každé vrstvy zmrazeného vzorku 100")
    args = parser.parse_args()
    if not 1 <= args.limit <= len(IDS) or not 0 <= args.vzorek_po_vrstve <= 10:
        parser.error("--limit musí být 1 až 5, --vzorek-po-vrstve 0 až 10")
    if args.source_id and args.vzorek_po_vrstve:
        parser.error("Použijte buď --source-id, nebo --vzorek-po-vrstve")
    chosen = args.source_id or IDS[:args.limit]
    if args.vzorek_po_vrstve:
        sample = json.loads((BASE / "vzorek-100.json").read_text(encoding="utf-8"))["nabidky"]
        counts = {}
        chosen = []
        for item in sample:
            layer = item["vrstva"]
            if counts.get(layer, 0) < args.vzorek_po_vrstve:
                chosen.append(item["source_id"])
                counts[layer] = counts.get(layer, 0) + 1
        if len(chosen) != 5 * args.vzorek_po_vrstve:
            raise RuntimeError("Vzorek neobsahuje požadovaný počet nabídek v každé vrstvě")
    offers = {item["source_id"]: item for item in json.loads(pilot.CATALOG.read_text(encoding="utf-8"))["data"]}
    manifest = pilot.latest_manifest()
    OUTPUT.mkdir(parents=True, exist_ok=True)
    key = ds.api_key()
    spent = 0.0
    errors = 0
    for sid in chosen:
        row = manifest[sid]
        prompt = prompt_for(offers[sid], row)
        digest = hashlib.sha256(prompt.encode("utf-8")).hexdigest()
        target = OUTPUT / f"{sid}-v{VERSION}.json"
        failed = OUTPUT / f"{sid}-v{VERSION}.error.json"
        if target.exists():
            record = json.loads(target.read_text(encoding="utf-8"))
            if record["prompt_sha256"] != digest or record["sha256"] != row["sha256"]:
                raise RuntimeError(f"Starší výsledek má jiné zadání: {sid}")
        elif failed.exists():
            error = json.loads(failed.read_text(encoding="utf-8"))
            if error["prompt_sha256"] != digest or error["sha256"] != row["sha256"]:
                raise RuntimeError(f"Starší chyba má jiné zadání: {sid}")
            print(sid, "nedokonceno", error.get("duvod"), error.get("cena_usd"), flush=True)
            errors += 1
            continue
        else:
            if spent >= MAX_NEW_USD:
                raise RuntimeError("Dosažen cenový strop úsporného pilotu.")
            body = {
                "model": MODEL,
                "messages": [{"role": "system", "content": "Pracuj jen s dodaným PDF; nepoužívej nástroje."},
                             {"role": "user", "content": prompt}],
                "response_format": {"type": "json_schema", "json_schema": {
                    "name": "kriteria_usporny_v5", "strict": True, "schema": ds.strict_schema(SCHEMA)}},
                "provider": {"only": ["DeepInfra"], "allow_fallbacks": False, "require_parameters": True},
                "reasoning": {"effort": "none"}, "temperature": 0,
                "max_tokens": 3200, "stream": False,
            }
            req = urllib.request.Request("https://openrouter.ai/api/v1/chat/completions",
                                         data=json.dumps(body, ensure_ascii=False).encode("utf-8"),
                                         headers={"Authorization": f"Bearer {key}",
                                                  "Content-Type": "application/json"})
            with urllib.request.urlopen(req, timeout=300) as response:
                answer = json.load(response)
            choice = answer["choices"][0]
            usage = answer.get("usage") or {}
            if choice.get("finish_reason") != "stop" or not choice["message"].get("content"):
                error = {"source_id": sid, "sha256": row["sha256"], "rok": 2026, "kolo": 1,
                         "prompt_sha256": digest, "duvod": choice.get("finish_reason"),
                         "zpracovano_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                         "spotreba": usage, "cena_usd": usage.get("cost")}
                failed.write_text(json.dumps(error, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
                spent += float(usage.get("cost") or 0)
                errors += 1
                print(sid, "nedokonceno", error["duvod"], error["cena_usd"], flush=True)
                continue
            if usage.get("cost") is None:
                raise RuntimeError("Chybí účtovaná cena; další volání zastavena.")
            record = {"source_id": sid, "sha256": row["sha256"], "rok": 2026, "kolo": 1,
                      "model": answer.get("model", MODEL), "verze_zadani": VERSION,
                      "prompt_sha256": digest, "zpracovano_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                      "prompt_znaku": len(prompt), "spotreba": usage, "cena_usd": usage["cost"],
                      "navrh": json.loads(choice["message"]["content"])}
            temp = target.with_suffix(".tmp")
            temp.write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            os.replace(temp, target)
            spent += float(usage["cost"])
        print(sid, record["navrh"]["rezim"], record["spotreba"].get("completion_tokens"),
              record["cena_usd"], flush=True)
    print(f"Nová cena ${spent:.6f}; nedokončeno {errors}", flush=True)


if __name__ == "__main__":
    main()
