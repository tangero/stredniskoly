import { NextRequest, NextResponse } from 'next/server';
import { overAdminToken } from '@/lib/admin';
import { jeDbNastavena, vTransakci } from '@/lib/novinky-db';
import { jeNasPuvod } from '@/lib/portal-relace';
import { posliTelegram } from '@/lib/portal-oznameni';
import { rozhodni, vratNavrh } from '@/lib/veletrhy-sklad';
import { navrhZTokenu } from '@/lib/veletrhy-schvaleni';
import { obnovVeletrhy } from '@/lib/veletrhy-zdroj';
import { SEZONA } from '@/lib/veletrhy';
import { cesskyDen } from '@/lib/veletrhy-pocty';
import type { KodVysledku } from '@/lib/veletrhy-schvaleni';

// ============================================================================
// Schválení nebo zamítnutí návrhu změny veletrhů (docs/veletrhy-api-2027.md,
// oddíl 4.3). Oprávnění dává buď podepsaný token z e-mailu (pole `t`),
// nebo cookie admin_token (pole `id`). Token Eduardy sem nemá přístup.
// Leží pod /admin, aby dostal cookie (path /admin).
// ============================================================================

const KDO_ADMIN = 'admin:zandl';
const KDO_ODKAZ = 'odkaz:schvalovatel';

export async function POST(request: NextRequest) {
  if (!jeNasPuvod(request)) return new NextResponse('Špatný původ požadavku.', { status: 403 });
  const f = await request.formData();
  const pole = (k: string) => String(f.get(k) ?? '').trim();

  const t = pole('t');
  const jeAdmin = overAdminToken(request.cookies.get('admin_token')?.value);
  const navrhId = t ? navrhZTokenu(t) : jeAdmin ? pole('id') : null;
  if (!navrhId) return new NextResponse('Not found', { status: 404 });

  // Výsledek jde zpět jako kód, text si stránka vezme z mapy: volný text
  // v adrese by šel podstrčit odkazem. Admin s cookie se vrací na ?id=,
  // aby token z e-mailu nezůstával v historii prohlížeče.
  const zpet = (kod: KodVysledku) => {
    const cil = new URL('/admin/veletrhy/rozhodnuti', request.url);
    if (t && !jeAdmin) cil.searchParams.set('t', t);
    else cil.searchParams.set('id', navrhId);
    cil.searchParams.set('v', kod);
    return NextResponse.redirect(cil, 303);
  };

  if (!jeDbNastavena()) return zpet('bez-db');
  const akce = pole('akce');
  const duvod = pole('duvod').slice(0, 1000) || null;
  if (akce !== 'schvalit' && akce !== 'zamitnout' && akce !== 'vratit') return zpet('neznama-akce');
  if ((akce === 'zamitnout' || akce === 'vratit') && !duvod) return zpet('chybi-duvod');

  if (akce === 'vratit') {
    try {
      const r = await vTransakci((s) => vratNavrh(s, navrhId, jeAdmin ? KDO_ADMIN : KDO_ODKAZ, duvod!));
      if (r.vysledek === 'nenalezen') return zpet('nenalezen');
      if (r.vysledek === 'uz_vraceno') return zpet('uz-vraceno');
      if (r.vysledek === 'nelze_vratit') return zpet('nelze-vratit');
      obnovVeletrhy();
      await posliTelegram(`↩️ Veletrhy: vráceno ${r.akce.join(', ')} – ${duvod}`);
      return zpet('vraceno');
    } catch (e) {
      console.error('❌ Veletrhy: vrácení návrhu', e);
      return zpet('selhalo');
    }
  }

  try {
    const v = await vTransakci((s) =>
      rozhodni(s, navrhId, { schvalit: akce === 'schvalit', kdo: jeAdmin ? KDO_ADMIN : KDO_ODKAZ, duvod }, cesskyDen(), SEZONA),
    );
    switch (v.vysledek) {
      case 'nenalezen':
        return zpet('nenalezen');
      case 'uz_rozhodnuto':
        return zpet('uz-rozhodnuto');
      case 'nelze_provest':
        await posliTelegram(`⚠️ Návrh veletrhu schválen, ale nejde provést: ${v.navrh.chyba}`);
        return zpet('nelze-provest');
      case 'zamitnuto':
        return zpet('zamitnuto');
      case 'provedeno':
        obnovVeletrhy();
        await posliTelegram(`✅ Veletrhy: provedeno ${v.diff.map((z) => `${z.op} ${z.id}`).join(', ')}`);
        return zpet('provedeno');
    }
  } catch (e) {
    console.error('❌ Veletrhy: rozhodnutí o návrhu', e);
    return zpet('selhalo');
  }
}
