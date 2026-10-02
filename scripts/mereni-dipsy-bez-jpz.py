#!/usr/bin/env python3
"""Pokrytí karet DiPSy u denních nezkrácených nabídek bez JPZ (issue #244, etapa 0, otázka 1).

  python3 scripts/mereni-dipsy-bez-jpz.py            # obnovitelný sběr karet, pak souhrn
  python3 scripts/mereni-dipsy-bez-jpz.py --souhrn   # jen souhrn z uloženého manifestu

Způsob schválil vlastník v issue #244 (pravidlo 7 v CLAUDE.md): jeden GET na kartu
`/v1/skol-oboro-forma/{ID_SOF}`, jedno spojení, prodleva 0,5 s, konec při 429 nebo
pěti chybách serveru za sebou. Z karty se ukládají jen identifikační pole a příznak
PDF podmínek přijetí, žádné kontakty. Manifest je v .gitignore, commituje se jen
souhrn `docs/podklady/mereni-dipsy-bez-jpz-2026.json`.
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import re
import sys
import time
import urllib.error
import urllib.request
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
API = "https://api.dipsy.gov.cz/v1/skol-oboro-forma/{id}"
MANIFEST = ROOT / "data/dipsy-karty-bez-jpz-2026/manifest.jsonl"
SOUHRN = ROOT / "docs/podklady/mereni-dipsy-bez-jpz-2026.json"
PRODLEVA = 0.5
MAX_CHYB_ZA_SEBOU = 5
USER_AGENT = "PrijimackyNaSkolu-mereni/0.1 (+https://www.prijimackynaskolu.cz/)"
UUID = re.compile(r"^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$")


class Zastavit(Exception):
    """Server žádá zpomalení nebo opakovaně selhává; běh končí a píše se do issue."""


def _mereni():
    spec = importlib.util.spec_from_file_location("mereni_obory_bez_jpz", ROOT / "scripts/mereni-obory-bez-jpz.py")
    modul = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(modul)
    return modul


def nabidky() -> list[dict]:
    """Denní nezkrácené nabídky bez JPZ, stejný výběr jako v mereni-obory-bez-jpz.py."""
    m = _mereni()
    return [
        {"id_sof": str(x["ID_SOF"]), "redizo": str(x["REDIZO"]), "kkov": str(x["KKOV"] or ""),
         "kategorie": m.kategorie(str(x["KKOV"] or ""))}
        for x in m._denni_bez_jpz(m.AGREGATY)
    ]


def zaznam(karta: dict | None, nabidka: dict, http: int) -> dict:
    """Ukládaná pole: jen ohlášená, bez kontaktů a jmen."""
    radek = {"id_sof": nabidka["id_sof"], "kategorie": nabidka["kategorie"], "http": http}
    if not isinstance(karta, dict):
        return radek
    podminky = karta.get("podminkyProPrijeti")
    file_id = podminky.get("fileId") if isinstance(podminky, dict) else None
    radek.update({
        "id": karta.get("id"),
        "skolniRok": karta.get("skolniRok"),
        "kolo": karta.get("kolo"),
        "redizo": str((karta.get("reditelstviSkoly") or {}).get("redizo") or ""),
        "kkov": str((karta.get("skolniObor") or {}).get("kod") or ""),
        "konaJPZ": karta.get("konaJPZ") if isinstance(karta.get("konaJPZ"), bool) else None,
        "ma_pdf_podminek": isinstance(file_id, str) and bool(UUID.fullmatch(file_id)),
        "file_id": file_id if isinstance(file_id, str) and UUID.fullmatch(file_id) else None,
    })
    radek["shoda"] = (radek["id"] == nabidka["id_sof"] and radek["redizo"] == nabidka["redizo"]
                      and radek["kkov"] == nabidka["kkov"] and radek["skolniRok"] == 2026 and radek["kolo"] == 1)
    return radek


def stahni_kartu(id_sof: str, otevri=urllib.request.urlopen) -> tuple[int, dict | None]:
    pozadavek = urllib.request.Request(API.format(id=id_sof), headers={"User-Agent": USER_AGENT, "Accept": "application/json"})
    try:
        with otevri(pozadavek, timeout=30) as odpoved:
            telo = json.loads(odpoved.read().decode("utf-8"))
            data = telo.get("data") if isinstance(telo, dict) else None
            return odpoved.status, data if isinstance(data, dict) else None
    except urllib.error.HTTPError as chyba:
        return chyba.code, None


def nacti_manifest(cesta: Path = MANIFEST) -> dict[str, dict]:
    hotovo: dict[str, dict] = {}
    if cesta.exists():
        for radek in cesta.read_text(encoding="utf-8").splitlines():
            try:
                r = json.loads(radek)
                hotovo[r["id_sof"]] = r
            except (ValueError, KeyError, TypeError):
                continue
    return hotovo


def sber(seznam: list[dict], cesta: Path = MANIFEST, otevri=urllib.request.urlopen, spanek=time.sleep) -> int:
    """Stáhne chybějící karty. Opakuje jen ty, které skončily chybou serveru nebo sítě."""
    hotovo = nacti_manifest(cesta)
    zbyva = [n for n in seznam if n["id_sof"] not in hotovo or hotovo[n["id_sof"]]["http"] in (0, 429) or hotovo[n["id_sof"]]["http"] >= 500]
    cesta.parent.mkdir(parents=True, exist_ok=True)
    chyb_za_sebou = 0
    with cesta.open("a", encoding="utf-8") as vystup:
        for n in zbyva:
            try:
                http, karta = stahni_kartu(n["id_sof"], otevri)
            except (urllib.error.URLError, TimeoutError, ValueError):
                http, karta = 0, None
            vystup.write(json.dumps(zaznam(karta, n, http), ensure_ascii=False) + "\n")
            vystup.flush()
            if http == 429:
                raise Zastavit("Server vrátil 429.")
            chyb_za_sebou = chyb_za_sebou + 1 if (http == 0 or http >= 500) else 0
            if chyb_za_sebou >= MAX_CHYB_ZA_SEBOU:
                raise Zastavit(f"{MAX_CHYB_ZA_SEBOU} chyb serveru za sebou.")
            spanek(PRODLEVA)
    return len(zbyva)


def souhrn(seznam: list[dict], hotovo: dict[str, dict]) -> dict:
    po_kategorii: dict[str, Counter] = {}
    for n in seznam:
        r = hotovo.get(n["id_sof"])
        c = po_kategorii.setdefault(n["kategorie"], Counter())
        c["nabidek"] += 1
        if r is None:
            c["nezjisteno"] += 1
        elif r["http"] == 404:
            c["karta_nenalezena"] += 1
        elif r["http"] != 200 or "id" not in r:
            c["chyba"] += 1
        elif not r.get("shoda"):
            c["karta_nesouhlasi"] += 1
        else:
            c["karta_nalezena"] += 1
            c["s_pdf_podminek" if r["ma_pdf_podminek"] else "bez_pdf_podminek"] += 1
            if r.get("konaJPZ") is True:
                c["karta_uvadi_jpz"] += 1
    celkem = Counter()
    for c in po_kategorii.values():
        celkem.update(c)
    return {
        "vystup_pro": "docs/navrh-obory-bez-jpz-2027.md, oddíl 16.1, otázka 1 (issue #244)",
        "reprodukce": "python3 scripts/mereni-dipsy-bez-jpz.py",
        "zdroj": "GET https://api.dipsy.gov.cz/v1/skol-oboro-forma/{ID_SOF}, ID_SOF z data/PZ2026_kolo1_skolobory_vysledky.xlsx",
        "celkem": dict(celkem),
        "po_kategorii": {k: dict(v) for k, v in sorted(po_kategorii.items())},
        # Odlišná ID souborů; shodné PDF pod různými ID se tu nerozliší.
        "ruznych_id_pdf": len({r["file_id"] for r in hotovo.values() if r.get("shoda") and r.get("file_id")}),
        # Karty, kde DiPSy vede jiné REDIZO než CERMAT, při shodě ID karty, roku, kola a oboru.
        "nesouhlasi_jen_redizo": sorted({f"{r['redizo']} (CERMAT {n['redizo']})" for n in seznam
                                         if (r := hotovo.get(n["id_sof"])) and r.get("http") == 200 and not r.get("shoda")
                                         and r.get("id") == n["id_sof"] and r.get("kkov") == n["kkov"]
                                         and r.get("skolniRok") == 2026 and r.get("kolo") == 1}),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--souhrn", action="store_true", help="nestahovat, jen přepočítat souhrn z manifestu")
    args = parser.parse_args()
    seznam = nabidky()
    if not args.souhrn:
        try:
            print(f"Staženo {sber(seznam)} karet.")
        except Zastavit as duvod:
            print(f"Sběr zastaven: {duvod} Napiš do issue #244.", file=sys.stderr)
            sys.exit(2)
    vysledek = souhrn(seznam, nacti_manifest())
    SOUHRN.write_text(json.dumps(vysledek, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(vysledek["celkem"], ensure_ascii=False))


if __name__ == "__main__":
    main()
