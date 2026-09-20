# Pátá oponentura školních novinek z RSS/Atom

**Verze oponentury:** 1.4 – páté kolo  
**Posuzovaný návrh:** [verze 1.4](skolske-novinky-rss-2027.md), včetně vypořádání čtvrté oponentury  
**Předchozí hodnocení:** [oponentura verze 1.3](oponentura-skolske-novinky-rss-2027-v1.3.md)  
**Datum:** 20. 9. 2026  
**Závazná priorita:** autonomní provoz bez lidského schvalování jednotlivých zpráv.

## 1. Stanovisko

**Zahájení autonomního sběru a zveřejňování původních titulků a odkazů nadále doporučuji. Tvrzení, že všechny kódové překážky jsou odstraněny a termínové karty čekají už jen na zkoušku cache, však kontrola nepotvrdila.** Tentokrát jsem ověřoval přímo konečný výstup `rozhodni_publikaci`, nikoli pouze dílčí klasifikaci.

Zůstávají tři konkrétní problémy vazby mezi článkem, událostí a termínem: nepotvrzený termín může vytvořit pozvánku, datum jiné akce může být přidáno mezi DOD a článek rušící jeden termín může potlačit i platný náhradní termín. Funkce navíc neověřuje aktuální čas a vrací e-mailovou způsobilost i pro proběhlou událost. Kontrakt cache omezuje jednu vrstvu ukládání, ale sám nezaručuje maximální stáří zobrazeného obsahu 60 sekund.

Nežádám ruční moderaci ani změnu základní architektury. Doporučuji dokončit automatické rozhodování pro konkrétní událost, včetně bezpečného přechodu na neutrální odkaz.

## 2. Ověření a jeho rozsah

Spuštěno:

```sh
python3 -S scripts/rss-klasifikace-mereni.py --offline
python3 -S -m unittest discover -s tests -p 'test_rss_klasifikace.py'
```

Oba příkazy uspěly. Potvrzuji:

- **47/47 RSS testů** bez instalovaných balíčků;
- 624 položek v okně, **76 zásahů**, 38 škol;
- témata **102/109**, vysoká jistota **60/60 párů = 51 položek**;
- konečné rozhodnutí: **3 termínové karty, 47 karet bez termínu, 26 odkazů**;
- proti dodaným referencím pozvánek: zobrazení **10/11**, termíny **10/11**, stav **11/11**;
- opravený import `requests` i párování referencí přes odkaz a třídu.

Celé sady Python 197/197 a JS 217/217 jsem v tomto kole znovu nespouštěl; jde o autorovo uvedené ověření. Zopakoval jsem testy relevantní pro změnu a doplnil cílené offline zkoušky konečné funkce. Produkční API, cache ani nasazení jsem neověřoval. V návrhu zůstávají předmětem implementace.

Zdroje: [pravidla a publikační funkce](../scripts/rss-klasifikace-mereni.py), [RSS testy](../tests/test_rss_klasifikace.py), [reference](../data/sondy/rss-klasifikace-reference.json), [vzorek](../data/sondy/rss-klasifikace-vzorek80.json), [doplnění](../data/sondy/rss-klasifikace-vzorek80-doplneni.json). Návrh ani kód nebyly při hodnocení měněny.

SHA-256 hodnocených podkladů:

```text
docs/skolske-novinky-rss-2027.md
b1048c7d175ff1a7d5f5aa2ee2c81d85046cc85f3ee34ef561b26d52851707c0

scripts/rss-klasifikace-mereni.py
27f2097c4cb146657196e39d84b37686265b673f04b072b17027c833ddfe7f54

data/sondy/rss-klasifikace-reference.json
c2872d0cc2d6c5dc6cef2c9eadd8c3f04e270230072ee6929eafe0550351c8a4
```

## 3. Vypořádání F1–F6

