# Okruhy oborů ve městě: shluky podle souběžných přihlášek

Verze 1.0 · 3. 10. 2026 · **Návrh ke schválení, etapa 1 zadání [#277](https://github.com/tangero/stredniskoly/issues/277).** Web se nemění. Realizace (etapa 2) se doplní do zadání až po schválení.

Rozbor reprodukuje `python3 scripts/rozbor-shluky-oboru.py`. Výstup je v [podkladu](podklady/shluky-oboru-2026-10-03.json), který neobsahuje řádky o jednotlivých uchazečích ani počty pod 10.

## 0. Shrnutí

1. **Ve městě existují okruhy oborů, mezi kterými se uchazeči přelévají, a dají se z dat najít.** V Brně jich v roce 2026 vychází 13 se 168 obory, v Praze 21 se 412 obory. Okruhy dávají obsahový smysl: osmiletá, šestiletá a čtyřletá gymnázia zvlášť, ekonomické obory, technické obory, zdravotnické a sociální obory, kadeřnice a gastronomie, automobilní obory, stavební řemesla, grafika a média, obory E odborných učilišť.
2. **Okruhy nejsou náhodné.** Stejnou metodou spočítané okruhy 2025 a 2026 se shodují s upraveným Randovým indexem 0,75 v Brně a 0,66 v Praze (u všech zkoušených variant 0,63–0,77), při náhodném přeřazení oborů vychází 0,00 (95. percentil 0,02). Mezi ročníky jsou ale k dispozici jen dva (oddíl 2), takže jde o jedno srovnání, ne o řadu.
3. **Zájem z okruhu neodchází, přesouvá se uvnitř něj.** Podíl okruhu na uchazečích města se mezi lety 2025 a 2026 změnil nejvýš o 1,6 procentního bodu. Rozdělení uchazečů mezi obory uvnitř okruhu se ale posunulo víc, než dovoluje náhoda: v Praze u 16 z 21 okruhů (u čtyř jen těsně), v Brně u 4 z 13. Nejsilnější příklad: čtyřleté gymnázium SPŠ chemické a gymnázia Brno na Vranovské mělo 249, 491 a 247 přihlášek v letech 2024, 2025 a 2026. V roce 2025 bylo přijetí těžké, v roce 2026 se dostala většina soutěžících uchazečů. Zájem se v roce 2026 vrátil k ostatním čtyřletým gymnáziím okruhu.
4. **Směr přihlášek uvnitř okruhu je čitelný.** U každého oboru jde říct, jak často ho uchazeči měli na přihlášce výš než ostatní obory okruhu. Ve čtyřletých gymnáziích Brna má Gymnázium Matyáše Lercha 0,67 a Moravské gymnázium 0,13.
5. **Doporučení:** okruh ukázat jako rozšíření sekce „Kam se hlásí stejní uchazeči“ na stránce oboru a jako přehled okruhů na stránce města. Obtížnost přijetí jen jako odznak u oboru, neřadit podle ní. Vlastní stránku okruhu zatím nestavět (oddíl 7).

## 1. Rozbor zdrojů

Prošel jsem celý [soupis zdrojů](zdroje-dat.md) včetně oddílu 3.

**Použito:**

| Zdroj a sloupec | K čemu |
|---|---|
| Data uchazečů 1. kola (2.2): `ss1_redizo` až `ss5_redizo`, `ss1_kkov` až `ss5_kkov` | uzly a hrany grafu: kdo měl které obory zároveň na přihlášce |
| tamtéž, pořadí sloupců `ss1` až `ss5` | směr: který obor měl uchazeč výš |
| tamtéž, `ss*_forma`, `ss*_zkraceno` | populace jako u souběžných přihlášek: denní nezkrácené studium (`scripts/slouceni_prihlasek.py`) |
| tamtéž, `ss*_prijat`, `ss*_duvod_neprijeti` | v rozboru jen přes stav volby (`volby_uchazece`); obtížnost se bere ze souhrnů |
| Souhrny 1. kola (2.1): `KAPACITA`, `PŘIJATÍ`, `NEPŘIJATI - NEDOSTATEČNÁ KAPACITA` | kapacita okruhu a obtížnost přijetí slovy u oboru, sečtené přes zaměření téhož REDIZO a KKOV |
| Katalog `schools_data.json` (2.10), `prihlasky` | přihlášky 2024 až 2026 u oborů s jednotnou zkouškou: jediná cesta k třetímu ročníku bez stahování |
| Index názvů z rejstříku (2.4) přes `scripts/nazvy_oboru.py` | obec oboru a názvy, i u učebních oborů mimo katalog |

**Zváženo a zamítnuto:**

| Sloupec | Proč ne |
|---|---|
| `ss*_zrizovatel` (2.2) | Okruh popisuje, mezi čím se uchazeči rozhodují. Zřizovatel je vlastnost školy, kterou rodina vidí přímo. Kombinace veřejné a soukromé školy v okruhu je zajímavá, ale je to jiná otázka (školné) a odpověď na ni dává štítek u oboru. |
| `c_m_procentni_skor` (2.2) jako obtížnost okruhu | Průměr nebo minimum bodů za okruh by sčítal obory s různým testem (čtyřleté a víceleté) a s různými kritérii. Obtížnost se proto uvádí jen u oboru, jako odznak ze slovníku. |
| `ss*_kraj`, `ss*_smo16` (2.3, položková data) | Kraj i skupinu oborů už nese katalog. Položková data mají volby jen za uchazeče, kteří psali testy, takže by z grafu vypadly učební obory. |
| Data uchazečů 2. kola (2.2, oddíl 3) | Ve 2. kole se hlásí jen část uchazečů a jen na volná místa. Okruh by popisoval zbytkovou nabídku, ne rozhodování rodiny. Soubory 1. a 2. kola navíc nemají společný identifikátor uchazeče. |
| Přijatí podle priority, sloupce 40–44 (2.1) | Popisují přijaté, ne rozhodování. Pro směr uvnitř okruhu je přímější pořadí na přihlášce u všech uchazečů. |
| Školní agregáty JPZ 2017–2023 (2.12) | Nejsou stažené a jsou po oborových skupinách, ne po oborech. Okruh na nich postavit nejde. Řadu zájmu by prodloužily, ale jen u celých škol. |
| `dobihajiciObor` (2.4) | Mezi vypsanými obory je dobíhajících nula. Pro okruh nic nepřidá. |
| Zaměření oboru (2.1) | Data uchazečů zaměření nenesou. Okruh je proto po oborech školy (REDIZO a KKOV), stejně jako souběžné přihlášky. |
| DiPSy, kritéria (2.16) | Okruh nepotřebuje bodování. Na stránce oboru je kritérium dostupné zvlášť. |

**Co chybí:** data uchazečů 1. kola 2024 v repozitáři nejsou. CERMAT je zveřejňuje, ale soubor 2024 je klíčovaný IZO místo REDIZO (`scripts/offer-history.py`), takže by potřeboval převod přes rejstřík. Zadání zakazuje cizí servery, proto se nestahoval. Doplnění by dalo třetí ročník okruhů a směru. Vyžaduje ohlášení podle pravidla 7 a je to kandidát na etapu 2.

## 2. Data a populace

- **Ročníky:** data uchazečů 2025 (finální revize) a 2026, obojí z místních souborů v `data/`. Registr zobrazuje rok 2026 (sada `cermat-uchazeci-kolo1`).
- **Populace:** přihlášky do denního nezkráceného studia, zaměření téhož oboru sloučená. Je to tatáž populace jako u souběžných přihlášek a kontextu přihlášek.
- **Město:** obor patří do města, když index názvů vede obec školy jako „Brno“ nebo „Praha“. Obory na přihláškách, které index nezná, nemají obec a do města se nepočítají.
- **Uchazeči města:** uchazeči s aspoň jedním oborem ve městě. V Brně 12 625 (2025) a 12 267 (2026), v Praze 32 142 a 32 069.

Mez zveřejnění platí od začátku: uzel grafu je jen obor s aspoň 10 uchazeči, hrana jen dvojice oborů s aspoň 10 společnými uchazeči. Mez zároveň odfiltruje náhodné jednotlivé dvojice.

## 3. Metoda

### 3.1 Graf

- **Uzel:** obor školy (REDIZO_KKOV) ve městě s aspoň 10 uchazeči.
- **Hrana:** počet uchazečů, kteří měli na přihlášce oba obory (nejméně 10).
- **Váha hrany**, dvě varianty:
  - *počet*: počet společných uchazečů;
  - *normovaná*: počet společných uchazečů ÷ √(uchazeči oboru A × uchazeči oboru B). Velký obor (obchodní akademie se 641 uchazeči) jinak táhne do svého okruhu všechno, s čím má pár desítek společných uchazečů jen kvůli své velikosti.
- **Směr** se do hledání okruhů nepromítá. Okruh je množina, směr popisuje vztahy uvnitř ní (oddíl 6).

### 3.2 Detekce okruhů

Louvain s nastavitelným rozlišením γ maximalizuje modularitu: hledá rozdělení, ve kterém je uvnitř skupin víc společných uchazečů, než by odpovídalo velikosti oborů. Leiden by byl vhodnější, protože zaručuje souvislé skupiny. Knihovny pro něj v prostředí nejsou a instalace z PyPI je dotaz na cizí server. Louvain je proto napsaný přímo ve skriptu a po něm běží kontrola, která nesouvislou skupinu rozdělí na souvislé části. Na zkušebním grafu pěti klik s izolovaným uzlem dává šest skupin při každém z pěti pořadí.

Louvain závisí na pořadí uzlů. Pro každou variantu běží 30× a vybírá se rozdělení s nejvyšší modularitou. Shoda mezi běhy se uvádí.

**Label propagation** jsem zvážil a jako hlavní metodu nepoužil: na grafech s velkými uzly snadno spojí všechno do jedné skupiny a nemá parametr, kterým jde řídit jemnost. **Hierarchické shlukování** podle podobnosti přihlášek vyžaduje zvolit hladinu řezu, kterou nic přirozeně neurčuje. Modularita aspoň říká, proti čemu se srovnává.

### 3.3 Srovnání variant

Shoda mezi ročníky = upravený Randův index (ARI) mezi okruhy 2025 a 2026 na oborech, které jsou v obou letech a aspoň v jednom roce leží v okruhu s aspoň 3 obory. Samostatné obory bez hrany se nepočítají, shodu by nafoukly. Náhoda = ARI při náhodném přeřazení oborů se zachovanými velikostmi okruhů, 300 losování.

| Město | Váha | γ | Okruhů ≥ 3 oborů 2025 / 2026 | Shoda mezi běhy 2026 | Shoda 2025 ↔ 2026 | Náhoda (95. percentil) |
|---|---|---:|---|---:|---:|---:|
| Brno | počet | 1,0 | 15 / 12 | 0,97 | 0,65 | 0,02 |
| Brno | normovaná | 0,7 | 16 / 13 | 0,92 | 0,77 | 0,02 |
| Brno | **normovaná** | **1,0** | 16 / 13 | 0,94 | 0,75 | 0,01 |
| Brno | normovaná | 1,5 | 16 / 15 | 0,89 | 0,67 | 0,02 |
| Brno | počet | 1,5 | 15 / 14 | 0,98 | 0,67 | 0,02 |
| Praha | počet | 1,0 | 17 / 18 | 0,93 | 0,74 | 0,01 |
| Praha | normovaná | 0,7 | 17 / 17 | 0,93 | 0,65 | 0,01 |
| Praha | **normovaná** | **1,0** | 19 / 21 | 0,91 | 0,66 | 0,01 |
| Praha | normovaná | 1,5 | 22 / 23 | 0,88 | 0,63 | 0,01 |
| Praha | počet | 1,5 | 22 / 22 | 0,92 | 0,66 | 0,01 |

Modularita vybraných rozdělení je 0,84 v Brně a 0,86 v Praze. Mezi variantami s jinou váhou ji srovnávat nejde, protože každá se počítá na jiném grafu.

**Volba: normovaná váha, γ = 1,0.** V Brně je mezi ročníky nejstabilnější spolu s γ = 0,7. V Praze vychází váha *počet* o 0,08 stabilnější, ale její největší okruh má 69 oborů místo 52; velké obory k sobě táhnou všechno, s čím mají pár desítek společných uchazečů. Rozdíly mezi variantami jsou menší než rozdíl proti náhodě, závěry o okruzích na volbě nestojí. Před etapou 2 doporučuji volbu ověřit na dalších městech (oddíl 9).

Co shoda 0,66–0,75 znamená prakticky: většina oborů zůstává ve stejném okruhu, část okrajových oborů přeskakuje mezi sousedními okruhy (například obory chemie mezi čtyřletými gymnázii a zdravotnickými obory). Přiřazení oboru k okruhu proto nesmí na stránce vypadat jako pevná kategorie (oddíl 7.3).

## 4. Zkusmé okruhy Brno a Praha, rok 2026

Pojmenování okruhů je moje, podle převažujících oborů. Zdroj ho nenese (viz oddíl 7.4). *Uchazeči* jsou různí uchazeči s aspoň jedním oborem okruhu, zaokrouhlení dolů na desítky. *I jinde ve městě* je podíl uchazečů okruhu, kteří měli na přihlášce i obor ve městě mimo tento okruh. Říká, jak uzavřený okruh je.

### 4.1 Brno

| Okruh | Oborů | z toho bez jednotné zkoušky | Uchazeči | I jinde ve městě |
|---|---:|---:|---:|---:|
| Technické obory: stavebnictví, IT, elektro, strojírenství | 29 | 6 | 2 220 | 49 % |
| Zdravotnické, sociální, pedagogické a bezpečnostní obory | 24 | 2 | 2 010 | 59 % |
| Čtyřletá gymnázia a chemie | 17 | 0 | 1 920 | 60 % |
| Obchodní akademie a ekonomické obory, sportovní gymnázium | 17 | 0 | 1 830 | 68 % |
| Kadeřnice, kosmetika, cestovní ruch, gastronomie | 16 | 9 | 1 620 | 53 % |
| Osmiletá gymnázia | 11 | 0 | 1 460 | 1 % |
| Šestiletá gymnázia | 9 | 0 | 1 170 | 0 % |
| Automobilní obory | 8 | 5 | 770 | 53 % |
| Stavební řemesla: instalatér, truhlář | 13 | 11 | 700 | 64 % |
| Nástavby Podnikání a provozní obory | 9 | 0 | 520 | 13 % |
| Grafika, design, média | 8 | 0 | 490 | 76 % |
| Obory E odborného učiliště: stravování | 4 | 4 | 140 | 56 % |
| Obory E odborného učiliště: řemeslné práce | 3 | 3 | 80 | 74 % |

Dalších 67 oborů s aspoň 10 uchazeči nemá s žádným jiným oborem ve městě 10 společných uchazečů, nebo leží v dvojicích. Okruh nemají.

### 4.2 Praha

| Okruh | Oborů | z toho bez jednotné zkoušky | Uchazeči | I jinde ve městě |
|---|---:|---:|---:|---:|
| Obchodní akademie, ekonomická lycea, veřejnosprávní obory | 52 | 0 | 6 610 | 65 % |
| Osmiletá gymnázia | 39 | 0 | 5 340 | 1 % |
| Čtyřletá gymnázia | 36 | 0 | 4 140 | 69 % |
| Technické obory: stavebnictví, IT, elektro | 34 | 0 | 3 770 | 59 % |
| Šestiletá gymnázia | 16 | 0 | 2 990 | pod 1 % (méně než 10 uchazečů) |
| Kadeřnice, kosmetika, potravinářské učební obory | 34 | 22 | 2 890 | 70 % |
| Soukromá a alternativní gymnázia, pedagogické obory | 27 | 1 | 2 540 | 76 % |
| Hotelnictví, gastronomie, cestovní ruch | 21 | 7 | 2 390 | 81 % |
| Zdravotnické obory, chemie | 21 | 0 | 2 370 | 69 % |
| Automobilní obory | 31 | 24 | 2 280 | 60 % |
| Grafika, multimédia, oděvnictví | 25 | 1 | 1 610 | 82 % |
| Nástavby Podnikání | 20 | 0 | 1 300 | 14 % |
| Stavební řemesla: truhlář, instalatér | 21 | 14 | 1 240 | 79 % |
| Bezpečnostní obory | 5 | 0 | 1 190 | 64 % |
| Doprava, letectví, logistika | 9 | 0 | 960 | 71 % |
| Konzervatoře: hudba | 3 | 3 | 220 | 25 % |
| Konzervatoře: zpěv | 4 | 4 | 150 | 28 % |
| Obory E odborného učiliště | 5 | 5 | 150 | 53 % |
| Ošetřovatel, pečovatelské služby | 3 | 3 | 140 | 82 % |
| Umělecká řemesla, nástavby | 3 | 0 | 70 | 60 % |
| Gymnázium a SOŠ pro zrakově postižené | 3 | 0 | 30 | 58 % |

### 4.3 Co z toho plyne

- **Víceletá gymnázia jsou uzavřený okruh.** Uchazeči o osmiletá gymnázia mají na přihlášce téměř jen jiná osmiletá gymnázia (1 % i jinde ve městě), u šestiletých je to stejné. Je to dané tím, že se hlásí z jiného ročníku základní školy. Okruh tu jen potvrzuje, co rodina ví.
- **Okruhy oborů po 9. třídě jsou otevřené.** Polovina až čtyři pětiny uchazečů mají na přihlášce i obor z jiného okruhu. Okruh je proto „kde se rozhoduje většina“, ne hranice. Tohle se musí dát poznat i na stránce.
- **Učební obory s výučním listem tvoří okruhy s maturitními obory téhož řemesla**, například kadeřník s kosmetickými službami nebo automechanik s autotronikem. Pro rodinu, která zvažuje učební obor, je to užitečná odpověď na otázku, co dál zvážit. Navazuje to na [obory bez jednotné zkoušky](navrh-obory-bez-jpz-2027.md).
- **Nástavby tvoří vlastní okruh** a uchazeči o ně se s deváťáky skoro nepotkávají (13–14 % i jinde ve městě). Na stránce pro deváťáky se nemají míchat.
- **Malé okruhy** (konzervatoře, odborná učiliště) mají 3–5 oborů jedné nebo dvou škol. Jejich ukázání se rozhodne podle meze zveřejnění (oddíl 7.5).

## 5. Přelévání zájmu mezi ročníky

### 5.1 Jak se měří

Okruhy roku 2026 se přenesou na data roku 2025: tytéž obory, ale **jiní uchazeči**. Každý rok se hlásí jiný ročník dětí, takže nejde o to, že by tytéž děti přešly jinam. Je to posun poptávky mezi ročníky.

- **Podíl okruhu na uchazečích města:** různí uchazeči okruhu ÷ uchazeči města. Ukazuje, zda zájem z okruhu odchází.
- **Přesun zájmu v okruhu:** u každého uchazeče okruhu se vezme obor, který měl z okruhu na přihlášce nejvýš. Rozdělení těchto voleb mezi obory okruhu se porovná mezi ročníky součtem kladných rozdílů podílů (polovina součtu absolutních rozdílů, *total variation*). Hodnota 0,10 znamená, že se mezi obory okruhu přesunula desetina zájmu.
- **Šum:** kolik přesunu dá samotná náhoda, když se oba ročníky losují ze stejného rozdělení se stejným počtem uchazečů. Přesun nad 95. percentilem šumu je skutečný posun.

### 5.2 Výsledky

Podíl okruhu na uchazečích města se mezi 2025 a 2026 změnil nejvýš o 1,6 procentního bodu (Praha, bezpečnostní obory, kvůli nové policejní škole). U ostatních okruhů nejvýš o 1,4 bodu (Praha, grafika a multimédia), u většiny o méně než 0,6 bodu.

Přesun zájmu v okruhu nad šumem:

| Město | Okruh | Přesun | Šum, 95. percentil | Na nové obory | Hlavní pohyb |
|---|---|---:|---:|---:|---|
| Brno | Zdravotnické a sociální | 0,15 | 0,07 | 0,03 | Zdravotnické lyceum Jaselská 7 → 12 % prvních voleb okruhu |
| Brno | Ekonomické | 0,13 | 0,07 | 0,03 | Obchodní akademie Kotlářská 13 → 19 % |
| Brno | Čtyřletá gymnázia | 0,10 | 0,07 | 0 | Vranovská 14 → 7 %, Lercha 7 → 11 % |
| Brno | Technické | 0,09 | 0,07 | 0 | IT Čichnova 10 → 8 % |
| Praha | Bezpečnostní | 0,42 | 0,06 | 0,42 | nová Vyšší a Střední policejní škola MV |
| Praha | Soukromá a alternativní gymnázia | 0,24 | 0,07 | 0,15 | tři nové obory, z toho gymnázia EduVia (7 %) a KUDYKAMPUS (6 %) |
| Praha | Čtyřletá gymnázia | 0,19 | 0,06 | 0 | Litoměřická 5 → 2 %, Keplera 3 → 5 % |
| Praha | Hotelnictví a gastronomie | 0,15 | 0,06 | 0,13 | nové obory Smíchovské SPŠ |
| Praha | Ekonomické | 0,15 | 0,06 | 0,03 | Ekonomické lyceum Resslova 3 → 6 % |
| Praha | Nástavby Podnikání | 0,15 | 0,09 | 0 | |
| Praha | Zdravotnické a chemie | 0,13 | 0,06 | 0,05 | |
| Praha | Doprava a logistika | 0,11 | 0,07 | 0 | |
| Praha | Technické | 0,09 | 0,06 | 0 | |
| Praha | Kadeřnice, kosmetika, potravinářské obory | 0,09 | 0,07 | 0 | |
| Praha | Osmiletá gymnázia | 0,07 | 0,06 | 0 | |
| Praha | Šestiletá gymnázia | 0,07 | 0,05 | 0 | |
| Praha | Konzervatoře: zpěv | 0,13 | 0,12 | 0 | těsně |
| Praha | Grafika, multimédia | 0,09 | 0,08 | 0 | těsně; podíl na uchazečích města 6,4 → 5,0 % |
| Praha | Stavební řemesla | 0,09 | 0,09 | 0 | těsně |
| Praha | Automobilní obory | 0,08 | 0,08 | 0 | těsně |

V Brně jsou osmiletá a šestiletá gymnázia, kadeřnice a gastronomie, automobilní obory, stavební řemesla, nástavby, grafika a obě odborná učiliště v mezích šumu. V Praze jen malé okruhy: konzervatoře s hudbou, odborné učiliště, ošetřovatelé, umělecká řemesla a škola pro zrakově postižené. Velké pražské okruhy mají víc uchazečů, takže šum je u nich menší a odhalí i menší přesun.

**Odpověď na otázku zadání:** zájem z okruhu neodchází, přesouvá se uvnitř něj. Část přesunu vysvětluje nová nabídka. V Praze vzaly tři nové obory okruhu soukromých a alternativních gymnázií v prvním roce 15 % jeho prvních voleb, aniž by okruh na městě vyrostl o víc než 0,9 bodu.

### 5.3 Příklad: čtyřletá gymnázia v Brně

Přihlášky z katalogu, který je má i za rok 2024:

| Obor | 2024 | 2025 | 2026 |
|---|---:|---:|---:|
| SPŠ chemická a gymnázium, Vranovská | 249 | 491 | 247 |
| Gymnázium Matyáše Lercha, Žižkova | 428 | 212 | 323 |
| Gymnázium, Slovanské náměstí | 566 | 310 | 409 |
| Gymnázium, Křenová | 416 | 341 | 383 |
| Gymnázium, Elgartova | 400 | 390 | 369 |
| **Okruh celkem (16 oborů ve všech třech ročnících)** | **3 879** | **3 641** | **3 564** |

Obtížnost přijetí na Vranovské: v roce 2025 těžké (dostalo se 42 % soutěžících uchazečů), v roce 2026 se dostala většina (85 %). Na Slovanském náměstí opačně: z těžkého na velmi těžké.

Tohle je vzorec, který zadání popisuje: zájem o jeden obor vyskočí a pak se vrátí, ostatní obory okruhu se zrcadlově propadnou a znovu naplní. Celý okruh se přitom mění málo. Z příkladu jde vidět, proč rodině nestačí obtížnost jednoho oboru z jednoho ročníku: stejný obor byl v roce 2025 těžký a v roce 2026 se dostala většina. **Proč** zájem vyskočil, data neříkají. Které gymnázium zadání myslí jako „nové státní gymnázium otevřené 2024“, z dat neurčím. Gymnázium Elgartova má přihlášky už v katalogu 2024 a zrcadlový vzorec nemá. Ověření patří Patrickovi (Jak otestovat v zadání).

Katalogová řada má tři ročníky přihlášek, ale jen u oborů s jednotnou zkouškou a bez nástaveb v letech 2024 a 2025. Okruhy samotné jsou ze dvou ročníků dat uchazečů. Slovo „trend“ se tu proto nepoužívá.

## 6. Směr: kdo je komu první volbou

**Přednost v okruhu:** ze všech dvojic oborů téhož okruhu na jedné přihlášce podíl těch, kde měl uchazeč tento obor výš. Hodnota 0,5 znamená, že ho uchazeči měli výš i níž stejně často. Nezveřejňuje se pod 10 dvojicemi.

Čtyřletá gymnázia Brna, rok 2026 (v závorce 2025):

| Obor | Přednost v okruhu | Obtížnost přijetí |
|---|---:|---|
| Gymnázium Matyáše Lercha | 0,67 (0,73) | těžké (středně těžké) |
| Gymnázium, Křenová | 0,62 (0,64) | těžké (těžké) |
| SPŠ chemická a gymnázium, Vranovská | 0,62 (0,57) | dostala se většina (těžké) |
| Gymnázium, třída Kpt. Jaroše | 0,62 (0,53) | dostala se většina (středně těžké) |
| Biskupské gymnázium | 0,61 (0,74) | středně těžké (středně těžké) |
| Gymnázium, Slovanské náměstí | 0,58 (0,64) | velmi těžké (těžké) |
| Gymnázium, Vídeňská | 0,46 (0,48) | těžké (těžké) |
| Gymnázium, Elgartova | 0,36 (0,37) | těžké (středně těžké) |
| Moravské gymnázium | 0,13 (0,18) | středně těžké (dostala se většina) |

Dvě věci jsou vidět hned. Přednost je mezi ročníky stabilnější než obtížnost (Elgartova 0,37 a 0,36, Moravské gymnázium 0,18 a 0,13). A přednost s obtížností nesouvisí jednoduše: obor, který mají uchazeči spíš níž, může být těžký, protože ho mnoho lidí bere jako druhou možnost. Přednost tedy popisuje, **co rodiny chtěly**, ne jak těžké bylo se dostat. Obojí patří vedle sebe a ani jedno není pořadí kvality.

Podobný údaj už web má: *Kohorta podle pozice na přihlášce* srovnává podíl prvních voleb s obory stejného typu v celé zemi. Přednost v okruhu srovnává jen s obory, mezi kterými se titíž uchazeči skutečně rozhodovali. Může se lišit: obor, který je celostátně „záložní volba“, může být v okruhu svého města spíš výš.

## 7. Co ukázat a co ne

### 7.1 Kde

| Možnost | Pro | Proti |
|---|---|---|
| **A. Stránka oboru, rozšíření sekce „Kam se hlásí stejní uchazeči“** | Rodina je tam, když řeší konkrétní obor. Navazuje na existující sekci, okruh jen rozšíří šest sousedů na celou skupinu. | Na stránce oboru je už hodně bloků; okruh musí být sbalený. |
| **B. Stránka města, přehled okruhů** | Odpovídá na otázku podnětu: mezi čím se ve velkém městě rozhoduje. Karty škol tam už jsou ([stránka města](navrh-stranky-mesta-2027.md)). | Jen pro města s okruhy (Praha, Brno a další s dost obory, oddíl 9). |
| C. Vlastní stránka okruhu | Prostor pro vývoj mezi ročníky a celou tabulku. | Okruh nemá stabilní identitu (shoda 0,66–0,75, okrajové obory přeskakují) ani přirozený název. Stránka s adresou by z něj udělala kategorii, kterou není. Přibyly by desítky tenkých stránek. |

**Doporučení: A a B, C ne.** Na stránce oboru blok „Obory, mezi kterými se uchazeči rozhodují“ jako rozbalitelné rozšíření sekce „Kam se hlásí stejní uchazeči“. Na stránce města oddíl s okruhy jako odkazy na seznam oborů okruhu na téže stránce (filtr, ne nová adresa).

### 7.2 Co v bloku

U oboru v okruhu: název školy a oboru, počet uchazečů, přednost v okruhu slovy, odznak obtížnosti přijetí s rokem, u učebních oborů značka „bez jednotné zkoušky“. Pod tabulkou u okruhu: kolik uchazečů měl okruh v obou ročnících a kolik z nich mělo na přihlášce i obor mimo okruh.

**Řazení: podle počtu uchazečů**, nikdy podle obtížnosti ani podle přednosti. Počet uchazečů říká, jak velká část rozhodování na obor připadá, a neplete se s kvalitou. Řazení podle přednosti by z okruhu udělalo žebříček oblíbenosti.

**Vývoj mezi ročníky:** u oboru dvojice let u přednosti a obtížnosti („těžké v roce 2026, dostala se většina v roce 2025“). U okruhu věta o přesunu jen tehdy, když je nad šumem: „Mezi lety 2025 a 2026 se mezi obory tohoto okruhu přesunula zhruba desetina zájmu; celý okruh měl podobný počet uchazečů.“

### 7.3 Jak mluvit o šancích

Pravidla pro texty bloku (požadavek zadání):

1. **Okruh popisuje, jak se uchazeči hlásili a jak dopadli v konkrétních ročnících.** Žádná věta nesmí mluvit o tom, jak dopadne uchazeč příští rok. Vždy s rokem, nikdy „loni“ nebo „letos“.
2. **Obtížnost se ukazuje vždy u dvou ročníků, když je máme.** Příklad Vranovské (těžké, pak dostala se většina) je přesně ta situace, kdy jeden ročník rodinu zavede: obor, kam se v roce 2026 „dostala většina“, mohl být rok předtím těžký, protože ho chtěli všichni.
3. **Žádné „sem ano, sem ne“.** Blok neříká, který obor zvolit jako pojistku, ani nenavrhuje pořadí na přihlášce. Na to je Simulátor přijímaček s vlastními výhradami. Pokud blok na simulátor odkazuje, tak jen odkazem.
4. **Pevná věta o vývoji, když je přesun nad šumem:** „Zájem se mezi obory tohoto okruhu mezi ročníky přesouvá. Obor, kam se v jednom roce dostal skoro každý, může být další rok těžký.“ Je to popis doloženého jevu, ne předpověď, a odpovídá na podnět rodiče.
5. **Přednost v okruhu se nikdy nepíše jako „oblíbenost“ ani „žádanost“**, jen jako „uchazeči ho měli na přihlášce spíš výš / spíš níž než ostatní obory okruhu“. U rad platí věta ze slovníku pojmů: pořadí na přihlášce šanci na přijetí nemění.
6. **Okruh není pevná kategorie.** Pod blokem: „Okruh jsme spočítali z toho, které obory měli uchazeči na přihlášce zároveň. Obory na okraji okruhu se mohou mezi ročníky přesunout do sousedního.“

### 7.4 Pojmenování okruhu

Zdroj název nenese. Ruční pojmenování v oddílu 4 se do etapy 2 nepřenáší, protože se okruhy přepočítají. Návrh pro etapu 2: název z převažujícího druhu oborů podle prvních dvou číslic KKOV a kategorie (79-41-K/41 → „čtyřletá gymnázia“, 63-41-M → „obchodní akademie a ekonomické obory“), s ručním převodníkem do 30 položek. Kde žádný druh nepřevažuje, okruh se pojmenuje podle tří největších oborů („Gymnázium Křenová, Gymnázium Elgartova a další“). Převodník je otevřená otázka etapy 2.

### 7.5 Meze zveřejnění a dopočítávání

- Obor v okruhu jen s aspoň 10 uchazeči ve městě, hrana jen s aspoň 10 společnými uchazeči (už v metodě).
- Přednost v okruhu a podíl prvních voleb v okruhu se u oboru zobrazí jen při aspoň 10 dvojicích, resp. 10 uchazečích.
- **Součty za okruh se počítají jen z oborů, které se zobrazují**, a počet uchazečů okruhu se zaokrouhluje dolů na desítky. Okruh tak nejde odečíst od součtu zobrazených oborů a dostat skrytý malý obor.
- U posunu v okruhu se ukazuje obor jen tehdy, když má v obou ročnících 0 nebo aspoň 10 prvních voleb.
- **Okruh s méně než 3 obory nebo s méně než 30 uchazeči se nezobrazuje.** U okruhů jedné školy (odborná učiliště) se nezobrazuje, protože popisuje rozhodování mezi obory jedné školy a dopočítat by se dal z jejích čísel na stránce školy. Rozhodnutí o konzervatořích (3 a 4 obory tří až čtyř škol) nechávám na schválení.

## 8. Nové ukazatele a pojmy

Zapsané ve [slovníku ukazatelů](slovnik-ukazatelu.md) (verze 1.54, oddíl 1) a v registru u sady `cermat-uchazeci-kolo1`:

- **Okruh oborů**: rozdělení oborů města podle společných uchazečů (oddíl 3).
- **Přednost v okruhu**: oddíl 6.
- **Podíl prvních voleb v okruhu**: obor, který měl uchazeč okruhu na přihlášce nejvýš.
- **Podíl okruhu na uchazečích města**: oddíl 5.1.
- **Přesun zájmu v okruhu**: oddíl 5.1, se šumem.

Ve [slovníku pojmů](slovnik-pojmu.md) (verze 1.38): **okruh oborů** a **spíš výš / spíš níž v okruhu**. Nepoužívat: shluk, cluster, trh, skupina oborů (to jsou podobné školy SMO16), konkurence, oblíbenost.

## 9. Otevřené otázky ke schválení

1. **Umístění:** stránka oboru (A) a stránka města (B), bez vlastní stránky okruhu. Souhlas?
2. **Varianta metody:** normovaná váha, γ = 1,0. Před nasazením přepočítat pro všechna města přehledu a potvrdit, že stabilita nespadne. Pro menší města (Ostrava, Plzeň, Olomouc) okruhy ještě nikdo neviděl.
3. **Které město má okruhy:** navrhuji práh 3 okruhy s aspoň 3 obory. Měřit pro všechna města v etapě 2.
4. **Data uchazečů 2024:** ohlásit stažení souboru (data.cermat.cz, jeden soubor, jeden dotaz) a převod IZO na REDIZO, aby okruhy a přednost měly tři ročníky. Bez toho zůstává jedno srovnání.
5. **Konzervatoře a malé okruhy** (oddíl 7.5).
6. **Nástavby:** ze stránky města pro deváťáky vynechat, nebo ukázat odděleně jako „kam po výučním listu“ (souvisí s [obory bez jednotné zkoušky](navrh-obory-bez-jpz-2027.md))?
7. **Pojmenování okruhů:** převodník KKOV → název (oddíl 7.4).

## 10. Co rozbor neříká

- **Kam uchazeči nastoupili.** Popisuje přihlášky a výsledek 1. kola.
- **Proč se zájem přesunul.** Nový obor, změna kritérií, pověst, dojezd: nic z toho data nenesou.
- **Jak dopadne konkrétní uchazeč.** Okruh ani přednost šanci nepředpovídají.
- **Nic o kvalitě školy.** Okruh je o tom, mezi čím se rodiny rozhodují, ne o tom, co je lepší.
- **Zaměření.** Okruh je po oborech školy, zaměření téhož oboru se slučují.
- **Uchazeče mimo město.** Uchazeč z Kuřimi s přihláškou do Brna se počítá u brněnských oborů; jeho obor v Kuřimi do brněnského okruhu nepatří. U oborů v okruzích je podíl uchazečů s přihláškou i mimo město 0–66 %.
