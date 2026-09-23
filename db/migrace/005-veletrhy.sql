-- Fronta nahlášených veletrhů (docs/veletrhy-skol-2027.md § 6.3).
--
-- Nahlášení není zveřejnění: záznam se sem uloží dřív, než odejde e-mail,
-- a na web se akce dostane teprve poté, co člověk ověří termín na stránce
-- pořadatele a přepíše ji do src/data/veletrhy-2027.json.
--
-- Zamítnutá hlášení se nemažou. Když tentýž pořadatel nahlásí akci podruhé,
-- je potřeba vidět, že se to už jednou řešilo.

create table if not exists veletrh_nahlaseni (
  id            bigserial primary key,
  nazev         text not null,
  start_den     date not null,
  konec_den     date not null,
  adresa        text not null,
  mesto         text not null,
  kraj_kod      text not null,
  url           text not null,
  poradatel     text not null,
  -- Kontakt na oznamovatele: slouží zpětnému dotazu, na web nepatří.
  email         text not null,
  popis         text,
  stav          text not null default 'nove'
                check (stav in ('nove', 'overeno', 'zamitnuto', 'duplicita')),
  -- Doručení e-mailem je druhá cesta; záznam platí, i když pošta selže.
  --
  -- `false` neznamená „e-mail neodešel“, ale „nevíme o tom, že odešel“:
  -- když databáze neodpoví do limitu, handler pokračuje poštou a příznak
  -- už nemá kam zapsat. Kdo frontu vyřizuje, musí počítat s tím, že týž
  -- záznam může mezitím dorazit i mailem.
  odeslano_mailem boolean not null default false,
  poznamka      text,
  vytvoreno     timestamptz not null default now()
);

create index if not exists veletrh_nahlaseni_stav_idx
  on veletrh_nahlaseni (stav, vytvoreno desc);
