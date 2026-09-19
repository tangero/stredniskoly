import { NextRequest, NextResponse } from 'next/server';
import { getAllSchools } from '@/lib/data';
import { extractRedizo } from '@/lib/utils';
import { profilSpravujeText, vsichniVerejniSpravci } from '@/lib/portal-verejne';

// ============================================================================
// Vyhledání školy na /pro-skoly se stavem profilu (docs/ucty-portalu-skol-2027.md, 3):
// kdo profil spravuje, nebo výzva, že se škola zatím nepřihlásila.
// ============================================================================

const bezDiakritiky = (text: string) =>
  text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

let rejstrik: { redizo: string; nazev: string; obec: string; hledat: string }[] | null = null;

async function skoly() {
  if (!rejstrik) {
    const podleRedizo = new Map<string, { redizo: string; nazev: string; obec: string; hledat: string }>();
    for (const s of await getAllSchools()) {
      // Záznamy school_analysis.json pole redizo nenesou, jen id REDIZO_KKOV.
      const redizo = extractRedizo(s.id);
      if (!redizo || podleRedizo.has(redizo)) continue;
      podleRedizo.set(redizo, {
        redizo,
        nazev: s.nazev,
        obec: s.obec,
        hledat: bezDiakritiky(`${s.nazev} ${s.obec} ${redizo}`),
      });
    }
    rejstrik = [...podleRedizo.values()];
  }
  return rejstrik;
}

export async function GET(request: NextRequest) {
  const q = bezDiakritiky(request.nextUrl.searchParams.get('q') ?? '').trim();
  if (q.length < 3) return NextResponse.json({ skoly: [] });
  const slova = q.split(/\s+/);
  const nalezene = (await skoly()).filter((s) => slova.every((w) => s.hledat.includes(w))).slice(0, 8);
  const spravci = await vsichniVerejniSpravci();
  return NextResponse.json({
    skoly: nalezene.map((s) => ({
      redizo: s.redizo,
      nazev: s.nazev,
      obec: s.obec,
      spravuje: spravci[s.redizo] ? profilSpravujeText(spravci[s.redizo]) : null,
    })),
  });
}
