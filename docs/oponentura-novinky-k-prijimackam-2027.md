# Oponentura k návrhu „Novinky k přijímačkám e-mailem"

Verze 3.0 · 18. 9. 2026 · Kolo 3 se vztahuje k [návrhu v1.14](novinky-k-prijimackam-2027.md). Kola 1 a 2 jsou archivována dole.

# Kolo 3: oponentura návrhu v1.14 — závěr: schvaluji, blokační nález žádný

**Vypořádáno v [návrhu](novinky-k-prijimackam-2027.md) v1.15, oddíl 12.** Body T1 až T4 přijaty všechny, T2 oběma nabídnutými cestami zároveň a T4 i s důvodem z registru, který jde dál než oponentura: květnové přepnutí `cermat-uchazeci-kolo1` je finální revize dat roku 2026, ne výsledky ročníku 2027. Oponentura návrhu je tím uzavřená, zbytek ověří přejímky N1 a N2.

## 0. Metoda

Přečetl jsem celou v1.14 včetně všech oddílů vypořádání (12 až 18) a ověřil tři věci nezávisle na textu: (1) že vypořádání M1–M3 z kola 2 je v normativních oddílech skutečně provedené, (2) že nová tvrzení v1.13/v1.14 o stavu realizace a registru datových sad jsou pravdivá, (3) zda rozhodnutí zadavatele ze 17. a 18. 9. 2026 nevyrobila rozpory mezi normativními oddíly 1–11.

## 1. Vypořádání bodů kola 2 potvrzuji

- **M1 — vypořádáno přesně podle návrhu oponentury.** Lednová zpráva „Školy vyhlašují kritéria" už nabídku na webu neslibuje: říká, že nabídku oborů pro rok 2027 zveřejňují školy ve svých kritériích a web ji bude mít až z otevřených dat CERMATu (oddíl 3). Březnová zpráva je přeformulovaná retrospektivně („kolik míst školy vypsaly a kolik přihlášek obory dostaly v 1. kole tohoto roku"), výslovně není výzvou k výběru a pro ročník, který se hlásí příště, se totéž zmíní v uvítání — tedy druhá, mírnější varianta, kterou jsem v M1 nabídl. Tvrzení historie v1.14, že věcná oprava existovala už ve verzích 1.2 (N9/N11 codexu) a 1.11 a chyběl jen její zápis do vypořádání kola 2, sedí s tabulkou Historie.
- **M2 — vypořádáno první z navrhovaných variant.** Manifest a zprávy leží v `public/novinky/{rocnik}/`, rozhodnutí 5 je přepsané na „odesílač čte e-maily z manifestu na nasazeném webu" a přejímka N2 ověřuje celou cestu schválení → nasazení → načtení manifestu → nanečisto odeslání. Ověřil jsem, že cesta `public/novinky/2027/*` nekoliduje s app routami `/novinky`, `/novinky/potvrzeni` apod. (žádná z nich se nepřekrývá se souborovou cestou).
- **M3 — vypořádáno, zamítnutí dílčí varianty přijímám.** Primární klíč `odber_novinek` je `(odberatel_id, rocnik, druh_studia)`, formulář dovolí zaškrtnout oba druhy studia a jedinečnost položky fronty `(odberatel_id, zprava)` vynutí, že společná zpráva odejde jednou. Hodnotu „ještě nevím" návrh zamítá s argumentem, že dva zaškrtnuté druhy dávají totéž a třetí stav by se musel někdy rozhodnout — argument uznávám, námitku stahuji.

## 2. Nezávisle ověřená nová tvrzení v1.13/v1.14

- **Stav realizace (oddíl 10) je pravdivý.** Větev `feat/novinky-odber` existuje a nese `db/migrace/001-novinky.sql`, knihovny `src/lib/novinky-*.ts` (db, email, fronta, odběr, odesílač, rozpočet, šablony, token), sedm endpointů `src/app/api/novinky/*` včetně cronu a webhooku, stránky `/novinky` včetně potvrzení, správy a odhlášení, formulářové komponenty, generátor `scripts/novinky.py` se sedmi šablonami v `content/novinky/sablony/` a čtyři testovací soubory. Poslední commit větve řeší odesílání z hlavní domény, což odpovídá rozhodnutí z 18. 9.
- **Časování datových sad podle registru** (`public/stav_datovych_sad.json`): `cermat-uchazeci-kolo1` (zdroj pásem přijetí) se čeká 2027-05 — tedy uvnitř sezóny ročníku 2027, jak rozhodnutí 8 tvrdí. `cermat-kapacity` a `cermat-prihlasky` se čekají 2027-03, `msmt-harmonogram` pro 2028 v 2027-08. Rozpětí v oddílu 8 sedí.

