#!/usr/bin/env python3
"""
Analytický nástroj pro debugging CHAPS .tt formátu.
Pomáhá najít správnou sekci časových záznamů.
"""

import struct
from pathlib import Path
from typing import List, Tuple
import sys


def analyze_time_records_section(filepath: Path, start_offset: int, max_records: int = 100):
    """
    Analyzuj potenciální sekci časových záznamů od daného offsetu.
    Hledá uint32 záznamy které vypadají jako časové záznamy podle specifikace.
    """
    data = filepath.read_bytes()

    print(f"\n{'='*80}")
    print(f"Analýza: {filepath.name}")
    print(f"Offset: 0x{start_offset:04X}, hledám až {max_records} záznamů")
    print(f"{'='*80}\n")

    valid_records = []

    for offset in range(start_offset, min(start_offset + max_records * 4, len(data) - 3), 4):
        try:
            val = struct.unpack('<I', data[offset:offset+4])[0]

            # Dekóduj podle specifikace
            has_flag = (val & 0x80000000) != 0
            minutes = (val >> 16) & 0x7FFF
            byte2 = (val >> 16) & 0xFF
            byte1 = (val >> 8) & 0xFF
            stop_idx = val & 0xFF

            # Filtr: byte1 musí být 0x00 (podle spec)
            if byte1 != 0x00:
                continue

            # Filtr: minutes musí být v rozumném rozsahu
            if minutes > 1440:  # 0:00 - 24:00
                continue

            # Validní záznam
            hour = minutes // 60
            minute = minutes % 60

            valid_records.append({
                'offset': offset,
                'val': val,
                'flag': has_flag,
                'minutes': minutes,
                'time': f"{hour:02d}:{minute:02d}",
                'stop_idx': stop_idx,
                'byte2': byte2
            })

        except Exception:
            continue

    if not valid_records:
        print("❌ Nenalezeny žádné validní časové záznamy\n")
        return []

    print(f"✅ Nalezeno {len(valid_records)} validních záznamů\n")

    # Vypiš prvních 20
    print(f"{'Offset':<10} {'Raw (hex)':<12} {'Flag':<6} {'Čas':<8} {'Stop#':<7} {'Byte2':<8}")
    print("-" * 70)

    for i, rec in enumerate(valid_records[:20]):
        flag_str = "F" if rec['flag'] else " "
        print(f"0x{rec['offset']:06X}   0x{rec['val']:08X}   {flag_str:<6} {rec['time']:<8} {rec['stop_idx']:<7} 0x{rec['byte2']:02X}")

    if len(valid_records) > 20:
        print(f"... (+ dalších {len(valid_records) - 20} záznamů)")

    # Statistiky
    print(f"\n{'='*70}")
    print(f"Statistiky:")
    print(f"  Časový rozsah: {valid_records[0]['time']} → {valid_records[-1]['time']}")
    print(f"  Zastávky: {min(r['stop_idx'] for r in valid_records)} - {max(r['stop_idx'] for r in valid_records)}")
    print(f"  Flagged záznamy: {sum(1 for r in valid_records if r['flag'])}/{len(valid_records)}")

    # Detekce unikátních časů
    unique_times = len(set(r['minutes'] for r in valid_records))
    print(f"  Unikátní časy: {unique_times}/{len(valid_records)}")

    if unique_times == 1:
        print(f"  ⚠️  VŠECHNY ZÁZNAMY MAJÍ STEJNÝ ČAS! To není správná sekce.")
    elif unique_times < len(valid_records) * 0.3:
        print(f"  ⚠️  Příliš málo unikátních časů ({unique_times}). Možná špatná sekce.")
    else:
        print(f"  ✅ Dobrá diverzita časů - pravděpodobně správná sekce!")

    return valid_records


