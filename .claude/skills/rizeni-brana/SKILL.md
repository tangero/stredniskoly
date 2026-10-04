---
name: rizeni-brana
description: Jak brána sloučení posuzuje PR v tangero/stredniskoly (režimy R, L, E, K, H2, souhlas, stop, lhůty), šablona popisu PR a jak PR sloučit skriptem. Použij před otevřením PR, při čtení výsledku kontroly „Brána sloučení“ a před sloučením.
---

# Brána sloučení

Pravidla: `docs/navrh-rizeni-vyvoje-2027.md`, oddíly 4 až 9. Cesty a limity: `.github/rezimy.yml` v `main`.
Kód: `scripts/brana/`. Brána běží z `main` při každé změně PR, štítků, propojených issues a komentářů
a každou hodinu. Výsledek zapíše jako kontrolu „Brána sloučení“ na aktuální commit PR.

## Co brána pustí

| režim | kdy | podmínka |
|---|---|---|
| R | štítek `rutina` na PR nebo issue, do 150 řádků mimo testy, jedna oblast, bez cest K a H2 | hned |
| E | propojené issue se štítkem `projekt` a dokladem `Zdroj:`, nebo úkol s vlastním dokladem, který je sub-issue schváleného projektu (otevřený rodič `projekt` se `schvaleno` nebo dokladem, bez `navrh`, `zamitnuto` a štítků hlášení); také veřejné hlášení, které je sub-issue schváleného projektu (RA39); `stop` na rodiči blokuje i úkol | hned |
| L | ostatní interní zadání s dokladem `Zdroj:` | 48 h od prvního vyhodnocení stavu bez `stop` |
| souhlas | propojené issue se `schvaleno` od Patricka, rozsah od schválení beze změny | hned |
| K | cesty z `k` v `rezimy.yml` (migrace, e-maily, portál, nasazení, workflow, závislosti, registr sad, slovník ukazatelů), PR bez zadání, hlášení mimo schválený projekt | `schvaleno` na PR nebo na issue |
| H2 | brána, `rezimy.yml`, `labeler.yml`, `CLAUDE.md`, workflow se změnou oprávnění nebo secrets | `schvaleno` přímo na PR, platí pro jeden commit |

**Autoři (repozitář je veřejný):** doklad `Zdroj:` platí jen v issue od vlastníka nebo asistenta zadání
(`vlastnik`, `asistent` v `rezimy.yml`), protokol z preview jen od nich nebo `github-actions[bot]`
a PR jiného autora (fork, Dependabot) projde jen se `schvaleno` na PR.

Vždy: `stop` blokuje, při zamrznutí projde jen `incident` v rozsahu rutiny, u změn webu musí být
protokol z preview k aktuálnímu commitu (skill `overeni-preview`).

**Lhůta L** se založí znovu při novém commitu, změně oddílu „Rozsah“ propojeného issue a novém nebo
upraveném protokolu. Push na konci lhůty ji tedy restartuje; nepushuj kosmetické změny do čekajícího PR.

**Propojení s issue** se čte z těla PR: `Closes #N` nebo `Souvisí s #N`.

## Jak číst výsledek

```bash
sha=$(gh api repos/tangero/stredniskoly/pulls/<PR> --jq .head.sha)
gh api "repos/tangero/stredniskoly/commits/$sha/check-runs?check_name=Br%C3%A1na%20slou%C4%8Den%C3%AD" \
  --jq '.check_runs[0] | "\(.conclusion): \(.output.title)\n\(.output.summary)"'
```

Nanečisto, bez zápisu: `node scripts/brana/sloucit.mjs <PR> --jen-vyhodnotit`.

Když brána neprošla kvůli chybějícímu souhlasu, nežádej o něj v komentáři opakovaně: věc je ve frontě
Patricka (štítek `navrh` na issue) a zmíní ji týdenní přehled.

## Sloučení

Jen `node scripts/brana/sloucit.mjs <PR>` a jen když je v `rezimy.yml` na `main` `slucovani_ai: true`.
Skript vyhodnotí PR, komentářem si vyžádá nové vyhodnocení na serveru, počká na odpověď na tuto žádost,
znovu ověří `stop` a commit a sloučí s pevným `sha`. Selhání skriptu nepřebíjej jiným způsobem sloučení.

Totéž dělá automaticky workflow **Sloučení** (`.github/workflows/slouceni.yml`, RA40): po každém doběhnutí
brány sloučí všechny otevřené PR, jejichž poslední kontrola prošla. Ruční spuštění skriptu je potřeba jen
tehdy, když nechceš čekat na další běh brány.

## Šablona popisu PR

```
Closes #N

## Co se změnilo
- …

## Jak ověřit na náhledu
1. Otevři <adresa náhledu>/skola/<slug> …
2. Očekávaný výsledek: …

## Kontroly
- [x] ESLint nad změněnými soubory
- [x] npx tsc --noEmit
- [x] npm test, npm run test:js, npm run test:mesto
- [x] npm run build

## Mimo rozsah / poznámky
- …
```
