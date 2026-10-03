# Řízení vývoje: směr určuje člověk, provedení a přehled zajišťuje AI

Verze 0.8 · 3. 10. 2026 · **část A ke schválení hned, část B k rozhodnutí podle měřítek.**
Na GitHubu ani v pravidlech se zatím nic nemění.

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
- **Pojistky jsou mimo AI:** ruleset a brána sloučení, limit karty v bance, záloha databáze v Neonu,
  stropy v kódu. AI je nemůže přesvědčit ani obejít.
- **Druhý klíč místo lidského veta:** nezávislý AI kontrolor smí zastavit rizikovou změnu (oddíl 6).
  Vlastník veto má, ale nemusí lhůty sledovat.
- **Rychlé vrácení** (revert, rollback ve Vercelu, obnova databáze k okamžiku) a přehled po faktu.

Části:

- **Část A, ke schválení hned** (oddíly 2–22).
- **Část B, podle měřítek** (konec dokumentu).

## 2. Role a identity

| kdo | identita | dělá |
|---|---|---|
| **Patrick** (vlastník projektu) | účet vlastníka na GitHubu; na briefingu jeho soukromý chat v aplikaci Grok Bot (oddíl 18) | Směr vývoje (i na briefingu s asistentem zadání), rozhodnutí z oddílu 3, volitelně veto `stop`, jednorázové nastavení |
| **Eduarda** (AI asistent) | **strojový účet** (například `eduarda-prijimacky`): spolupracovník s právem zápisu, ne admin, dvoufázové ověření aplikací, fine-grained token jen na tento repozitář | vede briefing s vlastníkem v Grok Bot a zapisuje z něj rozhodnutí, představuje na něm nápady AI, přijímá hlášení e-mailem a z portálu, píše zadání a oponentury |
| **Claude Code** | **GitHub App** (například `prijimacky-ai[bot]`): jen tento repozitář, vybraná práva, tokeny na hodinu; **všude**, i při práci na zavolání (pomocný skript vygeneruje token do `GH_TOKEN`), v denní úloze i v Actions | třídí, realizuje, review, ověření na preview, merge přes bránu, přehled, provoz |
| **Druhý klíč** | workflow v Actions s jiným modelem než Claude Code | nezávisle kontroluje rizikové PR a smí přidat `stop` (oddíl 6) |
| **automatika** | `GITHUB_TOKEN` | štítky oblastí, brána sloučení, CI, tabule |

**Dvě oddělené identity AI** (RA6). Kdyby Claude Code a Eduarda sdíleli strojový účet, brána by nepoznala,
kdo zadání založil. Claude by pak mohl z veřejného hlášení založit „interní“ zadání, které projde lhůtou
(problém T3 z oponentury). Strojový účet je jen jeden (podmínky GitHubu povolují jeden na člověka),
proto Claude Code používá aplikaci. Nepohodlí pomocného skriptu nese AI, ne člověk.

**Ruleset bez výjimek** (RA15). Seznam těch, kdo smí ochranu `main` obejít, je **prázdný, i pro vlastníka**.
Merge pustí jen povinné kontroly a brána sloučení. Důvod: relace Claude Code v cloudu dnes jedná přes
připojený účet vlastníka, který je admin a smí ruleset obejít. Dokud výjimka existuje, má ji každá AI,
která pod tím účtem běží. Vlastník schvaluje PR od identit AI review (nejsou jeho), v nouzi dočasně upraví
ruleset; úprava zůstane v historii.

**Nouzová oprava:** když CI padá z vnějšího důvodu (výpadek zdroje dat nebo služby) a nesloučí se ani
revert, vlastník dočasně vypne dotčenou kontrolu v rulesetu, AI to zapíše do přehledu a po opravě
kontrolu hned vrátí a ověří, že je zpět.

**Za rozhodnutí se počítá jen štítek, review nebo komentář z účtu vlastníka,** nebo rozhodnutí
z briefingu zapsané podle oddílu 18. Brána i Claude ověřují autora (`user.login`) a u štítku toho, kdo ho
přidal (`actor` v timeline). Podle textu nikdy.
Do zavedení identit platí přechodné pravidlo: AI podepisuje komentáře patičkou, komentář s patičkou ani
štítek přidaný AI se jako rozhodnutí nepočítá a automatický merge je vypnutý.

