#!/usr/bin/env python3
"""Malý, nákladově omezený modelový přepis kritérií 2026.

  python3 scripts/dipsy-kriteria-llm-vzorek.py

Výsledky jsou pracovní návrhy v gitignorovaném data/dipsy-kriteria-2026/llm-pilot/.
Skript nikdy nemění veřejná data ani schválení. Výchozí vzorek tvoří pět PDF
s dříve připraveným pracovním přepisem pro věcnou kontrolu.
"""

import argparse
import hashlib
import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "data/dipsy-kriteria-2026"
CATALOG = ROOT / "public/applications_2026.json"
REFERENCE = ROOT / "src/data/kriteria-prijeti-2026-pilot.json"
OUTPUT = BASE / "llm-pilot"
PROMPT_VERSION = 4
MODEL = "claude-haiku-4-5-20251001"
MAX_ITEM_USD = 0.04
MAX_TOTAL_USD = 0.20

SCHEMA = {
    "type": "object",
    "properties": {
        "rezim": {"type": "string", "enum": ["pouze_jpz", "jine", "nezjisteno"]},
        "vzorec": {"type": "string"},
        "jpz_prepocet": {"type": "string", "enum": ["ano", "ne", "nezjisteno"]},
        "jpz_vaha_pct": {"type": ["number", "null"]},
        "jpz_cjl_max": {"type": ["number", "null"]},
        "jpz_mat_max": {"type": ["number", "null"]},
        "jpz_max_po_prepoctu": {"type": ["number", "null"]},
        "max_bodu_celkem": {"type": ["number", "null"]},
        "dalsi_bodovane_slozky": {"type": "array", "items": {
            "type": "object", "properties": {
                "nazev": {"type": "string"},
                "max_bodu_pred_prepocet": {"type": ["number", "null"]},
                "vaha_pct": {"type": ["number", "null"]},
                "max_bodu_po_prepoctu": {"type": ["number", "null"]},
                "pravidlo": {"type": "string"}, "strany": {"type": "array", "items": {"type": "integer"}},
            }, "required": ["nazev", "max_bodu_pred_prepocet", "vaha_pct",
                            "max_bodu_po_prepoctu", "pravidlo", "strany"]}},
        "minima": {"type": "array", "items": {"type": "string"}},
        "rovnost": {"type": "array", "items": {"type": "string"}},
        "dalsi_podminky": {"type": "array", "items": {"type": "string"}},
        "nejasnosti": {"type": "array", "items": {"type": "string"}},
        "doklad_strany": {"type": "array", "items": {"type": "integer"}},
        "doklady": {"type": "array", "items": {
            "type": "object", "properties": {
                "pole": {"type": "string", "enum": ["jpz_cjl_max", "jpz_mat_max", "jpz_vaha_pct",
                    "jpz_max_po_prepoctu", "max_bodu_celkem", "dalsi_slozka", "minimum", "rovnost"]},
                "index_slozky": {"type": ["integer", "null"]},
                "strana": {"type": "integer"},
                "citace": {"type": "string"},
            }, "required": ["pole", "index_slozky", "strana", "citace"]}},
    },
    "required": ["rezim", "vzorec", "jpz_prepocet", "jpz_vaha_pct", "jpz_cjl_max", "jpz_mat_max",
                 "jpz_max_po_prepoctu", "max_bodu_celkem",
                 "dalsi_bodovane_slozky", "minima", "rovnost", "dalsi_podminky",
                 "nejasnosti", "doklad_strany", "doklady"],
}

