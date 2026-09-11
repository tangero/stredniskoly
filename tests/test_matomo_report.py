"""Kontroly přístupových hranic a významu období pro rutinní čtení Matomo."""
import importlib.util
import io
import json
import os
import tempfile
import unittest
from datetime import date
from pathlib import Path
from unittest.mock import patch
from urllib.parse import parse_qs, urlsplit

SPEC = importlib.util.spec_from_file_location('matomo_report', Path(__file__).parents[1] / 'scripts/matomo-report.py')
module = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(module)


class MatomoReportTest(unittest.TestCase):
    def test_months_preserve_partial_boundaries_and_leap_day(self) -> None:
        self.assertEqual(module.month_ranges(date(2024, 2, 11), date(2024, 3, 4)),
                         [(date(2024, 2, 11), date(2024, 2, 29)), (date(2024, 3, 1), date(2024, 3, 4))])

    def test_write_methods_and_reserved_parameters_never_reach_network(self) -> None:
        with patch.object(module, 'build_opener') as network:
            for method, params in [('UsersManager.addUser', {}), ('VisitsSummary.get', {'token_auth': 'wrong'}),
                                   ('VisitsSummary.get', {'idSite': 8}), ('VisitsSummary.get', {'url': 'https://elsewhere.invalid'})]:
                with self.assertRaises(module.ReportError):
                    module.api(method, params)
            network.assert_not_called()

    def test_token_is_post_body_only_and_not_saved_in_metadata(self) -> None:
        with patch.object(module, 'read_token', return_value='test-only-secret'), patch.object(module, 'build_opener') as opener:
            opener.return_value.open.return_value = io.BytesIO(b'{"nb_visits":12}')
            result = module.api('VisitsSummary.get', {'period': 'range', 'date': '2026-09-01,2026-09-10'})
            request = opener.return_value.open.call_args.args[0]
            self.assertEqual(request.method, 'POST')
            self.assertEqual(urlsplit(request.full_url).hostname, 'ma.hlidacstatu.cz')
            self.assertNotIn('test-only-secret', request.full_url)
            self.assertEqual(parse_qs(request.data.decode())['token_auth'], ['test-only-secret'])
            self.assertNotIn('test-only-secret', json.dumps(result))
            self.assertNotIn('token_auth', result['params'])

    def test_server_error_does_not_echo_secret(self) -> None:
        with patch.object(module, 'read_token', return_value='test-only-secret'), patch.object(module, 'build_opener') as opener:
            opener.return_value.open.return_value = io.BytesIO(b'{"result":"error","message":"test-only-secret"}')
            with self.assertRaises(module.ReportError) as raised:
                module.api('VisitsSummary.get')
            self.assertNotIn('test-only-secret', str(raised.exception))

    def test_redirect_never_forwards_authenticated_request(self) -> None:
        self.assertIsNone(module.NoRedirect().redirect_request(None, None, 307, '', {}, 'https://elsewhere.invalid'))

    def test_storage_mode_and_symlink_rejection(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            path = Path(temporary) / 'report.json'
            module.save_private(path, '{}')
            self.assertEqual(path.stat().st_mode & 0o777, 0o600)
            link = Path(temporary) / 'linked'
            link.symlink_to(path)
            with self.assertRaises(module.ReportError):
                module.save_private(link, 'overwritten')
            self.assertEqual(path.read_text(), '{}')

    def test_world_readable_token_is_rejected(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            path = Path(temporary) / 'token'
            path.write_text('test-only-secret')
            path.chmod(0o644)
            with patch.object(module, 'TOKEN_PATH', path), patch.dict(os.environ, {}, clear=True):
                with self.assertRaises(module.ReportError):
                    module.read_token()

    def test_singleton_shapes_and_invalid_tables(self) -> None:
        self.assertEqual(module.one([{'nb_visits': 12}]), module.one({'nb_visits': 12}))
        with self.assertRaises(module.ReportError):
            module.one([{'nb_visits': 12}, {'nb_visits': 14}])


if __name__ == '__main__':
    unittest.main()