**Ověřit v kroku 1:** že cloudová relace Claude Code dokáže pro `gh` i `git push` použít token aplikace
místo připojeného účtu vlastníka. Do ověření se počítá s tím, že AI v cloudu má práva vlastníka; proto je
důležitý ruleset bez výjimek.

# Část A

## 3. Co rozhoduje člověk

Jen těchto pět druhů rozhodnutí:

| | rozhodnutí | proč člověk |
|---|---|---|
| H1 | **Rozesílání nevyžádaných e-mailů a informací:** oslovení škol (pozvánky do portálu), dopisy pořadatelům veletrhů, tiskové zprávy a oslovení novinářů, jakákoli zpráva lidem, kteří si o ni neřekli | výslovná podmínka vlastníka; reputační a právní riziko (obchodní sdělení), nevratné |
| H2 | **Uvolnění pravomocí AI:** změna brány sloučení, rulesetu, CODEOWNERS, práv identit AI, pravidel v `CLAUDE.md`, která hranice rozšiřují | AI by si jinak rozšiřovala vlastní práva |
| H3 | **Právní závazky vůči třetím stranám:** nový zpracovatel osobních údajů nebo nová kategorie osobních údajů, zdroj za přihlášením, se smlouvou nebo nejasnou licencí, podmínky užití se závazkem | odpovědnost provozovatele (GDPR, licence) nese vlastník, ať rozhodla AI nebo ne |
| H4 | **Výdaje nad limit karty a roční závazky** | finanční riziko nad nastavený strop |
| H5 | **Směr vývoje a strategické projekty:** cíle, priority, nové publikum, partnerství, nový produkt | o směru rozhoduje vlastník |

Plus jednorázové nastavení (oddíl 20). Rozhodnutí o směru může vlastník dělat i na briefingu
(oddíl 18). Dávku H1 AI připraví celou (příjemci, text, ukázky, odhad dopadu)
a vlastník ji schválí jedním klepnutím.

## 4. Režimy rozhodování AI

Všechno mimo oddíl 3 rozhoduje AI v jednom ze čtyř režimů. Režim určuje brána podle cest v PR
(`.github/rezimy.yml`) a podle typu činnosti:

| režim | kdy | podmínky sloučení nebo provedení |
|---|---|---|
| **R, rutina** | oprava rozporu z vlastních dat nebo kódu (oddíl 7) | CI, review, protokol z preview; hned (z veřejného hlášení po 24 h) |
| **L, lhůta** | drobné zadání, etapa schváleného projektu (oddíl 8) | CI, review, protokol; po 48 h bez `stop` |
| **K, kontrolovaný** | rizikové činnosti z oddílu 5 | CI, review, protokol, **druhý klíč bez námitky**, **specifický mechanismus z oddílu 5**, upozornění vlastníkovi; po 72 h bez `stop` |
| **H, člověk** | oddíl 3 | schvalující review nebo `schvaleno` od vlastníka |

