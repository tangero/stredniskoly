# Aktuální ročník dat na stránkách škol a oborů

Verze 1.0 · 13. 9. 2026 · Návrh, neimplementováno.

Cíl: stránky ukazují data přijímacího řízení 2026, a jakmile vyjdou data 2027, pak ta. Žádná stránka nesmí nazvat loňská čísla letošními, ani smíchat dva ročníky pod jedním popiskem.

Podklady: [zdroje dat](zdroje-dat.md), [slovník ukazatelů](slovnik-ukazatelu.md), [kalendář a data 2027](aktualizace-kalendar-data-2027.md), [katalog 2026](rozbor-a-dodavka-katalogu-2026.md).

## 1. Vada

Na stránce oboru bez zaměření se zobrazují počty přihlášek, přijatých a kapacity z roku 2025, přestože katalog nese data 2026. Nadpis bloku přitom zní „Přijetí a kapacita · 2025“, takže stránka nelže o roku, ale ukazuje starý ročník.

| Nabídka | Stránka ukazuje | Katalog 2026 |
|---|---|---|
| Gymnázium J. S. Machara, 8leté | 222 přihlášek, 30 přijatých | 233 přihlášek, 30 přijatých |
| Gymnázium J. S. Machara, technické lyceum | 37 přihlášek, 11 přijatých | 65 přihlášek, 23 přijatých |

**Rozsah: 1 678 z 1 921 nabídek bez zaměření** ukazuje jiná čísla než katalog 2026. Nabídky se zaměřením zasažené nejsou.

### Příčina

`getProgramsByRedizo` v `src/lib/data.ts` skládá seznam oborů školy ze dvou zdrojů:

- **Nabídky se zaměřením** berou čísla z posledního ročníku katalogu `schools_data.json`, tedy z roku 2026, včetně pole `rok`.
- **Nabídky bez zaměření** spadnou do větve „Škola nemá zaměření“ a berou čísla ze `school_analysis.json`. Ten nese agregát roku 2025 za kombinaci REDIZO a KKOV a pole `rok` nemá, takže stránka doplní rok 2025.

Mapa zaměření v téže funkci přitom záznamy bez zaměření z katalogu vůbec nenačte, přestože v něm leží s čísly roku 2026. Totéž dělá `getAllSchoolsForSearch`.

### Proč je to víc než jedna větev

`school_analysis.json` je páteř celého webu. Z něj vzniká seznam škol a oborů, adresy stránek, rozpoznání typu stránky, vyhledávání, žebříček, regiony, sitemap a pět API. Jeho generátor není dohledaný, jak uvádí slovník u indexu obtížnosti, a obsah je z roku 2025.

Rok 2026 do něj byl přidán bokem jako pole s příponou, například `prihlasky_2026` a `kapacita_2026`, která čte šest souborů. Pět nabídek roku 2026 v něm chybí úplně, a proto nemají stránku.

Letopočty jsou v kódu zapsané napevno: 188 výskytů v šesti hlavních souborech datové vrstvy a stránek, dalších devět souborů odkazuje na soubory a příznaky s `_2026` v názvu. Kdyby se rok 2027 přidal stejně, vznikla by třetí vrstva přípon.

## 2. Co znamená „tam, kde jsou, za 2027“

Data jednoho ročníku nepřicházejí najednou. CERMAT vydává za každé kolo tři samostatné soubory, jak je vidět na `PZ2026_kolo1_skolobory_kapacity.xlsx`, `…_prihlasky.xlsx` a `…_vysledky.xlsx`, a data o jednotlivých uchazečích vycházejí zhruba o rok později; soubor za rok 2025 je z 29. 1. 2026.

Přihlášky na střední školy pro rok 2027 končí 22. 2. 2027 a výsledky 1. kola 2026 byly platné k 17. 8. 2026. Po několik měsíců tedy bude existovat nabídka a kapacita 2027 bez přihlášek, a potom přihlášky 2027 bez výsledků.

Z toho plyne základní pravidlo návrhu: **ročník patří ke skupině údajů, ne ke stránce.**

