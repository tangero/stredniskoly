#!/usr/bin/env python3
"""Hledání nespárovaných nabídek, které jsou zjevně totéž zaměření jinými slovy.

Školy píší totéž zaměření každý rok jinak: „s výukou francouzského jazyka“ a
„s výukou francouzštiny“, „zaměření na NJ“ a „Německý jazyk“, „všeobecné studim“
a „Všeobecné“. Strojové párování je rozhodí, protože porovnává text.

Skript proto texty normalizuje: sundá diakritiku, rozepíše zkratky, sjednotí
tvary názvů jazyků a předmětů a zahodí výplňová slova. Pak u každé školy porovná
nabídky téhož kódu oboru z roku 2025 a 2026 a vypíše dvojice, které si po
normalizaci odpovídají.

Použití:
    python3 scripts/match-zamereni.py [--prah 0.6] [--out CESTA]
"""
import argparse
import difflib
import json
import re
import unicodedata
from pathlib import Path

FRONTA = Path("docs/podklady/fronta-dohledavani-2025-2026.json")
VYSLEDKY = Path("docs/podklady/vysledky-navaznosti-2025-2026")

# Zkratky, které školy v názvech zaměření běžně používají
ZKRATKY = {
    "vv": "vytvarna vychova", "hv": "hudebni vychova", "tv": "telesna vychova",
    "nj": "nemecky jazyk", "aj": "anglicky jazyk", "fj": "francouzsky jazyk",
    "sj": "spanelsky jazyk", "rj": "rusky jazyk", "cj": "cesky jazyk",
    "it": "informacni technologie", "ict": "informacni technologie",
    "zsv": "zaklady spolecenskych ved", "ma": "matematika",
}
# Tvary téhož názvu, které se v datech střídají
SJEDNOTIT = [
    (r"\bnemciny\b|\bnemcina\b", "nemecky jazyk"),
    (r"\bfrancouzstiny\b|\bfrancouzstina\b", "francouzsky jazyk"),
    (r"\banglictiny\b|\banglictina\b", "anglicky jazyk"),
    (r"\bspanelstiny\b|\bspanelstina\b", "spanelsky jazyk"),
    (r"\brustiny\b|\brustina\b", "rusky jazyk"),
    (r"\bceStiny\b|\bcestiny\b|\bcestina\b", "cesky jazyk"),
    (r"\bmatematiky\b|\bmatematika\b", "matematika"),
    (r"\binformatiky\b|\binformatika\b", "informacni technologie"),
    (r"\bvytvarne vychovy\b|\bvytvarnou vychovu\b", "vytvarna vychova"),
    (r"\bhudebni vychovy\b", "hudebni vychova"),
    (r"\btelesne vychovy\b", "telesna vychova"),
    (r"\bstudim\b", "studium"),
]
# Slova, která význam zaměření nenesou
VYPLN = {"zamereni", "na", "s", "se", "vyukou", "vyuka", "posilenou", "rozsirenou",
         "rozsirenym", "rozsirene", "studium", "studia", "obor", "oboru", "svp",
         "skolni", "vzdelavaci", "program", "vybrane", "predmety", "predmetu",
         "v", "cizim", "jazyce", "trida", "a", "i", "pro", "je", "jazyku"}
KOD = re.compile(r"\b\d{2}-\d{2}-[a-z]/\d{2}\b", re.I)
# České koncovky, aby „německého jazyka“ a „německý jazyk“ splynuly.
# Zkracuje se jen tam, kde po odtržení zbude aspoň čtyřpísmenný základ,
# aby se nespojila slova, která spolu nesouvisejí.
KONCOVKY = ("eho", "emu", "ymi", "ych", "ami", "ove", "ou", "em", "im", "um",
            "ho", "mu", "ym", "y", "a", "e", "u", "i", "o")


def zaklad(slovo):
    for k in KONCOVKY:
        if slovo.endswith(k) and len(slovo) - len(k) >= 4:
            return slovo[: -len(k)]
    return slovo


def normalizuj(text):
    t = unicodedata.normalize("NFKD", (text or "").lower())
    t = "".join(c for c in t if not unicodedata.combining(c))
    t = KOD.sub(" ", t)
    t = re.sub(r"[^a-z0-9]+", " ", t)
    t = " ".join(ZKRATKY.get(w, w) for w in t.split())
    for vzor, nahrada in SJEDNOTIT:
        t = re.sub(vzor, nahrada, t)
    slova = [zaklad(w) for w in t.split() if w not in VYPLN and len(w) > 1]
    return " ".join(sorted(set(slova)))


