# Prototyp stránky školy: deník rozhodnutí

Verze 1.0 · 12. 9. 2026 · Prototyp, ne produkční kód.

Cíl: ověřit, jestli jde stránku postavit tak, aby rodič a žák poznali, **jak těžké je se na školu dostat**, **jak těžké bude ji vystudovat** a **jaké jsou na ní podmínky**.

Podklad: [slovník ukazatelů](slovnik-ukazatelu.md), [návrh prezentace dat](navrh-prezentace-dat-skoly-2027.md), [maturitní výsledky](maturitni-vysledky-a-kvalita-skoly-2027.md).

Zkušební škola: Gymnázium, Nad Štolou 1510, Praha (REDIZO 600171701). Vybrána proto, že má tři obory s desetinásobně různou poptávkou, takže na ní jde ukázat, kde dnešní stránka mate.

## Data prototypu

Skutečná data 1. kola 2026, žádné vymyšlené hodnoty.

| Obor | Kapacita | Přihlášky | Poptávka | Tlak 1. voleb | Průměr přijatých | Nevešlo se |
|---|---:|---:|---:|---:|---:|---:|
| Gymnázium 4leté | 60 | 153 | 2,55× | 1,18 | 85,7 | 24 |
| Gymnázium 6leté | 30 | 719 | 23,97× | 9,50 | 80,7 | 154 |
| Gymnázium 8leté | 60 | 535 | 8,92× | 3,22 | 79,9 | 127 |

Percentily ve srovnatelné skupině (typ a délka studia):

| Obor | Poptávka | Tlak 1. voleb | Průměr přijatých | Velikost skupiny |
|---|---:|---:|---:|---:|
| 4leté | 48. | 61. | **96.** | 437 |
| 6leté | 100. | 100. | 96. | 71 |
| 8leté | 92. | 87. | 93. | 273 |

---

## Kolo 1 — výchozí rozhodnutí

### R1.1 Stránku řídí tři otázky, ne zdroje dat
Dnešní stránka je uspořádaná podle toho, odkud data pocházejí: karta přihlášek, karta výsledků, karta priorit. Návštěvník ale nepřišel pro data, přišel pro rozhodnutí.

Prototyp má tři bloky pojmenované otázkami: **Dostanu se tam?**, **Zvládnu to tam?**, **Jaká je to škola?** Každý údaj patří právě do jednoho.

### R1.2 Hlavní ukazatel je tlak prvních voleb, ne přihlášky na místo
Přihlášky na místo přeceňují konkurenci, protože zahrnují pojistky. U 54 % nabídek roku 2026 by první volby nenaplnily ani kapacitu.

Tlak prvních voleb je navíc ověřený: z roku 2025 předpovídá přetlak v roce 2026 s AUC 0,870 proti 0,801 u celkové poptávky.

Poptávka zůstává, ale jako druhý údaj s vysvětlením, že část přihlášek jsou pojistky.

### R1.3 Každé číslo má vedle sebe větu, co znamená
Bez ní je „2,55×“ jen tvar. S ní je to „poptávka kolem průměru čtyřletých gymnázií“.

Věta vždy jmenuje srovnávanou skupinu a její velikost. Percentil bez uvedení skupiny je zavádějící.

### R1.4 „Dostat se tam“ a „zvládnout to tam“ jsou dvě různé osy
Čtyřleté gymnázium Nad Štolou to ukazuje názorně: poptávka je průměrná (48. percentil), ale průměr přijatých patří mezi nejlepší 4 % (96. percentil).

Přihlásit se tedy není těžké, ale uspět v testu ano, a nároky spolužáků budou vysoké. Jediné číslo obtížnosti by tento rozdíl smazalo.

### R1.5 Co nevíme, je na stránce napsané
Hranici přijetí CERMAT nezveřejňuje. Maturitní výsledky nejsou naimportované. Obojí má na stránce vlastní místo s vysvětlením, ne prázdnou kolonku.

