# Oponentura k návrhu „Novinky k přijímačkám e-mailem"

Verze 2.0 · 17. 9. 2026 · Kolo 2 se vztahuje k [návrhu v1.1](novinky-k-prijimackam-2027.md). Kolo 1 (oponentura v1.0) je archivováno dole.

# Kolo 2: oponentura návrhu v1.1

## 0. Metoda

v1.1 přijímá všech sedm bodů kola 1, dvě s úpravou, a S4 rozšiřuje o dvě nová ověřitelná tvrzení. Ověřil jsem je online, přečetl nové části (rozhodnutí 3, 5, 7 a 8, schéma tabulek, průběh odesílání, revize harmonogramu) a zkontroloval návaznost na registr stavu datových sad.

## 1. Co oponentura potvrzuje

- **Měření v Resendu.** „Open and click tracking is disabled by default for all domains" — nastavení je na úrovni domény a výchozí stav je vypnutý ([Resend docs, ověřeno 17. 9. 2026](https://resend.com/docs/dashboard/domains/tracking)). Tvrzení v1.1 potvrzuji; hlídání na subdoméně + test stačí.
- **Firewall Vercelu.** Rate limiting na tarifu Pro počítá jen podle IP nebo otisku JA4 a okno je 10 s–10 minut ([Vercel WAF docs](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting), [srovnání Arcjet](https://arcjet.com/compare/vercel-waf-vs-arcjet/)). Závěr v1.1, že limit „3 potvrzení na adresu za 24 h" firewall neudrží a tabulku otisků potřebuje každá varianta, je správný — a je to lepší zdůvodnění databáze, než jaké jsem v kole 1 dal já.
- **Harmonogram N0–N2** je teď vnitřně konzistentní: první povinný e-mail je „Školy vyhlašují kritéria" 12. 1. 2027 (3 dny před `ss-kriteria` 15. 1.), N2 končí 15. 12. s měsíční rezervou, prosincový e-mail je výslovně nepovinný.
- **Formulace souhlasu** převzatá z kola 1 („pro sebe nebo své dítě, alespoň 15 let") řeší obě role pravdivě; „do potvrzení se neukládá nic kromě otisku adresy" je poctivá formulace.
- **Rozhodnutí 8 (hranice plošných zpráv)** je zapsané jako rozhodnutí, ne komentář, a doplňuje i pravidlo pro přepnutí mimo sezónu. Registr k výsledkům 1. kola čeká období 2027 v 2027-08, tedy po konci sezóny — klauzule „zmíní se v nejbližším e-mailu" je pro něj správná cesta.

## 2. Zbývající sporné body k vypořádání

### M1 — Dva e-maily mluví o „nabídce nového roku" mimo rytmus webu; leden slibuje, co web nemá, březen posílá, co čtenáři už nepotřebují

- Lednový e-mail „Školy vyhlašují kritéria" (12. 1. 2027) obsahuje „nabídka oborů pro nový rok". Web ale v lednu 2027 ukazuje nabídku z CERMAT dat řízení 2026; nabídku řízení 2027 web dostane až přepnutím `cermat-prihlasky`, které registr čeká **2027-03**. E-mail by tedy zval na obsah, který stránky v lednu nemají — rozpor s vlastním pravidlem projektu, že e-mail nesmí slibovat, co stránka neukáže (sledování v2.1, §3.1 „Pozor na očekávání rodin", které v1.1 cituje, ale neinternalizuje).
- Březnový e-mail „Nová nabídka oborů na webu" (přepnutí `cermat-prihlasky`) jde odběratelům **ročníku 2027** — tedy lidem, kteří přihlášky podali 22. 2. Text „obory a místa pro nový rok jsou na stránkách škol" je pro ně zavádějící: „nový rok" je jejich právě proběhlý rok a rozhodnutí už mají za sebou. Hodnota e-mailu je retrospektivní („kolik míst a přihlášek obory letos měly") nebo pro mladší ročník.

**Vypořádání:** lednový e-mail o kritériích zbavit slibu nabídky na webu, dokud ji web neukazuje (případně doplnit, že nabídky škol se hledají na webech škol a v kritériích). Březnový e-mail přeformulovat na informaci o nových datech („kolik míst a přihlášek měly obory v letošním 1. kole"), ne výzvu k výběru; zvážit jeho přesun do uvítání ročníku 2028, pro který je obsah skutečně užitečný.

### M2 — Mechanismus „odesílač čte e-maily z nasazeného webu" není definovaný

Rozhodnutí 5 a oddíl 7 zakládají bezpečnost schvalování na tom, že odesílač posílá jen e-maily viditelné na nasazeném webu. Ale vygenerované e-maily mají ležet v `content/novinky/2027/*.json` a adresář `content/` web neservíruje — není v `public/` a návrh nezakládá API route, která by ho četla. Závislost se dvěma koncemi: buď odesílač čte repozitář (pak garance „jen nasazené" neplatí a schválený PR se může lišit od odeslaného), nebo web e-maily musí vystavovat (pak chybí kus architektury).

**Vypořádání:** rozhodnout a zapsat do N2: e-maily generovat do `public/novinky/{rocnik}/` (stejný vzor jako `public/sledovani/` u sledování v2.1), nebo vystavit read-only API route s `CRON_SECRET`. Bez tohoto rozhodnutí je „Hotovo, když" fáze N2 neověřitelné.

### M3 — Schéma odběru vylučuje oba druhy studia najednou

`odber_novinek` má primární klíč `(odberatel_id, rocnik)` a `druh_studia` jako povinný sloupec s `check ('ss','vicelete')`. Rodina, která v témže roce řeší deváťáka (SŠ) i sedmáka (šestileté gymnázium) — reálný případ, obě děti jsou „ročník 2027" — se pod jedním e-mailem přihlásí jen k jednomu druhu. Totéž osmák váhající mezi SŠ a víceletým: musel by se registrovat dvakrát pod dvěma adresami.

**Vypořádání:** primární klíč rozšířit na `(odberatel_id, rocnik, druh_studia)`, případně přidat hodnotu „ještě nevím" (dostává obě varianty termínových e-mailů, které se překrývají). Formulář tím zůstane stejný, změní se jen schéma.

## 3. Drobnosti

- Uvítací e-mail slibuje „zmínku o datech přepnutých od posledního e-mailu" — pro nového odběratele žádný poslední e-mail neexistuje; šablona potřebuje podmíněný blok. Stejně tak dvojklik na potvrzovací odkaz pošle uvítání dvakrát, `odeslano_novinky` má zapisovat i ho.
- Rozhodnutí 3 říká, že formulář nabízí jen druhy, které web pokrývá — ale formulář se v říjnu 2026 zobrazí i rodině konzervatoristy (kalendář má budoucí události konzervatoří). Formulář nebo `/novinky` má jednou větou vysvětlit, proč konzervatoř v nabídce není, jinak působí rozbitě.
- Právní kontrola (N0) má v zadání i přenosy osobních údajů: Resend je americký zpracovatel a Neon se musí zakládat v EU regionu; zásady mají jmenovat právní základ přenosu. (Shodné s oponenturou sledování v2.1, bod o zpracovatelích.)
- E-mail „Kalendář dalšího ročníku" se váže na přepnutí `msmt-harmonogram`, které je ruční opis — smazání nepotvrzených po 30 dnech má být součást téhož běhu, jinak zůstanou viset.

## 4. Stanoviska k otevřeným otázkám návrhu

1. **Právní kontrola:** souhlas; doplnit o přenosy k zpracovatelům (drobnosti).
2. **Sledování škol schválit?** Na novinkách nezávisí, souhlas. Doporučuji ale schválit aspoň fázi F0 (záznam událostí) jako sdílenou infrastrukturu — novinky ji potřebují pro zprávy o nových datech (oddíl 7 poslední bod) a bez ní je píše redakce ručně.
3. **Zpráva o dalším kalendáři:** nabízet, jak je navrženo — samostatný účel, jeden e-mail, nové potvrzení, jinak smazání. Je to čisté řešení problému z kola 1.

## 5. Shrnutí postoje k v1.1

v1.1 je vypořádání kola 1 poctivé a v případě S4 lepší než oponentura sama — obě nově doložené skutečnosti (výchozí vypnutí měření v Resendu, limity firewallu Vercelu) jsem ověřil online a potvrzuji. Po harmonogramu, konzervatořích, ročníku 2028, souhlasu ani úložišti nemám co rozporovat. Zbývají tři body: dva e-maily mluví o nabídce mimo rytmus webu (M1), chybí definice mechanismu „e-maily z nasazeného webu" (M2) a schéma nepustí rodinu s oběma druhy studia (M3). Po jejich vypořádání a právní kontrole v N0 nemám proti spuštění podle plánu námitky.

---

# Kolo 1: oponentura v1.0 k návrhu v1.0 (archiv, 17. 9. 2026)

## 0. Metoda

Ověřil jsem podklady, na kterých návrh stojí: `src/data/admissions-2027.json` (obsah a termíny), registr stavu datových sad na aktuální větvi i na `feat/titulka-nabidka-oboru`, existenci a podobu stránek, kam se formuláře mají přidat (`src/app/page.tsx`, `src/components/Footer.tsx`, `src/app/prijimacky-2027/page.tsx`), ochranu `bug-report`, konfiguraci Matomo v `src/app/layout.tsx` a online ceník a funkce marketingového tarifu Resendu, na kterém stojí doporučená varianta úložiště.

## 1. Co oponentura potvrzuje

- **Kalendář.** `admissions-2027.json` nese skutečně 20 událostí ve třech skupinách; termíny citované v návrhu sedí (kon-kriteria 15.–31. 10. 2026, kon-prihlasky do 30. 11. 2026, ss-prihlasky 1.–22. 2. 2027, ss-vysledky 14. 5., k2-prihlasky do 24. 5. — mezi výsledky a koncem přihlášek 2. kola je opravdu deset dní). ICS export i věta „stažená kopie se sama neaktualizuje" na stránce kalendáře existují (`public/prijimacky-2027.ics`, `prijimacky-2027/page.tsx:35`).
- **Místa formuláře.** Tmavá karta „PŘIJÍMAČKY 2027 / Termíny už známe" je na titulce (`src/app/page.tsx:32-34`), modrý pás „Vyzkoušej zdarma" na řádce 249, `Footer.tsx` existuje, průvodci `/jak-vybrat-skolu` a `/jak-funguje-prijimani` existují.
- **Ochrany.** `bug-report` má skryté pole `website` a kontrolu počtu URL (`route.ts:52,190`) — vzor pro formulář je reálný.
- **Matomo s cookies bez lišty.** `layout.tsx:93-99` volá `trackPageView` bez `disableCookies` a žádná souhlasová lišta v kódu není. Zásady ochrany osobních údajů chybí, jak návrh říká.
- **Ceník Resendu.** Marketingový tarif je skutečně zdarma do 1 000 kontaktů, placený od 40 USD za 5 000 ([Resend docs](https://resend.com/docs/knowledge-base/what-is-resend-pricing), [Resend blog](https://resend.com/blog/send-marketing-emails-with-resend-broadcasts)). Odhad „první sezóna překročí 1 000 až na jaře" je při vlastním předpokladu 100–250 kontaktů měsíčně konzistentní.
- **Produktové rozhodnutí 4 (termíny z kalendáře, ne z textu) a 5 (schválení člověkem)** považuji za správné a nejhodnotnější část návrhu; test na letopočty v šablonách je přesně ten druh pojistky, který jinde v projektu chyběl.

## 2. Sporné body k vypořádání

### S1 — Harmonogram fází minuje vlastní první e-mail; deadline 15. 10. je interně rozporný

E-mail pro konzervatoře má jít „7 dní před `kon-kriteria`", tedy **8. 10. 2026**. Fáze N1 (odběr) je ale naplánovaná do 15. 10. a N2 (koncept rozesílky pro konzervatoře čeká na schválení) do 20. 10. Plán tedy svůj první obsahový závazek nesplní o 12 dní, i kdyby vše šlo podle plánu. Zároveň N0 obsahuje zásady ochrany osobních údajů — stránku, která dnes neexistuje vůbec, vyžaduje právní kontrolu (otevřená otázka 5) a blokuje oba e-mailové produkty — s termínem 5. 10., tedy 18 dní od návrhu. Deadline „do 15. 10., kdy začínají konzervatoře" je umělý právě vzhledem k S2.

**Vypořádání:** přecílit na SŠ vlnu, která je hmotnostně hlavní (kritéria leden, přihlášky únor): N0 do 15. 11., N1 do 1. 12. 2026 (reminder konzervatořských přihlášek k 30. 11. jako bonus, ne závazek), N2 do 15. 12. První závazný e-mail pak je „Školy vyhlašují kritéria" (12. 1. 2027) a plán má rezervu na právní kontrolu. Do N0 přidat sloučení větve `feat/titulka-nabidka-oboru` — sada `msmt-harmonogram` je v registru jen na ní a bez ní neexistuje zdroj termínů pro generátor ani formulářová nabídka ročníků.

### S2 — Konzervatoře jako startovní segment nemají na webu obsah

Titulní stránka sama říká: „Přehled zatím nepokrývá všechny formy studia ani obory bez JPZ, například učební obory a **konzervatoře**" (`src/app/page.tsx:48`). Návrh přitom právě konzervatoře volí jako první segment: první obsahový e-mail, deadline celého plánu. E-maily „jak vybírat, co se ptát, odkaz na simulátor a stránky škol" by konzervatoristům vedly na nástroje, které je nepokrývají — slib by se nesplnil hned u první skupiny odběratelů.

**Vypořádání:** pro ročník 2027 segment konzervatoř **neotevírat** (ve formuláři ho nenabízet), nebo pro něj posílat jen kalendářní e-maily bez odkazů na simulátor a stránky škol, výslovně bez slibu pokynů k výběru. Rozhodnutí zdůvodnit v návrhu; spustit segment, až web konzervatoře pokryje. Tím odpadá i falešný deadline ze S1.

### S3 — Ročník 2028 ve formuláři nemá obsah na 11 měsíců

Formulář nabídne ročník přijímaček „z registru (období sady `msmt-harmonogram` a jedno další)" — tedy 2027 a 2028. Harmonogram pro 2028 ale MŠMT zveřejní zhruba v září 2027. Odběratel ročníku 2028 tak dostane uvítací e-mail, jehož hlavní slib („přehled termínů ročníku") neexistuje, a pak **jedenáct měsíců nic**. První skutečný e-mail přijde adresátovi, který dávno zapomněl, že se přihlásil — typický zdroj stížností na spam, které ohrožují doménu, ze které chodí i odkazy portálu škol.

**Vypořádání:** nabízet jen ročník s publikovaným kalendářem. Pro mladší děti buď nic (formulář řekne „pro ročník 2028 odběr otevřeme, až MŠMT zveřejní harmonogram"), nebo samostatný jednorázový slib „ozveme se, až vyjde harmonogram" — jeden e-mail ročně, jasně označený. Pravidlo „nabízet ročník = mít pro něj kalendář" zapsat do rozhodnutí 3, aby ho automatika z registru neobešla.

### S4 — K otevřené otázce 2: doporučuji variantu B (Neon), pokud je sledování schválené — a v každém případě ověřit funkce před N0, ne před F1

Návrh doporučuje kontakty a rozesílky v Resendu (A) s přechodem na Neon (B) „až se sledováním". Proti A mluví:

1. **Dvě úložiště souhlasů.** Rozhodnutí 1 slibuje „dva produkty, jedna adresa", ale A zakládá druhé úložiště odběratelů s druhým odhlašováním (témata Resendu vs. vlastní správa) a druhou mazací cestou pro GDPR. N4 „sjednocení" je v návrhu jedna věta; migrace kontaktů z Resendu do Neonu (export, deduplikace, přenos souhlasů a zdrojů) je reálná práce, která se „úsporou" na startu jen odkládá — a sledování v2.1 je ne schválený návrh, takže migrace může viset neurčito.
2. **Závislost na neověřených funkcích.** Návrh sám uvádí „k ověření před F1": zástupný symbol odhlášení, hostovaná stránka předvoleb, limity Contacts API, vlastnosti kontaktů. K nim přidávám: **jde u rozesílek vypnout sledování otevření a kliknutí?** Slib „v e-mailech neměříme" (oddíl 9) je součást souhlasu; pokud ho Broadcast API vypnout nejde, varianta A je v rozporu s vlastními zásadami. Tyto body jsou launch blockery — ověření patří do **N0**, ne před F1/N1. *(Kolo 2: ověřeno, měření je per doména a výchozí vypnuté; varianta A je přesto zavržena z důvodu limitu na adresu.)*
3. **Cenový práh.** Vlastní odhad návrhu křižuje 1 000 kontaktů na jaře 2027, tedy 40 USD měsíčně právě v nejsilnější sezóně; Neon je na bezplatném tarifu (sledování v2.1, §7.4).
4. **Jediná skutečná ztráta B je fronta a plánování.** Plánované odeslání `scheduled_at` přitom sledování v2.1 zamítlo, protože Vercel Cron na tarifu Pro spouští přesně; denní cron „co je dnes splatné" + schválený koncept plánování nahradí. Ochrana proti zneužití se u A stejně dotazuje Resend API při každém přihlášení, takže argument „bez databáze" je slabší, než zní.

**Vypořádání:** rozhodnout go/no-go sledování před N0. Pokud go → novinky rovnou na B (jedna tabulka navíc, sdílená správa odběrů, N4 odpadá). Pokud sledování visí → A přijmout, ale s ověřovací branou v N0 a se schématem kontaktů navrženým pro pozdější export.

### S5 — Souhlas řeší věk správně, ale formulace míchá dva různé subjekty

Oddíl 5 správně identifikuje hranici 15 let (§ 7 zákona č. 110/2019 Sb.). Ale segmentace mění, kdo odběr zakládá: u **víceletých gymnázií** jsou uchazeči 11–13letí, takže odběratel je prakticky vždy rodič; u SŠ po 9. třídě je uchazeči 14–15. Zaškrtávátko „Je mi alespoň 15 let, **nebo jsem rodič**" nutí čtrnáctiletého uchazeče, který si odběr zakládá sám pro sebe, k nepravdivému tvrzení „jsem rodič". Texty e-mailů zároveň oslovují „Ty" jako titulka — tedy dítě — zatímco souhlas dává rodič.

**Vypořádání:** formulaci obrátit na účel: „Odběr zakládám pro sebe nebo své dítě a je mi alespoň 15 let" (jedna pravdivá podmínka místo dvou rolí). Do právní kontroly explicitně zadat i oslovení e-mailů vzhledem k tomu, že souhlas dává rodič, ale obsah čte dítě.

### S6 — „Dva produkty, jedna adresa" předbíhá neschválené sledování; sdílené webhooky neexistují

Rozhodnutí 1 a formulář se dvěma zaškrtávátky počítají se sledováním v2.1, které je návrh k rozhodnutí na nesloučené větvi `docs/sledovani-skol-a-oboru`. Sledování samo zakazuje tlačítko dřív, než má fungující odesílač — novinky tedy společný formulář spustí **bez** pole „sledovat školu" a slib „dva produkty, jedna adresa" bude do N4 nesplněný. Praktickyji: bod 6 průběhu odkazuje na webhooky „sdílené se sledováním (v2.1 §7.5)" — ten endpoint neexistuje a novinky ho potřebují už v N1 (nedoručitelnost a stížnosti mažou kontakt).

**Vypořádání:** webhook nedoručitelnosti a stížností zapsat výslovně do rozsahu N1 (ne jako sdílenou závislost). Rozhodnutí 1 přeformulovat: „společný formulář, až bude sledování schválené a funkční; do té doby novinky prodávají jen sebe."

### S7 — Zprávy o nových datech: bez hranice se z novinek stane druhé sledování

Poslední řádek tabulky obsahu („Nová data na webu … po nasazení, podle sady") spolu s otevřenou otázkou 6 nechává otevřené, zda plošně posílat „vše, co přepne registr". Registr přepíná i sady, které s přijímačky nesouvisí (doprava, inspekce, maturita v září). Plošný segment, kterému formulář slíbil „nejvýš pár e-mailů měsíčně" o termínech, by dostával datový zpravodaj.

**Vypořádání:** otevřená otázka 6: **jen velké a jen přijímačkové** — nová nabídka oborů, výsledky 1. kola, pásma přijetí. Maturita a inspekce patří do sledování školy, doprava nikam. Hranici zapsat do rozhodnutí, ne do komentáře.

## 3. Stanoviska k otevřeným otázkám návrhu (kolo 1)

1. **Název:** „Termíny přijímaček e-mailem". Popisný název slibuje přesně to, co produkt dělá; „Přijímačky krok za krokem" slibuje doprovázení, které 9–11 e-mailů nenaplní.
2. **Úložiště:** viz S4 — Neon, pokud je sledování schválené; jinak Resend kontakty s ověřovací branou v N0.
3. **Tón:** tykání jako titulní stránka, jednotně napříč webe i e-maily; oslovovat rodinu, ne jen rodiče (S5).
4. **`?zdroj=novinky`:** povolit. Měření probíhá na straně webu po aktivním kliknutí, slib „v e-mailech neměříme otevření ani kliknutí" tím neporušuje — ale podmínit vypnutím měření na straně Resendu (S4, bod 2).
5. **Právní kontrola:** souhlas, doplnit o S5.
6. **Zprávy o datech:** jen velké přijímačkové (S7).
7. **Kraj:** zatím ne. Pole navíc sníží dokončení formuláře a krajský přehled dnů otevřených dveří neexistuje; přidat jde kdykoli později zvlášť, ročník 2027 to nepotřebuje.

## 4. Drobnosti (kolo 1)

- `msmt-harmonogram` v registru chybí na aktuální větvi; leží na nesloučené `feat/titulka-nabidka-oboru`. Sloučení patří do N0 (S1), jinak nemá generátor ani formulář zdroj ročníků.
- Oddíl 2 správně uvádí, že omezení počtu požadavků je jen v paměti instance; ověření „pravidla omezení ve firewallu Vercelu na našem tarifu" je další bod ověřovací brány N0 (S4).
- Odhad konverze 2–5 % je označený jako předpoklad — dobře; do N1 přidat, že Matomo cíl „potvrzení odběru" je součást „Hotovo, když", jinak se odhad nikdy nezměří.
- E-mail „Výsledky a 2. kolo" ráno v den výsledků předpokládá schválení konceptu předem; do N2 doplnit termín schválení nejpozději den před `ss-vysledky` a `k2-vysledky`, jinak nejcennější e-mail roku uteče.

## 5. Shrnutí postoje (kolo 1)

Návrh je obsahově i technicky dobře postavený a jeho jádro (kalendář jako zdroj termínů, e-maily ze schválených konceptů, dvojí potvrzení bez ukládání) oponentura podporuje. Spory jsou o plán a rámec, ne o fakta: vlastní harmonogram minuje první e-mail (S1), startovní segment nemá na webu obsah (S2), ročník 2028 by jedenáct měsíců mlčel (S3), doporučené úložiště zakládá druhý systém souhlasů na neověřených funkcích (S4), formulace souhlasu míchá rodiče a dítě (S5) a „dva produkty" předbíhají neschválené sledování (S6). Přijmout s úpravami: přecílit na SŠ vlnu, konzervatoře a ročník 2028 zatím nenabízet, úložiště rozhodnout spolu se sledováním, ověřovací bránu Resendu do N0.

## Historie

| Verze | Změna |
|---|---|
| 2.0 | Kolo 2 k návrhu v1.1: online ověření potvrzuje obě nová tvrzení (měření v Resendu výchozí vypnuté; firewall Vercelu na Pro jen IP/JA4, okno ≤ 10 minut), vypořádání kola 1 přijímám. Tři zbývající body: e-maily o nabídce nového roku mimo rytmus webu (M1), nedefinovaný mechanismus čtení e-mailů z nasazeného webu (M2), schéma odběru vylučuje oba druhy studia (M3). |
| 1.0 | První oponentura. Sedm sporných bodů S1–S7 k vypořádání, stanoviska k otevřeným otázkám 1–7, ověření kalendáře, míst formuláře, ochran, Matomo a ceníku Resendu. |
