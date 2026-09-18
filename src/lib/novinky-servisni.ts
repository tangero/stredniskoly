import { vTransakci } from './novinky-db.ts';
import {
  najdiServisniPolozky,
  predejDavku,
  pripravDavku,
  uzavriDavku,
  zapisVysledekPolozky,
  zrusPripravenouDavku,
} from './novinky-fronta.ts';
import type { Polozka, UcelPolozky } from './novinky-fronta.ts';
import { odesliDavku, sestavTeloDavky } from './novinky-email.ts';
import type { ZpravaProAdresata } from './novinky-email.ts';
import { potvrzovaciEmail, uvitaciEmail } from './novinky-sablony.ts';
import {
  odhlasovaciOdkaz,
  vytvorToken,
  SPRAVA_PLATNOST_MS,
  ZADOST_PLATNOST_MS,
} from './novinky-token.ts';
import type { DruhStudia } from './novinky-token.ts';
import calendar from '@/data/admissions-2027.json';

// ============================================================================
// Servisní e-maily: potvrzení a uvítání.
//
// Obojí vyvolal člověk, takže odchází **hned**. Jdou ale stejnou frontou
// a stejným rozpočtem kvóty jako obsahové zprávy, protože jinak by:
//  - rezerva 5 000 e-mailů pro portál proti formuláři neplatila (kontrakt,
//    krok 9: řádek `celkem` drží strop pro *všechny* e-maily novinek) a
//  - slib „fronta je u nich záloha“ neměl konzumenta: po výpadku Resendu by
//    potvrzení nikdy nedošlo a žádost by za 72 hodin propadla.
//
// Odtud plyne jediná cesta odeslání: dávka o jednom příjemci → rezervace →
// hranice předání → volání → vypořádání.
// ============================================================================

/** Nejbližší termíny z kalendáře pro uvítání; letopočet se bere odtud. */
export function nejblizsiTerminy(
  druhy: DruhStudia[],
  dnes = new Date().toISOString().slice(0, 10),
): Array<{ nazev: string; datum: string }> {
  const skupiny = calendar.groups.filter((g) => g.id !== 'konzervatore');
  const jenVicelete = druhy.length === 1 && druhy[0] === 'vicelete';
  return skupiny
    .flatMap((g) => g.events)
    .filter((e) => (e.end ?? e.start) >= dnes)
    .filter((e) => (jenVicelete ? !e.id.startsWith('jpz-4') : !e.id.startsWith('jpz-vice')))
    .sort((a, b) => a.start.localeCompare(b.start))
    .slice(0, 6)
    .map((e) => ({ nazev: e.title, datum: e.date }));
}

/** Sestaví obsah servisního e-mailu podle účelu položky. */
export function obsahServisni(para: {
  ucel: 'potvrzeni' | 'uvitani';
  polozkaId: string;
  email: string;
  rocnik: string;
  druhy: DruhStudia[];
  jti?: string | null;
  jenKalendar?: boolean;
}): ZpravaProAdresata {
  if (para.ucel === 'potvrzeni') {
    if (!para.jti) throw new Error('potvrzení bez žádosti nelze poslat');
    const sablona = potvrzovaciEmail({
      token: vytvorToken(para.jti, ZADOST_PLATNOST_MS),
      rocnik: para.rocnik,
      druhy: para.druhy,
      jenKalendar: para.jenKalendar,
    });
    return { polozkaId: para.polozkaId, email: para.email, ...sablona };
  }

  const token = vytvorToken(para.polozkaId, SPRAVA_PLATNOST_MS);
  const sablona = uvitaciEmail({
    rocnik: para.rocnik,
    druhy: para.druhy,
    terminy: nejblizsiTerminy(para.druhy),
    spravaOdkaz: `https://www.prijimackynaskolu.cz/api/novinky/sprava?t=${encodeURIComponent(token)}`,
    odhlasitOdkaz: odhlasovaciOdkaz(token),
  });
  return { polozkaId: para.polozkaId, email: para.email, ...sablona, odhlasovaciToken: token };
}

export interface VysledekServisni {
  odeslano: boolean;
  duvod?: string;
}

/**
 * Odešle jednu servisní položku celou cestou: rezervace kvóty, hranice předání,
 * volání Resendu, vypořádání. Když cokoli neprojde, položka zůstane ve frontě
 * a dožene ji odesílač.
 */
