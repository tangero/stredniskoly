# Druhá oponentura školních novinek z RSS/Atom

**Verze oponentury:** 1.1 – druhé kolo  
**Posuzovaná verze návrhu:** 1.1, včetně vypořádání v oddílu 8 a hodnocení oponentního návrhu v oddílu 9  
**Datum:** 19. 9. 2026  
**Návrh:** [skolske-novinky-rss-2027.md](skolske-novinky-rss-2027.md)  
**Předchozí hodnocení:** [oponentura návrhu 1.0](oponentura-skolske-novinky-rss-2027.md)

**Upřesnění zadavatele při druhém hodnocení:** hlavní důraz na autonomní provoz; zveřejňování nemá vyžadovat lidské schvalování. Toto upřesnění má přednost před doporučeními moderace v původní oponentuře i v návrhu 1.1.

## 1. Vlastní názor po vypořádání

**Verze 1.1 je podstatně lepší architektonický základ. Podporuji pilot RSS → Postgres → automatický seznam zpráv. Za uzavřenou specifikaci zvýrazněných termínů a školních e-mailů ji však zatím nepovažuji.** Nejsilnější zbývající námitka není frekvence stahování, ale rozpor mezi tvrzenou reprodukovatelností měření a skutečnými soubory, dále neúplná pravidla pro platnost, opravy a konflikty.

Přijímám argument, že původní plošný cíl 90 minut neměl dostatečnou empirickou oporu. Pro pilot souhlasím se dvěma kontrolami denně a cílem do 24 hodin. Jde o obhajitelný provozní kompromis, nikoli důkaz, že rychlejší informace nemůže mít čtenářskou hodnotu. Rychlejší kontroly bych podmínil výskytem konkrétních časově citlivých situací a měřením nákladů.

Podporuji využití existujícího Postgresu a odložení automatického parsování HTML/PDF do další fáze. Rozsah pilotu ale musí být výslovně „novinky ze sledovaných feedů“, nikoli úplný obraz aktuálních informací všech škol.

**Po upřesnění zadavatele nedoporučuji žádnou schvalovací frontu pro běžný provoz.** Nejistota se má řešit automatickým omezením interpretace: původní titulek a odkaz lze zveřejnit, aniž systém tvrdí konkrétní budoucí termín nebo dostupnost míst. U konfliktu zobrazí zdroje a rozpor, u podezřelého zdroje automaticky pozastaví jeho import či zvýraznění. Žádný z těchto stavů nesmí čekat na člověka, aby služba mohla pokračovat. E-maily se mají automaticky odesílat pouze podle předem ověřených pravidel; ostatní zprávy zůstanou na webu bez čekání na schválení.

## 2. Co bylo skutečně ověřeno

Proběhlo čtení návrhu a původní oponentury, kontrola tří nových měřicích skriptů, opravené sondy, přepočet uložených JSON, kontrola migračního endpointu portálu a dokumentace revalidace. Lokálně instalovaný Next.js má verzi 16.1.4. Nová plošná sonda ani přístup k produkční DB neproběhly. Návrh, měřicí skripty a provozní kód nebyly při oponentuře upravovány.

| Kontrola | Výsledek |
| --- | --- |
| Přepočet sondy | 1 093 škol, 531 s nalezeným feedem i po odfiltrování `comment` URL; 48,6 % odpovídá uloženým datům. |
| Uložený vzorek klasifikace | 80 záznamů: 75 s položkami, 5 s chybou `parse`. |
| Položky ve vzorku | 1 306 celkem; při časovém filtru měřicího skriptu 580 položek v okně, 66 s alespoň jednou třídou, 35 škol s alespoň jedním zásahem. |
| Ruční anotace | Položky mají strojové `tridy` a `vylouceno`; nejsou v nich dohledatelné nezávislé ruční referenční štítky či rozhodnutí o správnosti zásahu. |
| Syntaxe skriptů | Měření a inspekce syntakticky projdou; tolerantní parser má `SyntaxError` na řádku 2. |
| Rozhraní stahování | Sonda nyní vrací trojici; měření a tolerantní parser stále očekávají dvojici. Offline reprodukce zpracování s platnou návratovou trojicí končí `ValueError`. |
| Ukázky klasifikace | „Den otevřených dveří krajského úřadu“ → `dod`; „Volná místa nemáme“ → `volna_mista`; „Náhradní termín fotografování“ → `nahradni_termin`. |
| Ukázka data | Extraktor vrací pro `31. 2. 2027` hodnotu `2027-02-31`, tedy neexistující datum. |

