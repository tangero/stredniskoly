# Dojezdovost do středních škol — Projektový plán

> **Stav:** Návrh — čeká na upřesnění zadání
> **Datum:** 2026-02-07

## Cíl projektu

Webová aplikace, kde student zadá svou **nejbližší zastávku MHD** (našeptávač) a **maximální dobu přepravy** (v minutách). Aplikace zobrazí **seznam škol**, do kterých se student v zadaném čase stihne dostat veřejnou dopravou, včetně doby chůze ze zastávky do školy.

---

## Otevřené otázky (nutné rozhodnout před implementací)

| # | Otázka | Varianty | Dopad na implementaci |
|---|--------|----------|----------------------|
| 1 | **Jaké školy?** | a) Střední školy b) Univerzity c) Školy kreativního psaní d) Mix | Určuje zdroj dat a počet destinací |
| 2 | **Odkud data škol?** | a) Ručně připravený JSON b) Rejstřík MŠMT (API) c) Admin panel | Viz sekce „Datové zdroje škol" |
| 3 | **Geografický rozsah** | a) Jen Praha (PID) b) Celá ČR | Ovlivňuje volbu API pro našeptávač zastávek |
| 4 | **Umístění v aplikaci** | a) Samostatná stránka b) Součást landing page c) Součást objednávky | Routing, navigace |
| 5 | **Je to součást zitraslavni.cz?** | a) Ano, nová sekce b) Ne, samostatný projekt | Tech stack, deployment |

---

## Architektura

### Přehled komponent

```
┌─────────────────────────────────────────────────┐
│                   Frontend                       │
│                                                  │
│  ┌──────────────┐  ┌─────────────┐  ┌─────────┐│
│  │ Našeptávač   │  │ Slider/input│  │ Tabulka ││
│  │ zastávek     │  │ max. minut  │  │ výsledků││
│  └──────┬───────┘  └──────┬──────┘  └────▲────┘│
│         │                 │              │      │
│         └────────┬────────┘              │      │
│                  ▼                       │      │
│         ┌────────────────┐               │      │
│         │  API volání    │───────────────┘      │
│         └───────┬────────┘                      │
└─────────────────┼───────────────────────────────┘
                  ▼
┌─────────────────────────────────────────────────┐
│              Backend (Cloudflare Function)        │
│                                                  │
│  1. Přijme: zastávka (lat/lon) + max minut       │
│  2. Načte seznam škol (KV / JSON)                │
│  3. Zavolá Google Routes Matrix API              │
│  4. Filtruje školy dle max. doby                 │
│  5. Vrátí seřazený seznam                        │
└─────────────────────────────────────────────────┘
```

### Datový tok

```
Student zadá zastávku → Našeptávač vrátí GPS souřadnice
Student zadá max. čas → Klik na „Spočítat"
                          ↓
            POST /api/dojezdovost
            {
              origin: { lat, lon },
              maxMinutes: 60,
              departureTime: "2026-09-02T07:00:00Z"
            }
                          ↓
            Backend načte školy z KV/JSON
            (každá škola má lat, lon, název, adresu)
                          ↓
            Google Routes computeRouteMatrix
            travelMode: "TRANSIT"
            1 origin × N destinations
                          ↓
            Filtr: duration ≤ maxMinutes × 60
                          ↓
            Response: [{ škola, doba_min, vzdálenost_km }]
```

---

## Volba API — porovnání

### Našeptávač zastávek

| Varianta | Pokrytí | Cena | Kvalita pro ČR | Doporučení |
|----------|---------|------|----------------|------------|
| **A: PID GTFS stops.txt** | Jen Praha + Středočeský kraj (PID) | Zdarma | Výborná — všechny zastávky | Pro Prahu ideální |
| **B: Google Places Autocomplete** | Celá ČR + svět | $2.83/1000 req (10K zdarma/měs.) | Dobrá, ale ne všechny autobusové zastávky | Pro celou ČR |
| **C: IDOS CRWS API** | Celá ČR | Komerční smlouva | Nejlepší | Nedostupné veřejně |
| **D: Vlastní DB z celostátních GTFS** | Celá ČR | Zdarma (self-hosted) | Závisí na konverzi dat | Náročné na údržbu |

