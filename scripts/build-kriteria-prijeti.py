#!/usr/bin/env python3
"""
Kritéria přijetí 2026 z PDF v DiPSy pro prototyp pásmového proužku.

Skládá dva zdroje přepisu do jednoho souboru podle oboru (REDIZO_KKOV):
  - ručně přepsané pilotní záznamy (src/data/kriteria-prijeti-2026-pilot.json),
  - strojové přepisy úsporného schématu (data/dipsy-kriteria-2026/llm-pilot/
    usporny-v5/*-v{VERZE}.json), každý po mechanické kontrole citací a
    součtů (scripts/dipsy-kriteria-usporny-kontrola.py).

Přepis se **nepovažuje za ověřený** ani bez mechanického nálezu. Prototyp ho
ukazuje s rokem 2026 a s výhradou, že může obsahovat chybu (rozhodnutí
zadavatele 27. 9. 2026, docs/predani-kriteria-prijeti-2026-09-25.md).
K oborům bez přepisu soubor nese jen to, že PDF kritérií 2026 existuje.

Ukazatel *Podíl přijímaček na bodování* (slovník ukazatelů).
Výstup: public/kriteria_prijeti_2026.json.

    python3 scripts/build-kriteria-prijeti.py
"""
from __future__ import annotations

import importlib.util
import json
from pathlib import Path

KOREN = Path(__file__).resolve().parent.parent
BASE = KOREN / "data" / "dipsy-kriteria-2026"
VERZE = 8
ROK = 2026

spec = importlib.util.spec_from_file_location("kontrola", KOREN / "scripts" / "dipsy-kriteria-usporny-kontrola.py")
kontrola = importlib.util.module_from_spec(spec)
spec.loader.exec_module(kontrola)

CASTI = {"cjl": "čeština", "mat": "matematika"}

# Názvy typů složek z ručního pilotu pro čtenáře.
TYPY = {
    "skolni_test_osp": "školní test studijních předpokladů",
    "pohovor": "pohovor",
    "znamky": "prospěch ze základní školy",
    "znamky_cjl_mat": "známky z češtiny a matematiky",
    "prospech_a_chovani": "prospěch a chování",
    "souteze": "soutěže a olympiády",
}


def podil_jpz(jpz_max: float | None, slozky: list[dict]) -> float | None:
    """Podíl bodů za přijímačky na celku; bez úplných maxim neznámý."""
    if not jpz_max:
        return None
    if any(s.get("max") is None for s in slozky):
        return None
    celkem = jpz_max + sum(s["max"] for s in slozky)
    return round(jpz_max / celkem * 100) if celkem else None


def z_pilotu() -> dict[str, dict]:
    d = json.loads((KOREN / "src" / "data" / "kriteria-prijeti-2026-pilot.json").read_text(encoding="utf-8"))
    vystup = {}
    for z in d["zaznamy"]:
        b = z["bodovani"]
        jpz = b.get("jpz") or {}
        jpz_max = (jpz.get("cjl_max") or 0) + (jpz.get("mat_max") or 0)
        if jpz.get("vaha_pct"):
            jpz_max = jpz_max * jpz["vaha_pct"] / 100
        slozky = [{"nazev": TYPY.get(s["typ"], s["typ"].replace("_", " ")), "max": s.get("max_bodu")} for s in b.get("dalsi_slozky", [])]
        # Deklarovaná váha přijímaček má přednost: vzorec typu 0,75 × JPZ + 0,25 × prospěch
        # z maxim složek nedopočítáme, protože složky mají vlastní přepočet.
        podil = jpz["vaha_pct"] if jpz.get("vaha_pct") else podil_jpz(jpz_max, slozky)
        vystup[z["source_id"]] = {
            "klic": f"{z['redizo']}_{z['kkov']}",
            "zamereni": z.get("zamereni") or "",
            "rezim": b["rezim"],
            "podil_jpz_pct": 100 if b["rezim"] == "pouze_jpz" else podil,
            "slozky": slozky,
            "minima": [f"{CASTI.get(m['cast'], m['cast'])} alespoň {m['body']} bodů" for m in z.get("minima", [])],
            "nejasnosti": z.get("nejasnosti", []),
            "prepis": "rucni",
            "nalezy": [],
        }
    return vystup


def ze_strojoveho_prepisu() -> dict[str, dict]:
    manifest = kontrola.pilot.latest_manifest()
    vystup = {}
    for cesta in sorted((BASE / "llm-pilot" / "usporny-v5").glob(f"*-v{VERZE}.json")):
        r = json.loads(cesta.read_text(encoding="utf-8"))
        radek = manifest[r["source_id"]]
        if r["sha256"] != radek["sha256"] or r["rok"] != ROK or r["kolo"] != 1:
            continue
        pripona = ".ocr.txt" if radek["stav"] == "ocr_text" else ".txt"
        text = (BASE / "text" / f"{radek['sha256']}{pripona}").read_text(encoding="utf-8")
        n = r["navrh"]
        nalezy = kontrola.prover(n, text)
        if n.get("vazba_oboru") not in (None, "jasna"):
            nalezy.append(f"vazba_oboru:{n.get('vazba_oboru')}")
        jpz = n.get("jpz") or {}
        jpz_max = jpz.get("max_po_prepoctu") or ((jpz.get("cjl_max") or 0) + (jpz.get("mat_max") or 0)) or None
        slozky = [{"nazev": s["nazev"], "max": s.get("max_po_prepoctu")} for s in n.get("slozky", [])]
        podil = 100 if n["rezim"] == "pouze_jpz" else (jpz.get("deklarovany_podil_pct") or podil_jpz(jpz_max, slozky))
        vystup[r["source_id"]] = {
            "klic": f"{radek['redizo']}_{radek['kkov']}",
            "zamereni": radek.get("zamereni") or "",
            "rezim": n["rezim"],
            "podil_jpz_pct": round(podil) if podil is not None else None,
            "slozky": slozky,
            "minima": [m if isinstance(m, str) else json.dumps(m, ensure_ascii=False) for m in n.get("minima", [])],
            "nejasnosti": n.get("nejasnosti", []),
            "prepis": "strojovy",
            "nalezy": nalezy,
        }
    return vystup


def main() -> None:
    prepisy = ze_strojoveho_prepisu()
    prepisy.update(z_pilotu())  # ruční přepis má přednost
    obory: dict[str, dict] = {}
    for radek in kontrola.pilot.latest_manifest().values():
        if radek.get("rok") != ROK or radek.get("stav") not in ("text", "ocr_text"):
            continue
        klic = f"{radek['redizo']}_{radek['kkov']}"
        obory.setdefault(klic, {"pdf": True, "prepisy": []})
    for sid, p in prepisy.items():
        klic = p.pop("klic")
        obory.setdefault(klic, {"pdf": True, "prepisy": []})["prepisy"].append({"source_id": sid, **p})
    vystup = {
        "rok": ROK,
        "kolo": 1,
        "zdroj": "PDF kritérií přijímacího řízení v DiPSy, 1. kolo 2026",
        "stav": "pracovní přepis, neověřený; může obsahovat chybu",
        "pokryti": {"oboru_s_pdf": len(obory), "oboru_s_prepisem": sum(1 for o in obory.values() if o["prepisy"])},
        "data": obory,
    }
    cesta = KOREN / "public" / f"kriteria_prijeti_{ROK}.json"
    cesta.write_text(json.dumps(vystup, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"{vystup['pokryti']} → {cesta.relative_to(KOREN)} ({cesta.stat().st_size // 1024} kB)")


if __name__ == "__main__":
    main()
