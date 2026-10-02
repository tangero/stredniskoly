"""Kontrola shrnutí inspekčních zpráv pro datovou linku (#266).

Shrnutí obnovuje týdenní workflow CSI Weekly Refresh v pull requestu z větve
codex/csi-weekly-refresh. Linka čte main, takže nesloučené PR jinak nevidí: hlásí proto
školy, kde je nejnovější inspekce novější než shrnutí, a PR otevřené déle než 14 dní.
Výpočet je týž jako novejsiInspekce v src/lib/inspekce-aktualnost.ts.
"""
from __future__ import annotations

import datetime as dt
import json
import subprocess

from . import jadro, komunikace

VETEV_PR = "codex/csi-weekly-refresh"
PR_NEJDELE_DNU = 14


def skoly_s_novejsi_inspekci(seznam: dict, extrakce: dict) -> list[dict]:
    """Školy se shrnutím, u kterých ČŠI eviduje inspekci, jež začala později než shrnutá."""
    vysledek = []
    for redizo, zpravy in extrakce.items():
        datumy = [z.get("inspection_from", "")[:10] for z in zpravy if z.get("inspection_from")]
        inspekce = [i["dateFrom"][:10] for i in (seznam.get(redizo) or {}).get("inspections", []) if i.get("dateFrom")]
        if datumy and inspekce and max(inspekce) > max(datumy):
            vysledek.append({"redizo": redizo, "shrnuti": max(datumy), "novejsi": max(inspekce)})
    return sorted(vysledek, key=lambda s: s["novejsi"], reverse=True)


def otevrene_pr(runner=subprocess.run) -> dict | None:
    vystup = komunikace.gh("pr", "list", "--head", VETEV_PR, "--state", "open",
                           "--json", "number,createdAt,url", runner=runner)
    seznam = json.loads(vystup or "[]")
    return seznam[0] if seznam else None


def kontrola(dnes: dt.date, nanecisto: bool, runner=subprocess.run) -> dict:
    vysledek: dict = {"problemy": []}
    seznam_cesta = jadro.cesta("LINKA_CSI_SEZNAM", "public/csi_inspections.json")
    extrakce_cesta = jadro.cesta("LINKA_CSI_EXTRAKCE", "data/inspection_extractions.json")
    if seznam_cesta.exists() and extrakce_cesta.exists():
        skoly = skoly_s_novejsi_inspekci(json.loads(seznam_cesta.read_text(encoding="utf-8")),
                                         json.loads(extrakce_cesta.read_text(encoding="utf-8"))["schools"])
        vysledek["skol_s_novejsi_inspekci"] = len(skoly)
        vysledek["priklady"] = skoly[:5]
        if skoly:
            vysledek["problemy"].append(
                f"{len(skoly)} škol má novější inspekci, než je shrnutá (např. RED IZO "
                + ", ".join(f"{s['redizo']} {s['novejsi']}" for s in skoly[:3]) + ")")
    if nanecisto:
        vysledek["pr"] = "nanečisto se nezjišťuje"
        return vysledek
    try:
        pr = otevrene_pr(runner)
    except RuntimeError as e:
        vysledek["pr"] = f"nezjištěno: {e}"
        return vysledek
    vysledek["pr"] = pr
    if pr:
        otevreno = dt.date.fromisoformat(pr["createdAt"][:10])
        dni = (dnes - otevreno).days
        pr["dni"] = dni
        if dni > PR_NEJDELE_DNU:
            vysledek["problemy"].append(f"pull request s obnovou inspekcí {pr['url']} je otevřený {dni} dní, nesloučený")
    return vysledek


def text_upozorneni(vysledek: dict) -> str:
    return ("Datová linka prijimackynaskolu.cz: shrnutí inspekcí\n\n"
            + "\n".join(f"- {p}" for p in vysledek["problemy"])
            + "\n\nShrnutí doplní týdenní workflow CSI Weekly Refresh po sloučení jeho pull requestu.")
