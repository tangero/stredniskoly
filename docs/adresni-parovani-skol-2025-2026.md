# Adresa a návaznost škol mezi roky 2025 a 2026

12. 9. 2026, v1.0. Analýza; žádná rozhodnutí revizora ani produkční mapování nejsou změněna.

## Metoda a rozsah

Přímo původní XLSX CERMAT prvního kola, stejný filtr jako v současném importu: denní nezkrácené obory s povinnou JPZ. Rok 2025: 3 059 nabídek, 1 105 REDIZO. Rok 2026: 3 091 nabídek, 1 104 REDIZO. Nejde o celý školský rejstřík. Použití původních XLSX omezuje vliv neúplného starého katalogu.

Adresa je shoda normalizované ulice včetně čísla, obce a PSČ. Normalizují se diakritika, velikost písmen, interpunkce a mezery; lomítko v čísle zůstává. Neodhadujeme přejmenování ulic, jiné zápisy č.p./č.o. ani shodu budovy podle souřadnic. Řádky bez čísla v ulici se nespojují: 34 v roce 2025 a 32 v roce 2026. Vhodné další zpřesnění je ověření adresního místa a stavebního objektu přes RÚIAN. Adresní text není sám o sobě potvrzené místo výuky konkrétního oboru.

Reprodukce: `python3 scripts/analyze-address-continuity.py --input-dir /adresar/s/xlsx`. Výstup `docs/podklady/adresni-parovani/rozbor.json` obsahuje hashe vstupů, všech 67 dvojic různých REDIZO na shodných adresách a změny názvů.

## Co zjistila kontrola sporných 1 004 nabídek

- **950** má v původním XLSX 2025 stejnou adresu a REDIZO.
- Z toho **867** má také stejný KKOV; **83** na této adrese a pod tímto REDIZO daný KKOV nemá.
- **5** má na shodné adrese pouze jiná REDIZO.
- **49** nemá přesnou adresní shodu (včetně chybějícího čísla).
- **88** má na stejné adrese i jiné REDIZO. Tento počet se překrývá s předchozími skupinami a nesmí se k nim přičítat.
- **230** už má v původním XLSX 2025 přesně stejný normalizovaný plný klíč REDIZO + KKOV + zaměření. Chybějící shoda ve starém katalogu zde tedy není důkazem nového oboru. Před propojením je stále potřeba kontrola jedinečnosti a ostatních identifikačních polí.

Tyto počty používají jiný referenční soubor než rozklad 517/110/26/307/44: tehdy šlo o `schools_data.json[2025]`, nyní o původní XLSX 2025. Nejde o změnu seznamu 1 004 případů.

## Jiné REDIZO na stejné adrese

V celém srovnávaném importu je **35 adres**, na nichž lze spojit záznam 2025 s jiným REDIZO v roce 2026. Celkem jde o 67 směrovaných dvojic:

- **25 adres / 54 dvojic:** oba subjekty na téže adrese figurují už v obou letech. Shoda sama nedokládá změnu identifikátoru; jde o souběžné záznamy. Například Vinohradská 1971, Praha: Obchodní akademie Vinohradská a SŠ ekonomická se sportovním zaměřením mají odlišná REDIZO v obou letech.
- **10 adres / 13 dvojic:** mění se zastoupení subjektů na dané adrese. Kandidáti na sloučení, převod, stěhování nebo změnu pokrytí. U osmi dvojic předchozí REDIZO v celém importu 2026 chybí; to není samo o sobě důkaz zániku právnické osoby.
- Žádné příchozí REDIZO v těchto dvojicích není úplně nové vůči množině REDIZO importu 2025; všechna již existovala alespoň na některé adrese. Nejde tedy o 35 nově přidělených identifikátorů.
- **25 REDIZO** má shodnou adresu a IZO, ale jinak zapsaný název školy. Může jít o přejmenování, změnu zkratky nebo organizační změnu s rozšířením názvu; nelze vše označit za prostou změnu názvu.

## Doložené příklady

**Rakovník, Pražská 1222.** Střední zemědělská škola (`600007936`) v roce 2025; v roce 2026 Masarykova obchodní a zemědělská akademie (`600007987`). Druhé REDIZO existuje na adrese už v roce 2025 pod názvem Masarykova obchodní akademie. [Historie školy](https://mozarako.cz/7-historie-skoly) potvrzuje sloučení od 1. 9. 2025. Jde současně o změnu názvu přežívajícího subjektu a převzetí jiné školy; pravidlo „stejné REDIZO + stejná adresa = pouze přejmenování“ by tuto souvislost minulo.

**PORG Brno, Mendlovo náměstí 1.** V roce 2025 `600013898`, v roce 2026 `600006018`. [Oficiální oznámení PORG](https://www.porg.cz/projekt-fuze-porg-o-p-s-a-porg-brno-o-p-s-upozorneni-pro-veritele/) popisuje plán převzetí PORG Brno společností PORG k 1. 1. 2026. Změna ve zdrojových datech odpovídá tomuto plánu; samotné oznámení není dokladem dokončení zápisu fúze.

## Význam identifikátorů a doporučení

[Rejstřík MŠMT](https://rejstriky.msmt.cz/rejskol/VREJVerejne/VerejneRozhrani.aspx) rozlišuje RED_IZO (resortní identifikátor právnické osoby) a IZO (identifikátor školy/zařízení). Právnická osoba může vykonávat činnost několika škol nebo zařízení, jejichž IZO se liší. Ani jeden identifikátor není identifikátorem budovy. Prefix `izo_` je technický zápis v datech CERMAT, nikoli součást devítimístného IZO; při převodu zachovat úvodní nuly.

KKOV označuje klasifikovaný obor vzdělání, nikoli právnickou osobu nebo budovu. [MŠMT – číselníky a klasifikace](https://msmt.gov.cz/rej-sta/ciselniky-a-klasifikace). Změnu KKOV nepovažovat automaticky za administrativní přejmenování: zkontrolovat návaznost, délku a zakončení vzdělání a případně oficiální převodník či rozhodnutí.

Pro revizi používat odděleně **shodu pracoviště**, **návaznost školy** a **návaznost nabídky oboru**. Adresa má být výrazný filtr a kandidáty hledat i napříč REDIZO. Spolu s IZO/REDIZO je silným vodítkem, ale sama nezakládá převod historických výsledků. Doporučeno doplnit původní XLSX 2025 do prohlížeče a explicitně ukázat případné souběžné subjekty; současný prohlížeč stále obsahuje původní lokální katalog a zatím nebyl tímto rozborem změněn.
