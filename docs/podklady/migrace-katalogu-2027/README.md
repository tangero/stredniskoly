# Zahájení migrace katalogu 2027

Inventura ze zdrojů uložených v repozitáři, 11. 9. 2026. Reprodukce z kořene: `node docs/podklady/migrace-katalogu-2027/inventura.mjs`.

- `nesparovane.csv`: 1 004 nabídek 2026 bez jednoznačné shody s katalogem 2025; z toho 978 bez klíče a 26 s kolizí.
- `vzorek-100.csv`: prvních 100 k ručnímu ověření, střídáním skupin podle typu a důvodu neshody. Jde o pracovní stratifikovaný výběr, nikoli reprezentativní náhodný vzorek.
- `souhrn.json`: počty, hashe vstupů a rozsah.

Nebylo potvrzeno žádné přejmenování, zánik ani nově otevřený obor. Sloupce potvrzeného ID, ověřovatele a zdroje jsou úmyslně prázdné. Vyplnit je až podle rejstříku a oficiální nabídky školy; zkontrolovat KKOV, zaměření, délku, formu a místo výuky. Po ručním ověření vzorku upravit odhad pracnosti migrace. Žádné navržené párování není aktivované v aplikaci.

Konzervatoře a obory bez povinné JPZ nejsou v tomto importu. Potřebují samostatnou evidenci z rejstříku a potvrzenou nabídku pro přijímání 2027. Úplná aktualizace katalogu není součástí uzavření P0.
