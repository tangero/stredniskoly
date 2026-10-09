import importlib.util
import tempfile
import unittest
from datetime import date
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / "scripts/build_transit_graph_v2.py"
spec = importlib.util.spec_from_file_location("build_transit_graph_v2", SCRIPT)
graf = importlib.util.module_from_spec(spec)
spec.loader.exec_module(graf)

CALENDAR = """service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date
PRAC,1,1,1,1,1,0,0,20261001,20261212
VIKEND,0,0,0,0,0,1,1,20261001,20261212
STARY,1,1,1,1,1,0,0,20260201,20260630
"""
# 12. 10. 2026 je pondělí: PRAC tento den nejede (výluka), JEN_DNES jede jen výjimkou.
CALENDAR_DATES = """service_id,date,exception_type
PRAC,20261012,2
JEN_DNES,20261012,1
PRAC,20261019,1
"""


class AktivniSluzbyTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.gtfs = Path(self.tmp.name)
        (self.gtfs / "calendar.txt").write_text(CALENDAR, encoding="utf-8")
        (self.gtfs / "calendar_dates.txt").write_text(CALENDAR_DATES, encoding="utf-8")

    def tearDown(self):
        self.tmp.cleanup()

    def test_bezne_pondeli_bere_jen_platne_obdobi(self):
        self.assertEqual(graf.active_service_ids(self.gtfs, date(2026, 10, 5)), {"PRAC"})

    def test_vyjimky_pridavaji_i_ruší(self):
        self.assertEqual(graf.active_service_ids(self.gtfs, date(2026, 10, 12)), {"JEN_DNES"})

    def test_mimo_platnost_nic_nejede(self):
        self.assertEqual(graf.active_service_ids(self.gtfs, date(2027, 1, 11)), set())

    def test_nejblizsi_pondeli(self):
        self.assertEqual(graf.next_monday(date(2026, 10, 9)), date(2026, 10, 12))
        self.assertEqual(graf.next_monday(date(2026, 10, 12)), date(2026, 10, 12))

    def test_datum_musi_byt_pondeli(self):
        with self.assertRaises(SystemExit):
            graf.parse_args(["--datum", "2026-10-13"])


if __name__ == "__main__":
    unittest.main()
