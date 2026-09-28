#!/usr/bin/env python3
"""Pilot Jevu jako kontrolora strojového přepisu kritérií (30 vzorků s ručním verdiktem).

Jev (TypeSafe, `typesafe/jev-1.13`) negeneruje text, jen odpovídá na typované
otázky s pravděpodobností. Podle vlastní dokumentace se hodí vybírat a ověřovat,
ne vytahovat hodnoty, a „is not a calculator“. Proto dostává jen textové
otázky, žádná čísla, a jen sekci PDF k oboru (stejnou jako přepisující model).

Vstup: vzorek z kontroly kvality (docs/podklady/dipsy-kriteria-kontrola-30-2026-09-28.md)
v scratchpadu, výsledek do data/dipsy-kriteria-2026/llm-pilot/jev-kontrola/.

    python3 scripts/dipsy-kriteria-jev-kontrola.py VZOREK.json
    python3 scripts/dipsy-kriteria-jev-kontrola.py --jen-jpz

`--jen-jpz` položí jen otázku `dalsi_body` nad všemi strojovými přepisy
„boduje jen přijímačky“ (pilot: jediná otázka, která chyby odlišila).
"""
from __future__ import annotations

import hashlib
import importlib.util
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import novinky_jev as jev  # noqa: E402

spec = importlib.util.spec_from_file_location("usporny", ROOT / "scripts/dipsy-kriteria-usporny-pilot.py")
up = importlib.util.module_from_spec(spec)
spec.loader.exec_module(up)

OUTPUT = ROOT / "data/dipsy-kriteria-2026/llm-pilot/jev-kontrola"
VERZE = 1
MAX_USD = 0.10

OTAZKY = {
    "dalsi_body": {
        "type": "choice",
        "instructions": (
            "Podle text_pdf: boduje škola u oboru z nabidka při přijímání i něco jiného než prostý součet "
            "jednotné přijímací zkoušky z češtiny a matematiky? Za „něco jiného“ se počítá prospěch ze ZŠ, "
            "školní přijímací zkouška, pohovor, talentová nebo fyzická zkouška, soutěže, certifikáty i vyšší "
            "váha jednoho předmětu. Minima a pravidla při rovnosti bodů se nepočítají."
        ),
        "criteria": {
            "ano": "Pro tento obor se boduje i něco jiného než prostý součet JPZ.",
            "ne": "Pro tento obor se boduje jen prostý součet JPZ.",
            "nejasne": "Z textu to pro tento obor nelze bezpečně určit.",
        },
    },
    "obor": {
        "type": "choice",
        "instructions": (
            "Týkají se pravidla v text_pdf oboru z nabidka (kód KKOV, název, délka studia)? Pozor na společná "
            "PDF: nástavbové studium (kód končí L/5x) mívá jiná pravidla než čtyřleté obory, víceletá gymnázia "
            "jiná než čtyřletá."
        ),
        "criteria": {
            "souhlasi": "Pravidla se týkají tohoto oboru (i jako společná pravidla pro skupinu, do které patří).",
            "nesouhlasi": "Text popisuje hlavně jiný obor nebo jinou formu studia.",
            "nejasne": "Vazba na tento obor není z textu jasná.",
        },
    },
    "uplnost": {
        "type": "noul",
        "instructions": (
            "Uvádí prepis všechny druhy bodovaných složek, které text_pdf pro tento obor boduje (bez ohledu na "
            "přesná čísla)? Odpověz ne, když některá bodovaná složka v prepis chybí, nebo prepis uvádí složku, "
            "kterou text pro tento obor neboduje."
        ),
    },
}


