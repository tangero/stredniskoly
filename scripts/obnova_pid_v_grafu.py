#!/usr/bin/env python3
"""Obnova části PID v grafu spojení z aktuálního feedu PID (#426).

Graf `data/transit_graph.json` se staví z celostátního GTFS (`scripts/build_transit_graph_v2.py`, zdroj
spojenka.cz). Celostátní feed se ale nestahuje automaticky (robots.txt spojenka.cz zakazuje `/jrdata/*.zip`),
kdežto feed PID je otevřený a obnovuje se denně. Tento skript proto v existujícím grafu nahradí jen hrany mezi
zastávkami PID (Praha a Středočeský kraj) hranami spočítanými z aktuálního feedu PID; zbytek republiky nechá.

Vstupy (gitignorované, stáhnout ručně podle docs/zdroje-dat.md, oddíl 2.9):
  data/PID/*.txt      rozbalený https://data.pid.cz/PID_GTFS.zip (bez shapes.txt)
  data/PID/stops.json https://data.pid.cz/stops/json/stops.json

Výstupy: data/transit_graph.json (přepíše), public/pid_stops_compact.json (přepíše).

Pravidla jsou stejná jako v build_transit_graph_v2.py (pondělí, spoje s prvním odjezdem 6:30–9:00, interval
linky ze 7:00–8:00, bez nočních linek, hrany jen linek s intervalem), navíc:
- spoje platí k jednomu dni (první pondělí platnosti feedu) podle calendar.txt a calendar_dates.txt,
  aby se souběžné varianty kalendáře nepočítaly dvakrát;
- uzel grafu je uzel ASW (`asw_node_id`), v grafu klíč obsahující `PID_ASW:<uzel>`.

Na hranách mezi dvěma zastávkami PID zůstanou z původního grafu jen linky, které PID neprovozuje: dálkové
vlaky (název s mezerou, jehož základ PID nezná, např. „Ex1 Ostravan“, „Leo Express“) a meziměstské autobusy
s šestimístným číslem licence. Ostatní původní linky (i zaniklé, např. XB) se nahradí linkami z feedu.

Použití: python3 scripts/obnova_pid_v_grafu.py
"""

import csv
import json
import re
import statistics
import sys
from collections import defaultdict
from datetime import date, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_transit_graph_v2 import HOUR_END, HOUR_START, is_night_route, parse_time_seconds  # noqa: E402

KOREN = Path(__file__).resolve().parent.parent
PID = KOREN / "data" / "PID"
GRAF = KOREN / "data" / "transit_graph.json"
KOMPAKT = KOREN / "public" / "pid_stops_compact.json"


def nacti(nazev):
    with open(PID / nazev, encoding="utf-8-sig") as f:
        yield from csv.DictReader(f)


def den_feedu():
    """První pondělí platnosti feedu."""
    info = next(nacti("feed_info.txt"))
    d = date(int(info["feed_start_date"][:4]), int(info["feed_start_date"][4:6]), int(info["feed_start_date"][6:]))
    while d.weekday() != 0:
        d += timedelta(days=1)
    return d, info["feed_start_date"], info["feed_end_date"]


def sluzby_dne(d):
    ds = d.strftime("%Y%m%d")
    aktivni = {
        r["service_id"] for r in nacti("calendar.txt")
        if r["monday"] == "1" and r["start_date"] <= ds <= r["end_date"]
    }
    for r in nacti("calendar_dates.txt"):
        if r["date"] != ds:
            continue
        if r["exception_type"] == "1":
            aktivni.add(r["service_id"])
        elif r["exception_type"] == "2":
            aktivni.discard(r["service_id"])
    return aktivni


