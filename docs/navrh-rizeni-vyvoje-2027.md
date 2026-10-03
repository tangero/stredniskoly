# Řízení vývoje: směr určuje člověk, provedení a přehled zajišťuje AI

Verze 0.13a · 3. 10. 2026 · **část A ke schválení hned, část B k rozhodnutí podle měřítek.**
Stav zavedení: fáze 0 hotová, brána sloučení je v `main` a zatím nic neblokuje (postup v
[postup-zavedeni-faze-0.md](postup-zavedeni-faze-0.md)).

## Shrnutí pro rozhodnutí

**Co dělá Patrick:**

- určuje směr: na briefingu s asistentem zadání v Grok Bot (po, st, pá v 7:55 a průběžně) nebo na
  GitHubu (štítky, review a komentáře, i z bočního panelu v GitHub Projects); obě cesty platí stejně;
- rozhoduje pět druhů věcí: rozesílání nevyžádaných e-mailů a informací, uvolnění pravomocí AI,
  právní závazky, výdaje nad limit, strategické projekty;
- na briefingu slyší nejvýš **3 nápady AI**, seřazené podle kvality, a potvrzuje zápisy **jedním „ok“
  na konci**;
- volitelně zastaví cokoli štítkem `stop` nebo větou na briefingu;
- jednorázově smaže revizi #53 (fáze 0) a v rulesetu zapne bránu a vypne obejití (fáze 1);
  celkem asi 10 minut. AI pracuje pod účtem vlastníka, žádné další účty ani aplikace nevznikají.

**Co dělá AI:** opravy, drobné úpravy, etapy projektů a malé projekty od zadání po nasazení: realizace,
ověření na Vercel preview, merge přes automatickou bránu. Rizikové věci (migrace, nová data, výdaje do
limitu, e-maily odběratelům) navíc kontroluje druhý, nezávislý model. AI hlídá rozpočet na tokeny
a výdaje, posílá týdenní přehled a hlásí jen výjimky.

**Co tím odpadne:** schvalování drobných zadání, kontrola na preview a merge u zhruba 20 PR týdně,
odpovídání na dotazy v issues, obnova většiny tokenů.

**Co je potřeba schválit:** část A jako celek (rozhodnutí RA1 až RA36 v oddílu 21). Část B se rozhodne
po čtyřech týdnech provozu podle měřítek.

**Zavedení po fázích podle přínosu** (oddíl 20): fáze 1 odstraní merge a kontrolu preview, fáze 2 přidá
druhý klíč, migrace, výdaje, nová data a zápisy z briefingu.

**Bezpečnost hned (fáze 0):** produkční secrets se přesunou do prostředí dostupného jen z `main`, protože
dnes je kód z jakékoli větve spouští s nasazovacím tokenem (oddíl 9b).

**Přijímané riziko:** chyba může být na webu, než si jí někdo všimne; pojistkou jsou automatické
kontroly, druhý model, rychlé vrácení a zamrznutí v kritických dnech (oddíl 22).

Podklad: audit [Oblasti, projekty a etapy na GitHubu](historie/github-oblasti-audit-2026-10-03.md)
(3. 10. 2026). Z něj návrh přebírá soupis oblastí s cestami v kódu, nalezené duplikáty a zařazení
otevřených issues. Model ve třech úrovních z auditu (oblast jako trvalé issue → projekt jako sub-issue
→ etapy) návrh ruší a nahrazuje štítky (RA1). Oponentury a doplňky jsou v PR #273.

## 1. Cíl a princip

Patrick určuje směr a rozhoduje jen to, co AI rozhodnout nesmí nebo nemá. Všechno ostatní dělá AI
od zadání po nasazení, včetně migrací, nových dat a výdajů do limitu. Patrick přitom má přehled, na čem
se pracuje, jak se to vyvíjí a v jakém stavu projekt je.

**Vlastník projektu výslovně přijímá vyšší riziko a větší pravomoci AI výměnou za méně lidských vstupů**
(zadání k verzím 0.4 a 0.6). Jedinou výslovnou výjimkou je rozesílání nevyžádaných e-mailů a informací,
které schvaluje vlastník.

Princip:

- **Člověk rozhoduje pět druhů věcí** (oddíl 3). Ostatní rozhoduje AI s mechanismem úměrným riziku.
- **Příprava je oddělená od provedení** (oddíl 9b): kód z větve nikdy neběží s produkčním oprávněním;
  produkční operace provádí jen důvěryhodný automat nad sloučenou a ověřenou verzí.
- **Pojistky jsou mimo AI:** ruleset a brána sloučení, limit karty v bance, záloha databáze v Neonu,
  stropy v kódu. AI je nemůže přesvědčit ani obejít.
- **Druhý klíč místo lidského veta:** nezávislý AI kontrolor smí zastavit rizikovou změnu (oddíl 6).
  Vlastník veto má, ale nemusí lhůty sledovat.
- **Rychlé vrácení** (revert, rollback ve Vercelu, obnova databáze k okamžiku) a přehled po faktu.

Části:

- **Část A, ke schválení hned** (oddíly 2–22).
- **Část B, podle měřítek** (konec dokumentu).

## 2. Role a identita

**Asistent zadání má vlastní účet, ostatní pracují přes účet vlastníka** (rozhodnutí vlastníka z 3. 10.
2026, RA35 a RA36). Eduarda používá účet `eduarda-prijimacky`; Claude Code, boti pro review a vývoj
i automatika ve skriptech používají přihlášení vlastníka. GitHub App pro AI nevzniká. Vlastník riziko
sdíleného účtu považuje za malé a jiné řešení by mu přidalo práci.

| kdo | identita | dělá |
|---|---|---|
| **Patrick** (vlastník projektu) | jeho účet na GitHubu; na briefingu jeho soukromý chat v Grok Bot (oddíl 18) | Směr vývoje, rozhodnutí z oddílu 3, volitelně veto `stop` |
| **Eduarda** (AI asistent) | vlastní účet `eduarda-prijimacky` (Linux s Grok Bot) | vede briefing, zapisuje z něj rozhodnutí, přijímá hlášení e-mailem a z portálu, píše zadání a oponentury |
| **Claude Code** | účet vlastníka | třídí, realizuje, review, ověření na preview, merge přes bránu, přehled, provoz |
| **Druhý klíč** | workflow v Actions s jiným modelem, `GITHUB_TOKEN` | nezávisle kontroluje rizikové PR a smí přidat `stop` (oddíl 6) |
| **automatika** | `GITHUB_TOKEN`, tokeny vlastníka v secrets | štítky oblastí, brána sloučení, CI, tabule |

**Proti čemu pojistky chrání a proti čemu ne.** Pojistky v tomto návrhu chrání před **chybou AI** a před
**podvrženým vstupem zvenku** (veřejné hlášení, e-mail): brána sloučení, režimy, lhůty, protokol
z preview, druhý klíč, zamrznutí, `stop` a rychlé vrácení. Na identitě nezávisí. Navíc brána uznává `schvaleno` jen
z účtu vlastníka (`vlastnik` v `rezimy.yml`) a `stop` odebraný jiným účtem, než který ho přidal, dál
platí; u asistenta zadání se to tak vynucuje technicky. **Nechrání před AI s účtem vlastníka, která by
se za něj úmyslně vydávala:** Claude Code může přidat `schvaleno` nebo změnit ruleset. Vlastník toto
riziko přijímá. Proti němu zůstávají jen pravidla níže, druhý klíč a kontrola zpětně.

**Jak se pozná rozhodnutí vlastníka.** Podle autora jen částečně: Eduardu autor odliší, Claude Code
a ostatní boti mají autora vlastníka. Platí:

- AI každý svůj komentář podepisuje patičkou („Generated by Claude Code“, podpis asistenta zadání).
  Komentář s patičkou se za rozhodnutí nepočítá.
- **AI nikdy nepřidává `schvaleno` ani `zamitnuto`, neodebírá `stop` a nemění ruleset ani nastavení
  repozitáře.** Výjimka od fáze 2: `schvaleno` podle potvrzeného zápisu z briefingu (oddíl 18) s odkazem na zápis.
- Rozhodnutí vlastníka je štítek nebo komentář bez patičky, nebo potvrzený zápis z briefingu.
- **Kontrola zpětně:** týdenní přehled vypíše všechna `schvaleno`, `zamitnuto`, odebrané `stop`
  a změny nastavení za týden, u každého s původem (briefing, nebo štítek vlastníka). Co si vlastník
  nevybaví, vrátí.

**Ruleset bez obejití** (RA15). Seznam těch, kdo smí ochranu `main` obejít, je prázdný. Sloučit jde jen
přes povinné kontroly a bránu, i pod účtem vlastníka; brána tak zachytí chybu AI i při merge pod jeho
účtem. Povinné review ani review vlastníka kódu se nevyžaduje: PR jsou pod účtem vlastníka a vlastní PR
schválit nejde. Vlastník v nouzi dočasně upraví ruleset a AI to zapíše do přehledu.

