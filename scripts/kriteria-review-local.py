#!/usr/bin/env python3
"""Místní prohlížeč PDF a pracovních přepisů kritérií DiPSy.

Spuštění: python3 scripts/kriteria-review-local.py
Naslouchá výhradně na 127.0.0.1; rozhodnutí zapisuje do gitignorovaných dat pilota.
"""

import argparse
import csv
import hashlib
import importlib.util
import json
import re
import subprocess
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
PILOT = ROOT / "data/dipsy-kriteria-pilot"
CSV = PILOT / "hodnoceni.csv"
PDF = PILOT / "pdf"
ALL = ROOT / "data/dipsy-kriteria-2026"
DRAFTS = ROOT / "src/data/kriteria-prijeti-2026-pilot.json"
CATALOG = ROOT / "public/applications_2026.json"
SCHOOL_WEB = ROOT / "public/skoly_web.json"
PORTAL_EXPORT = ROOT / "public/portal_skol.json"
HTML = Path(__file__).with_suffix(".html")
DECISIONS = PILOT / "review-decisions.jsonl"
PREVIEWS = ALL / "previews"
UUID = re.compile(r"^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$")
SHA256 = re.compile(r"^[0-9a-f]{64}$")
MAX_BODY = 8192
DATASET = "pilot"

_KONTROLA_SPEC = importlib.util.spec_from_file_location(
    "dipsy_kriteria_kontrola_v4", ROOT / "scripts/dipsy-kriteria-kontrola-v4.py")
kontrola_v4 = importlib.util.module_from_spec(_KONTROLA_SPEC)
_KONTROLA_SPEC.loader.exec_module(kontrola_v4)

UPRESNENY_VYKLAD = {
    "aa2287b2-20f0-4017-a7aa-235223292753": {
        "sha256": "009d6b219ad9158deab57c617beb29ba301e56891981f3826703bbecd16f7d44",
        "body": [
            "PDF: ČJL nejvýše 50 + MAT nejvýše 50 bodů před přepočtem. JPZ má váhu 60 %: i při 100 původních bodech přinese nejvýše 60 bodů.",
            "PDF: školní test nejvýše 30 bodů a pohovor nejvýše 10 bodů. Celkové maximum je 60 + 30 + 10 = 100 bodů.",
            "Výklad: přepočet 0,6 × JPZ může vytvořit desetiny bodu. Pravidlo zaokrouhlení z uvedeného vzorce nevyplývá; při budoucím výpočtu je třeba je ověřit v kritériích.",
        ],
    },
    "99b859a5-9713-45a8-8de7-5562c4a8ab11": {
        "sha256": "72089cd84417d67640def2382edbce8434f337a00182536ea0281f54594bf78b",
        "body": [
            "PDF: JPZ nejvýše 100, vysvědčení nejvýše 10 a soutěž nejvýše 1 bod; celkové maximum 111 bodů. Odvozený podíl JPZ je 100/111 = 90,09 %. V této běžné větvi se body neváží ani nezaokrouhlují.",
            "PDF: za známky 1 + 1 je 10 bodů, za 1 + 2 je 8 bodů, za ostatní kombinace 0. Přechod od 1 + 2 k 2 + 2 tak znamená pokles o 8 bodů.",
            "PDF: věta o „lepším výsledku písemného testu“ je nejasná. Maximum 100 bodů a obecná pravidla JPZ odpovídají lepšímu výsledku ze dvou termínů za každý předmět zvlášť, ne výběru jen ČJL nebo MAT.",
            "PDF: soutěžní úspěch přidává nejvýše 1 bod; více úspěchů nemůže celkové maximum této složky zvýšit.",
            "PDF: neuvádí bodové minimum pro přijetí. Pořadí školy na přihlášce uvádí jako třetí pomocné kritérium při shodě; jeho soulad s obecnou informací DiPSy o prioritách je potřeba metodicky vyjasnit.",
            "Právní postup: uchazeč s prominutou JPZ z češtiny se podle § 26 vyhlášky 422/2023 Sb. zařazuje prostřednictvím redukovaného pořadí; nelze mu mechanicky přidělit náhradních 50 bodů. Slovní hodnocení má převést na známky původní škola.",
        ],
    },
}


