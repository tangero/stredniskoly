# Řízení vývoje: směr určuje člověk, provedení a přehled zajišťuje AI

Verze 0.1 · 3. 10. 2026 · **návrh ke schválení**, na GitHubu ani v pravidlech se zatím nic nemění.

Nahrazuje návrh „Oblasti, projekty a etapy na GitHubu“ (audit z 3. 10. 2026). Z něj přebírá soupis
oblastí s cestami v kódu, nalezené duplikáty a zařazení otevřených issues. Model ve třech úrovních
(issues oblastí, projekty, sub-issues) nepřebírá, důvody jsou v oddílu 10.

## 1. Cíl

Patrick určuje směr, priority a rozhoduje věci, které mění produkt, náklady nebo rizika. Rutinní opravy
ani praktické detaily neřeší. Přitom má kdykoli přehled, na čem se pracuje, jak se to vyvíjí a v jakém
stavu projekt je.

Dnes každá změna prochází dvěma lidskými branami: schválením předem (`schvaleno`) a kontrolou s merge
potom. Claude navíc pracuje jen tehdy, když ho někdo spustí. Přehled se skládá z tabule s 68 kartami,
ve které se míchají issues, PR a veřejná hlášení. Návrh mění tři věci:

1. **Třídy změn** (oddíl 3): rutina se schvaluje jen při merge, předem se schvalují jen úpravy a směr.
2. **Přehled, který se sám generuje** (oddíl 4): fronta rozhodnutí a týdenní zpráva z dat GitHubu.
   Ručně udržované stránky nezavádí.
3. **Pravidelné zpracování fronty** (oddíl 6): Claude třídí a realizuje práci podle plánu, bez ručního
   spouštění.

### Měřítka úspěchu

Měří je týdenní přehled automaticky. Vyhodnocení proběhne po čtyřech týdnech (oddíl 11, fáze 4).

| měřítko | jak se měří | cíl |
|---|---|---|
| zásahy Patricka týdně | počet jeho komentářů, štítků a merge na GitHubu (náhrada za čas, ten změřit nejde) | klesá; rutina tvoří nejvýš pětinu |
| fronta rozhodnutí | počet otevřených issues `rozhodnuti` a stáří nejstaršího | nejvýš 5 položek, žádná starší 7 dní |
| doba od nahlášení po merge, rutina | medián od založení issue po merge PR | do 3 dnů |
| doba od schválení po nasazení, úpravy a etapy | medián od štítku `schvaleno` po merge | do 7 dnů |
| regrese | PR revertované nebo opravované do 14 dnů po merge, podle třídy | u rutiny nejvýš 1 z 20 |

## 2. Role

| kdo | dělá | nedělá |
|---|---|---|
| **Patrick** | určuje směr (oddíl 5), schvaluje směrové změny a nové projekty, rozhoduje frontu rozhodnutí, merguje | netřídí hlášení, neschvaluje rutinu předem, nečte rutinní PR řádek po řádku |
| **Eduarda** | píše zadání, ověřuje úpravy na Vercel preview, podle rozhodnutí R2 schvaluje úpravy | neschvaluje směrové změny |
| **Claude Code** | třídí issues (oblast, třída, duplikát, osobní údaje), realizuje, dělá review, připravuje podklady k rozhodnutí, píše týdenní přehled | nemerguje, nemění třídu směrem dolů proti rozhodnutí člověka, nerealizuje nic ze směrové třídy bez schválení |
| **automatika** | štítek oblasti u PR podle změněných souborů, tabule, CI, upozornění na selhání | – |

## 3. Třídy změn

Každé issue a každý PR má právě jednu třídu. Určí ji Claude při třídění. Když si není jistý,
zvolí vyšší třídu. Patrick nebo Eduarda můžou třídu změnit výměnou štítku, Claude ji pak nemění.

| štítek | třída | schválení předem | merge |
|---|---|---|---|
| `rutina` | oprava chyby, textu nebo dat bez vlivu na směr | **žádné** | Patrick v dávce (R3) |
| `uprava` | změna chování nebo obsahu existující funkce | krátký plán v issue, schvaluje R2 | Patrick po ověření na preview |
| `smer` | nová funkce, stránka nebo zdroj dat, náklady, rizika | návrh v `docs/`, oponentura, schvaluje Patrick | Patrick |

