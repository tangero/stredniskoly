#!/usr/bin/env python3
"""Doplnění ročníku 2026 do public/schools_data.json.

Katalog dosud končil rokem 2025 a kód z něj četl poslední ročník jako aktuální
nabídku. Letošní nabídka přitom leží v samostatných souborech a na stránku se
dostane jen při shodě identifikátoru, takže u nabídek s přepsaným zaměřením
chyběla. Ročník 2026 proto vzniká přímo v katalogu.

Pravidla:

- Identifikátor se bere ze stabilní mapy (scripts/build-offer-mapping-2026.py),
  aby adresy stránek zůstaly beze změny. Nová nabídka dostane vlastní klíč.
- Údaje o škole nese soubor přihlášek; co v něm není a nejde spočítat
  (okres, ORP, městská část, zřizovatel), se přebírá z loňského záznamu téže
  nabídky. Nedohledaný údaj zůstává prázdný, nedopočítává se.
- Čísla ročníku pocházejí výhradně z dat 2026. Hodnoty, které pro rok 2026
  neexistují (hranice přijetí, kohorty, minima z JPZ), se nevymýšlejí a
  v záznamu nejsou.
- Nabídka, kterou škola letos nevypsala, se do ročníku přenáší z roku 2025
  s příznakem `nevypsano_2026` a s vlastním polem `rok`, aby stránka nezanikla
  a přitom nevydávala loňská čísla za letošní.

Použití:
    python3 scripts/build-catalogue-2026.py
"""
import json
import re
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
KATALOG = ROOT / "public/schools_data.json"
PRIHLASKY = ROOT / "public/applications_2026.json"
VYSLEDKY = ROOT / "public/cermat_results_2026.json"
MAPA = ROOT / "public/offer_mapping_2026.json"

# Údaje o škole, které přihlášky nenesou a nelze je spočítat
Z_LONSKA = ("nazev_display", "okres", "orp", "mestska_cast", "zrizovatel")

# Ukazatele, které se pro rok 2026 nezveřejňují. Nechávají se v záznamu, aby
# stránky o ně nepřišly, ale jsou to loňské hodnoty: záznam proto nese
# `historicka_data_rok`, aby je nešlo vydávat za letošní.
HISTORICKE = ("min_body", "cohorts", "cj_min", "ma_min", "cj_at_jpz_min",
              "ma_at_jpz_min", "jpz_min_actual", "jpz_prumer_actual", "jpz_median",
              "prihlasky_priority", "prijati_priority")


def normalizuj_klic(ident: str) -> str:
    """Klíč bez diakritiky a interpunkce, jak jej porovnává web (school-key.ts)."""
    casti = ident.split("_")
    redizo = casti[0]
    kkov = casti[1] if len(casti) > 1 else ""
    z = unicodedata.normalize("NFKD", "_".join(casti[2:]))
    z = "".join(c for c in z if not unicodedata.combining(c))
    z = re.sub(r"[^a-zA-Z0-9]+", "_", z).strip("_").lower()
    return f"{redizo}_{kkov}" + (f"_{z}" if z else "")


def adresa(z):
    casti = [z.get("ulice") or "", z.get("obec") or "", z.get("psc") or ""]
    return ", ".join(c for c in casti if c)


