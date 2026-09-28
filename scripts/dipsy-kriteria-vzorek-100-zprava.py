#!/usr/bin/env python3
"""Vygeneruje místní věcný souhrn modelového měření ze zmrazeného vzorku."""

import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "data/dipsy-kriteria-2026/llm-pilot/vzorek-100"
OUTPUT = ROOT / "docs/podklady/dipsy-kriteria-vzorek-100-vysledky-2026-09-24.md"


def main():
    data = json.loads((BASE / "srovnani.json").read_text(encoding="utf-8"))
    rows = data["zaznamy"]
    pair = [r for r in rows if r["deepseek"] and r["luna"]]
    if len(pair) != 100:
        raise RuntimeError(f"Není dokončeno dvojí čtení: {len(pair)}/100")
    flags = {kind: Counter(flag for r in rows if r[kind] for flag in r[kind]["nalezy"])
             for kind in ("deepseek", "luna", "opus")}
    sections = []
    for layer in ("sdilene_pdf", "ocr", "dlouhe_pdf", "signal_vahy", "nahodne"):
        group = [r for r in rows if r["vrstva"] == layer]
        if not group:
            continue
        agree = sum(r["deepseek"]["summary"] == r["luna"]["summary"] for r in group)
        both_clean = sum(not r["deepseek"]["nalezy"] and not r["luna"]["nalezy"] for r in group)
        sections.append(f"| {layer} | {len(group)} | {agree} | {both_clean} |")
    matching = sum(r["deepseek"]["summary"] == r["luna"]["summary"] for r in rows)
    text_matching = sum(r["deepseek"]["pravidla"] == r["luna"]["pravidla"] for r in rows)
    both_clean = sum(not r["deepseek"]["nalezy"] and not r["luna"]["nalezy"] for r in rows)
    opus = [r for r in rows if r["opus"]]
    agreed_then_opus_diff = [r for r in opus
                            if r["deepseek"]["summary"] == r["luna"]["summary"]
                            and r["opus"]["summary"] != r["deepseek"]["summary"]]
    regime_diff = sum(r["deepseek"]["record"]["navrh"]["rezim"]
                      != r["luna"]["record"]["navrh"]["rezim"] for r in rows)
    costs = {}
    for kind in ("deepseek", "luna", "opus"):
        records = [r[kind]["record"] for r in rows if r[kind]]
        batch = BASE / kind / "batch-summary.json"
        batch_cost = float((json.loads(batch.read_text(encoding="utf-8")).get("usage") or {}).get("cost") or 0) if batch.exists() else 0
        sync_cost = sum(float(record.get("cena_usd") or 0) for record in records if not record.get("batch_id"))
        costs[kind] = (len(records), sync_cost, batch_cost)
    lines = [
        ("# Výsledek měření přepisu kritérií 2026 na 100 nabídkách" if len(opus) == len(data["pro_opus"])
         else "# Průběžný výsledek měření přepisu kritérií 2026 na 100 nabídkách"),
        "",
        f"Stav: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}. Jde o místní pracovní měření, nikoli o veřejně ověřená kritéria.",
        "",
        "Výběr je stratifikovaný, záměrně obsahuje obtížná PDF. Není reprezentativní pro všechny školy. "
        "Stejné PDF může platit pro různé obory; výstupy jsou vedené k jednotlivým nabídkám roku 2026, 1. kola.",
        "",
        f"- Dvojí čtení: {len(pair)}/100.",
        f"- Shoda číselné struktury: {matching}/100; doslovná shoda normalizovaného textu minim, rovnosti a podmínek: {text_matching}/100. Textová neshoda zahrnuje i různé formulace stejného pravidla.",
        f"- Rozdílně určený režim `pouze_jpz` / `jine` / `nezjisteno`: {regime_diff}/100.",
        f"- Bez mechanického nálezu v obou přepisech: {both_clean}/100. Mechanická kontrola dokazuje jen vnitřní soulad a přítomnost citace, nikoli správný výklad PDF.",
        f"- Třetí čtení Opus: {len(opus)}/{len(data['pro_opus'])} vybraných, z celého vzorku {len(opus)}/100.",
        "",
        "| Vrstva | Nabídek | Shoda číselné struktury | Oba bez mechanického nálezu |",
        "|---|---:|---:|---:|",
        *sections,
        "",
        "## Mechanické nálezy",
        "",
        "| Nález | DeepSeek | Luna | Opus |",
        "|---|---:|---:|---:|",
    ]
    if opus:
        lines.insert(11, f"- Ze shod levnějších modelů u třetím modelem přečtených případů se Opus liší v číselné struktuře u {len(agreed_then_opus_diff)} nabídek. Jde o signál možného společného omylu, nikoli o jeho důkaz.")
    for flag in sorted(set().union(*(set(x) for x in flags.values()))):
        lines.append(f"| `{flag}` | {flags['deepseek'][flag]} | {flags['luna'][flag]} | {flags['opus'][flag]} |")
    lines += ["", "## Náklady", "", "| Model | Nabídek | Přímá volání USD | Dávka USD |",
              "|---|---:|---:|---:|"]
    for kind, (count, sync, batch) in costs.items():
        lines.append(f"| {kind} | {count} | {sync:.6f} | {batch:.6f} |")
    lines += ["", "Dřívějších šest časově vypršených synchronních volání nemá potvrzený účetní záznam v místních výstupech; "
              "součet výše je jen cena vrácená v úspěšných odpovědích a dokončených dávkách.",
              "", "## Meze závěru", "",
              "Modely mohou udělat stejnou chybu. Třetí model je další nezávislý výklad, ne referenční pravda. "
              "Z tohoto měření nelze vyčíslit skutečnou přesnost vůči právně závaznému PDF bez nezávislé adjudikace. "
              "Žádný výstup se nezapisuje do produkční databáze a historická pravidla 2026 nepotvrzují rok 2027.", ""]
    OUTPUT.write_text("\n".join(lines), encoding="utf-8")
    print(OUTPUT)


if __name__ == "__main__":
    main()
