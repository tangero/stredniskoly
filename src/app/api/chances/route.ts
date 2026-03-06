import { NextRequest, NextResponse } from 'next/server';
import { getSchools2026Data, getChancesData, getAllSchools } from '@/lib/data';
import { createSlug } from '@/lib/utils';

/**
 * GET /api/chances?search=...
 * Vyhledává školy pro kalkulačku šancí (data 2026)
 */
export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams.get('search') || '';
  const id = request.nextUrl.searchParams.get('id');
  const delka = request.nextUrl.searchParams.get('delka');

  // Pokud je zadáno ID, vrátit detailní data pro kalkulačku
  if (id) {
    const chancesData = await getChancesData(id);
    if (!chancesData || !chancesData.data2026) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    const allSchools = await getAllSchools();
    const school = allSchools.find(s => {
      const baseId = s.id.split('_').slice(0, 2).join('_');
      const queryBase = id.split('_').slice(0, 2).join('_');
      return baseId === queryBase;
    });

    const slug = school
      ? `${school.id.split('_')[0]}-${createSlug(school.nazev, school.obor)}`
      : '';

    return NextResponse.json({
      id: chancesData.data2026.id,
      slug,
      nazev: chancesData.data2026.nazev,
      nazev_display: chancesData.data2026.nazev_display,
      obor: chancesData.data2026.obor,
      zamereni: chancesData.data2026.zamereni,
      obec: chancesData.data2026.obec,
      kraj: chancesData.data2026.kraj,
      typ: chancesData.data2026.typ,
      delka_studia: chancesData.data2026.delka_studia,
      // Data 2026
      kapacita_2026: chancesData.data2026.kapacita,
      prihlasky_2026: chancesData.data2026.prihlasky,
      prihlasky_priority_2026: chancesData.data2026.prihlasky_priority,
      index_poptavky_2026: chancesData.data2026.index_poptavky,
      // Data 2025
      kapacita_2025: chancesData.data2025?.kapacita || 0,
      prihlasky_2025: chancesData.data2025?.prihlasky || 0,
      prijati_2025: chancesData.data2025?.prijati || 0,
      min_body_2025: Math.round((chancesData.data2025?.min_body || 0) / 2),
      prumer_body_2025: Math.round(((chancesData.data2025?.cj_prumer || 0) + (chancesData.data2025?.ma_prumer || 0)) / 2),
      index_poptavky_2025: chancesData.data2025?.index_poptavky || 0,
      prihlasky_priority_2025: chancesData.data2025?.prihlasky_priority,
      prijati_priority_2025: chancesData.data2025?.prijati_priority,
      // Data 2024
      kapacita_2024: chancesData.data2024?.kapacita,
      prihlasky_2024: chancesData.data2024?.prihlasky,
      prijati_2024: chancesData.data2024?.prijati,
      min_body_2024: chancesData.data2024 ? Math.round((chancesData.data2024.min_body || 0) / 2) : undefined,
      index_poptavky_2024: chancesData.data2024?.index_poptavky,
    });
  }

  // Vyhledávání škol
  if (search.length < 2) {
    return NextResponse.json([]);
  }

  const schools2026 = await getSchools2026Data();
  const allSchools = await getAllSchools();

  // Normalizovat hledaný text
  const normalizedSearch = search
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  // Filtrovat školy
  const delkaNum = delka ? parseInt(delka, 10) : null;

  const results = schools2026
    .filter(s => {
      // Filtr délky studia
      if (delkaNum && s.delka_studia !== delkaNum) return false;
      const text = `${s.nazev} ${s.nazev_display} ${s.obor} ${s.zamereni} ${s.obec}`
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      return text.includes(normalizedSearch);
    })
    .slice(0, 15)
    .map(s => {
      // Najít slug
      const school = allSchools.find(as => {
        const baseId = as.id.split('_').slice(0, 2).join('_');
        const searchBase = s.id.split('_').slice(0, 2).join('_');
        return baseId === searchBase;
      });
      const slug = school
        ? `${school.id.split('_')[0]}-${createSlug(school.nazev, school.obor)}`
        : '';

      return {
        id: s.id,
        slug,
        nazev: s.nazev,
        nazev_display: s.nazev_display,
        obor: s.obor,
        zamereni: s.zamereni,
        obec: s.obec,
        kraj: s.kraj,
        typ: s.typ,
        delka_studia: s.delka_studia,
        kapacita: s.kapacita,
        prihlasky: s.prihlasky,
        index_poptavky: s.index_poptavky,
      };
    });

  return NextResponse.json(results);
}