**Doporučení:**
- **Jen Praha →** Varianta A (PID GTFS) — zdarma, kompletní, aktualizace denně
- **Celá ČR →** Varianta B (Google Places) nebo kombinace A+D

### Výpočet dojezdové doby

| Varianta | Transit routing | Free tier | Cena za dotaz (20 škol) | Walking included |
|----------|----------------|-----------|------------------------|-----------------|
| **Google Routes Matrix** | Ano | 10 000 elements/měs. | ~$0.10 (20 elements) | Ano, v celk. době |
| **HERE Transit API** | Ano | 5 000 req/měs. | ~$0.05 | Ano |
| **Geoapify** | Ano | ~90 000 req/měs. | Zdarma do limitu | Ano |
| **OpenTripPlanner** | Ano (self-hosted) | Neomezeno | $0 (hosting) | Ano |

**Doporučení:** Google Routes Matrix API (Essentials tier)
- 10 000 elements zdarma/měsíc = **500 dotazů** (20 škol × 500)
- Celková doba zahrnuje chůzi ze zastávky do školy automaticky
- Spolehlivé, aktuální jízdní řády

---

## Datové zdroje škol

### Varianta A: Statický JSON (doporučeno pro MVP)

```json
// public/schools.json
{
  "schools": [
    {
      "id": "gym-na-prazacce",
      "name": "Gymnázium Na Pražačce",
      "address": "Nad Ohradou 2825/23, 130 00 Praha 3",
      "lat": 50.0836,
      "lon": 14.4563,
      "type": "gymnazium",
      "url": "https://www.gymnazium-prazacka.cz"
    }
  ]
}
```

### Varianta B: Rejstřík škol MŠMT

- **URL:** https://rejstriky.msmt.cz/
- Obsahuje všechny školy v ČR s adresami
- Nemá veřejné REST API — nutný scraping nebo ruční export
- GPS souřadnice nejsou součástí — nutné geocodovat

### Varianta C: Admin panel + Cloudflare KV

- Editor v admin panelu pro přidávání/editaci škol
- Geocoding adresy → GPS přes Mapy.cz Geocoding API (zdarma)
- Uložení do Cloudflare KV

---

## Implementační plán

### Fáze 1: Data a backend (2-3 dny)

1. **Připravit data škol**
   - Vytvořit `public/schools.json` s 10-20 školami pro MVP
   - Každá škola: id, název, adresa, lat, lon, typ, URL

2. **Cloudflare Function: `/api/dojezdovost`**
   - Input: `{ origin: {lat, lon}, maxMinutes: number, departureTime?: string }`
   - Načtení seznamu škol
   - Volání Google Routes `computeRouteMatrix` (TRANSIT mode)
   - Filtrace + řazení dle doby
   - Output: `{ results: [{ school, durationMinutes, distanceKm }] }`

3. **Environment variable**
   - `GOOGLE_ROUTES_API_KEY` v Cloudflare Dashboard

### Fáze 2: Našeptávač zastávek (1-2 dny)

**Varianta PID GTFS (Praha):**

1. Stáhnout `stops.txt` z `https://data.pid.cz/PID_GTFS.zip`
2. Zpracovat do JSON (deduplikace parent stops, ~3 000 unikátních názvů)
3. Uložit jako `public/stops.json` (nebo do KV)
4. Frontend: fuzzy search pomocí knihovny **Fuse.js**

**Varianta Google Places (celá ČR):**

1. Frontend volá Google Places Autocomplete API
2. Filtr: `includedPrimaryTypes: ["transit_station", "bus_station", "bus_stop"]`
3. Region: `includedRegionCodes: ["cz"]`

### Fáze 3: Frontend stránka (2-3 dny)

