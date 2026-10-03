# Řízení vývoje: směr určuje člověk, provedení a přehled zajišťuje AI

Verze 0.4 · 3. 10. 2026 · **část A ke schválení hned, část B k rozhodnutí podle měřítek.**
Na GitHubu ani v pravidlech se zatím nic nemění.

Podklad: audit [Oblasti, projekty a etapy na GitHubu](historie/github-oblasti-audit-2026-10-03.md)
(3. 10. 2026). Z něj návrh přebírá soupis oblastí s cestami v kódu, nalezené duplikáty a zařazení
otevřených issues. Model ve třech úrovních z auditu (oblast jako trvalé issue → projekt jako sub-issue
→ etapy) návrh ruší a nahrazuje štítky (RA1). Tři kola oponentury jsou v PR #273.

## 1. Cíl a princip

Patrick určuje směr a priority a rozhoduje výjimky. Rutinní opravy, drobné úpravy a praktické detaily
dělá AI od zadání po nasazení. Patrick přitom má přehled, na čem se pracuje, jak se to vyvíjí a v jakém
stavu projekt je.

**Vlastník projektu výslovně přijímá vyšší riziko výměnou za méně lidských vstupů** (zadání k verzi 0.4).
Proto návrh staví na principu:

- **Lidská brána předem zůstává jen tam, kde se chyba nedá rychle vrátit.** To jsou tvrdé hranice
  v oddílu 3.
- **Všude jinde je pojistkou rychlé vrácení** (revert PR, rollback nasazení ve Vercelu), automatické
  kontroly a přehled po faktu.

Verze 0.3 držela lidské schválení a merge u všeho a autonomii odkládala. Tím by vlastníkovi práci
neubrala. Verze 0.4 přesouvá do části A všechno, co práci ubírá a nevyžaduje nové předpoklady.

Návrh má dvě části:

- **Část A, ke schválení hned** (oddíly 3–16): struktura, rutina s automatickým merge, schválení
  mlčením u drobných zadání, ověření na preview AI, přehled, směr vývoje, denní zpracování fronty,
  vlastní identita AI, zkrácení `CLAUDE.md`.
- **Část B, podle měřítek** (konec dokumentu): automatický merge i mimo rutinu, údaje od škol z portálu bez
  člověka a další rozšíření autonomie.

## 2. Role

| kdo | dělá | nedělá |
|---|---|---|
| **Patrick** (vlastník projektu) | píše a mění Směr vývoje, schvaluje projekty a věci za tvrdými hranicemi, veto (`stop`), merge projektů a drobných zadání podle protokolu, smazání revizí s osobními údaji | neschvaluje rutinu ani drobná zadání předem, neověřuje na preview, netřídí |
| **Eduarda** (AI asistent) | píše zadání a oponentury | neschvaluje |
| **Claude Code** | třídí, realizuje, dělá review, ověřuje na preview, merguje rutinu po automatických branách, píše přehled | nepřidává `schvaleno`, `zamitnuto` ani `stop`, nepřekračuje tvrdé hranice |
| **automatika** | štítky oblastí, kontrola hranic rutiny, CI, tabule | – |

**Za rozhodnutí se počítá jen štítek nebo komentář vlastníka, který nevytvořila AI.** Ve veřejném
repozitáři může „souhlas“ napsat kdokoli, proto Claude ověřuje autora komentáře (`user.login`) a u štítku
toho, kdo ho přidal (`actor` v timeline issue). Podle textu se neřídí nikdy.

Dnes ale Claude Code i asistent zadání pracují přes účet vlastníka, takže kontrola autora je nerozliší.
Do zavedení vlastní identity (RA6, krok 1) proto platí: AI každý komentář podepisuje patičkou, komentář
s patičkou ani štítek přidaný AI nebo automatikou se jako rozhodnutí nepočítá a štítky `schvaleno`,
`zamitnuto` a `stop` AI nikdy nepřidává.

# Část A

## 3. Tvrdé hranice

Bez výslovného `schvaleno` od vlastníka AI nikdy:

