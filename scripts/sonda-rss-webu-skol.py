#!/usr/bin/env python3
"""Sonda: kolik webů středních škol deklaruje RSS/Atom zdroj na titulní stránce.

Pro weby škol z katalogu (unikátní REDIZO z public/souhrny_kolo1.json, adresy z
public/skoly_web.json) stáhne titulní stránku a hledá <link rel="alternate"
type="application/rss+xml|application/atom+xml">. U webů bez deklarace zkusí
typické cesty (/feed, /rss, /feed.xml). Nalezené zdroje ověří stažením.

    .venv/bin/python scripts/sonda-rss-webu-skol.py [--limit N] [--out VYSTUP]

Výstup: JSON s výsledkem za každou školu a souhrnem. Slouží jako podklad pro
rozhodnutí, jestli se vyplatí stahovat školní novinky automaticky.
"""
from __future__ import annotations

import argparse
import concurrent.futures
import json
import re
import ssl
import sys
import time
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlparse

# requests se importuje až při stahování: offline nástroje (měření klasifikace,
# testy parseru) tak nemusí mít requests nainstalované – N4 třetí oponentury.

KOREN = Path(__file__).resolve().parent.parent
UA = "stredniskoly.cz sonda; pruzkum RSS/Atom zdroju skolnich webu"
TIMEOUT = 12
MAX_STRANKA = 1_500_000  # bajtů titulní stránky
VLAKNA = 12

# Staré školní weby mají rozbité certifikáty; sondě stačí vědět, že stránka žije.
SSL = ssl.create_default_context()
SSL.check_hostname = False
SSL.verify_mode = ssl.CERT_NONE


