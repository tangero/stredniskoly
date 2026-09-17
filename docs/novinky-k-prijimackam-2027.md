# Novinky k přijímačkám e-mailem

Verze 1.0 · 17. 9. 2026 · Návrh k rozhodnutí, nic není implementované.

Návštěvník webu zadá e-mail a během přijímacího řízení dostává připomínky termínů a pokyny, co je potřeba připravit, vždy s předstihem. Na rozdíl od [sledování škol a oborů](sledovani-skol-2027.md) (větev `docs/sledovani-skol-a-oboru`, v2.1) dostanou všichni odběratelé téhož ročníku stejný obsah. Návrh navazuje na [kalendář přijímaček](aktualizace-kalendar-data-2027.md) (`src/data/admissions-2027.json`, sada `msmt-harmonogram` v registru na větvi `feat/titulka-nabidka-oboru`) a na [analýzu návštěvnosti](analyza-navstevnosti-2026.md).

## 1. Hlavní rozhodnutí

1. **Dva produkty, jedna adresa.** Novinky k přijímačkám jsou plošné: termíny, pokyny a zprávy o nových datech na webu. Sledování školy je osobní souhrn změn u vybraných škol. Formulář je společný a nabízí obojí, odběr i odhlášení jsou ale u každého produktu zvlášť.
2. **Novinky se spustí dřív než sledování.** Nepotřebují záznam událostí ani převod klíčů oborů. Stačí jim kalendář MŠMT, který web už má.
3. **Odběratel si vybere ročník přijímaček a druh studia.** Rodina osmáka, která se hlásí za rok, dostane e-maily až ve své sezóně. Rodina, která se hlásí na víceleté gymnázium, nedostane pokyny ke konzervatořím.
4. **Termíny v e-mailu se berou z kalendáře, ne z textu.** Šablona obsahuje odkaz na událost (`ss-prihlasky`), generátor do ní doplní datum a rok ze souboru kalendáře. Letopočet se do šablon nepíše.
5. **Každý e-mail vzniká v repozitáři a před odesláním ho schválí člověk.** Texty procházejí [slovníkem pojmů](slovnik-pojmu.md) stejně jako stránky webu.
6. **Formulář je výrazný, ale nevyskakuje.** Stálé místo na titulní stránce, v patičce a u kalendáře. Vyskakovací okno ani lišta přes obsah se nepoužijí.
7. **Nic se neukládá do potvrzení** (double opt-in). Po odhlášení se kontakt smaže. Po skončení ročníku přijímaček se kontakt smaže, pokud odběratel odběr neprodlouží.

## 2. Co máme a co chybí

| Potřeba | Stav | Kde |
|---|---|---|
| Odesílání e-mailů | **máme** Resend Pro (transakční), volání přes `fetch`, odesílatel `noreply@prijimackynaskolu.cz` | `src/lib/portal-email.ts`, `src/app/api/bug-report/route.ts` |
| Podepsaný odkaz bez hesla | **máme** HMAC token | `src/lib/portal-magic.ts` |
| Omezení počtu požadavků | **jen v paměti instance**, na Vercelu nestačí (sledování v2.1, §7.1) | `src/app/api/portal-magic/route.ts` |
| Termíny ročníku | **máme** 20 událostí ve třech skupinách, ICS export | `src/data/admissions-2027.json`, `/prijimacky-2027` |
| Věta „kdy školy vyhlásí nabídku“ na titulní stránce | **máme** na nesloučené větvi | `feat/titulka-nabidka-oboru`, `src/app/page.tsx` |
| Úložiště odběratelů | **chybí** | viz oddíl 6 |
| Plánovač | GitHub cron se zpožďuje o hodiny, Vercel Cron není nastavený | `.github/workflows/`, `vercel.json` |
| Zásady ochrany osobních údajů | **chybí** úplně, web navíc používá Matomo s cookies bez lišty | společné se sledováním, v2.1 §8 |
| Marketingový tarif Resendu (kontakty, rozesílky, témata) | **bezplatný**, do 1 000 kontaktů | ceník ověřen 17. 9. 2026 |

## 3. Co budeme posílat

Kalendář 2027 dává pevné body, ke kterým se e-mail váže. V tabulce je u každého e-mailu událost z `admissions-2027.json` a předstih. Termíny v závorce jsou jen pro čtenáře tohoto návrhu, šablony je nenesou.

