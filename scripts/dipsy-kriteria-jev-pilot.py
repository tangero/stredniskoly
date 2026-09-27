#!/usr/bin/env python3
"""Pět místních sond Jevu nad PDF a návrhy DeepSeek pro kontrolní aplikaci.

Volání se ukládají jen do gitignorovaného data/dipsy-kriteria-2026/llm-pilot/jev-pilot/.
Jev neposkytuje schválení ani důkaz věcné správnosti návrhu.
"""

import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import novinky_jev as jev  # noqa: E402

BASE = ROOT / "data/dipsy-kriteria-2026"
REFERENCE = ROOT / "src/data/kriteria-prijeti-2026-pilot.json"
OUTPUT = BASE / "llm-pilot/jev-pilot"
QUESTIONS_VERSION = 1
MAX_NEW_USD = 0.01


def latest_manifest():
    result = {}
    with (BASE / "manifest.jsonl").open(encoding="utf-8") as stream:
        for line in stream:
            row = json.loads(line)
            result[row["source_id"]] = row
    return result


def case_input(reference, row, deepseek):
    suffix = ".ocr.txt" if row["stav"] == "ocr_text" else ".txt"
    pdf_text = (BASE / "text" / f"{row['sha256']}{suffix}").read_text(encoding="utf-8")
    draft = deepseek["navrh"]
    state = {
        "nabidka": {"kkov": reference["kkov"], "zamereni": reference["zamereni"]},
        "text_pdf": pdf_text[:12_000],
        "modelovy_navrh": {
            "rezim": draft["rezim"], "vzorec": draft["vzorec"],
            "jpz_vaha_pct": draft["jpz_vaha_pct"],
            "max_bodu_celkem": draft["max_bodu_celkem"],
            "dalsi_bodovane_slozky": draft["dalsi_bodovane_slozky"],
            "minima": draft["minima"],
        },
    }
    questions = {
        "rezim": {
            "type": "choice",
            "instructions": "Podle bodů tvořících výsledné pořadí tohoto oboru: jde o prostý součet JPZ ČJL+MAT bez vah a dalších bodů? Minima a pravidla při rovnosti nejsou další body. Když jsou další body nebo váhy, odpověz jine. Když vazba pravidel na obor není jasná, odpověz nezjisteno.",
            "criteria": {
                "pouze_jpz": "Pořadí tvoří jen prostý součet ČJL a MAT.",
                "jine": "Pořadí zahrnuje další body nebo váhy.",
                "nezjisteno": "Nelze bezpečně určit.",
            },
        },
        "vzorec": {
            "type": "noul",
            "instructions": "Je celý vzorec v modelovy_navrh přesně a bezpečně podložen text_pdf pro uvedený obor? Odpověz ne při rozporu mezi počtem testů, vahou, maximem či jinou složkou. Neodvozuj chybějící body.",
        },
        "minima": {
            "type": "noul",
            "instructions": "Jsou všechna minima v modelovy_navrh skutečně doložené číselné hranice nutné pro přijetí? Odpověz ne, když jsou mezi nimi maxima testů nebo nečíselné administrativní podmínky, nebo když výklad hranice není bezpečný.",
        },
        "obor": {
            "type": "choice",
            "instructions": "Je v text_pdf jasné, že hodnocení patří právě oboru a zaměření v nabídce? Rozliš stejný KKOV od odlišného názvu zaměření; při nejasné vazbě vyber nejasne.",
            "criteria": {
                "souhlasi": "Obor a zaměření jsou v souladu, případně PDF má obecné kritérium pro tento obor.",
                "nesouhlasi": "PDF výslovně uvádí jiný obor nebo zaměření.",
                "nejasne": "Vazba na konkrétní zaměření není ze zdroje jasná.",
            },
        },
    }
    return state, questions


def main():
    manifest = latest_manifest()
    refs = json.loads(REFERENCE.read_text(encoding="utf-8"))["zaznamy"]
    OUTPUT.mkdir(parents=True, exist_ok=True)
    spent = 0.0
    for reference in refs:
        source_id = reference["source_id"]
        row = manifest[source_id]
        deepseek = json.loads((BASE / "llm-pilot/deepseek" / f"{source_id}-v1.json").read_text(encoding="utf-8"))
        if deepseek["sha256"] != row["sha256"] or deepseek["rok"] != 2026 or deepseek["kolo"] != 1:
            raise SystemExit(f"Modelový návrh neodpovídá PDF: {source_id}")
        state, questions = case_input(reference, row, deepseek)
        case_hash = hashlib.sha256(json.dumps({"state": state, "questions": questions}, ensure_ascii=False,
                                            sort_keys=True).encode()).hexdigest()
        path = OUTPUT / f"{source_id}-v{QUESTIONS_VERSION}.json"
        if path.exists():
            result = json.loads(path.read_text(encoding="utf-8"))
            if result["sha256"] != row["sha256"] or result["zadani_sha256"] != case_hash:
                raise SystemExit(f"Zdroj či otázky se změnily: {source_id}; zvyšte verzi.")
        else:
            if spent >= MAX_NEW_USD:
                raise SystemExit("Dosažen limit nových nákladů.")
            answer = jev.zeptej_se(state, questions, pokusu=2)
            if not answer or any(name not in answer for name in questions):
                raise SystemExit(f"Jev nevrátil úplnou odpověď: {source_id}")
            result = {
                "source_id": source_id, "sha256": row["sha256"], "rok": 2026, "kolo": 1,
                "model": jev.MODEL, "verze_otazek": QUESTIONS_VERSION,
                "zadani_sha256": case_hash,
                "deepseek_prompt_sha256": deepseek["prompt_sha256"],
                "zpracovano_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                "cena_usd": answer.pop("_cena", None), "odpovedi": answer,
            }
            path.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            spent += float(result["cena_usd"] or 0)
        a = result["odpovedi"]
        print(source_id, a["rezim"]["choice"], a["vzorec"]["noul"],
              a["minima"]["noul"], a["obor"]["choice"], result["cena_usd"], flush=True)
    print(f"Nově vykázaná cena ${spent:.6f}", flush=True)


if __name__ == "__main__":
    main()