| Bod | Výsledek kontroly |
| --- | --- |
| F1 Stav po klauzulích | Původní příklady opraveny. Konečná funkce ale přijímá neurčené konání a globálním stavem článku přebíjí stavy termínů; viz P1/P2. |
| F2 Role data | Původní obrácené popisky se již rozlišují. Dědění role akce z předchozích klauzulí může stále přiřadit nesouvisející datum; viz P1. |
| F3 Vylučovače | Konkrétní sportovní gymnázium i smíšená SŠ/VOŠ jsou opravené a testované. Tento nález uzavírám. |
| F4 Offline režim a identity | Obě konkrétní opravy potvrzuji. Offline příkaz funguje i s `-S`. Tento nález uzavírám. |
| F5 Konečné rozhodnutí a benchmark | Jedna publikační funkce a výstupní reference jsou skutečným pokrokem. Není však dokončena časová platnost ani ověření všech režimů výstupu; viz P3/P5. |
| F6 Cache | Oddělené API odstraňuje závislost bloku na ISR HTML. Limit 60 sekund ale ještě není úplným koncovým kontraktem; viz P4. |

## 4. Zbývající problémy

### P1 — Termínová karta stále vzniká bez doloženého konání nebo pro jinou událost

**Závažnost: před automatickými termínovými kartami a e-maily.**

Reprodukce přímo přes `rozhodni_publikaci`:

| Vstup | Skutečný výstup |
| --- | --- |
| `Termín DOD pro uchazeče 9. 12. 2026 zatím není potvrzen` | `karta_terminu`, termín `2026-12-09`, `email: true`, důvod „vazba událost–termín–konání doložena“ |
| Titulek `Zveme uchazeče na den otevřených dveří 9. 12. 2026.`; popis `Soutěž začne 12. 12. 2026.` | `karta_terminu`, termíny `2026-12-09` **i** `2026-12-12`, `email: true` |

V obou případech má vadně připuštěný termín `stav_klauzule: neurceno`. Funkce ho přijme, protože kontroluje pouze, zda stav **není** v seznamu blokujících stavů; nevyžaduje pozitivní doložení konání. `urci_stav` navíc při absenci rozpoznaných problémů stále vrací `oznameno`.

Ve druhém případě `_role_data` hledá akční signál zpět přes předchozí klauzule. „Soutěž začne“ vlastní rozpoznanou roli nemá, takže převezme DOD z předchozí věty. Kalendářně správný den tak získá nesprávný význam.

**Doporučení:** publikační podmínka musí být pozitivní: doložené konání konkrétní události v daném termínu, nikoli pouhá absence rozpoznaného zákazu. Dědění kontextu připustit u identifikovaného seznamu termínů jedné akce, nikoli přes libovolnou větu s novým předmětem. Neurčené konání či role znamená automaticky odkaz. Neřešit pouze doplněním řetězce „není potvrzen“; příčinou je podmínka přijímající neznámý stav jako dostatečný.

### P2 — Zrušení jednoho termínu stále potlačí platný náhradní termín

**Závažnost: správnost deklarovaného chování a záchyt oprav.**

Vstup:

```text
Titulek: DOD pro uchazeče
Popis: Den otevřených dveří 9. 12. 2026 se nekoná.
       Náhradní prohlídka proběhne 13. 1. 2027.
```

Extraktor správně vrátí první datum jako `zruseno` a druhé jako `kona`. **Konečné rozhodnutí však vrátí `odkaz`, prázdné termíny a `email: false`**, protože celkový stav článku je `nejiste` a funkce skončí ještě před posouzením jednotlivých dat.

Test pojmenovaný `test_zruseni_jednoho_terminu_nezrusi_ostatni` kontroluje pouze `extrahuj_data_akce`, nikoli `rozhodni_publikaci`. Jeho průchod proto nedokládá výrok návrhu o zachování ostatních termínů ve výsledném zobrazení.

**Doporučení:** u termínových článků rozhodovat po událostech/termínech a až potom skládat výstup. Platný náhradní termín nemá zmizet jen kvůli globálnímu smíšenému stavu. Pokud je cílem pilotu při jakékoli smíšené zprávě pouze odkaz, je to bezpečná alternativa, ale musí se tak změnit specifikace a měřit ztráta zvýraznění. Nelze současně deklarovat zachování platného termínu a testovat pouze pomocný extraktor.

### P3 — „Konečné“ rozhodnutí nemá současný čas ani úplnou provozní způsobilost

**Závažnost: před nasazením odvozených karet.**

