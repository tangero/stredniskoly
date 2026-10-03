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
| `k-overeni` | hotovo v PR, čeká na kontrolu na Vercel preview |
| `pripominka` | úkol s termínem; před termínem se nerealizuje |
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

## 3. Tabule projektu

Projekt **Přijímačky – vývoj webu** (`github.com/users/tangero/projects/1`) se stavy Návrh,
Oponentura, Schváleno, Ke schválení merge a Hotovo. Zapnuté vestavěné automatizace:

| automatizace | co dělá |
|---|---|
| Auto-add to project | přidá každé nové otevřené issue a PR z `stredniskoly` (`is:issue,pr is:open`) |
| Item added to project | nové položce nastaví stav Návrh |
| Item closed | zavřené issue → Hotovo |
| Pull request merged | sloučený PR → Hotovo |
| Auto-add sub-issues to project | přidá dílčí issues |

Ověřeno na PR #242: po založení se objevil v Návrhu, po merge přešel do Hotovo.

- Vestavěné automatizace převádějí jen události, ne štítky. Štítek `schvaleno` proto obsluhuje
  workflow `.github/workflows/tabule-schvaleno.yml`: nastaví Status Schváleno (issue mimo tabuli
  přidá) a odebere štítek `navrh`; u zavřeného issue nic nemění. Odebrání `schvaleno` vrátí
  otevřené issue ze Schváleno do Návrhu (u interního zadání i se štítkem `navrh`). Ruční přesun
  do jiného sloupce workflow nepřepisuje. Potřebuje secret `PROJECT_TOKEN`, klasický token se scopes
  `project` a `public_repo` (fine-grained token do projektu na osobním účtu zapisovat neumí).
  Token má omezenou platnost; po vypršení workflow selže a token je potřeba obnovit.
- Přesun do Oponentury dělá Patrick ručně.
- Auto-add přidává jen položky založené nebo změněné po zapnutí. Starší zavřené věci na tabuli
  doplněné nejsou, kromě těch, které se ručně synchronizovaly 1. 10. 2026.
- „Auto-close issue“ a „Pull request linked to issue“ míří na neexistující stav „Done“ (červený
  vykřičník). Jsou vypnuté; bez opravy cíle je nezapínat.
- Do projektu vidí `gh` jen s oprávněním `project` (`gh auth refresh -s project`).

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

PR z `veletrhy-snimek` zakládá výchozí `GITHUB_TOKEN`, proto na něm CI neběží a sloučí ho jen
admin přes bypass. `csi-weekly-refresh` zakládá PR tokenem `CSI_PR_TOKEN` (fine-grained PAT jen
pro tento repozitář, oprávnění *Contents* a *Pull requests* pro čtení i zápis, #266), takže na něm
povinné kontroly běží a slučuje se běžně. Bez tohoto secretu workflow použije `GITHUB_TOKEN`
a PR jde sloučit zase jen přes bypass. Token má expiraci, obnovuje ho vlastník.

Před merge se dělá review přes `codex review --base origin/main`, nejvýš 10 kol.

## 5. Další nastavení

- Větve se po merge mažou automaticky.
- **Dependabot alerts** zapnuté (1. 10. 2026: 0 nálezů). Automatické PR s aktualizacemi závislostí
  vypnuté: závislosti se mimo zadání nemění (`CLAUDE.md`, pravidlo 6).
- **Secret scanning** a **push protection** zapnuté: GitHub odmítne push s rozpoznaným klíčem.
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