Poslední dvě kontroly jsou syntetické příklady spuštěné nad funkcemi měřicího skriptu, nikoli nález těchto konkrétních chyb na produkčním webu. Dokládají hranice dodaných pravidel, ne počet chyb v reálných datech.

Zdroje: [sonda](../scripts/sonda-rss-webu-skol.py), [data sondy](../data/sondy/rss-webu-skol-20260919.json), [měření](../scripts/rss-klasifikace-mereni.py), [inspekce](../scripts/rss-klasifikace-inspekce.py), [tolerantní parser](../scripts/rss-klasifikace-tolerantni-parser.py), [vzorek](../data/sondy/rss-klasifikace-vzorek80.json).

### Identifikace hodnocených podkladů

Odkazovaný návrh i data se mohou dále změnit. Pro jednoznačné určení tohoto hodnocení uvádím SHA-256 obsahu při kontrole:

```text
docs/skolske-novinky-rss-2027.md
4091ead71eda1e1f62110d3e64d158a7b13f3be0bdbd009df0fd0d27ba799bc4

data/sondy/rss-webu-skol-20260919.json
9c51d2d1cc6f235bbc507eef3efa0604842f7a062452d863791faec3e7e38d31

data/sondy/rss-klasifikace-vzorek80.json
27c888195c8a3bbd98e77c3cfc1141eb75976f4a20e6c5c5843d3d73950213c4
```

## 3. Kontrola vypořádání bod po bodu

„Vyřešeno“ zde znamená vyřešeno v návrhu, nikoli ověřenou implementaci.

| Původní bod | Hodnocení vypořádání | Argument |
| --- | --- | --- |
| 3.1 Ruční PR | **Vyřešeno architektonicky** | Přímý zápis položek do DB odstraňuje hlavní neomezené čekání. Nouzové vypínání přes PR je ale samostatná provozní mezera. |
| 3.2 ISR a JSON | **Převážně vyřešeno** | DB a cílená revalidace jsou správný směr. Je třeba konkretizovat datovou cache, opakování neúspěšné invalidace a podmínky tvrzení o prvním návštěvníkovi. |
| 3.3 Sonda a pokrytí | **Částečně vyřešeno** | Potvrzuji 531 a opravu relativních odkazů. Nový fallback pro neplatné deklarace však stále používá původní doménu. Sniffing není úplná validace a uložený vzorek nedokládá 80/80 úspěšných parsování. |
| 3.4 Klasifikace | **Nevypořádáno důkazně** | Přiznání omezení je správné, ale dodané skripty nejsou v této podobě spustitelným reprodukčním řetězcem a vzorek neobsahuje doložené ruční reference. |
| 3.5 Platnost | **Částečně vyřešeno** | Rozdělení podle třídy opravuje původní 60denní chybu. Chybí bezdatové DOD, uzavřená kola, více termínů a vazba konkrétního článku na období. |
| 3.6 Datum | **Částečně vyřešeno** | Bezpečný fallback je správný. Samotná klasifikace „pozvánka“ však nedodá chybějící rok a explicitní rok neprokazuje význam nalezeného data. |
| 3.7 Opravy | **Částečně vyřešeno** | Otisk pozná změnu, nikoli její význam. Verze obsahující jen otisk neumožní rekonstruovat staré tvrzení; fallback identita s titulkem se při opravě titulku mění. |
| 3.8 Zdraví zdroje | **Vyřešeno koncepčně** | Návrh odděluje stáří obsahu, dostupnost a obnovu zdroje. Zbývá provozně popsat 304, dostupnost posledních dobrých dat a dohled. |
| 3.9 Plánovač | **Přijímám pro pilot** | Actions 2× denně je přiměřená výchozí volba. Absolutní tvrzení o nulové hodnotě rychlejších zpráv není podložené. |
| 3.10 Objem zpráv | **Převážně vyřešeno** | Návrh správně omezuje závěry z kluzného okna. Zbylé konkrétní sezónní odhady frekvence ale nejsou nově doložené. |
| 3.11 Konflikty | **Částečně vyřešeno** | Konfliktní cesta už existuje, ale bezpodmínečná přednost portálu může povýšit starý údaj nad novou opravu školy. Hash nerozliší opravu a další událost. |

