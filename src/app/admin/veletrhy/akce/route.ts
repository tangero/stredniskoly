import { NextRequest, NextResponse } from 'next/server';
import { overAdminToken } from '@/lib/admin';
import { jeDbNastavena, vTransakci } from '@/lib/novinky-db';
import { jeNasPuvod } from '@/lib/portal-relace';
import { posliTelegram } from '@/lib/portal-oznameni';
import { rozhodni } from '@/lib/veletrhy-sklad';
import { navrhZTokenu } from '@/lib/veletrhy-schvaleni';
import { obnovVeletrhy } from '@/lib/veletrhy-zdroj';
import { SEZONA } from '@/lib/veletrhy';
import { cesskyDen } from '@/lib/veletrhy-pocty';

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

  const zpet = (parametr: 'ok' | 'chyba', text: string) => {
    const cil = new URL('/admin/veletrhy/rozhodnuti', request.url);
    if (t) cil.searchParams.set('t', t);
    else cil.searchParams.set('id', navrhId);
    cil.searchParams.set(parametr, text);
    return NextResponse.redirect(cil, 303);
  };

  if (!jeDbNastavena()) return zpet('chyba', 'Databáze není nastavena.');
  const akce = pole('akce');
  const duvod = pole('duvod').slice(0, 1000) || null;
  if (akce !== 'schvalit' && akce !== 'zamitnout') return zpet('chyba', 'Neznámá akce.');
  if (akce === 'zamitnout' && !duvod) return zpet('chyba', 'Zamítnutí musí mít důvod.');

  try {
    const v = await vTransakci((s) =>
      rozhodni(s, navrhId, { schvalit: akce === 'schvalit', kdo: t ? KDO_ODKAZ : KDO_ADMIN, duvod }, cesskyDen(), SEZONA),
    );
    switch (v.vysledek) {
      case 'nenalezen':
        return zpet('chyba', 'Návrh neexistuje.');
      case 'uz_rozhodnuto':
        return zpet('ok', 'O návrhu už bylo rozhodnuto, nic se nezměnilo.');
      case 'nelze_provest':
        await posliTelegram(`⚠️ Návrh veletrhu schválen, ale nejde provést: ${v.navrh.chyba}`);
        return zpet('chyba', 'Návrh proti dnešnímu stavu neprošel, nic se nezměnilo. Zamítněte ho, Eduarda pošle nový.');
      case 'zamitnuto':
        return zpet('ok', 'Návrh zamítnut.');
      case 'provedeno':
        obnovVeletrhy();
        await posliTelegram(`✅ Veletrhy: provedeno ${v.diff.map((z) => `${z.op} ${z.id}`).join(', ')}`);
        return zpet('ok', 'Provedeno. Změna je na webu do pár minut.');
    }
  } catch (e) {
    console.error('❌ Veletrhy: rozhodnutí o návrhu', e);
    return zpet('chyba', 'Rozhodnutí selhalo, podrobnosti jsou v logu.');
  }
}
