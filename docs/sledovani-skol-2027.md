# Sledování škol a oborů e-mailem

Verze 2.1 · 15. 9. 2026 · Návrh k rozhodnutí, nic není implementované.

Rodina zadá e-mail a dostane upozornění, když na webu přibudou nové údaje o škole nebo oboru, který sleduje. Navazuje na [stránku školy](stranka-skoly-2027.md), [stránku oboru](vrstvy-stranky-oboru-2027.md), [registr stavu datových sad](../public/stav_datovych_sad.json), [datovou linku](datova-linka.md) a [portál pro školy](portal-pro-skoly-2027.md).

Verze 1.0 sledování oboru zamítla. Verze 2.0 ho přidává, protože rodina se rozhoduje mezi obory, ne mezi školami, a nejdůležitější zpráva („obor v nabídce pro příští rok není“) se týká oboru.

## 1. Hlavní rozhodnutí

1. **Upozorňujeme na události, ne na úpravy stránek.** Událost vzniká jen při publikaci: přepnutí datové sady, převzetí příspěvku z portálu, převzetí nových inspekcí. Oprava textu, přepočet ani nová verze slovníku e-mail neposílá.
2. **Sledovat jde školu, nebo obor.** Sledování školy zahrnuje události školy a jednou větou i události všech jejích oborů. Sledování oboru zahrnuje události oboru a ty události školy, které mění rozhodování o oboru: kritéria, dny otevřených dveří, inspekci.
3. **Jeden souhrnný e-mail denně**, seskupený podle události, ne podle školy. Hromadné přepnutí sady se tak projeví jako jedna věta se seznamem sledovaných oborů.
4. **E-mail nepředbíhá web.** Odesílač čte záznam událostí z nasazeného webu, takže upozorní jen na to, co už je na stránce vidět.
5. **V repozitáři nejsou osobní údaje.** Události jsou soubory v gitu a procházejí schválením jako data. Odběratelé leží v databázi mimo repozitář.
6. **Tlačítko se na web přidá až s fungujícím odesílačem**, aby rodina nesledovala něco, co nic neposílá.

## 2. Co máme a co chybí

Průzkum kódu a dat 14. 9. 2026.

| Potřeba | Stav v projektu | Kde |
|---|---|---|
| Vědět, kdy se data na webu mění | **máme**: každé přepnutí zapisuje `historie_prepnuti` | `scripts/stav-datovych-sad.py`, funkce `prepni` a `vrat` |
| Vědět, kterých oborů se přepnutí týká | **chybí**: přepnutí nezapisuje dotčené nabídky | nový skript událostí |
| Nabídky po ročnících a jejich párování | **máme**: klíč `REDIZO_KKOV_zaměření`, pole `parovani` | `public/souhrny_kolo1.json`, `public/offer_mapping_2026.json` |
| Nové inspekce po školách | **máme**, ale s šumem, viz oddíl 3.3 | `data/csi_diff_latest.json` |
| Změny údajů od školy | **máme** okamžik převzetí; rozdíl polí chybí | `scripts/portal-moderace.js apply` → `public/portal_skol.json` |
| Odesílání e-mailů | **máme** Resend, tarif Pro, volaný přes `fetch`, odesílatel `noreply@prijimackynaskolu.cz`; dávky, webhooky ani příjem e-mailů zatím nepoužíváme | `src/lib/portal-email.ts` |
| Podepsaný odkaz bez hesla | **máme** HMAC-SHA256, bezstavový token | `src/lib/portal-magic.ts` |
| Serverové úložiště | **chybí**: žádná databáze, KV ani Blob; portál ukládá do GitHub issues | `package.json` |
| Plánovač | **nespolehlivý**: GitHub cron se zpožďuje o hodiny, Vercel crons nejsou nastavené | `vercel.json`, `.github/workflows/` |
| Zvažované obory | **máme** v prohlížeči, klíč `prijimacky-vyber-2027`, pole ID nabídek | `src/lib/simulator-state.ts` |
| Tlačítka v hlavičce | **máme** místa: škola `ProfilSkoly.tsx`, obor `src/app/skola/[slug]/page.tsx` vedle `UlozitObor` | |
| Zásady ochrany osobních údajů | **chybí** úplně | |

