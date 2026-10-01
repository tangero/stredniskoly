"""Sonda: dají se novinky škol bez RSS číst ze sitemap.xml nebo z výpisu aktualit?

Pro všechny školy, které mají živou titulní stránku a žádný platný feed
(sonda feedů z 19. 9. 2026), zjistí:

1. **sitemap** – najde ji přes robots.txt (`Sitemap:`) nebo na typických cestách,
   projde index, spočítá adresy článků, podíl s `lastmod` a čerstvost nejnovější;
2. **výpis aktualit** – z titulky najde odkaz na stránku aktualit a obecnou
   čtečkou (opakující se blok s odkazem a datem) z ní vytáhne položky
   (titulek, odkaz, datum).

Nic nezapisuje do databáze ani na web. Výstup je JSON v data/sondy/.
Placené služby (Parallel, Exa) porovnává zvlášť `scripts/sonda-mimo-rss-sluzby.py`.

    .venv/bin/python scripts/sonda-mimo-rss.py [--jen N] [VYSTUP]
"""
import concurrent.futures
import datetime as dt
import json
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path
from urllib.parse import urlparse

import requests

sys.path.insert(0, str(Path(__file__).resolve().parent))
import novinky_vypis as nv  # noqa: E402
from novinky_vypis import RE_NOVINKY  # noqa: E402

requests.packages.urllib3.disable_warnings()

UA = "prijimackynaskolu.cz sonda; pruzkum cest k novinkam skolnich webu (kontakt: web)"
T = 10
DNES = dt.date(2026, 10, 1)
SITEMAP_CESTY = ("/sitemap.xml", "/sitemap_index.xml", "/wp-sitemap.xml", "/sitemap.php")
MAX_PODSITEMAP = 12


def stahni(u, limit=1_500_000):
    try:
        r = requests.get(u, timeout=T, allow_redirects=True, verify=False,
                         headers={"User-Agent": UA}, stream=True)
        if r.status_code != 200:
            r.close()
            return (r.status_code, "", r.url)
        t = r.raw.read(limit, decode_content=True)
        r.close()
        enc = r.encoding if r.encoding and r.encoding.lower() != "iso-8859-1" else "utf-8"
        return (200, t.decode(enc, errors="replace"), r.url)
    except Exception as e:  # noqa: BLE001 – sonda zapisuje druh chyby, nepadá
        return (type(e).__name__, "", u)


# ---------------------------------------------------------------- sitemap

def _xml_koren(text):
    text = text.lstrip("﻿ \n\r\t")
    if not text.startswith("<"):
        return None
    try:
        return ET.fromstring(text.encode("utf-8", errors="replace"))
    except ET.ParseError:
        return None


def _bez_ns(tag):
    return tag.rsplit("}", 1)[-1]


def je_clanek(url, zaklad_host):
    p = urlparse(url)
    if p.netloc and p.netloc.replace("www.", "") != zaklad_host.replace("www.", ""):
        return False
    segmenty = [s for s in p.path.split("/") if s]
    # /aktuality/nazev-clanku, /cz/novinky/nazev …: rubrika v prvních dvou segmentech a pod ní článek.
    if len(segmenty) >= 2 and any(RE_NOVINKY.search(s) for s in segmenty[:-1][:2]):
        return True
    # WordPress: /2026/09/nazev/ nebo /?p=123
    if re.match(r"^/20\d{2}/\d{2}/", p.path) or re.search(r"[?&]p=\d+", p.query or ""):
        return True
    return False


