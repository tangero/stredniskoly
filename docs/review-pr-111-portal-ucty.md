# Code review PR #111 – účty škol pro pilot

- **PR:** [#111 feat(portal): účty škol pro pilot – správce, editoři, historie změn, Profil spravuje](https://github.com/tangero/stredniskoly/pull/111)
- **Větev:** `feat/portal-ucty` (HEAD `a3640b5`), základ `main`
- **Rozsah:** 56 souborů, +4 457 / −136
- **Datum review:** 2026-09-19
- **Metoda:** čtení celého diffu (`git diff main...HEAD`) ve čtyřech paralelních průchodech (bezpečnost/API, DB a testy, admin a UI, data/konfigurace/dokumentace) + ověřovací běhy.

## Verdikt

**Schválit až po opravě dvou vysokých nálezů** (PII do veřejných GitHub issues, neúplná anonymizace při výmazu) a ideálně i středních. Architektura je jinak v dobrém stavu: append-only historie s částečným unikátním indexem je skutečná pojistka, tokeny jsou HMAC s timing-safe porovnáním, GET nemá side-effecty (Safe Links scénář pokrytý správně), kódy jsou v gitu i DB jen jako hashe.

## Ověření tvrzení z PR

| Tvrzení | Výsledek |
| --- | --- |
| `npx tsc --noEmit` bez chyb | potvrzeno, exit 0 |
| Testy portálu 63/63 | prochází – aktuálně 20/20 portálové testy, celá sada 203/203 (PGlite = reálný Postgres v procesu) |
| `next build` ověří Vercel | **Vercel deployment skončil errorem** (stav FAILED v PR od 2026-09-19 07:53 UTC). Před mergem nutné zjistit příčinu – PR to předpokládal, ale deploy neprošel. |
| Kódy v gitu jen hashe | potvrzeno: 23 záznamů (3 revokované + 20 pilotních), všechny 64hex SHA-256, žádný plaintext, žádné e-maily |
| `pilot.json` = 20 škol, seed 20260919 | potvrzeno; REDIZO 1:1 odpovídají novým hashům; osobní údaje žádné |

## Nálezy

### Vysoká závažnost

1. **Jméno, funkce a e-mail editora se zapisují do veřejných GitHub issues** – `src/app/api/portal-skoly/route.ts:204-205` (`**Zadal (interní, nepublikovat):** …`). Repozitář `tangero/stredniskoly` je veřejný, takže „interní, nepublikovat" je kontradikce – osobní údaje jsou fakticky zveřejněné, navíc i za editory, jejichž jména web podle vlastní dokumentace „nezveřejňuje nikdy". E-mail v issue je pre-existing pattern z `main`, ale PR přidává jméno a funkci, takže expozici rozšiřuje. Zásadní je i kolize s §7 dokumentace: anonymizace na žádost vyčistí DB (`anonymizujOsobu`), ale GitHub issue zůstane navždy.
   - *Náprava:* do issue dát jen `role_id`/iniciály a jméno s e-mailem držet výhradně v DB (`portal_udalost.detail`), nebo issues přesunout do privátního repozitáře.

2. **Neúplná anonymizace (GDPR výmaz)** – `src/lib/portal-ucty.ts:640-658` (`anonymizujOsobu`) přepíše jméno/e-mail jen v `portal_role`. Ale `uplatniKod` a `zalozSpravceZRejstriku` zapisují do `portal_udalost.detail` surové `{jmeno, funkce, email}` (`portal-ucty.ts:283,313`) a admin stránka je po „výmazu" dál zobrazuje (`src/app/admin/portal/page.tsx:245`, `JSON.stringify(u.detail)`). E-mail pozvaného zůstává i v `portal_pozvanka.email`. Text v `PortalZalozeni.tsx:106-115` přitom slibuje „v historii změn profilu, dokud nepožádáte o výmaz". Test (`tests/portal-ucty.test.mjs:204-213`) kontroluje jen `portal_role`, takže díru neodhalí.
   - *Náprava:* při anonymizaci projít `portal_udalost` dotčených redizo/osob a z `detail` klíče `jmeno`/`email`/`kontakt` odstranit (`detail - 'jmeno' - 'email'`), anonymizovat i `portal_pozvanka.email`, a rozšířit test.

### Střední závažnost

3. **Admin může udělit souhlas se zveřejněním jména za cizí osobu** – `src/app/admin/portal/page.tsx:50-53` + `src/app/admin/portal/akce/route.ts:50,61`. Souhlas má dávat dotyčný sám (tak to popisuje FAQ a `predejSpravcovstvi` souhlas záměrně nedědí, `portal-ucty.ts:438-439`). Admin ale checkboxem zapne publikování jména kohokoli.
   - *Náprava:* v admin akcích `zverejnit_jmeno` nepřijímat (ponechat stávající hodnotu / vždy `false`).

4. **Povinný důvod se u zrušení pozvánky zahodí** – `akce/route.ts:41,70-71` vyžaduje `duvod`, ale `zrusPozvanku` (`portal-ucty.ts:609-620`) žádný parametr pro důvod nemá; do `portal_udalost.detail` zapíše jen `{pozvanka, provedl}`. Důvod přežije jen v ephemeral Telegram zprávě – auditní stopa „každý zásah má důvod" tím má díru.
   - *Náprava:* přidat `duvod` parametrem do `zrusPozvanku` a zapsat do detailu události.

5. **`dosadSpravce` nechytá kolizi 23505** – `src/lib/portal-ucty.ts:487`. Na rozdíl od `uplatniKod`/`zalozSpravceZRejstriku` propadne souběžné dosazení (dva admini, nebo souběh s `uplatniKod`) jako syrová DB chyba → 500.
   - *Náprava:* try/catch s `jeKolize` → `skola_ma_spravce`. Přidat test.

6. **Nonce se spotřebuje mimo transakci** – `src/app/api/portal/email/route.ts:18`, `src/app/api/portal/prihlasit/route.ts:26`. Když následná transakce (`zmenRoli`) spadne, jednorázový odkaz je spálený a změna se neprovedla – uživatel musí žádat nový.
   - *Náprava:* volat `spotrebujOdkaz` uvnitř stejné `vTransakci`.

7. **`uplatniKod` překládá jakoukoli 23505 na `skola_ma_spravce`** – `portal-ucty.ts:275-280`. Editor školy bez správce, který uplatní kód vlastní školy, narazí na index `portal_role_osoba_skola` a dostane zavádějící hlášku „Škola už správce má". Cesta „povýšit editora kódem" chybí.
   - *Náprava:* rozlišit constraint v `jeKolize(chyba, 'portal_role_osoba_skola')` a vrátit přesnější chybu (nebo povýšení implementovat).

8. **Nesolené SHA-256 hashe kódů ve veřejném repozitáři** – `data/portal/kody.json` + `src/lib/portal-skol.ts:150`. Entropie kódu je 12 znaků z abecedy 31 ≈ 59 bitů (`scripts/portal-generate-codes.js:26-37`). Útočník může offline hledat kolizi s jedním z 20 aktivních hashů (~2^55 pokusů v průměru – na GPU farmě týdny). Riziko zmírňuje Telegram alert a kontrola domény při uplatnění, ale teď, před rozesláním pozvánek, je změna nejlevnější.
   - *Náprava:* HMAC/pepř z env (`PORTAL_MAGIC_SECRET`) místo holého SHA-256.

### Nízká závažnost

9. **Rate limiting jde obejít spoofnutím IP** – `src/lib/portal-api.ts:40-42` (a `portal-magic/route.ts:46-47`) berou **první** položku `x-forwarded-for`, kterou si klient nastaví sám. Dopad je malý (entropie kódů ~60 bitů, magic endpoint má druhý limit per e-mail), ale ochrana je slabší, než komentáře tvrdí. Na Vercelu použít poslední položku nebo `x-real-ip`.
10. **Chybějící origin kontrola → login/logout CSRF** – `jeNasPuvod` je jen v `/api/portal/ucet` a `/admin/portal/akce`; chybí v `prihlasit/route.ts:19`, `email/route.ts:10`, `odhlasit/route.ts:4` a `pozvanka`. Cross-site POST může přihlásit oběť do účtu útočníka nebo ji odhlásit. Dopad malý, jeden řádek to sjednotí.
11. **Anti-enumerace `/api/portal-magic` je jen textová, ne časová** – `route.ts:76-87` čeká na Resend API před odpovědí; rejstříková adresa je tak časově rozpoznatelná (leak malý – rejstříkové adresy jsou veřejné). Odeslání e-mailu přes `waitUntil` a odpovídat okamžitě.
12. **Opakované pozvánky na stejný e-mail** – `vytvorPozvanku` (`portal-ucty.ts:523-547`) kontroluje jen roli, ne otevřenou pozvánku; chybí částečný unikátní index na `(redizo, lower(email))`. Dvojklik vytvoří dvě platné pozvánky.
13. **`dosadSpravce` TOCTOU** – `portal-ucty.ts:467-469` čte `spravceSkoly` bez zámku a zamyká až druhým dotazem (funkčně kryté `zamkniPlatnou`, ale zbytečné).
14. **Souběžná migrace může spadnout** – `create index if not exists` není v Postgresu race-safe; dva preview deploye → duplicate relation → 500 (transakce nic neničí, retry projde). Zdokumentovat.
15. **PII v serverových logách při chybějícím Telegram tokenu** – `portal-oznameni.ts:13` loguje první řádek zprávy (jméno/e-mail editora) přes `console.log`. Logovat jen typ události.
16. **Výběr pilotních škol není reprodukovatelný** – `pilot.json` deklaruje `seed: 20260919`, ale výběrový skript v repozitáři není. Přiložit ho nebo zdokumentovat, kde žije.
17. **Generátor kódů umí zapsat plaintext mimo gitignore** – `scripts/portal-generate-codes.js:156-160`: `--out` zapisuje kamkoli; `.gitignore` chrání jen výchozí cestu. Přidat kontrolu/varování.

### Nity

- `jeOmezeno` nikdy nemaže klíče z Map – pomalý růst paměti (`portal-api.ts:27-38`, `portal-magic/route.ts:18`).
- Session token na 30 dní je bezstavový, bez server-side revokace/rotace; ukradená cookie platí do expirace. U tohoto portálu přijatelné, zvažte zdokumentovat (`portal-relace.ts:21-29`).
- Rejstříkový magic odkaz není jednorázový ani vázaný na zadaný e-mail – přeposlaný odkaz v okně 72 h umožní založit správce komukoli (`uplatnit/route.ts:44-49`). Zjevně vědomý design (Telegram hlásí doménový nesoulad), ale zdokumentovat jako akceptované riziko.
- Komentář „jednorázový návrh jako host" v `src/app/pro-skoly/link/[token]/page.tsx:22-23` lže – magic token se po odeslání návrhu nespotřebovává, po 72 h lze posílat opakovaně. Přepsat komentář nebo spotřebovávat.
- `PortalUcet.tsx:197`: `setPozvat('')` smaže zadaný e-mail i po neúspěchu (akce vždy resolve).
- `email/route.ts:22-27`: osoba bez rolí dostane „Novou adresu jsme potvrdili", přestože se nic nezměnilo.
- Admin formuláře: pole jen s `placeholder`, bez `<label>`/`aria-label`; výsledky hledání bez `aria-live`.
- Tabulka `portal_odkaz` (spotřebované nonce) nemá expiraci ani čištění – poroste donekonečna. Cron delete starších než max. platnost tokenu.
- Schéma nehlídá `plati_do > vytvoreno` ani formát e-mailu checkem – validace jen v aplikační vrstvě.
- Pozvánka (`docs/podklady/pozvanka-pilot-uctu-portalu.md:24`) slibuje odvolání souhlasu „jedním kliknutím"; implementace je checkbox + „Uložit". Přeformulovat.
- Dokumentace `docs/ucty-portalu-skol-2027.md:46` neuvádí sloupec `prijal_role_id` tabulky `portal_pozvanka`.

## Chybějící testy

- Kolize 23505 v `dosadSpravce` (nasimulovatelná i sekvenčně nad PGlite).
- Expirace pozvánky (`plati_do < now()` → `pozvanka_neplatna`).
- Chybové větve `predejSpravcovstvi` (správce→správce, jiná škola) a `zrusPozvanku` – vůbec netestovány.
- Migrace route: 401 bez/se špatným `CRON_SECRET`, 503 bez `DATABASE_URL`, idempotence 2× POST naživo (teď jen textové asserty).
- Spotřebování nonce při selhání následné práce (nález č. 6).
- Anonymizace osoby s rolemi ve více školách; anonymizace `portal_udalost.detail` (nález č. 2).
- Změna e-mailu na adresu jiné existující osoby.

## Co je udělané dobře

- **Append-only jádro:** změny transakční (`vTransakci` všude v API routes), řádkové zámky `select … for update`, částečný unikátní index skutečně brání dvěma platným správcům (ověřeno testem surovým insertem).
- **Tokeny a kódy:** `crypto.randomInt`, ~60 bitů entropie; HMAC-SHA256 tokeny s `timingSafeEqual`; typované tokeny se vzájemně nepřijímají; kódy v gitu i DB jen hashe, plaintext mimo git.
- **Safe Links scénář:** žádný GET se side-effectem – přihlášení/změna e-mailu/pozvánka se spotřebují až POSTem tlačítka, atomicky (`insert … on conflict do nothing`).
- **Relace:** httpOnly, secure v produkci, sameSite=lax; role se čtou z DB při každém požadavku, takže administrativní zrušení platí okamžitě.
- **Souhlas se jménem:** vymáhaný na jediném veřejném čtení (`verejniSpravci` maskuje už v SQL), editorům vynucen `false`, předání správcovství nedědí, odvolání invaliduje cache.
- **Admin:** stejný `overAdminToken` jako dosud (timing-safe, 404 při selhání), origin check, PRG redirect, povinný důvod (kromě nálezu č. 4).
- **SQL všude parametrizované; XSS:** žádné `dangerouslySetInnerHTML` s uživatelským obsahem, HTML e-maily escapují.
- **Migrace:** idempotentní, bez destruktivních operací, jedna transakce, `CRON_SECRET` přes `timingSafeEqual`.
- **Čistota diffu:** žádné localhost URL, testovací e-maily mimo testy, TODO/FIXME ani zakomentované bloky. Dokumentace je konzistentní s implementací a poctivě přiznává odchylky.
- **`@electric-sql/pglite` jen jako devDependency** – oprávněně, testy běží nad reálným Postgresem.

## Doporučený postup

1. Opravit nálezy 1 a 2 (blokují merge) – oba se týkají osobních údajů a po nasazení se budou opravovat hůř.
2. Ideálně ve stejném PR: nálezy 3–8 (střední); nález 8 (solení hashů) je nejlevnější **před** rozesláním pozvánek.
3. Vyšetřit padlý Vercel deployment.
4. Nízké/nity založit jako follow-up issues; doplnit testy dle seznamu výše.

---

# Re-review po opravách (2026-09-19, HEAD `b235a9f`, opravný commit `55402ff`)

Všechna tvrzení autora ověřena přímo v kódu, testy a tsc reálně spuštěny ve worktree.

## Verdikt: SCHVALUJI merge

Všech 8 původních nálezů (2 vysoké, 6 středních) i všechny nízké/drobnosti opraveny a ověřeny. Nové testy jsou kvalitní (asertují obsah DB nad PGlite, ne placeholder). Znovuověření: `tsc --noEmit` čistý, **212/212 testů prochází**. Lint je červený jen kvůli pre-existing chybám z `main` (11 errorů v souborech, kterých se větev nedotkla); jediný warning větve je nepoužitá `TABULKY_PORTALU` v `tests/portal-schema.test.mjs:4`.

## Ověření jednotlivých oprav

| Nález | Stav | Důkaz |
| --- | --- | --- |
| 1. PII v issue | POTVRZENO | `portal-skoly/route.ts:123` – jen „Zadal: správce/editor profilu…"; `verejnyPayload` odsekne `kontakt_email` (`portal-skol.ts:274-278`); moderace počítá s absencí kontaktu (`scripts/portal-moderace.js:113,133`) |
| 2. Neúplný výmaz | POTVRZENO | události ukládají jen názvy změněných polí (`portal-ucty.ts:356-362`); `anonymizujOsobu` (ř. 689-727) čistí `portal_role`, `portal_pozvanka` i klíče z `portal_udalost.detail`; test skenuje všechny tabulky s PII |
| 3. Admin souhlas | POTVRZENO | route umí jen `zverejnit_jmeno: false` (`akce/route.ts:50`), checkbox se nabízí jen při aktivním souhlasu |
| 4. Důvod zrušení pozvánky | POTVRZENO | `zrusPozvanku` zapisuje `duvod` do `portal_udalost.detail` (`portal-ucty.ts:647-669`), test ověřuje |
| 5. Kolize v `dosadSpravce` | POTVRZENO | 23505 → `PortalChyba('skola_ma_spravce')` (`portal-ucty.ts:522-528`), test simuluje souběh |
| 6. Nonce mimo transakci | POTVRZENO | `spotrebujOdkaz` uvnitř `vTransakci` (`prihlasit/route.ts:30-42`, `email/route.ts:24-31`), test dokazuje rollback |
| 7. Kolize osoba×škola | POTVRZENO | `jeKolize(chyba, 'portal_role_osoba_skola')` → `uz_ma_roli` (`portal-ucty.ts:279-281`) |
| 8. HMAC pepř | POTVRZENO | `hashKod` = HMAC-SHA256 s `PORTAL_KOD_PEPPER`, **fail-closed** (bez pepře výjimka / `validateKod` vrací null – žádný tichý fallback); generátor bez pepře exit 1 a `--out` povoluje jen gitignorovanou cestu; `kody.json` v2 = 20 nových hashů, staré nesolené smazané |
| IP z Vercel hlavičky | POTVRZENO | `x-real-ip`, jinak poslední položka `x-forwarded-for` (`portal-api.ts:48-52`) |
| Origin kontrola | POTVRZENO | `jeNasPuvod` v `prihlasit`, `odhlasit`, `email`, `pozvanka` i `ucet` |
| Odpověď hned, e-mail potom | POTVRZENO | `after()` z `next/server` (`portal-magic/route.ts:77-87`) – správně: serverless funkce zůstane živá, na rozdíl od holého fire-and-forget |
| Jedna otevřená pozvánka | POTVRZENO | částečný unikátní index `portal_pozvanka_otevrena` (`002-portal.sql:55-56`) + app-náhrada staré pozvánky |
| PII v logu | POTVRZENO | fallback loguje jen typ události (`portal-oznameni.ts:13-14`) |
| E-mail jiné osoby | POTVRZENO | `email_obsazen` v `zmenRoli` (`portal-ucty.ts:379-388`) vč. testu |
| Skript výběru pilotu | POTVRZENO | `scripts/portal-vyber-pilotu.py` spuštěn – **stejných 20 rediz ve stejném pořadí** jako `pilot.json` |
| Akceptovaná rizika | POTVRZENO | `docs/ucty-portalu-skol-2027.md` §9.2 (relace 30 dní, nejednorázový rejstříkový odkaz, souběh migrace, rostoucí `portal_odkaz`) |

## Nové (nízké) reziduální nálezy – neblokují merge

- **Výmaz kontaktu hosta bez účtu nemá UI cestu:** host z rejstříkového odkazu má e-mail v `portal_udalost.detail.kontakt`, ale admin UI nabízí výmaz jen u řádků `portal_role` (`admin/portal/page.tsx:229-235`). Kód to přiznává v komentáři; pilot zatím takové záznamy nemá.
- **Insert editorského záznamu v `dosadSpravce` je mimo try/catch na kolizi** (`portal-ucty.ts:496-505`) – souběh dvou admin zásahů na stejnou osobu skončí generickým „Zásah selhal". Marginální.
- **Kontrola `email_obsazen` je app-level select, ne unikátní index** – teoretický souběh dvou osob nárokujících tutéž adresu by prošel; prakticky nepravděpodobné (změna vyžaduje odkaz z té adresy).
- Volný text `nesrovnalost` jde do veřejného issue dál – obsah od uživatele, stejně jako texty polí; přijatelné.

## Zbývající úkoly mimo PR (na provozu, ne na kódu)

1. Nastavit na Vercelu `PORTAL_KOD_PEPPER` (stejnou hodnotu jako v `.env.local` – bez ní jsou kódy fail-closed, takže portál kódy odmítne, nikoli nebezpečně přijme) + `TELEGRAM_BOT_TOKEN` a `TELEGRAM_CHAT_ID`.
2. Padající Vercel preview: „Resource provisioning failed" po 1,6 s bez buildu je konzistentní s hypotézou selhání integrace (např. Neon větev nad limitem); v repozitáři žádná příslušná konfigurace není (`vercel.json` čistý), takže kontrola patří do Vercel → Integrations / Storage. Blokuje jen preview, ne kód.
3. Zvážit úpravu starších issues s labelem `portal-skoly`, které mohou obsahovat e-maily z doby před opravou nálezu 1.
4. Po mergi: migrace `/api/portal/migrace` (s `CRON_SECRET`), pak end-to-end test na testovací škole, teprve potom rozeslat pozvánky.