| E-mail | Vazba na událost | Kdy odeslat | Komu | Obsah |
|---|---|---|---|---|
| **Uvítání** | — | hned po potvrzení | všem | přehled termínů ročníku, odkaz na kalendář a ICS, co dělat teď podle měsíce |
| Konzervatoře: kritéria a přihlášky | `kon-kriteria` (15.–31. 10. 2026), `kon-prihlasky` | 7 dní před `kon-kriteria` | konzervatoř | kde hledat kritéria, přihláška do 30. 11. |
| Výběr školy a dny otevřených dveří | — (sezóna říjen až leden) | začátek listopadu | SŠ, víceleté | jak vybírat, co se ptát, odkaz na simulátor a stránky škol |
| Školy vyhlašují kritéria | `ss-kriteria` (15.–31. 1. 2027) | 3 dny před začátkem | SŠ, víceleté | co v kritériích hledat: požadavek školy, hranice úspěšnosti, školní zkouška; nabídka oborů pro nový rok |
| **Přihlášky** | `ss-prihlasky` (1.–22. 2. 2027) | 5 dní před začátkem, **připomínka 4 dny před koncem** | SŠ, víceleté | jak podat přihlášku, pořadí na přihlášce („šanci na přijetí nemění, škola řadí jen podle svých kritérií“), přílohy |
| Školní a talentové zkoušky | `ss-skolni` | 7 dní před | SŠ, víceleté | pozvánka od školy, náhradní termíny |
| **Jednotná zkouška** | `jpz-4-1`, `jpz-vice-1` | 10 dní před | podle druhu studia | který den, co s sebou, náhradní termín při nemoci |
| **Výsledky a 2. kolo** | `ss-vysledky`, `k2-kriteria`, `k2-prihlasky` | ráno v den výsledků | SŠ, víceleté | jak zjistit výsledek, co když se uchazeč nedostal nikam: 2. kolo trvá jen pár dní a začíná týž den |
| Výsledky 2. kola a konec ročníku | `k2-vysledky` | v den výsledků | všem | co dál; nabídka prodloužit odběr pro mladšího sourozence |
| Nová data na webu | přepnutí sady v registru | po nasazení | podle sady | „Zveřejnili jsme nabídku oborů pro přijímací řízení 2027“; stejná událost jako u sledování (v2.1, §3) |

Za ročník to je 9 až 11 e-mailů, v únoru a květnu dva až tři. Nejdůležitější jsou tučné řádky: přihlášky, jednotná zkouška a květnový e-mail o výsledcích. Mezi výsledky 1. kola a koncem přihlášek do 2. kola je jen deset dní.

Pravidla textu:

- Rok vždy výslovně, bez slov „letos“ a „loni“ ([slovník pojmů](slovnik-pojmu.md), §5).
- Žádná čísla ze slovníku ukazatelů bez kontextu stránky. E-mail zve na stránku, sám nic nesrovnává.
- Každý termín s odkazem na zdroj MŠMT a s větou „přesný čas a místo ověř v kritériích školy“, stejně jako kalendář.
- Oslovení rodiče i uchazeče zároveň („Ty“ jako na titulní stránce). Tón zvolí redakce, viz otevřená otázka 3.

## 4. Kam dát formulář

Nejvíc návštěv mívá web v únoru a květnu (4 969 a 4 435 identifikovaných návštěvníků za měsíc v roce 2026). Formulář proto musí být na místě do **15. 10. 2026**, kdy začínají konzervatoře, a nejpozději v prosinci kvůli přihláškám na SŠ.

