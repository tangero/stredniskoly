---
name: oponentura
description: Oponentura při rozjezdu nového projektu v tangero/stredniskoly - z popsaného problému průzkum, nezávislé návrhy více modelů naslepo, vzájemné posouzení z pohledu hodnot projektu a person, syntéza variant pro rozhodnutí vlastníka. Použij, když issue má štítek `oponentura` nebo když vlastník o oponenturu požádá.
---

# Oponentura

Slouží k rozjezdu nového projektu: před prvním řádkem kódu stanovit, co přesně řešíme, jaké jsou možné cesty
a jaké mantinely projekt dostane. Rutinně se nespouští; štítek `oponentura` přidává ručně vlastník nebo asistent
zadání. Review (hledání chyb v hotové práci) je jiná činnost a dělá se v PR.

Postup vychází z osvědčených technik: problém se popisuje bez řešení (dvojitý diamant), návrhy vznikají
nezávisle, aby se nikdo nezakotvil na prvním nápadu (nominal group technique), hodnotí se anonymně a jinými
modely, protože modely nadhodnocují texty podobné vlastním, a syntéza drží odlišné varianty místo průměru,
protože shoda vede k horším rozhodnutím než strukturovaný spor (dialektické zkoumání, pre-mortem).

## Vstup

Issue podle šablony **Problém** (`.github/ISSUE_TEMPLATE/problem.yml`, pro `gh` `.github/INTERNAL_TEMPLATES/problem.md`):
co chceme získat, pro koho, podle čeho poznáme úspěch, mantinely, co už víme, pohledy k posouzení a nepovinný
nápad na řešení. Měřítkem „co potřebujeme prosadit“ je oddíl **Hodnota pro projekt** v `docs/smer-vyvoje.md`.

Issue bez šablony se zpracuje taky: průzkum z něj problém odvodí a text issue vstoupí jako jeden z kandidátů.
Výstup to uvede v omezeních.

## Fáze

Workflow `.github/workflows/oponentura.yml` je provede za sebou; zadání fází jsou v `faze/`.

1. **Průzkum** (Claude Code, smí číst web, `faze/pruzkum.md`): problém vlastními slovy, co projekt už má, jaká
   data a zdroje existují venku a za jakých podmínek, aktéři a koho oslovit, jak to řeší jinde. Žádná řešení.
2. **Návrhy naslepo** (Claude a Kimi zvlášť, `faze/navrh.md`): každý vidí jen problém a průzkum, ne nápad
   z issue ani návrh druhého modelu. Povinně tři odlišné přístupy: vlastní nejlepší, bez programování
   a „nejdřív zjistit“.
3. **Kritika** (Claude a Kimi zvlášť, `faze/kritika.md`): kandidáti pod náhodnými písmeny (oba návrhy a nápad
   z issue), posouzení očima každé persony, pre-mortem, klíčové předpoklady, zaujatost a úzký pohled, pořadí.
4. **Syntéza** (Kimi, `faze/synteza.md`): 2 až 3 skutečně odlišné varianty, doporučení, pohledy person,
   nejlevnější rozhodující test, otázky na vlastníka a omezení. Bez slévání do kompromisu.

Komentář `## Oponentura` nese syntézu; průzkum, kandidáti (i s odkrytými autory) a kritiky jsou pod ní ve
sbalených oddílech. Workflow pak odebere `oponentura` a issue bez `navrh` a `schvaleno` vrátí do `navrh`.

## Po oponentuře

Vlastník zvolí variantu (nebo vrátí problém k přepsání). Claude Code nebo asistent zadání z ní napíše zadání
projektu s rozsahem, mandátem, rozpočtem a etapami (štítek `projekt`) a vlastník ho schválí. Výsledky oponentury
jsou hypotézy: pohledy person hrály modely, proto doporučení uvádí, jak je ověřit skutečností.

## Ruční provedení

Když workflow neběží, může oponenturu provést Claude Code v relaci se stejnými fázemi: průzkum sám, návrhy
a kritiky přes podagenty s jinými modely, kandidáty anonymizovat, syntézu napsat podle `faze/synteza.md`
a v omezeních uvést, které modely se účastnily.

## Pravidla

- Tělo issue se nemění; štítky `schvaleno`, `zamitnuto` ani `stop` oponentura nepřidává.
- Žádné osobní údaje (CLAUDE.md, pravidlo 4). Zdroje z webu se uvádějí odkazem (pravidlo 7).
- Tvrzení o projektu se dokládají odkazem na soubor, issue nebo data, jinak jsou označená jako předpoklad.
