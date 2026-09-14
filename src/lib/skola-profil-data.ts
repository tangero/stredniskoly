import { promises as fs } from 'fs';
import path from 'path';
import { getSchoolsData, getCSIDataByRedizo, getExtractionsByRedizo, getInspisDataByRedizo, type SchoolProgram } from '@/lib/data';
import { getSouhrnNabidky, souhrnOboru, type SouhrnRocniku } from '@/lib/souhrny-kolo1';
import { getPortalZaznam, type PortalZaznam } from '@/lib/portal-skol';
import { getWebSkoly } from '@/lib/skoly-web';
import { getDruheKolo, type DruheKoloNabidky } from '@/lib/druhe-kolo';
import { zobrazeneObdobi, platnostObdobi } from '@/lib/stav-datovych-sad';
import { createSlug } from '@/lib/utils';
import { zarazeniObtiznosti, soutezicichUchazecu, type ZarazeniObtiznosti } from '@/lib/obor-profil';
import {
  proKohoObor, shrnutiMaturity, smerStupne, vzdalenostKm,
  type MaturitaSkupinaRoku, type Poloha, type ShrnutiMaturity,
} from '@/lib/skola-vyklad';
import type { CSISchoolData, InspectionExtraction } from '@/types/school';
import type { SchoolInspisData } from '@/types/inspis';

/**
 * Data stránky školy podle docs/stranka-skoly-2027.md: obory s obtížností přijetí, maturita
 * proti skupině oborů, inspekce, profil, údaje od školy, poloha a okolí.
 * Období berou knihovny z registru stavu datových sad; maturita se ukáže až po přepnutí sady.
 */

export interface OborSkoly {
  id: string;
  href: string;
  nazev: string;
  delka: number;
  proKoho: string;
  skupina: string | null;
  kapacita: number | null;
  prihlasky: number | null;
  prijati: number | null;
  soutezici: number | null;
  zarazeni: ZarazeniObtiznosti | null;
  predchoziRok: number | null;
  zarazeniPredchozi: ZarazeniObtiznosti | null;
  predchozi: { prijati: number | null; soutezici: number | null } | null;
  tlak: number | null;
  cjPrijati: number | null;
  maPrijati: number | null;
  umisteniPrijatych: number | null;
  novy: boolean;
  drivejsiNazev: string | null;
  vypsano: boolean;
  druheKolo: DruheKoloNabidky | null;
}

export interface MaturitaSkoly {
  obdobi: 'jaro';
  roky: number[];
  skupiny: (ShrnutiMaturity & {
    nazev: string;
    percentilySkupiny: number[];
    medianPercentilSkupiny: number | null;
    skolVeSkupine: number | null;
    vstup: { umisteni: number; median: number; obor: string } | null;
  })[];
}

export interface SkolaVOkoli {
  redizo: string;
  nazev: string;
  obec: string;
  href: string;
  km: number;
  smer: number;
  podobna: boolean;
  soubeh: number;
}

export interface RadekSoubehu {
  nazev: string;
  obec: string;
  obor: string;
  uchazecu: number;
  km: number | null;
  href: string | null;
  tataSkola: boolean;
  zarazeni: ZarazeniObtiznosti | null;
  prijati: number | null;
  soutezici: number | null;
}

export interface ProfilSkolyData {
  redizo: string;
  rok: number | null;
  platnostDat: string | null;
  obory: OborSkoly[];
  maturita: MaturitaSkoly | null;
  inspekce: {
    datum: string;
    souhrn: string;
    silne: { tag: string; detail: string }[];
    rizika: { tag: string; detail: string }[];
    sedi: string[];
    opatrne: string[];
    otazky: string[];
    zmena: string | null;
    podpora: string[];
  } | null;
  inspekceSeznam: CSISchoolData | null;
  inspis: SchoolInspisData | null;
  portal: PortalZaznam | null;
  web: string | null;
  poloha: (Poloha & { zastavka: string; zastavkaKm: number }) | null;
  okoli: SkolaVOkoli[];
  soubeh: { rok: number; obory: { nazev: string; uchazecu: number; radky: RadekSoubehu[] }[] } | null;
}

