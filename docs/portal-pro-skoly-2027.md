# Portál pro školy: autorizace a sběr dat

Verze 1.1 · 13. 9. 2026 · Schváleno k zpracování; ověřena proveditelnost datové schránky (oddíl 2.4).

Navazuje na [návrh rozvoje 2027, oddíl 6 a 7](navrh-rozvoje-2027.md), kde je pilot ověřování profilů školami schválen koncepčně, a uzavírá jeho první otevřenou otázku: jak poznáme, že editor smí editovat profil této školy. Podklady: [zdroje dat](zdroje-dat.md), [systém poznámek ke školám](school-notes-system.md), [datová linka](datova-linka.md).

## 1. Východisko

InspIS sada profilů škol zmizela a NKOD náhradu nemá (ověřeno 13. 9. 2026, viz historie repozitáře). Pole přijímacího řízení v ní byla navíc zastaralá už ve zdroji, protože školy je neudržovaly. Portál proto nestavíme jako kopii InspIS, ale jako **úzký kanál: škola potvrzuje a doplňuje jen to, co nikdo jiný neví**.

## 2. Autorizace: kdo smí editovat

### 2.1 Kotva identity je rejstřík MŠMT, ne náš seznam

Rejstřík nese u **1 110 z 1 120** škol našeho katalogu 2026 (99,1 %) e-mail, ID datové schránky subjektu, WWW a jméno ředitele (`data/Rejstrik_skol/Adresar.csv`, snímek 11. 2. 2026). Ze 1 781 adres je jen 53 na obecných freemailových doménách.

**Odůvodnění.** Identitu nemůžeme kotvit na naši vlastní databázi kontaktů — ta by sama potřebovala autorizaci. Rejstřík je jediný zdroj, jehož kontakty vznikly právním úkonem (zápis školy), takže „komu věří MŠMT, tomu věříme i my" je nejsilnější dostupná pozice bez vlastního ověřovacího procesu.

### 2.2 Vstup přes jednorázový odkaz, ne heslo

Škola zadá e-mail; pokud odpovídá adrese v rejstříku (nebo adresě, kterou si dříve ověřila), přijde jí **jednorázový časově omezený odkaz** otevírající editaci. Heslo neexistuje.

**Odůvodnění.** Varianta „pošleme jim přihlašovací údaje e-mailem" znamená heslo, a heslo se ztrácí, sdílí a vyžaduje resetovací tok. Jednorázový odkaz je technicky totéž, co zaslání hesla, ale bez hesla: důkazem je kontrola nad rejstříkovou adresou, nic víc. Heslo by navíc po personální změně zůstávalo u odchozího zaměstnance; rejstříková adresa zůstává škole.

### 2.3 Vrstvení důvěry místo binárního ano/ne

| Vrstva | Co získává | Jak se pozná |
|---|---|---|
| 0 · kdokoli | návrh opravy přes formulář, jde celý do moderace | nic; existující kanál poznámek |
| 1 · ověřený kontakt | editace profilu své školy, návrhy se zobrazí po moderaci se značkou „potvrzeno školou" | jednorázový odkaz na rejstříkovou nebo dříve ověřenou adresu, případně zpráva z datové schránky školy |
| 2 · spor a citlivé změny | potvrzení přes **datovou schránku** subjektu | odpověď z DS uvedené v rejstříku |

Vrstva 2 se použije, jen když vznikne spor (dvě osoby tvrdí totéž právo), nebo když změna vypadá jako přepis oficiálního údaje. Pro běžný provoz je zbytečně těžká.

**Odůvodnění.** Binární „ověřený/neověřený" by buď pouštěl vrstvu 0 bez stopy, nebo zbytečně brzdil dobrovolníky. Vrstva 0 existuje, protože ředitelka gymnázia není jediný člověk, který pozná překlep v termínu DOD — a moderace je pojistka, která vrstvu 0 zlevňuje.

### 2.4 Datová schránka jako komunikační kanál — ověřeno 13. 9. 2026

