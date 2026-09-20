# Čtvrtá oponentura školních novinek z RSS/Atom

**Verze oponentury:** 1.3 – čtvrté kolo  
**Posuzovaný návrh:** [verze 1.3](skolske-novinky-rss-2027.md), včetně vypořádání v oddílu 11  
**Předchozí hodnocení:** [oponentura verze 1.2](oponentura-skolske-novinky-rss-2027-v1.2.md)  
**Datum:** 19. 9. 2026  
**Priorita zadavatele:** autonomní provoz; žádné povinné lidské schvalování položek.

## 1. Vlastní stanovisko

**Souhlasím se zahájením implementace autonomního sběru a zveřejňování původních titulků a odkazů. Nesouhlasím se závěrem, že po verzi 1.3 zůstává významnou nejistotou už pouze úplnost.** Zbývají reprodukovatelné chyby správnosti stavů a rolí dat, nedostatečně podložené zobecnění přesnosti a nesoulad deklarovaného chování při výpadku s cache.

Návrh již nepotřebuje další změnu základní architektury. Potřebuje dokončit ověřitelnou publikační podmínku: **přijímací karta smí vzniknout až tehdy, když je doložen nejen typ článku, ale také jeho cílová skupina, stav konkrétní události a význam konkrétního data.** Při nejistotě se autonomně zobrazí původní odkaz. Člověk není náhradou za chybějící rozhodovací pravidlo.

## 2. Co ověření potvrdilo

Spuštěné cílené kontroly:

```sh
.venv/bin/python scripts/rss-klasifikace-mereni.py --offline
python3 -S -m unittest discover -s tests -p 'test_rss_klasifikace.py'
python3 -S scripts/rss-klasifikace-mereni.py --offline
```

- První příkaz uspěl a reprodukuje **624 položek, 75 zásahů u 38 škol, 99/106 správných párů témat a 60/60 párů s vysokou jistotou, odpovídajících 51 položkám**.
- Druhý příkaz: **25/25 RSS testů prošlo**, i bez načítání instalovaných balíčků. Původní importní závislost testů je opravena.
- Třetí příkaz: **selhal s `ModuleNotFoundError: No module named 'requests'`**. Samostatný offline nástroj má stále import této knihovny v bloku `if __name__ == '__main__'`.
- Původní případy negace „již nejsou“, turnaje, neplatného data, měsíce slovem, kombinace XML entit a HTML místo feedu jsou pokryty procházejícími regresními testy. Tyto konkrétní opravy uznávám.
- Reference nyní mají třídu a opravené VOŠ štítky; VOŠ jsou navíc potlačovány pravidlem. To je skutečná oprava, nikoli pouze úprava výsledné tabulky.
- `/data/sondy/` již není ignorováno. Podklady jsou v tomto pracovním stavu dosud nesledované; formulace návrhu „součást checkoutu po commitu“ tomu odpovídá. Není to další obsahová námitka.

Zopakoval jsem také celé uváděné sady: **Python 175/175 OK, JS 217/217 OK**. První pokus Python sady v sandboxu nemohl otevřít lokální HTTP servery dvou testovacích tříd; po povoleném opakování mimo sandbox všechny testy prošly. Nešlo o chybu RSS. Tyto výsledky potvrzují autorova čísla, nikoli absenci dosud netestovaných chyb F1–F3.

Podklady: [měření a pravidla](../scripts/rss-klasifikace-mereni.py), [regresní testy](../tests/test_rss_klasifikace.py), [reference](../data/sondy/rss-klasifikace-reference.json), [zmrazený vzorek](../data/sondy/rss-klasifikace-vzorek80.json), [doplnění](../data/sondy/rss-klasifikace-vzorek80-doplneni.json).

Nové příklady níže jsou offline zkoušky skutečných funkcí, nikoli tvrzení o již nasazené chybě webu. Produkční sklízeč ani karty ještě nebyly tímto hodnocením provozně ověřeny. Skripty, návrh ani reference jsem při oponentuře neupravoval.

### Identifikace podkladů

SHA-256 při kontrole:

```text
docs/skolske-novinky-rss-2027.md
805afdca1f5bad53f8aa9835f5f75c2a63f5ca1fcd679612e8192b6c59cfd8b2

scripts/rss-klasifikace-mereni.py
d89e046ba415272e4c466d8f38e6f4daec16641c3b4d1bfd546264ee3a3b6043

data/sondy/rss-klasifikace-reference.json
49486ed1007428d741c9c6277f4da80c1708f625ab46f71f2ffffab2db4ba967
```

## 3. Vypořádání N1–N9

