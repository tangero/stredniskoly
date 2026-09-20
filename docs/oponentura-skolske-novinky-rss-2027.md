# Školní novinky z RSS/Atom – vlastní doporučení a kritická oponentura

**Datum:** 19. 9. 2026  
**Posuzovaný materiál:** [Školní novinky z RSS/Atom feedů, verze 1.0](skolske-novinky-rss-2027.md)  
**Cíl hodnocení:** maximální aktuálnost užitečných informací na profilech škol pro čtenáře portálu.

## 1. Závěr a rozsah ověření

**RSS je dobrý základ, ale navržené řešení nepovažuji za nejlepší pro maximální aktuálnost.** Je vhodné pro levný pilot. Pro spolehlivou službu potřebuje změnit cestu zveřejňování dat, práci s platností a opravami informací, ověření klasifikace a postupně rozšířit pokrytí mimo RSS.

Hodnocení vychází z návrhu, [podkladové sondy](rss-webu-skol-sonda-2026.md), [skriptu sondy](../scripts/sonda-rss-webu-skol.py), [uložených výsledků](../data/sondy/rss-webu-skol-20260919.json) a souvisejícího kódu webu. Technické předpoklady byly porovnány s níže odkazovanou oficiální dokumentací.

Přepočet uložených výsledků potvrdil 1 093 sondovaných škol a 512 škol s nalezeným feedem, a to i po vyřazení URL obsahujících `comment`. U 19 škol existují deklarované feedy, ale žádný není sondou označen jako platný. Nové plošné stahování školních webů nebylo provedeno; počet 512 je výsledek uložené sondy, nikoli potvrzení současné provozní dostupnosti všech zdrojů.

Samostatný označený vzorek a reprodukovatelný výstup klasifikace 80 feedů se v prohledaných podkladech nepodařilo dohledat. To neprokazuje, že měření neproběhlo, ale omezuje možnost nezávisle ověřit jeho závěry. Hodnocení není právním posudkem podmínek přebírání obsahu.

## 2. Vlastní názor a doporučené řešení

Čtenář má co nejdříve vidět důležitou informaci, která stále platí, a poznat její zdroj i stáří kontroly. Aktuálnost proto zahrnuje rychlost, pokrytí, správnost interpretace a zachycení následných oprav. Časté stahování samo o sobě nestačí.

| Oblast | Doporučení | Argument |
| --- | --- | --- |
| Zdroje | RSS/Atom jako první volba; postupně sledovat i přijímací stránky a odkazované dokumenty. | Feed se našel u necelé poloviny sondovaných škol. Ani existující feed nemusí obsahovat změnu kritérií nebo PDF. |
| Frekvence | Začít hodinovou kontrolou; u prioritních zdrojů ve špičce vyzkoušet 15–30 minut podle odezvy serverů. | Při dvou rovnoměrně rozložených kontrolách denně a rovnoměrném publikování vzniká průměrně šest hodin čekání ještě před zpracováním. |
| Publikování | Titulky a odkazy z ověřených zdrojů zveřejňovat po automatických kontrolách; moderovat nejasné interpretace a e-maily. | Čekání na ruční sloučení datového PR nemá zaručenou délku. |
| Uložení | Živé novinky ukládat mimo nasazený kód. Git ponechat pro pravidla, registr zdrojů a auditní exporty. | Aktualizace obsahu nemusí vyžadovat nasazení celého webu. |
| Zobrazení | Oddělit „Aktuálně pro uchazeče“ a „Ze života školy“. Rozlišit datum publikace, termín události a poslední úspěšnou kontrolu zdroje. | Jde o tři různé informace, které nelze nahradit jedním datem. |
| Kvalita | Měřit zpoždění, zachycené i přehlédnuté zprávy a správnost termínů. | Přesnost nalezených zásahů nedokládá úplnost služby. |

### 2.1 Přiměřená architektura

```text
Registr ověřených zdrojů
    → plánovač a sklízeč s podmíněnými HTTP požadavky
    → normalizace, identifikace položek a detekce změn
    → trvalé úložiště položek, verzí a stavů kontrol
    → automatický seznam původních titulků a odkazů
    → klasifikace a ověření termínů pro zvýrazněné karty
    → obnova dat a zobrazení příslušné školy
    → později samostatná fronta oznámení sledujícím odběratelům
```

Nejprve prověřit využití připraveného připojení k Postgresu v [novinky-db.ts](../src/lib/novinky-db.ts). Kód dokládá infrastrukturu, nikoli její produkční nastavení. Pro jednoduchý webový pilot může postačit verzovaný JSON v externím úložišti. Rozhodující je odstranit závislost každé aktualizace na PR a nasazení a určit způsob obnovy cache.