const MAX_KM_OKOLI = 20;

let nazvyCache: Map<string, { nazev: string; display: string; obec: string }> | null = null;
async function nazvySkol() {
  if (nazvyCache) return nazvyCache;
  const data = await getSchoolsData() as unknown as Record<string, Array<Record<string, unknown>>>;
  const mapa = new Map<string, { nazev: string; display: string; obec: string }>();
  for (const rok of Object.keys(data).sort().reverse()) {
    for (const z of data[rok] ?? []) {
      const r = String(z.redizo);
      if (!mapa.has(r)) mapa.set(r, { nazev: String(z.nazev ?? ''), display: String(z.nazev_display ?? z.nazev ?? ''), obec: String(z.obec ?? '') });
    }
  }
  nazvyCache = mapa;
  return mapa;
}

/**
 * Cesty musí být v kódu napsané doslova: Next.js podle nich při sestavení přibaluje soubory k funkci.
 * Cesta složená z proměnných částí by přibalila celý projekt včetně adresáře data/ (564 MB, PR #90).
 */
async function ctiSoubor<T>(soubor: string): Promise<T | null> {
  try {
    return JSON.parse(await fs.readFile(soubor, 'utf-8')) as T;
  } catch {
    return null;
  }
}

interface SouhrnySouborLehky {
  nabidky: Record<string, { redizo: string; kkov: string; zamereni: string; skupina: string; roky: Record<string, SouhrnRocniku> }>;
}
let skupinyCache: { rok: string; skupinyPodleSkoly: Map<string, Set<string>>; medianUmisteni: Map<string, number> } | null = null;
async function skupinySkol(rok: string) {
  if (skupinyCache?.rok === rok) return skupinyCache;
  const souhrny = await ctiSoubor<SouhrnySouborLehky>(path.join(process.cwd(), 'public', 'souhrny_kolo1.json'));
  const skupinyPodleSkoly = new Map<string, Set<string>>();
  const umisteni = new Map<string, number[]>();
  for (const n of Object.values(souhrny?.nabidky ?? {})) {
    const r = n.roky[rok];
    if (!r) continue;
    const skupina = r.skupina ?? n.skupina;
    const typ = skupina.split('_')[0];
    if (!skupinyPodleSkoly.has(n.redizo)) skupinyPodleSkoly.set(n.redizo, new Set());
    skupinyPodleSkoly.get(n.redizo)!.add(typ);
    if (typeof r.prumerne_umisteni_prijatych === 'number') {
      if (!umisteni.has(typ)) umisteni.set(typ, []);
      umisteni.get(typ)!.push(r.prumerne_umisteni_prijatych);
    }
  }
  const medianUmisteni = new Map<string, number>();
  umisteni.forEach((v, k) => {
    const s = [...v].sort((a, b) => a - b);
    medianUmisteni.set(k, s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2);
  });
  skupinyCache = { rok, skupinyPodleSkoly, medianUmisteni };
  return skupinyCache;
}

interface MaturitaSoubor {
  meta: { roky: number[]; nejnovejsi_rok: number };
  skupiny: Record<string, Record<string, { nazev: string; schools: number; medianPercentile: number | null; percentiles: number[] }>>;
  skoly: Record<string, { nazev: string; roky: Record<string, Record<string, MaturitaSkupinaRoku>> }>;
}
let maturitaCache: MaturitaSoubor | null | undefined;

