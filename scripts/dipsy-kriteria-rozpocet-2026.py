#!/usr/bin/env python3
"""Přepočte doložené modelové náklady a odhad pro zbytek nabídek 2026.

Jde o předběžnou kontrolu rozpočtu, nikoli o záruku ceny poskytovatele.
"""

import importlib.util
import json
from statistics import mean
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "data/dipsy-kriteria-2026/llm-pilot"
SAMPLE = BASE / "vzorek-100"
CAP = 10.0
# Tři starší, v dokumentaci vyčíslené sondy Jevu nemají jednotlivé místní záznamy.
JEV_OLD_PROBES_USD = 0.000062664
# Ceník DeepSeek V4.1 Flash Batch ověřený 25. 9. 2026, USD / milion tokenů.
DEEPSEEK_BATCH_INPUT = 0.112
DEEPSEEK_BATCH_OUTPUT = 0.336

spec = importlib.util.spec_from_file_location("beh", ROOT / "scripts/dipsy-kriteria-vzorek-100-beh.py")
beh = importlib.util.module_from_spec(spec)
spec.loader.exec_module(beh)
spec = importlib.util.spec_from_file_location("usporny", ROOT / "scripts/dipsy-kriteria-usporny-pilot.py")
usporny = importlib.util.module_from_spec(spec)
spec.loader.exec_module(usporny)


def read(path):
    return json.loads(path.read_text(encoding="utf-8"))


def cost_of_records(folder):
    # Jen úspěšné záznamy; účtované chyby (*.error.json) sčítá samostatná položka.
    return sum(float(read(path).get("cena_usd") or 0) for path in folder.glob("*-v*.json")
               if not path.name.endswith(".error.json"))


def spent():
    previous = {
        "haiku_starsi": cost_of_records(BASE),
        "deepseek_starsi": cost_of_records(BASE / "deepseek"),
        "luna_a_opus_pet": sum(cost_of_records(BASE / "nezavisly-vzorek" / kind)
                                for kind in ("luna", "opus")),
        "jev_pet": cost_of_records(BASE / "jev-pilot"),
        "jev_kontrola": cost_of_records(BASE / "jev-kontrola"),
        "jev_starsi_sondy": JEV_OLD_PROBES_USD,
        "usporny_pilot": cost_of_records(BASE / "usporny-v5"),
        "usporny_neuspesne_uctovane": sum(
            float(read(path).get("cena_usd") or 0)
            for path in (BASE / "usporny-v5").glob("*.error.json")
        ),
    }
    standalone = BASE / "cf80b0c9-5404-41b5-946d-a27a95ff768c.json"
    if standalone.exists():
        previous["haiku_standalone"] = float(read(standalone).get("total_cost_usd") or 0)
    for kind in ("deepseek", "luna", "opus"):
        folder = SAMPLE / kind
        previous[f"vzorek_100_{kind}_primo"] = sum(
            float(record.get("cena_usd") or 0)
            for path in folder.glob("*-v1.json")
            if not (record := read(path)).get("batch_id")
        )
        batch = folder / "batch-summary.json"
        previous[f"vzorek_100_{kind}_batch"] = float((read(batch).get("usage") or {}).get("cost") or 0)
    return previous


