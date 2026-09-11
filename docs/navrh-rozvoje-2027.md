# Návrh rozvoje Přijímaček na školu pro přijímací řízení 2027

Datum ověření: 11. září 2026. Stav: návrh k rozhodnutí, nikoli schválený implementační plán.

Doporučení: propojit ověřenou nabídku oborů, osobní výběr škol a přípravu podle chyb dítěte. První investice má směřovat do aktualizace dat a srozumitelnosti odhadů. Na tento základ navázat pracovním prostorem „Můj výběr 2027“ a omezeným pilotem přípravy pro deváťáky.

## 1. Co projekt skutečně má

Prověřen lokální checkout na commitu `c17d42e` z 21. 6. 2026, důležité importy, datové soubory, veřejná hlavní stránka a červencové PRD přípravy. Nejde o úplný audit všech cest aplikace ani o kontrolu provozních analytik.

- Next.js 16, React 19, TypeScript a Tailwind. Velká část obsahu vychází ze souborů JSON.
- Vyhledávání a profily škol, srovnání oborů, simulátor podle bodů, kalkulačka „Moje šance“, regiony a města, průvodce výběrem, dojezdovost a informace ČŠI/InspIS.
- `schools_data.json`: 2 721 záznamů pro rok 2024 a 2 837 pro rok 2025. Nejde o počty samostatných škol.
- `applications_2026.json`: 3 087 záznamů, metadata odkazují na aktualizaci CERMAT z 8. 3. 2026. Jde o reálný import; přítomnost starého skriptu pro generování odhadů nedokazuje, že se dnes používají odhadovaná data.
- `cermat_results_2026.json`: 3 080 záznamů, 1 104 různých REDIZO. Export obsahuje zejména průměry přijatých, nevyužívá všechny dostupné ukazatele zdroje.
- Existují naplánované GitHub workflow pro ČŠI a InspIS. Jejich přítomnost není důkazem, že aktualizace pravidelně prošly a dostaly se do veřejného webu.
- `docs/prd-priprava-na-jpz.md` z 10. 7. 2026 už popisuje diagnostiku, plán, vlastní úlohy, AI tutora a rodičovský přehled. Termín MVP 31. 8. 2026 již uplynul. Implementaci tohoto modulu jsem v prohlédnutých cestách checkoutu nenašel; případné samostatné nasazení nebylo ověřeno.
- Databázi kontaktů uvedenou v zadání beru jako existující vstup mimo nalezené projektové soubory. Její rozsah, role adresátů a oprávnění k rozesílce nebyly ověřeny.

