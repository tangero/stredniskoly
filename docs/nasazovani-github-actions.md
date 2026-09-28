# Build na GitHub Actions, provoz na Vercelu

Workflow `Testy` v `.github/workflows/testy.yml` nejprve ověří Python, TypeScript
a integraci katalogu. Job `deploy` potom na GitHubu sestaví aplikaci a odešle
hotovou `.vercel/output` pomocí `vercel deploy --prebuilt`. Vercel dál zajišťuje
funkce, statické soubory, ISR, domény a cron z `vercel.json`.

## Jednorázové zprovoznění

V repository secrets nastavte `VERCEL_TOKEN`, `VERCEL_ORG_ID` a
`VERCEL_PROJECT_ID`. Token musí mít přístup k týmu projektu. Identifikátory se
ověřují proti projektu stredniskoly; skript odmítne jiný cíl. Secrets ani adresář
`.vercel` se nezveřejňují jako artefakt nebo cache.

Automatické nasazování z Actions je ve výchozím stavu vypnuté. Zapíná ho
repository variable `VERCEL_ACTIONS_ENABLED=true`. Původní Git integraci Vercelu
vypněte až po ověření náhrady; samotné přidání workflow ji nevypíná.

1. Sloučit workflow do `main`, aby se objevil `Run workflow`.
2. Ručně spustit `Testy`, větev `main`, deployment `preview`. Ověřit URL ze
   souhrnu jobu, školní detail, vyhledávání, souborová data a přihlášení.
3. Ručně spustit `production-staged`. Použije produkční prostředí, ale nepřiřadí
   produkční doménu. Ověřit serverové funkce bez odesílání reálných e-mailů.
4. Po ověření publikovat připravenou produkční URL příkazem
   `vercel promote <url> --yes --token="$VERCEL_TOKEN"`, nebo spustit režim
   `production`, který provede celý build a publikaci znovu.
5. Nastavit `VERCEL_ACTIONS_ENABLED=true` a vypnout automatické Git buildy
   Vercelu. V `vercel.json` sloučit nastavení `"git": { "deploymentEnabled": false }`
   se stávající konfigurací včetně cronu. Dostane-li se vypnutí pouze do main,
   staré pracovní větve mohou dál spouštět Vercel buildy; je nutné je aktualizovat
   nebo po ověření CLI nasazování odpojit Git integraci na úrovni Vercel projektu.
6. Ověřit další push do main a vlastní pracovní větve: testy i deploy v Actions,
   žádný souběžný Git build na Vercelu. V účtování následně sledovat Build CPU Minutes.

## Běžný provoz

- Push do `main`: po všech kontrolách produkční build, upload bez přiřazení
  domény, kontrola READY a aktuálnosti SHA, potom publikace.
- Push do vlastní větve: preview po kontrolách. Novější preview ruší překonané.
- Pull request: pouze testy; nasazení vzniká z push běhu vlastní větve. Cizí
  forky ani Dependabot nedostávají deploy secrets.
- Ruční spuštění nabízí `preview`, `production-staged`, `production` a `none`.
  Produkční prostředí lze použít pouze z main. `none` provede pouze testy.
- Job publikuje přesný testovaný commit. Při posunu větve před buildem,
  uploadem nebo přiřazením domény starý commit přeskočí. Chyba čtení refu
  rovněž zabrání publikaci.
- Preview prostředí a produkční prostředí se stahují odděleně. Preview build
  se automaticky nepovyšuje na produkci.
- URL je v souhrnu jobu. CLI nasazení nemusí mít stejné automatické PR komentáře
  a větvové aliasy jako Git integrace.
- Kontroly jsou bez secrets. Build/deploy má k dispozici secrets nutné pro Vercel;
  runtime proměnné aplikace načítá `vercel pull` z odpovídajícího prostředí.
- Cache obsahuje npm a adresáře kompilátoru Next.js, nikoli fetch-cache či `.vercel`.

## Návrat

Při chybě buildu zůstává předchozí nasazení dostupné. Chybnou již publikovanou
verzi vraťte přes Vercel rollback. Pro návrat ke Git buildům nejdříve vypněte
`VERCEL_ACTIONS_ENABLED`, obnovte Git integraci a odstraňte `git.deploymentEnabled=false`.
Pouhé vypnutí Actions při současně vypnuté Git integraci zastaví nová nasazení.

## Zdroje

- [Vercel a GitHub Actions](https://vercel.com/kb/guide/how-can-i-use-github-actions-with-vercel)
- [Vercel CLI deploy](https://vercel.com/docs/cli/deploy)
- [Vypnutí Git deploymentů](https://vercel.com/docs/project-configuration/git-configuration)
