-- ============================================================================
-- GENEROVÁNO z src/lib/skolni-novinky-schema.ts
--   node --experimental-strip-types scripts/skolni-novinky-migrace.mjs --zapis-sql
-- Neupravovat ručně; zdrojem pravdy je modul, protože migraci je potřeba umět
-- spustit i z nasazené aplikace (/api/skoly/novinky/migrace).
-- ============================================================================
create table if not exists skola_feed (
  redizo text primary key,
  feed_url text not null,
  typ text not null default 'rss',
  zdroj text not null default 'sonda',
  aktivni boolean not null default true,
  naposledy_ok timestamptz,
  naposledy_zkouseno timestamptz,
  posledni_polozka timestamptz,
  etag text,
  modified_since text,
  chyby_v_rade int not null default 0,
  dalsi_kontrola_at timestamptz,
  posledni_chyba text,
  vytvoreno timestamptz not null default now()
);

create index if not exists skola_feed_splatne on skola_feed (dalsi_kontrola_at) where aktivni;

create table if not exists skola_novinka (
  id uuid primary key,
  redizo text not null,
  identita text not null,
  otisk_obsahu text not null,
  titulek text not null,
  url text not null,
  publikovano timestamptz,
  prijimaci_obdobi text,
  tridy jsonb not null default '[]'::jsonb,
  jistota jsonb not null default '{}'::jsonb,
  stav text,
  zobrazeni text not null,
  zpusobily_email boolean not null default false,
  duvod text,
  terminy jsonb not null default '[]'::jsonb,
  konec_platnosti timestamptz,
  verze_pravidel text not null,
  zneplatneno timestamptz,
  vytvoreno timestamptz not null default now(),
  zmeneno timestamptz not null default now()
);

create unique index if not exists skola_novinka_identita on skola_novinka (redizo, identita);

create index if not exists skola_novinka_skola on skola_novinka (redizo, publikovano desc);

create table if not exists skola_novinka_verze (
  id uuid primary key,
  novinka_id uuid not null references skola_novinka on delete cascade,
  otisk text not null,
  zobrazovana_pole jsonb not null default '{}'::jsonb,
  extrahovana_tvrzeni jsonb not null default '{}'::jsonb,
  verze_pravidel text not null,
  zaznamenano timestamptz not null default now()
);

create index if not exists skola_novinka_verze_polozka on skola_novinka_verze (novinka_id, zaznamenano desc);

create table if not exists skola_novinka_rozbor (
  novinka_id uuid primary key references skola_novinka on delete cascade,
  zdroj_textu text not null,
  otisk_textu text not null,
  terminy jsonb not null default '[]'::jsonb,
  akce text,
  lhuty jsonb not null default '[]'::jsonb,
  souhrn text,
  model text,
  odpovedi jsonb not null default '{}'::jsonb,
  verze_pravidel text not null,
  vytvoreno timestamptz not null default now(),
  zmeneno timestamptz not null default now()
);

create index if not exists skola_novinka_rozbor_otisk on skola_novinka_rozbor (otisk_textu);

create table if not exists skola_prepinac (
  klic text primary key,
  hodnota jsonb not null,
  zmeneno timestamptz not null default now(),
  zdroj_zmeny text not null,
  duvod text
);

create table if not exists skola_invalidace (
  id uuid primary key,
  redizo text not null,
  duvod text not null,
  vytvoreno timestamptz not null default now(),
  vyrizeno timestamptz,
  pokusy int not null default 0,
  posledni_chyba text
);

create index if not exists skola_invalidace_nevyrizene on skola_invalidace (vytvoreno) where vyrizeno is null;

create table if not exists sklizen_beh (
  id uuid primary key,
  zahajeno timestamptz not null default now(),
  dokonceno timestamptz,
  zdroju_zkouseno int not null default 0,
  zdroju_ok int not null default 0,
  polozek_novych int not null default 0,
  polozek_zmenenych int not null default 0,
  verze_pravidel text,
  chyba text
);

create index if not exists sklizen_beh_cas on sklizen_beh (zahajeno desc);
