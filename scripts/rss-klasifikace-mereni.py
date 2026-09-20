#!/usr/bin/env python3
"""Měření: jak spolehlivě jdou ze školních RSS feedů vytipovat přijímací novinky.

Reprodukce (offline, bez sítě, jedním příkazem)::

    .venv/bin/python scripts/rss-klasifikace-mereni.py --offline

Vstupy (vše v repozitáři):

* ``data/sondy/rss-klasifikace-manifest80.json`` – zmrazený výběr vzorku 80 feedů;
* ``data/sondy/rss-klasifikace-vzorek80.json`` – stažené položky 75 feedů z 19. 9. 2026;
* ``data/sondy/rss-klasifikace-vzorek80-doplneni.json`` – 5 feedů, které ten den
  měly formální vady XML, stažené tolerantním parserem (viz ``--refresh-doplneni``);
* ``data/sondy/rss-klasifikace-reference.json`` – ruční referenční štítky zásahů
  (správný/falešný + důvod), rekonstruované z dokumentované inspekce z 19. 9. 2026.

Výstup: počty položek, zásahy podle tříd a jistoty, přesnost proti referenci a
**publikační rozhodnutí** (co uvidí čtenář: karta s termínem / karta / neutrální odkaz).
Úplnost (kolik relevantních zpráv pravidla přehlédla) se zde neměří – k tomu je
potřeba ručně označit všechny položky vzorku, ne jen zásahy.

Online režim (výchozí) stáhne feedy z manifestu znovu a zapíše čerstvý vzorek;
klasifikace i počty se pak mohou lišit od uloženého vzorku (obsah feedů žije).

Regresní syntetické případy z oponentury řeší ``tests/test_rss_klasifikace.py``.
"""
from __future__ import annotations

import argparse
import concurrent.futures
import importlib.util
import json
import random
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
KOREN = Path(__file__).resolve().parent.parent
SONDY = KOREN / "data" / "sondy"
MANIFEST = SONDY / "rss-klasifikace-manifest80.json"
VZOREK = SONDY / "rss-klasifikace-vzorek80.json"
DOPLNENI = SONDY / "rss-klasifikace-vzorek80-doplneni.json"
REFERENCE = SONDY / "rss-klasifikace-reference.json"
_spec = importlib.util.spec_from_file_location("sonda", KOREN / "scripts" / "sonda-rss-webu-skol.py")
_mod = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_mod)
stahni = _mod.stahni
DNES = datetime(2026, 9, 19, tzinfo=timezone.utc)  # den původního měření
OKNO_DNU = 180
OD = DNES - timedelta(days=OKNO_DNU)

sys.path.insert(0, str(Path(__file__).resolve().parent))
from novinky_klasifikace import (  # noqa: E402  (až po sys.path)
    VERZE_PRAVIDEL, PRAVIDLA_TEMA, TRIDY_S_POZVANKOU, TRIDY_POVOLENE_EMAILEM,
    STAVY_BLOKUJICI_TERMIN, strip, rozdel_klauzule, urci_stav, klasifikuj_temu,
    rozhodni_jistotu, extrahuj_data_akce, parse_feed, parse_datum,
    rozhodni_publikaci, oklasifikuj_polozky,
)

def vyber_manifest(data_sondy: dict) -> list[list[str]]:
    """Deterministický výběr 80 kandidátů: seřazení před losováním, seed 20260919."""
    kandidati = []
    for s in data_sondy["skoly"]:
        url = next((f["url"] for f in s.get("feedy", []) if f.get("stav") == "platny"), None)
        if not url and s.get("fallback"):
            url = s["fallback"]
        if url and "comment" not in url.lower():
            kandidati.append([s["redizo"], s.get("web", ""), url])
    kandidati.sort()
    random.seed(20260919)
    return random.sample(kandidati, 80)