```
/dojezdovost
```

**Layout:**

```
┌─────────────────────────────────────────────┐
│  Dojezdovost do škol                        │
│                                             │
│  Vaše zastávka: [____________________] 🔍  │
│                  Florenc                     │
│                  Flora                       │
│                  Flóra (tram)                │
│                                             │
│  Max. doba přepravy: [===●========] 60 min  │
│                                             │
│  Čas odjezdu: [7:00] dne [1.9.2026]        │
│                                             │
│         [ Spočítat dojezdovost ]            │
│                                             │
│  ─────────────────────────────────────────  │
│                                             │
│  Nalezeno 12 škol (z 20)                    │
│                                             │
│  🟢 23 min  Gymnázium Na Pražačce           │
│             Praha 3 · 2 přestupy            │
│                                             │
│  🟢 35 min  SPŠS Betlémská                  │
│             Praha 1 · 1 přestup             │
│                                             │
│  🟡 52 min  Gymnázium Budějovická           │
│             Praha 4 · 2 přestupy            │
│                                             │
│  🔴 68 min  Lyceum Horní Počernice          │
│             Praha 9 · přesahuje limit       │
│                                             │
└─────────────────────────────────────────────┘
```

**Barevné kódování:**
- 🟢 Zelená: do 70 % max. času
- 🟡 Žlutá: 70-100 % max. času
- 🔴 Červená/šedá: přesahuje limit (volitelně zobrazit)

**Komponenty:**
- `StopAutocomplete.tsx` — input s našeptávačem (Fuse.js / Google Places)
- `TravelTimeSlider.tsx` — slider pro max. dobu (15-120 min)
- `DepartureTimePicker.tsx` — volba času a data odjezdu
- `SchoolResults.tsx` — tabulka/karty s výsledky
- `SchoolCard.tsx` — karta jedné školy s dobou a detailem

### Fáze 4: Vylepšení (volitelné)

- **Mapa** — zobrazení škol na mapě (Mapy.cz SDK, zdarma)
- **Detail trasy** — klik na školu → detailní itinerář (computeRoutes)
- **Filtr typu školy** — gymnázia, SOŠ, lycea...
- **Uložení oblíbených** — localStorage
- **Admin správa škol** — CRUD v admin panelu
- **Celostátní pokrytí** — rozšíření zastávek na celou ČR

---

## Technické detaily

### Google Routes computeRouteMatrix — request

```typescript
// functions/api/dojezdovost.ts

interface MatrixRequest {
  origins: [{
    waypoint: {
      location: {
        latLng: { latitude: number; longitude: number }
      }
    }
  }];
  destinations: Array<{
    waypoint: {
      location: {
        latLng: { latitude: number; longitude: number }
      }
    }
  }>;
  travelMode: "TRANSIT";
  departureTime: string; // RFC 3339
  transitPreferences?: {
    routingPreference?: "LESS_WALKING" | "FEWER_TRANSFERS";
  };
}
```

### Google Routes computeRouteMatrix — response

```typescript
interface MatrixElement {
  originIndex: number;
  destinationIndex: number;
  status: {};
  condition: "ROUTE_EXISTS" | "ROUTE_NOT_FOUND";
  distanceMeters: number;
  duration: string; // e.g. "2754s" — INCLUDES walking to/from stops
}
```

### API endpoint

```typescript
// functions/api/dojezdovost.ts
export const onRequestPost: PagesFunction = async (context) => {
  const { origin, maxMinutes, departureTime } = await context.request.json();

  // 1. Načíst školy
  const schools = await getSchools(context);

  // 2. Sestavit destinations z GPS škol
  const destinations = schools.map(s => ({
    waypoint: { location: { latLng: { latitude: s.lat, longitude: s.lon } } }
  }));

  // 3. Zavolat Google Routes Matrix
  const matrix = await fetchRouteMatrix({
    origins: [{ waypoint: { location: { latLng: origin } } }],
    destinations,
    travelMode: "TRANSIT",
    departureTime: departureTime || new Date().toISOString(),
  });

  // 4. Spojit výsledky se školami, filtrovat, seřadit
  const results = matrix
    .filter(el => el.condition === "ROUTE_EXISTS")
    .map(el => ({
      school: schools[el.destinationIndex],
      durationMinutes: Math.round(parseInt(el.duration) / 60),
      distanceKm: (el.distanceMeters / 1000).toFixed(1),
    }))
    .filter(r => r.durationMinutes <= maxMinutes)
    .sort((a, b) => a.durationMinutes - b.durationMinutes);

  return Response.json({ results, total: schools.length });
};
```

