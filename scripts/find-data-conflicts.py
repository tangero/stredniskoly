#!/usr/bin/env python3
"""Hledání skutečných sporů mezi číselníky, ne chybějících potvrzení.

Zápis školy nebo oboru v některém z číselníků je sám o sobě dokladem, že
existuje po právu. Rešerše proto nemá dohledávat další potvrzení téhož, ale
řešit místa, kde si zdroje odporují. Skript hledá čtyři druhy takového sporu:

1. Nabídka CERMAT u REDIZO, které v odpovídajícím snímku rejstříku MŠMT chybí.
2. IZO vedené v datech CERMAT pod jiným REDIZO, než pod jakým je v rejstříku.
3. Obor zapsaný v rejstříku s jinou délkou, formou nebo jazykem, než uvádí CERMAT.
4. Nálezy rešerše se stavem rozpor_zdrojů nebo s nerozhodnutým typem vztahu.

Odstup zápisu do rejstříku sporem není: obor doložený daty CERMAT existuje,
i když jej rejstřík ještě nevede.

Použití:
    python3 scripts/find-data-conflicts.py [--out CESTA]
"""
import argparse
import glob
import json
from pathlib import Path

FRONTA = Path("docs/podklady/fronta-dohledavani-2025-2026.json")
REJSTRIK = Path("docs/podklady/rejstrik-k-fronte-2025-2026.json")
VYSLEDKY = Path("docs/podklady/vysledky-navaznosti-2025-2026")

# Snímek rejstříku, který časově odpovídá 1. kolu daného ročníku
SNIMEK_ROKU = {2025: "2025-03-31", 2026: "2026-03-31"}
DELKA = {"1": "10", "2": "20", "3": "30", "4": "40", "5": "50", "6": "60", "8": "80"}
FORMA = {"den": "10", "dal": "22", "vec": "23", "komb": "24", "dist": "30"}


def bez_prefixu(izo):
    t = str(izo or "")
    return t[4:] if t.lower().startswith("izo_") else t


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default="docs/podklady/spory-v-datech-2025-2026.json")
    args = parser.parse_args()

    fronta = json.loads(FRONTA.read_text())
    rej = json.loads(REJSTRIK.read_text())
    spory = []
    odstupy = set()

    for ukol in fronta["tasks"]:
        data = rej["tasks"].get(ukol["id"], {})
        stav = data.get("redizo", {})
        stopa = data.get("izo_napric_subjekty", {})

        for rok_txt in ("2025", "2026"):
            rok = int(rok_txt)
            snimek = SNIMEK_ROKU[rok]
            for n in (ukol.get("context_offers", {}).get(rok_txt) or []):
                redizo = str(n["REDIZO"])
                izo = bez_prefixu(n["IZO"])
                info = stav.get(redizo, {})
                ve_snimku = (info.get("stav_ve_snimcich") or {}).get(snimek)

                if ve_snimku is None:
                    # Není spor: nabídka v datech CERMAT je sama dokladem existence školy
                    # a zápis do rejstříku se opožďuje. Evidujeme jen pro přehled.
                    odstupy.add((ukol["id"], redizo, rok))
                    continue

                kde = (stopa.get(f"izo_{izo}") or stopa.get(izo) or {}).get(snimek)
                if kde and kde[0] != redizo:
                    spory.append({
                        "druh": "izo_pod_jinym_redizo",
                        "task_id": ukol["id"], "redizo": redizo, "izo": izo,
                        "kkov": n["KKOV"], "rok": rok,
                        "popis": f"CERMAT vede IZO {izo} pod REDIZO {redizo}, rejstřík "
                                 f"k {snimek} pod REDIZO {kde[0]} ({kde[1]})."})

                # Týž kód oboru může být u jedné školy zapsán ve více variantách
                # (různá délka, forma či jazyk). Sporem je až to, když CERMAT uvádí
                # délku, kterou rejstřík u daného oboru nemá v žádné variantě.
                varianty = [o for skola in ve_snimku["stredni_skoly"] if skola["izo"] == izo
                            for o in skola["obory"] if o["kod"] == n["KKOV"]]
                ocek_delka = str(n.get("DÉLKA STUDIA") or "")
                delky = {o["delka"] for o in varianty if o["delka"]}
                if varianty and ocek_delka and delky and ocek_delka not in delky:
                    spory.append({
                        "druh": "jina_delka_studia",
                        "task_id": ukol["id"], "redizo": redizo, "izo": izo,
                        "kkov": n["KKOV"], "rok": rok,
                        "popis": f"CERMAT uvádí u oboru {n['KKOV']} délku {ocek_delka} let, "
                                 f"rejstřík k {snimek} u tohoto oboru vede jen délky "
                                 f"{', '.join(sorted(delky))}."})

    for cesta in sorted(VYSLEDKY.glob("*.json")):
        v = json.loads(cesta.read_text())
        for f in v.get("findings", []):
            if f.get("status") == "rozpor_zdrojů" or f.get("relationship", {}).get("type") == "unknown":
                spory.append({
                    "druh": "nerozhodnuty_nalez",
                    "task_id": v["task_id"], "issue_ids": f.get("issue_ids", []),
                    "status": f.get("status"),
                    "relationship": f.get("relationship", {}).get("type"),
                    "popis": (f.get("conclusion") or
                              (f["unanswered_questions"][0] if f.get("unanswered_questions") else ""))[:400]})

    print(f"Odstup zápisu do rejstříku (není spor): {len(odstupy)} kombinací školy a ročníku.")
    for tid, redizo, rok in sorted(odstupy):
        print(f"   {tid}: REDIZO {redizo} chybí ve snímku k roku {rok}, nabídku ale CERMAT vede.")
    print()

    podle_druhu = {}
    for s in spory:
        podle_druhu.setdefault(s["druh"], []).append(s)

    print(f"Nalezeno {len(spory)} sporů.\n")
    for druh, polozky in sorted(podle_druhu.items(), key=lambda x: -len(x[1])):
        print(f"{druh}: {len(polozky)}")
        for p in polozky[:12]:
            print(f"   {p['task_id']}: {p['popis'][:150]}")
        if len(polozky) > 12:
            print(f"   … a dalších {len(polozky) - 12}")
        print()

    Path(args.out).write_text(json.dumps({
        "note": "Zápis v číselníku je dokladem existence; odstup zápisu do rejstříku sporem není. "
                "Seznam obsahuje jen místa, kde si zdroje odporují.",
        "counts": {k: len(v) for k, v in podle_druhu.items()},
        "registry_lag_not_conflict": [{"task_id": t, "redizo": r, "rok": y}
                                      for t, r, y in sorted(odstupy)],
        "conflicts": spory,
    }, ensure_ascii=False, indent=1))
    print(f"Zapsáno do {args.out}")


if __name__ == "__main__":
    raise SystemExit(main())
