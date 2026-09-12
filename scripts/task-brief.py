#!/usr/bin/env python3
"""Kompaktní podklad k jednomu úkolu rešeršní fronty návazností.

Spojí zadání z fronty (nabídky CERMAT 2025 vs 2026, otázky) se strojovým
přehledem z rejstříku MŠMT a vypíše je v čitelné podobě pro rešeršního agenta.

Použití:
    python3 scripts/task-brief.py R-600012026
"""
import json
import sys

FRONTA = "docs/podklady/fronta-dohledavani-2025-2026.json"
REJSTRIK = "docs/podklady/rejstrik-k-fronte-2025-2026.json"

POLE_NABIDKY = ["KKOV", "OBOR - NÁZEV", "ZAMĚŘENÍ OBORU", "DÉLKA STUDIA",
                "FORMA VZDĚLÁVÁNÍ", "JAZYK STUDIA"]


def nabidka_radek(n):
    hlavni = " | ".join(f"{n.get(p)}" for p in POLE_NABIDKY)
    return f"    {hlavni}  [ID_SOF {n.get('ID_SOF')}]"


def vypis_skolu(n):
    return (f"{n.get('NÁZEV ŠKOLY')} | {n.get('ULICE')}, {n.get('OBEC')} {n.get('PSČ')} "
            f"| REDIZO {n.get('REDIZO')} | IZO {n.get('IZO')}")


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    tid = sys.argv[1]
    fronta = json.load(open(FRONTA))
    ukol = next((t for t in fronta["tasks"] if t["id"] == tid), None)
    if ukol is None:
        sys.exit(f"Úkol {tid} není ve frontě.")
    rej = json.load(open(REJSTRIK))["tasks"].get(tid, {})

    print(f"# Úkol {tid} (priorita {ukol['priority']}, fronta verze {fronta['version']})")
    print(f"REDIZO: {', '.join(ukol['redizo'])}")

    print("\n## Otázky k zodpovězení")
    for i in ukol["issues"]:
        print(f"- {i['id']} · {i['kind']} · priorita {i['priority']}")
        for r in i.get("records", []):
            d = r["data"]
            if r["type"] == "offers":
                print(f"    záznam {r['year']}: {d.get('KKOV')} {d.get('OBOR - NÁZEV')} "
                      f"/ zaměření „{d.get('ZAMĚŘENÍ OBORU')}\" / {d.get('DÉLKA STUDIA')} let "
                      f"/ {d.get('FORMA VZDĚLÁVÁNÍ')} / {d.get('JAZYK STUDIA')}")
            else:
                print(f"    záznam {r['year']} ({r['type']}): {json.dumps(d, ensure_ascii=False)[:220]}")

    print("\n## Nabídky CERMAT (1. kolo JPZ) – celý kontext organizace")
    for rok in ("2025", "2026"):
        nab = ukol.get("context_offers", {}).get(rok) or []
        print(f"  rok {rok} – {len(nab)} nabídek")
        if nab:
            print(f"    škola: {vypis_skolu(nab[0])}")
        for n in nab:
            print(nabidka_radek(n))

    print("\n## Rejstřík MŠMT – snímky k 31.3.2025, 31.12.2025, 31.3.2026, 30.6.2026")
    for redizo, info in rej.get("redizo", {}).items():
        print(f"  REDIZO {redizo}")
        if info["chybi_ve_snimcich"]:
            print(f"    POZOR – subjekt chybí ve snímcích: {', '.join(info['chybi_ve_snimcich'])}")
        for zm in info["zmeny_nazvu"]:
            print(f"    název od {zm['od_snimku']}: {zm['hodnota']}")
        for zm in info["zmeny_sidla"]:
            print(f"    sídlo od {zm['od_snimku']}: {zm['hodnota']}")
        for datum, stav in info["stav_ve_snimcich"].items():
            if stav is None:
                continue
            for skola in stav["stredni_skoly"]:
                obory = "; ".join(
                    f"{o['kod']} {o['nazev']} ({o['delka']}l, {o['forma']}, {o['jazyk']}"
                    + (", dobíhající" if o.get("dobihajici") else "") + ")"
                    for o in skola["obory"])
                print(f"    [{datum}] IZO {skola['izo']} „{skola['nazev']}\" "
                      f"| místa výuky: {' ; '.join(m for m in skola['mista_vyuky'] if m)}")
                print(f"        obory: {obory or '(žádné)'}")
        print("    (řádky se opakují pro každý snímek; porovnejte je mezi sebou)")

    print("\n## Kde je IZO vedeno v jednotlivých snímcích (signál sloučení)")
    for izo, stopa in rej.get("izo_napric_subjekty", {}).items():
        print(f"  {izo}: " + ", ".join(
            f"{d}={(v[0] + ' ' + (v[1] or '')) if v else 'NENÍ v rejstříku'}" for d, v in stopa.items()))

    print("\n## Strojová klasifikace nepřiřazených nabídek (podklad, ne závěr)")
    for n in rej.get("nabidky", []):
        print(f"  {n['issue_id']} · {n['kkov']} {n['obor_nazev']} (nabídka {n['rok_nabidky']})")
        print(f"    zapsán v rejstříku: " + ", ".join(f"{d}={'ano' if v else 'ne'}"
                                                     for d, v in n["obor_v_rejstriku"].items()))
        print(f"    návrh: {n['strojovy_navrh']}")


if __name__ == "__main__":
    main()
