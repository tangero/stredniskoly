# Školní novinky z RSS/Atom feedů – návrh implementace

**Verze:** 1.11 (plán běží z nastavení služby Railway, ne z repozitáře; provozní opravy z prvních běhů; text návrhu po páté oponentuře – [oponentura 1.4](oponentura-skolske-novinky-rss-2027-v1.4.md); starší: [čtvrtá](oponentura-skolske-novinky-rss-2027-v1.3.md), [třetí](oponentura-skolske-novinky-rss-2027-v1.2.md), [druhá](oponentura-skolske-novinky-rss-2027-v1.1.md), [první](oponentura-skolske-novinky-rss-2027.md))
**Datum:** 20. 9. 2026
**Podklady:** sonda feedů (`docs/rss-webu-skol-sonda-2026.md`, data `data/sondy/rss-webu-skol-20260919.json`), reprodukovatelné měření klasifikace (`scripts/rss-klasifikace-mereni.py --offline`; manifest `data/sondy/rss-klasifikace-manifest80.json`, vzorek `data/sondy/rss-klasifikace-vzorek80.json` + `…-doplneni.json`, ruční reference `data/sondy/rss-klasifikace-reference.json`), regresní testy `tests/test_rss_klasifikace.py`.
**Prověření dřívějších rozhodnutí (20. 9. 2026):** [Překonaná rozhodnutí kolem sklízení školních novinek](prehodnoceni-rozhodnuti-rss-2027.md) – sedm rozhodnutí, která okolí návrhu překonalo (mrtvý InspIS, strop pokrytí 49 %, hotové úložiště odběrů, dvojí model události, pole v portálu, role modelu, sezóna), a osm, která po prověření platí dál. Tento návrh zatím neměním; přehled je podklad k rozhodnutí zadavatele.

**Zásadní upřesnění zadavatele (druhá oponentura):** autonomní provoz – zveřejňování nemá vyžadovat lidské schvalování. Návrh proto nemá žádnou schvalovací frontu; nejistota se řeší automaticky omezením interpretace (viz 3.6).

## 1. Co chceme

Ze školních webů automaticky sklízet novinky. **Přijímací informace** (den otevřených dveří, vyhlášení kol přijímaček, kritéria, volná místa, výsledky) vytipovat, ukázat výrazně na stránce školy a poslat rodičům e-mailem. **Ostatní novinky** (sport, Erasmus, akce) jen doplňkově na stránce školy.

Proč to jde: 533 z 1 093 škol (48,8 %) má funkční feed (přesondováno po opravách z obou oponentur), obsah přímo kopíruje kalendář přijímaček (výsledky kol v květnu–červnu, DOD od září). Čerstvost: ve vzorku 39 feedů mělo 28 (72 %) poslední položku mladší 30 dnů – jmenovatel je ten vzorek, ne všech 533 zdrojů.

## 2. Klíčové měření: klíčová slova jako výchozí metoda; přesnost ověřená, úplnost ne

Reprodukce jedním příkazem: `python3 scripts/rss-klasifikace-mereni.py --offline` (zmrazený manifest 80 feedů, uložené položky, ruční reference na jednotce položka×třída; běží bez sítě i bez `requests`, tedy i v čistém CI – ověřeno i příkazem `python3 -S`, který nepustí instalované balíčky). Aktuální čísla verze pravidel 2026-09-20.6 (proti 2026-09-20.5 se změnilo jen zacházení s datem vydání, které předbíhá sklizeň; klasifikace je beze změny a měřená čísla se nepohnula):

