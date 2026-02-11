# InspIS PORTÁL - Shrnutí (Vercel file-based)

> **TL;DR:** Integrace poběží bez databáze. CSV z ČŠI transformujeme na server-side JSON v `data/` a data budeme renderovat na stránce školy přes `redizo`.

## Rozhodnutí

- Datová vrstva: **bez Supabase/DB**
- Hosting: **Vercel only**
- Zdroj: `/tmp/inspis_portal_skoly.csv` (ČŠI open data)
- Artefakt: `data/inspis_school_profiles.json`
- Scope VLNA 1: školné, zaměření, studenti/kapacita, přijímačky, jazyky, vybavení, dostupnost

## Implementační směr

1. ETL skript `scripts/import-inspis-data.js` převede CSV -> JSON podle REDIZO.
2. `src/lib/data.ts` načte JSON server-side s cache.
3. `src/app/skola/[slug]/page.tsx` zobrazí sekci `O škole` pouze když data existují.
4. Fallback: bez dat se sekce nerenderuje.

## Dokumentace

- `docs/INSPIS_README.md` - hlavní dokument
- `docs/INSPIS_QUICK_START.md` - rychlý start
- `docs/INSPIS_INTEGRACE_PLAN.md` - detailní plán VLNA 1/2
- `docs/INSPIS_VLNA2_PLAN.md` - konkrétní backlog navazující iterace
- `docs/INSPIS_KOMPONENTY_PRIKLAD.tsx` - komponentové reference
- `docs/INSPIS_MIGRATION.sql` - archivní DB návrh (nepoužívá se)

## Timeline

- FÁZE 1 (Data + loader): 2-3 dny
- FÁZE 2 (UI sekce): 2-3 dny
- FÁZE 3 (Integrace + QA): 2-3 dny

**Status:** Ready k realizaci bez DB