def main():
    katalog = json.loads(KATALOG.read_text())
    rok2025 = katalog["2025"]
    prihlasky = json.loads(PRIHLASKY.read_text())["data"]
    vysledky = json.loads(VYSLEDKY.read_text())
    mapa = json.loads(MAPA.read_text())["mapping"]

    podle_id_2025 = {z["id"]: z for z in rok2025}
    # Identifikátory se mezi ročníky liší i pouhou diakritikou nebo velikostí
    # písmen. Bez tohoto kroku by nabídka dostala nový klíč, vznikla by nová
    # stránka a loňský záznam by se navíc přenesl jako „letos nevypsáno“.
    podle_normalizovaneho_2025 = {normalizuj_klic(z["id"]): z for z in rok2025}
    # Zřizovatel, okres, ORP i městská část patří škole, ne jednotlivé nabídce.
    # Stačí tedy kterýkoli loňský záznam téhož REDIZO; jinak by u nové nabídky
    # existující školy zbytečně chyběly.
    podle_redizo_2025 = {}
    for z in rok2025:
        podle_redizo_2025.setdefault(z["redizo"], z)
    vysledky_podle_source = {v.get("source_id"): v for v in vysledky.values()
                             if v.get("source_id")}

    rok2026 = []
    pouzite_2025 = set()
    for z in prihlasky:
        ident = mapa.get(z["id"], {}).get("katalog_id")
        if not ident:
            shoda = podle_normalizovaneho_2025.get(normalizuj_klic(z["id"]))
            ident = shoda["id"] if shoda else z["id"]
        lonsky = podle_id_2025.get(ident)
        if lonsky:
            pouzite_2025.add(ident)
        vysledek = vysledky_podle_source.get(z.get("source_id")) or {}
        kontext = z.get("admission_context") or {}

        zaznam = {
            "id": ident,
            "redizo": z["redizo"],
            "nazev": z["nazev"],
            "nazev_display": (lonsky or {}).get("nazev_display")
                             or (f"{z['nazev']}, {z['ulice']}" if z.get("ulice") else z["nazev"]),
            "adresa": adresa(z),
            "adresa_plna": adresa(z),
            "ulice": z.get("ulice") or "",
            "obec": z.get("obec") or "",
            "psc": z.get("psc") or "",
            "kraj_kod": z.get("kraj_kod") or "",
            "kraj": z.get("kraj") or "",
            "obor": z.get("obor") or "",
            "zamereni": z.get("zamereni") or "",
            "kkov": z.get("kkov") or "",
            "typ": z.get("typ") or "",
            "delka_studia": z.get("delka_studia"),
            "kapacita": z.get("kapacita") or 0,
            "prihlasky": z.get("prihlasky") or 0,
            "prijati": kontext.get("accepted") if kontext.get("accepted") is not None
                       else vysledek.get("prijati"),
            "prumer_body": vysledek.get("cj_ma_prijati"),
            "cj_prumer": vysledek.get("cj_prijati"),
            "ma_prumer": vysledek.get("ma_prijati"),
            "prvni_priority": z.get("pp"),
            "izo": z.get("izo"),
            "forma": z.get("forma"),
            "jazyk": z.get("jazyk"),
            "rok": 2026,
        }
        skola_lonsky = lonsky or podle_redizo_2025.get(z["redizo"])
        for pole in Z_LONSKA:
            if not zaznam.get(pole) and skola_lonsky and skola_lonsky.get(pole) is not None:
                zaznam[pole] = skola_lonsky[pole]

        kapacita = zaznam["kapacita"]
        zaznam["index_poptavky"] = round(zaznam["prihlasky"] / kapacita, 2) if kapacita else 0

        if lonsky:
            zdedeno = False
            for pole in HISTORICKE:
                if lonsky.get(pole) is not None:
                    zaznam[pole] = lonsky[pole]
                    zdedeno = True
            if zdedeno:
                zaznam["historicka_data_rok"] = 2025
        if z["id"] != ident:
            zaznam["id_2026"] = z["id"]
        rok2026.append(zaznam)

    # Nabídky, které škola letos nevypsala: stránka zůstává, čísla zůstávají loňská
    prenesene = 0
    for z in rok2025:
        if z["id"] in pouzite_2025:
            continue
        zaznam = dict(z)
        zaznam["nevypsano_2026"] = True
        rok2026.append(zaznam)
        prenesene += 1

    katalog["2026"] = rok2026
    KATALOG.write_text(json.dumps(katalog, ensure_ascii=False))

    chybi = {z["id"] for z in rok2025} - {z["id"] for z in rok2026}
    print(f"Ročník 2026: {len(rok2026)} záznamů")
    print(f"  z toho letošních nabídek: {len(prihlasky)}")
    print(f"  přenesených z roku 2025 (letos nevypsáno): {prenesene}")
    print(f"  s výsledky 2026: {sum(1 for z in rok2026 if z.get('prumer_body') is not None)}")
    print(f"Stránek z roku 2025 bez záznamu v roce 2026: {len(chybi)}")
    if chybi:
        print("  POZOR, tyto adresy by zanikly:", sorted(chybi)[:5])


if __name__ == "__main__":
    raise SystemExit(main())
