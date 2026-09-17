import { noveId } from './novinky-token.ts';
import {
  DAVKA_MAX,
  OKNO_OPAKOVANI_MS,
  PRODLENI_PRED_OPAKOVANIM_MS,
  klicIdempotence,
  obdobiKRezervaci,
  otiskClenu,
  otiskTela,
  smiSePredat,
} from './novinky-rozpocet.ts';
import type { Spojeni } from './novinky-db.ts';

// ============================================================================
// Fronta odeslání a dávky (docs/novinky-k-prijimackam-2027.md, oddíl 6).
//
// Pravidla, která tenhle modul vynucuje:
//  1. Každý přechod je podmíněná aktualizace včetně `pokus`; vyhrát ho může
//     jen jeden zpracovatel a kdo prohraje, nic neúčtuje.
//  2. Hranice předání je commit transakce B. Do té chvíle lze dávku zrušit.
//  3. Tělo a klíč se mrazí při vzniku dávky a od stavu `predavana` se nemění.
//  4. Rezervace kvóty se vypořádávají jednorázově a nezávisle na stavu dávky.
// ============================================================================

export type UcelPolozky = 'potvrzeni' | 'uvitani' | 'obsah' | 'vyzva';

export interface Polozka {
  id: string;
  zprava: string;
  ucel: UcelPolozky;
  odberatel_id: string | null;
  zadost_jti: string | null;
  adresat_otisk: string;
}

export interface DavkaZaznam {
  id: string;
  zprava: string;
  telo: string;
  otisk_tela: string;
  clenove_otisk: string;
  pokus: number;
  idempotency_key: string;
  stav: string;
  predano_v: string | null;
}

/** Vloží položku do fronty. Opakované vložení téže zprávy témuž adresátovi nic neudělá. */
export async function zaradPolozku(
  s: Spojeni,
  para: {
    zprava: string;
    ucel: UcelPolozky;
    odberatelId?: string | null;
    zadostJti?: string | null;
    adresatOtisk: string;
  },
): Promise<string | null> {
  const id = noveId();
  const vysledek = await s.dotaz<{ id: string }>(
    `insert into polozka_odeslani (id, zprava, ucel, odberatel_id, zadost_jti, adresat_otisk, stav)
     values ($1, $2, $3, $4, $5, $6, 'ceka')
     on conflict do nothing
     returning id`,
    [id, para.zprava, para.ucel, para.odberatelId ?? null, para.zadostJti ?? null, para.adresatOtisk],
  );
  return vysledek.rows[0]?.id ?? null;
}

/**
 * Krok 5.1: platnost zprávy. Ověřuje se při naplnění fronty, při sestavení
 * dávky a ještě před předáním — jinak by položka z dřívějška odešla po konci
 * užitečnosti.
 */
export async function jeZpravaPlatna(
  s: Spojeni,
  zprava: string,
  otiskKalendare: string,
  dnes = new Date(),
): Promise<{ platna: boolean; duvod?: string; otiskObsahu?: string }> {
  const v = await s.dotaz<{ otisk_obsahu: string; otisk_kalendare: string; splatnost: string; konec_uzitecnosti: string }>(
    `select otisk_obsahu, otisk_kalendare, splatnost, konec_uzitecnosti
       from zprava_verze where zprava = $1
       order by splatnost desc limit 1`,
    [zprava],
  );
  const radek = v.rows[0];
  if (!radek) return { platna: false, duvod: 'zpráva není v registru verzí' };
  const den = dnes.toISOString().slice(0, 10);
  if (den < radek.splatnost) return { platna: false, duvod: 'ještě není splatná' };
  if (den > radek.konec_uzitecnosti) return { platna: false, duvod: 'uplynul konec užitečnosti' };
  if (radek.otisk_kalendare !== otiskKalendare) {
    return { platna: false, duvod: 'kalendář se od schválení změnil' };
  }
  return { platna: true, otiskObsahu: radek.otisk_obsahu };
}

/** Prošlé nepředané položky se zahodí a ohlásí, nikdy se neodešlou. */
export async function zahodProsle(s: Spojeni, zprava: string): Promise<number> {
  const v = await s.dotaz(
    `update polozka_odeslani set stav = 'zahozena'
      where zprava = $1 and stav in ('ceka', 'pripravena')`,
    [zprava],
  );
  return v.rowCount;
}

/**
 * Transakce A: vybere položky, sestaví tělo, založí dávku a rezervuje kvótu.
 * Vrací null, když není co poslat nebo když kvóta nestačí.
 */
