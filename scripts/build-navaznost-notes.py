#!/usr/bin/env python3
"""Poznámky na web o návaznosti nabídek mezi roky 2025 a 2026.

Rešerše ví o každé sporné nabídce víc, než návštěvník webu vidí z čísel. Kde
obor letos chybí, kde je nově vypsaný, kde se jen jinak jmenuje a kde si spojením
s loňskem nejsme jistí — to všechno je lepší napsat než zamlčet.

Poznámky se klíčují základním `REDIZO_KKOV`, na který má stránka školy fallback.
Klíč se zaměřením se záměrně nepoužívá: texty zaměření se mezi ročníky liší
a právě kvůli tomu by se poznámka k nabídce nedostala.

Výstup `public/navaznost_notes.json` přepisuje generátor; ručně psané poznámky
z GitHub Issues zůstávají v `public/school_notes.json` a mají přednost.

Použití:
    python3 scripts/build-navaznost-notes.py
"""
import json
from collections import defaultdict
from datetime import date
from pathlib import Path

VYSLEDKY = Path("docs/podklady/vysledky-navaznosti-2025-2026")
FRONTA = Path("docs/podklady/fronta-dohledavani-2025-2026.json")
VYSTUP = Path("public/navaznost_notes.json")

VYZVA = ("Pokud to víte jinak, dejte nám prosím vědět tlačítkem „Nahlásit chybu“ "
         "dole na stránce. Opravíme to.")
NEJISTOTA = "Spojení s dřívější nabídkou nemáme doložené jednoznačně."
NESROVNATELNE = "Starší výsledky proto nejsou s letošní nabídkou plně srovnatelné."


def veta(f, obor, zamereni_2025, zamereni_2026):
    """Jedna věta o tom, co se s nabídkou mezi roky stalo."""
    typ = f["relationship"]["type"]
    if typ == "closed":
        return (f"Obor {obor} škola pro přijímací řízení 2026 nevypsala. "
                f"V roce 2025 jej v nabídce měla, proto tu najdete starší výsledky.")
    if typ == "new_offer":
        return (f"Obor {obor} je v nabídce nově pro rok 2026. "
                f"Z dřívějších let k němu výsledky nemáme.")
    if typ in ("rename_only", "continuation") and zamereni_2025 and zamereni_2026 \
            and zamereni_2025 != zamereni_2026:
        return (f"Zaměření se v datech jmenuje jinak než loni: „{zamereni_2025}“ v roce 2025 "
                f"a „{zamereni_2026}“ v roce 2026. Jde o tutéž nabídku, starší výsledky "
                f"proto patří k ní.")
    if typ == "continuation":
        return f"Obor {obor} pokračuje z roku 2025 beze změny."
    if typ == "merge":
        return (f"Škola prošla organizační změnou: nabídka {obor} přešla pod tuto školu "
                f"od jiného subjektu. Starší výsledky pocházejí od předchůdce.")
    if typ == "split":
        return (f"Nabídka {obor} se od roku 2026 dělí na víc zaměření. "
                f"Starší výsledky se vztahují ke společnému předchůdci.")
    return None


def main():
    fronta = json.loads(FRONTA.read_text())
    ukoly = {t["id"]: t for t in fronta["tasks"]}
    dnes = date.today().isoformat()

    podle_klice = defaultdict(list)
    for cesta in sorted(VYSLEDKY.glob("*.json")):
        v = json.loads(cesta.read_text())
        t = ukoly[v["task_id"]]
        # nabídky podle otázky, aby šlo dohledat text zaměření obou ročníků
        podle_otazky = {}
        for i in t["issues"]:
            for r in i.get("records", []):
                if r.get("type") == "offers":
                    podle_otazky.setdefault(i["id"], []).append((r["year"], r["data"]))

        for f in v["findings"]:
            zaznamy = [z for oid in f["issue_ids"] for z in podle_otazky.get(oid, [])]
            if not zaznamy:
                continue
            obor = next((d.get("OBOR - NÁZEV") for _, d in zaznamy if d.get("OBOR - NÁZEV")), "")
            kkov = next((d.get("KKOV") for _, d in zaznamy if d.get("KKOV")), None)
            redizo = str(next((d.get("REDIZO") for _, d in zaznamy if d.get("REDIZO")), ""))
            if not kkov or not redizo:
                continue
            z25 = next((str(d.get("ZAMĚŘENÍ OBORU") or "").strip()
                        for r, d in zaznamy if r == 2025), "")
            z26 = next((str(d.get("ZAMĚŘENÍ OBORU") or "").strip()
                        for r, d in zaznamy if r == 2026), "")
            text = veta(f, f"{obor} ({kkov})" if obor else kkov, z25, z26)
            if not text:
                continue
            nejiste = (f["status"] != "potvrzeno"
                       or f["recommended_action"] == "manual_review"
                       or bool(f.get("decisions_required")))
            if nejiste:
                text += " " + NEJISTOTA
            if f["history_comparability"] in ("partially", "not_comparable") \
                    and f["relationship"]["type"] not in ("closed", "new_offer"):
                text += " " + NESROVNATELNE
            podle_klice[f"{redizo}_{kkov}"].append({
                "text": text, "nejiste": nejiste, "task": v["task_id"],
            })

    poznamky = {}
    for klic, polozky in sorted(podle_klice.items()):
        nejiste = any(p["nejiste"] for p in polozky)
        vety = []
        for p in polozky:
            if p["text"] not in vety:
                vety.append(p["text"])
        ulohy = sorted({p["task"] for p in polozky})
        poznamky[klic] = {
            "type": "warning" if nejiste else "info",
            "title": "Nabídka se mezi roky změnila" if not nejiste
                     else "Návaznost na loňskou nabídku není jistá",
            "message": " ".join(vety) + " " + VYZVA,
            "source": "Rešerše návazností 2025–2026, " + ", ".join(ulohy),
            "date": dnes,
        }

    VYSTUP.write_text(json.dumps({
        "meta": {
            "version": "1.0",
            "last_updated": dnes,
            "description": "Poznámky o návaznosti nabídek mezi roky 2025 a 2026. "
                           "Generuje scripts/build-navaznost-notes.py; ruční poznámky "
                           "z GitHub Issues jsou v school_notes.json a mají přednost.",
            "generator": "scripts/build-navaznost-notes.py",
        },
        "notes": poznamky,
    }, ensure_ascii=False, indent=1))
    nejistych = sum(1 for p in poznamky.values() if p["type"] == "warning")
    print(f"{VYSTUP}: {len(poznamky)} poznámek, z toho {nejistych} s přiznanou nejistotou")


if __name__ == "__main__":
    raise SystemExit(main())
