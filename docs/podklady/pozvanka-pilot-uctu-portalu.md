# Pozvánka do pilotu účtů portálu pro školy

Text e-mailu pro 20 škol z `data/portal/pilot.json` ([účty portálu](../ucty-portalu-skol-2027.md), oddíly 5 a 9).

**Rozeslání (rozhodnutí zadavatele 20. 9. 2026):** z administrace `/admin/portal/pozvanky` — náhled e-mailu, počet oslovených škol, zkouška na vlastní adresu a ostrá rozesílka potvrzená opsáním počtu. Totéž z příkazové řádky umí `scripts/portal-posli-pozvanky.mjs`; obojí sdílí `src/lib/portal-pozvanky.ts`. Odesílá se z adresy `eda@prijimackynaskolu.cz`, na rejstříkový e-mail školy (`data/portal/pilot-kontakty.json`). Odpovědi míří na tutéž adresu, kde je vyřizuje Eduarda; v textu je to vysvětlené. **Podepsaný je člověk — Patrick Zandl, provozovatel projektu** (oddíl 5 účtů portálu: kód podepsaný umělou inteligencí ředitel snadno vyhodnotí jako podvod). Kód se doplní z `data/portal/kody-plaintext.json`; ten i soubor kontaktů jsou gitignorované a do repozitáře ani do jiného kanálu se nekopírují.

Doplňuje se: `{osloveni}` (z ředitele v kontaktech: „Vážená paní ředitelko“ / „Vážený pane řediteli“, bez jistoty rodu „Dobrý den“), `{nazev_skoly}`, `{kod}`. Datum odeslání zapíše administrace i skript do `pozvanka_odeslana` v `data/portal/pilot.json`; soubor patří do gitu, změnu je potřeba commitnout.

**Administrace pozvánek běží jen lokálně** (`npm run dev`). Kódy v plaintextu a jména ředitelů se schválně nenasazují, takže na produkci stránka vypíše, co chybí, a neodešle nic. Kdyby plaintext kódů ležel na serveru, hashování s pepřem ztrácí smysl.

---

**Předmět:** Profil {nazev_skoly} na Přijímačky na školu: pozvánka do pilotu

{osloveni},

na webu Přijímačky na školu (www.prijimackynaskolu.cz) hledají rodiče a uchazeči střední školu podle výsledků přijímacího řízení. Stránku má i {nazev_skoly}. Obory, kapacity a výsledky na ní přebíráme z otevřených dat CERMATu, rejstříku MŠMT a České školní inspekce.

Zveme vaši školu mezi dvacet škol, které jako první vyzkouší, jak si škola svůj profil spravuje sama. Doplníte, co v úředních datech chybí: dny otevřených dveří, odkaz na vyhlášená kritéria přijetí, přípravné kurzy, ubytování nebo kontakt na výchovného poradce. Údaje se na stránce školy zobrazí se značkou „potvrdila škola“ a s datem. Je to zdarma a nic není povinné.

**Jak na to**

1. Otevřete www.prijimackynaskolu.cz/pro-skoly a zadejte kód **{kod}**.
2. Vyplňte své jméno, funkci a pracovní e-mail. Kdo kód použije první, stane se správcem profilu školy a kód tím přestane platit. Proto ho prosím předejte jen tomu, kdo bude profil spravovat.
3. Správce může pozvat kolegy. Každý se pak přihlašuje svým e-mailem, bez hesla.
4. Co vyplníte, se na stránce školy objeví obvykle do hodiny. Na schválení nic nečeká — věříme tomu, kdo za školu údaje zadává. Když v nich najdeme chybu, opravíme ji a dáme vám vědět; u opraveného údaje je pak místo „potvrdila škola“ uvedeno „opravila redakce“.

Na stránce školy uvedeme „Profil spravuje škola“. Jméno a funkci správce tam uvedeme, jen když k tomu dá ve formuláři souhlas; odvolat ho jde kdykoli v profilu. Osobní údaje zpracovávám já jako jejich správce, jen pro přihlašování a pro vedení historie změn.

Chystáme ještě dvě věci, zatím bez termínu: otevřená data s údaji potvrzenými školami a odznak pro web školy. O obojím vám dáme vědět.

Tenhle e-mail přišel z adresy eda@prijimackynaskolu.cz a odpovídá na ní Eduarda, naše asistentka s umělou inteligencí; v podpisu to vždy uvádí. Kód ani přístup k účtu vám Eduarda nevydá ani nezmění, to dělám jen já osobně. Změnu správce, ztracený přístup nebo cokoli, co má řešit člověk, pište prosím rovnou na patrick@zandl.cz.

Děkuji a budu rád za každou zpětnou vazbu, i kritickou.

S pozdravem

Patrick Zandl
provozovatel projektu Přijímačky na školu
patrick@zandl.cz

---

## Co v e-mailu záměrně není

- **Facebooková skupina.** Odložena (oddíl 8); pilot má zůstat kontrolovaný vzorek.
- **Odkaz s kódem v adrese** (`/pro-skoly/KOD`). Adresa se ukládá do historie prohlížeče a do logů; kód se zadává do formuláře.
- **Slib termínu schválení.** Schvalování už neexistuje (viz níže), takže není co slibovat.
- **Patička „odesláno automaticky“.** Obálka ostatních e-mailů portálu ji má, u pozvánky podepsané člověkem by si protiřečila.

## Co se v textu změnilo proti verzi z 19. 9. 2026

Obojí kvůli [obrácenému pořadí moderace](../portal-pro-skoly-2027.md) (PR #120, 20. 9. 2026). Bez téhle opravy by pozvánka slibovala něco, co web nedělá:

| Bylo | Je | Proč |
|---|---|---|
| „Každý návrh před zveřejněním přečte člověk z redakce.“ | bod 4 výše | údaje od ověřeného editora školy se publikují bez předchozí moderace; chyba se opravuje zpětně |
| značka „potvrzeno školou“ | „potvrdila škola“, a zmínka o „opravila redakce“ | [slovník pojmů](../slovnik-pojmu.md) 1.15 |
