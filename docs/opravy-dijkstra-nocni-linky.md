# Opravy dopravní dostupnosti — noční linky a Dijkstra

> **Datum:** 2026-02-07
> **Stav:** Implementováno, čeká na testování

## Nalezené problémy

### 1. Noční spoje v ranních výsledcích

Noční linky (95, 901 apod.) nemají headway data v okně 7:00–8:00. Algoritmus jim dosazoval `DEFAULT_HEADWAY = 8 min`, čímž vypadaly jako velmi frekventované ranní linky.

**Příklad:** Linka 95 (noční) dostala headway 8 min → Dijkstra ji preferoval jako rychlou linku.

### 2. Křečovitá preference frekventovanějších linek

Funkce `pickBestRoute()` vybírala na každé hraně jen jednu linku (tu s nejnižším headway). To vedlo k absurdním výsledkům — přímá linka 163 (headway 13.5 min) byla nahrazena přestupem přes 264 (headway 3.5 min), protože 264 vyhrála výběr na všech hranách.

### 3. Podezřelý výsledek 32 min z IKEM na všechna gymnázia

Důsledek kombinace problémů 1 + 2. Všechny školy měly identický čas, protože algoritmus používal stále stejnou "nejlepší" linku.

---

## Provedené opravy

### Oprava A: Filtrování nočních tripů v grafu

**Soubor:** `scripts/build_transit_graph_v2.py`

#### A1: Filtr ranních tripů v `process_trip`

Tripy, jejichž nejranější odjezd je mimo okno 5:00–10:00, se přeskočí a nedostanou se do grafu.

```python
# V process_trip — přidáno na začátek
dep_times = [dep for _, _, dep in stops_list if dep is not None]
if not dep_times:
    return
min_dep = min(dep_times)
if min_dep < 5 * 3600 or min_dep >= 10 * 3600:
    return
```

**Efekt:** Noční tripy (odjezdy 0:00–4:59) a pozdní tripy (od 10:00+) se vůbec nezpracují.

#### A2: Přesunutí výpočtu headways před agregaci hran

Pořadí kroků změněno: headways (původně krok 7) se počítají před agregací hran (původně krok 6). Důvod: v agregaci filtrujeme linky bez headway, takže headways musí být k dispozici.

#### A3: Filtr linek bez headway na hranách

V agregaci hran se z každé hrany odstraní linky bez headway dat.

```python
route_shorts = [r for r in route_shorts if r in headways_out]
if not route_shorts:
    continue  # hrana nemá žádné ranní linky → zahodit
```

**Efekt:** I kdyby se noční trip prosmykl filtrem A1, jeho linka se neobjeví na hraně.

### Oprava B: Dijkstra zkouší VŠECHNY linky na hraně

**Soubor:** `src/app/api/dostupnost/route.ts`

Odstraněna funkce `pickBestRoute()`. Dijkstra nyní iteruje přes všechny linky na hraně, ne jen jednu "nejlepší":

```typescript
// Bylo:
const { route: bestRoute, headway } = pickBestRoute(edgeRoutes, headways);
// ... jen 1 linka

// Nově:
for (const edgeRoute of edgeRoutes) {
  const headway = headways[edgeRoute] ?? DEFAULT_HEADWAY;
  // ... zkouší každou linku zvlášť
}
```

**Efekt:** Přímé linky (163) nyní soutěží s frekventovanějšími (264) na rovném hřišti. Dijkstra deduplication přes `dist` mapu zajistí, že se neprobublá kombinatorická exploze.

**Performance:** Průměrný out-degree hrany je ~1.7 linek → mírně větší search space (cca 135k stavů vs. 79k), ale stále triviální.

### Oprava C: DEFAULT_HEADWAY zvýšen na 60 min

**Soubor:** `src/app/api/dostupnost/route.ts`, řádek 332

```typescript
const DEFAULT_HEADWAY = 60; // bylo 8
```

**Efekt:** Pojistka — pokud se do grafu přesto dostane linka bez headway dat, dostane penalizaci 60 min čekání (headway/2 = 30 min, cap na MAX_WAIT = 15 min). Algoritmus ji nebude preferovat.

---

## Výsledky přestavby grafu

| Metrika | Před | Po |
|---------|------|----|
| Raw edge pairs | 82 524 | 82 524 (stejné) |
| Aggregated edges | ~82k | 79 415 (−3k nočních) |
| Routes with headway | 1 431 | 1 431 (stejné) |
| Stops in graph | ~34k | 34 086 |
| Build time | ~17s | ~17s |

---

## Ověření (TODO)

1. Spustit `npm run dev` a otestovat zastávku **IKEM**:
   - [ ] Noční linky (95, 901, ...) se neobjevují v `usedLines`
   - [ ] Přímé linky (163) nejsou nahrazovány přestupem přes 264
   - [ ] Časy na gymnázia se liší (ne všechny 32 min)
2. Zkontrolovat metadata grafu (API diagnostics)
3. Otestovat další zastávky (centrum, periferie, mimo Prahu)

---

## Další možné ladění

- **Headway okno:** Aktuálně 7:00–8:00. Možná rozšířit na 6:00–9:00 pro lepší pokrytí předměstských linek.
- **Transfer penalty:** Aktuálně 2 min. Pro velké přestupní uzly (Florenc, I.P. Pavlova) by mohla být nižší.
- **Priority queue:** Aktuálně lineární scan (O(n) pop). Pro větší search space by šel nahradit binary heap.
- **Walking edges:** Aktuálně se chodí jen z poslední zastávky ke škole. Chůze mezi blízkými zastávkami (přestup pěšky) by mohla zlepšit výsledky.
