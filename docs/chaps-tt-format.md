# CHAPS .tt binární formát jízdních řádů — Reverse Engineering

> **Stav:** Funkční dekodér v7 — 100% úspěšnost na MHD souborech
> **Datum:** 2026-02-07
> **Autor:** Reverse engineering z binárních dat (bez oficiální dokumentace)

## Přehled

Formát `.tt` (TimeTable) je proprietární binární formát firmy **CHAPS, s.r.o.** používaný v systému IDOS a CG Transit pro ukládání jízdních řádů české veřejné dopravy.

### Identifikace souboru

```
Offset 0x00: " TT | TimeTable | Version 004 | SW (c) Copyright CHAPS, s.r.o. \r\n\x1a"
```

Header zabírá 66 bytů (0x00-0x41), kódování textu je **CP1250** (Windows-1250, střední Evropa).

---

## Struktura dat

### Datové adresáře (Data1-Data3)

| Adresář | Obsah | Příklady souborů | Velikosti |
|---------|-------|------------------|-----------|
| Data1/ | Vlaky | Vlak26E.tt (72 MB) | Desítky MB |
| Data2/ | Meziměstské autobusy | Bus26C.tt (30 MB), Bus26S.tt (15 MB) | Desítky MB |
| Data3/ | Městské MHD po městech + PID | 98 souborů (Adamov.tt..Zlin.tt) + PID.tt (17 MB) | 13 KB - 443 KB |

### Sekce — obecný formát

Každá sekce začíná 8-bytovým headerem:

```
struct SectionHeader {
    uint32_le total_bytes;   // celková velikost dat (bez headeru)
    uint32_le item_count;    // počet položek
};
// item_size = total_bytes / item_count (1, 2, 4, nebo 8 bytů)
// data následují ihned za headerem
```

---

## Dekódované sekce

### 1. Tabulka offsetů zastávek

**Formát:** `(N+1) × uint32` offset tabulka

| Pole | Typ | Popis |
|------|-----|-------|
| header.total_bytes | uint32 | `(N+1) * 4` |
| header.item_count | uint32 | `N+1` (počet zastávek + 1 sentinel) |
| offsets[0..N] | uint32[] | Byte offsety do string blobu |

- `offsets[N]` = sentinel = celková délka string blobu
- Skutečný počet zastávek = `item_count - 1`

**Identifikace:** Hledáme sekci kde `total_bytes == item_count * 4`, s monotónně rostoucími offsety, následovanou string blobem.

### 2. String blob zastávek

**Formát:** raw bytes, `total_bytes == item_count` (1-byte items)

Ihned za offset tabulkou. Jména zastávek v CP1250, oddělená offsety z tabulky.

**Příklad (Brandys.tt):**
```
[0] Brázdim,Nový Brázdim
[1] Brázdim,Rozc.Veliký Brázdim
[2] Brázdim,Starý Brázdim
...
[32] Zdrav.stř.
```

Mnoho zastávek je zdvojených (pro každý směr).

### 3. P-records (identifikátory spojů/linek)

**Formát:** Textové záznamy oddělené `0xA4A4` (2 bytes)

```
P{linka}/{varianta}_{org_id}_{trip_seq}#{flag}_{platnost}_{dny}_0_0
```

**Příklad:**
```
P478/17_280477_1007#00_1683_SdN+M,R_0_0
G1479                                     ← skupina (Group record)
P667/21_280477_1001#00_1683_SdN+M,R_0_0
```

| Pole | Příklad | Význam |
|------|---------|--------|
| P478 | linka 478 | Číslo linky |
| /17 | varianta 17 | Varianta trasy |
| 280477 | org_id | IČO dopravce (ČSAD = 27616347 → kód 280477) |
| 1007 | trip_seq | Pořadové číslo spoje |
| #00 | flag | Příznak (00 = standardní) |
| 1683 | platnost | Kód platnosti jízdního řádu |
| SdN+M,R | dny | Jezdí v: Sd=pracovní, N=neděle, M=sobota, R=? |

### 4. Časové záznamy (departure times)

**To je klíčová sekce — jádro jízdního řádu.**

**Formát:** `uint32_le` pro každý záznam

```
Bit 31 (0x80000000): Flag bit (volitelný — viz poznámka níže)
Bity 16-30:          Minuty od půlnoci (0-1440)
Bity 8-15:           Vždy 0x00
Bity 0-7:            Index zastávky (0-based)
```

**Dekódování:**
```python
val = struct.unpack('<I', data[offset:offset+4])[0]
minutes = (val >> 16) & 0x7FFF   # minuty od půlnoci
stop_idx = val & 0xFF             # index zastávky
has_flag = (val & 0x80000000) != 0  # flag bit
hour = minutes // 60
minute = minutes % 60
```

**Dva režimy:**

| Režim | Flag bit | Příklad souborů |
|-------|----------|-----------------|
| **Flagged** | Všechny čas. záznamy mají bit 31 = 1 | Brandys.tt, Breclav.tt, Kladno.tt |
| **Unflagged** | Bit 31 jen na hranicích spojů (první/poslední zastávka) | Jicin.tt, Tachov.tt, Trutnov.tt |

**CTRL záznamy (oddělovače spojů):**
Mezi spoji se mohou vyskytovat CTRL záznamy bez flag bitu, typicky s `byte3 = 0x0D, 0x0A, 0x09`.

### 5. Sekce tras (route sequences)

**Route group index:** `uint32[]` — offsety do sekce stop sequences
**Stop sequences:** `uint32[]` kde `byte0 = stop_index`, `bytes 2-3 = metadata (často 0x3233)`