Nejtěžší část, tedy vědět, co se kdy změnilo, projekt z velké části má. Nové jsou čtyři kusy: záznam událostí, úložiště odběrů, odesílač a tlačítka.

## 3. Události

### 3.1 Katalog událostí

| Událost | Úroveň | Vzniká při | Věta v e-mailu | Kdy přibližně (registr, `ocekavano`) |
|---|---|---|---|---|
| `nabidka_zverejnena` | obor | `prepni cermat-kapacity` na nové období | Zveřejnili jsme místa a přihlášky 1. kola {rok} | březen, odhad |
| `obor_neni_v_nabidce` | obor | totéž, nabídka nemá v novém období pár | V nabídce 1. kola {rok} podle CERMATu tento obor není | březen |
| `obor_upraven` | obor | totéž, pár `jedna_ku_jedne` se změněným klíčem | Obor pokračuje, škola upravila název zaměření | březen |
| `vysledky_1_kola` | obor | `prepni cermat-vysledky` | Zveřejnili jsme, jak dopadlo 1. kolo {rok} | srpen, odhad |
| `pasma_prijeti` | obor | `prepni cermat-uchazeci-kolo1` na nové období | Doplnili jsme, s kolika body se uchazeči dostali v roce {rok} | květen, odhad |
| `druhe_kolo` | obor | `prepni cermat-kolo2-agregaty`, nabídka má 2. kolo | Škola vypsala na obor 2. kolo {rok} | září, odhad |
| `maturita` | škola | `prepni cermat-maturita`, škola má řádek | Zveřejnili jsme výsledky maturity {rok} | po zveřejnění CERMATem, neznámo |
| `inspekce` | škola | `prepni csi-inspekce`, škola má přidanou inspekci | Česká školní inspekce navštívila školu, zpráva z {datum} | průběžně |
| `udaje_od_skoly` | škola | `portal-moderace.js apply` se změnou pole | Škola doplnila údaje pro rodiny: {pole} | typicky listopad až leden |

Úroveň určuje, komu událost patří: oborové události jdou sledujícím oboru i školy, školní sledujícím školy i všech jejích oborů.

**Revize téhož období se neoznamují.** `prepni` s týmž obdobím zapíše událost s `oznamovat: false`. CERMAT soubory přepisuje často: revize kapacit a přihlášek 2026 změnila 281 kapacit a 1 022 počtů přihlášek. Upozornění na každou revizi by přehlušilo nová data.

**Pozor na očekávání rodin.** Podle registru čekáme místa a přihlášky 2027 v březnu, tedy po termínu podání přihlášek. Upozornění `nabidka_zverejnena` rodině nepomůže přihlášku podat. Před termínem přihlášek jsou užitečné jen `udaje_od_skoly` (kritéria, dny otevřených dveří) a do budoucna dobíhající obor z rejstříku (oddíl 9). Text tlačítka proto nesmí slibovat, že dáme vědět o nabídce oborů včas. Kdy CERMAT soubor s kapacitami skutečně zveřejní, ověří v lednu `stav-datovych-sad.py zjisti`.

### 3.2 Záznam události

Soubor `public/sledovani/udalosti/{datum}-{sada}-{obdobi}.json` vzniká ve stejném commitu jako přepnutí, takže se nasadí spolu s daty:

```json
{
  "id": "2027-03-10-cermat-kapacity-2027",
  "typ": "nabidka_zverejnena",
  "sada": "cermat-kapacity",
  "obdobi": "2027",
  "publikovano": "2027-03-10",
  "oznamovat": true,
  "nabidky": ["600001431_79-41-K/41", "600001431_79-41-K/81"],
  "bez_nabidky": ["600007774_79-41-K/81"],
  "mapovani_klicu": {"600004597_79-41-K/81": "600004597_79-41-K/81_všeobecné"},
  "nejednoznacne": ["600004619_36-47-M/01"]
}
```

Záznam obsahuje jen identifikátory škol a nabídek, žádné osobní údaje. Index `public/sledovani/udalosti.json` vede seznam souborů, aby odesílač nemusel procházet adresář.

`vrat` zapíše k události `stornovano`. Neodeslanou událost odesílač přeskočí. Když už odešla, oprava se neposílá; stránka ukáže vrácené období a e-mail zval jen na stránku, nikoli na konkrétní čísla.

