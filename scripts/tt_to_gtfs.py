#!/usr/bin/env python3
"""
Konvertor CHAPS .tt formátu do GTFS standardu.
Vytváří validní GTFS feed z dekódovaných .tt dat.
"""

import csv
import json
from pathlib import Path
from datetime import datetime, date
from typing import List, Dict
import sys


class TTToGTFS:
    def __init__(self, tt_json_dir: Path, output_dir: Path):
        self.tt_json_dir = tt_json_dir
        self.output_dir = output_dir
        self.output_dir.mkdir(parents=True, exist_ok=True)

        # GTFS data
        self.agencies = []
        self.stops = []
        self.routes = []
        self.trips = []
        self.stop_times = []
        self.calendar = []

        # ID counters
        self.stop_id_counter = 1
        self.route_id_counter = 1
        self.trip_id_counter = 1

        # Mappings
        self.stop_name_to_id = {}  # {(city, stop_name): stop_id}

    def convert(self):
        """Hlavní konverzní funkce."""
        print(f"🔄 Konvertuji TT data z {self.tt_json_dir} do GTFS...")

        # Načti všechny TT JSON soubory
        json_files = sorted(self.tt_json_dir.glob('*.json'))

        if not json_files:
            print(f"❌ Žádné JSON soubory v {self.tt_json_dir}")
            return False

        print(f"📁 Nalezeno {len(json_files)} souborů\n")

        # Vytvořit agency.txt (obecný dopravce)
        self._create_agency()

        # Zpracuj každý soubor
        for json_file in json_files:
            city_name = json_file.stem
            self._process_city(json_file, city_name)

        # Export GTFS souborů
        self._write_gtfs_files()

        print(f"\n{'='*80}")
        print(f"✅ GTFS feed vytvořen")
        print(f"  Dopravců: {len(self.agencies)}")
        print(f"  Zastávek: {len(self.stops)}")
        print(f"  Linek: {len(self.routes)}")
        print(f"  Spojů: {len(self.trips)}")
        print(f"  Stop times: {len(self.stop_times)}")
        print(f"\n💾 Export: {self.output_dir}/")
        print(f"{'='*80}")

        return True

    def _create_agency(self):
        """Vytvoř agency.txt."""
        self.agencies.append({
            'agency_id': 'TT_DECODER',
            'agency_name': 'CHAPS TT Decoded Data',
            'agency_url': 'https://prijimackynaskolu.cz',
            'agency_timezone': 'Europe/Prague',
            'agency_lang': 'cs'
        })

    def _process_city(self, json_file: Path, city_name: str):
        """Zpracuj jeden TT JSON soubor (jedno město)."""
        with open(json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)

        stops_list = data['stops']
        trips_data = data.get('edges', {})

        print(f"🏙️  {city_name:30s} {len(stops_list):3d} zastávek, {len(trips_data):4d} hran")

        # Vytvoř zastávky pro toto město
        city_stop_ids = {}

        for idx, stop_name in enumerate(stops_list):
            stop_key = (city_name, stop_name)

            if stop_key not in self.stop_name_to_id:
                stop_id = f"TT_{self.stop_id_counter}"
                self.stop_id_counter += 1

                self.stops.append({
                    'stop_id': stop_id,
                    'stop_name': f"{city_name}, {stop_name}",
                    'stop_lat': '',  # Neznámé souřadnice
                    'stop_lon': '',
                })

                self.stop_name_to_id[stop_key] = stop_id

            city_stop_ids[idx] = self.stop_name_to_id[stop_key]

        # Vytvoř linku pro toto město (jedna generická)
        route_id = f"ROUTE_{self.route_id_counter}"
        self.route_id_counter += 1

        self.routes.append({
            'route_id': route_id,
            'agency_id': 'TT_DECODER',
            'route_short_name': city_name,
            'route_long_name': f"MHD {city_name}",
            'route_type': '3',  # Bus
        })

        # Vytvoř spoj pro každou hranu (zjednodušeno)
        # V reálném světě by to byly skutečné spoje, tady jen simulace
        for edge_key, edge_data in trips_data.items():
            from_idx, to_idx = map(int, edge_key.split('->'))

            if from_idx not in city_stop_ids or to_idx not in city_stop_ids:
                continue

            trip_id = f"TRIP_{self.trip_id_counter}"
            self.trip_id_counter += 1

            self.trips.append({
                'trip_id': trip_id,
                'route_id': route_id,
                'service_id': 'WEEKDAY',  # Zjednodušeno
            })

            # Začátek spoje v 8:00 (arbitrární)
            start_time = 8 * 60  # minuty

            # Stop times
            self.stop_times.append({
                'trip_id': trip_id,
                'stop_id': city_stop_ids[from_idx],
                'stop_sequence': 1,
                'arrival_time': self._format_time(start_time),
                'departure_time': self._format_time(start_time),
            })

            arrival_time = start_time + int(edge_data['travel_time_avg'])

            self.stop_times.append({
                'trip_id': trip_id,
                'stop_id': city_stop_ids[to_idx],
                'stop_sequence': 2,
                'arrival_time': self._format_time(arrival_time),
                'departure_time': self._format_time(arrival_time),
            })

    def _format_time(self, minutes: int) -> str:
        """Formátuj minuty na HH:MM:SS."""
        hours = minutes // 60
        mins = minutes % 60
        return f"{hours:02d}:{mins:02d}:00"

    def _write_gtfs_files(self):
        """Zapiš všechny GTFS soubory."""

        # agency.txt
        with open(self.output_dir / 'agency.txt', 'w', encoding='utf-8', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=['agency_id', 'agency_name', 'agency_url', 'agency_timezone', 'agency_lang'])
            writer.writeheader()
            writer.writerows(self.agencies)

        # stops.txt
        with open(self.output_dir / 'stops.txt', 'w', encoding='utf-8', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=['stop_id', 'stop_name', 'stop_lat', 'stop_lon'])
            writer.writeheader()
            writer.writerows(self.stops)

        # routes.txt
        with open(self.output_dir / 'routes.txt', 'w', encoding='utf-8', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=['route_id', 'agency_id', 'route_short_name', 'route_long_name', 'route_type'])
            writer.writeheader()
            writer.writerows(self.routes)

        # trips.txt
        with open(self.output_dir / 'trips.txt', 'w', encoding='utf-8', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=['trip_id', 'route_id', 'service_id'])
            writer.writeheader()
            writer.writerows(self.trips)

        # stop_times.txt
        with open(self.output_dir / 'stop_times.txt', 'w', encoding='utf-8', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=['trip_id', 'stop_id', 'stop_sequence', 'arrival_time', 'departure_time'])
            writer.writeheader()
            writer.writerows(self.stop_times)

        # calendar.txt (zjednodušeno - jen všední dny)
        today = date.today()
        start_date = today.strftime('%Y%m%d')
        end_date = today.replace(year=today.year + 1).strftime('%Y%m%d')

        with open(self.output_dir / 'calendar.txt', 'w', encoding='utf-8', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=['service_id', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'start_date', 'end_date'])
            writer.writeheader()
            writer.writerow({
                'service_id': 'WEEKDAY',
                'monday': '1',
                'tuesday': '1',
                'wednesday': '1',
                'thursday': '1',
                'friday': '1',
                'saturday': '0',
                'sunday': '0',
                'start_date': start_date,
                'end_date': end_date,
            })


def main():
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python tt_to_gtfs.py <tt_json_dir>")
        print("Example:")
        print("  python tt_to_gtfs.py data/decoded_tt_v2/")
        sys.exit(1)

    tt_json_dir = Path(sys.argv[1])
    output_dir = Path('data/gtfs_from_tt')

    if not tt_json_dir.exists():
        print(f"❌ Složka neexistuje: {tt_json_dir}")
        sys.exit(1)

    converter = TTToGTFS(tt_json_dir, output_dir)
    converter.convert()


if __name__ == '__main__':
    main()