**Nouzová oprava:** když CI padá z vnějšího důvodu (výpadek zdroje dat nebo služby) a nesloučí se ani
revert, vlastník dočasně vypne dotčenou kontrolu v rulesetu, AI to zapíše do přehledu a po opravě
kontrolu hned vrátí a ověří, že je zpět.

**Vlastník rozhoduje dvěma rovnocennými cestami** (RA28): na GitHubu (štítek nebo komentář bez patičky,
i z bočního panelu v GitHub Projects; samotný přesun karty se nepočítá) a na briefingu v Grok Bot
(oddíl 18). Obě cesty se zapisují do stejného rejstříku návrhů. Když si odporují, platí novější;
rozpor do 24 h zařadí asistent na nejbližší briefing a do té doby platí zastavující varianta.

# Část A

## 3. Co rozhoduje člověk

Jen těchto pět druhů rozhodnutí:

| | rozhodnutí | proč člověk |
|---|---|---|
| H1 | **Rozesílání nevyžádaných e-mailů a informací:** oslovení škol (pozvánky do portálu), dopisy pořadatelům veletrhů, tiskové zprávy a oslovení novinářů, jakákoli zpráva lidem, kteří si o ni neřekli | výslovná podmínka vlastníka; reputační a právní riziko (obchodní sdělení), nevratné |
| H2 | **Uvolnění pravomocí AI:** změna brány sloučení, rulesetu, nastavení repozitáře, pravidel v `CLAUDE.md`, která hranice rozšiřují | AI by si jinak rozšiřovala vlastní práva |
| H3 | **Právní závazky vůči třetím stranám:** nový zpracovatel osobních údajů nebo nová kategorie osobních údajů, zdroj za přihlášením, se smlouvou nebo nejasnou licencí, podmínky užití se závazkem | odpovědnost provozovatele (GDPR, licence) nese vlastník, ať rozhodla AI nebo ne |
| H4 | **Výdaje nad limit karty a roční závazky** | finanční riziko nad nastavený strop |
| H5 | **Směr vývoje a strategické projekty:** cíle, priority, nové publikum, partnerství, nový produkt | o směru rozhoduje vlastník |

Plus jednorázové nastavení (oddíl 20). Rozhodnutí o směru může vlastník dělat i na briefingu
(oddíl 18). Dávku H1 AI připraví celou (příjemci, text, ukázky, odhad dopadu)
a vlastník ji schválí jedním klepnutím.

## 4. Režimy rozhodování AI

Všechno mimo oddíl 3 rozhoduje AI v jednom z pěti režimů. Režim určuje brána podle cest v PR
(`.github/rezimy.yml`) a podle typu činnosti. **Tato tabulka je jediné závazné místo pro lhůty
a podmínky sloučení;** ostatní oddíly na ni odkazují, a kdyby se s ní rozcházely, platí tabulka
(s výjimkou specifického mechanismu z oddílu 5 podle odstavce pod tabulkou):

| režim | kdy | podmínky sloučení nebo provedení |
|---|---|---|
| **R, rutina** | oprava rozporu z vlastních dat nebo kódu (oddíl 7) | CI, review, protokol z preview; hned. Rutina z veřejného hlášení navíc druhý klíč a 24 h (chybu musí AI sama vyvolat nebo ověřit proti zdroji; jinak jde o zadání v režimu K) |
| **L, lhůta** | drobné zadání, nový projekt z iniciativy AI v mezích mandátu, změna rozsahu projektu uvnitř mandátu (oddíl 8) | CI, review, protokol; po 48 h bez `stop` |
| **E, etapa** | etapa projektu v dohodnutém rozsahu a mandátu (oddíl 10) | CI, review, protokol; hned po kontrolách, bez další lhůty |
| **K, kontrolovaný** | rizikové činnosti z oddílu 5 | CI, review, protokol, **druhý klíč bez námitky**, **specifický mechanismus z oddílu 5**, upozornění vlastníkovi; po 72 h bez `stop` |
| **H, člověk** | oddíl 3 | `schvaleno` od vlastníka vázané na zaznamenaný rozsah (oddíl 9a); **navíc všechny technické podmínky dotčené činnosti** z ostatních řádků |

Vždy platí: `stop` sloučení zablokuje **bez výjimky**. Zamrznutí ho zablokuje také, kromě incidentního
postupu (oddíl 9c), který ruší jen kalendářní zamrznutí, nikdy `stop`.
**Podmínky se při souběhu sčítají (O4):** lidské rozhodnutí dává oprávnění činnost provést, neruší její
technické podmínky. Schválená H3 migrace tedy dál potřebuje větev Neonu, druhý klíč a bezpečnostní
kontrolu; souhlas ruší nejvýš čekací lhůtu.
**Specifický mechanismus v oddílu 5 má přednost před obecnou lhůtou režimu K:** kde řádek oddílu 5
uvádí jinou lhůtu (například přidávající migrace hned po druhém klíči), platí ta.

## 5. Rozbor rozhodnutí a mechanismy

Riziko špatného rozhodnutí: **N** nízké, **S** střední, **V** vysoké. Typ: **R** reputační, **F** finanční,
**D** ztráta času nebo dat, **P** ztracená příležitost.

| # | rozhodnutí | riziko | režim | mechanismus a limity |
|---|---|---|---|---|
| 1 | migrace a zápis do produkční DB (`db/migrace/`, `scripts/*-migrace.mjs`) | D **V**, R S | K | nejdřív na větvi databáze v Neonu (kopie produkce): porovnání počtů řádků a schématu, opakované spuštění; přidávající změny (`if not exists`) po druhém klíči hned, mazající a přepisující jen s bodem obnovy a limitem dotčených řádků; před spuštěním na produkci záznam času pro obnovu k okamžiku |
| 2 | exporty z produkce do repozitáře (`portal:export`, `veletrhy:export`) | N | R | jen čtou z produkce; AI je smí pustit kdykoli |
| 3 | nový cizí server, nová data | R S, F N | K | politika přístupu: `robots.txt`, podmínky užití přečtené a shrnuté AI, bez přihlášení, bez osobních údajů, nejvýš 1 dotaz za sekundu, User-Agent s kontaktem, denní strop dotazů, konec při 429; ohlášení do issue zůstává (pravidlo 7) a nahrazuje schválení; státní otevřená data (MŠMT, CERMAT, ČŠI) jako R; zdroje se závazkem jsou H3 |
| 4 | placená služba, API, vyšší tarif | F S | K | virtuální karta s tvrdým měsíčním limitem a limitem na platbu; rozpočet ve Směru vývoje; odůvodnění v issue; výdaj se zapíše do Fakturoidu; nevyužité předplatné AI do 30 dnů zruší; nad limit H4 |
| 5 | vyžádané e-maily: potvrzení odběru, přihlašovací odkaz, novinky odběratelům (`src/lib/novinky-*`, `portal-email.ts`, `src/app/api/novinky/`) | R **V** (nevratné, tisíce adres) | K | kouřová zkouška (`novinky-kourova-zkouska.ts`), odeslání na testovací schránku, porovnání vykresleného e-mailu se starou verzí, rozpočet odesílání (`novinky-rozpocet.ts`); první rozeslání po změně jen na 5 % příjemců s kontrolou před zbytkem (**ověřit, že to odesílač umí, jinak doplnit**) |
| 6 | nevyžádané e-maily a informace | R **V** | H1 | AI připraví dávku, vlastník schválí |
| 7 | portál, přihlášení, osobní údaje (`src/app/api/portal*`, `src/lib/portal-*`, `src/app/admin/`) | R **V**, právní **V** | K | bezpečnostní review (`security-review`) a druhý klíč, automatické testy přihlášení a práv, skener závislostí; nová kategorie osobních údajů nebo zpracovatel je H3 |
| 8 | nasazení a crony (`vercel.json`, `next.config.ts`, `scripts/vercel-deploy.sh`) | D S, F S | K | AI odhadne náklady změny; cron, který rozesílá e-maily, spadá pod řádek 5 |
| 9 | adresy a SEO (přesměrování, smazání nebo přejmenování stránky, `robots.ts`, `public/sitemap.xml`) | P **S** | K | automat ověří přesměrování 301 u každé zrušené adresy, porovná sitemap a z Matomo zjistí návštěvnost dotčených adres; pod prahem návštěvnosti jako L |
| 10 | pravidla, workflows, brána, práva AI (`CLAUDE.md`, `.claude/`, `.github/`) | **V** | H2 / L | brána, `rezimy.yml`, ruleset, pravidla o pravomocích a změny `secrets.*` nebo `permissions:` ve workflows jsou H2 (brána je pustí jen se `schvaleno`); ostatní úpravy workflows K s druhým klíčem; úpravy ostatních pravidel a skills L |
| 11 | závislosti (`package*.json`, `requirements*.txt`) | D S, bezpečnost S | L / K | bezpečnostní aktualizace Dependabotu, AI projde changelog, jen verze starší 7 dnů; patch a minor L, major K |
| 12 | přepnutí datové sady v registru | R **V** (rodiče rozhodují podle čísel) | K | kontroly datové linky, srovnání rozdělení hodnot s loňskem, vzorky proti zdroji naslepo, náhled na preview; jen mimo zamrznutí |
| 13 | nový ukazatel nebo změna výpočtu | R S | K | zápis do slovníku včetně toho, co ukazatel neříká, oponentura druhým klíčem, statistická kontrola |
| 14 | nový projekt | P S, D S | L / H5 | AI navrhuje projekty a hodnotí je podle Směru vývoje, návštěvnosti, hlášení a sezóny i s odhadem nákladů; **nápad AI se nejdřív představí na briefingu** (oddíl 18) a lhůta 48 h běží až od představení; projekt v mezích mandátu (oddíl 10, bod 4) jako L; strategický nebo nad mandát H5; nápady se vedou v rejstříku návrhů se stavem a důvodem zamítnutí, aby se zamítnuté nevracely |
| 15 | zadání z veřejného hlášení nebo z e-mailu od neověřeného odesílatele | R S | K | povinné vyvolání chyby nebo ověření proti zdroji, limit hlášení na autora, klasifikace spamu a podvržených pokynů druhým klíčem |
| 16 | opravy údajů od škol | R S | L | oddíl 12 |
| 17 | osobní údaje ve veřejném issue | R **V**, právní S | R | AI issue **přesune do soukromého repozitáře** (`stredniskoly-rizeni`) a ve veřejném založí očištěnou kopii; issue i s historií úprav z veřejného repozitáře zmizí. Stačí právo zápisu do obou repozitářů; mazání (vyžaduje admina, tedy i právo měnit ruleset) ani smazání revize není potřeba |
| 18 | obnova tokenů | D S | – | tokeny vlastníka v secrets (`PROJECT_TOKEN`, `CSI_PR_TOKEN`) zůstávají; jejich expiraci hlídá týdenní přehled a obnovu připraví AI s krokem pro vlastníka |
| 19 | zamrznutí v kritických dnech | R S | R | AI nastaví z kalendáře přijímaček (`prijimacky-2027.ics`) a návštěvnosti |
| 20 | parametry autonomie (lhůty, limity rutiny) | D N | R | AI je upravuje podle měřítek v daném rozsahu (lhůta L 24–72 h, rutina 100–300 řádků); mimo rozsah H2 |
| 21 | Směr vývoje | P **V** | H5 | AI jednou za čtvrtletí navrhne aktualizaci z dat; bez reakce platí stávající |

