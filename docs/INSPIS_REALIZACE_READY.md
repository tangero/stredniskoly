# InspIS Profil školy - Readiness pro samostatnou realizaci

**Datum:** 11. 2. 2026  
**Scope:** Audit plánu + připravenost Kickoffu FÁZE 1 + podklad pro plán VLNY 2

## 1) Shrnutí auditu

Dokumentace je kvalitní a detailní, ale v aktuálním repozitáři není zatím spustitelná bez doplnění rozhodnutí a několika technických kroků.

### Co je připravené
- Jasný produktový cíl a prioritizace VLNA 1 vs. VLNA 2.
- Návrh UX sekce "O škole" včetně mobile varianty.
- Importní skript a ukázkové komponenty.

### Co aktuálně blokuje autonomní implementaci
- Je potřeba dokončit přechod celé dokumentace na file-based variantu.
- `docs/INSPIS_KOMPONENTY_PRIKLAD.tsx` je reference, ne produkční komponenta.
- Chybí finální napojení ETL + loader + UI přímo v aplikaci.

## 2) Rozhodnutí k potvrzení (stav)

1. **Architektura datové vrstvy**
   - Stav: **schváleno** - Vercel/file-based varianta bez DB.
   - Důvod: data jsou kvartálně aktualizovaná a přirozeně sedí do existujícího modelu (`public`/`data` + cache).

2. **Umístění sekce "O škole"**
   - Doporučení: potvrdit umístění **pod grid oborů a nad inspekčním shrnutím**.
   - Důvod: minimální zásah do současného toku stránky.

3. **Rozsah VLNY 1 (striktní freeze)**
   - Doporučení: držet jen pole: školné, zaměření, studenti/kapacita, přijímačky, jazyky, vybavení, dostupnost.
   - Důvod: snížení rizika skluzu a bundle/performance regressí.

4. **Fallback pro školy bez dat**
   - Doporučení: sekci "O škole" vůbec nerenderovat, pouze interně trackovat `has_inspis_data=false`.
   - Důvod: čistší UX a žádný "prázdný box".

5. **Publikační režim**
   - Doporučení: rollout přes feature flag (`INSPIS_ENABLED`) + staging smoke test.
   - Důvod: bezpečný deploy a rychlý rollback.

6. **Ownership**
   - Potřeba doplnit jmenovitě: Product Owner, Tech Lead, QA.

## 3) Schvalovací balíček dat a UX (k odsouhlasení)

## Datový výběr VLNA 1
- `rocni_skolne`, `zamereni`, `aktualni_pocet_zaku`, `nejvyssi_povoleny_pocet_zaku`
- `prijimaci_zkousky`, `zkousky_z_predmetu`, `pripravne_kurzy`, `dny_otevrenych_dveri`, `termin_prijimacich_zkousek`
- `vyuka_jazyku`, `clil_metoda`, `clil_jazyky`, `vyuziti_internetu_ve_vyuce`
- `odborne_ucebny`, `prostory_telocvik`, `pristup_k_pc`
- `bezbariery_pristup`, `dopravni_dostupnost`, `linka_mhd`, `nejblizsi_zastavka_m`, `umisteni_v_obci`

## UX návrh VLNA 1
- Sekce `O škole` jako samostatný blok na overview stránky školy.
- Top 3 karty: školné, zaměření, studenti/kapacita.
- Bloky: jazyky, vybavení, přijímací řízení, dostupnost.
- Mobile: collapsible sekce, touch target >= 44 px.

## 4) Kickoff FÁZE 1 (prováděcí runbook)

## Den 1 - foundation
- Potvrdit rozhodnutí z kapitoly 2.
- Definovat finální datový kontrakt InspIS pro VLNU 1.
- Ujednotit kontrakt polí mezi:
  - ETL skriptem (nový export do JSON)
  - výstupním JSON souborem (`data/inspis_school_profiles.json`)
  - TS typem `SchoolInspISData`

## Den 2 - data import
- Spustit ETL: CSV -> normalizovaný JSON podle REDIZO.
- Uložit výstup do `data/inspis_school_profiles.json` (server-side only, ne do `public/`).
- Importnout sample batch (10 škol), pak full export.
- Validace:
  - počet škol ve výstupním JSON
  - coverage report (samostatný summary JSON/log)
  - kontrola 3 náhodných REDIZO proti CSV

## Den 3 - backend integration
- Přidat datovou funkci v `src/lib/data.ts` pro načtení InspIS dle REDIZO.
- Připravit server-side cache (24h revalidate).
- Přidat minimálně 2 integrační testy:
  - škola s daty
  - škola bez dat

## 5) Definition of Ready pro autonomní realizaci

Implementace může běžet samostatně, pokud jsou splněny všechny body:
- Schváleny body v kapitole 2.
- Potvrzen finální seznam polí VLNA 1.
- Potvrzeni vlastníci (PO, TL, QA).
- Schválen rollout (feature flag + staging gate).

## 6) Vstup pro plán VLNY 2 (po dokončení VLNY 1)

VLNU 2 plánovat až po splnění těchto gate kritérií:
- Coverage dat alespoň 50 % škol.
- Lighthouse performance >= 90 na referenční škole.
- Bez regresí v Core web vitals na overview stránce.
- Stabilita 7 dní po produkčním nasazení VLNY 1.
