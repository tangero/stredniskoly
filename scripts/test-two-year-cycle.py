#!/usr/bin/env python3
"""Test hypotézy dvouletého cyklu nabídky oborů pomocí dat 1. kola 2024.

Řada škol některé obory nevypisuje každý rok. Ze dvou ročníků (2025, 2026) to
nelze rozlišit od ukončení nebo vzniku oboru. Data 1. kola 2024 dávají třetí bod:

- nabídka existující jen v roce 2025 je v souladu s lichým cyklem, pokud v roce
  2024 chybí (2024 ne, 2025 ano, 2026 ne);
- nabídka existující jen v roce 2026 je v souladu se sudým cyklem, pokud v roce
  2024 je (2024 ano, 2025 ne, 2026 ano).

Zdroj 2024 je na úrovni uchazečů, ne nabídek. Obor bez jediné přihlášky proto
v datech chybí, i kdyby vypsán byl; nepřítomnost je slabší důkaz než přítomnost.

Použití:
    python3 scripts/test-two-year-cycle.py [--out CESTA]
"""
import argparse
import json
from collections import defaultdict
from pathlib import Path

import openpyxl

VSTUP_2024 = Path("data/PZ2024_kolo1_uchazeci_prihlasky_vysledky.xlsx")
REJSTRIK = Path("docs/podklady/rejstrik-k-fronte-2025-2026.json")
FRONTA = Path("docs/podklady/fronta-dohledavani-2025-2026.json")
VYSLEDKY = Path("docs/podklady/vysledky-navaznosti-2025-2026")

# Rozsah matice: denní nezkrácené studium
FORMA_DENNI = "den"
POCET_PRIHLASEK = 5  # sloupce SŠ1..SŠ5


def nacti_nabidky_2024():
    """Množina (IZO, KKOV), na které v 1. kole 2024 dorazila alespoň jedna přihláška.

    Vrací i počty přihlášek, aby šlo odlišit ojedinělý zápis od plné nabídky.
    """
    wb = openpyxl.load_workbook(VSTUP_2024, read_only=True)
    ws = wb.worksheets[0]
    radky = ws.iter_rows(min_row=2, values_only=True)
    pocty = defaultdict(int)
    for radek in radky:
        for i in range(POCET_PRIHLASEK):
            zaklad = 5 + i * 7
            izo, kkov, forma, zkraceno = (radek[zaklad], radek[zaklad + 2],
                                          radek[zaklad + 3], radek[zaklad + 4])
            if not izo or not kkov:
                continue
            if forma != FORMA_DENNI or str(zkraceno) == "True":
                continue
            pocty[(str(izo).strip(), str(kkov).strip())] += 1
    wb.close()
    return pocty