export async function pripravDavku(
  s: Spojeni,
  para: {
    zprava: string;
    ucel: UcelPolozky;
    otiskObsahu: string;
    telo: (polozky: Polozka[]) => string;
    kdy?: Date;
    max?: number;
  },
): Promise<{ davka: DavkaZaznam; polozky: Polozka[] } | null> {
  const kdy = para.kdy ?? new Date();
  const max = para.max ?? DAVKA_MAX;

  const vybrane = await s.dotaz<Polozka>(
    `select id, zprava, ucel, odberatel_id, zadost_jti, adresat_otisk
       from polozka_odeslani
      where zprava = $1 and stav = 'ceka'
      order by vlozeno
      limit $2
      for update skip locked`,
    [para.zprava, max],
  );
  const polozky = vybrane.rows;
  if (polozky.length === 0) return null;

  // Podmínka účelu: potvrzení potřebuje platnou žádost, obsahová zpráva aktivní
  // odběr, výzva čekající požadavek. Kdo ji nesplní, z dávky vypadne.
  const zpusobile: Polozka[] = [];
  for (const p of polozky) {
    if (await jeAdresatZpusobily(s, p)) zpusobile.push(p);
    else await s.dotaz(`update polozka_odeslani set stav = 'zahozena' where id = $1`, [p.id]);
  }
  if (zpusobile.length === 0) return null;

  const telo = para.telo(zpusobile);
  const otisk = otiskTela(telo);
  const clenove = otiskClenu(zpusobile.map((p) => p.id));
  const klic = klicIdempotence(para.zprava, otisk);
  const id = noveId();

  // Prokazatelně neodeslaná dávka se použije znovu s týmž klíčem a novým
  // pokusem, aby `insert` nekolidoval na jedinečnosti klíče.
  const ulozena = await s.dotaz<DavkaZaznam>(
    `insert into davka (id, zprava, telo, otisk_tela, clenove_otisk, idempotency_key, stav)
     values ($1, $2, $3, $4, $5, $6, 'pripravena')
     on conflict (idempotency_key) do update
       set stav = 'pripravena', pokus = davka.pokus + 1, zalozeno = now(),
           telo = excluded.telo, telo_smazano = false, clenove_otisk = excluded.clenove_otisk,
           uzavreno = null, predano_v = null
       where davka.stav in ('chyba', 'zrusena')
     returning id, zprava, telo, otisk_tela, clenove_otisk, pokus, idempotency_key, stav, predano_v`,
    [id, para.zprava, telo, otisk, clenove, klic],
  );
  const davka = ulozena.rows[0];
  if (!davka) return null; // dávka s tímto tělem už běží jinému pracovníkovi

  const rezervovano = await rezervujKvotu(s, davka.id, davka.pokus, zpusobile.length, para.ucel, kdy);
  if (!rezervovano) throw new Error('kvóta nestačí');

  await s.dotaz(
    `update polozka_odeslani set stav = 'pripravena', davka_id = $1, otisk_obsahu = $2
      where id = any($3::uuid[])`,
    [davka.id, para.otiskObsahu, zpusobile.map((p) => p.id)],
  );
  return { davka, polozky: zpusobile };
}

/** Smí adresát tuhle zprávu dostat? Podmínka se posuzuje podle účelu položky. */
async function jeAdresatZpusobily(s: Spojeni, p: Polozka): Promise<boolean> {
  if (p.ucel === 'potvrzeni') {
    const v = await s.dotaz(
      `select 1 from zadost_o_potvrzeni
        where jti = $1 and stav = 'aktivni' and spotrebovano is null and plati_do > now()`,
      [p.zadost_jti],
    );
    return v.rowCount > 0;
  }
  if (p.ucel === 'vyzva') {
    const v = await s.dotaz(
      `select 1 from zprava_o_kalendari where odberatel_id = $1 and stav in ('ceka', 'vyzvan')`,
      [p.odberatel_id],
    );
    return v.rowCount > 0;
  }
  if (p.ucel === 'uvitani') {
    const v = await s.dotaz(`select 1 from odber_novinek where odberatel_id = $1`, [p.odberatel_id]);
    return v.rowCount > 0;
  }
  // Obsahová zpráva: aktivní odběr ročníku, který zpráva nese.
  const rocnik = p.zprava.split('/')[1];
  const v = await s.dotaz(`select 1 from odber_novinek where odberatel_id = $1 and rocnik = $2`, [
    p.odberatel_id,
    rocnik,
  ]);
  return v.rowCount > 0;
}

/**
 * Atomická rezervace kvóty. Jediné místo, kde se strop kontroluje, takže dvě
 * souběžné dávky ho nemohou přečerpat.
 */
