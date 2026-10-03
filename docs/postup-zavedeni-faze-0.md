# Postup zavedení fáze 0: práce vlastníka

Verze 1.0 · 3. 10. 2026 · podle [návrhu řízení vývoje](navrh-rizeni-vyvoje-2027.md), oddíl 20, fáze 0.

Fáze 0 se dělá hned a nezávisle na zbytku návrhu. Cíl: v secrets nezůstane žádný token vlastníka,
produkční klíče nedostane kód z pracovní větve a AI bude mít vlastní identity. Kroky 1 až 7 dělá
vlastník v nastavení GitHubu (přes API nejdou, nebo by je AI dělala s jeho právy), zbytek připraví AI.
Odhad: asi 1,5 h.

Hotové už je (PR s tímto dokumentem): odstraněné workflow `auto-fix-issues.yml`, `auto-fix-iterative.yml`
a `notify-new-issue.yml` i jejich skripty; z #53 je odstraněný e-mail; duplikáty #216, #228 a #251
jsou zavřené.

## Krok 1: smazat revizi #53 (2 min)

Úprava těla e-mail z historie úprav neodstraní.

1. Otevři issue #53, u těla klikni na „edited“ (vedle data).
2. Vyber původní revizi a zvol **Delete revision from history**.
3. Zkontroluj, že v historii úprav už e-mail není.

## Krok 2: strojový účet pro asistenta zadání (20 min)

1. Odhlas se z GitHubu (nebo použij anonymní okno) a založ nový účet, například `eduarda-prijimacky`.
   E-mail: role-schránka na doméně projektu, ne osobní adresa.
2. Zapni dvoufázové ověření **aplikací** (ne SMS). Kódy pro obnovu ulož u sebe, ne u asistenta.
3. Ve svém účtu: repozitář `stredniskoly` → Settings → Collaborators → **Add people** → strojový účet
   s rolí **Write** (ne Admin, ne Maintain).
4. Tabule projektu (`github.com/users/tangero/projects/1`) → Settings → Manage access → přidat strojový
   účet s právem **Write**.
5. Ve strojovém účtu vytvoř dva tokeny (Settings → Developer settings):
   - **fine-grained** token jen na `tangero/stredniskoly` (Contents, Issues, Pull requests: Read and
     write) pro práci asistenta; expirace 1 rok;
   - **classic** token se scopes `project` a `public_repo` pro tabuli (nahradí `PROJECT_TOKEN`; workflow
     mění i štítky issue); expirace 1 rok. Fine-grained token do tabule osobního účtu zapisovat neumí.
6. Classic token ulož v repozitáři jako secret `TABULE_TOKEN` (Settings → Secrets and variables →
   Actions). Fine-grained token předej asistentovi do jeho prostředí, do repozitáře ho nedávej.

## Krok 3: oddělit asistenta od tvého účtu na stejném počítači (20 min)

Asistent zadání běží na tvém počítači, kde potřebuješ `gh` a git pro svůj účet i v jiných projektech.
Odhlásit tvůj účet proto nejde. Podmínka O1 ale vyžaduje, aby prostředí asistenta k tvému přihlášení
**nemělo přístup**. Přepínání účtů v rámci jednoho uživatele systému (`gh auth switch`, proměnná
`GH_TOKEN`, nastavení gitu podle složky) ji nesplní: každý proces pod tvým uživatelem si tvůj token
přečte z `~/.config/gh` nebo z Klíčenky. Asistent proto musí běžet **pod jiným uživatelem systému**.

**Doporučeno: samostatný uživatel macOS.**

1. Nastavení systému → Uživatelé a skupiny → Přidat uživatele: typ **Standardní** (ne správce),
   jméno například `eduarda`.
2. Přihlas se jako `eduarda` (rychlé přepínání uživatelů) a nainstaluj tam, co asistent používá
   (`gh`, git, Node, klon repozitáře).
3. V tom uživateli přihlas `gh` strojovým účtem a nastav git:
   ```bash
   gh auth login --hostname github.com   # strojový účet, token z kroku 2
   gh auth status                        # musí ukázat jen strojový účet
   git config --global user.name  "eduarda-prijimacky"
   git config --global user.email "<ID>+eduarda-prijimacky@users.noreply.github.com"
   ```
4. Procesy asistenta (skripty, napojení z Grok Bot, plánované úlohy) spouštěj pod uživatelem
   `eduarda`, například jako `launchd` agenta toho uživatele.
5. Tvůj uživatel zůstane beze změny: `gh` a git dál pod tvým účtem pro všechny projekty.

Uživatel `eduarda` nesmí mít práva správce, jinak by si tvoje údaje mohl přečíst.

