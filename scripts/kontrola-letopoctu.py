#!/usr/bin/env python3
"""Hlídá, aby do textů pro uživatele nepřibývaly napevno zapsané letopočty.

Období dat určuje registr `public/stav_datovych_sad.json`, ne kód. Přesto v `src/`
leží zhruba stovka textů s letopočtem napevno; část z nich je správně (datum
exportu InspIS, harmonogram MŠMT), část je dluh z doby před registrem.

Jednorázově to přepsat nejde bezpečně, proto skript **zmrazí dnešní stav** do
základu a hlásí jen to, co přibylo. Základ tak zároveň slouží jako seznam míst
k postupnému úklidu.

    python3 scripts/kontrola-letopoctu.py           # kontrola, nenulový návrat při novém nálezu
    python3 scripts/kontrola-letopoctu.py --obnov   # vědomé přepsání základu

Nový nález se buď opraví (rok z registru), nebo se základ obnoví s odůvodněním
v commitu.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

KOREN = Path(__file__).resolve().parent.parent
ZAKLAD = KOREN / "scripts" / "letopocty-zaklad.json"
SRC = KOREN / "src"

# Historické položky changelogu letopočet nést musí, je to jejich obsah.
VYNECHANE_SOUBORY = {"src/lib/changelog.ts"}

# Jen roky, které dávají smysl jako období dat. Užší rozsah než 19xx/20xx kvůli
# falešným nálezům typu „10–2000 znaků“.
ROK = re.compile(r"(?<![\w.-])20(?:1[5-9]|2\d|3[0-5])(?![\w-])")
RETEZEC = re.compile(r"'([^'\n]*)'|\"([^\"\n]*)\"|`([^`\n]*)`")
# JSX text mezi značkami na témže řádku: <p>Přihlášky … 2027.</p>
JSX_TEXT = re.compile(r">([^<>{}\n]+)<")
# Rok v identifikátoru (min_body_2025) nebo cestě (pasma_prijeti_2026.json).
IDENTIFIKATOR = re.compile(r"[\w/.]20(?:1[5-9]|2\d|3[0-5])|20(?:1[5-9]|2\d|3[0-5])[\w/.]")


def je_veta(text: str) -> bool:
    """Pozná text určený člověku: obsahuje mezeru a aspoň tři písmena.

    Odfiltruje klíče (`'2025'`), cesty a technické řetězce, které rok nést smějí.
    """
    return " " in text.strip() and len(re.findall(r"[A-Za-zÁ-Žá-ž]", text)) >= 3


def texty_radku(radek: str) -> list[str]:
    """Vrátí části řádku, které se mohou zobrazit uživateli.

    Kontrolují se jen řetězcové literály a JSX text mezi značkami, a z nich jen
    ty, které vypadají jako věta. Kód typu `getResultsForYear(2026)` sem nepatří:
    letopočet v něm je argument, ne text stránky.

    Args:
        radek: Jeden řádek zdrojového souboru.

    Returns:
        Seznam úseků textu ke kontrole.
    """
    holy = radek.strip()
    if holy.startswith(("//", "*", "/*")):
        return []
    bez_komentare = radek.split("//")[0] if "//" in radek else radek
    casti = [next(s for s in m.groups() if s is not None) for m in RETEZEC.finditer(bez_komentare)]
    casti += JSX_TEXT.findall(RETEZEC.sub(" ", bez_komentare))
    return [c for c in casti if je_veta(c)]


def nalezy() -> dict[str, list[str]]:
    """Projde `src/` a vrátí nálezy letopočtů po souborech.

    Returns:
        Mapa cesty souboru na setříděný seznam nalezených úseků.
    """
    out: dict[str, list[str]] = {}
    for soubor in sorted(SRC.rglob("*")):
        if soubor.suffix not in (".ts", ".tsx") or not soubor.is_file():
            continue
        rel = soubor.relative_to(KOREN).as_posix()
        if rel in VYNECHANE_SOUBORY:
            continue
        nalezeno: set[str] = set()
        for radek in soubor.read_text(encoding="utf-8").splitlines():
            for text in texty_radku(radek):
                for m in ROK.finditer(text):
                    okoli = text[max(0, m.start() - 30):m.end() + 30].strip()
                    if IDENTIFIKATOR.search(text[max(0, m.start() - 1):m.end() + 1]):
                        continue
                    nalezeno.add(" ".join(okoli.split()))
        if nalezeno:
            out[rel] = sorted(nalezeno)
    return out


def main() -> int:
    """Porovná nálezy se základem; vrátí nenulový kód při novém výskytu."""
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--obnov", action="store_true", help="přepíše základ dnešním stavem")
    a = p.parse_args()

    ted = nalezy()
    if a.obnov:
        ZAKLAD.write_text(json.dumps(ted, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
        print(f"Základ obnoven: {sum(len(v) for v in ted.values())} výskytů ve {len(ted)} souborech.")
        return 0

    if not ZAKLAD.exists():
        sys.exit("Základ neexistuje; vytvoř ho příkazem --obnov.")
    zaklad = json.loads(ZAKLAD.read_text(encoding="utf-8"))

    nove = {s: [t for t in texty if t not in zaklad.get(s, [])] for s, texty in ted.items()}
    nove = {s: t for s, t in nove.items() if t}
    zmizele = sum(len([t for t in texty if t not in ted.get(s, [])]) for s, texty in zaklad.items())

    if nove:
        print("Nový letopočet napevno v textu pro uživatele:\n")
        for soubor, texty in sorted(nove.items()):
            for t in texty:
                print(f"  {soubor}: …{t}…")
        print("\nRok se bere z registru public/stav_datovych_sad.json, ne z kódu.")
        print("Když je letopočet na místě (datum exportu, harmonogram MŠMT), obnov základ:")
        print("  python3 scripts/kontrola-letopoctu.py --obnov")
        return 1

    celkem = sum(len(v) for v in ted.values())
    print(f"Bez nového letopočtu napevno. Známý dluh: {celkem} výskytů ve {len(ted)} souborech"
          + (f", {zmizele} od posledního základu ubylo." if zmizele else "."))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
