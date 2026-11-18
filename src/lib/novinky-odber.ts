import { vTransakci, dotaz } from './novinky-db.ts';
import type { Spojeni } from './novinky-db.ts';
import { uklidEvidence, zaradPolozku, zrusDavkuPolozky } from './novinky-fronta.ts';
import {
  ZADOST_PLATNOST_MS,
  noveId,
  noveJti,
  normalizujEmail,
  otisk,
  vytvorToken,
} from './novinky-token.ts';

// ============================================================================
// Přihlášení, potvrzení, odhlášení a správa odběru
// (docs/novinky-k-prijimackam-2027.md, oddíl 6, průběh kroky 1 až 4, 6 a 7).
//
// Pravidla, která tenhle modul drží:
//  - Odběr je **jeden newsletter bez ročníku a bez segmentů**: kdo se přihlásí,
//    dostává termíny přijímacího řízení a zprávy o nových datech na webu, dokud
//    se neodhlásí. Ročník se bere z registru u každé zprávy, ne z odběru.
//  - Do potvrzení se ukládá jen **žádost**, ne odběr ani identita.
//  - Potvrzení je jeden aktivní krok člověka: `GET` nic nezakládá, `POST` ano.
//  - Odkaz platí jednou: žádost se při potvrzení označí `spotrebovano`.
//  - Odhlašuje se odběr, ne člověk; identita se maže, až nemá žádný účel.
// ============================================================================

/** Kolik potvrzovacích e-mailů smí jedna adresa dostat za 24 hodin. */
export const LIMIT_NA_ADRESU = 3;
/** Kolik jich smí přijít z jedné IP adresy za 24 hodin. */
export const LIMIT_NA_IP = 30;
const OKNO_LIMITU_MS = 24 * 60 * 60 * 1000;

/** Verze znění souhlasu; mění se, když se text souhlasu změní. */
export const SOUHLAS_VERZE = '2026-11-01';

export interface PrihlaseniVstup {
  email: string;
  /** Místo formuláře; ukládá se k odběru, aby bylo vidět, co funguje. */
  zdroj: string;
  ip: string;
}

export interface PrihlaseniVysledek {
  /** Odeslat potvrzovací e-mail? Při překročení limitu se neposílá nic. */
  poslat: boolean;
  jti?: string;
  token?: string;
  polozkaId?: string;
  duvod?: string;
}

/**
 * Krok 1: založí žádost o potvrzení a položku fronty. Odpověď volajícího je
 * vždy stejná, ať adresu známe, nebo ne; tady se jen rozhoduje, zda poslat.
 */
export async function prihlas(vstup: PrihlaseniVstup): Promise<PrihlaseniVysledek> {
  const email = normalizujEmail(vstup.email);
  const otiskEmailu = otisk(`email:${email}`);
  const otiskIp = otisk(`ip:${vstup.ip}`);

  return vTransakci(async (s) => {
    if (!(await zvysLimit(s, otiskEmailu, LIMIT_NA_ADRESU))) {
      return { poslat: false, duvod: 'limit adresy' };
    }
    if (!(await zvysLimit(s, otiskIp, LIMIT_NA_IP))) {
      return { poslat: false, duvod: 'limit IP' };
    }

    const jti = noveJti();
    await s.dotaz(
      `insert into zadost_o_potvrzeni (jti, email, souhlas_verze, zdroj, plati_do)
       values ($1, $2, $3, $4, now() + ($5::text || ' milliseconds')::interval)`,
      [jti, email, SOUHLAS_VERZE, vstup.zdroj, String(ZADOST_PLATNOST_MS)],
    );

    const polozkaId = await zaradPolozku(s, {
      zprava: 'novinky/potvrzeni',
      ucel: 'potvrzeni',
      zadostJti: jti,
      adresatOtisk: otiskEmailu,
    });
    return {
      poslat: true,
      jti,
      token: vytvorToken(jti, ZADOST_PLATNOST_MS),
      polozkaId: polozkaId ?? undefined,
    };
  });
}

