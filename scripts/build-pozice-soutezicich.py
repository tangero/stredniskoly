#!/usr/bin/env python3
"""
Rozdělení výsledků soutěžících uchazečů po oborech, pro pořadí uchazeče.

Soutěžící uchazeči jsou přijatí a ti, kdo se nevešli kvůli kapacitě, tedy
stejná množina jako `soutezicich` v pásmech přijetí. Pro každý obor se
ukládá, kolik z nich mělo který výsledek (body 0–100 po půlbodech). Z toho
prototyp spočítá *Pořadí mezi soutěžícími* (slovník ukazatelů): kolik
soutěžících mělo vyšší výsledek než zadaný.

Načítá uchazeče tou samou funkcí jako scripts/build-pasma-prijeti.py, takže
množina i výsledek sedí na pásma. Rok z registru (cermat-uchazeci-kolo1).
Výstup: public/pozice_soutezicich_{rok}.json.

    python3 scripts/build-pozice-soutezicich.py
"""
from __future__ import annotations

import collections
import importlib.util
import json
from pathlib import Path

KOREN = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("pasma", KOREN / "scripts" / "build-pasma-prijeti.py")
pasma = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pasma)

# Stejný práh jako u pásem: pod ním je rozdělení údaj o jednotlivcích.
MIN_SOUTEZICICH = pasma.MIN_PRIJATYCH


def main() -> None:
    obory, _ = pasma.nacti_uchazece()
    data = {}
    for klic, o in obory.items():
        soutezici = o["prijati"] + o["nevesli_se"]
        if len(soutezici) < MIN_SOUTEZICICH:
            continue
        # Klíč je výsledek jako text („72.5“), hodnota počet soutěžících s ním.
        pocty = collections.Counter(soutezici)
        data[klic] = {f"{b:g}": n for b, n in sorted(pocty.items())}
    vystup = {
        "rok": pasma.ROK,
        "zdroj": pasma.ZDROJ.name,
        "mnozina": "soutěžící uchazeči: přijatí a nepřijatí pro nedostačující kapacitu (tatáž jako soutezicich v pásmech)",
        "skala": "body 0–100, procentní skór CERMAT dělený dvěma",
        "min_soutezicich": MIN_SOUTEZICICH,
        "data": data,
    }
    cesta = KOREN / "public" / f"pozice_soutezicich_{pasma.ROK}.json"
    cesta.write_text(json.dumps(vystup, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"{len(data)} oborů, {cesta.stat().st_size // 1024} kB → {cesta.relative_to(KOREN)}")


if __name__ == "__main__":
    main()