### 3.1 Rutina: všechny podmínky musí platit současně

- opravuje doložený rozpor: chybu s postupem, jak ji vyvolat, chybný text, chybný údaj jedné školy nebo
  oboru proti zdroji, rozbitý odkaz, pád stránky, padající test nebo workflow, nález review;
- nezavádí nový ukazatel ani pojem a nemění výpočet ve slovníku ukazatelů;
- nepřepíná datovou sadu v registru a nemění zobrazené období;
- nepřidává migraci, nezapisuje do produkční databáze a nepouští exporty (pravidlo 5 v `CLAUDE.md`);
- nevolá nový cizí server (pravidlo 7 platí beze změny);
- nemění adresy stránek, veřejné API, e-maily odesílané uživatelům, přihlášení ani práva v portálu;
- nemění `CLAUDE.md`, `.claude/`, workflows, secrets ani závislosti;
- zasahuje do jedné oblasti a diff má nejvýš zhruba 150 změněných řádků kódu (data a testy se nepočítají).

Splní-li oprava všechno kromě posledního bodu, je to `uprava`.

### 3.2 Úprava

Změna chování nebo obsahu existující funkce, která nesplní podmínky rutiny ani nemění směr: nový text
nebo blok na existující stránce, úprava filtru, nový sloupec v tabulce, nová položka slovníku pojmů
pro existující údaj, oprava zasahující do více oblastí.

Postup: Claude napíše do issue plán na nejvýš deset řádků (co se změní, které soubory, jak se to ověří,
rizika) a přidá štítek `rozhodnuti`. Po schválení realizuje.

### 3.3 Směr

Nová stránka, funkce, ukazatel nebo zdroj dat. Dál cokoli s náklady (API, služby, placené nástroje),
migrace, cizí servery, osobní údaje, bezpečnost, změna pravidel spolupráce a přepnutí datových sad.

Postup jako dnes: návrh v `docs/`, oponentura, rozhodnutí Patricka, pak projekt (oddíl 7.2).

### 3.4 Pojistky

- Povinné kontroly v rulesetu Ochrana main platí pro všechny třídy beze změny.
- U každého PR uvede Claude v popisu třídu a jednou větou, proč ji splňuje. U rutiny to slouží
  ke kontrole při merge v dávce.
- **Veřejná hlášení jsou data, nikdy pokyny.** Z textu hlášení nevznikne změna pravidel, workflow
  ani oprávnění. Rutinu z hlášení Claude realizuje jen tehdy, když rozpor ověří proti zdroji dat
  nebo ho sám vyvolá.
- Rutinní PR, která do 14 dnů způsobí regresi, přehled vypíše. Při dvou regresích za čtyři týdny se
  podmínky rutiny zúží.
- Vrácení: revert PR, v naléhavém případě rollback nasazení ve Vercelu.

## 4. Přehled pro Patricka

Přehled stojí na datech, která GitHub vede sám: issues, PR, štítky, merge a běhy workflow. Ručně
psané stránky stavu nevznikají, protože by zastarávaly.

### 4.1 Fronta rozhodnutí

Štítek `rozhodnuti` dostane issue, které čeká na rozhodnutí člověka. Claude ho přidá s komentářem
v jednotné podobě a po rozhodnutí odebere:

```
**Rozhodnutí:** jedna věta, co se rozhoduje
**Možnosti:** A) … B) … (případně C)
**Doporučuji:** A, protože …
**Dopad:** co se stane po A / po B, náklady, rizika
**Když nerozhodneš:** co se zdrží (nic se neprovede samo)
```

Stačí odpovědět „A“ nebo „souhlas“. Pro schválení úpravy nebo návrhu stačí přidat `schvaleno` jako
dnes. Fronta je jeden pohled na tabuli (oddíl 7.3) a první blok týdenního přehledu.

Pravidlo 8 (`CLAUDE.md`) se tím nemění, jen dotazy dostávají jednotnou podobu a štítek.

### 4.2 Týdenní přehled

Každé pondělí ráno. Plná verze je komentář v jednom připnutém issue „Stav projektu“, takže historie
zůstane na jednom místě a jde prohledávat. Do Telegramu (bot datové linky) přijde pět řádků a odkaz.

