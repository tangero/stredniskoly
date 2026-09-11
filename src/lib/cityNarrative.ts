import type { CityStats } from './cityData';

export interface CityNarrative {
  celkovyObraz: string;
  gymnazia: string;
  odborneSkoly: string;
  koneknurence: string;
  trendVyvoj: string;
}

/** Text odvozený z právě zobrazených dat; nepoužívá neověřenou starou AI cache. */
export async function generateCityNarrative(stats: CityStats): Promise<CityNarrative> {
  const n = (value: number) => value.toLocaleString('cs-CZ');
  const { totals, byType } = stats;
  const gym = byType.filter(t => ['GY4', 'GY6', 'GY8'].includes(t.typ));
  return {
    celkovyObraz: `U historických oborů, které se podařilo spárovat s prvním kolem 2026, evidujeme ${n(totals.kapacita2026)} míst a ${n(totals.prihlasky2026)} přihlášek. Městský přehled vychází z nabídky 2025, proto nezahrnuje všechny nové či přejmenované obory roku 2026.`,
    gymnazia: `U gymnázií je k dispozici průměrné skóre pro ${n(gym.reduce((sum, t) => sum + t.cermatCount, 0))} spárovaných oborů a zaměření. Průměr přijatých není minimem nutným k přijetí. Pořadí podle skóre nehodnotí kvalitu výuky.`,
    odborneSkoly: 'Výsledky JPZ se vztahují na denní nezkrácené obory s povinnou jednotnou zkouškou. Chybějící údaj u odborné školy neznamená nulovou kapacitu nebo nulový zájem; učební a další obory bez JPZ zatím nemají v tomto přehledu úplné pokrytí.',
    koneknurence: 'Počet přihlášek není počtem unikátních dětí. Z rozdílu přihlášek a přijatých nelze určit počet nepřijatých osob ani osobní pravděpodobnost přijetí. O výsledku rozhoduje školní hodnocení a přiřazení podle priorit uchazeče.',
    trendVyvoj: 'Při srovnání let sleduj dostupnost údajů a shodu konkrétního oboru a zaměření. Změna součtu při odlišném pokrytí není sama o sobě růstem ani poklesem nabídky. Údaje 2026 nejsou vyhlášenými kapacitami pro rok 2027.',
  };
}
