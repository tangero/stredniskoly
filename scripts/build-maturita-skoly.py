#!/usr/bin/env python3
"""Maturitní výsledky škol pro web: public/maturita_skoly.json.

Zdroj: CERMAT, agregované výsledky společné části maturitní zkoušky, jarní období,
soubory MZ{rok}j_SC_skolobory.xlsx. Návrh: docs/maturitni-vysledky-a-kvalita-skoly-2027.md,
názvy polí podle kontraktu v §4 a slovníku ukazatelů, oddíl 5.

    python3 scripts/build-maturita-skoly.py \
        --soubor 2025=/cesta/MZ2025j_SC_skolobory.xlsx --soubor 2026=/cesta/MZ2026j_SC_skolobory.xlsx \
        [--zaklad public/maturita_skoly.json] --vystup public/maturita_skoly.json

Pravidla:
- jen úrovně `redizo` a `redizo_smo16`, jen společná část, čeština a matematika;
- od roku 2021, dřívější společná část je na jiné škále (návrh §2.1);
- pod 10 konajícími jen počty, bez podílů a průměrů; 10 až 29 s příznakem malého vzorku (návrh §7);
- zařazení proti skupině oborů jen u češtiny a jen při aspoň 10 konajících: interval průměrného
  skóru ±1,96 směrodatné chyby proti mediánu škol téže skupiny, roku a období (návrh §5.2);
- nula, chybějící údaj a nezveřejněná hodnota („-“) jsou různé stavy; text se nikdy nepřevádí na 0.
"""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import math
import statistics
import sys
import unicodedata
from pathlib import Path

import openpyxl

PRVNI_ROK = 2021
JEN_POCTY_POD = 10
UPOZORNENI_POD = 30
REFERENCE_MIN_KONALO = 10
Z_95 = 1.96
URL = "https://data.cermat.cz/files/files/MZ/agregovana_data_skoly/MZ{rok}j_SC_skolobory.xlsx"

BLOKY = {"spolecna_cast": "SPOLECNA CAST MZ CELKEM", "cj": "CESKY JAZYK", "ma": "MATEMATIKA"}
# (název sloupce po odstranění diakritiky, pole kontraktu). Přesná shoda názvu: sloupec
# „SMĚRODATNÁ ODCHYLKA % SKÓRU“ se tak nikdy nezamění s percentilem (past z §9.1 návrhu).
SLOUPCE = {
    "PRIHLASENI": "registered",
    "KONALI": "took",
    "USPELI": "passed",
    "NEUSPELI": "failed",
    "NEKONALI": "absent",
    "PODIL USPESNYCH (%)": "passRate",
    "HRUBA NEUSPESNOST (%)": "grossFailureRate",
    "NEUCAST (%)": "nonParticipationRate",
    "PRUMERNY % SKOR": "averagePercentScore",
    "SMERODATNA ODCHYLKA % SKORU": "standardDeviation",
    "PRUMERNE PERCENTILOVE UMISTENI": "averagePercentile",
    "PODIL VOLBY PREDMETU (%)": "subjectChoiceShare",
}
POCTY = ("registered", "took", "passed", "failed", "absent")
# Podíl volby předmětu počítá CERMAT z přihlášených k maturitě, ne z konajících předmět; skrývat ho u malého
# počtu konajících matematiku by schovalo údaj, který je zveřejněný za celý ročník.
VZDY = POCTY + ("subjectChoiceShare",)
POVINNE = {("CESKY JAZYK", "KONALI"), ("CESKY JAZYK", "PRUMERNY % SKOR"), ("CESKY JAZYK", "SMERODATNA ODCHYLKA % SKORU"),
           ("CESKY JAZYK", "PRUMERNE PERCENTILOVE UMISTENI"), ("SPOLECNA CAST MZ CELKEM", "PODIL USPESNYCH (%)")}


