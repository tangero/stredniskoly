#!/usr/bin/env python3
"""Report rozdílů úředních názvů škol mezi dvěma snímky rejstříku MŠMT (#478, K3 a K4).

Po každém převzetí snímku (`stav-datovych-sad.py prepni msmt-rejstrik-snimky …` a
`build-nazvy-oboru-rejstrik.py`) porovná pro každou školu z katalogu
(`public/school_analysis.json`) plný název z dosavadního a nového indexu rejstříku
(`identifikace[redizo].uplny_nazev` v `data/msmt_rejstrik/nazvy-oboru.json`) a název
z ČŠI (`jmeno` ve snímku inspekcí, který zobrazuje registr, sada `csi-inspekce`).

Rozdíl se třídí na
  - `format`: po normalizaci stejný název; liší se jen velikost písmen, právní forma
    („příspěvková organizace“, „s.r.o.“…), adresa (část za čárkou s číslem), obec sídla,
    interpunkce nebo mezery,
  - `vecna`: po normalizaci jiný název (přejmenování, sloučení, nový zřizovatel).

Upozorní i na ruční opravy (`src/data/opravy-nazvu-skol.json`), jejichž název rejstřík
už nese (duplicita, K4). Takový záznam se odstraní, jen když ho nepotřebuje portál, který
bere název z katalogu (viz `_popis` souboru oprav).

Dosavadní index se bere z gitu, aby šel report zopakovat:

    git show <commit před přegenerováním>:data/msmt_rejstrik/nazvy-oboru.json > /tmp/stary-index.json
    python3 scripts/report-nazvy-skol-rejstrik.py --stary /tmp/stary-index.json

Výstup: docs/podklady/nazvy-skol-rejstrik-<staré období>-<nové období>.json
Report nese jen názvy škol a RED IZO, žádné osobní údaje.
"""
from __future__ import annotations

import argparse
import json
import re
from collections import Counter
from pathlib import Path

KOREN = Path(__file__).resolve().parent.parent
REGISTR = KOREN / "public" / "stav_datovych_sad.json"
INDEX = KOREN / "data" / "msmt_rejstrik" / "nazvy-oboru.json"
KATALOG = KOREN / "public" / "school_analysis.json"
OPRAVY = KOREN / "src" / "data" / "opravy-nazvu-skol.json"

# Právní formy a dovětky, které název školy nemění. Delší tvary dřív než kratší.
PRAVNI_FORMY = [
    "státní příspěvková organizace",
    "příspěvková organizace",
    "školská právnická osoba",
    "odštěpný závod",
    "obecně prospěšná společnost",
    "zapsaný ústav",
    "s. r. o.", "s.r.o.", "spol. s r.o.", "o. p. s.", "o.p.s.", "z. ú.", "z.ú.", "a. s.", "a.s.", "v.o.s.",
]


def normalizuj(nazev: str, obec: str = "") -> str:
    """Název bez právní formy, adresy, obce sídla, velikosti písmen a interpunkce."""
    t = " ".join(nazev.lower().split())
    for forma in PRAVNI_FORMY:
        t = t.replace(forma, " ")
    # Adresa: část za čárkou, která nese číslo („Komenského 41“, „Čsl. mládeže 5/9“).
    t = ",".join(c for c in t.split(",") if not re.search(r"\d", c))
    if obec:
        t = t.replace(obec.lower(), " ")
    t = re.sub(r"[\s,.;:–—-]+", " ", t)
    return t.strip()


def porovnej(a: str | None, b: str | None, obec: str) -> str:
    if a is None and b is None:
        return "nema_ani_jeden"
    if a is None:
        return "jen_novy"
    if b is None:
        return "jen_stary"
    if a.strip() == b.strip():
        return "shoda"
    return "format" if normalizuj(a, obec) == normalizuj(b, obec) else "vecna"


