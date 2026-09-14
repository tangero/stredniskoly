/**
 * Výklad dat na stránce školy: ročník a délka oboru, typ školy slovy, vzdálenost a směr
 * okolních škol a shrnutí maturity přes roky. Čisté funkce bez přístupu k souborům.
 * Návrh: docs/stranka-skoly-2027.md, pojmy: docs/slovnik-pojmu.md, ukazatele: docs/slovnik-ukazatelu.md.
 */

export interface Poloha {
  lat: number;
  lon: number;
}

/** Vzdálenost vzdušnou čarou v kilometrech. */
export function vzdalenostKm(a: Poloha, b: Poloha): number {
  const rad = (x: number) => (x * Math.PI) / 180;
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2
    + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lon - a.lon) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

/** Směr z a do b ve stupních, 0 = sever, po směru hodinových ručiček. */
export function smerStupne(a: Poloha, b: Poloha): number {
  const rad = (x: number) => (x * Math.PI) / 180;
  const y = Math.sin(rad(b.lon - a.lon)) * Math.cos(rad(b.lat));
  const x = Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) - Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lon - a.lon));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/** Ze které třídy se na obor hlásí, podle srovnatelné skupiny souhrnů („GY8_8“). */
export function proKohoObor(skupina: string | null | undefined, delka: number): string {
  const typ = (skupina ?? '').split('_')[0];
  if (typ === 'GY8' || delka === 8) return 'z 5. třídy';
  if (typ === 'GY6' || delka === 6) return 'ze 7. třídy';
  if (typ === 'NAS') return 'po vyučení';
  return 'z 9. třídy';
}

export function delkaSlovy(delka: number): string {
  if (delka === 1) return '1 rok';
  if (delka >= 2 && delka <= 4) return `${delka} roky`;
  return `${delka} let`;
}

const DELKA_PRIDAVNE: Record<number, string> = { 2: 'dvouleté', 3: 'tříleté', 4: 'čtyřleté', 5: 'pětileté', 6: 'šestileté', 8: 'osmileté' };

/** „Gymnázium osmileté a čtyřleté, technické lyceum“: obory školy podle názvu, délky jen u opakovaného názvu. */
export function oboryVetou(obory: { obor: string; delka: number }[], nejvic = 4): string {
  const podleNazvu = new Map<string, number[]>();
  for (const o of obory) {
    const delky = podleNazvu.get(o.obor) ?? [];
    if (!delky.includes(o.delka)) delky.push(o.delka);
    podleNazvu.set(o.obor, delky);
  }
  const casti = [...podleNazvu.entries()].map(([nazev, delky], i) => {
    const jmeno = i === 0 ? nazev : nazev.charAt(0).toLowerCase() + nazev.slice(1);
    if (delky.length < 2) return jmeno;
    const slova = delky.sort((a, b) => b - a).map(d => DELKA_PRIDAVNE[d] ?? `${d}leté`);
    return `${jmeno} ${slova.slice(0, -1).join(', ')} a ${slova.at(-1)}`;
  });
  const zbytek = casti.length - nejvic;
  const zobrazene = casti.slice(0, nejvic);
  if (zbytek > 0) return `${zobrazene.join(', ')} a ${zbytek} ${zbytek === 1 ? 'další obor' : zbytek < 5 ? 'další obory' : 'dalších oborů'}`;
  // Když už část spojku „a“ obsahuje („osmileté a čtyřleté“), další obor se připojí čárkou.
  const spojka = zobrazene.slice(0, -1).some(c => c.includes(' a ')) ? ', ' : ' a ';
  return zobrazene.length > 1 ? `${zobrazene.slice(0, -1).join(', ')}${spojka}${zobrazene.at(-1)}` : zobrazene[0] ?? '';
}

export function pocetOboru(n: number): string {
  return `${n} ${n === 1 ? 'obor' : n >= 2 && n <= 4 ? 'obory' : 'oborů'}`;
}

// ------------------------------------------------------------------ maturita