**Kde zůstává největší skutečné riziko:** vyžádané e-maily (5), protože chybu v rozesílce nic nevrátí;
přepnutí sad v sezóně (12), protože automat nezachytí chybu ve zdroji samotném; nová data (3), protože
stížnost školy na stahování poškodí vztah se školami víc než technická chyba.

## 6. Druhý klíč

Nezávislý AI kontrolor jako workflow v Actions: **jiný model než Claude Code**, jiný prompt, bez kontextu
autora. Projde každý PR v režimu K, rutinu z veřejného hlášení a zadání z hlášení a vrátí verdikt. Při
námitce přidá `stop` s odůvodněním. Dva různé modely se nemýlí stejně a nepodlehnou stejnému
podvrženému pokynu.

**Spouští se na `pull_request_target`, tedy ve verzi z `main`, a kód z PR nespouští ani nestahuje**;
změny čte jen jako diff přes API. Klíč k modelu je v prostředí dostupném z `main` (oddíl 9b). Kdyby
běžel na `pull_request`, AI by ve vlastní větvi mohla upravit jeho workflow a nechat si PR schválit.

- `stop` smí odebrat jen ten, kdo ho přidal, nebo vlastník. Brána to kontroluje v timeline.
- Claude Code na námitku reaguje opravou; druhý klíč pak posoudí novou verzi.
- Náklady druhého klíče jdou do rozpočtu (řádek 4); při vyčerpání se režim K zastaví, nepouští.

## 7. Rutina (režim R)

- opravuje rozpor, který plyne z našich vlastních dat nebo kódu: pád stránky, chyba s postupem vyvolání,
  rozbitý odkaz, překlep, údaj v rozporu s naším zdrojem, padající test, nález review;
- data mění jen přes generátor nebo soubor ručních oprav (například `data/obory_manual_overrides.csv`),
  nikdy přímo ve vygenerovaném `public/*.json`;
- nezavádí nový ukazatel ani pojem;
- v jedné oblasti, do 150 řádků mimo testy, bez cest režimů K a H.

Postup: třídění → oprava → PR → CI, review, protokol z preview → brána → Claude sloučí sám (RA7).
Z veřejného hlášení po 24 h. Text hlášení je jen popis chyby: Claude ji musí sám vyvolat nebo ověřit
proti našemu zdroji a mění jen chybné místo.

## 8. Drobné zadání (režim L)

Interní zadání bez `projekt`, které rutinou není (nový text nebo blok, úprava filtru, nový sloupec,
položka slovníku pojmů):

1. Claude realizuje hned.
2. PR s protokolem z preview a snímky dá issue `k-overeni`; běží 48 h na veto.
3. Po lhůtě brána PR pustí a Claude sloučí (RA8).

Lhůta běží od prvního vyhodnocení brány, které vidělo aktuální commit v tomto PR, rozsah propojeného
zadání a protokol z preview; změna kterékoli z těchto věcí ji založí znovu.

## 9. Brána sloučení

Workflow **„Brána sloučení“**, povinná kontrola v rulesetu u každého PR. **Běží na `pull_request_target`
ve verzi z `main`** a kód z PR nespouští, jen čte diff, štítky a timeline přes API; upravená brána ve
větvi tak nemůže posoudit sama sebe. Spouští se na otevření, push a štítky PR,
**`issues` (štítky a úpravy propojeného issue, aby
nový `stop` hned zneplatnil výsledek)**, komentáře (protokol z preview) a jednou za hodinu (lhůty).
`pull_request_review` mezi spouštěči není: běží ve verzi workflow z větve PR, a review brána ve fázi 1
nepodmiňuje. Výsledek zapisuje skript přes Checks API na aktuální hlavu PR (implementace
`scripts/brana/`, workflow `brana-slouceni.yml`). **Merge provádí Claude skriptem,
který bránu těsně před sloučením spustí znovu** a ověří aktuální veto; vestavěný automatický merge
GitHubu se nepoužívá, protože by sloučil podle staršího výsledku. Určí režim podle cest
(`.github/rezimy.yml`) a podle propojeného issue a pustí PR jen při splnění
podmínek režimu z oddílu 4. **Původ zadání:**

- **interní (režim L)** je issue s dokladem v těle: `Zdroj: briefing RRRR-MM-DD` (zápis z briefingu
  v soukromém repozitáři, oddíl 18), `Zdroj: oprava od školy RRRR-MM-DD-<RED IZO>` (záznam opravy,
  oddíl 12), nebo `Zdroj: vlastník` (zadání, které vlastník napsal sám);
- **režim K** je issue, které vzniklo z veřejného hlášení (štítek `bug-report`, `portal-skoly`,
  `feature-request` nebo `puvod:hlaseni`) nebo z e-mailu od neověřeného odesílatele (`puvod:email`),
  a každé issue bez dokladu.

Repozitář je veřejný, proto brána **doklad uzná jen v issue, které založil vlastník nebo asistent zadání**
(`vlastnik` a `asistent` v `rezimy.yml`), **protokol z preview jen od nich nebo od `github-actions[bot]`**
a **PR jiného autora** (fork, Dependabot, cizí účet) posuzuje jako PR bez zadání, tedy jen se `schvaleno`
na PR. Mezi účtem vlastníka a AI, která přes něj pracuje, brána nerozliší (RA35).

Vždy selže při `stop` na PR nebo propojeném issue, a to i u PR se štítkem `incident`. Při zamrznutí
(proměnné repozitáře `ZAMRZNUTI_OD`/`ZAMRZNUTI_DO`) selže také, kromě incidentního postupu (oddíl 9c).
`stop` na PR se zároveň přenese
na propojené issue, aby byl vidět ve frontě. Ruleset dnes vyžaduje nula schválení a tři kontroly CI;
bez brány by identita s právem merge sloučila cokoli.

