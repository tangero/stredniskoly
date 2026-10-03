# Okruhy oborů ve městě: shluky podle souběžných přihlášek

Verze 1.2 · 3. 10. 2026 · **Návrh etapy 1 zadání [#277](https://github.com/tangero/stredniskoly/issues/277) s rozhodnutími vlastníka z 3. 10. 2026 (oddíl 9).** Web se nemění. Realizace (etapa 2) se doplní do zadání. Verze 1.2 přidává okruhy bez hranic měst (oddíl 6a), protože uchazeči se nehlásí jen do svého města.

Rozbor reprodukuje `python3 scripts/rozbor-shluky-oboru.py`. Výstup je v [podkladu](podklady/shluky-oboru-2026-10-03.json), který neobsahuje řádky o jednotlivých uchazečích ani počty pod 10.

## 0. Shrnutí

1. **Ve městě existují okruhy oborů, mezi kterými se uchazeči přelévají, a dají se z dat najít.** V Brně jich v roce 2026 vychází 13 se 168 obory, v Praze 21 se 412 obory. Okruhy dávají obsahový smysl: osmiletá, šestiletá a čtyřletá gymnázia zvlášť, ekonomické obory, technické obory, zdravotnické a sociální obory, kadeřnice a gastronomie, automobilní obory, stavební řemesla, grafika a média, obory E odborných učilišť.
2. **Okruhy nejsou náhodné.** Stejnou metodou spočítané okruhy let 2024, 2025 a 2026 se mezi každou dvojicí let shodují s upraveným Randovým indexem 0,69–0,76 v Brně a 0,66–0,69 v Praze. Při náhodném přeřazení oborů vychází 0,00 (95. percentil nejvýš 0,02).
3. **Zájem z okruhu neodchází, přesouvá se uvnitř něj.** Podíl okruhu na uchazečích města se za tři roky změnil v Brně nejvýš o 1,3 procentního bodu, v Praze o 2,5 bodu (okruh soukromých a alternativních gymnázií, do kterého přibyly nové školy). Rozdělení uchazečů mezi obory uvnitř okruhu se ale posouvá víc, než dovoluje náhoda: mezi 2024 a 2025 u 8 ze 13 okruhů v Brně a 14 z 21 v Praze, mezi 2025 a 2026 u 4 a 16. Nejsilnější příklad je čtyřleté gymnázium SPŠ chemické a gymnázia Brno na Vranovské: 249, 491 a 247 uchazečů v letech 2024, 2025 a 2026, přijetí „dostala se většina“, pak „těžké“, pak zase „dostala se většina“. Gymnázium Matyáše Lercha a Gymnázium na Slovanském náměstí se pohybovala přesně opačně.
4. **Přihlášky souvisejí s obtížností z předchozího roku.** U čtyřletých gymnázií v celé zemi platí: čím snazší bylo přijetí v roce 2025, tím víc přihlášek obor dostal v roce 2026, i po odečtení návratu k průměru po skoku v roce 2025 (oddíl 5.4). Je to souvislost, ne doložená příčina: slučuje se s hypotézou, že rodiny volí podle obtížnosti z minulého roku, ale data neříkají, podle čeho se rodiny rozhodovaly. Doloženo je, že obtížnost přijetí jednoho oboru se mezi ročníky silně mění, a proto ji jeden ročník nepopisuje.
5. **Směr přihlášek uvnitř okruhu je čitelný.** U každého oboru jde říct, jak často ho uchazeči měli na přihlášce výš než ostatní obory okruhu. Ve čtyřletých gymnáziích Brna má Gymnázium Matyáše Lercha 0,67 a Moravské gymnázium 0,13.
6. **Hranice města okruh neurčuje.** Uchazeči o gymnázium v Brandýse nad Labem mají na přihlášce z 56 % i obor v Praze a z 32 % gymnázium v Čelákovicích. Okruhy se proto počítají nad celou zemí uvnitř spádových oblastí odhadnutých z přihlášek (oddíl 6a). Ve velkých městech vycházejí stejně jako okruhy počítané jen ve městě a přidají obory z okolí. Rozptýlené vazby předměstí do velkého města (56 % uchazečů do 40 různých pražských oborů, žádný s 10 společnými) ale žádné rozdělení na okruhy nezachytí. Ukáže je až souhrn po obcích na stránce oboru.
7. **Rozhodnutí vlastníka 3. 10. 2026:** stránka oboru dostane blok „Které další obory v okolí uchazeči také volí“ bez hranic měst, s obory a souhrnem po obcích. Stránka města dostane okruhy ze spádových oblastí. Vlastní stránka okruhu nebude. Obtížnost přijetí jen jako odznak u oboru, neřadit podle ní (oddíly 7 a 9).

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
| Katalog `schools_data.json` (2.10), `prihlasky` | přihlášky 2024 až 2026 u oborů s jednotnou zkouškou: kontrola řady přihlášek proti datům uchazečů |
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

**Data uchazečů 2024** byla v první verzi návrhu jen místní mezera. Vlastník projektu 3. 10. 2026 povolil jejich stažení. Způsob je ohlášený v issue #277: jeden soubor z data.cermat.cz, uložený v `data/`, necommitovaný. Revize souboru z 20. 5. 2026 nese **REDIZO**, ne IZO. Poznámka v `scripts/offer-history.py` o klíči IZO platí pro starší revizi. Struktura je stejná jako u let 2025 a 2026, takže převod není potřeba. Starší ročníky v podobě dat o jednotlivých uchazečích CERMAT nevydává.

## 2. Data a populace

- **Ročníky:** data uchazečů 2024, 2025 a 2026 z místních souborů v `data/`. Skript bere zobrazený rok z registru (sada `cermat-uchazeci-kolo1`, dnes 2026) a dva roky před ním. Souhrny 1. kola v repozitáři jsou jen za 2025 a 2026, obtížnost přijetí za rok 2024 se proto počítá ze soutěžících v datech uchazečů (pole `zdroj_obtiznosti`; definice se od souhrnů mírně liší, viz slovník ukazatelů, *Soutěžící o obor*).
- **Populace:** přihlášky do denního nezkráceného studia, zaměření téhož oboru sloučená. Je to tatáž populace jako u souběžných přihlášek a kontextu přihlášek.
- **Město:** obor patří do města, když index názvů vede obec školy jako „Brno“ nebo „Praha“. Obory na přihláškách, které index nezná, nemají obec a do města se nepočítají.
- **Uchazeči města:** uchazeči s aspoň jedním oborem ve městě. V Brně 12 843 (2024), 12 625 (2025) a 12 267 (2026), v Praze 32 517, 32 142 a 32 069.

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

Shoda mezi ročníky = upravený Randův index (ARI) mezi okruhy dvou let na oborech, které jsou v obou letech a aspoň v jednom z nich leží v okruhu s aspoň 3 obory. Samostatné obory bez hrany se nepočítají, shodu by nafoukly. Náhoda = ARI při náhodném přeřazení oborů se zachovanými velikostmi okruhů, 300 losování.

| Město | Váha | γ | Okruhů ≥ 3 oborů 2024 / 2025 / 2026 | Shoda mezi běhy 2026 | Shoda 2024 ↔ 2025 | 2025 ↔ 2026 | 2024 ↔ 2026 | Náhoda (95. percentil) |
|---|---|---:|---|---:|---:|---:|---:|---:|
| Brno | počet | 1,0 | 10 / 15 / 12 | 0,97 | 0,62 | 0,65 | 0,64 | 0,02 |
| Brno | normovaná | 0,7 | 11 / 16 / 13 | 0,92 | 0,65 | 0,77 | 0,67 | 0,02 |
| Brno | **normovaná** | **1,0** | 13 / 16 / 13 | 0,94 | 0,76 | 0,75 | 0,69 | 0,01 |
| Brno | normovaná | 1,5 | 16 / 16 / 15 | 0,89 | 0,64 | 0,67 | 0,64 | 0,02 |
| Brno | počet | 1,5 | 13 / 15 / 14 | 0,98 | 0,71 | 0,67 | 0,68 | 0,02 |
| Praha | počet | 1,0 | 21 / 17 / 18 | 0,93 | 0,67 | 0,74 | 0,69 | 0,01 |
| Praha | normovaná | 0,7 | 20 / 17 / 17 | 0,93 | 0,70 | 0,65 | 0,67 | 0,01 |
| Praha | **normovaná** | **1,0** | 22 / 19 / 21 | 0,91 | 0,68 | 0,66 | 0,69 | 0,01 |
| Praha | normovaná | 1,5 | 26 / 22 / 23 | 0,88 | 0,64 | 0,63 | 0,68 | 0,01 |
| Praha | počet | 1,5 | 23 / 22 / 22 | 0,92 | 0,69 | 0,66 | 0,65 | 0,01 |

Modularita vybraných rozdělení roku 2026 je 0,84 v Brně a 0,86 v Praze. Mezi variantami s jinou váhou ji srovnávat nejde, protože každá se počítá na jiném grafu.

**Volba: normovaná váha, γ = 1,0.** V Brně má v průměru tří dvojic let nejvyšší shodu (0,73). V Praze je o 0,02 stabilnější váha *počet*, ale její největší okruh má 69 oborů místo 52: velké obory k sobě táhnou všechno, s čím mají pár desítek společných uchazečů. Rozdíly mezi variantami jsou malé proti rozdílu od náhody, závěry o okruzích na volbě nestojí. Před etapou 2 doporučuji volbu ověřit na dalších městech (oddíl 9).

Co shoda 0,66–0,76 znamená prakticky: většina oborů zůstává ve stejném okruhu, část okrajových oborů přeskakuje mezi sousedními okruhy (například obory chemie mezi čtyřletými gymnázii a zdravotnickými obory). Přiřazení oboru k okruhu proto nesmí na stránce vypadat jako pevná kategorie (oddíl 7.3).

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

Okruhy roku 2026 se přenesou na data let 2025 a 2024: tytéž obory, ale **jiní uchazeči**. Každý rok se hlásí jiný ročník dětí, takže nejde o to, že by tytéž děti přešly jinam. Je to posun poptávky mezi ročníky.

- **Podíl okruhu na uchazečích oblasti** (v této městské variantě je oblastí město): různí uchazeči okruhu ÷ uchazeči města. Ukazuje, zda zájem z okruhu odchází.
- **Přesun zájmu v okruhu:** u každého uchazeče okruhu se vezme obor, který měl z okruhu na přihlášce nejvýš. Rozdělení těchto voleb mezi obory okruhu se porovná mezi ročníky součtem kladných rozdílů podílů (polovina součtu absolutních rozdílů, *total variation*). Hodnota 0,10 znamená, že se mezi obory okruhu přesunula desetina zájmu.
- **Šum:** kolik přesunu dá samotná náhoda, když se oba ročníky losují ze stejného rozdělení se stejným počtem uchazečů. Přesun nad 95. percentilem šumu je skutečný posun.

### 5.2 Výsledky

Tučně je přesun nad 95. percentilem šumu, v závorce šum. Poslední sloupec je podíl prvních voleb v okruhu v roce 2026, které připadly na obory, jež v roce 2025 neměly žádného uchazeče.

| Město | Okruh | Podíl na uchazečích města 2024 / 2025 / 2026 (%) | Přesun 2024 → 2025 (šum) | Přesun 2025 → 2026 (šum) | První volby 2026 na nových oborech |
|---|---|---|---:|---:|---:|
| Brno | Technické obory | 18,3 / 18,7 / 18,1 | **0,12** (0,07) | **0,09** (0,07) | 0,00 |
| Brno | Zdravotnické, sociální, pedagogické | 16,0 / 16,9 / 16,4 | **0,12** (0,07) | **0,14** (0,07) | 0,03 |
| Brno | Čtyřletá gymnázia a chemie | 16,0 / 16,0 / 15,7 | **0,15** (0,07) | **0,10** (0,07) | 0,00 |
| Brno | Ekonomické obory | 14,6 / 14,5 / 14,9 | **0,15** (0,06) | **0,13** (0,07) | 0,03 |
| Brno | Kadeřnice, kosmetika, gastronomie | 11,9 / 13,0 / 13,2 | 0,04 (0,07) | 0,07 (0,07) | 0,00 |
| Brno | Osmiletá gymnázia | 11,3 / 11,6 / 11,9 | **0,08** (0,06) | 0,06 (0,06) | pod mezí 10 |
| Brno | Šestiletá gymnázia | 10,0 / 9,2 / 9,5 | **0,08** (0,07) | 0,05 (0,07) | 0,00 |
| Brno | Automobilní obory | 7,3 / 6,9 / 6,3 | 0,05 (0,07) | 0,05 (0,07) | 0,00 |
| Brno | Stavební řemesla | 4,4 / 5,6 / 5,7 | 0,09 (0,10) | 0,07 (0,10) | 0,00 |
| Brno | Nástavby Podnikání | 3,9 / 4,3 / 4,2 | **0,10** (0,10) | 0,07 (0,10) | 0,00 |
| Brno | Grafika, design, média | 5,1 / 4,3 / 4,0 | **0,15** (0,08) | 0,07 (0,09) | 0,00 |
| Brno | Odborné učiliště: stravování | 0,8 / 1,2 / 1,1 | 0,10 (0,15) | 0,07 (0,14) | 0,00 |
| Brno | Odborné učiliště: řemeslné práce | 0,6 / 0,6 / 0,7 | 0,03 (0,17) | 0,07 (0,15) | 0,00 |
| Praha | Ekonomické obory | 19,2 / 20,7 / 20,6 | **0,20** (0,05) | **0,14** (0,05) | 0,03 |
| Praha | Osmiletá gymnázia | 17,3 / 16,5 / 16,7 | **0,08** (0,05) | **0,07** (0,05) | 0,00 |
| Praha | Čtyřletá gymnázia | 13,5 / 12,8 / 12,9 | **0,21** (0,06) | **0,19** (0,06) | 0,00 |
| Praha | Technické obory | 12,7 / 12,3 / 11,8 | **0,13** (0,06) | **0,09** (0,06) | 0,00 |
| Praha | Šestiletá gymnázia | 10,6 / 9,9 / 9,3 | **0,09** (0,05) | **0,07** (0,05) | 0,00 |
| Praha | Kadeřnice, kosmetika, potravinářské obory | 8,7 / 9,8 / 9,0 | **0,10** (0,07) | **0,09** (0,07) | 0,00 |
| Praha | Soukromá a alternativní gymnázia | 5,4 / 6,9 / 7,9 | **0,14** (0,07) | **0,24** (0,07) | 0,15 |
| Praha | Hotelnictví, gastronomie | 6,8 / 7,0 / 7,5 | **0,09** (0,06) | **0,15** (0,07) | 0,13 |
| Praha | Zdravotnické obory, chemie | 7,8 / 7,9 / 7,4 | **0,12** (0,06) | **0,13** (0,07) | 0,05 |
| Praha | Automobilní obory | 6,6 / 6,8 / 7,1 | **0,08** (0,08) | **0,08** (0,08) | 0,00 |
| Praha | Grafika, multimédia | 6,1 / 6,3 / 5,0 | **0,11** (0,07) | **0,09** (0,08) | 0,00 |
| Praha | Nástavby Podnikání | 2,5 / 3,3 / 4,1 | **0,14** (0,10) | **0,15** (0,09) | 0,00 |
| Praha | Stavební řemesla | 3,4 / 3,7 / 3,9 | 0,07 (0,09) | **0,09** (0,09) | 0,00 |
| Praha | Bezpečnostní obory | 2,3 / 2,1 / 3,7 | **0,15** (0,06) | **0,42** (0,06) | 0,42 |
| Praha | Doprava, logistika | 3,2 / 3,3 / 3,0 | **0,09** (0,07) | **0,11** (0,07) | 0,00 |
| Praha | Konzervatoře: hudba | 0,7 / 0,7 / 0,7 | 0,09 (0,10) | 0,04 (0,11) | 0,00 |
| Praha | Konzervatoře: zpěv | 0,5 / 0,5 / 0,5 | 0,09 (0,12) | **0,13** (0,13) | 0,00 |
| Praha | Odborné učiliště | 0,5 / 0,4 / 0,5 | 0,09 (0,15) | 0,12 (0,15) | 0,00 |
| Praha | Ošetřovatel, pečovatelské služby | 0,4 / 0,4 / 0,4 | 0,08 (0,12) | 0,11 (0,13) | 0,00 |
| Praha | Umělecká řemesla | 0,2 / 0,2 / 0,2 | 0,03 (0,20) | 0,10 (0,17) | 0,00 |
| Praha | Škola pro zrakově postižené | 0,1 / 0,1 / 0,1 | 0,17 (0,24) | 0,12 (0,25) | 0,00 |

Podíl okruhu na uchazečích města se za tři roky změnil v Brně nejvýš o 1,3 procentního bodu. V Praze o 2,5 bodu u soukromých a alternativních gymnázií (nové školy, 5,4 → 7,9 %), o 1,6 bodu u bezpečnostních oborů (nová policejní škola v roce 2026) a o 1,5 bodu u ekonomických oborů. U ostatních okruhů o méně.

Přesun uvnitř okruhu je nad šumem mezi 2024 a 2025 u 8 ze 13 okruhů v Brně a 14 z 21 v Praze, mezi 2025 a 2026 u 4 a 16. V Brně jsou v obou dvojicích let v mezích šumu kadeřnice a gastronomie, automobilní obory, stavební řemesla a odborná učiliště. Velké pražské okruhy mají víc uchazečů, takže šum je u nich menší a odhalí i menší přesun.

**Odpověď na otázku zadání:** zájem z okruhu neodchází, přesouvá se uvnitř něj, a to každý rok. Část přesunu vysvětluje nová nabídka: v Praze vzaly tři nové obory okruhu soukromých a alternativních gymnázií v prvním roce 15 % jeho prvních voleb a nová policejní škola 42 % prvních voleb okruhu bezpečnostních oborů. Většina přesunu ale probíhá mezi obory, které existují ve všech třech ročnících.

### 5.3 Příklad: čtyřletá gymnázia v Brně

Data uchazečů za tři ročníky. *Obtížnost* je obtížnost přijetí slovy a v závorce podíl soutěžících uchazečů, kteří se dostali; za rok 2024 z dat uchazečů, za další roky ze souhrnů 1. kola.

| Obor | Uchazeči 2024 / 2025 / 2026 | Obtížnost 2024 | 2025 | 2026 |
|---|---|---|---|---|
| SPŠ chemická a gymnázium, Vranovská | 249 / 491 / 247 | dostala se většina (78 %) | těžké (42 %) | dostala se většina (85 %) |
| Gymnázium Matyáše Lercha | 428 / 212 / 323 | velmi těžké (32 %) | středně těžké (53 %) | těžké (40 %) |
| Gymnázium, Slovanské náměstí | 501 / 284 / 366 | velmi těžké (26 %) | těžké (38 %) | velmi těžké (32 %) |
| Gymnázium, Křenová | 416 / 341 / 383 | těžké (34 %) | těžké (39 %) | těžké (47 %) |
| Gymnázium, Elgartova | 400 / 390 / 369 | těžké (43 %) | středně těžké (52 %) | těžké (49 %) |
| Gymnázium, Vídeňská | 249 / 231 / 223 | těžké (39 %) | těžké (46 %) | těžké (44 %) |

Přihlášky celého okruhu (16 oborů s jednotnou zkouškou vedených v katalogu ve všech třech ročnících): 3 879, 3 641 a 3 564. Podíl okruhu na uchazečích města: 16,0, 16,1 a 15,7 %.

Tohle je vzorec, který zadání popisuje, jen na jiné škole. Vranovská byla v roce 2024 obor, kam se dostala většina soutěžících uchazečů. V roce 2025 se počet uchazečů zdvojnásobil a přijetí bylo těžké. V roce 2026 se počet vrátil a přijetí bylo zase snadné. Gymnázium Matyáše Lercha a Gymnázium na Slovanském náměstí se pohybovala zrcadlově: po velmi těžkém roce 2024 jim v roce 2025 ubyla polovina, resp. čtyři desetiny uchazečů a přijetí bylo snazší, v roce 2026 se zájem vrátil. Celý okruh se přitom téměř nemění.

Podíl prvních voleb Vranovské na celé přihlášce byl ve všech třech letech podobný (30 %, 43 % a 45 % přihlášek). Změnil se počet uchazečů, ne to, jakou pozici obor na přihláškách měl.

Které gymnázium zadání myslí jako „nové státní gymnázium otevřené 2024“, z dat neurčím. Gymnázium Elgartova má uchazeče už v roce 2024 a zrcadlový vzorec nemá. Ověření patří Patrickovi (Jak otestovat v zadání).

### 5.4 Souvisí přihlášky s obtížností z předchozího roku?

Zrcadlový vzorec se slučuje s hypotézou, že část rodin volí podle toho, jak těžké bylo přijetí v minulém ročníku: obor, kam „se dostala většina“, přitáhne další rok víc uchazečů, a proto je těžký. Ověřil jsem, zda odpovídající souvislost platí i v celé zemi, ne jen v Brně. Hypotézu samu tím ověřit nejde.

Data: souhrny 1. kola sečtené za REDIZO a KKOV, obory s nezměněnou kapacitou, aspoň 20 soutěžícími uchazeči v roce 2025 a aspoň 20 přihláškami ve všech třech letech, přihlášky 2024 z katalogu. Závislá veličina je logaritmus poměru přihlášek 2026 / 2025. Vysvětlující veličiny jsou podíl přijatých ze soutěžících 2025 a logaritmus poměru přihlášek 2025 / 2024. Druhá veličina odečítá prostý návrat k průměru: obor, kterému přihlášky v roce 2025 vyskočily, by jich v roce 2026 měl méně, i kdyby na obtížnost nikdo nehleděl.

| Obory | Počet | Vliv snadnosti přijetí 2025 (95% interval) | Návrat k průměru po skoku 2024 → 2025 |
|---|---:|---:|---:|
| čtyřletá gymnázia | 196 | +0,62 (± 0,14) | −0,54 (± 0,08) |
| všechny obory | 1 301 | +0,14 (± 0,04) | −0,46 (± 0,04) |

Jak to číst: u čtyřletého gymnázia, kde se v roce 2025 dostalo 80 % soutěžících uchazečů místo 40 %, přišlo v roce 2026 v průměru zhruba o 28 % přihlášek víc, při stejném skoku v předchozím roce. Souvislost se snadností přijetí tedy zůstává i po odečtení návratu k průměru. U čtyřletých gymnázií je zhruba čtyřikrát silnější než u všech oborů dohromady.

**Co to nedokazuje:** příčinu ani motivaci rodin. Model nezná, podle čeho se rodiny rozhodovaly, a stejnou souvislost může vytvořit i souběžná změna kritérií přijetí, kapacity okolních oborů, nové obory v okolí nebo pověst školy. Jsou to dvě dvojice let a pozorovaná data, ne pokus. Výpočet je v tomto oddílu, ne ve skriptu; pokud se má stát ukazatelem nebo větou na webu, patří do etapy 2 jako samostatný rozbor se zápisem do slovníku a web o reakci rodin mluvit nesmí.

Co to znamená pro stránku: pravidlo 7.3 bod 2 (obtížnost vždy za dva roky) stojí na doložené proměnlivosti obtížnosti mezi ročníky (oddíl 5.3, slovník ukazatelů, *Obtížnost přijetí slovy*), ne na tomto modelu.

## 6. Směr: kdo je komu první volbou

**Přednost v okruhu:** ze všech dvojic oborů téhož okruhu na jedné přihlášce podíl těch, kde měl uchazeč tento obor výš. Hodnota 0,5 znamená, že ho uchazeči měli výš i níž stejně často. Nezveřejňuje se pod 10 dvojicemi.

Čtyřletá gymnázia Brna, přednost v okruhu 2024 / 2025 / 2026:

| Obor | Přednost v okruhu | Obtížnost přijetí 2026 |
|---|---|---|
| Gymnázium Matyáše Lercha | 0,58 / 0,73 / 0,67 | těžké |
| Gymnázium, Křenová | 0,64 / 0,64 / 0,62 | těžké |
| SPŠ chemická a gymnázium, Vranovská | 0,48 / 0,57 / 0,62 | dostala se většina |
| Gymnázium, třída Kpt. Jaroše | 0,54 / 0,53 / 0,62 | dostala se většina |
| Biskupské gymnázium | 0,64 / 0,74 / 0,61 | středně těžké |
| Gymnázium, Slovanské náměstí | 0,54 / 0,64 / 0,58 | velmi těžké |
| Gymnázium, Vídeňská | 0,45 / 0,48 / 0,46 | těžké |
| Gymnázium, Elgartova | 0,37 / 0,37 / 0,36 | těžké |
| Moravské gymnázium | 0,20 / 0,18 / 0,13 | středně těžké |

Dvě věci jsou vidět hned. Přednost je mezi ročníky stabilnější než obtížnost (Elgartova 0,37, 0,37 a 0,36; Moravské gymnázium 0,20, 0,18 a 0,13), i když se u oborů se skokem v zájmu hýbe (Lercha 0,58 → 0,73). A přednost s obtížností nesouvisí jednoduše: obor, který mají uchazeči spíš níž, může být těžký, protože ho mnoho lidí bere jako druhou možnost. Přednost tedy popisuje, **co rodiny chtěly**, ne jak těžké bylo se dostat. Obojí patří vedle sebe a ani jedno není pořadí kvality.

Podobný údaj už web má: *Kohorta podle pozice na přihlášce* srovnává podíl prvních voleb s obory stejného typu v celé zemi. Přednost v okruhu srovnává jen s obory, mezi kterými se titíž uchazeči skutečně rozhodovali. Může se lišit: obor, který je celostátně „záložní volba“, může být v okruhu svého města spíš výš.

## 6a. Okruhy bez hranic měst

Okruhy v oddílech 3–6 se hledaly jen mezi obory jednoho města. Vlastník projektu 3. 10. 2026 upozornil, že rodina z Brandýsa nad Labem volí i školy v Praze a v Čelákovicích, takže okruh nejde omezit hranicí města. Tento oddíl měří, co se změní, když hranice padne.

### 6a.1 Kam se hlásí uchazeči z okolí: příklad Brandýsu

Čtyřleté Gymnázium J. S. Machara v Brandýse nad Labem-Staré Boleslavi, rok 2026, 94 uchazečů. Kromě tohoto oboru měli na přihlášce obor:

| Obec | Podíl uchazečů |
|---|---:|
| Praha | 56 % |
| Čelákovice | 32 % |

Podíly dalších obcí se nezveřejňují: spolu s přesným počtem společných uchazečů tamního oboru by z nich šlo dopočítat skupinu pod mezí zveřejnění (oddíl 7.5).

Konkrétní obory s aspoň 10 společnými uchazeči jsou jen čtyři: gymnázium v Čelákovicích (30), gymnázium v Neratovicích (20), technické lyceum téže školy (17) a zemědělská škola v Brandýse (10). **Pražských oborů je na přihláškách 40 a žádný nemá 10 společných uchazečů.** Vazba do Prahy je silná jako celek, ale rozptýlená. Z dvojic oborů ji nevyčte žádná metoda, která respektuje mez zveřejnění. Ukáže ji až souhrn po obcích.

Je to i jednosměrné: uchazeči z Brandýsa se hlásí do Prahy, pražští uchazeči do Brandýsa skoro ne. Rozdělení na okruhy, ve kterém každý obor patří do jednoho okruhu, tuhle nesouměrnost nevyjádří.

### 6a.2 Metoda: spádové oblasti a okruhy uvnitř nich

1. **Spádová oblast** (*Oblast přihlášek*): Louvain nad grafem všech oborů v zemi, kde se přihlášky let 2024–2026 sčítají. Oblast je zeměpisná a mezi ročníky se skoro nemění. Odhad z jednoho ročníku posouval hranice oblastí a s nimi i okruhy. V pokusu mimo skript držely oblasti z jednoho ročníku jen 64–69 % dvojic oborů na přihláškách uvnitř oblasti a shoda okruhů mezi ročníky byla 0,51–0,56. Oblasti se odhadují znovu s každým novým ročníkem dat.
2. **Okruhy** po ročnících: tatáž metoda jako ve městě (normovaná váha, γ = 1,0), jen uvnitř každé spádové oblasti místo uvnitř města.

Zkoušené váhy pro oblasti (rok 2026; shoda = ARI okruhů na oborech v okruzích, náhoda nejvýš 0,02):

| Váha oblastí | Oblastí s ≥ 10 obory | Dvojice oborů na přihlášce uvnitř oblasti | Shoda okruhů, celá země | Brno | Praha | mimo Brno a Prahu |
|---|---:|---:|---|---|---|---|
| počet | 38 | 83 % | 0,57–0,60 | 0,67–0,80 | 0,64–0,67 | 0,55–0,57 |
| **normovaná** | **39** | **84 %** | 0,58–0,59 | 0,66–0,78 | 0,63–0,66 | 0,55–0,56 |

Volba: normovaná váha, stejně jako u okruhů. **Okruhy Brna a Prahy počítané bez hranic se s městskými okruhy shodují: Brno 0,94, Praha 0,82.** Metoda tedy ve velkých městech dává totéž, co oddíl 4, a přidává obory z okolí. Mimo velká města je shoda mezi ročníky nižší (0,55–0,56), protože obory tam mají méně uchazečů.

Zkoušel jsem i jednu úroveň nad celou zemí s vyšším rozlišením (γ = 2, 3, 5). Okruhy pak míchaly typy oborů a brandýské gymnázium skončilo u Litoměřic, shoda 0,52–0,58. Zkoušel jsem i dodatečné rozdělení každého okruhu (zjemnění po vzoru Leidenu). Shodu zhoršilo a problém z 6a.3 nevyřešilo. Obojí je zamítnuté.

### 6a.3 Ukotvení oborů z okolí

Malá místní skupina na okraji oblasti se připojí k okruhu, kam ji dotáhne řetěz slabších vazeb. Gymnázium v Brandýse, jeho technické lyceum a zemědělská škola tak v roce 2026 vyšly v pražském okruhu bezpečnostních a veřejnosprávních oborů. Spojily je s ním dvě slabé vazby: gymnázia v Čelákovicích na pražské gymnázium SKOLAEUPRAHA a zemědělské školy na jeden pražský obor.

Proto pravidlo **ukotvení**: obor z jiné obce se na stránce města v okruhu ukáže, jen když má s některým oborem toho okruhu ve městě aspoň 10 společných uchazečů (pole `ukotven_k_mistu`). Rok 2026:

| Město | Okruhů | Oborů z okolí v okruzích | z toho ukotvených | Příklady ukotvených |
|---|---:|---:|---:|---|
| Brno | 16 | 41 | 20 | Tišnov, Slavkov u Brna, Letovice, Kuřim, Rajhrad |
| Praha | 31 | 28 | 19 | Čelákovice, Hostivice, Říčany, Jesenice, Dolní Břežany |

Pražský okruh osmiletých gymnázií tak obsahuje osmiletá gymnázia v Brandýse, Čelákovicích, Kralupech, Neratovicích a Českém Brodě. Brandýské obory u pražských bezpečnostních oborů ukotvené nejsou a na stránce Prahy se neukážou.

### 6a.4 Co z toho plyne pro zobrazení

- **Stránka oboru:** okruh nepotřebuje. Blok „Které další obory v okolí uchazeči také volí“ ukáže obory s aspoň 10 společnými uchazeči bez ohledu na obec a pod nimi **souhrn po obcích** (*Souběžné přihlášky podle obce*: „56 % uchazečů mělo na přihlášce i obor v Praze“). To je přesná odpověď na příklad Brandýsu.
- **Stránka města:** okruhy ze spádových oblastí, s ukotvenými obory z okolí označenými obcí.
- **Mezi ročníky** se okruhy bez hranic chovají ve velkých městech jako městské. Přelévání a přednost z oddílů 5 a 6 platí beze změny. Podklad je nese i pro okruhy bez hranic, jmenovatelem podílu okruhu je počet uchazečů spádové oblasti.

## 7. Co ukázat a co ne

### 7.1 Kde

| Možnost | Pro | Proti |
|---|---|---|
| **A. Stránka oboru, blok „Které další obory v okolí uchazeči také volí“** | Rodina je tam, když řeší konkrétní obor. Rozšíří sekci „Kam se hlásí stejní uchazeči“ o obory bez ohledu na obec a o souhrn po obcích (oddíl 6a.4). | Na stránce oboru je už hodně bloků; blok musí být sbalený. |
| **B. Stránka města, přehled okruhů** | Odpovídá na otázku podnětu: mezi čím se ve velkém městě rozhoduje. Okruhy ze spádových oblastí přidají ukotvené obory z okolí (oddíl 6a.3). | Jen pro města, kde okruhy vycházejí (oddíl 9). |
| C. Vlastní stránka okruhu | Prostor pro vývoj mezi ročníky a celou tabulku. | Okruh nemá stabilní identitu (shoda 0,66–0,76, okrajové obory přeskakují) ani přirozený název. Stránka s adresou by z něj udělala kategorii, kterou není. Přibyly by desítky tenkých stránek. |

**Rozhodnuto 3. 10. 2026: A a B, C ne.** Na stránce oboru blok „Které další obory v okolí uchazeči také volí“ jako rozbalitelné rozšíření sekce „Kam se hlásí stejní uchazeči“. Na stránce města oddíl s okruhy jako odkazy na seznam oborů okruhu na téže stránce (filtr, ne nová adresa). Nástavby jsou tam zvlášť jako „Kam po výučním listu“.

### 7.2 Co v bloku

U oboru v okruhu: název školy a oboru, u oboru z jiné obce i obec, počet uchazečů, přednost v okruhu slovy, odznak obtížnosti přijetí s rokem, u učebních oborů značka „bez jednotné zkoušky“. Pod tabulkou u okruhu: kolik uchazečů měl okruh v obou ročnících a kolik z nich mělo na přihlášce i obor mimo okruh.

**Řazení: podle počtu uchazečů**, nikdy podle obtížnosti ani podle přednosti. Počet uchazečů říká, jak velká část rozhodování na obor připadá, a neplete se s kvalitou. Řazení podle přednosti by z okruhu udělalo žebříček oblíbenosti.

**Vývoj mezi ročníky:** u oboru dvojice let u přednosti a obtížnosti („těžké v roce 2026, dostala se většina v roce 2025“). U okruhu věta o přesunu jen tehdy, když je nad šumem: „Mezi lety 2025 a 2026 se mezi obory tohoto okruhu přesunula zhruba desetina zájmu; celý okruh měl podobný počet uchazečů.“

### 7.3 Jak mluvit o šancích

Pravidla pro texty bloku (požadavek zadání):

1. **Okruh popisuje, jak se uchazeči hlásili a jak dopadli v konkrétních ročnících.** Žádná věta nesmí mluvit o tom, jak dopadne uchazeč příští rok. Vždy s rokem, nikdy „loni“ nebo „letos“.
2. **Obtížnost se ukazuje vždy u dvou ročníků, když je máme.** Příklad Vranovské (dostala se většina, těžké, dostala se většina) je přesně ta situace, kdy jeden ročník rodinu zavede. Že nejde o výjimku, dokládá proměnlivost obtížnosti mezi ročníky: u nabídek s aspoň 20 soutěžícími uchazeči zůstalo zařazení mezi 2025 a 2026 stejné jen u 48,9 % (slovník ukazatelů). Proč se mění, text nevysvětluje.
3. **Žádné „sem ano, sem ne“.** Blok neříká, který obor zvolit jako pojistku, ani nenavrhuje pořadí na přihlášce. Na to je Simulátor přijímaček s vlastními výhradami. Pokud blok na simulátor odkazuje, tak jen odkazem.
4. **Pevná věta o vývoji, když je přesun nad šumem:** „Zájem se mezi obory tohoto okruhu mezi ročníky přesouvá. Obor, kam se v jednom roce dostal skoro každý, může být další rok těžký.“ Je to popis doloženého jevu, ne předpověď, a odpovídá na podnět rodiče.
5. **Přednost v okruhu se nikdy nepíše jako „oblíbenost“ ani „žádanost“**, jen jako „uchazeči ho měli na přihlášce spíš výš / spíš níž než ostatní obory okruhu“. U rad platí věta ze slovníku pojmů: pořadí na přihlášce šanci na přijetí nemění.
6. **Okruh není pevná kategorie.** Pod blokem: „Okruh jsme spočítali z toho, které obory měli uchazeči na přihlášce zároveň. Obory na okraji okruhu se mohou mezi ročníky přesunout do sousedního.“

### 7.4 Pojmenování okruhu

Zdroj název nenese. **Rozhodnuto 3. 10. 2026:** zatím se okruhy nepojmenovávají a blok nese univerzální nadpis „Které další obory v okolí uchazeči také volí“. Na stránce města se okruh uvede třemi největšími obory („Gymnázium Křenová, Gymnázium Elgartova a další“). Převodník KKOV → název (79-41-K/41 → „čtyřletá gymnázia“) se případně doplní později. Ruční pojmenování z oddílu 4 slouží jen tomuto návrhu.

### 7.5 Meze zveřejnění a dopočítávání

- Obor v okruhu jen s aspoň 10 uchazeči, hrana jen s aspoň 10 společnými uchazeči (už v metodě).
- Přednost v okruhu a podíl prvních voleb v okruhu se u oboru zobrazí jen při aspoň 10 dvojicích, resp. 10 uchazečích. **Podíl prvních voleb v okruhu se zveřejňuje jen jako podíl na dvě desetinná místa, nikdy jako počet**: přesné počty zobrazených oborů by se sečetly a odečetly od celku okruhu.
- **Počet uchazečů okruhu se zaokrouhluje dolů na desítky a podíl okruhu na uchazečích města se počítá až ze zaokrouhleného počtu.** První verze rozboru počítala podíl z přesného počtu. Spolu s přesnými počty prvních voleb tak šel přesně dopočítat skrytý obor pod mezí zveřejnění (review PR #284). Generátor podkladu teď před zápisem přesně v celých číslech prověří (`kontrola_zverejneni`, `dopocitatelne`), které počty oborů jsou se zveřejněným celkem, podíly a počty uchazečů oborů slučitelné. Když součet skrytých oborů vyjde jednoznačně kladný, potlačí u okruhu všechny podíly prvních voleb (pole `podily_potlaceny`), resp. výpis oborů v přelévání (`vypis_potlacen`). Při druhé kontrole skončí chybou, pokud únik trvá. V roce 2026 se to týká dvou malých pražských okruhů (umělecká řemesla, škola pro zrakově postižené). Podíl prvních voleb na nových oborech se pod 10 uchazeči nezveřejňuje. Na stránce platí totéž: všechny počty a podíly okruhu se musí posuzovat společně, ne každý zvlášť.
- U posunu v okruhu se ukazuje obor jen tehdy, když má v obou ročnících 0 nebo aspoň 10 prvních voleb.
- **Okruh s méně než 3 obory nebo s méně než 30 uchazeči se nezobrazuje.** Okruh jedné školy (odborná učiliště) se nezobrazuje, protože popisuje rozhodování mezi obory jedné školy a dopočítat by se dal z jejích čísel na stránce školy. Konzervatoře se zobrazí, projdou-li mezí 30 uchazečů a kontrolou dopočitatelnosti, s poznámkou o talentové zkoušce (rozhodnuto 3. 10. 2026).
- **Souhrn po obcích** (stránka oboru) se zveřejňuje jako podíl jen tehdy, když obec i zbytek mají aspoň 10 uchazečů (`podil_nad_mezi`): věta „všichni kromě sedmi se hlásili i do Prahy“ by prozradila malou skupinu. **Posuzuje se i společně s počty oborů téže obce** (`kontrola_kam_dal`): podíl obce dává možné celé počty uchazečů, obor v obci je jejich podmnožina. Když rozdíl leží vždy mezi 1 a 9, řádek obce se nezveřejní. Obor se nezveřejní, když jeho doplněk do všech uchazečů výchozího oboru je 1 až 9. Ve výsledku pro Vranovskou proto chybí Brno: skoro všichni uchazeči měli na přihlášce i jiný brněnský obor.

## 8. Nové ukazatele a pojmy

Zapsané ve [slovníku ukazatelů](slovnik-ukazatelu.md) (verze 1.55, oddíl 1) a v registru u sady `cermat-uchazeci-kolo1`:

- **Okruh oborů**: rozdělení oborů podle společných uchazečů uvnitř spádové oblasti, ve variantě oddílů 3–6 uvnitř města.
- **Oblast přihlášek**: spádová oblast ze sloučených přihlášek (oddíl 6a.2).
- **Přednost v okruhu**: oddíl 6.
- **Podíl prvních voleb v okruhu**: obor, který měl uchazeč okruhu na přihlášce nejvýš.
- **Podíl okruhu na uchazečích oblasti**: oddíl 5.1. Ve městské variantě je oblastí město. Ve verzi 1.1 se jmenoval *Podíl okruhu na uchazečích města*.
- **Přesun zájmu v okruhu**: oddíl 5.1, se šumem.
- **Souběžné přihlášky podle obce**: oddíl 6a.4, pro stránku oboru.

Ve [slovníku pojmů](slovnik-pojmu.md) (verze 1.39): **okruh oborů**, **spíš výš / spíš níž v okruhu** a nadpis **„Které další obory v okolí uchazeči také volí“**, kde „v okolí“ znamená podle přihlášek, ne podle vzdálenosti. Nepoužívat: shluk, cluster, trh, skupina oborů (to jsou podobné školy SMO16), konkurence, oblíbenost, podobné obory.

## 9. Rozhodnutí a otevřené otázky

Rozhodnutí vlastníka projektu 3. 10. 2026 (zapsaná v issue #277):

1. **Umístění:** stránka oboru (A) a stránka města (B), bez vlastní stránky okruhu.
2. **Metoda:** normovaná váha, γ = 1,0; etapa 2 začne přepočtem pro celou zemi.
3. **Vymezení: ne podle hranic města, ale podle toho, kam uchazeči skutečně podávají přihlášky.** Řeší oddíl 6a: stránka oboru bez hranic se souhrnem po obcích, stránka města s okruhy ze spádových oblastí a ukotvenými obory z okolí.
4. **Souhrny 1. kola 2024 převzít** a stáhnout potřebná data. Převzetí do `public/souhrny_kolo1.json` mění stránky (předchozí ročník, změna mezi ročníky), proto patří do etapy 2, ne do tohoto návrhu.
5. **Malé okruhy:** okruhy jedné školy ne, konzervatoře ano s výhradou (oddíl 7.5).
6. **Nástavby:** na stránce města zvlášť jako „Kam po výučním listu“, na stránce oboru normálně.
7. **Název:** univerzální nadpis „Které další obory v okolí uchazeči také volí“, převodník případně později.

Otevřené pro etapu 2:

- **Která města dostanou okruhy na stránce města:** návrh je 3 okruhy s aspoň 3 ukotvenými obory v posledním ročníku. Seznam se předloží před nasazením.
- **Ukotvení:** práh 10 společných uchazečů s oborem ve městě. Ověřit na dalších městech, zda nevyřazuje skutečné sousedy.

## 10. Co rozbor neříká

- **Kam uchazeči nastoupili.** Popisuje přihlášky a výsledek 1. kola.
- **Proč se zájem přesunul.** Nový obor, změna kritérií, pověst, dojezd: nic z toho data nenesou.
- **Jak dopadne konkrétní uchazeč.** Okruh ani přednost šanci nepředpovídají.
- **Nic o kvalitě školy.** Okruh je o tom, mezi čím se rodiny rozhodují, ne o tom, co je lepší.
- **Zaměření.** Okruh je po oborech školy, zaměření téhož oboru se slučují.
- **Vzdálenost ani dojezd.** „V okolí“ znamená podle přihlášek, ne vzdušnou čarou ani podle jízdních řádů. Spádová oblast je odhad z toho, kam se uchazeči hlásili.
- **Nesouměrné vazby.** Okruh je souměrný: obory v něm patří k sobě navzájem. Že se uchazeči z předměstí hlásí do velkého města, a ne naopak, ukazuje jen souhrn po obcích na stránce oboru.
