"""Stažení článku ze školního webu kvůli termínu, který ve feedu není.

Proč to vůbec děláme. Na vzorku 300 feedů (21. 9. 2026) leží termín v titulku
nebo perexu jen u 6 z 22 pozvánek; u 13 z 22 v textu, který feed dává, **žádné
datum není** – škola ho napsala až do článku. Perex mívá medián 253 znaků a
každý druhý je kratší než 200 znaků, tedy useknutý uprostřed věty.

Co se s textem smí a nesmí dělat (``docs/zdroje-dat.md`` 2.14):

* **čte se, nepřebírá se.** Z článku bereme fakta – datum, čas, název akce –
  a větu na kartě skládá náš kód ze šablony. Text školy se nezobrazuje ani
  neukládá; v databázi zůstává jeho otisk, termíny a naše věta;
* **do modelu jde nanejvýš jedna věta.** ``state`` rozhodovacího modelu je pořád
  karta položky (podmínka z P6: Jev s délkou kontextu ztrácí kvalitu). Článek
  slouží kódu k tomu, aby našel data a jejich klauzule; modelu se pak předkládá
  ta jedna klauzule, ve které datum leží, ne celý text;
* **ptáme se robots.txt** a stahujeme jen stránku, na kterou feed sám odkazuje.

Stahuje se jen u položek, u kterých má smysl se ptát: pozvánka na akci školy
pro uchazeče, u které v titulku ani perexu datum není. Ostatní články se
nestahují vůbec.
"""
from __future__ import annotations

import hashlib
import re
import urllib.error
import urllib.parse
import urllib.request
import urllib.robotparser
import unicodedata

UA = "prijimackynaskolu.cz (+https://www.prijimackynaskolu.cz/o-projektu)"
LIMIT_STAZENI = 1_000_000   # bajtů; školní stránka bývá do 200 kB
LIMIT_TEXTU = 20_000        # znaků textu, který se dál zpracovává
CASOVY_LIMIT = 20

# Bloky, které na školní stránce nejsou článkem: menu, patička, postranní panel,
# formuláře. Kdyby se nechaly v textu, „Přihlášení do systému" by v patičce
# vyrobilo téma `prihlaska` na každém článku školy.
RE_BLOKY = re.compile(
    r"<(script|style|nav|header|footer|aside|form|noscript|svg|select)\b.*?</\1>",
    re.S | re.I)
RE_KOMENTAR = re.compile(r"<!--.*?-->", re.S)
# Blokové značky na hranici věty: bez nich by se „Den otevřených dveří</h2><p>9. 12."
# slilo do jedné klauzule a datum by se ocitlo ve větě s nadpisem.
RE_BLOKOVA = re.compile(r"</(p|div|li|tr|h[1-6]|section|article|td|blockquote)>|<br\s*/?>",
                        re.I)
RE_ZNACKA = re.compile(r"<[^>]+>")
# Hlavní obsah stránky, když ho šablona označí. Bez tohohle zúžení se do textu
# dostane postranní panel s odkazy na jiné články – a s ním jejich data. Naměřeno
# na stredniskola.cz: k pozvánce na přijímačky nanečisto se tak přimíchaly
# termíny z upoutávek „Obor IT je zpět na SSIPS" a „Výsledky přijímacího řízení".
# Cizí datum přiřazené k téhle zprávě je horší než žádné datum.
RE_HLAVNI = re.compile(r"<(article|main)\b[^>]*>(.*)</\1>", re.S | re.I)

# Rozparsovaný robots.txt na web. `None` = web robots.txt nemá (smí se),
# `"zakaz"` = robots.txt je za přihlášením, což je zákaz celého webu.
_robots: dict[str, urllib.robotparser.RobotFileParser | str | None] = {}


def smi_stahovat(url: str) -> bool:
    """Dotaz na robots.txt daného webu.

    Robots.txt si stahujeme sami a předáváme parseru jako text. ``RobotFileParser.read()``
    si ho totiž stáhne bez našeho User-Agenta a při odpovědi 401/403 nastaví
    ``disallow_all`` – zákaz, který web nevyslovil. Naměřeno na spgsmb.cz, jehož
    robots.txt zakazuje jen ``/wp-admin/``, ale článek se přesto nestáhl.

    Nedostupný robots.txt se bere jako souhlas, jak to chápe i standard; chyba
    při jeho čtení nesmí zastavit sklizeň."""
    try:
        rozklad = urllib.parse.urlsplit(url)
        zaklad = f"{rozklad.scheme}://{rozklad.netloc}"
    except ValueError:
        return False
    if zaklad not in _robots:
        parser = urllib.robotparser.RobotFileParser()
        try:
            zadost = urllib.request.Request(
                f"{zaklad}/robots.txt", headers={"User-Agent": UA, "Accept": "text/plain"})
            with urllib.request.urlopen(zadost, timeout=CASOVY_LIMIT) as odpoved:
                if odpoved.status == 200:
                    parser.parse(odpoved.read(200_000).decode("utf-8", "replace").splitlines())
                else:
                    parser = None  # web robots.txt nemá; stahovat se smí
        except urllib.error.HTTPError as e:
            # 401/403 na robots.txt je zákaz celého webu, 404 a jiné znamenají,
            # že web robots.txt nemá.
            parser = "zakaz" if e.code in (401, 403) else None
        except Exception:
            parser = None
        _robots[zaklad] = parser
    parser = _robots[zaklad]
    if parser is None:
        return True
    if parser == "zakaz":
        return False
    try:
        return parser.can_fetch(UA, url)
    except Exception:
        return True


