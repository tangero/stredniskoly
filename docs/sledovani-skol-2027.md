# Sledování škol a hromadná upozornění na změny

Verze 1.1 · 14. 9. 2026, revize 20. 9. 2026 · Návrh k rozhodnutí, nic není implementované.

Rodina zadá e-mail a dostane upozornění, když se změní údaje škol, které sleduje. Navazuje na [stránku školy](stranka-skoly-2027.md), [registr stavu datových sad](../public/stav_datovych_sad.json), [datovou linku](datova-linka.md) a [portál pro školy](portal-pro-skoly-2027.md).

## 1. Hlavní rozhodnutí: upozorňujeme na události, ne na úpravy stránek

Data se na webu mění dvěma způsoby a oba musí skončit ve stejném e-mailu:

| Druh změny | Příklad | Kolik škol najednou |
|---|---|---|
| **Hromadné přepnutí datové sady** | CERMAT zveřejní nabídku oborů 2027, výsledky 1. kola, 2. kolo, maturitu; nový snímek inspekcí | stovky až všechny |
| **Změna jedné školy** | škola v portálu doplní kritéria nebo dny otevřených dveří; nová inspekční zpráva | jedna |

Kdyby každá změna poslala e-mail, rodina sledující pět škol by po přepnutí jedné sady dostala pět e-mailů a po schválení portálu další. Proto:

1. Každá publikovaná změna zapíše **událost**: typ, datová sada a období, seznam dotčených škol, datum publikace.
2. Odesílání běží **jednou denně** a pro každého odběratele složí **jeden souhrn** ze všech událostí od posledního odeslání, které se týkají jeho škol.
3. Souhrn je **seskupený podle události, ne podle školy**: „Zveřejnili jsme nabídku oborů pro přijímací řízení 2027 na školách, které sledujete: Gymnázium J. S. Machara, Gymnázium J. A. Komenského.“

Tím se hromadná aktualizace přirozeně promítne jako jedna věta se seznamem škol, přesně jak rodina čeká.

## 2. Co je událost

Událost vzniká jen při **publikaci**, tedy tam, kde se web opravdu mění:

| Zdroj události | Kde vzniká | Dotčené školy |
|---|---|---|
| Přepnutí datové sady (`stav-datovych-sad.py prepni`) | po schválení a sloučení PR datové linky | školy, jejichž údaje se mezi starým a novým obdobím liší; spočítá rozdílový skript nad výstupními soubory, ne všechny školy v sadě |
| Schválení příspěvku z portálu pro školy | při zápisu do `public/portal_skol.json` | jedna škola, pole, která se změnila |
| Nová inspekční zpráva | při převzetí snímku ČŠI | školy s novou inspekcí |

Co událost **není**: oprava překlepu v textu stránky, přepočet bez změny hodnoty, změna vzhledu, nová verze slovníku. Rozdílový skript porovnává **zobrazené hodnoty**, ne soubory, takže technická regenerace nic nepošle.

Záznam události, například `data/sledovani/udalosti/2027-02-15-cermat-prihlasky.json`:

```json
{
  "id": "2027-02-15-cermat-prihlasky-2027",
  "typ": "sada_prepnuta",
  "sada": "cermat-prihlasky",
  "obdobi": "2027",
  "publikovano": "2027-02-15",
  "veta": "Zveřejnili jsme nabídku oborů pro přijímací řízení 2027",
  "skoly": ["600007774", "600007693"]
}
```

Soubor událostí neobsahuje žádné osobní údaje, takže smí být v repozitáři a projít stejným schválením jako data.

## 3. Souhrnný e-mail

```text
Předmět: Novinky na 3 školách, které sledujete

Zveřejnili jsme nabídku oborů pro přijímací řízení 2027 na školách, které sledujete:
  · Gymnázium J. S. Machara, Brandýs nad Labem → obory 2027
  · Gymnázium J. A. Komenského, Čelákovice → obory 2027

Škola doplnila údaje pro rodiny:
  · Gymnázium J. S. Machara: kritéria přijetí, dny otevřených dveří

Sledujete 5 škol · Upravit sledované školy · Přestat sledovat vše
```

Pravidla:

- **Jedna věta na typ události**, pod ní seznam škol s odkazem přímo na změněnou část stránky.
- Když se víc událostí týká jedné školy, škola se v e-mailu objeví víckrát, ale e-mail je stále jeden.
- Pořadí vět: nejdřív to, co mění rozhodování rodiny (nabídka oborů, kritéria, dny otevřených dveří, výsledky přijímání), potom maturita a inspekce.
- Bez čísel v e-mailu. Čísla bez kontextu stránky by se četla špatně; e-mail zve na stránku.
- Texty podle [slovníku pojmů](slovnik-pojmu.md), rok vždy výslovně.

## 4. Kam dát tlačítko „Sledovat školu“