Vždy platí: `stop` a zamrznutí sloučení zablokují (oddíl 9).

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
| 10 | pravidla, workflows, brána, práva AI (`CLAUDE.md`, `.claude/`, `.github/`) | **V** | H2 / L | CODEOWNERS na bránu, `rezimy.yml`, ruleset, pravidla o pravomocích a **celé `.github/workflows/`** (povinné review vlastníka): workflow může číst secrets a dnešní tokeny vlastníka (`PROJECT_TOKEN`, `CSI_PR_TOKEN`) umí změnit ruleset. Po jejich nahrazení tokenem aplikace (řádek 18) workflows nejvýš K s druhým klíčem a jen bez změn `secrets.*` a `permissions:`; ostatní úpravy pravidel a skills jako L |
| 11 | závislosti (`package*.json`, `requirements*.txt`) | D S, bezpečnost S | L / K | bezpečnostní aktualizace Dependabotu, AI projde changelog, jen verze starší 7 dnů; patch a minor L, major K |
| 12 | přepnutí datové sady v registru | R **V** (rodiče rozhodují podle čísel) | K | kontroly datové linky, srovnání rozdělení hodnot s loňskem, vzorky proti zdroji naslepo, náhled na preview; jen mimo zamrznutí |
| 13 | nový ukazatel nebo změna výpočtu | R S | K | zápis do slovníku včetně toho, co ukazatel neříká, oponentura druhým klíčem, statistická kontrola |
| 14 | nový projekt | P S, D S | L / H5 | AI navrhuje projekty a hodnotí je podle Směru vývoje, návštěvnosti, hlášení a sezóny i s odhadem nákladů; **nápad AI se nejdřív představí na briefingu** (oddíl 18) a lhůta 48 h běží až od představení; projekt do 3 etap odpovídající prioritám jako L; strategické H5; nápady se vedou v rejstříku návrhů se stavem a důvodem zamítnutí, aby se zamítnuté nevracely |
| 15 | zadání z veřejného hlášení nebo z e-mailu od neověřeného odesílatele | R S | K | povinné vyvolání chyby nebo ověření proti zdroji, limit hlášení na autora, klasifikace spamu a podvržených pokynů druhým klíčem |
| 16 | opravy údajů od škol | R S | L | oddíl 12 |
| 17 | osobní údaje ve veřejném issue | R **V**, právní S | R | AI issue **přesune do soukromého repozitáře** (`stredniskoly-rizeni`) a ve veřejném založí očištěnou kopii; issue i s historií úprav z veřejného repozitáře zmizí. Stačí právo zápisu do obou repozitářů; mazání (vyžaduje admina, tedy i právo měnit ruleset) ani smazání revize není potřeba |
| 18 | obnova tokenů | D S | – | tokeny aplikace se obnovují samy; zbývá token strojového účtu (expirace v přehledu) a `PROJECT_TOKEN`, `CSI_PR_TOKEN` nahradit tokenem aplikace |
| 19 | zamrznutí v kritických dnech | R S | R | AI nastaví z kalendáře přijímaček (`prijimacky-2027.ics`) a návštěvnosti |
| 20 | parametry autonomie (lhůty, limity rutiny) | D N | R | AI je upravuje podle měřítek v daném rozsahu (lhůta L 24–72 h, rutina 100–300 řádků); mimo rozsah H2 |
| 21 | Směr vývoje | P **V** | H5 | AI jednou za čtvrtletí navrhne aktualizaci z dat; bez reakce platí stávající |

**Kde zůstává největší skutečné riziko:** vyžádané e-maily (5), protože chybu v rozesílce nic nevrátí;
přepnutí sad v sezóně (12), protože automat nezachytí chybu ve zdroji samotném; nová data (3), protože
stížnost školy na stahování poškodí vztah se školami víc než technická chyba.

## 6. Druhý klíč

Nezávislý AI kontrolor jako workflow v Actions: **jiný model než Claude Code**, jiný prompt, bez kontextu
autora. Projde každý PR v režimu K a zadání z veřejného hlášení a vrátí verdikt. Při námitce přidá `stop`
s odůvodněním. Dva různé modely se nemýlí stejně a nepodlehnou stejnému podvrženému pokynu.

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

## 8. Drobné zadání a etapy (režim L)

Interní zadání bez `projekt`, které rutinou není (nový text nebo blok, úprava filtru, nový sloupec,
položka slovníku pojmů), a etapy schválených projektů:

1. Claude realizuje hned.
2. PR s protokolem z preview a snímky dá issue `k-overeni`; běží 48 h na veto.
3. Po lhůtě brána PR pustí a Claude sloučí (RA8).

## 9. Brána sloučení

Workflow **„Brána sloučení“**, povinná kontrola v rulesetu u každého PR. Spouští se na `pull_request`
(otevření, push, štítky), `pull_request_review` a jednou za hodinu (lhůty). Určí režim podle cest
(`.github/rezimy.yml`, chráněno CODEOWNERS) a podle propojeného issue a pustí PR jen při splnění
podmínek režimu z oddílu 4. **Původ zadání:**

- **interní (režim L)** je issue založené vlastníkem, nebo strojovým účtem asistenta s dokladem v těle:
  `Zdroj: briefing RRRR-MM-DD` (brána ověří, že zápis existuje v soukromém repozitáři; aplikace je
  nainstalovaná na oba repozitáře) nebo `Zdroj: oprava od školy` s odkazem na záznam v portálu či
  na ověřený e-mail školy (oddíl 12);
- **režim K** je issue založené aplikací Claude Code z veřejného hlášení a issue asistenta bez dokladu,
  například z e-mailu od rodiče nebo neznámého odesílatele (štítek `puvod:email`). E-mail je stejně
  nedůvěryhodný vstup jako veřejné hlášení.

