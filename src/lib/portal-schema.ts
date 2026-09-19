// ============================================================================
// Schéma účtů portálu pro školy (docs/ucty-portalu-skol-2027.md, oddíl 2.1).
//
// Stejný vzor jako src/lib/novinky-schema.ts: modul je jediný zdroj pravdy,
// db/migrace/002-portal.sql se z něj generuje
// (`node --experimental-strip-types scripts/portal-migrace.mjs --zapis-sql`)
// a migraci jde spustit i z nasazené aplikace (/api/portal/migrace).
//
// Záznamy o osobách se nepřepisují: změna přidá nový řádek a starý dostane
// `zneplatneno`. Jediný `update` nad portal_role je právě nastavení
// `zneplatneno` (a výmaz osobních údajů na žádost, oddíl 7).
// ============================================================================

export const TABULKY_PORTALU = [
  'portal_role',
  'portal_kod_uplatneni',
  'portal_pozvanka',
  'portal_odkaz',
  'portal_udalost',
] as const;

export const MIGRACE_PORTALU: string[] = [
  `create table if not exists portal_role (
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
)`,
  // Jeden platný správce na školu hlídá databáze, ne aplikace.
  `create unique index if not exists portal_role_jeden_spravce
  on portal_role (redizo) where role = 'spravce' and zneplatneno is null`,
  // Osoba má ve škole nejvýš jednu platnou roli.
  `create unique index if not exists portal_role_osoba_skola
  on portal_role (redizo, osoba_id) where zneplatneno is null`,
  `create index if not exists portal_role_email on portal_role (lower(email)) where zneplatneno is null`,
  `create index if not exists portal_role_osoba on portal_role (osoba_id)`,
  `create table if not exists portal_kod_uplatneni (
  kod_hash text primary key,
  redizo text not null,
  role_id uuid not null references portal_role,
  uplatneno timestamptz not null default now()
)`,
  `create table if not exists portal_pozvanka (
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
)`,
  `create index if not exists portal_pozvanka_skola on portal_pozvanka (redizo)`,
  // Nejvýš jedna nevyřízená pozvánka na adresu ve škole; novou předchází zrušení staré.
  `create unique index if not exists portal_pozvanka_otevrena
  on portal_pozvanka (redizo, lower(email)) where prijato is null and zruseno is null`,
  // Jednorázové odkazy (přihlášení, změna e-mailu): spotřebování podle nonce.
  `create table if not exists portal_odkaz (
  nonce text primary key,
  ucel text not null,
  spotrebovano timestamptz not null default now()
)`,
  `create table if not exists portal_udalost (
  id uuid primary key,
  redizo text not null,
  role_id uuid references portal_role,
  typ text not null,
  kdy timestamptz not null default now(),
  detail jsonb not null default '{}'::jsonb
)`,
  `create index if not exists portal_udalost_skola on portal_udalost (redizo, kdy)`,
];
