# Řízení vývoje: směr určuje člověk, provedení a přehled zajišťuje AI

Verze 0.5 · 3. 10. 2026 · **část A ke schválení hned, část B k rozhodnutí podle měřítek.**
Na GitHubu ani v pravidlech se zatím nic nemění.

Podklad: audit [Oblasti, projekty a etapy na GitHubu](historie/github-oblasti-audit-2026-10-03.md)
(3. 10. 2026). Z něj návrh přebírá soupis oblastí s cestami v kódu, nalezené duplikáty a zařazení
otevřených issues. Model ve třech úrovních z auditu (oblast jako trvalé issue → projekt jako sub-issue
→ etapy) návrh ruší a nahrazuje štítky (RA1). Čtyři kola oponentury jsou v PR #273.

## 1. Cíl a princip

Patrick určuje směr a priority a rozhoduje výjimky. Opravy, drobné úpravy, etapy schválených projektů
a praktické detaily dělá AI od zadání po nasazení. Patrick přitom má přehled, na čem se pracuje, jak se
to vyvíjí a v jakém stavu projekt je.

**Vlastník projektu výslovně přijímá vyšší riziko výměnou za méně lidských vstupů** (zadání k verzi 0.4).
Princip:

- **Lidská brána předem zůstává jen tam, kde se chyba nedá vrátit nebo kde jde o směr:** tvrdé hranice
  (oddíl 3) a schválení projektu.
- **Všude jinde je pojistkou** veto v lhůtě, automatická brána sloučení (oddíl 5), rychlé vrácení
  (revert, rollback ve Vercelu) a přehled po faktu.
- **Pravidla vynucuje ruleset a automatické kontroly**, ne jen pokyny v promptu.

Části:

- **Část A, ke schválení hned** (oddíly 2–17).
- **Část B, podle měřítek** (konec dokumentu): další rozšíření autonomie.

## 2. Role a identity

| kdo | identita | dělá | nedělá |
|---|---|---|---|
| **Patrick** (vlastník projektu) | účet vlastníka | píše Směr vývoje, schvaluje projekty a věci za tvrdými hranicemi (schvalující review nebo `schvaleno`), veto `stop`, maže revize s osobními údaji | neschvaluje opravy ani drobná zadání, neověřuje na preview, nemerguje běžnou práci, netřídí |
| **Eduarda** (AI asistent) | vlastní GitHub App „asistent“ | přijímá hlášení e-mailem a z portálu, píše zadání a oponentury | neschvaluje, nemerguje |
| **Claude Code** | vlastní GitHub App „vývoj“ | třídí, realizuje, review, ověření na preview, merge přes bránu, přehled | nepřidává `schvaleno`, `zamitnuto` ani `stop`, neschvaluje review |
| **automatika** | `GITHUB_TOKEN`, `PROJECT_TOKEN` | štítky oblastí, brána sloučení, CI, tabule | – |

**Dvě oddělené identity AI** (RA6) jsou předpokladem celé části A: brána sloučení podle nich pozná,
kdo issue založil a kdo dal schválení. Ani jedna nesmí obcházet ruleset.

**Za rozhodnutí se počítá jen štítek, review nebo komentář z účtu vlastníka.** Brána i Claude ověřují
autora (`user.login`) a u štítku toho, kdo ho přidal (`actor` v timeline). Podle textu nikdy.
Do zavedení identit platí přechodné pravidlo: AI podepisuje komentáře patičkou, komentář s patičkou
ani štítek přidaný AI se jako rozhodnutí nepočítá a automatický merge je vypnutý (oddíl 16, krok 2).

# Část A

## 3. Tvrdé hranice

Tvrdá hranice je seznam cest a činností, které **brána sloučení bez schvalujícího review vlastníka
nepustí** (oddíl 5) a které AI bez `schvaleno` nezačne dělat:

