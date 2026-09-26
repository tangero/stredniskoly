# API pro návrhy změn veletrhů (Eduarda → schválení → web)

Verze 1.0 · 26. 9. 2026 · fáze 1 a 2 implementovány, fáze 3 ne

Návazné: [Veletrhy a přehlídky SŠ](veletrhy-skol-2027.md), [zdroje dat, oddíl veletrhů](zdroje-dat.md).

## Stav implementace a odchylky od zadání

Implementováno 26. 9. 2026 (větev `feat/veletrhy-api`). Oddíly níže jsou původní zadání; kde se implementace liší, platí tento oddíl.

**Hotovo:** tabulky `veletrh_akce`, `veletrh_navrh`, `veletrh_audit` (`src/lib/veletrhy-schema.ts`, SQL `db/migrace/005-veletrhy.sql`); seed (`scripts/veletrhy-migrace.mjs --seed` i `POST /api/veletrhy/migrace?seed=1` s `CRON_SECRET`); export snímku (`npm run veletrhy:export`); validátor (`src/lib/veletrhy-validace.ts`); úložiště a přechody stavů (`src/lib/veletrhy-sklad.ts`); API pro Eduardu (`/api/veletrhy/akce`, `/akce/{id}`, `/navrhy`, `/navrhy/{id}`, `/navrhy/{id}/stahnout`); schvalovací e-mail s podepsaným odkazem (`src/lib/veletrhy-schvaleni.ts`); stránka rozhodnutí `/admin/veletrhy/rozhodnuti` a akce `POST /admin/veletrhy/akce`; sekce „Veletrhy: návrhy ke schválení“ na `/admin`; čtení webu z databáze přes jednu sdílenou cache (`src/lib/veletrhy-zdroj.ts`) pro `/veletrhy` i upoutávku na stránce školy a oboru (`VeletrhVMeste`); testy `tests/veletrhy-api-sklad.test.mjs` (PGlite) a `tests/veletrhy-api-trasy.test.mjs` (trasy přes tsx).

**Odchylky:**
- **Chyba provedení se nezapisuje do vrácené transakce.** Schválení nejdřív ověří návrh proti aktuálnímu stavu a teprve pak zapisuje. Když neprojde, nic se neprovede a v téže transakci se jen uloží `schvaleno` + `chyba`. Takový návrh jde už jen zamítnout.
- **Kolize id se hledá napříč sezónami**, ne jen v jedné: id je primární klíč celé tabulky.
- **Jedna trasa rozhodnutí pro obě cesty.** `POST /admin/veletrhy/akce` přijme buď podepsaný token z e-mailu (`t`), nebo cookie `admin_token` (`id`); obojí kontroluje `jeNasPuvod()`. Token Eduardy tam nemá přístup (404).
- **Telefon ve veřejném poli** se pozná podle předvolby +420/00420 nebo tří trojic číslic; PSČ ani čísla popisná tím neprojdou jako falešný poplach.
- **Hodnota `null` v `zmeny`** operace `upravit` maže volitelné pole (`cas`, `poznamkaTerminu`, `cekaNa`, příznaky).
- **Prázdná tabulka akcí** (neproběhl seed) se chová jako výpadek databáze: web čte snímek.
- **Revalidace stránky školy je 12 hodin** (rozhodnutí 26. 9.); veletrhy na ní po schválení obnoví značka `veletrhy`.
- **Otázky z oddílu 13** rozhodnuty takto: migrace jde skriptem i endpointem (1); schvalování e-mailem + `/admin`, Telegram jen jako upozornění, odkaz 14 dní (4); export ručně (5); `checkedAt` se počítá jako max(`overeno`) zobrazitelných akcí (6); sezóna pro varování 1. 8.–31. 7. odvozená od dneška (7); ruční validátory bez zod (9). Otevřené zůstávají 2, 3, 5 (CI), 8, 10, 11.

**Neimplementováno (fáze 3):** auto-publikace, tlačítko „vrátit“, napojení `nahlaseni_id` na stav fronty nahlášení, zakládání návrhu přímo z formuláře.

**Nasazení (pořadí):** 1. ve Vercelu nastavit `VELETRHY_EDA_TOKEN` (≥ 32 B náhodně), `VELETRHY_SECRET`, případně `VELETRHY_SCHVALOVATEL`; 2. po deployi `curl -X POST -H "Authorization: Bearer $CRON_SECRET" "$BASE/api/veletrhy/migrace?seed=1"`; 3. token předat Eduardě. Do seedu web běží ze snímku, takže nasazení samo nic nerozbije.

---


## 0. Cíl v jedné větě

Eduarda (AI agentka, schránka eda@prijimackynaskolu.cz) dnes vyrábí ruční patch soubory (`pridat` / `nahradit` podle `id`) a někdo je musí přepsat do `src/data/veletrhy-2027.json` a nasadit. Nově je pošle přes **HTTP API jako návrh změny**, Patrick ho **schválí jedním klikem** a stránka `/veletrhy` se **obnoví bez deploye**. Mezi nahlášením a zveřejněním dál stojí člověk (pravidlo „nahlášení není zveřejnění“ z `docs/veletrhy-skol-2027.md` § 5.5 platí dál).

