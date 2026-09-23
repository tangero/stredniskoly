# Code review PR #155

Code review PR #155 „Veletrhy a přehlídky středních škol: přehled akcí a formulář pro nahlášení“ — commit `86f1da9145a4d40a9db9d3d56b144b38b42d9652`, větev `feat/veletrhy-skol` → `main`, 20 souborů, +3021/−4. Reviewer: Claude (session 23. 9. 2026), review ve worktree nad tímto commitem.

**Nesouhlasím s merge v této podobě. Blokují dvě věci, obě mimo runtime kód:** v repozitáři leží tabulka s kontakty na konkrétní lidi (P0) a stránka ochrany údajů neví o novém formuláři, který sbírá e-maily (P1). Samotný kód přehledu a formuláře je v pořádku a po vyřešení obou bodů merge doporučím. Třetí nález (čtyři testy padají pod Node 24) je doložený jako vlastnost prostředí, ne chyba změny, a je neblokující s konkrétní nápravou.

## Nezávislé ověření

- **CI běh 35730808949** (Node 22): joby TypeScript, Integrace katalogu, Python testy a kontroly dat — vše zelené; `test:mesto` 62/62, `tsc` čisté, `kontrola-letopoctu` a `stav-datovych-sad.py kontrola` prošly.
- **Lokálně, Node 24.1.0 + tsx 4.23.15:** `test:mesto` 58/62 — padají čtyři testy v `tests/veletrhy-nahlasit.test.mjs`. Příčina dohledaná až ke kořeni, viz níže.
- **Lokálně, Node 22.23.2 + tsx 4.23.15** (staženo přes `npx -p node@22`): `tests/veletrhy-nahlasit.test.mjs` 15/15.
- `git diff --check origin/main...HEAD` bez chyb. Kontakty pořadatelů `data/veletrhy/poradatele-kontakty.json` v gitu **nejsou** (`git ls-files` 0 shod) — `.gitignore` je kryje, jak PR slibuje.
- Route `src/app/api/veletrhy/nahlasit/route.ts` čtena celá: honeypot `website`, limit 3 pokusy / 15 min na IP i e-mail, uložení do fronty pod `sLimitem` (3 s), pošta přes `fetch` s `AbortSignal.timeout` (8 s), **503 jen když neuspěje ani databáze, ani pošta** — správné pořadí: přijetí se potvrzuje, jakmile je záznam někde.
- `tests/veletrhy-nahlasit.test.mjs`: falešný pool čte sloupce z `db/migrace/005-veletrhy.sql` a shodí INSERT na neexistujícím sloupci; PR popisuje, že mutace sloupce dřív prošla všemi testy. To je přesně ten druh testu, který tu chceme.
- `docs/zdroje-dat.md` má nový oddíl 2.15 a v oddílu 3 **záporný nález** (seznam vystavovatelů v žádném zdroji není). Registr sad má záznam `veletrhy-skol` a `tests/veletrhy.test.mjs:150` váže počty v registru i dokumentaci na data. Sitemapa i generátor mají `/veletrhy` a `/veletrhy/nahlasit`.

## Blokující

### P0 — kontakty na konkrétní lidi v veřejném repozitáři

`docs/prijimacky-veletrhy-poradatele-2026.xlsx` je commitnutý a od pushe větve **veřejně dostupný**. List `Poradatele` (25 řádků) má sloupce `kontaktni_osoba`, `email`, `telefon`; 15 řádků nese jméno konkrétní osoby, ze 26 unikátních adres jich 16 má v místní části jméno člověka (zbytek jsou obecné schránky typu info@), telefonních buněk je 13. List `Top8_tyden` (8 řádků) totéž opakuje pro obesílání: `email`, `telefon`, `duvod`.

PR sám pravidlo zná a formuluje: tělo PR říká, že kontakty jsou „jména, služební e-maily a mobily — na web nepatří“, `.gitignore` k tomu přidává `/data/veletrhy/poradatele-kontakty.json` s komentářem „na web nepatří (docs/zdroje-dat.md, oddíl 3)“ a changelog zdrojů 1.13 zamítá `kontaktni_osoba`, `email`, `telefon` slovy „na web nepatří stejně jako kontakt na školu“. Tabulka v repozitáři obsahuje tytéž údaje; veřejný repozitář je web.