- nepřidá migraci, nezapíše do produkční databáze ani nespustí exporty z ní (pravidlo 5);
- nezačne volat nový cizí server (pravidlo 7, mlčení tu souhlasem není);
- nezmění zpracování osobních údajů, přihlášení ani práva v portálu;
- nezmění `CLAUDE.md`, `.claude/`, `.github/` (workflows, šablony), secrets ani závislosti;
- nezvýší náklady (nová placená služba, API, vyšší tarif);
- nepřepne datovou sadu v registru;
- nezačne projekt (štítek `projekt`).

Všechno ostatní může jít bez schválení předem: jako rutina (oddíl 5) nebo jako drobné zadání
schválené mlčením (oddíl 6).

## 4. Štítky

| štítek | význam |
|---|---|
| `projekt` | konečná práce s cílem a etapami (oddíl 7); jediné, co jde sloupci tabule |
| `oblast:<slug>` (9×) | trvalá část produktu (oddíl 10); issue má právě jednu oblast, PR jednu nebo víc |
| `rutina` | oprava, kterou AI realizuje a merguje bez člověka (oddíl 5) |
| `stop` | veto vlastníka: AI práci zastaví a nic nemerguje; přidává jen vlastník |
| `trvale` | průběžná issue (připomínky bez konce); vyřazená z tabule a třídění |

Beze změny zůstávají `interni`, `schvaleno`, `zamitnuto`, `k-overeni`, `pripominka`, `nova-data`
a veřejné `bug-report`, `portal-skoly`, `feature-request`.

**`navrh` znamená „čeká na vlastníka“** (RA2): nese ho zadání čekající na schválení nebo na uplynutí
lhůty mlčení a issue, ve kterém Claude položil otázku (oddíl 12). Samostatný štítek `rozhodnuti`
nevzniká. `tabule-schvaleno.yml` zůstane beze změny: `navrh` odebírá při schválení a vrací při odvolání.

## 5. Rutina: od zadání po nasazení bez člověka

**Co je rutina** (všechny podmínky současně):

- opravuje rozpor, který plyne z našich vlastních dat nebo kódu: pád stránky, chyba s postupem
  vyvolání, rozbitý odkaz, překlep, údaj v rozporu s naším zdrojem, padající test nebo workflow
  (kromě změny workflow samého), nález review;
- nepřebírá údaj od školy ani jiného nahlašovatele. Tvrzení školy není zdroj (kapacita, „obor
  neotvíráme“, chybějící obor patří do zadání nebo projektu);
- data mění jen přes generátor nebo soubor ručních oprav (například `data/obory_manual_overrides.csv`),
  nikdy přímo ve vygenerovaném `public/*.json`;
- nezavádí nový ukazatel ani pojem a nemění výpočet ve slovníku ukazatelů;
- leží uvnitř tvrdých hranic (oddíl 3), zasahuje do jedné oblasti a má nejvýš zhruba 150 změněných
  řádků kódu a ručních oprav dat (testy se nepočítají).

**Postup:** Claude roztřídí issue, přidá `rutina`, opraví, otevře PR a projde automatické brány:

1. povinné kontroly CI (Python, TypeScript, Integrace katalogu);
2. **kontrola hranic rutiny** (nový workflow, povinná kontrola v rulesetu): u PR se štítkem `rutina`
   selže, když PR mění `.github/`, `CLAUDE.md`, `.claude/`, `db/migrace/`, `package*.json`,
   `scripts/*-migrace*`, `public/stav_datovych_sad.json` nebo vygenerované `public/*.json`,
   má víc než jeden štítek `oblast:*` nebo překročí limit řádků. Hranice tak hlídá automatika,
   ne jen pokyn v promptu;
3. review Claudem bez otevřeného nálezu;
4. ověření na preview s protokolem (oddíl 8).

Po průchodu branami Claude PR **sloučí sám** (RA7). U rutiny z veřejného hlášení až po **24 hodinách**
bez veta (`stop`), aby vlastník mohl zasáhnout, kdyby šlo o podvržený pokyn. Vlastník rutiny vidí
v přehledu (oddíl 13) a špatnou vrátí revertem, nebo o to požádá Clauda.

**Rutina z veřejných hlášení je povolená** s výše uvedenými podmínkami. Text hlášení je jen popis
chyby. Claude ji musí sám vyvolat nebo ověřit proti našemu zdroji a podle textu hlášení nikdy nemění
nic jiného než chybné místo.