def nacti_vzorek() -> list[dict]:
    zaznamy = json.loads(VZOREK.read_text())
    if DOPLNENI.exists():
        nahradit = {d["redizo"]: d for d in json.loads(DOPLNENI.read_text())}
        zaznamy = [nahradit.get(z["redizo"], z) for z in zaznamy]
    return zaznamy


def nacti_reference() -> list[dict]:
    return json.loads(REFERENCE.read_text())["reference"]


def ohodnot(zaznamy: list[dict]) -> None:
    """Přepočet + přesnost proti ruční referenci (jedna tabulka = jeden příkaz)."""
    ok = [z for z in zaznamy if z.get("polozky")]
    prazdne = [z for z in zaznamy if "polozky" in z and not z["polozky"]]
    chyby = [z for z in zaznamy if z.get("chyba") and "polozky" not in z]
    vsechny = [p for z in ok for p in z["polozky"]]
    v_okne = [p for p in vsechny if p.get("datum") and p["datum"] >= OD]
    hity = [(z["redizo"], p) for z in ok for p in z["polozky"]
            if p.get("tridy") and p.get("datum") and p["datum"] >= OD]
    skoly_s_hitem = {r for r, _ in hity}
    print("=== ZÁKLAD ===")
    print(f"verze pravidel: {VERZE_PRAVIDEL}")
    print(f"feedů rozparsováno: {len(ok) + len(prazdne)}/{len(zaznamy)}"
          f" (z toho {len(prazdne)} prázdných), chyby: {[c['chyba'] for c in chyby]}")
    print(f"položek celkem: {len(vsechny)}, v okně {OKNO_DNU} dní: {len(v_okne)}")
    print(f"přijímacích zásahů v okně: {len(hity)} u {len(skoly_s_hitem)} škol z {len(ok)}")

    ref = nacti_reference()

    # Identita položky = REDIZO + odkaz + třída. Titulek identitou není ani po přidání
    # třídy: dva různé články téže školy se mohou jmenovat stejně (F4 čtvrté oponentury).
    klice: dict[tuple[str, str, str], dict] = {}
    for r in ref:
        k = (r.get("redizo", ""), r.get("odkaz", ""), r.get("trida", ""))
        if not k[1]:
            print(f"CHYBA: referenční záznam bez odkazu: {k[0]} {r.get('titulek', '')[:60]}")
            sys.exit(1)
        if k in klice:
            print(f"CHYBA: duplicitní referenční klíč {k}")
            sys.exit(1)
        klice[k] = r

    def najdi_stitek(redizo: str, odkaz: str, trida: str) -> dict | None:
        return klice.get((redizo, odkaz, trida))

    from collections import Counter
    rozpad: dict[str, Counter] = {}
    neoznaceno = []
    for redizo, p in hity:
        for t in p["tridy"]:
            stitek = najdi_stitek(redizo, p.get("odkaz", ""), t)
            if stitek is None:
                neoznaceno.append((redizo, p.get("titulek", "")[:70], t))
            c = rozpad.setdefault(t, Counter())
            c["celkem"] += 1
            if stitek is not None:
                c["spravne" if stitek["spravne_tema"] else "falesne"] += 1
            j = p["jistota"].get(t)
            if j:
                c[f"jistota_{j}"] += 1
                if j == "vysoka" and stitek is not None:
                    c["vysoka_spravne" if stitek["spravne_vysoka"] else "vysoka_falesne"] += 1
    print("\n=== PŘESNOST PROTI RUČNÍ REFERENCI ===")
    for t, c in sorted(rozpad.items()):
        oznaceno = c["spravne"] + c["falesne"]
        presnost = f"{100 * c['spravne'] / oznaceno:.0f} %" if oznaceno else "?"
        v = c["jistota_vysoka"]
        v_ozn = c["vysoka_spravne"] + c["vysoka_falesne"]
        v_presnost = f"{100 * c['vysoka_spravne'] / v_ozn:.0f} %" if v_ozn else "?"
        print(f"{t:20s} zásahů {c['celkem']:3d} | téma: {c['spravne']}/{oznaceno} = {presnost}"
              f" | vysoká jistota: {v}×, z označených {c['vysoka_spravne']}/{v_ozn} = {v_presnost}")
    celkem_ozn = sum(c["spravne"] + c["falesne"] for c in rozpad.values())
    celkem_spr = sum(c["spravne"] for c in rozpad.values())
    print(f"CELKEM téma: {celkem_spr}/{celkem_ozn} = {100 * celkem_spr / celkem_ozn:.0f} %"
          f" (jmenovatel = páry třída×zásah s referencí)")
    # vysoká jistota ve dvou jednotkách: páry třída×položka i různé položky
    vysoka_pary = [(r, p, t) for r, p in hity for t in p["tridy"] if p["jistota"].get(t) == "vysoka"]
    vysoka_polozky = {(r, p.get("odkaz", p.get("titulek", ""))) for r, p, _ in vysoka_pary}
    vysoka_spravne = sum(1 for r, p, t in vysoka_pary
                         if (s := najdi_stitek(r, p.get("odkaz", ""), t)) and s["spravne_vysoka"])
    print(f"vysoká jistota: {len(vysoka_pary)} párů třída×položka = {len(vysoka_polozky)} různých položek,"
          f" správně {vysoka_spravne}/{len(vysoka_pary)} párů")
    if neoznaceno:
        print(f"\nCHYBA: {len(neoznaceno)} zásahů bez reference – reference se musí doplnit:")
        for r, t, tr in neoznaceno:
            print(f"  {r} {t} [{tr}]")
        sys.exit(1)
    # --- Publikační rozhodnutí: co uvidí čtenář, ne jen mezikrok klasifikace (F5) ---
    print("\n=== PUBLIKAČNÍ ROZHODNUTÍ (co uvidí čtenář) ===")
    zobrazeni = Counter(p["publikace"]["zobrazeni"] for _, p in hity)
    print(f"karta s termínem: {zobrazeni['karta_terminu']}, karta bez termínu: {zobrazeni['karta']},"
          f" neutrální odkaz: {zobrazeni['odkaz']}")
    duvody = Counter(p["publikace"]["duvod"] for _, p in hity
                     if p["publikace"]["zobrazeni"] == "odkaz")
    for d, n in duvody.most_common():
        print(f"  odkaz místo karty – {d}: {n}×")
    # Ruční reference konečného zobrazení existuje jen u tříd s pozvánkou (dod,
    # talentové zkoušky, náhradní termín); jinde se karta nese jen vysokou jistotou.
    ozn = [(r, p, t) for r, p in hity for t in p["tridy"] if t in TRIDY_S_POZVANKOU
           and (st := najdi_stitek(r, p.get("odkaz", ""), t)) and "spravne_zobrazeni" in st]
    spravne_zobr = spravne_term = spravne_stav = 0
    for r, p, t in ozn:
        st = najdi_stitek(r, p.get("odkaz", ""), t)
        pub = p["publikace"]
        spravne_zobr += pub["zobrazeni"] == st["spravne_zobrazeni"]
        spravne_term += sorted(pub["terminy"]) == sorted(st.get("spravne_terminy", []))
        spravne_stav += p["stav"] == st.get("spravny_stav")
    if ozn:
        print(f"třídy s pozvánkou proti ruční referenci ({len(ozn)} párů):"
              f" zobrazení {spravne_zobr}/{len(ozn)},"
              f" termíny {spravne_term}/{len(ozn)}, stav sdělení {spravne_stav}/{len(ozn)}")
    print("NEMĚŘENO: u tříd bez pozvánky nemá konečné zobrazení vlastní ruční referenci –"
          " shoduje se s hodnocením vysoké jistoty; úplnost se neměří vůbec.")

    dod = [p for _, p in hity if "dod" in p["tridy"]]
    s_datem = sum(1 for p in dod if p.get("data_akce", {}).get("s_rokem"))
    print(f"\nDOD: {len(dod)} zásahů, z toho s termínem v roli akce a s rokem: {s_datem}")
    mesice = Counter(p["datum"].strftime("%Y-%m") for _, p in hity)
    print(f"zásahy podle měsíce publikace: {dict(sorted(mesice.items()))}")