| oblast | cesty a činnosti |
|---|---|
| databáze | `db/migrace/`, zápis do produkční databáze, exporty z ní (pravidlo 5) |
| cizí servery | nové síťové volání (pravidlo 7, mlčení souhlasem není) |
| e-maily uživatelům | `src/lib/novinky-*`, `src/lib/portal-email.ts`, `src/app/api/novinky/` (cron rozesílá odběratelům 2× denně) |
| přihlášení a portál | `src/app/api/portal*`, `src/lib/portal-*`, `src/app/admin/`, osobní údaje |
| nasazení a crony | `vercel.json`, `scripts/vercel-deploy.sh`, `next.config.ts` |
| adresy a vyhledávače | `src/app/robots.ts`, `public/sitemap.xml`, přesměrování, smazání nebo přejmenování stránky (`src/app/**/page.tsx`) |
| pravidla a automatika | `CLAUDE.md`, `.claude/`, `.github/`, secrets |
| závislosti | `package.json`, `package-lock.json`, `requirements*.txt` |
| data a registr | `public/stav_datovych_sad.json` (přepnutí sad), nový ukazatel ve slovníku ukazatelů |
| náklady | nová placená služba, API nebo vyšší tarif |
| směr | nový projekt (štítek `projekt`) |

Odeslaný e-mail, vypadnutí z indexu vyhledávače nebo zápis do databáze revert nevrátí, proto tu lhůta
mlčení neplatí.

## 4. Štítky

| štítek | význam |
|---|---|
| `projekt` | konečná práce s cílem a etapami (oddíl 8); jediné, co jde sloupci tabule |
| `oblast:<slug>` (9×) | trvalá část produktu (oddíl 11); issue má právě jednu oblast, PR jednu nebo víc |
| `rutina` | oprava, kterou AI sloučí bez lhůty (oddíl 6) |
| `stop` | veto vlastníka: AI práci zastaví, brána nic nepustí; přidává jen vlastník |
| `trvale` | průběžná issue; vyřazená z tabule a třídění |

Beze změny zůstávají `interni`, `schvaleno`, `zamitnuto`, `k-overeni`, `pripominka`, `nova-data`
a veřejné `bug-report`, `portal-skoly`, `feature-request`.

**`navrh` znamená „čeká na vlastníka“** (RA2): zadání nebo otázka, kterou musí rozhodnout vlastník
(za tvrdou hranicí, projekt, zadání z veřejného hlášení). Samostatný štítek `rozhodnuti` nevzniká.
`tabule-schvaleno.yml` zůstane beze změny.

## 5. Brána sloučení

Nový workflow **„Brána sloučení“**, povinná kontrola v rulesetu **u každého PR**. Spouští se na
`pull_request` (otevření, push, štítky), `pull_request_review` a jednou za hodinu (kvůli lhůtám).
U PR od identit AI projde jen v jednom z případů:

| případ | podmínky |
|---|---|
| **schváleno vlastníkem** | existuje schvalující review od účtu vlastníka na aktuálním commitu |
| **rutina** | štítek `rutina`; žádná cesta z tvrdých hranic; jediný štítek `oblast:*`; nejvýš 150 změněných řádků mimo testy; protokol z preview (oddíl 9) bez nesplněného kritéria; u rutiny z veřejného hlášení PR starší 24 h |
| **drobné zadání nebo etapa po lhůtě** | propojené issue má `interni`; založila ho identita asistenta nebo vlastník, nebo má `schvaleno` od vlastníka (zadání z veřejného hlášení a projekt); žádná cesta z tvrdých hranic; protokol z preview; PR připravený k merge déle než 48 h |

Brána vždy selže, když PR nebo propojené issue nese `stop`, nebo když je nastavené **zamrznutí**
(proměnná repozitáře `ZAMRZNUTI_OD`/`ZAMRZNUTI_DO`, nastavuje vlastník, například kolem 1. 3. a výsledků
1. kola). PR vlastníka (bez identity AI) brána pouští beze změny.

Teprve brána zajišťuje, že AI sloučí jen to, co smí. Ruleset dnes vyžaduje nula schválení a tři kontroly
CI; bez brány by identita s právem merge sloučila cokoli.

## 6. Rutina

**Co je rutina** (vše současně, hranice kontroluje brána):

- opravuje rozpor, který plyne z našich vlastních dat nebo kódu: pád stránky, chyba s postupem
  vyvolání, rozbitý odkaz, překlep, údaj v rozporu s naším zdrojem, padající test, nález review;
