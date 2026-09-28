#!/usr/bin/env python3
"""Kontrola pracovních pravidel PDF proti konkrétní nabídce CERMAT/DiPSy."""

import csv
import hashlib
import json
import re
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "src/data/kriteria-prijeti-2026-pilot.json"
CATALOG = ROOT / "public/applications_2026.json"
PILOT = ROOT / "data/dipsy-kriteria-pilot"
UUID = re.compile(r"^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$")
SHA256 = re.compile(r"^[0-9a-f]{64}$")


def validate(records, catalog):
    errors = []
    offerings = {}
    for offer in catalog["data"]:
        offerings.setdefault(offer["source_id"], []).append(offer)
    seen = set()
    for position, record in enumerate(records, 1):
        label = f"záznam {position} ({record.get('source_id', '?')})"
        source_id = record.get("source_id")
        key = (record.get("rok"), record.get("kolo"), source_id)
        if key in seen:
            errors.append(f"{label}: opakovaná nabídka v témže roce a kole")
        seen.add(key)
        if not isinstance(source_id, str) or not UUID.fullmatch(source_id):
            errors.append(f"{label}: neplatné source_id")
        matches = offerings.get(source_id, [])
        if len(matches) != 1:
            errors.append(f"{label}: source_id nemá právě jednu nabídku v katalogu")
        else:
            offer = matches[0]
            for field in ("redizo", "kkov", "zamereni"):
                if record.get(field) != (offer.get(field) or ""):
                    errors.append(f"{label}: {field} nesouhlasí s nabídkou")
        if record.get("rok") != catalog["meta"]["rok"] or record.get("kolo") != catalog["meta"]["kolo"]:
            errors.append(f"{label}: rok nebo kolo nesouhlasí s katalogem")
        if record.get("stav") != "navrh":
            errors.append(f"{label}: pilot smí obsahovat jen neschválené návrhy")
        source = record.get("zdroj", {})
        if source.get("typ") != "dipsy_pdf" or source.get("url") != f"https://api.dipsy.gov.cz/v1/skol-oboro-forma/{source_id}":
            errors.append(f"{label}: zdroj neukazuje na stálou kartu DiPSy")
        if not isinstance(source.get("file_id"), str) or not UUID.fullmatch(source["file_id"]):
            errors.append(f"{label}: neplatné file_id")
        if not isinstance(source.get("sha256"), str) or not SHA256.fullmatch(source["sha256"]):
            errors.append(f"{label}: neplatný otisk PDF")
        for field in ("ziskano_at", "publikovano_at"):
            value = source.get(field)
            if value is not None:
                try:
                    parsed = datetime.fromisoformat(value)
                    if parsed.tzinfo is None:
                        raise ValueError("Chybí časové pásmo")
                except (TypeError, ValueError):
                    errors.append(f"{label}: {field} musí být ISO čas s pásmem, nebo null")
        scoring = record.get("bodovani", {})
        if scoring.get("rezim") not in ("pouze_jpz", "jine"):
            errors.append(f"{label}: neplatný režim bodování")
        if scoring.get("uplnost") not in ("uplny_vzorec", "castecny_vzorec", "jen_popis"):
            errors.append(f"{label}: neplatná úplnost vzorce")
        if scoring.get("rezim") == "pouze_jpz" and scoring.get("dalsi_slozky"):
            errors.append(f"{label}: pouze JPZ nesmí přidávat bodované složky")
        if scoring.get("uplnost") == "jen_popis" and scoring.get("vzorec") is not None:
            errors.append(f"{label}: neúplné podklady nesmějí nabízet výpočet")
        if not record.get("doklad_strany") or not all(isinstance(page, int) and page > 0 for page in record["doklad_strany"]):
            errors.append(f"{label}: chybí strany dokladu")
    return errors


def main():
    dataset = json.loads(DATA.read_text(encoding="utf-8"))
    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    if dataset.get("verze") != 1:
        raise SystemExit("Neznámá verze datového formátu")
    errors = validate(dataset["zaznamy"], catalog)
    pilot_csv = PILOT / "hodnoceni.csv"
    if pilot_csv.exists():
        with pilot_csv.open(encoding="utf-8", newline="") as stream:
            pilot = {row["source_id"]: row for row in csv.DictReader(stream, delimiter=";")}
        for record in dataset["zaznamy"]:
            source_id = record["source_id"]
            source = record["zdroj"]
            old = pilot.get(source_id)
            if not old or old["sha256"] != source["sha256"] or old["file_id"] != source["file_id"]:
                errors.append(f"{source_id}: PDF nebo file_id nesouhlasí s lokálním pilotem")
                continue
            pdf = PILOT / "pdf" / f"{source['sha256']}.pdf"
            if not pdf.exists() or hashlib.sha256(pdf.read_bytes()).hexdigest() != source["sha256"]:
                errors.append(f"{source_id}: místní soubor PDF chybí nebo má jiný obsah")
    if errors:
        raise SystemExit("\n".join(errors))
    print(f"Ověřena vazba {len(dataset['zaznamy'])} návrhů na nabídky {catalog['meta']['rok']}, kolo {catalog['meta']['kolo']}.")


if __name__ == "__main__":
    main()
