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
