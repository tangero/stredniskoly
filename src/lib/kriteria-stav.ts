/** Zdroj pravidla se uvádí odděleně od roku, pro který pravidlo platí. */
export type ZdrojPravidla = 'skola' | 'dipsy_pdf' | 'web_skoly' | 'rss' | 'hlaseni_chyby' | 'jiny';

export interface DolozenePravidlo {
  id: string;
  oborKlic: string;
  rok: number;
  kolo: number | null;
  rezim: 'pouze_jpz' | 'jine';
  popis: string;
  zdroj: ZdrojPravidla;
  zdrojUrl: string;
  zjistenoAt: string;
  publikovanoAt: string | null;
  overenoAt: string | null;
  /** Nové pozorování téhož zdroje s jiným nebo neznámým obsahem čeká na kontrolu. */
  novaVerzeAt?: string | null;
}

export type StavKriterii =
  | { stav: 'aktualni'; rok: number; pravidla: DolozenePravidlo[] }
  | { stav: 'historicka'; rok: number; pravidla: DolozenePravidlo[]; vyssiPrioritaOvereni: boolean }
  | { stav: 'zmena_k_overeni'; rok: number; pravidla: DolozenePravidlo[] }
  | { stav: 'rozpor'; rok: number; pravidla: DolozenePravidlo[] }
  | { stav: 'nezname'; rok: number; pravidla: [] };

/**
 * Pravidla platná pro rok a kolo. Konkrétní kolo nahrazuje společné pravidlo
 * jen v rámci téhož zdroje; pravidla jiných zdrojů zůstanou k porovnání.
 */
function proRokAKolo(pravidla: DolozenePravidlo[], oborKlic: string, rok: number, kolo: number | null): DolozenePravidlo[] {
  const nalezena = pravidla.filter((p) => p.oborKlic === oborKlic && p.rok === rok);
  if (kolo === null) return nalezena.filter((p) => p.kolo === null);
  const zdroje = [...new Set(nalezena.map((p) => p.zdroj))];
  return zdroje.flatMap((zdroj) => {
    const zeZdroje = nalezena.filter((p) => p.zdroj === zdroj);
    const presne = zeZdroje.filter((p) => p.kolo === kolo);
    return presne.length ? presne : zeZdroje.filter((p) => p.kolo === null);
  });
}

function shodna(pravidla: DolozenePravidlo[]): boolean {
  return pravidla.every((p) => p.rezim === pravidla[0].rezim);
}

/** Starý ročník je pouze kontext, nikdy potvrzení nového roku. */
export function stavKriterii(
  pravidla: DolozenePravidlo[], oborKlic: string, rok: number, kolo: number | null,
): StavKriterii {
  const aktualni = proRokAKolo(pravidla, oborKlic, rok, kolo);
  if (aktualni.length) {
    if (!shodna(aktualni)) return { stav: 'rozpor', rok, pravidla: aktualni };
    if (aktualni.some((p) => p.novaVerzeAt)) return { stav: 'zmena_k_overeni', rok, pravidla: aktualni };
    return { stav: 'aktualni', rok, pravidla: aktualni };
  }
  const historicka = proRokAKolo(pravidla, oborKlic, rok - 1, kolo);
  if (historicka.length) {
    if (!shodna(historicka)) return { stav: 'rozpor', rok: rok - 1, pravidla: historicka };
    if (historicka.some((p) => p.novaVerzeAt)) return { stav: 'zmena_k_overeni', rok: rok - 1, pravidla: historicka };
    return {
      stav: 'historicka', rok: rok - 1, pravidla: historicka,
      vyssiPrioritaOvereni: historicka[0].rezim === 'jine',
    };
  }
  return { stav: 'nezname', rok, pravidla: [] };
}

export function nazevZdrojeKriterii(zdroj: ZdrojPravidla): string {
  switch (zdroj) {
    case 'skola': return 'škola v portálu';
    case 'dipsy_pdf': return 'kritéria v DiPSy';
    case 'web_skoly': return 'web školy';
    case 'rss': return 'RSS školy';
    case 'hlaseni_chyby': return 'podnět čtenáře';
    case 'jiny': return 'jiný zdroj';
  }
}

export function odkazNaPodklad(hodnota: string): string | null {
  try {
    const url = new URL(hodnota);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch {
    return null;
  }
}
