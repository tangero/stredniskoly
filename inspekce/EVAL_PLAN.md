# Eval plán: pilot 10 zpráv (SŠ)

## Scope

- 10 zpráv ČŠI pro střední školy (`GY4/GY8/SOS/SOU/LYC`, 2+2+2+2+2).
- 7 modelů:
  - `grok_4_1_fast`
  - `deepseek_chat`
  - `qwen_turbo`
  - `openrouter_pony_alpha`
  - `claude_haiku_4_5`
  - `claude_sonnet_4_5`
  - `openai_gpt_5_2_reference` (reference + judge)

## Co přesně vyhodnocujeme

- Faktická věrnost vůči inspekční zprávě.
- Pokrytí rodičovsky důležitých témat.
- Praktická použitelnost shrnutí.
- Srozumitelnost češtiny.

## Metriky

### 1) LLM-as-a-judge (primární)

Judge vrací skóre 1–5:

- `faithfulness_score_1_5`
- `completeness_score_1_5`
- `parent_usefulness_score_1_5`
- `czech_clarity_score_1_5`

Plus:

- `unsupported_claims_count`
- `critical_issues[]`
- `best_points[]`

### 2) Heuristika srozumitelnosti češtiny (sekundární)

- Průměrná délka věty.
- Podíl dlouhých vět.
- Průměrná délka slova.
- Poměr jargon slov.
- Z toho `heuristic_czech_clarity_score_1_5`.

### 3) Kombinované skóre reportu

- `0.35 * faithfulness`
- `0.25 * completeness`
- `0.20 * parent_usefulness`
- `0.20 * blended_czech_clarity`
- Penalizace za unsupported claims.

`blended_czech_clarity = 0.7 * judge_czech + 0.3 * heuristic_czech`.

## Jak použít LLM-as-a-judge správně

- Judge je oddělený model (`openai_gpt_5_2_reference`).
- Hodnotí anonymně modelový výstup proti zdroji.
- Nevyužívá interní znalost světa, jen dodaný text.
- Výsledek bereme jako ranking signál, ne absolutní pravdu.

## Human check

- Doporučení: ručně zkontrolovat minimálně top 2 modely na všech 10 zprávách.
- V případě malého rozdílu (`< 0.3` bodu v průměrném overall) rozhodnout ručně.

## Výstupy

- `data/judge/scoreboard_rows.csv`
- `data/judge/scoreboard_summary.json`
