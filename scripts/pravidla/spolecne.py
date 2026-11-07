"""Společný tvar kontrol pravidel projektu (issue #559).

Každá kontrola je skript v `scripts/pravidla/`, který:

- vypíše nálezy jako `soubor:řádek: co je špatně. Oprava: …`,
- hlásí jen **nové** nálezy proti zmrazenému základu (`<kontrola>-zaklad.json`),
- skončí nenulovým návratem při novém nálezu,
- základ přepíše jen s přepínačem `--obnov` (odůvodnění patří do commitu).

Základ obsahuje jen cesty a otisky nálezů, nikdy jejich text.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from dataclasses import dataclass
from pathlib import Path

KOREN = Path(__file__).resolve().parent.parent.parent
SLOZKA = Path(__file__).resolve().parent


@dataclass(frozen=True)
class Nalez:
    """Jedno porušení pravidla.

    Attributes:
        cesta: Cesta souboru vůči kořenu repozitáře.
        radek: Číslo řádku (od 1).
        popis: Co je špatně, bez opsání citlivého textu.
        oprava: Jak to opravit.
        otisk: Stabilní otisk nálezu pro základ (není na řádku ani na textu závislý).
    """

    cesta: str
    radek: int
    popis: str
    oprava: str
    otisk: str


def otisk(*casti: str) -> str:
    """Vrátí krátký otisk textu; z otisku nejde text obnovit rozumnou cestou.

    Args:
        casti: Části, které nález jednoznačně určují.

    Returns:
        Prvních 12 znaků SHA-256.
    """
    return hashlib.sha256("\x1f".join(casti).encode("utf-8")).hexdigest()[:12]


def nacti_zaklad(soubor: Path) -> set[tuple[str, str]]:
    """Načte zmrazený základ jako množinu dvojic (cesta, otisk)."""
    if not soubor.exists():
        return set()
    data = json.loads(soubor.read_text(encoding="utf-8"))
    return {(cesta, o) for cesta, otisky in data.get("nalezy", {}).items() for o in otisky}


def zapis_zaklad(soubor: Path, nalezy: list[Nalez], popis: str) -> None:
    """Přepíše základ aktuálním stavem."""
    po_souborech: dict[str, list[str]] = {}
    for n in nalezy:
        po_souborech.setdefault(n.cesta, []).append(n.otisk)
    data = {"popis": popis, "nalezy": {c: sorted(set(o)) for c, o in sorted(po_souborech.items())}}
    soubor.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")


def spust(nazev: str, zaklad: Path, hledej, popis_zakladu: str, argv: list[str] | None = None) -> int:
    """Spustí kontrolu: porovná nálezy se základem a vypíše jen nové.

    Args:
        nazev: Název kontroly pro výpis.
        zaklad: Soubor se zmrazeným základem.
        hledej: Funkce bez argumentů, vrací seznam `Nalez`.
        popis_zakladu: Věta uložená do základu.
        argv: Argumenty příkazové řádky (výchozí `sys.argv`).

    Returns:
        0 bez nového nálezu, 1 s novým nálezem.
    """
    parser = argparse.ArgumentParser(description=nazev)
    parser.add_argument("--obnov", action="store_true", help="přepsat základ dnešním stavem (odůvodni v commitu)")
    args = parser.parse_args(argv)
    nalezy = hledej()
    if args.obnov:
        zapis_zaklad(zaklad, nalezy, popis_zakladu)
        print(f"{nazev}: základ přepsán ({len(nalezy)} nálezů).")
        return 0
    znamy = nacti_zaklad(zaklad)
    nove = [n for n in nalezy if (n.cesta, n.otisk) not in znamy]
    for n in nove:
        print(f"{n.cesta}:{n.radek}: {n.popis}. Oprava: {n.oprava}")
    if nove:
        print(f"{nazev}: {len(nove)} nových nálezů (ve zmrazeném základu je {len(znamy)}).", file=sys.stderr)
        return 1
    print(f"{nazev}: bez nových nálezů (ve zmrazeném základu je {len(znamy)}).")
    return 0
