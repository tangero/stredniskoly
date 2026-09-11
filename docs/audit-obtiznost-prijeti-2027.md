# Audit „Obtížnosti přijetí“ na profilu oboru

Verze 1.0, 11. 9. 2026. Posuzovaný obor: Technické lyceum Gymnázia J. S. Machara, úplné ID `600007774_78-42-M/01`.

## Závěr

Hodnotu **42,4 / zobrazených 42, „SNADNÉ“** nelze v současném stavu převzít jako ověřený ukazatel obtížnosti do simulátoru. Nejde o ověřenou pravděpodobnost, bodový limit ani doložený percentil. Výpočet a kalibrace nejsou dohledané. To nedokazuje chybu samotného původního aritmetického výpočtu; znemožňuje to jeho reprodukci a obhajobu výkladu.

V simulátoru již jsou použitelné a přesně přiřazené podklady 2026: průměr JPZ přijatých **68,74 / 100**, **65 přihlášek / 30 míst = 2,1667**, **23 přijatých / 30 míst**. Jejich současné zobrazení je pro rozhodování obhajitelnější než nové sloučení do čísla s neověřenými vahami. Popisují body přijaté skupiny a poptávku, nikoli osobní výsledek budoucího uchazeče.

## Důkazy a původ

1. `public/school_analysis.json`, přesný záznam: `obtiznost: 42.4`, 37 přihlášek, 30 míst, 11 přijatých a historické pole `min_body: 100`. Hodnota 42,4 je stejná už v prvním importu souboru, commit `36a8020`. Nezměnila se po přidání dat 2026.
2. `src/app/skola/[slug]/page.tsx` před opravou předávalo `school.obtiznost` do `StatsGrid` a zobrazovalo ji znovu v bodových statistikách. Nic ji zde nepočítalo.
3. `src/components/SchoolDetailClient.tsx` obsahovalo ruční hranice `<45`, `45–69`, `>=70` a výklady „SNADNÉ“, „STŘEDNÍ“, „TĚŽKÉ“. Tooltip z prvního pásma vyvozoval vysokou šanci na přijetí. Zdrojový vzorec, váhy ani validační soubor nedokládal.
4. Prohledány TS/JS/Python zdroje, dokumentace a dostupná historie repozitáře. Před importem `36a8020` byl pouze základ Next.js. Generátor původního indexu nalezen nebyl. Není tím vyloučeno, že existuje mimo tento repozitář.
5. Jiný konzument `src/lib/priorities/calculations.ts` označuje `obtiznost` v komentáři za percentil. To není doloženo; ani popis tooltipu na profilu takový výpočet neuvádí. Pořadí 42,4 mezi uloženými 2 901 indexy odpovídá asi 37,26 % hodnot <= 42,4, nikoli automaticky 42,4. Jde o doklad nesouladu definic, ne o pokus rekonstruovat původní referenční populaci.
6. `applications_2026.json` obsahuje 65 přihlášek, 30 míst a priority `[17,18,30,0,0]`. `cermat_results_2026.json` stejného úplného ID obsahuje 23 přijatých, průměr 68,74 (ČJ 34,57; MA 34,17), platnost 17. 8. 2026. Oba pocházejí ze stejného importu CERMAT, source ID `3a2ffe51-2836-45b2-9ac0-6d54f0585219`.
7. Aktuální veřejná stránka byla stažena přímo přes HTTP. Skutečně zobrazovala 42 a „SNADNÉ“ i po opravě minima v S0. Výsledek webového vyhledávače byl starší a obsahoval již odstraněné minimum a percentily; pro tvrzení o aktuální produkci nebyl použit.

[Posuzovaný profil](https://www.prijimackynaskolu.cz/skola/600007774-gymnazium-j-s-machara-kralovicka-technicke-lyceum), [zdroj CERMAT 2026](https://data.cermat.cz/files/files/JPZ/agregovana_data_skoly/PZ2026_kolo1_skolobory_vysledky.xlsx).

## Co data dovolují a co ne

- 2025: 37 / 30 = 1,233 přihlášky na místo. 2026: 65 / 30 = 2,167. Poptávka tedy vzrostla; index 42 zůstal starý.
- Přihlášky ze všech priorit nejsou počet lidí, kteří by obor upřednostnili před všemi alternativami. Ani 65 přihlášek při 30 místech samo nezaručuje naplnění; přijato bylo 23.
- Průměr 68,74 neříká, kolik bodů potřeboval poslední přijatý, natož kolik bude třeba v roce 2027.
- Pro souhrnný koeficient by bylo nutné doložit vzorec, význam vah, referenční populaci, práci s chybějícími daty, srovnatelnost typů přijímání a validaci na nepoužitém ročníku. Libovolný vážený součet průměru a poptávky by pouze vytvořil nový nedoložený index.

## Vypořádání a rozsah opravy

- Neověřený index nebyl přidán do simulátoru. Používáme jeho doložitelné podklady, které simulátor již zobrazuje a které testy porovnávají s původními daty po úplném ID.
- Na detailu oboru byl index nahrazen historickým počtem přijatých 2025; dolní statistika používá výslovně přihlášky na místo 2025. Vše zůstává uvnitř označené sekce roku 2025, nemíchá se do výsledků 2026.
- Odstraněn tooltip s nepodloženou „vysokou šancí“ a navazující doporučení odvozující osobní šanci pouze z poptávky. Je nahrazeno popisným vysvětlením a odkazem na aktuálnější údaje výše.
- Historická hodnota ve zdrojovém JSON zůstala pro dohledatelnost. Jiné starší přehledy a výpočty používající `obtiznost` nejsou tímto úzce zaměřeným auditem validovány ani globálně přepsány; zejména priority, regionální řazení a přehled škol vyžadují následný společný audit definice.

## Historie

| Verze | Změna |
|---|---|
| 1.0 | Dohledání původu a konzumentů indexu, aktuální HTTP kontrola, porovnání s daty 2026 a oprava profilu. |

## Lokální ověření opravy

Produkční build a TypeScript prošly. Cílený lint má 0 chyb a 7 stávajících varování na nepoužité importy/parametry v rozsáhlých původních komponentách. Deset integračních kontrol prošlo, včetně nového testu konkrétního profilu, absence nedoložené klasifikace a přesných údajů 2026 pro simulátor. V prohlížeči potvrzeno zobrazení 11 přijatých v označené sekci roku 2025.
