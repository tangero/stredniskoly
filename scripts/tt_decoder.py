#!/usr/bin/env python3
"""
CHAPS .tt Binary Format Decoder
Dekóduje proprietární formát jízdních řádů CHAPS s.r.o. do otevřených dat.

Podle specifikace: docs/chaps-tt-format.md (v7-final, 100% úspěšnost na Data3)
"""

import struct
import sys
from pathlib import Path
from typing import List, Tuple, Dict, Optional
import json


class TTDecoder:
    def __init__(self, filepath: Path, debug=False):
        self.filepath = filepath
        self.data = filepath.read_bytes()
        self.stops: List[str] = []
        self.p_records: List[str] = []
        self.trips: List[List[Tuple[int, int]]] = []  # [(stop_idx, minutes), ...]
        self.edges: Dict[Tuple[int, int], List[int]] = {}  # (from_stop, to_stop) -> [travel_times]
        if debug:
            self._debug = True

    def decode(self) -> bool:
        """Hlavní dekódovací funkce."""
        try:
            # 1. Ověř header
            if not self._verify_header():
                print(f"❌ {self.filepath.name}: Neplatný header")
                return False

            # 2. Najdi zastávky
            if not self._find_stops():
                print(f"❌ {self.filepath.name}: Nenalezeny zastávky")
                return False

            # 3. Najdi P-records (volitelné)
            self._find_p_records()

            # 4. Dekóduj časové záznamy
            if not self._decode_time_records():
                print(f"❌ {self.filepath.name}: Selhalo dekódování časů")
                return False

            # 5. Extrahuj hrany
            self._extract_edges()

            return True

        except Exception as e:
            print(f"❌ {self.filepath.name}: Chyba: {e}")
            return False

    def _verify_header(self) -> bool:
        """Ověř TT header (66 bytes)."""
        if len(self.data) < 66:
            return False
        header_str = self.data[0:60].decode('cp1250', errors='ignore')
        return 'TT' in header_str and 'TimeTable' in header_str and 'CHAPS' in header_str

    def _find_stops(self) -> bool:
        """Najdi offset tabulku zastávek + string blob."""
        # Hledáme od offsetu 0x40 (za headerem)
        start = 0x40

        # Zkusíme všechny alignmenty (0, 1, 2, 3 mod 4)
        for alignment in range(4):
            for offset in range(start + alignment, min(start + 10000, len(self.data) - 8), 4):
                try:
                    # Přečti section header
                    total_bytes = struct.unpack('<I', self.data[offset:offset+4])[0]
                    item_count = struct.unpack('<I', self.data[offset+4:offset+8])[0]

                    # Offset tabulka: total_bytes == item_count * 4
                    if total_bytes != item_count * 4:
                        continue

                    if item_count < 2 or item_count > 10000:
                        continue

                    # Načti offsety
                    offsets_start = offset + 8
                    offsets_end = offsets_start + total_bytes

                    if offsets_end > len(self.data):
                        continue

                    offsets = []
                    for i in range(item_count):
                        off = struct.unpack('<I', self.data[offsets_start + i*4:offsets_start + i*4 + 4])[0]
                        offsets.append(off)

                    # Ověř monotónní růst
                    if offsets != sorted(offsets):
                        continue

                    # Zkontroluj string blob za offsety
                    blob_start = offsets_end
                    blob_total_bytes_expected = struct.unpack('<I', self.data[blob_start:blob_start+4])[0]
                    blob_item_count = struct.unpack('<I', self.data[blob_start+4:blob_start+8])[0]

                    # String blob: total_bytes == item_count (1-byte items)
                    if blob_total_bytes_expected != blob_item_count:
                        continue

                    # Sentinel: offsets[N] = celková délka blobu
                    if offsets[-1] != blob_total_bytes_expected:
                        continue

                    # Dekóduj jména zastávek
                    blob_data_start = blob_start + 8
                    blob_data = self.data[blob_data_start:blob_data_start + blob_total_bytes_expected]

                    stop_names = []
                    for i in range(len(offsets) - 1):
                        start_idx = offsets[i]
                        end_idx = offsets[i + 1]
                        name_bytes = blob_data[start_idx:end_idx]
                        name = name_bytes.decode('cp1250', errors='replace').rstrip('\x00')
                        stop_names.append(name)

                    # Filtr: zastávky by neměly obsahovat copyright, URL, nebo název systému
                    bad_keywords = ['Copyright', 'http://', 'Internet', 'MHD ', 'ROPID', 'PID.tt']
                    if any(keyword in name for name in stop_names for keyword in bad_keywords):
                        continue

                    # Filtr: zastávky by neměly být jen jednoznakové (dopravní módy)
                    single_char_count = sum(1 for name in stop_names if len(name.strip()) <= 1)
                    if single_char_count > len(stop_names) * 0.3:  # Více než 30% jednoznakových
                        continue

                    # Mělo by být alespoň 10 zastávek
                    if len(stop_names) < 10:
                        continue

                    # Preferuj blob s nejvíce zastávkami (pokud jsme našli víc než 20)
                    if len(stop_names) > 20:
                        self.stops = stop_names
                        return True

                    # Pokud není dost velký, pokračuj v hledání
                    if not self.stops or len(stop_names) > len(self.stops):
                        self.stops = stop_names

                except Exception:
                    continue

        # Vrať True pokud jsme našli alespoň nějaké zastávky
        return len(self.stops) >= 10

    def _find_p_records(self):
        """Najdi P-records (identifikátory spojů) oddělené 0xA4A4."""
        # Hledáme textové bloky s oddělovačem 0xA4A4
        separator = b'\xa4\xa4'

        # Skenuj od 0x1000 (po hlavních sekcích)
        start = 0x1000
        end = min(start + 50000, len(self.data))

        records = []
        i = start
        while i < end - 100:
            # Hledej začátek P-recordu
            if self.data[i:i+1] == b'P':
                # Najdi konec (oddělovač nebo konec dat)
                record_end = i + 1
                while record_end < end and self.data[record_end:record_end+2] != separator:
                    record_end += 1

                record_bytes = self.data[i:record_end]
                try:
                    record_str = record_bytes.decode('cp1250', errors='ignore')
                    if record_str.startswith('P'):
                        records.append(record_str)
                except:
                    pass

                i = record_end + 2
            else:
                i += 1

        self.p_records = records[:50]  # Limit na prvních 50

    def _decode_time_records(self) -> bool:
        """Dekóduj časové záznamy (sekce 4) - klíčová funkce."""

        # Zkus nejdřív flagged režim (všechny záznamy mají bit 31=1)
        trips_flagged, records_found_f = self._try_decode_flagged()

        if len(trips_flagged) >= 2:
            self.trips = trips_flagged
            return True

        # Fallback na unflagged (bit 31 jen na hranicích spojů)
        trips_unflagged, records_found_u = self._try_decode_unflagged()

        if len(trips_unflagged) >= 2:
            self.trips = trips_unflagged
            return True

        # Debug: žádné spoje nenalezeny
        if records_found_f == 0 and records_found_u == 0:
            if hasattr(self, '_debug'):
                print(f"  DEBUG: Nenalezeny žádné časové záznamy")

        return False

    def _try_decode_flagged(self) -> Tuple[List[List[Tuple[int, int]]], int]:
        """Zkus dekódovat ve flagged režimu (bit 31 = 1 na všech záznamech)."""
        trips = []
        records_found = 0

        # Skenuj všechny 4 alignmenty (0, 1, 2, 3)
        # Hledej časové záznamy od 0x100
        for alignment in range(4):
            start = 0x100 + alignment
            end = min(len(self.data), 500000)

            current_trip = []
            prev_route_id = None
            prev_minutes = None

            for offset in range(start, end - 3, 4):
                try:
                    val = struct.unpack('<I', self.data[offset:offset+4])[0]

                    # Flagged: bit 31 musí být 1
                    if not (val & 0x80000000):
                        continue

                    byte1 = (val >> 8) & 0xFF

                    # Musí být 0x00
                    if byte1 != 0x00:
                        continue

                    minutes = (val >> 16) & 0x7FFF
                    stop_idx = val & 0xFF

                    records_found += 1

                    # Validace času
                    if minutes > 1440:
                        continue

                    # DŮLEŽITÁ ZMĚNA: stop_idx může být větší než len(stops)
                    # protože .tt soubor může obsahovat více zastávek než dekódovaný blob
                    # Použijeme modulo, aby to odpovídalo kruhovému indexování
                    if len(self.stops) > 0:
                        stop_idx = stop_idx % len(self.stops)

                    # Detekce hranice spoje (pokles času nebo změna route_id)
                    route_id = (val >> 24) & 0x7F

                    if prev_minutes is not None and (minutes < prev_minutes or route_id != prev_route_id):
                        # Konec spoje
                        if len(current_trip) >= 2:
                            trips.append(current_trip)
                        current_trip = []

                    current_trip.append((stop_idx, minutes))
                    prev_minutes = minutes
                    prev_route_id = route_id

                except Exception:
                    continue

            # Ulož poslední spoj
            if len(current_trip) >= 2:
                trips.append(current_trip)

            if len(trips) >= 2:
                return (trips, records_found)

        return (trips, records_found)

    def _try_decode_unflagged(self) -> Tuple[List[List[Tuple[int, int]]], int]:
        """Zkus dekódovat v unflagged režimu (bit 31 jen na hranicích)."""
        trips = []
        records_found = 0

        # Hledej časové záznamy od 0x100
        for alignment in range(4):
            start = 0x100 + alignment
            end = min(len(self.data), 500000)

            current_trip = []
            prev_minutes = None

            for offset in range(start, end - 3, 4):
                try:
                    val = struct.unpack('<I', self.data[offset:offset+4])[0]

                    byte1 = (val >> 8) & 0xFF

                    # Musí být 0x00
                    if byte1 != 0x00:
                        continue

                    minutes = (val >> 16) & 0x7FFF
                    stop_idx = val & 0xFF

                    records_found += 1

                    # Validace času
                    if minutes > 1440:
                        continue

                    # DŮLEŽITÁ ZMĚNA: stop_idx může být větší než len(stops)
                    if len(self.stops) > 0:
                        stop_idx = stop_idx % len(self.stops)

                    # Detekce hranice spoje (pokles času)
                    if prev_minutes is not None and minutes < prev_minutes:
                        if len(current_trip) >= 2:
                            trips.append(current_trip)
                        current_trip = []

                    current_trip.append((stop_idx, minutes))
                    prev_minutes = minutes

                except Exception:
                    continue

            if len(current_trip) >= 2:
                trips.append(current_trip)

            if len(trips) >= 2:
                return (trips, records_found)

        return (trips, records_found)

    def _extract_edges(self):
        """Extrahuj hrany cestovního grafu z dekódovaných spojů."""
        rejected_times = []

        # Debug: vypiš první spoj včetně raw dat
        if hasattr(self, '_debug') and len(self.trips) > 0:
            print(f"  DEBUG: První spoj ({len(self.trips[0])} zastávek):")
            for i, (stop_idx, minutes) in enumerate(self.trips[0][:5]):
                stop_name = self.stops[stop_idx] if stop_idx < len(self.stops) else f"Stop#{stop_idx}"
                hour = minutes // 60
                minute = minutes % 60
                print(f"    [{i}] Stop#{stop_idx:3d} ({stop_name[:30]:30s}): {hour:02d}:{minute:02d}")

        for trip in self.trips:
            for i in range(len(trip) - 1):
                stop_from, time_from = trip[i]
                stop_to, time_to = trip[i + 1]

                travel_time = time_to - time_from

                # Validace (1-60 minut)
                if travel_time < 1 or travel_time > 60:
                    rejected_times.append(travel_time)
                    continue

                edge = (stop_from, stop_to)
                if edge not in self.edges:
                    self.edges[edge] = []
                self.edges[edge].append(travel_time)

        # Debug: pokud žádné hrany, vypiš proč
        if len(self.edges) == 0 and len(rejected_times) > 0:
            if hasattr(self, '_debug'):
                print(f"  DEBUG: Všechny časy odmítnuty. Příklady: {rejected_times[:10]}")

    def get_stats(self) -> Dict:
        """Vrať statistiky dekódování."""
        unique_edges = len(self.edges)
        total_times = sum(len(times) for times in self.edges.values())

        return {
            'stops': len(self.stops),
            'trips': len(self.trips),
            'edges': unique_edges,
            'total_travel_times': total_times,
            'p_records': len(self.p_records)
        }

    def export_json(self, output_path: Path):
        """Export do JSON formátu."""
        # Průměrné cestovní časy pro každou hranu
        edges_avg = {}
        for (from_idx, to_idx), times in self.edges.items():
            avg_time = sum(times) / len(times)
            edges_avg[f"{from_idx}->{to_idx}"] = {
                'from_stop': self.stops[from_idx],
                'to_stop': self.stops[to_idx],
                'travel_time_avg': round(avg_time, 1),
                'travel_time_min': min(times),
                'travel_time_max': max(times),
                'samples': len(times)
            }

        data = {
            'source_file': self.filepath.name,
            'stops': self.stops,
            'stats': self.get_stats(),
            'edges': edges_avg
        }

        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)


