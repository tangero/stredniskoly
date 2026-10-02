# Inspekce: pilot evaluace LLM pro zprávy ČŠI (SŠ)

Tento adresář je určen pro lokální pilot vyhodnocení modelů nad inspekčními zprávami středních škol.

## Cíl

- Porovnat modely pro extrakci rodičovsky užitečných dat.
- Zahrnout kvalitu faktické extrakce i srozumitelnost češtiny na výstupu.
- Použít referenční nejnovější OpenAI model (`gpt-5.2`) jako judge/reference.

## Co je připravené

- `config/pilot_10_reports.json` – 10 vybraných SŠ zpráv.
- `config/models.json` – modely pro pilot:
  - Grok 4.1 Fast
  - DeepSeek Chat
  - Qwen Turbo
  - OpenRouter Pony Alpha
  - Claude Haiku 4.5
  - Claude Sonnet 4.5
  - OpenAI GPT-5.2 (reference + judge)
  - u každého modelu lze nastavit `request_timeout_seconds`, `max_retries`, `initial_backoff_seconds`
- `schemas/extraction_output.schema.json` – požadovaná struktura výstupu.
- `prompts/extraction_system.txt` – systémový prompt pro extrakci.
- `prompts/judge_system.txt` – systémový prompt pro LLM-as-a-judge.
- `scripts/` – celý pipeline:
  - `download_reports.py`
  - `extract_texts.py`
  - `run_extraction.py`
  - `run_judge.py`
  - `aggregate_scores.py`
  - `run_full_pilot.sh`

## Rychlý start

1. Nastav klíče:

```bash
export OPENROUTER_API_KEY=...
```

2. Stáhni PDF:

```bash
cd inspekce
python3 scripts/download_reports.py
```

3. Převod PDF -> TXT:

```bash
python3 scripts/extract_texts.py
```

4. Spusť extrakci:

```bash
python3 scripts/run_extraction.py
```

5. Spusť judge hodnocení:

```bash
python3 scripts/run_judge.py
```

6. Vygeneruj scoreboard:

```bash
python3 scripts/aggregate_scores.py
```

## Týdenní běh v GitHub Actions (#266)

Workflow `.github/workflows/csi-weekly-refresh.yml` po změně seznamu inspekcí ČŠI shrne nové zprávy
ve stejném pull requestu jako seznam:

1. převezme PDF, texty a výstupy z ještě nesloučeného **otevřeného** PR (`codex/csi-weekly-refresh`), aby se nic
   nestahovalo a neplatilo znovu; ze zavřeného PR nepřebírá nic. Předpokládá, že `inspekce/data` se na `main`
   mezi běhy jinak nemění;
2. `generate_manifest.py`;
3. `vyber_chybejici.py`: zprávy bez použitelného shrnutí v žádném modelu z `WEB_MODELY`, od nejnovější,
   nejvýš strop z `config/tydenni.json`; nečitelné texty a zprávy bez odkazu jsou výjimky;
4. `download_reports.py` (1 dotaz najednou, prodleva z konfigurace, chyba HTTP běh zastaví),
   `extract_texts.py --doplnit-index` (index zůstane úplný i nad dílčím manifestem),
   `run_extraction.py --force` modelem z konfigurace se 2 souběžnými voláními;
5. `export_extractions.py --pro-web` a při změně `stav-datovych-sad.py prepni csi-extrakce`;
6. `telo_pr.py`: tabulka nových shrnutí od posledního sloučení (první přednost a výtka, bez citací)
   ke kontrole proti zprávě, zprávy nad strop a výjimky.

Automaticky kroky běží jen při změně seznamu. Zprávy nad strop proto počkají na další změnu seznamu,
případně na ruční spuštění `workflow_dispatch` se vstupem `shrnuti_i_bez_zmeny`, které shrnutí a PR
připraví i bez změny seznamu. Bez secretu `OPENROUTER_API_KEY` se stahování a shrnutí přeskočí a PR to uvede.

Schválený způsob (portál ČŠI, OpenRouter, model, strop 60, 2 volání najednou, prodleva 2 s, odhad
ceny 0,02–0,03 USD za zprávu) je v issue #266. Změna kteréhokoli parametru v `config/tydenni.json`
nebo `config/production_models.json` znamená nové ohlášení v issue (CLAUDE.md, pravidlo 7).

**Rollback:** revert sloučeného PR vrátí seznam, shrnutí, export i registr najednou; nesloučené PR
stačí zavřít. Workflow jde zastavit vypnutím v Actions.

## Výstupy

- `data/outputs/<model_id>/<report_id>.json` – extrakce modelu.
- `data/judge/<judge_model_id>/<model_id>/<report_id>.json` – judge výstup.
- `data/judge/scoreboard_rows.csv` – report-level skóre.
- `data/judge/scoreboard_summary.json` – agregované pořadí modelů.

## Skórování

- LLM judge:
  - `faithfulness_score_1_5`
  - `completeness_score_1_5`
  - `parent_usefulness_score_1_5`
  - `czech_clarity_score_1_5`
  - `unsupported_claims_count`
- Heuristika češtiny:
  - průměrná délka věty,
  - podíl dlouhých vět,
  - průměrná délka slova,
  - detekce úřednického/jargon stylu.
- Kombinované skóre reportu:
  - `0.35 * faithfulness`
  - `0.25 * completeness`
  - `0.20 * parent_usefulness`
  - `0.20 * blended_czech_clarity`
  - penalizace za unsupported claims.

## Poznámka k referenčnímu OpenAI modelu

Jako reference/judge je připraven `gpt-5.2` (ověřeno proti OpenAI dokumentaci k 2026-02-09).

- https://platform.openai.com/docs/models
- https://platform.openai.com/docs/introduction
