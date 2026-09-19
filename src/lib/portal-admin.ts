import { promises as fs } from 'fs';
import path from 'path';
import type { Spojeni } from './novinky-db';

// ============================================================================
// Podklady pro /admin a /admin/portal (docs/ucty-portalu-skol-2027.md, 2.4 a 4).
// ============================================================================

export interface PilotSkola {
  redizo: string;
  nazev: string;
  mesto: string;
  typ: string;
  pozvanka_odeslana: string | null;
}

export async function nactiPilot(): Promise<PilotSkola[]> {
  try {
    const obsah = await fs.readFile(path.join(process.cwd(), 'data', 'portal', 'pilot.json'), 'utf-8');
    return (JSON.parse(obsah).skoly ?? []) as PilotSkola[];
  } catch {
    return [];
  }
}

export interface StavSkolyPortalu {
  redizo: string;
  spravce: string | null;
  spravce_email: string | null;
  spravce_od: string | null;
  editori: number;
  posledni_prihlaseni: string | null;
  navrhy: number;
  posledni_navrh: string | null;
  posledni_udalost: string | null;
}

/** Stav účtů a aktivity pro zadané školy, nebo pro všechny školy s nějakou stopou. */
export async function stavSkolPortalu(s: Spojeni, redizo?: string[]): Promise<StavSkolyPortalu[]> {
  const r = await s.dotaz<StavSkolyPortalu>(
    `with skoly as (
       select distinct redizo from portal_role
       union select distinct redizo from portal_udalost
     )
     select k.redizo,
            sp.jmeno as spravce, sp.email as spravce_email, sp.platne_od as spravce_od,
            (select count(*)::int from portal_role e
              where e.redizo = k.redizo and e.role = 'editor' and e.zneplatneno is null) as editori,
            (select max(kdy) from portal_udalost u
              where u.redizo = k.redizo and u.typ in ('prihlaseni', 'kod_uplatnen', 'spravce_z_rejstriku', 'pozvanka_prijata')) as posledni_prihlaseni,
            (select count(*)::int from portal_udalost u where u.redizo = k.redizo and u.typ = 'navrh_odeslan') as navrhy,
            (select max(kdy) from portal_udalost u where u.redizo = k.redizo and u.typ = 'navrh_odeslan') as posledni_navrh,
            (select max(kdy) from portal_udalost u where u.redizo = k.redizo) as posledni_udalost
       from skoly k
       left join portal_role sp on sp.redizo = k.redizo and sp.role = 'spravce' and sp.zneplatneno is null
      where $1::text[] is null or k.redizo = any($1::text[])
      order by posledni_udalost desc nulls last`,
    [redizo ?? null],
  );
  return r.rows;
}

export interface UdalostPortalu {
  id: string;
  kdy: string;
  typ: string;
  detail: Record<string, unknown>;
  jmeno: string | null;
}

export async function udalostiSkoly(s: Spojeni, redizo: string): Promise<UdalostPortalu[]> {
  const r = await s.dotaz<UdalostPortalu>(
    `select u.id, u.kdy, u.typ, u.detail, r.jmeno
       from portal_udalost u left join portal_role r on r.id = u.role_id
      where u.redizo = $1 order by u.kdy desc limit 200`,
    [redizo],
  );
  return r.rows;
}
