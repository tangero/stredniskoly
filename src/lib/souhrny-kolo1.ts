import { promises as fs } from 'fs';
import path from 'path';
import { indexKlicuRocniku, klicZdrojeProStranku, normalizeSchoolKey } from '@/lib/school-key';
import { zobrazeneObdobi } from '@/lib/stav-datovych-sad';
import type { ZarazeniObtiznosti } from '@/lib/obor-profil';

/**
 * Souhrny 1. kola za obory po ročnících, public/souhrny_kolo1.json.
 *
 * Generuje scripts/build-souhrny-kolo1.py z oficiálních souhrnů CERMATu. Názvy polí
 * odpovídají slovníku ukazatelů; chybějící pole znamená, že zdroj údaj nenese, ne nulu.
 * Zobrazený ročník určuje registr (sada cermat-vysledky), předchozí ročník se ukáže
 * jen u nabídky spárované podle docs/grafy-skoly-a-oboru-2027.md, pravidlo 7.
 */
export interface SouhrnRocniku {
  kapacita?: number;
  prihlasky?: number;
  prihlasky_priority?: (number | null)[];
  prijati?: number;
  prijati_priority?: (number | null)[];
  capacity_rejected?: number;
  conditions_not_met?: number;
  higher_priority?: number;
  withdrawn?: number;
  tlak_prvnich_voleb?: number;
  index_poptavky?: number;
  konali?: number;
  prijatych_s_vysledkem?: number;
  cj_ma_prijati?: number;
  cj_prijati?: number;
  ma_prijati?: number;
  podil_prijatych_ze_soutezicich?: number;
  zarazeni_obtiznosti?: ZarazeniObtiznosti;
  prumerne_umisteni_prijatych?: number;
  prumerne_umisteni_uchazecu?: number;
  min_prijaty_percentil_souhrn?: number;
  /** Jen když se skupina v ročníku liší od skupiny nabídky. */
  skupina?: string;
}

interface SouhrnNabidkySoubor {
  redizo: string;
  kkov: string;
  zamereni: string;
  skupina: string;
  smo16?: string | null;
  kraj: string;
  kraj_nazev: string;
  parovani?: Record<string, 'shoda_klice' | 'jedna_ku_jedne' | 'text_zamereni' | 'overeno_rucne'>;
  roky: Record<string, SouhrnRocniku>;
}

interface SouhrnySoubor {
  meta: { rocniky: Record<string, { soubor: string; url: string; nabidek: number }> };
  skupiny: Record<string, Record<string, { n: number; tlak_prvnich_voleb: number[] }>>;
  nabidky: Record<string, SouhrnNabidkySoubor>;
}

export interface SouhrnNabidky {
  /** Zobrazený ročník podle registru. */
  rok: number;
  aktualni: SouhrnRocniku;
  /** Předchozí ročník, jen u spárované nabídky. */
  predchoziRok: number | null;
  predchozi: SouhrnRocniku | null;
  /** Klíč nabídky v souhrnech. */
  klic: string;
  skupina: string;
  kraj: string;
  krajNazev: string;
  redizo: string;
  kkov: string;
  /** Skupina maturitních oborů (SMO16) ze zdroje; klíč, kterým se obor napojí na maturitu. */
  smo16: string | null;
}

/** Pod tímto počtem nabídek ve skupině se percentil ve skupině nezobrazuje (slovník, oddíl 4). */
export const MIN_NABIDEK_VE_SKUPINE = 30;

let cache: { soubor: SouhrnySoubor; index: Map<string, string> } | null = null;

async function nacti() {
  if (cache) return cache;
  const soubor: SouhrnySoubor = JSON.parse(
    await fs.readFile(path.join(process.cwd(), 'public', 'souhrny_kolo1.json'), 'utf-8'),
  );
  // Klíče katalogu se od klíčů souhrnu mohou lišit diakritikou a interpunkcí zaměření.
  const index = new Map<string, string>();
  const kolize = new Set<string>();
  for (const klic of Object.keys(soubor.nabidky)) {
    const n = normalizeSchoolKey(klic);
    if (index.has(n)) kolize.add(n);
    else index.set(n, klic);
  }
  kolize.forEach(n => index.delete(n));
  cache = { soubor, index };
  return cache;
}

const mapyRocniku = new Map<string, Map<string, string>>();

/** Mapa nabídek ročníku (scripts/build-offer-mapping-{rok}.py); prázdná, když pro ročník neexistuje. */
async function mapaRocniku(obdobi: string): Promise<Map<string, string>> {
  const hotova = mapyRocniku.get(obdobi);
  if (hotova) return hotova;
  let index = new Map<string, string>();
  try {
    const soubor = JSON.parse(
      await fs.readFile(path.join(process.cwd(), 'public', `offer_mapping_${obdobi}.json`), 'utf-8'),
    );
    index = indexKlicuRocniku(soubor.mapping ?? {});
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
    // Bez mapy najdou souhrn jen stránky, jejichž klíč se nezměnil; soubor se za běhu neobjeví.
    console.warn(`souhrny-kolo1: chybí public/offer_mapping_${obdobi}.json, stránky s přepsaným zaměřením souhrn nenajdou`);
  }
  mapyRocniku.set(obdobi, index);
  return index;
}

