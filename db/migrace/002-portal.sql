-- ============================================================================
-- GENEROVÁNO z src/lib/portal-schema.ts
--   node --experimental-strip-types scripts/portal-migrace.mjs --zapis-sql
-- Neupravovat ručně; zdrojem pravdy je modul, protože migraci je potřeba umět
-- spustit i z nasazené aplikace (/api/portal/migrace).
-- ============================================================================
create table if not exists portal_role (
  id uuid primary key,
  redizo text not null,
  osoba_id uuid not null,
  role text not null check (role in ('spravce', 'editor')),
  email text not null,
  jmeno text not null,
  funkce text not null default '',
  zverejnit_jmeno boolean not null default false,
  platne_od timestamptz not null default now(),
  zneplatneno timestamptz,
  nahrazuje_id uuid references portal_role,
  zmenu_provedl text not null,
  duvod text
);

create unique index if not exists portal_role_jeden_spravce
  on portal_role (redizo) where role = 'spravce' and zneplatneno is null;

create unique index if not exists portal_role_osoba_skola
  on portal_role (redizo, osoba_id) where zneplatneno is null;

create index if not exists portal_role_email on portal_role (lower(email)) where zneplatneno is null;

create index if not exists portal_role_osoba on portal_role (osoba_id);

create table if not exists portal_kod_uplatneni (
  kod_hash text primary key,
  redizo text not null,
  role_id uuid not null references portal_role,
  uplatneno timestamptz not null default now()
);

create table if not exists portal_pozvanka (
  id uuid primary key,
  redizo text not null,
  email text not null,
  role text not null check (role in ('spravce', 'editor')),
  pozval_role_id uuid references portal_role,
  vytvoreno timestamptz not null default now(),
  plati_do timestamptz not null,
  prijato timestamptz,
  prijal_role_id uuid references portal_role,
  zruseno timestamptz
);

create index if not exists portal_pozvanka_skola on portal_pozvanka (redizo);

create table if not exists portal_odkaz (
  nonce text primary key,
  ucel text not null,
  spotrebovano timestamptz not null default now()
);

create table if not exists portal_udalost (
  id uuid primary key,
  redizo text not null,
  role_id uuid references portal_role,
  typ text not null,
  kdy timestamptz not null default now(),
  detail jsonb not null default '{}'::jsonb
);

create index if not exists portal_udalost_skola on portal_udalost (redizo, kdy);
