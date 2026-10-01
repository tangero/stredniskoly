# Sonda: novinky škol bez RSS (sitemap, výpis aktualit, placené služby)

**Datum:** 1. 10. 2026
**Otázka:** kolik škol, které nemají kanál novinek (RSS/Atom), se dá číst jinak, a jestli k tomu pomůže `sitemap.xml` nebo služby Parallel, Exa a TinyFish.
**Navazuje na:** [sondu feedů](rss-webu-skol-sonda-2026.md) z 19. 9. 2026 a [překonaná rozhodnutí kolem novinek](prehodnoceni-rozhodnuti-rss-2027.md), P2 (žebříček zdrojů: hlášení školy → RSS → sitemap → snímky webu).
**Reprodukce:** `.venv/bin/python scripts/sonda-mimo-rss.py` (data `data/sondy/mimo-rss-20261001.json`); TinyFish `scripts/sonda-mimo-rss-tinyfish.py` (data `data/sondy/mimo-rss-tinyfish-20261001.json`); Exa a Parallel `scripts/sonda-mimo-rss-sluzby.py` (nespuštěno).
**V provozu:** výpis aktualit sklízí sklízeč novinek od 1. 10. 2026 (oddíl 4a), na stránce školy zatím skrytý.
**Ukázka v provozu:** nezalistovaná stránka `/prototyp/cim-skoly-ziji`.

## 1. Výchozí stav z produkční databáze (1. 10. 2026)

| Co | Počet |
|---|---:|
| Kanálů novinek v registru `skola_feed` | 533 (aktivních 531) |
| … přečtených za poslední 3 dny | 524 |
| … s chybou (5× HTTP 403, 3× nečitelný feed, 2× timeout, 1× 404) | 11 |
| Uložených zpráv / škol se zprávou | 5 504 / 442 |
| Škol se zprávou vydanou za posledních 30 dní | **370** |
| Kanál, který zatím nedal žádnou zprávu | 92 |
| Zpráv ze života školy (`zobrazeni = seznam`) | 4 987 (91 %) |

Kanál novinek tedy znamená čerstvé zprávy u **370 škol, asi třetiny katalogu**, ne u 49 %, jak by napovídal samotný počet feedů. Sloupec `skola_feed.posledni_polozka` je u všech 533 zdrojů prázdný: sklízeč ho nezapisuje (poznámka mimo rozsah, neopraveno).

## 2. Sonda nad 450 školami bez kanálu novinek

Vstup: všechny školy ze sondy 19. 9., které mají živou titulní stránku a nejsou v `public/skoly_feedy.json`. Sonda stáhne `robots.txt`, sitemapu (z `robots.txt`, jinak `/sitemap.xml`, `/sitemap_index.xml`, `/wp-sitemap.xml`, `/sitemap.php`; z indexu nejvýš 12 podsitemap s přednostním výběrem článků), titulku a stránku aktualit. Celkem asi 4 požadavky na web, běh 97 s.

| Krok | Škol z 450 |
|---|---:|
| titulka dnes odpověděla | 448 |
| **sitemap nalezena** | **232** (52 %), z toho 160 jen přes `robots.txt` |
| … obsahuje adresy článků | 95 |
| … články s `lastmod` | 69 |
| … článek s `lastmod` za 30 dní | 48 |
| **stránka aktualit nalezena z titulky** | **370** (82 %) |
| **výpis přečten** (≥ 3 položky s titulkem, odkazem a datem) | **283** (63 %) |
| … nejnovější položka za 30 dní | **230** (51 %) |
| čerstvá zpráva jen ze sitemap, ne z výpisu | **8** |

Stavy výpisu: přečteno ze stránky aktualit 217, z titulky 64, výpis nerozpoznán 99, stránku aktualit jsme nenašli 63, web nebo stránka neodpověděly 4.

### Odpověď na otázku „pomůže sitemap?“

**Málo, a jen jako doplněk.** Sitemap má polovina webů, ale adresy článků v ní jsou jen u 95 škol a čerstvé (`lastmod` do 30 dní) u 48. Ze všech škol, u kterých výpis aktualit nepřečteme, přidá sitemap čerstvou zprávu jen **8 školám**. Sitemap navíc nedává titulek ani spolehlivé datum vydání; u nové adresy by se stejně musela stáhnout stránka článku. Smysl má jako levný detektor změny („přibyla adresa pod /aktuality/“) u těch 48 škol, ne jako samostatný zdroj.

Dřívější vzorek 80 škol (20. 9.) uváděl sitemap u 38/80; rozdíl proti dnešním 52 % je v tom, že tehdy se zkoušelo jen `/sitemap.xml`. Většina sitemap je ohlášená v `robots.txt`.

