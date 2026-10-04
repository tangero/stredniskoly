# Směr vývoje

Hlavní nástroj, kterým vlastník řídí projekt ([návrh řízení vývoje](navrh-rizeni-vyvoje-2027.md),
oddíly 17 a 17a). Claude Code a asistent zadání ho čtou při každém zpracování zadání a podle něj řadí
práci a vybírají nápady na briefing. Soubor je veřejný záměrně: projekt je transparentní.

**Změny smí sloučit jen vlastník** (cesta je v `h2` v `.github/rezimy.yml`, brána ji pustí jen se
`schvaleno` na PR). AI navrhuje změny jednou za čtvrtletí nebo po rozhodnutí na briefingu.

Stav: **platí od 3. 10. 2026**, potvrzeno vlastníkem (PR #293, rozpočet doplněn 3. 10. 2026).

## Hodnota pro projekt

Podle těchto hodnot posuzujeme každý nápad, ať přijde od vlastníka, asistenta zadání, nebo z AI. Žádná z nich
nápad sama nezakazuje: u každého se zváží, které hodnoty posílí, které oslabí a o kolik. Mezi hodnotami rozhoduje
vlastník (doplněno 4. 10. 2026, #353).

**Základ**

- **Užitek pro rodinu a uchazeče.** Kvůli nim web existuje a všechno ostatní z toho vyrůstá: na stránku, která
  nikomu nepomáhá, nikdo neodkáže, necituje ji a nevrátí se na ni.
- **Správnost a důvěryhodnost.** Jeden chybný údaj před rodiči stojí víc než většina přínosů. Kvůli důvěryhodnosti
  na nás odkazují kraje, komory a média a cituje nás AI.
- **Férovost vůči školám.** Školy, zřizovatelé i rodiny předpokládají, že školy ukazujeme podle dat. Každá změna
  toho, jak se škola zobrazuje (placená, partnerská, redakční), se posuzuje i očima škol, kterých se netýká.

**Dosah**

- **Návštěvnost v sezóně.** Rodiny vybírají a podávají přihlášky v zimě a výsledky čekají na jaře; únor měl
  6,4× víc návštěv než srpen. Rozhoduje, zda je zastihneme, když volí. _Signál: Matomo, Search Console._
- **Odkazy z důvěryhodných domén.** Kraje, komory, výstaviště, školy a média. Jsou nejsilnějším signálem pro
  vyhledávače a zároveň veřejným potvrzením, že nám někdo věří. _Signál: odkazující domény v Search Console._
- **Zmínky v médiích.** Přinášejí čtenáře, odkazy i důvěru. Novinář cituje zdroj, který mu dá ověřená data
  v převzatelném tvaru. _Signál: zmínky se zdrojem, stažení balíčků Pro novináře._
- **Citace v odpovědích AI.** Rodiny se čím dál častěji ptají AI asistentů; z nich už dnes přichází 8,4 % návštěv.
  Citovaným zdrojem se stává web s přesnými daty a čitelnou metodikou. _Signál: návštěvy z AI asistentů
  v Matomu, měsíční kontrola typických dotazů._

**Postavení na trhu**

- **Postavení mezi školskými servery.** Na důležité otázky rodin (přijímačky, obory, šance na přijetí) chceme
  být první volbou. Vyhráváme tím, co jinde chybí: daty o přijetí a jejich výkladem. _Signál: pozice a podíl
  zobrazení u klíčových dotazů v Search Console, srovnání s ostatními servery._
- **Rozšíření celého trhu.** Čím víc rodin vybírá školu podle dat místo doslechu, tím víc čtenářů mají všechny
  takové servery a nejdůvěryhodnější z nich nejvíc. Sem patří spolupráce se školami, výchovnými poradci
  a médii i otevřená data. _Signál: hledanost témat přijímaček, dosah přes partnery._

**Vztahy**

- **Školy a zřizovatelé.** Dávají nám data, opravují je v portálu a odkazují na nás. Zhoršený vztah se projeví
  na kvalitě dat i dosahu. _Signál: registrace a opravy v portálu, stížnosti._
- **Pořadatelé, partneři a novináři.** Jsou kanálem k rodinám a zdrojem dat. Vztah drží, dokud z něj mají
  užitek i oni. _Signál: odkazy, nahlášené akce, opakované citace._

**Hospodaření**

- **Příjmy.** Projekt by měl jednou pokrýt své náklady. Každý nápad na příjem se realisticky vyčíslí (kolik,
  od koho, za rok) a zváží proti dopadu na důvěryhodnost, férovost a vztahy.
- **Náklady a pozornost vlastníka.** Rozpočet AI a minuty vlastníka jsou nejvzácnější zdroj. Funkce, která
  každý rok potřebuje údržbu nebo obnovu dat, si to musí vydělat.

**Jak hodnoty používat**

- Každý nápad uvede, které hodnoty posílí a které oslabí, o kolik a podle jakého signálu. Odhad bez dat se
  označí jako předpoklad.
- Příklad: placené zvýraznění školy v seznamu. Kolik by realisticky přineslo (počet škol, cena, zájem)? Jak ho
  přijmou školy, které nezaplatí, zřizovatelé, pořadatelé a média? Klesne důvěra rodin v to, co jim web ukazuje?
- Signály slouží k orientaci a cílová čísla k nim nestanovujeme: jakmile se počet odkazů stane cílem, začne se
  honit počet a hodnota se ztratí.
- AI hodnoty vyčísluje a navrhuje, vlastník mezi nimi volí.

## Cíle k datu

| do | cíl | měřítko |
|---|---|---|
| 2027-01-15 | Kritéria přijetí 2027 na stránkách oborů, jakmile je školy zveřejní | podíl oborů s kritérii |
| 2027-02-01 | Simulátor a stránky oborů připravené na podávání přihlášek, včetně oborů bez JPZ (#244) | obory bez JPZ zobrazené; simulátor bez chyb v týdnu před termínem |
| 2027-05-14 | Výsledky 1. kola a nabídka 2. kola na webu do 24 h od zveřejnění | čas od zveřejnění zdroje po nasazení |
| … | | |

## Pořadí priorit

1. Správnost dat na stránkách škol a oborů (opravy mají přednost před novými funkcemi).
2. Obory bez JPZ a nedenní formy (#244).
3. Okruhy oborů ve městě (#277).
4. Provoz a náklady (log drain #234, cache, ISR).
5. …

## Co teď neděláme

- Nové velké stránky mimo priority výše, dokud nejsou hotové cíle k 2027-02-01.
- …

## Rozpočet

| položka | měsíčně | poznámka |
|---|---|---|
| **AI a výdaje celkem** | 3 000 Kč | tokeny, druhý klíč, placené služby a API |
| koš provoz | zbytek (nejméně 750 Kč) | rutina, opravy, hlášení, přehled; nezastavuje se |
| koš schválená práce | do 60 % (1 800 Kč) | drobná zadání, etapy, projekty |
| koš nápady | do 15 % (450 Kč) | náčrty nápadů AI; jeden nápad nejvýš 2 % (60 Kč) |
| limit karty na jednu platbu | 1 000 Kč | nad limit rozhoduje vlastník (H4) |

Rozpočet pozornosti: nejvýš 3 nápady AI na briefing (oddíl 17a návrhu).

## Zamrznutí

V kritických dnech se běžný vývoj nesloučí, jen incidentní opravy (oddíl 9c). Nastavuje se proměnnými
repozitáře `ZAMRZNUTI_OD` a `ZAMRZNUTI_DO` (jedno období najednou).

| od | do | proč |
|---|---|---|
| 2027-01-28 | 2027-02-02 | konec podávání přihlášek |
| 2027-04-10 | 2027-04-16 | jednotné přijímací zkoušky |
| 2027-05-12 | 2027-05-21 | výsledky 1. kola a přihlášky do 2. kola |

## Mimořádné pokyny

- …
