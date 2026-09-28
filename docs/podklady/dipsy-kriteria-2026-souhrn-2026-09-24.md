# Místní sběr PDF kritérií DiPSy 2026 — stav 24. 9. 2026

Rozsah tvoří všech 3 091 konkrétních nabídek ve výběrovém katalogu `public/applications_2026.json`, rok 2026, 1. kolo. Není to výčet všech oborů a kol DiPSy. Každá karta se kontrolovala proti ID nabídky, roku, kolu, REDIZO, IZO, KKOV a zaměření z katalogu.

| Výsledek | Počet nabídek |
|---|---:|
| PDF a přímý text | 2 727 |
| PDF a OCR text | 362 |
| Chyba zdroje nebo identity | 2 |
| Celkem | 3 091 |

Úspěšných 3 089 vazeb používá 2 171 různých PDF. Součet velikostí unikátních PDF je 1 027 097 352 bajtů. Shodný obsah se poznává podle SHA-256, ale každá nabídka si uchovává vlastní `source_id` a `file_id`. Před doplňkovým OCR bylo 2 750 nabídek s textovou vrstvou alespoň 100 znaků a 339 bez ní; doplňkové OCR u textů pod 500 znaků nahradilo původní text u dalších 23 nabídek a dvě ponechalo beze změny.

Po opakování požadavků zůstaly dvě chyby:

- `ff8d0a5c-0a9c-4155-bb67-91edf16851bc`, REDIZO `600005666`, KKOV `69-41-L/01`: karta uvádí přílohu `ff36758a-a5e1-4dae-9a7e-de0cf8400fbd` s `filesize: 0`; stažený obsah není PDF.
- `3775a158-e72d-4e99-ab52-b3f06fd86081`, KKOV `79-41-K/41`: katalog uvádí REDIZO `691007039` (ZŠ a gymnázium Livingston), současná karta DiPSy REDIZO `691020680` (Gymnázium MIRADOR). IZO `181141965` se shoduje. Příloha se bez vyřešení změny identity nepřiřadila původní škole.

Po vytvoření `evidence.jsonl` byl ověřen úplný soulad 3 091 ID katalogu s posledními záznamy manifestu, SHA-256 a velikost každého místního PDF, existence a délka zvoleného textu a přítomnost výskytů se shodným hashem u všech 3 089 úspěšných nabídek. Audit neměl žádnou neshodu. Kategorie textových výskytů byly nalezeny u 2 895 nabídek pro JPZ, 2 583 pro váhy, 2 988 pro možné další body, 2 679 pro minima, 2 486 pro rovnost a 2 857 pro další podmínky. Jde o shody výrazů, **nikoli počty škol s těmito pravidly**; například slovo „známky“ může být i ve větě, že se nehodnotí.

Úplný PDF a textový korpus je jen místně v gitignorovaném `data/dipsy-kriteria-2026/`. Textové signály obsahují nanejvýš 24 úryvků na kategorii a PDF; úplný text zůstává v `text/`. Čitelnost OCR a správnost čísel nebyly hromadně ručně ověřeny. Strukturovaný bodovací postup je pracovně přepsán jen pro pět původních PDF; hromadný sběr ho automaticky neurčuje a nic z něj není zveřejněno.
