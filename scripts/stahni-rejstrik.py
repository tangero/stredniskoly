#!/usr/bin/env python3
"""Ruční pomůcka: stáhne snímek rejstříku škol MŠMT, který zobrazuje registr.

    python3 scripts/stahni-rejstrik.py            # stáhne, když chybí
    python3 scripts/stahni-rejstrik.py --kontrola  # jen ověří, nestahuje

Snímky mají třicet megabajtů a do gitu se neukládají. Datová linka ani CI je
nepotřebují, protože názvy oborů čtou z indexu `data/msmt_rejstrik/nazvy-oboru.json`.
Snímek potřebuje jen člověk, který index přegenerovává
(`scripts/build-nazvy-oboru-rejstrik.py`) nebo dělá rešerši návazností.

Soubor a otisk bere z registru (`msmt-rejstrik-snimky`, `zobrazeno.soubor` a
`zobrazeno.sha256`), adresu ze sledované adresy sady (`aktualizace.sledovat`,
šablona `{ctvrtleti}`). Nový snímek se převezme příkazem `stav-datovych-sad.py
prepni`, který otisk zapíše; tenhle skript zdroj dat nemění.

Otisk je součástí zápisu, ne volitelná kontrola: zabraňuje tomu, aby se do
zpracování dostal jiný snímek, než se kterým jsou porovnaná data. Když se otisk
neshodne, skript **soubor nepřepíše** a skončí chybou — rozhodnout, že se mění
zdroj dat, musí člověk.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
import urllib.request
from pathlib import Path

KOREN = Path(__file__).resolve().parent.parent

REGISTR = KOREN / "public" / "stav_datovych_sad.json"


def snimek_z_registru() -> dict:
    """Soubor, otisk, adresa a období snímku, který registr zobrazuje."""
    sada = json.loads(REGISTR.read_text(encoding="utf-8"))["sady"]["msmt-rejstrik-snimky"]
    zobrazeno = sada["zobrazeno"]
    if not zobrazeno.get("sha256"):
        raise SystemExit("registr u snímku nemá otisk; převezměte snímek příkazem stav-datovych-sad.py prepni")
    sablona = sada["aktualizace"]["sledovat"][0]
    return {"cesta": KOREN / zobrazeno["soubor"], "sha256": zobrazeno["sha256"], "stav_k": str(zobrazeno["obdobi"]),
            "url": sablona.replace("{ctvrtleti}", str(zobrazeno["obdobi"]))}


SNIMEK = snimek_z_registru()


def otisk(cesta: Path) -> str:
    """sha256 souboru po blocích; snímek se do paměti celý nenačítá."""
    h = hashlib.sha256()
    with open(cesta, "rb") as f:
        for blok in iter(lambda: f.read(1024 * 1024), b""):
            h.update(blok)
    return h.hexdigest()


def stav() -> tuple[Path, str | None]:
    """Cesta ke snímku a jeho otisk, nebo `None`, když soubor není."""
    cesta = SNIMEK["cesta"]
    return cesta, otisk(cesta) if cesta.exists() else None


def stahni() -> Path:
    """Stáhne snímek do dočasného souboru, ověří otisk a teprve pak ho přesune."""
    cesta, mam = stav()
    if mam == SNIMEK["sha256"]:
        print(f"snímek {cesta.name} už je na místě a otisk souhlasí")
        return cesta
    if mam is not None:
        raise SystemExit(
            f"{cesta} existuje, ale má jiný otisk ({mam[:12]}… místo "
            f"{SNIMEK['sha256'][:12]}…). Skript ho nepřepíše: rozhodnout o změně "
            f"zdroje dat musí člověk: smaž soubor, nebo převezmi nový snímek příkazem prepni."
        )

    cesta.parent.mkdir(parents=True, exist_ok=True)
    rozpracovany = cesta.with_suffix(cesta.suffix + ".rozpracovany")
    print(f"stahuji {SNIMEK['url']}")
    urllib.request.urlretrieve(SNIMEK["url"], rozpracovany)  # noqa: S310 (adresa z registru)
    mam = otisk(rozpracovany)
    if mam != SNIMEK["sha256"]:
        rozpracovany.unlink(missing_ok=True)
        raise SystemExit(
            f"stažený snímek má otisk {mam[:12]}…, čekal se {SNIMEK['sha256'][:12]}…. "
            f"Zdroj se změnil, nebo se přenos poškodil; soubor jsem zahodil."
        )
    rozpracovany.replace(cesta)
    velikost = cesta.stat().st_size / 1048576
    print(f"snímek {cesta.name} stažen, {velikost:.1f} MB, otisk souhlasí")
    return cesta


def kontrola() -> int:
    cesta, mam = stav()
    if mam is None:
        print(f"snímek chybí: {cesta}")
        print("doplň ho příkazem: python3 scripts/stahni-rejstrik.py")
        return 1
    if mam != SNIMEK["sha256"]:
        print(f"snímek má jiný otisk než očekávaný: {mam[:12]}… / {SNIMEK['sha256'][:12]}…")
        return 1
    print(f"snímek {cesta.name} je na místě, stav rejstříku k {SNIMEK['stav_k']}")
    return 0


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--kontrola", action="store_true", help="jen ověří, nestahuje")
    a = p.parse_args()
    sys.exit(kontrola() if a.kontrola else (stahni() and 0))


if __name__ == "__main__":
    main()
