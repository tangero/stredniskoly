"""Obnova PID nesmí přepsat interval stejně označené linky mimo PID."""
import contextlib
import io
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import obnova_pid_v_grafu as obnova


class TestObnovaPid(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.pid = self.root / "PID"
        self.pid.mkdir()
        self.graf = self.root / "graf.json"
        self.kompakt = self.root / "kompakt.json"
        self.graf.write_text(json.dumps({
            "metadata": {},
            "stops": {"PID_ASW:1": ["Alfa", 50.1, 14.4], "PID_ASW:2": ["Beta", 50.2, 14.5],
                      "PLZEN:1": ["Gama", 49.7, 13.4], "PLZEN:2": ["Delta", 49.8, 13.5]},
            "edges": {"PID_ASW:1": [["PID_ASW:2", 1, ["26", "123456"]]],
                      "PLZEN:1": [["PLZEN:2", 1, ["26"]]]},
            "headways": {"26": 39.5, "123456": 60},
        }))
        self.zapis_feed()
        self.pid.joinpath("stops.json").write_text(json.dumps({
            "generatedAt": "2026-10-09T03:00:00", "dataFormatVersion": "3",
            "stopGroups": [{"node": i, "name": jmeno, "avgLat": lat, "avgLon": lon,
                            "stops": [{"lines": [{"name": "26"}]}]}
                           for i, jmeno, lat, lon in [(1, "Alfa", 50.1, 14.4), (2, "Beta", 50.2, 14.5)]],
        }))

    def zapis_feed(self, druhy="07:08:00"):
        soubory = {
            "feed_info.txt": "feed_start_date,feed_end_date\n20261009,20261022\n",
            "calendar.txt": "service_id,monday,start_date,end_date\nVSE,1,20261009,20261022\n",
            "calendar_dates.txt": "service_id,date,exception_type\n",
            "routes.txt": "route_id,route_short_name\nR,26\n",
            "trips.txt": "route_id,service_id,trip_id\nR,VSE,T1\nR,VSE,T2\n",
            "stops.txt": "stop_id,asw_node_id,stop_lat,stop_lon\nA,1,50.1,14.4\nB,2,50.2,14.5\n",
            "stop_times.txt": "trip_id,stop_id,arrival_time,departure_time\n"
                              "T1,A,07:00:00,07:00:00\nT1,B,07:01:00,07:01:00\n"
                              f"T2,A,{druhy},{druhy}\nT2,B,{druhy},{druhy}\n",
        }
        for name, obsah in soubory.items():
            self.pid.joinpath(name).write_text(obsah)

    def obnov(self):
        with patch.multiple(obnova, PID=self.pid, GRAF=self.graf, KOMPAKT=self.kompakt), contextlib.redirect_stdout(io.StringIO()):
            obnova.main()
        return json.loads(self.graf.read_text())

    def test_interval_pid_je_oddelen_od_stejne_linky_mimo_pid(self):
        graf = self.obnov()
        self.assertEqual(graf["edges"]["PLZEN:1"], [["PLZEN:2", 1, ["26"]]])
        self.assertEqual(graf["headways"]["26"], 39.5)
        self.assertEqual(graf["edges"]["PID_ASW:1"][0][2], ["123456", "PID:26"])
        self.assertEqual(graf["headways"]["PID:26"], 8)
        self.assertEqual(graf["route_names"]["PID:26"], "26")
        self.assertEqual(graf["headways"]["123456"], 60)

    def test_dalsi_obnova_nahradi_pid_bez_hromadeni_predpon(self):
        self.obnov()
        self.zapis_feed(druhy="07:16:00")
        graf = self.obnov()
        self.assertEqual(graf["edges"]["PID_ASW:1"][0][2], ["123456", "PID:26"])
        self.assertEqual(graf["headways"], {"123456": 60, "26": 39.5, "PID:26": 16})
        self.assertEqual(graf["route_names"], {"PID:26": "26"})


if __name__ == "__main__":
    unittest.main()
