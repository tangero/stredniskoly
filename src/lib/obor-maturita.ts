/**
 * Maturita na stránce oboru: karta se třemi čísly.
 *
 * Návrh a rozhodnutí: docs/maturita-na-strance-oboru-2027.md. Co se smí tvrdit, určuje
 * docs/maturitni-vysledky-a-kvalita-skoly-2027.md; jména veličin docs/slovnik-ukazatelu.md.
 *
 * Obor se na maturitu napojí přes `SMO16`, tedy skupinu maturitních oborů, kterou zdroj nese
 * u každé nabídky. **Číslo platí za skupinu, ne za obor.** Když je obor ve skupině sám, je to
 * fakticky jeho výsledek a text o něm smí mluvit přímo; jinak musí říct, koho všeho se týká.
 */
import path from 'path';
import { promises as fs } from 'fs';
import { zobrazeneObdobi } from '@/lib/stav-datovych-sad';
import { oboryVeSkupineMaturity } from '@/lib/souhrny-kolo1';
import { nazevSkupinyMaturity, type MaturitaPredmet, type MaturitaSkupinaRoku } from '@/lib/skola-vyklad';

export { kohoSeTykaMaturita as koho } from '@/lib/skola-vyklad';

interface MaturitaSoubor {
  meta: { roky: number[]; nejnovejsi_rok: number };
  skupiny: Record<string, Record<string, { nazev: string; medianPercentScore: number | null; schools: number }>>;
  skoly: Record<string, { nazev: string; roky: Record<string, Record<string, MaturitaSkupinaRoku>> }>;
}

export interface MaturitaOboru {
  rok: number;
  /** Název skupiny oborů slovy, například „čtyřleté gymnázium“. */
  skupina: string;
  /** Obor je ve skupině sám, takže výsledek je fakticky jeho. */
  samotny: boolean;
  /** Ostatní obory školy ve stejné skupině; prázdné, když je obor sám. */
  dalsiObory: string[];
  spolecnaCast: MaturitaPredmet | null;
  cestina: MaturitaPredmet | null;
  matematika: MaturitaPredmet | null;
  stredPodobnychSkol: number | null;
  /** Obor do skupiny patří, ale škola v ní maturanty nemá. */
  bezMaturantu: boolean;
}

let cache: MaturitaSoubor | null | undefined;

/**
 * Cesta musí být v kódu napsaná doslova: Next.js podle ní při sestavení přibaluje soubory
 * k funkci, a cesta složená z proměnných částí by přibalila celý projekt (viz PR #90).
 */
async function soubor(): Promise<MaturitaSoubor | null> {
  if (cache !== undefined) return cache;
  try {
    cache = JSON.parse(await fs.readFile(path.join(process.cwd(), 'public', 'maturita_skoly.json'), 'utf-8')) as MaturitaSoubor;
  } catch {
    cache = null;
  }
  return cache;
}

/**
 * Maturitní karta oboru, nebo null, když se o maturitě nedá říct nic — tedy když registr sadu
 * nezobrazuje, škola v datech není nebo nabídka nemá skupinu. Prázdná karta „maturitu zatím
 * nemáme“ je zavržená (vrstvy stránky oboru, kolo 3), proto se v takovém případě nezobrazí nic.
 */
export async function getMaturitaOboru(
  redizo: string,
  smo16: string | null,
  popisky: (nabidky: { klic: string; kkov: string; zamereni: string }[]) => string[],
): Promise<MaturitaOboru | null> {
  const obdobi = await zobrazeneObdobi('cermat-maturita');
  if (!obdobi || !smo16) return null;
  const data = await soubor();
  const skola = data?.skoly[redizo];
  if (!data || !skola) return null;

  const rok = Number(obdobi);
  const rocnik = skola.roky[obdobi];
  const zaznam = rocnik?.[smo16];

  const klice = await oboryVeSkupineMaturity(redizo, smo16, rok);
  const dalsi = popisky(klice);
  const nazevSkupiny = nazevSkupinyMaturity(smo16, data.skupiny[obdobi]?.[smo16]?.nazev);

  // Obor do skupiny patří, ale škola v ní maturanty nemá: typicky nový obor. Říct to větou
  // je lepší než mlčet, protože čtenář jinak nepozná, jestli data nemáme, nebo je tajíme.
  if (!zaznam) {
    return {
      rok, skupina: nazevSkupiny, samotny: klice.length <= 1, dalsiObory: dalsi,
      spolecnaCast: null, cestina: null, matematika: null, stredPodobnychSkol: null, bezMaturantu: true,
    };
  }

  return {
    rok,
    skupina: nazevSkupiny,
    samotny: klice.length <= 1,
    dalsiObory: dalsi,
    spolecnaCast: zaznam.spolecna_cast ?? null,
    cestina: zaznam.cj ?? null,
    matematika: zaznam.ma ?? null,
    stredPodobnychSkol: zaznam.cj?.groupComparison?.medianPercentScore
      ?? data.skupiny[obdobi]?.[smo16]?.medianPercentScore ?? null,
    bezMaturantu: false,
  };
}