**Výsledek brány** vydává workflow brány z `main` (`pull_request_target`, `GITHUB_TOKEN`) a ruleset ho
vyžaduje od zdroje GitHub Actions. Jiné workflow s právem `checks: write` by mohlo vydat úspěch pod
stejným názvem; protože do repozitáře zapisuje jen účet vlastníka, je to stejné přijaté riziko jako
v oddílu 2 a samostatná aplikace brány se nezakládá.

## 9a. Souhlas vázaný na obsah

Rozhodnutí přes GitHub platí jen pro **rozsah, který vlastník viděl** (O2). Chrání to před chybou, kdy
se rozsah změní po schválení; před úmyslným obejitím ne (oddíl 2):

- **otisk schvalovaného rozsahu** (oddíl „Rozsah“ v těle issue: cíl, mandát, u rozesílky příjemci
  a text, u výdaje částka a dodavatel) uloží workflow brány **už ve chvíli, kdy AI přidá `navrh`**;
  při přidání `schvaleno` brána ověří, že se od té doby nezměnil, takže AI nemůže upravit rozsah těsně
  před klepnutím vlastníka. Pozdější změna rozsahu otisk zneplatní a věc se vrátí do fronty s `navrh`;
  běžné úpravy mimo oddíl „Rozsah“ souhlas nemění;
- doklad z briefingu (oddíl 18) má otisk už dnes.

Přejímka: schválit dávku A, změnit příjemce nebo text na B; B bez nového souhlasu neprojde.

## 9b. Oddělení přípravy od provedení

Brána hlídá merge, ale některé účinky nastávají dřív. **Doložená cesta v dnešním kódu:** workflow
`testy.yml` po pushi do jakékoli větve spouští nasazovací job se skriptem `scripts/vercel-deploy.sh`
z té větve a s `VERCEL_TOKEN` (proměnná `VERCEL_ACTIONS_ENABLED` je zapnutá). Změněný skript nebo
workflow ve větvi tak získá nasazovací token před merge; kontrola „produkce jen z `main`“ je ve stejném
měnitelném skriptu a CODEOWNERS tomu nezabrání. Stejně jsou dnes z větve dosažitelné všechny secrets
na úrovni repozitáře. Riziko existuje už dnes, s autonomií AI roste.

Pravidla (RA29, fáze 0):

- **Produkční secrets jen v prostředí (GitHub Environments) s omezením na větev `main`:** `VERCEL_TOKEN`,
  přístup k databázi, klíče pro rozesílání, platby, Telegram. Na úrovni repozitáře nezůstane nic citlivého.
- **Preview bez produkčního oprávnění:** z větve se jen sestaví výstup bez secrets; nasazení náhledu
  provede důvěryhodný workflow z `main` (`workflow_run`) nad hotovým výstupem, nebo Vercel z vlastního
  napojení na Git. Kód z větve se se secrets nespustí.
- **Produkční operace provádí automat z `main` nad konkrétní ověřenou verzí:** migrace, rozesílání,
  výdaje a přepnutí sad spouští workflow definovaný v `main`, který ověří sloučený commit, výsledek brány
  a podmínky z oddílu 5. AI operaci připraví (PR, plán, parametry), provede ji automat.
- Nevyžaduje to další lidské schvalování.

## 9c. Incidentní postup při zamrznutí

Během zamrznutí běžný vývoj stojí, ale obnova provozu ne. Bez vlastníka smí AI:

- zastavit rozesílání (vypínač odesílače),
- vrátit poslední ověřenou verzi (revert PR, rollback ve Vercelu),
- opravit chybu, která web shodila nebo ukazuje chybná data, v rozsahu rutiny.

Podmínky: automatická kontrola výsledku (stránky odpovídají, data sedí s předchozí ověřenou verzí),
okamžité upozornění vlastníkovi a záznam v přehledu. Brána tyto PR pozná podle štítku `incident`
a ověří, že mění jen to, co postup dovoluje.

**Incident ruší jen kalendářní zamrznutí, nikdy veto.** PR nebo issue se `stop` zůstane zablokované
i se štítkem `incident`; jinak by AI mohla veto obejít tím, že změnu sama označí jako incident.
Zastavení rozesílání vypínačem a rollback ve Vercelu nejsou PR a brána je neblokuje; jsou povolené vždy.

## 10. Projekty

Životní cyklus (RA4):

1. **Nápad:** issue `[Zadání]` se štítky `interni`, `projekt`, `oblast:<slug>`, bez `navrh`.
2. **Rozbor** v komentářích téhož issue; dokument v `docs/` jen u velkých věcí.
3. **Zadání přepsané do těla issue**, oponentura volitelná.
4. **Start a mandát:** zadání projektu vymezuje **cíl, rozpočet celého projektu** (tokeny a výdaje),
   **dopad** (dotčené oblasti a stránky, kdo změnu uvidí) a **vratnost** (co nejde vrátit revertem).
   Projekt z iniciativy AI v mezích mandátu startuje po 48 h od představení na briefingu bez `stop`
   (režim L). Strategický projekt (H5) a **cokoli nad mandát** potřebuje `schvaleno`. **`navrh` dostane
   ve chvíli, kdy je podklad k rozhodnutí hotový** (O5), a ztratí ho po schválení nebo zamítnutí; tak je
   ve frontě „Rozhoduji“ právě po dobu, kdy čeká na vlastníka.
   **Současně nejvýš 2 rozpracované projekty z iniciativy AI**; rozdělením do menších projektů nebo PR
   se limit neobchází (počítá se rozpočet a dopad, ne počet etap).
5. **Etapy jako checklist**, jedna etapa = jedna větev `zadani/<N>-etapa-<M>-…` a jeden PR „Souvisí s #N“.
   Změna zadání = úprava těla + komentář „Změna zadání: co a proč“ + řádek v changelogu na konci těla.
6. **Etapa v dohodnutém rozsahu se slučuje hned po kontrolách** (režim E), bez další lhůty; když sahá
   na cesty režimu K, platí K. **Změna rozsahu uvnitř mandátu** (cíl, rozpočet, dopad a vratnost zůstávají
   v mezích) je úprava zadání v režimu L. **Překročení mandátu** potřebuje nové `schvaleno` bez ohledu na
   to, jestli se jmenuje rozšíření, nová etapa nebo nový projekt; rozhoduje dopad, ne pojmenování.
7. **Poslední PR nese jen „Souvisí s #N“.** Projekt zavře AI až po **ověření v produkci** (nasazeno
   a stránky na produkci splňují „Hotovo když“), ne samotným merge.
8. **Opravy po vydání:** komentář + PR „Souvisí s #N“.
9. **Druhá verze** je nový projekt.

Žádná nová issues pro úpravu zadání, oponenturu, opravu po merge ani další etapu. Sub-issues se
nepoužívají; hlášení, která projekt opravuje, se vypíšou v těle projektu a PR je zavírá přes `Closes`.

## 11. Ověření na preview dělá AI

Claude po nasazení preview projde každé kritérium „Hotovo když“ v prohlížeči (Playwright) na šířce
telefonu i počítače a do PR zapíše protokol (kritérium, adresa, splněno / nesplněno / nejde ověřit).
Komentář začíná nadpisem „Protokol z preview“ a obsahuje řádek `Commit: <prvních 7 znaků hlavy>`;
brána uzná jen protokol k aktuální hlavě a bez slova „nesplněno“. Změny jen v dokumentaci, testech
a nastavení (`bez_preview` v `rezimy.yml`) protokol nepotřebují.
U vizuálních změn přidá snímky před a po jako artefakt běhu nebo v komentáři PR. Protokol je podmínkou brány.
Předpoklady (fáze 1): secret `VERCEL_AUTOMATION_BYPASS_SECRET`, Playwright a přístup na `*.vercel.app`
v prostředí denní úlohy.

## 12. Hlášení, opravy od škol a osobní údaje

**Veřejná hlášení:** při třídění `oblast:<slug>`, duplikáty Claude zavře s odkazem a rozhodne: rutina,
zadání (režim K), součást projektu, nebo dotaz nahlašovateli. Odpovědi nahlašovatelům jsou vyžádaná
komunikace a dělá je AI.

**Opravy údajů od škol** přijímá asistent zadání z portálu pro školy (ověřený účet) a e-mailem z domény
školy uvedené v rejstříku škol s ověřeným odesílatelem: **DMARC v pořádku se shodou domén** (O6), tedy
doména v poli `From` je doména školy z rejstříku a SPF nebo podpis DKIM ověřily právě tuto doménu. Samotné
„SPF pass“ a „DKIM pass“ pro jinou doménu nestačí; takový e-mail zůstává neověřeným podnětem (režim K). Nejdřív uloží záznam
opravy do soukromého repozitáře (`opravy-skol/RRRR-MM-DD-<RED IZO>.md`: doména nebo záznam portálu,
výsledek SPF a DKIM, co se mění; bez jmen a adres), na který se odkáže doklad v zadání. Pak založí drobné zadání:
zápis do souboru ručních oprav se zdrojem „škola“, datem a RED IZO; dál režim L. Nový zdroj „oprava od
školy“ se ve stejné dávce zapíše do `docs/zdroje-dat.md`. E-maily ani jména odesílatelů do repozitáře
nepatří (pravidlo 4).

