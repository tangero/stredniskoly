#!/usr/bin/env python3
"""Build transit graph v2 with route info and headways from GTFS data.

Produces data/transit_graph.json with:
- stops: {stopId: [name, lat, lon]}
- edges: {stopId: [[destId, travelTimeMin, [routeShort1, ...]], ...]}
- headways: {routeShort: headwayMinutes}
- metadata

Time profile: Monday 07:00-08:00 (morning commute to school).

Only trips that actually run on one reference Monday are used (calendar.txt
plus exceptions in calendar_dates.txt). The reference Monday must be a regular
school day; default is the nearest school Monday on or after --od (today).

The feed only contains trips published so far: PID (Prague) about two weeks
ahead, other operators until the end of the yearly timetable. Before writing,
the graph is compared with the current one (--srovnat): the build fails when
stations with departures drop below 85 % overall or below 50 % in any map cell
of 0.25° x 0.5° with at least 30 stations, e.g. a missing region or Prague.
Service volume is checked too: trips in the morning window must stay at 85 %
(when the current graph records them) and at most 30 % of shared routes may
double their headway, e.g. a feed with only a few trips per route.

The data come from the data pipeline (scripts/linka/, sada doprava-gtfs), which
downloads the feed after a timetable change and runs this script:

    python3 scripts/build_transit_graph_v2.py --gtfs-dir <rozbalené GTFS> --output <graf.json>
"""

import argparse
import csv
import json
import os
import statistics
import sys
import time
from collections import defaultdict
from datetime import date, timedelta
from pathlib import Path

GTFS_DIR = Path(__file__).resolve().parent.parent / "data" / "GTFS_CR"
OUTPUT = Path(__file__).resolve().parent.parent / "data" / "transit_graph.json"

# Coverage check against the current graph (see module docstring).
CELL_LAT, CELL_LON = 0.25, 0.5
MIN_SHARE_TOTAL = 0.85
MIN_SHARE_CELL = 0.5
MIN_CELL_STATIONS = 30
MIN_SHARE_TRIPS = 0.85
MAX_SHARE_SLOWER_ROUTES = 0.3
MIN_SHARED_ROUTES = 50

WEEKDAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
HOUR_START = 7
HOUR_END = 8

# Blacklist known night routes to exclude from school accessibility analysis
# Prague: 91-99 (night trams), 901-999 (night buses)
NIGHT_ROUTE_PATTERNS = {'91', '92', '93', '94', '95', '96', '97', '98', '99'}


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


def is_night_route(route_short: str) -> bool:
    """Check if route is a night service that should be excluded from school accessibility.

    Night routes include:
    - Prague night trams: 91-99
    - Night buses: 901-999 (national pattern)
    """
    # Known night trams
    if route_short in NIGHT_ROUTE_PATTERNS:
        return True

    # Night buses: 901-999
    if route_short.isdigit():
        route_num = int(route_short)
        if 901 <= route_num <= 999:
            return True

    return False


def next_monday(today: date) -> date:
    """Nearest Monday on or after today."""
    return today + timedelta(days=(7 - today.weekday()) % 7)


def active_service_ids(gtfs_dir: Path, day: date) -> set[str]:
    """service_ids running on the given day (calendar.txt + calendar_dates.txt)."""
    ymd = day.strftime("%Y%m%d")
    weekday = WEEKDAYS[day.weekday()]
    active = set()

    calendar = gtfs_dir / "calendar.txt"
    if calendar.exists():
        with open(calendar, encoding="utf-8-sig") as f:
            for row in csv.DictReader(f):
                if row.get(weekday, "0").strip() == "1" and row["start_date"].strip() <= ymd <= row["end_date"].strip():
                    active.add(row["service_id"].strip())

    calendar_dates = gtfs_dir / "calendar_dates.txt"
    if calendar_dates.exists():
        with open(calendar_dates, encoding="utf-8-sig") as f:
            for row in csv.DictReader(f):
                if row["date"].strip() != ymd:
                    continue
                sid = row["service_id"].strip()
                exception = row.get("exception_type", "").strip()
                if exception == "1":
                    active.add(sid)
                elif exception == "2":
                    active.discard(sid)

    return active


def easter_sunday(year: int) -> date:
    """Gregorian Easter Sunday (anonymous algorithm)."""
    a, b, c = year % 19, year // 100, year % 100
    d, e = b // 4, b % 4
    f = (b + 8) // 25
    g = (b - f + 1) // 3
    h = (19 * a + b - d - g + 15) % 30
    i, k = c // 4, c % 4
    l = (32 + 2 * e + 2 * i - h - k) % 7
    m = (a + 11 * h + 22 * l) // 451
    month, day = divmod(h + l - 7 * m + 114, 31)
    return date(year, month, day + 1)


