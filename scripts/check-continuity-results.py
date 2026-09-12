#!/usr/bin/env python3
"""Kontrola výsledků rešerše návazností proti frontě a formátu nálezu.

Ověří, že každý soubor v docs/podklady/vysledky-navaznosti-2025-2026/ odkazuje
na existující úkol, pokrývá právě jednou všechna jeho `issue_id`, používá
dovolené hodnoty číselníků a že nález se statusem `potvrzeno` má evidenci.

Použití:
    python3 scripts/check-continuity-results.py [--urls]

Přepínač --urls navíc vypíše všechny citované odkazy pro ruční kontrolu.
"""
import argparse
import json
from collections import Counter
from pathlib import Path

FRONTA = Path("docs/podklady/fronta-dohledavani-2025-2026.json")
REJSTRIK = Path("docs/podklady/rejstrik-k-fronte-2025-2026.json")
VYSLEDKY = Path("docs/podklady/vysledky-navaznosti-2025-2026")

STATUS = {"potvrzeno", "pravděpodobné", "rozpor_zdrojů", "nedohledáno"}
VZTAH = {"continuation", "new_offer", "closed", "rename_only", "merge", "split", "unknown"}
AKCE = {"approve_mapping", "record_only", "manual_review"}
SROVNATELNOST = {"comparable", "partially", "not_comparable", "unknown"}
POVINNA_POLE = ["issue_ids", "status", "observations", "conclusion", "alternative_explanations",
                "relationship", "addresses", "evidence", "history_comparability",
                "recommended_action", "related_task_ids", "unanswered_questions"]
# Odkazy, které se nedokládají otevřením v prohlížeči
LOKALNI_ZDROJE = ("fronta-dohledavani", "matice-zmen", "lkod-ftp.msmt.gov.cz")


