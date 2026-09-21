import { normalizeSchoolKey, uniqueSchoolIndex } from './school-key';
import { promises as fs } from 'fs';
import path from 'path';
import { souhrnyPodleRedizo, type SouhrnProKatalog } from './souhrny-kolo1';
import { adresaPrehledu } from './adresa-oboru.mjs';
import { druheKoloPodleRedizo } from './druhe-kolo';
import { getSchoolAnalysis } from './data';
import { zarazeniObtiznosti, soutezicichUchazecu, type ZarazeniObtiznosti } from './obor-profil';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

const dataDir = path.join(process.cwd(), 'public');

import { MESTA } from './mesta.mjs';
export { MESTA };

export type MestoSlug = typeof MESTA[number]['slug'];

export interface SchoolTypeStats {
  typ: string;
  label: string;
  kapacita2024: number;
  prihlasky2024: number;
  kapacita2025: number;
  prihlasky2025: number;
  kapacita2026: number;
  prihlasky2026: number;
  prijati2026: number;
  /** Průměr ČJ+MA bodů přijatých 2026, škála 0–100 b. (z CERMAT, přepočet z % skóru /2) */
  avgCjMa2026: number | null;
  /** Průměr ČJ bodů přijatých 2026, škála 0–50 b. */
  avgCj2026: number | null;
  /** Průměr MA bodů přijatých 2026, škála 0–50 b. */
  avgMa2026: number | null;
  /** Průměr CJ+MA přijatých 2025 (pro srovnání) */
  avgCjMaPrev: number | null;
  /** Průměrná delta CJ+MA (2026 vs 2025) */
  avgDelta: number | null;
  /** Průměrný rank v rámci typu (percentil 0-100, vyšší = lepší) */
  avgRankPct: number | null;
  /** Počet oborů s CERMAT daty 2026 */
  cermatCount: number;
  /** Celkový počet oborů (ze schools_data 2025) */
  totalCount2025: number;
}

export interface CitySchoolRow {
  id: string;
  redizo: string;
  nazev: string;
  nazev_display: string;
  obor: string;
  zamereni: string;
  typ: string;
  delka_studia: number;
  zrizovatel: string;
  slug: string;
  kapacita2024: number | null;
  prihlasky2024: number | null;
  index2024: number | null;
  kapacita2025: number | null;
  prihlasky2025: number | null;
  index2025: number | null;
  kapacita2026: number | null;
  prihlasky2026: number | null;
  index2026: number | null;
  prijati2026: number | null;
  /** ČJ+MA celkem 0–100 b. */
  avgCjMa2026: number | null;
  /** ČJ 0–50 b. */
  avgCj2026: number | null;
  /** MA 0–50 b. */
  avgMa2026: number | null;
  avgCjMaPrev: number | null;
  delta2026: number | null;
  rankInType2026: number | null;
  typeTotal2026: number | null;
  /** Ulice sídla školy; rodina podle ní pozná, kde ve městě to je. */
  ulice: string;
  /**
   * Kanonická adresa přehledu školy ze sdíleného modulu (`adresaPrehledu`).
   * Karta školy míří sem, ne na slug jedné nabídky — jinak by cíl odkazu
   * závisel na tom, jak je zrovna vyfiltrováno.
   */
  slugSkoly: string;
  /**
   * Obtížnost přijetí slovy za zobrazený ročník, se všemi prahy zobrazení
   * uplatněnými (`zarazeniObtiznosti`). `null` znamená, že se nezobrazuje —
   * ne že by bylo snadné se dostat.
   */
  zarazeni: ZarazeniObtiznosti | null;
  /** Zařazení v předchozím ročníku; slovník vyžaduje uvést ho vedle. */
  zarazeniPredchozi: ZarazeniObtiznosti | null;
  predchoziRok: number | null;
  /** Soutěžící uchazeči a přijatí ze souhrnů, pro větu „přijato X ze Y“. */
  soutezici: number | null;
  prijatiZeSoutezicich: number | null;
  /** Nesplnili podmínky školy; uvádí se vedle, když je jich hodně (slovník). */
  nesplniliPodminky: number | null;
  /**
   * `true`, jen když nabídka v zobrazeném ročníku **skutečně chybí** — tedy nemá
   * ani souhrn 1. kola. Chybějící shoda se starým exportem přihlášek sem nepatří:
   * obor s doloženým výsledkem je vypsaný, i když se klíče nespárovaly.
   */
  chybiVRocniku: boolean;
  /**
   * `true`, když nabídka v zobrazeném ročníku 2. kola vypsala 2. kolo.
   * Je to **historie**, ne nabídka na příští rok; období 2. kola je vlastní
   * sada registru a může se lišit od 1. kola.
   */
  meloDruheKolo: boolean;
}

