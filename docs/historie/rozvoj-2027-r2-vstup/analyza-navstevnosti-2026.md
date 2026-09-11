# Analýza návštěvnosti 2026 a její dopad na rozvoj 2027

Verze **1.2 / A1-V**, doplněno 11. 9. 2026 o Vercel jako další zdroj (jeho statistiky zatím nenačteny). Číselný základ byl ověřen 11. 9. 2026 přes Matomo API, `idSite=7`, časové pásmo Europe/Prague. Období **11. 2.–11. 9. 2026 včetně**, poslední den průběžný. [Původní analýza v1.0](historie/navstevnost-a1/analyza-navstevnosti-2026.md) je zachována; změny a rozdíly jsou na konci. Závěry zde rozlišují měřená data, interpretace a navržené kroky.

## 1. Co z toho měníme v projektu

- **Oprava simulátoru zůstává první dodávkou.** Dvě sledované adresy mají 4 062 zobrazení a 2 652 vstupů. To dokládá dosah nynějšího rozhraní, nikoli způsobenou škodu. O-13 už je v R1 blokátor; návštěvnost jeho prioritu potvrzuje, nemusíme ji znovu povyšovat.
- **Můj výběr musí začínat přímo u nalezeného oboru.** Část `/skola/` včetně podstránek má v úplném exportu 14 462 zobrazení. Akce „Uložit do výběru“ má být v profilech, hledání i opraveném simulátoru. Není vhodné vyžadovat návrat na hlavní stránku nebo dokončení průvodce. To je produktový závěr v souladu se schváleným D1.
- **Telefon je výchozí ověřovací zařízení.** Smartphone a phablet tvoří 65,4 % měřených návštěv. Funkční průchod na telefonu je podmínka vydání, ne doplňková kontrola. Statistika sama nevybírá mezi seznamem a kartami; to ověří pilot.
- **Před hodnocením nových funkcí doplnit měření úkonů a ověřit přechody mezi stránkami.** Report událostí je prázdný a kód obsahuje pouze úvodní `trackPageView`. Z těchto dat zatím nezměříme úspěšné uložení, porovnání ani synchronizaci. Opravené měření nesmí odkládat odstranění zavádějících kategorií simulátoru.

## 2. Měřený základ a sezónnost

