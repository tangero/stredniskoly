#!/usr/bin/env python3
"""Obohacení fronty návazností o strojová data z rejstříku MŠMT.

Ke každému úkolu fronty (docs/podklady/fronta-dohledavani-2025-2026.json)
sestaví přehled ze čtyř datovaných snímků rejstříku v data/msmt_rejstrik/:
existence subjektu, název, sídlo, jednotlivá IZO, jejich místa výuky
a registrované obory. U každé nepřiřazené nabídky porovná KKOV s obory
zapsanými v rejstříku a navrhne strojovou klasifikaci.

Výstup je podklad pro rešerši, nikoli hotový nález: rejstřík se aktualizuje
s odstupem a zápis oboru nedokazuje vyhlášení přijímacího řízení.

Použití:
    python3 scripts/enrich-continuity-registry.py [--out CESTA]
"""
import argparse
import glob
import json
import os
from collections import defaultdict

FRONTA = "docs/podklady/fronta-dohledavani-2025-2026.json"
SNIMKY = "data/msmt_rejstrik/rssz-*.jsonld"
DRUHY_SS = {"C00"}  # střední škola

FORMA = {"10": "denní", "22": "dálková", "23": "večerní", "24": "kombinovaná", "30": "distanční"}
DELKA = {"10": "1", "20": "2", "30": "3", "35": "3,5", "40": "4", "45": "4,5",
         "50": "5", "60": "6", "80": "8", "90": "neuvedeno/jiná", "A0": "10"}
JAZYK = {"10": "český", "11": "slovenský", "12": "anglický", "13": "německý",
         "14": "francouzský", "15": "španělský", "18": "dvojjazyčný/jiný", "50": "jiný"}


def adresa_text(a):
    if not a:
        return None
    cd = a.get("cisloDomovni")
    co = a.get("cisloOrientacni")
    cislo = f"{cd}/{co}" if cd and co else (str(cd) if cd else "")
    ulice = a.get("ulice") or ""
    cast = a.get("castObce")
    obec = a.get("obec")
    misto = obec if not cast or cast == obec else f"{cast}, {obec}"
    return f"{ulice} {cislo}".strip().strip(",") + f", {a.get('psc') or ''} {misto}".rstrip()


def obor_text(o):
    return {
        "kod": o.get("kod"),
        "nazev": o.get("nazev"),
        "forma": FORMA.get(o.get("formaVzdelavani"), o.get("formaVzdelavani")),
        "delka": DELKA.get(o.get("delkaVzdelavani"), o.get("delkaVzdelavani")),
        "jazyk": JAZYK.get(o.get("jazykOboru"), o.get("jazykOboru")),
        "kapacita": o.get("kapacita"),
        "dobihajici": o.get("dobihajiciObor"),
    }


def nacti_snimky():
    """Vrátí (data_snimku, index_redizo, index_izo) nad všemi snímky."""
    snimky = []
    podle_redizo = defaultdict(dict)   # redizo -> datum -> subjekt
    podle_izo = defaultdict(dict)      # izo -> datum -> (redizo, uplnyNazev, druh)
    for cesta in sorted(glob.glob(SNIMKY)):
        data = json.load(open(cesta))
        datum = data.get("datumVystupu") or os.path.basename(cesta)
        snimky.append(datum)
        for subjekt in data["list"]:
            podle_redizo[subjekt["redIzo"]][datum] = subjekt
            for skola in (subjekt.get("skolyAZarizeni") or []):
                podle_izo[skola["izo"]][datum] = (
                    subjekt["redIzo"], subjekt.get("uplnyNazev"), skola.get("druh"))
    return snimky, podle_redizo, podle_izo


def digest_subjektu(redizo, snimky, podle_redizo):
    """Stav jednoho REDIZO ve všech snímcích."""
    stav = {}
    for datum in snimky:
        subjekt = podle_redizo.get(redizo, {}).get(datum)
        if subjekt is None:
            stav[datum] = None
            continue
        skoly = []
        for skola in (subjekt.get("skolyAZarizeni") or []):
            if skola.get("druh") not in DRUHY_SS:
                continue
            skoly.append({
                "izo": skola["izo"],
                "nazev": skola.get("uplnyNazev"),
                "druh": skola.get("druh"),
                "mista_vyuky": [adresa_text(m.get("adresa")) for m in (skola.get("mistaVyuky") or [])],
                "obory": [obor_text(o) for o in (skola.get("obory") or [])],
                "datum_zapisu": skola.get("datumZapisu"),
                "datum_zahajeni": skola.get("datumZahajeniCinnosti"),
            })
        stav[datum] = {
            "uplny_nazev": subjekt.get("uplnyNazev"),
            "ico": subjekt.get("ico"),
            "sidlo": adresa_text(subjekt.get("adresa")),
            "zrizovatel": [z.get("nazevOsoby") for z in (subjekt.get("zrizovatele") or [])],
            "vsechna_izo": [s["izo"] for s in (subjekt.get("skolyAZarizeni") or [])],
            "stredni_skoly": skoly,
        }
    return stav


def zmeny(stav, snimky, klic):
    """Posloupnost hodnot klíče přes snímky, jen tam, kde se mění."""
    vysledek = []
    predchozi = "\0"
    for datum in snimky:
        s = stav[datum]
        hodnota = None if s is None else s.get(klic)
        if hodnota != predchozi:
            vysledek.append({"od_snimku": datum, "hodnota": hodnota})
            predchozi = hodnota
    return vysledek


