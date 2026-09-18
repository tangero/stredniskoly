# Novinky k přijímačkám e-mailem

Verze 1.15 · 18. 9. 2026 · Návrh k rozhodnutí, nic není implementované. Vypořádána [oponentura v1.0](oponentura-novinky-k-prijimackam-2027.md) (oddíl 12) a [oponentura codexu](podklady/oponentura-codex-novinky-2027.md), kola 1 až 5 (oddíly 13 až 17). **Oddíl 6 zadavatel schválil 17. 9. 2026** ve všech pěti částech, včetně volby databáze Neon. Oprava podle kola 5 (číslo pokusu u dávky, oddělené účtování dávky a výsledků položek, rezervace kvóty v období možného odeslání) ale **oponenturou neprošla**, protože dohodnutý počet pěti kol je vyčerpán. **Závazný implementační kontrakt je oddíl 6**; oddíly 12 až 16 zaznamenávají cestu k němu a starší formulace v nich jsou historické.

Návštěvník webu zadá e-mail a během přijímacího řízení dostává s předstihem připomínky termínů a pokyny, co je potřeba připravit. Na rozdíl od [sledování škol a oborů](sledovani-skol-2027.md) (větev `docs/sledovani-skol-a-oboru`, v2.1) dostanou všichni odběratelé téhož ročníku a druhu studia stejný obsah. Návrh navazuje na [kalendář přijímaček](aktualizace-kalendar-data-2027.md) (`src/data/admissions-2027.json`, sada `msmt-harmonogram` v registru na větvi `feat/titulka-nabidka-oboru`) a na [analýzu návštěvnosti](analyza-navstevnosti-2026.md).

## 1. Hlavní rozhodnutí

1. **Novinky se spustí samostatně, sledování se připojí v N4.** Sledování škol a oborů zadavatel schválil 17. 9. 2026, ale novinky na něj nečekají: společný formulář „sledovat školu / odebírat termíny“ a jedna správa odběrů vzniknou ve fázi N4, až bude sledování mít fungující odesílač. Obě funkce ukládají odběratele do stejné databáze (bod 7), takže spojení nepotřebuje žádný převod dat.
2. **Novinky se spustí dřív než sledování.** Nepotřebují záznam událostí ani převod klíčů oborů, stačí jim kalendář MŠMT, který web už má.
3. **Je to jeden newsletter bez ročníku a bez segmentů** (rozhodnutí zadavatele 18. 9. 2026). Formulář má jen e-mail a souhlas; neptá se na ročník, druh studia ani kraj. Odběr běží, dokud se člověk neodhlásí, takže se dá založit i rok dopředu a rodina mladšího dítěte nepotřebuje žádný obchvat. Termíny jednotné zkoušky se posílají **všem v jedné zprávě** s větou, který den platí pro čtyřleté obory a který pro víceletá gymnázia. **Konzervatoře se neposílají**, protože je web nepokrývá; jejich termíny zůstávají v kalendáři.
4. **Termíny v e-mailu se berou z kalendáře, ne z textu.** Šablona odkazuje na událost (`ss-prihlasky`) a generátor doplní datum a rok ze souboru kalendáře. Letopočet se do šablon nepíše. Každá zpráva má výslovně uvedený **druh spouštěče**: potvrzení odběru, kalendářní událost, redakční datum, nebo publikace dat (oddíl 3).
5. **Každý e-mail vzniká v repozitáři a odejde jen po sloučení pull requestu.** Texty procházejí [slovníkem pojmů](slovnik-pojmu.md) stejně jako stránky webu. Odesílač čte e-maily z **manifestu na nasazeném webu**, takže nic neodejde bez revize a bez nasazení (oddíl 7).
6. **Formulář je výrazný, ale nevyskakuje.** Má stálé místo na titulní stránce, v patičce a u kalendáře. Vyskakovací okno ani lišta přes obsah se nepoužijí.
7. **Odběratelé leží ve vlastní databázi Neon Postgres, e-maily odcházejí jako dávky transakčních e-mailů Resendu.** Omezení počtu potvrzovacích e-mailů na jednu adresu potřebuje úložiště tak jako tak. Kontakty Resendu by tedy byly druhým úložištěm souhlasů, ne náhradou databáze (oddíl 6).
8. **Obsah je dvojí: termíny přijímacího řízení a zprávy o nových datech na webu** (rozhodnutí zadavatele 18. 9. 2026). Plošně se oznamují jen velké změny dat, které se týkají přijímaček: nová nabídka oborů a výsledky 1. kola. **Sezóna ročníku je od otevření odběru do poslední události ročníku v kalendáři**, tedy pro rok 2027 do 22. 6. 2027. Pásma přijetí vycházejí z dat uchazečů zpravidla v květnu, tedy uvnitř sezóny, ale týkají se **minulého** ročníku: zmíní se v nejbližším e-mailu, samostatný nedostanou. Maturita a inspekce patří do sledování školy, doprava ani revize nikam.
9. **Odhlašuje se odběr, ne člověk.** Odhlášení termínů ruší jen odběr termínů. Odběratel se smaže, jakmile mu nezbývá žádný odběr ani čekající požadavek; doklad souhlasu a evidence odeslání se od něj **odpojí a zůstanou bez adresy**, jen s jejím otiskem (oddíl 6). Samostatný účel „zpráva o dalším kalendáři“ i budoucí sledování školy zůstávají odhlášením termínů nedotčené.
10. **Odesílač posílá splatné a dosud neodeslané zprávy, ne „dnešní“.** Každá zpráva má datum splatnosti a **konec užitečnosti**; po něm se neodesílá a hlásí se to jako chyba. Výpadek jednoho dne tedy zprávu neztratí (oddíl 6).
11. **Všechny e-maily jdou jednou frontou a mají pevnou hranici předání.** Potvrzení, uvítání i obsahové zprávy mají ve frontě položku, která vzniká dřív než volání Resendu. Před voláním se trvale zapíše, že odeslání mohlo začít; od té chvíle se tělo požadavku ani klíč nemění a odhlášení položku neruší. Kvóta se rezervuje předem, ne účtuje dodatečně (oddíl 6).
12. **Potvrzení odběru je aktivní krok člověka.** Odkaz v e-mailu jen otevře stránku, odběr založí až odeslání formuláře na ní. Samotné načtení odkazu robotem poštovního systému odběr nezaloží a potvrzovací odkaz platí jen jednou.
13. **Do potvrzení se ukládá žádost, ne odběr.** Žádost nese adresu, volby a verzi souhlasu, platí 72 hodin a pak se sama maže. Odběr, doklad souhlasu ani identita odběratele do potvrzení nevznikají (oddíl 6).

## 2. Co máme a co chybí

Stav kódu a dat ověřen v repozitáři. **Stav účtů u služeb (tarify, zapnuté funkce, nastavení domény, konfigurace Matoma na serveru) z repozitáře ověřit nelze**; takové řádky jsou označené jako neověřené a jejich kontrola patří do N0.

| Potřeba | Stav | Kde |
|---|---|---|
| Odesílání e-mailů | **máme** volání Resendu přes `fetch`, odesílatel `noreply@prijimackynaskolu.cz`; tarif Pro s 50 000 e-maily měsíčně je **neověřený** (mimo repozitář) | `src/lib/portal-email.ts:7`, `src/app/api/bug-report/route.ts` |
| Měření otevření a kliknutí v Resendu | Resend je nastavuje **pro celou doménu** a výchozí stav je vypnuto (dokumentace ověřena 17. 9. 2026); skutečné nastavení naší domény je **neověřené** | nastavení domény, kontrola v N0 |
| Podepsaný odkaz bez hesla | **máme** HMAC-SHA256 s časově konstantním porovnáním a expirací; **není jednorázový**, `nonce` se nikde nespotřebovává | `src/lib/portal-magic.ts:32`, `:58` |
| Ochrana formuláře | skryté pole, kontrola počtu odkazů; omezení počtu požadavků **jen v paměti instance** | `src/app/api/bug-report/route.ts:14`, `:51`, `:189` |
| Omezení požadavků ve firewallu Vercelu | **dostupné** na tarifu Pro, ale jen podle IP adresy nebo otisku JA4 a s oknem nejvýš 10 minut; limit na adresu e-mailu za den neudrží (ověřeno 17. 9. 2026) | nastavení projektu |
| Termíny ročníku | **máme** 20 událostí ve třech skupinách, ICS export; generátor kalendáře má ale **rok 2027 napevno** v názvu, UID, URL i ve jménech vstupu a výstupu | `src/data/admissions-2027.json`, `scripts/generate-admissions-calendar.py:26`, `:37` |
| Sada `msmt-harmonogram` v registru | **jen na nesloučené větvi** `feat/titulka-nabidka-oboru` (období 2027, obnova do 30. 9. 2027) | `public/stav_datovych_sad.json` |
| Úložiště odběratelů | **chybí**; sledování v2.1 navrhuje Neon | viz oddíl 6 |
| Plánovač | Vercel Cron **není** v `vercel.json`; duplicitní spuštění cronu Vercel připouští a doporučuje zámky i idempotenci; neúspěšný běh sám neopakuje. Kolikrát denně smí cron běžet, závisí na tarifu, který z repozitáře ověřit nelze | `vercel.json` |
| Jarní importér kapacit a přihlášek | **chybí**; registr to uvádí a zpracovatel v datové lince není | `public/stav_datovych_sad.json`, `scripts/linka/zpracovani.py` |
| Zásady ochrany osobních údajů | **chybí** úplně a musí vzniknout před N1 (oddíl 5) | — |
| Souhlas s měřením | **vyřešeno mimo tento návrh**: zadavatel 17. 9. 2026 potvrdil, že **Matomo má schválení a smí měřit bez souhlasové lišty**. Novinky tedy na rozhodnutí o analytice nečekají; podklad schválení tento návrh nedokládá a patří do zásad | `src/app/layout.tsx:88`, `:94` |

## 3. Co budeme posílat

Kalendář 2027 dává pevné body, ke kterým se většina zpráv váže. Sloupec **spouštěč** říká, odkud se datum bere; generátor zná jen tyto čtyři druhy a pátý nezná (oddíl 7). Data odeslání jsou spočítaná z `admissions-2027.json`.

| E-mail | Spouštěč | Datum odeslání 2027 | Komu | Obsah |
|---|---|---|---|---|
| **Uvítání** | potvrzení odběru | okamžik potvrzení, posílá se hned | všem | přehled termínů ročníku, odkaz na kalendář a ICS, co dělat teď podle měsíce. **Podmíněný blok** o datech, která na web přibyla, se vypíše jen tehdy, když od přepnutí sady uplynulo méně než dva měsíce; nový odběratel jinak žádný „poslední e-mail“ nemá |
| Výběr školy a dny otevřených dveří | redakční datum | **7. 12. 2026**, jen pokud je N2 hotová; jinak se obsah přesune do uvítání | všem | jak vybírat, co se ptát, odkaz na simulátor a stránky škol |
| **Školy vyhlašují kritéria** | `ss-kriteria` minus 3 dny | **12. 1. 2027** | všem | co v kritériích hledat: požadavek školy, hranice úspěšnosti, školní zkouška. **Nabídku oborů pro rok 2027 zveřejňují školy ve svých kritériích**, web ji bude mít až z otevřených dat CERMATu. **První e-mail, který musí odejít** |
| **Přihlášky** | `ss-prihlasky` minus 5 dní | **27. 1. 2027** | všem | jak podat přihlášku, pořadí na přihlášce („šanci na přijetí nemění, škola řadí jen podle svých kritérií“), přílohy |
| **Připomínka přihlášek** | konec `ss-prihlasky` minus 4 dny | **18. 2. 2027** | všem | přihlášky se podávají do 22. 2. 2027 |
| Nová data o 1. kole na webu | publikace dat: přepnutí `cermat-kapacity` **a** `cermat-prihlasky` | podle přepnutí, nejdřív po jarním importu | všem | **retrospektivně**: kolik míst školy vypsaly a kolik přihlášek obory dostaly v 1. kole tohoto roku. Není to výzva k výběru, protože odběratelé ročníku už přihlášky podali; pro ročník, který se hlásí příště, se totéž zmíní v uvítání |
| Školní a talentové zkoušky | `ss-skolni` minus 7 dní | **8. 3. 2027** | všem | pozvánka od školy, náhradní termíny 26. 4. – 5. 5. 2027 |
| **Jednotná zkouška** | `jpz-4-1` minus 10 dní | **2. 4. 2027** | všem | všechny čtyři dny (12. a 13. 4. pro čtyřleté obory, 14. a 15. 4. pro víceletá gymnázia) s větou, který pro koho platí; co s sebou, náhradní termíny 29. a 30. 4. |
| **Výsledky a 2. kolo** | `ss-vysledky` | **14. 5. 2027** ráno | všem | jak zjistit výsledek; co když se uchazeč nedostal nikam: školy vyhlásí obory a kritéria 2. kola 14.–18. 5. a **přihlášky do 2. kola se podávají jen 19.–24. 5. 2027** |
| Výsledky 2. kola a konec ročníku | `k2-vysledky` | **22. 6. 2027** | všem | co dál; odběr ročníku končí, nabídka jedné zprávy o dalším kalendáři pro mladšího sourozence |

Z pevného plánu vychází **v lednu 2027 dvě zprávy, v únoru jedna**; víc jich v měsíci bude jen tehdy, když se sejde se zprávou o datech nebo s uvítáním nových odběratelů. Dřívější tvrzení „v únoru dvě až tři“ bylo nepodložené.

**Schválení:** pull request se zprávou musí být sloučený a nasazený **nejpozději den před datem odeslání**. U zprávy „Výsledky a 2. kolo“ se připravuje týden předem, protože je to nejcennější zpráva ročníku.

**Konec užitečnosti** má každá zpráva ve svém frontmatteru a je to den, po kterém by už pokyn nikomu nepomohl, **ne den, kdy skončí první z popsaných termínů**. Připomínka přihlášek ho má na 22. 2. 2027 (konec podávání přihlášek), zpráva o výsledcích a 2. kole na 24. 5. 2027, tedy na poslední den podávání přihlášek do 2. kola: kdo ji dostane 20. května, ještě přihlášku podat může. Po konci užitečnosti se zpráva neodešle a odesílač to ohlásí (oddíl 6, průběh, krok 5).

**Konzervatoře:** ročník 2027 je nemá (rozhodnutí 3). Segment se otevře, až web obory bez jednotné zkoušky pokryje. Termíny konzervatoří zůstávají v kalendáři na webu.

Pravidla textu:

- Rok vždy výslovně, bez slov „letos“ a „loni“ ([slovník pojmů](slovnik-pojmu.md), §5).
- Žádná čísla ze slovníku ukazatelů bez kontextu stránky. E-mail zve na stránku, sám nic nesrovnává.
- U každého termínu odkaz na zdroj MŠMT a věta „přesný čas a místo ověř v kritériích školy“, stejně jako v kalendáři.
- Tyká se, stejně jako na titulní stránce, a oslovuje se rodina, ne jen rodič nebo jen uchazeč (oddíl 5).

## 4. Kam dát formulář

Nejvíc návštěv měl web v únoru a květnu (4 969 a 4 435 identifikovaných návštěvníků za měsíc v roce 2026). Podzimní návštěvnost změřená není. Formulář proto musí být na webu nejpozději **1. 12. 2026**, s rezervou před kritérii a přihláškami.

| Místo | Rozhodnutí | Proč |
|---|---|---|
| **Titulní stránka, tmavá karta „Přijímačky 2027“** (`src/app/page.tsx`), pod větou o termínech přihlášek | **použít, hlavní místo** | karta už mluví o termínech, formulář v ní na „Termíny už známe“ přirozeně navazuje |
| **Titulní stránka, modrý pás „Vyzkoušej zdarma“** na konci | **zavrhnout pro první verzi** (rozhodnutí 18. 9. 2026) | tři místa stačí na ověření; každé další je plocha na chyby |
| **Patička na všech stránkách** | **zavrhnout pro první verzi**, zůstane jen odkaz na `/novinky` | formulář v patičce se vykresloval na 1 179 stránkách škol a build narážel na časový limit; odkaz stojí nic |
| **Kalendář `/prijimacky-2027`**, vedle „Ulož si termíny“ | **použít, výrazně** | stránka dnes píše, že se stažená kopie sama neaktualizuje, a odběr je přesně odpověď na to |
| **Stránka školy a oboru** | **malý odkaz pod hlavičkou**; společný panel se sledováním až podle rozhodnutí 1 | sledování zakazuje tlačítko dřív, než funguje odesílač |
| **Simulátor a zvažované obory** | **použít** jako větu pod seznamem: „Připomeneme ti termín přihlášek“ | rodině se zvažovanými obory se termín přihlášek hodí nejvíc |
| **Konec průvodců** `/jak-vybrat-skolu`, `/jak-funguje-prijimani`, `/vysledky/…`, `/mesto/…` | **použít** jako kartu na konci článku | kdo dočte průvodce, zajímá se o celý postup |
| **Hlavička webu**, odkaz se zvonkem „Termíny e-mailem“ | **použít** | vede na stránku `/novinky` |
| **Samostatná stránka `/novinky`** | **použít** | adresa pro sdílení a pro výchovné poradce: ukázka e-mailu, přehled obsahu a termínů, formulář, QR kód |
| Vyskakovací okno při vstupu nebo odchodu | **zavrhnout** | vtíravé, sledování v2.1 ho zamítá ze stejného důvodu; na telefonu zakryje obsah |
| Lepicí lišta dole na telefonu | **zavrhnout pro první verzi** | dole už plave „Nahlásit chybu“; zvážit v únoru, pokud bude přihlašování slabé |
| Předzaškrtnutý odběr v jiném formuláři (hlášení chyby, portál) | **zavrhnout** | souhlas musí být aktivní |

