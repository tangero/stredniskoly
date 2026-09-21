#!/usr/bin/env python3
"""Měření: kolik termínů akcí se dá z feedu získat, než se sáhne na cizí stránky.

Otázka, na kterou to odpovídá, je zadaná (21. 9. 2026): **vyplatí se stahovat
články ze školních webů?** Stahování cizího textu je samostatné rozhodnutí, tak
se nejdřív změří, kolik termínů leží už v tom, co máme – v titulku a perexu.

Reprodukce (offline, bez sítě, z uložených odpovědí modelu)::

    python3 scripts/rss-terminy-mereni.py --offline

Vstupy: zmrazený vzorek 80 feedů (``data/sondy/rss-klasifikace-vzorek80.json``)
a mezipaměť odpovědí modelu (``data/sondy/jev-novinky-cache.json``). Online režim
se doptává modelu a mezipaměť doplňuje; ``--offline`` na síť nesahá vůbec.

Výstup: kolik položek je pozvánkou na akci školy, u kolika z nich vznikne věta
s termínem, a u kolika termín v textu **není** – to je přesně ta množina, kvůli
které by se stahovaly články.
"""
from __future__ import annotations

import argparse
import concurrent.futures
import importlib.util
import json
import random
import re
import sys
from collections import Counter
from datetime import datetime, timedelta, timezone
from pathlib import Path

KOREN = Path(__file__).resolve().parent.parent
SONDY = KOREN / "data" / "sondy"
sys.path.insert(0, str(KOREN / "scripts"))

import novinky_jev as jev  # noqa: E402
from novinky_klasifikace import (  # noqa: E402
    oklasifikuj_polozky, pozice_dat, text_k_rozboru,
)

from novinky_klasifikace import parse_datum, parse_feed  # noqa: E402

# Zmrazený vzorek se posuzuje ke dni, kdy vznikl, aby `--offline` dávalo stejný
# výsledek i zítra. Živý vzorek se posuzuje k dnešku – jinak by se termíny
# poměřovaly proti datu v minulosti.
DEN_VZORKU = datetime(2026, 9, 19, tzinfo=timezone.utc)
OKNO_DNU = 180
FEEDY = KOREN / "public" / "skoly_feedy.json"


def nacti_vzorek() -> list[dict]:
    zaznamy = json.loads((SONDY / "rss-klasifikace-vzorek80.json").read_text())
    doplneni = SONDY / "rss-klasifikace-vzorek80-doplneni.json"
    if doplneni.exists():
        nahradit = {d["redizo"]: d for d in json.loads(doplneni.read_text())}
        zaznamy = [nahradit.get(z["redizo"], z) for z in zaznamy]
    return zaznamy


