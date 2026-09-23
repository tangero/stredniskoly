// ============================================================================
// Schéma fronty nahlášených veletrhů (docs/veletrhy-skol-2027.md § 6.3).
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
export const TABULKY_VELETRHU = ['veletrh_nahlaseni'] as const;

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
];