| Skupina | Údaje | Zdroj | Kdy přichází |
|---|---|---|---|
| Nabídka | obor, zaměření, forma, délka, kapacita | `PZ{rok}_kolo1_skolobory_kapacity` | první |
| Přihlášky | přihlášky celkem a podle priority | `PZ{rok}_kolo1_skolobory_prihlasky` | po uzávěrce přihlášek |
| Výsledky 1. kola | přijatí, důvody nepřijetí, průměry JPZ | `PZ{rok}_kolo1_skolobory_vysledky` | po 1. kole |
| Údaje o uchazečích | pásma přijetí, souběžné přihlášky, nejnižší přijatý, kohorty | `PZ{rok}_kolo1_uchazeci_prihlasky_vysledky` | zhruba o rok později |

Každá skupina se zobrazí z nejnovějšího ročníku, ve kterém pro danou nabídku existuje, a nese vlastní rok.

**Ukazatel počítaný z více skupin smí brát vstupy jen z jednoho ročníku.** Přihlášky na místo z kapacity 2027 a přihlášek 2026 by byly číslo, které nikdy neexistovalo. Takový ukazatel se zobrazí z posledního ročníku, kde jsou obě skupiny, a nese jeho rok.

Příklad stránky v březnu 2027:

> Pro rok 2027 škola vypsala 30 míst.
> Přihlášky a přijetí · 2026: 233 přihlášek, 30 přijatých, 7,8 přihlášky na místo.
> Jak to dopadlo · 1. kolo 2025: …

## 3. Návrh řešení

Pět kroků. První odstraní vadu hned a na ničem dalším nezávisí. Druhý a třetí připraví web na rok 2027 a mají být hotové před prvním importem dat 2027.

### Krok 1 · Oprava větve bez zaměření

Malá změna, jen v `src/lib/data.ts`.

1. Mapa v `getProgramsByRedizo` načte **všechny** záznamy posledního ročníku katalogu, i ty bez zaměření.
2. Větev „Škola nemá zaměření“ vezme čísla ze záznamu katalogu se stejným identifikátorem, včetně polí `rok`, `historicka_data_rok` a `nevypsano_2026`. Na `school_analysis.json` sáhne jen tehdy, když záznam v katalogu chybí, a pak rok výslovně označí jako 2025.
3. Totéž v `getAllSchoolsForSearch`.

Adresy stránek se nemění, protože se dál odvozují ze `school_analysis.json`.

Ověření: nový test v `tests/`, který pro každý záznam posledního ročníku katalogu porovná čísla a rok vrácené z `getProgramsByRedizo`. Očekávaný výsledek je 0 rozdílů místo 1 678.

### Krok 2 · Jedna funkce pro ročník

Nový `src/lib/rocnik.ts` nahradí napevno zapsané letopočty.

- `rocnikyKatalogu()` vrátí seznam ročníků v `schools_data.json` seřazený sestupně. Nový ročník se tím projeví bez změny kódu.
- `udajeNabidky(id)` vrátí pro nabídku čtyři skupiny z tabulky v oddílu 2, každou s vlastním rokem, nebo `null`, když skupina v žádném ročníku není.
- Odvozené ukazatele, například přihlášky na místo, počítá jen ze skupin téhož roku.

Zápisy `data['2026'] || data['2025'] || data['2024']` v `data.ts` a `cityData.ts` se nahradí voláním funkce. Příznaky s rokem v názvu se převedou na hodnotu: `nevypsano_2026` na `nevypsano_v_rocniku: 2026`. Stará pole zůstanou jako přechodný alias, dokud je čtou komponenty.

### Krok 3 · Katalog jako páteř, se zamrazenými adresami

Seznam škol a oborů se bude brát z katalogu místo ze `school_analysis.json`.

**Hlavní riziko jsou adresy stránek.** Adresa se dnes skládá z názvu školy a oboru. Názvy v katalogu 2026 se od názvů v `school_analysis.json` liší u 402 z 2 901 kombinací, typicky přibylo číslo popisné, například „VOŠ a SPŠ, U Stadionu“ proti „VOŠ a SPŠ, U Stadionu 1166“. Přímé přepnutí by změnilo 402 adres a rozbilo odkazy z vyhledávačů.

Řešení: adresa se od názvu oddělí.

1. Jednorázový skript vygeneruje `public/adresy_stranek.json` s dnešními adresami všech nabídek, tedy přesně těmi, které jsou v sitemap.
2. Stránka se hledá podle této mapy, ne podle názvu.
3. Nová nabídka dostane adresu při prvním výskytu a ta se už nemění. Změna názvu školy v dalším roce adresu nezmění.
4. Pět nabídek roku 2026, které dnes stránku nemají, ji dostane.