## 1. Co v repu už je (ověřeno čtením kódu, na tom stavět)

| Věc | Stav | Důkaz |
|---|---|---|
| Framework | Next.js 16.1.4 (App Router), React 19, TypeScript | `package.json`, `src/app/**` |
| Hosting | Vercel (`vercel.json`: `framework: nextjs`, cron `/api/novinky/odeslat`) | `vercel.json`, `next.config.ts` |
| Databáze | Neon Postgres přes `@neondatabase/serverless`; helper `dotaz()`, `vTransakci()`, `jeDbNastavena()` (env `DATABASE_URL`) | `src/lib/novinky-db.ts` |
| Migrace | SQL se **generuje** z TS modulu (`MIGRACE_*` pole příkazů, jen `create … if not exists`), skript `scripts/*-migrace.mjs`, test hlídá shodu modul ↔ `db/migrace/*.sql` | `src/lib/veletrhy-schema.ts`, `scripts/veletrhy-migrace.mjs`, `tests/veletrhy-schema.test.mjs` |
| Fronta nahlášení | tabulka `veletrh_nahlaseni` (stavy `nove/overeno/zamitnuto/duplicita`), plní ji `POST /api/veletrhy/nahlasit`, e-mail přes Resend (`fetch` na api.resend.com, `RESEND_API_KEY`), příjemce `VELETRHY_PRIJEMCE` | `src/app/api/veletrhy/nahlasit/route.ts` |
| Čtení veletrhů | **statický import** JSON v `src/lib/veletrhy.ts`; stránka `src/app/veletrhy/page.tsx` má `revalidate = 3600`; platnost (proběhlé akce) se počítá při čtení | `src/lib/veletrhy.ts`, `page.tsx` |
| Vzor „DB + cache + JSON záloha“ | `unstable_cache(..., { tags: [TAG], revalidate: 3600 })`, při zápisu `revalidateTag(TAG, { expire: 0 })`, bez DB se čte JSON snímek; export DB → JSON skriptem | `src/lib/portal-profil-verejne.ts`, `src/lib/portal-api.ts`, `scripts/portal-export.mjs` |
| Admin | `/admin`, přístup `ADMIN_TOKEN` (`overAdminToken`, timing-safe) → HttpOnly cookie `admin_token` s `path: '/admin'`; akce jsou form POST pod `/admin/**` s kontrolou `jeNasPuvod()` a povinným důvodem | `src/lib/admin.ts`, `src/app/admin/auth/route.ts`, `src/app/admin/portal/akce/route.ts` |
| Podepsané odkazy | HMAC tokeny `payload.podpis` (base64url), expirace, jednorázovost hlídá stav v DB | `src/lib/novinky-token.ts` (`NOVINKY_SECRET`) |
| Bearer tajemství | `Authorization: Bearer <CRON_SECRET>` + `timingSafeEqual` | `src/app/api/novinky/migrace/route.ts` |
| Rate limit | in-memory `jeOmezeno(klic, max, oknoMs)`, IP přes `ipZPozadavku()` | `src/lib/portal-api.ts` |
| Upozornění | `posliTelegram()` (best-effort, `TELEGRAM_BOT_TOKEN`/`TELEGRAM_CHAT_ID`) | `src/lib/portal-oznameni.ts` |
| Validace | ručně psané validátory (`overVstup`, `jeDatumPlatne`, `jeUrlPlatna`), **zod v závislostech není** | `route.ts` nahlášení, `package.json` |
| Testy | `node:test`; DB testy nad PGlite (`@electric-sql/pglite` v devDeps); CI `.github/workflows/testy.yml` (Node 22, `tsc --noEmit`, `npm run test:js`, `npm run test:mesto`) | `tests/hlaseni.test.mjs`, `tests/veletrhy.test.mjs` |

Pozor na tři věci, které návrh musí respektovat:
- `tests/veletrhy.test.mjs` čte data ze **statického JSON** a kontroluje počty proti `public/stav_datovych_sad.json` a `docs/zdroje-dat.md`. JSON proto nezmizí, stane se **snímkem / zálohou** (viz § 7).
- `/regiony/[kraj]` veletrhy dnes **nezobrazuje**. Data ale čte ještě **upoutávka na stránce školy a oboru** (`src/components/veletrhy/VeletrhUpoutavka.tsx` přes `akceProObec` a `OVERENO_K`, vkládají ji `ProfilSkoly.tsx` a `ProfilOboru.tsx`, obě pod `src/app/skola/[slug]/page.tsx`). Změna se týká obou míst, viz § 6.
- Na `main` je JSON ve stavu z 22. 9. 2026 (`checkedAt: 2026-09-22`, zástupný záznam `khk-zlin-uh-vsetin-2026` tam pořád je). Čtyři patche Eduardy z 24.–25. 9. jsou aplikované ve větvi `feat/veletrhy-dopis-poradatelum`. **Seed se dělá až po jejím sloučení do `main`**, patche tedy přes API neposílat (skončily by 409); prvním ostrým návrhem bude až nová změna.

