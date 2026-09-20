# Třetí oponentura školních novinek z RSS/Atom

**Verze oponentury:** 1.2 – třetí kolo  
**Posuzovaný návrh:** [verze 1.2](skolske-novinky-rss-2027.md), zejména vypořádání v oddílu 10  
**Předchozí hodnocení:** [oponentura verze 1.1](oponentura-skolske-novinky-rss-2027-v1.1.md)  
**Datum:** 19. 9. 2026  
**Závazná priorita zadavatele:** autonomní provoz bez lidského schvalování zveřejňovaných položek.

## 1. Stanovisko

**Architekturu verze 1.2 doporučuji použít pro autonomní webový pilot. Předchozí vady spustitelnosti měření jsou opravené a původní požadavek na ruční moderaci konfliktů je věcně odstraněn.** Není důvod znovu otevírat volbu Postgresu, RSS jako prvního zdroje ani dvě kontroly denně pro základní provoz.

Závěr „vysoká jistota 57/57“ je nyní výpočetně reprodukovatelný, ale není dostatečným důkazem správnosti přijímacích karet a e-mailů. V referencích jsou konkrétní obsahové problémy, zejména přijímání na VOŠ vydávané za správný zásah pro službu uchazečům o SŠ. Pravidla dále nerozlišují některá zrušení a negace. Doporučuji proto pokračovat implementací sběru a automatického zveřejnění původních titulků; odvozené termíny a e-maily podmínit opravami níže.

**Neřešit tyto nedostatky návratem k moderaci.** Správné řešení je automatické omezení interpretace, přesnější pravidla a ověření při vývoji. Nejasný článek zůstane dohledatelný jako původní titulek a odkaz; nemusí čekat na člověka.

## 2. Provedené kontroly a výsledky

### 2.1 Co se podařilo potvrdit

Spuštěny příkazy:

```sh
.venv/bin/python scripts/rss-klasifikace-mereni.py --offline
.venv/bin/python -m unittest discover -s tests -p 'test_rss_klasifikace.py'
```

Výsledek:

- Offline vyhodnocení úspěšně skončilo: 80 záznamů s položkami nebo prázdným seznamem, z toho 3 prázdné; 1 356 položek celkem, 624 v časovém okně, 71 zásahů u 38 škol.
- Pro dodané reference reprodukuji 87/93 správných párů téma × položka a 57/57 párů s vysokou jistotou.
- **57 párů s vysokou jistotou odpovídá 52 různým položkám**, protože jedna položka může mít více tříd. Nejde o 57 nezávislých zpráv.
- Všech **15 regresních testů prošlo** v lokálním prostředí s instalovanými závislostmi.
- Přepočet sondy potvrzuje **533 z 1 093 škol**, i po odfiltrování URL s `comment`.
- `dopln_fallback()` již skutečně používá uloženou finální URL po přesměrování. Tento nález z minulého kola uzavírám.

Offline režim pracuje s již rozparsovanými JSON položkami, nikoli s archivem původních XML odpovědí. Reprodukuje klasifikaci a počty, nikoli zpětně všechny parsovací pokusy. Označení „80/80 rozparsováno“ v jeho výpisu je počet uložených záznamů s polem `polozky`, ne nové offline parsování 80 původních feedů.

### 2.2 Meze ověření

Proběhla kontrola návrhu, lokálních skriptů, referencí, CI workflow a cílené offline zkoušky. Nebyla spuštěna nová plošná sonda, produkční import, přístup k DB ani webový provozní test: produkční sklízeč a webový modul novinek jsou stále předmětem návrhu. Vzdálený úspěšný běh CI nebyl ověřen. Návrh, skripty ani reference nebyly při tomto hodnocení upraveny.

Podklady: [měření](../scripts/rss-klasifikace-mereni.py), [testy](../tests/test_rss_klasifikace.py), [reference](../data/sondy/rss-klasifikace-reference.json), [vzorek](../data/sondy/rss-klasifikace-vzorek80.json), [doplnění vzorku](../data/sondy/rss-klasifikace-vzorek80-doplneni.json), [sonda](../scripts/sonda-rss-webu-skol.py), [CI](../.github/workflows/testy.yml).

