# Dojezdovost — postup pátrání a rozhodování

> **Datum:** 2026-02-07
> **Cíl:** Vybudovat funkci dojezdovosti pro ~2 700 středních škol v ČR

## Chronologie

### 1. Analýza požadavků

Student zadá svou nejbližší zastávku + max. dobu přepravy → vidí seznam škol, kam se stihne dostat MHD.

**Problém:** ~2 700 škol po celé ČR, potřeba pokrýt i venkovské oblasti.

### 2. Vyřazené přístupy (API)

| Přístup | Proč vyřazen |
|---------|-------------|
| **Google Routes Matrix API** | 10 000 elements/měsíc zdarma = max 500 dotazů (20 škol). Pro 2 700 škol nepoužitelné. Navíc slabé pokrytí venkovské MHD v ČR. |
| **IDOS URL API** | Jen přesměrování na web, žádné strojově čitelné výsledky. Není REST API. |
| **IDOS CRWS API** | Komerční, vyžaduje smlouvu s CHAPS. Nedostupné. |
| **Mapy.cz API** | Nemá transit routing (jen auto/pěšky/kolo). |
| **OpenTripPlanner** | Vyžaduje GTFS data pro celou ČR — ta nejsou veřejně dostupná v jednotném formátu. |

### 3. Objev offline dat CHAPS