## 2. Úložiště

Použít **stávající Neon Postgres** (žádné nové úložiště, žádný KV). Nové tabulky doplnit do `MIGRACE_VELETRHU` v `src/lib/veletrhy-schema.ts` (a do `TABULKY_VELETRHU`), SQL přegenerovat přes `--zapis-sql`, spustit `scripts/veletrhy-migrace.mjs`. Jen `create … if not exists`, nic nemazat (hlídá to stávající test).

```sql
-- Aktuální stav akce. Celý objekt v jsonb: pole jsou volitelná a přibývají (terminPribligny, cas…).
create table if not exists veletrh_akce (
  id text primary key,                -- stabilní slug, např. veletrh-vzdelavani-didacta-trebic-2026
  sezona text not null,               -- '2027' (stejně jako SEZONA v JSON)
  data jsonb not null,                -- objekt Veletrh (§ 3), bez interních poznámek
  verze int not null default 1,       -- optimistický zámek pro úpravy
  smazano boolean not null default false,  -- odebrání je měkké, id zůstává rezervované
  vytvoreno timestamptz not null default now(),
  zmeneno timestamptz not null default now()
);

-- Návrh změny = jedna sada operací, schvaluje se a provádí atomicky (odpovídá jednomu patch souboru).
create table if not exists veletrh_navrh (
  id uuid primary key,
  klic text not null,                 -- idempotence (hlavička Idempotency-Key), unique
  autor text not null,                -- 'eduarda' | 'formular' | 'admin'
  operace jsonb not null,             -- pole operací (§ 4.2)
  zdroj_url text,                     -- web pořadatele, kde je údaj ověřený
  zdroj_email text,                   -- odkaz na e-mail (Message-ID / odesílatel / datum) – interní
  nahlaseni_id bigint,                -- volitelně vazba na veletrh_nahlaseni.id
  poznamka text,                      -- interní poznámky (jména, kontakty smí sem, na web ne)
  varovani jsonb not null default '[]',
  stav text not null default 'ceka' check (stav in ('ceka','schvaleno','provedeno','zamitnuto','stazeno')),
  chyba text,                         -- proč se schválený návrh nepodařilo provést
  rozhodl text, rozhodnuto timestamptz, duvod text,
  vytvoreno timestamptz not null default now()
);
create unique index if not exists veletrh_navrh_klic on veletrh_navrh (klic);
create index if not exists veletrh_navrh_stav on veletrh_navrh (stav, vytvoreno desc);

-- Audit: jen přidávat, nikdy neměnit.
create table if not exists veletrh_audit (
  id bigserial primary key,
  cas timestamptz not null default now(),
  kdo text not null,                  -- 'eduarda' | 'admin:zandl' | 'auto' | 'seed' | 'formular'
  udalost text not null,              -- navrh_vytvoren | schvaleno | provedeno | zamitnuto | stazeno | auto_publikace | seed
  navrh_id uuid, akce_id text,
  pred jsonb, po jsonb,               -- stav akce před a po (u provedení)
  zdroj_url text, zdroj_email text
);
create index if not exists veletrh_audit_akce on veletrh_audit (akce_id, cas desc);
```

**Seed:** skript `scripts/veletrhy-seed.mjs` (nebo krok ve stejném migračním skriptu za přepínačem `--seed`) načte `src/data/veletrhy-2027.json` a vloží `akce[]` s `on conflict (id) do nothing`, sezonu vezme z `sezona`, do auditu zapíše `seed`. Idempotentní; pole `katalogy` do DB nejde (na web se nezobrazuje, zůstává v JSON).

**Migrace na produkci:** stávající veletrhový skript vyžaduje `DATABASE_URL` lokálně (23. 9. takto proběhl). Pokud to Patrick nechce, doplnit `GET/POST /api/veletrhy/migrace` chráněné `CRON_SECRET` přesně podle `src/app/api/novinky/migrace/route.ts` (viz otevřené otázky).

## 3. Datový model akce

Beze změny proti rozhraní `Veletrh` v `src/lib/veletrhy.ts` (to je zdroj pravdy; typ exportovat a použít i ve validátoru):

