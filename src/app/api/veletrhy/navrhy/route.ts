import { NextRequest, NextResponse } from 'next/server';
import { dotaz, vTransakci } from '@/lib/novinky-db';
import { overEdu, chyba } from '@/lib/veletrhy-api';
import { jeVyhrazenyKlic, navrhy, rozhodni, stavAkci, zalozNavrh, type StavNavrhu } from '@/lib/veletrhy-sklad';
import { jeAutopublikaceZapnuta, jeKAutopublikaci, jeUrlPlatna, overNavrh } from '@/lib/veletrhy-validace';
import { obnovVeletrhy } from '@/lib/veletrhy-zdroj';
import { SEZONA } from '@/lib/veletrhy';
import { posliKeSchvaleni } from '@/lib/veletrhy-schvaleni';
import { posliTelegram } from '@/lib/portal-oznameni';
import { cesskyDen } from '@/lib/veletrhy-pocty';

// ============================================================================
// Návrhy změn veletrhů od Eduardy (docs/veletrhy-api-2027.md, oddíl 4).
//
// Návrh se nezveřejňuje: čeká, až ho člověk schválí odkazem z e-mailu.
// Hlavička Idempotency-Key je povinná; opakování se stejným klíčem vrátí
// původní návrh. `?nanecisto=1` jen ověří a vrátí diff.
// ============================================================================

export const dynamic = 'force-dynamic';

const MAX_TELO = 64 * 1024;

const STAVY: StavNavrhu[] = ['ceka', 'schvaleno', 'provedeno', 'zamitnuto', 'stazeno'];

function text(h: unknown, max: number): string | null {
  return typeof h === 'string' && h.trim() ? h.trim().slice(0, max) : null;
}

