# Překonaná rozhodnutí kolem sklízení školních novinek

**Verze:** 1.3
**Datum:** 20. 9. 2026 (třetí revize téhož dne: po nálezu k InspIS PORTÁLu, po rozhodnutí zadavatele a po vypořádání oponentury tohoto přehledu)
**Co prověřuje:** všechna rozhodnutí z [návrhu sklízení novinek](skolske-novinky-rss-2027.md) v1.0–1.4 a z pěti oponentur ([1](oponentura-skolske-novinky-rss-2027.md), [2](oponentura-skolske-novinky-rss-2027-v1.1.md), [3](oponentura-skolske-novinky-rss-2027-v1.2.md), [4](oponentura-skolske-novinky-rss-2027-v1.3.md), [5](oponentura-skolske-novinky-rss-2027-v1.4.md)), a k nim rozhodnutí v [sledování škol](sledovani-skol-2027.md) a [portálu pro školy](portal-pro-skoly-2027.md), která na novinky navazují.
**Otázka:** které dřívější rozhodnutí dnes brzdí hlavní záměr, tedy skenovat novinky na školních webech, zařadit je do datové struktury a lépe tím informovat rodiče a uchazeče.
**Reprodukce měření:** `python3 scripts/rss-klasifikace-mereni.py --offline`; nová sonda k pokrytí je popsaná v oddílu 3, P2.

Závěr napřed: **brzdou jsou tři předpoklady o okolí — a v kódu byly tři vady, které mezitím padly.** (Verze 1.1 tvrdila, že kód brzda není; oponentura přehledu to vyvrátila třemi reprodukcemi a vady jsou opravené, viz oddíl 8, H1.) Pole, ze kterého web dnes bere termíny dnů otevřených dveří, školy přestaly udržovat — a obnova zdroje to nespraví. Strop pokrytí RSS je polovina přihlášek a cesta za tu polovinu je odložená až za pilot, ačkoli je měřitelně dostupná. A úložiště, kvůli kterému čeká per-školní e-mail, je od minulého týdne postavené a v provozu.

**Zadání rozsahu (zadavatel, 20. 9. 2026):** **poptávka je po jediném údaji — kdy má škola den otevřených dveří.** Školné rodina zpravidla zná a loňská hodnota platí i letos, takže obnova takových polí je vedlejší. Všechno v tomhle přehledu se proto řadí podle toho, jestli to přiblíží čerstvý termín DOD.

**Pořadí zdrojů (zadavatel, 20. 9. 2026):** 1. vlastní hlášení školy (portál) → 2. RSS → 3. `sitemap.xml` → 4. snímky webu přes službu typu Exa. Dřívější zdroj má přednost; pozdější doplňuje, co dřívější nepokryl.

**Stav k 20. 9. 2026:** zadavatel rozhodl o P1, P2, P5, P6 a P7 — viz oddíl 5.

---

## 1. Povinná inventura zdrojů

Podle `.claude/CLAUDE.md` musí každý návrh projít `docs/zdroje-dat.md` celý včetně oddílu 3 a napsat, které nepoužité sloupce zvážil a proč je nepoužije. Pro sklízení novinek:

| Nepoužitý sloupec (oddíl 3) | Proč ho novinky nepoužijí |
|---|---|
| Dobíhající obor (rejstřík `dobihajiciObor`) | používá se od 18. 9. 2026 jinde; říká, že se obor nenabírá, ne co škola oznámila — nemá datum zveřejnění ani text sdělení |
| Web a kontakt školy (`WWW`, `Email 1`, `Telefon`) | `WWW` je **vstup této funkce** (`skoly_web.json`, vstup sondy feedů); telefon a e-mail na web nepatří a funkce školy nikdy sama neoslovuje |
| Platnost oboru v číselníku (AKKO `platnostDo`) | celostátní změna, ne událost školy; rodina podle ní nic nedělá v termínu |
| Agregáty 2. kola, data uchazečů 2. kola | popisují loňské 2. kolo; novinky oznamují **letošní vyhlášení** — doplňují se, nenahrazují ([druhé kolo](druhe-kolo.md)) |
| `hard_facts.support_services`, `hard_facts.absence` | vlastnosti školy, ne události; bez data zveřejnění |
| Ředitel a délka funkce | jediný sloupec, který by mohl vypadat jako signál „co se ve škole děje“; oddíl 3 ho zamítá pro spornou vypovídací hodnotu a událostí by se stal až čtvrtletním rozdílem rejstříku — viz P4, kde je místo pro takové zdroje událostí, ale ne v novinkách |
| Maturitní výsledky, vstupní úroveň 2017–2023, profil dovedností `b1`–`b16.x`, výsledky po termínech, oficiální min/max přijatých, přijatí podle priority, `jpz_median`, důvod nepřijetí | všechno jsou statistiky o proběhlém přijímacím řízení; žádná z nich nenese datum zveřejnění ani oznámení, což je přesně to, čím novinka je |

**Nový zdroj, který tento přehled zavádí:** stránka aktualit na webu školy v HTML (oddíl 3, P2). Zatím je jen změřená, nepoužívá se. Ve chvíli, kdy se začne používat, musí ve stejné dávce vzniknout záznam v `docs/zdroje-dat.md` a sada v `public/stav_datovych_sad.json` — stejně jako plánovaná sada `skoly-weby-rss`, která v registru dosud **není** (registr má 19 sad).

---

## 2. Co se od rozhodnutí změnilo