| Místo | Rozhodnutí | Proč |
|---|---|---|
| **Titulní stránka, tmavá karta „Přijímačky 2027“** (`src/app/page.tsx`), pod větou o termínech přihlášek | **použít, hlavní místo** | karta už mluví o termínech; formulář v ní je přirozené pokračování „Termíny už známe“. Viditelný bez posouvání i na telefonu |
| **Titulní stránka, modrý pás „Vyzkoušej zdarma“** na konci | **použít**, druhý formulář | kdo dočte titulní stránku, dostane druhou příležitost; pás už je výzvou k akci |
| **Patička na všech stránkách** (`src/components/Footer.tsx`), nový první sloupec „Termíny e-mailem“ | **použít** | každá stránka webu, včetně stránek škol, kam přichází většina lidí z vyhledávání. Tady je formulář nejmenší: jedno pole a tlačítko |
| **Kalendář `/prijimacky-2027`**, vedle „Ulož si termíny“ | **použít, výrazně** | stránka dnes píše, že „stažená kopie se sama neaktualizuje“. Odběr je přesně odpověď na to: „MŠMT termíny upřesňuje, změny ti pošleme“ |
| **Stránka školy a oboru**, panel „Sledovat“ ze sledování v2.1 | **použít, až bude sledování**; do té doby malý odkaz pod hlavičkou | jeden formulář se dvěma zaškrtávacími poli: „sledovat tuto školu“, „posílat termíny přijímaček“ |
| **Simulátor a zvažované obory** | **použít** jako věta pod seznamem: „Připomeneme ti termín přihlášek“ | rodina se zvažovanými obory je ve fázi, kdy se jí termín přihlášek hodí nejvíc |
| **Konec průvodců** `/jak-vybrat-skolu`, `/jak-funguje-prijimani`, `/vysledky/…`, `/mesto/…` | **použít** jako karta na konci článku | kdo dočte průvodce, zajímá se o celý postup |
| **Hlavička webu**, odkaz se zvonkem „Termíny e-mailem“ | **použít** | vede na samostatnou stránku `/novinky` (viz níže) |
| **Samostatná stránka `/novinky`** | **použít** | adresa pro sdílení a pro výchovné poradce: ukázka e-mailů, přehled toho, co a kdy přijde, formulář. Na tuto adresu se odkazuje z patičky e-mailu i z hlavičky |
| Vyskakovací okno při vstupu nebo odchodu | **zavrhnout** | vtíravé; sledování v2.1 ho zamítá ze stejného důvodu. Na telefonu zakryje obsah, pro který člověk přišel |
| Lepicí lišta dole na telefonu | **zavrhnout pro první verzi** | dole už plave „Nahlásit chybu“. Zvážit v únoru, pokud měření ukáže slabé přihlašování |
| Předzaškrtnutý odběr v jiném formuláři (hlášení chyby, portál) | **zavrhnout** | souhlas musí být aktivní; hlášení chyby má jiný účel |

„Lavičku“ ze zadání chápu jako patičku. Pokud byla myšlena horní lišta, pokrývá ji odkaz v hlavičce.

Podoba formuláře:

```text
┌ Termíny přijímaček e-mailem ───────────────────────────────────────┐
│ Pošleme ti termíny s předstihem a co je potřeba připravit:        │
│ kritéria, přihlášky, jednotná zkouška, výsledky a 2. kolo.         │
│ Přijímačky dělám v roce: [ 2027 ▾ ]                                │
│ Hlásím se na: (•) střední školu po 9. třídě                        │
│               ( ) víceleté gymnázium   ( ) konzervatoř             │
│ [ e-mail                         ]  [ Posílat termíny ]            │
│ Nejvýš pár e-mailů měsíčně. Odhlásit se jde jedním kliknutím.      │
│ Zásady ochrany osobních údajů                                      │
└────────────────────────────────────────────────────────────────────┘
```

V patičce zůstane jen pole e-mailu a tlačítko. Ročník a druh studia se doplní na potvrzovací stránce po kliknutí na odkaz. Nabídka ročníků se sestaví z registru (období sady `msmt-harmonogram` a jedno další), ne napevno.

Stavy: „Posílat termíny“ → „Potvrď v e-mailu“ → „Odebíráš termíny“ (pamatuje si prohlížeč, formuláře se pak na webu skryjí).

**Mimo web:** samostatná stránka `/novinky` s QR kódem se hodí pro výchovné poradce základních škol a pro rodičovské skupiny. Adresy ZŠ z rejstříku k oslovení **nepoužijeme**, viz oddíl 8.

## 5. Kdo se přihlašuje: věk a souhlas

Uchazeči jsou většinou mladší 15 let. Český zákon o zpracování osobních údajů (110/2019 Sb., § 7) stanoví hranici pro souhlas dítěte se službami informační společnosti na 15 let. Proto:

