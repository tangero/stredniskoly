#!/usr/bin/env python3
"""Datový podklad pro prohlížeč konfliktů návazností.

Prohlížeč má ukázat, v čem konflikt spočívá: co o téže nabídce říká rok 2025,
co rok 2026 a co rejstřík MŠMT. Podpůrná data (pozorování, zdroje, adresy)
se do payloadu dávají také, ale prohlížeč je drží složená.

Zapisuje tools/konflikty-prohlizec/data.js jako `window.DATA = {...}`.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
FRONTA = ROOT / "docs/podklady/fronta-dohledavani-2025-2026.json"
REJSTRIK = ROOT / "docs/podklady/rejstrik-k-fronte-2025-2026.json"
VYSLEDKY = ROOT / "docs/podklady/vysledky-navaznosti-2025-2026"
VYSTUP = Path(__file__).parent / "data.js"


def nabidka(n):
    return {
        "kkov": n.get("KKOV"),
        "obor": n.get("OBOR - NÁZEV"),
        "zamereni": (n.get("ZAMĚŘENÍ OBORU") or "").strip(),
        "delka": n.get("DÉLKA STUDIA"),
        "forma": n.get("FORMA VZDĚLÁVÁNÍ"),
        "jazyk": n.get("JAZYK STUDIA"),
        "id": n.get("ID_SOF"),
    }


def main():
    fronta = json.loads(FRONTA.read_text())
    rej = json.loads(REJSTRIK.read_text())
    snimky = rej["snapshots"]
    ukoly = {t["id"]: t for t in fronta["tasks"]}

    # issue_id -> ročníky a KKOV, kterých se otázka týká
    otazky = {}
    for t in fronta["tasks"]:
        for i in t["issues"]:
            zaznamy = []
            for r in i.get("records", []):
                if r.get("type") == "offers":
                    zaznamy.append({"rok": r["year"], **nabidka(r["data"])})
                else:
                    zaznamy.append({"rok": r["year"], "jednotka": r["data"].get("name"),
                                    "izo": r["data"].get("izo")})
            otazky[i["id"]] = {"kind": i["kind"], "zaznamy": zaznamy}

    # issue_id -> jak je obor veden v rejstříku
    v_rejstriku = {}
    for data in rej["tasks"].values():
        for n in data["nabidky"]:
            pritomen = n["obor_v_rejstriku"]
            v_rejstriku[n["issue_id"]] = {
                "kkov": n["kkov"],
                "snimky": [pritomen[d] for d in snimky],
                "navrh": n["strojovy_navrh"],
            }

    pripady = []
    for cesta in sorted(VYSLEDKY.glob("*.json")):
        v = json.loads(cesta.read_text())
        t = ukoly[v["task_id"]]
        prvni = next((n for rok in ("2026", "2025")
                      for n in (t.get("context_offers", {}).get(rok) or [])), {})
        for f in v["findings"]:
            sporne = {oid: otazky.get(oid, {}) for oid in f["issue_ids"]}
            sporne_id = sorted({z["id"] for o in sporne.values()
                                for z in o.get("zaznamy", []) if z.get("id")})
            sporne_roky = sorted({z["rok"] for o in sporne.values()
                                  for z in o.get("zaznamy", []) if z.get("rok")})
            kkovy = {z.get("kkov") for oid in f["issue_ids"]
                     for z in otazky.get(oid, {}).get("zaznamy", []) if z.get("kkov")}
            # Do rozdílu patří jen nabídky, kterých se nález skutečně týká. Ostatní
            # nabídky téhož kódu jsou kontext: kdyby se vypsaly vedle sebe, čtenář by
            # je pároval podle pořadí řádků, což bývá jiná dvojice, než nález tvrdí.
            strany = {"2025": [], "2026": []}
            kontext = {"2025": [], "2026": []}
            for rok in ("2025", "2026"):
                for n in (t.get("context_offers", {}).get(rok) or []):
                    if n.get("KKOV") not in kkovy:
                        continue
                    zaznam = nabidka(n)
                    cil = strany if zaznam["id"] in sporne_id else kontext
                    cil[rok].append(zaznam)
            rejstrik = [v_rejstriku[oid] for oid in f["issue_ids"] if oid in v_rejstriku]
            pripady.append({
                "task": v["task_id"],
                "skola": prvni.get("NÁZEV ŠKOLY"),
                "obec": prvni.get("OBEC"),
                "redizo": t["redizo"],
                "issue_ids": f["issue_ids"],
                "druhy": sorted({o.get("kind") for o in sporne.values() if o.get("kind")}),
                "sporne": sporne_id,
                "sporne_roky": sporne_roky,
                "status": f["status"],
                "vztah": f["relationship"]["type"],
                "od": f["relationship"].get("from") or [],
                "na": f["relationship"].get("to") or [],
                "srovnatelnost": f["history_comparability"],
                "akce": f["recommended_action"],
                "zaver": f.get("conclusion"),
                "strany": strany,
                "kontext": kontext,
                "rejstrik": rejstrik,
                "pozorovani": f.get("observations") or [],
                "alternativy": f.get("alternative_explanations") or [],
                "adresy": f.get("addresses") or [],
                "zdroje": [{"url": e.get("url"), "titul": e.get("title"),
                            "dokládá": e.get("supports")} for e in (f.get("evidence") or [])],
                "otevrene": f.get("unanswered_questions") or [],
                "rozhodnuti": f.get("decisions_required") or [],
                "uzavrene": f.get("resolved_questions") or [],
                "souvisi": f.get("related_task_ids") or [],
            })

    payload = {
        "snimky": snimky,
        "pocty": {
            "ukolu": len(fronta["tasks"]),
            "otazek": sum(len(t["issues"]) for t in fronta["tasks"]),
            "nalezu": len(pripady),
        },
        "pripady": pripady,
    }
    text = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    text = text.replace("<", "\\u003c").replace("\u2028", "\\u2028").replace("\u2029", "\\u2029")
    VYSTUP.write_text("window.DATA=" + text + ";\n")
    print(f"{VYSTUP}: {len(pripady)} případů, {VYSTUP.stat().st_size} B")


if __name__ == "__main__":
    main()