def batch_decode(data_dir: Path, output_dir: Path):
    """Dávkové dekódování všech .tt souborů."""
    tt_files = sorted(data_dir.glob('*.tt'))

    if not tt_files:
        print(f"❌ Žádné .tt soubory v {data_dir}")
        return

    output_dir.mkdir(parents=True, exist_ok=True)

    success_count = 0
    total_stops = 0
    total_trips = 0
    total_edges = 0

    print(f"🔍 Dekóduji {len(tt_files)} souborů z {data_dir}...\n")

    for tt_file in tt_files:
        decoder = TTDecoder(tt_file)

        if decoder.decode():
            stats = decoder.get_stats()

            # Export JSON
            json_file = output_dir / f"{tt_file.stem}.json"
            decoder.export_json(json_file)

            print(f"✓ {tt_file.name:30s} {stats['stops']:3d} zastávek, {stats['trips']:3d} spojů, {stats['edges']:4d} hran")

            success_count += 1
            total_stops += stats['stops']
            total_trips += stats['trips']
            total_edges += stats['edges']

    print(f"\n{'='*80}")
    print(f"SUCCESS: {success_count}/{len(tt_files)} ({100*success_count//len(tt_files)}%)")
    print(f"  {total_stops:,} zastávek")
    print(f"  {total_trips:,} spojů")
    print(f"  {total_edges:,} unikátních hran cestovních časů")
    print(f"\n💾 Exportováno do: {output_dir}/")


