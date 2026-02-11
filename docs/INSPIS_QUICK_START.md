# InspIS PORTÁL Integrace - Quick Start (bez DB)

> Rychlý průvodce implementací InspIS dat do profilů škol přes file-based architekturu.

## 0) Předpoklady

- Node.js + npm
- CSV soubor: `/tmp/inspis_portal_skoly.csv`
- Repozitář obsahuje `scripts/import-inspis-data.js`

## 1) Vygenerovat datový artefakt

```bash
npm run inspis:build-data
```

Skript vytvoří:

- `data/inspis_school_profiles.json`
- `data/inspis_coverage_summary.json`

## 2) Ověřit coverage

```bash
cat data/inspis_coverage_summary.json
```

Zkontrolujte zejména:

- `schools_total`
- `schools_with_inspis`
- `coverage_percentage`

## 3) Napojit loader (server-side)

V `src/lib/data.ts` musí být:

- `getInspisDataset()`
- `getInspisDataByRedizo(redizo)`

Loader má číst z `data/inspis_school_profiles.json` a držet in-memory cache.

## 4) Napojit UI sekci „O škole"

- Komponenta: `src/components/school-profile/SchoolInfoSection.tsx`
- Integrace: `src/app/skola/[slug]/page.tsx`
- Umístění: pod grid oborů, nad inspekční sekcí

Render podmíněně:

```tsx
{inspis && <SchoolInfoSection data={inspis} />}
```

Feature flag rollout:

```bash
# .env.local
INSPIS_ENABLED=true
```

## 5) Build + kontrola

```bash
npm run lint
npm run build
```

## Troubleshooting

### Chybí CSV soubor

```bash
ls -lh /tmp/inspis_portal_skoly.csv
```

### ETL spadne na formátu dat

- ověřte, že CSV má sloupce: `REDIZO`, `Nazev_formulare`, `Nazev_otazky`, `Odpoved`
- zkontrolujte, že skript filtruje `Portál - SŠ`

### Na stránce školy se sekce nezobrazuje

- škola nemá InspIS data (dobrovolné vyplnění)
- ověřte REDIZO ve výstupním JSON

## Release proces (kvartálně)

1. stáhnout nové CSV,
2. spustit `npm run inspis:build-data`,
3. commitnout změny v `data/`,
4. deploy na Vercel.
