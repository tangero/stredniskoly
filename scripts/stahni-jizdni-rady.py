#!/usr/bin/env python3
"""Ruční pomůcka: stáhne celostátní jízdní řády (GTFS CIS JŘ) do data/GTFS_CR/.

    python3 scripts/stahni-jizdni-rady.py             # stáhne, když je zdroj novější
    python3 scripts/stahni-jizdni-rady.py --kontrola  # jen porovná s místní kopií
    python3 scripts/stahni-jizdni-rady.py --vynutit   # stáhne vždy

Data mají po rozbalení kolem 400 MB a do gitu se neukládají. Potřebuje je jen
`scripts/build_transit_graph_v2.py`, který z nich staví `data/transit_graph.json`.
Celý postup obnovy dopravního grafu je v `docs/zdroje-dat.md` (sada `doprava-gtfs`).

Zdroj se publikuje denně, ale jízdní řády se podstatně mění jen při celostátní
změně (druhá neděle v prosinci) a dílčích změnách. Spoje jsou v datech jen
na dobu, na kterou je dopravci zveřejnili, PID jen asi dva týdny dopředu.

Stažený archiv se rozbalí do dočasné složky a teprve po úspěchu nahradí
data/GTFS_CR/. Údaje o zdroji (Last-Modified, datum stažení) zapíše do
data/GTFS_CR/_zdroj.json.
"""
from __future__ import annotations

import argparse
import email.utils
import json
import shutil
import sys
import tempfile
import urllib.request
import zipfile
from datetime import datetime, timezone
from pathlib import Path

KOREN = Path(__file__).resolve().parent.parent

ADRESA = "https://www.spojenka.cz/jrdata/jizdnirady-gtfs.zip"
CIL = KOREN / "data" / "GTFS_CR"
ZDROJ_JSON = "_zdroj.json"
POVINNE = ("routes.txt", "trips.txt", "stops.txt", "stop_times.txt", "calendar.txt")
USER_AGENT = "prijimackynaskolu.cz (stahni-jizdni-rady.py)"


def vzdalene_last_modified(url: str) -> str:
    """Hlavička Last-Modified zdroje, nebo prázdný řetězec."""
    if not url.startswith("http"):
        return ""
    req = urllib.request.Request(url, method="HEAD", headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=60) as resp:
        return resp.headers.get("Last-Modified", "")


def mistni_zdroj() -> dict:
    """Údaje o místní kopii, nebo prázdný slovník."""
    cesta = CIL / ZDROJ_JSON
    return json.loads(cesta.read_text(encoding="utf-8")) if cesta.exists() else {}


def datum_publikace(last_modified: str) -> str:
    if not last_modified:
        return ""
    return email.utils.parsedate_to_datetime(last_modified).date().isoformat()


def stahni(url: str, cil: Path) -> None:
    """Stáhne soubor po blocích."""
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=300) as resp, open(cil, "wb") as f:
        shutil.copyfileobj(resp, f, length=1024 * 1024)


def rozbal(archiv: Path, cil: Path) -> list[str]:
    """Rozbalí jen ploché .txt soubory (bez cest uvnitř archivu)."""
    soubory = []
    with zipfile.ZipFile(archiv) as zf:
        for info in zf.infolist():
            jmeno = info.filename
            if info.is_dir() or "/" in jmeno or "\\" in jmeno or not jmeno.endswith(".txt"):
                continue
            with zf.open(info) as src, open(cil / jmeno, "wb") as dst:
                shutil.copyfileobj(src, dst)
            soubory.append(jmeno)
    return sorted(soubory)


def main() -> int:
    parser = argparse.ArgumentParser(description="Stažení GTFS CIS JŘ do data/GTFS_CR/")
    parser.add_argument("--kontrola", action="store_true", help="jen porovná zdroj s místní kopií, nic nestahuje")
    parser.add_argument("--vynutit", action="store_true", help="stáhne i nezměněný zdroj")
    parser.add_argument("--url", default=ADRESA, help=argparse.SUPPRESS)
    args = parser.parse_args()

    mistni = mistni_zdroj()
    last_modified = vzdalene_last_modified(args.url)
    print(f"Zdroj:  {args.url}")
    print(f"  publikováno: {datum_publikace(last_modified) or 'neznámo'}")
    print(f"  místní kopie: {mistni.get('publikovano') or ('bez údajů' if CIL.exists() else 'chybí')}")

    aktualni = bool(last_modified) and mistni.get("last_modified") == last_modified
    if args.kontrola:
        print("Místní kopie je aktuální." if aktualni else "Zdroj je novější než místní kopie.")
        return 0
    if aktualni and not args.vynutit:
        print("Beze změny, nic nestahuji (--vynutit stáhne znovu).")
        return 0

    CIL.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=CIL.parent, prefix=".GTFS_CR-") as tmp:
        tmp_dir = Path(tmp)
        archiv = tmp_dir / "gtfs.zip"
        print("Stahuji…")
        stahni(args.url, archiv)

        nova = tmp_dir / "GTFS_CR"
        nova.mkdir()
        soubory = rozbal(archiv, nova)
        chybi = [s for s in POVINNE if s not in soubory]
        if chybi:
            print(f"Archiv neobsahuje {', '.join(chybi)}; data/GTFS_CR/ nechávám beze změny.", file=sys.stderr)
            return 1

        (nova / ZDROJ_JSON).write_text(json.dumps({
            "url": args.url,
            "last_modified": last_modified,
            "publikovano": datum_publikace(last_modified),
            "stazeno": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "soubory": soubory,
        }, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

        if CIL.exists():
            shutil.rmtree(CIL)
        nova.rename(CIL)

    print(f"Hotovo: {CIL.relative_to(KOREN)}/ ({', '.join(soubory)})")
    print("Dál: python3 scripts/build_transit_graph_v2.py")
    return 0


if __name__ == "__main__":
    sys.exit(main())
