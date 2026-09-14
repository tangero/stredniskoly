#!/usr/bin/env python3
"""Rozbor k docs/vrstvy-stranky-oboru-2027.md, revize 2: co znamená „nesplnili podmínky“
a kam se hlásili a dostali uchazeči o obor.

Zdroj: data o jednotlivých uchazečích CERMATu (PZ{rok}_kolo1_uchazeci_prihlasky_vysledky.xlsx)
a souhrny 1. kola (public/souhrny_kolo1.json) pro slovní zařazení obtížnosti.

Výstup: docs/podklady/rozbor-podminek-a-poradi-{rok}.json
  - celostátně: podíl nesplněných podmínek, kolik z nich nemá výsledek JPZ, u kolika oborů
    nesplněné podmínky oddělí hranice v součtu bodů nebo ve slabším testu (odvozená hranice úspěšnosti)
  - ukázkové obory: výsledek uchazečů (sem / výš / níž na přihlášce / nikam), obory výš a níž
    s jejich zařazením obtížnosti, odvozená hranice

    python3 scripts/rozbor-podminek-a-poradi.py --rok 2026 --zdroj data/linka/prace/3GQMK/PZ2026_kolo1_uchazeci_prihlasky_vysledky.xlsx
"""
from __future__ import annotations

import argparse
import collections
import json
from pathlib import Path

import openpyxl

KOREN = Path(__file__).resolve().parent.parent
UKAZKY = ["600007774_79-41-K/81", "600007774_79-41-K/41", "600007774_78-42-M/01"]
MIN_UCHAZECU = 10   # souběh: nezveřejňuje se pod 10 uchazeči (slovník)
MIN_PRO_HRANICI = 5  # odvozená hranice: aspoň 5 nesplněných s výsledkem a 5 soutěžících


def prijat(v) -> bool:
    return str(v).strip() in ("1", "True", "true")


def body(v):
    return None if v is None else float(v) / 2  # procentní skór 0–200 % / 2, předmět 0–100 % / 2


