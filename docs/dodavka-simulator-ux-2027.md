# Dodávka rozhraní simulátoru 2027

Verze 1.0, 11. 9. 2026. Implementace schválené skici; nasazeno a veřejně ověřeno.

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

## Veřejná přejímka

- PR [#75](https://github.com/tangero/stredniskoly/pull/75), implementace `397a80fdc00c5b83e60badf93cd19f33de9b90db`, sloučení `51c814035d68769998e4fb591fabb2305fee7620`.
- Vercel produkce `dpl_CtseRUetj8Dsn4HwSxWrfcHwwgp1`, READY, veřejný alias `www.prijimackynaskolu.cz`.
- Veřejná aplikace obsahuje „Které školy mi vyhovují?“ a požadovaný popisek „Čas na cestu tam v MHD“. Kontrola mobilního viewportu bez horizontálního přetečení; tlačítko hlášení chyby je relativní, nikoli plovoucí.
- Všech 8 integračních testů prošlo i proti veřejné doméně. Záznam v `podklady/simulator-ux-2027/produkce-testy.txt`, snímek `produkce-mobil.png`.
- Lokálně navíc ověřeno načtení uloženého výběru při novém vstupu na čistou URL a maximální limit 180 minut od Praha hlavní nádraží (HTTP 200, prohledaný rozsah 190 minut).
- Následný commit přejímky mění pouze dokumentaci, nikoli ověřený kód aplikace.

Čas veřejné kontroly: 2026-09-11T14:53:28.503341+00:00

## Doplnění 1.1: dojezd a územní omezení

Podle další zpětné vazby uživatele má aktivní dojezd přednost před městem a krajem. Územní filtry jsou během dojezdu neaktivní a neomezují výsledky ani skupinu těsně za limitem. Po vypnutí dojezdu se obnoví; jejich uplatnění ukazuje souhrn nad výsledky.

Textové hledání oboru a zaměření již neprohledává město. Pro lokalitu je samostatná roleta měst/obcí z katalogu. Nad výsledky je vždy uveden aktivní rozsah: dojezd, město/kraj nebo celá ČR. Obory a typ studia platí v obou režimech. Jednotková regrese ověřuje, že škola mimo původní město i kraj zůstane při dojezdu způsobilá a po vypnutí dojezdu znovu podléhá územnímu filtru.

Přejímka 1.1: PR #76, merge `d0e515faad9161ff66f602120a9dc9b866038c24`, Vercel `dpl_BRwgpT9CmkfsdyJJahwkjNXYeiJq` READY. Produkční prohlížeč potvrdil scénář Praha → výchozí zastávka Andělská Hora, chaty → výsledky v Karlových Varech bez územního omezení → vypnutí dojezdu obnoví město Praha. Lokálně navíc ověřen současně vybraný kraj Praha, produkční build, TypeScript, cílený lint a 8 jednotkových kontrol. Následný záznam mění pouze dokumentaci.

## Doplnění 1.2: výsledky přímo na kartě a další nabídky školy

Po zpětné vazbě uživatele vráceny ověřené výsledky z rozbalení do hlavního výpisu. Výrazný název školy a oboru doplňuje panel: průměr JPZ přijatých / 100, konkurence jako počet přihlášek na místo (včetně surových počtů) a přijatí / kapacita. Rok 2026 a první kolo jsou explicitní; skóry předmětů a zdroj jsou v detailu. Průměr není minimum a poměr přihlášek není osobní pravděpodobnost přijetí. Prázdná či nejednoznačně spárovaná hodnota zůstává neznámá.

Přihlášky se nově připojují k search API přes úplný normalizovaný klíč a jednoznačný index dat 2026, bez fallbacku na školu nebo obor bez zaměření. Konkurence se počítá z počtu přihlášek a kapacity téže nabídky, nula kapacity není platný jmenovatel.

Každá karta ukazuje počet dalších nabídek stejné instituce (REDIZO) v dostupném katalogu. Po rozbalení jsou vidět i jiné obory, zaměření, délky a místa výuky. Nejde o tvrzení, že všechny nabídky jsou ve stejné budově nebo potvrzené pro rok 2027. Každá má vlastní údaje a uložení; odlišný typ/obor/lokalita nebo nadlimitní dojezd jsou označené. Další nabídky se nezapočítávají do výsledků vyhovujících filtrům.

Lokální přejímka 1.2: produkční build, TypeScript a cílený lint bez chyb; 9 jednotkových a 9 integračních kontrol prošlo. Původní kontrola přesného znění upozornění byla aktualizována na nové vysvětlení průměru a konkurence; zákaz predikčních větví zůstává. V prohlížeči ověřena mobilní karta s reálnými údaji (ekonomika a podnikání, 33,33 bodu, 49 přihlášek / 15 míst, 12 přijatých), rozbalení dalších oborů a jejich uložení. Žádné vodorovné přetečení.

Veřejná přejímka 1.2: PR #77, merge `4418d6bcfd59f926552b9cbb16dcb2cc5637b61d`, Vercel `dpl_7AcBh25XLV7ujMFsoy4xw3rQVHFh` READY. Proti veřejné doméně prošlo 9 integračních kontrol. Veřejný prohlížeč potvrdil konkrétní výsledky na kartě školy v Kladně, dvě související nabídky s vlastními datovými stavy a mobil bez přetečení. Doklady: `podklady/simulator-ux-2027/produkce-karty-testy.txt` a `produkce-karty-obory.png`. Následný commit mění jen dokumentaci.

## Doplnění 1.3 — úvodní žebříček (11. 9. 2026)

Na požadavek uživatele simulátor bez věcných omezení zobrazuje žebříček místo abecedního výpisu všech nabídek. Výchozí deváťáci ani přepnutí skupiny studia samo nevypíná žebříček; aktivní obor, textové upřesnění, město, kraj nebo vybraná zastávka přepínají do výsledků hledání. Nevybraná zastávka ani samotné nastavení minut neomezují hledání.

Řazení je sestupně podle ověřeného průměru JPZ přijatých 2026, shody stabilně podle ID. Jednotkou je nabídka oboru, nikoli unikátní instituce. Nad seznamem je vysvětlení, že výsledky přijatých nejsou hodnocením kvality školy ani osobní šancí. Obory bez ověřeného průměru nejsou v žebříčku, přes filtry zůstávají dostupné. Zadržený průměr z datového auditu nemá fallback na starší skóre.

Stránkování po 20 položkách a rozložení čísel s výpustkami odpovídá `RegionSchoolsTable`. Její výchozí řazení používá historické minimum JPZ; toto neověřené kritérium se nepřebírá. Žebříček používá platný průměr přijatých. Změna podmínek resetuje stránku na 1, navigace stránkou posune pohled k výsledkům. Můj výběr zachovává uložené pořadí a není stránkován tímto žebříčkem.

Lokálně prošel TypeScript, build, cílený lint bez varování, 3 testy statistických helperů a 11 integračních kontrol. V prohlížeči ověřeno 20 karet na stránce, přechod 1–20 → 21–40, přepnutí na filtrované výsledky a reset po zrušení filtru. Mobil 390 px bez horizontálního přetékání. Veřejná přejímka zatím nepotvrzena.