| Bod | Hodnocení 1.3 | Argument |
| --- | --- | --- |
| N1 Reference a VOŠ | **Konkrétní chyby opraveny; měřicí model částečně** | Třídy a cílová skupina jsou rozlišeny. Párování stále používá titulek místo identity článku; vysoká jistota neměří správnost výsledné karty. |
| N2 Stav sdělení | **Konkrétní příklady opraveny; obecná podmínka ne** | `urci_stav` existuje, ale nikdy nevrátí `nejiste`. Neznámá formulace automaticky znamená `oznameno`; viz F1. |
| N3 Data | **Kalendář a původní příklady opraveny; role částečně** | Čas a pásmo se zachovávají, měsíc slovem funguje. Obrácené pořadí popisku a data může prohodit registraci a akci; viz F2. |
| N4 Čisté prostředí | **Testy vyřešeny, offline CLI ne** | Import testu funguje bez requests, přímý offline příkaz stále ne; viz F4. |
| N5 XML | **Původní vady uzavírám** | Dodané regresní testy procházejí; další plošnou přestavbu parseru zde nežádám. |
| N6 Rozpory | **Většina vyřešena, část aktivního textu zůstala** | Vedle správného oddílu 3.7 zůstává opačné pořadí invalidace a slib posledních dat při výpadku v 3.3/3.6. |
| N7 A → B → A | **Vyřešeno v návrhu** | Rozhodnutí podle posledního doručeného stavu příjemce odpovídá požadavku; zbývá implementace a test. |
| N8 Autonomie | **Koncepčně vyřešeno, provozní účinek k ověření** | Transakční invalidace, Vercel dohled a přepočet při 304 jsou správně. Skrytí při výpadku není automatickým důsledkem ISR; viz F6. |
| N9 Benchmark | **Směr správný, důkazní síla slabá** | Samostatný vzorek po třídách je správně. Minimum deset kusů není přesvědčivým dokladem ≥97% provozní přesnosti; viz F5. |

## 4. Zbývající nálezy

### F1 — Stav `nejiste` existuje v popisu, nikoli v rozhodování

**Důležitost: před budoucími pozvánkami a opravnými e-maily.**

`urci_stav()` zkouší dva regexy a ve všech ostatních případech vrací `oznameno`. Neurčuje, ke které události se zrušení vztahuje, a neověřuje negaci samotného zrušení.

| Syntetický vstup | Skutečný výstup | Důsledek pro odvozené tvrzení |
| --- | --- | --- |
| DOD pro uchazeče 9. 12. 2026 se nekoná | `vysoka`, `oznameno` | Výslovně zrušená akce by mohla projít podmínkou budoucí pozvánky. |
| Den otevřených dveří pro uchazeče 9. 12. 2026 není zrušen | `vysoka`, `zruseno` | Systém interpretuje potvrzení akce jako její zrušení. |
| DOD pro uchazeče: registrace zrušena, akce 9. 12. 2026 proběhne | `vysoka`, `zruseno` | Zrušení registrace se vztáhne na samotnou akci. |

To nejsou pouze přehlédnuté zprávy. Jsou to chybná kladná či záporná tvrzení, takže nejistota správnosti trvá vedle úplnosti.

**Doporučení:** neodvozovat oznámení z absence známého zrušovacího slova. Pro odvozenou pozvánku vyžadovat pozitivní vazbu událost–termín–konání. Nejasný nebo rozporný kontext vrací `nejiste` a neutrální odkaz. Přidání „nekoná“ do seznamu samo další dvě chyby nevyřeší; je třeba testovat vztah negace a předmětu sdělení. Celkový stav článku také nesmí zrušit všechny jeho termíny, pokud text ruší jen jeden z několika DOD.

### F2 — Role data se stále může prohodit

**Důležitost: před kartou s konkrétním dnem akce.**

Vstup:

```text
9. 12. 2026 – konec registrace; 12. 12. 2026 – den otevřených dveří
```

Skutečný výstup:

```json
{"s_rokem":["2026-12-09"],"registrace":["2026-12-12"],"bez_roku":[]}
```

Registrace a událost jsou přesně obráceně. `_role_data()` čte pouze text před datem, takže nedokáže použít následující popisek; současně na druhé datum přenese předchozí registraci. Předchozí konkrétní příklady s popiskem před datem jsou opravené, ale obecné tvrzení „registrace se odliší od akce“ zatím neplatí.

**Doporučení:** přiřadit datum k popisku ve stejné větě či položce seznamu, používat kontext před i za datem a nedávat nejednoznačnou roli automaticky do `akce`. Neurčitou roli ponechat bez termínové karty. Pozvánky mají často tabulky a seznamy, takže je to běžná struktura vstupu, nikoli exotický požadavek.

