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
from html.parser import HTMLParser
from urllib.parse import urljoin, urlparse

import requests

requests.packages.urllib3.disable_warnings()

UA = "prijimackynaskolu.cz sonda; pruzkum cest k novinkam skolnich webu (kontakt: web)"
T = 10
DNES = dt.date(2026, 10, 1)
RE_NOVINKY = re.compile(r"aktualit|novink|udalost|zpravy|ze-zivota|zivot-skoly|blog|clank|news|events?\b", re.I)
RE_NOVINKY_TEXT = re.compile(r"aktuality|aktuálně|novinky|události|zprávy|ze života|z života|blog|články", re.I)
SITEMAP_CESTY = ("/sitemap.xml", "/sitemap_index.xml", "/wp-sitemap.xml", "/sitemap.php")
MAX_PODSITEMAP = 12

MESICE = {
    "ledna": 1, "února": 2, "března": 3, "dubna": 4, "května": 5, "června": 6,
    "července": 7, "srpna": 8, "září": 9, "října": 10, "listopadu": 11, "prosince": 12,
    "leden": 1, "únor": 2, "březen": 3, "duben": 4, "květen": 5, "červen": 6,
    "červenec": 7, "srpen": 8, "říjen": 10, "listopad": 11, "prosinec": 12,
}
RE_DATUM = re.compile(
    r"(?<!\d)(\d{1,2})\.\s?(\d{1,2})\.\s?(20\d{2})(?!\d)"          # 12. 9. 2026
    r"|(?<!\d)(20\d{2})-(\d{2})-(\d{2})(?!\d)"                     # 2026-09-12
    r"|(?<!\d)(\d{1,2})\.\s?(" + "|".join(MESICE) + r")\s+(20\d{2})",  # 12. září 2026
    re.I,
)
# Datum bez roku („25. září“) píše řada výpisů; rok se doplní jako nejbližší minulý.
RE_DATUM_BEZ_ROKU = re.compile(r"(?<!\d)(\d{1,2})\.\s?(" + "|".join(MESICE) + r")(?!\s*20\d{2})", re.I)


def najdi_datum(text):
    """První datum v textu jako date, nebo None. Nepřijímá data v budoucnu o víc než den."""
    for m in RE_DATUM.finditer(text or ""):
        try:
            if m.group(1):
                d = dt.date(int(m.group(3)), int(m.group(2)), int(m.group(1)))
            elif m.group(4):
                d = dt.date(int(m.group(4)), int(m.group(5)), int(m.group(6)))
            else:
                d = dt.date(int(m.group(9)), MESICE[m.group(8).lower()], int(m.group(7)))
        except ValueError:
            continue
        if dt.date(2015, 1, 1) <= d <= DNES + dt.timedelta(days=1):
            return d
    for m in RE_DATUM_BEZ_ROKU.finditer(text or ""):
        try:
            d = dt.date(DNES.year, MESICE[m.group(2).lower()], int(m.group(1)))
        except ValueError:
            continue
        if d > DNES + dt.timedelta(days=1):
            d = d.replace(year=DNES.year - 1)
        return d
    return None


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

class _Uzel:
    __slots__ = ("tag", "attrs", "deti", "rodic", "text")

    def __init__(self, tag, attrs, rodic):
        self.tag, self.attrs, self.rodic = tag, dict(attrs), rodic
        self.deti, self.text = [], []

    def cely_text(self):
        casti = list(self.text)
        for d in self.deti:
            casti.append(d.cely_text())
        return " ".join(c for c in casti if c).strip()

    def podpis(self):
        # Číslované třídy (row-0, item-12) by rozbily sourodé položky do skupin po jedné.
        trida = " ".join(sorted({re.sub(r"\d+", "", c) for c in (self.attrs.get("class") or "").split()}))
        return f"{self.tag}.{trida}"


PRAZDNE = {"br", "img", "hr", "meta", "link", "input", "source", "wbr", "area", "col", "base", "embed", "param", "track"}
VYNECHAT = {"script", "style", "noscript", "svg", "template"}