RSS zachovat jako hlavní způsob získávání novinek: poskytuje strukturovaná data a obvykle vyžaduje méně údržby než parsování HTML. Pokud konkrétní zdroj podporuje WebSub, lze využít oznámení o změně. Sonda jeho dostupnost nezjišťovala, proto na něm nelze založit základ služby. [Specifikace WebSub](https://www.w3.org/TR/websub/)

## 3. Kritická oponentura

### 3.1 Ruční PR pro každou aktualizaci je překážkou aktuálnosti

**Tvrzení návrhu:** nic se nenasadí bez sloučení; schvalování je pojistka proti šumu zadarmo.

**Námitka a argument:** technicky je postup jednoduchý, ale vyžaduje pravidelnou práci člověka, včetně víkendů. Celkové zpoždění tvoří čekání na stažení, zpracování, čekání na schválení, nasazení a obnova zobrazení. Ruční krok nemá stanovenou horní mez. Zrychlení parseru nepomůže zprávě čekající den na schválení.

**Doporučení:** PR používat pro pravidla a změny zdrojů. Běžné titulky a odkazy z ověřených zdrojů zveřejňovat automaticky po validaci. Moderaci soustředit na nejasná tvrzení, konflikty a obsah určený do e-mailu.

### 3.2 Hodinová revalidace nezajišťuje načtení nového JSON

**Tvrzení návrhu:** `revalidate = 3600` stačí a není potřeba změna renderingu.

**Námitka a argument:** vzorový [skoly-web.ts](../src/lib/skoly-web.ts) čte soubor z nasazené aplikace a uchovává jej v modulové proměnné bez expirace. Revalidace stránky sama nestáhne nový soubor z GitHubu ani nevyprázdní tuto proměnnou. Změna souboru v repozitáři se nejprve musí dostat do nasazení. Časová ISR navíc obnovuje stránku na základě návštěvy po uplynutí intervalu, nikoli pravidelnou aktualizací všech stránek přesně každou hodinu. [Dokumentace Next.js](https://nextjs.org/docs/app/guides/incremental-static-regeneration)

**Doporučení:** popsat cestu živých dat do aplikace, cache dat i cache stránky. Po změně obnovovat příslušnou školu. Přísný požadavek na čerstvost musí řešit i to, co dostane první návštěvník po změně.

### 3.3 Pokrytí 47 % neznamená úplnost ani technickou validitu

**Námitka a argument:** u 581 z 1 093 sondovaných škol se feed nenašel. Neznamená to, že nezveřejňují aktuální informace. Základ sondy navíc tvoří školy z vybraného katalogu s dostupnou WWW adresou, nikoli automaticky všechny střední školy.

Kontrola skriptu ukázala další omezení:

- Náhradní cesty zkouší pouze při absenci deklarací. U 19 škol s deklarovanými, ale neplatnými feedy se tento postup nevyužil.
- Stav `platny` vychází z výskytu `<rss`, `<feed` či `<rdf` v začátku odpovědi, nikoli z úspěšného rozparsování položek.
- Relativní odkazy na feedy řeší vůči původní URL; po přesměrování webu tak mohou být vyhodnoceny nesprávně.
- Platný feed nedokládá, že obsahuje všechny aktualizace přijímací sekce či dokumentů.

**Doporučení:** nejprve zpřesnit registr skutečně použitelných zdrojů. Následně cíleně doplňovat rubriky pro uchazeče a sledování změn dokumentů. Častější RSS polling chybějící zdroje nevyřeší.

### 3.4 Závěr „klíčová slova stačí“ je předčasný

**Námitka a argument:** návrh uvádí ručně ověřené zásahy, ale neuvádí počet relevantních zpráv, které pravidla přehlédla. Pro čtenáře je přitom zásadní i úplnost zachycení. Přesnost 34 správných zásahů ve vzorku není zárukou bezchybnosti budoucího provozu.

Tabulka vyžaduje vysvětlení: údaj `7/11` u DOD sám nedokládá přesnost `~95 %+`. Může jít o výsledek po zpřísnění pravidel, ale chybí jasný jmenovatel a nezávislé ověření. Není také dostatečně popsáno, zda se třídy a zásahy překrývají a jak vznikl ručně ověřený vzorek.

**Doporučení:** klíčová slova použít jako výchozí metodu. Uchovat označený vzorek, ověřovat i nezachycené položky a testovat na jiných školách a pozdějším období než při tvorbě pravidel. Z nedostatku důkazů neplyne nutnost LLM; plyne nutnost lepšího měření.

### 3.5 Expirace po 60 dnech zaměňuje stáří článku za platnost

**Námitka a argument:** příklad v návrhu obsahuje článek z 9. září s DOD 9. prosince a 7. ledna. Po 60 dnech by zmizel ještě před oběma akcemi. Opačně informace o volných místech může přestat platit za dva dny a přesto zůstat zvýrazněná týdny.

**Doporučení:** seznam novinek řadit podle publikace, ale zvýraznění řídit termínem, uzávěrkou, zrušením či nahrazením informace. Kritéria uchovávat podle příslušného přijímacího období. Jeden časový limit není vhodný pro všechny třídy.

### 3.6 Odvozování data může vytvořit nepravdivou pozvánku

**Námitka a argument:** podmínka „datum akce ≥ datum publikace“ nerozliší pozvánku a reportáž. Dopočet nejbližšího budoucího roku může proměnit zmínku o minulém DOD v domnělou budoucí událost. Kalendářní rok DOD navíc nemusí odpovídat roku přijímacího řízení ani zobrazenému období katalogu.

**Doporučení:** samostatně uchovávat datum publikace, změny, události a přijímací období. Nejasný termín neodhadovat pro zvýrazněnou kartu: zobrazit původní titulek a odkaz. Zákaz pevně zapsaných letopočtů je správný, ale registr období nesmí nahradit datum ze zdroje.

### 3.7 Deduplicace neřeší opravy existujících zpráv

**Námitka a argument:** škola může opravit termín ve stejném článku se stejným GUID i URL. Pokud sklízeč známou položku přeskočí, oprava se neprojeví. Atom rozlišuje stabilní identitu položky a údaj o její aktualizaci. [Specifikace Atom](https://www.rfc-editor.org/info/rfc4287/)

**Doporučení:** kromě identifikátoru sledovat otisk obsahu a verze. Podstatnou změnu termínu zpracovat jako aktualizaci. Zmizení položky z krátkého feedu nevykládat automaticky jako zrušení události. U důležitých stále platných informací zvážit opakovanou kontrolu cílového článku či dokumentu, protože oprava se nemusí vrátit do feedu.

Pro budoucí e-mail musí idempotence současně bránit duplicitám a umožnit podstatnou opravu už odeslané informace.

### 3.8 Starý obsah neznamená nefunkční zdroj

**Námitka a argument:** škola může měsíce nic nepublikovat a následně vydat zásadní přijímací informaci. Deaktivace podle stáří posledního článku ji může vyřadit těsně před novou aktivitou. Jednotné zacházení se všemi chybami 4xx také není vhodné; například omezení provozu se stavem 429 není totéž jako zaniklá adresa.

**Doporučení:** oddělit technickou dostupnost, poslední úspěšnou kontrolu a stáří obsahu. Klidné zdroje kontrolovat méně často, ale průběžně. Respektovat `Retry-After`, používat odstupňované opakování a opětovné ověření vyřazených zdrojů. Při chybě zachovat poslední dobrá data a ukázat stáří kontroly; nevydávat neúspěšné stažení za stav „škola nemá novinky“.

### 3.9 Volba plánovače potřebuje provozní argumenty

**Námitka a argument:** GitHub Actions je rozumný pro pilot, ale není zárukou přesného času. GitHub připouští zpoždění i vynechání naplánovaných běhů při vysoké zátěži. [Dokumentace GitHubu](https://docs.github.com/en/actions/how-tos/troubleshoot-workflows)

Vercel cron má stejné časové limity jako Functions. Existence limitu sama neprokazuje nevhodnost: rozhoduje délka běhu, plán a rozdělení práce do dávek. [Dokumentace Vercelu](https://vercel.com/docs/cron-jobs/manage-cron-jobs)

**Doporučení:** stanovit požadované zpoždění a měřit běhy. Pro začátek lze ponechat Actions, přidat dohled nad vynechanými kontrolami a výsledky ukládat přímo do živého úložiště. Pro přísnější provozní cíle vybrat plánovač a pracovní procesy podle naměřené spolehlivosti.

### 3.10 Odhad objemu e-mailů může vycházet z neúplné historie

**Námitka a argument:** sonda uvádí medián deset položek ve feedu. Pokud měření „za 180 dní“ používá pouze právě dostupné položky, nejde o úplný půlroční archiv. Aktivnější školy mohly publikovat více zpráv, které již z feedu vypadly. Bez popisu sběru proto nelze spolehlivě odvodit dlouhodobou frekvenci ani závěr „spam to není“.

**Doporučení:** frekvenci ověřit průběžným sběrem a vyhodnotit i sezónní špičky a souběh zpráv napříč sledovanými školami. Školní e-maily ponechat v samostatné fázi. Současný [odesílač](../src/lib/novinky-odesilac.ts) skutečně vybírá všechny odběratele, takže individuální sledování škol vyžaduje změnu modelu, jak návrh správně uvádí.

### 3.11 Zobrazení musí řešit konflikty a dohledatelnost

**Námitka a argument:** [ProfilSkoly.tsx](../src/components/skola/ProfilSkoly.tsx) již zobrazuje DOD a kritéria z portálu pro školy včetně data potvrzení. Nová RSS karta může přinést jiný termín. Samotné umístění vedle existujícího bloku nevysvětluje čtenáři, který údaj platí. Nejnovější článek také nemusí rušit starší termín: může oznamovat další akci.

**Doporučení:** zobrazovat původ a čas každého tvrzení, rozlišit další termín od opravy a konflikty předat ke kontrole. Nejasnou automatickou interpretaci nepovyšovat na jediný závazně působící termín. U čerstvé důležité zprávy nabídnout viditelný vstup do aktuálních informací, nikoli spoléhat pouze na rozbalovací seznam hluboko v části o oborech.

## 4. Co z návrhu zachovat

- **RSS/Atom jako první volbu:** strukturované zdroje umožňují rychlý start s omezenou údržbou.
- **Podmíněné HTTP požadavky:** `ETag` a `If-Modified-Since` snižují přenášená data; stav validátorů musí být uchován mezi běhy.
- **Původní titulek, datum a odkaz:** jednoduché zobrazení omezuje potřebu automatické interpretace a umožňuje ověření u školy.
- **Rozlišení důležitých zpráv a běžného života školy:** pomáhá návštěvníkovi najít přijímací informace.
- **Viditelné označení původu:** automaticky získaný obsah se nemá tvářit jako redakčně ověřené tvrzení portálu.
- **Pilot bez individuálních e-mailů:** umožní ověřit klasifikaci a frekvenci před nevratným rozesíláním.
- **Oddělení školních a oborových informací:** obecná školní zpráva se nemá automaticky vydávat za informaci platnou pro každý obor.

## 5. Podmínky a pořadí realizace

Před realizací upravit návrh v pěti bodech:

1. Automatická cesta od ověřeného zdroje k webu bez ručního PR pro každou novinku, včetně řešení cache.
2. Platnost podle události a podpora oprav již známých článků.
3. Reprodukovatelné ověření klasifikace včetně přehlédnutých relevantních zpráv.
4. Měřitelná čerstvost, dohled nad výpadky a srozumitelný údaj o poslední kontrole.
5. Plán rozšíření mimo RSS, prioritně na přijímací stránky a dokumenty.

První pilot může zahrnout zpřesnění registru, průběžný sběr, automatický seznam titulků a provozní měření. Následovat mají ověřené karty s termíny a řešení konfliktů. Rozšíření zdrojů a individuální e-maily mají vycházet z naměřených nedostatků a poptávky. Odhad jednoho dne na sklízeč je použitelný pro prototyp; z materiálu není doložen jako odhad odolného provozu se všemi uvedenými vlastnostmi.

## 6. Jak poznat, že řešení plní cíl

Navržený počáteční cíl: **95 % nových položek dostupných ve sledovaných funkčních feedech zobrazit do 90 minut.** Jde o doporučený provozní cíl, nikoli naměřenou schopnost nebo příslib.

Měřit odděleně:

- **Zpoždění publikace:** čas první detekce a čas dostupnosti na portálu; vůči publikaci školy pouze tam, kde má zdroj věrohodný čas. Bez historie není přesný okamžik dostupnosti mezi dvěma kontrolami znám.
- **Pokrytí zdrojů:** podíl škol se skutečně použitelným a pravidelně kontrolovaným zdrojem.
- **Úplnost důležitých informací:** na ručně kontrolovaném vzorku porovnávat přehled s přijímacími stránkami škol, nikoli pouze s RSS.
- **Přesnost interpretace:** správnost klasifikace, termínů, přijímacího období a vztahu ke konkrétní škole či oboru.
- **Zachycení oprav:** jak rychle se promítne změna nebo zrušení termínu a zda nevznikne duplicitní oznámení.
- **Provozní stav:** stáří poslední úspěšné kontroly, chyby, vynechané běhy a počet zdrojů čekajících na opravu.

Největší přínos změn nebude v dokonalejším parseru. Bude v odstranění čekání na zveřejnění a ve schopnosti poznat, co stále platí, co se změnilo a co sledované zdroje vůbec nezachytily.
