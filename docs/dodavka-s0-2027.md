# Dodávka S0 — historická data bez osobních predikcí

Verze 1.0, 11. 9. 2026. **Implementováno, veřejná přejímka zatím čeká na nasazení.** Rozsah: O-13 a O-4 z návrhu rozvoje §3. Schválení realizace: odpověď zadavatele k R5. Tento dokument není přejímkou Mého výběru ani potvrzením úplné nabídky 2027.

## Změněné chování

- Simulátor nemá kategorie přijetí, počty „dostupných“ škol, bodové doporučování ani odvozené filtrování. ČJ/MA jsou volitelným záznamem 0–50; jejich změna nemění seznam ani pořadí oborů.
- Jeden abecední seznam s hledáním, krajem, délkou studia a stránkováním. Vybrané obory lze seřadit přístupnými tlačítky, odebrat, porovnat historická fakta a sdílet. API vrací skutečný celkový počet výsledků.
- Katalog zůstává označen jako 2025. Výsledky 2026/1. kolo se připojují pouze jednoznačnou normalizovanou shodou celého ID včetně zaměření. Chybějící vazba je viditelná. Nejde o úplný katalog přijímání 2027.
- Zobrazené průměry přijatých mají rok, kolo, zdroj a škálu. Průměr není minimum ani doporučený cíl. Osobní porovnání výslovně uvádí „Pro toto porovnání nemáme ověřený údaj“.
- `chances.ts` vrací pouze popisnou historii. Odstraněny odhady procent přijetí, příštího minima, bezpečnosti kombinace a z nich odvozená doporučení. Nulový počet přijatých je 0 %, chybějící nebo neplatný jmenovatel je neznámý.
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
- `BASE_URL=http://127.0.0.1:3217 node --test tests/s0-api.integration.mjs`: 5/5 proti produkčnímu lokálnímu buildu; změna skóre, filtry, stránkování, více zaměření, chybějící historie, kolize, detail API a skutečně doručovaný JS.
- TypeScript a produkční `pnpm exec next build`: prošly, 1 168 statických cest. Známé varování Next.js o více lockfilech není novou chybou.
- ESLint nového simulátoru, obou opravovaných API a nových pomocných modulů: bez chyb.
- Browser přejímka: desktop 1280 px, mobil 390 px bez vodorovného přetečení; přidání, odebrání, pořadí, sdílení, starý odkaz, neznámé ID, zpět/vpřed včetně prázdného výběru. Při blokovaném API obě chyby viditelné, výběr zachován; po obnovení API opakování úspěšné. [Desktop](podklady/s0-2027/desktop.png), [mobil](podklady/s0-2027/mobile.png), [HTTP protokol](podklady/s0-2027/api-local.txt).
- Veřejné nasazení: doplní závěrečný záznam níže.

Reprodukce HTTP testů vyžaduje checkout stejné datové revize jako testované nasazení. Testy porovnávají výstup s přesnými místními zdrojovými hodnotami, nikoli jen s přítomností pole.

## Návaznost

Po veřejné přejímce navázat M0 (ověřené měření), identitou a stavy nabídky 2027 pro profily a pilotem Mého výběru podle D1/D2. Způsob uložení, pracovního pořadí a sdíleného náhledu řeší PRD. S0 nezavádí účet, synchronizaci ani oprávnění ke sdílení; současný odkaz je veřejným nastavením historického simulátoru.
