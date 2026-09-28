# Kontrola kvality přepisu kritérií 2026 na 30 vzorcích

28. 9. 2026. Podklad k výhradě v prototypu `/prototyp/pasma` a ukazateli *Podíl přijímaček na bodování*.

## Postup

- Vzorek: 30 strojových přepisů (zadání v8, DeepSeek) z `public/kriteria_prijeti_2026.json`, náhodně (seed 20260928), stratifikovaně: 15 bez nálezu mechanické kontroly a 15 s nálezem. V populaci je nález u 40 % přepisů. 5 vzorků je z OCR.
- Posouzení: tři nezávislí posuzovatelé (modely), každý 10 vzorků, **naslepo** (nevěděli, do které skupiny vzorek patří). Porovnávali to, co rodič uvidí (režim, podíl JPZ, složky, minima, obor), s textem PDF.
- Verdikt: *správně* (rodič nebude zaveden), *drobná* (podstatný obraz sedí), *podstatná* (rodič by byl zaveden: špatný režim, podíl mimo o víc než 5 p. b., chybí nebo přebývá významná složka, jiný obor).

## Výsledek

| Skupina | Správně | Drobná | z toho jen minima bez čísla | Podstatná |
|---|---|---|---|---|
| Bez nálezu (15) | 10 | 4 | 4 | 1 |
| S nálezem (15) | 2 | 11 | 6 | 2 |
| Celkem (30) | 12 | 15 | 10 | 3 |

**Minima bez čísla** (10 případů) nebyla chyba přepisu, ale převodu do zobrazení: model popis zkrátil („celkem, matematika“), číslo zůstalo v citaci z PDF. Opraveno v `scripts/build-kriteria-prijeti.py` (bez čísla v popisu se ukáže citace); minim bez čísla zbylo 45 z 3 710. **Po opravě: 22 správně, 5 drobná, 3 podstatná.**

**Podstatná chyba: 3 z 30, tedy zhruba každý desátý přepis.** Vážený odhad pro celou populaci (60 % bez nálezu po 1/15, 40 % s nálezem po 2/15) vychází kolem 9 %. Při 30 vzorcích je rozptyl velký (95% interval zhruba 2–27 %), číslo je řád, ne přesný údaj.

Tři podstatné chyby:
1. Požární ochrana: škola boduje i školní zkoušku (30 %) a prospěch (10 %), přepis ukazuje „jen přijímačky, 100 %“. Kritéria oboru jsou až na straně 9–10 dlouhého PDF; výběr sekce oboru je zřejmě minul.
2. Nástavba Podnikání ve společném PDF se čtyřletými obory: přepis převzal schéma čtyřletých oborů (školní zkouška, minimum), podíl 62 % místo 77 %. Chyba vazby oboru, kterou mechanická kontrola nepoznala (skupina „bez nálezu“).
3. Složitý vzorec (0,7 × JPZ, 0,3 × prospěch, angličtina): podíl a maximum nevyplněné, chybí srážka za chování.

## Co z toho plyne

- Výhrada „může obsahovat chybu“ je oprávněná a dostala číslo: prototyp říká, že při kontrole vzorku byl podstatně chybný zhruba každý desátý přepis.
- Mechanická kontrola **chyby jen slabě odlišuje**: podstatná chyba 1/15 bez nálezu proti 2/15 s nálezem. Nález hlavně signalizuje drobné nepřesnosti (11/15). Upozornění „přepis se neshodl s PDF“ proto zůstává jen jako doplněk, ne jako měřítko spolehlivosti.
- Nejhorší druh chyby je **vazba oboru ve společném PDF** (nástavba vs. čtyřletý obor, obor na pozdější straně). Kandidát na zlepšení výběru sekce před dalším přepisem (kritéria 2027).