export async function POST(request: NextRequest) {
  const odmitnuti = overEdu(request, 'navrh');
  if (odmitnuti) return odmitnuti;

  // Dvacet operací se vejde do pár desítek kB; větší tělo je chyba nebo útok.
  if (Number(request.headers.get('content-length') ?? 0) > MAX_TELO) return chyba(413, 'Tělo je příliš velké.');
  let telo: Record<string, unknown>;
  try {
    const surove = await request.text();
    if (surove.length > MAX_TELO) return chyba(413, 'Tělo je příliš velké.');
    const r: unknown = JSON.parse(surove);
    if (r === null || typeof r !== 'object' || Array.isArray(r)) return chyba(400, 'Tělo musí být objekt.');
    telo = r as Record<string, unknown>;
  } catch {
    return chyba(400, 'Neplatný JSON.');
  }
  const neznama = Object.keys(telo).filter((k) => !['operace', 'zdrojUrl', 'zdrojEmail', 'poznamka', 'nahlaseniId'].includes(k));
  if (neznama.length) return chyba(400, 'Neznámá pole.', { chyby: neznama.map((pole) => ({ pole, zprava: 'Neznámé pole.' })) });

  if (telo.zdrojUrl !== undefined && telo.zdrojUrl !== null && (typeof telo.zdrojUrl !== 'string' || !jeUrlPlatna(telo.zdrojUrl))) {
    return chyba(400, 'Návrh neprošel.', { chyby: [{ pole: 'zdrojUrl', zprava: 'Neplatná adresa (http/https, nejvýš 500 znaků).' }] });
  }

  const dnes = cesskyDen();
  try {
    if (request.nextUrl.searchParams.get('nanecisto') === '1') {
      const v = overNavrh(telo.operace, await stavAkci({ dotaz }), dnes);
      if (v.chyby.length) return chyba(v.konflikt ? 409 : 400, 'Návrh neprošel.', { chyby: v.chyby, varovani: v.varovani });
      return NextResponse.json({ platne: true, varovani: v.varovani, diff: v.diff });
    }

    const klic = (request.headers.get('idempotency-key') ?? '').trim();
    if (!klic || klic.length > 200) return chyba(400, 'Chybí hlavička Idempotency-Key (nejvýš 200 znaků).');
    if (jeVyhrazenyKlic(klic)) return chyba(400, 'Klíč s předponou „vraceni:“ je vyhrazený.');

    const nahlaseniId = Number.isInteger(telo.nahlaseniId) ? (telo.nahlaseniId as number) : null;
    const v = await vTransakci((s) =>
      zalozNavrh(s, {
        klic,
        autor: 'eduarda',
        operace: telo.operace,
        zdrojUrl: text(telo.zdrojUrl, 500),
        zdrojEmail: text(telo.zdrojEmail, 1000),
        poznamka: text(telo.poznamka, 2000),
        nahlaseniId,
      }, dnes),
    );

    if (v.vysledek === 'limit') {
      return chyba(429, 'Na rozhodnutí čeká příliš mnoho návrhů.', {}, { 'Retry-After': '3600' });
    }
    if (v.vysledek === 'neplatny') {
      return chyba(v.validace.konflikt ? 409 : 400, 'Návrh neprošel.', { chyby: v.validace.chyby, varovani: v.validace.varovani });
    }
    if (v.vysledek === 'existuje') {
      return NextResponse.json({ id: v.navrh.id, stav: v.navrh.stav, varovani: v.navrh.varovani, opakovani: true });
    }

    // Automatické zveřejnění (výchozí vypnuto): jen úprava odkazu nebo času
    // potvrzené akce bez varování. Člověk dostane oznámení s odkazem na vrácení.
    if (jeAutopublikaceZapnuta() && jeKAutopublikaci(v.diff, v.navrh.varovani)) {
      // Selhání automatiky nesmí nechat návrh bez oznámení: pokračuje se
      // obvyklou cestou ke schválení člověkem.
      const r = await vTransakci((s) => rozhodni(s, v.navrh.id, { schvalit: true, kdo: 'auto', duvod: 'automatické zveřejnění' }, dnes, SEZONA))
        .catch((e) => {
          console.error('❌ Veletrhy: automatické zveřejnění selhalo, jde ke schválení', e);
          return null;
        });
      if (r?.vysledek === 'provedeno') {
        obnovVeletrhy();
        await posliKeSchvaleni(r.navrh, r.diff, [], true);
        await posliTelegram(`⚡ Veletrhy zveřejněno automaticky: ${r.diff.map((z) => `${z.op} ${z.id}`).join(', ')}`);
        return NextResponse.json({ id: r.navrh.id, stav: r.navrh.stav, varovani: [], diff: r.diff, automaticky: true }, { status: 201 });
      }
    }

    const odeslano = await posliKeSchvaleni(v.navrh, v.diff, v.navrh.varovani);
    await posliTelegram(`🗓 Nový návrh veletrhu: ${v.diff.map((z) => `${z.op} ${z.id}`).join(', ')}${odeslano ? '' : ' (schvalovací e-mail neodešel, rozhodni v /admin)'}`);
    return NextResponse.json(
      { id: v.navrh.id, stav: v.navrh.stav, varovani: v.navrh.varovani, diff: v.diff },
      { status: 201 },
    );
  } catch (e) {
    console.error('❌ Veletrhy API: založení návrhu', e);
    return chyba(500, 'Návrh se nepodařilo uložit.');
  }
}

export async function GET(request: NextRequest) {
  const odmitnuti = overEdu(request, 'cteni');
  if (odmitnuti) return odmitnuti;
  const stav = request.nextUrl.searchParams.get('stav');
  if (stav && !STAVY.includes(stav as StavNavrhu)) return chyba(400, 'Neznámý stav.');
  try {
    const seznam = await navrhy({ dotaz }, stav ? [stav as StavNavrhu] : STAVY);
    return NextResponse.json({ navrhy: seznam.filter((n) => n.autor === 'eduarda') });
  } catch (e) {
    console.error('❌ Veletrhy API: seznam návrhů', e);
    return chyba(500, 'Databáze neodpověděla.');
  }
}