def nacti(cesta: Path) -> dict:
    return json.loads(cesta.read_text(encoding="utf-8"))


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    p.add_argument("--stary", type=Path, required=True, help="dosavadní index (git show …:data/msmt_rejstrik/nazvy-oboru.json)")
    p.add_argument("--novy", type=Path, default=INDEX)
    p.add_argument("--vystup", type=Path)
    a = p.parse_args()

    stary, novy = nacti(a.stary), nacti(a.novy)
    registr = nacti(REGISTR)["sady"]
    csi_soubor = registr["csi-inspekce"]["zobrazeno"]["soubor"]
    csi = nacti(KOREN / csi_soubor)
    opravy = nacti(OPRAVY)["skoly"]
    katalog = sorted({k.split("_")[0] for k in nacti(KATALOG)})

    i_stary, i_novy = stary["identifikace"], novy["identifikace"]
    skoly = []
    pocty: dict[str, Counter] = {"rejstrik": Counter(), "csi_vs_novy": Counter()}
    for redizo in katalog:
        n_stary = (i_stary.get(redizo) or {}).get("uplny_nazev")
        n_novy = (i_novy.get(redizo) or {}).get("uplny_nazev")
        n_csi = (csi.get(redizo) or {}).get("jmeno")
        obec = ((novy["skoly"].get(redizo) or stary["skoly"].get(redizo) or ["", ""])[1]) or ""
        rejstrik = porovnej(n_stary, n_novy, obec)
        vs_csi = porovnej(n_novy, n_csi, obec) if n_novy else ("bez_rejstriku" if n_csi else "nema_ani_jeden")
        pocty["rejstrik"][rejstrik] += 1
        pocty["csi_vs_novy"][vs_csi] += 1
        oprava = (opravy.get(redizo) or {}).get("uplny_nazev")
        duplicita = bool(oprava and n_novy and porovnej(oprava, n_novy, obec) in ("shoda", "format"))
        if rejstrik == "shoda" and vs_csi == "shoda" and not oprava:
            continue
        skoly.append({
            "redizo": redizo,
            "rejstrik_stary": n_stary,
            "rejstrik_novy": n_novy,
            "csi_jmeno": n_csi,
            "zmena_v_rejstriku": rejstrik,
            "rozdil_csi_proti_rejstriku": vs_csi,
            **({"rucni_oprava": oprava, "oprava_duplicitni_s_rejstrikem": duplicita} if oprava else {}),
        })

    obdobi_stare, obdobi_nove = stary["meta"]["obdobi"], novy["meta"]["obdobi"]
    vystup = a.vystup or KOREN / "docs" / "podklady" / f"nazvy-skol-rejstrik-{obdobi_stare}-{obdobi_nove}.json"
    report = {
        "meta": {
            "popis": "Rozdíly úředních názvů škol z katalogu mezi dvěma snímky rejstříku MŠMT a proti ČŠI (#478). "
                     "Vypsány jen školy, kde se něco liší nebo mají ruční opravu. Generuje scripts/report-nazvy-skol-rejstrik.py.",
            "stary_snimek": {"obdobi": obdobi_stare, "sha256": stary["meta"].get("sha256")},
            "novy_snimek": {"obdobi": obdobi_nove, "sha256": novy["meta"].get("sha256")},
            "csi_snimek": csi_soubor,
            "skol_v_katalogu": len(katalog),
            "pocty": {k: dict(sorted(v.items())) for k, v in pocty.items()},
            "duplicitni_opravy": sorted(s["redizo"] for s in skoly if s.get("oprava_duplicitni_s_rejstrikem")),
            "vyznam": {
                "shoda": "názvy jsou stejné",
                "format": "po normalizaci stejné: liší se velikost písmen, právní forma, adresa, obec nebo interpunkce",
                "vecna": "po normalizaci jiný název",
                "jen_novy": "škola je jen v novém snímku (nebo jen v rejstříku, ne v ČŠI)",
                "jen_stary": "škola v novém snímku chybí (nebo ji nemá ČŠI)",
                "bez_rejstriku": "škola nemá úřední název v novém indexu, ČŠI ano",
                "nema_ani_jeden": "škola nemá název v žádném z porovnávaných zdrojů",
            },
        },
        "skoly": skoly,
    }
    vystup.parent.mkdir(parents=True, exist_ok=True)
    vystup.write_text(json.dumps(report, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"zapsáno {len(skoly)} škol do {vystup.relative_to(KOREN)}")
    for k, v in report["meta"]["pocty"].items():
        print(f"  {k}: {v}")
    if report["meta"]["duplicitni_opravy"]:
        print(f"  UPOZORNĚNÍ ruční oprava, kterou rejstřík už nese: {', '.join(report['meta']['duplicitni_opravy'])}")


if __name__ == "__main__":
    main()
