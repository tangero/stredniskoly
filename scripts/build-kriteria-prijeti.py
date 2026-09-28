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
import re
from pathlib import Path

KOREN = Path(__file__).resolve().parent.parent
BASE = KOREN / "data" / "dipsy-kriteria-2026"
VERZE = 8
ROK = 2026

spec = importlib.util.spec_from_file_location("kontrola", KOREN / "scripts" / "dipsy-kriteria-usporny-kontrola.py")
kontrola = importlib.util.module_from_spec(spec)
spec.loader.exec_module(kontrola)

CASTI = {"cjl": "čeština", "mat": "matematika"}

# Složka, která je ve skutečnosti jednotnou zkouškou (model ji občas uvede
# vedle JPZ znovu, nebo tak zapíše vážení předmětu, u Dopplera „matematika
# × 0,5“). Školní zkouška, pohovor a talentovka se sem nepočítají.
RE_JPZ = re.compile(r"didaktick|cermat|jednotn\w* přijímac|\bJPZ\b|test\w* z (matematik|česk)|přijímací zkoušk\w* z (matematik|česk)", re.I)
RE_SKOLNI = re.compile(r"školní|školské|vlastní|talent|pohovor|ústní", re.I)


def je_jpz(nazev: str) -> bool:
    return bool(RE_JPZ.search(nazev)) and not RE_SKOLNI.search(nazev)


def rozdel_slozky(slozky: list[dict], jpz: dict, jpz_max: float | None) -> tuple[list[dict], list[dict]]:
    """Rozdělí složky na další kritéria a na přijímačky zapsané jako složka.

    Přijímačky mezi složkami mohou znamenat bonus (matematika × 0,5 navíc),
    přepočtený celek (0,7 × JPZ), rozpis na části nebo váhu pořadí (čeština
    0,6 a matematika 0,4). Význam jejich čísel z přepisu spolehlivě neurčíme
    (code review PR #182, kola 6 a 7), proto se jen odliší od dalších kritérií
    a na webu se ukážou bez čísel. Vypustí se jen část, která doslova opakuje
    maximum češtiny, matematiky nebo celé JPZ.
    """
    opakovani = {v for v in (jpz.get("cjl_max"), jpz.get("mat_max"), jpz_max) if v}
    dalsi = [s for s in slozky if not je_jpz(s["nazev"])]
    jpz_slozky = [s for s in slozky if je_jpz(s["nazev"])]
    stejne = len({s.get("max") for s in jpz_slozky}) == 1
    if jpz_slozky and stejne and jpz_max and abs(sum(s.get("max") or 0 for s in jpz_slozky) - jpz_max) < 0.01:
        return dalsi, []  # stejné části, součet = celek: jen rozpis celku
    return dalsi, [{"nazev": s["nazev"], "max": None} for s in jpz_slozky if s.get("max") not in opakovani]


def citelne_minimum(m) -> str:
    """Minimum jako věta: přepis ho nese buď jako text, nebo jako objekt s popisem."""
    if isinstance(m, dict):
        popis = str(m.get("popis") or "").strip()
        citace = str((m.get("doklad") or {}).get("citace") or "").strip()
        # Model popis často zkrátí na „celkem, matematika“ bez hodnoty, číslo
        # zůstane jen v citaci z PDF (kontrola 30 vzorků 28. 9. 2026: 1 695 minim).
        if not re.search(r"\d", popis) and re.search(r"\d", citace):
            return f"„{citace}“"
        return popis or citace
    return str(m).strip()

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
    # Srážky (záporné maximum, např. za sníženou známku z chování) body nepřidávají.
    celkem = jpz_max + sum(s["max"] for s in slozky if s["max"] > 0)
    return round(jpz_max / celkem * 100) if celkem else None


