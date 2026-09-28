# Kde stojím: pásmový proužek s výsledkem cvičného testu na veřejném webu

Verze 0.3 · 28. 9. 2026 · **schváleno zadavatelem 28. 9. 2026** (oddíl 6), fáze 1 implementována (komponenta `src/components/obor/KdeStojim.tsx`)

Navazuje na [pásmový proužek](navrh-pasmovy-prouzek-2027.md) a jeho nezalistovaný prototyp `/prototyp/pasma` (PR #182), [kritéria přijetí z DiPSy](predani-kriteria-prijeti-2026-09-25.md) a rozhodnutí zadavatele z 27. 9. 2026: kritéria 2026 ukazovat neověřená s výhradou chybovosti, body mezi ročníky porovnávat s výslovnou výhradou, výsledek cvičného testu TAU převádět přes pořadí.

## 1. Co tím rodina získá

Dnes web odpovídá na otázku „dostanu se tam?“ jen porovnáním s **průměrem přijatých** (simulátor, `src/lib/admission-gap.ts`: „Nad / Kolem / Pod průměrem přijatých“) a textovou kartou pásem na stránce oboru (`PasmaPrijetiCard`). Průměr nezná rozptyl a vlastní číslo uchazeče do karty nevstupuje.

Návrh spojí tři hotové věci z prototypu:

1. **Vlastní výsledek z cvičného testu TAU** převedený na body roku zobrazených pásem (ukazatel *Převedený výsledek testu*), i víc testů najednou.
2. **Proužek pásem** s polohou uchazeče a pořadím mezi soutěžícími uchazeči (*Pořadí mezi soutěžícími*).
3. **Co kromě přijímaček rozhodovalo** podle kritérií předchozího ročníku (*Podíl přijímaček na bodování*), s výhradou.

## 2. Kde na webu

| Místo | Dnes | Návrh | Pořadí |
|---|---|---|---|
| **Stránka oboru** (`/skola/[slug]`, oddíl s kartou pásem) | `PasmaPrijetiCard`, text a rozbalovací tabulka | proužek bez zadaných bodů jako obrázek pásem; pod ním „Zadej výsledek testu“ rozbalí zadání a ukáže polohu; pod proužkem blok kritérií | **1. fáze** |
| **Simulátor** (`/simulator`) | porovnání s průměrem přijatých u každé zvolené nabídky | zadané body se stejným převodem, u každé nabídky poloha vůči pásmu místo průměru; výsledky testů si stránka pamatuje v relaci stejně jako dnes body | **2. fáze** |
| Samostatná stránka „Kde stojím“ | — | **ne**: stejná funkce by byla na třech místech; vstupem je obor, takže patří na stránku oboru | zamítnuto |

Víceletá gymnázia mají vlastní převod (test pro 5. a 7. třídu), odkaz do TAU vede na příslušnou třídu.

## 3. Texty a pojmy

Všechny věty z prototypu už používají pojmy ze [slovníku pojmů](slovnik-pojmu.md) (*soutěžící uchazeči* s vysvětlením při prvním výskytu, *body*, rok výslovně místo „loni“). Nové pojmy k zápisu do slovníku pojmů ve stejné dávce:

| Pojem | Vysvětlení při prvním výskytu | Nepoužívat |
|---|---|---|
| **cvičný test** | „test z minulých přijímaček v aplikaci CERMAT TAU“ | zkouška nanečisto (to je placená služba jinde), test (bez upřesnění) |
| **převedený výsledek** | „kolik bodů by to bylo v roce {rok}: podle toho, kolik uchazečů mělo ve stejném testu horší výsledek“ | přepočtené body, normalizované body |
| **rozmezí, kde rozhodovalo i něco jiného** | už v prototypu a na kartě pásem; zapsat jako pojem k ukazateli *Pásmo nejistoty* | pásmo nejistoty (v textu pro rodiče), hranice přijetí |
| **kritéria {rok}** | „pravidla, podle kterých škola v roce {rok} řadila uchazeče; pro nové přijímací řízení platí nová“ | aktuální kritéria (pro minulý ročník) |

Výhrady, které musí zůstat na obrazovce: převedený výsledek spíš nadhodnocuje (doma, bez stresu, případně opravy v TAU); jiný test než TAU se neumí převést; proužek popisuje jeden ročník, není to předpověď; kritéria jsou přepis z PDF, zhruba každý desátý podstatně chybný, pro nové řízení platí nová (termín z harmonogramu MŠMT).

## 4. Povinná inventura zdrojů

Prošel jsem [zdroje dat](zdroje-dat.md) včetně oddílu 3. Návrh **nepřidává nový zdroj**; stojí na datech uchazečů (2.2), položkových datech JPZ 2024 (2.3) a přepisu PDF z DiPSy (2.16), vše zpracované v PR #182. Zvážené nepoužité sloupce:

| Nepoužitý sloupec | Rozhodnutí |
|---|---|
| **Oficiální nejnižší a nejvyšší výsledek přijatých a percentily** (souhrny, sl. 72–86) | **Nepoužít teď.** Byly by po zaměřeních a za aktuální rok, ale proužek potřebuje i horní mez pásma a rozdělení, které souhrny nenesou. Míchat dvě definice v jednom obrázku by bylo matoucí; zůstává jako samostatná dávka. |
| **Výsledky zkoušky všech uchazečů o obor v souhrnu** (sl. 45–65) | **Nepoužít.** Průměr a extrémy konkurence; pořadí mezi soutěžícími z dat uchazečů odpovídá přesněji. |
| **Přijatí podle priority** (sl. 40–44) | **Nepoužít zde.** Odpovídá na „kdo se sem dostává“, ne „kde stojím“; patří k pozici na přihlášce. |
| **Profil dovedností** (položková data, `b1`–`b16.x`) | **Nepoužít.** Zajímavé („v čem byli silní přijatí“), ale nezpracované a mimo otázku. |
| **Výsledky po termínech zvlášť** | **Použito** jen jako podklad převodu (řádné termíny 2024 se liší až o 5 bodů); jako údaj na stránce ne. |
| **Školní část zkoušky a přílohy** (DiPSy `skolniCast`, `typyPriloh`) | **Nepoužít.** Samotný příznak neříká, jak se boduje; blok kritérií stojí na přepisu PDF. |
| **Vstupní úroveň školy 2017–2023** | **Nepoužít.** Soubory nejsou stažené a odpovídají na dlouhodobou žádanost, ne na polohu uchazeče. |
| `jpz_prumer_actual`, `jpz_median` (katalog 2025) | **Nepoužít.** Nahrazeno pásmy a mediánem přijatých. |

## 5. Co se musí vyřešit před nasazením

1. **Issue #183:** pásma přijetí počítají uchazeče s více zaměřeními téhož oboru vícekrát (117 oborů). Proužek na veřejném webu nesmí stát na chybném `soutezicich`; oprava pásem **před** fází 1.
2. **Výkon stránky oboru:** stránka je ISR (revalidace 12 h). Převodní tabulka jednoho druhu testu má asi 2 kB, pořadí jednoho oboru pod 1 kB, kritéria jednoho oboru pod 1 kB; načítat na serveru jen pro daný obor (jako prototyp), celé soubory klientovi neposílat.
3. **Test srozumitelnosti** s několika rodiči: rozumí proužku bez popisků, věří převodu, čtou výhradu u kritérií? Otázky z prototypu (`/prototyp/pasma`, „Na co se při posuzování dívat“).
4. **Kontrola Jevem znovu** nad všemi přepisy „jen přijímačky“ po změně na celý text a všechna zaměření (≈ 0,30 USD).
5. **Slovník ukazatelů:** ukazatele už zapsané (verze 1.36); doplnit jen, kde se zobrazují.

## 6. Rozhodnutí zadavatele (28. 9. 2026)

1. **Fáze 1 jen stránka oboru**, simulátor až potom.
2. **Proužek je vidět i bez zadaných bodů** (jako obrázek pásem); zadání testů ho doplní o polohu.
3. **Blok kritérií jen tam, kde nerozhoduje jen JPZ.** Kde podle kritérií rozhodovala jen JPZ, stačí věta, že škola v roce {rok} přijímala podle jednotné přijímací zkoušky a kritéria pro nové řízení se teprve vyhlásí (termín z harmonogramu MŠMT).
4. **Výsledky testů si prohlížeč pamatuje** (jako dnes simulátor body), s možností je smazat.

## 7. Fáze 1: jak je to postavené

- `KdeStojim` sdílí stránka oboru i prototyp. Na stránce oboru je v důkazu „S kolika body se kdo dostal a kde byste stáli vy“, jen u oboru, kde se soutěžící uchazeči nevešli (stav A); jinde by pásma vyšla 100 % ([vrstvy stránky oboru](vrstvy-stranky-oboru-2027.md)).
- Data jen pro obor: převodní tabulka jen druhu testu oboru, pořadí a kritéria podle klíče REDIZO_KKOV. Stránka zůstává ISR (12 h).
- Výsledky testů v `localStorage` pod klíčem `kde-stojim:testy:v1:{druh}`: nic osobního, platí pro všechny obory se stejným testem; tlačítko „Smazat uložené výsledky“. Čtou se až po hydrataci.
- Blok kritérií se ukáže jen tam, kde podle přepisu nerozhodovala jen JPZ (včetně vážení předmětů a přepisů, kde kontrola našla chybějící složky). Bez přepisu se neukazuje nic.
- Pojistky z Codex review: proužek se nezapne u oboru bez vypočteného pásma nejistoty (zůstane histogram) ani tam, kde se součet v pořadí neshoduje se `soutezicich` v pásmech. Do sloučení PR #184 (issue #183) jde o 114 oborů. Kritéria se berou podle zaměření stránky. „Jen JPZ“ se hlásí, jen když to platí pro všechna zaměření, a i tehdy s výhradou k přepisu. Uložené testy mají v klíči ročník testu.
