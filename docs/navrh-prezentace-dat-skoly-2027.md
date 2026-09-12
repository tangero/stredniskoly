# Návrh prezentace dat na stránce školy a oboru

Verze 1.1 · 12. 9. 2026 · Stav: návrh k rozhodnutí, nic z toho není implementované.

Názvy a definice všech ukazatelů drží [slovník ukazatelů](slovnik-ukazatelu.md). Nový ukazatel se nezavádí bez zápisu do něj.

Podklad: [audit obtížnosti přijetí](audit-obtiznost-prijeti-2027.md), [audit dat karet](audit-dat-karet-2027.md), [rešerše návazností](ukol-navaznost-skol-a-oboru-2027.md). Posuzované stránky: [Gymnázium Nad Štolou](https://www.prijimackynaskolu.cz/skola/600171701-gymnazium-nad-stolou) a [jeho čtyřletý obor](https://www.prijimackynaskolu.cz/skola/600171701-gymnazium-nad-stolou-gymnazium-4lete-vseobecne-studium).

## 1. Na co se návštěvník ptá

Rodič a žák řeší tři různé otázky a dnešní stránky je nerozlišují:

1. **Dostanu se tam?** Poptávka po oboru, body přijatých, kolik uchazečů se nevešlo.
2. **Utáhnu to tam?** Náročnost studia, úroveň spolužáků, jak si škola vede u maturity.
3. **Je to dobrá škola?** Co říká inspekce, jaká je výuka, vybavení, dostupnost.

První otázka je o oboru, druhá zčásti o oboru a zčásti o škole, třetí skoro celá o škole. To určuje dělbu mezi oběma stránkami.

## 2. Co v datech máme

| Zdroj | Obsah | Pokrytí |
|---|---|---|
| `schools_data.json` | Katalog 2024, 2025, 2026: nabídka, kapacita, přihlášky, přijatí | 3 239 nabídek v ročníku 2026 |
| `applications_2026.json` | Přihlášky podle priority 1–5, kapacita, kontext přijetí | 3 091 nabídek |
| `cermat_results_2026.json` | Přijatí, průměr ČJ a MA přijatých, pořadí v typu školy | 3 076 nabídek |
| `school_analysis.json` | Priority 2025, kategorie oboru, index poptávky obou let | 2 901 oborů |
| `cohort_meta.json` | Normalizace skóre a devět kohort přijatých | celý katalog |
| `csi_inspections.json` | Termíny a odkazy na inspekční zprávy | 9 564 subjektů |
| `data/inspection_extractions.json` | Silné stránky, rizika a popisy z inspekčních zpráv | 849 škol |
| `navaznost_notes.json` | Co se s nabídkou stalo mezi roky | 216 poznámek |
| Maturitní výsledky CERMAT | Úspěšnost, průměrný skór, percentil, trend 2015–2026 | **zatím neimportováno** |

Klíčový údaj, který **nemáme**: hranici přijetí, tedy kolik bodů měl poslední přijatý. CERMAT ji nezveřejňuje. Nesmí se odvozovat z průměru.

### Maturitní výsledky jsou největší chybějící díl

Na otázku „utáhnu to tam“ a „je to dobrá škola“ dnes odpovídáme jen inspekčními zprávami. Maturitní výsledky by na ni odpověděly mnohem přesněji a [schválený analytický návrh](maturitni-vysledky-a-kvalita-skoly-2027.md) je popisuje do detailu: zdroje, kontrakt, meze zveřejnění i zákaz jednoduchého žebříčku. Import ale zatím nezačal.

Pro tento návrh jsou podstatná tři omezení, která z něj plynou:

- **Maturita je za školu, ne za obor.** CERMAT ji zveřejňuje za právnickou osobu a za školu ve skupině oborů `SMO16`, což není kód oboru. Na stránce oboru se proto smí objevit jen jako „výsledek školy ve skupině oborů“.
- **Vysoký výsledek nemusí být zásluha školy.** Může plynout z toho, kdo do ní nastoupil. Bez vstupního kontextu se nečte jako přidaná hodnota. Ukazatel „odchylka od očekávaného výsledku“ je zatím výzkumný a nepublikuje se.
- **Malé skupiny se chrání.** Pod deset maturantů jen počty, do 29 s upozorněním.

Maturita tedy patří především na stránku školy jako samostatný oddíl s rokem, obdobím a velikostí vzorku, ne do souhrnného hodnocení.

## 3. Co je dnes na stránkách špatně

### 3.1 Stejný název karty, dvě různá čísla

Obě stránky mají kartu „Přihlášky 2026 · 1. kolo“. Na stránce školy ukazuje 1 407 přihlášek na 150 míst, tedy **9,4× na místo**. Na stránce oboru 153 přihlášek na 60 míst, tedy **2,6×**.

Ten rozdíl není chyba součtu, ale chyba významu. Škola nabízí tři gymnázia pro tři různé ročníky základní školy a poptávka se mezi nimi liší desetinásobně:

| Obor | Přihlášky | Kapacita | Na místo |
|---|---:|---:|---:|
| Gymnázium 4leté | 153 | 60 | 2,5× |
| Gymnázium 6leté | 719 | 30 | 24,0× |
| Gymnázium 8leté | 535 | 60 | 8,9× |
| **Součet za školu** | **1 407** | **150** | **9,4×** |

Sečíst tři nesouvisející konkurzy a vydělit součtem míst nedává číslo, ke kterému se lze přihlásit. Uchazeč do šestiletého gymnázia čelí poptávce 24×, uchazeč do čtyřletého 2,5×; ani jednomu z nich 9,4× nic neříká. Navíc jeden uchazeč podává až tři přihlášky, takže součet přeceňuje počet lidí.

**Návrh:** poměr přihlášek na místo počítat výhradně za obor. Na stránce školy jej u každého oboru vypsat zvlášť, nebo uvést rozsah, u této školy 2,5× až 24,0×.

### 3.2 Čísla bez měřítka

„3,6× na místo“ nikomu neřekne, jestli je to hodně. Máme přitom celý ročník, vůči kterému to lze změřit.

Přihlášky na místo v 1. kole 2026, podle typu a délky studia:

| Skupina | Nabídek | Dolní čtvrtina | Medián | Horní čtvrtina |
|---|---:|---:|---:|---:|
| Čtyřleté gymnázium | 437 | 1,93 | 2,60 | 3,35 |
| Šestileté gymnázium | 71 | 2,26 | 3,50 | 9,67 |
| Osmileté gymnázium | 273 | 2,32 | 3,31 | 5,34 |
| Střední odborná škola | 1 412 | 1,83 | 2,62 | 3,47 |
| Lyceum | 289 | 1,68 | 2,77 | 3,86 |
| Učební obor | 358 | 1,21 | 2,04 | 3,11 |
| Nástavba | 251 | 1,47 | 2,18 | 3,23 |

Průměr JPZ přijatých na škále 0–100:

| Skupina | Dolní čtvrtina | Medián | Horní čtvrtina |
|---|---:|---:|---:|
| Čtyřleté gymnázium | 59,7 | 69,1 | 76,2 |
| Osmileté gymnázium | 51,6 | 60,9 | 70,5 |
| Šestileté gymnázium | 51,0 | 61,3 | 68,7 |
| Lyceum | 48,8 | 57,3 | 65,1 |
| Střední odborná škola | 40,1 | 47,2 | 55,9 |
| Učební obor | 35,1 | 40,9 | 46,0 |
| Nástavba | 31,4 | 35,6 | 39,8 |

**Návrh:** ke každému číslu připojit jednu větu, kam v této skupině patří. Čtyřleté gymnázium Matyáše Lercha má 3,6 přihlášky na místo, což je víc než u 81 % ze 437 čtyřletých gymnázií; věta na stránce tedy zní „vyšší poptávka než u čtyř pětin čtyřletých gymnázií“. Srovnávat výhradně uvnitř typu a délky studia; porovnat gymnázium s nástavbou nedává smysl.

Rozdělení se počítá z ročníku, ne z odhadu, a jde přepočítat s každým novým importem.

### 3.3 Obě stránky se jmenují stejně

Nadpis je na obou `Gymnázium, Nad Štolou`. Z názvu ani z drobečkové navigace nepoznáte, že jedna je o škole a druhá o konkrétním oboru.

**Návrh:** na stránce oboru dát do nadpisu obor a školu jako podtitul. Doplnit větu, čím se stránky liší, a vzájemné odkazy: z oboru „zpět na školu“, ze školy seznam oborů.

### 3.4 Zbylý nadpis s cizím ročníkem

Stránka oboru má nadpis „Data z přijímacího řízení 2025“, pod kterým jsou dnes sekce roku 2026. Zůstal z doby, než se katalog přepnul na letošní ročník.

### 3.5 Rozdělení obsahu mezi stránky je nahodilé

Sekce „O škole“ s jazyky, vybavením, dostupností a inspekčními zjištěními je jen na stránce školy. Analytika přijímacího řízení, srovnání ročníků a priority jsou jen na stránce oboru. Kdo přijde na obor, o škole se nedozví nic; kdo přijde na školu, nezjistí, jak těžké je se na konkrétní obor dostat.

## 4. Návrh rozdělení rolí

**Stránka školy odpovídá na „je to dobrá škola“.** Patří sem identita a kontakt, přehled oborů s jedním srovnatelným ukazatelem u každého, kvalitativní profil z inspekčních zpráv, dostupnost, inspekce a po importu i maturitní výsledky. Souhrnná čísla za školu jen tam, kde dávají smysl: celková kapacita, počet oborů, rozsah poptávky mezi obory.

Maturitní oddíl má vlastní hlavičku s rokem, obdobím, skupinou oborů a zdrojem. Jarní výsledek a stav po podzimu se nesčítají ani nepřekrývají v jednom grafu.

**Stránka oboru odpovídá na „dostanu se tam“ a „utáhnu to“.** Patří sem poptávka a body s měřítkem, priority, srovnání ročníků, kohorty přijatých a poznámka o návaznosti nabídky. Ze školy sem převzít zkrácený profil se třemi nejsilnějšími zjištěními inspekce a odkazem na celou školu.

## 5. Jak dávat číslům význam

Pravidlo: **každý údaj má vedle sebe větu, co znamená.** Ne barevný odznak bez vysvětlení, ne procentil bez uvedení skupiny.

| Údaj | Věta s významem |
|---|---|
| Přihlášky na místo | Kam patří mezi obory téhož typu a délky |
| Průměr JPZ přijatých | Kam patří ve skupině a že nejde o hranici přijetí |
| Nepřijatí kvůli kapacitě | Kolik lidí se nevešlo, přestože podmínky splnili |
| První priority | Kolik uchazečů obor chtělo nejvíc; blízkost kapacitě napovídá o naplněnosti |
| Kohorty přijatých | Jaké typy uchazečů uspěly, ne jaká je vaše šance |
| Srovnání ročníků | Zda zájem roste, nebo klesá |
| Úspěšnost maturity | Kolik z konajících uspělo a z kolika lidí je podíl spočítaný |
| Průměrný skór maturity | Kam patří mezi školami téže skupiny oborů, s velikostí vzorku |

Doprovodná věta má být krátká a konkrétní. „Víc než u tří čtvrtin čtyřletých gymnázií“ řekne víc než „vysoká poptávka“.

## 6. Co nedělat

**Nevracet souhrnný index obtížnosti.** Audit z 11. 9. 2026 zjistil, že hodnota `obtiznost` v datech nemá dohledatelný vzorec, váhy ani validaci, a že se po přidání dat 2026 nezměnila. Zůstává v datech kvůli dohledatelnosti, ale na stránku nepatří. Jakýkoli nový vážený součet poptávky a bodů by byl jen další nedoložený index.

**Neodvozovat hranici přijetí z průměru.** Průměr přijatých neříká, kolik měl poslední přijatý.

**Nepočítat poměr přihlášek na místo za celou školu.** Viz oddíl 3.1.

**Nevydávat poptávku za osobní šanci.** Poptávka popisuje skupinu, ne konkrétního uchazeče.

## 7. Pořadí prací

1. Opravit poměr přihlášek na místo na stránce školy a zbylý nadpis s rokem 2025. Obojí je dnes prokazatelně zavádějící.
2. Rozlišit obě stránky nadpisem a vzájemnými odkazy.
3. Doplnit referenční rozdělení a věty s významem. Rozdělení počítat skriptem z ročníku, ne ručně.
4. Sjednotit obsah: zkrácený profil školy na obor, ukazatel poptávky ke každému oboru na škole.
5. Importovat maturitní výsledky podle [schváleného návrhu](maturitni-vysledky-a-kvalita-skoly-2027.md) a doplnit je na stránku školy.

První dva body jsou opravy chyb, třetí a čtvrtý rozšíření stávajících dat, pátý nový datový zdroj s vlastní přejímkou.

## 8. Co je potřeba rozhodnout

- Jakou skupinu brát za referenční: typ školy a délku studia, nebo i kraj? Kraj zpřesní srovnání, ale u málo četných typů zbydou jednotky nabídek.
- Zda referenční rozdělení počítat i pro rok 2025, aby šlo ukázat posun v čase.
- Zda kohorty přijatých zobrazovat na stránce oboru, nebo je nechat v simulátoru.
- U 148 oborů, které se v roce 2026 nevypsaly, ukazujeme čísla z roku 2025. Zda je zahrnout do referenčního rozdělení, nebo z něj vynechat.
- Zda maturitní import zahájit hned, nebo až po opravách z bodů 1 a 2. Je to samostatný zdroj s deseti přejímacími podmínkami, takže si zaslouží vlastní dávku.
