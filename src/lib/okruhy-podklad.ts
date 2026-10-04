/**
 * Podklad pro popis oborů v okruzích, sdílený stránkou města a stránkou oboru: záznamy katalogu,
 * názvy škol s ulicí, názvy škol ze school_analysis.json (adresa přehledu školy) a obtížnost přijetí
 * ze souhrnů 1. kola. Ročníky katalogu i souhrnů určuje registr.
 */
import { getSchoolAnalysis, getSchoolsData } from '@/lib/data';
import { zobrazeneObdobi } from '@/lib/stav-datovych-sad';
import { klicOboru, rocnikyKatalogu } from '@/lib/school-key';
import { souhrnyPodleRedizo } from '@/lib/souhrny-kolo1';
import { zarazeniObtiznosti, type ZarazeniObtiznosti } from '@/lib/obor-profil';
import { nazevSUlici } from '@/lib/mesto-karty';
import type { ZaznamKataloguProOkruh } from '@/lib/okruhy-oboru';

/** Název školy s ulicí podle REDIZO z katalogu (`nazevSUlici`), ročníky podle registru (`rocnikyKatalogu`). */
export async function nazvySkolKatalogu(): Promise<Map<string, string>> {
  const data = await getSchoolsData() as unknown as Record<string, Array<Record<string, unknown>>>;
  const skoly = new Map<string, string>();
  for (const rocnik of rocnikyKatalogu(Object.keys(data), await zobrazeneObdobi('cermat-vysledky'))) {
    for (const z of data[rocnik] ?? []) {
      const redizo = String(z.redizo ?? '');
      const nazev = z.nazev ? nazevSUlici(String(z.nazev), String(z.ulice ?? '')) : String(z.nazev_display ?? '');
      if (redizo && nazev && !skoly.has(redizo)) skoly.set(redizo, nazev);
    }
  }
  return skoly;
}

/**
 * Záznamy katalogu podle klíče REDIZO_KKOV pro popis řádků okruhu: z nejnovějšího ročníku, ve kterém
 * obor je, ročníky podle registru. Okruh obsahuje i obory z jiných obcí, proto celý katalog.
 */
let katalogOboruCache: Promise<Map<string, ZaznamKataloguProOkruh[]>> | null = null;
export function katalogOboru(): Promise<Map<string, ZaznamKataloguProOkruh[]>> {
  katalogOboruCache ??= (async () => {
    const data = await getSchoolsData() as unknown as Record<string, Array<Record<string, unknown>>>;
    const obory = new Map<string, ZaznamKataloguProOkruh[]>();
    for (const rocnik of rocnikyKatalogu(Object.keys(data), await zobrazeneObdobi('cermat-vysledky'))) {
      const vRocniku = new Map<string, ZaznamKataloguProOkruh[]>();
      for (const z of data[rocnik] ?? []) {
        const klic = klicOboru(z);
        if (!klic || obory.has(klic)) continue;
        vRocniku.set(klic, [...(vRocniku.get(klic) ?? []), {
          nazevDisplay: String(z.nazev_display || z.nazev || ''),
          obor: String(z.obor ?? ''),
          zamereni: String(z.zamereni ?? ''),
          delka: typeof z.delka_studia === 'number' ? z.delka_studia : null,
        }]);
      }
      for (const [klic, seznam] of vRocniku) obory.set(klic, seznam);
    }
    return obory;
  })();
  return katalogOboruCache;
}

/**
 * Obtížnost přijetí po klíči REDIZO_KKOV ze souhrnů 1. kola zobrazeného ročníku (práh deseti
 * soutěžících uplatňuje `zarazeniObtiznosti`). Zaměření s různou obtížností dají „lisi_se“.
 */
export async function obtiznostOboru(klice: string[]): Promise<Map<string, ZarazeniObtiznosti | null | 'lisi_se'>> {
  const souhrny = await souhrnyPodleRedizo(new Set(klice.map(k => k.split('_')[0])));
  const hledane = new Set(klice);
  const podleKlice = new Map<string, Set<ZarazeniObtiznosti | null>>();
  for (const [redizo, nabidky] of souhrny) {
    for (const n of nabidky) {
      const k = `${redizo}_${n.kkov}`;
      if (!hledane.has(k)) continue;
      podleKlice.set(k, (podleKlice.get(k) ?? new Set()).add(zarazeniObtiznosti(n.aktualni)));
    }
  }
  const out = new Map<string, ZarazeniObtiznosti | null | 'lisi_se'>();
  for (const [k, z] of podleKlice) out.set(k, z.size === 1 ? [...z][0] : 'lisi_se');
  return out;
}

/** REDIZO → název školy ze school_analysis.json; z něj skládá `adresaPrehledu` adresu přehledu školy. */
export async function kanonickeNazvySkol(): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  for (const s of Object.values(await getSchoolAnalysis())) {
    const redizo = s.id.split('_')[0];
    if (!out.has(redizo)) out.set(redizo, s.nazev);
  }
  return out;
}