Položka `Zveme uchazeče na den otevřených dveří 9. 12. 2025` s publikací 1. 9. 2025 vrací i při této kontrole 20. 9. 2026:

```text
zobrazeni: karta_terminu
terminy: [2025-12-09]
email: true
```

Funkce porovnává termín pouze s publikací článku. Nemá vstup `nyni`, neověřuje expiraci a v tomto rozhodnutí nepoužívá současné datum. Jde o legitimní postup pro historické vyhodnocení k okamžiku publikace, ale nikoli o úplné rozhodnutí, co se smí zobrazit návštěvníkovi dnes. Její označení za jedinou finální publikační funkci proto předbíhá skutečný kontrakt.

Podobně `email: true` nyní vychází ze statického seznamu tříd `TRIDY_POVOLENE_EMAILEM`; není dokladem, že daná třída už prošla budoucím sezónním benchmarkem. Nejde o zjištění, že se nějaký e-mail skutečně odeslal – odesílač této nové funkce ještě nebyl nasazen ani ověřen.

**Doporučení:** do finálního rozhodnutí zahrnout explicitní čas hodnocení, aktuální stav události, platnost a provozní povolení třídy. Historický benchmark může používat zmrazený čas, provoz aktuální čas. Nebo výstup přejmenovat na návrh zobrazení a přiznat další povinnou finální kontrolu, kterou je také nutné testovat. Nestačí měřit mezivýsledek a nazvat jej konečným.

U karet bez termínu platí totéž pro uzávěrku kola a stáří sdělení o místech. Tato připomínka nepožaduje nový sběr dat ani ruční schvalování; jde o uplatnění pravidel platnosti, která návrh již obsahuje.

### P4 — `s-maxage=60` není samo o sobě limit stáří toho, co vidí čtenář

**Závažnost: doplnit kontrakt před přejímací zkouškou API.**