Obsah v tomto pořadí:

1. **Čeká na tebe:** fronta rozhodnutí s doporučením a stářím; rutinní PR připravené k merge v dávce
   (číslo, oblast, věta, výsledek review).
2. **Co se změnilo na webu:** po oblastech, lidskou řečí („stránka oboru ukazuje…“), s odkazy na PR.
3. **Projekty:** u každého cíl, hotové a další etapa, a zda se drží plánu.
4. **Provoz:** neúspěšné workflow (datová linka, CSI, sklízeč, veletrhy), červené CI na `main`,
   tokeny před expirací (`PROJECT_TOKEN`, `CSI_PR_TOKEN`), náklady proti rozpočtu.
5. **Hlášení z webu:** nová, vyřízená, otevřená, duplikáty.
6. **Měřítka** z oddílu 1 a jejich vývoj.

Generuje ho naplánovaná úloha Clauda (Routine v Claude Code). Čísla bere skript přes `gh`,
Claude z nich píše text. Skript `scripts/tydenni-prehled.mjs` se postará, aby čísla nebyla odhadem.

### 4.3 Okamžitá upozornění

Do Telegramu jen to, co nepočká do pondělí: červené CI na `main`, selhání datové linky nebo
zálohy, hlášení s osobními údaji ve veřejném issue. Ostatní jde do týdenního přehledu.

## 5. Směr vývoje: nástroj, kterým Patrick řídí

Jedno připnuté issue „Směr vývoje“. Patrick ho upravuje přímo na GitHubu, i z telefonu. Historie změn
těla zůstává v issue. Claude ho čte při každém zpracování fronty a řídí se jím při řazení práce
a určování třídy.

Obsah, nejvýš jedna obrazovka:

- **Cíle do určitého data** (například do přihlášek k přijímacím zkouškám): tři až pět vět.
- **Pořadí priorit:** seznam projektů a oblastí.
- **Teď neděláme:** co se odkládá a proč. Zabrání návrhům, které se pak zamítají.
- **Rozpočet:** měsíční strop na API a služby, strop počtu PR denně.
- **Mimořádné pokyny:** například „do 15. 1. jen rutina v oblasti data“.

Rozdělení: `docs/` popisují, jak věci fungují a proč se rozhodlo. „Směr vývoje“ říká, co je teď
důležité. Týdenní přehled říká, jak to jde.

## 6. Pravidelné zpracování fronty

Dnes Claude pracuje, jen když ho někdo spustí. Návrh zavádí denní naplánovanou úlohu (Routine
v Claude Code, každá spustí novou relaci nad tímto repozitářem):

1. Přečte „Směr vývoje“ a splatné připomínky.
2. Roztřídí nová issues (oddíl 7.1).
3. Realizuje rutinu a schválené úpravy a etapy v pořadí priorit, nejvýš N PR za běh podle rozpočtu.
4. Opraví rutinní PR po review a červeném CI.
5. Aktualizuje frontu rozhodnutí.

Úloha nesmí: mergovat, měnit štítky `schvaleno` a `zamitnuto`, zakládat projekty ani volat cizí servery
mimo schválený způsob. Při chybě prostředí napíše do přehledu, nic neobchází.

Dřív odložená možnost `@claude` v GitHubu (spouštění komentářem) je doplněk pro Eduardu. Nahrazovat
denní úlohu nemusí.

## 7. Struktura na GitHubu

### 7.1 Třídění nového issue

Claude (denní úloha, nebo relace, která na issue narazí) doplní:

- štítek oblasti `oblast:<slug>` (oddíl 7.4);
- třídu `rutina` / `uprava` / `smer`;
- u duplikátu komentář s odkazem a zavření jako duplikát;
- u osobních údajů ve veřejném issue: upraví tělo a nechá jen roli nebo RED IZO, do komentáře napíše,
  co odstranil (bez opakování údaje), a pošle okamžité upozornění;
- chybí-li údaje pro reprodukci, napíše dotaz nahlašovateli. Do fronty rozhodnutí to nepatří.

Veřejná hlášení (`bug-report`, `portal-skoly`, `feature-request`) se po třídění realizují podle třídy.
Dnešní pravidlo „nerealizovat hlášení“ se tím pro rutinu mění, viz pojistky v oddílu 3.4.

