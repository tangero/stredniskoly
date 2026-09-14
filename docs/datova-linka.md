# Datová linka

Verze 1.4 · 14. 9. 2026 · Plán, provozní příručka a výsledky ověření.

Automatizovaný systém, který zjistí, že zdroj zveřejnil nová nebo přepsaná data, stáhne je, zkontroluje a zpracuje, oznámí to správci a po jeho schválení připraví převzetí. **Web se bez schválení nikdy nezmění** a ani po schválení linka sama nepřepíná zobrazené období; to zůstává krokem `prepni` v [registru stavu datových sad](zdroje-dat.md#5-stav-datových-sad).

Podklady: [zdroje dat, oddíl 5](zdroje-dat.md#5-stav-datových-sad), `public/stav_datovych_sad.json`.

## 1. Kroky

| Krok | Příkaz | Co dělá | Zapisuje ven |
|---|---|---|---|
| Zjištění | `zjisti` | Pošle HEAD na sledované adresy z registru a porovná s tím, co už linka zná. Vznikne úloha pro nové období, revizi nebo zmizelý zdroj | ne |
| Příprava | `priprav` | Stáhne soubor, spočítá sha256, zkontroluje strukturu a spustí zpracovatele sady do pracovního adresáře | ne |
| Oznámení | `oznam` | Pošle shrnutí s kódem úlohy a návodem ke schválení | Telegram, GitHub issue |
| Schválení | `schvaleni` | Přečte odpovědi „schvaluji KÓD“ nebo „zamítám KÓD“ z povoleného kanálu a každé rozhodnutí potvrdí | Telegram, komentář v issue |
| Předání | `predej` | U schválené úlohy vytvoří větev s výstupy a pull request, pošle odkaz a uzavře issue | git push, pull request, Telegram, issue |

`beh` provede zjištění, přípravu a oznámení najednou. `stav` vypíše frontu úloh.

`znovu KÓD --duvod …` vrátí uzavřenou úlohu (předanou, bez změny, zamítnutou nebo selhanou) do stavu `zjisteno`, typicky když sada mezitím dostala zpracovatele. Předchozí příprava, oznámení a rozhodnutí zůstanou v `predchozi_kola`; úloha se znovu připraví, oznámí a čeká na **nové** schválení, protože zprávy starší než oznámení se ignorují.

Všechny kroky přijímají `--nanecisto`: nic nepošle, nic nepushne, jen vypíše, co by udělal, a oznámení uloží do souboru.

## 2. Úloha a její stavy

Úloha je jeden zjištěný rozdíl u jedné sady a jednoho období. Kód úlohy se odvozuje ze sady, období, adresy a data změny souboru, takže tentýž rozdíl dostane vždy tentýž kód a nikdy se neoznámí dvakrát.

```
zjisteno → pripraveno → oznameno → schvaleno → predano
                ↘ selhalo      ↘ zamitnuto
```

| Druh úlohy | Kdy vznikne |
|---|---|
| `nove_obdobi` | Zdroj má soubor pro období novější, než web zobrazuje |
| `revize` | Soubor pro zobrazené období se změnil po datu, kdy jsme ho převzali |
| `zmizelo` | Zdroj, který dříve existoval, vrací 404 |

Úlohy vznikají jen pro sady s použitím `web` nebo `planovano`. Ostatní sady linka jen zapíše do přehledu, aby oznámení nezahlcovala.

Fronta je v `data/linka/fronta.json`. Pracovní soubory ve `data/linka/prace/<KÓD>/` se do gitu neukládají.

## 3. Zpracovatelé

| Sada | Zpracování | Předání po schválení |
|---|---|---|
| `cermat-uchazeci-kolo1` | kontrola povinných sloupců, `build-pasma-prijeti.py` a `build-soubeh-prihlasek.py` do pracovního adresáře, srovnání s tím, co je na webu | větev s novými soubory `public/pasma_prijeti_<rok>.json` a `public/soubeh_prihlasek_<rok>.json` a pull request |
| `cermat-maturita` | k jarnímu souboru stažení tří předchozích jarních ročníků, `build-maturita-skoly.py` s doplněním do stávajícího výstupu, kontrola povinných sloupců češtiny (včetně pasti směrodatné odchylky a percentilu), pojistka proti poklesu počtu škol; stav po podzimu se nezpracuje | větev s `public/maturita_skoly.json` a pull request; web ho čte až po přepnutí období v registru |
| `cermat-kolo2-agregaty` | stažení výsledků 1. kola téhož roku, `build-druhe-kolo.py` s doplněním ročníku do stávajícího výstupu, pojistka proti nabídkám bez 2. kola | větev s `public/druhe_kolo.json` a pull request; web nový rok ukáže až po přepnutí období v registru |
| ostatní | stažení, sha256, listy, hlavička, počet řádků, změny struktury proti předchozímu souboru | záznam rozhodnutí ve frontě a doporučený ruční krok |

Změna struktury, například přejmenovaný list nebo chybějící sloupec, úlohu nezastaví, ale v oznámení je uvedena jako první věc. Chybějící povinný sloupec zpracování zastaví a úloha skončí ve stavu `selhalo` s vysvětlením.

## 4. Oznámení a schválení

Oznámení obsahuje kód úlohy, sadu, období, druh změny, datum zveřejnění, velikost a otisk souboru, výsledek kontroly struktury, shrnutí zpracování a přesně to, co se stane po schválení.

Schvaluje se odpovědí v témže kanálu:

```
schvaluji K7Q2
zamítám K7Q2
```

Na velikosti písmen a diakritice nezáleží. Kód lze vynechat, když je jasné, čeho se zpráva týká:

| Zpráva bez kódu | Týká se |
|---|---|
| komentář „schvaluji“ v issue úlohy | té úlohy |
| odpověď „schvaluji“ na oznámení v Telegramu | všech dosud nerozhodnutých úloh z toho oznámení |
| „schvaluji vše“ | všech oznámených nerozhodnutých úloh |
| „schvaluji“ jinde | jediné čekající úlohy; čeká-li jich víc, linka se zeptá |

Linka přijme odpověď jen:

- z Telegramu od nastaveného `TELEGRAM_CHAT_ID`, nebo z komentáře GitHub issue od vlastníka repozitáře;
- odeslanou až po oznámení dané úlohy.

**Každé rozhodnutí linka potvrdí** do Telegramu i komentářem do issue úlohy: co přijala, odkud a co bude dál. Po předání pošle odkaz na pull request a issue uzavře. Když předání selže, oznámí chybu jednou, úloha zůstane schválená a další běh to zkusí znovu. Na zprávu, která schválení zmiňuje, ale linka jí nerozumí (neznámý kód, víc čekajících úloh bez kódu, jiný tvar), odpoví v tomtéž kanálu, co čeká na rozhodnutí. Bez odpovědi zůstane jen zpráva od cizího odesílatele, zpráva starší než oznámení a opakované stejné rozhodnutí z druhého kanálu. Každou zprávu zpracuje jednou; identifikátory zpracovaných zpráv drží fronta 30 dní.

**Kdy se schválení zpracuje.** Komentář v issue se štítkem `nova-data` spustí workflow okamžitě, potvrzení přijde zhruba do minuty. Telegram workflow spustit neumí, proto se kontroluje každých 15 minut; když ve frontě nic nečeká na rozhodnutí ani předání, běh skončí hned po obnovení fronty.

Telegram čte bez posunu offsetu, takže nespotřebuje zprávy jiným nástrojům. Telegram ale drží nepotvrzené zprávy jen 24 hodin a jiný nástroj je může potvrdit dřív. Záložní cesta proto vždy existuje:

```
python3 scripts/datova-linka.py schvaleni --kod K7Q2 --rozhodnuti schvaleno
```

## 5. Bezpečnostní hranice

1. **Linka nepřepíná období.** Předání vytvoří jen pull request. Web se změní až po jeho sloučení a po `prepni` v registru.
2. **Pull request se neotevírá bez schválení.** `predej` odmítne úlohu v jiném stavu než `schvaleno`.
3. **Předání nesahá do pracovního stromu správce.** Větev vzniká v dočasném `git worktree`.
4. **Schválení přijímá jen povolený odesílatel.**
5. **Tajemství nejsou v repozitáři.** Telegram bere token z proměnných prostředí nebo z `.env` mimo repozitář, GitHub Actions ze secrets.

## 6. Provoz

**Lokálně:**

```
python3 scripts/datova-linka.py beh --kanal telegram
python3 scripts/datova-linka.py schvaleni
python3 scripts/datova-linka.py predej --vse-schvalene
```

**GitHub Actions**, soubor `.github/workflows/datova-linka.yml`: v pondělí ráno `beh`; `schvaleni` a `predej` po komentáři v issue datové linky a každých 15 minut. Fronta se mezi běhy ukládá do větve `linka/stav`, a to jen když se změnila, takže pravidelné kontroly nevytvářejí commity ani náhledová nasazení. Frontu uloží i běh, ve kterém předání selhalo. Potřebné secrets: `TELEGRAM_BOT_TOKEN` a `TELEGRAM_CHAT_ID`; pro pull requesty stačí vestavěný `GITHUB_TOKEN` s právy `contents` a `pull-requests`.

## 7. Testy nanečisto

`python3 -m unittest tests/test_datova_linka.py` spustí celou linku proti falešnému zdroji na lokálním HTTP serveru a proti falešnému Telegram API. Ověřuje:

1. zjištění nového období, revize, zmizelého zdroje a tichý zápis souboru, který už máme;
2. že opakovaný běh nezaloží tutéž úlohu znovu;
3. přípravu se syntetickým souborem uchazečů včetně skutečného spuštění zpracovatelských skriptů;
4. zastavení při chybějícím povinném sloupci a ohlášení přejmenovaného listu;
5. text oznámení a jeho doručení do falešného Telegramu;
6. schválení i zamítnutí, odmítnutí cizího odesílatele a zprávy starší než oznámení; potvrzení do Telegramu a do issue, zpracování zprávy jen jednou, schválení bez kódu, tiché opakované rozhodnutí z druhého kanálu a jediné hlášení opakované chyby předání;
7. předání nanečisto: plán větve, souborů a pull requestu bez jediného volání gitu.

## 8. Ověření 13. 9. 2026

**Testy nanečisto:** 22 testů v `tests/test_datova_linka.py` prošlo. Kromě bodů z oddílu 7 pokrývají příznak přijetí zapsaný jako text, prázdný výsledek zpracování, podezřele málo oborů proti webu, změnu pořadí sloupců a poškozený soubor.

**Ostrý běh nanečisto proti skutečným zdrojům** našel tři chyby, které testy se syntetickými daty neukázaly:

1. **Tiché selhání zpracování.** V souborech uchazečů za rok 2026 a ve finální revizi roku 2025 zapisuje CERMAT příznak přijetí jako text „1“ místo čísla 1. `build-pasma-prijeti.py` proto nenašel žádného přijatého a vyrobil prázdný výstup bez chyby. Opraveno; linka navíc nově označí úlohu jako selhanou, když zpracování vrátí nula oborů nebo méně než polovinu oborů, které jsou na webu.
2. **Změna pořadí sloupců.** Skóre se v nových souborech přesunulo na začátek. Linka to nově hlásí. `scripts/enrich_schools_data.py`, který čte sloupce podle pozice a počítá nejnižší přijatý výsledek do katalogu, by na nových souborech počítal chybně; linka ho nespouští a riziko je zapsané v registru.
3. **Falešná revize rejstříku.** Snímek k 30. 6. 2026 se hlásil jako revize, protože registr neznal datum stažení. Doplněno.

**Ostrý běh s oznámením:** zjištěny čtyři úlohy, připraveny a oznámeny přes Telegram.

| Kód | Sada | Období | Druh | Výsledek přípravy |
|---|---|---|---|---|
| QNYPE | cermat-uchazeci-kolo1 | 2025 | revize | 2 846 oborů, 1 497 s pásmy; nejnižší přijatý se proti webu mediánově nemění |
| 3GQMK | cermat-uchazeci-kolo1 | 2026 | nové období | 2 879 oborů, 1 485 s pásmy; nejnižší přijatý se proti roku 2025 posouvá mediánově o 5 bodů |
| GQ99C | cermat-maturita | 2026 | nové období | staženo a zkontrolováno, 98 sloupců, 3 738 řádků; bez automatického zpracování |
| HYUWH | csi-inspis | — | zdroj zmizel | datová sada 70 vrací 404 |

Čtení schválení z Telegramu proběhlo proti skutečnému API bez spotřebování zpráv. Opakované zjištění nezaložilo žádnou novou úlohu.

**Ostře zatím neověřeno:** založení GitHub issue, předání s pull requestem a běh v GitHub Actions. Předání je otestované nanečisto a s falešným gitem; workflow se aktivuje až po pushi a vyžaduje secrets `TELEGRAM_BOT_TOKEN` a `TELEGRAM_CHAT_ID`.

## Historie

| Verze | Změna |
|---|---|
| 1.4 | Potvrzování rozhodnutí a výsledku předání, odpověď na nesrozumitelné schválení, schválení bez kódu, okamžité zpracování komentáře v issue a kontrola Telegramu každých 15 minut. Důvod: 14. 9. 2026 správce schválil GQ99C v Telegramu i v issue #89 a nedostal žádnou odezvu; denní kontrola ještě neproběhla a linka potvrzení vůbec neposílala. Návod v oznámení nově uvádí skutečný kód místo zástupného „KÓD“, který se dal opsat doslova. |
| 1.3 | Příkaz `znovu` pro znovuotevření uzavřené úlohy; použit 14. 9. 2026 u GQ99C (maturita jaro 2026), kterou 13. 9. linka předala bez souborů, protože sada ještě neměla zpracovatele. Nové oznámení: issue #89. |
| 1.2 | Zpracovatel maturitních výsledků (`cermat-maturita`), ověřeno nanečisto 14. 9. 2026: úloha pro jaro 2026, 1 112 škol, roky 2023–2026. |
| 1.1 | Výsledky ověření: testy nanečisto, tři chyby nalezené ostrým během nanečisto, první ostré oznámení. |
| 1.0 | Plán a provozní příručka. |