## 4. Zásadní zbývající nálezy

### R1 — Reprodukovatelnost a naměřená přesnost zatím nejsou doloženy

**Závažnost: blokuje tvrzení o ověřené klasifikaci a automatické školní e-maily; neblokuje sběr a neutrální seznam titulků.**

Návrh uvádí 617 položek, 74 ověřených zásahů a parsování 80/80. Uložený soubor obsahuje 580 položek v okně, 66 zásahů a pět chyb parseru. Rozdíl mohl vzniknout následným opraveným parsováním, ale jeho strukturovaný výsledek není součástí vzorku. Nelze proto potvrdit ani vyvrátit dřívější ruční měření; lze konstatovat, že dodané soubory deklarovaná čísla nereprodukují.

Konkrétní technické překážky:

1. `stahni()` vrací `(status, text, finalni_url)`, ale `rss-klasifikace-mereni.py:149` rozbaluje `status, text`. Offline zkouška skutečné funkce `zpracuj` s náhradou síťového volání vracející touto funkcí deklarovanou trojici skončila `ValueError: too many values to unpack (expected 2, got 3)`.
2. `rss-klasifikace-tolerantni-parser.py:2` obsahuje neplatný import `from pathlib import Path, xml.etree.ElementTree as ET, ...`. Skript nelze ani syntakticky načíst. Navíc také očekává dvojici ze `stahni`.
3. Měření zapisuje do `/tmp/rss_mereni.json`, další skripty z něj čtou; není připravena offline cesta nad zveřejněným vzorkem s výpočtem přesnosti proti ručním štítkům.
4. Tolerantní skript používá jinou sadu pravidel, jen tiskne výsledky a nedoplňuje opravené položky do společného výstupu.
5. Pevný random seed nestačí k opakovatelnému výběru: pořadí sondovaných škol vzniká dokončováním paralelních úloh a aktuální sonda už má jiné kandidáty. Chybí stabilní seřazení a zmrazený manifest výběru.

**Požadovaná úprava:** zveřejnit konečný zmrazený vzorek, oddělit strojové predikce a ruční reference, připojit verzi pravidel a jeden offline příkaz reprodukující tabulku. Do té doby změnit nadpis oddílu 2 na „Klíčová slova jako výchozí metoda; přesnost a úplnost k ověření“. Přidání skriptů je užitečný krok, ale není totožné s reprodukovatelným měřením.

### R2 — Pravidla měření neodpovídají deklarované vysoké jistotě

**Závažnost: blokuje povýšení těchto pravidel na ověřené přijímací karty.**

Měřicí `klasifikuj()` vrací seznam tříd, nikoli úrovně jistoty. U DOD nemá kontextové výluky, u náhradního termínu nevyžaduje přijímací kontext. Kategorie připojuje do stejného textu jako titulek a popis, takže mohou být samostatným spouštěčem, ačkoli návrh říká opak. Třída `vysledky_prijm` zahrnuje také `jpz` nebo obecné termíny jednotné zkoušky; počty této třídy tedy samy neměří přesnost rozpoznání výsledků.

