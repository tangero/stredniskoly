# Výsledek měření přepisu kritérií 2026 na 100 nabídkách

Stav: 2026-09-25 04:36 UTC. Jde o místní pracovní měření, nikoli o veřejně ověřená kritéria.

Výběr je stratifikovaný, záměrně obsahuje obtížná PDF. Není reprezentativní pro všechny školy. Stejné PDF může platit pro různé obory; výstupy jsou vedené k jednotlivým nabídkám roku 2026, 1. kola.

- Dvojí čtení: 100/100.
- Shoda číselné struktury: 16/100; doslovná shoda normalizovaného textu minim, rovnosti a podmínek: 0/100. Textová neshoda zahrnuje i různé formulace stejného pravidla.
- Rozdílně určený režim `pouze_jpz` / `jine` / `nezjisteno`: 4/100.
- Bez mechanického nálezu v obou přepisech: 9/100. Mechanická kontrola dokazuje jen vnitřní soulad a přítomnost citace, nikoli správný výklad PDF.
- Třetí čtení Opus: 100/100 vybraných, z celého vzorku 100/100.
- Ze shod levnějších modelů u třetím modelem přečtených případů se Opus liší v číselné struktuře u 7 nabídek. Jde o signál možného společného omylu, nikoli o jeho důkaz.

| Vrstva | Nabídek | Shoda číselné struktury | Oba bez mechanického nálezu |
|---|---:|---:|---:|
| sdilene_pdf | 20 | 1 | 3 |
| ocr | 20 | 4 | 1 |
| dlouhe_pdf | 10 | 0 | 1 |
| signal_vahy | 20 | 5 | 1 |
| nahodne | 30 | 6 | 3 |

## Mechanické nálezy

| Nález | DeepSeek | Luna | Opus |
|---|---:|---:|---:|
| `chybi_doklad:dalsi_slozka:0` | 7 | 16 | 2 |
| `chybi_doklad:dalsi_slozka:1` | 5 | 5 | 0 |
| `chybi_doklad:dalsi_slozka:2` | 2 | 2 | 0 |
| `chybi_doklad:dalsi_slozka:3` | 1 | 1 | 1 |
| `chybi_doklad:jpz_cjl_max` | 15 | 16 | 3 |
| `chybi_doklad:jpz_mat_max` | 12 | 14 | 2 |
| `chybi_doklad:jpz_vaha_pct` | 7 | 9 | 1 |
| `chybi_doklad:max_bodu_celkem` | 1 | 4 | 1 |
| `chybi_doklad:minimum` | 3 | 9 | 1 |
| `chybi_doklad:rovnost` | 1 | 4 | 1 |
| `citace_neni_na_strane` | 42 | 70 | 7 |
| `maximum_mezi_minimy` | 3 | 3 | 2 |
| `neplatna_citace` | 9 | 9 | 5 |
| `neplatny_index_dokladu` | 11 | 0 | 1 |
| `nesedi_celkove_maximum` | 8 | 21 | 1 |
| `nesedi_prepocet_jpz` | 14 | 1 | 0 |
| `nesedi_prepocet_slozky:0` | 4 | 1 | 1 |
| `nesedi_prepocet_slozky:1` | 1 | 1 | 1 |
| `neurcene_maximum_slozky:0` | 2 | 3 | 5 |
| `neurcene_maximum_slozky:1` | 5 | 1 | 4 |
| `neurcene_maximum_slozky:2` | 4 | 1 | 1 |
| `neurcene_maximum_slozky:3` | 3 | 0 | 0 |
| `prepocteni_jpz_bez_vahy` | 5 | 2 | 3 |
| `prepocteni_jpz_odporuje_vaze` | 13 | 0 | 0 |

## Náklady

| Model | Nabídek | Přímá volání USD | Dávka USD |
|---|---:|---:|---:|
| deepseek | 100 | 0.033101 | 0.126579 |
| luna | 100 | 0.045182 | 0.094898 |
| opus | 100 | 0.000000 | 4.493830 |

Dřívějších šest časově vypršených synchronních volání nemá potvrzený účetní záznam v místních výstupech; součet výše je jen cena vrácená v úspěšných odpovědích a dokončených dávkách.

## Meze závěru

Modely mohou udělat stejnou chybu. Třetí model je další nezávislý výklad, ne referenční pravda. Z tohoto měření nelze vyčíslit skutečnou přesnost vůči právně závaznému PDF bez nezávislé adjudikace. Žádný výstup se nezapisuje do produkční databáze a historická pravidla 2026 nepotvrzují rok 2027.
