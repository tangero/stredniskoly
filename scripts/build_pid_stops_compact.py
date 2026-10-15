#!/usr/bin/env python3
"""Zastávky PID s linkami pro výběr zastávky v Praze (`public/pid_stops_compact.json`, #426).

Vstup (gitignorovaný, stáhnout ručně podle docs/zdroje-dat.md, oddíl 2.9):
  data/PID/stops.json  https://data.pid.cz/stops/json/stops.json

Výstup: public/pid_stops_compact.json, který čte `src/app/api/praha-dostupnost/route.ts`. Ponechá jen skupiny
zastávek se souřadnicemi a aspoň jednou linkou; z `stops.json` bere název, obec, kód okresu, průměrnou polohu
a seznam linek. Na grafu spojení (`data/transit_graph.json`) nezávisí.

Použití: python3 scripts/build_pid_stops_compact.py
"""

import json
from pathlib import Path

KOREN = Path(__file__).resolve().parent.parent
VSTUP = KOREN / "data" / "PID" / "stops.json"
VYSTUP = KOREN / "public" / "pid_stops_compact.json"


def razeni(linka):
    return (0, int(linka), "") if linka.isdigit() else (1, 0, linka)


def kompakt(stops_json):
    zastavky = []
    for s in stops_json["stopGroups"]:
        linky = sorted({l["name"] for st in s.get("stops", []) for l in st.get("lines", []) if l.get("name")},
                       key=razeni)
        if not linky or s.get("avgLat") is None:
            continue
        zastavky.append({
            "name": s["name"], "municipality": s.get("municipality"), "districtCode": s.get("districtCode"),
            "avgLat": s["avgLat"], "avgLon": s["avgLon"], "lines": linky,
        })
    return {"generatedAt": stops_json["generatedAt"], "dataFormatVersion": stops_json["dataFormatVersion"],
            "stops": zastavky}


def main():
    vysledek = kompakt(json.loads(VSTUP.read_text(encoding="utf-8")))
    with open(VYSTUP, "w", encoding="utf-8") as f:
        json.dump(vysledek, f, ensure_ascii=False, separators=(",", ":"))
    print(f"Zastávky PID s linkami: {len(vysledek['stops'])} (stops.json z {vysledek['generatedAt']})")


if __name__ == "__main__":
    main()
