# Administrace

Administrace webu je na `/admin`. Přístup má jen vlastník. Od #479 se do ní vstupuje passkey nebo účtem vlastníka na GitHubu; token v adrese (`/admin/auth?k=…`, proměnná `ADMIN_TOKEN`) je zrušený, protože končil v logu požadavků a v historii prohlížeče.

## Stránky

| adresa | co ukazuje |
|---|---|
| `/admin` | souhrn oslovených škol, stav datových sad, portálu, hlášení, datové linky, automatizací a novinek |
| `/admin/provoz` | přehled provozu projektu: co čeká na vlastníka, běh automatických tras, sloučené a otevřené PR, regrese, projekty, hlášení, náklady (zatím bez zdroje) |
| `/admin/zabezpeceni` | passkey (přidání, zrušení), odhlášení, posledních 20 událostí přihlášení |
| `/admin/portal`, `/admin/portal/pozvanky` | účty a pozvánky portálu škol |
| `/admin/portal/oslovene` | oslovené školy portálu: souhrn po vlnách (osloveno, se správcem, poslalo návrh) a seznam škol s filtrem „jen se správcem“ a podle vlny; na `/admin` je z něj jen řádek s počty (#488) |
| `/admin/skolni-novinky` | moderace školních novinek |
| `/admin/veletrhy/rozhodnuti` | rozhodnutí o návrhu změny veletrhů (i podepsaným odkazem z e-mailu) |
| `/admin/prihlaseni` | přihlášení |

## Přihlášení

- **Passkey (hlavní cesta).** Otisk prstu, Face ID nebo PIN zařízení, ověření uživatele je povinné. Passkey se dá vylákat ani přeposlat nedá. Registruje se v `/admin/zabezpeceni` po přihlášení přes GitHub; doporučené jsou aspoň dva (telefon a počítač).
- **GitHub (záložní cesta, první přihlášení).** OAuth aplikace vlastníka se scope `read:user`. Projde jen účet s číselným id z `ADMIN_GITHUB_ID` a se zapnutým dvoufázovým ověřením; jiný účet nebo chybějící údaj se odmítne a zapíše. Přístupový token GitHubu se po dotazu na `/user` zahodí.
- **Relace.** Cookie `admin_relace` (HttpOnly, Secure, SameSite=Lax, cesta `/admin`) nese 32 náhodných bajtů; v tabulce `admin_relace` je jen jejich SHA-256. Platnost 8 hodin. Odhlášení ruší jednu relaci, „Odhlásit všechna zařízení“ všechny.
- **Akce** (POST pod `/admin`) ověří relaci a původ požadavku (hlavička Origin musí být tento web). Rozhodnutí o veletrzích přijímá i podepsaný odkaz z e-mailu jako dřív.
- **Výzvy.** Výzva passkey a stav OAuth leží v krátkých cookie (10 minut) podepsaných HMAC-SHA256 klíčem `ADMIN_SECRET`, s účelem a expirací v podpisu.
- **Záznam.** Tabulka `admin_udalost`: přihlášení, odmítnutí, odhlášení, přidání a zrušení passkey. Bez IP adres.

Kód: `src/lib/admin-relace-jadro.ts` (relace, podpisy, bez Next.js), `src/lib/admin-relace.ts` (cookie, stránky, API), `src/lib/admin-github.ts`, `src/lib/admin-passkey.ts` (knihovna `@simplewebauthn/server`, v prohlížeči `@simplewebauthn/browser`), routy pod `src/app/admin/prihlaseni/`, `src/app/admin/zabezpeceni/`, `src/app/admin/odhlaseni/`. Testy: `tests/admin-prihlaseni.test.mjs`.

## Zavedení (vlastník, jednou)

1. Spustit migraci `db/migrace/008-admin-prihlaseni.sql` proti Neonu.
2. GitHub, Settings, Developer settings, OAuth Apps, New OAuth App: Homepage `https://www.prijimackynaskolu.cz`, Authorization callback URL `https://www.prijimackynaskolu.cz/admin/prihlaseni/github/zpet`.
3. Ve Vercelu (Production) nastavit:
   - `ADMIN_GITHUB_CLIENT_ID` a `ADMIN_GITHUB_CLIENT_SECRET` z OAuth aplikace;
   - `ADMIN_GITHUB_ID`, číselné id účtu vlastníka (`https://api.github.com/users/tangero`, pole `id`);
   - `ADMIN_SECRET`, náhodný řetězec (například `openssl rand -base64 32`).
4. Po nasazení se přihlásit přes GitHub, v `/admin/zabezpeceni` přidat passkey na telefonu i počítači.
5. Smazat ve Vercelu `ADMIN_TOKEN`.

Bez migrace nebo proměnných se do administrace nikdo nepřihlásí (přihlašovací stránka řekne proč). Pořadí: migrace a proměnné před sloučením PR.

## Ztráta zařízení

Přihlásit se přes GitHub, v `/admin/zabezpeceni` „Odhlásit všechna zařízení“ a zrušit passkey ztraceného zařízení. Při podezření na únik `ADMIN_SECRET` ho ve Vercelu vyměnit; rozpracovaná přihlášení (10 minut) tím propadnou, relace zůstanou, ty zruší „Odhlásit všechna zařízení“.

## Omezení

- Na náhledech (preview) Vercelu přihlášení nefunguje: OAuth aplikace má callback jen na produkční doméně a passkey je vázaný na doménu, na které vznikl.
- Přehled provozu čte GitHub API při každém načtení s mezipamětí 10 minut (asi 170 dotazů bez mezipaměti, token `GITHUB_TOKEN` z Vercelu zvyšuje limit). První načtení po vypršení mezipaměti trvá několik sekund. Náklady AI zatím nemají zdroj.
- `overAdminToken` v `src/lib/admin.ts` zůstává jen kvůli testům; odstraní se samostatně po ověření nového přihlášení.
