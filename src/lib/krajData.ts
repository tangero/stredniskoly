import { promises as fs } from 'fs';
import path from 'path';
import { normalizeSchoolKey } from './school-key';
import { nabidkyKraje, type SouhrnNabidkyKraje } from './souhrny-kolo1';
import { adresaPrehledu } from './adresa-oboru.mjs';
import { druheKoloPodleRedizo, klicDruhehoKola, rokDruhehoKola } from './druhe-kolo';
import { getSchoolAnalysis } from './data';
import { getWebSkoly } from './skoly-web';
import { maturitaVPrehledu, type MaturitaVPrehledu } from './maturita-skoly';
import { zobrazeneObdobi } from './stav-datovych-sad';
import {
  kohortaPozice, soutezicichUchazecu, zarazeniObtiznosti,
  type KohortaPozice, type Poradi, type ZarazeniObtiznosti,
} from './obor-profil';
import { poradi } from './obor-profil-data';

/**
 * Přehled škol v kraji: docs/navrh-stranky-kraje-2027.md.
 *
 * Staví na souhrnech 1. kola zobrazeného ročníku (registr, sada cermat-vysledky), ne na
 * `school_analysis.json`: ten nese ročník 2025 a u oborů nových v roce 2026 nuly
 * místo chybějících údajů (návrh, závady D1 a D2). Katalog ročníku dodává jen názvy.
 */

/** Pořadí v kraji ve srovnatelné skupině (slovník ukazatelů), s předchozím ročníkem. */
export interface PoradiNabidky {
  poradi: Poradi;
  predchozi: Poradi | null;
}

export interface NabidkaKraje {
  klic: string;
  redizo: string;
  obor: string;
  zamereni: string;
  delka: number;
  /** Srovnatelná skupina, například `GY8_8`; slouží k filtru i k pořadí. */
  skupina: string;
  kapacita: number | null;
  prihlasky: number | null;
  prihlaskyNaMisto: number | null;
  /** Obtížnost přijetí s uplatněným prahem zobrazení; null neznamená „snadné“. */
  zarazeni: ZarazeniObtiznosti | null;
  zarazeniPredchozi: ZarazeniObtiznosti | null;
  predchoziRok: number | null;
  soutezici: number | null;
  prijati: number | null;
  nesplniliPodminky: number | null;
  kohorta: KohortaPozice | null;
  /** Nabídka bez páru v předchozím ročníku: nový obor nebo nové zaměření. */
  novaNabidka: boolean;
  meloDruheKolo: boolean;
  poradiZajem: PoradiNabidky | null;
  poradiVysledky: PoradiNabidky | null;
}

export interface SkolaKraje {
  redizo: string;
  nazev: string;
  obec: string;
  okres: string;
  ulice: string;
  zrizovatel: string;
  /** Adresa přehledu školy; karta míří na školu, ne na jednu nabídku. */
  slug: string;
  web: string | null;
  maturita: MaturitaVPrehledu | null;
  nabidky: NabidkaKraje[];
}

