// ============================================================================
// Schéma veletrhů: fronta nahlášení (docs/veletrhy-skol-2027.md § 6.3) a akce,
// návrhy změn a audit (docs/veletrhy-api-2027.md).
//
// Nahlášení není zveřejnění: záznam se sem uloží dřív, než odejde e-mail,
// a na web se akce dostane teprve poté, co člověk ověří termín na stránce
// pořadatele a přepíše ji do src/data/veletrhy-2027.json.
//
// Soubor db/migrace/005-veletrhy.sql se z tohoto modulu **generuje**
// (`node --experimental-strip-types scripts/veletrhy-migrace.mjs --zapis-sql`)
// a test hlídá, že se nerozešly – stejně jako u událostí a účtů portálu.
// Spouští se týmž skriptem bez přepínače; dokud neproběhne, nahlášení drží
// jen e-mail (zjištěno 23. 9. 2026: tabulka na produkci chyběla, protože
// SQL soubor vznikl ručně a nic ho nespouštělo).
//
// Všechny příkazy jsou idempotentní (`if not exists`); nic nemažou.
// ============================================================================

/** Tabulky, které fronta nahlášení potřebuje. */
export const TABULKY_VELETRHU = ['veletrh_nahlaseni', 'veletrh_akce', 'veletrh_navrh', 'veletrh_audit'] as const;

/**
 * Stavy návrhu změny od Eduardy (docs/veletrhy-api-2027.md). `schvaleno`
 * s vyplněnou `chyba` znamená, že člověk souhlasil, ale provést to nešlo
 * (akce se mezitím změnila); návrh pak čeká na zamítnutí nebo náhradu.
 */
export const STAVY_NAVRHU = ['ceka', 'schvaleno', 'provedeno', 'zamitnuto', 'stazeno'] as const;

/** Stavy nahlášení. Zamítnuté se nemažou, aby šlo poznat opakované nahlášení. */
export const STAVY_NAHLASENI = ['nove', 'overeno', 'zamitnuto', 'duplicita'] as const;

/** Příkazy migrace v pořadí závislostí. */
export const MIGRACE_VELETRHU: string[] = [
  `create table if not exists veletrh_nahlaseni (
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
  stav text not null default 'nove' check (stav in (${STAVY_NAHLASENI.map((s) => `'${s}'`).join(', ')})),
  -- false neznamená „e-mail neodešel“, ale „nevíme o tom, že odešel“: když
  -- databáze neodpoví do limitu, handler pokračuje poštou a příznak už nemá
  -- kam zapsat.
  odeslano_mailem boolean not null default false,
  poznamka text,
  vytvoreno timestamptz not null default now()
)`,
  `create index if not exists veletrh_nahlaseni_stav_idx
  on veletrh_nahlaseni (stav, vytvoreno desc)`,
  // Aktuální stav akcí. Celý objekt v jsonb, protože pole jsou volitelná
  // a přibývají; tvar hlídá validátor (veletrhy-validace.ts), ne sloupce.
  // Odebrání je měkké: id zůstává rezervované, aby se nevrátilo s jiným obsahem.
  `create table if not exists veletrh_akce (
  id text primary key,
  sezona text not null,
  data jsonb not null,
  verze int not null default 1,
  smazano boolean not null default false,
  vytvoreno timestamptz not null default now(),
  zmeneno timestamptz not null default now()
)`,
  `create index if not exists veletrh_akce_sezona_idx
  on veletrh_akce (sezona) where not smazano`,
  // Návrh změny = sada operací, schvaluje a provádí se atomicky.
  // zdroj_email a poznamka smějí nést jména a adresy; na web nejdou.
  `create table if not exists veletrh_navrh (
  id uuid primary key,
  klic text not null,
  autor text not null,
  operace jsonb not null,
  zdroj_url text,
  zdroj_email text,
  nahlaseni_id bigint,
  poznamka text,
  varovani jsonb not null default '[]',
  stav text not null default 'ceka' check (stav in (${STAVY_NAVRHU.map((s) => `'${s}'`).join(', ')})),
  chyba text,
  rozhodl text,
  rozhodnuto timestamptz,
  duvod text,
  vytvoreno timestamptz not null default now()
)`,
  `create unique index if not exists veletrh_navrh_klic
  on veletrh_navrh (klic)`,
  `create index if not exists veletrh_navrh_stav
  on veletrh_navrh (stav, vytvoreno desc)`,
  // Audit se jen přidává, nikdy nemění.
  `create table if not exists veletrh_audit (
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
)`,
  `create index if not exists veletrh_audit_akce
  on veletrh_audit (akce_id, cas desc)`,
];
