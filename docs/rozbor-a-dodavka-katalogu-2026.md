# Rozbor 1 004 nabídek a dokončení simulátoru

Verze 1.0, 12. 9. 2026. Stav: implementováno, probíhá přejímka. Nabídka 2027 není tímto potvrzená.

## Co znamenalo číslo 1 004

Porovnávali jsme 3 091 záznamů importu výsledků 1. kola 2026 (`public/applications_2026.json`) s jednoznačnými identitami starého katalogu (`public/schools_data.json`, klíč 2025). Záznam znamená nabídku konkrétního oboru/zaměření na škole, nikoli unikátní školu nebo obecný obor vzdělání.

Těch 1 004 nabídek patří k 551 školám (REDIZO). Výsledky a přihlášky jsme již měli, ale vyhledávač začínal katalogem 2025, takže se k těmto záznamům nedostal.

| Důvod chybějící jednoznačné shody | Nabídek | Význam |
|---|---:|---|
| Jeden kandidát stejného REDIZO a KKOV | 517 | Liší se úplné ID, obvykle zaměření. Samotný počet kandidátů není důkaz totožnosti. |
| Více kandidátů stejného REDIZO a KKOV | 110 | Nutné odlišit zaměření, možné rozdělení či sloučení. |
| Kolize identit v katalogu 2025 | 26 | Všech 26 skupin obsahuje rozdílné hodnoty; nejde o identické kopie. Nelze vybrat první ani řádek s více přihláškami. |
| Škola existuje, daný KKOV ne | 307 | Může jít o odlišné pokrytí, nový obor nebo změnu; samotná absence nepotvrzuje vznik. |
| Chybí celé REDIZO | 44 | Jde o 34 škol mimo starý katalog, nikoli důkaz 34 nově založených škol. |
| **Celkem** | **1 004** | **978 bez klíče + 26 kolizí** |

Příklady: Malostranské gymnázium má v roce 2025 suffix `všeobecné`, v roce 2026 prázdné zaměření. U Gymnázia Na Pražačce se rozcházejí názvy německého a výtvarného zaměření. U OA Kubelíkova je Lyceum `78-42-M/08` mimo starý katalog. Toto jsou kandidáti a rozdíly importů, ne schválená meziroční mapování.

Reprodukce: `node docs/podklady/migrace-katalogu-2027/rozbor.mjs`. Úplný seznam a kandidáti jsou v `docs/podklady/migrace-katalogu-2027/rozbor-1004.json`; obsahuje hashe obou vstupů. Původní inventura a pracovní vzorek z 11. 9. jsou zachované.

## Jak mapovat a co nečeká na mapování

1. Publikovat nabídku 2026 pod vlastní identitou a zdrojem. To nevyžaduje domněnku o historii. Dodávka toto realizuje pro všech 3 091 nabídek.
2. Pro historickou návaznost vyžadovat REDIZO, IZO, KKOV, formu, délku, jazyk, adresu a doložené zaměření. Normalizace diakritiky či interpunkce je pomocný krok, nikoli důkaz přejmenování.
3. U změny názvu evidovat potvrzené předchozí a současné ID, typ vztahu (1:1, rozdělení, sloučení), zdroj, datum ověření a ověřovatele. U rozdělení/sloučení nepřebírat řádkové průměry ani kapacitu bez nové agregace.
4. U 26 kolizí obnovit historii z původního XLSX 2025; nevolit statistiku podle počtu přihlášek. U nejasného zaměření ověřit oficiální dokument školy nebo rejstřík.
5. Pro mapování dojezdu ověřit místo výuky, ne pouze sídlo školy. Nenalezený dojezd zůstává neověřený.

Ve zdrojových XLSX 2025 a 2026 není společné žádné ID_SOF. UUID zdrojového řádku tedy nelze použít jako trvalý meziroční identifikátor. Starý skript `scripts/match_obory_2025_2026.py` obsahuje i heuristiku výběru podle nejvyššího počtu přihlášek; pro tuto dodávku se nespouští ani neaktivuje.

## Co se změnilo

- Vyhledávání v hlavičce i simulátoru vychází z celého importu 2026. Samotné skóre není podmínkou existence nabídky.
- Do importu přidány původní ulice, PSČ, IZO, forma a jazyk studia. Historie 2025 nebyla přepsána novými statistikami.
- Jednoznačné staré profily si zachovávají původní odkazy. Nabídky bez profilu nebo s kolizí jeho URL mají detail podle zdrojového ID. Každá nabídka má odlišný cílový odkaz.
- Staré uložené položky lze dohledat samostatně; podobně nazvané nabídky je nepřepisují.
- Žebříček, filtry, uložený výběr, obory za limitem i neověřený dojezd používají stejnou tabulku/mobilní karty. Přepínač karet a filtr uložených fungují i v žebříčku.
- Stejné zadání bodů a porovnání je v Mém výběru. Další obory téže školy lze rozbalit a uložit také z tabulky.
- Sloupec „Srovnání s přijatými“, samostatné hlášení nezadaných bodů a chybějících zdrojových údajů. Podíl přihlášek není osobní šance.
- Deváťákům se nenabízejí dvouleté nástavby; všechny délky zůstávají pod přepínačem všech typů.
- Dodávka obsahuje předchozí opravy P0 z main.

## Aktuálnost zdroje a hranice dodávky

12. 9. 2026 znovu stažen soubor [CERMAT 1. kolo 2026](https://data.cermat.cz/files/files/JPZ/agregovana_data_skoly/PZ2026_kolo1_skolobory_vysledky.xlsx). SHA-256 `a003441f4beed6fb9c181aa00f9d1a59a9c206ff10f113ad807740e68d5511d5` je shodný s předchozím importem. [Katalog CERMAT](https://data.cermat.cz/data-a-analyticke-vystupy-jednotna-prijimaci-zkouska/agregovana-data-jpz.html) uvádí platnost 17. 8. 2026. Změna je tedy v dostupnosti a úplnosti využití dat, nikoli nová revize výsledků.

Import zahrnuje pouze denní nezkrácené obory s povinnou JPZ. Nepokrývá celé střední školství. Druhé kolo 2026 je samostatný dostupný zdroj a nesmí se smíchat s prvním kolem. Potvrzené kapacity, kritéria, termíny, kontakty a školné 2027, ostatní formy vzdělávání, konzervatoře a ověřené meziroční mapování zůstávají otevřené. Celý web proto nelze označit za kompletně aktualizovaný na rok 2027.

## Přejímka před nasazením

- TypeScript, cílený lint, standardní produkční build Next.js/Turbopack.
- 29 integračních kontrol nad produkčním sestavením: úplnost množiny 3 091 ID, jedinečnost cílových odkazů, detaily z každé vynechané skupiny, neexistující nabídka 404, zadržený průměr MESIT stále null a celá přejímka P0.
- Cílené jednotkové/renderovací kontroly porovnání, uloženého výběru, ostatních oborů a interpretace chybějících údajů.
- Skutečný prohlížeč 1440 px a 390 px: 40 bodů ČJ + 35 MA se porovnalo po předmětech; uložení přežilo načtení sdíleného odkazu, který přidal starý i nový obor. Šířka dokumentu na mobilu 390 px, bez přetékání. Režim karet a tabulky respektuje uložené položky.
