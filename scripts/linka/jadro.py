"""Jádro datové linky: konfigurace, síť, fronta úloh a zjišťování změn.

Plán a pravidla: docs/datova-linka.md. Všechny cesty a adresy lze přepsat
proměnnými prostředí, aby testy mohly linku pustit proti falešnému zdroji.
"""
from __future__ import annotations

import datetime as dt
import hashlib
import json
import os
import re
import urllib.error
import urllib.request
from email.utils import parsedate_to_datetime
from pathlib import Path

KOREN = Path(os.environ.get("LINKA_KOREN", Path(__file__).resolve().parents[2]))


def cesta(promenna: str, vychozi: str) -> Path:
    hodnota = os.environ.get(promenna)
    return Path(hodnota) if hodnota else KOREN / vychozi


def registr_cesta() -> Path:
    return cesta("LINKA_REGISTR", "public/stav_datovych_sad.json")


def fronta_cesta() -> Path:
    return cesta("LINKA_FRONTA", "data/linka/fronta.json")


def prace_cesta() -> Path:
    return cesta("LINKA_PRACE", "data/linka/prace")


def dnes() -> dt.date:
    return dt.date.fromisoformat(os.environ["LINKA_DNES"]) if os.environ.get("LINKA_DNES") else dt.date.today()


def ted() -> str:
    return dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat()


# ---------------------------------------------------------------- síť

HLAVICKY = {"User-Agent": "prijimackynaskolu.cz datova linka"}


def head(url: str) -> tuple[int, str]:
    """Stav a Last-Modified. Na přesměrování odpovídá některý server jen u GET, proto záloha."""
    for metoda in ("HEAD", "GET"):
        req = urllib.request.Request(url, method=metoda, headers=HLAVICKY)
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.status, r.headers.get("Last-Modified", "")
        except urllib.error.HTTPError as e:
            if metoda == "HEAD" and 300 <= e.code < 400:
                continue
            return e.code, ""
        except Exception as e:  # síť, DNS, časový limit
            return 0, str(e)[:80]
    return 0, "přesměrování"


def stahni(url: str, cil: Path) -> dict:
    """Stáhne soubor po částech a vrátí velikost, sha256 a Last-Modified."""
    cil.parent.mkdir(parents=True, exist_ok=True)
    h = hashlib.sha256()
    velikost = 0
    req = urllib.request.Request(url, headers=HLAVICKY)
    with urllib.request.urlopen(req, timeout=300) as r, open(cil, "wb") as f:
        zmena = r.headers.get("Last-Modified", "")
        while blok := r.read(1 << 20):
            f.write(blok)
            h.update(blok)
            velikost += len(blok)
    return {"soubor": str(cil), "velikost": velikost, "sha256": h.hexdigest(), "last_modified": zmena}


def datum_zmeny(last_modified: str) -> dt.date | None:
    try:
        return parsedate_to_datetime(last_modified).date()
    except (TypeError, ValueError):
        return None


# ---------------------------------------------------------------- fronta

ABECEDA = "ACDEFGHJKLMNPQRTUVWXY3479"  # bez znaků, které se pletou (0/O, 1/I, 2/Z, 5/S, 8/B)

STAVY = ("zjisteno", "pripraveno", "selhalo", "bez_zmeny", "oznameno", "schvaleno", "zamitnuto", "predano")


def kod(*casti: str) -> str:
    """Stabilní pětiznakový kód: tentýž rozdíl dostane vždy tentýž kód."""
    cislo = int.from_bytes(hashlib.sha1("|".join(casti).encode()).digest()[:8], "big")
    znaky = []
    for _ in range(5):
        cislo, zbytek = divmod(cislo, len(ABECEDA))
        znaky.append(ABECEDA[zbytek])
    return "".join(znaky)


def nacti_frontu() -> dict:
    p = fronta_cesta()
    if p.exists():
        return json.loads(p.read_text(encoding="utf-8"))
    return {"verze": 1, "zname": {}, "ulohy": {}, "behy": []}