class _Strom(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.koren = _Uzel("root", [], None)
        self.akt = self.koren
        self.preskoc = 0

    def handle_starttag(self, tag, attrs):
        if self.preskoc:
            if tag in VYNECHAT:
                self.preskoc += 1
            return
        if tag in VYNECHAT:
            self.preskoc = 1
            return
        u = _Uzel(tag, attrs, self.akt)
        self.akt.deti.append(u)
        if tag not in PRAZDNE:
            self.akt = u

    def handle_endtag(self, tag):
        if self.preskoc:
            if tag in VYNECHAT:
                self.preskoc -= 1
            return
        u = self.akt
        while u is not self.koren and u.tag != tag:
            u = u.rodic
        if u is not self.koren:
            self.akt = u.rodic

    def handle_data(self, data):
        if not self.preskoc and data.strip():
            self.akt.text.append(re.sub(r"\s+", " ", data.strip()))


def _odkazy(uzel, out):
    if uzel.tag == "a" and uzel.attrs.get("href"):
        out.append(uzel)
    for d in uzel.deti:
        _odkazy(d, out)
    return out


def _nadpisy(uzel, out):
    if uzel.tag in ("h2", "h3", "h4", "h5"):
        out.append(uzel)
    for d in uzel.deti:
        _nadpisy(d, out)
    return out


def _v_navigaci(uzel):
    # Jen nejbližší předkové: neuzavřený <nav> nebo obal stránky s třídou „nav…“
    # by jinak prohlásil za navigaci celý obsah.
    u, hloubka = uzel.rodic, 0
    while u is not None and hloubka < 6:
        hloubka += 1
        # <header> ne: HTML5 jím obaluje i nadpis každého článku ve výpisu.
        if u.tag in ("nav", "footer", "aside"):
            return True
        c = (u.attrs.get("class") or "") + " " + (u.attrs.get("id") or "")
        if re.search(r"\b(menu|nav|footer|breadcrumb|pagination|paging|strankovani)", c, re.I):
            return True
        u = u.rodic
    return False


def _datum_uzlu(uzel):
    """Datum položky: <time datetime>, jinak první datum v textu bloku."""
    stack = [uzel]
    while stack:
        u = stack.pop()
        if u.tag == "time" and u.attrs.get("datetime"):
            d = najdi_datum(u.attrs["datetime"])
            if d:
                return d
        stack.extend(u.deti)
    return najdi_datum(uzel.cely_text())


def precti_vypis(html, base):
    """Obecná čtečka výpisu: najde skupinu sourodých bloků s odkazem a datem.

    Bloky se seskupují podle podpisu (tag.třída) předka odkazu na úrovni 1–4 nad
    ním. Vyhrává skupina s nejvíc bloky, které mají datum; potřebuje aspoň tři.
    """
    p = _Strom()
    try:
        p.feed(html)
    except Exception:  # noqa: BLE001
        return []
    host = urlparse(base).netloc.replace("www.", "")
    kandidati = []
    for a in _odkazy(p.koren, []):
        href = urljoin(base, a.attrs["href"])
        pu = urlparse(href)
        if pu.scheme not in ("http", "https") or pu.netloc.replace("www.", "") != host:
            continue
        if re.search(r"\.(pdf|docx?|xlsx?|jpe?g|png|zip)$", pu.path, re.I) or _v_navigaci(a):
            continue
        kandidati.append((a, href))
    # Výpisy bez odkazu na článek: celý text zprávy stojí pod nadpisem přímo
    # na stránce aktualit. Odkazem položky je pak stránka výpisu (s kotvou, má-li ji).
    nadpisy = []
    for h in _nadpisy(p.koren, []):
        if _v_navigaci(h):
            continue
        kotva = h.attrs.get("id") or (h.rodic.attrs.get("id") if h.rodic else None)
        nadpisy.append((h, base + ("#" + kotva if kotva else "")))
    nejlepsi = []
    for sada, druh in ((kandidati, "odkaz"), (nadpisy, "nadpis")):
        vysledek = _nejlepsi_skupina(sada, p.koren)
        # Nadpisy jen tehdy, když odkazy nedaly nic lepšího.
        if len(vysledek) > len(nejlepsi):
            nejlepsi = [dict(x, druh=druh) for x in vysledek]
    return sorted(nejlepsi, key=lambda x: x["datum"], reverse=True)


RE_OBECNY_ODKAZ = re.compile(r"^(více|vice|číst|cist|celý článek|pokračovat|zobrazit|detail|více informací)", re.I)
RE_JEN_MESIC = re.compile(r"^(" + "|".join(MESICE) + r")\s*20\d{2}$", re.I)


def _titulek_bloku(blok, odkazy):
    """Titulek položky: nadpis v bloku, jinak nejvhodnější text odkazu.

    Odkaz často obaluje celou kartu (datum, autor, perex) nebo zní „Více informací“;
    nadpis je spolehlivější. Adresa zůstává z odkazu.
    """
    href = odkazy[0][1]
    stack, nadpis = [blok], None
    while stack and nadpis is None:
        u = stack.pop(0)
        if u.tag in ("h1", "h2", "h3", "h4", "h5", "h6") and u.cely_text():
            nadpis = u.cely_text()
        stack.extend(u.deti)
    vhodne = [(a.cely_text(), h) for a, h in odkazy
              if a.cely_text() and not RE_OBECNY_ODKAZ.match(a.cely_text())]
    if vhodne:
        # Nejkratší rozumný text: celou kartu obalující odkaz je nejdelší.
        rozumne = [v for v in vhodne if len(v[0]) >= 8] or vhodne
        text, href = min(rozumne, key=lambda v: len(v[0])) if nadpis else max(rozumne, key=lambda v: len(v[0]))
    else:
        text = ""
    if nadpis:
        return nadpis, href
    if len(text) > 160:
        text = text[:160].rsplit(" ", 1)[0] + "…"
    return text or blok.cely_text()[:140], href


def _nejlepsi_skupina(kandidati, koren):
    nejlepsi = []
    for uroven in range(1, 6):
        skupiny = {}
        for a, href in kandidati:
            blok = a
            for _ in range(uroven):
                if blok.rodic is None or blok.rodic is koren:
                    break
                blok = blok.rodic
            klic = (id(blok.rodic), blok.podpis())
            skupiny.setdefault(klic, {})
            skupiny[klic].setdefault(id(blok), (blok, []))[1].append((a, href))
        for bloky in skupiny.values():
            polozky = []
            for blok, odkazy in bloky.values():
                d = _datum_uzlu(blok)
                if not d:
                    continue
                titulek, href = _titulek_bloku(blok, odkazy)
                # Datum se odstraní jen na začátku nebo konci titulku, ne uprostřed věty.
                titulek = re.sub(r"\s+", " ", titulek).strip()
                titulek = re.sub(r"^\(?(?:" + RE_DATUM.pattern + r")\)?\s*[-–|·:]?\s*", "", titulek, flags=re.I)
                titulek = re.sub(r"\s*[-–|·:]?\s*\(?(?:" + RE_DATUM.pattern + r")\)?$", "", titulek, flags=re.I).strip(" -–|·")
                if 8 <= len(titulek) <= 250 and not RE_JEN_MESIC.match(titulek):
                    polozky.append({"titulek": titulek[:200], "url": href, "datum": d.isoformat()})
            unik = {(x["url"], x["titulek"]): x for x in polozky}
            polozky = list(unik.values())
            # Stejná adresa u všech položek bez kotvy znamená, že URL nerozlišuje;
            # dedup by pak sloučil celou skupinu, proto se klíčuje i titulkem.
            if len(polozky) >= 3 and len(polozky) > len(nejlepsi):
                nejlepsi = polozky
    return nejlepsi


def najdi_stranku_aktualit(html, base):
    p = _Strom()
    try:
        p.feed(html)
    except Exception:  # noqa: BLE001
        return None
    host = urlparse(base).netloc.replace("www.", "")
    nejlepsi = None
    for a in _odkazy(p.koren, []):
        href = urljoin(base, a.attrs["href"])
        pu = urlparse(href)
        if pu.netloc.replace("www.", "") != host or re.search(r"\.(pdf|docx?|jpe?g|png)$", pu.path, re.I):
            continue
        text = a.cely_text()
        skore = (2 if RE_NOVINKY_TEXT.fullmatch(text.strip()) else 1 if RE_NOVINKY_TEXT.search(text) else 0) \
            + (1 if RE_NOVINKY.search(pu.path) else 0)
        if skore and (nejlepsi is None or skore > nejlepsi[0]):
            nejlepsi = (skore, href)
    return nejlepsi[1] if nejlepsi else None


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