/** Zpráva potvrzovacího e-mailu hlídání; liší se od potvrzení termínů šablonou (#523, E6). */
export const ZPRAVA_POTVRZENI_HLIDANI = 'novinky/potvrzeni-hlidani';
/** Kolik škol jde přihlásit k hlídání jednou žádostí (simulátor posílá zvažované školy). */
export const MAX_SKOL_NA_ZADOST = 20;

/** RED IZO je devět číslic; ostatní se zahodí, duplicity se sloučí. */
export function platneRedizo(hodnoty: unknown): string[] {
  if (!Array.isArray(hodnoty)) return [];
  const vysledek: string[] = [];
  for (const h of hodnoty) {
    if (typeof h === 'string' && /^\d{9}$/.test(h) && !vysledek.includes(h)) vysledek.push(h);
  }
  return vysledek.slice(0, MAX_SKOL_NA_ZADOST);
}

export interface PrihlaseniHlidaniVstup extends PrihlaseniVstup {
  skoly: string[];
}

/**
 * Krok 1 hlídání škol (#523, E6): stejné limity a stejná fronta jako přihlášení
 * k termínům, žádost ale nese účel `hlidani_skol` a seznam škol. Odběr termínů
 * nevzniká a stávající odběratel termínů hlídání bez nového potvrzení nedostane (P4).
 * Potřebuje migraci 012 (sloupce `ucel` a `skoly`).
 */
export async function prihlasHlidani(vstup: PrihlaseniHlidaniVstup): Promise<PrihlaseniVysledek> {
  const email = normalizujEmail(vstup.email);
  const skoly = platneRedizo(vstup.skoly);
  if (!skoly.length) return { poslat: false, duvod: 'bez škol' };
  const otiskEmailu = otisk(`email:${email}`);
  const otiskIp = otisk(`ip:${vstup.ip}`);

  return vTransakci(async (s) => {
    if (!(await zvysLimit(s, otiskEmailu, LIMIT_NA_ADRESU))) {
      return { poslat: false, duvod: 'limit adresy' };
    }
    if (!(await zvysLimit(s, otiskIp, LIMIT_NA_IP))) {
      return { poslat: false, duvod: 'limit IP' };
    }

    const jti = noveJti();
    await s.dotaz(
      `insert into zadost_o_potvrzeni (jti, email, souhlas_verze, zdroj, plati_do, ucel, skoly)
       values ($1, $2, $3, $4, now() + ($5::text || ' milliseconds')::interval, 'hlidani_skol', $6::text[])`,
      [jti, email, SOUHLAS_VERZE, vstup.zdroj, String(ZADOST_PLATNOST_MS), skoly],
    );

    const polozkaId = await zaradPolozku(s, {
      zprava: ZPRAVA_POTVRZENI_HLIDANI,
      ucel: 'potvrzeni',
      zadostJti: jti,
      adresatOtisk: otiskEmailu,
    });
    return {
      poslat: true,
      jti,
      token: vytvorToken(jti, ZADOST_PLATNOST_MS),
      polozkaId: polozkaId ?? undefined,
    };
  });
}

/**
 * Počitadlo v okně 24 hodin. Otisk je HMAC s odděleným tajemstvím, takže
 * tabulka nenese adresu ani IP.
 *
 * `limit` se porovnává až tady v JavaScriptu, takže **do dotazu nepatří**:
 * Postgres odmítne celý dotaz (`42P18`), když mu předáme parametr, který se
 * v textu nevyskytuje. Hlídá to `tests/novinky-parametry.test.mjs`.
 */
