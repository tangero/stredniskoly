# Design: CERMAT výsledky 2026 — datová integrace a prezentace

**Datum:** 2026-05-15  
**Status:** Schváleno  
**Scope:** Integrace výsledků přijímacích zkoušek 2026 do webu — detail školy + makro stránka

---

## Kontext

CERMAT zveřejnil 15. 5. 2026 výsledky 1. kola přijímacích zkoušek 2026 (`PZ2026_kolo1_vysledky.xlsx`, 3,5 MB). Jde o novou kategorii dat — dosud web zobrazoval pouze přihlášky (poptávku). Nová data obsahují skutečné skóre přijatých uchazečů, srovnatelné s rokem 2025.

Klíčová zjištění z analýzy:
- Matematika posílila o 6–7 bodů průměrného skóre přijatých napříč všemi typy škol
- Celkem o 7 702 méně přihlášek než v 2025 (demografický pokles)
- Lycea: +925 nových míst, nejrychleji rostoucí typ školy
- Nástavby: nárůst přihlášek o +2 640 (nečekaný výkyv)

---

## Cíle

1. **Pro budoucí uchazeče 2027** — zobrazit na detailu každé školy, jaké skóre bylo potřeba pro přijetí v 2026, s trendem vůči 2025.
2. **Pro veřejnost a média** — přehledná makro stránka s klíčovými zjištěními, žebříčky a srovnáním.

---

## Architektura

### Datová pipeline (roční cyklus)

Každý rok po zveřejnění CERMAT dat:

```
PZ{YEAR}_kolo1_vysledky.xlsx
    ↓
scripts/import_cermat_results.py --year {YEAR}
    ↓
public/cermat_results_{YEAR}.json    ← per škola-obor
public/cermat_results_meta.json      ← aktualizace
```

**`cermat_results_meta.json`**
```json
{
  "latest_year": 2026,
  "available_years": [2025, 2026]
}
```

**`cermat_results_{YEAR}.json`** — klíč: `{REDIZO}_{KKOV}` (příp. s příponou zaměření)
```json
{
  "600001431_79-41-K/41": {
    "cj_ma_prijati": 183.9,
    "cj_prijati": 92.7,
    "ma_prijati": 91.2,
    "cj_ma_prijati_prev": 170.3,
    "delta_cj_ma": 13.6,
    "kapacita": 90,
    "prijati": 90,
    "rank_in_type": 1,
    "school_type": "GY4",
    "nazev": "Gymnázium Jana Keplera",
    "kraj": "Hlavní město Praha"
  }
}
```

Klíčování odpovídá vzoru z `applications_2026.json`. Skript přebírá matching logiku z `import_cermat_2026_real.py` (přesný match REDIZO+KKOV+zaměření, fallback na normalizovaný slug).

### Nové funkce v `src/lib/data.ts`

```typescript
// Načte meta (dostupné roky)
getResultsMeta(): Promise<ResultsMeta>

// Načte výsledky pro daný rok (lazy, cachované)
getResultsForYear(year: number): Promise<Map<string, SchoolResult>>

// Výsledky pro konkrétní školu (použito na detailu školy)
getSchoolResultsByRedizo(redizo: string, year?: number): Promise<SchoolResult[]>
```

---

## Deliverable 1 — Detail školy

### Umístění

Na stránce `/skola/[slug]` pod existujícím `Applications2026Banner`.

### Komponenta `SchoolResults2026`

> Název odpovídá vzoru `Applications2026Banner`. Při integraci dat 2027 bude refaktorována na `SchoolResultsPanel` s prop `year`.

```
┌─────────────────────────────────────────────────────┐
│ 📊 Výsledky přijímacích zkoušek 2026                │
│                                                      │
│  183.9 b průměr přijatých          ↑ +13.6 vs 2025 │
│  ┌──────────────────┐  ┌─────────────────────────┐  │
│  │ Český jazyk 92.7 │  │ Matematika        91.2  │  │
│  │        ↑ +0.4    │  │              ↑ +13.6    │  │
│  └──────────────────┘  └─────────────────────────┘  │
│                                                      │
│  Pořadí GY4: ████████████████░  #1 z 380 škol       │
│                                                      │
│  Data: CERMAT 15. 5. 2026    Výsledky všech škol →  │
└─────────────────────────────────────────────────────┘
```

**Props:**
- `results: SchoolResult[]` — výsledky pro danou školu (příp. více oborů)
- `schoolType: string` — pro zobrazení kontextu žebříčku

