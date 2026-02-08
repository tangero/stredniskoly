# CHAPS .tt Dekodér - Manuál

> **Verze:** v2 (2026-02-08)
> **Autor:** Reverse engineering + Claude Opus 4.6 & Sonnet 4.5
> **Úspěšnost:** 99% (108/109 souborů Data3/)

## Přehled

Kompletní sada nástrojů pro dekódování proprietárního formátu CHAPS .tt (jízdní řády IDOS/CG Transit) do otevřených formátů.

### Nástroje

| Nástroj | Účel | Výstup |
|---------|------|--------|
| `tt_decoder_v2.py` | Hlavní dekodér .tt → JSON | JSON s zastávkami, spoji, hranami |
| `tt_to_gtfs.py` | Konverze JSON → GTFS | Validní GTFS feed |
| `tt_analyzer.py` | Diagnostický nástroj | Hex analýza, debug |
| `test_tt_vs_gtfs.py` | Validace proti GTFS | Porovnání cestovních časů |

---

## Rychlý start

### 1. Dekódování jednoho souboru

```bash
python scripts/tt_decoder_v2.py data/KOMPLET/Data3/Brandys.tt
```

**Výstup:**
```
✓ Dekódováno: Brandys.tt
  Zastávky: 33
  Spoje: 172
  Hrany: 57

💾 Exportováno: data/KOMPLET/Data3/Brandys.json
```

### 2. Dávkové dekódování (celá složka)

```bash
python scripts/tt_decoder_v2.py --batch data/KOMPLET/Data3/
```

**Výstup:** `data/decoded_tt_v2/*.json` (108 souborů)

### 3. Konverze do GTFS

```bash
python scripts/tt_to_gtfs.py data/decoded_tt_v2/
```

**Výstup:** `data/gtfs_from_tt/` (6 GTFS souborů)

---

## Formát výstupu

### JSON formát (tt_decoder_v2.py)

```json
{
  "source_file": "Brandys.tt",
  "stops": [
    "Brázdim,Nový Brázdim",
    "Nádr.",
    "Zdrav.stř."
  ],
  "stats": {
    "stops": 33,
    "trips": 172,
    "edges": 57
  },
  "edges": {
    "0->11": {
      "from_stop": "Brázdim,Nový Brázdim",
      "to_stop": "Nádr.",
      "travel_time_avg": 1.0,
      "travel_time_min": 1,
      "travel_time_max": 1,
      "samples": 5
    }
  }
}
```

### GTFS formát (tt_to_gtfs.py)

Standardní GTFS feed (6 souborů):

- **agency.txt** - Dopravce (TT_DECODER)
- **stops.txt** - Zastávky s formátem "Město, Zastávka"
- **routes.txt** - Linky (1 linka = 1 město)
- **trips.txt** - Spoje
- **stop_times.txt** - Odjezdy/příjezdy
- **calendar.txt** - Kalendář (všední dny)

---

## Technické detaily

### Algoritmus dekódování v2

**Klíčové vylepšení:** Inteligentní auto-detekce sekce časových záznamů

```
1. Skenování celého souboru po 1 KB blocích (0x100 - 200 KB)
2. Pro každý blok (4 alignmenty):
   - Zkus prvních 30 uint32 záznamů
   - Validuj: byte1 == 0x00, minutes <= 1440
   - Počítej: valid_count, unique_times, unique_stops
3. Skóre = valid_count × unique_times × unique_stops
4. Vyber blok s nejvyšším skóre
5. Dekóduj z tohoto offsetu
```

**Proč to funguje:**
- v1 hledal od fixního offsetu 0x100 → selhával u velkých souborů
- v2 najde správnou sekci i když je na offsetu 0x5102 (Chomutov) nebo 0x2100

### Validace

| Parametr | Rozsah | Význam |
|----------|--------|--------|
| `byte1` | 0x00 | Identifikátor časového záznamu |
| `minutes` | 0-1440 | Minuty od půlnoci (0:00-24:00) |
| `stop_idx` | 0-255 | Index zastávky (byte) |
| `travel_time` | 1-60 | Cestovní čas mezi zastávkami (min) |

---

## Výsledky dekódování

### Batch statistiky (Data3/)

```
SUCCESS: 108/109 (99%)
  23,272 zastávek
  36,429 spojů
  16,343 unikátních hran cestovních časů
```

### Porovnání v1 vs. v2

| Metrika | v1 | v2 | Zlepšení |
|---------|----|----|----------|
| Úspěšnost | 99% | 99% | - |
| Zastávky | 23,272 | 23,272 | - |
| Spoje | 6,609 | 36,429 | **+450%** |
| Hrany | 5,699 | 16,343 | **+187%** |

**Příklad zlepšení (Chomutov.tt):**
- v1: 4 spoje, 0 hran ❌
- v2: 545 spojů, 39 hran ✅