def registrovane_obory(stav, datum):
    """Mapa KKOV -> seznam variant u všech SŠ subjektu v daném snímku."""
    mapa = defaultdict(list)
    s = stav.get(datum)
    if not s:
        return mapa
    for skola in s["stredni_skoly"]:
        for o in skola["obory"]:
            mapa[o["kod"]].append({**o, "izo": skola["izo"]})
    return mapa


def klasifikuj_nabidku(zaznam, stav, snimky):
    """Strojový návrh pro jednu nepřiřazenou nabídku podle zápisu oboru v rejstříku."""
    kkov = zaznam["data"].get("KKOV")
    rok = zaznam.get("year")
    prvni, posledni = snimky[0], snimky[-1]
    v_prvnim = kkov in registrovane_obory(stav, prvni)
    v_poslednim = kkov in registrovane_obory(stav, posledni)
    pritomnost = {d: kkov in registrovane_obory(stav, d) for d in snimky}
    if rok == 2026:
        if not v_prvnim and v_poslednim:
            navrh = "nový obor zapsaný mezi snímky – ověřit oznámení školy/zřizovatele"
        elif v_prvnim and v_poslednim:
            navrh = "obor byl zapsán už v roce 2025 – v 2025 se nenabízel, jde spíš o obnovení přijímacího řízení než o nový obor"
        elif not v_prvnim and not v_poslednim:
            navrh = "obor není v rejstříku ani v posledním snímku – zápis s odstupem, nutné doložit z webu školy"
        else:
            navrh = "obor zapsán dříve, v posledním snímku chybí – ověřit"
    else:
        if v_prvnim and v_poslednim:
            navrh = "obor zůstává zapsán i po roce 2026 – chybějící nabídka je spíš přerušení přijímacího řízení než zánik oboru"
        elif v_prvnim and not v_poslednim:
            navrh = "obor byl z rejstříku vymazán – doložit zrušení oboru a jeho datum"
        else:
            navrh = "obor nebyl zapsán ani ve snímku 2025 – ověřit identifikaci nabídky"
    return {
        "kkov": kkov,
        "rok_nabidky": rok,
        "obor_v_rejstriku": pritomnost,
        "varianty_v_rejstriku": {d: registrovane_obory(stav, d).get(kkov, []) for d in snimky},
        "strojovy_navrh": navrh,
    }


def stopa_izo(izo, snimky, podle_izo):
    """Pod kterým REDIZO je dané IZO v jednotlivých snímcích."""
    if izo and izo.lower().startswith("izo_"):
        izo = izo[4:]
    return {d: podle_izo.get(izo, {}).get(d) for d in snimky}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default="docs/podklady/rejstrik-k-fronte-2025-2026.json")
    args = parser.parse_args()

    fronta = json.load(open(FRONTA))
    snimky, podle_redizo, podle_izo = nacti_snimky()

    vystup = {
        "generated_from": FRONTA,
        "queue_version": fronta["version"],
        "snapshots": snimky,
        "note": "Strojový přehled z rejstříku MŠMT. Zápis oboru není důkaz vyhlášení přijímacího řízení "
                "a rejstřík se aktualizuje s odstupem; slouží jako podklad rešerše, ne jako nález.",
        "tasks": {},
    }

    for ukol in fronta["tasks"]:
        zaznam = {"redizo": {}, "izo_napric_subjekty": {}, "nabidky": []}
        for redizo in ukol["redizo"]:
            stav = digest_subjektu(redizo, snimky, podle_redizo)
            zaznam["redizo"][redizo] = {
                "stav_ve_snimcich": stav,
                "zmeny_nazvu": zmeny(stav, snimky, "uplny_nazev"),
                "zmeny_sidla": zmeny(stav, snimky, "sidlo"),
                "chybi_ve_snimcich": [d for d in snimky if stav[d] is None],
            }
        # IZO vyskytující se v úkolu – i cizí, kvůli sloučením
        izo_v_ukolu = set()
        for issue in ukol["issues"]:
            for rec in issue.get("records", []):
                if rec.get("data", {}).get("IZO"):
                    izo_v_ukolu.add(str(rec["data"]["IZO"]))
        for rok in ("2025", "2026"):
            for nab in (ukol.get("context_offers", {}).get(rok) or []):
                if nab.get("IZO"):
                    izo_v_ukolu.add(str(nab["IZO"]))
        for izo in sorted(izo_v_ukolu):
            zaznam["izo_napric_subjekty"][izo] = stopa_izo(izo, snimky, podle_izo)

        for issue in ukol["issues"]:
            for rec in issue.get("records", []):
                if rec.get("type") != "offers":
                    continue
                redizo = str(rec["data"].get("REDIZO"))
                stav = digest_subjektu(redizo, snimky, podle_redizo)
                zaznam["nabidky"].append({
                    "issue_id": issue["id"],
                    "redizo": redizo,
                    "izo": rec["data"].get("IZO"),
                    "obor_nazev": rec["data"].get("OBOR - NÁZEV"),
                    "zamereni": rec["data"].get("ZAMĚŘENÍ OBORU"),
                    **klasifikuj_nabidku(rec, stav, snimky),
                })
        vystup["tasks"][ukol["id"]] = zaznam

    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    with open(args.out, "w") as f:
        json.dump(vystup, f, ensure_ascii=False, indent=1)
    print(f"Zapsáno {len(vystup['tasks'])} úkolů do {args.out}")


if __name__ == "__main__":
    main()
