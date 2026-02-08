#!/usr/bin/env python3
"""
CHAPS .tt Binary Format Decoder v2
Vylepšená verze s automatickým hledáním správné sekce časových záznamů.
"""

import struct
import sys
from pathlib import Path
from typing import List, Tuple, Dict, Optional
import json


class TTDecoderV2:
    def __init__(self, filepath: Path, debug=False):
        self.filepath = filepath
        self.data = filepath.read_bytes()
        self.stops: List[str] = []
        self.p_records: List[str] = []
        self.trips: List[List[Tuple[int, int]]] = []
        self.edges: Dict[Tuple[int, int], List[int]] = {}
        if debug:
            self._debug = True

    def decode(self) -> bool:
        """Hlavní dekódovací funkce."""
        try:
            if not self._verify_header():
                return False

            if not self._find_stops():
                return False

            self._find_p_records()

            if not self._decode_time_records_smart():
                return False

            self._extract_edges()

            return True

        except Exception as e:
            if hasattr(self, '_debug'):
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
        for alignment in range(4):
            for offset in range(0x40 + alignment, min(0x40 + 10000, len(self.data) - 8), 4):
                try:
                    total_bytes = struct.unpack('<I', self.data[offset:offset+4])[0]
                    item_count = struct.unpack('<I', self.data[offset+4:offset+8])[0]

                    if total_bytes != item_count * 4:
                        continue

                    if item_count < 2 or item_count > 10000:
                        continue

                    offsets_start = offset + 8
                    offsets_end = offsets_start + total_bytes

                    if offsets_end > len(self.data):
                        continue

                    offsets = []
                    for i in range(item_count):
                        off = struct.unpack('<I', self.data[offsets_start + i*4:offsets_start + i*4 + 4])[0]
                        offsets.append(off)

                    if offsets != sorted(offsets):
                        continue

                    blob_start = offsets_end
                    blob_total_bytes_expected = struct.unpack('<I', self.data[blob_start:blob_start+4])[0]
                    blob_item_count = struct.unpack('<I', self.data[blob_start+4:blob_start+8])[0]

                    if blob_total_bytes_expected != blob_item_count:
                        continue

                    if offsets[-1] != blob_total_bytes_expected:
                        continue

                    blob_data_start = blob_start + 8
                    blob_data = self.data[blob_data_start:blob_data_start + blob_total_bytes_expected]

                    stop_names = []
                    for i in range(len(offsets) - 1):
                        start_idx = offsets[i]
                        end_idx = offsets[i + 1]
                        name_bytes = blob_data[start_idx:end_idx]
                        name = name_bytes.decode('cp1250', errors='replace').rstrip('\x00')
                        stop_names.append(name)

                    # Filtr
                    bad_keywords = ['Copyright', 'http://', 'Internet', 'MHD ', 'ROPID', 'PID.tt']
                    if any(keyword in name for name in stop_names for keyword in bad_keywords):
                        continue

                    single_char_count = sum(1 for name in stop_names if len(name.strip()) <= 1)
                    if single_char_count > len(stop_names) * 0.3:
                        continue

                    if len(stop_names) < 10:
                        continue

                    if len(stop_names) > 20:
                        self.stops = stop_names
                        return True

                    if not self.stops or len(stop_names) > len(self.stops):
                        self.stops = stop_names

                except Exception:
                    continue

        return len(self.stops) >= 10

    def _find_p_records(self):
        """Najdi P-records."""
        separator = b'\xa4\xa4'
        start = 0x1000
        end = min(start + 50000, len(self.data))

        records = []
        i = start
        while i < end - 100:
            if self.data[i:i+1] == b'P':
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

        self.p_records = records[:50]

    def _find_best_time_section(self) -> Optional[int]:
        """
        Najdi nejlepší sekci časových záznamů.
        Vrací offset s nejlepším skóre (počet validních záznamů × různé časy × různé zastávky).
        """
        sections_found = []

        # Skenuj každých 1 KB
        for start in range(0x100, min(len(self.data), 200000), 0x400):
            for alignment in range(4):
                offset = start + alignment

                valid_count = 0
                unique_times = set()
                unique_stops = set()

                # Zkus prvních 30 záznamů
                for i in range(30):
                    pos = offset + i * 4
                    if pos + 3 >= len(self.data):
                        break

                    try:
                        val = struct.unpack('<I', self.data[pos:pos+4])[0]
                        byte1 = (val >> 8) & 0xFF
                        minutes = (val >> 16) & 0x7FFF
                        stop_idx = val & 0xFF

                        if byte1 == 0x00 and minutes <= 1440:
                            valid_count += 1
                            unique_times.add(minutes)
                            unique_stops.add(stop_idx)
                    except:
                        break

                # Musí mít různé časy I různé zastávky
                if valid_count >= 10 and len(unique_times) > 5 and len(unique_stops) > 3:
                    score = valid_count * len(unique_times) * len(unique_stops)
                    sections_found.append({
                        'offset': offset,
                        'score': score,
                        'valid': valid_count,
                        'times': len(unique_times),
                        'stops': len(unique_stops)
                    })

        if not sections_found:
            return None

        # Seřaď podle skóre
        sections_found.sort(key=lambda x: x['score'], reverse=True)

        best = sections_found[0]

        if hasattr(self, '_debug'):
            print(f"  DEBUG: Nalezeno {len(sections_found)} sekcí, nejlepší:")
            print(f"    Offset: 0x{best['offset']:06X}")
            print(f"    Score: {best['score']} ({best['valid']} valid, {best['times']} times, {best['stops']} stops)")

        return best['offset']

    def _decode_time_records_smart(self) -> bool:
        """Dekóduj časové záznamy - inteligentní verze."""

        # Najdi nejlepší sekci
        best_offset = self._find_best_time_section()

        if best_offset is None:
            if hasattr(self, '_debug'):
                print(f"  DEBUG: Nenalezena žádná dobrá sekce časových záznamů")
            return False

        # Dekóduj z nejlepší sekce
        trips = self._decode_from_offset(best_offset)

        if len(trips) >= 2:
            self.trips = trips
            return True

        return False

    def _decode_from_offset(self, start_offset: int) -> List[List[Tuple[int, int]]]:
        """Dekóduj časové záznamy od daného offsetu."""
        trips = []
        current_trip = []
        prev_minutes = None

        end = min(start_offset + 50000, len(self.data))

        for offset in range(start_offset, end - 3, 4):
            try:
                val = struct.unpack('<I', self.data[offset:offset+4])[0]

                byte1 = (val >> 8) & 0xFF

                if byte1 != 0x00:
                    continue

                minutes = (val >> 16) & 0x7FFF
                stop_idx = val & 0xFF

                if minutes > 1440:
                    continue

                # Použij modulo pro stop_idx
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

        return trips

    def _extract_edges(self):
        """Extrahuj hrany cestovního grafu."""
        for trip in self.trips:
            for i in range(len(trip) - 1):
                stop_from, time_from = trip[i]
                stop_to, time_to = trip[i + 1]

                travel_time = time_to - time_from

                if travel_time < 1 or travel_time > 60:
                    continue

                edge = (stop_from, stop_to)
                if edge not in self.edges:
                    self.edges[edge] = []
                self.edges[edge].append(travel_time)

    def get_stats(self) -> Dict:
        """Vrať statistiky."""
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
        """Export do JSON."""
        edges_avg = {}
        for (from_idx, to_idx), times in self.edges.items():
            avg_time = sum(times) / len(times)
            edges_avg[f"{from_idx}->{to_idx}"] = {
                'from_stop': self.stops[from_idx] if from_idx < len(self.stops) else f"Stop#{from_idx}",
                'to_stop': self.stops[to_idx] if to_idx < len(self.stops) else f"Stop#{to_idx}",
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
    """Dávkové dekódování."""
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
        decoder = TTDecoderV2(tt_file)

        if decoder.decode():
            stats = decoder.get_stats()

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
        print("  python tt_decoder_v2.py <file.tt>              # Dekóduj jeden soubor")
        print("  python tt_decoder_v2.py --batch <data_dir>     # Dekóduj celou složku")
        sys.exit(1)

    if sys.argv[1] == '--batch':
        if len(sys.argv) < 3:
            print("❌ Chybí cesta ke složce")
            sys.exit(1)

        data_dir = Path(sys.argv[2])
        output_dir = Path('data/decoded_tt_v2')
        batch_decode(data_dir, output_dir)

    else:
        tt_file = Path(sys.argv[1])

        if not tt_file.exists():
            print(f"❌ Soubor neexistuje: {tt_file}")
            sys.exit(1)

        decoder = TTDecoderV2(tt_file, debug=True)

        if decoder.decode():
            stats = decoder.get_stats()

            print(f"\n✓ Dekódováno: {tt_file.name}")
            print(f"  Zastávky: {stats['stops']}")
            print(f"  Spoje: {stats['trips']}")
            print(f"  Hrany: {stats['edges']}")

            output_file = tt_file.with_suffix('.json')
            decoder.export_json(output_file)
            print(f"\n💾 Exportováno: {output_file}")
        else:
            sys.exit(1)


if __name__ == '__main__':
    main()
