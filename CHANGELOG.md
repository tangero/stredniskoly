# Changelog

## 2026-02-09

### Integrace inspekčních zpráv ČŠI na detailu školy

- Přidána nová sekce **„Inspekční zprávy ČŠI“** na detail školy (`/skola/[slug]`) pro přehled školy i detail oboru/zaměření
- Přidána komponenta `SchoolInspections` s:
  - přehledem všech dostupných inspekcí školy,
  - odkazy na PDF inspekční zprávy,
  - odkazem na profil školy v InspIS PORTÁL
- Rozšířen datový model o typy `CSIInspection`, `CSISchoolData`, `CSIDataset`
- Do `src/lib/data.ts` přidány funkce pro práci s ČŠI daty:
  - `getCSIData()`
  - `getCSIDataByRedizo()`
  - `wasInspectedRecently()`
  - `getInspectionBadgeText()`
- Přidán skript `scripts/process-csi-data.js` a npm příkaz `npm run update:csi` pro stažení a zpracování otevřených dat ČŠI
- Přidán dataset `public/csi_inspections.json` (agregace podle REDIZO)
- Doplněna dokumentace integrace v `docs/CSI_INTEGRATION.md`

## 2026-02-04

### Bezpečnostní audit a optimalizace

**Kritické bezpečnostní opravy:**
- **Path Traversal ochrana** v API `/api/school-details/[id]` - validace ID, kontrola nebezpečných sekvencí (`..`, `./`, `~`)
- **Input validace** - regex pattern pro validní school ID formát
- **Path resolution check** - ověření, že výsledná cesta zůstává v povoleném adresáři

**High priority opravy:**
- **Security headers** přidány do `next.config.ts`:
  - Content-Security-Policy (CSP)
  - Strict-Transport-Security (HSTS)
  - X-Frame-Options (clickjacking ochrana)
  - X-Content-Type-Options
  - X-XSS-Protection
  - Referrer-Policy
  - Permissions-Policy
- **Rate limiting** - max 100 požadavků za minutu na IP adresu pro API
- **X-Powered-By header** skryt

**Optimalizace bandwidth (Vercel Pro):**
- **Nové API** `/api/schools/search` pro server-side filtrování škol
- **Eliminace 5.1 MB JSON fetche** - simulátor nyní stahuje pouze relevantní data (typicky <50 KB)
- **Cache headers** pro statická data (24h cache, 7 dnů stale-while-revalidate)
- **Debounced search** - API se volá až po dokončení psaní (300ms delay)
- **Odhadovaná úspora**: ~51 GB/měsíc při 10 000 unikátních návštěvnících simulátoru

**Vyhledávání škol:**
- **Aliasy pro PORG pobočky** - vyhledávání "PORG Libeň", "PORG Ostrava", "Nový PORG" funguje správně
- Nová sekce "Pobočky škol" ve výsledcích hledání

### Nová struktura stránek škol: Přehled + Detail oborů

Kompletní přepracování struktury URL a stránek škol:

**Nová struktura URL:**
- `/skola/{redizo}-{nazev}` - **Přehled školy** s kartami všech oborů/zaměření
- `/skola/{redizo}-{nazev}-{obor}` - **Detail oboru** s konkrétními statistikami
- `/skola/{redizo}-{nazev}-{obor}-{zamereni}` - **Detail zaměření** s vlastními daty

**Stránka přehledu školy:**
- Základní kontaktní informace o škole
- Karty všech oborů a zaměření s porovnáním:
  - Min. body pro přijetí
  - Kapacita
  - Index poptávky
  - Počet přihlášek / přijatých
- Celkové statistiky školy

**Stránka detailu oboru/zaměření:**
- Konkrétní statistiky pro daný obor nebo zaměření
- Navigační taby pro přepnutí na jiný obor/zaměření
- Odkaz zpět na přehled školy v breadcrumbs
- Každé zaměření má vlastní data (např. Gymnázium Arabská - Programování má 160 bodů, Přírodní vědy 172 bodů)

**Příklad:**
- Gymnázium Arabská (`/skola/600005682-gymnazium-arabska`) - přehled 3 zaměření
  - Humanitní vědy: 60 míst, min. 136 bodů
  - Programování: 30 míst, min. 158 bodů
  - Přírodní vědy: 60 míst, min. 154 bodů

### Nová stránka: Jak vybrat školu a uspět u přijímaček

- **Nová stránka:** `/jak-vybrat-skolu` - komplexní průvodce pro uchazeče
  - Osvědčené strategie pro výběr tří priorit na přihlášce
  - Tipy na přípravu na jednotné přijímací zkoušky
  - Jak vybrat správný profil školy (technická vs. humanitní)
  - Praktické rady pro den zkoušky
  - Odkazy na užitečné zdroje (TAU CERMAT, To-DAS.cz, CERMAT)
- **Hlavní stránka:** Výrazný odkaz na průvodce přidán do HERO sekce

### Navigace oborů na detailu školy

- **Nová funkce:** Přidána navigace mezi obory školy pomocí horizontálních tabů
  - Všechny taby jsou klikatelné a vedou na samostatné stránky
  - Aktivní obor je vizuálně zvýrazněn (hvězdička, indigo podtržení)
  - Každý tab zobrazuje kapacitu a minimální body pro přijetí

- **Vylepšení:** Plné české názvy typů škol místo zkratek
  - GY4 -> "Čtyřleté gymnázium"
  - GY6 -> "Šestileté gymnázium"
  - GY8 -> "Osmileté gymnázium"
  - SOŠ -> "Střední odborná škola"
  - SOU -> "Střední odborné učiliště"
  - LYC -> "Lyceum"

### Oprava duplicitních URL pro programy se stejným názvem

- **Bug fix:** Školy s více programy se stejným názvem ale různou délkou studia nyní mají unikátní URL
  - Např. Gymnázium Jana Nerudy má 4leté i 6leté gymnázium
  - Dříve: obě generovaly stejnou URL `/skola/600004589-gymnazium-jana-nerudy-hellichova-gymnazium`
  - Nyní: `/skola/600004589-gymnazium-jana-nerudy-hellichova-gymnazium-4lete` a `...-6lete`
- **Rozpoznávání stránek:** Funkce `getSchoolPageType()` správně rozpoznává slugy s délkou studia
- **Generování odkazů:** Všechny odkazy v tabech a kartách programů používají správné unikátní URL

### Technické změny

- Nový typ stránky `SchoolPageType` (overview/program/zamereni) v `data.ts`
- Nová funkce `getSchoolPageType()` pro rozpoznání typu stránky podle slugu
- Nová funkce `getSchoolOverview()` pro načtení dat přehledu školy
- Nová funkce `getExtendedStatsForProgram()` pro načtení statistik konkrétního zaměření
- Rozšířená funkce `generateAllSlugs()` generuje slugy pro přehledy, obory i zaměření
- Funkce `createSlug()` nyní podporuje čtvrtý argument (`delkaStudia`) pro rozlišení duplicitních názvů
- Celkový počet generovaných stránek vzrostl z ~2250 na ~4480
