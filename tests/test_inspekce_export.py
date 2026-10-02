"""Export shrnutí inspekcí pro web (inspekce/scripts/export_extractions.py --pro-web, issue #259).

Spouští skript nad dočasnými soubory; žádná síť, žádná data z repozitáře.
"""
from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SKRIPT = Path(__file__).parent.parent / 'inspekce' / 'scripts' / 'export_extractions.py'


def vystup(souhrn: str | None, **navic) -> dict:
    fp = {'strengths': [{'tag': 'T', 'detail': 'D', 'evidence': 'E'}], 'risks': []}
    if souhrn is not None:
        fp['plain_czech_summary'] = souhrn
    return {'parse_error': None, 'run_finished_utc': 'x',
            'parsed_output': {'report_id': 'dup', 'for_parents': fp, 'model_self_check': {'czech_clarity_score_1_5': 5}, **navic}}


class ExportProWebTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.d = Path(self.tmp.name)

    def tearDown(self):
        self.tmp.cleanup()

    def zapis(self, cesta: str, data) -> None:
        p = self.d / cesta
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(json.dumps(data, ensure_ascii=False), encoding='utf-8')

    def test_poradi_nahrada_necitelne_a_orez(self):
        zpravy = [
            # A: haiku i space-bunny, vyhrává haiku (stávající shrnutí mají přednost)
            {'report_id': 'GY4_1_2026-01-10', 'redizo': '1', 'inspection_from': '2026-01-10', 'inspection_to': '2026-01-12'},
            # B: haiku bez shrnutí -> použije se space-bunny
            {'report_id': 'SOS_2_2025-05-13', 'redizo': '2', 'inspection_from': '2025-05-13', 'inspection_to': '2025-05-15'},
            # C: sken bez textu (50 slov) -> na web nesmí, i když výstup má
            {'report_id': 'SOS_3_2026-01-12', 'redizo': '3', 'inspection_from': '2026-01-12', 'inspection_to': '2026-01-14'},
        ]
        self.zapis('manifest.json', {'reports': zpravy})
        self.zapis('texts/index.json', {'reports': [
            {'report_id': 'GY4_1_2026-01-10', 'word_count': 5000},
            {'report_id': 'SOS_2_2025-05-13', 'word_count': 4000},
            {'report_id': 'SOS_3_2026-01-12', 'word_count': 50},
        ]})
        self.zapis('out/claude_haiku_4_5/GY4_1_2026-01-10.json', vystup('Shrnutí haiku.'))
        self.zapis('out/stealth_space_bunny_alpha/GY4_1_2026-01-10.json', vystup('Shrnutí bunny.'))
        self.zapis('out/claude_haiku_4_5/SOS_2_2025-05-13.json', vystup(None))
        self.zapis('out/stealth_space_bunny_alpha/SOS_2_2025-05-13.json', vystup('Shrnutí bunny B.'))
        self.zapis('out/stealth_space_bunny_alpha/SOS_3_2026-01-12.json', vystup('Text zprávy nelze přečíst.'))
        cil = self.d / 'web.json'
        subprocess.run([sys.executable, str(SKRIPT), '--pro-web', '--manifest', str(self.d / 'manifest.json'),
                        '--outputs-dir', str(self.d / 'out'), '--texts-dir', str(self.d / 'texts'), '--output', str(cil)],
                       check=True, capture_output=True)
        data = json.loads(cil.read_text(encoding='utf-8'))
        self.assertEqual(set(data), {'schools'})
        skoly = data['schools']
        self.assertEqual(set(skoly), {'1', '2'})
        self.assertEqual(skoly['1'][0]['model_id'], 'claude_haiku_4_5')
        self.assertEqual(skoly['2'][0]['model_id'], 'stealth_space_bunny_alpha')
        zaznam = skoly['1'][0]
        self.assertNotIn('run_finished_utc', zaznam)
        self.assertNotIn('model_self_check', zaznam['parsed_output'])
        self.assertNotIn('report_id', zaznam['parsed_output'])
        self.assertNotIn('\n', cil.read_text(encoding='utf-8'))


if __name__ == '__main__':
    unittest.main()