def main() -> None:
    global MAX_USD
    jen_jpz = sys.argv[1] == "--jen-jpz"
    otazky = {"dalsi_body": OTAZKY["dalsi_body"]} if jen_jpz else OTAZKY
    if jen_jpz:
        MAX_USD = 0.30
        data = json.loads((ROOT / "public/kriteria_prijeti_2026.json").read_text(encoding="utf-8"))["data"]
        vzorek = [{"cislo": i, "obor": k} for i, k in enumerate(
            sorted(k for k, o in data.items() if any(p["prepis"] == "strojovy" and p["rezim"] == "pouze_jpz" for p in o["prepisy"])), 1)]
    else:
        vzorek = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    offers = {o["source_id"]: o for o in json.loads(up.pilot.CATALOG.read_text(encoding="utf-8"))["data"]}
    manifest = up.pilot.latest_manifest()
    d = json.loads((ROOT / "public/kriteria_prijeti_2026.json").read_text(encoding="utf-8"))["data"]
    OUTPUT.mkdir(parents=True, exist_ok=True)
    utraceno = 0.0
    for v in vzorek:
        prepis = next(p for p in d[v["obor"]]["prepisy"] if p["prepis"] == "strojovy"
                      and (not jen_jpz or p["rezim"] == "pouze_jpz"))
        sid = prepis["source_id"]
        row, offer = manifest[sid], offers[sid]
        suffix = ".ocr.txt" if row["stav"] == "ocr_text" else ".txt"
        pages = (ROOT / "data/dipsy-kriteria-2026/text" / f"{row['sha256']}{suffix}").read_text(encoding="utf-8").split("\f")
        chosen, _ = up.section.select(offer["kkov"], pages)
        text = "\n\n".join(p for _, p in chosen if p.strip())[:60_000]
        stav = {
            "nabidka": {"kkov": offer["kkov"], "obor": offer.get("obor"), "zamereni": offer.get("zamereni") or "",
                        "delka_studia": offer.get("delka_studia"), "skola": offer.get("nazev")},
            "text_pdf": text,
            "prepis": {"boduje_jen_jpz": prepis["rezim"] == "pouze_jpz",
                       "dalsi_slozky": [s["nazev"] for s in prepis["slozky"]],
                       "body_navic_z_jpz": [s["nazev"] for s in prepis["jpz_navic"]]},
        }
        klic = hashlib.sha256(json.dumps({"s": stav, "o": otazky}, ensure_ascii=False, sort_keys=True).encode()).hexdigest()
        cesta = OUTPUT / f"{sid}-v{VERZE}{'-jpz' if jen_jpz else ''}.json"
        chyby = [json.loads(c.read_text()) for c in OUTPUT.glob(f"{sid}-v{VERZE}*.error*.json")]
        if cesta.exists() and json.loads(cesta.read_text())["zadani_sha256"] == klic:
            vysledek = json.loads(cesta.read_text())
        elif any(c.get("zadani_sha256") == klic for c in chyby):
            # Stejné zadání už jednou vrátilo neúplnou odpověď (účtovanou); neopakovat automaticky.
            print(v["cislo"], "dříve neúplná odpověď, přeskočeno", flush=True)
            continue
        else:
            if utraceno >= MAX_USD:
                raise SystemExit("Dosažen strop pilotu.")
            odpoved = jev.zeptej_se(stav, otazky, pokusu=2)
            if not odpoved:
                # Po vypršení času nevíme, jestli poskytovatel požadavek zpracoval
                # a naúčtoval; další volání by strop nehlídal.
                raise SystemExit(f"{v['cislo']}: bez odpovědi (neznámé účtování), běh zastaven.")
            if odpoved.get("_cena") is None:
                # Neznámá cena = neznámé účtování; strop by jinak nic nehlídal.
                raise SystemExit(f"{v['cislo']}: odpověď bez účtované ceny, běh zastaven.")
            if any(k not in odpoved for k in otazky):
                utraceno += float(odpoved["_cena"])
                # Uložit i s cenou, ať ji rozpočtový přepočet započte.
                # Každý účtovaný pokus zvlášť, nic se nepřepisuje.
                cesta.with_name(f"{cesta.stem}.error-{len(chyby) + 1}.json").write_text(json.dumps(
                    {"cislo": v["cislo"], "source_id": sid, "zadani_sha256": klic, "duvod": "neuplna_odpoved",
                     "cena_usd": odpoved["_cena"]}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
                print(v["cislo"], "neúplná odpověď", flush=True)
                continue
            vysledek = {"cislo": v["cislo"], "obor": v["obor"], "source_id": sid, "zadani_sha256": klic,
                        "sha256": row["sha256"], "verze_prepisu": prepis.get("verze_prepisu"), "znaku": len(text),
                        "cena_usd": odpoved.pop("_cena", None), "odpovedi": odpoved}
            cesta.write_text(json.dumps(vysledek, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            utraceno += float(vysledek["cena_usd"] or 0)
        print(json.dumps({"cislo": v["cislo"], "prepis_jen_jpz": stav["prepis"]["boduje_jen_jpz"],
                          "obor": v["obor"], **{k: vysledek["odpovedi"][k] for k in otazky}}, ensure_ascii=False), flush=True)
    print(f"utraceno {utraceno:.5f} USD", flush=True)


if __name__ == "__main__":
    main()
