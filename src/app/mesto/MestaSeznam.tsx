'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

export interface MestoKarta {
  nazev: string;
  slug: string;
  kraj: string;
  skol: number;
  nabidek: number;
}

function bezDiakritiky(text: string) {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function skolySlovem(n: number) {
  return n === 1 ? 'škola' : n < 5 ? 'školy' : 'škol';
}

/**
 * Seznam měst s filtračním polem a seskupením podle kraje.
 *
 * Měst je přes sto, takže samotná mřížka karet je nepřehledná: rodina hledá
 * „něco u nás“ a kraj je nejbližší vodítko.
 */
export function MestaSeznam({ mesta }: { mesta: MestoKarta[] }) {
  const [dotaz, setDotaz] = useState('');

  const nalezena = useMemo(() => {
    const q = bezDiakritiky(dotaz.trim());
    if (!q) return mesta;
    return mesta.filter(m => bezDiakritiky(m.nazev).includes(q) || bezDiakritiky(m.kraj).includes(q));
  }, [mesta, dotaz]);

  const podleKraje = useMemo(() => {
    const m = new Map<string, MestoKarta[]>();
    for (const mesto of nalezena) {
      m.set(mesto.kraj, [...(m.get(mesto.kraj) ?? []), mesto]);
    }
    return [...m.entries()]
      .map(([kraj, seznam]) => ({
        kraj,
        seznam: [...seznam].sort((a, b) => a.nazev.localeCompare(b.nazev, 'cs')),
      }))
      .sort((a, b) => a.kraj.localeCompare(b.kraj, 'cs'));
  }, [nalezena]);

  return (
    <div>
      <div className="mb-8">
        <label htmlFor="hledat-mesto" className="mb-1.5 block text-sm font-medium text-slate-700">
          Najít město
        </label>
        <input
          id="hledat-mesto"
          type="search"
          value={dotaz}
          onChange={e => setDotaz(e.target.value)}
          placeholder="Napiš město nebo kraj, třeba Pardubice"
          autoComplete="off"
          className="w-full max-w-md rounded-lg border border-slate-300 px-4 py-2.5 text-[15px] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
        <p className="mt-2 text-sm text-slate-500" aria-live="polite">
          {dotaz.trim()
            ? `${nalezena.length} ${nalezena.length === 1 ? 'město' : nalezena.length < 5 ? 'města' : 'měst'}`
            : `${mesta.length} měst s přehledem škol`}
        </p>
      </div>

      {podleKraje.map(({ kraj, seznam }) => (
        <section key={kraj} className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            {kraj}
          </h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {seznam.map(m => (
              <Link
                key={m.slug}
                href={`/mesto/${m.slug}`}
                className="group rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-blue-300 hover:shadow-md"
              >
                <h3 className="mb-1 font-bold text-slate-900 transition-colors group-hover:text-blue-600">
                  {m.nazev}
                </h3>
                <p className="text-sm text-slate-500">
                  {m.skol} {skolySlovem(m.skol)} · {m.nabidek}{' '}
                  {m.nabidek === 1 ? 'nabídka' : m.nabidek < 5 ? 'nabídky' : 'nabídek'}
                </p>
              </Link>
            ))}
          </div>
        </section>
      ))}

      {nalezena.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <p className="text-slate-700">
            Pro „{dotaz.trim()}“ tu přehled není.
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Přehled má město, kde jsou aspoň tři střední školy. Jednotlivou školu
            najdeš vyhledáváním nahoře, i když její město tady není.
          </p>
        </div>
      )}
    </div>
  );
}