| Kdy | Co se změnilo | Které rozhodnutí to zasáhlo |
|---|---|---|
| od 10. 8. 2026 | otevřená data ČŠI sadu 70 stáhla, workflow obnovy InspIS padá; profil ale zůstal na InspIS PORTÁLu a sada 69 žije | „termíny DOD bereme z InspIS a z portálu“ — neplatí kvůli stáří pole, ne kvůli zdroji |
| 13.–18. 9. 2026 | Postgres u Neonu, migrace `001-novinky.sql` a `002-portal.sql`, odběratelé, dávky, rozpočet, webhooky, Resend | „úložiště odběrů web nemá“ |
| 19. 9. 2026 | sonda feedů: 533 z 1 093 škol | „zbytek doženeme fází 3 po pilotu“ |
| 20. 9. 2026 | měření publikačního rozhodnutí a nová sonda cest k novinkám | rozsah a pořadí fází |

---

## 3. Překonaná rozhodnutí

### P1. InspIS není mrtvý, ale pole dnů otevřených dveří ano

**Původní stav.** Stránka školy odpovídá na otázku „kdy je den otevřených dveří“ ze dvou zdrojů: z portálu školy, když ho škola potvrdila (`src/lib/portal-skol.ts:406-409`, zobrazení `ProfilSkoly.tsx:235`), jinak z archivního textu InspIS (`SchoolInfoSection.tsx:79` přes `ArchivedAdmissionText`).

**Co se změnilo.** Registr sad, `csi-inspis`: *„Datová sada 70 z otevřených dat ČŠI zmizela: stránka vrací 404… Workflow InspIS Weekly Refresh proto padá od 10. 8. 2026.“* Zobrazené období stojí na **11. 2. 2026**.

**Oprava původního závěru (20. 9. 2026).** První znění tohoto oddílu tvrdilo, že zdroj je nedosažitelný. Není. Sada **69** (inspekční zprávy) žije, obnovuje se čtvrtletně a projekt ji už používá (`scripts/process-csi-data.js`, sada `csi-inspekce`); profily škol navíc zůstaly na **InspIS PORTÁLu** na adrese `https://portal.csicr.cz/School/{REDIZO}`. Sonda 60 škol ze snímku (`scripts/sonda-inspis-portal.py`, data `data/sondy/inspis-portal-20260920.json`): **60/60 stránek staženo, bez přihlášení, profil v plném rozsahu.** Lidský krok, který registr u `csi-inspis` vede jako otevřený („najít nový zdroj profilů InspIS“), tedy odpověď má — sběrač portálu místo staženého CSV.

**Co to ale neopravuje.** Čerstvost. Hodnota na portálu je prakticky táž jako v našem snímku: `dny_otevrenych_dveri` **50/60 shodných** (zbytek jsou rozdíly v mezerách a nbsp, jediná skutečná změna je zhoršení — z `12.12.2024, 13.2.2025` na `v rámci DOD při DLPP`), `prijimaci_zkousky` 57/60, `termin_prijimacich_zkousek` 55/60. Rozdělení letopočtů na portálu je stejně staré jako u nás — **2026 jen u 1 z 60**, 2025 u 14.

**Závěr, který z toho plyne.** Pole není zastaralé proto, že se rozbilo potrubí, ale proto, že **školy ho v InspIS přestaly udržovat**. Obnova zdroje na tom nic nezmění. To původní doporučení nevyvrací, zesiluje ho: novinky z webu školy jsou jediný zdroj, kde termín vzniká tehdy, kdy ho škola opravdu vyhlásí. Ve snímku má `dny_otevrenych_dveri` vyplněno 998 z 1 180 škol, ale **704 z nich (71 %) nese ročník 2024 a starší nebo žádný**:

| letopočet v textu | 2026 | 2025 | 2024 | 2023 | 2022 a starší | bez letopočtu |
|---|---:|---:|---:|---:|---:|---:|
| škol | 57 | 237 | 162 | 147 | 231 | 164 |

Proto stránka u těchto polí píše „Pro rok 2027 neověřeno. Aktuální údaj ověřte u školy.“ Portál školy to nespraví: pilot je 20 škol (`data/portal/pilot.json`).

**Nález navíc: portál nese pole, která CSV export sady 70 ztratil.** `docs/zdroje-dat.md`, oddíl 2.8, tvrdil o čtyřech polích *„Zdroj je nikdy nenaplnil“*. Pro tři z nich to není pravda — naplnil je, jen se nedostaly do exportu:

| pole | vyplněno na portálu | v našem snímku |
|---|---:|---:|
| `pristup_k_pc` | 54/60 | 0/60 |
| `vyuziti_internetu_ve_vyuce` | 48/60 | 0/60 |
| `stipendium` | 32/60 | 0/60 |
| `pripravne_kurzy` | 19/60 | 0/60 |
| `rocni_skolne` (kontrola) | 45/60 | 44/60 — **žádný zisk** |

Portál má i popisky, které snímek nezná vůbec, například „Počet přijatých studentů v aktuálním školním roce“ (6/60) a „Rozšířené informace o ročním školném“ (14/60). Přípravné kurzy jsou přitom údaj, na který se [portál škol](portal-pro-skoly-2027.md) ptá škol ručně.

**Návrh.**
1. Do §3.6 návrhu přidat třetí případ konfliktu: **RSS termín s explicitním rokem archivní údaj InspIS nahrazuje**, nepotlačuje se rozporem; u obou se ukazuje původ a datum. Údaj z 11. 2. 2026, který nese rok 2022, nemá čím zpochybnit termín zveřejněný minulý týden.
2. **Postavit sběrač profilů z InspIS PORTÁLu** jako náhradu obnovy sady `csi-inspis` (~1 180 stránek čtvrtletně, vstup REDIZO z katalogu). Získá tím tři pole, která dnes nemáme vůbec, a vrátí sadě obnovitelnost. Termíny DOD tím čerstvé nebudou — to je práce pro novinky.
3. Opravit `docs/zdroje-dat.md`, oddíl 2.8: věta „Zdroj je nikdy nenaplnil“ neplatí, a doplnit, že pole přijímacího řízení nemají obnovu a stárnou.
4. V pořadí prací brát fázi 2 (karta na stránce školy) jako **opravu regrese**, ne jako nadstavbu.