## 6. Drobné zadání: schválení mlčením

Interní zadání bez štítku `projekt`, které neprochází tvrdými hranicemi, ale rutinou není (nový text
nebo blok na stránce, úprava filtru, nový sloupec, nová položka slovníku pojmů pro existující údaj):

1. Claude napíše do issue plán na nejvýš deset řádků (co, které soubory, jak se ověří, rizika)
   a přidá `navrh`.
2. **Když vlastník do 48 hodin nepřidá `stop` ani `zamitnuto`, zadání platí za schválené** (RA8).
   Vlastník může lhůtu zkrátit štítkem `schvaleno`.
3. Claude realizuje, ověří na preview (oddíl 8) a PR předá vlastníkovi k merge jedním klepnutím podle
   protokolu. Automatický merge drobných zadání je v části B.

Lhůta platí jen pro zadání se štítkem `interni` založená vlastníkem nebo asistentem zadání. Veřejná
hlášení schválením mlčením nikdy neprojdou: buď jsou rutina, nebo z nich Claude založí interní zadání.

## 7. Projekty

Projekt je jediné, co vlastník schvaluje vždy výslovně. Životní cyklus (RA4):

1. **Nápad:** issue `[Zadání]` se štítky `interni`, `projekt`, `oblast:<slug>`, bez `navrh`.
   Je vidět v pohledu „Projekty“ ve sloupci Návrh.
2. **Rozbor** v komentářích téhož issue. Dokument v `docs/` jen u velkých věcí (nová stránka nebo
   zdroj dat, víc oblastí, migrace).
3. **Zadání přepsané do těla issue**, oponentura volitelná. Teprve teď dostane issue `navrh`.
4. **`schvaleno`** (jen vlastník).
5. **Etapy jako checklist v těle.** Jedna etapa = jedna větev `zadani/<N>-etapa-<M>-…` a jeden PR
   „Souvisí s #N“. Změna zadání = úprava těla + komentář „Změna zadání: co a proč“ + řádek
   v changelogu na konci těla.
6. **Merge vlastníkem podle protokolu z preview** (oddíl 8). Po otevření PR dostane issue `k-overeni`,
   po merge se etapa odškrtne a `k-overeni` se odebere.
7. **Poslední PR nese `Closes #N`.**
8. **Opravy po vydání:** komentář v projektu + PR „Souvisí s #N“; když splňují podmínky, jako rutina.
9. **Druhá verze** je nový projekt s odkazem na předchozí.

Žádná nová issues pro úpravu zadání, oponenturu, opravu po merge ani další etapu. Sub-issues se
nepoužívají: hlášení, která projekt opravuje, se vypíšou v těle projektu a PR je zavírá přes
`Closes #170, #174, …`.

## 8. Ověření na preview dělá AI

Dnes každý PR ručně kontroluje člověk na Vercel preview. Nově:

- Claude po nasazení preview projde každé kritérium „Hotovo když“ v prohlížeči (Playwright, v prostředí
  Clauda je k dispozici), na šířce telefonu i počítače.
- Do PR zapíše **protokol**: kritérium, adresa, výsledek (splněno / nesplněno / nejde ověřit), u vizuálních
  změn snímky obrazovky před a po. Snímky se ukládají jako artefakt běhu nebo do komentáře PR, ne
  do repozitáře.
- U rutiny je protokol bránou automatického merge, u drobných zadání a etap podkladem pro merge
  vlastníkem.

Předpoklad: když má projekt ve Vercelu zapnutou ochranu preview, potřebuje Claude obcházecí token
(`VERCEL_AUTOMATION_BYPASS_SECRET`) jako secret. Preview je náš vlastní web, pravidlo 7 o cizích
serverech se na něj nevztahuje.

## 9. Veřejná hlášení a osobní údaje

Při třídění dostane hlášení `oblast:<slug>`. Claude označí a zavře duplikáty s odkazem a rozhodne:
rutina (oddíl 5), interní zadání (oddíl 6), součást projektu, nebo dotaz nahlašovateli.