/** Maturita se zobrazí, jen když registr sadu cermat-maturita přepnul na období a soubor existuje. */
async function maturitaSkoly(redizo: string): Promise<MaturitaSoubor['skoly'][string] & { soubor: MaturitaSoubor } | null> {
  const obdobi = await zobrazeneObdobi('cermat-maturita');
  if (!obdobi) return null;
  if (maturitaCache === undefined) maturitaCache = await ctiSoubor<MaturitaSoubor>(path.join(process.cwd(), 'public', 'maturita_skoly.json'));
  const skola = maturitaCache?.skoly[redizo];
  return skola && maturitaCache ? { ...skola, soubor: maturitaCache } : null;
}

type Lokace = { lat: number; lon: number; stop_name: string; distance_km: number };
let lokaceCache: Record<string, Lokace> | null = null;
async function lokace() {
  if (lokaceCache) return lokaceCache;
  const d = await ctiSoubor<{ schools: Record<string, Lokace> }>(path.join(process.cwd(), 'data', 'school_locations.json'));
  lokaceCache = d?.schools ?? {};
  return lokaceCache;
}

type SoubehSoubor = { data: Record<string, { uchazecu: number; soubeh: { klic: string; skola: string; obec: string; obor: string; uchazecu: number }[] }> };

function odkazSkoly(redizo: string, nazev: string) {
  return `/skola/${redizo}-${createSlug(nazev)}`;
}

/** Odkaz na obor ve stejném tvaru jako záložky oborů na stránce školy. */
export function odkazOboru(redizo: string, nazevSkoly: string, program: SchoolProgram, duplicitniNazev: boolean): string {
  const delka = duplicitniNazev ? program.delka_studia : undefined;
  return `/skola/${redizo}-${createSlug(nazevSkoly, program.obor, program.zamereni || undefined, delka)}`;
}

