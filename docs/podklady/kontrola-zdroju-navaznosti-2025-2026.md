# Kontrola zdrojů rešerše návazností 2025–2026

Datum kontroly: 12. 9. 2026 · Nástroj: `python3 scripts/check-continuity-sources.py`

Každý externí odkaz z pole `evidence` byl jednou stažen. Ze 461 odkazů jich 443 vrátilo
HTTP 200. Zbývajících 18 je rozepsáno níže; u žádného nejde o vymyšlený zdroj.

## Dočasné odmítnutí webového archivu (12 odkazů)

Odkazy na `web.archive.org` vracejí při hromadné kontrole HTTP 503 nebo vyprší časový limit.
Jde o ochranu archivu proti zátěži, nikoli o neexistující snímek. Týká se úkolů
R-600004554, R-600005542, R-600005658, R-600005666, R-600005836, R-600006131,
R-600007332, R-600007464 a R-600009602.

## Chyba certifikátu na straně serveru (2 odkazy)

| Odkaz | Úkol | Zjištění |
|---|---|---|
| `sosprostejov.cz/podnikani/` | R-600015289 | Server posílá neúplný řetěz certifikátů. Bez ověření certifikátu odpovídá přesměrováním, stránka existuje. |
| `ehutnik.cz/zpravy/stredni-skola-jablunkov-otevre-obchodni-akademii` | R-600171183 | Stažení přes `curl` vrací HTTP 200; chyba byla jen v ověřovacím skriptu, ne na webu. |

## Odpověď 404, která je sama součástí důkazu (1 odkaz)

`soskh.cz/obory/mechanik-elektronik/` u úkolu R-600007294 vrací 404 záměrně: nález se opírá
právě o to, že škola stránku oboru z webu odstranila, když obor přestala nabízet.

## Odkazy k opravě (2 odkazy)

| Odkaz | Úkol | Stav |
|---|---|---|
| `heroldovysady.cz/prijimaci-rizeni-2026` | R-600004929 | Skutečně neexistuje. Byl to jen doplňkový kontext k celostátnímu oboru 78-42-M/08, závěr nálezu na něm nestojí. Odstranit nebo nahradit při příští revizi. |
| `gymnaziumdc.cz/skola/novinka/prijimaci-rizeni` | R-600010198 | Stránka existuje, web ale odmítá automatizované stahování (vrací 403 i 404). Obsah odpovídá citaci: dvě třídy všeobecného zaměření po 56 místech a jedna humanitní s 30 místy. Odkaz je v pořádku, jen není strojově ověřitelný. |
