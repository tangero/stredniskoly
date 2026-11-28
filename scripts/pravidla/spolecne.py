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
import re
import sys
from collections import Counter
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


KOMENTAR_NA_RADKU = re.compile(r"\{?/\*.*?\*/\}?")
# Řádkový komentář `//`, ne dvojité lomítko v adrese (`https://…`).
RADKOVY_KOMENTAR = re.compile(r"(?<!:)//.*$")


def kod_bez_komentaru(obsah: str, python: bool = False):
    """Vrátí dvojice (číslo řádku, řádek kódu) bez komentářů.

    Args:
        obsah: Text zdrojového souboru.
        python: U Pythonu se vynechají jen celé řádky začínající `#`; jinak komentáře
            JavaScriptu a JSX (`//`, `/* … */`, `{/* … */}`, i přes víc řádků).
    """
    v_komentari = False
    for cislo, radek in enumerate(obsah.splitlines(), 1):
        if python:
            if not radek.lstrip().startswith("#"):
                yield cislo, radek
            continue
        if v_komentari:
            if "*/" not in radek:
                continue
            radek = radek.split("*/", 1)[1]
            v_komentari = False
        radek = KOMENTAR_NA_RADKU.sub(" ", radek)
        pred, zacatek, _ = radek.partition("/*")
        # `/*` uvnitř řetězce (vzor cesty 'src/*.ts') komentář nezačíná: před ním je lichý počet uvozovek.
        if zacatek and not any(pred.count(u) % 2 for u in "'\"`"):
            radek = pred
            v_komentari = True
        radek = RADKOVY_KOMENTAR.sub("", radek)
        if radek.strip() and not radek.strip().startswith("*"):
            yield cislo, radek


def nacti_zaklad(soubor: Path) -> Counter:
    """Načte zmrazený základ jako počty výskytů dvojic (cesta, otisk).

    Otisk zapsaný v souboru vícekrát znamená víc známých výskytů téhož nálezu v souboru.
    """
    if not soubor.exists():
        return Counter()
    data = json.loads(soubor.read_text(encoding="utf-8"))
    return Counter((cesta, o) for cesta, otisky in data.get("nalezy", {}).items() for o in otisky)


def zapis_zaklad(soubor: Path, nalezy: list[Nalez], popis: str) -> None:
    """Přepíše základ aktuálním stavem; opakovaný výskyt zapíše otisk opakovaně."""
    po_souborech: dict[str, list[str]] = {}
    for n in nalezy:
        po_souborech.setdefault(n.cesta, []).append(n.otisk)
    data = {"popis": popis, "nalezy": {c: sorted(o) for c, o in sorted(po_souborech.items())}}
    soubor.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")


def nove_nalezy(nalezy: list[Nalez], znamy: Counter) -> list[Nalez]:
    """Vrátí nálezy nad rámec základu.

    Základ zná u každé dvojice (cesta, otisk) počet výskytů. Když jich v souboru přibude,
    je novým nálezem každý výskyt nad tento počet (v pořadí řádků ty poslední).
    """
    zbyva = Counter(znamy)
    nove = []
    for n in nalezy:
        klic = (n.cesta, n.otisk)
        if zbyva[klic] > 0:
            zbyva[klic] -= 1
        else:
            nove.append(n)
    return nove


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
    nove = nove_nalezy(nalezy, znamy)
    for n in nove:
        print(f"{n.cesta}:{n.radek}: {n.popis}. Oprava: {n.oprava}")
    if nove:
        print(f"{nazev}: {len(nove)} nových nálezů (ve zmrazeném základu je {sum(znamy.values())}).", file=sys.stderr)
        return 1
    print(f"{nazev}: bez nových nálezů (ve zmrazeném základu je {sum(znamy.values())}).")
    return 0
