// ============================================================================
// Schéma školních novinek sklízených z RSS/Atom feedů škol.
//
// Soubor db/migrace/003-skolni-novinky.sql se z tohoto modulu **generuje**
// (`node scripts/skolni-novinky-migrace.mjs --zapis-sql`) a test hlídá, že se
// nerozešly – stejný postup jako u odběru novinek a účtů portálu. Migraci je
// potřeba umět spustit i z nasazené aplikace, protože připojovací řetězec
// k databázi je ve Vercelu vedený jako tajný a nikdo ho lokálně nevidí.
//
// Návrh: docs/skolske-novinky-rss-2027.md, oddíl 3.3.
//
// Všechny příkazy jsou idempotentní (`if not exists`), takže se dají pustit
// opakovaně a nic nemažou.
// ============================================================================

/** Tabulky, které sklízení školních novinek potřebuje. */
export const TABULKY_SKOLNICH_NOVINEK = [
  'skola_feed',
  'skola_novinka',
  'skola_novinka_verze',
  'skola_novinka_rozbor',
  'skola_prepinac',
  'skola_invalidace',
  'sklizen_beh',
] as const;

/** Příkazy migrace v pořadí závislostí. */
export const MIGRACE_SKOLNICH_NOVINEK: string[] = [
  // Registr zdrojů. Stav zdroje se vede odděleně od obsahu (oddíl 3.2): výpadek
  // feedu neznamená, že škola nemá novinky – uložené položky zůstávají viditelné
  // s údajem o poslední úspěšné kontrole.
  `create table if not exists skola_feed (
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
)`,
  `create index if not exists skola_feed_splatne on skola_feed (dalsi_kontrola_at) where aktivni`,
  // Jedna položka = jeden článek školy. Identita je zdroj + GUID; fallback je
  // normalizovaná URL, ne otisk titulku (změna titulku je změna obsahu, ne nová
  // položka). `terminy` drží jen data v roli akce, která prošla publikačním
  // rozhodnutím; `zobrazeni` je jeho výsledek, aby web nemusel pravidla znát.
  `create table if not exists skola_novinka (
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
)`,
  `create unique index if not exists skola_novinka_identita on skola_novinka (redizo, identita)`,
  `create index if not exists skola_novinka_skola on skola_novinka (redizo, publikovano desc)`,
  // Historie toho, co bylo čtenářům sděleno – ne jen otisk. Bez zobrazovaných
  // polí a extrahovaných tvrzení nejde poznat význam opravy (překlep vs. zrušený
  // termín) a nejde rekonstruovat, na co se odeslal e-mail.
  `create table if not exists skola_novinka_verze (
  id uuid primary key,
  novinka_id uuid not null references skola_novinka on delete cascade,
  otisk text not null,
  zobrazovana_pole jsonb not null default '{}'::jsonb,
  extrahovana_tvrzeni jsonb not null default '{}'::jsonb,
  verze_pravidel text not null,
  zaznamenano timestamptz not null default now()
)`,
  `create index if not exists skola_novinka_verze_polozka on skola_novinka_verze (novinka_id, zaznamenano desc)`,
  // Rozbor článku: co se dozvíme z textu, který škola napsala, a co z toho složíme
  // do věty. Vede se **odděleně od položky**, protože má jiný původ i jiný životní
  // cyklus: položka pochází z feedu a mění se s ním, rozbor pochází z textu článku
  // a z rozhodovacího modelu a přepočítá se, když se změní text, model nebo šablona.
  //
  // `terminy` nese termín **s popiskem** – ke které akci patří a v kolik hodin.
  // Plochý seznam dat bez popisku byl přesně ta chyba, kvůli které se zobrazování
  // termínů 20. 9. 2026 vyplo (600005399: osm dat, z toho tři lhůty a šest termínů
  // MŠMT v jedné kartě). Bez popisku se termín nezobrazuje.
  //
  // `souhrn` je **náš text**, ne text školy: kód ho skládá ze šablony a z polí
  // níže. Text článku se čte, ale nepřebírá (docs/zdroje-dat.md 2.14).
  `create table if not exists skola_novinka_rozbor (
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
)`,
  `create index if not exists skola_novinka_rozbor_otisk on skola_novinka_rozbor (otisk_textu)`,
  // Provozní přepínač: vypnout zdroj, skrýt jednu položku nebo vypnout
  // zvýrazňování třídy. Musí jít bez nasazení – vypnutí sklízení samo o sobě
  // neskryje chybnou kartu, která už v databázi je (oddíl 3.7).
  `create table if not exists skola_prepinac (
  klic text primary key,
  hodnota jsonb not null,
  zmeneno timestamptz not null default now(),
  zdroj_zmeny text not null,
  duvod text
)`,
  // Fronta změn: co se u které školy změnilo a ještě nebylo zpracováno.
  // Záznam vzniká **v téže transakci** jako změna položky – pořadí „commit →
  // navazující akce → záznam" by mělo mezeru, ve které proces zemře a opakování
  // nemá co obnovit (oddíl 3.7, nález N8).
  //
  // Blok novinek se dnes bere z vlastního API s šedesátisekundovou cache, ne
  // ze staticky generované stránky, takže `revalidatePath` volat netřeba. Fronta
  // přesto vzniká hned: je auditní stopou změn a vstupem pro e-maily (fáze 2),
  // a doplnit ji zpětně by znamenalo ztratit změny, které mezitím proběhly.
  `create table if not exists skola_invalidace (
  id uuid primary key,
  redizo text not null,
  duvod text not null,
  vytvoreno timestamptz not null default now(),
  vyrizeno timestamptz,
  pokusy int not null default 0,
  posledni_chyba text
)`,
  `create index if not exists skola_invalidace_nevyrizene on skola_invalidace (vytvoreno) where vyrizeno is null`,
  // Dohled nad sklízečem: GitHub Actions nezaručují čas běhu, takže vynechaný
  // běh se pozná jen z vlastního záznamu (oddíl 3.2).
  `create table if not exists sklizen_beh (
  id uuid primary key,
  zahajeno timestamptz not null default now(),
  dokonceno timestamptz,
  zdroju_zkouseno int not null default 0,
  zdroju_ok int not null default 0,
  polozek_novych int not null default 0,
  polozek_zmenenych int not null default 0,
  verze_pravidel text,
  chyba text
)`,
  `create index if not exists sklizen_beh_cas on sklizen_beh (zahajeno desc)`,
];
