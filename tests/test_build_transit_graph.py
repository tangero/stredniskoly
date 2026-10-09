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

    def test_datum_musi_byt_skolni_den(self):
        for neskolni in ("2026-10-26", "2026-12-21", "2027-02-15", "2027-03-29", "2027-07-05"):
            with self.subTest(neskolni), self.assertRaises(SystemExit):
                graf.parse_args(["--datum", neskolni])
        self.assertEqual(graf.parse_args(["--datum", "2026-12-14"]).datum, date(2026, 12, 14))

    def test_bez_data_nejblizsi_skolni_pondeli(self):
        self.assertEqual(graf.parse_args(["--od", "2026-12-19"]).datum, date(2027, 1, 4))
        self.assertEqual(graf.parse_args(["--od", "2027-02-02"]).datum, date(2027, 3, 22))
        self.assertEqual(graf.parse_args(["--od", "2026-12-13"]).datum, date(2026, 12, 14))

    def test_velikonocni_pondeli(self):
        self.assertEqual(graf.easter_sunday(2027), date(2027, 3, 28))
        self.assertEqual(graf.school_day_problem(date(2026, 4, 6)), "public holiday")


def graf_se_stanicemi(stanice: dict[str, tuple[float, float]]) -> dict:
    return {"metadata": {}, "stops": {s: [s, lat, lon] for s, (lat, lon) in stanice.items()},
            "edges": {s: [] for s in stanice}, "headways": {}}


class PokrytiTest(unittest.TestCase):
    # Smyšlené stanice ve dvou čtvercích mapy, po 40.
    REFERENCE = graf_se_stanicemi({**{f"P{i}": (50.1, 14.4) for i in range(40)}, **{f"B{i}": (49.2, 16.6) for i in range(40)}})

    def test_uplny_graf_projde(self):
        self.assertEqual(graf.coverage_problems(self.REFERENCE, self.REFERENCE), [])

    def test_chybejici_oblast_neprojde(self):
        bez_oblasti = graf_se_stanicemi({f"B{i}": (49.2, 16.6) for i in range(40)})
        problemy = graf.coverage_problems(bez_oblasti, self.REFERENCE)
        self.assertEqual(len(problemy), 2, problemy)  # celkový počet i čtverec bez stanic
        self.assertIn("50.00-50.25 N, 14.0-14.5 E", problemy[1])

    def test_ubyle_spoje_neprojdou(self):
        reference = {**self.REFERENCE, "metadata": {"trips_in_window": 1000},
                     "headways": {str(i): 10.0 for i in range(60)}}
        uplny = {**reference, "metadata": {"trips_in_window": 990}}
        self.assertEqual(graf.coverage_problems(uplny, reference), [])
        malo_spoju = {**reference, "metadata": {"trips_in_window": 500}}
        self.assertIn("trips in the 6:30-9:00 window", graf.coverage_problems(malo_spoju, reference)[0])
        # Starší graf bez počtu spojů: pevná spodní hranice a intervaly (jeden spoj na linku = 60 min).
        reference_bez_poctu = {**reference, "metadata": {}}
        ridke = {**reference, "metadata": {"trips_in_window": 60}, "headways": {str(i): 60.0 for i in range(60)}}
        problemy = graf.coverage_problems(ridke, reference_bez_poctu)
        self.assertIn("expected at least 21000", problemy[0])
        self.assertIn("headway doubled on 60 of 60", problemy[1])
        self.assertEqual(graf.coverage_problems({**reference, "metadata": {"trips_in_window": 25000}}, reference_bez_poctu), [])

    def test_mala_oblast_se_nehodnoti(self):
        reference = graf_se_stanicemi({**{f"B{i}": (49.2, 16.6) for i in range(200)}, "X": (50.1, 14.4)})
        novy = graf_se_stanicemi({f"B{i}": (49.2, 16.6) for i in range(200)})
        self.assertEqual(graf.coverage_problems(novy, reference), [])


class PolohaTest(unittest.TestCase):
    def test_bezne_stanice_projdou(self):
        stanice = {f"S{i}": (49.2, 16.6) for i in range(98)}
        self.assertEqual(graf.location_problems(graf_se_stanicemi({**stanice, "Z1": (0.0, 0.0), "D": (51.15, 15.0)})), [])

    def test_prilis_stanic_bez_souradnic_neprojde(self):
        stanice = {**{f"S{i}": (49.2, 16.6) for i in range(90)}, **{f"Z{i}": (0.0, 0.0) for i in range(10)}}
        self.assertIn("10 of 100 stations without coordinates", graf.location_problems(graf_se_stanicemi(stanice))[0])

    def test_stanice_daleko_od_ceska_neprojde(self):
        stanice = {**{f"S{i}": (49.2, 16.6) for i in range(50)}, "H": (60.17, 24.94)}
        self.assertIn("1 stations far from Czechia", graf.location_problems(graf_se_stanicemi(stanice))[0])


if __name__ == "__main__":
    unittest.main()