def uloz_frontu(fronta: dict) -> None:
    p = fronta_cesta()
    p.parent.mkdir(parents=True, exist_ok=True)
    fronta["behy"] = fronta.get("behy", [])[-30:]
    p.write_text(json.dumps(fronta, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def zmen_stav(uloha: dict, stav: str, poznamka: str = "") -> None:
    assert stav in STAVY, stav
    uloha["stav"] = stav
    uloha.setdefault("historie", []).append({"cas": ted(), "stav": stav, **({"poznamka": poznamka} if poznamka else {})})


def nacti_registr() -> dict:
    return json.loads(registr_cesta().read_text(encoding="utf-8"))


# ---------------------------------------------------------------- zjišťování

def rozvin(vzor: str, den: dt.date) -> list[tuple[str | None, str]]:
    """Adresy ze vzoru. {rok} pro loňský, letošní a příští rok, {ctvrtleti} pro konce čtvrtletí."""
    if "{rok}" in vzor:
        return [(str(r), vzor.replace("{rok}", str(r))) for r in (den.year - 1, den.year, den.year + 1)]
    if "{ctvrtleti}" in vzor:
        konce = []
        for rok in (den.year - 1, den.year):
            for mesic, d in ((3, 31), (6, 30), (9, 30), (12, 31)):
                datum = dt.date(rok, mesic, d)
                if datum <= den + dt.timedelta(days=95):
                    konce.append(datum.isoformat())
        return [(k, vzor.replace("{ctvrtleti}", k)) for k in konce[-5:]]
    return [(None, vzor)]


def porovnej(a: str | None, b: str | None) -> int | None:
    """-1, 0, 1 pro roky nebo data ve tvaru RRRR-MM-DD, None když se porovnat nedají."""
    if not a or not b:
        return None
    if re.fullmatch(r"\d{4}", a) and re.fullmatch(r"\d{4}", b):
        return (int(a) > int(b)) - (int(a) < int(b))
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", a) and re.fullmatch(r"\d{4}-\d{2}-\d{2}", b):
        return (a > b) - (a < b)
    return None


def referencni_datum(sada: dict) -> dt.date | None:
    """Nejpozdější doložené datum, kdy jsme zobrazená data převzali nebo ověřili."""
    z = sada.get("zobrazeno", {})
    data = [z.get(k) for k in ("stazeno", "platne_k", "zkontrolovano", "prepnuto")]
    if z.get("obdobi") and re.fullmatch(r"\d{4}-\d{2}-\d{2}", str(z["obdobi"])):
        data.append(z["obdobi"])
    data = [dt.date.fromisoformat(d) for d in data if d]
    return max(data) if data else None


UKOLOVE_POUZITI = {"web", "planovano"}


def zjisti(registr: dict, fronta: dict, head_fn=head) -> dict:
    """Projde sledované adresy a založí úlohy. Vrátí přehled běhu."""
    den = dnes()
    beh = {"cas": ted(), "nove_ulohy": [], "informace": [], "nedostupne": []}
    for sid, sada in registr["sady"].items():
        akt = sada.get("aktualizace", {})
        vzory = akt.get("sledovat", [])
        if not vzory:
            continue
        zobrazeno = sada.get("zobrazeno", {}).get("obdobi")
        reference = referencni_datum(sada)
        kandidati = []  # (druh, obdobi, url, last_modified)
        for vzor in vzory:
            dostupne = []
            for obdobi, url in rozvin(vzor, den):
                stav, zmena = head_fn(url)
                zname = fronta["zname"].get(url)
                if stav == 200:
                    dostupne.append((obdobi, url, zmena))
                elif stav == 404:
                    # Zmizelý zdroj: pevná adresa, nebo adresa, která dříve existovala.
                    if obdobi is None or (zname and zname.get("stav") == 200):
                        kandidati.append(("zmizelo", obdobi or zobrazeno, url, ""))
                    fronta["zname"][url] = {"stav": 404, "zjisteno": den.isoformat()}
                    continue
                else:
                    beh["nedostupne"].append({"sada": sid, "url": url, "stav": stav, "chyba": zmena})
                    continue

            for obdobi, url, zmena in dostupne:
                zname = fronta["zname"].get(url)
                cmp = porovnej(obdobi, zobrazeno)
                if zname and zname.get("last_modified") == zmena:
                    pass
                elif obdobi is not None and (zobrazeno is None or cmp == 1):
                    kandidati.append(("nove_obdobi", obdobi, url, zmena))
                elif cmp == 0 or obdobi is None:
                    zmeneno = datum_zmeny(zmena)
                    if zname and zname.get("last_modified") and zname["last_modified"] != zmena:
                        kandidati.append(("revize", obdobi or zobrazeno, url, zmena))
                    elif not zname and reference and zmeneno and zmeneno > reference:
                        kandidati.append(("revize", obdobi or zobrazeno, url, zmena))
                fronta["zname"][url] = {"stav": 200, "last_modified": zmena, "zjisteno": den.isoformat()}

        # U nového období stačí nejnovější; starší dostupná období by jen zahltila oznámení.
        nova = [k for k in kandidati if k[0] == "nove_obdobi"]
        if nova:
            nejnovejsi = max(nova, key=lambda k: (len(k[1]), k[1]))
            kandidati = [k for k in kandidati if k[0] != "nove_obdobi"] + [nejnovejsi]
        if not akt.get("revize_oznamovat", True):
            kandidati = [k for k in kandidati if k[0] != "revize"]

        for druh, obdobi, url, zmena in kandidati:
            k = kod(sid, str(obdobi), druh, url, zmena)
            zaznam = {"sada": sid, "druh": druh, "obdobi": obdobi, "url": url, "last_modified": zmena}
            if sada.get("pouziti") not in UKOLOVE_POUZITI:
                beh["informace"].append(zaznam)
                continue
            if k in fronta["ulohy"]:
                continue
            uloha = {"kod": k, **zaznam, "vytvoreno": ted(), "zobrazene_obdobi": zobrazeno}
            zmen_stav(uloha, "zjisteno")
            fronta["ulohy"][k] = uloha
            beh["nove_ulohy"].append(k)
    fronta.setdefault("behy", []).append(beh)
    return beh