def bez_diakritiky(text) -> str:
    text = unicodedata.normalize("NFKD", str(text or ""))
    return " ".join("".join(c for c in text if not unicodedata.combining(c)).upper().replace("–", "-").split())


def cislo(hodnota):
    """Číslo, nebo None pro chybějící a nezveřejněnou hodnotu. Nikdy 0 z textu."""
    if hodnota is None or isinstance(hodnota, bool):
        return None
    if isinstance(hodnota, (int, float)):
        return float(hodnota) if math.isfinite(hodnota) else None
    text = str(hodnota).strip().replace(",", ".").replace("%", "")
    try:
        return float(text)
    except ValueError:
        return None


def zaokrouhli(pole: str, hodnota: float | None):
    if hodnota is None:
        return None
    return int(round(hodnota)) if pole in POCTY else round(hodnota, 2)


def sha256(cesta: Path) -> str:
    h = hashlib.sha256()
    with open(cesta, "rb") as f:
        while blok := f.read(1 << 20):
            h.update(blok)
    return h.hexdigest()


def nacti(cesta: Path, rok: int) -> tuple[list[dict], dict]:
    """Řádky úrovní redizo a redizo_smo16 jako {trideni, redizo, nazev, smo16, smo16_nazev, predmety}."""
    wb = openpyxl.load_workbook(cesta, read_only=True)
    ws = wb[str(rok)] if str(rok) in wb.sheetnames else wb.worksheets[0]
    radky = ws.iter_rows(values_only=True)
    predchozi = None
    for radek in radky:
        if any(bez_diakritiky(v) == "TRIDENI" for v in radek):
            hlavicka2 = radek
            hlavicka1 = predchozi or [None] * len(radek)
            break
        predchozi = radek
    else:
        raise ValueError(f"{cesta.name}: nenalezena hlavička se sloupcem TŘÍDĚNÍ")

    blok = None
    mapa: dict[tuple[str, str], int] = {}
    ident: dict[str, int] = {}
    for i, (h1, h2) in enumerate(zip(hlavicka1, hlavicka2)):
        n1, n2 = bez_diakritiky(h1), bez_diakritiky(h2)
        if n1 and "VYSLEDKY" not in n1 and not n1.isdigit():
            blok = n1
        if blok is None:
            ident[n2] = i
        else:
            mapa[(blok, n2)] = i
    chybi = sorted(POVINNE - set(mapa)) + [s for s in ("TRIDENI", "REDIZO", "NAZEV SKOLY", "SMO16") if s not in ident]
    if chybi:
        raise ValueError(f"{cesta.name}: chybí povinné sloupce {chybi}; nalezené bloky {sorted({b for b, _ in mapa})}")

    vystup = []
    pocty = {"redizo": 0, "redizo_smo16": 0}
    for radek in radky:
        trideni = str(radek[ident["TRIDENI"]] or "").strip()
        if trideni not in pocty:
            continue
        pocty[trideni] += 1
        predmety = {}
        for klic, nazev_bloku in BLOKY.items():
            zaznam = {}
            for sloupec, pole in SLOUPCE.items():
                idx = mapa.get((nazev_bloku, sloupec))
                if idx is not None:
                    zaznam[pole] = cislo(radek[idx])
            predmety[klic] = zaznam
        vystup.append({
            "trideni": trideni,
            "redizo": str(radek[ident["REDIZO"]]).strip(),
            "nazev": str(radek[ident["NAZEV SKOLY"]] or "").strip(),
            "smo16": "CELKEM" if trideni == "redizo" else str(radek[ident["SMO16"]]).strip(),
            "smo16_nazev": str(radek[ident["SMO16 - NAZEV"]]).strip() if "SMO16 - NAZEV" in ident else None,
            "predmety": predmety,
        })
    return vystup, pocty


