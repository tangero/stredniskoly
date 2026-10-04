# Vyhodnocení přínosu převodu výsledku testu

Zadání #328, první vyhodnocení podle kritérií přínosu (projekt #331). Stav 4. 10. 2026.

**Otázka:** má Simulátor přijímaček převádět výsledek cvičného testu z aplikace TAU na body roku pásem
(*Převedený výsledek testu*, slovník ukazatelů), nebo stačí výsledek porovnat s pásmy rovnou, jak to
dělají jiné weby? Převod je pro uživatele o krok složitější, přínos proto musí být doložený.

**Odpověď:** převod opravuje skutečnou chybu, ale menší, než je nejistota jednoho cvičného testu. Podle
předem daného pravidla se ponechá a po sezóně se vyhodnotí, jak ho lidé používají.

## Pravidlo (stanovené před výpočtem)

Rozhoduje podíl výsledků, u kterých převod změní skupinu oboru v Simulátoru (pod pásmem, v pásmu, nad
pásmem), počítaný na **oborech v dosahu**: převedený nebo nepřevedený výsledek leží nejvýš 10 bodů od
nejnižšího výsledku mezi přijatými. Obory daleko od výsledku uchazeče nejsou v rozhodování a podíl by jen
ředily; podíl přes všechny obory se uvádí pro úplnost.

| podíl změněných skupin | doporučení |
|---|---|
| pod 5 % | převod zjednodušit (skrýt do podrobností) |
| 5 až 20 % | ponechat a vyhodnotit použití po sezóně |
| nad 20 % | ukazovat jako výchozí s jednou větou vysvětlení |

Rozhoduje vlastník.

## 1. Jak velký rozdíl převod dělá

Skript `scripts/vyhodnoceni-prevodu-testu.mjs`, doklad `docs/podklady/vyhodnoceni-prevodu-testu.json`.
Převodní tabulky `public/prevod_testu_2024.json` (řádné termíny 2024), pásma Simulátoru
`public/simulator_pasma_2026.json`, skupinu počítá tatáž funkce jako Simulátor (`polohaVuciPasmu`).
Každý výsledek 0–100 bodů je vážený podílem řešitelů ostrého testu, kteří ho měli (z percentilů
převodní tabulky). Oba řádné termíny mají stejnou váhu, protože uchazeč si v TAU vybírá test sám.

| druh testu | obory s hranicí | průměrný posun | průměrný posun bez znaménka | posun aspoň 5 bodů | změna skupiny, obory v dosahu | změna skupiny, všechny obory |
|---|---|---|---|---|---|---|
| čtyřleté obory (9. třída) | 2 499 | +0,3 | 2,6 | 8,9 % | **17,1 %** | 6,4 % |
| šestiletá gymnázia (7. třída) | 68 | +2,3 | 2,8 | 15,6 % | **18,0 %** | 8,0 % |
| osmiletá gymnázia (5. třída) | 263 | −2,4 | 2,5 | 13,7 % | **15,2 %** | 6,7 % |

Posun záleží na tom, **který test** si uchazeč vybral. U čtyřletých oborů je 1. řádný termín 2024
proti stupnici roku 2026 o 2,7 bodu těžší (50 bodů → 53), 2. řádný termín o 2,1 bodu lehčí
(50 → 48, 80 → 75). V průměru přes oba termíny se posuny skoro vyruší, jednotlivý uchazeč ale píše
jen jeden test a jeho chyba se neruší. Bez převodu by se tedy u jednoho oboru z šesti v dosahu
uchazeč zařadil do jiné skupiny jen podle toho, kterou variantu testu v TAU otevřel.

**Podle pravidla: 15 až 18 %, tedy ponechat a vyhodnotit použití po sezóně.**

## 2. Je převod správný

