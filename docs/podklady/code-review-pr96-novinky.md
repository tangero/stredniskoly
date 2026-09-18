# Code review PR #96 — Odběr termínů přijímaček e-mailem (fáze N1 a N2)

- **PR:** https://github.com/tangero/stredniskoly/pull/96 (`feat/novinky-odber` → `main`)
- **Rozsah:** 51 souborů, +15 452 / −10 409 (z toho většina `package-lock.json`); 12 nových tabulek, 8 API endpointů, 9 knihoven, formuláře a stránky, generátor zpráv.
- **Podklady:** závazný kontrakt = oddíl 6 dokumentu `docs/novinky-k-prijimackam-2027.md` ve verzi **v1.15 z mainu** (větev PR obsahuje jen zastaralou v1.1, viz P2-F); 5 kol předchozí oponentury v `docs/podklady/oponentura-codex-novinky-2027.md`.
- **Metoda:** 4 nezávislí revieweři po oblastech (jádro/kvóta, fronta/odesílání, API, rozhraní/skripty/testy), každý s kontraktem i protokolem oponentury; nálezy níže jsou deduplikované. Shoda napříč všemi čtyřmi u hlavních nálezů.
- **Datum:** 2026-09-18

## Celkové hodnocení

Architektura je promyšlená a jádro drží: tokeny jsou kryptograficky bezpečné, porovnání je timing-safe, SQL je všude parametrizované, schéma je idempotentní a **bajtově shodné** s generovanou migrací, dvoukrokové potvrzení (GET jen stránka, POST zakládá odběr) je správně, anti-enumerace a rate limity na adresu fungují.

**Merge ale nedoporučuji, dokud nebudou opraveny P1 nálezy.** Dva z nich jsou ztrátové pro příjemce (odhlášení umí potichu zabít celou rozesílku; slíbená záložní fronta pro potvrzovací e-maily neexistuje), další porušují závazný kontrakt v bodech, které měla opravit právě kola 5 a cílené kolo oponentury (I3/K3/K4) — v kódu implementovány nejsou. Dva P1 nálezy se dotýkají GDPR/reputace (tokeny v analytice, tiché selhání odhlášení po 30 dnech).

## P1 — závažné (blokují sloučení)

