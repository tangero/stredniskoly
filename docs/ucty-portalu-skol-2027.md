# Účty portálu pro školy: správce, editoři a pilot 20 škol

Verze 1.2 · 19. 9. 2026 · Schváleno zadavatelem 19. 9. 2026, kroky 1–6 realizovány.

Navazuje na [portál pro školy](portal-pro-skoly-2027.md) (v1.5). Ten dnes pracuje s kódem vázaným na školu: kdo kód zná, edituje, a o osobě nevíme nic. Pilot s 20 školami potřebuje vědět, **kdo** za školu data zadává, ukázat to veřejně a umět to změnit.

## 1. Rozhodnutí zadavatele (19. 9. 2026)

| Otázka | Rozhodnutí |
|---|---|
| Kdo za školu odpovídá | osobní účet; **jméno a funkce správce se zobrazí veřejně** se souhlasem |
| Kolik editorů | víc; první, kdo uplatní kód, je **správce** a zve kolegy; kód se tím spotřebuje |
| Změny správce a sporné případy | administrace; každá změna je **nový záznam**, který zneplatní starší, s časem a autorem změny |
| Odpovědi školám | Eduarda (AI asistentka, přiznává to v podpisu) odpovídá sama; kódy nezná, změny účtů dělá jen člověk (Patrick Zandl) |
| Rozeslání | ručně z `eda@prijimackynaskolu.cz`, kód v textu, 20 škol ze seznamu zadavatele |
| Sledování | přehled 20 škol v `/admin` a upozornění na Telegram |
| Otevřená data a odznak | v pilotu se nestaví, v e-mailu jen „připravujeme“ |
| Termín rozeslání | do dvou týdnů, cíl začátek října (školy vypisují dny otevřených dveří) |

## 2. Model: záznamy se nepřepisují

Požadavek: založení nebo úprava vždy přidá nový záznam s tím, kdo a kdy ho přidal, a zneplatní starší. Historie se tedy nikdy nemaže a pro každou školu jde kdykoli říct, kdo byl správcem k libovolnému dni.

### 2.1 Tabulky (Neon, stejná databáze jako odběr novinek)

**`portal_role`** — kdo smí za školu editovat. Jediná tabulka s historií osob.

| Sloupec | Význam |
|---|---|
| `id` | uuid záznamu |
| `redizo` | škola |
| `osoba_id` | stabilní identita osoby napříč změnami e-mailu a jména |
| `role` | `spravce` / `editor` |
| `email`, `jmeno`, `funkce` | údaje platné od `platne_od` |
| `zverejnit_jmeno` | souhlas se zobrazením jména a funkce na webu (jen u správce) |
| `platne_od` | kdy záznam vznikl |
| `zneplatneno` | kdy ho nahradil novější záznam nebo zrušení; `null` = platný |
| `nahrazuje_id` | který starší záznam tento nahradil |
| `zmenu_provedl` | `kod`, `rejstrik-odkaz`, `pozvanka:<id>`, `sam` (osoba si opravila jméno), `admin:<kdo>` |
| `duvod` | povinné u `admin:*`, jinak volitelné |

Platí: pro jedno `redizo` smí existovat nejvýš jeden platný záznam `spravce` (částečný unikátní index `where role='spravce' and zneplatneno is null`). Změna e-mailu, jména nebo funkce = nový řádek se stejným `osoba_id` a `nahrazuje_id`, starý dostane `zneplatneno`. Obojí v jedné transakci. Co se změnilo, se čte porovnáním dvojice řádků, nic se neodvozuje z logu.

**`portal_kod_uplatneni`** — kódy dál žijí v `data/portal/kody.json` (v gitu jen hash), jejich spotřebování ale v databázi, protože repozitář se za běhu nezapisuje. Kód platí, když není zrušený v JSON **a** nemá uplatnění. Sloupce: `kod_hash`, `redizo`, `role_id`, `uplatneno`.

**`portal_pozvanka`** — `id`, `redizo`, `email`, `role` (`editor`, výjimečně předání správce), `pozval_role_id`, `vytvoreno`, `plati_do` (7 dní), `prijato`, `zruseno`.

**`portal_udalost`** — provozní stopa pro `/admin` a Telegram: `redizo`, `role_id`, `typ` (`kod_uplatnen`, `prihlaseni`, `navrh_odeslan`, `pozvanka_odeslana`, `pozvanka_prijata`, `role_zmenena`, `role_zrusena`, `odkaz_vyzadan`), `kdy`, `detail` (jsonb bez tokenů a kódů).

### 2.2 Vstupy