def linky_pid(stary_interval, uzel):
    """Hrany a intervaly z feedu PID, uzel = ASW uzel.

    Linka bez odjezdu z výchozí zastávky v 7:00–8:00 (typicky venkovská linka se spojem v 6:45 a 8:20)
    dostane interval z původního grafu, jinak 60 minut. Původní graf takové linky měl díky shodě čísla
    s linkami jinde v republice; bez této náhrady by z grafu vypadly stovky venkovských zastávek PID.
    """
    den, _, _ = den_feedu()
    sluzby = sluzby_dne(den)
    noc = set()
    linka = {}
    for r in nacti("routes.txt"):
        linka[r["route_id"]] = r["route_short_name"].strip()
        if r.get("is_night") == "1":
            noc.add(r["route_id"])
    spoj_linka = {
        r["trip_id"]: linka[r["route_id"]] for r in nacti("trips.txt")
        if r["service_id"] in sluzby and r["route_id"] not in noc and linka.get(r["route_id"])
    }
    hrany = defaultdict(lambda: defaultdict(list))
    odjezdy = defaultdict(list)

    def zpracuj(tid, zastavky):
        kratky = spoj_linka.get(tid)
        if not kratky or is_night_route(kratky):
            return
        deps = [dep for _, _, dep in zastavky if dep is not None]
        if not deps or min(deps) < 6.5 * 3600 or min(deps) >= 9 * 3600:
            return
        for i in range(len(zastavky) - 1):
            a, _, dep = zastavky[i]
            b, arr, _ = zastavky[i + 1]
            if dep is None or arr is None:
                continue
            ua, ub = uzel.get(a), uzel.get(b)
            if not ua or not ub or ua == ub:
                continue
            t = arr - dep
            if 0 <= t <= 7200:
                hrany[(ua, ub)][kratky].append(t)
        prvni, _, dep = zastavky[0]
        if dep is not None and HOUR_START * 3600 <= dep < HOUR_END * 3600 and uzel.get(prvni):
            odjezdy[(kratky, uzel[prvni])].append(dep)

    aktualni, zastavky = None, []
    for r in nacti("stop_times.txt"):
        tid = r["trip_id"]
        if tid != aktualni:
            if aktualni and zastavky:
                zpracuj(aktualni, zastavky)
            aktualni, zastavky = tid, []
        if tid not in spoj_linka:
            continue
        zastavky.append((r["stop_id"], parse_time_seconds(r["arrival_time"]), parse_time_seconds(r["departure_time"])))
    if aktualni and zastavky:
        zpracuj(aktualni, zastavky)

    syrove = defaultdict(list)
    for (kratky, _), deps in odjezdy.items():
        if len(deps) < 2:
            syrove[kratky].append(60.0)
            continue
        deps = sorted(deps)
        syrove[kratky].append(statistics.median([(deps[i + 1] - deps[i]) / 60 for i in range(len(deps) - 1)]))
    intervaly = {k: max(2.0, min(120.0, round(statistics.median(v), 1))) for k, v in syrove.items()}
    for podle_linky in hrany.values():
        for k in podle_linky:
            if k not in intervaly:
                intervaly[k] = stary_interval.get(f"PID:{k}", stary_interval.get(k, 60.0))

    vysledek = {}
    for (ua, ub), podle_linky in hrany.items():
        linky = sorted(k for k in podle_linky if k in intervaly)
        if not linky:
            continue
        casy = [t for k in linky for t in podle_linky[k]]
        vysledek[(ua, ub)] = (max(0.5, round(statistics.median(casy) / 60, 1)), linky)
    return vysledek, intervaly, den


def nazev_zastavky(skupina):
    obec, jmeno = (skupina.get("municipality") or "").strip(), skupina["name"].strip()
    if not obec or jmeno == obec or jmeno.startswith(obec + ","):
        return jmeno
    return f"{obec}, {jmeno}"


def mimo_pid(nazev, linky_feedu):
    """Původní linka, kterou PID neprovozuje a která na hraně zůstane."""
    if nazev.startswith("PID:"):
        return False
    if nazev in linky_feedu:
        return False
    if re.fullmatch(r"\d{6}", nazev):
        return True
    zaklad = re.split(r"[ /]", nazev, maxsplit=1)[0]
    return " " in nazev and zaklad not in linky_feedu