**Osobní údaje ve veřejném issue:** Claude upraví tělo (ponechá roli nebo RED IZO), do komentáře napíše,
co odstranil (bez opakování údaje), a pošle vlastníkovi okamžité upozornění se žádostí o **smazání
revize z historie úprav**. Úprava těla původní verzi nesmaže a přes API to nejde, jen v UI („Delete
revision from history“). Je to jeden ze dvou trvalých lidských úkonů v návrhu.

## 10. Oblasti jako štítky

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

**Issues** dostanou oblast při třídění. **PR** automaticky: mapování cest v `.github/labeler.yml`,
workflow `actions/labeler` na `pull_request` (ne `pull_request_target`). Štítek u PR slouží přehledu
a kontrole hranic rutiny. Issue nese oblast, kde se věc projevila, PR všechny oblasti, do kterých
zasahuje; rozpor se neopravuje.

## 11. Tabule

- **Auto-add:** `is:issue is:open -label:trvale` (zápor dokumentace GitHubu podporuje).
- **Vypnout „Auto-add sub-issues to project“** a archivovat 26 karet PR.
- **Pohled „Rozhoduji“:** `is:open label:navrh -label:trvale,rutina`. Rutina na vlastníka nečeká,
  `k-overeni` taky ne (ověřuje AI), proto ve frontě nejsou.
- **Pohled „Projekty“:** `label:projekt` podle Status (Návrh → Oponentura → Schváleno →
  Ke schválení merge → Hotovo).
- **Oblasti:** Projects neumí seskupovat podle štítků, stačí filtr `label:oblast:detail` apod.
  Pole „Oblast“ plněné workflow jen kdyby seskupení chybělo.

## 12. Fronta rozhodnutí

Kdykoli Claude potřebuje rozhodnutí, napíše komentář v této podobě a přidá `navrh`:

```
**Rozhodnutí:** jedna věta, co se rozhoduje
**Možnosti:** A) … B) … (případně C)
**Doporučuji:** A, protože …
**Dopad:** co se stane po A / po B, náklady, rizika
**Když nerozhodneš do <datum>:** provedu A / nic se neprovede (u tvrdých hranic)
```

U věcí uvnitř tvrdých hranic se po 48 hodinách provede doporučená možnost (stejně jako v oddílu 6).
U věcí za tvrdými hranicemi se bez odpovědi neprovede nic. Platí jen odpověď vlastníka (oddíl 2).

## 13. Přehled

Pravidelné výstupy nejsou issues a nic interního není veřejně.

- **Týdenní přehled** v pondělí do Telegramu (bot datové linky), delší verze do soukromého repozitáře
  (oddíl 14) s odkazem. Obsah: co čeká na vlastníka (fronta, PR k merge), **co AI sama sloučila**
  (rutina, s odkazem na revert), co se změnilo na webu po oblastech, stav projektů, provoz
  (neúspěšná workflow, červené CI, tokeny před expirací), náklady, hlášení, měřítka (oddíl 16).
- **Okamžitá upozornění** do Telegramu: červené CI na `main`, selhání datové linky, osobní údaje ve
  veřejném issue, revert rutiny, rutina z veřejného hlášení čekající 24 hodin.
- **Veřejně** jen změny webu na `/changelog` (`src/lib/changelog.ts`), plní ho Claude při merge.

Čísla počítá skript přes `gh`, Claude z nich píše text.

## 14. Směr vývoje

Soubor `smer-vyvoje.md` v **soukromém repozitáři** (například `tangero/stredniskoly-rizeni`), upravitelný
v aplikaci GitHub i z telefonu. Obsah na jednu obrazovku: cíle k datu, pořadí priorit, co se teď nedělá,
rozpočet (měsíční strop, strop PR denně), mimořádné pokyny. Claude ho čte při každém zpracování issues
a řadí podle něj práci. **Je to hlavní nástroj, kterým vlastník řídí**, vedle schvalování projektů.

## 15. Denní zpracování fronty a vlastní identita AI

**Vlastní identita** (RA6, krok 1): GitHub App (doporučeno) nebo strojový účet pro Claude Code,
denní úlohu a asistenta zadání. Práva: push do větví, PR, štítky, komentáře, úprava issues; **bez
obcházení rulesetu**. Ruleset pak sám zajistí, že AI sloučí jen PR se zelenými povinnými kontrolami
včetně kontroly hranic rutiny. Kontrola autora (oddíl 2) začne skutečně fungovat. Založení je
jednorázově asi 15 minut práce vlastníka.

