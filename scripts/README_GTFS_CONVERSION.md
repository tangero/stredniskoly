# KOMPLET → GTFS Conversion

Production-ready systém pro konverzi všech CHAPS .tt souborů do GTFS standardu.

## Rychlý start

```bash
# Konverze celého KOMPLET adresáře
python scripts/komplet_to_gtfs.py data/KOMPLET

# Vlastní output adresář
python scripts/komplet_to_gtfs.py data/KOMPLET data/MY_GTFS
```

## Výstupní struktura

```
data/GTFS_CZ/
├── VL/                    # Vlaky (Data1)
│   ├── agency.txt
│   ├── stops.txt
│   ├── routes.txt
│   ├── trips.txt
│   ├── stop_times.txt
│   └── calendar.txt
├── BUS/                   # Meziměstské autobusy (Data2)
│   └── ... (stejné soubory)
├── MHD/                   # Městská hromadná doprava (Data3)
│   └── ... (stejné soubory)
└── _intermediate_json/    # Dekódované JSON (debug)
    ├── VL/
    ├── BUS/
    └── MHD/

logs/
├── komplet_to_gtfs_YYYYMMDD_HHMMSS.log  # Hlavní log
├── errors_YYYYMMDD_HHMMSS.log           # Jen chyby
├── detail_YYYYMMDD_HHMMSS.log           # Debug info
├── summary_YYYYMMDD_HHMMSS.md           # Markdown report
├── stats_YYYYMMDD_HHMMSS.json           # JSON statistiky
└── failed_YYYYMMDD_HHMMSS.txt           # Seznam chyb
```

## Logging systém

### 4 úrovně logování

| Log soubor | Úroveň | Obsah |
|------------|--------|-------|
| `komplet_to_gtfs_*.log` | INFO | Hlavní průběh konverze |
| `errors_*.log` | ERROR | Chyby s traceback |
| `detail_*.log` | DEBUG | Detailní debug info |
| Console | INFO | Real-time progress |

### Příklad logu

```
2026-02-08 16:00:01 [INFO] ================================================================================
2026-02-08 16:00:01 [INFO] KOMPLET → GTFS Conversion Started
2026-02-08 16:00:01 [INFO] ================================================================================
2026-02-08 16:00:01 [INFO] Phase 1: Scanning for .tt files
2026-02-08 16:00:01 [INFO] Data1/: 2 train files
2026-02-08 16:00:01 [INFO] Data2/: 2 bus files
2026-02-08 16:00:01 [INFO] Data3/: 108 MHD files
2026-02-08 16:00:01 [INFO] Total: 112 .tt files found
2026-02-08 16:00:01 [INFO] Phase 2: Decoding .tt files
2026-02-08 16:00:01 [INFO] [MHD] Processing 108 files...
2026-02-08 16:00:01 [INFO]   [1/108] Adamov.tt
2026-02-08 16:00:01 [DEBUG]     ✓ 126 stops, 24 trips, 157 edges (523ms)
...
```

## Reporty

### 1. Summary Report (Markdown)

`logs/summary_YYYYMMDD_HHMMSS.md`

```markdown
# KOMPLET → GTFS Conversion Report

**Date:** 2026-02-08 16:05:32

## Overall Statistics

- **Total files:** 112
- **Successful:** 110 (98%)
- **Failed:** 2

## GTFS Output

- **Stops:** 25,450
- **Routes:** 112
- **Trips:** 18,234
- **Stop times:** 36,468

## By Category

| Category | Files | Stops | Routes | Trips |
|----------|-------|-------|--------|-------|
| VL | 2 | 1,234 | 2 | 456 |
| BUS | 2 | 892 | 2 | 234 |
| MHD | 108 | 23,324 | 108 | 17,544 |

## Top 10 Cities by Stops

| City | Category | Stops | Trips | Edges |
|------|----------|-------|-------|-------|
| IDSJMK | MHD | 7,645 | 17 | 199 |
| Plzen | MHD | 1,035 | 16 | 36 |
...
```

### 2. Stats JSON

`logs/stats_YYYYMMDD_HHMMSS.json`

Kompletní statistiky v JSON formátu pro další zpracování.

### 3. Failed Files Report

`logs/failed_YYYYMMDD_HHMMSS.txt`