def pdf_dir():
    return ALL / "pdf" if DATASET in ("vse", "pet") else PDF


def text_dir():
    return ALL / "text" if DATASET in ("vse", "pet") else PDF


def five_ids():
    return [item["source_id"] for item in json.loads(DRAFTS.read_text(encoding="utf-8"))["zaznamy"]]


def digest(path):
    value = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            value.update(chunk)
    return value.hexdigest()


def pdf_page_count(path):
    result = subprocess.run(["pdfinfo", str(path)], capture_output=True, text=True,
                            timeout=15, check=True)
    match = re.search(r"^Pages:\s+(\d+)\s*$", result.stdout, re.MULTILINE)
    if not match:
        raise ValueError("Nelze určit počet stran PDF.")
    return int(match.group(1))


def pdf_page_png(pdf_hash, page):
    if not SHA256.fullmatch(pdf_hash) or not isinstance(page, int) or page < 1:
        raise ValueError("Neplatná stránka PDF.")
    rows, _, _ = read_data()
    if not any(row["sha256"] == pdf_hash for row in rows):
        raise ValueError("PDF není v kontrolním listu.")
    path = pdf_dir() / f"{pdf_hash}.pdf"
    if not path.is_file() or digest(path) != pdf_hash:
        raise ValueError("Místní PDF chybí nebo neodpovídá otisku.")
    count = pdf_page_count(path)
    if page > count:
        raise ValueError("Stránka není v PDF.")
    PREVIEWS.mkdir(parents=True, exist_ok=True)
    output = PREVIEWS / f"{pdf_hash}-{page}.png"
    if not output.is_file():
        subprocess.run(["pdftoppm", "-f", str(page), "-l", str(page), "-scale-to", "1400",
                        "-png", "-singlefile", str(path), str(output.with_suffix(""))],
                       capture_output=True, timeout=45, check=True)
    return output.read_bytes()


