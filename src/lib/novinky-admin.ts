import { dotaz } from '@/lib/novinky-db';

// ============================================================================
// Přehled odběrů podle zdroje a týdne pro administraci (#523, E1).
//
// Jen počty, bez adres: doklad souhlasu drží otisk adresy a tady se čte jen
// zdroj a dvě data. „Odhlášeno“ je odběr, který po potvrzení zanikl; počítá se
// do týdne původního potvrzení, ne do týdne odhlášení.
// ============================================================================

export interface RadekZdroje {
  /** Pondělí týdne potvrzení, RRRR-MM-DD. */
  tyden: string;
  zdroj: string;
  potvrzeno: number;
  odhlaseno: number;
}

export async function odberyPodleZdroje(tydnu = 12): Promise<RadekZdroje[]> {
  const v = await dotaz<{ tyden: string; zdroj: string; potvrzeno: string; odhlaseno: string }>(
    `select to_char(date_trunc('week', potvrzeno), 'YYYY-MM-DD') as tyden,
            zdroj,
            count(*) as potvrzeno,
            count(zaniklo) as odhlaseno
       from doklad_souhlasu
      where potvrzeno >= date_trunc('week', now()) - make_interval(weeks => $1::int - 1)
      group by 1, 2
      order by 1 desc, 3 desc, 2`,
    [tydnu],
  );
  return v.rows.map((r) => ({
    tyden: r.tyden,
    zdroj: r.zdroj,
    potvrzeno: Number(r.potvrzeno),
    odhlaseno: Number(r.odhlaseno),
  }));
}
