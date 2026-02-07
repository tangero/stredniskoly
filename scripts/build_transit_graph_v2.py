#!/usr/bin/env python3
"""Build transit graph v2 with route info and headways from GTFS data.

Produces data/transit_graph.json with:
- stops: {stopId: [name, lat, lon]}
- edges: {stopId: [[destId, travelTimeMin, [routeShort1, ...]], ...]}
- headways: {routeShort: headwayMinutes}
- metadata

Time profile: Monday 07:00-08:00 (morning commute to school).
"""

import csv
import json
import os
import statistics
import sys
import time
from collections import defaultdict
from pathlib import Path

GTFS_DIR = Path(__file__).resolve().parent.parent / "data" / "GTFS_CR"
OUTPUT = Path(__file__).resolve().parent.parent / "data" / "transit_graph.json"

# Reference date for filtering: a Monday within the GTFS validity range
# We'll pick the first Monday that falls within calendar validity
REFERENCE_WEEKDAY = "monday"
HOUR_START = 7
HOUR_END = 8


def parse_time_seconds(time_str: str) -> int | None:
    """Parse HH:MM:SS to seconds since midnight. Supports >24h."""
    parts = time_str.strip().split(":")
    if len(parts) != 3:
        return None
    try:
        h, m, s = int(parts[0]), int(parts[1]), int(parts[2])
        return h * 3600 + m * 60 + s
    except ValueError:
        return None


