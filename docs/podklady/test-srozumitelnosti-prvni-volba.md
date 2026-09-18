# Test srozumitelnosti: podíl přijatých na první volbu

18. 9. 2026 · Podklad k dávce D3 z [využití nepoužitých dat](../navrh-vyuziti-nepouzitych-dat-2027.md). **Test se provádí dřív, než se ukazatel zapíše do slovníku a než se napíše kód.**

## Proč se to testuje

[Vrstvy stránky oboru](../vrstvy-stranky-oboru-2027.md) v1.4 zavrhly větu „28 z 30 přijatých si obor dalo jako první volbu“ s odůvodněním, že ji čtenář přečte jako „první volba pomáhá se dostat“. To by bylo nepravdivé: pořadí na přihlášce šanci na přijetí nemění a míru přijetí podle priority z těchto dat spočítat nelze, protože kdo je přijat na vyšší prioritu, na nižší se už nevyhodnocuje.

Návrh D3 na to odpovídá **přesunem významu**: údaj neříká, jak těžké je se dostat, ale **s kým se dítě ve třídě potká**. Celý ukazatel stojí a padá s tím, jestli tohle čtení u lidí skutečně vznikne. Proto se netestuje formulace „pro jistotu“, ale rozhoduje se testem, zda ukazatel vůbec zavést.

Oponentura (bod S3) k tomu dodala pravidlo, které tu platí: **test, jehož negativní výsledek by stál proti už odvedené práci, není test.** Proto se nejdřív testuje a teprve potom píše kód.

## Co se testuje: finální znění

Testuje se text v té podobě, v jaké by šel na web, ne popis záměru. Čísla jsou skutečná, ročník 2026, Gymnázium J. S. Machara.

### Místo 1 — stránka oboru, blok „Jak se tu studuje“

> **Spolužáci.** Z 30 přijatých si tenhle obor 28 psalo jako 1. volbu. Osmileté gymnázium.
>
> Pořadí na přihlášce šanci na přijetí nemění, škola řadí jen podle svých kritérií.

### Místo 2 — stránka školy, tři obory jedné školy pod sebou

> **Gymnázium, osmileté** — z 30 přijatých si obor 28 psalo jako 1. volbu
> **Gymnázium, čtyřleté** — z 30 přijatých si obor 27 psalo jako 1. volbu
> **Technické lyceum, čtyřleté** — z 23 přijatých si obor 15 psalo jako 1. volbu
>
> Pořadí na přihlášce šanci na přijetí nemění, škola řadí jen podle svých kritérií.

Obě místa musí projít. Druhé místo doplnila oponentura (bod N3) a má pro to důvod: celoplošně vysvětluje typ studia jen 8,3 % rozptylu, ale u téhle konkrétní školy je mezera mediánů mezi gymnáziem a lyceem 0,14, tedy na úrovni rozptylu uvnitř skupiny. Právě u smíšené školy tedy může typ vysvětlovat podstatnou část rozdílu mezi dvěma kartami.

## Koho se ptát

**Tři lidé**, kteří nepracují na projektu a neznají tenhle návrh. Ideálně rodič uchazeče nebo uchazeč sám; stačí ale kdokoli, kdo přijímačky nedělá profesionálně. Každý dostane obě místa, v tomhle pořadí.

Nic se dopředu nevysvětluje. Žádné „tohle je o složení třídy“ — přesně to se testuje.

## Otázky

**U místa 1** (nejdřív otevřená, teprve pak kontrolní):

1. „Co ti ta věta říká o téhle škole?“
2. „Kdyby sis tenhle obor napsal na přihlášce až jako druhý v pořadí, změnilo by to tvoji šanci, že tě vezmou?“

**U místa 2:**

3. „Co ti ta tři čísla říkají o rozdílu mezi těmi obory?“
4. „Který z těch tří oborů je podle tebe lepší?“

Odpovědi se zapisují doslova, ne shrnutě. U otázky 2 a 4 se zaznamenává i to, zda člověk váhal.

## Kritérium, rozhodnuté předem

Odpověď je **chybným čtením**, když:

- u otázky 1 nebo 2 z ní plyne, že pořadí na přihlášce ovlivňuje přijetí („vyplatí se dát si ho první“, „když ho dám druhý, mám menší šanci“, i ve formě váhání „asi jo“);
- u otázky 3 nebo 4 z ní plyne pořadí kvality oborů („lyceum je horší“, „gymnázium je lepší škola“) opřené o tato čísla.

Výsledek:

| Chybná čtení ze šesti odpovědí | Závěr |
|---|---|
| žádné | ukazatel se zavede: zápis do slovníku, pak kód |
| jedno | znění se přepíše a test se zopakuje na **třech nových lidech** |
| dvě a víc | **ukazatel se nezavádí**, do slovníku se nic nepíše |

Kritérium se po zjištění výsledku nemění. Když test propadne, zapíše se to do návrhu jako zamítnutí s důvodem — zamítnutí je platný závěr.

## Záznamový list

| Člověk | Role | Otázka 1 | Otázka 2 | Otázka 3 | Otázka 4 | Chybná čtení |
|---|---|---|---|---|---|---|
| 1 | | | | | | |
| 2 | | | | | | |
| 3 | | | | | | |

## Co bude následovat, když test projde

1. Zápis ukazatele **Podíl přijatých na první volbu** do [slovníku ukazatelů](../slovnik-ukazatelu.md) a pojmu **psali si obor jako 1. volbu** do [slovníku pojmů](../slovnik-pojmu.md); znění obojího je připravené v návrhu, oddíly 5 a 6.
2. Zobrazení v bloku „Jak se tu studuje“ na stránce oboru (`src/components/obor/ProfilOboru.tsx`), se zdrojem v `souhrny_kolo1.json` a s ročníkem z registru.
3. Úklid staré cesty: záložní větev stránky oboru (`StatsTab`) dnes kreslí tabulku priorit z katalogu, která se u 315 nabídek rozchází s oficiálními souhrny, a nese mrtvou větu, že přijaté podle priority nezobrazujeme. Obojí zmizí.

**Poznámka k bodu 3:** návrh mluví o převedení `StatsTab` na souhrny, ale od té doby se stránka oboru přepsala. Hlavní cesta je dnes `ProfilOboru`; `StatsTab` je jen záložní větev pro obory, pro které nový profil nevznikne. Ukazatel patří do nového profilu a u záložní větve se rozhodne zvlášť, zda ji opravit, nebo zrušit.

**Pravidla zobrazení** platí bez ohledu na výsledek testu: nikdy v bloku o obtížnosti přijetí, nikdy jako poměr vedle počtu přijatých, vždy s pojmenovaným typem studia, vždy s větou o pořadí na přihlášce, práh 10 přijatých.
