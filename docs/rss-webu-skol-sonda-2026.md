# Sonda: RSS/Atom zdroje na webech středních škol

**Datum:** 19. 9. 2026
**Otázka:** mají školní weby deklarované RSS/Atom zdroje, ze kterých by šlo automaticky stahovat novinky a zobrazovat je u školy na webu?
**Metoda:** `scripts/sonda-rss-webu-skol.py` – pro 1 093 webů škol z katalogu (unikátní REDIZO z `public/souhrny_kolo1.json`, adresy z `public/skoly_web.json`) stáhne titulní stránku, hledá `<link rel="alternate" type="application/rss+xml|atom+xml">`, u webů bez deklarace zkusí typické cesty (`/feed`, `/rss.xml`, `/rss`, `/feed.xml`, `/atom.xml`) a každý nalezený zdroj ověří stažením. Data: `data/sondy/rss-webu-skol-20260919.json`.

## Výsledek: feed má zhruba polovina škol

| Krok | Škol | Podíl |
| --- | ---: | ---: |
| Sondováno (střední školy z katalogu s WWW) | 1 093 | 100 % |
| Titulní stránka načtena (HTTP 200) | 979 | 89,6 % |
| Deklaruje feed v titulce | 472 | 43,2 % |
| … z toho feed skutečně platný | 453 | 41,4 % |
| Feed jen na typické cestě (bez deklarace) | +59 | |
| **Celkem s funkčním feedem** | **512** | **46,9 %** |

Feedem pokryté školy odpovídají **1 492 z 3 216 nabídek (46,4 %)**.

**Přesondování po opravách z oponentur (19. 9. 2026):** opraveny relativní odkazy (vůči finální URL po redirectech), fallback cesty i u škol s deklarovanými, ale neplatnými feedy, a základ fallbacku z finální URL (druhá oponentura R6). Výsledek: **533 škol (48,8 %) s funkčním feedem**. Data v témže souboru, sonda zůstává reprodukovatelná.

Typy deklarací: `application/rss+xml` 710×, `application/atom+xml` 522×. 340 škol deklaruje víc feedů – typicky WordPress s hlavním feedem + `comments/feed` (při sklízení filtrovat, komentáře nejsou novinky).

## CMS: převážně WordPress

Meta `generator` na titulkách: WordPress 139 (+19 „wp"), Elementor 68 (WordPress plugin), Joomla! 37, Drupal 21, Wix 11, Webnode 9. WordPress ekosystém tvoří zhruba polovinu sondovaných webů – proto je `/feed` fallback tak úspěšný (39 z 59 nalezených).

## Čerstvost a obsah (vzorek 40 náhodných feedů)

- čitelných 39/40; počet položek: medián 10, rozsah 1–20
- poslední položka: **do 7 dní 20×, do 30 dní 28×, do 90 dní 33×**, starší než rok jen 4× (mrtvé weby, typicky „Hello world!" u PRIGO šablon)

Obsah je přímo relevantní pro návštěvníky našeho webu: „Výsledky příjímacího řízení 2026 – 2. kolo", „Volná místa pro žáky do 1. ročníků nemáme", „Maturity – termíny profilových zkoušek", dny otevřených dveří, imatrikulace, Erasmus, sportovní výsledky. Občas se objeví dokumenty (provozní řád) – vyplácí se šřtít podle kategorie/tagů, pokud je feed nese.

## Známé nejistoty měření

- 114 webů sondě neodpovědělo použitelně (48 nedostupných, 50× 401, zbytek 4xx/5xx). Opakování s prohlížečovou UA vytěžilo jen 1 další školu – jde o skutečně mrtvé nebo boty odfiltrované weby, ale díl 401 je pravděpodobně anti-bot ochrana, která by v pravidelném sklízení s rozumným UA mohla projít částečně. Reálné pokrytí tedy spíš o něco vyšší než 46,9 %.
- Adresy pocházejí z rejstříku MŠMT a občas jsou zastaralé (redirecty, zaparkované domény).

## Co z toho plyne pro zamýšlenou funkci

Stahovat novinky z feedů **se vyplatí**: téměř polovina škol má živý, aktuální zdroj a obsah je k přijímačkám přímo užitečný. Návrh postupu:

1. **Registr feedů** – jednorázově z výsledků sondy (512 škol) + průběžná detekce u nových škol. Uložit `feed_url` k REDIZO (např. `public/skoly_feedy.json` generovaný ze sondy).
2. **Sklízeč** (cron 1–2× denně, slušné UA, `If-Modified-Since`/`ETag`): stáhne feed, zparsuje položky (titulek, odkaz, datum, perex), deduplikuje podle GUID/URL, zahodí `comments/feed` a položky starší než ~60 dní.
3. **Zobrazení u školy** – posledních 3–5 novinek na stránce školy jako titulek + datum + externí odkaz. Plný text nepřebírat (autorská práva; titulek+odkaz je standardní syndikace, k tomu feed slouží).
4. **Bonus pro přijímačky:** položky s klíčovými slovy (přijímací řízení, den otevřených dveří, volná místa) povýšit nebo dát do souhrnné přehledové stránky.
5. **Hygiena:** dead-feed detekce (mrtvý >1 rok → skrýt), respektovat robots.txt/`Retry-After`, max. frekvence 1×/den a web.

Krok 1 i prototyp kroku 2 je otázka hodin – data ze sondy už leží v `data/sondy/`.
