import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { jeDbNastavena } from '@/lib/novinky-db';
import { kourovaZkouska } from '@/lib/novinky-kourova-zkouska';

// ============================================================================
// Kouřová zkouška odběru proti skutečné databázi.
//
// Proč endpoint a ne skript z notebooku: připojovací řetězec je ve Vercelu
// vedený jako tajný, takže ho lokálně nikdo nepřečte. Stejný důvod jako
// u `/api/novinky/migrace`.
//
// Spouštět po nasazení a po každé změně schématu nebo dotazů. Neposílá žádný
// e-mail a po sobě uklidí; podrobnosti jsou v `src/lib/novinky-kourova-zkouska.ts`.
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

export async function POST(request: NextRequest) {
  if (!jeOveren(request)) return NextResponse.json({ error: 'Neautorizováno.' }, { status: 401 });
  if (!jeDbNastavena()) {
    return NextResponse.json({ error: 'DATABASE_URL není nastavený.' }, { status: 503 });
  }
  const vysledek = await kourovaZkouska();
  const nesplnene = vysledek.kroky.filter((k) => !k.ok);
  if (vysledek.ok) {
    console.log(`🧪 Kouřová zkouška odběru: ${vysledek.kroky.length} kroků prošlo.`);
  } else {
    console.error(
      `❌ Kouřová zkouška odběru: ${nesplnene.length} kroků selhalo`,
      vysledek.chyba ?? '',
      nesplnene,
    );
  }
  return NextResponse.json(vysledek, { status: vysledek.ok ? 200 : 500 });
}