| Pole | Typ | Pravidlo |
|---|---|---|
| `id` | string | slug `^[a-z0-9]+(-[a-z0-9]+)*$`, ≤ 80 znaků, konvence `…-<rok>`; neměnné, unikátní i vůči smazaným |
| `nazev`, `poradatel`, `misto` | string | povinné, ≤ 200 |
| `mesto` | string \| null | null jen u `online: true` nebo nepotvrzené série; **nevázat na `MESTA`** |
| `online` | boolean? | |
| `krajKod` | string | klíč z `krajNames` (`src/lib/kraje.mjs`) |
| `start`, `end` | `YYYY-MM-DD` \| null | platné datum (`jeDatumPlatne`), `end >= start`, `end` inkluzivní |
| `datum` | string \| null | český text pro čtenáře |
| `cas` | string? | čas zvlášť (např. `9:00–16:00`), tak to má stávající JSON (Příbram, Sokolov) |
| `terminPotvrzen` | boolean | `true` ⇒ povinné `start`, `datum`, `url`, `zdrojOvereni`, `overeno` (odpovídá testu „zobrazená akce má termín, odkaz i zdroj“) |
| `terminPribligny`, `zdrojJenAgregator` | boolean? | kterýkoli `true` ⇒ povinné `poznamkaTerminu` |
| `poznamkaTerminu` | string? | veřejná věta k termínu |
| `url` | string \| null | `jeUrlPlatna` (http/https, ≤ 500) |
| `zdrojOvereni` | string \| null | **krátký veřejný zdroj** (doména, „formulář + web pořadatele“) |
| `overeno` | `YYYY-MM-DD` \| null | ≤ dnes (Europe/Prague, `cesskyDen()`) |
| `cekaNa` | string? | povinné, když `terminPotvrzen: false` |

Neznámá pole odmítnout (whitelist). Pole `typPoradatele` z návrhu v docs § 6.2 ve skutečných datech **není**, nezavádět.

**Osobní údaje:** Eduardiny patche dávají do `zdrojOvereni` jména a e-maily lidí (např. „Naděžda Kočí, nadezda.koci@…“). Repo je veřejné a JSON snímek se do něj commituje, přitom docs § 8.5 říká, že kontakty na osoby na web nepatří. Validátor proto **odmítne e-mailovou adresu a telefonní číslo v každém veřejném poli** a tyhle údaje patří do `zdroj_email` / `poznamka` návrhu (DB, neveřejné).

## 4. API

Všechny trasy vracejí JSON, chyby jsou ve tvaru `{ error, chyby?: [{ pole, zprava }] }`. Bez `DATABASE_URL` vracejí 503 (vzor `novinky/migrace`).

### 4.1 Pro Eduardu: `Authorization: Bearer $VELETRHY_EDA_TOKEN`

| Metoda a cesta | Co dělá |
|---|---|
| `GET /api/veletrhy/akce?vse=1` | seznam akcí včetně nepotvrzených a `verze` (bez `?vse` jen zobrazitelné) |
| `GET /api/veletrhy/akce/{id}` | detail + `verze` + posledních 20 auditních záznamů |
| `POST /api/veletrhy/navrhy` | založí návrh (sadu operací). Hlavička `Idempotency-Key` je povinná, opakování se stejným klíčem vrátí původní návrh. `?nanecisto=1` jen zvaliduje a vrátí diff, nic neuloží |
| `GET /api/veletrhy/navrhy?stav=ceka` | vlastní návrhy podle stavu |
| `GET /api/veletrhy/navrhy/{id}` | detail návrhu vč. stavu, `chyba`, `duvod` zamítnutí |
| `POST /api/veletrhy/navrhy/{id}/stahnout` | stáhne návrh, jen ze stavu `ceka` |

Token Eduardy **nesmí** schvalovat, zamítat ani číst `/admin`. Kontrola tokenu je timing-safe (`timingSafeEqual`, jako `jeOveren` v migraci).

Odpovědi: `201` návrh založen (`{ id, stav, varovani[], diff }`), `200` nanečisto, `400` validace, `401` token, `409` konflikt (duplicitní id, nesedí `ocekavanaVerze`), `429` limit.

### 4.2 Operace v návrhu

```jsonc
{ "op": "pridat",  "akce": { /* celý objekt Veletrh */ } }
{ "op": "upravit", "id": "…", "ocekavanaVerze": 3, "zmeny": { "url": "…", "cas": "9:00–16:00" } }
{ "op": "odebrat", "id": "…", "duvod": "zástupný záznam nahrazen dvěma akcemi" }
```
Patchový `nahradit` = `odebrat` + N× `pridat` v jednom návrhu. `upravit` nesmí měnit `id`; výsledek sloučení musí projít celou validací (§ 5). Návrh má 1–20 operací.

### 4.3 Pro Patricka (schvalování)

**Zvolená nejjednodušší cesta: e-mail s podepsaným odkazem + potvrzovací stránka.** Po založení návrhu odejde přes Resend (`from: noreply@prijimackynaskolu.cz`) e-mail na `VELETRHY_SCHVALOVATEL` (výchozí `patrick@zandl.cz`). V e-mailu je čitelný diff (pole před → po, zdroj URL, reference e-mailu, varování) a odkaz
`https://www.prijimackynaskolu.cz/admin/veletrhy/rozhodnuti?t=<token>`.

