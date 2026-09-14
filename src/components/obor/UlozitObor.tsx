'use client';

import { useState, useSyncExternalStore } from 'react';
import { readSelection, MAX_SELECTION } from '@/lib/simulator-state';
import { normalizeSchoolKey } from '@/lib/school-key';

/** Stejný klíč a identifikátory jako simulátor: jeden výběr zvažovaných oborů na celém webu. */
const STORAGE_KEY = 'prijimacky-vyber-2027';
const UDALOST = 'prijimacky-vyber-zmena';

interface UlozitOborProps {
  programId: string;
}

function odebirat(zmena: () => void) {
  window.addEventListener('storage', zmena);
  window.addEventListener(UDALOST, zmena);
  return () => {
    window.removeEventListener('storage', zmena);
    window.removeEventListener(UDALOST, zmena);
  };
}

function nacist(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

export function UlozitObor({ programId }: UlozitOborProps) {
  // Na serveru null: tlačítko se aktivuje až po načtení výběru v prohlížeči.
  const ulozenyVyber = useSyncExternalStore(odebirat, nacist, () => null);
  const [stav, setStav] = useState('');
  const klic = normalizeSchoolKey(programId);
  const ulozeno = ulozenyVyber === null ? null : readSelection(ulozenyVyber || null).some(id => normalizeSchoolKey(id) === klic);

  const prepnout = () => {
    try {
      const ids = readSelection(localStorage.getItem(STORAGE_KEY));
      const dalsi = ulozeno
        ? ids.filter(id => normalizeSchoolKey(id) !== klic)
        : [...ids, programId].slice(0, MAX_SELECTION);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dalsi));
      window.dispatchEvent(new Event(UDALOST));
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
          ulozeno ? 'border border-[#0074e4] bg-white text-[#0074e4] hover:bg-blue-50' : 'bg-[#0074e4] text-white hover:bg-[#005fbd]'
        }`}
      >
        {ulozeno ? 'Uloženo mezi zvažované' : 'Uložit mezi zvažované'}
      </button>
      <span role="status" className="text-[13px] text-slate-500">
        {stav}
        {ulozeno && <> <a href="/simulator?vyber=1" className="font-semibold text-[#0074e4] hover:underline">Otevřít zvažované obory</a></>}
      </span>
    </div>
  );
}
