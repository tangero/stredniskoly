import type { ReactNode } from 'react';

/** Termín, kdy školy zveřejní kritéria nového řízení (harmonogram MŠMT, událost ss-kriteria). */
export interface TerminKriterii { datum: string; rok: number }

interface Props {
  /** Rok pásem 1. kola z registru (sada cermat-uchazeci-kolo1). */
  rokPasem: number;
  /** Rok přepsaných kritérií z registru (sada dipsy-kriteria); null, když přepis není. */
  rokKriterii: number | null;
  terminKriterii: TerminKriterii | null;
  /** Uchazeč zadal aspoň jeden výsledek bez převodu (jiný test než TAU nebo odhad). */
  jinyTest: boolean;
}

/**
 * Krok 3 Simulátoru přijímaček: výhrady, které platí pro každou skupinu.
 * Návrh simulátoru oddíl 5; čísla podle slovníku ukazatelů (Převedený výsledek testu,
 * Nejnižší výsledek JPZ mezi přijatými, Podíl přijímaček na bodování, Poloha vůči pásmu).
 */
export function VyhradySimulatoru({ rokPasem, rokKriterii, terminKriterii, jinyTest }: Props) {
  type Bod = { key: string; text: ReactNode };
  const body = ([
    { key: 'stres', text: <><strong>Na ostrém testu, tedy u jednotné přijímací zkoušky v termínu přijímaček, působí stres a čas.</strong> Doma píšeš bez tlaku a aplikace TAU dovoluje opravy, takže výsledek z domova vychází spíš lepší než u zkoušky.</> },
    { key: 'prevod', text: <><strong>Převod předpokládá, že jsi test psal celý, na čas, bez oprav a poprvé.</strong> Když ne, převedený výsledek, tedy body, které by to byly v roce {rokPasem}, tvůj skutečný výsledek přeceňuje.</> },
    { key: 'rocnik', text: <><strong>Skupiny popisují 1. kolo {rokPasem}, ne předpověď.</strong> Nejnižší výsledek přijatých se u oboru mezi dvěma posledními ročníky posunul typicky o 5 bodů, u šestiny oborů o víc než 10.</> },
    rokKriterii !== null ? {
      key: 'kriteria',
      text: <><strong>Kritéria {rokKriterii} jsou strojový přepis PDF z DiPSy.</strong> Kontrola vzorku našla podstatnou chybu zhruba u každého desátého přepisu. Školy kritéria mění{terminKriterii ? <>; pro přijímačky {terminKriterii.rok} je zveřejní {terminKriterii.datum} {terminKriterii.rok}</> : null}. Ověř si je u školy.</>,
    } : null,
    { key: 'jiny', text: <><strong>Body z jiného testu než TAU nebo odhad se nepřevádějí.</strong> Srovnání pak platí jen, pokud byl test stejně těžký jako ostrý test {rokPasem}.{jinyTest ? ' Takový výsledek jsi zadal.' : ''}</> },
    { key: 'zamereni', text: <><strong>Data uchazečů neznají zaměření.</strong> Skupina platí za obor školy jako celek, ne za jednotlivé zaměření.</> },
  ] as Array<Bod | null>).filter((x): x is Bod => x !== null);

  return (
    <section id="vyhrady" aria-labelledby="krok-3" className="mt-8 scroll-mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 sm:p-5">
      <h2 id="krok-3" className="text-xl font-bold text-slate-900">3. Přečti si výhrady</h2>
      <p className="mt-1 text-sm text-slate-700">Výsledek z domova není výsledek zkoušky. Simulátor nepočítá šanci na přijetí.</p>
      <ul className="mt-3 max-w-3xl list-disc space-y-2 pl-5 text-sm text-slate-800">
        {body.map(b => <li key={b.key}>{b.text}</li>)}
      </ul>
    </section>
  );
}

/** Zkrácená výhrada nad výsledky; odkazuje na celý blok. */
export function VyhradaNahore({ rokPasem }: { rokPasem: number }) {
  return (
    <p className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
      <strong>Výsledek z domova není výsledek zkoušky.</strong> Skupiny popisují 1. kolo {rokPasem}, ne předpověď.{' '}
      <a href="#vyhrady" className="inline-block min-h-6 underline focus-visible:outline-2 focus-visible:outline-blue-600">Přečti si výhrady</a>
    </p>
  );
}