„Lavičku“ ze zadání chápu jako patičku. Pokud byla myšlena horní lišta, pokrývá ji odkaz v hlavičce.

Podoba formuláře:

```text
┌ Novinky k přijímačkám e-mailem ────────────────────────────────────┐
│ Pošleme ti s předstihem termíny přijímacího řízení 2027           │
│ a napíšeme, co je potřeba připravit: kritéria, přihlášky, jednotná │
│ zkouška, výsledky a 2. kolo. K tomu zprávu, když na web přibudou   │
│ nová data.                                                         │
│ [ e-mail                         ]  [ Odebírat novinky ]           │
│ [ ] Odběr zakládám pro sebe nebo své dítě a je mi alespoň 15 let.   │
│ Nejvýš pár e-mailů měsíčně. Odhlásit se jde jedním kliknutím.      │
│ Zásady ochrany osobních údajů                                      │
└────────────────────────────────────────────────────────────────────┘
```

- **Souhlas se zaškrtává vždy v prvním kroku**, na každém místě formuláře včetně patičky. Bez zaškrtnutí se potvrzovací e-mail neposílá. Formulář v patičce je zkrácený jen o vysvětlující text, ne o souhlas.
- **Druh studia jde zaškrtnout oba** (rodič dvou dětí). Zpráva, která se týká obou, se pošle jednou.
- **Kraj je nepovinný** (rozhodnutí zadavatele 17. 9. 2026). Do doby, než vznikne krajský obsah, na něj **nic nestojí**: nepoužívá se k segmentaci odeslání ani k výběru příjemců, jen se ukládá. Formulář v patičce ho nemá vůbec, doplňuje se na potvrzovací stránce. Prázdná hodnota je platná a nesmí být důvodem k neodeslání.
- **Rok v textu** se bere ze zobrazeného období sady `msmt-harmonogram`. Formulář se zobrazí, jen když kalendář toho období obsahuje budoucí událost. Po poslední události ročníku formulář nabízí už jen zprávu o dalším kalendáři. Automatika tak nemůže nabídnout ročník, pro který obsah neexistuje.
- **Potvrzení má dva kroky** (rozhodnutí 12): odkaz z e-mailu vede na obslužnou cestu, která token ověří, vymění ho za krátkou relaci v cookie `HttpOnly` a **hned přesměruje na stránku bez tokenu**. Stránka ukáže rekapitulaci (adresa, ročník, druh studia, znění souhlasu) a tlačítko „Potvrdit odběr“; odběr vzniká až odesláním tohoto formuláře, které platnost i vazbu údajů ověří znovu. Stránka se v analytice neměří (oddíl 6, průběh, kroky 3 a 4).
- **Zpráva o dalším kalendáři** je samostatný účel s vlastním souhlasem a má tři stavy: `ceka` (nejdéle 18 měsíců od potvrzení), `vyzvan` (od odeslání výzvy běží 30 dnů, a to i kdyby původních 18 měsíců mezitím uplynulo) a `uzavren`. Rozhodující je vždy `ceka_do` toho stavu, v jakém záznam právě je. Po potvrzení nového odběru nebo po uplynutí lhůty se záznam smaže; doklad souhlasu k němu zůstává podle doby uložení. Souhlas se na nový ročník nepřevádí automaticky.
- **Opakované přihlášení** téže adresy nezakládá druhého odběratele: adresa se normalizuje (malá písmena, bez mezer) a připojí se k existující identitě. Změna adresy znamená nové ověření, staré odběry zůstanou do potvrzení nové adresy.
- Stavy: „Posílat termíny“ → „Potvrď v e-mailu“ → „Odebíráš termíny“. Stav si pamatuje prohlížeč a formuláře se pak na webu skryjí.

**Konzervatoře ve formuláři:** kalendář má budoucí termíny konzervatoří, takže se formulář zobrazí i rodině konzervatoristy. Proto je pod výběrem druhu studia jedna věta: „Konzervatoře zatím neposíláme, protože je web nepokrývá; jejich termíny najdeš v kalendáři.“ Bez ní působí nabídka rozbitě. Stejná věta je na `/novinky`.

**Mimo web:** stránka `/novinky` s QR kódem je určená výchovným poradcům základních škol a rodičovským skupinám. Adresy základních škol z rejstříku k oslovení **nepoužijeme**, viz oddíl 8.

## 5. Kdo se přihlašuje: věk, souhlas a práva

Uchazeči o víceleté gymnázium mají 11 až 13 let, uchazeči po 9. třídě 14 až 15. Český zákon o zpracování osobních údajů (110/2019 Sb., § 7) stanoví hranici pro souhlas dítěte se službami informační společnosti na 15 let; potvrzuje ji i základní příručka ÚOOÚ. Věk ani rodičovské oprávnění ale zaškrtnutí nedokazuje, jen o něm vypovídá.

- Souhlas je jedna pravdivá podmínka: **„Odběr zakládám pro sebe nebo své dítě a je mi alespoň 15 let.“**
- E-maily oslovují **rodinu**: tykají jako web a píšou tak, aby jim rozuměl rodič i uchazeč.
- Neptáme se na jméno, školu ani ročník dítěte ve škole. Povinné jsou jen adresa, druh studia a souhlas; **kraj je nepovinný** a slouží budoucím krajským zprávám.
- **Doklad souhlasu** (čl. 7 GDPR) se ukládá **do samostatné tabulky**, ne do odběru: účel, ročník, verze znění souhlasu, místo formuláře, čas potvrzení, čas zániku a den, kdy se doklad smaže. Odhlášení tedy smaže odběr a doklad zůstane po dobu uložení. Znění souhlasu je verzované v repozitáři, takže je zpětně dohledatelné, s čím kdo souhlasil.
- **Informační povinnost** (čl. 13 GDPR) plní stránka zásad: správce a jeho kontakt, účel, právní titul, rozsah, zpracovatelé (Vercel, Neon, Resend), doba uložení po jednotlivých druzích záznamů, práva na přístup, opravu, výmaz a odvolání souhlasu a postup, jak je uplatnit.
- **Právní kontrola: schváleno zadavatelem 18. 9. 2026.** Text zásad je na `/ochrana-osobnich-udaju`. Kontrola měla tři přejímací body: (1) znění souhlasu a jeho doklad, (2) text zásad včetně správce, zpracovatelů, dob uložení a **předání do třetích zemí**: Resend je americký zpracovatel a databáze Neon se zakládá **v evropském regionu**, takže zásady musí jmenovat právní základ přenosu, (3) oslovení v e-mailech, když souhlas dává rodič a obsah čte dítě. Změní-li se rozsah údajů nebo doby uložení, text se mění a kontrola se opakuje.
- Smlouvy se zpracovateli a regiony databáze jsou mimo repozitář; jejich prověření je úkol N0, ne tvrzení tohoto návrhu.

## 6. Úložiště a rozesílání

**Tento oddíl je závazný implementační kontrakt a zadavatel ho schválil 17. 9. 2026** v celém rozsahu: volba úložiště, tři druhy adresáta a tři účely žádosti, stavy a jejich přechody, tabulky i průběh. Oddíly 12 až 17 zaznamenávají, jak se k němu návrh dopracoval; kde se s nimi rozchází, platí oddíl 6.

| Varianta | Rozhodnutí | Proč |
|---|---|---|
| **B. Databáze Neon Postgres a dávky transakčních e-mailů** | **schváleno 17. 9. 2026** | omezení počtu potvrzení na adresu, jednorázovost žádosti, fronta odeslání a doklady souhlasu potřebují úložiště tak jako tak; jedno úložiště souhlasů pro novinky i sledování, jedna cesta k mazání; bezplatný Neon, Resend už používáme |
| A. Kontakty a rozesílky v Resendu | zavrhnout | argument „bez databáze“ neplatí; druhé úložiště souhlasů s vlastním odhlašováním a pozdější převod dat; marketingový tarif je zdarma jen do 1 000 kontaktů, pak od 40 USD měsíčně za 5 000, tedy v nejsilnější sezóně |
| C. Samostatná služba na newslettery (Ecomail, Mailchimp) | zavrhnout | další zpracovatel osobních údajů, texty mimo repozitář |
| D. Seznam v repozitáři nebo v GitHub issues | zavrhnout | repozitář je veřejný |

**Proč úložiště potřebuje každá varianta.** Formulář by šel zneužít k zahlcení cizí adresy potvrzovacími e-maily. Adresa, kterou oběť nikdy nepotvrdí, v Resendu jako kontakt nevznikne, takže kontrola „kontakt už existuje“ útok nezastaví. Firewall Vercelu počítá jen podle IP adresy a nejvýš po 10 minutách. Limity „nejvýš 3 potvrzení na adresu za 24 hodin“ a „denní rozpočet potvrzovacích e-mailů“ proto potřebují tabulku.

**Rozhodnutí o sledování na volbě nezávisí.** Pokud se sledování schválí, přidá do téže databáze své tabulky a přebere odhlašování i roční expiraci. Pokud ne, novinky mají vlastní malou databázi.

### Dva druhy adresáta

| Adresát | Kde je zapsaný | Co mu smí odejít |
|---|---|---|
| **žádost o potvrzení** | `zadost_o_potvrzeni`, platnost 72 h | jen potvrzovací e-mail té žádosti |
| **odběratel** | `odberatel` + `odber_novinek` | uvítání a všechny zprávy newsletteru |

Odběr je **jeden na odběratele**: nemá ročník, druh studia ani kraj. Ročník nese každá zpráva (bere se z registru), takže identifikátor zprávy koliduje jen v rámci ročníku. Uvítání má v identifikátoru `jti` žádosti: kdo se odhlásí a za měsíc přihlásí znovu, musí uvítání dostat znovu, a s pevným názvem by narazil na jedinečnost položky.

**Do potvrzení se ukládá žádost, ne odběr.** Žádost nese adresu, verzi souhlasu a zdroj; po 72 hodinách se sama maže. Odběr, doklad souhlasu ani identita odběratele do potvrzení nevznikají.

### Stavy a jejich přechody

```text
polozka_odeslani: ceka → pripravena → predavana → odeslana
                     ↓        ↓            ↓
                 zahozena  zahozena     neurcita
davka:            pripravena → predavana → odeslana | neurcita
                       ↓  ↘ chyba (prokazatelně neodesláno)
                    zrusena
```

Pravidla, na kterých stojí celý postup:

1. **Každý přechod je podmíněná aktualizace** (`update … where id = ? and stav = ? and pokus = ?`) a vyhrát ho může jen jeden zpracovatel. Kdo prohraje, nic neúčtuje a přečte si nový stav. **Pracovník si pamatuje číslo pokusu, které sám založil, a uvádí ho v každé své aktualizaci** — v předání, v uzavření, v chybové i rušící větvi. Starý pracovník tak nemůže převzít novější pokus téže dávky. Ověření pokusu je v téže transakci jako změna položek a rozpočtu.
2. **Hranice předání je commit transakce B**, tedy přechod dávky na `predavana`. Do té chvíle lze dávku zrušit, po ní už ne.
3. **Odhlášení a předání o hranici soutěží.** Odhlášení zkusí `update davka set stav='zrusena' where id = ? and stav = 'pripravena'`. Uspěje-li, dávka se nepředá vůbec: **její ostatní položky se vrátí na `ceka`**, odhlášená se přepne na `zahozena`, tělo dávky se smaže hned (obsahuje adresy) a rezervace kvóty se vypořádá. Vrácení ostatních položek je podstatné: transakce A vybírá jen stav `ceka`, takže bez něj by zbylých až 99 příjemců zprávu nikdy nedostalo. Neuspěje-li (dávka už je `predavana`), odhlášení odběr zruší, ale položku nechá dojít, protože e-mail už mohl odejít.
4. **Transakce B kontroluje složení.** Přechod proběhne jen tehdy, když `clenove_otisk` dávky odpovídá aktuálně rezervovaným položkám. Jinak se dávka zruší a sestaví znovu. Odhlášení mezi A a B tedy nemůže poslat e-mail někomu, kdo už odběr nemá.
5. **Tělo a klíč se mrazí při vzniku dávky** a od stavu `predavana` se nemění nikdy. Přeskládat příjemce lze jen u dávky `pripravena`.
6. **Evidence odeslání přežije adresáta.** Položka fronty se nemaže kaskádou; při smazání žádosti nebo identity se jen odpojí a zůstane v ní otisk adresy.

### Tabulky

Navazují na schéma sledování v2.1 (§7.2); `odberatel` je společný. Zakládají se v pořadí `odberatel`, `zadost_o_potvrzeni`, `davka`, `polozka_odeslani`, ostatní. Sjednocení obou návrhů patří do N4.

```sql
-- odberatel podle sledování v2.1 §7.2 (id, email unikátní, verze_klice)

create table zadost_o_potvrzeni (
  jti text primary key,
  email text not null,
  souhlas_verze text not null,
  zdroj text not null,
  vytvoreno timestamptz not null default now(),
  plati_do timestamptz not null,          -- vytvoreno + 72 h
  spotrebovano timestamptz
);

create table odber_novinek (              -- jeden odběr na odběratele
  odberatel_id uuid primary key references odberatel on delete cascade,
  zdroj text not null,                    -- místo formuláře: titulka-karta, kalendar, novinky
  potvrzeno timestamptz not null default now()
);

create table doklad_souhlasu (            -- přežívá zánik odběru i smazání identity
  id uuid primary key,
  odberatel_id uuid references odberatel on delete set null,
  email_otisk text not null,              -- HMAC adresy s odděleným tajemstvím
  souhlas_verze text not null,
  zdroj text not null,
  potvrzeno timestamptz not null default now(),
  zaniklo timestamptz,
  smazat_po timestamptz                   -- zaniklo + 3 roky
);

create table zprava_verze (
  zprava text not null,                   -- 'novinky/2027/kriteria'
  otisk_obsahu text not null,
  otisk_kalendare text not null,
  splatnost date not null,
  konec_uzitecnosti date not null,
  primary key (zprava, otisk_obsahu)
);

create table davka (
  id uuid primary key,
  zprava text not null,
  telo text not null,                     -- hotové serializované tělo požadavku
  telo_smazano boolean not null default false,
  otisk_tela text not null,
  clenove_otisk text not null,
  pokus int not null default 1,
  idempotency_key text not null unique,
  stav text not null check (stav in ('pripravena', 'predavana', 'odeslana',
                                     'chyba', 'zrusena', 'neurcita')),
  predano_v timestamptz,
  zalozeno timestamptz not null default now(),
  uzavreno timestamptz
);

create table polozka_odeslani (           -- fronta: jedna zpráva jednomu adresátovi
  id uuid primary key,
  zprava text not null,
  ucel text not null check (ucel in ('potvrzeni', 'uvitani', 'obsah')),
  odberatel_id uuid references odberatel on delete set null,
  zadost_jti text references zadost_o_potvrzeni on delete set null,
  adresat_otisk text not null,            -- HMAC adresy; zůstává i po odpojení
  stav text not null check (stav in ('ceka', 'pripravena', 'predavana',
                                     'odeslana', 'neurcita', 'zahozena')),
  davka_id uuid references davka,
  otisk_obsahu text,
  vlozeno timestamptz not null default now(),
  predano_v timestamptz,
  odeslano timestamptz,
  resend_id text,
  stav_doruceni text
);
-- jedinečnost podle adresáta: (odberatel_id, zprava) a (zadost_jti, zprava)

create table rezervace_kvoty (
  davka_id uuid references davka on delete cascade,
  pokus int not null,
  obdobi text not null,                   -- 'mesic:2027-01' | 'den:2026-11-03'
  ucel text not null,                     -- 'celkem' | 'potvrzeni'
  pocet int not null,
  volani_provedeno boolean not null default false,
  vyporadano timestamptz,
  primary key (davka_id, pokus, obdobi, ucel)
);

create table rozpocet_emailu (
  obdobi text not null,
  ucel text not null,
  limit_pocet int not null,
  rezervovano int not null default 0,
  spotrebovano int not null default 0,
  primary key (obdobi, ucel)
);

create table webhook_udalost (
  event_id text primary key,
  typ text not null,
  resend_id text,
  email_otisk text,                       -- HMAC adresy, ne adresa
  polozka_id uuid references polozka_odeslani on delete set null,
  telo_bez_adresy jsonb not null,
  prijato timestamptz not null default now(),
  zpracovano timestamptz,
  ucinek_hotov timestamptz                -- účinek (zrušení odběru) doběhl
);

create table limit_potvrzeni (
  otisk text primary key,                 -- HMAC adresy nebo IP
  pocet int not null,
  od timestamptz not null default now()
);
```