## 3. Nové nálezy kola 3 (žádný není blokační)

### T1 — Normativní oddíly si po rozhodnutích z 18. 9. odporují

Oponentura se vždycky soustředila na to, co text slibuje; teď poprvé text slibuje dvě různé věci zároveň, protože rozhodnutí zadavatele ze 17.–18. 9. se propsala jen do části oddílů:

1. **Hlavička** tvrdí „Návrh k rozhodnutí, nic není implementované", zatímco oddíl 10 popisuje hotovou migraci, knihovny, endpointy, formuláře, stránky a generátor s 50 testy na větvi `feat/novinky-odber` (ověřeno výše, stav je pravdivý — nepravdivá je hlavička).
2. **Oddíl 10** uvádí jako nespuštěné „odesílací subdoména s DNS" a „právní kontrola zásad" — ale rozhodnutí z 18. 9. (oddíly 6 a 11) subdoménu ruší a právní kontrolu schvaluje. Snapshot je datovaný k 17. 9., čtenář plánu N0 ale z aktuální verze dokumentu dostane úkol, který se nemá dělat.
3. **Oddíl 2** tvrdí, že tarif Resendu s 50 000 e-maily je „neověřený" a že frekvenci cronu „z repozitáře ověřit nelze" — zatímco oddíl 11 zaznamenává, že zadavatel 18. 9. kvótu Resendu i frekvenci cronu ověřil a „limity neblokují".
4. **Krok 5.5** říká, že „podpora značek u dávkového odeslání se ověřuje v N0" — zatímco oddíl 11 řadí značky u dávek mezi věci, které „nestojí v cestě" (tedy ověřené 18. 9.).

**Vypořádání:** protože oddíl 6 je prohlášen závazným kontraktem a oddíly 12–18 historií, musí být vzájemně konzistentní právě oddíly 1–11. Stačí: hlavičku přepsat na „rozhodnuto, implementace čeká na účty", oddíl 10 předat k 18. 9. (škrtnout subdoménu a právní kontrolu ze zbývající práce) a v oddílu 2 a kroku 5.5 doplnit u příslušných řádků „ověřil zadavatel 18. 9. 2026".

### T2 — Žádost `novy_rocnik` ve stavu `ceka_na_vyzvu` nemá cestu k výmazu

Oprava K5 (kolo 5 codexu) zavedla žádost se stavem `ceka_na_vyzvu` a prázdným `plati_do`; `plati_do` se doplní až transakcí, která se spustí **známým výsledkem položky výzvy**. Když ale výsledek nikdy nedorazí — položka výzvy přejde po 24 hodinách na `neurcita` (krok 5.7) a člověk dávku nevyřídí, nebo se webhook ztratí — žádost zůstane ve stavu `ceka_na_vyzvu` s `plati_do = null` **bez jakékoli lhůty**: retenční úklid je klíčovaný na lhůty (`plati_do`, `ceka_do`) a doba uložení „žádost 30 dnů" se bez `plati_do` nedá spočítat. Krok 8 pomáhá jen částečně: při trvalém nedoručení maže **odběry**, ale příjemce výzvy žádný odběr nemá (jeho ročník skončil), takže se na něj pravidlo nevztahuje.

**Vypořádání:** stačí jedna věta v poznámkách ke schématu: žádost `novy_rocnik` ve stavu `ceka_na_vyzvu` se maže podle `vytvoreno` (např. po 40 dnech = 30denní lhůta + rezerva), nebo se ruší při přechodu položky výzvy na `neurcita`/`zahozena`.

### T3 — One-click odhlášení po M3 nemá jednoznačný cíl

Krok 7 říká, že odhlášení „zruší odběr té zprávy, ze které odkaz vede". Po M3 má ale odběratel až **dva** odběry (`ss` + `vicelete`) a společná zpráva (např. „Přihlášky", segment `[ss, vicelete]`) odchází pod jedním `polozka_id` oběma. „Odběr té zprávy" neexistuje — zpráva není klíč tabulky `odber_novinek` a k jedné položce fronty se vážou dva záznamy odběru. Přejímací zkouška N1 „odhlášení jedním kliknutím ruší jen jeden účel" je tak pro společné zprávy neověřitelná, dokud se nedefinuje, co je v tomto případě „účel".

**Vypořádání:** stanovit, že one-click ze zprávy ruší **všechny odběry příjemce v segmentech té zprávy** (u společné zprávy oba — kdo dostal jeden e-mail za obě děti, zrušení obou pochopí) a krok 7 přepsat z „odběru té zprávy" na „odběry v segmentech zprávy". Případně opačně, jen jeden segment — ale pak musí být určeno který.