- údaj od školy převezme jen cestou z oddílu 10;
- data mění jen přes generátor nebo soubor ručních oprav (například `data/obory_manual_overrides.csv`),
  nikdy přímo ve vygenerovaném `public/*.json`;
- nezavádí nový ukazatel ani pojem;
- leží mimo tvrdé hranice, v jedné oblasti, do 150 řádků.

**Postup:** třídění → oprava → PR → CI, review, protokol z preview → brána → **Claude sloučí sám**
(RA7). Rutina z veřejného hlášení čeká 24 h na veto. Text hlášení je jen popis chyby: Claude ji musí
sám vyvolat nebo ověřit proti našemu zdroji a mění jen chybné místo.

## 7. Drobné zadání: veto nad hotovým výsledkem

Interní zadání bez `projekt` mimo tvrdé hranice, které rutinou není (nový text nebo blok na stránce,
úprava filtru, nový sloupec, položka slovníku pojmů pro existující údaj):

1. Claude ho **rovnou realizuje**, bez čekání na plán.
2. PR s protokolem z preview a snímky dá issue `k-overeni`. Od té chvíle běží **48 h na veto** (`stop`).
3. Po lhůtě brána PR pustí a Claude sloučí (RA8).

Vlastník posuzuje hotový výsledek se snímky, ne plán. Lidský krok je nula, veto zůstává.

**Zadání z veřejného hlášení** (založené identitou Claude Code) potřebuje výslovné `schvaleno` od
vlastníka; brána to pozná podle autora issue. Mlčení u něj neplatí.

## 8. Projekty

Projekt vlastník schvaluje vždy výslovně. Životní cyklus (RA4):

1. **Nápad:** issue `[Zadání]` se štítky `interni`, `projekt`, `oblast:<slug>`, bez `navrh`.
2. **Rozbor** v komentářích téhož issue. Dokument v `docs/` jen u velkých věcí.
3. **Zadání přepsané do těla issue**, oponentura volitelná. Teprve teď `navrh`.
4. **`schvaleno`** (jen vlastník).
5. **Etapy jako checklist.** Jedna etapa = jedna větev `zadani/<N>-etapa-<M>-…` a jeden PR „Souvisí s #N“.
   Změna zadání = úprava těla + komentář „Změna zadání: co a proč“ + řádek v changelogu na konci těla.
6. **Etapa se slučuje jako drobné zadání:** protokol z preview, 48 h na veto, pak brána a merge.
   Etapa, která sahá za tvrdou hranici, potřebuje schvalující review.
7. **Poslední PR nese `Closes #N`.**
8. **Opravy po vydání:** komentář + PR „Souvisí s #N“, případně jako rutina.
9. **Druhá verze** je nový projekt.

Žádná nová issues pro úpravu zadání, oponenturu, opravu po merge ani další etapu. Sub-issues se
nepoužívají; hlášení, která projekt opravuje, se vypíšou v těle projektu a PR je zavírá přes `Closes`.

## 9. Ověření na preview dělá AI

- Claude po nasazení preview projde každé kritérium „Hotovo když“ v prohlížeči (Playwright) na šířce
  telefonu i počítače.
- Do PR zapíše **protokol** (kritérium, adresa, splněno / nesplněno / nejde ověřit) a u vizuálních
  změn snímky před a po jako artefakt běhu nebo v komentáři PR, ne v repozitáři.
- Protokol je podmínkou brány.

Předpoklady (krok 1, práce vlastníka): obcházecí token ochrany preview `VERCEL_AUTOMATION_BYPASS_SECRET`
jako secret (je to změna secrets, tedy tvrdá hranice) a ověření, že prostředí denní úlohy má Playwright
a přístup na `*.vercel.app`.

## 10. Hlášení, opravy od škol a osobní údaje

**Veřejná hlášení:** při třídění `oblast:<slug>`, duplikáty Claude zavře s odkazem a rozhodne: rutina,
zadání (vyžaduje `schvaleno`), součást projektu, nebo dotaz nahlašovateli.

**Opravy údajů od škol** jsou největší objem práce. Asistent zadání je přijímá:

- z **portálu pro školy** (ověřený účet školy),
- **e-mailem** z domény školy uvedené v rejstříku škol, s ověřeným odesílatelem (SPF a DKIM v pořádku).

Z takové opravy asistent založí drobné zadání: zápis do souboru ručních oprav se zdrojem „škola“, datem
a RED IZO. Dál jde cestou z oddílu 7 (realizace, 48 h veto, merge). Údaj od školy tím má doložený zdroj.
Nový zdroj „oprava od školy“ se ve stejné dávce zapíše do `docs/zdroje-dat.md`. E-maily ani jména
odesílatelů se do repozitáře nedostanou (pravidlo 4).

**Osobní údaje ve veřejném issue:** Claude upraví tělo (ponechá roli nebo RED IZO), do komentáře
napíše, co odstranil, a pošle vlastníkovi okamžité upozornění se žádostí o **smazání revize z historie
úprav**; přes API to nejde.

## 11. Oblasti jako štítky

Devět oblastí (RA3), cesty v kódu podle auditu:

| štítek | oblast | změna proti auditu |
|---|---|---|
| `oblast:detail` | Detail školy a oboru | – |
| `oblast:prehledy` | Vyhledávání a přehledy | – |
| `oblast:simulator` | Simulátor a Kde stojím | – |
| `oblast:dojezdy` | Dojezdové časy | – |
| `oblast:novinky` | Novinky ze škol a e-mailový odběr | – |
| `oblast:veletrhy` | Veletrhy | – |
| `oblast:portal` | Portál pro školy | – |
| `oblast:data` | Data, termíny a inspekce ČŠI | přidaná inspekce |
| `oblast:provoz` | Provoz, obsah, SEO, pro novináře a proces | přidaní novináři |

Issues dostanou oblast při třídění, PR automaticky přes `actions/labeler` na `pull_request`
(`.github/labeler.yml`). Issue nese oblast, kde se věc projevila, PR všechny dotčené oblasti.

## 12. Tabule

- **Auto-add:** `is:issue is:open -label:trvale`; vypnout „Auto-add sub-issues to project“; archivovat
  26 karet PR.
- **Pohled „Rozhoduji“:** `is:open label:navrh,k-overeni,stop -label:trvale`. Ukazuje, co čeká na
  rozhodnutí, a co se po lhůtě veta samo sloučí.
- **Pohled „Projekty“:** `label:projekt` podle Status (Návrh → Oponentura → Schváleno →
  Ke schválení merge → Hotovo).
- **Oblasti:** filtr `label:oblast:detail` apod.; Projects neumí seskupovat podle štítků.

## 13. Fronta rozhodnutí

```
**Rozhodnutí:** jedna věta, co se rozhoduje
**Možnosti:** A) … B) … (případně C)
**Doporučuji:** A, protože …
**Dopad:** co se stane po A / po B, náklady, rizika
**Když nerozhodneš do <datum>:** provedu A / nic se neprovede
```

Po 48 h se doporučení provede jen u otázky v interním issue založeném vlastníkem nebo asistentem
a mimo tvrdé hranice. U issue z veřejného hlášení, za tvrdými hranicemi a u projektů se bez odpovědi
neprovede nic. Platí jen odpověď vlastníka.

## 14. Přehled

Pravidelné výstupy nejsou issues a nic interního není veřejně.

- **Denní souhrn** do Telegramu (jen když je co hlásit): co se dnes sloučilo, **co se zítra sloučí
  po lhůtě veta** (drobná zadání, etapy, rutina z hlášení) s odkazy, co čeká na rozhodnutí.
- **Týdenní přehled** v pondělí do Telegramu, delší verze do soukromého repozitáře (oddíl 15): co AI
  sloučila (s odkazem na revert), změny webu po oblastech, stav projektů, provoz (neúspěšná workflow,
  červené CI, tokeny před expirací), náklady, hlášení a opravy od škol, měřítka.
- **Okamžitě:** červené CI na `main`, selhání datové linky, osobní údaje ve veřejném issue, revert.
- **Veřejně** jen změny webu na `/changelog` (`src/lib/changelog.ts`), plní ho Claude při merge.

