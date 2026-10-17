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

- **Oznámení opravy oznamovateli (#441):** workflow Ověření v produkci má jediný krok s produkční databází (`HLASENI_DATABASE_URL`) a Resendem; kód větví se tam nespouští, jen `main`. Skript nesmí do výpisu vypsat text výjimky z databáze (může nést adresu). Postup: `docs/oznameni-opravy-oznamovateli.md`.

- **Přihlášení do administrace (#479):** `src/lib/admin-relace.ts` importuje `next/headers`, který v testech pod plain node neprojde (`ERR_MODULE_NOT_FOUND`); testy proto importují `admin-relace-jadro.ts` bez Next.js. Passkey je vázaný na doménu (rpID = hostname požadavku), takže passkey z produkce na náhledu Vercelu nefunguje a OAuth aplikace GitHubu má callback jen na produkci: administrace na náhledech přihlásit nejde.

## Data CERMAT

- **Zaměření oboru se mezi 1. a 2. kolem téhož roku mění.** Škola ho doplní až ve 2. kole, vynechá, změní velikost
  písmen nebo opraví překlep; `ID_SOF` se mezi koly liší. Párování jen přes přesné zaměření ztratilo 153 ze 1 060
  nabídek 2. kola 2026. Proto `sparuj` v `scripts/build-druhe-kolo.py` páruje zbytek bez zaměření, jen jednoznačně (#282).

## Název školy

- **Úřední název školy po přejmenování nebo sloučení opravuje `src/data/opravy-nazvu-skol.json` (#476).** Rejstřík
  MŠMT (`nazvy-oboru.json`) se obnovuje po čtvrtletích, takže nový název se v něm objeví se zpožděním. Oprava přebije
  `uplny_nazev` v nadpisu stránky školy a v identifikaci v portálu. Zkrácený název v katalogu a adresa stránky se
  nemění (zkratku katalogu tvoří datová linka). Záznam má dva důvody: (1) rejstřík název ještě nenese, pak se záznam
  odstraní, až ho rejstřík ponese; (2) portál (`src/lib/portal-skol.ts`, `getNazevSAdresou`/`getNazevSkoly`) bere
  název z katalogu, ne z rejstříku, a záznam ho tam opravuje i tehdy, když ho rejstřík už nese (600005089, #319);
  takový záznam se odstraní, až portál převezme název z rejstříku.
