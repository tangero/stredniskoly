#!/usr/bin/env python3
"""
Test routingu na dekódovaných datech Pardubic.
Najde nejkratší cestu mezi dvěma zastávkami.
"""

import json
from pathlib import Path
import heapq
from typing import Dict, List, Tuple, Optional


def load_pardubice_data():
    """Načti dekódovaná data Pardubic."""
    json_file = Path('data/KOMPLET/Data3/Pardubice.json')

    with open(json_file, 'r', encoding='utf-8') as f:
        return json.load(f)


def build_graph(edges_data: Dict) -> Dict[str, List[Tuple[str, float]]]:
    """
    Sestav graf pro Dijkstra.

    Returns:
        Dict[stop_name, [(next_stop_name, travel_time), ...]]
    """
    graph = {}

    for edge_key, edge_info in edges_data.items():
        from_stop = edge_info['from_stop']
        to_stop = edge_info['to_stop']
        time = edge_info['travel_time_avg']

        if from_stop not in graph:
            graph[from_stop] = []

        graph[from_stop].append((to_stop, time))

    return graph


def dijkstra(graph: Dict[str, List[Tuple[str, float]]],
             start: str,
             end: str) -> Optional[Tuple[List[str], float]]:
    """
    Najdi nejkratší cestu od start do end.

    Returns:
        (path, total_time) nebo None
    """
    # Priority queue: (time, stop_name)
    pq = [(0, start)]

    # Distance map
    distances = {start: 0}

    # Predecessors
    previous = {}

    visited = set()

    while pq:
        current_time, current_stop = heapq.heappop(pq)

        if current_stop in visited:
            continue

        visited.add(current_stop)

        if current_stop == end:
            # Rekonstruuj cestu
            path = []
            node = end
            while node in previous:
                path.append(node)
                node = previous[node]
            path.append(start)
            path.reverse()

            return (path, current_time)

        if current_stop not in graph:
            continue

        for neighbor, travel_time in graph[current_stop]:
            new_time = current_time + travel_time

            if neighbor not in distances or new_time < distances[neighbor]:
                distances[neighbor] = new_time
                previous[neighbor] = current_stop
                heapq.heappush(pq, (new_time, neighbor))

    return None


def find_stops_by_name(stops: List[str], query: str) -> List[Tuple[int, str]]:
    """Najdi zastávky podle názvu (case-insensitive substring)."""
    query = query.lower()
    matches = []

    for idx, stop in enumerate(stops):
        if query in stop.lower():
            matches.append((idx, stop))

    return matches


def main():
    # Načti data
    print("📖 Načítám data Pardubic...")
    data = load_pardubice_data()

    stops = data['stops']
    edges = data['edges']

    print(f"✓ {len(stops)} zastávek, {len(edges)} hran\n")

    # Sestav graf
    graph = build_graph(edges)

    # Test routing: Hlavní nádraží → Masarykovo náměstí
    print("🔍 Test 1: Hlavní nádraží → Masarykovo nám.")
    print("-" * 60)

    start = "Hlavní nádraží"
    end = "Masarykovo nám."

    result = dijkstra(graph, start, end)

    if result:
        path, total_time = result
        print(f"✅ Cesta nalezena: {total_time:.1f} minut")
        print(f"   Počet zastávek: {len(path)}")
        print(f"\n   Trasa:")
        for i, stop in enumerate(path):
            if i == 0:
                print(f"   {i+1}. {stop} (start)")
            elif i == len(path) - 1:
                print(f"   {i+1}. {stop} (cíl)")
            else:
                print(f"   {i+1}. {stop}")
    else:
        print("❌ Cesta nenalezena")

    # Test 2: 17.listopadu → Dopravní podnik
    print(f"\n🔍 Test 2: 17.listopadu → Dopravní podnik")
    print("-" * 60)

    start2 = "17.listopadu"
    end2 = "Dopravní podnik"

    result2 = dijkstra(graph, start2, end2)

    if result2:
        path2, total_time2 = result2
        print(f"✅ Cesta nalezena: {total_time2:.1f} minut")
        print(f"   Počet zastávek: {len(path2)}")
        print(f"\n   Trasa:")
        for i, stop in enumerate(path2):
            print(f"   {i+1}. {stop}")
    else:
        print("❌ Cesta nenalezena")

    # Interaktivní vyhledávání
    print(f"\n{'='*60}")
    print("🗺️  Dostupné zastávky (první 30):")
    print("-" * 60)
    unique_stops = sorted(set(stops))
    for i, stop in enumerate(unique_stops[:30]):
        print(f"  {stop}")

    print(f"\n  ... (celkem {len(unique_stops)} unikátních zastávek)")


if __name__ == '__main__':
    main()
