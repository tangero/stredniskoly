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
import type { DruhStudia, Ucel } from './novinky-token.ts';

// ============================================================================
// Přihlášení, potvrzení, odhlášení a správa odběru
// (docs/novinky-k-prijimackam-2027.md, oddíl 6, průběh kroky 1 až 4, 6 a 7).
//
// Pravidla, která tenhle modul drží:
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
  /** Jeden nebo oba druhy studia; prázdné znamená čekání na další kalendář. */
  druhy: DruhStudia[];
  rocnik: string;
  kraj?: string | null;
  zdroj: string;
  ip: string;
  cilovyRocnik?: string;
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
  const ucel: Ucel = vstup.druhy.length > 0 ? 'novinky' : 'kalendar';
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
    const volby = {
      rocnik: vstup.rocnik,
      druhy: vstup.druhy,
      kraj: vstup.kraj ?? null,
      cilovyRocnik: vstup.cilovyRocnik ?? null,
    };
    await s.dotaz(
      `insert into zadost_o_potvrzeni (jti, ucel, stav, email, volby, souhlas_verze, zdroj, plati_do)
       values ($1, $2, 'aktivni', $3, $4::jsonb, $5, $6, now() + ($7::text || ' milliseconds')::interval)`,
      [jti, ucel, email, JSON.stringify(volby), SOUHLAS_VERZE, vstup.zdroj, String(ZADOST_PLATNOST_MS)],
    );

    const polozkaId = await zaradPolozku(s, {
      zprava: `novinky/${vstup.rocnik}/potvrzeni`,
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
 */
async function zvysLimit(s: Spojeni, otiskHodnoty: string, limit: number): Promise<boolean> {
  const v = await s.dotaz<{ pocet: number }>(
    `insert into limit_potvrzeni (otisk, pocet, od) values ($1, 1, now())
     on conflict (otisk) do update
       set pocet = case when limit_potvrzeni.od < now() - ($3::text || ' milliseconds')::interval
                        then 1 else limit_potvrzeni.pocet + 1 end,
           od = case when limit_potvrzeni.od < now() - ($3::text || ' milliseconds')::interval
                     then now() else limit_potvrzeni.od end
     returning pocet`,
    [otiskHodnoty, limit, String(OKNO_LIMITU_MS)],
  );
  return (v.rows[0]?.pocet ?? limit + 1) <= limit;
}

export interface Zadost {
  jti: string;
  ucel: Ucel;
  stav: string;
  email: string;
  volby: { rocnik: string; druhy: DruhStudia[]; kraj: string | null; cilovyRocnik: string | null };
  souhlas_verze: string;
  zdroj: string;
}

/**
 * Krok 3: obslužná cesta jen **čte** žádost. Nic nezakládá a nic neodesílá,
 * takže robot poštovního systému odběr nevytvoří.
 */
export async function najdiAktivniZadost(jti: string): Promise<Zadost | null> {
  const v = await dotaz<Zadost>(
    `select jti, ucel, stav, email, volby, souhlas_verze, zdroj
       from zadost_o_potvrzeni
      where jti = $1 and stav = 'aktivni' and spotrebovano is null and plati_do > now()`,
    [jti],
  );
  return v.rows[0] ?? null;
}

export interface PotvrzeniVysledek {
  ok: boolean;
  duvod?: string;
  odberatelId?: string;
  email?: string;
  rocnik?: string;
  uvitaniPolozkaId?: string;
}

/**
 * Krok 4: jedna transakce spotřebuje žádost, založí odběr, zapíše doklad
 * souhlasu a zařadí uvítání. Druhé kliknutí na odkaz už neprojde.
 */
export async function potvrd(jti: string): Promise<PotvrzeniVysledek> {
  return vTransakci(async (s) => {
    const v = await s.dotaz<Zadost>(
      `update zadost_o_potvrzeni set stav = 'spotrebovana', spotrebovano = now()
        where jti = $1 and stav = 'aktivni' and spotrebovano is null and plati_do > now()
        returning jti, ucel, stav, email, volby, souhlas_verze, zdroj`,
      [jti],
    );
    const zadost = v.rows[0];
    if (!zadost) return { ok: false, duvod: 'žádost už byla použita nebo propadla' };

    const email = normalizujEmail(zadost.email);
    const odberatelId = await zajistiOdberatele(s, email);
    const rocnik = zadost.volby.rocnik;

    if (zadost.ucel === 'kalendar') {
      await s.dotaz(
        `insert into zprava_o_kalendari (odberatel_id, cilovy_rocnik, stav, ceka_do)
         values ($1, $2, 'ceka', now() + interval '18 months')
         on conflict (odberatel_id, cilovy_rocnik) do nothing`,
        [odberatelId, zadost.volby.cilovyRocnik ?? rocnik],
      );
      await zapisDoklad(s, odberatelId, email, 'zprava_o_kalendari', null, zadost);
      return { ok: true, odberatelId, email, rocnik };
    }

    for (const druh of zadost.volby.druhy) {
      await s.dotaz(
        `insert into odber_novinek (odberatel_id, rocnik, druh_studia, kraj, zdroj)
         values ($1, $2, $3, $4, $5)
         on conflict (odberatel_id, rocnik, druh_studia) do update set kraj = excluded.kraj`,
        [odberatelId, rocnik, druh, zadost.volby.kraj, zadost.zdroj],
      );
    }
    await zapisDoklad(s, odberatelId, email, 'novinky', rocnik, zadost);

    if (zadost.ucel === 'novy_rocnik') {
      await s.dotaz(
        `update zprava_o_kalendari set stav = 'uzavren'
          where odberatel_id = $1 and cilovy_rocnik = $2`,
        [odberatelId, rocnik],
      );
    }

    const uvitaniPolozkaId = await zaradPolozku(s, {
      zprava: `novinky/${rocnik}/uvitani`,
      ucel: 'uvitani',
      odberatelId,
      adresatOtisk: otisk(`email:${email}`),
    });
    return { ok: true, odberatelId, email, rocnik, uvitaniPolozkaId: uvitaniPolozkaId ?? undefined };
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
  ucel: string,
  rocnik: string | null,
  zadost: Zadost,
): Promise<void> {
  await s.dotaz(
    `insert into doklad_souhlasu (id, odberatel_id, email_otisk, ucel, rocnik, souhlas_verze, zdroj)
     values ($1, $2, $3, $4, $5, $6, $7)`,
    [noveId(), odberatelId, otisk(`email:${email}`), ucel, rocnik, zadost.souhlas_verze, zadost.zdroj],
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
    const v = await s.dotaz<{ odberatel_id: string | null; zprava: string; segment: string[] | null }>(
      `select odberatel_id, zprava, segment from polozka_odeslani where id = $1`,
      [polozkaId],
    );
    const polozka = v.rows[0];
    if (!polozka?.odberatel_id) return { ok: false, zahozeno: 0, duvod: 'odkaz neplatí' };

    const rocnik = polozka.zprava.split('/')[1];
    // Ruší se odběr **v segmentech té zprávy**, ze které odkaz vede. Kdo klikne
    // v e-mailu o jednotné zkoušce pro čtyřleté obory, nepřijde tím o odběr
    // pro víceleté gymnázium. Segment bez hodnoty znamená celý ročník.
    const segment = polozka.segment && polozka.segment.length > 0 ? polozka.segment : null;
    if (segment) {
      await s.dotaz(
        `delete from odber_novinek
          where odberatel_id = $1 and rocnik = $2 and druh_studia = any($3::text[])`,
        [polozka.odberatel_id, rocnik, segment],
      );
    } else {
      await s.dotaz(`delete from odber_novinek where odberatel_id = $1 and rocnik = $2`, [
        polozka.odberatel_id,
        rocnik,
      ]);
    }
    await s.dotaz(
      `update doklad_souhlasu
          set zaniklo = coalesce(zaniklo, now()), smazat_po = coalesce(smazat_po, now() + interval '3 years')
        where odberatel_id = $1 and ucel = 'novinky' and (rocnik = $2 or rocnik is null)`,
      [polozka.odberatel_id, rocnik],
    );

    // Nepředané položky téhož odběratele zahodit; u `pripravena` zkusit zrušit
    // celou dávku, protože její tělo už adresu obsahuje.
    const pripravene = await s.dotaz<{ id: string; davka_id: string | null }>(
      `select id, davka_id from polozka_odeslani
        where odberatel_id = $1 and stav in ('ceka', 'pripravena')`,
      [polozka.odberatel_id],
    );
    let zahozeno = 0;
    for (const p of pripravene.rows) {
      // U položky v dávce se **nejdřív zruší celá dávka**: její ostatní položky
      // se vrátí do fronty a rezervace se vypořádá. Kdyby se jen zahodila naše
      // položka, zbylí příjemci by zprávu nikdy nedostali, protože transakce A
      // vybírá jen stav `ceka`.
      if (p.davka_id) await zrusDavkuPolozky(s, p.id);
      const prechod = await s.dotaz(
        `update polozka_odeslani set stav = 'zahozena'
          where id = $1 and stav in ('ceka', 'pripravena')`,
        [p.id],
      );
      zahozeno += prechod.rowCount;
    }
    await smazOsirelouIdentitu(s, polozka.odberatel_id);
    return { ok: true, zahozeno };
  });
}

/**
 * Identita se maže, až nemá žádný odběr ani čekající požadavek. Doklad a
 * evidence odeslání se jen odpojí (`on delete set null`), takže zůstane otisk.
 */
export async function smazOsirelouIdentitu(s: Spojeni, odberatelId: string): Promise<boolean> {
  const v = await s.dotaz(
    `delete from odberatel
      where id = $1
        and not exists (select 1 from odber_novinek o where o.odberatel_id = $1)
        and not exists (select 1 from zprava_o_kalendari z
                         where z.odberatel_id = $1 and z.stav <> 'uzavren')`,
    [odberatelId],
  );
  return v.rowCount > 0;
}

export interface Prehled {
  email: string;
  odbery: Array<{ rocnik: string; druh_studia: string; kraj: string | null }>;
  cekaNaKalendar: Array<{ cilovy_rocnik: string; stav: string }>;
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

  const odbery = await dotaz<{ rocnik: string; druh_studia: string; kraj: string | null }>(
    `select rocnik, druh_studia, kraj from odber_novinek where odberatel_id = $1 order by rocnik, druh_studia`,
    [radek.odberatel_id],
  );
  const kalendar = await dotaz<{ cilovy_rocnik: string; stav: string }>(
    `select cilovy_rocnik, stav from zprava_o_kalendari where odberatel_id = $1`,
    [radek.odberatel_id],
  );
  return { email: radek.email, odbery: odbery.rows, cekaNaKalendar: kalendar.rows };
}

/** Odhlášení všech účelů ze stránky správy. */
export async function odhlasVse(polozkaId: string): Promise<boolean> {
  return vTransakci(async (s) => {
    const v = await s.dotaz<{ odberatel_id: string | null }>(
      `select odberatel_id from polozka_odeslani where id = $1`,
      [polozkaId],
    );
    const odberatelId = v.rows[0]?.odberatel_id;
    if (!odberatelId) return false;
    await s.dotaz(`delete from odber_novinek where odberatel_id = $1`, [odberatelId]);
    await s.dotaz(`delete from zprava_o_kalendari where odberatel_id = $1`, [odberatelId]);
    await s.dotaz(
      `update doklad_souhlasu
          set zaniklo = coalesce(zaniklo, now()), smazat_po = coalesce(smazat_po, now() + interval '3 years')
        where odberatel_id = $1`,
      [odberatelId],
    );
    await zahodNepredanePolozky(s, odberatelId);
    await smazOsirelouIdentitu(s, odberatelId);
    return true;
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
export async function zrusPodleAdresy(email: string): Promise<number> {
  const norm = normalizujEmail(email);
  return vTransakci(async (s) => {
    const v = await s.dotaz<{ id: string }>(`select id from odberatel where email = $1`, [norm]);
    const odberatelId = v.rows[0]?.id;
    if (!odberatelId) return 0;
    const zrusene = await s.dotaz(`delete from odber_novinek where odberatel_id = $1`, [odberatelId]);
    await s.dotaz(`delete from zprava_o_kalendari where odberatel_id = $1`, [odberatelId]);
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
  kalendar: number;
  polozky: number;
  davky: number;
  webhooky: number;
}> {
  return vTransakci(async (s) => {
    const zadosti = await s.dotaz(
      `delete from zadost_o_potvrzeni
        where (plati_do is not null and plati_do < now())
           or (stav = 'spotrebovana' and spotrebovano < now() - interval '7 days')
           or (stav = 'ceka_na_vyzvu' and vytvoreno < now() - interval '40 days')`,
    );
    const doklady = await s.dotaz(
      `delete from doklad_souhlasu where smazat_po is not null and smazat_po < now()`,
    );
    const limity = await s.dotaz(`delete from limit_potvrzeni where od < now() - interval '30 days'`);
    // Čekání na kalendář má vlastní lhůtu: po `ceka_do` už nemá co oznámit.
    const kalendar = await s.dotaz(
      `delete from zprava_o_kalendari where stav = 'uzavren' or ceka_do < now()`,
    );
    const evidence = await uklidEvidence(s);
    return {
      zadosti: zadosti.rowCount,
      doklady: doklady.rowCount,
      limity: limity.rowCount,
      kalendar: kalendar.rowCount,
      ...evidence,
    };
  });
}