### Kvalita čtečky výpisu (ruční kontrola)

Náhodný vzorek 30 škol s přečteným výpisem (seed 20261001), po opravě výběru titulku:

- položky jsou skutečné zprávy školy u 29 z 30; jedna škola vrátila místo zpráv měsíční nadpisy archivu (filtr na „září 2026“ přidán);
- titulek čistý u zhruba 27 z 30; zbytek nese datum nebo útržek perexu;
- datum věrohodné u 28 z 30; dvakrát čtečka vzala datum z textu titulku (termín akce místo data vydání).

Čtečka používá dvě strategie: skupina sourodých bloků s odkazem a datem (výpis s odkazy na články) a skupina nadpisů s datem (celý text zprávy přímo ve výpisu, odkazem je pak stránka výpisu). Druhá strategie je potřeba asi u čtvrtiny škol. Data bez roku („25. září“) dostanou nejbližší minulý rok.

**Co sonda neměří:** úplnost (kolik zpráv výpis obsahuje a čtečka je minula), stabilitu při opakovaném čtení a chování při stránkování výpisu. Přesnost je z ruční kontroly 30 škol, ne z referenčního vzorku.

## 3. Celkové pokrytí

Katalog má 1 120 škol (REDIZO s nabídkou). Škol se zprávou za posledních 30 dní:

| Zdroj | Škol | Podíl katalogu |
|---|---:|---:|
| kanál novinek (dnes v provozu) | 367 | 33 % |
| + výpis aktualit (kdyby běžel) | +229 | +20 % |
| **dohromady** | **596** | **53 %** |
| + sitemap jako samostatný zdroj | +8 | +1 % |

Po krajích viz tabulku na `/prototyp/cim-skoly-ziji`. Například v Pardubicích dnes čteme kanál novinek u 3 ze 13 škol, výpis aktualit přidává dalších 5.

Zbývá asi **300 škol**: 99 s nerozpoznaným výpisem, 63 bez nalezené stránky aktualit, 94 za HTTP 401 nebo nedostupných už 19. 9., zbytek bez webu v rejstříku. Na tuhle skupinu míří placené služby.

## 4. Placené služby: Parallel, Exa, TinyFish

Rešerše oficiální dokumentace, ceníků a podmínek k 1. 10. 2026. Žádné placené volání neproběhlo; porovnávací sonda je připravená (`scripts/sonda-mimo-rss-sluzby.py`) a spustí se s klíči `TINYFISH_API_KEY`, `EXA_API_KEY`, `PARALLEL_API_KEY` v prostředí. Bere 50 škol, kde vlastní čtečka selhala, a 15 kontrolních, kde uspěla.

Žádná ze služeb za levnou cenu nevrací seznam článků po položkách; všechny vracejí obsah stránky (markdown, text) a datum stránky jako celku. Rozklad na titulek, odkaz a datum dělá náš kód, nebo dražší strukturovaný režim.

| | Parallel Extract (+ Task) | Exa `/contents` (+ `summary.schema`) | TinyFish Fetch (+ AgentQL) |
|---|---|---|---|
| obsah stránky | ano, až 20 URL na volání | ano, `maxAgeHours: 0` = živě | ano, markdown + všechny odkazy |
| strukturovaný seznam | jen Task API (base 10 $/1k) | `summary.schema`, generuje LLM | AgentQL 0,02 $/volání |
| 450 stránek × 2 denně × 30 dní | ~27 $ (Task ~270 $) | ~27–54 $ | **0 $** (Fetch zdarma, limit 150 URL/min) |
| JavaScript | ano | ano | ano |
| HTTP 401/403 | neobchází, vrátí starší kopii z indexu | neobchází, chyba ve `statuses` | Fetch neověřeno; stealth jen u placeného Agenta |
| hlídání změn konkrétní adresy | snapshot monitor přes Task | ne (monitory = vyhledávání) | ETag/Last-Modified, Page Monitor max. 50 na účet |
| **podmínky pro uložení a zveřejnění** | **riziko**: Customer Terms 2(b) zakazují výstup ukládat a zpřístupňovat třetím stranám, 2(c) z něj budovat databáze | nejasné: obecné Terms 4.2(a) zakazují publikovat bez písemného svolení; placené MSA nečteno | výslovný zákaz nenalezen (podmínky čteny přes souhrn) |

**Doporučení:**

