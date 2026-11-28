# Kontroly pravidel

Pravidla projektu (`CLAUDE.md`, `.claude/claude.md`, slovník pojmů) hlídá vedle review i malé deterministické
kontroly v `scripts/pravidla/`. Zadání: issue #559. Kontrola, kterou review odhalí podruhé, se převádí na skript,
ne na další větu v pravidlech.

## Společný tvar

- Skript v `scripts/pravidla/`, výstup `soubor:řádek: co je špatně. Oprava: …`, nenulový návrat při novém nálezu.
- **Zmrazený základ** dnešního stavu (`scripts/pravidla/<kontrola>-zaklad.json`): hlásí se jen nové nálezy, starý
  dluh se uklízí postupně. Základ nese jen cesty a otisky, žádný text nálezu; otisk zapsaný u souboru vícekrát
  znamená víc známých výskytů, takže další výskyt téhož nálezu ve stejném souboru je nový nález. Přepis: `--obnov` s odůvodněním v commitu.
- Běží v CI přes test `tests/test_pravidla_kontroly.py` (`npm test`), ne přes workflow. Lokálně také `npm run kontroly`.
- Kontroly nic samy neopravují.
- Základ se zmrazuje proti stavu větve. Když mezitím jiný PR přidá do `main` text s nálezem, kontrola po sloučení
  `main` do větve selže na cizím řádku: text neopravuj (pravidlo 6), základ obnov přes `--obnov`, v commitu uveď
  nálezy a vypiš je do „Mimo rozsah“ v popisu PR.

## Kontroly

| Kontrola | Skript | Pravidlo | Co hlídá |
|---|---|---|---|
| Slova ze slovníku pojmů | `slova.py` | `.claude/claude.md`, Slovník pojmů, bod 1 | Slova ze sloupce „Nepoužívat“ v textech `src/app/**` a `src/components/**` |
| Osobní údaje | `osobni_udaje.py` | `CLAUDE.md`, pravidlo 4 | E-maily mimo `example.cz`, `example.com` a domény vyhrazené pro testy (`.test`, `.invalid`, `.example`) a čísla ve tvaru českého telefonu v `tests/`, `src/`, `scripts/`, `data/`, `docs/` |
| Ukazatele | `ukazatele.py` | `.claude/claude.md`, Slovník ukazatelů, body 1 a 2 | Ukazatel z registru sad bez zápisu ve slovníku ukazatelů; identifikátory ukazatelů bez doloženého výpočtu v kódu `src/` |
| Nová síťová volání | `sit.py` | `CLAUDE.md`, pravidlo 7 | Domény v adresách v souborech `src/` a `scripts/`, které volají síť, mimo seznam `povolene-servery.json` |

Připravená další etapa zadání: pravidlo „podruhé = kontrola“ a týdenní skript opakovaných nálezů (E3).

### Slova ze slovníku pojmů

- Bere jen položky **bez podmínky**. Podmíněná je položka se závorkou, středníkem, uvozovkami nebo zvýrazněním,
  položka začínající podmínkou („u čehokoli jiného…“, „mimo přehled“) a položka s dovětkem („kritéria bez roku“,
  „jako nadpis“, „mimo tento popisek“). Předložka uvnitř fráze podmínkou není: „obor bez přijímaček“ se kontroluje
  jako celá fráze. Podmíněné položky zůstávají na review; skript je při každém běhu vypíše všechny, každou na řádek.
- Text mezi značkami JSX se kontroluje i jednoslovný (nadpis, štítek). Jednoslovný řetězec v kódu jen tehdy, když
  má diakritiku nebo velké písmeno; `'export'` nebo `'top'` jako klíč nálezem není. Komentáře včetně `{/* … */}`
  a blokových přes víc řádků se vynechávají.
- Shoda je na celé slovo bez ohledu na velikost písmen; `top-0` v názvu CSS třídy nálezem není.
- Pádové tvary jsou ručně v `TVARY` v `slova.py`. Morfologický slovník by byl přesnější, ale je to nová závislost;
  seznam se rozšiřuje podle skutečných nálezů, ne odhadem.

### Osobní údaje

- Výjimky jsou jen v `scripts/pravidla/povolene-kontakty.json`: veřejné adresy projektu (každá s důvodem)
  a soubory s kontakty z oficiálních zdrojů dat (výjimka podle souboru, ne podle adresy).
- Smyšlené adresy nálezem nejsou: `example.cz`, `example.com` (pravidlo 4) a domény vyhrazené pro testy a příklady
  `.test`, `.invalid`, `.example` (například `rodic@example.test`).
- Výpis ani základ hodnotu nálezu neopisují.
- Zmrazený základ obsahuje i dnešní nálezy v testech a dokumentech, které pravidlo 4 porušují. Jejich úklid
  (nahradit smyšlenými adresami) je samostatné zadání.

### Ukazatele

- Registr sad (`public/stav_datovych_sad.json`) vede ukazatele **názvem**, ne identifikátorem. Kontrola proto
  porovnává názvy z polí `ukazatele` a `ukazatele_z_vice_sad` s nadpisy slovníku ukazatelů, stejně jako
  `scripts/stav-datovych-sad.py kontrola`. Nález míří na řádek registru.
- Identifikátory bez doloženého výpočtu bere z nadpisů oddílu „Ukazatele bez doloženého výpočtu“ slovníku
  (v obrácených apostrofech, dnes `obtiznost`, `category_code`, `category_name`). Hledá je jako celé slovo
  v `src/**/*.ts(x)` mimo komentáře a testy. Nový ukazatel v tom oddílu se začne hlídat sám.
- Dnešní výskyty jsou ve zmrazeném základu. Otisk je jen identifikátor, takže přesun řádku nálezem není, ale
  další výskyt v témže souboru ano.

### Nová síťová volání

- Soubor „volá síť“, když obsahuje `fetch(` nebo klienta HTTP (`axios`, `requests`, `urllib.request`, `httpx`…).
  V takovém souboru se kontrolují všechny domény v adresách `http(s)://…` mimo komentáře, tedy i odkazy a jmenné
  prostory; ty jsou v seznamu s poznámkou „není volání“.
- Seznam `scripts/pravidla/povolene-servery.json` vede u každé domény účel a soubor s dokumentací. Při zavedení
  byl naplněn tehdejším stavem, základ je proto prázdný.
- Nová doména je nález: zdroj zapiš do `docs/zdroje-dat.md`, doménu do seznamu a volání přidej jen podle zadání.
- Kontrola nevidí adresu složenou za běhu (proměnná prostředí, adresa z dat, například weby škol ve sklízeči).
  Takové volání dál hlídá review.
