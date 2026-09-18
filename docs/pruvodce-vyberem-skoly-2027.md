# Průvodce výběrem školy

**Verze:** 1.0
**Datum:** 18. 9. 2026
**Stav:** návrh ke schválení. Sloučení stránek `/jak-vybrat-skolu` a `/jak-funguje-prijimani` do jednoho návodu na adrese `/jak-vybrat-skolu`; druhá adresa se trvale přesměruje.

Zadavatel 18. 9. 2026: „to jsou prakticky stejné stránky. Chceme to sjednotit, udělat to názorné a přehledné jako návod, jak vybrat správnou školu a jak k tomu použít náš server." Ponechaná adresa a přesměrování podle pravidel SEO schváleny týž den.

Návazné dokumenty: [vrstvy stránky oboru](vrstvy-stranky-oboru-2027.md) a [stránka školy](stranka-skoly-2027.md) určují, co čtenář uvidí po prokliku; [slovník pojmů](slovnik-pojmu.md) slova, [slovník ukazatelů](slovnik-ukazatelu.md) čísla, [registr](../public/stav_datovych_sad.json) období.

## 1. Proč to sloučit

Obě stránky vznikly odděleně a každá si k témuž tématu dopsala vlastní verzi.

| Co říkají obě | `/jak-vybrat-skolu` | `/jak-funguje-prijimani` |
|---|---|---|
| Rozhodují body, ne pořadí na přihlášce | zelený box „Klíčové pravidlo" | zelený box „Základní princip" |
| Tři priority: ambiciózní, realistická, záchranná síť | tři číslované karty | oddíl „Optimální strategie" |
| Číselný příklad rozvrstvení priorit | Gymnázium A/B + SOŠ C | prestižní / kvalitní / solidní |
| „Nedávejte jistotu na první místo" | ano | ano, doslova stejně |
| „Ambiciózní školou nic neztrácíte" | ano | ano, dvakrát |

**Dvě věcné vady, které sloučení musí opravit.**

