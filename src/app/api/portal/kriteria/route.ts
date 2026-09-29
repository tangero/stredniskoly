import { NextRequest, NextResponse } from 'next/server';
import { jeDbNastavena, vTransakci } from '@/lib/novinky-db';
import { jeNasPuvod, prihlasenyZPozadavku } from '@/lib/portal-relace';
import { oboryProKriteria, overZadani, rokyKriterii, zapisKriteria } from '@/lib/portal-kriteria';

export async function POST(request: NextRequest) {
  if (!jeNasPuvod(request)) return NextResponse.json({ error: 'Požadavek nepřišel z našeho webu.' }, { status: 403 });
  if (!jeDbNastavena()) return NextResponse.json({ error: 'Portál není nakonfigurován.' }, { status: 503 });
  const prihlaseny = await prihlasenyZPozadavku(request);
  if (!prihlaseny) return NextResponse.json({ error: 'Přihlášení vypršelo.' }, { status: 401 });
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; }
  catch { return NextResponse.json({ error: 'Neplatná data.' }, { status: 400 }); }
  if (!body || typeof body !== 'object' || Array.isArray(body))
    return NextResponse.json({ error: 'Neplatný formát dat.' }, { status: 400 });
  const { roky } = await rokyKriterii();
  const validated = overZadani(body, roky);
  if (!validated.ok) return NextResponse.json({ error: validated.error }, { status: 400 });
  const z = validated.value;
  const redizo = typeof body.redizo === 'string' ? body.redizo : '';
  const role = prihlaseny.role.find((r) => r.redizo === redizo);
  if (!role) return NextResponse.json({ error: 'K této škole nemáte přístup.' }, { status: 403 });

  // Plánovaný obor z místního katalogu ověříme bez čekání na DiPSy.
  // Aktuální kartu voláme jen pro údaje, které místní katalog neobsahuje.
  const mistni = await oboryProKriteria(redizo, z.rok, { online: false });
  const hledat = (obory: typeof mistni) => obory.find((o) => o.klic === z.oborKlic &&
    o.podkladRok === body.podkladRok && o.zdrojId === body.zdrojId);
  const obor = body.zdrojTyp === 'katalog'
    ? hledat(mistni)
    : body.zdrojTyp === 'dipsy'
      ? hledat((await oboryProKriteria(redizo, z.rok)).filter((o) => o.zdrojTyp === 'dipsy'))
      : undefined;
  if (!obor) return NextResponse.json({ error: 'Obor není v nabídce školy pro tento ročník.' }, { status: 400 });
  // Konání JPZ známe jen z karty DiPSy; u oboru z katalogu je neznámé a škola ho potvrzuje zadáním.
  if (obor.konaJPZ === false && (z.rezim === 'pouze_jpz' || (z.struktura.jpz.cjl_max ?? 0) > 0 || (z.struktura.jpz.mat_max ?? 0) > 0))
    return NextResponse.json({ error: 'U tohoto oboru se jednotná přijímací zkouška nekoná. Maxima JPZ nastavte na 0 a zadejte, co se boduje, do dalších bodů.' }, { status: 400 });
  try {
    const saved = await vTransakci((s) => zapisKriteria(s, {
      ...z,
      redizo,
      podkladRok: obor.podkladRok,
      oborIdentita: {
        redizo: obor.redizo, izo: obor.izo, kkov: obor.kkov, zamereni: obor.zamereni,
        forma: obor.forma, delkaStudia: obor.delkaStudia, zdrojId: obor.zdrojId, podkladRok: obor.podkladRok,
      },
      roleId: role.id,
    }));
    return NextResponse.json({ ok: true, kriterium: saved });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Údaj se mezitím změnil'))
      return NextResponse.json({ error: error.message }, { status: 409 });
    console.error('Portál: zápis kritérií selhal', error);
    return NextResponse.json({ error: 'Kritéria se nepodařilo uložit.' }, { status: 500 });
  }
}
