# Místní kontrola kritérií z PDF

Spuštění z kořene projektu:

```sh
python3 scripts/kriteria-review-local.py
```

Otevřete `http://127.0.0.1:8765`. Port lze změnit přepínačem `--port`. Aplikace používá jen místní soubory a poslouchá výhradně na `127.0.0.1`; nic nestahuje z DiPSy ani nezapisuje do produkční databáze.

Pro porovnání **pěti automatických návrhů** spusťte `python3 scripts/kriteria-review-local.py --pet` a otevřete `http://127.0.0.1:8767`. Uprostřed jsou stránkované obrazy původního místního PDF a odkaz na originální soubor; vpravo jsou aritmetická kontrola maxim, lidsky čitelný návrh DeepSeek, čtyři odpovědi Jevu, vybrané doslovné úryvky z PDF a rozbalitelný starší pracovní přepis. U PED Academy a Gymnázia Joachima Barranda je navíc výklad navázaný na otisk PDF: rozlišuje skutečný text dokumentu od odvozeného závěru. Aritmetika předpokládá běžnou JPZ se dvěma předměty po 50 bodech; sama neověřuje správnost modelového přepisu ani zvláštní postup pro uchazeče s prominutou češtinou. Sonda Jevu se připravuje příkazem `python3 scripts/dipsy-kriteria-jev-pilot.py`; existující odpovědi se při stejných podkladech použijí z místních souborů. Práh 80 % v prohlížeči je jen pracovní označení otázek, nikoli kalibrované schválení. Výsledek pěti příkladů je popsaný v [zprávě o modelovém vzorku](podklady/dipsy-kriteria-llm-vzorek-2026-09-24.md). Tento režim nezapisuje redakční rozhodnutí.

Stejný režim ukazuje také [nové zadání v4](podklady/dipsy-kriteria-prompt-v4-2026-09-24.md): oddělené maximum před/po vážení pro JPZ i další složky, dopočtené maximum a nálezy kontroly citací a vzájemné konzistence. Jev v této obrazovce stále hodnotí **původní** návrh DeepSeek, nikoli výstup v4; jejich výsledky nelze spojovat jako jednu společnou kontrolu.

Nad stejnými pěti PDF jsou v režimu `--pet` také [nezávislé přepisy modelem Opus 5.5 a GPT-6 Luna](podklady/dipsy-kriteria-nezavisle-modely-2026-09-24.md). Krátké srovnání ukazuje maxima a počet mechanických nálezů; rozbalitelné karty obsahují číselné složky, nejasnosti a doslovné doklady každého modelu. Tyto modely četly stejný text PDF, ale neviděly odpovědi ostatních.

Staženou dávku 2026 zobrazí `python3 scripts/kriteria-review-local.py --vse` na `http://127.0.0.1:8766`. Po dokončení sběru obsahuje 3 089 nabídek s platným PDF; dvě chybové karty jsou zapsané v manifestu a vysvětlené v [souhrnu sběru](hromadny-sber-kriterii-2026.md). Pokud je při práci doplněno OCR nebo textové výskyty, obnovte stránku. Výskyty mají číslo stránky po spuštění `dipsy-kriteria-extrakce.py --signaly`.

Filtr **Modelový návrh** ukáže sedm nabídek z [malého placeného vzorku](podklady/dipsy-kriteria-llm-vzorek-2026-09-24.md). U každé je původní PDF, poslední návrh modelu, použitá textová metoda, cena volání a případný dřívější pracovní přepis. Modelový návrh je zřetelně oddělený a nelze ho tlačítkem schválit; u některých polí se už na vzorku ukázaly věcné chyby.

V seznamu je 100 nabídek z `data/dipsy-kriteria-pilot/hodnoceni.csv`. Vlevo lze hledat a filtrovat, uprostřed je místní PDF a vpravo pracovní strukturovaný přepis (zatím pět záznamů), strojově extrahovaný text, kontrolní list a další údaje o nabídce z `public/applications_2026.json`. Zobrazí se také známý web školy z `public/skoly_web.json` a případný školní záznam z místního exportu `public/portal_skol.json` (ten je nyní prázdný). U každého přepisu se kontroluje soulad ID nabídky, roku a kola, identita oboru, ID PDF a SHA-256 skutečného místního souboru. Pokud kontrola selže, tlačítka rozhodnutí se deaktivují.

Tlačítko **Schválit přepis** je k dispozici jen u pěti strukturovaných návrhů. Vyžaduje zkontrolované stránky a poznámku, zejména k uvedeným nejasnostem. U ostatních nabídek lze PDF a text prohlížet a zapsat „Vrátit k opravě“ nebo „Nelze určit“; bez strukturovaného přepisu není co schválit. Rozhodnutí jsou append-only v `data/dipsy-kriteria-pilot/review-decisions.jsonl` (adresář je v `.gitignore`). Rozhodnutí se váže na otisk PDF a přepisu; po změně kteréhokoli z nich se v aplikaci označí za neplatné pro novou verzi.

Jde o **místní posouzení**, nikoli o publikaci. Schválení nemění `stav: navrh` v pracovním JSON, nezapisuje `overeno` do tabulky `kriteria_podklad` a nic nezobrazí uchazečům. Převod schválených záznamů do veřejných dat vyžaduje samostatný redakční import a další kontrolu.
