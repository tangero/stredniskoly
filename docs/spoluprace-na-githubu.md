# Spolupráce na GitHubu

Verze 1.4 · 7. 10. 2026

Jak spolu na repozitáři pracují Patrick (schvaluje a slučuje), Eduarda (píše zadání), Claude Code
(realizuje) a komunita (hlásí chyby). Pravidla pro Claude Code jsou závazně v `CLAUDE.md`; tento
dokument popisuje nastavení GitHubu, na kterém stojí.

## 1. Issues a štítky

| štítek | význam |
|---|---|
| `interni` | interní zadání nebo připomínka týmu |
| `navrh` | čeká na schválení Patrickem, nerealizovat |
| `schvaleno` | Claude Code může realizovat; přidává jen Patrick |
| `zamitnuto` | nerealizovat |
| `stop` | veto; PR ani issue se nesloučí; odebrat smí jen ten, kdo ho přidal, nebo Patrick |
| `rutina` | režim R: oprava rozporu z vlastních dat nebo kódu, do 150 řádků v jedné oblasti |
| `projekt` | práce s cílem a etapami; etapy v dohodnutém rozsahu bez lhůty |
| `puvod:hlaseni`, `puvod:email` | zadání z veřejného hlášení nebo neověřeného e-mailu; jen se `schvaleno` |
| `otazka` | AI se ptá vlastníka; otázka mu jde do Telegramu (workflow Otázka vlastníkovi), štítek zmizí po jeho odpovědi |
| `oponentura` | problém pro nový projekt projde oponenturou (workflow Oponentura) a štítek se sám odebere; mezitím nerealizovat |
| `k-overeni` | otevřený PR s protokolem z preview (ověřuje AI, vlastník volitelně); po sloučení ho z otevřeného issue (etapa projektu) odebere workflow Tabule |
| `pripominka` | úkol s termínem; před termínem se nerealizuje |
| `potrebuje-cloveka` | u PR: smyčka oprav z review skončila (strop 5 kol nebo oprava cesty H2), rozhodne člověk; vypisuje ho týdenní přehled |
| `bug-report`, `portal-skoly`, `feature-request` | veřejná hlášení (tlačítko na webu, portál škol) |

**Formuláře v „New issue“** (`.github/ISSUE_TEMPLATE/`):

- **Interní zadání** přidá `interni` + `navrh`. Tělo se stejnými poli pro zakládání přes `gh` je v
  `.github/INTERNAL_TEMPLATES/interni-zadani.md`.
- **Připomínka s termínem** přidá `interni` + `pripominka` a má povinné pole Termín (RRRR-MM-DD).
- Prázdné issue zůstává povolené kvůli komunitě; nabídka odkazuje na hlášení chyb přes web.

Formuláře vidí i veřejnost. Realizaci podmiňuje štítek `schvaleno`, ne formulář.

## 2. Připomínky s termínem

GitHub sám připomínky neposílá. Připomínka je proto issue, které Claude Code najde při každém
zpracování issues: štítek `pripominka` a termín v těle, buď z pole formuláře, nebo řádkem
`Termín: RRRR-MM-DD`. Příkaz, který je vypíše a označí splatné, je ve skillu `trideni-issues` (pravidlo 1 v `CLAUDE.md`).

- Před termínem se připomínka nerealizuje, ani se `schvaleno`.
- Od termínu ji Claude Code se `schvaleno` zpracuje, bez něj ji jen připomene.
- Výstupem vyhodnocení je komentář v issue se zjištěními a doporučením; rozhodnutí z něj dělá Patrick.

První připomínka: #240, vyhodnocení sklizně výpisů aktualit k 8. 10. 2026.

## 2b. Kritéria přínosu a jejich vyhodnocení