---

## Diagnostika problémů

### tt_analyzer.py

Porovnej fungující vs. nefungující soubor:

```bash
python scripts/tt_analyzer.py --compare \
  data/KOMPLET/Data3/Brandys.tt \
  data/KOMPLET/Data3/Chomutov.tt
```

**Výstup:**
- Nalezené sekce s detailními statistikami
- Offset nejlepšího kandidáta
- Analýza prvních 50 záznamů (časy, zastávky, flagy)

Analyzuj konkrétní offset:

```bash
python scripts/tt_analyzer.py data/KOMPLET/Data3/Chomutov.tt 0x005102
```

---

## Známé limitace

### ✅ Co funguje

- ✅ Dekódování zastávek (100%)
- ✅ Dekódování časových záznamů (99%)
- ✅ Extrakce cestovních časů mezi zastávkami
- ✅ Export do JSON
- ✅ Export do GTFS
- ✅ P-records (identifikátory spojů) - částečně

### ⚠️ Co nefunguje / není implementováno

- ❌ GPS souřadnice zastávek (v souboru jsou, formát nerozluštěn)
- ❌ Kompletní jízdní řád (dekodér vrací šablony tras, ne všechny odjezdy za den)
- ❌ Kalendářní/platnostní bitmapy (sekce 0x306A+)
- ❌ Companion soubory (PID.ttp, PID.ttm, PID.ttq, PID.ttr)
- ❌ Velké soubory Data1/Data2 (vlaky, meziměstské autobusy) - neotestováno

### Nevyřešené otázky

1. **Kompletní odjezdy:** Dekódované spoje jsou pravděpodobně šablony (1 spoj na variantu trasy). Skutečné odjezdy (např. každých 15 minut) jsou uloženy v sekci 0x160B - formát nerozluštěn.

2. **PID.tt (17 MB):** Obsahuje 69 výskytů P478 (regionální linky PID). Dekodér nebyl testován.

3. **GPS souřadnice:** V .tt souborech jsou zakódované souřadnice (nalezeny v sekci za stop names), ale formát nebyl plně dekódován.

---

## Struktura souborů

### Datové adresáře

| Adresář | Obsah | Velikost | Status |
|---------|-------|----------|--------|
| `Data3/` | MHD po městech (98 souborů) + PID.tt | 13 KB - 443 KB | ✅ Dekódováno (99%) |
| `Data2/` | Meziměstské autobusy | 15-30 MB | ⚠️ Neotestováno |
| `Data1/` | Vlaky | 72 MB | ⚠️ Neotestováno |

### Příklady souborů

| Soubor | Velikost | Zastávky | Spoje | Hrany | Offset |
|--------|----------|----------|-------|-------|--------|
| Brandys.tt | 13 KB | 33 | 172 | 57 | 0x000901 |
| Chomutov.tt | 84 KB | 118 | 545 | 39 | 0x002100 |
| IDSJMK.tt | 3.2 MB | 7,645 | 17 | 2 | - |
| PID.tt | 17 MB | - | - | - | ⚠️ Neotestováno |

---

## Případy použití

### 1. Analýza dopravní dostupnosti škol

```bash
# Dekóduj MHD data
python scripts/tt_decoder_v2.py --batch data/KOMPLET/Data3/

# Konvertuj do GTFS
python scripts/tt_to_gtfs.py data/decoded_tt_v2/

# Použij GTFS v dopravním routeru (např. scripts/build_transit_graph_v2.py)
```

### 2. Porovnání s oficiálními daty

```bash
# Ověř správnost dekodéru
python scripts/test_tt_vs_gtfs.py data/decoded_tt_v2/Brandys.json
```

### 3. Debug problematického souboru

```bash
# Analyzuj, kde jsou časové záznamy
python scripts/tt_analyzer.py data/KOMPLET/Data3/Chomutov.tt

# Dekóduj s debug výstupem
python scripts/tt_decoder_v2.py data/KOMPLET/Data3/Chomutov.tt
```

---

## Reference

- **Specifikace formátu:** `docs/chaps-tt-format.md`
- **Zdrojové soubory:** `data/KOMPLET/Data3/*.tt`
- **GTFS standard:** https://gtfs.org/

---

## Changelog

### v2 (2026-02-08)
- ✅ Inteligentní auto-detekce sekce časových záznamů
- ✅ +450% spojů, +187% hran vs. v1
- ✅ tt_analyzer.py pro diagnostiku
- ✅ tt_to_gtfs.py konvertor
- ✅ test_tt_vs_gtfs.py validační framework

### v1 (2026-02-07)
- ✅ První funkční dekodér
- ✅ Dekódování zastávek, P-records, časů
- ✅ Export do JSON
- ⚠️ 50% souborů s 0 hranami (fixní offset)
