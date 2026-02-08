# Dostupnost v2.2 — redesign výsledků a opravy mapování

> **Datum:** 2026-02-08
> **Verze:** 2.2.0

## Přehled změn

### 1. Oprava mapování škol na zastávky (geocoding)

**Problém:** `school_locations.json` používal metodu `city_match` — všechny školy ve stejném městě byly namapovány na jednu zastávku. V Praze 179 škol → "Vršovické náměstí", takže všechny ukazovaly identický čas dojezdu.

**Řešení:** Nový skript `scripts/geocode_schools.py`:
- Geokóduje adresu každé školy přes Nominatim API (3 fallback strategie)
- Najde nejbližší zastávku pomocí spatial grid indexu
- Cache výsledků v `data/geocode_cache.json`

**Výsledky:**
| Metrika | Před (city_match) | Po (geocoding) |
|---------|-------------------|----------------|
| Unikátní zastávky | 389 | 914 |
| Praha unikátních | 1 | 146 |
| Průměrná vzdálenost ke škole | — | 0.196 km |

### 2. Filtrování nočních linek z GTFS grafu

**Soubor:** `scripts/build_transit_graph_v2.py`

- Přidán filtr ranních tripů v `process_trip()` — tripy s odjezdy mimo 5:00–10:00 se přeskočí
- Headway výpočet přesunut před agregaci hran (krok 6 ↔ 7)
- Linky bez headway dat se odfiltrují z hran

### 3. Redesign UI — kartový layout výsledků

**Soubor:** `src/app/dostupnost/DostupnostClient.tsx`

Kompletní přepis zobrazení výsledků:

**Řádek 1 — škola:**
- Checkbox pro výběr do simulátoru
- Název školy (odkaz na detail)
- Adresa + kraj
- Čas dojezdu (barevný badge podle kohorty 0-9, 10-19, ... min)
- Počet přestupů + rozpad na jízdu/čekání/chůzi + linky

**Řádek 2 — obory (per-program):**
- Desktop: tabulka (obor/zaměření, délka, typ, body min, body prům, konkurence)
- Mobile: kompaktní karty

**Barevné kódování JPZ bodů:**
- `< 30` bodů → emerald (snadné)
- `30–49` → green
- `50–69` → amber
- `70+` → red (náročné)

**Nové komponenty:**
- `InfoTooltip` — popup nápověda (body min, body prům, konkurence)
- `jpzBadgeColor()` — barva badge podle JPZ skóre
- `konkurenceLabel()` — formátování indexu poptávky (1.5×, 3.0× atd.)

### 4. API rozšíření — SchoolProgram

**Soubor:** `src/app/api/dostupnost/route.ts`

Nový typ `SchoolProgram`:
```typescript
type SchoolProgram = {
  id: string;
  obor: string;
  zamereni: string;
  typ: string;
  delkaStudia: number;
  jpzMin: number | null;     // JPZ min CJ+MA (max 100)
  jpzPrumer: number | null;  // JPZ průměr CJ+MA
  indexPoptavky: number | null;
  kapacita: number | null;
  prihlasky: number | null;
};
```

- `AggregatedSchool` rozšířen o `programs: SchoolProgram[]`
- Každý řádek (obor) ze `schools_data.json` se přidá jako program
- API response vrací `programs` pole u každé školy
- `jpz_min_actual` místo `min_body` pro školní minimum

### 5. Seznam měst s MHD daty

Na stránku přidán rozbalovací panel se seznamem 15 měst, jejichž MHD je v celostátním GTFS feedu:

| # | Město | Dopravce |
|---|-------|----------|
| 1 | Praha | DPP |
| 2 | Brno | DPMB |
| 3 | Ostrava | DPO |
| 4 | Plzeň | PMDP |
| 5 | Olomouc | DPMO |
| 6 | Liberec & Jablonec n. N. | DPMLJ |
| 7 | České Budějovice | DPMCB |
| 8 | Ústí nad Labem | DPMUL |
| 9 | Karlovy Vary | DPKV |
| 10 | Jihlava | DPMJ |
| 11 | Děčín | DPMDAS |
| 12 | Most & Litvínov | DPMOST |
| 13 | Chomutov & Jirkov | DPCHJ |
| 14 | Opava | MDPO |
| 15 | Teplice | MDT |

Pro ostatní obce vyhledávání najde pouze zastávky meziměstské dopravy (autobusy a vlaky).

**Chybějící MHD:** Pardubice (DPMP), Hradec Králové (DPMHK), Zlín (DSZO) a další menší města nejsou v národním GTFS feedu.