### 3.3 Jak skript pozná dotčené školy a obory

Nový `scripts/sledovani-udalosti.py`, volaný z `prepni` a `vrat` a z `portal-moderace.js apply`:

| Sada | Pravidlo |
|---|---|
| CERMAT po nabídkách | nabídka má v novém období záznam v `souhrny_kolo1.json` nebo `druhe_kolo.json`; párování z pole `parovani` a z `offer_mapping` |
| `cermat-maturita` | škola má v `maturita_skoly.json` nový rok |
| `csi-inspekce` | `added_inspections > 0` a datum nové inspekce je pozdější než předchozí `lastInspectionDate`. **Ne `changed_schools`**: v rozdílu ze 7. 9. 2026 bylo mezi středními školami katalogu 269 změněných, novou inspekci ale mělo jen 168; zbytek tvořily změny metadat a odebrané záznamy. Filtr na školy v katalogu, rozdíl obsahuje i mateřské školy |
| portál | rozdíl polí `udaje` před zápisem a po něm; pole jen potvrzené beze změny událost nevytvoří |

## 4. Identita oboru mezi ročníky

Holý klíč nabídky pro sledování oboru nestačí. Mezi roky 2025 a 2026 zůstal stejný jen u 2 315 z 3 292 nabídek v `souhrny_kolo1.json`, u 543 se změnil a nabídka se spárovala jedna ku jedné, 434 nemá pár. `offer_mapping_2026.json` navíc vede 18 nabídek s víc kandidáty v katalogu a 56 s nejednoznačným textem zaměření.

Odběr oboru proto ukládá klíč nabídky **a období, ke kterému klíč patří**. Při události nového období odesílač podle `mapovani_klicu` odběr převede:

| Párování | Co se stane s odběrem | Co dostane rodina |
|---|---|---|
| `shoda_klice` | nic | běžnou událost |
| `jedna_ku_jedne` | klíč se přepíše na nový | `obor_upraven` s odkazem na novou stránku oboru |
| bez páru | odběr oboru se změní na odběr školy | `obor_neni_v_nabidce` a věta „Dál vám budeme posílat novinky celé školy.“ |
| nejednoznačné | odběr zůstane beze změny | „Nedokázali jsme obor v nabídce {rok} jednoznačně najít, podívejte se na obory školy.“ |

Věta „obor v nabídce není“ vychází jen z dat CERMATu o 1. kole a populace souhrnů (denní nezkrácené studium s povinnou jednotnou zkouškou) je užší než všechny obory školy. Obor bez jednotné zkoušky proto sledovat nejde; na jeho stránce se nabídne sledování školy.

Adresa stránky se skládá z názvu a přejmenováním se mění. E-mail odkazuje na adresu sestavenou z aktuálních dat v okamžiku odeslání.

## 5. Souhrnný e-mail

```text
Předmět: Novinky u 3 oborů, které sledujete

Zveřejnili jsme místa a přihlášky 1. kola 2027:
  · Gymnázium J. S. Machara, Brandýs nad Labem · osmileté gymnázium
  · Gymnázium J. A. Komenského, Čelákovice · čtyřleté gymnázium

V nabídce 1. kola 2027 podle CERMATu tento obor není:
  · SPŠ Mladá Boleslav · Informační technologie, zaměření sítě
    Dál vám budeme posílat novinky celé školy.

Škola doplnila údaje pro rodiny:
  · Gymnázium J. S. Machara: kritéria přijetí, dny otevřených dveří

Sledujete 2 školy a 3 obory · Upravit sledování · Přestat sledovat vše
```

Pravidla:

- **Jedna věta na typ události**, pod ní seznam s odkazem přímo na změněnou část stránky (kotva oddílu).
- **Pořadí:** nejdřív to, co mění rozhodování (obor není v nabídce, údaje od školy, 2. kolo, místa a přihlášky, výsledky 1. kola), potom maturita a inspekce.
- **Bez čísel.** Číslo bez kontextu stránky se čte špatně a e-mail zve na stránku. Proto e-mail nezavádí žádný nový ukazatel.
- **Texty podle [slovníku pojmů](slovnik-pojmu.md)**, rok vždy výslovně z události, nikdy „letos“.
- Hlavičky `List-Unsubscribe` a `List-Unsubscribe-Post` pro odhlášení jedním kliknutím přímo v poštovním klientu.