def omez(zaznam: dict) -> dict:
    """Meze zveřejnění: pod 10 konajícími jen počty, 10 až 29 s příznakem."""
    took = zaznam.get("took")
    vystup = {pole: zaokrouhli(pole, zaznam.get(pole)) for pole in SLOUPCE.values() if pole in zaznam}
    if took is None or took <= 0:
        vystup["quality"] = "unavailable"
        for pole in list(vystup):
            if pole not in VZDY and pole != "quality":
                vystup[pole] = None
    elif took < JEN_POCTY_POD:
        vystup["quality"] = "counts_only"
        for pole in list(vystup):
            if pole not in VZDY and pole != "quality":
                vystup[pole] = None
    elif took < UPOZORNENI_POD:
        vystup["quality"] = "small_sample"
    else:
        vystup["quality"] = "complete"
    # Chybějící hodnota se do souboru nezapisuje; čtenář ji pozná podle chybějícího klíče.
    return {k: v for k, v in vystup.items() if v is not None and v != []}


def zpracuj_rok(radky: list[dict], rok: int) -> tuple[dict, dict]:
    """Vrátí (skupiny roku, školy roku)."""
    skupiny: dict[str, dict] = {}
    podle_skupiny: dict[str, list[dict]] = {}
    for r in radky:
        if r["trideni"] != "redizo_smo16":
            continue
        cj = r["predmety"]["cj"]
        if (cj.get("took") or 0) >= REFERENCE_MIN_KONALO and cj.get("averagePercentScore") is not None:
            podle_skupiny.setdefault(r["smo16"], []).append(r)
    for smo, clenove in podle_skupiny.items():
        skory = [c["predmety"]["cj"]["averagePercentScore"] for c in clenove]
        percentily = [c["predmety"]["cj"]["averagePercentile"] for c in clenove if c["predmety"]["cj"].get("averagePercentile") is not None]
        uspesnost = [c["predmety"]["spolecna_cast"]["passRate"] for c in clenove if c["predmety"]["spolecna_cast"].get("passRate") is not None]
        skupiny[smo] = {
            "nazev": clenove[0]["smo16_nazev"],
            "schools": len(clenove),
            "medianPercentScore": round(statistics.median(skory), 2),
            "medianPercentile": round(statistics.median(percentily), 2) if percentily else None,
            "medianPassRate": round(statistics.median(uspesnost), 2) if uspesnost else None,
            "percentiles": sorted(round(p, 1) for p in percentily),
        }

    skoly: dict[str, dict] = {}
    for r in radky:
        skola = skoly.setdefault(r["redizo"], {"nazev": r["nazev"], "skupiny": {}})
        zaznam = {k: omez(v) for k, v in r["predmety"].items()}
        cj = r["predmety"]["cj"]
        ref = skupiny.get(r["smo16"])
        if r["trideni"] == "redizo_smo16" and ref and (cj.get("took") or 0) >= REFERENCE_MIN_KONALO \
                and cj.get("averagePercentScore") is not None and cj.get("standardDeviation") is not None:
            se = cj["standardDeviation"] / math.sqrt(cj["took"])
            dolni, horni = cj["averagePercentScore"] - Z_95 * se, cj["averagePercentScore"] + Z_95 * se
            stav = "above" if dolni > ref["medianPercentScore"] else "below" if horni < ref["medianPercentScore"] else "indistinguishable"
            zaznam["cj"]["groupComparison"] = {
                "state": stav, "interval": [round(dolni, 2), round(horni, 2)],
                "medianPercentScore": ref["medianPercentScore"], "schools": ref["schools"],
            }
        skola["skupiny"][r["smo16"]] = zaznam
    return skupiny, skoly