async function zvysLimit(s: Spojeni, otiskHodnoty: string, limit: number): Promise<boolean> {
  const v = await s.dotaz<{ pocet: number }>(
    `insert into limit_potvrzeni (otisk, pocet, od) values ($1, 1, now())
     on conflict (otisk) do update
       set pocet = case when limit_potvrzeni.od < now() - ($2::text || ' milliseconds')::interval
                        then 1 else limit_potvrzeni.pocet + 1 end,
           od = case when limit_potvrzeni.od < now() - ($2::text || ' milliseconds')::interval
                     then now() else limit_potvrzeni.od end
     returning pocet`,
    [otiskHodnoty, String(OKNO_LIMITU_MS)],
  );
  return (v.rows[0]?.pocet ?? limit + 1) <= limit;
}

export interface Zadost {
  jti: string;
  email: string;
  souhlas_verze: string;
  zdroj: string;
  /** `novinky` (termíny), nebo `hlidani_skol` (#523, E6). */
  ucel: string;
  /** Školy k hlídání (RED IZO); u termínů prázdné. */
  skoly: string[];
}

/**
 * Sloupce žádosti. `ucel` a `skoly` přidává migrace 012; čtou se přes `to_jsonb`,
 * aby potvrzení termínů fungovalo i v databázi, kde migrace ještě neběžela.
 */
const SLOUPCE_ZADOSTI = `z.jti, z.email, z.souhlas_verze, z.zdroj,
       coalesce(to_jsonb(z) ->> 'ucel', 'novinky') as ucel,
       coalesce(to_jsonb(z) -> 'skoly', '[]'::jsonb) as skoly`;

function zadostZRadku(r: Omit<Zadost, 'skoly'> & { skoly: unknown }): Zadost {
  const skoly = typeof r.skoly === 'string' ? JSON.parse(r.skoly) : r.skoly;
  return { ...r, skoly: Array.isArray(skoly) ? skoly.filter((x): x is string => typeof x === 'string') : [] };
}

/**
 * Krok 3: obslužná cesta jen **čte** žádost. Nic nezakládá a nic neodesílá,
 * takže robot poštovního systému odběr nevytvoří.
 */
export async function najdiAktivniZadost(jti: string): Promise<Zadost | null> {
  const v = await dotaz<Omit<Zadost, 'skoly'> & { skoly: unknown }>(
    `select ${SLOUPCE_ZADOSTI}
       from zadost_o_potvrzeni z
      where z.jti = $1 and z.spotrebovano is null and z.plati_do > now()`,
    [jti],
  );
  return v.rows[0] ? zadostZRadku(v.rows[0]) : null;
}

export interface PotvrzeniVysledek {
  ok: boolean;
  duvod?: string;
  odberatelId?: string;
  email?: string;
  /** Místo, odkud se přihlásil; pro měření (#523). */
  zdroj?: string;
  uvitaniPolozkaId?: string;
  /** Identifikátor zprávy uvítání; nese `jti`, viz poznámka u potvrzení. */
  uvitaniZprava?: string;
  /** Potvrzené hlídání škol, ne odběr termínů (#523, E6). */
  hlidani?: boolean;
  /** Kolik škol se potvrzením začalo hlídat. */
  skol?: number;
}

/**
 * Krok 4: jedna transakce spotřebuje žádost, založí odběr, zapíše doklad
 * souhlasu a zařadí uvítání. Druhé kliknutí na odkaz už neprojde.
 */
