# Integrace dat CSI (Ceska skolni inspekce)

## Prehled

Aplikace zobrazuje inspekce z Ceske skolni inspekce na dvou urovnich:

1. **Kompaktni shrnutí** na strance skoly (`/skola/[slug]`) — AI-extrahovane shrnutí nejnovejsi inspekce, tagy silnych stranek/rizik
2. **Detailni stranka** (`/skola/[slug]/inspekce`) — plne shrnutí vsech inspekci vcetne fakt, doporuceni a odkazu na PDF

Data pochazi ze dvou zdroju:
- **CSI Open Data** (`public/csi_inspections.json`) — metadata inspekcí (data, PDF odkazy)
- **AI extrakce** (`data/inspection_extractions.json`) — strojove zpracovane shrnutí z PDF zprav

## Architektura

```
CSI Open Data (CSV)                    Inspekci PDF zpravy
       |                                       |
  process-csi-data.js                  inspekce/scripts/run_extraction.py
       |                                       |
  public/csi_inspections.json          data/inspection_extractions.json
       |                                       |
       +------ src/lib/data.ts ----------------+
                     |
          +----------+----------+
          |                     |
  InspectionSummary      inspekce/page.tsx
  (kompaktni box)        (detailni stranka)
```

## Datove soubory

### public/csi_inspections.json (git tracked)

Metadata inspekcí z CSI Open Data. Pouziva se jako fallback pro skoly bez AI extrakce.

```json
{
  "600012345": {
    "redizo": "600012345",
    "jmeno": "Gymnazium XY",
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

Aktualizace: `npm run update:csi`

### data/inspection_extractions.json (git tracked)

AI-extrahovana data z inspekci PDF zprav. **Musi byt v `data/`, ne v `public/`** — soubor se cte jen server-side pri buildu/renderovani, neni urcen pro klienta. Umisteni v `public/` by zpusobilo prekroceni Vercel deployment limitu 75 MB.

Struktura:
```json
{
  "schools": {
    "600012345": [
      {
        "report_id": "GY8_600012345_2024-12-04",
        "inspection_from": "2024-12-04",
        "inspection_to": "2024-12-09",
        "model_id": "claude_haiku_4_5",
        "parsed_output": {
          "for_parents": {
            "plain_czech_summary": "Gymnazium nabizi kvalitni...",
            "strengths": [{ "tag": "Jazykova vyuka", "detail": "...", "evidence": "..." }],
            "risks": [{ "tag": "Frontalni vyuka", "detail": "...", "evidence": "..." }],
            "who_school_fits": ["Zaci se zajmem o jazyky..."],
            "who_should_be_cautious": ["Zaci preferujici individualni pristup..."],
            "questions_for_open_day": ["Jak je organizovana vyuka..."]
          },
          "hard_facts": {
            "maturita": { "trend": "...", "key_numbers": ["..."], "evidence": "..." },
            "absence": { "trend": "...", "key_numbers": ["..."] },
            "support_services": ["Skolni psycholog", "..."],
            "safety_climate": ["Pozitivni klima", "..."],
            "partnerships_practice": ["Mezinarodni spoluprace", "..."]
          },
          "school_profile": {
            "school_type": "GY8",
            "inspection_period": "4.-6. a 9. prosince 2024",
            "school_change_summary": "Od posledni inspekce..."
          }
        }
      }
    ]
  }
}
```

Generovani: `python3 inspekce/scripts/run_extraction.py` (pouziva AI modely k extrakci z PDF)

### inspekce/config/production_reports.json (git tracked)

Mapovani report_id na source_url (PDF odkaz). Pouziva se pro doplneni odkazu na originalní zpravu.

```json
{
  "reports": [
    {
      "report_id": "GY8_600012345_2024-12-04",
      "redizo": "600012345",
      "source_url": "https://portal.csicr.cz/Files/Get/..."
    }
  ]
}
```

## Komponenty a stranky

### InspectionSummary (`src/components/InspectionSummary.tsx`)

Client komponenta — kompaktni blok "Co zjistila inspekce" na strance skoly.

**Props:**
```typescript
interface InspectionSummaryProps {
  extractions: InspectionExtraction[];
  csiData: CSISchoolData | null;
  schoolSlug: string;  // overview slug pro link na /inspekce
}
```

**Chovani:**
- Pokud `extractions.length > 0`: zobrazí AI shrnutí (1 odstavec), max 3 zelene tagy silnych stranek, max 3 oranzove tagy rizik, odkaz na detailni stranku
- Pokud jen `csiData`: fallback — datum inspekce + PDF odkaz
- Pokud nic: nezobrazi se

### Detailni stranka (`src/app/skola/[slug]/inspekce/page.tsx`)

Server komponenta — plny detail vsech inspekci skoly.

**Renderovani:** Dynamicke (on-demand), NE staticke. Duvod: 836 pre-renderovanych inspekci HTML stranek spolu s 4752 strankami skol prekracovalo Vercel deployment limit 75 MB.

**Obsah:**
- Nejnovejsi inspekce vzdy rozbalena (bez `<details>`)
- Starsi inspekce sbalene v `<details>` panelu
- Pro kazdou inspekci: shrnutí, kontext skoly, silne stranky, rizika, komu skola sedi, kdo by mel zvazit, otazky na den otevrenych dveri, fakta ze zpravy, odkaz na PDF
- AI disclaimer

### Badge v hlavicce skoly

Na strance skoly (`/skola/[slug]`) se v hlavicce vedle category badge ("Vyvazena") zobrazi tlacitko "Co si o skole mysli Skolska inspekce?" s odkazem na `/skola/[slug]/inspekce`. Zobrazuje se jen pokud `extractions.length > 0`.

## Funkce v data.ts

```typescript
// CSI metadata
getCSIData(): Promise<CSIDataset>
getCSIDataByRedizo(redizo: string): Promise<CSISchoolData | null>

