#!/usr/bin/env python3
"""Ověření ukazatelů náročnosti přijetí na ročníku, který je nevytvořil.

Audit obtížnosti požadoval, aby se každý takový ukazatel validoval na
nepoužitém ročníku. Skript proto počítá ukazatele z dat roku 2025 a měří,
jak dobře předpovídají skutečný výsledek roku 2026: zda se u nabídky
objevil uchazeč nepřijatý kvůli nedostatku míst.

Míra shody je AUC, tedy pravděpodobnost, že náhodně vybraná nabídka
s přetlakem má vyšší hodnotu ukazatele než náhodně vybraná bez přetlaku.
0,5 je náhoda, 1,0 dokonalé rozlišení.

Použití:
    python3 scripts/validate-indicators.py [--out CESTA]
"""
import argparse
import json
import random
import re
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ANALYZA = ROOT / "public/school_analysis.json"
PRIHLASKY = ROOT / "public/applications_2026.json"
VZORKU = 30000


def normalizuj(ident: str) -> str:
    casti = ident.split("_")
    z = unicodedata.normalize("NFKD", "_".join(casti[2:]))
    z = "".join(c for c in z if not unicodedata.combining(c))
    z = re.sub(r"[^a-zA-Z0-9]+", "_", z).strip("_").lower()
    return f"{casti[0]}_{casti[1]}" + (f"_{z}" if z else "")


def auc(skore, znamky, seed=0):
    """Pravděpodobnost správného seřazení náhodné dvojice."""
    kladne = [s for s, z in zip(skore, znamky) if z]
    zaporne = [s for s, z in zip(skore, znamky) if not z]
    if not kladne or not zaporne:
        return None
    rng = random.Random(seed)
    lepsi = shodne = 0
    for _ in range(VZORKU):
        a, b = rng.choice(kladne), rng.choice(zaporne)
        if a > b:
            lepsi += 1
        elif a == b:
            shodne += 1
    return (lepsi + shodne / 2) / VZORKU


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default=str(ROOT / "docs/podklady/overeni-ukazatelu-2025-2026.json"))
    args = parser.parse_args()

    analyza = json.loads(ANALYZA.read_text())
    prihlasky = {normalizuj(z["id"]): z
                 for z in json.loads(PRIHLASKY.read_text())["data"]}

    ukazatele = {"tlak_prvnich_voleb": [], "poptavka": [], "prumer_bodu": []}
    pretlak = []
    for ident, z25 in analyza.items():
        z26 = prihlasky.get(normalizuj(ident))
        if not z26:
            continue
        kap25, kap26 = z25.get("kapacita") or 0, z26.get("kapacita") or 0
        if not kap25 or not kap26:
            continue
        priority = z25.get("priority_counts") or [0]
        kontext = z26.get("admission_context") or {}
        ukazatele["tlak_prvnich_voleb"].append((priority[0] or 0) / kap25)
        ukazatele["poptavka"].append((z25.get("prihlasky") or 0) / kap25)
        ukazatele["prumer_bodu"].append(z25.get("prumer_body") or 0)
        pretlak.append(1 if (kontext.get("capacity_rejected") or 0) > 0 else 0)

    vysledky = {k: auc(v, pretlak) for k, v in ukazatele.items()}
    # Složený ukazatel jen jako kontrola, zda něco přidává
    slozeny = [0.7 * t + 0.3 * p / 100
               for t, p in zip(ukazatele["tlak_prvnich_voleb"], ukazatele["prumer_bodu"])]
    vysledky["slozeny_tlak_a_prumer"] = auc(slozeny, pretlak)

    podil = sum(pretlak) / len(pretlak)
    print(f"Spárováno 2025 → 2026: {len(pretlak)} nabídek")
    print(f"Přetlak v roce 2026 u {podil * 100:.0f} % z nich\n")
    for nazev, hodnota in sorted(vysledky.items(), key=lambda x: -(x[1] or 0)):
        print(f"  {nazev:26} AUC = {hodnota:.3f}")

    Path(args.out).write_text(json.dumps({
        "note": "Ukazatele počítané z roku 2025, ověřené proti výsledku roku 2026. "
                "Cílová veličina: u nabídky byl alespoň jeden uchazeč nepřijatý "
                "kvůli nedostatku míst.",
        "generator": "scripts/validate-indicators.py",
        "pairs": len(pretlak),
        "positive_share": round(podil, 4),
        "auc": {k: round(v, 4) for k, v in vysledky.items() if v is not None},
    }, ensure_ascii=False, indent=1))
    print(f"\nZapsáno do {args.out}")


if __name__ == "__main__":
    raise SystemExit(main())
