# Novinky k přijímačkám e-mailem

Verze 1.1 · 17. 9. 2026 · Návrh k rozhodnutí, nic není implementované. Vypořádána [oponentura v1.0](oponentura-novinky-k-prijimackam-2027.md), viz oddíl 12.

Návštěvník webu zadá e-mail a během přijímacího řízení dostává s předstihem připomínky termínů a pokyny, co je potřeba připravit. Na rozdíl od [sledování škol a oborů](sledovani-skol-2027.md) (větev `docs/sledovani-skol-a-oboru`, v2.1) dostanou všichni odběratelé téhož ročníku a druhu studia stejný obsah. Návrh navazuje na [kalendář přijímaček](aktualizace-kalendar-data-2027.md) (`src/data/admissions-2027.json`, sada `msmt-harmonogram` v registru na větvi `feat/titulka-nabidka-oboru`) a na [analýzu návštěvnosti](analyza-navstevnosti-2026.md).

## 1. Hlavní rozhodnutí

1. **Novinky nabízejí jen samy sebe.** Společný formulář se sledováním školy vznikne, až bude sledování schválené a bude mít fungující odesílač. Do té doby formulář nabízí jen termíny. Obě funkce ale ukládají odběratele do stejné databáze (bod 7), takže pozdější spojení nepotřebuje žádný převod dat.
2. **Novinky se spustí dřív než sledování.** Nepotřebují záznam událostí ani převod klíčů oborů, stačí jim kalendář MŠMT, který web už má.
3. **Formulář nabízí jen ročník, pro který je zveřejněný kalendář, a jen druh studia, který web pokrývá.** Pro ročník přijímaček 2027 to je střední škola po 9. třídě a víceleté gymnázium. **Konzervatoř se nenabízí**, protože web obory bez jednotné zkoušky nepokrývá a e-maily by odkazovaly na nástroje, které konzervatořím nic neřeknou. Rodinám s mladšími dětmi formulář nabídne jen jednu zprávu, až vyjde další kalendář (oddíl 4).
4. **Termíny v e-mailu se berou z kalendáře, ne z textu.** Šablona odkazuje na událost (`ss-prihlasky`) a generátor doplní datum a rok ze souboru kalendáře. Letopočet se do šablon nepíše.
5. **Každý e-mail vzniká v repozitáři a odejde jen po sloučení pull requestu.** Texty procházejí [slovníkem pojmů](slovnik-pojmu.md) stejně jako stránky webu. Odesílač čte e-maily z nasazeného webu, takže nic neodejde bez revize.
6. **Formulář je výrazný, ale nevyskakuje.** Má stálé místo na titulní stránce, v patičce a u kalendáře. Vyskakovací okno ani lišta přes obsah se nepoužijí.
7. **Odběratelé leží ve vlastní databázi Neon Postgres, e-maily odcházejí jako dávky transakčních e-mailů Resendu.** Omezení počtu potvrzovacích e-mailů na jednu adresu potřebuje úložiště tak jako tak. Kontakty Resendu by tedy byly druhým úložištěm souhlasů, ne náhradou databáze (oddíl 6).
8. **Plošně se oznamují jen velké změny dat, které se týkají přijímaček, a jen v sezóně ročníku:** nová nabídka oborů, výsledky 1. kola, pásma přijetí. Maturita a inspekce patří do sledování školy, doprava ani revize nikam. Sada přepnutá mimo sezónu otevřeného ročníku se zmíní v nejbližším e-mailu, nedostane vlastní.
9. **Do potvrzení se nic neukládá** (double opt-in). Po odhlášení se odběratel smaže. Po skončení ročníku přijímaček se smaže také.

## 2. Co máme a co chybí