export type StavProtiSkupine = 'above' | 'indistinguishable' | 'below';

export interface MaturitaPredmet {
  registered?: number;
  took?: number;
  passed?: number;
  failed?: number;
  absent?: number;
  passRate?: number;
  grossFailureRate?: number;
  nonParticipationRate?: number;
  averagePercentScore?: number;
  standardDeviation?: number;
  averagePercentile?: number;
  subjectChoiceShare?: number;
  quality?: 'complete' | 'small_sample' | 'counts_only' | 'unavailable';
  groupComparison?: { state: StavProtiSkupine; interval: [number, number]; medianPercentScore: number; schools: number };
}

export interface MaturitaSkupinaRoku {
  spolecna_cast?: MaturitaPredmet;
  cj?: MaturitaPredmet;
  ma?: MaturitaPredmet;
}

export interface RokMaturity {
  rok: number;
  zaznam: MaturitaSkupinaRoku | null;
  stav: StavProtiSkupine | null;
}

export interface ShrnutiMaturity {
  smo16: string;
  roky: RokMaturity[];
  posledni: { rok: number; zaznam: MaturitaSkupinaRoku } | null;
  letNad: number;
  letSeZarazenim: number;
}

/**
 * Zařazení školy ve skupině oborů přes posledních `pocet` zveřejněných jarních období.
 * Roky bez zařazení se nepočítají jako „ne nad skupinou“ (slovník ukazatelů, Počet let nad skupinou oborů).
 */
export function shrnutiMaturity(
  rokyZdroje: number[],
  skola: Record<string, Record<string, MaturitaSkupinaRoku>>,
  smo16: string,
  pocet = 4,
): ShrnutiMaturity {
  const roky = [...rokyZdroje].sort((a, b) => a - b).slice(-pocet).map(rok => {
    const zaznam = skola[String(rok)]?.[smo16] ?? null;
    return { rok, zaznam, stav: zaznam?.cj?.groupComparison?.state ?? null };
  });
  const sDaty = roky.filter(r => r.zaznam);
  const posledniRok = sDaty.at(-1);
  return {
    smo16,
    roky,
    posledni: posledniRok ? { rok: posledniRok.rok, zaznam: posledniRok.zaznam! } : null,
    letNad: roky.filter(r => r.stav === 'above').length,
    letSeZarazenim: roky.filter(r => r.stav).length,
  };
}

export const STAV_POPISEK: Record<StavProtiSkupine, string> = {
  above: 'nad skupinou',
  indistinguishable: 'nerozlišitelné od skupiny',
  below: 'pod skupinou',
};

/** „ve 3 ze 4 let“, „ve všech 4 letech“, „v roce 2026“. */
export function letNadSlovy(s: ShrnutiMaturity): string {
  if (s.letSeZarazenim === 0) return '';
  if (s.letSeZarazenim === 1) {
    const r = s.roky.find(x => x.stav)!;
    return r.stav === 'above' ? `v roce ${r.rok}` : `v žádném roce, v roce ${r.rok} ${STAV_POPISEK[r.stav!]}`;
  }
  if (s.letNad === s.letSeZarazenim) return `ve všech ${s.letSeZarazenim} letech`;
  const nad = s.roky.filter(r => r.stav === 'above').map(r => r.rok);
  const sZarazenim = s.roky.filter(r => r.stav).map(r => r.rok);
  // Nad skupinou jen v posledních letech za sebou: jmenovat roky místo počtu.
  if (nad.length >= 1 && nad.length <= 2 && sZarazenim.slice(-nad.length).join() === nad.join()) {
    return nad.length === 1 ? `v roce ${nad[0]}` : `v letech ${nad[0]} a ${nad[1]}`;
  }
  if (s.letNad === 0) return `v žádném ze ${s.letSeZarazenim} let`;
  return `${s.letNad >= 2 && s.letNad <= 4 ? 've' : 'v'} ${s.letNad} ze ${s.letSeZarazenim} let`;
}
