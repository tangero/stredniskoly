"""Oddíl Rychlost týdenního souhrnu signálů z Chrome UX Report API (zadání #326, etapa 2).

Čte veřejná souhrnná data CrUX (percentil p75 metrik LCP, INP a CLS za klouzavých 28 dní) pro origin webu
a jednu reprezentativní adresu každého hlavního typu stránky, zvlášť pro telefon a počítač:
6 klíčů × 2 formáty = 12 dotazů, prodleva 1 s (limit zadání: nejvýš 50 týdně).
Klíč `CRUX_API_KEY` jde v hlavičce `X-Goog-Api-Key`, nikdy v adrese (ta by se mohla objevit v logu).
Bez klíče se oddíl vynechá s poznámkou; chyba CrUX nikdy neshodí celý souhrn.
"""
from __future__ import annotations

import json
import os
import sys
import time
from http.client import HTTPException
from typing import Any, Callable
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

ENDPOINT = "https://chromeuxreport.googleapis.com/v1/records:queryRecord"
ORIGIN = "https://www.prijimackynaskolu.cz"
PRODLEVA_S = 1
MAX_DOTAZU = 50
DELKA_HLASKY = 300

# typ stránky -> reprezentativní adresa (ze sitemap, s vysokou návštěvností); None = celý origin
ADRESY: list[tuple[str, str | None]] = [
    ("celý web", None),
    ("titulka", "/"),
    ("škola", "/skola/600005691-gymnazium-jana-keplera-parlerova"),
    ("obor", "/skola/600005691-gymnazium-jana-keplera-parlerova-gymnazium-4lete"),
    ("město", "/mesto/praha"),
    ("simulátor", "/simulator"),
]
FORMATY = [("PHONE", "telefon"), ("DESKTOP", "počítač")]

# metrika CrUX -> (zkratka, jednotka, práh „dobrá“, práh „špatná“); prahy jsou Googlovy (web.dev/vitals)
METRIKY: dict[str, tuple[str, str, float, float]] = {
    "largest_contentful_paint": ("LCP", "ms", 2500, 4000),
    "interaction_to_next_paint": ("INP", "ms", 200, 500),
    "cumulative_layout_shift": ("CLS", "", 0.1, 0.25),
}

BEZ_DAT = "bez dat"  # CrUX vrací 404, když adresa nemá dost návštěv z Chrome

Fetch = Callable[[dict[str, Any]], Any]


class ChybaCrux(RuntimeError):
    """CrUX dotaz odmítlo (klíč, nezapnuté API, kvóta); text je hláška bez klíče."""


def hlaska(telo: bytes | str, klic: str = "") -> str:
    if isinstance(telo, bytes):
        telo = telo.decode("utf-8", errors="replace")
    text = telo
    try:
        data = json.loads(telo)
        if isinstance(data, dict) and isinstance(data.get("error"), dict):
            text = str(data["error"].get("message", text))
    except ValueError:
        pass
    if klic:
        text = text.replace(klic, "***")
    return " ".join(text.split())[:DELKA_HLASKY] or "(prázdná odpověď)"


def dotazy() -> list[tuple[str, str, str, dict[str, Any]]]:
    """(typ stránky, adresa, formát, tělo dotazu) pro všech 12 dotazů."""
    out = []
    for typ, cesta in ADRESY:
        cil = {"origin": ORIGIN} if cesta is None else {"url": ORIGIN + cesta}
        for format_, _ in FORMATY:
            out.append((typ, cesta or ORIGIN, format_, {**cil, "formFactor": format_, "metrics": list(METRIKY)}))
    return out


def fetch_crux(klic: str) -> Fetch:
    def fetch(telo: dict[str, Any]) -> Any:
        req = Request(ENDPOINT, data=json.dumps(telo).encode(), method="POST",
                      headers={"Content-Type": "application/json", "X-Goog-Api-Key": klic})
        try:
            with urlopen(req, timeout=60) as odpoved:
                return json.load(odpoved)
        except HTTPError as e:
            if e.code == 404:
                e.close()
                return None  # adresa nemá v CrUX dost dat
            telo_chyby = e.read()
            e.close()
            raise ChybaCrux(f"HTTP {e.code}: {hlaska(telo_chyby, klic)}") from None
        except URLError as e:
            raise ChybaCrux(f"síťová chyba: {hlaska(str(e.reason), klic)}") from None
    return fetch


