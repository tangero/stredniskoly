'use client';

import { useState } from 'react';
import { KdeStojim } from '@/components/obor/KdeStojim';
import { druhTestu, type KriteriaOboru, type PoziceOboru, type PrevodTestu } from '@/lib/prevod-testu-vypocet';
import type { PasmaPrijetiObor } from '@/lib/pasma-prijeti';

// ============================================================================
// Prototyp pásmového proužku (docs/navrh-pasmovy-prouzek-2027.md).
//
// Výběr z ukázkových oborů nad sdílenou komponentou KdeStojim, kterou
// používá i stránka oboru. Prototyp si výsledky nepamatuje.
// ============================================================================

export interface UkazkovyObor {
  id: string;
  nazev: string;
  obec: string;
  obor: string;
  data: PasmaPrijetiObor;
  /** Rozdělení výsledků soutěžících; jen u vybraného oboru. */
  pozice?: PoziceOboru | null;
  /** Kritéria předchozího ročníku z PDF v DiPSy; jen u vybraného oboru. */
  kriteria?: KriteriaOboru | null;
}

export function PasmovyProuzek({ obory, rok, prevod, vybranyObor }: {
  obory: UkazkovyObor[];
  /** Rok zobrazených pásem, z registru. */
  rok: number;
  /** Převodní tabulky testů TAU; bez nich jen přímé body. */
  prevod: PrevodTestu | null;
  vybranyObor?: string;
}) {
  const [vybrany, setVybrany] = useState(vybranyObor ?? obory[0]?.id ?? '');
  const [ukazRozdeleni, setUkazRozdeleni] = useState(true);

  const obor = obory.find(o => o.id === vybrany) ?? obory[0];
  if (!obor) return <p>Žádná ukázková data.</p>;
  // Víceletá gymnázia píší jiné testy než čtyřleté obory; převod podle druhu testu.
  const druh = druhTestu(obor.id.split('_')[1] ?? '');
  const terminy = prevod?.druhy[druh];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4 rounded-xl bg-slate-50 p-4">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Obor</span>
          <select value={vybrany} onChange={e => setVybrany(e.target.value)} className="w-full max-w-2xl rounded-lg border border-slate-300 px-3 py-2">
            {obory.map(o => (
              <option key={o.id} value={o.id}>
                {o.nazev} · {o.obec} · {o.obor}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={ukazRozdeleni} onChange={e => setUkazRozdeleni(e.target.checked)} />
          Ukázat rozdělení
        </label>
      </div>

      <p className="text-sm text-slate-500">
        {obor.obor} · {obor.nazev}, {obor.obec}
      </p>

      <KdeStojim
        key={druh}
        data={obor.data}
        rok={rok}
        druh={druh}
        prevod={prevod && terminy ? { rok_testu: prevod.rok_testu, rok_cile: prevod.rok_cile, terminy } : null}
        pozice={obor.pozice}
        kriteria={obor.kriteria}
        ukazRozdeleni={ukazRozdeleni}
      />
    </div>
  );
}
