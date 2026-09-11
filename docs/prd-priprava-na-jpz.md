# PRD: Digitální příprava na jednotnou přijímací zkoušku

- **Pracovní název:** Přijímačky na školu – Testy
- **Verze:** 0.1
- **Datum:** 2026-07-10
- **Stav:** Návrh k připomínkám
- **Cílové vydání MVP:** 2026-08-31
- **Cílová skupina:** žáci 9. tříd připravující se na JPZ pro čtyřleté maturitní obory

---

## 1. Shrnutí produktu

Digitální aplikace pomůže žákovi zjistit, jak je připraven na testy CERMAT z českého jazyka a matematiky, odhalí konkrétní slabiny relevantní pro výkon v JPZ a sestaví upravitelný studijní plán. Žák bude procvičovat původní úlohy podobného formátu a obtížnosti, absolvovat celé časované simulace a rozebírat chyby s AI tutorem.

Produkt bude obsahově nezávislý na současné aplikaci `prijimackynaskolu.cz`, ale bude propojen se stejnou značkou a s historickými daty škol. Předběžně se doporučuje umístění na `prijimackynaskolu.cz/testy`; Google mezi podadresářem a subdoménou z hlediska indexace a hodnocení nepreferuje jednu variantu. Konečné umístění se má řídit zejména způsobem nasazení a správy produktu. [Google Search Central](https://developers.google.com/search/help/crawling-index-faq)

MVP bude zdarma. Později může bezplatnou část doplnit jednorázově placený přístup k většímu počtu testů a procvičování, bez předplatného.

---

## 2. Problém

Žák dnes může řešit historické testy CERMAT, ale samotný výsledek mu obvykle neřekne:

- které typy úloh ho připravují o body;
- zda je problém ve znalosti, pochopení zadání, strategii nebo nedostatku času;
- čemu má dát prioritu vzhledem k termínu zkoušky a dostupnému času;
- jak se jeho výkon vyvíjí;
- jaký vztah má jeho výsledek k historickým výsledkům vybrané školy;
- jak si stojí vůči srovnatelné anonymní kohortě.

CERMAT nabízí historická zadání, klíče, vybrané průvodce a vlastní procvičovací aplikaci. Příležitostí produktu proto není pouze zpřístupnit další test, ale propojit diagnostiku, výklad, trénink, plán a simulaci v jednom cyklu. [Testová zadání CERMAT](https://prijimacky.cermat.cz/menu/testova-zadani-k-procvicovani/testova-zadani-v-pdf)

---

## 3. Produktová vize

Žák má po každé aktivitě rozumět třem věcem:

1. **Jak si stojím:** aktuální bodový odhad, tempo a míra jistoty odhadu.
2. **Kde ztrácím body:** konkrétní typy úloh a příčina chyb.
3. **Co mám udělat dál:** krátký dosažitelný úkol v osobním plánu.

Základní produktová smyčka:

```text
diagnostika → plán → cílené procvičování → vysvětlení chyb
      ↑                                            ↓
      └──────────── plná simulace a přepočet ─────┘
```

---

## 4. Cíle a necíle

### 4.1 Cíle MVP

- Změřit připravenost na formát a nároky JPZ, nikoli plošnou znalost celého učiva ZŠ.
- Rozlišit znalostní chybu, nepochopení zadání, chybu postupu, nepozornost a problém s časem.
- Vytvořit upravitelný plán podle termínu zkoušky, dostupného času, cílového skóre a vybraných škol.
- Poskytovat cílené procvičování z češtiny a matematiky.
- Vysvětlovat problém prostřednictvím AI tutora reagujícího na otázky žáka.
- Umožnit digitální simulaci testu v podmínkách blízkých JPZ.
- Dát rodiči přiměřený přehled bez veřejného hodnocení dítěte.
- Zobrazit historická data školy pouze jako orientační indikátor, nikoli jako příslib přijetí.
- Publikovat pouze původní úlohy, které prošly automatickými kontrolami a schválením učitelem.

### 4.2 Necíle MVP

- Měřit úplnou úroveň vzdělání žáka podle RVP.
- Připravovat žáky 5. a 7. tříd.
- Podporovat tisk testů nebo skenování záznamových archů.
- Nabízet učitelský nebo školní administrační účet.
- Poskytovat videolekce nebo živé doučování.
- Podporovat zvláštní režimy pro žáky se speciálními vzdělávacími potřebami.
- Garantovat přijetí nebo budoucí bodovou hranici školy.
- Spouštět předplatné v MVP.

---

## 5. Uživatelé a role

### 5.1 Žák

- chodí do 9. třídy;
- připravuje se na čtyřletý maturitní obor;
- může se registrovat sám nebo být pozván rodičem;
- absolvuje diagnostiku, trénink a testy;
- upravuje intenzitu a skladbu studijního plánu;
- může zvolit cílové školy.

### 5.2 Rodič

- registruje žáka a získá rodičovský přehled; nebo
- potvrdí rodičovský e-mail uvedený při registraci žáka;
- u účtu založeného rodičem vidí pokrok, aktivitu, vývoj skóre a plán;
- jednou měsíčně obdrží e-mailový souhrn;
- nedostává detailní přepis konverzací žáka s AI tutorem, pokud to není nutné kvůli bezpečnostnímu incidentu.

### 5.3 Obsahový správce a schvalující učitel

- kontroluje návrhy úloh, řešení, bodování a vysvětlení;
- schvaluje nebo zamítá úlohy před publikací;
- sleduje problematické úlohy podle dat a hlášení uživatelů;
- může úlohu okamžitě stáhnout z používání.

Zajištění alespoň jednoho učitele českého jazyka a jednoho učitele matematiky je podmínkou vydání obsahu. AI kontrola nenahrazuje finální odborné schválení.

---

## 6. Doporučená vstupní diagnostika

### 6.1 Princip

Diagnostika má předpovědět výkon v JPZ a najít významné zdroje ztracených bodů. Nemá suplovat školní srovnávací test ani podrobně mapovat každé téma RVP.

Doporučené řešení je dvoustupňové.

### 6.2 Stupeň A: rychlý časovaný screening

- **Účel:** snížit bariéru prvního použití a dodat první užitečný plán.
- **Celkový čas:** přibližně 40 minut.
- **Český jazyk:** přibližně 18 minut.
- **Matematika:** přibližně 22 minut.

Screening obsahuje stratifikovaný výběr úloh podle aktuálního blueprintu JPZ:

- hlavní typy úloh a dovedností;
- různé formáty odpovědi;
- lehčí, střední a obtížnější položky;
- úlohy citlivé na práci s časem a přesné čtení zadání;
- úlohy s typickými chybnými postupy, které lze využít v následném vysvětlení.

Aplikace automaticky sleduje:

- správnost a dosažené body;
- čas na úlohu;
- vynechané úlohy;
- návraty a změny odpovědi;
- nedokončené části;
- volitelné označení „tipoval/a jsem“.

Výstupem je **předběžný profil** s viditelným upozorněním, že krátký screening má omezenou přesnost. Žák ihned dostane první tři priority a plán na následující týden.

### 6.3 Stupeň B: plná kalibrační simulace

Do sedmi dnů aplikace doporučí absolvovat celý test z českého jazyka a celý test z matematiky. Žák je může vykonat v různých dnech. Standardní limity jsou 70 minut pro češtinu a 85 minut pro matematiku; každý předmět má maximum 50 bodů. [Obsah a podoba JPZ](https://prijimacky.cermat.cz/88-obsah/jpz/186-obsah-a-podoba-jednotnych-testu)

Po dokončení obou částí aplikace:

- nahradí předběžný profil kalibrovaným profilem;
- přepočítá priority a studijní plán;
- oddělí znalostní slabiny od problémů s tempem a testovou strategií;
- nabídne rozbor chyb seřazených podle ztracených bodů;
- vytvoří výchozí skóre pro měření budoucího zlepšení.

### 6.4 Diagnostický profil

Profil se vede ve čtyřech osách:

| Osa | Příklady |
|---|---|
| Předmět a oblast | pravopis, práce s textem, algebra, geometrie |
| Typ úlohy | uzavřená, otevřená, vícekroková, práce s výchozím textem |
| Příčina chyby | neznalost, chybný postup, zadání, nepozornost, čas |
| Testové chování | tempo, vynechávání, kontrola, změny odpovědí |

MVP používá transparentní pravidlové skórování. Pokročilé adaptivní modely nebo IRT se zvažují až po získání dostatečného počtu reálných odpovědí.

---

## 7. Hlavní uživatelská cesta

### 7.1 První návštěva

1. Žák nebo rodič otevře veřejnou vstupní stránku.
2. Aplikace vysvětlí, že nejde o oficiální produkt CERMAT a že výsledky jsou orientační.
3. Uživatel může spustit screening bez výběru školy.
4. Pro uložení pokroku si založí účet nebo přijme pozvánku rodiče.
5. Vyplní termín zkoušky, dostupný čas, preferované dny a volitelně cílové školy či cílové skóre.
6. Dokončí screening.
7. Získá předběžný profil a první týdenní plán.

### 7.2 Týdenní cyklus

1. Domovská obrazovka ukáže následující doporučenou aktivitu.
2. Žák může plán přijmout, přesunout, zkrátit nebo změnit poměr češtiny a matematiky.
3. Po krátké sadě dostane okamžitý rozbor.
4. U chybné úlohy může otevřít AI tutora.
5. Plán se průběžně přepočítá podle výsledků a skutečně dostupného času.
6. V pravidelném intervalu aplikace doporučí další plnou simulaci.

### 7.3 Rodičovský cyklus

1. Rodič vidí aktivitu za poslední období, plnění plánu a vývoj skóre.
2. Měsíční e-mail shrne pravidelnost, dokončené aktivity, posun a doporučený další krok.
3. Text nesmí vytvářet falešnou jistotu ani zvyšovat tlak prostřednictvím veřejného pořadí.

---

## 8. Funkční požadavky

### 8.1 Registrace a účty

#### Registrace rodičem

- Rodič ověří svůj e-mail.
- Založí profil žáka a případně mu odešle pozvánku.
- Má přístup k rodičovskému přehledu.

#### Registrace žákem

- Žák uvede vlastní přihlašovací e-mail a e-mail rodiče.
- Rodičovský e-mail musí být ověřen před odesíláním přehledů.
- Rodič získá dashboard pouze po přijetí samostatné pozvánky; jinak dostává sjednaný měsíční souhrn.
- Přesný souhlasový a věkový mechanismus musí před spuštěním ověřit právní kontrola. Služba cílí na děti a musí používat jasný a věku přiměřený jazyk. GDPR u služeb informační společnosti požaduje zvláštní režim souhlasu dítěte a přiměřené ověření rodičovského oprávnění tam, kde je právním základem souhlas. [GDPR, článek 8](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32016R0679)

#### Minimální data

- přihlašovací údaje;
- role účtu;
- vazba rodič–žák;
- ročník;
- plán a výsledky;
- volitelné cílové školy;
- technické údaje nezbytné pro bezpečnost a provoz.

Nesbírat datum narození, adresu, školní třídu ani jiné údaje, pokud nejsou pro funkci nutné.

### 8.2 Studijní plán

Plán kombinuje:

- datum JPZ;
- počet minut dostupných týdně;
- preferované dny a délku jedné aktivity;
- diagnostický profil;
- cílové skóre;
- volitelné historické indikátory vybraných škol;
- předchozí výsledky a pravidelnost.

Žák může:

- měnit dostupný čas;
- přesouvat nebo vynechávat aktivity;
- zvýšit podíl zvoleného předmětu či tématu;
- vybrat režim „doporuč mi“, „chci procvičit“ nebo „chci celý test“;
- plán dočasně pozastavit.

Algoritmus nesmí trestat neaktivitu. Po návratu plán přepočítá zbývající čas a nabídne dosažitelný další krok.

### 8.3 Cílené procvičování

- Sady mají obvykle 10–20 minut.
- Každá sada má jednoznačný cíl a očekávaný bodový přínos.
- Obtížnost se upravuje podle výkonu, ale zachovává kontakt s různými typy úloh JPZ.
- Systém neopakuje totožnou úlohu jako důkaz zvládnutí; používá jinou úlohu stejného typu.
- Po sadě zobrazí výsledek, příčiny chyb a doporučený další krok.

### 8.4 Digitální plný test

- Režim celé simulace má časovač odpovídající zvolenému předmětu.
- Uživatel může úlohu přeskočit, označit k návratu a měnit odpověď.
- Po vypršení času se test automaticky ukončí.
- Během testu není dostupný AI tutor ani kontrola správnosti.
- Uživatelské rozhraní se podobá logice práce se zadáním, ale nekopíruje chráněný vzhled či obsah materiálů CERMAT.
- Po odevzdání se použije bodování definované pro konkrétní typ položky.
- Výsledek ukáže celkové body, body podle oblastí, práci s časem a rozbor chyb.

### 8.5 AI tutor

Tutor se otevírá nad konkrétní úlohou, chybou nebo tématem. Výchozí postup:

1. stručně pojmenuje pravděpodobný problém;
2. ověří jednou otázkou, čemu žák nerozumí;
3. vysvětlí princip přiměřeným jazykem;
4. ukáže analogický příklad, nikoli pouze hotovou odpověď;
5. nechá žáka dokončit další krok;
6. na požádání zobrazí celé řešení;
7. nabídne jednu navazující úlohu.

Požadavky:

- Tutor vychází z publikovaného řešení a schválených metadat úlohy.
- Nemění správnou odpověď ani bodování.
- Pokud si není jistý, přizná nejistotu a nabídne pevný schválený rozbor.
- Odpovědi musí být krátké, věkově přiměřené a v češtině.
- Žák může odpověď označit jako nesrozumitelnou nebo chybnou.
- Tutor nesmí žákovi tvrdit, že přijetí na školu je jisté.

### 8.6 Napojení na konkrétní školu

Výběr školy je volitelný. U každé školy lze zobrazit:

- historický rozsah nebo hranici skóre přijatých, pokud ji data dovolují spolehlivě určit;
- rok a velikost vzorku;
- aktuální skóre žáka a rozdíl vůči orientačnímu cíli;
- volatilitu mezi dostupnými roky;
- výslovné upozornění, že další rok může mít jinou obtížnost, počet uchazečů, kapacitu a kritéria.

Zakázané formulace:

- „Tolik bodů budeš potřebovat.“
- „Máš 80% jistotu přijetí.“
- „Když splníš plán, dostaneš se.“

Doporučená formulace:

> V roce 2026 se mezi přijatými na tento obor objevovala tato bodová úroveň. Jde o orientační srovnání, nikoli předpověď hranice pro příští rok.

Pokud jsou k dispozici pouze průměry přijatých, nesmí být prezentovány jako minimální hranice.

### 8.7 Anonymní srovnání kohort

Žák může vidět:

- percentil celkového skóre;
- percentil po předmětech;
- změnu percentilu mezi plnými simulacemi;
- srovnání tempa a dokončení testu.

Pravidla:

- nezobrazovat jména ani veřejný žebříček;
- zobrazit kohortu až při alespoň 100 platných výsledcích stejného typu testu;
- do srovnání zahrnout pouze dokončené pokusy ve standardním časovém režimu;
- jasně uvést, že jde o uživatele aplikace, nikoli reprezentativní vzorek všech deváťáků;
- zabránit tomu, aby opakované řešení stejné varianty uměle zlepšovalo kohortový výsledek.

### 8.8 Rodičovský přehled a měsíční e-mail

Dashboard obsahuje:

- počet dokončených aktivit a čas věnovaný přípravě;
- plnění plánu;
- vývoj skóre z plných testů;
- oblasti s posunem a oblasti doporučené k procvičení;
- datum poslední aktivity;
- vysvětlení nejistoty bodového odhadu.

Měsíční e-mail obsahuje pouze potřebný souhrn a odkaz na zabezpečený dashboard. Nesmí obsahovat kompletní odpovědi, konverzace s tutorem ani citlivé profilování v otevřeném e-mailu.

---

## 9. Tvorba a kontrola obsahu pomocí AI

### 9.1 Zásada původnosti

Historické testy a specifikace CERMAT slouží jako reference rozsahu, struktury a typu dovedností. Publikované úlohy musí být původní. Testová dokumentace CERMAT je chráněna autorskými právy a její další zveřejnění či komerční použití bez písemného souhlasu není dovoleno; povolené je odkazování na stránky CERMAT. [Pravidla využití obsahu CERMAT](https://prijimacky.cermat.cz/files/files/dokumenty/testova-zadani/CZVV_pravidla-vyuziti-webstranky.pdf)

### 9.2 Obsahový blueprint

Před generováním vznikne verzovaný blueprint pro oba předměty:

- dovednost a tematická oblast;
- typ a formát úlohy;
- bodování;
- cílová obtížnost;
- předpokládaný čas;
- povolené pomůcky;
- typické chybné postupy;
- požadavky na jednoznačnost zadání;
- vazba na aktuální specifikaci požadavků JPZ.

Specifikace CERMAT vychází z RVP ZV a vymezuje rozsah požadovaných vědomostí a dovedností. [Specifikace požadavků](https://prijimacky.cermat.cz/menu/specifikace-pozadavku-k-jpz)

### 9.3 Publikační pipeline

```text
blueprint
  ↓
AI generátor: zadání + správná odpověď + řešení + metadata
  ↓
deterministické kontroly a kontrola podobnosti
  ↓
nezávislí AI řešitelé bez znalosti navržené odpovědi
  ↓
AI hodnotitelé podle rubriky
  ↓
řešení neshod / zamítnutí
  ↓
schválení učitelem
  ↓
pilotní data a průběžná kalibrace
  ↓
publikace
```

### 9.4 Kontrolní brány

Každá úloha musí projít následujícími kontrolami:

1. **Správnost:** nezávislé řešení dospěje ke stejné odpovědi.
2. **Jednoznačnost:** zadání nemá více přijatelných interpretací.
3. **Řešitelnost:** všechny nutné informace jsou v zadání.
4. **Bodování:** odpovědi a dílčí body odpovídají definované rubrice.
5. **Jazyk:** text je přirozený, věkově vhodný a bez matoucích formulací.
6. **Soulad s blueprintem:** úloha měří zamýšlenou dovednost a formát.
7. **Původnost:** podobnost s historickými a již publikovanými úlohami je pod stanoveným limitem.
8. **Obtížnost:** odhad odpovídá cílovému pásmu; později se nahradí empirickou hodnotou.
9. **Výklad:** krokové řešení je správné a použitelné pro AI tutora.
10. **Člověk:** schvalující učitel potvrdí publikaci.

### 9.5 LLM-as-a-judge

LLM hodnotitel se používá jako filtr, nikoli jako konečná autorita. Výzkum ukazuje, že hodnocení modely může trpět pozičními a dalšími systematickými zkresleními. [Studie pozičního zkreslení](https://arxiv.org/abs/2406.07791)

Požadavky na hodnoticí vrstvu:

- generátor a hodnotitel nemají být stejná instance s dostupnou historií generování;
- používat více nezávislých řešitelů a alespoň dva hodnoticí průchody;
- pořadí variant při porovnávání náhodně obracet;
- hodnotit podle explicitní rubriky po jednotlivých kritériích, ne jedním celkovým skóre;
- při neshodě úlohu automaticky neposouvat k publikaci;
- pravidelně porovnávat verdikty AI s rozhodnutími učitelů;
- vést auditní stopu verze promptu, modelu, výstupů a schválení.

### 9.6 Provozní kvalita položek

Po nasazení se sleduje:

- podíl správných odpovědí;
- diskriminační schopnost položky;
- neobvykle časté alternativní odpovědi;
- čas řešení;
- počet hlášení;
- nesoulad mezi odhadovanou a empirickou obtížností;
- stabilita výsledků napříč kohortami.

Podezřelá úloha se automaticky skryje z nových testů a čeká na kontrolu.

---

## 10. Rozsah bezplatného MVP

### 10.1 Funkční rozsah

MVP vydané do 31. srpna 2026 obsahuje:

- vstupní stránku a vysvětlení služby;
- registraci žákem nebo rodičem;
- dvoustupňovou diagnostiku;
- osobní a ručně upravitelný plán;
- cílené sady z češtiny a matematiky;
- AI tutora nad schváleným řešením;
- alespoň jednu plnou digitální simulaci pro každý předmět;
- rozbor výsledku a aktualizaci profilu;
- rodičovský přehled a infrastrukturu měsíčního e-mailu;
- volitelný výběr cílových škol a orientační historické srovnání;
- kohortové srovnání připravené k aktivaci po dosažení minimálního vzorku;
- administrační workflow pro tvorbu, schvalování, stažení a verze úloh;
- hlášení problematické úlohy nebo odpovědi tutora.

### 10.2 Obsahový cíl MVP

- 1 samostatná screeningová sada pokrývající oba předměty;
- 2 párové varianty plné simulace, pokud to dovolí kapacita odborného schvalování;
- minimálně 120 samostatných procvičovacích úloh rozdělených mezi češtinu a matematiku;
- schválené krokové řešení a metadata pro každou publikovanou úlohu;
- žádné opakované použití screeningových položek v první plné simulaci.

Pevná publikační podmínka je kvalita a učitelské schválení, nikoli dosažení počtu za cenu nezkontrolovaného obsahu. Pokud kapacita nestačí, vydá se jedna plná párová varianta a menší banka úloh; nesnižují se kontrolní brány.

### 10.3 Mimo MVP / placené rozšíření

- více plných testových variant;
- rozsáhlejší adaptivní procvičování;
- podrobnější analýza strategie;
- dlouhodobé predikční modely;
- další členové rodiny;
- exporty a pokročilé rodičovské reporty.

Pracovní monetizace po ověření MVP:

- zdarma: diagnostika, základní plán, omezené procvičování a alespoň jedna plná simulace;
- jednorázově přibližně 99–299 Kč: kompletní banka, další testy a delší používání;
- bez automatického obnovování a bez předplatného.

---

## 11. Informační architektura

Předběžné veřejné a aplikační cesty:

| Cesta | Účel |
|---|---|
| `/testy` | veřejná vstupní stránka |
| `/testy/diagnostika` | rychlý screening |
| `/testy/plan` | studijní plán |
| `/testy/procvicovani` | cílené sady |
| `/testy/simulace` | výběr a průběh plného testu |
| `/testy/vysledky/[attempt]` | rozbor pokusu |
| `/testy/pokrok` | profil a vývoj žáka |
| `/testy/rodic` | rodičovský přehled |

Veřejné obsahové stránky mají být indexovatelné. Osobní výsledky, plán, dashboardy a pokusy musí být `noindex` a dostupné pouze po autorizaci.

---

## 12. UX zásady

- Výchozí obrazovka nabízí jeden zřetelný další krok.
- Výsledky používají body a konkrétní doporučení, ne školní známky.
- Slabina se formuluje jako dovednost k procvičení, nikoli vlastnost žáka.
- Aplikace odděluje „zatím nevíme“ od „toto je slabina“.
- Časový tlak se používá v diagnostice a simulaci, ne v každé výukové aktivitě.
- Žák může plán upravit bez sankce nebo ztráty série.
- Srovnání s kohortou je doplněk; hlavním měřítkem je posun vlastního výkonu.
- Rozhraní funguje na mobilu pro plán a procvičování, ale plný test doporučí větší obrazovku.

---

## 13. Metriky úspěchu

### 13.1 Aktivační metriky

- podíl návštěvníků, kteří zahájí screening;
- podíl zahájených screeningů dokončených do 48 hodin;
- podíl žáků, kteří po screeningu otevřou první doporučenou aktivitu;
- podíl žáků, kteří do sedmi dnů zahájí plnou kalibrační simulaci.

### 13.2 Metriky používání

- počet aktivních studijních dnů za týden;
- dokončení plánovaných aktivit;
- návrat ve druhém a čtvrtém týdnu;
- využití a hodnocení AI vysvětlení;
- podíl ručně upravených plánů.

### 13.3 Výsledkové metriky

- změna bodů mezi první a další plnou simulací;
- snížení počtu nedokončených úloh;
- zlepšení v prioritních oblastech;
- přesnost předběžného profilu vůči plné simulaci;
- shoda AI kontrol s rozhodnutími učitelů;
- podíl stažených nebo reklamovaných položek.

### 13.4 Ochranné metriky

- počet chybných či zavádějících odpovědí tutora;
- počet bezpečnostních a soukromých incidentů;
- míra odhlášení rodičovských e-mailů;
- počet stížností na matoucí školní indikátory;
- náklady AI na jednu dokončenou aktivitu.

Konkrétní cílové hodnoty se nastaví po pilotu, aby nevycházely z odhadu bez dat.

---

## 14. Nefunkční požadavky

### 14.1 Dostupnost a výkon

- Automatické ukládání odpovědí během testu.
- Obnovení pokusu po krátkém výpadku bez ztráty odpovědí; čas se řídí serverovým stavem.
- Běžná procvičovací obrazovka musí být použitelná na mobilu od šířky 360 px.
- Plný test musí fungovat na tabletu a desktopu.

### 14.2 Bezpečnost a soukromí

- Oddělení oprávnění žáka, rodiče a správce.
- Šifrování přenosu a bezpečné uložení přihlašovacích údajů.
- Audit přístupů k dětským profilům a obsahovým schválením.
- Možnost stáhnout data a smazat účet.
- Stanovená retenční doba pro chat a detailní pokusy.
- Nepoužívat konverzace nezletilých k trénování externích modelů bez samostatného právního posouzení a informování.
- Minimalizovat osobní údaje posílané poskytovateli modelu; tutor má pracovat s úlohou a anonymizovaným kontextem.

### 14.3 Pozorovatelnost

- sledování chyb generování a odpovědí AI;
- náklady a latence podle typu aktivity;
- verze modelu a promptu u každé AI odpovědi;
- možnost reprodukovat obsahové schválení a důvod zamítnutí.

---

## 15. Rizika a mitigace

| Riziko | Dopad | Mitigace |
|---|---|---|
| Chybná nebo nejednoznačná AI úloha | ztráta důvěry, nesprávné učení | nezávislí řešitelé, rubrika, učitel, hlášení a okamžité stažení |
| AI tutor vysvětlí správnou úlohu chybně | zmatení žáka | uzemnění ve schváleném řešení, fallback na pevný rozbor, audit |
| Kopírování chráněného obsahu CERMAT | právní a reputační problém | kontrola podobnosti, původní zadání, právní kontrola, odkazy místo kopií |
| Historická hranice školy působí jako záruka | chybné rozhodnutí rodiny | rozsah, rok, nejistota, zákaz prediktivních formulací |
| Kohorta není reprezentativní | zavádějící percentil | minimální vzorek, popis populace, standardní pokusy |
| Produkt pracuje s údaji nezletilých | právní a bezpečnostní riziko | minimalizace dat, rodičovské ověření, právní kontrola, dětský jazyk |
| Termín 31. 8. 2026 je krátký | neúplné nebo nekvalitní MVP | pevné P0, omezení počtu variant, pilot, kvalita obsahu jako release gate |
| Chybějí schvalující učitelé | nelze publikovat obsah | zajistit učitele pro oba předměty na začátku projektu |
| Náklady a odezva AI tutora | drahá nebo pomalá služba | krátký kontext, cache pevných částí, limity, měření ceny na aktivitu |

---

## 16. Harmonogram do 31. srpna 2026

### 10.–17. července

- schválit PRD a rozsah P0;
- určit produktové a technické vlastníky;
- zajistit učitele češtiny a matematiky;
- vytvořit blueprint a schvalovací rubriky;
- rozhodnout `/testy` versus subdoména;
- uzavřít datový a právní návrh registrace nezletilých.

### 18.–31. července

- účty, role a základní datový model;
- obsahová pipeline a administrační schválení;
- screening a základ diagnostického profilu;
- první generované a schválené položky;
- prototyp studijního plánu.

### 1.–14. srpna

- cílené procvičování;
- AI tutor;
- plný test a vyhodnocení;
- propojení školních indikátorů;
- rodičovský přehled a e-mailová šablona.

### 15.–23. srpna

- interní kontrola obsahu;
- pilot s přibližně 30–50 žáky;
- kontrola srozumitelnosti, časů a problémových úloh;
- bezpečnostní, soukromá a výkonová kontrola.

### 24.–31. srpna

- opravy podle pilotu;
- stažení nebo úprava sporných položek;
- dokončení veřejných stránek a analytiky;
- vydání bezplatného MVP.

---

## 17. Priority při omezení času

### P0 – bez toho se MVP nevydá

- odborně schválený obsah;
- rychlý screening;
- alespoň jedna plná simulace pro oba předměty;
- diagnostický profil a upravitelný plán;
- cílené procvičování;
- AI tutor s fallbackem na schválené vysvětlení;
- bezpečné účty žáka a rodiče;
- ochrana osobních údajů a automatické ukládání testu.

### P1 – lze aktivovat krátce po vydání

- druhá plná simulace;
- rodičovský měsíční e-mail;
- volba konkrétních škol;
- kohortový percentil po dosažení minimálního vzorku;
- jemnější analýza testové strategie.

### P2 – po ověření používání

- jednorázová platba;
- větší banka testů;
- pokročilejší adaptivita;
- další rodičovské reporty.

---

## 18. Otevřená rozhodnutí

1. Kdo bude produktovým vlastníkem a kdo schvaluje změny rozsahu?
2. Kteří učitelé budou schvalovat češtinu a matematiku a jakou mají kapacitu?
3. Bude modul ve stejném Next.js projektu pod `/testy`, nebo půjde o samostatné nasazení za reverzní proxy?
4. Jaký poskytovatel identity, databáze, e-mailů a AI modelů bude použit?
5. Jaká přesná historická metrika školy je k dispozici: minimum přijatých, percentil, průměr, nebo kombinace?
6. Jak se bude ověřovat rodičovská vazba a jaký právní základ se použije pro jednotlivé typy zpracování?
7. Kolik schválených úloh zvládne obsahový tým připravit před pilotem?
8. Jaké limity konverzace a nákladů dostane AI tutor v bezplatné verzi?
9. Jak bude definován a měřen pilotní úspěch před veřejným vydáním?

---

## 19. Akceptační kritéria MVP

MVP je připravené k vydání, pokud:

- nový žák dokončí screening a získá předběžný plán bez ruční pomoci;
- po plné simulaci se profil a plán přepočítají;
- každá publikovaná položka má auditní stopu AI kontrol a schválení učitelem;
- digitální test spolehlivě ukládá odpovědi a dodržuje časový limit;
- žák může u chybné úlohy získat vysvětlení a položit doplňující otázku;
- rodič založený jako vlastník profilu vidí pokrok svého žáka, nikoli cizí data;
- školní srovnání obsahuje rok, typ metriky a upozornění na nejistotu;
- kohortové srovnání se nezobrazí pod minimálním vzorkem;
- osobní stránky nejsou indexovatelné;
- proběhne pilot, kontrola odborného obsahu a právní kontrola práce s údaji nezletilých;
- nejsou otevřené chyby, které mohou změnit bodování, odhalit data nebo přerušit celý test.
