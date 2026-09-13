"""Předání schválené úlohy: větev s výstupy a pull request.

Linka nikdy nepřepíná zobrazené období a nesahá do pracovního stromu správce:
větev vzniká v dočasném git worktree. Bez stavu `schvaleno` se nic nestane.
"""
from __future__ import annotations

import shutil
import subprocess
import tempfile
from pathlib import Path

from . import jadro, zpracovani


def plan(uloha: dict) -> dict:
    zpr = uloha.get("priprava", {}).get("zpracovani") or {}
    soubory = zpr.get("predani", {})
    vetev = f"data/{uloha['sada']}-{uloha['obdobi']}-{uloha['kod']}".lower()
    nadpis = f"data: {uloha['sada']} {uloha['obdobi']} ({uloha['kod']})"
    telo = (
        f"Připravila datová linka, schváleno {uloha.get('rozhodnuti', {}).get('cas', '')} "
        f"přes {uloha.get('rozhodnuti', {}).get('kanal', '')}.\n\n"
        f"Zdroj: {uloha['url']}\n"
        f"sha256: {uloha.get('priprava', {}).get('stazeno', {}).get('sha256', '')}\n\n"
        f"{zpr.get('dopad', '')}\n\n"
        "Po sloučení přepni období v registru: `python3 scripts/stav-datovych-sad.py prepni …`."
    )
    return {"vetev": vetev, "soubory": soubory, "nadpis": nadpis, "telo": telo}


def zajisti_vystupy(uloha: dict, registr: dict, stahni_fn=jadro.stahni) -> None:
    """Pracovní soubory mohou chybět, například v dalším běhu GitHub Actions; připraví se znovu.

    Znovu stažený soubor musí mít stejný otisk jako při oznámení, jinak by se
    předalo něco jiného, než správce schválil.
    """
    zpr = uloha.get("priprava", {}).get("zpracovani") or {}
    if all(Path(zdroj).exists() for zdroj in zpr.get("predani", {})):
        return
    otisk = uloha.get("priprava", {}).get("stazeno", {}).get("sha256")
    stav = uloha["stav"]
    zpracovani.priprav(uloha, registr, stahni_fn=stahni_fn)
    novy = uloha.get("priprava", {}).get("stazeno", {}).get("sha256")
    uloha["stav"] = stav  # příprava přepíše stav; rozhodnutí správce platí dál
    if otisk and novy != otisk:
        raise RuntimeError(f"zdroj se od schválení změnil: sha256 {otisk[:12]}… → {(novy or '')[:12]}…")


def predej(uloha: dict, registr: dict, nanecisto: bool, runner=subprocess.run, stahni_fn=jadro.stahni) -> dict:
    if uloha["stav"] != "schvaleno":
        raise RuntimeError(f"{uloha['kod']}: předat lze jen schválenou úlohu, stav je {uloha['stav']}")
    p = plan(uloha)

    if not p["soubory"]:
        # Sada bez automatického zpracování: předání je jen záznam rozhodnutí.
        krok = registr["sady"][uloha["sada"]].get("aktualizace", {}).get("lidsky_krok", "")
        vysledek = {"plan": p, "poznamka": f"Bez souborů k předání. Další krok: {krok}"}
        if not nanecisto:
            uloha["predani"] = vysledek
            jadro.zmen_stav(uloha, "predano", "bez souborů")
        return vysledek

    prikazy = [
        ["git", "fetch", "origin", "main"],
        ["git", "worktree", "add", "-b", p["vetev"], "<dočasný adresář>", "origin/main"],
        *[["cp", zdroj, f"<dočasný adresář>/{cil}"] for zdroj, cil in p["soubory"].items()],
        ["git", "-C", "<dočasný adresář>", "add", *p["soubory"].values()],
        ["git", "-C", "<dočasný adresář>", "commit", "-m", p["nadpis"]],
        ["git", "-C", "<dočasný adresář>", "push", "-u", "origin", p["vetev"]],
        ["gh", "pr", "create", "--base", "main", "--head", p["vetev"], "--title", p["nadpis"], "--body", "…"],
        ["git", "worktree", "remove", "<dočasný adresář>"],
    ]
    if nanecisto:
        return {"plan": p, "prikazy": prikazy}

    zajisti_vystupy(uloha, registr, stahni_fn=stahni_fn)

    def spust(prikaz: list[str], **kw) -> str:
        r = runner(prikaz, capture_output=True, text=True, cwd=jadro.KOREN, **kw)
        if r.returncode != 0:
            raise RuntimeError(f"{' '.join(prikaz[:3])}: {r.stderr.strip()[:300]}")
        return r.stdout.strip()

    docasny = Path(tempfile.mkdtemp(prefix="linka-"))
    docasny.rmdir()  # git worktree add chce neexistující adresář
    try:
        spust(["git", "fetch", "origin", "main"])
        spust(["git", "worktree", "add", "-b", p["vetev"], str(docasny), "origin/main"])
        for zdroj, cil in p["soubory"].items():
            (docasny / cil).parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(zdroj, docasny / cil)
        spust(["git", "-C", str(docasny), "add", *p["soubory"].values()])
        spust(["git", "-C", str(docasny), "commit", "-m", p["nadpis"]])
        spust(["git", "-C", str(docasny), "push", "-u", "origin", p["vetev"]])
        adresa = spust(["gh", "pr", "create", "--base", "main", "--head", p["vetev"], "--title", p["nadpis"], "--body", p["telo"]])
    finally:
        runner(["git", "worktree", "remove", "--force", str(docasny)], capture_output=True, text=True, cwd=jadro.KOREN)
    uloha["predani"] = {"plan": p, "pull_request": adresa}
    jadro.zmen_stav(uloha, "predano", adresa)
    return uloha["predani"]
