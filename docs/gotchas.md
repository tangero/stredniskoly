# Gotchas: co není vidět z kódu

Neočekávané chování a předpoklady, na které se narazilo při práci. Nový poznatek zapiš sem ve stejném PR,
ve kterém na něj narazíš (krátce: co se stane, proč, co s tím). Oprava, která problém odstraní, záznam smaže.

## GitHub a brána

- **Push tokenem `GITHUB_TOKEN` nespustí testy normálně.** Události z tohoto tokenu nové běhy workflow nezakládají
  nebo je nechají čekat na ruční schválení (`action_required`), takže commit nedostane testy ani bránu. Workflow, která pushují nebo mění štítky, proto používají token App `prijimacky-ai`
  (`docs/spoluprace-na-githubu.md`, oddíl 4a).
- **Každý nový commit v PR restartuje lhůtu L**, i commit, který jen sloučí `main` do větve. Do čekajícího PR
  nepushuj kosmetické změny.
- **Souhlas `schvaleno` na PR s cestou H2 platí jen pro jeden commit.** Úpravu H2 dodej v jednom commitu;
  každý další commit potřebuje nový souhlas.

## Build a testy

- **Lokální `npm run build` může spadnout na limit 60 s pro předgenerování stránky**, když je počítač vytížený
  (jiné procesy, vysoká zátěž). Nejde o chybu změny; ověř v CI nebo na náhledu a napiš to do PR.

## SEO

- **Strojové podoby stránek školy (`/skola/{slug}.md`, `.json`) Google považuje za duplicity stránky.** Bez kanonické
  adresy je Search Console hlásí jako „Duplicitní stránka bez kanonické verze vybrané uživatelem“. Odpovědi proto nesou
  hlavičku `Link: <…/skola/{slug}>; rel="canonical"` (`hlavickyOtevrenychDat` v `src/lib/skola-otevrena-data.ts`, #405).
  Nová strojová podoba stránky potřebuje tutéž hlavičku.