### T4 — Rozhodnutí 8 slibuje plošné oznámení „výsledky 1. kola", které tabulka obsahu neimplementuje

Rozhodnutí 8 říká, že plošně se oznamují „nová nabídka oborů **a výsledky 1. kola**". Tabulka v oddílu 3 ale má řádek jen pro nabídku (spouštěč `cermat-kapacity` ∧ `cermat-prihlasky`); žádná zpráva není vázaná na přepnutí `cermat-uchazeci-kolo1`. Táže sada přitom podle registru čeká přepnutí v květnu 2027 — uvnitř sezóny — a zároveň z ní vycházejí „pásma přijetí", která rozhodnutí 8 výslovně posílá **jen jako zmínku** v nejbližším e-mailu. Text tak čte jedno přepnutí dvakrát a rozporně: jednou jako samostatnou zprávu, podruhé jako zmínku.

**Vypořádání:** doporučuji rozhodnutí 8 zúžit na „novou nabídku oborů" a výsledky 1. kola výslovně zařadit mezi zmínky v nejbližším e-mailu, stejně jako pásma — odběratelé ročníku 2027 své výsledky v květnu už znají od škol, takže hodnota samostatné zprávy by byla opět jen retrospektivní (stejný argument jako u M1). Alternativa je doplnit řádek se spouštěčem `cermat-uchazeci-kolo1`, ale to považuji za horší.

## 4. Stanovisko k v1.14

**Návrh v1.14 schvaluji; blokační nález kolo 3 nemá.** Všechny tři sporné body kola 2 jsou vypořádané věcně i v textu a nová tvrzení o stavu realizace a registru jsem ověřil jako pravdivá. Nálezy T1–T4 jsou synchronizační a doprecizovací (jedna věta až pár řádků), ne koncepční; jejich zápis do textu doporučuji ještě před zahájením N0, protože oddíly 1–11 jsou jediná část, ze které se bude realizovat. Souhlasím rovněž s doporučením oddílu 18 oponenturu oddílu 6 ukončit: souběh je prokazatelný v přejímkách N1/N2, ne v dokumentu, a přejímací zkoušky jsou na tyto případy napsané.

---

# Kolo 2: oponentura návrhu v1.1 (archiv, 17. 9. 2026)

**Vypořádáno v [návrhu](novinky-k-prijimackam-2027.md) v1.14, oddíl 12.** Všechny tři sporné body i pět drobností přijaty; M1, M2 a M3 se částečně kryjí s body N9, N11 a N6 [oponentury codexu](podklady/oponentura-codex-novinky-2027.md), která posuzovala tutéž verzi 1.1 nezávisle. Porovnání obou oponentur je v témže oddílu. Nepřijata zůstala jediná dílčí varianta: hodnota „ještě nevím“ u druhu studia, protože dva zaškrtnuté druhy dávají totéž.

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
| 3.0 | Kolo 3 k návrhu v1.14: vypořádání M1–M3 potvrzeno v textu i nezávislým ověřením (stav realizace na `feat/novinky-odber` a časování sad v registru jsou pravdivé). **Návrh schvaluji, blokační nález žádný.** Čtyři nové neblokační nálezy: T1 rozpory mezi normativními oddíly po rozhodnutích z 18. 9. (hlavička „nic není implementované" vs. hotová realizace, subdoména a právní kontrola v oddílu 10, neověřenost tarifu a značek v oddílech 2 a 6), T2 žádost `novy_rocnik` ve stavu `ceka_na_vyzvu` nemá cestu k výmazu, T3 one-click odhlášení po M3 nemá jednoznačný cíl u společné zprávy obou segmentů, T4 rozhodnutí 8 slibuje plošné oznámení výsledků 1. kola, které tabulka obsahu neimplementuje. |
| 2.0 | Kolo 2 k návrhu v1.1: online ověření potvrzuje obě nová tvrzení (měření v Resendu výchozí vypnuté; firewall Vercelu na Pro jen IP/JA4, okno ≤ 10 minut), vypořádání kola 1 přijímám. Tři zbývající body: e-maily o nabídce nového roku mimo rytmus webu (M1), nedefinovaný mechanismus čtení e-mailů z nasazeného webu (M2), schéma odběru vylučuje oba druhy studia (M3). |
| 1.0 | První oponentura. Sedm sporných bodů S1–S7 k vypořádání, stanoviska k otevřeným otázkám 1–7, ověření kalendáře, míst formuláře, ochran, Matomo a ceníku Resendu. |