def zkontroluj_konvenci(slozka):
    """Nabídka roku 2025, která v roce 2026 chybí, zatímco obor zůstává v rejstříku
    zapsán, se napříč frontou vede jako `closed` – ukončení nabídky, nikoli zánik oboru.
    Odchylka není chyba sama o sobě, ale mísí dvě významově různé věci v jednom poli."""
    if not REJSTRIK.exists():
        return []
    rej = json.loads(REJSTRIK.read_text())
    posledni = rej["snapshots"][-1]
    rok_a_zapis = {}
    for data in rej["tasks"].values():
        for n in data["nabidky"]:
            rok_a_zapis[n["issue_id"]] = (n["rok_nabidky"], n["obor_v_rejstriku"][posledni])
    nalezy = []
    for cesta in sorted(slozka.glob("*.json")):
        try:
            v = json.loads(cesta.read_text())
        except json.JSONDecodeError:
            continue
        for f in v.get("findings", []):
            znamé = [i for i in f.get("issue_ids", []) if i in rok_a_zapis]
            if not znamé:
                continue
            if {rok_a_zapis[i][0] for i in znamé} != {2025}:
                continue
            if not all(rok_a_zapis[i][1] for i in znamé):
                continue
            typ = f.get("relationship", {}).get("type")
            if typ not in ("closed", "unknown"):
                nalezy.append(f"{v['task_id']}/{','.join(znamé)}: nabídka 2025 chybí v 2026 a obor "
                              f"zůstává v rejstříku – fronta pro to používá 'closed', zde je {typ!r}")
    return nalezy


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--urls", action="store_true")
    args = parser.parse_args()

    fronta = json.loads(FRONTA.read_text())
    ukoly = {t["id"]: t for t in fronta["tasks"]}
    chyby = []
    statusy = Counter()
    vztahy = Counter()
    akce = Counter()
    odkazy = Counter()
    hotovo = 0

    for cesta in sorted(VYSLEDKY.glob("*.json")):
        try:
            v = json.loads(cesta.read_text())
        except json.JSONDecodeError as e:
            chyby.append(f"{cesta.name}: nevalidní JSON – {e}")
            continue
        tid = v.get("task_id")
        if tid not in ukoly:
            chyby.append(f"{cesta.name}: task_id {tid} není ve frontě")
            continue
        if cesta.stem != tid:
            chyby.append(f"{cesta.name}: název souboru neodpovídá task_id {tid}")
        hotovo += 1
        if v.get("queue_version") != fronta["version"]:
            chyby.append(f"{tid}: queue_version {v.get('queue_version')} ≠ {fronta['version']}")
        if not v.get("registry_check"):
            chyby.append(f"{tid}: chybí registry_check")

        ocekavane = {i["id"] for i in ukoly[tid]["issues"]}
        pokryte = Counter(i for f in v.get("findings", []) for i in f.get("issue_ids", []))
        if set(pokryte) != ocekavane:
            chybi = sorted(ocekavane - set(pokryte))
            navic = sorted(set(pokryte) - ocekavane)
            chyby.append(f"{tid}: otázky nepokryté {chybi or '-'}, neznámé {navic or '-'}")
        for oid, kolik in pokryte.items():
            if kolik > 1:
                chyby.append(f"{tid}: otázka {oid} je pokryta {kolik}×")

        for f in v.get("findings", []):
            oznaceni = f"{tid}/{','.join(f.get('issue_ids', []) or ['?'])}"
            for pole in POVINNA_POLE:
                if pole not in f:
                    chyby.append(f"{oznaceni}: chybí pole {pole}")
            statusy[f.get("status")] += 1
            vztahy[f.get("relationship", {}).get("type")] += 1
            akce[f.get("recommended_action")] += 1
            if f.get("status") not in STATUS:
                chyby.append(f"{oznaceni}: neznámý status {f.get('status')!r}")
            if f.get("relationship", {}).get("type") not in VZTAH:
                chyby.append(f"{oznaceni}: neznámý typ vztahu {f.get('relationship', {}).get('type')!r}")
            if f.get("recommended_action") not in AKCE:
                chyby.append(f"{oznaceni}: neznámá akce {f.get('recommended_action')!r}")
            if f.get("history_comparability") not in SROVNATELNOST:
                chyby.append(f"{oznaceni}: neznámá srovnatelnost {f.get('history_comparability')!r}")
            if f.get("status") == "potvrzeno":
                if not f.get("conclusion"):
                    chyby.append(f"{oznaceni}: status potvrzeno bez závěru")
                externi = [e for e in f.get("evidence", [])
                           if not any(z in (e.get("url") or "") for z in LOKALNI_ZDROJE)]
                if not f.get("evidence"):
                    chyby.append(f"{oznaceni}: status potvrzeno bez evidence")
                elif not externi:
                    chyby.append(f"{oznaceni}: status potvrzeno jen z přiložených dat a rejstříku "
                                 f"– zvážit 'pravděpodobné' nebo doložit externím zdrojem")
            for e in f.get("evidence", []):
                url = e.get("url") or ""
                odkazy[url] += 1
                if not url:
                    chyby.append(f"{oznaceni}: evidence bez url")
                if not e.get("checked_at"):
                    chyby.append(f"{oznaceni}: evidence {url[:60]} bez checked_at")
            for a in f.get("addresses", []):
                if not a.get("role"):
                    chyby.append(f"{oznaceni}: adresa bez role – {a.get('text')}")

    chyby.extend(zkontroluj_konvenci(VYSLEDKY))

    print(f"Zpracováno {hotovo} z {len(ukoly)} úkolů fronty.")
    print(f"Statusy nálezů: {dict(statusy)}")
    print(f"Typy vztahů: {dict(vztahy)}")
    print(f"Doporučené akce: {dict(akce)}")
    print(f"Různých odkazů v evidenci: {len(odkazy)}")
    if args.urls:
        for url, kolik in odkazy.most_common():
            print(f"  {kolik:3d}× {url}")
    if chyby:
        print(f"\nNALEZENO {len(chyby)} PROBLÉMŮ:")
        for c in chyby:
            print(f"  - {c}")
    else:
        print("\nBez nálezů kontroly.")
    return 1 if chyby else 0


if __name__ == "__main__":
    raise SystemExit(main())