| Potřeba | Stav | Kde |
|---|---|---|
| Odesílání e-mailů | **máme** Resend Pro (transakční, 50 000 e-mailů měsíčně), volání přes `fetch`, odesílatel `noreply@prijimackynaskolu.cz` | `src/lib/portal-email.ts`, `src/app/api/bug-report/route.ts` |
| Měření otevření a kliknutí v Resendu | **vypnuté**: Resend ho nastavuje pro celou doménu a výchozí stav je vypnuto (dokumentace ověřena 17. 9. 2026) | nastavení domény |
| Podepsaný odkaz bez hesla | **máme** HMAC token | `src/lib/portal-magic.ts` |
| Ochrana formuláře | skryté pole a kontrola odkazů v `bug-report`; omezení počtu požadavků **jen v paměti instance** | `src/app/api/bug-report/route.ts`, `src/app/api/portal-magic/route.ts` |
| Omezení požadavků ve firewallu Vercelu | **dostupné** na tarifu Pro, ale jen podle IP adresy nebo otisku JA4, s oknem nejvýš 10 minut; na adresu e-mailu ani na den nestačí (ověřeno 17. 9. 2026) | nastavení projektu |
| Termíny ročníku | **máme** 20 událostí ve třech skupinách, ICS export | `src/data/admissions-2027.json`, `/prijimacky-2027` |
| Sada `msmt-harmonogram` v registru | **jen na nesloučené větvi** `feat/titulka-nabidka-oboru` | `public/stav_datovych_sad.json` |
| Úložiště odběratelů | **chybí**; sledování v2.1 navrhuje Neon | viz oddíl 6 |
| Plánovač | GitHub cron se zpožďuje o hodiny, Vercel Cron není nastavený | `.github/workflows/`, `vercel.json` |
| Zásady ochrany osobních údajů | **chybí** úplně; web navíc používá Matomo s cookies bez souhlasové lišty (`src/app/layout.tsx`) | společné se sledováním, v2.1 §8 |

## 3. Co budeme posílat

Kalendář 2027 dává pevné body, ke kterým se e-mail váže. U každého e-mailu je v tabulce událost z `admissions-2027.json` a předstih. Termíny v závorce jsou jen pro čtenáře návrhu, šablony je neobsahují.

| E-mail | Vazba na událost | Kdy odeslat | Komu | Obsah |
|---|---|---|---|---|
| **Uvítání** | — | hned po potvrzení | všem | přehled termínů ročníku, odkaz na kalendář a ICS, co dělat teď podle měsíce; zmínka o datech přepnutých od posledního e-mailu |
| Výběr školy a dny otevřených dveří | — (sezóna listopad až leden) | začátek prosince, **jen pokud je N2 hotová**; jinak se obsah přesune do uvítání | SŠ, víceleté | jak vybírat, co se ptát, odkaz na simulátor a stránky škol |
| **Školy vyhlašují kritéria** | `ss-kriteria` (15.–31. 1. 2027) | 3 dny před začátkem | SŠ, víceleté | co v kritériích hledat: požadavek školy, hranice úspěšnosti, školní zkouška; nabídka oborů pro nový rok. **První e-mail, který musí odejít** |
| **Přihlášky** | `ss-prihlasky` (1.–22. 2. 2027) | 5 dní před začátkem, **připomínka 4 dny před koncem** | SŠ, víceleté | jak podat přihlášku, pořadí na přihlášce („šanci na přijetí nemění, škola řadí jen podle svých kritérií“), přílohy |
| Nová nabídka oborů na webu | přepnutí `cermat-prihlasky` | po nasazení | SŠ, víceleté | obory a místa pro nový rok jsou na stránkách škol |
| Školní a talentové zkoušky | `ss-skolni` | 7 dní před | SŠ, víceleté | pozvánka od školy, náhradní termíny |
| **Jednotná zkouška** | `jpz-4-1`, `jpz-vice-1` | 10 dní před | podle druhu studia | který den, co s sebou, náhradní termín při nemoci |
| **Výsledky a 2. kolo** | `ss-vysledky`, `k2-kriteria`, `k2-prihlasky` | ráno v den výsledků | SŠ, víceleté | jak zjistit výsledek, co když se uchazeč nedostal nikam: 2. kolo trvá jen pár dní a začíná týž den |
| Výsledky 2. kola a konec ročníku | `k2-vysledky` | v den výsledků | všem | co dál; odběratel ročníku bude smazán, nabídka jedné zprávy o dalším kalendáři pro mladšího sourozence |
| Kalendář dalšího ročníku | přepnutí `msmt-harmonogram` | po nasazení | kdo si o zprávu řekl (oddíl 4) | vyšel kalendář; odkaz na potvrzení odběru nového ročníku. Kdo nepotvrdí do 30 dnů, bude smazán |

Za ročník je to 8 až 10 e-mailů, v únoru a květnu po dvou až třech. Nejdůležitější jsou řádky zvýrazněné tučně.