Syntetické příklady v oddílu 2 to potvrzují. U „Volná místa nemáme“ může být téma volných míst klasifikováno správně, ale takový článek nesmí být interpretován jako nabídka volných míst. Je nutné odlišit téma článku od kladného či záporného tvrzení o stavu.

**Požadovaná úprava:** provázat měření s konkrétní verzí skutečně navržených pravidel pro vysokou jistotu; oddělit téma, význam sdělení a rozhodnutí o zobrazení. Doplnit případy zrušení, negace, cizího pořadatele, pouhé reportáže a dat z kategorií. U e-mailů definovat měřitelnou podmínku spuštění, ne pouze „po měsíci“ či „po ověření“ bez kritéria.

### R3 — Platnost podle třídy je pokrok, ale nenahrazuje stav události

**Závažnost: před zveřejněním výrazných termínových karet.**

- DOD bez extrahovaného data je v návrhu přípustné, ale není určeno, jak vypočítat jeho konec platnosti.
- U více termínů nestačí čekat na poslední termín: po prosincové akci má karta zvýraznit lednovou a prosincovou označit jako proběhlou nebo skrýt z budoucích termínů.
- Tři dny po DOD může článek zůstat novinkou, ale nesmí být dál zobrazován jako budoucí pozvánka.
- Sedm dní u volných míst je redakční limit stáří, nikoli potvrzení, že místa stále existují.
- Vyhlášení kola nemá být aktivní výzvou až do konce přijímacího období, jestliže jeho uzávěrka už uplynula.
- Schéma položky neobsahuje příslušné přijímací období. Nelze automaticky přiřadit aktuálně zobrazený ročník článku o minulém řízení.

Pravidlo „explicitní rok **nebo** pozvánka“ navíc ponechává neurčené odvození roku u pozvánek. Článek může uvádět i datum registrace nebo připomínat minulou akci. Explicitní rok sám neidentifikuje datum DOD. Ukázka s 31. únorem dokládá, že současný extraktor neověřuje ani kalendářní platnost.

**Požadovaná úprava:** oddělit stáří článku, stav informace a jednotlivé termíny. Pro pilot lze udělat jednoduché bezpečné pravidlo: nejasné datum či období → pouze původní titulek, bez odvozené budoucí události. „Naposledy ověřen zdroj“ nesmí znamenat „škola potvrdila, že stále zbývají volná místa“.

### R4 — Hash a přednost portálu neřeší význam opravy

**Závažnost: před automatickým řešením konfliktů a opravnými e-maily.**

Otisk obsahu říká pouze, že se obsah změnil. Stejně se změní při opravě překlepu, doplnění fotografie, přidání dalšího DOD i při zrušení původního termínu. Nelze podle samotného otisku rozhodnout mezi „další termín“ a „oprava“, jak tvrdí oddíly 3.6 a 8.

Tabulka verzí `(novinka_id, otisk, zaznamenano)` dokládá existenci změny, ale neuchovává předchozí titulek, termíny nebo interpretaci. Neumožňuje rekonstruovat, co bylo čtenářům sděleno. Není nutné archivovat celý článek; postačí verze zobrazovaných polí, extrahovaných tvrzení a verze pravidel.

Fallback `hash(titulek + url)` při opravě titulku vytvoří jinou identitu. Přednost má mít stabilní identifikátor zdroje a GUID, případně vhodně normalizovaná URL; změna titulku má být změnou obsahu. Unikátnost musí mít určený rozsah zdroje/školy, nikoli předpokládat globální jedinečnost GUID.

Bezpodmínečná přednost portálu také není zárukou aktuálnosti. Modelový příklad: škola v portálu před měsícem potvrdila DOD 9. prosince, dnes na svém webu oznámí jeho zrušení. Ponechat starý termín jako hlavní a opravu schovat do seznamu je zavádějící.

