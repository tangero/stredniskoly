'use client';

import { useState } from 'react';

type Stav = 'dnes' | 'doplneno';

interface ProfilUkazkaProps {
  /** Popisek datového zdroje, ze kterého bez školy pochází starší údaj. */
  starsiZdroj: string;
}

interface Radek {
  label: string;
  dnes: string;
  doplneno: string;
  odkaz?: boolean;
}

const RADKY: Radek[] = [
  {
    label: 'Dny otevřených dveří',
    dnes: 'starší údaj, rok neověřen',
    doplneno: 'Úterý 18. listopadu a sobota 10. ledna, vždy 9–13 h',
  },
  {
    label: 'Kritéria přijetí',
    dnes: 'nemáme',
    doplneno: 'Jednotná zkouška 70 %, prospěch z 8. a 9. třídy 30 %',
  },
  {
    label: 'Plné znění kritérií',
    dnes: 'nemáme',
    doplneno: 'Vyhlášená kritéria na webu školy',
    odkaz: true,
  },
  {
    label: 'Přijímačky nanečisto',
    dnes: 'nemáme',
    doplneno: 'Každou středu od října, přihlášky přes web školy',
  },
  {
    label: 'Ubytování',
    dnes: 'neuvedeno',
    doplneno: 'Vlastní domov mládeže, 80 míst',
  },
];

/**
 * Ukázka, jak se profil školy změní, když škola doplní údaje. Obsah je smyšlený
 * a výslovně označený jako ukázka; nejde o údaje žádné skutečné školy.
 */
export function ProfilUkazka({ starsiZdroj }: ProfilUkazkaProps) {
  const [stav, setStav] = useState<Stav>('doplneno');
  const doplneno = stav === 'doplneno';

  return (
    <figure className="relative">
      <div
        role="group"
        aria-label="Přepnout ukázku profilu"
        className="mb-3 inline-flex rounded-full bg-white p-1 ring-1 ring-[#d5deea]"
      >
        {(
          [
            ['dnes', 'Bez školy'],
            ['doplneno', 'Po doplnění školou'],
          ] as const
        ).map(([hodnota, popisek]) => (
          <button
            key={hodnota}
            type="button"
            aria-pressed={stav === hodnota}
            onClick={() => setStav(hodnota)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
              stav === hodnota ? 'bg-[#16325c] text-white' : 'text-[#4a5a6c] hover:text-[#16325c]'
            }`}
          >
            {popisek}
          </button>
        ))}
      </div>

      <div className="relative overflow-hidden rounded-lg bg-white shadow-[0_1px_0_#d5deea,0_18px_40px_-24px_rgba(22,50,92,0.45)] ring-1 ring-[#d5deea]">
        <div className="border-b border-[#e3e9f1] px-5 py-6 sm:px-6">
          <p className="text-xs text-[#6b7a8c]">Ukázka stránky školy</p>
          <p className="text-lg font-bold text-[#16325c]">Vaše škola</p>
        </div>

        <dl aria-live="polite" className="divide-y divide-[#eef2f7] px-5 sm:px-6">
          {RADKY.map((r) => (
            <div key={r.label} className="grid gap-1 py-3 sm:grid-cols-[10.5rem_1fr] sm:gap-4">
              <dt className="text-sm text-[#6b7a8c]">{r.label}</dt>
              <dd className="text-[0.95rem] leading-snug sm:min-h-[2.6rem]">
                {doplneno ? (
                  r.odkaz ? (
                    <span className="font-semibold text-[#0074e4] underline decoration-[#0074e4]/30 underline-offset-4">
                      {r.doplneno}
                    </span>
                  ) : (
                    <span className="text-[#1d2b3a]">{r.doplneno}</span>
                  )
                ) : (
                  <span className="text-[#6f7c8c] italic">{r.dnes}</span>
                )}
              </dd>
            </div>
          ))}
        </dl>

        <p className="border-t border-[#e3e9f1] bg-[#f7f9fc] px-5 py-3 text-xs text-[#6b7a8c] sm:px-6">
          {doplneno
            ? 'Údaje potvrdila škola 3. listopadu. Na stránce stojí odděleně od statistik přijímacího řízení.'
            : `Bez školy ukazujeme jen to, co je v datových zdrojích, například ${starsiZdroj}.`}
        </p>

        {doplneno && (
          <div
            aria-hidden="true"
            className="razitko pointer-events-none absolute right-4 top-3 sm:right-6 sm:top-3.5"
          >
            <div className="rounded-md border-[3px] border-[#4338a8] bg-white/40 p-[3px]">
              <div className="rounded-[3px] border border-[#4338a8] px-4 py-2 text-center leading-none text-[#4338a8]">
                <span className="block text-[0.85rem] font-bold uppercase tracking-[0.16em]">Potvrzeno</span>
                <span className="mt-0.5 block text-[0.85rem] font-bold uppercase tracking-[0.16em]">školou</span>
                <span className="mt-1.5 block text-xs font-semibold">3. 11.</span>
              </div>
            </div>
          </div>
        )}
      </div>
      <figcaption className="sr-only">
        Ukázka se smyšlenými údaji: jak se stránka školy změní, když škola doplní údaje.
      </figcaption>
    </figure>
  );
}
