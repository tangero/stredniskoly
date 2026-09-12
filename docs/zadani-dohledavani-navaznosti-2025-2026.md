# Dohledávání návaznosti škol a oborů 2025–2026

Verze 1.4 · 12. 9. 2026. Fronta k výzkumu, nikoli schválená migrační mapa. Rešerše je provedena pro všech 192 úkolů; výsledky jsou podklad k přezkoumání, ne schválené mapování.

Souhrn celého úkolu, stav realizace a přejímací podmínky: [Návaznost škol a oborů](ukol-navaznost-skol-a-oboru-2027.md).

## Rozsah rešerše

| Rozsah | Množství | Jednotka |
|---|---:|---|
| Nepřiřazené nabídky 2025 | 186 | roční záznam |
| Nepřiřazené nabídky 2026 | 218 | roční záznam |
| Oba roky dohromady | 404 | roční záznam, nikoli 404 unikátních oborů |
| Organizace dotčené nepřiřazenými nabídkami | 191 | REDIZO |
| Priorita 1 | 190 | úkol po seskupení souvisejících REDIZO PORG |
| Další úkoly pouze priority 2 | 2 | úkol |
| Celá fronta | 192 | úkol, zahrnuje 193 REDIZO |

Priorita 1 zahrnuje nepřiřazené nabídky, 28 nepřiřazených školních jednotek (14 v každém roce) a návrh spojení PORG Brno → PORG. Tyto skupiny se překrývají na úrovni organizací; jejich počty se nesčítají jako počet škol.

Priorita 2 nyní zahrnuje pouze 3 dvojice se změnou formy/jazyka. Jedna je připojena k úkolu priority 1, další dvě tvoří samostatné úkoly.

Mimo rešeršní frontu evidujeme 624 pozorování: 559 změn textu zaměření, 40 změn adresního údaje (včetně pěti současných změn názvu) a 25 samotných změn názvu školy. Jejich příčinu není potřeba dohledávat. Doplnění či odstranění zaměření se neoznačuje za přejmenování. Výběr vyžaduje jednoznačnou návaznost; sporná spojení nabídek zůstávají v prioritě 1.

Samostatně zůstává 16 případů neúplné adresy. Nejde o prokázanou změnu ani o úkol na zjištění organizační historie. Doplnění míst výuky je jiný úkol potřebný pro dojezdovost.

### Jak změny zobrazovat

- Název školy: „V datech za rok 2025 se škola jmenovala XY.“ Neodvozovat přesné datum přejmenování ze dvou ročních snímků.
- Adresa: „V datech za rok 2025 byla uvedena adresa XY; v roce 2026 adresa Z.“ Bez důkazu nepoužívat „přestěhovala se“ ani neoznačovat adresu za místo výuky.
- Název oboru či zaměření: uvést dřívější a aktuální text. Rozlišit změnu názvu, doplnění a chybějící údaj. Samotná změna textu není důkaz změny obsahu výuky.
- Sloučení/rozdělení: samostatná organizační událost s vazbami předchůdce → nástupce (i více předchůdců/nástupců). Důvod změny názvu nezkoumat, pokud žádný jiný signál reorganizace neexistuje. Signálem může být zánik jednoho identifikátoru ve výřezu a převzetí jeho nabídky druhým; sám ale ještě není důkazem sloučení. Místa výuky vést zvlášť, nepředpokládat jejich změnu ani zachování.

Tyto texty jsou pravidla pro navazující implementaci profilů. Touto úpravou se na produkční stránky ještě nevkládají.


404 není nové vyčíslení původních 1 004 sporných nabídek. Původní inventura srovnávala nabídku 2026 s neúplným katalogem aplikace. Zde porovnáváme původní XLSX 2025 a 2026; navíc jde o součet nepřiřazených řádků obou let. Ani 218 aktuálních nabídek nejsou všechny otázky k ověření — u spárovaných změn zůstává neověřená srovnatelnost.

Počty vyjadřují, co nevyřešila nynější konzervativní metoda. Neznamenají, že žádný další rozbor dostupných dat nemůže pomoci. Fronta je balíček otázek, ne odhad počtu organizačních událostí. Rozsah tvoří denní nezkrácené studium s povinnou JPZ, první kolo 2025/2026; nikoli celý rejstřík či nabídka 2027.

## Adresa není automaticky budova výuky

Stejná či změněná adresa v CERMAT sama neříká, kde se vyučuje. Škola může mít sídlo jinde než výuku, několik pracovišť nebo různé adresy pro jednotlivé obory. I shodné adresy v obou letech mohou být pouze shodným sídlem. Matice proto není auditem fyzických míst výuky celého katalogu.

