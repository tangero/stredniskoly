-- ============================================================================
-- GENEROVÁNO z src/lib/portal-schema.ts
--   node --experimental-strip-types scripts/portal-migrace.mjs --zapis-sql
-- Neupravovat ručně; zdrojem pravdy je modul, protože migraci je potřeba umět
-- spustit i z nasazené aplikace (/api/portal/migrace).
-- ============================================================================
create table if not exists portal_kriteria (
  id uuid primary key,
  poradi bigserial not null,
  redizo text not null,
  obor_klic text not null,
  obor_identita jsonb,
  rok integer not null check (rok between 2024 and 2100),
  kolo integer check (kolo between 1 and 3),
  rezim text not null check (rezim in ('pouze_jpz', 'jine')),
  popis text not null default '',
  odkaz text not null default '',
  podklad_rok integer not null,
  role_id uuid references portal_role,
  platne_od timestamptz not null default clock_timestamp(),
  zneplatneno timestamptz,
  nahrazuje_id uuid references portal_kriteria,
  check (podklad_rok <= rok),
  check (obor_identita is null or jsonb_typeof(obor_identita) = 'object')
);

alter table portal_kriteria add column if not exists obor_identita jsonb;

alter table portal_kriteria add column if not exists struktura jsonb;

do $$ begin
  alter table portal_kriteria add constraint portal_kriteria_struktura_objekt
    check (struktura is null or jsonb_typeof(struktura) = 'object');
exception when duplicate_object then null; end $$;

create unique index if not exists portal_kriteria_platna
  on portal_kriteria (redizo, obor_klic, rok, coalesce(kolo, 0)) where zneplatneno is null;

create index if not exists portal_kriteria_skola
  on portal_kriteria (redizo, rok, poradi desc);

create table if not exists kriteria_podklad (
  id uuid primary key,
  redizo text not null,
  obor_klic text not null,
  rok integer not null check (rok between 2024 and 2100),
  kolo integer check (kolo between 1 and 3),
  zdroj text not null check (zdroj in ('dipsy_pdf', 'web_skoly', 'rss', 'hlaseni_chyby', 'jiny')),
  zdroj_url text not null default '',
  zdroj_id text not null check (length(trim(zdroj_id)) > 0),
  pozorovano_at timestamptz not null,
  zkontrolovano_at timestamptz,
  publikovano_at timestamptz,
  overeno_at timestamptz,
  obsah_sha256 text,
  rezim text check (rezim in ('pouze_jpz', 'jine')),
  popis text not null default '',
  stav text not null check (stav in ('kandidat', 'overeno', 'rozpor')),
  vytvoreno_at timestamptz not null default clock_timestamp(),
  check (obsah_sha256 is null or obsah_sha256 ~ '^[0-9a-f]{64}$'),
  check (stav <> 'overeno' or (overeno_at is not null and rezim is not null)),
  check (stav <> 'kandidat' or overeno_at is null)
);

alter table kriteria_podklad add column if not exists zkontrolovano_at timestamptz;

create index if not exists kriteria_podklad_obor
  on kriteria_podklad (redizo, obor_klic, rok, kolo, pozorovano_at desc);
