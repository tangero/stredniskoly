#!/usr/bin/env python3
"""Sklízeč školních novinek: stáhne feedy, klasifikuje položky, vyrobí dávku.

    python3 scripts/sklizec-novinek.py --stav stav.json --vystup davka.json
    python3 scripts/sklizec-novinek.py --jen 20 --vystup davka.json   (zkouška)

Sklízeč **do databáze nesahá** – vyrobí dávku a zapisuje ji Node skript
``scripts/skolni-novinky-zapis.mjs``, který má ovladač Neonu a transakce jako
zbytek projektu. Dělba má i provozní smysl: dávku jde uložit, prohlédnout
a přehrát znovu, aniž by se něco stáhlo podruhé.

Pravidla klasifikace a jediné publikační rozhodnutí žijí ve sdíleném modulu
``scripts/novinky_klasifikace.py``; měření (``rss-klasifikace-mereni.py``)
i testy používají týž kód, takže se provoz a měření nemohou rozejít.

Co sklízeč neposílá dál:

* **plný text článku** – přebírá se titulek, odkaz a datum (autorská práva);
* položky bez použitelného odkazu nebo titulku;
* položky starší než ``OKNO_DNU``.

Zmizení položky z feedu **není** zrušení události: dávka nese jen to, co se
našlo, a zápis nic nemaže (``docs/skolske-novinky-rss-2027.md`` oddíl 3.2).
"""
from __future__ import annotations

import argparse
import concurrent.futures
import hashlib
import json
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

KOREN = Path(__file__).resolve().parent.parent
REGISTR = KOREN / "public" / "skoly_feedy.json"

sys.path.insert(0, str(Path(__file__).resolve().parent))
from novinky_klasifikace import (  # noqa: E402  (až po sys.path)
    VERZE_PRAVIDEL, TRIDY_S_POZVANKOU, oklasifikuj_polozky, parse_feed, rozhodni_publikaci,
)

OKNO_DNU = 180
SOUBEZNE = 12
TIMEOUT = 20
UA = ("Mozilla/5.0 (compatible; PrijimackyNaSkoluBot/1.0; "
      "+https://www.prijimackynaskolu.cz/o-projektu)")

# Platnost podle stavu události, ne jeden limit (návrh 3.4). Dny od publikace;
# u tříd s termínem má přednost poslední termín + 3 dny.
PLATNOST_DNU = {
    "volna_mista": 7,      # limit stáří sdělení, ne potvrzení dostupnosti
    "dod": 60,             # DOD bez termínu: jen titulek a odkaz
    "vysledky_prijm": 60,
    "kriteria": 60,
    "prijimaci_rizeni": 60,
}
PLATNOST_VYCHOZI = 60
PO_TERMINU_DNU = 3


def normalizuj_url(url: str) -> str:
    """Identita pro položku bez GUID: adresa bez fragmentu a bez koncového lomítka."""
    d = urlsplit(url.strip())
    cesta = d.path.rstrip("/") or "/"
    return urlunsplit((d.scheme.lower(), d.netloc.lower(), cesta, d.query, ""))


def otisk(pol: dict) -> str:
    """Otisk zobrazovaných polí. Pozná změnu, ne její význam – ten řeší verze."""
    zaklad = "␟".join([pol.get("titulek", ""), pol.get("popis", ""), pol.get("url", "")])
    return hashlib.sha256(zaklad.encode("utf-8")).hexdigest()


def stahni_feed(url: str, etag: str | None, modified: str | None) -> dict:
    """Podmíněný požadavek; 304 znamená beze změny, ne chybu."""
    import requests
    requests.packages.urllib3.disable_warnings()  # type: ignore[attr-defined]
    hlavicky = {"User-Agent": UA, "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, */*"}
    if etag:
        hlavicky["If-None-Match"] = etag
    if modified:
        hlavicky["If-Modified-Since"] = modified
    try:
        r = requests.get(url, timeout=TIMEOUT, headers=hlavicky, allow_redirects=True, verify=False)
    except Exception as e:  # síť, DNS, TLS – stav zdroje, ne chyba běhu
        return {"chyba": type(e).__name__}
    if r.status_code == 304:
        return {"beze_zmeny": True}
    if r.status_code == 429:
        return {"chyba": "429", "retry_after": r.headers.get("Retry-After")}
    if r.status_code != 200:
        return {"chyba": f"HTTP {r.status_code}"}
    return {
        "text": r.text,
        "etag": r.headers.get("ETag"),
        "modified": r.headers.get("Last-Modified"),
    }


def konec_platnosti(pol: dict, publikovano: datetime | None) -> str | None:
    """Do kdy je položka aktuální zprávou. Termínová karta žije podle termínů."""
    terminy = [t for t in (pol.get("publikace", {}).get("terminy") or [])]
    if terminy:
        posledni = date.fromisoformat(max(terminy))
        return (posledni + timedelta(days=PO_TERMINU_DNU)).isoformat()
    if publikovano is None:
        return None
    dnu = min((PLATNOST_DNU.get(t, PLATNOST_VYCHOZI) for t in pol.get("tridy", [])),
              default=PLATNOST_VYCHOZI)
    return (publikovano.date() + timedelta(days=dnu)).isoformat()


