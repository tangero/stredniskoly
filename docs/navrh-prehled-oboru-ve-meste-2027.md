# Návrh: přehled oborů ve městě (stránka města, druhá verze)

Verze 0.2 · 4. 10. 2026 · Stav: **zrealizováno ve větvi `zadani/mesto-karty-podle-smeru`** (oddíl 9), oprava řádků „Gymnázium“ hotová (oddíl 1)

Zadání vlastníka ze 4. 10. 2026 k [náhledu Brna](https://stredniskoly-6a7ka66ga-tangeros-projects.vercel.app/mesto/brno):

> Ty nerozlišené řádky „gymnázium“ je potřeba vyřešit, protože takhle to vůbec nedává žádný smysl. Ti lidé vůbec nevědí, na jaká data se koukají. […] Zároveň je celá ta stránka obrovsky informačně přetížená. […] Informace nejsou graficky odlišené ani odsazené […]. Je to prostě jenom výpis. Zamysli se nad tím, jak by měl vypadat přehled středoškolských oborů ve městě a jaké informace bychom na stránce opravdu měli nabízet. […] velká města, jako je Brno, kde je těch škol hodně. Pak malá města, kde je těch škol pár, a městečka a obce, kde je škola jedna jediná.

Navazuje na [návrh stránky města](navrh-stranky-mesta-2027.md) (verze 1.7, zrealizováno 21. 9. 2026) a na [okruhy oborů](navrh-shluky-oboru-2027.md) (etapa 2c, sloučeno 3. 10. 2026). Rozhodnutí z nich platí dál: obtížnost přijetí je odznak a filtr, **nikdy řazení ani žebříček**; stránku má město se třemi a více školami (102 měst).

---

## 1. Co se opravilo hned: řádky „Gymnázium / Gymnázium“

**Příčina.** Okruhy na stránce města braly název školy z indexu rejstříku MŠMT (`data/msmt_rejstrik/nazvy-oboru.json`, pole `skoly`), a to zkrácený název. Ten je u **97 škol** doslova „Gymnázium“; v Brně jich je pět, v Praze devatenáct. Název oboru 79-41-K/41 je v rejstříku také „Gymnázium“. Řádek tak nesl dvakrát totéž slovo a nic, podle čeho by šlo školu poznat. Rozhodnutí z 3. 10. 2026 (návrh okruhů, oddíl 7.4) přitom počítalo s názvy typu „Gymnázium Křenová“.

Stejnou chybu měl oddíl **Další obory ve městě**: obory seskupoval podle zkráceného názvu, takže školy se stejným názvem („Gymnázium“, „Obchodní akademie“) splynuly do jedné karty.

**Oprava** (větev `zadani/okruhy-nazvy-skol`):

| Co | Dřív | Teď |
|---|---|---|
| název školy v řádku okruhu | zkrácený název z rejstříku („Gymnázium“) | název s ulicí z katalogu („Gymnázium, Křenová“); škola mimo katalog dostane zkrácený název z rejstříku a ulici z adresy sídla (`identifikace.adresa`) |
| druhý řádek | název oboru („Gymnázium“) | obor, délka a zaměření, když je jediné („Gymnázium · 4leté, všeobecné“); víc zaměření počtem („4leté, 3 zaměření“); obec, když je jiná než město stránky |
| odkaz | žádný | přehled školy, adresu skládá `adresaPrehledu` s názvem ze `school_analysis.json`, stejně jako hlavní seznam škol |
| název okruhu | „Gymnázium, Gymnázium Matyáše Lercha, SPŠ chemická…“ | „Gymnázium, Křenová · Gymnázium, Elgartova · Gymnázium, Slovanské náměstí a další“ (názvy samy nesou čárku, proto je odděluje tečka) |
| Další obory ve městě | karta podle názvu školy | karta podle REDIZO, název stejným pravidlem jako u okruhů |

Ověřeno na vývojovém serveru: v Brně všech **60 odkazů** z okruhů vrací 200, žádný řádek nemá holé „Gymnázium“.

**Proč odkaz na školu, a ne přímo na obor.** Okruhy pracují s klíčem `REDIZO_KKOV`, který zaměření nenese (data uchazečů ho neznají, [zdroje dat](zdroje-dat.md), oddíl 4, past 1). Gymnázium Slovanské náměstí má pod jedním klíčem tři zaměření, a tedy tři stránky oboru. Odkaz přímo na obor by šel jen u klíče s jedinou nabídkou a skládání adresy nabídky (`adresySkolyMapa`, `nabidkySeStrankou`) by se na stránku města muselo přenést ze čtvrtého místa v kódu; [adresa oboru](adresa-oboru-2027.md) popisuje, co se stalo, když adresu skládala tři místa různě. Navrhuji to udělat až v rámci oddílu 4, kde řádek oboru bude vždy jedna nabídka a odkaz na obor tam přirozeně patří.

---

## 2. Proč je stránka přetížená: měření

Počet slov v obsahu stránky (bez hlavičky a patičky) na vývojovém serveru, 4. 10. 2026:

| Oddíl | Brno (58 škol, 177 nabídek) | Písek (7 škol, 17 nabídek) | Tišnov (3 školy, 4 nabídky) |
|---|---:|---:|---:|
| úvod a čísla za město | 101 | 100 | 102 |
| Které školy tu co nabízejí | **7 571** | 928 | 346 |
| Další obory ve městě | 501 | 140 | 107 |
| Které další obory v okolí uchazeči také volí | **3 119** | **1 030** | **455** |
| Kapacity a výsledky podle typu školy | 445 | 286 | 135 |
| Jak číst tato data | 305 | 305 | 305 |
| **celkem** | **12 042** | **2 789** | **1 450** |

Brno má na jedné stránce 240 odkazů a 74 nadpisů třetí úrovně. Kde se slova berou:

1. **Každá nabídka nese pět údajů a větu.** Název oboru, štítek typu, odznak obtížnosti, odznak pozice na přihlášce, značku 2. kola, větu „dostat se sem je těžké: z 412 soutěžících uchazečů se dostalo 160; v roce 2025…“, počet míst, přihlášky na místo a body spolužáků. To je obsah stránky oboru. Na stránce města z toho rodič potřebuje jedno: jak těžké bylo se dostat.
2. **Okruhy opakují hlavní seznam v jiném pořadí.** V Písku jsou okruhy 37 % textu stránky a v Tišnově 31 %, přestože obsahují tytéž obory jako seznam nad nimi (a k tomu obory z okolních obcí).
3. **Hlavní seznam je abecední podle názvu školy.** Rodina nepřichází s otázkou „co je na škole začínající na B“, ale „kde se tu dá studovat zdrávka“ nebo „jaká jsou tu gymnázia“. Abeceda nic neseskupuje, takže 58 karet je opravdu jen výpis.
4. **Karty pro typy škol** (sedm karet s kapacitami za tři roky a průměry bodů) odpovídají na otázku novináře, ne rodiny. Oddíl 2.6 původního návrhu to říkal už o číslech v úvodu; čísla tam přesto zůstala.
5. **Učební obory jsou až v příloze.** Obory bez jednotné zkoušky (v Brně 78) stojí v samostatném oddílu pod hlavním seznamem, jen jako názvy. Rodina, která hledá výuční list, je musí najít až pod 58 kartami škol s maturitními obory.

---

## 3. K čemu stránka města je

Stránka města je **rozcestník**. Detail patří na stránku oboru a školy, kde už je a kde je vysvětlený. Rodina na stránce města odpovídá na tři otázky, v tomto pořadí:

1. **Co se tu dá studovat?** Jaké směry, jestli s maturitou, nebo s výučním listem, jestli i pro páťáky a sedmáky.
2. **Kde přesně?** Která škola, na které ulici.
3. **Jak těžké bylo se tam dostat?** Jedno slovo s rokem. Proč a s kolika body, to je o kliknutí dál.

Všechno ostatní je buď o kliknutí dál (stránka oboru), nebo patří úplně jinam (souhrny za město pro novináře).

---

## 4. Návrh

### 4.1 Hlavní členění: směr studia, ne abeceda škol

Obory se seskupí podle **směru studia**, který vychází ze skupiny kmenových oborů v kódu KKOV (první dvojčíslí). To je číselník MŠMT, nikoli náš odhad, takže se nemění mezi ročníky a nedá se zpochybnit. Lycea se zařadí podle předmětu (technické k technice, zdravotnické ke zdravotnictví), protože tak se k nim uchazeči chovají: v okruzích oborů Brna je technické lyceum v jednom okruhu se strojírenstvím a elektrotechnikou a pedagogické lyceum se zdravotnickou školou.

| Směr | Kódy KKOV | Brno | Písek | Tišnov |
|---|---|---:|---:|---:|
| Gymnázia | 79-41-K/41, 79-42-K/41, přírodovědné a kombinované lyceum | 31 | 1 | 2 |
| Víceletá gymnázia (z 5. a 7. třídy) | 79-41-K/61, K/81 a obdobné | 24 | 2 | 1 |
| Technika a IT | 16, 18, 21–39, technické lyceum | 52 | 8 | 1 |
| Zdravotnictví, pedagogika a sociální práce | 53, 69-41, 75, zdravotnické a pedagogické lyceum | 29 | 2 | 0 |
| Ekonomika, obchod a správa | 61–68, 72, ekonomické lyceum | 33 | 2 | 0 |
| Gastronomie, cestovní ruch a služby | 65, 69 kromě 69-41 | 6 | 0 | 0 |
| Příroda, zemědělství a veterina | 41, 43 | 1 | 2 | 0 |
| Umění a design | 82 | 1 | 0 | 0 |

Počty jsou nabídky s jednotnou zkouškou z katalogu 2026. V Brně k nim přibude 90 oborů z dnešního oddílu Další obory ve městě: 49 v technice, 18 v umění (hlavně konzervatoře), 9 v gastronomii a službách, 5 ve zdravotnictví a sociální práci, 4 v ekonomice, 2 v přírodě a 3 praktické školy. Masér sportovní a rekondiční (69-41) patří ke zdravotnictví, ne ke službám: v brněnském okruhu stojí vedle zdravotnických škol. **Praktické školy** (78-62-C) se do žádného směru nehodí a dostanou vlastní malou skupinu na konci. **Učební obory a další obory bez jednotné zkoušky** se zařadí do týchž směrů jako řádky se značkou „výuční list“ a bez obtížnosti přijetí (údaj pro ně neexistuje). Oddíl „Další obory ve městě“ tím zanikne jako samostatná příloha: elektromechanik bude mezi technikou, kuchař mezi gastronomií.

**Víceletá gymnázia zvlášť** mají jiného čtenáře: rodiče páťáka nebo sedmáka. Dnes jsou v kartě školy promíchaná se čtyřletým studiem.

Mapa KKOV → směr bude v jednom modulu (`src/lib/smery-studia.ts`), s testem, že žádný kód katalogu nespadne do zbytkové skupiny bez důvodu. Lycea se zařazují výčtem kódů, ne odhadem: kombinované lyceum (78-42-M/06) je všeobecné studium a patří ke gymnáziím, ne k ekonomice, kam ho zařadila první verze mapy pro maketu.

**Pruh obtížnosti v rozcestníku.** Maketa nese u každého směru tenký pruh s rozložením obtížnosti přijetí jeho oborů (kolik je velmi těžkých, těžkých a dalších). Je to totéž rozložení, které dnes stránka ukazuje za celé město, jen rozdělené po směrech, a hned je z něj vidět třeba to, že u víceletých gymnázií v Brně bylo 15 z 22 oborů s údajem velmi těžkých. Pruh je rozložení uvnitř směru, **ne pořadí směrů**: rozcestník zůstává v pevném pořadí podle tabulky výše. Obory bez údaje a bez jednotné zkoušky v pruhu nejsou a popisek to říká.

### 4.2 Řádek oboru: jedna řádka, jeden odkaz

```
Gymnázium, Křenová                          [ těžké ]    120 míst  →
Gymnázium · 4leté
```

- **Název školy s ulicí** je odkaz na stránku oboru (nabídka je teď vždy jedna, adresu dává sdílený modul `adresa-oboru.mjs`). Druhý řádek: obor, délka, zaměření; u učebního oboru „výuční list“.
- **Odznak obtížnosti přijetí** podle slovníku pojmů („v tabulce pod sloupcem Obtížnost přijetí stačí velmi těžké“). Rok stojí jednou v záhlaví směru („Obtížnost přijetí v 1. kole 2026“), ne u každého řádku.
- **Počet míst**, protože odpovídá na otázku „je to velká, nebo malá škola“ a nevyžaduje vysvětlení.
- **Pryč z řádku** (zůstává na stránce oboru): věta s podílem soutěžících uchazečů, pozice na přihlášce, přihlášky na místo, body spolužáků, značka 2. kola, štítek typu školy (ten nese směr).

Když má škola v jednom směru víc oborů (SPŠ Purkyňova má v technice čtyři), stojí název školy jednou a obory pod ním. Rodina tak dál vidí, že jde o jeden dům, což bylo hlavním důvodem karet škol z 21. 9. 2026.

**Řazení uvnitř směru:** podle názvu školy. Ne podle obtížnosti (rozhodnutí z 21. 9. 2026) a ne podle počtu míst (u gymnázií by vznikl dojem žebříčku velikosti).

### 4.3 Tři velikosti měst

Podle počtu nabídek s jednotnou zkouškou v katalogu 2026:

| Velikost | Měst | Příklady | Podoba |
|---|---:|---|---|
| **malé**, do 12 nabídek | 44 | Tišnov, Blansko, Cheb | karty škol, všechny rozbalené; bez filtrů, bez rozložení obtížnosti; na konci „Kam se uchazeči odsud hlásí dál“ (4.6) |
| **střední**, 13 až 60 | 52 | Pardubice, Liberec, Hradec Králové | směry rozbalené; nahoře rozcestník směrů s počty; filtr maturita / výuční list |
| **velké**, nad 60 | 6 | Praha, Brno, Ostrava, Plzeň, České Budějovice, Olomouc | směry sbalené, rozbalí se klikem; rozcestník a filtry; hledání podle názvu školy nebo oboru |

U malého města se směry nevyplatí: čtyři obory ve čtyřech nadpisech by byly horší než tři karty. U velkého města se naopak nesmí rozbalit všechno najednou: Brno by mělo i v jedné řádce na obor přes 250 řádků, Praha přes 600.

**Malé město, Tišnov:**

```
Střední školy — Tišnov
Jihomoravský kraj · 3 školy, 4 obory s maturitou

┌─────────────────────────────────────────────────────────┐
│ Gymnázium, Na Hrádku                                    │
│   Gymnázium · 4leté         [ těžké ]         60 míst → │
│   Gymnázium · 8leté (z 5. třídy)  [ …  ]      30 míst → │
├─────────────────────────────────────────────────────────┤
│ Střední škola a základní škola Tišnov, nám. Míru        │
│   Technické lyceum · 4leté  [ … ]             30 míst → │
├─────────────────────────────────────────────────────────┤
│ Základní škola a Střední škola CoLibri                  │
│   Kombinované lyceum · 4leté                   6 míst → │
└─────────────────────────────────────────────────────────┘

Uchazeči o obory v Tišnově se hlásí i jinam
  Brno →   Bystřice nad Pernštejnem →
```

**Velké město, Brno (výřez):**

```
Střední školy — Brno
Jihomoravský kraj · 58 škol · 177 oborů s jednotnou zkouškou a 90 dalších

Co tu můžete studovat
 [Gymnázia 31] [Víceletá gymnázia 24] [Technika a IT 101]
 [Zdravotnictví, pedagogika, sociální 34] [Ekonomika a správa 37]
 [Gastronomie a služby 15] [Umění a design 19] [Příroda 3] [Praktické školy 3]

 ( Vše ) ( S maturitou ) ( S výučním listem )     🔎 Hledat školu nebo obor

▸ Gymnázia · 31 oborů
▾ Technika a IT · 52 oborů s jednotnou zkouškou a 49 bez ní
    Obtížnost přijetí v 1. kole 2026

    SPŠ a VOŠ, Sokolská
      Strojírenství · 4leté               [ středně těžké ]   90 míst →
      Technické lyceum · 4leté            [ těžké ]           30 míst →
    Střední průmyslová škola, Purkyňova
      Informační technologie · 4leté      [ velmi těžké ]     60 míst →
      Elektrotechnika · 4leté             [ dostala se většina ] 60 míst →
      Mechanik elektrotechnik · 4leté     [ místo pro všechny ]  30 míst →
    SŠ stavebních řemesel, Pražská
      Instalatér                          výuční list               →
      Tesař                               výuční list               →
    …
▸ Zdravotnictví, pedagogika a sociální práce · 29 oborů s jednotnou zkouškou a 5 bez ní
```

Hodnoty odznaků a míst ve výřezu jsou ilustrační, skutečné dá katalog. Počty v rozcestníku jsou skutečné: obory s jednotnou zkouškou z katalogu 2026 a obory z oddílu Další obory ve městě (78 bez jednotné zkoušky a 12 mimo přehled).

### 4.4 Úvod stránky

Nadpis, kraj a **jedna věta** s počtem škol a oborů. Tři součty za město (místa, přihlášky, přihlášky na místo) z úvodu odejdou, jak navrhoval už oddíl 2.6 původního návrhu: rodina nevybírá město, vybírá v něm obor. Pod úvodem rovnou rozcestník směrů.

Veletrh ve městě zůstává hned pod úvodem, protože je časově omezený a dnes je jediný blok s termínem.

### 4.5 Co se stane s ostatními oddíly

| Oddíl | Návrh | Proč |
|---|---|---|
| Jak se sem uchazeči dostali (rozložení obtížnosti) | u středních a velkých měst jako řada čipů filtru s počty nad seznamem, ne samostatný rámeček s grafem; u malých měst nic | rozhodnutí z 21. 9. 2026 chtělo filtr a přehled, ne graf; čtyři obory filtr nepotřebují |
| Další obory ve městě | rozpustit do směrů (4.1) | učební obory nejsou příloha |
| Které další obory v okolí uchazeči také volí | **ze stránky města odebrat**, nechat na stránce oboru | viz 4.6; je to otázka konkrétního oboru, ne města |
| Kapacity a výsledky podle typu školy | odebrat, případně jako jedna tabulka v balíčku [pro novináře](navrh-pro-novinare-2027.md) | rodina se neptá na průměr bodů všech gymnázií ve městě |
| Jak číst tato data | ponechat sbalené na konci, zkrátit na obtížnost přijetí a „chybějící údaj není nula“ | ostatní vysvětlivky popisují čísla, která z řádku odejdou |

### 4.6 Okruhy: kde jim je dobře

Okruh odpovídá na otázku „mezi čím se uchazeči o **tento** obor rozhodují“. Tu si rodina klade, když už má obor vybraný, tedy na stránce oboru, kde je oddíl „Které další obory v okolí uchazeči také volí“ (etapa 2b) a tabulka „Obory výš a níž na přihlášce“. Na stránce města okruh opakuje hlavní seznam v jiném seskupení a přidává k němu obory z okolních obcí, které rodina nehledala. Směry z 4.1 dělají totéž, co okruh dělal pro orientaci, ale stabilně a bez vysvětlování, jak okruh vznikl.

Z okruhů se na stránce města dá využít jedna věc, kterou hlavní seznam neumí: **kam dál**. Malé město jako Tišnov je neúplné bez Brna, kam se jeho uchazeči hlásí. Řádek „Uchazeči o obory v Tišnově se hlásí i jinam: Brno, Bystřice nad Pernštejnem“ stojí na souběžných přihláškách podle obce, které už generátor okruhů počítá a hlídá meze zveřejnění (`okruhy_oboru_{rok}.json`, pole `obory.{klic}.obce`). Pro souhrn za město by šlo o nový ukazatel, takže ho před použitím zapíšu do slovníku ukazatelů. Navrhuji ho jen pro malá a střední města.

Tím se částečně vrací rozhodnutí ze 3. 10. 2026 (okruhy na stránce města). Je to bod k rozhodnutí v oddílu 7.

### 4.7 Obce s jedinou školou

Stránku města dnes má jen město se třemi a více školami (102 měst); obcí s jedinou střední školou je v katalogu 128. Pro ně je správná stránka **stránka školy**, ne stránka města s jednou kartou. Navrhuji jen, aby vyhledávání u obce s jedinou školou vedlo rovnou na školu (dnes vede na filtr kraje `/regiony/{kraj}?obec=…`). Obce se dvěma školami dostanou podobu malého města, pokud se práh sníží na dvě; to je samostatné rozhodnutí.

---

## 5. Nepoužité sloupce, které jsem zvážil

Podle povinného kroku z [zdrojů dat](zdroje-dat.md); prošel jsem oddíly 1 až 4.

| Sloupec | Zdroj | Závěr |
|---|---|---|
| `MATURITNÍ STATUS` | agregáty CERMAT 2.1 | **použít**: filtr s maturitou / s výučním listem a značka v řádku |
| `ROČNÍK` | agregáty CERMAT 2.1 | **použít**: oddělení víceletých gymnázií pro žáky 5. a 7. třídy |
| `ZŘIZOVATEL` | agregáty CERMAT 2.1 | ponechat jako dosud u školy („soukromá“, „církevní“), do řádku oboru ne: je to vlastnost školy |
| přijatí podle priority, tlak prvních voleb | agregáty 2.1 | ne: popisují obor, patří na jeho stránku |
| výsledky všech uchazečů, percentily, oficiální minimum přijatých | agregáty 2.1, sloupce 48–86 | ne: v seznamu oborů by fungovaly jako žebříček; slovník pojmů navíc zakazuje „hranici přijetí“ |
| maturitní výsledky | 2.11, `maturita_skoly.json` | ne na stránce města: „jak si škola vede“ srovnává školu s podobnými školami a vyžaduje vysvětlení; v seznamu by se z toho stalo pořadí škol |
| souběžné přihlášky podle obce | `okruhy_oboru_{rok}.json` | **zvážit** pro „kam dál“ u malých měst (4.6), po zápisu ukazatele do slovníku |
| dopravní dostupnost | 2.9, `/api/dostupnost` | později pro velká města (Praha), filtr „do 30 minut od zastávky“; dnes mimo rozsah |
| 2. kolo | agregáty 2. kola | z řádku odebrat; je to historie a stránka oboru ji vysvětluje |
| `mistaVyuky` | rejstřík 2.4 | ne teď; školy s výukou mimo sídlo by se ale měly objevit ve městě výuky, ne sídla. Zapisuji jako otevřenou otázku, ne jako součást návrhu |
| dobíhající obor | rejstřík 2.4 | ne: mezi vypsanými nabídkami je dobíhajících nula |
| novinky z webů škol, dny otevřených dveří | 2.14, INSPIS 2.8 | ne: pokrytí 49 % a termíny DOD v INSPIS jsou z 71 % staré |
| veletrhy | 2.15 | ponechat, jak je |

## 6. Slovník

**Nový ukazatel nevzniká**, kromě „kam dál“ z 4.6, pokud se schválí. **Nový pojem: směr studia** (skupina oborů podle prvního dvojčíslí KKOV, lycea podle předmětu). Zapíše se do slovníku pojmů ve stejné dávce jako realizace, s vysvětlením „obory podle toho, co se v nich učí, podle číselníku oborů MŠMT“. Odznaky obtížnosti, „výuční list“ a „obor bez jednotné zkoušky“ se berou ze slovníku beze změny.

## 7. K rozhodnutí

1. **Směr studia jako hlavní členění** místo abecedy škol (4.1, 4.2). Doporučuji ano.
2. **Okruhy ze stránky města odebrat** a nechat je na stránce oboru; ze souběžných přihlášek využít jen „kam dál“ u malých a středních měst (4.6). Doporučuji ano. Vrací to část rozhodnutí ze 3. 10. 2026.
3. **Karty podle typu školy odebrat** (4.5). Doporučuji ano.
4. **Hranice velikostí** 12 a 60 nabídek (4.3). Doporučuji je převzít a upravit po prvním náhledu.
6. **Pruh obtížnosti v rozcestníku směrů** (4.1). Doporučuji ano, s pevným pořadím směrů.
5. **Obec s jedinou školou**: vyhledávání vede rovnou na školu (4.7). Doporučuji ano; práh dvou škol nechat na později.

## 7a. Poznámka mimo rozsah

Odznak „středně těžké“ má na webu šedé pozadí `slate-400` (#94a3b8) s bílým písmem, kontrast 2,6 : 1, pod hranicí 4,5 : 1. Maketa používá `#64748b` (4,8 : 1). Oprava patří do etapy A, ne do opravy řádků okruhů.

## 8. Postup po schválení

1. Etapa A: modul směrů s testem pokrytí kódů, nový řádek oboru s odkazem na stránku oboru, malá a střední města. Ověření na náhledu: Tišnov, Písek, Pardubice.
2. Etapa B: velká města (sbalené směry, hledání), ověření na Brně a Praze, včetně mobilu.
3. Etapa C: „kam dál“ po zápisu ukazatele, vyhledávání u obcí s jedinou školou.

Před etapou A navrhuji ukázat vizuální maketu na skutečných datech Brna a Tišnova.

## 9. Co se nakonec udělalo

Vlastník 4. 10. 2026 zvolil: čtenář je rodič i uchazeč stejnou měrou, úspěch je krátký seznam oborů ke kliknutí, výstupem přímá přestavba stránky. Ze tří vylosovaných struktur (karty škol podle směru, nejdřív krátký seznam, rejstřík se směry vlevo) vybral **karty škol podle směru**. Proti oddílu 4 to znamená:

- **Škola zůstává kartou** (rozhodnutí z 21. 9. 2026), směr studia ji neseskupuje, ale **zužuje**: čipy směrů s počty v tmavém pásu pod nadpisem vyberou směr a zůstanou jen karty škol, které ho učí, a v nich jen jeho obory.
- **Řádek oboru** podle 4.2: obor, délka, ročník u víceletých gymnázií, zaměření, obtížnost přijetí, místa; vede na stránku oboru (adresu skládá `adresa-oboru.mjs`). Učební obory a konzervatoře jsou na kartách svých škol se značkou výuční list a bez obtížnosti.
- **Velikosti** podle 4.3 (`velikostMesta`): malé město jen karty, střední a velké čipy, přepínač maturita / výuční list a výběr obtížnosti, velké navíc hledání. Na telefonu jsou výběr obtížnosti a hledání pod tlačítkem „Upřesnit výběr“, aby byla první karta v prvním výhledu.
- **Odebráno**: okruhy, karty podle typu školy, samostatný oddíl dalších oborů, tři součty za město, věta s podílem, pozice na přihlášce, přihlášky na místo, body a značka 2. kola v řádku (vše je na stránce oboru). „Kam se uchazeči hlásí i jinam“ (4.6) a pruh obtížnosti u směru (4.1) zatím nejsou: první potřebuje zápis ukazatele, druhý se do čipů nevešel.
- **Název školy na kartě**: plný název z katalogu (`nazev`) s ulicí, bez právní formy (`nazevSUlici`). U části škol je i `nazev` zkratka z rejstříku („Bezpečnost. práv. akad.“); delší tvar mají soubory přihlášek CERMAT, převzetí je otevřené.
- **Vada dat**: katalog 2026 nese nabídku SŠ KNIH v Brně (66-43-M/01) dvakrát se stejným id; karta ji ukazuje jednou.
- Odznak „středně těžké“ má `slate-500` (kontrast 4,8 : 1).

## 10. Etapa 3b: řádky místo karet (4. 10. 2026)

Vlastník po nasazení etapy 3: mřížka karet ve dvou sloupcích má různě vysoké rámečky a je nepřehledná, soukromá škola neupozorňuje, že může být placená, a u AKADEMIA Gy je na stránce města 10 míst, na stránce oboru 20. Změny:

- **Jedna tabulka přes celou šířku**: škola je záhlaví skupiny, pod ní její obory ve stálých sloupcích (obor a zaměření, délka, obtížnost přijetí, místa). Na telefonu název oboru a pod ním jeden řádek s délkou, odznakem a místy.
- **Zřizovatel u názvu školy**: soukromá a církevní škola nese štítek „… škola · může vybírat školné“ (slovník pojmů, heslo zřizovatel; výši školného nemáme, slovo „placená“ se nepoužívá). V upřesnění přibyl výběr zřizovatele s počty škol.
- **Rozpor 10 a 20 míst** byl na stránce oboru: pruh oborů školy bral u oborů bez zaměření místa ze staršího zpracování (`school_analysis.json`), u 737 z 1 845 oborů. Opravuje samostatné PR „místa v pruhu oborů“; stránka města měla číslo správně (katalog 2026).

## 11. Okruhy se vracejí na stránku města (4. 10. 2026)

Etapa 3 okruhy ze stránky města odebrala s odůvodněním, že zůstávají na stránce oboru. To nebyla pravda: stránka oboru ukazuje jen souhrn po obcích a tabulku oborů výš a níž na přihlášce, samotný okruh nikde. Vlastník rozhodl okruhy vrátit.

**Podnět od uživatele** (interaktivní síť brněnských oborů podle společných uchazečů 2024–2026, 156 oborů, 6 okruhů a 18 pojmenovaných podskupin) jsme porovnali s našimi okruhy. 87 % oborů jeho podskupin leží v jednom našem okruhu, jeho podskupiny jsou jen jemnější. Jeho šest okruhů (Technika, Gymnázia, Zdravotnictví a sociální práce a služby, Ekonomika, Umění, Znevýhodnění) skoro přesně odpovídá našim směrům studia. Převzato a nepřevzato:

| Z podnětu | Závěr |
|---|---|
| srozumitelné jméno okruhu | **převzato**, ale odvozeně: jméno ze směrů studia, které v okruhu převažují podle uchazečů; víceletá gymnázia podle délky, „učební obory“ při jejich převaze, při shodě jmen ve městě převažující skupina oborů z číselníku MŠMT. Ruční pojmenování by pro 102 měst nešlo udržet |
| jistota zařazení oboru (bootstrap, „nejistý“) a podíl „na přihlášce výš“ | nepřevzato teď; naše data to nenesou, námět pro další krok (slovník už má *spíš výš / spíš níž v okruhu*) |
| síťový graf s hranami | **zamítnuto**: soubor nese 4 823 hran s méně než deseti společnými uchazeči (nejmenší 1), to meze zveřejnění nedovolují |
| hledání a seznam sousedů oboru | už pokrývá stránka oboru (obory výš a níž na přihlášce) |

**Podoba:** oddíl `#okruhy` pod tabulkou škol, odkaz na něj v úvodní větě. Okruh je sbalitelný blok se jménem, počtem oborů a uchazečů a třemi největšími školami; uvnitř tabulka ve stylu hlavního přehledu (škola a obor, obtížnost přijetí, uchazeči), řazená podle uchazečů. Obtížnost se bere ze souhrnů 1. kola pro všechny obory okruhu, i z okolních obcí; zaměření s různou obtížností dají „liší se podle zaměření“. Řádek vede na stránku oboru, když klíč odpovídá jediné nabídce ve městě, jinak na přehled školy.

**Zbývá:** v Praze 7 a v Ostravě 2 okruhy se stejným jménem (gymnázia a umění v různých částech města); odliší je jen druhý řádek s největšími školami.

## 12. Okruh na stránce oboru (4. 10. 2026)

Stránka oboru měla v bloku „Které další obory v okolí uchazeči také volí“ jen podíl uchazečů podle obcí. Nově nejdřív ukáže okruh, do kterého obor patří: jméno okruhu stejné jako na stránce města, deset největších oborů okruhu (tento obor vždy, zvýrazněný „tento obor“), obtížnost přijetí a počet uchazečů, větu o přesunu zájmu a odkaz na celý okruh na stránce města. Podíl podle obcí zůstává pod tím jako „Ve kterých obcích se uchazeči hlásí také“. Řádky jsou kompaktní (škola, obor, odznak, uchazeči) kvůli úzkému sloupci stránky oboru. Podklad okruhů (katalog, názvy, obtížnost ze souhrnů) je ve sdíleném `src/lib/okruhy-podklad.ts`, takže obě stránky skládají okruh stejně; příslušnost oboru bere `getOkruhOboru` z `obory.{klic}.okruh`. Řádky na stránce oboru vedou na přehled školy (odkaz přímo na obor by vyžadoval katalog měst všech okolních obcí).

## 13. Shodná jména okruhů (5. 10. 2026, #364)

Jméno okruhu ze směrů studia se v Praze opakovalo u 7 okruhů a v Ostravě u 2 (gymnázia a umělecké školy v různých částech města). Při shodě jmen ve městě se teď postupně doplní: převažující skupina oborů z číselníku (beze změny), **převažující část obce** podle uchazečů místních oborů okruhu (Praha: obvod „Praha 4“ z katalogu nebo z adresy sídla v rejstříku; ostatní města: část obce „Poruba“ z adresy sídla, jen když obec v adrese je město stránky) a nakonec **převažující obor** okruhu („hudebně dramatické umění“, „grafický design“). Shody se hledají v okruzích i nástavbách dohromady, protože na stránce stojí vedle sebe; proto v Brně nástavby „Podnikání“ nově nesou „…: podnikání“ (dřív stejné jméno jako okruh bezpečnostně právních oborů). Ve všech 86 městech s okruhy se teď žádné jméno neopakuje. Stránka oboru sestavuje všechny okruhy svého města, aby nesla stejné jméno jako stránka města (dřív sestavovala jen svůj okruh a upřesnění při shodě jí chybělo).

## 14. Obory na pomezí okruhů (5. 10. 2026, #366)

Generátor okruhů u každého oboru okruhu spočítá *Jistotu zařazení do okruhu* (slovník ukazatelů): uchazeči zobrazeného roku se 100× převzorkují s vracením, okruhy se v pevných oblastech přihlášek spočítají znovu a měří se, jak často obor zůstane s aspoň polovinou svých původních sousedů. Semínko je pevné, složení okruhů se nemění. Rozbor ročníku 2026: pod 0,5 je 13 % oborů zveřejněných okruhů, dva výpočty s jiným semínkem dají 95 % oborů na stejnou stranu hranice 0,6 (u 0,5 se shoda neměřila). Pod prahem 0,5 nese řádek na stránce města i oboru štítek **na pomezí okruhů** a blok okruhu ho jednou větou vysvětlí; nad prahem se nic neukazuje. V Brně je na pomezí 16 ze 182 řádků v 6 ze 14 okruhů, typicky pedagogická lycea a obory, na které se hlásí uchazeči zdravotnických i ekonomických škol.

Výpočet trvá asi 9 minut navíc ke generátoru; přegeneruje se s ním při každém novém ročníku.

## Historie

| Verze | Datum | Změna |
|---|---|---|
| 0.6 | 5. 10. 2026 | shodná jména okruhů: část obce a převažující obor (oddíl 13) |
| 0.5 | 4. 10. 2026 | okruh oboru na stránce oboru (oddíl 12) |
| 0.4 | 4. 10. 2026 | okruhy zpět na stránce města se jménem ze směrů studia; hodnocení podnětu se sítí oborů (oddíl 11) |
| 0.3 | 4. 10. 2026 | etapa 3b: tabulka po školách místo karet, zřizovatel a školné (oddíl 10) |
| 0.2 | 4. 10. 2026 | přestavba podle volby vlastníka: karty škol zúžené směrem studia (oddíl 9) |
| 0.1 | 4. 10. 2026 | první verze; oprava řádků „Gymnázium“ a slévání škol v dalších oborech hotová |
