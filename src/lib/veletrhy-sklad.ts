// ============================================================================
// Akce, návrhy změn a audit veletrhů v databázi (docs/veletrhy-api-2027.md).
//
// Funkce berou spojení (`Spojeni` z novinky-db), takže je testy pouštějí nad
// PGlite a route handlery uvnitř `vTransakci`. Nic tu neví o HTTP, cache ani
// e-mailu.
//
// Nahlášení není zveřejnění: návrh od Eduardy se provede, až ho schválí
// člověk. Schválení ověří návrh znovu proti **aktuálnímu** stavu, protože
// mezi založením a kliknutím mohl projít jiný návrh.
// ============================================================================

import { randomUUID } from 'crypto';
import type { Spojeni } from './novinky-db.ts';
import type { Veletrh } from './veletrhy.ts';
import { overNavrh, type Chyba, type StavAkce, type VysledekNavrhu, type ZmenaAkce } from './veletrhy-validace.ts';

/** Kolik návrhů smí najednou čekat na rozhodnutí. Víc znamená, že se něco zacyklilo. */
export const MAX_CEKAJICICH = 50;

/** Klíč transakčního zámku, který řadí rozhodnutí o návrzích za sebe. */
const ZAMEK_ROZHODNUTI = 2027_0926;

export type StavNavrhu = 'ceka' | 'schvaleno' | 'provedeno' | 'zamitnuto' | 'stazeno';

export interface Navrh {
  id: string;
  klic: string;
  autor: string;
  operace: unknown[];
  zdroj_url: string | null;
  zdroj_email: string | null;
  nahlaseni_id: number | null;
  poznamka: string | null;
  varovani: Chyba[];
  stav: StavNavrhu;
  chyba: string | null;
  rozhodl: string | null;
  rozhodnuto: string | null;
  duvod: string | null;
  vytvoreno: string;
}

const SLOUPCE_NAVRHU = `id::text as id, klic, autor, operace, zdroj_url, zdroj_email, nahlaseni_id::int as nahlaseni_id,
  poznamka, varovani, stav, chyba, rozhodl, rozhodnuto::text as rozhodnuto, duvod, vytvoreno::text as vytvoreno`;

// ----------------------------------------------------------------------------
// Akce
// ----------------------------------------------------------------------------

/** Všechny akce sezóny včetně odebraných: proti nim se ověřuje návrh. */
export async function stavAkci(s: Spojeni): Promise<Map<string, StavAkce>> {
  // Id je unikátní napříč sezónami, proto se kolize hledá ve všech.
  const r = await s.dotaz<{ id: string; data: Veletrh; verze: number; smazano: boolean }>(
    'select id, data, verze, smazano from veletrh_akce',
  );
  return new Map(r.rows.map((x) => [x.id, { data: x.data, verze: x.verze, smazano: x.smazano }]));
}

/** Platné (neodebrané) akce sezóny. Tohle čte web. */
export async function akceSezony(s: Spojeni, sezona: string): Promise<Veletrh[]> {
  const r = await s.dotaz<{ data: Veletrh }>(
    'select data from veletrh_akce where sezona = $1 and not smazano order by id',
    [sezona],
  );
  return r.rows.map((x) => x.data);
}

/** Akce s verzí pro API (Eduarda potřebuje verzi k operaci „upravit“). */
export async function akceSVerzi(
  s: Spojeni,
  sezona: string,
): Promise<{ akce: Veletrh; verze: number }[]> {
  const r = await s.dotaz<{ data: Veletrh; verze: number }>(
    'select data, verze from veletrh_akce where sezona = $1 and not smazano order by id',
    [sezona],
  );
  return r.rows.map((x) => ({ akce: x.data, verze: x.verze }));
}

export interface AuditZaznam {
  cas: string;
  kdo: string;
  udalost: string;
  navrh_id: string | null;
  pred: Veletrh | null;
  po: Veletrh | null;
  zdroj_url: string | null;
}