### P2. Strop 49 % pokrytí a rozhodnutí odložit vše mimo RSS až za pilot

**Původní rozhodnutí.** §5(d) a fáze 5 v §6: „rozšíření mimo RSS (přijímací stránky a dokumenty škol) jako fáze 3 po pilotu“, odhad „per-site parsing, PDF — zvlášť, po měření“.

**Doklad k dosahu RSS.** 533 z 1 093 škol = 48,8 %. Vážení podle velikosti to nezlepší: školy s feedem mají **152 622 z 302 220 přihlášek 1. kola 2026 = 50,5 %**, medián přihlášek 226 proti 197 u škol bez feedu. Velké školy tedy pokryté lépe nejsou. Ze 560 škol bez feedu má **450 živou titulní stránku**, 50 vrací 401 a 44 je nedostupných. Doplnit další fallback cesty se nevyplatí: rozbitou deklaraci mělo 7 škol z prohledaných — což je počet nalezených rozbitých deklarací, ne horní mez feedů, které sonda vůbec neviděla.

**Doklad k cestě mimo RSS (sonda 20. 9. 2026, vzorek 80 z těch 450, seed 20260920).**

| Co se hledalo | Výsledek |
|---|---|
| odkaz na stránku aktualit přímo z titulky | **66 / 80 = 83 %** |
| `sitemap.xml` | 38 / 80, z toho 31 se zmínkou o aktualitách |
| obojí | 33 / 80 |

Generátor webu: **370 ze 450 škol nemá `meta generator` vůbec**, největší zbytek je Joomla se 16. Dominantní platformu to nevyvrací — `meta generator` je nepovinný a řada CMS ho neposílá; doloženo je jen to, že **z této hlavičky** se platforma určit nedá, takže na ni nelze stavět výběr parseru.

**Proč to brzdí.** Dvojí důvod. Za prvé, přes polovinu škol by z funkce nebylo vidět nic. Podíl 50,5 % je podíl **přihlášek**, ne rodin: jedna rodina podává až tři přihlášky a může kombinovat školu s feedem a bez něj, takže kolik rodin by nevidělo nic ani u jedné své školy, odsud nevyplývá. Pro konkrétní rodinu ta polovina náhodná není — je to prostě druhá půlka škol, na které se dívá. Za druhé, odhad fáze 5 („per-site parsing“) je postavený na předpokladu, který měření vyvrací: při 370 webech bez rozpoznatelné platformy se nepíšou parsery po weboch, ale **jeden obecný čtenář výpisu** (opakující se blok s datem, titulkem a odkazem). To je řádově jiná pracnost než „zvlášť, po měření“.

**Co tím ale neříkám.** 83 % je „má kandidátskou stránku aktualit“, ne „umíme z ní vytáhnout položky“. Přesnost extrakce z HTML výpisu je **neměřená** a bez ní se nic nezapíná.

**Návrh.** Přesunout mimo-RSS z fáze 5 na **měření hned po fázi 1**: obecný čtenář výpisu nad vzorkem těch 450 škol, výstup poslat do **téhož** `rozhodni_publikaci()` a měřit na téže jednotce (položka × třída) proti ruční referenci. Publikační rozhodnutí je na zdroji nezávislé, takže když měření vyjde, pokrytí se zdvojnásobí bez zásahu do zbytku řetězce. Když nevyjde, je to zamítnutí doložené měřením a zapíše se sem.

#### Co konkrétně zlepší stav informací (odpověď na dotaz zadavatele, 20. 9. 2026)

Seřazeno podle toho, kolik škol to přidá na jednotku práce. První tři se nevylučují a dají se dělat souběžně.

Žebříček je seřazený podle **pořadí zdrojů, které zadavatel rozhodl** (hlášení školy → RSS → sitemap → snímky webu), a jednotkou užitku je čerstvý termín DOD.

| # | Zdroj | Kolik škol | Co to stojí | Co je na tom neměřené |
|---|---|---|---|---|
| 1 | **Vlastní hlášení školy:** pole „adresa aktualit nebo RSS“ v portálu (P5, schváleno) | kolik škol portál získá; u každé trvale a s nejvyšší důvěrou | jedno pole ve formuláři + zápis do `skoly_feedy.json` | kolik škol pole vyplní — vyhodnotí pilot |
| 2 | **RSS** – dnešní návrh | 533 z 1 093 = 48,8 % škol, 50,5 % přihlášek | fáze 1–2 návrhu | — (přesnost změřená, úplnost ne) |
| 3 | **`sitemap.xml`** jako detektor změny | **38/80** vzorku má sitemap, 31 z nich se zmínkou o aktualitách | malý doplněk sklízeče | jestli `lastmod` školních webů odpovídá realitě |
| 4 | **Snímky webu** (Exa či podobná služba) nad stránkou aktualit | **66/80 = 83 %** škol bez feedu odkazuje stránku aktualit přímo z titulky | čtečka výpisu nebo externí služba | **přesnost extrakce** z HTML výpisu |
| 5 | Weby za HTTP 401 (50 škol) a nedostupné (44) | ≤94 | ruční průzkum | co za 401 je |