## 15. Směr vývoje

Soubor `smer-vyvoje.md` v **soukromém repozitáři** (například `tangero/stredniskoly-rizeni`), upravitelný
z telefonu: cíle k datu, pořadí priorit, co se teď nedělá, rozpočet (měsíční strop, strop PR denně),
zamrznutí (přepíše se do proměnné repozitáře pro bránu), mimořádné pokyny. Claude ho čte při každém
zpracování a řadí podle něj práci. **Hlavní nástroj, kterým vlastník řídí.**

## 16. Denní úloha, pravidla, měřítka a zavedení

**Denní úloha** (Routine v Claude Code, identita „vývoj“): přečte Směr vývoje a splatné připomínky,
roztřídí issues, realizuje rutinu, drobná zadání a etapy do stropu PR, ověří na preview, sloučí, co
pustí brána, opraví vlastní PR po review a CI, pošle souhrn. Náklady čte z vyúčtování Claude.
Spouštění z GitHubu jen štítkem od vlastníka (`github.event.sender.login`), nikdy komentářem `@claude`.

**Zkrácení `CLAUDE.md`** (RA9): postupy do skills v `.claude/skills/` (třídění a rutina, ověření na
preview, kontroly před PR, připomínky, přehled, fronta rozhodnutí). V `CLAUDE.md` zůstanou role, tvrdé
hranice, štítky a odkazy. Cíl: nebude delší než dnes (132 řádků).

**Měřítka** od začátku. AI dosud psala přes účet vlastníka bez patičky, výchozí stav proto jde spolehlivě
spočítat jen z merge a štítků `schvaleno`:

| měřítko | jak se měří | cíl |
|---|---|---|
| lidské zásahy | merge a `schvaleno` z účtu vlastníka týdně; po zavedení identit všechny jeho akce | pokles aspoň o polovinu |
| fronta | otevřené `navrh`, stáří nejstaršího | nejvýš 5, žádné starší 7 dní |
| doba od hlášení po nasazení, rutina | medián | do 2 dnů |
| doba od zadání po merge, drobné zadání | medián | do 3 dnů |
| regrese | PR revertované nebo opravované do 14 dnů | nejvýš 1 z 10 |

Při dvou regresích za čtyři týdny se zúží podmínky rutiny nebo prodlouží lhůta; automatický merge
se nevypíná.

**Zavedení:**

