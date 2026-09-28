"""Ochrany nasazení: žádná síť, falešné gh/vercel zaznamenají skutečné příkazy."""

import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[1]
SHA = "a" * 40
URL = "https://stredniskoly-test.vercel.app"


class VercelDeployTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.path = Path(self.tmp.name)
        self.env = {
            **os.environ,
            "PATH": f"{self.path}:{os.environ['PATH']}",
            "TEST_DIR": str(self.path),
            "GITHUB_REPOSITORY": "tangero/stredniskoly",
            "GITHUB_EVENT_NAME": "push",
            "GITHUB_REF": "refs/heads/main",
            "GITHUB_SHA": SHA,
            "GITHUB_OUTPUT": str(self.path / "output"),
            "GITHUB_STEP_SUMMARY": str(self.path / "summary"),
            "GH_TOKEN": "test-only",
            "VERCEL_TOKEN": "test-only",
            "VERCEL_ORG_ID": "team_6pc2wHKjeUuaXwZfCS3jOhvX",
            "VERCEL_PROJECT_ID": "prj_Yh3UGtfELluIwvXazLyVxF5JIPsD",
            "DEPLOYMENT": "production",
        }
        self.executable("gh", r'''
import os, pathlib, sys
p = pathlib.Path(os.environ["TEST_DIR"]) / "gh-count"
n = int(p.read_text()) + 1 if p.exists() else 1
p.write_text(str(n))
if os.environ.get("GH_FAILURE"):
    sys.exit(1)
stale_at = int(os.environ.get("STALE_AT", "999"))
print("b" * 40 if n >= stale_at else os.environ["GITHUB_SHA"])
''')
        self.executable("vercel", r'''
import json, os, pathlib, sys
with (pathlib.Path(os.environ["TEST_DIR"]) / "calls").open("a") as f:
    f.write(json.dumps(sys.argv[1:]) + "\n")
if sys.argv[1] == os.environ.get("FAIL_COMMAND"):
    sys.exit(1)
if sys.argv[1] == "deploy":
    print("https://stredniskoly-test.vercel.app")
''')

    def executable(self, name, body):
        path = self.path / name
        path.write_text("#!/usr/bin/env python3\n" + body)
        path.chmod(0o755)

    def run_deploy(self, **env):
        result = subprocess.run(
            ["bash", str(ROOT / "scripts/vercel-deploy.sh")],
            cwd=self.path, env={**self.env, **env}, capture_output=True, text=True,
        )
        calls = self.path / "calls"
        self.calls = [json.loads(line) for line in calls.read_text().splitlines()] if calls.exists() else []
        return result

    def test_production_is_uploaded_without_domain_before_promotion(self):
        result = self.run_deploy()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual([c[0] for c in self.calls], ["pull", "build", "deploy", "inspect", "promote"])
        self.assertIn("--environment=production", self.calls[0])
        self.assertIn("--prod", self.calls[1])
        self.assertIn("--prebuilt", self.calls[2])
        self.assertIn("--archive=tgz", self.calls[2])
        self.assertIn("--prod", self.calls[2])
        self.assertIn("--skip-domain", self.calls[2])
        self.assertEqual(self.calls[4][1], URL)
        self.assertEqual((self.path / "output").read_text(), f"url={URL}\n")

    def test_preview_never_uses_production_or_promotes(self):
        result = self.run_deploy(DEPLOYMENT="preview", GITHUB_REF="refs/heads/feat/test")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual([c[0] for c in self.calls], ["pull", "build", "deploy", "inspect"])
        self.assertIn("--environment=preview", self.calls[0])
        self.assertIn("--git-branch=feat/test", self.calls[0])
        self.assertFalse(any("--prod" in c for c in self.calls))

    def test_staged_production_does_not_promote(self):
        result = self.run_deploy(DEPLOYMENT="production-staged", GITHUB_EVENT_NAME="workflow_dispatch")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("--prod", self.calls[2])
        self.assertNotIn("promote", [c[0] for c in self.calls])

    def test_untrusted_event_is_rejected_before_vercel(self):
        for event in ("pull_request", "pull_request_target", "workflow_run"):
            with self.subTest(event=event):
                result = self.run_deploy(GITHUB_EVENT_NAME=event)
                self.assertNotEqual(result.returncode, 0)
                self.assertEqual(self.calls, [])

    def test_production_from_branch_is_rejected(self):
        result = self.run_deploy(GITHUB_REF="refs/heads/feat/test")
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(self.calls, [])

    def test_missing_token_and_wrong_project_do_not_deploy(self):
        for env in ({"VERCEL_TOKEN": ""}, {"VERCEL_PROJECT_ID": "another-project"}):
            with self.subTest(env=env):
                result = self.run_deploy(**env)
                self.assertNotEqual(result.returncode, 0)
                self.assertEqual(self.calls, [])

    def test_stale_commit_before_build_is_skipped(self):
        result = self.run_deploy(STALE_AT="1")
        self.assertEqual(result.returncode, 0)
        self.assertEqual(self.calls, [])

    def test_stale_commit_after_build_does_not_upload(self):
        result = self.run_deploy(STALE_AT="2")
        self.assertEqual(result.returncode, 0)
        self.assertEqual([c[0] for c in self.calls], ["pull", "build"])

    def test_stale_commit_after_upload_does_not_promote(self):
        result = self.run_deploy(STALE_AT="3")
        self.assertEqual(result.returncode, 0)
        self.assertEqual([c[0] for c in self.calls], ["pull", "build", "deploy", "inspect"])

    def test_ref_api_failure_is_not_success(self):
        result = self.run_deploy(GH_FAILURE="1")
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(self.calls, [])

    def test_build_failure_keeps_existing_deployment(self):
        result = self.run_deploy(FAIL_COMMAND="build")
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual([c[0] for c in self.calls], ["pull", "build"])

    def test_not_ready_deployment_is_not_promoted(self):
        result = self.run_deploy(FAIL_COMMAND="inspect")
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual([c[0] for c in self.calls], ["pull", "build", "deploy", "inspect"])


if __name__ == "__main__":
    unittest.main()