/** Souhrn nabídky pro zobrazený ročník a spárovaný předchozí ročník; null, když nabídka v ročníku není. */
export async function getSouhrnNabidky(programId: string): Promise<SouhrnNabidky | null> {
  const obdobi = await zobrazeneObdobi('cermat-vysledky');
  if (!obdobi) return null;
  const { soubor, index } = await nacti();
  // Stránka s přepsaným zaměřením nese loňský klíč katalogu; letošní nabídku najde přes mapu nabídek.
  const klic = klicZdrojeProStranku(programId, await mapaRocniku(obdobi), index,
    k => soubor.nabidky[k].roky[obdobi] !== undefined);
  const nabidka = klic ? soubor.nabidky[klic] : undefined;
  const aktualni = nabidka?.roky[obdobi];
  if (!nabidka || !aktualni) return null;
  const rok = Number(obdobi);
  const starsi = Object.keys(nabidka.roky).map(Number).filter(r => r < rok).sort((a, b) => b - a)[0];
  const sparovano = starsi !== undefined && nabidka.parovani?.[`${starsi}-${rok}`] !== undefined;
  return {
    rok,
    aktualni,
    predchoziRok: sparovano ? starsi : null,
    predchozi: sparovano ? nabidka.roky[String(starsi)] : null,
    klic: klic!,
    skupina: aktualni.skupina ?? nabidka.skupina,
    kraj: nabidka.kraj,
    krajNazev: nabidka.kraj_nazev,
    redizo: nabidka.redizo,
    kkov: nabidka.kkov,
    smo16: nabidka.smo16 ?? null,
  };
}

export interface NabidkaVeSkupine {
  klic: string;
  tlak?: number;
  umisteni?: number;
}

/** Nabídky téže srovnatelné skupiny ve stejném kraji a ročníku (podklad pro pořadí v kraji). */
export async function nabidkyVeSkupineKraje(rok: number, kraj: string, skupina: string): Promise<NabidkaVeSkupine[]> {
  const { soubor } = await nacti();
  const out: NabidkaVeSkupine[] = [];
  for (const [klic, n] of Object.entries(soubor.nabidky)) {
    const r = n.roky[String(rok)];
    if (!r || n.kraj !== kraj || (r.skupina ?? n.skupina) !== skupina) continue;
    out.push({ klic, tlak: r.tlak_prvnich_voleb, umisteni: r.prumerne_umisteni_prijatych });
  }
  return out;
}

export interface SouhrnProKatalog {
  /** Zobrazený ročník a spárovaný předchozí, stejná pravidla jako getSouhrnNabidky. */
  aktualni: SouhrnRocniku;
  predchozi: SouhrnRocniku | null;
  predchoziRok: number | null;
  kkov: string;
  zamereni: string;
}

/**
 * Souhrny všech nabídek daných škol v zobrazeném ročníku, klíčované `REDIZO_KKOV_zaměření`.
 *
 * Pro přehledy nad více školami (město, kraj), kde se nabídky nepárují po jedné se stránkou
 * oboru, ale spojují s katalogem podle REDIZO. Nabídku, která v ročníku není, nevrací —
 * chybějící údaj není nula (docs/zdroje-dat.md, oddíl 4, past 4).
 */
export async function souhrnyPodleRedizo(
  redizoMnozina: Set<string>,
): Promise<Map<string, SouhrnProKatalog[]>> {
  const obdobi = await zobrazeneObdobi('cermat-vysledky');
  const out = new Map<string, SouhrnProKatalog[]>();
  if (!obdobi) return out;
  const { soubor } = await nacti();
  const rok = Number(obdobi);
  for (const n of Object.values(soubor.nabidky)) {
    if (!redizoMnozina.has(n.redizo)) continue;
    const aktualni = n.roky[obdobi];
    if (!aktualni) continue;
    const starsi = Object.keys(n.roky).map(Number).filter(r => r < rok).sort((a, b) => b - a)[0];
    const sparovano = starsi !== undefined && n.parovani?.[`${starsi}-${rok}`] !== undefined;
    const seznam = out.get(n.redizo) ?? [];
    seznam.push({
      aktualni,
      predchozi: sparovano ? n.roky[String(starsi)] : null,
      predchoziRok: sparovano ? starsi : null,
      kkov: n.kkov,
      zamereni: n.zamereni,
    });
    out.set(n.redizo, seznam);
  }
  return out;
}

/** Ročník souhrnu pro obor školy (REDIZO_KKOV), jen když má obor v ročníku jedinou nabídku. */
export async function souhrnOboru(redizoKkov: string, rok: number): Promise<SouhrnRocniku | null> {
  const { soubor } = await nacti();
  const nalezene = Object.values(soubor.nabidky)
    .filter(n => `${n.redizo}_${n.kkov}` === redizoKkov && n.roky[String(rok)])
    .map(n => n.roky[String(rok)]);
  return nalezene.length === 1 ? nalezene[0] : null;
}


/**
 * Obory téže školy, které patří do stejné skupiny maturitních oborů (`SMO16`) v daném ročníku.
 *
 * Maturitní číslo platí za celou skupinu, ne za jeden obor. Když je v ní obor sám, smí se o něm
 * mluvit přímo; jinak musí text říct, koho všeho se výsledek týká (návrh maturity na stránce
 * oboru, oddíl 4). Vrací i obor, ze kterého se ptáme.
 */
export async function oboryVeSkupineMaturity(
  redizo: string, smo16: string, rok: number,
): Promise<{ klic: string; kkov: string; zamereni: string }[]> {
  const { soubor } = await nacti();
  const out: { klic: string; kkov: string; zamereni: string }[] = [];
  for (const [klic, n] of Object.entries(soubor.nabidky)) {
    if (n.redizo !== redizo || (n.smo16 ?? null) !== smo16) continue;
    if (!n.roky[String(rok)]) continue;
    out.push({ klic, kkov: n.kkov, zamereni: n.zamereni });
  }
  return out;
}