- Token: HMAC-SHA256 se `VELETRHY_SECRET`, stejný formát jako `vytvorToken`/`overToken` v `novinky-token.ts`, payload `{ navrhId, exp }`, platnost 14 dní. Jednorázovost zajistí stav návrhu v DB.
- **GET nic nemění** (e-mailové skenery odkazy předem otevírají). Stránka ukáže diff a dvě tlačítka: formulář `POST` se `Schválit` / `Zamítnout` (+ důvod, u zamítnutí povinný). POST ověří token znovu a kontroluje `jeNasPuvod()`.
- Příjemce schvalovacího e-mailu **nesmí být eda@**, jinak by si Eduarda mohla návrh schválit sama. Kontrola při startu a test.
- Přehled pro jistotu: sekce „Veletrhy: návrhy ke schválení“ na `/admin` (čte `veletrh_navrh where stav in ('ceka','schvaleno')`), akce přes `POST /admin/veletrhy/akce` s cookie `admin_token`, vzor `src/app/admin/portal/akce/route.ts`. Trasy musí ležet pod `/admin`, protože tam cookie platí.
- Volitelně `posliTelegram('🗓 Nový návrh veletrhu: …')`.

**Schválení = jedna transakce:** `select … for update` návrhu (musí být `ceka`) → stav `schvaleno` → provedení operací nad `veletrh_akce` (znovu validace proti **aktuálnímu** stavu a kontrola `verze`) → `provedeno` + audit `pred`/`po` → `commit` → `revalidateTag('veletrhy', { expire: 0 })` a `revalidatePath('/veletrhy')`. Když provedení selže (id mezitím existuje, verze nesedí), transakce se vrátí, návrh zůstane `schvaleno` s vyplněnou `chyba` a admin ho vidí k řešení (zamítnout nebo nechat Eduardu poslat nový). Dvojí kliknutí je neškodné: druhé najde stav ≠ `ceka` a jen oznámí výsledek.

## 5. Validace (`src/lib/veletrhy-validace.ts`, čisté funkce, bez závislostí)

Ručně psaný validátor ve stylu `overVstup`. `jeDatumPlatne` a `jeUrlPlatna` přesunout z `route.ts` nahlášení do sdíleného modulu a použít v obou. Výsledek je `{ chyby[], varovani[] }`. Chyby blokují, varování se ukážou Patrickovi v e-mailu.

Chyby (blokují):
- pravidla z tabulky § 3, neznámá pole, e-mail/telefon ve veřejném poli;
- `pridat` s `id`, které existuje (i smazané) → 409;
- **minulá akce**: `(end ?? start) < cesskyDen()` → chyba, pokud operace nenese `"povolitMinulou": true` (oprava historie);
- přesná duplicita: stejné `start` + normalizované `mesto` (malá písmena, bez diakritiky) + normalizovaný `nazev`.

Varování (neblokují):
- možná duplicita: stejné `start` a `mesto`, nebo stejné `mesto` a překryv termínů. Reálný případ: Jeseník má dvě různé akce (Scholaris 22. 10., Burza 6. 10.), proto to nesmí být tvrdá chyba;
- `datum` neobsahuje den z `start`; čas je v `datum` místo v `cas` (patche 25. 9. to tak dělají);
- termín mimo sezónu (pro `2027` mimo 2026-08-01 až 2027-07-31, hranice viz otevřené otázky);
- `url` vede jen na titulní stránku domény (patche to samy přiznávají u Žatce a Ústí).

## 6. Zveřejnění bez deploye

`src/lib/veletrhy.ts` se přepíše takhle:
- čisté funkce `zobrazitelneZ(akce, ke)` a `cekajiciZ(akce)` (dnešní logika beze změny, testy je volají s polem);
- `async nactiAkce()`: když `jeDbNastavena()`, čte `select data from veletrh_akce where not smazano and sezona = $1` přes `unstable_cache(..., ['veletrhy-akce'], { tags: ['veletrhy'], revalidate: 3600 })`, jinak **a při chybě DB** vrací JSON snímek (vzor `portal-profil-verejne.ts`: stránka nikdy nespadne);
- `async zobrazitelneAkce(ke)`, `async cekajiciAkce()`, `async overenoK()` = max(`overeno`) zobrazitelných akcí (náhrada `OVERENO_K`/`checkedAt`, patche stejně navrhují kořenové `checkedAt` posouvat);
- `overSezonuProtiRegistru()` zůstává, sezóna pro dotaz se bere z registru.

`page.tsx` jen přejde na `await`.