**Denní úloha** (Routine v Claude Code, krok 2), jednou denně: přečte Směr vývoje a splatné připomínky,
roztřídí nová issues, realizuje rutinu, schválená a mlčením schválená zadání a etapy v pořadí priorit
do stropu PR, ověří na preview, sloučí rutinu po branách, opraví vlastní PR po review a CI, aktualizuje
frontu a přehled. Náklady čte z vyúčtování Claude a hlídá strop ze Směru vývoje.

Do založení vlastní identity smí denní úloha běžet pod tokenem vlastníka jen nad issues `interni`;
veřejná hlášení a automatický merge zapne až vlastní identita. Token vlastníka umí ruleset obejít,
proto by podvržený pokyn z hlášení mohl vést k merge čehokoli.

Spouštění z GitHubu (Action s Claude Code) jen štítkem přidaným vlastníkem s kontrolou
`github.event.sender.login`, nikdy komentářem `@claude`.

## 16. Pravidla, měřítka a zavedení

**Zkrácení `CLAUDE.md`** (RA9): postupy, které agent potřebuje jen občas, se přesunou do skills
v `.claude/skills/` (třídění a rutina, ověření na preview, kontroly před PR, připomínky, týdenní přehled,
fronta rozhodnutí). V `CLAUDE.md` zůstanou role, tvrdé hranice, štítky a odkazy na skills. Cíl: `CLAUDE.md`
nebude delší než dnes (132 řádků), i když přibude rutina a schválení mlčením.

**Měřítka** se začnou měřit hned, výchozí stav se dopočítá z historie GitHubu za poslední čtyři týdny:

| měřítko | jak se měří | cíl |
|---|---|---|
| zásahy vlastníka týdně | jeho komentáře, štítky a merge (bez komentářů s patičkou AI) | pokles aspoň o polovinu proti výchozímu stavu |
| fronta rozhodnutí | počet otevřených `navrh`, stáří nejstaršího | nejvýš 5, žádné starší 7 dní |
| doba od nahlášení po nasazení, rutina | medián | do 2 dnů |
| doba od zadání po merge, drobné zadání | medián | do 5 dnů |
| regrese | PR revertované nebo opravované do 14 dnů po merge | u rutiny nejvýš 1 z 10 |

Při dvou regresích rutiny za čtyři týdny se zúží její podmínky; automatický merge se nevypíná.

**Zavedení:**

