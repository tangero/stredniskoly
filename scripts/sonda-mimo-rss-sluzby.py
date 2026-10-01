"""Sonda: přečtou placené služby výpis aktualit tam, kde naše čtečka selhala?

Navazuje na `scripts/sonda-mimo-rss.py` (data/sondy/mimo-rss-20261001.json).
Bere školy, u kterých vlastní čtečka výpis nerozpoznala nebo stránku aktualit
nenašla, a k nim kontrolní vzorek škol, kde výpis přečetla (kvůli shodě).
Každou adresu pošle službě, z vráceného markdownu vytáhne řádky s odkazem
a datem stejnými pravidly jako vlastní čtečka a spočítá výsledek.

Klíče se čtou z prostředí; služba bez klíče se přeskočí:
    TINYFISH_API_KEY   TinyFish Fetch   POST https://api.fetch.tinyfish.ai
    EXA_API_KEY        Exa /contents    POST https://api.exa.ai/contents
    PARALLEL_API_KEY   Parallel Extract POST https://api.parallel.ai/v1/extract

Tvary požadavků jsou podle dokumentace k 1. 10. 2026 a **nebyly vyzkoušené**:
odpověď se proto čte obecně (nejdelší textové pole u záznamu s `url`) a celá
syrová odpověď prvního volání se uloží pro kontrolu.

TinyFish vyzkoušen 1. 10. 2026: markdown ani výchozí html neobsahují odkazy
na články, sonda z něj nepřečte nic. Funguje html s `include_selectors: ["body"]`
čtené vlastní čtečkou; to dělá `scripts/sonda-mimo-rss-tinyfish.py` a sklízeč
(`scripts/novinky_vypis.py`). Pro TinyFish tuhle sondu nepoužívej.

    .venv/bin/python scripts/sonda-mimo-rss-sluzby.py [--jen 50] [--kontrola 15] [--sluzby exa,parallel]
"""
import datetime as dt
import importlib.util
import json
import os
import random
import re
import sys
import time
from pathlib import Path

import requests

KOREN = Path(__file__).resolve().parent.parent
_spec = importlib.util.spec_from_file_location("sonda", KOREN / "scripts" / "sonda-mimo-rss.py")
sonda = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(sonda)

DNES = sonda.DNES
VSTUP = KOREN / "data/sondy/mimo-rss-20261001.json"
CIL = "Seznam aktualit a novinek školy: nadpis, odkaz a datum zveřejnění každého článku."
RE_MD_ODKAZ = re.compile(r"\[([^\]]{8,250})\]\((https?://[^)\s]+)\)")


def tinyfish(urls, klic):
    r = requests.post("https://api.fetch.tinyfish.ai", timeout=120,
                      headers={"X-API-Key": klic, "Content-Type": "application/json"},
                      json={"urls": urls, "format": "markdown", "links": True, "ttl": 0})
    return r.status_code, r.json() if r.headers.get("content-type", "").startswith("application/json") else r.text


def exa(urls, klic):
    r = requests.post("https://api.exa.ai/contents", timeout=120,
                      headers={"x-api-key": klic, "Content-Type": "application/json"},
                      json={"urls": urls, "text": True, "maxAgeHours": 0, "livecrawlTimeout": 15000})
    return r.status_code, r.json() if r.headers.get("content-type", "").startswith("application/json") else r.text


def parallel(urls, klic):
    r = requests.post("https://api.parallel.ai/v1/extract", timeout=180,
                      headers={"x-api-key": klic, "Content-Type": "application/json"},
                      json={"urls": urls, "objective": CIL,
                            "advanced_settings": {"full_content": True,
                                                  "fetch_policy": {"max_age_seconds": 600}}})
    return r.status_code, r.json() if r.headers.get("content-type", "").startswith("application/json") else r.text


SLUZBY = {  # jméno: (funkce, proměnná s klíčem, adres na jedno volání)
    "tinyfish": (tinyfish, "TINYFISH_API_KEY", 10),
    "exa": (exa, "EXA_API_KEY", 10),
    "parallel": (parallel, "PARALLEL_API_KEY", 20),
}


def texty_podle_url(odpoved):
    """Najde v odpovědi záznamy s `url` a vrátí url → nejdelší textové pole."""
    out = {}

    def projdi(x):
        if isinstance(x, dict):
            if isinstance(x.get("url"), str):
                kandidati = []
                for k, v in x.items():
                    if isinstance(v, str) and k != "url":
                        kandidati.append(v)
                    elif isinstance(v, list) and v and all(isinstance(i, str) for i in v):
                        kandidati.append("\n".join(v))
                if kandidati:
                    text = max(kandidati, key=len)
                    if len(text) > len(out.get(x["url"], "")):
                        out[x["url"]] = text
            for v in x.values():
                projdi(v)
        elif isinstance(x, list):
            for v in x:
                projdi(v)

    projdi(odpoved)
    return out


