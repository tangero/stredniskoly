#!/usr/bin/env python3
"""Roztřídění otevřených otázek rešerše návazností podle toho, čím je lze uzavřít.

Nálezy rešerše nesou pole `unanswered_questions`. Samotný jejich počet nic neříká
o tom, kolik práce zbývá: část otázek je mimo schválený rozsah (příčina přejmenování,
přesné datum), část uzavře jediný sdílený dokument a část odpoví data, která už
v repozitáři jsou. Skript proto otázky třídí podle cesty k uzavření.

Použití:
    python3 scripts/classify-open-questions.py [--out CESTA] [--vypis KATEGORIE]
"""
import argparse
import json
import re
from collections import Counter, defaultdict
from pathlib import Path

VYSLEDKY = Path("docs/podklady/vysledky-navaznosti-2025-2026")

# Pořadí rozhoduje: první shoda vyhrává, proto jdou konkrétní vzory před obecné.
KATEGORIE = [
    ("seznam_pokusneho_overovani",
     r"pokusn\w+ ověřován\w*",
     "Jeden seznam škol zapojených do pokusného ověřování oboru 78-42-M/08 od MŠMT."),
    ("dokument_zrizovatele",
     r"usnesení|zastupitelstv|rada kraje|zřizovací listin|primární dokument zřizovatele|rozhodnutí zřizovatele|právní mechanismus",
     "Usnesení rady nebo zastupitelstva kraje; lze hledat v úředních deskách krajů."),
    ("pravni_doklad_subjektu",
     r"obchodní\w* rejstřík|or\.justice|ARES|fúz|formálně sloučen|zánik\w* právnick|IČO",
     "Otevřená data ARES nebo sbírka listin; webové rozhraní justice agentům nevrací obsah."),
    ("jina_kola_prijimaciho_rizeni",
     r"2\. kol|druhé\w* kol|dodatečn\w* kol|mimo evidenci CERMAT|mimo data CERMAT|dalších kol",
     "Data 2. kola 2024 a 2025, která už v repozitáři jsou."),
    ("historie_pred_2025",
     r"před rokem 2025|někdy před|mimo sledované období|dříve běžel|reálně běžel i před",
     "Data 1. kola 2024, případně starší ročníky CERMAT."),
    ("perioda_cyklu",
     r"perioda|pravideln\w+ cykl|dvouletý interval|víceletého cyklu|jak často",
     "Test dvouletého cyklu proti datům 2024; u delších period je potřeba starší ročník."),
    ("trvalost_ukonceni",
     r"trval\w+|dočasn\w+|jednoroční přerušení|znovu (vyhlás|otevř)|zda a kdy|zda a od kdy|obnoven\w*|vznikne|bude .*(otevřen|vyhlášen)|2027",
     "Nabídka roku 2027, až bude zveřejněna. Do té doby nerozhodnutelné."),
    ("prenos_statistik",
     r"statistik|přenášet|přenositeln|srovnateln",
     "Rozhodnutí člověka o srovnatelnosti, ne další rešerše."),
    ("obsah_vs_zapis",
     r"ŠVP|obsah\w*|obsahově|věcn\w+ změn|marketingov|pouze nové označení|reálnou změnou|změnou zápisu",
     "Školní vzdělávací program školy; u pouhé změny textu je podle pravidel mimo rozsah."),
    ("misto_vyuky",
     r"míst\w* výuky|budov|pracovišt|stěhov|areál|středisc|pobočk|odloučené",
     "Úkol dojezdovosti: místa výuky z rejstříku plus potvrzení školy."),
    ("rejstrik_zapis",
     r"zapsán\w* do rejstříku|zápis\w* do rejstříku|vyřazen\w* z rejstříku|samostatné IZO|registrac",
     "Novější snímek rejstříku MŠMT, až vyjde."),
    ("kapacita_pocty",
     r"kapacit|počet přijímaných|kolik uchazečů|počet žáků|počty",
     "Data kapacit 1. kola 2026, která už v repozitáři jsou."),
    ("vazba_na_jiny_ukol",
     r"úkol R-\d|zpracovat společně|odkázat na úkol",
     "Spojení dvou úkolů při přezkumu, ne nová rešerše."),
    ("duvod_zmeny",
     r"přesný důvod|důvod, proč|proč škola|proč se",
     "Podle schváleného pravidla 1 se příčina samotné změny nezkoumá."),
    ("datum_udalosti",
     r"přesn\w+ datum|od kdy|odkdy|kdy přesně|datum zahájení|který školní rok|od jakého",
     "Podle schváleného pravidla 8 se událost datuje do intervalu mezi snímky."),
    ("chybi_oznameni_skoly",
     r"oznámení školy|vyjádření školy|přímé \w* ?oznámení|výroční zpráv|primární zdroj|doslovný text",
     "Výroční zpráva školy, nebo přiznat, že datovaný zdroj neexistuje."),
    ("zdroj_nedostupny",
     r"nedostupn|nebyl\w* (možné )?(ověřit|načíst)|technicky|síťově|captch",
     "Opakovaný pokus jinou cestou, nebo archiv stránky."),
]

VZORY = [(k, re.compile(v, re.I), popis) for k, v, popis in KATEGORIE]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default="docs/podklady/otevrene-otazky-navaznosti.json")
    parser.add_argument("--vypis", default=None, help="vypsat všechny otázky jedné kategorie")
    args = parser.parse_args()

    otazky = []
    for cesta in sorted(VYSLEDKY.glob("*.json")):
        v = json.loads(cesta.read_text())
        for f in v.get("findings", []):
            for text in f.get("unanswered_questions", []):
                kategorie, popis = "neurceno", "Nezařazeno, vyžaduje ruční pohled."
                for klic, vzor, jak in VZORY:
                    if vzor.search(text):
                        kategorie, popis = klic, jak
                        break
                otazky.append({
                    "task_id": v["task_id"],
                    "issue_ids": f.get("issue_ids", []),
                    "status": f.get("status"),
                    "recommended_action": f.get("recommended_action"),
                    "kategorie": kategorie,
                    "cesta_k_uzavreni": popis,
                    "otazka": text,
                })

    pocty = Counter(o["kategorie"] for o in otazky)
    ukoly = defaultdict(set)
    for o in otazky:
        ukoly[o["kategorie"]].add(o["task_id"])

    print(f"Otevřených otázek: {len(otazky)} v {len({o['task_id'] for o in otazky})} úkolech.\n")
    print(f"{'kategorie':32} {'otázek':>7} {'úkolů':>7}")
    for klic, pocet in pocty.most_common():
        print(f"{klic:32} {pocet:7} {len(ukoly[klic]):7}")

    if args.vypis:
        print(f"\n--- {args.vypis} ---")
        for o in otazky:
            if o["kategorie"] == args.vypis:
                print(f"  {o['task_id']} {','.join(o['issue_ids'])}: {o['otazka'][:170]}")

    Path(args.out).write_text(json.dumps({
        "generated_from": str(VYSLEDKY),
        "note": "Kategorie říká, čím lze otázku uzavřít, ne jak je důležitá. "
                "Část otázek je podle schválených pravidel mimo rozsah rešerše.",
        "counts": dict(pocty),
        "questions": otazky,
    }, ensure_ascii=False, indent=1))
    print(f"\nZapsáno do {args.out}")


if __name__ == "__main__":
    raise SystemExit(main())