Pro každou doloženou adresu evidovat samostatně:

- roli: sídlo právnické osoby / korespondenční adresa / místo výuky / jiná / nezjištěná;
- ke kterému IZO, oboru či pracovišti náleží;
- platnost od/do nebo období doložené zdrojem;
- text adresy a případný ověřený identifikátor adresního místa RÚIAN;
- zdroj a datum ověření.

Nenahrazovat jediným polem více současných pracovišť. Pro dojezdovost používat doložené místo výuky příslušného oboru; při nejistotě ji přiznat. Oprava role adresy má přednost před závěrem „přestěhování“.

## Zápis v číselníku je doklad existence

Zápis školy nebo oboru v datech CERMAT, v rejstříku MŠMT nebo v ARES je dostatečným dokladem, že daná věc po právu existuje. Rešerše proto nedohledává další potvrzení téhož a řeší jen místa, kde si zdroje odporují.

Role zdrojů se liší. Rejstřík MŠMT říká, co existuje. Data CERMAT říkají, co bylo v daném roce skutečně vypsáno v 1. kole. Nedatovaný katalog třetí strany neříká ani jedno, protože popisuje portfolio školy bez vazby na ročník, a nabídku doloženou číselníkem proto nevyvrací. Odstup zápisu do rejstříku není spor: obor doložený daty CERMAT existuje, i když jej rejstřík ještě nevede.

Spory hledá `python3 scripts/find-data-conflicts.py` ve čtyřech podobách: nabídka u školy chybějící v rejstříku, IZO vedené pod jiným zřizovatelem, obor s jinou délkou studia, a nález se stavem rozpor zdrojů nebo nerozhodnutým vztahem.

## Zadání pro výzkumného agenta

Vezmi jeden úkol z fronty. Obsahuje všechny jeho otázky a nabídky daných REDIZO v obou letech, aby se rešerše školy neopakovala. Nalezneš-li vztah k jinému úkolu, zapiš jeho ID a navrhni spojení; nezamlčuj souběh škol ani nevynucuj vazbu 1:1.

1. Nezkoumej příčinu samotné změny názvu, textu zaměření nebo adresního údaje. Nejprve ověř, zda rozpor není možné vysvětlit obsahem přiložených dat. Rozliš prázdný údaj od doloženého zániku nabídky.
2. Dohledávej v rejstříku MŠMT, dokumentech školy a zřizovatele, výročních zprávách, přijímacích kritériích a školních vzdělávacích programech. Vyhledávací úryvek je vodítko, nikoli konečný důkaz. Aktuální stránka sama nedokazuje stav v roce 2025.
3. Zjisti kontinuitu IZO/REDIZO, případné sloučení či rozdělení a roli adres. U oborů rozliš změnu zápisu, změnu ŠVP, nový obor, přerušení/obnovení a změnu kódu. Shodný marketingový název nedokazuje stejný obsah.
4. U každé otázky zapiš pozorování, hypotézu a doložený závěr odděleně. Uveď alternativy, které zdroj nevylučuje. Plán události není důkaz uskutečnění.
5. Výsledek smí být `potvrzeno`, `pravděpodobné`, `rozpor_zdrojů` nebo `nedohledáno`. Bez podkladů nevyráběj kategorický závěr. Nepřiřazená nabídka nemusí být nová.
6. Navrhni samostatně návaznost entity/oboru a srovnatelnost historických výsledků. Potvrzené pokračování školy neopravňuje automaticky přenést statistiky mezi obory.
7. Neukládej změny do produkčního katalogu, nepřepisuj uživatelská rozhodnutí a nekontaktuj školy. Výstupem je podklad k přezkoumání.

### Formát nálezu

Každý záznam v `findings` má obsahovat:

```json
{
  "issue_ids": ["Q0001"],
  "status": "nedohledáno",
  "observations": [],
  "conclusion": null,
  "alternative_explanations": [],
  "relationship": {"type": "unknown", "from": [], "to": []},
  "addresses": [],
  "evidence": [
    {"url": "", "title": "", "published_at": null,
     "checked_at": "", "supports": "", "applicable_period": ""}
  ],
  "history_comparability": "unknown",
  "recommended_action": "manual_review",
  "related_task_ids": [],
  "unanswered_questions": []
}
```

Nález může navíc nést dvě nepovinná pole, která oddělují tři různé věci od sebe:

