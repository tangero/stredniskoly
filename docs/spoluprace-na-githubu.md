# Spolupráce na GitHubu

Verze 1.1 · 2. 10. 2026

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
`Termín: RRRR-MM-DD`. Příkaz, který je vypíše a označí splatné, je v `CLAUDE.md` (pravidlo 1).

- Před termínem se připomínka nerealizuje, ani se `schvaleno`.
- Od termínu ji Claude Code se `schvaleno` zpracuje, bez něj ji jen připomene.
- Výstupem vyhodnocení je komentář v issue se zjištěními a doporučením; rozhodnutí z něj dělá Patrick.

První připomínka: #240, vyhodnocení sklizně výpisů aktualit k 8. 10. 2026.

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
| Návrh | `navrh` (bez `schvaleno`) nebo `stop` | **vlastník** |
| Oponentura | `oponentura` (má přednost i před `navrh`): návrh posuzuje workflow Oponentura, pak jde k vlastníkovi | AI |
| Schváleno | `schvaleno` nebo doklad `Zdroj:` v interním zadání, žádný otevřený PR | denní úloha podle Směru vývoje |
| V PR | otevřený PR s `Closes #N` nebo `Souvisí s #N` (CI, review, vypořádání, lhůta) | AI |
| Čeká na souhlas s merge | otevřený PR, brána chce `schvaleno` | **vlastník** |
| Hotovo | zavřené issue | |

Workflow navíc při přidání `schvaleno` odebere `navrh` a při odebrání `schvaleno` vrátí otevřené
interní zadání do `navrh`; řídí se aktuálními štítky issue, ne pořadím doručených událostí. Po sloučení PR odebere `k-overeni` z propojených issues, která zůstala otevřená (etapy projektu). Stavy hledá podle názvu; chybějící stav jen ohlásí varováním v běhu.
Karty PR nemění, kromě pole níže.

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
a `PROJECT_TOKEN` na změnu štítků. Výchozí rozhraní Kimi je `https://api.kimi.ai/coding/`; účet z kimi.com
(Čína) potřebuje proměnnou repozitáře `KIMI_BASE_URL` s hodnotou `https://api.kimi.com/coding/`. Verze Claude
Code je ve workflow připnutá; novější připni až po ověření s Kimi.

Potřebuje secret `PROJECT_TOKEN`, klasický token se scopes `project` a `public_repo` (fine-grained token
do projektu na osobním účtu zapisovat neumí). Token má omezenou platnost; expiraci hlídá týdenní přehled.

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

`veletrhy-snimek` i `csi-weekly-refresh` zakládají PR tokenem `CSI_PR_TOKEN` (fine-grained PAT jen
pro tento repozitář, oprávnění *Contents* a *Pull requests* pro čtení i zápis, #266), takže na něm
povinné kontroly běží a slučuje se běžně. Bez tohoto secretu workflow použije `GITHUB_TOKEN`
a PR jde sloučit zase jen přes bypass. Token má expiraci, obnovuje ho vlastník.

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