export interface KrajPrehled {
  kod: string;
  rok: number;
  rokDruhehoKola: number | null;
  /** Rok maturitních výsledků z registru; null, když se maturita nezobrazuje. */
  rokMaturity: number | null;
  skoly: SkolaKraje[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RawSchool = Record<string, any>;

let katalogCache: { rok: string; index: Map<string, RawSchool> } | null = null;

/** Katalog zobrazeného ročníku, klíčovaný stejně jako souhrny: REDIZO_KKOV_zaměření v normalizaci klíčů. */
async function katalogRocniku(rok: string): Promise<Map<string, RawSchool>> {
  if (katalogCache?.rok === rok) return katalogCache.index;
  const data = JSON.parse(await fs.readFile(path.join(process.cwd(), 'public', 'schools_data.json'), 'utf-8'));
  const index = new Map<string, RawSchool>();
  const kolize = new Set<string>();
  for (const r of (data[rok] ?? []) as RawSchool[]) {
    // Ročník katalogu nese i loňské nabídky, které se letos nevypsaly; ty do přehledu nepatří.
    if (String(r.rok) !== rok) continue;
    const k = normalizeSchoolKey(`${r.redizo}_${r.kkov}_${r.zamereni ?? ''}`);
    if (index.has(k)) kolize.add(k);
    else index.set(k, r);
  }
  kolize.forEach(k => index.delete(k));
  katalogCache = { rok, index };
  return index;
}

async function poradiVKraji(
  rok: number, kraj: string, n: SouhrnNabidkyKraje, pole: 'tlak' | 'umisteni',
): Promise<PoradiNabidky | null> {
  const p = await poradi(rok, kraj, n.skupina, n.klic, pole, n.predchoziRok);
  return p && { poradi: p.poradi, predchozi: p.predchozi };
}

const prehledCache = new Map<string, Promise<KrajPrehled | null>>();

export async function getKrajPrehled(
  krajKod: string,
  /** Jen pro test: dovolí podstrčit katalog a vyzkoušet ročník, který katalog nemá. */
  proTest?: { katalog?: (rok: string) => Promise<Map<string, RawSchool>> },
): Promise<KrajPrehled | null> {
  if (!proTest) {
    const hotovo = prehledCache.get(krajKod);
    if (hotovo) return hotovo;
  }
  const prace = spoctiKrajPrehled(krajKod, proTest?.katalog ?? katalogRocniku);
  if (!proTest) prehledCache.set(krajKod, prace);
  return prace;
}

async function spoctiKrajPrehled(
  krajKod: string, katalogPro: (rok: string) => Promise<Map<string, RawSchool>>,
): Promise<KrajPrehled | null> {
  const { rok, nabidky } = await nabidkyKraje(krajKod);
  if (!rok || nabidky.length === 0) return null;
  const katalog = await katalogPro(String(rok));

  // Název školy pro adresu z téhož zdroje jako data.ts a vyhledávání (viz cityData.ts).
  const kanonickeNazvy = new Map<string, string>();
  for (const skola of Object.values(await getSchoolAnalysis())) {
    const redizo = skola.id.split('_')[0];
    if (!kanonickeNazvy.has(redizo)) kanonickeNazvy.set(redizo, skola.nazev);
  }

  const redizoKraje = new Set(nabidky.map(n => n.redizo));
  const druheKolo = await druheKoloPodleRedizo(redizoKraje);
  const klicDruhehoKolaSet = new Set([...druheKolo.values()].flat().map(n => n.klic));
  const [rok2Kolo, obdobiMaturity] = await Promise.all([rokDruhehoKola(), zobrazeneObdobi('cermat-maturita')]);

  const skoly = new Map<string, SkolaKraje>();
  for (const n of nabidky) {
    const k = katalog.get(normalizeSchoolKey(`${n.redizo}_${n.kkov}_${n.zamereni}`));
    // Bez záznamu v katalogu neznáme název oboru; nabídku nevymýšlíme (test hlídá, že se to neděje).
    if (!k) continue;
    const a = n.aktualni;
    const prihlaskyNaMisto = typeof a.index_poptavky === 'number' ? a.index_poptavky : null;
    const nabidka: NabidkaKraje = {
      klic: n.klic,
      redizo: n.redizo,
      obor: String(k.obor ?? ''),
      zamereni: String(k.zamereni ?? ''),
      delka: Number(k.delka_studia) || Number(n.skupina.split('_')[1]) || 4,
      skupina: n.skupina,
      kapacita: a.kapacita ?? null,
      prihlasky: a.prihlasky ?? null,
      prihlaskyNaMisto,
      zarazeni: zarazeniObtiznosti(a),
      zarazeniPredchozi: n.predchozi ? zarazeniObtiznosti(n.predchozi) : null,
      predchoziRok: n.predchoziRok,
      soutezici: soutezicichUchazecu(a),
      prijati: a.prijati ?? null,
      nesplniliPodminky: a.conditions_not_met ?? null,
      kohorta: kohortaPozice(a, n.nabidekVeSkupine),
      novaNabidka: n.predchozi === null,
      meloDruheKolo: klicDruhehoKolaSet.has(klicDruhehoKola(n.redizo, n.kkov, n.zamereni)),
      poradiZajem: await poradiVKraji(rok, krajKod, n, 'tlak'),
      poradiVysledky: await poradiVKraji(rok, krajKod, n, 'umisteni'),
    };
    const skola = skoly.get(n.redizo) ?? {
      redizo: n.redizo,
      nazev: String(k.nazev_display || k.nazev || ''),
      obec: String(k.obec ?? ''),
      // Katalog nemá u části škol okres; obec není okres a ve filtru by plula
      // mezi okresy. Bez okresu škola pod filtrem okresu prostě není.
      okres: String(k.okres ?? ''),
      ulice: String(k.ulice ?? ''),
      zrizovatel: String(k.zrizovatel ?? ''),
      slug: adresaPrehledu(n.redizo, kanonickeNazvy.get(n.redizo) ?? String(k.nazev ?? '')),
      web: await getWebSkoly(n.redizo),
      maturita: obdobiMaturity ? await maturitaVPrehledu(n.redizo) : null,
      nabidky: [],
    };
    skola.nabidky.push(nabidka);
    skoly.set(n.redizo, skola);
  }

  // Katalog bez zobrazeného ročníku (registr přepnutý dřív, než vyšla data): rodině se
  // nesmí ukázat „0 škol“ — chybějící data nejsou nula. Stránka udělá notFound().
  if (skoly.size === 0) return null;

  const seznam = [...skoly.values()].sort((x, y) => x.nazev.localeCompare(y.nazev, 'cs'));
  for (const s of seznam) {
    s.nabidky.sort((x, y) => x.skupina.localeCompare(y.skupina) || x.obor.localeCompare(y.obor, 'cs')
      || x.zamereni.localeCompare(y.zamereni, 'cs'));
  }
  return {
    kod: krajKod,
    rok,
    rokDruhehoKola: rok2Kolo,
    rokMaturity: obdobiMaturity ? Number(obdobiMaturity) : null,
    skoly: seznam,
  };
}