export async function rezervujKvotu(
  s: Spojeni,
  davkaId: string,
  pokus: number,
  pocet: number,
  ucel: UcelPolozky,
  kdy = new Date(),
): Promise<boolean> {
  for (const { obdobi, ucel: ucelRozpoctu } of obdobiKRezervaci(kdy, ucel)) {
    const v = await s.dotaz(
      `update rozpocet_emailu set rezervovano = rezervovano + $3
        where obdobi = $1 and ucel = $2 and rezervovano + spotrebovano + $3 <= limit_pocet`,
      [obdobi, ucelRozpoctu, pocet],
    );
    if (v.rowCount === 0) return false;
    await s.dotaz(
      `insert into rezervace_kvoty (davka_id, pokus, obdobi, ucel, pocet)
       values ($1, $2, $3, $4, $5)
       on conflict (davka_id, pokus, obdobi, ucel) do nothing`,
      [davkaId, pokus, obdobi, ucelRozpoctu, pocet],
    );
  }
  return true;
}

/**
 * Transakce B: trvale zapíše, že odeslání mohlo začít. Přechod je podmíněný
 * identifikátorem, pokusem, stavem i složením dávky. Teprve po commitu se smí
 * volat Resend.
 */
export async function predejDavku(
  s: Spojeni,
  davka: DavkaZaznam,
  kdy = new Date(),
): Promise<{ predano: boolean; duvod?: string }> {
  if (!smiSePredat(kdy, 'celkem')) {
    return { predano: false, duvod: 'konec období, předání se odkládá' };
  }
  const aktualni = await s.dotaz<{ clenove_otisk: string; stav: string }>(
    `select clenove_otisk, stav from davka where id = $1 for update`,
    [davka.id],
  );
  const radek = aktualni.rows[0];
  if (!radek) return { predano: false, duvod: 'dávka neexistuje' };
  if (radek.stav !== 'pripravena') {
    // Dávka patří jinému vítězi (predavana, odeslana, zrusena): jen načteme
    // stav a skončíme. Nic nerušíme a nic neúčtujeme.
    return { predano: false, duvod: `dávka je ve stavu ${radek.stav}` };
  }
  const slozeni = await s.dotaz<{ id: string }>(
    `select id from polozka_odeslani where davka_id = $1 and stav = 'pripravena'`,
    [davka.id],
  );
  if (otiskClenu(slozeni.rows.map((r) => r.id)) !== davka.clenove_otisk) {
    return { predano: false, duvod: 'složení dávky se změnilo' };
  }

  const prechod = await s.dotaz(
    `update davka set stav = 'predavana', predano_v = now()
      where id = $1 and pokus = $2 and stav = 'pripravena' and clenove_otisk = $3`,
    [davka.id, davka.pokus, davka.clenove_otisk],
  );
  if (prechod.rowCount === 0) return { predano: false, duvod: 'přechod vyhrál jiný zpracovatel' };

  await s.dotaz(
    `update polozka_odeslani set stav = 'predavana', predano_v = now()
      where davka_id = $1 and stav = 'pripravena'`,
    [davka.id],
  );
  await s.dotaz(
    `update rezervace_kvoty set volani_provedeno = true where davka_id = $1 and pokus = $2`,
    [davka.id, davka.pokus],
  );
  return { predano: true };
}

/** Zrušení dosud nepředané dávky: položky zpět do fronty, rezervace uvolnit. */
export async function zrusPripravenouDavku(s: Spojeni, davkaId: string, pokus: number): Promise<boolean> {
  const prechod = await s.dotaz(
    `update davka set stav = 'zrusena', uzavreno = now()
      where id = $1 and pokus = $2 and stav = 'pripravena'`,
    [davkaId, pokus],
  );
  if (prechod.rowCount === 0) return false;
  await s.dotaz(
    `update polozka_odeslani set stav = 'ceka', davka_id = null
      where davka_id = $1 and stav = 'pripravena'`,
    [davkaId],
  );
  await vyporadejRezervace(s, davkaId, pokus);
  return true;
}

/**
 * Transakce C, účtování dávky. Uzavření vyhraje jen jeden zpracovatel; teprve
 * pak se vypořádají rezervace. Tělo se tu nemaže, protože výsledky některých
 * položek mohou ještě chybět.
 */
export async function uzavriDavku(
  s: Spojeni,
  davkaId: string,
  pokus: number,
  stav: 'odeslana' | 'chyba' | 'neurcita',
): Promise<boolean> {
  const prechod = await s.dotaz(
    `update davka set stav = $3, uzavreno = now()
      where id = $1 and pokus = $2 and stav = 'predavana'`,
    [davkaId, pokus, stav],
  );
  if (prechod.rowCount === 0) return false;
  if (stav === 'chyba') {
    await s.dotaz(
      `update polozka_odeslani set stav = 'ceka', davka_id = null
        where davka_id = $1 and stav = 'predavana'`,
      [davkaId],
    );
  }
  await vyporadejRezervace(s, davkaId, pokus);
  return true;
}