def sonduj_sitemap(zaklad):
    host = urlparse(zaklad).netloc
    out = {"nalezena": False, "odkud": None, "url_celkem": 0, "clanku": 0,
           "s_lastmod": 0, "nejnovejsi_clanek": None, "clanku_30d": 0, "clanku_365d": 0}
    kandidati = []
    rb = stahni(zaklad + "/robots.txt", limit=100_000)
    if rb[0] == 200:
        kandidati += [(m.group(1).strip(), "robots") for m in re.finditer(r"(?im)^\s*sitemap:\s*(\S+)", rb[1])]
    kandidati += [(zaklad + c, "cesta") for c in SITEMAP_CESTY]
    fronta, videno, zaznamy = [], set(), []
    for u, odkud in kandidati:
        if u in videno:
            continue
        videno.add(u)
        r = stahni(u)
        koren = _xml_koren(r[1]) if r[0] == 200 else None
        if koren is not None and _bez_ns(koren.tag) in ("urlset", "sitemapindex"):
            out["nalezena"], out["odkud"] = True, odkud
            fronta.append(koren)
            break
    podsitemap = 0
    while fronta:
        koren = fronta.pop(0)
        if _bez_ns(koren.tag) == "sitemapindex":
            deti = [(_text(s, "loc"), _text(s, "lastmod")) for s in koren if _bez_ns(s.tag) == "sitemap"]
            # Přednost mají podsitemapy s články; stránky, média a štítky na konec.
            deti.sort(key=lambda d: (not re.search(r"post|news|aktual|novink|article|clank", d[0] or "", re.I),
                                      bool(re.search(r"tag|categor|author|attachment|media|image", d[0] or "", re.I))))
            for loc, _ in deti:
                if not loc or loc in videno or podsitemap >= MAX_PODSITEMAP:
                    continue
                videno.add(loc)
                podsitemap += 1
                r = stahni(loc)
                k = _xml_koren(r[1]) if r[0] == 200 else None
                if k is not None:
                    fronta.append(k)
        else:
            for u in koren:
                if _bez_ns(u.tag) == "url":
                    zaznamy.append((_text(u, "loc") or "", _text(u, "lastmod")))
    out["url_celkem"] = len(zaznamy)
    nejnovejsi = None
    for loc, lm in zaznamy:
        if not je_clanek(loc, host):
            continue
        out["clanku"] += 1
        if lm:
            out["s_lastmod"] += 1
            try:
                d = dt.date.fromisoformat(lm.strip()[:10])
            except ValueError:
                continue
            if d > DNES + dt.timedelta(days=1):
                continue
            nejnovejsi = max(nejnovejsi, d) if nejnovejsi else d
            stari = (DNES - d).days
            out["clanku_30d"] += stari <= 30
            out["clanku_365d"] += stari <= 365
    out["nejnovejsi_clanek"] = nejnovejsi.isoformat() if nejnovejsi else None
    return out


def _text(el, jmeno):
    for c in el:
        if _bez_ns(c.tag) == jmeno:
            return (c.text or "").strip()
    return None


# ---------------------------------------------------------- výpis aktualit

# Čtečka výpisu je jediná, sdílená se sklízečem (scripts/novinky_vypis.py);
# sonda jí jen předává den čtení.

def najdi_datum(text):
    return nv.najdi_datum(text, DNES)


def precti_vypis(html, base):
    return nv.precti_vypis(html, base, DNES)


najdi_stranku_aktualit = nv.najdi_stranku_aktualit


# ------------------------------------------------------------------ běh