def forecast():
    catalog = {offer["source_id"]: offer for offer in read(beh.pilot.CATALOG)["data"]}
    manifest = beh.pilot.latest_manifest()
    tested = {item["source_id"] for item in beh.load_sample()}
    state = read(SAMPLE / "deepseek" / "batch-state.json")
    batch_usage = read(SAMPLE / "deepseek" / "batch-summary.json")["usage"]
    batch_chars = sum(len(beh.pilot.prompt_for(catalog[sid], manifest[sid]))
                      for sid in state["source_ids"])
    if not batch_chars or not batch_usage.get("prompt_tokens") or not batch_usage.get("completion_tokens"):
        raise RuntimeError("Chybí úplná spotřeba referenční dávky DeepSeek.")
    remaining = [sid for sid, row in manifest.items()
                 if row.get("stav") in ("text", "ocr_text") and sid in catalog and sid not in tested]
    remaining_chars = sum(len(beh.pilot.prompt_for(catalog[sid], manifest[sid])) for sid in remaining)
    input_tokens = remaining_chars / (batch_chars / batch_usage["prompt_tokens"])
    output_tokens = len(remaining) * batch_usage["completion_tokens"] / len(state["source_ids"])
    deepseek_list_cost = (input_tokens * DEEPSEEK_BATCH_INPUT + output_tokens * DEEPSEEK_BATCH_OUTPUT) / 1_000_000
    batch_list_cost = ((batch_usage["prompt_tokens"] * DEEPSEEK_BATCH_INPUT
                        + batch_usage["completion_tokens"] * DEEPSEEK_BATCH_OUTPUT) / 1_000_000)
    # Historická účtovaná cena zahrnuje případné cache slevy; pro plán používáme i vyšší ceníkový odhad.
    deepseek_observed_ratio = batch_usage["cost"] / batch_list_cost
    jev_average = cost_of_records(BASE / "jev-pilot") / 5
    compact = [read(path) for path in (BASE / "usporny-v5").glob("*-v8.json")]
    if len(compact) < 20:
        raise RuntimeError("Úsporný odhad vyžaduje alespoň dvacet dokončených případů v8.")
    compact_chars = sum(row["prompt_znaku"] for row in compact)
    compact_tokens = sum(row["spotreba"]["prompt_tokens"] for row in compact)
    compact_out = sum(row["spotreba"]["completion_tokens"] for row in compact)
    compact_remaining_chars = sum(len(usporny.prompt_for(catalog[sid], manifest[sid])) for sid in remaining)
    compact_estimate_in = compact_remaining_chars * compact_tokens / compact_chars
    compact_estimate_out = len(remaining) * mean(row["spotreba"]["completion_tokens"] for row in compact)
    compact_list_cost = (compact_estimate_in * DEEPSEEK_BATCH_INPUT
                         + compact_estimate_out * DEEPSEEK_BATCH_OUTPUT) / 1_000_000
    return {
        "zbyva_nabidek": len(remaining),
        "odhad_vstupnich_tokenu": round(input_tokens),
        "odhad_vystupnich_tokenu": round(output_tokens),
        "deepseek_cenik_usd": round(deepseek_list_cost, 4),
        "deepseek_pri_pilotni_sleve_usd": round(deepseek_list_cost * deepseek_observed_ratio, 4),
        "jev_podle_peti_sond_usd": round(len(remaining) * jev_average, 4),
        "usporny_v8_mereno_nabidek": len(compact),
        "usporny_zbytek_znaku": compact_remaining_chars,
        "usporny_odhad_vstupnich_tokenu": round(compact_estimate_in),
        "usporny_odhad_vystupnich_tokenu": round(compact_estimate_out),
        "usporny_cenikovy_odhad_usd": round(compact_list_cost, 4),
        "usporny_cenikovy_odhad_s_jevem_usd": round(compact_list_cost + len(remaining) * jev_average, 4),
        "poznamka": "Starý odhad používá dávku 85 nabídek; úsporný poměr tokenů ke znakům a délku odpovědi počítá z dokončených sond v8. Žádný z odhadů není záruka kvality ani ceny.",
    }


def main():
    records = spent()
    known = sum(records.values())
    result = {"limit_usd": CAP, "dolozene_jiz_utraceno_usd": round(known, 6),
              "zbyva_podle_mistnich_zaznamu_usd": round(CAP - known, 6),
              "rozpis": {key: round(value, 6) for key, value in records.items()},
              "odhad": forecast(),
              "nezjistene_naklady": "Možné účtování šesti starších časově vypršených a jednoho nového nedokončeného synchronního volání není místně doložené."}
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