Vždy selže při `stop` na PR nebo propojeném issue a při zamrznutí (proměnné repozitáře
`ZAMRZNUTI_OD`/`ZAMRZNUTI_DO`). Ruleset dnes vyžaduje nula schválení a tři kontroly CI; bez brány by
identita s právem merge sloučila cokoli.

## 10. Projekty

Životní cyklus (RA4):

1. **Nápad:** issue `[Zadání]` se štítky `interni`, `projekt`, `oblast:<slug>`, bez `navrh`.
2. **Rozbor** v komentářích téhož issue; dokument v `docs/` jen u velkých věcí.
3. **Zadání přepsané do těla issue**, oponentura volitelná.
4. **Start:** projekt do 3 etap, který odpovídá prioritám ve Směru vývoje, startuje po 48 h bez `stop`
   (režim L). Strategický projekt (H5) potřebuje `schvaleno`; teprve tehdy dostane `navrh`.
5. **Etapy jako checklist**, jedna etapa = jedna větev `zadani/<N>-etapa-<M>-…` a jeden PR „Souvisí s #N“.
   Změna zadání = úprava těla + komentář „Změna zadání: co a proč“ + řádek v changelogu na konci těla.
6. **Etapa se slučuje v režimu podle cest** (L, nebo K).
7. **Poslední PR nese `Closes #N`.**
8. **Opravy po vydání:** komentář + PR „Souvisí s #N“.
9. **Druhá verze** je nový projekt.

Žádná nová issues pro úpravu zadání, oponenturu, opravu po merge ani další etapu. Sub-issues se
nepoužívají; hlášení, která projekt opravuje, se vypíšou v těle projektu a PR je zavírá přes `Closes`.

## 11. Ověření na preview dělá AI

Claude po nasazení preview projde každé kritérium „Hotovo když“ v prohlížeči (Playwright) na šířce
telefonu i počítače a do PR zapíše protokol (kritérium, adresa, splněno / nesplněno / nejde ověřit),
u vizuálních změn snímky před a po jako artefakt běhu nebo v komentáři PR. Protokol je podmínkou brány.
Předpoklady (krok 1): secret `VERCEL_AUTOMATION_BYPASS_SECRET`, Playwright a přístup na `*.vercel.app`
v prostředí denní úlohy.

## 12. Hlášení, opravy od škol a osobní údaje

**Veřejná hlášení:** při třídění `oblast:<slug>`, duplikáty Claude zavře s odkazem a rozhodne: rutina,
zadání (režim K), součást projektu, nebo dotaz nahlašovateli. Odpovědi nahlašovatelům jsou vyžádaná
komunikace a dělá je AI.

**Opravy údajů od škol** přijímá asistent zadání z portálu pro školy (ověřený účet) a e-mailem z domény
školy uvedené v rejstříku škol s ověřeným odesílatelem (SPF a DKIM v pořádku). Založí drobné zadání:
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

Beze změny `interni`, `schvaleno`, `zamitnuto`, `k-overeni`, `pripominka`, `nova-data`, `bug-report`,
`portal-skoly`, `feature-request`. **`navrh` znamená „čeká na vlastníka“** (RA2), tedy jen věci z oddílu 3.

## 14. Oblasti jako štítky

Devět oblastí (RA3), cesty v kódu podle auditu: `oblast:detail` (Detail školy a oboru), `oblast:prehledy`
(Vyhledávání a přehledy), `oblast:simulator` (Simulátor a Kde stojím), `oblast:dojezdy` (Dojezdové časy),
`oblast:novinky` (Novinky ze škol a e-mailový odběr), `oblast:veletrhy`, `oblast:portal`, `oblast:data`
(Data, termíny a inspekce ČŠI), `oblast:provoz` (Provoz, obsah, SEO, pro novináře a proces).
Issues dostanou oblast při třídění, PR přes `actions/labeler` na `pull_request`.

## 15. Tabule a fronta rozhodnutí

- **Auto-add:** `is:issue is:open -label:trvale`; vypnout „Auto-add sub-issues to project“; archivovat
  26 karet PR.
- **Pohled „Rozhoduji“:** `is:open label:navrh,stop -label:trvale`. Jen věci z oddílu 3 a zastavené změny.
- **Pohled „Běží“:** `is:open label:k-overeni` (co se po lhůtě samo sloučí).
- **Pohled „Projekty“:** `label:projekt` podle Status.