**DATA.** Celkem 25 762 návštěv, 46 289 akcí, z toho 44 527 zobrazení stránek. Akce zahrnují také hledání, odchozí odkazy a stahování; původní sloupec „Zobrazení“ uváděl počet všech akcí. Návštěva je relace měření, nikoli unikátní dítě či rodina. Rozlišení metrik vychází z [Matomo Reporting API](https://developer.matomo.org/api-reference/api) a uloženého [souhrnu odpovědí](podklady/navstevnost-2026-overeni-v1.1.json).

| Období včetně mezních dní | Návštěvy | Všechny akce | Zobrazení stránek | Bounce | Průměrný čas |
|---|---:|---:|---:|---:|---:|
| 2026-02-11–2026-02-28 | 7 847 | 16 739 | 16 062 | 65 % | 391 s |
| 2026-03-01–2026-03-31 | 3 464 | 5 081 | 4 832 | 76 % | 154 s |
| 2026-04-01–2026-04-30 | 3 458 | 5 067 | 4 923 | 73 % | 184 s |
| 2026-05-01–2026-05-31 | 6 349 | 12 681 | 12 216 | 68 % | 381 s |
| 2026-06-01–2026-06-30 | 1 582 | 2 055 | 1 980 | 83 % | 94 s |
| 2026-07-01–2026-07-31 | 924 | 1 217 | 1 181 | 81 % | 124 s |
| 2026-08-01–2026-08-31 | 1 223 | 2 069 | 2 013 | 79 % | 238 s |
| 2026-09-01–2026-09-11 | 915 | 1 380 | 1 320 | 74 % | 143 s |

**INTERPRETACE.** Únor a květen mají v dostupném období vyšší objem než léto. Poměr naměřených únorových návštěv ke srpnovým je **6,42×**, nikoli osmkrát. Únor je přitom jen od 11. dne. Květen měl 4 435 identifikovaných návštěvníků, únor 4 969; tvrzení v1.0, že květen má nejvíce unikátních, neplatí. Identifikované návštěvníky nelze sčítat mezi měsíci ani vydávat za osoby.

Souvislost vrcholů s přihláškami a výsledky je pravděpodobná interpretace načasování, nikoli prokázaná příčina. Nemáme podzim 2025 ani říjen–prosinec 2026, takže **růst od listopadu data nedokládají**. Založení webu v Matomo 11. 2. a první dostupný únorový report nepotvrzují úplnost každého dne sledování. Chybějící začátek února nelze automaticky dopočítat jako jistý vyšší vrchol.

**DOPAD.** Opravu S0 připravit nyní; **31. 10. 2026 je doporučený nejzazší interní termín před listopadovými přihláškami na konzervatoře**, odvozený z kalendáře, nikoli predikce návštěvnosti. Mezi roky zatím nesrovnávat. Při běžném reportování používat dokončené dny a srovnatelně dlouhá období; sezónní pokles nevykládat automaticky jako zhoršení produktu.

## 3. Ukládání patří do profilů a opraveného simulátoru

**DATA.** Úplný report používá `flat=1` a `filter_limit=-1`. Následující skupiny jsou disjunktní; přesné adresy se neliší jen kosmeticky, jejich rozsah uvádíme záměrně.

| Skupina | Zobrazení | Vstupy | Vymezení |
|---|---:|---:|---|
| Hlavní stránka | 17 771 | 10 128 | Přesná adresa `/`, bez variant s parametry |
| Školní profily a podstránky | 14 462 | 7 768 | Všechny řádky začínající `/skola/`, včetně agregátu Others |
| Simulátor, dvě adresy | 4 062 | 2 652 | `/simulator` a `/simulator?srovnani=1` |
| Ostatní adresy | 8 232 | 4 892 | Zbytek reportu |
| Součet reportu | 44 527 | 25 440 | Zobrazení souhlasí s Actions.get; vstupy mají rozdíl 322 vůči návštěvám webu |

Simulátor je v tomto srovnání třetí konkrétní funkční oblast za hlavní stránkou a profily; původní formulace „druhá vstupní stránka po hlavní stránce a profilech“ byla nekonzistentní. Jeho dvě adresy představují 10,3 % z celkových návštěv webu ve formě zaznamenaných vstupů. Nevykládáme to jako podíl osob, které viděly chybný výsledek.

Samotné `/simulator` má 3 286 zobrazení, 2 768 návštěv této URL a 2 165 vstupů; `?srovnani=1` má 776, 647 a 487. Návštěvy URL nelze sečíst jako unikátní návštěvy obou variant — tentýž návštěvník mohl v jedné relaci otevřít obě. Totéž platí pro součet návštěv jednotlivých profilů. Původní měsíční sloupec „Návštěv celkem“ neodpovídá `VisitsSummary.nb_visits`; většina hodnot odpovídá součtu návštěv URL. U prvních čtyř měsíců se navíc nepodařilo přesná čísla v1.0 reprodukovat z úplného exportu; původní parametry nad rámec přílohy a surová odpověď nebyly doloženy. Nenahrazujeme je domnělou příčinou.

**DATA.** V `/skola/ - Others` je 12 137 zobrazení. Toto není celý souhrn profilů a skupinu nelze rozbalit jen změnou `filter_limit`. V1.0 uvedených 12 208 zobrazení všech profilů se nepodařilo reprodukovat; aktuální součet prefixu dává 14 462. Nejde o doklad růstu návštěvnosti od původní analýzy, ale o rozdíl vymezení/reprodukce. [Matomo — archivace do Others](https://matomo.org/faq/how-to/faq_54/).

**DOPAD.** Nabídnout uložení u konkrétního oboru, po uložení malou akci „Otevřít Můj výběr“ a jasný stav „Uloženo v tomto prohlížeči“. Profil má fungovat samostatně i po vstupu z externího odkazu: vysvětlit školu/obor, stav roku 2027, zdroje a další krok. Je to navržená reakce na návštěvnost; report zatím neměří její účinnost. Na profily patří i opravy identity a interpretace, protože mají doložený dosah. Pořadí konkrétních škol z reportu s Others nevyvozovat.

**O-4:** Moje šance má 1 324 zobrazení proti 4 062 u dvou adres simulátoru. Nižší provoz není důkaz bezpečnosti mrtvého kódu. Menší naléhavost O-4 vyplývá z nevykreslování osobních predikcí; odstranění zůstává v S0.

## 4. Telefon a návrat k výběru

**DATA.** Zařízení: smartphone 15 155, phablet 1 689, desktop 8 693, tablet 212, neurčené 13 návštěv; celkem 25 762. Telefony/phablety 65,4 %, s tablety 66,2 %. Nejde o spolehlivou identifikaci dotykového ovládání všech zařízení ani věku uživatele.

**DOPAD.** Pilot musí zahrnout přímý vstup na profil → uložení → otevření výběru → porovnání → změnu pořadí na telefonu bez přesného přetahování. Ověřit úzké šířky 360/390 px, klávesnici, čitelné zdroje, srovnání dvou oborů a zachování rozpracované práce při přihlášení. Mobilní chyba v tomto průchodu blokuje vydání. Konkrétní rozložení nadále ověří rodiny.

**DATA.** `VisitFrequency.get` vrací 11 937 vracejících se návštěv (přibližně 46,3 % celku), průměr 272 sekund. Celkový průměr je 285 sekund, u nových 296 sekund. V1.0 uvedené „výrazně nad průměrem“ je chybné. Součet nových a vracejících se návštěv je o osm vyšší než VisitsSummary; rozdíl evidujeme jako nevyřešený, poměr návratů je proto orientační. Identifikace závisí na nastavení měření a prohlížeči.

**INTERPRETACE.** Opakované používání se v měření vyskytuje, ale nevíme, kolik jde o rodiny připravující stejný výběr ani proč se vracejí. Okamžité uchování práce a volitelný účet jsou již schválená rozhodnutí, nikoli nový závěr o ochotě registrovat se. Přínos zálohy a sdílení musíme teprve měřit dokončením těchto úkonů.

## 5. Distribuce: měřit odkazy, neodvozovat příčiny z přímých vstupů

**DATA.** Přímé vstupy 13 256 (51,5 %), vyhledávače 5 649 (21,9 %), sociální sítě 2 626 (10,2 %), AI asistenti 2 167 (8,4 %), odkazující weby 1 650 (6,4 %), kampaně 414 (1,6 %). Součet souhlasí s návštěvami webu. Jde o kategorie rozpoznané Matomo, nikoli o úplný původ všech návštěvníků.

**INTERPRETACE.** Přímý vstup může být záložka nebo napsaná adresa, ale také chybějící informace o zdroji; nedokazuje znalost značky ani doporučení poradcem. Podíl AI asistentů nedokazuje účinek `llms.txt`, který jsme žádným experimentem neměřili. Korelace mezi kanálem a existencí souboru není návratností investice. Návštěvy připsané AI asistentům rovněž nejsou počtem stažení Markdown/JSON endpointů crawlery; strojový odběr bez spuštění měřicího JavaScriptu vyžaduje samostatnou evidenci. [Matomo — zdroje návštěv](https://matomo.org/faq/reports/what-are-referrers/).

**DOPAD.** Zachovat indexovatelné profily, stabilní odkazy, čitelné prameny a SEO: 21,9 % je podstatný zdroj. Distribuci přes ZŠ a poradce ověřit omezeným pilotem se značenými odkazy. Kampaňový parametr má identifikovat materiál či distribuční skupinu, nikoli konkrétní dítě nebo jeho e-mail. Vyhodnocovat následné úkony, ne jen počet prokliků. Údaje nedokládají, že máme SEO odsunout, ani že musíme přednostně investovat do zvláštní optimalizace pro AI.

## 6. Hledání ukazuje možné úlohy, nikoli úplné preference dětí

Původní výpis dotazů zahrnuje názvy škol i kombinaci oboru a města. Při ověření bylo za období zaznamenáno 538 akcí interního hledání a 261 různých klíčových slov. Objem je malý vůči provozu a úplnost zachycení hledání není prokázaná. Volné dotazy z rutinních reportů nepublikujeme do Git; původní příklady jsou uchovány ve snímku v1.0.

**DOPAD.** Otestovat hledání podle názvu, lokality a oboru, diakritiky a překlepů na připravených případech. Před rozhodnutím o rozsahu publika ověřit, které ovládací prvky hledání skutečně odesílají záznam. Z této malé podmnožiny nelze vybrat podporované typy škol ani pořadí rozvoje oborů.

## 7. Chybí měření výsledku práce v rozhraní — úkol M0

**OVĚŘENO V KÓDU.** `src/app/layout.tsx` obsahuje úvodní `trackPageView` a `enableLinkTracking`. V prohledaném `src` nebylo nalezeno další vlastní `trackPageView`, `setCustomUrl` ani `trackEvent`. `Events.getCategory` vrací prázdný report a VisitsSummary nulové konverze. To nedokazuje, že lidé neprovádějí užitečné kroky. Vnější konfigurace Matomo nebyla měněna ani kompletně auditována.

**RIZIKO.** Klientské přechody Next.js mohou být podměřené; samotný iniciační skript jejich zachycení nedokládá. [Oficiální postup pro SPA](https://developer.matomo.org/guides/spa-tracking) vyžaduje měření nové virtuální stránky. V tomto kole nebyl proveden prohlížečový průchod se sledováním síťových událostí, proto rozsah ztráty netvrdíme jako změřený.

**M0 — navržené zadání před vyhodnocováním pilotu:**

1. Ve zkušebním prostředí zachytit přímý vstup, klik na Next Link, zpět/vpřed a změnu relevantní adresy; každý skutečný přechod započítat jednou, žádné dvojité úvodní zobrazení. Filtr či otevření detailu měřit podle jasné definice, nikoli náhodně jako stránku.
2. Při zavedení Mého výběru měřit samostatně úspěšné místní uložení, otevření porovnání, dokončenou zálohu po potvrzení serveru a vytvoření odkazu k náhledu. Klik na tlačítko není důkaz dokončení. Vytvořený odkaz není důkaz jeho otevření druhou osobou.
3. U každé míry určit způsobilý základ a jednotku: například návštěvy profilu s nabídkou uložení → návštěvy s alespoň jedním úspěšným uložením. Opakované klikání nesmí uměle zvyšovat míru. Účet, prohlížeč a rodina jsou různé jednotky.
4. Nesbírat poznámky, e-mail, testové odpovědi, přesnou adresu ani přihlašovací a sdílecí tokeny. Před měřením nových rout očistit URL od jejich tajných částí; povolené vlastnosti události vyjmenovat.
5. Uchovat datum změny instrumentace; před/po něm nesrovnávat bez označení změny metodiky. Cílové míry stanovit až po získání platné výchozí hodnoty. Nezapínat automaticky další sběr, záznam relací či uživatelskou identifikaci.

Odhad pro kontrolu a základ opravy měření: **1–2 vývojářské dny**, pracovní předpoklad; případná změna serverových archivů vyžaduje samostatné ověření. M0 nesmí oddálit S0. Události dosud neexistujících funkcí patří do jejich realizace a nejsou dvakrát započteny jako hotová práce.

## 8. Dopady na plán a co zůstává otevřené

| Oblast | Rozhodnutí podle ověření A1 |
|---|---|
| O-13 / S0 | Prioritu potvrdit; opravu připravit nyní, doporučený nejzazší termín 31. 10. 2026. Stále neimplementováno. |
| M0 | Ověřit měření navigace a připravit definice úkonů před vyhodnocováním nových funkcí. |
| Profily a D1 | Jednotná akce uložení přímo z profilu, hledání a opraveného simulátoru; samostatně srozumitelný profil pro externí vstup. |
| Mobil | Blokující přijímací průchod, pokračování dříve navrženého požadavku; konkrétní rozložení ověřit pilotem. |
| Účet a sdílení | Zachovat schválený jednoduchý účet; nemáme data o zájmu o další rodinné účty ani o živý náhled versus snímek. |
| Historie JPZ a maturita | Profily mají dosah, ale používání těchto nových oddílů neznáme; zveřejňovat postupně s metodickými podmínkami R1. |
| Příprava | Návštěvy simulátoru nedokládají poptávku po AI tutorovi ani ochotu platit. Ověřit pilotem obsahu. |
| Distribuce | Pilot se značenými odkazy, zachovat SEO, žádný závěr o účinku llms.txt. |
| Kapacity | Pracovat s návrhem v2.1: S0+B+C 20–33 dnů, M0 navíc 1–2 dny; starých 26–39 dnů A–C se znovu nepočítá. |

Nevíme, kdo je žák a kdo rodič; zda někdo podle simulátoru špatně rozhodl; zda lepší ukládání zvýší návraty; jak poroste návštěvnost na podzim. Vysoký bounce sám není vada a průměrný čas není přímou mírou spokojenosti. Hlavní doporučení vycházejí z dosaženého provozu a existujících vad, nikoli z těchto nedoložených vysvětlení.

## 9. Reprodukce, kontroly a historie

Rutinní [přístup a příkazy](matomo-pristup.md) jsou připravené v `scripts/matomo-report.py`. Token je mimo repozitář, požadavky používají POST. Úplné surové odpovědi jsou uložené lokálně s omezenými oprávněními, do projektu vstupuje jen [souhrn s definicemi, parametry a kontrolními součty](podklady/navstevnost-2026-overeni-v1.1.json). Měsíční unikátní návštěvníci byli navíc ověřeni stejným `VisitsSummary.get`, `period=month`, `date=2026-02-01,2026-09-11` jako v1.0; nejsou součtem denních unikátních.

**Kontroly:** součet měsíčních návštěv, zařízení a kanálů odpovídá 25 762. Součet zobrazení řádků URL odpovídá 44 527. **Neuzavřené rozdíly:** součet vstupů URL je o 322 (1,25 %) nižší než návštěvy; součet nových a vracejících se návštěv o osm vyšší. Jejich příčinu nelze z pořízených agregátů potvrdit. Rozdíly nejsou tiše přerozdělené a tyto metriky nepoužíváme pro přesný konverzní trychtýř.

| Tvrzení v1.0 | Vypořádání A1 |
|---|---|
| Únor osmkrát vyšší než srpen | Přepočet 7 847 / 1 223 = 6,42. |
| Květen má nejvíce unikátních | Únor 4 969, květen 4 435; opraveno. |
| Měsíční zobrazení 16 739 atd. | Šlo o všechny akce; doplněn samostatný sloupec skutečných zobrazení. |
| Návštěv celkem v tabulce kalkulaček | Nesprávný jmenovatel, nahrazen VisitsSummary; nepřesně reprodukovatelné hodnoty označeny. |
| Profily souhrnně 12 208 zobrazení | Úplný součet prefixu 14 462, rozsah a Others uvedeny. Příčina rozdílu původního výpočtu nedoložena. |
| Druhá vstupní stránka po hlavní a profilech | Opraveno s vymezením funkčních skupin a konkrétních URL. |
| Vracející se tráví nadprůměrně dlouho | 272 s proti 285 s celkem; tvrzení odstraněno. |
| Přímé vstupy dokazují zapamatování a doporučení | Neprokázaná interpretace; nahrazena podmíněnou hypotézou. |
| Podíl AI dokládá návratnost llms.txt | Kauzalita ani návratnost nebyly měřeny. |
| Provoz poroste od listopadu | Chybí podzimní pozorování; termín oprav odvozen od kalendáře, ne od predikce. |
| Nižší provoz Moje šance dokládá nenaléhavost | Vážnost O-4 vychází z nevykreslování vady, ne z návštěvnosti. |
| Starý odhad A–C 26–39 dnů | Nahrazen zbývajícím rozsahem z revidovaného návrhu, doplněn M0. |

| Verze | Datum | Autor | Změna |
|---|---|---|---|
| 1.0 | 11. 9. 2026 | Dodaná analýza | Původní podklad, zachován ve snímku A1 se SHA-256. |
| 1.1 / A1 | 11. 9. 2026 | Codex | Živé ověření Matomo, opravy metrik a interpretací, rutinní klient, dopady na profily/mobil a zadání M0. Neuzavírá oponenturu R1 ani neprovádí opravu aplikace. |
| 1.2 / A1-V | 11. 9. 2026 | Codex | Doplněn Vercel Web Analytics, ověřena identita projektu a místní integrace. Přístup k samotným statistikám čeká na přihlášení či export. Čísla A1 ani produktová rozhodnutí se nemění; předchozí v1.1 je v commitu `ed0fd98`. |

## 10. Vercel Web Analytics jako druhý zdroj

Uživatel doplnil [dashboard projektu za 30 dní](https://vercel.com/tangeros-projects/stredniskoly/analytics?period=30d). Přes Vercel konektor byla ověřena identita projektu `stredniskoly`, `prj_Yh3UGtfELluIwvXazLyVxF5JIPsD`, tým `team_6pc2wHKjeUuaXwZfCS3jOhvX` a doména `www.prijimackynaskolu.cz`. V místním `src/app/layout.tsx` je import `@vercel/analytics/react` a `<Analytics />`; instalovaná verze je 1.6.1. To dokládá integraci v kódu, ne úplnost produkčního sběru. Používá se obecná React varianta, proto bez kontroly nepředpokládáme dostupnost seskupení podle šablony Next.js route.

**Stav přístupu:** dostupný prohlížeč skončil na přihlášení, CLI 49.1.2 nemá přihlašovací údaje a dostupné MCP nástroje neobsahují čtení Web Analytics. Nebyly získány žádné počty z Vercelu. Prázdný či nepřístupný přehled nevykládáme jako nulovou návštěvnost. Matomo přístup zůstává funkční. [Návod k získání druhého podkladu](vercel-analytics-pristup.md).

**Co může přinést:** kontrolu denního vývoje zobrazení, využití profilů, simulátoru a zařízení. Vercel popisuje zachycení následných zobrazení přes nativní rozhraní prohlížeče; je proto užitečný pro prověření rizika podměřených přechodů v Matomo. Rozdíl agregátů sám ale příčinu nedokazuje — rozhodne průchod stejnou navigací se sledováním obou měření. [Princip měření Vercel](https://vercel.com/docs/analytics).

**Pravidla porovnání:**

1. Shodné dokončené dny, časové hranice a časové pásmo; žádné porovnávání odkazu „30d“ s celým únorem–zářím nebo výchozími 28 dny Matomo. Navržený první interval je 12. 8.–10. 9. 2026 včetně v Praze; dostupnost historie Vercelu ověřit podle tarifu.
2. Jen Production a stejný hostname; Matomo `idSite=7` samo neprokazuje omezení na jediný hostname. Před srovnáním ověřit jeho zahrnuté domény a případně segmentovat oba zdroje.
3. Porovnávat pageviews se zobrazeními stránek, nikoli s akcemi či relacemi Matomo. Návštěvníky systémů nesčítat a nevydávat za stejnou populaci osob. [Metodika identifikace Vercel](https://vercel.com/docs/analytics/privacy-policy).
4. Vercel Pages vynechává query parametry. Matomo adresy sloučit podle cesty, tedy i obě varianty simulátoru. Zachovat zvlášť profily a jejich podstránky; pro skupiny sečíst zobrazení, ne unikátní návštěvníky jednotlivých URL.
5. Zaznamenat omezení exportu: CSV z panelu má nejvýše 250 řádků. Není to automaticky úplný katalog navštívených škol. Neúplný součet porovnat s celkem a přiznat zbytek. [Vercel — panely a export](https://vercel.com/docs/analytics/using-web-analytics).

**Dopad na M0:** přejímka navigace a odstranění tajných částí URL musí pokrýt oba již přítomné trackery. Před přidáním událostí určit primární zdroj produktových ukazatelů; nenasazovat duplicitní sběr bez účelu. Vercel Web Analytics není log všech HTTP požadavků a nenahradí samostatné ověření strojových přístupů k API či llms.txt. Zatím není důvod měnit pořadí S0 → profily → Můj výběr ani snižovat odhad M0.
