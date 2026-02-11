# Plán integrace dat InspIS PORTÁL do Profilů škol (bez DB)

**Datum:** 11. 2. 2026  
**Cíl:** Rozšířit profil školy o InspIS data bez externí databáze, plně v rámci Vercel stacku.

## 1. Cílová architektura

### Datový tok

1. CSV od ČŠI (`/tmp/inspis_portal_skoly.csv`)
2. ETL `scripts/import-inspis-data.js`
3. JSON artefakt `data/inspis_school_profiles.json` (index podle REDIZO)
4. Server-side loader `src/lib/data.ts` (cache)
5. UI render v `src/app/skola/[slug]/page.tsx`

### Principy

- bez Supabase a bez dalších runtime služeb,
- data jen server-side (neexponovat celý dataset do `public/`),
- deterministic deploy artifact přes git.

## 2. Scope VLNA 1

### Datové bloky

- Základní: `rocni_skolne`, `zamereni`, `aktualni_pocet_zaku`, `nejvyssi_povoleny_pocet_zaku`
- Přijímačky: `prijimaci_zkousky`, `zkousky_z_predmetu`, `pripravne_kurzy`, `dny_otevrenych_dveri`, `termin_prijimacich_zkousek`
- Výuka: `vyuka_jazyku`, `clil_metoda`, `clil_jazyky`, `vyuziti_internetu_ve_vyuce`
- Vybavení: `odborne_ucebny`, `prostory_telocvik`, `pristup_k_pc`
- Dostupnost: `bezbariery_pristup`, `dopravni_dostupnost`, `linka_mhd`, `nejblizsi_zastavka_m`, `umisteni_v_obci`

### UX

- Nová sekce „O škole"
- Umístění: mezi „Obory a zaměření" a „Inspekce"
- Fallback: bez InspIS dat se sekce nezobrazuje

## 3. Implementační fáze

### FÁZE 1: Data pipeline (2-3 dny)

- [ ] ETL CSV -> JSON podle REDIZO
- [ ] Coverage report (`data/inspis_coverage_summary.json`)
- [ ] Validace náhodného vzorku škol

### FÁZE 2: Backend loader (1 den)

- [ ] Typy `src/types/inspis.ts`
- [ ] Loader funkce v `src/lib/data.ts`
- [ ] In-memory cache datasetu

### FÁZE 3: UI (2-3 dny)

- [ ] Komponenta `SchoolInfoSection`
- [ ] Integrace do overview stránky školy
- [ ] Mobile layout a fallbacky pro null hodnoty

### FÁZE 4: QA (1-2 dny)

- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] Kontrola 3 referenčních škol (s daty / bez dat / částečná data)

### FÁZE 5: Deploy (1 den)

- [ ] Staging smoke test
- [ ] Production deploy
- [ ] Monitoring engagement/performance

## 4. Metriky

- Coverage InspIS: cílově >= 50 % škol
- Lighthouse performance: >= 90 na referenční škole
- Bez vizuálních regresí overview stránky

## 5. Rizika a mitigace

| Riziko | Dopad | Mitigace |
|---|---|---|
| Neúplná data od škol | střední | UI fallback + podmíněný render bloků |
| Změna textů otázek v CSV | střední | normalizace názvů otázek + audit log unmapped |
| Nárůst velikosti artefaktu | střední | držet jen VLNA 1 pole, neukládat surové řádky |

## 6. VLNA 2 (navazující)

Spouštět až po stabilizaci VLNY 1:

- specifické akce školy,
- mezinárodní spolupráce,
- evropské projekty,
- podpora žáků, spolupráce s firmami.

## 7. Definition of Done - VLNA 1

- ETL produkuje validní JSON artefakt,
- `getInspisDataByRedizo` vrací data pro známé REDIZO,
- sekce „O škole" je na profilech se záznamem,
- build + lint bez chyb,
- dokumentace odpovídá produkčnímu řešení.