export async function potvrd(jti: string): Promise<PotvrzeniVysledek> {
  return vTransakci(async (s) => {
    const v = await s.dotaz<Omit<Zadost, 'skoly'> & { skoly: unknown }>(
      `update zadost_o_potvrzeni z set spotrebovano = now()
        where z.jti = $1 and z.spotrebovano is null and z.plati_do > now()
        returning ${SLOUPCE_ZADOSTI}`,
      [jti],
    );
    if (!v.rows[0]) return { ok: false, duvod: 'žádost už byla použita nebo propadla' };
    const zadost = zadostZRadku(v.rows[0]);

    const email = normalizujEmail(zadost.email);
    const odberatelId = await zajistiOdberatele(s, email);

    if (zadost.ucel === 'hlidani_skol') {
      // Hlídání: jen vazba na školy a doklad s vlastním účelem. Odběr termínů
      // nevzniká (P4) a uvítání se neposílá; první zprávou je denní souhrn.
      const skoly = platneRedizo(zadost.skoly);
      for (const redizo of skoly) {
        await s.dotaz(
          `insert into odber_skoly (odberatel_id, redizo, zdroj) values ($1, $2, $3)
           on conflict (odberatel_id, redizo) do nothing`,
          [odberatelId, redizo, zadost.zdroj],
        );
      }
      await zapisDoklad(s, odberatelId, email, zadost, 'hlidani_skol');
      return { ok: true, odberatelId, email, zdroj: zadost.zdroj, hlidani: true, skol: skoly.length };
    }

    await s.dotaz(
      `insert into odber_novinek (odberatel_id, zdroj) values ($1, $2)
       on conflict (odberatel_id) do nothing`,
      [odberatelId, zadost.zdroj],
    );
    await zapisDoklad(s, odberatelId, email, zadost);

    // Identifikátor zprávy nese `jti`: kdo se odhlásí a za měsíc přihlásí
    // znovu, musí dostat uvítání znovu. S pevným `novinky/uvitani` by narazil
    // na jedinečnost položky a uvítání by mu tiše nepřišlo.
    const uvitaniZprava = `novinky/uvitani/${jti}`;
    const uvitaniPolozkaId = await zaradPolozku(s, {
      zprava: uvitaniZprava,
      ucel: 'uvitani',
      odberatelId,
      adresatOtisk: otisk(`email:${email}`),
    });
    return {
      ok: true,
      odberatelId,
      email,
      zdroj: zadost.zdroj,
      uvitaniPolozkaId: uvitaniPolozkaId ?? undefined,
      uvitaniZprava,
    };
  });
}

async function zajistiOdberatele(s: Spojeni, email: string): Promise<string> {
  const v = await s.dotaz<{ id: string }>(
    `insert into odberatel (id, email) values ($1, $2)
     on conflict (email) do update set email = excluded.email
     returning id`,
    [noveId(), email],
  );
  return v.rows[0].id;
}

async function zapisDoklad(
  s: Spojeni,
  odberatelId: string,
  email: string,
  zadost: Zadost,
  ucel: 'novinky' | 'hlidani_skol' = 'novinky',
): Promise<void> {
  // Doklad termínů se zapisuje beze sloupce `ucel` (výchozí `novinky`), jako dřív.
  if (ucel === 'novinky') {
    await s.dotaz(
      `insert into doklad_souhlasu (id, odberatel_id, email_otisk, souhlas_verze, zdroj)
       values ($1, $2, $3, $4, $5)`,
      [noveId(), odberatelId, otisk(`email:${email}`), zadost.souhlas_verze, zadost.zdroj],
    );
    return;
  }
  await s.dotaz(
    `insert into doklad_souhlasu (id, odberatel_id, email_otisk, souhlas_verze, zdroj, ucel)
     values ($1, $2, $3, $4, $5, $6)`,
    [noveId(), odberatelId, otisk(`email:${email}`), zadost.souhlas_verze, zadost.zdroj, ucel],
  );
}

export interface OdhlaseniVysledek {
  ok: boolean;
  /** Kolik nepředaných položek se zahodilo. */
  zahozeno: number;
  duvod?: string;
  /** Co se odhlásilo: termíny, nebo hlídání škol (podle zprávy, ze které odkaz vede). */
  co?: 'terminy' | 'hlidani';
  /** Zbývá po odhlášení nějaký další odběr (termíny nebo hlídané školy)? */
  zbyva?: boolean;
}

/**
 * Krok 7: odhlášení jedním kliknutím. Ruší jen ten odběr, ze které zprávy odkaz
 * vede (termíny, nebo hlídání škol; P4 zadání #523), a v téže transakci se
 * vypořádá s jeho nepředanými položkami. Hranicí je předání dávky Resendu:
 * co je `predavana` nebo dál, se nechá dojít.
 */