- Formulář a texty jsou psané **pro rodiče i pro uchazeče**, ale u souhlasu stojí: „Je mi alespoň 15 let, nebo jsem rodič.“
- Neptáme se na jméno, školu, kraj ani ročník dítěte ve škole. Ročník přijímaček a druh studia stačí.
- Před spuštěním je potřeba právní kontrola textu zásad a tohoto zaškrtávacího pole (otevřená otázka 5).

## 6. Úložiště a rozesílání

Obsah je pro všechny v segmentu stejný, takže se tu hodí to, co sledování v2.1 u Resendu zamítlo: **kontakty, segmenty, témata a rozesílky (broadcasts)**. Důvody zamítnutí platily pro osobní souhrny, u plošného obsahu neplatí.

| Varianta | Rozhodnutí | Proč |
|---|---|---|
| **A. Kontakty a rozesílky v Resendu** | **doporučeno pro start** | bez vlastní databáze; odhlašovací stránka, výběr témat, odhlašovací hlavičky, plánování a fronta odesílání jsou hotové. Kontakt nese vlastnosti `rok_prijimacek`, `druh_studia`, `zdroj`. Segment = rok + druh studia |
| B. Vlastní databáze Neon a dávkové transakční e-maily | **alternativa, přejít na ni se sledováním** | nic navíc nestojí (Resend Pro má 50 000 e-mailů měsíčně), ale odhlašování, fronta a správa se musí napsat. Dává smysl, až bude Neon kvůli sledování (v2.1, §7.2) a bude potřeba jedna správa odběrů |
| C. Samostatná služba na newslettery (Ecomail, Mailchimp) | zavrhnout | další zpracovatel osobních údajů, druhá odesílací doména, texty mimo repozitář |
| D. Seznam v repozitáři nebo v GitHub issues | zavrhnout | repozitář je veřejný |

**Náklady varianty A** podle ceníku Resendu ze 17. 9. 2026: marketingový tarif se platí podle počtu kontaktů, ne podle počtu e-mailů. Zdarma do 1 000 kontaktů, placený tarif od 40 USD měsíčně za 5 000 kontaktů. Mazání kontaktů po skončení ročníku drží počet nízko. Při 2–5 % přihlášených z přibližně 5 000 identifikovaných návštěvníků za silný měsíc přibude 100 až 250 kontaktů měsíčně, takže hranici 1 000 kontaktů první sezóna nejspíš překročí až na jaře. Odhad podílu přihlášených je předpoklad, ne měření.

### Průběh

1. `POST /api/novinky/prihlasit` přijme e-mail, ročník, druh studia, zdroj (místo formuláře) a skryté pole proti robotům. Odpověď je vždy stejná.
2. Server pošle **transakční** potvrzovací e-mail s tokenem HMAC (`NOVINKY_SECRET`, platnost 72 h, vzor `portal-magic.ts`). Token nese e-mail a volby. **Nic se neukládá.**
3. `GET /novinky/potvrdit?t=…` ověří token a teprve pak založí kontakt v Resendu přes API a přihlásí ho k tématu „Termíny přijímaček“. Pak odejde uvítací e-mail.
4. Rozesílky vznikají skriptem z repozitáře (oddíl 7) a odcházejí přes Broadcast API. Odhlašovací odkaz a hlavičky doplní Resend.
5. Po `k2-vysledky` dostane segment poslední e-mail s možností prodloužit odběr na další ročník. Kdo neklikne do 30 dnů, toho skript smaže.
6. Webhooky `contact.updated` / `email.bounced` / `email.complained` smažou kontakt (sdíleno se sledováním, v2.1 §7.5).

### Ochrana proti zneužití bez databáze

Formulář by šel použít k zahlcení cizí adresy potvrzovacími e-maily. Paměť instance to na Vercelu nezastaví. Postup:

- Před odesláním potvrzení dotaz na Resend, jestli kontakt už existuje. Pokud ano, neposílá se nic.
- Pravidlo omezení požadavků ve firewallu Vercelu na `/api/novinky/prihlasit`, případně Cloudflare Turnstile. Dostupnost omezení na našem tarifu je potřeba ověřit před F1.
- Skryté pole a kontrola adresy jako v `bug-report`.

