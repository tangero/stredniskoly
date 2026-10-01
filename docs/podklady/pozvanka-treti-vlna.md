# Třetí vlna pozvánek do Portálu pro školy

Zadavatel 1. 10. 2026 rozhodl oslovit všechny zbývající způsobilé školy. Právní
posouzení pro plošné oslovení má zadavatel vyřešené. Pozvánka je jednorázová
žádost o spolupráci, ne pravidelné sdělení, a proto nemá odkaz na odhlášení.
Škola, která nemá zájem, kód nepoužije nebo odpoví na adresu odesílatele.

**Odesláno 1. 10. 2026:** Resend přijal všech 665 pozvánek, skript skončil
bez chyby. Před odesláním se na produkci ověřilo, že web přijímá první
i poslední kód vlny (`POST /api/portal/kod` vrátil `volny`; dotaz kód
nespotřebuje), a zkušební pozvánka šla na adresu zadavatele. Datum odeslání je
u každé školy v `pilot.json`. Osloveno je tím 785 z 1 120 škol katalogu 2026.

## Rozhodnutí zadavatele (1. 10. 2026)

| otázka | rozhodnutí |
|---|---|
| Právní posouzení plošného oslovení | v pořádku, vyřešeno zadavatelem mimo projekt; platí i pro další vlny |
| Odkaz na odhlášení v pozvánce | nepřidává se: pozvánka je jednorázová žádost o spolupráci, ne opakované sdělení |
| Kvóta Resendu | dostačuje i pro stovky zpráv v jedné dávce |
| Další vlna | soukromé a církevní školy, „za další dobu“, termín neurčen (oddíl Čtvrtá vlna) |

## Stav před třetí vlnou (1. 10. 2026, produkční databáze, jen čtení)

| vlna | osloveno | správce založen | podíl |
|---|---|---|---|
| 1 (pilot, 22. 9.) | 20 | 3 | 15 % |
| 2 (23. 9.) | 100 | 13 | 13 % |
| celkem | 120 | 16 | 13 % |

Z 13 registrací druhé vlny přišlo 11 do dvou dnů od odeslání. Profil
vyplnilo 15 ze 16 škol se správcem, kritéria přijetí zatím žádná, editora
nepozvala žádná škola.

## Výběr

`scripts/portal-vyber-vlny.py --vlna 3 --pocet vse` vybral všech 665 škol, které
splňují kritéria druhé vlny (veřejný zřizovatel, úplné výsledky PŘ 2026,
rejstříkový e-mail, ředitel, web a datová schránka, e-mail jedinečný
v rejstříku, bez předchozí pozvánky a aktivního kódu): 214 gymnázií a 451
odborných škol ze všech 14 krajů. Školy jsou v `data/portal/pilot.json`
s `vlna: 3`, kontakty v gitignorovaném `data/portal/pilot-kontakty.json`.

Mimo všechny tři vlny zůstává 335 škol katalogu 2026, každá je započtená jednou:

| důvod | škol |
|---|---|
| soukromý zřizovatel (kritéria vylučují) | 283 |
| církevní zřizovatel (kritéria vylučují) | 36 |
| škola není v rejstříkovém adresáři | 10 |
| v rejstříku chybí ředitel, web nebo datová schránka | 4 |
| e-mail sdílí jiná škola | 1 |
| zkušební škola s aktivním kódem | 1 |

Školy první vlny mají v `pilot.json` výslovně `vlna: 1`; metadata výběru
druhé a třetí vlny jsou pod klíčem `vlny`.

Text pozvánky je stejný jako u druhé vlny. Šablona dřív rozlišovala jen
`vlna === 2`, takže třetí vlna by dostala pilotní text „mezi dvacet škol“.
Pilotní text má nyní jen výslovná `vlna: 1`; bez čísla vlny jde obecný text.

## Odeslání

Hashe 665 nových kódů v `data/portal/kody.json` musí být na produkci
**před** odesláním, tedy po merge a nasazení PR. Z kořene repozitáře, po
načtení `.env.local`:

```sh
node --experimental-strip-types scripts/portal-posli-pozvanky.mjs --vlna 3 --nanecisto
node --experimental-strip-types scripts/portal-posli-pozvanky.mjs --vlna 3 --jen <REDIZO> --na <vlastni@adresa> --opravdu
node --experimental-strip-types scripts/portal-posli-pozvanky.mjs --vlna 3 --opravdu
```

