#!/usr/bin/env python3
"""
Test dekodéru TT proti GTFS datům.
Ověřuje správnost dekódovaných cestovních časů.
"""

import json
from pathlib import Path
import csv
from collections import defaultdict
from typing import Dict, List, Tuple


def load_tt_data(json_file: Path) -> Dict:
    """Načti dekódovaná TT data."""
    with open(json_file, 'r', encoding='utf-8') as f:
        return json.load(f)


def load_gtfs_stop_times(gtfs_dir: Path, route_filter=None) -> Dict[Tuple[str, str], List[int]]:
    """
    Načti stop_times.txt z GTFS a vypočti cestovní časy mezi zastávkami.

    Returns:
        Dict[(from_stop, to_stop), [travel_times_in_minutes]]
    """
    stop_times_file = gtfs_dir / 'stop_times.txt'

    if not stop_times_file.exists():
        print(f"❌ Nenalezen {stop_times_file}")
        return {}

    # Načti všechny stop_times
    trip_stops = defaultdict(list)  # trip_id -> [(stop_id, arrival_time), ...]

    print(f"📖 Načítám {stop_times_file}...")

    with open(stop_times_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)

        for row in reader:
            trip_id = row['trip_id']
            stop_id = row['stop_id']
            arrival_time = row['arrival_time']

            # Parsuj čas (HH:MM:SS)
            try:
                h, m, s = map(int, arrival_time.split(':'))
                minutes = h * 60 + m
                trip_stops[trip_id].append((stop_id, minutes))
            except:
                continue

    print(f"✓ Načteno {len(trip_stops)} spojů")

    # Vypočti cestovní časy mezi zastávkami
    travel_times = defaultdict(list)

    for trip_id, stops in trip_stops.items():
        # Seřaď podle pořadí
        stops.sort(key=lambda x: x[1])  # Seřaď podle času

        for i in range(len(stops) - 1):
            from_stop, from_time = stops[i]
            to_stop, to_time = stops[i + 1]

            travel_time = to_time - from_time

            # Validace
            if travel_time < 0 or travel_time > 120:
                continue

            edge = (from_stop, to_stop)
            travel_times[edge].append(travel_time)

    print(f"✓ Vypočteno {len(travel_times)} unikátních hran")

    return dict(travel_times)


def normalize_stop_name(name: str) -> str:
    """Normalizuj název zastávky pro porovnání."""
    name = name.lower()
    name = name.replace('brandýs nad labem-stará boleslav,', '')
    name = name.replace('brandýs n.l.-st.bol.,', '')
    name = name.strip()

    # Odstraň diakritiku (zjednodušeno)
    replacements = {
        'á': 'a', 'č': 'c', 'ď': 'd', 'é': 'e', 'ě': 'e',
        'í': 'i', 'ň': 'n', 'ó': 'o', 'ř': 'r', 'š': 's',
        'ť': 't', 'ú': 'u', 'ů': 'u', 'ý': 'y', 'ž': 'z'
    }

    for old, new in replacements.items():
        name = name.replace(old, new)

    return name


def match_stops(tt_stops: List[str], gtfs_stops: Dict[str, str]) -> Dict[int, str]:
    """
    Namapuj TT stop_idx -> GTFS stop_id.

    Args:
        tt_stops: List názvů zastávek z TT
        gtfs_stops: Dict[stop_id, stop_name] z GTFS

    Returns:
        Dict[tt_stop_idx, gtfs_stop_id]
    """
    mapping = {}

    for tt_idx, tt_name in enumerate(tt_stops):
        tt_normalized = normalize_stop_name(tt_name)

        # Hledej nejlepší match v GTFS
        best_match = None
        best_score = 0

        for gtfs_id, gtfs_name in gtfs_stops.items():
            gtfs_normalized = normalize_stop_name(gtfs_name)

            # Jednoduchý match: substring
            if tt_normalized in gtfs_normalized or gtfs_normalized in tt_normalized:
                score = len(tt_normalized)
                if score > best_score:
                    best_score = score
                    best_match = gtfs_id

        if best_match:
            mapping[tt_idx] = best_match

    return mapping