1. **Vlastní čtečku výpisu dát do provozu** (zdroj `typ = 'html'` vedle RSS, tatáž klasifikace a publikační rozhodnutí). Pokryje 230 škol navíc, zdarma, bez závislosti a bez právní nejistoty.
2. **TinyFish Fetch** vyzkoušet na zbytek (výpis nerozpoznán, JavaScript): je zdarma a jeho markdown s odkazy se dá číst týmž kódem jako vlastní výpis. *(Vyzkoušeno, oddíl 4a: markdown nejde, html celého těla ano; pomáhá u nedostupných webů, ne u nerozpoznaných výpisů.)*
3. **Exa** jako druhá volba pro to, co Fetch nepřečte; levné, ale podmínky pro zveřejnění je třeba vyjasnit.
4. **Parallel pro tenhle účel ne**, dokud dodavatel písemně nepotvrdí, že smíme výstupy ukládat a zveřejňovat titulky s odkazy. Na jednorázové rešerše (jako u veletrhů) je dál v pořádku.
5. Weby za 401/403 nevyřeší žádná ze služeb v levném režimu; projít je ručně jednou (94 škol) a zbytek nechat na poli „adresa aktualit“ v portálu (P5).

Hodnocení placených služeb je zatím jen z dokumentace. Platí až po běhu porovnávací sondy.

## 4a. TinyFish naměřený a napojení do sklízeče (1. 10. 2026)

Exa zatím nepoužíváme (rozhodnutí zadavatele 1. 10. 2026), Parallel ze stejných důvodů jako výše.

**Co z TinyFish Fetch jde číst.** Markdown ani výchozí `html` (služba z něj vybere „hlavní obsah“) neobsahují odkazy na články a čtečka z nich nepřečte nic. Pokus číst bloky z formátu `json` dával špatné titulky (perex, jména autorů) a byl zahozen. Funguje `format: html` s `include_selectors: ["body"]`: služba vrátí celé vykreslené tělo stránky i s odkazy a třídami a čte se **touž čtečkou** jako přímé stažení. Služba projde i WEDOS.protection: brána vrací skriptům `HTTP 401` a chce automatický výpočet (proof-of-work), žádnou CAPTCHA pro člověka.

| Skupina | Škol | titulka přes TinyFish | stránka aktualit | **výpis přečten** | zpráva za 30 dní |
|---|---:|---:|---:|---:|---:|
| přímo nedostupné (19. 9. titulka ≠ 200) | 110 | 80 | 75 | **57** | 49 |
| odpověděly, výpis nepřečten | 162 | — | — | **3** | — |

TinyFish tedy pomáhá tam, kde selhává **stažení**, ne tam, kde selhává **čtečka**: vykreslení JavaScriptu u nerozpoznaných výpisů skoro nic nepřidá. Chyby služby: `selector_not_matched` 20, `target_http_error` 17, `invalid_url` 8, `page_not_found` 5, `proxy_error` 4, `bot_blocked` 2.

**Napojení.** Registr `public/skoly_vypisy.json` (`scripts/build-skoly-vypisy.py`): 276 škol se stahuje přímo, 59 přes TinyFish; vyřazeno 8 výpisů s nejnovější položkou starší než rok. Sklízeč při přímém stažení, které skončí `401/403`, `429` nebo síťovou chybou, zkusí ještě TinyFish. Zkušební běh bez databáze: 335/335 zdrojů, 3 055 položek, 284 škol se zprávou za 30 dní, 39 s. Zprávy z výpisu jdou do `skola_novinka` jako ze feedu, ale stránka školy je zatím **neukazuje**; vidět jsou na `/prototyp/cim-skoly-ziji` s označením „výpis aktualit“. Popis: [návrh sklízeče](skolske-novinky-rss-2027.md), oddíl 3.1.

## 5. Co dál

- ~~Rozhodnout, zda zprávy z výpisu aktualit ukazovat na stránce školy.~~ Rozhodnuto 1. 10. 2026: ukazují se s výhradou ke čtení (`ZOBRAZIT_VYPISY` v `src/lib/skolni-novinky.ts`). Zbývá sledovat chybovost na prvním týdnu sklizně a vypnout, kdyby se čtečka ukázala nespolehlivá.
- Změřit úplnost a stabilitu čtečky při opakovaném čtení (sklizeň 2× denně to dává zadarmo: zmizelé a znovu objevené položky).
- Registr výpisů obnovit novou sondou, až přibude škol s kanálem novinek nebo s adresou aktualit z portálu (P5).
- Před zveřejněním stránky „Čím školy žijí“ rozhodnout o filtru zpráv se jménem osoby v titulku (ve sklizni jsou například parte).
