# Předání: kritéria přijetí 2026 z DiPSy

Stav k 25. 9. 2026. Tento dokument umožňuje navázat na sběr a přepis kritérií bez čtení konverzace. Údaje o ceně jsou z místních záznamů modelových volání, ne z úplného vyúčtování poskytovatele.

## Cíl a pevná rozhodnutí

- Získat pro každou dostupnou nabídku 1. kola 2026 bodovací postup z PDF DiPSy. Pracovní přepis patří ke konkrétnímu `source_id`, škole, oboru a zaměření, roku a kolu; stejné PDF samo o sobě neprokazuje stejná pravidla pro všechny obory uvedené v dokumentu.
- Celkový limit **10 USD zahrnuje všechny dosavadní piloty**. Drahé plošné čtení Opusem do něj nepatří. DeepSeek s krátkým strukturovaným výstupem může dodat pracovní návrhy; Jev může sloužit jako levná doplňková kontrola, ale jeho dosavadní pilot neprokázal schopnost bezpečně schvalovat pravidla.
- Ruční ověření tisíců PDF není provozně reálné. Výstupy, u kterých nelze bezpečně doložit obor, čísla a zdroj, musí zůstat **neověřené**. Veřejná první verze má být informační karta s původem a datem podkladu, bez výpočtu bodů či šance z neověřeného pravidla.
- Kritéria 2026 jsou pro rok 2027 jen historický údaj. Zvláštní bodování v roce 2026 je důvod cíleně ověřit rok 2027; ani prostý součet JPZ z roku 2026 není potvrzením pro rok 2027. Pravidlo pro konkrétní kolo má přednost před pravidlem pro všechna kola.

Starší [návrh prototypu](prototyp-kriteria-prijeti.md) a [popis sběru](hromadny-sber-kriterii-2026.md) stále popisují ruční schválení všech 100 pilotních PDF jako vstupní bránu. Pozdější rozhodnutí uživatele výše tento plán mění. Dokumenty je třeba před veřejným zapnutím sjednotit; nelze považovat původní bránu za splněnou.

## Co existuje

- Katalog má 3 091 nabídek prvního kola 2026. Místní sběr získal platné PDF pro 3 089; dvě chyby jsou popsané v [popisu sběru](hromadny-sber-kriterii-2026.md). Existuje 2 171 různých PDF. Po OCR má 2 727 nabídek přímou textovou vrstvu a 362 OCR text. PDF, texty, manifest a modelové odpovědi jsou jen v gitignorovaném `data/dipsy-kriteria-2026/`; při předání jiného pracovního prostředí je tento korpus nutné přenést nebo sběr obnovit.
- Starší vzorek 100 nabídek má pracovní výstupy DeepSeek, Luna a Opus, popsané ve [výsledcích vzorku](podklady/dipsy-kriteria-vzorek-100-vysledky-2026-09-24.md). Jde o srovnání modelů, ne o ověřenou klasifikaci. Pět původních strukturovaných záznamů v `src/data/kriteria-prijeti-2026-pilot.json` má stav `navrh`.
- [Úsporný pilot](../scripts/dipsy-kriteria-usporny-pilot.py) v8 vytvořil dalších 50 místních návrhů nad různými typy PDF. [Výběr sekce oboru](../scripts/dipsy-kriteria-sekce.py) omezuje jedno prokázané smíchání sousedních oborů; při nejisté hranici vrací celý text. [Mechanická kontrola](../scripts/dipsy-kriteria-usporny-kontrola.py) ověřuje citace proti stránkám, přepočet a součty. Bez nálezu prošlo 33/50, s nálezem 17/50. Bez nálezu neznamená věcně potvrzeno.
- Hrubý režim `pouze_jpz`/`jine` se v těchto 50 případech shodl s Opusem 50/50. Maximum JPZ se shodlo 40/50, uvedené celkové maximum 47/50 a počet dalších složek 42/50. Opus není referenční pravda. Rizikové příklady jsou deklarovaný podíl JPZ oproti skutečnému přepočtu na 60 bodů, bodování vedlejšího oboru ve společném PDF, OCR a dlouhé dokumenty.
- Dosavadní [pilot Jevu](../scripts/dipsy-kriteria-jev-pilot.py) četl jen prvních 12 000 znaků PDF. Může tedy minout cílový obor v pozdější části. Z pěti sond není doložena spolehlivost samostatného schvalování; je třeba měřit jeho chování nad relevantními stránkami a kontrolovat i falešný souhlas.

## Rozpočet

Reprodukovatelný přepočet: `python3 scripts/dipsy-kriteria-rozpocet-2026.py`. K dnešku jsou místně doložené náklady **5,416788 USD**. Zbývá 2 989 nabídek mimo původní stovku; z měření 50 úsporných návrhů vychází dávkový DeepSeek přibližně na **2,4703 USD** a Jev podle pěti starších sond na **0,4128 USD**. Celkový odhad činí **8,2999 USD**, tedy přibližně 1,70 USD rezervy. Podrobnosti a meze odhadu jsou v [rozpočtovém podkladu](podklady/dipsy-kriteria-rozpocet-10-usd-2026.md).

Sedm nedokončených synchronních volání nemá v místních záznamech potvrzenou účtovanou cenu. Před plošným odesláním zkontrolovat účet poskytovatele. Dosavadní úsporný pilot má jen limit nových výdajů při jednom spuštění; **není to ještě pojistka celého desetidolarového rozpočtu**.

## Co přesně zbývá

1. Ověřit skutečně účtovanou cenu neúspěšných volání a znovu spustit rozpočtový přepočet. Při změně ceníku přepočítat očekávané náklady před jakoukoli další placenou dávkou.
2. Dopsat obnovitelný dávkový běh úsporného schématu pro zbývající nabídky. Před každou malou dávkou musí sečíst pilot, hotové i běžící dávky a rezervu na chyby; požadavek odmítnout, pokud by horní odhad překročil celkem 10 USD. Uložit ID dávky, verzi zadání, `source_id`, hash PDF, přesnou cenu i neúspěšné odpovědi. Nedokončený požadavek automaticky neopakovat bez účetního záznamu.
3. Pro každý výstup spustit mechanickou kontrolu. Oddělit `bez mechanického nálezu`, `nesoulad` a `nezjisteno`; první stav **není** redakční `overeno`. Změřit zvlášť OCR, víceoborová a dlouhá PDF a rozdíly proti jinému čtení. Ověřit, zda lze Jevu předat cílové stránky v jeho kontextovém limitu; nerozhodnuté případy nechat neověřené.
4. Před veřejnou kartou doplnit redakční postup pro `overeno`/`rozpor`, migraci `db/migrace/006-portal-kriteria.sql`, audit původu a datum podkladu. Veřejné zobrazení neověřeného pravidla nesmí tvrdit přesný bodovací vzorec. Pět současných návrhů ani dalších 50 sond se do produkce nezapisuje.
5. Po zveřejnění karet 2027 změřit shodu identit oborů skriptem `node --experimental-strip-types scripts/dipsy-shoda-kliku.mjs --rok 2027 --vse`. Teprve z nových kritérií lze potvrdit pravidlo 2027; uložené 2026 nesmí být tiše použito jako aktuální.

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
