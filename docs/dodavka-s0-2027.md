# Dodávka S0 — historická data bez osobních predikcí

Verze 1.1, 11. 9. 2026. **Hotovo, nasazeno a veřejně ověřeno. O-13 a O-4 uzavřeny.** Rozsah: O-13 a O-4 z návrhu rozvoje §3. Schválení realizace: odpověď zadavatele k R5. Tento dokument není přejímkou Mého výběru ani potvrzením úplné nabídky 2027.

## Změněné chování

- Simulátor nemá kategorie přijetí, počty „dostupných“ škol, bodové doporučování ani odvozené filtrování. ČJ/MA jsou volitelným záznamem 0–50; jejich změna nemění seznam ani pořadí oborů.
- Jeden abecední seznam s hledáním, krajem, délkou studia a stránkováním. Vybrané obory lze seřadit přístupnými tlačítky, odebrat, porovnat historická fakta a sdílet. API vrací skutečný celkový počet výsledků.
- Katalog zůstává označen jako 2025. Výsledky 2026/1. kolo se připojují pouze jednoznačnou normalizovanou shodou celého ID včetně zaměření. Chybějící vazba je viditelná. Nejde o úplný katalog přijímání 2027.
- Zobrazené průměry přijatých mají rok, kolo, zdroj a škálu. Průměr není minimum ani doporučený cíl. Osobní porovnání výslovně uvádí „Pro toto porovnání nemáme ověřený údaj“.
- `chances.ts` vrací pouze popisnou historii. Odstraněny odhady procent přijetí, příštího minima, bezpečnosti kombinace a z nich odvozená doporučení. Nulový počet přijatých je 0 %, chybějící nebo neplatný jmenovatel je neznámý.
- Karty zobrazují délku studia, aby se rozlišily například čtyřleté a osmileté gymnázium. Při změně výběru přes historii prohlížeče se nabídka starého kopírovaného odkazu skryje.
- Odkazy z hledání používají kanonické názvy existujících profilů a rozlišují délku studia; rozdílný název ve zdroji už nesměruje potichu na obecný přehled.
- Zachovány staré URL s `cj`, `ma`, `skoly`, `srovnani`. Nové odkazy ukládají ID jako JSON pole, protože zaměření mohou obsahovat čárky. Sdílení propouští pouze tyto veřejné parametry. Neznámé ID zůstane viditelné a lze ho odebrat; zpět/vpřed obnoví výběr včetně prázdného.

## Datové rozhodnutí a důkazy

| Pole / cesta | Zjištění | Oprava |
|---|---|---|
| `jpz_min_actual`, předměty u minima, kohorty | `scripts/enrich_schools_data.py:load_applicant_stats` seskupuje přijaté jen podle REDIZO+KKOV. Nezohledňuje zaměření, formu ani zkrácení; identita populace pro konkrétní nabídku není ověřená. | Obohacení se nepoužívá jako minimum konkrétní nabídky. V rozšířených statistikách je `null`, včetně kohort ze stejného importu. Základní zdrojové soubory zůstávají zachované pro audit. |
| `min_body` | Není doložen výklad jako školní body JPZ + další kritéria pro konkrétní rok. `Math.max` s individuálním minimem neověřuje ani škálu, ani populaci. | Vyhledávací API jej jako hranici nevrací. Rozšířené statistiky a detail API vracejí `null`; žádná náhradní konstanta. |
| `cj_min + ma_min` | Nezávislá minima mohou patřit různým lidem. Jejich součet není minimum součtu. | Odstraněn výpočet z `data.ts` a detail API, včetně návazného žebříčku náročnosti. |
| `extra_body`, `hasExtraCriteria` | Rozdíl metodicky odlišných minim není důkaz školních kritérií. | Obě hodnoty neznámé, žádný odhad „bodů navíc“. Obnovení vyžaduje skutečná kritéria školy pro daný rok. |
| Škála ČJ/MA | Historický procentní skór má 0–100 za předmět. Nový výsledkový import 2026 již škálu převedl. | Starší předmětový skór validovat a dělit dvěma jednou; výsledky 2026 znovu nedělit. `null`, nečíselné a hodnoty mimo škálu nejsou nula. |
| Identita v `data.ts` | Starší index ořezával zaměření a přepisoval záznam posledním kandidátem. | Jednoznačný celý normalizovaný klíč; bez fallbacku na základ oboru či neoznačený jiný ročník. |

Změna rozšířených statistik zasahuje také její konzumenty na profilech a regionálních tabulkách. Neznámé minimum nemá číselný fallback. S0 není auditem všech historických ukazatelů celého webu: starší souhrnné indexy a datové rodiny mimo uvedené cesty musí projít samostatnou kontrolou v dodávce profilů. Nezaměňovat to s uzavřením původních dvou konkrétních nálezů.

## Přejímky

- `node --test tests/school-key.test.mjs tests/s0.test.mjs`: 7/7; nulové/chybějící hodnoty, škála, výstup O-4, kolize klíčů a staré/nové URL včetně čárek.
- `BASE_URL=http://127.0.0.1:3218 node --test tests/s0-api.integration.mjs`: 6/6 proti oddělenému produkčnímu buildu commitu `5fc77fe`; změna skóre, filtry, stránkování, více zaměření, chybějící historie, kolize, detail API a skutečně doručovaný JS.
- TypeScript a produkční `pnpm exec next build`: prošly, 1 168 statických cest. Známé varování Next.js o více lockfilech není novou chybou.
- ESLint nového simulátoru, obou opravovaných API a nových pomocných modulů: bez chyb.
- Browser přejímka: desktop 1280 px, mobil 390 px bez vodorovného přetečení; přidání, odebrání, pořadí, sdílení, starý odkaz, neznámé ID, zpět/vpřed včetně prázdného výběru. Při blokovaném API obě chyby viditelné, výběr zachován; po obnovení API opakování úspěšné. [Desktop](podklady/s0-2027/desktop.png), [mobil](podklady/s0-2027/mobile.png), [HTTP protokol](podklady/s0-2027/api-local.txt).
- Veřejné nasazení: přejato níže, včetně následné opravy rozlišení délky studia.

