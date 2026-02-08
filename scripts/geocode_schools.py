#!/usr/bin/env python3
"""
Geocode school addresses and find nearest transit stop for each school.
Replaces the broken city_match approach in school_locations.json.

Usage:
    python3 scripts/geocode_schools.py

Output:
    data/school_locations.json (overwritten with correct mappings)
"""

import json
import math
import os
import sys
import time
import urllib.request
import urllib.parse

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)

SCHOOLS_DATA_PATH = os.path.join(PROJECT_ROOT, "public", "schools_data.json")
TRANSIT_GRAPH_PATH = os.path.join(PROJECT_ROOT, "data", "transit_graph.json")
OUTPUT_PATH = os.path.join(PROJECT_ROOT, "data", "school_locations.json")
GEOCODE_CACHE_PATH = os.path.join(PROJECT_ROOT, "data", "geocode_cache.json")

NOMINATIM_DELAY = 1.05  # seconds between requests


def haversine_km(lat1, lon1, lat2, lon2):
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    return 2 * R * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def nominatim_query(query_str):
    """Single Nominatim search, returns (lat, lon) or None."""
    params = urllib.parse.urlencode({
        "q": query_str,
        "format": "json",
        "limit": 1,
        "countrycodes": "cz",
    })
    url = f"https://nominatim.openstreetmap.org/search?{params}"
    req = urllib.request.Request(url, headers={
        "User-Agent": "StredniskolyApp/1.0 (prijimackynaskolu.cz)"
    })
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            results = json.loads(resp.read())
            if results:
                return (float(results[0]["lat"]), float(results[0]["lon"]))
    except Exception as e:
        print(f"    HTTP error: {e}", file=sys.stderr)
    return None


def geocode_address(address, obec, cache):
    """Geocode with fallback strategies. Returns (lat, lon, method) or None."""
    # Strategy 1: Full address
    key1 = address
    if key1 in cache:
        c = cache[key1]
        if c is not None:
            return (c["lat"], c["lon"], "address")

    if key1 not in cache:
        result = nominatim_query(address + ", Czech Republic")
        time.sleep(NOMINATIM_DELAY)
        if result:
            cache[key1] = {"lat": result[0], "lon": result[1]}
            return (result[0], result[1], "address")
        cache[key1] = None

    # Strategy 2: Street + city (without PSČ)
    parts = [p.strip() for p in address.split(",")]
    if len(parts) >= 2:
        street = parts[0]
        key2 = f"{street}, {obec}"
        if key2 in cache:
            c = cache[key2]
            if c is not None:
                return (c["lat"], c["lon"], "street_city")
        if key2 not in cache:
            result = nominatim_query(key2 + ", Czech Republic")
            time.sleep(NOMINATIM_DELAY)
            if result:
                cache[key2] = {"lat": result[0], "lon": result[1]}
                return (result[0], result[1], "street_city")
            cache[key2] = None

    # Strategy 3: City only (fallback)
    key3 = obec
    if key3 in cache:
        c = cache[key3]
        if c is not None:
            return (c["lat"], c["lon"], "city_fallback")
    if key3 not in cache:
        result = nominatim_query(obec + ", Czech Republic")
        time.sleep(NOMINATIM_DELAY)
        if result:
            cache[key3] = {"lat": result[0], "lon": result[1]}
            return (result[0], result[1], "city_fallback")
        cache[key3] = None

    return None


