-- ============================================================================
-- Přihlášení do administrace (#479, docs/administrace.md): passkey vlastníka,
-- relace na serveru a záznam přihlášení. Spouští vlastník ručně, idempotentní.
-- ============================================================================

-- Passkey (WebAuthn) vlastníka. Veřejný klíč není tajemství; soukromý klíč
-- zůstává v zařízení. Zrušený passkey se nemaže, jen se označí.
create table if not exists admin_passkey (
  id text primary key,                  -- credential id (base64url)
  verejny_klic text not null,           -- COSE veřejný klíč (base64url)
  pocitadlo bigint not null default 0,  -- signature counter proti klonům
  transporty text[] not null default '{}',
  nazev text not null,                  -- pojmenování zařízení vlastníkem
  vytvoreno timestamptz not null default now(),
  naposledy timestamptz,
  zruseno timestamptz
);

-- Relace. Cookie nese náhodný identifikátor, tady je jen jeho SHA-256, takže
-- únik databáze nedává platné cookie.
create table if not exists admin_relace (
  otisk text primary key,
  zpusob text not null check (zpusob in ('passkey', 'github')),
  github_login text,
  passkey_id text references admin_passkey (id),
  vytvoreno timestamptz not null default now(),
  vyprsi timestamptz not null,
  zruseno timestamptz
);

create index if not exists admin_relace_platne_idx on admin_relace (vyprsi) where zruseno is null;

-- Záznam přihlášení, odhlášení a změn passkey (kdo, kdy, čím). Bez IP adres.
create table if not exists admin_udalost (
  id bigserial primary key,
  kdy timestamptz not null default now(),
  udalost text not null,                -- prihlaseni, odmitnuto, odhlaseni, odhlaseni_vse, passkey_pridan, passkey_zrusen
  zpusob text,
  detail jsonb not null default '{}'::jsonb
);

create index if not exists admin_udalost_kdy_idx on admin_udalost (kdy desc);