**Kolik e-mailů to je.** Z katalogu v oddílu 3.1 plyne u jednoho oboru nejvýš pět událostí ročně a u školy jedna až tři. CERMAT sady přepínáme pro všechny školy najednou, takže rodina se třemi obory na dvou školách dostane zhruba šest až osm e-mailů ročně. Týdenní souhrn by proto nic neušetřil a jen by zdržel zprávy od škol.

## 6. Kam dát tlačítko

| Místo | Rozhodnutí | Proč |
|---|---|---|
| **Hlavička stránky oboru**, vedle „Uložit mezi zvažované“ (`src/app/skola/[slug]/page.tsx`) | **použít**: „Sledovat obor“ | rodina přichází hlavně na obor; v panelu volba „jen tento obor / celou školu“ |
| **Hlavička stránky školy**, vedle „Web školy“ a „Porovnat v simulátoru“ (`ProfilSkoly.tsx`) | **použít**: „Sledovat školu“ | škola jako celek, včetně maturity a inspekce |
| **Zvažované obory v simulátoru** | **použít**: „Sledovat zvažované obory“ | zvažované obory jsou ID nabídek v prohlížeči; pět oborů jedním potvrzením |
| Karta oboru v seznamu na stránce školy | **zavrhnout** | vedle „Uložit mezi zvažované“ by byly dvě podobné akce na každé kartě |
| Plovoucí tlačítko, vyskakovací okno | **zavrhnout** | vtíravé; na telefonu už plove „Nahlásit chybu“ |
| Obor bez jednotné zkoušky | **nabídnout sledování školy** | identitu takového oboru mezi ročníky neumíme, oddíl 4 |

Panel pod hlavičkou, ne modální okno:

```text
┌ Sledovat obor ────────────────────────────────────────────────────┐
│ ( ) Jen tento obor   ( ) Celou školu                               │
│ Pošleme e-mail, když zveřejníme místa, přihlášky a výsledky        │
│ přijímání, když škola doplní kritéria nebo dny otevřených dveří,   │
│ nebo když obor v nové nabídce chybí. Nejvýš jeden e-mail denně.    │
│ [ e-mail                       ]  [ Sledovat ]                     │
│ Adresu použijeme jen pro tato upozornění. Zásady ochrany osobních  │
│ údajů · Odhlásit se jde jedním kliknutím v každém e-mailu.         │
└────────────────────────────────────────────────────────────────────┘
```

Stavy tlačítka: „Sledovat obor“ → „Potvrďte v e-mailu“ → „Sledujete“. Poslední stav si pamatuje prohlížeč; správa sledování je přes odkaz z e-mailu.

## 7. Identita, úložiště a bezpečnost

### 7.1 Bez účtu, s potvrzením

- **Přihlášení k odběru se potvrzuje odkazem v e-mailu.** Potvrzovací token nese e-mail a seznam sledovaných položek, podepsaný jako magic link portálu (HMAC-SHA256, platnost 72 h, vlastní tajemství `SLEDOVANI_SECRET`). **Do potvrzení se nic neukládá**, takže adresu, kterou někdo zadal za cizího člověka, nikde nedržíme.
- **Správa odběru** přes odkaz v každém e-mailu. Token nese ID odběratele a číslo verze klíče; odhlášení nebo „odhlásit všechna zařízení“ verzi zvýší, a staré odkazy tak přestanou platit.
- **Ochrana proti zneužití formuláře k obtěžování cizích adres:** nejvýš 3 potvrzovací e-maily na adresu za 24 h a omezení na IP. Počitadlo drží databáze jako otisk e-mailu, ne adresu; dnešní omezení portálu v paměti instance by na Vercelu nestačilo. Odpověď API je vždy stejná, aby nešlo zjistit, kdo co sleduje.
- **Po odhlášení se odběratel smaže celý**, nezůstává ani v archivu.
- **Platnost 12 měsíců.** Po roce přijde e-mail „Chcete dál sledovat?“. Bez kliknutí do 30 dnů se odběr smaže. Rodina, která přijímačky ukončila, tak nezůstane v databázi napořád.