**Chování:**
- Pokud má škola více oborů, zobrazí každý zvlášť (stejný vzor jako Applications2026Banner)
- Pokud data neexistují (škola bez JPZ), komponenta se nevykreslí (`return null`)
- Trend šipka: zelená ↑ při Δ > 0, červená ↓ při Δ < 0, šedá při Δ ∈ ⟨-1, 1⟩

---

## Deliverable 2 — Makro stránka `/vysledky-[year]`

Dynamická route `src/app/vysledky-[year]/page.tsx` fungující pro `/vysledky-2026`, `/vysledky-2027` atd.

### Sekce (v pořadí)

#### ① Hero
- Tmavý gradient background
- Nadpis: „Přijímačky {year}: výsledky přijímacích zkoušek"
- 3 velká čísla: celkové přihlášky, kapacita, index poptávky s Δ vs předchozí rok

#### ② Klíčová zjištění (4–6 karet)
- Barevné karty s ikonou, titulkem a datovou větou
- Data-driven: vygenerovány automaticky z porovnání dvou let
- Pořadí: seřazeny podle velikosti Δ (největší změna první)
- Příklady karet pro 2026: MA +6b, −7702 přihlášek, lycea +925 míst, nástavby +2640

#### ③ Srovnání 2025 vs 2026 podle typu školy
- Tabulka: Typ | Přihlášky | Kapacita | Skóre přijatých | Δ skóre
- Řádky: GY8, GY6, GY4, LYC, SOŠ, SOU, NAS
- Záhlaví seřaditelné (client component)

#### ④ Top gymnázia — žebříček GY4
- Top 30 čtyřletých gymnázií podle průměrného ČJ+MA skóre přijatých
- Sloupce: pořadí, název, kraj, skóre, Δ vs předchozí rok
- Klik na školu → detail školy
- Záložky: GY4 / GY8 / GY6 (tab switcher)

#### ⑤ Co to znamená pro {year+1}?
- Tmavá sekce, 3–5 datově podložených rad
- Generovány ze zjištěných trendů (MA posílila → procvičuj MA atd.)
- Statický text zkontrolovaný autorem před deployem

#### ⑥ Vyhledávání škol s výsledky
- Textový filter + dropdown: typ školy, kraj
- Tabulka: název, kraj, skóre přijatých, Δ, odkaz
- Řazení: výchozí podle skóre desc

### SEO
- `title`: „Výsledky přijímacích zkoušek {year} — přehled škol a oborů"
- `description`: generovaná z klíčových čísel
- Stránka staticky generovaná (SSG) z `generateStaticParams` pro dostupné roky
- Přidána do `sitemap.xml`

---

## Nové a upravené soubory

### Nové soubory
| Soubor | Účel |
|--------|------|
| `scripts/import_cermat_results.py` | xlsx → JSON pipeline, roční cyklus |
| `public/cermat_results_2026.json` | výsledky 2026 per škola-obor |
| `public/cermat_results_meta.json` | meta index dostupných let |
| `src/components/SchoolResults2026.tsx` | widget na detailu školy |
| `src/app/vysledky-[year]/page.tsx` | makro stránka (SSG) |
| `src/app/vysledky-[year]/ResultsClient.tsx` | interaktivní části (filtr, tabulka, taby) |

### Upravené soubory
| Soubor | Změna |
|--------|-------|
| `src/lib/data.ts` | +3 funkce: getResultsMeta, getResultsForYear, getSchoolResultsByRedizo |
| `src/app/skola/[slug]/page.tsx` | přidat SchoolResults2026 pod Applications2026Banner |
| `public/sitemap.xml` | přidat /vysledky-2026 |
| `next.config.ts` | žádná změna nutná (dynamic route funguje out-of-box) |

---

## Otevřené otázky (vyřešit při implementaci)

1. **Matching klíčů** — ověřit, zda klíčování `REDIZO_KKOV` pokryje všechny záznamy, nebo zda je nutné přidat zaměření (jako v `applications_2026.json`).
2. **Výsledky 2025** — data 2025 jsou v xlsx po regionech, nikoli flat. Script musí sloučit všechny listy (logika je v analýzovém skriptu z 15. 5. 2026 — viz `/tmp/cermat_analysis.py`).
3. **Rank výpočet** — `rank_in_type` počítáme v Python scriptu při importu, ne v data.ts.
4. **Rady pro 2027** — sekce ⑤ bude zpočátku statický text, v budoucnu generovatelný z dat.
