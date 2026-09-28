# Další měření extrakce kritérií 2026

Stav k 24. 9. 2026: z 3 091 katalogových nabídek 1. kola mají 3 089 platné PDF. Jde o 2 171 různých PDF; 392 souborů se používá pro více nabídek a dohromady pokrývá 1 310 nabídek. Jeden soubor tedy nelze bez kontroly přiřazení pravidel automaticky interpretovat jen jednou pro všechny obory. Mezi různými PDF je 241 s OCR textem a sedm se zvoleným textem delším než 50 000 znaků; posledních sedm nynější cenově omezený modelový skript odmítá.

Než spustíme všechny nabídky, skript `python3 scripts/dipsy-kriteria-vzorek-100.py` vytvoří opakovatelný výběr v místním gitignorovaném `data/dipsy-kriteria-2026/vzorek-100.json`. Seed je 42; pět PDF používaných k ladění je vyloučeno včetně dalších nabídek navázaných na jejich SHA-256. Vzorek má 100 nabídek a 90 různých PDF:

| Vrstva | Nabídky | Důvod |
|---|---:|---|
| Sdílené PDF | 20 (10 dvojic různých oborů nebo zaměření) | Ověřit přiřazení pravidla ke konkrétní nabídce. |
| OCR | 20 | Prověřit chyby rozpoznaného textu a citace. |
| Dlouhé PDF | 10, včetně všech sedmi nad 50 000 znaků | Ověřit rozdělení dokumentu bez ztráty relevantní části. |
| Textový signál váhy mimo 60/40 % | 20 | Prověřit surové body, nezvyklá procenta a přepočet. Signál je jen vyhledaný výraz, nikoli ověřená váha. |
| Ostatní náhodné | 30 | Nezůstat jen u předem podezřelých případů. |

V těchto vrstvách je celkem 26 nabídek s OCR (některé spadají i do jiné vrstvy). Sedm dlouhých PDF je záměrnou zkouškou současného omezení; nesmějí se zpracovat tichým uříznutím textu. Výběr PDF je deterministický podle obsahu a seedu; SHA-256 vytvořeného `vzorek-100.json` je `df53e401bba3eab6bfb23dbbaffa3508580e58b6138c66f62c89856877db0b7f`. Jde o cílený měřicí vzorek, nikoli o statisticky reprezentativní prostý náhodný výběr katalogu. Výsledky je nutné vykazovat po vrstvách.

Navržený běh:

1. Doplnit zpracování dlouhých a víceoborových PDF po stránkách nebo sekcích, se zachováním čísla strany a nabídky. Ověřit, že identita oboru zůstane v každém modelovém zadání.
2. Na všech 100 nabídkách spustit nezávisle DeepSeek Flash a GPT-6 Luna se stejným schématem v4. Ukládat otisk PDF, promptu, model, cenu, přesné citace, mechanické nálezy a chyby volání. Zápis má být obnovitelný bez přepisování starších verzí.
3. Porovnat strukturovaně režim, váhy, maxima před/po vážení, další složky, minima, kritéria rovnosti a vazbu na obor. Opus 5.5 použít na všechny neshody, neúplné nebo OCR podklady a také na předem vybranou náhodnou část shodných případů. Počet volání Opusu omezit rozpočtem a zaznamenat, které případy zůstaly neposouzené.
4. Vyhodnotit zvlášť úplnost, chybná čísla, nedoložené citace, chybné přiřazení k oboru a počet případů, kde se oba levnější modely shodly na nesprávném tvrzení. Neshoda modelů znamená stav `nezjisteno`; souhlas modelů není sám o sobě lidským ověřením ani měřením skutečné přesnosti.
5. Teprve na základě této zprávy rozhodnout o běhu zbývajících nabídek. Případný hromadný běh může vytvořit pracovní návrhy pro všechny, zatímco veřejná karta zobrazí detail pouze tam, kde jsou splněna předem určená pravidla důkazů a bezrozpornosti. Rok 2026 zůstane historickým podkladem, nikoli potvrzením pravidel 2027.