### 7.2 Úložiště: doporučena Postgres databáze Neon přes Vercel Marketplace

Vercel vlastní databázi nemá. Dřívější Vercel Postgres a Vercel KV převzali Neon a Upstash a dnes se zakládají jako integrace z Marketplace: v nastavení projektu na Vercelu (Storage) nebo příkazem `vercel install neon`. Účtuje se přes Vercel a proměnné prostředí s připojením se do projektu doplní samy. Vlastní úložiště Vercelu jsou jen Blob (soubory) a Edge Config (zřídka měněná konfigurace) a ani jedno se na odběry nehodí: nad Blobem nejde dělat dotazy ani bezpečně souběžně zapisovat a Edge Config má omezený počet zápisů.

| Varianta | Rozhodnutí | Proč |
|---|---|---|
| **Neon Postgres (Vercel Marketplace)** | **doporučeno** | Postgres je preferovaná databáze projektu; vztah „kdo sleduje nabídku X“ je dotaz nad tabulkou; bezplatný tarif stačí; ovladač `@neondatabase/serverless` bez ORM je malý, což po zkušenosti s funkcí o velikosti 564 MB počítá |
| Upstash Redis | zavrhnout | množiny po školách a oborech jdou udělat, ale převod klíčů mezi ročníky a počitadla by se psaly ručně |
| Kontakty u Resendu s vlastními poli | zavrhnout | kontakty patří k marketingovému tarifu, který máme jen bezplatný s limitem 1 000 kontaktů; dotaz „kdo sleduje tento obor“ by znamenal stáhnout všechny kontakty; převod klíčů nad seznamem ve vlastním poli nejde; viz 7.5 |
| GitHub issues nebo soubory | zavrhnout | repozitář je veřejný |

Tabulky:

```sql
create table odberatel (
  id uuid primary key,
  email text not null unique,
  verze_klice int not null default 1,
  potvrzeno timestamptz not null,
  prodlouzeno timestamptz not null,
  posledni_souhrn timestamptz
);

create table sledovani (
  odberatel_id uuid references odberatel on delete cascade,
  typ text not null check (typ in ('skola', 'obor')),
  redizo text not null,
  nabidka text,              -- u oboru klíč REDIZO_KKOV_zaměření
  obdobi_klice text,         -- období sady, ke kterému klíč patří
  od timestamptz not null
);
create unique index sledovani_jednou on sledovani (odberatel_id, typ, redizo, coalesce(nabidka, ''));

create table odeslano (
  odberatel_id uuid references odberatel on delete cascade,
  udalost text not null,
  odeslano timestamptz not null,
  email_id text,             -- ID zprávy z Resendu, pro dohledání při stížnosti
  primary key (odberatel_id, udalost)
);

create table limit_potvrzeni (
  otisk text primary key,    -- sha256 e-mailu nebo IP
  pocet int not null,
  od timestamptz not null
);
```

Tabulka `odeslano` dělá odesílač idempotentním: opakovaný běh téhož dne nic nepošle dvakrát.

### 7.3 Odesílač: Vercel Cron, ne GitHub Actions

`vercel.json` dostane jeden denní cron na `/api/sledovani/odeslat`, chráněný `CRON_SECRET`.

| Varianta | Rozhodnutí | Proč |
|---|---|---|
| **Vercel Cron** | **použít** | běží tam, kde je nasazený web, takže čte tentýž záznam událostí, jaký vidí rodina; denní frekvenci zvládne každý tarif |
| GitHub Actions | zavrhnout | repozitář je veřejný, logy běhů také, a odesílač pracuje s adresami; cron se navíc zpožďuje o hodiny |

Postup běhu: načíst index událostí → vybrat neodeslané a nestornované → převést klíče oborů podle `mapovani_klicu` → pro každého odběratele složit souhrn → odeslat po dávkách přes `POST /emails/batch` → zapsat `odeslano`.

**Nanečisto:** `?nanecisto=1` nic neodešle a pošle správci do Telegramu, stejně jako datová linka, počet odběratelů, počet e-mailů a jeden vzorový souhrn bez adresy. První ostré odeslání po každém přepnutí sady se spouští až po kontrole nanečisto.

### 7.4 Náklady