**Náhrada: kontejner.** Když asistent nemůže běžet pod jiným uživatelem, spouštěj jeho práci
v kontejneru (Docker), do kterého se předá jen token strojového účtu a klon repozitáře. Tvůj
`~/.config/gh`, Klíčenka ani SSH klíče se do kontejneru nepřipojují.

**Co nefunguje:** přepnutí účtu jen pro složku projektu nebo proměnná prostředí pod tvým uživatelem.
Je to pohodlné, ale O1 to nesplní a přejímka na zkušebním repozitáři (krok 7) to odhalí.

## Krok 4: GitHub App pro Claude Code (15 min)

1. Settings (tvůj účet) → Developer settings → GitHub Apps → **New GitHub App**.
2. Název například `prijimacky-ai`, Homepage URL adresa webu, **Webhook vypnout**.
3. Repository permissions: **Contents**, **Pull requests**, **Issues**: Read and write; **Metadata**: Read.
   Nic dalšího (hlavně ne Administration, Secrets ani Workflows).
4. „Where can this GitHub App be installed?“ → **Only on this account**.
5. Po založení: **Generate a private key** (stáhne se `.pem`), opiš **App ID**.
6. Install App → jen repozitář `stredniskoly`.
7. Secrets v repozitáři: `AI_APP_ID` (App ID) a `AI_APP_KEY` (obsah `.pem`). Soubor `.pem` pak smaž.

## Krok 5: aplikace brány sloučení (10 min)

Samostatná aplikace, jejíž výsledek bude ruleset ve fázi 1 jediný přijímat (oponentura O3).

1. Stejně jako v kroku 4, název například `prijimacky-brana`, Webhook vypnout.
2. Repository permissions: **Checks**: Read and write; **Issues**, **Pull requests**, **Contents**: Read.
3. Install jen na `stredniskoly`, opiš App ID, vygeneruj klíč.
4. Klíč **neukládej mezi secrets repozitáře**, ale do prostředí `production` (krok 6) jako `BRANA_APP_ID`
   a `BRANA_APP_KEY`.

## Krok 6: prostředí `production` pro produkční klíče (20 min)

Dnes jsou všechny secrets na úrovni repozitáře a dostane je i kód z pracovní větve (oddíl 9b návrhu).

1. Repozitář → Settings → Environments → **New environment** `production`.
2. **Deployment branches and tags** → Selected branches → přidat jen `main`.
3. Do prostředí **zkopíruj** (nastav znovu se stejnou hodnotou) tyto secrets:
   `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `DATABASE_URL`, `TELEGRAM_BOT_TOKEN`,
   `TELEGRAM_CHAT_ID`, `OPENROUTER_API_KEY`, `TINYFISH_API_KEY`, `MAIL_USERNAME`, `MAIL_PASSWORD`,
   `NOTIFICATION_EMAIL`, a z kroku 5 `BRANA_APP_ID`, `BRANA_APP_KEY`.
4. Secrets na úrovni repozitáře **zatím nemaž**. Smažeš je až po kroku 8, jinak se rozbijí běžící workflow.

## Krok 7: zkušební repozitář (5 min)

1. Založ soukromý repozitář `stredniskoly-zkouska` (prázdný, s README).
2. Přidej do něj strojový účet (Write) a nainstaluj obě aplikace.
3. Slouží k přejímkám O1 až O3: z prostředí AI musí selhat změna rulesetu a štítek, komentář nebo review
   tvým jménem; padělaný výsledek brány nesmí projít.

## Krok 8: co připraví AI po krocích 2 až 6

Samostatný PR (AI ho připraví, ty ho sloučíš):

- `tabule-schvaleno.yml`: `PROJECT_TOKEN` → `TABULE_TOKEN` (token strojového účtu);
- `csi-weekly-refresh.yml` a `veletrhy-snimek.yml`: PR zakládá token aplikace
  (`actions/create-github-app-token` s `AI_APP_ID`, `AI_APP_KEY`), takže na nich poběží CI;
- workflow, které běží jen z `main` (datová linka, CSI, sklízeč, snímek veletrhů, zpráva do Telegramu,
  produkční nasazení), dostanou `environment: production`;
- zkušební spuštění každého z nich přes „Run workflow“.

Nasazení náhledu z pracovní větve se řeší zvlášť (úkol „Chránit produkční secrets před kódem z větví“),
protože dnes používá `VERCEL_TOKEN` z větve.

## Krok 9: dokončení (5 min)

Až zkušební spuštění v kroku 8 projdou:

1. Smaž secrets na úrovni repozitáře, které jsou už v prostředí `production`, a `PROJECT_TOKEN`
   a `CSI_PR_TOKEN`.
2. Zruš staré tokeny ve svém účtu (Settings → Developer settings → Personal access tokens).
3. Napiš AI, ať ověří, že workflow běží. Tím fáze 0 končí; fáze 1 se zapne až po přejímkách O1 až O3.
