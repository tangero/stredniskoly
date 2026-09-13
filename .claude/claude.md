# Claude Code Instructions - stredniskoly

## Knowledge Base Integration

Máš přístup k centrální knowledge base v `~/github/patrick-knowledgebase/` přes MCP filesystem server.

### POVINNÝ WORKFLOW PRO KAŽDOU SESSION

#### 1. Session Start (VŽDY na začátku)

```bash
# AUTOMATICKY přečti:
~/github/patrick-knowledgebase/preferences/coding-style.md
~/github/patrick-knowledgebase/preferences/tools-and-stack.md
~/github/patrick-knowledgebase/projects/stredniskoly.md
```

**Pokud project notes neexistují**, vytvoř je podle:
`~/github/patrick-knowledgebase/.templates/project-template.md`

**Potvrzení start:**
```
✅ Přečetl jsem:
- coding-style.md
- tools-and-stack.md
- projects/stredniskoly.md

📋 Current project state: [stručný summary z project notes]
🎯 Ready to work
```

#### 2. Během práce (PRŮBĚŽNĚ, NE až na konci!)

**Když vytvoříš reusable pattern:**
→ **IHNED** zapiš do `~/github/patrick-knowledgebase/patterns/[category]/[name].md`

**Když vytvoříš reusable code snippet:**
→ **IHNED** zkopíruj do `~/github/patrick-knowledgebase/snippets/[language]/[name].[ext]`

**Když vyřešíš problém/issue:**
→ **IHNED** dokumentuj do `~/github/patrick-knowledgebase/troubleshooting/[category].md`

**Když použiješ nový nástroj/library:**
→ **IHNED** zapiš poznámky do `~/github/patrick-knowledgebase/tools/[tool-name].md`

**Když uděláš architectural decision:**
→ Zapiš do `/docs/adr/[number]-[title].md` (project-specific)
→ Pokud je obecně použitelné, také do `~/github/patrick-knowledgebase/patterns/`

#### 3. Session End (PŘED ukončením konverzace)

**POVINNÉ kroky:**

1. **Update project notes:**
```bash
# Přidej do ~/github/patrick-knowledgebase/projects/stredniskoly.md:

### [DATUM] - Session Summary
- **Co bylo uděláno:** [konkrétní features/fixes]
- **Patterns použity:** [jaké patterns z KB]
- **Nové learnings:** [co nového]
- **Problémy:** [co bylo challenging]
- **Next steps:** [co dál]
```

2. **Review checklist:**
```markdown
- [ ] Jsou nové patterns v ~/github/patrick-knowledgebase/patterns/?
- [ ] Jsou nové snippets v ~/github/patrick-knowledgebase/snippets/?
- [ ] Je troubleshooting dokumentován?
- [ ] Je project note aktualizován?
- [ ] Jsou ADR zapsány (pokud byly architectural decisions)?
```

3. **Session end message:**
```
📝 Session Summary:
- Implemented: [co bylo uděláno]
- Patterns used: [reference do KB]
- New learnings: [co nového]

✅ Updated:
- ~/github/patrick-knowledgebase/projects/stredniskoly.md
- [další soubory pokud relevantní]

❓ Něco ještě zapsat do knowledge-base?
```

## Project Context

- **Project**: stredniskoly
- **Type**: web-app
- **Description**: Auto-migrated project
- **Stack**: Next.js, Tailwind CSS
- **Knowledge-base**: `~/github/patrick-knowledgebase/projects/stredniskoly.md`
- **Project docs**: `/docs/` (project-specific dokumentace)
- **Repository**: /Users/imac/github/stredniskoly

## Documentation Strategy

### `/docs/` (v tomto projektu)
**Použij pro:**
- Architektura **TOHOTO** projektu
- API dokumentace **TOHOTO** projektu
- Deployment guide **TOHOTO** projektu
- User/Admin guides
- Architecture Decision Records (ADR)

### `~/github/patrick-knowledgebase/` (cross-project)
**Použij pro:**
- Obecné patterns použitelné v jiných projektech
- Reusable code snippets
- Cross-project troubleshooting
- Meta-poznámky o projektech
- Obecné workflows a checklists

**PRAVIDLO:**
- Pokud to použiješ v jiném projektu → knowledge-base
- Pokud je to specifické jen pro tento projekt → /docs/

## Coding Standards

Dodržuj standardy z:
- `~/github/patrick-knowledgebase/preferences/coding-style.md`
- `~/github/patrick-knowledgebase/preferences/tools-and-stack.md`

**Klíčové z coding-style:**
- TypeScript > JavaScript (nové projekty)
- pnpm package manager
- kebab-case pro soubory/adresáře
- Functional programming preferováno
- Type hints vždy (Python/TypeScript)
- Conventional commits