PUBLIC_HOLIDAYS = {(1, 1), (5, 1), (5, 8), (7, 5), (7, 6), (9, 28), (10, 28), (11, 17), (12, 24), (12, 25), (12, 26)}


def school_day_problem(day: date) -> str | None:
    """Why the day is not a regular school day in Czechia, or None.

    Holidays that differ by district (spring break, February to mid-March) count as
    a problem too: school-only trips would be missing in part of the country.
    """
    if (day.month, day.day) in PUBLIC_HOLIDAYS or day == easter_sunday(day.year) + timedelta(days=1):
        return "public holiday"
    if day.month in (7, 8):
        return "summer holidays"
    if (day.month == 12 and day.day >= 21) or (day.month == 1 and day.day <= 3):
        return "Christmas holidays"
    if day.month == 10 and 26 <= day.day <= 30:
        return "autumn holidays"
    if day.month == 2 or (day.month == 3 and day.day <= 21):
        return "spring holidays in some districts"
    return None


def nearest_school_monday(start: date) -> date:
    """First Monday on or after start that is a regular school day."""
    day = next_monday(start)
    while school_day_problem(day):
        day += timedelta(days=7)
    return day


def map_cell(lat: float, lon: float) -> tuple[int, int]:
    return int(lat // CELL_LAT), int(lon // CELL_LON)


def stations_by_cell(graph: dict) -> dict[tuple[int, int], int]:
    """Stations with departures (graph edges) per map cell."""
    cells: dict[tuple[int, int], int] = defaultdict(int)
    for sid in graph["edges"]:
        stop = graph["stops"].get(sid)
        if stop and (stop[1] or stop[2]):
            cells[map_cell(stop[1], stop[2])] += 1
    return cells


def coverage_problems(new: dict, reference: dict) -> list[str]:
    """Coverage drops of the new graph against the reference graph; empty when fine."""
    problems = []
    total_new, total_ref = len(new["edges"]), len(reference["edges"])
    if total_ref and total_new < MIN_SHARE_TOTAL * total_ref:
        problems.append(f"stations with departures: {total_new} vs {total_ref} in the current graph")
    new_cells = stations_by_cell(new)
    names = {map_cell(s[1], s[2]): s[0] for s in reference["stops"].values() if s[1] or s[2]}
    for cell, count in sorted(stations_by_cell(reference).items()):
        if count >= MIN_CELL_STATIONS and new_cells.get(cell, 0) < MIN_SHARE_CELL * count:
            lat, lon = cell[0] * CELL_LAT, cell[1] * CELL_LON
            problems.append(f"area {lat:.2f}-{lat + CELL_LAT:.2f} N, {lon:.1f}-{lon + CELL_LON:.1f} E "
                            f"(e.g. {names.get(cell, '?')}): {new_cells.get(cell, 0)} stations vs {count}")
    trips_new, trips_ref = new["metadata"].get("trips_in_window"), reference.get("metadata", {}).get("trips_in_window")
    if trips_new is not None and trips_ref and trips_new < MIN_SHARE_TRIPS * trips_ref:
        problems.append(f"trips in the 6:30-9:00 window: {trips_new} vs {trips_ref} in the current graph")
    shared = [r for r in reference.get("headways", {}) if r in new.get("headways", {})]
    if len(shared) >= MIN_SHARED_ROUTES:
        slower = sum(1 for r in shared if new["headways"][r] >= 2 * reference["headways"][r])
        if slower > MAX_SHARE_SLOWER_ROUTES * len(shared):
            problems.append(f"headway doubled on {slower} of {len(shared)} shared routes")
    return problems


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build data/transit_graph.json from GTFS CIS JŘ")
    parser.add_argument("--datum", type=date.fromisoformat, default=None,
                        help="reference school Monday YYYY-MM-DD (default: nearest school Monday on or after --od)")
    parser.add_argument("--od", type=date.fromisoformat, default=None,
                        help="earliest reference Monday when --datum is not given (default: today)")
    parser.add_argument("--gtfs-dir", type=Path, default=GTFS_DIR)
    parser.add_argument("--output", type=Path, default=OUTPUT)
    parser.add_argument("--srovnat", type=Path, default=OUTPUT,
                        help="current graph for the coverage check (default data/transit_graph.json)")
    parser.add_argument("--bez-srovnani", action="store_true", help="skip the coverage check")
    parser.add_argument("--publikovano", default=None, help="publication date of the feed, stored in metadata")
    args = parser.parse_args(argv)
    if args.datum is None:
        args.datum = nearest_school_monday(args.od or date.today())
    elif args.datum.weekday() != 0:
        parser.error(f"--datum {args.datum} is not a Monday")
    elif problem := school_day_problem(args.datum):
        parser.error(f"--datum {args.datum} is not a regular school day ({problem})")
    return args


def main(argv: list[str] | None = None):
    args = parse_args(argv)
    gtfs_dir, output = args.gtfs_dir, args.output
    t0 = time.time()

    # --- Step 1: Load routes.txt → route_id → route_short_name ---
    print("Loading routes.txt...")
    route_id_to_short = {}
    with open(gtfs_dir / "routes.txt", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rid = row["route_id"].strip()
            short = row.get("route_short_name", "").strip()
            if rid and short:
                route_id_to_short[rid] = short
    print(f"  {len(route_id_to_short)} routes loaded")

    # --- Step 2: Load calendar.txt + calendar_dates.txt → services running on the reference Monday ---
    print(f"Loading calendar for {args.datum.isoformat()}...")
    monday_service_ids = active_service_ids(gtfs_dir, args.datum)
    print(f"  {len(monday_service_ids)} service_ids running on {args.datum.isoformat()}")
    if not monday_service_ids:
        sys.exit(f"No services run on {args.datum.isoformat()}; the GTFS feed does not cover this date")

    # --- Step 3: Load trips.txt → filter Monday trips → trip_id → route_short_name ---
    print("Loading trips.txt...")
    trip_to_route_short = {}
    with open(gtfs_dir / "trips.txt", encoding="utf-8-sig") as f:
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

    with open(gtfs_dir / "stops.txt", encoding="utf-8-sig") as f:
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
    trip_stops = []
    trips_in_window = 0  # [(stop_id, arrival_sec, departure_sec), ...]

    def process_trip(trip_id, stops_list):
        """Process a complete trip: extract consecutive edges and headway data."""
        nonlocal trips_in_window
        route_short = trip_to_route_short.get(trip_id)
        if not route_short:
            return

        # Filter: exclude night routes (91-99, 901-999)
        if is_night_route(route_short):
            return

        # Filter: only process trips with departures in the school commute window (6:30-9:00)
        # This excludes night services ending early morning (e.g., night trams ending 5:00-6:30)
        dep_times = [dep for _, _, dep in stops_list if dep is not None]
        if not dep_times:
            return
        min_dep = min(dep_times)
        if min_dep < 6.5 * 3600 or min_dep >= 9 * 3600:  # 6:30-9:00
            return
        trips_in_window += 1

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
    with open(gtfs_dir / "stop_times.txt", encoding="utf-8-sig") as f:
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

    # --- Step 6: Compute headways per route (before edge aggregation, so we can filter) ---
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

    # --- Step 7: Aggregate edges (filter routes without headway data) ---
    print("Aggregating edges...")
    edges_out = defaultdict(list)
    total_edges = 0

    for (p_from, p_to), route_times in edge_data.items():
        # Collect all routes on this edge
        route_shorts = list(route_times.keys())

        # Filter: only keep routes that have headway data (removes night/infrequent lines)
        route_shorts = [r for r in route_shorts if r in headways_out]
        if not route_shorts:
            continue

        # Compute travel times only for routes with headway
        all_times = []
        for route_short in route_shorts:
            all_times.extend(route_times[route_short])

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
            "reference_date": args.datum.isoformat(),
            "source_published": args.publikovano,
            "parent_stations": len(stops_out),
            "stations_with_edges": len(edges_out),
            "directed_edges": total_edges,
            "avg_out_degree": round(total_edges / max(1, len(edges_out)), 1),
            "routes_with_headway": len(headways_out),
            "trips_in_window": trips_in_window,
            "version": 2,
        },
        "stops": dict(sorted(stops_out.items())),
        "edges": {k: v for k, v in sorted(edges_out.items())},
        "headways": dict(sorted(headways_out.items())),
    }

    if not args.bez_srovnani and args.srovnat.exists():
        reference = json.loads(args.srovnat.read_text(encoding="utf-8"))
        problems = coverage_problems(output_data, reference)
        if problems:
            sys.exit(f"Coverage check against {args.srovnat} failed for {args.datum.isoformat()}; the feed does not "
                     "fully cover this date (Prague/PID is published only about two weeks ahead) or a region "
                     "is missing:\n  " + "\n  ".join(problems[:15]))
        print(f"  Coverage check against {args.srovnat}: OK")

    with open(output, "w", encoding="utf-8") as f:
        json.dump(output_data, f, ensure_ascii=False, separators=(",", ":"))

    file_size_mb = os.path.getsize(output) / (1024 * 1024)
    print(f"\nDone in {time.time() - t0:.1f}s")
    print(f"Output: {output} ({file_size_mb:.1f} MB)")
    print(f"  Stops: {len(stops_out)}")
    print(f"  Edges: {total_edges}")
    print(f"  Routes with headway: {len(headways_out)}")
    print(f"  Median headway (all routes): {statistics.median(headways_out.values()):.1f} min")


if __name__ == "__main__":
    main()
