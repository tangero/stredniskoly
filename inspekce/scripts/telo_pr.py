#!/usr/bin/env python3
"""Tělo pull requestu týdenní obnovy inspekcí: nová shrnutí ke kontrole proti zprávě (#266).

    python3 scripts/telo_pr.py --zmenene /tmp/zmenene.txt --souhrn /tmp/vyber.json --vystup /tmp/telo.md

--zmenene je seznam výstupů modelu změněných proti main (git diff --name-only), takže tabulka
pokrývá všechny běhy od posledního sloučení. Citace ze zpráv (evidence) se do tabulky nedávají,
mohou v nich být jména (CLAUDE.md, pravidlo 4).
"""
import argparse
import json
import pathlib

DELKA = 160


def zkrat(text: str, delka: int = DELKA) -> str:
    text = " ".join(str(text or "").split()).replace("|", "/")
    return text if len(text) <= delka else text[:delka - 1].rstrip() + "…"


def prvni(polozky: list) -> str:
    if not polozky:
        return "–"
    p = polozky[0]
    return zkrat(f"{p.get('tag', '')}: {p.get('detail', '')}".strip(": "))


def radky_tabulky(report_ids: list, manifest: dict, outputs_dir: pathlib.Path) -> tuple[list, list]:
    radky, chyby = [], []
    for rid in sorted(report_ids, key=lambda r: manifest.get(r, {}).get("inspection_from", ""), reverse=True):
        r = manifest.get(rid, {"report_id": rid})
        try:
            data = json.loads((outputs_dir / f"{rid}.json").read_text(encoding="utf-8"))
        except (OSError, ValueError):
            data = {}
        fp = (data.get("parsed_output") or {}).get("for_parents") or {}
        if data.get("parse_error") or not fp.get("plain_czech_summary"):
            chyby.append(f"`{rid}`: {zkrat(data.get('parse_error') or 'výstup bez shrnutí', 120)}")
            continue
        skola = zkrat(f"{r.get('school_name', '')}, {r.get('city', '')}".strip(", "), 70)
        odkaz = f"[zpráva]({r['source_url']})" if r.get("source_url") else "–"
        radky.append(f"| {r.get('redizo', '–')} | {skola} | {r.get('inspection_from', '–')} | "
                     f"{prvni(fp.get('strengths'))} | {prvni(fp.get('risks'))} | {odkaz} |")
    return radky, chyby


def telo(report_ids: list, souhrn: dict, manifest: dict, outputs_dir: pathlib.Path, poznamky: list) -> str:
    radky, chyby = radky_tabulky(report_ids, manifest, outputs_dir)
    casti = [
        "Týdenní obnova seznamu inspekcí ČŠI a shrnutí nových inspekčních zpráv (workflow `csi-weekly-refresh`, #266).",
        "",
        "Obsahuje aktualizovaný `public/csi_inspections.json`, `data/csi_manifest.json`, `data/csi_diff_latest.json`"
        " a případný snímek v `data/csi_snapshots/`; při nových shrnutích také PDF, texty, výstupy modelu,"
        " `data/inspection_extractions.json` a registr `csi-extrakce`.",
        "",
        "## Shrnutí zpráv",
        "",
        f"- Nová nebo opravená shrnutí od posledního sloučení: **{len(radky)}**",
    ]
    if souhrn:
        casti.append(f"- Čeká na příští běh (nad strop {souhrn.get('strop')}): **{len(souhrn.get('nad_strop', []))}**")
        casti.append(f"- Výjimky (zpráva se nezpracuje): **{len(souhrn.get('vyjimky', []))}**")
    for p in poznamky:
        casti.append(f"- {p}")
    if radky:
        casti += [
            "",
            "### Ke kontrole: vzorek přečti proti zprávě ČŠI",
            "",
            "| RED IZO | Škola | Inspekce od | První přednost | První výtka | Zpráva |",
            "|---|---|---|---|---|---|",
            *radky,
        ]
    if chyby:
        casti += ["", "### Výstupy bez použitelného shrnutí", "", *[f"- {c}" for c in chyby]]
    if souhrn and souhrn.get("nad_strop"):
        casti += ["", "### Nad strop, zpracují se v dalším běhu", "",
                  *[f"- `{r['report_id']}` ({r['inspection_from']})" for r in souhrn["nad_strop"]]]
    if souhrn and souhrn.get("vyjimky"):
        casti += ["", "### Výjimky", "", *[f"- `{r['report_id']}`: {r['duvod']}" for r in souhrn["vyjimky"]]]
    casti += ["", "Slučuje vlastník po přečtení vzorku. Rollback: revert tohoto PR."]
    return "\n".join(casti) + "\n"


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--manifest", default="config/production_reports.json")
    parser.add_argument("--model-id", default="claude_haiku_4_5")
    parser.add_argument("--outputs-dir", default="data/outputs")
    parser.add_argument("--zmenene", default="", help="soubor se změněnými cestami výstupů proti main")
    parser.add_argument("--souhrn", default="", help="souhrn z vyber_chybejici.py")
    parser.add_argument("--poznamka", action="append", default=[])
    parser.add_argument("--vystup", required=True)
    args = parser.parse_args()

    root = pathlib.Path(__file__).resolve().parents[1]
    manifest = {r["report_id"]: r for r in json.loads((root / args.manifest).read_text(encoding="utf-8"))["reports"]}
    report_ids = []
    if args.zmenene and pathlib.Path(args.zmenene).exists():
        for radek in pathlib.Path(args.zmenene).read_text(encoding="utf-8").splitlines():
            cesta = pathlib.PurePosixPath(radek.strip())
            if cesta.suffix == ".json" and cesta.parent.name == args.model_id:
                report_ids.append(cesta.stem)
    souhrn = json.loads(pathlib.Path(args.souhrn).read_text(encoding="utf-8")) if args.souhrn and pathlib.Path(args.souhrn).exists() else {}
    text = telo(report_ids, souhrn, manifest, root / args.outputs_dir / args.model_id, args.poznamka)
    pathlib.Path(args.vystup).write_text(text, encoding="utf-8")
    print(f"Tělo PR: {args.vystup} ({len(report_ids)} výstupů)")


if __name__ == "__main__":
    main()