| krok | co dělá AI | práce vlastníka |
|---|---|---|
| 0, hned | upravit #53, zavřít duplikáty #216, #228, #229, #251, PR s odstraněním `auto-fix-issues.yml`, `auto-fix-iterative.yml` (jde ručně spustit s právy zápisu) a `notify-new-issue.yml` | smazat revizi #53, merge PR |
| 1, týden 1 | PR s pravidly a skills, labelerem a branou sloučení; štítky; třídění; odebrat `navrh` vedle `schvaleno` (#234, #244); přepsat projekty; výchozí měřítka | merge PR; dvě GitHub App bez obcházení rulesetu; brána jako povinná kontrola; povolit auto-merge; secret pro preview; soukromý repozitář a Směr vývoje; pohledy v UI (asi 60–90 min jednou) |
| 2, týden 2 | přepnout Clauda a asistenta na vlastní identity, zapnout automatický merge, skript přehledu, ověření na preview, denní úloha, příjem oprav od škol | – |
| 3, kdykoli | úklid `docs/` (RA5) jako rutina | – |

Po kroku 2 zbývá vlastníkovi: Směr vývoje, schválení projektů, zadání z veřejných hlášení a věcí za
tvrdými hranicemi, veto a mazání revizí s osobními údaji.

**Rozhodnutí části A:**

| | rozhodnutí | doporučuji |
|---|---|---|
| RA1 | Zrušit model ve třech úrovních, štítky `oblast:*` a `projekt` s etapami v checklistu | **ano** |
| RA2 | `navrh` jako jediný štítek „čeká na vlastníka“ | **ano** |
| RA3 | Devět oblastí | **ano** |
| RA4 | Životní cyklus projektu podle oddílu 8 | **ano** |
| RA5 | Úklid `docs/` | **ano**, jako rutina |
| RA6 | Dvě GitHub App (vývoj, asistent) bez obcházení rulesetu | **ano**, krok 1 |
| RA7 | Rutina včetně veřejných hlášení s automatickým merge přes bránu (hlášení po 24 h) | **ano** |
| RA8 | Drobná zadání a etapy realizovat hned a sloučit po 48 h bez veta | **ano** |
| RA9 | Zkrácení `CLAUDE.md` přes skills | **ano** |
| RA10 | Ověření na preview dělá AI s protokolem | **ano** |
| RA11 | Přehled neveřejně, Směr vývoje v soukromém repozitáři, veřejně `/changelog` | **ano** |
| RA12 | Denní úloha se stropem 5 PR denně | **ano** |
| RA13 | Brána sloučení jako povinná kontrola u každého PR, se zamrznutím | **ano** |
| RA14 | Opravy od škol z portálu a z ověřeného e-mailu školy cestou drobného zadání | **ano** |

# Část B: rozšíření podle měřítek

Po čtyřech týdnech provozu části A:

| | rozhodnutí | podmínka |
|---|---|---|
| RB1 | Lhůta veta 24 h místo 48 h u drobných zadání a etap | regrese nejvýš 1 z 10, fronta bez položek starších 2 dnů |
| RB2 | Vyšší limit rozsahu rutiny, víc oblastí v jednom PR | nejvýš 1 regrese rutiny za 4 týdny |
| RB3 | Zadání z veřejných hlášení se schválením mlčením | žádný zneužitý vstup za 4 týdny |
| RB4 | Některé tvrdé hranice (například texty e-mailových šablon) na veto místo schválení | podle zkušeností |

## 17. Přijatá rizika

| riziko | co ho omezuje | co vlastník přijímá |
|---|---|---|
| AI zařadí rizikovou změnu jako rutinu nebo drobné zadání | brána (cesty, rozsah, oblast), protokol, souhrn sloučených, revert | chyba může být na webu, než si jí někdo všimne |
| podvržený pokyn ve veřejném hlášení | brána, 24 h veto, zadání z hlášení jen se `schvaleno`, identity bez obcházení rulesetu | změna uvnitř hranic proběhne bez lidského pohledu |
| podvržená oprava od školy | ověřený účet portálu, SPF a DKIM z domény z rejstříku, 48 h veto | chybný údaj na webu do opravy |
| AI ověří na preview špatně | protokol se snímky | vizuální vada, kterou automat nepozná |
| chyba v nejnavštěvovanějších dnech | zamrznutí v bráně | – |
| únik interních údajů | přehled a Směr vývoje mimo veřejný repozitář | – |
| náklady denní úlohy | strop ve Směru vývoje | – |

## Změny návrhu

- **0.5** (3. 10. 2026, čtvrté kolo oponentury): brána sloučení jako povinná kontrola u každého PR
  (ruleset dnes nic nevynucuje); tvrdé hranice rozšířené o e-maily, crony a nasazení, adresy a SEO,
  přihlášení a portál; dvě oddělené identity AI a zadání z veřejného hlášení jen se `schvaleno`;
  drobná zadání a etapy se realizují hned a slučují po 48 h veta nad hotovým výsledkem (dřív RB1);
  `k-overeni` zpět ve frontě; denní souhrn místo upozornění na každou rutinu; zamrznutí; opravy od škol
  z portálu a ověřeného e-mailu; měřítka z merge a `schvaleno`; předpoklady preview v kroku 1.
- **0.4** (3. 10. 2026, zadání vlastníka: minimum lidských vstupů i za cenu vyššího rizika): tvrdé hranice,
  rutina s automatickým merge, schválení mlčením, ověření na preview AI, přehled, Směr vývoje, denní úloha
  a identita v části A, zkrácení `CLAUDE.md`, měřítka od začátku.
- **0.3** (druhé kolo oponentury): podpis AI a vlastní identita; `navrh` až u hotového zadání.
- **0.2** (první kolo oponentury): struktura a autonomie odděleně, schvaluje jen vlastník, životní cyklus
  projektu, přehled a směr vývoje neveřejně, přiložený audit.
- **0.1**: první verze.
