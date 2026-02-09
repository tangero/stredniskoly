#!/usr/bin/env python3
import argparse
import json
import pathlib
from urllib import request


def load_reports(manifest_path: pathlib.Path):
    with manifest_path.open("r", encoding="utf-8") as handle:
        return json.load(handle)["reports"]


def download_file(url: str, destination: pathlib.Path):
    destination.parent.mkdir(parents=True, exist_ok=True)
    with request.urlopen(url, timeout=180) as response:
        data = response.read()
    destination.write_bytes(data)
    return len(data)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", default="config/pilot_10_reports.json")
    parser.add_argument("--reports-dir", default="data/reports")
    parser.add_argument("--overwrite", action="store_true")
    args = parser.parse_args()

    root = pathlib.Path(__file__).resolve().parents[1]
    manifest_path = root / args.manifest
    reports_dir = root / args.reports_dir

    reports = load_reports(manifest_path)
    downloaded = 0
    skipped = 0
    total_bytes = 0

    for report in reports:
        destination = reports_dir / report["pdf_file"]
        if destination.exists() and not args.overwrite:
            skipped += 1
            continue
        size = download_file(report["source_url"], destination)
        downloaded += 1
        total_bytes += size
        print(f"Staženo: {destination.name} ({size} B)")

    print(
        json.dumps(
            {
                "reports_total": len(reports),
                "downloaded": downloaded,
                "skipped_existing": skipped,
                "downloaded_bytes": total_bytes
            },
            ensure_ascii=False
        )
    )


if __name__ == "__main__":
    main()
