'use client';

import { useState, useSyncExternalStore } from 'react';
import { MAX_SELECTION } from '@/lib/simulator-state';
import { normalizeSchoolKey } from '@/lib/school-key';
import { KLIC_VYBERU, UDALOST_VYBERU, bezVyberu, ctiSurovyVyber, odebiratVyber, zvazovaneObory } from '@/lib/vyber-zvazovanych';

interface UlozitOborProps {
  programId: string;
  /**
   * Kompaktní podoba do mřížky oborů na stránce školy: bez odkazu na výběr a se stavovou hláškou
   * jen pro čtečky. Uložením se tak nezmění šířka bloku a karty oborů zůstanou zarovnané.
   * Odkaz na výběr je v horní liště, takže se v mřížce neztratí.
   */
  kompaktni?: boolean;
}

export function UlozitObor({ programId, kompaktni = false }: UlozitOborProps) {
  // Na serveru null: tlačítko se aktivuje až po načtení výběru v prohlížeči.
  const ulozenyVyber = useSyncExternalStore(odebiratVyber, ctiSurovyVyber, bezVyberu);
  const [stav, setStav] = useState('');
  const klic = normalizeSchoolKey(programId);
  const ulozeno = ulozenyVyber === null ? null : zvazovaneObory(ulozenyVyber).some(id => normalizeSchoolKey(id) === klic);

  const prepnout = () => {
    try {
      const ids = zvazovaneObory(localStorage.getItem(KLIC_VYBERU));
      const dalsi = ulozeno
        ? ids.filter(id => normalizeSchoolKey(id) !== klic)
        : [...ids, programId].slice(0, MAX_SELECTION);
      localStorage.setItem(KLIC_VYBERU, JSON.stringify(dalsi));
      window.dispatchEvent(new Event(UDALOST_VYBERU));
      setStav(ulozeno ? 'Odebráno ze zvažovaných.' : 'Uloženo v tomto prohlížeči.');
    } catch {
      setStav('Uložení se nepodařilo, prohlížeč nepovoluje úložiště.');
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <button
        type="button"
        onClick={prepnout}
        aria-pressed={ulozeno === true}
        disabled={ulozeno === null}
        className={`rounded-lg px-4 py-2.5 text-[15px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0074e4] disabled:opacity-60 ${
          // „Uloženo“ je o písmeno delší než „Uložit“; bez pevné míry by tlačítko po kliknutí povyrostlo.
          kompaktni ? 'min-w-[12.5rem]' : ''
        } ${ulozeno ? 'border border-[#0074e4] bg-white text-[#0074e4] hover:bg-blue-50' : 'bg-[#0074e4] text-white hover:bg-[#005fbd]'}`}
      >
        {ulozeno ? 'Uloženo mezi zvažované' : 'Uložit mezi zvažované'}
      </button>
      <span role="status" className={kompaktni ? 'sr-only' : 'text-[13px] text-slate-500'}>
        {stav}
        {!kompaktni && ulozeno && <> <a href="/simulator?vyber=1" className="font-semibold text-[#0074e4] hover:underline">Otevřít zvažované obory</a></>}
      </span>
    </div>
  );
}