def zpracuj_skolu(redizo: str, zaznam: dict, stav: dict, dnes: date) -> dict:
    odpoved = stahni_feed(zaznam["feed_url"], stav.get("etag"), stav.get("modified_since"))
    vysledek = {"redizo": redizo, "feed_url": zaznam["feed_url"], "zdroj": zaznam.get("zdroj")}
    if odpoved.get("chyba"):
        return {**vysledek, "stav": "chyba", "chyba": odpoved["chyba"]}
    if odpoved.get("beze_zmeny"):
        return {**vysledek, "stav": "beze_zmeny"}

    polozky = parse_feed(odpoved["text"])
    if polozky is None:
        return {**vysledek, "stav": "chyba", "chyba": "feed se nepodařilo rozparsovat"}

    od = datetime.now(timezone.utc) - timedelta(days=OKNO_DNU)
    oklasifikuj_polozky(polozky)
    vystup = []
    for p in polozky:
        url = (p.get("odkaz") or "").strip()
        titulek = (p.get("titulek") or "").strip()
        if not url.startswith("http") or not titulek:
            continue
        publikovano = p.get("datum")
        if publikovano and publikovano < od:
            continue
        # Publikační rozhodnutí se dělá znovu se **dnem zobrazení**: proběhlý
        # termín nesmí vzniknout jako pozvánka ani v dávce.
        pub = rozhodni_publikaci(p, publikovano, dnes)
        vystup.append({
            "identita": (p.get("guid") or "").strip() or normalizuj_url(url),
            "otisk_obsahu": otisk({**p, "url": url}),
            "titulek": titulek,
            "url": url,
            "publikovano": publikovano.isoformat() if publikovano else None,
            "tridy": p.get("tridy") or [],
            "jistota": p.get("jistota") or {},
            "stav_sdeleni": p.get("stav"),
            "zobrazeni": pub["zobrazeni"],
            "zpusobily_email": bool(pub["email"]),
            "duvod": pub.get("duvod"),
            "terminy": pub.get("terminy") or [],
            "konec_platnosti": konec_platnosti({**p, "publikace": pub}, publikovano),
            "verze_pravidel": VERZE_PRAVIDEL,
            # Co bylo čtenáři sděleno – pro porovnání významu opravy (3.2).
            "zobrazovana_pole": {"titulek": titulek, "url": url, "zobrazeni": pub["zobrazeni"]},
            "extrahovana_tvrzeni": {
                "tridy": p.get("tridy") or [],
                "terminy": pub.get("terminy") or [],
                "stav": p.get("stav"),
                "data_akce": sorted((p.get("data_akce") or {}).get("podrobne", {}).keys())
                if set(p.get("tridy") or []) & set(TRIDY_S_POZVANKOU) else [],
            },
        })
    return {
        **vysledek,
        "stav": "ok",
        "etag": odpoved.get("etag"),
        "modified_since": odpoved.get("modified"),
        "polozky": vystup,
    }


def main() -> None:
    p = argparse.ArgumentParser(description="Sklizeň školních novinek do dávky.")
    p.add_argument("--stav", help="JSON se stavem zdrojů z databáze (etagy, splatnost)")
    p.add_argument("--vystup", required=True, help="kam zapsat dávku")
    p.add_argument("--jen", type=int, help="omezit počet škol (zkouška)")
    p.add_argument("--registr", default=str(REGISTR))
    args = p.parse_args()

    registr = json.loads(Path(args.registr).read_text())["skoly"]
    stavy = {}
    if args.stav:
        stavy = {s["redizo"]: s for s in json.loads(Path(args.stav).read_text()).get("zdroje", [])}

    dnes = datetime.now(timezone.utc).date()
    ted = datetime.now(timezone.utc)
    # Splatné zdroje: klidný feed se kontroluje méně často, blízký termín častěji.
    # Bez stavu (první běh) jsou splatné všechny.
    polozky = [(r, z) for r, z in registr.items()
               if not stavy.get(r, {}).get("dalsi_kontrola_at")
               or datetime.fromisoformat(stavy[r]["dalsi_kontrola_at"]) <= ted]
    if args.jen:
        polozky = polozky[: args.jen]

    vysledky = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=SOUBEZNE) as exe:
        budouci = {exe.submit(zpracuj_skolu, r, z, stavy.get(r, {}), dnes): r for r, z in polozky}
        for b in concurrent.futures.as_completed(budouci):
            vysledky.append(b.result())

    davka = {
        "meta": {
            "zahajeno": ted.isoformat(),
            "dokonceno": datetime.now(timezone.utc).isoformat(),
            "verze_pravidel": VERZE_PRAVIDEL,
            "zdroju_zkouseno": len(vysledky),
            "zdroju_ok": sum(1 for v in vysledky if v["stav"] == "ok"),
            "zdroju_beze_zmeny": sum(1 for v in vysledky if v["stav"] == "beze_zmeny"),
            "zdroju_chyba": sum(1 for v in vysledky if v["stav"] == "chyba"),
            "polozek": sum(len(v.get("polozky") or []) for v in vysledky),
        },
        "zdroje": sorted(vysledky, key=lambda v: v["redizo"]),
    }
    Path(args.vystup).write_text(json.dumps(davka, ensure_ascii=False) + "\n")
    m = davka["meta"]
    print(f"Sklizeň: {m['zdroju_ok']} ok, {m['zdroju_beze_zmeny']} beze změny, "
          f"{m['zdroju_chyba']} chyb, {m['polozek']} položek → {args.vystup}")


if __name__ == "__main__":
    main()