**Stránka školy a oboru (rozhodnuto 26. 9. 2026, varianta B):** upoutávka čte ze **stejné** cache jako `/veletrhy` (jedna položka `veletrhy-akce` pro celou sezónu, žádná cache po školách ani po městech). `akceProObec` a `OVERENO_K` přejdou na async funkce nad `nactiAkce()`, `VeletrhUpoutavka` se stane async serverovou komponentou. Neon tak dostane řádově jeden dotaz za hodinu plus jeden po schválení, nezávisle na počtu stránek i návštěvnosti. Stránka školy má `revalidate = 43200` (12 hodin); po schválení ji obnoví `revalidateTag('veletrhy')` líně při další návštěvě, žádné hromadné přegenerování. `revalidatePath` stačí na `/veletrhy`. Proběhlé akce mezi revalidacemi dál skrývá klientský `VeletrhSkryvani`. Zamítnuté varianty: nechat upoutávku na JSON (rozpor s `/veletrhy` do deploye), klientský fetch (náklady rostou s návštěvností, SEO), Global Config/Blob (nové úložiště bez přínosu). `revalidate = 3600` a klientský přepočet dne zůstávají. Po schválení je změna vidět při dalším požadavku díky `revalidateTag` a `revalidatePath`, bez buildu. `VeletrhySeznam` (klient) dál nesmí importovat data ani DB (pravidlo z `veletrhy-pocty.ts`).

## 7. JSON jako snímek

`scripts/veletrhy-export.mjs` podle `scripts/portal-export.mjs`: DB → `src/data/veletrhy-2027.json` (zachová `checkedAt`, `sezona`, `zdroj`, `poznamka`, `katalogy`, akce seřadí podle `start`, pak `id`). Přepínač `--kontrola` jen hlásí rozdíl. Export se pouští ručně a commituje, třeba jednou týdně. Na snímku dál běží stávající testy dat a počty v registru a `docs/zdroje-dat.md`. **Web na exportu nezávisí**, slouží jako záloha, historie v gitu a zdroj pro build bez DB.

## 8. Auto-publikace (fáze 3, výchozí VYPNUTO)

Env `VELETRHY_AUTOPUBLIKACE=vypnuto|zapnuto`, chybějící hodnota znamená `vypnuto`. Při `zapnuto` se návrh provede hned (audit `kdo='auto'`, Patrick dostane oznámení s odkazem „vrátit“), jen když platí vše najednou:
- všechny operace jsou `upravit` existující akce s `terminPotvrzen: true`;
- mění jen pole z `AUTO_POLE = ['url', 'cas']` (plus doprovodné `overeno`, `zdrojOvereni`);
- validace nevrátila žádné varování.

Nikdy automaticky: `pridat`, `odebrat`, `start`/`end`/`datum`, `terminPotvrzen`, `nazev`, `mesto`, `krajKod`. „Vrátit“ založí inverzní návrh ze záznamu `pred` v auditu a rovnou ho provede (je to admin akce).

## 9. Bezpečnost a limity

- Env (konvence repa: VELKÁ_PÍSMENA, tajné ve Vercelu): `VELETRHY_EDA_TOKEN` (≥ 32 B náhodně), `VELETRHY_SECRET` (podpis odkazů), `VELETRHY_SCHVALOVATEL` (výchozí patrick@zandl.cz), `VELETRHY_AUTOPUBLIKACE`. Dál se používají `DATABASE_URL`, `RESEND_API_KEY`, `ADMIN_TOKEN`, volitelně `TELEGRAM_*`. Chybějící token znamená, že API vrací 401/503 a nic nepovoluje.
- Rate limit (`jeOmezeno` z `portal-api.ts`, v paměti instance): 30 návrhů za hodinu a 300 čtení za hodinu na token; neplatný token 10× za 15 min na IP (`ipZPozadavku`), pak 429 s `Retry-After`. K tomu tvrdý strop v DB: víc než 50 návrhů ve stavu `ceka` znamená 429.
- Tokeny a tajemství nikdy do logů ani do auditu.
- Eduarda zpracovává cizí e-maily (riziko prompt injection). Obranou je právě lidské schválení, validace whitelistem a to, že token neumí nic jiného než navrhovat.
- Retence: `zdroj_email` a `poznamka` mohou nést jména a adresy pořadatelů. Mazat je spolu s adresami v `veletrh_nahlaseni` (docs § 6.3: 12 měsíců od konce sezóny) a doplnit to do stránky ochrany osobních údajů.

## 10. Postup po fázích (každá fáze = samostatný PR)

1. **Čtení + seed.** Schéma (`veletrh_akce`, `veletrh_navrh`, `veletrh_audit`), seed z JSON, `nactiAkce()` s cache a zálohou, `GET /api/veletrhy/akce[/{id}]` s tokenem, export skript. Kritérium: `/veletrhy` i upoutávka na stránce školy vypadají stejně jako dnes a test porovná `zobrazitelneAkce` z DB (PGlite) a z JSON, výsledky se musí rovnat.
2. **Návrhy + schválení.** Validátor, `POST/GET /api/veletrhy/navrhy`, `stahnout`, e-mail se signed linkem, stránka rozhodnutí, sekce v `/admin`, provedení v transakci + revalidace, audit. První ostré použití: nejbližší nová změna od Eduardy (patche z 24.–25. 9. jsou už v seedu). Před seedem zkontrolovat, že `zdrojOvereni` v JSON neobsahuje jména a e-maily, jinak by seed neprošel validací.
3. **Volitelně.** Auto-publikace (vypnutá), tlačítko „vrátit“, napojení formuláře: `nahlaseni_id` v návrhu, po provedení `veletrh_nahlaseni.stav = 'overeno'`, po zamítnutí `zamitnuto`/`duplicita`. Později může `POST /api/veletrhy/nahlasit` zakládat návrh s `autor='formular'` rovnou; ten se nikdy nepublikuje sám, Eduarda ho doplní o ověření.

