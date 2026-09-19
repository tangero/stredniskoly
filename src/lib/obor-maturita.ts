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
import { nazevSkupinyMaturity, rokMaturityOboru, type MaturitaPredmet, type MaturitaSkupinaRoku } from '@/lib/skola-vyklad';

export { kohoSeTykaMaturita as koho } from '@/lib/skola-vyklad';

interface MaturitaSoubor {
  meta: { roky: number[]; nejnovejsi_rok: number };
  skupiny: Record<string, Record<string, { nazev: string; medianPercentScore: number | null; schools: number }>>;
  skoly: Record<string, { nazev: string; roky: Record<string, Record<string, MaturitaSkupinaRoku>> }>;
}

export interface MaturitaOboru {
  /** Rok, ze kterého jsou čísla: poslední, ve kterém skupina maturanty měla. */
  rok: number;
  /** Rok je starší než zobrazené období, protože ve skupině letos nikdo nematuroval. */
  starsiNezObdobi: boolean;
  /** Maturanti ve skupině byli, ale výsledky se nezveřejňují (malý počet konajících). */
  nezverejneno: boolean;
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
  rokSouhrnu: number,
  popisky: (nabidky: { klic: string; kkov: string; zamereni: string }[]) => string[],
): Promise<MaturitaOboru | null> {
  const obdobi = await zobrazeneObdobi('cermat-maturita');
  if (!obdobi || !smo16) return null;
  const data = await soubor();
  const skola = data?.skoly[redizo];
  if (!data || !skola) return null;

  const obdobiRok = Number(obdobi);

  // Výběr roku i posouzení, jestli je co zveřejnit, jsou čistá funkce — testovatelná bez dat.
  const { rok: rokSeZaznamem, nezverejneno } = rokMaturityOboru(skola.roky, smo16, obdobiRok);

  // Členství ve skupině se posuzuje proti ročníku souhrnů, ne maturity: až se ročníky rozejdou,
  // obor by z výběru vypadl a karta by chybně tvrdila, že je ve skupině sám.
  const klice = await oboryVeSkupineMaturity(redizo, smo16, rokSouhrnu);
  const dalsi = popisky(klice);
  const nazevSkupiny = nazevSkupinyMaturity(smo16, data.skupiny[obdobi]?.[smo16]?.nazev);
  const spolecne = { skupina: nazevSkupiny, samotny: klice.length <= 1, dalsiObory: dalsi };

  // Obor do skupiny patří, ale škola v ní maturanty neměla v žádném roce: typicky nový obor.
  // Říct to větou je lepší než mlčet, protože čtenář jinak nepozná, jestli data nemáme.
  if (rokSeZaznamem === null) {
    return {
      ...spolecne, rok: obdobiRok, starsiNezObdobi: false, nezverejneno: false, bezMaturantu: true,
      spolecnaCast: null, cestina: null, matematika: null, stredPodobnychSkol: null,
    };
  }

  const klicRoku = String(rokSeZaznamem);
  const zaznam = skola.roky[klicRoku][smo16];
  const spolecnaCast = zaznam.spolecna_cast ?? null;
  const cestina = zaznam.cj ?? null;
  const matematika = zaznam.ma ?? null;

  return {
    ...spolecne,
    rok: rokSeZaznamem,
    starsiNezObdobi: rokSeZaznamem < obdobiRok,
    nezverejneno,
    spolecnaCast, cestina, matematika,
    stredPodobnychSkol: cestina?.groupComparison?.medianPercentScore
      ?? data.skupiny[klicRoku]?.[smo16]?.medianPercentScore ?? null,
    bezMaturantu: false,
  };
}
