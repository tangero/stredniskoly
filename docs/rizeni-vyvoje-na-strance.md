# Řízení vývoje na jedné stránce

Shrnutí návrhu [Řízení vývoje 2027](navrh-rizeni-vyvoje-2027.md) (verze 0.13f, 4. 10. 2026). Závazný je
podrobný dokument. Tato stránka slouží k rychlé orientaci, a kdyby se s ním rozcházela, platí dokument.

## Jak to běží

| vstupy | AI průběžně | briefing (po, st, pá v 7:55) | vlastník |
|---|---|---|---|
| hlášení z webu, e-maily škol a rodičů, data CERMAT a MŠMT, návštěvnost, CI a nasazení | třídí, realizuje zadání a etapy (pravidelná úloha Claude Code; návrh počítá s denní, vlastník ji 4. 10. 2026 pustil každou hodinu), ověřuje na preview, dělá review (asistent zadání), slučuje automaticky přes bránu, hlídá rozpočet | asistent zadání v Grok Bot: nejvýš 3 nápady AI, zápis rozhodnutí potvrzený jedním „ok“ | rozhoduje štítkem, komentářem nebo na briefingu; zastaví cokoli štítkem `stop` |

Co se nasadilo, posílá asistent zadání po sloučení jako stručný souhrn lidskými slovy. Jednou týdně
přijde přehled do Telegramu se vším, co AI rozhodla za vlastníka, ke zpětné kontrole. Na tabuli projektu
ukazuje pole „Na co čeká“ u každé karty jednou větou, kde věc stojí.

## Kdo co rozhoduje

| běží samo (AI) | AI se souhlasem vlastníka (`schvaleno` na PR nebo zadání); od fáze 2 místo něj druhý klíč a karta | vždy vlastník |
|---|---|---|
| rutinní opravy z vlastních dat a kódu, drobná zadání s dokladem `Zdroj:` (po 48 h bez `stop`), etapy a drobné úkoly schválených projektů včetně připojených hlášení (hned), stahování z cizích serverů se zápisem zdroje, ověření na preview, sloučení, přehled | migrace databáze, e-maily odběratelům, portál a osobní údaje, SEO a adresy, závislosti, workflow, registr dat a slovník ukazatelů (`schvaleno` na PR nebo zadání), výdaje do limitu karty | nevyžádané rozesílky (školy, pořadatelé, novináři), rozšíření pravomocí AI (brána, `CLAUDE.md`, oprávnění workflow), právní závazky a placené zdroje, výdaje nad limit, směr a strategické projekty |

Pravidla, která platí vždy:

- `stop` zastaví cokoli, bez výjimky, a na projektu i všechny jeho úkoly.
- Souhlas platí jen pro rozsah nebo commit, který vlastník viděl. Po změně je potřeba nový souhlas.
- Drobnost rozhodnutá v rozhovoru se zapíše jako úkol s řádkem `Zdroj: vlastník` pod schválený projekt
  a nic dalšího od vlastníka nepotřebuje.
- AI (Claude Code a další boti) pracuje přes účet vlastníka, asistent zadání vlastním účtem. Pojistky
  chrání před chybou a podvrženým vstupem, ne před úmyslem AI; kontrola je zpětná v týdenním přehledu.

## Zavedení

| fáze | co přinese | stav |
|---|---|---|
| 0 | brána sloučení, režimy, štítky a pravidla | hotovo |
| 1 | brána v rulesetu bez obejití, slučování AI, automatické slučování, týdenní přehled, tabule podle štítků, Směr vývoje | hotovo (4. 10. 2026) |
| 2 | druhý klíč jiným modelem, migrace přes větev Neonu, výdaje kartou, opravy od škol | až po 1 až 2 týdenních přehledech |

Úspěch se měří minutami vlastníka týdně, počtem vyrušení (nejvýš 3 týdně), dobou do ověřeného nasazení
a závažností regresí.