### F3 — Celoplošné vylučovače mohou potlačit právě relevantní zprávy

**Důležitost: úplnost zvýraznění; neblokuje neutrální seznam.**

Offline zkoušky:

- `Výsledky přijímacího řízení na sportovní gymnázium` → žádná třída, `vysledky_prijm` je ve vyloučených. Slovo `sport` potlačí zprávu, přestože titulek jednoznačně říká, že jde o přijímací výsledky.
- `Den otevřených dveří pro uchazeče SŠ a VOŠ 9. 12. 2026` → `dod`, ale jistota `zadna`. Zmínka o VOŠ zablokuje také výslovně uvedenou SŠ.

Přidané stráže tedy opravují falešné zásahy, ale zároveň mohou snižovat záchyt relevantních zpráv. To podporuje potřebu měřit úplnost, nikoli automaticky hodnotit každé zpřísnění jako celkové zlepšení.

**Doporučení:** vylučovat konkrétní cizí přijímací řízení či sportovní výsledky, ne jakýkoli článek obsahující dané slovo. Jednoznačný přijímací kontext musí mít v rozhodování vlastní váhu. Pro pilot může smíšená SŠ/VOŠ zpráva zůstat jen původním odkazem, ale nelze ji při měření úplnosti označit jako obsahově nerelevantní.

### F4 — Offline CLI stále potřebuje requests; reference stále nemají stabilní identitu

**Důležitost: přenositelnost a důvěryhodnost měření.**

Dříve padal import měření už při testu. Ten je opraven. Zůstává samostatný import `requests` na konci souboru před `main()`, proto přímý offline příkaz bez balíčků selže. Přesné odlišení je podstatné: tvrzení „testy bez requests procházejí“ je pravdivé, tvrzení „offline příkaz běží bez requests“ nikoli.

**Oprava:** import i potlačení síťových varování provádět pouze v online cestě. Tato oprava nevyžaduje změnu architektury.

Reference jsou nyní po třídách, což je správně. `najdi_stitek()` ale stále páruje REDIZO + normalizovaný titulek + třídu. V datech zůstává duplicitní klíč `600019675 / Přijímací řízení VOŠZ / prijimaci_rizeni` pro dva různé články. Aktuálně stejné štítky nemusí změnit skóre; při různém významu nebo úpravě jednoho článku může první nalezený štítek zakrýt rozdíl.

**Oprava:** přidat stabilní URL/identifikátor položky a verzi obsahu do referenčního klíče, kontrolovat jeho jedinečnost. Název není identita článku ani po přidání třídy.

### F5 — 60/60 neověřuje výslednou kartu a 10/10 nedokládá 97% provozní přesnost

**Důležitost: interpretace výsledků a spuštění e-mailů.**

Výpočet `ohodnot()` porovnává referenci s vysokou jistotou třídy. Neporovnává správnost `stav`, rolí dat ani skutečné publikační rozhodnutí. Chyby F1 a F2 proto současné skóre nemohou zhoršit, i kdyby vytvářely chybnou kartu.

Ve čtyřech položkách s vysokou jistotou DOD jsou při této kontrole tři s extrahovanými termíny a jedna bez data. Ani „4/4 vysoká jistota DOD“, ani „8/11 DOD s nějakým datem“ tedy nejsou totéž jako ověřený počet správných budoucích pozvánek.

**Doporučení:** oddělit skóre tématu, cílové skupiny, stavu, termínu a konečné způsobilosti pro konkrétní kartu/e-mail. Uvádět, která část je skutečně označena a měřena. Finální benchmark musí hodnotit to, co dostane čtenář, nejen klasifikační mezikrok.

Minimum deset položek za třídu lze přijmout jako malou vstupní kontrolu, nikoli jako přesvědčivý důkaz 97% přesnosti. Ilustrace: při skutečné přesnosti 90 % vyjde deset nezávislých případů bez chyby s pravděpodobností `0,9^10 ≈ 34,9 %`. Taková třída by tedy poměrně často prošla testem 10/10.

Není nutné kvůli tomu zavádět lidské schvalování. Je nutné rozlišit **pozorovanou přesnost malého vzorku** a **spolehlivě doloženou provozní vlastnost**. Předem určit velikost a složení nezávislého benchmarku podle tolerované chyby; u malých tříd se do jeho dokončení držet webových odkazů. Jednorázový benchmark patří do vývoje a přejímky, ne do denní publikační cesty.

