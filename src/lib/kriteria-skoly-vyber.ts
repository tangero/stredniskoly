import { souhrnBodovani, type StrukturaKriterii } from './kriteria-struktura.ts';
import type { PrepisKriterii } from './prevod-testu-vypocet.ts';

// ============================================================================
// Výběr kritérií zadaných školou pro stránku oboru. Čistá funkce bez databáze,
// aby šla testovat; čtení z portálu je v kriteria-skoly-verejne.ts.
//
// Údaje školy mají přednost před strojovým přepisem PDF: škola je autorem
// kritérií a sama je v portálu potvrdila.
// ============================================================================

export interface ZaznamKriteriiSkoly {
  redizo: string;
  rok: number;
  kolo: number | null;
  rezim: 'pouze_jpz' | 'jine';
  popis: string;
  odkaz: string;
  obor_identita: { redizo: string; kkov: string; zamereni: string; forma: string; delkaStudia: number } | null;
  struktura: StrukturaKriterii | null;
}

const norm = (t: string | undefined | null) => (t ?? '').normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('cs-CZ');
/** Stránky oborů jsou jen pro denní studium (katalog „den“, DiPSy „…/denni“). */
const jeDenni = (forma: string) => /(^|\/)den/.test(norm(forma));

const NA_CO: Record<string, string> = {
  jpz_celkem: 'z jednotné přijímací zkoušky celkem',
  cjl: 'z češtiny',
  mat: 'z matematiky',
  celkem: 'celkem',
  jine: '',
};

function minimumText(m: StrukturaKriterii['minima'][number]): string {
  const hodnota = m.hodnota === null ? '' : `${m.hodnota.toLocaleString('cs-CZ')} ${m.jednotka === 'procenta' ? '%' : 'bodů'}`;
  return [hodnota && `alespoň ${hodnota}`, NA_CO[m.na_co] ?? '', m.popis].filter(Boolean).join(' ').trim();
}

/** Záznam školy v podobě přepisu, kterou umí blok kritérií na stránce oboru. */
export function prepisZeZaznamu(z: ZaznamKriteriiSkoly): PrepisKriterii {
  const s = z.struktura;
  const souhrn = s ? souhrnBodovani(s) : null;
  const vaha = s?.jpz.vyssi_vaha;
  return {
    source_id: '',
    zamereni: z.obor_identita?.zamereni ?? '',
    rezim: z.rezim,
    podil_jpz_pct: z.rezim === 'jine' ? souhrn?.podilJpzPct ?? null : 100,
    slozky: s ? s.slozky.map(x => ({ nazev: x.nazev, max: x.max })) : [],
    jpz_navic: [
      ...(vaha ? [{ nazev: `${vaha.predmet === 'mat' ? 'Matematika' : 'Čeština'} se počítá ${vaha.nasobek.toLocaleString('cs-CZ')}×`, max: null }] : []),
      ...(s?.jpz.prepoctovy_koeficient_pct != null ? [{ nazev: `Body z přijímaček se přepočítávají na ${s.jpz.prepoctovy_koeficient_pct} %`, max: null }] : []),
    ],
    minima: s ? s.minima.map(minimumText).filter(Boolean) : [],
    nejasnosti: [],
    prepis: 'skola',
    nalezy: [],
    // Starý záznam bez struktury: škola napsala jen slovní popis, složky neznáme.
    chybi_slozky: z.rezim === 'jine' && !s,
    popis: z.popis || undefined,
    odkaz: z.odkaz || undefined,
  };
}

/**
 * Kritéria, která škola zadala pro obor REDIZO_KKOV (denní studium).
 * Zaměření stránky má přednost; bez shody se berou všechna zaměření oboru.
 * Nejnovější ročník vyhrává, v něm 1. kolo před záznamem „pro všechna kola“.
 */
export function kriteriaOdSkoly(
  zaznamy: ZaznamKriteriiSkoly[], klic: string, zamereni?: string,
): { rok: number; prepisy: PrepisKriterii[] } | null {
  const [redizo, kkov] = klic.split('_');
  const oboru = zaznamy.filter(z => z.redizo === redizo && z.obor_identita
    && norm(z.obor_identita.kkov) === norm(kkov) && jeDenni(z.obor_identita.forma)
    && (z.kolo === null || z.kolo === 1));
  if (!oboru.length) return null;
  const shoda = zamereni ? oboru.filter(z => norm(z.obor_identita!.zamereni) === norm(zamereni)) : [];
  const kandidati = shoda.length ? shoda : oboru;
  const rok = Math.max(...kandidati.map(z => z.rok));
  const vRoce = kandidati.filter(z => z.rok === rok);
  // Na každé zaměření jeden záznam: 1. kolo před „všechna kola“.
  const podleZamereni = new Map<string, ZaznamKriteriiSkoly>();
  for (const z of vRoce) {
    const k = norm(z.obor_identita!.zamereni);
    const dosavadni = podleZamereni.get(k);
    if (!dosavadni || (dosavadni.kolo === null && z.kolo === 1)) podleZamereni.set(k, z);
  }
  return { rok, prepisy: [...podleZamereni.values()].map(prepisZeZaznamu) };
}