def podobnost(a, b):
    na, nb = normalizuj(a), normalizuj(b)
    if not na and not nb:
        return 1.0
    if na == nb:
        return 1.0
    sa, sb = set(na.split()), set(nb.split())
    if sa and sb:
        jac = len(sa & sb) / len(sa | sb)
    else:
        jac = 0.0
    return max(jac, difflib.SequenceMatcher(None, na, nb).ratio())


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--prah", type=float, default=0.6)
    parser.add_argument("--out", default="docs/podklady/navrhy-parovani-zamereni.json")
    args = parser.parse_args()

    fronta = json.loads(FRONTA.read_text())

    # ID_SOF, které už některý nález páruje nebo o nich rozhodl
    reseno = {}
    for cesta in sorted(VYSLEDKY.glob("*.json")):
        v = json.loads(cesta.read_text())
        for f in v["findings"]:
            for oid in f["issue_ids"]:
                reseno[oid] = (v["task_id"], tuple(f["issue_ids"]), f["relationship"]["type"])

    navrhy = []
    for t in fronta["tasks"]:
        # nespárované nabídky podle ročníku, s ID otázky
        sporne = {}
        for i in t["issues"]:
            for r in i.get("records", []):
                if r.get("type") == "offers":
                    sporne.setdefault(r["year"], []).append((i["id"], r["data"]))
        a, b = sporne.get(2025, []), sporne.get(2026, [])
        if not a or not b:
            continue
        skola = None
        for rok in ("2026", "2025"):
            for n in (t.get("context_offers", {}).get(rok) or []):
                skola = n.get("NÁZEV ŠKOLY")
                break
            if skola:
                break
        # Skóre všech dvojic téhož kódu a délky studia
        mrizka = {}
        for oid_a, na in a:
            for oid_b, nb in b:
                if na.get("KKOV") != nb.get("KKOV"):
                    continue
                if str(na.get("DÉLKA STUDIA")) != str(nb.get("DÉLKA STUDIA")):
                    continue
                mrizka[(oid_a, oid_b)] = podobnost(na.get("ZAMĚŘENÍ OBORU"),
                                                   nb.get("ZAMĚŘENÍ OBORU"))
        # Má-li škola u téhož oboru víc zaměření, drží se jen vzájemně nejlepší dvojice.
        # Jinak by „Aplikace elektrotechniky – Elektroenergetika“ padla i na
        # „Aplikace elektrotechniky, zaměření Automatizace“, protože se shoduje začátek.
        nejlepsi_a, nejlepsi_b = {}, {}
        for (oa, ob), sk in mrizka.items():
            if sk > nejlepsi_a.get(oa, (-1, None))[0]:
                nejlepsi_a[oa] = (sk, ob)
            if sk > nejlepsi_b.get(ob, (-1, None))[0]:
                nejlepsi_b[ob] = (sk, oa)

        zaznamy_a = dict(a)
        zaznamy_b = dict(b)
        for (oid_a, oid_b), skore in mrizka.items():
            if skore < args.prah:
                continue
            if nejlepsi_a[oid_a][1] != oid_b or nejlepsi_b[oid_b][1] != oid_a:
                continue
            na, nb = zaznamy_a[oid_a], zaznamy_b[oid_b]
            spolu = reseno.get(oid_a) and reseno.get(oid_b) \
                and reseno[oid_a][1] == reseno[oid_b][1]
            navrhy.append({
                "task_id": t["id"], "skola": skola, "kkov": na.get("KKOV"),
                "otazka_2025": oid_a, "otazka_2026": oid_b,
                "zamereni_2025": (na.get("ZAMĚŘENÍ OBORU") or "").strip(),
                "zamereni_2026": (nb.get("ZAMĚŘENÍ OBORU") or "").strip(),
                "skore": round(skore, 3),
                "uz_sparovano": bool(spolu),
                "nalez_2025": reseno.get(oid_a, (None, None, None))[2],
                "nalez_2026": reseno.get(oid_b, (None, None, None))[2],
            })

    navrhy.sort(key=lambda n: (n["uz_sparovano"], -n["skore"]))
    chybi = [n for n in navrhy if not n["uz_sparovano"]]
    print(f"Kandidátů na spárování: {len(navrhy)}; z toho rešerše nespárovala {len(chybi)}.\n")
    for n in chybi:
        print(f"  {n['task_id']} {n['otazka_2025']}→{n['otazka_2026']} shoda {n['skore']:.2f}"
              f"  [{n['nalez_2025']} / {n['nalez_2026']}]")
        print(f"     {n['kkov']} · {n['skola']}")
        print(f"     2025: {n['zamereni_2025']!r}")
        print(f"     2026: {n['zamereni_2026']!r}")

    Path(args.out).write_text(json.dumps({
        "prah": args.prah,
        "note": "Návrh k posouzení, ne hotové mapování. Shoda se počítá z názvu zaměření "
                "po sundání diakritiky, rozepsání zkratek, sjednocení tvarů názvů jazyků "
                "a předmětů a vypuštění výplňových slov.",
        "navrhy": navrhy,
    }, ensure_ascii=False, indent=1))
    print(f"\nZapsáno do {args.out}")


if __name__ == "__main__":
    raise SystemExit(main())
