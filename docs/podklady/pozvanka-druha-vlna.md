# Druhá vlna pozvánek do Portálu pro školy

Zadavatel 23. 9. 2026 schválil rozeslání dalších 100 pozvánek. Navazuje na
[původní pilot 20 škol](pozvanka-pilot-uctu-portalu.md); první vlna se znovu
neoslovuje. Pozvánka druhé vlny neříká, že je škola mezi prvními dvaceti.

**Odesláno 23. 9. 2026:** Resend přijal všech 100 pozvánek. Prvních 97 prošlo
v hlavní dávce; u tří škol rejstřík uváděl dvě adresy v poli `Email 1` oddělené
středníkem, které Resend odmítl (HTTP 422). Po výběru první adresy z tohoto
pole prošly i zbývající tři. Datum odeslání je u každé školy v `pilot.json`.

Výběr vytvořil `scripts/portal-vyber-druhe-vlny.py` z rejstříkového CSV a
katalogu přijímacího řízení 2026. Všech 100 škol je ve
`data/portal/pilot.json` s `vlna: 2`; rejstříkové adresy a jména ředitelů jsou
jen v gitignorovaném `data/portal/pilot-kontakty.json`. Výběr pokrývá všech
14 krajů, 34 gymnázií a 66 odborných škol. Před odesláním se ověřuje, že
žádná vybraná škola už nemá správce v databázi.

Kódy v plaintextu zůstávají jen v gitignorovaném
`data/portal/kody-plaintext.json`; generátor zachovává dosavadní záznamy.
Hashe v `data/portal/kody.json` se musí nasadit na produkci **před** odesláním.
Ověření kódu na `/pro-skoly` ho nespotřebuje, dokončení registrace ano.

Z kořene repozitáře, po načtení `.env.local`:

```sh
node --experimental-strip-types scripts/portal-posli-pozvanky.mjs --vlna 2 --nanecisto
node --experimental-strip-types scripts/portal-posli-pozvanky.mjs --vlna 2 --jen <REDIZO> --na <vlastni@adresa> --opravdu
node --experimental-strip-types scripts/portal-posli-pozvanky.mjs --vlna 2 --opravdu
```

Poslední příkaz zapisuje úspěšná odeslání průběžně do `pilot.json`, takže po
přerušení lze spustit stejný příkaz znovu. Soubor s daty odeslání se poté
commituje. Parametr `--znovu` se pro druhou vlnu nepoužívá.