export async function odhlas(polozkaId: string): Promise<OdhlaseniVysledek> {
  return vTransakci(async (s) => {
    const v = await s.dotaz<{ odberatel_id: string | null; zprava: string }>(
      `select odberatel_id, zprava from polozka_odeslani where id = $1`,
      [polozkaId],
    );
    const odberatelId = v.rows[0]?.odberatel_id;
    if (!odberatelId) return { ok: false, zahozeno: 0, duvod: 'odkaz neplatí' };

    const hlidani = jeZpravaHlidani(v.rows[0].zprava);
    const zahozeno = hlidani ? await zrusHlidaniTx(s, odberatelId) : await zrusTerminyTx(s, odberatelId);
    const terminy = await s.dotaz(`select 1 from odber_novinek where odberatel_id = $1`, [odberatelId]);
    const skoly = await s.dotaz(`select 1 from odber_skoly where odberatel_id = $1`, [odberatelId]);
    return {
      ok: true,
      zahozeno,
      co: hlidani ? 'hlidani' : 'terminy',
      zbyva: terminy.rowCount > 0 || skoly.rowCount > 0,
    };
  });
}

/** Zprávy hlídání škol mají v evidenci odeslání zprávu `hlidani-RRRR-MM-DD`. */
export const PREDPONA_ZPRAVY_HLIDANI = 'hlidani-';

export function jeZpravaHlidani(zprava: string): boolean {
  return zprava.startsWith(PREDPONA_ZPRAVY_HLIDANI);
}

/** Zruší odběr termínů. Hlídání škol se ho netýká (P4). Vrací počet zahozených položek. */
export async function zrusTerminyTx(s: Spojeni, odberatelId: string): Promise<number> {
  await s.dotaz(`delete from odber_novinek where odberatel_id = $1`, [odberatelId]);
  await s.dotaz(
    `update doklad_souhlasu
        set zaniklo = coalesce(zaniklo, now()), smazat_po = coalesce(smazat_po, now() + interval '3 years')
      where odberatel_id = $1 and ucel = 'novinky'`,
    [odberatelId],
  );
  const zahozeno = await zahodNepredanePolozky(s, odberatelId, 'terminy');
  await smazOsirelouIdentitu(s, odberatelId);
  return zahozeno;
}

/**
 * Zruší hlídání jedné školy, nebo (bez `redizo`) všech hlídaných škol. Odběr
 * termínů zůstává. Když nezbyde žádná hlídaná škola, zanikne doklad souhlasu
 * s hlídáním a čekající souhrn se zahodí.
 */
export async function zrusHlidaniTx(s: Spojeni, odberatelId: string, redizo?: string): Promise<number> {
  if (redizo) {
    await s.dotaz(`delete from odber_skoly where odberatel_id = $1 and redizo = $2`, [odberatelId, redizo]);
  } else {
    await s.dotaz(`delete from odber_skoly where odberatel_id = $1`, [odberatelId]);
  }
  const zbyva = await s.dotaz(`select 1 from odber_skoly where odberatel_id = $1 limit 1`, [odberatelId]);
  let zahozeno = 0;
  if (zbyva.rowCount === 0) {
    await s.dotaz(
      `update doklad_souhlasu
          set zaniklo = coalesce(zaniklo, now()), smazat_po = coalesce(smazat_po, now() + interval '3 years')
        where odberatel_id = $1 and ucel = 'hlidani_skol'`,
      [odberatelId],
    );
    zahozeno = await zahodNepredanePolozky(s, odberatelId, 'hlidani');
  }
  await smazOsirelouIdentitu(s, odberatelId);
  return zahozeno;
}