def sestav(soubory: dict[int, Path], zaklad: dict | None) -> dict:
    vystup = zaklad or {"meta": {}, "skupiny": {}, "skoly": {}}
    zdroje = {str(z["rok"]): z for z in vystup["meta"].get("zdroje", [])}
    for rok, cesta in sorted(soubory.items()):
        if rok < PRVNI_ROK:
            raise ValueError(f"rok {rok}: společná část před rokem {PRVNI_ROK} je na jiné škále")
        radky, pocty = nacti(cesta, rok)
        if not pocty["redizo"] or not pocty["redizo_smo16"]:
            raise ValueError(f"rok {rok}: soubor nemá řádky škol ({pocty})")
        skupiny, skoly = zpracuj_rok(radky, rok)
        if not skupiny:
            raise ValueError(f"rok {rok}: žádná skupina oborů nemá referenci; zkontroluj sloupce češtiny")
        vystup["skupiny"][str(rok)] = skupiny
        for redizo, skola in vystup["skoly"].items():
            skola["roky"].pop(str(rok), None)
        for redizo, s in skoly.items():
            cil = vystup["skoly"].setdefault(redizo, {"nazev": s["nazev"], "roky": {}})
            cil["nazev"] = s["nazev"]
            cil["roky"][str(rok)] = s["skupiny"]
        zdroje[str(rok)] = {"rok": rok, "url": URL.format(rok=rok), "soubor": cesta.name, "sha256": sha256(cesta),
                            "radku_redizo": pocty["redizo"], "radku_redizo_smo16": pocty["redizo_smo16"]}
    vystup["skoly"] = {k: v for k, v in vystup["skoly"].items() if v["roky"]}
    roky = sorted(int(r) for r in vystup["skupiny"])
    vystup["meta"] = {
        "popis": "Maturitní výsledky společné části, jarní období, školy a školy ve skupině oborů (SMO16).",
        "obdobi": "jaro",
        "roky": roky,
        "nejnovejsi_rok": roky[-1],
        "vytvoreno": dt.date.today().isoformat(),
        "zdroje": [zdroje[str(r)] for r in roky if str(r) in zdroje],
        "kvalita": {"complete": f"aspoň {UPOZORNENI_POD} konajících", "small_sample": f"{JEN_POCTY_POD} až {UPOZORNENI_POD - 1} konajících, zobrazit s upozorněním",
                    "counts_only": f"méně než {JEN_POCTY_POD} konajících, zveřejněny jen počty a podíl volby předmětu", "unavailable": "nikdo nekonal nebo údaj chybí"},
        "meze": {"jen_pocty_pod": JEN_POCTY_POD, "upozorneni_pod": UPOZORNENI_POD,
                 "reference_min_konalo": REFERENCE_MIN_KONALO, "z": Z_95},
        "dokumentace": "docs/maturitni-vysledky-a-kvalita-skoly-2027.md; docs/slovnik-ukazatelu.md, oddíl 5",
    }
    return vystup


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--soubor", action="append", required=True, help="ROK=cesta k MZ{rok}j_SC_skolobory.xlsx")
    ap.add_argument("--zaklad", help="stávající výstup; roky, které nejsou v --soubor, zůstanou")
    ap.add_argument("--vystup", required=True)
    a = ap.parse_args()
    soubory = {}
    for s in a.soubor:
        rok, _, cesta = s.partition("=")
        soubory[int(rok)] = Path(cesta)
    zaklad = None
    if a.zaklad and Path(a.zaklad).exists():
        zaklad = json.loads(Path(a.zaklad).read_text(encoding="utf-8"))
    vystup = sestav(soubory, zaklad)
    Path(a.vystup).parent.mkdir(parents=True, exist_ok=True)
    Path(a.vystup).write_text(json.dumps(vystup, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    posledni = str(vystup["meta"]["nejnovejsi_rok"])
    se_zarazenim = sum(1 for s in vystup["skoly"].values() for sk in s["roky"].get(posledni, {}).values()
                       if sk.get("cj", {}).get("groupComparison"))
    print(f"roky {vystup['meta']['roky']}, škol {len(vystup['skoly'])}, v roce {posledni} se zařazením proti skupině {se_zarazenim}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
