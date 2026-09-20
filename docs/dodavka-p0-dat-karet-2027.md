# P0 dat na kartách a návaznost O-13

Verze 1.2, 11. 9. 2026. **Nasazeno a veřejně ověřeno. P0 publikačních vad a celowebové O-13 uzavřeny v rozsahu níže. Aktualizace celého katalogu a nabídky 2027 dokončená není.**

## Dodaný rozsah

| Nález | Oprava P0 | Přejímka |
|---|---|---|
| A-02 / O-13 | Hlavní profil a detail sdílejí `StatsTab`. Z hlavičky, karet, záložek a metadat odstraněna číselná neověřená minima. JSON/MD a staré API neposkytují minimum jako hranici. Zrušen neověřený žebříček obtížnosti. Staré predikční komponenty nevykreslují doporučení. | Machar hlavní profil/detail/přehled; Bohosudov 4/8; `/skoly`, region; JSON/MD; test doručeného JS simulátoru. |
| A-02 / staré průvodce | `/pro-me` nabízí věcné otázky a odkaz do simulátoru, bez výpočtu z minima. `/moje-sance` trvale (308) směruje na udržovaný simulátor se zachováním parametrů dotazu. Konkurence v detailu neodvozuje doporučení z nedoložených bodů. | HTTP průvodce, redirect včetně výběru. |
| A-03 | Kontrakt předmětového skóre a sdílený renderer /50 na profilu i v detailu, bez soudů „lehčí/těžší“. Dohledatelný zdroj a převod, nulové/chybějící hodnoty rozlišeny. | 72,2 → 36,1 /50; 60,2 → 30,1 /50; skutečné TSX i HTML. |
| A-04 | Termíny a popis zkoušek InspIS jsou pod upozorněním „Pro rok 2027 neověřeno“, původní text pouze v zavřeném archivu. Neprovádí se odhad budoucího data z volného textu. | Přehled Bohosudova; renderer s daty 2024/2025, chybným 20236, bez roku a null. |
| A-05 | Přihlášky i výsledky se na obor párují jen jednoznačným plným klíčem. Odstraněna záchrana prvním kandidátem a závěr „neotevírají“. | Test kolize, zaměření, 4/6/8 let; integrační zachování konkrétního oboru. |
| A-06 | Výsledkový loader sdílí publikační kontrolu s kontextem, rozporný průměr není obnoven druhým JSONem. Pořadí/počty skupiny se přepočítají. Dopravní výpis používá stejné ověřené průměry 2026. | MESIT `600015611_64-41-L/51` vyřazen: 23 přijatých, ve zdroji 24 konajících přijatých. Runtime test rozporů a veřejně serializovaný přehled výsledků. |
| A-07 | Odstraněna predikce oscilace a záměna kapacity za přijaté. Banner neporovnává rozdílné množiny nabídek. Regionální trend používá jednoznačné plné ID v obou letech; chybějící rok není nula. Neověřená změna průměru 2026/2025 se nezobrazuje. | Zdrojové cesty, profil/banner/region, kontrola absence prediktivních formulací. |
| Další konzument dojezdu | API nevrací minimum ani legacy obtížnost/pásmo; výběr výchozího oboru nezávisí na minimu. Průměr je validovaný 2026 z /100, poptávka samostatně 2025. | Běžný i simulátorový kontrakt `/api/dostupnost`. |

## Ověření před nasazením

- 18 jednotkových/renderovacích testů (`p0-quality`, `admission-metric`, `detail-stats-render`, `s0`, `admission-summary`, `simulator-filter`).
- 26 integračních testů (`p0-pages`, `detail-stats`, `s0-api`, `simulator-transit`) nad izolovaným sestavením.
- TypeScript, cílený lint a produkční build. Lokální worktree používá webpack kvůli sdílené instalaci závislostí; Vercel musí navíc projít standardním buildem projektu.
- Mobilní kontrola hlavního profilu při šířce 390 px. Čtenář vidí jednotky, zdroj, historické počty a odkazy na další obory.
- Test doručeného JS dekóduje `\u`/`\x` zápis znaků, takže stejná kontrola funguje pro webpack i turbopack. Zakázané fráze se tím kontrolují také v escapovaném zápisu.

## Co uzavření P0 neznamená

Nejde o aktualizaci všech dat na 2027. Katalogová migrace, potvrzení nabídky, kapacit a kritérií 2027, nové kontakty/termíny škol a rozšíření mimo povinnou JPZ zůstávají navazující prací P1. Změna rozhraní neověřuje aktuálnost školného ani původní obsah inspekčních zpráv.

Souběžně zahájena inventura: `podklady/migrace-katalogu-2027/` obsahuje 1 004 nespárovaných nabídek (978 bez klíče, 26 v kolizi), stratifikovaný pracovní vzorek 100 a hashe zdrojů. Ručně potvrzených mapování: **0**. Automatické heuristické mapování není nasazené. Konzervatoře potřebují samostatný zdroj.

## Veřejná přejímka

Dokončena 11. 9. 2026 na `https://www.prijimackynaskolu.cz`. PR #81 a #82 sloučeny; aplikační commit `04c369fb7a4d9b5e360dfb76260932e92c75524c`. Vercel deployment `dpl_GVJ5hgb9y9k5pTG3XZ7mSbTHgMaZ` je READY s produkčními aliasy včetně www.prijimackynaskolu.cz.

Všech **26 veřejných integračních kontrol prošlo** (0 selhání). Mobilní prohlížeč potvrzuje 36,1 /50 a 30,1 /50 bez numerického minima v hlavičce. Na záložce Škola jsou staré údaje v zavřeném archivu s upozorněním na neověřený rok 2027; kontrola i při šířce 1440 px. Bez vodorovného přetékání. Důkazy: `podklady/audit-dat-karet-2027/p0-verejna-prejimka/` (výstup testů, strojový záznam, snímek mobilu).

Tím uzavíráme P0 publikačních oprav A-02 až A-07 a pokračování O-13. Toto rozhodnutí se neopírá jen o úspěšný build nebo jeden profil: matice zahrnuje přehledy, detail, průvodce, regionální souhrny, exporty, výsledkový a dopravní kontrakt. Katalog A-01 a P1 části jednotlivých nálezů zůstávají otevřené.


### Historie v1.1 — doplnění závěrečné kontroly před přejímkou

PR #81 prošlo standardním Vercel buildem a bylo sloučeno (`3eb9f1374029bdd2d7bf77b8cbc0ea539345efaf`). Před uzavřením se rozsah doplňuje o souhrnné karty regionů: neověřený průměr minimálních bodů je nahrazen počtem přihlášek 2025 a odstraněn i z loaderu. Markdown označuje poměr přihlášek jako poptávku, nikoli obtížnost přijetí. Přejímka zahrnuje i `/regiony`, ne pouze tabulku konkrétního kraje. Starý nepoužívaný renderer priorit již neobsahuje osobní predikční text. P0 zůstává do veřejného ověření tohoto doplnění otevřené.