// AI extrakce
getInspectionExtractions(): Promise<Record<string, InspectionExtraction[]>>
getExtractionsByRedizo(redizo: string): Promise<InspectionExtraction[]>
```

`getInspectionExtractions()`:
- Nacte `data/inspection_extractions.json` (NE z `public/`)
- Nacte `inspekce/config/production_reports.json` pro doplneni source_url
- Filtruje zaznamy bez `plain_czech_summary`
- Deduplikuje per datum inspekce (preferuje claude model)
- Seradi od nejnovejsi
- Cachuje v module-level promenne

## Typy (src/types/school.ts)

```typescript
interface InspectionStrengthTag {
  tag: string;
  detail: string;
  evidence?: string;
}

interface InspectionExtraction {
  report_id: string;
  source_url: string;
  date: string;
  date_to: string;
  plain_czech_summary: string;
  strengths: InspectionStrengthTag[];
  risks: InspectionStrengthTag[];
  who_school_fits: string[];
  who_should_be_cautious: string[];
  questions_for_open_day: string[];
  hard_facts: Record<string, unknown>;  // mixed types: objects, arrays, strings
  school_profile: {
    school_type?: string;
    inspection_period?: string;
    school_change_summary?: string;
  };
}
```

`hard_facts` ma tri mozne tvary hodnot:
- **Objekt** s `trend`, `key_numbers[]`, `evidence` (maturita, absence)
- **Pole stringu** (support_services, safety_climate, partnerships_practice)
- **Prosty string**

Komponenta `HardFactValue` v inspekce/page.tsx resi vsechny tri tvary.

## Mapovani na soubory

| Soubor | Ucel |
|---|---|
| `public/csi_inspections.json` | CSI metadata (data, PDF linky) — git tracked |
| `data/inspection_extractions.json` | AI extrakce — git tracked, NE v public/ |
| `inspekce/config/production_reports.json` | Mapovani report_id → source_url |
| `inspekce/config/production_models.json` | Konfigurace AI modelu pro extrakci |
| `inspekce/scripts/run_extraction.py` | Hlavni skript pro AI extrakci z PDF |
| `inspekce/scripts/extract_texts.py` | Extrakce textu z PDF |
| `inspekce/scripts/generate_city_page.py` | Generator staticke HTML stranky (docs/) |
| `scripts/process-csi-data.js` | Stazeni a zpracovani CSI Open Data |
| `src/types/school.ts` | TypeScript typy |
| `src/lib/data.ts` | Data loading funkce |
| `src/components/InspectionSummary.tsx` | Kompaktni inspekce box (client) |
| `src/app/skola/[slug]/inspekce/page.tsx` | Detailni inspekce stranka (server, dynamic) |
| `src/app/skola/[slug]/page.tsx` | Hlavni stranka skoly — napojeni |

## Dulezite omezeni

### Vercel deployment limit (75 MB)

- `inspection_extractions.json` NESMI byt v `public/` — kopiroval by se do deployment output
- Inspekce stranky NESMI mit `generateStaticParams` — 836 HTML stranek prekracuje limit
- Oba problemy byly vyreseny: soubor v `data/`, stranky renderovane dynamicky

### Deduplikace

Pokud existuje vice modelu pro stejnou inspekci (stejne datum), preferuje se claude model. Implementovano v `getInspectionExtractions()`.

### AI disclaimer

Na obou urovnich (kompaktni box i detailni stranka) je upozorneni, ze shrnutí bylo vytvoreno automaticky pomoci AI a muze obsahovat nepresnosti.

## Statistiky

- **Skol s AI extrakci:** 849
- **Celkem inspekci (extrakce):** 922
- **Skol s CSI metadaty:** ~9 564
- **Celkem inspekci (metadata):** ~14 925

## Aktualizace dat

```bash
# 1. Aktualizovat CSI metadata (ctvrtletne)
npm run update:csi

# 2. Spustit AI extrakci pro nove inspekce
cd inspekce && python3 scripts/run_extraction.py

# 3. Soubor data/inspection_extractions.json commitnout
git add data/inspection_extractions.json && git commit -m "Update inspection extractions"
```

## Licence dat

Data CSI jsou poskytovana Ceskou skolni inspekci jako otevrena data podle § 174 zakona c. 561/2004 Sb. AI shrnutí jsou odvozena dila vytvorena automatickym zpracovanim inspekci zprav.