| Vstup | Kdy | Výsledek |
|---|---|---|
| Kód z pozvánky | škola nemá správce | formulář jméno, funkce, e-mail, souhlas se zveřejněním; vznikne `spravce`, kód je spotřebovaný |
| Odkaz na e-mail z rejstříku | škola nemá správce | totéž jako kód (rejstříková adresa je kotva důvěry, [portál §2.1](portal-pro-skoly-2027.md)) |
| Odkaz na e-mail z rejstříku | škola správce **má** | žádná změna role; editace jako host, návrh se v issue označí „od rejstříkové adresy, správce je X“; správci přijde upozornění |
| Pozvánka | správce pozval kolegu | vznikne `editor` |
| Odkaz na vlastní e-mail | osoba s platnou rolí | přihlášení; odkaz platí 72 h a jednou, session 30 dní v podepsané cookie |

Každý požadavek s cookie znovu ověří, že role je platná (`zneplatneno is null`). Zrušení v administraci tedy platí okamžitě, ne až po vypršení cookie.

Kód se z adresy (`/pro-skoly/KOD`) po uplatnění přesměruje pryč a nové pozvánky ho do adresy nedávají: formulář na `/pro-skoly` ho odešle metodou POST. Kód pak nezůstává v historii prohlížeče ani v přístupových lozích.

### 2.3 Co správce smí

Upravit svoje jméno, funkci a e-mail (nový e-mail se potvrdí odkazem), odvolat souhlas se zveřejněním, pozvat a odebrat editory, **předat správcovství** jinému editorovi (nový záznam `spravce`, starý se stane `editor` nebo zanikne). Nesmí se zbavit role, aniž by škola měla dalšího správce; odejít jde přes předání nebo přes nás.

### 2.4 Administrace (`/admin/portal`)

Pro sporné případy. Každá akce vyžaduje `duvod` a zapíše nový záznam, nic nemaže:

- změnit správci e-mail, jméno nebo funkci;
- dosadit nového správce (starý zneplatněn), například po odchodu ze školy nebo když kód uplatnil nesprávný člověk;
- zrušit roli editora;
- vydat škole nový kód (spustí `portal-generate-codes.js --force` jen jako instrukci; zápis hashe jde commitem) — v pilotu stačí;
- u každé školy časová osa: role, změny (co se změnilo, kdo, kdy, proč), pozvánky, přihlášení, návrhy.

Přístup zůstává přes `ADMIN_TOKEN`. Akce, které zapisují, jdou metodou POST s tokenem v těle, ne v adrese.

### 2.5 Kdo se ozve, když kód uplatní nesprávný člověk

Uplatnění kódu okamžitě pošle zprávu na Telegram (škola, jméno, funkce, e-mail a zda doména e-mailu sedí s doménou školy z rejstříku, tedy `Email 1` nebo `WWW`). V administraci se u správce ukáže varování, když doména nesedí. Freemailové domény nesedí nikdy, protože shoda na nich nic nedokazuje.

Varování nic neblokuje, jen upozorní člověka. Porovnání jména s ředitelem z rejstříku za běhu **nejde**: `Adresar.csv` se nenasazuje (je v `.gitignore`) a jména ředitelů do repozitáře nepatří. Jméno ředitele se proto použije jen offline k oslovení v pozvánce, z negitovaného `data/portal/pilot-kontakty.json`.

## 3. Co uvidí veřejnost

- **Stránka školy:** „Profil spravuje: *jméno*, *funkce*“ a datum posledního potvrzení, jen když správce dal souhlas. Bez souhlasu: „Profil spravuje škola“. Odvolání souhlasu se projeví do hodiny.
- **`/pro-skoly`:** vyhledání školy s odpovědí „profil spravuje *jméno, funkce*“ / „profil spravuje škola“ / „škola se zatím nepřihlásila — přihlaste se odkazem na e-mail z rejstříku“. Poslední stav je zároveň výzva.
- **Otevřený dataset** (až vznikne) jména nenese; zůstává podmínka [portálu §5](portal-pro-skoly-2027.md).
- Text na `/pro-skoly` „Jména těch, kdo údaje zadali, nezveřejňujeme“ se přepíše: zveřejňujeme jméno a funkci správce, jen se souhlasem; jména dalších editorů a e-maily nikdy.

Zveřejnění jména je zpracování osobního údaje na základě souhlasu. Formulář proto uvede, kdo údaje spravuje (provozovatele stejně jako na `/pro-skoly`), účel, dobu uložení a že souhlas lze kdykoli odvolat jedním kliknutím v profilu.

## 4. Sledování pilotu

