# Prohlížeč konfliktů návazností 2025–2026

Kontrolní nástroj zaměřený na jedinou otázku: v čem konflikt spočívá. Každý případ
ukazuje vedle sebe právě tu dvojici nabídek, kterou nález páruje: vlevo rok 2025, vpravo
rok 2026, mezi nimi spojku s tím, co o dvojici tvrdí. Pod tím je stav oboru ve čtyřech
snímcích rejstříku MŠMT. Pozorování, zdroje, adresy a uzavřené otázky jsou složené pod
odkazem, aby nepřehlušily samotný rozdíl.

**Proč jen ta jedna dvojice.** Škola má u téhož kódu oboru často několik zaměření a jejich
pořadí ve zdrojovém souboru s párováním nesouvisí. Kdyby se vypsala všechna vedle sebe,
čtenář by je spároval podle řádků, a to bývá jiná dvojice, než nález tvrdí. Například
Gymnázium Na Pražačce má u kódu 79-41-K/61 tři zaměření, která se mezi roky páruje podle
významu po rozepsání zkratek: „estetickovýchovné předměty – zaměření na VV“ odpovídá
„Výtvarné výchově“, „vybrané předměty v cizím jazyce – zaměření na NJ“ odpovídá
„Německému jazyku“ a „všeobecné studim“ odpovídá „Všeobecnému“. V pořadí řádků je to
přeházené. Ostatní nabídky téhož oboru proto zůstávají ve složené části jako kontext.

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
