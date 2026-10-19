"""Týdenní souhrn signálů z Matomu (zadání #326, etapa 1b) a oddíl Rychlost z CrUX (etapa 2, `signaly_crux.py`).

Čte jen agregované počty z Reporting API (7 dotazů, prodleva 2 s) a vypíše souhrn v Markdownu.
Nic nezapisuje do repozitáře: workflow plný souhrn pošle do Telegramu a jako artefakt běhu uloží jen verzi
bez hledaných výrazů (artefakt je ve veřejném repozitáři ke stažení, hledané výrazy mohou obsahovat jména).
Obě verze vznikají z jednoho stažení. Vedle Markdownu jde do artefaktu `souhrn.json` se stejným obsahem
bez hledaných výrazů; ten čte přehled provozu v administraci (#528).

    MATOMO_TOKEN=... python3 scripts/signaly_tyden.py [--datum RRRR-MM-DD] [--hlaseni hlaseni.json] \\
        [--bez-hledani souhrn-bez-hledani.md] [--json souhrn.json] [--telegram zprava.txt --odkaz URL] > souhrn.md
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
from urllib.error import HTTPError
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
DELKA_HLASKY = 300

# oddíl souhrnu -> dotazy, na kterých stojí; když dotaz selže, oddíl se vynechá s poznámkou
ODDILY_DOTAZU = {
    "navstevy": ("navstevy",),
    "stranky": ("stranky",),
    "rust": ("stranky", "stranky_minuly"),
    "odchody": ("stranky",),
    "udalosti_kategorie": ("udalosti_kategorie",),
    "udalosti_akce": ("udalosti_akce",),
    "hledani": ("hledani",),
    "hledani_bez_vysledku": ("hledani_bez_vysledku",),
}

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
        "hledani_bez_vysledku": {**spolecne, "method": "Actions.getSiteSearchNoResultKeywords", "date": tyden, "filter_limit": "200"},
        "udalosti_kategorie": {**spolecne, "method": "Events.getCategory", "date": tyden, "secondaryDimension": "eventAction", "filter_limit": "100"},
        "udalosti_akce": {**spolecne, "method": "Events.getAction", "date": tyden, "filter_limit": "100"},
        "navstevy": {**spolecne, "method": "VisitsSummary.get", "date": tyden},
    }


class ChybaMatomo(RuntimeError):
    """Matomo dotaz odmítlo (HTTP 4xx/5xx nebo JSON s "result": "error"); text je hláška Matomo bez tokenu."""


def hlaska_matomo(telo: bytes | str | Any, token: str = "") -> str:
    """Vytáhne z odpovědi Matomo hlášku chyby, odstraní z ní token a zkrátí ji (jde do veřejného logu)."""
    if isinstance(telo, bytes):
        telo = telo.decode("utf-8", errors="replace")
    if isinstance(telo, str):
        try:
            telo = json.loads(telo)
        except ValueError:
            pass
    text = str(telo.get("message", telo)) if isinstance(telo, dict) else str(telo)
    if token:
        text = text.replace(token, "***")
    text = " ".join(text.split())
    return text[:DELKA_HLASKY] or "(prázdná odpověď)"


def fetch_matomo(token: str) -> Fetch:
    def fetch(params: dict[str, str]) -> Any:
        # token jde v těle POST, aby nezůstal v adrese ani v logu
        telo = urlencode({**params, "module": "API", "token_auth": token}).encode()
        try:
            with urlopen(Request(ENDPOINT, data=telo), timeout=60) as odpoved:
                return json.load(odpoved)
        except HTTPError as e:
            # Matomo 5 vrací chyby API jako HTTP 400 s tělem {"result":"error","message":...}
            raise ChybaMatomo(f"HTTP {e.code}: {hlaska_matomo(e.read(), token)}") from None
    return fetch


def stahni(fetch: Fetch, konec_tydne: date, spanek: Callable[[float], None] = time.sleep) -> dict[str, Any]:
    """Stáhne všechny dotazy. Odmítnutý dotaz zapíše do `_chyby` a pokračuje; selžou-li všechny, skončí chybou."""
    vysledek: dict[str, Any] = {}
    chyby: dict[str, str] = {}
    vse = dotazy(konec_tydne)
    for i, (klic, params) in enumerate(vse.items()):
        if i:
            spanek(PRODLEVA_S)
        try:
            data = fetch(params)
            if isinstance(data, dict) and data.get("result") == "error":
                raise ChybaMatomo(hlaska_matomo(data))
        except ChybaMatomo as e:
            chyby[klic] = str(e)
            print(f"Matomo odmítlo dotaz {klic} ({params['method']}): {e}", file=sys.stderr)
            continue
        vysledek[klic] = data
    if len(chyby) == len(vse):
        raise RuntimeError("Matomo odmítlo všechny dotazy: " + "; ".join(f"{k}: {v}" for k, v in chyby.items()))
    if chyby:
        vysledek["_chyby"] = chyby
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


def _vynechano(data: dict[str, Any], oddil: str) -> str | None:
    """Poznámka místo oddílu, jehož dotaz Matomo odmítlo; None, když oddíl data má."""
    chyby = data.get("_chyby") or {}
    selhane = [k for k in ODDILY_DOTAZU[oddil] if k in chyby]
    if not selhane:
        return None
    return "_Oddíl vynechán: Matomo odmítlo dotaz " + "; ".join(f"{k} ({chyby[k]})" for k in selhane) + "._\n"


def _vyber_stranek(data: dict[str, Any]) -> tuple[list[dict[str, Any]], list[tuple[str, float, float]], list[dict[str, Any]]]:
    """Nejnavštěvovanější, nejrychleji rostoucí a stránky s vysokým podílem odchodů (sdílí Markdown i JSON)."""
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
    return top, rust, odchody


def _udalosti(data: dict[str, Any], klic: str) -> list[list[Any]]:
    radky = [r for r in data.get(klic, []) if isinstance(r, dict)]
    return [[r.get("label", "?"), int(_cislo(r, "nb_events"))] for r in sorted(radky, key=lambda r: -_cislo(r, "nb_events"))[:TOP]]


def souhrn(data: dict[str, Any], konec_tydne: date, hlaseni: dict[str, int] | None = None, s_hledanim: bool = True) -> str:
    top, rust, odchody = _vyber_stranek(data)

    def hledani(klic: str) -> list[list[Any]]:
        radky = [r for r in data.get(klic, []) if isinstance(r, dict) and _cislo(r, "nb_visits") >= MIN_HLEDANI]
        return [[r.get("label", "?"), int(_cislo(r, "nb_visits"))] for r in sorted(radky, key=lambda r: -_cislo(r, "nb_visits"))[:TOP]]

    def udalosti(klic: str) -> list[list[Any]]:
        return _udalosti(data, klic)

    def oddil(nazev: str, tabulka: Callable[[], str]) -> str:
        return _vynechano(data, nazev) or tabulka()

    nav = data.get("navstevy") if isinstance(data.get("navstevy"), dict) else {}
    od = (konec_tydne - timedelta(days=6)).isoformat()
    casti = [
        f"# Signály za týden {od} až {konec_tydne.isoformat()}\n",
        _vynechano(data, "navstevy")
        or f"Návštěvy: {int(_cislo(nav, 'nb_visits'))}, zobrazení stránek: {int(_cislo(nav, 'nb_actions'))}.\n",
        "## Nejnavštěvovanější stránky\n",
        oddil("stranky", lambda: _tabulka(["Stránka", "Zobrazení"], [[_stranka(r), int(_cislo(r, "nb_hits"))] for r in top])),
        "## Nejrychleji rostoucí stránky (proti minulému týdnu)\n",
        oddil("rust", lambda: _tabulka(["Stránka", "Zobrazení", "Minulý týden"], [[s, int(a), int(b)] for s, a, b in rust])),
        f"## Stránky s vysokým podílem odchodů (aspoň {MIN_NÁVŠTĚV_ODCHODY} návštěv, odchody od {int(PRAH_ODCHODU * 100)} %)\n",
        oddil("odchody", lambda: _tabulka(["Stránka", "Návštěvy", "Podíl odchodů"], [[_stranka(r), int(_cislo(r, "nb_visits")), f"{_cislo(r, 'bounce_rate') * 100:.0f} %"] for r in odchody])),
        "## Události (kategorie)\n",
        oddil("udalosti_kategorie", lambda: _tabulka(["Kategorie", "Události"], udalosti("udalosti_kategorie"))),
        "## Události (akce)\n",
        oddil("udalosti_akce", lambda: _tabulka(["Akce", "Události"], udalosti("udalosti_akce"))),
    ]
    if s_hledanim:
        casti += [
            f"## Hledání na webu (výrazy s aspoň {MIN_HLEDANI} hledáními)\n",
            oddil("hledani", lambda: _tabulka(["Výraz", "Hledání"], hledani("hledani"))),
            "## Hledání bez výsledku\n",
            oddil("hledani_bez_vysledku", lambda: _tabulka(["Výraz", "Hledání"], hledani("hledani_bez_vysledku"))),
        ]
    if hlaseni is not None:
        casti += ["## Hlášení a opravy od škol podle oblasti (otevřená issues)\n",
                  _tabulka(["Oblast", "Počet"], [[k, v] for k, v in sorted(hlaseni.items(), key=lambda kv: -kv[1])])]
    return "\n".join(casti)


def souhrn_json(data: dict[str, Any], konec_tydne: date, hlaseni: dict[str, int] | None = None,
                rychlost: dict[str, Any] | None = None) -> dict[str, Any]:
    """Strojově čitelný souhrn do artefaktu (`souhrn.json`, #528) se stejným obsahem jako verze bez hledaných výrazů.

    Hledané výrazy v něm nejsou: z hledání bez výsledku jde jen součet návštěv a počet různých výrazů.
    Oddíl, jehož dotaz Matomo odmítlo, má hodnotu None a důvod ve `vynechano`.
    """
    top, rust, odchody = _vyber_stranek(data)
    chyby = data.get("_chyby") or {}
    vynechano = {o: ", ".join(k for k in dotazy_ if k in chyby) for o, dotazy_ in ODDILY_DOTAZU.items()
                 if o not in ("hledani",) and any(k in chyby for k in dotazy_)}

    def nebo_none(oddil: str, hodnota: Any) -> Any:
        return None if oddil in vynechano else hodnota

    nav = data.get("navstevy") if isinstance(data.get("navstevy"), dict) else {}
    bez_vysledku = [r for r in data.get("hledani_bez_vysledku", []) if isinstance(r, dict)]
    return {
        "verze": 1,
        "od": (konec_tydne - timedelta(days=6)).isoformat(),
        "do": konec_tydne.isoformat(),
        "navstevy": nebo_none("navstevy", {"navstevy": int(_cislo(nav, "nb_visits")), "zobrazeni": int(_cislo(nav, "nb_actions"))}),
        "stranky": nebo_none("stranky", [{"stranka": _stranka(r), "zobrazeni": int(_cislo(r, "nb_hits"))} for r in top]),
        "rust": nebo_none("rust", [{"stranka": st, "zobrazeni": int(a), "minuly_tyden": int(b)} for st, a, b in rust]),
        "odchody": nebo_none("odchody", [{"stranka": _stranka(r), "navstevy": int(_cislo(r, "nb_visits")),
                                          "podil_odchodu": round(_cislo(r, "bounce_rate"), 3)} for r in odchody]),
        "udalosti_kategorie": nebo_none("udalosti_kategorie", [{"nazev": n, "pocet": p} for n, p in _udalosti(data, "udalosti_kategorie")]),
        "udalosti_akce": nebo_none("udalosti_akce", [{"nazev": n, "pocet": p} for n, p in _udalosti(data, "udalosti_akce")]),
        "hledani_bez_vysledku": nebo_none("hledani_bez_vysledku", {
            "navstevy": int(sum(_cislo(r, "nb_visits") for r in bez_vysledku)), "vyrazu": len(bez_vysledku)}),
        "hlaseni": None if hlaseni is None else [{"oblast": k, "pocet": v} for k, v in sorted(hlaseni.items(), key=lambda kv: -kv[1])],
        "rychlost": rychlost,
        "vynechano": {o: f"Matomo odmítlo dotaz {k}" for o, k in vynechano.items()},
    }


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
    ap.add_argument("--json", help="soubor pro souhrn.json bez hledaných výrazů (do veřejného artefaktu, čte ho administrace)")
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
    import signaly_crux  # etapa 2: oddíl Rychlost z CrUX; bez CRUX_API_KEY jen poznámka

    rychlost_data = signaly_crux.rychlost()
    rychlost = signaly_crux.text_rychlosti(rychlost_data)
    plny = signaly_crux.vloz_oddil(souhrn(data, konec, hlaseni), rychlost)
    print(plny)
    if args.bez_hledani:
        with open(args.bez_hledani, "w", encoding="utf-8") as f:
            f.write(signaly_crux.vloz_oddil(souhrn(data, konec, hlaseni, s_hledanim=False), rychlost))
    if args.json:
        with open(args.json, "w", encoding="utf-8") as f:
            json.dump(souhrn_json(data, konec, hlaseni, signaly_crux.json_rychlosti(rychlost_data)), f, ensure_ascii=False, indent=1)
    if args.telegram:
        with open(args.telegram, "w", encoding="utf-8") as f:
            f.write(zprava_telegram(plny, args.odkaz))
    return 0


if __name__ == "__main__":
    sys.exit(main())