Identifikace hodnoceného stavu (SHA-256):

```text
docs/skolske-novinky-rss-2027.md
62ce3233101a8532f2bae51bbc17522897088d8ea1702bb5e3a5fb9ff3a3c5e9

scripts/rss-klasifikace-mereni.py
c7420de753cb4059a224f93db2a3470340f9692089760b69ec0f5ca0d4089348

data/sondy/rss-klasifikace-reference.json
151808f15b25c1c71fcfb8e694c376d982e1cdd785191fb84cfe974f7e11ed3b
```

## 3. Vypořádání předchozích bodů

| Předchozí bod | Stav po kontrole 1.2 | Argument |
| --- | --- | --- |
| R1 Reprodukovatelnost | **Spustitelnost vyřešena, validita měření částečně** | Offline příkaz funguje a čísla odpovídají referencím. Reference ale obsahují obsahové chyby; reprodukovatelnost výpočtu není nezávislé potvrzení správnosti. |
| R2 Téma versus význam | **Částečně vyřešeno** | Kategorie již nespouštějí zásah, JPZ je odděleno od výsledků, přibyly stráže. Zbývají konkrétní falešné vysoké jistoty a chybí rozlišení příjemců SŠ/VOŠ. |
| R3 Platnost a termíny | **Zásadní koncepční opravy přijaty** | Více termínů, bezdatové DOD a historická formulace volných míst jsou vhodné. Kalendářně platné datum však ještě není správně určený termín akce. |
| R4 Opravy a konflikty | **Koncepčně převážně vyřešeno** | Stabilní identita, verze polí a konflikt bez precedence portálu odpovídají doporučení. Zůstává nejednoznačnost opravné zprávy při návratu A → B → A. |
| R5 Cache | **Směr přijat, kontrakt doplnit při implementaci** | `unstable_cache`, invalidace a opakování jsou správně. Trvalý požadavek na invalidaci musí vzniknout atomicky se zápisem změny; stejný vlastní tag se nesmí zaměnit s cestou. |
| R6 Sonda | **Původní chyba opravena** | Potvrzuji 533, opravenou finální URL a přesnější jmenovatele. Zařazení jednotlivých feedů ještě vyžaduje validaci jejich obsahu. |
| R7 Dohled | **Koncepce přijata, chybí proveditelné parametry** | Přepínače, 304 a oddělení výpadku DB jsou popsány. Rychlejší polling zatím nemá plán spouštění a snapshot nemá určené místo ani pravidla obnovy. |
| Frekvence, Postgres, HTML/PDF, WebSub | **Shoda, neotevírám znovu** | 2× denně pro pilot, podmíněné zrychlení a postupné doplňování zdrojů jsou přiměřené. |
| Autonomie | **Správně v oddílu 3.6, dokument má ještě rozpory** | Oddíl 10 říká, že registr nečeká na PR; oddíl 3.1 jej stále vyžaduje. Plošný e-mail v oddílu 4 nadále vyžaduje schválení PR. |

## 4. Nové a zbývající nálezy podle důležitosti

### N1 — Referenční štítky nadhodnocují správnost pro uchazeče o SŠ

**Dopad: před použitím tvrzení o 100% přesnosti pro karty a e-maily.**

Ve skutečném uloženém vzorku jsem ověřil tyto případy, nikoli pouze syntetické příklady:

| REDIZO | Článek | Problém |
| --- | --- | --- |
| 600019918 | Vyhlášení výsledků 2. kola PŘ na VOŠ | Výslovně jde o obor Diplomovaná všeobecná sestra na VOŠ. Má vysokou jistotu a reference jej potvrzuje jako správný. |
| 600007871 | Přijímací řízení VOŠ – Kritéria pro 3. kolo přijímacího řízení | Článek výslovně vyhlašuje přijímání na vyšší odbornou školu. Vysoká jistota je potvrzena referencí. |
| 600019675 | Vyšší odborná škola zdravotnická – přijímací řízení | Opět přijímání na VOŠ, nikoli do SŠ; vysoká jistota i kladná reference. |
| 600019675 | Přijímací řízení VOŠZ, URL končící `vosz-18/` | Zveřejnění výsledků 1. kola VOŠ; vysoká jistota ve dvou třídách a kladná reference. |
| 600004520 | KLUB MLADÝCH DIVÁKŮ | Popis řeší přihlášku do divadelního klubu a poplatek, ale reference považuje přijímací téma za správné. Není vysoká jistota; zkresluje přesnost témat. |