Ceníky ověřené 15. 9. 2026. Tým na Vercelu má tarif Pro, Resend také Pro (transakční e-maily, 20 USD měsíčně).

| Služba | Tarif | Cena navíc | Kdy přestane stačit |
|---|---|---|---|
| Vercel Cron a funkce | Pro, už placený | 0 | jeden denní běh a pár volání API se do tarifu vejdou |
| Resend | Pro, už placený | 0 | 50 000 e-mailů měsíčně bez denního limitu, společně s odkazy portálu a hlášením chyb; nad limit 0,90 USD za 1 000; API 10 požadavků za sekundu, dávka 100 e-mailů, tedy až 1 000 e-mailů za sekundu |
| Neon Postgres | Free | 0 | 0,5 GB a 100 CU-hodin měsíčně na projekt; databáze usíná po 5 minutách. Budí ji jen přihlášení, potvrzení, správa odběru, webhooky Resendu a denní odesílač, ne návštěvy stránek. Tisíce odběratelů zaberou jednotky MB. Při překročení tarif Launch za 0,106 USD za CU-hodinu, tedy nejvýš kolem 19 USD měsíčně i při nepřetržitém běhu nejmenší instance |

Při šesti až osmi souhrnech ročně, potvrzení a prodloužení vychází kolem deseti e-mailů na odběratele za rok. Nejsilnější měsíc pošle zhruba dva e-maily na odběratele, takže kvóta 50 000 unese kolem 25 000 odběratelů. Pro představu: web měl v únoru 2026 4 969 identifikovaných návštěvníků za měsíc ([analýza návštěvnosti](analyza-navstevnosti-2026.md)).

**Provoz sledování nestojí nic navíc.** Placený Neon přijde na řadu až u velmi vysokého provozu, placený Resend nad 50 000 e-mailů měsíčně. Odesílač před ostrým během čte hlavičku `x-resend-monthly-quota` a v nanečisto hlášení uvede, kolik kvóty zbude; když by souhrny kvótu vyčerpaly, neodešle nic a ohlásí to, aby nezůstaly bez kvóty odkazy portálu.

### 7.5 Co z Resendu Pro využijeme

Ověřeno v dokumentaci Resendu 15. 9. 2026.

| Funkce | Rozhodnutí | K čemu, nebo proč ne |
|---|---|---|
| **Dávkové odeslání** `POST /emails/batch` | **použít** | 100 personalizovaných souhrnů v jednom volání; hromadná událost pro tisíce odběratelů odejde během sekund |
| **Klíč idempotence** (`Idempotency-Key`, platí 24 h) | **použít** | klíč `souhrn/{den}/{číslo dávky}` spolu s tabulkou `odeslano`: když cron spadne uprostřed a běží znovu, Resend tutéž dávku nepošle podruhé |
| **Webhooky** `email.bounced`, `email.complained`, `suppression.added` | **použít** | trvale nedoručitelnou adresu a stížnost na spam odběratel smaže hned; chrání to pověst domény, ze které chodí i odkazy portálu. `email.failed` a `email.delivery_delayed` jdou do hlášení správci. Nový endpoint `/api/sledovani/resend-webhook` s ověřením podpisu |
| **Seznam potlačených adres** | **použít** | Resend na potlačenou adresu nepošle nic; náš webhook z něj jen udělá smazání odběru |
| **Druhá odesílací doména** (Pro má 10 domén) | **použít** | souhrny z `upozorneni@novinky.prijimackynaskolu.cz`, odkazy portálu dál z hlavní domény. Kdyby souhrny někdo hromadně označil za spam, přihlašovací e-maily škol to nezasáhne |
| **Příjem e-mailů** (inbound, webhook `email.received`) | **použít, fáze F2** | odpověď na souhrn nezmizí v `noreply`: webhook ji předá do Telegramu správci, a rodina tak může nahlásit chybu v datech přímo z e-mailu. Odpověď „odhlásit“ se zpracuje jako odhlášení. Vyžaduje MX záznam na subdoméně |
| **Hlavičky odhlášení** `List-Unsubscribe`, `List-Unsubscribe-Post` | **použít** | odhlášení jedním kliknutím v Gmailu a dalších klientech, míří na náš endpoint |
| **Sledování otevření a kliknutí** | **vypnout** | slibujeme e-mail bez sledovacích pixelů a měřených odkazů (oddíl 8) |
| **Šablony v Resendu** | zavrhnout | texty musí jít přes [slovník pojmů](slovnik-pojmu.md) a revizi v repozitáři; šablona upravená v administraci Resendu by ji obešla. Šablony zůstanou v kódu (`src/lib/sledovani-email.ts`) |
| **Plánované odeslání** `scheduled_at` | zavrhnout | Vercel Cron na tarifu Pro spouští běh v přesný čas, plánování navíc nic nepřidá |
| **Kontakty, vlastní pole kontaktů, segmenty, témata (topics)** | zavrhnout | patří k marketingovému tarifu (bezplatný do 1 000 kontaktů) a témata fungují jen pro hromadné rozesílky; každý náš souhrn je jiný podle sledovaných položek, viz 7.2 |
| **Hromadné rozesílky (broadcasts)** | zavrhnout | pošlou všem v segmentu tentýž obsah; segment po škole by znamenal přes tisíc segmentů a rodina se třemi obory by dostala tři e-maily místo jednoho |
| **Automatizace** | zavrhnout | spouštějí se událostí nad kontaktem, takže by vyžadovaly kontakty a marketingový tarif; souhrn by se jen složitěji skládal |

