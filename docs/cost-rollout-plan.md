# Rollout Plan: Cost Optimization + Fallback

## Cíl
- Snížit náklady na Vercelu bez regresí UX.
- Nasazovat změny po fázích s jasným kill-switchem.
- Mít možnost rychlého návratu bez revertu kódu.

## Co je implementované
- Feature-flag response cache pro:
- `POST /api/praha-dostupnost`
- `POST /api/dostupnost`
- Diagnostika cache v API odpovědi (`diagnostics.responseCache`).

## Konfigurační proměnné
- `PRAHA_DOSTUPNOST_RESPONSE_CACHE_ENABLED` (`true|false`, default `false`)
- `PRAHA_DOSTUPNOST_RESPONSE_CACHE_TTL_MS` (default `300000`)
- `PRAHA_DOSTUPNOST_RESPONSE_CACHE_MAX_ITEMS` (default `200`)
- `DOSTUPNOST_RESPONSE_CACHE_ENABLED` (`true|false`, default `false`)
- `DOSTUPNOST_RESPONSE_CACHE_TTL_MS` (default `300000`)
- `DOSTUPNOST_RESPONSE_CACHE_MAX_ITEMS` (default `200`)

## Fáze Rolloutu
1. Fáze 0: Baseline
- Nechat oba `*_ENABLED=false`.
- 24 hodin sbírat baseline latency/cost data.
- Gate: známe p95 latency a error-rate pro oba endpointy.

2. Fáze 1: Praha cache
- Nastavit `PRAHA_DOSTUPNOST_RESPONSE_CACHE_ENABLED=true`.
- Ostatní proměnné bez změny.
- Gate po 24 h:
- error-rate beze změny nebo lepší
- p95 `POST /api/praha-dostupnost` nevzrostla o více než 15 % proti baseline
- trend compute cost jde dolů

3. Fáze 2: Dostupnost cache
- Nastavit `DOSTUPNOST_RESPONSE_CACHE_ENABLED=true`.
- Gate po 24 h:
- error-rate beze změny nebo lepší
- p95 `POST /api/dostupnost` nevzrostla o více než 15 % proti baseline
- trend compute cost jde dolů

4. Fáze 3: Tuning TTL/MAX
- Podle hit-rate zvýšit TTL (např. 5 min -> 10 min) nebo `MAX_ITEMS`.
- Gate:
- bez nárůstu stížností na zastaralá data
- další pokles compute

## Ověření po nasazení
1. Projít API odpovědi:
- `diagnostics.responseCache.enabled`
- `diagnostics.responseCache.hit`
- `diagnostics.responseCache.ttlMs`
2. Ověřit funkční flow:
- stránka dojezdovosti
- autocomplete adres a zastávek
- stránkování výsledků
3. Ověřit Vercel Billing:
- `Build Minutes`, `Fluid Active CPU`, `Function Invocations`

## Fallback / Rollback Playbook
1. L1: Okamžité omezení rizika
- Vypnout jen Praha cache:
- `PRAHA_DOSTUPNOST_RESPONSE_CACHE_ENABLED=false`

2. L2: Úplné vypnutí cache optimalizací
- Vypnout oba endpointy:
- `PRAHA_DOSTUPNOST_RESPONSE_CACHE_ENABLED=false`
- `DOSTUPNOST_RESPONSE_CACHE_ENABLED=false`

3. L3: Návrat kódu
- Revertnout commit s cache změnami.
- Použít pouze pokud L1/L2 nestačí.

## Kritéria pro stop rolloutu
- Error-rate endpointu naroste o více než 20 % proti baseline.
- p95 latency naroste o více než 15 % proti baseline.
- Objeví se konzistentní stížnosti na neaktuální data.

## Doporučení mimo kód (největší úspora)
- Omezit počet production deployů (build policy/filters).
- Udržet rollout cache oddělený od deploy-policy změn, aby šly dopady dobře měřit.