Otázka na vlastníka má pevnou podobu (rozhodnutí, možnosti, doporučení, dopad, co se stane bez odpovědi).
Bez odpovědi se u věcí z oddílu 3 neprovede nic. U ostatních AI rozhodne sama; otázky, u kterých
by názor vlastníka mohl změnit směr, a nápady AI zařadí asistent na program nejbližšího briefingu
(oddíl 18), ne do GitHubu.

## 16. Přehled

Pravidelné výstupy nejsou issues a nic interního není veřejně.

- **Denní souhrn** do Telegramu (kanál souhrnů datové linky), jen když je co hlásit: co se sloučilo,
  co se zítra sloučí po lhůtě, co zastavil druhý klíč, co čeká na rozhodnutí z oddílu 3, výdaje.
- **Program briefingu** (Grok Bot): nápady AI k představení, otázky ke směru, zápisy čekající na potvrzení.
- **Týdenní přehled** v pondělí do Telegramu, delší verze do soukromého repozitáře: sloučené změny
  s odkazem na revert, změny webu po oblastech, projekty, provoz (neúspěšná workflow, červené CI,
  expirace tokenu strojového účtu), náklady a výdaje kartou, nová data, hlášení a opravy od škol,
  rozhodnutí připsaná vlastníkovi z briefingů, měřítka.
- **Okamžitě:** červené CI na `main`, selhání datové linky, migrace na produkci, osobní údaje ve
  veřejném issue, revert, výdaj nad 80 % limitu.
- **Veřejně** jen změny webu na `/changelog`.

## 17. Směr vývoje

Soubor `smer-vyvoje.md` v **soukromém repozitáři** (například `tangero/stredniskoly-rizeni`), upravitelný
z telefonu: cíle k datu, pořadí priorit, co se teď nedělá, rozpočet (měsíční strop výdajů, strop PR denně),
mimořádné pokyny. Zamrznutí AI navrhne z kalendáře a zapíše sem. Claude ho čte při každém zpracování.
Je to hlavní nástroj, kterým vlastník řídí.

## 18. Briefing s asistentem zadání

O směru vývoje rozhoduje vlastník na briefingu s asistentem zadání: v **soukromém chatu v aplikaci
Grok Bot**, na poradách v pondělí, ve středu a v pátek v 7:55 i v průběžné konverzaci. Kanál ověřuje
vlastníka tím, že chat patří jen jeho účtu, a aplikace přepis ukládá. Telegram slouží jen pro souhrny.

**Pokyn, který přijde jinou cestou** (e-mail, komentář na GitHubu, zpráva jiného bota), se za rozhodnutí
z briefingu nepočítá, ani když se podepíše jako vlastník.

Riziko u briefingu není podvržení, ale **výklad**: AI může vlastníka pochopit špatně, vágní myšlenku
proměnit v projekt nebo mu připsat rozhodnutí, které neudělal. Proto platí podle druhu rozhodnutí:

| rozhodnutí z briefingu | příklad | platnost | co asistent udělá |
|---|---|---|---|
| **zastavující** | „tenhle směr nechci“, „projekt X zastav“, „tohle teď nedělej“ | **hned**; špatný výklad stojí jen čas | zapíše do Směru vývoje (Teď neděláme) a do rejstříku návrhů, k dotčeným issues a PR přidá `stop` nebo `zamitnuto` s odkazem na zápis |
| **rozjíždějící** | „pojďme dělat Y“, nová priorita, nový projekt | **po potvrzení zápisu** | v chatu shrne doslovnou větu vlastníka a co z ní vyvozuje (cíl, rozsah, priorita, dotčené issues); po „ok“ zapíše do Směru vývoje nebo založí projekt s dokladem `Zdroj: briefing` |
| **úprava** | „ano, ale jinak“, „jen pro Prahu“, „až po přijímačkách“ | **po potvrzení zápisu** | jako rozjíždějící; změnu zapíše do těla issue, komentáře „Změna zadání“ a changelogu (oddíl 10, bod 5) |
| **věci z oddílu 3 kromě směru** (H1, H3, H4) | schválení dávky rozesílky, výdaj nad limit | **po potvrzení zápisu a s odkazem v GitHubu** | jako rozjíždějící; navíc doplní issue s odkazem na zápis, aby rozhodnutí bylo dohledatelné |
| **uvolnění pravomocí AI** (H2) | změna brány, rulesetu, workflows | **jen přes GitHub** | připraví PR k review vlastníka (CODEOWNERS) |