Původně byla DS rezervovaná pro vrstvu 2 kvůli špatnému UX. Ověření proveditelnosti ukázalo, že je použitelná i jako **hlavní formální kanál pro oslovení a příjem dat**, a to bez nákladů:

| Otázka | Nález | Doklad |
|---|---|---|
| Mají školy DS? | Ano: 1 110 z 1 120 škol katalogu (99,1 %), ID je v rejstříku | `data/Rejstrik_skol/Adresar.csv`, sloupec `ID dat. schránky subjektu` |
| Je komunikace zdarma? | **Ano u 98,7 % škol**: 1 105 z 1 110 má schránku typu OVM (školy jako příspěvkové organizace jsou OVM) a komunikace do OVM je ze zákona bezplatná; jen 5 škol je PO, tam 10 Kč za zprávu (§ 18a odst. 4 zákona 300/2008 Sb., ceník PDZ od 1. 1. 2023) | párování rejstříku proti otevřenému seznamu OVM ze SDS (`seznam_ds_ovm.xml`, staženo 13. 9. 2026); [typy DS](https://datovka.gov.cz/info/cs/65.html), [ceník PDZ](https://datovka.gov.cz/info/cs/82.html) |
| Stojí odpovědi škol něco? | Ne: odeslání z OVM schránky je vždy zdarma bez ohledu na adresáta | [datovka.gov.cz, placené PDZ](https://datovka.gov.cz/info/cs/help/8.6.text.html) |
| Lze to programovat? | Ano: SOAP WS ISDS (`CreateMessage`, `GetListOfReceivedMessages`, `MessageDownload`), basic auth na jméno+heslo schránky, endpoint živý (HTTP 401 bez údajů); existuje testovací prostředí | [WS manipulace s datovými zprávami v3.0](https://testrs.gov.cz/smlouva/soubor/382326/WS_manipulace_s_datovymi_zpravami.pdf); ověřeno `https://ws1.mojedatovaschranka.cz/DS/dz` |
| Stojí naše schránka něco? | Ne: zřízení i provoz DS pro FO/OSVČ je bezplatný | [zákon 300/2008 § 3–4](https://www.zakonyprolidi.cz/cs/2008-300), [chcidatovku.gov.cz](https://chcidatovku.gov.cz/) |

Pět škol typu PO (soukromé a církevní, např. PORG, Střední škola knižní kultury) oslovíme e-mailem; padesátikorunová zpráva nemá smysl.

**Provozní pasti, které se musí ošetřit:**

1. **Doručení fikcí.** Zpráva je po 10 dnech doručená, i když si ji škola nepřečetla. Odezvu proto neměříme doručenkami, ale skutečnými odpověďmi.
2. **Naše čtení = doručení.** Stažení seznamu doslých zpráv přes WS zprávy doručí (§ 17); čteme proto v kontrolovaném rytmu a zprávy archivujeme hned, protože se mažou po 90 dnech od doručení.
3. **Omezení nadměrného provozu.** ISDS omezuje hromadné volání; oslovení 1 100 škol se rozloží do dní, ne jediného skriptu.
4. **Migrace portálu 2026.** Endpointy z dokumentace (`ws1.mojedatovaschranka.cz`) fungují, ale portál se v červnu 2026 přesunul na datovka.gov.cz; při implementaci ověřit aktuální base URL podle tehdejšího Provozního řádu.

**Odůvodnění.** DS řeší současně tři slabiny e-mailového kanálu: důkaz identity odesílatele je silnější než doménová shoda; školy DS čtou, protože je to jejich úřední kanál; a oslovení přes DS není e-mailové obchodní sdělení ve smyslu zákona 480/2004 Sb., takže odpadá výhrada z [návrhu rozvoje §6](navrh-rozvoje-2027.md) — poslední bod je právní odhad, před rozesílkou ho potvrdit.

### 2.5 Rozsah oprávnění a stopa

- Odkaz je vázaný na **jedno REDIZO**; editace jiné školy vyžaduje její kontakt. Škola s více IZO pod jedním REDIZO edituje celek najednou.
- Ověřený kontakt smí **delegovat** (pozvat kolegyni na jinou adresu); zodpovědnost a stopa zůstávají u školy, pozvánka se eviduje.
- Každá změna nese: pole, starou a novou hodnotu, adresu editora, datum, zdroj (škola / rejstřík / CERMAT / redakce). Bez toho se nepublikuje — stejné pravidlo, jaké má [datová linka](datova-linka.md) pro externí zdroje.
- Škola může svůj profil **uzamknout** (žádné návrhy vrstvy 0) i odhlásit z oslovování; evidence odhlášení je společná všem kampaním, jak vyžaduje [návrh rozvoje §6](navrh-rozvoje-2027.md).

**Odůvodnění.** REDIZO je náš primární klíč napříč katalogem i daty uchazečů, takže oprávnění na REDIZO nepotřebuje nové mapování. Stopa u každé změny je podmínka otevřeného vydání (oddíl 5): bez původu a data by dataset nebyl publikovatelný, protože by nešlo odlišit fakt ověřený školou od anonymního tipu.

### 2.6 Čeho se vyvarovat

Neúčtovat heslem, nepropojovat s e‑Identitou ani MŠMT systémy v první verzi. Obojí přidává měsíce integrace, aniž by zlepšilo hlavní riziko, kterým je **kvalita obsahu, ne krádež účtu**: nikdo nemá motivaci falšovat den otevřených dveří cizí školy, a kdyby ano, moderace ho zastaví. Hrozba je řádově menší než cena složité autorizace.

## 3. Co sbíráme — a co ne

### 3.1 Nikdy nežádáme údaj, za který máme autoritativní zdroj

Kapacity, přihlášky, výsledky přijímání, identita školy, obory. Ty předvyplníme a škola je **potvrzuje nebo rozporuje**, nemění. Rozpor generuje úlohu pro redakci (obvykle jiné schéma nebo nový obor), ne přepis čísla.

**Odůvodnění.** Dva editovatelné zdroje téhož údaje vytváří konflikt, který bychom museli řešit navždy. CERMAT a rejstřík jsou silnější než školní formulář; škola je u nich kontrolor, ne autor. Tohle je i pojistka proti přepisu oficiálních výsledků, který [návrh rozvoje §6](navrh-rozvoje-2027.md) zakazuje.

### 3.2 Jádro sběru: co potřebuje uchazeč a nikde jinde to není

Pole seřazená podle hodnoty pro uchazeče; u každého důvod, proč to škola ví jako jediná:

| Pole | Proč to nemáme | Proč to škola ví |
|---|---|---|
| Kritéria PŘ pro 2027 v češtině rodiče: co se počítá a kolik bodů za co | CERMAT zná jen výsledek; míra `rozhodl_test` pozná, **že** rozhodlo něco jiného, ne **co** | škola kritéria sama vyhlásila |
| Odkaz na vyhlášená kritéria (PDF na webu školy) | neexistuje centrální registr kritérií | škola je povinna je zveřejnit |
| Dny otevřených dveří s rokem | InspIS: medián roku 2023 | škola je pořádá |
| Přípravné kurzy a přijímačky nanečisto | v InspIS vyplněno u 0 % škol | škola je prodává |
| Váha talentové/vlastní zkoušky u oborů, kde `rozhodl_test` klesá | z dat poznáme jen anomálii (medián 0,66 u skupiny 82) | škola zná poměr |
| Ubytování, stravování, dojezdová kolejní kapacita | rejstřík zná jen existenci zařízení | provozní údaj školy |
| Školné a poplatky | InspIS vyplněno u 77 %, neověřené | škola účtuje |
| Podpora SVP a podmínky upravených testů v praxi | CERMAT zná jen statistiku upravených testů | škola je organizuje |
| Podmínky přestupu v průběhu studia | nikde nejsou | interní praxe školy |

**Odůvodnění.** Seznam je sestavený zevnitř ven: první tři řádky přímo odpovídají otázkám, které dnes blok „Dostanu se sem?" neumí zodpovědět (viz [teze využití dat JPZ](teze-vyuziti-dat-jpz-2027.md), zejména větu „bez přečtení kritérií školy se nedá odhadnout nic"). Pokud škola kritéria potvrdí strojově čitelně, míra `rozhodl_test` přestane být popis anomálie a stane se ověřením shody mezi vyhlášenými kritérii a skutečným průběhem — to je pro uchazeče nejcennější kombinace, kterou žádný zdroj sám nedá.

### 3.3 Prezentační část: škola jako autor, nepovinná

Popis školy vlastními slovy, fotografie, akce, úspěchy, výjezdy, kontakty na výchovného poradce, videa. Zobrazuje se odděleně a se značkou původu „od školy", nikdy se nemíchá s fakty z dat.

**Odůvodnění.** Prezentace je důvod, proč škola vůbec přijde — pro ni je hodnota v profilu, ne v naší databázi. Oddělená značka „od školy" chrání důvěru v datovou část: čtenář pozná, co je marketing. InspIS tohle míchalo a výsledek byl, že si nikdo nebyl jistý ničím.

### 3.4 Škola, která nechce, nemusí nic

Profil funguje i bez školy: z dat, jak dnes. Neodpověď nikdy neodstraní údaj ani nesníží viditelnost. Formulář má u každého pole „potvrdit beze změny" jedním kliknutím a celoroční stav školy čte „údaje z datových zdrojů, škola dosud nepotvrdila".

**Odůvodnění.** Jakákoli povinnost by selektivně zvýhodňovala školy s administrativní kapacitou — přesně ta slepá skvrna, kvůli které byl InspIS nerovnoměrný. „Neověřeno školou" je čestný stav, ne trest. Klikací potvrzení minimalizuje cenu účasti: potvrdit 12 předvyplněných údajů je minuta práce, vyplňovat prázdný formulář je půl hodiny.

## 4. Moderace a publikace

- Návrhy vrstvy 0 i 1 čekají ve frontě; publikuje je člověk. Šablona fronty a schvalování se přejímá z [datové linky](datova-linka.md): úloha → schválení → PR.
- Automaticky projde jen kosmetika od vrstvy 1 (překlep v textu od školy), nikdy čísla, termíny a kritéria.
- Každý údaj na webu nese původ a datum: „potvrzeno školou 3. 11. 2026", „z dat CERMATu, srpen 2026", „neověřeno".
- Zobrazení využije existující kanál poznámek (`public/school_notes.json`); sada se po realizaci zapíše do registru `public/stav_datovych_sad.json` podle [pravidel pro nový zdroj](zdroje-dat.md#6-jak-přidat-zdroj-nebo-sloupec).

**Odůvodnění.** „Web se bez schválení nikdy nezmění" je zásada, kterou projekt už má zapsanou u externích zdrojů; u vstupu od tisíce dobrovolníků platí dvojnásob. Automatická kosmetika je jediná výjimka, protože bez ní by moderace zahltily překlepy.

## 5. Otevřené vydání

Nasbíraná data vydáváme jako otevřený dataset: strojově čitelný JSON + CSV, po polích s proveniencí (původ, datum, vrstva ověření), verzovaný po sezónách PŘ, registrovaný v NKOD. Licence **CC BY 4.0**.

Podmínky, bez kterých to nejde:

1. **Souhlas ve formuláři.** Texty od škol jsou autorská díla; formulář musí obsahovat souhlas s vydáním pod CC BY 4.0. Bez něj publikujeme jen fakta (termíny, čísla, odkazy), ne školní texty. Fakta jako taková autorskoprávně chráněná nejsou, ale databáze jako celek ano — proto licence i pro ně.
2. **Bez osobních údajů.** Dataset neobsahuje jména ani adresy editorů; stopa z oddílu 2.4 je interní, publikuje se jen „škola / redakce / zdroj X" a datum.
3. **Původ zůstává u hodnoty.** Otevřenost bez provenience by replikovala hlavní vadu InspIS — čtenář by nevěděl, co je ověřené.

**Odůvodnění.** CC BY 4.0 je standard českého otevřeného státu (používá ji NKOD) a umožňuje další použití včetně komerčního, což je smysl zadání. Verzování po sezónách, ne průběžné přepisování: spotřebitel datasetu potřebuje stabilní snímek „PŘ 2027", ne živý proud.

## 6. Rizika a otevřené otázky

| Riziko / otázka | Míra |
|---|---|
| Odezva škol na oslovení — celý model stojí na dobrovolnosti | pilot 50–100 škol podle [návrhu rozvoje §6](navrh-rozvoje-2027.md) dřív, než se staví portál; odezva se měří dokončenými kontrolami, ne otevřeními |
| Rejstříkové e-maily jsou funkční adresy (sekretariát), ne osoba s rozhodováním | přijmout — sekretariát je správný vstupní bod; delegace v oddíle 2.4 to pokrývá |
| Zneužití rejstříkové adresy přeposíláním | moderace všech změn; spor řeší vrstva 2 (datová schránka) |
| Právní rámec oslovení (obchodní sdělení) | před rozesílkou posoudit dle ÚOOÚ, jak §6 návrhu rozvoje vyžaduje; pilot oslovuje s žádostí o spolupráci, ne s nabídkou služby |
| Stav sezóny: kritéria 2027 školy vyhlásí v listopadu–lednu | kalendář sběru navázat na vyhlášení kritérií, ne na školní rok |
| Co s daty škol, které mezitím zaniknou nebo se sloučí | párování na stabilní identifikátory, jak řeší [matice změn](matice-zmen-skol-a-oboru-2025-2026.md); profil zaniklé školy se archivuje |

## Historie

| Verze | Změna |
|---|---|
| 1.0 | První návrh: autorizace kotvená na rejstřík MŠMT (ověřeno pokrytí 99,1 %), tři vrstvy důvěry, rozsah sběru rozpadnutý na „nemáme nikde / prezentace / neptat se", otevřené vydání pod CC BY 4.0 s podmínkami. |
| 1.1 | Ověřená proveditelnost datové schránky: 98,7 % škol má DS typu OVM, komunikace i odpovědi jsou zdarma, SOAP WS živé. DS posunuta z rezervy pro spory na hlavní formální kanál (nový oddíl 2.4). |
| 1.2 | Pilotní realizace (13. 9. 2026): místo e-mailového jednorázového odkazu (§2.2) vydává zadavatel vybraným školám přihlašovací kód osobně (v repozitáři jen SHA-256 hashe, `data/portal/kody.json`, generátor `scripts/portal-generate-codes.js`). Portál `/pro-skoly` s předvyplněným profilem, odeslání vytvoří GitHub issue s labelem `portal-skoly`, moderace a zápis do `public/portal_skol.json` přes `scripts/portal-moderace.js`, schválené údaje se zobrazují na stránce školy se značkou „potvrzeno školou“. Souhlas CC BY 4.0 je povinný v každém odeslání. |
| 1.3 | Implementován magic link a potvrzovací e-mail podle §2.2 (13. 9. 2026): mapa REDIZO → rejstříkové e-maily (`scripts/portal-build-emaily.js` → `data/portal/emaily.json`), bezstavový HMAC token s platností 72 h (`src/lib/portal-magic.ts`, klíč `PORTAL_MAGIC_SECRET`), endpoint `POST /api/portal-magic` s neutrální odpovědí proti enumeraci, editační stránka `/pro-skoly/link/<token>` sdílí formulář s kódovou variantou. `/api/portal-skoly` přijímá kód i magic token (issue nese kanál, nikdy token) a po vytvoření issue posílá editorovi best-effort potvrzovací e-mail (`email_odeslan` v odpovědi). |
| 1.4 | Admin stavová stránka `/admin` (13. 9. 2026): read-only přehled pro zadavatele – otevřené návrhy z GitHub issues (kanál, stáří), schválené profily z `public/portal_skol.json`, stav datových sad z `public/stav_datovych_sad.json` (zastaralá/po termínu), fronta datové linky a běhy GitHub Actions. Přístup přes token v URL (`?k=…` vs env `ADMIN_TOKEN`, constant-time), špatný/chybějící token → 404, stránka není v sitemapu a má noindex. |
