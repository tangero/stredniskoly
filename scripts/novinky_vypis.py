"""Čtení novinek školy ze stránky aktualit, když škola nemá kanál novinek (RSS).

Sdílí ho sklízeč (``scripts/sklizec-novinek.py``), sondy (``scripts/sonda-mimo-rss*.py``)
i testy, aby se provoz a měření nemohly rozejít. Návrh a měření:
``docs/sonda-mimo-rss-2026.md``.

Dvě cesty ke stažení, jedna čtečka (položky ``titulek``, ``url``, ``datum``):

* **HTML výpisu** stažené přímo – ``precti_vypis()`` najde skupinu sourodých
  bloků s odkazem a datem (nebo nadpisů s datem);
* **TinyFish Fetch** pro weby, které přímé stažení odmítají (WEDOS.protection
  s výpočetní úlohou ALTCHA, časté timeouty) – služba stránku otevře ve
  skutečném prohlížeči a vrátí vykreslené HTML, které čte tatáž
  ``precti_vypis()``. TinyFish je tu jen způsob stažení, ne druhá čtečka.

Z výpisu se bere titulek, odkaz a datum; text zpráv se neukládá (autorská práva, stejně jako u feedu).
"""
from __future__ import annotations

import datetime as dt
import os
import re
from html.parser import HTMLParser
from urllib.parse import urldefrag, urljoin, urlparse

TINYFISH_URL = "https://api.fetch.tinyfish.ai"
TINYFISH_TIMEOUT = 90

RE_NOVINKY = re.compile(r"aktualit|novink|udalost|zpravy|ze-zivota|zivot-skoly|blog|clank|news|events?\b", re.I)
RE_NOVINKY_TEXT = re.compile(r"aktuality|aktuálně|novinky|události|zprávy|ze života|z života|blog|články", re.I)

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


def najdi_datum(text, dnes):
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
        if dt.date(2015, 1, 1) <= d <= dnes + dt.timedelta(days=1):
            return d
    for m in RE_DATUM_BEZ_ROKU.finditer(text or ""):
        try:
            d = dt.date(dnes.year, MESICE[m.group(2).lower()], int(m.group(1)))
        except ValueError:
            continue
        if d > dnes + dt.timedelta(days=1):
            d = d.replace(year=dnes.year - 1)
        return d
    return None


# ------------------------------------------------------- výpis z HTML

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


def _datum_uzlu(uzel, dnes):
    """Datum položky: <time datetime>, jinak první datum v textu bloku."""
    stack = [uzel]
    while stack:
        u = stack.pop()
        if u.tag == "time" and u.attrs.get("datetime"):
            d = najdi_datum(u.attrs["datetime"], dnes)
            if d:
                return d
        stack.extend(u.deti)
    return najdi_datum(uzel.cely_text(), dnes)


def precti_vypis(html, base, dnes):
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
        bez_kotvy = urldefrag(base).url
        nadpisy.append((h, bez_kotvy + "#" + kotva if kotva else base))
    nejlepsi = []
    for sada, druh in ((kandidati, "odkaz"), (nadpisy, "nadpis")):
        vysledek = _nejlepsi_skupina(sada, p.koren, dnes)
        # Nadpisy jen tehdy, když odkazy nedaly nic lepšího.
        if len(vysledek) > len(nejlepsi):
            nejlepsi = [dict(x, druh=druh) for x in vysledek]
    return sorted(nejlepsi, key=lambda x: x["datum"], reverse=True)


RE_OBECNY_ODKAZ = re.compile(r"^(více|vice|číst|cist|celý článek|pokračovat|zobrazit|detail|více informací)", re.I)
RE_JEN_MESIC = re.compile(r"^(" + "|".join(MESICE) + r")\s*20\d{2}$", re.I)