**K ověření v dokumentaci Resendu před F1:** zástupný symbol odhlašovacího odkazu v rozesílce, podoba hostované stránky předvoleb s tématy, limity Contacts API a přidání vlastností kontaktu. Nativní double opt-in Resend podle dostupné dokumentace nemá, proto ho řešíme tokenem.

### Odesílací doména

Rozesílky půjdou z `novinky@novinky.prijimackynaskolu.cz`, stejně jako v2.1 navrhuje pro souhrny. Kdyby je někdo hromadně označil za spam, odkazy portálu škol z hlavní domény to nezasáhne.

## 7. Jak e-mail vzniká

```text
content/novinky/
  uvitani.md
  prihlasky.md            # frontmatter: udalost: ss-prihlasky, predstih_dni: 5, segment: [ss, vicelete]
  prihlasky-konec.md      # udalost: ss-prihlasky, vztah: konec, predstih_dni: 4
  vysledky-a-druhe-kolo.md
  ...
```

- `scripts/novinky.py plan` z kalendáře a šablon vypíše, co a kdy se má odeslat v aktuálním ročníku. Chybějící událost v kalendáři znamená chybu, ne tiché přeskočení.
- `scripts/novinky.py priprav <sablona>` doplní data a rok z `admissions-{rok}.json`, vyrobí HTML a v Resendu založí **koncept** rozesílky s naplánovaným časem.
- **Schválení člověkem:** oznámení do Telegramu, stejně jako u datové linky. Bez schválení koncept neodejde. Plánovač tak nemusí být přesný, protože koncept vzniká s týdenním předstihem a čas odeslání drží Resend.
- Kontrola textu: test hledá zakázaná slova ze slovníku pojmů a letopočty napsané přímo v šabloně.
- Zprávy o nových datech na webu vzniknou z téhož záznamu událostí, který navrhuje sledování (F0). Do té doby je píše redakce ručně.

## 8. Zvážené nepoužité sloupce

Prošel jsem [zdroje dat](zdroje-dat.md) celé, včetně oddílu 3. Novinky neukazují ukazatele. Otázka proto zní, který údaj ze zdrojů je pro všechny odběratele zprávou nebo pokynem.

| Sloupec nebo zdroj | Rozhodnutí | Proč |
|---|---|---|
| Harmonogram MŠMT (`msmt-harmonogram`, `admissions-2027.json`) | **použít, páteř obsahu** | jediný zdroj termínů; registr hlídá obnovu do 30. 9. 2027 |
| Registr, `historie_prepnuti` a `ocekavano` | **použít** | přepnutí sady je zpráva „na webu jsou nová data“; očekávaný termín dovolí napsat „nabídku oborů čekáme v březnu“, i s jistotou `odhad` |
| Agregáty 2. kola (`cermat-kolo2-agregaty`) | **zvážit pro květnový e-mail** | věta „v roce 2026 vypsaly školy 2. kolo u N nabídek“ by rodině ukázala, že 2. kolo není okrajové. Celostátní počet ale ve [slovníku ukazatelů](slovnik-ukazatelu.md) není; bez zápisu se nepoužije |
| Data uchazečů, uchazeči „nikam“ | **zvážit pro květnový e-mail** | „kolik uchazečů se v 1. kole nedostalo nikam“ uklidní rodinu v nejhorší chvíli. Celostátní počet ve slovníku ukazatelů není a zobrazené období sady je 2025, s přepnutím na 2026 se teprve počítá |
| Celostátní součty přihlášek a míst (sloupce `PŘIHLÁŠKY CELKEM`, `KAPACITA`) | zavrhnout | přihlášky na místo konkurenci nadsazují; bez vysvětlení ze stránky by únorový e-mail zbytečně strašil |
| Rejstřík, `dobihajiciObor` | zavrhnout pro novinky | týká se konkrétní školy, patří do sledování; navíc se netýká žádné z nabídek 2026 ([využití nepoužitých dat](navrh-vyuziti-nepouzitych-dat-2027.md)) |
| Rejstřík, `emaily`, CSV `Email 1` (i u základních škol) | **zavrhnout** | kontakt školy není souhlas k rozesílání; plošné oslovení výchovných poradců z rejstříku by bylo nevyžádané sdělení. Poradce oslovíme jinými cestami s odkazem na `/novinky` |
| INSPIS, `dny_otevrenych_dveri` | zavrhnout | volný text, u části škol z roku 2014 |
| Portál pro školy, dny otevřených dveří | zavrhnout pro první verzi | týká se jednotlivých škol a vyplnilo je málo škol; krajský přehled dnů otevřených dveří je možné rozšíření, až bude v odběru kraj |
| Maturita, inspekce, extrakce zpráv | zavrhnout | nesouvisí s termíny a pokyny; patří do sledování školy |
| AKKO `platnostDo`, rejstřík `reditel`, položková data JPZ, agregáty 2017–2023, doprava | zavrhnout | nejsou to zprávy pro všechny uchazeče |

