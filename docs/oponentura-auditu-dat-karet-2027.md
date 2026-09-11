# Oponentura auditu dat na kartách škol

Verze 2.0 / R2. Zpracováno 11. 9. 2026. Předmět: `audit-dat-karet-2027.md` v1.1 (commit `acd604d`).

**OVĚŘENO** = doloženo spuštěním kódu nebo stažením produkční stránky. **NÁZOR** = argumentace bez tvrdého důkazu.

## Závěr R2

**Vypořádání přijímám bez věcných výhrad.** Ověřil jsem čtyři doložitelná tvrzení a všechna platí. Obě upřesnění, kterými mě autor opravuje, jsou správná a přijímám je.

Přináším jedno nové zjištění, které **zpřesňuje nález A-03 a zvyšuje jeho závažnost**: zdrojová data nejsou v bodech, ale v procentech, takže vada není jen ve značce jednotky.

---

## Co jsem ověřil ve vypořádání

### Odchylka 2 073 / 2 075: příčina doložena

**OVĚŘENO.** Audit uvádí jako příčinu dvě ID s koncovými podtržítky. Potvrzuji je v datech:

```
'600008045_63-41-M/02____'
'600008045_78-42-M/02____'
```

Můj skript je normalizoval bez koncového podtržítka, produkční helper s ním. Nešlo o jinou verzi datasetu, jak jsem se domníval. **Oprava na 2 075 je správná** a mé vysvětlení „jiná verze dat“ bylo chybné.

### Rozklad 1 004 / 978: sedí přesně

**OVĚŘENO** vlastním přepočtem:

| Základ porovnání | Počet |
|---|---:|
| Proti všem normalizovaným ID | 978 |
| Proti jednoznačným ID | 1 004 |
| Rozdíl (míří do nejednoznačné skupiny) | 26 |

Kontrola 978 + 26 = 1 004 vychází. Doplnění rozkladu do auditu považuji za vyřešení mé připomínky.

### Chybný rok 20236: vysvětlení potvrzeno

**OVĚŘENO.** REDIZO `600032001` má u dne otevřených dveří text `14. 12. 20236`. Rozdíl mezi metodami je přesně ten, který audit popisuje:

| Metoda | Nalezené roky |
|---|---|
| Volný `20\d{2}` (můj skript) | `['2023']` |
| Ohraničený `\b20\d{2}\b` (audit) | `[]` |

Můj regulární výraz zachytil podřetězec uvnitř pětimístného čísla. **Metoda auditu je správnější**, protože z chybného zápisu neodvozuje platný rok. Původní počty 776 a 165 zůstávají v platnosti, moje 777 a 164 byly méně přesné.

---

## Obě upřesnění přijímám

### „7/7 nemá vypovídací hodnotu ani jako popis minulosti“ — nepřesné

**Přijímám opravu.** Moje formulace byla příliš široká. Údaj 7 ze 7 přesně popisuje, co se stalo v pozorované skupině; malý vzorek omezuje zobecnění a predikci, nikoli popis.

Navržené řešení („Přijato 7 ze 7 uchazečů s první prioritou v roce 2025“) je lepší než moje doporučení, protože zachovává informaci a odstraňuje jen klamavou formu. Procento na vzorku sedmi je zavádějící svou přesností, samotné počty nikoli.

### „36 z 50 je nadprůměr“ — nedoložené tak, jak jsem to napsal

**Přijímám opravu s doplněním.** Tvrdil jsem nadprůměr, aniž bych uvedl, proti čemu. To je stejná chyba, jakou audit vytýká jinde.

Doložil jsem to dodatečně a vychází to v můj prospěch, ale až s uvedeným referenčním rámcem:

| Ukazatel | Machar TL | Průměr napříč obory | Percentil |
|---|---:|---:|---:|
| Průměr ČJ | 72,2 % | 59,0 % | 82 |
| Průměr MA | 60,2 % | 41,8 % | 88 |

Jde o průměr **napříč obory v datasetu 2025**, nikoli o populaci všech konajících. Autorova výhrada tedy platí: bez tohoto rámce tvrzení nedrželo.

---

## Nové zjištění: A-03 je horší, než audit uvádí

**OVĚŘENO.** **Nový nález R2.**

Při ověřování předchozího bodu jsem zjistil, že zdrojová data nejsou v bodech, ale **v procentech**.

