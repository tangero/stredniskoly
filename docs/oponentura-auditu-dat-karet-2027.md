# Oponentura auditu dat na kartách škol

Verze 1.0. Zpracováno 11. 9. 2026. Předmět: `audit-dat-karet-2027.md` v1.0, stav kódu `94c3c6e`.

**OVĚŘENO** = doloženo spuštěním kódu nebo stažením produkční stránky. **NÁZOR** = argumentace bez tvrdého důkazu.

## Závěr oponentury

**Audit je věcně správný. Nenašel jsem tvrzení, které by bylo nepravdivé.** Ověřil jsem nezávisle všech šest nálezů označených P0 a P1 s vysokou jistotou; všechny se potvrdily, včetně tří na živé produkci.

Mám tři výhrady, všechny k formě a prioritizaci, nikoli k faktům. A jedno doporučení, které považuji za důležitější než pořadí oprav.

---

## Co jsem ověřil a potvrdil

### A-01 katalog: čísla sedí, jedno vyžaduje upřesnění

**OVĚŘENO** vlastním přepočtem nad `schools_data.json` a importy 2026.

| Tvrzení auditu | Můj přepočet | Shoda |
|---|---|---|
| 2 837 řádků katalogu | 2 837 | ano |
| 2 777 po vyloučení nejednoznačných | 2 777 | ano |
| 2 087 shod s přihláškami 2026 | 2 087 | ano |
| 2 073 shod s výsledky 2026 | 2 075 | odchylka 2 |
| 1 004 nabídek 2026 bez protějšku | 1 004 proti jednoznačným, 978 proti všem | závisí na základu |
| 690 katalogových bez protějšku | 690 | ano |

Číslo 1 004 platí, pokud se porovnává proti množině **jednoznačných** identifikátorů. Proti všem normalizovaným je jich 978. Audit to explicitně neuvádí a čtenář může snadno spočítat druhé číslo a domnívat se, že jde o chybu. Doporučuji jednou větou doplnit, proti jaké množině se počítá.

Odchylka u shod s výsledky (2 073 proti 2 075) je pod 0,1 % a může plynout z jiné verze dat. Neblokuje nic.

**Souhlasím s nejdůležitější větou celého nálezu:** 1 004 není počet nových ani zrušených oborů. To je přesně ta opatrnost, která u podobných čísel obvykle chybí.

### A-02 minima přetrvávají: potvrzeno na produkci

**OVĚŘENO** stažením veřejné stránky.

Profil Macharova technického lycea skutečně publikuje:

```
Bodové statistiky   Min. skóre pro přijetí (2025): 50
```

Rozšířený detail téže školy publikuje:

```
Minimální body 50   Počet přihlášek N/A   Šance přijetí podle priority   1. priorita 100 % ( 7 / 7 )
```

Obojí je živé v tuto chvíli. Nález je tedy nejen platný, ale jde o **stejnou třídu vady, jakou řešil blokátor O-13**: nepodložené číslo vydávané za hranici přijetí, plus osobní interpretace v podobě stoprocentní šance.

Upozorňuji na detail, který audit zmiňuje jen mimochodem: údaj „100 % (7/7)“ je historický poměr ze sedmi uchazečů. Na takovém vzorku nemá procento vypovídací hodnotu ani jako popis minulosti.

### A-03 chybná škála: potvrzeno v kódu i na produkci

**OVĚŘENO** obojím.

Produkční detail zobrazuje `ČJ průměr 36 /100 (těžší)` a `MA průměr 30 /100 (těžší)`.

V `src/lib/data.ts` je přitom u pole komentář `cj_prumer: number; // průměr z češtiny (0-50 bodů)`, zatímco `StatsTab.tsx` na řádcích 188 a 202 připojuje `/100` a prahy 65 a 50.

Důsledek je vážnější, než vypadá: hodnota 36 z 50 je nadprůměrný výsledek, ale zobrazí se jako 36 ze 100 s nálepkou „těžší“. **Čtenář dostane opačné sdělení, než data nesou.**

Souhlasím i s druhou částí nálezu, že výkon skupiny uchazečů není obtížnost testu. Pojmenování „Náročnost přijímaček“ je zavádějící bez ohledu na škálu.

### A-04 zastaralé události InspIS: čísla sedí

**OVĚŘENO** rozborem `inspis_school_profiles.json`.

| Tvrzení auditu | Můj přepočet |
|---|---|
| 1 180 profilů | 1 180 |
| 998 s textem dne otevřených dveří | 998 |
| 776 jen s roky ≤ 2025 | 777 |
| 165 bez explicitního roku | 164 |
| 57 obsahuje 2026 | 57 |
| 707 s textem termínu zkoušek | 707 |
| 451 jen ≤ 2025, 225 bez roku | 451 a 225 |
| přípravné kurzy 0 z 1 180 | 0 |

Dvě čísla se liší o jedničku, což bude hraniční případ v rozpoznávání roku. Nepovažuji to za vadu.

### A-05 nejednoznačné párování: potvrzeno v kódu

**OVĚŘENO.** V `src/app/skola/[slug]/page.tsx` je na řádcích 122 a 144 skutečně `return candidates[0]` jako poslední záchrana, a na řádku 667 text `Tyto obory se v roce 2026 na této škole neotevírají.`

To je vážné. Odvozovat z chybějící shody v importu závěr o neotevření oboru je přesně ten typ nepodložené inference, který návrh rozvoje zakazuje jinde. Rodina si může vyškrtnout školu, která ve skutečnosti obor otevírá.