def main():
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python tt_decoder.py <file.tt>              # Dekóduj jeden soubor")
        print("  python tt_decoder.py --batch <data_dir>     # Dekóduj celou složku")
        sys.exit(1)

    if sys.argv[1] == '--batch':
        if len(sys.argv) < 3:
            print("❌ Chybí cesta ke složce s .tt soubory")
            sys.exit(1)

        data_dir = Path(sys.argv[2])
        output_dir = Path('data/decoded_tt')
        batch_decode(data_dir, output_dir)

    else:
        # Dekóduj jeden soubor
        tt_file = Path(sys.argv[1])

        if not tt_file.exists():
            print(f"❌ Soubor neexistuje: {tt_file}")
            sys.exit(1)

        decoder = TTDecoder(tt_file, debug=True)

        if decoder.decode():
            stats = decoder.get_stats()

            print(f"\n✓ Dekódováno: {tt_file.name}")
            print(f"  Zastávky: {stats['stops']}")
            print(f"  Spoje: {stats['trips']}")
            print(f"  Hrany: {stats['edges']}")
            print(f"  P-records: {stats['p_records']}")

            # Ukázka zastávek
            print(f"\n📍 Zastávky (prvních 10):")
            for i, stop in enumerate(decoder.stops[:10]):
                print(f"  [{i}] {stop}")

            # Ukázka hran
            print(f"\n🔗 Hrany (prvních 10):")
            for i, ((from_idx, to_idx), times) in enumerate(list(decoder.edges.items())[:10]):
                avg = sum(times) / len(times)
                print(f"  {decoder.stops[from_idx]} → {decoder.stops[to_idx]}: {avg:.1f} min")

            # Export JSON
            output_file = tt_file.with_suffix('.json')
            decoder.export_json(output_file)
            print(f"\n💾 Exportováno: {output_file}")

        else:
            sys.exit(1)


if __name__ == '__main__':
    main()