def main():
    graf = json.load(open(GRAF, encoding="utf-8"))
    stops_json = json.load(open(PID / "stops.json", encoding="utf-8"))
    # Uzel ASW může mít v grafu víc klíčů (Vysočanská a Nádraží Vysočany jsou oba uzel 474); nástupiště
    # feedu se proto přiřadí nejbližšímu z nich. Uzel, který graf nezná, dostane nový klíč PID_ASW:<uzel>.
    klice_uzlu = defaultdict(list)
    for k in graf["stops"]:
        m = re.search(r"PID_ASW:(\d+)", k)
        if m:
            klice_uzlu[m.group(1)].append(k)
    uzel = {}
    for r in nacti("stops.txt"):
        n = r.get("asw_node_id")
        if not n:
            continue
        kandidati = klice_uzlu.get(n)
        if not kandidati:
            uzel[r["stop_id"]] = f"PID_ASW:{n}"
            continue
        lat, lon = float(r["stop_lat"]), float(r["stop_lon"])
        uzel[r["stop_id"]] = min(kandidati, key=lambda k: (graf["stops"][k][1] - lat) ** 2 + (graf["stops"][k][2] - lon) ** 2)

    nove, intervaly, den = linky_pid(graf["headways"], uzel)
    linky_feedu = set(intervaly)

    # Za zastávku PID se bere jen uzel, který feed PID v daný den obsluhuje. Klíč s PID_ASW mají i zastávky
    # daleko mimo PID (Krkonoše, Jindřichohradecko); jejich místní linky feed nezná a musí zůstat.
    obsluhovane = {u for pair in nove for u in pair}
    pid_klice = {k for k in obsluhovane if k in graf["stops"]}
    skupiny = {str(s["node"]): s for s in stops_json["stopGroups"] if s.get("node") is not None}

    pridane = 0
    for k in obsluhovane - pid_klice:
        s = skupiny.get(k.split(":", 1)[1])
        if s:
            graf["stops"][k] = [nazev_zastavky(s), s["avgLat"], s["avgLon"]]
            pridane += 1

    puvodni = defaultdict(dict)
    odebrane_linky = 0
    for a, seznam in graf["edges"].items():
        for b, t, linky in seznam:
            if a in pid_klice and b in pid_klice:
                zustava = [x for x in linky if mimo_pid(x, linky_feedu)]
                odebrane_linky += len(linky) - len(zustava)
                if zustava:
                    puvodni[a][b] = [b, t, zustava]
            else:
                puvodni[a][b] = [b, t, linky]

    nahrazene = 0
    for (ua, ub), (t, linky) in nove.items():
        a, b = ua, ub
        if a not in graf["stops"] or b not in graf["stops"]:
            continue
        stara = puvodni[a].get(b)
        # Označení linky není celostátně jedinečné: PID 26 nesmí přepsat plzeňskou 26.
        puvodni[a][b] = [b, t, sorted({f"PID:{x}" for x in linky} | set(stara[2] if stara else []))]
        nahrazene += 1

    hrany = {a: sorted(v.values(), key=lambda e: e[0]) for a, v in puvodni.items() if v}
    pouzite = {x for seznam in hrany.values() for _, _, linky in seznam for x in linky}
    intervaly_grafu = {k: v for k, v in graf["headways"].items() if k in pouzite}
    intervaly_grafu.update({f"PID:{k}": v for k, v in intervaly.items() if f"PID:{k}" in pouzite})
    nazvy_linek = {k: v for k, v in graf.get("route_names", {}).items() if k in pouzite}
    nazvy_linek.update({f"PID:{k}": k for k in intervaly if f"PID:{k}" in pouzite})

    ve_hranach = set(hrany) | {b for seznam in hrany.values() for b, _, _ in seznam}
    zastavky = {k: v for k, v in graf["stops"].items() if k in ve_hranach}
    pocet = sum(len(v) for v in hrany.values())
    graf["metadata"].update({
        "source": "GTFS_CR (spojenka.cz); část PID z PID_GTFS (data.pid.cz)",
        "pid_feed_den": den.isoformat(),
        "parent_stations": len(zastavky),
        "stations_with_edges": len(hrany),
        "directed_edges": pocet,
        "avg_out_degree": round(pocet / max(1, len(hrany)), 1),
        "routes_with_headway": len(intervaly_grafu),
    })
    graf["stops"] = dict(sorted(zastavky.items()))
    graf["edges"] = dict(sorted(hrany.items()))
    graf["headways"] = dict(sorted(intervaly_grafu.items()))
    graf["route_names"] = dict(sorted(nazvy_linek.items()))
    with open(GRAF, "w", encoding="utf-8") as f:
        json.dump(graf, f, ensure_ascii=False, separators=(",", ":"))

    def razeni(x):
        return (0, int(x), "") if x.isdigit() else (1, 0, x)

    kompakt = []
    for s in stops_json["stopGroups"]:
        linky = sorted({l["name"] for st in s.get("stops", []) for l in st.get("lines", []) if l.get("name")}, key=razeni)
        if not linky or s.get("avgLat") is None:
            continue
        kompakt.append({
            "name": s["name"], "municipality": s.get("municipality"), "districtCode": s.get("districtCode"),
            "avgLat": s["avgLat"], "avgLon": s["avgLon"], "lines": linky,
        })
    with open(KOMPAKT, "w", encoding="utf-8") as f:
        json.dump({"generatedAt": stops_json["generatedAt"], "dataFormatVersion": stops_json["dataFormatVersion"],
                   "stops": kompakt}, f, ensure_ascii=False, separators=(",", ":"))

    print(f"Den feedu PID: {den}")
    print(f"Hrany PID z feedu: {len(nove)}, zapsané do grafu: {nahrazene}, nové zastávky: {pridane}")
    print(f"Odebrané původní linky na hranách PID: {odebrane_linky}")
    print(f"Graf: {len(zastavky)} zastávek, {pocet} hran, {len(intervaly_grafu)} linek s intervalem")
    print(f"Kompaktní zastávky PID: {len(kompakt)}")


if __name__ == "__main__":
    main()
