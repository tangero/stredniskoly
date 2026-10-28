-- ============================================================================
-- GENEROVÁNO z src/lib/sledovani-schema.ts
--   node --experimental-strip-types scripts/sledovani-migrace.mjs --zapis-sql
-- Neupravovat ručně; zdrojem pravdy je modul.
-- ============================================================================
create table if not exists odber_skoly (
  odberatel_id uuid not null references odberatel on delete cascade,
  redizo text not null,
  zdroj text not null,
  potvrzeno timestamptz not null default now(),
  primary key (odberatel_id, redizo)
);

create index if not exists odber_skoly_skola on odber_skoly (redizo);

alter table doklad_souhlasu add column if not exists ucel text not null default 'novinky';