Poznámky ke schématu:

- **Identifikátor zprávy nese ročník** (`novinky/2027/kriteria`), takže zpráva dalšího ročníku s minulou nekoliduje.
- **Tělo dávky je text**, protože `jsonb` nezachová pořadí klíčů ani mezery a opakovaný pokus musí poslat tytéž bajty. Otisk se počítá nad tímto textem. **Tělo se maže teprve tehdy, když už ho žádná obnova nemůže potřebovat:** jsou známé výsledky všech položek dávky, nebo uplynulo okno opakování (24 hodin od `predano_v`), nebo je dávka `neurcita` déle než 30 dnů. Uzavření dávky (stav `odeslana`) samo tělo nemaže, protože výsledky některých položek mohou ještě chybět.
- **Evidence odeslání se neruší s adresátem.** Oba cizí klíče položky mají `on delete set null` a položka nese vlastní `adresat_otisk`, takže po smazání žádosti nebo identity zůstane doklad, co se komu odeslalo, bez adresy.
- **Do `webhook_udalost` se adresa neukládá**, jen její otisk a tělo bez adresy.
- **Doby uložení**: žádost 72 h (u účelu `novy_rocnik` 30 dnů); odběr do odhlášení nebo do konce ročníku; doklad souhlasu 3 roky po zániku účelu; `limit_potvrzeni` 30 dnů; `polozka_odeslani`, `davka`, `rezervace_kvoty` a `webhook_udalost` 12 měsíců; provozní záznamy Resendu podle jeho nastavení, na které nemáme vliv.
- **Co zbude po odhlášení:** doklad souhlasu s otiskem adresy a položky fronty s otiskem adresy. Adresa sama zmizí s identitou a s žádostí, **s jedinou výjimkou: v těle dávky zůstává, dokud je tělo potřeba pro obnovu**. To je do doby, kdy jsou známé výsledky všech položek, nejdéle 24 hodin od předání; u dávky, o které rozhoduje člověk (`neurcita`), nejpozději 30 dnů. Stránka zásad to říká takto přesně, ne zkratkou „zůstane jen otisk“.
- **Retenční úklid** je denní úloha a její selhání je předmětem dohledu (oddíl 10).

### Průběh

1. **`POST /api/novinky/prihlasit`** přijme adresu, druh studia (jeden nebo oba) nebo volbu „až vyjde další kalendář“, souhlas, verzi jeho znění, zdroj a skryté pole. Odpověď je vždy stejná. Limity: pravidlo ve firewallu Vercelu na IP adresu **v režimu blokování**, `limit_potvrzeni` na adresu a denní rozpočet potvrzení. V jedné transakci vznikne `zadost_o_potvrzeni` s účelem `novinky` nebo `kalendar` a položka fronty s účelem `potvrzeni`; pak se e-mail pošle hned (bod 5).
2. **Potvrzovací e-mail** nese token HMAC (`NOVINKY_SECRET`, vzor `portal-magic.ts`) s `jti` žádosti. Platnost tokenu je shodná s platností žádosti.
3. **`GET /api/novinky/potvrdit?t=…`** je obslužná cesta: ověří podpis, platnost a nespotřebovanou žádost, vymění token za **krátkou relaci v cookie `HttpOnly`** (vzor `src/app/admin/auth/route.ts`) a přesměruje na `/novinky/potvrzeni`, tedy na adresu bez tokenu. Nic nezakládá a nic neposílá, takže robot poštovního systému odběr nevytvoří. Stránka má `noindex` a neměří se; obslužná cesta a stránka mají různé adresy, takže se v Next.js nestřetnou.
4. **`POST /api/novinky/potvrdit`** přečte relaci, znovu ověří platnost i vazbu údajů a v jedné transakci: označí žádost `spotrebovano` (druhé použití odkazu tím padá), založí odběratele a odběr, zapíše `doklad_souhlasu` a vloží položku uvítání do fronty. Pak se uvítání pošle hned; když se to nepovede, pošle ho nejbližší běh odesílače.
5. **Odeslání jedné dávky.** Transakce jsou vymezené tak, aby pád nemohl zapomenout na provedené odeslání ani zaúčtovat jedno odeslání dvakrát.
   1. **Platnost zprávy** (splatnost, konec užitečnosti, soulad `otisk_kalendare` s nasazeným kalendářem) se ověřuje při naplnění fronty, při sestavení dávky, před předáním **a znovu před každým opakováním**, které může vyvolat odeslání. Prošlá položka se přepne na `zahozena` a ohlásí se.
   2. **Transakce A.** Vybere až 100 položek `ceka` téže zprávy příkazem `select … for update skip locked`, ověří podmínku účelu (potvrzení potřebuje platnou žádost, obsahová zpráva aktivní odběr, výzva čekající požadavek), sestaví hotové tělo, spočítá `otisk_tela` a `clenove_otisk` a vloží dávku příkazem `insert … on conflict (idempotency_key) do update set stav = 'pripravena', pokus = davka.pokus + 1, zalozeno = now() where davka.stav in ('chyba', 'zrusena')`. Tím se **prokazatelně neodeslaná dávka použije znovu s týmž klíčem** místo kolize na jedinečnosti; klíč idempotence zůstává stejný, protože tělo je stejné. **Nový pokus má vlastní rezervaci** (`rezervace_kvoty` je klíčovaná i podle `pokus`), takže se nesrazí s už vypořádanou rezervací předchozího pokusu a opožděný zpracovatel nemůže vypořádat rezervaci novějšího pokusu. Položky přepne na `pripravena`.
   3. **Rezervace kvóty** je součástí transakce A a je **společná pro všechny e-maily novinek**: nejdřív měsíční řádek `ucel = 'celkem'`, u potvrzení navíc denní řádek. Každá rezervace je podmíněná aktualizace `update rozpocet_emailu set rezervovano = rezervovano + :n where obdobi = … and ucel = … and rezervovano + spotrebovano + :n <= limit_pocet returning *` a zapíše se do `rezervace_kvoty`. Když některá neprojde, transakce se vrátí, položky zůstanou `ceka` a ohlásí se to. Souběžné dávky tak společný strop přečerpat nemohou. **Rezervace musí platit v období, ve kterém může dojít ke skutečnému odeslání**, ne v tom, kdy vznikla. Proto platí dvě pravidla: (a) před transakcí B se u dávky, jejíž rezervace patří jinému období než současnému, rezervace atomicky přenese do současného období (uvolní se stará, rezervuje nová; nepovede-li se to, dávka se zruší a položky zůstanou `ceka`); (b) **dávka se nepředává v posledních 10 minutách období** — do konce měsíce u řádku `celkem`, do konce dne u denního řádku potvrzení. Předání v takové chvíli se odloží a rezervace se pořídí rovnou na následující období. První volání proto nemůže spadnout do období, pro které kapacitu nemá.
   4. **Transakce B.** `update davka set stav='predavana', predano_v=now() where id = ? and pokus = ? and stav='pripravena' and clenove_otisk = ?` a totéž pro položky; `pokus` je ten, který pracovník sám založil. Ve stejné transakci se u všech rezervací tohoto pokusu nastaví `volani_provedeno = true`, protože po commitu B už volání může nastat. Když aktualizace neprojde, rozhoduje důvod: je-li dávka stále `pripravena`, ale se změněným složením (například kvůli odhlášení), zruší se, rezervace se vypořádá a zbytek se sestaví znovu; je-li už `predavana`, `odeslana` nebo `zrusena`, patří **jinému vítězi** a tento běh jen načte stav a skončí, nic neruší a nic neúčtuje. Commit. **Teprve teď** smí přijít volání Resendu.
   5. **Volání.** `POST /emails/batch`, nejvýš 100 adres, tělo přesně z `davka.telo`, hlavička `Idempotency-Key` z `davka.idempotency_key`, respektování `429` a `Retry-After`. Každý e-mail nese **značku (tag) s `polozka_id`**; podpora značek u dávkového odeslání se ověřuje v N0.
   6. **Transakce C: účtování dávky a výsledky položek jsou dvě různé věci.**
      - **Účtování dávky proběhne jednou.** `update davka set stav='odeslana', uzavreno=now() where id=? and pokus=? and stav='predavana'`. Účtuje se **velikost dávky**, ne počet známých výsledků, takže druhý zpracovatel nic nepřičte. Dávka se uzavře i tehdy, když je z odpovědi nebo z prvního webhooku zřejmé, že požadavek Resend přijal.
      - **Rezervace se vypořádávají samostatně a jednorázově, nezávisle na stavu dávky**: `update rezervace_kvoty set vyporadano=now() where davka_id=? and pokus=? and obdobi=? and vyporadano is null returning *`. Podle `volani_provedeno` se buď převede `rezervovano` na `spotrebovano` (volání nastalo), nebo se rezervace jen uvolní (prokazatelně nenastalo). Tím se vypořádá i rezervace, která vznikla později pro jiné období, a to i tehdy, když dávka už je `odeslana` nebo `neurcita`. Nevypořádané rezervace starší než hodinu hlídá dohled.
      - **Výsledek jednotlivé položky se doplňuje samostatně** a nezávisle na tom, kdo vyhrál přechod dávky: `update polozka_odeslani set stav='odeslana', resend_id=?, odeslano=? where id=? and stav='predavana'`. Webhook tedy smí doplnit položku i po uzavření dávky, a pozdní výsledek se neztratí.
      - Prokazatelná chyba bez odeslání (například `422`): dávka `chyba`, položky zpět na `ceka`, rezervace se vypořádá uvolněním.
   7. **Neznámý výsledek.** Když odpověď nepřijde, zůstane dávka `predavana` a rezervace platí. Obnova se řídí **chybějícími výsledky položek**, ne počtem webhooků:
      - **webhooky** se značkou `polozka_id` doplní, co dorazí, každý sám za sebe;
      - **zbývají-li položky bez výsledku** po 6 hodinách, je to do 24 hodin od `predano_v`, tělo dávky ještě nebylo smazáno (viz poznámka ke schématu) a **platnost zprávy podle 5.1 stále trvá**, odesílač zopakuje týž požadavek s týmž klíčem a týmiž bajty: Resend vrátí původní odpověď s identifikátory všech e-mailů, a pokud první pokus vůbec nedošel, e-maily odejdou teď. Přesahuje-li opakování do jiného období, musí se kapacita rezervovat i v novém období; stará nejistá rezervace se neuvolňuje;
      - **opakování se neprovede**, když platnost zprávy už netrvá, když v novém období není kapacita, nebo když od `predano_v` uplynulo 24 hodin. Položky bez výsledku pak jdou na `neurcita`, dávka rovněž, nic se neposílá a rozhodne člověk.
   8. **Osiřelá `pripravena`.** Dávka, která zůstane `pripravena` déle než 15 minut (pád mezi A a B), se přebírá obnovou: ověří se platnost zprávy i složení a pak se buď dokončí transakcí B, nebo se dávka zruší, rezervace vypořádá a položky vrátí na `ceka`. Přechod je podmíněný, takže původní běh a obnova se nemohou potkat.
   9. **Oprava textu už předané zprávy** se nikdy nedělá změnou klíče: je to **nová zpráva** s vlastním identifikátorem a schválením.
6. **Odesílač** je Vercel Cron na `/api/novinky/odeslat`, chráněný `CRON_SECRET`, dvakrát denně (ráno a večer) a navíc jako obnova nevyřízené práce. Frekvence závisí na tarifu Vercelu a patří do ověření v N0. Běh: naplní frontu z manifestu na nasazeném webu (oddíl 7), zahodí prošlé položky, odešle dávky podle bodu 5, dokončí obnovu podle 5.7 a 5.8 a vystaví výzvy k novému ročníku.
7. **Odhlášení jedním kliknutím** má přesný kontrakt podle RFC 8058: `List-Unsubscribe: <https://…/api/novinky/odhlasit?t=…>` a `List-Unsubscribe-Post: List-Unsubscribe=One-Click`, obě hlavičky pokryté podpisem DKIM. Endpoint přijímá **POST bez cookies a bez přesměrování** a v jedné transakci: zruší odběr té zprávy, ze které odkaz vede, zapíše dokladu `zaniklo` a `smazat_po` a vypořádá se s jeho položkami podle pravidla 3 v oddílu Stavy (položku `ceka` zahodí; u `pripravena` zkusí zrušit celou dávku; u `predavana` a pozdější nechá dojít). `GET` na tutéž adresu jen zobrazí stránku, aby skener odběr nezrušil. Odhlášení všech účelů je samostatná akce na stránce správy.

   **Platnost odkazů a token v adrese.** Odkazy na odhlášení a správu platí **400 dnů**, tedy déle než ročník: odkaz z lednového e-mailu musí fungovat i v květnu, jinak by tiše selhalo právo odhlásit se. Jednorázovost nehlídá token, ale stav v databázi, a neplatný odkaz vrací **chybu, ne úspěch**. Ruční kliknutí navíc token v adrese nenechává: obslužná cesta ho vymění za krátkou relaci v cookie a přesměruje na stránku bez tokenu, protože Matomo měří celý web a hlášení chyby posílá aktuální adresu.
8. **Webhooky** mají dvě třídy a `/api/novinky/resend-webhook` je zpracovává **v jedné transakci s vložením**; o účinku se rozhoduje **uvnitř** té transakce, takže duplicitní doručení sem vůbec nedojde a přehraný `email.bounced` nemůže zrušit nově založený odběr. Podpis se přijímá jen s časem do 5 minut. Dokončení účinku se značí `ucinek_hotov` a nedokončené dožene cron:
   - **události e-mailu** (`email.sent`, `email.delivered`, `email.bounced`, `email.complained`, `email.failed`, `email.delivery_delayed`) se párují podle značky `polozka_id`, jinak podle `resend_id`; nespárovaná událost čeká a spáruje se později. Trvalá nedoručitelnost a stížnost odběr smažou, `failed` a `delivery_delayed` jdou do hlášení;
   - **potlačení adresy** (`suppression.added`) se **nepáruje na položku vůbec**, protože nese jen adresu a identifikátor potlačení a může vzniknout i ručně u Resendu. Vyhodnocuje se podle normalizované adresy: zruší všechny odběry té adresy a další e-maily se jí neposílají.

   Příjem požadavku Resendem není doklad doručení.
9. **Kvóta a rozpočet.** Hlavička `x-resend-monthly-quota` udává **spotřebovanou** kvótu, ne zbývající; podle ní se **zakládá** `limit_pocet` měsíčního řádku `celkem`. Existující limit se nikdy nepřepisuje: snížení na nulu je pojistka v rukou člověka a cron by ji jinak po dvanácti hodinách smazal. Tento jediný řádek drží strop pro všechny e-maily novinek (obsah, uvítání, potvrzení) a je nastavený tak, aby zůstala **rezerva 5 000 e-mailů měsíčně** portálu a hlášení chyb; denní řádek potvrzení je jen doplňkové omezení proti zneužití formuláře. Portál a hlášení chyb dnes volají Resend přímo (`src/lib/portal-email.ts:16`, `src/app/api/bug-report/route.ts:80`) a do rozpočtu nepřispívají, takže rezerva zatím stojí na odhadu. **Zadavatel 17. 9. 2026 rozhodl je do společného rozpočtu převést ve fázi N4**; do té doby hlídá spotřebu dohled.

**Kapacita počítaná poctivě.** Nový lednový odběratel dostane potvrzení, uvítání, kritéria a přihlášky, tedy čtyři e-maily za měsíc. Při 10 000 takových odběratelů to je 40 000 e-mailů; se dvěma zprávami sledování 60 000, a to bez portálu. Tarif s 50 000 e-maily měsíčně tedy unese v nejsilnějším měsíci řádově **8 000 až 10 000 odběratelů jen pro novinky**, a jen pokud sledování běží zvlášť. Nad tím je potřeba vyšší tarif; rozhodnutí patří do N3, kdy už bude počet odběratelů známý.

