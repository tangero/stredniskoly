# Prohlížeč konfliktů návazností 2025–2026

Kontrolní nástroj zaměřený na jedinou otázku: v čem konflikt spočívá. Každý případ
ukazuje vedle sebe, co o téže nabídce říká 1. kolo 2025 a co rok 2026, a pod tím stav
oboru ve čtyřech snímcích rejstříku MŠMT. Sporná nabídka má barevný pruh: červený, když
v druhém roce chybí, zelený, když přibyla. Pozorování, zdroje, adresy a uzavřené otázky
jsou složené pod odkazem, aby nepřehlušily samotný rozdíl.

Doplňuje [prohlížeč výsledků](../vysledky-prohlizec/README.md), který zobrazuje celý
nález včetně všech podkladů.

## Sestavení

```sh
python3 tools/konflikty-prohlizec/build-data.py
```

Skript načte frontu, rejstříkový přehled a výsledky rešerše a zapíše `data.js`
vedle `index.html`. Stránka data načítá jako soubor, sama je proto malá a čitelná.

## Publikování

`index.html` a `data.js` se publikují společně jako artefakt; `data.js` musí být
vydán jako doprovodný soubor pod stejným jménem, na které odkazuje `<script src>`.

## Vstupy

- `docs/podklady/fronta-dohledavani-2025-2026.json` — nabídky obou ročníků a otázky
- `docs/podklady/rejstrik-k-fronte-2025-2026.json` — stav oboru ve snímcích rejstříku
- `docs/podklady/vysledky-navaznosti-2025-2026/*.json` — nálezy rešerše

## Filtry

Text hledá ve škole, obci, REDIZO, kódu oboru i ID úkolu. Dále lze filtrovat podle typu
návaznosti a stavu nálezu a omezit výpis na případy s otevřenou otázkou nebo s položkou
k rozhodnutí při přezkumu.
