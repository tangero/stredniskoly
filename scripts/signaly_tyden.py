"""Týdenní souhrn signálů z Matomu (zadání #326, etapa 1b).

Čte jen agregované počty z Reporting API (7 dotazů, prodleva 2 s) a vypíše souhrn v Markdownu.
Nic nezapisuje do repozitáře: workflow plný souhrn pošle do Telegramu a jako artefakt běhu uloží jen verzi
bez hledaných výrazů (artefakt je ve veřejném repozitáři ke stažení, hledané výrazy mohou obsahovat jména).
Obě verze vznikají z jednoho stažení.

    MATOMO_TOKEN=... python3 scripts/signaly_tyden.py [--datum RRRR-MM-DD] [--hlaseni hlaseni.json] \\
        [--bez-hledani souhrn-bez-hledani.md] [--telegram zprava.txt --odkaz URL] > souhrn.md
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from collections import Counter
from datetime import date, timedelta
from typing import Any, Callable
from urllib.parse import urlencode
from urllib.request import Request, urlopen

ENDPOINT = "https://ma.hlidacstatu.cz/index.php"
SITE_ID = 7
PRODLEVA_S = 2
MIN_HLEDANI = 5     # hledané výrazy mohou obsahovat jména: jen výrazy s aspoň 5 hledáními
MIN_NÁVŠTĚV_ODCHODY = 20
PRAH_ODCHODU = 0.7
TOP = 10
LIMIT_TELEGRAM = 4096

Fetch = Callable[[dict[str, str]], Any]


def dotazy(konec_tydne: date) -> dict[str, dict[str, str]]:
    """Sedm dotazů: stránky tento a minulý týden, hledání, hledání bez výsledku, události, souhrn návštěv."""
    tyden = konec_tydne.isoformat()
    minuly = (konec_tydne - timedelta(days=7)).isoformat()
    spolecne = {"period": "week", "format": "JSON", "idSite": str(SITE_ID)}
    return {
        "stranky": {**spolecne, "method": "Actions.getPageUrls", "date": tyden, "flat": "1", "filter_limit": "200"},
        "stranky_minuly": {**spolecne, "method": "Actions.getPageUrls", "date": minuly, "flat": "1", "filter_limit": "200"},
        "hledani": {**spolecne, "method": "Actions.getSiteSearchKeywords", "date": tyden, "filter_limit": "200"},
        "hledani_bez_vysledku": {**spolecne, "method": "Actions.getSiteSearchNoResultKeyword", "date": tyden, "filter_limit": "200"},
        "udalosti_kategorie": {**spolecne, "method": "Events.getCategory", "date": tyden, "secondaryDimension": "eventAction", "filter_limit": "100"},
        "udalosti_akce": {**spolecne, "method": "Events.getAction", "date": tyden, "filter_limit": "100"},
        "navstevy": {**spolecne, "method": "VisitsSummary.get", "date": tyden},
    }


def fetch_matomo(token: str) -> Fetch:
    def fetch(params: dict[str, str]) -> Any:
        # token jde v těle POST, aby nezůstal v adrese ani v logu
        telo = urlencode({**params, "module": "API", "token_auth": token}).encode()
        with urlopen(Request(ENDPOINT, data=telo), timeout=60) as odpoved:
            return json.load(odpoved)
    return fetch


def stahni(fetch: Fetch, konec_tydne: date, spanek: Callable[[float], None] = time.sleep) -> dict[str, Any]:
    vysledek: dict[str, Any] = {}
    for i, (klic, params) in enumerate(dotazy(konec_tydne).items()):
        if i:
            spanek(PRODLEVA_S)
        data = fetch(params)
        if isinstance(data, dict) and data.get("result") == "error":
            raise RuntimeError(f"Matomo odmítlo dotaz {klic}")
        vysledek[klic] = data
    return vysledek


def _cislo(radek: dict[str, Any], *klice: str) -> float:
    for k in klice:
        v = radek.get(k)
        if v not in (None, ""):
            try:
                return float(str(v).rstrip("%")) / (100 if str(v).endswith("%") else 1)
            except ValueError:
                continue
    return 0.0


def _stranka(radek: dict[str, Any]) -> str:
    return str(radek.get("label") or radek.get("url") or "?")


def _tabulka(hlavicka: list[str], radky: list[list[Any]]) -> str:
    if not radky:
        return "_Žádné údaje._\n"
    out = ["| " + " | ".join(hlavicka) + " |", "|" + "---|" * len(hlavicka)]
    out += ["| " + " | ".join(str(c) for c in r) + " |" for r in radky]
    return "\n".join(out) + "\n"


def souhrn(data: dict[str, Any], konec_tydne: date, hlaseni: dict[str, int] | None = None, s_hledanim: bool = True) -> str:
    stranky = [r for r in data.get("stranky", []) if isinstance(r, dict)]
    minule = {_stranka(r): _cislo(r, "nb_hits") for r in data.get("stranky_minuly", []) if isinstance(r, dict)}
    top = sorted(stranky, key=lambda r: -_cislo(r, "nb_hits"))[:TOP]
    rust = sorted(
        ((_stranka(r), _cislo(r, "nb_hits"), minule.get(_stranka(r), 0.0)) for r in stranky if _cislo(r, "nb_hits") >= 10),
        key=lambda t: -(t[1] - t[2]),
    )[:TOP]
    odchody = sorted(
        (r for r in stranky if _cislo(r, "nb_visits") >= MIN_NÁVŠTĚV_ODCHODY and _cislo(r, "bounce_rate") >= PRAH_ODCHODU),
        key=lambda r: -_cislo(r, "nb_visits"),
    )[:TOP]

    def hledani(klic: str) -> list[list[Any]]:
        radky = [r for r in data.get(klic, []) if isinstance(r, dict) and _cislo(r, "nb_visits") >= MIN_HLEDANI]
        return [[r.get("label", "?"), int(_cislo(r, "nb_visits"))] for r in sorted(radky, key=lambda r: -_cislo(r, "nb_visits"))[:TOP]]

    def udalosti(klic: str) -> list[list[Any]]:
        radky = [r for r in data.get(klic, []) if isinstance(r, dict)]
        return [[r.get("label", "?"), int(_cislo(r, "nb_events"))] for r in sorted(radky, key=lambda r: -_cislo(r, "nb_events"))[:TOP]]

    nav = data.get("navstevy") if isinstance(data.get("navstevy"), dict) else {}
    od = (konec_tydne - timedelta(days=6)).isoformat()
    casti = [
        f"# Signály za týden {od} až {konec_tydne.isoformat()}\n",
        f"Návštěvy: {int(_cislo(nav, 'nb_visits'))}, zobrazení stránek: {int(_cislo(nav, 'nb_actions'))}.\n",
        "## Nejnavštěvovanější stránky\n",
        _tabulka(["Stránka", "Zobrazení"], [[_stranka(r), int(_cislo(r, "nb_hits"))] for r in top]),
        "## Nejrychleji rostoucí stránky (proti minulému týdnu)\n",
        _tabulka(["Stránka", "Zobrazení", "Minulý týden"], [[s, int(a), int(b)] for s, a, b in rust]),
        f"## Stránky s vysokým podílem odchodů (aspoň {MIN_NÁVŠTĚV_ODCHODY} návštěv, odchody od {int(PRAH_ODCHODU * 100)} %)\n",
        _tabulka(["Stránka", "Návštěvy", "Podíl odchodů"], [[_stranka(r), int(_cislo(r, "nb_visits")), f"{_cislo(r, 'bounce_rate') * 100:.0f} %"] for r in odchody]),
        "## Události (kategorie)\n",
        _tabulka(["Kategorie", "Události"], udalosti("udalosti_kategorie")),
        "## Události (akce)\n",
        _tabulka(["Akce", "Události"], udalosti("udalosti_akce")),
    ]
    if s_hledanim:
        casti += [
            f"## Hledání na webu (výrazy s aspoň {MIN_HLEDANI} hledáními)\n",
            _tabulka(["Výraz", "Hledání"], hledani("hledani")),
            "## Hledání bez výsledku\n",
            _tabulka(["Výraz", "Hledání"], hledani("hledani_bez_vysledku")),
        ]
    if hlaseni is not None:
        casti += ["## Hlášení a opravy od škol podle oblasti (otevřená issues)\n",
                  _tabulka(["Oblast", "Počet"], [[k, v] for k, v in sorted(hlaseni.items(), key=lambda kv: -kv[1])])]
    return "\n".join(casti)


def zprava_telegram(text: str, odkaz: str, limit: int = LIMIT_TELEGRAM) -> str:
    """Zkrátí souhrn po znacích (ne po bajtech) na konci celého řádku a přidá řádek s odkazem na běh."""
    patka = f"\n\nCelý souhrn: artefakt běhu {odkaz}\n"
    misto = limit - len(patka)
    if len(text) <= misto:
        return text + patka
    rez = text[:misto]
    if text[misto] != "\n" and "\n" in rez:
        rez = rez[: rez.rindex("\n")]
    return rez.rstrip() + patka


def hlaseni_z_issues(issues: list[dict[str, Any]]) -> dict[str, int]:
    """Spočítá otevřená veřejná hlášení (bug-report, portal-skoly) podle štítku oblast:*."""
    pocty: Counter[str] = Counter()
    for issue in issues:
        stitky = {s["name"] if isinstance(s, dict) else str(s) for s in issue.get("labels", [])}
        if not stitky & {"bug-report", "portal-skoly"}:
            continue
        oblasti = sorted(s for s in stitky if s.startswith("oblast:")) or ["oblast:bez-oblasti"]
        for o in oblasti:
            pocty[o] += 1
    return dict(pocty)


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--datum", help="poslední den týdne, výchozí: poslední dokončená neděle")
    ap.add_argument("--hlaseni", help="JSON se seznamem issues z GitHubu (gh issue list --json labels)")
    ap.add_argument("--bez-hledani", help="soubor pro verzi souhrnu bez hledaných výrazů (do veřejného artefaktu)")
    ap.add_argument("--telegram", help="soubor pro zprávu do Telegramu (plný souhrn zkrácený po znacích)")
    ap.add_argument("--odkaz", default="", help="adresa běhu workflow do patičky zprávy pro Telegram")
    args = ap.parse_args(argv)
    token = os.environ.get("MATOMO_TOKEN", "").strip()
    if not token:
        print("Chybí secret MATOMO_TOKEN (token jen pro čtení vytvoří vlastník v Matomu).", file=sys.stderr)
        return 2
    dnes = date.today()
    konec = date.fromisoformat(args.datum) if args.datum else dnes - timedelta(days=dnes.isoweekday())
    hlaseni = None
    if args.hlaseni:
        with open(args.hlaseni, encoding="utf-8") as f:
            hlaseni = hlaseni_z_issues(json.load(f))
    data = stahni(fetch_matomo(token), konec)
    plny = souhrn(data, konec, hlaseni)
    print(plny)
    if args.bez_hledani:
        with open(args.bez_hledani, "w", encoding="utf-8") as f:
            f.write(souhrn(data, konec, hlaseni, s_hledanim=False))
    if args.telegram:
        with open(args.telegram, "w", encoding="utf-8") as f:
            f.write(zprava_telegram(plny, args.odkaz))
    return 0


if __name__ == "__main__":
    sys.exit(main())
