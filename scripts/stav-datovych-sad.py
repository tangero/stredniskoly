#!/usr/bin/env python3
"""Registr stavu datových sad: kontrola, tabulka do dokumentace a přepnutí období.

Registr je public/stav_datovych_sad.json. Určuje, které období každé datové sady
web zobrazuje, jaké období čekáme a kdy, a které ukazatele ze slovníku na sadě
stojí. Ručně se neupravuje; mění se tímto skriptem, aby každé přepnutí mělo
záznam v historii.

    python3 scripts/stav-datovych-sad.py kontrola
    python3 scripts/stav-datovych-sad.py tabulka
    python3 scripts/stav-datovych-sad.py prepni cermat-vysledky 2027 --kdy 2028-08 --doklad "commit abc123, testy prošly"
    python3 scripts/stav-datovych-sad.py vrat cermat-vysledky --duvod "chyba v importu"
    python3 scripts/stav-datovych-sad.py zjisti

Příkaz zjisti se jen dívá: pošle na sledované adresy dotaz HEAD a vypíše, co
zdroj zveřejnil nebo přepsal. Nic nestahuje a registr nemění.

Kontrola skončí kódem 1 při chybě. Varování, například uplynulý očekávaný
termín, na výsledek nemají vliv, ale vypíšou se.
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import re
import sys
from pathlib import Path

KOREN = Path(__file__).resolve().parent.parent
REGISTR = KOREN / "public" / "stav_datovych_sad.json"
SLOVNIK = KOREN / "docs" / "slovnik-ukazatelu.md"
ZDROJE = KOREN / "docs" / "zdroje-dat.md"
ZNACKA_OD = "<!-- stav-datovych-sad:od -->"
ZNACKA_DO = "<!-- stav-datovych-sad:do -->"

POVINNA_POLE = ("nazev", "dokumentace", "cyklus", "pouziti", "zobrazeno", "ocekavano", "po_prepnuti", "vystupy", "ukazatele", "aktualizace")
AUTOMATIZACE = {"plna", "priprava", "detekce", "rucni", "zadna"}
CYKLY = {"rocni", "ctvrtletni", "prubezne", "rucni", "uzavreno"}
POUZITI = {"web", "analyza", "planovano", "nepouzito", "nezobrazovat"}
JISTOTY = {"znamo", "odhad", "neznamo"}


def nacti() -> dict:
    return json.loads(REGISTR.read_text(encoding="utf-8"))


def uloz(registr: dict) -> None:
    registr["aktualizovano"] = dt.date.today().isoformat()
    REGISTR.write_text(json.dumps(registr, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def ukazatele_slovniku() -> set[str]:
    """Nadpisy ukazatelů ze slovníku.

    Ukazatelem je každý nadpis třetí úrovně a každý nadpis druhé úrovně,
    který pod sebou žádné nadpisy třetí úrovně nemá.
    """
    radky = SLOVNIK.read_text(encoding="utf-8").splitlines()
    vysledek: set[str] = set()
    oddil: str | None = None
    ma_podnadpis = False
    for r in radky:
        if r.startswith("## "):
            if oddil and not ma_podnadpis:
                vysledek.add(oddil)
            oddil = re.sub(r"^\d+\.\s*", "", r[3:].strip())
            ma_podnadpis = False
        elif r.startswith("### "):
            vysledek.add(r[4:].strip())
            ma_podnadpis = True
    if oddil and not ma_podnadpis:
        vysledek.add(oddil)
    return vysledek


def hodnota(soubor: Path, cesta: str):
    data = json.loads(soubor.read_text(encoding="utf-8"))
    for cast in cesta.split("."):
        data = data[cast]
    return data


def konec_mesice(text: str) -> dt.date:
    """'2027-03' → 31. 3. 2027; úplné datum se vrátí beze změny."""
    if len(text) == 7:
        rok, mesic = map(int, text.split("-"))
        dalsi = dt.date(rok + (mesic == 12), mesic % 12 + 1, 1)
        return dalsi - dt.timedelta(days=1)
    return dt.date.fromisoformat(text)


def kontrola(registr: dict, dnes: dt.date) -> tuple[list[str], list[str]]:
    chyby: list[str] = []
    varovani: list[str] = []
    sady = registr["sady"]

    for sid, s in sady.items():
        for pole in POVINNA_POLE:
            if pole not in s:
                chyby.append(f"{sid}: chybí pole {pole}")
        if s.get("cyklus") not in CYKLY:
            chyby.append(f"{sid}: neznámý cyklus {s.get('cyklus')}")
        if s.get("pouziti") not in POUZITI:
            chyby.append(f"{sid}: neznámé použití {s.get('pouziti')}")
        if s.get("aktualizace", {}).get("automatizace") not in AUTOMATIZACE:
            chyby.append(f"{sid}: neznámá úroveň automatizace {s.get('aktualizace', {}).get('automatizace')}")
        for d in s.get("dostupne", []):
            varovani.append(f"{sid}: zdroj zveřejnil {d.get('obdobi')}"
                            f"{' (' + d['verze'] + ')' if d.get('verze') else ''}, web ho nepřevzal")
        oc = s.get("ocekavano", {})
        if oc.get("jistota") not in JISTOTY:
            chyby.append(f"{sid}: neznámá jistota {oc.get('jistota')}")
        if oc.get("jistota") == "odhad" and not oc.get("zduvodneni"):
            chyby.append(f"{sid}: odhad termínu bez zdůvodnění")

        # Soubory, na které registr ukazuje, musí existovat.
        soubor = s.get("zobrazeno", {}).get("soubor")
        if soubor and not soubor.startswith("http") and not (KOREN / soubor).exists():
            varovani.append(f"{sid}: soubor {soubor} v repozitáři není (některé zdroje se nestahují)")
        for v in s.get("vystupy", []):
            if not (KOREN / v).exists():
                chyby.append(f"{sid}: výstup {v} neexistuje")

        # Období v registru musí odpovídat tomu, co je skutečně v datech.
        ko = s.get("kontrola_obdobi")
        if ko:
            skutecne = str(hodnota(KOREN / ko["soubor"], ko["cesta"]))
            if skutecne != str(s["zobrazeno"]["obdobi"]):
                chyby.append(f"{sid}: registr uvádí období {s['zobrazeno']['obdobi']}, data v {ko['soubor']} mají {skutecne}")

        # Uplynulý očekávaný termín bez přepnutí je signál, že data možná vyšla.
        if oc.get("kdy") and s.get("cyklus") != "uzavreno" and konec_mesice(oc["kdy"]) < dnes:
            varovani.append(f"{sid}: očekávané období {oc.get('obdobi')} mělo vyjít do {oc['kdy']} ({oc['jistota']}), zkontroluj zdroj")
        if s.get("obnovit_nejpozdeji") and dt.date.fromisoformat(s["obnovit_nejpozdeji"]) < dnes:
            varovani.append(f"{sid}: data jsou z {s['zobrazeno'].get('obdobi')}, obnova byla naplánována nejpozději na {s['obnovit_nejpozdeji']}")

    # Vazba na slovník oběma směry.
    ve_slovniku = ukazatele_slovniku()
    v_registru: dict[str, str] = {}
    for sid, s in sady.items():
        for u in s.get("ukazatele", []):
            if u in v_registru:
                chyby.append(f"ukazatel „{u}“ je u dvou sad: {v_registru[u]} a {sid}")
            v_registru[u] = sid
    for u, sid_list in registr.get("ukazatele_z_vice_sad", {}).items():
        for sid in sid_list:
            if sid not in sady:
                chyby.append(f"ukazatel „{u}“ odkazuje na neznámou sadu {sid}")
        v_registru[u] = "+".join(sid_list)
    mimo = set(registr.get("ukazatele_mimo_registr", {}))

    for u in sorted(set(v_registru) - ve_slovniku):
        chyby.append(f"ukazatel „{u}“ je v registru, ale ve slovníku není")
    for u in sorted(ve_slovniku - set(v_registru) - mimo):
        chyby.append(f"ukazatel „{u}“ je ve slovníku, ale žádná sada ho nevede; doplň ho do registru, nebo do ukazatele_mimo_registr s důvodem")

    # Vazba na dokumentaci zdrojů: každá sada musí odkazovat do docs/zdroje-dat.md.
    for sid, s in sady.items():
        if not s.get("dokumentace", "").startswith("docs/zdroje-dat.md"):
            chyby.append(f"{sid}: dokumentace musí odkazovat do docs/zdroje-dat.md")
    return chyby, varovani


def zobraz_obdobi(s: dict) -> str:
    o = s["zobrazeno"].get("obdobi")
    return o if o else "nic"


def tabulka(registr: dict) -> str:
    pouziti = {"web": "web", "analyza": "analýza", "planovano": "plánováno", "nepouzito": "nepoužito", "nezobrazovat": "nezobrazovat"}
    jistota = {"znamo": "", "odhad": ", odhad", "neznamo": "neznámo"}
    radky = [
        "| Sada | Použití | Zobrazujeme | Odkud | Zveřejněno, nepřevzato | Čekáme | Kdy | Po přepnutí |",
        "|---|---|---|---|---|---|---|---|",
    ]
    for sid, s in registr["sady"].items():
        oc = s["ocekavano"]
        odkud = s["zobrazeno"].get("soubor") or s["zobrazeno"].get("poznamka") or ""
        if odkud.startswith("http"):
            odkud = odkud.rsplit("/", 1)[-1]
        kdy = f"{oc['kdy']}{jistota[oc['jistota']]}" if oc.get("kdy") else jistota[oc["jistota"]] or "—"
        dostupne = ", ".join(str(d.get("obdobi")) for d in s.get("dostupne", [])) or "—"
        radky.append(
            f"| `{sid}` | {pouziti[s['pouziti']]} | {zobraz_obdobi(s)} | `{odkud}` | {dostupne} | "
            f"{oc.get('obdobi') or '—'} | {kdy} | {s['po_prepnuti']} |"
        )
    return "\n".join(radky)


def tabulka_aktualizace(registr: dict) -> str:
    uroven = {"plna": "plná", "priprava": "příprava", "detekce": "jen detekce", "rucni": "ruční", "zadna": "neaktualizuje se"}
    radky = [
        "| Sada | Automatizace | Jak zjistíme nová data | Import | Co musí udělat člověk |",
        "|---|---|---|---|---|",
    ]
    for sid, s in registr["sady"].items():
        a = s["aktualizace"]
        radky.append(
            f"| `{sid}` | {uroven[a['automatizace']]} | {a.get('detekce', '—')} | {a.get('import', '—')} | {a.get('lidsky_krok', '—')} |"
        )
    return "\n".join(radky)


def zapis_tabulku(registr: dict) -> None:
    text = ZDROJE.read_text(encoding="utf-8")
    if ZNACKA_OD not in text or ZNACKA_DO not in text:
        sys.exit(f"V {ZDROJE.relative_to(KOREN)} chybí značky {ZNACKA_OD} a {ZNACKA_DO}")
    zacatek = text.index(ZNACKA_OD) + len(ZNACKA_OD)
    konec = text.index(ZNACKA_DO)
    nova = (f"\n\n_Vygenerováno z `public/stav_datovych_sad.json` dne {registr['aktualizovano']}. "
            f"Neupravovat ručně._\n\n{tabulka(registr)}\n\n#### Aktualizace a automatizace\n\n"
            f"{tabulka_aktualizace(registr)}\n\n")
    ZDROJE.write_text(text[:zacatek] + nova + text[konec:], encoding="utf-8")
    print(f"tabulka zapsána do {ZDROJE.relative_to(KOREN)}")


def prepni(registr: dict, sid: str, obdobi: str, kdy: str | None, jistota: str, zduvodneni: str, doklad: str,
           soubor: str | None, kontrola_soubor: str | None) -> None:
    s = registr["sady"].get(sid) or sys.exit(f"neznámá sada {sid}")
    if not doklad:
        sys.exit("přepnutí vyžaduje --doklad: commit importu a výsledek kontrol")
    predchozi = dict(s["zobrazeno"])
    s.setdefault("historie_obdobi", []).append(predchozi)
    # Převzaté období mizí z dostupných, jinak by kontrola dál hlásila „zdroj zveřejnil, web nepřevzal“.
    prevzato = next((d for d in s.get("dostupne", []) if str(d.get("obdobi")) == str(obdobi)), None)
    if prevzato:
        s["dostupne"].remove(prevzato)
    s["zobrazeno"] = {
        "obdobi": obdobi,
        **({"soubor": soubor} if soubor else {}),
        **({"verze": prevzato["verze"]} if prevzato and prevzato.get("verze") else {}),
        "prepnuto": dt.date.today().isoformat(),
        **({"z_dostupne": prevzato} if prevzato else {}),
    }
    # Bez --kdy se očekávání nemaže, pokud pořád míří za nové období (revize téhož období,
    # nebo přepnutí na 2026, když už čekáme 2027). Jinak se vynuluje a skript na to upozorní.
    puvodni = s.get("ocekavano") or {}
    ceka_dal = puvodni.get("obdobi") is not None and str(puvodni["obdobi"]) > str(obdobi)
    revize = str(obdobi) == str(predchozi.get("obdobi"))
    if kdy is not None or not (revize or ceka_dal):
        s["ocekavano"] = {"obdobi": None, "kdy": kdy, "jistota": jistota, "zduvodneni": zduvodneni}
        if kdy is None:
            print(f"VAROVÁNÍ  {sid}: očekávané další období vynulováno, doplň --kdy a --zduvodneni", file=sys.stderr)
    # Výstupy s rokem v názvu, například pasma_prijeti_2026.json, se přepínají s obdobím.
    if kontrola_soubor and s.get("kontrola_obdobi"):
        s["kontrola_obdobi"]["soubor"] = kontrola_soubor
    registr["historie_prepnuti"].append({
        "datum": dt.date.today().isoformat(), "sada": sid, "z": predchozi.get("obdobi"), "na": obdobi, "doklad": doklad,
    })


def vrat(registr: dict, sid: str, duvod: str) -> None:
    s = registr["sady"].get(sid) or sys.exit(f"neznámá sada {sid}")
    if not s.get("historie_obdobi"):
        sys.exit(f"{sid}: není kam vrátit")
    aktualni = s["zobrazeno"]
    s["zobrazeno"] = s["historie_obdobi"].pop()
    if aktualni.get("z_dostupne"):
        s.setdefault("dostupne", []).append(aktualni["z_dostupne"])
    registr["historie_prepnuti"].append({
        "datum": dt.date.today().isoformat(), "sada": sid, "z": aktualni.get("obdobi"), "na": s["zobrazeno"].get("obdobi"), "doklad": f"vráceno: {duvod}",
    })


def zjisti(registr: dict, dnes: dt.date) -> None:
    """Pošle HEAD na sledované adresy a vypíše, co je nového. Nic nestahuje."""
    import urllib.error
    import urllib.request

    def head(url: str) -> tuple[int, str]:
        hlavicky = {"User-Agent": "prijimackynaskolu.cz kontrola dat"}
        for metoda in ("HEAD", "GET"):
            req = urllib.request.Request(url, method=metoda, headers=hlavicky)
            try:
                with urllib.request.urlopen(req, timeout=30) as r:
                    return r.status, r.headers.get("Last-Modified", "")
            except urllib.error.HTTPError as e:
                # Některé servery na HEAD odpoví přesměrováním, které urllib nesleduje; GET ho sleduje.
                if metoda == "HEAD" and 300 <= e.code < 400:
                    continue
                return e.code, ""
            except Exception as e:  # síť, DNS, časový limit
                return 0, str(e)[:60]
        return 0, "přesměrování"

    ctvrtleti = [f"{dnes.year - (m > dnes.month)}-{m:02d}-{d}" for m, d in ((3, 31), (6, 30), (9, 30), (12, 31))]
    for sid, s in registr["sady"].items():
        vzory = s["aktualizace"].get("sledovat", [])
        if not vzory:
            continue
        roky = {dnes.year - 1, dnes.year, dnes.year + 1}
        for vzor in vzory:
            adresy = []
            if "{rok}" in vzor:
                adresy = [(str(r), vzor.replace("{rok}", str(r))) for r in sorted(roky)]
            elif "{ctvrtleti}" in vzor:
                adresy = [(q, vzor.replace("{ctvrtleti}", q)) for q in sorted(ctvrtleti)]
            else:
                adresy = [("—", vzor)]
            for obdobi, url in adresy:
                kod, zmena = head(url)
                stav = "je" if kod == 200 else "není" if kod == 404 else f"chyba {kod} {zmena}"
                print(f"{sid:28} {obdobi:>10}  {stav:5} {zmena if kod == 200 else ''}  {url.rsplit('/', 1)[-1]}")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="prikaz", required=True)
    sub.add_parser("kontrola")
    sub.add_parser("tabulka")
    p = sub.add_parser("prepni")
    p.add_argument("sada")
    p.add_argument("obdobi")
    p.add_argument("--kdy", help="kdy čekáme další období, RRRR-MM")
    p.add_argument("--jistota", default="odhad", choices=sorted(JISTOTY))
    p.add_argument("--zduvodneni", default="Odvozeno z termínu tohoto přepnutí.")
    p.add_argument("--doklad", required=True)
    p.add_argument("--soubor", help="zdrojový soubor nového období")
    p.add_argument("--kontrola-soubor", help="výstup nového období, podle kterého se ověří rok v datech")
    sub.add_parser("zjisti")
    v = sub.add_parser("vrat")
    v.add_argument("sada")
    v.add_argument("--duvod", required=True)
    a = ap.parse_args()

    registr = nacti()
    if a.prikaz == "kontrola":
        chyby, varovani = kontrola(registr, dt.date.today())
        for x in varovani:
            print(f"VAROVÁNÍ  {x}")
        for x in chyby:
            print(f"CHYBA     {x}")
        print(f"{len(registr['sady'])} sad, {len(chyby)} chyb, {len(varovani)} varování")
        sys.exit(1 if chyby else 0)
    if a.prikaz == "tabulka":
        zapis_tabulku(registr)
        return
    if a.prikaz == "zjisti":
        zjisti(registr, dt.date.today())
        return

    if a.prikaz == "prepni":
        prepni(registr, a.sada, a.obdobi, a.kdy, a.jistota, a.zduvodneni, a.doklad, a.soubor, a.kontrola_soubor)
    else:
        vrat(registr, a.sada, a.duvod)
    # Přepnutí se uloží, jen když registr po změně projde kontrolou.
    chyby, _ = kontrola(registr, dt.date.today())
    if chyby:
        for x in chyby:
            print(f"CHYBA     {x}")
        sys.exit("změna neuložena, registr by neprošel kontrolou")
    uloz(registr)
    zapis_tabulku(registr)
    print(f"{a.sada}: uloženo")


if __name__ == "__main__":
    main()