/** Detail akce s posledními auditními záznamy. `zdroj_email` se ven nedává. */
export async function detailAkce(
  s: Spojeni,
  id: string,
): Promise<{ akce: Veletrh; verze: number; smazano: boolean; audit: AuditZaznam[] } | null> {
  const r = await s.dotaz<{ data: Veletrh; verze: number; smazano: boolean }>(
    'select data, verze, smazano from veletrh_akce where id = $1',
    [id],
  );
  if (!r.rows[0]) return null;
  const a = await s.dotaz<AuditZaznam>(
    `select cas::text as cas, kdo, udalost, navrh_id::text as navrh_id, pred, po, zdroj_url
       from veletrh_audit where akce_id = $1 order by cas desc, id desc limit 20`,
    [id],
  );
  return { akce: r.rows[0].data, verze: r.rows[0].verze, smazano: r.rows[0].smazano, audit: a.rows };
}

/**
 * Naplní prázdnou nebo neúplnou tabulku ze snímku JSON. Existující id se
 * nepřepisují (`on conflict do nothing`), takže opakované spuštění nic
 * nezmění a nepřebije schválené úpravy. Vrací počet vložených akcí.
 */
export async function seed(s: Spojeni, akce: Veletrh[], sezona: string): Promise<number> {
  let vlozeno = 0;
  for (const a of akce) {
    const r = await s.dotaz(
      `insert into veletrh_akce (id, sezona, data) values ($1, $2, $3::jsonb)
       on conflict (id) do nothing`,
      [a.id, sezona, JSON.stringify(a)],
    );
    if (r.rowCount > 0) {
      vlozeno++;
      await s.dotaz(
        `insert into veletrh_audit (kdo, udalost, akce_id, po) values ('seed', 'seed', $1, $2::jsonb)`,
        [a.id, JSON.stringify(a)],
      );
    }
  }
  return vlozeno;
}

// ----------------------------------------------------------------------------
// Návrhy
// ----------------------------------------------------------------------------

export interface NovyNavrh {
  klic: string;
  autor: string;
  operace: unknown;
  zdrojUrl?: string | null;
  zdrojEmail?: string | null;
  nahlaseniId?: number | null;
  poznamka?: string | null;
}

export type VysledekZalozeni =
  | { vysledek: 'zalozen'; navrh: Navrh; diff: ZmenaAkce[] }
  | { vysledek: 'existuje'; navrh: Navrh }
  | { vysledek: 'neplatny'; validace: VysledekNavrhu }
  | { vysledek: 'limit' };

/**
 * Založí návrh. Stejný `klic` (hlavička Idempotency-Key) vrátí původní
 * návrh a nic dalšího nezaloží, ať je v těle cokoli.
 */
export async function zalozNavrh(
  s: Spojeni,
  vstup: NovyNavrh,
  dnes: string,
): Promise<VysledekZalozeni> {
  const puvodni = await navrhPodleKlice(s, vstup.klic);
  if (puvodni) return { vysledek: 'existuje', navrh: puvodni };

  const cekajici = await s.dotaz<{ pocet: number }>(
    `select count(*)::int as pocet from veletrh_navrh where stav = 'ceka'`,
  );
  if ((cekajici.rows[0]?.pocet ?? 0) >= MAX_CEKAJICICH) return { vysledek: 'limit' };

  const validace = overNavrh(vstup.operace, await stavAkci(s), dnes);
  if (validace.chyby.length) return { vysledek: 'neplatny', validace };

  const id = randomUUID();
  const r = await s.dotaz(
    `insert into veletrh_navrh (id, klic, autor, operace, zdroj_url, zdroj_email, nahlaseni_id, poznamka, varovani)
     values ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9::jsonb)
     on conflict (klic) do nothing`,
    [
      id, vstup.klic, vstup.autor, JSON.stringify(vstup.operace), vstup.zdrojUrl ?? null,
      vstup.zdrojEmail ?? null, vstup.nahlaseniId ?? null, vstup.poznamka ?? null,
      JSON.stringify(validace.varovani),
    ],
  );
  if (r.rowCount === 0) {
    // Souběžný požadavek se stejným klíčem byl rychlejší.
    return { vysledek: 'existuje', navrh: (await navrhPodleKlice(s, vstup.klic))! };
  }
  await s.dotaz(
    `insert into veletrh_audit (kdo, udalost, navrh_id, zdroj_url, zdroj_email)
     values ($1, 'navrh_vytvoren', $2, $3, $4)`,
    [vstup.autor, id, vstup.zdrojUrl ?? null, vstup.zdrojEmail ?? null],
  );
  return { vysledek: 'zalozen', navrh: (await navrh(s, id))!, diff: validace.diff };
}

