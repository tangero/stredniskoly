# Changelog

Všechny podstatné změny v projektu jsou dokumentovány v tomto souboru.
Formát vychází z [Keep a Changelog](https://keepachangelog.com/cs/1.1.0/).

## [Unreleased]

### Přidáno
- **Stránka školy v pěti otázkách** (`src/components/skola/ProfilSkoly.tsx`, `src/lib/skola-profil-data.ts`) — obory s obtížností přijetí, maturita proti skupině oborů (po přepnutí sady), inspekce, profil školy se značkami původu, údaje z portálu u otázek, schéma okolí a souběžné přihlášky; nahrazuje obě starší podoby přehledu; návrh `docs/stranka-skoly-2027.md`
- **Maturita na stránce školy** — sada `cermat-maturita` přepnuta na jaro 2026 (PR #92, úloha GQ99C); ročníky 2023–2026, zařazení proti skupině oborů
- **Maturitní výsledky přes datovou linku** (`scripts/build-maturita-skoly.py`, zpracovatel `cermat-maturita`) a příkaz linky `znovu` pro znovuotevření uzavřené úlohy
- **Portál pro školy**: nepovinná pole stravování a kontakt na výchovného poradce
- **Stránka oboru ve třech otázkách** (`src/components/obor/ProfilOboru.tsx`) — jak těžké je se dostat, co pomůže, jak se studuje; odpověď slovy nad rozbalovacími důkazy, návrh a rozhodnutí v `docs/vrstvy-stranky-oboru-2027.md`; bez souhrnu 1. kola zůstává starší podoba
- **Souhrny 1. kola po ročnících** (`scripts/build-souhrny-kolo1.py` → `public/souhrny_kolo1.json`) — párování nabídek mezi roky, obtížnost přijetí slovy, kraj a srovnatelná skupina
- **Kontext přihlášek** (`scripts/build-kontext-prihlasek.py` → `public/kontext_prihlasek_{rok}.json`) — výsledek uchazečů o obor, obory výš a níž na přihlášce, odvozená hranice úspěšnosti; napojeno na datovou linku
- **Weby škol** (`scripts/build-skoly-web.py` → `public/skoly_web.json`) z adresáře rejstříku škol
- **Slovník pojmů** (`docs/slovnik-pojmu.md`) — závazná slova pro texty webu, vysvětlení při prvním výskytu a zakázaná slova
- **Uložení mezi zvažované** na stránce oboru, sdílené se simulátorem
- **Portál pro školy** (`/pro-skoly`) — škola si sama doplní profilové údaje; přístup přes jednorázový kód nebo magic link zaslaný na rejstříkový e-mail (odkaz platí 72 h), po odeslání potvrzovací e-mail; příspěvky prochází moderací přes GitHub Issues a teprve potom se ukážou na stránce školy
- **Administrace** (`/admin`) — stav moderace portálu, stav datových sad a běhů datové linky; přístup heslem, relace 12 h
- **`stav-datovych-sad.py prepni --obnovit-nejpozdeji`** — termín plánované obnovy jde posunout při přepnutí sady

### Změněno
- **„Jak to dopadlo loni" z finální revize dat 2025** — CERMAT 20. 5. 2026 zveřejnil finální verzi včetně vzdání se přijetí; počty se u části oborů mírně posunuly (PR #84–#87)
- **Inspekce ČŠI** — web zobrazuje snímek ze 7. 9. 2026 místo 11. 2. 2026; převzato z větve týdenního workflow (PR #54)
- **Doklad pásem přijetí přepočítán** na aktuálních revizích obou roků; upstream 20. 5. 2026 přepsal i soubor 2024 do schématu roku 2025 (klíč REDIZO) a přeřadil asi 430 přijatých mezi vzdavší se, takže stabilita míry *rozhodl test* je 0,671 místo 0,725; teze ve verzi 1.7

### Opraveno
- **15 nabídek 2026 s přepsaným zaměřením mělo dvě stránky** — stará hlásila „letos nevypsáno“ s čísly 2025, nová měla čísla 2026 bez historie (např. Kuchař a Číšník v Čakovicích, gymnázium s „němčinou“ místo „německého jazyka“). Mapa nabídek přebírá ručně ověřené páry z `docs/podklady/overene-pary-nabidek-2026.csv` (audit modelem Jev a ruční kontrola, u 13 z nich návaznost dříve potvrdila i rešerše); neplatný nebo kolidující pár skončí chybou. Katalog 2026 má o 15 zdvojených záznamů méně
- **Graf vývoje po ročnících chyběl u 373 stránek** — stránka s přepsaným zaměřením nese loňský klíč katalogu, souhrny 1. kola ale letošní klíč CERMAT; 312 stránek nenašlo žádný souhrn a 61 jen loňský. Hledání souhrnu jde přes mapu nabídek ročníku z registru a souhrny párují ročníky podle téže mapy; spárováno 2 934 místo 2 858 nabídek (slovník ukazatelů 1.24)
- **Srovnání maturity s podobnými školami v jedné veličině** — střed, výsledek školy i graf v podílu bodů z testu, tedy v tom, proti čemu se počítá zařazení; percentil zůstává jako srovnání s maturanty v celé zemi (slovník ukazatelů 1.20)
- **Maturita na stránce školy srozumitelněji** — souhrnná věta, tabulka po oborech, „lépe než X ze 100“ a „podobné školy“ (slovník pojmů 1.4); úspěšnost z přihlášených, dříve stál vedle podílu počet z konajících
- **Detail nových oborů bez zaměření** — obory, které přibyly až v ročníku 2026, nebyly v `school_analysis.json`, a `getSchoolPageType` je nenašel; odkaz vedl na přehled školy
- **2. kolo na nových stránkách** — stránka oboru měla jen zkrácenou větu a stránka školy 2. kolo neukazovala; věty sdílí `src/lib/druhe-kolo-vyklad.ts` (stránka oboru, stránka školy, otevřená data, starší karta)
- **Otevřená data školy** (`/skola/{slug}.md`, `.json`) — stejná datová vrstva jako stránka školy: ročník z registru, obtížnost přijetí, maturita, údaje od školy s původem, souběžné přihlášky; bez součtu přihlášek za školu; JSON ve verzi schématu 2
- **Předložka z/ze před čísly** — podle výslovnosti čísla, ne jen u sedmiček a stovek
- **Součtové poměry na stránce školy** — přehled školy a banner přihlášek nesčítají přihlášky a přijaté přes různé obory; srovnání ročníků ze souhrnů CERMATu
- **Čtení roku 2024 ve `validate-pasma-prijeti.py`** — po přepsání souboru upstreamem skript padal na chybějících sloupcích; rok 2024 se čte stejnou funkcí jako 2025 a převod IZO odpadl
- **Zastaralá čísla v tezích JPZ** — věta „nikdo se nevešel kvůli kapacitě" má v dokladu vlastní klíč (1 199 oborů, u 702 někdo nesplnil podmínky)

### Odstraněno
- **Workflow `inspis-weekly-refresh.yml`** — datová sada InspIS u zdroje zanikla (ČŠI open data vrací 404 od ~10. 8. 2026); web ponechává zamrazená data z 11. 2. 2026, nahrazení řeší portál pro školy

---

## [0.5.0] — 2026-09-13

### Přidáno
- **Ročník 2026 v katalogu** — stabilní adresy nabídek, žádná stránka z roku 2025 nezanikla; statistiky oboru ukazují přihlášky podle priority, průměry přijatých a srovnání ročníků 2025 a 2026
- **Studijní obory školy** — přehled oborů na stránce školy jako záložky pod společným nadpisem
- **Jak to dopadlo loni** — nový blok na stránce oboru: pod kolika body se v 1. kole nedostal nikdo, nad kolika se dostali všichni, kolik uspělo v rozmezí a zda rozhodoval hlavně test; ověřeno mezi ročníky 2024 a 2025 a po třech kolech oponentury
- **Druhé kolo** — nový blok na stránce oboru s kapacitou, přihláškami a přijatými ve 2. kole a s varováním u oborů, které se v 1. kole nenaplnily a 2. kolo nevypsaly
- **Simulátor výběru oboru** — dojezdová doba, výsledky uchazečů, důvody nepřijetí a srovnávací tabulka bez stropu počtu oborů
- **Kalendář přijímacího řízení 2027** a obnovená data CERMAT
- **Přiznaná nejistota návaznosti oborů** — u 216 nabídek poznámka a odkaz na nahlášení správného stavu přes GitHub Issues
- **Závazný slovník ukazatelů** (`docs/slovnik-ukazatelu.md`) — každé číslo na webu má definici, výpočet a to, co neříká
- **Dokumentace zdrojů sloupec po sloupci** (`docs/zdroje-dat.md`) — povinný krok před návrhem stránky nebo ukazatele
- **Registr stavu datových sad** (`public/stav_datovych_sad.json`) — pro 18 sad zobrazené období, očekávané období a termín, role starých dat a vazba na slovník; kontrolní skript `scripts/stav-datovych-sad.py`
- **Datová linka** (`scripts/datova-linka.py`) — zjištění nových a přepsaných dat, stažení, kontrola, zpracování, oznámení přes Telegram nebo GitHub issue, schválení a předání pull requestem; workflow `.github/workflows/datova-linka.yml`; 28 testů nanečisto

### Změněno
- **Index obtížnosti odstraněn z profilu oboru** — jeho výpočet se nepodařilo doložit; nahrazen ověřeným tlakem prvních voleb
- **Zpracovatelské skripty dat uchazečů** — čtou první list a příznak přijetí zapsaný číslem i textem; CERMAT v roce 2026 přejmenoval list a změnil formát
- **Sjednocený simulátor** pracuje s celou nabídkou 1. kola 2026

### Opraveno
- **Nadpisy označující data 2026 jako rok 2025** na stránce oboru
- **Nepravdivá věta o přijatých podle priority** — CERMAT je za rok 2026 zveřejňuje
- **Neověřená minima bodů a osobní predikce šancí** odstraněny z regionálních souhrnů a simulátoru
- **Náhledové obrázky při sdílení** — chyba 500 a chybějící české znaky
- **Tip o prioritě přihlášek** — priorita neurčuje šanci na přijetí (#70); rozlišující názvy škol ve výsledcích (#69, #63); filtry výsledků se zachovají po návratu (#60)

### Známé limitace
- Stránky oborů bez zaměření ukazují v bloku „Přijetí a kapacita“ čísla z roku 2025; oprava je krok 1 v `docs/navrh-aktualniho-rocniku-dat.md`
- `scripts/enrich_schools_data.py` čte sloupce podle pozice a na souborech uchazečů 2026 by počítal chybně

---

## [0.4.1] — 2026-05-16

### Přidáno
- **Odkaz „Přehled měst" na homepage** — nový inline odkaz v hero sekci (za výsledky 2026) vedoucí na `/mesto` s přehledem 20 největších českých měst

### Opraveno
- **Redirect `/vysledky-2026` → `/vysledky/2026`** — oprava nefunkční URL šířené na sociálních sítích
- **Popis rozsahu skóre CJ+MA na stránkách měst** — text „max 100" opraven na „max 200, tj. 100 ČJ + 100 MA"; CJ+MA je součet dvou škál 0–100, celkový rozsah je tedy 0–200

---

## [0.4.0] — 2026-05-15

### Přidáno
- **Výsledky přijímacích zkoušek 2026** — nová datová vrstva s ročním cyklem (CERMAT xlsx → JSON pipeline)
  - Widget „Výsledky přijímacích zkoušek 2026" na detailu každé školy — průměrné skóre ČJ+MA přijatých, srovnání s rokem 2025 (Δ), pořadí v rámci typu školy
  - Nová stránka `/vysledky-2026` s makropřehledem: klíčová zjištění, srovnávací tabulka typů škol, žebříček gymnázií (GY4/GY8/GY6), rady pro přijímačky 2027, vyhledávání přes všechny školy
  - Python pipeline `scripts/import_cermat_results.py --year YEAR` pro každoroční import nových dat

### Klíčová zjištění 2026
- Matematika posílila o 6–7 bodů průměrného skóre přijatých ve všech typech škol
- O 7 702 méně přihlášek celkem oproti 2025 (demografický pokles)
- Lycea: +925 nových míst, nejrychleji rostoucí typ školy
- Top GY4: Gymnázium Jana Keplera 183.9 b, PORG 183.8 b, Gymnázium Christiana Dopplera 183.1 b

## [0.3.0] — 2026-03-08

### Přidáno
- **Nejžádanější studijní obory** (`/skoly`) — přepracovaná stránka se 3 taby:
  - Nejžádanější obory 2026 (top 100 podle převisu poptávky)
  - Obtížnost přijetí 2025 (top 100 podle indexu obtížnosti)
  - Převis poptávky podle měst 2026 (agregace za města s vizuálními bary a odkazy na školy)
- **Granulární filtry typů škol** — výběr Gymnázia 4L/6L/8L, SOŠ, Lycea, SOU na přehledu měst
- **2026 data jako primární** na kartě školy — přihlášky, místa a poptávka 2026 zobrazeny jako hlavní čísla, 2025 data jako sekundární
- **Oddělení oborů z roku 2025** — obory bez pokračování v 2026 ve vlastní sekci „Obory z roku 2025"
- **Kontinuita oborů 2025↔2026** — badge „Nový obor 2026", info box „Tento obor se v roce 2025 jmenoval..." pro přejmenované obory
- **Vertikální ProgramTabs** — seskupení oborů podle délky studia (4L/6L/8L) s barevnými hlavičkami místo horizontálního scrollování
- **Délka studia v našeptávači** — u gymnázií se zobrazuje „4leté / 6leté / 8leté"
- **Přetextování Moje šance** — sdílení URL, žebříček převisu přihlášek

### Změněno
- **Top 10 na /regiony** — změněno z „nejobtížnější obory" na „podle počtu přihlášek"
- **Párování oborů 2025↔2026** — tří-úrovňový lookup (exact ID → matched_2025_id → base key fallback)

### Opraveno
- **1584 oborů nenalezitelných v Moje šance** — oprava párování 2025↔2026 dat
- **Převis podle měst zobrazuje všechna města** — odstraněn limit min. 3 oborů, který skrýval menší města
- **Aktualizace dat přihlášek 2026** ze skutečných dat CERMATu

## [0.2.0] — 2026-02-10

### Přidáno
- **Autonomní auto-fix systém** — automatické opravy bug reportů pomocí GitHub Actions a AI (Claude/GLM-4.7 přes OpenRouter)
  - AI validace před vytvořením issue (spam detection, rate limiting, honeypot)
  - Automatická analýza problému a vytvoření opravy
  - Iterativní workflow s testováním a feedback loop (až 3 pokusy)
  - Draft PR s možností review před mergnutím
  - Email notifikace přes Resend API
- **AI shrnutí inspekčních zpráv ČŠI** — automaticky generovaná shrnutí z inspekčních zpráv zobrazená na detailu školy (v2.4.0)
  - Extrakce klíčových bodů z PDF zpráv pomocí AI
  - Nová samostatná stránka `/skola/[slug]/inspekce` s podrobným shrnutím všech inspekčních zpráv
  - Zobrazení shrnutí pro rodiče, silné stránky, rizika, fakta ze zprávy
  - Tlačítko „Co si o škole myslí Školská inspekce?" v hlavičce školy
  - Deduplikace a agregace dat podle REDIZO
  - Optimalizace velikosti dat (7.1 MB → 5.0 MB)
- **Stránka /issues** — přehled všech bug reportů s filtry a statistikami
- **Clicky.com analytics** — integrace sledování návštěvnosti

### Změněno
- **Model pro auto-opravy** — změna z Claude Sonnet 4.5 na GLM-4.7 (z-ai/glm-4.7)
- **Inspekční stránky** — renderování on-demand místo statického
- **Bug report formulář** — vylepšené pokyny pro kvalitní hlášení chyb
- **Dekódování zastávek** — adaptivní limity pro velké soubory

### Opraveno
- **Vyhledávání v horním menu** — nefunkční search a autocomplete nyní plně funkční
  - Zobrazení názvu programu i délky studia
  - Debounce 300ms pro lepší UX
- **Hamburger menu na mobilu** — již není překryté search barem
- **Zdvojení minimálních bodů** — normalizeMinBodyScore vždy správně dělí body dvěma
- **Error handling** — oprava chyb při načítání MHD zastávek
- **Clicky.com tracking** — správná inicializace s HTTPS protokolem
- **CSP** — Content Security Policy pro Clicky.com analytics
- **Lint errors** — oprava 36 lint errors (any types → konkrétní typy, unused variables, setState v effectu)

## [0.1.0] — 2026-02-09

### Přidáno
- **Rozlišení duplicitních zastávek** — disambiguační kontext pro zastávky se stejným názvem v našeptávači dostupnosti
  - Zobrazení kraje/regionu podle identifikátorů zastávky
  - Fallback na souřadnice, pokud kraj nelze určit z ID
- **Integrace inspekčních zpráv ČŠI** — nová sekce „Inspekční zprávy ČŠI" na detailu školy
  - Přehled všech dostupných inspekcí školy
  - Odkazy na PDF inspekční zprávy
  - Odkaz na profil školy v InspIS PORTÁL
  - Skript `npm run update:csi` pro stažení a zpracování otevřených dat ČŠI

### Bezpečnost
- **Path Traversal ochrana** — validace ID, kontrola nebezpečných sekvencí v API `/api/school-details/[id]`
- **Security headers** — CSP, HSTS, X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy
- **Rate limiting** — max 100 požadavků za minutu na IP adresu

### Optimalizace
- **Server-side filtrování škol** — nové API `/api/schools/search` eliminuje 5.1 MB JSON fetche
  - Simulátor nyní stahuje pouze relevantní data (typicky <50 KB)
  - Odhadovaná úspora: ~51 GB/měsíc při 10 000 unikátních návštěvnících
- **Cache headers** — 24h cache, 7 dnů stale-while-revalidate pro statická data
- **Debounced search** — API se volá až po dokončení psaní (300ms delay)

### Změněno
- **Nová struktura stránek škol** — Přehled + Detail oborů
  - `/skola/{redizo}-{nazev}` - Přehled školy s kartami všech oborů/zaměření
  - `/skola/{redizo}-{nazev}-{obor}` - Detail oboru s konkrétními statistikami
  - `/skola/{redizo}-{nazev}-{obor}-{zamereni}` - Detail zaměření s vlastními daty
- **Navigace mezi obory** — horizontální taby s kapacitou a minimálními body
- **Plné české názvy** — místo zkratek (GY4 → „Čtyřleté gymnázium", atd.)
- **Vyhledávání škol** — aliasy pro PORG pobočky (Libeň, Ostrava, Nový PORG)

### Přidáno
- **Stránka /jak-vybrat-skolu** — komplexní průvodce pro uchazeče
  - Osvědčené strategie pro výběr tří priorit
  - Tipy na přípravu na jednotné přijímací zkoušky
  - Jak vybrat správný profil školy
  - Praktické rady pro den zkoušky

### Opraveno
- **Duplicitní URL** — školy s více programy se stejným názvem ale různou délkou studia mají unikátní URL
  - Např. `/skola/600004589-gymnazium-jana-nerudy-hellichova-gymnazium-4lete` a `...-6lete`

---

[0.2.0]: https://github.com/tangero/stredniskoly/releases/tag/v0.2.0
[0.1.0]: https://github.com/tangero/stredniskoly/releases/tag/v0.1.0