**Připojení k databázi.** Interaktivní transakce A, B a C vyžadují `Pool` nebo `Client` ovladače Neonu; bezstavové HTTP rozhraní `transaction()` je neinteraktivní a na tento postup nestačí. Volba připojení patří do N1.

### Odesílací doména

**Rozhodnutí zadavatele 18. 9. 2026: posílá se z hlavní domény** `novinky@prijimackynaskolu.cz`, která je nastavená a ověřená. Odesílací subdoména se nezakládá.

Důsledek je potřeba pojmenovat: novinky tím **sdílejí reputaci i kvótu** s odkazy portálu pro školy a s hlášením chyb. Kdyby plošné zprávy někdo hromadně označil za spam, dopadlo by to i na přihlašovací e-maily škol. Proto k tomuto rozhodnutí patří tři pojistky:

1. **Umět plošné zprávy pozastavit** jedním přepínačem, zatímco provozní e-maily běží dál. Drží ho rozpočet kvóty: stačí snížit limit řádku `celkem` na nulu.
2. **Sledovat reputaci domény** (Postmaster Tools) a podíl stížností; nad 0,1 % se rozesílání zastaví a hledá se příčina.
3. **Rezerva 5 000 e-mailů měsíčně** pro portál a hlášení chyb má o to větší význam, protože novinky sahají do stejné kvóty.

SPF, DKIM a DMARC na hlavní doméně už platí pro dnešní provozní e-maily. Měření otevření a kliknutí zůstává vypnuté; N0 to ověří v nastavení domény přes API a test to hlídá.

## 7. Jak e-mail vzniká a jak se dostane k odesílači

```text
content/novinky/sablony/
  uvitani.md             # spoustec: potvrzeni
  vyber-skoly.md         # spoustec: redakcni, datum: 12-07, rok_posun: -1
                         #   (prosinec před ročníkem přijímaček)
  kriteria.md            # spoustec: kalendar, udalost: ss-kriteria, predstih_dni: 3,
                         #   konec_uzitecnosti: konec udalosti, segment: [ss, vicelete]
  prihlasky.md           # spoustec: kalendar, udalost: ss-prihlasky, predstih_dni: 5
  prihlasky-konec.md     # spoustec: kalendar, udalost: ss-prihlasky, vztah: konec,
                         #   predstih_dni: 4, konec_uzitecnosti: konec udalosti
  jpz-ctyrlete.md        # spoustec: kalendar, udalosti: [jpz-4-1, jpz-4-2,
                         #   jpz-nahradni-1, jpz-nahradni-2], predstih_dni: 10
  vysledky-a-druhe-kolo.md
  nova-nabidka-oboru.md  # spoustec: publikace, sady: [cermat-kapacity, cermat-prihlasky]
  ...
public/novinky/2027/
  manifest.json              # index zpráv: identifikátor, datum, konec užitečnosti, otisk
  kriteria.json              # předmět, HTML, textová verze, segment, otisk kalendáře
```

- **Čtyři druhy spouštěče** (rozhodnutí 4): `potvrzeni` (uvítání), `kalendar` (událost a předstih), `redakcni` (pevný den a povinný `rok_posun` vůči ročníku přijímaček, protože ročník je rok nástupu, takže prosinec 2026 je `-1`) a `publikace` (přepnutí jmenovaných sad v registru). Jiný druh generátor odmítne. Chybějící událost u spouštěče `kalendar` je chyba, ne tiché přeskočení.
- `scripts/novinky.py plan` vypíše, co a kdy se má v otevřeném ročníku odeslat, včetně konců užitečnosti.
- `scripts/novinky.py priprav <sablona>` doplní data a rok z `admissions-{rok}.json`, vyrobí předmět, HTML a textovou verzi, uloží **otisk kalendáře**, ze kterého data vzal, zapíše zprávu do `public/novinky/{rocnik}/` i do manifestu a otevře pull request. Správce dostane zprávu do Telegramu.
- **Schválení je sloučení pull requestu a nasazení.** Zprávy leží v `public/`, takže je Next.js po nasazení obsluhuje na veřejné adrese a odesílač čte tentýž obsah, jaký je na webu. Po nasazení kontroluje N2 dostupnost manifestu i zprávy.
- **Změna kalendáře po schválení** se pozná z otisku: odesílač zprávu neodešle a vyžádá nové schválení. Bez toho by opravený termín MŠMT odešel ve staré podobě.
- **Zpráva je verzovaná svým obsahem.** Odesílač si k položce fronty pamatuje `otisk_obsahu` a klíč idempotence vychází z otisku hotového těla (oddíl 6). Dokud dávka nebyla předána, může se sestavit znovu. **Oprava textu už předané zprávy se nedělá změnou klíče, ale novou zprávou** s vlastním identifikátorem a vlastním schválením. Ve `public/` leží jen veřejný obsah zprávy; adresy, tokeny ani odkazy na správu odběru v něm nejsou, doplňuje je odesílač.
- Test hledá v šablonách i vygenerovaných zprávách zakázaná slova ze slovníku pojmů, v šablonách navíc napsané letopočty, a ověřuje, že každá zpráva má ročník v identifikátoru, segment a konec užitečnosti.
- **Přechod ročníku** se ověřuje zkoušmo: po přepnutí registru na zkušební další ročník musí souhlasit formulář, předmět, obsah, odkazy, cílový kalendář **i ICS**. Dnešní `scripts/generate-admissions-calendar.py` má rok 2027 napevno ve jméně vstupu, výstupu, UID i URL, takže tahle zkouška je součástí N3, ne až prvního skutečného přepnutí.
- Zprávy o nových datech (rozhodnutí 8) vzniknou ze záznamu událostí, který navrhuje sledování (F0). Do té doby je píše redakce ručně podle přepnutí v registru.

## 8. Zvážené nepoužité sloupce

Prošel jsem celé [zdroje dat](zdroje-dat.md) včetně oddílu 3. Novinky neukazují ukazatele. Otázka proto zní, který údaj ze zdrojů je pro všechny odběratele zprávou nebo pokynem.

| Sloupec nebo zdroj | Rozhodnutí | Proč |
|---|---|---|
| Harmonogram MŠMT (`msmt-harmonogram`, `admissions-2027.json`) | **použít, páteř obsahu** | jediný zdroj termínů; registr hlídá obnovu do 30. 9. 2027; jeho přepnutí otevírá nový ročník odběru |
| Registr, `historie_prepnuti` a `ocekavano` | **použít** | přepnutí sady je zpráva „na webu jsou nová data“ (rozhodnutí 8); očekávaný termín dovolí napsat „nabídku oborů čekáme v březnu“, i když má jistotu jen `odhad` |
| Agregáty 2. kola (`cermat-kolo2-agregaty`) | **zvážit pro květnový e-mail** | věta „v roce 2026 vypsaly školy 2. kolo u N nabídek“ by rodině ukázala, že 2. kolo není okrajové; celostátní počet ale ve [slovníku ukazatelů](slovnik-ukazatelu.md) není a bez zápisu se nepoužije. Samotné přepnutí sady v září je mimo sezónu a samostatný e-mail nedostane |
| Data uchazečů, uchazeči „nikam“ | **zvážit pro květnový e-mail** | počet uchazečů, kteří se v 1. kole nedostali nikam, by rodinu v nejhorší chvíli uklidnil; celostátní počet ve slovníku ukazatelů není a zobrazené období sady je 2025 |
| Celostátní součty přihlášek a míst (sloupce `PŘIHLÁŠKY CELKEM`, `KAPACITA`) | zavrhnout | přihlášky na místo nadsazují konkurenci; bez vysvětlení ze stránky by únorový e-mail zbytečně strašil |
| Rejstřík, `dobihajiciObor` | zavrhnout pro novinky | týká se konkrétní školy a patří do sledování; navíc se netýká žádné nabídky 2026 ([využití nepoužitých dat](navrh-vyuziti-nepouzitych-dat-2027.md)) |
| Rejstřík, `emaily`, CSV `Email 1` (i u základních škol) | **zavrhnout** | kontakt školy není souhlas s rozesíláním; plošné oslovení výchovných poradců z rejstříku by bylo nevyžádané sdělení |
| INSPIS, `dny_otevrenych_dveri` | zavrhnout | volný text, u části škol z roku 2014 |
| Portál pro školy, dny otevřených dveří | zavrhnout pro první verzi | týká se jednotlivých škol a vyplnilo je málo škol; bez kraje v odběru není komu je poslat |
| Maturita, inspekce, extrakce zpráv | zavrhnout | nesouvisí s termíny, patří do sledování školy (rozhodnutí 8) |
| AKKO `platnostDo`, rejstřík `reditel`, položková data JPZ, agregáty 2017–2023, doprava | zavrhnout | nejsou to zprávy pro všechny uchazeče |

Slovník ukazatelů se v první verzi nemění. Do [slovníku pojmů](slovnik-pojmu.md) se ve stejné dávce jako formulář zapíšou:

- název **Termíny přijímaček e-mailem**;
- dvojice **odebírat termíny** × **sledovat školu**;
- **ročník přijímaček**, tedy rok nástupu na SŠ, ne školní rok.

## 9. Měření

- **Co se počítá.** Tři události v Matomu s dimenzí místa formuláře: `formular_odeslan` (přijatá platná žádost), `potvrzeni_odeslano` (potvrzovací e-mail opravdu odešel) a `odber_potvrzen` (odběr vznikl). Poměr, kterým se měří úspěšnost místa, je `odber_potvrzen / potvrzeni_odeslano`; jmenovatel tedy nezahrnuje zahozené požadavky ani útoky. Odpověď API zůstává pro všechny stejná, události se zaznamenávají na serveru.
- **Odhlášení** se sleduje jen souhrnně po zprávách, bez vazby na adresu.
- **Ztráta po odhlášení.** Odběr se při odhlášení maže, takže poměry se počítají z denních souhrnů, ne dotazem nad aktuální tabulkou.
- **Deduplikace.** Opakovaná žádost o tutéž adresu do 24 hodin se počítá jednou, jinak by opakované klikání zkreslovalo jmenovatel. Potvrzení, kterým vzniknou dva segmenty najednou, je **jedna** událost `odber_potvrzen` se dvěma segmenty v rozměru, ne dvě události.
- **E-maily:** otevření ani kliknutí se neměří a měření na odesílací doméně zůstává vypnuté. Odkazy nesou `?zdroj=novinky`; aby to Matomo vidělo jako kampaň, nastaví se `zdroj` jako další parametr kampaně v konfiguraci Matoma, jinak se použije standardní `mtm_campaign`. Rozhodnutí patří do N1 a do přejímky, jinak se parametr nikde neobjeví.
- **Do analytiky nesmí adresa ani token.** Potvrzovací a odhlašovací stránky se neměří a jejich adresy se v logování redukují.
- **Souhlasová lišta se nezavádí.** Zadavatel 17. 9. 2026 potvrdil, že Matomo má schválení a smí měřit bez souhlasové lišty, takže měření běží jako dosud. Odběr přesto nesmí na analytice záviset: musí fungovat i tehdy, když ji prohlížeč nebo rozšíření zablokuje. Stránka zásad Matomo popíše mezi zpracováními.
- **Po únoru 2027** se vyhodnotí: poměr potvrzení po místech, odhlášení po zprávách, stížnosti na spam, nedoručitelné adresy.

Odhad 2–5 % přihlášených z přibližně 5 000 identifikovaných návštěvníků za silný měsíc je předpoklad, ne měření.

## 10. Pořadí realizace

**Stav realizace k 17. 9. 2026** (větev `feat/novinky-odber`): hotová je databázová migrace, knihovny odběru, fronty, rozpočtu a odesílání, všechny API endpointy včetně cronu a webhooků, formuláře na titulní stránce, v patičce a v kalendáři, stránky `/novinky`, potvrzení, správy a odhlášení, generátor zpráv se šablonami a návrh zásad ochrany osobních údajů. Prošlo 40 testů TypeScriptu a 10 testů generátoru. **Nespuštěné zůstává, co potřebuje účty:** databáze Neon, odesílací subdoména s DNS, tajemství a pravidlo firewallu ve Vercelu, právní kontrola zásad. Odběr je do té doby vypnutý přepínačem `NOVINKY_ZAPNUTO`.

| Fáze | Obsah | Hotovo, když | Termín |
|---|---|---|---|
| **N0 Předpoklady** | sloučit `feat/titulka-nabidka-oboru` (sada `msmt-harmonogram`); **návrh zásad ochrany osobních údajů a znění souhlasu do repozitáře** podle oddílu 5 (účel, právní titul, zpracovatelé Vercel, Neon, Resend, Matomo, doby uložení po druzích záznamů, práva a jak je uplatnit) a jeho právní kontrola, kterou zajistí zadavatel; databáze Neon; ověření, že měření otevření a kliknutí je na hlavní doméně vypnuté (přes API); databáze Neon v evropském regionu | stránka zásad je na webu a schválená, měření doložené výstupem z API, `stav-datovych-sad.py kontrola` zná `msmt-harmonogram`, odběr funguje i při zablokované analytice | do 15. 11. 2026 |
| **N1 Odběr** | API `prihlasit`, dvoukrokové `potvrdit`, `sprava`, `odhlasit` podle RFC 8058; jednorázovost žádosti; limit na IP **v režimu blokování**, limit na adresu a denní rozpočet; doklad souhlasu; **minimální fronta a odesílač s hranicí předání, rezervací kvóty, obnovou podle 5.7 a 5.8 a úklidem prošlých žádostí**, aby potvrzení i uvítání odcházely hned a nic se neztratilo; připojení k Neonu s interaktivními transakcemi; webhook s idempotentním příjmem událostí a zpracováním potlačení adresy; formulář v patičce, na titulní stránce a v kalendáři; stránka `/novinky`; pojmy do slovníku; události v Matomu | na náhledu projde: potvrzení dvěma kroky a potvrzovací e-mail do minuty, načtení odkazu robotem odběr nezaloží, druhé kliknutí nezaloží druhý odběr, po odhlášení starý odkaz odběr neobnoví, odhlášení jedním kliknutím funguje z Gmailu a ruší jen jeden účel, překročení limitů se zablokuje, nedoručitelná adresa odběr smaže, dvě zprávy téže adrese se spárují i při obráceném pořadí webhooků, pád mezi transakcí A a B i mezi B a C obnova dokončí bez druhého e-mailu a prošlá žádost se uklidí | do 1. 12. 2026 |
| **N2 Obsah a dávky** | šablony podle oddílu 3; `plan` a `priprav`; manifest v `public/`; naplňování fronty, dávkové odeslání, značky s `polozka_id`, obnova podle bodu 5.7, kontrola platnosti zprávy při naplnění, sestavení i před předáním; retenční úklid; testy | projde celá cesta schválení → nasazení → načtení manifestu → nanečisto odeslání; testy: pád mezi transakcí B a C (položka zůstane `predavana` a obnova ji dokončí bez druhého e-mailu), souběh dvou spuštění (tentýž příjemce se nesmí dostat do dvou dávek), souběžné dávky proti rozpočtu (rezervace nesmí přečerpat limit), `429` s `Retry-After`, opakování téhož požadavku v okně 24 hodin, dávka starší 24 hodin (`neurcita`), oprava textu po předání (nová zpráva, ne nový klíč), položka po konci užitečnosti ve frontě z dřívějška, odhlášení před i po hranici předání, dvě zprávy téže adrese a obrácené pořadí webhooků; změřená velikost funkce a doba běhu při cílovém počtu příjemců | do 15. 12. 2026 |
| **N3 Rozšíření** | odkaz na stránkách škol, věta v simulátoru, konce průvodců; **jarní importér kapacit a přihlášek do února 2027** (rozhodnuto 17. 9. 2026; dnes chybí udržovaný skript pro fázi před výsledky) a na něm závislá zpráva o nové nabídce oborů; zpráva o dalším kalendáři; zkouška přechodu ročníku včetně ICS; rozhodnutí o tarifu podle počtu odběratelů | zkouška přechodu ročníku projde a zpráva o nové nabídce oborů odešla | březen 2027 |
| **N4 Se sledováním** | společný panel „sledovat školu / odebírat termíny“, jedna správa odběrů, sjednocená expirace a mazání identity; **převedení `portal-email.ts` a hlášení chyb na společnou frontu a rozpočet** (rozhodnuto 17. 9. 2026), takže rezerva kvóty přestane být odhadem | odběratel spravuje obojí z jednoho odkazu, odhlášení jednoho účelu druhý nezruší a všechny e-maily webu se účtují v jednom rozpočtu | až bude sledování fungovat |