class LinkTagy(HTMLParser):
    """Vybere z HTML <link rel=alternate> na feedy a meta generator."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.feedy: list[dict[str, str]] = []
        self.generator: str | None = None

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        a = {k.lower(): (v or "") for k, v in attrs}
        if tag == "link" and "alternate" in a.get("rel", "").lower():
            typ = a.get("type", "").lower()
            if "rss" in typ or "atom" in typ or typ.endswith("/feed+xml"):
                self.feedy.append({"href": a.get("href", ""), "typ": typ, "titul": a.get("title", "")})
        elif tag == "meta" and a.get("name", "").lower() == "generator":
            self.generator = a.get("content", "")


def stahni(url: str, limit: int = MAX_STRANKA) -> tuple[int, str, str] | None:
    """Vrátí (status, text, finální URL po redirectech) nebo None při chybě."""
    import requests
    requests.packages.urllib3.disable_warnings()  # type: ignore[attr-defined]
    try:
        r = requests.get(
            url, timeout=TIMEOUT, stream=True, allow_redirects=True,
            headers={"User-Agent": UA, "Accept": "text/html,application/xhtml+xml,*/*"},
            verify=False,
        )
        hlavicka = r.headers.get("content-type", "").lower()
        if r.status_code != 200:
            r.close()
            return (r.status_code, "", r.url)
        if hlavicka and "html" not in hlavicka and "xml" not in hlavicka and "text/" not in hlavicka:
            r.close()
            return (r.status_code, "", r.url)
        kusy, velikost = [], 0
        # Kódování vyčíst před spotřebováním těla; pro detekci <link>/<rss> stačí ASCII.
        kodovani = r.encoding or "utf-8"
        for kus in r.iter_content(chunk_size=65536, decode_unicode=False):
            kusy.append(kus)
            velikost += len(kus)
            if velikost > limit:
                break
        r.close()
        return (r.status_code, b"".join(kusy).decode(kodovani, errors="replace"), r.url)
    except requests.RequestException:
        return None


def over_feed(url: str) -> str:
    """Stáhne feed a posoudí, jestli jde o platný RSS/Atom. Vrátí stav slovně."""
    vysledek = stahni(url, limit=400_000)
    if vysledek is None:
        return "nedostupny"
    status, text, _ = vysledek
    if status != 200:
        return f"http_{status}"
    zacatek = text[:2000].lower()
    if "<rss" in zacatek or "<feed" in zacatek or "<rdf" in zacatek:
        return "platny"
    return "nesrozumitelny"


def sonduj_skolu(redizo: str, url: str) -> dict:
    zaznam = {"redizo": redizo, "web": url, "titulka": None, "feedy": [], "generator": None,
              "fallback": None, "chyba": None, "finalni_url": None}
    if not url.startswith(("http://", "https://")) or " " in url:
        zaznam["chyba"] = "neplatna_url"
        return zaznam
    vysledek = stahni(url)
    if vysledek is None:
        zaznam["chyba"] = "nedostupna"
        return zaznam
    status, html, finalni_url = vysledek
    zaznam["titulka"] = status
    zaznam["finalni_url"] = finalni_url
    if status != 200 or not html:
        return zaznam
    parser = LinkTagy()
    try:
        parser.feed(html)
    except Exception:
        pass
    zaznam["generator"] = parser.generator
    # Relativní odkazy řešit vůči finální URL po redirectech, ne původní adrese.
    for feed in parser.feedy:
        href = urljoin(finalni_url, feed["href"]) if feed["href"] else ""
        if href:
            zaznam["feedy"].append({"url": href, "typ": feed["typ"], "titul": feed["titul"]})
    # Weby bez deklarace: zkus typické cesty (WordPress /feed apod.) na cílové doméně.
    if not zaznam["feedy"]:
        zaklad = f"{urlparse(finalni_url).scheme}://{urlparse(finalni_url).netloc}"
        for cesta in ("/feed", "/feed.xml", "/rss", "/rss.xml", "/atom.xml"):
            stav = over_feed(zaklad + cesta)
            if stav == "platny":
                zaznam["fallback"] = zaklad + cesta
                break
    return zaznam


def dopln_fallback(zaznam: dict) -> dict:
    """Škola má deklarované feedy, ale žádný platný → zkus typické cesty (oponentura 3.3).

    Základ staví z finální URL po redirectech, ne z původní adresy z rejstříku
    (oponentura 1.1, R6) – přesměrovaná škola jinak sonduje mrtvou doménu."""
    cil = zaznam.get("finalni_url") or zaznam["web"]
    zaklad = f"{urlparse(cil).scheme}://{urlparse(cil).netloc}"
    for cesta in ("/feed", "/feed.xml", "/rss", "/rss.xml", "/atom.xml"):
        if over_feed(zaklad + cesta) == "platny":
            zaznam["fallback"] = zaklad + cesta
            break
    return zaznam


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--limit", type=int, default=0, help="jen prvních N škol (zkouška)")
    p.add_argument("--out", type=Path, default=None)
    a = p.parse_args()

    souhrny = json.loads((KOREN / "public" / "souhrny_kolo1.json").read_text())
    rediza = sorted({k.split("_")[0] for k in (souhrny.get("nabidky") or souhrny)})
    weby = json.loads((KOREN / "public" / "skoly_web.json").read_text())["weby"]
    cil = [(r, weby[r]) for r in rediza if weby.get(r)]
    if a.limit:
        cil = cil[: a.limit]
    print(f"Sonduji {len(cil)} webů škol ({VLAKNA} vláken, timeout {TIMEOUT} s)…", flush=True)

    vysledky: list[dict] = []
    zacatek = time.time()
    with concurrent.futures.ThreadPoolExecutor(max_workers=VLAKNA) as pool:
        prace = {pool.submit(sonduj_skolu, r, u): r for r, u in cil}
        for i, hotovo in enumerate(concurrent.futures.as_completed(prace), 1):
            vysledky.append(hotovo.result())
            if i % 100 == 0:
                print(f"  {i}/{len(cil)} ({time.time() - zacatek:.0f} s)", flush=True)

    # Ověř dostupnost deklarovaných feedů (fallback cesty už ověřené jsou).
    unikatni = {f["url"] for v in vysledky for f in v["feedy"]}
    print(f"Ověřuji {len(unikatni)} nalezených feedů…", flush=True)
    stavy: dict[str, str] = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=VLAKNA) as pool:
        for url, stav in zip(unikatni, pool.map(over_feed, unikatni)):
            stavy[url] = stav
    for v in vysledky:
        for f in v["feedy"]:
            f["stav"] = stavy.get(f["url"], "?")

    # Školy s deklarovanými, ale samými neplatnými feedy: zkus ještě typické cesty.
    k_doplneni = [v for v in vysledky
                  if v["feedy"] and not v["fallback"]
                  and not any(f.get("stav") == "platny" for f in v["feedy"])]
    if k_doplneni:
        print(f"Doplňuji fallback u {len(k_doplneni)} škol s neplatnými deklaracemi…", flush=True)
        with concurrent.futures.ThreadPoolExecutor(max_workers=VLAKNA) as pool:
            list(pool.map(dopln_fallback, k_doplneni))

    deklarovane = [v for v in vysledky if v["feedy"]]
    platne = [v for v in vysledky if any(f.get("stav") == "platny" for f in v["feedy"])]
    souhrn = {
        "sondovano": len(vysledky),
        "titulka_ok": sum(1 for v in vysledky if v["titulka"] == 200),
        "nedostupne": sum(1 for v in vysledky if v["chyba"]),
        "s_deklarovanym_feedem": len(deklarovane),
        "s_platnym_feedem": len(platne),
        "jen_fallback_cesta": sum(1 for v in vysledky if v["fallback"]),
        "celkem_s_feedem": len(platne) + sum(1 for v in vysledky if v["fallback"]),
        "trvalo_s": round(time.time() - zacatek),
    }
    generatory: dict[str, int] = {}
    for v in vysledky:
        if v["generator"]:
            klic = re.split(r"[\s/]", v["generator"])[0].lower()
            generatory[klic] = generatory.get(klic, 0) + 1
    souhrn["generatory_top"] = sorted(generatory.items(), key=lambda kv: -kv[1])[:12]

    vystup = a.out or KOREN / "data" / "sondy" / f"rss-webu-skol-{datetime.now(timezone.utc):%Y%m%d}.json"
    vystup.parent.mkdir(parents=True, exist_ok=True)
    vystup.write_text(json.dumps({"meta": {"kdy": datetime.now(timezone.utc).isoformat(),
                                           "popis": __doc__.strip().splitlines()[0]},
                                  "souhrn": souhrn, "skoly": vysledky},
                                 ensure_ascii=False, indent=1))
    print(json.dumps(souhrn, ensure_ascii=False, indent=1))
    print(f"-> {vystup}")


if __name__ == "__main__":
    sys.exit(main())