U společných organizací SŠ a VOŠ může být zpráva o VOŠ legitimní běžnou novinkou školy. **Nesmí však bez rozlišení cílové skupiny vstoupit do přijímací karty či upozornění pro uchazeče o SŠ.** Nejde o tvrzení, že má být z portálu smazána.

Pokud je cílem vysoké jistoty právě přijímání do SŠ, čtyři uvedené VOŠ články představují pět chybných párů. I při předpokladu správnosti všech ostatních párů by horní mez byla 52/57, přibližně 91,2 %, nikoli 100 %. Na úrovni položek nejvýše 48/52, přibližně 92,3 %. Toto je podmíněný přepočet pouze těchto doložených případů, nikoli nový úplný audit všech štítků.

Dále `ohodnot()` používá jednu dvojici booleanů `spravne_tema` a `spravne_vysoka` pro všechny třídy daného článku. Nemůže tak správně rozlišit článek správně označený jako přijímací řízení, ale chybně jako výsledky. Reference se páruje podle REDIZO a titulku; vzorek přitom obsahuje dva různé články „Přijímací řízení VOŠZ“ se stejným titulkem.

**Doporučení:** referenční jednotkou má být stabilní položka/URL + třída + cílová skupina, případně samostatné rozhodnutí „smí vytvořit toto konkrétní tvrzení“. Opravit chybné reference a oddělit přijímání SŠ, VOŠ, ubytování a ostatní témata. Jde o jednorázovou opravu vývojového benchmarku, ne o schvalování zpráv v provozu.

### N2 — „Vysoká jistota“ stále neověřuje stav sdělení

**Dopad: před automatickými termínovými kartami.**

Cílené offline zkoušky skutečných funkcí současného skriptu:

| Vstup | Výstup | Co zůstává nevyřešeno |
| --- | --- | --- |
| Den otevřených dveří pro uchazeče 9. 12. 2026 se ruší | `dod: vysoka`, datum 2026-12-09 | Výstup neobsahuje stav „zrušeno“. Pravidlo „spolehlivá třída + platný termín → karta“ by tak nemělo dost podkladů k odmítnutí budoucí pozvánky. |
| Volná místa pro uchazeče již nejsou | `volna_mista: vysoka` | Stráž zachytí „nejsou … volná“, ale ne tuto běžnou opačnou slovní posloupnost. |
| Výsledková listina školního turnaje | `vysledky_prijm: vysoka` | Výsledková listina spouští třídu bez přijímacího kontextu. |

Zrušení DOD je důležitá zpráva a může správně mít vysokou prioritu pro e-mail. Chyba tedy není v potřebě tuto zprávu zahodit. Chybí strukturovaný význam, podle kterého vznikne upozornění na zrušení místo pozvánky.

**Doporučení:** rozhodnutí rozdělit minimálně na téma, cílovou skupinu a stav `oznameno / zmeneno / zruseno / nejiste`. Vysoká jistota tématu nesmí automaticky znamenat jistotu kladného tvrzení. Pro pilot lze každý nejasný stav autonomně zveřejnit jen jako původní titulek a odkaz. Přidat regresní případy po významových skupinách, nikoli pouze další jednotlivý zakázaný řetězec.

### N3 — Datum události se stále zaměňuje za libovolné datum v textu

**Dopad: před odvozováním termínových karet; neblokuje původní titulky.**

Kalendářní validace 31. února je opravena. Další zkoušky ale ukázaly:

- `DOD 9. prosince 2026` → žádné datum s rokem; extraktor řadí termín mezi data bez roku. Rok přitom explicitně uveden je.
- `Registrace do 1. 12. 2026. Den otevřených dveří 9. 12. 2026.` → oba dny jsou vráceny ve stejném seznamu `s_rokem`, bez role registrace versus akce.
- Numerické datum s rokem se současně může objevit i v `bez_roku`; výstup tedy neodděluje tyto kategorie spolehlivě.