def izo_bez_prefixu(hodnota):
    text = str(hodnota or "")
    return text[4:] if text.lower().startswith("izo_") else text


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default="docs/podklady/dvoulety-cyklus-2024-2026.json")
    args = parser.parse_args()

    pocty2024 = nacti_nabidky_2024()
    print(f"Rok 2024: {len(pocty2024)} kombinací IZO a oboru s alespoň jednou přihláškou "
          f"(denní nezkrácené studium).")

    rej = json.loads(REJSTRIK.read_text())
    fronta = json.loads(FRONTA.read_text())
    ukoly = {t["id"]: t for t in fronta["tasks"]}
    posledni = rej["snapshots"][-1]
    prvni = rej["snapshots"][0]

    # status nálezu k otázce, aby šlo porovnat závěr rešerše s testem
    stav_nalezu = {}
    for cesta in sorted(VYSLEDKY.glob("*.json")):
        v = json.loads(cesta.read_text())
        for f in v.get("findings", []):
            for oid in f.get("issue_ids", []):
                stav_nalezu[oid] = {
                    "task_id": v["task_id"],
                    "status": f.get("status"),
                    "relationship": f.get("relationship", {}).get("type"),
                    "recommended_action": f.get("recommended_action"),
                }

    zaznamy = []
    for tid, data in rej["tasks"].items():
        # KKOV nabízené školou v každém roce – test má smysl jen tam, kde v druhém
        # roce chybí celý kód oboru. Data 2024 neobsahují zaměření, takže rozdíl
        # pouze v textu zaměření by test vyhodnotil falešně.
        kkov_v_roce = {
            rok: {n.get("KKOV") for n in (ukoly[tid].get("context_offers", {}).get(rok) or [])}
            for rok in ("2025", "2026")
        }
        nazev = ""
        for rok in ("2026", "2025"):
            nabidky = ukoly[tid].get("context_offers", {}).get(rok) or []
            if nabidky:
                nazev = nabidky[0].get("NÁZEV ŠKOLY", "")
                break
        for n in data["nabidky"]:
            izo = izo_bez_prefixu(n.get("izo"))
            klic = (izo, n["kkov"])
            v2024 = pocty2024.get(klic, 0)
            rok = n["rok_nabidky"]
            druhy_rok = "2026" if rok == 2025 else "2025"
            jen_zamereni = n["kkov"] in kkov_v_roce[druhy_rok]
            zapsan_stale = n["obor_v_rejstriku"][posledni]
            zapsan_2025 = n["obor_v_rejstriku"][prvni]
            if rok == 2025:
                # 2024 ne, 2025 ano, 2026 ne
                sedi = v2024 == 0 and zapsan_stale
                vzorec = "lichý cyklus (2024 ne, 2025 ano, 2026 ne)"
            else:
                # 2024 ano, 2025 ne, 2026 ano
                sedi = v2024 > 0 and zapsan_2025
                vzorec = "sudý cyklus (2024 ano, 2025 ne, 2026 ano)"
            if jen_zamereni:
                sedi = False
            zaznamy.append({
                "task_id": tid,
                "rozdil_jen_v_zamereni": jen_zamereni,
                "skola": nazev,
                "issue_id": n["issue_id"],
                "izo": izo,
                "kkov": n["kkov"],
                "obor": n["obor_nazev"],
                "rok_nabidky": rok,
                "prihlasek_2024": v2024,
                "obor_v_rejstriku_2025": zapsan_2025,
                "obor_v_rejstriku_2026": zapsan_stale,
                "odpovida_cyklu": bool(sedi),
                "vzorec": vzorec,
                "nalez": stav_nalezu.get(n["issue_id"]),
            })

    testovatelne = [z for z in zaznamy if not z["rozdil_jen_v_zamereni"]]
    sedici = [z for z in testovatelne if z["odpovida_cyklu"]]
    print(f"Nepřiřazených nabídek celkem: {len(zaznamy)}")
    print(f"Z toho rozdíl jen v textu zaměření (test neaplikovatelný): "
          f"{len(zaznamy) - len(testovatelne)}")
    print(f"Testovatelných (v druhém roce chybí celý kód oboru): {len(testovatelne)}")
    print(f"Odpovídá dvouletému cyklu: {len(sedici)}")
    for rok in (2025, 2026):
        vse = [z for z in testovatelne if z["rok_nabidky"] == rok]
        ok = [z for z in vse if z["odpovida_cyklu"]]
        print(f"  nabídky {rok}: {len(ok)} z {len(vse)}")

    vystup = {
        "generated_from": [str(VSTUP_2024), str(REJSTRIK), str(FRONTA)],
        "note": "Data 2024 jsou na úrovni uchazečů: obor bez přihlášek v nich chybí, "
                "i kdyby vypsán byl. Přítomnost v roce 2024 je proto silnější důkaz "
                "než nepřítomnost. Shoda se vzorcem není důkaz cyklu, jen slučitelnost.",
        "scope": "1. kolo, denní nezkrácené studium",
        "offers": zaznamy,
    }
    Path(args.out).write_text(json.dumps(vystup, ensure_ascii=False, indent=1))
    print(f"Zapsáno do {args.out}")


if __name__ == "__main__":
    raise SystemExit(main())