def sonduj(z):
    cil = z.get("finalni_url") or z["web"]
    out = {"redizo": z["redizo"], "web": cil, "titulka": None, "stranka_aktualit": None,
           "vypis": {"stav": None, "polozek": 0, "nejnovejsi": None, "polozek_30d": 0, "ukazka": []},
           "titulka_vypis": 0}
    ti = stahni(cil)
    out["titulka"] = ti[0]
    zaklad = "{0.scheme}://{0.netloc}".format(urlparse(ti[2] if ti[0] == 200 else cil))
    out["sitemap"] = sonduj_sitemap(zaklad)
    if ti[0] != 200:
        out["vypis"]["stav"] = "titulka_nedostupna"
        return out
    # Některé školy mají aktuality přímo na titulce.
    out["titulka_vypis"] = len(precti_vypis(ti[1], ti[2]))
    sa = najdi_stranku_aktualit(ti[1], ti[2])
    out["stranka_aktualit"] = sa
    polozky, stav = [], "bez_odkazu"
    if sa:
        r = stahni(sa)
        if r[0] == 200:
            polozky = precti_vypis(r[1], r[2])
            stav = "precteno" if polozky else "nerozpoznano"
        else:
            stav = f"stranka_{r[0]}"
    if not polozky and out["titulka_vypis"]:
        polozky, stav = precti_vypis(ti[1], ti[2]), "z_titulky"
    v = out["vypis"]
    v["stav"], v["polozek"] = stav, len(polozky)
    if polozky:
        v["nejnovejsi"] = polozky[0]["datum"]
        v["polozek_30d"] = sum((DNES - dt.date.fromisoformat(x["datum"])).days <= 30 for x in polozky)
        v["ukazka"] = polozky[:5]
    return out


def main():
    args = sys.argv[1:]
    jen = None
    if "--jen" in args:
        i = args.index("--jen")
        jen = int(args[i + 1])
        del args[i:i + 2]
    vystup = args[0] if args else "data/sondy/mimo-rss-20261001.json"
    s = json.load(open("data/sondy/rss-webu-skol-20260919.json"))
    feedy = json.load(open("public/skoly_feedy.json"))["skoly"]
    skoly = [z for z in s["skoly"] if z["redizo"] not in feedy and z.get("titulka") == 200]
    if jen:
        skoly = skoly[:jen]
    print(f"škol bez feedu se živou titulkou (sonda 19. 9.): {len(skoly)}", flush=True)
    with concurrent.futures.ThreadPoolExecutor(max_workers=16) as pool:
        vysl = list(pool.map(sonduj, skoly))
    n = len(vysl)
    sm = [v["sitemap"] for v in vysl]
    souhrn = {
        "skol": n,
        "titulka_ok_dnes": sum(v["titulka"] == 200 for v in vysl),
        "sitemap_nalezena": sum(x["nalezena"] for x in sm),
        "sitemap_z_robots": sum(x["odkud"] == "robots" for x in sm),
        "sitemap_s_clanky": sum(x["clanku"] > 0 for x in sm),
        "sitemap_clanky_s_lastmod": sum(x["s_lastmod"] > 0 for x in sm),
        "sitemap_clanek_do_30d": sum(x["clanku_30d"] > 0 for x in sm),
        "sitemap_clanek_do_365d": sum(x["clanku_365d"] > 0 for x in sm),
        "stranka_aktualit_nalezena": sum(bool(v["stranka_aktualit"]) for v in vysl),
        "vypis_precten": sum(v["vypis"]["polozek"] > 0 for v in vysl),
        "vypis_polozka_do_30d": sum(v["vypis"]["polozek_30d"] > 0 for v in vysl),
        "vypis_stavy": {},
        "vypis_nebo_sitemap_do_30d": sum(v["vypis"]["polozek_30d"] > 0 or v["sitemap"]["clanku_30d"] > 0 for v in vysl),
        "jen_sitemap_do_30d": sum(v["vypis"]["polozek_30d"] == 0 and v["sitemap"]["clanku_30d"] > 0 for v in vysl),
    }
    for v in vysl:
        souhrn["vypis_stavy"][v["vypis"]["stav"]] = souhrn["vypis_stavy"].get(v["vypis"]["stav"], 0) + 1
    print(json.dumps(souhrn, ensure_ascii=False, indent=1))
    json.dump({"meta": {"kdy": DNES.isoformat(), "popis": __doc__.strip().splitlines()[0],
                        "skript": "scripts/sonda-mimo-rss.py",
                        "vstup": "data/sondy/rss-webu-skol-20260919.json bez škol z public/skoly_feedy.json"},
               "souhrn": souhrn, "skoly": vysl},
              open(vystup, "w"), ensure_ascii=False, indent=1)
    print(f"-> {vystup}")


if __name__ == "__main__":
    main()
