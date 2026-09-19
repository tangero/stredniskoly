# Pozvánka do pilotu účtů portálu pro školy

Text e-mailu pro 20 škol z `data/portal/pilot.json` ([účty portálu](../ucty-portalu-skol-2027.md), oddíly 5 a 9). Posílá se ručně z `eda@prijimackynaskolu.cz` na rejstříkový e-mail školy (`data/portal/pilot-kontakty.json`) a podepisuje ho člověk. Kód se doplní z `data/portal/kody-plaintext.json`. Oba soubory jsou gitignorované a do repozitáře ani do jiného kanálu se nekopírují.

Doplňuje se: `{osloveni}` (z ředitele v kontaktech: „Vážená paní ředitelko“ / „Vážený pane řediteli“, bez jistoty rodu „Dobrý den“), `{nazev_skoly}`, `{kod}`. Po odeslání zapsat datum do `pozvanka_odeslana` v `data/portal/pilot.json`.

---

**Předmět:** Profil {nazev_skoly} na Přijímačky na školu: pozvánka do pilotu

{osloveni},

na webu Přijímačky na školu (www.prijimackynaskolu.cz) hledají rodiče a uchazeči střední školu podle výsledků přijímacího řízení. Stránku má i {nazev_skoly}. Obory, kapacity a výsledky na ní přebíráme z otevřených dat CERMATu, rejstříku MŠMT a České školní inspekce.

Zveme vaši školu mezi dvacet škol, které jako první vyzkouší, jak si škola svůj profil spravuje sama. Doplníte, co v úředních datech chybí: dny otevřených dveří, odkaz na vyhlášená kritéria přijetí, přípravné kurzy, ubytování nebo kontakt na výchovného poradce. Údaje se na stránce školy zobrazí se značkou „potvrzeno školou“ a s datem. Je to zdarma a nic není povinné.

**Jak na to**

1. Otevřete www.prijimackynaskolu.cz/pro-skoly a zadejte kód **{kod}**.
2. Vyplňte své jméno, funkci a pracovní e-mail. Kdo kód použije první, stane se správcem profilu školy a kód tím přestane platit. Proto ho prosím předejte jen tomu, kdo bude profil spravovat.
3. Správce může pozvat kolegy. Každý se pak přihlašuje svým e-mailem, bez hesla.
4. Každý návrh před zveřejněním přečte člověk z redakce.

Na stránce školy uvedeme „Profil spravuje škola“. Jméno a funkci správce tam uvedeme, jen když k tomu dá ve formuláři souhlas; odvolat ho jde kdykoli v profilu. Osobní údaje zpracovávám já jako jejich správce, jen pro přihlašování a pro vedení historie změn.

Chystáme ještě dvě věci, zatím bez termínu: otevřená data s údaji potvrzenými školami a odznak pro web školy. O obojím vám dáme vědět.

Na dotazy k portálu odpovídá na této adrese Eduarda, naše asistentka s umělou inteligencí; v podpisu to uvádí. Kód ani přístup k účtu vám Eduarda nevydá ani nezmění, to dělám jen já osobně. Změnu správce, ztracený přístup nebo cokoli, co má řešit člověk, pište prosím rovnou na patrick@zandl.cz.

Děkuji a budu rád za každou zpětnou vazbu, i kritickou.

S pozdravem

Patrick Zandl
Přijímačky na školu
patrick@zandl.cz

---

## Co v e-mailu záměrně není

- **Facebooková skupina.** Odložena (oddíl 8); pilot má zůstat kontrolovaný vzorek.
- **Odkaz s kódem v adrese** (`/pro-skoly/KOD`). Adresa se ukládá do historie prohlížeče a do logů; kód se zadává do formuláře.
- **Slib termínu schválení.** Neslibuje ho ani Eduarda (oddíl 5, bod 3).