export async function navrh(s: Spojeni, id: string): Promise<Navrh | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const r = await s.dotaz<Navrh>(`select ${SLOUPCE_NAVRHU} from veletrh_navrh where id = $1`, [id]);
  return r.rows[0] ?? null;
}

async function navrhPodleKlice(s: Spojeni, klic: string): Promise<Navrh | null> {
  const r = await s.dotaz<Navrh>(`select ${SLOUPCE_NAVRHU} from veletrh_navrh where klic = $1`, [klic]);
  return r.rows[0] ?? null;
}

export async function navrhy(s: Spojeni, stavy: StavNavrhu[], limit = 100): Promise<Navrh[]> {
  const r = await s.dotaz<Navrh>(
    `select ${SLOUPCE_NAVRHU} from veletrh_navrh where stav = any($1::text[])
      order by vytvoreno desc limit $2`,
    [stavy, limit],
  );
  return r.rows;
}

/** Diff návrhu proti dnešnímu stavu, pro stránku rozhodnutí a e-mail. */
export async function diffNavrhu(s: Spojeni, n: Navrh, dnes: string): Promise<VysledekNavrhu> {
  return overNavrh(n.operace, await stavAkci(s), dnes);
}

/** Stáhne vlastní návrh, jen dokud čeká. */
export async function stahniNavrh(s: Spojeni, id: string, kdo: string): Promise<Navrh | null> {
  const r = await s.dotaz(
    `update veletrh_navrh set stav = 'stazeno', rozhodl = $2, rozhodnuto = now()
      where id = $1 and stav = 'ceka'`,
    [id, kdo],
  );
  if (r.rowCount > 0) {
    await s.dotaz(`insert into veletrh_audit (kdo, udalost, navrh_id) values ($1, 'stazeno', $2)`, [kdo, id]);
  }
  return navrh(s, id);
}

export type VysledekRozhodnuti =
  | { vysledek: 'provedeno'; navrh: Navrh; diff: ZmenaAkce[] }
  | { vysledek: 'zamitnuto'; navrh: Navrh }
  | { vysledek: 'nelze_provest'; navrh: Navrh }
  | { vysledek: 'uz_rozhodnuto'; navrh: Navrh }
  | { vysledek: 'nenalezen' };

/**
 * Schválí, nebo zamítne návrh. Volat uvnitř transakce: `for update` drží
 * návrh, aby dvojí kliknutí provedlo změnu jen jednou.
 *
 * Návrh, který už neprojde validací proti aktuálnímu stavu, se neprovede
 * vůbec: zůstane `schvaleno` s vyplněnou `chyba`. Ověřuje se dřív, než se
 * cokoli zapíše, takže není co vracet a zápis chyby transakci nepotřebuje
 * shodit.
 */
