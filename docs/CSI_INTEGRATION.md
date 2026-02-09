# Integrace dat ČŠI (Česká školní inspekce)

## Přehled

Aplikace zobrazuje inspekční zprávy z České školní inspekce pro každou školu. Data jsou načítána z otevřených dat ČŠI a automaticky propojována podle REDIZO identifikátoru.

## Kde se to zobrazuje na webu

- **Stránka:** detail školy (`/skola/[slug]`)
- **Umístění:** sekce **„Inspekční zprávy ČŠI“** pod blokem Kontakt a CTA
- **Podmínka zobrazení:** sekce se renderuje pouze pokud má škola alespoň 1 záznam v `public/csi_inspections.json`

## Zdroj dat

- **URL:** https://opendata.csicr.cz/DataSet/Detail/69
- **Formát:** CSV, JSON, XML
- **Aktualizace:** Čtvrtletně
- **Rozsah:** Posledních 10 let (od září 2012)

## Struktura dat

### CSV Dataset
```csv
REDIZO, Jmeno, DatumOd, DatumDo, LinkIZ, PortalLink
```

- **REDIZO**: Resortní identifikátor školy (9 číslic)
- **Jmeno**: Název školy
- **DatumOd/DatumDo**: Období inspekce
- **LinkIZ**: URL na PDF zprávu
- **PortalLink**: URL na profil školy v InspIS PORTÁL

### Zpracovaný JSON
```json
{
  "600012345": {
    "redizo": "600012345",
    "jmeno": "Gymnázium XY",
    "inspections": [
      {
        "dateFrom": "2023-05-01T00:00:00.0000000",
        "dateTo": "2023-05-03T23:59:59.9990000",
        "reportUrl": "https://portal.csicr.cz/Files/Get/...",
        "portalUrl": "https://portal.csicr.cz/School/600012345"
      }
    ],
    "inspectionCount": 3,
    "lastInspectionDate": "2023-05-01T00:00:00.0000000"
  }
}
```

## Použití

### Aktualizace dat

```bash
# Stáhnout a zpracovat nejnovější data z ČŠI
npm run update:csi
```

Tento příkaz:
1. Stáhne CSV soubor z OpenData portálu ČŠI
2. Zpracuje a agreguje data podle REDIZO
3. Vytvoří `public/csi_inspections.json`

### Načtení dat v kódu

```typescript
import { getCSIDataByRedizo } from '@/lib/data';

// Načíst inspekční zprávy pro školu
const csiData = await getCSIDataByRedizo('600012345');

if (csiData) {
  console.log(`Škola má ${csiData.inspectionCount} inspekcí`);
  console.log(`Poslední inspekce: ${csiData.lastInspectionDate}`);
}
```

### Komponenty

#### SchoolInspections
Zobrazuje kompletní seznam inspekčních zpráv pro školu.

```tsx
import { SchoolInspections } from '@/components/SchoolInspections';

<SchoolInspections csiData={csiData} />
```

#### InspectionBadge
Kompaktní badge pro zobrazení v seznamech.

```tsx
import { InspectionBadge } from '@/components/SchoolInspections';

<InspectionBadge csiData={csiData} />
```

## Jak to funguje

1. **Skript `process-csi-data.js`:**
   - Stáhne CSV z OpenData portálu
   - Seskupí záznamy podle REDIZO
   - Seřadí inspekce od nejnovější
   - Uloží agregovaná data do JSON

2. **Funkce v `lib/data.ts`:**
   - `getCSIData()` - načte celý dataset
   - `getCSIDataByRedizo()` - vrátí data pro konkrétní školu
   - `wasInspectedRecently()` - kontrola, zda byla škola nedávno inspekována
   - `getInspectionBadgeText()` - generuje text pro badge

3. **Zobrazení na webu:**
   - Sekce "Inspekční zprávy ČŠI" na stránce školy
   - Seznam všech inspekcí s odkazy na PDF
   - Datum poslední inspekce
   - Odkaz na profil školy v ČŠI portálu

## Mapování na soubory

- `scripts/process-csi-data.js` – stažení CSV z OpenData ČŠI a transformace do JSON
- `public/csi_inspections.json` – vygenerovaný dataset pro runtime
- `src/types/school.ts` – TypeScript typy pro ČŠI data
- `src/lib/data.ts` – načítání dat a helper funkce (`getCSIData*`, badge helpery)
- `src/components/SchoolInspections.tsx` – UI komponenta se seznamem inspekcí a odkazy
- `src/app/skola/[slug]/page.tsx` – napojení komponenty na detail školy

## Statistiky

- **Celkem škol v datasetu:** ~9 564
- **Celkem inspekcí:** ~14 925
- **Střední školy a gymnázia:** ~1 532 inspekcí

## Budoucí vylepšení

- [ ] Automatická aktualizace (GitHub Actions / cron)
- [ ] NLP analýza PDF zpráv pro extrakci klíčových zjištění
- [ ] Agregované skóre kvality na základě zjištění
- [ ] Filtrování škol podle výsledků inspekce
- [ ] Badge v seznamu škol
- [ ] Timeline vizualizace historie inspekcí

## Licence dat

Data jsou poskytována Českou školní inspekcí jako otevřená data a jsou publikována podle § 174 zákona č. 561/2004 Sb., o předškolním, základním, středním, vyšším odborném a jiném vzdělávání (školský zákon).