### A-07 chybný jmenovatel trendu: potvrzeno doslova

**OVĚŘENO.** V `SchoolDetailClient.tsx` je ve funkci `StatsGrid`:

```js
// Počet přijatých v 2025 odhadneme z kapacity (není ideální, ale data o přijatých 2025 máme)
const prijati2025 = kapacita; // přibližně
```

Komentář sám přiznává, že data o přijatých existují, a přesto se použije kapacita. Výsledná „změna konkurence“ tedy porovnává dvě různé veličiny.

---

## Tři výhrady k auditu

### V-1: A-02 a A-03 jsou nesprávně odděleny od O-13

**NÁZOR.**

Audit vede A-02 a A-03 jako samostatné nálezy datové kvality. Věcně jde ale o **stejnou vadu, kterou uzavřel blokátor O-13**: nepodložené číslo prezentované jako hranice přijetí a osobní pravděpodobnost odvozená z historického poměru.

Dodávka S0 byla uzavřena jako hotová. Tento audit ukazuje, že v jiných konzumentech totéž běží dál. Audit to sice poctivě zmiňuje větou o tom, že S0 opravilo konkrétní konzumenty a ne všechny výstupy, ale nevyvozuje z toho závěr.

**Doporučení: označit A-02 a A-03 za pokračování O-13, nikoli za nové nálezy.** Má to praktický důsledek. Přejímka S0 zjevně nekontrolovala všechny cesty, které stejnou vadu zobrazují, a stejná mezera se může opakovat u příští opravy.

### V-2: priorita P1 u A-01 je podhodnocená

**NÁZOR.**

Audit dává katalogu prioritu P1, tedy druhou vlnu. Rozumím logice, že P0 jsou věci, které aktivně klamou uživatele.

Jenže sezóna 2027 začíná přihláškami na konzervatoře 1. listopadu 2026, tedy za sedm týdnů. Vypořádání 1 004 nespárovaných nabídek a sestavení migrační mapy není práce na dny. Pokud se začne až po dokončení všech P0, nemusí být katalog hotový na začátek sezóny.

**Doporučení: rozdělit A-01 na dvě části.** Migrační mapa a identita oborů je dlouhá práce, kterou lze začít souběžně s opravami P0, protože se jich netýká. Vypnutí nepodložených závěrů o neotevření oboru (část A-05) je naopak rychlé a patří do P0.

### V-3: chybí odhad pracnosti

**NÁZOR.**

Audit obsahuje pořadí, ale žádný odhad rozsahu. U dokumentu, který má řídit práci v sedmitýdenním okně, je to podstatné chybějící vstupní údaje pro rozhodování.

Nemám podklad, abych pracnost odhadl sám, a nebudu ji vymýšlet. Upozorňuji ale, že bez ní nelze rozhodnout, co se do sezóny stihne. Předchozí návrh rozvoje pracnost odhadoval, tady zmizela.

---

## Doporučení nad rámec auditu

**Vada A-03 má společný vzorec s bugem, který jsem dnes opravoval.**

Dnešní bug s délkou studia vznikl tím, že v projektu byly čtyři kopie funkce `createSlug` a jedna z nich neznala parametr, který ostatní měly. A-03 vzniká tím, že loader dodává škálu 0 až 50 a komponenta si myslí, že dostává 0 až 100.

V obou případech je příčina stejná: **mezi vrstvami neexistuje sdílený kontrakt.** Data se předávají jako čísla bez jednotky a každá komponenta si domýšlí význam.

Doporučuji zvážit jednu věc, která by tuto třídu chyb odstranila systémově: zavést do datové vrstvy typ, který nese jednotku a rozsah, nikoli holé číslo. Pak by komponenta nemohla napsat `/100` k hodnotě deklarované jako `/50`, protože by to neprošlo typovou kontrolou.

Není to práce na teď a do sezóny se to nestihne. Ale pokud se má opravovat všech sedm nálezů, stojí za to se rozhodnout, zda se opravují symptomy, nebo příčina.

---

## Co jsem neověřoval

Poctivé vymezení rozsahu této oponentury:

- **A-06** (ochrana kvality v novém kontextu) jsem ověřil jen částečně. Potvrdil jsem, že `admission_context` je v datech přihlášek a že výsledkový JSON příznak validace nemá. Konkrétní případ `e74e9ded` jsem nedohledával.
- **Tvrzení o InspIS, ČŠI a dopravě** jsem přijal bez vlastní kontroly kromě čísel v A-04.
- **Neověřoval jsem** obsah proti webům škol, stejně jako audit sám.
- **Neopravoval jsem nic.** Tato oponentura mění jen dokumentaci.

---

## Shrnutí

Audit doporučuji přijmout beze změny faktů. Tři výhrady se týkají zařazení nálezů a chybějícího odhadu pracnosti.

Pořadí oprav bych upravil takto: do P0 přesunout vypnutí závěru o neotevření oboru z A-05, protože je to rychlé a přímo klame. Souběžně s P0 začít migrační mapu z A-01, protože je dlouhá a sezóna se blíží. Zbytek ponechat.

## Vypořádání autorem auditu — 11. 9. 2026

Kompletní reakce včetně V-1 až V-3, číselných odchylek a doporučení kontraktu je v [auditu v1.1](audit-dat-karet-2027.md#vypořádání-oponentury-v10). Původní text oponentury výše zůstal zachován. Vypořádání dokumentu neuzavírá produkční blokátor O-13 ani nenahrazuje přejímku oprav.