**Osobní údaje ve veřejném issue:** řádek 17 v oddílu 5.

## 13. Štítky

| štítek | význam |
|---|---|
| `projekt` | konečná práce s cílem a etapami; jediné, co jde sloupci tabule |
| `oblast:<slug>` (9×) | trvalá část produktu; issue má právě jednu oblast, PR jednu nebo víc |
| `rutina` | režim R |
| `stop` | veto vlastníka, druhého klíče nebo asistenta zadání podle briefingu; odebrat ho smí jen ten, kdo ho přidal, nebo vlastník |
| `trvale` | průběžná issue; vyřazená z tabule a třídění |
| `puvod:email` | zadání z e-mailu od neověřeného odesílatele; režim K |
| `incident` | oprava podle incidentního postupu při zamrznutí (oddíl 9c); brána ověří, že PR mění jen to, co postup dovoluje |

Beze změny `interni`, `schvaleno`, `zamitnuto`, `k-overeni`, `pripominka`, `nova-data`, `bug-report`,
`portal-skoly`, `feature-request`. **`navrh` znamená „čeká na vlastníka“** (RA2), tedy jen věci z oddílu 3.

## 14. Oblasti jako štítky

Devět oblastí (RA3), cesty v kódu podle auditu: `oblast:detail` (Detail školy a oboru), `oblast:prehledy`
(Vyhledávání a přehledy), `oblast:simulator` (Simulátor a Kde stojím), `oblast:dojezdy` (Dojezdové časy),
`oblast:novinky` (Novinky ze škol a e-mailový odběr), `oblast:veletrhy`, `oblast:portal`, `oblast:data`
(Data, termíny a inspekce ČŠI), `oblast:provoz` (Provoz, obsah, SEO, pro novináře a proces).
Issues dostanou oblast při třídění, PR přes `actions/labeler` na `pull_request`. Štítky u PR slouží
přehledu; brána podmínku „jedna oblast“ počítá sama z diffu podle `labeler.yml` z `main`, štítkům nevěří.

## 15. Tabule a fronta rozhodnutí

- **Auto-add:** `is:issue is:open -label:trvale`; vypnout „Auto-add sub-issues to project“; archivovat
  26 karet PR.
- **Pohled „Rozhoduji“:** `is:open label:navrh,stop -label:trvale`. Jen věci z oddílu 3 a zastavené změny.
- **Pohled „Běží“:** `is:open label:projekt,k-overeni`; fáze a blokace každé věci ukazuje přehled stavu (oddíl 16).
- **Pohled „Projekty“:** `label:projekt` podle Status.

Otázka na vlastníka má pevnou podobu (rozhodnutí, možnosti, doporučení, dopad, co se stane bez odpovědi).
Bez odpovědi se u věcí z oddílu 3 neprovede nic. U ostatních AI rozhodne sama; otázky, u kterých
by názor vlastníka mohl změnit směr, a nápady AI zařadí asistent na program nejbližšího briefingu
(oddíl 18), ne do GitHubu.

## 16. Přehled

Pravidelné výstupy nejsou issues a nic interního není veřejně.

**Jeden společný přehled stavu** (RA31), automaticky aktualizovaný při každé změně issue, PR a nasazení,
v soukromém repozitáři (`stav.md`). Pro každou rozpracovanou věc: co, proč, **fáze** (rozbor,
realizace, ke kontrole, sloučeno, **nasazeno, ověřeno v produkci**), co blokuje postup (`stop`,
červené CI, chybějící potvrzení, rozpočet), co následuje a **kdy byl stav naposledy ověřen**. Blokace
PR se přenáší do stavu projektu. Z tohoto přehledu čerpají upozornění, týdenní přehled i program
briefingu, takže si neodporují.

- **Upozornění při výjimce** do Telegramu (kanál souhrnů datové linky), ne denně: něco čeká na
  rozhodnutí z oddílu 3, druhý klíč něco zastavil, výdaje nebo tokeny přesáhly 80 % rozpočtu,
  co se zítra sloučí po lhůtě v režimu K.
- **Program briefingu** (Grok Bot): nejvýš 3 nápady AI, otázky ke směru, na konci všechny zápisy
  k potvrzení najednou (oddíl 18).
- **Týdenní přehled** v pondělí do Telegramu (hlavní pravidelný výstup), delší verze do soukromého
  repozitáře: sloučené změny s odkazem na revert, změny webu po oblastech, projekty, provoz (neúspěšná workflow, červené CI,
  expirace tokenů vlastníka v secrets), náklady a výdaje kartou, nová data, hlášení a opravy od škol,
  rozhodnutí připsaná vlastníkovi z briefingů, měřítka.
- **Okamžitě:** červené CI na `main`, selhání datové linky, migrace na produkci, osobní údaje ve
  veřejném issue, revert, výdaj nad 80 % limitu.
- **Veřejně** jen změny webu na `/changelog`.

## 17. Směr vývoje

Soubor `smer-vyvoje.md` v **soukromém repozitáři** (například `tangero/stredniskoly-rizeni`), upravitelný
z telefonu: cíle k datu, pořadí priorit, co se teď nedělá, rozpočet (oddíl 17a), mimořádné pokyny.
Zamrznutí AI navrhne z kalendáře a zapíše sem. Claude ho čte při každém zpracování.
Je to hlavní nástroj, kterým vlastník řídí.

## 17a. Rozpočet AI a pozornosti

Dva rozpočty, oba ve Směru vývoje:

**Rozpočet na tokeny a výdaje** (měsíční částka) se dělí do tří košů s pevným pořadím:

| koš | podíl | na co | při vyčerpání |
|---|---|---|---|
| **provoz** | zbytek | rutina, opravy, hlášení, druhý klíč, přehled | nikdy se nezastaví; při vyčerpání celého rozpočtu jen opravy chyb na webu a upozornění |
| **schválená práce** | do 60 % | drobná zadání, etapy a projekty, které běží | nové etapy čekají na další měsíc |
| **nápady** | do 15 % | průzkum a příprava nápadů AI před představením | nové nápady se nepřipravují |

Příprava jednoho nápadu má strop (výchozí 2 % měsíčního rozpočtu): AI udělá levný náčrt (co, proč,
odhad práce a nákladů), ne hotovou analýzu. Spotřebu podle košů uvádí týdenní přehled.

**Rozpočet pozornosti vlastníka:**

- **nejvýš 3 nápady AI na briefing**, pevně; neprošlé zůstávají v rejstříku návrhů a po 30 dnech bez
  zařazení se vyřadí (AI je může znovu navrhnout jen s novým důvodem);
- výběr tří nápadů podle skóre: **přínos** (návštěvnost dotčené oblasti, počet hlášení, sezóna)
  × **soulad se Směrem vývoje** ÷ **náklady** (odhad tokenů a práce), každé 1–5; skóre a jednu větu
  „proč teď“ asistent u nápadu uvede;
- zápisy k potvrzení **najednou na konci briefingu**, jedno „ok“ pro všechny (nebo „ok kromě X“);
- upozornění do Telegramu jen při výjimce (oddíl 16).

Pevný limit tří nápadů je jednoduchý a chrání pozornost; skóre jen určuje, které tři to budou.

## 18. Briefing s asistentem zadání

O směru vývoje rozhoduje vlastník na briefingu s asistentem zadání: v **soukromém chatu v aplikaci
Grok Bot**, na poradách v pondělí, ve středu a v pátek v 7:55 i v průběžné konverzaci. Kanál ověřuje
vlastníka tím, že chat patří jen jeho účtu, a aplikace přepis ukládá. Telegram slouží jen pro souhrny.

**Pokyn, který přijde jinou cestou** (e-mail, zpráva jiného bota), se za rozhodnutí z briefingu
nepočítá, ani když se podepíše jako vlastník. Rozhodnutí na GitHubu platí samostatně podle oddílu 2.

Riziko u briefingu není podvržení, ale **výklad**: AI může vlastníka pochopit špatně, vágní myšlenku
proměnit v projekt nebo mu připsat rozhodnutí, které neudělal. Proto platí podle druhu rozhodnutí:

