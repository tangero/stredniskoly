# Kontroly pravidel

Pravidla projektu (`CLAUDE.md`, `.claude/claude.md`, slovník pojmů) hlídá vedle review i malé deterministické
kontroly v `scripts/pravidla/`. Zadání: issue #559. Kontrola, kterou review odhalí podruhé, se převádí na skript,
ne na další větu v pravidlech.

## Společný tvar

- Skript v `scripts/pravidla/`, výstup `soubor:řádek: co je špatně. Oprava: …`, nenulový návrat při novém nálezu.
- **Zmrazený základ** dnešního stavu (`scripts/pravidla/<kontrola>-zaklad.json`): hlásí se jen nové nálezy, starý
  dluh se uklízí postupně. Základ nese jen cesty a otisky, žádný text nálezu. Přepis: `--obnov` s odůvodněním v commitu.
- Běží v CI přes test `tests/test_pravidla_kontroly.py` (`npm test`), ne přes workflow. Lokálně také `npm run kontroly`.
- Kontroly nic samy neopravují.

## Kontroly

| Kontrola | Skript | Pravidlo | Co hlídá |
|---|---|---|---|
| Slova ze slovníku pojmů | `slova.py` | `.claude/claude.md`, Slovník pojmů, bod 1 | Slova ze sloupce „Nepoužívat“ v textech `src/app/**` a `src/components/**` |
| Osobní údaje | `osobni_udaje.py` | `CLAUDE.md`, pravidlo 4 | E-maily mimo `example.cz` a `example.com` a čísla ve tvaru českého telefonu v `tests/`, `src/`, `scripts/`, `data/`, `docs/` |

Připravené další etapy zadání: kontroly ukazatelů a nových síťových volání (E2), pravidlo „podruhé = kontrola“
a týdenní skript opakovaných nálezů (E3).

### Slova ze slovníku pojmů

- Bere jen položky **bez podmínky** (bez závorky, středníku a doplňku typu „bez čísla“, nejvýš tři slova).
  Podmíněné položky zůstávají na review; skript je při každém běhu vypíše jako nekontrolované.
- Shoda je na celé slovo bez ohledu na velikost písmen; `top-0` v názvu CSS třídy nálezem není.
- Pádové tvary jsou ručně v `TVARY` v `slova.py`. Morfologický slovník by byl přesnější, ale je to nová závislost;
  seznam se rozšiřuje podle skutečných nálezů, ne odhadem.

### Osobní údaje

- Výjimky jsou jen v `scripts/pravidla/povolene-kontakty.json`: veřejné adresy projektu (každá s důvodem)
  a soubory s kontakty z oficiálních zdrojů dat (výjimka podle souboru, ne podle adresy).
- Výpis ani základ hodnotu nálezu neopisují.
- Zmrazený základ obsahuje i dnešní nálezy v testech a dokumentech, které pravidlo 4 porušují. Jejich úklid
  (nahradit smyšlenými adresami) je samostatné zadání.