Zadání nové funkce nebo změny webu může mít v těle oddíl „Přínos a vyhodnocení“ (pole formuláře, zadání #326).
Druhy kritérií:

- **správnost**: dělá funkce, co tvrdí, změřitelně z vlastních dat (například o kolik se liší výsledek s funkcí a bez ní);
- **použití**: kolik lidí funkci použije a co udělají dál (události v Matomu);
- **vnímání**: krátká otázka na stránce, jen když je to opravdu potřeba;
- **předpoklad**: přínos, který změřit neumíme; zapíše se jako předpoklad s podmínkou, kdy funkci zjednodušit nebo zrušit.

Postup:

1. Řádek `Termín: RRRR-MM-DD` v oddílu je termín vyhodnocení. Ke sloučení zadání založí Claude Code (nebo asistent
   zadání) připomínku (štítek `pripominka`, řádek `Termín:`, odkaz na zadání), zpracuje se podle oddílu 2.
2. Od termínu Claude Code vyhodnocení provede a zapíše komentářem do zadání: co se měřilo, jaká čísla vyšla,
   které kritérium splněno a které ne. Čísla, která nemá z čeho vzít (chybí signál), označí jako nezměřená.
3. Rozhodnutí z vyhodnocení (ponechat, zjednodušit, zrušit) dělá Patrick. Do jeho rozhodnutí funkci nerušíme.

## 2a. Ruční zásahy

Když vlastník ručně odblokuje něco, co měla zvládnout automatika (zaseknutý náhled, restart běhu,
oprava štítku, vysvětlení zadání po otevření PR), zapíše do issue nebo PR komentář, který začíná:

```
Zásah: 10 min - odblokování náhledu
```

Počet minut a krátký důvod. Týdenní přehled zásahy za týden sečte v oddílu Měřítka a vypíše důvody
(zadání #324). Asistent zadání může zásah z briefingu zapsat za vlastníka, ale jen s odkazem na zápis
z briefingu; zásahy z jiných účtů se nepočítají. Nezapsaný zásah přehled nevidí, „minuty vlastníka“
jsou proto dolní odhad.

## 3. Tabule projektu

Projekt **Přijímačky – vývoj webu** (`github.com/users/tangero/projects/1`). Stav karty issue
dopočítává ze štítků a otevřených PR workflow `.github/workflows/tabule.yml` (`scripts/tabule/`)
při každé změně štítků, issues a PR, po každém běhu brány sloučení a jednou denně. Ruční přesun karty se při dalším běhu srovná.

| stav | podle čeho | kdo je na tahu |
|---|---|---|
| Hlášení | veřejná hlášení, připomínky a issues bez stavového štítku | třídění (AI) |
| Návrh | `navrh` (bez `schvaleno`), `stop` nebo `otazka` (AI čeká na odpověď) | **vlastník** |
| Oponentura | `oponentura` (má přednost i před `navrh`): návrh posuzuje workflow Oponentura, pak jde k vlastníkovi | AI |
| Schváleno | `schvaleno` nebo doklad `Zdroj:` v interním zadání, žádný otevřený PR | denní úloha podle Směru vývoje |
| V PR | otevřený PR s `Closes #N` nebo `Souvisí s #N` (CI, review, vypořádání, lhůta) | AI |
| Čeká na souhlas s merge | otevřený PR, brána chce `schvaleno` | **vlastník** |
| Hotovo | zavřené issue | |

Workflow navíc při přidání `schvaleno` odebere `navrh` a při odebrání `schvaleno` vrátí otevřené
interní zadání do `navrh`; řídí se aktuálními štítky issue, ne pořadím doručených událostí. Po sloučení PR odebere `k-overeni` z propojených issues, která zůstala otevřená (etapy projektu). Stavy hledá podle názvu; chybějící stav jen ohlásí varováním v běhu.
Karty PR nemění, kromě pole níže.

**Přehlednost nástěnky (RA48, 7. 10. 2026).** Drobné úkoly projektu nejsou samostatná issues, ale zaškrtávací
seznam v oddílu `## Etapy` issue projektu (mimo `## Rozsah`, takže úprava neruší schválení). PR úkolu nese
„Souvisí s #N“. Sub-issue vzniká jen pro úkol, který potřebuje vlastní rozhodnutí nebo diskusi, a pro hlášení
připojená k projektu (RA39). Nastavení nástěnky dělá vlastník (API je neumí):

- v tabulkovém pohledu zapnout pole **Parent issue** a **Sub-issue progress** (tlačítko + v záhlaví → Hidden fields);
- hlavní pohled s filtrem `no:parent-issue` a uložit: na kartě projektu zůstane jen postup („2/6“);
- druhý pohled „Úkoly“ seskupený podle pole **Parent issue** (Group by) pro detail;
- Workflows → **Auto-archive items** pro zavřené položky (například `is:closed updated:<@today-7d`): hotové karty
  zmizí z nástěnky, issues zůstanou dohledatelné;
- Workflows → „Auto-add sub-issues to project“ vypnout (oddíl 15 návrhu řízení).

Pole **„Na co čeká“** (text, založí ho skript) vyplní workflow u issues i PR jednou větou: výsledek brány lidsky
(chybí protokol, lhůta na veto do…, čeká na tvé schvaleno, konflikt s main, prošlo a sloučí se samo) se stavem
review asistenta zadání k aktuálnímu commitu, u schválených issues bez PR „čeká na realizaci“ nebo postup projektu,
u návrhu „čeká na tvé rozhodnutí“, u připomínky termín a u hlášení projekt, ke kterému patří. Na kartách ho zapneš
v nastavení pohledu (šipka u názvu pohledu → Fields → Na co čeká).

**Oponentura** (`.github/workflows/oponentura.yml`, skill `.claude/skills/oponentura`, #358): slouží při rozjezdu
nového projektu, rutinně se nespouští. Vlastník nebo asistent zadání popíše problém formulářem **Problém pro nový
projekt** (`.github/ISSUE_TEMPLATE/problem.yml`, pro `gh` `.github/INTERNAL_TEMPLATES/problem.md`): co chceme
získat, pro koho, podle čeho poznáme úspěch, mantinely, pohledy k posouzení a nepovinný nápad. Štítek `oponentura`
od vlastníka nebo asistenta pak spustí čtyři fáze: průzkum (Claude Code, smí na web), návrhy naslepo (Claude
a Kimi K3 zvlášť, bez znalosti nápadu z issue), anonymní kritika kandidátů z pohledu hodnot projektu a person
a syntéza (Kimi, náhradně Claude). Komentář `## Oponentura` nese doporučení, 2 až 3 varianty, pohledy person,
rozhodující test a otázky; průzkum, kandidáti i kritiky jsou pod ním sbalené. Pak workflow odebere štítek
a issue bez `navrh` a `schvaleno` vrátí do `navrh`. Issue bez šablony se zpracuje taky (problém odvodí průzkum).
Běh trvá desítky minut. Modely mají jen čtení (průzkum navíc web), každý krok dostane jen svůj klíč.
Secrets: `CLAUDE_CODE_OAUTH_TOKEN`, `KIMI_API_KEY` (klíč z konzole Kimi Code, ne z platform.moonshot.ai)
a token App `prijimacky-ai` na změnu štítků (oddíl 4a). Výchozí rozhraní Kimi je `https://api.kimi.ai/coding/`; účet z kimi.com
(Čína) potřebuje proměnnou repozitáře `KIMI_BASE_URL` s hodnotou `https://api.kimi.com/coding/`. Verze Claude
Code je ve workflow připnutá; novější připni až po ověření s Kimi.

**Otázka vlastníkovi** (`.github/workflows/otazka.yml`, `scripts/brana/otazka.mjs`, #385): AI píše z účtu vlastníka,
takže mu GitHub o jejích otázkách nic neoznámí. Když se ptá, přidá štítek `otazka`; workflow pošle poslední
komentář AI do Telegramu s odkazem. Komentář vlastníka bez patičky AI, nebo zápis jeho odpovědi s nadpisem
„Odpověď vlastníka“ (od něj nebo od asistenta zadání), štítek odebere (tokenem App `prijimacky-ai`, aby se srovnala tabule).

**Automatické obnovy dat** (RA46): PR z větví `auto/veletrhy-snimek` a `codex/csi-weekly-refresh`, které mění jen
cesty uvedené u větve v `datove_obnovy` v `rezimy.yml`, brána pustí v režimu R bez souhlasu a review; po CI se
sloučí samy. Změna jiné cesty se posuzuje jako dřív. Totéž platí pro předání z datové linky (větve `data/*` od App
`prijimacky-ai`, jen výstupy linky): potvrzení „schvaluji KÓD“ je souhlas, druhé `schvaleno` není potřeba (RA49, #440).

**Rutina z automatiky** (RA49): issue se štítkem `rutina`, které založil `github-actions[bot]` (výpadek z hlídání
dostupnosti, regrese z ověření v produkci), bere rutina Claude Code do práce bez dokladu „Zdroj:“ a brána opravu
pustí v režimu R (přes limit rutiny jako L).

**Čeká na tebe** (`.github/workflows/ceka-na-tebe.yml`, `scripts/prehled/ceka-na-tebe.mjs`, #440): denně v 8:52
jedna zpráva do Telegramu, jen když něco čeká na vlastníka. Skupiny: PR ke schválení (věta z oddílu „Pro vlastníka“
a odkaz na stránku v náhledu), otázky, hotové oponentury, návrhy, splatné připomínky, uvízlé opravy z review
a oponentury. Pod každou skupinou pokyn, co udělat, pod zprávou tlačítka na PR nebo issue. Ručně ji spustíš
v Actions (Čeká na tebe, Run workflow).

**Tep rutiny** (`.github/workflows/tep-rutiny.yml`, `scripts/provoz/tep-rutiny.mjs`, #440): rutina Claude Code na
začátku každého běhu spustí workflow Tep rutiny. Kontrola každou hodinu: po 12 hodinách bez tepu přijde zpráva do
Telegramu, pak jednou denně, dokud tep nepřijde. Dokud rutina tep neposílá, kontrola mlčí.

**Selhání oponentury** (#440): workflow odebere štítek `oponentura`, napíše do issue a pošle zprávu do Telegramu;
znovu ji spustíš přidáním štítku.

Tabule potřebuje secret `PROJECT_TOKEN`, klasický token se scopes `project` a `public_repo` (fine-grained token
ani GitHub App do projektu na osobním účtu zapisovat neumí). Token má omezenou platnost; expiraci hlídá týdenní
přehled. Od #403 ho používá jen Tabule (a týdenní přehled na dotaz na expiraci).

Nastavení projektu (dělá vlastník, API stavy neumí měnit):

- stavy: Hlášení, Návrh, Oponentura, Schváleno, V PR (dříve „Ke schválení merge“), Čeká na souhlas s merge, Hotovo;
- Auto-add jen issues: `is:issue is:open -label:trvale`; karty PR archivovat;
- vestavěnou automatizaci „Item added to project“ (nastavuje Návrh) vypnout, stav určuje workflow;
- „Item closed“ může zůstat (Hotovo), „Auto-close issue“ a „Pull request linked to issue“ zůstávají vypnuté.

Do projektu vidí `gh` jen s oprávněním `project` (`gh auth refresh -s project`).

## 4. Ochrana `main`

Ruleset **Ochrana main** (Settings → Rules):

- do `main` jen přes PR;
- musí projít kontroly *Python testy a kontroly dat*, *TypeScript* a *Integrace katalogu*;
- `main` nejde smazat ani přepsat force pushem;
- admin smí pravidla obejít **jen při merge PR, ne přímým pushem**.

Claude Code pracuje s Patrickovým tokenem. Kdyby admin směl obcházet pravidla i přímým pushem,
ochrana by agenta nezastavila. Proto i dokumentace a prototypy jdou přes krátký PR. Přímé pushe
pro admina vrátí přepnutí bypass na *Always*.

Žádný workflow do `main` nepushuje:

- datová linka zapisuje do větve `linka/stav`;
- `csi-weekly-refresh` a `veletrhy-snimek` zakládají PR přes `create-pull-request`.

`veletrhy-snimek` i `csi-weekly-refresh` zakládají PR tokenem App `prijimacky-ai` (oddíl 4a), takže na něm
povinné kontroly běží a brána ho pozná jako automatickou obnovu dat. Bez secrets App krok tokenu selže
a PR nevznikne; náhradní `GITHUB_TOKEN` se záměrně nepoužívá (dřív `CSI_PR_TOKEN`, #266).

## 4a. GitHub App `prijimacky-ai` (automatika ve workflow)

Od #403 (RA47) jedná automatika ve workflow vlastní identitou `prijimacky-ai[bot]`, ne účtem vlastníka.
Token vzniká v každém jobu krokem `actions/create-github-app-token@v3`, platí hodinu, jen pro tento repozitář
a jen s právy, která job potřebuje:

| workflow | k čemu | práva tokenu |
|---|---|---|
| Sloučení (`slouceni.yml`) | žádost o vyhodnocení brány a sloučení PR | contents, pull-requests, issues zápis; checks čtení |
| Otázka vlastníkovi (`otazka.yml`) | odebrání štítku `otazka` | issues zápis |
| Oponentura (`oponentura.yml`, kroky Štítky a Oznámení o selhání) | štítky po oponentuře, odebrání `oponentura` po selhání (#440) | issues zápis |
| CSI Weekly Refresh, Záloha veletrhů | PR s obnovou dat | contents, pull-requests zápis |
| Datová linka | PR z předání schválených dat (jen `gh pr create`, větev pushuje `GITHUB_TOKEN`, #440) | pull-requests zápis, contents čtení |
| Oprava z review (`oprava-z-review.yml`, job Zápis, #410) | push opravy do větve PR, aby testy u PR běžely bez schvalování spuštění | contents zápis |
| Review (`review.yml`, job Zápis, #455) | komentář s automatickým review a žádost `@claude` o opravu (komentář od App spustí bránu i smyčku oprav) | issues, pull-requests zápis; contents čtení |
| Týdenní přehled | jen ověření, že se App přihlásí | metadata čtení |

Brána App věří jen u automatických obnov dat (`automatika` v `rezimy.yml`) a u review se značkou automatického
review (#455, RA50); `schvaleno`, odebrání `stop`, doklad `Zdroj:`, jiné review ani protokol od ní neplatí. Beze změny zůstávají Claude Code v relacích (účet
vlastníka), Eduarda, Tabule (`PROJECT_TOKEN`) a workflow na `GITHUB_TOKEN` (brána, testy, ověření, datová
linka). Push od App nespouští nasazení náhledu (job deploy v `testy.yml`), protože by běžel skript z větve
s `VERCEL_TOKEN`; testy u PR běží normálně.

**Založení (vlastník, asi 15 minut). Pořadí je důležité: nejdřív App a secrets, pak sloučit PR z #403.**
Po sloučení bez secrets by sloučení PR a obnovy dat selhaly.

1. GitHub → Settings → Developer settings → GitHub Apps → New GitHub App. Název `prijimacky-ai`, Homepage
   `https://www.prijimackynaskolu.cz`, Webhook vypnout (Active odškrtnout), „Only on this account“.
2. Repository permissions: Contents **Read and write**, Pull requests **Read and write**, Issues **Read and
   write**, Checks **Read-only**, Metadata **Read-only**. Vše ostatní **No access**, hlavně Administration,
   Workflows, Secrets, Actions a Environments. Žádná práva k účtu.
3. Install App → Only select repositories → `tangero/stredniskoly`.
4. V nastavení App „Generate a private key“; stáhne se soubor `.pem`.
5. Do secrets repozitáře (Settings → Secrets and variables → Actions) vložit `PRIJIMACKY_AI_CLIENT_ID`
   (Client ID z nastavení App, ne App ID) a `PRIJIMACKY_AI_PRIVATE_KEY` (celý obsah souboru `.pem`). Soubor pak smazat.
6. Ruleset „Ochrana main“: App **nepřidávat** do Bypass list.
7. Sloučit PR z #403 a ručně spustit (Actions → Run workflow) Sloučení, CSI Weekly Refresh, Zálohu veletrhů
   a Týdenní přehled. Ověřit, že sloučení a nové PR jsou od `prijimacky-ai[bot]` a že na PR běží povinné kontroly.
8. `CSI_PR_TOKEN` smazat až po dvou týdnech bez chyb; `PROJECT_TOKEN` zůstává pro Tabuli (stačí mu scope `project`
   a `public_repo`, jiná práva neodebírat bez ověření Tabule).

**Únik klíče.** Soukromý klíč App nevyprší a v secrets ho může přečíst kterýkoli workflow z `main`. Při podezření
na únik: v nastavení App smazat klíč (Private keys → Delete); tím přestane platit okamžitě a workflow s App
selžou. Okamžitě odstřihne App i odinstalování z repozitáře (Settings → Applications → Configure → Uninstall).
Pak vygenerovat nový klíč, vyměnit secret `PRIJIMACKY_AI_PRIVATE_KEY` a v historii repozitáře (Pull requests,
štítky) zkontrolovat akce `prijimacky-ai[bot]` od posledního známého dobrého stavu.

Před merge se dělá review přes `codex review --base origin/main`, nejvýš 10 kol.

## 5. Další nastavení

- Větve se po merge mažou automaticky.
- **Dependabot alerts** zapnuté (1. 10. 2026: 0 nálezů). Automatické PR s aktualizacemi závislostí
  vypnuté: závislosti se mimo zadání nemění (`CLAUDE.md`, pravidlo 6).
- **Secret scanning** a **push protection** zapnuté: GitHub odmítne push s rozpoznaným klíčem.
- **Cloudová rutina Claude Code** potřebuje pro `npm test` balíček `openpyxl` (CI si ho instaluje ve workflow
  `Testy`). Setup script prostředí má obsahovat `pip install openpyxl`; bez něj se 8 testových modulů nenačte
  (`ModuleNotFoundError`), což je chyba prostředí, ne kódu. `npm run test:mesto` workflow `Testy` spouští od kroku
  „Testy přehledu města“; pod novějším tsx musí testy tras nastavovat pool přes `createRequire`
  (viz komentář v `tests/veletrhy-api-trasy.test.mjs`).
- **Saved replies** jsou osobní pro každý účet (Settings → Saved replies), přes API se nastavit nedají.

## 6. Otevřené

- **Nález secret scanningu č. 1:** klíč Google Maps JavaScript API v
  `.playwright-mcp/console-2026-02-07T13-03-09-386Z.log` (commit z 7. 2. 2026, soubor stále v `main`).
  Klíče Maps JS jsou v prohlížeči veřejné. Bezpečné jsou jen s omezením na povolené domény v Google
  Cloud. Ověřit omezení, nález uzavřít a log z repozitáře odstranit samostatným PR.
- **Claude Code v GitHubu (`@claude`):** Eduarda by spouštěla Clauda komentářem v issue nebo PR.
  Odloženo. Staré `auto-fix-issues.yml`, `auto-fix-iterative.yml` a `notify-new-issue.yml` jsou od
  3. 10. 2026 odstraněné; spouštění z GitHubu řeší návrh řízení vývoje (oddíl 19: jen štítkem od
  vlastníka, nikdy komentářem `@claude`).
- **Discussions** pro dotazy komunity (oddělit otázky od hlášení chyb) a uložené pohledy tabule
  podle rolí: navrženo, nezavedeno.
