# Doplněk návrhu simulátoru: učební obor jako pojistka bez bodů

Verze 0.2 · 1. 10. 2026 · **návrh, čeká na schválení vlastníkem projektu.** Na schválení čeká
etapa 5 fáze 2 oborů bez jednotné zkoušky (#244).

Doplňuje [návrh Simulátoru přijímaček](navrh-simulator-prijimacek-2027.md) (dále „návrh simulátoru“)
o otázku 6 z oddílu 16 [návrhu oborů bez jednotné zkoušky](navrh-obory-bez-jpz-2027.md) (dále
„návrh učebních oborů“): pojistka je dnes definovaná body, učební obor body nemá. Mechanismus
převzatý z návrhu učebních oborů (oddíl 11 a vypořádání O4 v oddílu 17) tu je rozepsaný do
pravidel, textů a kritérií přijetí. Nic jiného v návrhu simulátoru se nemění.

## 1. Proč

V datech uchazečů 2026 má 50 749 dětí na přihlášce obor H nebo E, 20 588 z nich ho kombinuje
s maturitním oborem a 18 627 má maturitní obor na prvním místě a učební jako pojistku (návrh
učebních oborů, oddíl 5.1; doklad `pojistky` v `docs/podklady/mereni-obory-bez-jpz-2026.json`).
Simulátor dnes takový obor zařadí do „Bez srovnání“ (důvod `chybi_data`), a protože u něj nezná
druh zkoušky, kontrolu přihlášky celou pozastaví (`talentovaZPasem` v `src/lib/strategie-prihlasek.ts`).

## 2. Pravidlo

1. **Učební obor** je obor kategorie **H nebo E** v denní nezkrácené formě (pojem ze slovníku
   pojmů podle návrhu učebních oborů, oddíl 13: „obor s výučním listem (kategorie H, případně E)“).
2. Učební obor je **pojistka**, když v 1. kole roku pásem platí obojí:
   - nikdo nebyl odmítnut kvůli kapacitě (`capacity_rejected` = 0), tedy stupeň
     `kapacita_nerozhodovala` ukazatele *Obtížnost přijetí slovy* (slovník ukazatelů);
   - soutěžících bylo aspoň `MIN_SOUTEZICICH_PRO_ZARAZENI` (dnes 10, `src/lib/obor-profil.ts`),
     tedy platí práh zobrazení obtížnosti.

   V datech 2026 to splňuje **574 nabídek H** (doklad `soutezici_prahy.pasma_H_nad_prahem`).
   Počet u E doklad zatím nenese; doplní se do `scripts/mereni-obory-bez-jpz.py` v etapě 5.
3. **Bodové skupiny se nemění** (nad / v / pod pásmem, obory, kde nikoho neodmítli, bez srovnání,
   návrh simulátoru oddíl 3 a 12). Učební obor do nich nepatří a s výsledkem testu se nesrovnává.
   Pojistkou je bez ohledu na zadaný test, takže kontrola funguje i bez testu.
4. Ve strategii (návrh simulátoru, oddíl 4 a 12, bod 2) učební pojistka **splní požadavek
   „aspoň jedna pojistka“** stejně jako obor nad pásmem, ale jen když se vejde do přihlášky
   (prvních N běžných přihlášek). Pojistka za posledním místem dostane stejnou výzvu „posuň ho výš“.
   Doporučení „pokud to jde, i obor ze skupiny Obory, kde nikoho neodmítli“ zůstává, jak je.
5. Učební obory se počítají mezi **běžné přihlášky**, ne talentové. Kontrola se kvůli nim
   nepozastavuje.

### 2.1 Ostatní nabídky bez jednotné zkoušky

| Kategorie | Rozhodnutí | Opora |
|---|---|---|
| H | pojistka podle pravidla výše | návrh učebních oborů, oddíl 11 |
| E | pojistka podle pravidla výše | pojem *učební obor* zahrnuje E (oddíl 13); viz otevřená otázka 1 |
| umělecké M a L (talentová zkouška) | **nejsou pojistka**, zůstávají „Bez srovnání“ s důvodem `talentova` | oddíl 11 („výjimka pro umělecké obory s talentovkou se nedělá“), návrh simulátoru oddíl 12 bod 7 a oddíl 13 („talentový obor pojistkou není“) |
| P (konzervatoře) | **nejsou pojistka**, „Bez srovnání“ s důvodem `talentova`; jestli budou na webu vůbec, rozhodne etapa 0 (#244, ot. 2) | jako umělecké obory |
| C (praktická škola) | návrh učebních oborů pro simulátor neurčuje; **zatím nejsou pojistka**, „Bez srovnání“ | otevřená otázka 2 |
| J | podle rozhodnutí etapy 0 (#244, ot. 3); pokud se zahrnou, **zatím nejsou pojistka** | otevřená otázka 2 |

Nástavby L/51 mají jednotnou zkoušku (návrh učebních oborů, oddíl 3.2) a řídí se bodovými
skupinami. Nedenní nástavby se v simulátoru nezobrazují (jsou jen „kam dál“, oddíl 10.6).

## 3. Jak se to ukáže

**Rozsah výsledků.** Patička výsledků dnes říká „v rozsahu denních nezkrácených oborů s povinnou
JPZ“ (`SimulatorClient.tsx`). Jakmile výsledky obsahují kteroukoli nabídku bez jednotné zkoušky
(učební obor, umělecký obor, konzervatoř, C, J), nebyla by to pravda. Patička se proto odvodí
z kategorií, které výsledky skutečně obsahují: „denních nezkrácených oborů s jednotnou zkouškou“
a podle potřeby „…, učebních oborů“ a „…, oborů s talentovou zkouškou bez jednotné zkoušky“;
C a J se zmíní, jen když jsou na webu a ve výsledcích.

Žádné body, pásmo, poloha vůči pásmu, nejnižší přijatý ani odznak obtížnosti; u učebních oborů
nejsou (návrh učebních oborů, oddíl 10.2). Rok je vždy rok pásem z registru, jako u ostatních vět.

**Blok „Učební obory“** v kroku 2, samostatně pod bodovými skupinami, viditelný i bez zadaného
testu. Řadí se stejně jako ostatní výsledky (dojezd, pak abecedně); bez řazení podle obtížnosti.
Věta pod názvem:

> Učební obory končí výučním listem. Jednotná přijímací zkouška se u nich nekoná, proto tvůj
> výsledek testu s nimi nesrovnáváme. Ukážeme jen, jestli v 1. kole {rok} přijali všechny
> soutěžící uchazeče, tedy ty, kdo splnili požadavky školy a nedostali se na obor, který měli
> na přihlášce výš.

Věta u oboru:

| Stav | Věta |
|---|---|
| pojistka | „V 1. kole {rok} tu nikoho neodmítli kvůli počtu míst: přijali všechny soutěžící uchazeče (přijato {přijatí}).“ |
| pojistka, mnoho uchazečů nedosáhlo požadavku školy | k větě výše: „Požadavku školy, například minima z kritérií, ale nedosáhlo {nesplnili} uchazečů.“ Pokračování věty závisí na tom, co stránka oboru má: s přepsanými kritérii přijetí „Kritéria jsou na stránce oboru.“, bez nich „Přečti si kritéria, která škola vyhlašuje na svém webu.“ (pokrytí kritérií u učebních oborů zatím není změřené, návrh učebních oborů je neslibuje). Ukáže se, když počet uchazečů, kteří nedosáhli požadavku školy (`conditions_not_met`), dosáhne počtu přijatých nebo 20 % přihlášek (stejné pravidlo jako u *Obtížnosti přijetí slovy*). |
| kvůli počtu míst někoho odmítli | „V 1. kole {rok} tu kvůli počtu míst někoho odmítli, proto ho jako pojistku nepočítáme. Podrobnosti jsou na stránce oboru.“ |
| nikoho neodmítli, ale méně než 10 soutěžících | „V 1. kole {rok} tu nikoho neodmítli kvůli počtu míst, ale o místo soutěžilo jen {soutěžící} uchazečů; z tak malého počtu pojistku neurčujeme.“ (Věta nesmí odporovat stránce oboru, která tu ukáže „místo pro všechny“, viz oddíl 4.) |
| chybí počty | „Pro tento obor nemáme počty z 1. kola {rok}.“ |

Předchozí ročník (spárovaná nabídka): k větě pojistky „Rok předtím také.“, nebo „Rok předtím tu
kvůli počtu míst někoho odmítli.“ U nespárované nabídky se nepíše nic.

**Strategie.** Když je pojistkou učební obor: „Pojistku máš: {obor}, učební obor, kde v 1. kole
{rok} nikoho neodmítli kvůli počtu míst. Platí to jen, když splníš požadavky školy.“ Standardní
věta, že pořadí na přihlášce šanci na přijetí nemění, zůstává. Výhrada 3 („skupiny popisují
1. kolo {rok}, ne předpověď“) platí i pro učební obory a v textu výhrad se o ně rozšíří.

Simulátor **sám učební obor nenavrhuje**: `navrhniPojistku` se nemění a dál nabízí jen obory
nad pásmem. Učební pojistku navrhne jen tehdy, když rodina už nějaký učební obor zvažuje, a to
se stejným oborem. Dělá to **samostatná funkce** (pracovně `navrhniUcebniPojistku` v
`src/lib/strategie-prihlasek.ts`), ne rozšíření `navrhniPojistku`:

- volá se jen tehdy, když strategie nemá pojistku a mezi zvažovanými je aspoň jeden učební obor;
- kandidáti jsou výsledky hledání (už omezené místem a filtrem), které nejsou mezi zvažovanými,
  jsou učební pojistkou podle oddílu 2 a mají kód oboru (KKOV) shodný s některým zvažovaným
  učebním oborem;
- řazení jako u `navrhniPojistku` (dojezd, bez dojezdu podle názvu), nejvýš 3 návrhy;
- když `navrhniPojistku` i nová funkce něco vrátí, ukážou se oba návrhy, každý se svou větou;
  pořadí bloků nevyjadřuje, která pojistka je lepší.

Důvod: nevytvářet hierarchii „maturita nahoře, učební obor dole“ (#244, omezení).
Viz otevřená otázka 3.

**Pojem.** Ve slovníku pojmů se *pojistka* rozšíří o učební obor (v dávce s implementací):
„…, nebo učební obor, kde v 1. kole daného roku nikoho neodmítli kvůli počtu míst
(aspoň 10 soutěžících uchazečů)“. Nepoužívat dál „jistota“, „jistá škola“, „záchranná škola“.

**Slova ve větách** se drží slovníku pojmů: „nedosáhli požadavku školy“ a „požadavky školy“, ne
„nesplnili podmínky“ ani „podmínky školy“ (pojmy *nedosáhli požadavku školy* a *požadavek školy*);
„místo pro všechny“ se nepíše, protože u pojistky by znělo jako záruka (pojem *obory, kde nikoho
neodmítli*). *Soutěžící uchazeči* se vysvětlují při prvním výskytu v bloku (věta pod názvem bloku).

## 4. Krajní případy

- **Chybějící data.** Nabídka bez řádku v datech 1. kola (nový obor, nevypsaná loni) nebo
  z 53 nabídek bez počtů (návrh učebních oborů, oddíl 3.3) pojistkou není. Chybějící údaj
  není nula: nikdy se nepočítá jako „nikoho neodmítli“. Soutěžící jsou definovaní jako přijatí +
  nepřijatí kvůli kapacitě (`soutezicichUchazecu` v `src/lib/obor-profil.ts`); chybí-li jedno
  z polí `prijati` a `capacity_rejected`, soutěžící nejdou spočítat a platí „nemáme počty“.
- **Malé skupiny.** Pod prahem 10 soutěžících pojistkou není, i když nikoho neodmítli. V datech
  2026 je pod prahem 641 z 1 776 nabídek H a 379 z 519 nabídek E (oddíl 3.6). Pozor na dvě
  místa, která práh u tohoto stupně nemají: `zarazeniObtiznosti` v `src/lib/obor-profil.ts`
  vrací `kapacita_nerozhodovala` při nule odmítnutých ještě před kontrolou prahu (stránka oboru
  tedy „místo pro všechny“ ukáže i pod 10 soutěžícími) a bodový simulátor skupinu „Obory, kde
  nikoho neodmítli“ práhem neomezuje. Doplněk práh drží, protože z něj vychází číslo 574
  v návrhu učebních oborů a pojistka je silnější tvrzení než popis ročníku; viz otevřená otázka 4.
- **2. kolo.** Pojistka stojí jen na 1. kole; simulátor je o 1. kole (návrh simulátoru, oddíl 6).
  Data 2. kola (1 024 nabídek H, 304 E, oddíl 4) se v simulátoru neukazují; stránka oboru je
  ukáže a věta u oboru na ni odkazuje.
- **Změna mezi roky.** Pojistka platí pro jeden ročník. Předchozí ročník se jen připíše (oddíl 3),
  pojistkou se obor nestane ani nepřestane být. Stabilita klíče nabídky H mezi roky se měří
  v etapě 0 (#244, ot. 4); bez spárování se předchozí ročník nepíše.
- **Zaměření.** Agregáty 1. kola jsou po nabídkách včetně zaměření; pojistka platí pro konkrétní
  nabídku, ne pro celý obor školy.
- **Druh studia.** Učební obory přijímají po 9. třídě; při volbě „po 5. / 7. třídě“ se blok
  neukazuje. Filtr „po 9. třídě“ dnes pouští jen délku studia 4 a 5 (`SimulatorClient.tsx`,
  podmínka `grade === '9'`), takže dvou- a tříleté učební obory by do výsledků nepronikly.
  Podmínka se změní tak, že po 9. třídě projdou i učební obory (kategorie H a E) bez ohledu
  na délku; výběr konkrétní délky studia dál filtruje přesně podle délky.
- **Uložené starší výběry.** Učební obor uložený dřív (bez řádku v indexu) se po nasazení
  vyhodnotí podle nových dat; kontrola se kvůli němu už nepozastaví.

## 5. Data

Zdrojem jsou pole `capacity_rejected`, `prijati`, `conditions_not_met`, `prihlasky` a
`zarazeni_obtiznosti` v `public/souhrny_kolo1.json` poté, co je etapa 1 (#244) doplní o nabídky bez zkoušky. Simulátor
nenačítá celé soubory (návrh simulátoru, oddíl 8): kompaktní index se rozšíří o řádky **všech
nabídek bez jednotné zkoušky, které jsou na webu**, nebo vznikne vedlejší malý index; volba je na
implementaci, velikost se změří a zapíše. Bez řádku by obor dostal `chybi_data` a
`talentovaZPasem` by kontrolu pozastavil, takže řádek potřebuje každá kategorie z oddílu 2.1:

| Kategorie | Řádek v indexu |
|---|---|
| H, E | příznak učebního oboru, `talentova` = 0, příznak pojistky a počty pro věty |
| umělecké M a L, P | `talentova` = 1, bez pásem; v kontrole se počítají mezi talentové přihlášky |
| C (a J, pokud jsou na webu) | `talentova` = 0, bez pásem a bez příznaku pojistky |

Druh zkoušky (talentová ano/ne) se bere ze stejného zdroje jako dnes u oborů se zkouškou;
když ho zdroj u nabídky nenese, řádek vznikne bez něj a kontrola se pozastaví jako dosud. To
vyžaduje úpravu načítání: `nactiIndexPasem` (`src/lib/poloha-vuci-pasmu.ts`) dnes chybějící
`talentova` převede na `false` (`hod('talentova') === 1`). Pole se proto změní na `boolean | null`
(chybějící hodnota = `null`) a `talentovaZPasem` vrátí `null` i pro řádek s neznámým druhem zkoušky.

**Klíč.** Index pásem je po oborech: `klicPasma` zkrátí id nabídky na `REDIZO_KKOV`. Pojistka ale
platí pro konkrétní nabídku včetně zaměření (oddíl 4), takže příznak pojistky a počty pro věty
se **nesmějí** ukládat pod klíč `klicPasma`. Ukládají se po celém id nabídky
(`REDIZO_KKOV_zaměření`, jako klíč v `souhrny_kolo1.json`); jinak by počty jednoho zaměření
rozhodly o pojistce jiného. Druh zkoušky může zůstat po oborech jako dosud. Nová datová sada
nevzniká. Body uchazeče dál neopouštějí prohlížeč.

## 6. Kritéria přijetí (etapa 5)

- [ ] Učební obor H/E splňující pravidlo z oddílu 2 je v kontrole strategie pojistkou; počet
      takových nabídek H za rok 2026 je 574 a sedí s dokladem, počet E se zapíše do dokladu.
- [ ] Bodové skupiny a jejich věty se nezměnily (stávající testy `poloha-vuci-pasmu` zelené).
- [ ] Umělecké M/L a P zůstávají „Bez srovnání“ s důvodem `talentova` (mají řádek v indexu
      s `talentova` = 1, kontrola se kvůli nim nepozastaví); C (a J, pokud jsou na webu)
      pojistkou nejsou.
- [ ] Při volbě „po 9. třídě“ se ve výsledcích objeví dvou- i tříleté učební obory; při volbě
      „po 5. / 7. třídě“ ne (test filtru).
- [ ] Patička rozsahu výsledků odpovídá kategoriím ve výsledcích, včetně nabídek bez jednotné
      zkoušky mimo blok učebních oborů.
- [ ] Příznak pojistky se čte po celém id nabídky; dvě zaměření téhož oboru na jedné škole
      s různými počty dostanou každé svůj výsledek (test).
- [ ] Řádek indexu bez `talentova` se načte jako `null` a kontrola se pozastaví (test).
- [ ] Učební obor bez dat, s rozporem počtů, pod prahem 10 soutěžících nebo s odmítnutými kvůli
      kapacitě pojistkou není a má větu z oddílu 3.
- [ ] Kontrola přihlášky se kvůli učebnímu oboru nepozastaví; učební obory se počítají mezi běžné
      přihlášky; učební pojistka za posledním místem přihlášky dostane výzvu „posuň ho výš“.
- [ ] Učební pojistka funguje i bez zadaného testu.
- [ ] U učebních oborů se v simulátoru nezobrazí žádný bodový údaj ani odznak obtížnosti.
- [ ] `navrhniPojistku` se nemění a učební obor nenabízí; `navrhniUcebniPojistku` nabídne jen
      učební pojistku se stejným KKOV jako zvažovaný učební obor, a když žádný učební obor
      zvažovaný není, nevrátí nic.
- [ ] Každá věta nese rok z registru; výhrady se zobrazují i u bloku učebních oborů.
- [ ] Věty používají pojmy ze slovníku (*požadavek školy*, ne „podmínky“; bez „místo pro všechny“)
      a *soutěžící uchazeče* vysvětlují při prvním výskytu v bloku.
- [ ] Slovník pojmů (*pojistka*) a slovník ukazatelů (*Obtížnost přijetí slovy*, „Kde se
      zobrazuje: simulátor“) doplněny v téže dávce.
- [ ] Testy čistých funkcí: pojistka ano/ne pro každý stav z oddílu 3 a 4, H vs. E vs. talentové,
      bez testu, uložený starší výběr.

## 7. Otevřené otázky pro vlastníka projektu

1. **E a citlivá skupina (O9).** Návrh učebních oborů u E skrývá odznak obtížnosti i filtr.
   Doplněk E pojistkou počítá, protože věta mluví o místech, ne o obtížnosti, a neřadí ani
   nefiltruje. Souhlas, nebo u E pojistku vynechat?
2. **C a J.** Návrh učebních oborů je pro simulátor neurčuje. Doplněk je pojistkou nepočítá
   (nejsou učební obory podle pojmu z oddílu 13). Ponechat?
3. **Návrh učební pojistky.** Má simulátor nabídnout učební obor jako pojistku i rodině, která
   žádný nezvažuje? Doplněk to nedělá kvůli hierarchii.
4. **Práh 10 soutěžících.** Doplněk ho drží (odpovídá číslu 574 z návrhu učebních oborů).
   Stránka oboru i bodová skupina „Obory, kde nikoho neodmítli“ ho u tohoto stupně nemají
   (oddíl 4). Ponechat práh jen pro pojistku, nebo ho zrušit a sjednotit se stránkou oboru
   (počet pojistek H by pak bylo nutné změřit znovu)?
5. **Asymetrie s obory se zkouškou.** Obor se zkouškou, kde nikoho neodmítli, pojistkou není
   (body mohly být pod minimem školy), učební obor se stejnou vlastností ano. Doplněk to drží
   podle návrhu učebních oborů a připomíná požadavky školy větou z oddílu 3. Souhlas?

## 8. Historie

| Verze | Změna |
|---|---|
| 0.2 | Review (1. 10. 2026): věty podle slovníku pojmů (*nedosáhli požadavku školy* místo „nesplnili podmínky“, bez „místo pro všechny“), vysvětlení soutěžících uchazečů v úvodu bloku; návrh učební pojistky jako samostatná funkce (`navrhniUcebniPojistku`) místo rozporu s `navrhniPojistku`; řádky indexu pro všechny kategorie bez zkoušky (umělecké M/L a P s `talentova` = 1), `talentova` jako `boolean | null`, odkaz na kritéria jen tam, kde je stránka oboru má, pojistka po celém id nabídky (ne `klicPasma`); patička rozsahu výsledků podle všech kategorií ve výsledcích; filtr „po 9. třídě“ pouští učební obory bez ohledu na délku studia; kontrola „rozporu počtů“ nahrazena chybějícím polem, protože soutěžící jsou z definice přijatí + nepřijatí kvůli kapacitě. |
| 0.1 | První návrh doplňku (#244, etapa 5; návrh učebních oborů oddíl 16 ot. 6, oddíl 17 O4). |