- 80/80 uložených záznamů má položky nebo prázdný seznam (3 prázdné; 5 původně vadných feedů vyřešil tolerantní parser včetně holého `&` a entity `&lt;` vedle `&nbsp;`). Offline režim reprodukuje klasifikaci a počty nad uloženými položkami, ne zpětné parsovací pokusy nad archivem XML.
- **624 položek v okně 180 dní, 76 přijímacích zásahů u 38 škol.**
- Přesnost **témat** proti ruční referenci (109 párů třída×zásah): **102/109 = 94 %**; slabá místa: DOD bez kontextu (7/11) a holé „přihlášk…" (7/10) – proto nejsou e-mailové.
- Přesnost rozhodnutí **vysoká jistota**: **60/60 párů = 51 různých položek** (počet udáván vždy v obou jednotkách – jedna položka může mít více tříd). Pravidla oddělují téma od významu: negace („volná místa nemáme", „již nejsou"), cizí pořadatel DOD, **VOŠ (přijímání na vyšší odbornou školu není obsah pro uchazeče o SŠ)**, VŠ, talentovky ZUŠ, výsledkové listiny turnajů, kategorie nejsou spouštěč.
- **Stav sdělení** se rozpoznává zvlášť po klauzulích: oznámeno / změněno / zrušeno / nejisté. Zrušení se nevyvozuje z jednoho slova v článku – „není zrušen" je popření zrušení, „registrace zrušena, akce proběhne" ruší přihlášení, ne akci, a „nekoná se" je zrušení, i když slovo „zrušeno" v textu chybí.
- **Konečné rozhodnutí**, ne jen mezikrok: `rozhodni_publikaci()` říká, co uvidí čtenář – karta s termínem 3×, karta bez odvozeného termínu 47×, neutrální odkaz 26×. U tříd s pozvánkou (DOD, talentové zkoušky, náhradní termín) je proti ruční referenci **zobrazení 10/11, termíny 10/11, stav sdělení 11/11**; jediný rozdíl je přehlédnutá pozvánka („Den otevřených dveří 2026, přijďte se podívat" bez slova o uchazečích), tedy chybějící záchyt, ne chybné tvrzení.

| Třída | zásahů | přesnost tématu | vysoká jistota | kam |
| --- | ---: | ---: | ---: | --- |
| vysledky_prijm | 36 | 100 % | 34×, 100 % | karta + e-mail |
| prijimaci_rizeni (kola, kritéria) | 47 | 100 % | 19×, 100 % | karta + e-mail jen s vyhlášením/kritérii |
| dod | 11 | 64 % | 4×, 100 % | karta + e-mail jen s kontextem uchazeče a stavem oznámeno |
| volna_mista | 4 | 100 % | 2×, 100 % | karta + e-mail; negace nikdy |
| prihlaska | 10 | 70 % | 0× | jen web |

**Známé meze měření:** vysoká jistota se měří na mezikroku klasifikace; **konečné zobrazení má ruční referenci jen u tříd s pozvánkou** (11 párů), jinde se shoduje s hodnocením vysoké jistoty. Úplnost (kolik relevantních zpráv pravidla přehlédla) je **neměřená** – vyžaduje ručně označit všechny položky vzorku, ne jen zásahy; 100 % vysoké jistoty je na vzorku, ze kterého pravidla vznikla, a je třeba ji potvrdit na jiném období (sezóna DOD říjen–leden) a na benchmarku odděleném od ladění; objem „za 180 dní" je spodní mez, protože feedy jsou kluzné okno (medián 10 položek). Zjištění „47,5 % škol mělo přijímací zásah za pololetí" znamená „aspoň jeden zásah", ne „zachytili jsme vše důležité". Malé třídy (talentové zkoušky, náhradní termín) ve vzorku nemají zásahy – jejich povolení pro e-mail se rozhoduje až na sezónním benchmarku.

**Objem:** ~0,9 přijímacího zásahu na školu za pololetí (dolní odhad) → ~18/týden celorepublikově (špička květen–červen). Přesnou frekvenci potvrdit průběžným sběrem; limit zpráv se vynucuje v odesílači, viz oddíl 4.

**Datum akce (DOD):** ve vzorku má termín v roli akce s explicitním rokem 6 z 11 zásahů. Pravidla zpřísněná: přebírat jen kalendářně platná data **s explicitním rokem** (žádné dopočty z pozvánek – překonaná varianta z 1.1); roli data (akce / registrace / neurčená) určuje **klauzule, ve které datum leží**, tedy kontext před popiskem i za ním („9. 12. 2026 – konec registrace" je registrace, ne akce); roli `registrace` nelze zdědit z jiné klauzule a **neurčená role na kartu nejde**; datum musí být ≥ datum publikace; u nejasného termínu karta ukáže původní titulek a odkaz bez data. U zbytku „škola zveřejnila DOD →" s odkazem.

**Parser:** 6 % feedů mělo formální vady (HTML entity, whitespace před `<?xml`, holé `&` v textu) – tolerantní parser je součástí `scripts/rss-klasifikace-mereni.py` (`parse_feed`: surový pokus, pak entity + escapování holých ampersandů; po opravě 80/80). Feedy s „comment" v URL vynechat.

## 3. Architektura

```
registr zdrojů (git, PR)      → public/skoly_feedy.json      # REDIZO → feed_url
sklízeč (GitHub Actions 2× denně) ── zápis přímo do Postgresu (žádný PR na položky)
                                         ↓
web: čte DB (krátká cache) + on-demand revalidace stránky dotčené školy po změně
                                         ↓ (jen vysoká jistota)
              e-mail: fáze 1 plošná zpráva / fáze 2 sledování škol (N4)
```

Změna oproti 1.0 (oponentura 3.1, 3.2): **živé položky nepatří do gitu** – čekání na ruční PR nemá horní mez a `revalidate = 3600` ani modulová cache v `skoly-web.ts` by se o novém souboru nedozvěděly bez nasazení. Do gitu patří pravidla klasifikace a registr zdrojů; položky do databáze. Portál škol už Postgres provozuje (`@neondatabase/serverless`, migrace 002), takže nepřibývá žádná nová infrastruktura – jen tabulky.

### 3.1 Registr feedů – `public/skoly_feedy.json`

- Ze sondy: REDIZO → `{feed_url, typ, zdroj: deklarovany|fallback}`; jen `stav: platny`, bez „comment" URL. 533 škol po přesondování (pokrývá ~48 % nabídek).
- **Aktivace zdroje je automatická** (autonomní provoz): zařazení = validace obsahu feedu (skutečné položky, vazba na známý web školy). Nepodaří-li se zdroj bezpečně přiřadit, funkce se pro školu nezapne a zkusí se znovu později. **Git je auditní export, ne podmínka** – registr se průběžně exportuje do repozitáře pro dohledatelnost; PR je povinný jen pro změny kódu a pravidel klasifikace, ne pro nově nalezenou adresu (sjednoceno dle N6 třetí oponentury).
- Nový build skript `scripts/build-skoly-feedy.py` podle konvence; záznam v `docs/zdroje-dat.md`.

### 3.2 Sklízeč – `scripts/sklizec-novinek.py` (GitHub Actions 2× denně, zápis do Postgresu)

- Actions pro pilot postačí, ale **není zárukou času** (GitHub připouští zpoždění/vynechání) → dohled: záznam každého běhu, alarm při vynechání. Vercel cron není vyloučen limitem samotným (rozhoduje délka běhu a dávkování), ale Actions je pro stahování 500+ webů praktičtější. Rozhodnout podle naměřené spolehlivosti, ne apriori.
- Podmíněné požadavky (`ETag`/`If-Modified-Since`), stav validátorů v DB mezi běhy.
- **Identita, deduplicace i opravy** (oponentury 3.7 a R4): klíč = zdroj + GUID (unikátnost v rozsahu zdroje, GUID globálně jedinečné být nemusí); fallback **normalizovaná URL**, ne hash titulku – změna titulku je změna obsahu, ne nová položka. Ke každé položce **otisk obsahu**; změna u známé položky = nová verze. Otisk ale pozná jen změnu, ne její význam (oprava překlepu vs. zrušení termínu): verze proto ukládá i **zobrazovaná pole a extrahovaná tvrzení** (titulek, termíny, třídu, jistotu, verzi pravidel), aby šlo rekonstruovat, co bylo čtenářům sděleno, a porovnat význam. Nedá se-li význam opravy určit, přejít na původní titulek+odkaz bez odvozeného termínu. Zmizení položky z krátkého feedu **není** zrušení události.
- **Stav zdroje odděleně od obsahu** (oponentura 3.8): `naposledy_ok`, `posledni_polozka`, počet po sobě jdoucích chyb; 429/`Retry-After` respektovat, odstupňované opakování; klidné zdroje kontrolovat méně často, ale průběžně; vyřazené zdroje periodicky reverifikovat. Při výpadku **zdroje** (feed neodpovídá) zobrazovat poslední uložené položky s údajem o stáří kontroly, ne tvrdit „škola nemá novinky". Výpadek **databáze** je jiný stav a řeší ho 3.7 (fail-closed).
- Jen metadata + titulek + odkaz. **Plný text nepřebírat** (autorská práva).

### 3.3 Úložiště – Postgres (tabulky portálové infrastruktury)

`skola_feed(redizo, feed_url, aktivni, naposledy_ok, etag, modified_since, chyby_v_rade)`,
`skola_novinka(id, redizo, guid, otisk_obsahu, titulek, url, publikovano, prijimaci_obdobi, trida, jistota, terminy jsonb, konec_platnosti, zneplatneno, vytvoreno)`,
`skola_novinka_verze(novinka_id, otisk, zobrazovana_pole jsonb, extrahovana_trzeni jsonb, verze_pravidel, zaznamenano)` – verze zobrazovaných polí, ne jen otisk.
`skola_prepinac(klic, hodnota, zmeneno, zdroj_zmeny)` – provozní přepínače (viz 3.7).
Pole `prijimaci_obdobi` se odvozuje z dat publikace a kalendáře přijímaček (např. řízení 2027 = kritéria zveřejněná na podzim 2026 až výsledky v létě 2027); nedá-li se odvodit spolehlivě, zůstane prázdné a položka se k období neváže (bezpečný fallback = titulek+odkaz). Migrace přes existující mechanismus `/api/portal/migrace` (CRON_SECRET). Bez `DATABASE_URL` web funguje postaru – novinky se prostě nezobrazí (stejný fallback jako portál). Chybějící konfigurace a výpadek fungující služby zůstávají dva odlišné **stavy** (jiný záznam v dohledu, jiný alarm), ale **stejné chování na webu: blok se nerenderuje** (fail-closed dle 3.7). Dřívější věta o „posledních dobrých datech" při výpadku DB je tímto přepsána – slibovala současně dostupnost starých dat i okamžité vypnutí položky.

### 3.4 Platnost podle stavu události, ne jeden limit (oponentury 3.5 a R3)

Oddělit **stáří článku**, **stav informace** a **jednotlivé termíny**:

| Třída | `konec_platnosti` a pravidla |
| --- | --- |
| akce školy s přečteným termínem | karta datum nepíše (3.5), ale platnost se podle něj počítá: jakmile proběhne **poslední** přečtený termín, zpráva klesá mezi ostatní. `konec_platnosti` = poslední termín + 3 dny. |
| akce školy bez přečteného termínu | kartou zůstává: termín v článku být může, jen my ho neumíme vyluštit, a schovat kvůli tomu pozvánku by čtenáři vzalo právě to, kvůli čemu přišel. `konec_platnosti` = publikování + 60 dní. |
| volná místa | publikování + 7 dní – jde o limit **stáří sdělení, ne potvrzení dostupnosti**; karta říká „škola {datum} hlásila volná místa", nikdy „škola má volná místa". „Naposledy ověřen zdroj" ≠ „škola potvrdila, že místa zbývají". |
| výsledky / kola / kritéria | do uzávěrky daného kola (ne do konce celého přijímacího období, když uzávěrka uplynula); kolo bez data uzávěrky = novinka s `konec_platnosti` dle `prijimaci_obdobi` z registru. |
| ostatní | publikování + 60 dní |

**Datum vydání v budoucnosti se nebere vážně (nález z provozu 20. 9. 2026).** Pravidla výše hlídala data *akce*, ale ne datum *vydání* samotné položky. V prvním ostrém běhu přišel článek „Operační program Jan Amos Komenský" s `pubDate` **11. 11. 2031**. Dvě škody najednou: rodiči se u zprávy ukazuje rok 2031, což je nepravda, a položka by se řadila na začátek seznamu a trvale držela jedno z pěti míst v bloku — až do roku 2032. Od 20. 9. 2026 platí: datum vydání, které předbíhá sklizeň o víc než `TOLERANCE_BUDOUCIHO_DATA_DNU` (1 den, kryje časové zóny), **se zahodí a položka se tváří jako bez data**. Zprávu nezahazujeme, jen o ní přestaneme tvrdit, kdy vyšla.

S tím souvisí druhá oprava: `konec_platnosti` se u položky bez data vydání počítá **ode dne sklizně**, ne jako „bez konce". Dřív vracel `None`, tedy nesmrtelnou zprávu — a byly to právě ty položky, u kterých si datem nejsme jistí. Týká se to jednotek položek (2 z 3 859 v prvním běhu) a zároveň všech, kterým datum zahodíme nově.

Extrakce data akce (zpřísněná podle R3): jen kalendářně platná data s explicitním rokem (extraktor validuje den/měsíc – „31. 2." se zahodí); data bez roku se na kartu nedávají; datum musí být ≥ datum publikace; u nejasného termínu nebo období karta ukáže původní titulek a odkaz.

### 3.5 Klasifikace – dvoustupňová podle měření

- **Vysoká jistota → karta + (fáze 2) e-mail:** DOD s kontextem školy/uchazeče; „výsledky" + přijímací kontext; „vyhlašujeme N. kolo"; „kritéria přijetí"; „volná místa" + přijímací kontext; „talentové zkoušky"; „náhradní termín".
- **Střední jistota → jen web:** holé „přihlášk…" po vylučovačích; „přijímací zkoušky" bez akčního slovesa; DOD bez kontextu.
- **Ostatní → doplňkový seznam** (žádná klasifikace, jen čerstvost).

**Jediné publikační rozhodnutí (F5 čtvrté oponentury):** téma, jistota, stav sdělení a termíny ústí do jedné funkce (`rozhodni_publikaci` v měřicím skriptu, v provozu totéž pravidlo), která vrací `karta` | `odkaz` | `seznam` a způsobilost pro e-mail. Testuje se a měří se **ona**, ne mezikroky. Karta vyžaduje vysokou jistotu tématu a stav `oznameno`; cokoli z toho chybí → původní titulek a odkaz. **Zrušení jednoho z několika termínů neruší ostatní** – stav se drží u klauzule, ne u celého článku.

**Karta netvrdí datum (rozhodnutí zadavatele 20. 9. 2026).** Do té doby existovala čtvrtá hodnota `karta_terminu`, která čtenáři vypsala data přečtená z článku. Skončila na tom, co se dalo a nedalo naměřit: přesnost tříd je ověřená (102/109 párů), vazba mezi datem a událostí ne. Data se sbírají z celého článku a v `podrobne` nenesou štítek, čeho se týkají, takže se v jednom plochém seznamu sešly termíny se lhůtami. Doložený případ – škola 600005399, článek „Přijímací řízení a jednotná přijímací zkouška 2026/2027“: pod nadpisem „termín oznámený školou“ stálo osm dat, z toho **tři lhůty** (30. 11. 2026 konec podávání přihlášek na konzervatoře, 22. 2. 2027 uzávěrka přihlášek, 7. 1. 2027 informační schůzka pro rodiče) a **šest termínů MŠMT**, které škola jen opsala; skutečný termín JPZ 13. 4. 2027 naopak v kartě chyběl. Nálepka „oznámený školou“ o většině těch dat tvrdila nepravdu.

Hodnota bloku je v **rozlišení důležitého od ostatního**, ne v tom, že za školu tvrdíme datum. Karta proto nese **štítek podle třídy** – „den otevřených dveří“, „přijímačky nanečisto“, „setkání s uchazeči“, „kritéria přijetí“, „výsledky přijímacího řízení“ – titulek školy a odkaz. Datum si čtenář přečte v článku školy, kde ho napsala škola; přečteme-li ho špatně, nikomu to nic nerozbije. Přehledový článek, který se chytí na tři a více témat, dostane obecný štítek „přijímací řízení“ – konkrétní by z něj udělal zprávu o jedné věci.

**Termíny se dál čtou, jen se nezveřejňují.** Slouží ke konci platnosti (3.4) a k tomu, aby pozvánka na proběhlou akci klesla mezi ostatní zprávy. Do odpovědi `/api/skoly/[redizo]/novinky` nejdou; vidět jsou v administraci, kde je to podklad pro dohled, ne tvrzení pro rodiče.

**Tři nové třídy akcí školy pro uchazeče (20. 9. 2026).** `prijimacky_nanecisto`, `setkani_uchazecu` a `pripravny_kurz` přibyly k `dod`, protože přesně tyhle akce rodina hledá. Všechny mají vylučovače na to, co vypadá podobně, ale je pro vlastní žáky nebo o něčem jiném: „cvičné testy B2 First a C1 Advanced“ gymnázia Příbram jsou jazykový certifikát, ne přijímačky nanečisto, a „kurz“ sám o sobě znamená i lyžařský. Přípravný kurz je vlastní třída, ne podmnožina setkání: bývá placený a s omezenou kapacitou, takže by pod štítkem „setkání s uchazeči“ čtenáře mátl.

Vrátit datum na stránku má smysl až s klasifikací po jednotlivých datech – štítkem u každého data, co se ten den děje a jestli je to akce, nebo lhůta. To je P6 v [překonaných rozhodnutích](prehodnoceni-rozhodnuti-rss-2027.md), rozhodnuté 20. 9. 2026, zatím neimplementované.

### 3.6 Zobrazení na stránce školy

- **Výrazná karta** v oddílu `#obory`, těsně před/za blok „Přijímací řízení podle školy" (`src/components/skola/ProfilSkoly.tsx:272, 282`): štítek podle třídy („Den otevřených dveří", „Přijímačky nanečisto", „Setkání s uchazeči", „Kritéria přijetí"…), titulek a odkaz na článek školy, datum vydání a **údaj o původu a poslední kontrole zdroje**. **Datum konání karta nepíše** (3.5) – vede na článek školy větou „datum konání a podmínky najdete v článku školy: pořadatelem je škola, ne tento web". Bez dat karta neexistuje.
- **Dvě rubriky, ne jeden seznam (rozhodnutí zadavatele 20. 9. 2026).** Všechno z feedu je k něčemu dobré, ale ne stejně: „podmínky přijímacího řízení" a „den otevřených dveří" jsou to, kvůli čemu rodina na stránku přišla, zatímco „prima jela na seznamovák" nebo „naši žáci byli na olympiádě" dokreslují, čím škola žije. Proto:
  - **k přijímačkám** (`karta`, `odkaz`) – u oborů, na prominentním místě, doplňkový seznam pod nadpisem „Další zprávy k přijímačkám";
  - **ze života školy** (`seznam`, tedy položky bez přijímacího tématu) – zavřená rubrika **na konci stránky**, nad patičkou, pod nadpisem „Ze života školy".
  - Čtou se **dvěma dotazy s vlastním limitem**, ne jedním společným oknem. Zprávy ze života jsou v datech drtivá většina (4 108 z 4 554 uložených položek k 20. 9. 2026); jedno okno by u sdílné školy vyplnily a zpráva k přijímačkám by se do bloku nedostala – táž vada, kterou už jednou způsobil `limit 5` podle data.
  - Obojí se načítá **jedním požadavkem**: komponenty sdílejí slib podle REDIZO, ačkoli stojí v rozvržení daleko od sebe.
- **Bez data vydání se píše den objevení.** Když feed datum neuvedl nebo uvedl datum v budoucnosti a sklízeč ho zahodil (3.4), zobrazí se „objevilo se 19. 9. 2026" – den, kdy položku poprvé viděla sklizeň. Je to slabší údaj než datum vydání, ale pravdivý: zpráva vyšla někdy mezi předchozí a touhle sklizní. Prázdné místo by čtenáři neřeklo nic a datum objevení se **nikdy nevydává za datum vydání** ani se podle něj neřadí a nepočítá platnost.
- **Konflikty bez moderace (autonomní provoz):** žádná schvalovací fronta. Pravidla:
  - Nová položka z ověřeného zdroje → po kontrole URL/formátu/identity rovnou titulek+datum+odkaz.
  - Spolehlivá třída + stav `oznameno` → výrazná karta automaticky, se štítkem podle třídy a bez tvrzení o datu.
  - Nejistá třída, negace nebo význam opravy → neutrální odkaz; systém netvrdí dostupnost míst.
  - **Rozpor portálu a RSS:** u obou zdrojů ukázat původ a datum, označit rozpor a **potlačit zvýrazněnou kartu**. Portál nemá bezpodmínečnou přednost: škola může na webu zrušit termín potvrzený v portálu před měsícem – starší údaj se nechrání jen tím, že prošel portálem. Čtenář vidí obě informace hned, nikdo nečeká na moderátora; rozpor se zároveň zapíše do auditu (dobrovolný náhled člověka, ne podmínka provozu).
  - Podezřelý zdroj / náhlý nárůst chybných položek → automaticky izolovat zdroj nebo vypnout zvýrazňování třídy (přepínač v 3.7); ostatní školy pokračují.
- **Doplňkový seznam:** rozbalovací blok „Novinky z webu školy": posledních 5 položek, titulek + datum + externí odkaz (`rel="noopener noreferrer"`). Obsahuje i **přijímací položky se střední jistotou** (označené, např. „k přijímačkám") – nejistá interpretace znamená odkaz bez karty, ne úplné skrytí zprávy (sjednoceno dle N6).
- **Výběr pěti položek dává přednost důležitým zprávám (oprava 20. 9. 2026):** blok drží pět položek, ale nevybírají se prostě podle data. Čtecí vrstva bere širší okno posledních 30 platných položek, teprve v nich vyhodnotí platnost termínu a přepínače a do pětice pak řadí nejdřív karty a zbytek podle data. Důvod je naměřený: u školy 600011801 ležela v dávce pozvánka na den otevřených dveří 1. 10. 2026, ale na stránku se nedostala, protože ji přebilo pět novějších zpráv ze života školy – mimo jiné nabídka práce pro dojiče. Pozvánka na den otevřených dveří je přitom jediný údaj, po kterém je v tomhle bloku poptávka. Uvnitř obou skupin se pořadí podle data nemění.
- **Značka původu:** nový typ v `Puvod` (`ProfilSkoly.tsx:46-57`), „z webu školy, automaticky".
- **Jen přehled školy, ne detail oboru** (pravidlo vrstev).
- **Obnova stránky – kontrakt cache (R5, upřesněno dle F6):** pořadí = **záznam nevyřízené invalidace v téže transakci jako změna** → commit → `revalidatePath` dotčených škol (z Route Handleru) → označení invalidace za dokončenou. Pořadí „commit → volání → záznam" by mělo mezeru (proces zemře po commitu a opakování nemá co obnovit); tato věta nahrazuje dřívější znění a sjednocuje 3.6 s 3.7. `revalidatePath` označí cestu k revalidaci, stránka se přegeneruje při další návštěvě; selhání volání po commitu se nesmí ztratit – nevyřízené invalidace se ukládají a opakují. Datová cache: žádná vlastní modulová cache mimo Next.js (ta by se `revalidatePath` nevyprázdnila) – čtení z DB přes `unstable_cache` se stejným tagem, aby se invalidovalo spolu s cestou.
- **Blok novinek se nebere z ISR stránky (F6):** `revalidatePath` ani výjimka při čtení DB nezmizí z už vygenerované stránky – cachovaná stránka se obslouží bez dotazu do DB a výjimka během revalidace vede u ISR k dalšímu poskytování posledního úspěšného výsledku. Blok proto **není součástí staticky generovaného HTML**: stránka školy si ho dotáhne z `/api/skoly/[redizo]/novinky` s `Cache-Control: s-maxage=60, stale-while-revalidate=0`. Kontrakt je tím **výslovný a ověřitelný**: maximální stáří zobrazených novinek je 60 sekund, vypnutí položky nebo zdroje přepínačem se projeví do 60 sekund a **chyba čtení DB vrací chybový stav, ne prázdný seznam** – blok se nezobrazí a nikdy netvrdí „škola nemá novinky". Novinky jsou odkazy na cizí web, takže vynechání z SSR HTML nic nestojí.
- **Přejímací zkouška kontraktu před pilotem:** načíst stránku školy s daty → vypnout položku přepínačem → vyvolat výpadek DB → ověřit v produkčním režimu, že další návštěva blok nezobrazí (ne v `next dev`, kde se necachuje).
- **Letopočty nikdy napevno** – rok z registru přes `zobrazeneObdobi`; ale registr období nenahrazuje datum ze zdroje (oponentura 3.6).

### 3.7 Provoz: přepínač, dohled, zotavení (R7)

- **Provozní přepínač v DB, ne v PR:** `skola_prepinac` umí vypnout zdroj, skrýt jednu položku, nebo vypnout zvýrazňování třídy – respektovaný při čtení webu i při plnění e-mailové fronty, s invalidací dotčeného zobrazení a auditní stopou. Přepínač umí aktivovat i automatická kontrola anomálií (náhlý nárůst chybných položek zdroje); admin zásah je doplňková možnost. PR zůstává pro změny pravidel a registru, ale **nesmí být nutný pro zastavení vadné publikace** – vypnutí sklízení samo o sobě neskryje chybnou kartu už v DB a cache. Rozlišit vypnutí zdroje / položky / zvýrazňování třídy: sběr neutrálních titulků běží i při vypnutém zvýrazňování.
- **Invalidace atomicky se změnou (N8):** záznam nevyřízené invalidace vzniká **v téže transakci** jako změna položky – pořadí „commit → volání → záznam" by mělo mezeru (proces zemře po commitu, před záznamem, a opakování nemá co obnovit). Následný pokus invalidaci označí za dokončenou. Tagy pro sdílená data/přepínače a dotčené cesty se definují výslovně (revalidatePath = cesty, revalidateTag = sdílená data).
- **Dohled nezávislý na běhu:** varianta kontroly **z Vercelu** (cron kontrolující přítomnost záznamu běhu v DB) – jiný profil závislostí než GitHub scheduler; workflow na stejném scheduleru by nesdílelo jen část rizik. Náhradní běh respektuje zámek, aby nezdvojoval práci běžícího importu. Člověk se volá jen při přetrvávajícím mimořádném problému.
- **Rychlejší kontroly – plán spouštění:** pracovní workflow se probouzí častěji (hodina) než se stahuje; zdroj má `dalsi_kontrola_at` a vybírají se jen splatné úlohy. Zdroje s extrahovaným termínem ≤3 dnů dostanou kratší interval; ostatní zůstávají na 2× denně. Častější probuzení ≠ častější dotazy na všechny weby.
- **304 a stavy:** při 304 aktualizovat `naposledy_ok` zdroje, ale **nepřepisovat datum publikace článků**. **Změna verze pravidel zařadí uložené aktivní položky k přepočtu i bez změny obsahu feedu** – opravená klasifikace nesmí čekat na nový obsah školy (N8). Zapisovač proto porovnává otisk obsahu **i verzi pravidel** (`zmenaProtiUlozene` v `scripts/skolni-novinky-zapis.mjs`) a rozlišuje `zmenena` (článek přepsala škola) od `prepocitana` (text tentýž, změnilo se, co z něj vyvozujeme). Do `sklizen_beh.polozek_zmenenych` jdou jen změny obsahu, přepočty jen do výpisu běhu, aby přepnutí verze nevypadalo v přehledu jako vlna oprav ze škol. Bez tohohle porovnání by se oprava k položce dostala jen tehdy, kdyby ji škola sama přepsala – a protože feed je klouzavé okno (medián 10 položek), u většiny položek nikdy.
- **Výpadek DB – rozhodnutí fail-closed (N8):** chybějící konfigurace = blok se nerenderuje; výpadek po nasazení = blok se také nerenderuje (bezpečně omezené zobrazení). Perzistentní snapshot mimo DB by vyžadoval pravidla atomické obnovy a zákaz znovuzveřejnění skrytých položek – dokud není definován a ověřen, neslibovat současně dostupnost posledních dat a okamžité vypnutí. Stáří poslední úspěšné kontroly se zobrazuje u dat za normálního provozu.
- **Metrika autonomie:** počet položek čekajících na člověka – cílová hodnota pro běžný provoz je **nula**.

### 3.7a Přehled v administraci (`/admin/skolni-novinky`, 20. 9. 2026)

Neveřejná stránka, která odpovídá na jedinou otázku: **co jsme ze zdrojů vyčetli a co jsme z toho odvodili.** Veřejný blok na stránce školy ukazuje schválně jen výsledek – rodič nemá číst, co si systém o zprávě myslí. Administrace potřebuje pravý opak, včetně položek, které se nikde nezobrazují, a včetně důvodu, proč se nezobrazují. Přístup je stejný jako u zbytku administrace: bez platného `admin_token` vrací 404, `robots: noindex`.

Stránka ukazuje souhrn (zdroje, uložené a platné položky, poslední sklizeň), tři rozpady (publikační rozhodnutí, třída zprávy, stav sdělení), posledních deset běhů sklízeče, zdroje, které neodpovídají, zapnuté přepínače a seznam položek. U položky je vidět titulek s odkazem, škola, datum vydání a **co jsme vydedukovali**: třídy, jistota, stav sdělení, termíny v roli akce, publikační rozhodnutí, způsobilost pro e-mail, počet verzí obsahu, konec platnosti, verze pravidel a slovní důvod rozhodnutí. Rozpady i štítky jsou odkazy, takže se z čísla dá projít na položky, které ho tvoří.

Dvě rozhodnutí, která stojí za zopakování:

- **Neplatné a zneplatněné položky se nevynechávají**, jen se označí. Kdyby zmizely, zakryla by administrace právě ten případ, kvůli kterému se do ní člověk dívá.
- **Zapnuté přepínače mají vlastní oddíl.** Vypnutý zdroj, skrytá položka ani vypnuté zvýrazňování třídy nejsou na položce vidět, takže bez toho výpisu nejde odpovědět na otázku „proč se tohle nezobrazuje".

**Sloupce, které stránka nepoužívá, a proč** (povinná inventura podle `docs/zdroje-dat.md`, oddíl 2.14 a oddíl 3):

| Co leží v datech | Kde | Proč to na stránce není |
|---|---|---|
| `identita` | `skola_novinka` | je to GUID zdroje, nebo normalizovaná URL – obojí je vidět v odkazu; význam má jen při ladění duplicit, a to se dělá dotazem do databáze |
| `otisk_obsahu` | `skola_novinka` | hash člověku neřekne nic; odvozený počet verzí obsahu odpovídá na tutéž otázku srozumitelně |
| `prijimaci_obdobi` | `skola_novinka` | sklízeč ho zatím nevyplňuje, je vždy prázdné; vykreslit prázdný sloupec by tvrdilo, že ho neumíme určit, místo že ho zatím neurčujeme |
| `zobrazovana_pole`, `extrahovana_tvrzeni` | `skola_novinka_verze` | úplná historie jedné položky patří na detail položky, ne do seznamu; seznam nese jen počet verzí, aby bylo poznat, že se obsah měnil |
| `etag`, `modified_since`, `naposledy_zkouseno`, `dalsi_kontrola_at` | `skola_feed` | technika podmíněného požadavku a plánu; k otázce „co jsme vydedukovali" nemluví. `zdroj` adresy feedu zobrazený je, protože rozlišuje chybu deklarované adresy od chyby odhadnuté |
| `skola_invalidace` | tabulka | fronta změn je auditní stopa pro e-maily, ne dedukce o zprávě; vlastní oddíl dostane, až poběží fáze 2 |
| `content:encoded` (plný text) | feed | nepřebíráme ho vůbec, viz `zdroje-dat.md` 2.14 – autorské dílo školy |
| `author`, `enclosure`, `media:*` | feed | nesklízí se, takže je nelze zobrazit; důvody tamtéž |

**Hlavička `User-Agent` sklízeče (rozhodnutí zadavatele 20. 9. 2026).** Do 20. 9. se sklízeč představoval jako `PrijimackyNaSkoluBot/1.0` s odkazem na stránku o projektu; pět zdrojů na to odpovídalo `HTTP 403`. Od 20. 9. se čte hlavičkou běžného prohlížeče. Chování vůči zdroji se tím nemění – pořád se stahuje jen feed, dvakrát denně, podmíněným požadavkem podle `ETag`.

**Že hlavička byla příčinou těch 403, ale doloženo není.** Původně tu stálo „ověřeno, že všech pět odmítajících zdrojů pak vrátí `200`" – jenže ověřeno to bylo ze stroje v Česku, a tam vrací `200` i **botí** hlavička (změřeno 20. 9. na všech pěti). Tím ten pokus mezi hlavičkou a adresou nerozlišuje a příčinu nedokládá. Rozlišit to umí jen běh z GitHub Actions s novou hlavičkou: zůstanou-li `403`, příčinou je odchozí adresa, ne hlavička.

### 3.8 Datová sada v registru

Nová sada (např. `skoly-weby-rss`) v `public/stav_datovych_sad.json` přes `scripts/stav-datovych-sad.py`, cyklus `prubezne`. Výstupy: `skoly_feedy.json` (git) + DB tabulky (živá data). Čtení na webu přes `src/lib/skoly-novinky.ts` (DB, krátká cache v řádu minut, ne modulová bez expirace).

## 4. E-mail rodičům – dvě fáze

**Stávající systém je globální:** jeden odběr na člověka, `naplnFrontu` posílá všem (`src/lib/novinky-odesilac.ts:89-106`), formulář nezná školu a testy segmentaci výslovně zakazují (`tests/novinky-review.test.mjs:157-186`). Per-školní zprávy = plánovaná fáze **N4 „sledování škol"** (`docs/novinky-k-prijimackam-2027.md`).

**Fáze 1 – bez změny schématu (hned):** plošná obsahová zpráva přes stávající potrubí: nová šablona v `content/novinky/sablony/` (např. spouštěč `redakcni`), např. počátkem října „Školy zveřejňují dny otevřených dveří – kde je najít na webu", v červnu „Vyhlášení 2. kola – školy už hlásí výsledky". Pozn.: tohle je **redakční kampaň mimo autonomní RSS cestu** – schválení PR se týká jednorázového kódu šablony a textu (stávající potrubí novinek), ne jednotlivých RSS položek; RSS zprávy na webu žádné schvalování nepotřebují (N6).

**Fáze 2 – sledování škol (N4, změna schématu):**
- Nová tabulka `odber_skoly(odberatel_id, redizo)` (+ generovat SQL z `novinky-schema.ts`, migrace).
- Formulář/správa odběru: volba „sledovat školu X" ze stránky školy i ze správy odběru.
- Položky s `jistota: vysoka` jdou do nové fronty `zprava_skola`; cron `/api/novinky/odeslat` je doveze: `naplnFrontu` filtruje odběratele podle vazby na REDIZO. Frekvenční strop: max 1 školní e-mail/den/odběratele (agregace přes sledované školy), jinak digest. **Výjimka stropu: opravná zpráva k chybnému termínu má přednost** – poslat opravu špatného DOD je důležitější než dodržet denní strop (oponentura §6).
- **Idempotence i opravy – vůči poslednímu doručenému stavu příjemce (N7):** klíč idempotence z položky+verze; opravná zpráva se posílá jen při změně **podstatného tvrzení** (termín, zrušení), ne při každé změně otisku. Rozhodující není globální historie verzí, ale **poslední skutečně doručené tvrzení každému příjemci**: sekvence A → B → A není duplicitní zpracování – komu odešlo B (10. 12.), musí po návratu na A (9. 12.) dostat opravu; komu B neodešlo, další A nepotřebuje. U nejisté změny dříve odeslaného termínu automaticky neutrální upozornění „škola změnila původní informaci, ověřte aktuální znění", ne tiché ponechání starého tvrzení. Při každém odeslání se znovu ověří platnost položky a aktivní odběr.
- Servisní infrastruktura (dávky, rozpočet, webhooky, RFC 8058 odhlášení) se přebírá beze změny; kouřová zkouška rozšířit o sledovanou školu.
- **Měřitelné spouštěcí kritérium** (N9, velikost vzorku opravena dle F5 čtvrté oponentury): fáze 2 se spustí na základě **jednorázového přejímacího benchmarku odděleného od vzorku pro ladění pravidel**. Benchmark hodnotí **konečné publikační rozhodnutí** (co by dostal čtenář a odběratel), ne počet vysokých jistot v mezikroku: téma, cílovou skupinu, stav sdělení, termín a způsobilost pro e-mail se uvádějí odděleně.
  - **Kolik položek:** deset kusů na třídu je vstupní kontrola, ne důkaz. Při skutečné přesnosti 90 % projde deset nezávislých případů bez chyby s pravděpodobností `0,9^10 ≈ 35 %`. Prahem je proto **≥29 položek bez chyby za třídu**, což vylučuje skutečnou přesnost pod 90 % na hladině 95 % (`0,9^29 ≈ 4,7 %`). Tvrzení „≥97 %" by potřebovalo ~99 bezchybných položek (`0,97^99 ≈ 4,9 %`) – takové tvrzení se do té doby nepoužívá.
  - **Jak se výsledek formuluje:** „přesnost na benchmarku N položek, M chyb", ne „přesnost 97 %". Pozorovaná přesnost malého vzorku a doložená provozní vlastnost jsou dvě různé věci.
  - Souhrn nesmí zakrýt slabou třídu za snadnými výsledky; frekvence zpráv se vynucuje v odesílači (strop 1/den + digest), neočekává se, že minulá četnost zaručí budoucí maximum. Třídy bez dostatečného benchmarku (dnes talentové zkoušky, náhradní termín – ve vzorku nulové zásahy) zůstávají **jen na webu**, dokud je sezóna nenaplní. Absolutní tvrzení typu „≤2 falešné karty" nahrazuje označený výsledek vzorku + automatické kontroly invariantů v provozu.
  - Benchmark je **jednorázová přejímka ve vývoji**, ne denní lidská práce v publikační cestě; všechny nejistoty v provozu končí u neutrálního odkazu, ne ve frontě na člověka.

## 5. Rizika a otevřené otázky

- **Šum v e-mailu:** proto e-mail jen pro třídy s ověřenou přesností a pilotně nejdřív bez e-mailu (jen web), klasifikaci doladit na živých datech prvního měsíce.
- **Mrtvé feedy:** nezobrazovat položky po `konec_platnosti`; zdroj nedeaktivovat podle stáří obsahu, jen podle technických chyb, a reverifikovat.
- **Cizí pořadatelé u DOD:** kontextové vylučovače; reziduum snese odkaz „více na webu školy".
- **Autorská práva:** jen titulek+datum+odkaz; perex nepřebírat.
- **WebSub:** sonda dostupnost neměřila; pokud zdroj hub nabízí, připojit jako bonus urychlující detekci – základ služby na něm nestavět.
- **Prověření překonaných rozhodnutí:** viz [samostatný přehled](prehodnoceni-rozhodnuti-rss-2027.md); body (c) a (d) níže se v něm přehodnocují.
- **K rozhodnutí zadavatele:** (a) kdy spustit e-mail fázi 2 (kritérium v oddílu 4); (b) ~~konflikty moderací~~ – vyřešeno upřesněním zadavatele: bez lidského schvalování, konflikty automaticky (viz 3.6); (c) potvrzení, že na detailu oboru novinky nebudou; (d) rozšíření mimo RSS (přijímací stránky a dokumenty škol) jako fáze 3 po pilotu.

## 6. Fáze a odhad pracnosti

| Fáze | Rozsah | Odhad |
| --- | --- | --- |
| 1. Registr feedů + sklízeč + klasifikace + DB tabulky | 2 skripty + workflow + migrace | ~1–2 dny |
| 2. Web: výrazná karta + doplňkový seznam + značka původu + revalidace | `ProfilSkoly.tsx`, nový `skoly-novinky.ts`, testy | ~1–2 dny |
| 3. Plošná e-mailová zpráva (šablona, existující potrubí) | 1 šablona + `novinky.py priprav` + PR | ~hodiny |
| 4. N4 sledování škol: schéma, formulář, fronta, kouřová zkouška | zásah do novinky-*.ts, DB migrace | ~2–3 dny |
| 5. Rozšíření mimo RSS (přijímací stránky, dokumenty) | per-site parsing, PDF | zvlášť, po měření |

Odhady 1–2 jsou za prototyp; odolný provoz (dohled, reverifikace, konflikty) přidá další dny podle naměřených výpadků (oponentura §5).

Doporučené tempo: fáze 1–2 **před hlavní sezónou DOD (říjen–leden)**, fázi 3 zkusit na vyhlášení kritérií, fázi 4 až po ověření klasifikace na živé sezóně.

### 6.1 Co je z fází 1–2 postavené (20. 9. 2026)

Zadavatel rozhodl nasadit a výsledky zjišťovat z provozu. Fáze 1 a 2 jsou hotové; e-maily (fáze 3–4) postavené nejsou a zůstávají podmíněné sezónním benchmarkem.

| Část | Soubor | Poznámka |
| --- | --- | --- |
| Pravidla a publikační rozhodnutí | `scripts/novinky_klasifikace.py` | jediný zdroj pravdy; měření, sklízeč i testy importují týž kód, takže se provoz a měření nemohou rozejít |
| Registr zdrojů | `public/skoly_feedy.json`, `scripts/build-skoly-feedy.py` | 533 škol (458 deklarovaný feed, 75 uhádnutá cesta); auditní export, ne podmínka provozu |
| Sklízeč | `scripts/sklizec-novinek.py` | stáhne podmíněným požadavkem, klasifikuje, vyrobí dávku; do databáze nesahá |
| Zápis | `scripts/skolni-novinky-zapis.mjs` | transakce po zdrojích, nová verze místo přepisu, fronta změn v téže transakci |
| Schéma | `src/lib/skolni-novinky-schema.ts` → `db/migrace/003-skolni-novinky.sql` | 6 tabulek; migrace i z nasazené aplikace přes `/api/skoly/novinky/migrace` |
| Čtení pro web | `src/lib/skolni-novinky.ts` | platnost k času dotazu, přepínače při čtení, fail-closed |
| API bloku | `src/app/api/skoly/[redizo]/novinky/route.ts` | `s-maxage=60`, chyba vrací chybový stav, ne prázdný seznam |
| Blok na stránce školy | `src/components/skola/NovinkySkoly.tsx` | klientský, mimo ISR HTML; bez dat se nevykreslí vůbec |
| Plán běhu | `.github/workflows/sklizec-novinek.yml` | 2× denně, dávka jako artefakt na 7 dní |
| Testy | `tests/test_rss_klasifikace.py` (52), `tests/skolni-novinky.test.mjs` (7), `tests/skolni-novinky-schema.test.mjs` (7) | |

**Tři rozhodnutí, která implementace udělala nad rámec návrhu:**

1. **Dělba Python/Node.** Projekt nemá v Pythonu ovladač Postgresu a přidávat ho jen kvůli sklízeči by znamenalo druhou cestu k databázi. Sklízeč proto vyrobí dávku a zapisuje ji Node skript. Vedlejší užitek: dávku jde uložit, prohlédnout a přehrát, aniž by se cokoli stáhlo podruhé.
2. **Fronta změn místo invalidace cest.** Blok se bere z vlastního API, ne ze staticky generované stránky, takže `revalidatePath` není co volat. Tabulka `skola_invalidace` přesto vzniká hned: je auditní stopou změn a vstupem pro e-maily, a doplnit ji zpětně by znamenalo ztratit změny, které mezitím proběhly.
3. **Platnost se počítá při čtení, ne při sklizni.** Sklízeč běží dvakrát denně; „budoucí termín při sklizni" by nechal včerejší termín viset jako pozvánku až do dalšího běhu. Filtr budoucích termínů je proto i v čtecí vrstvě a má vlastní test.

**Zapnuto 20. 9. 2026.** Migrace 003 proběhla na produkční databázi (šest tabulek, opakované spuštění je bez účinku, bez `CRON_SECRET` vrací 401), `DATABASE_URL` je tajemstvím repozitáře a první sklizeň je zapsaná. Blok na stránce školy se od té chvíle vykresluje u škol, které nějakou položku mají.

**První běh (20. 9. 2026, 09:01–09:27 UTC):** 439 z 533 zdrojů ok, 94 chyb, 3 859 položek, 6 karet s termínem dne otevřených dveří. Zápis trval 22 minut; databáze je ve Frankfurtu, kdežto běh v USA, takže každý z tisíců dotazů letí přes Atlantik.

**Zjištění prvního běhu a jeho vyvrácení druhým.** První běh z GitHub Actions selhal u 94 zdrojů (44× `ConnectionError`, 39× `ConnectTimeout`, 6× `HTTP 403`, 4× nerozparsovaný feed, 1× `ReadTimeout`), zatímco táž sklizeň ze stroje v Česku o hodinu dřív dala 528 ok a jen 5 chyb. Hypotéza zněla, že školní weby nebo jejich hosting blokují cizí adresy, a rozhodovací pravidlo bylo: **stálá** množina padajících zdrojů = blokování a řešení je sklízet z evropské adresy, **kolísavá** množina = přetížení a řešení je delší limit a opakování.

Druhý běh (10:29 UTC, táž pravidla `2026-09-20.5`) zkoušel přesně těch 94 splatných zdrojů a **83 z nich odpovědělo bez problému, opět z GitHub Actions**. Nově nespadl ani jeden. Průnik obou množin je 11 zdrojů, tedy 12 % sjednocení. Hypotéza o blokování cizích adres je tím **vyvrácená**: kdyby weby odmítaly americké adresy, odmítnou je i o 88 minut později. Šlo o přechodné selhání pod náporem prvního běhu, kdy se poprvé stahovalo všech 533 zdrojů najednou.

Zbylých 11 zdrojů selhává trvale: 5× `HTTP 403`, 4× feed, který se nepodařilo rozparsovat, 2× `ConnectTimeout`. Opakováním se nespraví. Prošel jsem je 20. 9. jeden po druhém z české sítě, botí i prohlížečovou hlavičkou, a **je to pět různých příčin, ne jedna**:

| zdroj | z české sítě | co to doopravdy je |
|---|---|---|
| gfxs.cz, sokolska.cz, spspzlin.cz, teleinformatika.eu, lsg.cz | `200`, 10 položek, **i botí hlavičkou** | selhání je vázané na prostředí běhu, ne na zdroj ani na hlavičku |
| sgagy.cz | `200` a 10 položek **po přesměrování** na `/feed/` | `ConnectTimeout` byl přechodný; v registru má být cílová adresa |
| alej.cz | `200`, ale **nula položek** | web nemá jediný WordPress post – aktuality jsou stránky. RSS tuhle školu nepokryje nikdy |
| isste.cz | `200`, ale titulek kanálu je „Komentáře: ISŠTE Sokolov" | v registru je **feed komentářů**, který tenhle oddíl sám vylučuje |
| bisgymbb.cz | `200`, ale před `<?xml` je HTML `<!-- THEME DEBUG -->` | Drupal s puštěným laděním šablon; parser to právem odmítne |
| nosch.cz, ssgh.cz | `200` a HTML „Making sure you're not a bot!" | proof-of-work brána (Anubis). Provozovatel automatický přístup odmítá – respektuje se, zdroj se vyřadí |

**Rozlišovací pokus k pěti `403` (zapsáno 20. 9. ve 13:40 UTC, tedy před měřicím během ve 14:10).** Dosud padly dvě domněnky: z české sítě vrací `200` i **botí** hlavička, takže hlavička to nebyla, a čtyři z těch pěti zdrojů vrátily `200` s obsahem i z **cizí datacentrové adresy** (infrastruktura Anthropicu, USA), takže to není ani „cizí adresa" obecně. Zbývá něco, co má jen běh z GitHub Actions – nejpravděpodobněji blokování rozsahů Azure, které čeští hosteři nasazují proti scraperům.

Pravidlo pro výklad běhu ve 14:10, ať se nedá vyložit zpětně:

- **zůstanou-li `403`** → příčinou je odchozí adresa GitHub Actions. Řešením není další hlavička, ale sklízet odjinud (vlastní runner nebo malý server, ideálně v Česku); *(pozn.: „adresa GitHub Actions“ se pozdějším měřením ukázala jako příliš úzká – viz upřesnění níže)*
- **vrátí-li `200`** → hlavička hrála roli **jen v kombinaci** s tou adresou: na datacentrový provoz mají ty weby přísnější pravidlo než na běžného návštěvníka.

**Výsledek (běh 20. 9. 15:25 UTC, hlavička prohlížeče, pravidla 2026-09-20.6): `403` zůstaly.** Splatných bylo 13 zdrojů, z toho 11 selhalo – týchž jedenáct. Podle zapsaného pravidla je tedy příčinou **odchozí adresa GitHub Actions**. Dvě věci to potvrzují nad rámec pravidla: běh zkoušel 13 zdrojů, ne 533, takže o přetížení nešlo; a `teleinformatika.eu`, který z české sítě posílá 48 kB platného RSS s deseti položkami, hlásí z Actions „feed se nepodařilo rozparsovat" – dostává blokační **stránku**, ne feed. Táž příčina, jiný symptom.

Rozsah je tím větší, než vypadal: z jedenácti zdrojů je **osm** vada prostředí (5× `403`, 1× blokační stránka místo feedu, 2× `ConnectTimeout` u zdrojů, které odsud odpovídají do vteřiny). Vlastní vadu mají jen tři: `nosch.cz` a `ssgh.cz` (proof-of-work brána, staví ji na každého) a `bisgymbb.cz` (ladicí výpis Drupalu). `alej.cz` a `isste.cz` mají obojí – z Actions `403`, z české sítě prázdný feed a feed komentářů.

**Důsledek: sklízet z GitHub Actions nejde.** Nejde o hlavičku ani o chování sklízeče, takže se to nespraví v kódu. Potřebuje to běh z jiné sítě.

**Upřesnění po měření z Railway (20. 9. 2026, Amsterdam, AS400940, hlavička prohlížeče).** Závěr „příčinou je odchozí adresa GitHub Actions“ byl **příliš úzký**. Z Railway odpovídají `403` čtyři z těch pěti zdrojů (`sokolska.cz`, `spspzlin.cz`, `alej.cz`, `isste.cz`), ačkoli z české sítě i z datacentrové adresy v USA vracejí `200`. Blokuje se tedy víc datacentrových rozsahů než jen ty, které má GitHub Actions – vypadá to na reputační seznam, ne na jedno pravidlo proti jednomu poskytovateli. Přesná formulace: **příčinou je odchozí adresa a spolehlivě to spraví jen adresa v české síti**; cizí datacentrum pomůže jen částečně.

Částečně ovšem pomůže měřitelně. Z jedenácti zdrojů Railway spraví tři: `gfxs.cz`, `lsg.cz` a `teleinformatika.eu` odtamtud vracejí platné RSS. Zbývají čtyři `403`, tři vlastní vady zdroje (`nosch.cz`, `ssgh.cz`, `bisgymbb.cz`) a `sgagy.cz` s vypršeným limitem.

| kde běží | vzorek 40 náhodných zdrojů | z jedenácti trvale padajících |
|---|---|---|
| tento stroj (česká síť) | 33 ok / 40 | spraví všechny až na tři vlastní vady |
| Railway (Amsterdam) | **36 ok / 40** | spraví 3, zbývají 4× `403` |
| GitHub Actions | první běh 439 ok / 533 | spraví 0 |

Vzorek je malý a obě čísla kolísají s okamžitým stavem sítě; slouží k tomu, aby se vyloučilo, že Railway je **horší** než česká síť. Rozdíl v řádu jednotek procent se tím nevyloučil.

**Plánované běhy 20. 9. nevyšly ani jednou.** Cron `04:10` i `14:10` UTC byl bez náhrady vynechán, ačkoli workflow leželo na `main` od 08:50 UTC; oba dnešní běhy jsou ruční. Je to druhý, nezávislý důvod přesunout sklizeň jinam: i kdyby adresa procházela, plán, který neběží, nesklidí nic. Dohled z oddílu 3.8 (cron z Vercelu kontrolující záznam běhu) tím dostal první doložený případ, na který měl zabrat.

Co z toho plyne: „zdroj neodpovídá" je sběrná kategorie, která míchá **vadu prostředí** (odchozí adresa), **vadu registru** (špatná adresa feedu), **vadu zdroje** (ladicí výpis před XML) a **vědomé odmítnutí** (bot wall). Bez rozlišení se první tři dají spravit a nespraví se, protože se schovají za čtvrtou.

**Kde sklizeň běží od 20. 9. 2026: Railway, projekt `stredniskoly-sklizec`, služba `sklizec`.** Obraz staví `Dockerfile.sklizec` (Node 22 + Python 3 s `requests`), běh řídí `scripts/sklizec-beh.sh`, build konfiguruje `railway.json`.

**Plán ale drží nastavení služby, ne `railway.json`.** Referenční dokumentace Railway `deploy.cronSchedule` v konfiguračním souboru **uvádí** (vedle `restartPolicyType`, `healthcheckPath` a dalších), takže by to fungovat mělo. U nás se ale neprojevilo: po nasazení, které z téhož souboru prokazatelně převzalo `build.dockerfilePath` (v build logu `load build definition from Dockerfile.sklizec`), zůstalo `nextCronRunAt` **`null`** a `cronSchedule` na službě taky – sklizeň by proběhla jednou při nasazení a víckrát nikdy. Totéž potkalo `deploy.restartPolicyType`, služba zůstala na výchozím `ON_FAILURE`. **Proč, nevíme** – nezkoumalo se to, protože bylo důležitější, aby ranní běh vyšel. Blok `deploy` proto z `railway.json` odešel, aby v repozitáři nestálo nastavení, které se nepotvrdilo, a plán se nastavuje takto:

```
mutation($sid: String!, $eid: String!) {
  serviceInstanceUpdate(serviceId: $sid, environmentId: $eid, input: {
    cronSchedule: "10 4,14 * * *", restartPolicyType: NEVER, ipv6EgressEnabled: true
  })
}
```

Volá se na `https://backboard.railway.com/graphql/v2` s `Authorization: Bearer <token z ~/.railway/config.json>` a **s hlavičkou `User-Agent`** – bez ní vrací Cloudflare `403 error code 1010`. `serviceId` a `environmentId` dá `railway status --json`. Totéž jde naklikat v nastavení služby. Ověření je `nextCronRunAt`: je-li `null`, plán neběží, ať v repozitáři stojí cokoli. Pozor i na to, že `serviceManifest` v `railway status --json` ukazuje jen hodnoty nastavené v dashboardu, ne výsledek po započtení `railway.json` – hlásil `builder: RAILPACK, dockerfilePath: null` u nasazení, které Dockerfile prokazatelně použilo.

**Otevřené k doměření:** jestli `deploy.cronSchedule` v `railway.json` funguje a jen se u nás nechytil kvůli pořadí (služba vznikla dřív než soubor), nebo nefunguje vůbec. Pokus je snadný – vrátit blok `deploy`, smazat plán na službě, nasadit a podívat se na `nextCronRunAt` – ale zaplatí se za něj vynechaným během, takže se dělá, až nebude co měřit.

**GitHub workflow je od 20. 9. bez plánu**, jen jako ruční záloha; podmínka z review PR #133 (zrušit plán až po doloženém úspěšném běhu na Railway) byla splněna během 20. 9. v 18:29 UTC. Dva plány naráz by navíc škodily měření: obě místa mířila na 04:10 UTC a to, které doběhne první, posune `dalsi_kontrola_at`, takže by nešlo říct, ze které sítě výsledek pochází. Oba běhy zapisují do `sklizen_beh`, takže se dvojí sklizeň pozná.

**Celkový limit běhu: 45 minut** (`SKLIZEC_LIMIT` v `scripts/sklizec-beh.sh`). `requests.get(timeout=…)` hlídá jen mezeru mezi pakety, ne celkovou dobu: server, který odpovídá po malých kouscích, udrží worker libovolně dlouho a `as_completed()` pak čeká na všechny zdroje, takže nedojde ani k zápisu dávky. Railway zaseknutou úlohu sám neukončí a další termíny přeskakuje, dokud běh trvá — limit si proto hlídá skript sám tím, že se hned na začátku znovu spustí pod `timeout`. Ten pouští běh ve vlastní procesní skupině, takže TERM i následný KILL dostanou i `python3` a `node`. Měřená plná sklizeň trvá 26 minut, 45 je rezerva; vypršení vrací 124, tedy chybu, ne sklizeň s nulou položek. Mimo Linux (macOS bez coreutils) `timeout` neexistuje — tam běh pokračuje bez hlídače a napíše to na chybový výstup, aby se skript při vývoji nerozbil návratovým kódem 127.

**Proč ne z Vercelu, kde už web běží (zamítnuto 20. 9. 2026).** Tři důvody, dva z nich změřené:

1. **Délka běhu.** Plná sklizeň všech 533 zdrojů trvala 1 584 s (26 min); běhy jen nad splatnými zdroji 349 s a 118 s. Funkce na Vercelu končí nejpozději po 800 s. Plná sklizeň nastává po každé změně verze pravidel a po každém rozšíření registru, takže to není okrajový případ.
2. **Dvě runtime v jednom běhu.** Sklizeň je Python, zápis Node a dávka mezi nimi teče jako soubor v `/tmp`. Na Vercelu by to byly dvě funkce a dávka by musela cestovat přes úložiště – přepis návrhu, ne konfigurace.
3. **Odchozí adresa nezměřena.** Vercel Sandbox, který by běh délkou unesl, účet nemá povolený (`403 forbidden` na `create`), takže se nedalo ověřit, jestli ty čtyři weby pouštějí Vercel. Zamítnutí stojí na bodech 1 a 2; tenhle bod se jen neví.

Zvažováno a zavrženo i: **vlastní runner na stroji zadavatele** (spravil by všech osm vad prostředí, ale plán závislý na zapnutém počítači je horší než chybějící čtyři zdroje z 533) a **malý VPS v Česku** (spravil by je také; drží se v záloze pro případ, že těch `403` bude přibývat).

**Blokuje adresa, ne požadavek – doloženo (20. 9. 2026).** Z Railway vrací `403` i **titulní stránka** `https://www.sokolska.cz/`, nejen feed, a to s plnou sadou hlaviček prohlížeče (`Accept-Language: cs-CZ`, `Sec-Fetch-*`, `Sec-CH-UA`, `Upgrade-Insecure-Requests`). Není tedy co doplnit do požadavku. Tím padá i zbytek podezření na hlavičku.

IPv6 jako obchvat reputačního seznamu (ty bývají vedené jen pro IPv4) je **otevřená možnost**. První pokus z Railway skončil `Network is unreachable` a bylo z toho ukvapeně zapsáno, že tamní kontejnery IPv6 nemají. Ve skutečnosti je to **volba služby** `ipv6EgressEnabled`, standardně vypnutá. Zapnuta 20. 9. 2026 na službě `sklizec`. `sokolska.cz`, `spspzlin.cz`, `isste.cz` i `alej.cz` mají `AAAA` záznam, takže odpověď dá první běh, ve kterém budou splatné – měly ji na 21. 9. ve 03:27 UTC, tedy těsně před cronem ve 04:10. Výsledek se sem doplní; do té doby platí, že je to **nezměřené**.

**Kolik na tom vlastně visí.** Z jedenácti zdrojů po přesunu na Railway zbývá:

| zdroj | stav na Railway | spraví česká adresa? |
|---|---|---|
| `gfxs.cz`, `lsg.cz`, `teleinformatika.eu` | **spraveno**, platné RSS | – |
| `sokolska.cz`, `spspzlin.cz` | `403` | **ano** |
| `isste.cz` | `403`; v registru je navíc feed komentářů | **ano**, po opravě registru |
| `alej.cz` | `403`; z české sítě `200`, ale **nula položek** | ne – web nemá jediný WordPress post |
| `bisgymbb.cz` | ladicí výpis Drupalu před `<?xml` | ne – spraví se tolerancí v parseru, odkudkoli |
| `sgagy.cz` | vypršel limit; v registru špatná adresa | ne – spraví se registrem, odkudkoli |
| `nosch.cz`, `ssgh.cz` | proof-of-work brána (Anubis) | ne – vědomé odmítnutí, respektuje se |

Adresa v české síti tedy koupí **tři školy z 533** (0,6 %). Parser a registr koupí další dvě, zadarmo a odkudkoli.

**Zvažované služby a proč se nepoužijí (20. 9. 2026).**

| varianta | plán běhu | délka běhu | odchozí adresa | závěr |
|---|---|---|---|---|
| **Railway** (použito) | cron v nastavení služby | bez stropu | Amsterdam, AS400940 | spraví 3 z 11, plán běží |
| **e2b.dev** | **žádný** – sandbox se musí odněkud zavolat | dlouhý běh zvládne | E2B Cloud stojí na AWS/GCP; pevná odchozí adresa vyžaduje vlastní bránu | zavrženo |
| **rock8.cloud** | ve veřejné dokumentaci není; {Z}workflows{K} jsou reakce na události, ne plán | Docker, tedy bez stropu | **německá** datacentra (firma je z Ostravy, data nejsou) | zavrženo |
| **VPS v Česku** | systemd timer | bez stropu | **česká** | drží se v záloze |
| stroj zadavatele | cron | bez stropu | česká | zavrženo – plán závislý na zapnutém počítači |

`e2b.dev` neřeší ani jednu ze dvou věcí, kvůli kterým se stěhuje: nemá plánovač (ten je přesně to, co v Actions selhalo) a jeho adresa je z AWS/GCP, tedy z téže třídy, kterou ty weby odmítají. Přidal by třetí součástku mezi plán a běh.

`rock8.cloud` je česká firma, ale data hostuje v Německu – z hlediska těch reputačních seznamů je německé datacentrum stejně cizí jako nizozemské a rozsahy německých hosterů na nich bývají spíš častěji. Plánovač veřejně nedokládá. Nic z toho se nedá ověřit bez placeného účtu, a ověřovat je potřeba právě ta jediná věc, kterou Railway neumí.

**Pravidlo pro návrat k otázce:** jestli počet zdrojů odmítajících `403` z Railway přeroste **deset**, vyplatí se VPS v Česku. Do té doby ne – tři školy z 533 nestojí za další stroj k údržbě.

**Opatření z toho plynoucí (v sklízeči od 20. 9. 2026):** po hlavním průchodu následuje **druhý pokus o zdroje, které selhaly na úrovni sítě** – souběžnost 4 místo 12 a limit 45 s místo 20 s. Opakují se jen síťové chyby (`SITOVE_CHYBY`); `HTTP 403` a vadný feed se neopakují, protože podruhé dopadnou stejně a jen by zdržely běh. Dávka nese `zdroju_opakovano` a `zdroju_spraveno_opakovanim`, aby bylo vidět, jestli se opakování vyplácí.

## 7. Provozní cíle a měření (přejato z oponentur §6, cíl přepracován)

Počáteční cíl: **95 % nových položek ze sledovaných funkčních feedů na webu do 24 hodin od publikace.** Pozn.: „do 24 hodin" není „tentýž den" – večerní položka se může ukázat následující večer; proto se měří zpoždění přesně (čas publikace → detekce → dostupnost na portálu) a opožděně vložené/zpětně datované články se označí samostatně, ne aby se tiše vynechaly z metriky.

**Časově citlivé opravy:** druhá oponentura (§5.1) přinesla platný protipříklad k mému zamítnutí rychlosti – oprava místa/času DOD zveřejněná ráno v den konání. Přijímám jako důvod **podmíněného** zrychlení, ne plošného: zdroje se známou blížkou událostí (extrahovaný termín ≤3 dny) kontrolovat častěji; u položek klasifikovaných jako oprava/zrušení termínu zpracovat okamžitě. Priorita se určuje z dřívějších údajů, ne až z nové urgentní položky (tu bychom jinak detekovali pozdě). Plošné zrychlení všech 533 zdrojů na 15–30 minut nadále zamítám: 1 066 → 25 584 požadavků denně bez prokázaného přínosu; sdílené feedy stahovat jednou a zátěž řídit po hostitelích.

Měřit odděleně: zpoždění publikace, pokrytí zdrojů, **konečné publikační rozhodnutí** (kolik termínových karet, karet bez termínu a neutrálních odkazů vzniklo a proč – ne jen počet vysokých jistot), **úplnost důležitých informací** (ručně označený referenční vzorek proti přijímacím stránkám škol – jednorázově připravený, ne pravidelná lidská práce), přesnost interpretace (klasifikace, termíny, přijímací období), zachycení oprav, provozní stav (stáří poslední kontroly, vynechané běhy, fronta zdrojů k opravě), počet položek čekajících na člověka (cíl 0).

## 8. Vypořádání první oponentury (19. 9. 2026) – historický záznam

*Pozn.: tabulka dokumentuje vypořádání první oponentury ve verzi 1.1. Některá rozhodnutí (precedence portálu, moderace konfliktů) byla později přepsána – aktuální pravidla jsou v 3.6, vypořádání druhé a třetí oponentury v oddílech 10 a 11.*

| Bod | Rozhodnutí | Argument |
| --- | --- | --- |
| 3.1 Ruční PR jako překážka | **přijato** | Schvalování položek nemá horní mez; pojistku proti šumu nahradíme jinak: automaticky jen titulek+odkaz (nízké riziko), moderace jen u konfliktů a e-mailů. PR zůstává pro pravidla a registr. |
| 3.2 ISR nestáhne nový JSON | **přijato – chyba v 1.0** | `skoly-web.ts` drží soubor v modulové proměnné bez expirace a git JSON se mění jen nasazením. Řešení: živá data v Postgresu + `revalidatePath` po změně. |
| 3.3 Pokrytí/validita sondy | **přijato a opraveno** | Sonda opravena (relativní odkazy vůči finální URL; fallback i u neplatných deklarací) a přesondováno. „Platný" zůstává sniffing, ale použitelnost feedů dokládá i parsovací měření (80/80 po tolerantní předúpravě). Základ = školy katalogu – to je pro funkci správný vesmír. |
| 3.4 „Klíčová slova stačí" | **částečně přijato** | Jako výchozí metoda stačí; ale 95 % u DOD je odhad na témže vzorku, ze kterého pravidla vznikla, a úplnost je nezměřená. Vypořádáno: měřicí skripty a označený vzorek jsou nově v repozitáři, úplnost se bude měřit průběžně. |
| 3.5 Expirace 60 dní | **přijato – chyba v 1.0** | Článek ze září o prosincovém DOD by zmizel před akcí. Platnost per třída, viz 3.4. |
| 3.6 Odhad data | **přijato** | Jen data s explicitním rokem nebo z pozvánek; nejistý termín = titulek+odkaz bez data na kartě. |
| 3.7 Dedup neřeší opravy | **přijato** | Otisk obsahu + verze; změna termínu = aktualizace; zmizení z feedu ≠ zrušení; e-mail idempotence per verze. |
| 3.8 Starý obsah ≠ mrtvý zdroj | **přijato** | Dostupnost a stáří obsahu odděleně; 429/backoff; reverifikace; poslední dobrá data + stáří kontroly. |
| 3.9 Plánovač | **částečně přijato** | Actions pro pilot + dohled nad vynechanými běhy; ale oponentův důraz na frekvenci (15–30 min ve špičce) **zamítám** – viz níže. |
| 3.10 Objem z kluzného okna | **přijato** | Odhad frekvence je spodní mez; ověřit průběžným sběrem před e-maily. |
| 3.11 Konflikty a dohledatelnost | **přijato** | Precedence portál > RSS, konflikt moderaci, „další termín" vs „oprava" podle otisku; přijímací karta výrazná (rozbalovací je jen běžný život školy – v 1.0 to platilo též). |

## 9. Hodnocení oponentního návrhu

Co přejímám do 1.1 jako skutečná zlepšení: oddělení živých dat z gitu, platnost podle události, verzování a opravy položek, oddělení dostupnosti zdroje od stáří obsahu, rámec provozního měření (úplnost proti přijímacím stránkám, zachycení oprav), konflikty portál×RSS.

Kde oponentní návrh **zamítám nebo zeslabuji**:

- **Cíl „95 % do 90 minut" a polling 15–30 min ve špičce:** over-engineering pro plošné použití. Přijímací novinky mají horizont relevance dní až týdny; druhá oponentura sama cíl stáhla („nebyl dostatečně doložen jako plošná nutnost") a našla jediný platný scénář – opravu v den konání DOD – který řeší podmíněné zrychlení v oddílu 7, ne plošný polling. Zátěž je navíc naměřitelná: 533 × 2 = 1 066 požadavků denně dnes, po půlhodině 25 584 (aritmetiku opravuji dle N6 třetí oponentury).
- **„Externí verzované JSON úložiště" jako alternativa k DB:** slabší než existující Postgres portálu; druhá oponentura souhlasí (§5.2).
- **Rozšíření mimo RSS (přijímací stránky, dokumenty):** správný směr, fáze 3 po pilotu podle naměřených mezer v úplnosti (jednorázový referenční vzorek přijímacích stránek, ne plošný HTML/PDF parser jako podmínka startu – v tom je po druhé oponentuře shoda, §5.3).
- **WebSub:** rozšíření mezi českými školami **neznáme** (ani jedna strana ho neměřila); nechat jako opportunistický doplněk – nestavět na něm, ale ani neodmítat pro údajnou malou četnost (opraveno dle §5.4).
- **„Čekání na ruční sloučení nemá zaručenou délku"** – pravda, živá data jsou mimo git. Automatické publikování je po upřesnění zadavatele bez schvalovací fronty; pojistkou je provozní přepínač v DB s okamžitým účinkem (3.7), ne PR.

## 10. Vypořádání druhé oponentury (19. 9. 2026)

| Bod | Rozhodnutí | Argument a dokaz |
| --- | --- | --- |
| R1 Reprodukovatelnost | **přijato – mou chybu** | Oponent měl pravdu ve všech třech technických bodech: `stahni` vrací trojici, ale měřicí skripty rozbalovaly dvojici; tolerantní parser měl `SyntaxError` (moje chyba při přesunu sed-em); vzorek nedokládal ruční reference. Vypořádáno činem: skripty opraveny, tolerantní parser integrován (včetně holého `&`), výběr zmrazen v manifestu, reference rekonstruovány pro všech 71 zásahů (s důvody), jeden offline příkaz reprodukuje tabulku: 624 položek, 71 zásahů u 38 škol, téma 94 %, vysoká jistota 57/57. Syntetické případy oponentury jsou regresní testy (`tests/test_rss_klasifikace.py`, 15 testů, projdou; CI běží). |
| R2 Pravidla ≠ vysoká jistota | **přijato** | Měření teď měří skutečně navržená pravidla: téma (titulek+popis, kategorie nejsou spouštěč) odděleno od jistoty (negace → „zadna", cizí pořadatel/VŠ/ZUŠ → střední). Spouštěcí kritérium e-mailů je měřitelné (oddíl 4), ne „po měsíci". |
| R3 Platnost vs. stav události | **přijato** | 3.4: proběhlé termíny se z karty skryjí samostatně; DOD bez data = fallback titulek+odkaz; 7 dní u volných míst = limit stáří sdělení, karta nikdy netvrdí aktuální dostupnost; kolo končí svou uzávěrkou; `prijimaci_obdobi` v položce; extraktor validuje kalendář („31. 2." zahodí – test). |
| R4 Význam opravy | **přijato** | Verze ukládá zobrazovaná pole a extrahovaná tvrzení, ne jen otisk; identita = zdroj+GUID, fallback normalizovaná URL (změna titulku ≠ nová položka); bezpodmínečná přednost portálu zrušena – rozpor se zobrazí s oběma zdroji a karta se potlačí; nedá se význam opravy určit → titulek+odkaz. |
| R5 Kontrakt cache | **přijato** | 3.6: commit → revalidatePath → záznam invalidace s opakováním; žádná vlastní modulová cache, čtení přes `unstable_cache` se sdíleným tagem; ověřovací zkouška před pilotem popsaná. |
| R6 Sonda a význam čísel | **přijato a opraveno** | `dopln_fallback` teď používá finální URL po redirectech; přesondováno: 533 škol s feedem. Jmenovatele uvedeny (72 % čerstvých = vzorek 39; „zásah u školy" ≠ úplnost). Tvrzení o 429 z mé verze 1.1 **stahuji** – v uložené sondě není; 401 zůstává, ale příčina (anti-bot vs. frekvence) je nedoložená. |
| R7 Dohled a vypnutí | **přijato** | 3.7: provozní přepínač v DB (zdroj/položka/třída) s okamžitým účinkem a auditem, aktivovatelný automatickými anomáliemi; dohled nad vynechanými běhy nezávislý na běhu samotném; 304 nepřepisuje data publikace; výpadek vs. chybějící konfigurace = dva stavy; metrika „čeká na člověka = 0". |
| §5.1 Frekvence | **částečně přijato** | Plošný cíl oponent stáhl sám. Jeho protipříklad (oprava DOD v den konání) přijímám → podmíněné zrychlení zdrojů s blízkou událostí (oddíl 7). Plošný 15–30min polling zamítám dál – přínos není doložen ani po druhém kole. |
| §5.2 Postgres | shoda | — |
| §5.3 HTML/PDF | **přijímám korekci** | Tvrzení „o řád dražší" z v1.1 bylo nedoložené – stahuji; odklad zdůvodňuji měřením úplnosti (jednorázový referenční vzorek), ne odhadem ceny. |
| §5.4 WebSub | **přijímám korekci** | „Rozšíření malé" bylo nedoložené → „rozšíření neznáme". |
| §5.5 Vypnutí | **přijato** | Rozlišit vypnutí zdroje / položky / zvýrazňování třídy; sběr neutrálních titulků běží i při vypnutém zvýrazňování. |
| §5.6 Autonomie (zadavatel) | **přijato – přepisuje 1.1** | Schvalovací fronta zrušena; automatické cesty dle tabulky v 3.6. Rozpor → oba zdroje + potlačená karta, audit bez povinné moderace. Registr zdrojů se ověřuje automaticky při zařazení (vazba na známý web školy), PR je audit, ne podmínka. |

Zbývající otevřené body, které oponentura správně ponechává na implementaci: dopad nových tabulek do migračního endpointu a přístup Actions k DB s minimálními právy (§5.2), provozní popis 304/dohledu (R7) a ověření cache kontraktu na živém nasazení (R5).

## 11. Vypořádání třetí oponentury (19. 9. 2026)

| Bod | Rozhodnutí | Argument a dokaz |
| --- | --- | --- |
| N1 VOŠ v referencích | **přijato – chyba v referencích i pravidlech** | Potvrzeno v datech: 4 VOŠ články (5 párů) měly spravne_vysoka=true, KLUB MLADÝCH DIVÁKŮ spravne_tema=true (vypadl z mého ručního seznamu FP při programové regeneraci). Reference přestavěny na jednotku položka×třída s cílovou skupinou SŠ; pravidla mají VOŠ stráž (`RE_VOS` → žádná jistota); regresní testy. Nově: vysoká jistota 60/60 párů = 51 položek; VOŠ z vysoké jistoty vypadlo pravidlem, ne přeštítkováním. |
| N2 Stav sdělení | **přijato** | Nové `urci_stav` (oznameno/zmeneno/zruseno/nejiste) – „DOD se ruší" pozná stav, karta nepozve; negace rozšířeny („již nejsou"); výsledkové listiny turnajů/soutěží vyloučeny z vysledky_prijm. Testy na všechny tři syntetické případy oponenta. |
| N3 Sémantika data | **přijato** | Měsíc slovy s rokem („9. prosince 2026") se extrahuje; role registrace vs. akce (kontext do větné hranice); datum s rokem se v bez_roku neopakuje; `parse_datum` zachovává čas i pásmo ISO a neplatné ISO vrátí None místo výjimky. DOD s platným datem s rokem nově 8/11 (bylo 5/11). |
| N4 Přenositelnost do CI | **přijato** | `requests` se importuje až při stahování – testy projdou i systémovým pythonem bez requests (ověřeno); `/data/sondy/` vyjmuto z gitignore, podklady jsou součástí checkoutu po commitu; chybějící reference ukončí měření s exit 1 (dříve jen tisk CHYBA a exit 0). Nedoplněk z minulého kola (exit kód) tím padá též. |
| N5 Oprava XML | **přijato** | `_nahrad_html_entity` nedekóduje XML-platné entity (`A &lt; B &nbsp; C` se parsuje); kořen se ověřuje (HTML stránka → None, ne prázdný feed); oba případy v testech. |
| N6 Rozpory dokumentu | **přijato – redakce** | 3.1: aktivace zdroje automatická, git = audit, PR jen pro kód/pravidla; fáze 1 e-mailu označena jako redakční kampaň mimo RSS autonomii; „explicitní rok nebo pozvánka" sjednoceno na jen explicitní rok; oddíl 8 označen jako historický; doplňkový seznam nese i středně-jistotné přijímací položky (omezení interpretace ≠ skrytí zprávy); aritmetika 1 066 / 25 584 opravena. |
| N7 A → B → A | **přijato** | Opravná zpráva se rozhoduje vůči **poslednímu doručenému tvrzení příjemce**, ne globální historii verzí; u nejisté změny odeslaného termínu automatické neutrální upozornění. |
| N8 Technická rozhodnutí autonomie | **přijato** | Invalidace atomicky v téže transakci; tagy vs. cesty výslovně; dohled zvolen z Vercelu (jiný profil závislostí) + zámek náhradního běhu; rychlejší kontroly = častější probuzení + `dalsi_kontrola_at` (jen splatné úlohy); změna pravidel přepočítá uložené položky i při 304; výpadek DB = fail-closed bez slibování snapshotu, dokud nejsou definována jeho pravidla. |
| N9 Spouštěcí kritérium e-mailů | **přijato** | Benchmark oddělený od ladění, ≥10 položek a ≥97 % **za každou povolenou třídu** (souhrn nesmí zakrýt slabou třídu); nedoložené třídy (talentové, náhradní) zůstávají jen na webu; frekvence se vynucuje v odesílači, absolutní tvrzení nahrazena označeným výsledkem vzorku + invarianty. |
| §2.1 jednotky počtů | **přijato** | Vysoká jistota se uvádí v párech i položkách (60 párů = 51 položek); „80/80" vysvětleno jako uložené záznamy, ne zpětné parsování. |

Závěr oponenta přejímám celý: implementovat sběr a automatické zveřejnění titulků+odkazů lze začít hned; odvozené karty po opravách výše; e-maily až po benchmarku. Bez lidské moderace – nejistota končí u neutrálního odkazu.


## 12. Vypořádání čtvrté oponentury (20. 9. 2026)

Oponentura: [verze 1.3](oponentura-skolske-novinky-rss-2027-v1.3.md). Všech šest nálezů jsem reprodukoval na uložených datech, než jsem cokoli měnil; všech šest platilo.

| Bod | Rozhodnutí | Argument a dokaz |
| --- | --- | --- |
| F1 Stav `nejiste` jen v popisu | **přijato – chyba v pravidlech** | Reprodukováno: „DOD 9. 12. 2026 se nekoná" → `oznameno`, „není zrušen" → `zruseno`, „registrace zrušena, akce proběhne" → `zruseno`. `urci_stav` nově rozhoduje **po klauzulích**: popřené zrušení („není zrušen") i zrušení s neurčitelným předmětem („registrace na DOD zrušena") vrací `nejiste`; zrušená registrace neruší akci; „nekoná se / neuskuteční se" je zrušení. Stav se drží u klauzule, takže zrušení jednoho ze tří termínů ostatní neruší **v extraktoru dat**. V konečném rozhodnutí smíšená zpráva (zrušený i náhradní termín v jednom článku) končí neutrálním odkazem – viz P2 páté oponentury. |
| F2 Prohozená role data | **přijato – chyba v pravidlech** | Reprodukováno: „9. 12. 2026 – konec registrace; 12. 12. 2026 – den otevřených dveří" vracelo akci a registraci obráceně. `_role_data` čte nově **celou klauzuli kolem data**, tedy i popisek za ním; roli `registrace` nelze zdědit z jiné klauzule; klauzule mluvící o obojím dává `neurcena` a na kartu nejde. Totéž datum na dvou místech (titulek + věta o konání) dostane silnější doloženou roli. |
| F3 Plošné vylučovače | **přijato** | Reprodukováno: „Výsledky přijímacího řízení na sportovní gymnázium" propadlo kvůli slovu „sport"; „DOD pro uchazeče SŠ a VOŠ" spadlo na `zadna` kvůli zmínce VOŠ. Vylučovač nově neplatí tam, kde je **jednoznačný přijímací kontext** (`OCHRANA_TEMA`); smíšená zpráva SŠ+VOŠ končí na `stredni` (neutrální odkaz), ne mimo zobrazení – potlačit ji celou by zkreslilo měření úplnosti. Samotná VOŠ zůstává `zadna`. |
| F4 Offline CLI a identita referencí | **přijato – obojí** | `import requests` zmizel z bloku `__main__` a je až v `stahni_vzorek` (online cesta); `python3 -S scripts/rss-klasifikace-mereni.py --offline` teď proběhne bez instalovaných balíčků. Reference mají **identitu REDIZO + odkaz + třída**, titulek je jen popis; skript ukončí běh, když referenční klíč chybí nebo se opakuje. Duplicitní klíč `600019675 / Přijímací řízení VOŠZ` se rozpadl na dva různé články. |
| F5 60/60 neověřuje kartu, 10/10 nedokládá 97 % | **přijato – obojí** | Vzniklo **jediné publikační rozhodnutí** `rozhodni_publikaci` (3.5) a měří se ono: karta s termínem 3×, karta bez termínu 47×, neutrální odkaz 26× s rozpadem podle důvodu. Třídy s pozvánkou mají ruční referenci konečného zobrazení: **zobrazení 10/11, termíny 10/11, stav 11/11**; skript navíc tiskne, co referenci nemá. Spouštěcí kritérium e-mailů opraveno z „≥10 a ≥97 %" na **≥29 bezchybných položek za třídu** (vylučuje přesnost pod 90 % na hladině 95 %), s poznámkou, že „≥97 %" by vyžadovalo ~99 položek. Souhlasím i s rozlišením: pozorovaná přesnost malého vzorku ≠ doložená provozní vlastnost. |
| F6 Skrytí při výpadku DB | **přijato – kontrakt doplněn** | Námitka platí: `revalidatePath` ani výjimka při čtení DB neovlivní už obslouženou cachovanou stránku a ISR při výjimce během revalidace dál servíruje poslední úspěšný výsledek. Blok novinek proto **není součástí staticky generovaného HTML** – stránka si ho bere z `/api/skoly/[redizo]/novinky` s `s-maxage=60, stale-while-revalidate=0`. Kontrakt je výslovný: maximální stáří 60 s, přepínač se projeví do 60 s, chyba čtení DB vrací chybový stav (ne prázdný seznam) a blok se nezobrazí. Přejímací zkouška posloupnosti je v 3.6. |
| Rozpory v aktivním textu | **přijato – redakce** | 3.3 už neslibuje „poslední dobrá data" při výpadku DB (fail-closed jako v 3.7), 3.2 rozlišuje výpadek **zdroje** od výpadku **databáze**; 3.6 má pořadí invalidace shodné s 3.7 (záznam v téže transakci); oddíl 7 má aritmetiku 1 066 / 25 584. Překonané věty jsou přepsány, ne doplněny o protichůdný odstavec. |

### Co se při opravách našlo navíc

Tři věci, které oponentura nezmínila a vyšly najevo až při opravách – uvádím je, protože mění čísla:

1. **Falešné zrušení z „poučení o odvolání".** První verze opravy F1 přidala do vzorů zrušení kmen „odvolán". Na vzorku to okamžitě zrušilo skutečný článek s výsledky přijímacího řízení (600024016), který obsahuje povinné *poučení o odvolání*. Vzor je odstraněn a případ je regresním testem. Rozšiřování seznamu zrušovacích slov má vlastní riziko falešně kladných nálezů – to je druhý důvod, proč rozhoduje klauzule, ne výskyt slova.
2. **Pevné mezery skrývaly zásahy.** Titulky a popisy nesly nerozdělitelné mezery a číselné entity (`&#160;`, `&#46;`), které dělaly falešné hranice vět a lepily slova („2.kolo"). Po normalizaci textu přibyl **1 nově zasažený článek a 3 páry třída×položka** (76 zásahů místo 75, 109 párů místo 106) – tedy zlepšení úplnosti, ne přeštítkování. Nové zásahy mají ruční referenci.
3. **Přísnější role data snížila počet termínů.** DOD s termínem v roli akce je nyní 6 z 11 (dříve 8 z 11 při volnějším pravidle). Klesl doložený záchyt, ne správnost – dvě data ztratila roli, protože jejich klauzule konání nedokládá.

### Co zůstává otevřené a kdy se to uzavře

- **Úplnost** je dál neměřená. Měření konečného rozhodnutí ji nenahrazuje: jediný rozdíl proti ruční referenci u tříd s pozvánkou je *přehlédnutá* pozvánka („Den otevřených dveří 2026 – přijďte se podívat"), kterou pravidlo pustilo jen na střední jistotu, protože v textu nepadlo slovo o uchazečích. Uzavře se jednorázovým ručně označeným vzorkem proti přijímacím stránkám škol (oddíl 7), ne dalším laděním pravidel.
- **Sezónní platnost.** Vzorek je z 19. 9. 2026 a DOD sezóna začíná; 60/60 i 10/11 jsou čísla z období, ve kterém pravidla vznikla. Přejímací benchmark podle oddílu 4 je oddělený vzorek z jiného období.
- **Kontrakt cache** je zatím popsaný, ne ověřený – ověřuje ho přejímací zkouška v 3.6 na produkčním nasazení, ne v `next dev`.

Závěr oponenta přejímám: autonomní sběr a neutrální titulky s odkazy lze začít implementovat; termínové karty až s testy celého publikačního rozhodnutí (hotovo), e-maily až po odděleném benchmarku s doloženou velikostí vzorku. Lidská moderace nepřibývá v žádném z těchto kroků.

## 13. Vypořádání páté oponentury (20. 9. 2026)

Oponentura: [verze 1.4](oponentura-skolske-novinky-rss-2027-v1.4.md). **Zadavatel mezitím rozhodl, že se už nic neověřuje a jde se do provozu:** „nechceme především už nic ohledně RSS ověřovat, chceme to zprovoznit a za provozu zjistit, jaké jsou z toho výsledky." Body, které žádaly další měření, proto vypořádávám jinak než body, které popisují **vadu v tom, co by karta tvrdila rodičům**. Ty jsem opravil, protože nasadit je znamená nasadit nepravdivé tvrzení.

| Bod | Rozhodnutí | Argument a dokaz |
| --- | --- | --- |
| P1 Karta bez doloženého konání a datum cizí akce | **přijato – opraveno** | Obě reprodukce jsem zopakoval a obě platily. Tři opravy: (a) nový stav klauzule `nepotvrzeno` („zatím není potvrzen", „předběžně", „bude upřesněno") → článek dostane stav `nejiste` a končí odkazem; (b) roli akce zdědí z předchozí klauzule **jen klauzule, která nenese nic než časový údaj** (`_holy_casovy_udaj`); „Soutěž začne 12. 12. 2026" má vlastní předmět, takže roli nedědí a na kartu nejde, kdežto „další termíny 7. 1. a 9. 2. 2027" nebo „ve středu 9. prosince 2026 od 14:00" mluví o téže akci a termín si udrží; (c) `nepotvrzeno` je v `STAVY_BLOKUJICI_TERMIN`. Testy: `TestVadyPateOponentury`. |
| P2 Zrušení jednoho termínu potlačí náhradní | **přijato – jako popis, ne jako oprava** | Oponent má pravdu, že text sliboval zachování platného termínu, a přitom `rozhodni_publikaci` vrátí u smíšené zprávy odkaz. Volím **dokumentovaný konzervativní odkaz**, protože alternativa je karta tvrdící jeden ze dvou protichůdných termínů. Slib v oddílu 12 (F1) je opraven a chování má vlastní test konečné funkce `test_smisena_zprava_konci_konzervativnim_odkazem`, ne jen test extraktoru. |
| P3 Konečné rozhodnutí nezná dnešek | **přijato – opraveno** | `rozhodni_publikaci(pol, publikovano, dnes)`: termín starší než den zobrazení nevytvoří pozvánku ani e-mail, vrací odkaz s důvodem „termín už proběhl". Provoz předává dnešek, měření ho drží zmrazený, aby `--offline` dávalo stejný výsledek i zítra. Druhá část námitky (`TRIDY_POVOLENE_EMAILEM` není doklad, že třída prošla benchmarkem) platí a nemění se: e-maily jsou fáze 2 a benchmark je jejich samostatná podmínka. |
| P4 `s-maxage=60` není limit stáří u čtenáře | **přijato – kontrakt zúžen** | Garance se omezuje na **nová načtení** bloku: otevřená stránka se sama neobnovuje a HTTP hlavička na to nemá vliv. Přejímací zkouška se dělá před i po hranici 60 s a chybu čtení DB odlišuje od nulového počtu novinek; chybová odpověď se necachuje. Cena klientského načítání (požadavek navíc, závislost na JS) je u bloku cizích odkazů přijatá vědomě. |
| P5 Výklad metrik | **přijato jako výklad, měření se nerozšiřuje** | 10/11 je shoda na 11 už vybraných DOD položkách včetně správných rozhodnutí termín nezobrazit, ne deset ověřených karet (ty jsou tři). „75 → 76" je jeden nově zasažený článek a tři páry třída×položka; opraveno v oddílu 11. `0,9^29` platí pro předem určený test nezávislých položek, ne pro soubor z jednoho CMS ani pro opakované ladění nad benchmarkem. **Rozšíření vzorku a druhý referenční základ proti školním stránkám zadavatel zamítl** ve prospěch provozu: úplnost se zjistí z provozu, ne z dalšího offline kola. |
| Úplnost proti školním stránkám | **odloženo rozhodnutím zadavatele** | Zůstává neměřená. Nasazení tím není podmíněno; pravidlo „nejistota končí u neutrálního odkazu" znamená, že chyba z neúplnosti je chybějící zvýraznění, ne nepravdivé tvrzení. |

**Verze pravidel 2026-09-20.6**; 52 regresních testů; měření beze změny: 76 zásahů, téma 102/109, vysoká jistota 60/60 párů, konečné zobrazení u tříd s pozvánkou 10/11 zobrazení, 10/11 termíny, 11/11 stav.

## Historie verzí

| Verze | Změna |
| --- | --- |
| 1.6 | Provozní opravy z prvních běhů: karta s termínem se vybírá z okna 30 posledních položek, ne z pěti nejnovějších; síťové chyby se v běhu jednou opakují; sklízeč se představuje hlavičkou běžného prohlížeče; datum vydání, které předbíhá sklizeň, se zahazuje; zapisovač přepočítá uloženou položku i při pouhé změně verze pravidel. Admin přehled `/admin/skolni-novinky`. Novinky rozděleny na dvě rubriky: zprávy k přijímačkám u oborů, **Ze života školy** nad patičkou; bez data vydání se píše den objevení. Rozbor jedenácti trvale nefunkčních zdrojů: pět různých příčin, a tvrzení, že za `HTTP 403` mohla botí hlavička, **zrušeno jako nedoložené**. Verze pravidel 2026-09-20.6; měření beze změny. |
| 1.7 | Naplánovaná sklizeň přesunuta z GitHub Actions na **Railway** (`Dockerfile.sklizec`, `scripts/sklizec-beh.sh`, `railway.json`), workflow zůstává bez plánu jako ruční záloha. Důvody: obě naplánovaná spuštění 20. 9. se nekonala a z Actions padá jedenáct zdrojů. Závěr, že za `403` může adresa **GitHub Actions**, upřesněn měřením z Railway: blokuje se víc datacentrových rozsahů, spolehlivě to spraví jen česká adresa; Railway spraví 3 z 11. Provoz na Vercelu zamítnut (plná sklizeň 26 min proti stropu 800 s, dvě runtime v jednom běhu), stejně jako **e2b.dev** (nemá plánovač, adresa z AWS/GCP) a **rock8.cloud** (německá datacentra, plánovač nedoložen). Doloženo, že blokuje adresa, ne požadavek: z Railway vrací `403` i titulní stránka `sokolska.cz` s plnou sadou hlaviček prohlížeče. Beze změny pravidel i ukazatelů. |
| 1.8 | Plán sklizně drží **nastavení služby Railway**, ne repozitář: `deploy.cronSchedule` v `railway.json` se u nás neprojevil, ačkoli `build.dockerfilePath` z téhož souboru zabere. Po prvním nasazení bylo `nextCronRunAt` `null`, takže by sklizeň proběhla jednou a víckrát nikdy. Blok `deploy` z `railway.json` odstraněn, plán i `restartPolicyType` nastaveny přes API služby, postup zapsán. Plán v GitHub Actions zrušen – podmínka z review PR #133 splněna doloženým během 20. 9. v 18:29 UTC. Opraveno tvrzení, že Railway nemá IPv6 egress: je to vypnutá volba služby, zapnuta; její účinek na blokované zdroje je zatím **nezměřený**. Beze změny pravidel i ukazatelů. |
| 1.11 | **Vypořádání review PR #138** (21. 9. 2026). Tři nálezy: (1) rozbor se u položky `beze_zmeny` zahazoval, ačkoli odpověď modelu už byla zaplacená — `ulozRozbor` se teď volá i v téhle větvi, takže se za tutéž odpověď neplatí každý běh znovu a věta se obnoví i u článku, jehož text se nemění; (2) počet dat předložených modelu neměl strop — po stažení stránky vyšly v mezipaměti tři položky po **35 otázkách v jediném volání**, což jde proti podmínce P6 o délce kontextu; strop je 12, nad naměřeným rozložením bez ocasu (0, 1, 2, 3, 6, 7, 8, 11); (3) věta neměla strop na počet termínů — sedm termínů přípravného kurzu dalo 145 znaků; nad čtyři se vypíší první tři a datum posledního. Přeměřeno na témže vzorku 300 feedů: **11 z 23 pozvánek (48 %), z toho 4 ze staženého článku — beze změny**, tedy strop o žádný reálný termín nepřipravil. Zkrácená věta se v běhu objevila u 600013138: „…23. 10. 2026, 24. 10. 2026 a 27. 11. 2026, další termíny do 16. 1. 2027." Navíc kvalifikováno `order by n.publikovano, n.vytvoreno` (obě tabulky mají `vytvoreno`; ověřeno dotazem, že Postgres jméno rozhodoval správně, ale spoléhat na to netřeba). Verze pravidel 2026-09-21.2, slovník ukazatelů 1.29. |
| 1.10 | **Karta zase píše termíny, ale jen doložené** (21. 9. 2026, na podnět zadavatele). Podmínka z verze 1.9 — „vrátit datum má smysl až s klasifikací po jednotlivých datech“ — je splněná: kód najde v textu data s rokem, [rozhodovací model](prehodnoceni-rozhodnuti-rss-2027.md) odpoví **datum po datu** nad jednou větou, co v článku znamená, a větu složí kód ze šablony (`slozeni_souhrnu`); model text negeneruje. Lhůty se vedou zvlášť a do věty nejdou. Nová tabulka `skola_novinka_rozbor` nese větu, termíny, syrové odpovědi a otisk textu, ze kterého vznikly. Chybí-li datum v titulku i perexu, stáhne se stránka článku (`scripts/novinky_clanek.py`, respektuje `robots.txt`, text se neukládá). Změřeno na 300 živých feedech: věta u 11 z 23 pozvánek (48 %), z toho 4 až ze staženého článku; bez stahování 30 %. Cena běhu 0,003 USD. Verze pravidel 2026-09-21.1; slovník pojmů 1.20, slovník ukazatelů 1.28. |
| 1.9 | **Karta přestala tvrdit datum akce** (rozhodnutí zadavatele 20. 9. 2026). Hodnota `karta_terminu` zrušena; karta nese štítek podle třídy („den otevřených dveří“, „přijímačky nanečisto“, „setkání s uchazeči“…), titulek a odkaz. Podnět: u školy 600005399 stálo pod nadpisem „termín oznámený školou“ osm dat, z toho tři lhůty a šest termínů MŠMT, a jeden skutečný termín JPZ chyběl. Termíny se dál čtou, ale jen pro platnost a řazení – do odpovědi API nejdou. Nové třídy `prijimacky_nanecisto`, `setkani_uchazecu` a `pripravny_kurz`; ruční reference doplněna o dva zásahy a u jednoho dne otevřených dveří bez čitelného data přepsána z `odkaz` na `karta` (shoda s referencí u tříd akcí 12/13, dřív 10/11). Verze pravidel 2026-09-20.7; slovník pojmů 1.18, slovník ukazatelů rozšířen o „důležitost zprávy z webu školy“. |
| 1.5 | Vypořádání páté oponentury: stav klauzule `nepotvrzeno`, dědění role akce jen u holého časového údaje, den zobrazení v konečném rozhodnutí (proběhlý termín nevytvoří pozvánku), smíšená zpráva jako dokumentovaný konzervativní odkaz s testem konečné funkce, kontrakt cache zúžen na nová načtení, opravený výklad metrik. Zadavatel zastavil další ověřování: úplnost se zjistí z provozu. Verze pravidel 2026-09-20.5; 52 regresních testů. |
| 1.4 | Vypořádání čtvrté oponentury: stav sdělení i role data se rozhodují po klauzulích (popřené zrušení, zrušená registrace, „nekoná se", popisek za datem), vylučovače ustupují jednoznačnému přijímacímu kontextu, smíšená zpráva SŠ+VOŠ zůstává neutrálním odkazem, jediné publikační rozhodnutí `rozhodni_publikaci` a měření konečného zobrazení proti ruční referenci, identita referencí přes odkaz, offline příkaz bez `requests`, velikost přejímacího vzorku ≥29 místo ≥10, kontrakt cache bloku novinek mimo ISR, sjednocení 3.2/3.3/3.6/3.7 a aritmetiky. Verze pravidel 2026-09-20.4; 76 zásahů, téma 102/109, vysoká jistota 60/60, 47 regresních testů. |
| 1.3 | Vypořádání třetí oponentury: reference na jednotce položka×třída s cílovou skupinou SŠ (VOŠ vyloučena z vysoké jistoty pravidlem), stav sdělení (zrušeno/změněno), role registrace vs. akce, ISO datum s časem a pásmem, parser (XML entity, HTML≠prázdný feed), přenositelnost do čistého CI (requests až při stahování, data/sondy verzována, exit 1 při chybějících referencích), sjednocení rozporných instrukcí (registr, fáze 1, explicitní rok, oddíl 8 jako historie), invalidace atomicky s transakcí, A→B→A vůči doručenému stavu příjemce, benchmark za třídu pro e-maily, oprava aritmetiky. Vysoká jistota nově 60/60 párů = 51 položek; 25 regresních testů. |
| 1.2 | Vypořádání druhé oponentury: reprodukovatelné měření (manifest, reference, offline příkaz, regresní testy), téma vs. význam sdělení, platnost podle stavu události, verze se zobrazovanými poli, rozpor bez precedence portálu, kontrakt cache, provozní přepínač v DB a dohled, autonomní provoz bez schvalovací fronty (upřesnění zadavatele), podmíněné zrychlení u blízkých událostí, korekce čísel. |
| 1.1 | Vypořádání oponentury: živá data z gitu do Postgresu + on-demand revalidace (3.1, 3.2), platnost per třída (3.5), přísnější extrakce data (3.6), verze a opravy položek (3.7), stav zdroje odděleně (3.8), precedence portál>RSS a konflikty (3.11), reprodukovatelné měření klasifikace v repu (3.4), sonda opravena a přesondována (3.3). Provozní cíl změněn z 90 minut na 24 hodin s argumentem. |
| 1.0 | Původní návrh: registr feedů, sklízeč 2× denně přes PR, dvoustupňová klasifikace, karta na stránce školy, e-mail ve dvou fázích (plošná / N4 sledování škol). |
