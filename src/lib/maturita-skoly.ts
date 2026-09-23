import { promises as fs } from 'fs';
import path from 'path';
import { zobrazeneObdobi } from '@/lib/stav-datovych-sad';
import { jakCastoNadStredem, shrnutiMaturity, type MaturitaSkupinaRoku } from '@/lib/skola-vyklad';

/**
 * Maturitní výsledky škol, public/maturita_skoly.json (scripts/build-maturita-skoly.py).
 * Sdílí je stránka školy a přehled kraje; výklad v docs/maturitni-vysledky-a-kvalita-skoly-2027.md.
 */
export interface MaturitaSoubor {
  meta: { roky: number[]; nejnovejsi_rok: number };
  skupiny: Record<string, Record<string, { nazev: string; schools: number; medianPercentScore: number | null; medianPercentile: number | null; percentiles: number[] }>>;
  skoly: Record<string, { nazev: string; roky: Record<string, Record<string, MaturitaSkupinaRoku>> }>;
}

let maturitaCache: MaturitaSoubor | null | undefined;

async function nacti(): Promise<MaturitaSoubor | null> {
  if (maturitaCache === undefined) {
    try {
      // Cesta doslova: Next.js podle ní přibaluje soubor k funkci (PR #90).
      maturitaCache = JSON.parse(await fs.readFile(path.join(process.cwd(), 'public', 'maturita_skoly.json'), 'utf-8'));
    } catch {
      maturitaCache = null;
    }
  }
  return maturitaCache ?? null;
}

/** Maturita se zobrazí, jen když registr sadu cermat-maturita přepnul na období a soubor existuje. */
export async function maturitaSkoly(redizo: string): Promise<MaturitaSoubor['skoly'][string] & { soubor: MaturitaSoubor } | null> {
  const obdobi = await zobrazeneObdobi('cermat-maturita');
  if (!obdobi) return null;
  const soubor = await nacti();
  const skola = soubor?.skoly[redizo];
  return skola && soubor ? { ...skola, soubor } : null;
}

/** Maturita školy v jedné větě přehledu: stejná věta jako v hlavičce stránky školy. */
export interface MaturitaVPrehledu {
  rok: number;
  /** Úspěšní a přihlášení za celou školu; úspěšnost CERMAT počítá z přihlášených (slovník, úspěšnost maturity). */
  passed: number | null;
  registered: number | null;
  /** Frekvence za dostupná hodnocení skupin oborů; null, když žádné nemá zařazení. */
  jakCastoNadStredem: string | null;
}

export async function maturitaVPrehledu(redizo: string): Promise<MaturitaVPrehledu | null> {
  const m = await maturitaSkoly(redizo);
  if (!m) return null;
  const posledniRok = String(m.soubor.meta.nejnovejsi_rok);
  const cela = m.roky[posledniRok]?.CELKEM?.spolecna_cast;
  const smo16 = new Set<string>();
  Object.values(m.roky).forEach(r => Object.keys(r).forEach(k => k !== 'CELKEM' && smo16.add(k)));
  const skupiny = [...smo16].map(s => shrnutiMaturity(m.soubor.meta.roky, m.roky, s)).filter(s => s.posledni);
  const passed = typeof cela?.passed === 'number' ? cela.passed : null;
  const registered = typeof cela?.registered === 'number' && cela.registered > 0 ? cela.registered : null;
  const jakCasto = jakCastoNadStredem(skupiny);
  if (passed === null && jakCasto === null) return null;
  return { rok: Number(posledniRok), passed, registered, jakCastoNadStredem: jakCasto };
}