První e-mail, který musí odejít, je „Školy vyhlašují kritéria“ **12. 1. 2027**. Prosincový e-mail o výběru školy odejde, jen pokud bude N2 hotová.

**Provozní dohled** od N1: chybějící běh cronu, dávky ve stavu `pripravena` starší než 15 minut, `predavana` starší než 6 hodin nebo `neurcita`, rezervace bez vypořádání starší než hodinu, těla dávek starší než okno opakování, položky fronty ve stavu `ceka` po splatnosti, zprávy po konci užitečnosti, rezervace, které se dlouho nepřevedly na spotřebu, spotřebovaná kvóta nad 80 % a zásah do rezervy portálu, podíl nedoručení a stížností, nespárované webhooky a **selhání retenčního úklidu**. Všechno do Telegramu, stejně jako datová linka.

## 11. Rozhodnutí a co ještě není hotové

**Rozhodnuto zadavatelem 17. 9. 2026:**

| Věc | Rozhodnutí |
|---|---|
| Úložiště | **Neon Postgres** s vlastní frontou odeslání (varianta B v oddílu 6). Kontakty a rozesílky Resendu se nepoužijí |
| Oddíl 6 | **schválen jako celek**: tři druhy adresáta, stavy a přechody, tabulky i průběh |
| Režim analytiky | Matomo **má schválení a smí měřit bez souhlasové lišty**; odběr přesto nesmí na analytice záviset |
| Zásady ochrany osobních údajů | **návrh napíšu do repozitáře**, právní kontrolu zajistí zadavatel (N0) |
| Sledování škol a oborů | **schváleno**; společný formulář a jedna správa odběrů se dělají v N4 |
| Jarní importér kapacit a přihlášek | **napsat do února 2027**, aby zpráva o nové nabídce oborů v N3 měla co oznámit |
| Zapojení portálu do rozpočtu kvóty | **převést v N4**, do té doby rezerva 5 000 e-mailů stojí na odhadu a hlídá ji dohled |
| Název | **Termíny přijímaček e-mailem** |
| Tón | **tykání a oslovení rodiny**, souhlas dává dospělý |
| Označení odkazů | **`?zdroj=novinky`**, otevření ani kliknutí se v e-mailu neměří |
| Kraj ve formuláři | **ptát se nepovinně**; do vzniku krajského obsahu na něm nic nestojí |
| Zpráva o dalším kalendáři | **ponechat** i s novým potvrzením do 30 dnů |
| Konzervatoře | pro ročník 2027 **nenabízet**, web je nepokrývá |

**Rozhodnuto 18. 9. 2026:**

| Věc | Rozhodnutí |
|---|---|
| Odesílací doména | **hlavní doména** `novinky@prijimackynaskolu.cz`, nastavená a ověřená; subdoména se nezakládá. Pojistky proti sdílené reputaci jsou v oddílu 6 |
| Právní kontrola zásad | **schváleno**; stránka `/ochrana-osobnich-udaju` je hotová |
| Ověření služeb | **limity nás neblokují**: tarif Vercelu a frekvence cronu, kvóta Resendu, vypnuté měření, značky u dávek ani omezení požadavků ve firewallu nestojí v cestě |
| Sloučení `feat/titulka-nabidka-oboru` | **povoleno**; registr pak zná sadu `msmt-harmonogram` a formulář má odkud vzít ročník |

**Co ještě není hotové a není to rozhodnutí, ale práce nebo ověření:**

1. **Založit databázi Neon v evropském regionu** a doplnit `DATABASE_URL`, `NOVINKY_SECRET`, `CRON_SECRET`, `RESEND_WEBHOOK_SECRET` a `RESEND_MESICNI_KVOTA` do Vercelu; zapnout pravidlo omezení požadavků na `/api/novinky/prihlasit`. Teprve pak se odběr zapne přepínačem `NOVINKY_ZAPNUTO`.
2. **Sloučit `feat/titulka-nabidka-oboru`** (povoleno 18. 9. 2026). V registru datových sad vznikne konflikt s větví `feat/maturita-srozumitelne`, která tentýž soubor mění; řeší se spojením obou sad, ne přijetím jedné strany.
3. **Ověřit opravy v oddílu 6** z kola 5 a z cíleného kola přejímkou N1 a N2 (doporučeno, viz oddíl 18).
4. **Ověřit v N0 nastavení domény přes API**, že měření otevření a kliknutí je vypnuté; ostatní limity služeb zadavatel ověřil 18. 9. 2026.

## 12. Vypořádání oponentury v1.0

[Oponentura](oponentura-novinky-k-prijimackam-2027.md) ověřila kalendář, místa formuláře, ochrany, Matomo i ceník Resendu a vznesla sedm sporných bodů. **Všech sedm se přijímá, S1 a S3 s úpravou.** Ověření k S4 šlo dál než oponentura: omezení požadavků ve firewallu Vercelu na adresu nestačí, takže databázi potřebuje i varianta s kontakty Resendu, a návrh proto přechází na databázi bez podmínky. Měření v e-mailech naopak překážkou spuštění není.

| # | Námitka | Vypořádání | Kde |
|---|---|---|---|
| **S1** | Plán minul vlastní první e-mail (konzervatoře 8. 10., odběr až 15. 10.) a termín 5. 10. pro zásady s právní kontrolou je nereálný | **přijato s úpravou.** Termíny posunuty: N0 do 15. 11., N1 do 1. 12., N2 do 15. 12. 2026. První e-mail, který musí odejít, je „Školy vyhlašují kritéria“ 12. 1. 2027. Sloučení `feat/titulka-nabidka-oboru` zařazeno do N0. Úprava proti oponentuře: prosincový e-mail o výběru školy zůstává jako nepovinný, protože listopad až leden je doba dnů otevřených dveří. Podzimní návštěvnost ale změřená není, takže na něm nic nestojí | 3, 4, 10 |
| **S2** | Konzervatoře jako první segment nemají na webu obsah | **přijato.** Titulní stránka sama říká, že konzervatoře nepokrývá. Segment se pro ročník 2027 nenabízí a otevře se, až web obory bez jednotné zkoušky pokryje | 1 (bod 3), 3 |
| **S3** | Ročník 2028 by jedenáct měsíců mlčel | **přijato s úpravou.** Formulář nabízí jen ročník se zveřejněným kalendářem a podmínku „nabízet ročník = mít kalendář“ hlídá sám formulář, ne ruční nastavení. Z variant oponentury zvolena jedna zpráva o dalším kalendáři, doplněná o nové potvrzení: bez kliknutí do 30 dnů se čekající požadavek smaže (doklad souhlasu k němu zůstává podle doby uložení, viz oddíl 6; upřesněno ve verzi 1.3). Tím odpadá i riziko stížnosti od odběratele, který zapomněl, že se přihlásil | 1, 3, 4 |
| **S4** | Kontakty Resendu jsou druhé úložiště souhlasů na neověřených funkcích; rozhodnout podle schválení sledování | **přijato a rozšířeno.** Ověřeno 17. 9. 2026: (1) měření otevření a kliknutí je v Resendu nastavené pro celou doménu a ve výchozím stavu vypnuté, takže slib „neměříme“ jde dodržet, stačí ho hlídat na subdoméně; (2) firewall Vercelu na tarifu Pro počítá jen podle IP adresy nebo otisku JA4 a nejvýš po 10 minutách, takže limit potvrzení na adresu za den neudrží. Adresu, kterou oběť nepotvrdí, nechrání ani kontrola existujícího kontaktu. **Úložiště tedy potřebuje každá varianta**, a návrh proto doporučuje databázi Neon bez ohledu na rozhodnutí o sledování. Podmínka „go/no-go sledování před N0“ odpadá, sledování rozhoduje jen o N4. Ztrátu fronty a plánování Resendu nahradí denní Vercel Cron a e-maily schválené sloučením | 1 (bod 7), 2, 6 |
| **S5** | Souhlas „je mi 15, nebo jsem rodič“ nutí čtrnáctiletého k nepravdě; e-maily oslovují dítě, souhlas dává rodič | **přijato.** Souhlas přeformulován podle oponentury. E-maily oslovují rodinu. Oslovení je zadané do právní kontroly | 4, 5, 11 |
| **S6** | „Dva produkty, jedna adresa“ předbíhá neschválené sledování; sdílený webhook neexistuje | **přijato.** Rozhodnutí 1 přeformulováno: novinky nabízejí jen samy sebe, dokud sledování nefunguje. Webhook nedoručitelnosti a stížností je výslovně v N1 | 1, 6, 10 |
| **S7** | Bez hranice se z novinek stane druhé sledování | **přijato.** Hranice zapsaná jako rozhodnutí 8: jen nová nabídka oborů, výsledky 1. kola a pásma přijetí, a jen v sezóně otevřeného ročníku. Doplněno, co s přepnutím, které se netýká otevřeného ročníku (pásma přijetí v květnu, 2. kolo v září): samostatnou zprávu nedostane a zmíní se v nejbližším e-mailu, obvykle v uvítání dalšího ročníku. Ve verzi 1.3 je sezóna definovaná jako doba do poslední události ročníku, takže květen je uvnitř sezóny; rozhodující je, že pásma popisují minulý ročník | 1 (bod 8), 3, 8 |

**Stanoviska k otevřeným otázkám** jsem převzal všechna. U úložiště jsem je po ověření k S4 zjednodušil na databázi bez podmínky. Ostatní čekají na potvrzení zadavatele (oddíl 11).

**Drobnosti** jsem přijal všechny:

- sloučení větve s harmonogramem a ověření firewallu jsou v N0;
- cíl „potvrzení odběru“ v Matomu je podmínkou dokončení N1;
- e-mail musí být schválený nejpozději den před odesláním, u e-mailu o výsledcích týden předem.

## 13. Vypořádání oponentury codexu, kolo 1

[Oponentura](podklady/oponentura-codex-novinky-2027.md) ověřovala verzi 1.1 v kódu a datech: spustila testy magic linku a kalendáře, kontrolu registru, přečetla sledování i větev s harmonogramem a spočítala data odeslání z kalendáře. Vznesla **šest blokačních problémů a patnáct dalších**. Blokační se přijímají všechny, protože každý z nich by při spuštění buď založil odběr bez souhlasu, nebo ztratil zprávu, nebo zrušil cizí odběr.

### Blokační

| # | Námitka | Vypořádání | Kde |
|---|---|---|---|
| **B1** | Potvrzení přes GET zakládá odběr; robot poštovního systému ho tak může potvrdit za člověka, a souhlas z patičky navíc chyběl | **přijato.** Potvrzení má dva kroky: GET jen zobrazí stránku, odběr založí POST z ní (rozhodnutí 11). Souhlas se zaškrtává vždy v prvním kroku, i v patičce | 1 (bod 11), 4, 6 (kroky 3 a 4), 10 |
| **B2** | HMAC token není jednorázový; ověřeno spuštěním, že `overMagicToken` projde opakovaně, takže odkaz může po odhlášení odběr obnovit | **přijato.** Token nese `jti`, které se při potvrzení vkládá do `token_spotrebovan` v téže transakci jako vznik odběru. Druhé kliknutí odběr ani uvítání nevytvoří a po odhlášení platí ochrana do expirace | 6 (tabulky, krok 4), 10 |
| **B3** | Pořadí „odeslat, potom zapsat“ nechrání při pádu a souběhu; přečíslované dávky by poslaly pod stejným klíčem jiný obsah a Resend drží idempotenci jen 24 hodin | **přijato.** Dávka se rezervuje před odesláním, její složení je neměnné, klíč nese pokus a stav dávky rozlišuje `rezervovana`, `odeslana`, `neurcita`, `chyba`. Souběh řeší `for update skip locked`. Po 24 hodinách se dávka označí `neurcita` a čeká na rozhodnutí člověka | 6 (tabulka `davka`, krok 5) |
| **B4** | Odesílač bere jen zprávy „k odeslání dnes“, takže výpadek nebo vyčerpaná kvóta zprávu ztratí natrvalo | **přijato.** Vybírají se **splatné a neodeslané** zprávy a každá má konec užitečnosti; cron běží dvakrát denně a chybějící běh je předmětem dohledu | 1 (bod 10), 3, 6 (krok 5), 10 |
| **B5** | Jediná plánovaná ochrana IP je v režimu „jen zaznamenat“ a nikde se nepřepíná; z jedné IP tak lze rozesílat potvrzení na mnoho adres | **přijato.** V N0 se pravidlo zavede v režimu záznamu kvůli kalibraci, ale **N1 ho vyžaduje v režimu blokování** a k němu denní rozpočet potvrzovacích e-mailů. Přejímka N1 obsahuje překročení limitů | 6 (krok 1), 10 |
| **B6** | Smazání společného odběratele ruší i jiné účely; rozhodnutí 9 a krok 7 si navíc odporovaly | **přijato.** Rozhodnutí 9 přeformulováno: odhlašuje se odběr, ne člověk. Odběratel se maže, až nemá žádný odběr, čekající zprávu o kalendáři ani doklad souhlasu v době uložení. Odhlášení jedním kliknutím ruší jen ten účel, ze kterého odkaz vede | 1 (bod 9), 6 (poznámky, krok 6), 10 |

### Nikoli blokační

Přijaty všechny, dvě s upřesněním:

| # | Námitka | Vypořádání |
|---|---|---|
| N1 | Token s adresou v URL může skončit v Matomu | přijato: tokenové stránky se neměří, token se odstraní přesměrováním, adresy se v logování redukují (oddíly 6 a 9) |
| N2 | Zásady samy neopraví měření bez souhlasu | přijato tehdy jako rozhodnutí v N0; **ve verzi 1.7 je otázka uzavřená**: Matomo má schválení a smí měřit bez souhlasové lišty, odběr ale nesmí na analytice záviset |
| N3 | Chybí doklad souhlasu a výkon práv | přijato: `souhlas_verze` u odběru, znění verzované v repozitáři, správce a postup pro výkon práv v zásadách, tři přejímací body právní kontroly (oddíl 5) |
| N4 | „Nic se neukládá“ a „smaže se celý“ jsou nepřesné sliby | přijato: slib zúžen na „do potvrzení nezakládáme odběr“, doby uložení rozepsané po druzích záznamů, otisk je HMAC s odděleným tajemstvím a nenazývá se anonymizací |
| N5 | Čekání na další kalendář nemá životní cyklus | přijato: `zprava_o_kalendari` má cílový ročník, `ceka_nejdele` 18 měsíců, čas výzvy a 30denní platnost odkazu; souhlas se nepřevádí automaticky |
| N6 | Jedna adresa nemohla odebírat oba druhy studia | přijato: primární klíč zahrnuje `druh_studia`, formulář dovolí obojí, společná zpráva se pošle jednou; identifikátor zprávy nese ročník; popsána normalizace adresy a nové ověření při její změně |
| N7 | One-click odhlášení potřebuje přesný kontrakt | přijato: hlavičky vypsané doslova, POST bez cookies a bez přesměrování, pokrytí DKIM, GET nic neruší, rozsah jen jeden účel, test na skutečných hlavičkách |
| N8 | Kalendář neodvodí všechny zprávy a text o 2. kole je nepřesný | přijato: čtyři druhy spouštěče, prosincová zpráva má pevné datum 7. 12. 2026, věta o 2. kole opravena na „přihlášky se podávají jen 19.–24. 5. 2027“, zpráva o JPZ zahrnuje druhý i náhradní termín |
| N9 | Pravidla sezóny si odporovala a nová nabídka má opomenutou závislost | přijato s upřesněním: sezóna je od otevření odběru do poslední události ročníku (22. 6. 2027), pásma přijetí se týkají minulého ročníku a samostatnou zprávu nedostanou. Spouštěč nové nabídky je přepnutí `cermat-kapacity` **a** `cermat-prihlasky`, tedy sjednoceno se sledováním. Jarní importér je výslovná závislost N3 (termín únor 2027, rozhodnuto 17. 9. 2026). Lednová zpráva mluví o nabídce, kterou zveřejňují školy, ne o datech na webu |
| N10 | Přechod ročníku neřeší zákaz letopočtů v šablonách | přijato: zkouška přechodu na zkušební ročník včetně ICS je v N3; doloženo, že generátor kalendáře má rok napevno |
| N11 | Chybí cesta od schváleného souboru k odesílači | přijato: manifest a zprávy v `public/{rocnik}/`, otisk kalendáře ve zprávě, nové schválení při změně kalendáře, přejímka N2 ověřuje celou cestu po nasazení |
| N12 | Kapacitní odhad ignoroval potvrzení a uvítání a špatně čte hlavičku kvóty | přijato: propočet přepsán (lednový odběratel dostane čtyři e-maily, 10 000 odběratelů 40 000 e-mailů, se sledováním 60 000), kapacita snížena na 8 000 až 10 000 odběratelů, hlavička označena jako **spotřebovaná** kvóta a doplněna rezerva 5 000 e-mailů pro portál |
| N13 | Přejímka nepokrývá provozní selhání, dávky ani limity funkce | přijato: přejímka N1 a N2 rozepsaná na konkrétní zkoušky (pád po přijetí dávky, souběh, `429` a `Retry-After`, opakování po 24 h, opožděný webhook, odhlášení během rozesílky, velikost funkce a doba běhu), webhook rozšířen o `failed` a `delivery_delayed`, doplněn provozní dohled |
| N14 | Subdoména nezaručuje nedotčenou doručitelnost portálu | přijato: text zmírněn na „riziko omezuje, neodstraňuje“, doplněny SPF, DKIM, DMARC, sledování reputace a možnost pozastavit plošné zprávy |
| N15 | Měření nemá definované vstupy a `zdroj` není parametr kampaně Matoma | přijato: tři pojmenované události, jmenovatel `potvrzeni_odeslano`, denní souhrny místo dotazu nad tabulkou, rozhodnutí o konfiguraci `zdroj` nebo o `mtm_campaign` v N1 |