| krok | co dělá AI | práce vlastníka |
|---|---|---|
| 0, hned | upravit tělo #53, zavřít duplikáty #216, #228, #229, #251, PR s odstraněním `auto-fix-issues.yml`, `auto-fix-iterative.yml` (jde ručně spustit s právy zápisu) a `notify-new-issue.yml` | smazat revizi #53 (2 min), merge PR |
| 1, týden 1 | PR s pravidly a skills, labelerem a kontrolou hranic rutiny; štítky; třídění otevřených issues; odebrat `navrh` vedle `schvaleno` (#234, #244); přepsat projekty podle oddílu 7; výchozí měřítka | merge PR; vytvořit GitHub App a soukromý repozitář, vyplnit Směr vývoje, v UI auto-add, dva pohledy, kontrola hranic a App v rulesetu, povolit auto-merge (celkem asi 60 min jednou) |
| 2, týden 2 | skript přehledu, ověření na preview, denní úloha | – |
| 3, kdykoli | úklid `docs/` (RA5) jako rutina | – |

Po kroku 2 zbývá vlastníkovi: Směr vývoje, schválení projektů, merge drobných zadání a etap podle
protokolu, veto a mazání revizí s osobními údaji.

**Rozhodnutí části A:**

| | rozhodnutí | doporučuji |
|---|---|---|
| RA1 | Zrušit model ve třech úrovních a nahradit ho štítky `oblast:*` a `projekt` s etapami v checklistu | **ano** |
| RA2 | `navrh` jako jediný štítek „čeká na vlastníka“ | **ano** |
| RA3 | Devět oblastí (inspekce pod data, novináři pod provoz) | **ano** |
| RA4 | Životní cyklus projektu podle oddílu 7 | **ano** |
| RA5 | Úklid `docs/`: rozcestník `docs/README.md`, překonané do `docs/historie/` | **ano**, jako rutina |
| RA6 | Vlastní identita AI (GitHub App) bez obcházení rulesetu | **ano**, v kroku 1 |
| RA7 | Rutina včetně veřejných hlášení s automatickým merge po branách (u hlášení po 24 h bez veta) | **ano** |
| RA8 | Schválení mlčením u drobných interních zadání (48 h) | **ano** |
| RA9 | Zkrácení `CLAUDE.md` přesunem postupů do skills | **ano** |
| RA10 | Ověření na preview dělá AI s protokolem, vlastník neověřuje | **ano** |
| RA11 | Přehled neveřejně, Směr vývoje v soukromém repozitáři, veřejně jen `/changelog` | **ano** |
| RA12 | Denní úloha se stropem 5 PR denně, do vlastní identity jen nad `interni` | **ano** |

# Část B: rozšíření podle měřítek

Rozhoduje se po čtyřech týdnech provozu části A podle měřítek z oddílu 16.

| | rozhodnutí | podmínka |
|---|---|---|
| RB1 | Automatický merge drobných zadání a etap projektů po protokolu z preview a 24 h bez veta | regrese drobných zadání nejvýš 1 z 10 |
| RB2 | Údaje od škol zadané přes portál pro školy (ověřený účet školy) se přebírají bez člověka | portál zaznamenává, kdo údaj zadal; kontrola rozsahu změny |
| RB3 | Vyšší limit rozsahu rutiny, víc oblastí v jednom PR | nejvýš 1 regrese rutiny za 4 týdny |
| RB4 | Lhůta mlčení 24 h místo 48 h | fronta rozhodnutí bez položek starších 2 dnů |

## 17. Přijatá rizika

| riziko | co ho omezuje | co vlastník přijímá |
|---|---|---|
| AI zařadí rizikovou změnu jako rutinu a sama ji sloučí | kontrola hranic rutiny jako povinná kontrola, protokol z preview, přehled sloučených, revert | chyba může být na webu, než si jí někdo všimne |
| podvržený pokyn ve veřejném hlášení | hranice vynucené automatikou, 24 h veto, identita bez obcházení rulesetu | změna uvnitř hranic proběhne bez lidského pohledu |
| schválení mlčením projde zadání, které by vlastník zamítl | plán v issue, 48 h, přehled, revert | občas zbytečná práce a vrácení |
| AI ověří na preview špatně | protokol se snímky, kritéria „Hotovo když“ | vizuální vada, kterou automat nepozná |
| únik interních údajů | přehled a Směr vývoje mimo veřejný repozitář | – |
| náklady denní úlohy | strop ve Směru vývoje, náklady v přehledu | – |

## Změny návrhu

- **0.4** (3. 10. 2026, zadání vlastníka: minimalizace lidského vstupu i za cenu vyššího rizika a větších
  pravomocí AI): tvrdé hranice místo schvalování všeho; rutina s automatickým merge v části A včetně
  veřejných hlášení (24 h veto) a s kontrolou hranic jako povinnou kontrolou; schválení mlčením u drobných
  zadání; ověření na preview dělá AI; přehled, Směr vývoje, denní úloha a vlastní identita přesunuté do
  části A; štítek `stop`; zkrácení `CLAUDE.md` přes skills; měřítka od začátku; část B jen rozšíření
  autonomie podle měřítek.
- **0.3** (3. 10. 2026, druhé kolo oponentury): podpis AI a vlastní identita (RA6); oblast u issue a PR;
  `navrh` až u hotového zadání; odebrání `navrh` vedle `schvaleno`.
- **0.2** (3. 10. 2026, první kolo oponentury): rozdělení na strukturu a autonomii; schvaluje jen vlastník
  a ověřuje se autor; třídy `uprava` a `smer` zrušené; `navrh` místo `rozhodnuti`; sub-issues zrušené;
  životní cyklus projektu; přehled a směr vývoje neveřejně; smazání revize u osobních údajů; podmínky
  identity a vstupu denní úlohy; opravené filtry tabule; labeler na `pull_request`; přiložený audit.
- **0.1** (3. 10. 2026): první verze.