| rozhodnutí z briefingu | příklad | platnost | co asistent udělá |
|---|---|---|---|
| **zastavující** | „tenhle směr nechci“, „projekt X zastav“, „tohle teď nedělej“ | **hned**; špatný výklad stojí jen čas | zapíše do Směru vývoje (Teď neděláme) a do rejstříku návrhů, k dotčeným issues a PR přidá `stop` nebo `zamitnuto` s odkazem na zápis |
| **rozjíždějící** | „pojďme dělat Y“, nová priorita, nový projekt | **po potvrzení zápisu** | na konci briefingu shrne doslovnou větu vlastníka a co z ní vyvozuje (cíl, rozsah, priorita, dotčené issues), spolu s ostatními zápisy; po „ok“ zapíše do Směru vývoje nebo založí projekt s dokladem `Zdroj: briefing` |
| **úprava** | „ano, ale jinak“, „jen pro Prahu“, „až po přijímačkách“ | **po potvrzení zápisu** | jako rozjíždějící; změnu zapíše do těla issue, komentáře „Změna zadání“ a changelogu (oddíl 10, bod 5) |
| **věci z oddílu 3 kromě směru** (H1, H3, H4) | schválení dávky rozesílky, výdaj nad limit | **po potvrzení zápisu a s odkazem v GitHubu** | jako rozjíždějící; navíc doplní issue s odkazem na zápis, aby rozhodnutí bylo dohledatelné |
| **uvolnění pravomocí AI** (H2) | změna brány, rulesetu, workflows | **jen přes GitHub** | připraví PR; sloučí se jen se `schvaleno` od vlastníka |

**Nápady AI** (například nová analýza RSS kanálů škol) se nejdřív představí na briefingu: co, proč,
odhad práce a nákladů, oblast, skóre. Nejvýš tři na jeden briefing (oddíl 17a). Vlastník je může
odmítnout, změnit, nebo pustit hned. Když nereaguje, běží od představení lhůta 48 h a projekt startuje
v režimu L. Projekt zadaný vlastníkem startuje hned a etapy v mandátu se slučují bez lhůty (režim E). Nápady se vedou v **rejstříku návrhů** v soukromém
repozitáři (stav, datum, důvod zamítnutí), aby se zamítnuté nevracely.

**Doklad potvrzení** (RA30) ukládá podle RA35 sám asistent; samostatná služba s vlastní identitou se
nezavádí (oddíl 2). Existence zápisu v soukromém repozitáři ale nedokazuje, že vlastník odsouhlasil
právě tento rozsah. Proto:

- jedno „ok“ na konci briefingu se váže ke **konkrétnímu číslovanému seznamu rozhodnutí**, který
  asistent v chatu vypsal těsně před ním;
- doklad (seznam rozhodnutí, doslovné „ok“, identifikátor zprávy a otisk seznamu) uloží asistent do
  soukromého repozitáře; brána ověří, že otisk odpovídá rozsahu v issue, takže **změněný rozsah původní
  potvrzení nepokrývá**. Proti chybnému výkladu chrání doslovná věta a týdenní výpis připsaných
  rozhodnutí; proti úmyslu asistenta ne (oddíl 2).

**Do konce fáze 2 platí náhradní režim:** doklad z briefingu slouží jen pro režimy L a E a asistent
podle něj `schvaleno` nepřidává; rozhodnutí H1, H3, H4 a H5 vlastník potvrdí jedním štítkem `schvaleno`
na připraveném issue (i z GitHub Projects). Dnes chybí: soukromý repozitář pro zápisy (fáze 1, krok 4
postupu), ukládání dokladu s otiskem seznamu a ověření otisku branou (fáze 2). Brána ve fázi 1 bere
doklad `Zdroj: briefing` jen podle textu.

Od fáze 2 dostane strategický projekt (H5) schválení potvrzeným dokladem; brána ho ověří stejně jako
ostatní doklady z briefingu.

Podmínky:

- Doslovné zápisy a potvrzení se ukládají do soukromého repozitáře vedle Směru vývoje
  (`briefingy/RRRR-MM-DD.md`), ne do veřejného.
- Týdenní přehled vypíše **všechna rozhodnutí připsaná vlastníkovi** za týden s odkazem na zápis.
- Vlastník na briefingu nemusí znát čísla issues; asistent je dohledá a v zápisu vyjmenuje.
- Zastavující rozhodnutí odvolá vlastník jako rozjíždějící, tedy s potvrzením zápisu.

## 19. Denní úloha a pravidla

**Denní úloha** (Routine v Claude Code): přečte Směr vývoje a splatné připomínky, roztřídí
issues, realizuje práci do stropu PR, ověří na preview, sloučí, co pustí brána, opraví vlastní PR,
pošle souhrn. Spouštění z GitHubu jen štítkem od vlastníka (`github.event.sender.login`), nikdy
komentářem `@claude`.

**Změny pravidel v `CLAUDE.md`:** pravidla 1 (realizace), 3 (merge), 5 (produkční databáze) a 7 (cizí
servery) nahradí režimy z oddílů 3–5; pravidlo 4 (osobní údaje) zůstává. **Zkrácení `CLAUDE.md`** (RA9):
postupy do skills v `.claude/skills/` (třídění, rutina, ověření na preview, migrace přes větev Neonu,
politika přístupu k cizím serverům, výdaje, kontroly před PR, přehled). V `CLAUDE.md` zůstanou role,
oddíl 3, režimy a odkazy. Cíl: nebude delší než dnes (132 řádků).

## 20. Měřítka a zavedení

| měřítko | jak se měří | cíl |
|---|---|---|
| **minuty vlastníka týdně** (hlavní) | délka briefingů z přepisu + odhad času akcí na GitHubu (merge, review, štítky) + čtení přehledu; výchozí stav změřit před aktivací | pokles aspoň o tři čtvrtiny |
| **počet vyrušení** (hlavní) | upozornění v Telegramu a dotazy mimo briefing týdně | nejvýš 3 týdně |
| **doba do ověřeného nasazení** (hlavní) | medián od zadání po „ověřeno v produkci“, podle režimu | rutina do 2 dnů, drobné zadání do 3 dnů |
| **závažnost regresí** (hlavní) | regrese do 14 dnů podle dopadu: kosmetická, funkční, data nebo e-mail | žádná s dopadem na data nebo e-maily |
| lidské zásahy (pomocné) | merge, `schvaleno` a review z účtu vlastníka týdně | klesá |
| fronta | otevřené `navrh`, stáří nejstaršího | nejvýš 3, žádné starší 7 dní |
| regrese (pomocné) | PR revertované nebo opravované do 14 dnů, podle režimu | nejvýš 1 z 10 |
| zastavení druhým klíčem | podíl PR v režimu K se `stop` | sleduje se, cíl se určí po 4 týdnech |
| zátěž briefingem | počet nápadů a potvrzení na briefing, délka briefingu podle přepisu | nejvýš 3 nápady, jedno potvrzení na konci |
| rozpočet | spotřeba podle košů | koš nápadů nejvýš 15 % |

Zavádí se **podle přínosu**: nejdřív to, co odstraní nejvíc dnešní práce. **Přejímací scénáře jsou
podmínkou zapnutí příslušné fáze**, ne kontrolou po ní: fáze 1 se zapne až po scénáři O2 (změněný
rozsah bez nového souhlasu neprojde) a scénáři „PR se `stop` nebo bez protokolu z preview neprojde“;
příjem oprav od škol až po scénáři O6. Scénáře O1 a O3 odpadly s rozhodnutím o jedné identitě (oddíl 2).

| fáze | co dělá AI | práce vlastníka |
|---|---|---|
| 0, hned | upravit #53, zavřít duplikáty #216, #228, #251, odstranit `auto-fix-issues.yml`, `auto-fix-iterative.yml` a `notify-new-issue.yml` (PR #276); `veletrhy-snimek.yml` zakládá PR tokenem vlastníka (`CSI_PR_TOKEN`) místo `GITHUB_TOKEN`, aby na nich běželo CI a šly sloučit bez obejití rulesetu | smazat revizi #53 (2 min) |
| **1, týden 1–2: konec merge a kontroly preview** | PR s pravidly a skills, `rezimy.yml`, labelerem a branou; zapnout slučování skriptem po bráně u rutiny z interních zadání, drobných zadání a etap (**rutina z veřejných hlášení zůstává do zavedení druhého klíče ve fázi 2 v dnešním režimu**: nerealizuje se bez `schvaleno`); ověření na preview; týdenní přehled; výchozí měřítka | v rulesetu přidat bránu jako povinnou kontrolu a vyprázdnit seznam obejití; secret pro preview; soukromý repozitář a Směr vývoje včetně rozpočtu (asi 30 min) |
| **2, týden 3–4: plná autonomie** | druhý klíč, režim K pro migrace (po ověření tarifu Neonu), nová data, výdaje kartou, e-maily odběratelům (po ověření rozesílání po vlnách), zápisy z briefingu do soukromého repozitáře, příjem oprav od škol, denní úloha | virtuální karta s limitem, ověřit tarif Neonu (asi 30 min) |
| **přejímka po fázi 2** | scénáře: (1) vlastník týden neodpovídá; běžná práce pokračuje, vyhrazená rozhodnutí čekají, `stop` se dodržuje, přehled zůstává aktuální; (2) PR se `stop` a štítkem `incident` během zamrznutí zůstane zablokovaný; (3) rozšíření projektu nad mandát se nesloučí bez `schvaleno` | žádná (to je test) |