### Co oponentura potvrdila

Kalendář má 20 událostí ve třech skupinách a všechny použité identifikátory existují. Spočítaná data odeslání jsem do oddílu 3 přepsal beze změny. Dále potvrzeno, že volání Resendu, HMAC s časově konstantním porovnáním, skryté pole i limity v paměti v kódu opravdu jsou, že Vercel Cron v konfiguraci není, že `msmt-harmonogram` leží jen na určené větvi a že práce se zdroji a slovníky je navržená správně.

**Neověřitelné body** (tarify, skutečné nastavení domény a Matoma, budoucí velikost funkce, dosažitelnost termínů, skutečné zpoždění GitHub cronu) oponentura správně neoznačila za blokační. Návrh je proto uvádí jako neověřené a jejich kontrolu zařazuje do N0, místo aby o nich tvrdil víc, než je doložené.

## 14. Vypořádání oponentury codexu, kolo 2

Kolo 2 ověřilo verzi 1.2 proti kolu 1 a znovu spustilo testy magic linku i kalendáře. **Z šesti blokačních problémů kola 1 je pět odstraněných** (B1, B2, B4, B5, B6); B3 bylo odstraněné jen částečně a oponentura ho rozvedla do C1 a C2. K nim přidala C3 a C4. **Všechny čtyři se přijímají**, protože každý z nich by v provozu vedl k dvojímu odeslání, k zablokovanému doručení, k e-mailu po odhlášení, nebo ke ztrátě dokladu souhlasu.

### Nové blokační

| # | Námitka | Vypořádání | Kde |
|---|---|---|---|
| **C1** | Rezervace dávky nedržela příjemce: dvě dávky téže zprávy s různým číslem splnily všechna omezení schématu, takže tentýž příjemce mohl dostat zprávu dvakrát; jedinečnost `(odberatel_id, zprava)` platila až po odeslání | **přijato.** Zavedena **jedna fronta** `polozka_odeslani` s jedinečností `(odberatel_id, zprava)`. Položka vzniká **před** prvním voláním Resendu, rezervuje se příkazem `for update skip locked` a dávka se skládá jen z rezervovaných položek. Dvě dávky tedy téhož příjemce obsahovat nemohou | 1 (bod 11), 6 (fronta, tabulky, krok 5) |
| **C2** | Neměnné složení dávky nezaručovalo neměnné tělo požadavku: oprava textu zprávy mezi pokusy dá pod stejným klíčem jiné tělo, což Resend odmítá jako `invalid_idempotent_request` | **přijato.** Dávka ukládá **úplné tělo požadavku** a jeho otisk a klíč idempotence otisk těla obsahuje. Změna obsahu nebo složení dávky tedy dá jiný klíč, opakovaný pokus posílá tytéž bajty a `409` nemůže vzniknout. Tělo se maže při uzavření dávky, aby se osobní údaje nedržely zbytečně | 6 (tabulka `davka`, krok 5.3) |
| **C3** | Neměnná dávka odporovala odhlášení: kdo se odhlásil po rezervaci a před odesláním, zprávu přesto dostal | **přijato.** Odhlášení v téže transakci maže položky ve stavech `ceka` a `rezervovana` a odesílač těsně před voláním ověřuje platnost odběru; kdo vypadne, změní tělo, tedy i klíč. **Hranice zrušení** je předání dávky Resendu: u dávky ve stavu `neurcita` se nejdřív zjišťuje výsledek u Resendu a rozhoduje člověk, protože měnit obsah pod použitým klíčem nelze | 6 (kroky 5.4, 5.6, 6) |
| **C4** | Tříletý doklad souhlasu neměl kam přežít smazání odběru: verze souhlasu ležela v `odber_novinek`, který se při odhlášení maže | **přijato.** Doklad je samostatná tabulka `doklad_souhlasu` bez `on delete cascade`, s otiskem adresy, účelem, časem zániku a dnem smazání. Odhlášení a zápis zániku jsou jedna transakce. Odběratel se maže, až nemá odběr ani doklad v době uložení, a do té doby mu nic neodejde, protože nemá položku ve frontě | 5, 6 (tabulky, poznámky, krok 6) |

### Částečně vypořádané body z kola 1

| # | Co zbývalo | Vypořádání |
|---|---|---|
| N3, N4 | doklad souhlasu neměl vlastní úložiště a staré vypořádání S3 slibovalo smazání adresy do 30 dnů | doklad je samostatná tabulka (C4) a věta v oddílu 12 je opravená: maže se čekající požadavek, doklad zaniká podle doby uložení |
| N5, D5 | nebylo určeno uzavření splněného požadavku ani pořadí lhůt 18 měsíců a 30 dnů | `zprava_o_kalendari` má stavy `ceka`, `vyzvan`, `uzavren` a jediné pole `ceka_do`, které se při výzvě přepočítá na 30 dnů od jejího odeslání; po potvrzení nebo po lhůtě se záznam maže |
| N8, D1 | prosincové datum odporovalo pravidlu „rok odběru“, protože ročník je rok nástupu | redakční spouštěč má povinný `rok_posun`; prosinec 2026 je `-1` a přejímka výsledné datum ověřuje |
| N9 | vypořádání S7 stále mluvilo o pásmech jako o mimosezónním přepnutí | oddíl 12 upraven: květen je uvnitř sezóny, rozhodující je, že pásma popisují **minulý** ročník, a samostatnou zprávu proto nedostanou |
| N12, D4 | rezervu kvóty kontroloval jen dávkový odesílač, potvrzení a uvítání měly vlastní cestu | všechny e-maily jdou jednou frontou a účtují se v `rozpocet_emailu`; rezerva portálu je oddělená a zapojení `portal-email.ts` do společného účtování je úkol N4 a otevřená otázka 6 |
| N13 | chyběla zkouška opožděného webhooku a dohled nad retenčním úklidem | oboje doplněno do N2 a do provozního dohledu; webhook se páruje podle `resend_id` i adresy, takže dřívější příchod zprávu nezahodí |
| N15 | chybělo pravidlo deduplikace a započítání dvou segmentů z jednoho potvrzení | doplněno do oddílu 9: opakovaná žádost do 24 hodin se počítá jednou, potvrzení dvou segmentů je jedna událost se dvěma segmenty |
| D2 | nebylo určeno, z čeho POST získá ověřené údaje po odstranění tokenu | zvolena varianta se vzorem z `src/app/admin/auth/route.ts`: obslužná cesta ověří token, vymění ho za krátkou relaci v cookie `HttpOnly` a přesměruje na stránku bez tokenu; POST platnost i vazbu ověří znovu. Obslužná cesta a stránka mají různé adresy, takže se v Next.js nestřetnou |
| D3 | pád mezi potvrzením a uvítáním nechal odběr bez uvítání | uvítání se zakládá jako položka fronty **ve stejné transakci** jako odběr, takže ho odešle nejbližší běh odesílače |
| D6 | konec užitečnosti květnové zprávy (18. 5.) předbíhal začátek podávání přihlášek do 2. kola (19. 5.) | konec užitečnosti je nově 23. 5. 2027, tedy den před koncem podávání; do oddílu 3 doplněno pravidlo, že konec užitečnosti je poslední den, kdy pokyn ještě pomůže, ne konec prvního z popsaných termínů |

### Co kolo 2 potvrdilo a co zůstává neověřené

Kolo 2 potvrdilo odstranění B1, B2, B4, B5 a B6, dále 20 událostí ve třech skupinách, poslední událost ročníku 22. 6. 2027 a spočítané předstihy. Za neověřené správně označilo tarify a nastavení služeb, produkční analytiku a výkon budoucí funkce. Přidalo k nim jedno upozornění, které návrh přijímá: **kolikrát denně smí cron běžet, závisí na tarifu Vercelu**, takže dvakrát denní běh je v oddílu 2 uveden jako věc k ověření v N0.

## 15. Vypořádání oponentury codexu, kolo 3

Kolo 3 ověřilo verzi 1.3. **C4 je odstraněný** a s ním N3, N5, N8, N9, N13, N15, D1, D2, D3, D5 a D6. Fronta z verze 1.3 ale byla popsaná tak, že B3 a C1 až C3 přežily, a kolo 3 k nim přidalo šest nových blokačních bodů E1 až E6 a pět dalších F1 až F5. **Všechny se přijímají.** Verze 1.4 proto model odesílání dopisuje do konce: rozlišuje tři druhy adresáta, zavádí pevnou hranici předání, mrazí tělo požadavku, rezervuje kvótu předem a opravuje obnovu po ztracené odpovědi tak, aby používala jen to, co Resend umí.

### Nové blokační

| # | Námitka | Vypořádání | Kde |
|---|---|---|---|
| **E1** | Potvrzovací e-mail neměl proveditelnou cestu: fronta vyžadovala odběratele a kontrola před odesláním aktivní odběr, zatímco slib „nic se neukládá“ zakazoval cokoli zapsat | **přijato.** Zavedeny **tři druhy adresáta** (žádost o potvrzení, odběratel s aktivním odběrem, čekající na kalendář) a položka fronty odkazuje na jeden z nich. Podmínka odeslání se posuzuje podle účelu. Slib je nově pravdivý a přesný: do potvrzení se ukládá **žádost** s platností 72 hodin, ne odběr | 1 (bod 13), 6 (tři druhy adresáta, tabulky, kroky 1 a 5.2) |
| **E2** | Chyběla trvalá hranice předání a stav `rezervovana` znamenal dvě věci; pád před `COMMIT` mohl zapomenout na odeslání a odhlášení mohlo smazat už předanou položku | **přijato.** Stavy rozděleny na `pripravena` (nic nebylo předáno) a `predavana` (odeslání mohlo začít) a mezi ně je vložena **samostatná krátká transakce B, která se potvrdí ještě před voláním Resendu**. Hranicí zrušení je přechod na `predavana`; dřívější výjimka pro `neurcita` padá. Doplněno, že interaktivní transakce vyžadují `Pool` nebo `Client` ovladače Neonu | 1 (bod 11), 6 (stavy, kroky 5.2 až 5.4, 7) |
| **E3** | Obnova se opírala o dotaz podle klíče idempotence, který Resend neumí | **přijato.** Obnova používá dvě podporované cesty: **značku (tag) s `polozka_id`** ve zprávě, podle které se spáruje webhook, a **opakování téhož požadavku s týmž klíčem** v okně 24 hodin. Po 24 hodinách nebo při rozporu je stav `neurcita` a rozhoduje člověk. Podpora značek u dávkového odeslání se ověřuje v N0 | 6 (kroky 5.5 a 5.7) |
| **E4** | Oprava textu po prvním pokusu zakládala nový klíč, takže příjemce mohl dostat obojí | **přijato.** Tělo i klíč jsou zmrazené od stavu `predavana`. Přeskládat příjemce a klíč lze jen u dávky `pripravena`. **Oprava už předané zprávy je nová zpráva** s vlastním identifikátorem a vlastním schválením | 6 (stavy, krok 5.8), 7 |
| **E5** | Rozpočet evidoval hotová odeslání, ale nerezervoval kapacitu, takže dvě souběžné dávky mohly limit přečerpat; denní limit navíc neměl kde být | **přijato.** `rozpocet_emailu` má `limit_pocet`, `rezervovano` a `spotrebovano` a období `mesic:…` i `den:…`. Rezervace je jediné místo kontroly a je atomická jednou podmíněnou aktualizací. U neurčitého pokusu se rezervace neuvolňuje | 6 (tabulka `rozpocet_emailu`, kroky 5.3, 5.6, 9) |
| **E6** | Konec užitečnosti se kontroloval jen při naplnění fronty, takže položka z dřívějška mohla odejít po uzávěrce | **přijato.** Platnost zprávy (splatnost, konec užitečnosti, otisk kalendáře) se ověřuje **při naplnění, při sestavení dávky a ještě před předáním**; prošlá položka se přepne na `zahozena` a ohlásí se | 6 (krok 5.1), 10 |

### Nikoli blokační

| # | Námitka | Vypořádání |
|---|---|---|
| F1 | dávka vznikala před sestavením těla, přestože tělo je `not null`, a mazání těla by omezení porušilo | přijato: tělo se sestaví **před** vložením dávky, při uzavření se nahradí prázdným textem a příznakem `telo_smazano`; tabulky se zakládají v pořadí závislostí |
| F2 | `jsonb` nezaručuje stejné bajty při opakování | přijato: tělo se ukládá jako **text** v hotové serializované podobě a otisk se počítá nad ním |
| F3 | doklad s otiskem stále držel celou identitu, takže věta o „jen otisku“ nebyla pravdivá | přijato: cizí klíč dokladu má `on delete set null`, takže po zániku všech účelů se identita s adresou smaže a dokladu zůstane jen otisk |
| F4 | adresa není jednoznačná náhrada za `resend_id`, když jedna adresa má víc zpráv | přijato: webhooky se ukládají idempotentně podle `event_id` do `webhook_udalost`, párují se podle značky `polozka_id`, jinak podle `resend_id`, a nespárovaná událost se spáruje později; přejímka obsahuje dvě zprávy téže adrese i obrácené pořadí událostí |
| F5 | společná fronta odkládala potvrzení na běh cronu a odběr v N1 závisel na odesílači z N2 | přijato: **potvrzení a uvítání se posílají hned** v témže požadavku, fronta je u nich záloha, cílová doba doručení je do minuty, a minimální fronta i odesílač jsou nově součástí N1 |

### Co kolo 3 potvrdilo

Kolo 3 potvrdilo odstranění C4, N3, N5, N8, N9, N13, N15, D1, D2, D3, D5 a D6, znovu ověřilo 20 událostí ve třech skupinách a poslední událost ročníku 22. 6. 2027 a spočítalo, že `rok_posun: -1` dává u prosincové zprávy 7. 12. 2026. Za neověřené správně označilo tarify, nastavení účtů, právní dokumentaci a výkon budoucí funkce.

## 16. Vypořádání oponentury codexu, kolo 4

Kolo 4 ověřilo verzi 1.4. **Odstraněné jsou E1, E3, E4, C1, C2, F1, F2 a F4.** Zbylé body (E2, E5, E6, B3, C3, F3, F5) měly společnou příčinu: přechody stavů nebyly popsané jako podmíněné operace, takže dvě souběžné cesty mohly vyhrát obě. Kolo přidalo G1 až G6 a H1 až H5. **Všechny se přijímají** a verze 1.5 je řeší jedním pravidlem: **každý přechod je podmíněná aktualizace, kterou může vyhrát jen jeden zpracovatel**.

### Nové blokační