K vyjádření autora o předchozím přepočtu 52/57: souhlasím, že oprava pravidel je vhodná. Můj přepočet byl výslovně podmíněnou horní mezí **staré verze** při opravě konkrétních chyb, nikoli novou pravdou pro budoucí pravidla ani doporučením pouze přeštítkovat data. Nových 60/60 měří jiný výběr po změně pravidel; oba výsledky mohou být současně pravdivé. Neprokazuje to však samo o sobě obecnou správnost nové verze.

### F6 — Skrytí při výpadku DB ještě nevyplývá z popsané cache

**Důležitost: implementační kontrakt, zejména pro vypnutí chybné položky.**

Oddíl 3.7 volí při výpadku DB nezobrazit blok. To je přijatelná produktová volba. Při obsloužení stránky z již existující cache se ale DB nemusí vůbec oslovit, takže aplikace výpadek při té návštěvě nezjistí. Výjimka během ISR revalidace navíc standardně vede k dalšímu poskytování posledního úspěšného výsledku, nikoli automatickému skrytí bloku. [Dokumentace Next.js – obsluha chyb při ISR](https://nextjs.org/docs/app/guides/incremental-static-regeneration#handling-uncaught-exceptions)

Nejde o důkaz chyby dosud nenapsaného webového modulu. Jde o rozpor mezi požadovaným účinkem a neurčeným mechanismem. „Catch při čtení DB vrátí prázdný seznam“ sám nestačí k okamžitému skrytí již cachované stránky.

**Doporučení:** zvolit jasný kontrakt: buď omezené poskytování starších dat s maximálním stářím, nebo kontrola dostupnosti/platnosti, kterou nelze obejít cachovaným blokem. Před veřejným nasazením ověřit posloupnost načtení → skrytí položky → výpadek DB → další návštěva v produkčním režimu. Netřeba přepisovat celý web; rozhodnutí se týká nového bloku a jeho cache.

V aktivním textu navíc přetrvávají tři malé, ale konkrétní rozpory:

- 3.3 při výpadku slibuje poslední dobrá data; 3.7 požaduje blok skrýt.
- 3.6 stále uvádí `commit → revalidatePath → záznam invalidace`; 3.7 správně vyžaduje záznam v téže transakci jako změnu.
- Oddíl 7 stále obsahuje staré počty 1 062 / 25 488, ačkoli oddíl 9 je opravuje na 1 066 / 25 584.

Vyřešit odstraněním překonaných vět, nikoli dalším protichůdným odstavcem ve vypořádání.

## 5. Co doporučuji udělat dál

1. **Začít realizovat autonomní základ:** validace zdroje, sběr, DB, verze, neutrální titulky a odkazy, automatická obnova a dohled. Opravené části znovu nepřestavovat.
2. **Vydělit jedinou publikační funkci pro odvozené karty**, kterou lze testovat od položky až po skutečný zobrazovaný výsledek. Nehodnotit jen počet vysokých jistot v mezikroku.
3. **Do jejích přejímacích případů zahrnout F1–F3:** konání/nekonání, negované zrušení, zrušenou registraci, role data před i za popiskem, smíšenou SŠ/VOŠ a sportovní gymnázium.
4. **Opravit malé reprodukční a dokumentační zbytky** z F4 a F6. Nepotřebují další návrhové kolo.
5. **Na samostatném vzorku změřit jak úplnost, tak správnost finálních tvrzení.** Průchod regresních testů není náhradou tohoto ověření; všechny vzniklé chyby nesměřovat do manuální fronty, ale do neutrálního automatického zobrazení.

## 6. Závěr

**Verze 1.3 je použitelným základem autonomního pilotu, ale ještě neprokazuje připravenost odvozených termínových karet a e-mailů.** Opravy původních příkladů uznávám. Závěr „zbývá už pouze úplnost“ koriguji: správnost významu sdělení a termínu má stále konkrétní protidůkazy a provozní účinek cache zbývá ověřit.

Nežádám další rozšiřování rozsahu ani lidskou moderaci. Doporučuji přejít od opakovaného ladění tabulky vysokých jistot k testu skutečného automatického publikačního rozhodnutí.

## Historie

| Oponentura | Posuzovaná verze |
| --- | --- |
| [První](oponentura-skolske-novinky-rss-2027.md) | 1.0 |
| [Druhá](oponentura-skolske-novinky-rss-2027-v1.1.md) | 1.1, upřesnění autonomie |
| [Třetí](oponentura-skolske-novinky-rss-2027-v1.2.md) | 1.2, reference a parser |
| Tento soubor | 1.3, ověření oprav a koncového významu pro čtenáře |