def z_pilotu() -> dict[str, dict]:
    d = json.loads((KOREN / "src" / "data" / "kriteria-prijeti-2026-pilot.json").read_text(encoding="utf-8"))
    vystup = {}
    manifest = kontrola.pilot.latest_manifest()
    for z in d["zaznamy"]:
        radek = manifest.get(z["source_id"])
        if not radek or z["zdroj"].get("sha256") != radek["sha256"] or z["rok"] != ROK or z["kolo"] != 1:
            # Ruční přepis starého PDF nesmí přebít platný strojový přepis nového.
            print(f"Ruční přepis {z['source_id']} neodpovídá dnešnímu PDF, vynechán.")
            continue
        b = z["bodovani"]
        jpz = b.get("jpz") or {}
        # Váhy v ručním přepisu jsou koeficienty vzorce („0,75 × JPZ + 0,25 × prospěch“),
        # ne podíly: maximum složky po přepočtu = surové maximum × váha.
        def po_vaze(maximum, vaha):
            if maximum is None:
                return None
            return round(maximum * vaha / 100, 2) if vaha is not None else maximum
        jpz_max = po_vaze((jpz.get("cjl_max") or 0) + (jpz.get("mat_max") or 0), jpz.get("vaha_pct"))
        slozky = [{"nazev": TYPY.get(s["typ"], s["typ"].replace("_", " ")),
                   "max": po_vaze(s.get("max_bodu"), s.get("vaha_pct"))} for s in b.get("dalsi_slozky", [])]
        podil = 100 if b["rezim"] == "pouze_jpz" else podil_jpz(jpz_max, slozky)
        vystup[z["source_id"]] = {
            "klic": f"{z['redizo']}_{z['kkov']}",
            "zamereni": z.get("zamereni") or "",
            "rezim": b["rezim"],
            "podil_jpz_pct": podil,
            "slozky": slozky,
            "jpz_navic": [],
            "minima": [f"{CASTI.get(m['cast'], m['cast'])} alespoň {m['body']} bodů" for m in z.get("minima", [])],
            "nejasnosti": z.get("nejasnosti", []),
            "prepis": "rucni",
            "nalezy": [],
            "sha256": radek["sha256"],
            "verze_prepisu": "rucni",
        }
    return vystup


def ze_strojoveho_prepisu() -> dict[str, dict]:
    manifest = kontrola.pilot.latest_manifest()
    vystup = {}
    slozka = BASE / "llm-pilot" / "usporny-v5"
    # Verze 9 = přepis z celého PDF (výchozí od 28. 9. 2026), má přednost před 8.
    # Nabídka může mít jen jednu z nich, proto sjednocení identifikátorů.
    ids = {c.name.rsplit("-v", 1)[0] for v in (VERZE, 9) for c in slozka.glob(f"*-v{v}.json")}
    for sid in sorted(ids):
        radek = manifest.get(sid)
        if radek is None:
            continue
        # První kandidát (9, pak 8), který odpovídá dnešnímu PDF, roku a kolu.
        r = None
        for cesta in (slozka / f"{sid}-v9.json", slozka / f"{sid}-v{VERZE}.json"):
            if cesta.exists():
                kandidat = json.loads(cesta.read_text(encoding="utf-8"))
                if kandidat["sha256"] == radek["sha256"] and kandidat["rok"] == ROK and kandidat["kolo"] == 1:
                    r = kandidat
                    break
        if r is None:
            continue
        pripona = ".ocr.txt" if radek["stav"] == "ocr_text" else ".txt"
        text = (BASE / "text" / f"{radek['sha256']}{pripona}").read_text(encoding="utf-8")
        n = r["navrh"]
        nalezy = kontrola.prover(n, text)
        if n.get("vazba_oboru") not in (None, "jasna"):
            nalezy.append(f"vazba_oboru:{n.get('vazba_oboru')}")
        jpz = n.get("jpz") or {}
        jpz_max = jpz.get("max_po_prepoctu") or ((jpz.get("cjl_max") or 0) + (jpz.get("mat_max") or 0)) or None
        vsechny = [{"nazev": s["nazev"].replace("_", " "), "max": s.get("max_po_prepoctu")} for s in n.get("slozky", [])]
        slozky, jpz_navic = rozdel_slozky(vsechny, jpz, jpz_max)
        if jpz_navic or len(slozky) < len(vsechny):
            # Přijímačky zapsané jako složka: podíl z maxim nedopočítávat. Platí jen
            # výslovně deklarovaný, bez dalších kritérií 100 %, jinak neznámý.
            podil = jpz.get("deklarovany_podil_pct") or (100 if not slozky else None)
        else:
            podil = 100 if n["rezim"] == "pouze_jpz" else (jpz.get("deklarovany_podil_pct") or podil_jpz(jpz_max, slozky))
        vystup[r["source_id"]] = {
            "klic": f"{radek['redizo']}_{radek['kkov']}",
            "zamereni": radek.get("zamereni") or "",
            # Bez dalších složek jde o bodování jen z přijímaček (případně s vážením).
            "rezim": "pouze_jpz" if not slozky and n["rezim"] == "jine" and (jpz_navic or vsechny) else n["rezim"],
            "podil_jpz_pct": round(podil) if podil is not None else None,
            "slozky": slozky,
            "jpz_navic": jpz_navic,
            "minima": [t for t in (citelne_minimum(m) for m in n.get("minima", [])) if t],
            "nejasnosti": n.get("nejasnosti", []),
            "prepis": "strojovy",
            "nalezy": nalezy,
            "sha256": r["sha256"],
            "verze_prepisu": 9 if r.get("plny_text") or cesta.name.endswith("-v9.json") else VERZE,
        }
    return vystup