**Nápady AI** (například nová analýza RSS kanálů škol) se nejdřív představí na briefingu: co, proč,
odhad práce a nákladů, oblast. Vlastník je může odmítnout, změnit, nebo pustit hned. Když nereaguje,
běží od představení lhůta 48 h a projekt startuje v režimu L. Projekty zadané vlastníkem a etapy
schválených projektů běží lhůtou jako dosud. Nápady se vedou v **rejstříku návrhů** v soukromém
repozitáři (stav, datum, důvod zamítnutí), aby se zamítnuté nevracely.

Strategický projekt (H5) potvrzením zápisu dostane schválení. Brána ho pozná podle štítku `schvaleno`
z účtu asistenta s dokladem `Zdroj: briefing` a existujícím zápisem; jinde se `schvaleno` od asistenta
nepočítá.

Podmínky:

- Doslovné zápisy a potvrzení se ukládají do soukromého repozitáře vedle Směru vývoje
  (`briefingy/RRRR-MM-DD.md`), ne do veřejného.
- Týdenní přehled vypíše **všechna rozhodnutí připsaná vlastníkovi** za týden s odkazem na zápis.
- Vlastník na briefingu nemusí znát čísla issues; asistent je dohledá a v zápisu vyjmenuje.
- Zastavující rozhodnutí odvolá vlastník jako rozjíždějící, tedy s potvrzením zápisu.

## 19. Denní úloha a pravidla

**Denní úloha** (Routine v Claude Code pod aplikací): přečte Směr vývoje a splatné připomínky, roztřídí
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
| lidské zásahy | merge, `schvaleno` a review z účtu vlastníka týdně | pokles aspoň o tři čtvrtiny |
| fronta | otevřené `navrh`, stáří nejstaršího | nejvýš 3, žádné starší 7 dní |
| doba od hlášení po nasazení, rutina | medián | do 2 dnů |
| doba od zadání po merge, režim L | medián | do 3 dnů |
| regrese | PR revertované nebo opravované do 14 dnů, podle režimu | nejvýš 1 z 10 |
| zastavení druhým klíčem | podíl PR v režimu K se `stop` | sleduje se, cíl se určí po 4 týdnech |

| krok | co dělá AI | práce vlastníka |
|---|---|---|
| 0, hned | upravit #53, zavřít duplikáty #216, #228, #229, #251, PR s odstraněním `auto-fix-issues.yml`, `auto-fix-iterative.yml` a `notify-new-issue.yml` | smazat revizi #53, merge PR |
| 1, týden 1 | PR s pravidly a skills, `rezimy.yml`, labelerem, branou a CODEOWNERS; štítky; třídění; výchozí měřítka; postup nastavení krok za krokem | strojový účet, aplikace, ruleset bez výjimek s bránou a CODEOWNERS, auto-merge, secret pro preview, virtuální karta s limitem, ověřit tarif Neonu (doba obnovy k okamžiku), soukromý repozitář a Směr vývoje, pohledy v UI (asi 2 h jednou); nastavit, aby asistent ukládal zápisy z Grok Bot do soukromého repozitáře |
| 2, týden 2 | ověřit identitu aplikace v cloudu, přepnout identity, zapnout automatický merge, přehled, ověření na preview, denní úloha, příjem oprav od škol, druhý klíč | – |
| 3, týden 3 | režim K pro migrace, nová data, výdaje a e-maily (po ověření rozesílání po vlnách) | – |

Po kroku 3 zbývá vlastníkovi: Směr vývoje a rozhodnutí z oddílu 3. Odhad: desítky minut měsíčně;
ověří ho měřítka.

## 21. Rozhodnutí části A