def draft_digest(draft):
    if draft is None:
        return None
    raw = json.dumps(draft, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def spocitej_maxima(modelovy_navrh):
    """Kontrola aritmetiky běžné větve JPZ; neodvozuje nevypsaná pravidla školy."""
    proposal = modelovy_navrh["navrh"]
    raw_weight = proposal.get("jpz_vaha_pct")
    parts = proposal.get("dalsi_bodovane_slozky") or []
    if any(part.get("max_bodu") is None for part in parts):
        return {"stav": "nelze_spocitat", "duvod": "PDF nebo návrh neuvádí maxima všech dalších složek."}
    try:
        weight = Decimal("100" if raw_weight is None else str(raw_weight))
        declared = (None if proposal.get("max_bodu_celkem") is None
                    else Decimal(str(proposal["max_bodu_celkem"])))
        maxima = [Decimal(str(part["max_bodu"])) for part in parts]
    except (InvalidOperation, ValueError, TypeError, KeyError):
        return {"stav": "nelze_spocitat", "duvod": "Některá maxima nejsou číselná."}
    if weight < 0 or weight > 100 or any(value < 0 for value in maxima):
        return {"stav": "nelze_spocitat", "duvod": "Neplatná váha nebo záporné maximum."}
    jpz_after_weight = weight
    extra = sum(maxima, Decimal(0))
    total = jpz_after_weight + extra
    formula = proposal.get("vzorec") or ""
    subject_conflict = bool(re.search(r"lepší\s+výsledek.{0,80}ČJL\s+nebo\s+MAT", formula, re.IGNORECASE))
    min_max_conflict = any(re.search(r"\bmax(?:imum|imálně)?\b|nejvýše", str(item), re.IGNORECASE)
                           for item in proposal.get("minima", []))
    return {
        "stav": "spocitano",
        "jpz_pred_vahou": "100",
        "jpz_po_vaze": str(jpz_after_weight),
        "dalsi_max": str(extra),
        "spocitane_maximum": str(total),
        "uvedene_maximum": str(declared) if declared is not None else None,
        "maximum_souhlasi": declared == total if declared is not None else None,
        "podil_jpz_pct": str((jpz_after_weight * 100 / total).quantize(Decimal("0.01"))) if total else None,
        "rozpor_lepsi_predmet": subject_conflict,
        "maxima_v_minimech": min_max_conflict,
        "desetinna_skore_mozna": weight != weight.to_integral_value() or weight != Decimal(100),
    }


def read_data():
    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    drafts = json.loads(DRAFTS.read_text(encoding="utf-8"))
    offers = {}
    for item in catalog["data"]:
        offers.setdefault(item["source_id"], []).append(item)
    parsed_drafts = {}
    for item in drafts["zaznamy"]:
        parsed_drafts.setdefault(item["source_id"], []).append(item)
    with CSV.open(encoding="utf-8", newline="") as stream:
        pilot_rows = list(csv.DictReader(stream, delimiter=";"))
    if DATASET == "pilot":
        rows = pilot_rows
    else:
        pilot_by_id = {row["source_id"]: row for row in pilot_rows}
        latest = {}
        manifest = ALL / "manifest.jsonl"
        if manifest.exists():
            with manifest.open(encoding="utf-8") as stream:
                for line in stream:
                    try:
                        item = json.loads(line)
                        latest[item["source_id"]] = item
                    except (ValueError, KeyError, TypeError):
                        continue
        rows = []
        for offer in catalog["data"]:
            item = latest.get(offer["source_id"])
            if not item or item.get("stav") not in ("text", "nutne_ocr", "ocr_text"):
                continue
            pilot = pilot_by_id.get(offer["source_id"], {})
            same_pdf = pilot.get("sha256") == item.get("sha256")
            rows.append({
                "source_id": offer["source_id"], "redizo": offer["redizo"], "kkov": offer["kkov"],
                "zamereni": offer.get("zamereni") or "", "nazev": offer["nazev"],
                "rok": "2026", "kolo": "1", "stav_stazeni": item["stav"],
                "file_id": item["file_id"], "sha256": item["sha256"],
                "zdroj_url": item["karta_url"], "ziskano_at": item.get("ziskano_at", ""),
                "zkontrolovano_at": item.get("zkontrolovano_at", ""),
                "publikovano_at": pilot.get("publikovano_at", "") if same_pdf else "",
                **{key: pilot.get(key, "") if same_pdf else "" for key in
                   ("zaver", "vahy_jpz", "dalsi_body", "minima", "rovnost", "poznamka")},
            })
    if DATASET == "pet":
        selected = five_ids()
        order = {source_id: index for index, source_id in enumerate(selected)}
        rows = sorted((row for row in rows if row["source_id"] in order),
                      key=lambda row: order[row["source_id"]])
    return rows, offers, parsed_drafts


def latest_decisions():
    result = {}
    if not DECISIONS.exists():
        return result
    with DECISIONS.open(encoding="utf-8") as stream:
        for line in stream:
            try:
                item = json.loads(line)
                result[item["source_id"]] = item
            except (ValueError, KeyError, TypeError):
                continue
    return result


def entry(source_id, include_text=False):
    rows, offers, drafts = read_data()
    matches = [row for row in rows if row["source_id"] == source_id]
    if len(matches) != 1:
        raise ValueError("Nabídka nemá právě jeden řádek kontrolního listu.")
    row = matches[0]
    pdf_hash = row["sha256"]
    if not SHA256.fullmatch(pdf_hash):
        raise ValueError("Kontrolní list nemá platný otisk PDF.")
    pdf_path = pdf_dir() / f"{pdf_hash}.pdf"
    pdf_ok = pdf_path.is_file() and digest(pdf_path) == pdf_hash
    offer_matches = offers.get(source_id, [])
    draft_matches = drafts.get(source_id, [])
    offer = offer_matches[0] if len(offer_matches) == 1 else None
    draft = draft_matches[0] if len(draft_matches) == 1 else None
    identity_ok = bool(offer) and all(
        str(row[key]) == str(offer.get(key, "")) for key in ("redizo", "kkov", "zamereni")
    ) and str(row["rok"]) == "2026" and str(row["kolo"]) == "1"
    draft_ok = draft is None or (
        draft["zdroj"]["sha256"] == pdf_hash
        and draft["zdroj"]["file_id"] == row["file_id"]
        and draft["rok"] == 2026 and draft["kolo"] == 1
        and all(str(draft[key]) == str(row[key]) for key in ("redizo", "kkov", "zamereni"))
    )
    decision = latest_decisions().get(source_id)
    if decision and (decision.get("pdf_sha256") != pdf_hash or decision.get("draft_sha256") != draft_digest(draft)):
        decision = {**decision, "neplatne_pro_tuto_verzi": True}
    result = {
        "pilot": row,
        "katalog": offer,
        "navrh": draft,
        "navrh_sha256": draft_digest(draft),
        "pdf_ok": pdf_ok,
        "pdf_pages": pdf_page_count(pdf_path) if pdf_ok and DATASET == "pet" else None,
        "identita_ok": identity_ok,
        "navrh_ok": draft_ok,
        "rozhodnuti": decision,
        "dalsi_zdroje": {
            "web_skoly": json.loads(SCHOOL_WEB.read_text(encoding="utf-8")).get("weby", {}).get(row["redizo"]),
            "portal_skoly": json.loads(PORTAL_EXPORT.read_text(encoding="utf-8")).get(row["redizo"]),
        },
    }
    if DATASET in ("vse", "pet"):
        if DATASET == "pet":
            candidate = ALL / "llm-pilot/deepseek" / f"{source_id}-v1.json"
            if candidate.is_file():
                model = json.loads(candidate.read_text(encoding="utf-8"))
                if (model.get("sha256") == pdf_hash and model.get("rok") == 2026
                        and model.get("kolo") == 1 and isinstance(model.get("navrh"), dict)):
                    result["modelovy_navrh"] = model
            jev_path = ALL / "llm-pilot/jev-pilot" / f"{source_id}-v1.json"
            if jev_path.is_file():
                jev = json.loads(jev_path.read_text(encoding="utf-8"))
                if (jev.get("sha256") == pdf_hash and jev.get("rok") == 2026
                        and jev.get("kolo") == 1 and result.get("modelovy_navrh")
                        and jev.get("deepseek_prompt_sha256") == result["modelovy_navrh"].get("prompt_sha256")):
                    result["jev_kontrola"] = jev
            if result.get("modelovy_navrh"):
                result["kontrola_maxim"] = spocitej_maxima(result["modelovy_navrh"])
            novy_path = ALL / "llm-pilot/deepseek" / f"{source_id}-v3.json"
            if novy_path.is_file():
                novy = json.loads(novy_path.read_text(encoding="utf-8"))
                if (novy.get("sha256") == pdf_hash and novy.get("rok") == 2026
                        and novy.get("kolo") == 1 and novy.get("verze_zadani") == 4
                        and isinstance(novy.get("navrh"), dict)):
                    suffix = ".ocr.txt" if row["stav_stazeni"] == "ocr_text" else ".txt"
                    pdf_text = (ALL / "text" / f"{pdf_hash}{suffix}").read_text(encoding="utf-8")
                    result["novy_modelovy_navrh"] = novy
                    result["kontrola_noveho_navrhu"] = {
                        "nalezy": kontrola_v4.prover(novy["navrh"], pdf_text),
                        "odvozene_maximum": str(kontrola_v4.vypoctene_maximum(novy["navrh"]))
                        if kontrola_v4.vypoctene_maximum(novy["navrh"]) is not None else None,
                    }
                    result["nezavisle_navrhy"] = {}
                    for kind in ("opus", "luna"):
                        peer_path = ALL / "llm-pilot/nezavisly-vzorek" / kind / f"{source_id}-v1.json"
                        if not peer_path.is_file():
                            continue
                        peer = json.loads(peer_path.read_text(encoding="utf-8"))
                        if (peer.get("sha256") != pdf_hash or peer.get("rok") != 2026
                                or peer.get("kolo") != 1 or peer.get("verze_zadani") != 4
                                or peer.get("prompt_sha256") != novy.get("prompt_sha256")
                                or not isinstance(peer.get("navrh"), dict)):
                            continue
                        total = kontrola_v4.vypoctene_maximum(peer["navrh"])
                        result["nezavisle_navrhy"][kind] = {
                            "model": peer,
                            "kontrola": {
                                "nalezy": kontrola_v4.prover(peer["navrh"], pdf_text),
                                "odvozene_maximum": str(total) if total is not None else None,
                            },
                        }
            upresneni = UPRESNENY_VYKLAD.get(source_id)
            if upresneni and upresneni["sha256"] == pdf_hash:
                result["upresneny_vyklad"] = upresneni["body"]
            result["automaticky_pilot"] = True
        for version in (2, 1):
            if DATASET == "pet":
                break
            candidate = ALL / "llm-pilot" / f"{source_id}-v{version}.json"
            if not candidate.is_file():
                continue
            model = json.loads(candidate.read_text(encoding="utf-8"))
            if (model.get("sha256") == pdf_hash and model.get("rok") == 2026
                    and model.get("kolo") == 1 and not model.get("chyba")
                    and isinstance(model.get("navrh"), dict)):
                result["modelovy_navrh"] = model
                break
        evidence_path = ALL / "evidence.jsonl"
        if evidence_path.exists():
            with evidence_path.open(encoding="utf-8") as stream:
                for line in stream:
                    try:
                        item = json.loads(line)
                        if item.get("source_id") == source_id and item.get("sha256") == pdf_hash:
                            result["vyskyty"] = item.get("vyskyty", {})
                            break
                    except (ValueError, TypeError):
                        continue
    if include_text:
        suffix = ".ocr.txt" if row.get("stav_stazeni") == "ocr_text" else ".txt"
        text_path = text_dir() / f"{pdf_hash}{suffix}"
        result["text_pdf"] = text_path.read_text(encoding="utf-8", errors="replace") if text_path.is_file() else ""
    return result


def summary():
    rows, _, drafts = read_data()
    decisions = latest_decisions()
    model_ids = ({path.name.split("-v", 1)[0] for path in (ALL / "llm-pilot").glob("*-v[12].json")}
                 if DATASET == "vse" else five_ids() if DATASET == "pet" else set())
    result = []
    for row in rows:
        source_id = row["source_id"]
        available_drafts = drafts.get(source_id, [])
        draft = available_drafts[0] if len(available_drafts) == 1 else None
        decision = decisions.get(source_id, {})
        verdict = decision.get("verdikt")
        if verdict and (decision.get("pdf_sha256") != row["sha256"] or decision.get("draft_sha256") != draft_digest(draft)):
            verdict = "zastarale"
        result.append({
            "source_id": source_id,
            "redizo": row["redizo"],
            "nazev": row["nazev"],
            "kkov": row["kkov"],
            "zamereni": row["zamereni"],
            "stav_stazeni": row["stav_stazeni"],
            "ma_navrh": draft is not None,
            "ma_modelovy_navrh": source_id in model_ids,
            "automaticky_pilot": DATASET == "pet",
            "rozhodnuti": verdict,
        })
    return result


def save_decision(payload):
    if not isinstance(payload, dict):
        raise ValueError("Neplatný formát rozhodnutí.")
    source_id = payload.get("source_id")
    if not isinstance(source_id, str) or not UUID.fullmatch(source_id):
        raise ValueError("Neplatné ID nabídky.")
    item = entry(source_id)
    if not item["pdf_ok"] or not item["identita_ok"] or not item["navrh_ok"]:
        raise ValueError("PDF nebo vazba na nabídku nesouhlasí; rozhodnutí nelze uložit.")
    if payload.get("pdf_sha256") != item["pilot"]["sha256"] or payload.get("draft_sha256") != item["navrh_sha256"]:
        raise ValueError("Podklad se změnil. Načtěte kartu znovu.")
    verdict = payload.get("verdikt")
    if verdict not in ("schvaleno", "oprava", "nezjisteno"):
        raise ValueError("Neznámý verdikt.")
    if verdict == "schvaleno" and item["navrh"] is None:
        raise ValueError("Bez strukturovaného přepisu není co schválit.")
    pages = payload.get("strany")
    if not isinstance(pages, str) or len(pages) > 100 or (verdict == "schvaleno" and not pages.strip()):
        raise ValueError("Při schválení uveďte stránky PDF, které jste zkontroloval(a).")
    note = payload.get("poznamka")
    if not isinstance(note, str) or len(note) > 3000 or not note.strip():
        raise ValueError("Zapište krátké zdůvodnění nebo co vyžaduje opravu.")
    record = {
        "source_id": source_id,
        "pdf_sha256": item["pilot"]["sha256"],
        "draft_sha256": item["navrh_sha256"],
        "verdikt": verdict,
        "strany": pages.strip(),
        "poznamka": note.strip(),
        "rozhodnuto_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }
    DECISIONS.parent.mkdir(parents=True, exist_ok=True)
    with DECISIONS.open("a", encoding="utf-8") as stream:
        stream.write(json.dumps(record, ensure_ascii=False) + "\n")
    return record


class Handler(BaseHTTPRequestHandler):
    def local_host(self):
        return self.headers.get("Host", "") in (
            f"127.0.0.1:{self.server.server_port}", f"localhost:{self.server.server_port}",
        )

    def send_bytes(self, code, body, content_type):
        self.send_response(code)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        self.end_headers()
        self.wfile.write(body)

    def send_json(self, code, value):
        self.send_bytes(code, json.dumps(value, ensure_ascii=False).encode("utf-8"), "application/json; charset=utf-8")

    def do_GET(self):
        if not self.local_host():
            self.send_json(403, {"error": "Požadavek není z místní aplikace."})
            return
        path = urlparse(self.path).path
        try:
            if path == "/":
                self.send_bytes(200, HTML.read_bytes(), "text/html; charset=utf-8")
            elif path == "/api/records":
                self.send_json(200, summary())
            elif path.startswith("/api/record/"):
                source_id = path.removeprefix("/api/record/")
                self.send_json(200, entry(source_id, include_text=True))
            elif path.startswith("/pdf/"):
                pdf_hash = path.removeprefix("/pdf/").removesuffix(".pdf")
                if not SHA256.fullmatch(pdf_hash):
                    raise ValueError("Neplatný otisk PDF.")
                rows, _, _ = read_data()
                if not any(row["sha256"] == pdf_hash for row in rows):
                    raise ValueError("PDF není v kontrolním listu.")
                pdf_path = pdf_dir() / f"{pdf_hash}.pdf"
                if not pdf_path.is_file() or digest(pdf_path) != pdf_hash:
                    raise ValueError("Místní PDF chybí nebo neodpovídá otisku.")
                self.send_bytes(200, pdf_path.read_bytes(), "application/pdf")
            elif path.startswith("/pdf-page/"):
                match = re.fullmatch(r"/pdf-page/([0-9a-f]{64})/(\d+)\.png", path)
                if not match:
                    raise ValueError("Neplatná adresa stránky PDF.")
                self.send_bytes(200, pdf_page_png(match.group(1), int(match.group(2))), "image/png")
            else:
                self.send_json(404, {"error": "Nenalezeno."})
        except (OSError, ValueError, KeyError, TypeError, subprocess.SubprocessError) as error:
            self.send_json(400, {"error": str(error)})

    def do_POST(self):
        if urlparse(self.path).path != "/api/decision":
            self.send_json(404, {"error": "Nenalezeno."})
            return
        origin = self.headers.get("Origin")
        host = self.headers.get("Host", "")
        if not self.local_host() or origin not in (None, f"http://{host}") or self.headers.get("Content-Type", "").split(";", 1)[0] != "application/json":
            self.send_json(403, {"error": "Požadavek není z místní aplikace."})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length < 1 or length > MAX_BODY:
                raise ValueError("Neplatná délka požadavku.")
            payload = json.loads(self.rfile.read(length))
            self.send_json(200, save_decision(payload))
        except (OSError, ValueError, KeyError, TypeError) as error:
            self.send_json(400, {"error": str(error)})


def main():
    global DATASET
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--vse", action="store_true", help="zobrazit dosud stažené nabídky celé dávky 2026")
    mode.add_argument("--pet", action="store_true", help="pět automatických návrhů vedle původních PDF")
    args = parser.parse_args()
    DATASET = "pet" if args.pet else "vse" if args.vse else "pilot"
    if not CSV.exists():
        parser.error(f"Chybí kontrolní list: {CSV}")
    server = HTTPServer(("127.0.0.1", args.port or (8767 if args.pet else 8766 if args.vse else 8765)), Handler)
    print(f"Kontrola kritérií: http://127.0.0.1:{server.server_port}", flush=True)
    print(f"Místní rozhodnutí: {DECISIONS}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