/** Zruší všechno najednou: termíny i hlídání. Nic se nepošle ani nezařadí (P7). */
export async function zrusVseTx(s: Spojeni, odberatelId: string): Promise<number> {
  await s.dotaz(`delete from odber_novinek where odberatel_id = $1`, [odberatelId]);
  await s.dotaz(`delete from odber_skoly where odberatel_id = $1`, [odberatelId]);
  await s.dotaz(
    `update doklad_souhlasu
        set zaniklo = coalesce(zaniklo, now()), smazat_po = coalesce(smazat_po, now() + interval '3 years')
      where odberatel_id = $1`,
    [odberatelId],
  );
  const zahozeno = await zahodNepredanePolozky(s, odberatelId, 'vse');
  await smazOsirelouIdentitu(s, odberatelId);
  return zahozeno;
}

/**
 * Zahodí nepředané položky odběratele. Dávku, ve které leží, nejdřív zruší,
 * aby ostatní příjemci zůstali ve frontě (P1-1 z code review).
 */
async function zahodNepredanePolozky(
  s: Spojeni,
  odberatelId: string,
  rozsah: 'terminy' | 'hlidani' | 'vse' = 'vse',
): Promise<number> {
  const nepredane = await s.dotaz<{ id: string; davka_id: string | null }>(
    `select id, davka_id from polozka_odeslani
      where odberatel_id = $1 and stav in ('ceka', 'pripravena')
        and ($2 = 'vse' or (zprava like 'hlidani-%') = ($2 = 'hlidani'))`,
    [odberatelId, rozsah],
  );
  let zahozeno = 0;
  for (const p of nepredane.rows) {
    if (p.davka_id) await zrusDavkuPolozky(s, p.id);
    const v = await s.dotaz(
      `update polozka_odeslani set stav = 'zahozena'
        where id = $1 and stav in ('ceka', 'pripravena')`,
      [p.id],
    );
    zahozeno += v.rowCount;
  }
  return zahozeno;
}

/** Trvale nedoručitelná adresa nebo stížnost: odběr končí hned. */
/**
 * Identita se maže, až nemá žádný odběr. Doklad a evidence odeslání se jen
 * odpojí (`on delete set null`), takže zůstane otisk adresy bez adresy samotné.
 */
export async function smazOsirelouIdentitu(s: Spojeni, odberatelId: string): Promise<boolean> {
  const v = await s.dotaz(
    `delete from odberatel
      where id = $1
        and not exists (select 1 from odber_novinek o where o.odberatel_id = $1)
        and not exists (select 1 from odber_skoly h where h.odberatel_id = $1)`,
    [odberatelId],
  );
  return v.rowCount > 0;
}

export interface HlidanaSkola {
  redizo: string;
  nazev: string;
}

export interface Prehled {
  email: string;
  /** Odebírá připomínky termínů. */
  odebira: boolean;
  potvrzeno: string | null;
  /** Hlídané školy (zadání #523, E5). */
  skoly: HlidanaSkola[];
}

/** Název školy pro přehled; bez něj se ukáže RED IZO. */
export type NazevSkoly = (redizo: string) => Promise<string | null>;

/** Správa odběru: co o odběrateli vedeme. Čte se podle položky z e-mailu. */
export async function prehledPodlePolozky(
  polozkaId: string,
  nazevSkoly?: NazevSkoly,
): Promise<Prehled | null> {
  const v = await dotaz<{ odberatel_id: string | null; email: string | null }>(
    `select p.odberatel_id, o.email
       from polozka_odeslani p left join odberatel o on o.id = p.odberatel_id
      where p.id = $1`,
    [polozkaId],
  );
  const radek = v.rows[0];
  if (!radek?.odberatel_id || !radek.email) return null;

  const odber = await dotaz<{ potvrzeno: string }>(
    `select potvrzeno from odber_novinek where odberatel_id = $1`,
    [radek.odberatel_id],
  );
  const hlidane = await dotaz<{ redizo: string }>(
    `select redizo from odber_skoly where odberatel_id = $1 order by potvrzeno, redizo`,
    [radek.odberatel_id],
  );
  const skoly: HlidanaSkola[] = [];
  for (const h of hlidane.rows) {
    const nazev = nazevSkoly ? await nazevSkoly(h.redizo).catch(() => null) : null;
    skoly.push({ redizo: h.redizo, nazev: nazev ?? `Škola ${h.redizo}` });
  }
  return {
    email: radek.email,
    odebira: odber.rows.length > 0,
    potvrzeno: odber.rows[0]?.potvrzeno ?? null,
    skoly,
  };
}