```
Failed Files Report (2 files)
================================================================================

MHD/Problem1.tt
  Error: No valid time section found

BUS/Problem2.tt
  Error: Invalid header format
```

## Monitoring průběhu

### Real-time sledování

```bash
# Sleduj hlavní log
tail -f logs/komplet_to_gtfs_*.log

# Sleduj jen chyby
tail -f logs/errors_*.log

# Počet zpracovaných souborů
grep "✓" logs/komplet_to_gtfs_*.log | wc -l
```

### Progress tracking

V konzoli vidíš real-time:
```
INFO: [MHD] Processing 108 files...
INFO:   [1/108] Adamov.tt
INFO:   [2/108] As.tt
INFO:   [3/108] Benesov.tt
...
```

## Troubleshooting

### Problém: Některé soubory selžou

1. **Zkontroluj error log:**
   ```bash
   cat logs/errors_*.log
   ```

2. **Zkontroluj failed report:**
   ```bash
   cat logs/failed_*.log
   ```

3. **Debug konkrétní soubor:**
   ```bash
   python scripts/tt_decoder_v2.py data/KOMPLET/Data3/Problem.tt
   ```

### Problém: Nedostatek místa

Intermediate JSON soubory zabírají ~500 MB pro celý KOMPLET.

**Řešení:** Smaž intermediate po dokončení:
```bash
rm -rf data/GTFS_CZ/_intermediate_json/
```

### Problém: Pomalý běh

Očekávaný čas:
- Data3 (108 MHD): ~2-5 minut
- Data2 (2 autobusy): ~10-30 sekund
- Data1 (2 vlaky): ~10-30 sekund

**Celkem: ~5-10 minut**

## Validace GTFS

Po konverzi ověř GTFS feed:

```bash
# Zkontroluj strukturu
ls -lh data/GTFS_CZ/MHD/

# Spočítej záznamy
wc -l data/GTFS_CZ/MHD/*.txt

# Ověř formát (GTFS validator)
gtfs-validator data/GTFS_CZ/MHD/
```

## Pokročilé použití

### Jen MHD (Data3)

Přesun jen Data3 do dočasného adresáře:

```bash
mkdir -p /tmp/komplet_mhd
cp -r data/KOMPLET/Data3 /tmp/komplet_mhd/
python scripts/komplet_to_gtfs.py /tmp/komplet_mhd data/GTFS_MHD_ONLY
```

### Batch zpracování s retry

```bash
#!/bin/bash
MAX_RETRIES=3

for i in $(seq 1 $MAX_RETRIES); do
    echo "Attempt $i..."
    python scripts/komplet_to_gtfs.py data/KOMPLET data/GTFS_CZ

    if [ $? -eq 0 ]; then
        echo "✓ Success"
        break
    else
        echo "✗ Failed, retrying..."
        sleep 5
    fi
done
```

## Výkon

### Benchmark (Data3 - 108 souborů)

| Hardware | Čas | Rychlost |
|----------|-----|----------|
| MacBook Pro M1 | ~3 min | ~36 souborů/min |
| Intel i7 | ~5 min | ~22 souborů/min |

### Paměť

- Peak usage: ~500 MB
- Průměr: ~200 MB

## GitIgnores

Následující adresáře jsou automaticky ignorovány (.gitignore):

- `data/decoded_tt*/`
- `data/gtfs_from_tt*/`
- `data/GTFS_CZ/`
- `logs/`
- `*.json.log`

## FAQ

**Q: Můžu přerušit běh a pokračovat?**
A: Ne, systém nepodporuje resume. Musíš znovu spustit.

**Q: Jak velké jsou výstupní soubory?**
A: GTFS pro celý KOMPLET: ~50-100 MB (komprimované ~10 MB)

**Q: Podporuje paralelní zpracování?**
A: Ne, běží sekvenčně. Paralelizace není potřeba (rychlé).

**Q: Můžu exportovat do jiného formátu než GTFS?**
A: Ano, intermediate JSON můžeš použít pro vlastní konvertor.

## Licence

Data z CHAPS .tt souborů jsou proprietární formát CHAPS s.r.o.
Tento dekodér je reverse-engineered bez oficiální dokumentace.

Používej na vlastní odpovědnost.