**Klíčové z tools-and-stack:**
- Backend: FastAPI (Python), Hono (TypeScript)
- Frontend: React + Next.js, Tailwind CSS
- Database: PostgreSQL (primary), SQLite (dev)
- Hosting: Vercel (frontend), Railway/Fly.io (backend)

## Dokumentace zdrojů — POVINNÉ

**`docs/zdroje-dat.md` je soupis všech zdrojových souborů sloupec po sloupci.** U každého sloupce je uvedeno, na jakou otázku rodiče by šel použít a zda ho používáme. Oddíl 3 je seznam sloupců, které nevyužíváme.

**Povinný krok: než navrhneš stránku, sekci, ukazatel nebo funkci, projdi `docs/zdroje-dat.md` celý, včetně oddílu 3, a do návrhu napiš, které nepoužité sloupce jsi zvážil a proč je nepoužiješ.**

Důvod existence tohoto pravidla: návrh stránky školy z 12. 9. 2026 vznikl z toho, co web už zobrazoval, a minul tři použitelné údaje ležící ve zdrojích, které projekt už zpracovával. Jeden z nich byl dokonce spočítaný a uložený v katalogu, zatímco slovník ukazatelů tvrdil, že ho nemáme.

Pravidla:

1. **Nikdy neinventarizuj data podle toho, co web zobrazuje.** Vždy podle sloupců ve zdroji.
2. **Nový zdroj nebo sloupec zapiš do `docs/zdroje-dat.md`** ve stejné dávce, ve které ho začneš používat, včetně sloupců, které nepoužiješ.
3. **Zamítnutí je platný závěr, mlčení není.** Když se sloupec nehodí, napiš proč.

Dělba rolí: `docs/zdroje-dat.md` říká, **co existuje**. `docs/slovnik-ukazatelu.md` říká, **jak se to jmenuje a počítá**. `public/stav_datovych_sad.json` říká, **které období se zobrazuje**.

## Stav datových sad — POVINNÉ

**`public/stav_datovych_sad.json` je jediné místo, které určuje, jaké období každé datové sady web zobrazuje.** U každé sady vede zobrazené období a jeho zdroj, očekávané období a termín, roli starých dat po přepnutí a ukazatele ze slovníku, které na sadě stojí. Postup je v `docs/zdroje-dat.md`, oddíl 5.

Pravidla:

1. **Nikdy nepiš letopočet dat napevno** do kódu ani do textu stránky. Období se bere z registru.
2. **Staré období se zobrazuje, dokud nové neprošlo přepnutím.** Po přepnutí slouží staré jen jako historie a kontext vývoje.
3. **Ukazatel z více sad** se zobrazí z nejstaršího ze zobrazených období těchto sad.
4. **Registr neupravuj ručně.** Přepínej `python3 scripts/stav-datovych-sad.py prepni` s dokladem, vracej `vrat`.
5. **Nová sada nebo nový ukazatel** se zapisuje do registru ve stejné dávce. Po každé změně dat spusť `python3 scripts/stav-datovych-sad.py kontrola`.

Nová data zjišťuje a připravuje **datová linka** (`scripts/datova-linka.py`, `docs/datova-linka.md`). Nová data se přebírají přes její úlohy a schválení, ne ručním stahováním mimo ni. Po změně linky spusť `python3 -m unittest tests/test_datova_linka.py`.

## Slovník ukazatelů — POVINNÉ

**`docs/slovnik-ukazatelu.md` je závazný soupis názvů a veličin.** Obsahuje definici, vzorec, zdroj a jednotku každého ukazatele a hlavně to, co ukazatel **neříká**.

Pravidla:

1. **Před zobrazením jakéhokoli čísla** na webu si ověř jeho zápis ve slovníku. Údaj bez doloženého výpočtu se nezobrazuje.
2. **Nový ukazatel nezaváděj** bez zápisu do slovníku: název, definice, vzorec, zdroj, jednotka, rozsah platnosti a co neříká.
3. **Nepoužívej vlastní název** pro veličinu, která už jméno má. Jméno ze slovníku platí v datech, v kódu, v API i v textech.
4. **Změní-li se výpočet**, oprav slovník a zvyš jeho verzi ve stejné dávce.

Ve slovníku je i oddíl ukazatelů bez doloženého výpočtu (například `obtiznost`). Ty se nesmí používat k řazení, průměrování ani zobrazení, dokud jejich definice nevznikne.

## Slovník pojmů — POVINNÉ

