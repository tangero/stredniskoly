#!/usr/bin/env python3
"""Generátor zpráv odběru novinek.

Postup podle ``docs/novinky-k-prijimackam-2027.md``, oddíl 7:

* šablony leží v ``content/novinky/sablony/`` a **neobsahují letopočty**;
* data a rok se doplňují z kalendáře MŠMT (``src/data/admissions-2027.json``),
  ročník z registru stavu datových sad (``public/stav_datovych_sad.json``);
* výsledek se zapisuje do ``public/novinky/{rocnik}/`` a do manifestu, protože
  odesílač čte zprávy z **nasazeného webu**, ne z repozitáře;
* ke zprávě se ukládá otisk kalendáře: když se kalendář změní, odesílač zprávu
  neodešle a vyžádá nové schválení.

Příkazy::

    python3 scripts/novinky.py plan
    python3 scripts/novinky.py priprav kriteria
    python3 scripts/novinky.py priprav --vse
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
from dataclasses import dataclass
from datetime import date, timedelta
from pathlib import Path

KOREN = Path(__file__).resolve().parent.parent
SABLONY = Path(os.environ.get("NOVINKY_SABLONY", KOREN / "content" / "novinky" / "sablony"))
# Registr a výstup jde přesměrovat kvůli testům; v provozu se nepřepisují.
REGISTR = Path(os.environ.get("NOVINKY_REGISTR", KOREN / "public" / "stav_datovych_sad.json"))
VYSTUP = Path(os.environ.get("NOVINKY_VYSTUP", KOREN / "public" / "novinky"))
KALENDARE = Path(os.environ.get("NOVINKY_KALENDARE", KOREN / "src" / "data"))

SPOUSTECE = {"potvrzeni", "kalendar", "redakcni", "publikace"}
ZAKAZANA_SLOVA = ["letos", "loni", "letošní", "žebříček", "nejlepší škola", "hranice přijetí"]


@dataclass
class Sablona:
    """Šablona zprávy: frontmatter a tělo v Markdownu."""

    nazev: str
    meta: dict
    telo: str


def nacti_registr() -> dict:
    with REGISTR.open(encoding="utf-8") as f:
        return json.load(f)


def rocnik_z_registru(registr: dict) -> str:
    """Ročník se bere z registru, nikdy z letopočtu v kódu.

    Sady jsou v registru slovník podle identifikátoru sady.
    """
    sada = (registr.get("sady") or {}).get("msmt-harmonogram")
    obdobi = (sada or {}).get("zobrazeno", {}).get("obdobi")
    if obdobi:
        return str(obdobi)
    raise SystemExit(
        "Registr nezná sadu msmt-harmonogram. Slouč větev feat/titulka-nabidka-oboru."
    )


def nacti_kalendar(rocnik: str) -> dict:
    cesta = KALENDARE / f"admissions-{rocnik}.json"
    if not cesta.exists():
        raise SystemExit(f"Kalendář {cesta.name} neexistuje; ročník {rocnik} nemá termíny.")
    with cesta.open(encoding="utf-8") as f:
        return json.load(f)


def otisk_kalendare(kalendar: dict) -> str:
    """Musí být shodný s výpočtem v src/lib/novinky-odesilac.ts."""
    return hashlib.sha256(
        json.dumps(kalendar, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    ).hexdigest()


def nacti_sablony() -> list[Sablona]:
    sablony: list[Sablona] = []
    for cesta in sorted(SABLONY.glob("*.md")):
        text = cesta.read_text(encoding="utf-8")
        if not text.startswith("---"):
            raise SystemExit(f"{cesta.name}: chybí frontmatter")
        _, hlavicka, telo = text.split("---", 2)
        meta: dict = {}
        for radek in hlavicka.strip().splitlines():
            if ":" not in radek:
                continue
            klic, hodnota = radek.split(":", 1)
            meta[klic.strip()] = hodnota.strip()
        sablony.append(Sablona(nazev=cesta.stem, meta=meta, telo=telo.strip()))
    return sablony


def udalost(kalendar: dict, id_udalosti: str) -> dict:
    for skupina in kalendar.get("groups", []):
        for u in skupina.get("events", []):
            if u.get("id") == id_udalosti:
                return u
    raise SystemExit(f"Kalendář nemá událost {id_udalosti}; šablona je proti němu neplatná.")


def spocitej_datum(s: Sablona, kalendar: dict, rocnik: str) -> tuple[date, date]:
    """Vrátí splatnost a konec užitečnosti."""
    spoustec = s.meta.get("spoustec")
    if spoustec not in SPOUSTECE:
        raise SystemExit(f"{s.nazev}: neznámý spouštěč {spoustec!r}")

    if spoustec == "redakcni":
        mesic_den = s.meta["datum"]
        posun = int(s.meta.get("rok_posun", "0"))
        mesic, den = (int(c) for c in mesic_den.split("-"))
        splatnost = date(int(rocnik) + posun, mesic, den)
        konec = splatnost + timedelta(days=int(s.meta.get("uzitecnost_dni", "21")))
        return splatnost, konec

    if spoustec in {"potvrzeni", "publikace"}:
        # Tyto zprávy nevznikají z kalendáře: potvrzení a uvítání posílá API,
        # publikaci dat spouští přepnutí sady v registru.
        raise SystemExit(f"{s.nazev}: spouštěč {spoustec} se negeneruje předem")

    hlavni = udalost(kalendar, s.meta["udalost"])
    vztah = s.meta.get("vztah", "zacatek")
    zaklad = date.fromisoformat(hlavni["end"] if vztah == "konec" else hlavni["start"])
    splatnost = zaklad - timedelta(days=int(s.meta.get("predstih_dni", "0")))
    konec_meta = s.meta.get("konec_uzitecnosti")
    if konec_meta == "konec_udalosti":
        konec = date.fromisoformat(hlavni.get("end") or hlavni["start"])
    elif konec_meta and re.fullmatch(r"udalost:[\w-]+", konec_meta):
        cizi = udalost(kalendar, konec_meta.split(":", 1)[1])
        konec = date.fromisoformat(cizi.get("end") or cizi["start"])
    else:
        konec = zaklad
    return splatnost, konec


def vypln_sablonu(s: Sablona, kalendar: dict, rocnik: str) -> tuple[str, str]:
    """Doplní do šablony termíny. Letopočty se berou z kalendáře, ne z textu."""
    telo = s.telo
    for odkaz in set(re.findall(r"\{\{([\w:-]+)\}\}", telo)):
        if odkaz == "rocnik":
            telo = telo.replace("{{rocnik}}", rocnik)
            continue
        if odkaz.startswith("datum:"):
            u = udalost(kalendar, odkaz.split(":", 1)[1])
            telo = telo.replace(f"{{{{{odkaz}}}}}", datum_s_rokem(u))
            continue
        raise SystemExit(f"{s.nazev}: neznámý odkaz {{{{{odkaz}}}}}")

    radky = [r for r in telo.splitlines()]
    predmet = radky[0].lstrip("# ").strip()
    zbytek = "\n".join(radky[1:]).strip()
    return predmet, zbytek


def datum_s_rokem(u: dict) -> str:
    """Termín vždy s rokem (slovník pojmů, §5: rok se píše výslovně).

    Kalendář má u termínů středních škol datum bez roku („15.–31. ledna“),
    protože rok je zřejmý z kontextu stránky. V e-mailu zřejmý není.
    """
    popis = u["date"]
    if re.search(r"\b20\d{2}\b", popis):
        return popis
    return f"{popis} {u['start'][:4]}"


def na_html(markdown: str) -> str:
    """Minimální převod: odstavce, tučné písmo a odkazy."""
    bloky = [b.strip() for b in markdown.split("\n\n") if b.strip()]
    html: list[str] = []
    for blok in bloky:
        if blok.startswith("- "):
            polozky = "".join(
                f"<li>{zvyrazni(r[2:].strip())}</li>" for r in blok.splitlines() if r.startswith("- ")
            )
            html.append(f"<ul>{polozky}</ul>")
        else:
            html.append(f"<p>{zvyrazni(blok)}</p>")
    return "\n".join(html)


def zvyrazni(text: str) -> str:
    text = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", text)
    text = re.sub(
        r"\[(.+?)\]\((.+?)\)", r'<a href="\2" style="color:#0074e4;">\1</a>', text
    )
    return text


def zkontroluj_texty(s: Sablona, telo: str) -> list[str]:
    """Slovník pojmů: zakázaná slova a letopočty napsané v šabloně."""
    chyby: list[str] = []
    nizky = telo.lower()
    for slovo in ZAKAZANA_SLOVA:
        if slovo in nizky:
            chyby.append(f"{s.nazev}: zakázané slovo „{slovo}“ (slovník pojmů, §5)")
    if re.search(r"\b20\d{2}\b", s.telo):
        chyby.append(f"{s.nazev}: letopočet napsaný v šabloně; použij {{{{rocnik}}}} nebo {{{{datum:…}}}}")
    return chyby


def priprav(nazvy: list[str] | None) -> int:
    registr = nacti_registr()
    rocnik = rocnik_z_registru(registr)
    kalendar = nacti_kalendar(rocnik)
    otisk = otisk_kalendare(kalendar)

    vystup = VYSTUP / rocnik
    vystup.mkdir(parents=True, exist_ok=True)
    zpravy = []
    chyby: list[str] = []

    for s in nacti_sablony():
        if s.meta.get("spoustec") in {"potvrzeni", "publikace"}:
            continue
        if nazvy and s.nazev not in nazvy:
            continue
        splatnost, konec = spocitej_datum(s, kalendar, rocnik)
        predmet, telo_md = vypln_sablonu(s, kalendar, rocnik)
        chyby.extend(zkontroluj_texty(s, f"{predmet}\n{telo_md}"))
        if konec < splatnost:
            chyby.append(f"{s.nazev}: konec užitečnosti je před splatností")

        identifikator = f"novinky/{rocnik}/{s.nazev}"
        zaznam = {
            "zprava": identifikator,
            "nazev": s.nazev,
            "rocnik": rocnik,
            "splatnost": splatnost.isoformat(),
            "konec_uzitecnosti": konec.isoformat(),
            "predmet": predmet,
            "html": na_html(telo_md),
            "text": telo_md,
            "otisk_kalendare": otisk,
        }
        (vystup / f"{s.nazev}.json").write_text(
            json.dumps(zaznam, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
        zpravy.append(
            {
                "zprava": identifikator,
                "soubor": f"{s.nazev}.json",
                "splatnost": zaznam["splatnost"],
                "konec_uzitecnosti": zaznam["konec_uzitecnosti"],
            }
        )

    if chyby:
        for ch in chyby:
            print(f"CHYBA {ch}", file=sys.stderr)
        return 1

    manifest = {"rocnik": rocnik, "otisk_kalendare": otisk, "zpravy": zpravy}
    (vystup / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"Připraveno {len(zpravy)} zpráv pro ročník {rocnik} v public/novinky/{rocnik}/")
    return 0


def plan() -> int:
    registr = nacti_registr()
    rocnik = rocnik_z_registru(registr)
    kalendar = nacti_kalendar(rocnik)
    print(f"Ročník přijímacího řízení: {rocnik}")
    print(f"{'zpráva':22} {'odeslat':12} {'do':12}")
    for s in nacti_sablony():
        if s.meta.get("spoustec") in {"potvrzeni", "publikace"}:
            print(f"{s.nazev:22} {'—':12} {'—':12} posílá {s.meta.get('spoustec')}")
            continue
        splatnost, konec = spocitej_datum(s, kalendar, rocnik)
        print(f"{s.nazev:22} {splatnost.isoformat():12} {konec.isoformat():12}")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    podprikazy = parser.add_subparsers(dest="prikaz", required=True)
    podprikazy.add_parser("plan", help="vypíše, co a kdy se má odeslat")
    p = podprikazy.add_parser("priprav", help="vygeneruje zprávy do public/novinky/")
    p.add_argument("sablony", nargs="*", help="názvy šablon; bez nich se vezmou všechny")
    p.add_argument("--vse", action="store_true", help="všechny šablony")

    args = parser.parse_args()
    if args.prikaz == "plan":
        return plan()
    nazvy = None if args.vse or not args.sablony else args.sablony
    return priprav(nazvy)


if __name__ == "__main__":
    raise SystemExit(main())
