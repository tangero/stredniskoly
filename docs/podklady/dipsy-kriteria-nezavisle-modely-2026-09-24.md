# Nezávislé čtení pěti kritérií: Opus 5.5 a GPT-6 Luna

Dne 24. 9. 2026 dostaly modely `anthropic/claude-opus-5.5` a `openai/gpt-6-luna` přes OpenRouter stejný text pěti PDF, stejné zadání a stejné schéma v4 jako DeepSeek. Každý běh byl samostatný: model neviděl návrh ani odpověď ostatních. Skript `scripts/dipsy-kriteria-nezavisly-vzorek.py` ukládá odpověď, model, spotřebu, cenu, otisk PDF a otisk zadání do gitignorovaného `data/dipsy-kriteria-2026/llm-pilot/nezavisly-vzorek/`. Luna běžela s úsilím `medium`; Opus s výchozím nastavením poskytovatele. Porovnávali jsme strukturovaná maxima, úplnost složek, doslovné citace a nálezy mechanické kontroly v4.

| Model | Dokončené PDF | Cena vykázaná službou | Mechanické nálezy na pěti PDF |
|---|---:|---:|---|
| DeepSeek Flash, zadání v4 | 5 | 0,005637 USD | 1 / 1 / 0 / 2 / 4 |
| GPT-6 Luna | 5 | 0,009044 USD | 0 / 1 / 1 / 2 / 1 |
| Opus 5.5 | 5 | 0,288776 USD | 0 / 0 / 0 / 0 / 2 |

Pořadí pěti PDF v posledním sloupci: Plasy, PED Academy, Gymnázium Joachima Barranda, Čáslav, SOU elektrotechnické. Čísla jsou počty kódových nálezů, **ne počet věcných chyb**. Zahrnují i nepřesnou doslovnou citaci a neurčené maximum složky. Opus vyšel v této pětici asi 32krát dráž než Luna podle ceny vrácené OpenRouter. Jde o účtování těchto konkrétních volání, nikoli o ceníkovou cenu všech možných poskytovatelů.

| PDF | Kontrolní závěr z dokumentu | Opus 5.5 | GPT-6 Luna |
|---|---|---|---|
| Plasy | JPZ 50 + 50 = 100; minimum 11 z každého předmětu | Souhlasí, doslovné doklady bez mechanického nálezu | Souhlasí, doslovné doklady bez mechanického nálezu |
| PED Academy | JPZ (50 + 50) × 0,60 = 60; OSP 30; pohovor 10; celkem 100 | Souhlasí; upozornil na nejasný výklad hranice 20 bodů | Souhlasí; upozornil na hranici 20 bodů, jedna citace není doslovná |
| Gymnázium Joachima Barranda | JPZ 100 + známky 10 + soutěž 1 = 111 | Souhlasí; „lepší výsledek“ vyložil opatrně jako lepší termín u každého předmětu | Souhlasí; stejnou formulaci označil za nejasnou, jedna citace není doslovná |
| Čáslav | Surový prospěch 40 × 0,25 = 10; JPZ 100 × 0,75 = 75; odvozené maximum 85, PDF je neuvádí | Souhlasí; výslovně oddělil odvozené maximum od údaje školy | Souhlasí; chybí doklad váhy JPZ a jedna citace není doslovná |
| SOU elektrotechnické | Přesný součet a vazba na zaměření nejsou z podkladu bezpečně určeny | Výpočet ponechal neurčený; jako možné faktory uvedl prospěch i chování bez bodových maxim | Výpočet ponechal neurčený; uvedl prospěch bez bodového maxima a upozornil na nejasnou vazbu oboru |

Nezávislé čtení tedy v těchto případech odhalí tři dříve pozorované chyby modelového návrhu: výběr jen jednoho předmětu u Barrandova gymnázia by neodpovídal 111 bodům, dvojí použití váhy u PED Academy by neodpovídalo 100 bodům a celkové maximum 100 odvozené z pouhého součtu procent u Čáslavi by odporovalo skutečným maximům složek. Luna i Opus se na potřebných číselných polích shodly. Opus měl přesnější doslovné citace, Luna je v tomto vzorku násobně levnější. U pátého dokumentu se modely liší v klasifikaci chování jako samostatné bodované složky; dokument uvádí chování mezi kritérii a zároveň nulový počet bodů při snížené známce, ale neuvádí samostatnou stupnici.

Pět známých příloh nestačí ke změření četnosti přehlédnutých chyb v celé dávce. Shoda dvou či tří modelů může být společnou chybou způsobenou stejným OCR textem, zadáním nebo nejednoznačným PDF. Pro další měření dává smysl použít Lunu jako levné druhé nezávislé čtení a Opus na neshody **i na náhodnou část shodných případů**. Na stratifikovaném vzorku je nutné sledovat, kolik chybných detailů by po všech kontrolách přesto prošlo; bez externě ověřené reference jde jen o míru shody, nikoli o přesnost. Když se podklady neshodnou nebo zůstane neurčené maximum či vazba oboru, zveřejnit lze jen historický zdroj a stav „bodový postup nezjištěn“.
