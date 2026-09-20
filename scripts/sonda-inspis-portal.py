#!/usr/bin/env python3
"""Sonda: je profil školy na InspIS PORTÁLu použitelnou náhradou za mrtvou sadu 70?

Otevřená data ČŠI sadu 70 (profily škol) stáhla, obnova `data/inspis_school_profiles.json`
padá od 10. 8. 2026. Profil ale zůstal na `https://portal.csicr.cz/School/{REDIZO}`.
Sonda na vzorku škol ze snímku porovná, co portál nese, proti tomu, co máme:

1. **Čerstvost** – liší se hodnota na portálu od našeho snímku z 11. 2. 2026?
2. **Úplnost** – nese portál pole, která CSV export sady 70 ztratil?

    .venv/bin/python scripts/sonda-inspis-portal.py [VYSTUP]

Podklad pro `docs/prehodnoceni-rozhodnuti-rss-2027.md`, P1.
"""
from __future__ import annotations

import collections
import concurrent.futures
import html
import json
import random
import re
import sys
from pathlib import Path

import requests

requests.packages.urllib3.disable_warnings()  # type: ignore[attr-defined]

KOREN = Path(__file__).resolve().parent.parent
UA = "Mozilla/5.0 (kompatibilni; stredniskoly.cz sonda)"
TIMEOUT = 20
VLAKNA = 8
VZOREK = 60
SEED = 20260920

# Popisek na portálu → pole ve snímku. Trojice vlevo se porovnává na čerstvost,
# dvojice dole existuje na portálu, ale snímek je má prázdné u všech škol.
POROVNAVANA = {
    "Dny otevřených dveří (termín/y):": "dny_otevrenych_dveri",
    "Přijímací zkoušky:": "prijimaci_zkousky",
    "Termín přijímacích zkoušek:": "termin_prijimacich_zkousek",
}
ZTRACENA = {
    "Přístup k PC/internetu mimo výuku:": "pristup_k_pc",
    "Využití internetu ve výuce:": "vyuziti_internetu_ve_vyuce",
    "Přípravné kurzy:": "pripravne_kurzy",
    "Stipendium:": "stipendium",
    "Roční školné v Kč:": "rocni_skolne",
}
RE_ZAJIMAVE = re.compile(r"kurz|školn|stipend|certifik|dalšího vzděl|přijatých", re.I)


def nacti_profil(redizo: str) -> dict[str, str] | None:
    """Stáhne stránku profilu a vrátí dvojice popisek → hodnota."""
    try:
        r = requests.get(f"https://portal.csicr.cz/School/{redizo}", timeout=TIMEOUT,
                         headers={"User-Agent": UA}, verify=False)
        if r.status_code != 200:
            return None
    except requests.RequestException:
        return None
    text = html.unescape(re.sub(r"<script.*?</script>|<style.*?</style>", "", r.text, flags=re.S))
    radky = [l.strip() for l in re.sub(r"<[^>]+>", "\n", text).split("\n") if l.strip()]
    # Stránka je definiční seznam: popisek končí dvojtečkou, hodnota je další řádek.
    profil: dict[str, str] = {}
    for i, radek in enumerate(radky):
        if radek.endswith(":") and i + 1 < len(radky) and not radky[i + 1].endswith(":"):
            profil.setdefault(radek, radky[i + 1])
    return profil


def vyplneno(v: object) -> bool:
    """Nula a False jsou vyplněné hodnoty, ne prázdné – `v or ""` tu lže."""
    return v is not None and str(v).strip() != ""


def shodne(a: str | None, b: str | None) -> bool:
    """Srovnání odolné vůči nbsp a zdvojeným mezerám – ty rozdíl netvoří."""
    norm = lambda s: " ".join(str(s or "").replace("\xa0", " ").split())
    return norm(a) == norm(b)


def main() -> None:
    snimek = json.loads((KOREN / "data" / "inspis_school_profiles.json").read_text())["schools"]
    random.seed(SEED)
    vzorek = random.sample(sorted(snimek), VZOREK)
    print(f"Stahuji {VZOREK} profilů z portálu ČŠI…", flush=True)
    with concurrent.futures.ThreadPoolExecutor(max_workers=VLAKNA) as pool:
        profily = dict(zip(vzorek, pool.map(nacti_profil, vzorek)))
    ok = {r: p for r, p in profily.items() if p}
    print(f"staženo {len(ok)}/{VZOREK}")

    cerstvost = {}
    for popisek, klic in POROVNAVANA.items():
        shod = [r for r, p in ok.items() if shodne(p.get(popisek), snimek[r].get(klic))]
        cerstvost[klic] = {"shodne": len(shod), "lisi_se": len(ok) - len(shod)}
        print(f"{klic}: shodné s naším snímkem {len(shod)}/{len(ok)}")

    uplnost = {}
    for popisek, klic in ZTRACENA.items():
        na_portalu = sum(1 for p in ok.values() if vyplneno(p.get(popisek)))
        ve_snimku = sum(1 for r in ok if vyplneno(snimek[r].get(klic)))
        uplnost[klic] = {"na_portalu": na_portalu, "ve_snimku": ve_snimku}
        print(f"{klic}: na portálu {na_portalu}/{len(ok)}, ve snímku {ve_snimku}/{len(ok)}")

    roky: collections.Counter[str] = collections.Counter()
    for p in ok.values():
        d = (p.get("Dny otevřených dveří (termín/y):") or "").strip()
        nalezene = re.findall(r"20\d{2}", d)
        roky[max(nalezene) if nalezene else ("(prázdné)" if not d else "(bez roku)")] += 1
    print("letopočet DOD na portálu:", dict(sorted(roky.items())))

    popisky = collections.Counter(p for prof in ok.values() for p in prof)
    navic = {p: n for p, n in popisky.items() if RE_ZAJIMAVE.search(p)}

    vystup = Path(sys.argv[1]) if len(sys.argv) > 1 else KOREN / "data" / "sondy" / "inspis-portal-20260920.json"
    vystup.parent.mkdir(parents=True, exist_ok=True)
    vystup.write_text(json.dumps({
        "meta": {"kdy": "2026-09-20", "popis": __doc__.strip().splitlines()[0],
                 "vzorek": f"{VZOREK} škol ze snímku, seed {SEED}",
                 "skript": "scripts/sonda-inspis-portal.py"},
        "souhrn": {"stazeno": len(ok), "vzorek": VZOREK, "cerstvost": cerstvost,
                   "uplnost": uplnost, "letopocet_dod": dict(sorted(roky.items())),
                   "popisky_navic": dict(sorted(navic.items(), key=lambda kv: -kv[1]))},
        "profily": ok,
    }, ensure_ascii=False, indent=1))
    print(f"-> {vystup}")


if __name__ == "__main__":
    sys.exit(main())