export async function rozhodni(
  s: Spojeni,
  id: string,
  { schvalit, kdo, duvod }: { schvalit: boolean; kdo: string; duvod: string | null },
  dnes: string,
  sezona: string,
): Promise<VysledekRozhodnuti> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { vysledek: 'nenalezen' };
  // Rozhodnutí se řadí za sebe: `for update` drží jen návrh, ale dva různé
  // návrhy nad toutéž akcí by jinak prošly validací proti stejné verzi
  // a druhý by přepsal první. Zámek trvá do konce transakce.
  await s.dotaz('select pg_advisory_xact_lock($1)', [ZAMEK_ROZHODNUTI]);
  const r = await s.dotaz<Navrh>(`select ${SLOUPCE_NAVRHU} from veletrh_navrh where id = $1 for update`, [id]);
  const n = r.rows[0];
  if (!n) return { vysledek: 'nenalezen' };

  // Schválený, který nešel provést, jde už jen zamítnout.
  const lzeZamitnout = n.stav === 'ceka' || (n.stav === 'schvaleno' && n.chyba !== null);
  if (!schvalit) {
    if (!lzeZamitnout) return { vysledek: 'uz_rozhodnuto', navrh: n };
    await s.dotaz(
      `update veletrh_navrh set stav = 'zamitnuto', rozhodl = $2, rozhodnuto = now(), duvod = $3 where id = $1`,
      [id, kdo, duvod],
    );
    await s.dotaz(`insert into veletrh_audit (kdo, udalost, navrh_id) values ($1, 'zamitnuto', $2)`, [kdo, id]);
    return { vysledek: 'zamitnuto', navrh: (await navrh(s, id))! };
  }
  if (n.stav !== 'ceka') return { vysledek: 'uz_rozhodnuto', navrh: n };

  const validace = overNavrh(n.operace, await stavAkci(s), dnes);
  if (validace.chyby.length) {
    const chyba = validace.chyby.map((c) => `${c.pole}: ${c.zprava}`).join('; ').slice(0, 2000);
    await s.dotaz(
      `update veletrh_navrh set stav = 'schvaleno', chyba = $2, rozhodl = $3, rozhodnuto = now(), duvod = $4
        where id = $1`,
      [id, chyba, kdo, duvod],
    );
    await s.dotaz(`insert into veletrh_audit (kdo, udalost, navrh_id) values ($1, 'schvaleno', $2)`, [kdo, id]);
    return { vysledek: 'nelze_provest', navrh: (await navrh(s, id))! };
  }

  await provedDiff(s, validace.diff, sezona, { kdo, navrhId: id, zdrojUrl: n.zdroj_url, zdrojEmail: n.zdroj_email });
  await s.dotaz(
    `update veletrh_navrh set stav = 'provedeno', chyba = null, rozhodl = $2, rozhodnuto = now(), duvod = $3
      where id = $1`,
    [id, kdo, duvod],
  );
  await s.dotaz(`insert into veletrh_audit (kdo, udalost, navrh_id) values ($1, 'schvaleno', $2)`, [kdo, id]);
  return { vysledek: 'provedeno', navrh: (await navrh(s, id))!, diff: validace.diff };
}

async function provedDiff(
  s: Spojeni,
  diff: ZmenaAkce[],
  sezona: string,
  kontext: { kdo: string; navrhId: string; zdrojUrl: string | null; zdrojEmail: string | null },
): Promise<void> {
  for (const z of diff) {
    if (z.op === 'pridat') {
      await s.dotaz(
        `insert into veletrh_akce (id, sezona, data) values ($1, $2, $3::jsonb)`,
        [z.id, sezona, JSON.stringify(z.po)],
      );
    } else if (z.op === 'upravit') {
      // Pojistka k zámku: úprava platí jen nad verzí, ze které vycházela.
      const u = await s.dotaz(
        `update veletrh_akce set data = $2::jsonb, verze = verze + 1, zmeneno = now()
          where id = $1 and verze = $3 and not smazano`,
        [z.id, JSON.stringify(z.po), z.verze],
      );
      if (u.rowCount !== 1) throw new Error(`Akce ${z.id} se během schvalování změnila.`);
    } else {
      await s.dotaz(
        `update veletrh_akce set smazano = true, verze = verze + 1, zmeneno = now() where id = $1`,
        [z.id],
      );
    }
    await s.dotaz(
      `insert into veletrh_audit (kdo, udalost, navrh_id, akce_id, pred, po, zdroj_url, zdroj_email)
       values ($1, 'provedeno', $2, $3, $4::jsonb, $5::jsonb, $6, $7)`,
      [
        kontext.kdo, kontext.navrhId, z.id, z.pred ? JSON.stringify(z.pred) : null,
        z.po ? JSON.stringify(z.po) : null, kontext.zdrojUrl, kontext.zdrojEmail,
      ],
    );
  }
}