export async function odesliServisni(
  polozka: Pick<Polozka, 'id' | 'zprava' | 'email'> & {
    ucel: 'potvrzeni' | 'uvitani';
    rocnik: string;
    druhy: DruhStudia[];
    jti?: string | null;
    jenKalendar?: boolean;
  },
  kdy = new Date(),
): Promise<VysledekServisni> {
  const ucel: UcelPolozky = polozka.ucel;

  const pripravena = await vTransakci(async (s) =>
    pripravDavku(s, {
      zprava: polozka.zprava,
      ucel,
      otiskObsahu: 'servisni',
      max: 1,
      kdy,
      // Tělo se skládá z položek, které transakce A opravdu zamkla; adresu
      // bere z identity nebo ze žádosti, ne z parametru.
      telo: (polozky) =>
        sestavTeloDavky(
          polozky.map((p) =>
            obsahServisni({
              ucel: polozka.ucel,
              polozkaId: p.id,
              email: p.email,
              rocnik: polozka.rocnik,
              druhy: polozka.druhy,
              jti: p.zadost_jti ?? polozka.jti,
              jenKalendar: polozka.jenKalendar,
            }),
          ),
        ),
    }),
  ).catch((chyba) => {
    console.error(`✉️ ${ucel}: dávka se nepřipravila:`, chyba);
    return null;
  });
  if (!pripravena) return { odeslano: false, duvod: 'kvóta nebo fronta' };

  const predano = await vTransakci((s) => predejDavku(s, pripravena.davka, kdy, ucel));
  if (!predano.predano) {
    await vTransakci((s) => zrusPripravenouDavku(s, pripravena.davka.id, pripravena.davka.pokus));
    return { odeslano: false, duvod: predano.duvod };
  }

  const odpoved = await odesliDavku(pripravena.davka.telo, pripravena.davka.idempotency_key);
  if (odpoved.ok) {
    await vTransakci(async (s) => {
      await uzavriDavku(s, pripravena.davka.id, pripravena.davka.pokus, 'odeslana');
      for (let i = 0; i < pripravena.polozky.length; i += 1) {
        await zapisVysledekPolozky(s, pripravena.polozky[i].id, odpoved.idEmailu[i] ?? null, 'sent');
      }
    });
    return { odeslano: true };
  }
  if (odpoved.jistaChyba) {
    // Prokazatelně neodesláno: položka se vrátí do fronty a zkusí se znovu.
    await vTransakci((s) => uzavriDavku(s, pripravena.davka.id, pripravena.davka.pokus, 'chyba'));
    return { odeslano: false, duvod: `Resend odmítl (${odpoved.stav})` };
  }
  // Neznámý výsledek: dávka zůstává `predavana`, dořeší ji obnova.
  return { odeslano: false, duvod: 'neznámý výsledek, dořeší obnova' };
}

/**
 * Dovoz servisních položek, které inline odeslání nestihlo. Bez tohoto kroku
 * by slib „fronta je záloha“ neplatil: po výpadku Resendu by potvrzení nikdy
 * nedošlo a žádost by propadla.
 */
export async function dovezServisni(kdy = new Date()): Promise<{ odeslano: number; chyby: string[] }> {
  const polozky = await vTransakci((s) => najdiServisniPolozky(s, 50));
  let odeslano = 0;
  const chyby: string[] = [];
  for (const p of polozky) {
    const volby = await zjistiVolby(p);
    const vysledek = await odesliServisni(
      {
        id: p.id,
        zprava: p.zprava,
        email: p.email,
        ucel: p.ucel === 'potvrzeni' ? 'potvrzeni' : 'uvitani',
        rocnik: p.rocnik,
        druhy: volby.druhy,
        jti: p.jti,
        jenKalendar: volby.jenKalendar,
      },
      kdy,
    );
    if (vysledek.odeslano) odeslano += 1;
    else chyby.push(`${p.ucel} ${p.id}: ${vysledek.duvod ?? 'neodesláno'}`);
  }
  return { odeslano, chyby };
}

/** Druhy studia pro obsah e-mailu: ze žádosti u potvrzení, z odběru u uvítání. */
async function zjistiVolby(p: {
  ucel: string;
  odberatel_id: string | null;
  zadost_jti: string | null;
  rocnik: string;
}): Promise<{ druhy: DruhStudia[]; jenKalendar: boolean }> {
  return vTransakci(async (s) => {
    if (p.zadost_jti) {
      const v = await s.dotaz<{ volby: { druhy?: DruhStudia[] }; ucel: string }>(
        `select volby, ucel from zadost_o_potvrzeni where jti = $1`,
        [p.zadost_jti],
      );
      const radek = v.rows[0];
      return {
        druhy: radek?.volby?.druhy ?? [],
        jenKalendar: radek?.ucel === 'kalendar',
      };
    }
    const v = await s.dotaz<{ druh_studia: DruhStudia }>(
      `select druh_studia from odber_novinek where odberatel_id = $1 and rocnik = $2`,
      [p.odberatel_id, p.rocnik],
    );
    return { druhy: v.rows.map((r) => r.druh_studia), jenKalendar: false };
  });
}