def main():
    t0 = time.time()

    # --- Step 1: Load routes.txt → route_id → route_short_name ---
    print("Loading routes.txt...")
    route_id_to_short = {}
    with open(GTFS_DIR / "routes.txt", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rid = row["route_id"].strip()
            short = row.get("route_short_name", "").strip()
            if rid and short:
                route_id_to_short[rid] = short
    print(f"  {len(route_id_to_short)} routes loaded")

    # --- Step 2: Load calendar.txt → Monday service_ids ---
    print("Loading calendar.txt...")
    monday_service_ids = set()
    with open(GTFS_DIR / "calendar.txt", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row.get(REFERENCE_WEEKDAY, "0") == "1":
                monday_service_ids.add(row["service_id"].strip())
    print(f"  {len(monday_service_ids)} Monday service_ids")

    # --- Step 3: Load trips.txt → filter Monday trips → trip_id → route_short_name ---
    print("Loading trips.txt...")
    trip_to_route_short = {}
    with open(GTFS_DIR / "trips.txt", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            sid = row["service_id"].strip()
            if sid not in monday_service_ids:
                continue
            tid = row["trip_id"].strip()
            rid = row["route_id"].strip()
            short = route_id_to_short.get(rid, "")
            if tid and short:
                trip_to_route_short[tid] = short
    print(f"  {len(trip_to_route_short)} Monday trips with route info")

    # --- Step 4: Load stops.txt → stop_id → parent_station, name, lat, lon ---
    print("Loading stops.txt...")
    stop_parent = {}  # stop_id → parent_station (or itself if location_type=1)
    parent_info = {}  # parent_id → (name, lat, lon)

    with open(GTFS_DIR / "stops.txt", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            sid = row["stop_id"].strip()
            name = row["stop_name"].strip()
            lat = row.get("stop_lat", "")
            lon = row.get("stop_lon", "")
            loc_type = row.get("location_type", "").strip()
            parent = row.get("parent_station", "").strip()

            try:
                lat_f = float(lat)
                lon_f = float(lon)
            except (ValueError, TypeError):
                lat_f, lon_f = 0.0, 0.0

            if loc_type == "1":
                # This is a parent station
                stop_parent[sid] = sid
                parent_info[sid] = (name, lat_f, lon_f)
            elif parent:
                stop_parent[sid] = parent
            else:
                # Standalone stop — treat as its own parent
                stop_parent[sid] = sid
                if sid not in parent_info:
                    parent_info[sid] = (name, lat_f, lon_f)

    print(f"  {len(parent_info)} parent stations")

    # --- Step 5: Stream stop_times.txt → build edges + headway data ---
    print("Streaming stop_times.txt (this may take a while)...")
    t_stream = time.time()

    # Edge data: (parent_from, parent_to) → {route_short: [travel_time_seconds, ...]}
    edge_data = defaultdict(lambda: defaultdict(list))

    # Headway data: (route_short, parent_stop) → [departure_seconds in 7-8 window]
    headway_departures = defaultdict(list)

    # Process trip by trip
    current_trip_id = None
    trip_stops = []  # [(stop_id, arrival_sec, departure_sec), ...]

    def process_trip(trip_id, stops_list):
        """Process a complete trip: extract consecutive edges and headway data."""
        route_short = trip_to_route_short.get(trip_id)
        if not route_short:
            return

        for i in range(len(stops_list) - 1):
            sid_from, _, dep_sec_from = stops_list[i]
            sid_to, arr_sec_to, _ = stops_list[i + 1]

            if dep_sec_from is None or arr_sec_to is None:
                continue

            parent_from = stop_parent.get(sid_from, sid_from)
            parent_to = stop_parent.get(sid_to, sid_to)

            if parent_from == parent_to:
                continue

            travel_sec = arr_sec_to - dep_sec_from
            if travel_sec < 0:
                continue
            if travel_sec > 7200:  # Skip edges > 2 hours (data errors)
                continue

            edge_data[(parent_from, parent_to)][route_short].append(travel_sec)

        # Headway: collect departures from first stop in 7:00-8:00 window
        if stops_list:
            first_sid, _, first_dep = stops_list[0]
            if first_dep is not None:
                if HOUR_START * 3600 <= first_dep < HOUR_END * 3600:
                    parent = stop_parent.get(first_sid, first_sid)
                    headway_departures[(route_short, parent)].append(first_dep)

    lines_processed = 0
    with open(GTFS_DIR / "stop_times.txt", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            lines_processed += 1
            if lines_processed % 1_000_000 == 0:
                print(f"  ...{lines_processed / 1_000_000:.0f}M lines")

            tid = row["trip_id"].strip()

            # Trip boundary
            if tid != current_trip_id:
                if current_trip_id and trip_stops:
                    process_trip(current_trip_id, trip_stops)
                current_trip_id = tid
                trip_stops = []

            # Skip non-Monday trips early
            if tid not in trip_to_route_short:
                continue

            sid = row["stop_id"].strip()
            arr = parse_time_seconds(row.get("arrival_time", ""))
            dep = parse_time_seconds(row.get("departure_time", ""))
            seq = int(row.get("stop_sequence", "0"))

            trip_stops.append((sid, arr, dep))

    # Don't forget the last trip
    if current_trip_id and trip_stops:
        process_trip(current_trip_id, trip_stops)

    print(f"  Processed {lines_processed} lines in {time.time() - t_stream:.1f}s")
    print(f"  Raw edge pairs: {len(edge_data)}")

    # --- Step 6: Aggregate edges ---
    print("Aggregating edges...")
    edges_out = defaultdict(list)
    total_edges = 0

    for (p_from, p_to), route_times in edge_data.items():
        # Median travel time across all routes for this edge
        all_times = []
        route_shorts = []
        for route_short, times in route_times.items():
            all_times.extend(times)
            route_shorts.append(route_short)

        if not all_times:
            continue

        median_sec = statistics.median(all_times)
        median_min = round(median_sec / 60, 1)

        # Clamp minimum to 0.5 min
        if median_min < 0.5:
            median_min = 0.5

        # Sort routes for determinism
        route_shorts.sort()

        edges_out[p_from].append([p_to, median_min, route_shorts])
        total_edges += 1

    print(f"  Aggregated edges: {total_edges}")

    # --- Step 7: Compute headways per route ---
    print("Computing headways...")
    route_headways_raw = defaultdict(list)

    for (route_short, parent_stop), departures in headway_departures.items():
        if len(departures) < 2:
            # Single departure → can't compute interval, estimate from count
            # 1 departure in 60 min window → headway ≈ 60
            route_headways_raw[route_short].append(60.0)
            continue
        departures_sorted = sorted(departures)
        intervals = [
            (departures_sorted[i + 1] - departures_sorted[i]) / 60
            for i in range(len(departures_sorted) - 1)
        ]
        if intervals:
            route_headways_raw[route_short].append(statistics.median(intervals))

    headways_out = {}
    for route_short, values in route_headways_raw.items():
        h = round(statistics.median(values), 1)
        # Clamp between 2 and 120 min
        h = max(2.0, min(120.0, h))
        headways_out[route_short] = h

    print(f"  Headways computed for {len(headways_out)} routes")

    # Sample headways
    sample_routes = sorted(headways_out.items(), key=lambda x: x[1])[:10]
    print(f"  Shortest headway routes: {sample_routes}")

    # --- Step 8: Build stops dict (only parents that appear in edges) ---
    print("Building stops dict...")
    relevant_parents = set()
    for p_from, neighbors in edges_out.items():
        relevant_parents.add(p_from)
        for dest, _, _ in neighbors:
            relevant_parents.add(dest)

    stops_out = {}
    for pid in relevant_parents:
        info = parent_info.get(pid)
        if info:
            name, lat, lon = info
            stops_out[pid] = [name, lat, lon]

    print(f"  Stops in graph: {len(stops_out)}")

    # --- Step 9: Write output ---
    print("Writing output...")
    output_data = {
        "metadata": {
            "source": "GTFS_CR (spojenka.cz)",
            "profile": "monday_07_08",
            "parent_stations": len(stops_out),
            "stations_with_edges": len(edges_out),
            "directed_edges": total_edges,
            "avg_out_degree": round(total_edges / max(1, len(edges_out)), 1),
            "routes_with_headway": len(headways_out),
            "version": 2,
        },
        "stops": dict(sorted(stops_out.items())),
        "edges": {k: v for k, v in sorted(edges_out.items())},
        "headways": dict(sorted(headways_out.items())),
    }

    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(output_data, f, ensure_ascii=False, separators=(",", ":"))

    file_size_mb = os.path.getsize(OUTPUT) / (1024 * 1024)
    print(f"\nDone in {time.time() - t0:.1f}s")
    print(f"Output: {OUTPUT} ({file_size_mb:.1f} MB)")
    print(f"  Stops: {len(stops_out)}")
    print(f"  Edges: {total_edges}")
    print(f"  Routes with headway: {len(headways_out)}")
    print(f"  Median headway (all routes): {statistics.median(headways_out.values()):.1f} min")


if __name__ == "__main__":
    main()
