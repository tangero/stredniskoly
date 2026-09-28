# Předání: kritéria přijetí 2026 z DiPSy

Stav k 25. 9. 2026. Tento dokument umožňuje navázat na sběr a přepis kritérií bez čtení konverzace. Údaje o ceně jsou z místních záznamů modelových volání, ne z úplného vyúčtování poskytovatele.

## Cíl a pevná rozhodnutí

- Získat pro každou dostupnou nabídku 1. kola 2026 bodovací postup z PDF DiPSy. Pracovní přepis patří ke konkrétnímu `source_id`, škole, oboru a zaměření, roku a kolu; stejné PDF samo o sobě neprokazuje stejná pravidla pro všechny obory uvedené v dokumentu.
- Celkový limit **10 USD zahrnuje všechny dosavadní piloty**. Drahé plošné čtení Opusem do něj nepatří. DeepSeek s krátkým strukturovaným výstupem může dodat pracovní návrhy; Jev může sloužit jako levná doplňková kontrola, ale jeho dosavadní pilot neprokázal schopnost bezpečně schvalovat pravidla.
- Ruční ověření tisíců PDF není provozně reálné. Výstupy, u kterých nelze bezpečně doložit obor, čísla a zdroj, musí zůstat **neověřené**. Veřejná první verze má být informační karta s původem a datem podkladu, bez výpočtu bodů či šance z neověřeného pravidla.
- Kritéria 2026 jsou pro rok 2027 jen historický údaj. Zvláštní bodování v roce 2026 je důvod cíleně ověřit rok 2027; ani prostý součet JPZ z roku 2026 není potvrzením pro rok 2027. Pravidlo pro konkrétní kolo má přednost před pravidlem pro všechna kola.

**Platí od 27.–28. 9. 2026:** vstupní brána s ručním schválením všech pilotních PDF byla zrušena rozhodnutím zadavatele. Přepis se zobrazuje neověřený, s rokem 2026 a výhradou chybovosti (kontrola 30 vzorků: zhruba každý desátý přepis podstatně chybný), z přepisu se nepočítají body uchazeče. Formulář kritérií v portálu pro školy a jeho dokumentace (`docs/prototyp-kriteria-prijeti.md`) zůstávají na větvi `feat/kriteria-prijeti` a nejsou součástí prototypu `/prototyp/pasma`.

## Co existuje

- Katalog má 3 091 nabídek prvního kola 2026. Místní sběr získal platné PDF pro 3 089; dvě chyby jsou popsané v [popisu sběru](hromadny-sber-kriterii-2026.md). Existuje 2 171 různých PDF. Po OCR má 2 727 nabídek přímou textovou vrstvu a 362 OCR text. PDF, texty, manifest a modelové odpovědi jsou jen v gitignorovaném `data/dipsy-kriteria-2026/`; při předání jiného pracovního prostředí je tento korpus nutné přenést nebo sběr obnovit.
- Starší vzorek 100 nabídek má pracovní výstupy DeepSeek, Luna a Opus, popsané ve [výsledcích vzorku](podklady/dipsy-kriteria-vzorek-100-vysledky-2026-09-24.md). Jde o srovnání modelů, ne o ověřenou klasifikaci. Pět původních strukturovaných záznamů v `src/data/kriteria-prijeti-2026-pilot.json` má stav `navrh`.
- [Úsporný pilot](../scripts/dipsy-kriteria-usporny-pilot.py) v8 vytvořil dalších 50 místních návrhů nad různými typy PDF. [Výběr sekce oboru](../scripts/dipsy-kriteria-sekce.py) omezuje jedno prokázané smíchání sousedních oborů; při nejisté hranici vrací celý text. [Mechanická kontrola](../scripts/dipsy-kriteria-usporny-kontrola.py) ověřuje citace proti stránkám, přepočet a součty. Bez nálezu prošlo 33/50, s nálezem 17/50. Bez nálezu neznamená věcně potvrzeno.
- Hrubý režim `pouze_jpz`/`jine` se v těchto 50 případech shodl s Opusem 50/50. Maximum JPZ se shodlo 40/50, uvedené celkové maximum 47/50 a počet dalších složek 42/50. Opus není referenční pravda. Rizikové příklady jsou deklarovaný podíl JPZ oproti skutečnému přepočtu na 60 bodů, bodování vedlejšího oboru ve společném PDF, OCR a dlouhé dokumenty.
- Dosavadní [pilot Jevu](../scripts/dipsy-kriteria-jev-pilot.py) četl jen prvních 12 000 znaků PDF. Může tedy minout cílový obor v pozdější části. Z pěti sond není doložena spolehlivost samostatného schvalování; je třeba měřit jeho chování nad relevantními stránkami a kontrolovat i falešný souhlas.

