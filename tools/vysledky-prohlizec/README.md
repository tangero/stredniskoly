# Prohlížeč výsledků rešerše návazností 2025–2026

Statický offline nástroj pro **kontrolu (review)** výsledků rešerše návaznosti škol. Read-only — nic neukládá ani nemění.

## Otevření

Výstupní soubor je self-contained (inline data, žádné externí závislosti) a funguje přes `file://`:

```
open docs/prohlizec-vysledku-navaznosti.html
```

## Obnovení po změně dat

```
python3 tools/vysledky-prohlizec/build.py
```

Skript načte vstupy, vloží je jako inline JSON do `template.html` (místo `__DATA__`) a přepíše **pouze** výstupní HTML. Build je idempotentní a původní data nemění.

## Vstupy

- `docs/podklady/fronta-dohledavani-2025-2026.json` — fronta úkolů (`version`, `summary`, `tasks`; 192 úkolů s `context_offers` a `issues`).
- `docs/podklady/vysledky-navaznosti-2025-2026/*.json` — jeden soubor na zpracovaný úkol (`task_id`, `registry_check`, `findings`). Nezpracované úkoly se v prohlížeči zobrazí se stavem „Nezahájeno".

Build skontroluje, že každý soubor výsledků odkazuje na existující `task_id` fronty; jinak skončí chybou.

## Co prohlížeč umí

- Souhrn v hlavičce: počty úkolů, zpracovaných a statusů nálezů.
- Seznam úkolů s vyhledáváním (škola, REDIZO, ID, obec) a filtry: stav zpracování, priorita, status nálezu, doporučená akce.
- Detail úkolu: nabídky CERMAT 2025 vs. 2026 vedle sebe, tabulka otázek, box kontroly rejstříku MŠMT, nálezy se statusem, pozorováními, závěrem, návazností, adresami, evidencí (klikatelné odkazy) a nezodpovězenými otázkami.