Do konce fáze 1 platí dnešní postup (vlastník merguje), takže přechod netrvá déle než dva týdny.
Oddělení produkčních secrets od pracovních větví (oddíl 9b) je doporučené, ne podmínkou fáze: chrání
před chybou ve větvi, před úmyslem AI s účtem vlastníka ne.

Po fázi 2 zbývá vlastníkovi: Směr vývoje a rozhodnutí z oddílu 3. Odhad: desítky minut měsíčně;
ověří ho měřítka.

## 21. Rozhodnutí části A

| | rozhodnutí | doporučuji |
|---|---|---|
| RA1 | Zrušit model ve třech úrovních, štítky `oblast:*` a `projekt` | **ano** |
| RA2 | `navrh` jako jediný štítek „čeká na vlastníka“ | **ano** |
| RA3 | Devět oblastí | **ano** |
| RA4 | Životní cyklus projektu podle oddílu 10 | **ano** |
| RA5 | Úklid `docs/` jako rutina | **ano** |
| RA6 | ~~Strojový účet a GitHub App~~ zrušeno rozhodnutím RA35 | – |
| RA7 | Rutina včetně veřejných hlášení s automatickým merge (z veřejných hlášení až s druhým klíčem ve fázi 2) | **ano** |
| RA8 | Drobná zadání po 48 h bez veta; etapy v mandátu bez lhůty (RA32) | **ano** |
| RA9 | Zkrácení `CLAUDE.md` přes skills | **ano** |
| RA10 | Ověření na preview dělá AI | **ano** |
| RA11 | Přehled neveřejně, Směr vývoje v soukromém repozitáři | **ano** |
| RA12 | Denní úloha se stropem 5 PR denně | **ano** |
| RA13 | Brána sloučení jako povinná kontrola se zamrznutím | **ano** |
| RA14 | Opravy od škol z portálu a ověřeného e-mailu | **ano** |
| RA15 | Ruleset bez výjimek, i pro vlastníka | **ano** |
| RA16 | Člověk rozhoduje jen oddíl 3, ostatní režimy R, L, E, K | **ano** |
| RA17 | Druhý klíč s jiným modelem a právem `stop` | **ano** |
| RA18 | Výdaje virtuální kartou do limitu, evidence ve Fakturoidu | **ano**, limit určí vlastník |
| RA19 | Migrace přes větev Neonu v režimu K | **ano**, po ověření tarifu |
| RA20 | Nová data podle politiky přístupu v režimu K | **ano** |
| RA21 | Rozhodnutí o směru na briefingu v Grok Bot: zastavující hned, rozjíždějící a úpravy po potvrzení zápisu | **ano** |
| RA22 | Nápady AI se představují na briefingu, lhůta běží od představení, rejstřík návrhů | **ano** |
| RA23 | Změny `secrets.*` a `permissions:` ve workflows jako H2, ostatní úpravy workflows K | **ano** |
| RA24 | Issue s osobními údaji přesunout do soukromého repozitáře místo mazání | **ano** |
| RA25 | Zadání asistenta je interní jen s dokladem (briefing, ověřená oprava od školy); ostatní e-maily režim K | **ano** |
| RA26 | Rozpočet AI ve třech koších (provoz, schválená práce, nápady do 15 %), strop na přípravu nápadu | **ano**, částku určí vlastník |
| RA27 | Nejvýš 3 nápady AI na briefing podle skóre, potvrzení zápisů najednou na konci, upozornění jen při výjimce | **ano** |
| RA28 | Rozhodování dvěma rovnocennými cestami: GitHub (i GitHub Projects) a briefing v Grok Bot | **ano** |
| RA29 | Oddělení přípravy od provedení: produkční secrets jen v prostředí pro `main`, preview bez secrets z větve, produkční operace automatem z `main` | **ano**, fáze 0 |
| RA30 | Doklad potvrzení z briefingu zapisuje služba kanálu s otiskem seznamu rozhodnutí, ne asistent | **ano**; když to Grok Bot neumí, H-rozhodnutí štítkem |
| RA31 | Jeden přehled stavu s fázemi až po „ověřeno v produkci“; projekt se zavírá po ověření v produkci | **ano** |
| RA32 | Etapy v mandátu bez lhůty (režim E); mandát projektu cílem, rozpočtem, dopadem a vratností; nejvýš 2 rozpracované projekty z iniciativy AI | **ano** |
| RA33 | Incidentní postup při zamrznutí | **ano** |
| RA34 | Souhlas vázaný na otisk rozsahu; souběh podmínek H a K; přejímací scénáře jako podmínka zapnutí fáze | **ano** |
| RA35 | AI pracuje přes účet vlastníka (od RA36 kromě asistenta zadání); pojistky chrání před chybou a podvrženým vstupem, ne před úmyslem AI; kontrola rozhodnutí zpětně v týdenním přehledu | **ano** (rozhodnutí vlastníka) |
| RA36 | Asistent zadání pracuje vlastním účtem `eduarda-prijimacky`; brána bere `schvaleno` jen z účtu vlastníka | **ano** (rozhodnutí vlastníka) |

# Část B: rozšíření podle měřítek

Po čtyřech týdnech provozu části A:

| | rozhodnutí | podmínka |
|---|---|---|
| RB1 | Lhůta L 24 h, lhůta K 48 h | regrese nejvýš 1 z 10 |
| RB2 | Vyšší limit rozsahu rutiny | nejvýš 1 regrese rutiny za 4 týdny |
| RB3 | Vyšší limit karty | výdaje v rozpočtu, žádné zbytečné předplatné |
| RB4 | Vyšší mandát projektů z iniciativy AI (rozpočet projektu) a 3 rozpracované projekty | projekty z režimu L bez zastavení a v rozpočtu |

## 22. Přijatá rizika

| riziko | co ho omezuje | co vlastník přijímá |
|---|---|---|
| AI sloučí chybnou změnu | brána a režimy, protokol, druhý klíč, souhrn, revert | chyba může být na webu, než si jí někdo všimne |
| podvržený pokyn ve veřejném hlášení | režim K, druhý klíč, ruleset bez obejití, týdenní výpis | změna, kterou oba modely přehlédnou, nebo pokyn, který AI přiměje jednat za vlastníka |
| chybná migrace | větev Neonu, bod obnovy, limit řádků, druhý klíč | ztráta zápisů mezi chybou a obnovou |
| chybný e-mail odběratelům | kouřová zkouška, testovací schránka, rozesílání po vlnách | chyba u prvních 5 % příjemců |
| stížnost na stahování dat | politika přístupu, strop dotazů, ohlášení | zhoršený vztah se školou |
| zbytečný výdaj | limit karty, odůvodnění, rušení nevyužitého | výdaj do limitu |
| AI si rozšíří práva nebo přidá `schvaleno` za vlastníka | pravidlo v oddílu 2, brána bere `schvaleno` jen z účtu vlastníka (asistent zadání má vlastní účet), týdenní výpis rozhodnutí a změn nastavení, druhý klíč | Claude Code a boti s účtem vlastníka to technicky mohou (RA35) |
| podvržený pokyn v e-mailu asistentovi | zadání bez dokladu jde do režimu K, brána ověřuje doklad v soukromém repozitáři | – |
| AI špatně vyloží briefing | zastavující jen zastavují, rozjíždějící po potvrzení doslovného zápisu, týdenní výpis připsaných rozhodnutí | ztracený čas u špatně vyloženého zastavení |
| odpovědnost provozovatele | právní závazky zůstávají člověku (H3) | AI rozhoduje jeho jménem v mezích režimů |

## Změny návrhu

- **0.13a** (3. 10. 2026, nálezy asistenta zadání): doklad původu a protokol z preview brána uzná jen od
  vlastníka a asistenta zadání (protokol i od `github-actions[bot]`), PR jiného autora jen se souhlasem
  na PR; oprava úvodní věty a pořadí řádků RA.
