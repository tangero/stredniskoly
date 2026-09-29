# Oponentura návrhu prototypu kritérií přijetí

Oponentura dokumentu `docs/prototyp-kriteria-prijeti.md` ze 24. 9. 2026. Tvrzení dokumentu
ověřena proti kódu v pracovním stromu (`src/lib/portal-kriteria.ts`, `src/app/api/portal/kriteria/route.ts`,
`src/app/pro-skoly/kriteria/page.tsx`, `src/lib/kriteria-stav.ts`, `src/lib/portal-schema.ts`,
`db/migrace/002-portal.sql`, `src/data/kriteria-prijeti-2026-pilot.json`, `data/dipsy-kriteria-pilot/`),
proti živému DiPSy API a proti existujícím datům webu. Doplňující měření:
`docs/podklady/dipsy-shoda-kliku-2026-09-24.md`.

**Tři P1 nálezy; návrh doporučuji doplnit a přepořádat před jakýmkoli veřejným zapnutím.**
Nálezy 1–13 hodnotí návrh a proces, sekce „Code review" doplňuje řádkové review součástí (nálezy 14–16)
a výslovně uvádí, co prověřené bez nálezu je.

## Nálezy

1. **P1 — Katalogový fallback tvrdí `konaJPZ` bez dokladu.** Dokument slibuje: „U oboru bez JPZ formulář nenabízí volbu ‚pouze součet JPZ‘". Platí jen u oboru z karty DiPSy, která `konaJPZ` nese (`src/app/api/portal/kriteria/route.ts:26`). Katalogový fallback ale všem oborům nastaví `konaJPZ: true` natvrdo (`src/lib/portal-kriteria.ts:116`) a katalog 2026 obsahuje stovky oborů bez JPZ (např. 151 s kkov 65-xx v `public/applications_2026.json`). U oboru bez karty DiPSy — například plánovaného oboru 2027 — formulář volbu „pouze součet JPZ" nabídne i tam, kde se JPZ nekoná. Přímý rozpor s vlastním principem bodu 3 dokumentu („chybějící údaj není ‚pouze JPZ‘"). Náprava: u katalogových oborů nenabízet volbu jako potvrzenou, ale jako výchozí k ověření; nebo `konaJPZ` označit jako neznámé, dokud karta DiPSy neexistuje.

2. **P1 — Novější neověřená verze zdroje tiše stíní ověřenou.** `overenePodkladyKriterii` vybírá nejnovější pozorování zdroje a teprve potom filtruje `stav = 'overeno'` (`src/lib/portal-kriteria.ts:200–215`). Nový kandidát — klidně přegenerovaný OCR nebo obsahově totožný dokument s novým hashem — tedy schová lidsky ověřené pravidlo **bez vyvolání rozporu a bez výstrahy**. Dokument stínění přiznává a test `tests/portal-kriteria.test.mjs:116` ho dokonce hlídá jako zamýšlené chování — tedy jde o úmysl, ne o přehlédnutí, ale důsledek zůstává neřešený: automatický re-scrape může schodit ověřená pravidla v libovolném počtu najednou. Náprava: nový kandidát s jiným hashem než poslední ověřený má stav `rozpor` vyvolat (nebo aspoň příznak nastavit), ne pravidlo potichu shodit.

3. **P1 — Cross-year stabilita `obor_klic` je neměřitelná a návrh na ní stojí.** Klíč je sha256 nad normalizovanými složkami (izo, kkov, zaměření, forma, délka), počítaný zvlášť pro katalog a zvlášť pro DiPSy (`src/lib/portal-kriteria.ts:20–24`). Měření 24. 9. 2026 (50 škol) potvrdilo **within-year** shodu 49/50 škol se 100 % katalogových nabídek; ale jde o stejný ročník. Riziko je mezi ročníky: škola uloží záznam proti klíči z katalogu 2026 (plánovaný obor), karta DiPSy 2027 může nést jinou normalizovanou podobu zaměření a záznam se stane sirotcem. Testovatelná je až po vydání karet 2027 (zadání kritérií do DiPSy je 15.–31. 1. 2027 podle harmonogramu MŠMT). Náprava: (a) vedle hashe ukládat surové složky klíče, aby šla shoda přepočítat a neshoda diagnostikovat po polích; (b) nespárované záznamy v lednu 2027 nezahazovat, ale dát do fronty ručního párování podle vzoru `docs/podklady/overene-pary-nabidek-2026.csv`; (c) měření zopakovat skriptem `scripts/dipsy-shoda-kliku.mjs --rok 2027 --vse`.

4. **P2 — Návrh obchází rozhodnutí z předchozího dne bez důvodu.** 23. 9. 2026 (PR #159) se rozhodlo: strukturované pole přijde „až po prvních odpovědích pilotu, aby se navrhl podle toho, jak školy kritéria skutečně popisují, ne podle jediné školy". O den později existuje datový model, formulář i importní pipeline — a dokument o odpovědích dvaceti pilotních škol nemá jedinou větu. Rozhodnutí buď padlo (patří do dokumentu s důvodem), nebo je obcházeno.

5. **P2 — Dichotomie `pouze_jpz`/`jine` je hrubší než to, co web už ví.** Předmětový sklon (`scripts/predmetovy-sklon.py`) naměřil nápadné vážení jednoho předmětu u 73 z 354 měřitelných oborů (45× matematika, 28× čeština; Doppler je nejvýraznější případ v zemi, z = −9,9). Nejcennější strukturovaný údaj — váhy — se v návrhu sbírá z PDF (neověřené, dokument sám varuje, že OCR „může zkomolit čísla a znaménka"), zatímco škola, která kritéria vyhlašuje, zadává bit plus prózu. Autor doznává: strukturovaná editace ve formuláři školy přijde později. To je přijatelné, ale patří do dokumentu jednou větou, jinak se binární `rezim` při prvním veřejném zapnutí zkostnatí — rozšíření pak znamená přepsání už zobrazených dat.

6. **P2 — Stavy `overeno`/`rozpor` neumí nastavit nic.** V kódu neexistuje cesta, která by je zapsala; přechody stavů jsou ruční SQL, o kterém dokument mlčí. „Rozpor do vyřešení" z bodu 3 je deklarace, ne mechanismus — není určeno, kdo rozpor řeší a v jakém čase.

7. **P2 — Migrace přidává tabulky do 002-portal.sql, který na produkci už běžel.** Portál provozuje dvacet pilotních škol a soubor byl commitnutý dříve; teď nesl dvě nové tabulky (`portal_kriteria`, `kriteria_podklad`). Funguje to jen díky idempotenci (`create table if not exists`) a re-runnable skriptu — ale porušuje to vlastní poučení z incidentu veletrhů (005-veletrhy.sql vznikl ručně a nic ho nespustilo) a číslo migrace přestává označovat stav schématu. Čistší je nový soubor `003-portal-kriteria.sql`.

8. **P2 — Časové osy podkladů se mezi DB a pilotním CSV neshodují.** Tabulka `kriteria_podklad` má `pozorovano_at`/`publikovano_at`/`overeno_at`; kontrolní list pilota nese `ziskano_at`/`zkontrolovano_at`/`publikovano_at`/`overeno_at` — jiná jména, částečně jiný význam, `zkontrolovano_at` v DB chybí. „Převod schváleného záznamu do evidované verze podkladu" je tak otevřená mapovací práce, kterou dokument nepopisuje.

9. **P3 — „Prototyp v repozitáři" není pravda.** Všechny součásti jsou necommitnuté v pracovním stromu (`git status`: `src/lib/portal-kriteria.ts`, formulář, API route, skripty, pilotní JSON i změny 002-portal.sql). Dokument popisuje stav, který nejde dohledat v historii.

10. **P3 — POST route visí na DiPSy.** Při každém uložení kritérií route znovu volá tři dotazy na `api.dipsy.gov.cz` (5 s timeout každý, `route.ts:23`). Katalogový fallback sice existuje, ale validace se bez DiPSy zbytečně zdrží; při výpadku DiPSy škola čeká až 15 s na uložení formuláře.

11. **P3 — „Každý ze 100 dokumentů měl odlišný SHA-256" je samozřejmost vydávaná za validační výsledek.** U 100 různých škol nic neukazuje; vypustit, nebo nahradit měřením shody klasifikace.

12. **P3 — `platne_od` je čas uložení.** Jméno slibuje platnost, nese čas záznamu. Přejmenovat na `zaznamenano`/`ulozeno`, nebo přepsat význam v dokumentu.

13. **P3 — „Všechna kola" jako jediný záznam je reálně riskantní.** Unikátnost je vyřešená vzorně (`coalesce(kolo, 0)` v indexu, `is not distinct from` v dotazu), ale 2. kolo bývá vyhlášené s jinými kritérii; jediný záznam „pro všechna kola" bude častější chyba školy než pomoc. Formulář má při této volbě upozornit, že se údaj uplatní i v pozdějších kolech.

## Co měření dodalo nad rámec nálezu 3

Úplnost DiPSy API ověřena levně: druhým zdrojem dat je vlastní katalog 2026 (`public/applications_2026.json`), meta-pole `totalCount` umožňuje kontrolu truncace přímo v každém požadavku a výsledek je nad očekávání dobrý (49/50 škol, 100 % shoda nabídek, žádná truncace). Zbývající jediný neúspěch — škola 691000794 bez karet — je výslovný stav k řešení v importu, ne tiché prázdnno. Detail a reprodukce: `docs/podklady/dipsy-shoda-kliku-2026-09-24.md`.

## Chybějící části dokumentu

- **Úspěchová a kill kritéria pilotu**: jaká shoda hodnotitelů a jaká přesnost tvrzení „pouze JPZ" je pro veřejné nasazení dost, za jakých podmínek se prototyp zahodí.
- **Křížová validace proti existujícím datům**: porovnat závěry `pouze_jpz`/`jine` z PDF s naměřeným předmětovým sklonem je nejlevnější kontrola konzistence, jaká existuje; případ Doppler by ji ověřil okamžitě. Dokument ji nezmíní.
- **Rozhodnutí o starých polích `odkaz_kriteria`/`kriteria_vlastnimi_slovy` dřív než sběr**: dvacet pilotních škol se stará pole právě učí vyplňovat; nechat veřejné soužití nerozhodnuté znamená sbírat data do modelu, který se může po roce přepsat.

## Co je na návrhu dobré

Oddělení podkladů od tvrzení školy (`portal_kriteria` vs. `kriteria_podklad`), append-only historie s `nahrazuje_id`, optimistický zámek přes `ocekavaneId` s advisory lockem v transakci, poctivé „nejde o reprezentativní odhad", `nezjisteno` jako legitimní závěr pilota, harmonogram MŠMT jako hranice dostupnosti ročníku 2027 a věta „prototyp nepoužívat jako důkaz, že migrace už proběhla v nasazení".

## Code review (doplňující, 24. 9. 2026)

Řádkové review součástí prototypu v pracovním stromu: `src/components/portal/PortalKriteriaForm.tsx`,
`src/lib/portal-kriteria.ts`, `src/lib/kriteria-stav.ts`, `src/app/api/portal/kriteria/route.ts`,
`src/app/pro-skoly/kriteria/page.tsx`, `scripts/dipsy-kriteria-pilot.py`, `scripts/validate_kriteria_prijeti.py`,
`scripts/dipsy-kriteria-scan.py`, `tests/portal-kriteria.test.mjs`.

**Nové nálezy:**

14. **P2 — Falešný `rozpor` pro stejný význam s jinou prózou.** `shodna` (`src/lib/kriteria-stav.ts:31–34`) porovnává `rezim` plus normalizovaný `popis`. Vlastní záznam školy („jine“, próza A) a ověřený podklad DiPSy („jine“, próza B) tedy skončí rozpor, ačkoli se v podstatě shodují. U škol se zvláštním bodováním — tedy přesně u těch, pro které prototyp vznikl — bude rozpor skoro trvalý a čtenář se ho naučí přehlížet. Náprava: rozpor vyvolává jen rozdílný `rezim`; rozdíl v próze se ukáže vedle sebe, ne jako nesoulad.

15. **P3 — Formulář nabízí kola 4–99, která se nikam nenačtou.** Číslo kola je volitelné do 99 (`PortalKriteriaForm.tsx:120`), schéma povoluje 1–99, ale `nactiDipsyNabidky` stahuje jen kola 1–3 a dokument sám říká, že 4. kolo „bude vyžadovat doplnění načítání". Škola tak může založit pravidlo pro 4. kolo oboru, který v 4. kole vypsaný není. Do doplnění načítání zúžit rozsah na 1–3.

16. **P3 — Parametr `?skola=` tiše padá na první roli.** `page.tsx:18` bere `role.find(...) ?? prihlaseny.role[0]`; odkaz na cizí školu ukáže bez varování první spravovanou školu. Nejsou cizí data, ale překlep v adrese pak zapisuje do špatné školy, aniž by to čtenář poznal. Při neznámém `skola` vypsat chybu místo fallbacku.

**Prověřené a bez nálezu:** `vytvoreno_at` ve schématu existuje (`portal-schema.ts:171`), takže řazení v `overenePodkladyKriterii` běží; `zapisKriteria` drží advisory lock, přečtení předchozího záznamu a zneplatnění v jedné transakci; autorizace v route je za `jeNasPuvod`, přihlášením i rolí daného REDIZO. `validate_kriteria_prijeti.py` váže záznam na právě jednu katalogovou nabídku a ověřuje otisk lokálního PDF. `dipsy-kriteria-pilot.py` stahuje jen z `*.blob.core.windows.net`, kontroluje PDF signaturu i limit 20 MB, jede sériově s prodlevou a píše append-only `pozorovani.jsonl`. `dipsy-kriteria-scan.py` kontroluje `skolniRok` i REDIZO každé karty, jak dokument tvrdí. Testová sada `tests/portal-kriteria.test.mjs` (9 testů) kryje validaci vstupu, filtrování ročníku, přednost konkrétního kola, historii a odmítnutí starého formuláře, rozpor i zastínění — lokálně ale zatím neběží, protože balíček `@electric-sql/pglite` v tomto prostředí nainstalovaný není (stejný důvod, proč tu padá i pět starších testů portálu).

## Ověření

- Výkonnostní a datová tvrzení nálezu 3 a sekce „Co měření dodalo" pocházejí z běhu `scripts/dipsy-shoda-kliku.mjs` ze 24. 9. 2026 nad živým DiPSy API (50 škol, 150 dotazů); surová data vedle souhrnu v `docs/podklady/dipsy-shoda-kliku-2026-09-24.json`.
- Nálezy 1, 2, 4, 6, 7, 9, 10 jsou čtením kódu v pracovním stromu; řádkové odkazy výše.
- Produkční chování (formulář, uložení do produkční databáze) ověřeno nebylo — migrace v nasazení podle dokumentu neproběhla.

## Vypořádání doplňujícího review (24. 9. 2026)

- **14 vyřešeno v prototypu:** `shodna` porovnává jen `rezim`. Každý podklad si v náhledu zachovává vlastní slovní popis, zdroj a datum. Věcný rozdíl uvnitř režimu `jine` automatika nerozpozná; před veřejným použitím zůstává nutné ruční posouzení.
- **15 vyřešeno v prototypu:** formulář, validace API a nová migrace 006 připouštějí konkrétní kola 1–3. Společné pravidlo stále znamená všechna kola. Po doplnění načítání dalších kol bude nutné rozsah upravit.
- **16 vyřešeno v prototypu:** neznámé `?skola=` zobrazí chybu a neotevře formulář jiné školy; bez parametru se dál zvolí první spravovaná škola.
- Testová sada prototypu po opravách prošla v tomto prostředí **11/11** (`node --experimental-strip-types --test tests/portal-kriteria.test.mjs`). Původní poznámka o chybějícím `@electric-sql/pglite` odpovídala prostředí autora review, ne tomuto běhu. ESLint změněných souborů prošel. Běžný `tsc` naráží na zastaralé odkazy v `.next/dev/types/validator.ts`; kontrola projektu bez tohoto generovaného adresáře prošla. Produkční migrace ani zobrazení ověřeny nebyly.
