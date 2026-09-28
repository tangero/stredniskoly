# Modelový přepis kritérií DiPSy 2026 — malý vzorek

Měření 24. 9. 2026 používá Claude Haiku 4.5 v omezeném režimu bez nástrojů. Skript [`scripts/dipsy-kriteria-llm-vzorek.py`](../../scripts/dipsy-kriteria-llm-vzorek.py) má limit 0,04 USD na požadavek a nejvýše pět požadavků na běh. Výstupy jsou jen místně v gitignorovaném `data/dipsy-kriteria-2026/llm-pilot/`; jde o návrhy, ne o schválená pravidla. Model četl extrahovaný text s očíslovanými stranami, nikoli obraz PDF. Částky níže jsou `total_cost_usd` vykázané CLI na základě veřejného ceníku (`costBasis: list`); skutečné vyúčtování účtu z nich nepotvrzujeme.

Pět vybraných příloh má dřívější pracovní přepis v `src/data/kriteria-prijeti-2026-pilot.json`; další dvě přílohy byly zvoleny podle délky textu blízko mediánu (8 916 znaků) a 90. percentilu (18 324 znaků) korpusu. U nich není lidský přepis, slouží jen k měření spotřeby. Pět referenčních příloh je kratších než medián korpusu, proto jejich průměrná cena sama není použitelný odhad celé dávky.

| Běh | Počet požadavků | Cenový ekvivalent dle CLI |
|---|---:|---:|
| Úvodní ověření přihlášení a strukturovaného výstupu | 1 | 0,008023 USD |
| Zadání v1 na pěti referenčních přílohách | 5 | 0,081027 USD |
| Upravené zadání v2 na dvou sporných přílohách | 2 | 0,027828 USD |
| Zadání v2 na dvou delších přílohách | 2 | 0,063510 USD |
| Doplnění zadání v2 na zbývajících třech referenčních přílohách | 3 | 0,047382 USD |
| Celkem | 13 | 0,227770 USD |

Na pěti referenčních přílohách se poslední modelový návrh shodoval s pracovním přepisem v základním režimu `pouze_jpz`/`jine` u 5/5 a v číselné váze JPZ tam, kde ji pracovní přepis uvádí. To **neprokazuje přesnost na celém katalogu**. V podrobnostech se objevily chyby: první zadání mísilo bodované složky s úlevami pro cizince, dalšími podmínkami a minimy; při OCR příloze model napsal v popisu profilových známek „ČJL a FYZ“, ačkoli text PDF uvádí „MAT a FYZ“. Upravené zadání odstranilo mísení JPZ testů do dalších bodovaných složek a nechalo sporné celkové maximum prázdné, ale hranici „20 bodů z kteréhokoliv testu“ podalo jako jednoznačné pravidlo, zatímco pracovní přepis nechává výklad k potvrzení. Každý výstup proto vyžaduje kontrolu proti PDF; zvlášť čísla, minima a přiřazení pravidel ke konkrétnímu oboru.

Orientační výpočet ceny vychází ze sedmi různých dokumentů, pro každý bere poslední dostupnou verzi zadání. Jednoduchá lineární aproximace naměřené ceny podle délky textu vyšla `0,009073 USD + 0,000001513 USD × počet znaků`. V korpusu je 2 171 různých PDF s 22 365 273 znaky, ale 3 089 nabídek s celkem 36 218 406 znaky při opakování sdílených dokumentů. Aproximace tedy dává asi **54 USD pro jedno volání na různé PDF** nebo **83 USD pro jedno volání na každou nabídku**. První varianta sama o sobě nezajistí odlišná pravidla oborů, které sdílejí PDF; muselo by se nejprve ověřit, že jeden modelový výstup bezpečně pokryje všechny nabídky téhož souboru. Druhá varianta odpovídá chování nynějšího pilotního skriptu. Sedm dokumentů není reprezentativní cenový ani kvalitativní vzorek; délka odpovědí, OCR a cache mohou částku změnit. Jde o řád desítek USD za modelové návrhy, bez ceny lidského ověření.