Stažena kompletní offline data jízdních řádů z CHAPS ve formátu `.tt` (binární, proprietární):
- **Data1/** — vlaky (72 MB+)
- **Data2/** — meziměstské autobusy (30 MB+)
- **Data3/** — městské MHD po městech (98 souborů, 13-443 KB) + PID.tt (17 MB)

**Výhoda:** Pokrývají VEŠKEROU veřejnou dopravu v ČR (stejná data jako IDOS).

### 4. Reverse engineering .tt formátu

Formát je **nedokumentovaný**. Žádná veřejná dokumentace neexistuje. Celý formát jsme rozluštili z binárních dat.

#### 4.1 Výběr testovacího souboru

Zvolen **Brandys.tt** (13 495 B) — nejmenší soubor v Data3/, ideální pro analýzu.

#### 4.2 Identifikace headeru

```
" TT | TimeTable | Version 004 | SW (c) Copyright CHAPS, s.r.o. \r\n\x1a"
```

Kódování: CP1250 (Windows-1250).

#### 4.3 Dekódování zastávek (krok 1)

Hledali jsme pattern: tabulka uint32 offsetů → string blob.

**Nalezeno na 0x02AC:** 34 offsetů (33 zastávek + 1 sentinel) → string blob na 0x033C (372 bytů).

Výsledek: 33 zastávek MHD Brandýs nad Labem (Brázdim, Mratín, Polerady, Sluhy, Veleň...).

#### 4.4 Identifikace P-records (krok 2)

Hledali jsme textový pattern `P\d{3}/\d+_`. Nalezeny na 0x142A, oddělené `0xA4A4`.

12 P-records: linky 478, 655, 657, 667 + 1 skupina G1479.

#### 4.5 Hledání linky 478 v datech

- `Bus26S.tt` a `Bus26C.tt` — **P478 nenalezeno** (0 výskytů)
- `PID.tt` — **69 výskytů P478** → linka 478 je součást PID, ne meziměstský autobus
- `Brandys.tt` — obsahuje místní úsek linky 478

#### 4.6 Dekódování časů (krok 3 — průlom)

Klíčová sekce na 0x0B29: 2048 bytů, 512 uint32 položek.

**Objev formátu:**
```
uint32 LE:
  bit 31      = flag (platný čas)
  bity 16-30  = minuty od půlnoci (0-1440)
  bity 8-15   = 0x00
  bity 0-7    = index zastávky
```

**Ověření:** Item 46 = `0x825A0000` → minuty = 602 (10:02), zastávka = 0 (Brázdim,Nový Brázdim). To odpovídá reálnému odjezdu linky 478.

#### 4.7 Alignment problém

**Kritický bug v dekodéru:** Sekce na 0x0B29 + 8 bytů header = data od 0x0B31. Offset `0x0B31 mod 4 = 1`. Scanner skenující jen na alignment 0 tyto záznamy nenajde.

**Fix:** Skenovat všechny 4 alignmenty (offset 0, 1, 2, 3 mod 4).

#### 4.8 Unflagged formát (krok 4)

Při batch zpracování selhávalo 27/98 souborů. Analýza Jicin.tt ukázala:

- Časové záznamy **nemají flag bit** (bit 31 = 0)
- Stejný formát jinak: high_word = minuty, byte0 = stop_idx, byte1 = 0
- Flag bit jen na první/poslední zastávce spoje (hranice spojů)

**Řešení:** Dual-mode dekodér — zkus flagged, fallback na unflagged.

#### 4.9 Falešné pozitivy

Hodnoty 0x01000000, 0x02000000 atd. vypadají jako časy (4:16, 8:32...) ale jsou to strukturální data (násobky 256 minut). Filtr: penalizace za `minutes % 256 == 0`.

### 5. Výsledný dekodér (v7-final)

**Strategie:**
1. Najdi zastávky (offset tabulka + string blob)
2. Zkus flagged time records → dekóduj spoje
3. Pokud < 2 spoje → fallback na unflagged (byte1==0)
4. Extrahuj hrany cestovních časů

**Batch výsledky (Data3/):**

| Metrika | Hodnota |
|---------|---------|
| Úspěšnost | **98/98 (100%)** |
| Zastávky | 13 161 |
| Spoje | 4 762 |
| Hrany | 3 477 |

### 6. Ověření proti PID GTFS datům

Stažena PID GTFS data (`data/PID/`) — standardní textový formát se zastávkami, časy odjezdů a GPS souřadnicemi pro Prahu a Středočeský kraj.

#### 6.1 Nalezení linky 478 v GTFS

- Route: `L478`, typ 3 (bus), trasa Brandýs nad Labem – Kostelec nad Labem
- **48 spojů** za den (v obou směrech)
- **23 zastávek** na spoj (plná trasa Aut.st. → Kostelec n.L.,Nám.)

#### 6.2 Mapování zastávek Brandys.tt ↔ GTFS L478

Brandys.tt obsahuje **20 unikátních zastávek** (33 celkem = zdvojení pro směry). Z toho **8 se shoduje** s GTFS L478:

| Brandys.tt | GTFS L478 |
|------------|-----------|
| Pražská | Brandýs n.L.-St.Bol.,Pražská |
| Sídl.u nádr. | Brandýs n.L.-St.Bol.,Sídl.u nádr. |
| V Olšinkách | Brandýs n.L.-St.Bol.,V Olšinkách |
| Brázdimská | Brandýs n.L.-St.Bol.,Brázdimská |
| Nem. | Brandýs n.L.-St.Bol.,Nem. |
| Rychta | Brandýs n.L.-St.Bol.,Rychta |
| Dům peč.služby | Brandýs n.L.-St.Bol.,Dům peč.služby |
| Nádr. | Brandýs n.L.-St.Bol.,Nádr. |

Zbylých 12 zastávek v Brandys.tt patří linkám 655, 657, 667 (Brázdim, Mratín, Polerady, Sluhy, Veleň, Popovice, Zdrav.stř.).

**Poznatek:** .tt soubory používají zkrácené názvy zastávek (bez prefixu města). GTFS používá plné názvy s městem.

#### 6.3 Porovnání cestovních časů

| Hrana (úsek) | GTFS L478 | Brandys.tt | Shoda |
|---|---|---|---|
| Pražská → Sídl.u nádr. | 1 min | 1 min | ✓ |
| Sídl.u nádr. → V Olšinkách | 1 min | 1 min | ✓ |
| V Olšinkách → Brázdimská | 1 min | 1 min | ✓ |
| Nádr. → Pražská | — | 1 min | — |
| Dům peč.služby → Rychta | 1 min | 1 min | ✓ |
| Rychta → Nem. | 1 min | 1 min | ✓ |
| Nem. → Brázdimská | 1 min | 1 min | ✓ |
| Brázdimská → V Olšinkách | 1 min | 1 min | ✓ |

**Výsledek: 7/7 porovnatelných hran přesně odpovídá (1 min).**

Jedna odchylka (Brázdimská→Nem. = 5 min v T3) je vysvětlitelná — T3 jede přes Polerady (jiná trasa, ne přímý přejezd).

### 7. Objev PID GTFS dat

GTFS data pro PID region (`data/PID/`) obsahují:

| Soubor | Obsah | Velikost |
|--------|-------|----------|
| `stops.txt` | Zastávky s **GPS souřadnicemi** | tisíce zastávek |
| `stop_times.txt` | Přesné odjezdy všech spojů | 98 MB |
| `routes.txt` | Linky PID (autobusy, metro, vlaky, tramvaje) | — |
| `trips.txt` | Jednotlivé spoje s kalendářem | — |
| `shapes.txt` | Geometrie tras | 135 MB |
| `feed_info.txt` | Platnost: 2026-02-07 – 2026-02-20 | — |

**Klíčový poznatek:** Pro PID region (Praha + Středočeský kraj) máme k dispozici **kompletní strukturovaná data** ve standardním GTFS formátu, včetně GPS souřadnic. To výrazně zjednodušuje problém pro tento region — není potřeba dekódovat .tt soubory ani GPS.

### 8. Objev celostátních GTFS dat (PRŮLOM)

Nalezena celostátní GTFS data pokrývající **veškerou veřejnou dopravu v ČR**:

**Zdroj:** `https://www.spojenka.cz/jrdata/jizdnirady-gtfs.zip` (90 MB)
Konvertováno z oficiálních CIS JŘ dat (Ministerstvo dopravy → CHAPS → portál `portal.cisjr.cz`).

| Metrika | Hodnota |
|---------|---------|
| Zastávky | **86 897** (98.5% s GPS) |
| Spoje | **295 855** |
| Odjezdy (stop_times) | **5 419 131** |
| Linky | **5 767** |
| Dopravci | **211** |
| Autobusy | 3 376 linek |
| Vlaky | 1 292 linek |
| Tramvaje | 56 linek |
| Metro | 3 linky |
| Trolejbusy | 39 linek |

**Ověření pokrytí** — zastávky nalezeny ve všech testovaných městech:

| Město | Zastávek | Město | Zastávek |
|-------|----------|-------|----------|
| Brno | 1 120 | Ostrava | 1 619 |
| Plzeň | 1 082 | Liberec | 461 |
| Zlín | 420 | Olomouc | 371 |
| České Budějovice | 303 | Karlovy Vary | 300 |
| Jičín | 249 | Trutnov | 134 |
| Hradec Králové | 100 | Pardubice | 103 |
| Tachov | 65 | | |

**Tento objev mění celý přístup k projektu.** Místo reverse engineeringu proprietárních .tt souborů můžeme použít standardní GTFS data s:
- Kompletními jízdními řády (všechny spoje, ne jen šablony)
- GPS souřadnicemi zastávek
- Kalendáři platnosti
- Přestupními vazbami (transfers.txt)
- Standardním formátem s bohatým ekosystémem nástrojů

**Oficiální zdroj národních dat v JDF formátu:**
- URL: `https://portal.cisjr.cz/pub/JDF/JDF.zip` (58 MB)
- Aktualizace: 3× týdně
- Konverze na GTFS: nástroj `jdf2gtfs` (github.com/masopust/jdf2gtfs)

**Regionální GTFS feedy (přímo od dopravních autorit):**
| Region | URL |
|--------|-----|
| PID (Praha + Středočeský) | `data.pid.cz/PID_GTFS.zip` |
| IDS JMK (Brno + Jihomoravský) | `data.brno.cz` |
| DPMO (Olomouc) | `dpmo.cz/doc/dpmo-olomouc-cz.zip` |
| DPMLJ (Liberec + Jablonec) | `dpmlj.cz/gtfs.zip` |

---

## Další kroky

### Krátkodobě
1. ~~**Ověřit dekódované časy** proti IDOS/DPP~~ → **HOTOVO** (7/7 hran = 100%)
2. ~~**Prozkoumat dostupnost GTFS pro celou ČR**~~ → **HOTOVO** (celostátní GTFS nalezeno)
3. ~~**Sestavit graf dopravní sítě z GTFS**~~ → **HOTOVO** (96 969 hran, 36 187 zastávek)
4. ~~**Geocodovat školy**~~ → **HOTOVO** (1 086/1 086 = 100%, přes shodu názvů obcí)
5. ~~**Prototyp reachability**~~ → **HOTOVO** (Dijkstra + walking distance, funguje)

### 9. Graf dopravní sítě z GTFS (HOTOVO)

Skript `build_transit_graph.py` zpracoval 713 MB stop_times za 15 sekund:

| Metrika | Hodnota |
|---------|---------|
| Zastávky (parent stations) s hranami | **36 187** |
| Směrované hrany | **96 969** |
| Průměrný stupeň | 2.7 |
| Výstup | `data/transit_graph.json` (8.2 MB) |

Top propojené stanice: Praha-Černý Most (28), Hradec Králové-Terminál (28), Jičín-AS (27).

### 10. Geocoding škol (HOTOVO)

Přiřazení nejbližší GTFS zastávky ke každé škole přes shodu názvů obcí:

| Metrika | Hodnota |
|---------|---------|
| Fyzických škol (REDIZO) | 1 086 |
| Matchnuto | **1 086 (100%)** |
| Medián vzdálenosti | 0.2 km |
| < 1 km | 867 (80%) |
| < 2 km | 918 (85%) |

**Známé problémy:** ~90 škol s vzdáleností >10 km kvůli:
- Duplicitní názvy měst (Frýdlant vs Frýdlant nad Ostravicí)
- Praha jako jedna entita (všechny pražské školy = stejná zastávka)
- **Řešení pro produkci:** reálný geocoding adres přes API

### 11. Prototyp dojezdovosti (HOTOVO)

Skript `dojezdovost.py` — Dijkstra na grafu zastávek + walking distance ke školám.

**Test z Brandýs nad Labem, max 60 min:**
- Dosažitelných zastávek: **2 869**
- Dosažitelných škol: **205** (z 1 086)
- Nejbližší: Střední zemědělská škola Brandýs (11 min), Gymnázium J.S.Machara (11 min)
- Čelákovice (17 min), Neratovice (23 min), Lysá nad Labem (25 min)
- Nymburk (43 min), Mělník (50 min), Praha (54 min), Poděbrady (55 min)

### Střednědobě (další kroky)
6. **Reálný geocoding adres** — API (Mapy.cz, Nominatim) pro přesné GPS škol, zejména v Praze
7. **Předpočítat matici dostupnosti** pro nejčastěji hledané zastávky
8. **API endpoint** — Next.js route pro frontend dotazy
9. **Frontend** — výběr zastávky (našeptávač), slider max. času, výpis dosažitelných škol

### Dlouhodobě
10. **Aktualizace dat** — automatický stah GTFS (CIS JŘ se aktualizuje 3× týdně)
11. **Optimalizace** — předpočítat graf do kompaktnějšího formátu, WebWorker pro Dijkstra
12. **.tt dekodér** — zachovat jako zálohu pro validaci

---

## Klíčové poznatky

### Reverse engineering .tt formátu
1. **CHAPS .tt formát je konzistentní** — stejná struktura napříč 98 MHD soubory
2. **Dva režimy časových záznamů** — flagged (bit 31 vždy) vs unflagged (bit 31 jen na hranicích)
3. **Alignment je kritický** — sekce nejsou zarovnány na 4 byty
4. **Offline data jsou kompletní** — pokrývají celou ČR včetně venkova
5. **P-records kódují linky, dopravce i platnost** — umožňují filtraci podle dne v týdnu
6. **Zdvojené zastávky** — každá zastávka existuje 2x (pro každý směr)
7. **Dekódované cestovní časy odpovídají realitě** — 7/7 hran ověřeno proti PID GTFS = 100% shoda
8. **.tt zkracuje názvy zastávek** — „Pražská" místo „Brandýs n.L.-St.Bol.,Pražská"
9. **Brandys.tt obsahuje jen místní MHD úseky** — linka 478 tam má jen 8 zastávek, plná trasa (23 zastávek) je v PID.tt

### GTFS data
10. **Celostátní GTFS data existují** — 86 897 zastávek, 295 855 spojů, 5 767 linek
11. **98.5% zastávek má GPS** — dostatečné pro matching se školami
12. **GTFS je lepší zdroj než .tt** — kompletní jízdní řády, GPS, standardní formát, snadná aktualizace
13. **.tt dekodér zůstává hodnotný** — jako validační nástroj a pro případy kdy GTFS nestačí