def stahni(fetch: Fetch, spanek: Callable[[float], None] = time.sleep) -> list[dict[str, Any]]:
    """Stáhne všechny dotazy postupně. Odmítnutý dotaz (ne 404) ukončí stahování: další by dopadly stejně."""
    vse = dotazy()
    assert len(vse) <= MAX_DOTAZU
    radky = []
    for i, (typ, adresa, format_, telo) in enumerate(vse):
        if i:
            spanek(PRODLEVA_S)
        data = fetch(telo)
        radky.append({"typ": typ, "adresa": adresa, "format": format_,
                      "zaznam": data.get("record") if isinstance(data, dict) else None})
    return radky


def _p75(zaznam: dict[str, Any] | None, metrika: str) -> float | None:
    try:
        return float(zaznam["metrics"][metrika]["percentiles"]["p75"])  # type: ignore[index]
    except (KeyError, TypeError, ValueError):
        return None


def hodnoceni(metrika: str, hodnota: float) -> str:
    _, _, dobra, spatna = METRIKY[metrika]
    return "dobrá" if hodnota <= dobra else ("špatná" if hodnota > spatna else "ke zlepšení")


def _bunka(zaznam: dict[str, Any] | None, metrika: str) -> str:
    h = _p75(zaznam, metrika)
    if h is None:
        return "–"
    _, jednotka, _, _ = METRIKY[metrika]
    cislo = f"{h:.2f}" if not jednotka else f"{h:.0f} {jednotka}"
    return f"{cislo} ({hodnoceni(metrika, h)})"


def _obdobi(radky: list[dict[str, Any]]) -> str | None:
    for r in radky:
        try:
            cp = r["zaznam"]["collectionPeriod"]
            od, do = cp["firstDate"], cp["lastDate"]
            return f"{od['year']}-{od['month']:02d}-{od['day']:02d} až {do['year']}-{do['month']:02d}-{do['day']:02d}"
        except (KeyError, TypeError):
            continue
    return None


NADPIS = "## Rychlost stránek u skutečných uživatelů (CrUX)\n"


def oddil(radky: list[dict[str, Any]]) -> str:
    obdobi = _obdobi(radky)
    uvod = ("Percentil p75 za klouzavých 28 dní" + (f" ({obdobi})" if obdobi else "")
            + "; mezitýdenní srovnání z toho nejde. Hodnocení podle prahů Googlu "
            + "(LCP 2,5 a 4 s, INP 200 a 500 ms, CLS 0,1 a 0,25). "
            + f"„{BEZ_DAT}“: adresa nemá v Chrome dost návštěv.\n")
    hlavicka = ["Typ stránky", "Zařízení", *(METRIKY[m][0] for m in METRIKY)]
    nazvy_formatu = dict(FORMATY)
    out = [NADPIS, uvod, "| " + " | ".join(hlavicka) + " |", "|" + "---|" * len(hlavicka)]
    for r in radky:
        bunky = [BEZ_DAT] + [""] * (len(METRIKY) - 1) if r["zaznam"] is None else [_bunka(r["zaznam"], m) for m in METRIKY]
        out.append("| " + " | ".join([r["typ"], nazvy_formatu[r["format"]], *bunky]) + " |")
    adresy = ", ".join(f"{typ} `{cesta}`" for typ, cesta in ADRESY if cesta)
    return "\n".join(out) + f"\n\nAdresy: {adresy}.\n"


def vynechano(duvod: str) -> str:
    return f"{NADPIS}\n_Oddíl vynechán: {duvod}._\n"


def oddil_rychlost(klic: str | None = None, fetch: Fetch | None = None,
                   spanek: Callable[[float], None] = time.sleep) -> str:
    """Celý oddíl Rychlost; bez klíče nebo při odmítnutí poznámka místo tabulky. Nikdy nevyhodí výjimku z CrUX."""
    klic = (os.environ.get("CRUX_API_KEY", "") if klic is None else klic).strip()
    if not klic and fetch is None:
        return vynechano("chybí secret CRUX_API_KEY")
    try:
        radky = stahni(fetch or fetch_crux(klic), spanek)
    except (ChybaCrux, OSError, ValueError, HTTPException) as e:  # OSError: vypršení času; ValueError: nečitelná odpověď; HTTPException: poškozená odpověď
        print(f"CrUX odmítlo dotaz: {e}", file=sys.stderr)
        return vynechano(f"CrUX odmítlo dotaz ({e})")
    return oddil(radky)


def vloz_oddil(souhrn: str, oddil_text: str) -> str:
    """Vloží oddíl před první oddíl `## ` souhrnu, aby se vešel do zkrácené zprávy pro Telegram."""
    i = souhrn.find("\n## ")
    if i < 0:
        return souhrn.rstrip("\n") + "\n\n" + oddil_text
    return souhrn[: i + 1] + oddil_text + "\n" + souhrn[i + 1:]