### 7.2 Projekty

Projekt je jedno issue se štítky `projekt` a `smer`. Tělo obsahuje:

- cíl a pro koho,
- rozsah a co se nedělá,
- etapy jako checklist (každá etapa = jedna větev a jeden PR „Souvisí s #N“, `Closes #N` jen poslední),
- odkaz na návrh v `docs/`,
- log rozhodnutí (datum, co, odkaz na komentář).

**Žádná nová issues** pro úpravu návrhu, oponenturu, opravu po merge ani další etapu: komentář
v projektu a PR „Souvisí s #N“. Sub-issues jen pro hlášení, která projekt opravuje.

### 7.3 Tabule

- Auto-add jen `is:issue is:open` (PR na tabuli nepatří, projekt je ukáže v Linked pull requests).
- **Pohled „Rozhoduji“:** `is:open label:rozhodnuti`, k tomu `label:k-overeni` u tříd `uprava` a `smer`.
- **Pohled „Projekty“:** `label:projekt` podle Status (Návrh → Oponentura → Schváleno → Ke schválení merge → Hotovo).
- **Pohled „Vše otevřené“:** tabulka seskupená podle oblasti, slouží jen k dohledání.
- Rutina na tabuli stavy nepotřebuje. Je vidět v týdenním přehledu.

### 7.4 Oblasti jako štítky

Devět oblastí. Mapování na cesty v kódu bude v `.github/labeler.yml`, workflow `actions/labeler` podle
něj označí každý PR. Cesty přebírá z původního auditu.

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

Inspekce a Pro novináře mají málo otevřené práce. Pro přehled a třídění jsou samostatné oblasti spíš
zátěží. Kdyby se rozrostly, štítek se rozdělí bez dalších změn.

Issues oblastí, sub-issues pod oblastmi ani zpětné připojování historie nevznikají.

## 8. Změny pravidel (`CLAUDE.md` a šablony)

Provedou se jedním PR po schválení tohoto návrhu.

- **Tabulka štítků:** přidat `rutina`, `uprava`, `smer`, `rozhodnuti`, `projekt`, `oblast:<slug>`.
- **Pravidlo 1:** nahradit třídami z oddílu 3. Realizovat lze `rutina` bez schválení,
  `uprava` a `smer` s `schvaleno`. Připomínky a pravidlo 7 beze změny.
- **Pravidlo 2:** projekty a etapy podle oddílu 7.2. U rutiny může jeden PR zavřít víc souvisejících
  issues ze stejné oblasti.
- **Pravidlo 3** (nemergovat) beze změny, dokud Patrick nerozhodne jinak (R3).
- **Pravidlo 8:** dotaz ve formátu z oddílu 4.1 se štítkem `rozhodnuti`.
- **Nové pravidlo:** před prací přečíst issue „Směr vývoje“.
- **Šablona interního zadání:** bez výchozího štítku `navrh`. Třídu doplní Claude při třídění.
  `navrh` dostanou jen `uprava` a `smer`.
- **`tabule-schvaleno.yml`:** beze změny.
- **Zkrácení `CLAUDE.md`:** postupy, které agent potřebuje jen občas (příkazy pro tabuli, připomínky,
  týdenní přehled, třídění), přesunout do skills v `.claude/skills/`. Do kontextu se pak načítají jen
  při potřebě a hlavní pravidla jsou kratší.

## 9. Pořádek v dokumentaci

`docs/` má 136 položek. Vedle platných návrhů jsou tam pracovní zprávy z února, review jednotlivých
PR a pět verzí oponentury jednoho návrhu. Pro přehled o projektu je to dnes překážka.

Jako samostatná rutina: `docs/README.md` s rozcestníkem platných dokumentů po oblastech a přesun
překonaných dokumentů do `docs/historie/` (soubory se nemažou, odkazy se opraví). Rozcestník pak
nahradí dlouhý seznam v `.claude/claude.md`.

## 10. Co z původního návrhu přebíráme a co ne

| původní návrh | tady | proč |
|---|---|---|
| PR mimo tabuli (auto-add jen issues) | přebírá | nejlevnější zlepšení přehledu |
| zákaz nových issues pro oponentury a opravy po merge | přebírá | méně roztříštěné práce |
| zavřít duplikáty #216, #228, #229, #251 | přebírá | – |
| hlášení odděleně od projektů | přebírá, řeší třídění | – |
| 11 issues oblastí s ručně psanou historií | nahrazuje štítky a týdenním přehledem | těla by zastarávala, průběh trvalé oblasti nic neříká |
| 40 sub-issues, zpětné připojení historie | vypouští | historie je v gitu a PR, cena převyšuje užitek |
| etapa jako checklist nebo sub-issue | jen checklist | jedno pravidlo místo dvou |
| ruční přiřazení oblasti při zakládání | štítek u PR automaticky, u issue při třídění | bez práce pro člověka |
| pohledy Rozpracováno / Oblasti / Hlášení | Rozhoduji / Projekty / Vše otevřené | hlavní je fronta rozhodnutí |
| schválení každého issue předem | jen `uprava` a `smer` | rutinu kontroluje merge |

## 11. Zavedení

| fáze | co | práce Patricka |
|---|---|---|
| 0, hned | upravit tělo #53 (osobní údaje), auto-add jen issues, zavřít čtyři duplikáty | 10 min v UI (auto-add); zbytek Claude po souhlasu |
| 1, týden 1 | PR s pravidly (oddíl 8), štítky, `labeler.yml` a workflow, issues „Směr vývoje“ a „Stav projektu“ | schválit PR, vyplnit Směr vývoje (30 min) |
| 2, týden 2 | skript a Routine týdenního přehledu, pohled Rozhoduji, třídění otevřených issues | založit dva pohledy v UI (10 min) |
| 3, týden 3 | denní Routine zpracování fronty s rozpočtem | schválit rozpočet |
| 4, po 4 týdnech | vyhodnotit měřítka, rozhodnout o merge rutiny (R3) a úklidu `docs/` | jedno rozhodnutí |

Pořádek v `docs/` (oddíl 9) se dělá jako rutina kdykoli po fázi 1.

## 12. Rizika

| riziko | protiopatření |
|---|---|
| Claude zařadí rizikovou změnu jako rutinu | tvrdé podmínky v oddílu 3.1, v pochybnosti vyšší třída, zdůvodnění třídy v PR, sledování regresí |
| merge v dávce se stane razítkováním | přehled u každého PR uvádí výsledek review a riziko; v rutině nejsou migrace, pravidla, API ani e-maily |
| podvržený pokyn ve veřejném hlášení | hlášení jsou data; rutinu z hlášení jen po ověření proti zdroji; workflow a pravidla nikdy |
| denní úloha generuje náklady nebo šum | strop PR a rozpočtu ve Směru vývoje, náklady v přehledu |
| vyprší token a automatika potichu selže | expirace tokenů v přehledu, selhání workflow jako okamžité upozornění |
| přehled se přestane číst | pět řádků v Telegramu, plná verze jen jako odkaz; měřítko stáří fronty rozhodnutí |

## 13. Rozhodnutí pro Patricka

| | rozhodnutí | doporučuji |
|---|---|---|
| R1 | Třídy a podmínky rutiny podle oddílu 3 | schválit; po čtyřech týdnech upravit podle regresí |
| R2 | Kdo schvaluje `uprava`: Eduarda, nebo Patrick | **Eduarda**, Patrick ji vidí v přehledu a může vetovat; Patrick schvaluje jen `smer` |
| R3 | Merge rutiny: Patrick v dávce z přehledu, později automatický merge po zelených kontrolách a review | teď **v dávce**; o automatickém merge rozhodnout ve fázi 4 podle regresí (vyžaduje změnu pravidla 3) |
| R4 | Kanál přehledu: připnuté issue a Telegram | **ano** |
| R5 | Denní zpracování fronty se stropem | **ano**, začít se stropem 3 PR denně |
| R6 | Devět oblastí (inspekce pod data, novináři pod provoz) | **ano** |
| R7 | Směr vývoje jako připnuté issue (alternativa: soubor v `docs/`) | **issue**, jde upravit bez PR a z telefonu |
| R8 | Úklid `docs/` (oddíl 9) | **ano**, jako rutina po fázi 1 |
