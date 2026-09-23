# Návrh krajské stránky: přehled škol v kraji

Verze 1.0 · 23. 9. 2026 · Stav: **návrh, čeká na rozhodnutí zadavatele**

Zadání z 23. 9. 2026: „Zamysli se jako UX a UI designer nad vzhledem regionálních přehledů škol ([/regiony/hlavni-mesto-praha](https://www.prijimackynaskolu.cz/regiony/hlavni-mesto-praha?delka=8)), chceme jej sjednotit s celým webem. Líbí se mi kategorie škol, to bych chtěl používat více. Projdi data, která zde zobrazuje, a podívej se, zda je to v souladu s naší metodikou použití dat. Navrhni vylepšení.“

Posuzovaný kód: `src/app/regiony/[kraj]/page.tsx` (266 řádků), `src/components/RegionSchoolsTable.tsx` (665 řádků), rozcestník `src/app/regiony/page.tsx`, načítání `getSchoolsByKraj`, `getRegionStats`, `getExtendedSchoolStatsForSchools` a `getTrendDataForSchools` v `src/lib/data.ts`. Měřítko: [slovník ukazatelů](slovnik-ukazatelu.md) 1.30, [slovník pojmů](slovnik-pojmu.md), [zdroje dat](zdroje-dat.md) včetně oddílu 3 a registr `public/stav_datovych_sad.json`. Vzor pro sjednocení: [návrh stránky města](navrh-stranky-mesta-2027.md), který je zrealizovaný.

---

## 1. Shrnutí

Krajská stránka je nejstarší přehled na webu, který ještě neprošel revizí dat. **Většina čísel na ní porušuje závazná pravidla projektu**, a to i kategorie, které se zadavateli líbí. Nejde o kosmetiku: stránka ukazuje ročník 2025, přestože registr vede jako zobrazené období 2026; 57 pražských oborů nových v roce 2026 vydává za obory s nulovou konkurencí; hlavní sloupec „Nejnižší výsledek přijatých“ je u všech řádků prázdný.

Návrh proto stránku nepřebarvuje, ale staví znovu na stejných datech a komponentách jako stránka města, a „kategorii“ nahrazuje **doloženou kohortou podle pozice na přihlášce** (slovník ukazatelů, oddíl 1). Ta odpovídá na tutéž otázku, má tři srozumitelné stupně, je spočítaná z roku 2026 a dá se použít i na stránce města a školy, což zadavatel chce.

---

## 2. Kategorie škol: co to je a proč v dnešní podobě nesmí zůstat

Na stránce se u každého oboru zobrazuje štítek *První volba*, *Preferovaná*, *Vyvážená* nebo *Záložní* (`categoryLabels` v `src/types/school.ts`, pole `category_code` v `public/school_analysis.json`).

**Slovník ukazatelů ji vede v oddílu 7, „Ukazatele bez doloženého výpočtu“:** „Způsob zařazení není dohledaný. Platí totéž co výše“, tedy nezobrazovat, neřadit, neprůměrovat. Pravidlo celého projektu zní „údaj bez doloženého výpočtu se nezobrazuje“.

Ověřil jsem, co z pole jde zpětně vyčíst (2 109 oborů s daty 2025, mimo nové obory 2026):

| Štítek | Oborů | Podíl 1. voleb | Co z toho plyne |
|---|---:|---|---|
| První volba | 99 | 70 až 100 % | pevný práh 70 % |
| Preferovaná | 333 | 50 až 69,9 % | pevný práh 50 % |
| Vyvážená | 1 009 | 0 až 49,8 % | od záložní ji podíl prvních voleb neodliší |
| Záložní | 1 100 | 0 až 49,4 % | nejlepší nalezený práh (30 %) sedí u 93 % oborů, pravidlo zbytku neznám |

Z toho vyplývají tři závady, každá sama o sobě důvodem štítek stáhnout:

1. **Absolutní prahy napříč typy studia.** Slovník u podílu prvních voleb: „Hodnota silně závisí na typu studia, takže se nikdy nesrovnává napříč typy. Medián podílu prvních voleb je u nástaveb 57 %, u osmiletých gymnázií 52 %, u lyceí 26 %.“ Pevných 50 % tedy dá nástavbám štítek *Preferovaná* skoro automaticky a lyceím skoro nikdy.
2. **Ročník 2025 ze staršího zpracování.** `zdroje-dat.md`, oddíl 3, u `priority_pcts` výslovně píše, že jde o duplicitu podílu prvních voleb „ze staršího zpracování“.
3. **Vymyšlená hodnota u nových oborů.** `scripts/import_cermat_2026_real.py:341` zapisuje všem oborům nově vypsaným v roce 2026 napevno `'category_code': 'balanced'` („Nový obor 2026“). V Praze jde o 57 řádků, v celé zemi o všechny nové obory. Štítek *Vyvážená* u nich nevychází z žádných dat.

**Doložená náhrada už existuje:** *kohorta podle pozice na přihlášce* (slovník ukazatelů, oddíl 1). Tři stupně podle percentilu podílu prvních voleb **uvnitř srovnatelné skupiny** (typ školy × délka studia):

| Kohorta | Percentil ve skupině | Věta na stránce |
|---|---|---|
| Škola první volby | nad 67. | uchazeči ji píší na přihlášku jako nejžádanější častěji než u dvou třetin obdobných oborů |
| Smíšená pozice | 33. až 67. | obvyklý poměr první volby a pojistky |
| Záložní volba | pod 33. | většina uchazečů si ji píše jako druhou nebo třetí |

Je doložená (stabilita 66 % proti 33 % náhody), počítá se z ročníku 2026 a srovnává jen uvnitř typu. Pro Prahu (434 nabídek 1. kola 2026) vychází 109 škol první volby, 134 smíšených a 191 záložních.

Jak se stará kategorie s kohortou potkává v Praze:

| Stará kategorie | → Škola první volby | → Smíšená | → Záložní volba |
|---|---:|---:|---:|
| První volba / Preferovaná | 35 | 12 | 3 |
| Vyvážená | 64 | 77 | 78 |
| Záložní | 10 | 45 | 110 |

„Vyvážená“ se rozpadá rovnoměrně do všech tří kohort, takže dnes rodině nic neříká. Deset pražských oborů označených jako *Záložní* patří podle doložené metody do horní třetiny svého typu.

**Dvě podmínky, bez kterých kohortu zobrazovat nelze** (slovník ukazatelů):

- „**Neříká nic o kvalitě školy.** Záložní volba znamená, že si ji uchazeči píší jako pojistku, nikoli že je horší.“ Proto **žádná červená**. Dnešní semafor (zelená první volba, červená záložní) čte jako známka. Návrh: neutrální škála jednoho odstínu, stejně jako odznak obtížnosti na stránce města.
- Kohorta patří **nabídce, ne škole**. Škola může mít obor první volby i záložní obor zároveň. Na přehledu po školách (oddíl 4.3) se proto uvádí u každé nabídky, nikdy jako souhrn školy.

**Chybí jediný krok:** kohortu zatím nikdo nepočítá do dat. Patří do `scripts/build-souhrny-kolo1.py` jako pole `kohorta_pozice` vedle `zarazeni_obtiznosti`, se stejnou dělbou jako obtížnost přijetí (veličinu počítá generátor, práh zobrazení 30 nabídek ve skupině uplatňuje knihovna), a do registru datových sad k sadě `cermat-prihlasky`. Pak ji může použít krajská stránka, stránka města i karta oboru.

---

## 3. Soulad ostatních dat s metodikou

### 3.1 Porušení, která je nutné opravit bez ohledu na redesign

| # | Co je na stránce | Pravidlo, které porušuje | Dopad |
|---|---|---|---|
| D1 | Celá stránka stojí na `school_analysis.json`, tedy na ročníku **2025**; nadpisy „Kapacita 2025“, „Přihlášky 2025“ | registr vede u `cermat-prihlasky`, `cermat-kapacity`, `cermat-vysledky` zobrazené období 2026; zdroje dat, oddíl 5, pravidlo 1: po přepnutí se starý rok ukazuje jen jako historie. Letopočet je navíc napevno v kódu | rodina čte loňská čísla jako aktuální |
| D2 | 57 pražských oborů nových v roce 2026 má kapacitu 0, konkurenci „0,0× ↓“ **zeleně** a štítek *Vyvážená* | zdroje dat, oddíl 4, past 4: „Chybějící údaj není nula“ | obor, o kterém nic nevíme, vypadá jako nejsnáz dostupný |
| D3 | Sloupec „Nejnižší výsledek přijatých“ a na mobilu **hlavní velké číslo karty** | `unavailableAdmissionScores()` vrací `jpz_min: null` vždy; na mobilu se u každé karty zobrazí jen pomlčka a „Hranice neověřena“ | nejvýraznější prvek karty je u všech 397 řádků prázdný |
| D4 | Legenda „Snazší / Střední / Těžké“ (barevný okraj řádku) a „📝 Extra kritéria“ | obojí závisí na `jpz_min` a `hasExtraCriteria`, které jsou vždy `null` | legenda vysvětluje prvky, které se nikdy nevykreslí |
| D5 | Výchozí řazení podle „Body průměr“ napříč všemi obory kraje | slovník ukazatelů, oddíl 4: „Napříč typy se neporovnává“; historický průměr 2025 „nesmí se nazývat průměrem přijatých“, populace `not_documented`; pořadí v kraji se počítá jen uvnitř srovnatelné skupiny | tabulka je fakticky žebříček osmiletých gymnázií nad učebními obory podle loňských bodů |
| D6 | Sloupec „Trend“ 2024 → 2025 s tipem „školy s vysokou konkurencí mívají příští rok pokles“ | slovník ukazatelů, změna mezi ročníky: „slovo trend se nepoužívá, dokud řada nemá aspoň tři doložené ročníky“; tip nemá žádný doklad | nepodložená předpověď v nápovědě |
| D7 | „Konkurence“ s prahy 1,5× a 3× a barvami zelená až červená | slovník pojmů: *konkurence* je zakázané slovo, veličina se jmenuje **přihlášky na místo**; slovník ukazatelů: „samotná hodnota nic neříká, dokud se neporovná se srovnatelnou skupinou“ a přihlášky na místo přeceňují skutečnou konkurenci (54 % nabídek by první volby nenaplnily) | barva tvrdí obtížnost, kterou ukazatel neměří |
| D8 | „1. volba“ v procentech, pod 30 % **červeně**, nápověda „vyšší číslo = škola je atraktivnější“ | podíl prvních voleb se nesrovnává napříč typy, „neříká nic o tom, jak je těžké se dostat“; slovo priorita se v textu pro rodiče nepoužívá | lyceum s obvyklým podílem 26 % svítí červeně |
| D9 | Hero: „Prům. index poptávky“ | průměr podílů přes všechny typy; název ukazatele neexistuje | číslo neodpovídá ničemu, k čemu se lze přihlásit |
| D10 | Hero: „Přihlášky 2025“ a „Škol/oborů“ | zdroje dat, past 2: přihláška není uchazeč; škola a obor jsou dvě různé jednotky | 397 „škol/oborů“ je 183 škol |
| D11 | Heatmapa priorit zelená / žlutá / červená | 3. volba není špatná zpráva; slovník pojmů zakazuje „záložní škola“ jako hodnocení | semafor tam, kde má být neutrální rozpad |

Drobnosti: nadpis tabulky „Školy v Hlavní město Praha kraji“ (tabulka nepoužívá `krajLabelV`, kterou stránka už má), nadpis sloupce „Nejnižší výsledek…“ nemá styl ostatních záhlaví, stránkování po 20 řádcích se nezrcadlí do URL, takže se nedá sdílet ani vrátit na stranu 7.

### 3.2 Co je v pořádku

- Filtr délky studia přes `?delka=` s kanonickou adresou bez parametru.
- Odkaz na detail rozlišuje stejnojmenné obory různé délky (`buildSchoolSlug`).
- Nápověda k průměru bodů už správně říká, že vymezení skupiny není doložené. Problém je v použití čísla (D5), text nápovědy je poctivý.

---

## 4. Návrh

Zásada: krajská stránka je **stránka města ve větším měřítku**. Stejná data (`souhrny_kolo1.json` přes registr), stejné komponenty, stejná slova. Rodina, která přijde z Pardubic na Pardubický kraj, nemá poznat, že je na jiném webu.

### 4.1 Hero: odpověď místo součtů

```
Střední školy - Hlavní město Praha
183 škol · 434 nabídek v 1. kole 2026            (rok z registru)

Jak se na ně lidé dostali (1. kolo 2026):
▇▇▇▇▇▇▇▇▇▇  99  místo bylo pro všechny, kdo splnili podmínky školy
▇▇▇▇▇▇▇▇    77  dostala se většina soutěžících
▇▇▇▇▇▇      61  středně těžké
▇▇▇▇▇▇▇     69  těžké
▇▇▇▇▇▇▇     70  velmi těžké
            58  málo soutěžících, bez zařazení

Kam se hlásí jako na první volbu:
109 škol první volby · 134 smíšených · 191 záložních
```

Oba pruhy jsou klikací a filtrují tabulku. Čísla jsou z dat 2026 pro Prahu. Pod pruhem jednou větou vysvětlení *soutěžících uchazečů* podle slovníku pojmů, stejně jako na stránce města.

Mizí: součet kapacit, součet přihlášek, průměr indexu poptávky (D9, D10).

### 4.2 Filtry v jednom panelu

Jeden řádek čipů, všechny v URL (`?typ=GY8&obtiznost=tezke&kohorta=prvni`):

- **Typ studia** místo délky: 8leté a 6leté gymnázium, 4leté gymnázium, lyceum, odborná s maturitou, učební, nástavba. Délka sama nerozliší gymnázium od odborné školy; typ ano a je to zároveň srovnatelná skupina, ve které platí percentily.
- **Obtížnost přijetí** (5 stupňů).
- **Pozice na přihlášce** (kohorta, 3 stupně).
- **Zřizovatel** (veřejná, soukromá, církevní), dnes jen štítek.
- **Okres / městská část**: Praha 183 škol, Středočeský kraj ještě víc; bez zúžení místa je seznam nepoužitelný. U kraje odkaz na stránky měst, které v kraji existují (`MESTA` v `src/lib/cityData.ts`).

Parametr `?delka=` zůstane funkční jako alias.

### 4.3 Seznam po školách, ne po oborech

Stejně jako stránka města (návrh města, oddíl 3.2): jedna karta je jedna škola, v ní její nabídky. 183 karet místo 434 řádků, Gymnázium Nad Štolou je jedna karta se třemi obory.

```
┌──────────────────────────────────────────────────────────────┐
│ Gymnázium Jana Keplera                   Praha 6 · veřejná   │
│                                                              │
│  Gymnázium, 8leté                                            │
│   ● velmi těžké   přijat zhruba každý pátý soutěžící         │
│   ◆ škola první volby   30 míst · 9,1 přihlášky na místo     │
│  Gymnázium, 4leté                                            │
│   ● těžké         přijato 60 ze 142 soutěžících               │
│   ◆ smíšená pozice      30 míst · 5,2 přihlášky na místo     │
│                                                → detail školy │
└──────────────────────────────────────────────────────────────┘
```
(čísla v ukázce jsou ilustrační)

Na řádku nabídky jen to, co je doložené a z roku 2026:

| Údaj | Ukazatel ze slovníku | Poznámka |
|---|---|---|
| Odznak obtížnosti + věta | obtížnost přijetí slovy, podíl přijatých ze soutěžících | komponenty `OdznakObtiznosti` a `PodilPrijatych` z `CitySchoolsTable.tsx` vytáhnout do sdílené `src/components/nabidka/` |
| Odznak kohorty | kohorta podle pozice na přihlášce | nový, oddíl 2 |
| Míst · přihlášek na místo | kapacita míst, přihlášky na místo | bez barvy; percentil ve skupině až v detailu |
| Předchozí rok | změna mezi ročníky | jen tam, kde se změnilo zařazení obtížnosti („rok předtím skoro každý druhý“), jak předepisuje slovník |
| Talentová zkouška | příznak z pásem přijetí | věta místo verdiktu, jako na stránce oboru |
| Nový obor 2026 | `is_new_2026` | **štítek „nový obor, loňská data nejsou“**, žádné nuly (D2) |

Z tabulky mizí: nejnižší výsledek (D3), historický průměr bodů 2025 (D5), sloupec trend (D6), barevná konkurence (D7), procento 1. voleb (D8, nahrazuje ho kohorta), heatmapa priorit (D11, rozpad pořadí na přihlášce patří na detail oboru v neutrálních odstínech).

### 4.4 Řazení

Řadit podle obtížnosti se nesmí (slovník ukazatelů, pořadí v kraji). Nabídnout:

- **abecedně** (výchozí),
- **podle počtu míst**,
- **pořadí v kraji podle zájmu** a **podle výsledků přijatých**, ale **jen po zúžení na jeden typ studia** a jen ve skupinách s aspoň 10 nabídkami. Tvar věty je ve slovníku: „2. z 32 osmiletých gymnázií ve Středočeském kraji podle výsledků přijatých (2026; v roce 2025 také 2.)“. Knihovna už existuje v `src/lib/souhrny-kolo1.ts`.

Bez zvoleného typu se řazení podle pořadí nenabízí vůbec. Tím odpadá dnešní smíšený žebříček.

### 4.5 Vizuální sjednocení

| Dnes | Návrh | Důvod |
|---|---|---|
| hero `from-blue-500 to-blue-600`, bílé karty statistik | hero stránky města (`from-blue-600 to-blue-700`, poloprůhledné bloky `bg-white/10`) | stejná rodina stránek |
| semafory zelená–žlutá–červená u pěti ukazatelů | jeden neutrální odstín slate pro obtížnost (`ODSTIN_OBTIZNOSTI`), druhý (modrý) pro kohortu | barva nemá hodnotit školu |
| emoji 📝, šipky ↑↑ | text a ikony z `src/components/ui` | konzistence, čitelnost pro čtečky |
| legenda nad tabulkou s 9 položkami | vysvětlení u prvního výskytu v bloku, zbytek do sbalitelného „Jak číst přehled“ pod seznamem | slovník pojmů, pravidlo 2; stejně jako stránka města |
| tooltip jako modální okno uprostřed obrazovky | rozbalovací vysvětlivka pod odznakem | modál kvůli jedné větě přerušuje čtení na mobilu |
| stránkování 20 řádků bez URL | „zobrazit dalších 20 škol“ + filtry v URL | sdílení odkazu na výběr |

Mobil: karta školy je stejná jako na desktopu, jen nabídky pod sebou. Dnešní velká pomlčka vpravo mizí (D3).

### 4.6 Rozcestník `/regiony`

Tentýž problém v malém: karty krajů nesou „Kapacita“, „Prům. index poptávky“, „Přihlášky 2025“ a u vybraných škol „× konkurence“ v semaforu (`src/app/regiony/page.tsx:153-236`). Návrh: u každého kraje počet škol a nabídek a miniaturní pruh obtížnosti z 4.1. Bez žebříčku krajů.

---

## 5. Zvážené nepoužité sloupce (povinné podle CLAUDE.md)

Prošel jsem `docs/zdroje-dat.md` celý včetně oddílu 3.

| Nepoužitý údaj | Rozhodnutí pro krajský přehled | Proč |
|---|---|---|
| Přijatí podle priority (`prijati_priority`) | nepoužít v přehledu | odpovídá na otázku o jednom oboru; v kartě by přidal třetí číslo k nabídce, na detailu oboru už je |
| Průměrné percentilové umístění přijatých | použít **jen** jako podklad pořadí v kraji podle výsledků přijatých (4.4) | samostatně by se v přehledu četlo jako známka školy |
| Maturitní výsledky | **zvážit do druhé fáze** jako řádek karty školy („maturita nad středem podobných škol ve 3 ze 4 let“) | je to jediný údaj o škole jako celku, a karta je po školách; ukazatel *frekvence let nad středem podobných škol* je doložený. Do první fáze ne, aby přehled neztratil zaměření na přijetí |
| Agregáty 2. kola | použít jako štítek „bylo 2. kolo, N míst“ | rodina, která se v 1. kole nedostala, hledá právě tohle; doložené v `docs/druhe-kolo.md`, stránka města to už dělá |
| Souběžné přihlášky / obory výš a níž | nepoužít | platí za obor, patří na detail |
| Dobíhající obor | nepoužít | přehled ukazuje jen vypsané nabídky 2026 |
| Web školy (`skoly_web.json`) | použít jako odkaz v kartě školy | kritéria přijetí zveřejňuje škola a všechny věty o obtížnosti na ně mají odkazovat |
| Oficiální nejnižší výsledek přijatých ze souhrnů | nepoužít | určuje ho jediný uchazeč; slovník ho pro přehled zamítá |
| Inspekce (`hard_facts`) | nepoužít | nesouvisí s otázkou přehledu |

---

## 6. Postup a odhad

| Krok | Obsah | Závisí na |
|---|---|---|
| 1 | **Rychlá oprava závad bez redesignu**: skrýt prázdný sloupec a mobilní prázdné číslo (D3, D4), štítek „nový obor“ místo nul a místo *Vyvážená* (D2), přejmenovat „Konkurence“ na „Přihlášek na místo“ bez barev (D7), odstranit „Trend“ a tip (D6), opravit nadpis „kraji“, zrušit výchozí řazení podle bodů (D5) | nic |
| 2 | Kohorta podle pozice na přihlášce do `build-souhrny-kolo1.py`, registru a knihovny; zápis do slovníku (nové pole, verze 1.31); **stažení `category_code` ze stránky školy** (`src/app/skola/[slug]/page.tsx` ho také používá) | krok 1 |
| 3 | Krajská stránka nad `souhrny_kolo1.json` a registrem: hero 4.1, filtry 4.2, karty po školách 4.3, sdílené komponenty s městem | krok 2 |
| 4 | Rozcestník `/regiony` (4.6), štítek 2. kola, odkaz na web školy | krok 3 |
| 5 | Druhá fáze: řádek maturity v kartě školy | rozhodnutí zadavatele |

Kroky 1 a 2 nejsou redesign, jsou to opravy porušených pravidel. Doporučuji je udělat hned a nezávisle na tom, jak zadavatel rozhodne o vzhledu.

---

## 7. Otevřené otázky pro zadavatele

1. **Název kohorty na stránce.** Slovník zavádí „škola první volby / smíšená pozice / záložní volba“. „Záložní volba“ i s neutrální barvou některé školy nepotěší. Alternativa pro text: „většinou jako 1. volba / jako 1. i 2. volba / většinou jako pojistka“. Rozhodnutí patří do slovníku pojmů.
2. **Seznam po školách, nebo po nabídkách?** Po školách je čitelnější, ale filtr „jen 8letá gymnázia“ pak ukazuje školy s jedinou nabídkou. Stránka města zvolila po školách; doporučuji totéž.
3. **Maturita v kartě školy** (oddíl 5) v první, nebo až ve druhé fázi.
