# Hromadný sběr kritérií DiPSy 2026

Rozsah: všech 3 091 konkrétních nabídek 1. kola 2026 v `public/applications_2026.json` (1 104 REDIZO). Katalog je výběrový: obsahuje denní nezkrácené obory s povinnou JPZ. Výsledek proto není soupisem všech středních škol ani dalších kol.

```sh
python3 scripts/dipsy-kriteria-sber.py
python3 scripts/dipsy-kriteria-sber.py --retry-errors
python3 scripts/dipsy-kriteria-extrakce.py --ocr
python3 scripts/dipsy-kriteria-extrakce.py --ocr-short
python3 scripts/dipsy-kriteria-extrakce.py --signaly
python3 scripts/kriteria-review-local.py --vse
```

První příkaz lze kdykoli přerušit a znovu spustit. Jeden řádek v `data/dipsy-kriteria-2026/manifest.jsonl` je jeden pokus o získání jedné nabídky; poslední řádek daného `source_id` určuje aktuální stav. Úspěšné PDF se ukládá pod SHA-256 do `pdf/` a text do `text/`. Pokud už stejné PDF stáhl pilot, použije se místní kopie nebo hardlink; aktuální odkaz DiPSy se přesto znovu vyžádá a dokument se znovu stáhne kvůli kontrole obsahu. Chyby mají oddělený stav a důvod. Přepínač `--limit N` umožňuje malý zkušební běh; `--retry-errors` opakuje i chybové záznamy. Skript má nejvýše tři souběžné nabídky a prodlevu po každém HTTP požadavku.

Validuje se ID nabídky, rok, kolo, REDIZO, KKOV, zaměření a IZO karty DiPSy proti katalogu. Stažení přijímá jen HTTPS odkaz na Azure Blob z DiPSy, soubor s hlavičkou PDF a nejvýše 20 MB. U každé úspěšné verze zůstává ID PDF, SHA-256, velikost, čas získání a čas poslední kontroly. Datum zveřejnění dokumentu se z těchto časů **neodvozuje**.

`--ocr` převádí jen soubory s nedostatečnou textovou vrstvou a přidá nový řádek manifestu. Shodné PDF podle SHA-256 se OCR zpracuje jen jednou. `--ocr-short` zkusí OCR také u podezřele krátkých textových vrstev pod 500 znaků a ponechá původní text, pokud OCR nepřinese více znaků. Oba příkazy se spouštějí až po dokončení sběru, aby dva procesy současně nezapisovaly do stejného žurnálu. `--signaly` vytvoří `evidence.jsonl`: až 24 doslovných úryvků s číslem strany v každé kategorii JPZ, váhy, další bodované složky, minima, rovnost a další podmínky. Úplný text je zvlášť v `text/`. Výskyty nejsou strukturovaný bodovací vzorec a samy neumožňují závěr `pouze_jpz` ani `jine`. Soubory v `data/dipsy-kriteria-2026/` jsou gitignorované a nejsou veřejnou sadou.

První úplný běh 24. 9. 2026 prošel všech 3 091 nabídek katalogu. U 3 089 získal platné PDF; dvě chyby zůstaly i po opakování: `ff8d0a5c-0a9c-4155-bb67-91edf16851bc` má v kartě přílohu s `filesize: 0` a stažený soubor je prázdný; u `3775a158-e72d-4e99-ab52-b3f06fd86081` uvádí katalog REDIZO `691007039`, kdežto současná karta `691020680` (Gymnázium MIRADOR). Druhá karta má shodné IZO, ale dokument se automaticky nepřiřazuje škole z katalogu. Získaný soubor se z těchto dvou nabídek nezaměňuje za kritéria jiné školy. Po sběru mělo 2 750 platných PDF textovou vrstvu alespoň 100 znaků a 339 vyžadovalo OCR; výsledky následného OCR jsou evidované v posledních řádcích manifestu.

Po OCR a doplňkové kontrole krátkých textových vrstev je výsledkem 2 727 nabídek s přímo získaným textem, 362 s textem z OCR a dvě chyby. Úspěšných 3 089 vazeb používá 2 171 různých PDF o souhrnné velikosti 1 027 097 352 bajtů. `evidence.jsonl` má právě 3 089 záznamů. [Auditní souhrn](podklady/dipsy-kriteria-2026-souhrn-2026-09-24.md) uvádí metodu kontroly a její meze.

Lokální kontrolní aplikace na `http://127.0.0.1:8766` ukazuje dosud získané nabídky, PDF, textové výskyty, pět dříve připravených přepisů a další místní data. Schvalovat lze zatím jen těchto pět přepisů. Pro zbývající nabídky je nutný další postup strukturované extrakce a lidského ověření. Rozhodnutí z aplikace se nepromítají do produkční databáze ani na veřejný web.

[Malý modelový vzorek a odhad ceny](podklady/dipsy-kriteria-llm-vzorek-2026-09-24.md) porovnává návrhy s pěti pracovními přepisy a měří další dvě přílohy podle délky. Jeho výstupy zůstávají návrhy; skript má omezení ceny i počtu volání a celý korpus nespouští.