### P1-1. Odhlášení zruší připravenou dávku, ale ostatní příjemce nechá uvízlé navždy
`src/lib/novinky-odber.ts:282-289` — `odhlas()` při položce ve stavu `pripravena` podmíněně zruší dávku, ale na rozdíl od `zrusPripravenouDavku()` (`src/lib/novinky-fronta.ts:296-310`) **nevrátí ostatní položky dávky do `ceka`**. Transakce A vybírá jen `ceka`, obnova zrušené dávky neřeší, takže až 99 dalších odběratelů zprávu nikdy nedostane a jedinečný index `polozka_odberatel` brání i opětovnému zařazení. Přímý rozpor s kontraktem (oddíl 6, Stavy, pravidlo 3: „její ostatní položky se vrátí na `ceka` … a rezervace kvóty se vypořádá"). Scénář je reálný: okno mezi A a B trvá až 15 minut.
**Oprava:** po úspěšném zrušení dávky v `odhlas()` provést totéž co `zrusPripravenouDavku` (položky → `ceka`, `vyporadejRezervace`) v téže transakci; totéž ověřit v `odhlasVse()` a `zrusPodleAdresy()`.

### P1-2. Fronta jako záloha pro potvrzení/uvítání nemá žádného konzumenta
Komentáře slibují „položka zůstává ve frontě a doveze ji odesílač" (`prihlasit/route.ts:106`, `potvrdit/route.ts:101`), ale `zpracujZpravu` jede jen nad manifestem s `ucel: 'obsah'` (`src/lib/novinky-odesilac.ts:153`); položky `potvrzeni`/`uvitani` v manifestu nikdy nebudou a `jeZpravaPlatna` by je odmítla. Při výpadku Resendu potvrzovací e-mail **nikdy nedojde**, žádost za 72 h propadne a po 3 pokusech/den adresu zablokuje limit. Kontrakt: „fronta je u nich záloha, když se inline odeslání nepovede."
**Oprava:** odesílač musí vybírat i čekající položky `potvrzeni`/`uvitani` (s vlastním pravidlem platnosti místo `zprava_verze`, se stejným klíčem idempotence jako inline cesta), nebo slib z kódu i kontraktu odstranit.

### P1-3. Inline potvrzení/uvítání obchází rozpočet kvóty i hranici předání
`prihlasit/route.ts:97` a `potvrdit/route.ts:126` volají `odesliDavku()` přímo: bez rezervace v řádcích `celkem`/`potvrzeni` (denní řádek 500 z `odeslat/route.ts:58` nikdy nikdo nečerpá) a bez trvalého zápisu před voláním Resendu (zápis až po). Kontrakt krok 9: „řádek `celkem` drží strop pro **všechny** e-maily novinek (obsah, uvítání, potvrzení)" — rezerva 5 000 pro portál tak proti formuláři neplatí; útok rotující IP může posílat neomezeně potvrzovacích e-mailů (3/adresa/den).
**Oprava:** inline odeslání vést přes dávku/frontu s `rezervujKvotu`, nebo před voláním atomicky rezervovat + zapsat hranici předání.

### P1-4. Opakování odeslání přes hranici období posílá bez rezervace v novém období (I3/K3/K4 z oponentury nejsou v kódu)
- `predejDavku()` (`novinky-fronta.ts:249-293`) před transakcí B nepřenáší rezervaci do aktuálního období (kontrakt 5.3a), jen kontroluje 10min okno.
- `obnovUviznute()` (`novinky-odesilac.ts:245-289`) opakuje požadavek 6–24 h po `predano_v` bez rezervace v novém období, přestože krok 5.7 ukládá: „Přesahuje-li opakování do jiného období, musí se kapacita rezervovat i v novém období." Retry přes půlnoc/konec měsíce tak může skutečně odeslat e-maily zaúčtované do starého období a nový měsíc přečerpat strop. Návrh sám říká, že tato oprava „oponenturou neprošla" a má se před realizací zkontrolovat — v kódu není.
**Oprava:** před opakováním přes hranici období rezervovat kapacitu v novém období (starou rezervaci neuvolňovat); při neúspěchu přejít na `neurcita`.

### P1-5. Capability tokeny z odkazů unikají do Matoma, Vercel Analytics a hlášení chyb
Matomo se načítá globálně v root layoutu (`src/app/layout.tsx:88-105`) a měří vše, `BugReportButton` posílá `window.location.href`. Zatímco potvrzení token z URL umně mění za cookie (`potvrdit/route.ts:60`), `GET /api/novinky/odhlasit` token v přesměrování **zachovává** (`odhlasit/route.ts:39`) a správa míří rovnou na `/novinky/sprava?t=…`. Token opravňuje k odhlášení i ke čtení adresy v `/api/novinky/sprava`. Zásady (ř. 154-156) přitom tvrdí „Potvrzovací a odhlašovací stránky odběru se neměří vůbec". Jde o návrat bodu N1 z oponentury, opraveného jen napůl.
**Oprava:** token z adresy odstranit (výměna za cookie relaci jako u potvrzení, nebo `history.replaceState` + vyloučení `/novinky/*` z trackingu); text zásad uvést do soulasu se skutečností.

### P1-6. Odhlašovací a správcovské odkazy po 30 dnech tiše přestanou fungovat
`novinky-odesilac.ts:176` a `potvrdit/route.ts:115` vydávají tokeny s `VYZVA_PLATNOST_MS` (30 dnů); odběr trvá celý ročník (~9 měsíců). Po expiraci `overToken` vrátí null, ale `odhlasit/route.ts:23` odpoví `success: true` a `OdhlaseniKlient` ukáže „Odhlášeno" — **tiché selhání práva na odhlášení** (Gmail/Yahoo one-click, GDPR odvolání souhlasu). List-Unsubscribe z lednového e-mailu je v březnu mrtvý.
**Oprava:** pro odhlášení/správu token bez expirace nebo do konce ročníku (jednorázovost hlídá stav v DB); při neplatném tokenu vracet chybu, ne úspěch.

### P1-7. Pojistka „snížit limit `celkem` na nulu" se přepíše při příštím běhu cronu
`zajistiRozpocet()` (`novinky-odesilac.ts:309-315`) dělá `on conflict do update set limit_pocet = excluded.limit_pocet`, takže běh odesílače dvakrát denně přepíše ručně snížený limit zpět. Kontrakt (Odesílací doména, pojistka 1) slibuje: „stačí snížit limit řádku `celkem` na nulu" — v provozu nefunguje.
**Oprava:** limit nastavit jen při vložení (`on conflict do nothing`), případně zavést zvláštní přepínač.

### P1-8. Webhook: destruktivní účinek je mimo idempotentní stráž
`resend-webhook/route.ts:111-119` — `zpracovano` se zapíše v transakci, ale `zrusPodleAdresy()` běží až po ní a spustí se **i při duplicitním doručení** (insert narazí na konflikt). Dva směry rizika: pád mezi commitem a účinkem → opakovaný webhook se přeskočí a odběr nedoručitelné adresy se nikdy nezruší; opožděný replay `email.bounced` zruší odběr, který si člověk mezitím znovu založil. Chybí i tolerance `svix-timestamp` proti replay.
**Oprava:** účinek přesunout do transakce před zápis `zpracovano`; při konfliktu ho neopakovat; odmítat timestamp starší ~5 minut.

### P1-9. Těla zrušených dávek a vypršené záznamy kalendáře se nikdy nemažou (GDPR retence)
`umazTelaDavek()` (`novinky-fronta.ts:419-432`) nemaže tělo u stavu `zrusena` (`predano_v` je null, žádná větev ho nechytí) — tělo s kompletním seznamem adres zůstane v DB bez lhůty, právě u odhlášených. Podobně `smazOsirelouIdentitu` (`novinky-odber.ts:300-309`) blokuje výmaz identity, dokud existuje `zprava_o_kalendari` mimo `uzavren`, ale záznamy po `ceka_do` (18 měsíců) nikdo nemaže. Proti slibu zásad „adresa v těle zůstává nejdéle 24 hodin od předání".
**Oprava:** smazat tělo hned při zrušení dávky; denní úklid ať uzavírá/maže `zprava_o_kalendari` po `ceka_do` a žádosti `ceka_na_vyzvu` po 40 dnech; doplnit 12měsíční retenci pro `polozka_odeslani`, `davka`, `rezervace_kvoty`, `webhook_udalost`.

### P1-10. Odkaz „Odhlásit se" ruší oba druhy studia i u zprávy pro jeden segment
`odhlas()` (`novinky-odber.ts:256`) maže `odber_novinek` jen podle ročníku, segment zprávy nerespektuje (v DB není). Rodina kliknuvší na odhlášení v e-mailu „JPZ čtyřleté" přijde i o odběr pro víceleté gymnázium. Kontrakt (T3/krok 7): ruší se „všechny odběry příjemce **v segmentech té zprávy**"; správa odběru má umět zrušit jeden druh studia — není implementováno. Stránka odhlášení zároveň slibuje „Ostatní odběry zůstanou" — u společné zprávy rozpor s kontraktem.
**Oprava:** segment uložit k položce fronty (nebo číst z manifestu) a mazat jen `druh_studia` v segmentu; do správy přidat zrušení jednoho druhu.

## P2 — drobnější

- **P2-a. Deadlock a zbytková race mezi `odhlas()` a transakcí B** — opačné pořadí zámků (dávka→položky vs. položka→dávka, `novinky-fronta.ts:257-287` vs. `novinky-odber.ts:276-288`); B čte složení bez `for update`. PG deadlock samo abortne, ale hlásí chybu. Oprava: číst složení `for update`, nebo ověřit `rowCount` a při nesoulasu rollback.
- **P2-b. Limit na IP padělatelný přes `x-forwarded-for`** — `prihlasit/route.ts:74` bere první hodnotu, kterou si klient může nastavit; limit 30/IP/den obcházitelný rotací (limit 3/adresa drží). Brát poslední hodnotu / `x-vercel-forwarded-for`.
- **P2-c. Inline zápis výsledku položky bez podmínky stavu** — `potvrdit/route.ts:128-133`, `prihlasit/route.ts:99-104`: `update … where id=$1` může v souběhu s cronem přepsat `pripravena`/`predavana` na `odeslana`. Přidat `and stav='ceka'`.
- **P2-d. `prihlasit` neověřuje ročník proti registru** — `prihlasit/route.ts:68` přijme libovolné `\d{4}`; vznikne žádost i odběr pro neexistující ročník. Ověřit proti `zobrazeneObdobi('msmt-harmonogram')` jako `stav/route.ts:18`.
- **P2-e. Přepínač `NOVINKY_ZAPNUTO` drží jen UI, ne API** — kontrolují ho jen `OdberBlok.tsx:31` a `stav/route.ts:15`; `POST /api/novinky/prihlasit` funguje i s vypnutým přepínačem. Přidat podmínku do veřejných endpointů.
- **P2-f. PR neobsahuje závazný kontrakt, který implementuje** — větev nese `docs/novinky-k-prijimackam-2027.md` v1.1 (odporuje kódu: GET zakládá odběr, subdoména, jiné tabulky); kód je psaný podle v1.15 z mainu. Dokument `oponentura-codex-novinky-2027.md` citovaný v popisu PR ve větvi vůbec není. Pro posuzovatele i údržbu sloučit aktuální kontrakt s implementací.
- **P2-g. Otisky adres bez odděleného tajemství** — `novinky-token.ts:107-109` používá `NOVINKY_SECRET` s prefixy `email:`/`ip:`; kontrakt (N4) říká „HMAC adresy s odděleným tajemstvím". Sloupec `odberatel.verze_klice` se nikde nepoužívá.
- **P2-h. Hlavička `x-resend-monthly-quota` se nikdy nečte** — `zbyvaKvota()` (`novinky-rozpocet.ts:93`) je mrtvý kód; kontrakt krok 9 říká, že se podle ní nastavuje `limit_pocet`. Stejně `pockejPodleRetryAfter()` (`novinky-email.ts:120`) — 429 skončí jako „neznámý výsledek" a čeká se 6 h na obnovu.
- **P2-i. Cizí klíč `polozka_id` může otrávit webhook** — `resend-webhook/route.ts:79,84-86` vkládá značku do sloupce `uuid` s FK; ne-UUID → 500 → Resend doručuje donekonečna. Validovat formát/existenci, jinak `null`.
- **P2-j. Nespárované webhooky se „později" nikdy nespárují** — kontrakt slibuje pozdější spárování; kód označí `zpracovano` hned a index `webhook_nezpracovane` je mrtvý.
- **P2-k. Chybové logy mohou obsahovat adresu** — `console.error` s celým objektem chyby (`prihlasit/route.ts:113`, `potvrdit/route.ts:102`, `novinky-odesilac.ts:225`); pg chyby umí v `detail` nést hodnoty sloupců, Resend 422 adresu příjemce. Logovat jen kód/message bez detailu.
- **P2-l. `base` pro manifest se staví z hlavičky `Host`** — `odeslat/route.ts:54`; držitel `CRON_SECRET` by podstrčeným Hostem mohl rozeslat cizí HTML. Hardcodovat doménu.
- **P2-m. Honeypot odpověď je detekovatelná** — `prihlasit/route.ts:45-47` vrací neutrální odpověď bez `souhlasVerze`, kterou úspěšná cesta přidává; bot pozná odhalení.
- **P2-n. Nesoulas složení dávky čeká 15 min na obnovu** — kontrakt 5.4 chce dávku zrušit a rezervace vypořádat hned; `odesliPripravenouDavku` (`novinky-odesilac.ts:208-211`) jen skončí. Samoléčivé.
- **P2-o. `order by vlozeno` bez tiebreakeru** — položky z jedné transakce mají identické `vlozeno`; `order by vlozeno, id` v A (`novinky-fronta.ts:135`) i obnově (`novinky-odesilac.ts:278`).
- **P2-p. Fallback zápisu výsledku může přepsat novější stav starším** — `zapisVysledekPolozky` (`novinky-fronta.ts:384-390`) zapisuje bez ohledu na pořadí událostí (pozdní `sent` přepíše `delivered`). Zvážit monotónní přechody.
- **P2-q. Odkaz „správa odběru" ze stránky odhlášení ztratí token** — `OdhlaseniKlient.tsx:45` `Link href="/novinky/sprava"` bez `?t=`. Předat token z `window.location.search`.
- **P2-r. Node testy odběru neběží v CI** — `.github/workflows/testy.yml` spouští jen Python a `tsc`; `tests/novinky-*.test.mjs` (45 testů, vč. hlídače shody schématu s migrací) nespouští nic a CI má Node 20, kde `--experimental-strip-types` nefunguje. Přidat job Node ≥ 22 + `npm run test:novinky`.
- **P2-s. Bezpečnostní vlastnosti částečně bez testů** — jednorázovost žádosti (`spotrebovano`), anti-enumerace, hlavičky RFC 8058, podpis webhooku a segmentové omezení odhlášení test nemají. Chybí i křížový test otisku kalendáře Python × TypeScript (`scripts/novinky.py:80-84` vs `novinky-odesilac.ts:51-53` — `json.dumps` vs `JSON.stringify` se liší u floatů; jediné desetinné číslo by zablokovalo všechna odeslání). Doporučit golden-fixture test.
- **P2-t. `/api/novinky/stav` se necachuje** — `revalidate = 3600` u route handleru nemá účinek bez `force-static`; každý pageview (1 179+ stránek) spustí funkci.
- **P2-u. Stránka potvrzení ignoruje `?stav=neplatny|propadl` a nemá rekapitulaci** — `PotvrzeniKlient.tsx` parametr nečte; kontrakt (rozhodnutí 12) žádá rekapitulaci (adresa, ročník, druh studia, znění souhlasu) před potvrzením.
- **P2-v. Generátor neescapuje a neznámou šablonu tiše přeskočí** — `scripts/novinky.py:177-197` neescapuje `& < >` ani uvozovky v `href` (obsah je důvěryhodný, jen odolnost); `priprav("preklep")` skončí úspěšně s nulou zpráv.
- **P2-w. `public/novinky/` v `.gitignore` vs. „schvalují se samostatným PR"** — ignorované soubory se bez force-add do PR nedostanou, takže manifest se na nasazený web nikdy nedostane a odesílač nic nenajde. Procesní nesoulas k vyřešení před prvním odesláním.
- **P2-x. Cron v UTC a chybějící `maxDuration`** — `0 6,18 * * *` = 7:00/19:00 SEČ (8:00/20:00 SELČ), „ráno a večer" splňuje; smyčka až 50 dávek ale může překročit výchozí limit funkce — zvážit `export const maxDuration` (degradace je bezpečná).
- **P2-y. Výzvy k novému ročníku nejsou implementovány vůbec** — větev `novy_rocnik`/`ceka_na_vyzvu`/`vyzva_odeslana` ve schématu a `jeAdresatZpusobily` nemá žádného tvůrce ani konzumenta. Pokud vědomé (N3), poznamenat v PR.
- **P2-z. `odhlas()` zahodí nepředané položky i jiných ročníků** — `novinky-odber.ts:269-273` zahazuje `ceka`/`pripravena` napříč ročníky; při překryvu (srpen–září) odhlášení jednoho ročníku zabije čekající e-mail druhého.

## Ověření deklarovaných bezpečnostních vlastností

| Deklarovaná vlastnost | Stav |
|---|---|
| Potvrzení je aktivní krok: GET jen stránku, POST zakládá | **Splněno** — GET jen čte + vymění token za HttpOnly cookie (SameSite=Lax), přesměruje na čistou URL; odběr zakládá až POST |
| Žádost platí 72 h, jednorázová; do potvrzení nevzniká odběr ani identita | **Splněno** — atomický podmíněný `update … where stav='aktivni' and spotrebovano is null and plati_do > now()` |
| Hranice předání: trvalý zápis před Resendem; odhlášení ruší jen nepředané; tělo/klíč zmrazené | **Částečně** — dávková cesta správně (commit B před voláním); inline cesta zapisuje až po (P1-3); uvízlé položky (P1-1); těla zrušených dávek (P1-9) |
| Rezervace kvóty atomická, v období odeslání, rezerva 5 000 | **Částečně** — atomicita a rezerva pro dávkovou cestu ano; inline obchází (P1-3), přelom období neřešen (P1-4), pojistka limit=0 se přepisuje (P1-7) |
| Webhooky idempotentně, bez adresy, potlačení podle adresy | **Splněno s výhradou** — uložení idempotentní, jen HMAC otisk; ale účinek mimo idempotentní stráž (P1-8) |
| RFC 8058 (`List-Unsubscribe-Post`, POST bez cookies/přesměrování, GET neruší) | **Formálně splněno, funkčně vadné** — hlavičky správné; ale 30denní expirace + `success: true` = tiché selhání (P1-6) |
| Autentizace cron/migrace (`CRON_SECRET`) | **Splněno** — `timingSafeEqual` s kontrolou délky; migrace jen statické idempotentní DDL |
| Anti-enumerace formuláře | **Splněno** — neutrální odpověď ve všech větvích, atomické limity 3/adresa, 30/IP (výhrada P2-b, P2-m) |
| Formulář v patičce client-only | **Splněno** — `dynamic(..., { ssr: false })`, SSR 1 179 stránek nedotčeno |
| Schéma ↔ migrace | **Splněno** — bajtová shoda ověřena, test shodu existuje (ale neběží v CI, P2-r) |

Nenalezeno: SQL injection (všude parametrizované), timing attack (všude `timingSafeEqual`), XSS v komponentách a šablonách (JSX escapování, žádný uživatelský vstup do HTML e-mailů), adresy v URL/logging odpovědí API (jen tokeny — viz P1-5, P2-k), CSRF (SameSite=Lax cookie).

## Doporučené pořadí oprav

1. P1-1, P1-2, P1-3 (ztráta příjemců / nefunkční sliby fronty a kvóty) — jádro smyslu PR.
2. P1-5, P1-6, P1-9 (GDPR/reputace — tokeny v analytice, tiché selhání odhlášení, retence).
3. P1-4, P1-7, P1-8, P1-10 (kontrakt kvóty/pojistek/webhooku/segmentů).
4. P2-r (CI pro Node testy), P2-f (sloučit kontrakt s PR), P2-w (proces schvalování zpráv) — procesní, ale blokují provoz.
5. Ostatní P2.

---

## Vypořádání autora (18. 9. 2026)

**Všech deset P1 nálezů opraveno**, každý dostal test. Podrobná tabulka je v oddílu 19 návrhu
`docs/novinky-k-prijimackam-2027.md`; commit `5772d13` na větvi `feat/novinky-odber`.

Nejcennější část review: P1-2, P1-3 a P1-4 rušily přesně to, co měla zařídit kola 5 a cílené kolo
oponentury návrhu. Návrh ta pravidla popisoval, kód je neměl. Verze 1.6 návrhu přitom vznikla jako
oprava **bez oponentury** — a právě její body v kódu chyběly.

**P2 nálezy zůstávají otevřené.** Nejsou blokátory a část je vědomé rozhodnutí: `public/novinky/`
v `.gitignore` je záměr, protože vygenerované zprávy se schvalují samostatným pull requestem, ne
spolu s kódem odběru. Testy v `node --test` v CI neběží; zapnutí je doporučení mimo tuto dávku.