Skript `scripts/vyhodnoceni-prevodu-testu-terminy.py`, doklad
`docs/podklady/vyhodnoceni-prevodu-testu-terminy.json`. Položková data JPZ 2024 čtyřletých oborů
(data.cermat.cz, necommitují se): 85 619 uchazečů psalo oba řádné termíny, identifikátor je v obou
stejný (korelace součtů 0,93). Převodní tabulka 1. termín → 2. termín vznikla z uchazečů se sudým
identifikátorem, ověřuje se na uchazečích s lichým, aby převod nebyl hodnocen na datech, ze kterých vznikl.

| odhad výsledku ve druhém termínu | průměrná chyba | průměrná chyba bez znaménka | RMSE | chyba nad 5 bodů |
|---|---|---|---|---|
| 1. → 2. termín, bez převodu | +4,4 | 7,3 | 9,2 | 55 % |
| 1. → 2. termín, s převodem | 0,0 | 6,4 | 8,2 | 48 % |
| 2. → 1. termín, bez převodu | −4,4 | 7,3 | 9,2 | 55 % |
| 2. → 1. termín, s převodem | 0,0 | 6,0 | 7,6 | 45 % |

Převod odstraní soustavnou chybu úplně a průměrnou chybu sníží o 13 až 18 %. Nejvíc pomáhá u
výsledků 50 až 70 bodů (chyba 8,2 → 6,2 a 6,6) a nad 70 bodů (8,7 → 6,0 a 6,1 → 5,2), u výsledků
pod 30 bodů skoro vůbec (5,4 → 5,6 a 6,5 → 6,1).

**Co to znamená pro Simulátor:** i s převodem se týž uchazeč ve dvou testech liší v průměru o 6 bodů.
Nejistota jednoho cvičného testu je větší než chyba, kterou převod opravuje. Simulátor už u více testů
řadí podle nejhoršího; doporučení zadat aspoň dva testy by pomohlo víc než samotný převod. To je
námět na samostatné zadání, ne součást tohoto vyhodnocení.

## Co analýza neříká

- **Zda se uchazeči s převodem lépe rozhodli.** Návštěvníka webu nespojíme s výsledkem přijímacího
  řízení; přínos pro rozhodnutí zůstává předpokladem.
- **Zda převod lidé používají a rozumí mu.** Simulátor zatím do Matomu neposílá žádné události (#326);
  vyhodnocení použití po sezóně je bez nich nemožné.
- **Testy 2017 až 2023 v TAU.** Rozdělení výsledků máme jen pro 2024, převod se pro starší testy nedělá.
- **Rozdíl termínů není jen obtížnost.** Druhý řádný termín je druhý pokus na jiné škole; převod připíše
  obtížnosti i vliv pořadí. U cvičného testu v TAU pořadí nehraje roli, část posunu (nejvýš 4,4 bodu)
  proto může být nadhodnocená.
- **Váhy výsledků** jsou rozdělení ostrých řešitelů 2024, ne uživatelů TAU, kteří mohou být silnější
  nebo slabší než celý ročník.
- Ověření správnosti (oddíl 2) je jen pro čtyřleté obory; položková data víceletých gymnázií se
  pro tuto analýzu nestahovala.

## Poznámka ke slovníku pojmů

Slovník pojmů žádá u převedeného výsledku výhradu, že „spíš nadhodnocuje“. Pokud se výhrada týká směru
převodu, platí jen pro část testů: 1. řádný termín čtyřletých oborů a 1. termín šestiletých gymnázií
převod zvyšuje, 2. řádný termín čtyřletých oborů a oba termíny osmiletých gymnázií snižuje (oddíl 1).
Pokud se týká podmínek cvičného testu doma, tato analýza o ní nic neříká. Ověřit a případně upravit
je mimo rozsah tohoto zadání.

## Reprodukce

```bash
node --experimental-strip-types scripts/vyhodnoceni-prevodu-testu.mjs
# položková data: data.cermat.cz/files/JPZ-polozkova-data/2024/Polozkova_data/ do data/
python3 scripts/vyhodnoceni-prevodu-testu-terminy.py   # asi 2 minuty
```
