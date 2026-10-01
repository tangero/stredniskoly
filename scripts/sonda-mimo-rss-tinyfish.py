"""Sonda: přečte TinyFish výpis aktualit tam, kde přímé stažení nebo čtení selhalo?

Navazuje na `scripts/sonda-mimo-rss.py` (data/sondy/mimo-rss-20261001.json) a sondu
feedů z 19. 9. 2026. Bere školy bez kanálu novinek ve dvou skupinách:

* `nedostupne` – titulka přímo neodpověděla 200 (WEDOS.protection vrací 401,
  časté timeouty);
* `necteno` – titulka odpověděla, ale výpis aktualit jsme nenašli nebo nepřečetli.

Každou titulku stáhne přes TinyFish Fetch (`novinky_vypis.stahni_tinyfish`),
najde na ní stránku aktualit, stáhne i tu a přečte ji **stejnou čtečkou jako
sklízeč** (`novinky_vypis.precti_vypis`). Výstup slouží jako vstup registru
`public/skoly_vypisy.json` (`scripts/build-skoly-vypisy.py`).

Klíč `TINYFISH_API_KEY` z prostředí. Fetch je zdarma, limit 150 adres za minutu.

    .venv/bin/python scripts/sonda-mimo-rss-tinyfish.py [--jen N] [VYSTUP]
"""
import concurrent.futures
import datetime as dt
import json
import sys
from collections import Counter
from pathlib import Path

KOREN = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(KOREN / "scripts"))
import novinky_vypis as nv  # noqa: E402

DNES = dt.date(2026, 10, 1)
SOUBEZNE = 6  # 6 souběžných × ~10 s na stránku drží běh pod limitem 150 adres/min


def sonduj(z, klic):
    out = {"redizo": z["redizo"], "skupina": z["skupina"], "web": z["web"], "titulka": None,
           "stranka_aktualit": None, "stav": None, "polozek": 0, "polozek_30d": 0, "nejnovejsi": None, "ukazka": []}
    ti = nv.stahni_tinyfish(z["web"], klic)
    if "chyba" in ti:
        out["titulka"], out["stav"] = ti["chyba"], "titulka_nedostupna"
        return out
    out["titulka"] = "ok"
    polozky, stav = [], "bez_odkazu"
    sa = nv.najdi_stranku_aktualit(ti["text"], ti["url"])
    if sa:
        out["stranka_aktualit"] = sa
        r = nv.stahni_tinyfish(sa, klic)
        if "chyba" in r:
            stav = "stranka_nedostupna"
        else:
            polozky = nv.precti_vypis(r["text"], r["url"], DNES)
            stav = "precteno" if polozky else "nerozpoznano"
    if not polozky:
        z_titulky = nv.precti_vypis(ti["text"], ti["url"], DNES)
        if z_titulky:
            polozky, stav = z_titulky, "z_titulky"
            out["stranka_aktualit"] = ti["url"]
    out["stav"], out["polozek"] = stav, len(polozky)
    if polozky:
        out["nejnovejsi"] = polozky[0]["datum"]
        out["polozek_30d"] = sum((DNES - dt.date.fromisoformat(p["datum"])).days <= 30 for p in polozky)
        out["ukazka"] = polozky[:5]
    return out


def main():
    args = sys.argv[1:]
    jen = None
    if "--jen" in args:
        i = args.index("--jen")
        jen = int(args[i + 1])
        del args[i:i + 2]
    vystup = KOREN / (args[0] if args else "data/sondy/mimo-rss-tinyfish-20261001.json")
    klic = nv.tinyfish_klic()
    if not klic:
        sys.exit("Chybí TINYFISH_API_KEY.")

    feedy = json.load(open(KOREN / "public/skoly_feedy.json"))["skoly"]
    sonda19 = json.load(open(KOREN / "data/sondy/rss-webu-skol-20260919.json"))["skoly"]
    sonda01 = {v["redizo"]: v for v in json.load(open(KOREN / "data/sondy/mimo-rss-20261001.json"))["skoly"]}
    cile = []
    for z in sonda19:
        if z["redizo"] in feedy or not z.get("web"):
            continue
        web = z.get("finalni_url") or z["web"]
        if z.get("titulka") != 200:
            cile.append({"redizo": z["redizo"], "web": web, "skupina": "nedostupne"})
        elif sonda01.get(z["redizo"], {}).get("vypis", {}).get("stav") in ("nerozpoznano", "bez_odkazu"):
            cile.append({"redizo": z["redizo"], "web": web, "skupina": "necteno"})
    if jen:
        cile = cile[:jen]
    print(f"škol: {len(cile)} ({Counter(c['skupina'] for c in cile)})", flush=True)
    with concurrent.futures.ThreadPoolExecutor(max_workers=SOUBEZNE) as pool:
        vysl = list(pool.map(lambda z: sonduj(z, klic), cile))

    souhrn = {}
    for sk in ("nedostupne", "necteno"):
        v = [x for x in vysl if x["skupina"] == sk]
        souhrn[sk] = {
            "skol": len(v),
            "titulka_ok": sum(x["titulka"] == "ok" for x in v),
            "stranka_aktualit": sum(bool(x["stranka_aktualit"]) for x in v),
            "precteno": sum(x["polozek"] > 0 for x in v),
            "do_30d": sum(x["polozek_30d"] > 0 for x in v),
            "stavy": dict(Counter(x["stav"] for x in v)),
        }
    print(json.dumps(souhrn, ensure_ascii=False, indent=1))
    json.dump({"meta": {"kdy": DNES.isoformat(), "popis": __doc__.strip().splitlines()[0],
                        "skript": "scripts/sonda-mimo-rss-tinyfish.py", "souhrn": souhrn},
               "skoly": vysl}, open(vystup, "w"), ensure_ascii=False, indent=1)
    print(f"-> {vystup.relative_to(KOREN)}")


if __name__ == "__main__":
    main()