Ve stejné dávce aktualizovat `docs/veletrhy-skol-2027.md` (§ 6.1 a § 6.3 dnes říkají „statický import“ a „automatický přepis z fronty není v návrhu“, § 8.4 „administrace se nestaví“), `CHANGELOG.md` a `docs/zdroje-dat.md`.

## 11. Testy (node:test, DB přes PGlite jako `tests/hlaseni.test.mjs`)

- schéma: rozšířit `tests/veletrhy-schema.test.mjs` (nové tabulky se zakládají, SQL je vygenerované, stavy v CHECK);
- validátor: reálné akce z patchů projdou; e-mail v `zdrojOvereni` neprojde; minulá akce bez `povolitMinulou` neprojde; `end < start`, neznámý `krajKod`, neznámé pole neprojde; Jeseník Burza vedle Scholaris dá jen varování;
- auth: bez tokenu 401; token Eduardy na schválení 401/404; schvalovatel = eda@ znamená chybu konfigurace;
- stavy: `ceka → provedeno`; dvojí schválení provede změnu jednou; `zamitnuto`/`stazeno` nejde provést; konflikt verze nechá `schvaleno` + `chyba`; idempotence `Idempotency-Key`;
- GET na stránce rozhodnutí nic nezmění;
- auto-publikace: bez env nic neprovede; se `zapnuto` provede jen `url`/`cas`;
- upoutávka: stránka školy ve městě s akcí z DB ukáže akci, po schválení odebrání zmizí (mock `revalidateTag`); upoutávka i `/veletrhy` čtou stejnou položku cache;
- čtení: bez `DATABASE_URL` i při výjimce DB se vrací JSON snímek; po provedení se volá `revalidateTag('veletrhy')` (mock);
- nové testy s relativními importy a příponou `.ts` pouštět v `npm run test:js`; testy, které importují přes alias `@/`, přidat do `test:mesto` (tsx), jak to repo dělá dnes.

## 12. Jak ji bude volat Eduarda

