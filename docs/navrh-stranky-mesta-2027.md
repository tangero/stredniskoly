# Návrh stránky města: jaké školy se u nás nabízejí

Verze 1.6 · 21. 9. 2026 · Stav: **zrealizováno, tři kola oponentury vypořádána** (oddíly 9 až 13)

Zadání zadavatele z 21. 9. 2026: „[/mesto/pardubice] je starý design přehledu škol pro města. Projdi jej a navrhni zlepšení, která umožní lidem lépe vidět, jaké školy se v jejich městech nabízejí. Ukazuj u škol viditelné hodnocení náročnosti přijetí, které u nich máme — aby si lidé udělali přehled, co jsou méně náročné a více náročné školy.“

Doplnění zadání z 21. 9. 2026: „Plus to chce přidat na [/mesto] možnost vyhledávat podle města a obecně do vyhledávače v horní liště dát možnost vyhledat město, když tam člověk zadá Pardubice, tak aby mu to nabídlo ‚Pardubice - kompletní přehled škol‘ a dovedlo ho to na link [/mesto/pardubice] — ne jen aby to našlo školy, které jsou v pardubicích.“ Řeší oddíl 6.

Posuzované stránky: [Pardubice](https://www.prijimackynaskolu.cz/mesto/pardubice), kód `src/app/mesto/[mesto]/page.tsx` (341 řádků), `src/components/CitySchoolsTable.tsx`, rozcestník `src/app/mesto/page.tsx` a vyhledávání `src/components/SchoolSearch.tsx` + `src/app/api/schools/search/route.ts`.

---

## 1. Dvě poznámky k zadání, které mění jeho provedení

**Slovo „náročnost“ se použít nesmí.** Slovník pojmů, oddíl 5, vede *náročnost školy* mezi zakázanými slovy u hesla obtížnost přijetí, a *obtížnost studia, kvalita školy (z přijímacích dat)* mezi slovy nepoužívanými vůbec, s důvodem „přijímací data popisují vstup, ne studium“. Zadavatelův význam je ale zachytitelný přesně: slovník pro tentýž údaj předepisuje název **obtížnost přijetí** a pro tabulku výslovně povoluje sloupec „Obtížnost přijetí“ s hodnotou „velmi těžké“. Návrh proto plní zadání pod tímto názvem.

**Řadit podle obtížnosti se nesmí.** Slovník ukazatelů u pořadí v kraji uvádí: „**Podle obtížnosti přijetí se neřadí**: pořadí podle podílu přijatých ze soutěžících uchazečů se mezi roky přehazuje, u osmiletého gymnázia J. S. Machara ze 7. na 17. místo z 32.“ Zadání „aby si lidé udělali přehled, co jsou méně náročné a více náročné školy“ se proto plní **filtrem a odznakem u každé nabídky**, ne novým řadicím sloupcem a ne žebříčkem. Rozdíl je podstatný: odznak popisuje jeden ročník a dá se ověřit ze zdroje, pořadí by tvrdilo trvalou vlastnost školy.

---

## 2. Co je na dnešní stránce špatně

Sešel jsem šest závad; první tři jsou porušení závazných pravidel projektu.

**2.1 Obtížnost přijetí na stránce vůbec není.** Hlavní věc ze zadání chybí. Data přitom existují a jsou hotová: pole `zarazeni_obtiznosti` v `public/souhrny_kolo1.json`, veličinu počítá `scripts/build-souhrny-kolo1.py`, práh zobrazení uplatňuje `zarazeniObtiznosti()` v `src/lib/obor-profil.ts`, popisky drží `ZARAZENI_POPISEK`. Stránka města tento soubor nečte — `src/lib/cityData.ts:126-128` načítá jen `schools_data.json`, `applications_2026.json` a `cermat_results_2026.json`.

**2.2 Letopočet 2026 je v kódu napevno, na 444 místech vykreslené stránky.** Pravidlo projektu zní: „Nikdy nepiš letopočet dat napevno do kódu ani do textu stránky. Období se bere z registru.“ Dnes je v `page.tsx` zadrátované v titulku, v popisu, v nadpisech sloupců („Kapacita 2026“, „Přihlášky 2026“, „Δ vs 2025“) i v názvech polí. Registr `public/stav_datovych_sad.json` přitom u sad `cermat-vysledky`, `cermat-prihlasky` a `cermat-kapacity` vede zobrazené období `2026` s `platne_k: 2026-08-17` — hodnota je tedy věcně správná, ale při přepnutí na ročník 2027 se stránka rozejde se skutečností na desítkách míst.

**2.3 Tři formulace porušují slovník pojmů.**

| Dnes na stránce | Proč je to závada | Místo toho |
|---|---|---|
| „o 1,3 méně → **dostupnější**“ / „o 1,3 více → **náročnější**“ (`page.tsx:140-141`) | průměr bodů přijatých vydává za dostupnost; slovník: „Neříká nic o náročnosti studia ani o kvalitě výuky. Popisuje, s jakými výsledky přicházejí spolužáci.“ | „spolužáci sem přicházejí s výsledky kolem … bodů“ |
| „**index zájmu**“, „**index poptávky**“ (hero, vysvětlivky) | ve slovníku ukazatelů se veličina jmenuje **přihlášky na místo** | „přihlášek na místo“ |
| „Pořadí v ČR“, „horní třetina / dolní třetina“ (`page.tsx:144-149`) | pořadí je definované **v kraji ve srovnatelné skupině**, ne v celé ČR napříč typy; „dolní třetina“ navíc čte jako známka | „pořadí v kraji podle výsledků přijatých“, vždy se skupinou, krajem a rokem |

**2.4 Přehled je oborový, ale tváří se jako školní.** Zadání mluví o školách („jaké školy se v jejich městech nabízejí“). Tabulka má 36 řádků nabídek za 13 škol v Pardubicích, takže jedna škola se opakuje až osmkrát a rodina nevidí, že jde o jeden dům. Hero přitom hlásí „31 historických oborů“ — číslo z jiné populace než tabulka, bez vysvětlení rozdílu.

**2.5 Blok „Analýza situace“ je pět odstavců výhrad, ne analýza.** `src/lib/cityNarrative.ts` vrací pevné věty s interpolovanými čísly — **žádný jazykový model se nevolá** (generování přes OpenRouter bylo odstraněno 11. 9. 2026, commit `c9ae452`). Zbyl ale zastaralý komentář „Generovat narativní text přes Claude API“ a `try`/`catch` na `page.tsx:204-210`, přestože funkce nemůže vyhodit. Věcná závada je jiná: ze pěti odstavců jsou čtyři metodické výhrady („Počet přihlášek není počtem unikátních dětí“, „Průměr přijatých není minimem nutným k přijetí“), tedy text, který patří do vysvětlivek pod tabulkou, ne do bloku nazvaného „Analýza situace“ na začátku stránky. Rodina dostane na prvním místě pět odstavců o tom, co čísla neříkají, a nikde větu o tom, co říkají.

**2.6 Hero nabízí čtyři čísla, z nichž tři rodina nepotřebuje.** „Historických oborů“, „míst celkem“, „přihlášek“ a „index zájmu“ jsou součty za město. Rodina nevybírá město — to už má —, vybírá v něm školu.

---

## 3. Co navrhuji

Pořadí bloků odpovídá otázkám, které rodina na městské stránce má: *Co tu vůbec je? Kam je snadné se dostat a kam těžké? Jak se sem chodí?*

### 3.1 Hero: jedna věta a rozložení obtížnosti

Místo čtyř součtů jeden pruh, který rovnou odpovídá na zadání. Pro Pardubice ze skutečných dat 1. kola 2026:

```
Střední školy — Pardubice
Pardubický kraj · 13 škol, 36 nabídek v 1. kole 2026

Jak se sem lidé dostali (1. kolo 2026, 36 nabídek):
■■■■■■■■■■■■■■ 14  místo bylo pro všechny, kdo splnili podmínky školy
■■■■■■■■         8  dostala se většina soutěžících
■■■■■■■■■■■     11  středně těžké
■■■              3  těžké
                 0  velmi těžké
```

Pruh je vodorovný, klikací a je to zároveň filtr tabulky. Rodina na jeden pohled vidí, že v Pardubicích je nejvíc nabídek, kam se dostal každý, kdo splnil podmínky, a že nic není „velmi těžké“ — to je ta informace, kterou zadání chce.

**Vysvětlení při prvním výskytu v bloku** (povinné podle slovníku pojmů, pravidlo 2), pod pruhem jednou větou: „Obtížnost přijetí říká, kolik *soutěžících uchazečů* se na obor dostalo — tedy těch, kdo splnili požadavky školy a nedostali se na obor, který měli na přihlášce výš. Popisuje jeden ročník, ne kvalitu školy ani obtížnost studia.“

### 3.2 Seskupení po školách místo 36 řádků nabídek

Jedna karta = jedna škola, v ní její nabídky. Škola nese souhrn, nabídka detail:

```
┌────────────────────────────────────────────────────────────┐
│ Gymnázium Pardubice, Dašická 1083            [GY4] [GY8]   │
│ Dašická 1083, Pardubice · zřizovatel: kraj                 │
│                                                            │
│  Gymnázium — všeobecné, 4leté                              │
│    ● středně těžké   68 míst · 3,1 přihlášky na místo      │
│  Gymnázium — všeobecné, 8leté                              │
│    ● těžké           30 míst · 4,8 přihlášky na místo      │
└────────────────────────────────────────────────────────────┘
```

Tím se odpovídá na „jaké školy se nabízejí“: 13 karet místo 36 řádků, a je vidět, že jde o jeden dům se dvěma nabídkami různé obtížnosti.

### 3.3 Odznak obtížnosti u každé nabídky

Pět stupňů, názvy a věty **přesně ze slovníku** (nic nového se nezavádí):

| Hodnota v datech | Odznak v tabulce | Věta u nabídky |
|---|---|---|
| `kapacita_nerozhodovala` | místo pro všechny | Místo bylo pro všechny, kdo splnili podmínky školy |
| `vetsina_uspela` | dostala se většina | Dostala se většina soutěžících |
| `stredne_tezke` | středně těžké | Dostat se sem je středně těžké |
| `tezke` | těžké | Dostat se sem je těžké |
| `velmi_tezke` | velmi těžké | Dostat se sem je velmi těžké |

**Vždy s podílem a rokem**, jak slovník vyžaduje, protože zařazení zůstalo mezi roky 2025 a 2026 stejné jen u 48,9 % nabídek: „dostat se sem je středně těžké: ze 112 soutěžících uchazečů se v 1. kole 2026 dostalo 61; v roce 2025 se dostala většina“. Podíl slovy dává hotová `slovniPodil()`.

**Barva:** neutrální stupnice (šedá → tmavší), **ne červená/zelená**. Dnešní tabulka barví přihlášky na místo červeně nad 3× (`CitySchoolsTable.tsx`), což čte jako „špatná škola“. Obor, kam se dostal každý, není horší škola; je to jiná poptávka.

**Kde se odznak nezobrazí:** pod 10 soutěžícími uchazeči (jeden uchazeč by přehodil stupeň) a u oborů, které v zobrazeném ročníku nemají data. Pak se místo odznaku píše, proč chybí. V Pardubicích **nepadá pod práh ani jedna z 36 nabídek**, takže se ukáže u všech; u menších měst to tak být nemusí a chybějící údaj není nula. U oborů s talentovou zkouškou se doplňuje věta, že rozhodovala i ona.

### 3.4 Filtry, kterými rodina zúží nabídku

Nad kartami tři řady, kombinovatelné: **obtížnost přijetí** (pět stupňů, z pruhu v hero), **typ školy** (dnes už je) a **zřizovatel**. Filtr podle obtížnosti plní zadání „aby si lidé udělali přehled, co jsou méně náročné a více náročné školy“, aniž by cokoli řadil.

### 3.5 Řazení: jen tím, co je na to doložené

Ponechat řazení podle názvu, počtu míst a přihlášek na místo. **Nepřidávat řazení podle obtížnosti** (oddíl 1). Výchozí řazení podle názvu školy, ne podle žádného ukazatele — jinak vzniká žebříček, i když ho tak nepojmenujeme.

### 3.6 Letopočet z registru

Zavést `zobrazeneObdobi('cermat-vysledky')` čtené z `public/stav_datovych_sad.json` a použít je v titulku, popisu, nadpisech sloupců i ve větách. Žádný letopočet v JSX.

### 3.7 „Analýzu situace“ rozpustit

Čtyři z pěti odstavců jsou metodické výhrady — patří do rozklikávacích vysvětlivek pod tabulkou, kde už podobné jsou. Na začátku stránky zůstane **jedna věta odvozená z rozložení obtížnosti**, například: „Z 36 nabídek v 1. kole 2026 bylo u 14 místo pro všechny, kdo splnili podmínky školy, a u 3 bylo těžké se dostat.“ Zastaralý komentář o Claude API a zbytečný `try`/`catch` na `page.tsx:204-210` odstranit.

### 3.8 Nekopírovat vzor z krajského přehledu

`src/components/RegionSchoolsTable.tsx:254` **řadí podle starého indexu `obtiznost`** a `getDifficultyClass()` v `src/lib/utils.ts:46-53` ho barví semaforem „Vysoká/Střední/Nízká“ na ručních hranicích 45 a 70. To je ten ukazatel bez doloženého výpočtu, jehož hodnota se nezměnila ani po přidání dat 2026. Audit `docs/audit-obtiznost-prijeti-2027.md` ve vypořádání výslovně uvádí, že „regionální řazení a přehled škol vyžadují následný společný audit definice“. **Je to existující dluh, ne předloha** — městská stránka musí vzít vzor ze stránky školy, ne z kraje. Stojí za samostatnou dávku.

---

## 4. Nepoužité sloupce, které jsem zvážil

Povinný krok podle CLAUDE.md: níže je rozhodnutí o údajích, které ve zdrojích leží a které na této stránce **nepoužiji**. Zamítnutí je platný závěr, mlčení není.

| Údaj | Kde je | Rozhodnutí |
|---|---|---|
| `obtiznost` (index) | `school-analysis-legacy`, `src/lib/priorities/calculations.ts` | **Nepoužít.** Slovník, oddíl 6: „Definice ani vzorec nejsou dohledané“, hodnota se nezměnila ani po přidání dat 2026. Je to ten ukazatel, který se jménem nabízí jako první — a je zakázaný. Zadání plní `zarazeni_obtiznosti`. |
| `prumerne_umisteni_prijatych` | `souhrny_kolo1.json` | **Nepoužít v přehledu**, jen na stránce oboru. Popisuje, s jakými výsledky přicházejí spolužáci; v městském srovnání by se čtlo jako známka školy. |
| `tlak_prvnich_voleb` | `souhrny_kolo1.json` | **Nepoužít jako sloupec.** Je ověřený pro předpověď, ale rodina ho nečte; přihlášky na místo stačí. |
| `cj_ma_prijati`, `cj_prijati`, `ma_prijati` | `souhrny_kolo1.json` | **Nepoužít jako hlavní sloupec** (dnes jím je). Body se nesmí srovnávat mezi ročníky a průměr přijatých není hranice přijetí. Patří na stránku oboru k pásmům. |
| `conditions_not_met` | `souhrny_kolo1.json` | **Použít**, ale jen jako doplněk u nabídky, kde dosáhne počtu přijatých nebo 20 % přihlášek — tak to slovník vyžaduje, protože podmínky školy mohou být hlavní překážkou i tam, kde kapacita nerozhodovala. |
| 2. kolo (`cermat-kolo2-agregaty`) | registr sad | **Nepoužít v této dávce.** Pro městský přehled by bylo cenné („kde ještě byla místa“), ale má vlastní návrh `docs/druhe-kolo.md` a vlastní období. Samostatná dávka. |
| Obory bez JPZ | CERMAT | **Nepoužít, ale přiznat.** Populace souhrnů je „denní nezkrácené studium s povinnou jednotnou zkouškou“. Učební obory bez JPZ tedy v přehledu chybí, což je u městské stránky velká výseč. Dnešní stránka to zmiňuje jen ve složené vysvětlivce; návrh to má napsat nad tabulku. |
| Městská část, ulice, PSČ | `schools_data.json` (`mestska_cast`, `ulice`, `psc`) | **Použít ulici** v kartě školy (rodina pozná, kde to je). Městskou část u Pardubic nepoužít — je prázdná; u Prahy a Brna má smysl jako filtr, ale to je jiná dávka. |
| Doprava (`doprava-gtfs`) | registr sad | **Nepoužít teď.** „Jak se tam dostanu“ je na městské stránce silná otázka, ale je to samostatná funkce s vlastním zdrojem. |
| Inspekce (`csi-inspekce`) | registr sad | **Nepoužít v přehledu.** Do karty školy by se vešlo, ale míchat inspekci s přijímacími daty v jednom pohledu svádí ke čtení „dobrá/špatná škola“. |

Sloupce, které dokument `docs/zdroje-dat.md` vede jako nepoužité v oddílu 3, prochází samostatná rešerše; její výsledek doplním do tohoto oddílu, než se začne programovat.

---

## 5. Co se tím pro rodinu změní

| Dnes | Po změně |
|---|---|
| 36 řádků nabídek, škola se opakuje | 13 karet škol, nabídky uvnitř |
| obtížnost přijetí nikde | rozložení v hero + odznak u každé nabídky + filtr |
| hlavní sloupec jsou body přijatých | hlavní údaj je, kolik soutěžících se dostalo |
| „dostupnější / náročnější“ podle bodů | věty ze slovníku s podílem a rokem |
| červená nad 3 přihlášky na místo | neutrální stupnice bez hodnocení |
| letopočet napevno na 444 místech | období z registru |
| stránka začíná pěti odstavci výhrad | jedna věta o rozložení obtížnosti, výhrady do vysvětlivek |
| „Pardubice“ ve vyhledávači najde jen školy | první výsledek je „Pardubice — kompletní přehled škol“ |
| `/mesto` je 20 karet bez hledání | filtrační pole a seskupení podle kraje |

---

## 6. Vyhledávání města

Zadání: kdo napíše „Pardubice“, má dostat nabídku „Pardubice — kompletní přehled škol“ vedoucí na `/mesto/pardubice`, ne jen seznam škol v Pardubicích.

### 6.1 Proč to dnes nefunguje

`src/app/api/schools/search/route.ts:175` bere `obec` do fulltextu, takže „Pardubice“ školy najde — ale API vrací výhradně pole `schools`. **Město jako typ výsledku neexistuje**, takže cesta na městský přehled ve vyhledávání není. Je to ta nejčastější vstupní fráze rodiny („jaké jsou u nás školy“) a vede do seznamu jednotlivých oborů.

### 6.2 Návrh: výsledek typu „město“ nad školami

API dostane druhé pole `mesta`, komponenta je vykreslí jako první skupinu, vizuálně odlišenou:

```
┌──────────────────────────────────────────────┐
│ pardubice                                    │
├──────────────────────────────────────────────┤
│ MĚSTA                                        │
│ 🏙  Pardubice — kompletní přehled škol        │
│     13 škol · 36 nabídek v 1. kole 2026      │
├──────────────────────────────────────────────┤
│ ŠKOLY                                        │
│ Gymnázium Pardubice, Dašická 1083            │
│ Střední průmyslová škola elektrotechnická…   │
└──────────────────────────────────────────────┘
```

Shoda na město je **prefixová a bez diakritiky** (`pardub` → Pardubice), aby fungovalo psaní bez háčků a nedokončené slovo.

### 6.3 Past: web má jen 20 měst

`src/lib/mesta.mjs` vede **20 měst** (Praha, …). Kdo napíše „Chrudim“, městský výsledek nedostane, protože stránka pro Chrudim neexistuje. Dvě možná řešení:

| Varianta | Co udělá | Cena |
|---|---|---|
| **A. Nabídnout jen existující města** | 20 měst má výsledek, ostatní ne | Nic. Ale u 21. města mlčí a člověk nepozná, že to není chyba psaní. |
| **B. Doplnit obce z katalogu** | shoda proti `obec` ze `schools_data.json`; pro obec bez stránky vede výsledek na filtrovaný seznam škol | Nová stránka nebo parametr; víc práce |

Doporučuji **A pro tuto dávku** s jasným chováním: když shoda na město není a jsou výsledky škol, ukáže se jen skupina ŠKOLY, bez prázdné hlavičky MĚSTA. Variantu B vyhodnotit podle toho, kolik dotazů na obce mimo dvacítku ve skutečnosti přichází — to je měřitelné v Matomo, ne odhadem.

### 6.4 Rozcestník `/mesto`

Stránka dnes vypisuje 20 karet bez vyhledávacího pole (`src/app/mesto/page.tsx`). U dvaceti položek je pole méně důležité než řazení, přidávám tedy oboje:

- **filtrační pole** nad kartami (okamžité, bez odeslání) — plní zadání „možnost vyhledávat podle města“;
- **seskupení karet podle kraje**, protože rodina hledá „něco u nás“ a kraj je nejbližší vodítko;
- na kartě města **počet škol a nabídek** místo dnešních součtů přihlášek.

### 6.5 Co se do vyhledávání nepřidá

**Kraj a okres jako typ výsledku.** Web má krajové přehledy, ale míchat tři územní úrovně do jednoho seznamu výsledků ho znepřehlední. Nejdřív města, pak podle měření.

---

## 7. Nálezy z rešerše zdrojů, které mění návrh

Rešerše `docs/zdroje-dat.md` (oddíl 3 a 5) přinesla čtyři věci, které výše uvedené opravují nebo doplňují.

**7.1 Chybějící údaj není nula — a přesně na tomhle se to už jednou rozbilo.** Past 4 dokumentu: „U indexu obtížnosti se takhle **386 oborů bez dat** tvářilo jako nejsnazší.“ Pro tento návrh je to nejzávaznější věta: obory bez jednotné zkoušky nesmí v pruhu ani ve filtru spadnout do „místo pro všechny“. Řešení: obory bez JPZ do rozložení obtížnosti **nevstupují vůbec** a pruh nese větu, kolika nabídek ze celkového počtu se týká.

**7.2 Ve 2. kole 2026 existuje 174 nabídek, které v 1. kole nejsou.** Městský přehled postavený na 1. kole je tedy přehlédne. Pro rodinu, která se dívá „co je u nás“, je to podstatná výseč. Nemění to rozhodnutí odložit 2. kolo do samostatné dávky, ale zvyšuje jeho prioritu a patří to do věty o tom, co přehled neobsahuje.

**7.3 Dopravní dostupnost už má hotové API.** `src/app/api/dostupnost/route.ts` nad GTFS daty (sada `doprava-gtfs`, období 2026-02-07). Původní rozhodnutí „nepoužít teď“ tím zlevňuje — na kartě školy by šlo ukázat dojezd, aniž by se stavěl nový zdroj. Ponechávám mimo tuto dávku, ale jako první kandidát na navazující.

**7.4 Co konkrétně chybí v kódu.** `CitySchoolRow` nenese `capacity_rejected` ani `conditions_not_met`, tedy právě pole, ze kterých `zarazeniObtiznosti()` a `soutezicichUchazecu()` počítají. `cityData.ts` musí začít číst `public/souhrny_kolo1.json` přes existující `src/lib/souhrny-kolo1.ts`. Párovací mechanismus je kompatibilní — `cityData.ts` už `normalizeSchoolKey` a `uniqueSchoolIndex` používá a `souhrny-kolo1.ts` staví na témže modulu.

**7.5 Vzor k napodobení je tabulka „Kam se hlásí stejní uchazeči“.** `src/components/skola/ProfilSkoly.tsx:687-724` je seznam cizích škol s obtížností, vzdáleností a odkazem — nejbližší předloha městskému přehledu. Odznak je tam šedá pilulka `bg-slate-200/70` s krátkým popiskem a pod ní 12px „30 ze 112“. Pro nadpisy existuje druhá sada `NADPIS_OBTIZNOSTI` s celými frázemi („Velmi těžké se dostat“), protože samotné „Velmi těžké“ jako nadpis slovník zakazuje. Pro mobilní kartu platí: obtížnost nepatří do mřížky tří čísel, ale nad ni jako pilulka.

**7.6 Oprava zastaralé dokumentace (nález k nahlášení).** Past 5 v `docs/zdroje-dat.md` tvrdí: „Web má přihlášky, kapacity a výsledky za rok 2026, ale **data uchazečů jen za rok 2025** … **nepřevzali jsme je**.“ To už neplatí: registr vede u `cermat-uchazeci-kolo1` zobrazené období **2026** s `prepnuto: 2026-09-17` a soubory `public/pasma_prijeti_2026.json`, `soubeh_prihlasek_2026.json` i `kontext_prihlasek_2026.json` existují. Text pasti 5 je potřeba opravit samostatnou dávkou, aby nesváděl k chybným závěrům.

---

## 8. Otevřené otázky pro zadavatele

1. **Obory bez JPZ** — v městském přehledu chybí učební obory bez jednotné zkoušky, u města je to velká výseč nabídky. Přiznat větou nad tabulkou, nebo je samostatnou dávkou doplnit ze zdroje?
2. **Města mimo dvacítku** (oddíl 6.3) — nechat vyhledávání u 21. města mlčet, nebo dovést na filtrovaný seznam škol?
3. **2. kolo** — 174 nabídek 2026 existuje jen ve 2. kole. Má na městské stránce být „kde ještě byla místa“, nebo to zůstane na stránce oboru?
4. **Krajský přehled** (oddíl 3.8) — řadí a barví podle indexu bez doloženého výpočtu. Opravit ve stejné dávce, nebo samostatně?

---

## 9. Co se nakonec udělalo

Zadavatel návrh schválil 21. 9. 2026 se čtyřmi rozhodnutími: přiznat chybějící učební
obory, práh **3 školy** (102 měst místo 20), opravit i krajský přehled, commit do větve
s pull requestem.

**Odchylky od návrhu, které vznikly při realizaci:**

1. **Sekce „Obce“ ve vyhledávání už existovala**, jen vedla na `/regiony/{kraj}?obec=…`,
   tedy krajský filtr, ne na městský přehled. Oddíl 6.1 tvrdil, že město jako typ výsledku
   neexistuje; to platilo jen pro API, ne pro komponentu. Řešení: města s vlastní stránkou
   se zobrazí ve vlastní skupině nad školami, obce bez stránky zůstávají tam, kde byly.
2. **Řazení podle indexu `obtiznost` v krajském přehledu byl mrtvý kód** — řadicí klíč
   existoval, ale žádná hlavička ho nespouštěla. Oddíl 3.8 z rešerše to nadhodnotil.
   Odstraněn i s nepoužívanou funkcí `getDifficultyClass` (semafor Vysoká/Střední/Nízká).
3. **Nalezeno porušení zákazu slova „hranice přijetí“** ze slovníku pojmů verze 1.0 na dvou
   místech kódu (krajský přehled, karta oboru), přestože pod nadpisem byl nejnižší výsledek
   přijatých z dat uchazečů. Opraveno.
4. **Rozcestník `/mesto` se musel přepsat kvůli výkonu**: volal `getCityStats` pro každé
   město, což u 102 měst znamená 102 průchodů katalogem. Karta potřebuje dva počty, takže
   se počítají jedním průchodem.
5. **Seznam měst se negeneroval, ale udržoval ručně** a nebyl postaven na nabídce škol:
   Teplice s 5 školami stránku měly, Mladá Boleslav s 12, Prostějov s 12 a Karlovy Vary
   s 10 (krajské město) ne. Nově generuje `scripts/build-mesta.py` z katalogu podle
   registru; dvacítka zveřejněných měst v seznamu zůstává bez ohledu na práh, aby se
   nerozbily odkazy.

**Ověřeno:** build 1269 stránek, 102 městských stránek, 225 testů (9 nových v
`tests/test_mesta.py`), `kontrola-letopoctu.py` hlásí o 27 napevno zapsaných letopočtů
méně, žádný zakázaný výraz ve vygenerovaném HTML. Rozložení obtížnosti v Pardubicích
(14 / 8 / 11 / 3 / 0) ověřeno nezávisle proti zdroji.

**Neuděláno, čeká na rozhodnutí:** obory bez jednotné zkoušky se pouze přiznávají větou,
2. kolo zůstává mimo přehled, dopravní dostupnost na kartě školy není.

---

## 10. Vypořádání oponentury

Oponentura PR #139 na commitu `7f1d59d` našla pět chyb. **Všech pět jsem ověřil proti
skutečným datům a všechny byly skutečné**; opraveny v commitu níže. Žádná z nich neshodila
build ani typovou kontrolu, což je důvod, proč k nim vznikly regresní testy
(`tests/mesto-prehled.test.mjs`, běží přes `npm run test:mesto`).

| # | Nález | Rozsah | Příčina | Oprava |
|---|---|---|---|---|
| 1 | vypsané obory označeny za nevypsané | **462 řádků** | `chybi2026` se odvozovalo z `prihlasky2026`, které pochází ze starého párování `applications_2026.json`; obtížnost jde ze souhrnů, tedy z jiného párování | nové pole `chybiVRocniku` odvozené od souhrnu 1. kola; kapacita, přihlášky a přihlášky na místo se ze souhrnu berou jako záložní zdroj. Rozpor spadl na **0**, skutečně nevypsaných je 115 |
| 2 | „místo pro všechny“ zamlčelo hlavní překážku | **490 nabídek** | `nesplniliPodminky` se načítalo, ale nikde nezobrazovalo | věta „45 ze 61 přihlášených nedosáhlo požadavků školy“ při prahu ze slovníku (počet přijatých nebo 20 % přihlášek) |
| 3 | u „místa pro všechny“ mizel předchozí ročník | **226 nabídek** | předčasný `return` v `PodilPrijatych` skryl i historii | věta se skládá po částech, historické zařazení je nezávislé na aktuální kategorii |
| 4 | hlavička město nenabídla | všechny stránky | **hlavička má vlastní vyhledávání**, `SchoolSearch.tsx` (který jsem upravil) je jen na titulce, `/regiony` a `/skoly` | města doplněna do `Header.tsx` včetně mezipaměti a prázdného stavu |
| 5 | název školy odkazoval na jeden obor | **679 škol** s víc nabídkami | použit `slug` první nabídky | nové pole `slugSkoly` ze sdíleného `adresaPrehledu()`; název školy se bere ze `school_analysis.json` jako ve zbytku webu, jinak by adresa mířila na 404 |

**Ověřeno po opravě:** rozpor z nálezu 1 je nulový, cílové adresy z nálezu 5 vracejí HTTP 200,
u Vlasové kosmetiky se zobrazuje zamlčená překážka, API vrací města i při `limit=10`, které
hlavička používá. 232 testů (225 + 7 nových), build 1269 stránek.

**Poznámka k testům:** `npm run test:js` u tohoto souboru padá na `ERR_MODULE_NOT_FOUND`,
protože `node --experimental-strip-types` neumí importy bez přípony ani alias `@/`. Týká se
to i pěti dosavadních souborů (`hlaseni`, `portal-*`), je to tedy existující omezení skriptu,
ne těchto testů; proto samostatný `npm run test:mesto` nad `tsx`.

---

## 11. Druhé kolo oponentury: testy nechránily opravy

Druhé kolo potvrdilo opravu všech pěti nálezů a nenašlo blokující chybu v chování.
Vzneslo ale oprávněnou výhradu k testům, kterou jsem si ověřil a přijal:
**`tests/mesto-prehled.test.mjs` kontroloval jen datovou vrstvu.** Nálezy 2, 3 a 5 byly
přitom chyby ve vykreslení nad daty, která už tehdy byla správná — testy by je tedy
nezachytily a proti původní datové vrstvě prošly.

**Co se doplnilo.** Testy nad skutečně vykresleným výstupem: komponenta se vykreslí přes
`react-dom/server` (bez nové závislosti) a čte se text i `href`, které uvidí čtenář. Pro
hlavičku vznikl `tests/vyhledavani-mesta.test.mjs`, který volá přímo `GET` z API a kontroluje,
že hlavička odpověď čte, vykresluje, ukládá do mezipaměti a bere města v potaz v prázdném
stavu. Vykreslit `Header.tsx` by znamenalo obsluhovat `useRouter` a klientské háky, což se
pro tuhle kontrolu nevyplatí.

**Každý test je ověřen mutací**: chyba se vrátila do kódu a test musel spadnout. To odhalilo
dvě slabá místa v mých vlastních testech, která by jinak zůstala:

| Mutace | První verze testu | Po zpřesnění |
|---|---|---|
| předčasný `return` u „místa pro všechny“ | **prošla** — text „v roce 2025“ nese i 264 jiných pražských nabídek | vykresluje se jedna nabídka zvlášť a hledá se `v roce {rok} {zařazení}` |
| odstranění věty o nesplněných podmínkách | prošla ze stejného důvodu | vykresluje se jedna nabídka zvlášť |
| `slug` první nabídky místo `slugSkoly` | zachycena | zachycena; kontrola „adresa neobsahuje název oboru“ ale **hlásila planý poplach** u AGYS — Anglického gymnázia a SOŠ, kde je „gymnázium“ součástí názvu školy. Nahrazena silnější: škola vykreslená s jednou nabídkou musí mít stejnou adresu jako s ostatními |
| hlavička přestane předávat města do stavu | **prošla** — `setSearchMesta` se v souboru vyskytuje i u mezipaměti | hledá se `setSearchMesta(mesta)` nad čerstvou odpovědí |
| API přestane vracet `mesta` | zachycena (3 testy) | zachycena |

Celkem 18 kontrol v obou souborech, `npm run test:mesto`.

**Oprava v CI (nález mimo obě kola oponentury).** Po druhém kole hlásil PR stav `UNSTABLE`:
úloha „TypeScript“ padala na kroku `npm run test:js`, a to **právě na těchto dvou nových
souborech** (`fail 2` z 293 testů). Mé dřívější tvrzení, že jde o existující omezení
skriptu společné s `hlaseni` a `portal-*`, neplatilo: ty soubory v CI procházejí a lokálně
padají jen kvůli chybějící dev závislosti `@electric-sql/pglite`. Řešení: `test:js` oba
soubory vynechává vzorem `tests/!(mesto-prehled|vyhledavani-mesta).test.mjs` (41 → 39
souborů) a CI má nový krok „Testy přehledu města“ nad `npm run test:mesto`, kde `tsx`
alias `@/` a importy bez přípony zvládá. Pokus napsat vlastní zavaděč přes
`typescript.transpileModule` jsem zavrhl: ruční obsluha aliasů a `.mjs` modulů plodila
další chyby v závislostech `cityData`.

---

## 12. Další obory ve městě a 2. kolo

Rozhodnutí zadavatele z 21. 9. 2026 ke dvěma ze tří otevřených otázek oddílu 8.

### 12.1 Obory, které hlavní přehled nevede

**Proč.** Přehled stojí na denním nezkráceném studiu s povinnou jednotnou zkouškou.
Naměřeno, kolik tím ve městech vypadne: **798 oborů**, u velkých měst 17–22 % nabídky
(Praha 94, Brno 47, Ostrava 33), ale **v Chomutově 55 % a v České Lípě 52 %**. Rodina
tam viděla méně než polovinu toho, co se dá studovat. Dosavadní přiznání větou to
říkalo, ale nabídku neukázalo.

**Dvě skupiny, ne jedna.** Ze 1 022 oborů v `kontext_prihlasek_{rok}.json` je
**950 bez jednotné zkoušky** (učební obory s výučním listem, konzervatoře) a **72 ji má**,
jen je katalog nevede — bývají to umělecké obory s talentovou zkouškou. Každá chybí
z jiného důvodu, takže oddíl je dělí a u každé říká proč. Slít je do jedné věty by
tvrdilo nepravdu o jedné z nich.

**Co se zobrazuje.** Jen škola a názvy oborů, seskupené po školách. **Žádná obtížnost
přijetí a žádný počet přijatých** — u oborů bez jednotné zkoušky výsledky neexistují
a obor bez dat se nesmí tvářit jako snadný (past 4 zdrojů dat; přesně tak se u starého
indexu 386 oborů ukázalo jako nejsnazší). Nad přehledem zůstává upozornění, ale odkazuje
na oddíl a uvádí počet.

### 12.2 Značka 2. kola

**Co.** U nabídky, která v zobrazeném ročníku 2. kola vypsala 2. kolo, značka
„v roce {rok} tu bylo i 2. kolo“. Ve městech se to týká **633 nabídek**: Praha 76,
Brno 46, Ostrava 31, v Jeseníku 12 z 15.

**Formulace je záměrně v minulém čase.** Že škola 2. kolo vypsala v jednom roce,
o dalším neříká nic; „ještě jsou místa“ by byl slib, který data nekryjí. Ročník se bere
z registru sady `cermat-kolo2-agregaty`, která má **vlastní období** a může se lišit
od 1. kola (výsledky vycházejí v září). Bez ročníku z registru se značka nezobrazí
vůbec, aby netvrdila rok, který není doložený.

**Zobrazují se jen vypsaná 2. kola.** Stavy `nenaplneno_bez_2_kola` (768 nabídek)
a `bez_2_kola` (1 437) říkají, že se nekonalo, a na přehledu města nemají co dodat.

### 12.3 Jazyková poznámka

První verze nadpisu zněla „Další obory v {město}“ a na Chomutově vyšlo **„Další obory
v Chomutov“**. Šestý pád českých názvů měst nejde spolehlivě odvodit algoritmem („v Ústí
nad Labem“, „v Hradci Králové“, „v Karlových Varech“), a ručně by to znamenalo 102
tvarů k udržování. Nadpis proto pád nepotřebuje: **„Další obory ve městě“**.

### 12.4 Ověření

Pět nových testů v `tests/mesto-prehled.test.mjs` (celkem 23), **každý ověřen mutací**:
značka u všech nabídek, značka ignorující registr a odznak obtížnosti v oddílu dalších
oborů — všechny tři mutace zachyceny. Build 1269 stránek, 225 Python testů.

---

## 13. Vypořádání oponentury PR #140

Dva nálezy, **oba platné**. Ověřeny proti datům a generátoru; opraveny.

### 13.1 Nepodložené tvrzení o jednotné zkoušce (P1)

Napsal jsem u skupiny „Mimo náš přehled“ větu **„Jednotná zkouška se u nich koná“**.
To z dat nevyplývá: příznak `bez_jednotne_zkousky` testuje v `scripts/nazvy_oboru.py`
**jen písmeno kategorie** (C/E/H/J/P), takže `false` znamená „není v těchto kategoriích“,
ne „zkouška se koná“. U talentových oborů se JPZ nekoná (s výjimkou sportovního gymnázia)
a **53 ze 64 oborů té skupiny jsou umělecké obory** skupiny KKOV 82, například Grafický
design. Věta tedy lhala o většině skupiny.

Nově: „Nepatří do kategorií bez jednotné zkoušky, ale v našem přehledu oborů nejsou —
většinou jsou to umělecké obory, kde se koná talentová zkouška. Jak se u nich přijímá,
stojí v kritériích školy.“ Zmizelo i z úvodní věty oddílu, která totéž tvrdila obecně.

### 13.2 Seznam stál na statistickém výběru (P2)

Podkladem bylo pole `mimo_prehled`, které ale vzniká **jen z prvních šesti souběžných
voleb s aspoň deseti společnými uchazeči** (`MAX_OBORU = 6`, `MIN_SPOLECNYCH = 10`
v `scripts/build-kontext-prihlasek.py`). Není to tedy soupis nabídky města, ale výběr
podle četnosti souběhu. Oddíl kvůli tomu **vynechával 704 oborů bez jednotné zkoušky**,
které týž soubor doloženě nese — v Pardubicích chyběly Hudba a Zpěv na konzervatoři
(54 a 24 uchazečů).

Je to přesně porušení pravidla projektu „**nikdy neinventarizuj data podle toho, co web
zobrazuje**“, jen o úroveň hlouběji: inventarizoval jsem podle toho, co pro jiný účel
prošlo statistickým filtrem.

Nově stojí podklad na soupisu oborů ročníku (`data` téhož souboru) spojeném s indexem
rejstříku škol (`data/msmt_rejstrik/nazvy-oboru.json`, který web už čte v portálu).
Klíče z hlavního přehledu se předávají jako parametr, aby se nabídka nezdvojila.

**Dopad:** 798 → **1 621 oborů** ve městech. Pardubice 14 → 23, Chomutov 18 → 28,
Praha 94 → 212. Ověřeno, že kolize s hlavním přehledem je nulová a že v hlavním přehledu
není žádný obor kategorie bez jednotné zkoušky.

### 13.3 Ověření

Tři nové testy (26 celkem). **Oba nálezy ověřeny mutací**: vrácení nepodloženého tvrzení
i vrácení podkladu na `mimo_prehled` testy zachytí. Značky 2. kola oponentura ověřila
proti zdroji bez nálezu.

---

## Historie

| Verze | Změna |
|---|---|
| 1.6 | Vypořádána oponentura PR #140 (21. 9. 2026), oddíl 13. Odstraněno nepodložené tvrzení, že se u oborů skupiny „jiný“ koná jednotná zkouška — příznak testuje jen kategorii a 53 ze 64 jsou umělecké obory s talentovou zkouškou. Podklad seznamu přesunut ze statistického výběru `mimo_prehled` na soupis oborů ročníku: 798 → 1 621 oborů. |
| 1.5 | Doplněny další obory ve městě (798 oborů, které přehled nevedl) a značka 2. kola u 633 nabídek (21. 9. 2026), oddíl 12. Obory bez jednotné zkoušky a obory mimo katalog se zobrazují odděleně, protože chybí z jiného důvodu; bez obtížnosti přijetí, protože u nich výsledky neexistují. |
| 1.4 | Druhé kolo oponentury (21. 9. 2026), oddíl 11: potvrzena oprava všech pěti nálezů, přijata výhrada, že testy chránily jen datovou vrstvu. Doplněny testy vykresleného výstupu a vyhledávání, každý ověřen mutací. Mutační ověření odhalilo dvě slabá místa v nových testech a jeden planý poplach. |
| 1.3 | Vypořádána oponentura PR #139 (21. 9. 2026), oddíl 10: pět nálezů ověřeno proti datům, všechny platné, opraveny. Nejzávažnější označoval 462 vypsaných oborů za nevypsané, protože vypsanost se odvozovala z jiného párování než obtížnost. Přidány regresní testy. |
| 1.2 | Zrealizováno (21. 9. 2026), oddíl 9 s pěti odchylkami od návrhu. |
| 1.1 | Doplněno vyhledávání města (oddíl 6) po doplnění zadání z 21. 9. 2026 a nálezy dvou rešerší (oddíl 7). **Opraven chybný závěr 2.5**: narativ na městské stránce nevolá jazykový model, generování bylo odstraněno 11. 9. 2026; závada je v tom, že blok „Analýza situace“ nese čtyři odstavce metodických výhrad. Zjištěno, že krajský přehled řadí podle zakázaného indexu `obtiznost` (oddíl 3.8), a že tvrzení pasti 5 v `docs/zdroje-dat.md` o datech uchazečů za rok 2025 už neplatí. |
| 1.0 | Založení (21. 9. 2026): rozbor šesti závad stránky města, obtížnost přijetí jako odznak a filtr místo řazení, seskupení po školách, období z registru, rozhodnutí o nepoužitých sloupcích. |
