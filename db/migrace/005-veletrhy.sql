-- ============================================================================
-- GENEROVÁNO z src/lib/veletrhy-schema.ts
--   node --experimental-strip-types scripts/veletrhy-migrace.mjs --zapis-sql
-- Neupravovat ručně; zdrojem pravdy je modul.
-- ============================================================================
create table if not exists veletrh_nahlaseni (
  id bigserial primary key,
  nazev text not null,
  start_den date not null,
  konec_den date not null,
  adresa text not null,
  mesto text not null,
  kraj_kod text not null,
  url text not null,
  poradatel text not null,
  -- Kontakt na oznamovatele: slouží zpětnému dotazu, na web nepatří.
  email text not null,
  popis text,
  stav text not null default 'nove' check (stav in ('nove', 'overeno', 'zamitnuto', 'duplicita')),
  -- false neznamená „e-mail neodešel“, ale „nevíme o tom, že odešel“: když
  -- databáze neodpoví do limitu, handler pokračuje poštou a příznak už nemá
  -- kam zapsat.
  odeslano_mailem boolean not null default false,
  poznamka text,
  vytvoreno timestamptz not null default now()
);

create index if not exists veletrh_nahlaseni_stav_idx
  on veletrh_nahlaseni (stav, vytvoreno desc);
