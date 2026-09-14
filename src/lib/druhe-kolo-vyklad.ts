/**
 * Věty o 2. kole pro stránku oboru, stránku školy a otevřená data. Návrh a situace nabídky:
 * docs/druhe-kolo.md, oddíl 2; pojmy: docs/slovnik-pojmu.md. Čisté funkce bez přístupu k souborům.
 *
 * Pravidla: čísla 2. kola se nesčítají s 1. kolem, blok nepředpovídá, zda 2. kolo bude,
 * nejnižší přijatý výsledek jen při aspoň deseti přijatých s výsledkem (hlídá import).
 */
import type { DruheKoloNabidky, ZaznamDruhehoKola } from './druhe-kolo';

const cislo = (v: number) => v.toLocaleString('cs-CZ', { maximumFractionDigits: 1 });
function tvar(n: number, jeden: string, dva: string, pet: string) {
  return n === 1 ? jeden : n >= 2 && n <= 4 ? dva : pet;
}
const mist = (n: number) => `${cislo(n)} ${tvar(n, 'místo', 'místa', 'míst')}`;
const uchazecu = (n: number) => `${cislo(n)} ${tvar(n, 'uchazeč', 'uchazeči', 'uchazečů')}`;

export interface VetyDruhehoKola {
  /** Hlavní věta situace. */
  hlavni: string;
  /** Doplňující věty: kdo se nevešel, proč nikdo nebyl přijat, nejnižší přijatý výsledek. */
  doplnky: string[];
  /** Věta o předchozím roce, pokud je v datech. */
  predchozi: string | null;
  /** Krátký řádek pro seznam oborů na stránce školy. */
  kratce: string;
}

function vetaOPredchozimRoce(rok: number, predchozi: ZaznamDruhehoKola | null, letos: ZaznamDruhehoKola): string | null {
  if (!predchozi) return null;
  const vypsanoLetos = letos.stav === 'vypsano';
  if (predchozi.stav === 'vypsano') {
    return `V roce ${rok - 1} škola 2. kolo ${vypsanoLetos ? 'vypsala také' : 'vypsala'}: ${mist(predchozi.kapacita)}, přijato ${cislo(predchozi.prijati)}.`;
  }
  return `V roce ${rok - 1} škola 2. kolo ${vypsanoLetos ? 'nevypsala' : 'také nevypsala'}.`;
}

export function vetyDruhehoKola({ rok, zaznam, predchozi }: DruheKoloNabidky): VetyDruhehoKola {
  const predchoziVeta = vetaOPredchozimRoce(rok, predchozi, zaznam);

  if (zaznam.stav === 'nenaplneno_bez_2_kola') {
    return {
      hlavni: `V 1. kole ${rok} škola přijala ${cislo(zaznam.kolo1_prijati)} ${tvar(zaznam.kolo1_prijati, 'uchazeče', 'uchazeče', 'uchazečů')} na ${mist(zaznam.kolo1_kapacita)}, a přesto 2. kolo nevypsala. Volná místa po 1. kole neznamenají, že 2. kolo bude.`,
      doplnky: [],
      predchozi: predchoziVeta,
      kratce: `2. kolo ${rok} škola nevypsala, i když v 1. kole zbyla místa`,
    };
  }
  if (zaznam.stav === 'bez_2_kola') {
    return {
      hlavni: `Obor se v roce ${rok} naplnil v 1. kole a 2. kolo škola nevypsala.`,
      doplnky: [],
      predchozi: predchoziVeta,
      kratce: `2. kolo ${rok} nebylo, obor se naplnil v 1. kole`,
    };
  }

  const z = zaznam;
  const doplnky: string[] = [];
  let hlavni: string;
  if (z.prihlasky === 0) {
    hlavni = `Ve 2. kole ${rok} škola vypsala ${mist(z.kapacita)}, ale nikdo se nepřihlásil.`;
  } else {
    hlavni = `Ve 2. kole ${rok} škola vypsala ${mist(z.kapacita)}. Přišlo ${cislo(z.prihlasky)} ${tvar(z.prihlasky, 'přihláška', 'přihlášky', 'přihlášek')} a ${tvar(z.prijati, 'přijat byl', 'přijati byli', 'přijato bylo')} ${cislo(z.prijati)}.`;
    if (z.neveslo_se > 0) {
      doplnky.push(`${uchazecu(z.neveslo_se)} ${tvar(z.neveslo_se, 'se nevešel', 'se nevešli', 'se nevešlo')} kvůli kapacitě ani ve 2. kole, takže ani to není jistota.`);
    } else if (z.prijati >= z.kapacita) {
      doplnky.push('Místa ve 2. kole se zaplnila.');
    }
    if (z.prijati < z.prihlasky && z.neveslo_se === 0) {
      const duvody = [
        z.prijato_na_vyssi_prioritu > 0 ? `${cislo(z.prijato_na_vyssi_prioritu)} ${tvar(z.prijato_na_vyssi_prioritu, 'se dostal', 'se dostali', 'se dostalo')} na obor, který ${tvar(z.prijato_na_vyssi_prioritu, 'měl', 'měli', 'měli')} na přihlášce výš` : null,
        z.nesplnilo_podminky > 0 ? `${cislo(z.nesplnilo_podminky)} ${tvar(z.nesplnilo_podminky, 'nedosáhl', 'nedosáhli', 'nedosáhlo')} požadavku školy` : null,
      ].filter(Boolean);
      if (duvody.length) doplnky.push(`Ze zbylých uchazečů ${duvody.join(', a ')}.`);
    }
  }
  if (z.min_prijaty !== undefined) {
    doplnky.push(`Nejnižší výsledek mezi přijatými ve 2. kole byl ${cislo(z.min_prijaty)} bodů ze 100 (součet češtiny a matematiky).`);
  }
  return {
    hlavni,
    doplnky,
    predchozi: predchoziVeta,
    kratce: z.prihlasky === 0
      ? `2. kolo ${rok}: ${mist(z.kapacita)}, nikdo se nepřihlásil`
      : `2. kolo ${rok}: ${mist(z.kapacita)}, přijato ${cislo(z.prijati)}${z.neveslo_se ? `, ${cislo(z.neveslo_se)} se ${tvar(z.neveslo_se, 'nevešel', 'nevešli', 'nevešlo')}` : ''}`,
  };
}

export const VYSVETLENI_DRUHEHO_KOLA = 'Když se obor v 1. kole nenaplní, škola může vypsat 2. kolo. Čísla popisují denní studium a nejsou předpovědí pro další rok.';