Pět dokončených PDF stálo přes OpenRouter 0,005637 USD pro DeepSeek, 0,009044 USD pro Lunu a 0,288776 USD pro Opus. Lineární přepočet na 100 stejně krátkých příloh by dal asi 0,11 + 0,18 USD za první dva modely a přibližně 1,16 USD za 20 volání Opusu; vybraný vzorek ovšem obsahuje delší PDF a OCR, takže to **není rozpočet**. Pro měřicí běh navrhujeme průběžný cenový strop a zastavení při neúplné odpovědi či nečekaném růstu ceny; konkrétní hranice má být součástí běhového skriptu. Žádný modelový výstup zatím nezapisuje produkční data.

## Spuštění 24. 9. 2026

Zmrazený vzorek běží se zadáním v4 a s celým stránkovaným textem PDF. Po prvních synchronních voláních se při souběhu objevily časové limity, proto byly zbylé nabídky odeslány přes asynchronní [OpenRouter Batch API](https://openrouter.ai/docs/batch-quickstart). Dávky mají ID `batch-1790281065-sR10s8BijFbGlTKIQh1O` (DeepSeek, 85 nabídek) a `batch-1790281065-6okSQLd4GqYX0fW301j3` (Luna, 83 nabídek). Zbylé nabídky už měly místní výsledek. Stav a seznam zdrojů jsou uloženy v gitignorovaném `data/dipsy-kriteria-2026/llm-pilot/vzorek-100/<model>/batch-state.json`.

Odpovědi se stáhnou a zkontrolují příkazy `python3 scripts/dipsy-kriteria-vzorek-100-batch.py --model deepseek --poll` a obdobně `--model luna --poll`; nedokončená dávka se jen ohlásí, nová se automaticky neposílá. Po obou výsledcích následují `python3 scripts/dipsy-kriteria-vzorek-100-srovnani.py`, dávka Opusu s `--model opus --opus-queue` a `python3 scripts/dipsy-kriteria-vzorek-100-zprava.py`. Výsledek dosud není podkladem veřejného zveřejnění.

První záměrně obtížné sdílené PDF (SHA-256 `e036e31b52501a9cbfd8930e53ef1511aaf6c868ab15d3254c1efe6236b8caca`) uvádí maximálně 100 bodů za JPZ, 56 za prospěch a 10 za další kritéria, celkem 166, zároveň popisuje podíl JPZ jako 60 %. Je to přibližný podíl 100/166, nikoli přepočet JPZ na 60 bodů. Luna jej četla jako koeficient a dostala neodpovídající součet 126; DeepSeek zachoval maximum 100, ale zároveň vyplnil `jpz_vaha_pct: 60`, což jeho vlastní strukturované odpovědi odporuje. Kontrola obě nesrovnalosti označila. Při případné verzi zadání v5 je třeba oddělit deklarovaný podíl na celkovém hodnocení od skutečného násobicího koeficientu; zadání v4 během této dávky neměnit.

## Stav 25. 9. 2026

Obě první dávky dokončily všechna volání bez chyby služby. U tří odpovědí DeepSeek byl však konec `length`, proto se nebraly za úplné a tři nabídky se znovu zpracovaly jednotlivě; nyní jsou přepisy DeepSeek i Luna pro všech 100 nabídek. Srovnání najde 84 rozdílů číselné struktury a jen 16 úplných číselných shod. Doslovné textové srovnání pravidel se liší ve všech případech, ale různá formulace sama o sobě neznamená věcný rozpor. Průběžný rozpis je v `docs/podklady/dipsy-kriteria-vzorek-100-vysledky-2026-09-24.md`.

Třetí nezávislé čtení Opus bylo podle předem stanovených důvodů vybráno pro všech 100 nabídek a odesláno v dávce `batch-1790308872-dmz1DjNgSwJdZzNhU22V`. Dávka skončila 100/100 bez chyby služby a výsledky jsou zahrnuté ve zprávě. Samotná shoda tří modelů není důkazem správnosti vůči PDF.
