#!/usr/bin/env python3
"""Ověření dostupnosti odkazů citovaných v nálezech rešerše návazností.

Vymyšlený nebo překlepnutý odkaz je horší než nedohledaný případ, proto se
každý externí odkaz z `evidence` jednou stáhne a zaznamená se stavový kód.
Nedostupnost sama nedokazuje, že zdroj neexistuje (stránka mohla zaniknout);
výstup je seznam k ručnímu posouzení.

Použití:
    python3 scripts/check-continuity-sources.py [--jobs 8] [--out CESTA]
"""
import argparse
import json
import urllib.error
import urllib.request
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

VYSLEDKY = Path("docs/podklady/vysledky-navaznosti-2025-2026")
LOKALNI_ZDROJE = ("fronta-dohledavani", "matice-zmen")
UA = "Mozilla/5.0 (kontrola odkazu reserse navaznosti; stredniskoly)"


def over(url):
    zadost = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(zadost, timeout=25) as odpoved:
            return odpoved.status, None
    except urllib.error.HTTPError as e:
        return e.code, None
    except Exception as e:  # DNS, TLS, timeout
        return None, f"{type(e).__name__}: {e}"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--jobs", type=int, default=8)
    parser.add_argument("--out", default=None)
    args = parser.parse_args()

    kde = defaultdict(set)
    for cesta in sorted(VYSLEDKY.glob("*.json")):
        v = json.loads(cesta.read_text())
        for f in v.get("findings", []):
            for e in f.get("evidence", []):
                url = (e.get("url") or "").strip()
                if url.startswith("http") and not any(z in url for z in LOKALNI_ZDROJE):
                    kde[url].add(v["task_id"])

    urls = sorted(kde)
    print(f"Ověřuji {len(urls)} externích odkazů…")
    with ThreadPoolExecutor(max_workers=args.jobs) as pool:
        vysledky = list(pool.map(over, urls))

    zaznamy = []
    spatne = []
    for url, (kod, chyba) in zip(urls, vysledky):
        zaznam = {"url": url, "status": kod, "error": chyba, "tasks": sorted(kde[url])}
        zaznamy.append(zaznam)
        if kod != 200:
            spatne.append(zaznam)

    print(f"Dostupných: {len(urls) - len(spatne)} · k posouzení: {len(spatne)}")
    for z in spatne:
        print(f"  [{z['status'] or z['error']}] {z['url']}  ({', '.join(z['tasks'])})")

    if args.out:
        Path(args.out).write_text(json.dumps(zaznamy, ensure_ascii=False, indent=1))
        print(f"Zapsáno do {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