`/admin` dostane tabulku pilotních škol (seznam v `data/portal/pilot.json`: REDIZO, datum odeslání pozvánky):

| Škola | Pozvánka | Kód uplatněn | Správce | Editorů | Poslední přihlášení | Návrhy | Schváleno |
|---|---|---|---|---|---|---|---|

Telegram (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` ve Vercelu): uplatnění kódu, první přihlášení osoby, odeslání návrhu, přihlášení rejstříkovou adresou u školy se správcem. Upozornění je best-effort, jeho selhání nesmí shodit akci školy.

Odezvu měříme podle [portálu §6](portal-pro-skoly-2027.md) dokončenými návrhy, ne otevřeními. Uplatnění kódu je mezikrok.

## 5. Eduarda

Osobnost je v souboru zadavatele (`eda-osobnost.md`). Pro komunikaci se školami se doplní:

1. **Se školami vždy vyká.** Pravidlo „tykání tam, kde to sedí“ platí pro rodiče.
2. **Kódy nezná a nevydává**, ani na žádost „jsem ředitelka, ztratila jsem kód“. Odpověď: předává to Patrickovi.
3. **Nemění účty ani data**, neslibuje schválení ani termín. Změny správce, spory a opravy dat předává Patrickovi.
4. **Neprozrazuje**, kdo je editorem školy nad rámec veřejného „profil spravuje“, ani e-maily editorů.
5. **Neodpovídá automatům:** `mailer-daemon`, `postmaster`, hlavičky `Auto-Submitted` (jiná hodnota než `no`), `X-Autoreply`, `Precedence: bulk|auto_reply`, odrazy a zprávy na `dmarc@`.
6. **Umí stručně** co portál dělá a nedělá (text `/pro-skoly`), že odznak a otevřená data připravujeme bez termínu.
7. **Správcem osobních údajů je Patrick Zandl.** „Zandl AI Therapy Company“ v podpisu Eduardy je obchodní název jeho podnikání, ne jiná osoba. Souhlas se zveřejněním jména, stránka `/pro-skoly` i podpis proto uvádějí téhož správce; v souhlasu stojí jméno, obchodní název je doplněk.

Pozvánku samotnou podepisuje člověk (Patrick Zandl), ne Eduarda. Ředitel, kterému přijde přístupový kód podepsaný AI, to snadno vyhodnotí jako podvod; Eduarda se v pozvánce uvádí jako podpora pro dotazy.

## 6. Inventura zdrojů

Prošel jsem [zdroje dat](zdroje-dat.md) včetně oddílu 3. Pro účty jsou relevantní rejstříková pole:

| Sloupec | Rozhodnutí |
|---|---|
| `Email 1` | **používáno** (vstup odkazem, porovnání domény správce) |
| `WWW` | **používáno** (porovnání domény správce; později ověření odznaku) |
| `Ředitel` | **nově interně, offline**: oslovení v pozvánce z negitovaného `data/portal/pilot-kontakty.json`; na web ani do repozitáře ne, důvod z oddílu 3 platí |
| `ID datové schránky` | **nepoužito v pilotu**; vrstva 2 ([portál §2.3](portal-pro-skoly-2027.md)) pro spor o správce po pilotu |
| `Telefon` | **nepoužito**; ověřování telefonem nepřidává důvěru nad rejstříkový e-mail a vyžaduje člověka |

Nový pojem na webu „profil spravuje“ se zapíše do [slovníku pojmů](slovnik-pojmu.md) ve stejné dávce. Čísla se nepřidávají, slovník ukazatelů se nemění.

## 7. Okrajové případy

| Případ | Řešení |
|---|---|
| Kód uplatní sekretariát nebo někdo, komu ho přeposlali | Telegram hned; admin dosadí správce s důvodem |
| Dvě osoby uplatní kód zároveň | unikátní index na platného správce; druhá dostane „škola už správce má, požádejte ho o pozvání“ |
| Správce odejde ze školy | předání v profilu; jinak admin po ověření rejstříkovou adresou nebo datovou schránkou |
| Správce odvolá souhlas se jménem | nový záznam `zverejnit_jmeno=false`, web ukáže „spravuje škola“ |
| Rejstříková adresa sdílená víc školami (61 adres) | odkaz nabídne výběr školy místo první nalezené |
| Škola s více REDIZO (sloučení) | role je na REDIZO; párování podle [matice změn](matice-zmen-skol-a-oboru-2025-2026.md) je věc admina |
| Editor odeslal návrh, kolega otevře formulář | formulář ukáže „na schválení čeká návrh od *jméno* z *data*“ |
| Neschválený návrh a odchod editora | návrh zůstává v issue, moderace posuzuje obsah, ne osobu |
| Pozvánka na adresu, která už roli ve škole má | nový záznam jen při změně role; jinak hláška |
| Ztráta přístupu k e-mailu | admin změní e-mail s důvodem |
| Žádost o smazání osobních údajů | platné záznamy se zneplatní, v historii se jméno a e-mail nahradí otiskem; stopa „kdo změnil údaj školy“ zůstane jako „editor školy“ |

## 8. Facebooková skupina: odloženo

Výzva ve facebookové skupině se v pilotu **nedělá** (rozhodnutí zadavatele 19. 9. 2026). Zmínka zůstává jen jako odložená možnost.

Kdyby se k ní později přistoupilo, otevře druhý vstup (odkaz na e-mail z rejstříku, oddíl 2.2) a pilot přestane být kontrolovaný vzorek. Proto se už teď u každého vzniku role ukládá vstup (`zmenu_provedl`: `kod` / `rejstrik-odkaz`), aby šlo pozvané a samy přihlášené školy vyhodnotit zvlášť.

## 9. Pořadí prací

1. Migrace tabulek (oddíl 2.1), knihovna rolí a relace, testy invariantu jednoho správce a zneplatňování.
2. Uplatnění kódu a rejstříkového odkazu jako správce, odkaz na vlastní e-mail, cookie.
3. Profil osoby: úprava údajů, souhlas, pozvánky, předání správcovství.
4. Návrh (GitHub issue) nese `role_id`, jméno a funkci editora (interně), formulář ukazuje čekající návrh.
5. `/admin/portal`: časová osa školy a akce z oddílu 2.4; tabulka pilotu; Telegram.
6. Veřejné „profil spravuje“ na stránce školy a vyhledání na `/pro-skoly`; přepis textu o jménech; slovník pojmů.
7. Běh celé cesty naostro na testovací škole, pak kódy pro 20 škol a text pozvánky.

### 9.1 Realizace kroků 1–6 (19. 9. 2026, větev `feat/portal-ucty`)

| Krok | Kde | Poznámka |
|---|---|---|
| 1 | `src/lib/portal-schema.ts`, `src/lib/portal-ucty.ts`, `tests/portal-ucty.test.mjs` | Testy nad PGlite (skutečný Postgres v paměti), invariant jednoho správce hlídá částečný unikátní index. |
| 2 | `/api/portal/kod`, `/api/portal/uplatnit`, `/api/portal/prihlasit`, `/pro-skoly/prihlaseni/[token]` | Kód jde v těle POST, ne v adrese. Odkaz pro přihlášení se spotřebuje až tlačítkem (POST), protože skenery školní pošty otevírají odkazy GET. |
| 3 | `/pro-skoly/profil`, `/api/portal/ucet`, `/pro-skoly/pozvanka/[token]`, `/pro-skoly/email/[token]` | Změna e-mailu platí pro osobu, tedy ve všech jejích školách. |
| 4 | `/api/portal-skoly` | S databází účtů kód formulář přímo neotevírá (musí se nejdřív uplatnit), jinak by ho mohl používat kdokoli, komu byl přeposlán. Issue nese „Zadal: jméno, funkce (role)“. |
| 5 | `/admin/portal`, `/admin/portal/akce`, tabulka pilotu v `/admin` | Akce leží pod `/admin`, protože cookie `admin_token` má `path=/admin`. Sloupce „Kód uplatněn“ a „Schváleno“ z oddílu 4 tabulka zatím nemá: uplatnění je vidět podle správce, schválení v moderaci výše na stránce. |
| 6 | `src/lib/portal-verejne.ts`, `SchoolPortalSection`, `/api/portal/skoly`, `/pro-skoly` | Cache s tagem `portal-spravci` se zneplatní hned (`expire: 0`), jinak nejpozději za hodinu. |

**Odchylky od návrhu:** formulář v profilu předvyplňuje schválené údaje, ne čekající návrh; kdo návrh opravuje, musí změny zadat znovu. Pozvaný editor souhlas se zveřejněním nedává, protože se jméno editora nezveřejňuje nikdy.

## Historie

| Verze | Změna |
|---|---|
| 1.0 | První návrh po rozhodnutích zadavatele 19. 9. 2026. |
| 1.1 | Schváleno. Správcem osobních údajů je Patrick Zandl (obchodní název Zandl AI Therapy Company). Facebooková skupina odložena. |
| 1.2 | Kroky 1–6 realizovány (oddíl 9.1) s odchylkami: přihlášení tlačítkem kvůli skenerům pošty, kód bez databáze účtů funguje postaru, s ní jen k založení správce. |