Reprodukce HTTP testů vyžaduje checkout stejné datové revize jako testované nasazení. Testy porovnávají výstup s přesnými místními zdrojovými hodnotami, nikoli jen s přítomností pole.

## Návaznost

Po veřejné přejímce navázat M0 (ověřené měření), identitou a stavy nabídky 2027 pro profily a pilotem Mého výběru podle D1/D2. Způsob uložení, pracovního pořadí a sdíleného náhledu řeší PRD. S0 nezavádí účet, synchronizaci ani oprávnění ke sdílení; současný odkaz je veřejným nastavením historického simulátoru.


## Veřejná přejímka a historie vydání

**11. 9. 2026, 11:07 UTC (13:07 Praha): přejato.** [PR #73](https://github.com/tangero/stredniskoly/pull/73) dodal S0 (`cb55e7f`, oprava odkazů `5fc77fe`, merge `bf79682`). [PR #74](https://github.com/tangero/stredniskoly/pull/74) doplnil rozlišení délky studia a skrytí zastaralého odkazu ke kopírování při změně historie (`ce04c51`, merge `e752c21a3dc2803cacbe953ff313836cf58d2eab`). Kontroly Vercelu i GitGuardian prošly u obou PR.

- Produkce: `dpl_8Y6NpEygY7NjTDUJ9jLDaQXC1GoU`, stav READY, Git `e752c21`; [doklad](podklady/s0-2027/deployment.json).
- [Veřejné HTTP přejímky](podklady/s0-2027/api-production.txt): **6/6** proti `https://www.prijimackynaskolu.cz`. Ověřeno skóre 0/100 bez vlivu na seznam, filtry a stránkování, zaměření, čárky, kolize, neznámé ID/historie, přesný oborový odkaz, detail API i doručovaný JS. Předchozí přejímka PR #73 je zachována zvlášť.
- [Veřejné skripty se SHA-256](podklady/s0-2027/public-js.json): kontrolováno 9 skriptů. Aktuální simulátor `b80385d4f3b278de.js`, SHA-256 `150406cffefb44a2a3ba4f91c1b09a2b826390189f1dbc69dac348fa4c01f2df`. Původní tři kategorie ani `estimatedChancePct`/`estimatedMinScore` v doručovaných skriptech nejsou. Samotná případná existence starého souboru v CDN neznamená, že ho současná stránka používá.
- Browser na produkci: starý sdílený odkaz načetl dva správné obory; karta výslovně uvádí 4leté/8leté studium, ročník a zdroj výsledků i neznámé osobní porovnání. Desktop 1280 px a mobil 390 px bez přetečení a bez chybové překryvné vrstvy. [Desktop](podklady/s0-2027/production-desktop.png), [mobil](podklady/s0-2027/production-mobile.png).
- Test zpět po zkopírování odkazu: při jiném pořadí se stará nabídka kopírování skryje; ověřeno v poslední verzi klienta. Návrat k prázdnému výběru, chyby API a opakování jsou popsány výše.

Tím je splněna přejímka §3 a uzavřeny O-13/O-4. O-19/O-21 zůstávají uzavřené. Nejde o plošné potvrzení kvality každého staršího ukazatele webu ani o dokončení Mého výběru, měření M0 nebo úplného katalogu 2027.

## Doplnění 11. 9. 2026 — otevřená návaznost O-13 mimo přejaté cesty

Audit dat karet v1.1 a jeho oponentura potvrdily, že hlavní profil a `/detail` dále publikují neověřené minimum/osobní interpretaci historického poměru; `/detail` navíc používá chybnou škálu. Původní výsledky přejímky výše zůstávají historickým důkazem pro tehdy testované cesty, nikoli důkazem očištění celého webu. **O-13 je v celowebovém rozsahu otevřený.** A-02 je pokračování původního blokátoru, A-03 související chyba jednotek a mezera stejné přejímky. Nejde o tvrzení, že se opravený simulátor vrátil ke starým predikcím.

Uzavření vyžaduje matici konzumentů a datových větví v [auditu dat karet v1.1](audit-dat-karet-2027.md#návrh-sdíleného-kontraktu-a-přejímky), včetně exportů a alternativních detailů. Tímto doplněním se žádná produkční vada neopravuje.


## Doplnění 11. 9. 2026 — celowebová návaznost O-13 přejata

Po znovuotevření auditem karet proběhla dodávka P0 v PR #81 a #82. Aplikační commit `04c369fb7a4d9b5e360dfb76260932e92c75524c` je nasazený a všech 26 integračních kontrol prošlo na veřejné doméně. **O-13 v celowebovém rozsahu publikačních vad je uzavřený.** Rozsah, důkazy a zbývající katalogová práce jsou v `dodavka-p0-dat-karet-2027.md` v1.2. Původní omezená přejímka S0 i následné znovuotevření výše jsou zachovány jako historie.