def stahni_vzorek(manifest: list[list[str]], doplneni: bool = False) -> list[dict]:
    # requests se importuje až tady: offline příkaz i testy běží bez této knihovny
    # (F4 čtvrté oponentury – dřív import zůstal v bloku __main__ a offline běh padal).
    import requests

    requests.packages.urllib3.disable_warnings()

    def zpracuj(k):
        redizo, web, url = k
        v = stahni(url, limit=1_000_000)
        if v is None:
            return {"redizo": redizo, "url": url, "chyba": "stahnuti"}
        status, text, _finalni = v
        if status != 200:
            return {"redizo": redizo, "url": url, "chyba": f"http_{status}"}
        items = parse_feed(text)
        if items is None:
            return {"redizo": redizo, "url": url, "chyba": "parse"}
        return {"redizo": redizo, "url": url, "polozky": items}

    vysledky = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as pool:
        for i, r in enumerate(pool.map(zpracuj, manifest), 1):
            if doplneni and "polozky" not in r:
                continue  # doplňujeme jen dříve neparsovatelné
            vysledky.append(r)
            if i % 20 == 0:
                print(f"  {i}/{len(manifest)}", flush=True)
    return vysledky


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    p.add_argument("--offline", action="store_true",
                   help="bez sítě: klasifikace nad uloženým vzorkem + tabulka přesnosti")
    p.add_argument("--refresh-doplneni", action="store_true",
                   help="znovu stáhne 5 feedů s dřívější vadou XML a zapíše DOPLNENI")
    a = p.parse_args()

    if a.refresh_doplneni:
        manifest = json.loads(MANIFEST.read_text())["manifest"] if MANIFEST.exists() else None
        if manifest is None:
            data_sondy = json.loads((SONDY / "rss-webu-skol-20260919.json").read_text())
            manifest = vyber_manifest(data_sondy)
        chybi = {z["redizo"] for z in json.loads(VZOREK.read_text()) if z.get("chyba")}
        kandidati = [k for k in manifest if k[0] in chybi]
        print(f"Doplňuji {len(kandidati)} dříve neparsovatelné feedy…", flush=True)
        dop = stahni_vzorek(kandidati, doplneni=True)
        ser = lambda o: o.isoformat() if isinstance(o, datetime) else None
        DOPLNENI.write_text(json.dumps(dop, ensure_ascii=False, indent=1, default=ser))
        print(f"-> {DOPLNENI} ({sum(1 for d in dop if d.get('polozky'))} OK)")
        return

    if a.offline:
        zaznamy = nacti_vzorek()
        for z in zaznamy:
            if z.get("polozky"):
                oklasifikuj_polozky(z["polozky"])
        ohodnot(zaznamy)
        return

    # online: čerstvé stažení celého manifestu
    data_sondy = json.loads((SONDY / "rss-webu-skol-20260919.json").read_text())
    manifest = vyber_manifest(data_sondy)
    print(f"Kandidátů: viz sonda; vzorek: {len(manifest)}", flush=True)
    zaznamy = stahni_vzorek(manifest)
    for z in zaznamy:
        if z.get("polozky"):
            oklasifikuj_polozky(z["polozky"])
    ser = lambda o: o.isoformat() if isinstance(o, datetime) else None
    out = SONDY / "rss-klasifikace-vzorek80-cerstvy.json"
    out.write_text(json.dumps(zaznamy, ensure_ascii=False, indent=1, default=ser))
    print(f"-> {out}")
    ohodnot(zaznamy)


if __name__ == "__main__":
    main()