# Kontrola Jevem (scripts/dipsy-kriteria-jev-kontrola.py --jen-jpz): u přepisu
# „jen přijímačky“ se ptá, zda škola neboduje i něco dalšího. Při jistotě ≥ 0,9
# bylo ručním ověřením 29 z 29 označení správných (docs/podklady/dipsy-kriteria-
# jev-pilot-30-2026-09-28.md), proto se takový přepis označí a netvrdí „jen JPZ“.
JEV_PRAH = 0.9


def jev_oznaceni() -> dict[str, tuple[str, int]]:
    """source_id → (otisk PDF, verze přepisu), které Jev s jistotou označil.

    Verdikt platí jen pro PDF a verzi přepisu, nad kterými vznikl; po změně
    PDF nebo novém přepisu se nepoužije.
    """
    oznacene = {}
    for cesta in (BASE / "llm-pilot" / "jev-kontrola").glob("*-jpz.json"):
        r = json.loads(cesta.read_text(encoding="utf-8"))
        if r["odpovedi"]["dalsi_body"]["probabilities"].get("ano", 0) >= JEV_PRAH and r.get("sha256"):
            oznacene[r["source_id"]] = (r["sha256"], r.get("verze_prepisu"))
    return oznacene


# Ručně ověřené obory, kde přepis „jen přijímačky“ je chybný (z pásma nižší jistoty Jevu).
RUCNE_OVERENE = KOREN / "docs" / "podklady" / "dipsy-kriteria-rucne-overene-2026-09-28.json"


def main() -> None:
    prepisy = ze_strojoveho_prepisu()
    rucne = json.loads(RUCNE_OVERENE.read_text(encoding="utf-8"))["obory"]
    jev = jev_oznaceni()
    oznacene = set()
    for sid, p in prepisy.items():
        overeni = rucne.get(p["klic"])
        if overeni and overeni["source_id"] == sid and overeni["sha256"] == p["sha256"]:
            oznacene.add(sid)  # ruční ověření téhož PDF
        elif sid in jev and jev[sid] == (p["sha256"], p["verze_prepisu"]):
            oznacene.add(sid)  # Jev nad tímtéž PDF i přepisem
    for sid in oznacene:
        p = prepisy.get(sid)
        # Přepis, který zachytil vážení předmětu (jpz_navic), Jev často označí
        # „ano“ právě kvůli vážení; to není chybějící složka.
        if p and p["rezim"] == "pouze_jpz" and not p.get("jpz_navic"):
            p["rezim"] = "jine"
            p["podil_jpz_pct"] = None
            p["nalezy"].append("jev:skola_boduje_i_dalsi")
            p["chybi_slozky"] = True
    prepisy.update(z_pilotu())  # ruční přepis má přednost
    obory: dict[str, dict] = {}
    for radek in kontrola.pilot.latest_manifest().values():
        if radek.get("rok") != ROK or radek.get("stav") not in ("text", "ocr_text"):
            continue
        klic = f"{radek['redizo']}_{radek['kkov']}"
        obory.setdefault(klic, {"pdf": True, "prepisy": []})
    for sid, p in prepisy.items():
        klic = p.pop("klic")
        p.pop("sha256", None)  # otisk slouží jen k vazbě ověření, na web nejde
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