def polozky_z_markdownu(text):
    """Řádek (nebo dva sousední) s odkazem a datem = položka. Stejná data jako vlastní čtečka."""
    radky = text.splitlines()
    out = {}
    for i, radek in enumerate(radky):
        for m in RE_MD_ODKAZ.finditer(radek):
            # Datum napřed na témž řádku, teprve pak u sousedů (karta v markdownu
            # mívá datum na řádku nad nadpisem nebo pod ním).
            d = sonda.najdi_datum(radek) or sonda.najdi_datum(" ".join(radky[max(0, i - 1): i + 2]))
            titulek = re.sub(r"[*_#`]", "", m.group(1)).strip()
            if d and not sonda.RE_OBECNY_ODKAZ.match(titulek) and not titulek.lower().startswith("image"):
                out.setdefault(m.group(2), {"titulek": titulek[:200], "url": m.group(2), "datum": d.isoformat()})
    return sorted(out.values(), key=lambda x: x["datum"], reverse=True)


def main():
    args = sys.argv[1:]
    def volba(jmeno, vychozi):
        if jmeno in args:
            i = args.index(jmeno)
            hodnota = args[i + 1]
            del args[i:i + 2]
            return hodnota
        return vychozi
    jen = int(volba("--jen", "50"))
    kontrola = int(volba("--kontrola", "15"))
    vybrane = volba("--sluzby", ",".join(SLUZBY)).split(",")

    d = json.load(open(VSTUP))
    random.seed(20261001)
    neuspech = [v for v in d["skoly"] if v["vypis"]["stav"] in ("nerozpoznano", "bez_odkazu")]
    uspech = [v for v in d["skoly"] if v["vypis"]["polozek"] > 0]
    cile = random.sample(neuspech, min(jen, len(neuspech))) + random.sample(uspech, min(kontrola, len(uspech)))
    adresy = {v["redizo"]: (v["stranka_aktualit"] or v["web"]) for v in cile}

    vysledek = {"meta": {"kdy": dt.date.today().isoformat(), "popis": __doc__.strip().splitlines()[0],
                         "skript": "scripts/sonda-mimo-rss-sluzby.py", "vstup": str(VSTUP.relative_to(KOREN)),
                         "skol_neuspech": min(jen, len(neuspech)), "skol_kontrola": min(kontrola, len(uspech))},
                "sluzby": {}}
    for jmeno in vybrane:
        fce, promenna, davka = SLUZBY[jmeno]
        klic = os.environ.get(promenna)
        if not klic:
            print(f"{jmeno}: chybí {promenna}, přeskakuji")
            continue
        skoly, syrova, t0 = {}, None, time.time()
        seznam = list(adresy.items())
        for i in range(0, len(seznam), davka):
            dav = seznam[i:i + davka]
            try:
                kod, odpoved = fce([u for _, u in dav], klic)
            except Exception as e:  # noqa: BLE001
                kod, odpoved = type(e).__name__, None
            if syrova is None:
                syrova = {"http": kod, "odpoved": odpoved}
            texty = texty_podle_url(odpoved) if isinstance(odpoved, (dict, list)) else {}
            for redizo, u in dav:
                text = texty.get(u) or next((t for k, t in texty.items() if k.rstrip("/") == u.rstrip("/")), "")
                pol = polozky_z_markdownu(text) if text else []
                skoly[redizo] = {"url": u, "http": kod, "znaku": len(text), "polozek": len(pol),
                                 "polozek_30d": sum((DNES - dt.date.fromisoformat(p["datum"])).days <= 30 for p in pol),
                                 "ukazka": pol[:5]}
        neusp = [r for r in skoly if r in {v["redizo"] for v in neuspech}]
        souhrn = {
            "sekund": round(time.time() - t0, 1),
            "obsah_vracen": sum(s["znaku"] > 0 for s in skoly.values()),
            "neuspech_precteno": sum(skoly[r]["polozek"] > 0 for r in neusp),
            "neuspech_do_30d": sum(skoly[r]["polozek_30d"] > 0 for r in neusp),
            "kontrola_precteno": sum(s["polozek"] > 0 for r, s in skoly.items() if r not in neusp),
        }
        print(jmeno, json.dumps(souhrn, ensure_ascii=False))
        vysledek["sluzby"][jmeno] = {"souhrn": souhrn, "skoly": skoly, "prvni_odpoved": syrova}
    vystup = KOREN / f"data/sondy/mimo-rss-sluzby-{dt.date.today().strftime('%Y%m%d')}.json"
    json.dump(vysledek, open(vystup, "w"), ensure_ascii=False, indent=1)
    print(f"-> {vystup.relative_to(KOREN)}")


if __name__ == "__main__":
    main()
