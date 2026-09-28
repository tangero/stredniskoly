# Pilot Jevu jako kontrolora přepisu kritérií (30 vzorků)

28. 9. 2026. Skript `scripts/dipsy-kriteria-jev-kontrola.py`, model `typesafe/jev-1.13` přes OpenRouter, cena 0,007 USD za 30 volání. Referencí jsou ruční verdikty z [kontroly 30 vzorků](dipsy-kriteria-kontrola-30-2026-09-28.md) (po opravě minim: 22 správně, 5 drobná, 3 podstatná chyba).

## Proč takhle

Jev negeneruje text, jen odpovídá na typované otázky s pravděpodobností; podle [dokumentace](https://docs.typesafe.ai/model-jaggedness/jev-1.13) „is not a calculator“ a pro extrakci doporučuje, aby hodnoty navrhl jiný model a Jev vybíral. Dostal proto jen **textové otázky** nad **sekcí PDF k oboru** (stejnou, jakou dostal DeepSeek; dřívější sonda četla jen začátek PDF):

1. `dalsi_body` (výběr ano / ne / nejasně): boduje škola u oboru i něco jiného než prostý součet JPZ?
2. `obor` (výběr): týkají se pravidla tohoto oboru, pozor na společná PDF s nástavbou?
3. `uplnost` (pravděpodobnost): uvádí přepis všechny druhy bodovaných složek?

## Výsledek

| Otázka | Podstatné chyby (3) | Plané poplachy (27 ostatních) | Hodnocení |
|---|---|---|---|
| `dalsi_body` v rozporu s přepisem, jistota ≥ 0,9 | 1 (Požární ochrana: přepis „jen přijímačky“, Jev „ano“ s 1,00) | 0 | **užitečné** |
| `dalsi_body` v rozporu, jakákoli jistota | 1 | 2 (jistota 0,70 a 0,50; u jednoho škola pořadí skládá z pořadí v testech, rozpor je obhajitelný) | použitelné s prahem |
| `obor` jiné než „souhlasí“ | 0 (nástavbu ve společném PDF označil „souhlasí“ s 1,00) | 0 | **nezachytil** |
| `uplnost` pod 0,3 | 1 | 4 | nerozlišuje |
| `uplnost` pod 0,7 | 3 | 20 | nerozlišuje |

Odpovědi na `uplnost` se rozprostřely mezi 0,05 a 0,87 bez vztahu k verdiktu (podstatné chyby: 0,05, 0,58, 0,53). Otázka na obor měla u všech 30 vzorků „souhlasí“, i u záměny nástavby se čtyřletým oborem.

## Závěr

- Jev **neřeší** hlavní slabinu, záměnu oboru ve společném PDF, a jako obecné skóre úplnosti je k ničemu.
- Spolehlivě a levně ale chytá **nejškodlivější druh chyby pro rodiče**: přepis tvrdí „škola boduje jen přijímačky“, zatímco škola boduje i něco jiného. Při jistotě ≥ 0,9 v pilotu bez planého poplachu. Takových přepisů je 335; kontrola všech stojí řádově 0,08 USD.
- Na 30 vzorcích s jedinou chybou tohoto druhu jde o **ukázku, ne měření**. Než se tomu začne věřit, je potřeba víc případů.

Doporučený další krok: pustit `dalsi_body` nad všemi 335 přepisy „jen přijímačky“ a označené (jistota ≥ 0,9) ručně prověřit. Když se potvrdí, zapsat výsledek jako nález do přepisu (prototyp pak u nich řekne, že škola možná boduje i něco dalšího).