def load_gtfs_stops(gtfs_dir: Path) -> Dict[str, str]:
    """Načti stops.txt -> Dict[stop_id, stop_name]."""
    stops_file = gtfs_dir / 'stops.txt'
    stops = {}

    with open(stops_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            stops[row['stop_id']] = row['stop_name']

    return stops


def compare_tt_vs_gtfs(tt_json: Path, gtfs_dir: Path):
    """Porovnej TT dekódovaná data s GTFS."""
    print(f"\n{'='*80}")
    print(f"TEST: {tt_json.stem}")
    print(f"{'='*80}\n")

    # Načti TT data
    tt_data = load_tt_data(tt_json)
    tt_stops = tt_data['stops']
    tt_edges = tt_data['edges']

    print(f"📊 TT data:")
    print(f"  Zastávky: {len(tt_stops)}")
    print(f"  Hrany: {len(tt_edges)}")

    # Načti GTFS data
    gtfs_stops = load_gtfs_stops(gtfs_dir)
    gtfs_travel_times = load_gtfs_stop_times(gtfs_dir)

    print(f"\n📊 GTFS data:")
    print(f"  Zastávky: {len(gtfs_stops)}")
    print(f"  Hrany: {len(gtfs_travel_times)}")

    # Namapuj zastávky
    print(f"\n🔗 Mapování zastávek...")
    stop_mapping = match_stops(tt_stops, gtfs_stops)
    print(f"  Namapováno: {len(stop_mapping)}/{len(tt_stops)} zastávek")

    # Porovnej hrany
    print(f"\n⚖️  Porovnání cestovních časů:")

    matches = []
    mismatches = []

    for edge_key, tt_edge_data in tt_edges.items():
        # Parsuj edge_key "0->11"
        from_idx, to_idx = map(int, edge_key.split('->'))

        # Najdi GTFS stop_id
        if from_idx not in stop_mapping or to_idx not in stop_mapping:
            continue

        gtfs_from = stop_mapping[from_idx]
        gtfs_to = stop_mapping[to_idx]

        gtfs_edge = (gtfs_from, gtfs_to)

        if gtfs_edge not in gtfs_travel_times:
            continue

        # Porovnej časy
        tt_time = tt_edge_data['travel_time_avg']
        gtfs_times = gtfs_travel_times[gtfs_edge]
        gtfs_time_avg = sum(gtfs_times) / len(gtfs_times)

        diff = abs(tt_time - gtfs_time_avg)

        match_data = {
            'from': tt_edge_data['from_stop'],
            'to': tt_edge_data['to_stop'],
            'tt_time': tt_time,
            'gtfs_time': round(gtfs_time_avg, 1),
            'diff': round(diff, 1),
            'match': diff <= 1.0  # Tolerance 1 minuta
        }

        if match_data['match']:
            matches.append(match_data)
        else:
            mismatches.append(match_data)

    # Výsledky
    total = len(matches) + len(mismatches)

    if total == 0:
        print("  ⚠️  Nenalezeny žádné společné hrany pro porovnání")
        return

    accuracy = 100 * len(matches) / total

    print(f"\n{'='*80}")
    print(f"VÝSLEDKY:")
    print(f"  Porovnáno hran: {total}")
    print(f"  Shoda: {len(matches)} ({accuracy:.1f}%)")
    print(f"  Neshoda: {len(mismatches)}")
    print(f"{'='*80}\n")

    if matches:
        print("✅ Příklady shod:")
        for m in matches[:10]:
            print(f"  {m['from']:30s} → {m['to']:30s}: TT={m['tt_time']:4.1f} min, GTFS={m['gtfs_time']:4.1f} min ✓")

    if mismatches:
        print(f"\n❌ Příklady neshod:")
        for m in mismatches[:10]:
            print(f"  {m['from']:30s} → {m['to']:30s}: TT={m['tt_time']:4.1f} min, GTFS={m['gtfs_time']:4.1f} min (diff={m['diff']:.1f})")


def main():
    import sys

    if len(sys.argv) < 2:
        print("Usage: python test_tt_vs_gtfs.py <tt_file.json>")
        print("Example: python test_tt_vs_gtfs.py data/decoded_tt_v2/Brandys.json")
        sys.exit(1)

    tt_json = Path(sys.argv[1])
    gtfs_dir = Path('data/GTFS_CR')

    if not tt_json.exists():
        print(f"❌ Soubor neexistuje: {tt_json}")
        sys.exit(1)

    if not gtfs_dir.exists():
        print(f"❌ GTFS složka neexistuje: {gtfs_dir}")
        sys.exit(1)

    compare_tt_vs_gtfs(tt_json, gtfs_dir)


if __name__ == '__main__':
    main()