### R1.6 Souhrnná čísla za školu se nepočítají tam, kde nedávají smysl
Součet přihlášek za školu vydělený součtem míst dá u této školy 9,4×, což neodpovídá žádnému oboru (2,5×, 8,9× a 24,0×). Prototyp takové číslo neuvádí vůbec; místo něj ukazuje rozpětí mezi obory.

### R1.7 Obor se vybírá nahoře a mění celý obsah
Stránka školy a stránka oboru nemají být dvě různé stavby. Prototyp má jeden přepínač oborů; při volbě oboru se mění bloky 1 a 2, blok 3 zůstává, protože podmínky jsou vlastností školy.

---

## Kolo 2 — čtu vlastní stránku očima rodiče

### R2.1 Názvy ukazatelů byly odborné, ne lidské
„Tlak prvních voleb" rodič nezná. Název se změnil na otázku: **„Uchazečů na jedno místo, kteří sem chtěli nejvíc"**. Odborný termín zůstává ve slovníku, ne na stránce.

Stejně tak „percentil" zmizel z popisku. Místo „96. percentil z 437" je tam **„vyšší než u 96 ze 100 čtyřletých gymnázií v celé zemi"**.

### R2.2 Chyběla odpověď, byla tam jen čísla
Rodič musel ze tří karet skládat závěr sám. Nad každý blok přibyl **verdikt jednou větou**: „Dostat se sem je velmi těžké." Čísla pod ním verdikt dokládají.

### R2.3 Druhý blok sliboval, co neumíme
Nadpis „Zvládnu to tam?" slibuje odpověď, kterou bez maturitních dat nemáme. Přejmenován na **„Jaké tu budou nároky?"** a v úvodu je napsáno, že o náročnosti vypovídají nejvíc maturitní výsledky, které zatím chybí.

---

## Kolo 3 — kontrola pravdivosti obsahu

### R3.1 Vymyšlený obsah, vlastní chyba
Popis školy v kole 1 a 2 jsem **vymyslel**. Pro Gymnázium Nad Štolou inspekční extrakci nemáme; ověřil jsem to až teď. To je přesně to, co celý projekt zakazuje.

Opraveno záměnou zkušební školy za takovou, kde jsou data skutečná.

### R3.2 Nová zkušební škola: Gymnázium J. S. Machara
Brandýs nad Labem, REDIZO 600007774. Vybrána proto, že:

- má tři obory s tlakem prvních voleb 0,57×, 1,37× a 4,10×, tedy sedminásobný rozdíl uvnitř jedné školy;
- má skutečnou inspekční zprávu z ledna 2025 včetně silných stránek, rizik a otázek na den otevřených dveří;
- je to táž škola, na které [audit obtížnosti](audit-obtiznost-prijeti-2027.md) ukázal, že nedoložený index tvrdil „42, SNADNÉ".

### R3.3 Rizika patří na stránku stejně jako přednosti
Inspekce u této školy vytýká málo aktivní výuku, slabý individuální přístup a absenci v sedmém ročníku. Prototyp to ukazuje ve dvou sloupcích vedle sebe, chválu i výtky.

Stránka, která ukazuje jen přednosti, je propagace, ne podklad k rozhodnutí.

### R3.4 Otázky na den otevřených dveří
Inspekční extrakce obsahuje tři konkrétní otázky, na které zpráva neodpovídá. Prototyp je zobrazuje. Je to jediné místo, kde stránka radí, co dělat dál.

### R3.5 Technické lyceum ukazuje mez ukazatele
U lycea je tlak prvních voleb 0,57×, obor se nenaplnil (23 přijatých z 30 míst) a nikdo neodešel kvůli kapacitě. Verdikt proto zní jinak: „Dostat se sem bývá snazší, než se podle počtu přihlášek zdá."

Přitom přihlášek na místo je 2,17×, takže samotná poptávka by mylně naznačovala konkurenci. To je doklad, proč je hlavním ukazatelem tlak prvních voleb.

---

## Kolo 4 — kontrola vlastních tvrzení