První případ omezuje úplnost, druhý může vytvořit nepravdivý termín. Podmínka datum ≥ publikace je neodliší, protože oba dny mohou být budoucí.

Navíc `parse_datum('2026-09-19T18:45:00+02:00')` vrací `2026-09-19 00:00:00+00:00`. ISO čas i časové pásmo se ztrácejí. To zkresluje metriku publikace → zobrazení a pořadí změn. Neplatné zdrojové ISO datum `2026-02-31` vyvolá `ValueError`; výjimka musí být izolována na položku, nikoli zastavit dávku.

**Doporučení:** uchovat původní čas publikace, přesnost data a jeho zónu. U událostí přiřazovat datum ke konkrétnímu významu, jinak použít neutrální odkaz. Do okamžiku takové implementace neprezentovat výpis kalendářně platných dat jako měření správně získaných termínů DOD.

### N4 — Měření není zatím přenositelné do čistého checkoutu a CI

**Dopad: před uzavřením bodu „reprodukovatelnost v repozitáři / CI běží“.**

Lokální běh prošel. V aktuálním pracovním stavu ale:

- `git ls-files data/sondy` nevrací žádný soubor a `git check-ignore` potvrzuje ignorování referencí pravidlem `/data/*`. Podklady existují lokálně, nejsou doloženy jako součást čistého checkoutu.
- Nový měřicí skript i test jsou dosud nesledované soubory. Není to chyba rozpracovaného návrhu sama o sobě, ale nelze z ní vyvozovat, že jejich test už běží ve vzdáleném CI.
- [Workflow](../.github/workflows/testy.yml) instaluje pouze `openpyxl`. Import testu načte měření, měření načte sondu a ta okamžitě vyžaduje `requests`, i když test vůbec nestahuje web.

Izolační zkouška `.venv/bin/python -S -m unittest discover -s tests -p 'test_rss_klasifikace.py'` skončila `ModuleNotFoundError: No module named 'requests'`. Nejde o plnou simulaci GitHub runneru, ale potvrzuje tuto závislost; workflow ji výslovně nezajišťuje.

**Doporučení:** zajistit verzování nezbytných malých fixture souborů a explicitní závislosti, nebo síťovou sondu importovat až v online režimu. Offline testy parseru a klasifikace pak mohou fungovat bez `requests`. Doplnit kontrolu úplnosti referencí s nenulovým návratovým kódem: současné vyhodnocení chybějící štítky jen vytiskne jako `CHYBA` a přesto úspěšně skončí.

### N5 — Oprava XML může poškodit jinak správně escapovaný obsah

**Dopad: spolehlivost automatického sběru; opravit před převzetím parseru do sklízeče.**

Na feedu obsahujícím titulek `A &lt; B &nbsp; C` současný parser vrací `None`. Při opravě `&nbsp;` totiž `_nahrad_html_entity()` dekóduje také platné XML `&lt;` na doslovné `<`, které následné parsování rozbije. Test escapovaného ampersandu prochází jen na původně platném XML, kde se opravná větev vůbec nepoužije.

Další zkouška: `<html><body>Přihlaste se</body></html>` je vyhodnoceno jako prázdný feed `[]`, nikoli odmítnuto. Dobře formovaná HTML přihlašovací stránka tak může vypadat jako úspěšně načtený prázdný zdroj.

**Doporučení:** opravovat pouze XML-nedefinované entity, zachovat platné escapování, ověřit kořen a strukturu RSS/Atom. Validní prázdný feed odlišit od cizího dokumentu. Tyto chyby se mají řešit automatickým stavem zdroje, ne ručním schvalováním.

### N6 — Dokument dosud obsahuje protichůdné aktuální instrukce

**Dopad: před předáním návrhu k implementaci; jde o malou, ale nutnou redakční opravu.**