def _titulek_bloku(blok, odkazy, adresy=None):
    """Titulek položky: nadpis v bloku, jinak nejvhodnější text odkazu.

    Odkaz často obaluje celou kartu (datum, autor, perex) nebo zní „Více informací“;
    nadpis je spolehlivější. Adresa zůstává z odkazu.
    """
    href = odkazy[0][1]
    stack, nadpis, uzel_nadpisu = [blok], None, None
    while stack and nadpis is None:
        u = stack.pop(0)
        if u.tag in ("h1", "h2", "h3", "h4", "h5", "h6") and u.cely_text():
            nadpis, uzel_nadpisu = u.cely_text(), u
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
        # Adresa článku je odkaz v nadpisu; jinak by karta s odkazem na rubriku
        # („Škola“) dostala adresu rubriky. Odkaz z nadpisu nemusí být mezi
        # `odkazy` bloku (skupinu může tvořit právě odkaz na rubriku), proto se
        # hledá v uzlu nadpisu mezi všemi kandidáty stránky.
        for a in _odkazy(uzel_nadpisu, []):
            if adresy and id(a) in adresy:
                return nadpis, adresy[id(a)]
        return nadpis, href
    if len(text) > 160:
        text = text[:160].rsplit(" ", 1)[0] + "…"
    return text or blok.cely_text()[:140], href


def _nejlepsi_skupina(kandidati, koren, dnes):
    nejlepsi = []
    adresy = {id(a): href for a, href in kandidati if a.tag == "a"}
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
                d = _datum_uzlu(blok, dnes)
                if not d:
                    continue
                titulek, href = _titulek_bloku(blok, odkazy, adresy)
                # Datum se odstraní jen na začátku nebo konci titulku, ne uprostřed věty.
                titulek = re.sub(r"\s+", " ", titulek).strip()
                titulek = re.sub(r"^\(?(?:" + RE_DATUM.pattern + r")\)?\s*[-–|·:]?\s*", "", titulek, flags=re.I)
                titulek = re.sub(r"\s*[-–|·:]?\s*\(?(?:" + RE_DATUM.pattern + r")\)?$", "", titulek, flags=re.I).strip(" -–|·")
                if 8 <= len(titulek) <= 250 and not RE_JEN_MESIC.match(titulek):
                    polozky.append({"titulek": titulek[:200], "url": href, "datum": d.isoformat()})
            # Týž článek dvakrát (zvýrazněný a v seznamu): platí první výskyt.
            unik = {}
            for x in polozky:
                unik.setdefault((x["url"], x["titulek"]), x)
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




# ---------------------------------------------------- stažení přes TinyFish

def tinyfish_klic() -> str | None:
    return os.environ.get("TINYFISH_API_KEY") or None


def stahni_tinyfish(url: str, klic: str, timeout: int = TINYFISH_TIMEOUT) -> dict:
    """Stránka otevřená v prohlížeči TinyFish Fetch, jako HTML celého ``<body>``.

    Bez ``include_selectors`` vrací služba jen „hlavní obsah“ bez odkazů a tříd,
    na kterém čtečka výpisu nefunguje; s ``["body"]`` vrátí vykreslený DOM.
    Vrací ``{"text", "url"}`` (konečná adresa po přesměrování), nebo ``{"chyba"}``.
    Fetch je zdarma; sklízeč mu posílá jen zdroje, které přímo stáhnout nejde.
    """
    import requests
    try:
        r = requests.post(TINYFISH_URL, timeout=timeout,
                          headers={"X-API-Key": klic, "Content-Type": "application/json"},
                          json={"urls": [url], "format": "html", "include_selectors": ["body"], "ttl": 0})
    except Exception as e:  # síť – stav zdroje, ne chyba běhu
        return {"chyba": f"TinyFish {type(e).__name__}"}
    if r.status_code != 200:
        return {"chyba": f"TinyFish HTTP {r.status_code}"}
    try:
        j = r.json()
    except ValueError:
        return {"chyba": "TinyFish nečitelná odpověď"}
    vysledky = j.get("results") or []
    if not vysledky or not vysledky[0].get("text"):
        chyby = j.get("errors") or [{}]
        return {"chyba": f"TinyFish {str(chyby[0].get('error') or 'prázdná odpověď')[:60]}"}
    return {"text": vysledky[0]["text"], "url": vysledky[0].get("final_url") or url}