```bash
BASE=https://www.prijimackynaskolu.cz
# 1) Zkontrolovat, jestli akce už není (a zjistit verzi)
curl -s -H "Authorization: Bearer $VELETRHY_EDA_TOKEN" "$BASE/api/veletrhy/akce?vse=1"

# 2) Přidat akci – Didacta Třebíč (patch 2026-09-25), nejdřív nanečisto, pak ostře
curl -s -X POST "$BASE/api/veletrhy/navrhy?nanecisto=1" \
  -H "Authorization: Bearer $VELETRHY_EDA_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: patch-2026-09-25-didacta-trebic" \
  -d @- <<'JSON'
{
  "operace": [{
    "op": "pridat",
    "akce": {
      "id": "veletrh-vzdelavani-didacta-trebic-2026",
      "nazev": "Veletrh vzdělávání Didacta",
      "poradatel": "Okresní hospodářská komora Třebíč",
      "mesto": "Třebíč",
      "krajKod": "CZ063",
      "misto": "Střední škola stavební Třebíč, Kubišova 1214",
      "start": "2026-10-15",
      "end": "2026-10-15",
      "datum": "15. října 2026",
      "cas": "od 9:00",
      "terminPotvrzen": true,
      "url": "https://www.ohktrebic.cz/akce-a-seminare/veletrh-vzdelavani-didacta-2026/",
      "zdrojOvereni": "ohktrebic.cz; formulář nahlášení",
      "overeno": "2026-09-25"
    }
  }],
  "zdrojUrl": "https://www.ohktrebic.cz/akce-a-seminare/veletrh-vzdelavani-didacta-2026/",
  "zdrojEmail": "formulář /veletrhy/nahlasit 2026-09-25, Reply-To reditel@ohktrebic.cz",
  "poznamka": "Konec akce pořadatel neuvádí – 16:00 nevymýšlet."
}
JSON
# → 200 { "platne": true, "varovani": [], "diff": [...] }; bez ?nanecisto → 201 { "id": "…", "stav": "ceka" }

# 3) Nahradit zástupný záznam dvěma akcemi (patch 2026-09-24, Zlínský kraj)
curl -s -X POST "$BASE/api/veletrhy/navrhy" \
  -H "Authorization: Bearer $VELETRHY_EDA_TOKEN" -H "Content-Type: application/json" \
  -H "Idempotency-Key: patch-2026-09-24-zlin-uh-vsetin" \
  -d '{
  "operace": [
    { "op": "odebrat", "id": "khk-zlin-uh-vsetin-2026", "duvod": "zástupný záznam bez termínu, rozepsán na dvě akce" },
    { "op": "pridat", "akce": { "id": "veletrh-vzdelavani-uherske-hradiste-2026", "nazev": "Veletrh vzdělávání Uherské Hradiště",
      "poradatel": "Krajská hospodářská komora Zlínského kraje", "mesto": "Uherské Hradiště", "krajKod": "CZ072",
      "misto": "Klub kultury Uherské Hradiště, Hradební 1198", "start": "2026-11-11", "end": "2026-11-11",
      "datum": "11. listopadu 2026", "terminPotvrzen": true, "url": "https://www.khkzk.cz/veletrhy-vzdelavani",
      "zdrojOvereni": "khkzk.cz; e-mail pořadatele", "overeno": "2026-09-24" } },
    { "op": "pridat", "akce": { "id": "veletrh-vzdelavani-vsetin-2026", "nazev": "Veletrh vzdělávání Vsetín",
      "poradatel": "Krajská hospodářská komora Zlínského kraje", "mesto": "Vsetín", "krajKod": "CZ072",
      "misto": "Dům kultury, Svárov 1055, Vsetín", "start": "2026-11-24", "end": "2026-11-24",
      "datum": "24. listopadu 2026", "terminPotvrzen": true, "url": "https://www.khkzk.cz/veletrhy-vzdelavani",
      "zdrojOvereni": "khkzk.cz; e-mail pořadatele", "overeno": "2026-09-24" } }
  ],
  "zdrojUrl": "https://www.khkzk.cz/veletrhy-vzdelavani",
  "zdrojEmail": "e-mail KHK ZK (Grygerová) 2026-09-23"
}'

# 4) Úprava – Žatec dostane dedikovanou stránku akce (patch 25. 9. to předjímá; URL doplní Eduarda z e-mailu)
curl -s -X POST "$BASE/api/veletrhy/navrhy" \
  -H "Authorization: Bearer $VELETRHY_EDA_TOKEN" -H "Content-Type: application/json" \
  -H "Idempotency-Key: zatec-url-<datum>" \
  -d '{ "operace": [{ "op": "upravit", "id": "vystava-skol-vzdelavani-zatec-2026", "ocekavanaVerze": 1,
        "zmeny": { "url": "<URL_STRÁNKY_AKCE_OD_POŘADATELE>", "overeno": "<YYYY-MM-DD>" } }],
      "zdrojUrl": "<URL_STRÁNKY_AKCE_OD_POŘADATELE>", "zdrojEmail": "e-mail pořadatelky <datum>" }'

# 5) Stav návrhu
curl -s -H "Authorization: Bearer $VELETRHY_EDA_TOKEN" "$BASE/api/veletrhy/navrhy/<id>"
```

Pravidla pro Eduardu: jedna sada operací = jeden patch; `Idempotency-Key` odvodit z názvu patche; jména a e-maily lidí patří jen do `zdrojEmail`/`poznamka`; čas psát do `cas`, ne do `datum`; nejdřív `?nanecisto=1`.

## 13. Otevřené otázky pro Patricka

1. Migrace a seed na produkci: skript s lokálním `DATABASE_URL` (jako 23. 9.), nebo nový endpoint `/api/veletrhy/migrace` chráněný `CRON_SECRET`?
2. Mají preview deploymenty Vercelu vlastní (prázdnou) Neon databázi? Na tom závisí, kde se API testuje.
3. Kde běží Eduarda a jak jí předat `VELETRHY_EDA_TOKEN` (trezor tajemství na její straně)?
4. Schvalování: stačí signed link v e-mailu na patrick@zandl.cz, nebo chcete i Telegram / jen `/admin`? Platnost odkazu 14 dní je v pořádku?
5. Má zůstat ruční export do JSON a jak často, nebo ho pouštět CI (s tajným `DATABASE_URL` v GitHubu)? Počty v `public/stav_datovych_sad.json` a `docs/zdroje-dat.md` se pak aktualizují při exportu.
6. `checkedAt`: počítat jako max(`overeno`), nebo nastavovat ručně?
7. Hranice sezóny pro varování (návrh: 1. 8. 2026 až 31. 7. 2027) a zda někdy povolit zpětné úpravy proběhlých akcí.
8. Auto-publikace: souhlasíte s `url` + `cas` jako jedinými „nízkorizikovými“ poli, až ji jednou zapnete?
9. Přidat `zod`, nebo zůstat u ručních validátorů jako zbytek repa (návrh: ruční, žádná nová závislost)?
10. Má se `veletrh_nahlaseni` z formuláře automaticky měnit na návrh (fáze 3), nebo to nechat na Eduardě?
11. Neověřeno: jestli je `VELETRHY_PRIJEMCE` na produkci pořád eda@ (docs to tvrdí k 23. 9., v kódu je výchozí redakce@).
