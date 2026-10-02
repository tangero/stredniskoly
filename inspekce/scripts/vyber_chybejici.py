#!/usr/bin/env python3
"""Vybere inspekční zprávy bez shrnutí pro týdenní běh (#266).

Chybějící je zpráva z manifestu, která nemá použitelné shrnutí v žádném modelu z WEB_MODELY,
tedy výstup, který by export pro web převzal. run_extraction.py přeskakuje jen výstupy
téhož modelu, proto výběr dělá tento skript: bez něj by týdenní běh shrnul znovu zprávy,
které už shrnul jiný model.

    python3 scripts/vyber_chybejici.py --vystup /tmp/tydenni_reports.json --souhrn /tmp/vyber.json

Vybere nejvýš strop zpráv (config/tydenni.json) od nejnovější inspekce. Zbytek vypíše jako
„nad strop“, nečitelné texty a zprávy bez odkazu jako výjimky. Síť nepoužívá.
"""
import argparse
import json
import pathlib

from export_extractions import MIN_SLOV, WEB_MODELY


def ma_shrnuti(outputs_dir: pathlib.Path, report_id: str, modely=WEB_MODELY) -> bool:
    """Má zpráva výstup, který export pro web převezme (bez chyby a s textem shrnutí)?"""
    for model_id in modely:
        cesta = outputs_dir / model_id / f"{report_id}.json"
        if not cesta.exists():
            continue
        try:
            data = json.loads(cesta.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            continue
        parsed = data.get("parsed_output")
        if parsed is None or data.get("parse_error") is not None:
            continue
        if (parsed.get("for_parents") or {}).get("plain_czech_summary"):
            return True
    return False


def vyber(reports: list, outputs_dir: pathlib.Path, slova: dict, strop: int) -> dict:
    """slova: report_id -> počet slov z indexu textů (chybí, když text ještě nevznikl)."""
    chybejici, vyjimky = [], []
    for r in reports:
        if ma_shrnuti(outputs_dir, r["report_id"]):
            continue
        if not r.get("source_url"):
            vyjimky.append({**r, "duvod": "zpráva nemá odkaz na PDF"})
            continue
        if r["report_id"] in slova and slova[r["report_id"]] < MIN_SLOV:
            vyjimky.append({**r, "duvod": f"nečitelný text ({slova[r['report_id']]} slov i po OCR)"})
            continue
        chybejici.append(r)
    chybejici.sort(key=lambda r: (r["inspection_from"], r["report_id"]), reverse=True)
    return {
        "pocet_chybejicich": len(chybejici),
        "vybrane": chybejici[:max(0, strop)],
        "nad_strop": chybejici[max(0, strop):],
        "vyjimky": vyjimky,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--manifest", default="config/production_reports.json")
    parser.add_argument("--konfigurace", default="config/tydenni.json")
    parser.add_argument("--outputs-dir", default="data/outputs")
    parser.add_argument("--texts-dir", default="data/texts")
    parser.add_argument("--strop", type=int, default=None, help="přepíše strop z konfigurace")
    parser.add_argument("--vystup", default="config/tydenni_reports.json", help="dílčí manifest vybraných zpráv")
    parser.add_argument("--souhrn", default="", help="JSON s vybranými, nad stropem a výjimkami")
    args = parser.parse_args()

    root = pathlib.Path(__file__).resolve().parents[1]
    reports = json.loads((root / args.manifest).read_text(encoding="utf-8"))["reports"]
    konfigurace = json.loads((root / args.konfigurace).read_text(encoding="utf-8"))
    strop = konfigurace["strop"] if args.strop is None else args.strop
    index_cesta = root / args.texts_dir / "index.json"
    index = json.loads(index_cesta.read_text(encoding="utf-8"))["reports"] if index_cesta.exists() else []
    slova = {r["report_id"]: r["word_count"] for r in index}

    vysledek = vyber(reports, root / args.outputs_dir, slova, strop)
    vystup = root / args.vystup
    vystup.parent.mkdir(parents=True, exist_ok=True)
    vystup.write_text(json.dumps({"reports": vysledek["vybrane"]}, ensure_ascii=False, indent=2), encoding="utf-8")
    if args.souhrn:
        pathlib.Path(args.souhrn).write_text(json.dumps({**vysledek, "strop": strop}, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"chybejici": vysledek["pocet_chybejicich"], "vybrane": len(vysledek["vybrane"]),
                      "nad_strop": len(vysledek["nad_strop"]), "vyjimky": len(vysledek["vyjimky"]), "strop": strop,
                      "manifest": str(vystup)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