def scan_entire_file(filepath: Path):
    """Proskenuj celý soubor a najdi všechny potenciální sekce časových záznamů."""
    data = filepath.read_bytes()

    print(f"\n{'='*80}")
    print(f"FULL SCAN: {filepath.name} ({len(data):,} bytes)")
    print(f"{'='*80}\n")

    # Skenuj všechny alignmenty po 1 KB blocích
    sections_found = []

    for start in range(0x100, len(data), 0x400):  # Každých 1 KB
        for alignment in range(4):
            offset = start + alignment

            # Zkus najít sekci s alespoň 10 validními záznamy
            valid_count = 0
            unique_times = set()
            unique_stops = set()

            for i in range(20):  # Zkus prvních 20 záznamů
                pos = offset + i * 4
                if pos + 3 >= len(data):
                    break

                try:
                    val = struct.unpack('<I', data[pos:pos+4])[0]
                    byte1 = (val >> 8) & 0xFF
                    minutes = (val >> 16) & 0x7FFF
                    stop_idx = val & 0xFF

                    if byte1 == 0x00 and minutes <= 1440:
                        valid_count += 1
                        unique_times.add(minutes)
                        unique_stops.add(stop_idx)
                except:
                    break

            # Pokud jsme našli sekci s dobrými záznamy
            # KLÍČOVÁ ZMĚNA: Musí mít různé stop_idx!
            if valid_count >= 10 and len(unique_times) > 3 and len(unique_stops) > 3:
                sections_found.append({
                    'offset': offset,
                    'valid_count': valid_count,
                    'unique_times': len(unique_times),
                    'unique_stops': len(unique_stops),
                    'score': valid_count * len(unique_times) * len(unique_stops)  # Bonus za různé zastávky
                })

    # Seřaď podle skóre
    sections_found.sort(key=lambda x: x['score'], reverse=True)

    print(f"Nalezeno {len(sections_found)} potenciálních sekcí:\n")
    print(f"{'Offset':<12} {'Valid':<8} {'Times':<8} {'Stops':<8} {'Score':<10}")
    print("-" * 60)

    for sec in sections_found[:10]:
        print(f"0x{sec['offset']:06X}     {sec['valid_count']:<8} {sec['unique_times']:<8} {sec['unique_stops']:<8} {sec['score']:<10}")

    if sections_found:
        best = sections_found[0]
        print(f"\n✅ Nejlepší kandidát: offset 0x{best['offset']:06X}")
        return best['offset']
    else:
        print(f"\n❌ Nenalezena žádná dobrá sekce")
        return None


def compare_files(file1: Path, file2: Path):
    """Porovnej dva soubory - jeden fungující, jeden nefungující."""
    print(f"\n{'='*80}")
    print(f"POROVNÁNÍ:")
    print(f"  Working:  {file1.name} ({file1.stat().st_size:,} bytes)")
    print(f"  Broken:   {file2.name} ({file2.stat().st_size:,} bytes)")
    print(f"{'='*80}\n")

    # Najdi nejlepší sekce v obou
    print("→ Skenování fungujícího souboru...")
    offset1 = scan_entire_file(file1)

    print("\n→ Skenování nefungujícího souboru...")
    offset2 = scan_entire_file(file2)

    if offset1 and offset2:
        print(f"\n{'='*80}")
        print(f"DETAILNÍ ANALÝZA NEJLEPŠÍCH SEKCÍ:")
        print(f"{'='*80}")

        print(f"\n→ {file1.name} @ 0x{offset1:06X}:")
        analyze_time_records_section(file1, offset1, max_records=50)

        print(f"\n→ {file2.name} @ 0x{offset2:06X}:")
        analyze_time_records_section(file2, offset2, max_records=50)


def main():
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python tt_analyzer.py <file.tt>                      # Scan celého souboru")
        print("  python tt_analyzer.py <file.tt> <offset_hex>         # Analyzuj konkrétní offset")
        print("  python tt_analyzer.py --compare <good.tt> <bad.tt>   # Porovnej dva soubory")
        sys.exit(1)

    if sys.argv[1] == '--compare':
        if len(sys.argv) < 4:
            print("❌ Chybí soubory pro porovnání")
            sys.exit(1)

        file1 = Path(sys.argv[2])
        file2 = Path(sys.argv[3])

        if not file1.exists() or not file2.exists():
            print("❌ Jeden ze souborů neexistuje")
            sys.exit(1)

        compare_files(file1, file2)

    elif len(sys.argv) == 2:
        # Scan celého souboru
        filepath = Path(sys.argv[1])

        if not filepath.exists():
            print(f"❌ Soubor neexistuje: {filepath}")
            sys.exit(1)

        best_offset = scan_entire_file(filepath)

        if best_offset:
            analyze_time_records_section(filepath, best_offset, max_records=100)

    else:
        # Analyzuj konkrétní offset
        filepath = Path(sys.argv[1])
        offset = int(sys.argv[2], 16)

        if not filepath.exists():
            print(f"❌ Soubor neexistuje: {filepath}")
            sys.exit(1)

        analyze_time_records_section(filepath, offset, max_records=100)


if __name__ == '__main__':
    main()