`school_analysis.json` pak zůstane jen jako archiv polí `obtiznost` a `category_code`, která se podle slovníku nemají zobrazovat.

### Krok 4 · Spotřebitelé dat

Po krocích 2 a 3 přejdou na novou funkci tato místa, která dnes čtou čísla z roku 2025:

| Kde | Co čte | Poznámka |
|---|---|---|
| `src/app/skola/[slug]/page.tsx` | kapacita, přihlášky, přijatí | krok 1 opraví obory, souhrn školy zůstává |
| `src/app/skoly/page.tsx` | přihlášky, kapacita, index poptávky, min body, obtížnost | část už čte pole `_2026` |
| `src/app/regiony/page.tsx` | přihlášky, index poptávky | celé z roku 2025 |
| `src/app/api/chances/route.ts` a `src/lib/chances.ts` | přihlášky, kapacita, přijatí, index poptávky | míchá roky 2025 a 2026 |
| `src/app/api/school-details/[id]/route.ts` | přihlášky, kapacita, přijatí | celé z roku 2025 |
| `src/app/api/schools/search/route.ts` | kapacita, přihlášky, přijatí | rok zapsaný napevno |
| `src/app/api/dostupnost/route.ts`, `praha-dostupnost` | přihlášky, kapacita, index poptávky, obtížnost | obtížnost podle slovníku nepoužívat |
| `scripts/generate-sitemap.js` | seznam nabídek | po kroku 3 z mapy adres |

### Krok 5 · Import ročníku 2027

1. `scripts/build-catalogue-2026.py` a `scripts/build-offer-mapping-2026.py` se zobecní parametrem `--rok`.
2. Import musí přijmout **neúplný ročník**: nejprve jen soubor kapacit, později přihlášky a výsledky. Záznam ročníku nese jen skupiny, které už vyšly; funkce z kroku 2 zbytek vezme ze staršího ročníku.
3. Párování nabídek na stabilní identifikátory proběhne pro každý nový ročník. V roce 2026 zůstalo 18 nabídek nespárovaných a 56 nejednoznačných, takže s ruční kontrolou je nutné počítat i pro rok 2027.
4. Soubory s rokem v názvu, tedy `applications_2026.json`, `cermat_results_2026.json` a `pasma_prijeti_2025.json`, se buď přejmenují na ročníkově neutrální, nebo je bude vybírat funkce z kroku 2 podle nejnovějšího dostupného roku.

## 4. Zvážené nepoužité zdroje

Povinný krok podle `docs/zdroje-dat.md`, oddíl 3.

- **Druhé kolo přijímacího řízení.** Patří do tabulky skupin jako pátá skupina se stejným pravidlem ročníku. Do tohoto návrhu nepatří, protože zpracování druhého kola je samostatná odložená etapa.
- **Dobíhající obor z rejstříku.** Užitečné pro odlišení nabídky, kterou škola jen letos nevypsala, od oboru, který ruší. Pro volbu ročníku nepotřebné; doporučeno jako doplněk kroku 5.
- **Web a kontakt školy z rejstříku.** S ročníkem dat nesouvisí, zamítnuto pro tento návrh.

## 5. Přejímací podmínky

1. Žádná nabídka posledního ročníku katalogu nemá na stránce jiná čísla než v katalogu. Dnes 1 678.
2. Každý blok s čísly nese rok a ten odpovídá skupině údajů, ze které čísla pocházejí.
3. Žádný ukazatel nekombinuje skupiny z různých ročníků.
4. Žádná adresa ze současné sitemap nezmizí ani se nezmění; ověří se porovnáním sitemap před změnou a po ní.
5. Mimo importní skripty a konstanty nezůstane v datové vrstvě a na stránkách napevno zapsaný letopočet.
6. Zkouška s uměle vytvořeným neúplným ročníkem 2027, obsahujícím jen kapacity: stránka ukáže kapacitu 2027, přihlášky a přijetí 2026 a přihlášky na místo z roku 2026.

## 6. Doporučené pořadí

Krok 1 hned, protože opraví většinu stránek oborů bez zásahu do adres. Kroky 2 a 3 před prvním importem dat 2027, protože bez nich by rok 2027 zopakoval dnešní vadu. Kroky 4 a 5 průběžně s importem.

## Historie

| Verze | Změna |
|---|---|
| 1.0 | První návrh po rozboru vady, kdy stránky oborů bez zaměření ukazovaly data 2025. |
