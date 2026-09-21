# Changelog

Všechny podstatné změny v projektu jsou dokumentovány v tomto souboru.
Formát vychází z [Keep a Changelog](https://keepachangelog.com/cs/1.1.0/).
Verze a data odpovídají veřejnému changelogu na webu (`src/lib/changelog.ts`,
stránka /changelog); tento soubor je vývojářský záznam rekonstruovaný
z historie commitů.

## [Unreleased]

### Přidáno
- **Manažerské shrnutí na `/o-projektu`** (`src/lib/o-projektu.ts`, `src/lib/naklady-vyvoje.ts`) — neodkazovaná stránka pro školy, úřady a novináře: co web dělá, jakých 20 datových sad používá a s jakou automatizací, jak se data dostanou na web, jak je web postavený, časová osa vývoje a odhad ceny vývoje u dodavatele. Stránka má `robots: noindex`, není v mapě webu (statické adresy staví generátor výčtem) a nevede na ni odkaz z navigace ani z patičky; ke zveřejnění stačí odebrat `robots` a doplnit adresu do `buildSitemapPaths`
- **Čísla se čtou z týchž souborů jako zbytek webu**, ne napevno: počty škol, nabídek a ročníků z katalogu, přehled zdrojů z registru datových sad, časová osa z veřejného changelogu. Napevno zůstává jen rozsah kódu a odhad ceny, obojí s datem měření, protože repozitář v nasazení není
- **Odhad ceny vývoje jako rozepsaný model**, ne jedno číslo: dvanáct funkčních bloků s odhadem člověkodnů a zdůvodněním, režie vedení projektu, tři sazby a vypsané výhrady včetně té, že poměr 194 řádků na člověkoden je na horní hranici produktivity a odhad tedy spíš podhodnocuje. Vychází 397 člověkodnů a 3,8 až 5,7 mil. Kč. Skutečné náklady mají na stránce označená místa k doplnění, protože je nikdo neměřil

## [2.14.0] - 2026-09-19

### Přidáno
- **Maturitní karta na stránce oboru** (`src/lib/obor-maturita.ts`, návrh `docs/maturita-na-strance-oboru-2027.md`) — tři čísla v oddílu „Jak se tu studuje“: úspěšnost s jmenovatelem, čeština proti středu podobných škol a dvojice „podíl volby matematiky a výsledek“; plný rozpad zůstává na stránce školy. Napojení přes `SMO16`: 2 782 z 3 091 nabídek dostane výsledek, 240 větu „obor zatím nemá maturanty“, 69 škol maturitní data nemá. Text rozlišuje obor, který je ve skupině sám (1 590), od oboru sdílené skupiny (1 192), kde vyjmenuje ostatní obory a nad tři uvede počet
- **Pole `smo16` v `souhrny_kolo1.json`** — skupina maturitních oborů ze sloupce `SKUPINA OBORŮ (16)`, který generátor dosud zahazoval. **Mapa `KKOV` → `SMO16` tím přestává být chybějícím zdrojem**: maturitní návrh ji vedl v §3.6 jako nutnou k dohledání, přitom ji zdroj nese u každé nabídky a soupis zdrojů to v oddílu 2.11 říká výslovně. Ověřeno, že doplnění pole nezměnilo ani jednu z ostatních hodnot u 3 216 nabídek

## [2.13.0] - 2026-09-19

### Přidáno
- **Sdílený modul adresy oboru `src/lib/adresa-oboru.mjs`** — adresu skládalo trojí různé místo, z toho dvě nad loňským katalogem: `data.ts` ji rozpoznávalo z ročníku podle registru, vyhledávací API i generátor sitemapy ji stavěly z roku 2025. Nově ji skládá jeden modul a rozpoznávání v `data.ts` je vyhledání v mapě, ne skládání podle vzorců. Modul je v čistém JavaScriptu s typy v JSDoc, protože ho při buildu používá generátor sitemapy pod `node`, a odstraňování typů umí až Node 22.6 (workflow běží na Node 20); ze stejného důvodu je generátor přejmenovaný na `.mjs`. Návrh a měření: `docs/adresa-oboru-2027.md`
- **Jeden průvodce místo dvou** (`docs/pruvodce-vyberem-skoly-2027.md`) — `/jak-vybrat-skolu` je návod v osmi krocích, `/jak-funguje-prijimani` na něj trvale přesměrovává na kotvu `#jak-se-rozhoduje`. Sloučení opravilo dvě věcné vady: stránky pracovaly se dvěma neslučitelnými bodovými škálami (0–100 proti ~200, past 3 soupisu zdrojů) a zrušená stránka měla `bg-white text-white` u hlavičky i u shrnutí. Ročník se bere z registru, termíny z harmonogramu MŠMT
- **Ukazatel Neúčast u maturity** (slovník 1.27) — sloupec „ke zkoušce nešlo“ v tabulce po letech, počet a podíl z přihlášených; vzorec ověřen dopočtem z počtů ve všech řádcích ročníků 2021–2026
- **Položka „Zvažované obory (X)“ v horní liště**, počet se mění bez obnovení stránky; čtení výběru sjednoceno do `src/lib/vyber-zvazovanych.ts`. „Nahlášené chyby“ přesunuty do patičky
- **Ověření mapy sloupců maturitních souborů** (`scripts/overeni-sloupcu-maturity.py`) — neporovnává jen názvy, ale dopočítává podíly z počtů, takže odhalí i sloupec, který se jmenuje správně a nese něco jiného. Bez nálezu na ročnících 2021–2026; doklad `docs/podklady/overeni-sloupcu-maturity.json`
- **Měření délky maturitní řady** (`scripts/delka-rady-maturity.py`) — podklad pro zamítnutí delší řady
- **Kontrola duplicit** v `build-maturita-skoly.py` (přejímací podmínka 3), která ve skriptu chyběla
- **Integrační test katalogu a JS testy v CI** — `tests/catalog-2026.integration.mjs` hlídá invariant „každá nabídka má vlastní stránku“, který 19. 9. 2026 porušila změna, jež se dostala na produkci. Job spustí vývojový server a test pustí; JS testy (183) v CI dosud neběžely vůbec, protože job měl Node 20

### Opraveno
- **Dvě nabídky téže školy mohly sdílet jednu adresu** — jednoznačnost se posuzovala na surové dvojici obor+zaměření, kdežto adresa vzniká po odstranění diakritiky, sjednocení velikosti písmen a oříznutí na 40 a 150 znaků. Naměřeno 14 kolizních adres v katalogu 2026; jedna nabídka pak ukazovala čísla druhé. Nově se jednoznačnost počítá z hotové adresy ve třech stupních (základní tvar, délka studia, pořadí) a pořadí je stabilní vůči pořadí v souboru. Ověřeno: 3 224 nabídek = 3 224 adres
- **Základní adresa oboru bez zaměření** vyráběla syntetický program s klíčem bez přípony, ten nesedl na souhrn 1. kola a stránka spadla do starší podoby s loňskými čísly (838 adres, čtvrtina stránek oborů). Nově se trvale přesměrovává na jedinou nabídku oboru, nebo na přehled školy. Adresa, která nepatří žádné nabídce, se také přesměrovává místo aby vykreslila přehled s kódem 200
- **Vyhledávání posílalo 1 004 z 3 091 nabídek na `/nabidka/2026/…`** místo na stránku oboru; odkaz nově míří vždy na stránku oboru, a když pro nabídku stránka nevzniká (pravidlo `nabidkySeStrankou`), na přehled školy. `/nabidka/2026/<source_id>` zůstává jako dočasné přesměrování, protože cíl závisí na datech ročníku
- **Sitemapa se stavěla z ročníku 2025** — 402 adres už na obor nevedlo a chyběly kanonické adresy, které existovaly. Nově z registru a jen adresy, které vracejí 200; z 5 189 na 4 300
- **Délka studia v názvu nabídky** (`nazevNabidky`) — v Mém výběru vypadaly dva uložené obory téže školy identicky, protože víceletá gymnázia mají shodný obor i zaměření
- **Karty oborů na stránce školy se po uložení rozjížděly** — každá karta je vlastní mřížka, takže sloupec `auto` vycházel jinak podle obsahu; poslední sloupec má pevnou míru a `UlozitObor` kompaktní podobu
- **Upoutávka Vibecodingu** neznala část kontraktu endpointu: u reklamního slotu vypisovala pole `date` (dnešek) místo termínu z `bannerDescription` a ignorovala `imageUrl`, `badgeLabel`, `ctaLabel`, `highlight`, `talkTitle`, `impressionUrl` i `isInternal`
- **Pevné letopočty 2025** ve starší podobě stránky oboru (nadpis i dvě věty pod ním); dluh hlídače klesl z 90 na 82 výskytů
- **`docs/zdroje-dat.md`, oddíl 2.11** vedl všech deset maturitních sloupců jako nepoužívané, ačkoli se zpracovávají od 14. 9. 2026

### Odstraněno
- **Route `/skola/[slug]/detail`** a pět komponent, které používala jen ona — osiřelá, neodkazovalo na ni nic ve zdrojích ani v sitemapě
- **Stránka `/jak-funguje-prijimani`** (sloučena do průvodce, adresa přesměrovává)

## [2.12.1] - 2026-09-19

### Přidáno
- **Ruční pomůcka `scripts/stahni-rejstrik.py`** (PR #109) — stáhne snímek rejstříku MŠMT, který zobrazuje registr, a ověří otisk; soubor, otisk i adresu bere z registru. Datová linka ani CI snímek nepotřebují

### Opraveno
- **Popis školy v souběžných přihláškách jako na stránce oboru** (PR #109) — `scripts/nazvy_oboru.py` i `nazvyOboru()` na webu berou ročníky katalogu od zobrazeného podle registru (`cermat-vysledky`) ke starším a uvnitř ročníku první záznam v pořadí souboru; pravidlo drží sdílené čisté funkce (`rocnikyKatalogu`, `klicOboru` v `src/lib/school-key.ts`, `poradi_rocniku` v Pythonu). Dosud Python bral starší ročník a web i ročník naimportovaný před přepnutím v registru. Popis se změnil u 36 klíčů (32 škol, 30 delších názvů, 6 jiných obcí), doklad `docs/podklady/dopad-precedence-nazvu-2026-09-18.md`; řazení podle `id` zavrženo (u PORG by změnilo obec bez dokladu). Nejednoznačné klíče (45) generátor hlásí. Klíč oboru bez `kkov` se na obou stranách skládá z `id`
- **Oznámení datové linky tvrdilo, že souběžné přihlášky web nezobrazuje** (PR #109) — čte je stránka školy; věta v `dopad_uchazeci` i test opraveny

## [2.12.0] - 2026-09-18

### Přidáno
- **Sekce „S kolika body se sem lidé dostali“ na stránce oboru** — tři velká čísla za zobrazený ročník (nejnižší přijatý s percentilem, prostřední výsledek přijatých, průměr s rozpadem na předměty), dva ročníky vedle sebe a celostátní medián uchazečů (slovník ukazatelů 1.24), aby rozdíl bodů netvrdil, že se změnily nároky školy, když se změnila obtížnost testu; sedmistupňová škála obtížnosti zamítnuta měřením (shodné zařazení u 36,3 % vs 52,8 % při pěti stupních)
- **Blok „Dá se slabší předmět dohnat tím druhým?“** na stránce oboru — nejslabší přijatý v předmětu (jeden skutečný člověk s oběma výsledky, ne dvě minima ze dvou lidí), podlaha slabšího předmětu (medián 23 bodů u velmi těžkých oborů proti 7 tam, kde kapacita nerozhodovala; 2 757 oborů) a nevyrovnaní přijatí; tři ukazatele slovníku 1.26, slovní výklad z naměřené podlahy, ne z typu školy
- **Rozlišení „obor se už nenabírá“ od „letos nevypsala“** (`scripts/build-dobihajici-obory.py` → `public/dobihajici_obory.json`, 602 denních oborů) — příznak se nasazuje jen u oboru chybějícího v zobrazeném ročníku; hrubý klíč REDIZO+KKOV má doloženou 100% chybovost (všech 29 zásahů falešných), pojem slovníku pojmů 1.7
- **Titulní stránka upozorňuje, z jakého roku jsou obory** a kdy školy vyhlásí novou nabídku — rok z registru (`cermat-prihlasky`), termín z kalendáře MŠMT; text se mění podle data a po přepnutí registru mizí
- **Obec v hlavičce stránky školy** (`nazevSObci` v `src/lib/skola-vyklad.ts`) — jen když ji název sám neobsahuje (151 z 1 120 škol) a jen jako celé slovo (obec „As“ vs „Vlašim“); z podtitulku odebrána, aby nestála dvakrát
- **Věta o absolventech na stránce školy** — otevřeně, že o uplatnění absolventů spolehlivá data nejsou, a proč; „absolventi“ mají vlastní heslo ve slovníku pojmů 1.6
- **Harmonogram MŠMT jako datová sada** `msmt-harmonogram` v registru — zdroj ročníku pro web i pro odesílač novinek

### Změněno
- **Data uchazečů přepnuta na 1. kolo 2026** — poslední z třinácti webových sad na starém ročníku (`cermat-uchazeci-kolo1`); pásma přijetí, souběh i kontext přihlášek už nemíchají dva ročníky. Míra *rozhodl test* vychází na nové dvojici 0,672 (zařazení se mění u 26 % oborů) a slovník ji dál nezobrazuje jako číslo; **medián JPZ přijatých** doplněn do `build-pasma-prijeti.py` (mediánově o 1,1 bodu pod průměrem na 2 517 nabídkách, slovník ho od 1.3 doporučoval zobrazovat přednostně)
- **Obtížnost přijetí má jednu implementaci** — veličiny počítá generátor a práh deseti soutěžících uplatňuje až zobrazení; datové pole nese hodnoty i pod prahem, dvě implementace se dříve lišily právě o práh
- **Maturitní návrh dověřen** — ověření mapy sloupců dopočítává podíly z počtů a sedí na vysvětlivky do posledního místa ve všech 3 375 řádcích každého ročníku 2021–2026 (`scripts/overeni-sloupcu-maturity.py`); doplněna kontrola duplicitních řádků a testy organizačních změn (tři SMO16, změna REDIZO, sloučení škol); ročníky 2015–2022 zamítnuty měřením (předpověď okna od druhého roku plochá, 62–66 %), okno zůstává čtyřleté; čistá neúspěšnost jako metrika zamítnuta (dokument v1.4)

### Opraveno
- **Potvrzovací e-mail odběru se posílal cizí adrese** — inline odeslání i dovoz servisních e-mailů vybíraly nejstarší čekající položku zprávy místo té, která odeslání vyvolala; zbytková položka kouřové zkoušky na `example.com` tak odletěla do Resendu (422) a potvrzení nové žádosti nedorazilo. `pripravDavku` umí omezení na konkrétní položku (`jenPolozkaId`), dovoz fronty přeskakuje rezervované testovací domény (RFC 2606) a formulář je odmítá rovnou se srozumitelnou hláškou
- **Obor bez údajů dostával značku „mimo přehled“** — fallback ‚jiny' byl příliš široký; nový stav „bez údajů“ (slovník pojmů 1.8) a značky drží čisté funkce `znackaMimoPrehled`/`popisekObtiznosti` s testem
- **Názvy oborů mimo přehled i v datové lince v CI** (PR #108) — generátory souběžných přihlášek a kontextu přihlášek četly názvy ze snímku rejstříku MŠMT, který v gitu není; přegenerování v CI by názvy smazalo a stránky by se vrátily ke kódům. Názvy se čtou z malého indexu v gitu (`data/msmt_rejstrik/nazvy-oboru.json`, `scripts/build-nazvy-oboru-rejstrik.py`) ze snímku podle registru; chybějící, prázdný nebo zastaralý index je chyba, takže se názvy nikdy tiše neztratí. `stav-datovych-sad.py prepni` u lokálního souboru zapisuje do registru otisk sha256, index nese celý záznam `zobrazeno`, a zastaralý index se tak pozná i po revizi téhož čtvrtletí převzaté týž den. Krok „po přepnutí snímku přegenerovat index“ je v postupu přepnutí (`docs/zdroje-dat.md`, oddíl 5), v registru, v provozu linky a ve výpisu `prepni`. Značka „mimo přehled“ se ukazuje i u oboru, který má obtížnost přijetí (review Codex, 4 kola)
- **Obory výš a níž na přihlášce ukazovaly obory mimo přehled jen kódem** (PR #99) (např. `600006387_65-51-H/01` se značkou „bez údajů“ na 308 stránkách oborů) — jde hlavně o učební obory bez jednotné zkoušky, které přehled zatím nezahrnuje. Kontext přihlášek k nim nese název školy, obce a oboru z rejstříku škol MŠMT (`scripts/nazvy_oboru.py`, sdílený se souběžnými přihláškami; od PR #108 z indexu v gitu) a stránka ukazuje značku „bez jednotné zkoušky“ nebo „mimo přehled“ s vysvětlením (slovník pojmů 1.6)
- **15 nabídek 2026 s přepsaným zaměřením mělo dvě stránky** (PR #97) — stará hlásila „letos nevypsáno“ s čísly 2025, nová měla čísla 2026 bez historie (např. Kuchař a Číšník v Čakovicích, gymnázium s „němčinou“ místo „německého jazyka“). Mapa nabídek přebírá ručně ověřené páry z `docs/podklady/overene-pary-nabidek-2026.csv` (audit modelem Jev a ruční kontrola, u 13 z nich návaznost dříve potvrdila i rešerše); neplatný nebo kolidující pár skončí chybou. Katalog 2026 má o 15 zdvojených záznamů méně
- **Souhrn 1. kola chyběl u 373 stránek oborů** (PR #97) — stránka s přepsaným zaměřením nese loňský klíč katalogu, souhrny 1. kola ale letošní klíč CERMAT, takže souhrn zobrazeného ročníku nenašla a zůstala jí starší podoba stránky oboru. Hledání souhrnu jde přes mapu nabídek ročníku z registru a souhrny párují ročníky podle téže mapy; spárováno 2 934 místo 2 858 nabídek (slovník ukazatelů 1.24). Změřeno funkcemi webu nad 3 105 stránkami oborů: bez souhrnu 411 → 38, se srovnáním s předchozím ročníkem 2 530 → 2 918. Chybí-li mapa ročníku, web to hlásí v logu

## [2.11.0] - 2026-09-18

### Přidáno
- **Odběr novinek e-mailem** — jeden newsletter bez ročníku a segmentů: termíny přijímacího řízení a zprávy o nových datech na webu. Formulář (`src/components/novinky/OdberFormular.tsx`) na titulce a dalších místech; double opt-in přes podepsaný odkaz (72 h), odhlášení jedním kliknutím (RFC 8058), slib „v e-mailech neměříme“. Odesílání přes Resend z hlavní domény s frontou v Neon Postgres: dávky s klíči idempotence, hranice předání, rozpočet kvóty s rezervou pro portál, webhook pro bounces a stížnosti, kouřová zkouška celé cesty (`src/lib/novinky-*.ts`, `src/app/api/novinky/*`); návrh `docs/novinky-k-prijimackam-2027.md`
- **Přehled odběru novinek na /admin** (`getNovinkyPrehled` v `src/lib/admin.ts`) — aktivní odběratelé, noví za 7 a 30 dní, čekající potvrzení, stav fronty odesílače a rozpad podle místa přihlášení; čte se přes `novinky-db`, do administrace se nevynášejí adresy, jen počty

## [2.10.2] - 2026-09-14

### Změněno
- **Maturita na stránce školy srozumitelněji** — souhrnná věta (jak často byla škola v češtině nad středem podobných škol přes všechny skupiny oborů), tabulka po oborech, „lépe než X ze 100“ místo percentilů a „podobné školy“ (slovník pojmů 1.4); úspěšnost z přihlášených maturantů stejně jako počítá CERMAT, dříve stál vedle podílu počet z konajících
- **Srovnání maturity s podobnými školami v jedné veličině** — střed, výsledek školy i graf v podílu bodů z testu, tedy v tom, proti čemu se počítá zařazení; percentil zůstává jako srovnání s maturanty v celé zemi (slovník ukazatelů 1.20)

## [2.10.1] - 2026-09-14

### Přidáno
- **Sdílený výklad 2. kola** (`src/lib/druhe-kolo-vyklad.ts`) — věty o 2. kole pro stránku oboru, stránku školy, otevřená data i starší kartu: kdo se nevešel, proč škola nepřijala všechny, nejnižší výsledek přijatých (jen při ≥10 přijatých s výsledkem); čísla 2. kola se nikdy nesčítají s 1. kolem
- **Detail oborů bez zaměření nových v katalogu 2026** — obory, které přibyly až v ročníku 2026, nebyly v `school_analysis.json` a `getSchoolPageType` je nenašel; odkaz vedl na přehled školy
- **Datová linka umí znovu otevřít uzavřenou úlohu** (příkaz `znovu`) a potvrzuje každé schválení do Telegramu i komentářem v issue; komentář v issue spustí workflow hned místo čekání na cyklus (`scripts/linka/komunikace.py`)

## [2.10.0] - 2026-09-14

### Přidáno
- **Stránka školy v pěti otázkách** (`src/components/skola/ProfilSkoly.tsx`, `src/lib/skola-profil-data.ts`) — obory s obtížností přijetí, maturita proti skupině oborů (po přepnutí sady), inspekce, profil školy se značkami původu, údaje z portálu u otázek, schéma okolí a souběžné přihlášky; nahrazuje obě starší podoby přehledu; návrh `docs/stranka-skoly-2027.md`
- **Maturita na stránce školy** — sada `cermat-maturita` přepnuta na jaro 2026 (PR #92, úloha GQ99C); ročníky 2023–2026, zařazení proti skupině oborů
- **Maturitní výsledky přes datovou linku** (`scripts/build-maturita-skoly.py`, zpracovatel `cermat-maturita`) — jen úrovně redizo a redizo_smo16, pod 10 konajícími jen počty, interval ±1,96 směrodatné chyby
- **Portál pro školy**: nepovinná pole stravování a kontakt na výchovného poradce
- **Uložení mezi zvažované** na stránce oboru, sdílené se simulátorem

### Opraveno
- **Otevřená data školy** (`/skola/{slug}.md`, `.json`) — stejná datová vrstva jako stránka školy (`src/lib/skola-otevrena-data.ts`): ročník z registru, obtížnost přijetí, maturita, údaje od školy s původem, souběžné přihlášky; bez součtu přihlášek za školu; JSON ve verzi schématu 2
- **Předložka z/ze před čísly** — podle výslovnosti čísla, ne jen u sedmiček a stovek
- **Součtové poměry na stránce školy** — přehled školy a banner přihlášek nesčítají přihlášky a přijaté přes různé obory; srovnání ročníků ze souhrnů CERMATu
- **Funkce stránky školy nepřibírá celý projekt do bundle** — doslovné cesty k datům v `src/lib/skola-profil-data.ts`

## [2.9.0] - 2026-09-14

### Přidáno
- **Stránka oboru ve třech otázkách** (`src/components/obor/ProfilOboru.tsx`) — jak těžké je se dostat, co pomůže, jak se studuje; odpověď slovy nad rozbalovacími důkazy, návrh a rozhodnutí v `docs/vrstvy-stranky-oboru-2027.md`; bez souhrnu 1. kola zůstává starší podoba
- **Souhrny 1. kola po ročnících** (`scripts/build-souhrny-kolo1.py` → `public/souhrny_kolo1.json`) — párování nabídek mezi roky, obtížnost přijetí slovy, kraj a srovnatelná skupina
- **Kontext přihlášek** (`scripts/build-kontext-prihlasek.py` → `public/kontext_prihlasek_{rok}.json`) — výsledek uchazečů o obor, obory výš a níž na přihlášce, odvozená hranice úspěšnosti; napojeno na datovou linku
- **Weby škol** (`scripts/build-skoly-web.py` → `public/skoly_web.json`) z adresáře rejstříku škol
- **Slovník pojmů** (`docs/slovnik-pojmu.md`) — závazná slova pro texty webu, vysvětlení při prvním výskytu a zakázaná slova

### Opraveno
- **Banner „Vibecoding“ i na nové stránce oboru**

## [2.8.0] - 2026-09-13

### Přidáno
- **Portál pro školy** (`/pro-skoly`) — škola si sama doplní profilové údaje; přístup přes jednorázový kód nebo magic link zaslaný na rejstříkový e-mail (odkaz platí 72 h), po odeslání potvrzovací e-mail; příspěvky prochází moderací přes GitHub Issues a teprve potom se ukážou na stránce školy; veřejná stránka s ukázkou profilu a postupem
- **Administrace** (`/admin`) — stav moderace portálu, stav datových sad, fronta datové linky a automatizace; přístup heslem, relace 12 h
- **Inspekce ČŠI** — web zobrazuje snímek ze 7. 9. 2026 místo 11. 2. 2026; převzato z větve týdenního workflow (PR #54)

### Změněno
- **„Jak to dopadlo loni“ z finální revize dat 2025** — CERMAT 20. 5. 2026 zveřejnil finální verzi včetně vzdání se přijetí; počty se u části oborů mírně posunuly (PR #84–#87)
- **Doklad pásem přijetí přepočítán** na aktuálních revizích obou roků; upstream 20. 5. 2026 přepsal i soubor 2024 do schématu roku 2025 (klíč REDIZO) a přeřadil asi 430 přijatých mezi vzdavší se, takže stabilita míry *rozhodl test* je 0,671 místo 0,725; teze ve verzi 1.7
- **Pásma přijetí čtou rok z registru** místo 2025/2026 napevno — po `prepni … 2026` přejde web na nový rok bez změny kódu; `prepni --obnovit-nejpozdeji` umí posunout termín plánované obnovy
- **Verze v patičce se odvozuje z `src/lib/changelog.ts`** — patička dosud uváděla zastaralou v2.4.1

### Opraveno
- **Validace datových sad odolává smíchaným verzím** — `validate-pasma-prijeti.py` končí chybou při nesouladu počtů (předběžná data proti finálním pásmům: 625 z 2 846 oborů)
- **Přepnutí registru přebírá období z dostupných** — `prepni` dřív nechával převzaté období v `dostupne`, takže kontrola hlásila falešné „nepřevzato“; `vrat` položku obnoví
- **Čtení roku 2024 ve `validate-pasma-prijeti.py`** — po přepsání souboru upstreamem skript padal na chybějících sloupcích; rok 2024 se čte stejnou funkcí jako 2025 a převod IZO odpadl

## [2.7.0] - 2026-09-13

### Přidáno
- **Ročník 2026 v katalogu se stabilními identifikátory nabídek** (`scripts/build-offer-mapping-2026.py`, `scripts/build-catalogue-2026.py`) — 2 113 nabídek napřímo, 490 při jediné nabídce oboru na obou stranách, 63 podle normalizovaného zaměření; klíč „2026“ nese 3 091 letošních nabídek a 148 přenesených z 2025 s příznakem `nevypsano_2026`, žádná adresa z 2025 nezanikla
- **Pásma přijetí „Jak to dopadlo loni“ na stránce oboru** (`src/components/school/detail/PasmaPrijetiCard.tsx`, `scripts/build-pasma-prijeti.py`) — pod kolika body se v 1. kole nedostal nikdo, nad kolika všichni, úspěšnost v pásmech mezi tím, věta o tom, co rozhodlo; celostátní percentil hranice odfiltruje posun obtížnosti testu mezi ročníky (z −2,5 bodu na +1,4 percentilového bodu)
- **Blok „Druhé kolo“ na stránce oboru** (`DruheKoloCard.tsx`, `scripts/build-druhe-kolo.py`) — místa, přihlášky, přijatí a nejnižší přijatý výsledek ve 2. kole; 2. kolo se opakuje u 66 % oborů; první místo webu čtoucí zobrazované období z registru
- **Ověřený ukazatel náročnosti „tlak prvních voleb“** (přihlášky s prioritou 1 / kapacita) místo nedoloženého indexu obtížnosti — spočtený z roku 2025 předpovídá přetlak 2026 s AUC 0,870 na 1 580 spárovaných nabídkách (celková poptávka jen 0,801; `scripts/validate-indicators.py`); audit odhalil, že všech 386 nul starého indexu pocházelo z chybějících dat
- **Registr stavu datových sad** (`public/stav_datovych_sad.json`, `scripts/stav-datovych-sad.py`) — 17 sad se zobrazeným a očekávaným obdobím, automatizací a lidským krokem
- **Datová linka** (`scripts/datova-linka.py` + `scripts/linka/`) — automatizace od zjištění nových dat po schválení a předání: Telegram a GitHub issue, schválení odpovědí „schvaluji KOD“, PR z dočasného worktree, režim `--nanecisto`, workflow `datova-linka.yml`
- **Data navíc** — uchazeči 1. kola 2026 (3GQMK), finální revize 2025 (QNYPE), `pasma_prijeti_2026.json`, souběh přihlášek a kohorta podle pozice na přihlášce (korelace 0,834 mezi ročníky), závazný slovník ukazatelů (`docs/slovnik-ukazatelu.md`)
- **Web přiznává nejistotu návaznosti a nabízí opravu přes Issues** (`scripts/build-navaznost-notes.py` → `public/navaznost_notes.json`) — 216 poznámek, 70 s přiznanou nejistotou
- **Interní nástroje návaznosti 2025→2026** — prohlížeč konfliktů (`tools/konflikty-prohlizec/`), prohlížeč výsledků rešerše, lokální vyhledávání v rejstříku MŠMT, `scripts/match-zamereni.py` (normalizace názvů; všech 73 kandidátů spárováno)

### Změněno
- **Dolní mez pásem se nezobrazuje pod deseti přijatými** (`MIN_PRIJATYCH_PRO_HRANICI`); upozornění na sdílený záznam stojí nad čísly
- **Vypnut týdenní refresh InspIS** — zdrojová sada CSIC zmizela z otevřených dat, workflow padalo od 10. 8. 2026

### Opraveno
- **Vypořádání externí oponentury tezí JPZ** — stabilita míry „rozhodl test“ opravena z 0,783 na 0,673; generátor zpracovává obory bez povinné JPZ (1 497, převážně učební); talentový příznak pokrývá i sportovní gymnázia 79-42
- **Nepravdivé tvrzení o CERMATu** — soubor výsledků 1. kola obsahuje oficiální minimum přijatých (shoda s vlastním výpočtem u 97 % oborů) a přijaté podle priority; web tvrdil, že je CERMAT nezveřejňuje
- **Tiché selhání zpracování v datové lince** — CERMAT zapisuje příznak přijetí jako text, zpracování vracelo nula oborů; opraveno a přidána pojistka

## [2.6.0] - 2026-09-11

### Přidáno
- **Kalendář přijímacího řízení 2027** (`src/app/prijimacky-2027/page.tsx`, `src/data/admissions-2027.json`) a generovatelný `public/prijimacky-2027.ics` (PR #71); obnovená data CERMAT
- **Simulátor výběru oboru s dojezdem** — dojezdová doba se uplatňuje dřív než kraj/město, aby se nezahazovaly dosažitelné obory za hranicí regionu; filtr `src/lib/simulator-filter.ts` s testy
- **Výsledky uchazečů a důvody nepřijetí v simulátoru** (`src/lib/admission-summary.ts`)
- **Úvodní žebříček v simulátoru se stránkováním** — pořadí nabídek ještě před zadáním kritérií
- **Porovnávací tabulka simulátoru a výběr bez stropu** (`OfferComparisonTable.tsx`, `SavedSelectionBar.tsx`, `src/lib/admission-gap.ts`) — čeština a matematika zvlášť (mediánový rozdíl průměrů přijatých mezi předměty 5,9 bodu); uložený výběr v úložišti prohlížeče místo v URL, sdílený odkaz se přičte, nepřepíše; ověřeno převodem celého katalogu 2 777 oborů bez NaN
- **Zvýrazněné výsledky oboru a související nabídky** v simulátoru a vyhledávání
- **Rutinní výkazy Matomo** (`scripts/matomo-report.py`) a analýza návštěvnosti 2026 (`docs/analyza-navstevnosti-2026.md`)

### Změněno
- **Kliky z promo banneru se měří** přes `clickUrl` se `site=prijimackynaskolu` (commit z 21. 6.)

### Opraveno
- **Náhledové obrázky pro sdílení (OG) vracely HTTP 500** — edge wrapper Next.js 16 selhával na chybějícím `NEXT_DEPLOYMENT_ID`; odstraněn `runtime = 'edge'`, obrázky se generují staticky; chybu dostával přímo `facebookexternalhit` (ze sociálních sítí 2 626 návštěv). Současně OG s českými fonty (Noto Sans) a sdílený generátor `src/lib/og-image.tsx`
- **Odstraněn nedoložený index obtížnosti** z profilu oboru a **osobní predikce a neověřená minima ze simulátoru** (S0) — `SimulatorClient.tsx` −1 755 řádků, nové `src/lib/historical-scores.ts` a `src/lib/simulator-state.ts`; stejné minima pryč z regionálních souhrnů
- **Publikace přijímacích dat napříč webem** — sjednocení práce s archivovanými údaji (`ArchivedAdmissionText.tsx`, `src/lib/result-quality.ts`), 39 souborů; statistiky detailu školy přepsané do `src/lib/admission-metric.ts`
- **Délka studia v odkazech z přehledu kraje** — proklik z filtru osmiletých gymnázií vedl na detail čtyřletého oboru (shodný slug u 248 adres); `RegionSchoolsTable` používá sdílenou `createSlug`, staré adresy vracejí 200
- **Sladění robots.txt s llms.txt** — robots zakazoval `/api/`, přestože strojové profily `/skola/{slug}.md|.json` míří přes rewrite pod `/api/skola/`; doplněna Allow pravidla

## [2.5.1] - 2026-06-05

### Opraveno
- **Zavádějící tip o prioritě (#70)** — priorita neurčuje šanci na přijetí, jen pořadí nástupu; nadpis „Statistika přijetí podle priority“
- **Rozlišující názvy škol ve výsledcích (#69, #63)** — `nazev_display` v `cermat_results_2026.json` s 97,4% pokrytím; pražská gymnázia se přestala zobrazovat jako „Gymnázium, Hlavní město Praha“; do vyhledávání přidáno zaměření
- **Perzistence filtrů na stránce výsledků (#60)** — filtry v URL parametrech a sessionStorage, zachovají se po návratu z detailu školy

## [2.5.0] - 2026-05-16

### Přidáno
- **Stránka s výsledky přijímacího řízení 2026** (`/vysledky/2026`) — hero statistiky, filtry, vyhledávání, ranking tabulky podle typu školy; redirect `/vysledky-2026 → /vysledky/2026`
- **Datová vrstva CERMAT výsledků 2026** (`scripts/import_cermat_results.py` s pytest testy) — `public/cermat_results_2026.json` (~3 080 škol), widget na detailu školy, sekce na homepage
- **Přehledy středních škol pro 20 největších měst** (`/mesto/[mesto]`, Praha–Teplice) — engine `src/lib/cityData.ts` spojuje roky 2024/2025, přihlášky 2026 a výsledky 2026 do per-city agregátů; filtrovatelná tabulka s delta vs. loni; narativní analýza generovaná LLM v buildu s persistentní cache (`data/city_narratives.json` commitnutá, build bez API klíče projde)

### Opraveno
- **Školné Rakouského gymnázia (#59)** — 27 000 → 55 000 Kč; karta Rychlá fakta u null školného ukazuje „Neuvedeno“/„Zdarma“
- **Sjednocení jednotek CERMAT** — data se převádějí z % skóre (0–200) na body (0–100) už při importu; popisky „body (max 50/100)“ a poznámka „průměr přijatých, ne minimum pro přijetí“ (např. Špitálská „171.3“ → „85.6 b.“)
- **Routing `/vysledky/[year]`** — adresář `vysledky-[year]` byl chápán jako literální cesta a vracel 404
- **OpenRouter slug pro narativy měst** — neexistující model; chyba se tiše polykala a LLM sekce se na /mesto/* nikdy nevykreslila
- **Kontext JPZ v promptu narativů** — prompt tvrdil max 2 přihlášky na uchazeče, což nafukovalo odhady odmítnutých (Teplice: 535 údajných vs. reálných ~100–180); prompt nově zakazuje prezentovat (přihlášky − přijatí) jako počet odmítnutých lidí
- **Autocomplete v headeru** — používá `nazev_display` nebo ulici, generická „Gymnázium“ v Praze se nezobrazují bez rozlišení

## [2.4.4] - 2026-04-30

### Přidáno
- **Propagační banner Vibecoding** (`src/components/VibecordingPromo.tsx`) — načítá aktivní akci z `vibecoding.cz/api/active-promotion` (s UTM), při chybě tiše skončí; postupně na všech hlavních stránkách; dvouvariantní vzhled (workshop vs. free); CSP povoluje connect na vibecoding.cz

### Změněno
- **Vyhledávání v Moje šance podporuje víceslovné dotazy (#50)** — multi-word match místo substring („PORG Praha“, „gymnázium Brno“)

### Opraveno
- **Kapacita u 212 škol s více zaměřeními (#55)** — `school_analysis.json` nesl kapacitu, přihlášky a přijaté jen z jednoho zaměření místo součtu všech; přepočítáno z `schools_data.json` 2025 (např. VOŠ a SPŠ Koterovská: IT měl 30 míst místo správných 120)
- **Chyba 404 u kraje Hlavní město Praha (#57)** — slug sjednocen na `/regiony/hlavni-mesto-praha`, převrácen redirect `praha → hlavni-mesto-praha`
- **Moje šance s jedinou školou (#56)** — analýza správně zobrazuje výsledky i pro jednu školu místo matoucích textů o „kombinaci přihlášek“
- **Index poptávky počítán per-zaměření** — místo přebírání chybné agregované hodnoty z oboru
- **Gramatika (#51)** — „převys“ → „převis“, „Rychlé fakta“ → „Rychlá fakta“

## [2.4.3] - 2026-03-10

### Přidáno
- **Kalkulačka „Moje šance“ na přijetí 2026** (`/moje-sance`) — zadání až 3 škol s prioritami, analýza kombinace přihlášek, hodnocení rizika, odhad z historických dat; API `/api/chances`; filtr délky studia; sdílení vyhodnocení přes URL (`?skoly=`)
- **Data přihlášek 1. kola 2026 z CERMATu** — nejprve odhady, pak reálná data z `PZ2026_kolo1_skolobory_prihlasky.xlsx`: 5 989 oborů (místo 2 808 odhadů); samostatný `public/applications_2026.json` (`scripts/import_cermat_2026_real.py`); hero odkaz na titulce s agregáty 156 409 uchazečů a 425 279 přihlášek
- **Párování oborů 2025↔2026** (`scripts/match_obory_2025_2026.py`, `data/obory_manual_overrides.csv`) — 2 283 automatických 1:1, 357 fuzzy, 21 N:1, 31 ručních overrides; výsledek 391 skutečně nových oborů (13 %) a 2 696 s historickými daty (87 %); kontinuita na detailu: badge „Nové 2026“, „(dříve …)“ u přejmenovaných
- **Přepracovaná stránka /skoly** (`SchoolsPageTabs.tsx`) — taby „Nejžádanější obory 2026“ (Top 100 podle převisu), „Obtížnost přijetí 2025“, „Převis podle měst“; filtry délky studia a typu školy
- **Stránka /skola/[slug]/pro-me s průvodcem** — `GuidedJourneyWizard` (simulátor bodů, kalkulačka nákladů, kontrola dojezdu, výběr priorit); nové UI komponenty Modal, ErrorBoundary, LoadingSkeleton
- **Přesná data přímo v kartě školy** — historická tabulka (2025, 2024) se sloupci Přijato a Úspěšnost, karta přesné úspěšnosti přijetí
- **Našeptávač s adresou a délkou studia** — vyhledávání prohledává i adresu školy, výsledky ukazují ulici/město a délku u gymnázií
- **Skript pro skutečné JPZ statistiky** (`scripts/enrich_schools_data.py`) — z individuálních dat uchazečů 2025: `jpz_min_actual`, `jpz_prumer_actual`, `jpz_median` a 9 kohort

### Změněno
- **Header statistik detailu školy primárně z roku 2026** — kapacita a přihlášky 2026 s údaji 2025 v závorce; obory bez 2026 dat odděleny do sekce „Obory z roku 2025“
- **Vyhledávání rozlišuje školy a zaměření** (`getAllSchoolsForSearch()`) — výsledky ukazují plný název školy a zaměření (např. „Gymnázium – ALT“)
- **Moje šance přetextována na počty přihlášek** místo „šance na přijetí“, s upozorněním „(vždy záleží na počtu bodů!)“
- **ProgramTabs** — horizontální scroll nahrazen vertikálním seznamem seskupeným podle délky studia
- **/regiony: Top 10 podle přihlášek** místo obtížnosti
- **Serverová cache API dostupnosti** — TTL 5 min, limit 200 položek, konfigurovatelné env; debounce a klientská cache našeptávače

### Opraveno
- **Chybné matchování dat 2026 na zaměření (#46)** — match podle celého ID včetně zaměření místo jen baseId; školy s více zaměřeními (Na Zatlance ALT/VIA) zobrazují správné kapacity
- **Chybná data přihlášek 2026 z odhadů** — opravuje #43 (Gymnázium M. Horákové 188 přihlášek, ne 604), #44 (SOŠ Drtinova), #45 (U Libeňského zámku 427, ne 248)
- **Lookup 2025 dat pro přejmenovaná zaměření** — fallback přes `matched_2025_id`; opravuje vyhledávání 1 584 oborů v /moje-sance
- **jpz_min sdílené přes zaměření stejného KKOV (#39)** — individuální data uchazečů nemají zaměření, takže nejsnazší zaměření táhlo minimum všem (Šeberov: basketbal 36 b i u plavání 68 b); oprava `jpz_min = max(jpz_min_actual, min_body/2)`, dopad na 261 zaměření u 170 škol (průměrně +10 b); u nespolehlivých sdílených hodnot se řádky skrývají místo „0 b.“
- **Typ referenční skupiny u víceoborových škol (#29)** — profil náročnosti dostával typ prvního oboru místo typu prohlíženého programu; 6leté gymnázium se porovnávalo se 4letými
- **Dojíždění: MAX_WAIT 15 → 10 minut (#35)** — venkovským linkám s 60min intervalem narůstal čas o 10 min navíc (Čisovice → Dobříš)
- **Poznámky ke školám** — kapacita SPŠ Prosek (INSPIS 600 vs. hlášených 720 žáků, #27), adresa Gymnázia FOSTRA (#37, #38), vlastní koeficienty JPZ Karlínského gymnázia

## [2.4.2] - 2026-02-13

### Přidáno
- **InspIS integrace (vlna 1+2)** — `data/inspis_school_profiles.json` (~58 tis. řádků), `scripts/import-inspis-data.js`, sekce `SchoolInfoSection`; týdenní CSI/InspIS refresh workflows
- **Statický sitemap.xml generovaný při buildu** místo `src/app/sitemap.ts` — 57 tis. řádků URL
- **Strojově čitelné formáty** — endpointy `/api/skola/[slug]/md` a `/json`, rewrites `/skola/{slug}.md|.json`, `llms.txt`, `<link rel="alternate">`
- **V2 redesign fáze 1–3** — master plán a design system v docs, nové komponenty (PriorityCard, StatCompact, OverviewHero)

### Změněno
- **Simulátor zobrazuje jednotlivé obory samostatně (#22)** — každý obor vlastní karta s názvem školy, délkou a zaměřením; žlutý badge „Nízká poptávka“ pro `index_poptavky < 1.0`
- **Zpřesněn nadpis „Náročnost přijetí na školu“ (#28)** + vysvětlující text a popisy percentilů
- **Přechod z Clicky na Matomo analytics** (ma.hlidacstatu.cz) + aktualizace CSP
- **Deaktivováno automatické zpracování issues** — auto-fix workflows jen na workflow_dispatch, issues se řeší ručně

### Opraveno
- **Noční spoje ve výpočtu dostupnosti (#21)** — časové okno zpřísněno z 5:00–10:00 na 6:30–9:00, blacklist nočních linek (tram 91–99, bus 901–999), 92 regionálních vlaků zachováno; transit graf 8,0 → 6,9 MB
- **Hardening CSI parseru** s pojistkou proti destruktivnímu refreshi; LLM review komentáře v CSI workflow

## [2.4.1] - 2026-02-11

### Přidáno
- **„Near miss“ počítadlo ve výsledkách dostupnosti** — počet škol v pásmu +5 minut nad limitem s tlačítkem pro rozšíření
- **Logo Hlídače státu v patičce** s odkazem

### Opraveno
- **Filtrovací podmínka dojezdového času (#14)** — škola s časem 30,3 min (zobrazeno „30“) projde limitem 30 min
- **Reálnější výpočet pěší vzdálenosti** — rychlost 5 → 4 km/h + koeficient trasy 1,3×; 1,17 km nově 23 min místo 14 (shoda s Mapy.cz)
- **Hydration error v patičce** a kolize tlačítka „Nahlásit chybu“ s badgem Hlídače státu

## [2.4.0] - 2026-02-10

### Přidáno
- **AI shrnutí inspekčních zpráv ČŠI na detailu školy** — blok „Co zjistila inspekce“, samostatná stránka `/skola/[slug]/inspekce` pro 836 škol, komponenta `InspectionSummary`, fallback s datem a PDF odkazem, AI disclaimer; datová příprava `scripts/process-csi-data.js`, surové zprávy `public/csi_inspections.json`, komponenta `SchoolInspections`
- **Funkční vyhledávání a našeptávač v horním menu (#13)** — real-time API s debounce 300 ms, výsledky škol a krajů, zvýraznění shody, klávesová navigace, prevence iOS auto-zoomu; délka studia u výsledků oborů
- **Autonomní auto-fix systém pro bug reporty** — GitHub Actions validace a opravy issues přes AI (OpenRouter), draft PR ke schválení; honeypot, spam detekce, iterativní varianta s až 3 pokusy a lint/type-check feedback loopem
- **Resend e-mail notifikace** — potvrzení přijetí issue a informace o opravě po mergi PR

### Změněno
- **Inspekční stránky renderovány on-demand** — 836 inspekčních + 4 752 stránek škol překročilo Vercel limit 75 MB; inspekce se generují při prvním požadavku a cachují

### Opraveno
- **Vercel deploy limity** — `inspection_extractions.json` zmenšen 7,1 → 5,0 MB a přesunut z `public/` do `data/` (deploy padal na „Body exceeded 75000kb limit“)
- **Hamburger menu překryté search barem na mobilu (#11)**

## [2.3.1] - 2026-02-09

### Změněno
- **Aktualizace pokrytí MHD na stránce dostupnosti** — fixní výčet měst nahrazen aktuálním výběrem dle transit grafu; doplněn zdroj jízdních řádů
- **Disambiguace zastávek v našeptávači** — kontext pro rozlišení stejnojmenných zastávek

### Opraveno
- **Fix #6 a #8: normalizeMinBodyScore vždy dělí body dvěma** — `min_body` je vždy ve škále 0–200, ale dělení probíhalo jen u hodnot >100; simulátor počítal s nekonvertovanými hodnotami (86 místo 43; OA Vinohradská rozdíl −35 místo +8)
- **Fix #7: error handling při načítání zastávek** — chybová hláška místo tichého selhání, rozlišení AbortError

## [2.3.0] - 2026-02-08

### Přidáno
- **Bug report widget** — plovoucí tlačítko „Nahlásit chybu“ s formulářem vytvářejícím GitHub Issue; API `/api/bug-report` s rate limitingem; stránka /issues s přehledem nahlášených chyb; workflow pro e-mailové notifikace nových issues
- **Rozlišení JPZ bodů vs. extra kritérií v simulátoru (#3)** — „min 33 (+38)“ s tooltipem a rozkladem; 101 škol má rozdíl >10 bodů
- **Systém poznámek ke školám a oborům** (`public/school_notes.json`, `src/lib/school-notes.ts`) — typy warning/info/update, filtrace dle REDIZO, automatická expirace; první poznámka: SPŠ sdělovací techniky Panská — obor GST nebude otevřen (#2)
- **Podpora 4. a 5. priority u škol s talentovými zkouškami** — data existovala, UI je nezobrazovalo
- **Upozornění na ~130 chybějících škol** (konzervatoře, umělecké, sportovní) na titulní stránce
- **Clicky.com analytics**
- **TT dekodér a KOMPLET→GTFS konvertor** (datová pipeline) — dekodér binárního CHAPS `.tt` formátu, `komplet_to_gtfs.py`, adaptivní limity pro velké soubory → 100 % úspěšnost dekódování (dříve selhávaly Bus26C/S, Vlak26E, PID)

### Změněno
- **PORG multi-campus** — agregace škol dle redizo+adresa místo samotného redizo (Praha 4, Libeň a Ostrava samostatně); sloupec „Body min“ nahrazen spolehlivějším „Body prům“ (`jpz_prumer_actual`) s barevnými kohortami
- **UX dopravních informací** v kartách dostupnosti — vlastní pruh přes celou šířku; tabulka oborů s `table-layout: fixed`
- **OG náhledy redesignovány** na bílý vzhled

### Opraveno
- **Inicializace Clicky trackingu** — série 4 oprav (HTTPS, inicializace, CSP pro clicky.com, data-id)
- **Mobilní input max. dojezdu** — `inputMode="numeric"`, ořez úvodních nul, validace 5–180 (nesmazatelné „030“)

## [2.2.0] - 2026-02-08

### Přidáno
- **Kartový layout výsledků dostupnosti s per-oborovými detaily** — u každého oboru body min (JPZ), body průměr, index konkurence, kapacita a délka; barevné kódování JPZ dle kohort a InfoTooltipy
- **Seznam 15 měst s MHD daty** v rozbalovacím panelu
- **Dokumentace redesignu** `docs/dostupnost-redesign-v2.2.md`

### Změněno
- **Geokódování školních adres přes Nominatim** (`scripts/geocode_schools.py`) — každá škola mapována na nejbližší zastávku podle reálných souřadnic: 914 unikátních zastávek místo 389, v Praze 146 místo 1
- **Filtrování nočních linek z GTFS grafu** — pouze ranní tripy 5:00–10:00; výpočet headway před agregací hran

### Opraveno
- **Chyba city_match** — všechny školy v jednom městě se mapovaly na jednu zastávku (179 pražských škol → „Vršovické náměstí“); vyřešeno geokódováním
- **Zavádějící „min. body“** — místo `min_body` (včetně extra kritérií) se používá `jpz_min_actual` (JPZ ČJ+MA, max 100)

## [2.1.0] - 2026-02-07

### Přidáno
- **Redesign na design systém Hlídače státu** — nová hlavička (bílý navbar, tmavě modrý vyhledávací panel #003688), patička s badge „Projekt Hlídače státu“; design analýza `docs/hlidacstatu-design-analyza.md`

### Změněno
- **Barevná paleta** — migrace z indigo/purple na HŠ modrou #0074e4 napříč všemi soubory; CSS proměnné na HŠ tokeny
- **Font Cabin** přes `next/font/google` místo systémového fontu
- **Jednotný flat design** — 4px border-radius, odstraněny gradienty, lepší kontrast placeholderu

## [2.0.0] - 2026-02-07

### Přidáno
- **Celostátní stránka dostupnosti `/dostupnost`** — z prototypu pražské dojezdovosti (`/praha-dostupnost` s API address-suggest a daty PID); klient `DostupnostClient.tsx`, API `src/app/api/dostupnost/route.ts` a `stop-suggest/route.ts`; prostorová mřížka (buňky ~2 km) pro index zastávka→školy místo full-scan
- **Transfer-aware Dijkstra v2** (`scripts/build_transit_graph_v2.py`) — graf z GTFS (profil pondělí 07:00–08:00), 35 575 zastávek a 1 431 linek; Dijkstra sleduje aktuální linku, detekuje přestupy a přičítá čekání (headway/2); výsledky s rozpadem času (jízda + čekání + chůze), badge přestupů, použité linky, kompletní seznam oborů a adresa školy
- **Filtr typu školy** (GY4, GY8, LYC, SOŠ, SOU…) a panel „Jak to funguje“ s metodikou
- **Nová SVG favicon** — motiv graduační čepice
- **Vlastní doména prijimackynaskolu.cz** — metadataBase, kanonické URL, sitemap, robots.txt, OG/Twitter titulky
- **Uvedení autora na titulní stránce**

### Změněno
- **Rebrand na „Přijímačky na střední školy“**; menu „Dojezdovost ČR“ → „Do jaké školy dojedete MHD“; nový hlavní titulek „Najdi si svou střední školu a zjisti své šance“
- **Trvalý redirect /praha-dostupnost → /dostupnost**

### Opraveno
- **Data transit grafu a poloh škol přidána do gitu** + `outputFileTracingIncludes` — bez toho API dostupnosti házela na Vercelu 500
- **Normalizace `min_body` ze škály 0–200 na UI škálu 0–100** v `/api/schools/search` (`normalizeMinBodyScore`)

## [1.5.2] - 2026-02-07

### Přidáno
- **Klávesová navigace v našeptávači zastávek** — šipky, Enter, Escape; zvýraznění shody, počet výsledků, loading stav, ARIA atributy, podpora dlouhých názvů
- **Substring vyhledávání uvnitř názvů zastávek** — word-based prefix index; „Zahradní město“ najde i „Brandýs nad Labem-St. Boleslav, Zahradní Město“

### Změněno
- **Předpočítaný index našeptávače** — místo ~36k normalizací při každém dotazu lookup do `Map`

### Opraveno
- **Race condition v našeptávači** — `finally` abortnutého fetchi přepisoval loading stav nového dotazu; opraveno flagem `isCurrent`

## [1.5.1] - 2026-02-05

### Opraveno
- **Duplicitní obory v simulátoru** — nové pole `zamereni` v interface School a jeho zobrazení v kartách; řeší identicky se tvářící pobočky (např. Akademie pedagogická Kolín — Brno/Jihlava/Karviná)

## [1.5.0] - 2026-02-05

### Přidáno
- **UX/UI audit** (`AUDIT.md`) a mobilní card view pro Top 50 škol na /skoly a Top 10 nejtěžších oborů na /regiony

### Změněno
- **Numerická klávesnice v simulátoru** (`inputMode="numeric"`); footer pro tablety

### Opraveno
- **Stránka jak-funguje-prijimani** — doplněny Header/Footer, breadcrumb, responsivní SVG diagram

## [1.4.0] - 2026-02-05

### Přidáno
- **Hamburger menu v hlavičce** pro mobilní navigaci
- **Stránka /changelog** s historií verzí; z patičky odkaz na changelog a GitHub repozitář

### Změněno
- **Mobilní responsivita simulátoru** — responsivní layout tlačítek délky studia, dvouřádkové karty škol, zkrácené texty priorit; kompaktní legenda v přehledu regionů

## [1.3.0] - 2026-02-04

### Přidáno
- **Nová dvoustupňová struktura stránek škol** — přehled školy s kartami všech oborů/zaměření + samostatné stránky pro každý obor a zaměření s vlastními statistikami a breadcrumbs
- **Navigace mezi obory pomocí tabů** — komponenta ProgramTabs, plné české názvy typů škol („Čtyřleté gymnázium“ místo „GY4“)
- **Stránka „Jak vybrat školu a uspět u přijímaček“** — průvodce: strategie 1./2./3. volby, příprava, rady pro den zkoušky; varování o extra bodech za prospěch (až 30 % hodnocení může tvořit prospěch/olympiády/školní zkouška, která v databázi není)
- **Aliasy pro PORG pobočky ve vyhledávání** — „PORG Libeň“, „PORG Ostrava“, „Nový PORG“; sekce „Pobočky škol“ ve výsledcích
- **Bezpečnostní audit a optimalizace bandwidth** — path traversal ochrana a validace ID v API; security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy); rate limiting 100 req/min/IP; nové API `/api/schools/search` se server-side filtrováním — simulátor místo jednoho 5,1 MB JSON fetche stahuje jen relevantní data (typicky <50 KB, odhad úspory ~51 GB/měsíc); cache headers pro statická data

### Změněno
- **Zobrazení všech zaměření školy v tabech** (`getProgramsByRedizo`) — každý tab nese kapacitu a minimální body

### Opraveno
- **Duplicitní názvy oborů** — u škol s obory stejného názvu a různé délky se přidává délka v závorce; duplicitní URL řeší `createSlug()` s argumentem délky (`gymnazium-4lete` vs `gymnazium-6lete`)
- **Navigace oborů — KKOV vs. zaměření** — různé KKOV kódy = klikatelné taby na samostatné stránky; zaměření v rámci jednoho KKOV = informační taby

## [1.2.0] - 2026-01-29

### Přidáno
- **Vyhledávání škol na titulní stránce a /skoly** — sekce „Najdi svou školu“ s komponentou `SchoolSearch`
- **Analýza kohort přijatých studentů** — sekce „Profily přijatých studentů“ s 9 kohortami (výborní/dobří/slabší × matematik/vyvážený/humanitní); Z-score normalizace pro férové srovnání ČJ a MA testů (MA v průměru o 8,2 bodu těžší); `public/cohort_meta.json`

### Opraveno
- **Převod JPZ z procentních skórů na skutečné body** — data CERMAT jsou 0–100 %, test má max 50 bodů za předmět; převod při načítání, odstraněno násobení ×2 v simulátoru
- **Minimální body JPZ ze skutečných raw dat** — místo součtu nezávislých minim (mohlo jít o dva různé studenty) body skutečného studenta s nejnižším JPZ (`jpz_min_actual`, `cj_at_jpz_min`, `ma_at_jpz_min`); současně zásadní zmenšení `public/schools_data.json` (−261 233 řádků, raw data uchazečů odstraněna z klientem stahovaného JSON)
- **Tabulka regionů** — sloupce „Body min“ a „Body průměr“ místo „Skóre“; rozklad pod minimem ukazuje ČJ/MA skutečného studenta
- **Simulátor** — používá čisté `jpz_min` (max 100) místo celkového skóre včetně extra kritérií

## [1.1.0] - 2026-01-25

### Přidáno
- **Rozšíření simulátoru a srovnávací karty škol** — drag & drop řazení vybraných škol (`@dnd-kit`); karty srovnání s konkurenčními školami, JPZ body a zaměřením; API `src/app/api/school-details/[id]/route.ts`; komponenty `RegionSchoolsTable.tsx` a `SchoolSearch.tsx`; „profil náročnosti“
- **Open Graph obrázky pro sociální sítě** — dynamické OG přes `ImageResponse` (1200×630) pro hlavní stránku, simulátor a regiony

### Změněno
- **Přesun URL regionů** — `/region/[kraj]` nahrazen za `/regiony/[kraj]`; sjednocená terminologie „skóre vs body“

### Opraveno
- **Zobrazení souvisejících škol** — každá škola na vlastním řádku, deduplikace s agregací počtů uchazečů, řazení sestupně
- **Zobrazení konkurenčních škol** (`overlap_count`), Suspense boundary pro `useSearchParams` (Next.js 16)

## [1.0.0] - 2026-01-24

### Přidáno
- **Inicializace projektu z Create Next App** — Next.js, TypeScript, Tailwind CSS, ESLint
- **Migrace na Next.js 16 s App Router a SEO URL** — stránky `/`, `/simulator`, `/skoly`, `/regiony`, `/region/[kraj]`, `/skola/[slug]`; statická generace 2 276 stránek, `sitemap.xml` s 2 500+ URL, `robots.txt`, dynamické Open Graph meta tagy; Vercel Analytics; data `public/school_analysis.json` a per-školní JSON v `public/school_details/`
- **Detail školy a přehled** — vizuální graf rozložení priorit, sekce „kam se hlásí ostatní uchazeči“, další obory školy; délka studia a kategorie v přehledu; stránka `/jak-funguje-prijimani`
- **Konfigurace nasazení** — `vercel.json`