- `unanswered_questions` — otázka, na kterou by odpověděl další zdroj, ale ten se nenašel;
- `resolved_questions` — otázka uzavřená bez dalšího dohledávání, každá jako `{"otazka": …, "uzavreno": …}`, kde `uzavreno` říká proč (schválené pravidlo, nebo data, která odpověděla);
- `decisions_required` — věc, která nečeká na zdroj, ale na rozhodnutí člověka při přezkumu, typicky rozdělení historických statistik.

Rozdíl je podstatný: počet otevřených otázek jinak přeceňuje zbývající práci. Otázka na přesné datum události není mezera v rešerši, ale vědomé rozhodnutí podle pravidla 8.

Stav `potvrzeno` vyžaduje přímý doložitelný zdroj pro konkrétní závěr a období. Odkazy kontrolovat; pokud je zdroj nedostupný, zapsat omezení. Nálezy ukládat do samostatného souboru podle ID úkolu, aby regenerování vstupní fronty nezničilo výzkum.

## Soubory a reprodukce

- [Fronta pro agenta](podklady/fronta-dohledavani-2025-2026.json): 192 úkolů. Pole `status` ve frontě zůstává `not_started`; stav zpracování nese samostatný soubor výsledku, aby regenerování fronty rešerši nepřepsalo.
- [Výsledky rešerše](podklady/vysledky-navaznosti-2025-2026/): jeden soubor na úkol, všech 436 otázek pokryto.
- [Prohlížeč výsledků](prohlizec-vysledku-navaznosti.html): nálezy vedle nabídek obou ročníků; sestavení `python3 tools/vysledky-prohlizec/build.py`.
- [Rejstřík k frontě](podklady/rejstrik-k-fronte-2025-2026.json): strojový přehled ze čtyř snímků rejstříku MŠMT; generuje `python3 scripts/enrich-continuity-registry.py`, podklad k jednomu úkolu tiskne `python3 scripts/task-brief.py <ID>`.
- Kontroly: `python3 scripts/check-continuity-results.py` a `python3 scripts/check-continuity-sources.py`.
- [Výchozí matice](matice-zmen-skol-a-oboru-2025-2026.md).
- Generování: `python3 scripts/prepare-continuity-research.py`.

Fronta nemění produkci ani lokálně uložená rozhodnutí prohlížeče. Rešerše byla provedena a její výsledky leží mimo frontu, takže přegenerování fronty o ně nepřijde.

## Uzavřený číselník vztahů

`relationship.type` má jen hodnoty `continuation`, `new_offer`, `closed`, `rename_only`, `merge`, `split` a `unknown`. Dvě situace se do něj nevejdou přirozeně a řeší se takto:

- **Obnovená nabídka** (obor zůstal zapsán, přijímací řízení se v jednom roce nevyhlásilo a pak zase ano) je `continuation`.
- **Nahrazení oboru jiným** je `closed` u zanikající nabídky; nástupce se popíše slovně v pozorováních a odkáže se na otázku, která se jím zabývá.
- **Nabídka roku 2025 chybějící v roce 2026, zatímco obor zůstává zapsán v rejstříku**, je `closed` ve smyslu ukončení nabídky, nikoli zániku oboru. Dodržení této konvence kontroluje `scripts/check-continuity-results.py`.

## Historie

- **1.0:** 526 úkolů; do rešerše byly zahrnuty i prosté změny údajů a neúplné adresy.
- **1.4:** Doplněna zásada, že zápis v číselníku je dokladem existence a běh řeší jen spory. Přidán `scripts/find-data-conflicts.py`.
- **1.3:** Doplněna pole `resolved_questions` a `decisions_required`, aby se uzavřené otázky a rozhodnutí nemíchaly s otevřenými. Přidán `scripts/offer-history.py` nad soubory CERMAT 2024–2026.
- **1.2:** Rešerše provedena pro všech 192 úkolů. Přibyly datované snímky rejstříku MŠMT jako důkazní zdroj, jejich dávkové propojení s frontou, prohlížeč výsledků a dvě kontroly. Upřesněn uzavřený číselník vztahů.
- **1.1:** Po upřesnění zadání ponecháno 192 úkolů. 624 pozorování se pouze eviduje v `record_only`, 16 datových mezer v `data_gaps`. ID původních otázek jsou zachována. Tachov 600170535: žádná doložená změna, ulice chybí v obou letech; odstraněn z tabulky konkrétních změn. Původní počty 526/336 už nejsou aktuální frontou.