### Frontend hook

```typescript
// src/hooks/useTravelTime.ts
export function useTravelTime() {
  return useMutation({
    mutationFn: async (params: {
      origin: { latitude: number; longitude: number };
      maxMinutes: number;
      departureTime?: string;
    }) => {
      const res = await fetch("/api/dojezdovost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      return res.json();
    },
  });
}
```

---

## Náklady

### Google Routes API (Essentials)

| Akce | Cena | Free tier |
|------|------|-----------|
| computeRouteMatrix (per element) | $5.00 / 1 000 | 10 000 / měsíc |
| Places Autocomplete (per request) | $2.83 / 1 000 | 10 000 / měsíc |

**Příklad:** 20 škol, 500 studentů/měsíc
- Matrix: 500 × 20 = 10 000 elements → **zdarma** (přesně free tier)
- Autocomplete (PID GTFS varianta): **$0** (lokální vyhledávání)
- **Celkem: $0/měsíc** při < 500 dotazech

### Cloudflare (stávající)
- Pages Functions: zdarma (100K req/den)
- KV: zdarma (100K reads/den)

---

## Soubory k vytvoření / úpravě

| Soubor | Akce | Popis |
|--------|------|-------|
| `public/schools.json` | Nový | Seznam škol s GPS souřadnicemi |
| `public/stops.json` | Nový (volitelné) | PID zastávky pro offline našeptávač |
| `functions/api/dojezdovost.ts` | Nový | Backend endpoint — volání Google Matrix |
| `src/pages/Dojezdovost.tsx` | Nový | Hlavní stránka s formulářem a výsledky |
| `src/components/StopAutocomplete.tsx` | Nový | Našeptávač zastávek |
| `src/components/SchoolResults.tsx` | Nový | Výsledková tabulka/karty |
| `src/hooks/useTravelTime.ts` | Nový | React Query hook pro API |
| `src/App.tsx` | Úprava | Přidat route `/dojezdovost` |
| `src/components/Header.tsx` | Úprava | Přidat odkaz do navigace |
| `src/types/dojezdovost.ts` | Nový | TypeScript typy |

---

## Rizika a mitigace

| Riziko | Dopad | Mitigace |
|--------|-------|----------|
| Google API limit (10K elements/měs.) | Nefunkční po vyčerpání | Cache výsledků, upozornění na limit |
| Chybějící zastávky v Google Places | Neúplný našeptávač | Použít PID GTFS pro Prahu |
| Nepřesné transit routing mimo Prahu | Špatné výsledky | Upozornit uživatele na orientační charakter |
| Škola nemá transit spojení | `ROUTE_NOT_FOUND` | Zobrazit „Spojení nenalezeno" |
| Latence Google API (1-3s) | Pomalé UX | Loading skeleton, debounce |

---

## Závěr

Pro MVP doporučuji:
1. **Statický JSON se školami** (10-20 škol, ručně)
2. **PID GTFS zastávky** pro Prahu (zdarma, offline fuzzy search)
3. **Google Routes Matrix API** pro výpočet dob (10K elements zdarma/měsíc)
4. **Cloudflare Function** jako backend proxy (skrytí API klíče)
5. **Samostatná stránka `/dojezdovost`** s přehledným UI

Toto řešení je **bezplatné** do ~500 dotazů měsíčně a lze snadno rozšířit.