**Schválení:** pull request s e-mailem musí být sloučený **nejpozději den před odesláním**. U e-mailu „Výsledky a 2. kolo“ se připravuje týden předem, protože je to nejcennější e-mail ročníku a nesmí se nestihnout.

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
| **Titulní stránka, tmavá karta „Přijímačky 2027“** (`src/app/page.tsx`), pod větou o termínech přihlášek | **použít, hlavní místo** | karta už mluví o termínech, formulář v ní na „Termíny už známe“ přirozeně navazuje; je vidět bez posouvání i na telefonu |
| **Titulní stránka, modrý pás „Vyzkoušej zdarma“** na konci | **použít**, druhý formulář | kdo dočte titulní stránku, dostane druhou příležitost; pás už je výzvou k akci |
| **Patička na všech stránkách** (`src/components/Footer.tsx`), nový první sloupec „Termíny e-mailem“ | **použít** | je na každé stránce webu včetně stránek škol, kam přichází většina lidí z vyhledávání; formulář tu má jen jedno pole a tlačítko |
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
┌ Termíny přijímaček e-mailem ───────────────────────────────────────┐
│ Pošleme ti s předstihem termíny přijímaček 2027 a co je potřeba    │
│ připravit: kritéria, přihlášky, jednotná zkouška, výsledky         │
│ a 2. kolo.                                                          │
│ Hlásíš se na: (•) střední školu po 9. třídě                        │
│               ( ) víceleté gymnázium                                │
│ [ e-mail                         ]  [ Posílat termíny ]            │
│ [ ] Odběr zakládám pro sebe nebo své dítě a je mi alespoň 15 let.   │
│ Nejvýš pár e-mailů měsíčně, jen do konce přijímaček 2027.          │
│ Odhlásit se jde jedním kliknutím. Zásady ochrany osobních údajů    │
│                                                                     │
│ Přijímačky vás čekají až v dalších letech?                         │
│ → Dejte mi vědět, až vyjde kalendář dalšího ročníku (jeden e-mail) │
└────────────────────────────────────────────────────────────────────┘
```

- **Rok v textu** se bere ze zobrazeného období sady `msmt-harmonogram`. Formulář se zobrazí, jen když kalendář toho období obsahuje budoucí událost. Poslední událostí ročníku odběr ročníku končí a formulář nabídne jen zprávu o dalším kalendáři. Automatika tak nemůže nabídnout ročník, pro který obsah neexistuje.
- **Zpráva o dalším kalendáři** je samostatný účel s vlastním souhlasem: jeden e-mail po přepnutí `msmt-harmonogram`, v něm potvrzení odběru nového ročníku, bez potvrzení smazání do 30 dnů. Nikdo tak nedostane první e-mail po jedenácti měsících ticha bez vysvětlení.
- V patičce zůstane jen pole e-mailu a tlačítko, druh studia a souhlas se doplní na potvrzovací stránce.
- Stavy: „Posílat termíny“ → „Potvrď v e-mailu“ → „Odebíráš termíny“. Stav si pamatuje prohlížeč a formuláře se pak na webu skryjí.

**Mimo web:** stránka `/novinky` s QR kódem je určená výchovným poradcům základních škol a rodičovským skupinám. Adresy základních škol z rejstříku k oslovení **nepoužijeme**, viz oddíl 8.

## 5. Kdo se přihlašuje: věk a souhlas

Uchazeči o víceleté gymnázium mají 11 až 13 let, uchazeči po 9. třídě 14 až 15. Český zákon o zpracování osobních údajů (110/2019 Sb., § 7) stanoví hranici pro souhlas dítěte se službami informační společnosti na 15 let. Proto:

- Souhlas je jedna pravdivá podmínka: **„Odběr zakládám pro sebe nebo své dítě a je mi alespoň 15 let.“** Čtrnáctiletý uchazeč se tedy přihlásí přes rodiče a nemusí nepravdivě tvrdit, že rodičem je.
- E-maily oslovují **rodinu**: tykají jako web a píšou tak, aby jim rozuměl rodič i uchazeč („Vy doma“ se nepoužívá, věty jsou o tom, co je potřeba udělat).
- Neptáme se na jméno, školu, kraj ani ročník dítěte ve škole. Stačí druh studia.
- **Právní kontrola před N1:** text zásad, text souhlasu a oslovení v e-mailech, když souhlas dává rodič a obsah čte dítě.

## 6. Úložiště a rozesílání

| Varianta | Rozhodnutí | Proč |
|---|---|---|
| **B. Databáze Neon Postgres a dávky transakčních e-mailů** | **doporučeno** | omezení počtu potvrzení na adresu potřebuje úložiště tak jako tak (viz níže); jedno úložiště souhlasů pro novinky i sledování, jedna cesta k mazání; bezplatný Neon a už placený Resend Pro, tedy bez nákladů navíc |
| A. Kontakty a rozesílky v Resendu | zavrhnout | argument „bez databáze“ neplatí; druhé úložiště souhlasů s vlastním odhlašováním a pozdější převod dat; marketingový tarif je zdarma jen do 1 000 kontaktů, pak od 40 USD měsíčně za 5 000, tedy v nejsilnější sezóně |
| C. Samostatná služba na newslettery (Ecomail, Mailchimp) | zavrhnout | další zpracovatel osobních údajů, texty mimo repozitář |
| D. Seznam v repozitáři nebo v GitHub issues | zavrhnout | repozitář je veřejný |

**Proč úložiště potřebuje každá varianta.** Formulář by šel zneužít k zahlcení cizí adresy potvrzovacími e-maily. Adresa, kterou oběť nikdy nepotvrdí, v Resendu jako kontakt nevznikne, takže kontrola „kontakt už existuje“ útok nezastaví. Firewall Vercelu počítá jen podle IP adresy a nejvýš po 10 minutách. Limit „nejvýš 3 potvrzení na adresu za 24 hodin“ proto potřebuje tabulku otisků adres, stejnou jako `limit_potvrzeni` ve sledování v2.1 (§7.1).

**Rozhodnutí o sledování na volbě nezávisí.** Pokud se sledování schválí, přidá do téže databáze své tabulky. Pokud ne, novinky mají vlastní malou databázi, kterou lze později rozšířit.

### Tabulky

Navazují na schéma sledování v2.1 (§7.2). Odběratel je společný, odběr novinek je vlastní tabulka:

```sql
-- odberatel a limit_potvrzeni podle sledování v2.1 §7.2
create table odber_novinek (
  odberatel_id uuid references odberatel on delete cascade,
  rocnik text not null,          -- období sady msmt-harmonogram, například '2027'
  druh_studia text not null check (druh_studia in ('ss', 'vicelete')),
  zdroj text not null,           -- místo formuláře: titulka-karta, paticka, kalendar, …
  potvrzeno timestamptz not null,
  primary key (odberatel_id, rocnik)
);