| Oblast | Rozpor | Doporučené sjednocení |
| --- | --- | --- |
| Registr | 3.1 požaduje změny přes PR; 10 říká, že PR není podmínka. | Automaticky ověřovat a aktivovat zdroj, auditní export do gitu nezávisle. PR ponechat pro změny kódu a pravidel. |
| E-mail fáze 1 | Oddíl 4 nadále říká „Schválení = PR“. | Tuto redakční kampaň vyřadit z povinné RSS cesty. Pokud zůstane automaticky generovaná, publikaci jednotlivých zpráv nepodmiňovat PR. Jednorázové schválení kódu šablony je jiná věc. |
| Datum bez roku | Oddíl 2 připouští „explicitní rok nebo pozvánka“, 3.4 pouze explicitní rok. | V aktuální specifikaci ponechat jedinou bezpečnou variantu; historické pravidlo označit jako překonané. |
| Konflikty | Oddíl 8 stále uvádí přednost portálu a moderaci, ačkoli 3.6 a 10 ji ruší. | Oddíl 8 výslovně označit jako historické vypořádání verze 1.1, nikoli aktuální pravidla. |
| Neutrální přijímací zpráva | 3.6 slibuje neutrální odkaz při nejistotě, seznam je ale současně „jen pro běžný život školy“. | Určit viditelné místo i pro nezvýrazněné přijímací zprávy, aby z omezení interpretace nevzniklo úplné skrytí. |

U nového počtu škol také opravit aritmetiku: 533 × 2 = **1 066**, nikoli 1 062; 533 × 48 = **25 584**, nikoli 25 488. Jde o drobnost bez dopadu na rozhodnutí o frekvenci.

### N7 — Návrat A → B → A musí respektovat, co dostal konkrétní příjemce

**Dopad: před školními e-maily.**

Návrh správně požaduje porovnání podstatných tvrzení. Formulace „návrat k dřívější verzi se neodešle znovu jako novinka“ ale musí rozlišit novinku a nutnou opravu:

1. Rodiči přišel DOD na 9. prosince (A).
2. Přišla oprava na 10. prosince (B).
3. Škola opraví termín zpět na 9. prosince (A).

Pokud se poslední A potlačí jen proto, že už existuje jeho hash, rodiči zůstane jako poslední sdělení chybný 10. prosinec. Rodič, kterému B nikdy neodešlo, naopak další A nepotřebuje.

**Doporučení:** rozlišit ID události změny, obsah tvrzení a poslední skutečně doručený stav každému příjemci. A → B → A není duplicitní zpracování téhož importu. Poslední A může být opravná zpráva, i když není novinkou. Stejně tak při nejisté změně dříve odeslaného termínu zvážit automatické neutrální upozornění „škola změnila původní informaci, ověřte aktuální znění“, namísto tichého ponechání starého tvrzení v e-mailu.

### N8 — Autonomní provoz potřebuje několik konkrétních technických rozhodnutí

**Dopad: součást implementačního kontraktu, ne důvod překreslovat architekturu.**

**Invalidace:** pokud proces skončí po commitu DB, ale před uložením požadavku na invalidaci, opakování nemá co obnovit. Změna položky a záznam nevyřízené invalidace mají vzniknout v jedné transakci; následný pokus jej označí jako dokončený. Samotné pořadí „commit → zavolání → záznam“ mezeru neřeší.