Před odesláním skript ověří každý kód funkcí `validateKod`, kterou používá
přihlášení, proti `data/portal/kody.json`; když některý nesedí, neodešle nic.
Potřebuje k tomu `PORTAL_KOD_PEPPER` z `.env.local`. Jestli jsou hashe už na
produkci, nepozná: před ostrým odesláním ověřte zkušebním kódem na
`/pro-skoly`, že ho web přijme (zadání kódu ho nespotřebuje).

Skript posílá zhruba 1,7 zprávy za sekundu, 665 škol trvá asi 7 minut. Úspěšná
odeslání zapisuje průběžně do `pilot.json`; po přerušení stačí spustit stejný
příkaz znovu. Administrace (`/admin/portal/pozvanky`) odešle jedním
potvrzením nejvýš 20 škol; skript a administraci nespouštějte současně,
oba přepisují `pilot.json`.

## Čtvrtá vlna: soukromé a církevní školy (připraveno k pozdějšímu pokračování)

Zadavatel 1. 10. 2026 rozhodl, že se po vyhodnocení třetí vlny bude pokračovat
školami soukromých (zřizovatel 5) a církevních (zřizovatel 6) zřizovatelů.
Dosavadní kritéria je vylučovala, jinak se výběr nemění.

Stav 1. 10. 2026 (katalog 2026, rejstříkový adresář v `data/Rejstrik_skol/Adresar.csv`):

| zřizovatel | v katalogu, neosloveno | splňuje ostatní kritéria | gymnázium / odborná | vypadne |
|---|---|---|---|---|
| soukromý (5) | 283 | 258 | 81 / 177 | 11 bez ředitele, webu nebo datové schránky; 14 sdílený nebo neplatný e-mail |
| církevní (6) | 36 | 35 | 20 / 15 | 1 sdílený e-mail |
| celkem | 319 | **293** | 101 / 192 | 26 |

Ostatních 16 neoslovených škol katalogu se do čtvrté vlny nepočítá: 10 není
v rejstříkovém adresáři, 4 veřejným chybí ředitel, web nebo datová schránka,
1 sdílí e-mail a 1 je zkušební škola s aktivním kódem.

Co je potřeba udělat před čtvrtou vlnou:

1. **Vyhodnotit třetí vlnu.** Registrace a vyplněné profily podle vln z
   produkční databáze (jen čtení: `portal_role`, `portal_kod_uplatneni`,
   `portal_profil`, párování na `vlna` v `pilot.json`). Ve vlně 1 a 2 se
   registrovalo 13–15 %, většina do dvou dnů od odeslání.
2. **Rozšířit výběr o zřizovatele.** `scripts/portal-vyber-vlny.py` dnes vylučuje
   zřizovatele 5 a 6 napevno. Přidat volbu (například `--zrizovatel 5,6`), která
   vybere jen je, a zapsat ji do kritérií ve `vlny['4']`. Všechno ostatní
   (úplné údaje v rejstříku, jedinečný e-mail, úplná data PŘ, bez kódu) platí dál.
3. **Rok dat.** Skript bere katalog `['2026']` a „PŘ 2026“ v kritériích
   napevno. Pokud se mezitím přepne katalog na 2027, vzít období
   z `public/stav_datovych_sad.json` (pravidlo o letopočtech v `.claude/claude.md`).
4. **Zvážit text pozvánky.** Pro soukromou školu je profil spíš propagace než
   povinnost; obecný text druhé a třetí vlny („zdarma a nic není povinné“) platí,
   ale zadavatel může chtít jiný akcent. Šablona je
   `pozvankaDoPilotu` v `src/lib/portal-email.ts`; každá vlna kromě 1 dostává
   obecný text.
5. **Kódy a nasazení** stejně jako u třetí vlny: `portal-generate-codes.js
   --soubor … --out data/portal/kody-plaintext.json`, PR s `pilot.json` a
   `kody.json`, merge, nasazení, ověření kódu přes `POST /api/portal/kod`,
   zkouška na vlastní adresu, `portal-posli-pozvanky.mjs --vlna 4 --opravdu`,
   PR se záznamem odeslání.

Gitignorované vstupy (`kody-plaintext.json`, `pilot-kontakty.json`,
rejstříkový adresář) jsou jen na počítači zadavatele v hlavním adresáři
repozitáře; bez nich se nedá vybírat ani posílat.