## 8. Ochrana osobních údajů

- **Před spuštěním musí vzniknout stránka zásad** (`/ochrana-osobnich-udaju`). Dnes web žádnou nemá. Obsah: účel (upozornění na změny údajů), právní titul (souhlas potvrzený odkazem), rozsah (e-mail a seznam sledovaných škol a oborů), zpracovatelé (Vercel, Neon, Resend), doba uložení (do odhlášení, nejvýš 12 měsíců bez prodloužení), odvolání souhlasu.
- Do e-mailů se neukládají sledovací pixely ani měřené odkazy.
- Mimo rozsah tohoto návrhu, ale zjištěno při průzkumu: web používá Matomo s cookies a nemá cookie lištu. Patří do téže stránky zásad.

## 9. Zvážené nepoužité sloupce

Prošel jsem [zdroje dat](zdroje-dat.md) celé, včetně oddílu 3. E-mail neukazuje čísla, takže otázka nezní, jaký údaj zobrazit, ale **jaká změna ve zdroji je pro rodinu zpráva**.

| Sloupec | Rozhodnutí | Proč |
|---|---|---|
| Rejstřík, `dobihajiciObor` | **použít, až bude na stránce oboru** | „Škola tenhle obor dobíhá“ je pro sledující oboru nejcennější zpráva a přichází před termínem přihlášek, na rozdíl od dat CERMATu. Dnes je jen v rešeršních skriptech; e-mail nesmí ohlásit, co stránka neukazuje. Zdroj je čtvrtletní (`msmt-rejstrik-snimky`), událost by vznikla při přepnutí snímku |
| Rejstřík, nový obor v `skolyAZarizeni[].obory[]` | **zvážit se sledováním školy** | „Škola má zapsaný nový obor“ zajímá sledující školy, ale stránka školy obory z rejstříku bez nabídky CERMATu neukazuje; stejná podmínka jako výše |
| AKKO, `platnostDo` | zavrhnout | obor se celostátně ruší zřídka a sada je ruční, bez detekce; dobíhající obor v rejstříku to pokryje u konkrétní školy |
| Rejstřík, `reditel` | zavrhnout | změna ředitele je osobní údaj se spornou vypovídací hodnotou (zdroje dat, oddíl 3) |
| Rejstřík CSV, `Email 1`, `emaily` | zavrhnout pro rodiny | kontakt školy slouží portálu; upozornění škole na změnu jejích vlastních údajů je otevřená otázka 4 |
| Extrakce inspekce, `school_change_summary` | zavrhnout jako samostatnou událost | extrakce vzniká ručně a později než seznam inspekcí; stačí jedna událost při nové inspekci |
| Data uchazečů 2. kola | zavrhnout | na webu je nepoužíváme, pásma 2. kola zdroje dat zamítají |
| Oficiální nejnižší a nejvyšší výsledek přijatých, sloupce 72–86 | netýká se | e-mail bez čísel; událost `vysledky_1_kola` pokryje celý soubor |
| Maturita, cizí jazyky a stav po podzimu | zavrhnout | stránka školy je zamítla; e-mail nesmí zvát na něco, co stránka neukáže |
| InspIS profily | zavrhnout | zdroj zmizel, nová data nepřijdou |
| Doprava GTFS | zavrhnout | jízdní řády se mění pro všechny najednou, ne pro školu; registr u sady nastavuje `revize_oznamovat: false` |
| Položková data JPZ, školní agregáty 2017–2023 | zavrhnout | nepoužité na webu, respektive uzavřená řada |