**Jedna věcná poznámka k pořadí 3 a 4.** `sitemap.xml` má ve vzorku **38 z 80** škol, kdežto odkaz na stránku aktualit **66 z 80**. Sitemap je tedy levnější, ale dosáhne zhruba na polovinu toho, co čtení výpisu. Navíc sitemap říká jen „tahle adresa se změnila“, ne „tohle je nová zpráva s tímhle datem“ — termín DOD z ní nevypadne, musí se stejně sáhnout na stránku. Doporučuji obojí brát jako jeden krok: **sitemap jako spouštěč, výpis jako zdroj obsahu.** Levná vlastní čtečka výpisu (opakující se blok datum + titulek + odkaz) je zároveň chudší verze toho, co by dělala externí snímkovací služba, a dá se vyzkoušet dřív a bez závislosti.

**Co se tím dostane k DOD.** Dnes 49 % škol. Krok 1 plus krok 4 mají **strop** ~90 % škol ((533 + 450) / 1 093 = 89,9 %), což je scénář úspěchu u všech 450 dostupných webů bez feedu; prosté přenesení četnosti 66/80 dává ~83 % škol s feedem nebo kandidátským odkazem, a to pořád před extrakcí. Změřené pokrytí DOD to není ani v jednom případě; termín DOD z toho ale poteče jen u těch, které ho vůbec zveřejní — kolik jich je, ukáže až sezóna říjen–leden, protože celé dosavadní měření leží mimo ni (P7).

**Čeho se naopak nedotknu.** Stahování PDF s kritérii přijetí: kritéria mají termín v harmonogramu MŠMT a odkaz na ně sbírá portál od škol; parsovat je nesystematicky z webů by vyrobilo třetí verzi téhož údaje.

### P3. „Úložiště odběrů web nemá“ — a proto per-školní e-mail čeká

**Původní rozhodnutí.** `docs/sledovani-skol-2027.md` §5: *„Seznam odběratelů nesmí do repozitáře… Potřebuje serverové úložiště; dnes web žádné nemá (portál používá GitHub issues a soubory).“* Otevřená otázka 1 je volba úložiště. Návrh novinek na to navazuje: e-mail fáze 2 je „N4 sledování škol“ s odhadem 2–3 dny (§4, §6).

**Co se změnilo.** Úložiště je postavené a v provozu: `db/migrace/001-novinky.sql`, `002-portal.sql`, Neon přes `@neondatabase/serverless`. `src/lib/novinky-schema.ts` nese `odberatel`, `zadost_o_potvrzeni`, `odber_novinek`, `doklad_souhlasu`, `zprava_verze`, `davka`, `polozka_odeslani`, `rezervace_kvoty`, `rozpocet_emailu`, `webhook_udalost`, `limit_potvrzeni`. Double opt-in, doklad souhlasu, dávkování, rozpočet i webhooky tedy existují; odesílá se přes Resend.

**Co chybí doopravdy.** Jedna tabulka `odber_skoly(odberatel_id, redizo)`, filtr v `naplnFrontu` a tlačítko. Odhad „2–3 dny“ byl nacenění světa, ve kterém nestálo nic z výše uvedeného.

**Návrh.** Opravit `sledovani-skol-2027.md` §5 a otevřenou otázku 1 (úložiště je rozhodnuté, ne otevřené) a přepsat odhad N4 v `skolske-novinky-rss-2027.md` §6. Pozor: to **nemění** spouštěcí kritérium e-mailu z §4 — to je o naměřené přesnosti, ne o pracnosti, a platí dál (viz oddíl 4).

### P4. Dva různé modely události pro jednu a tutéž věc

**Původní rozhodnutí.** `sledovani-skol-2027.md` §2: událost je soubor v gitu (`data/sledovani/udalosti/2027-02-15-cermat-prihlasky.json`), *„neobsahuje žádné osobní údaje, takže smí být v repozitáři“*; zdroje událostí jsou přepnutí sady, schválení v portálu a nová inspekce. Návrh novinek §3: *„živé položky nepatří do gitu“*, položky do Postgresu, git je auditní export.

**Proč to brzdí.** Obojí je správné ve svém kontextu a dohromady to nejde. Rodina, která sleduje školu, by dostala dvě nesouvisející potrubí a dva e-maily o téže škole. Navíc denní souhrn ze sledování je **přesně** ten frekvenční strop, který si novinky v §4 samy předepisují („max 1 školní e-mail/den/odběratele, jinak digest“). Nic z obojího zatím postavené není (`data/sledovani/` neexistuje), takže se to dá sjednotit zadarmo — za měsíc už ne.

**Návrh.** Jedna tabulka událostí v Postgresu, **novinky z webu školy jako čtvrtý zdroj událostí** vedle přepnutí sady, schválení v portálu a nové inspekce. Git zůstane auditním exportem, přesně v té podobě, na které se návrh novinek už dohodl u registru zdrojů („Git je auditní export, ne podmínka“). Jeden denní souhrn, seskupený podle události.

**Rozhodnuto 20. 9. 2026: schváleno a zapsáno.** Model události je v `src/lib/udalosti-schema.ts` → `db/migrace/004-udalosti.sql` (tabulky `udalost`, `udalost_skola`), podrobnosti a inventura zavržených zdrojů události v [sledování škol](sledovani-skol-2027.md), oddíly 2.1 a 2.2. Událost z novinky vzniká jen u publikačního rozhodnutí `karta_terminu` nebo `karta`; `odkaz` a `seznam` jsou zprávy ze života školy, ne důvod psát rodině. Zbývá postavit rozdílový skript, vazbu `odber_skoly` a denní odesílač — ty už P4 neblokuje.

### P5. Portál se školy neptá na adresu novinek

**Původní rozhodnutí.** `docs/portal-pro-skoly-2027.md` §3 sbírá dny otevřených dveří, odkaz na vyhlášená kritéria, přípravné kurzy a další; pole pro adresu novinek ani feedu tam není. Pravidlo zní: *„Nikdy nežádáme údaj, za který máme autoritativní zdroj.“*