def _stahni():
    spec = importlib.util.spec_from_file_location(
        "sonda", KOREN / "scripts" / "sonda-rss-webu-skol.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.stahni


def stahni_siroky(kolik: int, seed: int = 20260921) -> list[dict]:
    """Živý vzorek feedů z registru. Losuje se ze seřazeného seznamu se seedem,
    aby šel výběr zopakovat; obsah feedů ovšem žije, takže čísla se mezi běhy
    liší. Zmrazený vzorek 80 zůstává tím, co se reprodukuje offline."""
    stahni = _stahni()
    registr = json.loads(FEEDY.read_text())["skoly"]
    vybrane = sorted(registr.items())
    random.Random(seed).shuffle(vybrane)
    vybrane = vybrane[:kolik]

    def zpracuj(dvojice):
        redizo, info = dvojice
        odpoved = stahni(info["feed_url"])
        if odpoved is None:
            return {"redizo": redizo, "chyba": "nedostupné"}
        polozky = parse_feed(odpoved[1])
        if polozky is None:
            return {"redizo": redizo, "chyba": "neparsovatelné"}
        for p in polozky:
            p["datum"] = parse_datum(p.get("datum_raw", ""))
        return {"redizo": redizo, "url": info["feed_url"], "polozky": polozky}

    with concurrent.futures.ThreadPoolExecutor(12) as ex:
        return list(ex.map(zpracuj, vybrane))


def pozvanky(zaznamy: list[dict], od: datetime) -> list[dict]:
    """Položky, které dnes skončí kartou pozvánky na akci školy.

    Právě u nich má věta s termínem smysl: u kritérií přijetí ani u výsledků se
    žádná akce nekoná, takže není co datovat."""
    vybrane = []
    for z in zaznamy:
        for p in z.get("polozky") or []:
            pub = p.get("datum")
            if pub is not None and pub < od:
                continue
            if jev.je_kandidat_na_rozbor(p, p.get("publikace") or {}):
                vybrane.append({**p, "redizo": z["redizo"]})
    return vybrane


def zmer(offline: bool, siroky: int = 0, stahovat: bool = False,
         diagnostika: bool = False) -> None:
    zaznamy = stahni_siroky(siroky) if siroky else nacti_vzorek()
    dnes = datetime.now(timezone.utc) if siroky else DEN_VZORKU
    od = dnes - timedelta(days=OKNO_DNU)
    for z in zaznamy:
        if z.get("polozky"):
            oklasifikuj_polozky(z["polozky"])
    kandidati = pozvanky(zaznamy, od)
    mezipamet = jev.nacti_mezipamet()
    pocet_pred = len(mezipamet)

    stavy: Counter[str] = Counter()
    cena = 0.0
    ukazky, bez_data, neshody = [], [], []
    for p in kandidati:
        text = text_k_rozboru(p)
        ma_datum_v_textu = bool(pozice_dat(text))
        rozbor = jev.rozbor_polozky(p, mezipamet=mezipamet, offline=offline,
                                    stahovat=stahovat)
        if rozbor is None:
            stavy["model neodpověděl"] += 1
            continue
        cena += rozbor.get("cena") or 0.0
        if rozbor["pro_uchazece"] is False:
            stavy["model: není pro uchazeče o tuhle školu"] += 1
            continue
        # Výběr akce i složení věty dělá `souhrn_z_rozboru` – týž kód, jaký
        # použije sklízeč. Kdyby to měření počítalo po svém, měřilo by něco
        # jiného, než co se pak zobrazí.
        souhrn = jev.souhrn_z_rozboru(p, rozbor, dnes.date())
        if souhrn is None:
            stavy["termín v textu není" if not ma_datum_v_textu
                  else "datum v textu je, ale budoucí akcí není"] += 1
            (bez_data if not ma_datum_v_textu else neshody).append(p)
            continue
        veta = souhrn["souhrn"]
        stavy["věta s termínem" if rozbor["zdroj_textu"] == "perex"
              else "věta s termínem až ze staženého článku"] += 1
        if len(ukazky) < 12:
            ukazky.append((p["redizo"], p.get("titulek", ""), veta,
                           rozbor["lhuty"], p.get("odkaz", "")))

    if not offline:
        jev.uloz_mezipamet(mezipamet)

    ok = sum(1 for z in zaznamy if z.get("polozky"))
    print(f"Vzorek: {len(zaznamy)} feedů, z toho {ok} čitelných; "
          f"okno {od.date()}–{dnes.date()}")
    print(f"Pozvánek na akci školy (dnes karta): {len(kandidati)}\n")
    for stav, kolik in stavy.most_common():
        podil = 100 * kolik / len(kandidati) if kandidati else 0
        print(f"  {stav:42s} {kolik:4d}  {podil:5.1f} %")
    print(f"\nNových volání modelu: {len(mezipamet) - pocet_pred}, cena ${cena:.4f}")
    if kandidati:
        z_perexu = stavy["věta s termínem"]
        z_clanku = stavy["věta s termínem až ze staženého článku"]
        zisk = z_perexu + z_clanku
        print(f"\nTermín máme u {zisk} z {len(kandidati)} pozvánek "
              f"({100 * zisk / len(kandidati):.0f} %)"
              + (f", z toho {z_clanku} až ze staženého článku." if z_clanku else "."))
        if not stahovat:
            strop = zisk + stavy["termín v textu není"]
            print(f"Stažení článku může pomoct nejvýš u {stavy['termín v textu není']} "
                  f"položek, kde v titulku ani perexu žádné datum není "
                  f"(strop by byl {100 * strop / len(kandidati):.0f} %).")
    if ukazky:
        print("\nUkázky vět, jak je uvidí čtenář:")
        for redizo, titulek, veta, lhuty, odkaz in ukazky:
            print(f"\n  {redizo}  {titulek[:70]}")
            print(f"    → {veta}")
            if lhuty:
                print(f"    (lhůty odfiltrované z věty: {', '.join(lhuty)})")
            print(f"    {odkaz}")
    if bez_data:
        print(f"\nPozvánky bez data v textu ({len(bez_data)}) – kandidáti na stažení článku:")
        for p in bez_data:
            print(f"  {p['redizo']}  {p.get('titulek', '')[:70]}")
            print(f"    {p.get('odkaz', '')}")
            if diagnostika:
                print(f"    {_proc_chybi(p.get('odkaz', ''))}")


# Vzory data v syrovém HTML. Slouží jen diagnostice: odlišit „na stránce datum
# není" od „datum tam je, ale náš převod HTML na text ho zahodil". První je fakt
# o školním webu, druhé je naše chyba a spraví se kódem.
RE_DATUM_V_HTML = re.compile(
    r"\d{1,2}\.\s*\d{1,2}\.\s*20\d{2}|\d{1,2}\.\s*(?:ledna|února|března|dubna|května|"
    r"června|července|srpna|září|října|listopadu|prosince)")


def _proc_chybi(url: str) -> str:
    """Proč u té položky termín nemáme: stránka ho nemá, nebo jsme ho ztratili?"""
    import urllib.request

    from novinky_clanek import UA, na_text
    if not url:
        return "(bez odkazu)"
    try:
        zadost = urllib.request.Request(url, headers={"User-Agent": UA,
                                                      "Accept": "text/html"})
        with urllib.request.urlopen(zadost, timeout=20) as odpoved:
            syrove = odpoved.read(1_000_000).decode("utf-8", "replace")
    except Exception as e:  # noqa: BLE001 – diagnostika nesmí shodit měření
        return f"stránka nestažena ({type(e).__name__})"
    v_html = RE_DATUM_V_HTML.findall(syrove)
    v_textu = pozice_dat(na_text(syrove))
    if v_textu:
        return f"na stránce datum JE a čteme ho: {[i for i, _ in v_textu][:4]}"
    if v_html:
        return f"datum je v HTML, ale z textu vypadlo: {v_html[:4]}"
    return "na stránce datum není vůbec"


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    p.add_argument("--offline", action="store_true",
                   help="bez sítě: jen z uložených odpovědí modelu")
    p.add_argument("--siroky", type=int, default=0, metavar="N",
                   help="místo zmrazeného vzorku stáhne N feedů z registru")
    p.add_argument("--stahovat", action="store_true",
                   help="u pozvánky bez data v textu sáhne i na stránku článku")
    p.add_argument("--diagnostika", action="store_true",
                   help="u pozvánek bez termínu zjistí, jestli datum na stránce je")
    a = p.parse_args()
    zmer(a.offline, a.siroky, a.stahovat, a.diagnostika)


if __name__ == "__main__":
    main()
