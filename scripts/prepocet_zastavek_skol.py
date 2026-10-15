#!/usr/bin/env python3
"""Přepočet nejbližší zastávky škol po obnově grafu spojení (#426).

`data/school_locations.json` nese u každé školy souřadnice (z geokódování v `geocode_schools.py`) a ID nejbližší
zastávky v `data/transit_graph.json`. Když obnova grafu změní ID zastávek (spojenka.cz je v říjnu 2026 změnila
z tvaru `CISJR:…|CRZ:…` na `S…`), stará ID v grafu nejsou. Skript proto ke stávajícím souřadnicím škol najde
nejbližší zastávku v aktuálním grafu stejně jako `geocode_schools.py`; nic znovu negeokóduje a nic nestahuje.

Použití: python3 scripts/prepocet_zastavek_skol.py
"""

import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from geocode_schools import haversine_km  # noqa: E402

KOREN = Path(__file__).resolve().parent.parent
GRAF = KOREN / "data" / "transit_graph.json"
SKOLY = KOREN / "data" / "school_locations.json"
BUNKA = 0.02  # stupně, jako v geocode_schools.py


def nejblizsi(zastavky, lat, lon):
    """(id, název, vzdálenost v km) nejbližší zastávky; `zastavky` je mřížka z `mrizka()`."""
    mrizka, vsechny = zastavky
    clat, clon = int(lat // BUNKA), int(lon // BUNKA)
    nejlepsi = None
    for okoli in range(2, 400, 4):
        for dlat in range(-okoli, okoli + 1):
            for dlon in range(-okoli, okoli + 1):
                for sid, nazev, slat, slon in mrizka.get((clat + dlat, clon + dlon), []):
                    d = haversine_km(lat, lon, slat, slon)
                    if nejlepsi is None or d < nejlepsi[2]:
                        nejlepsi = (sid, nazev, d)
        if nejlepsi is not None:
            return nejlepsi
    for sid, nazev, slat, slon in vsechny:
        d = haversine_km(lat, lon, slat, slon)
        if nejlepsi is None or d < nejlepsi[2]:
            nejlepsi = (sid, nazev, d)
    return nejlepsi


def mrizka(graf):
    bunky, vsechny = {}, []
    for sid, (nazev, lat, lon) in graf["stops"].items():
        vsechny.append((sid, nazev, lat, lon))
        bunky.setdefault((int(lat // BUNKA), int(lon // BUNKA)), []).append((sid, nazev, lat, lon))
    return bunky, vsechny


def prepocitej(skoly, graf):
    """Přepíše stop_id, stop_name a distance_km u každé školy; vrátí počet změněných zastávek."""
    zastavky = mrizka(graf)
    zmeneno = 0
    for zaznam in skoly["schools"].values():
        sid, nazev, d = nejblizsi(zastavky, zaznam["lat"], zaznam["lon"])
        if sid != zaznam.get("stop_id"):
            zmeneno += 1
        zaznam.update({"stop_id": sid, "stop_name": nazev, "distance_km": round(d, 3)})
    skoly["metadata"]["stops_recomputed_at"] = time.strftime("%Y-%m-%d %H:%M:%S")
    skoly["metadata"]["graph_reference_date"] = graf.get("metadata", {}).get("reference_date")
    return zmeneno


def main():
    graf = json.loads(GRAF.read_text(encoding="utf-8"))
    skoly = json.loads(SKOLY.read_text(encoding="utf-8"))
    zmeneno = prepocitej(skoly, graf)
    with open(SKOLY, "w", encoding="utf-8") as f:
        json.dump(skoly, f, ensure_ascii=False, indent=2)
    vzdalenosti = sorted(z["distance_km"] for z in skoly["schools"].values())
    print(f"Škol: {len(vzdalenosti)}, změněná zastávka: {zmeneno}")
    print(f"Vzdálenost k zastávce: medián {vzdalenosti[len(vzdalenosti) // 2]} km, nejvíc {vzdalenosti[-1]} km")


if __name__ == "__main__":
    main()