| | rozhodnutí | doporučuji |
|---|---|---|
| RA1 | Zrušit model ve třech úrovních, štítky `oblast:*` a `projekt` | **ano** |
| RA2 | `navrh` jako jediný štítek „čeká na vlastníka“ | **ano** |
| RA3 | Devět oblastí | **ano** |
| RA4 | Životní cyklus projektu podle oddílu 10 | **ano** |
| RA5 | Úklid `docs/` jako rutina | **ano** |
| RA6 | Strojový účet pro asistenta zadání, GitHub App pro Claude Code všude | **ano** |
| RA7 | Rutina včetně veřejných hlášení s automatickým merge | **ano** |
| RA8 | Drobná zadání a etapy po 48 h bez veta | **ano** |
| RA9 | Zkrácení `CLAUDE.md` přes skills | **ano** |
| RA10 | Ověření na preview dělá AI | **ano** |
| RA11 | Přehled neveřejně, Směr vývoje v soukromém repozitáři | **ano** |
| RA12 | Denní úloha se stropem 5 PR denně | **ano** |
| RA13 | Brána sloučení jako povinná kontrola se zamrznutím | **ano** |
| RA14 | Opravy od škol z portálu a ověřeného e-mailu | **ano** |
| RA15 | Ruleset bez výjimek, i pro vlastníka | **ano** |
| RA16 | Člověk rozhoduje jen oddíl 3, ostatní režimy R, L, K | **ano** |
| RA17 | Druhý klíč s jiným modelem a právem `stop` | **ano** |
| RA18 | Výdaje virtuální kartou do limitu, evidence ve Fakturoidu | **ano**, limit určí vlastník |
| RA19 | Migrace přes větev Neonu v režimu K | **ano**, po ověření tarifu |
| RA20 | Nová data podle politiky přístupu v režimu K | **ano** |
| RA21 | Rozhodnutí o směru na briefingu v Grok Bot: zastavující hned, rozjíždějící a úpravy po potvrzení zápisu | **ano** |
| RA22 | Nápady AI se představují na briefingu, lhůta běží od představení, rejstřík návrhů | **ano** |
| RA23 | Celé `.github/workflows/` pod CODEOWNERS, dokud tokeny vlastníka nenahradí token aplikace | **ano** |
| RA24 | Issue s osobními údaji přesunout do soukromého repozitáře místo mazání | **ano** |
| RA25 | Zadání asistenta je interní jen s dokladem (briefing, ověřená oprava od školy); ostatní e-maily režim K | **ano** |

# Část B: rozšíření podle měřítek

Po čtyřech týdnech provozu části A:

| | rozhodnutí | podmínka |
|---|---|---|
| RB1 | Lhůta L 24 h, lhůta K 48 h | regrese nejvýš 1 z 10 |
| RB2 | Vyšší limit rozsahu rutiny | nejvýš 1 regrese rutiny za 4 týdny |
| RB3 | Vyšší limit karty | výdaje v rozpočtu, žádné zbytečné předplatné |
| RB4 | Projekty do 5 etap bez schválení | projekty z režimu L bez zastavení |

## 22. Přijatá rizika

| riziko | co ho omezuje | co vlastník přijímá |
|---|---|---|
| AI sloučí chybnou změnu | brána a režimy, protokol, druhý klíč, souhrn, revert | chyba může být na webu, než si jí někdo všimne |
| podvržený pokyn ve veřejném hlášení | režim K, druhý klíč, oddělené identity, ruleset bez výjimek | změna, kterou oba modely přehlédnou |
| chybná migrace | větev Neonu, bod obnovy, limit řádků, druhý klíč | ztráta zápisů mezi chybou a obnovou |
| chybný e-mail odběratelům | kouřová zkouška, testovací schránka, rozesílání po vlnách | chyba u prvních 5 % příjemců |
| stížnost na stahování dat | politika přístupu, strop dotazů, ohlášení | zhoršený vztah se školou |
| zbytečný výdaj | limit karty, odůvodnění, rušení nevyužitého | výdaj do limitu |
| AI si rozšíří práva | CODEOWNERS na bránu a režimy, ruleset bez výjimek | – |
| podvržený pokyn v e-mailu asistentovi | zadání bez dokladu jde do režimu K, brána ověřuje doklad v soukromém repozitáři | – |
| AI špatně vyloží briefing | zastavující jen zastavují, rozjíždějící po potvrzení doslovného zápisu, týdenní výpis připsaných rozhodnutí | ztracený čas u špatně vyloženého zastavení |
| odpovědnost provozovatele | právní závazky zůstávají člověku (H3) | AI rozhoduje jeho jménem v mezích režimů |

## Změny návrhu

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
