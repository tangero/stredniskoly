# Dodávka rozhraní simulátoru 2027

Verze 1.0, 11. 9. 2026. Implementace schválené skici; stav nasazení doplněn po ověření.

## Rozsah

- Samostatný simulátor a odkaz do původního vyhledávače škol/měst.
- Deváťáci výchozí, přepínače 5./7. třídy a všech typů. Jde o filtrování dostupného katalogu, nikoli potvrzení úplnosti nabídky.
- „Co tě zajímá“ jako roleta skutečných názvů oborů z katalogu, více vybraných položek formou odnímatelných filtrů. Aktuálně 82 názvů a 2 777 jednoznačných nabídek v celém rozsahu.
- Přesný popisek uživatele **Čas na cestu tam v MHD**, vlastní limit 5–180 minut, posuvník, rychlé volby.
- Orientační dojezd od vybrané zastávky. Oddělené výsledky do limitu, do +10 minut a bez jednoznačného mapování místa výuky. Rozšíření limitu vyžaduje kliknutí.
- Uložení v prohlížeči, samostatný pohled výběru v rámci simulátoru, porovnání historie a veřejný odkaz obsahující pouze výběr. Staré odkazy se načítají včetně neznámých ID.
- Historie 2026 v rozbalení; žádné vrácení osobních predikcí. Stav otevření oboru 2027 se nepředstírá.
- Hlášení chyby na simulátoru je v běžném toku stránky, nepřekrývá výsledky.

## Datové a funkční hranice

Není to úplný katalog 2027 ani přesné hledání ranního spojení z adresy. Graf používá průměrný ranní profil, zahrnuje čekání a chůzi od zastávky ke škole. Cesta z domova k výchozí zastávce není zahrnuta. Pokrytí dopravy a platnost konkrétního spoje nejsou garantované; UI uvádí odhad a požadavek na ověření. Metadata grafu nemají datum platnosti jednotlivých spojů, mapování škol má datum generování 8. 2. 2026. Data se v této dodávce neobnovovala.

Nový dopravní režim API vrací whitelist údajů bez starých přijímacích minim či obtížnosti. Opraveno přiřazování jedné polohy více pobočkám: fallback přes REDIZO je dovolen pouze pro jedinou adresu. Opraven rozsah výpočtu tak, aby vůbec zahrnoval položky do +10 minut; původní smyčka je před sčítáním zahazovala.

Účet, synchronizace, společné tlačítko uložení na všech profilech, úplný pracovní plán, přihláškové pořadí, taxonomie zájmů a M0 nejsou touto dodávkou dokončeny. Výběr je lokální a v URL, nikoli serverová záloha. Nastavení filtrů a zastávky se při úplném znovunačtení inicializuje znovu; při přepínání výběru v rámci simulátoru zůstává zachováno. Sdílení nepřenáší zastávku, adresu ani dojezd.

## Ověření

- TypeScript a cílený ESLint bez chyb.
- 7 jednotkových kontrol (S0 a hranice dojezdu).
- 6 integračních kontrol S0: historie, slugy, staré výběry, absence predikčních větví.
- 2 nové integrační kontroly: bezpečný dopravní kontrakt a kompletní dostupný katalog bez porušení běžného stránkování.
- Prohlížeč: roleta skutečných oborů, zastávkový našeptávač, filtr, near miss, uložení a obnovení výběru, mobil bez horizontálního přetečení.
- Produkční build ověřován před vydáním; veřejný důkaz viz závěr záznamu.

Scénář dopravy: Andělská Hora, chaty, limit 30 minut. Dopravní API vrátilo 9 míst výuky do 40 minut, z nich dvě nad 30 minut. Po rozložení na obory a filtru deváťáků UI ukázalo 12 oborů do limitu a 7 těsně za ním. Školy, místa výuky a obory mají záměrně odlišné počty.
