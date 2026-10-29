-- #556: zprávy z výpisů aktualit, jejichž titulek čtečka slila s úvodem článku.
-- Čtečka (scripts/novinky_vypis.py) teď titulek ukončuje na hranici odkazu nebo nadpisu
-- položky. U zpráv bez vlastního článku je identita `adresa výpisu#otisk titulku`, takže
-- zkrácený titulek znamená novou identitu a stará zpráva by zůstala vedle nové (zdvojení).
-- Starý záznam se proto zneplatní a další běh sklízeče uloží zprávu s novým titulkem.
-- Zasahuje jen čtyři školy z vyhodnocení z 9. 10. 2026 a jen zprávy s identitou s otiskem
-- titulku a titulkem delším než 100 znaků. Idempotentní: zneplatněné řádky se už nemění.
-- Spouští vlastník; neupravuje obsah titulků, jen označí staré záznamy.
update skola_novinka
   set zneplatneno = now(), zmeneno = now()
 where redizo in ('600015700', '600009327', '600171337', '600018083')
   and zneplatneno is null
   and identita ~ '#[0-9a-f]{16}$'
   and char_length(titulek) > 100;
