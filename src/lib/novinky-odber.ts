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
}

/**
 * Krok 3: obslužná cesta jen **čte** žádost. Nic nezakládá a nic neodesílá,
 * takže robot poštovního systému odběr nevytvoří.
 */
export async function najdiAktivniZadost(jti: string): Promise<Zadost | null> {
  const v = await dotaz<Zadost>(
    `select jti, email, souhlas_verze, zdroj
       from zadost_o_potvrzeni
      where jti = $1 and spotrebovano is null and plati_do > now()`,
    [jti],
  );
  return v.rows[0] ?? null;
}

export interface PotvrzeniVysledek {
  ok: boolean;
  duvod?: string;
  odberatelId?: string;
  email?: string;
  uvitaniPolozkaId?: string;
  /** Identifikátor zprávy uvítání; nese `jti`, viz poznámka u potvrzení. */
  uvitaniZprava?: string;
}

/**
 * Krok 4: jedna transakce spotřebuje žádost, založí odběr, zapíše doklad
 * souhlasu a zařadí uvítání. Druhé kliknutí na odkaz už neprojde.
 */
export async function potvrd(jti: string): Promise<PotvrzeniVysledek> {
  return vTransakci(async (s) => {
    const v = await s.dotaz<Zadost>(
      `update zadost_o_potvrzeni set spotrebovano = now()
        where jti = $1 and spotrebovano is null and plati_do > now()
        returning jti, email, souhlas_verze, zdroj`,
      [jti],
    );
    const zadost = v.rows[0];
    if (!zadost) return { ok: false, duvod: 'žádost už byla použita nebo propadla' };

    const email = normalizujEmail(zadost.email);
    const odberatelId = await zajistiOdberatele(s, email);

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
): Promise<void> {
  await s.dotaz(
    `insert into doklad_souhlasu (id, odberatel_id, email_otisk, souhlas_verze, zdroj)
     values ($1, $2, $3, $4, $5)`,
    [noveId(), odberatelId, otisk(`email:${email}`), zadost.souhlas_verze, zadost.zdroj],
  );
}

export interface OdhlaseniVysledek {
  ok: boolean;
  /** Kolik nepředaných položek se zahodilo. */
  zahozeno: number;
  duvod?: string;
}

/**
 * Krok 7: odhlášení jedním kliknutím. Ruší jen odběr té zprávy, ze které odkaz
 * vede, a v téže transakci se vypořádá s jeho nepředanými položkami. Hranicí
 * je předání dávky Resendu: co je `predavana` nebo dál, se nechá dojít.
 */
export async function odhlas(polozkaId: string): Promise<OdhlaseniVysledek> {
  return vTransakci(async (s) => {
    const v = await s.dotaz<{ odberatel_id: string | null }>(
      `select odberatel_id from polozka_odeslani where id = $1`,
      [polozkaId],
    );
    const odberatelId = v.rows[0]?.odberatel_id;
    if (!odberatelId) return { ok: false, zahozeno: 0, duvod: 'odkaz neplatí' };

    // Odběr je jeden, takže odhlášení znamená konec celého newsletteru.
    await s.dotaz(`delete from odber_novinek where odberatel_id = $1`, [odberatelId]);
    await s.dotaz(
      `update doklad_souhlasu
          set zaniklo = coalesce(zaniklo, now()), smazat_po = coalesce(smazat_po, now() + interval '3 years')
        where odberatel_id = $1`,
      [odberatelId],
    );
    const zahozeno = await zahodNepredanePolozky(s, odberatelId);
    await smazOsirelouIdentitu(s, odberatelId);
    return { ok: true, zahozeno };
  });
}

/**
 * Zahodí nepředané položky odběratele. Dávku, ve které leží, nejdřív zruší,
 * aby ostatní příjemci zůstali ve frontě (P1-1 z code review).
 */
async function zahodNepredanePolozky(s: Spojeni, odberatelId: string): Promise<number> {
  const nepredane = await s.dotaz<{ id: string; davka_id: string | null }>(
    `select id, davka_id from polozka_odeslani
      where odberatel_id = $1 and stav in ('ceka', 'pripravena')`,
    [odberatelId],
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
        and not exists (select 1 from odber_novinek o where o.odberatel_id = $1)`,
    [odberatelId],
  );
  return v.rowCount > 0;
}

export interface Prehled {
  email: string;
  odebira: boolean;
  potvrzeno: string | null;
}

/** Správa odběru: co o odběrateli vedeme. Čte se podle položky z e-mailu. */
export async function prehledPodlePolozky(polozkaId: string): Promise<Prehled | null> {
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
  return {
    email: radek.email,
    odebira: odber.rows.length > 0,
    potvrzeno: odber.rows[0]?.potvrzeno ?? null,
  };
}

/** Odhlášení ze stránky správy. Odběr je jeden, takže je to totéž co odhlas(). */
export async function odhlasVse(polozkaId: string): Promise<boolean> {
  const vysledek = await odhlas(polozkaId);
  return vysledek.ok;
}

export async function zrusPodleAdresy(email: string): Promise<number> {
  const norm = normalizujEmail(email);
  return vTransakci(async (s) => {
    const v = await s.dotaz<{ id: string }>(`select id from odberatel where email = $1`, [norm]);
    const odberatelId = v.rows[0]?.id;
    if (!odberatelId) return 0;
    const zrusene = await s.dotaz(`delete from odber_novinek where odberatel_id = $1`, [odberatelId]);
    await s.dotaz(
      `update doklad_souhlasu
          set zaniklo = coalesce(zaniklo, now()), smazat_po = coalesce(smazat_po, now() + interval '3 years')
        where odberatel_id = $1`,
      [odberatelId],
    );
    await zahodNepredanePolozky(s, odberatelId);
    await smazOsirelouIdentitu(s, odberatelId);
    return zrusene.rowCount;
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