**Proč to neplatí pro tohle pole.** Autoritativní zdroj adresy feedu **nemáme**. Sonda ji hádá ze `<link rel=alternate>` a z pěti typických cest a u 51 % škol neuhodne. Jedno pole „adresa stránky s aktualitami nebo RSS“ stojí školu jeden řádek a z každé školy v portálu udělá trvale pokrytou školu — a je to údaj, který škola zná líp než kdokoli jiný.

**Pozor na past, kterou projekt už zná.** Pole se **nesmí** předvyplnit adresou uhádnutou sondou: škola by odklikla něco, co neověřila, a vznikl by falešně potvrzený údaj. Nabídnout lze nanejvýš kontrolní otázku „na téhle adrese jsme našli vaše aktuality, souhlasí?“ s rovnocennou volbou „ne“.

**Návrh.** Přidat pole do profilu portálu, zapsat ho do `skoly_feedy.json` jako `zdroj: portal` s nejvyšší důvěrou a zahrnout mezi výstupy, které se u pilotu 20 škol vyhodnocují.

**Rozhodnuto 20. 9. 2026: schváleno**, škola se na adresu aktualit ptát může. Zapsat do `docs/portal-pro-skoly-2027.md` §3 ve stejné dávce, ve které pole vznikne, včetně výjimky z pravidla „nežádáme údaj, za který máme autoritativní zdroj“ a včetně zákazu předvyplnění uhádnutou adresou.

### P6. „Klasifikace jen klíčovými slovy“ — rozhodnuto bez zmínky o tom, že model už v projektu běží

**Původní rozhodnutí.** §2 návrhu: „klíčová slova jako výchozí metoda“. Model se v celém návrhu ani ve čtyřech oponenturách neobjevuje jako varianta.