def odvozena_hranice(soutezici: list[tuple], nesplnili: list[tuple]) -> dict | None:
    """Hranice, pod kterou leží všichni nesplnění a nad kterou všichni soutěžící; jinak None."""
    if len(soutezici) < MIN_PRO_HRANICI or len(nesplnili) < MIN_PRO_HRANICI:
        return None
    for nazev, fn in (("soucet", lambda x: x[0]), ("slabsi_test", lambda x: min(v for v in x[1:] if v is not None))):
        try:
            s = [fn(x) for x in soutezici]
            p = [fn(x) for x in nesplnili]
        except ValueError:
            continue
        if max(p) < min(s):
            return {"typ": nazev, "nejvyse_nesplneny": max(p), "nejnize_soutezici": min(s)}
    return {"typ": "nevysvetleno_vysledkem_jpz"}


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--rok", required=True)
    ap.add_argument("--zdroj", type=Path, required=True)
    a = ap.parse_args()

    souhrny = json.loads((KOREN / "public" / "souhrny_kolo1.json").read_text(encoding="utf-8"))["nabidky"]
    po_oboru = collections.defaultdict(list)
    for v in souhrny.values():
        if a.rok in v["roky"]:
            po_oboru[f"{v['redizo']}_{v['kkov']}"].append(v["roky"][a.rok])

    katalog = json.loads((KOREN / "public" / "schools_data.json").read_text(encoding="utf-8"))
    nazvy = {}
    for rok in sorted(katalog, reverse=True):
        for z in katalog[rok]:
            nazvy.setdefault(f"{z['redizo']}_{z['kkov']}", {
                "skola": z.get("nazev_display") or z["nazev"], "obec": z["obec"], "obor": z["obor"], "delka": z.get("delka_studia")})

    def zarazeni(obor: str) -> dict:
        zaznamy = po_oboru.get(obor, [])
        if len(zaznamy) != 1:
            return {"zarazeni": "vice_nabidek" if zaznamy else "bez_souhrnu"}
        r = zaznamy[0]
        return {"zarazeni": r.get("zarazeni_obtiznosti"), "prijati": r.get("prijati"),
                "soutezicich": (r.get("prijati") or 0) + (r.get("capacity_rejected") or 0)}

    wb = openpyxl.load_workbook(a.zdroj, read_only=True)
    radky = wb.worksheets[0].iter_rows(values_only=True)
    ix = {n: i for i, n in enumerate(next(radky))}
    obory = collections.defaultdict(lambda: {"soutezici": [], "nesplnili": [], "nesplnili_bez_jpz": 0})
    kontext = {k: {"uchazecu": 0, "vys": collections.Counter(), "niz": collections.Counter(), "vysledek": collections.Counter()} for k in UKAZKY}
    prihlasek = nesplnilo = 0

    for r in radky:
        vysledek_jpz = (body(r[ix["c_m_procentni_skor"]]), body(r[ix["c_procentni_skor"]]), body(r[ix["m_procentni_skor"]]))
        volby = []
        for k in range(1, 6):
            red, kkov = r[ix[f"ss{k}_redizo"]], r[ix[f"ss{k}_kkov"]]
            if not red or not kkov:
                volby.append(None)
                continue
            obor = f"{red}_{kkov}"
            volby.append((obor, prijat(r[ix[f"ss{k}_prijat"]])))
            duvod = r[ix[f"ss{k}_duvod_neprijeti"]]
            prihlasek += 1
            if volby[-1][1] or duvod == "pro_nedostacujici_kapacitu":
                if vysledek_jpz[0] is not None and None not in vysledek_jpz[1:]:
                    obory[obor]["soutezici"].append(vysledek_jpz)
            elif duvod == "pro_nesplneni_podminek":
                nesplnilo += 1
                if vysledek_jpz[0] is None or None in vysledek_jpz[1:]:
                    obory[obor]["nesplnili_bez_jpz"] += 1
                else:
                    obory[obor]["nesplnili"].append(vysledek_jpz)
        prijat_na = next((i for i, v in enumerate(volby) if v and v[1]), None)
        for i, v in enumerate(volby):
            if not v or v[0] not in kontext:
                continue
            c = kontext[v[0]]
            c["uchazecu"] += 1
            for j, w in enumerate(volby):
                if w and j != i:
                    (c["vys"] if j < i else c["niz"])[w[0]] += 1
            c["vysledek"]["nikam" if prijat_na is None else "sem" if prijat_na == i else "vys" if prijat_na < i else "niz"] += 1

    hranice = collections.Counter()
    for o in obory.values():
        h = odvozena_hranice(o["soutezici"], o["nesplnili"])
        if h:
            hranice[h["typ"]] += 1

    doklad = {
        "zdroj_skriptu": "scripts/rozbor-podminek-a-poradi.py", "rok": a.rok, "zdroj": a.zdroj.name,
        "celostatne": {
            "prihlasek": prihlasek, "nesplnilo_podminky": nesplnilo,
            "nesplnilo_bez_vysledku_jpz": sum(o["nesplnili_bez_jpz"] for o in obory.values()),
            "odvozena_hranice_u_oboru_s_aspon_5_nesplnenymi_a_5_soutezicimi": dict(hranice),
        },
        "ukazky": {},
    }
    for k in UKAZKY:
        c = kontext[k]
        doklad["ukazky"][k] = {
            **nazvy.get(k, {}), **zarazeni(k), "uchazecu": c["uchazecu"], "vysledek_uchazecu": dict(c["vysledek"]),
            "odvozena_hranice": odvozena_hranice(obory[k]["soutezici"], obory[k]["nesplnili"]),
            "nesplnili_bez_vysledku_jpz": obory[k]["nesplnili_bez_jpz"],
            "obory_vys": [{"obor": o, "uchazecu": n, **nazvy.get(o, {}), **zarazeni(o)} for o, n in c["vys"].most_common(6) if n >= MIN_UCHAZECU],
            "obory_niz": [{"obor": o, "uchazecu": n, **nazvy.get(o, {}), **zarazeni(o)} for o, n in c["niz"].most_common(6) if n >= MIN_UCHAZECU],
        }
    vystup = KOREN / "docs" / "podklady" / f"rozbor-podminek-a-poradi-{a.rok}.json"
    vystup.write_text(json.dumps(doklad, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(json.dumps(doklad["celostatne"], ensure_ascii=False))


if __name__ == "__main__":
    main()