### R4.1 Verdikt se odvozoval ze špatné veličiny
Prahy „velmi těžké" nad 3× a „těžké" nad 1,5× byly vymyšlené a nebraly ohled na obor. Hodnota 1,4 uchazeče na místo znamená u gymnázia něco jiného než u nástavby.

Verdikt se nově odvozuje ze **zařazení mezi srovnatelné obory**, ne z absolutní hodnoty. Tím se sjednotil s tím, co říká ukazatel pod ním.

### R4.2 Chybný výklad ověření
Napsal jsem „správně odhadlo přetlak u 87 % oborů". To není, co AUC znamená. Správně: vezmeme-li dva obory, jeden s přetlakem a jeden bez, hodnota je správně seřadí v 87 případech ze 100.

Tohle je přesně ta chyba, kterou má slovník ukazatelů hlídat: číslo bylo správné, věta u něj ne.

### R4.3 Špatně vyložený počet těch, kdo odešli jinam
Text tvrdil, že šlo o přijaté, kteří dali přednost jinému oboru. Pole `higher_priority` ale počítá uchazeče, kteří se sem dostali, ale nastoupili na obor uvedený na přihlášce výš, takže mezi přijatými nejsou. U lycea to bylo vidět: 23 přijatých, ale 32 „odešlo jinam".

Ověřeno součtem: přijatí, odešlí jinam, nevešli se, nesplnili podmínky a odstoupili dávají přesně počet přihlášek.

### R4.4 Shrnutí školy je citace, ne parafráze
Verdikt třetího bloku byl můj vlastní text. Nahrazen doslovným shrnutím z inspekční zprávy.

---

## Kolo 5 — orientace

### R5.1 Náročnost je vidět už v záložce
Rodič vybírá obor dřív, než si přečte čísla. Záložka proto vedle počtu míst uvádí i náročnost stejnou stupnicí jako verdikt, aby si obory porovnal na první pohled.

### R5.2 Základní údaje hned pod názvem
Zřizovatel a školné, počet míst a datum poslední inspekce. Tři údaje, které rozhodují, jestli má smysl číst dál.

### R5.3 Nesplnění podmínek je signál, ne poznámka pod čarou
U osmiletého gymnázia nesplnilo podmínky 85 z 233 uchazečů, tedy 36 %. To znamená, že škola má vlastní požadavky nad rámec jednotné zkoušky.

Dokud to bylo drobným písmem, rodič to přehlédl. Nově se u podílu nad 20 % zobrazuje jako samostatný údaj s doporučením přečíst si kritéria školy před podáním přihlášky.

---

## Kolo 6 — závěr

### Co stránka umí
Odpovídá na dvě ze tří otázek doloženě. **Dostanu se sem** má hlavní ukazatel ověřený na nezávislém ročníku, srovnání s obdobnými obory a verdikt jednou větou. **Jaká je to škola** má skutečná zjištění inspekce včetně výtek a otázek na den otevřených dveří.

Každé číslo má vedle sebe větu, co znamená, a srovnání se skupinou. Žádný souhrnný index. Co nevíme, je napsané.

### Kde je strop
Otázka **jaké tu budou nároky** zůstává zodpovězená jen nepřímo, přes výsledky přijatých v přijímací zkoušce. Přímou odpověď dají až maturitní výsledky.

To už není otázka návrhu stránky. Další kolo úprav by bylo kosmetické; omezením jsou dva chybějící zdroje:

1. **Maturitní výsledky** — schválený návrh existuje, import nezačal.
2. **Hranice přijetí** — CERMAT ji nezveřejňuje vůbec, takže ji nedoplní nikdo.

### Iterace zastavena po šesti kolech
Původně bylo v plánu až deset. Kola 4 a 5 už opravovala formulace, ne stavbu stránky, a kolo 6 nenašlo nic, co by šlo zlepšit bez nových dat. Další kola by měnila vzhled, ne srozumitelnost.

### Neověřeno
Prototyp jsem nemohl zkontrolovat vykreslený, rozšíření prohlížeče bylo během práce odpojené. Kontrola proběhla nad kódem a obsahem, ne vizuálně.