Oddělené API je přijatelné řešení. Hlavička `s-maxage=60` ale stanoví dobu čerstvosti odpovědi ve sdílené cache. Vercel rozlišuje CDN a prohlížečovou cache a `s-maxage` před předáním do prohlížeče odstraňuje. [Dokumentace Vercelu](https://vercel.com/docs/caching/cache-control-headers)

Z toho plynou tři mezery v uvedeném příslibu:

1. **API může vrátit už stará data.** Oddíly 3.6/3.8 nadále popisují `unstable_cache` a DB cache v řádu minut. Šedesátisekundová CDN cache sama nezaručí, že jí předaný výsledek odpovídá DB nanejvýš před 60 sekundami.
2. **Již otevřený blok se sám neobnoví.** HTTP hlavička nespouští další požadavek ani nemaže React stav. Bez obnovy nebo expirace v klientu může uživatel vidět skrytou položku po delší dobu. Je v pořádku garantovat pouze nová načtení, ale dokument musí takto omezit současnou formulaci „maximální stáří zobrazených novinek“.
3. **Čerstvá CDN odpověď může při výpadku DB ještě platit.** Je-li tolerance 60 sekund záměrná, přejímací test nemůže vyžadovat, aby hned následující návštěva vždy zobrazila prázdný blok. Musí rozlišit stav před vypršením a po vypršení limitu a skutečnou HTTP chybu.

**Doporučení:** jasně určit, zda garance platí pro nová načtení nebo také otevřené stránky. Pro jednoduchý pilot je rozumné garantovat nové načtení, zvolit jedinou omezenou cache pro živé API a chyby vracet bez cachování. Pokud má zůstat více vrstev, stanovit společný limit podle času ověření dat, nikoli jen TTL každé vrstvy. Přejímací zkoušku provést před i po hranici 60 sekund a podle zvolené garance i na otevřené stránce.

„Novinky jsou cizí odkazy, takže vynechání z SSR nic nestojí“ je také příliš kategorické: klientské načítání přidá požadavek a závislost na JavaScriptu. Pro pilot to může být přijatelná cena jednoduchosti; není to důvod API odmítnout, pouze tento kompromis přesně popsat.

### P5 — Nové metriky a práh benchmarku jsou lepší, ale potřebují přesnější výklad

**Důležitost: interpretace důkazů; bez požadavku na denní lidskou práci.**

Výsledek 10/11 je shoda na 11 již vybraných DOD položkách, zahrnující i správná rozhodnutí nezobrazit termín. Není to deset ověřených termínových karet; aktuální výstup obsahuje jen tři. Je správné, že skript výslovně hlásí absenci finální reference pro ostatní třídy. Z toho ovšem neplyne, že správnost celého publikačního výstupu je již dostatečně ověřena.

Také „75 → 76 zásahů, 106 → 109 párů“ neznamená tři nové články. Ve výpisu jde o **jeden nový zasažený článek a tři dodatečné páry třída × položka**. Normalizace entit je přínosná; její dopad je potřeba popsat správnou jednotkou. Úvodní tabulka návrhu navíc stále obsahuje staré hodnoty 75, 99/106 a 44 u přijímacího řízení, zatímco nový výpis má 76, 102/109 a 47.

Výpočet `0,9^29 ≈ 4,7 %` je správný pro předem určený test 29 nezávislých položek se stejnou pravděpodobností úspěchu. Není to univerzální záruka pro soubor převážně z jednoho CMS nebo jedné školy, opakované ladění nad benchmarkem ani opakování výběru, dokud se nepodaří 29 bezchybných případů. Práh se současně mění z důkazu 97% přesnosti na slabší důkaz vůči 90% přesnosti – text to nově přiznává, což oceňuji.

**Doporučení:** zmrazit výběr a pravidla před hodnocením, zastoupit více škol a typů zdrojů, nezaměňovat páry tříd za nezávislé články. Po chybě a úpravě pravidel dosavadní benchmark přechází do vývojového vzorku; přejímku ověřit na dosud nepoužité části. Je to jednorázové zajištění kvality automatizace, nikoli schvalování provozních novinek. Úplnost vyžaduje další referenční základ proti školním stránkám a tato námitka zůstává platná.

## 5. Konkrétní přejímací podmínky před termínovými kartami

| Scénář | Očekávané koncové chování |
| --- | --- |
| Termín výslovně není potvrzen | Pouze původní odkaz, žádná budoucí pozvánka ani běžný pozvánkový e-mail. |
| Článek obsahuje DOD a jinou akci | Mezi termíny DOD se nesmí dostat datum jiné akce. |
| Jeden termín je zrušen, náhradní výslovně potvrzen | Platný termín se zachová, nebo se dokumentovaně použije konzervativní odkaz; test musí ověřovat konečnou funkci. |
| DOD už proběhl | Nesmí vzniknout budoucí termínová karta ani nový pozvánkový e-mail. |
| Třída nemá provozní povolení po benchmarku | Zůstává na webu bez skutečné e-mailové způsobilosti. |
| Vypnutí položky, API cache a výpadek DB | Přesně definovaný časový limit pro nové načtení, případně i otevřenou stránku; chyba se nesmí vydávat za nulový počet novinek. |

Pro tyto scénáře není potřeba vymýšlet jinou platformu ani přidávat moderátora. Je potřeba odstranit konkrétní mezery v automatickém rozhodnutí a testovat konečný výsledek.

## 6. Závěrečné doporučení

**Autonomní základ lze implementovat hned. Termínové karty ale zatím neblokuje pouze cache: stále je blokuje neověřené konání, chybná vazba data na událost a chybějící časová platnost v deklarovaném konečném rozhodnutí.** Opravy předchozích jednotlivých příkladů jsou skutečné a procházejí; neznamenají úplné vyřešení obecného problému.

Nejkratší cesta k nasazení je dokončit uvedené koncové podmínky, nikoli přidávat další vrstvy pravidel bez testu výsledku. Nejasné případy mají dál autonomně skončit u neutrálního odkazu. Sezónní benchmark zůstává samostatnou podmínkou e-mailů a skutečnou úplnost je nutné měřit proti zdrojovým školním stránkám.

## Historie

Tento soubor hodnotí návrh 1.4. Předchozí kola jsou zachována v [oponenturách 1.0](oponentura-skolske-novinky-rss-2027.md), [1.1](oponentura-skolske-novinky-rss-2027-v1.1.md), [1.2](oponentura-skolske-novinky-rss-2027-v1.2.md) a [1.3](oponentura-skolske-novinky-rss-2027-v1.3.md).