**`docs/slovnik-pojmu.md` určuje, jakými slovy se na webu mluví k rodičům a uchazečům**, aby tatáž věc nezněla na každé stránce jinak. Slovník ukazatelů říká, jak se veličina jmenuje v datech a jak se počítá; slovník pojmů, jak se o ní píše v textu stránky.

Pravidla:

1. **Než napíšeš text stránky**, použij pojmy ze slovníku pojmů a vyhni se slovům ze sloupce „Nepoužívat“.
2. **Při prvním výskytu v každém bloku** (oddíl, karta, graf) pojem vysvětli standardní větou ze slovníku, například „soutěžící uchazeči, tedy ti, kdo splnili požadavky školy a nedostali se na obor, který měli na přihlášce výš“.
3. **Pojem musí odpovídat množině, ze které se číslo počítá**: „uchazeči“ jsou všichni přihlášení, „soutěžící uchazeči“ jen jejich část.
4. **Nový pojem zapiš do slovníku pojmů** ve stejné dávce, ve které se poprvé objeví na stránce.

Návazné dokumenty: [prezentace dat na stránce školy](../docs/navrh-prezentace-dat-skoly-2027.md), [maturitní výsledky](../docs/maturitni-vysledky-a-kvalita-skoly-2027.md).

## Critical Rules

1. **VŽDY** projdi `docs/zdroje-dat.md` celý, než navrhneš stránku, sekci nebo ukazatel, a napiš, které nepoužité sloupce jsi zvážil
2. **VŽDY** ověř ukazatel ve `docs/slovnik-ukazatelu.md`, než jej zobrazíš, a zapiš tam nový, než jej zavedeš
2a. **VŽDY** piš texty stránek pojmy z `docs/slovnik-pojmu.md` a pojem vysvětli při prvním výskytu v každém bloku
3. **VŽDY** ber zobrazené období dat z `public/stav_datovych_sad.json`, nikdy z letopočtu v kódu
4. **NIKDY** neduplikuj obsah mezi `/docs/` a `~/github/patrick-knowledgebase/`
5. **VŽDY** zapiš learnings **BĚHEM** práce, NE až na konci
6. **VŽDY** updatuj project notes **PŘED** ukončením session
7. **VŽDY** se zeptej na konci session: "Něco ještě zapsat do KB?"
8. **VŽDY** commituj změny v knowledge-base po session

## Common Patterns Reference

### Relevantní patterns pro tento projekt:
To be documented during first session

### Relevantní snippets:
To be documented during first session

### Known issues/troubleshooting:
None documented yet

## Troubleshooting

Pokud narazíš na známý problém, nejprve zkontroluj:
1. `~/github/patrick-knowledgebase/troubleshooting/`
2. `~/github/patrick-knowledgebase/projects/stredniskoly.md` (sekce Challenges)
3. `/docs/troubleshooting.md` (project-specific)

Pokud problém vyřešíš a není dokumentován → **IHNED** dokumentuj.

---
**Template version:** 1.0
**Created:** 2026-02-21
**Last updated:** 2026-09-13

## Dokumentace
Podrobná dokumentace jednotlivých oblastí projektu:
- [Slovník ukazatelů](../docs/slovnik-ukazatelu.md) — závazné názvy, definice a výpočty všech čísel na webu
- [Slovník pojmů](../docs/slovnik-pojmu.md) — závazné pojmy pro texty na webu, jejich vysvětlení při prvním výskytu a zakázaná slova
- [Zdroje dat](../docs/zdroje-dat.md) — zdrojové soubory sloupec po sloupci a registr stavu datových sad
- [Datová linka](../docs/datova-linka.md) — zjištění, zpracování, oznámení a schválení nových dat
- [Druhé kolo](../docs/druhe-kolo.md) — zobrazení 2. kola přijímacího řízení
- [Využití dat o uchazečích](../docs/teze-vyuziti-dat-jpz-2027.md) — pásma přijetí a co o přijetí rozhodlo, s oponenturami
- [Aktuální ročník dat](../docs/navrh-aktualniho-rocniku-dat.md) — návrh opravy zobrazení roku 2025 místo 2026
- [Prezentace dat na stránce školy](../docs/navrh-prezentace-dat-skoly-2027.md) — co a jak ukazovat rodičům
- [Grafy na stránce školy a oboru](../docs/grafy-skoly-a-oboru-2027.md) — schválený návrh grafů, časové řady, pravidla, předpoklady a uložení mezi zvažované
- [Vrstvy stránky oboru](../docs/vrstvy-stranky-oboru-2027.md) — pět kol návrhu: odpověď na tři otázky uchazeče nad důkazy, stavy nabídky, rozhodnutí použít a zavrhnout