Výpočet předpokládá přímá volání za ceny Claude Haiku 4.5: 1 USD za milion vstupních a 5 USD za milion výstupních tokenů; zápis hodinové cache stojí 2 USD za milion tokenů. Sazby a případná 50% sleva Batch API jsou v [oficiálním ceníku Anthropic](https://platform.claude.com/docs/en/about-claude/pricing). Sleva Batch API se na zde použitá volání CLI nevztahuje. Pro hromadný přepis je potřeba samostatně ověřit úplnost pravidel na víceoborových PDF, posoudit nejednoznačná minima a připravit redakční kontrolu; tento vzorek nic nezveřejňuje.

## Srovnávací vzorek DeepSeek Flash

Dne 24. 9. 2026 jsme stejných pět referenčních příloh přečetli modelem `deepseek/deepseek-v4.1-flash` přes OpenRouter, s endpointem DeepInfra. Přímý endpoint DeepSeek účet OpenRouter odmítl kvůli jeho nastavení soukromí; nastavení jsme neměnili. Skript [`scripts/dipsy-kriteria-deepseek-vzorek.py`](../../scripts/dipsy-kriteria-deepseek-vzorek.py) používá totožný text PDF, zadání v2 a schéma výstupu jako Haiku, vypnuté uvažování a oddělené místní výstupy v `data/dipsy-kriteria-2026/llm-pilot/deepseek/`. Endpoint a vypnutí uvažování znamenají, že porovnáváme konkrétní konfigurace, nikoliv všechny možnosti obou modelů.

| Metrika na stejných pěti přílohách | DeepSeek Flash | Haiku 4.5 (poslední dostupný návrh) |
|---|---:|---:|
| Vykázaná cena | 0,004242 USD | 0,075210 USD |
| Shoda základního režimu s pracovním přepisem | 5/5 | 5/5 |

DeepSeek byl v tomto vzorku podle vykázané ceny přibližně 17,7krát levnější. Haiku návrhy byly pro všech pět příloh znovu získány se zadáním v2, takže srovnání nepoužívá starší verzi zadání. Jde o pět kratších příloh, ne o ověřený odhad ceny či přesnosti celé dávky. Aktuální [ceník DeepSeek](https://api-docs.deepseek.com/quick_start/pricing/) pro přímá volání uvádí jinou sazbu podle času a cache; tento běh byl účtován podle endpointu DeepInfra na OpenRouter. Rozhodující je zde skutečná cena vrácená v `usage.cost`.

V podrobných údajích se objevily chyby, které brání automatickému schválení: u přílohy `99b859a5-9713-45a8-8de7-5562c4a8ab11` DeepSeek ve vzorci započítal pouze lepší z testů ČJL a MAT, přestože PDF uvádí pro JPZ celkem až 100 bodů a pro celé hodnocení 111 bodů. Nejasnost sice současně označil, ale vzorec je v rozporu se zbytkem dokumentu. Haiku v2 stejný text také vyložil jako lepší z obou předmětů, navíc neslučitelně s maximem 100 bodů za JPZ. U přílohy `aa2287b2-20f0-4017-a7aa-235223292753` DeepSeek vložil maxima testů mezi minima a hranici 20 bodů vyložil jako jistou, ač pracovní přepis nechává výklad k potvrzení; Haiku udělal poslední chybu také. U čistě JPZ přílohy `cf80b0c9-5404-41b5-946d-a27a95ff768c` DeepSeek vytvořil zbytečnou nejasnost o vahách navzdory výslovnému součtu testů. Naopak u přílohy `405c434b-a371-49ac-9c50-06b2d60453b6` výslovně zachytil nesoulad zaměření karty DiPSy s názvem v PDF; Haiku jej minul a mezi minima navíc zařadil zdravotní posudek.

Pro další pilot dává smysl DeepSeek jako levný zdroj pracovních návrhů, nad nimi automaticky kontrolovat součty, maxima a vzájemnou konzistenci polí. Sporné záznamy nesmějí automaticky přejít do detailního veřejného přepisu. Postup pro zvláštní pravidla, minima a víceoborová PDF je třeba změřit na větším vzorku; tento výsledek neopravňuje k hromadnému zveřejnění ani k výpočtu šance na přijetí.

## Sonda Jev jako kontrolní vrstvy

Původní návrh lidsky kontrolovat **každou** přílohu není při více než dvou tisících různých PDF provozně schůdný. Dne 24. 9. 2026 jsme proto vyzkoušeli existující rozhodovací model [`typesafe/jev-1.13`](https://openrouter.ai/typesafe/jev-1.13/) přes OpenRouter Decisions API. [Jev nevytváří text ani číselný vzorec](https://docs.typesafe.ai/concepts/system-one); vybírá z předem připravených odpovědí nebo hodnotí podloženost konkrétního tvrzení. To je jiná úloha než generativní přepis PDF.

Jev dostal u pěti referenčních nabídek text PDF (maximálně prvních 9 000 znaků), KKOV a zaměření. Na otázku, zda pořadí tvoří pouze prostý součet JPZ, nebo i váhy či další body, odpověděl ve shodě s pracovním přepisem **5/5**; jeho `confidence` bylo 0,86 u jediného `pouze_jpz` a 0,98–1,00 u čtyř `jine`. Náklad těchto pěti volání podle API byl **0,000525252 USD**. To je jen malá, již známá sada, nikoli změřená přesnost či kalibrace.

Ve třech ručně sestavených krátkých sondách dostal zdrojový výřez a zjevně problematický návrh. U tvrzení „počítá se jen lepší předmět ČJL nebo MAT, maximálně 50 bodů“ proti zdroji s maximem JPZ 100 bodů dal pravděpodobnost podloženosti `0,10`. U záměny maxima 50 bodů za minimum dal `0,02`; u záměny zaměření karty DiPSy s titulkem PDF dal `0,15`. Součet ceny tří sond byl **0,000062664 USD**. První sonda zároveň ukázala omezení: při samostatné otázce na správný výklad téhož zdroje Jev vybral **chybnou** variantu „jen jeden předmět“ s pravděpodobností 0,59 a nízkou `confidence` 0,39. Samotná odpověď Jevu tedy nesmí přepsat číselná fakta ani proměnit nejednoznačný text v jistotu.

Další krok bez plošné ruční kontroly: generativní model musí každé strukturované tvrzení podložit krátkým přesným úsekem PDF a číslem stránky; kód ověří přítomnost citace, identitu oboru, vztah minima a maxima, součty a vnitřní rozpory; Jev může zvlášť posoudit režim a sémantickou oporu **jednotlivých krátkých tvrzení**. Neshoda, chybějící důkaz, dlouhé nebo víceoborové PDF znamená stav `nezjisteno` nebo pouze obecnou informaci o zdroji. Druhý model může pomoci s řešením sporného případu, shoda dvou modelů však sama není důkaz správnosti. Práh automatického zveřejnění je třeba stanovit až na odděleném, stratifikovaném referenčním vzorku, který změří hlavně chyby propuštěné všemi kontrolami. Výsledek odvozený z PDF bez redakce se nesmí označit jako lidsky `overeno`.

### Pět případů v místním prohlížeči

Skript [`scripts/dipsy-kriteria-jev-pilot.py`](../../scripts/dipsy-kriteria-jev-pilot.py) položil Jevu u každé přílohy čtyři stejné otázky nad PDF a konkrétním návrhem DeepSeek: režim, opora vzorce, opora minim a vazba na obor. Výstupy jsou navázané na SHA-256 PDF i otisk zadání DeepSeek a uložené mimo Git. Pět volání stálo podle API dohromady **0,000690480 USD**. Hodnoty v tabulce jsou odpovědi Jevu na otázku „je tvrzení podložené?“, nikoli ověřená přesnost ani pravděpodobnost bezchybnosti celého záznamu.

| Nabídka | Režim Jevu | Opora vzorce | Opora minim | Vazba na obor |
|---|---|---:|---:|---|
| Gymnázium a SOŠ, Plasy | pouze součet JPZ | 0,90 | 0,72 | souhlasí |
| PED Academy gymnázium | jiné bodování | 0,81 | 0,37 | nejasná |
| Gymnázium Joachima Barranda | jiné bodování | 0,08 | 0,50 | souhlasí |
| VOŠ, SPŠ a OA | jiné bodování | 0,69 | 0,52 | souhlasí |
| SOU elektrotechnické | jiné bodování | 0,65 | 0,50 | souhlasí |

Sonda správně silně zpochybnila chybný vzorec u Joachima Barranda a upozornila na minima u PED Academy. U Plas naopak označila správná minima 11 + 11 bodů jako otázku k prověření při pracovním prahu 0,80; jde o falešný poplach. U SOU elektrotechnického vyhodnotila vazbu na obor jako souhlasnou, zatímco pracovní přepis a DeepSeek upozorňují na rozdíl zaměření v kartě a titulku PDF. Odpověď Jevu je proto užitečný signál, ne autorita. Prohlížeč s pěti PDF se spouští `python3 scripts/kriteria-review-local.py --pet` na `http://127.0.0.1:8767`; ukazuje i úryvky zdroje a starší pracovní přepis. Úryvky jsou vyhledané podle slov, nejsou ještě jednoznačně přiřazené ke každému číselnému tvrzení. To je otevřená práce před pokusem o automatické zveřejnění detailních pravidel.

Po kontrole původních PDF jsme v prohlížeči oddělili přesný součet maxim od automatického návrhu. PED Academy má JPZ 100 původních bodů × 60 % = nejvýše 60 bodů, školní test 30 a pohovor 10; celkem 100. Přepočet může vytvořit desetiny bodu a z tohoto vzorce ještě nelze odvodit zaokrouhlení. U Gymnázia Joachima Barranda je maximum 100 + 10 + 1 = 111; odvozený podíl JPZ 100/111 = 90,09 %. Jeho PDF formulací „lepší výsledek písemného testu“ mate, ale maximum 100 bodů za JPZ odpovídá [pravidlu lepšího výsledku za každý předmět ze dvou termínů](https://msmt.gov.cz/uploads/legislativa/skolskyzakon_kedni_1.9.2025.pdf), nikoli výběru jen ČJL nebo MAT. Stupnice známek 1 + 1 → 10, 1 + 2 → 8, ostatní → 0 vytváří osmibodový skok mezi kombinacemi 1 + 2 a 2 + 2. Není doloženo, jak časté tyto kombinace u uchazečů jsou, ani že osm bodů odpovídá osmi úlohám JPZ.

Absence náhradních 50 bodů za prominutý test ČJL sama o sobě není dírou v bodování: [§ 26 vyhlášky 422/2023 Sb.](https://msmt.gov.cz/uploads/legislativa/422_2023_1.1.2026.pdf) určuje redukované pořadí a jeho vložení do celkového pořadí. Pro slovní hodnocení poskytuje [MŠMT formulář převodu do klasifikace](https://msmt.gov.cz/vzdelavani/stredni-vzdelavani/prijimani-do-stredniho-vzdelavani-a-vzdelavani-v-konzervatori/prijimaci-rizeni-konane-ve-skolnim-roce-2026-2027-pro-prijeti-od-skolniho-roku-2027-2028), který vyplňuje původní škola. Barrandovo gymnázium uvádí jako pomocné kritérium při shodě pořadí na přihlášce, kdežto [informace DiPSy pro uchazeče 2026](https://www.prihlaskynastredni.cz/rodice-zaci.php) říká, že priorita nemá vliv na pořadí ve výsledkové listině školy. Tento rozpor je třeba metodicky vyjasnit; zde z něj nevyvozujeme nezákonnost kritérií. PDF nestanoví bodové minimum pro přijetí.