Slovník ukazatelů se nemění, e-mail žádný ukazatel nezobrazuje. Do [slovníku pojmů](slovnik-pojmu.md) se ve stejné dávce jako tlačítka zapíšou pojmy **sledovat obor**, **sledovat školu** a **upozornění**.

## 10. Pořadí realizace

| Fáze | Obsah | Hotovo, když |
|---|---|---|
| **F0 Záznam událostí** | `sledovani-udalosti.py`, napojení na `prepni`, `vrat` a `portal-moderace.js`; testy nad skutečnými soubory 2025 → 2026 | přepnutí zapíše událost se správnými nabídkami; test ověří 2 315 / 543 / 434 párování a 168 škol s novou inspekcí |
| **F1 Odběry** | Neon, API `prihlasit`, `potvrdit`, `sprava`, `odhlasit`; odesílací subdoména v Resendu; webhook nedoručitelnosti a stížností; šablony e-mailů; zásady ochrany osobních údajů | celý cyklus přihlášení a odhlášení funguje na náhledovém nasazení; nedoručitelná adresa odběr smaže |
| **F2 Odesílač** | cron, dávky s klíčem idempotence, souhrn, převod klíčů, kontrola kvóty, nanečisto do Telegramu; příjem odpovědí | nanečisto nad skutečnou událostí dá správný souhrn; odpověď na souhrn dorazí do Telegramu |
| **F3 Tlačítka** | stránka oboru, školy, simulátor; pojmy do slovníku | rodina přihlášená na náhledu dostane první souhrn |

F0 je užitečná i bez e-mailů: ze záznamu událostí jde sestavit stránku „Co je nového v datech“. Tlačítka se přidávají až v F3.

## 11. Otevřené otázky

1. **Úložiště:** Neon Postgres (doporučeno), nebo jiná databáze?
2. **Revize:** neoznamovat vůbec (navrženo), nebo jen když se u oboru změní obtížnost přijetí slovy?
3. **Platnost odběru:** 12 měsíců s prodloužením (navrženo), nebo do konce přijímacího řízení?
4. **Upozornění pro školu:** má škola dostat e-mail, když se změní její údaje z oficiálních zdrojů? Pro redakci by to bylo levné ověřování dat a navázalo by to na portál.
5. **Dobíhající obor:** zařadit převod `dobihajiciObor` na stránku oboru před F3, aby sledování oboru mělo zprávu i před termínem přihlášek?

## Historie

| Verze | Změna |
|---|---|
| 2.1 | Vercel nemá vlastní databázi, Neon se zakládá z Vercel Marketplace. Náklady podle ceníků z 15. 9. 2026: s Resend Pro a Vercel Pro provoz nic navíc nestojí. Co z Resendu Pro použít (dávky, idempotence, webhooky nedoručitelnosti, druhá doména, příjem odpovědí) a co zavrhnout (kontakty, témata, rozesílky, automatizace, šablony, sledování otevření). |
| 2.0 | Sledování oboru vedle školy: katalog událostí po úrovních, identita oboru mezi ročníky podle párování (2 315 shod klíče, 543 párů jedna ku jedné, 434 bez páru), převod odběru bez páru na školu. Průzkum stavu kódu. Revize se neoznamují. Inspekce podle přidaných inspekcí místo změněných škol (168 z 269). Úložiště Neon Postgres, odesílač Vercel Cron, nic uloženého do potvrzení, platnost 12 měsíců. Upozornění, že data CERMATu o nabídce přicházejí po termínu přihlášek. Zvážené nepoužité sloupce. |
| 1.0 | Návrh: upozornění na události místo úprav, denní souhrn seskupený podle události, zdroje událostí, umístění tlačítka, identita bez účtu, pořadí realizace. |