| # | Námitka | Vypořádání | Kde |
|---|---|---|---|
| **G1** | Odhlášení mezi transakcí A a B nezneplatnilo připravené tělo, takže odhlášený mohl e-mail dostat | **přijato.** Odhlášení a předání o hranici **soutěží**: odhlášení zkusí `update davka set stav='zrusena' where stav='pripravena'`, a když uspěje, dávka se nepředá vůbec. Transakce B navíc přejde jen tehdy, když `clenove_otisk` odpovídá aktuálním položkám | 6 (Stavy, pravidla 3 a 4; kroky 5.4 a 7) |
| **G2** | Kaskádové mazání žádosti nebo identity smazalo i položky po hranici předání, tedy evidenci pokusu a podklad obnovy | **přijato.** Oba cizí klíče položky mají `on delete set null` a položka nese vlastní `adresat_otisk`. Evidence odeslání tak přežije adresáta bez adresy a dvanáctiměsíční retence platí | 6 (Stavy, pravidlo 6; tabulka `polozka_odeslani`, poznámky) |
| **G3** | Obnova nepokrývala dávku, která zůstala `pripravena`, a nové sestavení téhož těla by narazilo na jedinečnost klíče | **přijato.** Doplněn krok 5.8 pro osiřelou `pripravena` (přebírá se po 15 minutách, podmíněným přechodem) a transakce A zakládá dávku příkazem `on conflict (idempotency_key) do update … where stav in ('chyba','zrusena')`, takže prokazatelně neodeslaná dávka se použije znovu s týmž klíčem. Stav `pripravena` je i v dohledu | 6 (kroky 5.2 a 5.8), 10 |
| **G4** | Opakování zmrazeného požadavku po 6 hodinách mohlo poprvé odeslat zprávu, která už přestala platit | **přijato.** Platnost se ověřuje **i před každým opakováním**, které může vyvolat odeslání. Když neplatí, opakování se neprovede a případ jde na `neurcita` k rozhodnutí člověka | 6 (kroky 5.1 a 5.7) |
| **G5** | Rozpočet měl oddělené řádky podle účelu, takže obsah, uvítání a potvrzení mohly společně zasáhnout rezervu portálu | **přijato.** Strop drží **jediný měsíční řádek `celkem`** pro všechny e-maily novinek; denní řádek potvrzení je jen doplňkové omezení. Rezervace se zapisuje do `rezervace_kvoty` s obdobím a množstvím a určení období je vázané na čas rezervace, takže přelom dne ani měsíce nic nerozhodí | 6 (tabulky `rezervace_kvoty` a `rozpocet_emailu`, kroky 5.3 a 9) |
| **G6** | Vypořádání výsledku nebylo jednorázové: dva obnovovací běhy mohly tutéž dávku zaúčtovat dvakrát a pád při zpracování webhooku mohl nechat účinky neprovedené | **přijato.** Transakce C přepíná dávku podmíněně a rezervace se převádí **jen když tento přechod uspěje**; webhook se zpracovává v jedné transakci s vložením, nebo se označí `zpracovano` teprve po provedení účinků a nezpracovaný se opakuje | 6 (krok 5.6, krok 8, tabulka `webhook_udalost`) |

### Nikoli blokační

| # | Námitka | Vypořádání |
|---|---|---|
| H1 | „Zůstává jen otisk“ odporovalo rozhodnutí 9 a webhooky uchovávaly celé tělo s adresou | přijato: rozhodnutí 9 přepsáno na odpojení dokladu a evidence, `webhook_udalost` ukládá jen otisk adresy a tělo bez adresy, a zásady vypisují, co přesně po odhlášení zbude |
| H2 | třetí druh adresáta neměl dokončenou potvrzovací cestu | přijato: žádost má **účel** (`novinky`, `kalendar`, `novy_rocnik`) s vlastní platností, výzva k novému ročníku má žádost platnou 30 dnů a její potvrzení uzavírá čekání v téže transakci |
| H3 | `suppression.added` nejde párovat na položku, protože nese jen adresu | přijato: webhooky mají dvě třídy; potlačení se vyhodnocuje podle normalizované adresy a ruší všechny odběry té adresy bez čekání na položku |
| H4 | přesun do N1 nezahrnoval obnovu a úklid žádostí | přijato: N1 nově obsahuje obnovu podle 5.7 a 5.8, úklid prošlých žádostí a zkoušky pádů mezi transakcemi |
| H5 | starší vypořádání v oddílech 13 a 14 předepisovala už nahrazené mechanismy | přijato: v hlavičce i v oddílu 6 je nově napsáno, že **závazný kontrakt je oddíl 6** a starší formulace ve vypořádáních jsou historickým záznamem |

### Co kolo 4 potvrdilo

Kolo 4 potvrdilo odstranění E1, E3, E4, C1, C2, F1, F2 a F4 a znovu ověřilo, že žádost o potvrzení dává potvrzovacímu e-mailu adresáta bez předčasně založeného odběru, že obnova používá jen podporované operace Resendu a že oprava předané zprávy je nová zpráva. Za neověřené označilo tarify, nastavení účtů a výkon budoucí funkce.

## 17. Vypořádání oponentury codexu, kolo 5

Kolo 5 bylo poslední z dohodnutých pěti. Ověřilo verzi 1.5 a **odstraněné jsou G1, G2, G4, E2, E6, C3, F3, F5 a H2 až H5**. Zbyly tři blokační body, všechny o životním cyklu rezervace a obnovy, a tři upřesnění. Verze 1.6 je vypořádává, ale **tato oprava už oponenturou neprošla**, protože počet kol je vyčerpán. Před realizací je proto potřeba nechat oddíl 6 zkontrolovat ještě jednou.

| # | Námitka | Vypořádání | Kde |
|---|---|---|---|
| **I1** | Opětovné použití dávky by narazilo na už vypořádanou rezervaci, případně by nová rezervace nešla vypořádat | **přijato.** Dávka má `pokus` a `rezervace_kvoty` je klíčovaná podle `(davka_id, pokus, obdobi, ucel)`. Nový pokus tedy dostane vlastní rezervaci, opožděný zpracovatel nemůže vypořádat rezervaci novějšího pokusu a klíč idempotence zůstává stejný, protože tělo je stejné | 6 (tabulky `davka` a `rezervace_kvoty`, kroky 5.2 a 5.6) |
| **I2** | Webhook jednoho e-mailu měl vypořádat celou dávku, takže pozdní výsledek druhé položky se nedal doplnit a obnova se vypínala po prvním webhooku | **přijato.** Účtování dávky a výsledky položek jsou rozdělené: dávka se účtuje jednou a v plné velikosti, kdežto výsledek položky se doplňuje samostatně a smí dorazit i po uzavření dávky. Obnova se řídí **chybějícími výsledky položek**, ne počtem webhooků, a opakování téhož požadavku vrátí identifikátory všech e-mailů | 6 (kroky 5.6 a 5.7) |
| **I3** | Rezervace ve starém období nechránila strop období, ve kterém k odeslání skutečně došlo | **přijato.** Rezervace musí platit v období, ve kterém může dojít k odeslání: před předáním se přenese do současného období a před opakováním přes hranici období se kapacita rezervuje i v novém období, přičemž stará nejistá rezervace se neuvolňuje. Bez kapacity se neopakuje | 6 (kroky 5.3 a 5.7) |
| J1 | retenční slib opomíjel adresu v těle neuzavřené dávky | přijato: doplněno, že adresa v těle zůstává do uzavření dávky, nejdéle 24 hodin od předání, a u dávky `neurcita` nejpozději 30 dnů |
| J2 | nebyl ukotvený začátek třicetidenní lhůty výzvy | přijato: `plati_do` žádosti, přechod na `vyzvan`, `vyzva_odeslana` i `ceka_do` se nastavují v téže transakci, ve které se doplní výsledek položky výzvy |
| J3 | krok B při prohře obecně přikazoval rušit dávku, i když patřila jinému vítězi | přijato: prohra se rozlišuje podle důvodu; u dávky `predavana`, `odeslana` nebo `zrusena` běh jen načte stav a skončí |

### Co zbývá udělat před realizací

1. **Nechat zkontrolovat opravu podle kola 5** — tři body v oddílu 6 (číslo pokusu u dávky, oddělené účtování dávky a výsledků položek, rezervace kvóty v období možného odeslání) jsou jediná část návrhu bez oponentury. Obsah oddílu 6 je jinak schválený.
2. Rozhodnout otevřené otázky z oddílu 11, hlavně právní kontrolu; režim analytiky je od 17. 9. 2026 rozhodnutý (Matomo má schválení).
3. Teprve pak N0.

## 18. Vypořádání cíleného kola oponentury

Cílené kolo zkoumalo jen opravy z kola 5, tedy tu část oddílu 6, která oponenturou neprošla. **J1 a J3 jsou odstraněné**, ostatní body byly odstraněné jen částečně a kolo přidalo pět blokačních (K1 až K5) a jeden nikoli blokační (L1). Všechny se přijímají; každý je doložený konkrétním pořadím operací, dva z nich codex ověřil i modelem nad schématem.

| # | Námitka | Vypořádání | Kde |
|---|---|---|---|
| **K1** | Číslo pokusu chránilo jen rezervaci, ne přechody dávky: starý pracovník mohl převzít a uzavřít novější pokus a rezervace nového pokusu zůstala otevřená | **přijato.** Pravidlo 1 nově ukládá, že **pracovník uvádí číslo svého pokusu v každé aktualizaci** — v předání, uzavření, chybové i rušící větvi — a ověření pokusu je v téže transakci jako změna položek a rozpočtu | 6 (Stavy, pravidlo 1; kroky 5.4 a 5.6) |
| **K2** | První webhook uzavřel dávku, uzavření smazalo tělo a obnova pak neměla bajty pro opakování | **přijato.** Uzavření dávky **tělo nemaže**. Tělo se maže teprve tehdy, když jsou známé výsledky všech položek, nebo když uplyne okno opakování (24 hodin), nebo u dávky `neurcita` po 30 dnech. Retenční text tomu odpovídá | 6 (poznámky ke schématu, „Co zbude po odhlášení“, krok 5.7) |
| **K3** | Přenos rezervace před předáním nechránil první volání, které spadlo už do nového období | **přijato.** Doplněno pravidlo, že **dávka se nepředává v posledních 10 minutách období**; předání se odloží a rezervace se pořídí rovnou na následující období. První volání tak nemůže spadnout do období bez kapacity | 6 (krok 5.3) |
| **K4** | Dodatečná rezervace pro nové období mohla vzniknout po jediném účtovacím přechodu a zůstat navždy otevřená | **přijato.** Rezervace se vypořádávají **samostatně a jednorázově, nezávisle na stavu dávky**, podle nového příznaku `volani_provedeno`: buď se převedou na spotřebu, nebo se uvolní. Vypořádání funguje i u dávky `odeslana` nebo `neurcita` a nevypořádané rezervace hlídá dohled | 6 (tabulka `rezervace_kvoty`, kroky 5.4 a 5.6, dohled) |
| **K5** | Žádost výzvy měla vzniknout bez platnosti, ale sloupec byl `not null`; větev výzev proto nešla realizovat | **přijato.** `zadost_o_potvrzeni` má nově `stav` (`ceka_na_vyzvu`, `aktivni`, `spotrebovana`), `plati_do` je nepovinné a omezení `check (stav <> 'aktivni' or plati_do is not null)` hlídá, že aktivní žádost platnost má. Žádost ve stavu `ceka_na_vyzvu` nelze potvrdit | 6 (tabulka `zadost_o_potvrzeni`, krok 5.4 a rozhodný okamžik u výzvy) |
| L1 | nebyl určen zdroj času, od kterého běží 30 dnů výzvy | přijato: rozhodným časem je **okamžik odeslání podle Resendu** (`created_at`), a není-li znám, `predano_v` dávky. Čas transakce se nepoužije, aby zpožděné doplnění výsledku lhůtu nekrátilo |

### Kde skončit s oponenturou

Cílené kolo ukázalo, že na úrovni popisu souběhu lze takto pokračovat dlouho: každá oprava odemkne další, ještě užší protipříklad. Body K1 až K5 byly konkrétní a opravitelné několika větami, ale příští kolo by hledalo protipříklady už na okrajích právě dopsaných pravidel.

**Doporučený postup (k rozhodnutí, viz oddíl 11):** oddíl 6 už dál neoponovat a zbytek ověřit tam, kde je souběh prokazatelný, tedy v přejímce N1 a N2. Ty mají zkoušky přímo na tyhle případy: pád mezi transakcemi, dvě souběžná spuštění, opakování v okně idempotence, odhlášení před i po hranici předání, obrácené pořadí webhooků a souběžné dávky proti rozpočtu. Co neprojde testem, se opraví v kódu, ne v dokumentu.

## 19. Vypořádání code review kódu (PR #96)

[Code review](podklady/code-review-pr96-novinky.md) prošlo hotový kód proti tomuto kontraktu ve čtyřech oblastech a našlo **deset závažných nálezů**. Všechny jsou opravené a ke každému je test, aby se nemohl vrátit. Tři z nich jsou nejcennější poučení celé práce: **rušily přesně to, co měla zařídit kola 5 a cílené kolo oponentury** — návrh je popisoval, kód ne.

| Nález | Co bylo špatně | Oprava |
|---|---|---|
| P1-1 | odhlášení zrušilo dávku, ale ostatní příjemce nechalo uvízlé, protože transakce A bere jen `ceka` | dávka se ruší celá a ostatní položky se vrací do fronty |
| P1-2 | slíbená záloha fronty neměla konzumenta: po výpadku Resendu by potvrzení nikdy nedošlo | `dovezServisni` v cronu, dřív než obsahové zprávy |
| P1-3 | potvrzení a uvítání obcházely rozpočet i hranici předání | jdou stejnou cestou jako obsah, s rezervací kvóty |
| P1-4 | rezervace se nepřenášela do aktuálního období a opakování přes přelom měsíce posílalo bez krytí | `prenesRezervaci` před předáním a rezervace před opakováním |
| P1-5 | token zůstával v adrese u odhlášení a správy, tedy i v Matomu | výměna za krátkou relaci v cookie |
| P1-6 | odkazy platily 30 dnů a po expiraci endpoint hlásil úspěch | platnost 400 dnů, neplatný odkaz vrací chybu |
| P1-7 | cron přepisoval ručně snížený limit rozpočtu | `on conflict do nothing` |
| P1-8 | účinek webhooku běžel mimo idempotentní stráž a bez kontroly času podpisu | účinek uvnitř transakce, tolerance 5 minut, `ucinek_hotov` |
| P1-9 | zrušené dávky držely těla s adresami, staré záznamy se nemazaly | tělo se maže při zrušení, úklid dobírá kalendář, žádosti a evidenci |
| P1-10 | odhlášení rušilo oba druhy studia i u zprávy pro jeden segment | položka nese segment a ruší se jen ten |

**Co zůstává otevřené:** P2 nálezy. Nejsou to blokátory a část je vědomé rozhodnutí — například `public/novinky/` v `.gitignore`: vygenerované zprávy se schvalují samostatným pull requestem, ne spolu s kódem odběru. Testy v `node --test` v CI neběží; zapnout je je doporučení, ne součást této dávky.

**Poučení do příště:** oponentura návrhu neuhlídá, že kód dělá to, co návrh říká. Verze 1.6 vznikla jako oprava bez oponentury a právě její body v kódu chyběly. Kontrakt a kód si musí sednout u revize kódu, ne u revize dokumentu.

## 20. Revize produktu 18. 9. 2026: jeden newsletter

Zadavatel při čtení návrhu upřesnil, co si od odběru představoval: **jeden newsletter, který si člověk zapne a běží mu dál**, ne odběr svázaný s jedním ročníkem přijímaček. To je jiný produkt, než jaký návrh popisoval do verze 1.14, a je výrazně jednodušší.

### Co odpadlo a co to ušetřilo

| Co | Proč to bylo v návrhu | Proč to odpadlo |
|---|---|---|
| **Zpráva o dalším kalendáři** a celá tabulka `zprava_o_kalendari` | odběr končil s ročníkem, takže rodina mladšího dítěte potřebovala most: „ozveme se, až vyjde další kalendář“ | odběr běží dál, takže se mladší rodina prostě přihlásí a čeká |
| **Ročník a druh studia v odběru**, tři účely žádosti, účel položky `vyzva` | cílení zpráv podle segmentu | jedna zpráva pro všechny; u jednotné zkoušky se pošlou všechny čtyři dny s větou, který pro koho platí |
| **Kraj ve formuláři** | budoucí krajské zprávy | nemá konzumenta a každé pole snižuje podíl vyplněných formulářů |
| **Segment u položky fronty** | odhlášení mělo rušit jen segment zprávy (nález P1-10) | odběr je jeden, takže odhlášení znamená konec celého newsletteru |
| **Formulář v patičce a druhý na titulce** | co nejvíc míst k přihlášení | tři místa stačí na ověření; patičkový formulář navíc prodlužoval build o 1 179 stránek škol |

Tím zanikl i nález P1-10 z code review a spolu s ním půlka stavového automatu. Zůstalo jedenáct tabulek a dvaadvacet příkazů migrace.

### Co zůstalo a proč

