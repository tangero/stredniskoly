import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { dotaz, jeDbNastavena, vTransakci } from '@/lib/novinky-db';
import { MIGRACE_NOVINEK, TABULKY_NOVINEK } from '@/lib/novinky-schema';

// ============================================================================
// Spuštění migrace odběru z nasazené aplikace.
//
// Proč endpoint a ne skript z notebooku: připojovací řetězec k databázi je ve
// Vercelu vedený jako tajný, takže ho lokálně nikdo nepřečte. Navíc každá
// náhledová databáze vzniká prázdná a taky potřebuje migraci.
//
// GET  = jen stav tabulek, nic nemění.
// POST = spustí migraci. Všechny příkazy jsou `if not exists`, takže opakované
//        spuštění nic nepřepíše a nic nesmaže.
//
// Chráněno stejným tajemstvím jako cron odesílače (`CRON_SECRET`).
// ============================================================================

function jeOveren(request: NextRequest): boolean {
  const ocekavany = process.env.CRON_SECRET;
  if (!ocekavany) return false;
  const dodany = (request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  const a = Buffer.from(dodany);
  const b = Buffer.from(ocekavany);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Které z potřebných tabulek v databázi existují a co dalšího v ní leží. */
async function stavTabulek(): Promise<{
  existuji: string[];
  chybi: string[];
  dalsiTabulkyVPublic: number;
}> {
  const nase = await dotaz<{ table_name: string }>(
    `select table_name from information_schema.tables
      where table_schema = 'public' and table_name = any($1::text[])
      order by table_name`,
    [[...TABULKY_NOVINEK]],
  );
  const existuji = nase.rows.map((r) => r.table_name);
  const ostatni = await dotaz<{ pocet: number }>(
    `select count(*)::int as pocet from information_schema.tables
      where table_schema = 'public' and table_name <> all($1::text[])`,
    [[...TABULKY_NOVINEK]],
  );
  return {
    existuji,
    chybi: TABULKY_NOVINEK.filter((t) => !existuji.includes(t)),
    dalsiTabulkyVPublic: ostatni.rows[0]?.pocet ?? 0,
  };
}

export async function GET(request: NextRequest) {
  if (!jeOveren(request)) return NextResponse.json({ error: 'Neautorizováno.' }, { status: 401 });
  if (!jeDbNastavena()) {
    return NextResponse.json({ error: 'DATABASE_URL není nastavený.' }, { status: 503 });
  }
  try {
    return NextResponse.json({ stav: await stavTabulek() });
  } catch (chyba) {
    console.error('❌ Stav migrace nelze zjistit:', chyba);
    return NextResponse.json({ error: 'Databáze neodpověděla.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!jeOveren(request)) return NextResponse.json({ error: 'Neautorizováno.' }, { status: 401 });
  if (!jeDbNastavena()) {
    return NextResponse.json({ error: 'DATABASE_URL není nastavený.' }, { status: 503 });
  }
  try {
    const pred = await stavTabulek();
    await vTransakci(async (s) => {
      for (const prikaz of MIGRACE_NOVINEK) {
        await s.dotaz(prikaz);
      }
    });
    const po = await stavTabulek();
    console.log(`🗄️ Migrace odběru: tabulek před ${pred.existuji.length}, po ${po.existuji.length}`);
    return NextResponse.json({ prikazu: MIGRACE_NOVINEK.length, pred, po });
  } catch (chyba) {
    console.error('❌ Migrace odběru selhala:', chyba);
    return NextResponse.json({ error: 'Migrace selhala, podrobnosti v logu.' }, { status: 500 });
  }
}