| Místo | Rozhodnutí | Proč |
|---|---|---|
| **Hlavička stránky školy, v řadě akcí** vedle „Web školy“ a „Porovnat v simulátoru“, jako druhotné tlačítko se zvonkem | **použít** | škola je jednotka sledování; akce patří k identitě školy, ne do oddílu |
| **Hlavička stránky oboru**, vedle „Uložit mezi zvažované“ | **použít jako odkaz** „Sledovat školu“ | rodina přichází často přímo na obor; sleduje se ale celá škola, text to musí říct |
| **Seznam zvažovaných oborů** v simulátoru: „Sledovat všechny školy ze zvažovaných“ | **použít** | rodina, která zvažuje pět škol, je přidá jedním krokem místo pěti; tady je hromadnost nejpřirozenější |
| Patička stránky školy | **zavrhnout** | kdo dočte do patičky, už ví, co chce; tlačítko v hlavičce stačí |
| Plovoucí tlačítko nebo vyskakovací okno | **zavrhnout** | vtíravé; na telefonu už je plovoucí „Nahlásit chybu“ |
| Sledování jednotlivého oboru | **zavrhnout pro první verzi** | události jsou po školách; obor přidá složitost bez jasného přínosu |

Po kliknutí se pod hlavičkou **rozbalí panel**, ne modální okno:

```text
┌ Sledovat školu ───────────────────────────────────────────────────┐
│ Pošleme e-mail, když zveřejníme nové obory, výsledky přijímání,    │
│ maturitu, inspekci nebo když škola doplní údaje. Nejvýš jeden      │
│ e-mail denně za všechny sledované školy.                           │
│ [ e-mail                       ]  [ Sledovat ]                     │
│ Adresu použijeme jen pro tato upozornění. Odhlásit se jde jedním   │
│ kliknutím v každém e-mailu.                                        │
└────────────────────────────────────────────────────────────────────┘
```

Stavy tlačítka: „Sledovat školu“ → po odeslání „Potvrďte v e-mailu“ → po potvrzení „Sledujete“ (v tomto prohlížeči zapamatováno; správa přes odkaz z e-mailu).

## 5. Identita a úložiště

- **Bez účtu a hesla.** Odběratele identifikuje e-mail. Přihlášení k odběru se potvrzuje odkazem v e-mailu (double opt-in); stejný princip jako magic link portálu (`src/lib/portal-email.ts`, podepsaný token s platností).
- **Správa odběru** přes podepsaný odkaz v každém e-mailu: seznam sledovaných škol, odebrání, odhlášení všeho.
- **Seznam odběratelů nesmí do repozitáře.** Jsou to osobní údaje. Potřebuje serverové úložiště. **Od 18. 9. 2026 ho projekt má** a věta „dnes web žádné nemá“ už neplatí: Postgres u Neonu (`db/migrace/001-novinky.sql`, `002-portal.sql`, `@neondatabase/serverless`) s tabulkami odběratelů, potvrzení, dokladů souhlasu, dávek, rozpočtu a webhooků v `src/lib/novinky-schema.ts`. Chybí jen vazba `odber_skoly(odberatel_id, redizo)`. Rozbor v [překonaných rozhodnutích](prehodnoceni-rozhodnuti-rss-2027.md), P3.
- **E-maily** přes Resend, který portál už používá. Hromadné odeslání po dávkách, s hlavičkou `List-Unsubscribe`.

## 6. Proč to není příliš složité

Nejtěžší část, tedy vědět, **co se kdy změnilo a kde**, projekt už z velké části má: registr datových sad zná okamžik přepnutí, datová linka má schvalovací krok a portál má moderaci. Nové jsou tři kusy:

1. **Rozdílový skript** po přepnutí sady: pro každou školu porovná zobrazené hodnoty starého a nového období a zapíše událost se seznamem škol.
2. **Úložiště odběrů** s potvrzením a správou.
3. **Denní odesílač**, který spojí události s odběry a pošle souhrny.

Doporučené pořadí: nejdřív rozdílový skript a záznam událostí (užitečný i bez e-mailů, například pro changelog a stránku „Co je nového“), potom odběry a odesílač. Tlačítko se na web přidá až s odesílačem, aby rodina nesledovala něco, co nic neposílá.

## 7. Otevřené otázky

1. ~~**Úložiště odběrů:**~~ **uzavřeno 20. 9. 2026** – Postgres u Neonu, který už provozuje portál i plošné novinky (viz oddíl 5). Zbývá vazební tabulka, ne volba technologie.
2. **Frekvence:** denní souhrn (navrženo), nebo okamžitě u událostí jedné školy a denně u hromadných?
3. **Zásady ochrany osobních údajů:** web potřebuje doplnit text o zpracování e-mailů pro upozornění.
4. **Sledování z portálu:** má škola dostat upozornění, když se změní její vlastní údaje z oficiálních zdrojů? Pro redakci by to bylo levné ověřování dat.

## Historie

| Verze | Změna |
|---|---|
| 1.0 | Návrh: upozornění na události místo úprav, denní souhrn seskupený podle události, zdroje událostí, umístění tlačítka, identita bez účtu, pořadí realizace. |
| 1.1 | 20. 9. 2026: úložiště odběrů uzavřeno (Postgres u Neonu už běží), otevřená otázka 1 zrušena. Otevřeno zůstává sjednocení modelu události s novinkami z webů škol – viz [překonaná rozhodnutí](prehodnoceni-rozhodnuti-rss-2027.md), P4. |