INSTRUCTIONS = """Přepiš pravidla hodnocení pro JEDNU uvedenou nabídku školy v roce 2026 a 1. kole.
Zdroj je strojový text jejího PDF; může obsahovat OCR chyby a pravidla pro více oborů.
Výsledek je návrh k lidské kontrole, ne schválené pravidlo. Nevymýšlej chybějící čísla.

`pouze_jpz` znamená, že bodové pořadí vzniká PROSTÝM SOUČTEM bodů ČJL a MAT,
bez různých vah a bez dalších bodů. Minima a pravidla při rovnosti mohou existovat
i při tomto režimu. Není-li závěr doložen, použij `nezjisteno`.
`jine` použij při přepočtu/váze JPZ nebo když se přidávají body za známky,
školní test, soutěž, pohovor či jiné hodnocení.

Povinné otázky před sestavením vzorce:
1. Je maximum 100 bodů ze dvou předmětů JPZ skutečně PŘEPOČTENO na jiné
   bodové maximum (např. 60), nebo zůstává 100 a jen se k němu přičítají
   další body? Do `jpz_prepocet` dej ano/ne/nezjisteno. Odvozený podíl JPZ
   100/111 není školou stanovená váha ani přepočet JPZ.
2. Které další faktory kromě JPZ mění BODOVÝ SOUČET nebo pořadí? Vypiš
   každý v `dalsi_bodovane_slozky` a uveď maximum před a po vážení. Typicky školní test,
   pohovor, známky, soutěže. Nezaměň faktor za jeho podmínku účasti.
3. Které podmínky vyřazují nebo stanoví číselné minimum? Ty patří do
   `minima` nebo `dalsi_podminky`, nikoli mezi další body.
4. Co rozhoduje až při ROVNOSTI? To patří do `rovnost`, nepřičítá body.
5. Platí pravidlo pro tuto nabídku a toto zaměření, nebo pro jiné obory PDF?

Nejprve odděleně určuj maximum ČJL, maximum MAT, váhu celého JPZ, maximum JPZ
PO přepočtu a maxima ostatních bodovaných složek. `jpz_vaha_pct` je koeficient
pro násobení surových bodů JPZ, pouze když ho PDF výslovně stanoví; není to
odvozený podíl 100/celkové maximum. Když PDF váhu nestanoví, dej null. Nulová váha není
totéž co neuvedená. Při výslovné váze 60 % a maximu JPZ 50 + 50 zapiš
`jpz_max_po_prepoctu` = 60; jinak při prostém součtu ČJL + MAT = 100.
U KAŽDÉ další složky zapiš surové maximum, případnou výslovnou váhu a maximum
po přepočtu. Příklad: prospěch max 40 bodů × 25 % = 10 bodů. Je-li prospěch
bez váhy, zapiš váhu null a maximum po přepočtu rovné surovému maximu.
Nevyvozuj z vah 75 % + 25 % samo o sobě maximum 100 bodů: pokud surová maxima
jsou 100 a 40, výsledné maximum je 100 × 0,75 + 40 × 0,25 = 85 bodů.
`max_bodu_celkem` vyplň JEN při výslovném uvedení celkového maxima v PDF;
jinak null, i když jde součet dopočítat. Nezaokrouhluj odvozené body.
V `vzorec` výslovně uveď OBA předměty JPZ a případný přepočet. Nepleť
„lepší výsledek testu“ z dvou TERMÍNŮ za každý předmět s výběrem lepšího
PŘEDMĚTU. Pokud formulace PDF připouští oba výklady, vyznač ji v `nejasnosti`,
ale vzorec musí souhlasit s uvedeným maximem; nesouhlasí-li, dej raději
`nezjisteno` a popiš rozpor. Nevkládej automaticky 50 bodů za prominutou ČJL:
to je zvláštní větev redukovaného pořadí, ne bodová složka běžného vzorce.

Do `dalsi_bodovane_slozky` patří VÝHRADNĚ složky, které mění počet bodů.
Samotné testy JPZ ČJL a MAT sem nikdy nepatří. Dílčí známky sluč do jedné
složky prospěchu, pokud PDF stanovuje jeden souhrnný limit za prospěch.
Úlevy pro cizince, uzpůsobení testu, zdravotní podmínky, přílohy a minima
tam nepatří; dej je do `dalsi_podminky`. Do `minima` patří pouze doložené
číselné hranice bodů/testu pro přijetí. Nejasný výklad hranice neprezentuj
jako rozhodnutý: popiš ji opatrně a současně uveď v `nejasnosti`.
Rovnost pořadí zvlášť. Nejasnosti piš pouze ke skutečně rozporným nebo
neúplným tvrzením PDF, nevymýšlej chybějící standardní postupy. Piš stručně.
Pokud PDF obsahuje několik oborů, vyber jen pravidla uvedeného KKOV a zaměření;
nejasné přiřazení výslovně uveď. Každou číselnou hodnotu a závěr podlož stranami.
Do `doklady` dej pro každé neprázdné číselné maximum, výslovnou váhu,
každou další bodovanou složku, číselné minimum a kritérium rovnosti krátkou
DOSLOVNOU citaci z PDF a číslo strany. Pro `dalsi_slozka` je `index_slozky`
index v `dalsi_bodovane_slozky` od nuly; u ostatních polí dej null. Citace
nemá obsahovat vlastní výklad ani dopočítaný součet. Pro odvozenou hodnotu
cituj vstupní čísla, ze kterých vznikla. Každá citace má mít jen několik
slov, nejvýše 100 znaků; nejvýše 16 dokladů celkem. Pokud doklad chybí,
hodnotu nevymýšlej.
Před odevzdáním si zkontroluj, zda (ČJL max + MAT max) × váha/100 odpovídá
`jpz_max_po_prepoctu`; u dalších složek zkontroluj surové maximum × jejich
vlastní váhu/100. Součet maxim PO přepočtu porovnej s výslovně uvedeným
`max_bodu_celkem`, pokud existuje. Pokud ne, popiš rozpor v `nejasnosti`
a netvrď úplný vzorec. Odlišuj maximum od MINIMA nutného k přijetí;
„maximálně 50 bodů“ není hranice úspěšnosti. Pravidla pro rovnost pořadí,
včetně pořadí školy na přihlášce, nikdy nejsou bodovanou složkou.
Oddělovač STRANA v textu označuje skutečné číslo stránky PDF. Vzorec uveď
slovy nebo matematicky; není-li úplný, napiš nejasnost. Odpověz dle JSON schématu."""


