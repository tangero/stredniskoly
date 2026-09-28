#!/usr/bin/env python3
"""
Rozdělení výsledků soutěžících uchazečů po oborech, pro pořadí uchazeče.

Soutěžící uchazeči jsou přijatí a ti, kdo se nevešli kvůli kapacitě, tedy
stejná množina jako `soutezicich` v pásmech přijetí. Pro každý obor se
ukládá, kolik z nich mělo který výsledek (body 0–100 po půlbodech). Z toho
prototyp spočítá *Pořadí mezi soutěžícími* (slovník ukazatelů): kolik
soutěžících mělo vyšší výsledek než zadaný.

Čte tentýž soubor a tutéž definici výsledku jako scripts/build-pasma-prijeti.py,
ale uchazeče s více zaměřeními téhož oboru počítá jednou. Rok z registru (cermat-uchazeci-kolo1).
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


def soutezici_po_oborech() -> dict[str, list[float]]:
    """Výsledky soutěžících uchazečů po oborech, **každý uchazeč jednou**.

    Uchazeč přihlášený do dvou zaměření téhož oboru (stejné REDIZO_KKOV) má
    dvě přihlášky; sdílená funkce pásem ho započte dvakrát (code review PR #182,
    obor 600004961_79-41-K/61: 821 místo 726). Tady se přihlášky jednoho
    uchazeče ke stejnému oboru slučují. Soutěžící = přijat, nebo nepřijat pro
    nedostačující kapacitu.
    """
    import openpyxl
    wb = openpyxl.load_workbook(pasma.ZDROJ, read_only=True)
    it = wb.worksheets[0].iter_rows(values_only=True)
    ix = {n: i for i, n in enumerate(next(it))}
    obory: dict[str, list[float]] = collections.defaultdict(list)
    for r in it:
        skor = r[ix["c_m_procentni_skor"]]
        if skor is None:
            continue
        body = float(skor) / 2
        klice = set()
        for k in range(1, 6):
            redizo, kkov = r[ix[f"ss{k}_redizo"]], r[ix[f"ss{k}_kkov"]]
            if not redizo or not kkov:
                continue
            if pasma.prijat(r[ix[f"ss{k}_prijat"]]) or r[ix[f"ss{k}_duvod_neprijeti"]] == "pro_nedostacujici_kapacitu":
                klice.add(f"{redizo}_{kkov}")
        for klic in klice:
            obory[klic].append(body)
    return obory


def main() -> None:
    data = {}
    for klic, soutezici in soutezici_po_oborech().items():
        if len(soutezici) < MIN_SOUTEZICICH:
            continue
        # Klíč je výsledek jako text („72.5“), hodnota počet soutěžících s ním.
        pocty = collections.Counter(soutezici)
        data[klic] = {f"{b:g}": n for b, n in sorted(pocty.items())}
    vystup = {
        "rok": pasma.ROK,
        "zdroj": pasma.ZDROJ.name,
        "mnozina": "soutěžící uchazeči: přijatí a nepřijatí pro nedostačující kapacitu, každý uchazeč u oboru jednou (i při více zaměřeních)",
        "skala": "body 0–100, procentní skór CERMAT dělený dvěma",
        "min_soutezicich": MIN_SOUTEZICICH,
        "data": data,
    }
    cesta = KOREN / "public" / f"pozice_soutezicich_{pasma.ROK}.json"
    cesta.write_text(json.dumps(vystup, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"{len(data)} oborů, {cesta.stat().st_size // 1024} kB → {cesta.relative_to(KOREN)}")


if __name__ == "__main__":
    main()