export type AkceSpravy =
  | { akce: 'vse' }
  | { akce: 'terminy' }
  | { akce: 'hlidani' }
  | { akce: 'skola'; redizo: string };

export interface Zbyva {
  terminy: boolean;
  skoly: number;
}

/**
 * Zrušení ze stránky správy: všechno, termíny, hlídání, nebo jedna škola.
 * Nic z toho nezakládá ani neodesílá e-mail (P7). Vrací, co adrese zbývá, aby
 * stránka po zrušení poznala, že už nic nepřijde.
 */
export async function spravaProved(polozkaId: string, akce: AkceSpravy): Promise<Zbyva | null> {
  return vTransakci(async (s) => {
    const v = await s.dotaz<{ odberatel_id: string | null }>(
      `select odberatel_id from polozka_odeslani where id = $1`,
      [polozkaId],
    );
    const odberatelId = v.rows[0]?.odberatel_id;
    if (!odberatelId) return null;
    if (akce.akce === 'vse') await zrusVseTx(s, odberatelId);
    else if (akce.akce === 'terminy') await zrusTerminyTx(s, odberatelId);
    else if (akce.akce === 'hlidani') await zrusHlidaniTx(s, odberatelId);
    else await zrusHlidaniTx(s, odberatelId, akce.redizo);

    // Po zrušení posledního odběru identita zanikla a nic nezbývá.
    const terminy = await s.dotaz(`select 1 from odber_novinek where odberatel_id = $1`, [odberatelId]);
    const skoly = await s.dotaz(`select 1 from odber_skoly where odberatel_id = $1`, [odberatelId]);
    return { terminy: terminy.rowCount > 0, skoly: skoly.rowCount };
  });
}

/** Odhlášení všeho ze stránky správy. */
export async function odhlasVse(polozkaId: string): Promise<boolean> {
  return (await spravaProved(polozkaId, { akce: 'vse' })) !== null;
}

export async function zrusPodleAdresy(email: string): Promise<number> {
  const norm = normalizujEmail(email);
  return vTransakci(async (s) => {
    const v = await s.dotaz<{ id: string }>(`select id from odberatel where email = $1`, [norm]);
    const odberatelId = v.rows[0]?.id;
    if (!odberatelId) return 0;
    // Nedoručitelná adresa nebo stížnost končí odběr termínů i hlídání škol.
    const zrusene = await s.dotaz(`select 1 from odber_novinek where odberatel_id = $1`, [odberatelId]);
    const hlidane = await s.dotaz(`select 1 from odber_skoly where odberatel_id = $1`, [odberatelId]);
    await zrusVseTx(s, odberatelId);
    return zrusene.rowCount + hlidane.rowCount;
  });
}

/** Denní úklid: prošlé žádosti, doklady po lhůtě a stará počitadla. */
export async function uklid(): Promise<{
  zadosti: number;
  doklady: number;
  limity: number;
  polozky: number;
  davky: number;
  webhooky: number;
}> {
  return vTransakci(async (s) => {
    const zadosti = await s.dotaz(
      `delete from zadost_o_potvrzeni
        where plati_do < now()
           or (spotrebovano is not null and spotrebovano < now() - interval '7 days')`,
    );
    const doklady = await s.dotaz(
      `delete from doklad_souhlasu where smazat_po is not null and smazat_po < now()`,
    );
    const limity = await s.dotaz(`delete from limit_potvrzeni where od < now() - interval '30 days'`);
    const evidence = await uklidEvidence(s);
    return {
      zadosti: zadosti.rowCount,
      doklady: doklady.rowCount,
      limity: limity.rowCount,
      ...evidence,
    };
  });
}
