#!/usr/bin/env python3
import argparse
import json
import pathlib
import shutil
import subprocess


def load_reports(manifest_path: pathlib.Path):
    with manifest_path.open("r", encoding="utf-8") as handle:
        return json.load(handle)["reports"]


def ensure_pdftotext():
    if shutil.which("pdftotext") is None:
        raise RuntimeError("Chybí binárka pdftotext v PATH.")


def extract_text(pdf_path: pathlib.Path, text_path: pathlib.Path) -> bool:
    """Returns True on success, False on pdftotext failure."""
    text_path.parent.mkdir(parents=True, exist_ok=True)
    result = subprocess.run(
        ["pdftotext", "-layout", str(pdf_path), str(text_path)],
        capture_output=True,
    )
    if result.returncode != 0:
        return False
    return True


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", default="config/pilot_10_reports.json")
    parser.add_argument("--reports-dir", default="data/reports")
    parser.add_argument("--texts-dir", default="data/texts")
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()

    root = pathlib.Path(__file__).resolve().parents[1]
    manifest_path = root / args.manifest
    reports_dir = root / args.reports_dir
    texts_dir = root / args.texts_dir
    ensure_pdftotext()

    reports = load_reports(manifest_path)
    index_rows = []
    converted = 0
    skipped = 0
    errors = 0

    for report in reports:
        pdf_path = reports_dir / report["pdf_file"]
        text_path = texts_dir / report["text_file"]
        if not pdf_path.exists():
            raise FileNotFoundError(f"Chybí PDF: {pdf_path}")
        if text_path.exists() and not args.force:
            skipped += 1
        else:
            ok = extract_text(pdf_path, text_path)
            if not ok:
                errors += 1
                print(f"CHYBA pdftotext: {pdf_path.name} - přeskakuji")
                continue
            converted += 1
        text = text_path.read_text(encoding="utf-8", errors="ignore")
        words = len(text.split())
        index_rows.append(
            {
                "report_id": report["report_id"],
                "pdf_file": report["pdf_file"],
                "text_file": report["text_file"],
                "word_count": words
            }
        )
        print(f"Text: {text_path.name} ({words} slov)")

    index_path = texts_dir / "index.json"
    index_path.write_text(
        json.dumps({"reports": index_rows}, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )
    print(
        json.dumps(
            {"converted": converted, "skipped_existing": skipped, "errors": errors, "index": str(index_path)},
            ensure_ascii=False
        )
    )


if __name__ == "__main__":
    main()