export async function getProfilSkoly(
  redizo: string,
  nazevSkoly: string,
  programy: SchoolProgram[],
  vypsaneIds: Set<string>,
): Promise<ProfilSkolyData> {
  const [nazvy, extrakce, csi, inspis, portal, web, lok, obdobiVysledku, platnost, obdobiUchazecu, maturita] = await Promise.all([
    nazvySkol(), getExtractionsByRedizo(redizo), getCSIDataByRedizo(redizo), getInspisDataByRedizo(redizo),
    getPortalZaznam(redizo), getWebSkoly(redizo), lokace(), zobrazeneObdobi('cermat-vysledky'),
    platnostObdobi('cermat-vysledky'), zobrazeneObdobi('cermat-uchazeci-kolo1'), maturitaSkoly(redizo),
  ]);
  const rok = obdobiVysledku ? Number(obdobiVysledku) : null;

  // ---------------------------------------------------------------- obory
  const pocetNazvu = new Map<string, number>();
  for (const p of programy) {
    const k = p.zamereni ? `${p.obor} - ${p.zamereni}` : p.obor;
    pocetNazvu.set(k, (pocetNazvu.get(k) ?? 0) + 1);
  }
  const obory: OborSkoly[] = await Promise.all(programy.map(async p => {
    const zakladNazvu = p.zamereni && p.zamereni !== p.obor ? `${p.obor} - ${p.zamereni}` : p.obor;
    const duplicitni = (pocetNazvu.get(p.zamereni ? `${p.obor} - ${p.zamereni}` : p.obor) ?? 0) > 1;
    const [s, druheKolo] = await Promise.all([getSouhrnNabidky(p.id), getDruheKolo(p.id, p.zamereni)]);
    const a = s?.aktualni;
    return {
      id: p.id,
      href: odkazOboru(redizo, nazevSkoly, p, duplicitni),
      nazev: zakladNazvu,
      delka: p.delka_studia,
      proKoho: proKohoObor(s?.skupina, p.delka_studia),
      skupina: s?.skupina ?? null,
      kapacita: a?.kapacita ?? null,
      prihlasky: a?.prihlasky ?? null,
      prijati: a?.prijati ?? null,
      soutezici: a ? soutezicichUchazecu(a) : null,
      zarazeni: a ? zarazeniObtiznosti(a) : null,
      predchoziRok: s?.predchoziRok ?? null,
      zarazeniPredchozi: s?.predchozi ? zarazeniObtiznosti(s.predchozi) : null,
      predchozi: s?.predchozi ? { prijati: s.predchozi.prijati ?? null, soutezici: soutezicichUchazecu(s.predchozi) } : null,
      tlak: a?.tlak_prvnich_voleb ?? null,
      cjPrijati: a?.cj_prijati ?? null,
      maPrijati: a?.ma_prijati ?? null,
      umisteniPrijatych: a?.prumerne_umisteni_prijatych ?? null,
      novy: !!p.is_new_2026,
      drivejsiNazev: p.prev_zamereni_name ?? null,
      vypsano: !!a || vypsaneIds.has(p.id),
      druheKolo,
    };
  }));

  // ---------------------------------------------------------------- maturita
  let maturitaVystup: MaturitaSkoly | null = null;
  if (maturita && rok) {
    const { soubor } = maturita;
    const skupinyRoku = await skupinySkol(String(rok));
    const smo16 = new Set<string>();
    Object.values(maturita.roky).forEach(r => Object.keys(r).forEach(k => k !== 'CELKEM' && smo16.add(k)));
    const posledniRok = String(soubor.meta.nejnovejsi_rok);
    maturitaVystup = {
      obdobi: 'jaro',
      roky: soubor.meta.roky,
      skupiny: [...smo16].sort().reverse().map(smo => {
        const sh = shrnutiMaturity(soubor.meta.roky, maturita.roky, smo);
        const ref = soubor.skupiny[posledniRok]?.[smo];
        // Vstup jen tam, kde se skupina maturity kryje se srovnatelnou skupinou přijímaček (gymnázia, lycea).
        const obor = obory.find(o => o.skupina?.split('_')[0] === smo && typeof o.umisteniPrijatych === 'number');
        const median = skupinyRoku.medianUmisteni.get(smo);
        return {
          ...sh,
          // CERMAT píše skupiny verzálkami („GYMNÁZIUM 8LETÉ“).
          nazev: ref?.nazev ? ref.nazev.charAt(0) + ref.nazev.slice(1).toLocaleLowerCase('cs-CZ') : smo,
          percentilySkupiny: ref?.percentiles ?? [],
          medianPercentilSkupiny: ref?.medianPercentile ?? null,
          skolVeSkupine: ref?.schools ?? null,
          vstup: obor && median !== undefined ? { umisteni: obor.umisteniPrijatych!, median, obor: `${obor.nazev} (${obor.delka}leté)` } : null,
        };
      }).filter(s => s.posledni),
    };
    if (maturitaVystup.skupiny.length === 0) maturitaVystup = null;
  }

  // ---------------------------------------------------------------- inspekce
  const posledni = [...extrakce].sort((x, y) => (y.date ?? '').localeCompare(x.date ?? ''))[0] as InspectionExtraction | undefined;
  const podpora = posledni?.hard_facts?.support_services;

  // ---------------------------------------------------------------- poloha a okolí
  const ja = lok[redizo];
  const poloha = ja ? { lat: ja.lat, lon: ja.lon, zastavka: ja.stop_name, zastavkaKm: ja.distance_km } : null;
  const skupiny = rok ? await skupinySkol(String(rok)) : null;
  const mojeTypy = skupiny?.skupinyPodleSkoly.get(redizo) ?? new Set<string>();

  let soubeh: ProfilSkolyData['soubeh'] = null;
  const soubehPodleSkoly = new Map<string, number>();
  if (obdobiUchazecu) {
    const rokUchazecu = Number(obdobiUchazecu);
    const soubor = await ctiSoubor<SoubehSoubor>(path.join(process.cwd(), 'public', `soubeh_prihlasek_${rokUchazecu}.json`));
    if (soubor) {
      const nazvyOboru = new Map(programy.map(p => [`${redizo}_${p.id.split('_')[1]}`, p]));
      const oboryS: NonNullable<ProfilSkolyData['soubeh']>['obory'] = [];
      for (const [klic, zaznam] of Object.entries(soubor.data)) {
        if (!klic.startsWith(`${redizo}_`)) continue;
        const program = nazvyOboru.get(klic);
        const radky: RadekSoubehu[] = await Promise.all(zaznam.soubeh.slice(0, 6).map(async r => {
          const r2 = r.klic.split('_')[0];
          const s2 = await souhrnOboru(r.klic.split('_').slice(0, 2).join('_'), rokUchazecu);
          const l2 = lok[r2];
          if (r2 !== redizo) soubehPodleSkoly.set(r2, Math.max(soubehPodleSkoly.get(r2) ?? 0, r.uchazecu));
          return {
            nazev: r.skola, obec: r.obec, obor: r.obor, uchazecu: r.uchazecu,
            km: ja && l2 && r2 !== redizo ? Math.round(vzdalenostKm(ja, l2) * 10) / 10 : null,
            href: nazvy.get(r2) ? odkazSkoly(r2, nazvy.get(r2)!.nazev) : null,
            tataSkola: r2 === redizo,
            zarazeni: s2 ? zarazeniObtiznosti(s2) : null,
            prijati: s2?.prijati ?? null,
            soutezici: s2 ? soutezicichUchazecu(s2) : null,
          };
        }));
        const nazev = program ? (program.zamereni && program.zamereni !== program.obor ? `${program.obor} - ${program.zamereni}` : program.obor) + (programy.filter(p => p.obor === program.obor).length > 1 ? `, ${program.delka_studia}leté` : '') : klic;
        oboryS.push({ nazev, uchazecu: zaznam.uchazecu, radky });
      }
      oboryS.sort((x, y) => y.uchazecu - x.uchazecu);
      if (oboryS.length) soubeh = { rok: rokUchazecu, obory: oboryS };
    }
  }

  const okoli: SkolaVOkoli[] = [];
  if (ja && skupiny) {
    for (const [r2, l2] of Object.entries(lok)) {
      if (r2 === redizo || !skupiny.skupinyPodleSkoly.has(r2)) continue;
      const km = vzdalenostKm(ja, l2);
      if (km > MAX_KM_OKOLI && !soubehPodleSkoly.has(r2)) continue;
      const n = nazvy.get(r2);
      const typy = skupiny.skupinyPodleSkoly.get(r2)!;
      okoli.push({
        redizo: r2, nazev: n?.display ?? r2, obec: n?.obec ?? '', href: n ? odkazSkoly(r2, n.nazev) : '#',
        km: Math.round(km * 10) / 10, smer: smerStupne(ja, l2),
        podobna: [...typy].some(t => mojeTypy.has(t)), soubeh: soubehPodleSkoly.get(r2) ?? 0,
      });
    }
    okoli.sort((x, y) => x.km - y.km);
  }

  return {
    redizo,
    rok,
    platnostDat: platnost,
    obory,
    maturita: maturitaVystup,
    inspekce: posledni ? {
      datum: posledni.date,
      souhrn: posledni.plain_czech_summary,
      silne: (posledni.strengths ?? []).slice(0, 3),
      rizika: (posledni.risks ?? []).slice(0, 3),
      sedi: (posledni.who_school_fits ?? []).slice(0, 4),
      opatrne: (posledni.who_should_be_cautious ?? []).slice(0, 4),
      otazky: (posledni.questions_for_open_day ?? []).slice(0, 4),
      zmena: posledni.school_profile?.school_change_summary ?? null,
      podpora: Array.isArray(podpora) ? (podpora as string[]).slice(0, 4) : [],
    } : null,
    inspekceSeznam: csi,
    inspis,
    portal,
    web,
    poloha,
    okoli,
    soubeh,
  };
}