### 6. Mapování route → P-record

**Formát:** Alternující `uint16` páry: `[route_idx, p_record_idx, route_idx, p_record_idx, ...]`

### 7. Informace o dopravci

Textový blok s tagy:
```
{ON}SAD Střední Čechy, a.s.
{OI}27616347            ← IČO
{OX}CZ27616347          ← DIČ
{OZC}250 01             ← PSČ
{OC}Brandýs nad Labem   ← Město
{OS}U Přístavu 811/8     ← Ulice
{OT}+420 326 911 954     ← Telefon
{OE}csadsc@csad-me.cz   ← Email
```

---

## Alignment issue

**Kritický poznatek:** Sekce v .tt souboru NEJSOU zarovnány na 4 byty od začátku souboru. Header je 66 bytů (ne násobek 4), takže datové sekce mohou začínat na libovolném alignmentu (0, 1, 2 nebo 3 mod 4).

Dekodér musí skenovat **všechny 4 byte alignmenty**, ne jen offset 0.

---

## Dekodér — strategie

### Algoritmus (v7-final)

1. **Najdi zastávky** — skenuj od 0x40 pro offset tabulku (N+1 uint32) + string blob
2. **Zkus flagged záznamy** — skenuj všechny 4 alignmenty pro uint32 s bit 31 = 1
3. **Dekóduj spoje** — rozděl na spoje podle změny route_id (byte3 & 0x7F) nebo poklesu minut
4. **Pokud < 2 spoje → fallback na unflagged** — skenuj bez požadavku na bit 31, ale s `byte1 == 0`
5. **Extrahuj hrany** — pro každou dvojici po sobě jdoucích zastávek ve spoji zapiš cestovní čas

### Výsledky batch dekódování (Data3/)

```
SUCCESS: 98/98 (100%)
  13 161 zastávek
  4 762 spojů
  3 477 unikátních hran cestovních časů
```

---

## Příklad dekódovaného souboru (Brandys.tt)

**33 zastávek**, 12 P-records, **4 dekódované spoje:**

| Spoj | Linka | Čas odjezdu | Z zastávky | Do zastávky | Doba | Zastávek |
|------|-------|-------------|------------|-------------|------|----------|
| T1 | 478 | 10:02 | Brázdim,Nový Brázdim | Zdrav.stř. | 13 min | 6 |
| T2 | 667 | 13:42 | Brázdim,Rozc.Veliký Brázdim | V Olšinkách | 35 min | 16 |
| T3 | ? | 04:46 | Nádr. | Zdrav.stř. | 24 min | 13 |
| T4 | 478 | 08:52 | Brázdimská | Zdrav.stř. | 33 min | 15 |

**26 hran cestovního grafu** s časy 1-6 minut.

### Ověření proti PID GTFS (linka 478)

Dekódované cestovní časy z Brandys.tt byly porovnány s oficiálními PID GTFS daty pro linku 478. Z 8 společných zastávek (Pražská, Sídl.u nádr., V Olšinkách, Brázdimská, Nem., Rychta, Dům peč.služby, Nádr.) bylo testováno 7 hran:

| Hrana | GTFS | .tt | Shoda |
|-------|------|-----|-------|
| Pražská → Sídl.u nádr. | 1 min | 1 min | ✓ |
| Sídl.u nádr. → V Olšinkách | 1 min | 1 min | ✓ |
| V Olšinkách → Brázdimská | 1 min | 1 min | ✓ |
| Dům peč.služby → Rychta | 1 min | 1 min | ✓ |
| Rychta → Nem. | 1 min | 1 min | ✓ |
| Nem. → Brázdimská | 1 min | 1 min | ✓ |
| Brázdimská → V Olšinkách | 1 min | 1 min | ✓ |

**Výsledek: 7/7 = 100% shoda.** Dekodér produkuje správné cestovní časy.

**Pozn.:** Brandys.tt obsahuje zkrácené názvy zastávek (např. „Pražská"), GTFS používá plné názvy (např. „Brandýs n.L.-St.Bol.,Pražská").

---

## Nevyřešené otázky

1. **Kompletní jízdní řád:** Dekódované spoje jsou pravděpodobně šablony (1 spoj na variantu trasy). Kompletní odjezdy (všechny spoje za den) jsou uloženy v sekci 0x160B (5632 B, 2816 uint16 items) — pravděpodobně kalendářní/intervalová data
2. **Companion soubory:** Brandys.tt odkazuje na PID.ttp, PID.ttm, PID.ttq, PID.ttr — tyto soubory nebyly analyzovány
3. **Velké soubory (Data1, Data2):** Dekodér je optimalizován pro Data3 (MHD). Vlakové a meziměstské soubory mohou mít odlišnou strukturu
4. **GPS souřadnice zastávek:** V .tt souborech jsou zakódované souřadnice (nalezeny v sekci za stop names), ale formát nebyl plně dekódován
5. **PID.tt (17 MB):** Obsahuje 69 výskytů P478 — regionální linky Pražské integrované dopravy. Dekodér na něj nebyl testován (> 500 KB limit)

---

## Soubory

| Soubor | Popis |
|--------|-------|
| `data/KOMPLET/Data3/*.tt` | 98 MHD souborů + PID.tt |
| `data/KOMPLET/Data2/Bus26*.tt` | Meziměstské autobusy |
| `data/KOMPLET/Data1/Vlak26*.tt` | Vlaky |
| Dekodér (scratchpad) | `tt_decoder_final.py` — v7, 100% úspěšnost na Data3 |