/**
 * Vypořádá rezervace jednoho pokusu. Jednorázově a nezávisle na stavu dávky,
 * takže se vypořádá i rezervace, která vznikla později pro jiné období.
 */
export async function vyporadejRezervace(s: Spojeni, davkaId: string, pokus: number): Promise<number> {
  const v = await s.dotaz<{ obdobi: string; ucel: string; pocet: number; volani_provedeno: boolean }>(
    `update rezervace_kvoty set vyporadano = now()
      where davka_id = $1 and pokus = $2 and vyporadano is null
      returning obdobi, ucel, pocet, volani_provedeno`,
    [davkaId, pokus],
  );
  for (const r of v.rows) {
    if (r.volani_provedeno) {
      await s.dotaz(
        `update rozpocet_emailu set rezervovano = rezervovano - $3, spotrebovano = spotrebovano + $3
          where obdobi = $1 and ucel = $2`,
        [r.obdobi, r.ucel, r.pocet],
      );
    } else {
      await s.dotaz(
        `update rozpocet_emailu set rezervovano = rezervovano - $3 where obdobi = $1 and ucel = $2`,
        [r.obdobi, r.ucel, r.pocet],
      );
    }
  }
  return v.rows.length;
}

/** Výsledek jedné položky se doplňuje samostatně, i po uzavření dávky. */
export async function zapisVysledekPolozky(
  s: Spojeni,
  polozkaId: string,
  resendId: string | null,
  stavDoruceni?: string,
): Promise<boolean> {
  const v = await s.dotaz(
    `update polozka_odeslani
        set stav = 'odeslana', resend_id = coalesce($2, resend_id),
            odeslano = coalesce(odeslano, now()), stav_doruceni = coalesce($3, stav_doruceni)
      where id = $1 and stav = 'predavana'`,
    [polozkaId, resendId, stavDoruceni ?? null],
  );
  if (v.rowCount > 0) return true;
  // Po uzavření dávky se doplní aspoň stav doručení, aby se pozdní webhook neztratil.
  const doplneni = await s.dotaz(
    `update polozka_odeslani
        set resend_id = coalesce($2, resend_id), stav_doruceni = coalesce($3, stav_doruceni)
      where id = $1`,
    [polozkaId, resendId, stavDoruceni ?? null],
  );
  return doplneni.rowCount > 0;
}

/** Dávky, které uvízly: `pripravena` po pádu mezi A a B, nebo `predavana` bez výsledku. */
export async function najdiUviznuteDavky(
  s: Spojeni,
  kdy = new Date(),
): Promise<Array<DavkaZaznam & { chybi_vysledky: number }>> {
  const v = await s.dotaz<DavkaZaznam & { chybi_vysledky: number }>(
    `select d.id, d.zprava, d.telo, d.otisk_tela, d.clenove_otisk, d.pokus,
            d.idempotency_key, d.stav, d.predano_v,
            (select count(*) from polozka_odeslani p
              where p.davka_id = d.id and p.stav = 'predavana')::int as chybi_vysledky
       from davka d
      where (d.stav = 'pripravena' and d.zalozeno < $1)
         or (d.stav = 'predavana' and d.predano_v < $2)
      order by d.zalozeno`,
    [new Date(kdy.getTime() - 15 * 60 * 1000), new Date(kdy.getTime() - PRODLENI_PRED_OPAKOVANIM_MS)],
  );
  return v.rows;
}

/** Smí se požadavek zopakovat? Jen v okně idempotence a s platným obsahem. */
export function smiSeOpakovat(davka: { predano_v: string | null }, kdy = new Date()): boolean {
  if (!davka.predano_v) return false;
  return kdy.getTime() - new Date(davka.predano_v).getTime() < OKNO_OPAKOVANI_MS;
}

/** Tělo se maže teprve tehdy, když ho už žádná obnova nemůže potřebovat. */
export async function umazTelaDavek(s: Spojeni, kdy = new Date()): Promise<number> {
  const v = await s.dotaz(
    `update davka set telo = '', telo_smazano = true
      where telo_smazano = false
        and (
          (stav = 'odeslana' and not exists (
            select 1 from polozka_odeslani p where p.davka_id = davka.id and p.stav = 'predavana'))
          or (predano_v is not null and predano_v < $1)
          or (stav = 'neurcita' and uzavreno < $2)
        )`,
    [new Date(kdy.getTime() - OKNO_OPAKOVANI_MS), new Date(kdy.getTime() - 30 * 24 * 60 * 60 * 1000)],
  );
  return v.rowCount;
}