## Rozpočet

Reprodukovatelný přepočet: `python3 scripts/dipsy-kriteria-rozpocet-2026.py`. K dnešku jsou místně doložené náklady **5,416788 USD**. Zbývá 2 989 nabídek mimo původní stovku; z měření 50 úsporných návrhů vychází dávkový DeepSeek přibližně na **2,4703 USD** a Jev podle pěti starších sond na **0,4128 USD**. Celkový odhad činí **8,2999 USD**, tedy přibližně 1,70 USD rezervy. Podrobnosti a meze odhadu jsou v [rozpočtovém podkladu](podklady/dipsy-kriteria-rozpocet-10-usd-2026.md).

Sedm nedokončených synchronních volání nemá v místních záznamech potvrzenou účtovanou cenu. Před plošným odesláním zkontrolovat účet poskytovatele. Dosavadní úsporný pilot má jen limit nových výdajů při jednom spuštění; **není to ještě pojistka celého desetidolarového rozpočtu**.

## Co zbývalo k 25. 9. a jak to dopadlo

1. **Cena nedokončených volání:** ověřena 27. 9. u OpenRouteru, útrata klíče souhlasí s místními záznamy (rozdíl 0,06 USD na volání s vypršeným časem).
2. **Obnovitelný dávkový běh s pojistkou rozpočtu:** `scripts/dipsy-kriteria-hromadny-prepis.py` (strop výdajů na běh, rezerva na běžící volání, zastavení bez účtované ceny, chyby uložené i s cenou). Plošný přepis 27.–28. 9.: 2 814 oborů, 2,93 USD.
3. **Mechanická kontrola všech výstupů:** součástí sestavení `scripts/build-kriteria-prijeti.py`; nálezy u 40 % přepisů, chyby ale odlišuje slabě. Jev jako kontrolor u přepisů „jen přijímačky“ (práh 0,9) ověřen 29/29.
4. **Redakční postup `overeno`/`rozpor` a migrace 006:** nahrazeno rozhodnutím zobrazovat neověřený přepis s výhradou; migrace a formulář patří k portálu (větev `feat/kriteria-prijeti`).
5. **Shoda identit oborů pro 2027:** zůstává; skript `dipsy-shoda-kliku.mjs` je u portálu. Úkol v datové lince na únor 2027.

## Rychlé místní ověření a stav repozitáře

```sh
python3 scripts/dipsy-kriteria-rozpocet-2026.py
python3 scripts/dipsy-kriteria-usporny-kontrola.py --verze 8
python3 -m py_compile scripts/dipsy-kriteria-{rozpocet-2026,usporny-pilot,usporny-kontrola,sekce}.py
```

Poslední kontrola v tomto prostředí: rozpočet 5,416788 USD, 50 výsledků v8, z toho 33 bez mechanického nálezu; uvedené skripty prošly kontrolou syntaxe. Hromadná úsporná dávka **nebyla odeslána**. Veřejné zapnutí ani produkční migrace **neproběhly**.

Pracovní větev při předání: `feat/veletrhy-dopis-poradatelum`, HEAD `3990769`; pracovní strom obsahuje také změny veletrhů a mnoho necommitnutých souborů kritérií. Před pokračováním znovu přečíst `git status --short`. Nepřepínat větev ani necommitovat cizí změny bez rozlišení původu.

## Doplněk 28. 9. 2026: jak přepisovat další ročník

Kritéria 2026 jsou přepsaná plošně (2 814 oborů, 2,93 USD) a nasazená v prototypu `/prototyp/pasma` s výhradou chybovosti; původní vstupní brána ruční kontroly všech PDF byla nahrazena přiznanou chybou (rozhodnutí zadavatele 27. 9. 2026). Postup pro kritéria 2027:

1. Sběr PDF (`scripts/dipsy-kriteria-sber.py`) po zveřejnění kritérií (harmonogram MŠMT: 15.–31. 1. 2027).
2. Přepis **celého PDF** modelem DeepSeek V4.1 Flash (`scripts/dipsy-kriteria-hromadny-prepis.py`, výchozí; strop výdajů na běh). Výběr sekce oboru se nepoužívá: minul kritéria na pozdějších stranách.
3. Kontrola Jevem 1.13 u přepisů „jen přijímačky“ (`scripts/dipsy-kriteria-jev-kontrola.py --jen-jpz`, práh 0,9; ověřeno 29/29), znovu přepsat označené.
4. Sestavení dat (`scripts/build-kriteria-prijeti.py`) a kontrola vzorku naslepo.

Podklady: [kontrola 30 vzorků](podklady/dipsy-kriteria-kontrola-30-2026-09-28.md), [pilot Jevu](podklady/dipsy-kriteria-jev-pilot-30-2026-09-28.md).
