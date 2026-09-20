-- ============================================================================
-- GENEROVÁNO z src/lib/udalosti-schema.ts
--   node --experimental-strip-types scripts/udalosti-migrace.mjs --zapis-sql
-- Neupravovat ručně; zdrojem pravdy je modul.
-- ============================================================================
create table if not exists udalost (
  id uuid primary key,
  klic text not null,
  typ text not null,
  sada text,
  obdobi text,
  redizo text,
  novinka_id uuid,
  veta text not null,
  odkaz text,
  publikovano timestamptz not null default now(),
  vytvoreno timestamptz not null default now()
);

create unique index if not exists udalost_klic on udalost (klic);

create index if not exists udalost_cas on udalost (publikovano desc);

create table if not exists udalost_skola (
  udalost_id uuid not null references udalost on delete cascade,
  redizo text not null,
  primary key (udalost_id, redizo)
);

create index if not exists udalost_skola_skola on udalost_skola (redizo);