def _slova(text: str) -> set[str]:
    """Významová slova bez diakritiky; krátká se zahazují („na", „se", „do")."""
    bez = unicodedata.normalize("NFD", text).encode("ascii", "ignore").decode().lower()
    return {s for s in re.findall(r"[a-z0-9]+", bez) if len(s) > 3}


def vyber_hlavni(html_text: str, titulek: str = "") -> str:
    """Z několika ``<article>``/``<main>`` bloků vybere ten, který je tím článkem.

    Šablony WordPressu obalují ``<article>`` i každou upoutávku v postranním
    panelu, takže „nejkratší blok" ani „první blok" nefunguje – naměřeno na
    stredniskola.cz, kde se takhle vybrala upoutávka na jiný článek a s ní jeho
    termíny. Rozhoduje proto shoda s titulkem zprávy, který máme z feedu: článek
    svůj vlastní titulek obsahuje, cizí upoutávka ne.

    Bez titulku nebo bez rozumné shody se blok nevybírá vůbec a vrací se celý
    text. Přimíchat cizí datum je horší než mít o pár řádků navíc."""
    kandidati = [m.group(2) for m in RE_HLAVNI.finditer(html_text)]
    kandidati = [k for k in kandidati if len(RE_ZNACKA.sub(" ", k).strip()) > 200]
    if not kandidati:
        return html_text
    hledana = _slova(titulek)
    if not hledana:
        return html_text
    def shoda(blok: str) -> float:
        return len(hledana & _slova(RE_ZNACKA.sub(" ", blok))) / len(hledana)
    nejlepsi = max(kandidati, key=lambda b: (shoda(b), -len(b)))
    return nejlepsi if shoda(nejlepsi) >= 0.6 else html_text


def na_text(html_text: str, titulek: str = "") -> str:
    """HTML na holý text. Nadpisy a odstavce končí tečkou, aby se věty neslily."""
    t = RE_KOMENTAR.sub(" ", html_text)
    t = RE_BLOKY.sub(" ", t)
    t = vyber_hlavni(t, titulek)
    t = RE_BLOKOVA.sub(". ", t)
    t = RE_ZNACKA.sub(" ", t)
    import html as _html
    t = _html.unescape(t).replace("\xa0", " ")
    t = re.sub(r"\s+", " ", t)
    t = re.sub(r"(\.\s*){2,}", ". ", t)
    return t.strip()[:LIMIT_TEXTU]


def stahni_clanek(url: str, titulek: str = "") -> dict | None:
    """Text článku a jeho otisk, nebo ``None``, když se stáhnout nedá.

    ``None`` znamená „nevíme", ne „článek nic neobsahuje": volající v takovém
    případě zůstane u toho, co dal feed."""
    if not url or not url.startswith(("http://", "https://")):
        return None
    if not smi_stahovat(url):
        return None
    zadost = urllib.request.Request(url, headers={
        "User-Agent": UA, "Accept": "text/html,application/xhtml+xml"})
    try:
        with urllib.request.urlopen(zadost, timeout=CASOVY_LIMIT) as odpoved:
            typ = (odpoved.headers.get("content-type") or "").lower()
            if "html" not in typ and typ:
                return None
            syrove = odpoved.read(LIMIT_STAZENI)
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, OSError):
        return None
    kodovani = "utf-8"
    if (m := re.search(rb'charset=["\']?([\w-]+)', syrove[:4000], re.I)):
        kodovani = m.group(1).decode("ascii", "ignore") or "utf-8"
    try:
        html_text = syrove.decode(kodovani, "replace")
    except LookupError:
        html_text = syrove.decode("utf-8", "replace")
    text = na_text(html_text, titulek)
    if not text:
        return None
    return {"text": text, "otisk": hashlib.sha256(text.encode()).hexdigest()[:32]}