export interface NationalTypeStats {
  avgCjMa: number;
  avgCjMaPrev: number;
  count: number;
}

export interface CityStats {
  mesto: typeof MESTA[number];
  schools: CitySchoolRow[];
  byType: SchoolTypeStats[];
  national: Record<string, NationalTypeStats>;
  totals: {
    kapacita2024: number; prihlasky2024: number;
    kapacita2025: number; prihlasky2025: number;
    kapacita2026: number; prihlasky2026: number;
    prijati2026: number;
    nationalIndex2026: number;
    nationalKapacita2026: number;
    nationalPrihlasky2026: number;
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RawSchool = Record<string, any>;

const TYPE_LABELS: Record<string, string> = {
  GY4: 'Gymnázium 4-leté',
  GY6: 'Gymnázium 6-leté',
  GY8: 'Gymnázium 8-leté',
  LYC: 'Lyceum',
  SOS: 'Střední odborná škola',
  SOU: 'Střední odborné učiliště',
  NAS: 'Nástavbové studium',
};

const TYPE_ORDER = ['GY8', 'GY6', 'GY4', 'LYC', 'SOS', 'SOU', 'NAS'];

export async function getCityStats(mestoNazev: string): Promise<CityStats | null> {
  const mestoMeta = MESTA.find(m => m.nazev === mestoNazev);
  if (!mestoMeta) return null;

  const [schoolsDataRaw, apps2026Raw, cermat2026Raw] = await Promise.all([
    fs.readFile(path.join(dataDir, 'schools_data.json'), 'utf-8'),
    fs.readFile(path.join(dataDir, 'applications_2026.json'), 'utf-8'),
    fs.readFile(path.join(dataDir, 'cermat_results_2026.json'), 'utf-8'),
  ]);

  const schoolsData = JSON.parse(schoolsDataRaw) as { '2024': RawSchool[]; '2025': RawSchool[]; '2026'?: RawSchool[] };
  const apps2026Parsed = JSON.parse(apps2026Raw);
  const cermat2026 = JSON.parse(cermat2026Raw) as Record<string, RawSchool>;

  const all2024: RawSchool[] = schoolsData['2024'] || [];
  // Aktuální nabídka města je poslední ročník katalogu; proměnné níže si
  // ponechávají historické názvy, mění se jen zdroj dat.
  const all2025: RawSchool[] = schoolsData['2026'] || schoolsData['2025'] || [];
  const apps2026Map = uniqueSchoolIndex<RawSchool>(apps2026Parsed.data || [], r => r.id);
  const cermatIndex = uniqueSchoolIndex(Object.entries(cermat2026), ([key]) => key);

  const city2024 = all2024.filter(s => s.obec === mestoNazev);
  const city2025 = all2025.filter(s => s.obec === mestoNazev);
  const unambiguousHistory = uniqueSchoolIndex(all2025, r => r.id);

  const map2024 = new Map<string, RawSchool>(city2024.map(s => [s.id, s]));

  // Název školy pro adresu bere stejný zdroj jako data.ts a vyhledávání, tedy
  // school_analysis.json. Katalogový název adresu nesloží stejně (u Dašické chybí
  // ulice), takže odkaz by mířil na neexistující stránku.
  const kanonickeNazvy = new Map<string, string>();
  for (const skola of Object.values(await getSchoolAnalysis())) {
    const redizo = skola.id.split('_')[0];
    if (!kanonickeNazvy.has(redizo)) kanonickeNazvy.set(redizo, skola.nazev);
  }

  const redizoMesta = new Set(city2025.map(s => String(s.redizo)));

  // Obtížnost přijetí ze souhrnů 1. kola. Páruje se REDIZO + KKOV + zaměření;
  // na hrubším klíči by se nabídky téhož oboru s různým zaměřením slily.
  const souhrny = await souhrnyPodleRedizo(redizoMesta);

  // Nabídky, které v zobrazeném ročníku vypsaly 2. kolo. Klíče nesou zaměření
  // ve stejné normalizaci jako scripts/build-druhe-kolo.py.
  const druheKolo = await druheKoloPodleRedizo(redizoMesta);
  const klicDruhehoKola = new Set(
    [...druheKolo.values()].flat().map(n => n.klic),
  );
  const klicSeZamerenim = (redizo: string, kkov: string, zamereni: string) => {
    const z = (zamereni ?? '').normalize('NFKD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').toLowerCase();
    return z ? `${redizo}_${kkov}_${z}` : `${redizo}_${kkov}`;
  };
  const klicZamereni = (kkov: string, zamereni: string) =>
    `${kkov}|${normalizeSchoolKey(zamereni || '')}`;
  const souhrnProRadek = new Map<string, SouhrnProKatalog>();
  for (const [redizo, nabidky] of souhrny) {
    // Zaměření, které se v jednom REDIZO a KKOV vyskytuje víc než jednou, vynecháme:
    // nešlo by určit, který řádek katalogu k němu patří.
    const podleKlice = new Map<string, typeof nabidky[number][]>();
    for (const n of nabidky) {
      const k = klicZamereni(n.kkov, n.zamereni);
      podleKlice.set(k, [...(podleKlice.get(k) ?? []), n]);
    }
    for (const [k, seznam] of podleKlice) {
      if (seznam.length === 1) souhrnProRadek.set(`${redizo}|${k}`, seznam[0]);
    }
  }

  // Build per-school rows (based on 2025 as primary)
  const rows: CitySchoolRow[] = city2025.map(s25 => {
    const s24 = map2024.get(s25.id);
    const key = normalizeSchoolKey(s25.id);
    // Starý export může mít stejné ID pro více nabídek; nesmíme zdvojit údaje 2026.
    const canMatch = unambiguousHistory.has(key);
    const app26 = canMatch ? apps2026Map.get(key) : undefined;
    const cer26 = canMatch ? cermatIndex.get(key)?.[1] : undefined;

    const slug = `${s25.redizo}-${slugify(s25.nazev)}-${slugify(s25.obor)}`;

    const souhrn = souhrnProRadek.get(
      `${s25.redizo}|${klicZamereni(String(s25.kkov ?? ''), String(s25.zamereni ?? ''))}`,
    );
    // Práh deseti soutěžících uplatňuje zarazeniObtiznosti, ne tento soubor.
    const zarazeni = souhrn ? zarazeniObtiznosti(souhrn.aktualni) : null;
    const soutezici = souhrn ? soutezicichUchazecu(souhrn.aktualni) : null;

    return {
      id: s25.id,
      redizo: s25.redizo,
      nazev: s25.nazev,
      nazev_display: s25.nazev_display || s25.nazev,
      obor: s25.obor,
      zamereni: s25.zamereni || '',
      typ: s25.typ || '',
      delka_studia: s25.delka_studia || 4,
      zrizovatel: s25.zrizovatel || '',
      slug,
      kapacita2024: s24?.kapacita ?? null,
      prihlasky2024: s24?.prihlasky ?? null,
      index2024: s24 ? (s24.index_poptavky ?? null) : null,
      kapacita2025: s25.kapacita ?? null,
      prihlasky2025: s25.prihlasky ?? null,
      index2025: s25.index_poptavky ?? null,
      // Souhrn 1. kola je spolehlivejsi nez shoda se starym exportem prihlasek:
      // kdyz se klice nespáruji, údaj přesto známe ze souhrnu.
      kapacita2026: app26?.kapacita ?? souhrn?.aktualni.kapacita ?? null,
      prihlasky2026: app26?.prihlasky ?? souhrn?.aktualni.prihlasky ?? null,
      index2026: app26?.idx ?? souhrn?.aktualni.index_poptavky ?? null,
      prijati2026: cer26?.prijati ?? null,
      avgCjMa2026: cer26?.cj_ma_prijati ?? null,
      avgCj2026: cer26?.cj_prijati ?? null,
      avgMa2026: cer26?.ma_prijati ?? null,
      avgCjMaPrev: cer26?.cj_ma_prijati_prev ?? null,
      delta2026: cer26?.delta_cj_ma ?? null,
      rankInType2026: cer26?.rank_in_type ?? null,
      typeTotal2026: cer26?.type_total ?? null,
      ulice: s25.ulice || '',
      slugSkoly: adresaPrehledu(
        String(s25.redizo),
        kanonickeNazvy.get(String(s25.redizo)) ?? s25.nazev,
      ),
      zarazeni,
      zarazeniPredchozi: souhrn?.predchozi ? zarazeniObtiznosti(souhrn.predchozi) : null,
      predchoziRok: souhrn?.predchoziRok ?? null,
      soutezici,
      prijatiZeSoutezicich: souhrn?.aktualni.prijati ?? null,
      nesplniliPodminky: souhrn?.aktualni.conditions_not_met ?? null,
      // Bez souhrnu nabídka v ročníku není; s ním je vypsaná, i kdyby chyběla shoda.
      chybiVRocniku: souhrn === undefined,
      meloDruheKolo: klicDruhehoKola.has(
        klicSeZamerenim(String(s25.redizo), String(s25.kkov ?? ''), String(s25.zamereni ?? '')),
      ),
    };
  });

  // Group by type and aggregate
  const typeMap = new Map<string, CitySchoolRow[]>();
  for (const row of rows) {
    const t = row.typ || 'SOS';
    if (!typeMap.has(t)) typeMap.set(t, []);
    typeMap.get(t)!.push(row);
  }

  const byType: SchoolTypeStats[] = TYPE_ORDER
    .filter(t => typeMap.has(t))
    .map(typ => {
      const items = typeMap.get(typ)!;
      const sum = (fn: (r: CitySchoolRow) => number | null) => {
        const vals = items.map(fn).filter((v): v is number => v !== null);
        return vals.length ? vals.reduce((a, b) => a + b, 0) : 0;
      };
      const avg = (fn: (r: CitySchoolRow) => number | null) => {
        const vals = items.map(fn).filter((v): v is number => v !== null);
        return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
      };

      const cermatItems = items.filter(r => r.avgCjMa2026 !== null);

      return {
        typ,
        label: TYPE_LABELS[typ] || typ,
        kapacita2024: sum(r => r.kapacita2024),
        prihlasky2024: sum(r => r.prihlasky2024),
        kapacita2025: sum(r => r.kapacita2025),
        prihlasky2025: sum(r => r.prihlasky2025),
        kapacita2026: sum(r => r.kapacita2026),
        prihlasky2026: sum(r => r.prihlasky2026),
        prijati2026: sum(r => r.prijati2026),
        avgCjMa2026: avg(r => r.avgCjMa2026),
        avgCj2026: avg(r => r.avgCj2026),
        avgMa2026: avg(r => r.avgMa2026),
        avgCjMaPrev: avg(r => r.avgCjMaPrev),
        avgDelta: avg(r => r.delta2026),
        avgRankPct: cermatItems.length
          ? cermatItems.reduce((acc, r) => acc + (1 - (r.rankInType2026! - 1) / r.typeTotal2026!) * 100, 0) / cermatItems.length
          : null,
        cermatCount: cermatItems.length,
        totalCount2025: items.length,
      };
    });

  // National stats by type (from cermat2026)
  const national: Record<string, NationalTypeStats> = {};
  for (const [, c] of Object.entries(cermat2026)) {
    const t = c.school_type as string;
    if (!national[t]) national[t] = { avgCjMa: 0, avgCjMaPrev: 0, count: 0 };
    national[t].avgCjMa += c.cj_ma_prijati;
    national[t].avgCjMaPrev += (c.cj_ma_prijati_prev || c.cj_ma_prijati);
    national[t].count += 1;
  }
  for (const t of Object.keys(national)) {
    national[t].avgCjMa = national[t].avgCjMa / national[t].count;
    national[t].avgCjMaPrev = national[t].avgCjMaPrev / national[t].count;
  }

  // National totals (from apps2026)
  const allApps = apps2026Parsed.data || [];
  const nationalKapacita2026 = allApps.reduce((s: number, r: RawSchool) => s + r.kapacita, 0);
  const nationalPrihlasky2026 = allApps.reduce((s: number, r: RawSchool) => s + r.prihlasky, 0);

  const totals = {
    kapacita2024: city2024.reduce((s, r) => s + (r.kapacita || 0), 0),
    prihlasky2024: city2024.reduce((s, r) => s + (r.prihlasky || 0), 0),
    kapacita2025: city2025.reduce((s, r) => s + (r.kapacita || 0), 0),
    prihlasky2025: city2025.reduce((s, r) => s + (r.prihlasky || 0), 0),
    kapacita2026: rows.reduce((s, r) => s + (r.kapacita2026 || 0), 0),
    prihlasky2026: rows.reduce((s, r) => s + (r.prihlasky2026 || 0), 0),
    prijati2026: rows.reduce((s, r) => s + (r.prijati2026 || 0), 0),
    nationalIndex2026: nationalKapacita2026 ? nationalPrihlasky2026 / nationalKapacita2026 : 2.95,
    nationalKapacita2026,
    nationalPrihlasky2026,
  };

  return { mesto: mestoMeta, schools: rows, byType, national, totals };
}