def latest_manifest():
    result = {}
    with (BASE / "manifest.jsonl").open(encoding="utf-8") as stream:
        for line in stream:
            row = json.loads(line)
            result[row["source_id"]] = row
    return result


def prompt_for(offer, row):
    suffix = ".ocr.txt" if row["stav"] == "ocr_text" else ".txt"
    content = (BASE / "text" / f"{row['sha256']}{suffix}").read_text(encoding="utf-8")
    pages = content.split("\f")
    body = "\n\n".join(f"=== STRANA {number} ===\n{page}" for number, page in enumerate(pages, 1) if page.strip())
    return (f"{INSTRUCTIONS}\n\nNabídka: {offer['source_id']}\nŠkola: {offer['nazev']}"
            f"\nREDIZO: {offer['redizo']}\nKKOV: {offer['kkov']}"
            f"\nZaměření: {offer.get('zamereni') or '(bez zaměření)'}"
            f"\nOtisk PDF: {row['sha256']}\n\nTEXT PDF:\n{body}")


def run_one(source_id, offer, row):
    prompt = prompt_for(offer, row)
    digest = hashlib.sha256(prompt.encode("utf-8")).hexdigest()
    cmd = ["claude", "--safe-mode", "--print", "--model", MODEL,
           "--system-prompt", "Jsi extraktor českých kritérií přijetí. Nepoužívej nástroje.",
           "--tools", "", "--strict-mcp-config", "--no-session-persistence",
           "--output-format", "json", "--max-budget-usd", str(MAX_ITEM_USD),
           "--json-schema", json.dumps(SCHEMA, ensure_ascii=False)]
    result = subprocess.run(cmd, input=prompt, text=True, capture_output=True, timeout=180)
    try:
        response = json.loads(result.stdout)
    except ValueError as error:
        raise RuntimeError(f"CLI nevrátilo JSON: {result.stderr[-300:]}") from error
    record = {
        "source_id": source_id, "sha256": row["sha256"], "file_id": row["file_id"],
        "rok": 2026, "kolo": 1, "metoda_textu": row["stav"],
        "model": next(iter(response.get("modelUsage") or {}), MODEL),
        "model_usage": response.get("modelUsage"), "verze_zadani": PROMPT_VERSION,
        "prompt_sha256": digest, "zpracovano_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "exit_code": result.returncode, "chyba": response.get("is_error", False),
        "cena_usd": response.get("total_cost_usd"), "spotreba": response.get("usage"),
        "navrh": response.get("structured_output"),
        "stderr": result.stderr[-300:],
    }
    OUTPUT.mkdir(parents=True, exist_ok=True)
    (OUTPUT / f"{source_id}-v{PROMPT_VERSION}.json").write_text(
        json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    with (OUTPUT / "vysledky.jsonl").open("a", encoding="utf-8") as stream:
        stream.write(json.dumps(record, ensure_ascii=False) + "\n")
    return record


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--limit", type=int, default=5, help="nejvýše pět položek ze známého vzorku")
    parser.add_argument("--source-id", action="append", help="vybrat konkrétní ID z katalogu 2026")
    args = parser.parse_args()
    if args.limit not in range(1, 6):
        parser.error("--limit musí být v rozsahu 1–5.")
    reference_ids = [row["source_id"] for row in json.loads(REFERENCE.read_text(encoding="utf-8"))["zaznamy"]]
    ids = args.source_id or reference_ids[:args.limit]
    offers = {row["source_id"]: row for row in json.loads(CATALOG.read_text(encoding="utf-8"))["data"]}
    if len(ids) > 5 or len(set(ids)) != len(ids) or any(source_id not in offers for source_id in ids):
        parser.error("Vyberte nejvýše pět různých ID z katalogu 2026.")
    manifest = latest_manifest()
    spent = 0.0
    new_spent = 0.0
    reused = 0
    for index, source_id in enumerate(ids, 1):
        row = manifest[source_id]
        if row["stav"] not in ("text", "ocr_text"):
            raise SystemExit(f"Není čitelný text pro {source_id}.")
        saved = OUTPUT / f"{source_id}-v{PROMPT_VERSION}.json"
        if saved.exists():
            result = json.loads(saved.read_text(encoding="utf-8"))
            current_prompt_hash = hashlib.sha256(prompt_for(offers[source_id], row).encode("utf-8")).hexdigest()
            if result["sha256"] != row["sha256"] or result["prompt_sha256"] != current_prompt_hash:
                raise SystemExit(f"Podklad nebo zadání se změnilo: {source_id}; zvyšte verzi zadání.")
            reused += 1
        else:
            if new_spent + MAX_ITEM_USD > MAX_TOTAL_USD + 1e-9:
                raise SystemExit("Dosažen limit ceny vzorku.")
            result = run_one(source_id, offers[source_id], row)
            new_spent += float(result.get("cena_usd") or 0)
        spent += float(result.get("cena_usd") or 0)
        draft = result.get("navrh") or {}
        print(f"{index}/{len(ids)} {source_id} {draft.get('rezim', 'bez výstupu')} "
              f"${result.get('cena_usd')} {result.get('chyba')}", flush=True)
        if result["chyba"] or not draft:
            raise SystemExit("Model nevrátil strukturovaný návrh; pokračování zastaveno.")
    print(f"Vzorek: {len(ids)} záznamů, cenový ekvivalent výstupů ${spent:.4f}, "
          f"nově vykázáno ${new_spent:.4f}, již existovalo {reused}.", flush=True)


if __name__ == "__main__":
    main()
