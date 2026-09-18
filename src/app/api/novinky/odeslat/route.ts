import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { jeDbNastavena } from '@/lib/novinky-db';
import { jeResendNastaven } from '@/lib/novinky-email';
import {
  dokonciUcinkyWebhooku,
  nactiZpravy,
  obnovUviznute,
  uklidOdesilace,
  zajistiRozpocet,
  zpracujZpravu,
} from '@/lib/novinky-odesilac';
import { dovezServisni } from '@/lib/novinky-servisni';
import { uklid } from '@/lib/novinky-odber';
import { denniObdobi, kvotaTarifu, limitRozpoctu, mesicniObdobi } from '@/lib/novinky-rozpocet';
import { zobrazeneObdobi } from '@/lib/stav-datovych-sad';

// ============================================================================
// Odesílač jako Vercel Cron (docs/novinky-k-prijimackam-2027.md, krok 6).
//
// Běh: nastaví strop rozpočtu, dokončí uvíznutou práci, projde splatné zprávy
// z manifestu na nasazeném webu a nakonec uklidí prošlé žádosti a těla dávek.
//
// `?nanecisto=1` jen vypíše, co by běh udělal, a nic neodešle.
// ============================================================================

function jeCronOveren(request: NextRequest): boolean {
  const ocekavany = process.env.CRON_SECRET;
  if (!ocekavany) return false;
  const hlavicka = request.headers.get('authorization') ?? '';
  const dodany = hlavicka.replace(/^Bearer\s+/i, '');
  const a = Buffer.from(dodany);
  const b = Buffer.from(ocekavany);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: NextRequest) {
  if (!jeCronOveren(request)) {
    return NextResponse.json({ error: 'Neautorizováno.' }, { status: 401 });
  }
  if (!jeDbNastavena() || !jeResendNastaven() || !process.env.NOVINKY_SECRET) {
    return NextResponse.json({ error: 'Odběr novinek není nakonfigurován.' }, { status: 503 });
  }

  const nanecisto = request.nextUrl.searchParams.get('nanecisto') === '1';
  const kdy = new Date();
  // Ročník se bere z registru stavu datových sad, nikdy z letopočtu v kódu.
  const rocnik = (await zobrazeneObdobi('msmt-harmonogram')) ?? null;
  if (!rocnik) {
    return NextResponse.json({ error: 'Registr nezná období sady msmt-harmonogram.' }, { status: 500 });
  }

  const kvota = kvotaTarifu();
  const base = `https://${request.headers.get('host') ?? 'www.prijimackynaskolu.cz'}`;

  try {
    // Řádky zakládá i rezervace sama; tady se zajistí předem, aby byl strop
    // vidět v rozpočtu ještě před prvním odesláním.
    await zajistiRozpocet(mesicniObdobi(kdy), 'celkem', limitRozpoctu('celkem'));
    await zajistiRozpocet(denniObdobi(kdy), 'potvrzeni', limitRozpoctu('potvrzeni'));

    const zpravy = await nactiZpravy(base, rocnik);
    const den = kdy.toISOString().slice(0, 10);
    const splatne = zpravy.filter((z) => z.splatnost <= den && z.konec_uzitecnosti >= den);

    if (nanecisto) {
      return NextResponse.json({
        nanecisto: true,
        rocnik,
        zprav_v_manifestu: zpravy.length,
        splatne: splatne.map((z) => ({ zprava: z.zprava, predmet: z.predmet })),
      });
    }

    const obnova = await obnovUviznute(kdy);
    // Potvrzení a uvítání, která inline odeslání nestihla. Musí jít dřív než
    // obsahové zprávy: bez potvrzení propadne žádost za 72 hodin.
    const servisni = await dovezServisni(rocnik, kdy);
    const ucinky = await dokonciUcinkyWebhooku();
    const vysledky = [];
    for (const z of splatne) {
      vysledky.push(await zpracujZpravu(z, base, kdy));
    }
    const uklidZadosti = await uklid();
    const uklidTel = await uklidOdesilace(kdy);

    const souhrn = {
      rocnik,
      obnova,
      servisni,
      ucinkyWebhooku: ucinky,
      vysledky,
      uklid: { ...uklidZadosti, ...uklidTel },
    };
    console.log('✉️ Běh odesílače novinek:', JSON.stringify(souhrn));
    return NextResponse.json(souhrn);
  } catch (chyba) {
    console.error('❌ Běh odesílače novinek selhal:', chyba);
    return NextResponse.json({ error: 'Běh selhal, podrobnosti v logu.' }, { status: 500 });
  }
}