create table zprava_o_kalendari (
  odberatel_id uuid references odberatel on delete cascade primary key,
  potvrzeno timestamptz not null
);

create table odeslano_novinky (
  odberatel_id uuid references odberatel on delete cascade,
  email text not null,           -- identifikátor e-mailu ze souboru v repozitáři
  odeslano timestamptz not null,
  resend_id text,
  primary key (odberatel_id, email)
);
```

### Průběh

1. `POST /api/novinky/prihlasit` přijme e-mail, druh studia, zdroj, souhlas a skryté pole. Odpověď je vždy stejná. Limit na IP adresu zajistí pravidlo ve firewallu Vercelu, limit na adresu tabulka `limit_potvrzeni`.
2. Server pošle potvrzovací e-mail s tokenem HMAC (`NOVINKY_SECRET`, platnost 72 h, vzor `portal-magic.ts`). Token nese e-mail a volby. **Do potvrzení se neukládá nic** kromě otisku adresy v limitu.
3. `GET /novinky/potvrdit?t=…` ověří token, založí odběratele a odběr a pošle uvítací e-mail.
4. **Odesílač** (Vercel Cron, jednou denně, `/api/novinky/odeslat`, chráněný `CRON_SECRET`) přečte z nasazeného webu e-maily k odeslání dnes a pošle je po dávkách přes `POST /emails/batch` s klíčem idempotence. Do `odeslano_novinky` zapíše, co odešlo. Opakovaný běh nic nepošle dvakrát.
5. Každý e-mail má odkaz na správu odběru a hlavičky `List-Unsubscribe` a `List-Unsubscribe-Post`, které míří na náš endpoint (vzor sledování v2.1, §7.1 a §7.5).
6. **Webhook** `/api/novinky/resend-webhook` s ověřením podpisu smaže odběratele při `email.bounced`, `email.complained` a `suppression.added`. Je to součást N1, ne sdílená závislost na sledování. Až sledování vznikne, převezme tentýž endpoint.
7. Po `k2-vysledky` a posledním e-mailu skript smaže odběry ročníku. Odběratel bez jiného odběru se smaže celý.
8. Před ostrým během odesílač čte hlavičku `x-resend-monthly-quota`. Když by e-maily vyčerpaly měsíční kvótu, neodešle nic a ohlásí to do Telegramu, aby kvóta zbyla na odkazy portálu. Při 8–10 e-mailech za ročník a nejvýš třech za měsíc unese kvóta 50 000 e-mailů přes 10 000 odběratelů, i když se o ni dělí se sledováním.

### Odesílací doména

E-maily půjdou z `novinky@novinky.prijimackynaskolu.cz`, stejně jako v2.1 navrhuje pro souhrny. Kdyby je někdo hromadně označil za spam, odkazy portálu škol z hlavní domény to nezasáhne. Na subdoméně zůstane měření otevření a kliknutí vypnuté. N0 to ověří v nastavení domény přes API a test to hlídá.

## 7. Jak e-mail vzniká

```text
content/novinky/sablony/
  uvitani.md
  kriteria.md            # frontmatter: udalost: ss-kriteria, predstih_dni: 3, segment: [ss, vicelete]
  prihlasky.md           # udalost: ss-prihlasky, predstih_dni: 5
  prihlasky-konec.md     # udalost: ss-prihlasky, vztah: konec, predstih_dni: 4
  vysledky-a-druhe-kolo.md
  ...