def main():
    print("=== School Geocoder & Nearest-Stop Finder ===\n")

    # Load data
    print("Loading schools data...")
    with open(SCHOOLS_DATA_PATH) as f:
        schools_raw = json.load(f)
    year_data = schools_raw.get("2025", []) or schools_raw.get("2024", [])

    print("Loading transit graph...")
    with open(TRANSIT_GRAPH_PATH) as f:
        graph = json.load(f)

    # Build school address map (unique by redizo)
    school_info = {}
    for row in year_data:
        redizo = str(row.get("redizo", "")).strip()
        addr = str(row.get("adresa_plna", row.get("adresa", ""))).strip()
        obec = str(row.get("obec", "")).strip()
        if redizo and addr and redizo not in school_info:
            school_info[redizo] = {"adresa": addr, "obec": obec}

    total = len(school_info)
    print(f"Schools to process: {total}")

    # Build unique address → list of redizos (to avoid re-geocoding same address)
    addr_to_redizos = {}
    for redizo, info in school_info.items():
        addr = info["adresa"]
        if addr not in addr_to_redizos:
            addr_to_redizos[addr] = []
        addr_to_redizos[addr].append((redizo, info["obec"]))

    unique_addrs = len(addr_to_redizos)
    print(f"Unique addresses: {unique_addrs}")

    # Build spatial index for transit stops
    CELL_SIZE = 0.02
    stop_grid = {}
    all_stops = []
    for stop_id, (name, lat, lon) in graph["stops"].items():
        all_stops.append((stop_id, name, lat, lon))
        cell = (int(lat // CELL_SIZE), int(lon // CELL_SIZE))
        if cell not in stop_grid:
            stop_grid[cell] = []
        stop_grid[cell].append((stop_id, name, lat, lon))

    print(f"Transit stops: {len(all_stops)}")

    def find_nearest_stop(lat, lon, max_km=5.0):
        search_cells = max(2, int(math.ceil(max_km / (CELL_SIZE * 111))))
        clat = int(lat // CELL_SIZE)
        clon = int(lon // CELL_SIZE)

        best = None
        best_dist = float("inf")

        for dlat in range(-search_cells, search_cells + 1):
            for dlon in range(-search_cells, search_cells + 1):
                for stop_id, name, slat, slon in stop_grid.get((clat + dlat, clon + dlon), []):
                    dist = haversine_km(lat, lon, slat, slon)
                    if dist < best_dist:
                        best_dist = dist
                        best = (stop_id, name, slat, slon, dist)

        if best is None:
            # Brute force fallback
            for stop_id, name, slat, slon in all_stops:
                dist = haversine_km(lat, lon, slat, slon)
                if dist < best_dist:
                    best_dist = dist
                    best = (stop_id, name, slat, slon, dist)

        return best

    # Load geocode cache
    cache = {}
    if os.path.exists(GEOCODE_CACHE_PATH):
        with open(GEOCODE_CACHE_PATH) as f:
            cache = json.load(f)
        print(f"Geocode cache: {len(cache)} entries")

    # Count how many we need to actually query
    uncached = sum(1 for addr in addr_to_redizos if addr not in cache)
    print(f"Need to geocode: {uncached} addresses (~{uncached * 1.1 / 60:.0f} min)")
    print()

    # Process
    result_schools = {}
    failed = []
    processed_addrs = 0

    def save_cache():
        with open(GEOCODE_CACHE_PATH, "w") as f:
            json.dump(cache, f, ensure_ascii=False, indent=2)

    for addr, redizo_list in addr_to_redizos.items():
        processed_addrs += 1
        obec = redizo_list[0][1]

        if processed_addrs % 100 == 0:
            save_cache()
            cached_count = sum(1 for a in addr_to_redizos if a in cache)
            print(f"  [{processed_addrs}/{unique_addrs}] cached={cached_count}, matched={len(result_schools)}")

        geo_result = geocode_address(addr, obec, cache)
        if geo_result is None:
            for redizo, _ in redizo_list:
                failed.append(redizo)
            continue

        lat, lon, method = geo_result

        # Find nearest transit stop
        nearest = find_nearest_stop(lat, lon)
        if nearest is None:
            for redizo, _ in redizo_list:
                failed.append(redizo)
            continue

        stop_id, stop_name, stop_lat, stop_lon, distance_km = nearest

        # Apply to all redizos at this address
        for redizo, _ in redizo_list:
            result_schools[redizo] = {
                "stop_id": stop_id,
                "stop_name": stop_name,
                "lat": lat,
                "lon": lon,
                "distance_km": round(distance_km, 3),
                "method": method,
            }

    save_cache()

    # Write output
    output = {
        "metadata": {
            "total_schools": total,
            "matched": len(result_schools),
            "unmatched": len(failed),
            "match_rate": round(len(result_schools) / total * 100, 1) if total > 0 else 0,
            "method": "nominatim_geocode_nearest_stop",
            "generated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        },
        "schools": result_schools,
    }

    with open(OUTPUT_PATH, "w") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    # Stats
    print(f"\n=== RESULTS ===")
    print(f"Matched: {len(result_schools)}/{total} ({100*len(result_schools)/total:.1f}%)")
    print(f"Failed: {len(failed)}")

    unique_stops = set(v["stop_id"] for v in result_schools.values())
    print(f"Unique stops assigned: {len(unique_stops)}")

    # Method breakdown
    from collections import Counter
    methods = Counter(v["method"] for v in result_schools.values())
    print(f"Methods: {dict(methods)}")

    # Distance stats
    distances = [v["distance_km"] for v in result_schools.values()]
    if distances:
        print(f"Distance to stop: min={min(distances):.3f}km, max={max(distances):.3f}km, avg={sum(distances)/len(distances):.3f}km")

    # Prague check
    prague_schools = [r for r, info in school_info.items() if info["obec"] == "Praha" and r in result_schools]
    prague_unique_stops = set(result_schools[r]["stop_name"] for r in prague_schools)
    print(f"Prague: {len(prague_schools)} schools → {len(prague_unique_stops)} unique stops")

    if failed:
        print(f"\nFailed schools (first 10): {failed[:10]}")


if __name__ == "__main__":
    main()
