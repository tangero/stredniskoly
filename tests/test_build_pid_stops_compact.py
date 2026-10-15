"""Zastávky PID s linkami pro výběr zastávky v Praze (#426)."""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

from build_pid_stops_compact import kompakt  # noqa: E402


class PidStopsCompactTest(unittest.TestCase):
    def test_skupiny_s_linkami_a_polohou_a_razeni_linek(self):
        vstup = {"generatedAt": "2026-10-09T03:54:09", "dataFormatVersion": "3", "stopGroups": [
            {"name": "Náměstí", "municipality": "Město", "districtCode": "AB", "avgLat": 50.0, "avgLon": 14.0,
             "stops": [{"lines": [{"name": "22"}, {"name": "B"}]}, {"lines": [{"name": "9"}, {"name": "22"}]}]},
            {"name": "Bez linek", "avgLat": 50.1, "avgLon": 14.1, "stops": [{"lines": []}]},
            {"name": "Bez polohy", "avgLat": None, "avgLon": None, "stops": [{"lines": [{"name": "1"}]}]},
        ]}
        vystup = kompakt(vstup)
        self.assertEqual(vystup["generatedAt"], "2026-10-09T03:54:09")
        self.assertEqual([s["name"] for s in vystup["stops"]], ["Náměstí"])
        self.assertEqual(vystup["stops"][0]["lines"], ["9", "22", "B"])
        self.assertEqual(vystup["stops"][0]["districtCode"], "AB")


if __name__ == "__main__":
    unittest.main()