Na [veřejné hlavní stránce](https://www.prijimackynaskolu.cz/) přetrvává květnový obsah 2026. Číslo 3 080 je označeno jako počet škol, přestože lokální export počítá obory/zaměření. Titulek o tom, kolik bodů stačilo, odkazuje na průměr přijatých. Tyto dva významy je potřeba rozlišit. Text o sportovních školách také potřebuje opravu: gymnázium se sportovní přípravou má JPZ i talentovou zkoušku podle [sdělení MŠMT](https://msmt.gov.cz/media/wp-content/uploads/2026/08/Sdeleni-o-terminech_2026-2027.pdf).

## 2. Co přineslo poslední dění

### Výsledky 2026 jsou dostupné v širším a novějším rozsahu

CERMAT označuje agregované výsledky obou kol 2026 platností k 17. 8. 2026. K dispozici jsou také přihlášky a kapacity obou kol. [Katalog agregovaných dat](https://data.cermat.cz/data-a-analyticke-vystupy-jednotna-prijimaci-zkouska/agregovana-data-jpz.html)

Stažený soubor prvního kola má 6 368 datových řádků a 1 337 různých REDIZO. Obsahuje i učební obory a konzervatoře. Soubor druhého kola má 2 707 datových řádků. Rozdíl proti webu zčásti plyne z jeho záměrného filtru na denní nezkrácené studium s JPZ.

Srovnání současného exportu s novým souborem při použití současné importní funkce:

| Kontrola | Výsledek |
|---|---:|
| Společné klíče | 3 073 |
| Změněný počet přijatých | 676 |
| Změněný průměr ČJ+MA přijatých | 1 254 |
| Nové klíče po současném filtru | 3 |
| Původní klíče bez protějšku po současném filtru | 7 |

To dokládá potřebu obnovy. Nejde o změnu skutečného počtu škol: současný import zahazuje i řádky bez kladného průměru a spojuje je klíčem odvozeným z názvu zaměření. Zdroj: [výsledky prvního kola 2026](https://data.cermat.cz/files/files/JPZ/agregovana_data_skoly/PZ2026_kolo1_skolobory_vysledky.xlsx). Postup a kontrolní součty jsou v `docs/podklady/rozvoj-2027-audit.json`.

CERMAT po dvou kolech uvádí přijetí přibližně 98 % deváťáků. U všech uchazečů do čtyřletých a kratších oborů je to 94,1 %, v Praze 88,8 %. Jde o různé populace. Z toho vyvozuji, že produkt má řešit zejména vhodnost dostupné školy a regionální rozdíly, současně zachovat podporu rodin, které přijetí stále řeší. [Souhrn CERMAT po druhém kole](https://data.cermat.cz/aktuality/vysledky-2-kola-prijimacich-zkousek-2026.html)

### Pro rok 2027 už existují závazné termíny

| Událost | Termín |
|---|---|
| Kritéria konzervatoří | 15.–31. 10. 2026 |
| Přihlášky na konzervatoře | 1.–30. 11. 2026 |
| Kritéria středních škol | 15.–31. 1. 2027 |
| Přihlášky na střední školy | 1.–22. 2. 2027; konec lhůty se posouvá z víkendu |
| JPZ, čtyřleté obory včetně nástaveb | 12. a 13. 4. 2027 |
| JPZ, šestiletá a osmiletá gymnázia | 14. a 15. 4. 2027 |
| Náhradní JPZ | 29. a 30. 4. 2027 |
| Výsledky prvního kola SŠ | 14. 5. 2027 |
| Přihlášky druhého kola | 19.–24. 5. 2027 |
| Výsledky druhého kola | 22. 6. 2027 |

Zdroje: [sdělení o JPZ](https://msmt.gov.cz/media/wp-content/uploads/2026/08/Sdeleni-o-terminech_2026-2027.pdf) a [harmonogram MŠMT, tabulky na stranách 1–3](https://msmt.gov.cz/media/wp-content/uploads/2026/08/Casovy-harmonogram_2026-2027.pdf). Uvedené lhůty je před sezónní publikací potřeba znovu ověřit proti případným opravám ministerstva.

Od 1. 9. 2026 se mění zejména režim konzervatoří a digitalizace doporučení poradenských zařízení, včetně kategorie VJ. Výpis jako způsob podání byl zrušen již pro předchozí sezónu. Ve druhém kole mohou do oboru s povinnou JPZ i uchazeči bez vykonané JPZ, dostávají za ni nulu. Průvodce musí rozlišit novou změnu od pokračujícího pravidla. [Metodika MŠMT z 18. 8. 2026, strany 1 a 14](https://msmt.gov.cz/media/wp-content/uploads/2026/08/Metodika_prijimaci-rizeni_2026-2027.pdf)

Nabídku a kapacity 2027 nelze vydávat za kompletní jen na základě historie 2026. Rejstříkové oprávnění vyučovat obor není vyhlášením přijímacího řízení do tohoto oboru.

## 3. Co bych opravil před rozšiřováním

**Sjednotit význam odhadů.** `src/lib/chances.ts` odvozuje procentní „šanci“ z historického poměru přijatých a přihlášek, upraveného změnou poptávky, a ořezává výsledek na 5–95 %. Nezohledňuje body dítěte. Zachovat jej nanejvýš jako popis konkurence. Osobní výstup formulovat například „Tvé výsledky jsou v pásmu historických výsledků přijatých; školní kritéria zatím nejsou ověřena“.

**Prověřit bodové významy v simulátoru.** `src/lib/data.ts` na několika místech zaměňuje interpretaci `min_body` a odvozuje další školní body rozdílem minim. Takto nelze zjistit kritéria školy. Oddělit původní procentní skór, přepočet na standardní škálu, percentil a skutečné školní hodnocení. U upravených testů nelze bez dalšího vydávat přepočtené procento za původní body uchazeče. Nezaměňovat minimum součtu za součet dvou předmětových minim.

**Zachovat rok u každé informace.** Výsledky 2026, kapacita potvrzená pro 2027 a historické školné nesmějí působit jako údaje ze stejného období. Chybějící hodnota není nula. Historické minimum není předpověď příští hranice a samo o sobě nereprodukuje školní pořadí.

**Opravit identitu nabídky.** Městské přehledy v `src/lib/cityData.ts` vycházejí z řádků 2025 a spojují je přes přesné `id`. Pouze 1 445 z 2 837 těchto ID má přesný protějšek v současném výsledkovém souboru 2026. Není to míra chyb celého webu, ale důvod prověřit tuto konkrétní cestu spojování. Zdrojová `ID_SO` a `ID_SOF` ukládat spolu s IZO, REDIZO, KKOV, formou, délkou, místem výuky a zaměřením; jejich stabilitu přes roky ověřit. Přejmenování, rozdělení a sloučení oborů vést jako explicitní vztahy.

**Opravit rozpoznání formátu importu.** Skript rozlišuje předchozí ročník podle počtu listů. Aktuální sešit 2026 má datový list a vysvětlivky, takže tato heuristika nebude při obnově srovnání 2027 spolehlivá. Formát poznávat podle hlaviček.

## 4. Jak má vypadat produkt pro dítě

Navrhuji jednu navazující cestu: zájmy a omezení → širší výběr → návštěvy a porovnání → pořadí přihlášek → příprava → kontrola termínů a výsledků.

### „Můj výběr 2027“

Žák začne několika srozumitelnými otázkami: co ho baví dělat, zda chce maturitu nebo řemeslo, kolik může dojíždět, zda přichází v úvahu internát a školné. Výstupem bude vysvětlený širší výběr přibližně 6–10 oborů. Skóre v testu nesmí předčasně uzavřít cestu k oboru, který ho zajímá.

Ke každému kandidátovi uvést:

- proč odpovídá zadaným preferencím;
- co se tam učí a jaké možnosti pokračování má absolvent;
- skutečné místo výuky, dopravu ráno i zpět a přestupy;
- náklady, ubytování, podporu při studiu a dostupná fakta o prostředí;
- pravidla přijetí pro 2027 a jejich zdroj;
- datum otevřených dveří, vlastní poznámky a nezodpovězené otázky.

Použít dosavadní profily ČŠI/InspIS a dojezdovost. Před rozšířením dopravy ověřit platnost jízdních řádů, školní dny a pokrytí regionu. Pokud přesný spoj není ověřen, uvést odkaz pro kontrolu, nikoli falešně přesný čas.

Srovnání 3–5 oborů má být společné pro dítě a rodiče, s možností exportovat stručný přehled pro výchovného poradce. Ukládání lze začít bez účtu v prohlížeči, sdílení a synchronizaci přidat volitelně. Počet kandidátů ke srovnání se nemusí rovnat počtu povolených přihlášek.

Pořadí přihlášek má odpovídat skutečné preferenci. Vyšší priorita nedává přednost před uchazečem s lepším výsledkem školního hodnocení. Produkt má pomoci rozšířit přijatelný výběr, nikoli přesouvat nechtěnou „jistotu“ na první místo. [Metodika přiřazování, strana 12](https://msmt.gov.cz/media/wp-content/uploads/2026/08/Metodika_prijimaci-rizeni_2026-2027.pdf)

### Přehledy, které nová data umožňují

| Otázka rodiny | Navržený přehled | Podmínka správné interpretace |
|---|---|---|
| Kde byla skutečná konkurence? | Přijatí, nepřijatí pro kapacitu, nesplněné podmínky a přijatí na vyšší preferenci | Samotné přihlášky dělené kapacitou nejsou osobní pravděpodobnost |
| Jak se obor mění? | Kapacity, zájem a výsledky 2024–2026 | Spojit totožné nabídky, označit změnu kritérií a testové škály |
| Jaké další školy stojí za návštěvu? | Obory často zvažované společně, omezené dojížděním a zájmy dítěte | Popularita není důkaz vhodnosti; agregovat dostatečně velké skupiny |
| Co s výsledkem cvičného testu? | Historické rozdělení skóre a předmětový profil přijatých | Rozlišit typ a rok testu, vzorek i školní hodnocení |
| Kde bývalo druhé kolo? | Historická nabídka a naplnění druhého kola | Historie není aktuální volné místo |
| Co po absolvování oboru? | Návazné studium a uplatnění podle skupiny oborů | Nepřisuzovat oborový údaj konkrétní škole |

Pro společné volby a rozdělení výsledků jsou dostupná anonymizovaná data po uchazečích za 2026. Jejich popis upozorňuje, že zachycují stav při oznámení výsledků, bez pozdějších vzdání se přijetí. Nekombinovat je bez označení s pozdějšími agregáty. [Datové soubory CERMAT](https://data.cermat.cz/data-a-analyticke-vystupy-jednotna-prijimaci-zkouska/datove-soubory.html)

Pro uplatnění už existují údaje o nezaměstnanosti absolventů v dubnu 2026. Jde o kontext oborových skupin, nikoli prognózu kariéry dnešního deváťáka. [NPI – Infoabsolvent](https://www.infoabsolvent.cz/Temata/ClanekAbsolventi/5-1-05/Nezamestnanost-absolventu-skupiny-oboru-vzdelani/12)

Nezaváděl bych jeden celkový žebříček kvality škol. Vstupní výsledky přijatých měří také výběrovost a složení uchazečů. Maturitní výsledky bez návazné kohorty a kontextu nedokazují přidanou hodnotu školy.

## 5. Příprava na JPZ: začít rozborem chyb

CERMAT již nabízí bezplatné historické testy, tematické procvičování a TAU. Naše přidaná hodnota má být ve výběru dalšího úkolu, vysvětlení chyby a propojení s osobním cílem. [Přijímačky bez obav](https://prijimacky.cermat.cz/menu/jednotna-prijimaci-zkouska/prijimacky-bez-obav.html)

### První použitelná verze

1. Žák vyřeší vybraný oficiální test dostupný přes odkaz na CERMAT nebo vlastní schválenou sadu.
2. Zapíše body a označí problematické úlohy. U každé zvolí například neznalost, nepochopení zadání, chybný postup nebo nedostatek času. Klasifikaci podle odpovědi potvrzuje žák; systém ji nevydává za jistou diagnózu.
3. Dostane tři priority na příští týden a krátké aktivity podle svého času.
4. Po týdnu ověří přenos dovednosti na jiné úloze stejného typu.
5. Pravidelně absolvuje celou simulaci na dosud neviděném testu. Pokrok sledujeme odděleně od nacvičených otázek.

Příklad návrhu výstupu: „V práci se zlomky máš opakované chyby. Tento týden procvič třikrát po 15 minutách převod a porovnávání; příště ověříme i slovní úlohu.“ Konkrétní doporučení musí vycházet z odpovědí dítěte, ne z národní četnosti chyb.

Agregované položkové výsledky 2026 obsahují úspěšnost, volby chybných odpovědí a vynechání úloh. Ověřeny byly sešity češtiny a matematiky pro čtyřleté obory. To umožňuje sestavit mapu obtížnosti a zásobník typických omylů. Samotné vynechání však nedokazuje časovou tíseň a národní obtížnost se automaticky nepřenáší na novou AI úlohu. [Rozbory úloh CERMAT](https://data.cermat.cz/data-a-analyticke-vystupy-jednotna-prijimaci-zkouska/agregovana-data-jpz/agregovane-vysledky-uloh-jpz.html)

### Jak upravit existující PRD

- Zachovat první cílovou skupinu: deváťáci a čtyřleté maturitní obory. Výběr škol může být širší než rozsah přípravného modulu.
- Přeplánovat prošlý termín a rozdělit vydání na rozbor/plán a následně vlastní úlohy s tutorem.
- Zachovat dvoustupňovou diagnostiku. Po krátkém screeningu ukazovat předběžný profil; označení „kalibrovaný“ použít až po ověření přesnosti na skutečných výsledcích.
- Zachovat bezplatný pilot a případnou pozdější jednorázovou platbu za rozšířený obsah. Ceny zatím nemají oporu v ověřené poptávce.
- Digitální produkt doplnit doporučením řešit celé oficiální testy na papíře přes původní odkazy. Rýsování a práci se záznamovým archem samotné klikání nenacvičí. Je to návrh rozšíření proti původně čistě digitálnímu PRD.
- Podporu SVP a uchazečů s odlišným jazykem zahrnout alespoň do informačního průvodce a dostupnosti rozhraní. Specifické testové režimy vyžadují vlastní odborné ověření a nemusí být v prvním pilotu.
- Rodiči poskytovat přiměřený souhrn pokroku. Registraci, vazbu na dítě a uchovávání dat navrhnout před zavedením účtů; dítěti srozumitelně ukázat, kdo co uvidí.

AI tutor má pracovat se schválenou úlohou a řešením, nabídnout nápovědu a reagovat na konkrétní chybu. Body přiděluje definované hodnocení. U nejednoznačných otevřených odpovědí se systém zdrží rozhodnutí. Každá nová úloha potřebuje učitelskou kontrolu, pilotní odpovědi a možnost rychlého stažení.

Převzetí testů a klíčů CERMAT do vlastní aplikace nelze automaticky odvozovat z jejich veřejné dostupnosti. Podmínky povolují odkazování; pro další zpřístupnění testové dokumentace stanovují omezení. První verze proto může pracovat s odkazy a vlastním obsahem, licenci k případnému převzetí řešit samostatně. [Pravidla CERMAT](https://prijimacky.cermat.cz/files/files/CZVV_pravidla-vyuziti-webstrankyp.pdf)

## 6. Kontakty na školy využít pro ověřování i distribuci

Navrhuji pilot 50–100 SŠ různého typu a regionu. Škole nabídnout předvyplněný profil a stručný přehled jejího přijímacího řízení. Požádat o kontrolu konkrétních údajů pro 2027: vypsané obory, plánovaná/potvrzená kapacita, místo výuky, školné, otevřené dveře, přípravné akce, ubytování a odkaz na kritéria.

Opravy přijímat formulářem přes ověřený kontakt. Změny projdou moderací, u každého údaje zůstane zdroj a datum. Školní prezentace nesmí přepisovat oficiální výsledky ani inspekční závěry. Označení „potvrzeno školou dne…“ vyjadřuje původ údaje, ne hodnocení kvality.

Pracovní návrh sdělení pro oprávněné adresáty:

> Předmět: Kontrola údajů vaší školy pro přijímání 2027
>
> Připravujeme přehled oborů a přijímacího řízení pro rodiny vybírající střední školu. Na vašem profilu jsme předvyplnili dostupné informace. Prosíme o kontrolu nabídky pro rok 2027, termínů otevřených dveří a odkazu na kritéria. Změny můžete navrhnout přímo ve formuláři u profilu. K dispozici budete mít i odkaz na souhrn zveřejněných dat vaší školy.

Pro pravidelné novinky rozdělit publikum: SŠ opravují profily a publikují akce, základní školy a poradci distribuují rodinám průvodce a přípravu. Databáze SŠ automaticky nezajišťuje distribuční síť mezi deváťáky. Doplnit tedy partnerství se ZŠ a poradci.

Před marketingovou rozesílkou rozlišit souhlasy, existující vztahy a pouze veřejné kontakty. Veřejná adresa sama neopravňuje k obchodním sdělením, včetně sdělení právnickým osobám; posoudit konkrétní účel a obsah pilotu. Evidence odhlášení má být společná všem kampaním. [ÚOOÚ – obchodní sdělení](https://uoou.gov.cz/index.php/profesional/qa-otazky-a-odpovedi/obchodni-sdeleni)

Měřit dokončené kontroly profilů, opravené údaje, stáří informací a návštěvy z materiálů škol. Otevření e-mailu samo nepotvrzuje užitek. V této práci nebyly e-maily rozesílány.

## 7. Datový základ pro opakovatelnou aktualizaci

Návrh modelu odděluje školu a místo výuky, oborovou nabídku, sezónu a kolo přijímání, kritéria a statistický snímek. Je to návrh k ověření, nikoli přijaté architektonické rozhodnutí.

U každého importu ukládat zdrojovou URL, kontrolní součet, datum stažení, datum platnosti, rok, kolo, význam ukazatele, jednotku a populaci. Ve veřejném rozhraní ukazovat čitelné datum a zdroj. U nabídky 2027 rozlišit „historie 2026“, „plán školy“ a „vyhlášeno pro 2027“.

Neprovádět globální nahrazení 2026 za 2027. Výsledkové stránky zachovat jako archiv. Ze sezónní konfigurace řídit kalendář a nabídku. Výsledky roku 2027 budou dostupné teprve po příslušných událostech.

Doporučené kontroly před publikací:

- jednoznačnost klíčů, ztracené a nové obory, pokrytí typů studia;
- zdrojové součty a oddělení uchazečů od přihlášek;
- jednotky, chybějící hodnoty a oddělené populace pro předměty;
- párování přejmenovaných nebo rozdělených nabídek;
- vzorek profilů napříč typy škol, cizojazyčnými a upravenými testy;
- ověření veřejného výsledku po aktualizaci, včetně městských souhrnů a titulků.

Pro osobní odhad nejprve připravit zpětné ověření na dosud nepoužitém ročníku: pravidla navrhnout na 2024–2025, vyhodnotit na 2026, bez použití výsledků 2026 při trénování. Rozlišit „přijat jinam dle preference“ od zamítnutí pro kapacitu. Dokud nezískáme a neověříme školní kritéria a kalibraci, publikovat historická pásma a scénáře místo osobního procenta. U malých vzorků zobrazit nedostatek dat. Percentily pomohou kontextu ročníku, samy nezaručují srovnatelnou obtížnost ani příští přijetí.

## 8. Pořadí realizace a odhad kapacit

Odhady jsou pracovní předpoklad pro jednoho zkušeného vývojáře se znalostí projektu, dostupného správce dat a průběžnou redakční spolupráci. Zahrnují ověření změněných cest; čekání na školy a odborníky může kalendář prodloužit. Nejde o cenovou nabídku.

| Balík | Obsah | Pracnost |
|---|---|---:|
| A – obnova a opravy významů | Srpnové výsledky, zdroje, párování, popisky, kalendář 2027 | 8–12 člověkodnů |
| B – nabídka a ověřování | Obory bez JPZ, sezónní nabídka, formulář škol, moderace a pilot | 10–15 člověkodnů |
| C – osobní výběr | Uložený seznam, srovnání, otevřené dveře, checklist a propojení dopravy | 8–12 člověkodnů |
| D – pilot přípravy | Rozbor, plán, menší sada původních úloh, omezený tutor a vyhodnocení | 20–35 člověkodnů + 40–80 hodin učitelské práce |

Pro A–C vychází přibližně 26–39 člověkodnů. Při menší kapacitě spustit v září alespoň kalendář včetně konzervatoří a korekci zavádějících tvrzení; zbytek A–C směřovat do podzimu. Pilot přípravy plánovat na listopad/prosinec podle zajištění obsahu. V lednu prioritizovat přepis a ověření konkrétních kritérií 2027. V únoru soustředit rozhraní na dokončení výběru a podání přihlášky. V březnu/dubnu na přípravu, v květnu/červnu na výsledky a další kola.

Kalendářní termíny škol nejsou termíny vydání našeho softwaru. Kritické listopadové informace o konzervatořích se musí objevit i tehdy, pokud plný katalog nebude dokončen.

Pilot hodnotit na 10–15 rodinách pro výběr škol a přibližně 30–50 žácích pro použitelnost přípravy. Tak malý vzorek neposkytne důkaz populační účinnosti nebo kalibrace predikce. Sledovat, zda rodina rozumí údajům, našla vhodnou alternativu, dokončila porovnání a zda se žák zlepšuje na jiných úlohách. Účinnost přípravy později ověřit s kontrolou výchozí úrovně, docházky a odpadávání uživatelů.

Rozpočet určit z člověkodnů a skutečné sazby týmu. U tutora průběžně měřit náklad na aktivního žáka, počet dotazů, latenci a chyby. Provozní cenu nemá smysl odhadovat bez zvoleného modelu a reálné spotřeby. Odborná validace obsahu je samostatná položka.

## 9. Co zatím odložit

- Jedno univerzální skóre kvality školy.
- Osobní procenta přijetí bez zpětného ověření a známých kritérií.
- Velkou knihovnu automaticky publikovaných AI úloh.
- Veřejné žebříčky dětí a automatickou psychologickou typologii.
- Rozesílku všech kontaktů bez rozlišení jejich původu a účelu.
- Úplný přepis aplikace před ověřením užitečnosti nových funkcí.

První konkrétní dodávka by měla spojit balík A s jednoduchou stránkou „Přijímačky 2027“ a ukázkovým profilem s oddělenou historií a novou nabídkou. To vytvoří podklad pro pilot se školami i testování s rodinami.