**Rozhodnutí zadavatele (20. 9. 2026): klasifikaci dělat modelem, konkrétně [Jevem](https://openrouter.ai/typesafe/jev-1.13).** Jev je rozhodovací model — text negeneruje, vrací typovanou odpověď s pravděpodobností (`choice`, `noul`, `score`). Pro tuhle úlohu je to lepší volba než obecný model a tenhle oddíl se tím přepisuje.

**Proč zrovna Jev, a ne Haiku.** Projekt už má s Jevem změřený pilot na sesterské úloze (párování nabídek 2025→2026, zápis v `~/github/patrick-knowledgebase/tools/typesafe-jev.md`):

- **Chybuje konzervativně.** Když pár vybral, měl pravdu ve **107 ze 108** případů; při `confidence ≥ 0,5` **85 z 85**. Když si nebyl jistý, řekl „žádná“. To je přesně povaha, kterou autonomní provoz bez moderace potřebuje: nezachycená zpráva je chybějící záchyt, ne chybné tvrzení — přesně jak to formuluje §2 návrhu.
- **Česká instrukce vyšla lépe než anglická** (82 % proti 77 % celkové přesnosti).
- **Cena je mimo úvahu.** 164 volání po dvou otázkách stálo 0,0068 USD; okno 180 dní má 624 položek, tedy jednotky centů za celý archiv. Tím se poprvé stává levným to, co si návrh žádá v §3.7: **změna verze pravidel zařadí uložené položky k přepočtu**. U Haiku by přepočet archivu byl rozhodnutí, u Jeva je to položka bez ceny.

**Rozdělení práce: kód připraví, Jev rozhodne.** Jev nepočítá, neporovnává data a čte instrukce doslova, takže v kódu zůstává všechno početní:

| Krok | Kdo |
|---|---|
| rozdělení na klauzule, nalezení dat a normalizace textu | kód (`rozdel_klauzule`, `extrahuj_data_akce`) |
| **téma / jev** — o co ve zprávě jde | Jev, `choice` přes třídy + „nic z toho“ |
| **je to pro uchazeče o SŠ na téhle škole** — vylučovače VOŠ, VŠ, ZUŠ, cizí pořadatel | Jev, `noul` |
| **stav sdělení** — oznámeno / změněno / zrušeno / nejasné | Jev, `choice` |
| **role data** — akce / registrace / jiná, pro každé nalezené datum | Jev, `choice` nad klauzulí |
| kontrola roku, „datum ≥ datum publikace“, platnost kalendáře | kód |
| **publikační rozhodnutí** — karta s termínem / karta / odkaz / seznam a způsobilost pro e-mail | kód (`rozhodni_publikaci`) |

Všechny otázky jdou v **jednom volání** nad jedním `state`; stav je karta položky (titulek, datum publikace, popis, název a druh školy), ne text článku — Jev s délkou kontextu ztrácí kvalitu.

**Šest podmínek, které plynou z toho, co je změřené.**

1. **Publikační rozhodnutí zůstává v kódu.** Model dodává vstupy, ne verdikt. Závěr F5 ze čtvrté oponentury platí dál a je zároveň hlavní obranou proti podstrčené instrukci ve feedu školy: i kdyby útočník s Jevem pohnul, karta s termínem pořád vyžaduje pozitivní vazbu událost–termín–konání, kterou vyhodnocuje kód.
2. **Záporná odpověď Jeva nesmí nic potlačovat.** Pilot ukázal, že „žádná“ je spolehlivá jen asi z poloviny. Pravidla proto zůstávají jako záchytná síť: co zachytí pravidla a Jev ne, jde na neutrální odkaz, ne do koše.
3. **Pravidla zůstávají i jako regresní síť.** 47 testů v `tests/test_rss_klasifikace.py` musí platit dál; měří se na téže jednotce (položka × třída) proti `data/sondy/rss-klasifikace-reference.json`.
4. **Práh se kalibruje, nehádá.** Na 109 párech ruční reference se najde hranice `confidence`, při které Jev nezhorší žádnou třídu proti dnešku (téma 102/109 = 94 %, 60/60 párů vysoké jistoty). Prahy se **nepřenášejí mezi `noul` a `choice`** — nejsou vzájemně konzistentní.
5. **Verze modelu je součástí verze pravidel.** Pinovat `typesafe/jev-1.13`, ne `~typesafe/jev-latest`: `verze_pravidel` je auditní údaj a spouštěč přepočtu, takže se model nesmí měnit pod rukama.
6. **Offline měření musí dál běžet bez sítě.** Odpovědi se ukládají do mezipaměti podle otisku karty (stejně jako u souvisejících článků na Vibecoding.cz) a přikládají ke zmrazenému vzorku, aby `--offline` zůstalo reprodukovatelné i v čistém CI.

**Co se tím navíc vyřeší.** Úplnost je dodnes **neměřená** a k jejímu změření je potřeba ručně označit všechny položky vzorku, ne jen zásahy. Jev proteče oknem 624 položek za pár centů a ručně se doznačí jen neshody proti pravidlům. Ta práce se udělá jednou a platí pro obě metody.

**Klíč k API.** `OPENROUTER_API_KEY` už projekt používá (`inspekce/config/models.json`); Jev má ale vlastní endpoint `POST https://openrouter.ai/api/alpha/decisions`, ne `chat/completions`.

### P7. Tempo: měření leží mimo sezónu a sezóna začíná za deset dní

**Rozhodnuto 20. 9. 2026: dodělat co nejdříve.** Tohle není překonané rozhodnutí, ale termín, který dorazil. Zásahy ve vzorku podle měsíce zveřejnění: 04/2026 2, 05/2026 24, 06/2026 26, 07/2026 7, 08/2026 7, 09/2026 10. Celé měření tedy leží **mimo sezónu DOD (říjen–leden)** — odtud jen 11 zásahů třídy `dod`, z toho 6 s termínem v roli akce. §6 doporučuje mít fáze 1–2 hotové před sezónou. Je 20. 9. 2026. Když fáze 1–2 nestihnou začátek října, přijde se o jediné období, ve kterém se dá sezónní přejímka z §4 vůbec naměřit, a e-mail se odsune o rok.

---

## 4. Rozhodnutí, která po prověření platí dál

Zamítnutí je platný závěr, mlčení není. Tohle jsem prověřoval a nechávám beze změny:

| Rozhodnutí | Proč platí dál |
|---|---|
| Bez lidské moderace, žádná schvalovací fronta | upřesnění zadavatele; platí i po rozhodnutí o modelu — model klasifikuje, ale nejistota dál končí u neutrálního odkazu, ne ve frontě na člověka (P6, podmínka 4) |
| Živé položky do DB, ne do gitu | potvrzeno a P4 to rozšiřuje i na události sledování |
| Fail-closed při výpadku DB, blok novinek mimo ISR, kontrakt 60 s | týká se zobrazení, ne zdrojů; beze změny |
| Další fallback cesty k feedům | **zamítnuto měřením**: rozbitou deklaraci má 7 škol, zisk je nanejvýš 7 škol z 560 |
| Plošné zrychlení všech zdrojů na 15–30 minut | zamítnuto dál: 25 584 požadavků denně bez prokázaného přínosu; podmíněné zrychlení u blízkých termínů zůstává |
| Novinky jen na stránce školy, ne na detailu oboru | platí pro první verzi: novinka obor zpravidla nepojmenuje, takže by se přiřazovala odhadem. Přehodnotit, až (a jestli) extrakce začne vracet kód oboru |
| Spouštěcí kritérium e-mailu ≥29 bezchybných položek na třídu | P3 zlevňuje **pracnost** N4, ne důkaz přesnosti; kritérium se nesnižuje |
| Perex nepřebírat, jen titulek, datum a odkaz | autorská práva; beze změny |

---

## 5. Rozhodnutí zadavatele (20. 9. 2026)

| Bod | Rozhodnutí | Co z toho plyne |
|---|---|---|
| **rozsah** | **Poptávka je po jediném údaji: termín dne otevřených dveří.** Školné rodina zná a loňské platí i letos | vše se řadí podle toho, jestli to přiblíží čerstvý termín DOD; obnova ostatních polí je vedlejší |
| **zdroje** | Pořadí: **hlášení školy → RSS → `sitemap.xml` → snímky webu (Exa apod.)** | žebříček v P2 přeskládán; sitemap doporučuji brát jako spouštěč, ne jako zdroj obsahu |
| **P1** | **Souhlas** s rozborem | zapsat pravidlo konfliktu do §3.6 návrhu; sběrač profilů z InspIS PORTÁLu **klesá na konec** — vracel by hlavně školné a stipendium, po kterých poptávka není |
| **P2** | Odpověď je v P2, žebříček pěti zdrojů | nejbližší přírůstek je pole v portálu, největší je čtení výpisu aktualit |
| **P5** | **Schváleno** – škola se na adresu aktualit ptát může | pole v portálu, `zdroj: portal`, bez předvyplnění uhádnutou adresou |
| **P6** | **Klasifikace modelem Jev** (rozhodovací model, ne generativní) | Jev dodává jev, vylučovače, stav sdělení a roli data; `rozhodni_publikaci()` a pravidla zůstávají v kódu, šest podmínek v P6 |
| **P7** | **Dodělat co nejdříve** | fáze 1–2 před začátkem října, jinak se přijde o sezónu DOD i o sezónní přejímku |

**~~Zbývá rozhodnout jediná věc: P4, model události.~~ Rozhodnuto 20. 9. 2026.** Sledování škol si zapsalo události jako soubory v gitu, novinky jako řádky v Postgresu. Postavené není ani jedno, takže sjednocení je dnes zadarmo; po první postavené variantě se z něj stane přepis. Návrh je jedna tabulka událostí v Postgresu s novinkami jako čtvrtým zdrojem události a jedním denním souhrnem.

**P3** rozhodnutí nepotřebuje: jde o opravu odhadu v dokumentaci, spouštěcí kritérium e-mailu se nemění.

---

## 6. Doporučené pořadí

Podle rozhodnutí z oddílu 5:

Podle rozhodnutí z oddílu 5, seřazeno podle toho, jak rychle to přiblíží čerstvý termín DOD:

1. **Fáze 1 + 2 do konce září** (P7) — sklízeč, klasifikace, karta na stránce školy. Jediná položka s tvrdým termínem; sezóna DOD začíná v říjnu.
2. **Souběžně: pole pro adresu aktualit v portálu** (P5) — jeden formulářový řádek, stihne se do pilotu, a je to první zdroj v rozhodnutém pořadí.
3. **Jev do klasifikace** (P6) — kalibrace na 109 párech ruční reference, práh podle `confidence`, pravidla zůstávají jako záchytná i regresní síť. Týmž průchodem vznikne dosud chybějící měření úplnosti.
4. **Sitemap jako spouštěč + čtečka výpisu aktualit** (P2, kroky 3 a 4) — dosah 49 % → ~90 % škol.
5. ~~**Sjednotit model události** (P4)~~ — **hotovo 20. 9. 2026**, schéma v migraci 004.
6. **N4 sledování škol** (P3) — po přepsání odhadu; kritérium přesnosti beze změny.
7. **Sběrač profilů z InspIS PORTÁLu** (P1) — poslední. Termíny DOD nezlepší, vrátil by hlavně pole, po kterých poptávka není; jediné, co z něj stojí za pozornost, jsou **přípravné kurzy pro uchazeče** (19/60), na které se portál škol ptá ručně.

---

## 7. Co tenhle přehled neměří

- **Přesnost extrakce z HTML výpisu** (P2). Změřené je, že stránka aktualit existuje a je z titulky dostupná, ne že z ní umíme vytáhnout položky.
- **Úplnost** zůstává neměřená; P6 říká, jak ji změřit, ne co vyjde.
- **Přesnost modelu proti pravidlům** je neměřená. Že se zisk čeká u `dod` a u holého „přihlášk…“, plyne z toho, kde jsou pravidla slabá, ne z toho, že by model byl vyzkoušený.
- **Kolik škol projde sběračem InspIS PORTÁLu v plném rozsahu** — sonda prošla 60/60, ale rozložení stránky se u některých typů škol liší a parser na nich vrací prázdno (ve vzorku 3 školy u pole `prijimaci_zkousky`).
- **Chování 50 škol s HTTP 401 a 44 nedostupných** — sonda je jen spočítala; jestli je za 401 rozcestník, nebo obrana proti robotům, nikdo neotevřel.
- **Kolik škol by pole v portálu opravdu vyplnilo** (P5) — odhad nemám, vyhodnotí se na pilotu.

---

## 8. Vypořádání oponentury tohoto přehledu (20. 9. 2026)

Oponentura: [Hodnocení přehodnocení RSS, v1.1](hodnoceni-prehodnoceni-rozhodnuti-rss-2027-v1.1.md). Posuzovala **verzi 1.1** tohoto dokumentu. Část námitek proto míří na text, který mezitím přepsala verze 1.2 podle rozhodnutí zadavatele — u těch to výslovně uvádím, protože zopakovat je jako otevřené by bylo zavádějící.

**Zadavatel mezitím rozhodl, že se už nic neověřuje:** „nechceme především už nic ohledně RSS ověřovat, chceme to zprovoznit a za provozu zjistit, jaké jsou z toho výsledky. zatím jsou dobré, resp. je to jediný další zdroj dat, co máme." Námitky žádající další měření před nasazením proto **nepřijímám jako podmínku spuštění**; přijímám je jako opravu formulací, které měření vydávaly za hotové. Výjimkou je H1: vada, kvůli které by karta tvrdila rodině nepravdu, se opravuje bez ohledu na tempo.

| Bod | Stav | Vypořádání |
|---|---|---|
| **H1** – přehled vynechal pátou oponenturu a kódové vady trvají | **přijato celé, opraveno** | Obojí platilo. Pátá oponentura ([v1.4](oponentura-skolske-novinky-rss-2027-v1.4.md)) je doplněna do hlavičky. Všechny tři reprodukce jsem zopakoval a všechny tři vyšly, jak oponent píše. Opraveny v `scripts/rss-klasifikace-mereni.py` (verze pravidel 2026-09-20.5): nepotvrzený termín → stav `nejiste` → odkaz; datum věty s vlastním předmětem („Soutěž začne…") roli akce nedědí; konečné rozhodnutí zná **den zobrazení** a proběhlý termín nevytvoří pozvánku ani e-mail. Čtyři nové regresní testy (52/52), měření beze změny. Věta „kód návrhu není brzda" je v úvodu opravena. |
| **H2** – pořadí zdrojů ≠ přednost pravdy | **přijato, doplněno pravidlo** | Pořadí hlášení školy → RSS → sitemap → snímky je pořadí **získávání**, ne trvalá přednost tvrzení. Platí: novější jednoznačné zrušení na oficiálním webu přebíjí starší pozvánku z portálu bez ohledu na pořadí zdroje; nevyřešený rozpor **potlačí odvozený termín** a zobrazí oba zdrojové odkazy, autonomně a bez moderátora (návrh §3.6 to tak už má u rozporu portál × web — rozšiřuje se to na směr „novější ruší starší"). Archivní InspIS se starým ročníkem aktuální termín neblokuje; explicitní rok sám o sobě neprokazuje, že jde o tutéž akci. |
| **H3** – 90 % je strop, ne měření; 50,5 % přihlášek ≠ rodin | **přijato jako oprava textu** | Opraveno v P2 na třech místech: strop 89,9 % s výpočtem, 83 % jako prostý přenos četnosti, obojí označeno za stav **před extrakcí**. „Polovina rodin" opravena na polovinu **přihlášek** — chyba je moje. Doplněno, že chybějící `meta generator` nevyvrací dominantní CMS (jen znemožňuje z něj vybrat parser) a že 7 rozbitých deklarací je nález, ne horní mez. Další hledání feedů zůstává odložené z priority, ne jako vyvrácené. |
| **H4** – sitemap a titulek+popis jako jediný vstup nestačí | **přijato** | `lastmod` je nepovinný, takže sitemap je **spouštěč a prioritizace**, ne jediný důvod ke kontrole stránky; sonda navíc zkoušela jen `/sitemap.xml`, tedy ani ne všechny sitemapy. Jevu se nedává jen titulek a popis: **kandidáty dat vybírá kód, model dostává krátký výřez stránky kolem data** a hodnotí vazbu na konkrétní akci. Exa či podobná služba je způsob získání obsahu, ne další autorita o termínu. |
| **H5** – přejímka Jevu má slepé místo | **přijato jako výklad, rozsah měření se nerozšiřuje** | Oponent má pravdu, že **označit jen neshody modelu s pravidly úplnost nezměří** — obě metody mohou tutéž pozvánku přehlédnout, a zprávy mimo náš archiv nezachytí ani jedna. Do klíče cache patří otázky/prompt, parametry a verze předzpracování, ne jen otisk karty; kalibrace podle dokumentace TypeSafe není zárukou správnosti jednotlivé odpovědi a náklad z pilotu párování oborů se nepřenáší na jiný počet otázek a délku textů. Malý referenční vzorek školských **stránek** oddělený od ladění prahů je metodicky správný — **zadavatel ho zamítl** ve prospěch provozu. Úplnost tedy zůstává neměřená a je tak uvedena v oddílu 7. |
| **H6** – pracnost a časový tlak nadsazené; rozpory v pořadí | **částečně přijato** | Odhad N4 (2–3 dny) se týká schématu, formuláře, fronty a kouřové zkoušky, ne volby databáze — návrh §4 už přebírá servisní infrastrukturu. **Překonáno bylo jen tvrzení v `sledovani-skol-2027.md` §5, že web žádné úložiště nemá**; to je opraveno (v1.1 toho dokumentu), odhad se nezkracuje. Přijímám i to, že nesplnění 1. října neznamená ztrátu sezóny: sběr a ukládání zdrojů běží dřív než veřejné karty. **Vytčené rozpory („krok 1" proti žebříčku P2, P1 jednou rozhodnuté a jinde ne) pocházejí z verze 1.1 a verze 1.2 je odstranila** — oddíl 5 má P1 jako odsouhlasený a pořadí kroků jediné. |

**Co z oponentury měním v pořadí prací.** Její bod 1 (první produktový výstup je *platný termín DOD se zdrojem, stavem, časem získání a rozlišením „nenašli jsme" od „škola DOD nepořádá"*) přijímám — je to přesně zúžení, které zadavatel zadal, a zpřesňuje bod 1 v oddílu 6. Ostatní pořadí zůstává.

## Historie verzí

| Verze | Datum | Změna |
|---|---|---|
| 1.0 | 20. 9. 2026 | První přehled: sedm překonaných rozhodnutí (P1–P7), osm potvrzených, inventura nepoužitých sloupců, nová sonda cest k novinkám u škol bez feedu |
| 1.1 | 20. 9. 2026 | **P1 opraven měřením**: InspIS PORTÁL profil pořád servíruje (60/60), sada 69 žije a projekt ji používá — pole je staré proto, že ho školy přestaly udržovat, ne proto, že zdroj zmizel; navíc nález tří polí, která CSV export ztratil. P2 doplněn o žebříček kroků, které zlepší stav informací. P6 přepsán podle rozhodnutí zadavatele (klasifikace modelem, šest podmínek). Zaznamenána rozhodnutí k P2, P5, P6 a P7. |
| 1.2 | 20. 9. 2026 | Zapsáno zadání rozsahu (poptávka je jen po termínu DOD) a pořadí zdrojů (hlášení školy → RSS → sitemap → snímky webu). P6 přepsán na **Jev**, rozhodovací model, s dělbou „kód připraví, Jev rozhodne“ a šesti podmínkami z jeho pilotu. Žebříček v P2 přeskládán, sběrač InspIS PORTÁLu klesá na konec. Otevřené zůstává jediné rozhodnutí: P4, model události. |
| 1.3 | 20. 9. 2026 | Vypořádána oponentura tohoto přehledu (oddíl 8). H1 přijat celý: doplněna pátá oponentura a opraveny tři reprodukované vady publikačního rozhodnutí (nepotvrzený termín, datum cizí akce, proběhlý termín) — tvrzení „kód není brzda" padlo. H2 doplňuje pravidlo, že novější zrušení přebíjí starší pozvánku bez ohledu na pořadí zdrojů. H3 a H6 opravily formulace vydávající strop za měření a „polovinu rodin" za „polovinu přihlášek". H4 dává Jevu výřez stránky kolem data, ne jen titulek. H5 přijat jako výklad; rozšíření měření zadavatel zamítl ve prospěch provozu. |
