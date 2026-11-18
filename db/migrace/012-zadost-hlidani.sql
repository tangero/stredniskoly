-- ============================================================================
-- GENEROVÁNO z src/lib/sledovani-schema.ts
--   node --experimental-strip-types scripts/sledovani-migrace.mjs --zapis-sql
-- Neupravovat ručně; zdrojem pravdy je modul.
-- ============================================================================
alter table zadost_o_potvrzeni add column if not exists ucel text not null default 'novinky';

alter table zadost_o_potvrzeni add column if not exists skoly text[];