- **0.13** (3. 10. 2026, rozhodnutí vlastníka a review PR #283): Eduarda pracuje vlastním účtem
  (RA36), brána bere `schvaleno` jen z účtu vlastníka a `stop` smí odebrat jen ten, kdo ho přidal, nebo
  vlastník; lhůta L se zakládá znovu při změně hlavy, rozsahu zadání nebo protokolu; sloučení čeká na
  vyhodnocení vyvolané konkrétní žádostí.
- **0.12c** (3. 10. 2026, implementace brány ve fázi 1): brána se nespouští na `pull_request_review`
  (běží ve verzi z větve PR), výsledek zapisuje přes Checks API na hlavu PR; pevná podoba protokolu
  z preview a výjimka pro změny bez dopadu na web (oddíly 9 a 11).
- **0.12b** (3. 10. 2026, review PR #276): oddíl 18 sjednocen s RA35, doklad ukládá asistent, náhradní
  režim platí do konce fáze 2 a výjimka pro `schvaleno` podle briefingu (oddíl 2) až od fáze 2.
- **0.12** (3. 10. 2026, rozhodnutí vlastníka): všichni pracují přes účet vlastníka (RA35). Odpadají
  strojový účet, GitHub App pro AI, aplikace brány, zkušební repozitář, podmínka O1, převod tokenů a review
  vlastníka kódu; pojistky chrání před chybou a podvrženým vstupem, ne před úmyslem AI; rozhodnutí
  vlastníka se poznají podle patičky a dokladu a kontrolují zpětně v týdenním přehledu; původ zadání
  podle štítku a dokladu, ne autora; snímek veletrhů zakládá PR tokenem vlastníka; práce vlastníka
  ve fázích 0 a 1 asi 30 minut.
- **0.11b** (3. 10. 2026, kontrola 0.11a od Codexu): náhradní cloudový postup už neobchází O1; relace
  propojená s účtem vlastníka se v autonomii nepoužívá vůbec, práce běží v prostředí s tokenem aplikace
  a negativní přejímka platí pro každé prostředí bez výjimky.
- **0.11a** (3. 10. 2026, kontrola vypořádání od asistenta zadání): aplikace brány a zkušební repozitář
  v práci vlastníka ve fázi 0, odhad 3 h (P1); podmínka O1 pro všechna prostředí AI včetně počítače
  asistenta a náhradní cesta, kdyby cloudová relace nešla bez účtu vlastníka (P2); náhradní režim
  dokladu z briefingu jako výchozí stav (P3); otisk rozsahu už při přidání `navrh`; zalomení řádku.
- **0.11** (3. 10. 2026, kritická oponentura Codexu celé verze 0.10b): autonomie jen v prostředí bez
  přihlášení vlastníka s negativní přejímkou (O1); souhlas na GitHubu vázaný na commit a otisk rozsahu
  (O2, oddíl 9a); výsledek brány vydává jen samostatná aplikace brány (O3); podmínky H a K se sčítají (O4);
  `navrh` u H5 při hotovém podkladu (O5); e-mail od školy jen s DMARC a shodou domén (O6); přejímací
  scénáře jako podmínka zapnutí fáze; RA34.
- **0.10b** (3. 10. 2026, kontrola vypořádání od Codexu): incident ruší jen kalendářní zamrznutí, nikdy
  `stop` (V1); překročení mandátu vždy potřebuje `schvaleno` bez ohledu na pojmenování změny (V2);
  rutina z veřejných hlášení zůstává do zavedení druhého klíče ve fázi 2 v dnešním režimu (V3);
  přejímací scénáře pro `stop` + `incident` a pro překročení mandátu; tabulka režimů v oddílu 4 je
  jediné závazné místo pro lhůty a podmínky sloučení.
- **0.10a** (3. 10. 2026, vlastní kontrola konzistence): brána a druhý klíč běží na `pull_request_target`
  ve verzi z `main` bez spouštění kódu z PR (jinak by si AI mohla ve větvi upravit kontrolora); sjednocení
  náhrady tokenů (`PROJECT_TOKEN` strojovým účtem) v oddílech 5 a 20; fáze 0 obsahuje založení
  strojového účtu a prostředí `production`; vestavěný auto-merge vypuštěn z práce vlastníka; projekty
  a RB4 podle mandátu místo počtu etap; etapy bez lhůty i v oddílu 18 a RA8; režim E v RA16; štítek
  `incident`; zalomení dlouhých řádků.
- **0.10** (3. 10. 2026, oponentura Codexu na žádost vlastníka): oddělení přípravy od provedení
  (produkční secrets v prostředí pro `main`, preview bez secrets, produkční operace automatem z `main`;
  doložená cesta přes `testy.yml` a `vercel-deploy.sh`); doklad potvrzení z briefingu zapisuje služba
  kanálu s otiskem seznamu; etapy v mandátu bez lhůty (režim E); mandát projektu a limit rozpracovaných
  projektů; jeden přehled stavu až po ověření v produkci; incidentní postup při zamrznutí; měřítka v
  minutách, vyrušeních, době do ověřeného nasazení a závažnosti regresí; brána reaguje na změny issue
  a merge ověřuje veto těsně před sloučením; přednost specifického mechanismu; rutina z hlášení
  s druhým klíčem; přejímka scénářem „vlastník týden neodpovídá“; RA29–RA33.
- **0.9a** (3. 10. 2026, pokyn vlastníka): převod `PROJECT_TOKEN`, `CSI_PR_TOKEN` a `veletrhy-snimek`
  na token aplikace přesunutý do fáze 0, co nejdříve a nezávisle na schválení návrhu; `PROJECT_TOKEN`
  nahradí token strojového účtu, protože aplikace do tabule osobního účtu nezapíše; založení aplikace
  a strojového účtu je práce vlastníka ve fázi 0.
- **0.9** (3. 10. 2026, kontrola zátěže vlastníka): shrnutí pro rozhodnutí na začátku; zavedení ve dvou
  fázích podle přínosu (nejdřív konec merge a kontroly preview); nahrazení tokenů vlastníka a převod
  `veletrhy-snimek` na token aplikace před zrušením výjimky v rulesetu; rozpočet AI ve třech koších
  a rozpočet pozornosti (nejvýš 3 nápady na briefing podle skóre, potvrzení najednou); upozornění jen při
  výjimce místo denního souhrnu; rozhodování na GitHubu i v Grok Bot jako rovnocenné cesty; měřítka zátěže
  briefingem a rozpočtu; RA26–RA28.
- **0.8a** (3. 10. 2026, kontrola vypořádání): v kroku 1 zapnout povinné review vlastníka kódu v rulesetu;
  oprava od školy má záznam v soukromém repozitáři, který brána ověří stejně jako zápis z briefingu.
- **0.8** (3. 10. 2026, oponentura v0.7): briefing v Grok Bot, ne v Telegramu, a jiné kanály se
  nepočítají; nápady AI se představují na briefingu a lhůta běží od představení, rejstřík návrhů;
  řádek pro úpravu („ano, ale jinak“); `.github/workflows/` pod CODEOWNERS kvůli tokenům vlastníka;
  issue s osobními údaji se přesouvá do soukromého repozitáře; zadání asistenta je interní jen
  s dokladem, e-maily od neověřených odesílatelů v režimu K (`puvod:email`); nouzová oprava při
  rulesetu bez výjimek; RA22–RA25.
- **0.7** (3. 10. 2026, dotaz vlastníka na briefingy s asistentem zadání): rozhodování o směru na briefingu
  (oddíl 18): zastavující rozhodnutí hned, rozjíždějící po potvrzení zápisu, H1–H4 navíc s odkazem
  v GitHubu, H2 jen přes GitHub; `stop` smí přidat i asistent podle briefingu; zápisy v soukromém
  repozitáři; připsaná rozhodnutí v týdenním přehledu; RA21.
- **0.6** (3. 10. 2026, rozbor lidských rozhodnutí; zadání vlastníka: nic není tabu, nevyžádané rozesílky
  schvaluje vlastník): člověk rozhoduje jen pět druhů věcí (oddíl 3); režimy R, L, K, H; rozbor 21
  rozhodnutí s riziky a mechanismy; druhý klíč s jiným modelem; migrace přes větev Neonu; nová data
  podle politiky přístupu; výdaje virtuální kartou; malé projekty bez schválení; mazání issue s osobními
  údaji; ruleset bez výjimek i pro vlastníka; Claude Code pod aplikací všude, strojový účet jen pro
  asistenta; ověření identity v cloudu.
- **0.5a**: strojový účet pro asistenta, GitHub App pro Claude Code.
- **0.5** (čtvrté kolo oponentury): brána sloučení, rozšířené tvrdé hranice, oddělené identity, veto nad
  hotovým výsledkem, zamrznutí, opravy od škol.
- **0.4** (zadání vlastníka: minimum lidských vstupů): rutina s automatickým merge, ověření na preview AI,
  přehled a Směr vývoje v části A.
- **0.3**, **0.2** (oponentury): identita a podpis AI, životní cyklus projektu, neveřejný přehled.
- **0.1**: první verze.