**Požadovaná úprava:** při konfliktu nejasný termín automaticky přestat zobrazovat jako bezvýhradně platný; přímo u karty uvést rozpor a oba zdroje. Nezakládat povinný moderátorský úkol. Pokud význam opravy nelze spolehlivě určit, přejít na původní titulky a odkazy bez odvozeného termínu. Starší údaj nelze chránit pouze tím, že prošel portálem. U oprav porovnávat konkrétní tvrzení a uchovávat jejich předchozí verze.

### R5 — Čerstvost stránky potřebuje dokončený kontrakt cache

**Závažnost: ověřit před veřejným pilotem.**

Změna na Postgres a `revalidatePath` je správná. Neoznačuji `revalidatePath` za nefunkční řešení: při vhodné cache může další návštěva získat nové údaje. Návrh ale neurčuje, co znamená „krátká cache“ DB. Vlastní časová cache mimo mechanismus Next.js se voláním `revalidatePath` automaticky nemusí vyprázdnit.

Oficiální dokumentace rozlišuje označení cesty k revalidaci v Route Handleru a její regeneraci při další návštěvě. Samotný návrat z endpointu tedy není potvrzením, že stránka už byla přegenerována. Tvrzení o prvním návštěvníkovi je podmíněno použitou datovou cache a úspěšným dokončením všech kroků. [Dokumentace revalidatePath](https://nextjs.org/docs/app/api-reference/functions/revalidatePath)

**Požadovaná úprava:** určit pořadí commit DB → invalidace příslušných dat/cesty → potvrzení; uchovat nevyřízené invalidace pro opakování, pokud volání po úspěšném zápisu selže. Smysluplná ověřovací zkouška je načíst školu se starými daty, provést import a zkontrolovat první další serverovou návštěvu. Nevyžaduji pro pilot automatické překreslování už otevřených panelů prohlížeče.

### R6 — Sonda je opravená jen částečně a některá čísla mají jiný význam

**Závažnost: oprava podkladů; neblokuje sběr validovaných zdrojů.**

Potvrzuji 531 nalezených feedů a správné řešení relativních deklarací vůči finální URL. Nová funkce `dopln_fallback()` ale staví základ z `zaznam['web']`, tedy původní adresy. Přesměrovaná škola s neplatnými deklaracemi tak nemusí být správně dohledána na nové doméně. Finální URL je potřeba uchovat a použít i zde.

„Platný“ zůstává sniffing XML. Úspěšné parsování vzorku by ani při doložení 80/80 neprokazovalo použitelnost všech 531 zdrojů. Před zařazením do veřejné služby je třeba ověřit skutečné položky každého vybraného feedu a jeho vztah ke škole.

Údaj 72 % čerstvých feedů pochází z původního vzorku 28/39, nikoli z nové úplné sondy 531 zdrojů; v úvodu uvést jmenovatel. Podobně 47,5 % škol s přijímacím zásahem neměří úplnost přijímacích zpráv. „Škola má alespoň jeden zásah“ je jiná metrika než „zachytili jsme všechny důležité informace této školy“. V uloženém nezpracovaném vzorku navíc nyní vychází 35 škol se zásahem z 80 vybraných, resp. ze 75 rozparsovaných.

Návrh zmiňuje odpovědi 401/429 jako argument proti vyšší frekvenci. V uložené sondě jsou 401, ale 429 není ani ve stavech titulek, ani deklarovaných feedů. Neznamená to, že se 429 jinde nevyskytlo; zde chybí konkrétní důkaz. Jednorázové 401 také samo nedokládá, že příčinou je frekvence požadavků.

### R7 — Dohled a nouzové vypnutí musí fungovat nezávisle na dalším importu

**Závažnost: minimum před veřejným pilotem.**

Souhlasím s měsíčním pilotem a možností rychle vypnout zdroj či zvýrazňování třídy. „Jedním PR“ ale samo není rychlý provozní mechanismus: zůstává schválení, nasazení a otázka, zda změna registru ovlivní už uložené položky. Vypnutí sklízení také nemusí skrýt chybnou kartu, která už je v DB a cache.

**Požadovaná úprava:** provozní přepínač v DB, respektovaný při čtení webu i plnění e-mailové fronty, s invalidací dotčeného zobrazení a auditní stopou. Aktivovat jej mají umět automatické kontroly anomálií; administrátorský zásah je pouze doplňková možnost. PR může uchovat následnou změnu pravidel, ale nesmí být nutný pro zastavení vadné publikace ani obnovení zdravého zdroje. Definovat automatické opakování, pozastavení a zkušební obnovení. Nezávislý dohled musí poznat zcela vynechaný běh a vyvolat náhradní; běh, který se nespustil, nemůže sám odeslat alarm. Upozornění člověku vyhradit přetrvávajícím mimořádným problémům, nikoli každému konfliktu či timeoutu.

Při odpovědi 304 aktualizovat úspěšnou kontrolu zdroje, ale nepřepisovat datum publikace článku. Při nedostupnosti DB nestačí přislíbit „poslední dobrá data“ bez určení, odkud je web načte; chybějící konfigurace a výpadek již fungující služby jsou dva odlišné stavy.

## 5. Reakce na argumenty proti původnímu doporučení

### 5.1 Frekvence: námitku přijímám částečně a původní požadavek zeslabuji

Původní cíl 90 minut byl doporučením bez uživatelského měření. Nebyl dostatečně doložen jako plošná nutnost a není důvod na něm trvat před pilotem. Souhlasím, že správnost a úplnost zaslouží přednost před optimalizací minut.

Nesouhlasím ale s tvrzením „zrychlení nezmění žádné čtenářovo rozhodnutí“. Protipříkladem je modelová oprava místa či času DOD zveřejněná ráno v den konání: rodina se může podle informace rozhodovat o cestě ještě dopoledne. Obdobně je citlivé zrušení akce nebo uzávěrka registrace. Jde o možné scénáře, nikoli tvrzení o jejich naměřené četnosti.

**Doporučení po vypořádání:** 2× denně jako základ pilotu; zaznamenávat časově citlivé opravy a podle jejich výskytu zrychlit konkrétní zdroje v okolí známých událostí. Nezrychlovat všech 531 webů automaticky. Nelze čekat na klasifikaci nové urgentní položky a teprve potom urychlit její první detekci; prioritu je nutné určit z předchozích údajů nebo používat oznámení zdroje.

Pro ilustraci při jednom požadavku na školu a bez opakování: 531 × 2 = 1 062 požadavků denně; hodinově 12 744; po půlhodině 25 488. Násobek provozu je reálný, ale dopad na cenu a servery bez měření neznáme. Sdílené feedy je vhodné stahovat jednou a zátěž řídit po hostitelích. Můj původní návrh 15–30 minut se týkal prioritních zdrojů ve špičce, nikoli bezpodmínečně celé sítě.

Také „tentýž den“ není totéž co „do 24 hodin“. Položka z večera může být v druhém případě publikována až následující večer. Pro pilot doporučuji ponechat přesnou formulaci do 24 hodin a odděleně měřit čas od stažení do dostupnosti na portálu. Datum vydavatele nemusí přesně odpovídat okamžiku zařazení do feedu; opožděně vložené či zpětně datované články označit samostatně, nikoli je tiše odstranit z metriky.

### 5.2 Postgres: souhlasím

Pokud již projekt Postgres provozuje, je pro verze, konflikty a odběry přirozenější než nová objektová služba. Alternativu externího JSON dále neprosazuji. Původní opatrná formulace vycházela z toho, že přítomnost kódu sama neprokazuje produkční konfiguraci; nešlo o doporučení ignorovat existující DB.

Zůstává konkrétní integrační práce: [migrační endpoint](../src/app/api/portal/migrace/route.ts) dnes pracuje s deklarovanými migracemi portálu, nové tabulky do něj nepřibudou pouhým odkazem v návrhu. Přímý zápis z Actions také vyžaduje definovat přístup pracovní úlohy k DB, ideálně s právy jen pro tuto funkci, a oddělit prostředí. To není důvod stavět jiné úložiště, jen součást odhadu realizace.

### 5.3 HTML/PDF: odložení implementace přijímám

Původní oponentura požadovala plán rozšíření a doporučovala postupné doplňování, ne plošný HTML/PDF parser jako podmínku startu RSS pilotu. V tomto bodě je shoda větší, než naznačuje oddíl 9.

Argument vyšší údržby je rozumný; tvrzení „o řád dražší“ ale není doloženo odhadem či měřením. Není nutné je použít k obhajobě odkladu. Pro ověření úplnosti je vhodný jednorázově připravený referenční vzorek přijímacích stránek. Nejde o ruční kontrolu každé novinky ani o pravidelnou lidskou podmínku provozu. Automatické porovnávání dalších zdrojů může hledat mezery průběžně; bez nezávisle ověřeného referenčního vzorku však jeho výsledky nelze vydávat za prokázanou úplnost.

### 5.4 WebSub: shoda v postupu, chybí důkaz o rozšíření

Souhlasím ponechat jej volitelně. Původní oponentura výslovně uváděla, že dostupnost nebyla měřena; netvrdila ani nepotvrzovala malé rozšíření mezi českými školami. Vypořádání by proto mělo říkat „rozšíření neznáme“. Bez změření není důvod stavět na WebSub ani ho odmítat kvůli údajně malé četnosti.

### 5.5 Pilot a možnost vypnutí: přijímám, ale požaduji skutečně účinný mechanismus

Pilot s dohledem je věcné zlepšení. Rozlišil bych vypnutí celého zdroje, skrytí jedné chybné položky a vypnutí automatického zvýrazňování určité třídy; nemusí se kvůli chybě v klasifikaci zastavit užitečný sběr původních titulků. Provozní účinnost musí mít přednost před tím, zda je změna provedena jedním PR.

### 5.6 Autonomie: moderace z návrhu 1.1 nesmí být závislostí služby

Oddíl 8 návrhu ponechává moderaci konfliktů a e-mailů. Po výslovném upřesnění zadavatele je tato část nevyhovující, pokud vyžaduje lidské schválení jednotlivých položek. Původní doporučení moderace tímto nahrazuji automatickými pravidly publikace:

| Situace | Automatické chování | Proč nepotřebuje schválení |
| --- | --- | --- |
| Nová položka z ověřeného zdroje | Po kontrole URL, formátu a identity zveřejnit titulek, datum a odkaz. | Systém zprostředkovává zdroj, nevytváří nové tvrzení o termínu. |
| Spolehlivě určená přijímací zpráva a platný termín | Zvýraznit, po spuštění odběrů případně automaticky zařadit do e-mailu. | Rozhodnutí vychází z předem otestovaných pravidel. |
| Nejistá třída, rok, negace nebo význam opravy | Ponechat neutrální odkaz; nevytvářet odvozený termín ani konkrétní tvrzení o volných místech. | Nejistotu lze přiznat bez zadržení původní zprávy. |
| Rozpor portálu a RSS | U obou zdrojů ukázat původ a datum, označit rozpor a potlačit jednoznačnou termínovou kartu. | Čtenář získá obě informace ihned, nikdo nečeká na moderátora. |
| Chyba stažení nebo 429 | Zpomalit, opakovat podle pravidel, zachovat poslední dobrý výsledek a jeho stáří. | Jde o automaticky řešitelný provozní stav. |
| Podezřelá změna zdroje nebo náhlý nárůst chybných položek | Dočasně izolovat dotčený zdroj či vypnout zvýrazňování, provést další kontrolu; ostatní školy pokračují. | Rozsah chyby se omezí bez zastavení celé služby. |
| Nejistá položka pro e-mail | Neodeslat ji; ponechat na webu jako odkaz. | Nevzniká fronta vyžadující ruční schválení. |

Kontrola zdrojů při jejich zařazení má být rovněž automatická, s výchozí vazbou na známý web školy. Nepodaří-li se zdroj bezpečně přiřadit, funkce se pro tuto školu zatím nezapne a později jej zkusí ověřit znovu. Registr lze generovat a kontrolovat automaticky; PR pro každou nově nalezenou adresu není nutnou podmínkou. Git může uchovávat auditní kopii. Ruční přepsání je volitelná výjimka, ne předepsaná práce obsluhy.

Autonomie neznamená, že musíme každou položku automaticky převést na jisté tvrzení. Znamená, že každý běžný výsledek zpracování má dokončenou automatickou cestu a žádná zpráva nemusí čekat na člověka. Jednorázové ověření kvality pravidel před nasazením se od schvalování publikace liší; pokud nemá být k dispozici ani referenční hodnocení, doporučuji začít neutrálním seznamem odkazů a neslibovat naměřenou přesnost odvozených karet.

## 6. Co upravit před další verzí a co lze spustit

### Před veřejným seznamem RSS novinek

1. Validovat konkrétní zdroje a odstranit rozpor v měřicích podkladech; přesnost zatím neprezentovat jako prokázanou.
2. Dokončit DB import, stabilní identitu položek, uchování změn zobrazovaných polí a obnovu cache s opakováním při chybě.
3. Zajistit funkční vypnutí zdroje/položky, dohled a správné zobrazení stáří kontroly.
4. Použít původní titulek a odkaz, bez neověřeného tvrzení o platném termínu či dostupných místech.
5. Zajistit, že běžná publikace, nejistota, konflikt i zotavení po výpadku mají automatickou cestu bez schvalovací fronty. Měřit počet položek čekajících na člověka; požadovaná hodnota pro běžný provoz je nula.

### Před zvýrazněnými termínovými kartami

1. Definovat platnost a fallback pro každou třídu, více termínů, uzávěrky, zrušení a přijímací období.
2. Vyřešit viditelný konflikt portál × RSS; hash nepoužívat jako náhradu porovnání významu.
3. Ověřit datum, kontext a negace na samostatném ručně označeném vzorku. Syntetické případy z této oponentury použít jako minimální regresní kontrolu.

### Před školními e-maily

1. Doložit přesnost jednotlivých skutečně nasazených tříd a stanovit přejímací kritérium.
2. Rozhodovat o opravné zprávě podle změny podstatného tvrzení, ne jen podle změny hashe.
3. Při každém odeslání znovu ověřit platnost položky a aktivní odběr. U změny A → B → A rozlišit návrat k dřívějšímu obsahu od duplicitního zpracování stejné události.
4. Upřesnit střet stropu jednoho e-mailu denně s nutností včasné opravy chybného termínu; návrh zatím neurčuje přednost.

## 7. Celkové stanovisko

**Doporučuji pokračovat pilotem podle architektury 1.1 a netrvat na plošném 90minutovém cíli. Současně nedoporučuji uzavřít vypořádání jako hotové.** Nejprve opravit reprodukovatelnost a přesnost tvrzení o datech, potom dokončit význam oprav, platnost termínů a konfliktní zobrazení. Tyto nedostatky mohou čtenáři způsobit větší škodu než samotný dvanáctihodinový interval kontroly.

Verze 1.1 opravila hlavní architektonickou chybu. Další revize má především sladit tvrzení dokumentu, dodané důkazy a skutečná pravidla chování služby. Po upřesnění zadavatele je další zásadní podmínkou odstranění povinné lidské moderace: nejisté případy mají automaticky skončit u transparentního odkazu nebo bezpečně omezeného zobrazení, nikoli v čekající frontě.

## Historie této řady oponentur

| Verze | Rozsah |
| --- | --- |
| Původní oponentura návrhu 1.0 | Vlastní doporučení a prvních 11 námitek, v samostatném původním souboru. |
| 1.1 – tento soubor | Posouzení návrhu 1.1 a vypořádání bod po bodu; kontrola nových podkladů, offline reprodukce vad, revize vlastního doporučení frekvence a podmínky pilotu. Zahrnuje následné upřesnění zadavatele: autonomní provoz bez povinného lidského schvalování. |