Nápravu je potřeba udělat před merge, ne po něm, protože merge by data dostal do historie `main`, odkud už se nevymažou:

1. **Vyjmout xlsx z commitu a přepsat historii větve.** Větev má jediný commit, takže stačí `git rm --cached`, `git commit --amend`, `git push --force-with-lease`. Soubor ponechat lokálně a přidat do `.gitignore` vedle `poradatele-kontakty.json`.
2. **Rozhodnout, co zůstane jako doklad zdroje.** Dvě přípustné cesty: (a) commitnout očištěnou kopii (CSV nebo xlsx) bez šesti interních sloupců `kontaktni_osoba`, `email`, `telefon`, `priorita`, `nabidka_spoluprace`, `poznamka` — zůstane reprodukovatelnost `src/data/veletrhy-2027.json`; (b) nic, po vzoru CERMAT tabulky v `docs/zdroje-dat.md:261` („Stažený v repozitáři není.“). Doporučuji (a).
3. **Opravit pět odkazů** na název souboru podle zvolené cesty: `docs/zdroje-dat.md:39` a `:376`, `docs/veletrhy-skol-2027.md:53`, `public/stav_datovych_sad.json:865` (pole `zdroj`; po úpravě spustit `python3 scripts/stav-datovych-sad.py kontrola`), `src/data/veletrhy-2027.json:4`.
4. **Počítat s tím, že data už venku byla.** Přepsaný commit zůstává na GitHubu dosažitelný přes SHA, dokud ho neuklidí garbage collection; pro jistotu lze požádat podporu GitHubu o odstranění. Jde o služební kontakty pořadatelů, riziko je nízké, ale pravidlo projektu je jednoznačné a tohle je jeho první porušení, které známe.

### P1 — stránka ochrany údajů neví o nahlášení veletrhu

Formulář `/veletrhy/nahlasit` povinně sbírá `email` pořadatele a ukládá ho do `veletrh_nahlaseni` spolu s `poradatel`, `popis` a údaji o akci; migrace nemá žádnou dobu držení. Nápověda u pole říká „Na webu se nezobrazí. Potřebujeme ho, kdybychom se potřebovali na něco zeptat“, což je správný účel — ale `src/app/ochrana-osobnich-udaju/page.tsx` popisuje jen odběr termínů e‑mailem, měření návštěvnosti a data o školách; o veletrzích ani slovo, a nadpis „Bez přihlášení nic neukládáme“ po tomto PR slibuje víc, než platí. (Stránka zaostává už za portálem škol, který tam také není; to je mimo tento PR, ale při doplňování stojí za to vyřídit obojí najednou.)

Náprava je textová a vejde se do tohoto PR: přidat oddíl **Nahlášení veletrhu** s účelem (ověření termínu, dotaz k akci), rozsahem (e‑mail, název pořadatele, volný text), dobou držení (navrhuji do konce sezóny, na kterou se akce hlásí, nejdéle 12 měsíců) a s tím, že se údaj nezveřejňuje. K době držení přidat buď úklid v migraci/servisním skriptu, nebo aspoň poznámku do `docs/veletrhy-skol-2027.md`, kdo a kdy frontu čistí. Pod formulář dát odkaz na stránku ochrany údajů, jako ho má `OdberFormular.tsx`; `src/app/veletrhy/` dnes na tu stránku neodkazuje.

## Neblokující

### P1 — čtyři testy padají pod Node 24; příčina je dvojí načtení `novinky-db.ts`

Pod Node 24.1.0 padají „uložené hlášení se potvrdí, i když pošta selže“ (503 místo 200), „úspěšná pošta se v databázi poznamená“ a „INSERT v kódu sedí se sloupci migrace“ (`zapsane` je prázdné, dvakrát `TypeError … 'odeslanoMailem'`). Doloženo instrumentací:

- `nastavPoolProTesty(FAKE)` proběhne, hned poté `ziskejPool()` v route vidí `pool = null` a založí skutečný `@neondatabase/serverless` Pool, jehož WebSocket na `postgres://test` selže (`ErrorEvent {type: 'error'}`) — to je ta chyba, kterou testy nevidí, protože pomocník mockuje `console.error`.
- `console.log(import.meta.url)` na vrcholu modulu se vypíše **dvakrát se stejnou URL** `file:///…/src/lib/novinky-db.ts`. Dvě instance téhož souboru: jednu načte test (`.mjs` → ESM), druhou route (`.ts` bez `"type": "module"` v `package.json`, tsx ji bere jako CommonJS). Pod Node 24, kde je nativní odstraňování typů zapnuté, se ty dvě cesty nesejdou; pod Node 22 ano.
- Vyzkoušené a **nefunkční** opravy: import v testu přes `@/lib/novinky-db`, bez přípony, oba importy bez `.ts` — vždy 11/15. Tytéž testy s týmž vzorem injekce (`tests/admin.test.mjs`, 14/14) procházejí pod Node 24 přes `node --experimental-strip-types`, protože nejdou přes tsx.

CI je tedy zelené po právu a merge to nebrání. Ale za sedm měsíců (konec údržby Node 22 je 30. 4. 2027) se CI přesune na Node 24 a tahle sada zčervená; do té doby je pro každého s Node 24 lokálně nepoužitelná, a červená sada, kterou „všichni znají“, se přestane číst. Náprava ve dvou krocích:

1. **Teď, v tomto PR:** přidat `.nvmrc` s `22` a `"engines": {"node": "22.x"}` do `package.json`, aby nesoulad hlásil `npm` a ne test. A připnout `tsx` — `npx --yes tsx` bez verze stáhne, co je zrovna nejnovější, takže CI a lokál mohou běžet s jiným překladačem, aniž to kdo pozná.
2. **Samostatný PR:** dostat veletržní testy pod `test:js` (`node --experimental-strip-types`) jako ostatní. Jediné, co tomu brání, je alias `@/lib/novinky-db` v route; pravidlo projektu pro strip‑types moduly říká relativní `./x.ts`. Pak tsx a `test:mesto` odpadnou úplně.

### P2 — pojistka mezi statickým importem dat a registrem

`src/lib/veletrhy.ts:22` importuje napevno `@/data/veletrhy-2027.json`; registr `veletrhy-skol.zobrazeno.soubor` uvádí totéž. Nic ty dvě věci neváže: při přepnutí sady na 2028 se změní registr, ale import ne, a `tests/veletrhy.test.mjs:150` kontroluje počty, ne cestu. Jeden `assert.equal(sada.zobrazeno.soubor, 'src/data/veletrhy-2027.json')` vedle existujících kontrol stačí, aby rozchod spadl v testu.

### P3 — rate limit v paměti procesu

`rateLimitMap` (`route.ts:26`) žije v jedné instanci funkce; na Vercelu se instance střídají a restartují, takže limit 3/15 min platí jen „většinou“. S honeypotem a frontou ke kontrole je to přijatelné — jen to napsat do `docs/veletrhy-skol-2027.md` jako známé omezení, aby to příště nikdo nepokládal za ochranu.

## Co je dobře a stojí za zachování

- **Nahlášení není zveřejnění.** Fronta ke kontrole místo přímé publikace, s odkazem na zkušenost s polem `dny_otevrenych_dveri`.
- Tři stupně doloženosti termínu (`terminPotvrzen`, `terminPribligny`, `zdrojJenAgregator`) vzniklé z oponentury; přepis „~21.–30. 11. dle okresů“ na potvrzený termín by tvrdil víc než zdroj.
- Testy vázané na migraci a na registr; obnova prostředí v `t.after`; každý test vlastní IP a e‑mail, aby se nesdílel čítač.
- Záporný nález v oddílu 3 zdrojů: „seznam vystavovatelů v žádném zdroji není“ — zamítnutí je platný závěr, mlčení není.

## Postup

1. Autor vypořádá P0 (přepis historie větve, očištěná kopie, pět odkazů) a P1 (oddíl na stránce ochrany údajů, doba držení).
2. Doporučuji do téhož PR přidat `.nvmrc` + `engines` + připnutou verzi `tsx`; zbytek testové nápravy až samostatně.
3. Po force‑pushi provedu druhé kolo nad novým commitem: ověřím, že v historii větve xlsx s kontakty není (`git log --all --diff-filter=A -- '*.xlsx'`), a pak merge výslovně doporučím.

Merge jsem neprovedl, do větve `feat/veletrhy-skol` jsem nezasahoval, produkční data ani konfiguraci jsem neměnil. Při ověřování jsem dočasně instrumentoval `src/lib/novinky-db.ts` a kopii testu; oba soubory jsou vrácené (`git status` čistý).
