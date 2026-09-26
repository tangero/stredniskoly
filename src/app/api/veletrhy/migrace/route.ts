import { NextRequest, NextResponse } from 'next/server';
import { dotaz, jeDbNastavena, vTransakci } from '@/lib/novinky-db';
import { MIGRACE_VELETRHU, TABULKY_VELETRHU } from '@/lib/veletrhy-schema';
import { seed } from '@/lib/veletrhy-sklad';
import { jeTokenPlatny } from '@/lib/veletrhy-api';
import { SEZONA, snimekAkci } from '@/lib/veletrhy';
import { obnovVeletrhy } from '@/lib/veletrhy-zdroj';

// ============================================================================
// Migrace a seed veletrhů z nasazené aplikace, stejně jako novinky/migrace:
// DATABASE_URL je ve Vercelu tajný a náhledové databáze vznikají prázdné.
//
// GET  = stav tabulek a počet akcí, nic nemění.
// POST = migrace (`if not exists`); s ?seed=1 i vložení akcí ze snímku JSON
//        (`on conflict do nothing`: existující akce nepřepíše).
//
// Chráněno `CRON_SECRET`.
// ============================================================================

export const dynamic = 'force-dynamic';

function jeOveren(request: NextRequest): boolean {
  const dodany = (request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  return jeTokenPlatny(dodany, process.env.CRON_SECRET);
}

async function stav() {
  const r = await dotaz<{ table_name: string }>(
    `select table_name from information_schema.tables
      where table_schema = 'public' and table_name = any($1::text[]) order by table_name`,
    [[...TABULKY_VELETRHU]],
  );
  const existuji = r.rows.map((x) => x.table_name);
  const akci = existuji.includes('veletrh_akce')
    ? (await dotaz<{ pocet: number }>('select count(*)::int as pocet from veletrh_akce where not smazano')).rows[0]?.pocet ?? 0
    : null;
  return { existuji, chybi: TABULKY_VELETRHU.filter((t) => !existuji.includes(t)), akci };
}

export async function GET(request: NextRequest) {
  if (!jeOveren(request)) return NextResponse.json({ error: 'Neautorizováno.' }, { status: 401 });
  if (!jeDbNastavena()) return NextResponse.json({ error: 'DATABASE_URL není nastavený.' }, { status: 503 });
  try {
    return NextResponse.json({ stav: await stav() });
  } catch (e) {
    console.error('❌ Veletrhy: stav migrace', e);
    return NextResponse.json({ error: 'Databáze neodpověděla.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!jeOveren(request)) return NextResponse.json({ error: 'Neautorizováno.' }, { status: 401 });
  if (!jeDbNastavena()) return NextResponse.json({ error: 'DATABASE_URL není nastavený.' }, { status: 503 });
  try {
    const pred = await stav();
    const vlozeno = await vTransakci(async (s) => {
      for (const prikaz of MIGRACE_VELETRHU) await s.dotaz(prikaz);
      return request.nextUrl.searchParams.get('seed') === '1' ? seed(s, snimekAkci(), SEZONA) : null;
    });
    if (vlozeno) obnovVeletrhy();
    return NextResponse.json({ prikazu: MIGRACE_VELETRHU.length, seed: vlozeno, pred, po: await stav() });
  } catch (e) {
    console.error('❌ Veletrhy: migrace selhala', e);
    return NextResponse.json({ error: 'Migrace selhala, podrobnosti v logu.' }, { status: 500 });
  }
}