content/novinky/2027/
  2027-01-12-kriteria.json   # vygenerovaný e-mail s daty, schválený sloučením
```

- `scripts/novinky.py plan` vypíše z kalendáře a šablon, co a kdy se má v otevřeném ročníku odeslat. Chybějící událost v kalendáři je chyba, ne tiché přeskočení.
- `scripts/novinky.py priprav <sablona>` doplní data a rok z `admissions-{rok}.json`, vyrobí předmět, HTML a textovou verzi a otevře pull request s datem odeslání. Správce o něm dostane zprávu do Telegramu.
- **Schválení je sloučení pull requestu**, nejpozději den před odesláním. Odesílač posílá jen e-maily, které jsou na nasazeném webu, takže neschválený text neodejde.
- Test hledá v šablonách i vygenerovaných e-mailech zakázaná slova ze slovníku pojmů. V šablonách navíc hledá napsané letopočty.
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

- **Matomo:** cíle „přihlášení k odběru“ a „potvrzení odběru“ s dimenzí místa formuláře. Odběr navíc ukládá `zdroj`, takže je vidět, odkud přicházejí lidé, kteří odběr opravdu potvrdí. Oba cíle jsou podmínkou dokončení N1, jinak se odhad podílu přihlášených nikdy neověří.
- **E-maily:** otevření ani kliknutí se neměří a měření na odesílací doméně zůstává vypnuté. Odkazy nesou `?zdroj=novinky`, aby Matomo odlišilo návštěvy z e-mailu. Měří se jen na webu a jen po kliknutí, takže slib „v e-mailech neměříme“ zůstává pravdivý.
- **Po únoru 2027:** podíl potvrzených odběrů z odeslaných formulářů, odhlášení po každém e-mailu, stížnosti na spam.

Odhad 2–5 % přihlášených z přibližně 5 000 identifikovaných návštěvníků za silný měsíc je předpoklad, ne měření.

## 10. Pořadí realizace

| Fáze | Obsah | Hotovo, když | Termín |
|---|---|---|---|
| **N0 Předpoklady** | sloučit `feat/titulka-nabidka-oboru` (sada `msmt-harmonogram`); zásady ochrany osobních údajů s právní kontrolou (společné se sledováním); databáze Neon; odesílací subdoména s vypnutým měřením; pravidlo omezení požadavků ve firewallu Vercelu v režimu „jen zaznamenat“ | stránka zásad je na webu, subdoména ověřená, `stav-datovych-sad.py kontrola` zná `msmt-harmonogram` | do 15. 11. 2026 |
| **N1 Odběr** | API přihlášení, potvrzení, správy a odhlášení; limit na adresu; webhook nedoručitelnosti a stížností; uvítací e-mail; formulář v patičce, na titulní stránce a v kalendáři; stránka `/novinky`; pojmy do slovníku; cíle v Matomu | celý cyklus přihlášení a odhlášení funguje na náhledu; nedoručitelná adresa odběr smaže; oba cíle Matomo zaznamenávají | do 1. 12. 2026 |
| **N2 Obsah** | šablony podle oddílu 3; `plan` a `priprav`; odesílač s dávkami, idempotencí a kontrolou kvóty; test zakázaných slov a letopočtů | pull request s e-mailem „Školy vyhlašují kritéria“ je připravený a odesílač ho nanečisto pošle správci | do 15. 12. 2026 |
| **N3 Rozšíření** | odkaz na stránkách škol, věta v simulátoru, konce průvodců; zpráva o nové nabídce oborů; zpráva o dalším kalendáři | e-mail o nové nabídce oborů odešel | březen 2027 |
| **N4 Se sledováním** | společný panel „sledovat školu / odebírat termíny“, jedna správa odběrů | odběratel spravuje obojí z jednoho odkazu | až bude sledování fungovat |

První e-mail, který musí odejít, je „Školy vyhlašují kritéria“ **12. 1. 2027**. Prosincový e-mail o výběru školy odejde, jen pokud bude N2 hotová.

## 11. Otevřené otázky

1. **Právní kontrola:** text zásad, souhlasu „pro sebe nebo své dítě, alespoň 15 let“ a oslovení rodiny v e-mailech.
2. **Sledování škol:** schválit, nebo ne? Na novinky to vliv nemá, rozhoduje jen o N4 a o tom, kdo zaplatí práci na společné databázi.
3. **Zpráva o dalším kalendáři:** nabízet (navrženo), nebo mladším rodinám nenabízet nic?

Po oponentuře navrženo a čeká na potvrzení zadavatele: název „Termíny přijímaček e-mailem“, tykání, odkazy s `?zdroj=novinky`, plošně jen velké přijímačkové změny dat a zatím bez kraje ve formuláři.

## 12. Vypořádání oponentury v1.0

[Oponentura](oponentura-novinky-k-prijimackam-2027.md) ověřila kalendář, místa formuláře, ochrany, Matomo i ceník Resendu a vznesla sedm sporných bodů. **Všech sedm se přijímá, S1 a S3 s úpravou.** Ověření k S4 šlo dál než oponentura: omezení požadavků ve firewallu Vercelu na adresu nestačí, takže databázi potřebuje i varianta s kontakty Resendu, a návrh proto přechází na databázi bez podmínky. Měření v e-mailech naopak překážkou spuštění není.

| # | Námitka | Vypořádání | Kde |
|---|---|---|---|
| **S1** | Plán minul vlastní první e-mail (konzervatoře 8. 10., odběr až 15. 10.) a termín 5. 10. pro zásady s právní kontrolou je nereálný | **přijato s úpravou.** Termíny posunuty: N0 do 15. 11., N1 do 1. 12., N2 do 15. 12. 2026. První e-mail, který musí odejít, je „Školy vyhlašují kritéria“ 12. 1. 2027. Sloučení `feat/titulka-nabidka-oboru` zařazeno do N0. Úprava proti oponentuře: prosincový e-mail o výběru školy zůstává jako nepovinný, protože listopad až leden je doba dnů otevřených dveří. Podzimní návštěvnost ale změřená není, takže na něm nic nestojí | 3, 4, 10 |
| **S2** | Konzervatoře jako první segment nemají na webu obsah | **přijato.** Titulní stránka sama říká, že konzervatoře nepokrývá. Segment se pro ročník 2027 nenabízí a otevře se, až web obory bez jednotné zkoušky pokryje | 1 (bod 3), 3 |
| **S3** | Ročník 2028 by jedenáct měsíců mlčel | **přijato s úpravou.** Formulář nabízí jen ročník se zveřejněným kalendářem a podmínku „nabízet ročník = mít kalendář“ hlídá sám formulář, ne ruční nastavení. Z variant oponentury zvolena jedna zpráva o dalším kalendáři, doplněná o nové potvrzení: bez kliknutí do 30 dnů se adresa smaže. Tím odpadá i riziko stížnosti od odběratele, který zapomněl, že se přihlásil | 1, 3, 4 |
| **S4** | Kontakty Resendu jsou druhé úložiště souhlasů na neověřených funkcích; rozhodnout podle schválení sledování | **přijato a rozšířeno.** Ověřeno 17. 9. 2026: (1) měření otevření a kliknutí je v Resendu nastavené pro celou doménu a ve výchozím stavu vypnuté, takže slib „neměříme“ jde dodržet, stačí ho hlídat na subdoméně; (2) firewall Vercelu na tarifu Pro počítá jen podle IP adresy nebo otisku JA4 a nejvýš po 10 minutách, takže limit potvrzení na adresu za den neudrží. Adresu, kterou oběť nepotvrdí, nechrání ani kontrola existujícího kontaktu. **Úložiště tedy potřebuje každá varianta**, a návrh proto doporučuje databázi Neon bez ohledu na rozhodnutí o sledování. Podmínka „go/no-go sledování před N0“ odpadá, sledování rozhoduje jen o N4. Ztrátu fronty a plánování Resendu nahradí denní Vercel Cron a e-maily schválené sloučením | 1 (bod 7), 2, 6 |
| **S5** | Souhlas „je mi 15, nebo jsem rodič“ nutí čtrnáctiletého k nepravdě; e-maily oslovují dítě, souhlas dává rodič | **přijato.** Souhlas přeformulován podle oponentury. E-maily oslovují rodinu. Oslovení je zadané do právní kontroly | 4, 5, 11 |
| **S6** | „Dva produkty, jedna adresa“ předbíhá neschválené sledování; sdílený webhook neexistuje | **přijato.** Rozhodnutí 1 přeformulováno: novinky nabízejí jen samy sebe, dokud sledování nefunguje. Webhook nedoručitelnosti a stížností je výslovně v N1 | 1, 6, 10 |
| **S7** | Bez hranice se z novinek stane druhé sledování | **přijato.** Hranice zapsaná jako rozhodnutí 8: jen nová nabídka oborů, výsledky 1. kola a pásma přijetí, a jen v sezóně otevřeného ročníku. Doplněno, co s přepnutím mimo sezónu (pásma v květnu, 2. kolo v září): zmíní se v nejbližším e-mailu, obvykle v uvítání dalšího ročníku | 1 (bod 8), 3, 8 |

**Stanoviska k otevřeným otázkám** jsem převzal všechna. U úložiště jsem je po ověření k S4 zjednodušil na databázi bez podmínky. Ostatní čekají na potvrzení zadavatele (oddíl 11).

**Drobnosti** jsem přijal všechny:

- sloučení větve s harmonogramem a ověření firewallu jsou v N0;
- cíl „potvrzení odběru“ v Matomu je podmínkou dokončení N1;
- e-mail musí být schválený nejpozději den před odesláním, u e-mailu o výsledcích týden předem.

## Historie

| Verze | Změna |
|---|---|
| 1.1 | Vypořádána oponentura v1.0: přijato všech sedm bodů. Novinky zatím bez sledování a bez konzervatoří, formulář jen pro ročník se zveřejněným kalendářem a jedna zpráva o dalším kalendáři s novým potvrzením. Souhlas „pro sebe nebo své dítě, alespoň 15 let“. Úložiště změněno z kontaktů Resendu na databázi Neon s dávkami transakčních e-mailů, protože firewall Vercelu limit na adresu neudrží. Ověřeno, že měření v Resendu je nastavené pro doménu a ve výchozím stavu vypnuté. Schválení e-mailu sloučením pull requestu, denní odesílač, webhook v N1, hranice plošných zpráv o datech. Termíny N0–N2 posunuty na 15. 11. až 15. 12. 2026, první povinný e-mail 12. 1. 2027. |
| 1.0 | Návrh: plošné novinky vedle sledování, obsah vázaný na kalendář MŠMT, umístění formuláře, věk a souhlas, kontakty a rozesílky v Resendu s potvrzením bez ukládání, vznik e-mailů v repozitáři se schválením, zvážené nepoužité sloupce, pořadí s termínem před konzervatořemi. |
