# Využití dat o uchazečích a podrobných dat JPZ

Verze 1.0 · 13. 9. 2026 · Teze 1 a 3 schváleny k realizaci, teze 2, 4 a 5 odloženy.

Pět námětů, jak z dat CERMATu o jednotlivých uchazečích lépe odpovědět na otázky, jak těžké je se na školu dostat, jak náročné bude tam studovat a kam dítě směřovat. Vzniklo poté, co [dokumentace zdrojů](zdroje-dat.md) ukázala, že tyto soubory používáme jen zlomkem.

Podklady: [slovník ukazatelů](slovnik-ukazatelu.md), [zdroje dat](zdroje-dat.md), [maturitní výsledky](maturitni-vysledky-a-kvalita-skoly-2027.md).

## Stav tezí

| # | Teze | Zdroj | Stav |
|---|---|---|---|
| 1 | Vlastní výsledek v kontextu konkrétního oboru | data uchazečů | **k realizaci** |
| 3 | Ostrost hranice místo poměru uchazečů | data uchazečů | **k realizaci** |
| 2 | Profil dovedností, který obor vybírá | položková data | odloženo |
| 4 | Kontrola srovnatelnosti ročníků a termínů | položková data | odloženo |
| 5 | Vstupní úroveň jako kontext pro maturitu | položková data a maturitní data | odloženo, čeká na import maturit |

---

## Teze 1: vlastní výsledek v kontextu konkrétního oboru

### Co se změní
Dnes na stránce stojí, že o obor soutěží 4,1 uchazeče na místo. To je vlastnost oboru, ne odpověď pro konkrétní dítě. Nově uvidí uchazeč, **jak dopadli loňští uchazeči s podobným výsledkem**.

U osmiletého gymnázia J. S. Machara to vypadá takto:

| Výsledek | Přijato ze soutěžících |
|---|---|
| 40 až 60 bodů | 0 ze 33 |
| 60 až 70 bodů | 5 z 10 |
| 70 až 75 bodů | 9 z 9 |
| nad 75 bodů | 16 z 16 |

Věta pod tím zní: „Kdo měl loni přes 70 bodů, dostal se sem vždycky. Pod 60 nikdo.“

### Jak se to počítá
Pro každý obor se uchazeči rozdělí podle výsledku jednotné zkoušky do pásem po pěti bodech a spočítá se podíl přijatých. Počítá se **jen mezi soutěžícími**, tedy mezi přijatými a těmi, kdo se nevešli kvůli kapacitě.

Ze jmenovatele jsou vyřazeny dvě skupiny a obě to mají na stránce být uvedeno:

- **Nastoupili jinam.** Dostali se, ale dali přednost oboru uvedenému na přihlášce výš. O místo nakonec nesoutěžili, takže by podíl uměle snižovali.
- **Nesplnili podmínky.** Neuspěli u jiného kritéria než u testu. U osmiletého gymnázia Machara je jich 107, tedy víc než přijatých; to je samo o sobě důležitý signál a patří vedle tabulky.

Pásmo s méně než pěti soutěžícími se slučuje se sousedem, jinak by „1 z 1“ vypadalo jako spolehlivých 100 %.

Generuje `scripts/build-pasma-prijeti.py` do `public/pasma_prijeti_2025.json`.

### Pokrytí

| Stav nabídky 2026 | Počet |
|---|---|
| Má pásma, tedy aspoň 30 soutěžících | 1 830 |
| Loni se dostali všichni, kdo soutěžili | 1 003 |
| Jen dílčí údaje, málo soutěžících | 146 |
| Za rok 2025 data nemáme | 112 |

U 1 003 nabídek je odpověď jednoduchá a stojí za samostatnou větu: **loni se dostal každý, kdo splnil podmínky**. To je pro rodiče hledajícího jistotu cennější než jakýkoli percentil.

### Co to neříká
Rok 2025 nepředpovídá rok 2027. Kritéria školy se mění, kapacita se mění a složení uchazečů také. Formulace proto vždy mluví v minulém čase o loňsku, nikdy o šanci dítěte.

Data neznají zaměření, takže u oboru s více zaměřeními platí pásma za celý obor školy.

### Kde se to zobrazí
Do bloku „Dostanu se sem?“ na stránce oboru, pod ukazatele poptávky. Na stránce školy se nezobrazuje, protože pásma jsou vlastností oboru.

Prvek je statický, bez zadávání vlastního výsledku. Až bude hotový, může na něj navázat kalkulačka v `src/app/moje-sance`, která dnes počítá z poměrů.

---

## Teze 3: ostrost hranice místo poměru uchazečů

### Co se změní
Poměr uchazečů na místo neříká, jestli o přijetí rozhodl test, nebo něco jiného. Nový ukazatel to říká přímo: **jak se překrývají výsledky přijatých a nepřijatých**.

Tři situace a tři různé rady:

| Situace | Co to znamená | Rada rodiči |
|---|---|---|
| Překryv nulový nebo záporný | O přijetí rozhodl výhradně výsledek testu | Známý cíl, dá se na něj trénovat |
| Překryv do deseti bodů | Test rozhodoval, ale kritéria školy s ním hýbou | Vyplatí se zjistit, co dalšího škola hodnotí |
| Překryv nad dvacet bodů | O přijetí rozhodlo z velké části něco jiného než test | Bez přečtení kritérií školy se nedá odhadnout nic |

### Jak se to počítá
`nejvyšší výsledek mezi těmi, kdo se nevešli − nejnižší výsledek mezi přijatými`, v bodech 0 až 100.

Vedle toho **hustota u hranice**: podíl soutěžících, jejichž výsledek leží do pěti bodů od nejnižšího přijatého. Medián je 28 %, takže u poloviny oborů se kolem hranice tísní víc než čtvrtina uchazečů. Tam rozhoduje jediný bod.

Počítá se jen u oborů s aspoň deseti přijatými a aspoň pěti odmítnutými kvůli kapacitě; těch je 1 545.

### Rozdělení hodnot
U 1 381 oborů bez talentové zkoušky a s jediným zaměřením:

| Hodnota | Podíl |
|---|---|
| Čistý řez, překryv nula nebo méně | 17 % |
| Medián překryvu | 7 bodů |
| Překryv nad 20 bodů | 13 % |

### Dvě zkreslení, která se musí vyloučit
Obojí je v datech označené a nad oběma se ukazatel nezobrazuje bez upozornění.

- **Více zaměření pod jedním klíčem.** Data uchazečů neznají zaměření, takže se sčítají obory s různými hranicemi. Medián překryvu je tam 17 bodů proti 7 u oborů s jediným zaměřením. Pole `vice_zamereni`.
- **Talentová zkouška.** U uměleckých oborů skupiny 82 je medián překryvu 38 bodů, protože o přijetí rozhoduje z velké části talentová zkouška. Pole `talentova_zkouska`.

### Co to neříká
Překryv neměří kvalitu ani spravedlnost přijímacího řízení. Velký překryv znamená, že škola hodnotí i něco jiného než test, což může být zcela legitimní, například prospěch nebo vlastní zkouška.

### Kde se to zobrazí
Jednou větou ve stejném bloku jako teze 1, hned pod tabulkou pásem. Samostatné číslo se nezobrazuje, protože „překryv 7 bodů“ nikomu nic neřekne; zobrazuje se věta ze sloupce „Co to znamená“ výše.

---

## Odložené teze

### Teze 2: profil dovedností, který obor vybírá
Body po jednotlivých úlohách u uchazečů o daný obor ukážou, v čem byli silní. Škola s týmž průměrem může mít třídu silnou v porozumění textu, nebo v geometrii. Odpovídá na otázku, s jakými spolužáky se dítě potká, a zároveň na to, co má trénovat.

Zdrojem jsou položková data JPZ, sloupce `b1` až `b16.x`, dvanáct souborů o 390 MB, dosud nezpracovaných. Je to jediný zdroj, který tuhle otázku umí zodpovědět.

Odloženo, protože vyžaduje zpracovat velké soubory a navrhnout, jak seskupit úlohy do dovedností, aby výsledek nebyl jen seznam čísel úloh.

### Teze 4: kontrola srovnatelnosti ročníků a termínů
Než se začnou srovnávat ročníky, musí se ověřit, že stejný počet bodů je stejně těžký. V matematice pro šestiletá gymnázia měl v roce 2025 první řádný termín průměr 17,5 bodu a druhý 17,1, medián se lišil o celý bod.

Data uchazečů nesou už jen lepší z obou výsledků, takže rozdíl mezi termíny jde ověřit pouze z položkových dat, kde má každý termín vlastní list.

Odloženo. Je to podmínka pro jakýkoli víceletý trend, ne samostatná funkce pro uživatele. Vyřešit dřív, než se na web dostane první srovnání ročníků v bodech.

### Teze 5: vstupní úroveň jako kontext pro maturitu
Maturitní výsledek sám o sobě neříká nic o kvalitě výuky, protože z velké části odráží to, koho škola přijala. Podrobná data dávají vstupní úroveň a profil dovedností přijatých po školách a skupinách oborů, tedy proměnnou, kterou [návrh maturitního zpracování](maturitni-vysledky-a-kvalita-skoly-2027.md) označuje za podmínku, aby se vůbec směla počítat odchylka od očekávaného výsledku.

Odloženo, protože import maturitních výsledků zatím nezačal. Bez něj není co kontextualizovat.

## Historie

| Verze | Změna |
|---|---|
| 1.0 | Pět tezí. Teze 1 a 3 schváleny k realizaci a rozpracovány do návrhu, zbylé tři odloženy se zdůvodněním. |
