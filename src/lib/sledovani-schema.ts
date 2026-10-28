// ============================================================================
// Schéma hlídání škol: vazba odběratel–škola a účel v dokladu souhlasu.
//
// Soubor db/migrace/009-sledovani-skol.sql se z tohoto modulu **generuje**
// (`node scripts/sledovani-migrace.mjs --zapis-sql`) a test hlídá, že se
// nerozešly, stejně jako u novinek a událostí. Tabulky událostí jsou
// v `udalosti-schema.ts` (migrace 004).
//
// Příkazy jsou idempotentní a nic nemažou. Migraci spouští vlastník
// (CLAUDE.md, pravidlo 5), Claude Code ji proti produkci nepouští.
// ============================================================================

/** Tabulky, které hlídání škol zakládá. */
export const TABULKY_SLEDOVANI = ['odber_skoly'] as const;

/** Účel souhlasu v dokladu; hlídání má vlastní, odběr termínů zůstává `novinky`. */
export const UCELY_SOUHLASU = ['novinky', 'hlidani_skol'] as const;

export const MIGRACE_SLEDOVANI: string[] = [
  // Jedna řádka = jedna hlídaná škola jednoho odběratele. Hlídání se potvrzuje
  // zvlášť od odběru novinek (P4): existence řádku v `odber_novinek` hlídání
  // nezakládá a smazání odběru novinek hlídání neruší. Zrušení odběratele
  // (`odberatel`) řádky smaže s ním.
  `create table if not exists odber_skoly (
  odberatel_id uuid not null references odberatel on delete cascade,
  redizo text not null,
  zdroj text not null,
  potvrzeno timestamptz not null default now(),
  primary key (odberatel_id, redizo)
)`,
  `create index if not exists odber_skoly_skola on odber_skoly (redizo)`,
  // Doklad souhlasu dostane účel. Dosavadní doklady patří odběru novinek.
  `alter table doklad_souhlasu add column if not exists ucel text not null default 'novinky'`,
];