- **Ročník nese každá zpráva**, ne odběr. Bere se z registru stavu datových sad, takže se nikde nepíše napevno a identifikátor zprávy koliduje jen v rámci ročníku.
- **Uvítání má v identifikátoru `jti`** žádosti. Bez toho by člověk, který se odhlásí a za měsíc přihlásí znovu, uvítání tiše nedostal, protože položka fronty je jedinečná na adresáta a zprávu. Tuhle past odhalila revize modelu, ne testy.
- **Obsah je dvojí:** termíny přijímacího řízení a zprávy o nových datech na webu. Širší záběr („celé české školství“) zadavatel zvážil a zamítl, protože by slíbil víc, než co jde odvodit z dat a kalendáře; bez redakční práce by zůstal nenaplněný.

### Druhý produkt: sledování konkrétních škol

Zadavatel zároveň potvrdil, že chce **sledování vybraných škol** s upozorněním na změny u nich, například když škola vypíše den otevřených dveří. To není tento newsletter, ale samostatný produkt popsaný ve [sledování škol a oborů](sledovani-skol-2027.md). Sdílí s novinkami identitu odběratele, frontu odeslání i rozpočet kvóty, takže se dá postavit na hotovém základu; potřebuje ale záznam událostí (F0 sledování) a u dnů otevřených dveří platí, že je web zná jen od škol, které je vyplní v portálu.

## 21. Nasazení 18. 9. 2026 a co ukázalo první skutečné volání

Migrace proběhla na produkci přes `POST /api/novinky/migrace`: dvaadvacet příkazů, jedenáct tabulek, opakované spuštění nic nezměnilo. V databázi neleží nic jiného, takže vlastní schéma vedle `public` není potřeba.

**První skutečné volání formuláře ale spadlo.** `POST /api/novinky/prihlasit` vrátil 500 a v logu stálo `error: could not determine data type of parameter $2` (Postgres `42P18`). Počitadlo limitu předávalo dotazu tři argumenty, ale v jeho textu byly jen `$1` a `$3`: druhý byl povolený počet, který se porovnává až v JavaScriptu, takže v dotazu nikdy neměl co dělat. Postgres nemá z čeho odvodit typ parametru, který v dotazu není, a odmítne celý dotaz.

Co to říká o zkoušení, které návrh do téhle chvíle měl:

- **Šest kol oponentury a code review od čtyř recenzentů tuhle chybu minuly.** Číslo `$3` v textu dotazu vypadá správně, pokud čtenář nepočítá argumenty na druhé straně volání. Je to chyba, kterou najde jedině stroj.
- **Jednotkové testy ji minout musely.** Všech 61 běží proti falešnému spojení, které dotaz jen zaznamená. Falešné spojení nikdy neřekne „takový parametr neznám“, takže celá vrstva dotazů byla do nasazení neověřená.
- Platí tedy silnější verze lekce z oddílu 19: nejen že **přečtený dokument nedokazuje chování kódu**, ale **prošlý test proti falešné databázi nedokazuje, že dotaz vůbec jde spustit**.

Proto vznikly dvě pojistky, každá na jednu z příčin:

| Pojistka | Co hlídá | Kde |
|---|---|---|
| **Test číslování parametrů** | čísla `$n` v každém dotazu tvoří souvislou řadu od `$1` a nejvyšší odpovídá počtu předaných argumentů | `tests/novinky-parametry.test.mjs` |
| **Kouřová zkouška proti databázi** | celá cesta člověka (přihlášení → dávka → potvrzení → správa → odhlášení → úklid) proti skutečnému Postgresu | `src/lib/novinky-kourova-zkouska.ts`, spouští se `POST /api/novinky/kourova-zkouska` |

Kouřová zkouška **neposílá e-mail**: dávku připraví, předá a uzavře jako chybnou, takže se položka vrátí do fronty a Resend se nevolá. Po sobě smaže všechny své záznamy; adresa je z `example.com` (RFC 2606) a IP z 203.0.113.0/24 (RFC 5737), takže nemůže patřit nikomu skutečnému. Endpoint je chráněný týmž tajemstvím jako cron (`CRON_SECRET`) a existuje ze stejného důvodu jako endpoint migrace: připojovací řetězec je ve Vercelu tajný, takže se zvenčí spustit nedá.

**Pravidlo pro další práci:** po každé změně schématu nebo dotazů a po každém nasazení se spouští kouřová zkouška. Test číslování parametrů běží v CI spolu s ostatními.

### Druhý nález: řádek rozpočtu zakládal jen cron

První běh kouřové zkoušky na produkci našel hned další věc — zkouška se zastavila na `kvóta nestačí` při přípravě dávky. Příčina: řádky tabulky `rozpocet_emailu` zakládal **jen cron odesílače** (`/api/novinky/odeslat`, v 6:00 a 18:00). Rezervace kvóty ale žádný řádek nezakládá, jen na existující sahá podmíněnou aktualizací.

Důsledek pro člověka u formuláře: denní řádek `(den:…, potvrzeni)` vzniká teprve prvním během cronu toho dne. **Kdo se přihlásí po půlnoci, tomu potvrzení nemá kam rezervovat**, `pripravDavku` skončí na nedostatku kvóty a položka zůstane ve frontě až do 6:00. Kontrakt slibuje doručení do minuty; místo toho by přišlo za několik hodin, tedy dávno po chvíli, kdy člověk u formuláře stál. Totéž platí pro měsíční řádek prvního dne měsíce.

Oprava je v rezervaci, ne u volajících: `rezervujKvotu` si řádek **zajistí sama, ve stejné transakci**, `insert … on conflict (obdobi, ucel) do nothing`. Tím zůstává v platnosti pravidlo z kola 5, že ručně snížený limit je pojistka, kterou nikdo nepřepisuje. Limity vznikly jako `limitRozpoctu()` v modulu rozpočtu, aby cron a formulář nemohly mít každý jiný strop.

Zkouška sama řádky rozpočtu **schválně nezakládá**. Kdyby si je připravila, zakryla by přesně tu past, kvůli které vznikla.

Za pozornost stojí, že tenhle nález má stejný tvar jako první: obě chyby ležely v místě, kde se dvě části kontraktu potkávají (dotaz a jeho argumenty, cron a formulář), a obě byly neviditelné pro testy proti falešnému spojení i pro čtení dokumentu. Kouřová zkouška je našla v první minutě běhu.

## Historie

| Verze | Změna |
|---|---|
| 1.17 | Druhý nález kouřové zkoušky (oddíl 21): řádky rozpočtu zakládal jen cron, takže potvrzení z formuláře po půlnoci nemělo kam rezervovat a odešlo by až v 6:00 místo do minuty. Rezervace si řádek zajišťuje sama ve stejné transakci, `do nothing` drží pojistku ručně sníženého limitu, limity sjednoceny do `limitRozpoctu()`. |
| 1.16 | Nasazení na produkci (oddíl 21): migrace proběhla, jedenáct tabulek, databáze jinak prázdná. První skutečné volání formuláře spadlo na `42P18`, protože počitadlo limitu předávalo dotazu parametr, který v jeho textu nebyl; opraveno. Doplněny dvě pojistky: test číslování parametrů a kouřová zkouška celé cesty proti skutečné databázi, která neposílá e-mail a po sobě uklidí. Zapsáno, že prošlý test proti falešnému spojení nedokazuje spustitelnost dotazu. |
| 1.15 | Revize produktu (oddíl 20): jeden newsletter bez ročníku a bez segmentů, formulář jen e-mail a souhlas na třech místech. Zanikla zpráva o dalším kalendáři, tabulka `zprava_o_kalendari`, ročník a druh studia v odběru, kraj, segment u položky i nález P1-10. Termíny jednotné zkoušky jdou všem v jedné zprávě. Obsah je dvojí: termíny a zprávy o nových datech na webu; širší školství zamítnuto. Doplněna past s uvítáním po opakovaném přihlášení. |
| 1.14 | Vypořádáno code review kódu (PR #96, oddíl 19): deset závažných nálezů opraveno a kontrakt upraven podle skutečnosti — potvrzení a uvítání přes dávku s rezervací kvóty a s konzumentem v cronu, zrušení dávky vrací ostatní položky a maže tělo, položka nese segment a odhlášení ruší jen ten, odkazy platí 400 dnů a token nezůstává v adrese, limit rozpočtu se nepřepisuje, účinek webhooku uvnitř stráže s tolerancí času podpisu. |
| 1.13 | Rozhodnutí zadavatele z 18. 9. 2026: e-maily se posílají z hlavní domény `prijimackynaskolu.cz` (ověřené, subdoména se nezakládá) a k tomu tři pojistky proti sdílené reputaci a kvótě; právní kontrola zásad schválena; limity služeb neblokují; sloučení větve s harmonogramem povoleno. Zbývající práce zúžena na databázi Neon, tajemství a firewall ve Vercelu, sloučení větve a přejímku. |
| 1.12 | Doplněn stav realizace: hotová migrace, knihovny, API, formuláře, stránky, generátor a návrh zásad na větvi `feat/novinky-odber`; odběr drží vypnutý přepínač `NOVINKY_ZAPNUTO`, dokud nejsou účty a právní kontrola. Konec užitečnosti květnové zprávy je 24. 5. 2027, tedy poslední den podávání přihlášek do 2. kola. |
| 1.11 | Vypořádán zbytek oponentury k v1.1: březnová zpráva o nových datech je přeformulovaná retrospektivně (odběratelé ročníku už přihlášky podali), uvítání má podmíněný blok o nových datech, formulář vysvětluje jednou větou, proč konzervatoř v nabídce není, právní kontrola má výslovně předání do třetích zemí (Resend v USA, Neon v evropském regionu) a mazání nepotvrzených požadavků na kalendář je součástí téhož běhu, který odesílá výzvy. M2 a M3 byly vyřešené už ve verzi 1.2. |
| 1.10 | Zadavatel rozhodl všech pět otevřených otázek: návrh zásad ochrany osobních údajů napíšu já a právní kontrolu zajistí zadavatel; sledování škol schváleno a připojí se v N4; jarní importér kapacit a přihlášek se napíše do února 2027; portál se převede na společný rozpočet v N4; kraj se ptá nepovinně a do vzniku krajského obsahu na něm nic nestojí. Potvrzen název, tykání a označení odkazů, ponechána zpráva o dalším kalendáři. Oddíl 11 přepsán z otevřených otázek na soupis rozhodnutí a zbývající práce. |
| 1.9 | Vypořádáno cílené kolo oponentury na opravy z kola 5: přijato pět blokačních bodů a jedno upřesnění. Pracovník uvádí číslo svého pokusu v každé aktualizaci, takže starý pracovník nemůže převzít novější pokus. Tělo dávky se maže až po získání všech výsledků nebo po okně opakování, ne při uzavření dávky. Dávka se nepředává v posledních 10 minutách období. Rezervace kvóty se vypořádávají jednorázově a nezávisle na stavu dávky podle příznaku provedeného volání. Žádost o potvrzení má stav a nepovinné `plati_do`, takže žádost čekající na výzvu lze založit. Rozhodným časem lhůty výzvy je okamžik odeslání podle Resendu. Doplněno doporučení oponenturu oddílu 6 ukončit a zbytek ověřit přejímkou N1 a N2. |
| 1.8 | Zadavatel schválil oddíl 6 v celém rozsahu a jako úložiště potvrdil Neon Postgres s vlastní frontou odeslání. Ke kontrole zbývá jen oprava podle kola 5. |
| 1.7 | Režim analytiky rozhodnut: Matomo má schválení a smí měřit bez souhlasové lišty (potvrzeno zadavatelem 17. 9. 2026). Otevřená otázka na analytiku padá, N0 ji už neobsahuje a v oddílu 9 zůstává jen podmínka, že odběr musí fungovat i při zablokovaném měření. |
| 1.6 | Vypořádána oponentura codexu, kolo 5 (poslední): přijaty tři blokační body a tři upřesnění. Dávka má číslo pokusu a rezervace je klíčovaná podle pokusu, takže opětovné použití dávky nekoliduje s vypořádanou rezervací. Účtování dávky je oddělené od doplňování výsledků jednotlivých položek a obnova se řídí chybějícími výsledky, ne počtem webhooků. Rezervace kvóty musí platit v období, ve kterém může dojít k odeslání, i při opakování přes přelom měsíce nebo dne. Doplněn rozhodný okamžik třicetidenní lhůty výzvy, přesná retence adresy v těle neuzavřené dávky a rozlišení důvodů prohraného přechodu B. Tato verze už oponenturou neprošla. |
| 1.5 | Vypořádána oponentura codexu, kolo 4: přijato všech šest blokačních bodů a pět dalších. Každý přechod stavu je podmíněná aktualizace s jediným vítězem: odhlášení a předání soutěží o hranici, transakce B kontroluje složení dávky, transakce C vypořádá rezervaci jen při vítězném přechodu. Evidence odeslání se neruší kaskádou, ale odpojuje. Obnova pokrývá i dávku uvízlou v `pripravena` a před každým opakováním znovu ověřuje platnost zprávy. Strop kvóty drží jediný měsíční řádek pro všechny e-maily novinek. Žádost o potvrzení má účel `novinky`, `kalendar` nebo `novy_rocnik` s vlastní platností. Potlačení adresy se vyhodnocuje podle adresy, ne podle položky. Webhooky neukládají adresu. Oddíl 6 je označen za závazný kontrakt. |
| 1.4 | Vypořádána oponentura codexu, kolo 3: přijato všech šest nových blokačních bodů a pět dalších. Model odesílání dopsán do konce: tři druhy adresáta a žádost o potvrzení s platností 72 hodin místo nepravdivého slibu „nic se neukládá“, stavy `pripravena` a `predavana` s trvalou hranicí předání zapsanou před voláním Resendu, zmrazené tělo i klíč od hranice předání a oprava předané zprávy jako nová zpráva, obnova přes značku `polozka_id` a opakování téhož požadavku místo neexistujícího dotazu podle klíče, atomická rezervace kvóty s měsíčním i denním obdobím, kontrola platnosti zprávy i při sestavení a před předáním, tělo dávky jako text, odpojení dokladu souhlasu od mazané identity, idempotentní příjem webhooků a potvrzení i uvítání odesílané hned; minimální fronta a odesílač přesunuty do N1. |
| 1.3 | Vypořádána oponentura codexu, kolo 2: přijaty všechny čtyři nové blokační body a devět částečně vypořádaných. Zavedena jedna fronta `polozka_odeslani` s jedinečností na příjemce a zprávu, neměnné tělo požadavku s otiskem v klíči idempotence, zrušení nepředaných položek při odhlášení, samostatná tabulka dokladů souhlasu, stavy zprávy o dalším kalendáři, `rok_posun` u redakčního spouštěče, společné účtování kvóty pro potvrzení, uvítání i obsahové zprávy, deduplikace v měření, konec užitečnosti květnové zprávy až 23. 5. 2027 a doplněné zkoušky i provozní dohled. |
| 1.2 | Vypořádána oponentura codexu, kolo 1: přijato všech šest blokačních a patnáct dalších bodů. Potvrzení odběru dvěma kroky s jednorázovým tokenem, odhlašuje se odběr místo člověka, odesílač posílá splatné a neodeslané zprávy s koncem užitečnosti a s rezervovanými dávkami, limit na IP v režimu blokování a denní rozpočet potvrzení, doklad souhlasu a doby uložení po druzích záznamů, manifest zpráv v `public/` s otiskem kalendáře, čtyři druhy spouštěče, opravená data odeslání a text o 2. kole, přepočtená kapacita s rezervou pro portál, definované měření, provozní dohled a přejímky rozepsané na konkrétní zkoušky. |
| 1.1 | Vypořádána oponentura v1.0: přijato všech sedm bodů. Novinky zatím bez sledování a bez konzervatoří, formulář jen pro ročník se zveřejněným kalendářem a jedna zpráva o dalším kalendáři s novým potvrzením. Souhlas „pro sebe nebo své dítě, alespoň 15 let“. Úložiště změněno z kontaktů Resendu na databázi Neon s dávkami transakčních e-mailů, protože firewall Vercelu limit na adresu neudrží. Ověřeno, že měření v Resendu je nastavené pro doménu a ve výchozím stavu vypnuté. Schválení e-mailu sloučením pull requestu, denní odesílač, webhook v N1, hranice plošných zpráv o datech. Termíny N0–N2 posunuty na 15. 11. až 15. 12. 2026, první povinný e-mail 12. 1. 2027. |
| 1.0 | Návrh: plošné novinky vedle sledování, obsah vázaný na kalendář MŠMT, umístění formuláře, věk a souhlas, kontakty a rozesílky v Resendu s potvrzením bez ukládání, vznik e-mailů v repozitáři se schválením, zvážené nepoužité sloupce, pořadí s termínem před konzervatořemi. |
