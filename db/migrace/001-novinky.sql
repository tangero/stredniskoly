-- ============================================================================
-- Novinky k přijímačkám: odběr termínů e-mailem.
-- Schéma podle docs/novinky-k-prijimackam-2027.md, oddíl 6 (závazný kontrakt).
-- Tabulky se zakládají v pořadí závislostí: odberatel, zadost_o_potvrzeni,
-- davka, polozka_odeslani, ostatní.
-- ============================================================================

-- Společná identita odběratele; sledování škol (docs/sledovani-skol-2027.md)
-- si k ní později přidá vlastní tabulky.
create table if not exists odberatel (
  id uuid primary key,
  email text not null unique,
  verze_klice int not null default 1,
  zalozeno timestamptz not null default now()
);

-- Žádost existuje jen do potvrzení nebo do expirace. U účelu 'novy_rocnik'
-- vzniká ve stavu 'ceka_na_vyzvu' bez platnosti a potvrdit ji nelze.
create table if not exists zadost_o_potvrzeni (
  jti text primary key,
  ucel text not null check (ucel in ('novinky', 'kalendar', 'novy_rocnik')),
  stav text not null check (stav in ('ceka_na_vyzvu', 'aktivni', 'spotrebovana')),
  email text not null,
  volby jsonb not null,
  souhlas_verze text not null,
  zdroj text not null,
  vytvoreno timestamptz not null default now(),
  plati_do timestamptz,
  spotrebovano timestamptz,
  check (stav <> 'aktivni' or plati_do is not null)
);
create index if not exists zadost_plati_do on zadost_o_potvrzeni (plati_do);

-- Aktivní odběr. Maže se při odhlášení; doklad souhlasu zůstává zvlášť.
create table if not exists odber_novinek (
  odberatel_id uuid not null references odberatel on delete cascade,
  rocnik text not null,
  druh_studia text not null check (druh_studia in ('ss', 'vicelete')),
  kraj text,
  zdroj text not null,
  potvrzeno timestamptz not null default now(),
  primary key (odberatel_id, rocnik, druh_studia)
);
create index if not exists odber_rocnik_druh on odber_novinek (rocnik, druh_studia);

-- Doklad souhlasu přežívá zánik odběru i smazání identity (odpojí se).
create table if not exists doklad_souhlasu (
  id uuid primary key,
  odberatel_id uuid references odberatel on delete set null,
  email_otisk text not null,
  ucel text not null,
  rocnik text,
  souhlas_verze text not null,
  zdroj text not null,
  potvrzeno timestamptz not null default now(),
  zaniklo timestamptz,
  smazat_po timestamptz
);
create index if not exists doklad_smazat_po on doklad_souhlasu (smazat_po);

-- Čekání na kalendář dalšího ročníku: samostatný účel s vlastním souhlasem.
create table if not exists zprava_o_kalendari (
  odberatel_id uuid not null references odberatel on delete cascade,
  cilovy_rocnik text not null,
  stav text not null check (stav in ('ceka', 'vyzvan', 'uzavren')),
  potvrzeno timestamptz not null default now(),
  ceka_do timestamptz not null,
  vyzva_odeslana timestamptz,
  primary key (odberatel_id, cilovy_rocnik)
);
create index if not exists kalendar_ceka_do on zprava_o_kalendari (stav, ceka_do);

-- Verze zprávy: co se posílá, poznané obsahem, s platností a otiskem kalendáře.
create table if not exists zprava_verze (
  zprava text not null,
  otisk_obsahu text not null,
  otisk_kalendare text not null,
  splatnost date not null,
  konec_uzitecnosti date not null,
  primary key (zprava, otisk_obsahu)
);

-- Dávka drží hotové tělo požadavku; klíč idempotence vychází z jeho otisku.
-- Tělo se maže teprve tehdy, když ho už žádná obnova nemůže potřebovat.
create table if not exists davka (
  id uuid primary key,
  zprava text not null,
  telo text not null,
  telo_smazano boolean not null default false,
  otisk_tela text not null,
  clenove_otisk text not null,
  pokus int not null default 1,
  idempotency_key text not null unique,
  stav text not null check (stav in ('pripravena', 'predavana', 'odeslana',
                                    'chyba', 'zrusena', 'neurcita')),
  predano_v timestamptz,
  zalozeno timestamptz not null default now(),
  uzavreno timestamptz
);
create index if not exists davka_stav on davka (stav, zalozeno);

-- Fronta: jedna zpráva jednomu adresátovi. Položka vzniká před voláním Resendu
-- a nemaže se kaskádou, jen se odpojí, aby evidence odeslání přežila adresáta.
create table if not exists polozka_odeslani (
  id uuid primary key,
  zprava text not null,
  ucel text not null check (ucel in ('potvrzeni', 'uvitani', 'obsah', 'vyzva')),
  odberatel_id uuid references odberatel on delete set null,
  zadost_jti text references zadost_o_potvrzeni on delete set null,
  adresat_otisk text not null,
  stav text not null check (stav in ('ceka', 'pripravena', 'predavana',
                                     'odeslana', 'neurcita', 'zahozena')),
  davka_id uuid references davka,
  otisk_obsahu text,
  vlozeno timestamptz not null default now(),
  predano_v timestamptz,
  odeslano timestamptz,
  resend_id text,
  stav_doruceni text
);
create unique index if not exists polozka_odberatel on polozka_odeslani (odberatel_id, zprava)
  where odberatel_id is not null;
create unique index if not exists polozka_zadost on polozka_odeslani (zadost_jti, zprava)
  where zadost_jti is not null;
create index if not exists polozka_stav on polozka_odeslani (stav, zprava);
create index if not exists polozka_resend on polozka_odeslani (resend_id);

-- Rezervace kvóty patří konkrétnímu pokusu dávky a vypořádává se jednorázově,
-- nezávisle na stavu dávky, podle příznaku provedeného volání.
create table if not exists rezervace_kvoty (
  davka_id uuid not null references davka on delete cascade,
  pokus int not null,
  obdobi text not null,
  ucel text not null,
  pocet int not null,
  volani_provedeno boolean not null default false,
  vyporadano timestamptz,
  primary key (davka_id, pokus, obdobi, ucel)
);
create index if not exists rezervace_nevyporadane on rezervace_kvoty (vyporadano)
  where vyporadano is null;

-- Rozpočet: strop drží měsíční řádek 'celkem' pro všechny e-maily novinek,
-- denní řádek 'potvrzeni' je doplňkové omezení proti zneužití formuláře.
create table if not exists rozpocet_emailu (
  obdobi text not null,
  ucel text not null,
  limit_pocet int not null,
  rezervovano int not null default 0,
  spotrebovano int not null default 0,
  primary key (obdobi, ucel)
);

-- Webhooky se ukládají idempotentně podle event_id a bez adresy (jen otisk).
create table if not exists webhook_udalost (
  event_id text primary key,
  typ text not null,
  resend_id text,
  email_otisk text,
  polozka_id uuid references polozka_odeslani on delete set null,
  telo_bez_adresy jsonb not null,
  prijato timestamptz not null default now(),
  zpracovano timestamptz
);
create index if not exists webhook_nezpracovane on webhook_udalost (zpracovano)
  where zpracovano is null;

-- Omezení počtu potvrzovacích e-mailů na adresu a na IP. Otisk je HMAC
-- s odděleným tajemstvím, ne prostý SHA-256.
create table if not exists limit_potvrzeni (
  otisk text primary key,
  pocet int not null,
  od timestamptz not null default now()
);
create index if not exists limit_od on limit_potvrzeni (od);