V `schools_data.json` má Macharovo technické lyceum `cj_prumer = 72.2` a `ma_prumer = 60.2`. Funkce `subjectScore` v `src/lib/historical-scores.ts` je převádí vzorcem `Math.round(value * 5) / 10`, tedy dělí dvěma na body z 50:

```
72,2 % → 36,1 bodu z 50
60,2 % → 30,1 bodu z 50
```

Komponenta pak zobrazí `36 /100`.

**Proč to zvyšuje závažnost.** Audit popisuje A-03 jako chybu jednotky, tedy že se k hodnotě na škále 0–50 připojí `/100`. To je pravda, ale důsledek je silnější:

| Co se zobrazí | Co data znamenají |
|---|---|
| ČJ průměr **36 /100 (těžší)** | 72,2 % maxima, 82. percentil mezi obory |
| MA průměr **30 /100 (těžší)** | 60,2 % maxima, 88. percentil mezi obory |

Uživatel vidí čísla pod polovinou škály s nálepkou „těžší“ u oboru, který patří k lepší pětině. **Zobrazená hodnota není jen špatně označená, nese opačné sdělení než zdroj.**

Zároveň to potvrzuje druhou část původního nálezu ostřeji: pojmenování „Náročnost přijímaček“ je zavádějící, protože hodnota popisuje výsledky uchazečů, a to navíc po dvojím převodu (procenta → body → chybná škála).

**Doporučení.** Při opravě neuvádět jen správnou škálu `/50`. Zvážit zobrazení v procentech, ve kterých jsou zdrojová data, protože každý převod je příležitost k další záměně. Pokud se body ponechají, kontrakt z auditu by měl u jednotky `jpz_subject_0_50` evidovat i to, že vznikla převodem z procent.

---

## Ke zbytku vypořádání

**V-1, V-2, V-3 považuji za vyřešené.** Rozlišení A-02 jako pokračování původní vady a A-03 jako chyby jednotek ve stejné nekontrolované cestě je přesnější než moje „obojí je O-13“.

**Souběžný start katalogu** přijímám. Oceňuji upozornění, které jsem ve své výhradě minul: konzervatoře nejsou v importu s povinnou JPZ, takže oprava 1 004 shod listopadovou nabídku sama nevyřeší. To je věcná oprava mé priority, ne jen doplnění.

**Odhad 21 až 48 člověkodnů** nemám čím ověřit a nebudu ho komentovat. Za správné považuji, že rozptyl je přiznaný, ruční složka oddělená a je stanoven přepočet po vzorku sta případů.

**Ke kontraktu.** Autorova námitka, že samotný typ nezakáže napsat `/100` v JSX, je správná a moje původní formulace ji přehlížela. Sdílený renderer, runtime validace a testy vykreslených popisků jsou nutná součást, nikoli doplněk. Beru zpět implikaci, že by problém vyřešil typový systém sám.

---

## Co jsem neověřoval

- **A-06** zůstává ověřen jen částečně, stejně jako v R1.
- **Odhad pracnosti** nemám s čím porovnat.
- **Tvrzení o konzervatořích a rozsahu importu** jsem nekontroloval; přijímám je.
- **Neopravoval jsem nic.** Tato oponentura mění jen dokumentaci.

---

## Historie: oponentura v1.0

> **Pozor při čtení.** Následující text je původní znění z 11. 9. 2026 a zůstává beze změny jako doklad. Tři jeho tvrzení byla v R2 vyvrácena a **neplatí**: odchylka 2 073/2 075 nevznikla jinou verzí dat, ale koncovými podtržítky v ID; počty 777/164 u InspIS byly méně přesné než 776/165; a tvrzení „36 z 50 je nadprůměrný výsledek“ nebylo v původní podobě doloženo. Platné znění je v R2 výše.

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

## Vypořádání autorem auditu — R2, 11. 9. 2026

Úplná reakce je v [auditu v1.2](audit-dat-karet-2027.md#vypořádání-oponentury-r2). Nová kvantifikace A-03 je přijata s definicí referenčního souboru. Upřesněno: produkční normalizátor koncová podtržítka odstraňuje; jeden číselný převod následuje zaokrouhlení a chybný popisek. Původní text R2 výše zachován jako doklad. O-13 a aplikační opravy zůstávají otevřené.
