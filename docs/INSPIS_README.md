# InspIS PORTÁL - Integrace dat do Profilů škol (Vercel file-based)

**Datum aktualizace:** 11. února 2026  
**Dataset:** https://opendata.csicr.cz/DataSet/Detail/70  
**Status:** Schváleno pro realizaci bez databáze

## Architektura

Projekt bude implementován bez externí databáze:

- Zdrojová data: CSV od ČŠI (`/tmp/inspis_portal_skoly.csv`)
- ETL: `scripts/import-inspis-data.js`
- Výstup: `data/inspis_school_profiles.json` + `data/inspis_coverage_summary.json`
- Runtime: server-side načtení v `src/lib/data.ts` s cache
- UI: sekce „O škole“ v `src/app/skola/[slug]/page.tsx`

Tento model odpovídá existujícím datům v repozitáři (`public/` + `data/`) a je vhodný pro kvartální refresh.

## Obsah INSPIS dokumentace

1. `docs/INSPIS_SUMMARY.md` - rychlý přehled
2. `docs/INSPIS_QUICK_START.md` - implementace v krocích
3. `docs/INSPIS_INTEGRACE_PLAN.md` - detailní plán
4. `docs/INSPIS_KOMPONENTY_PRIKLAD.tsx` - UI reference
5. `docs/INSPIS_MIGRATION.sql` - archivní DB návrh (nepoužívat)
6. `scripts/import-inspis-data.js` - ETL CSV -> JSON
7. `docs/INSPIS_VLNA2_PLAN.md` - navazující plán po stabilizaci VLNY 1

## Scope VLNA 1

### Zobrazované datové bloky

- Základní info: školné, zaměření, studenti/kapacita
- Přijímačky: zkoušky, předměty, přípravné kurzy, termíny
- Výuka: jazyky, CLIL, internet ve výuce
- Vybavení: odborné učebny, tělocvik/sport, přístup k PC
- Dostupnost: bezbariérovost, doprava, vzdálenost zastávky

### UX

- Umístění sekce „O škole“: pod grid oborů, nad inspekcí
- Bez dat: sekce se nezobrazí
- Mobile: vertikální bloky/collapsible sekce

## Provozní model

### Aktualizace dat

- Perioda: čtvrtletně
- Proces:
  1. stáhnout nové CSV,
  2. spustit ETL,
  3. commitnout výstupní JSON,
  4. deploy na Vercel.

### Výhody

- žádný nový infrastrukturní vendor,
- jednoduchý rollback (git revert),
- predikovatelná latence (server-side JSON read + cache).

## Důležité soubory

- ETL vstup: `/tmp/inspis_portal_skoly.csv`
- ETL skript: `scripts/import-inspis-data.js`
- Data artefakt: `data/inspis_school_profiles.json`
- Coverage: `data/inspis_coverage_summary.json`
- Loader: `src/lib/data.ts`
- UI sekce: `src/components/school-profile/SchoolInfoSection.tsx`
- Integrace: `src/app/skola/[slug]/page.tsx`

## Definition of Done (VLNA 1)

- ETL úspěšně vytvoří JSON pro školy SŠ
- Loader vrací data podle REDIZO
- Sekce „O škole“ se renderuje pouze pro školy s daty
- Build a lint bez chyb
- Dokumentace odpovídá realitě implementace
