"""Sonda: mají školy bez RSS jinou strojově čitelnou cestu k novinkám?

Vzorek škol, které mají živou titulní stránku a žádný platný feed. Zkouší
/sitemap.xml (existence a zmínka o aktualitách) a odkaz na stránku novinek
v HTML titulky. Podklad pro rozhodnutí, jestli rozšíření mimo RSS může počkat
až za pilot (docs/prehodnoceni-rozhodnuti-rss-2027.md, P2).

    .venv/bin/python scripts/sonda-cest-k-novinkam.py [VYSTUP]
"""
import json, random, re, sys, concurrent.futures
from urllib.parse import urljoin, urlparse
import requests
requests.packages.urllib3.disable_warnings()

UA = "stredniskoly.cz sonda; pruzkum cest k novinkam skolnich webu"
T = 8
RE_NOVINKY = re.compile(r"aktualit|novink|udalost|kalendar|ze-zivota|nastenk", re.I)
VZOREK = 80
SEED = 20260920

def stahni(u, limit=400_000):
    try:
        r = requests.get(u, timeout=T, allow_redirects=True, verify=False,
                         headers={"User-Agent": UA}, stream=True)
        if r.status_code != 200:
            r.close(); return (r.status_code, "", r.url)
        t = r.raw.read(limit, decode_content=True)
        r.close()
        return (200, t.decode(r.encoding or "utf-8", errors="replace"), r.url)
    except Exception:
        return None

def sonduj(z):
    cil = z.get("finalni_url") or z["web"]
    p = urlparse(cil)
    zaklad = f"{p.scheme}://{p.netloc}"
    out = {"redizo": z["redizo"], "sitemap": None, "sitemap_novinky": False, "odkaz_novinky": None}
    sm = stahni(zaklad + "/sitemap.xml")
    if sm and sm[0] == 200 and ("<urlset" in sm[1][:3000] or "<sitemapindex" in sm[1][:3000]):
        out["sitemap"] = "ano"
        out["sitemap_novinky"] = bool(RE_NOVINKY.search(sm[1]))
    elif sm:
        out["sitemap"] = f"http_{sm[0]}"
    ti = stahni(cil)
    if ti and ti[0] == 200:
        for m in re.finditer(r'<a[^>]+href=["\']([^"\']+)["\'][^>]*>(.{0,80}?)</a>', ti[1], re.I | re.S):
            if RE_NOVINKY.search(m.group(1)) or RE_NOVINKY.search(m.group(2)):
                out["odkaz_novinky"] = urljoin(ti[2], m.group(1)); break
    return out

s = json.load(open("data/sondy/rss-webu-skol-20260919.json"))
kandidati = [z for z in s["skoly"]
             if z.get("titulka") == 200 and not z.get("fallback")
             and not any(f.get("stav") == "platny" for f in z["feedy"])]
random.seed(SEED)
vzorek = random.sample(kandidati, VZOREK)
print(f"kandidátů bez feedu se živou titulkou: {len(kandidati)}, vzorek {VZOREK}", flush=True)
with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool:
    vysl = list(pool.map(sonduj, vzorek))
sm = sum(1 for v in vysl if v["sitemap"] == "ano")
smn = sum(1 for v in vysl if v["sitemap_novinky"])
odk = sum(1 for v in vysl if v["odkaz_novinky"])
oboji = sum(1 for v in vysl if v["sitemap"] == "ano" and v["odkaz_novinky"])
print(f"sitemap.xml: {sm}/{VZOREK}; z toho se zmínkou o novinkách: {smn}")
print(f"odkaz na stránku novinek z titulky: {odk}/{VZOREK}")
print(f"sitemap i odkaz: {oboji}/{VZOREK}")
print("ukázky odkazů:", [v["odkaz_novinky"] for v in vysl if v["odkaz_novinky"]][:6])
vystup = sys.argv[1] if len(sys.argv) > 1 else "data/sondy/cesty-k-novinkam-20260920.json"
json.dump({"meta": {"kdy": "2026-09-20", "popis": __doc__.strip().splitlines()[0],
                    "vzorek": f"{VZOREK} z {len(kandidati)} škol se živou titulkou a bez platného feedu, seed {SEED}",
                    "skript": "scripts/sonda-cest-k-novinkam.py"},
           "souhrn": {"vzorek": len(vysl), "sitemap_xml": sm,
                      "sitemap_se_zminkou_o_novinkach": smn,
                      "odkaz_na_novinky_z_titulky": odk, "sitemap_i_odkaz": oboji},
           "skoly": vysl},
          open(vystup, "w"), ensure_ascii=False, indent=1)
print(f"-> {vystup}")