`revalidatePath` pracuje s cestou, nikoli s libovolně stejně pojmenovaným vlastním tagem. `unstable_cache` může být navázána na invalidaci stránky; není nutné tvrdit, že kombinace nefunguje. Pro sdílená data a přepínače je však potřeba výslovně určit tagy, jejich invalidaci a dotčené stránky. Oficiální dokumentace rozlišuje invalidaci cest a tagů; ověřovací zkouška první následující návštěvy zůstává správným požadavkem. [Next.js: revalidatePath](https://nextjs.org/docs/app/api-reference/functions/revalidatePath), [Next.js: unstable_cache](https://nextjs.org/docs/app/api-reference/functions/unstable_cache)

**Rychlejší kontroly:** workflow spouštěné pouze dvakrát denně nemůže samo kontrolovat vybrané zdroje každých 30 minut. Určit interval plánovače, pole příští kontroly zdroje a výběr pouze splatných úloh. Častější probuzení pracovní úlohy nemusí znamenat častější dotazy na všechny weby.

**Dohled:** jiné workflow na stejném GitHub scheduleru odhalí část chyb, ale není nezávislé na výpadku společného plánovače. V návrhu uvedená varianta kontroly z Vercelu má jiný profil závislostí; vybrat konkrétní variantu. Náhradní běh musí respektovat zámek, aby nezdvojoval práci už běžícího importu.

**Snapshot:** určit, kde je perzistentní snapshot mimo nedostupnou DB, kdy se atomicky obnoví a jak dlouho se smí zobrazovat. Starý snapshot nesmí při výpadku znovu zveřejnit již skrytou položku. Pokud to nelze ověřit, bezpečně omezit zobrazení, nikoli slibovat současně dostupnost posledních dat a okamžité vypnutí bez definice jejich vztahu.

**Aktualizace pravidel:** změna pravidel musí umět přepočítat uložené aktivní položky i při odpovědi feedu 304. Jinak opravená klasifikace může čekat na změnu obsahu školy.

### N9 — Spouštěcí kritérium e-mailů je konkrétnější, ale stále neúplné

**Dopad: před automatickým zapnutím e-mailů, ne před RSS pilotem.**

Limit ≥97 % je lepší než pouhé „po měsíci“. Bez minimální velikosti a definice jednotky vzorku ale může formálně projít i několik jednotlivých zpráv. Souhrnný výsledek navíc může zakrýt slabou třídu DOD za mnoha snadnými výsledkovými listinami. Současný vzorek obsahuje jen čtyři vysoké jistoty DOD a žádné zásahy talentových zkoušek ani náhradních termínů, přesto návrh připouští jejich automatické e-maily.

„Nejvýše dvě falešné karty za celé období“ nelze přesně zjistit z kontroly pouhého vzorku, pokud není nezávisle ověřen celý soubor. „≤5 e-mailů týdně v sezónní špičce“ zase není možné potvrdit z libovolných 30 dní mimo špičku. To nesmí vyústit v trvalou práci člověka.

**Doporučení:** definovat jednorázový přejímací benchmark podle položek i tříd, oddělený od ladění pravidel. Produkční publikace a odesílání pak běží automaticky. Málo doložené třídy mohou zatím zůstat pouze na webu. Absolutní tvrzení o všech falešných kartách nahradit jasně označeným výsledkem vzorku a automatickými kontrolami invariantů. Frekvenční limit zpráv vynucovat v odesílači; neočekávat, že minulá naměřená četnost sama zaručí budoucí maximum.

## 5. Doporučené rozhodnutí

### Lze začít implementovat

- RSS/Atom sběr do Postgresu, automatické zveřejnění původních titulků a odkazů.
- Základní kontroly 2× denně, automatické opakování, oddělení stavů zdroje a audit změn.
- Konflikty a nejasné údaje řešit automatickým omezením interpretace; žádná schvalovací fronta.

### Opravit před prvními odvozenými kartami

- Rozlišení SŠ/VOŠ a chybné reference; stav oznámení versus zrušení a negace.
- Význam data, zachování času publikace a odolnost parseru.
- Sjednocení rozporných instrukcí dokumentu a konkrétní kontrakt invalidace/vypnutí.

### Ověřit až před rozšířením na školní e-maily

- Přesnost na samostatném referenčním vzorku pro každou povolenou třídu.
- Opravné zprávy podle posledního doručeného tvrzení příjemci.
- Autonomní limity, zotavení a přenositelné testy v čistém CI prostředí.

**Konečný verdikt:** verze 1.2 už dává smysl jako základ realizace. Hlavní výhrada se posunula od architektury ke kvalitě referencí a významové interpretaci. Další krok má být implementace jednoduché autonomní cesty s cílenými opravami, nikoli další plošné rozšiřování návrhu nebo zavádění lidské moderace.

## Historie oponentur

| Soubor | Posuzovaný návrh |
| --- | --- |
| [Původní oponentura](oponentura-skolske-novinky-rss-2027.md) | 1.0 |
| [Druhé kolo](oponentura-skolske-novinky-rss-2027-v1.1.md) | 1.1; zahrnuje upřesnění autonomie zadavatelem |
| Tento soubor | 1.2; spuštěná offline reprodukce, 15 testů, kontrola skutečných referencí a cílené zkoušky nových okrajových případů |
