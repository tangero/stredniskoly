'use client';

import { useSyncExternalStore, type ReactNode } from 'react';

/**
 * Obory školy ve skupinách podle toho, čím studium končí, s přepínačem (issue #393). Pořadí skupin je
 * pevné. Volba se pamatuje v prohlížeči, takže platí i na další škole; bez úložiště zůstane „Vše“.
 */
export interface SkupinaOboru {
  id: string;
  nazev: string;
  pocet: number;
  /** Popisek pod nadpisem skupiny, například „8 oborů · 260 míst“. */
  souhrn: string;
  obsah: ReactNode;
}

const KLIC = 'skupina-oboru';
const UDALOST = 'skupina-oboru-zmena';
/** Volba v rámci stránky, když úložiště prohlížeče nejde použít. */
const vPameti = () => (window as unknown as { __skupinaOboru?: string }).__skupinaOboru ?? null;

function odebirat(zmena: () => void) {
  window.addEventListener(UDALOST, zmena);
  window.addEventListener('storage', zmena);
  return () => {
    window.removeEventListener(UDALOST, zmena);
    window.removeEventListener('storage', zmena);
  };
}

function ctiUlozenou(): string | null {
  try {
    return window.localStorage.getItem(KLIC) ?? vPameti();
  } catch {
    // Bez úložiště (soukromé okno, zakázané soubory webu) platí volba jen na této stránce.
    return vPameti();
  }
}

/** Uloží volbu do prohlížeče, a když to nejde, aspoň do paměti stránky; pak dá vědět přepínačům. */
function ulozVolbu(id: string) {
  (window as unknown as { __skupinaOboru?: string }).__skupinaOboru = id;
  try {
    window.localStorage.setItem(KLIC, id);
  } catch {
    // Bez úložiště se volba neuloží; platí jen na této stránce.
  }
  window.dispatchEvent(new Event(UDALOST));
}

export function SkupinyOboru({ skupiny }: { skupiny: SkupinaOboru[] }) {
  // Server a první vykreslení v prohlížeči ukážou „Vše“; uložená volba se projeví hned po hydrataci.
  const ulozena = useSyncExternalStore(odebirat, ctiUlozenou, () => null);
  // Skupinu, kterou tahle škola nemá, nelze vybrat; ukážou se všechny obory.
  const vybrana = ulozena && skupiny.some(s => s.id === ulozena) ? ulozena : 'vse';


  const celkem = skupiny.reduce((s, x) => s + x.pocet, 0);
  const tlacitka = [{ id: 'vse', nazev: 'Vše', pocet: celkem }, ...skupiny];
  return (
    <div className="space-y-5">
      <div role="group" aria-label="Zobrazit obory" className="flex flex-wrap gap-2">
        {tlacitka.map(t => (
          <button
            key={t.id}
            type="button"
            aria-pressed={vybrana === t.id}
            onClick={() => ulozVolbu(t.id)}
            className={`inline-flex h-10 items-center gap-1.5 rounded-full border px-4 text-[15px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0074e4] ${vybrana === t.id ? 'border-[#16325c] bg-[#16325c] text-white' : 'border-slate-300 bg-white text-[#16325c] hover:border-[#16325c]'}`}
          >
            {t.nazev}
            <span className={`tabular-nums ${vybrana === t.id ? 'text-white/80' : 'text-slate-500'}`}>{t.pocet}</span>
          </button>
        ))}
      </div>
      {skupiny.map(s => (
        <section key={s.id} aria-labelledby={`skupina-${s.id}`} hidden={vybrana !== 'vse' && vybrana !== s.id} className="space-y-2.5">
          <h3 id={`skupina-${s.id}`} className="flex flex-wrap items-baseline gap-x-3 text-[18px] font-bold text-[#16325c]">
            {s.nazev}
            <span className="text-[14px] font-normal text-slate-600">{s.souhrn}</span>
          </h3>
          {s.obsah}
        </section>
      ))}
    </div>
  );
}