Slovník ukazatelů se v první verzi nemění. Do [slovníku pojmů](slovnik-pojmu.md) se ve stejné dávce jako formulář zapíše název novinek (otevřená otázka 1), dvojice **odebírat termíny** × **sledovat školu** a **ročník přijímaček** (rok nástupu na SŠ, ne školní rok).

## 9. Měření

- Matomo: cíl „přihlášení k odběru“ a „potvrzení odběru“ s dimenzí místa formuláře. Kontakt nese vlastnost `zdroj` (titulka-karta, paticka, kalendar, …), takže se dá porovnat, odkud přicházejí lidé, kteří odběr opravdu potvrdí.
- V e-mailech se neměří otevření ani kliknutí (stejný slib jako sledování v2.1). Odkazy mohou nést `?zdroj=novinky`, aby Matomo odlišilo návštěvy z e-mailu (otevřená otázka 4).
- Po únoru 2027: podíl potvrzených z odeslaných formulářů, odhlášení po každém e-mailu, stížnosti na spam.

## 10. Pořadí realizace

| Fáze | Obsah | Hotovo, když | Termín |
|---|---|---|---|
| **N0 Předpoklady** | zásady ochrany osobních údajů (společné se sledováním), odesílací subdoména, marketingový tarif Resendu, téma a vlastnosti kontaktů, rozhodnutí o názvu | stránka zásad je na webu, subdoména ověřená | do 5. 10. 2026 |
| **N1 Odběr** | API přihlášení a potvrzení, ochrana proti zneužití, uvítací e-mail, formulář v patičce, na titulní stránce a v kalendáři, stránka `/novinky`, pojmy do slovníku | celý cyklus přihlášení a odhlášení funguje na náhledu | do 15. 10. 2026 |
| **N2 Obsah** | šablony podle oddílu 3, skript `plan` a `priprav`, schválení přes Telegram, test zakázaných slov a letopočtů | koncept rozesílky pro konzervatoře leží v Resendu a čeká na schválení | do 20. 10. 2026 |
| **N3 Rozšíření** | formulář na stránkách škol a v simulátoru, napojení na záznam událostí ze sledování, e-mail o nové nabídce oborů | první zpráva o přepnutí sady odešla | březen 2027 |
| **N4 Sjednocení** | jedna správa odběrů pro novinky i sledování; případně přechod na variantu B | odběratel obojí spravuje z jednoho odkazu | se sledováním F1 |

## 11. Otevřené otázky

1. **Název:** „Termíny přijímaček e-mailem“ (navrženo, popisné), „Přijímačky krok za krokem“, nebo jiný?
2. **Úložiště:** start v kontaktech Resendu (navrženo), nebo rovnou Neon společně se sledováním?
3. **Tón:** tykání jako titulní stránka, nebo vykání rodičům?
4. **Parametr `?zdroj=novinky` v odkazech:** povolit, nebo žádné označení odkazů?
5. **Právní kontrola:** věková hranice 15 let a text souhlasu.
6. **Zprávy o datech:** posílat plošně jen ty velké (nová nabídka oborů, výsledky 1. kola), nebo vše, co přepne registr?
7. **Kraj:** přidat do formuláře kvůli krajským přehledům dnů otevřených dveří, nebo zatím ne?

## Historie

| Verze | Změna |
|---|---|
| 1.0 | Návrh: plošné novinky vedle sledování, obsah vázaný na kalendář MŠMT, umístění formuláře, věk a souhlas, kontakty a rozesílky v Resendu s potvrzením bez ukládání, vznik e-mailů v repozitáři se schválením, zvážené nepoužité sloupce, pořadí s termínem před konzervatořemi. |