1. **Stránky si protiřečí v bodové škále.** `/jak-vybrat-skolu` staví na 100 bodech (50 za češtinu, 50 za matematiku) a příklady má 65, 70, 62. `/jak-funguje-prijimani` pracuje se škálou kolem 200 (Anna 160, Boris 170, „uchazeč se 160 body", minima 165/155/140). Je to past 3 ze [soupisu zdrojů](zdroje-dat.md), oddíl 4: data uchazečů mají ČJ+MA v rozsahu 0 až 200 %, katalog 0 až 100 bodů, poměr dvě ku jedné. **Web ukazuje 0 až 100**, takže druhá škála je na webu cizí a čtenář, který projde obojí, dostane dvě neslučitelné soustavy.
2. **Bílý text na bílém pozadí.** `/jak-funguje-prijimani` má `bg-white text-white` u hlavičky (ř. 30) i u oddílu Shrnutí (ř. 389). Odstavce pod nadpisy jsou prakticky neviditelné.

## 2. Čemu má návod sloužit

Jedna věta: **rodina přijde s otázkou „kam se hlásit" a odejde se třemi obory na přihlášce a s vědomím, co o nich ví a co ne.**

Návod není článek o přijímacím řízení. Je to **cesta po vlastním webu**: každý krok končí odkazem na nástroj, který na otázku kroku odpovídá daty. Dnešní stránky tohle nedělají — třikrát zmiňují detail školy a ani jednou jako odkaz, celý odstavec o dojíždění neodkazuje na dojezdovost a rada „začněte včas" posílá na termíny **na web CERMATu** místo na vlastní kalendář.

Koho návod obsluhuje:

| Čtenář | Co potřebuje | Kde na webu skončí |
|---|---|---|
| Rodič v září, dítě v 8. třídě | kdy co bude, ať nic nezmešká | kalendář, odběr termínů |
| Rodič v lednu, vybírá ze tří škol | co o škole vím, co si ověřit sám | stránka školy a oboru |
| Uchazeč v únoru, skládá přihlášku | v jakém pořadí obory zapsat | mechanika přijímání, simulátor |
| Rodina v květnu, dítě se nedostalo | co teď | 2. kolo |

## 3. Struktura: osm kroků

Návod má jednu časovou osu a osm kroků. Každý krok nese **otázku v hlavičce, odpověď ve dvou větách a odkaz do nástroje**. Pořadí odpovídá tomu, jak věci přicházejí, ne tomu, jak jsou zajímavé.

| # | Krok | Co v něm je | Kam vede |
|---|---|---|---|
| 0 | **Kde jsme v kalendáři** | nejbližší termín z harmonogramu MŠMT, ne výčet všech | `/prijimacky-2027`, odběr `/novinky` |
| 1 | **Jak se rozhoduje o přijetí** | mechanika odloženého přijetí; pořadí na přihlášce šanci nemění | kotva, na kterou míří odkazy ze stránky školy a oboru |
| 2 | **Co škola zveřejní a co z toho neplyne** | kritéria vyhlašuje škola; body za prospěch a školní zkoušku **nemáme v datech** | odkaz „kritéria na webu školy" na stránce oboru |
| 3 | **Najít kandidáty** | podle místa, dojezdu a typu oboru | `/skoly`, `/regiony`, `/mesto`, `/dostupnost`, hledání v hlavičce |
| 4 | **Posoudit jednu školu** | pět otázek stránky školy, tři otázky stránky oboru, inspekce, maturita | stránka školy a oboru |
| 5 | **Sestavit tři přihlášky** | rozptyl ambicí; proč pořadí nerozhoduje o přijetí | `/simulator`, zvažované obory |
| 6 | **Porovnat kandidáty vedle sebe** | vlastní body proti průměru přijatých, s výhradami | `/simulator?vyber=1` |
| 7 | **Připravit se na zkoušku** | co testy obsahují, kde jsou zadání a testy nanečisto | externí: CERMAT, TAU, To-DAS |
| 8 | **Když to nevyjde** | 2. kolo a co o něm víme | 2. kolo na stránce oboru |

**Krok 1 je kotva celého webu.** Odkazy „Jak rozhodování funguje" ze stránky školy (`page.tsx:363`) a oboru (`ProfilOboru.tsx:384`) povedou na `/jak-vybrat-skolu#jak-se-rozhoduje`. Proto se obsah zrušené stránky nesmí zkrátit na odstavec: přebírá se celý, včetně příkladu se třemi uchazeči a oddílu mýtů.

## 4. Standardy pro čísla a data

Zadavatel 18. 9. 2026: „Použij naše standardy pro popis čísel a dat." Z toho plyne pět pravidel, která dnešní stránky porušují.

1. **Žádný letopočet napevno.** Dnes je v obou stránkách jediný (`Od roku 2024 používá CERMAT…`), ale i ten se má brát z registru. Období dat se čte přes `zobrazeneObdobi()`, termíny z `src/data/admissions-2027.json`. Kontrolu hlídá `scripts/kontrola-letopoctu.py`.
2. **Bodová škála je 0 až 100**, tedy 50 za češtinu a 50 za matematiku. Všechny příklady se přepočítají; příklad Anna/Boris/Cyril se převede ze 160/170/150 na 80/85/75.
3. **Ilustrativní číslo se označí jako ilustrativní.** Dnešní příklady (65 bodů, 70 bodů) vypadají jako údaje o školách, ale jsou vymyšlené. Každý takový příklad dostane větu „čísla v příkladu jsou vymyšlená, skutečné průměry přijatých najdeš u konkrétního oboru".
4. **Každé číslo o školách má jméno ze [slovníku ukazatelů](slovnik-ukazatelu.md).** Návod sám žádnou statistiku nepočítá; kde chce ukázat číslo, odkáže na stránku, která ho vede. Tím se vyhne zavedení nového ukazatele v textu průvodce.
5. **Pojmy ze [slovníku pojmů](slovnik-pojmu.md)**, s vysvětlením při prvním výskytu v bloku. Zejména: *soutěžící uchazeči*, *pořadí na přihlášce*, *kritéria přijetí*, *hranice úspěšnosti*. Zakázaná slova platí i tady: **hranice přijetí**, **žebříček**, **nejlepší škola**, **šance** jako hodnota, **loni/letos**.

### 4.1 Co se nesmí slíbit

| Tvrzení | Proč ne |
|---|---|
| „Spočítáme ti šanci na přijetí" | osobní predikce je zavržená ([vrstvy stránky oboru](vrstvy-stranky-oboru-2027.md), kolo 5) |
| „Dej si obor na první místo, zvýšíš šanci" | pořadí šanci nemění; vysoký podíl přijatých z první volby vzniká jinak (tamtéž) |
| „Řekneme ti, jak se absolventi uplatní" | zdroj na úrovni školy neexistuje, rešerše 17. 9. 2026 to uzavřela záporně ([zdroje](zdroje-dat.md), oddíl 3) |
| „Tady je hranice bodů, které potřebuješ" | hranici přijetí nikdo nezveřejňuje; máme jen nejnižší výsledek přijatých za loňsko |
| „X přihlášek na místo je tvoje pravděpodobnost" | index poptávky nadsazuje konkurenci ([zdroje](zdroje-dat.md), oddíl 2.1) |

## 5. Inventura zdrojů: co jsem zvážil a nepoužiju

Povinný krok podle [soupisu zdrojů](zdroje-dat.md). Návod je textová stránka, přesto se prochází celý oddíl 2 i oddíl 3, protože právě tady je pokušení slíbit údaj, který nemáme.

| Nepoužitý sloupec nebo zdroj | Co by dal návodu | Proč ho nepoužiju |
|---|---|---|
| **Profil dovedností** uchazečů, položková data `b1`–`b16` | „na tenhle obor se hlásí silní čtenáři" jako vodítko k výběru | soubory nikdo nezpracoval; zavádět nový ukazatel v textu průvodce je špatné místo |
| **Výsledek testu všech uchazečů**, `c_m_procentni_skor` | „s 62 body jsi byl v polovině těch, kdo se sem hlásili" | zpracováno, ale na web nenapojeno; patří na stránku oboru, ne do návodu |
| **Přijatí podle priority**, sloupce 40–44 | „tři čtvrtiny přijatých měly obor jako první volbu" | **zavrženo jako rada**; návod tuhle statistiku naopak vyvrací v oddílu mýtů |
| **Index poptávky**, sloupec 32 | „5 uchazečů na místo" jako míra obtížnosti | nadsazuje konkurenci; návod před tímhle čtením varuje |
| **Oficiální minimum a maximum přijatých**, sloupce 72–77 | „s 65 body se sem někdo dostal" | maximum určuje jediný uchazeč; minimum se jmenuje *nejnižší výsledek přijatých* a bydlí na stránce oboru |
| **Školní agregáty JPZ 2017–2023** | „škola je dlouhodobě žádaná, není to výkyv" | soubory nejsou stažené |
| **Uplatnění absolventů** (Infoabsolvent, MPSV, SIMS) | odpověď na „co bude dítě dělat po maturitě" | zdroj na úrovni školy neexistuje; návod se otázky nesmí ani dotknout slibem |
| **Krajová nezaměstnanost podle skupiny oborů** | kontext trhu práce u volby oboru | popisuje kraj, ne školu; zamítnuto v [nepoužitých datech](navrh-vyuziti-nepouzitych-dat-2027.md), 3.1 |
| **Dobíhající obor**, rejstřík | „tenhle obor se už nenabírá" | platí jen u nabídky, která v ročníku chybí; v návodu nemá co dělat |
| `hard_facts.support_services`, `hard_facts.absence` | „mají psychologa", „jak se tu chodí" | zobrazuje je stránka školy; návod na ni odkáže místo opisování |
| **Ředitel**, `platnostDo` z AKKO, `emaily`, telefon | kontakt a stabilita vedení | osobní údaje bez vypovídací hodnoty, resp. nezobrazujeme |
| **Data uchazečů 2. kola** | pásma přijetí ve 2. kole | zamítnuto: jen 133 oborů má ve 2. kole aspoň deset přijatých s výsledkem |
| **Maturitní výsledky** | „jak to tu dopadá u maturity" | používá je stránka školy; návod na ni odkáže a vysvětlí, že popisuje úroveň ročníku, ne kvalitu výuky |

Použije návod naopak: **harmonogram MŠMT** (`src/data/admissions-2027.json`) pro krok 0 a **registr období** pro větu, ke kterému přijímacímu řízení se čísla na webu vztahují. Nic jiného z dat nečte.

## 6. Co z dnešních stránek zůstane, co zmizí

| Prvek | Rozhodnutí | Důvod |
|---|---|---|
| Mechanika odloženého přijetí krok za krokem | **použít** celé | jediné místo, kde se to na webu vysvětluje; míří sem odkazy ze dvou typů stránek |
| Příklad Anna/Boris/Cyril ve dvou scénářích | **použít**, přepočítat na škálu 0–100 | názorně ukazuje vytlačování, které samotný popis nevysvětlí |
| SVG schéma BODY → ALGORITMUS → VÝSLEDEK | **použít** | jediná grafika na obou stránkách |
| Oddíl mýty versus realita | **použít** | vyvrací přesně ty rady, které si rodiny předávají |
| Blok o bodech za prospěch a školní zkoušku | **použít** | poctivé přiznání, že tahle data nemáme, a přitom jde až o třetinu hodnocení |
| Tři priority jako rozptyl ambicí | **použít jednou**, ne dvakrát | dnes je na obou stránkách |
| Příprava na testy, časový management | **použít, zkrátit** | patří sem, ale ne jako polovina stránky |
| Externí zdroje CERMAT, TAU, To-DAS | **použít** | zadání testů nemáme a mít nebudeme |
| Profil školy matematický versus humanitní | **použít přepsané** | dnes odkazuje na „Index zaměření" a „Profil náročnosti", což jsou názvy, které stránka školy nepoužívá |
| Checklist na den zkoušky (svačina, voda, mobil) | **zkrátit na tři body** | s výběrem školy nesouvisí; drobnost, kterou najde rodina jinde |
| Dvojice seznamů „udělejte / vyvarujte se" | **zavrhnout jako oddíl** | duplikuje rady z kroků; co z nich přežije, patří ke kroku, kterého se týká |
| Ruční obsah stránky s kotvami | **použít**, ale jako obsah osmi kroků | dnes jsou dva různé, každý jinak podrobný |
| Breadcrumb | **použít** | má ho jen jedna z nich |
| Emoji jako ikony (⚠️ 💡 🍎 💧 🧘) | **omezit** | dekorativní emoji uprostřed vět snižují čitelnost; výstražné značky zůstanou |
| „160 bodů", „165/155/140" | **zavrhnout** | cizí škála, viz oddíl 4 |

## 7. SEO a přesměrování

1. **`/jak-funguje-prijimani` → `/jak-vybrat-skolu#jak-se-rozhoduje`**, trvalé přesměrování (HTTP 301) v `next.config.ts`, kde už projekt čtyři přesměrování má.
2. **Odkazy uvnitř webu se přepíšou** na novou adresu s kotvou: stránka školy, stránka oboru, kalendář, novinky. Přesměrování je pojistka pro cizí odkazy, ne náhrada za opravu vlastních.
3. **Sitemapa** ztratí zrušenou adresu; generátor ji vypisuje v `scripts/generate-sitemap.js`.
4. **Titulek a popis sloučené stránky** musí pokrýt obě dosavadní témata, aby se neztratil dotaz na „jak funguje přijímací řízení". Návrh titulku: „Jak vybrat střední školu a jak funguje přijímací řízení".
5. **Nadpis kroku 1 nese slova zrušené stránky** („Jak funguje přijímací řízení"), protože na ně míří vyhledávací dotazy.
6. **Kotvy se nemění.** Jednou zveřejněná kotva je adresa; přejmenovat ji znamená rozbít odkazy.

## 8. Otevřené k rozhodnutí

| Otázka | Návrh |
|---|---|
| Zůstanou v horní liště dvě položky? | ne; „Průvodce" povede na sloučenou stránku, „Jak to funguje?" zmizí |
| Má návod ukazovat nejbližší termín, nebo celý kalendář? | jen nejbližší termín a odkaz; kalendář má vlastní stránku |
| Má se přidat odkaz na `/moje-sance`? | **ne bez rozhodnutí**: na stránku dnes neodkazuje nic na celém webu a neprošla revizí podle slovníků |

## 9. Historie

| Verze | Změna |
|---|---|
| 1.0 | Návrh sloučení dvou průvodců do jednoho návodu o osmi krocích. Zadavatel schválil ponechání adresy `/jak-vybrat-skolu` a trvalé přesměrování druhé. Zapsány dvě věcné vady dnešního stavu (dvě bodové škály, bílý text na bílém pozadí) a inventura nepoužitých zdrojů. |
