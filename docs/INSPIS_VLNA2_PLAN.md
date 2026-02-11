# InspIS - VLNA 2 Realizační plán

**Datum:** 11. 2. 2026  
**Vstupní podmínka:** nasazená stabilní VLNA 1

## Aktuální stav implementace

- [x] Rozšířené mapování VLNA 2 v `scripts/import-inspis-data.js`
- [x] Rozšířené typy VLNA 2 v `src/types/inspis.ts`
- [x] Rozšířené UI bloky v `src/components/school-profile/SchoolInfoSection.tsx`
- [x] Přegenerovaný dataset `data/inspis_school_profiles.json`
- [ ] UX iterace (taby/modální detail) podle uživatelského testu

## Gate kritéria před startem

- Coverage VLNA 1 dat >= 50 %
- Bez kritických regresí na stránce `/skola/[slug]`
- Lighthouse performance >= 90 na referenční škole
- 7 dní stabilního provozu po deployi VLNY 1

## Scope VLNA 2

### Datové oblasti

- specifické akce školy,
- mezinárodní spolupráce,
- evropské projekty,
- podpora žáků (specialisté, stipendia, parlament),
- spolupráce s firmami a certifikáty.

### UX oblasti

- rozšířený detail „O škole\" (tabované sekce),
- filtrování zvýrazněných kategorií,
- jasnější odlišení „ověřené / neuvedené\".

## Technický postup

1. Rozšířit mapování v `scripts/import-inspis-data.js` o VLNA 2 otázky.
2. Rozšířit `src/types/inspis.ts` o VLNA 2 pole.
3. Aktualizovat `src/components/school-profile/SchoolInfoSection.tsx` nebo přidat modal/detail komponentu.
4. Přegenerovat `data/inspis_school_profiles.json`.
5. Ověřit build/lint + UX regression check.

## Backlog (priorita)

1. Mezinárodní spolupráce + evropské projekty
2. Podpora žáků
3. Certifikáty a spolupráce s firmami
4. Rozšířené mimoškolní aktivity

## Definition of Done - VLNA 2

- Data VLNA 2 jsou dostupná v JSON artefaktu.
- UI ukazuje VLNA 2 sekce bez degradace mobile UX.
- Žádná regresní chyba v lintu/build.
- Aktualizovaná dokumentace (`INSPIS_README.md`, `INSPIS_INTEGRACE_PLAN.md`).
