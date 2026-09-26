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

create table if not exists veletrh_akce (
  id text primary key,
  sezona text not null,
  data jsonb not null,
  verze int not null default 1,
  smazano boolean not null default false,
  vytvoreno timestamptz not null default now(),
  zmeneno timestamptz not null default now()
);

create index if not exists veletrh_akce_sezona_idx
  on veletrh_akce (sezona) where not smazano;

create table if not exists veletrh_navrh (
  id uuid primary key,
  klic text not null,
  autor text not null,
  operace jsonb not null,
  zdroj_url text,
  zdroj_email text,
  nahlaseni_id bigint,
  poznamka text,
  varovani jsonb not null default '[]',
  stav text not null default 'ceka' check (stav in ('ceka', 'schvaleno', 'provedeno', 'zamitnuto', 'stazeno')),
  chyba text,
  rozhodl text,
  rozhodnuto timestamptz,
  duvod text,
  vytvoreno timestamptz not null default now()
);

create unique index if not exists veletrh_navrh_klic
  on veletrh_navrh (klic);

create index if not exists veletrh_navrh_stav
  on veletrh_navrh (stav, vytvoreno desc);

create table if not exists veletrh_audit (
  id bigserial primary key,
  cas timestamptz not null default now(),
  kdo text not null,
  udalost text not null,
  navrh_id uuid,
  akce_id text,
  pred jsonb,
  po jsonb,
  zdroj_url text,
  zdroj_email text
);

create index if not exists veletrh_audit_akce
  on veletrh_audit (akce_id, cas desc);
