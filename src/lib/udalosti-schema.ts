// ============================================================================
// Schéma událostí pro sledování škol.
//
// Jedna tabulka událostí pro **všechny** zdroje změny: přepnutí datové sady,
// schválení příspěvku v portálu, nová inspekční zpráva a novinka z webu školy.
// Rozhodnutí P4 (docs/prehodnoceni-rozhodnuti-rss-2027.md, docs/sledovani-skol-2027.md
// oddíl 2): dva modely téže věci by rodině poslaly dvě nesouvisející potrubí
// a dva e-maily o jedné škole.
//
// Soubor db/migrace/004-udalosti.sql se z tohoto modulu **generuje**
// (`node scripts/udalosti-migrace.mjs --zapis-sql`) a test hlídá, že se
// nerozešly – stejně jako u novinek a účtů portálu.
//
// Všechny příkazy jsou idempotentní (`if not exists`); nic nemažou.
// ============================================================================

/** Tabulky, které model události potřebuje. */
export const TABULKY_UDALOSTI = ['udalost', 'udalost_skola'] as const;

/**
 * Zdroje události. Čtvrtý přibyl s novinkami z webů škol.
 *
 * `novinka_skoly` je jediný zdroj, u kterého událost **nevzniká naší publikací**,
 * ale převzetím cizího sdělení. Proto nese odkaz do `skola_novinka` a v souhrnu
 * se formuluje jako „škola oznámila", ne „zveřejnili jsme".
 */
export const TYPY_UDALOSTI = [
  'sada_prepnuta',
  'portal_schvalen',
  'inspekce_nova',
  'novinka_skoly',
] as const;

export type TypUdalosti = (typeof TYPY_UDALOSTI)[number];

/** Příkazy migrace v pořadí závislostí. */
export const MIGRACE_UDALOSTI: string[] = [
  // Událost = jedna věta do souhrnu. `veta` se ukládá hotová, protože se tvoří
  // v okamžiku publikace, kdy je známo období a slovník pojmů dané verze;
  // odesílač ji nesmí skládat znovu z dat, která se mezitím přepnula.
  //
  // `klic` je idempotence odesílání: tentýž přepnutý ročník téže sady nesmí
  // vyrobit druhou událost, ani když rozdílový skript poběží dvakrát.
  `create table if not exists udalost (
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
)`,
  `create unique index if not exists udalost_klic on udalost (klic)`,
  `create index if not exists udalost_cas on udalost (publikovano desc)`,
  // Dotčené školy zvlášť, ne jako pole v události: souhrn se skládá dotazem
  // „události pro školy tohoto odběratele" a přepnutí sady se týká stovek škol.
  // Pole v jsonb by ten dotaz udělalo z indexovaného spojení průchodem tabulky.
  `create table if not exists udalost_skola (
  udalost_id uuid not null references udalost on delete cascade,
  redizo text not null,
  primary key (udalost_id, redizo)
)`,
  `create index if not exists udalost_skola_skola on udalost_skola (redizo)`,
];
