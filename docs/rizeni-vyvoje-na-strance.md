# Řízení vývoje na jedné stránce

Shrnutí návrhu [Řízení vývoje 2027](navrh-rizeni-vyvoje-2027.md) (verze 0.11b). Závazný je podrobný
dokument. Tato stránka slouží k rychlé orientaci, a kdyby se s ním rozcházela, platí dokument.

## Jak to běží

| vstupy | AI průběžně | porada (po, st, pá v 7:55) | vlastník |
|---|---|---|---|
| hlášení z webu, e-maily škol a rodičů, data CERMAT a MŠMT, návštěvnost, CI a nasazení | třídí, opravuje, realizuje etapy, ověřuje na preview, slučuje přes bránu, hlídá rozpočet | **Urgentní · Ke schválení · Důležité novinky · Tvoje rozhodnutí** | odklikne, upraví, zastaví (`stop`), nebo nechá být |

Zpětná vazba: úpravy a zamítnutí vlastníka AI převádí na obecná pravidla. V pátek je ukáže, aby je
vlastník mohl opravit.

## Kdo co rozhoduje

| běží samo (AI) | AI s pojistkou (druhý klíč, lhůta) | vždy vlastník |
|---|---|---|
| rutinní opravy z vlastních dat a kódu, drobná zadání (po 48 h bez `stop`), etapy projektů v dohodnutém mandátu, ověření na preview, přehled | migrace databáze, nová data a cizí servery, výdaje do limitu karty, e-maily odběratelům, portál a osobní údaje, SEO a adresy, závislosti | nevyžádané rozesílky (školy, pořadatelé, novináři), rozšíření pravomocí AI, právní závazky, výdaje nad limit, směr a strategické projekty |

Pravidla, která platí vždy:

- `stop` zastaví cokoli, bez výjimky.
- Souhlas platí jen pro rozsah, který vlastník viděl. Změněný rozsah potřebuje nový souhlas.
- AI nikdy nepracuje s přihlášením vlastníka. Pojistky (ruleset, brána, limit karty, záloha databáze)
  leží mimo dosah AI.

## Zavedení

| fáze | co přinese | práce vlastníka |
|---|---|---|
| 0, hned | produkční secrets jen pro `main`, tokeny vlastníka nahrazené aplikací a strojovým účtem | založit aplikace, strojový účet a prostředí `production` |
| 1, týden 1–2 | konec ručního merge a kontroly preview | ruleset bez výjimek, povinné review vlastníka kódu |
| 2, týden 3–4 | druhý klíč, migrace, výdaje, nová data, opravy od škol | virtuální karta s limitem |

Každá fáze se zapne až po svých přejímacích scénářích. Úspěch se měří minutami vlastníka týdně,
počtem vyrušení (nejvýš 3 týdně), dobou do ověřeného nasazení a závažností regresí.
